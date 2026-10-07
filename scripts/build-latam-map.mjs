// Genera components/latamMap.js: el mapa de Latinoamérica de la portada como trazos SVG fijos.
// Datos: Natural Earth 1:110m (paquete world-atlas). Se ejecuta a mano: node scripts/build-latam-map.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { feature } from "topojson-client";
import { geoMercator, geoPath } from "d3-geo";

const require = createRequire(import.meta.url);
const world = require("world-atlas/countries-110m.json");

// Nombre en Natural Earth -> nombre en data/countries.json (los mercados de la app).
// Francia se recorta al encuadre, así que solo queda la Guayana Francesa.
const MARKETS = { "Dominican Rep.": "Dominican Republic", France: "French Guiana" };
const REGION = [
  "Mexico", "Guatemala", "Belize", "Honduras", "El Salvador", "Nicaragua", "Costa Rica", "Panama",
  "Cuba", "Jamaica", "Haiti", "Dominican Rep.", "Puerto Rico", "Bahamas", "Trinidad and Tobago",
  "Colombia", "Venezuela", "Guyana", "Suriname", "Ecuador", "Peru", "Brazil", "Bolivia", "Paraguay",
  "Chile", "Argentina", "Uruguay", "Falkland Is.", "France",
];
const markets = Object.keys(JSON.parse(readFileSync(new URL("../data/countries.json", import.meta.url), "utf8")));

const all = feature(world, world.objects.countries).features;
const region = all.filter((f) => REGION.includes(f.properties.name));

// Se recortan islas lejanas (Galápagos, Isla de Pascua, etc.) para que el encuadre quede limpio.
const BOX = { west: -118, east: -33, north: 33, south: -56 };
function clip(f) {
  const keep = (poly) => poly[0].every(([x, y]) => x > BOX.west && x < BOX.east && y < BOX.north && y > BOX.south);
  const g = f.geometry;
  if (g.type === "Polygon") return keep(g.coordinates) ? f : null;
  const coords = g.coordinates.filter(keep);
  return coords.length ? { ...f, geometry: { type: "MultiPolygon", coordinates: coords } } : null;
}
const shapes = region.map(clip).filter(Boolean);

const W = 520, H = 720;
const projection = geoMercator().fitExtent([[6, 6], [W - 6, H - 6]], { type: "FeatureCollection", features: shapes });
const path = geoPath(projection);
const round = (d) => d.replace(/(\d+\.\d{1})\d+/g, "$1");

// Punto de cada mercado: el centro del polígono más grande del país.
function anchor(f) {
  if (f.geometry.type === "Polygon") return path.centroid(f);
  let best = null, area = -1;
  for (const c of f.geometry.coordinates) {
    const part = { type: "Feature", geometry: { type: "Polygon", coordinates: c } };
    const a = path.area(part);
    if (a > area) { area = a; best = part; }
  }
  return path.centroid(best);
}

const countries = shapes.map((f) => {
  const name = MARKETS[f.properties.name] || f.properties.name;
  const market = markets.includes(name);
  const [x, y] = anchor(f);
  return { name, market, d: round(path(f)), x: Math.round(x), y: Math.round(y) };
});

const missing = markets.filter((m) => !countries.some((c) => c.name === m && c.market));
if (missing.length) throw new Error("Mercados sin forma en el mapa: " + missing.join(", "));

// Recuadro ampliado de Centroamérica (países pequeños, difíciles de tocar en el mapa).
const INSET_NAMES = ["Guatemala", "Belize", "El Salvador", "Honduras", "Nicaragua", "Costa Rica", "Panama"];
let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity];
for (const f of shapes.filter((f) => INSET_NAMES.includes(f.properties.name))) {
  const [[a, b], [c, d]] = path.bounds(f);
  x0 = Math.min(x0, a); y0 = Math.min(y0, b); x1 = Math.max(x1, c); y1 = Math.max(y1, d);
}
const pad = 9;
const inset = [x0 - pad, y0 - pad, x1 - x0 + pad * 2, y1 - y0 + pad * 2].map((n) => Math.round(n));

const out = `// Archivo generado por scripts/build-latam-map.mjs (Natural Earth 1:110m). No editar a mano.
export const MAP_W = ${W};
export const MAP_H = ${H};
export const INSET = ${JSON.stringify(inset)}; // x, y, ancho, alto del recuadro de Centroamérica
export const LATAM = ${JSON.stringify(countries)};
`;
writeFileSync(new URL("../components/latamMap.js", import.meta.url), out);
console.log(`ok: ${countries.length} países, ${countries.filter((c) => c.market).length} mercados, ${(out.length / 1024).toFixed(0)} KB`);
