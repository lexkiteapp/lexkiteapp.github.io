# Lexkite design system (web app /app/ + add-on extension/app)

> TL;DR: MỘT hệ thiết kế cho app, add-on, web/blog, nhúng video: màu `brand/tokens.json` + lớp Tactile dùng chung `web/css/tactile.css` (tk-*). Đổi phong cách = đổi biến, không sửa component.
> Mục lục: §0 Lớp dùng chung · §1 Icon · §2 Token · §2a Màu sáng/tối (một bảng mọi nền tảng) · §3 Chuyển động · §4 Vi hiệu ứng · §5 Thành phần · §5b Màn Tactile · §6 Kiểm tra.
> Đọc khi: mọi thay đổi giao diện.

One design language. Every UI change follows this page. Rule: quality only goes up. Never remove features or content.
Sources: colour tokens in `brand/tokens.json` (generated into `web/css/style.css` `:root` by `scripts/build-tokens.mjs` – never edit the `@tokens` lines), other tokens in `:root`, brand rules in `docs/BRAND-RULES.md`, Kit in `web/js/kit.js`, icons from `scripts/build-icons.mjs`.

## 0. Shared Tactile layer (one source for every surface)
| Layer | File | Who reuses |
|---|---|---|
| Colours (light/dark) | `brand/tokens.json` → `build-tokens.mjs` → `style.css :root`, add-on `--d-*`, `site-layout.mjs` | all |
| Shape · depth · type | `web/css/tactile.css :root` (`--r-card --r-pill2 --r-tile --lip-h --press --hi --elev-card --elev-sheet --cta-grad --font-display --track`) | all |
| Core components (app shell) | `web/css/tactile.css`: `.tk-card` `.tk-tile` `.tk-btn`(`.wide`; = `.btn.primary` in app) `.tk-chip`(`.gold .ok .bad`) `.tk-bar`(`style="--seg:n"` = segmented) `.tk-display` `.tk-num` | app now; add-on/web/embeds next |
| Extra components (lazy) | `web/css/tactile-x.css`: `.tk-opts/.tk-opt`(A–D, `aria-pressed`) `.tk-sheet`(`.ok .bad`) `.tk-teacher`(img + name + small) – app loads with lesson/goal via `BCSS` | same |
- No hex in `tactile*.css` (brand-check). Light = B "Bright Day" (warm paper `--bg`, white cards, `--heading` deep teal), dark = A "Tactile Night" (values: §2a); Settings › theme Auto/Light/Dark. Hosts supply colour vars; fonts: see §2b (one family; Bricolage only on not-yet-ported screens).
- Style options from the owner = change `tactile.css :root` + tokens only.
- `--font-display` (legacy, §2b) only for headings/numbers (`.tk-display`, `.tk-num`); buttons and form controls keep the page font (Font audit gate).
- Characters: in the app ONLY the 2D green-screen Ama/Carlos set (`teach/<w>/poster.webp`, clips via `LessonTeacher.mount`), never mixed with 3D; one source `App.teacherImg(w)` in `ux1.js`.
- Motion: only subtle 150–200 ms fades; no bounce, pulse, glow, shake or confetti.

## 1. Icons: ONE family, Lucide (ISC)
- Licence: ISC, © Lucide Contributors; parts © Cole Bemis (Feather, MIT). Credited on `/credits` (`content/legal/{en,vi}/credits.html`).
- Why Lucide: rounded caps and joins on a 24 px grid fit the soft Kit and kite shapes. It is stroke-based, so it follows `currentColor` in light and dark mode. The paths are tiny (38 icons ≈ 2.6 KB gz inline; settings-only icons are added by settings.js via `UI.addIcons`). Phosphor duotone was about 3× larger per icon.
- The sprite holds only the icons we use. It is `<svg id="lk-sprite">` inline in `web/app/index.html`, between `<!--icons-->` markers.
  To add an icon: put its Lucide name in `ICONS` in `scripts/build-icons.mjs` → `node scripts/build-icons.mjs <lucide-static>/package` (icons for lazy pages go in `LAZY`) → `bash scripts/build-extension.sh`.
- Markup: in JS, `UI.icon('volume-2')`. In HTML, `<svg class="i" aria-hidden="true" focusable="false"><use href="#i-volume-2"/></svg>`.
  Icons are always `aria-hidden`. The control carries the name (`aria-label`, `title` or visible text).
- Sidebar (desktop, Stitch screen 03e155f8a96144c0aa416a835915bc55): nav scrolls inside; utility rows + account row pinned to the bottom; all rows ≥ 44 px; nested rows carry a guide line, no icons.
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
| Font | see §2b | no new web font. Weights: 400 body, 600 nav, 700 buttons and h2/h3, 800 h1 and brand |
| Elevation | `--elev-1` rest (card) · `--elev-2` hover/raised · `--elev-3` modal/sheet | dark mode has its own, stronger shadow values |
| Icon size | 16 (pills, small) · 18 (icon buttons, search) · 20 `--ic` (sidebar) · 24 (bottom nav) | stroke 2 (nav 1.9 → 2.2 when active) |

Colour: only the brand palette and semantic tokens (`--primary*` = CTA, `--accent*`, `--done/--done-ink/--on-done` = progress, done nodes, earned badges, `--good/again/gold*`, `--surface*`, `--text`, `--muted`, `--line`, `--line-2`). Never write a new hex value outside `docs/BRAND-RULES.md`. The streak flame uses #F2553B and #FFB054; the XP star uses `--gold`.

## 2b. Type system + Stitch design system (ONE, 13/11)
- Source: `brand/tokens.json` → `typography`. **Plus Jakarta Sans 400–800** (variable, self-hosted `web/fonts/pjs-{latin,latin-ext,vietnamese}.woff2`, metric-matched fallback) for body AND headings/numbers (weight 800); icons Material Symbols Rounded/Outlined; ar/hi/ja/ko/ru/th/zh use system or Noto Sans fallbacks, never a Stitch pick. Why: every Stitch export and the whole `st-*.css` port already use it, it covers Vietnamese, and one variable file per subset is lighter than Be Vietnam Pro's 5 weights. No new web font.
- Legacy until `ux1` is the default, then delete: Be Vietnam Pro (`style.css`) and Bricolage Grotesque (`tactile.css --font-display`). Do not add either to new screens.
- Stitch: ONE design system **"Lexkite Design System (brand/tokens.json)", id `6304905654321795514`**, built from `brand/stitch/DESIGN.md` (generated: `node scripts/build-stitch-design-md.mjs`, colours = roles, type = above, shape/spacing = `tokens.dtcg.json`). Applied to the 7 active projects (ES, Games, Exam Prep, Admin, Mediate, Native M2, Landing v3) with `update_design_system`.
- RULE: every new Stitch project applies design system `6304905654321795514` at creation (`update_design_system`, name `assets/6304905654321795514`); never pick fonts or colours in Stitch.
- Gates: `scripts/test/stitch-theme-lint.mjs` (DESIGN.md in sync; new `brand/stitch/**` exports fail on a font family or `-[#HEX]` class outside the tokens; old files listed in `brand/stitch/lint-legacy.txt`, which may only shrink) + `stitch-sync-palette --check`.

## 2a. Colour tokens: ONE palette for web, add-on, Stitch screens, iOS, Android (5/11)
- **Source:** `brand/tokens.json` only (`light`/`dark` = web vars, `roles` = Material-3 roles shared by Stitch `--st-*`, SwiftUI `LKColor`, Compose). `node scripts/build-tokens.mjs` writes `style.css`, every `st-*.css` (vars + neutral `lt:`/`dk:` classes snapped to roles by `scripts/lib/st-theme-snap.mjs`), `brand/stitch/tokens.dtcg.json` (→ `scripts/native/gen.mjs` → `Tokens.swift`/`Tokens.kt`), Capacitor window/WebView background and the table below. `--check` runs in `brand-check`; `scripts/test/token-contrast.mjs` (npm test) checks every text/surface pair in both themes. The Stitch v2 exports (`brand/stitch/v2/*.html` + `bind/`) use the same roles via `node scripts/stitch-sync-palette.mjs` (same `pick()`; `--check` in npm test), so stitch-render references and the app share one scale.
- **Bright Day (light):** warm paper `--bg` #FBF7F1 (not glaring white/cream), white cards with a hairline `--line` + soft teal-tinted shadow, raised `--surface-2/3`; body text #162124 (teal-black, never pure black, ≥ 15:1), muted ≥ 7:1, headings deep teal. **Tactile Night (dark):** teal-black `--bg` #0E191C, three lifted surfaces, text #EAF2F2 (no pure-white glare). Same brand accents in both (CTA gradient, teal progress, sun).
- **Smooth switching:** theme is applied before first paint (`THEME_HEAD`, `color-scheme`, `theme-color` per theme, native window/WebView background per system theme); a manual or system switch cross-fades colours for 180 ms (`html.lk-theming`), off under `prefers-reduced-motion`.
- Status colours stay calm: text uses `--good-text/--again-text/--gold-text` on `-soft` fills (≥ 4.5:1), never saturated fills behind body text.

<!-- @tokens:start (SINH bởi scripts/build-tokens.mjs – sửa brand/tokens.json) -->
| Biến web | Sáng "Bright Day" | Tối "Tactile Night" |
|---|---|---|
| `--bg` | #FBF7F1 | #0E191C |
| `--surface` | #FFFFFF | #162528 |
| `--chip` | #F8F4EC | #122023 |
| `--surface-2` | #F5EFE6 | #1D2F33 |
| `--surface-3` | #ECE4D7 | #263A3F |
| `--text` | #162124 | #EAF2F2 |
| `--heading` | #0F3D3E | #EAF2F2 |
| `--muted` | #45555A | #A3B9B7 |
| `--line` | #ECE5D9 | #213438 |
| `--line-2` | #DED4C4 | #2A3F44 |
| `--faint` | #74817F | #6F878B |
| `--ledge` | #E6DCCB | #0A1517 |
| `--teal-1` | #1F7A75 | #1F7A75 |
| `--teal-2` | #2BA39A | #2BA39A |
| `--done` | #1F7A75 | #2BA39A |
| `--done-ink` | #17595A | #1F7A75 |
| `--on-done` | #ffffff | #0E191C |
| `--cta-1` | #FFB054 | #FFB054 |
| `--cta-2` | #F2553B | #F2553B |
| `--cta-ink` | #1A0E0B | #1A0E0B |
| `--cta-lip` | #B53A22 | #B53A22 |
| `--sun` | #A26E00 | #FFC94A |
| `--primary` | #CC3F1C | #FF8466 |
| `--primary-2` | #FF7A4D | #FFA582 |
| `--primary-ink` | #FFFFFF | #1A0E0B |
| `--primary-soft` | #FFEBE4 | #3A221C |
| `--accent` | #0D6964 | (= sáng) |
| `--accent-soft` | #DDF1EE | #10302F |
| `--gold` | #F5A524 | (= sáng) |
| `--gold-soft` | #FFF3DA | #3A2E12 |
| `--again` | #D1343A | (= sáng) |
| `--hard` | #F59E0B | (= sáng) |
| `--good` | #15803D | (= sáng) |
| `--easy` | #2563EB | (= sáng) |
| `--good-soft` | #E3F4E8 | #12301D |
| `--again-soft` | #FCE9E7 | #3A1A1C |
| `--primary-text` | #B03718 | #FF8466 |
| `--accent-text` | #0D6964 | #5FD0C4 |
| `--good-text` | #166534 | #4ADE80 |
| `--again-text` | #B42318 | #FF7B7F |
| `--gold-text` | #92400E | #FBBF24 |

Vai trò M3 (màn Stitch `--st-*`, SwiftUI `LKColor`, Compose) – một giá trị cho mọi nền tảng:

| Vai trò | Nguồn | Sáng | Tối |
|---|---|---|---|
| background | `--bg` | #FBF7F1 | #0E191C |
| banner | `#1F7A75` | #1F7A75 | #1F7A75 |
| banner-2 | `#12514D` | #12514D | #12514D |
| error | #BA1A1A / #FFB4AB | #BA1A1A | #FFB4AB |
| error-container | #FFDAD6 / #93000A | #FFDAD6 | #93000A |
| glow-secondary | #2BA39A / #6BD8CE | #2BA39A | #6BD8CE |
| inverse-on-surface | `--bg` / #253336 | #FBF7F1 | #253336 |
| inverse-primary | #FFB4A6 / #B42814 | #FFB4A6 | #B42814 |
| inverse-surface | `--heading` / #D7E5E9 | #0F3D3E | #D7E5E9 |
| lip-lock | #D5DEDC / #071215 | #D5DEDC | #071215 |
| lip-opt | `--ledge` | #E6DCCB | #0A1517 |
| lip-opt-sel | #187770 / #00302C | #187770 | #00302C |
| lip-primary | #C43820 / `--cta-lip` | #C43820 | #B53A22 |
| lip-secondary | #187770 / #0F3D3E | #187770 | #0F3D3E |
| on-background | `--heading` | #0F3D3E | #EAF2F2 |
| on-error | #FFFFFF / #690005 | #FFFFFF | #690005 |
| on-error-container | #410002 / #FFDAD6 | #410002 | #FFDAD6 |
| on-primary | #FFFFFF / #660800 | #FFFFFF | #660800 |
| on-primary-container | #1A0E0B / #590600 | #1A0E0B | #590600 |
| on-primary-fixed | #3F0300 / #3F0300 | #3F0300 | #3F0300 |
| on-primary-fixed-variant | #C43820 / #900F00 | #C43820 | #900F00 |
| on-secondary | #FFFFFF / #003733 | #FFFFFF | #003733 |
| on-secondary-container | #00302C / #00302C | #00302C | #00302C |
| on-secondary-fixed | #00201E / #00201E | #00201E | #00201E |
| on-secondary-fixed-variant | #187770 / #00504B | #187770 | #00504B |
| on-surface | `--text` | #162124 | #EAF2F2 |
| on-surface-variant | `--muted` | #45555A | #A3B9B7 |
| on-tertiary | #FFFFFF / #402E00 | #FFFFFF | #402E00 |
| on-tertiary-container | `#372700` | #372700 | #372700 |
| on-tertiary-fixed | #261A00 / #261A00 | #261A00 | #261A00 |
| on-tertiary-fixed-variant | #5B4300 / #5B4300 | #5B4300 | #5B4300 |
| outline | #74817F / #7E9599 | #74817F | #7E9599 |
| outline-variant | #E6DCCB / `--line` | #E6DCCB | #213438 |
| primary | #A83A24 / #FFB4A6 | #A83A24 | #FFB4A6 |
| primary-container | #F2553B / #FA5B40 | #F2553B | #FA5B40 |
| primary-fixed | #FFB054 / #FFDAD3 | #FFB054 | #FFDAD3 |
| primary-fixed-dim | #FFB4A6 / #FFB4A6 | #FFB4A6 | #FFB4A6 |
| secondary | #1B6C66 / #6BD8CE | #1B6C66 | #6BD8CE |
| secondary-container | #2BA39A / #28A198 | #2BA39A | #28A198 |
| secondary-fixed | #88F5EA / #88F5EA | #88F5EA | #88F5EA |
| secondary-fixed-dim | #1B6C66 / #6BD8CE | #1B6C66 | #6BD8CE |
| star | #E5A000 / #F4BF40 | #E5A000 | #F4BF40 |
| success | #1A7043 / #2FBF71 | #1A7043 | #2FBF71 |
| surface | `--bg` | #FBF7F1 | #0E191C |
| surface-bright | `--surface` / #33494F | #FFFFFF | #33494F |
| surface-container | `--surface` | #FFFFFF | #162528 |
| surface-container-high | `--surface` / `--surface-2` | #FFFFFF | #1D2F33 |
| surface-container-highest | `--surface-3` | #ECE4D7 | #263A3F |
| surface-container-low | `--chip` | #F8F4EC | #122023 |
| surface-container-lowest | `--bg` / #091416 | #FBF7F1 | #091416 |
| surface-dim | `--bg` | #FBF7F1 | #0E191C |
| surface-tint | #F2553B / #FFB4A6 | #F2553B | #FFB4A6 |
| surface-variant | `--surface-3` | #ECE4D7 | #263A3F |
| tertiary | #8A6000 / #F4BF40 | #8A6000 | #F4BF40 |
| tertiary-container | #FFC94A / #B78900 | #FFC94A | #B78900 |
| tertiary-fixed | #6B4A00 / #FFDF9E | #6B4A00 | #FFDF9E |
| tertiary-fixed-dim | #8A6000 / #F4BF40 | #8A6000 | #F4BF40 |
| trail | #E9EFEB / #0F2B2E | #E9EFEB | #0F2B2E |
<!-- @tokens:end -->

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

## 5b. Tactile (Google Stitch "Lexkite English Exam Prep", owner-approved 28/10; source out/stitch/v1)
- Colors only from `brand/tokens.json`: CTA gradient `--cta-1`→`--cta-2`, text `--cta-ink`, lip `--cta-lip`; floating tiles get a bottom ledge `--ledge`; stars/XP graphics `--sun` (text uses `--gold-text`). Contrast is checked in brand-check.
- Shape/type/components: §0. Body text: §2b.
- Screens: home path (`ux1.js` map: unit card + step/XP-to-checkpoint, S-trail, real stars from `lk.ux1.st`, START pill, milestone, sticky Continue CTA), lesson (`lesson/ui.js`: 720 px focus, segmented bar, question counter, prompt card, audio row, A–D options, full-width Check, feedback sheet with chips + teacher card + gold-bank booster), readiness (`goal.js`: estimate vs target, readiness bar, skill tiles, picked drill, mock schedule; empty state without real scores).
- Owner overrides: no hearts/lives, 5 tabs, 3D Ama/Carlos only, UK/US IPA via `UI.pronHtml`, light + dark from tokens. QA: one `.lsn-foot`, answers disabled after Check, `dir=ltr` on +XP/% values.
- Bundle CSS outside the shell: `BCSS` in `app.js` (`exam.css`, `adm.css`, `league.css`, `tactile-x.css`).

## 5c. Stitch HTML port (28/10, PR #199 – HOLD until owner OK)
The 4 core screens (Learn path, Lesson drill, Feedback sheet, Exam readiness) use **Google Stitch's exported DOM + Tailwind classes verbatim** – no reinterpretation.
- Templates: `web/js/st/{common,home,lesson,goal}.js` (only these are Tailwind content; write classes literally). Data + `t()` replace static text; 2D teachers only; no hearts/gems; motion = 150–200 ms fades, reduced-motion respected.
- Tokens: `brand/stitch/tokens.dtcg.json` (W3C DTCG; `$value` = dark A, `$extensions.com.lexkite.mode.light` = light B, text roles darkened for WCAG 2.2 AA). Colours become `rgb(var(--st-*) / α)` so one DOM serves both themes; `lt:` = light-only borders/soft shadows (Option B).
- Build: `node scripts/build-stitch-css.mjs` → `web/css/st-{home,lesson,goal}.css` (Tailwind 3.4.17, no preflight, ≤ 10 KB gz each, lazy via BCSS). `--check` on CI = drift gate; `--fonts` re-downloads self-hosted Plus Jakarta Sans (§2b) (latin/latin-ext/vietnamese WOFF2, swap) + Material Symbols subset (icon names from `ms('…')` / `@icons`).
- Gate: `scripts/test/stitch-diff.mjs` (SSIM + row rhythm vs `brand/stitch/*.jpg`, thresholds only go up, axe WCAG 2.2 AA inside `.st`), owner sheets `side-*.jpg` / `desk-*.jpg`. Gallery: `web/design/gallery.html` (light/dark/RTL).

## 5d. ONE app frame (HARD, 31/10) – paste the prompt block into every Stitch prompt
- Canvas: phone 390 px wide, portrait; content column max 390 px (desktop = same column centred + sidebar, never a stretched desktop layout). CI frame check fails desktop-width or off-frame output.
- Top bar, three fixed variants: **hub** (title left, one icon action right; tabs below), **inner** (Back arrow left + title; ≤ 1 action right), **modal/focus** (Close X left + slim progress bar or title; nothing else, no lives/gems). Back/X ≥ 44 × 44 px, high contrast; Esc / system back / iOS swipe work; soft confirm only if progress would be lost.
- Language: exactly one switch per screen, in the top bar (`#langBtn`; on phone Today the Stitch header pill, where the app top bar is hidden). Top-bar pills share one height (`--tap`, ≥ 44 px), one fill/border and even gaps; their outer edge sits on the content edge. Desktop: the content column is centred between sidebar and rail (never parked left); wide frames and the top bar share one 1080 px column, 480 px hub columns stay centred; 24 px between top bar and first content. CI: `scripts/test/topbar-lang.mjs` (360–2560 px, vi/de/ar, light/dark).
- Bottom: hub screens show the 5 tabs **Today · Vocab · Skills · Tests · Me** (active one highlighted); inner and focus screens show no tabs. One primary CTA per screen, sticky at the bottom of focus screens, full-width on phone.
- Rhythm: 16 px side gutter, 12/16/24 px vertical steps, rounded tactile cards (§0/§5b), every touch target ≥ 44 px, text ≥ 4.5:1 (large 3:1) in both themes.
- Teacher slot: an empty rounded "teacher-slot" box (Stitch draws no people); code fills it with the 2D Ama/Carlos (`Chars.*`), same light and scale as the UI, grounded, no crop/halo.
- i18n: labels must survive +40 % (de/ru) and RTL (ar): wrap, never truncate or shrink buttons.
- Theme: apply Lexkite design system `6304905654321795514` (§2b) before the first prompt; the prompt never names fonts or colours.
- Prompt block (verbatim): "Mobile phone, portrait, a single 390 px app screen of Lexkite (English learning for IELTS, TOEIC, TOEFL). Feel: friendly, tactile, game-like but calm; Lexkite Kit design system. Top bar: <hub | inner with back arrow | focus with close X and slim progress bar>; back/close buttons at least 44 px. <Five bottom tabs Today, Vocab, Skills, Tests, Me with X highlighted | no bottom tabs>. One primary button. No hearts, lives or gems; no photos or drawn people: show an empty rounded 'teacher-slot' where the teacher goes. All text strongly readable (4.5:1), every tap target at least 44 px, labels wrap for 40 % longer text."
- Tools: `scripts/stitch/batch.mjs` (3-key queue runner, state + credits per key), `qc-pick.mjs` / `queue-fix.mjs` (machine-QC fix rounds), CI "Stitch quality QC" + `stitch-diff`.

## 6. Checks before shipping UI
`npm test` (size budget: shell ≤ 374 KB gz (canonical gzip, scripts/lib/gz-canon.mjs), a11y/axe, ext-sync, brand-check) → `ux-shots.yml` before/after sheets (phone + desktop, light/dark, en/vi/ar): no overflow, no tap target < 44, no JS error.
Mirror into the add-on with `bash scripts/build-extension.sh`. Never edit `extension/content.js` for app UI.
- Module-only CSS (e.g. `.cbt-*` in `js/cbt.js`, `.lq-*` in `js/qengine.js`) is injected by its lazy bundle, so it stays outside the shell.
