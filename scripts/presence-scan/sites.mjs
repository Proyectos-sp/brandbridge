// Revisa tiendas que no usan VTEX leyendo su página de búsqueda (o su JSON público).
import { writeFileSync } from "node:fs";
import { BRANDS } from "./brands.mjs";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const decode = (s) => s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16))).replace(/&#(\d+);/g, (_, d) => String.fromCharCode(+d));
const get = async (url) => (await fetch(url, { headers: { "user-agent": UA }, signal: AbortSignal.timeout(25000) })).text();

// Cada tienda devuelve [{ name, url, vendor? }]
const SITES = [
  {
    country: "Ecuador", store: "Supermaxi",
    search: async (term) => {
      const html = await get(`https://www.supermaxi.com/?s=${encodeURIComponent(term)}&post_type=product`);
      const out = [];
      for (const m of html.matchAll(/woocommerce-loop-product__title[^>]*data-title="([^"]+)"/g)) {
        const before = html.slice(Math.max(0, m.index - 4000), m.index);
        const links = [...before.matchAll(/href="(https:\/\/www\.supermaxi\.com\/producto\/[^"]+)"/g)];
        out.push({ name: decode(m[1]), url: links.length ? links[links.length - 1][1] : null });
      }
      return out;
    },
  },
  {
    country: "Uruguay", store: "Tienda Inglesa",
    search: async (term) => {
      const html = await get(`https://www.tiendainglesa.com.uy/supermercado/busqueda?0,0,${encodeURIComponent(term)},0`);
      const out = [];
      for (const m of html.matchAll(/card-product-name">([^<]+)</g)) {
        const before = html.slice(Math.max(0, m.index - 800), m.index);
        const links = [...before.matchAll(/href="(\/supermercado\/[^"]+\.producto[^"]*)"/g)];
        out.push({ name: decode(m[1].trim()), url: links.length ? `https://www.tiendainglesa.com.uy${links[links.length - 1][1]}` : null });
      }
      return out;
    },
  },
  {
    country: "Nicaragua", store: "La Colonia",
    search: async (term) => {
      const html = await get(`https://lacolonia.com.ni/?s=${encodeURIComponent(term)}`);
      const out = [];
      for (const m of html.matchAll(/aria-label="Ver producto: ([^"]+)"[^>]*href="([^"]+)"/g)) {
        out.push({ name: decode(m[1]), url: m[2].startsWith("http") ? m[2] : `https://lacolonia.com.ni${m[2]}` });
      }
      return out;
    },
  },
  {
    country: "Bolivia", store: "Fidalga",
    search: async (term) => {
      const json = JSON.parse(await get(`https://www.fidalga.com/search/suggest.json?q=${encodeURIComponent(term)}&resources%5Btype%5D=product&resources%5Blimit%5D=10`));
      return (json.resources?.results?.products || []).map((p) => ({ name: p.title, vendor: p.vendor, url: `https://www.fidalga.com${p.url.split("?")[0]}` }));
    },
  },
];

const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9.&]/g, "");
// Sin campo de marca: el nombre del producto tiene que nombrar la marca (y, si es genérica, el tipo de producto).
const brandWord = (b) => new RegExp(`\\b${b.term.split(" ")[0].replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i");

const results = [];
await Promise.all(SITES.map(async (site) => {
  for (const b of BRANDS) {
    try {
      for (const p of await site.search(b.term)) {
        const vendorOk = p.vendor ? b.aliases.map(norm).includes(norm(p.vendor)) : false;
        const strongOk = b.strong ? b.strong.test(p.name) : false;
        const nameOk = b.name ? b.name.test(p.name) : true;
        const wordOk = brandWord(b).test(p.name);
        if (strongOk || ((vendorOk || wordOk) && nameOk && (b.strong ? vendorOk : true))) {
          results.push({ id: b.id, country: site.country, store: site.store, name: p.name, url: p.url, vendor: p.vendor || null });
        }
      }
    } catch (e) {
      results.push({ id: b.id, country: site.country, store: site.store, error: e.message.slice(0, 60) });
    }
    await sleep(400);
  }
}));
writeFileSync("sites.json", JSON.stringify(results, null, 1));
const ok = results.filter((r) => !r.error);
console.log("matches", ok.length, "errors", results.length - ok.length);
for (const r of ok) console.log(r.country.padEnd(10), String(r.id).padStart(2), r.store.padEnd(15), r.name.slice(0, 70));
