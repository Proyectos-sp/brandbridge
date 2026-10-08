// Convierte scan.json (VTEX) y sites.json (otras tiendas) en líneas para scripts/presence-findings.jsonl.
import { readFileSync, writeFileSync } from "node:fs";

const STORE = {
  "www.chedraui.com.mx": "Chedraui", "www.marti.mx": "Martí",
  "www.artwalk.com.br": "Artwalk", "www.authenticfeet.com.br": "Authentic Feet", "www.epocacosmeticos.com.br": "Época Cosméticos", "www.paguemenos.com.br": "Pague Menos",
  "www.carulla.com": "Carulla", "www.exito.com": "Éxito", "www.larebajavirtual.com": "La Rebaja", "www.locatelcolombia.com": "Locatel Colombia", "www.olimpica.com": "Olímpica", "www.tiendasjumbo.co": "Jumbo Colombia",
  "www.carrefour.com.ar": "Carrefour Argentina", "www.disco.com.ar": "Disco", "www.farmacity.com": "Farmacity", "www.fravega.com": "Frávega", "www.grid.com.ar": "Grid", "www.jumbo.com.ar": "Jumbo Argentina", "www.vea.com.ar": "Vea",
  "www.metro.pe": "Metro", "www.oechsle.pe": "Oechsle", "www.plazavea.com.pe": "Plaza Vea", "www.promart.pe": "Promart", "www.wong.pe": "Wong",
  "www.kywi.com.ec": "Kywi", "www.medicity.com.ec": "Medicity", "www.pycca.com": "Pycca",
  "www.locatel.com.ve": "Locatel Venezuela",
  "www.elmachetazo.com": "El Machetazo", "www.superxtra.com": "Super Xtra",
  "cr.siman.com": "Siman Costa Rica", "www.walmart.co.cr": "Walmart Costa Rica",
  "www.sirena.do": "Sirena",
  "gt.siman.com": "Siman Guatemala", "www.cemaco.com": "Cemaco", "www.paiz.com.gt": "Paiz", "www.walmart.com.gt": "Walmart Guatemala",
  "www.walmart.com.hn": "Walmart Honduras",
  "sv.siman.com": "Siman El Salvador", "www.walmart.com.sv": "Walmart El Salvador",
  "ni.siman.com": "Siman Nicaragua", "www.walmart.com.ni": "Walmart Nicaragua",
};

// Coincidencias falsas revisadas a mano.
const REJECT = [
  (x) => x.brand === "Ruby Rose",                      // "The Glossier One" de Ruby Rose, no es Glossier
  (x) => x.brand === "ACHOKA",                         // reloj "Moto Watch", no es HOKA
  (x) => x.id === 51 && /BASA/.test(x.name),           // hieleras BASA modelo "Yeti"
  (x) => x.id === 52 && /termofusor|taladro|herramient|martillo|destornill/i.test(x.name), // Stanley herramientas
];

const scan = JSON.parse(readFileSync("scan.json", "utf8")).filter((x) => !x.error);
const sites = JSON.parse(readFileSync("sites.json", "utf8")).filter((x) => !x.error);
const all = [
  ...scan.map((x) => ({ ...x, store: STORE[x.host] || x.host, own: x.sellerId === "1" })),
  ...sites.map((x) => ({ ...x, own: true })),
].filter((x) => !REJECT.some((f) => f(x)));

// Agrupar por marca + país + tienda
const groups = new Map();
for (const x of all) {
  const k = `${x.id}|${x.country}|${x.store}`;
  if (!groups.has(k)) groups.set(k, []);
  groups.get(k).push(x);
}
const lines = [];
for (const [k, items] of groups) {
  const [id, country, store] = k.split("|");
  const own = items.filter((x) => x.own);
  const status = own.length ? "retail" : "marketplace";
  const pick = (own.length ? own : items).filter((x) => x.url);
  const seen = new Set();
  const sources = pick.filter((x) => !seen.has(x.url) && seen.add(x.url)).slice(0, 1)
    .map((x) => ({ title: `${store}${status === "marketplace" ? " (vendedor externo)" : ""} — ${x.name.replace(/\s+/g, " ").trim().slice(0, 70)}`, url: x.url }));
  if (sources.length) lines.push({ id: +id, country, status, sources });
}
writeFileSync("findings-auto.jsonl", lines.map((l) => JSON.stringify(l)).join("\n") + "\n");
const byStatus = lines.reduce((a, l) => ((a[l.status] = (a[l.status] || 0) + 1), a), {});
console.log(lines.length, "líneas", byStatus);
