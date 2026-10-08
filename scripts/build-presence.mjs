// Arma data/presence.json a partir de scripts/presence-findings.jsonl (una línea por hallazgo:
// marca, país, "retail" o "marketplace" y los enlaces que lo prueban).
// Uso: node scripts/build-presence.mjs 2026-10-08   (fecha de la revisión)
import { readFileSync, writeFileSync } from "node:fs";

const checkedAt = process.argv[2];
if (!/^\d{4}-\d{2}-\d{2}$/.test(checkedAt || "")) throw new Error("Falta la fecha de la revisión (AAAA-MM-DD)");

const root = new URL("..", import.meta.url);
const countries = Object.keys(JSON.parse(readFileSync(new URL("data/countries.json", root), "utf8")));
const brandIds = JSON.parse(readFileSync(new URL("data/brands.json", root), "utf8")).map((b) => b.id);
const findings = readFileSync(new URL("scripts/presence-findings.jsonl", root), "utf8")
  .split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l));

const brands = {};
for (const f of findings) {
  if (!brandIds.includes(f.id)) throw new Error(`Marca desconocida: ${f.id}`);
  if (!countries.includes(f.country)) throw new Error(`País desconocido: ${f.country}`);
  if (!["retail", "marketplace"].includes(f.status)) throw new Error(`Estado no válido: ${f.status}`);
  const byCountry = (brands[f.id] ||= {});
  const prev = byCountry[f.country];
  // Una tienda local pesa más que la reventa: si hay las dos, queda "retail" y sus enlaces van primero.
  const status = prev?.status === "retail" || f.status === "retail" ? "retail" : "marketplace";
  const ordered = f.status === "retail" ? [...f.sources, ...(prev?.sources || [])] : [...(prev?.sources || []), ...f.sources];
  const seen = new Set();
  const sources = ordered.filter((s) => !seen.has(s.url) && seen.add(s.url)).slice(0, 3);
  byCountry[f.country] = { status, sources };
}

const out = {
  checkedAt,
  method: "Búsqueda manual en tiendas y marketplaces de cada país (supermercados, tiendas por departamento, Sephora, Mercado Libre, Amazon, etc.). retail = la vende una tienda del país; marketplace = solo revendedores o importación. Si un país no aparece, no se encontró la marca.",
  brands,
};
writeFileSync(new URL("data/presence.json", root), JSON.stringify(out, null, 2) + "\n");
const total = Object.values(brands).reduce((n, c) => n + Object.keys(c).length, 0);
console.log(`data/presence.json: ${Object.keys(brands).length} marcas, ${total} países con hallazgos`);
