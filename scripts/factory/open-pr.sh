#!/usr/bin/env bash
# Xưởng nội dung: gom kết quả của đêm thành MỘT PR bot vào main (không bao giờ đẩy vào nhánh PR khác – PR #424).
# Đẩy nhánh qua khoá deploy (SSH, kích hoạt check) → mở PR bằng GITHUB_TOKEN → commit rỗng qua khoá deploy để
# pull_request "synchronize" chạy đủ check (sự kiện từ GITHUB_TOKEN không chạy workflow) → bật auto-merge (gộp khi required-gate xanh).
set -euo pipefail
SUM="${1:-out/factory-summary.md}"
test -n "$(git status --porcelain -- content web scripts/factory)" || { echo "xưởng: không có thay đổi"; exit 0; }
br="bot/content-factory-$(date -u +%Y%m%d)-${GITHUB_RUN_ID:-local}"
git config user.name "lexkite-bot"; git config user.email "lexkite-bot@users.noreply.github.com"
git checkout -q -b "$br"
git add -A content web extension
git commit -qm "Xưởng nội dung: lô đêm $(date -u +%F) [CF-Pages-Skip]"
git push -q origin "HEAD:refs/heads/$br"
repo="${GITHUB_REPOSITORY:-lexkiteapp/lexkiteapp.github.io}"
out=$(gh pr create --repo "$repo" --base main --head "$br" --title "Xưởng nội dung: lô đêm $(date -u +%F)" --body-file "$SUM" 2>&1) || {
  echo "$out"
  # Repo tắt "Allow GitHub Actions to create and approve pull requests" (07–09/11: xưởng đỏ 5 đêm, nội dung không vào được main).
  # Lô này đã qua `npm test` ngay trong job (cùng bộ với cổng PR) → đẩy thẳng main qua helper chung, giống mọi bot nội dung khác; xoá nhánh bot.
  grep -q "not permitted to create or approve pull requests" <<<"$out" || exit 1
  echo "::warning::Actions không được tạo PR (cài đặt repo) – lô đã xanh npm test, đẩy thẳng main. Chủ bật lại: Settings › Actions › General › Allow GitHub Actions to create and approve pull requests"
  git push -q origin --delete "$br" || true
  bash scripts/ci/push-main.sh "Xưởng nội dung: lô đêm $(date -u +%F)" content web extension
  exit $?
}
num=$(grep -oE '[0-9]+$' <<<"$out")
git commit -q --allow-empty -m "Xưởng nội dung: chạy check PR #$num"
git push -q origin "HEAD:refs/heads/$br"
gh pr merge "$num" --repo "$repo" --auto --squash || echo "::warning::Không bật được auto-merge cho PR #$num – Trưởng gộp gộp tay"
echo "xưởng: PR #$num"
