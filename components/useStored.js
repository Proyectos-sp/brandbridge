"use client";

// Estado que se guarda en este navegador (localStorage). Si el navegador no deja guardar,
// la app sigue funcionando y simplemente no recuerda nada.
// Se escribe solo cuando el usuario cambia algo, así el valor inicial nunca pisa lo guardado.
import { useCallback, useEffect, useState } from "react";

export default function useStored(key, initial) {
  const [value, setValue] = useState(initial);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw) setValue(JSON.parse(raw));
    } catch {}
  }, [key]);

  const update = useCallback((next) => {
    setValue((prev) => {
      const value = typeof next === "function" ? next(prev) : next;
      try { window.localStorage.setItem(key, JSON.stringify(value)); } catch {}
      return value;
    });
  }, [key]);

  return [value, update];
}
