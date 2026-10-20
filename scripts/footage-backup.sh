#!/usr/bin/env bash
# Sao lưu kho footage điện ảnh (brand/library/cine – không nằm trong repo chính) lên repo RIÊNG TƯ lexkiteapp/lexkite-footage.
# Chạy lại bất cứ lúc nào (chỉ đẩy phần thay đổi). Bản sao git cục bộ: ~/.config/lexkite/footage-repo
set -e
SRC="$(cd "$(dirname "$0")/.." && pwd)/brand/library/cine/"
DST="$HOME/.config/lexkite/footage-repo"
GH="http.extraheader=Authorization: Basic $(printf 'x-access-token:%s' "$(gh auth token 2>/dev/null)" | base64)"
URL=https://github.com/lexkiteapp/lexkite-footage.git
[ -d "$DST/.git" ] || { mkdir -p "$DST"; git -C "$DST" init -q -b main; git -C "$DST" remote add origin "$URL"; }
rsync -a --delete --exclude '.git' --exclude 'render*/' --exclude '*.raw' --exclude '__pycache__/' "$SRC" "$DST/"
cd "$DST"
git add -A
git diff --cached --quiet && { echo "✓ footage: không có thay đổi"; exit 0; }
git -c user.name=Lexkite -c user.email=lexkiteapp@users.noreply.github.com commit -qm "Sao lưu footage $(date +%Y-%m-%d\ %H:%M)"
git -c "$GH" push -q origin main && echo "✓ footage: đã đẩy $(du -sh . | cut -f1) lên lexkite-footage (riêng tư)"
