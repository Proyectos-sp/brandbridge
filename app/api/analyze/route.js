// POST /api/analyze  { brandId, country }   (brandId: número del catálogo o "r-..." de una empresa investigada)
// Devuelve el análisis de IA de una marca para un país.
// Cada análisis se genera una sola vez y queda guardado; después sale gratis y al instante.
// "presence" (si ya se vende en el país) no la escribe la IA: se arma en cada respuesta con
// lib/presence.js, a partir de los datos de la marca o de una búsqueda con fuentes.
import { NextResponse } from "next/server";
import { getScore, isValidCountry } from "@/lib/data";
import { findBrand } from "@/lib/research";
import { askAI, AIError } from "@/lib/ai";
import { analysisPrompt, parseAnalysis } from "@/lib/prompts";
import { getValue, setValue } from "@/lib/store";
import { checkLimits } from "@/lib/limits";
import { getPresence } from "@/lib/presence";
import { SERVER_LANG, serverText as T } from "@/lib/i18n";

const CACHE_DAYS = 180; // largo para ahorrar cupo gratuito de la IA

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const brand = await findBrand(body.brandId);
  const country = body.country;

  if (!brand || !isValidCountry(country)) {
    return NextResponse.json({ error: T.invalidBrand }, { status: 400 });
  }

  const cacheKey = `analysis:v2:${SERVER_LANG}:${brand.id}:${country}`;

  // Los análisis guardados antes de este cambio traen una "presence" adivinada: se reemplaza.
  const withPresence = async (analysis, limitChecked) => ({
    ...analysis,
    presence: await getPresence(brand, country, {
      canUseWeb: async () => limitChecked || !(await checkLimits(request, "analyze")),
    }),
  });

  const cached = await getValue(cacheKey);
  if (cached) {
    return NextResponse.json({ analysis: await withPresence(cached, false), cached: true });
  }

  const limitMessage = await checkLimits(request, "analyze");
  if (limitMessage) {
    return NextResponse.json({ error: limitMessage }, { status: 429 });
  }

  try {
    const score = getScore(brand, country);
    const { system, messages } = analysisPrompt(brand, country, score);
    const text = await askAI({ system, messages, maxTokens: 900, json: true });
    const analysis = parseAnalysis(text);

    if (!analysis) {
      return NextResponse.json({ error: T.badFormat }, { status: 502 });
    }

    delete analysis.presence;
    await setValue(cacheKey, analysis, CACHE_DAYS * 86400);
    return NextResponse.json({ analysis: await withPresence(analysis, true), cached: false });
  } catch (error) {
    const status = error instanceof AIError ? error.status : 500;
    const message = error instanceof AIError ? error.message : T.unexpected;
    if (!(error instanceof AIError)) console.error("[analyze]", error);
    return NextResponse.json({ error: message }, { status });
  }
}
