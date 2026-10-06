"use client";

// Reordenar con animación (FLIP): antes de un cambio se guarda la posición de cada hijo
// (identificado por data-id) en cada contenedor; después del render, cada uno se desliza
// desde donde estaba hasta su nuevo lugar.
import { useLayoutEffect, useRef } from "react";

export default function useFlip(containerRefs, deps) {
  const before = useRef(null);
  const capture = () => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    before.current = containerRefs.map((ref) => {
      const map = new Map();
      for (const el of ref.current?.children || []) map.set(el.dataset.id, { x: el.offsetLeft, y: el.offsetTop });
      return map;
    });
  };
  useLayoutEffect(() => {
    const prev = before.current;
    before.current = null;
    if (!prev) return;
    const moved = [];
    containerRefs.forEach((ref, i) => {
      for (const el of ref.current?.children || []) {
        const old = prev[i]?.get(el.dataset.id);
        if (!old) continue;
        const dx = old.x - el.offsetLeft, dy = old.y - el.offsetTop;
        if (!dx && !dy) continue;
        el.style.transition = "none";
        el.style.transform = `translate(${dx}px, ${dy}px)`;
        moved.push(el);
      }
    });
    if (!moved.length) return;
    document.body.offsetHeight; // fuerza el cálculo antes de soltar la animación
    for (const el of moved) {
      el.style.transition = "transform 560ms var(--ease-in-out)";
      el.style.transform = "";
    }
    const done = setTimeout(() => moved.forEach((el) => { el.style.transition = ""; }), 600);
    return () => clearTimeout(done);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return capture;
}
