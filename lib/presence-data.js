// Dónde se encontró cada marca del catálogo (data/presence.json, armado con scripts/build-presence.mjs).
// Lo usan el servidor (análisis y chat) y la interfaz (etiqueta de las tarjetas).
import presence from "@/data/presence.json";

export const PRESENCE_CHECKED_AT = presence.checkedAt;

// Fecha en que se revisaron a fondo las tiendas del país, o null si la revisión fue parcial
// (entonces "no se encontró" no basta para decir que la marca no se vende allí).
export function countryCheckedAt(country) {
  return presence.coverage?.[country] || null;
}

// { status: "retail" | "marketplace", sources: [{ title, url }] } o null si no se encontró
// (o si es una empresa investigada, que no entra en esta revisión).
export function checkedPresence(brand, country) {
  if (brand.researched) return null;
  return presence.brands[brand.id]?.[country] || null;
}
