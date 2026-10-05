// Almacenamiento simple: usa Upstash Redis si está configurado en Vercel,
// y si no, guarda en memoria (se pierde al reiniciar el servidor).
import { Redis } from "@upstash/redis";

const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = url && token ? new Redis({ url, token }) : null;

const memory = new Map(); // clave -> { value, expiresAt }

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
  if (redis) return await redis.get(key);
  return memGet(key);
}

export async function setValue(key, value, ttlSeconds) {
  if (redis) {
    if (ttlSeconds) await redis.set(key, value, { ex: ttlSeconds });
    else await redis.set(key, value);
    return;
  }
  memory.set(key, { value, expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null });
}

// Suma 1 a un contador que se reinicia después de ttlSeconds. Devuelve el nuevo valor.
export async function increment(key, ttlSeconds) {
  if (redis) {
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, ttlSeconds);
    return count;
  }
  const current = memGet(key) || 0;
  const existing = memory.get(key);
  memory.set(key, {
    value: current + 1,
    expiresAt: existing?.expiresAt && existing.expiresAt > Date.now() ? existing.expiresAt : Date.now() + ttlSeconds * 1000,
  });
  return current + 1;
}

export const usingPersistentStore = Boolean(redis);
