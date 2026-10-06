// Tablero de la portada: el ranking en vivo de las 5 mejores marcas para el país elegido.
// Cada fila conserva su elemento al cambiar de país, así que se desliza a su nuevo puesto.
import LOGOS from "@/data/logos.json";
import { bandFor } from "./Score";
import { ChatIcon, SendIcon } from "./icons";

// Fichas de colores alrededor del tablero (una por categoría), solo decorativas.
const TOKENS = [
  { cat: "Beverage", x: -4, y: 8, s: 22, r: 12 },
  { cat: "Beauty", x: 101, y: 3, s: 28, r: 45 },
  { cat: "Snacks", x: 104, y: 58, s: 16, r: 20 },
  { cat: "Apparel", x: 92, y: 98, s: 20, r: 45 },
  { cat: "Wellness", x: -6, y: 52, s: 14, r: 45 },
  { cat: "Food", x: 40, y: -5, s: 12, r: 30 },
];

export default function HeroBoard({ items, country, onOpen, onAsk, listRef, t }) {
  const place = t.country(country);
  const top = items.slice(0, 5);
  const lead = top[0];
  return (
    <div className="bb-board-wrap">
      {TOKENS.map((tk, i) => (
        <span key={tk.cat} className="bb-token" data-cat={tk.cat} aria-hidden="true"
          style={{ "--x": `${tk.x}%`, "--y": `${tk.y}%`, "--s": `${tk.s}px`, "--r": `${tk.r}deg`, "--i": i }} />
      ))}

      <section className="bb-board" aria-labelledby="bb-board-title">
        <header className="bb-board-head">
          <div>
            <h2 id="bb-board-title">{t.boardTitle(place)}</h2>
            <p className="bb-board-sub">{t.topSub}</p>
          </div>
          <span className="bb-board-scale" aria-hidden="true">/100</span>
        </header>
        <ol className="bb-board-list" ref={listRef}>
          {top.map(({ brand, score }, rank) => {
            const band = bandFor(score);
            return (
              <li key={brand.id} data-id={brand.id}>
                <button type="button" className="bb-row" onClick={() => onOpen(brand)}
                  aria-label={`${rank + 1}. ${t.openBrand(brand.name)} · ${score}/100 ${t.bands[band]}`}>
                  <span className="bb-row-rank bb-num">{rank + 1}</span>
                  <span className="bb-row-logo">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={LOGOS[brand.slug]} alt="" />
                  </span>
                  <span className="bb-row-text">
                    <b>{brand.name}</b>
                    <span className="bb-catlabel" data-cat={brand.category}><i />{t.category(brand.category)}</span>
                  </span>
                  <span className="bb-row-score">
                    <span key={country} className={`bb-row-num bb-num bb-band-${band} bb-pop-in`}>{score}</span>
                    <span className="bb-row-bar" aria-hidden="true">
                      <span className={`bb-fill-${band}`} style={{ transform: `scaleX(${score / 100})` }} />
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </section>

      {lead && (
        <button type="button" className="bb-bubble" onClick={() => onAsk(lead.brand)}>
          <span className="bb-bubble-head"><ChatIcon size={14} strokeWidth={2} />{t.tabChat} · {lead.brand.name}</span>
          <span className="bb-bubble-text">{t.suggestions(place)[1]}</span>
          <span className="bb-bubble-send" aria-hidden="true"><SendIcon size={16} strokeWidth={2.4} /></span>
        </button>
      )}
    </div>
  );
}
