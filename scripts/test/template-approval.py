#!/usr/bin/env python3
"""Template approval book gate (owner 15/11): content/video/cine/news/approved.json "templates" is the single source; every teach2d/motion template on disk is listed, approved ones carry evidence.
python3 scripts/test/template-approval.py   (ci.yml)"""
import os, subprocess, sys
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')); sys.path.insert(0, f'{ROOT}/scripts/video')
import approved_templates as AT   # noqa: E402
fails = list(AT.problems())
for want, args in (('approved', ('usuk', 'teach2d')), ('draft', ('level', 'teach2d')), ('retired', ('cine-news-pil', 'legacy')), (None, ('does-not-exist',))):
    if AT.status(*args) != want: fails.append(f'status{args} != {want}')
try: AT.require('level', 'teach2d'); fails.append('require() let a draft template through')
except SystemExit: pass
AT.require('usuk', 'teach2d')
if fails: print('\n'.join('FAIL ' + f for f in fails)); sys.exit(1)
print('template-approval: ok')
