// Límites de uso para que nadie gaste todo el crédito de la API.
import { increment } from "@/lib/store";
import { serverText as T } from "@/lib/i18n";

const num = (value, fallback) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

const LIMITS = {
  chat: num(process.env.CHAT_LIMIT_PER_HOUR, 20),
  analyze: num(process.env.ANALYZE_LIMIT_PER_HOUR, 30),
  research: num(process.env.RESEARCH_LIMIT_PER_HOUR, 5),
  daily: num(process.env.DAILY_AI_CALLS_MAX, 400),
};

export function getClientIp(request) {
  const forwarded = request.headers.get("x-forwarded-for");
  return (forwarded ? forwarded.split(",")[0] : request.headers.get("x-real-ip")) || "unknown";
}

// kind: "chat", "analyze" o "research". Devuelve null si se puede continuar, o un mensaje si se pasó del límite.
export async function checkLimits(request, kind) {
  const ip = getClientIp(request);
  const hour = new Date().toISOString().slice(0, 13);
  const day = new Date().toISOString().slice(0, 10);

  const perIp = await increment(`limit:${kind}:${ip}:${hour}`, 3600);
  if (perIp > LIMITS[kind]) {
    return T.tooMany;
  }

  const global = await increment(`limit:global:${day}`, 86400);
  if (global > LIMITS.daily) {
    return T.dailyLimit;
  }
  return null;
}
