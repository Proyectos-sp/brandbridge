// Conexión con la API de Claude. Solo se ejecuta en el servidor:
// la API key nunca llega al navegador.

const API_URL = `${process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com"}/v1/messages`;
const MODEL = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";

export class ClaudeError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

export async function askClaude({ system, messages, maxTokens = 600 }) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new ClaudeError("Falta configurar ANTHROPIC_API_KEY en el servidor.", 500);
  }

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, system, messages }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const detail = data?.error?.message || `HTTP ${response.status}`;
    console.error("[claude] error:", detail);
    if (response.status === 429 || response.status === 529) {
      throw new ClaudeError("La IA está muy ocupada en este momento. Intenta en un minuto.", 503);
    }
    if (detail.toLowerCase().includes("credit")) {
      throw new ClaudeError("La IA no tiene crédito disponible en este momento.", 503);
    }
    throw new ClaudeError("No se pudo obtener respuesta de la IA.", 502);
  }

  return (data?.content || [])
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("")
    .trim();
}
