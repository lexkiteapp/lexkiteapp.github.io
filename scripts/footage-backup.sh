#!/usr/bin/env bash
# Sao lưu kho footage điện ảnh (brand/library/cine – không nằm trong repo chính).
# Từ 22/10/2026: BẢN GỐC media (mp4/mkv/png/wav/npz… và mọi file ≥ 1 MB) → Kho Drive, 2 bản/2 Drive khác nhau, chống trùng sha256
#   (scripts/footage/archive.mjs → brand/library/cine/archive-manifest.json). Repo riêng tư lexkiteapp/lexkite-footage chỉ nhận manifest + file nhỏ.
# Chạy lại bất cứ lúc nào (idempotent, tiếp tục được). Bản sao git cục bộ: ~/.config/lexkite/footage-repo
#   --legacy-binaries : CŨNG đẩy media vào lexkite-footage (chỉ khi cine-render/matte-pro cần clone cảnh mới trước khi chúng chuyển sang restore.mjs)
#   --no-drive        : bỏ bước Kho Drive (chỉ git)
# Khôi phục: node scripts/footage/restore.mjs --out brand/library/cine [--match regex]. Kiểm: .github/workflows/footage-verify.yml. Kế hoạch: docs/VIDEO.md §Kho footage.
set -e
REPO="$(cd "$(dirname "$0")/.." && pwd)"; SRC="$REPO/brand/library/cine/"
DST="$HOME/.config/lexkite/footage-repo"
LEGACY=0; DRIVE=1; for a in "$@"; do case "$a" in --legacy-binaries) LEGACY=1;; --no-drive) DRIVE=0;; esac; done
GH="http.extraheader=Authorization: Basic $(printf 'x-access-token:%s' "$(gh auth token 2>/dev/null)" | base64)"
URL=https://github.com/lexkiteapp/lexkite-footage.git
if [ "$DRIVE" = 1 ]; then
  node "$REPO/scripts/footage/archive.mjs" --root "$SRC" || { echo "✗ footage: bước Kho Drive lỗi (xem trên) – KHÔNG đẩy git để khỏi mất đồng bộ"; exit 1; }
fi
[ -d "$DST/.git" ] || { mkdir -p "$DST"; git -C "$DST" init -q -b main; git -C "$DST" remote add origin "$URL"; }
if [ "$LEGACY" = 1 ]; then
  rsync -a --exclude '.git' --exclude 'render*/' --exclude '*.raw' --exclude '__pycache__/' "$SRC" "$DST/"   # không --delete: binary cũ giữ nguyên
else
  node "$REPO/scripts/footage/small-list.mjs" "$SRC" | rsync -a --from0 --files-from=- "$SRC" "$DST/"            # chỉ file nhỏ (json/py/txt/…)
  cp "$SRC/archive-manifest.json" "$DST/archive-manifest.json" 2>/dev/null || true
fi
cd "$DST"
git add -A
git diff --cached --quiet && { echo "✓ footage: không có thay đổi"; exit 0; }
git -c user.name=Lexkite -c user.email=lexkiteapp@users.noreply.github.com commit -qm "Sao lưu footage $(date +%Y-%m-%d\ %H:%M)"
git -c "$GH" push -q origin main && echo "✓ footage: đã đẩy lexkite-footage (riêng tư), pack $(du -sh .git | cut -f1)"
