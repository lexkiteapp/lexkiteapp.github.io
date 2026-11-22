#!/usr/bin/env bash
# Đẩy web/packs/*.json do bot sinh lên main AN TOÀN: mỗi lần thử (push-main.sh), trên main mới nhất
# đặt lại các gói bot vừa đổi rồi ÁP LẠI bảng nghĩa tay (--gloss-only); pack-gloss là cổng, đỏ → KHÔNG đẩy.
# Dùng chung cho word-packs.yml và lexicon-i18n.yml (14/11: word-packs đẩy [skip ci] không qua cổng → đè bảng tay pt/fr/ja/th, main đỏ).
# 22/11: nghĩa đổi → content/seo/home-words.json + trang chủ web/<lang>/index.html (dẫn xuất từ gói nghĩa) cũ → main đỏ (home-words, landing-routing);
# chỉ khi cần: sinh lại cả hai cùng commit (npm ci chỉ khi chưa có node_modules).
# Cách dùng: bash scripts/ci/push-packs.sh "<thông điệp commit>"
set -euo pipefail
MSG="${1:?thiếu thông điệp commit}"
SAVE=$(mktemp -d); export SAVE
git status --porcelain -uall web/packs | cut -c4- > "$SAVE/list"
[ -s "$SAVE/list" ] || { echo "gói nghĩa không đổi"; exit 0; }
tar -cf "$SAVE/packs.tar" -T "$SAVE/list"
PUSH_MAIN_REGEN='tar -xf "$SAVE/packs.tar"; for L in $(sed -n "s#^web/packs/\([a-z][a-z]\)\.json\$#\1#p" "$SAVE/list"); do node scripts/gen-word-packs.mjs "$L" --gloss-only; done; node scripts/test/pack-gloss.mjs || { echo "::error::pack-gloss đỏ sau khi đặt lại – KHÔNG đẩy main"; exit 1; }; if ! node scripts/seo/home-words.mjs --check >/dev/null 2>&1; then node scripts/seo/home-words.mjs && { [ -d node_modules/jsdom ] || npm ci --no-audit --no-fund >/dev/null; } && node scripts/build-landing.mjs || { echo "::error::home-words/build-landing lỗi – KHÔNG đẩy main"; exit 1; }; fi' \
  bash scripts/ci/push-main.sh "$MSG" web/packs content/seo/home-words.json web/index.html web/??/index.html
