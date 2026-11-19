# Render bộ câu thử bằng ElevenLabs (chỉ CI – .github/workflows/tts-ab.yml, docs/TTS-AB.md). Theo docs/CREDIT-RULES.md:
#   --phase dryrun : 0 credit. In từng cấu hình × số ký tự × credit dự kiến; có khóa thì đọc thêm số dư tài khoản + kiểm giọng (API đọc, 0 credit).
#   --phase pilot  : ~300 ký tự (PILOT, cấu hình E1) để nghe/chấm trước. --phase batch: phần còn lại của kế hoạch (bỏ mục đã có file).
# Trần cứng: --cap (credit tối đa lượt này) và APPROVED_TOTAL (chủ duyệt 1/11: tổng ≤ 10.000 cho cả việc) – tính thận trọng 1 credit/ký tự
# cho MỌI model (flash thật ra 0,5) nên không thể vượt. 2 lỗi liên tiếp → DỪNG (exit 1). Sổ: <out>/ledger-<run>.json + bảng ở GITHUB_STEP_SUMMARY.
# Khóa API: biến môi trường ELEVENLABS_API_KEY (secret repo) – KHÔNG bao giờ in ra.
import argparse, json, os, sys, time, urllib.error, urllib.request
API = 'https://api.elevenlabs.io'
APPROVED_TOTAL = 10000          # credit chủ duyệt cho toàn bộ phép thử – chỉ được giảm
PLAN_MAX = 7500                 # ngân sách kế hoạch (còn ~2.500 dự phòng cho render lại)
RATE = {'eleven_multilingual_v2': 1.0, 'eleven_flash_v2_5': 0.5}   # credit/ký tự theo bảng giá ElevenLabs – chỉ để báo cáo
# Giọng có sẵn (premade, giọng Mỹ) – tra lại bằng /v1/voices khi có quyền đọc; đổi được bằng --voices
VOICES = {'ama': ['EXAVITQu4vr4xnSDxMaL', 'cgSgspJ2msm6clMCkdW9'],      # Sarah, Jessica
          'carlos': ['nPczCjzI2devNBz1zQrb', 'iP95p4xoKVk53GoZ742B']}   # Brian, Chris
CFG = {  # tên → (model, chỉ số giọng, tập câu)
    'el-v2-a': ('eleven_multilingual_v2', 0, 'all'),
    'el-v2-b': ('eleven_multilingual_v2', 1, 'core'),
    'el-flash-a': ('eleven_flash_v2_5', 0, 'core'),
}
PILOT = ['word01', 'ex01', 'word02', 'ex02', 'line01', 'line03', 'hard01', 'hard07', 'hard11', 'line02']  # ~300 ký tự, cũng là một phần của el-v2-a (batch không render lại)

ap = argparse.ArgumentParser()
ap.add_argument('--phase', choices=['dryrun', 'pilot', 'batch'], default='dryrun')
ap.add_argument('--texts', default='.tts-ab/texts.json'); ap.add_argument('--out', default='.tts-ab/audio')
ap.add_argument('--cap', type=int, default=0, help='credit tối đa cho lượt này (bắt buộc > 0 khi pilot/batch)')
ap.add_argument('--speed', type=float, default=0.9, help='voice_settings.speed (0.7–1.2); nhịp ≤ 150 wpm')
ap.add_argument('--voices', default='', help='JSON {"ama":[id1,id2],"carlos":[id1,id2]} thay bảng mặc định')
a = ap.parse_args()
if a.voices: VOICES.update(json.loads(a.voices))
T = json.load(open(a.texts)); items = {i['id']: i for i in T['items']}
KEY = os.environ.get('ELEVENLABS_API_KEY', '').strip()
md = []; say = lambda s: (print(s), md.append(s))

def text_of(i, subset):
    return T['storyCore'] if (subset == 'core' and i['cat'] == 'story') else i['text']
def plan():
    jobs = []
    for name, (model, vi, subset) in CFG.items():
        for i in T['items']:
            if subset == 'all' or i['core']:
                jobs.append(dict(cfg=name, id=i['id'], model=model, voice=VOICES[i['who']][vi], who=i['who'], text=text_of(i, subset)))
    return jobs
def req(path, body=None, stream=False):
    r = urllib.request.Request(API + path, data=json.dumps(body).encode() if body is not None else None, method='POST' if body is not None else 'GET',
                               headers={'xi-api-key': KEY, 'Content-Type': 'application/json', 'Accept': 'audio/mpeg' if stream else 'application/json'})
    return urllib.request.urlopen(r, timeout=120)
def subscription():
    try:
        with req('/v1/user/subscription') as r: s = json.load(r)
        return int(s.get('character_count', 0)), int(s.get('character_limit', 0)), s.get('tier', '?')
    except Exception as e: return None, None, f'không đọc được ({getattr(e, "code", type(e).__name__)} – khóa thiếu quyền user_read?)'

jobs = plan(); total = sum(len(j['text']) for j in jobs)
say(f'## ElevenLabs – kế hoạch ({a.phase})')
say('| cấu hình | model | mục | ký tự | credit dự kiến (giá thật) | trần tính (1/ký tự) |\n|---|---|---|---|---|---|')
for name, (model, _, _) in CFG.items():
    js = [j for j in jobs if j['cfg'] == name]; c = sum(len(j['text']) for j in js)
    say(f'| {name} | {model} | {len(js)} | {c} | {c * RATE[model]:.0f} | {c} |')
say(f'| **tổng** | | {len(jobs)} | {total} | {sum(len(j["text"]) * RATE[j["model"]] for j in jobs):.0f} | {total} |')
if total > PLAN_MAX: sys.exit(f'✗ kế hoạch {total} ký tự > ngân sách {PLAN_MAX} – sửa scripts/tts-ab/texts.mjs, không nới trần')
pilot = [j for j in jobs if j['cfg'] == 'el-v2-a' and j['id'] in PILOT]
say(f'Pilot: {len(pilot)} mục · {sum(len(j["text"]) for j in pilot)} ký tự: ' + ' | '.join(j['text'] for j in pilot))
if not KEY:
    say('Chưa có secret ELEVENLABS_API_KEY → chỉ dry-run (0 credit).'); a.phase = 'dryrun'
else:
    used, limit, tier = subscription()
    say(f'Tài khoản: gói {tier} · đã dùng {used} / {limit} credit kỳ này' if used is not None else f'Tài khoản: {tier}')
    try:  # kiểm giọng (0 credit)
        with req('/v1/voices') as r: have = {v['voice_id']: v for v in json.load(r)['voices']}
        for w, ids in VOICES.items():
            for vid in ids:
                v = have.get(vid); say(f'- {w}: {vid} → ' + (f'{v["name"]} ({(v.get("labels") or {}).get("accent", "?")})' if v else 'KHÔNG có trong tài khoản'))
    except Exception as e: say(f'- (không đọc được danh sách giọng: {getattr(e, "code", type(e).__name__)} – vẫn dùng ID mặc định)')
if a.phase == 'dryrun':
    if os.environ.get('GITHUB_STEP_SUMMARY'): open(os.environ['GITHUB_STEP_SUMMARY'], 'a').write('\n'.join(md) + '\n')
    sys.exit(0)

# ---- tiêu credit (pilot / batch)
if a.cap <= 0: sys.exit('✗ thiếu --cap (trần credit lượt này)')
todo = pilot if a.phase == 'pilot' else jobs
os.makedirs(a.out, exist_ok=True); LED = os.path.join(a.out, f"ledger-{os.environ.get('GITHUB_RUN_ID', 'local')}.json")  # mỗi lượt 1 sổ (gộp nhiều lượt không đè)
led = json.load(open(LED)) if os.path.exists(LED) else []
spent, fails, done = 0, 0, 0
for j in todo:
    d = os.path.join(a.out, j['cfg']); f = os.path.join(d, j['id'] + '.mp3'); os.makedirs(d, exist_ok=True)
    if os.path.exists(f) and os.path.getsize(f) > 1000: continue           # đã có (pilot / lượt trước) → không tốn lại
    cost = len(j['text'])                                                     # trần tính 1 credit/ký tự cho mọi model
    if spent + cost > a.cap: say(f'⏹ chạm trần lượt này ({spent} + {cost} > {a.cap}) – dừng'); break
    used, limit, _ = subscription()
    if used is not None and used + cost > APPROVED_TOTAL: say(f'⏹ tài khoản đã dùng {used}; thêm {cost} sẽ vượt mức chủ duyệt {APPROVED_TOTAL} – dừng'); break
    body = dict(text=j['text'], model_id=j['model'], seed=7,
                voice_settings=dict(stability=0.5, similarity_boost=0.75, style=0.0, use_speaker_boost=True, speed=a.speed))
    t0 = time.time(); row = dict(t=time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), run=os.environ.get('GITHUB_RUN_ID', 'local'), phase=a.phase,
                                 cfg=j['cfg'], id=j['id'], model=j['model'], chars=len(j['text']), est=len(j['text']) * RATE[j['model']])
    try:
        with req(f'/v1/text-to-speech/{j["voice"]}/stream?output_format=mp3_44100_128', body, stream=True) as r:
            first = r.read(4096); ttfb = time.time() - t0; rest = r.read()
            hdr = {k.lower(): v for k, v in r.headers.items() if 'character' in k.lower()}
        open(f, 'wb').write(first + rest)
        row.update(status='ok', ttfb_ms=round(ttfb * 1000), total_ms=round((time.time() - t0) * 1000), bytes=len(first) + len(rest), headers=hdr)
        spent += cost; fails = 0; done += 1
        json.dump(dict(ttfb_ms=row['ttfb_ms'], total_ms=row['total_ms'], voice=j['voice'], model=j['model'], speed=a.speed, text=j['text']),
                  open(f[:-4] + '.json', 'w'))
    except urllib.error.HTTPError as e:
        msg = e.read()[:300].decode('utf8', 'replace'); row.update(status=f'http {e.code}', error=msg); fails += 1
        if e.code in (401, 402, 403): fails = 2                               # khóa/quyền/hết credit: thử tiếp vô ích
    except Exception as e:
        row.update(status='error', error=f'{type(e).__name__}: {e}'[:300]); fails += 1
    led.append(row); json.dump(led, open(LED, 'w'), indent=1)
    print(f'{row["status"]:>8} {j["cfg"]:<11} {j["id"]:<8} {len(j["text"]):>4} ký tự' + (f' · TTFB {row.get("ttfb_ms")} ms' if row['status'] == 'ok' else f' · {row.get("error", "")}'))
    if fails >= 2: say('✗ 2 lỗi liên tiếp → DỪNG theo docs/CREDIT-RULES.md'); break
used, limit, _ = subscription()
say(f'## Sổ chi lượt này: {done} file · trần tính {spent} credit (≤ {a.cap})' + (f' · tài khoản đã dùng {used}/{limit}' if used is not None else '')
    + f' · tổng chủ duyệt {APPROVED_TOTAL}')
if os.environ.get('GITHUB_STEP_SUMMARY'): open(os.environ['GITHUB_STEP_SUMMARY'], 'a').write('\n'.join(md) + '\n')
sys.exit(1 if fails >= 2 else 0)
