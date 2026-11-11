#!/usr/bin/env python3
# Phần pbxproj + kiểm entitlements của ios-sign.sh (tách riêng để scripts/test/ios-sign-patch.mjs chạy được trên mọi máy).
# ios-sign-patch.py <project.pbxproj>; env: TEAM, DOC, MAP (bundle=tên hồ sơ, mỗi dòng một cặp), PROF (bundle=plist đã giải mã).
import os, plistlib, re, sys
p = sys.argv[1]; s = open(p).read(); team = os.environ['TEAM']
lines = lambda v: dict(l.split('=', 1) for l in os.environ[v].strip().split('\n'))
want, prof = lines('MAP'), lines('PROF')
root = os.path.dirname(os.path.dirname(os.path.abspath(p)))
bad = []
def check(bundle, body):
    e = re.search(r'CODE_SIGN_ENTITLEMENTS = "?([^";]+)"?;', body)
    if not e: return
    f = re.sub(r'^\$\((SRCROOT|PROJECT_DIR)\)/', '', e.group(1))
    if '$(' in f: sys.exit(f'::error::{bundle}: không đọc được CODE_SIGN_ENTITLEMENTS {e.group(1)}')
    need = plistlib.load(open(os.path.join(root, f), 'rb'))
    have = plistlib.load(open(prof[bundle], 'rb'))['Entitlements']
    for k, v in need.items():
        h = have.get(k)
        if h is None: bad.append(f'{bundle}: hồ sơ thiếu {k}')
        elif isinstance(v, list) and isinstance(h, list) and '*' not in h and set(v) - set(h): bad.append(f'{bundle}: hồ sơ thiếu {k} = {sorted(set(v) - set(h))}')
# Mỗi lần khớp đúng MỘT khối: dừng ở `name = <bất kỳ>;`. Nếu chỉ dừng ở `name = Release;` thì khối Debug đứng trước bị nuốt chung,
# chữ ký ghi vào Debug còn Release giữ nguyên (thứ tự khối trong pbxproj của XcodeGen là theo mã băm; native-release 08/11).
blk = re.compile(r'(isa = XCBuildConfiguration;\n\s*buildSettings = \{\n)(.*?)(\n\s*\};\n\s*name = ([^;]+);)', re.S)
hit = set()
def fix(m):
    if m.group(4).strip('"') != 'Release': return m.group(0)
    body = m.group(2); b = re.search(r'PRODUCT_BUNDLE_IDENTIFIER = "?([\w.-]+)"?;', body)
    if not b or b.group(1) not in want: return m.group(0)
    hit.add(b.group(1)); check(b.group(1), body); ind = re.match(r'\s*', body).group(0)
    body = '\n'.join(l for l in body.split('\n') if not re.match(r'\s*"?(CODE_SIGN_STYLE|CODE_SIGN_IDENTITY|PROVISIONING_PROFILE(_SPECIFIER)?|DEVELOPMENT_TEAM)(\[[^\]]*\])?"? =', l))
    body = f'{ind}CODE_SIGN_STYLE = Manual;\n{ind}CODE_SIGN_IDENTITY = "Apple Distribution";\n{ind}DEVELOPMENT_TEAM = {team};\n{ind}PROVISIONING_PROFILE_SPECIFIER = "{want[b.group(1)]}";\n' + body
    return m.group(1) + body + m.group(3)
s = blk.sub(fix, s); miss = set(want) - hit
if miss: sys.exit(f'::error::không thấy cấu hình Release cho {", ".join(sorted(miss))} trong {p}')
if bad: sys.exit('::error::Hồ sơ App Store thiếu capability (App ID chưa bật) – chạy Actions → Apple signing → profiles rồi đặt lại secret, ' + os.environ['DOC'] + ':\n' + '\n'.join(bad))
open(p, 'w').write(s); print('Release → Manual:', ', '.join(sorted(hit)))
