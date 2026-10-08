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
// En el plan gratuito cada modelo tiene su propio cupo diario: cuando uno se agota (o está
// saturado) se pasa al siguiente. GEMINI_MODELS permite cambiar la lista (separada por comas).
const GEMINI_CHAIN = [
  ...new Set(
    [GEMINI_MODEL, GEMINI_FALLBACK, ...(process.env.GEMINI_MODELS || "gemini-3.7-flash,gemini-3.6-flash,gemini-3.5-flash,gemini-3.1-flash-lite").split(",")]
      .map((m) => m.trim())
      .filter(Boolean)
  ),
];

// Velocidad (medido el 2026-10-08): un modelo saturado tarda hasta 6 s solo en contestar 503,
// alguno se queda colgado sin responder y "pensar" sin límite triplica el tiempo de un análisis.
// Por eso:
//   - si un modelo no contesta en HEDGE_MS, se lanza en paralelo el siguiente de la cadena y
//     gana la primera respuesta válida (los demás se cancelan);
//   - cada modelo y la consulta completa tienen un límite de tiempo;
//   - los modelos que fallaron se dejan al final de la cadena por unos minutos;
//   - el pensamiento se limita (GEMINI_THINKING_BUDGET; -1 = sin límite).
const num = (value, fallback) => (value !== "" && value != null && Number.isFinite(Number(value)) ? Number(value) : fallback);
const THINKING_BUDGET = num(process.env.GEMINI_THINKING_BUDGET, 512);
const LIMITS = {
  text: { hedge: 10000, model: 30000, total: 50000 },
  web: { hedge: Infinity, model: 45000, total: 55000 }, // leer páginas tarda: no se duplica
};
const COOLDOWN_MS = 5 * 60 * 1000;
const coolingUntil = new Map(); // modelo -> hora hasta la que va al final (por instancia del servidor)

// Primero los modelos disponibles, al final los que fallaron hace poco (por si todos fallaron).
function modelOrder() {
  const now = Date.now();
  const ready = GEMINI_CHAIN.filter((m) => !(coolingUntil.get(m) > now));
  const cooling = GEMINI_CHAIN.filter((m) => coolingUntil.get(m) > now);
  return [...ready, ...cooling];
}

async function askGemini(options) {
  return (await callGemini(options)).text;
}

/**
 * Pide una respuesta a la IA con acceso a internet. Solo funciona con Gemini.
 * - web: "search" usa Google Search (solo en el plan pagado).
 * - web: "urls" deja que la IA lea las páginas cuyas URLs van en el mensaje (gratis).
 * Devuelve el texto y las páginas que realmente usó.
 * @returns {Promise<{ text: string, sources: Array<{ title: string, url: string }> }>}
 */
export async function askAIWithWeb(options) {
  if (getProvider() !== "gemini") throw new AIError(T.researchUnavailable, 501);
  return callGemini(options);
}

const hostOf = (url) => {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; }
};

function readCandidate(data, model) {
  const candidate = data?.candidates?.[0];
  const text = (candidate?.content?.parts || [])
    .filter((p) => typeof p.text === "string" && !p.thought)
    .map((p) => p.text)
    .join("")
    .trim();
  if (!text && candidate?.finishReason && candidate.finishReason !== "STOP") {
    console.error("[gemini] respuesta vacía, finishReason:", candidate.finishReason);
  }
  const seen = new Set();
  const add = (url, title) => (url && !seen.has(url) && seen.add(url) ? [{ title: String(title || hostOf(url)).slice(0, 120), url }] : []);
  const sources = [
    ...(candidate?.groundingMetadata?.groundingChunks || []).flatMap((c) => add(c?.web?.uri, c?.web?.title)),
    ...(candidate?.urlContextMetadata?.urlMetadata || [])
      .filter((u) => u?.urlRetrievalStatus === "URL_RETRIEVAL_STATUS_SUCCESS")
      .flatMap((u) => add(u.retrievedUrl)),
  ];
  return { text, sources, model };
}

// Un intento con un modelo. Devuelve { ok: true, result } o { ok: false, status, detail }.
async function tryModel(model, body, apiKey, signal) {
  const send = (payload) => fetch(`${GEMINI_URL}/v1beta/models/${model}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify(payload),
    signal,
  });
  try {
    let response = await send(body);
    let data = await response.json().catch(() => null);
    // Algún modelo podría no aceptar el límite de pensamiento: se repite sin él.
    if (response.status === 400 && body.generationConfig.thinkingConfig && /thinking|invalid argument/i.test(data?.error?.message || "")) {
      const { thinkingConfig, ...generationConfig } = body.generationConfig;
      response = await send({ ...body, generationConfig });
      data = await response.json().catch(() => null);
    }
    if (response.ok) return { ok: true, result: readCandidate(data, model) };
    return { ok: false, status: response.status, detail: data?.error?.message || `HTTP ${response.status}` };
  } catch (error) {
    return { ok: false, status: 0, detail: error.name === "AbortError" || error.name === "TimeoutError" ? "sin respuesta a tiempo" : error.message };
  }
}

async function callGemini({ system, messages, maxTokens = 600, json = false, web = null, thinking = THINKING_BUDGET }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new AIError(T.noKey, 500);

  const tools = web === "search" ? [{ google_search: {} }] : web === "urls" ? [{ url_context: {} }] : null;
  const body = {
    systemInstruction: { parts: [{ text: system }] },
    contents: messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    })),
    // Con herramientas la respuesta llega como texto (el JSON se extrae después).
    ...(tools ? { tools } : {}),
    generationConfig: {
      // Los modelos Flash pueden "pensar" antes de responder y eso también cuenta en este
      // límite, por eso se deja margen de sobra (en el plan gratuito no cuesta).
      maxOutputTokens: Math.max(maxTokens * 4, 2048),
      ...(json && !tools ? { responseMimeType: "application/json" } : {}),
      ...(thinking >= 0 ? { thinkingConfig: { thinkingBudget: thinking } } : {}),
    },
  };
  const limits = LIMITS[tools ? "web" : "text"];
  const order = modelOrder();

  return new Promise((resolve, reject) => {
    const controllers = [];
    const timers = [];
    let next = 0;
    let running = 0;
    let done = false;
    let fatal = null; // error que no se arregla cambiando de modelo (por ejemplo, API key mala)

    const finish = (fn, value) => {
      if (done) return;
      done = true;
      timers.forEach(clearTimeout);
      controllers.forEach((c) => c.abort());
      fn(value);
    };
    const failIfExhausted = () => {
      if (running === 0 && next >= order.length) finish(reject, fatal || new AIError(T.busy, 503));
    };

    const launch = () => {
      if (done || next >= order.length) return failIfExhausted();
      const model = order[next++];
      running++;
      const controller = new AbortController();
      controllers.push(controller);
      const stop = setTimeout(() => controller.abort(), limits.model);
      const hedge = Number.isFinite(limits.hedge) ? setTimeout(launch, limits.hedge) : null;
      timers.push(stop, ...(hedge ? [hedge] : []));

      tryModel(model, body, apiKey, controller.signal).then((attempt) => {
        clearTimeout(stop);
        clearTimeout(hedge);
        running--;
        if (done) return;
        if (attempt.ok) return finish(resolve, attempt.result);

        console.error(`[gemini] ${model} error:`, String(attempt.detail).slice(0, 200));
        // 429: cupo agotado; 503: saturado; 404: no existe para esta clave; 0: no respondió a tiempo.
        if ([0, 429, 503, 404].includes(attempt.status)) {
          coolingUntil.set(model, Date.now() + COOLDOWN_MS);
          launch();
        } else {
          fatal = attempt.status === 400 && /api key/i.test(attempt.detail) ? new AIError(T.badKey, 500) : new AIError(T.failed, 502);
          // Cambiar de modelo no lo arregla: se espera solo a los que ya están en curso.
          if (running === 0) finish(reject, fatal);
        }
      });
    };

    timers.push(setTimeout(() => finish(reject, new AIError(T.busy, 503)), limits.total));
    launch();
  });
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
