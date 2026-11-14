#!/usr/bin/env bash
# Đẩy web/packs/*.json do bot sinh lên main AN TOÀN: mỗi lần thử (push-main.sh), trên main mới nhất
# đặt lại các gói bot vừa đổi rồi ÁP LẠI bảng nghĩa tay (--gloss-only); pack-gloss là cổng, đỏ → KHÔNG đẩy.
# Dùng chung cho word-packs.yml và lexicon-i18n.yml (14/11: word-packs đẩy [skip ci] không qua cổng → đè bảng tay pt/fr/ja/th, main đỏ).
# Cách dùng: bash scripts/ci/push-packs.sh "<thông điệp commit>"
set -euo pipefail
MSG="${1:?thiếu thông điệp commit}"
SAVE=$(mktemp -d); export SAVE
git status --porcelain -uall web/packs | cut -c4- > "$SAVE/list"
[ -s "$SAVE/list" ] || { echo "gói nghĩa không đổi"; exit 0; }
tar -cf "$SAVE/packs.tar" -T "$SAVE/list"
PUSH_MAIN_REGEN='tar -xf "$SAVE/packs.tar"; for L in $(sed -n "s#^web/packs/\([a-z][a-z]\)\.json\$#\1#p" "$SAVE/list"); do node scripts/gen-word-packs.mjs "$L" --gloss-only; done; node scripts/test/pack-gloss.mjs || { echo "::error::pack-gloss đỏ sau khi đặt lại – KHÔNG đẩy main"; exit 1; }' \
  bash scripts/ci/push-main.sh "$MSG" web/packs
