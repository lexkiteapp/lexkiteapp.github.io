#!/bin/bash
# usage: mergecheck.sh <branch> "<commit msg>"
cd "$(git rev-parse --show-toplevel)"
S=${SCRATCH_NODE:-$TMPDIR}
MH="$(git rev-parse --git-dir)/MERGE_HEAD"  # worktree: .git là tệp, MERGE_HEAD nằm trong .git/worktrees/<tên>/
if [ ! -f "$MH" ]; then
  D=$(git status --porcelain --untracked-files=no | grep -v ' brand/\| out/\|content/video/qa-log.md' )
  [ -n "$D" ] && { echo "ABORT: thư mục chính có thay đổi chưa commit (agent khác đang làm?):"; echo "$D" | head; exit 1; }
  git merge --no-commit --no-ff "$1" >/dev/null 2>&1
  [ -f "$MH" ] || { git merge-base --is-ancestor "$1" HEAD && { echo "đã gộp sẵn"; exit 0; }; echo "ABORT: git merge không chạy"; exit 1; }
fi
U=$(git diff --name-only --diff-filter=U)
for f in $U; do case "$f" in web/js/i18n/*.js) sed -i '' '/^<<<<<<< /d;/^=======$/d;/^>>>>>>> /d' "$f"; git add "$f";; esac; done
node scripts/i18n-dedupe.cjs >/dev/null; git add web/js/i18n/*.js
U=$(git diff --name-only --diff-filter=U); [ -n "$U" ] && { echo "CONFLICT: $U"; exit 1; }
R=$(NODE_PATH=$(npm root -g):$S/node_modules node scripts/test/smoke.js "$PWD/web" 2>&1 | tail -1); echo "smoke $R"
F=0; [ "$R" = "ERRORS none" ] || F=1
npx -y --cache $TMPDIR/npmc -p typescript@5.6.3 tsc -p tsconfig.check.json >/dev/null 2>&1 && echo tsc ok || { echo tsc FAIL; F=1; }
for t in "scripts/vi-lint.mjs" "scripts/i18n-missing.mjs --strict" "scripts/i18n-qa.mjs --strict" "scripts/test/size-budget.mjs" "scripts/test/unit.mjs" "scripts/test/i18n-switch.mjs" "scripts/test/learn-flow.mjs"; do o=$(node $t 2>&1); echo "$o" | tail -1 | cut -c1-150; echo "$o" | grep -q "✗\|FAIL\|Error" && F=1; done
[ $F = 1 ] && { echo "CHECKS FAILED – merge left uncommitted"; exit 1; }
git commit -qm "Merge $1"
V="lexkite-$(date +%Y%m%d%H%M%S)"; sed -i '' "s/const CACHE = '[^']*';/const CACHE = '$V';/" web/sw.js; git add web/sw.js
git commit -qm "$2

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"; R=https://x-access-token:$(gh auth token)@github.com/lexkiteapp/lexkiteapp.github.io.git; git fetch -q "$R" main 2>/dev/null && git merge -q --no-edit FETCH_HEAD && git push -q "$R" HEAD:main 2>&1 | grep -v "x-access\|failed to store"; echo "pushed $(git rev-parse --short HEAD)"
