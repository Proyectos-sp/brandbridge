// Instrucciones (prompts) que recibe la IA. Se arman en el servidor,
// así nadie puede usar la app para pedirle a la IA cualquier otra cosa.

const LANG = (process.env.APP_LANG || "es").toLowerCase() === "en" ? "en" : "es";
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
  "verdict": "1 sentence: go / wait / avoid and why"
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
