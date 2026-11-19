# Gỡ xung đột số phiên bản extension/manifest.json khi 2 phiên cùng tăng version: lấy bản lớn hơn + 1 (CWS cần version tăng)
import re, sys
p = 'extension/manifest.json'; s = open(p).read()
m = re.search(r'<<<<<<< [^\n]*\n(.*?)=======\n(.*?)>>>>>>> [^\n]*\n', s, re.S)
if not m: sys.exit(0)
ver = lambda t: tuple(int(x) for x in re.search(r'"version": "([\d.]+)"', t).group(1).split('.'))
a, b = ver(m.group(1)), ver(m.group(2)); v = list(max(a, b)); v[-1] += 1
s = s[:m.start()] + re.sub(r'"version": "[\d.]+"', '"version": "%s"' % '.'.join(map(str, v)), m.group(2)) + s[m.end():]
if '<<<<<<<' in s: sys.exit('còn xung đột khác trong manifest')
open(p, 'w').write(s); print('manifest version →', '.'.join(map(str, v)))
