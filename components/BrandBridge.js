"use client";

// Interfaz de BrandBridge. Replica el diseño del artefacto original (BrandBridgeFinal.jsx),
// pero la IA se llama a través del servidor (/api/analyze y /api/chat), así funciona en internet.
import { useEffect, useMemo, useRef, useState } from "react";
import LOGOS from "@/data/logos.json";
import { scoreFor } from "@/lib/score";
import { getText } from "@/lib/i18n";

const TAG_COLORS = { Trending: "#FF6B35", Rising: "#00E5FF", Established: "#FFD700", Emerging: "#00FF88" };
const TAGS = ["Trending", "Rising", "Established", "Emerging"];
const CATEGORIES = ["Beverage", "Food", "Snacks", "Apparel", "Beauty", "Home", "Wellness", "Tech", "Pets"];
const FLAGS = { USA: "🇺🇸", UK: "🇬🇧", Finland: "🇫🇮", Chile: "🇨🇱", Switzerland: "🇨🇭" };

const FONT_TITLE = "'Syne',sans-serif";
const FONT_MONO = "'DM Mono',monospace";
const FONT_BODY = "'DM Sans',sans-serif";

const scoreColor = (s) => (s >= 80 ? "#00FF88" : s >= 60 ? "#FFD700" : "#FF4444");

async function postJSON(url, body, signal) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "");
  return data;
}

// Cierra con la tecla Escape y bloquea el scroll de la página mientras hay una ventana abierta.
function useModalBehavior(onClose) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && closeRef.current();
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, []);
}

/* ------------------------------------------------------------ piezas pequeñas */

// Color de fondo de cada logo (sale del propio SVG), para mostrarlo completo sin recortes.
const LOGO_BG = Object.fromEntries(
  Object.entries(LOGOS).map(([key, svg]) => {
    const match = svg.match(/<rect[^>]*fill='([^']+)'/);
    return [key, match ? decodeURIComponent(match[1]) : "white"];
  })
);

function BrandLogo({ brand, size = 46 }) {
  return (
    <div style={{ width: size, height: size, borderRadius: size * 0.2, overflow: "hidden", flexShrink: 0, border: `1.5px solid ${brand.accentColor}55`, background: LOGO_BG[brand.slug] || "white", display: "flex", alignItems: "center", justifyContent: "center", padding: 2 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={LOGOS[brand.slug]} alt={brand.name} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
    </div>
  );
}

function ScoreRing({ score }) {
  const r = 22, circ = 2 * Math.PI * r, dash = (score / 100) * circ;
  const color = scoreColor(score);
  return (
    <svg width="58" height="58" style={{ transform: "rotate(-90deg)", flexShrink: 0 }} aria-label={`Score ${score}`}>
      <circle cx="29" cy="29" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4" />
      <circle cx="29" cy="29" r={r} fill="none" stroke={color} strokeWidth="4" strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" style={{ filter: `drop-shadow(0 0 6px ${color})` }} />
      <text x="29" y="33" textAnchor="middle" fill="white" fontSize="13" fontWeight="700" fontFamily={FONT_MONO} style={{ transform: "rotate(90deg)", transformOrigin: "29px 29px" }}>{score}</text>
    </svg>
  );
}

function LoadingDots({ color = "#00E5FF" }) {
  return (
    <span style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
      {[0, 1, 2].map((i) => (
        <span key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: color, animation: `bbBounce 1.2s ease-in-out ${i * 0.2}s infinite`, display: "inline-block" }} />
      ))}
    </span>
  );
}

function SectionHeader({ icon, title }) {
  return (
    <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ fontSize: 16 }}>{icon}</span>
      <span style={{ fontFamily: FONT_TITLE, fontWeight: 700, fontSize: 12, color: "rgba(255,255,255,0.7)", letterSpacing: "0.08em", textTransform: "uppercase" }}>{title}</span>
    </div>
  );
}

/* ------------------------------------------------------------ pestaña Contacto */

function ContactLink({ href, icon, iconBg, label, value, color }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="bb-contact-link">
      <div style={{ width: 32, height: 32, borderRadius: 8, background: iconBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>{icon}</div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontFamily: FONT_MONO, marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 13, color, fontFamily: FONT_BODY, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</div>
      </div>
      <span style={{ marginLeft: "auto", color: "rgba(255,255,255,0.3)", fontSize: 14 }}>↗</span>
    </a>
  );
}

function ContactSection({ brand, t }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, overflow: "hidden" }}>
      <SectionHeader icon="📬" title={t.contactTitle} />
      <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
        <ContactLink href={brand.website} icon="🌐" iconBg="rgba(170,255,0,0.1)" label={t.website} value={brand.website.replace("https://", "")} color="#AAFF00" />
        <ContactLink href={brand.instagramUrl} icon="📸" iconBg="rgba(255,0,128,0.12)" label={t.instagram} value={brand.instagram} color="#FF69B4" />
        <p style={{ margin: "2px 2px 0", fontSize: 12, lineHeight: 1.6, color: "rgba(255,255,255,0.45)", fontFamily: FONT_BODY }}>{t.wholesaleHint}</p>
        <div style={{ padding: "10px 14px", background: "rgba(255,229,0,0.05)", borderRadius: 10, border: "1px solid rgba(255,229,0,0.12)" }}>
          <p style={{ margin: 0, fontSize: 11, lineHeight: 1.6, color: "rgba(255,255,255,0.4)", fontFamily: FONT_BODY }}>
            💡 <strong style={{ color: "rgba(255,229,0,0.6)" }}>{t.tip}</strong> {t.tipText}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ pestaña Chat */

function ChatSection({ brand, country, t }) {
  const [messages, setMessages] = useState([]); // { role: "user" | "assistant", content, error? }
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const listRef = useRef(null);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, loading]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    const next = [...messages, { role: "user", content: text }];
    setMessages(next);
    setLoading(true);
    try {
      const history = next.filter((m) => !m.error).map(({ role, content }) => ({ role, content }));
      const data = await postJSON("/api/chat", { brandId: brand.id, country, messages: history });
      setMessages([...next, { role: "assistant", content: data.reply }]);
    } catch (err) {
      setMessages([...next, { role: "assistant", content: err.message || t.connectionError, error: true }]);
    }
    setLoading(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 16 }}>🤖</span>
          <span style={{ fontFamily: FONT_TITLE, fontWeight: 700, fontSize: 12, color: "rgba(255,255,255,0.7)", letterSpacing: "0.08em", textTransform: "uppercase" }}>{t.askTitle}</span>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#00FF88", display: "inline-block", animation: "bbPulse 2s ease-in-out infinite" }} />
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: FONT_MONO }}>{t.liveTag}</span>
          </div>
        </div>

        {messages.length === 0 ? (
          <div style={{ padding: "20px 16px", textAlign: "center" }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>💬</div>
            <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.35)", fontFamily: FONT_BODY, lineHeight: 1.6 }}>
              {t.askEmpty(brand.name, t.country(country))}<br />{t.askEmpty2}
            </p>
          </div>
        ) : (
          <div ref={listRef} style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10, maxHeight: 280, overflowY: "auto" }}>
            {messages.map((m, i) => (
              <div key={i} style={{ display: "flex", gap: 8, justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                {m.role === "assistant" && <div className="bb-ai-avatar" style={{ marginTop: 2 }}>🌐</div>}
                <div style={{
                  maxWidth: "80%", padding: "9px 13px", whiteSpace: "pre-wrap",
                  borderRadius: m.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                  background: m.role === "user" ? "rgba(0,229,255,0.12)" : m.error ? "rgba(255,68,68,0.08)" : "rgba(255,255,255,0.06)",
                  border: m.role === "user" ? "1px solid rgba(0,229,255,0.2)" : m.error ? "1px solid rgba(255,68,68,0.25)" : "1px solid rgba(255,255,255,0.08)",
                  fontSize: 13, lineHeight: 1.6, color: m.error ? "#FF8A8A" : "rgba(255,255,255,0.8)", fontFamily: FONT_BODY,
                }}>{m.content}</div>
              </div>
            ))}
            {loading && (
              <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                <div className="bb-ai-avatar">🌐</div>
                <div style={{ padding: "10px 14px", background: "rgba(255,255,255,0.06)", borderRadius: "14px 14px 14px 4px", border: "1px solid rgba(255,255,255,0.08)" }}><LoadingDots /></div>
              </div>
            )}
          </div>
        )}

        <form onSubmit={(e) => { e.preventDefault(); send(); }} style={{ padding: "12px 16px", borderTop: "1px solid rgba(255,255,255,0.07)", display: "flex", gap: 8 }}>
          <input value={input} onChange={(e) => setInput(e.target.value)} maxLength={600} placeholder={t.askPlaceholder} className="bb-input" style={{ flex: 1, borderRadius: 10, padding: "9px 12px" }} />
          <button type="submit" disabled={!input.trim() || loading} className="bb-send">{t.send}</button>
        </form>
      </div>

      {messages.length === 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
          {t.suggestions(t.country(country)).map((s) => (
            <button key={s} onClick={() => setInput(s)} className="bb-suggestion">{s}</button>
          ))}
        </div>
      )}
      <p style={{ margin: 0, fontSize: 10, color: "rgba(255,255,255,0.22)", fontFamily: FONT_MONO, textAlign: "center" }}>{t.privacy}</p>
    </div>
  );
}

/* ------------------------------------------------------------ pestaña Análisis */

function buildSections(analysis, country, score, t) {
  const s = t.sections;
  const presenceLabel = t.presenceStatus[analysis.presence?.status] || "";
  const rev = analysis.revenue || {};
  return [
    { icon: "🎯", title: s.score, lines: [`${score}/100 — ${analysis.summary}`] },
    { icon: "🌎", title: s.fit(t.country(country)), lines: [analysis.marketFit] },
    { icon: "📍", title: s.presence(t.country(country)), lines: [presenceLabel && `• ${presenceLabel}`, analysis.presence?.note] },
    { icon: "💰", title: s.revenue, lines: [rev.year1 && `${t.year1}: ${rev.year1}`, rev.year3 && `${t.year3}: ${rev.year3}`, rev.upfront && `${t.upfront}: ${rev.upfront}`, rev.note] },
    { icon: "⚔️", title: s.competition, lines: [analysis.competition] },
    { icon: "🚀", title: s.steps, lines: (analysis.steps || []).map((step, i) => `${i + 1}. ${step}`) },
    { icon: "⚠️", title: s.risk, lines: [analysis.risk] },
    { icon: "✅", title: s.verdict, lines: [analysis.verdict] },
  ].map((sec) => ({ ...sec, lines: sec.lines.filter(Boolean) })).filter((sec) => sec.lines.length);
}

function AnalysisTab({ brand, country, score, state, onRetry, t }) {
  if (state.loading) {
    return (
      <div style={{ textAlign: "center", padding: "44px 0" }}>
        <div style={{ width: 44, height: 44, borderRadius: "50%", border: `3px solid ${brand.accentColor}`, borderTopColor: "transparent", animation: "bbSpin 0.8s linear infinite", margin: "0 auto 14px" }} />
        <div style={{ color: "rgba(255,255,255,0.35)", fontFamily: FONT_MONO, fontSize: 12 }}>{t.generating}</div>
        <div style={{ color: "rgba(255,255,255,0.2)", fontFamily: FONT_MONO, fontSize: 10, marginTop: 8 }}>{t.generatingHint}</div>
      </div>
    );
  }
  if (state.error) {
    return (
      <div style={{ textAlign: "center", padding: "36px 12px" }}>
        <div style={{ fontSize: 28, marginBottom: 10 }}>⚠️</div>
        <p style={{ color: "rgba(255,255,255,0.6)", fontFamily: FONT_BODY, fontSize: 13, lineHeight: 1.6, margin: "0 auto 16px", maxWidth: 380 }}>{state.error}</p>
        <button onClick={onRetry} className="bb-send">{t.retry}</button>
      </div>
    );
  }
  if (!state.analysis) return null;

  const sections = buildSections(state.analysis, country, score, t);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
      {sections.map((sec, i) => (
        <div key={sec.title} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "13px 15px", animation: `bbFadeIn 0.4s ease ${i * 0.07}s both` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
            <span style={{ fontSize: 15 }}>{sec.icon}</span>
            <span style={{ fontFamily: FONT_TITLE, fontWeight: 700, fontSize: 11, color: brand.accentColor, letterSpacing: "0.1em", textTransform: "uppercase" }}>{sec.title}</span>
          </div>
          <div style={{ color: "rgba(255,255,255,0.72)", fontSize: 13, lineHeight: 1.7, fontFamily: FONT_BODY }}>
            {sec.lines.map((line, j) => <p key={j} style={{ margin: "3px 0" }}>{line}</p>)}
          </div>
        </div>
      ))}
      <div style={{ padding: "9px 13px", background: "rgba(255,255,255,0.02)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.05)" }}>
        <p style={{ margin: 0, fontSize: 10, lineHeight: 1.6, color: "rgba(255,255,255,0.2)", fontFamily: FONT_BODY }}>{t.aiDisclaimer(brand.name)}</p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ ventana de la marca */

function InsightModal({ brand, country, onClose, t }) {
  const [tab, setTab] = useState("analysis");
  const [state, setState] = useState({ loading: true, analysis: null, error: "" });
  const [attempt, setAttempt] = useState(0);
  const score = scoreFor(brand, country);
  useModalBehavior(onClose);

  useEffect(() => {
    const controller = new AbortController();
    setState({ loading: true, analysis: null, error: "" });
    postJSON("/api/analyze", { brandId: brand.id, country }, controller.signal)
      .then((data) => setState({ loading: false, analysis: data.analysis, error: "" }))
      .catch((err) => {
        if (err.name === "AbortError") return;
        setState({ loading: false, analysis: null, error: err.message || t.connectionError });
      });
    return () => controller.abort();
  }, [brand.id, country, attempt, t]);

  const tabs = [
    { id: "analysis", label: t.tabAnalysis },
    { id: "contact", label: t.tabContact },
    { id: "chat", label: t.tabChat },
  ];

  return (
    <div className="bb-overlay" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={brand.name} onClick={(e) => e.stopPropagation()}
        style={{ background: "#0a0a0f", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, width: "100%", maxWidth: 680, maxHeight: "92dvh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: `0 0 80px ${brand.accentColor}18,0 40px 80px rgba(0,0,0,0.8)`, animation: "bbSlideUp 0.3s ease" }}>
        <div style={{ padding: "20px 22px 16px", background: brand.bgGradient, borderBottom: "1px solid rgba(255,255,255,0.08)", position: "relative" }}>
          <button onClick={onClose} aria-label={t.close} className="bb-close">×</button>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14, paddingRight: 30 }}>
            <BrandLogo brand={brand} size={54} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: FONT_TITLE, fontSize: 20, fontWeight: 800, color: "white" }}>{brand.name}</div>
              <div style={{ color: "rgba(255,255,255,0.42)", fontSize: 11, fontFamily: FONT_MONO, marginTop: 2 }}>
                {FLAGS[brand.origin] || "🌍"} {t.country(brand.origin)} · {t.category(brand.category)} · {t.est} {brand.founded}
              </div>
            </div>
            <ScoreRing score={score} />
          </div>
          <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: 10, padding: "9px 13px", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 14 }}>🌎</span>
            <span style={{ color: "rgba(255,255,255,0.45)", fontSize: 12, fontFamily: FONT_MONO }}>{t.analyzingTo}</span>
            <span style={{ color: brand.accentColor, fontFamily: FONT_TITLE, fontWeight: 700, fontSize: 13 }}>{t.country(country)}</span>
            {state.loading && tab === "analysis" && <span style={{ marginLeft: "auto" }}><LoadingDots color={brand.accentColor} /></span>}
          </div>
        </div>

        <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.07)", background: "rgba(0,0,0,0.3)" }}>
          {tabs.map((tb) => (
            <button key={tb.id} onClick={() => setTab(tb.id)}
              style={{ flex: 1, padding: "11px 8px", border: "none", background: tab === tb.id ? "rgba(255,255,255,0.06)" : "transparent", color: tab === tb.id ? "white" : "rgba(255,255,255,0.4)", fontFamily: FONT_TITLE, fontWeight: 700, fontSize: 12, cursor: "pointer", borderBottom: tab === tb.id ? "2px solid #00E5FF" : "2px solid transparent", transition: "all 0.2s" }}>
              {tb.label}
            </button>
          ))}
        </div>

        <div style={{ overflowY: "auto", padding: "18px 20px", flex: 1 }}>
          {tab === "analysis" && <AnalysisTab brand={brand} country={country} score={score} state={state} onRetry={() => setAttempt((a) => a + 1)} t={t} />}
          {tab === "contact" && <ContactSection brand={brand} t={t} />}
          {tab === "chat" && <ChatSection brand={brand} country={country} t={t} />}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ tarjeta de marca */

function CompanyCard({ brand, country, score, onClick, t }) {
  const tagColor = TAG_COLORS[brand.tag] || "#00E5FF";
  return (
    <button className="bb-card" onClick={() => onClick(brand)} style={{ "--accent": brand.accentColor }}>
      <div className="bb-card-bg" style={{ background: brand.bgGradient }} />
      <div style={{ position: "relative" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14, gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
            <BrandLogo brand={brand} size={50} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: FONT_TITLE, fontWeight: 800, fontSize: 15, color: "white", lineHeight: 1.2 }}>{brand.name}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.38)", fontFamily: FONT_MONO, marginTop: 2 }}>{FLAGS[brand.origin] || "🌍"} {t.country(brand.origin)} · {t.category(brand.category)}</div>
            </div>
          </div>
          <ScoreRing score={score} />
        </div>
        <p style={{ color: "rgba(255,255,255,0.52)", fontSize: 12, lineHeight: 1.6, margin: "0 0 14px", fontFamily: FONT_BODY }}>{brand.description}</p>
        <div style={{ display: "flex", gap: 7, marginBottom: 14 }}>
          {[{ label: t.revenue, value: brand.revenue }, { label: t.growth, value: brand.growth, color: brand.growth.startsWith("-") ? "#FF4444" : "#00FF88" }, { label: t.stage, value: brand.stage }].map((s) => (
            <div key={s.label} style={{ background: "rgba(255,255,255,0.05)", borderRadius: 8, padding: "5px 9px", flex: 1, minWidth: 0, border: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", fontFamily: FONT_MONO, marginBottom: 2, textTransform: "uppercase", letterSpacing: "0.05em" }}>{s.label}</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: s.color || "white", fontFamily: FONT_TITLE, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.value}</div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: tagColor, background: tagColor + "18", padding: "4px 9px", borderRadius: 20, fontFamily: FONT_MONO, border: `1px solid ${tagColor}33`, whiteSpace: "nowrap" }}>{t.tag(brand.tag)}</span>
          <div style={{ color: brand.accentColor, fontSize: 11, fontWeight: 700, fontFamily: FONT_TITLE, textAlign: "right" }}>{t.analyzeFor(t.country(country))}</div>
        </div>
      </div>
    </button>
  );
}

/* ------------------------------------------------------------ ventana Legal */

function TermsModal({ onClose, t }) {
  useModalBehavior(onClose);
  return (
    <div className="bb-overlay" style={{ zIndex: 2000 }} onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={t.termsTitle} onClick={(e) => e.stopPropagation()}
        style={{ background: "#0d0d14", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, maxWidth: 560, width: "100%", maxHeight: "85dvh", overflow: "hidden", display: "flex", flexDirection: "column", animation: "bbSlideUp 0.3s ease" }}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontFamily: FONT_TITLE, fontWeight: 800, fontSize: 18 }}>{t.termsTitle}</div>
          <button onClick={onClose} aria-label={t.close} className="bb-close" style={{ position: "static" }}>×</button>
        </div>
        <div style={{ overflowY: "auto", padding: 24 }}>
          {t.terms.map(([title, text]) => (
            <div key={title} style={{ marginBottom: 14, padding: "12px 14px", background: "rgba(255,255,255,0.03)", borderRadius: 12, border: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ fontFamily: FONT_TITLE, fontWeight: 700, fontSize: 13, marginBottom: 5 }}>{title}</div>
              <p style={{ margin: 0, fontSize: 12, lineHeight: 1.7, color: "rgba(255,255,255,0.48)", fontFamily: FONT_BODY }}>{text}</p>
            </div>
          ))}
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", textAlign: "center", fontFamily: FONT_MONO }}>{t.termsUpdated}</p>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ selector de país */

function CountryPicker({ countries, country, onChange, t }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button onClick={() => setOpen(!open)} aria-expanded={open} className="bb-country-btn">
        🌎 <span className="bb-country-name">{t.country(country)}</span> <span style={{ fontSize: 9, opacity: 0.45 }}>▼</span>
      </button>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, background: "#0f0f18", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.6)", zIndex: 200, minWidth: 200 }}>
          {countries.map((c) => (
            <button key={c} onClick={() => { onChange(c); setOpen(false); }}
              style={{ display: "block", width: "100%", textAlign: "left", padding: "9px 14px", background: c === country ? "rgba(0,229,255,0.1)" : "transparent", border: "none", color: c === country ? "#00E5FF" : "rgba(255,255,255,0.65)", cursor: "pointer", fontFamily: FONT_BODY, fontSize: 13 }}>
              {t.country(c)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------ página principal */

export default function BrandBridge({ brands, countries, lang }) {
  const t = useMemo(() => getText(lang), [lang]);
  const [selected, setSelected] = useState(null);
  const [showTerms, setShowTerms] = useState(false);
  const [country, setCountry] = useState(countries[0]);
  const [category, setCategory] = useState("All");
  const [tag, setTag] = useState("All");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return brands
      .filter((b) => (category === "All" || b.category === category) && (tag === "All" || b.tag === tag))
      .filter((b) => !q || b.name.toLowerCase().includes(q) || b.category.toLowerCase().includes(q) || t.category(b.category).toLowerCase().includes(q) || b.description.toLowerCase().includes(q))
      .map((b) => ({ brand: b, score: scoreFor(b, country) }))
      .sort((a, b) => b.score - a.score);
  }, [brands, category, tag, search, country, t]);

  return (
    <div style={{ minHeight: "100vh", background: "#060609", color: "white", fontFamily: FONT_BODY }}>
      {/* Cabecera */}
      <header className="bb-header">
        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: "linear-gradient(135deg,#00E5FF,#0066FF)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, boxShadow: "0 0 20px #00E5FF44", flexShrink: 0 }}>🌐</div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: FONT_TITLE, fontWeight: 800, fontSize: 17, letterSpacing: "-0.02em" }}>BrandBridge</div>
            <div className="bb-tagline">{t.tagline}</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <button onClick={() => setShowTerms(true)} className="bb-legal-btn">{t.legal}</button>
          <CountryPicker countries={countries} country={country} onChange={setCountry} t={t} />
        </div>
      </header>

      {/* Portada */}
      <section className="bb-px" style={{ paddingTop: 32, paddingBottom: 24, textAlign: "center", background: "radial-gradient(ellipse 80% 40% at 50% 0%,rgba(0,229,255,0.06) 0%,transparent 70%)" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(0,229,255,0.08)", border: "1px solid rgba(0,229,255,0.2)", borderRadius: 20, padding: "4px 12px", marginBottom: 14 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#00E5FF", animation: "bbPulse 2s ease-in-out infinite", display: "inline-block" }} />
          <span style={{ fontSize: 10, color: "#00E5FF", fontFamily: FONT_MONO, letterSpacing: "0.08em" }}>{t.live(brands.length)}</span>
        </div>
        <h1 style={{ fontFamily: FONT_TITLE, fontSize: "clamp(26px,6vw,40px)", fontWeight: 800, margin: "0 0 10px", lineHeight: 1.1, letterSpacing: "-0.03em" }}>
          {t.heroTitle}<br />
          <span style={{ background: "linear-gradient(90deg,#00E5FF,#0066FF)", WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent" }}>{t.heroTo(t.country(country))}</span>
        </h1>
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, lineHeight: 1.6, maxWidth: 420, margin: "0 auto 20px", fontFamily: FONT_BODY }}>{t.heroSubtitle}</p>
        <div style={{ maxWidth: 380, margin: "0 auto", position: "relative" }}>
          <span style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", fontSize: 15, opacity: 0.3 }}>🔍</span>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t.search} aria-label={t.search} className="bb-input" style={{ width: "100%", padding: "11px 14px 11px 38px", borderRadius: 12 }} />
        </div>
      </section>

      {/* Filtros */}
      <div className="bb-px" style={{ paddingBottom: 16, overflowX: "auto" }}>
        <div style={{ display: "flex", gap: 7, flexWrap: "nowrap", paddingBottom: 4 }}>
          {["All", ...CATEGORIES].map((cat) => (
            <button key={cat} onClick={() => setCategory(cat)} className={`bb-pill ${category === cat ? "is-active" : ""}`}>{cat === "All" ? t.all : t.category(cat)}</button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 7, flexWrap: "nowrap", marginTop: 7 }}>
          {["All", ...TAGS].map((tg) => (
            <button key={tg} onClick={() => setTag(tg)} className={`bb-tag-pill ${tag === tg ? "is-active" : ""}`}>{tg === "All" ? t.all : t.tag(tg)}</button>
          ))}
        </div>
      </div>

      <div className="bb-px" style={{ paddingBottom: 14, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.22)", fontFamily: FONT_MONO }}>{t.count(filtered.length)}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 10, fontFamily: FONT_MONO, flexWrap: "wrap" }}>
          <span style={{ color: "#00FF88" }}>● {t.strong}</span>
          <span style={{ color: "#FFD700" }}>● {t.moderate}</span>
          <span style={{ color: "#FF4444" }}>● {t.risky}</span>
        </div>
      </div>

      {/* Tarjetas */}
      <main className="bb-px" style={{ paddingBottom: 60 }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "rgba(255,255,255,0.3)" }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>🔍</div>
            <div style={{ fontFamily: FONT_TITLE, fontWeight: 700 }}>{t.noBrands}</div>
          </div>
        ) : (
          <div className="bb-grid">
            {filtered.map(({ brand, score }, i) => (
              <div key={brand.id} style={{ animation: `bbFadeIn 0.4s ease ${Math.min(i, 12) * 0.05}s both` }}>
                <CompanyCard brand={brand} country={country} score={score} onClick={setSelected} t={t} />
              </div>
            ))}
          </div>
        )}
      </main>

      <footer style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "18px 24px", textAlign: "center" }}>
        <p style={{ margin: 0, fontSize: 10, color: "rgba(255,255,255,0.18)", fontFamily: FONT_MONO, lineHeight: 1.8 }}>
          {t.footer1}<br />
          {t.footer2}{" "}
          <button onClick={() => setShowTerms(true)} style={{ background: "none", border: "none", color: "rgba(0,229,255,0.45)", cursor: "pointer", fontSize: 10, fontFamily: FONT_MONO, textDecoration: "underline", padding: 0 }}>{t.footerLink}</button>
        </p>
      </footer>

      {selected && <InsightModal key={`${selected.id}-${country}`} brand={selected} country={country} onClose={() => setSelected(null)} t={t} />}
      {showTerms && <TermsModal onClose={() => setShowTerms(false)} t={t} />}
    </div>
  );
}
