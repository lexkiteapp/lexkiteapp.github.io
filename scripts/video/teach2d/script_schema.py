"""Standard Teach2D script JSON (docs/VIDEO-V3.md "Schema"): the one shape every template's episode (content/video/teach2d/eps/*.json, written by gen.py) must have.
validate(ep) -> list of problems ([] = ok). Pure; scripts/test/teach2d-script-schema.py runs it over every episode."""
import re
LANGS = {'en', 'ar', 'de', 'es', 'fr', 'hi', 'id', 'ja', 'ko', 'pt', 'ru', 'th', 'tr', 'vi', 'zh'}   # the 15 page languages (docs/I18N-PIPELINE.md)
TEACHERS, VOICES = {'ama', 'carlos'}, {'af_bella', 'am_fenrir'}
BEATS = (3, 8)   # teaching lines between the hook ('h') and the CTA ('c'): slang / guess3 / levels3 / scorecard 3, review / band 5, l1 / mistake 6 ... rule 8
MAX_WPM = 150


def validate(ep):
    p = []; L = ep.get('lines') or []; ids = [l.get('id') for l in L]
    for k in ('id', 'template', 'teacher', 'voice', 'theme', 'hook', 'lines', 'cta', 'publish', 'est'):
        if k not in ep: p.append(f'missing {k}')
    if p: return p
    if ep['teacher'] not in TEACHERS or ep['voice'] not in VOICES: p.append('teacher / voice not in the registry')
    if (ep.get('lang') or 'en') not in LANGS: p.append(f"lang {ep.get('lang')} not one of the 15")
    hook = next((l for l in L if l.get('id') == (ep['hook'] or {}).get('line')), None)
    if not hook: p.append('hook line missing')
    elif len(hook['text'].split()) > 6: p.append('spoken hook > 6 words')
    if ids[:1] != [ep['hook'].get('line')]: p.append('the hook is not the first line')
    if len(set(ids)) != len(ids): p.append('duplicate line ids')
    if ids[-1:] != ['c'] or 'lexkite.com' not in L[-1]['text']: p.append("last line must be the CTA 'c' naming lexkite.com")
    n = len([i for i in ids if i not in (ep['hook'].get('line'), 'c')])
    if not BEATS[0] <= n <= BEATS[1]: p.append(f'{n} teaching beats (want {BEATS[0]}-{BEATS[1]})')
    c = ep['cta']
    if not str(c.get('link', '')).startswith('https://lexkite.com/app/') or not c.get('route') or not str(c['link']).endswith(c['route']): p.append('cta link / route')
    if (ep['est'] or {}).get('wpm', 999) > MAX_WPM: p.append(f'est wpm > {MAX_WPM}')
    pub = ep['publish']
    if isinstance(pub, dict) and not (pub.get('title') and pub.get('keyword') and pub.get('value')): p.append('publish title / keyword / value')
    if any(not str(l.get('text', '')).strip() for l in L): p.append('empty line text')
    return p
