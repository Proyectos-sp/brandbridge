// POST /api/analyze  { brandId, country }
// Devuelve el análisis de IA de una marca para un país.
// Cada análisis se genera una sola vez y queda guardado; después sale gratis y al instante.
import { NextResponse } from "next/server";
import { getBrand, getScore, isValidCountry } from "@/lib/data";
import { askAI, AIError } from "@/lib/ai";
import { analysisPrompt, parseAnalysis } from "@/lib/prompts";
import { getValue, setValue } from "@/lib/store";
import { checkLimits } from "@/lib/limits";

const CACHE_DAYS = 30;

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const brand = getBrand(body.brandId);
  const country = body.country;

  if (!brand || !isValidCountry(country)) {
    return NextResponse.json({ error: "Marca o país no válido." }, { status: 400 });
  }

  const lang = process.env.APP_LANG || "es";
  const cacheKey = `analysis:v1:${lang}:${brand.id}:${country}`;

  const cached = await getValue(cacheKey);
  if (cached) {
    return NextResponse.json({ analysis: cached, cached: true });
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
      return NextResponse.json({ error: "La IA respondió en un formato inesperado. Intenta de nuevo." }, { status: 502 });
    }

    await setValue(cacheKey, analysis, CACHE_DAYS * 86400);
    return NextResponse.json({ analysis, cached: false });
  } catch (error) {
    const status = error instanceof AIError ? error.status : 500;
    const message = error instanceof AIError ? error.message : "Error inesperado en el servidor.";
    if (!(error instanceof AIError)) console.error("[analyze]", error);
    return NextResponse.json({ error: message }, { status });
  }
}
