#!/usr/bin/env bash
# Một biến thể ảnh cảnh với ứng viên VẼ KHI CẦN (01/11 hướng b, vòng 2 – pilot run 41295217335: vẽ sẵn 2 ứng viên → 210 neuron/ảnh nhận):
#   vẽ ứng viên 1 → lọc cục bộ (không thị giác) → ứng viên 2 chỉ cho khoá trượt cục bộ → giám khảo (ứng viên tốt nhất)
#   → khoá trượt giám khảo còn ứng viên → vẽ ứng viên 2 → chấm ứng viên mới (--recand). VIMG_CANDS ≤ 1 = vẽ + chấm như cũ.
#   cand-round.sh <attempt> <shard i/n> [tham số thêm cho scene-gen, vd. --only retry.json]
set -u
A=$1; SH=$2; shift 2
G="node scripts/vocab-img/scene-gen.mjs --keys keys.json --out $OUT --attempt $A --shard $SH"
J="python3 scripts/vocab-img/local_judge.py --dir $OUT --attempt $A"
if [ "${VIMG_CANDS:-1}" -le 1 ]; then $G "$@" || true; ls $OUT/raw/*.a$A.jpg >/dev/null 2>&1 && $J; exit 0; fi
VIMG_CANDS=1 $G "$@" || true
ls $OUT/raw/*.a$A.jpg >/dev/null 2>&1 || exit 0
$J --prefilter
$G "$@" --cands-only $OUT/cand2.a$A.json || true
$J
[ -f $OUT/EXHAUSTED ] && exit 0
$G "$@" --cands-only $OUT/recand.a$A.json || true
$J --recand
