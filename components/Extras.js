"use client";

// Vistas y piezas extra: comparación, marcas guardadas y perfil de distribuidor.
import { useEffect, useRef, useState } from "react";
import LOGOS from "@/data/logos.json";
import Sheet from "./Sheet";
import { ScoreBadge, bandFor } from "./Score";
import { CheckIcon, CloseIcon, CompareIcon, HeartIcon, LockIcon, PlayIcon } from "./icons";

export const SECTORS = ["Beverage", "Food", "Snacks", "Apparel", "Beauty", "Home", "Wellness", "Tech", "Pets"];
export const BUDGETS = ["lt25", "25to100", "100to500", "gt500"];
export const NETWORKS = ["supermarkets", "pharmacies", "convenience", "ecommerce", "gyms", "horeca", "department", "wholesale"];
export const EXPERIENCES = ["first", "some", "established"];
export const EMPTY_PROFILE = { sectors: [], budget: "", networks: [], experience: "", target: "" };

const Logo = ({ brand, className }) => (
  <span className={className}>
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={LOGOS[brand.slug]} alt="" />
  </span>
);

// Pregunta para el chat armada con el perfil (solo se envía si el usuario la toca).
export function profileQuestion(profile, t) {
  if (!profile || (!profile.budget && !profile.networks?.length && !profile.experience)) return null;
  return t.profileQuestion({
    budget: profile.budget ? t.budgets[profile.budget] : "",
    networks: (profile.networks || []).slice(0, 2).map((n) => t.networks[n]).join(", "),
    experience: profile.experience ? t.experiences[profile.experience] : "",
  });
}

/* ------------------------------------------------------------ comparación */

export function CompareTray({ brands, onRemove, onClear, onOpen, t }) {
  const count = brands.length;
  return (
    <div className="bb-tray" data-open={count > 0} aria-hidden={count === 0} role="region" aria-label={t.compareTitle}>
      <div className="bb-tray-inner">
        <ul className="bb-tray-list">
          {brands.map((b) => (
            <li key={b.id}>
              <Logo brand={b} className="bb-tray-logo" />
              <span className="bb-tray-name">{b.name}</span>
              <button type="button" className="bb-tray-x" onClick={() => onRemove(b.id)} aria-label={t.removeCompare(b.name)} tabIndex={count ? 0 : -1}>
                <CloseIcon size={14} strokeWidth={2.2} />
              </button>
            </li>
          ))}
        </ul>
        <span className="bb-tray-hint">{t.compareHint(count)}</span>
        <div className="bb-tray-actions">
          <button type="button" className="bb-ghost-dark" onClick={onClear} tabIndex={count ? 0 : -1}>{t.clear}</button>
          <button type="button" className="bb-btn bb-btn-primary" onClick={onOpen} disabled={count < 2} tabIndex={count ? 0 : -1}>
            <CompareIcon size={17} />{t.compareN(count)}
          </button>
        </div>
      </div>
    </div>
  );
}

export function CompareSheet({ items, country, presenceFor, onOpen, onRemove, onClose, t }) {
  const place = t.country(country);
  const rows = [
    [t.rows.score, ({ score }) => {
      const band = bandFor(score);
      return <ScoreBadge score={score} band={band} label={t.bands[band]} size="lg" />;
    }],
    [t.categoryLabel, ({ brand }) => t.category(brand.category)],
    [t.rows.origin, ({ brand }) => t.country(brand.origin)],
    [t.rows.founded, ({ brand }) => brand.founded],
    [t.revenue, ({ brand }) => <b className="bb-num">{brand.revenue}</b>],
    [t.growth, ({ brand }) => <b className={`bb-num ${brand.growth.trim().startsWith("-") ? "bb-down" : ""}`}>{brand.growth}</b>],
    [t.stage, ({ brand }) => brand.stage],
    [t.rows.employees, ({ brand }) => <span className="bb-num">{brand.employees}</span>],
    [t.rows.momentum, ({ brand }) => t.tag(brand.tag)],
    [t.rows.markets, ({ brand }) => brand.markets.map((m) => t.country(m)).join(", ")],
    [t.rows.presence, ({ brand }) => presenceFor(brand)?.label || "—"],
  ];
  const best = Math.max(...items.map((i) => i.score));

  return (
    <Sheet label={t.compareTitle} onClose={onClose} width={980}>
      {(close) => (
        <>
          <header className="bb-legal-head" data-sheet-handle>
            <span className="bb-grabber bb-grabber-dark" aria-hidden="true" />
            <div>
              <h2>{t.compareTitle}</h2>
              <p className="bb-cmp-sub">{t.compareFor(place)} · {t.estimatesNote}</p>
            </div>
            <button className="bb-close bb-close-dark" onClick={close} aria-label={t.close}><CloseIcon size={20} /></button>
          </header>
          <div className="bb-sheet-scroll">
            <div className="bb-panel">
              <div className="bb-cmp-wrap">
                <table className="bb-cmp" style={{ "--cols": items.length }}>
                  <thead>
                    <tr>
                      <th scope="col"><span className="bb-sr">{t.compareTitle}</span></th>
                      {items.map(({ brand, score }) => (
                        <th key={brand.id} scope="col" data-best={score === best}>
                          <div className="bb-cmp-head">
                            <Logo brand={brand} className="bb-cmp-logo" />
                            <span className="bb-cmp-name">{brand.name}</span>
                            <button type="button" className="bb-cmp-x" onClick={() => onRemove(brand.id)} aria-label={t.removeCompare(brand.name)}>
                              <CloseIcon size={15} strokeWidth={2.2} />
                            </button>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(([label, render]) => (
                      <tr key={label}>
                        <th scope="row">{label}</th>
                        {items.map((item) => <td key={item.brand.id} data-best={item.score === best}>{render(item)}</td>)}
                      </tr>
                    ))}
                    <tr className="bb-cmp-actions">
                      <th scope="row"><span className="bb-sr">{t.analyze}</span></th>
                      {items.map(({ brand }) => (
                        <td key={brand.id}>
                          <button type="button" className="bb-btn bb-btn-secondary" onClick={() => { close(); setTimeout(() => onOpen(brand), 240); }}>
                            {t.analyze}<PlayIcon size={9} />
                          </button>
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </Sheet>
  );
}

/* ------------------------------------------------------------ cabecera de vista */

export function PageHead({ title, sub }) {
  return (
    <section className="bb-pagehead">
      <div className="bb-pagehead-inner">
        <h1>{title}</h1>
        {sub && <p>{sub}</p>}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------ guardadas */

export function WatchEmpty({ onDiscover, t }) {
  return (
    <div className="bb-empty">
      <div className="bb-empty-heart" aria-hidden="true"><HeartIcon size={34} strokeWidth={1.6} /></div>
      <h2>{t.watchEmptyTitle}</h2>
      <p>{t.watchEmptyText}</p>
      <button type="button" className="bb-btn bb-btn-primary" onClick={onDiscover}>{t.goDiscover}<PlayIcon size={10} /></button>
    </div>
  );
}

/* ------------------------------------------------------------ perfil */

function ChipChoice({ options, value, onToggle, label }) {
  return (
    <div className="bb-choice" role="group" aria-label={label}>
      {options.map(([id, text]) => (
        <button key={id} type="button" className="bb-chip" aria-pressed={value.includes(id)} onClick={() => onToggle(id)}>
          {value.includes(id) && <CheckIcon size={15} strokeWidth={2.4} />}{text}
        </button>
      ))}
    </div>
  );
}

export function ProfileView({ profile, onSave, onClear, countries, country, savedCount, comparingCount, t }) {
  const [draft, setDraft] = useState(profile);
  const [saved, setSaved] = useState(false);
  const timer = useRef(null);

  useEffect(() => { setDraft(profile); }, [profile]);
  useEffect(() => () => clearTimeout(timer.current), []);

  const toggle = (field) => (id) => setDraft((d) => ({ ...d, [field]: d[field].includes(id) ? d[field].filter((x) => x !== id) : [...d[field], id] }));
  const set = (field) => (e) => setDraft((d) => ({ ...d, [field]: e.target.value }));

  const submit = (e) => {
    e.preventDefault();
    onSave(draft);
    setSaved(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setSaved(false), 1800);
  };

  return (
    <div className="bb-profile">
      <form className="bb-form" onSubmit={submit}>
        <fieldset>
          <legend>{t.fields.sectors}</legend>
          <ChipChoice label={t.fields.sectors} options={SECTORS.map((s) => [s, t.category(s)])} value={draft.sectors} onToggle={toggle("sectors")} />
        </fieldset>
        <fieldset>
          <legend>{t.fields.network}</legend>
          <ChipChoice label={t.fields.network} options={NETWORKS.map((n) => [n, t.networks[n]])} value={draft.networks} onToggle={toggle("networks")} />
        </fieldset>
        <div className="bb-form-row">
          <label className="bb-field">
            <span>{t.fields.budget}</span>
            <select value={draft.budget} onChange={set("budget")}>
              <option value="">{t.choose}</option>
              {BUDGETS.map((b) => <option key={b} value={b}>{t.budgets[b]}</option>)}
            </select>
          </label>
          <label className="bb-field">
            <span>{t.fields.experience}</span>
            <select value={draft.experience} onChange={set("experience")}>
              <option value="">{t.choose}</option>
              {EXPERIENCES.map((x) => <option key={x} value={x}>{t.experiences[x]}</option>)}
            </select>
          </label>
          <label className="bb-field">
            <span>{t.fields.target}</span>
            <select value={draft.target || country} onChange={set("target")}>
              {countries.map((c) => <option key={c} value={c}>{t.country(c)}</option>)}
            </select>
          </label>
        </div>
        <div className="bb-form-foot">
          <button type="submit" className="bb-btn bb-btn-primary bb-save" data-saved={saved}>
            <span className="bb-save-a">{t.saveProfile}</span>
            <span className="bb-save-b" aria-hidden={!saved}><CheckIcon size={17} strokeWidth={2.4} />{t.profileSaved}</span>
          </button>
          <button type="button" className="bb-btn bb-btn-secondary" onClick={onClear}>
            {t.clearProfile}
          </button>
          <span className="bb-sr" role="status">{saved ? t.profileSaved : ""}</span>
        </div>
        <p className="bb-privacy bb-privacy-left"><LockIcon size={15} />{t.profileLocal}</p>
      </form>

      <aside className="bb-activity" aria-labelledby="bb-activity-title">
        <h2 id="bb-activity-title">{t.activity}</h2>
        <dl>
          <div><dt>{t.statSaved}</dt><dd className="bb-num">{savedCount}</dd></div>
          <div><dt>{t.statComparing}</dt><dd className="bb-num">{comparingCount}</dd></div>
          <div><dt>{t.statTarget}</dt><dd>{t.country(profile.target || country)}</dd></div>
          <div><dt>{t.fields.sectors}</dt><dd className="bb-dd-small">{profile.sectors.length ? profile.sectors.map((s) => t.category(s)).join(", ") : t.notSet}</dd></div>
        </dl>
      </aside>
    </div>
  );
}
