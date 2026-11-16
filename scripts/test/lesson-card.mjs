// Test thuần thẻ kết quả (docs/specs/learn-card.md): kho mẫu câu, chấm xếp câu khi câu có dấu, nối lại câu từ token, regex nhanh. Phần giao diện: lesson.mjs mục G.
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
await import('../../web/js/lesson/engine.js'); await import('../../web/js/lesson/card.js');
const E = globalThis.LessonEngine, C = globalThis.LearnCard;
let total = 0, fails = 0;
const ok = (c, m) => { total++; if (!c) { fails++; console.error('✗', m); } };
const frames = JSON.parse(fs.readFileSync('content/lesson/card/frames.json', 'utf8')).frames;
try { execFileSync('node', ['scripts/lesson/build-card.mjs', '--check'], { stdio: 'pipe' }); ok(true); } catch (e) { ok(false, 'build-card --check: ' + String(e.stderr).slice(0, 800)); }
ok(C.match('Hi! Can I have a large coffee, please?', frames)?.f === 'Can I have ___, please?', 'mẫu đúng cho câu của anh chủ');
ok(C.match('Zxcvb qwert.', frames) === null, 'câu lạ → không mẫu');
ok(C.goodTr('  Hello!  ', 'hello') === '' && C.goodTr('Xin chào', 'hello') === 'Xin chào', 'bản dịch trùng tiếng Anh = thiếu');
ok(JSON.stringify(C.altParts('Can I have [a small tea], please?')) === JSON.stringify(['Can I have ', 'a small tea', ', please?']), 'đánh dấu phần đổi');
// mọi câu dạng bài: nối token = đúng câu; chấm xếp câu đúng khi câu có dấu, viết hoa, dấu nháy, gạch nối
globalThis.t = s => s; const g = {}; new Function('self', fs.readFileSync('web/js/data.js', 'utf8'))(g);
for (const f of fs.readdirSync('web/js/lib').sort()) if (/\.js$/.test(f) && !/^notes/.test(f)) { try { new Function('self', fs.readFileSync('web/js/lib/' + f, 'utf8'))(g); } catch (e) { /* tệp phụ */ } }
const sents = []; for (const tp of g.IELTS_DATA.TOPICS) for (const w of tp.words || []) if (w.ex) sents.push(String(w.ex).trim());
for (const s of JSON.parse(fs.readFileSync('content/lesson/stories.json', 'utf8')).items) s.lines.forEach(l => sents.push(l.en));
let bad = 0, slow = 0;
for (const s of sents) {
  const j = C.tokens(s).map(x => x.w || x.gap).join(''); if (j !== s) { bad++; ok(false, 'token không nối lại đúng: ' + s); }
  const words = E.toks(s), it = { type: 'build', answer: words.join(' ') }; if (!E.check(it, words)) { bad++; ok(false, 'không chấm được: ' + s); }
  const t0 = performance.now(); C.match(s, frames); if (performance.now() - t0 > 5) slow++;
}
ok(slow <= sents.length * 0.001, `regex mẫu chậm: ${slow}/${sents.length} câu > 5 ms`);
// thẻ mẫu trong bài ôn: ra build/say từ câu ví dụ, không bao giờ để đề chứa "…"
const pat = { word: 'Can I have …, please?', pos: 'phrase', ex: 'Hi! Can I have a large coffee, please?', def: 'x', srs: { reps: 1, last: 1, due: 1, lapses: 0 } };
const items = E.build([{ card: pat, why: 'due' }], { seed: 3, pool: [{ word: 'apple', pos: 'n' }, { word: 'take off', pos: 'v' }], perWord: 2 });
ok(items.length === 2 && items.every(i => ['build', 'say'].includes(i.type) && !/…/.test(i.sent || i.answer)), 'thẻ mẫu → build/say từ câu thật: ' + items.map(i => i.type));
ok(items.filter(i => i.type === 'build').every(i => i.tiles.every(x => !/\s/.test(x))), 'ô nhiễu chỉ một từ');
const off = E.adapt(items.find(i => i.type === 'say'), { speak: true }); ok(off.type === 'mean', 'tắt nói: thẻ mẫu đổi sang chọn, không đổ lỗi');
if (fails) { console.error(`✗ lesson-card: ${fails} lỗi/${total}`); process.exit(1); }
console.log(`✓ lesson-card: ${total} kiểm · ${sents.length} câu · ${frames.length} mẫu`);
