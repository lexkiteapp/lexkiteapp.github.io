#!/bin/bash
# Như commit-regen.sh nhưng cho NHÁNH PR (workflow chạy trên ref nhánh, vd. audio.yml dispatch ref=nhánh): PR thêm nội dung lớn không thể chờ
# "gộp main rồi mới render" (gà–trứng: cổng độ phủ đỏ → không gộp được → không bao giờ render). Sinh lại chỉ mục trên đầu nhánh mới nhất,
# commit và đẩy CHÍNH nhánh đó (không bao giờ main, không force-push). KHÔNG [skip ci]: đẩy bằng khoá deploy kích lại check của PR.
#   BR=<nhánh> bash scripts/ci/commit-regen-pr.sh "<thông điệp>" "<lệnh sinh>" <tệp/thư mục…>
set -u
MSG=$1; REGEN=$2; shift 2
BR=${BR:?cần BR=<nhánh PR>}
case "$BR" in main|master|"") echo "commit-regen-pr: từ chối nhánh '$BR'"; exit 1;; esac
case "$MSG" in *"[CF-Pages-Skip]"*) ;; *) MSG="$MSG [CF-Pages-Skip]";; esac   # tệp sinh: không dựng lại Pages/preview (scripts/test/pages-skip.mjs); KHÔNG gắn skip-ci – check PR phải chạy lại
git config user.name "lexkite-bot"; git config user.email "lexkite-bot@users.noreply.github.com"
for i in 1 2 3 4 5 6; do
  git fetch -q origin "$BR" && git reset -q --hard FETCH_HEAD || { sleep 5; continue; }
  bash -c "$REGEN" || exit 1
  bash scripts/build-extension.sh >/dev/null   # bản add-on của tệp sinh phải khớp web/ (scripts/test/ext-sync.mjs)
  git add -- "$@"
  git diff --cached --quiet && { echo "commit-regen-pr: không có thay đổi"; exit 0; }
  git commit -qm "$MSG" && git push -q origin "HEAD:refs/heads/$BR" && { echo "commit-regen-pr: đã đẩy $BR (lần $i)"; exit 0; }
  echo "commit-regen-pr: nhánh vừa đổi – sinh lại (lần $i)"; sleep $((i * 5))
done
exit 1
