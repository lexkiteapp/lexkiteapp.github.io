#!/usr/bin/env python3
"""Khối `publish` của mỗi tập Teach2D – viết lúc sản xuất từ chính kịch bản + dữ kiện của tập (docs/specs/video-production-v2.md §2).
  build(ep) -> {title ≤ 60, keyword, value, hashtags 3–5, platforms: {youtube, facebook, instagram, tiktok}}
  python3 scripts/video/teach2d/publish.py --check   -> lỗi của mọi eps/*.json (thiếu khối = lỗi), exit 1 nếu có
Luật chung = scripts/cine/publish_meta.validate (#587) khi có; luật nền tảng ở validate_platforms. CHỈ chuẩn bị: không đăng, không lên lịch (chủ 4/11)."""
import glob, json, os, re, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
SITE = 'https://lexkite.com'
AREA_TAG = {'dictionary': '#vocabulary', 'vocab-review': '#vocabulary', 'pronunciation': '#pronunciation', 'verbs': '#englishgrammar', 'grammar': '#englishgrammar',
            'grammar-check': '#englishgrammar', 'phrases': '#phrasalverbs', 'word-usage': '#vocabulary', 'dictation': '#englishlistening', 'toeic': '#toeic',
            'call': '#speakenglish', 'placement': '#englishtest'}
DANGLING = re.compile(r'\b(to|and|or|for|of|the|a|an|how|with|at|in|on|your|my)$', re.I)
BAD_TITLE = re.compile(r'are you saying it right|what textbooks|^cine-|^news_|^auto_|^t2a?_|\? [a-z]')


def _q(w): return f'"{w}"'


def _fit(*cands):
    """Ứng viên đầu tiên ≤ 60 ký tự, không cụt cuối. Không cắt giữa câu – mọi ứng viên là câu trọn."""
    for c in cands:
        c = re.sub(r'\s+', ' ', str(c or '')).strip()
        if 8 <= len(c) <= 60 and not DANGLING.search(c.rstrip('"?!.')): return c
    raise AssertionError(('no title fits', cands))


def _lc(x): return x if re.match(r"I\b", x) else x[:1].lower() + x[1:]


def _ord(i): return ['1st', '2nd', '3rd', '4th', '5th'][i]


def facts(ep):
    """(title, keyword, value) từ dữ kiện của tập – cùng nguồn với lời giáo viên."""
    if ep.get('lang', 'en') != 'en':   # L1 clip: title / post text come from the native layer written at production (l1.json)
        N = ep['data']['native']; return _fit(N['hook'], N['hook'] + '!'), ep['data']['right'], N['tip']
    t, D, L = ep['template'], ep.get('data') or {}, {l['id']: l['text'] for l in ep['lines']}
    hook = ep['lines'][0]['text']
    if t == 'review':
        w = D['word']; return _fit(f'What does {_q(w)} mean?', f'{w.capitalize()}: what does it mean?'), w, f'{w.capitalize()} means {D["mean"]}.'
    if t == 'usuk':
        us, uk = D['us'], D['uk']
        return _fit(f'{us.capitalize()} or {uk}? US vs UK English', f'{us.capitalize()} or {uk}?'), f'{us} vs {uk}', f'Americans say {us}. British people say {uk}.'
    if t == 'stress':
        A, B = D['a'], D['b']
        return (_fit(f'{A["word"].capitalize()} vs {B["word"]}: where is the stress?', f'Where is the stress in {B["word"]}?'), f'{A["word"]} {B["word"]} stress',
                f'{A["word"].capitalize()} {A["ipa"]}: stress on the {_ord(A["stress"])} part. {B["word"].capitalize()} {B["ipa"]}: the {_ord(B["stress"])} part.')
    if t == 'verbs':
        b, p, pp, ov = D['base'], D['past'], D['pp'], D.get('over')
        return (_fit(f'Past of {_q(b)}? Not {_q(ov)}' if ov else '', f'{b.capitalize()}, {p}, {pp}: verb forms'), f'{b} {p} {pp}',
                f'{b.capitalize()} → {p} → {pp}.' + (f' Never "{ov}".' if ov else ''))
    # other templates (pilots): the teacher's hook + the explanation line of the script
    expl = next((str(D[k]) for k in ('why', 'aha', 'mean', 'define') if len(str(D.get(k) or '')) >= 12), None) or \
        next((L[k] for k in ('b', 'm', 'x', 'r', 'f') if k in L and len(L[k]) >= 16), hook)
    c = lambda x: str(x).strip().rstrip('.!?')
    if D.get('right') and D.get('wrong'): expl = f'Say "{c(D["right"])}", not "{c(D["wrong"])}". {expl}' if expl != hook and c(D['right']) not in expl else f'Say "{c(D["right"])}", not "{c(D["wrong"])}".'
    if t in ('call', 'react') and (D.get('phrase') or D.get('key')): expl = f'"{(D.get("phrase") or D["key"]).capitalize()}" means {_lc(c(D.get("define") or D["mean"]))}.'
    if t == 'dictation': expl = f'"{D["word"].capitalize()}" {D["ipa"]} means {c(D["mean"])}.'
    if t == 'guess': return _fit(f'"{c(D["clue"])}." Guess the word!', f'Guess the word: {c(D["clue"]).lower()}'), D['word'], f'The answer: {D["word"]} {D["ipa"]}. {D["ex"]}'
    if t == 'level': expl = f'{len(D["qs"])} quick questions to check your English level ({D.get("level") or ep["id"].split("_")[-1].upper()}).'
    if t == 'toeic': expl = f'TOEIC Part 5: the answer is "{D["right"]}", because of "{D["cue"]}".'
    kw = D.get('word') or D.get('phrase') or D.get('pv') or D.get('key') or D.get('en') or D.get('verb') or D.get('right') or ep.get('series', '')
    return _fit(hook, f'{ep["series"]}: {hook}'), str(kw)[:40], expl


def build_l1(ep):
    """Clip L1: title, post text, hashtags, first comment all in the page language (native-qa.mjs checks them); the teacher still teaches English."""
    N = ep['data']['native']; title, kw, value = facts(ep); link = ep['cta']['link']; cap = N['caption']; tags = N['hashtags'][:5]; ph = '\n\n'
    plat = dict(youtube=dict(title=title, description=f"{cap}\n\n{link}\n\n{' '.join(tags)}", tags=list(dict.fromkeys([kw, 'learn english', ep['lang']]))),
                facebook=dict(text=f'{cap}{ph}{link}'), instagram=dict(caption=f'{cap}{ph}lexkite.com', hashtags=tags), tiktok=dict(caption=(f'{title} {" ".join(tags[:3])}')[:150]))
    return dict(title=title, keyword=kw, value=value, hashtags=tags, link=link, script_words=sum(len(l['text'].split()) for l in ep['lines'] if not l.get('quiz')), platforms=plat, first_comment=N['comment'], lang=ep['lang'])


def build(ep):
    if ep.get('lang', 'en') != 'en': return build_l1(ep)
    title, kw, value = facts(ep)
    lvl = str(ep.get('cefr') or (ep.get('data') or {}).get('cefr') or '').lower()
    tags = list(dict.fromkeys(['#learnenglish', '#englishtips', AREA_TAG.get(ep['area'], '#speakenglish')] + ([f'#{lvl}english'] if re.fullmatch(r'[abc][12]', lvl) else []) + ['#englishteacher']))[:5]
    link = ep['cta']['link']; say = ep['cta'].get('say') or 'Practice in the app'
    script = ' '.join(l['text'] for l in ep['lines'] if not l.get('quiz'))
    yt_desc = '\n'.join([value, '', f'{say}, free: {link}', '', f'Series: {ep["series"]} · Teacher: {ep["teacher"].capitalize()}', '', ' '.join(tags)])
    plat = dict(
        youtube=dict(title=title, description=yt_desc, tags=list(dict.fromkeys([kw, ep['series'], 'learn english', 'english vocabulary' if ep['area'] in ('dictionary', 'vocab-review') else 'english lesson']))),
        facebook=dict(text=f'{title}\n\n{value}\n\n{say}, free: {link}'),
        instagram=dict(caption=f'{title}\n\n{value}\n\n{say}: link in bio.', hashtags=tags),
        tiktok=dict(caption=(f'{title} {" ".join(tags[:3])}')[:150]),
    )
    return dict(title=title, keyword=kw, value=value, hashtags=tags, link=link, script_words=len(script.split()), platforms=plat, first_comment=first_comment(ep, value))


FC_FORMS = ('Quiz answer: {a} {x} Practice it with a free quiz: {link}', "Did you get it? {a} {x} More practice like this (free): {link}", 'Answer: {a} {x} Try the full lesson and quiz here: {link}')
ASCII_OK = re.compile(r'^[\x00-\x7f\u2018\u2019\u201c\u201d\u2013\u2014\u2026]*$')


def first_comment(ep, value):
    """First comment (#718 shared rule, publish_meta.fc_errors): answers the video's own quiz with the line the teacher says right after it
    (+ the value line when it is plain English text – IPA / arrows would fail the en-only check), one {link} placeholder, 3 wordings rotated by id."""
    L = ep['lines']; qi = next((i for i, l in enumerate(L) if l.get('quiz')), None)
    a = (L[qi + 1]['text'] if qi is not None and qi + 1 < len(L) else value).strip()
    if a[-1:] not in '.!?': a += '.'
    x = value.strip() if ASCII_OK.match(value) and value.strip().lower() not in a.lower() else ''
    if x and x[-1] not in '.!?': x += '.'
    form = FC_FORMS[sum(map(ord, ep['id'])) % len(FC_FORMS)]
    out = re.sub(r' +', ' ', form.format(a=a, x=x, link='{link}'))
    return out if len(out.replace('{link}', '')) <= 260 else re.sub(r' +', ' ', form.format(a=a, x='', link='{link}'))


def _base_validate(pub):
    try:
        sys.path.insert(0, f'{ROOT}/scripts/cine'); import publish_meta  # noqa: E402 – #587, one source of the shared rules
        return publish_meta.validate(pub)
    except ImportError:   # until #587 lands: the same shared rules (drop this branch when scripts/cine/publish_meta.py exists on main)
        if not isinstance(pub, dict): return ['missing']
        e = []; t = str(pub.get('title') or '').strip(); h = pub.get('hashtags') or []
        if not 8 <= len(t) <= 60: e.append(f'title-length:{len(t)}')
        if BAD_TITLE.search(t): e.append('title-template')
        if DANGLING.search(t.rstrip('"?!.')): e.append('title-cut')
        if len(str(pub.get('keyword') or '')) < 2: e.append('keyword')
        if len(str(pub.get('value') or '')) < 12: e.append('value')
        if not 3 <= len(h) <= 5 or not all(re.fullmatch(r'#[\w\u0900-\u097f\u0600-\u06ff]+', str(x)) for x in h): e.append('hashtags')
        return e


def validate_platforms(pub, ep):
    e = []; P = (pub or {}).get('platforms') or {}
    for k in ('youtube', 'facebook', 'instagram', 'tiktok'):
        if k not in P: e.append(f'{k}-missing')
    y = P.get('youtube') or {}
    if not 8 <= len(y.get('title', '')) <= 60: e.append('youtube-title')
    if ep['cta']['link'] not in y.get('description', ''): e.append('youtube-deeplink')
    if not y.get('tags'): e.append('youtube-tags')
    if not str(ep['cta']['link']).startswith(SITE + '/app/#/'): e.append('deeplink-route')
    if len((P.get('tiktok') or {}).get('caption', '')) > 150: e.append('tiktok-length')
    if not 3 <= len((P.get('instagram') or {}).get('hashtags') or []) <= 5: e.append('instagram-hashtags')
    if 'http' in (P.get('instagram') or {}).get('caption', ''): e.append('instagram-link')   # links in IG captions are not clickable
    txt = ' '.join([pub.get('title', ''), pub.get('value', '')] + [str(v) for p in P.values() for v in p.values() if isinstance(v, str)])
    if re.search(r'\bundefined\b|\bNone\b|\bnan\b|\{[a-z_]+\}', txt): e.append('placeholder')   # a missing fact leaked into the copy
    return e


def check(ep):
    pub = ep.get('publish'); return _base_validate(pub) + (validate_platforms(pub, ep) if isinstance(pub, dict) else [])


if __name__ == '__main__':
    bad = n = 0
    for f in sorted(glob.glob(f'{ROOT}/content/video/teach2d/eps/*.json')):
        ep = json.load(open(f)); n += 1; err = check(ep)
        if err: bad += 1; print('✗', ep['id'], err, (ep.get('publish') or {}).get('title'))
    print(f'publish_meta teach2d: {n} tập, lỗi {bad}'); sys.exit(1 if bad or not n else 0)
