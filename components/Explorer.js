"use client";

// Pantalla provisional para probar el flujo completo: elegir país, abrir una marca,
// ver el análisis de IA y chatear. El diseño final reemplaza este archivo.
import { useMemo, useState } from "react";
import { scoreFor } from "@/lib/score";

async function postJSON(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Error de conexión.");
  return data;
}

export default function Explorer({ brands, countries }) {
  const [country, setCountry] = useState(countries[0]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return brands
      .filter((b) => !q || b.name.toLowerCase().includes(q) || b.category.toLowerCase().includes(q))
      .map((b) => ({ ...b, score: scoreFor(b, country) }))
      .sort((a, b) => b.score - a.score);
  }, [brands, country, query]);

  return (
    <>
      <div className="toolbar">
        <select value={country} onChange={(e) => { setCountry(e.target.value); setSelected(null); }}>
          {countries.map((c) => <option key={c}>{c}</option>)}
        </select>
        <input placeholder="Buscar marca o categoría…" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>

      {selected && (
        <BrandPanel key={`${selected.id}-${country}`} brand={selected} country={country} onClose={() => setSelected(null)} />
      )}

      <div className="grid" style={{ marginTop: 16 }}>
        {list.map((b) => (
          <button key={b.id} className="card" onClick={() => setSelected(b)}>
            <span className="score">{b.score}</span>
            <strong>{b.name}</strong>
            <div className="muted">{b.category} · {b.origin}</div>
            <div style={{ fontSize: 14, marginTop: 6 }}>{b.description}</div>
          </button>
        ))}
      </div>
    </>
  );
}

function BrandPanel({ brand, country, onClose }) {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  async function runAnalysis() {
    setLoading(true);
    setError("");
    try {
      const data = await postJSON("/api/analyze", { brandId: brand.id, country });
      setAnalysis(data.analysis);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function send(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;
    const next = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setSending(true);
    try {
      const data = await postJSON("/api/chat", { brandId: brand.id, country, messages: next });
      setMessages([...next, { role: "assistant", content: data.reply }]);
    } catch (err) {
      setMessages([...next, { role: "assistant", content: `⚠️ ${err.message}` }]);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="panel">
      <button onClick={onClose} style={{ float: "right" }}>Cerrar</button>
      <h2 style={{ marginTop: 0 }}>{brand.name} → {country}</h2>
      <p className="muted">
        <a href={brand.website} target="_blank" rel="noreferrer">Sitio web</a> ·{" "}
        <a href={brand.instagramUrl} target="_blank" rel="noreferrer">{brand.instagram}</a>
      </p>

      {!analysis && (
        <button onClick={runAnalysis} disabled={loading}>
          {loading ? "Analizando…" : `Analizar para ${country}`}
        </button>
      )}
      {error && <p className="error">{error}</p>}

      {analysis && (
        <div>
          <p><strong>{analysis.summary}</strong></p>
          <h3>Encaje de mercado</h3><p>{analysis.marketFit}</p>
          <h3>¿Ya está en el país?</h3><p>{analysis.presence?.note}</p>
          <h3>Potencial (estimado)</h3>
          <p>Año 1: {analysis.revenue?.year1} · Año 3: {analysis.revenue?.year3} · Inversión inicial: {analysis.revenue?.upfront}</p>
          <h3>Competencia</h3><p>{analysis.competition}</p>
          <h3>Cómo traerla</h3>
          <ol>{analysis.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
          <h3>Mayor riesgo</h3><p>{analysis.risk}</p>
          <h3>Veredicto</h3><p>{analysis.verdict}</p>
        </div>
      )}

      <h3>Pregúntale a la IA</h3>
      {messages.map((m, i) => (
        <div key={i} className={`chat-msg ${m.role}`}>{m.content}</div>
      ))}
      <form className="chat-form" onSubmit={send}>
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder={`¿Cómo importo ${brand.name} a ${country}?`} maxLength={600} />
        <button disabled={sending || !input.trim()}>{sending ? "…" : "Enviar"}</button>
      </form>
      <p className="muted" style={{ fontSize: 12, marginTop: 12 }}>
        Análisis generado por IA con fines educativos. No es asesoría financiera; verifica los datos antes de tomar decisiones.
      </p>
    </div>
  );
}
