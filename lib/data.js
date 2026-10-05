// Datos de la app: marcas, países y cálculo del puntaje de oportunidad.
import brands from "@/data/brands.json";
import countryModifiers from "@/data/countries.json";
import { scoreFor } from "@/lib/score";

export const BRANDS = brands;
export const COUNTRIES = Object.keys(countryModifiers);
export const CATEGORIES = ["Beverage", "Food", "Snacks", "Apparel", "Beauty", "Home", "Wellness", "Tech", "Pets"];

export function getBrand(id) {
  return BRANDS.find((b) => b.id === Number(id)) || null;
}

export function isValidCountry(country) {
  return COUNTRIES.includes(country);
}

// Puntaje = puntaje base de la marca + ajuste según la categoría en ese país (entre 20 y 99).
export const getScore = scoreFor;

export function scoreLevel(score) {
  if (score >= 80) return "strong";
  if (score >= 60) return "moderate";
  return "risky";
}
