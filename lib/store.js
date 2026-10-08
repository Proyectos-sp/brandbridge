// Almacenamiento simple. Usa, en este orden:
//   1. Upstash Redis por REST (KV_REST_API_URL + KV_REST_API_TOKEN, o UPSTASH_REDIS_REST_URL + _TOKEN).
//   2. Redis normal por conexión directa (REDIS_URL), como el de "Redis" en el Marketplace de Vercel.
//   3. Memoria (se pierde al reiniciar el servidor y no se comparte entre servidores).
import { Redis } from "@upstash/redis";
import { createClient } from "redis";

const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const upstash = url && token ? new Redis({ url, token }) : null;
const redisUrl = !upstash ? process.env.REDIS_URL || process.env.KV_URL || "" : "";

// Una sola conexión por servidor, reutilizada entre solicitudes.
let tcp = null;
function getTcp() {
  if (!tcp) {
    const client = createClient({ url: redisUrl, socket: { connectTimeout: 5000, reconnectStrategy: (n) => (n > 3 ? false : 300) } });
    client.on("error", (err) => console.error("[redis]", err.message));
    tcp = client.connect().catch((err) => {
      tcp = null; // se reintenta en la próxima solicitud
      throw err;
    });
  }
  return tcp;
}

// clave -> { value, expiresAt }. En globalThis para que todas las rutas del servidor compartan la misma.
const memory = (globalThis.__bbMemory ??= new Map());

function memGet(key) {
  const item = memory.get(key);
  if (!item) return null;
  if (item.expiresAt && item.expiresAt < Date.now()) {
    memory.delete(key);
    return null;
  }
  return item.value;
}

export async function getValue(key) {
  if (upstash) return await upstash.get(key);
  if (redisUrl) {
    try {
      const raw = await (await getTcp()).get(key);
      return raw == null ? null : JSON.parse(raw);
    } catch (err) {
      console.error("[redis] get", err.message);
      return memGet(key);
    }
  }
  return memGet(key);
}

export async function setValue(key, value, ttlSeconds) {
  if (upstash) {
    if (ttlSeconds) await upstash.set(key, value, { ex: ttlSeconds });
    else await upstash.set(key, value);
    return;
  }
  if (redisUrl) {
    try {
      const client = await getTcp();
      await client.set(key, JSON.stringify(value), ttlSeconds ? { EX: ttlSeconds } : undefined);
      return;
    } catch (err) {
      console.error("[redis] set", err.message);
    }
  }
  memory.set(key, { value, expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null });
}

// Suma 1 a un contador que se reinicia después de ttlSeconds. Devuelve el nuevo valor.
export async function increment(key, ttlSeconds) {
  if (upstash) {
    const count = await upstash.incr(key);
    if (count === 1) await upstash.expire(key, ttlSeconds);
    return count;
  }
  if (redisUrl) {
    try {
      const client = await getTcp();
      const count = await client.incr(key);
      if (count === 1) await client.expire(key, ttlSeconds);
      return count;
    } catch (err) {
      console.error("[redis] incr", err.message);
    }
  }
  const current = memGet(key) || 0;
  const existing = memory.get(key);
  memory.set(key, {
    value: current + 1,
    expiresAt: existing?.expiresAt && existing.expiresAt > Date.now() ? existing.expiresAt : Date.now() + ttlSeconds * 1000,
  });
  return current + 1;
}

// Contadores agrupados (hashes de Redis), para las estadísticas de /admin.
// Suma 1 a cada [clave, campo] de la lista y deja que cada clave venza en ttlSeconds.
export async function hincrMany(pairs, ttlSeconds) {
  const keys = [...new Set(pairs.map(([key]) => key))];
  if (upstash) {
    const p = upstash.pipeline();
    for (const [key, field] of pairs) p.hincrby(key, field, 1);
    for (const key of keys) p.expire(key, ttlSeconds);
    await p.exec();
    return;
  }
  if (redisUrl) {
    try {
      const m = (await getTcp()).multi();
      for (const [key, field] of pairs) m.hIncrBy(key, field, 1);
      for (const key of keys) m.expire(key, ttlSeconds);
      await m.exec();
      return;
    } catch (err) {
      console.error("[redis] hincr", err.message);
    }
  }
  for (const [key, field] of pairs) {
    const hash = memGet(key) || {};
    hash[field] = (hash[field] || 0) + 1;
    memory.set(key, { value: hash, expiresAt: Date.now() + ttlSeconds * 1000 });
  }
}

// Devuelve el hash como { campo: número } ({} si no existe).
export async function hgetall(key) {
  let raw = null;
  if (upstash) raw = await upstash.hgetall(key);
  else if (redisUrl) {
    try {
      raw = await (await getTcp()).hGetAll(key);
    } catch (err) {
      console.error("[redis] hgetall", err.message);
    }
  } else raw = memGet(key);
  return Object.fromEntries(Object.entries(raw || {}).map(([k, v]) => [k, Number(v) || 0]));
}

// Cuántos campos tiene el hash.
export async function hlen(key) {
  if (upstash) return await upstash.hlen(key);
  if (redisUrl) {
    try {
      return await (await getTcp()).hLen(key);
    } catch (err) {
      console.error("[redis] hlen", err.message);
      return 0;
    }
  }
  return Object.keys(memGet(key) || {}).length;
}

export const usingPersistentStore = Boolean(upstash || redisUrl);
