// Estadísticas de uso para el panel privado /admin.
// Solo se guardan totales por día y por mes: nunca IPs, textos del chat ni datos personales.
// Para contar personas distintas, cada visitante recibe un código anónimo (hash de IP + navegador
// + ADMIN_PASSWORD + el mes) que no permite saber quién es y cambia cada mes.
import { createHash } from "node:crypto";
import { hincrMany, hgetall, hlen } from "@/lib/store";
import { getClientIp } from "@/lib/limits";

const KEEP = 400 * 86400; // los totales se guardan algo más de un año
const KEEP_DAILY_VISITORS = 35 * 86400; // los códigos por día solo hacen falta para el gráfico de 30 días

const BOT = /bot|crawl|spider|slurp|preview|headless|lighthouse|pingdom|monitor/i;

// Los días se cortan a medianoche de esta zona horaria (STATS_TIMEZONE, por defecto la de Panamá).
function ymdFormat() {
  const options = { year: "numeric", month: "2-digit", day: "2-digit" };
  try {
    return new Intl.DateTimeFormat("en-CA", { ...options, timeZone: process.env.STATS_TIMEZONE || "America/Panama" });
  } catch {
    return new Intl.DateTimeFormat("en-CA", { ...options, timeZone: "UTC" });
  }
}
const ymd = ymdFormat();
export const dayKey = (date = new Date()) => ymd.format(date); // "2026-10-08"
export const monthKey = (date = new Date()) => dayKey(date).slice(0, 7);

function device(ua) {
  if (/iPad|Tablet/i.test(ua)) return "tablet";
  if (/Mobi|Android|iPhone/i.test(ua)) return "mobile";
  return "desktop";
}

// "https://l.instagram.com/?u=..." -> "instagram.com"; vacío o la misma web -> "direct".
function referrer(raw, ownHost) {
  try {
    const host = new URL(raw).hostname.replace(/^(www|l|lm|m)\./, "");
    return host && host !== ownHost?.replace(/^www\./, "") ? host.slice(0, 60) : "direct";
  } catch {
    return "direct";
  }
}

const safe = (fn) => async (...args) => {
  try {
    await fn(...args);
  } catch (err) {
    console.error("[stats]", err.message);
  }
};

// Lee lo necesario de la solicitud ahora y devuelve una función que guarda la visita
// (para llamarla con after(), sin demorar la respuesta).
export function visitRecorder(request, body) {
  const ua = request.headers.get("user-agent") || "";
  if (!ua || BOT.test(ua)) return null;
  const now = new Date();
  const day = dayKey(now);
  const month = monthKey(now);
  const id = createHash("sha256")
    .update(`${process.env.ADMIN_PASSWORD || ""}|${month}|${getClientIp(request)}|${ua}`)
    .digest("hex")
    .slice(0, 16);
  const country = (request.headers.get("x-vercel-ip-country") || "").toUpperCase().slice(0, 2) || "??";
  const ref = referrer(body?.ref, request.headers.get("host"));

  return safe(() =>
    Promise.all([
      hincrMany(
        [
          [`stats:d:${day}`, "visits"],
          [`stats:m:${month}:total`, "visits"],
          [`stats:m:${month}:country`, country],
          [`stats:m:${month}:ref`, ref],
          [`stats:m:${month}:device`, device(ua)],
          [`stats:um:${month}`, id],
        ],
        KEEP
      ),
      hincrMany([[`stats:u:${day}`, id]], KEEP_DAILY_VISITORS),
    ])
  );
}

// kind: "analyze" | "chat" | "research". detail: { brand, market } o { query }.
export const recordEvent = safe(async (kind, detail = {}) => {
  const day = dayKey();
  const month = monthKey();
  const pairs = [
    [`stats:d:${day}`, kind],
    [`stats:m:${month}:total`, kind],
  ];
  if (kind === "analyze") {
    if (detail.brand) pairs.push([`stats:m:${month}:brand`, String(detail.brand).slice(0, 60)]);
    if (detail.market) pairs.push([`stats:m:${month}:market`, detail.market]);
  }
  if (kind === "research" && detail.query) {
    pairs.push([`stats:m:${month}:query`, String(detail.query).toLowerCase().slice(0, 60)]);
  }
  await hincrMany(pairs, KEEP);
});

// Datos del panel: los últimos 30 días y el detalle del mes pedido.
export async function readStats(month) {
  const today = new Date();
  const days = Array.from({ length: 30 }, (_, i) => dayKey(new Date(today.getTime() - (29 - i) * 86400000)));
  const dims = ["country", "ref", "device", "brand", "market", "query"];

  const [daily, totals, visitors, ...lists] = await Promise.all([
    Promise.all(
      days.map(async (day) => ({ day, ...(await hgetall(`stats:d:${day}`)), people: await hlen(`stats:u:${day}`) }))
    ),
    hgetall(`stats:m:${month}:total`),
    hlen(`stats:um:${month}`),
    ...dims.map((d) => hgetall(`stats:m:${month}:${d}`)),
  ]);

  const ranked = (hash) => Object.entries(hash).sort((a, b) => b[1] - a[1]);
  return {
    daily,
    month: { ...totals, people: visitors },
    lists: Object.fromEntries(dims.map((d, i) => [d, ranked(lists[i])])),
  };
}
