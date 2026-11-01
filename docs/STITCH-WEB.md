# Web + add-on redesign from Stitch (Tactile A dark / B light)

> TL;DR: 16 Stitch designs, one per page type (web + add-on + media/OG), mapped to their generators; port with tactile.css + tokens after #185/#177 merge, one PR per surface with owner-approved before/after sheet.
> Đọc khi: đổi giao diện bất kỳ trang tĩnh, blog, công cụ, trang uy tín, add-on hoặc ảnh OG.

Source: Stitch project "Lexkite English Exam Prep" (7268539912208977707), design system `assets/6aac787688a9449d9f98ac137f34491f`.
One Stitch screen per page TYPE (28/10). PNG/HTML are references only: never paste Stitch Tailwind; rebuild with
`web/css/tactile.css` (`.tk-card/.tk-tile/.tk-btn/.tk-chip/.tk-bar/.tk-num/.tk-display`, PR #185) + palette tokens (PR #177, `brand/tokens.json`).
Shared tokens/components: [DESIGN-SYSTEM.md §0, §5b](DESIGN-SYSTEM.md). Stitch quota: ~400 credits/day/account → infra key `stitch`.

## Page types → generator → Stitch screen
| # | Type | Generator (one place to change) | Stitch screen id |
|---|---|---|---|
| 1 | Landing `/`, `/<lang>/` | scripts/build-landing.mjs + site-layout.mjs header/footer | 9e73bcb0… |
| 2 | Blog index / category / tag | scripts/build-blog.mjs | 677e58f6… |
| 3 | Blog post | scripts/build-blog.mjs | 9e30b3c0… |
| 4 | Word page `/<lang>/words/*` + Worker long tail | build-seo-pages.mjs, scripts/dict/build.mjs (shell.json) | 079d0fe0… |
| 5 | Conversation `/<lang>/conversations/*` | build-seo-pages.mjs | dfbdd1fc… |
| 6 | CEFR test + TOEIC Part 5 quiz | build-tools.mjs + web/js/tools/*.js | 8fdda943… |
| 7 | CEFR level page / result | build-tools.mjs | 63ca9de9… |
| 8 | About / editorial team / policy / corrections / sources | build-authority.mjs | 8ca640eb… |
| 9 | Research dataset | build-authority.mjs | c3ad6662… |
| 10 | Embed page + `/embed/pair/` iframe + CEFR badges | build-authority.mjs | 85ee5a07… |
| 11 | Legal, credits, schools | build-legal.mjs, web/credits.html, web/schools.html | f5f3094b… |
| 12 | 404, blog-lang stub, bye (uninstall) | web/404.html, web/blog-lang.html, web/bye.html | 35818fea… |
| 13 | Add-on popup | extension/popup.{html,css,js} | ea3461c0… |
| 14 | Add-on bubble + Alt+L lookup + translate pill | extension/content.js (shadow DOM) | be05a167… |
| 15 | Add-on new tab | extension/newtab.{html,css,js} | 386b32b7… |
| 16 | Video facade + OG images | scripts/lib/video-web.mjs, OG renderer | 493a4c6e… |
| 1B | Light (Bright Day) reference | landing only; other types derive light from tokens | 4545ec49… |

## Rules for the port (all types)
- Keep 100 %: titles, canonical, hreflang, JSON-LD, breadcrumbs, 15 languages, every section and link (no cuts).
- Use REAL content only. Stitch invented stats, people, credentials ("1.42M submissions", "former IELTS examiner",
  extra nav items, a stray "DRIVE" logo on #3/#4) → ignore; data comes from content/** as today.
- Characters: Stitch drew generic people (#16 facade, avatars). Use only Ama/Carlos, ONE host style per surface
  (all 3D, or all 2D green-screen bank), never mixed, no cut/paste composites; new assets only via CREDIT-RULES.md.
  No real publisher names/logos in mockups (BBC, Economist…); article mockups use neutral placeholder text.
- One header/footer for all static pages (site-layout.mjs `siteHeader`/`siteFooter`): wordmark, Words · Tools · Blog,
  language globe, "Add to Chrome" ghost + "Start free" CTA. Stitch headers differ per screen → unify.
- Light (B) = `prefers-color-scheme: light` default, dark (A) = dark; both from tokens, AA contrast (brand-check).
- Budgets unchanged: landing ≤ 16 KB gzip (≈145 B headroom → purge + share CSS, no new font request beyond
  `display=optional`), CWV gates (LCP/CLS/TBT), size-budget, ux-guard / layout-scan at 360/390/1366.
- Add-on: content.js styles stay inside its shadow root; no new permissions (permissions.lock), bump version,
  docs/CWS-RULES.md; after merge sync ~/lexkite-ext-live.

## Order (one PR per surface, owner approves before/after sheet first)
Blocked until PR #185 (tactile.css) + #177 (palette) merge. Then: 1 shared header/footer + tokens in site-layout
→ 2–3 blog → 4–5 SEO pages → 6–7 tools → 8–12 authority/legal/utility → 13–15 add-on → 16 media/OG.
Each PR: CI before/after sheet (ux-shots) → spot-check 2–3 shots → owner OK → merge.
