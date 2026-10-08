// Busca cada marca en el catálogo público (VTEX) de cada tienda y guarda los productos que coinciden.
import { readFileSync, writeFileSync } from "node:fs";
import { BRANDS } from "./brands.mjs";

const vtex = JSON.parse(readFileSync("vtex.json", "utf8"));
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36";
const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9.&]/g, "");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const results = [];
const jobs = Object.entries(vtex).flatMap(([country, hosts]) => hosts.map((h) => [country, h]));

await Promise.all(jobs.map(async ([country, host]) => {
  for (const b of BRANDS) {
    try {
      const url = `https://${host}/api/catalog_system/pub/products/search?ft=${encodeURIComponent(b.term)}&_from=0&_to=49`;
      const r = await fetch(url, { headers: { "user-agent": UA, accept: "application/json" }, signal: AbortSignal.timeout(20000) });
      const list = await r.json().catch(() => []);
      for (const p of Array.isArray(list) ? list : []) {
        const brandOk = b.aliases.map(norm).includes(norm(p.brand));
        const nameOk = b.name ? b.name.test(p.productName || "") : true;
        const strongOk = b.strong ? b.strong.test(p.productName || "") : false;
        if (!((brandOk && nameOk) || strongOk)) continue;
        const offer = p.items?.[0]?.sellers?.[0];
        results.push({
          id: b.id, country, host, name: p.productName, brand: p.brand, url: `https://${host}/${p.linkText}/p`,
          seller: offer?.sellerName, sellerId: offer?.sellerId, available: offer?.commertialOffer?.IsAvailable ?? null,
        });
      }
    } catch (e) {
      results.push({ id: b.id, country, host, error: e.message.slice(0, 60) });
    }
    await sleep(250);
  }
}));

writeFileSync("scan.json", JSON.stringify(results, null, 1));
const ok = results.filter((r) => !r.error);
console.log("matches", ok.length, "errors", results.length - ok.length);
