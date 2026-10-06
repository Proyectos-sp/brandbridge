"use client";

// Ventana reutilizable: centrada en escritorio y hoja inferior en celular.
// Anima la entrada y la salida, cierra con Escape o tocando fuera, mantiene el foco adentro
// y en celular se puede cerrar arrastrando la cabecera hacia abajo.
import { useCallback, useEffect, useRef, useState } from "react";

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
const MOBILE = "(max-width: 640px)";

export default function Sheet({ label, onClose, width, tall, children }) {
  const [closing, setClosing] = useState(false);
  const sheetRef = useRef(null);
  const closingRef = useRef(false);
  const dragRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const requestClose = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    setClosing(true);
    setTimeout(() => onCloseRef.current(), 230);
  }, []);

  // Foco, Escape, Tab atrapado y página sin scroll mientras está abierta.
  useEffect(() => {
    const sheet = sheetRef.current;
    const previous = document.activeElement;
    sheet?.focus({ preventScroll: true });

    const onKey = (e) => {
      if (e.key === "Escape") { e.preventDefault(); requestClose(); return; }
      if (e.key !== "Tab" || !sheet) return;
      const items = [...sheet.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null);
      if (!items.length) return;
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === sheet)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey);

    const body = document.body;
    const prev = { overflow: body.style.overflow, paddingRight: body.style.paddingRight };
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    body.style.overflow = "hidden";
    if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`;

    return () => {
      document.removeEventListener("keydown", onKey);
      body.style.overflow = prev.overflow;
      body.style.paddingRight = prev.paddingRight;
      if (previous && previous.focus) previous.focus({ preventScroll: true });
    };
  }, [requestClose]);

  /* ---- arrastrar para cerrar (solo celular) ---- */
  const onPointerDown = (e) => {
    const sheet = sheetRef.current;
    if (!sheet || dragRef.current || closingRef.current || !window.matchMedia(MOBILE).matches) return;
    if (!e.target.closest("[data-sheet-handle]") || e.target.closest("button, a, input, select, textarea")) return;
    dragRef.current = { id: e.pointerId, y: e.clientY, t: performance.now(), dy: 0 };
    try { sheet.setPointerCapture(e.pointerId); } catch {}
    sheet.style.transition = "none";
  };
  const onPointerMove = (e) => {
    const d = dragRef.current;
    if (!d || e.pointerId !== d.id) return;
    const raw = e.clientY - d.y;
    // Hacia arriba ofrece resistencia en vez de un tope seco.
    d.dy = raw >= 0 ? raw : -Math.pow(-raw, 0.6);
    sheetRef.current.style.transform = `translateY(${d.dy}px)`;
  };
  const onPointerUp = (e) => {
    const d = dragRef.current;
    if (!d || e.pointerId !== d.id) return;
    dragRef.current = null;
    const sheet = sheetRef.current;
    const velocity = d.dy / Math.max(1, performance.now() - d.t);
    sheet.style.transition = "";
    sheet.style.transform = "";
    if (d.dy > 110 || (d.dy > 16 && velocity > 0.11)) requestClose();
  };

  return (
    <>
      <div className="bb-scrim" data-closing={closing} onClick={requestClose} aria-hidden="true" />
      <div className="bb-sheet-pos">
        <div
          ref={sheetRef}
          className={`bb-sheet${tall ? " bb-sheet-tall" : ""}`}
          role="dialog"
          aria-modal="true"
          aria-label={label}
          tabIndex={-1}
          data-closing={closing}
          style={width ? { "--sheet-w": `${width}px` } : undefined}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {children(requestClose)}
        </div>
      </div>
    </>
  );
}
