# Lexkite design system (web app /app/ + add-on extension/app)

One design language. Every UI change follows this page. Rule: quality only goes up. Never remove features or content.
Sources: tokens in `web/css/style.css` `:root`, brand colours in `docs/BRAND-RULES.md` and `web/js/kit.js`, icons from `scripts/build-icons.mjs`.

## 1. Icons: ONE family, Lucide (ISC)
- Licence: ISC, © Lucide Contributors; parts © Cole Bemis (Feather, MIT). Credited on `/credits` (`content/legal/{en,vi}/credits.html`).
- Why Lucide: rounded caps and joins on a 24 px grid fit the soft Kit and kite shapes. It is stroke-based, so it follows `currentColor` in light and dark mode. The paths are tiny (38 icons ≈ 2.6 KB gz inline; settings-only icons are added by settings.js via `UI.addIcons`). Phosphor duotone was about 3× larger per icon.
- The sprite holds only the icons we use. It is `<svg id="lk-sprite">` inline in `web/app/index.html`, between `<!--icons-->` markers.
  To add an icon: put its Lucide name in `ICONS` in `scripts/build-icons.mjs` → `node scripts/build-icons.mjs <lucide-static>/package` (icons for lazy pages go in `LAZY`) → `bash scripts/build-extension.sh`.
- Markup: in JS, `UI.icon('volume-2')`. In HTML, `<svg class="i" aria-hidden="true" focusable="false"><use href="#i-volume-2"/></svg>`.
  Icons are always `aria-hidden`. The control carries the name (`aria-label`, `title` or visible text).
- Active state (bottom nav, sidebar): the same glyph gets a duotone fill (`fill: currentColor; fill-opacity: .16–.2`) and a slightly heavier stroke. Never switch to a different icon.
- Directional icons (`arrow-left`, `chevron-*`) carry the class `i-dir` and mirror in RTL (`[dir=rtl] .i-dir`).
- Auto-upgrade: `UI.paintIcons` (MutationObserver in `ui.js`) turns leftover chrome emoji at the START of a button or link into the icon:
  🔊 🔉 → volume-2 · 🐢 → turtle · ⚙️ → settings · 🔎 🔍 → search · 🔔 → bell · 🎙️ → mic · lone ✕ × ✖ → x · leading ← and lone ‹ › → arrow/chevron.
  An icon-only button with no name gets `aria-label` (t('Nghe'), t('Nghe chậm'), t('Đóng')…). Opt out with `data-noicon`.
- Emoji stay where they are CONTENT or learning flavour: topic and word emoji, celebrations, Kit, quests, badges, lesson headers such as "🎯 Your goal".

## 2. Tokens (Open Props / Radix-style steps, mapped onto our palette)
| Group | Tokens | Use |
|---|---|---|
| Spacing | `--sp-1..6` = 4 / 8 / 12 / 16 / 24 / 32 px | gaps, padding. Card 24 (phones 16), button 10×16, small 6×12, large 14×24 |
| Radius | `--r-xs` 8 · `--r-sm` 12 · `--r-md` 14 · `--r-lg` 18 (= `--radius`) · `--r-xl` 24 · `--r-pill` | chips 8, buttons 12, large 14, cards 18, sheets 24 |
| Type | `--fs-xs` .75 · `--fs-sm` .875 · `--fs-base` 1 · `--fs-md` 1.0625 · `--fs-lg` 1.3125 · `--fs-xl` 1.75 · `--fs-2xl` 2.25 rem | h3 = md, h2 = lg, h1 = xl (phones 1.45). Body 15.5 px / 1.6 |
| Font | Be Vietnam Pro 400–800 (already loaded, metric-matched fallback) | no new web font. Weights: 400 body, 600 nav, 700 buttons and h2/h3, 800 h1 and brand |
| Elevation | `--elev-1` rest (card) · `--elev-2` hover/raised · `--elev-3` modal/sheet | dark mode has its own, stronger shadow values |
| Icon size | 16 (pills, small) · 18 (icon buttons, search) · 20 `--ic` (sidebar) · 24 (bottom nav) | stroke 2 (nav 1.9 → 2.2 when active) |

Colour: only the brand palette and semantic tokens (`--primary*`, `--accent*`, `--good/again/gold*`, `--surface*`, `--text`, `--muted`, `--line`). Never write a new hex value outside `docs/BRAND-RULES.md`. The streak flame uses #F2553B and #FFB054; the XP star uses `--gold`.

## 3. Motion (Material 3 / HIG)
- `--dur-1` 120 ms (hover, press, colour) · `--dur-2` 200 ms (enter, page fade, card lift, tick). UI transitions never exceed 200 ms. The card flip (480 ms) and ambient loops (streak flame) are the only exceptions.
- Easing: `--ease-std` cubic-bezier(.2,0,0,1) for most motion; `--ease-emph` cubic-bezier(.05,.7,.1,1) for feedback that enters (✓/✕ tick).
- `prefers-reduced-motion: reduce` turns off every animation and transition (global rule). Celebrations use the still Kit (`.cele-still`).

## 4. Micro-animations (feedback that adds value; max 3)
1. Correct/wrong tick: Lucide check or x (CSS mask data URI) on `.option.right/.wrong::after`, popping in over 200 ms. Older browsers fall back to the ✓ ✕ characters.
2. Streak flame: the Lucide flame in `#streakPill i.flame-icon`, with a slow flicker (`streak-ui.js`).
3. Lesson complete: brand confetti (`Kit.palette`) + Kit cheer (`game.js`).
Lottie: considered and not used for now. The player costs ≥ 60 KB gz (lazy). Each LottieFiles asset needs its own licence check, and CSS/SVG gives the same three effects at 0 KB.
If a Lottie is added later: lazy-load it with `App.need`, keep it out of the `SHELL` in `sw.js`, credit it on `/credits`, and respect reduced-motion.

## 5. Components
- Card: `.card` = surface, 1 px `--line`, `--radius`, `--elev-1`, padding `--sp-5`. Hover cards lift 3 px with `--elev-2`.
- Button: `.btn` (secondary) · `.btn.primary` (one per screen) · `.ghost` · `.sm` / `.lg`. An icon sits before the label with gap `--sp-2`.
- Icon button: `.icon-btn` 36 px visual with a ≥ 44 px hit area (`::after`). On touch, `--tap` = 44 px applies to every control.
- Section header: `.set-h` = small caps, muted, with an optional leading icon in `--accent-text`.
- Page header: `.page-head` (h1 + muted subtitle + crumb). Bottom nav: icon on a pill when active, bold label, `aria-current`.

## 6. Checks before shipping UI
`npm test` (size budget: shell ≤ 377 KB gz, a11y/axe, ext-sync, brand-check) → `ux-shots.yml` before/after sheets (phone + desktop, light/dark, en/vi/ar): no overflow, no tap target < 44, no JS error.
Mirror into the add-on with `bash scripts/build-extension.sh`. Never edit `extension/content.js` for app UI.
- Module-only CSS (e.g. `.cbt-*` in `js/cbt.js`, `.lq-*` in `js/qengine.js`) is injected by its lazy bundle, so it stays outside the shell.
