# BrandBridge

Descubre marcas internacionales para llevar a Latinoamérica. Cada marca tiene un puntaje de oportunidad por país, un análisis generado por IA y un chat para hacer preguntas sobre cómo importarla o distribuirla.

## Cómo funciona

```
Navegador ──► /api/analyze ──► Claude (Haiku 4.5)
          └─► /api/chat    ──► Claude (Haiku 4.5)
```

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
| `lib/claude.js` | Conexión con la API de Claude |
| `lib/prompts.js` | Instrucciones para el análisis y el chat |
| `lib/store.js` | Guardado de análisis y contadores (Upstash Redis o memoria) |
| `lib/limits.js` | Límites de uso |
| `app/api/analyze` | Ruta que genera o devuelve el análisis |
| `app/api/chat` | Ruta del chat |
| `components/` | Interfaz |

## Publicar en Vercel

1. En Vercel: **Add New → Project**, importa este repositorio.
2. En **Settings → Environment Variables** agrega `ANTHROPIC_API_KEY` con la key de console.anthropic.com.
3. (Recomendado) En **Storage**, conecta **Upstash Redis** (plan gratuito) al proyecto. Así los análisis quedan guardados de forma permanente.
4. **Deploy.**

Las demás variables opcionales están explicadas en `.env.example`.

## Probar en tu computador

```bash
npm install
cp .env.example .env.local   # y pega tu API key
npm run dev                  # abre http://localhost:3000
```

## Aviso

Los análisis son generados por IA con fines educativos y no son asesoría financiera. Las cifras de las marcas son aproximadas y deben verificarse.
