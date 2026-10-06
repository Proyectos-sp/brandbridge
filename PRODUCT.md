# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Primary audience: people evaluating BrandBridge as a portfolio project (recruiters, instructors, peers). They open the live site, browse the catalog, open a brand or two, run an AI analysis and try the chat. The product still has to read as a credible tool for its in-fiction user: someone in Latin America looking for a foreign consumer brand to import or distribute in their country.

## Product Purpose
A catalog of 55 consumer brands, each with an opportunity score per Latin American country, an AI-generated market-entry analysis and a chat to ask how to bring the brand to that country. Success: a visitor understands the idea in seconds, gets to a real AI analysis without friction, and leaves with the impression of a polished, well-built product.

## Positioning
Pairs a deterministic per-country opportunity score (category adjustments per country) with a server-side AI analysis and chat scoped to one brand + one country.

## Operating Context
Deployed on Vercel from `main`; every push publishes. Production language is English (`APP_LANG` unset); Spanish exists in `lib/i18n.js` and must keep working. Visitors use both phones (from 360 px) and desktop.

## Capabilities and Constraints
- Next.js App Router, JavaScript, no UI libraries beyond React.
- AI is called only through `POST /api/analyze` and `POST /api/chat`; contracts are documented in CLAUDE.md.
- Countries are passed by English name; displayed via `t.country()`.
- First analysis per brand+country can take up to ~20 s; later ones are cached.
- Rate limits can return `error` strings already localized; UI must show them and offer retry.
- Brand data (revenue, growth, stage) are estimates from public sources.

## Brand Commitments
Only the name "BrandBridge" is binding. Colors, typography, theme and mark may change.

## Evidence on Hand
- `data/brands.json`: 55 brands with name, category, tag, origin, founded, revenue, growth, stage, description, accent color, website, Instagram.
- `data/logos.json`: SVG logos per brand slug.
No users, testimonials, partners or metrics exist; none may be invented. No contact emails; contact is website + Instagram only.

## Product Principles
1. Honest over hype: estimates are labeled as estimates; AI output is opinion, not advice.
2. One brand, one country: every analysis and chat is scoped to that pair.
3. Fast path to the AI: the analysis should be one tap away from any brand.
4. Never collect personal data; the chat warns against sharing it.

## Accessibility & Inclusion
Must work from 360 px wide; keyboard-operable dialogs; respect reduced motion.
