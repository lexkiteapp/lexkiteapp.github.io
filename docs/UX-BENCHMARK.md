# UX benchmark – Lexkite web app (/app/) vs top language apps

> TL;DR: So sánh UX web app với Duolingo, Babbel, Busuu, Speak, Elsa, Anki/Quizlet: scorecard, tiêu chí, top 10 cải tiến, UX v3 (icon + token). Bằng chứng ảnh CI ux-shots.yml.
> Đọc khi: cải tiến UX.

Date 25/10/2026. Compared with Duolingo, Babbel, Busuu, Speak, Elsa, and Anki/Quizlet for review.
Evidence: hermetic CI screenshots from `ux-shots.yml` (`scripts/test/ux-shots.mjs`). They cover 10 flows on phone 390×844 and desktop 1366×860, light and dark, in en/vi/ar.
Each shot is measured for horizontal overflow, edge clipping, tap targets < 44 px and JS errors. The before/after sheets are in the `ux-shots` artifact.
Rule: quality only goes up. No feature or content is removed to simplify.

## 1. Scorecard per flow (before this pass)
| Flow | Hierarchy / density | One primary action | Feedback | Empty / loading / error | Thumb reach | Notes |
|---|---|---|---|---|---|---|
| Today (#/home) | Good: greeting, then the plan card, then the task list | ✓ "Start Day N" (full width) | progress ring 0/4 | skeleton (skelHome) | CTA sits in the upper half on phones (Duolingo puts it lower) | the sandbox toast covers part of the list for about 2 s |
| Learn (#/practice) | 2-column card grid, slightly dense on phones | no single CTA (the user picks a mode; same as Babbel "Review") | – | default skeleton | OK | — |
| Review (#/review) | focus mode, big card | ✓ "Flip card" in the thumb zone | swipe + Again/Good, haptics, Kit | skelReview | ✓ | right/wrong was shown by colour only (fixed) |
| Vocab topics (#/vocab, #/library) | hero "Review N cards" + grid | ✓ "Review now" | – | – | ✓ | — |
| Tests (#/tests) | card list + score history | the level test card | – | text-only empty history (acceptable: the CTA card sits directly above) | ✓ | — |
| Me / Goal | Bento layout, XP bar | ✓ "Create plan" | – | – | ✓ | the "Me" breadcrumb link was 19 px wide (fixed) |
| Dictionary (#/dict) | search → entry card | ✓ "Look up a word" | – | a bare "⏳ Looking up…" card made the layout jump (fixed: skeleton) | ✓ | — |
| Confidence (#/confidence) | score + lessons grouped by CEFR | ✓ "Today's 2-minute challenge" | confetti + Kit | – | ✓ | — |

## 2. Cross-cutting criteria
- **Hierarchy / density.** h1 is 1.5–1.75 rem and sections use `.set-h` small caps; this matches Babbel and Busuu. Hub cards keep a steady rhythm (gap .8 rem on desktop, .6 rem on phones). There is one header pattern, `.page-head` (h1 + muted subtitle + crumb), used by 40+ modules. That is consistent; the Me page alone uses a centred column (profile style, same as Duolingo).
- **One primary action.** Met on 8/10 flows. The Learn hub and the Tests hub are menus by design.
- **Feedback animations.** Correct = popBounce + green + sound + 35 ms haptic. Wrong = shake + red + double buzz. Both are at Duolingo level. Missing before: a non-colour cue (✓/✕) and a reduced-motion celebration. Confetti used off-brand indigo/violet.
- **Empty / loading / error.** Route skeletons appear after 150 ms (no flash). Two waits used plain text (dictionary, courses). `App.guard` handles errors, and offline works through the SW.
- **Thumb reach.** The bottom nav has 5 tabs at ≥ 44 px. Study CTAs and the feedback sheet are sticky at the bottom. On the Today screen the primary CTA is at about 30 % of screen height, which is acceptable because it is the first card.
- **Transitions.** Page fade is 180 ms. Buttons and cards take 120–150 ms. The card flip takes 480 ms (intentional, as in Anki/Quizlet). The toast took 250 ms (now 200 ms).
- **Typography scale.** Body is 16 px. The nav label is .66 rem (≈ 10.5 px, same as the iOS tab bar at 10 pt). The study word is 2.3 rem. Line height is 1.45–1.6.
- **Dark mode.** Full token set (`--surface*`, `--*-text`). No hard-coded light backgrounds in the core flows (checked on 10 dark shots).
- **RTL (ar).** Layout mirrors correctly (sidebar, borders, badges). Bug: trailing "→" in CTAs ("Start Day 1 →", "Review now →") pointed backwards (fixed).
- **Accessibility.** The tap token `--tap` = 44 px is applied on touch. Focus-visible rings are on. axe and a11y tests run in `npm test`. Before this pass: no `aria-current` on nav, document.title stayed the same on every route, focus stayed on the clicked nav link, and toasts disappeared after 2.4 s even when long.

## 3. Top 10 improvements (impact/effort), all shipped as separate commits
1. **Bottom-nav active state.** Pill behind the icon plus a bold label (Material 3 / Duolingo). `aria-current="page"` on the bottom nav and sidebar.
2. **SPA route a11y.** The tab title follows the page h1, and modules that set their own title are respected. Focus moves to `#view` after a nav click, but never steals focus from a dialog or an input.
3. **Brand confetti.** `Kit.palette` in `web/js/kit.js` is the single source; it replaces the indigo/violet.
4. **Skeleton loaders.** `UI.skel` / `UI.skelPage` (role=status with an SR label) for dictionary lookup and Courses. They replace "⏳ / Loading…" text.
5. **RTL arrows.** A leading or trailing →/← in buttons and links flips for ar. Mid-sentence arrows (en → vi) stay as they are.
6. **Overflow sweep** (same class of bug as the iOS date input on 24/10). `select`, `input` and `textarea` are capped at 100 %, and long tokens wrap in `#view` text.
7. **Breadcrumb tap width ≥ 44 px.** Fixes the 19 px "Me".
8. **Answer feedback not by colour only.** ✓/✕ glyph on right/wrong options.
9. **Celebrations respect reduced-motion.** A still Kit with an opacity-only fade replaces flying confetti on big milestones.
10. **Toast timing.** Duration scales with length (1.4 s + 55 ms/char, max 7 s; WCAG 2.2.1). The transition is now 200 ms.

## 4. Next (not in this pass)
- Today on phones: move the "Start" CTA into a sticky bottom bar after scrolling past it (Duolingo pattern). Needs a design review.
- Learn hub: a "Recommended" chip on the best mode for the user's due/new mix (one-tap start).
- Tests empty history: an inline mini-chart placeholder once the first score exists.
- Owned by another agent (do not touch here): /blog/about, #filterM, contrast tokens, #/write and #/fix tap targets.

## 5. How to re-check
`git push <remote> HEAD:refs/heads/ux-shots-<n>` → **UX shots** workflow. It compares against the remote `main` (before) and this branch (after), then builds `sheet-{before,after}-*.jpg` and `report.json`. The run fails on a JS error in the after build.

## 6. UX v3: one icon family + tokens (25/10/2026)
- **Icon family: Lucide** (ISC License, © Lucide Contributors; parts © Cole Bemis/Feather, MIT). Credited on `/credits`. Chosen over Phosphor because rounded 24 px strokes match Kit and the kite mark, and the paths are about 3× smaller.
- The emoji UI chrome becomes one family:
  - bottom nav (active = duotone fill + pill), sidebar, top bar (search, streak, XP, bell, language, theme);
  - audio and slow audio, settings, close, back and chevrons, settings section headers.
  Topic and celebration emoji stay (they are content).
- Tokens: spacing 4–32, radius, type scale on Be Vietnam Pro, elevation, M3 motion (≤ 200 ms). The rules are in **docs/DESIGN-SYSTEM.md**.
