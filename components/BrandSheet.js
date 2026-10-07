"use client";

// Ventana de una marca: puntaje para el país elegido y tres pestañas (análisis, contacto, chat).
// La IA se pide al servidor: POST /api/analyze y POST /api/chat.
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { logoSrc } from "./logo";
import { scoreFor } from "@/lib/score";
import Sheet from "./Sheet";
import { bandFor } from "./Score";
import {
  AlertIcon, ArrowUpRightIcon, ChartIcon, HeartIcon, ChatIcon, CloseIcon, GlobeIcon, InfoIcon, InstagramIcon, LockIcon, MailIcon, RetryIcon, SendIcon, ShieldIcon,
} from "./icons";

export async function postJSON(url, body, signal) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) throw new Error(data.error || "");
  return data;
}

// El veredicto empieza con Go/Wait/Avoid (o Adelante/Esperar/Evitar); lo separamos para mostrarlo como sello.
const VERDICT_RE = /^\s*["“]?(go|wait|avoid|adelante|esperar|evitar)["”]?\b\s*[—–\-:,.!]*\s*/i;
const VERDICT_KIND = { go: "go", adelante: "go", wait: "wait", esperar: "wait", avoid: "avoid", evitar: "avoid" };
const VERDICT_INK = { go: "strong", wait: "moderate", avoid: "risky" };

function splitVerdict(text = "") {
  const m = text.match(VERDICT_RE);
  if (!m) return { kind: null, rest: text };
  const rest = text.slice(m[0].length);
  return { kind: VERDICT_KIND[m[1].toLowerCase()], rest: rest.charAt(0).toUpperCase() + rest.slice(1) };
}

/* ------------------------------------------------------------ análisis */

function AnalysisLoading({ t }) {
  return (
    <div className="bb-loading" role="status" aria-live="polite">
      <span className="bb-balls" aria-hidden="true"><i /><i /><i /></span>
      <strong>{t.generating}</strong>
      <span>{t.generatingHint}</span>
      <div className="bb-skeleton" aria-hidden="true"><div className="bb-skel" /><div className="bb-skel" /><div className="bb-skel" /></div>
    </div>
  );
}

function AnalysisView({ analysis, brand, country, t }) {
  const place = t.country(country);
  const verdict = splitVerdict(analysis.verdict);
  const rev = analysis.revenue || {};
  const figures = [[t.year1, rev.year1], [t.year3, rev.year3], [t.upfront, rev.upfront]].filter(([, v]) => v);
  // Si la IA contesta con una frase en vez de una cifra, se repite igual en las tres casillas:
  // se muestra una sola vez y como texto, para que no se corten las palabras.
  const wordy = figures.some(([, v]) => String(v).length > 20 || String(v).trim().split(/\s+/).length > 3);
  const sameText = wordy && figures.length > 1 && figures.every(([, v]) => v === figures[0][1]);
  const presence = analysis.presence || {};
  const blocks = [];

  blocks.push(
    <div key="verdict" className="bb-verdict">
      {verdict.kind && <span className={`bb-verdict-pill bb-band-${VERDICT_INK[verdict.kind]}`}>{t.verdictWords[verdict.kind]}</span>}
      <p>{verdict.kind ? verdict.rest : analysis.verdict}</p>
    </div>
  );
  if (analysis.summary) blocks.push(
    <section key="summary" className="bb-block"><h3>{t.summaryTitle}</h3><p className="bb-lead">{analysis.summary}</p></section>
  );
  blocks.push(
    <div key="pair" className="bb-two">
      {(presence.status || presence.note) && (
        <section className="bb-block">
          <h3>{t.sections.presence(place)}</h3>
          {t.presenceStatus[presence.status] && <span className={`bb-presence bb-presence-${presence.status}`}><i />{t.presenceStatus[presence.status]}</span>}
          {presence.note && <p>{presence.note}</p>}
        </section>
      )}
      {analysis.marketFit && <section className="bb-block"><h3>{t.sections.fit(place)}</h3><p>{analysis.marketFit}</p></section>}
    </div>
  );
  if (figures.length || rev.note) blocks.push(
    <section key="revenue" className="bb-block">
      <h3>{t.sections.revenue}</h3>
      {sameText ? <p className="bb-lead">{figures[0][1]}</p> : figures.length > 0 && (
        <div className="bb-figures" data-wordy={wordy || undefined}>{figures.map(([label, value]) => <div key={label}><small>{label}</small><b>{value}</b></div>)}</div>
      )}
      {rev.note && <p>{rev.note}</p>}
    </section>
  );
  if (analysis.competition) blocks.push(
    <section key="competition" className="bb-block"><h3>{t.sections.competition}</h3><p>{analysis.competition}</p></section>
  );
  if (analysis.steps?.length) blocks.push(
    <section key="steps" className="bb-block">
      <h3>{t.sections.steps}</h3>
      <ol className="bb-steps">{analysis.steps.map((step, i) => <li key={i}>{step}</li>)}</ol>
    </section>
  );
  if (analysis.risk) blocks.push(
    <section key="risk" className="bb-block bb-risk"><h3><AlertIcon size={15} strokeWidth={2.2} />{t.sections.risk}</h3><p>{analysis.risk}</p></section>
  );
  blocks.push(<p key="note" className="bb-note">{t.aiDisclaimer(brand.name)}</p>);

  return (
    <div className="bb-analysis">
      {blocks.map((b, i) => <div key={b.key} style={{ "--d": `${Math.min(i, 6) * 45}ms` }}>{b}</div>)}
    </div>
  );
}

function ErrorState({ message, onRetry, t }) {
  return (
    <div className="bb-error" role="alert">
      <span className="bb-error-icon"><AlertIcon size={24} /></span>
      <p>{message}</p>
      <button className="bb-btn bb-btn-primary" onClick={onRetry}><RetryIcon size={17} />{t.retry}</button>
    </div>
  );
}

/* ------------------------------------------------------------ contacto */

// Ficha de una empresa investigada con IA: de dónde salió, por qué ese puntaje y sus fuentes.
function ResearchNote({ brand, t }) {
  if (!brand.researched) return null;
  return (
    <section className="bb-block bb-research-note">
      <h3>{t.researchedTag}</h3>
      <p>{t.researchedNote(brand.researchedAt, brand.live)}</p>
      {brand.scoreReason && <p><strong>{t.scoreReasonLabel}:</strong> {brand.scoreReason}</p>}
      {brand.sources?.length > 0 && (
        <ul className="bb-sources" aria-label={t.sources}>
          {brand.sources.map((s) => (
            <li key={s.url}><a href={s.url} target="_blank" rel="noopener noreferrer">{s.title || s.url}<ArrowUpRightIcon size={13} /></a></li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ContactPanel({ brand, t }) {
  // En empresas investigadas con IA, Instagram solo se muestra si el servidor lo confirmó
  // en el sitio oficial o en Wikidata (las fichas guardadas antes no traen esa marca).
  const instagram = brand.researched && !brand.instagramChecked ? "" : brand.instagram;
  return (
    <div className="bb-contact">
      {!brand.website && !instagram && <p className="bb-tip">{t.noContact}</p>}
      {brand.website && <a className="bb-contact-link" href={brand.website} target="_blank" rel="noopener noreferrer">
        <span className="bb-contact-icon"><GlobeIcon size={20} /></span>
        <span style={{ minWidth: 0 }}><small>{t.website}</small><b>{brand.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}</b></span>
        <ArrowUpRightIcon size={18} />
      </a>}
      {instagram && <a className="bb-contact-link" href={brand.instagramUrl} target="_blank" rel="noopener noreferrer">
        <span className="bb-contact-icon"><InstagramIcon size={20} /></span>
        <span style={{ minWidth: 0 }}><small>{t.instagram}</small><b>{instagram}</b></span>
        <ArrowUpRightIcon size={18} />
      </a>}
      <p className="bb-note">{t.wholesaleHint}</p>
      <p className="bb-tip"><strong>{t.tip}</strong> {t.tipText}</p>
    </div>
  );
}

/* ------------------------------------------------------------ chat */

function ChatPanel({ brand, country, t, active, extraQuestion }) {
  const [messages, setMessages] = useState([]); // { role, content, error? }
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const listRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const ask = async (history) => {
    setMessages(history);
    setLoading(true);
    try {
      const clean = history.filter((m) => !m.error).map(({ role, content }) => ({ role, content }));
      const data = await postJSON("/api/chat", { brandId: brand.id, country, messages: clean });
      setMessages([...history, { role: "assistant", content: data.reply }]);
    } catch (err) {
      setMessages([...history, { role: "assistant", content: err.message || t.connectionError, error: true }]);
    }
    setLoading(false);
  };

  const send = (text) => {
    const value = (text ?? input).trim();
    if (!value || loading) return;
    setInput("");
    ask([...messages, { role: "user", content: value }]);
  };

  const retry = () => ask(messages.filter((m) => !m.error));

  return (
    <div className="bb-chat">
      <div className="bb-chat-box">
        {messages.length === 0 ? (
          <div className="bb-chat-start">
            <div className="bb-chat-empty">
              <strong>{t.askEmpty(brand.name, t.country(country))}</strong>
              {t.askEmpty2}
            </div>
            <div className="bb-suggest">
              {[extraQuestion, ...t.suggestions(t.country(country))].filter(Boolean).map((s) => (
                <button key={s} type="button" className={s === extraQuestion ? "bb-suggest-mine" : undefined} onClick={() => send(s)} tabIndex={active ? 0 : -1}>{s}</button>
              ))}
            </div>
          </div>
        ) : (
          <div ref={listRef} className="bb-msgs" aria-live="polite">
            {messages.map((m, i) => (
              <div key={i} className={`bb-msg ${m.role === "user" ? "bb-msg-user" : m.error ? "bb-msg-error" : "bb-msg-ai"}`}>
                {m.content}
                {m.error && i === messages.length - 1 && !loading && (
                  <div><button type="button" onClick={retry}><RetryIcon size={15} strokeWidth={2.2} />{t.retry}</button></div>
                )}
              </div>
            ))}
            {loading && <div className="bb-msg bb-msg-ai" role="status" aria-label={t.typing}><span className="bb-typing"><i /><i /><i /></span></div>}
          </div>
        )}
        <form className="bb-compose" onSubmit={(e) => { e.preventDefault(); send(); }}>
          <input ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} maxLength={600}
            placeholder={t.askPlaceholder} aria-label={t.askPlaceholder} enterKeyHint="send" autoComplete="off" />
          <button type="submit" className="bb-btn bb-btn-primary" disabled={!input.trim() || loading} aria-label={t.send}>
            <SendIcon size={20} strokeWidth={2.2} />
          </button>
        </form>
      </div>
      <p className="bb-privacy"><LockIcon size={15} />{t.privacy}</p>
    </div>
  );
}

/* ------------------------------------------------------------ pestañas */

function Tabs({ tabs, value, onChange, idBase }) {
  const listRef = useRef(null);
  const pillRef = useRef(null);

  useLayoutEffect(() => {
    const list = listRef.current;
    const place = () => {
      const btn = list?.querySelector(`[data-tab="${value}"]`);
      if (!btn || !pillRef.current) return;
      pillRef.current.style.width = `${btn.offsetWidth}px`;
      pillRef.current.style.transform = `translateX(${btn.offsetLeft}px)`;
    };
    place();
    const ro = new ResizeObserver(place);
    ro.observe(list);
    return () => ro.disconnect();
  }, [value]);

  const onKeyDown = (e) => {
    const i = tabs.findIndex((tb) => tb.id === value);
    const next = e.key === "ArrowRight" ? (i + 1) % tabs.length : e.key === "ArrowLeft" ? (i - 1 + tabs.length) % tabs.length : -1;
    if (next < 0) return;
    e.preventDefault();
    onChange(tabs[next].id);
    listRef.current.querySelector(`[data-tab="${tabs[next].id}"]`)?.focus();
  };

  return (
    <div className="bb-tabs" role="tablist" ref={listRef} onKeyDown={onKeyDown} style={{ isolation: "isolate" }}>
      <span className="bb-tab-pill" ref={pillRef} aria-hidden="true" />
      {tabs.map((tb) => (
        <button key={tb.id} type="button" role="tab" className="bb-tab" data-tab={tb.id}
          id={`${idBase}-tab-${tb.id}`} aria-controls={`${idBase}-panel-${tb.id}`}
          aria-selected={value === tb.id} tabIndex={value === tb.id ? 0 : -1} onClick={() => onChange(tb.id)}>
          {tb.icon}{tb.label}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------ ventana */

export default function BrandSheet({ brand, country, onClose, t, saved, onToggleSave, onPresence, extraQuestion, initialTab = "analysis" }) {
  const presenceRef = useRef(onPresence);
  presenceRef.current = onPresence;
  const [tab, setTab] = useState(initialTab);
  const [state, setState] = useState({ loading: true, analysis: null, error: "" });
  const [attempt, setAttempt] = useState(0);
  const [filled, setFilled] = useState(false);
  const score = scoreFor(brand, country);
  const band = bandFor(score);
  const place = t.country(country);
  const idBase = `bb-${brand.id}`;

  useEffect(() => {
    const controller = new AbortController();
    setState({ loading: true, analysis: null, error: "" });
    postJSON("/api/analyze", { brandId: brand.id, country }, controller.signal)
      .then((data) => {
        setState({ loading: false, analysis: data.analysis, error: "" });
        const status = data.analysis?.presence?.status;
        if (status && presenceRef.current) presenceRef.current(status);
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
        setState({ loading: false, analysis: null, error: err.message || t.connectionError });
      });
    return () => controller.abort();
  }, [brand.id, country, attempt, t]);

  // La barra del puntaje se llena después de abrir, para que se lea como medida.
  useEffect(() => {
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setFilled(true)));
    return () => cancelAnimationFrame(id);
  }, []);

  const tabs = [
    { id: "analysis", label: t.tabAnalysis, icon: <ChartIcon size={17} /> },
    { id: "contact", label: t.tabContact, icon: <MailIcon size={17} /> },
    { id: "chat", label: t.tabChat, icon: <ChatIcon size={17} /> },
  ];

  return (
    <Sheet label={brand.name} onClose={onClose} tall>
      {(close) => (
        <>
          <header className="bb-sheet-head" data-sheet-handle>
            <span className="bb-grabber" aria-hidden="true" />
            <div className="bb-sheet-top">
              <div className="bb-sheet-logo">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={logoSrc(brand)} alt="" />
              </div>
              <div className="bb-sheet-titles">
                <h2>{brand.name}</h2>
                <p className="bb-sheet-meta"><span className="bb-catlabel" data-cat={brand.category}><i />{t.category(brand.category)}</span>{brand.origin !== "Unknown" && <span>{t.country(brand.origin)}</span>}{Number.isInteger(brand.founded) && <span>{t.est} {brand.founded}</span>}{brand.researched && <span className="bb-ai-tag">{t.researchedTag}</span>}</p>
                <p className="bb-sheet-desc">{brand.description}</p>
              </div>
              <div className="bb-sheet-actions">
                {onToggleSave && (
                  <button type="button" className="bb-close bb-heart-btn" aria-pressed={!!saved} onClick={onToggleSave}
                    aria-label={saved ? t.unsaveLabel(brand.name) : t.saveLabel(brand.name)}>
                    <HeartIcon size={20} filled={saved} />
                  </button>
                )}
                <button className="bb-close" onClick={close} aria-label={t.close}><CloseIcon size={20} /></button>
              </div>
            </div>

            <div className="bb-scale">
              <div className="bb-scale-score"><b>{score}</b><span>/100</span></div>
              <div className="bb-scale-label">
                <span>{t.scoreTitle} · {t.destination}: <strong>{place}</strong></span>
                <span className={`bb-band-pill bb-band-${band}`}>{t.bands[band]}</span>
              </div>
              <div className="bb-track" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={score} aria-label={t.scoreTitle}>
                <span className={`bb-track-fill bb-fill-${band}`} style={{ transform: `scaleX(${filled ? score / 100 : 0})` }} />
                <span className="bb-track-tick" style={{ left: "60%" }} />
                <span className="bb-track-tick" style={{ left: "80%" }} />
              </div>
            </div>

            <Tabs tabs={tabs} value={tab} onChange={setTab} idBase={idBase} />
          </header>

          <div className="bb-sheet-scroll">
            <div className="bb-panel" role="tabpanel" id={`${idBase}-panel-analysis`} aria-labelledby={`${idBase}-tab-analysis`} hidden={tab !== "analysis"}>
              <ResearchNote brand={brand} t={t} />
              {state.loading ? <AnalysisLoading t={t} />
                : state.error ? <ErrorState message={state.error} onRetry={() => setAttempt((a) => a + 1)} t={t} />
                : state.analysis ? <AnalysisView analysis={state.analysis} brand={brand} country={country} t={t} />
                : null}
            </div>
            <div className="bb-panel" role="tabpanel" id={`${idBase}-panel-contact`} aria-labelledby={`${idBase}-tab-contact`} hidden={tab !== "contact"}>
              <ContactPanel brand={brand} t={t} />
            </div>
            <div className="bb-panel bb-panel-chat" role="tabpanel" id={`${idBase}-panel-chat`} aria-labelledby={`${idBase}-tab-chat`} hidden={tab !== "chat"}>
              <ChatPanel brand={brand} country={country} t={t} active={tab === "chat"} extraQuestion={extraQuestion} />
            </div>
          </div>
        </>
      )}
    </Sheet>
  );
}

/* ------------------------------------------------------------ legal */

export function TermsSheet({ onClose, t }) {
  return (
    <Sheet label={t.termsTitle} onClose={onClose} width={620}>
      {(close) => (
        <>
          <header className="bb-legal-head" data-sheet-handle>
            <span className="bb-grabber bb-grabber-dark" aria-hidden="true" />
            <h2>{t.termsTitle}</h2>
            <button className="bb-close bb-close-dark" onClick={close} aria-label={t.close}><CloseIcon size={20} /></button>
          </header>
          <div className="bb-sheet-scroll">
            <div className="bb-panel">
              <div className="bb-terms-claim">
                <ShieldIcon size={22} strokeWidth={2} />
                <div><strong>{t.legalBadge}</strong><p>{t.termsLead}</p></div>
              </div>
              <div className="bb-terms">
                {t.terms.map(([title, text]) => (
                  <div key={title}><h3>{title}</h3><p>{text}</p></div>
                ))}
              </div>
              <p className="bb-terms-foot"><InfoIcon size={14} style={{ verticalAlign: "-2px", marginRight: 6 }} />{t.termsUpdated}</p>
            </div>
          </div>
        </>
      )}
    </Sheet>
  );
}
