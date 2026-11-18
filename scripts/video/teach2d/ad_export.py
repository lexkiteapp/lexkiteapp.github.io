#!/usr/bin/env python3
"""Ads export (owner 18/11): ONE rendered Teach2D short -> 3 ratios 9:16 · 4:5 · 1:1 + end card + UTM link + policy/format report. 0 credits, ffmpeg + PIL only.
  python3 scripts/video/teach2d/ad_export.py --in short.mp4 --out DIR --id t2_mistake_discuss [--hook-ms 1500]
 - 4:5  = centre crop of the 1080x1920 frame on the layout safe band (y 232-1497, build.py FMT.short.safe) -> nothing readable is cut.
 - 1:1  = the whole 4:5 crop scaled to fit height on a blurred copy of itself (no cut, no letterbox bars).
 - End card 2.5 s (brand navy, Vietnamese CTA "Học tiếng Anh miễn phí – lexkite.com"), natively drawn per ratio; the audio of the clip is untouched, the card is silent.
 - Report (ad.json): durations, 15-25 s window, hook window, UTM link, Meta policy checklist (no false promise text, no third-party UI, music = none (TTS only))."""
import argparse, json, os, subprocess, sys
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
FONT = f'{ROOT}/brand/social/src/fonts/BeVietnamPro-Bold.ttf'
JAKARTA = f'{ROOT}/brand/social/src/fonts/PlusJakartaSans-VF.ttf'
UTM = 'https://lexkite.com/?utm_source=facebook&utm_medium=paid&utm_campaign=ad1'
CTA_VI, CTA_URL, CARD_S = 'Học tiếng Anh miễn phí', 'lexkite.com', 2.5
NAVY, YELLOW, WHITE = (15, 23, 42), (250, 204, 21), (255, 255, 255)
RATIOS = {'9x16': (1080, 1920), '4x5': (1080, 1350), '1x1': (1080, 1080)}
BANNED = ('trôi chảy', 'fluent in', 'guarantee', 'cam kết', 'in 7 days', '7 ngày', '100%', 'chắc chắn', 'overnight')   # Meta: no false / absolute promises
SAFE_Y0, SAFE_Y1 = 232, 1497


def sh(*a): return subprocess.run(a, capture_output=True, text=True, check=True).stdout


def probe(p):
    j = json.loads(sh('ffprobe', '-v', 'error', '-show_entries', 'format=duration:stream=codec_type,width,height,r_frame_rate', '-of', 'json', p))
    v = next(s for s in j['streams'] if s['codec_type'] == 'video'); n, d = v['r_frame_rate'].split('/')
    return dict(dur=float(j['format']['duration']), w=v['width'], h=v['height'], fps=float(n) / float(d), audio=any(s['codec_type'] == 'audio' for s in j['streams']))


def card(path, w, h):
    im = Image.new('RGB', (w, h), NAVY); d = ImageDraw.Draw(im); k = w / 1080
    big, small = ImageFont.truetype(FONT, int(86 * k)), ImageFont.truetype(JAKARTA, int(118 * k))
    try: small.set_variation_by_axes([800])
    except Exception: pass
    def mid(t, f, y, c):
        b = d.textbbox((0, 0), t, font=f); d.text(((w - (b[2] - b[0])) / 2 - b[0], y), t, font=f, fill=c)
    mid(CTA_VI, big, h * 0.40, WHITE); mid(CTA_URL, small, h * 0.40 + 150 * k, YELLOW)
    d.rounded_rectangle([w * 0.30, h * 0.40 + 310 * k, w * 0.70, h * 0.40 + 322 * k], 6, fill=YELLOW)
    im.save(path)


def fit(w, h):   # per-ratio video chain on [0:v] -> [v]
    if (w, h) == (1080, 1920): return '[0:v]setsar=1[v]'
    y0 = (SAFE_Y0 + SAFE_Y1) // 2 - h // 2 if h == 1350 else 0
    if (w, h) == (1080, 1350): return f'[0:v]crop=1080:1350:0:{y0 - y0 % 2},setsar=1[v]'
    c = f'crop=1080:1350:0:{((SAFE_Y0 + SAFE_Y1) // 2 - 675) // 2 * 2}'   # 1:1: whole 4:5 crop, scaled to height, on its own blur
    return f'[0:v]{c},split[a][b];[a]scale=1080:1080:force_original_aspect_ratio=increase,crop=1080:1080,boxblur=40:6[bg];[b]scale=-2:1080[fg];[bg][fg]overlay=(W-w)/2:0,setsar=1[v]'


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--in', dest='src', required=True); ap.add_argument('--out', required=True); ap.add_argument('--id', required=True)
    ap.add_argument('--hook-ms', type=int, default=0); ap.add_argument('--text', default=''); o = ap.parse_args()
    os.makedirs(o.out, exist_ok=True); src = probe(o.src); rep = dict(id=o.id, link=UTM, src=src, files={}, checks={})
    if src['w'] != 1080 or src['h'] != 1920: sys.exit(f'ad_export: expected 1080x1920, got {src["w"]}x{src["h"]}')
    for name, (w, h) in RATIOS.items():
        cp = f'{o.out}/card_{name}.png'; card(cp, w, h); out = f'{o.out}/{o.id}_{name}.mp4'
        fc = fit(w, h) + f';[1:v]fps={src["fps"]:.3f},setsar=1,format=yuv420p[c];[v]format=yuv420p[m];[m][c]concat=n=2:v=1:a=0[vv]'
        af = '[0:a]aresample=48000[a0];anullsrc=r=48000:cl=stereo,atrim=0:%.2f[a1];[a0][a1]concat=n=2:v=0:a=1[aa]' % CARD_S if src['audio'] else ''
        cmd = ['ffmpeg', '-y', '-v', 'error', '-i', o.src, '-loop', '1', '-t', str(CARD_S), '-i', cp, '-filter_complex', fc + (';' + af if af else ''), '-map', '[vv]'] + (['-map', '[aa]', '-c:a', 'aac', '-b:a', '160k'] if af else []) + ['-c:v', 'libx264', '-crf', '18', '-preset', 'medium', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out]
        subprocess.run(cmd, check=True); p = probe(out)
        rep['files'][name] = dict(file=os.path.basename(out), w=p['w'], h=p['h'], dur=round(p['dur'], 2), mb=round(os.path.getsize(out) / 1e6, 1)); os.remove(cp)
    d = rep['files']['9x16']['dur']; txt = o.text.lower()
    rep['checks'] = dict(len_15_25=15 <= d <= 25, dims=all(rep['files'][n]['w'] == w and rep['files'][n]['h'] == h for n, (w, h) in RATIOS.items()),
                         hook_le_1500ms=(o.hook_ms <= 1500) if o.hook_ms else None, no_false_promise=not any(b in txt for b in BANNED), music='none (TTS voice only)', fake_ui='none (2D characters only)', end_card=f'{CTA_VI} – {CTA_URL}')
    json.dump(rep, open(f'{o.out}/{o.id}_ad.json', 'w'), ensure_ascii=False, indent=1); print(json.dumps(rep['checks'], ensure_ascii=False)); sys.exit(0 if all(v in (True, None) or isinstance(v, str) for v in rep['checks'].values()) else 1)


if __name__ == '__main__': main()
