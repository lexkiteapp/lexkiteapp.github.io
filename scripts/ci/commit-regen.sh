#!/bin/bash
# Commit tệp SINH RA (chỉ mục 1 dòng như web/js/listen/audio-index.js) lên main khi nhiều workflow cùng ghi: KHÔNG rebase (tệp 1 dòng
# → mọi thay đổi đồng thời đều xung đột, 1/11 sentence-audio-asr mất lượt gộp vì audio.yml vừa đẩy). Mỗi lần thử: lấy main mới nhất,
# chạy lại lệnh sinh (phải idempotent, đọc kết quả còn trên đĩa: .media-out, .sa/res-*.json), build add-on, commit, push.
#   bash scripts/ci/commit-regen.sh "<thông điệp>" "<lệnh sinh>" <tệp/thư mục…>
set -u
MSG=$1; REGEN=$2; shift 2
case "$MSG" in *"[CF-Pages-Skip]"*) ;; *) MSG="$MSG [CF-Pages-Skip]";; esac   # tệp sinh: không dựng lại Pages (scripts/test/pages-skip.mjs)
case "$MSG" in *"[skip ci]"*) ;; *) MSG="$MSG [skip ci]";; esac   # đẩy bằng khoá deploy: không kích lại workflow on: push (scripts/test/bot-push-key.mjs)
git config user.name "lexkite-bot"; git config user.email "lexkite-bot@users.noreply.github.com"
for i in 1 2 3 4 5 6; do
  git fetch -q origin main && git reset -q --hard origin/main || { sleep 5; continue; }
  bash -c "$REGEN" || exit 1
  bash scripts/build-extension.sh >/dev/null   # bản add-on của tệp sinh phải khớp web/ (scripts/test/ext-sync.mjs)
  git add -- "$@"
  git diff --cached --quiet && { echo "commit-regen: không có thay đổi"; exit 0; }
  git commit -qm "$MSG" && git push -q origin HEAD:main && { echo "commit-regen: đã đẩy (lần $i)"; exit 0; }
  echo "commit-regen: main vừa đổi – sinh lại (lần $i)"; sleep $((i * 5))
done
exit 1
