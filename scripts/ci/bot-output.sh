#!/usr/bin/env bash
# Lấy kết quả bot của nhánh (artifact bot-output-<name> do .github/actions/bot-output tạo) về worktree – thay cho việc bot đẩy commit vào
# nhánh PR (2/11: làm CI/required-gate treo, rebase dính commit lạc). Chỉ tải 1 zip nhỏ + giải nén – không dựng gì trên máy.
#   bash scripts/ci/bot-output.sh <name> [nhánh=nhánh hiện tại] [run-id=mới nhất]     rồi: git add … && git commit
# Token: $GH_TOKEN, không có thì `gh auth token` (gọi API bằng curl – gh CLI có thể lỗi TLS).
set -euo pipefail
NAME=${1:?"cần <name> (vd say-native, brand-build, teach-build, sent-packs)"}
BR=${2:-$(git rev-parse --abbrev-ref HEAD)}; RUN=${3:-}
REPO=${REPO:-lexkiteapp/lexkiteapp.github.io}
TOKEN=${GH_TOKEN:-$(gh auth token)}
cd "$(git rev-parse --show-toplevel)"
api() { curl -fsSL -H "Authorization: Bearer $TOKEN" -H "Accept: application/vnd.github+json" "$@"; }
pick=$(api "https://api.github.com/repos/$REPO/actions/artifacts?name=bot-output-$NAME&per_page=100" | BR="$BR" RUN="$RUN" node -e '
  let s = ""; process.stdin.on("data", d => s += d).on("end", () => {
    const a = JSON.parse(s).artifacts.filter(x => !x.expired && x.workflow_run && (process.env.RUN ? String(x.workflow_run.id) === process.env.RUN : x.workflow_run.head_branch === process.env.BR))
      .sort((x, y) => y.created_at.localeCompare(x.created_at))[0];
    if (a) console.log([a.archive_download_url, a.workflow_run.id, a.workflow_run.head_sha, a.created_at].join(" "));
  });')
[ -n "$pick" ] || { echo "✗ không có artifact bot-output-$NAME cho nhánh $BR${RUN:+ / lượt $RUN} (hết hạn hoặc bot không đổi gì)"; exit 1; }
read -r URL RID SHA AT <<< "$pick"
git merge-base --is-ancestor "$SHA" HEAD 2>/dev/null || echo "⚠ lượt $RID chạy trên $SHA – không phải tổ tiên của HEAD (nhánh đã đổi/rebase): soát kỹ trước khi commit"
T=$(mktemp -d); trap 'rm -rf "$T"' EXIT
api -o "$T/a.zip" "$URL"
# không cho đường dẫn thoát khỏi repo
if unzip -Z1 "$T/a.zip" | grep -qE '(^/|(^|/)\.\.(/|$))'; then echo "✗ artifact có đường dẫn lạ – dừng"; exit 1; fi
unzip -qo "$T/a.zip" -x .bot-output-deleted -d .
n=$(unzip -Z1 "$T/a.zip" | grep -vc '^\.bot-output-deleted$' || true); d=0
if unzip -p "$T/a.zip" .bot-output-deleted > "$T/del" 2>/dev/null; then while IFS= read -r f; do [ -n "$f" ] && rm -f -- "$f" && d=$((d + 1)); done < "$T/del"; fi
echo "✓ bot-output-$NAME (lượt $RID, $AT): $n file ghi, $d file xoá. Soát \`git status\` rồi commit."
