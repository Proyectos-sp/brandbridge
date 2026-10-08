// ¿La marca ya se vende en el país? Esto NO lo adivina la IA. Sale, en este orden, de:
//   1. los mercados donde la marca vende oficialmente (data/brands.json),
//   2. la revisión de tiendas y marketplaces de cada país (data/presence.json, lib/presence-data.js),
//   3. con GEMINI_SEARCH=true (plan pagado), una búsqueda en Google con las páginas que lo respaldan.
//
// Devuelve { status, source, note?, sources?, checkedAt? }
//   status: "likely_present" | "resellers" (solo revendedores o importación) | "not_found" | "unsure"
//   source: "data" (mercados oficiales), "checked" (revisión de tiendas), "research" (ficha investigada)
//           o "web" (búsqueda en Google)
import { askAIWithWeb } from "@/lib/ai";
import { presencePrompt } from "@/lib/prompts";
import { getValue, setValue } from "@/lib/store";
import { SERVER_LANG } from "@/lib/i18n";
import { checkedPresence, PRESENCE_CHECKED_AT } from "@/lib/presence-data";

const PAID_SEARCH = process.env.GEMINI_SEARCH === "true";
const CACHE_DAYS = 30; // la distribución cambia más rápido que el análisis

export function presenceFromData(brand, country) {
  if ((brand.markets || []).includes(country)) {
    return { status: "likely_present", source: brand.researched ? "research" : "data" };
  }
  if (brand.researched) {
    // Una ficha armada sin leer fuentes en internet no sirve para descartar el país.
    return { status: brand.live ? "not_found" : "unsure", source: "research" };
  }
  const found = checkedPresence(brand, country);
  const checked = { source: "checked", checkedAt: PRESENCE_CHECKED_AT };
  if (!found) return { status: "not_found", ...checked };
  return { status: found.status === "retail" ? "likely_present" : "resellers", sources: found.sources, ...checked };
}

function parsePresence(text) {
  try {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1 || end === -1) return null;
    const p = JSON.parse(text.slice(start, end + 1));
    if (!["likely_present", "not_found"].includes(p.status)) return null;
    return { status: p.status, note: String(p.note || "").slice(0, 400) };
  } catch {
    return null;
  }
}

/**
 * Presencia de la marca en el país. Si los datos ya dicen que vende allí, no se busca nada.
 * canUseWeb: se llama solo antes de buscar en internet; si devuelve false (por ejemplo, la
 * persona pasó su límite de uso) se responde solo con los datos.
 */
export async function getPresence(brand, country, { canUseWeb = async () => true } = {}) {
  const fromData = presenceFromData(brand, country);
  if (fromData.status === "likely_present" || !PAID_SEARCH) return fromData;

  const cacheKey = `presence:v1:${SERVER_LANG}:${brand.id}:${country}`;
  const cached = await getValue(cacheKey).catch(() => null);
  if (cached) return cached;
  try {
    if (!(await canUseWeb())) return fromData;
    const { text, sources } = await askAIWithWeb({ ...presencePrompt(brand, country), maxTokens: 400, web: "search" });
    const found = parsePresence(text);
    if (!found) return fromData;
    // Sin páginas que lo respalden, un "sí se vende" no se muestra como confirmado.
    const status = found.status === "likely_present" && !sources.length ? "unsure" : found.status;
    const result = { status, source: "web", note: found.note, sources: sources.slice(0, 5), checkedAt: new Date().toISOString().slice(0, 10) };
    await setValue(cacheKey, result, CACHE_DAYS * 86400);
    return result;
  } catch (error) {
    console.error("[presence]", error.message);
    return fromData;
  }
}
