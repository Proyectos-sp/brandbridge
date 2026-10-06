"use client";

// Investigar con IA una empresa que no está en el catálogo (POST /api/research).
// Aparece bajo el buscador cuando lo escrito no coincide con ninguna marca.
import { useState } from "react";
import { postJSON } from "./BrandSheet";
import { PlayIcon, RetryIcon, SearchIcon } from "./icons";

export default function ResearchBox({ query, onFound, t }) {
  const [state, setState] = useState({ status: "idle" }); // idle | loading | candidates | notFound | error
  const [asked, setAsked] = useState(query);

  const research = async (q) => {
    setAsked(q);
    setState({ status: "loading" });
    try {
      const data = await postJSON("/api/research", { query: q });
      if (data.brand) {
        setState({ status: "idle" });
        onFound(data.brand, Boolean(data.catalog));
      } else if (data.candidates?.length) {
        setState({ status: "candidates", candidates: data.candidates });
      } else {
        setState({ status: "notFound" });
      }
    } catch (err) {
      setState({ status: "error", message: err.message || t.connectionError });
    }
  };

  const { status } = state;
  return (
    <section className="bb-research" data-status={status} aria-live="polite">
      <span className="bb-research-icon" aria-hidden="true">
        {status === "loading" ? <span className="bb-balls bb-balls-sm"><i /><i /><i /></span> : <SearchIcon size={20} strokeWidth={2} />}
      </span>

      {status === "loading" ? (
        <div className="bb-research-text">
          <strong>{t.researching(asked)}</strong>
          <p>{t.researchingHint}</p>
        </div>
      ) : status === "candidates" ? (
        <div className="bb-research-text">
          <strong>{t.researchPick}</strong>
          <div className="bb-research-picks">
            {state.candidates.map((c) => (
              <button key={c.name + c.note} type="button" className="bb-chip" onClick={() => research(c.note ? `${c.name} (${c.note})` : c.name)}>
                <b>{c.name}</b>{c.note && <span>{c.note}</span>}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="bb-research-text">
          <strong>{status === "notFound" ? t.researchNotFound(asked) : t.researchTitle(query)}</strong>
          <p>{status === "error" ? state.message : t.researchText}</p>
        </div>
      )}

      {(status === "idle" || status === "notFound" || status === "error") && (
        <button type="button" className="bb-btn bb-btn-primary" onClick={() => research(query)}>
          {status === "error" ? <><RetryIcon size={17} />{t.retry}</> : <>{t.researchBtn}<PlayIcon size={10} /></>}
        </button>
      )}
    </section>
  );
}
