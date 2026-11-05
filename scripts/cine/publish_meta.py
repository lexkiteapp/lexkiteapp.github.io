#!/usr/bin/env python3
"""Metadata đăng bài (khối "publish" của bài học news): có ngay lúc sản xuất, qc_gate.py chặn clip thiếu hoặc sai.
  publish = {title ≤ 60, keyword, value (dòng giá trị của caption), hashtags 3–5}. docs/AUTOMATION.md bước 2.
  from_bank(b): lấy từ phần người viết trong script bank (hook, why, memory), không ghép mẫu.
  python3 scripts/cine/publish_meta.py --check  → in lỗi các khối đã có, exit 1 nếu có khối sai"""
import glob, json, os, re, sys

TOPIC = {'shopping': '#shoppingenglish', 'health': '#healthenglish', 'travel': '#travelenglish', 'food': '#foodenglish', 'work': '#businessenglish', 'exam': '#examenglish', 'study': '#studyenglish', 'tech': '#techenglish'}
BAD_TITLE = re.compile(r'are you saying it right|what textbooks|^cine-|^news_|^auto_|\? [a-z]')
DANGLING = re.compile(r'\b(to|and|or|for|of|the|a|an|how|with|at|in|on|your|my)$', re.I)


def tags_for(topic, cefr):
    t = ['#learnenglish', '#englishtips', TOPIC.get(topic, '#speakenglish')]
    if cefr: t.append('#' + str(cefr).lower() + 'english')
    return list(dict.fromkeys(t))[:5]


def from_bank(b):
    """Mục script bank → khối publish. Tiêu đề = hook người viết; quá dài thì dùng câu sai, không cắt giữa câu."""
    hook = re.sub(r'\s+', ' ', str(b.get('hook') or '')).strip(); wrong = str(b.get('wrong') or '').strip().rstrip('.!?')
    title = hook if len(hook) <= 60 else f'Stop saying "{wrong}"'
    return dict(title=title, keyword=str(b.get('memory') or b.get('point') or '').strip()[:40], value=str(b.get('why') or b.get('point') or '').strip(), hashtags=tags_for(b.get('topic'), b.get('cefr')))


def validate(pub):
    """Danh sách lỗi; rỗng = đạt. Chặn cả tiêu đề cụt, tiêu đề còn mẫu hoặc là id, không chỉ thiếu trường."""
    if not isinstance(pub, dict): return ['missing']
    e = []; t = str(pub.get('title') or '').strip(); h = pub.get('hashtags') or []
    if not 8 <= len(t) <= 60: e.append(f'title-length:{len(t)}')
    if BAD_TITLE.search(t): e.append('title-template')
    if DANGLING.search(t.rstrip('"?!.')): e.append('title-cut')
    if len(str(pub.get('keyword') or '')) < 2: e.append('keyword')
    if len(str(pub.get('value') or '')) < 12: e.append('value')
    if re.search(r'\.\.$|\."\.$', str(pub.get('value') or '')): e.append('value-punct')
    if not 3 <= len(h) <= 5 or not all(re.fullmatch(r'#[a-z0-9]+', str(x)) for x in h): e.append('hashtags')
    return e


if __name__ == '__main__':
    root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))); bad = n = 0
    for f in sorted(glob.glob(f'{root}/content/video/cine/news/news_*.json')):
        pub = json.load(open(f)).get('publish')
        if pub is None: continue
        n += 1; err = validate(pub)
        if err: bad += 1; print('✗', os.path.basename(f), err, pub.get('title'))
    print(f'publish_meta: {n} khối, lỗi {bad}'); sys.exit(1 if bad else 0)
