// Cổng chỗ gọi giọng đọc (npm test): mọi file đọc to phải khai trong scripts/audio/tts-sites.json – nhóm Kokoro dựng sẵn hoặc lý do "dynamic".
// Chặn chỗ đọc mới lặng lẽ rơi về giọng máy (mỗi máy một giọng) mà không ai đo. Kèm thử logic + regex với các dạng gọi thật.
import assert from 'node:assert/strict';
import { scan, readManifest, verdict, SITE_RE } from '../audio/tts-sites.mjs';
import { measure } from '../audio/coverage.mjs';
for (const s of ["UI.tts(x, 'en-US')", 'g.UI.speak(w, a)', 'UI.sayBtn(q.word)', '<b data-saysent="${e}">', 'data-speak-text="${s}"', 'T.say(text, o)', 'L.teacher.say(c)', 'speechSynthesis.speak(u)', 'new SpeechSynthesisUtterance(t)'])
  assert.ok(SITE_RE.test(s), `nhận chỗ đọc: ${s}`);
for (const s of ['UI.toast(x)', 'speechSynthesis.cancel()', 'const say = 1', 'data-say-x="1"']) assert.ok(!SITE_RE.test(s), `không nhận nhầm: ${s}`);
const G = new Set(['a']), F = new Map([['x.js', 1]]);
assert.deepEqual(verdict(F, { sites: { 'x.js': { groups: ['a'] } } }, G), [], 'khai đúng → xanh');
assert.equal(verdict(F, { sites: {} }, G).length, 1, 'file đọc to chưa khai → đỏ');
assert.equal(verdict(new Map(), { sites: { 'x.js': { dynamic: 'y' } } }, G).length, 1, 'khai thừa → đỏ');
assert.equal(verdict(F, { sites: { 'x.js': { groups: ['b'] } } }, G).length, 1, 'nhóm không tồn tại → đỏ');
assert.equal(verdict(F, { sites: { 'x.js': {} } }, G).length, 1, 'mục trống → đỏ');
const m = await measure(), found = scan(), bad = verdict(found, readManifest(), new Set(Object.keys(m)));
if (bad.length) { console.error('✗ tts-sites:\n  ' + bad.join('\n  ')); process.exit(1); }
console.log(`✓ tts-sites: ${found.size} file đọc to đều đã khai`);
// audio.yml tự chạy khi nội dung tĩnh vào main: mọi file/thư mục web/ mà corpus.mjs đọc phải khớp một mẫu push.paths (thiếu → câu mới chờ cron đêm)
import fs from 'node:fs';
const yml = fs.readFileSync('.github/workflows/audio.yml', 'utf8'), pm = /push:[\s\S]*?paths:\s*\[([\s\S]*?)\]/.exec(yml);
assert.ok(pm, 'audio.yml cần push.paths cho nội dung tĩnh');
const pats = [...pm[1].matchAll(/'([^']+)'/g)].map(m => new RegExp('^' + m[1].replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*\*/g, '\u0000').replace(/\*/g, '[^/]*').replace(/\u0000/g, '.*') + '$'));
const srcs = [...new Set([...fs.readFileSync('scripts/sentence-audio/corpus.mjs', 'utf8').matchAll(/'(web\/[^'$`]+?)'/g)].map(m => m[1]))];
// thư mục (readdirSync + lọc tên) → đủ khi có mẫu nằm trong thư mục đó hoặc mẫu ** cha đã phủ nó (vd web/js/speak/** phủ web/js/speak/s); file → phải khớp mẫu
const raw = [...pm[1].matchAll(/'([^']+)'/g)].map(m => m[1]), isDir = s => !/\.\w+$/.test(s);
const miss = srcs.filter(s => (isDir(s) ? !(raw.some(p => p.startsWith(s.replace(/\/?$/, '/'))) || pats.some(r => r.test(s.replace(/\/?$/, '/x.js')))) : !pats.some(r => r.test(s))));
assert.deepEqual(miss, [], `audio.yml push.paths thiếu nguồn corpus: ${miss.join(', ')}`);
console.log(`✓ tts-sites: audio.yml tự thu audio khi ${srcs.length} nguồn corpus đổi`);
