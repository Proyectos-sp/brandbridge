// Conexión con la IA. Solo se ejecuta en el servidor: la API key nunca llega al navegador.
//
// Proveedores disponibles (variable AI_PROVIDER):
//   - "gemini": Google Gemini (tiene plan gratuito). Requiere GEMINI_API_KEY.
//   - "claude": Anthropic Claude (de pago). Requiere ANTHROPIC_API_KEY.
// Si AI_PROVIDER no está definida, se usa Gemini si hay GEMINI_API_KEY; si no, Claude.

import { serverText as T } from "@/lib/i18n";

export class AIError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}


export function getProvider() {
  const chosen = (process.env.AI_PROVIDER || "").toLowerCase();
  if (chosen === "gemini" || chosen === "claude") return chosen;
  return process.env.GEMINI_API_KEY ? "gemini" : "claude";
}

/**
 * Pide una respuesta a la IA.
 * @param {object} options
 * @param {string} options.system     Instrucciones generales para la IA.
 * @param {Array<{role: "user"|"assistant", content: string}>} options.messages  Conversación.
 * @param {number} [options.maxTokens] Largo máximo de la respuesta.
 * @param {boolean} [options.json]     true si la respuesta debe ser JSON.
 * @returns {Promise<string>} Texto de la respuesta.
 */
export async function askAI(options) {
  return getProvider() === "gemini" ? askGemini(options) : askClaude(options);
}

// ---------------------------------------------------------------- Gemini

const GEMINI_URL = process.env.GEMINI_BASE_URL || "https://generativelanguage.googleapis.com";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";
// Si el modelo principal llega a su límite gratuito, se intenta con este (más límites, más ligero).
const GEMINI_FALLBACK = process.env.GEMINI_FALLBACK_MODEL || "gemini-3.5-flash-lite";

async function askGemini({ system, messages, maxTokens = 600, json = false }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new AIError(T.noKey, 500);

  const body = {
    systemInstruction: { parts: [{ text: system }] },
    contents: messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    })),
    generationConfig: {
      // Los modelos Flash pueden "pensar" antes de responder y eso también cuenta en este
      // límite, por eso se deja margen de sobra (en el plan gratuito no cuesta).
      maxOutputTokens: Math.max(maxTokens * 4, 2048),
      ...(json ? { responseMimeType: "application/json" } : {}),
    },
  };

  const models = GEMINI_FALLBACK && GEMINI_FALLBACK !== GEMINI_MODEL ? [GEMINI_MODEL, GEMINI_FALLBACK] : [GEMINI_MODEL];

  for (let i = 0; i < models.length; i++) {
    const response = await fetch(`${GEMINI_URL}/v1beta/models/${models[i]}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify(body),
    });
    const data = await response.json().catch(() => null);

    if (response.ok) {
      const candidate = data?.candidates?.[0];
      const text = (candidate?.content?.parts || [])
        .filter((p) => typeof p.text === "string" && !p.thought)
        .map((p) => p.text)
        .join("")
        .trim();
      if (!text && candidate?.finishReason && candidate.finishReason !== "STOP") {
        console.error("[gemini] respuesta vacía, finishReason:", candidate.finishReason);
      }
      return text;
    }

    const detail = data?.error?.message || `HTTP ${response.status}`;
    console.error(`[gemini] ${models[i]} error:`, detail);

    const isLimit = response.status === 429 || response.status === 503;
    const hasNext = i < models.length - 1;
    if (isLimit && hasNext) continue; // probar con el modelo de respaldo
    if (isLimit) throw new AIError(T.busy, 503);
    if (response.status === 400 && /api key/i.test(detail)) {
      throw new AIError(T.badKey, 500);
    }
    throw new AIError(T.failed, 502);
  }
}

// ---------------------------------------------------------------- Claude

const CLAUDE_URL = process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com";
const CLAUDE_MODEL = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";

async function askClaude({ system, messages, maxTokens = 600 }) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new AIError(T.noKey, 500);
  }

  const response = await fetch(`${CLAUDE_URL}/v1/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({ model: CLAUDE_MODEL, max_tokens: maxTokens, system, messages }),
  });
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const detail = data?.error?.message || `HTTP ${response.status}`;
    console.error("[claude] error:", detail);
    if (response.status === 429 || response.status === 529) throw new AIError(T.busy, 503);
    if (/credit/i.test(detail)) throw new AIError(T.noCredit, 503);
    throw new AIError(T.failed, 502);
  }

  return (data?.content || [])
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("")
    .trim();
}
