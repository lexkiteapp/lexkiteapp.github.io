// Sổ lastmod theo nội dung (scripts/lib/lastmod.mjs): khung/asset/thủy ấn đổi → giữ ngày; nội dung chính đổi → hôm nay;
// URL mới → ngày dự phòng; build thường không ghi sổ, LASTMOD_WRITE=1 mới ghi; bỏ URL đã gỡ theo tiền tố.
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import assert from 'node:assert/strict';
import { lastmodStore, mainHash } from '../lib/lastmod.mjs';
const today = new Date().toISOString().slice(0, 10);
const f = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'lm-')), 'lastmod.json');
const pg = (body, shell = 'a', v = '1') => `<html><head><link href="/x.css?v=${v}"></head><body><nav>${shell}</nav><main id="nd">${body}<script>var t=${v}</script><img src="/i.png?v=${v}"></main></body></html>`;

assert.equal(mainHash(pg('hello', 'a', '1')), mainHash(pg('hello', 'b', '2')), 'khung + ?v= + script đổi không tính');
assert.equal(mainHash(pg('hel⁠⁠​⁣⁠⁠lo')), mainHash(pg('hello')), 'thủy ấn vô hình không tính');
assert.notEqual(mainHash(pg('hello')), mainHash(pg('hello world')), 'nội dung chính đổi phải tính');

fs.writeFileSync(f, JSON.stringify({ '/en/words/a': [mainHash(pg('A')), '2026-01-02'], '/en/words/b': [mainHash(pg('B')), '2026-01-03'], '/en/words/gone': ['x', '2026-01-01'], '/vi/blog/k': ['y', '2026-01-01'] }));
let s = lastmodStore(f);
assert.equal(s.date('/en/words/a', pg('A', 'new shell', '9'), '2026-05-05'), '2026-01-02', 'không đổi nội dung → giữ ngày cũ');
assert.equal(s.date('/en/words/b', pg('B changed'), '2026-05-05'), today, 'đổi nội dung → hôm nay');
assert.equal(s.date('/en/words/new', pg('N'), '2026-05-05'), '2026-05-05', 'URL mới → ngày dự phòng');
assert.equal(s.date('/en/words/new2', pg('N'), '2999-01-01'), today, 'không bao giờ ở tương lai');
assert.equal(s.hash('/en/words/a'), mainHash(pg('A')));
delete process.env.LASTMOD_WRITE;
assert.equal(s.save({ prefixes: ['/en/words/'] }), false, 'build thường không ghi sổ');
process.env.LASTMOD_WRITE = '1';
assert.equal(s.save({ prefixes: ['/en/words/'] }), true);
const b = JSON.parse(fs.readFileSync(f, 'utf8'));
assert.equal(b['/en/words/gone'], undefined, 'URL đã gỡ trong tiền tố → xóa');
assert.ok(b['/vi/blog/k'], 'mục ngoài tiền tố (script khác) giữ nguyên');
assert.equal(b['/en/words/b'][1], today);
// lần build sau cùng nội dung: ngày "hôm nay" hôm trước được giữ cố định, không trôi
s = lastmodStore(f); assert.equal(s.date('/en/words/new', pg('N'), today), '2026-05-05');
console.log('✓ lastmod: sổ ngày sửa theo nội dung (7 trường hợp)');
