// ¿La marca ya se vende en el país? Esto NO lo adivina la IA. Sale, en este orden, de:
//   1. los mercados donde la marca vende oficialmente (data/brands.json),
//   2. la revisión de tiendas y marketplaces de cada país (data/presence.json, lib/presence-data.js),
//   3. con WEB_SEARCH=claude o gemini (de pago), una investigación con varias búsquedas en Google (sitio
//      oficial, distribuidores, tiendas del país y marketplaces) con las páginas que lo respaldan.
//
// Devuelve { status, source, note?, sources?, checkedAt? }
//   status: "likely_present" | "resellers" (solo revendedores o importación) | "not_found" | "unsure"
//   source: "data" (mercados oficiales), "checked" (revisión de tiendas), "research" (ficha investigada)
//           o "web" (búsqueda en Google)
import { askAIWithWeb, webSearchProvider } from "@/lib/ai";
import { presencePrompt } from "@/lib/prompts";
import { getValue, setValue } from "@/lib/store";
import { SERVER_LANG } from "@/lib/i18n";
import { checkedPresence, countryCheckedAt, PRESENCE_CHECKED_AT } from "@/lib/presence-data";

const PAID_SEARCH = Boolean(webSearchProvider()); // WEB_SEARCH=claude|gemini (o GEMINI_SEARCH=true)
// Código ISO de cada país, para que la búsqueda dé resultados de ese país.
const ISO = {
  Panama: "PA", Mexico: "MX", Colombia: "CO", Brazil: "BR", Argentina: "AR", Chile: "CL", Peru: "PE",
  Ecuador: "EC", Uruguay: "UY", Paraguay: "PY", Bolivia: "BO", Venezuela: "VE", "Costa Rica": "CR",
  "Dominican Republic": "DO", Guatemala: "GT", Honduras: "HN", "El Salvador": "SV", Nicaragua: "NI",
};
const CACHE_DAYS = 30; // la distribución cambia más rápido que el análisis

export function presenceFromData(brand, country) {
  if ((brand.markets || []).includes(country)) {
    return { status: "likely_present", source: brand.researched ? "research" : "data" };
  }
  if (brand.researched) {
    // Las páginas leídas (Wikipedia, sitio oficial) casi nunca listan todos los países donde se
    // vende una marca grande: que no nombren el país no prueba que no se venda allí.
    return { status: "unsure", source: "research" };
  }
  const found = checkedPresence(brand, country);
  const fullCheck = countryCheckedAt(country);
  const checked = { source: "checked", checkedAt: fullCheck || PRESENCE_CHECKED_AT };
  if (found) return { status: found.status === "retail" ? "likely_present" : "resellers", sources: found.sources, ...checked };
  // Sin una revisión completa de las tiendas del país, no encontrarla no prueba que no se venda.
  return fullCheck ? { status: "not_found", ...checked } : { status: "unsure", source: "checked" };
}

const presenceKey = (brand, country, lang) => `presence:v2:${lang}:${brand.id}:${country}`;

// Lo que ya encontró la búsqueda en Google, sin buscar de nuevo (para el chat). null si no hay.
export async function cachedWebPresence(brand, country, lang = SERVER_LANG) {
  if (!PAID_SEARCH) return null;
  const cached = await getValue(presenceKey(brand, country, lang)).catch(() => null);
  return cached?.source === "web" ? cached : null;
}

function parsePresence(text) {
  try {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1 || end === -1) return null;
    const p = JSON.parse(text.slice(start, end + 1));
    if (!["likely_present", "resellers", "not_found"].includes(p.status)) return null;
    return { status: p.status, note: String(p.note || "").slice(0, 600) };
  } catch {
    return null;
  }
}

/**
 * Presencia de la marca en el país. Si los datos ya dicen que vende allí, no se busca nada.
 * canUseWeb: se llama solo antes de buscar en internet; si devuelve false (por ejemplo, la
 * persona pasó su límite de uso) se responde solo con los datos. lang: idioma de la nota.
 */
export async function getPresence(brand, country, { canUseWeb = async () => true, lang = SERVER_LANG } = {}) {
  const fromData = presenceFromData(brand, country);
  if (fromData.status === "likely_present" || !PAID_SEARCH) return fromData;

  const cached = await getValue(presenceKey(brand, country, lang)).catch(() => null);
  if (cached) return cached;
  try {
    if (!(await canUseWeb())) return fromData;
    const { text, sources, stop } = await askAIWithWeb({ ...presencePrompt(brand, country, lang), maxTokens: 600, web: "search", thinking: 1024, country: ISO[country] });
    const found = parsePresence(text);
    if (!found) {
      console.error("[presence] respuesta sin el formato esperado:", stop || "", String(text).slice(-300));
      return await rememberFailure(brand, country, lang, fromData);
    }
    // Sin páginas que lo respalden, un "sí se vende" no se muestra como confirmado.
    const status = found.status !== "not_found" && !sources.length ? "unsure" : found.status;
    const result = { status, source: "web", note: found.note, sources: sources.slice(0, 5), checkedAt: new Date().toISOString().slice(0, 10) };
    await setValue(presenceKey(brand, country, lang), result, CACHE_DAYS * 86400);
    return result;
  } catch (error) {
    console.error("[presence]", error.message);
    return await rememberFailure(brand, country, lang, fromData);
  }
}

// Si la búsqueda falló, no se repite en cada visita (cada intento puede cobrarse): se vuelve a
// intentar después de FAILURE_HOURS.
const FAILURE_HOURS = 3;
async function rememberFailure(brand, country, lang, fromData) {
  await setValue(presenceKey(brand, country, lang), fromData, FAILURE_HOURS * 3600).catch(() => {});
  return fromData;
}
