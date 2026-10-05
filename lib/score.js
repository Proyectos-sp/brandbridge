// Versión del cálculo de puntaje que también puede usar el navegador.
import countryModifiers from "@/data/countries.json";

export function scoreFor(brand, country) {
  const modifier = countryModifiers[country]?.[brand.category] ?? 0;
  return Math.min(99, Math.max(20, brand.baseScore + modifier));
}
