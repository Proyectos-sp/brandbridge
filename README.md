# BrandBridge

Descubre marcas internacionales para llevar a Latinoamérica. Cada marca tiene un puntaje de oportunidad por país, un análisis generado por IA y un chat para hacer preguntas sobre cómo importarla o distribuirla.

## Cómo funciona

```
Navegador ──► /api/analyze ──┐
          └─► /api/chat    ──┴──► lib/ai.js ──► Google Gemini (gratis)  o  Anthropic Claude
```

- **Dos proveedores de IA.** Por defecto usa Google Gemini, que tiene plan gratuito. Se puede cambiar a Claude con la variable `AI_PROVIDER`, sin tocar código. Si el modelo de Gemini llega a su límite gratuito, la app intenta automáticamente con un modelo de respaldo.
- **La API key nunca llega al navegador.** Las llamadas a la IA las hace el servidor (rutas en `app/api/`), que es lo que evita el error de CORS.
- **Los análisis se guardan.** Cada combinación marca + país se genera una sola vez; las siguientes visitas lo leen guardado, sin costo.
- **Hay límites de uso** por visitante y por día para proteger el crédito (`lib/limits.js`).
- **Las instrucciones de la IA se arman en el servidor** (`lib/prompts.js`), así la app solo responde sobre las marcas y su mercado.

## Estructura

| Carpeta / archivo | Qué contiene |
|---|---|
| `data/brands.json` | Las 55 marcas (datos de referencia, verificar antes de usar) |
| `data/countries.json` | Ajuste de puntaje por categoría para cada país |
| `lib/score.js` | Cálculo del puntaje de oportunidad |
| `lib/ai.js` | Conexión con la IA (Gemini o Claude) |
| `lib/prompts.js` | Instrucciones para el análisis y el chat |
| `lib/store.js` | Guardado de análisis y contadores (Upstash Redis o memoria) |
| `lib/limits.js` | Límites de uso |
| `app/api/analyze` | Ruta que genera o devuelve el análisis |
| `app/api/chat` | Ruta del chat |
| `components/BrandBridge.js` | Interfaz (mismo diseño del artefacto original) |
| `lib/i18n.js` | Textos en inglés y español |
| `data/logos.json` | Logos de las marcas |

## Publicar en Vercel

1. En Vercel: **Add New → Project**, importa este repositorio.
2. En **Settings → Environment Variables** agrega `GEMINI_API_KEY` con la key gratuita de [Google AI Studio](https://aistudio.google.com/apikey). (Para usar Claude: `AI_PROVIDER=claude` y `ANTHROPIC_API_KEY`.)
3. (Recomendado) En **Storage**, conecta **Upstash Redis** (plan gratuito) al proyecto. Así los análisis quedan guardados de forma permanente.
4. **Deploy.**

Las demás variables opcionales están explicadas en `.env.example`.

**Idioma:** la app está en inglés por defecto, igual que el diseño original. Para tenerla toda en español (interfaz y respuestas de la IA), agrega `APP_LANG=es` en Vercel y haz Redeploy.

## Probar en tu computador

```bash
npm install
cp .env.example .env.local   # y pega tu API key
npm run dev                  # abre http://localhost:3000
```

## Aviso

Los análisis son generados por IA con fines educativos y no son asesoría financiera. Las cifras de las marcas son aproximadas y deben verificarse.

En el plan gratuito de Gemini, Google puede usar el contenido de las consultas para mejorar sus productos. La app solo envía datos públicos de las marcas y las preguntas del chat, así que no se debe escribir información personal en el chat.
