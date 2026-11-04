# Âm vị ngôn ngữ đích cho Kokoro-82M (TL_ESPEAK = mã espeak trong tl-voices.json: pt-br, es-419 …; docs/specs/target-language.md §Giọng) – CHỈ CI (word-audio-tl.yml).
# Gốc lỗi lượt mẫu 41428871761: gói phonemizer kèm kokoro-js là espeak-ng CHỈ tiếng Anh ("Invalid language identifier pt").
# → dùng đúng bộ G2P chính thức của Kokoro (misaki EspeakG2P + espeak-ng đầy đủ, espeakng-loader), cùng mô hình; giọng theo bảng.
# Vào: JSON mảng chữ (stdin) · Ra: JSON {chữ: âm vị | null} (stdout). Lỗi nạp → thoát 3 (tl-sample.mjs ghi probe, đổi Piper theo spec).
import json, os, sys
try:
    from misaki import espeak
    g2p = espeak.EspeakG2P(language=os.environ.get('TL_ESPEAK', 'pt-br'))
except Exception as e:
    print(json.dumps({'__err': 'misaki: ' + str(e)[:200]})); sys.exit(3)
out = {}
for t in json.load(sys.stdin):
    try:
        ps, _ = g2p(t); out[t] = (ps or '').strip() or None
    except Exception as e:
        out[t] = None; out.setdefault('__err', str(e)[:200])
print(json.dumps(out, ensure_ascii=False))
