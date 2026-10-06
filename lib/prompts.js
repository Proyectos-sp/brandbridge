// Instrucciones (prompts) que recibe la IA. Se arman en el servidor,
// así nadie puede usar la app para pedirle a la IA cualquier otra cosa.

import { SERVER_LANG as LANG } from "@/lib/i18n";
const LANGUAGE_NAME = LANG === "en" ? "English" : "Spanish (neutral Latin American)";

function brandFacts(brand, country, score) {
  return [
    `Brand: ${brand.name}`,
    `Category: ${brand.category}`,
    `Origin: ${brand.origin} (founded ${brand.founded})`,
    `Approx. revenue: ${brand.revenue} | Growth: ${brand.growth} | Stage: ${brand.stage}`,
    `Current markets: ${brand.markets.join(", ")}`,
    `Description: ${brand.description}`,
    `Target market: ${country}`,
    `App opportunity score for ${country}: ${score}/100`,
    ...(brand.researched ? ["Note: this profile was researched by AI from web sources; its figures are estimates and may be incomplete."] : []),
  ].join("\n");
}

const HONESTY_RULES = `
Honesty rules (very important):
- Never invent specific company names, distributors, people, emails or phone numbers.
- If you are not sure whether the brand is already sold in the target country, say so plainly and suggest how to verify it.
- Money figures are rough estimates for a small local importer; label them as estimates.
- Be direct and specific, but do not exaggerate.`;

export function analysisPrompt(brand, country, score) {
  const system = `You are BrandBridge AI, a sharp market-expansion advisor for small importers and distributors in Latin America. Always write in ${LANGUAGE_NAME}.${HONESTY_RULES}

Respond ONLY with a valid JSON object (no markdown, no code fences) with exactly these keys:
{
  "summary": "one sentence on the opportunity and why the score is what it is",
  "marketFit": "1-2 sentences: fit with local consumers, price sensitivity, readiness",
  "presence": { "status": "likely_present" | "not_found" | "unsure", "note": "1 sentence on whether it is already sold in the country, with honest uncertainty" },
  "revenue": { "year1": "rough USD range", "year3": "rough USD range", "upfront": "rough USD range of initial investment", "note": "short caveat" },
  "competition": "1-2 sentences naming the kind of local or international competitors (well-known brands only)",
  "steps": ["step 1", "step 2", "step 3"],
  "risk": "1 sentence: the biggest risk",
  "verdict": "1 sentence starting with ${LANG === "en" ? '"Go", "Wait" or "Avoid"' : '"Adelante", "Esperar" o "Evitar"'}, then why"
}`;

  const messages = [
    {
      role: "user",
      content: `Analyze bringing this brand to the target market.\n\n${brandFacts(brand, country, score)}`,
    },
  ];
  return { system, messages };
}

export function chatSystemPrompt(brand, country, score) {
  return `You are BrandBridge AI, a sharp market-expansion advisor. The user is exploring whether to import or distribute ${brand.name} in ${country}. Always write in ${LANGUAGE_NAME}.

Context:
${brandFacts(brand, country, score)}
${HONESTY_RULES}
- Only answer questions related to this brand, its market, importing, distribution or business strategy. If asked about something unrelated, politely steer back.
- Keep answers short: 2-4 sentences unless the user asks for more detail.`;
}

// Intenta leer el JSON que devolvió la IA, aunque venga con texto extra alrededor.
export function parseAnalysis(text) {
  try {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1 || end === -1) return null;
    const parsed = JSON.parse(text.slice(start, end + 1));
    if (!parsed.summary || !parsed.verdict) return null;
    if (!Array.isArray(parsed.steps)) parsed.steps = [];
    return parsed;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------- investigar una empresa

// Investigar una empresa que no está en el catálogo y devolver su ficha con el mismo
// formato que las 55 marcas, calibrada con ellas.
// Paso 1 (sin herramientas): reconocer la empresa, su sitio oficial y si el nombre es ambiguo.
export function identifyPrompt(query) {
  const system = `You identify consumer companies and brands for BrandBridge. Respond ONLY with one JSON object:
{
  "found": true | false,
  "name": "official brand name",
  "website": "official website URL if you are sure, otherwise empty string",
  "wikipedia": "exact English Wikipedia article title about the company if one exists, otherwise empty string",
  "candidates": []
}
Rules: never invent URLs or article titles. If the request is not a company or brand, or you do not know it, set found to false. If the name clearly matches several different companies, set found to false and list up to 3 candidates as { "name": "...", "note": "short way to tell it apart (category, country)" }.`;
  return { system, messages: [{ role: "user", content: `Company: ${query}` }] };
}

// Paso 2: armar la ficha. mode "search" (Google Search, plan pagado), "pages" (lee las URLs dadas, gratis)
// o "memory" (sin internet, solo lo que la IA sabe).
export function researchPrompt(query, catalog, categories, tags, mode = "search", urls = []) {
  const live = mode !== "memory";
  const reference = catalog
    .map((b) => `${b.name} | ${b.category} | ${b.stage} | revenue ${b.revenue} | growth ${b.growth} | baseScore ${b.baseScore}`)
    .join("\n");

  const how = mode === "search"
    ? "You use Google Search to find REAL, current information about a consumer company"
    : mode === "pages"
      ? "You read the web pages listed by the user (official site and/or Wikipedia) to get REAL, current information about a consumer company; you may complete gaps only with facts you reliably know"
      : "Live web access is not available right now, so you rely only on what you reliably know about a consumer company (if you are not sure, say Unknown)";
  const system = `You are BrandBridge's research analyst. ${how} so small importers in Latin America can evaluate bringing it to their country. Write descriptive text in ${LANGUAGE_NAME}; keep names, URLs and handles as they are.

Rules (very important):
- Use only facts you are confident about${mode === "search" ? " from the search results" : mode === "pages" ? ", preferring what the pages say" : ""}. Never invent numbers, dates, people, URLs or handles.
- If a figure is not publicly available, write "Unknown" for it (founded may be null).
- revenue, growth and employees are rough public estimates (e.g. "$40M+", "+120%", "50-100").
- website must be the brand's official site and instagram its official handle, only if you are sure. Otherwise use "".
- Never include emails or phone numbers.
- If the request is not a real company or brand, or you cannot find it, set "found": false.
- If the name clearly matches several different companies, set "found": false and list up to 3 "candidates" so the user can pick.

Scoring: "baseScore" (20-95) is the brand's general opportunity to be imported into Latin America by a small distributor (momentum, product fit for import, price point, scalability, not already saturated in the region). Calibrate it against these reference brands already in the app, using the same scale:
${reference}

Respond ONLY with one JSON object (no markdown, no code fences), with exactly this shape:
{
  "found": true,
  "candidates": [],
  "brand": {
    "name": "official brand name",
    "category": one of ${JSON.stringify(categories)},
    "tag": one of ${JSON.stringify(tags)},
    "origin": "country of origin in English (e.g. USA, UK, Mexico)",
    "founded": 2015,
    "revenue": "$40M+",
    "growth": "+120%",
    "stage": "Seed | Series A | Series B | Series C | Series D | Private | Public | Acquired",
    "employees": "50-100",
    "markets": ["countries where it is sold, in English"],
    "description": "one sentence on what the brand sells and why it is notable",
    "website": "https://...",
    "instagram": "@handle",
    "baseScore": 70,
    "scoreReason": "one short sentence on why that score, compared with similar reference brands"
  }
}
When "found" is false, "brand" is null and "candidates" is a list of { "name": "...", "note": "short way to tell it apart (category, country)" }.`;

  const read = mode === "pages" && urls.length ? `\n\nRead these pages first:\n${urls.join("\n")}` : "";
  const messages = [{ role: "user", content: `Research this company: ${query}${read}` }];
  return { system, messages };
}
