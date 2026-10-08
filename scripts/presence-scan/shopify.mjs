// Detecta tiendas Shopify (buscador público /search/suggest.json) y busca las 55 marcas en ellas.
// Uso: node shopify.mjs detect  |  node shopify.mjs scan
import { readFileSync, writeFileSync } from "node:fs";
import { BRANDS } from "./brands.mjs";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9.&]/g, "");

// Tiendas de suplementos, deporte y salud de la región (país, nombre, dominio).
const CANDIDATES = [
  ["Guatemala", "GNC Guatemala", "gnc.com.gt"],
  ["Panama", "GNC Panamá", "gnc.com.pa"],
  ["Costa Rica", "GNC Costa Rica", "gnc.cr"],
  ["Costa Rica", "GNC Costa Rica", "gnccr.com"],
  ["El Salvador", "GNC El Salvador", "gnc.com.sv"],
  ["Honduras", "GNC Honduras", "gnc.hn"],
  ["Honduras", "GNC Honduras", "gnc.com.hn"],
  ["Nicaragua", "GNC Nicaragua", "gnc.com.ni"],
  ["Dominican Republic", "GNC República Dominicana", "gnc.com.do"],
  ["Colombia", "GNC Colombia", "gnc.com.co"],
  ["Peru", "GNC Perú", "gnc.com.pe"],
  ["Ecuador", "GNC Ecuador", "gnc.com.ec"],
  ["Chile", "GNC Chile", "gnc.cl"],
  ["Mexico", "GNC México", "gnc.com.mx"],
  ["Bolivia", "GNC Bolivia", "gnc.com.bo"],
  ["Paraguay", "GNC Paraguay", "gnc.com.py"],
  ["Uruguay", "GNC Uruguay", "gnc.com.uy"],
  ["Venezuela", "GNC Venezuela", "gnc.com.ve"],
  ["Panama", "Vitamin Shoppe Panamá", "vitaminshoppepanama.com"],
  ["Mexico", "Suplementos MTY", "suplementosmty.com"],
  ["Mexico", "Sportnutrition MX", "sportnutrition.com.mx"],
  ["Colombia", "Nutramerican", "nutramerican.com"],
  ["Colombia", "Sport Nutrition Colombia", "sportnutrition.com.co"],
  ["Chile", "Suplementos Chile", "suplementoschile.cl"],
  ["Chile", "Allnutrition", "allnutrition.cl"],
  ["Chile", "Nutrition Chile", "suplestore.cl"],
  ["Peru", "Suplementos Perú", "suplementosperu.com"],
  ["Costa Rica", "Nutrition Store CR", "nutritionstorecr.com"],
  ["Costa Rica", "Fitness Costa Rica", "fitnesscostarica.com"],
  ["Dominican Republic", "Supplement Store RD", "supplementstorerd.com"],
  ["Guatemala", "Body Shop GT", "bodyshopgt.com"],
  ["El Salvador", "Fit Store SV", "fitstore.com.sv"],
  ["Ecuador", "Fitness Ecuador", "suplementosecuador.com"],
  ["Argentina", "Body Advance", "bodyadvance.com.ar"],
  ["Uruguay", "Suplementos Uruguay", "suplementosuruguay.com.uy"],
  ["Paraguay", "Nutri Paraguay", "nutri.com.py"],
  ["Bolivia", "Suplementos Bolivia", "suplementosbolivia.com"],
];

async function suggest(domain, q) {
  const r = await fetch(`https://${domain}/search/suggest.json?q=${encodeURIComponent(q)}&resources%5Btype%5D=product&resources%5Blimit%5D=10`, {
    headers: { "user-agent": UA, accept: "application/json" }, signal: AbortSignal.timeout(15000),
  });
  const j = await r.json();
  return j?.resources?.results?.products || null;
}

if (process.argv[2] === "detect") {
  const ok = [];
  await Promise.all(CANDIDATES.map(async ([country, store, domain]) => {
    try {
      const p = await suggest(domain, "proteina");
      if (Array.isArray(p)) { ok.push([country, store, domain]); console.log("SHOPIFY", country, domain, p.length); }
      else console.log("-", domain);
    } catch (e) { console.log("ERR", domain, e.message.slice(0, 40)); }
  }));
  writeFileSync("shopify-stores.json", JSON.stringify(ok, null, 1));
} else {
  const stores = JSON.parse(readFileSync("shopify-stores.json", "utf8"));
  const results = [];
  await Promise.all(stores.map(async ([country, store, domain]) => {
    for (const b of BRANDS) {
      try {
        for (const p of (await suggest(domain, b.term)) || []) {
          const vendorOk = b.aliases.map(norm).includes(norm(p.vendor));
          const strongOk = b.strong ? b.strong.test(p.title) : false;
          const nameOk = b.name ? b.name.test(p.title) : true;
          const wordOk = new RegExp(`\\b${b.term.split(" ")[0].replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i").test(p.title);
          if (strongOk || ((vendorOk || wordOk) && nameOk && (b.strong ? vendorOk : true))) {
            results.push({ id: b.id, country, store, name: p.title, vendor: p.vendor, url: `https://${domain}${String(p.url).split("?")[0]}`, available: p.available });
          }
        }
      } catch (e) { /* tienda caída o sin resultados */ }
      await sleep(300);
    }
  }));
  writeFileSync("shopify-scan.json", JSON.stringify(results, null, 1));
  for (const r of results) console.log(r.country.padEnd(12), String(r.id).padStart(2), r.store.padEnd(24), r.available ? "disp" : "agot", r.name.slice(0, 60));
}
