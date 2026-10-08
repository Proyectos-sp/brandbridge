"use server";
// Entrar y salir del panel /admin.
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE, adminToken, passwordMatches } from "@/lib/admin";
import { getClientIp } from "@/lib/limits";
import { increment } from "@/lib/store";

const TRIES_PER_HOUR = 10;

export async function login(formData) {
  const ip = getClientIp({ headers: await headers() });
  const hour = new Date().toISOString().slice(0, 13);
  if ((await increment(`limit:admin:${ip}:${hour}`, 3600)) > TRIES_PER_HOUR) redirect("/admin?error=limit");
  if (!passwordMatches(formData.get("password"))) redirect("/admin?error=password");

  (await cookies()).set(ADMIN_COOKIE, adminToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 86400,
  });
  redirect("/admin");
}

export async function logout() {
  (await cookies()).delete(ADMIN_COOKIE);
  redirect("/admin");
}
