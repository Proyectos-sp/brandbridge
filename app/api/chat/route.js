// POST /api/chat  { brandId, country, lang?, messages: [{ role: "user" | "assistant", content }] }
// Chat en vivo con la IA sobre cómo traer una marca a un país.
import { NextResponse } from "next/server";
import { getScore, isValidCountry } from "@/lib/data";
import { findBrand } from "@/lib/research";
import { askAI, AIError } from "@/lib/ai";
import { chatSystemPrompt } from "@/lib/prompts";
import { checkLimits } from "@/lib/limits";
import { requestLang, serverTextFor } from "@/lib/i18n";

const MAX_MESSAGE_LENGTH = 600; // caracteres por mensaje
const MAX_HISTORY = 12; // mensajes que se envían a la IA (los más recientes)

function cleanMessages(raw) {
  if (!Array.isArray(raw) || raw.length === 0) return null;

  const messages = raw
    .slice(-MAX_HISTORY)
    .map((m) => ({
      role: m?.role === "assistant" ? "assistant" : "user",
      content: String(m?.content ?? "").trim().slice(0, MAX_MESSAGE_LENGTH),
    }))
    .filter((m) => m.content.length > 0);

  // La conversación debe empezar con el usuario y terminar con el usuario.
  while (messages.length && messages[0].role !== "user") messages.shift();
  if (!messages.length || messages[messages.length - 1].role !== "user") return null;

  // Une mensajes seguidos del mismo rol (la API exige que se alternen).
  const merged = [];
  for (const m of messages) {
    const last = merged[merged.length - 1];
    if (last && last.role === m.role) last.content += "\n" + m.content;
    else merged.push({ ...m });
  }
  return merged;
}

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const brand = await findBrand(body.brandId);
  const country = body.country;
  const messages = cleanMessages(body.messages);
  const lang = requestLang(body);
  const T = serverTextFor(lang);

  if (!brand || !isValidCountry(country) || !messages) {
    return NextResponse.json({ error: T.invalid }, { status: 400 });
  }

  const limitMessage = await checkLimits(request, "chat", lang);
  if (limitMessage) {
    return NextResponse.json({ error: limitMessage }, { status: 429 });
  }

  try {
    const score = getScore(brand, country);
    const reply = await askAI({
      system: chatSystemPrompt(brand, country, score, lang),
      messages,
      maxTokens: 400,
    });
    return NextResponse.json({ reply: reply || T.noAnswer });
  } catch (error) {
    const status = error instanceof AIError ? error.status : 500;
    const message = error instanceof AIError ? T[error.key] || error.message : T.unexpected;
    if (!(error instanceof AIError)) console.error("[chat]", error);
    return NextResponse.json({ error: message }, { status });
  }
}
