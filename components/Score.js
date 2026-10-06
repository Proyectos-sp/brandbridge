// Puntaje de oportunidad: píldora pastel con el número y el rango (fuerte, moderada, riesgosa).

export const bandFor = (score) => (score >= 80 ? "strong" : score >= 60 ? "moderate" : "risky");

export function ScoreBadge({ score, band, label, size = "md" }) {
  return (
    <span className={`bb-score bb-score-${size} bb-band-${band}`} aria-label={`${score}/100, ${label}`}>
      <b className="bb-num">{score}</b>
      <small>{label}</small>
    </span>
  );
}
