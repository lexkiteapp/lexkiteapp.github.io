#!/usr/bin/env python3
"""Mốc thời gian từng từ bằng faster-whisper (CPU, int8) – dùng cho scripts/video/render.mjs bước align.

  python scripts/video/align.py jobs.json [--model tiny.en]
  jobs.json = [{"wav": "out/video/<id>/line-00.wav", "text": "câu kịch bản"}, ...]
In ra stdout JSON: [{"wav": ..., "words": [{"w", "start", "end", "p"}]}] (giây, tính từ đầu file wav).
Câu kịch bản đưa vào initial_prompt để nhận dạng sát chữ; việc khớp ngược về từng từ kịch bản làm ở lib.mjs (matchWords).
Cần: faster-whisper (pip). Mô hình tải từ Hugging Face lần đầu (~75 MB, CI có cache).
"""
import argparse, json, os, subprocess, sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'cine')); from whisper_det import load, DECODE, load_audio, snap_onsets   # same timings on every runner; onset snap shared with news_voice


ap = argparse.ArgumentParser()
ap.add_argument('jobs'); ap.add_argument('--model', default='tiny.en')
a = ap.parse_args()
jobs = json.load(open(a.jobs))
m = load(a.model)
out = []
for j in jobs:
    audio = load_audio(j['wav'])
    segs, _ = m.transcribe(audio, language='en', word_timestamps=True, beam_size=1, vad_filter=False,
                           initial_prompt=j.get('text') or None, condition_on_previous_text=False, **DECODE)
    words = [{'w': w.word.strip(), 'start': round(w.start, 3), 'end': round(w.end, 3), 'p': round(w.probability, 3)}
             for s in segs for w in (s.words or [])]
    out.append({'wav': j['wav'], 'words': snap_onsets(audio, words)})
json.dump(out, sys.stdout)
