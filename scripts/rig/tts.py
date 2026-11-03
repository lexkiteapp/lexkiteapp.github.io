#!/usr/bin/env python3
"""Giọng + mốc âm vị cho video rig 2D (docs/specs/rig-2d-video.md). Kokoro python chạy MỘT lần mỗi câu → tiếng và pred_dur cùng nguồn
(quy ước thời gian như scripts/lipsync/kokoro_ts.py: 1 đơn vị = 1/40 s, BOS bớt 3), có speed (≤150 wpm). Giọng lấy từ web/teach/characters.json
(people[who].voice.video) – không ghi tay. Ra: <out>/seg-<k>.wav, <out>/voice.raw.wav (cả bài, có lặng lead/gap/tail), <out>/timeline.json.
Dùng: python3 scripts/rig/tts.py content/video/rig/ama-agree.json qa/rig   (CI rig-sample.yml; cần kokoro==0.9.4 soundfile, espeak-ng)"""
import json, sys
from pathlib import Path
import numpy as np
import soundfile as sf
from kokoro import KPipeline

SR, DIV = 24000, 40.0


def main():
    spec, out = json.loads(Path(sys.argv[1]).read_text()), Path(sys.argv[2]) / json.loads(Path(sys.argv[1]).read_text())['id']
    out.mkdir(parents=True, exist_ok=True)
    people = json.loads(Path('web/teach/characters.json').read_text())['people']  # mỗi câu có thể đổi người nói (who) → đúng giọng người đó
    pipe = KPipeline(lang_code='a', repo_id='hexgrad/Kokoro-82M')
    vocab, track, segs = pipe.model.vocab, [np.zeros(int(spec['lead'] * SR), np.float32)], []
    t = len(track[0]) / SR
    for k, sg in enumerate(spec['segments']):
        audio, ph, words, t0 = [], [], [], 0.0
        who = sg.get('who', spec['who']); voice = people[who]['voice']['video']
        speed = sg.get('speed') or spec.get('speeds', {}).get(who, spec['speed'])   # giọng mỗi giáo viên nhanh/chậm khác nhau → tốc độ riêng để ≤150 wpm
        for r in pipe(sg['text'], voice=voice, speed=speed):
            a = r.audio.numpy() if hasattr(r.audio, 'numpy') else np.asarray(r.audio)
            pd, ps = [int(x) for x in r.pred_dur], [c for c in r.phonemes if c in vocab]
            assert len(pd) == len(ps) + 2, (len(pd), len(ps))
            u = t0 + max(0, pd[0] - 3) / DIV
            for c, d in zip(ps, pd[1:-1]):
                ph.append({'p': c, 's': round(u, 4), 'e': round(u + d / DIV, 4)}); u += d / DIV
            for tk in r.tokens or []:
                if tk.start_ts is not None and tk.end_ts is not None:
                    words.append({'w': tk.text, 'start': round(t0 + tk.start_ts, 4), 'end': round(t0 + tk.end_ts, 4)})
            audio.append(a.astype(np.float32)); t0 += len(a) / SR
        wav = np.concatenate(audio); sf.write(out / f'seg-{k}.wav', wav, SR, subtype='PCM_16')
        dur = len(wav) / SR
        segs.append(dict(sg, k=k, who=who, voice=voice, start=round(t, 4), dur=round(dur, 4), ph=ph, words=words, wav=str(out / f'seg-{k}.wav')))
        gap = spec['gap'] if k < len(spec['segments']) - 1 else spec['tail']
        if sg.get('repeat'):   # khuôn Reels: chừa lặng cho người xem đọc theo = max(min, k × độ dài câu mẫu) (docs/specs/social-reels-templates.md)
            r = spec.get('repeat', {}); gap = max(gap, r.get('min', 1.8), r.get('k', 1.2) * dur)
            segs[-1]['turn'] = [round(t + dur, 4), round(t + dur + gap, 4)]
        track += [wav, np.zeros(int(gap * SR), np.float32)]; t = sum(len(x) for x in track) / SR
        print(k, f'{dur:.2f}s', len(words), 'từ', voice)
    full = np.concatenate(track); sf.write(out / 'voice.raw.wav', full, SR, subtype='PCM_16')
    (out / 'timeline.json').write_text(json.dumps({'voices': sorted({x['voice'] for x in segs}), 'total': round(len(full) / SR, 4), 'segments': segs}, indent=1))


if __name__ == '__main__':
    main()
