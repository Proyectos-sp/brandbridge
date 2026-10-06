"use client";

// Página de introducción: lo primero que se ve al entrar. Explica la app para toda
// Latinoamérica y lleva a la app con el botón "Bring a company to your country now".
import { useMemo } from "react";
import LOGOS from "@/data/logos.json";
import { scoreFor } from "@/lib/score";
import { ArrowUpRightIcon, PlayIcon } from "./icons";
import { bandFor } from "./Score";
import HeroMap from "./HeroMap";

function Marquee({ brands, reverse }) {
  // Se duplica la lista para que el desplazamiento sea continuo.
  const list = [...brands, ...brands];
  return (
    <div className="bb-marquee" aria-hidden="true">
      <div className="bb-marquee-track" data-reverse={reverse || undefined}>
        {list.map((b, i) => (
          <span key={`${b.id}-${i}`} className="bb-marquee-logo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={LOGOS[b.slug]} alt="" loading="lazy" />
          </span>
        ))}
      </div>
    </div>
  );
}

export default function IntroView({ brands, countries, onStart, onTeam, t }) {
  const intro = t.intro;
  const industries = new Set(brands.map((b) => b.category)).size;
  const half = Math.ceil(brands.length / 2);

  // La marca con mejor puntaje en cada país (dato real del cálculo).
  const tops = useMemo(() => countries.map((c) => {
    let best = null;
    for (const b of brands) {
      const s = scoreFor(b, c);
      if (!best || s > best.score) best = { brand: b, score: s };
    }
    return { country: c, ...best };
  }), [brands, countries]);

  const startCta = (
    <button type="button" className="bb-btn bb-btn-primary bb-btn-xl" onClick={() => onStart()}>
      {intro.cta}<PlayIcon size={12} />
    </button>
  );

  return (
    <>
      <section className="bb-intro-hero" aria-labelledby="bb-intro-title">
        <div className="bb-intro-hero-inner">
          <div className="bb-intro-copy">
          <h1 id="bb-intro-title">{intro.title} <mark className="bb-hl">{intro.titleHl}</mark></h1>
          <p className="bb-intro-sub">{intro.sub}</p>
          <div className="bb-intro-ctas">
            {startCta}
            <a className="bb-intro-how" href="#bb-how" onClick={(e) => {
              e.preventDefault();
              document.getElementById("bb-how")?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
            }}>{intro.how}</a>
          </div>
          <p className="bb-intro-facts">{intro.facts(brands.length, industries, countries.length)}</p>
          </div>
          <HeroMap brands={brands} onStart={onStart} t={t} />
        </div>
      </section>

      <section className="bb-intro-wall" aria-label={intro.wallLabel(brands.length)}>
        <Marquee brands={brands.slice(0, half)} />
        <Marquee brands={brands.slice(half)} reverse />
      </section>

      <div className="bb-main">
        <section className="bb-intro-latam" aria-labelledby="bb-latam-title">
          <div className="bb-intro-head">
            <h2 id="bb-latam-title">{intro.latamTitle}</h2>
            <p>{intro.latamText}</p>
          </div>
          <ul className="bb-intro-countries">
            {tops.map(({ country, brand, score }) => (
              <li key={country}>
                <button type="button" className="bb-country-card" onClick={() => onStart(country)}>
                  <span className="bb-country-name">{t.country(country)}</span>
                  <span className="bb-country-top">
                    <span><small>{intro.topIn}</small>{brand.name}</span>
                    <b className={`bb-num bb-band-${bandFor(score)}`}>{score}</b>
                  </span>
                  <ArrowUpRightIcon size={18} strokeWidth={2} />
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section id="bb-how" className="bb-intro-how-sec" aria-labelledby="bb-how-title">
        <div className="bb-intro-how-inner">
          <h2 id="bb-how-title">{intro.howTitle}</h2>
          <ol className="bb-intro-steps">
            {intro.steps.map(([title, text], i) => (
              <li key={title}>
                <span className="bb-step-num bb-num">{String(i + 1).padStart(2, "0")}</span>
                <h3>{title}</h3>
                <p>{text}</p>
              </li>
            ))}
          </ol>
          <p className="bb-intro-disclaimer">{intro.disclaimer}</p>
        </div>
      </section>

      <div className="bb-main">
        <section className="bb-intro-founder" aria-labelledby="bb-founder-title">
          <figure className="bb-intro-founder-photo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/team/yonatan-danon.webp" alt={t.team.photoAlt} width={1086} height={1448} loading="lazy" />
          </figure>
          <div>
            <h2 id="bb-founder-title">{intro.founderTitle}</h2>
            <p>{intro.founderText}</p>
            <button type="button" className="bb-btn bb-btn-dark bb-btn-lg" onClick={onTeam}>{t.teamStripLink}<ArrowUpRightIcon size={16} strokeWidth={2.2} /></button>
          </div>
        </section>
      </div>

      <section className="bb-intro-end" aria-labelledby="bb-end-title">
        <h2 id="bb-end-title">{intro.endTitle}</h2>
        <p>{intro.endText}</p>
        {startCta}
      </section>
    </>
  );
}
