// Acceso al panel privado /admin. La contraseña es la variable ADMIN_PASSWORD (en Vercel);
// sin ella el panel no existe. Al entrar se guarda una cookie con un hash de la contraseña:
// si se cambia ADMIN_PASSWORD, todas las sesiones abiertas se cierran.
import { createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "bb-admin";

export const adminEnabled = () => Boolean(process.env.ADMIN_PASSWORD);

const hash = (text) => createHash("sha256").update(text).digest();

export const adminToken = () => hash(`bb-admin|${process.env.ADMIN_PASSWORD}`).toString("hex");

export function passwordMatches(input) {
  if (!adminEnabled()) return false;
  return timingSafeEqual(hash(String(input ?? "")), hash(process.env.ADMIN_PASSWORD));
}

export async function isAdmin() {
  if (!adminEnabled()) return false;
  const value = (await cookies()).get(ADMIN_COOKIE)?.value || "";
  const expected = adminToken();
  return value.length === expected.length && timingSafeEqual(Buffer.from(value), Buffer.from(expected));
}
