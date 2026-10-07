// Página Team: el fundador, su historia y por qué existe BrandBridge.
import { PlayIcon } from "./icons";

export default function TeamView({ onDiscover, t }) {
  const team = t.team;
  return (
    <>
      <section className="bb-team-hero" aria-labelledby="bb-team-name">
        <div className="bb-team-hero-inner">
          <figure className="bb-team-photo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/team/yonatan-danon-2026.webp" alt={team.photoAlt} width={1086} height={1448} />
          </figure>
          <div className="bb-team-intro">
            <h1 id="bb-team-name">
              <span className="bb-team-role">{team.role}</span>
              <span className="bb-team-name">Yonatan Danon</span>
            </h1>
            <p className="bb-team-lead">{team.intro}</p>
          </div>
        </div>
      </section>

      <main className="bb-main">
        <section className="bb-team-about" aria-labelledby="bb-team-about-title">
          <h2 id="bb-team-about-title">{team.aboutTitle}</h2>
          <div className="bb-team-cols">
            <p className="bb-team-text">{team.about}</p>
            <div className="bb-team-why">
              <h3>{team.whyTitle}</h3>
              <p className="bb-team-text">{team.why}</p>
            </div>
          </div>
        </section>

        <figure className="bb-team-quote">
          <blockquote><p>{team.belief}</p></blockquote>
          <figcaption>Yonatan Danon · {team.role}</figcaption>
          <button type="button" className="bb-btn bb-btn-primary bb-btn-lg" onClick={onDiscover}>{team.cta}<PlayIcon size={10} /></button>
        </figure>
      </main>
    </>
  );
}
