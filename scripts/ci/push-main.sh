#!/usr/bin/env bash
# MỘT cách duy nhất cho bot đẩy sản phẩm vào main (thay mọi vòng `git pull --rebase … && git push` tự viết trong workflow).
# Gốc lỗi 10/11 (codemap, World scorecard, …): pull --rebase xung đột → rebase bỏ dở → mọi lượt sau "Pulling is not possible because you
# have unmerged files" → đỏ. Ở đây KHÔNG rebase/merge: mỗi lần thử lấy main mới nhất, reset cứng về đó, đặt lại sản phẩm, commit, push.
#   bash scripts/ci/push-main.sh "<thông điệp>" <tệp/thư mục…>                 sản phẩm đã có trên đĩa: chụp lại rồi đặt lên main mới nhất
#   PUSH_MAIN_REGEN="<lệnh>" bash scripts/ci/push-main.sh "<thông điệp>" <…>   tệp dùng chung (chỉ mục 1 dòng…): sinh lại trên main mới nhất
#                                                                                (lệnh phải idempotent) – commit-regen.sh dùng đường này
# Đẩy được hoặc không có gì đổi → mã 0. Hết lượt → mã 1 + ::error::. Mã 2 = dùng sai. Lỗi mạng khi fetch/push cũng chỉ là 1 lượt thử.
# Thông điệp luôn có [CF-Pages-Skip] [skip ci] (sản phẩm bot: không dựng lại Pages, không kích workflow on: push).
# Biến: PUSH_MAIN_TRIES (6) · PUSH_MAIN_SLEEP (5 = giây cơ sở, backoff i*cơ sở + ngẫu nhiên) · PUSH_MAIN_BRANCH (main) · PUSH_MAIN_REMOTE (origin)
# Test: scripts/test/push-main.mjs (đua 2 bot cùng tệp, xung đột, xoá tệp, không đổi gì).
set -u
MSG=${1:-}; shift || true
[ -n "$MSG" ] && [ $# -gt 0 ] || { echo "::error::dùng: push-main.sh \"<thông điệp>\" <đường dẫn…>"; exit 2; }
BR=${PUSH_MAIN_BRANCH:-main}; RM=${PUSH_MAIN_REMOTE:-origin}; TRIES=${PUSH_MAIN_TRIES:-6}; BASE=${PUSH_MAIN_SLEEP:-5}
case "$MSG" in *"[CF-Pages-Skip]"*) ;; *) MSG="$MSG [CF-Pages-Skip]";; esac
case "$MSG" in *"[skip ci]"*) ;; *) MSG="$MSG [skip ci]";; esac
git config user.name >/dev/null || git config user.name "lexkite-bot"
git config user.email >/dev/null || git config user.email "lexkite-bot@users.noreply.github.com"
# dọn trạng thái dở dang do bước trước (rebase/merge/cherry-pick bỏ giữa chừng)
git rebase --abort >/dev/null 2>&1; git merge --abort >/dev/null 2>&1; git cherry-pick --abort >/dev/null 2>&1
# bỏ đường dẫn không tồn tại & chưa từng track (git add sẽ từ chối CẢ lệnh nếu một pathspec không khớp)
P=(); for p in "$@"; do { [ -e "$p" ] || [ -n "$(git ls-files -- "$p" | head -1)" ] || [ -n "${PUSH_MAIN_REGEN:-}" ]; } && P+=("$p"); done
[ ${#P[@]} -gt 0 ] || { echo "push-main: không có đường dẫn nào tồn tại – không có gì để đẩy"; exit 0; }
set -- "${P[@]}"
SNAP=""
if [ -z "${PUSH_MAIN_REGEN:-}" ]; then
  # chụp CHỈ tệp bot đã đổi (thêm/sửa/xoá) so với gốc lúc checkout (kể cả commit cục bộ chưa đẩy) – tệp không đổi giữ bản mới nhất của main,
  # nên 2 bot ghi cùng thư mục không xoá thay đổi của nhau
  SNAP=$(mktemp -d "${TMPDIR:-/tmp}/pushmain.XXXXXX"); trap 'rm -rf "$SNAP"' EXIT
  BASE_SHA=$(git merge-base HEAD "$RM/$BR" 2>/dev/null || git rev-parse HEAD)
  for p in "$@"; do git add -A -- "$p" 2>/dev/null; done
  git diff --cached --name-status --no-renames -z "$BASE_SHA" -- "$@" > "$SNAP/.list"
  : > "$SNAP/.del"; : > "$SNAP/.put"
  node -e 'const a=require("fs").readFileSync(process.argv[1],"utf8").split("\0");const d=[],p=[];for(let i=0;i+1<a.length;i+=2)(a[i]==="D"?d:p).push(a[i+1]);require("fs").writeFileSync(process.argv[2],d.join("\0"));require("fs").writeFileSync(process.argv[3],p.join("\0"))' "$SNAP/.list" "$SNAP/.del" "$SNAP/.put"
  [ -s "$SNAP/.put" ] && tar -cf "$SNAP/.tar" --null -T "$SNAP/.put"
  [ -s "$SNAP/.put" ] || [ -s "$SNAP/.del" ] || { echo "push-main: không có thay đổi"; exit 0; }
fi
for i in $(seq 1 "$TRIES"); do
  if git fetch -q "$RM" "$BR" && git reset -q --hard "$RM/$BR"; then
    git clean -fdq -- "$@" 2>/dev/null
    if [ -n "$SNAP" ]; then
      [ -s "$SNAP/.del" ] && xargs -0 rm -f -- < "$SNAP/.del"
      [ -s "$SNAP/.tar" ] && tar -xf "$SNAP/.tar"
    else
      bash -c "$PUSH_MAIN_REGEN" || { echo "::error::push-main: lệnh sinh lại lỗi"; exit 1; }
    fi
    for p in "$@"; do git add -A -- "$p" 2>/dev/null; done
    if git diff --cached --quiet; then echo "push-main: không có thay đổi so với $RM/$BR"; exit 0; fi
    git commit -qm "$MSG" && git push -q "$RM" "HEAD:$BR" && { echo "push-main: đã đẩy lên $BR (lần $i)"; exit 0; }
  fi
  [ "$i" -lt "$TRIES" ] || break
  w=$((i * BASE + RANDOM % (BASE + 1)))
  echo "::warning::push-main: $BR vừa đổi hoặc lỗi mạng – thử lại lần $((i + 1))/$TRIES sau ${w}s"
  sleep "$w"
done
echo "::error::push-main: không đẩy được lên $BR sau $TRIES lần (khoá deploy BOT_DEPLOY_KEY / ruleset / mạng?)"
exit 1
