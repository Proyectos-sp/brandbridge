# BrandBridge — guía para Claude

App Next.js (App Router, JavaScript) publicada en Vercel desde la rama `main`. Cada push a `main` se publica solo.

## Qué es
Catálogo de 55 marcas de consumo con un puntaje de oportunidad por país, un análisis generado por IA y un chat para preguntar cómo traer la marca a un país de Latinoamérica.

## Rediseño: qué se puede cambiar
- `components/BrandBridge.js` — toda la interfaz (cabecera, filtros, tarjetas, ventana de análisis, chat, ventana legal).
- `app/globals.css` — estilos y animaciones.
- `app/layout.js` — tipografías, metadatos y favicon.
- `lib/i18n.js` — textos en inglés y español (se puede reescribir el copy, pero mantén las mismas claves o actualiza todos sus usos).
- Se pueden crear componentes nuevos en `components/` y dividir `BrandBridge.js` en varios archivos.

## No tocar sin una razón clara
- `app/api/analyze/route.js`, `app/api/chat/route.js` y `app/api/research/route.js` — rutas del servidor que llaman a la IA.
- `lib/ai.js`, `lib/prompts.js`, `lib/limits.js`, `lib/store.js`, `lib/research.js`, `lib/presence.js` — conexión con Gemini/Claude, instrucciones, límites de uso, caché, empresas investigadas y presencia en cada país.
- `data/brands.json`, `data/countries.json`, `data/logos.json`, `data/presence.json` — datos.
  `data/descriptions-es.json` (descripción en español de cada marca, por id) sí se puede editar; si se agrega una marca, agregar también su traducción.
- `lib/score.js`, `lib/data.js` — cálculo del puntaje.

## Reglas importantes
1. **La IA solo se llama desde el servidor.** La interfaz debe usar `POST /api/analyze`, `POST /api/chat` y `POST /api/research`. Nunca llamar a `api.anthropic.com` ni a Gemini desde el navegador (falla por CORS y expondría la API key).
2. **Contratos de las rutas:**
   - `POST /api/analyze` body `{ brandId, country, lang? }` → `{ analysis, cached }` o `{ error }`.
     `analysis` = `{ summary, marketFit, presence, revenue: { year1, year3, upfront, note }, competition, steps: string[], risk, verdict }`.
     `presence` = `{ status: "likely_present"|"resellers"|"not_found"|"unsure", source: "data"|"checked"|"research"|"web", sources?: [{ title, url }], checkedAt?, note? }`. **No la escribe la IA:** la arma `lib/presence.js` en cada respuesta (también sobre análisis guardados) a partir de `markets` de la marca, de `data/presence.json` y, con `GEMINI_SEARCH=true`, de una búsqueda en Google con fuentes. La interfaz arma el texto con `t.presenceNote` según `source` y `status`.
   - `data/presence.json`: revisión manual de tiendas y marketplaces de los 18 países para las 55 marcas. `retail` = la vende una tienda del país; `marketplace` = solo revendedores o importación (Mercado Libre, Amazon); si el país no aparece, no se encontró. "No se encontró" solo se muestra como `not_found` en los países revisados a fondo (`scripts/presence-coverage.json`, con fecha); en los demás queda `unsure`. Para actualizarla: editar `scripts/presence-findings.jsonl` (una línea por hallazgo, con enlaces) y `scripts/presence-coverage.json`, y correr `node scripts/build-presence.mjs AAAA-MM-DD`. `scripts/presence-scan/` revisa automáticamente los catálogos públicos (VTEX) de 42 tiendas de la región y algunas más (`node scan.mjs`, `node sites.mjs`, `node compile.mjs` dentro de esa carpeta generan líneas para el registro). Mercado Libre bloquea las consultas automáticas: se revisa con el buscador.
   - `POST /api/chat` body `{ brandId, country, lang?, messages: [{ role: "user"|"assistant", content }] }` → `{ reply }` o `{ error }`.
   - `POST /api/research` body `{ query, lang? }` → `{ brand, cached }` (ficha con el formato de `brands.json`, id `"r-..."`, más `researched`, `live`, `sources`, `scoreReason`), `{ brand, catalog: true }` si ya existe, `{ candidates: [{ name, note }] }` si el nombre es ambiguo, `{ notFound: true }` o `{ error }`.
   - `POST /api/track` body `{ ref }` → 204. Lo manda la interfaz una vez por pestaña (`sendBeacon`) para contar la visita.
   - Estadísticas privadas: `/admin` (solo existe con `ADMIN_PASSWORD`; entra quien escribe esa contraseña). `lib/stats.js` guarda en Redis solo totales por día y por mes (visitas, personas distintas con un código anónimo que cambia cada mes, país, origen, dispositivo, análisis por marca y país, chats y empresas buscadas). Nunca guardar IPs, mensajes del chat ni datos personales. Las rutas de IA registran su uso con `after(() => recordEvent(...))`.
   - `brandId` en analyze y chat puede ser el número de una marca del catálogo o el id `"r-..."` de una empresa investigada (su ficha vive en el servidor; el navegador nunca la manda).
   - Las empresas investigadas solo las ve quien las buscó (`localStorage` `bb-researched`). Modo gratuito (por defecto): la IA identifica la empresa y su sitio oficial, el servidor busca su artículo en Wikipedia y la IA lee esas páginas (URL context de Gemini); las páginas leídas quedan como `sources`. Con `GEMINI_SEARCH=true` (plan pagado) usa Google Search. Si no logra leer ninguna página, la ficha se arma con lo que la IA sabe y queda `live: false`.
   - Instagram de empresas investigadas: la IA lo inventa a veces, así que `verifyInstagram` (`lib/research.js`) solo lo deja si aparece enlazado en el sitio oficial o en Wikidata (P2003 de la entrada cuyo sitio oficial coincide); si no, se quita. Las fichas revisadas llevan `instagramChecked: true` y la interfaz oculta Instagram en las investigadas que no lo traen. Las cuentas del catálogo (`data/brands.json`) se comprobaron igual, contra el sitio oficial y Wikidata.
   - `lib/ai.js` recorre una cadena de modelos Gemini gratuitos (`GEMINI_MODEL`, `GEMINI_FALLBACK_MODEL`, `GEMINI_MODELS`): si uno agotó su cupo (429), está saturado (503) o no existe para la clave (404), pasa al siguiente.
   - `lang` (`"en"` o `"es"`): idioma del botón EN/ES de la cabecera (`localStorage` `bb-lang`; si no eligió, el de `APP_LANG`). El servidor escribe el análisis, el chat, las fichas investigadas y los errores en ese idioma, y los guarda en caché por idioma. Si no viene, usa `APP_LANG`.
   - Si la respuesta trae `error`, mostrar ese mensaje (ya viene en el idioma pedido) y ofrecer reintentar.
3. `country` debe ser uno de los nombres en inglés de `data/countries.json` (por ejemplo `"Panama"`, `"Dominican Republic"`); para mostrarlo usar `t.country(...)` de `lib/i18n.js`.
4. No volver a poner correos de contacto inventados: el contacto se limita a `website` e `instagram` de cada marca.
5. Mantener el aviso de que el análisis de IA es informativo y no es asesoría financiera, y el aviso de no escribir datos personales en el chat.
6. Debe funcionar bien en celular (desde 360 px de ancho) y en escritorio.
7. Antes de subir cambios: `npm run build` debe pasar sin errores.

## Comandos
```bash
npm install
npm run dev     # http://localhost:3000 (necesita GEMINI_API_KEY en .env.local para la IA)
npm run build
```

## Variables de entorno
Ver `.env.example`. En producción están en Vercel (Settings → Environment Variables). Nunca subir API keys al repositorio.
