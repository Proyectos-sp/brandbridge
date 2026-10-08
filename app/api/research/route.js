// POST /api/research  { query, lang? }
// Investiga una empresa que no está en el catálogo y devuelve su ficha con el mismo formato
// que las 55 marcas, con un puntaje calibrado con ellas.
// Respuestas: { brand, cached } | { candidates: [{ name, note }] } | { notFound: true } | { error }
//
// Gratis por defecto: la IA reconoce la empresa y su sitio oficial, el servidor busca su artículo
// en Wikipedia (API pública) y la IA lee esas páginas para armar la ficha (URL context de Gemini).
// Con GEMINI_SEARCH=true (plan pagado) usa Google Search en vez de eso.
import { NextResponse, after } from "next/server";
import { BRANDS, CATEGORIES } from "@/lib/data";
import { askAI, askAIWithWeb, AIError } from "@/lib/ai";
import { identifyPrompt, researchPrompt } from "@/lib/prompts";
import { TAGS, RESEARCH_DAYS, catalogMatch, findWikipedia, parseIdentify, parseResearch, researchKey, saveResearchedBrand, verifyInstagram } from "@/lib/research";
import { getValue, setValue } from "@/lib/store";
import { checkLimits } from "@/lib/limits";
import { requestLang, serverTextFor } from "@/lib/i18n";
import { recordEvent } from "@/lib/stats";

export const maxDuration = 60; // leer páginas puede tardar

const PAID_SEARCH = process.env.GEMINI_SEARCH === "true";

// Arma la ficha leyendo páginas reales (gratis). Devuelve { text, sources, live } o { candidates }.
async function researchFromPages(query, lang) {
  const id = parseIdentify(await askAI({ ...identifyPrompt(query), maxTokens: 300, json: true }));
  if (id && !id.found) return { candidates: id.candidates };

  const name = id?.name || query;
  const wiki = await findWikipedia(id?.wikipedia || name);
  const urls = [id?.website, wiki].filter(Boolean);

  if (urls.length) {
    const prompt = researchPrompt(name, BRANDS, CATEGORIES, TAGS, "pages", urls, lang);
    const { text, sources } = await askAIWithWeb({ ...prompt, maxTokens: 1200, web: "urls" });
    if (sources.length) return { text, sources, live: true };
  }
  // Sin páginas legibles: con lo que la IA sabe, marcado como "sin internet".
  const prompt = researchPrompt(name, BRANDS, CATEGORIES, TAGS, "memory", [], lang);
  return { text: await askAI({ ...prompt, maxTokens: 1200, json: true }), sources: [], live: false };
}

async function researchWithSearch(query, lang) {
  const prompt = researchPrompt(query, BRANDS, CATEGORIES, TAGS, "search", [], lang);
  const { text, sources } = await askAIWithWeb({ ...prompt, maxTokens: 1200, web: "search" });
  return { text, sources, live: true };
}

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const lang = requestLang(body);
  const T = serverTextFor(lang);
  const query = typeof body.query === "string" ? body.query.replace(/\s+/g, " ").trim() : "";
  if (query.length < 2 || query.length > 80) {
    return NextResponse.json({ error: T.invalidQuery }, { status: 400 });
  }
  after(() => recordEvent("research", { query }));

  // Si ya está en el catálogo, no se gasta una investigación.
  const inCatalog = catalogMatch(query);
  if (inCatalog) return NextResponse.json({ brand: inCatalog, catalog: true });

  const cacheKey = researchKey(lang, query);
  const cached = await getValue(cacheKey);
  if (cached) {
    // Fichas guardadas antes de revisar Instagram: se revisan una vez y se vuelven a guardar.
    if (cached.brand && !cached.brand.instagramChecked) {
      await verifyInstagram(cached.brand);
      await saveResearchedBrand(cached.brand);
      await setValue(cacheKey, cached, (cached.brand.live ? RESEARCH_DAYS : 7) * 86400);
    }
    return NextResponse.json({ ...cached, cached: true });
  }

  const limitMessage = await checkLimits(request, "research", lang);
  if (limitMessage) return NextResponse.json({ error: limitMessage }, { status: 429 });

  try {
    let found;
    if (PAID_SEARCH) {
      try {
        found = await researchWithSearch(query, lang);
      } catch (error) {
        if (!(error instanceof AIError) || ![501, 503].includes(error.status)) throw error;
        found = await researchFromPages(query, lang);
      }
    } else {
      found = await researchFromPages(query, lang);
    }

    let payload;
    let live = false;
    if (found.candidates) {
      payload = found.candidates.length ? { candidates: found.candidates } : { notFound: true };
    } else {
      live = found.live;
      const result = parseResearch(found.text, found.sources);
      if (!result) {
        console.error("[research] formato inesperado:", String(found.text).slice(0, 300));
        return NextResponse.json({ error: T.researchFailed }, { status: 502 });
      }
      if (result.brand) {
        result.brand.live = live;
        await verifyInstagram(result.brand);
        await saveResearchedBrand(result.brand);
        payload = { brand: result.brand };
      } else {
        payload = result.candidates.length ? { candidates: result.candidates } : { notFound: true };
      }
    }

    // Las fichas sin internet se guardan poco tiempo, para rehacerlas cuando se pueda leer la web.
    await setValue(cacheKey, payload, (payload.brand ? (live ? RESEARCH_DAYS : 7) : 2) * 86400);
    return NextResponse.json({ ...payload, cached: false });
  } catch (error) {
    const status = error instanceof AIError ? error.status : 500;
    const message = error instanceof AIError ? T[error.key] || error.message : T.unexpected;
    if (!(error instanceof AIError)) console.error("[research]", error);
    return NextResponse.json({ error: message }, { status });
  }
}
