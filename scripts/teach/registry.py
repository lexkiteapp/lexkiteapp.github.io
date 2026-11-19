"""Nhân vật Lexkite cho mã Python (video, mẫu, QC): đọc NGUỒN DUY NHẤT web/teach/characters.json – đúng 2 giáo viên 2D Ama/Carlos (chủ 28/10).
from teach.registry import REG, ids, video_clips  (thêm scripts/ vào sys.path)."""
import json, os
REG = json.load(open(os.path.join(os.path.dirname(__file__), '..', '..', 'web', 'teach', 'characters.json')))
ids = lambda: list(REG['people'])
video_clips = lambda: {k: p['video_clip'] for k, p in REG['people'].items()}            # 1 clip nói tự nhiên / người (mẫu video hàng loạt)
clip_src = lambda who, pose: REG['people'][who]['clips'][pose]['src']                   # id clip phông xanh nguồn của 1 tư thế
sources = lambda: {s for p in REG['people'].values() for s in [p['video_clip'], *(c['src'] for c in p['clips'].values())]}


def check(who, clips=()):
    """Chặn dựng video với nhân vật/clip ngoài registry (3D Kling cũ, Mia/Jake/Daniel/Mei/Kai/Ruth, trang phục khác) – chủ 28/10: 1 bộ 2D duy nhất."""
    bad = [c for c in clips if c not in sources()]
    if who not in REG['people'] or bad:
        raise SystemExit(f'✗ nhân vật ngoài registry web/teach/characters.json: who={who} clips={bad} – chỉ Ama/Carlos 2D (docs/CHARACTERS.md)')
