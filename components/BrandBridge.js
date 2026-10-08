"use client";

// Interfaz de BrandBridge, inspirada en teak.io: papel cuadriculado, tarjetas de interfaz reales
// flotando, el destino resaltado y un color por categoría. La IA se pide al servidor (/api/analyze y /api/chat).
import { useEffect, useMemo, useRef, useState } from "react";
import { logoSrc } from "./logo";
import { scoreFor } from "@/lib/score";
import { checkedPresence } from "@/lib/presence-data";
import { getText } from "@/lib/i18n";
import BrandSheet, { TermsSheet } from "./BrandSheet";
import HeroBoard from "./HeroBoard";
import { ScoreBadge, bandFor } from "./Score";
import { ArrowUpRightIcon, CheckIcon, ChevronDownIcon, CloseIcon, CompassIcon, GlobeIcon, HeartIcon, LogoMark, PlayIcon, PlusIcon, SearchIcon, ShieldIcon, TeamIcon, UserIcon } from "./icons";
import TeamView from "./Team";
import IntroView from "./Intro";
import ResearchBox from "./Research";
import { CompareSheet, CompareTray, EMPTY_PROFILE, PageHead, ProfileView, WatchEmpty, profileQuestion } from "./Extras";
import useFlip from "./useFlip";
import useStored from "./useStored";

const TAGS = ["Trending", "Rising", "Established", "Emerging"];
const CATEGORIES = ["Beverage", "Food", "Snacks", "Apparel", "Beauty", "Home", "Wellness", "Tech", "Pets"];

/* ------------------------------------------------------------ tarjeta de marca */

// Datos que la IA no pudo confirmar se muestran como "—".
const fact = (v) => (!v || v === "Unknown" ? "—" : v);

function BrandCard({ brand, score, country, onOpen, index, t, saved, onToggleSave, comparing, compareFull, onToggleCompare, presence, mine, onRemove }) {
  const band = bandFor(score);
  const growthDown = String(brand.growth).trim().startsWith("-");
  return (
    <article className="bb-card" data-saved={saved} data-cat={brand.category} data-researched={brand.researched || undefined}>
      <div className="bb-card-media">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoSrc(brand)} alt="" loading={index < 8 ? "eager" : "lazy"} />
      </div>
      <div className="bb-card-body">
        <div className="bb-card-head">
          <div className="bb-card-titles">
            <h3>{brand.name}</h3>
            <span className="bb-card-meta">
              <span className="bb-catlabel" data-cat={brand.category}><i />{t.category(brand.category)}</span>
              <span>{t.country(brand.origin)}</span>
              {mine && <span className="bb-mine">{t.yourSector}</span>}
              {brand.researched && <span className="bb-ai-tag">{t.researchedTag}</span>}
            </span>
          </div>
          <span key={country} className="bb-pop-in"><ScoreBadge score={score} band={band} label={t.bands[band]} /></span>
        </div>
        {presence && (
          <span className={`bb-presence-chip bb-pres-${presence.kind}`}>
            <i />{presence.label}{presence.ai && <small>{t.aiTag}</small>}
          </span>
        )}
        <p className="bb-card-desc">{t.description(brand)}</p>
        <div className="bb-facts">
          <span><small>{t.revenue}</small><b>{fact(brand.revenue)}</b></span>
          <span><small>{t.growth}</small><b className={growthDown ? "bb-down" : undefined}>{fact(brand.growth)}</b></span>
          <span><small>{t.stage}</small><b>{fact(brand.stage)}</b></span>
        </div>
        <div className="bb-card-foot">
          <span className="bb-tag">{t.tag(brand.tag)}</span>
          <span className="bb-card-cta" aria-hidden="true">{t.analyzeFor(t.country(country))}<PlayIcon size={9} /></span>
        </div>
      </div>

      {/* Botón que cubre toda la tarjeta; las acciones quedan por encima */}
      <button type="button" className="bb-card-open" onClick={() => onOpen(brand)}
        aria-label={`${t.openBrand(brand.name)} · ${score}/100 ${t.bands[band]}`} />

      <div className="bb-card-actions">
        <button type="button" className="bb-mini" aria-pressed={comparing} onClick={() => onToggleCompare(brand.id)}
          aria-label={`${comparing ? t.comparing : t.compare}: ${brand.name}`}
          disabled={!comparing && compareFull} title={!comparing && compareFull ? t.compareFull : undefined}>
          {comparing ? <CheckIcon size={15} strokeWidth={2.4} /> : <PlusIcon size={15} strokeWidth={2.4} />}
          <span className="bb-mini-label">{comparing ? t.comparing : t.compare}</span>
        </button>
        <button type="button" className="bb-heart" aria-pressed={saved} onClick={() => onToggleSave(brand.id)}
          aria-label={saved ? t.unsaveLabel(brand.name) : t.saveLabel(brand.name)}>
          <HeartIcon size={18} filled={saved} />
        </button>
        {onRemove && (
          <button type="button" className="bb-heart bb-remove" onClick={() => onRemove(brand.id)} aria-label={t.removeResearched(brand.name)} title={t.remove}>
            <CloseIcon size={16} strokeWidth={2.2} />
          </button>
        )}
      </div>
    </article>
  );
}

/* ------------------------------------------------------------ navegación */

// Vistas: la introducción es la portada (sin #); el resto vive en su #hash.
const VIEWS = ["intro", "discover", "watchlist", "profile", "team"];
const NAV_VIEWS = ["discover", "watchlist", "profile"];
const VIEW_ICONS = { discover: CompassIcon, watchlist: HeartIcon, profile: UserIcon, team: TeamIcon };

function NavItems({ view, onChange, savedCount, t, className }) {
  return NAV_VIEWS.map((v) => {
    const Icon = VIEW_ICONS[v];
    return (
      <a key={v} href={`#${v}`} className={className} aria-current={view === v ? "page" : undefined}
        onClick={(e) => { e.preventDefault(); onChange(v); }}>
        <Icon size={18} />
        <i className="bb-marker" data-view={v} aria-hidden="true" />
        <span>{t.nav[v]}</span>
        {v === "watchlist" && savedCount > 0 && <span key={savedCount} className="bb-count bb-num">{savedCount}</span>}
      </a>
    );
  });
}

/* ------------------------------------------------------------ página */

// Botón EN/ES: cada opción con su nombre en su propio idioma.
const LANGS = [{ id: "en", name: "English" }, { id: "es", name: "Español" }];

export default function BrandBridge({ brands, countries, lang: defaultLang }) {
  // El idioma elegido se recuerda en este navegador; si no eligió, el de APP_LANG.
  const [lang, setLang] = useStored("bb-lang", defaultLang);
  const t = useMemo(() => getText(lang), [lang]);
  useEffect(() => { document.documentElement.lang = t.lang; }, [t.lang]);
  // Cuenta la visita (anónima, sin cookies) para las estadísticas privadas de /admin, una vez por pestaña.
  useEffect(() => {
    try {
      if (sessionStorage.getItem("bb-seen")) return;
      sessionStorage.setItem("bb-seen", "1");
    } catch {}
    const body = JSON.stringify({ ref: document.referrer });
    if (!navigator.sendBeacon?.("/api/track", body)) {
      fetch("/api/track", { method: "POST", body, keepalive: true }).catch(() => {});
    }
  }, []);
  const [view, setView] = useState("intro");
  const [selected, setSelected] = useState(null); // { brand, tab }
  const [showTerms, setShowTerms] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  const [country, setCountry] = useState(countries[0]);
  const [category, setCategory] = useState("All");
  const [tag, setTag] = useState("All");
  const [search, setSearch] = useState("");
  const [autoRun, setAutoRun] = useState(""); // empresa que el buscador pidió investigar ya
  const [saved, setSaved] = useStored("bb-watchlist", []);
  const [compare, setCompare] = useStored("bb-compare", []);
  const [profile, setProfile] = useStored("bb-profile", EMPTY_PROFILE);
  const [presenceAi, setPresenceAi] = useStored("bb-presence-v2", {}); // v2: ya no guarda lo que la IA adivinaba
  // Empresas investigadas con IA: solo las ve quien las buscó (se guardan en este navegador).
  const [researched, setResearched] = useStored("bb-researched", []);
  const gridRef = useRef(null);
  const boardRef = useRef(null);
  const searchRef = useRef(null);
  const openBrand = (brand, tab = "analysis") => setSelected({ brand, tab });

  const allBrands = useMemo(() => [...researched, ...brands], [researched, brands]);
  const byId = useMemo(() => Object.fromEntries(allBrands.map((b) => [b.id, b])), [allBrands]);
  const place = t.country(country);

  /* ---- vista según el #hash, para que el botón Atrás funcione ---- */
  useEffect(() => {
    const read = () => {
      const h = window.location.hash.replace("#", "");
      setView(VIEWS.includes(h) ? h : "intro");
    };
    read();
    window.addEventListener("hashchange", read);
    window.addEventListener("popstate", read);
    return () => {
      window.removeEventListener("hashchange", read);
      window.removeEventListener("popstate", read);
    };
  }, []);
  // El país objetivo del perfil pasa a ser el destino al cargar.
  const appliedTarget = useRef(false);
  useEffect(() => {
    if (appliedTarget.current || !profile.target) return;
    appliedTarget.current = true;
    if (countries.includes(profile.target)) setCountry(profile.target);
  }, [profile.target, countries]);

  const goTo = (v) => {
    if (v === view) return;
    window.history.pushState(null, "", v === "intro" ? window.location.pathname + window.location.search : `#${v}`);
    setView(v);
    window.scrollTo(0, 0);
  };

  /* ---- listas ---- */
  const scored = useMemo(
    () => brands.map((b) => ({ brand: b, score: scoreFor(b, country) })).sort((a, b) => b.score - a.score || a.brand.name.localeCompare(b.brand.name)),
    [brands, country]
  );
  // Catálogo + investigadas (la portada, el top 5 y las cifras usan solo el catálogo).
  const scoredAll = useMemo(
    () => [...researched.map((b) => ({ brand: b, score: scoreFor(b, country) })), ...scored].sort((a, b) => b.score - a.score || a.brand.name.localeCompare(b.brand.name)),
    [researched, scored, country]
  );
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return scoredAll
      .filter(({ brand: b }) => (category === "All" || b.category === category) && (tag === "All" || b.tag === tag))
      .filter(({ brand: b }) => !q || b.name.toLowerCase().includes(q) || b.category.toLowerCase().includes(q) || t.category(b.category).toLowerCase().includes(q) || t.description(b).toLowerCase().includes(q));
  }, [scoredAll, category, tag, search, t]);
  const savedList = useMemo(() => scoredAll.filter(({ brand }) => saved.includes(brand.id)), [scoredAll, saved]);
  const shown = view === "watchlist" ? savedList : filtered;
  const strongAll = scored.filter((s) => s.score >= 80).length;
  const avgScore = Math.round(scored.reduce((sum, s) => sum + s.score, 0) / Math.max(scored.length, 1));

  const catCounts = useMemo(() => {
    const counts = {};
    for (const b of brands) counts[b.category] = (counts[b.category] || 0) + 1;
    return counts;
  }, [brands]);

  const order = `${view}:${shown.map((f) => f.brand.id).join(",")}|${scored.slice(0, 5).map((f) => f.brand.id).join(",")}`;
  const captureFlip = useFlip([gridRef, boardRef], [order]);
  const withFlip = (fn) => (value) => { captureFlip(); fn(value); };

  /* ---- acciones ---- */
  const toggleSave = (id) => setSaved((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]));
  const toggleCompare = (id) => setCompare((list) => (list.includes(id) ? list.filter((x) => x !== id) : list.length >= 3 ? list : [...list, id]));
  const compareBrands = compare.map((id) => byId[id]).filter(Boolean);
  const compareItems = compareBrands.map((b) => ({ brand: b, score: scoreFor(b, country) }));

  const presenceFor = (brand) => {
    if (brand.markets.includes(country)) return { kind: "data", label: t.presenceData(place) };
    const found = checkedPresence(brand, country);
    if (found) return found.status === "retail" ? { kind: "data", label: t.presenceData(place) } : { kind: "resellers", label: t.presenceResellers(place) };
    const status = presenceAi[`${brand.id}|${country}`];
    if (status && t.presenceAi[status]) return { kind: status, label: t.presenceAi[status](place), ai: true };
    return null;
  };
  const rememberPresence = (brand, forCountry) => (status) =>
    setPresenceAi((m) => (m[`${brand.id}|${forCountry}`] === status ? m : { ...m, [`${brand.id}|${forCountry}`]: status }));

  const squash = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const query = search.trim();
  const canResearch = view === "discover" && query.length >= 2 && !allBrands.some((b) => squash(b.name) === squash(query));
  const runResearch = (q) => {
    captureFlip();
    setCategory("All");
    setTag("All");
    setSearch(q);
    setAutoRun(squash(q));
  };
  const onResearched = (brand, fromCatalog) => {
    if (!fromCatalog) setResearched((list) => [brand, ...list.filter((b) => b.id !== brand.id)].slice(0, 30));
    captureFlip();
    setCategory("All");
    setTag("All");
    setSearch(brand.name);
    openBrand(fromCatalog ? byId[brand.id] || brand : brand);
  };
  const removeResearched = (id) => {
    captureFlip();
    setResearched((list) => list.filter((b) => b.id !== id));
    setSaved((list) => list.filter((x) => x !== id));
    setCompare((list) => list.filter((x) => x !== id));
  };

  const saveProfile = (next) => {
    setProfile(next);
    if (next.target && next.target !== country) withFlip(setCountry)(next.target);
  };

  const hasFilters = category !== "All" || tag !== "All" || search.trim();
  const extraQuestion = profileQuestion(profile, t);
  const scrollToSearch = () => {
    document.getElementById("bb-search")?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
    setTimeout(() => searchRef.current?.focus({ preventScroll: true }), 450);
  };

  const grid = (list) => (
    <div className="bb-grid" ref={gridRef}>
      {list.map(({ brand, score }, i) => (
        <div key={brand.id} data-id={brand.id} className="bb-cell" style={{ "--d": `${Math.min(i, 10) * 40}ms` }}>
          <BrandCard brand={brand} score={score} country={country} onOpen={openBrand} index={i} t={t}
            saved={saved.includes(brand.id)} onToggleSave={toggleSave}
            comparing={compare.includes(brand.id)} compareFull={compare.length >= 3} onToggleCompare={toggleCompare}
            presence={presenceFor(brand)} mine={profile.sectors.includes(brand.category)}
            onRemove={brand.researched ? removeResearched : undefined} />
        </div>
      ))}
    </div>
  );

  return (
    <div className="bb-app" data-tray={compare.length > 0} data-view={view}>
      <div className="bb-announce">
        <p>{t.announce(brands.length, countries.length)}</p>
        <button type="button" onClick={() => openBrand(scored[0].brand)}>{t.announceLink}<PlayIcon size={8} /></button>
      </div>

      <header className="bb-header">
        <div className="bb-header-inner">
          <a className="bb-brand" href="#" onClick={(e) => { e.preventDefault(); goTo("intro"); }}>
            <LogoMark size={30} />
            <span className="bb-wordmark">BrandBridge</span>
          </a>
          <nav className="bb-nav" aria-label="BrandBridge">
            <NavItems view={view} onChange={goTo} savedCount={saved.length} t={t} className="bb-nav-link" />
          </nav>
          <div className="bb-header-actions">
            <div className="bb-lang" role="group" aria-label={t.language}>
              {LANGS.map((l) => (
                <button key={l.id} type="button" lang={l.id} aria-label={l.name} title={l.name} aria-pressed={t.lang === l.id} onClick={() => setLang(l.id)}>
                  {l.id.toUpperCase()}
                </button>
              ))}
            </div>
            {/* Aviso legal siempre visible: el análisis es de IA y no es asesoría financiera */}
            <button type="button" className="bb-legal-badge" onClick={() => setShowTerms(true)} aria-label={`${t.legalBadge} · ${t.termsTitle}`}>
              <ShieldIcon size={16} strokeWidth={2} />
              <span className="bb-legal-long">{t.legalBadge}</span>
              <span className="bb-legal-short" aria-hidden="true">{t.legalShort}</span>
            </button>
            <label className="bb-select-wrap">
              <span className="bb-sr">{t.destination}</span>
              <GlobeIcon size={16} className="bb-select-globe" />
              <select className="bb-select" value={country} onChange={(e) => withFlip(setCountry)(e.target.value)}>
                {countries.map((c) => <option key={c} value={c}>{t.country(c)}</option>)}
              </select>
              <ChevronDownIcon size={15} className="bb-select-chev" />
            </label>
          </div>
        </div>
      </header>

      {/* Franja para conocer al equipo, visible al entrar a la app */}
      {view !== "team" && (
        <a className="bb-teamstrip" href="#team" onClick={(e) => { e.preventDefault(); goTo("team"); }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/team/yonatan-danon-v3-avatar.webp" alt="" width={34} height={34} />
          <span className="bb-teamstrip-text">{t.teamStrip}</span>
          <span className="bb-teamstrip-link">{t.teamStripLink}<ArrowUpRightIcon size={15} strokeWidth={2.2} /></span>
        </a>
      )}

      <div key={view} className="bb-view">
        {view === "discover" && (
          <>
            <section className="bb-hero">
              <div className="bb-hero-inner">
                <div className="bb-hero-copy">
                  <h1>{t.heroTitle} <mark key={country} className="bb-hl">{place}</mark></h1>
                  <p>{t.heroSubtitle}</p>
                  <div className="bb-hero-ctas">
                    <button type="button" className="bb-btn bb-btn-mango bb-btn-lg" onClick={scrollToSearch}>{t.browse}<PlayIcon size={10} /></button>
                    <button type="button" className="bb-btn bb-btn-dark bb-btn-lg" onClick={() => openBrand(scored[0].brand)}>
                      <span className="bb-btn-trunc">{t.topPick}: {scored[0].brand.name}</span><PlayIcon size={10} />
                    </button>
                  </div>
                  <dl className="bb-hero-stats">
                    <div><dt>{t.statBrands}</dt><dd className="bb-num">{brands.length}</dd></div>
                    <div><dt>{t.statStrongShort(place)}</dt><dd key={country} className="bb-num bb-pop-in">{strongAll}</dd></div>
                    <div><dt>{t.statAvgShort}</dt><dd key={country} className="bb-num bb-pop-in">{avgScore}<small>/100</small></dd></div>
                  </dl>
                </div>
                <HeroBoard items={scored} country={country} onOpen={openBrand} onAsk={(b) => openBrand(b, "chat")} listRef={boardRef} t={t} />
              </div>
            </section>

            <main className="bb-main">
              <section className="bb-cats" aria-labelledby="bb-cats-title">
                <h2 id="bb-cats-title" className="bb-cats-title">{t.categoriesTitle}</h2>
                <div className="bb-cats-grid" role="group" aria-label={t.categoryLabel}>
                  {["All", ...CATEGORIES].map((cat) => (
                    <button key={cat} type="button" className="bb-cat" data-cat={cat} aria-pressed={category === cat} onClick={() => withFlip(setCategory)(cat)}>
                      <i aria-hidden="true" />
                      <span className="bb-cat-name">{cat === "All" ? t.all : t.category(cat)}</span>
                      <span className="bb-cat-count bb-num">{cat === "All" ? brands.length : catCounts[cat] || 0}</span>
                    </button>
                  ))}
                </div>
              </section>

              <section id="bb-search" className="bb-finder" aria-labelledby="bb-finder-title">
                <div className="bb-finder-head">
                  <h2 id="bb-finder-title">{t.searchTitle}</h2>
                  <p>{t.searchSub}</p>
                </div>
                <div className="bb-finder-row">
                  <div className="bb-search" role="search">
                    <SearchIcon size={20} />
                    <input ref={searchRef} type="search" value={search} onChange={(e) => { setAutoRun(""); withFlip(setSearch)(e.target.value); }}
                      onKeyDown={(e) => { if (e.key === "Enter" && canResearch) { e.preventDefault(); setAutoRun(squash(query)); } }}
                      placeholder={t.search} aria-label={t.search} autoComplete="off" enterKeyHint="search" />
                    {search && (
                      <button type="button" className="bb-search-clear" onClick={() => { setAutoRun(""); withFlip(setSearch)(""); }} aria-label={t.clearSearch}>
                        <CloseIcon size={18} />
                      </button>
                    )}
                  </div>
                  <div className="bb-segment" role="group" aria-label={t.momentumLabel}>
                    {["All", ...TAGS].map((tg) => (
                      <button key={tg} type="button" className="bb-seg" aria-pressed={tag === tg} onClick={() => withFlip(setTag)(tg)}>
                        {tg === "All" ? t.all : t.tag(tg)}
                      </button>
                    ))}
                  </div>
                </div>
                {!query && (
                  <div className="bb-search-try">
                    <span>{t.searchTry}</span>
                    {t.searchExamples.map((name) => (
                      <button key={name} type="button" className="bb-chip" onClick={() => runResearch(name)}>{name}</button>
                    ))}
                  </div>
                )}
              </section>

              {canResearch && <ResearchBox key={squash(query)} query={query} onFound={onResearched} autoRun={autoRun === squash(query)} t={t} />}

              <div className="bb-resultbar">
                <span aria-live="polite"><strong className="bb-num">{t.count(filtered.length)}</strong><span className="bb-estimates"><span className="bb-sep"> · </span>{t.estimatesNote}</span></span>
                <span className="bb-legend" aria-label={t.scoreTitle}>
                  <span><i className="bb-band-strong" />{t.strong}</span>
                  <span><i className="bb-band-moderate" />{t.moderate}</span>
                  <span><i className="bb-band-risky" />{t.risky}</span>
                </span>
              </div>

              {filtered.length === 0 ? (canResearch ? null : (
                <div className="bb-empty">
                  <div className="bb-empty-icon" aria-hidden="true"><SearchIcon size={30} /></div>
                  <h2>{t.noBrands}</h2>
                  <p>{t.noBrandsHint}</p>
                  {hasFilters && (
                    <button type="button" className="bb-btn bb-btn-dark" onClick={() => { captureFlip(); setCategory("All"); setTag("All"); setSearch(""); }}>
                      {t.clearFilters}
                    </button>
                  )}
                </div>
              )) : grid(filtered)}
            </main>
          </>
        )}

        {view === "watchlist" && (
          <>
            <PageHead title={t.watchTitle} sub={t.watchSub(place)} />
            <main className="bb-main bb-main-top">
              {savedList.length === 0 ? <WatchEmpty onDiscover={() => goTo("discover")} t={t} /> : grid(savedList)}
            </main>
          </>
        )}

        {view === "intro" && (
          <IntroView brands={brands} countries={countries} t={t} onTeam={() => goTo("team")}
            onStart={(c) => { if (c && c !== country) setCountry(c); goTo("discover"); }} />
        )}

        {view === "team" && <TeamView onDiscover={() => goTo("discover")} t={t} />}

        {view === "profile" && (
          <>
            <PageHead title={t.profileTitle} sub={t.profileSub} />
            <main className="bb-main bb-main-top">
              <ProfileView profile={profile} onSave={saveProfile} onClear={() => setProfile(EMPTY_PROFILE)} countries={countries} country={country}
                savedCount={saved.length} comparingCount={compare.length} t={t} />
            </main>
          </>
        )}
      </div>

      <footer className="bb-footer">
        <div className="bb-footer-inner">
          <a className="bb-brand bb-brand-foot" href="#" onClick={(e) => { e.preventDefault(); goTo("intro"); }}>
            <LogoMark size={26} /><span className="bb-wordmark">BrandBridge</span>
          </a>
          <p>{t.footer1}<br />{t.footer2}</p>
          <button type="button" className="bb-link" onClick={() => setShowTerms(true)}>{t.footerLink}</button>
        </div>
      </footer>

      <CompareTray brands={compareBrands} onRemove={toggleCompare} onClear={() => setCompare([])} onOpen={() => setShowCompare(true)} t={t} />

      <nav className="bb-tabbar" aria-label="BrandBridge">
        <NavItems view={view} onChange={goTo} savedCount={saved.length} t={t} className="bb-tabbar-link" />
      </nav>

      {selected && (
        <BrandSheet key={`${selected.brand.id}-${country}`} brand={selected.brand} initialTab={selected.tab} country={country} onClose={() => setSelected(null)} t={t}
          saved={saved.includes(selected.brand.id)} onToggleSave={() => toggleSave(selected.brand.id)}
          onPresence={rememberPresence(selected.brand, country)} extraQuestion={extraQuestion} />
      )}
      {showCompare && compareItems.length > 0 && (
        <CompareSheet items={compareItems} country={country} presenceFor={presenceFor} onOpen={openBrand}
          onRemove={toggleCompare} onClose={() => setShowCompare(false)} t={t} />
      )}
      {showTerms && <TermsSheet onClose={() => setShowTerms(false)} t={t} />}
    </div>
  );
}
