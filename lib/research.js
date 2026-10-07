// Empresas investigadas con IA: limpieza de la ficha que devuelve la IA y guardado en el servidor.
// La ficha se guarda en el servidor y el navegador solo manda su id, así nadie puede alterarla.
import { BRANDS, CATEGORIES, getBrand } from "@/lib/data";
import { getValue, setValue } from "@/lib/store";

export const TAGS = ["Trending", "Rising", "Established", "Emerging"];
export const RESEARCH_DAYS = 90;
const PREFIX = "r-";

const str = (v, max) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "");
const or = (v, fallback) => v || fallback;

export function normalizeQuery(q) {
  return str(q, 80).toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9& .'-]/g, "").trim();
}

function slugify(name) {
  return name.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48);
}

// Marca del catálogo cuyo nombre coincide con la búsqueda (para no investigar lo que ya existe).
export function catalogMatch(query) {
  const q = normalizeQuery(query).replace(/[^a-z0-9]/g, "");
  return BRANDS.find((b) => b.name.toLowerCase().replace(/[^a-z0-9]/g, "") === q) || null;
}

function cleanUrl(v) {
  const s = str(v, 200);
  try {
    const u = new URL(s);
    return u.protocol === "https:" || u.protocol === "http:" ? u.href : "";
  } catch {
    return "";
  }
}

// Lee el JSON de la IA y deja solo campos válidos, con el mismo formato que data/brands.json.
export function parseResearch(text, sources) {
  let parsed;
  try {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1 || end === -1) return null;
    parsed = JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }

  if (!parsed?.found || !parsed.brand) {
    const candidates = (Array.isArray(parsed?.candidates) ? parsed.candidates : [])
      .map((c) => ({ name: str(c?.name, 60), note: str(c?.note, 100) }))
      .filter((c) => c.name)
      .slice(0, 3);
    return { candidates };
  }

  const b = parsed.brand;
  const name = str(b.name, 60);
  if (!name) return null;
  const slug = slugify(name);
  if (!slug) return null;

  const instagram = /^@?[A-Za-z0-9._]{1,30}$/.test(str(b.instagram, 32)) ? "@" + str(b.instagram, 32).replace(/^@/, "") : "";
  const founded = Number.isInteger(b.founded) && b.founded > 1800 && b.founded <= new Date().getFullYear() ? b.founded : "Unknown";
  const score = Math.round(Number(b.baseScore));

  return {
    brand: {
      id: PREFIX + slug,
      slug,
      name,
      category: CATEGORIES.includes(b.category) ? b.category : "Other",
      tag: TAGS.includes(b.tag) ? b.tag : "Emerging",
      origin: or(str(b.origin, 40), "Unknown"),
      founded,
      revenue: or(str(b.revenue, 24), "Unknown"),
      growth: or(str(b.growth, 24), "Unknown"),
      stage: or(str(b.stage, 24), "Unknown"),
      employees: or(str(b.employees, 24), "Unknown"),
      markets: (Array.isArray(b.markets) ? b.markets : []).map((m) => str(m, 40)).filter(Boolean).slice(0, 15),
      baseScore: Number.isFinite(score) ? Math.min(95, Math.max(20, score)) : 50,
      scoreReason: str(b.scoreReason, 240),
      description: str(b.description, 260),
      website: cleanUrl(b.website),
      instagram,
      instagramUrl: instagram ? `https://instagram.com/${instagram.slice(1)}` : "",
      sources: (sources || []).slice(0, 6),
      researched: true,
      researchedAt: new Date().toISOString().slice(0, 10),
    },
  };
}

export const researchKey = (lang, query) => `research:v1:${lang}:${normalizeQuery(query)}`;
const brandKey = (id) => `rbrand:v1:${id}`;

export async function saveResearchedBrand(brand) {
  await setValue(brandKey(brand.id), brand, RESEARCH_DAYS * 86400);
}

// Marca del catálogo (id numérico) o investigada (id "r-...") guardada en el servidor.
export async function findBrand(id) {
  if (typeof id === "string" && id.startsWith(PREFIX)) {
    if (!/^r-[a-z0-9-]{1,48}$/.test(id)) return null;
    return (await getValue(brandKey(id))) || null;
  }
  return getBrand(id);
}

// Respuesta del paso 1 (identificar la empresa).
export function parseIdentify(text) {
  try {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1 || end === -1) return null;
    const p = JSON.parse(text.slice(start, end + 1));
    const candidates = (Array.isArray(p.candidates) ? p.candidates : [])
      .map((c) => ({ name: str(c?.name, 60), note: str(c?.note, 100) }))
      .filter((c) => c.name)
      .slice(0, 3);
    return { found: Boolean(p.found), name: str(p.name, 60), website: cleanUrl(p.website), wikipedia: str(p.wikipedia, 120), candidates };
  } catch {
    return null;
  }
}

// ------------------------------------------------------------ Instagram verificado
// La IA escribe la cuenta de Instagram de memoria y a veces la inventa. Solo se muestra si aparece
// enlazada en el sitio oficial de la empresa o en Wikidata; si no se puede confirmar, se quita.

const IG_LINK = /instagram\.com\\?\/(?:#!\\?\/)?([A-Za-z0-9._]{1,30})/gi;
const IG_NOT_PROFILE = new Set(["p", "reel", "reels", "explore", "accounts", "stories", "tv", "about", "legal", "developer", "direct", "share", "web", "embed.js"]);
const BROWSER_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
const WIKI_UA = "BrandBridge/1.0 (market research demo)";

const hostOf = (url) => {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
};

// Solo sitios públicos con nombre de dominio (nada de IPs ni localhost).
function publicSite(url) {
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    if (!["https:", "http:"].includes(u.protocol) || u.port || u.username) return false;
    if (!host.includes(".") || host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) return false;
    return !/^[\d.]+$/.test(host) && !host.includes(":");
  } catch {
    return false;
  }
}

function handlesIn(text) {
  const out = [];
  for (const m of String(text).matchAll(IG_LINK)) {
    const h = m[1].replace(/\.+$/, "");
    if (h && !IG_NOT_PROFILE.has(h.toLowerCase()) && !out.some((x) => x.toLowerCase() === h.toLowerCase())) out.push(h);
  }
  return out;
}

async function instagramOnSite(website) {
  if (!publicSite(website)) return [];
  try {
    const res = await fetch(website, { headers: { "User-Agent": BROWSER_UA, Accept: "text/html" }, redirect: "follow", signal: AbortSignal.timeout(6000) });
    if (!res.ok || !publicSite(res.url)) return [];
    return handlesIn((await res.text()).slice(0, 3_000_000));
  } catch {
    return [];
  }
}

// Wikidata guarda la cuenta de Instagram (P2003) y el sitio oficial (P856) de muchas empresas.
// Solo se usa la entrada cuyo sitio oficial coincide con el de la ficha.
async function instagramOnWikidata(name, website) {
  const host = hostOf(website);
  if (!host) return [];
  try {
    const api = "https://www.wikidata.org/w/api.php?format=json&action=";
    const opts = { headers: { "User-Agent": WIKI_UA }, signal: AbortSignal.timeout(5000) };
    const found = await fetch(`${api}wbsearchentities&language=en&limit=5&search=${encodeURIComponent(name)}`, opts).then((r) => r.json());
    const ids = (found?.search || []).map((e) => e.id).filter((id) => /^Q\d+$/.test(id));
    if (!ids.length) return [];
    const data = await fetch(`${api}wbgetentities&props=claims&ids=${ids.join("|")}`, opts).then((r) => r.json());
    const values = (e, p) => (e?.claims?.[p] || []).map((c) => c?.mainsnak?.datavalue?.value).filter((v) => typeof v === "string");
    const match = Object.values(data?.entities || {}).find((e) => values(e, "P856").some((url) => hostOf(url) === host));
    return values(match, "P2003").filter((h) => /^[A-Za-z0-9._]{1,30}$/.test(h));
  } catch {
    return [];
  }
}

// Deja en la ficha solo una cuenta confirmada: la que dijo la IA si aparece en las fuentes,
// o la que enlaza el sitio oficial / Wikidata. Marca la ficha como revisada.
export async function verifyInstagram(brand) {
  const [site, wiki] = await Promise.all([instagramOnSite(brand.website), instagramOnWikidata(brand.name, brand.website)]);
  const confirmed = [...site, ...wiki];
  const claimed = (brand.instagram || "").replace(/^@/, "").toLowerCase();
  const handle = confirmed.find((h) => h.toLowerCase() === claimed) || confirmed[0] || "";
  brand.instagram = handle ? "@" + handle : "";
  brand.instagramUrl = handle ? `https://instagram.com/${handle}` : "";
  brand.instagramChecked = true;
  return brand;
}

// Busca el artículo de Wikipedia (en inglés) de la empresa con la API pública y gratuita.
// Devuelve su URL o "" si no hay uno que coincida con el nombre.
export async function findWikipedia(name) {
  const want = name.toLowerCase().replace(/\s*\(.*\)\s*/g, "").replace(/[^a-z0-9]/g, "");
  if (!want) return "";
  try {
    const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&format=json&srlimit=5&srsearch=${encodeURIComponent(name)}`;
    const res = await fetch(url, { headers: { "User-Agent": "BrandBridge/1.0 (market research demo)" }, signal: AbortSignal.timeout(5000) });
    const data = await res.json();
    const hit = (data?.query?.search || []).find((r) => {
      const title = r.title.toLowerCase().replace(/\s*\(.*\)\s*/g, "").replace(/[^a-z0-9]/g, "");
      return title === want || (title.startsWith(want) && title.length - want.length <= 8);
    });
    return hit ? `https://en.wikipedia.org/wiki/${encodeURIComponent(hit.title.replace(/ /g, "_"))}` : "";
  } catch {
    return "";
  }
}
