#!/usr/bin/env python3
"""Kokoro (python, hexgrad/kokoro Apache-2.0) sinh tiếng VÀ mốc âm vị trong CÙNG một lần chạy → đúng thời lượng model đã dùng (pred_dur), không đoán lại.
Vào: JSON [{id, text, voice}] · Ra: QA/<id>.raw.wav (24 kHz) + QA/<id>.ph.json {phonemes, ph:[{p,s,e}], words:[{w,start,end}], dur}.
Quy ước thời gian giống kokoro.pipeline.join_timestamps: 1 đơn vị pred_dur = 1/40 s, BOS bớt 3 đơn vị.
Dùng: python3 scripts/lipsync/kokoro_ts.py lines.json qa/lipsync   (pip install kokoro soundfile; apt espeak-ng)"""
import json, sys
from pathlib import Path
import numpy as np
import soundfile as sf
from kokoro import KPipeline

SR, DIV = 24000, 40.0


def main():
    items, qa = json.loads(Path(sys.argv[1]).read_text()), Path(sys.argv[2])
    qa.mkdir(parents=True, exist_ok=True)
    pipe = KPipeline(lang_code='a', repo_id='hexgrad/Kokoro-82M')
    vocab = pipe.model.vocab
    for it in items:
        audio, ph, words, t0 = [], [], [], 0.0
        for r in pipe(it['text'], voice=it['voice'], speed=1):
            a = r.audio.numpy() if hasattr(r.audio, 'numpy') else np.asarray(r.audio)
            pd = [int(x) for x in r.pred_dur]
            ps = [c for c in r.phonemes if c in vocab]  # đúng input_ids của model (BOS + ps + EOS)
            assert len(pd) == len(ps) + 2, (len(pd), len(ps))
            t = t0 + max(0, pd[0] - 3) / DIV
            for c, d in zip(ps, pd[1:-1]):
                ph.append({'p': c, 's': round(t, 4), 'e': round(t + d / DIV, 4)}); t += d / DIV
            for tk in r.tokens or []:
                if tk.start_ts is not None and tk.end_ts is not None:
                    words.append({'w': tk.text, 'start': round(t0 + tk.start_ts, 4), 'end': round(t0 + tk.end_ts, 4)})
            audio.append(a); t0 += len(a) / SR
        wav = np.concatenate(audio)
        sf.write(qa / f"{it['id']}.raw.wav", wav, SR)
        (qa / f"{it['id']}.ph.json").write_text(json.dumps({'ph': ph, 'words': words, 'dur': round(len(wav) / SR, 4)}))
        print(it['id'], f'{len(wav) / SR:.2f}s', len(ph), 'âm vị', len(words), 'từ')


if __name__ == '__main__':
    main()
