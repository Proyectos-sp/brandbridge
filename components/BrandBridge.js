"use client";

// Interfaz de BrandBridge, inspirada en teak.io: papel cuadriculado, tarjetas de interfaz reales
// flotando, el destino resaltado y un color por categoría. La IA se pide al servidor (/api/analyze y /api/chat).
import { useEffect, useMemo, useRef, useState } from "react";
import LOGOS from "@/data/logos.json";
import { scoreFor } from "@/lib/score";
import { getText } from "@/lib/i18n";
import BrandSheet, { TermsSheet } from "./BrandSheet";
import HeroBoard from "./HeroBoard";
import { ScoreBadge, bandFor } from "./Score";
import { CheckIcon, ChevronDownIcon, CloseIcon, CompassIcon, GlobeIcon, HeartIcon, LogoMark, PlayIcon, PlusIcon, SearchIcon, UserIcon } from "./icons";
import { CompareSheet, CompareTray, EMPTY_PROFILE, PageHead, ProfileView, WatchEmpty, profileQuestion } from "./Extras";
import useFlip from "./useFlip";
import useStored from "./useStored";

const TAGS = ["Trending", "Rising", "Established", "Emerging"];
const CATEGORIES = ["Beverage", "Food", "Snacks", "Apparel", "Beauty", "Home", "Wellness", "Tech", "Pets"];

/* ------------------------------------------------------------ tarjeta de marca */

function BrandCard({ brand, score, country, onOpen, index, t, saved, onToggleSave, comparing, compareFull, onToggleCompare, presence, mine }) {
  const band = bandFor(score);
  const growthDown = brand.growth.trim().startsWith("-");
  return (
    <article className="bb-card" data-saved={saved} data-cat={brand.category}>
      <div className="bb-card-media">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={LOGOS[brand.slug]} alt="" loading={index < 8 ? "eager" : "lazy"} />
      </div>
      <div className="bb-card-body">
        <div className="bb-card-head">
          <div className="bb-card-titles">
            <h3>{brand.name}</h3>
            <span className="bb-card-meta">
              <span className="bb-catlabel" data-cat={brand.category}><i />{t.category(brand.category)}</span>
              <span>{t.country(brand.origin)}</span>
              {mine && <span className="bb-mine">{t.yourSector}</span>}
            </span>
          </div>
          <span key={country} className="bb-pop-in"><ScoreBadge score={score} band={band} label={t.bands[band]} /></span>
        </div>
        {presence && (
          <span className={`bb-presence-chip bb-pres-${presence.kind}`}>
            <i />{presence.label}{presence.ai && <small>{t.aiTag}</small>}
          </span>
        )}
        <p className="bb-card-desc">{brand.description}</p>
        <div className="bb-facts">
          <span><small>{t.revenue}</small><b>{brand.revenue}</b></span>
          <span><small>{t.growth}</small><b className={growthDown ? "bb-down" : undefined}>{brand.growth}</b></span>
          <span><small>{t.stage}</small><b>{brand.stage}</b></span>
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
      </div>
    </article>
  );
}

/* ------------------------------------------------------------ navegación */

const VIEWS = ["discover", "watchlist", "profile"];
const VIEW_ICONS = { discover: CompassIcon, watchlist: HeartIcon, profile: UserIcon };

function NavItems({ view, onChange, savedCount, t, className }) {
  return VIEWS.map((v) => {
    const Icon = VIEW_ICONS[v];
    return (
      <a key={v} href={v === "discover" ? "#" : `#${v}`} className={className} aria-current={view === v ? "page" : undefined}
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

export default function BrandBridge({ brands, countries, lang }) {
  const t = useMemo(() => getText(lang), [lang]);
  const [view, setView] = useState("discover");
  const [selected, setSelected] = useState(null); // { brand, tab }
  const [showTerms, setShowTerms] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  const [country, setCountry] = useState(countries[0]);
  const [category, setCategory] = useState("All");
  const [tag, setTag] = useState("All");
  const [search, setSearch] = useState("");
  const [saved, setSaved] = useStored("bb-watchlist", []);
  const [compare, setCompare] = useStored("bb-compare", []);
  const [profile, setProfile] = useStored("bb-profile", EMPTY_PROFILE);
  const [presenceAi, setPresenceAi] = useStored("bb-presence", {});
  const gridRef = useRef(null);
  const boardRef = useRef(null);
  const searchRef = useRef(null);
  const openBrand = (brand, tab = "analysis") => setSelected({ brand, tab });

  const byId = useMemo(() => Object.fromEntries(brands.map((b) => [b.id, b])), [brands]);
  const place = t.country(country);

  /* ---- vista según el #hash, para que el botón Atrás funcione ---- */
  useEffect(() => {
    const read = () => {
      const h = window.location.hash.replace("#", "");
      setView(VIEWS.includes(h) ? h : "discover");
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
    window.history.pushState(null, "", v === "discover" ? window.location.pathname + window.location.search : `#${v}`);
    setView(v);
    window.scrollTo(0, 0);
  };

  /* ---- listas ---- */
  const scored = useMemo(
    () => brands.map((b) => ({ brand: b, score: scoreFor(b, country) })).sort((a, b) => b.score - a.score || a.brand.name.localeCompare(b.brand.name)),
    [brands, country]
  );
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return scored
      .filter(({ brand: b }) => (category === "All" || b.category === category) && (tag === "All" || b.tag === tag))
      .filter(({ brand: b }) => !q || b.name.toLowerCase().includes(q) || b.category.toLowerCase().includes(q) || t.category(b.category).toLowerCase().includes(q) || b.description.toLowerCase().includes(q));
  }, [scored, category, tag, search, t]);
  const savedList = useMemo(() => scored.filter(({ brand }) => saved.includes(brand.id)), [scored, saved]);
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
    const status = presenceAi[`${brand.id}|${country}`];
    if (status && t.presenceAi[status]) return { kind: status, label: t.presenceAi[status](place), ai: true };
    return null;
  };
  const rememberPresence = (brand, forCountry) => (status) =>
    setPresenceAi((m) => (m[`${brand.id}|${forCountry}`] === status ? m : { ...m, [`${brand.id}|${forCountry}`]: status }));

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
            presence={presenceFor(brand)} mine={profile.sectors.includes(brand.category)} />
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
          <a className="bb-brand" href="#" onClick={(e) => { e.preventDefault(); goTo("discover"); }}>
            <LogoMark size={30} />
            <span className="bb-wordmark">BrandBridge</span>
          </a>
          <nav className="bb-nav" aria-label="BrandBridge">
            <NavItems view={view} onChange={goTo} savedCount={saved.length} t={t} className="bb-nav-link" />
          </nav>
          <div className="bb-header-actions">
            <button type="button" className="bb-ghost bb-hide-md" onClick={() => setShowTerms(true)}>{t.legal}</button>
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
                    <input ref={searchRef} type="search" value={search} onChange={(e) => withFlip(setSearch)(e.target.value)} placeholder={t.search} aria-label={t.search} autoComplete="off" enterKeyHint="search" />
                    {search && (
                      <button type="button" className="bb-search-clear" onClick={() => withFlip(setSearch)("")} aria-label={t.clearSearch}>
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
              </section>

              <div className="bb-resultbar">
                <span aria-live="polite"><strong className="bb-num">{t.count(filtered.length)}</strong><span className="bb-estimates"><span className="bb-sep"> · </span>{t.estimatesNote}</span></span>
                <span className="bb-legend" aria-label={t.scoreTitle}>
                  <span><i className="bb-band-strong" />{t.strong}</span>
                  <span><i className="bb-band-moderate" />{t.moderate}</span>
                  <span><i className="bb-band-risky" />{t.risky}</span>
                </span>
              </div>

              {filtered.length === 0 ? (
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
              ) : grid(filtered)}
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
          <a className="bb-brand bb-brand-foot" href="#" onClick={(e) => { e.preventDefault(); goTo("discover"); }}>
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
