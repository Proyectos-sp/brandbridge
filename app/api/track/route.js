// POST /api/track  { ref }   (lo manda el navegador una vez por pestaña, con sendBeacon)
// Cuenta una visita para las estadísticas privadas de /admin. No guarda datos personales
// (ver lib/stats.js). Las visitas de quien entró al panel no se cuentan.
import { after } from "next/server";
import { isAdmin } from "@/lib/admin";
import { visitRecorder } from "@/lib/stats";

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  if (!(await isAdmin())) {
    const record = visitRecorder(request, body);
    if (record) after(record);
  }
  return new Response(null, { status: 204 });
}
