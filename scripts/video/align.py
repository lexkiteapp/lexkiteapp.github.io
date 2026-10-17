#!/usr/bin/env python3
"""Mốc thời gian từng từ bằng faster-whisper (CPU, int8) – dùng cho scripts/video/render.mjs bước align.

  python scripts/video/align.py jobs.json [--model tiny.en]
  jobs.json = [{"wav": "out/video/<id>/line-00.wav", "text": "câu kịch bản"}, ...]
In ra stdout JSON: [{"wav": ..., "words": [{"w", "start", "end", "p"}]}] (giây, tính từ đầu file wav).
Câu kịch bản đưa vào initial_prompt để nhận dạng sát chữ; việc khớp ngược về từng từ kịch bản làm ở lib.mjs (matchWords).
Cần: faster-whisper (pip). Mô hình tải từ Hugging Face lần đầu (~75 MB, CI có cache).
"""
import argparse, json, subprocess, sys

import numpy as np
from faster_whisper import WhisperModel


def load_audio(path, sr=16000):
    """Giải mã bằng ffmpeg → float32 mono 16 kHz (không qua PyAV: faster-whisper 1.1.1 gọi av.open(metadata_errors=…) mà PyAV ≥ 15 đã bỏ
    → TypeError trên CI; workflow cũng ghim av==13.1.0 (có wheel cp312) nhưng đường này không phụ thuộc phiên bản PyAV)."""
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-nostdin', '-i', path, '-ac', '1', '-ar', str(sr), '-f', 's16le', '-'],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.int16).astype(np.float32) / 32768.0


def snap_onsets(audio, words, sr=16000):
    """whisper tiny.en hay đặt từ đầu mỗi đoạn (và từ sau quãng nghỉ) bắt đầu từ lúc IM LẶNG (vd. "Wait" 0,0 s trong khi tiếng
    bắt đầu 0,42 s) → phụ đề bật sớm + đo lệch khẩu hình ~200–300 ms. Dời đầu từ tới khung 10 ms đầu tiên có năng lượng tiếng
    (RMS > 8 % mức p95 của câu) trong chính khoảng [start, end) của từ; không bao giờ dời quá end − 40 ms."""
    hop = sr // 100
    n = len(audio) // hop
    if n < 3 or not words:
        return words
    rms = np.sqrt((audio[:n * hop].reshape(n, hop) ** 2).mean(axis=1))
    thr = max(1e-3, 0.08 * float(np.percentile(rms, 95)))
    for w in words:
        s0, e0 = int(w['start'] * 100), int(w['end'] * 100)
        voiced = np.nonzero(rms[s0:min(n, e0)] > thr)[0]
        if len(voiced):
            t = (s0 + int(voiced[0])) / 100
            if t > w['start']:
                w['start'] = round(min(t, w['end'] - 0.04), 3)
    return words


ap = argparse.ArgumentParser()
ap.add_argument('jobs'); ap.add_argument('--model', default='tiny.en')
a = ap.parse_args()
jobs = json.load(open(a.jobs))
m = WhisperModel(a.model, device='cpu', compute_type='int8')
out = []
for j in jobs:
    audio = load_audio(j['wav'])
    segs, _ = m.transcribe(audio, language='en', word_timestamps=True, beam_size=1, vad_filter=False,
                           initial_prompt=j.get('text') or None, condition_on_previous_text=False)
    words = [{'w': w.word.strip(), 'start': round(w.start, 3), 'end': round(w.end, 3), 'p': round(w.probability, 3)}
             for s in segs for w in (s.words or [])]
    out.append({'wav': j['wav'], 'words': snap_onsets(audio, words)})
json.dump(out, sys.stdout)
