// Gác tệp rác: macOS BSD `sed -i -e 's/…/…/' f` tạo `f-e` (hiểu "-e" là hậu tố sao lưu) rồi bị git add -A commit (scripts/i18n-fixed.json-e).
//  1) không tệp theo dõi nào có đuôi <ext>-e / .bak / .orig / .rej / ~ ;  2) không script nào dùng `sed -i -e` hoặc `sed -i ''` (không portable): dùng `sed -i.bak … && rm -f …bak`, perl -pi -e hoặc node.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

export const STRAY = /(?:\.[a-z0-9]+-e|\.bak|\.orig|\.rej|~)$/;
export const BAD_SED = /\bsed\s+(?:-[A-Za-z]*\s+)*-i\s*(?:-e\b|''|"")/;
assert.ok(STRAY.test('scripts/i18n-fixed.json-e') && STRAY.test('a.mjs.bak') && !STRAY.test('web/js/app.js') && !STRAY.test('docs/rule-e.md'), 'STRAY');
assert.ok(BAD_SED.test("sed -i -e 's/a/b/' f") && BAD_SED.test("sed -i '' 's/a/b/' f") && !BAD_SED.test("sed -i.bak -e 's/a/b/' f") && !BAD_SED.test("perl -pi -e 's/a/b/' f"), 'BAD_SED');
const files = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8', maxBuffer: 256 << 20 }).split('\0').filter(f => f && fs.existsSync(f));
const stray = files.filter(f => STRAY.test(f));
assert.equal(stray.length, 0, `tệp rác bị commit (do sed -i -e / trình sửa): ${stray.join(', ')} → git rm`);
const bad = files.filter(f => /^(scripts|\.github)\/.*\.(sh|mjs|js|yml)$/.test(f) && f !== 'scripts/test/stray-files.mjs').filter(f => BAD_SED.test(fs.readFileSync(f, 'utf8')));
assert.equal(bad.length, 0, `sed -i không portable (macOS tạo tệp -e): ${bad.join(', ')} → sed -i.bak … && rm -f …bak, hoặc perl -pi -e`);
console.log('✓ stray-files: không tệp rác -e/.bak, không sed -i không portable');
