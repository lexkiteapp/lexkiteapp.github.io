# Native onboarding – Stitch sources (draft, 5/11)

Stitch project `projects/7268539912208977707`. Design systems: dark `assets/1b7a8a3d3d52404bb332d9ba3f783547` (Lexkite Kit), light `assets/be492fd9a8004db9a2c0404324067aba` (Lexkite Bright Day).

## Step -> source
| Native step | Source | Status |
|---|---|---|
| 1 splash | NEW `onboarding-splash-<light\|dark>.html/.png` | NOT GENERATED: Stitch `generate_screen_from_text` timed out 3x (2 min waits) |
| 2 welcome | #608: `brand/stitch/v2/welcome-<theme>.html` (commit c6ab46f9b, branch claude/welcome-rework) | reuse, not yet imported into this branch |
| 3 native language | NEW `onboarding-language-<theme>.html/.png` | NOT GENERATED (blocked as above) |
| 4 goal | #608 `onb-goal-<theme>.html` | reuse |
| 5 level | #608 `onb-level-<theme>.html` (quick placement entry, Skip) | reuse |
| 6 daily time | #608 `onb-pace-<theme>.html` – native drops the reminder-time row (permission is asked after the first lesson) | reuse, native deviation |
| 7 ready | #608 `onb-ready-<theme>.html` – Back only, no Skip | reuse, native deviation |

## New string ids (vi source; go through the web i18n pipeline, docs/I18N-PIPELINE.md)
| id | vi |
|---|---|
| onb.lang.title | Ngôn ngữ mẹ đẻ của bạn? |
| onb.lang.sub | Chúng tôi sẽ giải nghĩa và hướng dẫn bằng ngôn ngữ này. |
| onb.lang.search | Tìm ngôn ngữ |
| onb.common.continue | Tiếp tục |
| onb.common.skip | Bỏ qua |
| onb.common.back | Quay lại |
| onb.welcome.start | Bắt đầu |
| onb.welcome.haveAccount | Tôi đã có tài khoản |
| onb.ready.cta | Vào bài học đầu tiên |
Splash has no text besides the logo wordmark. Goal/level/pace/ready/welcome copy comes from the #608 web keys (reuse those ids; do not duplicate).

## Tokens (tokens.dtcg.json)
- Splash: color.background, color.primary (logo glow), color.glow-secondary.
- Language: color.background, surface-container(*), color.primary (selected row + primary button), on-primary, on-surface(-variant), outline-variant; radius rounded cards; spacing 16 gutter; tap >= 44.
- Others: as in the #608 exports (same Kit tokens).
