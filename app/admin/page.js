// Panel privado de estadísticas. Solo existe si está la variable ADMIN_PASSWORD y solo lo ve
// quien escribe esa contraseña. Muestra visitas (sin datos personales) y el uso de la app.
import Link from "next/link";
import { notFound } from "next/navigation";
import { adminEnabled, isAdmin } from "@/lib/admin";
import { readStats, dayKey, monthKey } from "@/lib/stats";
import { getValue, usingPersistentStore } from "@/lib/store";
import { LIMITS } from "@/lib/limits";
import { getText } from "@/lib/i18n";
import { login, logout } from "./actions";
import "./admin.css";

export const metadata = {
  title: "Estadísticas · BrandBridge",
  robots: { index: false, follow: false },
};

const es = getText("es");
const regions = new Intl.DisplayNames(["es"], { type: "region" });
const num = new Intl.NumberFormat("es");
const monthName = (m) => {
  const text = new Intl.DateTimeFormat("es", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${m}-15T12:00:00Z`));
  return text[0].toUpperCase() + text.slice(1);
};
const shortDay = (d) =>
  new Intl.DateTimeFormat("es", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${d}T12:00:00Z`));

function shiftMonth(m, delta) {
  const [y, mo] = m.split("-").map(Number);
  const d = new Date(Date.UTC(y, mo - 1 + delta, 15));
  return d.toISOString().slice(0, 7);
}

// Banderas de /public/flags (los 18 países de la app); los demás muestran su código.
const FLAG_FILES = new Set(["ar", "bo", "br", "cl", "co", "cr", "do", "ec", "gt", "hn", "mx", "ni", "pa", "pe", "py", "sv", "uy", "ve"]);
function Flag({ code }) {
  const file = code.toLowerCase();
  if (FLAG_FILES.has(file)) return <img className="adm-flag" src={`/flags/${file}.svg`} alt="" />;
  return <span className="adm-flag adm-flag-code" aria-hidden="true">{code === "??" ? "–" : code}</span>;
}
function countryName(code) {
  if (code === "??") return "Desconocido";
  try {
    return regions.of(code) || code;
  } catch {
    return code;
  }
}

const DEVICES = { mobile: "Celular", desktop: "Computador", tablet: "Tablet" };
const LABEL = {
  country: countryName,
  ref: (k) => (k === "direct" ? "Directo o enlace sin origen" : k),
  device: (k) => DEVICES[k] || k,
  brand: (k) => k,
  market: (k) => es.country(k),
  query: (k) => k,
};

function Login({ error }) {
  return (
    <main className="adm adm-login">
      <form action={login} className="adm-card adm-login-card">
        <p className="adm-eyebrow">BrandBridge</p>
        <h1>Estadísticas</h1>
        <p className="adm-muted">Panel privado. Escribe la contraseña para entrar.</p>
        <label className="adm-field">
          <span>Contraseña</span>
          <input type="password" name="password" autoComplete="current-password" required autoFocus />
        </label>
        {error && (
          <p className="adm-error" role="alert">
            {error === "limit" ? "Demasiados intentos. Espera una hora e inténtalo de nuevo." : "La contraseña no es correcta."}
          </p>
        )}
        <button type="submit" className="adm-btn">Entrar</button>
      </form>
    </main>
  );
}

function Kpi({ label, value, note }) {
  return (
    <div className="adm-kpi">
      <span className="adm-kpi-label">{label}</span>
      <span className="adm-kpi-value">{num.format(value || 0)}</span>
      {note && <span className="adm-kpi-note">{note}</span>}
    </div>
  );
}

function DailyChart({ daily }) {
  const max = Math.max(1, ...daily.map((d) => d.people));
  const total = daily.reduce((s, d) => s + d.people, 0);
  return (
    <section className="adm-card">
      <div className="adm-card-head">
        <h2>Personas por día</h2>
        <span className="adm-muted">últimos 30 días</span>
      </div>
      {total === 0 ? (
        <p className="adm-empty">Todavía no hay visitas registradas en estos días.</p>
      ) : (
        <>
          <div className="adm-chart" role="img" aria-label={`Personas por día en los últimos 30 días. Máximo: ${max}.`}>
            <span className="adm-chart-max">{num.format(max)}</span>
            {daily.map((d) => (
              <div key={d.day} className="adm-col" tabIndex={0}>
                <span className="adm-bar" style={{ height: `${(d.people / max) * 100}%` }} />
                <span className="adm-tip" role="tooltip">
                  <strong>{shortDay(d.day)}</strong>
                  <span>{num.format(d.people)} personas</span>
                  <span>{num.format(d.visits || 0)} visitas</span>
                  <span>{num.format(d.analyze || 0)} análisis · {num.format(d.chat || 0)} chats</span>
                </span>
              </div>
            ))}
          </div>
          <div className="adm-axis">
            <span>{shortDay(daily[0].day)}</span>
            <span>{shortDay(daily[14].day)}</span>
            <span>hoy</span>
          </div>
        </>
      )}
    </section>
  );
}

function Ranked({ title, note, rows, label, icon, limit = 8 }) {
  const top = rows.slice(0, limit);
  const rest = rows.slice(limit).reduce((s, [, v]) => s + v, 0);
  const max = Math.max(1, ...top.map(([, v]) => v));
  return (
    <section className="adm-card">
      <div className="adm-card-head">
        <h2>{title}</h2>
        {note && <span className="adm-muted">{note}</span>}
      </div>
      {top.length === 0 ? (
        <p className="adm-empty">Sin datos este mes.</p>
      ) : (
        <ol className="adm-rank">
          {top.map(([key, value]) => (
            <li key={key}>
              <span className="adm-rank-label" title={label(key)}>
                {icon && icon(key)}
                {label(key)}
              </span>
              <span className="adm-rank-value">{num.format(value)}</span>
              <span className="adm-rank-track" aria-hidden="true">
                <span style={{ width: `${(value / max) * 100}%` }} />
              </span>
            </li>
          ))}
          {rest > 0 && (
            <li className="adm-rank-rest">
              <span className="adm-rank-label">Otros ({rows.length - limit})</span>
              <span className="adm-rank-value">{num.format(rest)}</span>
            </li>
          )}
        </ol>
      )}
    </section>
  );
}

export default async function AdminPage({ searchParams }) {
  if (!adminEnabled()) notFound();
  const params = await searchParams;
  if (!(await isAdmin())) return <Login error={params?.error} />;

  const current = monthKey();
  const month = /^\d{4}-\d{2}$/.test(params?.mes || "") && params.mes <= current ? params.mes : current;
  const [stats, aiToday] = await Promise.all([
    readStats(month),
    getValue(`limit:global:${new Date().toISOString().slice(0, 10)}`),
  ]);
  const today = stats.daily[stats.daily.length - 1];
  const m = stats.month;
  const L = stats.lists;

  return (
    <main className="adm">
      <header className="adm-head">
        <div>
          <p className="adm-eyebrow">BrandBridge · Panel privado</p>
          <h1>Estadísticas</h1>
        </div>
        <form action={logout}>
          <button type="submit" className="adm-btn adm-btn-ghost">Salir</button>
        </form>
      </header>

      {!usingPersistentStore && (
        <p className="adm-warn">
          No hay base de datos conectada (Upstash Redis): los números se guardan solo en memoria y se pierden al reiniciar.
        </p>
      )}

      <section className="adm-today" aria-label="Hoy">
        <span className="adm-today-title">Hoy</span>
        <span><strong>{num.format(today.people)}</strong> personas</span>
        <span><strong>{num.format(today.visits || 0)}</strong> visitas</span>
        <span><strong>{num.format(today.analyze || 0)}</strong> análisis</span>
        <span>
          IA usada: <strong>{num.format(Number(aiToday) || 0)}</strong> de {num.format(LIMITS.daily)} consultas diarias
        </span>
      </section>

      <nav className="adm-month" aria-label="Mes">
        <Link href={`/admin?mes=${shiftMonth(month, -1)}`} className="adm-btn adm-btn-ghost" aria-label="Mes anterior">‹</Link>
        <h2>{monthName(month)}</h2>
        {month < current ? (
          <Link href={`/admin?mes=${shiftMonth(month, 1)}`} className="adm-btn adm-btn-ghost" aria-label="Mes siguiente">›</Link>
        ) : (
          <span className="adm-btn adm-btn-ghost" aria-hidden="true" data-disabled>›</span>
        )}
      </nav>

      <section className="adm-kpis">
        <Kpi label="Personas distintas" value={m.people} note="cada persona cuenta una vez en el mes" />
        <Kpi label="Visitas" value={m.visits} note="veces que abrieron la web" />
        <Kpi label="Análisis vistos" value={m.analyze} />
        <Kpi label="Mensajes de chat" value={m.chat} />
        <Kpi label="Empresas buscadas" value={m.research} />
      </section>

      <DailyChart daily={stats.daily} />

      <div className="adm-grid">
        <Ranked title="Desde dónde entran" note="país del visitante" rows={L.country} label={LABEL.country} icon={(k) => <Flag code={k} />} />
        <Ranked title="Cómo llegan" note="sitio de origen" rows={L.ref} label={LABEL.ref} />
        <Ranked title="Marcas más analizadas" rows={L.brand} label={LABEL.brand} limit={10} />
        <Ranked title="Países destino consultados" rows={L.market} label={LABEL.market} />
        <Ranked title="Empresas que buscaron" note="en el buscador" rows={L.query} label={LABEL.query} limit={12} />
        <Ranked title="Dispositivo" rows={L.device} label={LABEL.device} />
      </div>

      <p className="adm-foot">
        Datos anónimos: no se guardan IPs, nombres ni mensajes. Las visitas de quien entra a este panel no se cuentan.
        Los días se cortan a medianoche ({process.env.STATS_TIMEZONE || "America/Panama"}).
      </p>
    </main>
  );
}
