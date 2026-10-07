"use client";

// Mapa de Latinoamérica de la portada: los mercados de la app en dorado, arcos de las marcas
// que llegan desde el resto del mundo y una tarjeta que va mostrando cada país con su bandera.
import { useEffect, useMemo, useState } from "react";
import { INSET, LATAM, MAP_H, MAP_W } from "./latamMap";
import { flagSrc } from "./flags";
import { ArrowUpRightIcon } from "./icons";

const ORIGIN = { x: MAP_W - 18, y: 26 }; // de dónde "llegan" las marcas (arriba a la derecha)

// Países de Centroamérica: en el mapa grande son muy pequeños para tocarlos, así que van
// también en un recuadro ampliado, con su nombre. dx/dy/a: posición y alineación de la etiqueta.
const INSET_LABELS = {
  Guatemala: { dx: -4, dy: -4, a: "end" },
  "El Salvador": { dx: -3, dy: 8, a: "end" },
  Honduras: { dx: 3, dy: -6, a: "start" },
  Nicaragua: { dx: 6, dy: 3, a: "start" },
  "Costa Rica": { dx: -4, dy: 7, a: "end" },
  Panama: { dx: 2, dy: -6, a: "middle" },
};
// Países pequeños fuera del recuadro: se les da una zona de toque más grande.
const BIG_TARGETS = ["Dominican Republic", "Uruguay"];
// El recuadro se abre un poco a la izquierda para que quepan los nombres de Guatemala y El Salvador.
const INSET_BOX = [INSET[0] - 20, INSET[1], INSET[2] + 20, INSET[3]].join(" ");

// Curva suave desde el origen hasta el país.
function arc(x, y) {
  const mx = (ORIGIN.x + x) / 2 + (y - ORIGIN.y) * 0.18;
  const my = (ORIGIN.y + y) / 2 - Math.abs(ORIGIN.x - x) * 0.12;
  return `M${ORIGIN.x} ${ORIGIN.y} Q${mx.toFixed(0)} ${my.toFixed(0)} ${x} ${y}`;
}

export default function HeroMap({ onStart, t }) {
  const markets = useMemo(() => LATAM.filter((c) => c.market), []);

  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setActive((i) => (i + 1) % markets.length), 2600);
    return () => clearInterval(id);
  }, [paused, markets.length]);

  // Lo que hace tocable un país (en el mapa, en el recuadro y en su zona de toque).
  const pick = (c, i) => ({
    role: "button",
    tabIndex: 0,
    "aria-label": t.country(c.name),
    onMouseEnter: () => setActive(i),
    onFocus: () => { setActive(i); setPaused(true); },
    onBlur: () => setPaused(false),
    onClick: () => onStart(c.name),
    onKeyDown: (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onStart(c.name); } },
  });

  const current = markets[active];

  return (
    <div className="bb-map" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} role="group" aria-label={t.intro.mapLabel}>
        <defs>
          <linearGradient id="bb-map-gold" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#FBE8A6" /><stop offset="0.55" stopColor="#D9BC7C" /><stop offset="1" stopColor="#B8954A" />
          </linearGradient>
        </defs>

        {LATAM.filter((c) => !c.market).map((c) => <path key={c.name} d={c.d} className="bb-map-land" aria-hidden="true" />)}
        {markets.map((c, i) => (
          <path key={c.name} d={c.d} className="bb-map-market" data-active={i === active || undefined}
            {...pick(c, i)} {...(INSET_LABELS[c.name] ? { tabIndex: -1, "aria-hidden": true } : {})} />
        ))}

        <g aria-hidden="true">
          {markets.map((c, i) => (
            <path key={c.name} d={arc(c.x, c.y)} className="bb-map-arc" data-active={i === active || undefined} style={{ "--i": i }} />
          ))}
          {markets.map((c, i) => (
            <g key={c.name} className="bb-map-dot" data-active={i === active || undefined} transform={`translate(${c.x} ${c.y})`} style={{ "--i": i }}>
              <circle r="9" className="bb-map-ring" />
              <circle r="3.6" />
            </g>
          ))}
          {markets.map((c, i) => BIG_TARGETS.includes(c.name) && (
            <circle key={c.name} cx={c.x} cy={c.y} r="13" className="bb-map-hit" {...pick(c, i)} aria-hidden={undefined} />
          ))}
          <g transform={`translate(${ORIGIN.x} ${ORIGIN.y})`} className="bb-map-origin">
            <circle r="7" />
            <circle r="13" className="bb-map-ring" />
          </g>
        </g>
      </svg>

      <span className="bb-map-origin-label" aria-hidden="true">{t.intro.mapOrigin}</span>

      <div className="bb-map-inset">
        <span className="bb-map-inset-title">{t.intro.mapInset}</span>
        <svg viewBox={INSET_BOX} role="group" aria-label={t.intro.mapInset}>
          {LATAM.filter((c) => !c.market).map((c) => <path key={c.name} d={c.d} className="bb-map-land" aria-hidden="true" />)}
          {markets.map((c, i) => INSET_LABELS[c.name] && (
            <path key={c.name} d={c.d} className="bb-map-market" data-active={i === active || undefined} {...pick(c, i)} />
          ))}
          {markets.map((c, i) => {
            const l = INSET_LABELS[c.name];
            return l && (
              <text key={c.name} x={c.x + l.dx} y={c.y + l.dy} textAnchor={l.a} className="bb-map-label" data-active={i === active || undefined} aria-hidden="true"
                onMouseEnter={() => setActive(i)} onClick={() => onStart(c.name)}>
                {t.country(c.name)}
              </text>
            );
          })}
        </svg>
      </div>

      <button type="button" key={current.name} className="bb-map-card" onClick={() => onStart(current.name)}>
        <span className="bb-map-card-flag">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={flagSrc(current.name)} alt="" width={48} height={32} />
        </span>
        <b>{t.country(current.name)}</b>
        <ArrowUpRightIcon size={18} strokeWidth={2} />
      </button>
      <p className="bb-map-hint">{t.intro.mapHint}</p>
    </div>
  );
}
