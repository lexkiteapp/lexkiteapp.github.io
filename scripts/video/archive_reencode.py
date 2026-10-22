#!/usr/bin/env python3
"""Nén lưu trữ master đã duyệt: HEVC CRF ~20 (libx265), CHỈ giữ bản nén khi SSIM ≥ 0.98 so với bản gốc (và nhỏ hơn).
Không bao giờ ghi đè bản gốc: in JSON {ok, ssim, src_bytes, out_bytes} và chỉ tạo <out> khi đạt. Dùng: archive_reencode.py src.mp4 out.mp4 [--crf 20] [--min-ssim 0.98]
Quy trình (docs/VIDEO.md §5b): master đã duyệt > 90 ngày → chạy trên CI → nếu ok: tải bản nén lên Kho Drive (2 bản) rồi mới gỡ bản gốc cũ."""
import argparse, json, os, re, subprocess, sys

def run(cmd):
    return subprocess.run(cmd, capture_output=True, text=True)

def ssim(a, b):
    r = run(['ffmpeg', '-hide_banner', '-nostdin', '-i', a, '-i', b, '-lavfi', 'ssim', '-f', 'null', '-'])
    m = re.search(r'All:([0-9.]+)', r.stderr)
    return float(m.group(1)) if m else 0.0

def main():
    ap = argparse.ArgumentParser(); ap.add_argument('src'); ap.add_argument('out')
    ap.add_argument('--crf', type=int, default=20); ap.add_argument('--min-ssim', type=float, default=0.98)
    a = ap.parse_args(); tmp = a.out + '.tmp.mp4'
    r = run(['ffmpeg', '-hide_banner', '-nostdin', '-y', '-i', a.src, '-c:v', 'libx265', '-crf', str(a.crf), '-preset', 'slow', '-tag:v', 'hvc1', '-pix_fmt', 'yuv420p', '-c:a', 'copy', '-movflags', '+faststart', tmp])
    if r.returncode: print(json.dumps({'ok': False, 'error': 'ffmpeg'})); return 1
    s = ssim(a.src, tmp); sb, ob = os.path.getsize(a.src), os.path.getsize(tmp)
    ok = s >= a.min_ssim and ob < sb
    if ok: os.replace(tmp, a.out)
    else: os.remove(tmp)
    print(json.dumps({'ok': ok, 'ssim': round(s, 4), 'src_bytes': sb, 'out_bytes': ob, 'saved_pct': round(100 * (1 - ob / sb), 1)}))
    return 0 if ok else 2

if __name__ == '__main__': sys.exit(main())
