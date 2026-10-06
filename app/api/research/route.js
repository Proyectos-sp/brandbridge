// POST /api/research  { query }
// Investiga en internet (Gemini + Google Search) una empresa que no está en el catálogo y
// devuelve su ficha con el mismo formato que las 55 marcas, con un puntaje calibrado con ellas.
// Respuestas: { brand, cached } | { candidates: [{ name, note }] } | { notFound: true } | { error }
import { NextResponse } from "next/server";
import { BRANDS, CATEGORIES } from "@/lib/data";
import { askAI, askAIWithSearch, AIError } from "@/lib/ai";
import { researchPrompt } from "@/lib/prompts";
import { TAGS, RESEARCH_DAYS, catalogMatch, parseResearch, researchKey, saveResearchedBrand } from "@/lib/research";
import { getValue, setValue } from "@/lib/store";
import { checkLimits } from "@/lib/limits";
import { SERVER_LANG, serverText as T } from "@/lib/i18n";

export const maxDuration = 60; // la búsqueda en internet puede tardar

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const query = typeof body.query === "string" ? body.query.replace(/\s+/g, " ").trim() : "";
  if (query.length < 2 || query.length > 80) {
    return NextResponse.json({ error: T.invalidQuery }, { status: 400 });
  }

  // Si ya está en el catálogo, no se gasta una investigación.
  const inCatalog = catalogMatch(query);
  if (inCatalog) return NextResponse.json({ brand: inCatalog, catalog: true });

  const cacheKey = researchKey(SERVER_LANG, query);
  const cached = await getValue(cacheKey);
  if (cached) return NextResponse.json({ ...cached, cached: true });

  const limitMessage = await checkLimits(request, "research");
  if (limitMessage) return NextResponse.json({ error: limitMessage }, { status: 429 });

  try {
    // Primero con búsqueda en Google. Si la clave no tiene cupo para búsquedas (o no es Gemini),
    // se arma la ficha con el conocimiento de la IA y queda marcada como "sin búsqueda en vivo".
    let text, sources = [], live = true;
    try {
      const prompt = researchPrompt(query, BRANDS, CATEGORIES, TAGS, true);
      ({ text, sources } = await askAIWithSearch({ ...prompt, maxTokens: 1200 }));
    } catch (error) {
      if (!(error instanceof AIError) || ![501, 503].includes(error.status)) throw error;
      live = false;
      const prompt = researchPrompt(query, BRANDS, CATEGORIES, TAGS, false);
      text = await askAI({ ...prompt, maxTokens: 1200, json: true });
    }
    const result = parseResearch(text, sources);
    if (result?.brand) result.brand.live = live;

    if (!result) {
      console.error("[research] formato inesperado:", text.slice(0, 300));
      return NextResponse.json({ error: T.researchFailed }, { status: 502 });
    }

    let payload;
    if (result.brand) {
      await saveResearchedBrand(result.brand);
      payload = { brand: result.brand };
    } else {
      payload = result.candidates.length ? { candidates: result.candidates } : { notFound: true };
    }
    // Resultados vacíos duran menos, por si la empresa aparece después.
    // Las fichas sin búsqueda en vivo se guardan poco tiempo, para rehacerlas con internet cuando haya cupo.
    await setValue(cacheKey, payload, (payload.brand ? (live ? RESEARCH_DAYS : 7) : 2) * 86400);
    return NextResponse.json({ ...payload, cached: false });
  } catch (error) {
    const status = error instanceof AIError ? error.status : 500;
    const message = error instanceof AIError ? error.message : T.unexpected;
    if (!(error instanceof AIError)) console.error("[research]", error);
    return NextResponse.json({ error: message }, { status });
  }
}
