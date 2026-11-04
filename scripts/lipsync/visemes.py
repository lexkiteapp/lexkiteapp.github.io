"""Bảng viseme CHUNG cho video (đọc web/js/call/visemes.json – cùng bảng với web/js/call/lipsync.js và scripts/lipsync/call_cues.mjs).
shape_at(cues, t) = đúng hình mặt vẽ web hiện ở thời điểm t (LipSync.stateAt + LipFace.machine: đi trước LEAD, đổi hình ở giữa khoảng trộn BLEND)
→ cùng câu, cùng mốc → cùng chuỗi hình ở web và video (scripts/test/lipsync-cross.mjs).
decode(entry) giải mốc nén trong web/js/call/cues.js ([ms, "Hình+ms …", độ lớn tiếng]) → cues kiểu Rhubarb [{start,end,value}].
CLI: python3 scripts/lipsync/visemes.py sample <cues.json> <fps> → in chuỗi hình mỗi khung (cues.json: {mouthCues:[…]} hoặc mảng)."""
import json, os, sys
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
VIS = json.load(open(os.path.join(ROOT, 'web/js/call/visemes.json'), encoding='utf-8'))
SHAPES = VIS['shapes']; BLEND = VIS['timing']['blend']; LEAD = VIS['timing']['lead']; MIN_HOLD = VIS['timing']['minHold']


def p2v(phone, kind='ipa'):
    """Âm vị → hình miệng. kind='ipa': âm vị Kokoro/misaki (1 ký tự; chữ hoa = nguyên âm đôi, vd. W = aʊ) · kind='arpa': ARPAbet CMUdict (HH AH0 …).
    Hai bảng TRÙNG ký hiệu (W: ARPAbet = âm w → F, IPA Kokoro = aʊ → D) nên luôn nói rõ bảng – test chéo bắt lỗi này."""
    if kind == 'arpa': return VIS['arpabet'].get(''.join(ch for ch in phone if not ch.isdigit()), VIS['fallback'])
    return VIS['ipa'].get(phone, VIS['fallback'])


def decode(entry):
    ms, cs = entry[0], entry[1]; dur = ms / 1000
    q = [{'value': x[0], 'start': int(x[1:]) / 1000} for x in cs.split(' ')]
    for i, c in enumerate(q): c['end'] = q[i + 1]['start'] if i + 1 < len(q) else dur
    return q


def shape_at(cues, t):
    t += LEAD; i = 0
    while i < len(cues) - 1 and cues[i + 1]['start'] <= t: i += 1
    if not cues: return 'X'
    a = cues[i - 1]['value'] if i > 0 else 'X'; c = cues[i]
    k = min(1.0, max(0.0, (t - c['start']) / BLEND))
    return c['value'] if k >= .5 else a


def sample(cues, fps, dur=None):
    dur = dur if dur is not None else (cues[-1]['end'] if cues else 0)
    return ''.join(shape_at(cues, i / fps) for i in range(int(round(dur * fps))))


if __name__ == '__main__' and len(sys.argv) >= 4 and sys.argv[1] == 'sample':
    j = json.load(open(sys.argv[2])); cues = j['mouthCues'] if isinstance(j, dict) else j
    print(sample(cues, float(sys.argv[3])))

if __name__ == '__main__' and len(sys.argv) >= 4 and sys.argv[1] == 'batch':   # {khóa: cues} → {khóa: chuỗi hình mỗi khung} (test chéo)
    j = json.load(open(sys.argv[2])); fps = float(sys.argv[3])
    print(json.dumps({k: sample(v['cues'], fps, v.get('dur')) for k, v in j.items()}))
