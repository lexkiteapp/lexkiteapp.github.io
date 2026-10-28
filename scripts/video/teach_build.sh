#!/usr/bin/env bash
# 👩‍🏫 Giáo viên trong bài học từ clip PHÔNG XANH đã tách nền PRO (footage/anchor/green/{kfull_pro,kmask_pro}, docs/VIDEO.md §anchor):
# cắt khung 3:4 theo bao alpha CHUNG của clip nói + nghe (đủ đầu + khoảng thở trên, không nhảy khi đổi clip), vòng ping-pong liền mạch,
# xuất web/teach/<who>/{talk,listen}.webm (VP9 alpha: Chrome/Android/Firefox) + {talk,listen}.mov (HEVC alpha: Safari/iOS) + poster.webp (alpha).
# Chạy trên CI macOS (.github/workflows/teach-build.yml – cần hevc_videotoolbox). Dùng: teach_build.sh <footage/anchor/green> <out=web/teach>
set -euo pipefail
G=$1; OUT=${2:-web/teach}
W=360; H=480                        # hiển thị ≤ 146 px CSS → đủ nét ở màn 3x
for who in ama carlos; do                  # bash 3.2 của macOS: không có mảng kết hợp
  case $who in ama) t=ga2_talk l=ga2_listen;; carlos) t=gc4_talk_natural l=gc4_listen;; esac; mkdir -p "$OUT/$who"
  # bao alpha (ngưỡng 24/255) gộp mọi khung của cả 2 clip
  read X1 Y1 X2 Y2 < <(for c in $t $l; do ffmpeg -nostats -i "$G/kmask_pro/$c.mkv" -vf "format=gray,bbox=min_val=24" -f null - 2>&1; done \
    | sed -n 's/.*x1:\([0-9]*\) x2:\([0-9]*\) y1:\([0-9]*\) y2:\([0-9]*\).*/\1 \3 \2 \4/p' \
    | awk 'NR==1{a=$1;b=$2;c=$3;d=$4} {if($1<a)a=$1; if($2<b)b=$2; if($3>c)c=$3; if($4>d)d=$4} END{print a,b,c,d}')
  # khung 3:4: trên = đỉnh tóc − 7 % chiều cao khung; cao = 0,52 khung gốc (đầu → hông); giữa theo tâm ngang người
  FH=$(ffprobe -v error -select_streams v -show_entries stream=height -of csv=p=0 "$G/kmask_pro/$t.mkv"); FW=$(ffprobe -v error -select_streams v -show_entries stream=width -of csv=p=0 "$G/kmask_pro/$t.mkv")
  CH=$(( FH * 52 / 100 / 4 * 4 )); CW=$(( CH * 3 / 4 / 2 * 2 )); CY=$(( Y1 - CH * 7 / 100 )); (( CY < 0 )) && CY=0
  CX=$(( (X1 + X2) / 2 - CW / 2 )); (( CX < 0 )) && CX=0; (( CX + CW > FW )) && CX=$(( FW - CW ))
  echo "$who: bbox $X1,$Y1-$X2,$Y2 → crop ${CW}x${CH}+${CX}+${CY}"
  printf '{"who":"%s","talk":"%s","listen":"%s","bbox":[%s,%s,%s,%s],"crop":[%s,%s,%s,%s],"size":[%s,%s]}\n' $who $t $l $X1 $Y1 $X2 $Y2 $CX $CY $CW $CH $W $H > "$OUT/$who/teach.json"
  for k in talk listen; do
    c=$([ $k = talk ] && echo $t || echo $l)
    F="[1:v]format=gray[a];[0:v][a]alphamerge,crop=$CW:$CH:$CX:$CY,scale=$W:$H:flags=lanczos,split[f][r];[r]reverse[b];[f][b]concat=n=2:v=1,format=yuva420p"
    ffmpeg -v error -y -i "$G/kfull_pro/$c.mp4" -i "$G/kmask_pro/$c.mkv" -filter_complex "$F" -an -c:v libvpx-vp9 -pix_fmt yuva420p -crf 36 -b:v 0 -row-mt 1 -auto-alt-ref 0 -deadline good "$OUT/$who/$k.webm"
    ffmpeg -v error -y -i "$G/kfull_pro/$c.mp4" -i "$G/kmask_pro/$c.mkv" -filter_complex "${F/yuva420p/bgra}" -an -c:v hevc_videotoolbox -alpha_quality 0.8 -q:v 55 -tag:v hvc1 -movflags +faststart "$OUT/$who/$k.mov"
  done
  ffmpeg -v error -y -i "$G/kfull_pro/$t.mp4" -i "$G/kmask_pro/$t.mkv" -filter_complex "[1:v]format=gray[a];[0:v][a]alphamerge,crop=$CW:$CH:$CX:$CY,scale=$W:$H:flags=lanczos" -frames:v 1 -c:v libwebp -lossless 0 -q:v 85 "$OUT/$who/poster.webp"
  ls -la "$OUT/$who"
done
