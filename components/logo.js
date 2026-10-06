// Logo de una marca: el del catálogo, o para empresas investigadas con IA un recuadro
// con su nombre en la paleta de la app (no se copian logos de otros sitios).
import LOGOS from "@/data/logos.json";

const TILES = [
  { bg: "#1C1C1C", fg: "#D9BC7C" },
  { bg: "#F6EDD8", fg: "#1C1C1C" },
  { bg: "#CDAE72", fg: "#1C1C1C" },
];

function hash(text) {
  let h = 0;
  for (const ch of text) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

const escape = (s) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[c]);

export function logoSrc(brand) {
  if (LOGOS[brand.slug] && !brand.researched) return LOGOS[brand.slug];
  const { bg, fg } = TILES[hash(brand.name) % TILES.length];
  const name = brand.name.length > 16 ? brand.name.slice(0, 15) + "…" : brand.name;
  const size = Math.max(34, Math.min(64, Math.floor(720 / Math.max(name.length, 1))));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 200"><rect width="500" height="200" fill="${bg}"/><text x="250" y="100" fill="${fg}" font-family="Helvetica, Arial, sans-serif" font-weight="800" font-size="${size}" letter-spacing="-1" text-anchor="middle" dominant-baseline="central">${escape(name)}</text></svg>`;
  return "data:image/svg+xml," + encodeURIComponent(svg);
}
