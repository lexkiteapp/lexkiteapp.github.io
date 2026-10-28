#!/usr/bin/env python3
"""Green 2D set clips for the v14 board engine (render_v9): PRO-matted green-screen teachers composited onto a whiteboard background.
  python3 scripts/video/tpl/green_set.py paths --spec S.json                      -> sparse footage paths this spec needs (no numpy)
  python3 scripts/video/tpl/green_set.py build --spec S.json --foot footage [--qa out/green2d]
build: for every family clip the spec uses, writes footage/green2d/clips/<id>.mp4 (+ tools/dl24 copy), measures the head box on the composed
frames and patches content/video/cine/teachers.json (head / anchor of the green2d clips; deterministic, commit the printed values), adds the
family parent to content/video/cine/green2d/bank.json (board_detect.py then measures the board), and gates every clip:
  head_in_frame  the whole matte (hair included) stays >= 40 px inside the top / sides in every frame (owner: never a cut-off head)
  edge_spill     share of matte-edge pixels (0.04 < a < 0.96) whose colour is green-tinted (G > max(R, B) + 12) <= 0.5 % (no green fringe)
  edge_dark      share of edge pixels much darker than the matte interior next to them <= 1 % (no black halo)
  no_upscale     host scale <= 1.0 (owner: never enlarge the teacher)
Host pixels are untouched (owner 26/10 raw host): premultiplied scale (INTER_AREA) + over; the only addition is a soft wall shadow behind.
Config: content/video/cine/green2d/sets.json. 0 credits."""
import os, sys, json, shutil, argparse, subprocess
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(f'{HERE}/../../..')
CFG = json.load(open(f'{ROOT}/content/video/cine/green2d/sets.json')); TRP = f'{ROOT}/content/video/cine/teachers.json'; BANKP = f'{ROOT}/content/video/cine/green2d/bank.json'
SET_ID = 'green2d_board'; W, H, N = 1080, 1916, 121

def fam_of(cid): f, src = cid.split('_', 1); return f, src
def family_clips(f):
    F = CFG['families'][f]; return [f'{f}_{s}' for s in F['talk']] + [f"{f}_{F['listen']}"]
def spec_families(sp): return sorted({fam_of(c)[0] for c in sp['clips'] + sp.get('listen', [])})

def paths(sp):
    p = ['/teachers/tools/amb_classroom.wav']
    for f in spec_families(sp):
        F = CFG['families'][f]; p.append(f"/anchor/bg/{F['bg']}.png")
        for s in list(F['talk']) + [F['listen']]: p += [f'/anchor/green/kfull_pro/{s}.mp4', f'/anchor/green/kmask_pro/{s}.mkv']
    return sorted(set(p))

def build(sp, foot, qa):
    import numpy as np, cv2
    def read(path, gray):
        pf, ch = ('gray', 1) if gray else ('bgr24', 3)
        raw = subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-i', path, '-f', 'rawvideo', '-pix_fmt', pf, '-'], capture_output=True, check=True).stdout
        n = W * H * ch; fr = [np.frombuffer(raw[i * n:(i + 1) * n], np.uint8).reshape((H, W, ch) if ch > 1 else (H, W)) for i in range(len(raw) // n)]
        assert len(fr) >= N, (path, len(fr)); return fr[:N]
    def board_bg(name):   # fit the background's whiteboard to the configured screen box (never more than max_scale)
        B = CFG['board']; im = cv2.imread(f'{foot}/anchor/bg/{name}.png'); hb, wb = im.shape[:2]
        f = im.astype(np.int16); mn = f.min(2); wm = ((mn > 188) & (f.max(2) - mn < 42)).astype(np.uint8)
        wm = cv2.morphologyEx(wm, cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8)); k_, lab, st, _ = cv2.connectedComponentsWithStats(wm)
        cand = [i for i in range(1, k_) if st[i, cv2.CC_STAT_TOP] < 0.6 * hb and st[i, cv2.CC_STAT_WIDTH] > 0.3 * wb]
        assert cand, ('no whiteboard found in', name); i = max(cand, key=lambda i: st[i, cv2.CC_STAT_AREA])
        bx0, by0, bw, bh = (int(st[i, k]) for k in (cv2.CC_STAT_LEFT, cv2.CC_STAT_TOP, cv2.CC_STAT_WIDTH, cv2.CC_STAT_HEIGHT))
        s = max(min(B['max_scale'], B['width'] / bw), W / wb, H / hb)
        ox = min(max(0, bx0 * s - B['left']), wb * s - W); oy = min(max(0, by0 * s - B['top']), hb * s - H)
        M = np.float32([[s, 0, -ox], [0, s, -oy]]); out = cv2.warpAffine(im, M, (W, H), flags=cv2.INTER_LANCZOS4 if s > 1 else cv2.INTER_AREA, borderMode=cv2.BORDER_REFLECT)
        info = dict(bg=name, scale=round(s, 4), crop=[round(ox, 1), round(oy, 1)], board_screen=[round(bx0 * s - ox), round(by0 * s - oy), round((bx0 + bw) * s - ox), round((by0 + bh) * s - oy)])
        return out.astype(np.float32), info
    TR = json.load(open(TRP)); BK = json.load(open(BANKP)) if os.path.exists(BANKP) else dict(clips=[])
    lib = f'{foot}/green2d'; os.makedirs(f'{lib}/clips', exist_ok=True); os.makedirs(f'{lib}/tools/dl24', exist_ok=True)
    if os.path.exists(f'{foot}/teachers/tools/amb_classroom.wav'): shutil.copy(f'{foot}/teachers/tools/amb_classroom.wav', f'{lib}/tools/amb_classroom.wav')
    SH = CFG['shadow']; report = {}; fails = []
    need = set(sp['clips'] + sp.get('listen', []))
    for f in spec_families(sp):
        F = CFG['families'][f]; HO = CFG['hosts'][F['who']]; s = HO['scale']; assert s <= 1.0, 'no_upscale'
        bg, binfo = board_bg(F['bg']); print('family', f, json.dumps(binfo), flush=True)
        ey, em = HO['eye'][1], HO['eye_mouth']; parent = family_clips(f)[0]
        for cid in family_clips(f):
            if cid not in need: continue
            src = fam_of(cid)[1]; FG = read(f'{foot}/anchor/green/kfull_pro/{src}.mp4', False); AL = read(f'{foot}/anchor/green/kmask_pro/{src}.mkv', True)
            uni = np.maximum.reduce(AL) > 128; rows = np.nonzero(uni.any(1))[0]; top = int(rows.min()); neck = int(ey + 2.2 * em)
            xs = np.nonzero(uni[top:neck].any(0))[0]; hx0, hx1 = int(xs.min()), int(xs.max())
            dx = round(HO['eye_x'] - HO['eye'][0] * s); dy = round(1080 - (HO['head_top'] + neck) / 2 * s)   # ONE transform per teacher (same framing in every family clip): eye column + head centre at y 1080 (v14, k = 1.0)
            sw, sh_ = round(W * s), round(H * s)
            hb = [hx0 * s + dx - 8, top * s + dy - 8, hx1 * s + dx + 8, neck * s + dy + 8]; hb = [int(round(v)) for v in hb]
            ok_hf = hb[1] >= 40 and hb[0] >= 40 and hb[2] <= W - 40
            enc = subprocess.Popen(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'bgr24', '-s', f'{W}x{H}', '-r', '24', '-i', '-',
                                    '-c:v', 'libx264', '-preset', 'slow', '-crf', '10', '-pix_fmt', 'yuv420p', '-threads', '1', f'{lib}/clips/{cid}.mp4'], stdin=subprocess.PIPE)
            spill = []; dark = []; tops = []
            for k in range(N):
                a = AL[k].astype(np.float32) / 255; P = FG[k].astype(np.float32) * a[..., None]
                if s != 1.0: P = cv2.resize(P, (sw, sh_), interpolation=cv2.INTER_AREA); a = cv2.resize(a, (sw, sh_), interpolation=cv2.INTER_AREA)
                Pc = np.zeros((H, W, 3), np.float32); Ac = np.zeros((H, W), np.float32)
                x0, y0 = max(0, dx), max(0, dy); x1, y1 = min(W, dx + sw), min(H, dy + sh_)
                Pc[y0:y1, x0:x1] = P[y0 - dy:y1 - dy, x0 - dx:x1 - dx]; Ac[y0:y1, x0:x1] = a[y0 - dy:y1 - dy, x0 - dx:x1 - dx]
                Sa = np.zeros_like(Ac); Sa[SH['dy']:, SH['dx']:] = Ac[:H - SH['dy'], :W - SH['dx']]   # shift without wrap-around
                S = cv2.GaussianBlur(Sa, (0, 0), SH['blur'] / 2) * SH['opacity']
                out = bg * (1 - S)[..., None] * (1 - Ac)[..., None] + Pc
                o8 = np.clip(out + 0.5, 0, 255).astype(np.uint8); enc.stdin.write(o8.tobytes())
                if k % 10 == 0:
                    tops.append(int(np.nonzero((Ac > 0.5).any(1))[0].min()))
                    e = (Ac > 0.04) & (Ac < 0.96); fgc = Pc[e] / np.maximum(Ac[e], 1e-3)[:, None]
                    spill.append(float(np.mean(fgc[:, 1] > np.maximum(fgc[:, 0], fgc[:, 2]) + 12)) if len(fgc) else 0.0)
                    inner = cv2.erode((Ac > 0.98).astype(np.uint8), np.ones((5, 5), np.uint8)); lum = cv2.cvtColor(o8, cv2.COLOR_BGR2GRAY).astype(np.float32)
                    dens = cv2.blur(inner.astype(np.float32), (15, 15)); near = cv2.blur(lum * inner, (15, 15)) / np.maximum(dens, 1e-3)
                    bgl = cv2.cvtColor(np.clip(bg, 0, 255).astype(np.uint8), cv2.COLOR_BGR2GRAY).astype(np.float32)   # halo = edge darker than BOTH the host interior and the wall behind
                    dark.append(float(np.mean((lum[e] < np.minimum(near[e], bgl[e]) - 40) & (dens[e] > 0.2))) if e.any() else 0.0)
                    if k == 60 and qa:
                        os.makedirs(qa, exist_ok=True); cv2.imwrite(f'{qa}/{cid}.jpg', o8, [cv2.IMWRITE_JPEG_QUALITY, 92])
                        cx, cy = (hb[0] + hb[2]) // 2, hb[1] + 40; z = o8[max(0, cy - 60):cy + 60, max(0, cx - 120):cx + 120]; cv2.imwrite(f'{qa}/{cid}.zoom400.png', cv2.resize(z, None, fx=4, fy=4, interpolation=cv2.INTER_NEAREST))
            enc.stdin.close(); assert enc.wait() == 0, ('encode failed', cid); shutil.copy(f'{lib}/clips/{cid}.mp4', f'{lib}/tools/dl24/{cid}.mp4')
            g = dict(head_in_frame=ok_hf and min(tops) >= 40, edge_spill=max(spill) <= 0.005, edge_dark=max(dark) <= 0.01, no_upscale=s <= 1.0)
            report[cid] = dict(gates=g, head=hb, scale=s, offset=[dx, dy], matte_top_min=min(tops), spill_max=round(max(spill), 5), dark_max=round(max(dark), 5), **binfo)
            print(cid, json.dumps(report[cid]), flush=True)
            if not all(g.values()): fails.append((cid, [k for k, v in g.items() if not v]))
            e_ = TR['clips'].get(cid) or {}; e_.update(set=SET_ID, who=F['who'], usable=[0, N - 1], head=hb, anchor=[(hb[0] + hb[2]) // 2, hb[1]], raw=True,
                                                       note=f"green2d family {f}: {src} (PRO matte, outfit {F['outfit']}) on {F['bg']}, scale {s}")
            if cid != parent: e_['parent'] = parent
            mood = F['talk'].get(src)
            if mood: e_['mood'] = mood
            if TR['clips'].get(cid, {}).get('head') not in (None, hb): print(f'::warning::{cid} head box changed {TR["clips"][cid]["head"]} -> {hb} (commit teachers.json)')
            TR['clips'][cid] = e_
        if parent not in {c['id'] for c in BK['clips']}: BK['clips'].append(dict(id=parent, set=SET_ID, framing='medium_standing', size=[W, H], fps=24, frames=N, file=f'green2d/clips/{parent}.mp4', tags=['talk', 'standing', 'whiteboard', '2d', 'green-pro']))
    json.dump(TR, open(TRP, 'w'), indent=1, ensure_ascii=False); open(TRP, 'a').write('\n')
    json.dump(BK, open(BANKP, 'w'), indent=1, ensure_ascii=False); open(BANKP, 'a').write('\n')
    if qa: json.dump(report, open(f'{qa}/green_set.json', 'w'), indent=1)
    if fails: print('::error::green2d gates failed', fails); sys.exit(1)
    print('green2d ok', len(report), 'clips')

if __name__ == '__main__':
    ap = argparse.ArgumentParser(); ap.add_argument('mode', choices=['paths', 'build']); ap.add_argument('--spec', required=True); ap.add_argument('--foot', default='footage'); ap.add_argument('--qa', default='')
    o = ap.parse_args(); sp = json.load(open(o.spec)); tr = json.load(open(TRP))
    if tr['sets'][sp['set']].get('lib') != 'green2d': print('' if o.mode == 'paths' else 'not a green2d spec'); sys.exit(0)
    print(' '.join(paths(sp))) if o.mode == 'paths' else build(sp, o.foot, o.qa)
