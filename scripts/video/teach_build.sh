#!/usr/bin/env bash
# 👩‍🏫 Giáo viên trong bài học từ clip PHÔNG XANH đã tách nền PRO (footage/anchor/green/{kfull_pro,kmask_pro}, docs/VIDEO.md §anchor):
# cắt khung 3:4 theo bao alpha CHUNG của clip nói + nghe (đủ đầu + khoảng thở trên, không nhảy khi đổi clip), vòng ping-pong liền mạch,
# xuất web/teach/<who>/{talk,listen}.mp4 = H.264 "xếp chồng" (nửa trên màu, nửa dưới alpha – mọi trình duyệt, giải mã phần cứng; app ghép alpha bằng WebGL)
# + poster.webp (alpha) + teach.json. Chạy trên CI (.github/workflows/teach-build.yml). Dùng: teach_build.sh <footage/anchor/green> <out=web/teach>
set -euo pipefail
G=$1; OUT=${2:-web/teach}
W=360; H=480                        # hiển thị ≤ 146 px CSS → đủ nét ở màn 3x
for who in ama carlos; do
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
  # 🚧 cổng: đầu không bị cắt (đỉnh tóc nằm dưới mép trên khung ≥ 3 %), thân không tràn ngang khung (trừ tay/vai lấn ≤ 4 %)
  (( Y1 - CY >= CH * 3 / 100 )) || { echo "::error::$who: đỉnh đầu sát/mất mép trên ($Y1 vs $CY)"; exit 1; }
  (( X1 >= CX - CW * 4 / 100 && X2 <= CX + CW + CW * 4 / 100 )) || { echo "::error::$who: người tràn ngang khung ($X1-$X2 vs $CX+$CW)"; exit 1; }
  printf '{"who":"%s","talk":"%s","listen":"%s","bbox":[%s,%s,%s,%s],"crop":[%s,%s,%s,%s],"size":[%s,%s]}\n' $who $t $l $X1 $Y1 $X2 $Y2 $CX $CY $CW $CH $W $H > "$OUT/$who/teach.json"
  for k in talk listen; do
    c=$([ $k = talk ] && echo $t || echo $l)
    FPS=$(ffprobe -v error -select_streams v -show_entries stream=r_frame_rate -of csv=p=0 "$G/kfull_pro/$c.mp4")   # vd. 24/1 – ghi rõ, không để ffmpeg tự đoán
    # màu & alpha phải cùng số khung (lệch 1 khung → viền lệch hình): cắt cả hai về N = số khung ít hơn
    N=$(for f in "$G/kfull_pro/$c.mp4" "$G/kmask_pro/$c.mkv"; do ffprobe -v error -count_frames -select_streams v -show_entries stream=nb_read_frames -of csv=p=0 "$f"; done | sort -n | head -1)
    # màu đã nhân alpha sẵn (viền không ánh xanh/đen) ở trên, alpha xám ở dưới; vòng ping-pong liền mạch
    F="[1:v]trim=end_frame=$N,setpts=PTS-STARTPTS,format=gray,crop=$CW:$CH:$CX:$CY,scale=$W:$H:flags=lanczos,split[a1][a2];[0:v]trim=end_frame=$N,setpts=PTS-STARTPTS,crop=$CW:$CH:$CX:$CY,scale=$W:$H:flags=lanczos,format=rgba[c];[c][a1]alphamerge,premultiply=inplace=1,format=rgb24[pm];[a2]format=rgb24[ar];[pm][ar]vstack=2,split[f][r];[r]reverse,trim=start_frame=1:end_frame=$((N-1)),setpts=N/$FPS/TB[b];[f][b]concat=n=2:v=1,setpts=N/$FPS/TB,format=yuv420p"
    ffmpeg -v error -y -i "$G/kfull_pro/$c.mp4" -i "$G/kmask_pro/$c.mkv" -filter_complex "$F" -an -r "$FPS" -c:v libx264 -profile:v main -preset veryslow -crf 26 -tune animation -movflags +faststart "$OUT/$who/$k.mp4"
  done
  ffmpeg -v error -y -i "$G/kfull_pro/$t.mp4" -i "$G/kmask_pro/$t.mkv" -filter_complex "[1:v]format=gray[a];[0:v][a]alphamerge,crop=$CW:$CH:$CX:$CY,scale=$W:$H:flags=lanczos" -frames:v 1 -c:v libwebp -lossless 0 -q:v 85 "$OUT/$who/poster.webp"
  # 🚧 cổng: giải mã đủ khung, đúng cỡ xếp chồng, ngân sách ≤ 420 KB/giáo viên
  for k in talk listen; do c=$([ $k = talk ] && echo $t || echo $l); N=$(for f in "$G/kfull_pro/$c.mp4" "$G/kmask_pro/$c.mkv"; do ffprobe -v error -count_frames -select_streams v -show_entries stream=nb_read_frames -of csv=p=0 "$f"; done | sort -n | head -1)
    n=$(ffprobe -v error -count_frames -select_streams v -show_entries stream=nb_read_frames,width,height -of csv=p=0 "$OUT/$who/$k.mp4")
    [ "$n" = "$W,$((H*2)),$((2*N-2))" ] || { echo "::error::$who/$k.mp4: $n (cần $W,$((H*2)),$((2*N-2)))"; exit 1; }; done
  KB=$(( $(cat "$OUT/$who"/{talk,listen}.mp4 "$OUT/$who/poster.webp" | wc -c) / 1024 )); echo "$who: $KB KB"; (( KB <= 420 )) || { echo "::error::$who vượt ngân sách: $KB KB"; exit 1; }
  ls -la "$OUT/$who"
done
