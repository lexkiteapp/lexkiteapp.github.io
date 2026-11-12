#!/usr/bin/env python3
"""Metadata đăng bài (khối "publish" của bài học news): có ngay lúc sản xuất, qc_gate.py chặn clip thiếu hoặc sai.
  publish = {title ≤ 60, keyword, value (dòng giá trị của caption), hashtags 3–5, first_comment, lang?}. docs/AUTOMATION.md bước 2.
  first_comment: bình luận đầu / self-reply của kênh (docs/DISTRIBUTION.md §6c) – 1 câu tự nhiên đúng ngôn ngữ bài (lang, mặc định en)
    + đúng 1 chỗ {link} (autopilot thay bằng link đếm click theo nền tảng + UTM); không link trần, không hashtag/@, không câu mồi spam.
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
    return dict(title=title, keyword=str(b.get('memory') or b.get('point') or '').strip()[:40], value=str(b.get('why') or b.get('point') or '').strip(), hashtags=tags_for(b.get('topic'), b.get('cefr')), first_comment=fc_from_bank(b))


FC_SPAM = re.compile(r'click here|link in (my )?bio|\bdm\b|follow (me|us)|like and (share|subscribe)|smash|check out my|giveaway', re.I)
# Ngôn ngữ có chữ riêng → phải có ký tự của chữ đó; vi → phải có dấu tiếng Việt; en → chỉ chữ Latin không dấu (bài tiếng Anh).
SCRIPT = {'ja': r'[\u3040-\u30ff\u4e00-\u9fff]', 'zh': r'[\u4e00-\u9fff]', 'ko': r'[\uac00-\ud7af]', 'ar': r'[\u0600-\u06ff]', 'hi': r'[\u0900-\u097f]', 'th': r'[\u0e00-\u0e7f]', 'ru': r'[\u0400-\u04ff]',
          'vi': r'[ăâđêôơưàáạảãèéẹẻẽìíịỉĩòóọỏõùúụủũỳýỵỷỹ]'}
EMOJI = re.compile(r'[\U0001F300-\U0001FAFF\u2600-\u27BF]')


def fc_errors(fc, lang='en'):
    """Lỗi của bình luận đầu; rỗng = đạt. Chặn thiếu, sai ngôn ngữ, link trần, câu mồi – không chặn theo độ đẹp chủ quan."""
    if not isinstance(fc, str) or not fc.strip(): return ['first-comment']
    e = []; t = fc.strip(); body = t.replace('{link}', ''); lang = str(lang or 'en').lower()[:2]
    if t.count('{link}') != 1: e.append('first-comment-link')
    if not (15 if lang in ('ja', 'zh', 'ko') else 40) <= len(body) <= 260: e.append(f'first-comment-length:{len(body)}')  # chữ CJK đặc hơn: 15 ký tự ≈ 40 chữ Latin
    if re.search(r'https?://|www\.|\b[a-z0-9-]+\.(com|app|net|org|io)\b', body, re.I): e.append('first-comment-raw-url')
    if re.search(r'(^|\s)[#@]\w', body): e.append('first-comment-tag')
    if FC_SPAM.search(body): e.append('first-comment-spam')
    if len(EMOJI.findall(body)) > 2: e.append('first-comment-emoji')
    letters = re.sub(r'[^A-Za-z]', '', body)
    if letters and sum(c.isupper() for c in letters) > 0.5 * len(letters): e.append('first-comment-caps')
    if lang in SCRIPT and not re.search(SCRIPT[lang], body.lower()): e.append('first-comment-lang')
    if lang == 'en' and re.search(r'[^\x00-\x7f\u2018\u2019\u201c\u201d\u2013\u2014\u2026]', EMOJI.sub('', body)): e.append('first-comment-lang')
    return e


FC_FORMS = ('Quiz answer: {a}. {x} Practice it with a free quiz: {link}', 'Did you get it? It\'s {a}. {x} More practice like this (free): {link}', 'Answer: {a}. {x} Try the full lesson and quiz here: {link}')


def fc_from_bank(b):
    """Bình luận đầu từ phần người viết (đáp án quiz + giải thích/aha): trả lời đúng câu hỏi cuối video, xoay 3 cách nói theo id (không đăng y hệt nhau)."""
    q = b.get('quiz') or {}; opts = q.get('options') or []; a = opts[q.get('answer', 0)] if opts and isinstance(q.get('answer'), int) and q['answer'] < len(opts) else str(b.get('right') or '').rstrip('.')
    x = str(q.get('explain') or b.get('why') or '').strip()
    if x and x[-1] not in '.!?': x += '.'
    form = FC_FORMS[sum(map(ord, str(b.get('id') or ''))) % len(FC_FORMS)]
    out = form.format(a=a, x=x, link='{link}').replace('  ', ' ')
    return out if len(out.replace('{link}', '')) <= 260 else form.format(a=a, x='', link='{link}').replace('  ', ' ')


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
    if not 3 <= len(h) <= 5 or not all(re.fullmatch(r'#[a-z0-9_\u00e0-\u1eff\u0400-\u04ff\u0600-\u06ff\u0900-\u097f\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]+', str(x)) for x in h): e.append('hashtags')
    lang = pub.get('lang') or 'en'
    if not re.fullmatch(r'[a-z]{2}', str(lang)): e.append('lang')
    return e + fc_errors(pub.get('first_comment'), lang)


if __name__ == '__main__':
    root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))); bad = n = 0
    for f in sorted(glob.glob(f'{root}/content/video/cine/news/news_*.json')):
        pub = json.load(open(f)).get('publish')
        if pub is None: continue
        n += 1; err = validate(pub)
        if err: bad += 1; print('✗', os.path.basename(f), err, pub.get('title'))
    print(f'publish_meta: {n} khối, lỗi {bad}'); sys.exit(1 if bad else 0)
