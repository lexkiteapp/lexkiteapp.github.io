# Lexkite – quick rules for AI sessions (keep ≤ 1.5 KB)

1. Read `docs/CODEMAP.md` first; open only files it points to (`docs/codemap.json` for lookups). Never explore blindly.
2. Then `docs/METHODS.md` (how to work) + `docs/TOKEN-RULES.md` (token rules). One source per topic – link, don't repeat.
3. Base = latest `main`; own clone in `$TMPDIR`; 1 branch + 1 PR per item; `npm run prepush` before push.
4. Heavy work (tests, builds, renders, audio) runs on CI, never on the owner's Mac.
5. No cuts: never remove features/content/tests or weaken thresholds. Never merge on red CI.
6. Design: Stitch "Lexkite Kit" + one app frame (`docs/DESIGN-SYSTEM.md` §5d); visual changes need the owner's OK on images.
7. i18n: every UI string properly translated in all 15 languages (`docs/I18N-PIPELINE.md`).
8. Big feature (≥3 screens or >½ day) → 1-page spec in `docs/specs/` approved before code.
9. Report only at milestones (2–4 lines, Vietnamese to the owner). No /compact – rotate via ≤15-line handoff.
10. Never print or commit secrets.
