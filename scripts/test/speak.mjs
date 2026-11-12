// Unit: Speak.score (web/js/speak/score.js) – căn từ, ý định, luật đạt, hợp đồng §5 (docs/specs/play-and-speak.md) với UI.recognize giả.
import fs from 'node:fs'; import vm from 'node:vm'; import assert from 'node:assert/strict';
const ctx = { self: {}, Date, Math, Promise, setTimeout }; ctx.self = ctx; vm.createContext(ctx);
vm.runInContext(fs.readFileSync('web/js/speak/score.js', 'utf8'), ctx);
const S = ctx.Speak; let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; };
const A = S.align('Could I get a medium latte, please?', 'could i get a meeting latte please');
ok(A.length === 7 && A[4].w === 'medium' && !A[4].ok && A.filter(w => w.ok).length === 6, 'align đánh dấu đúng từ sai');
ok(S.align("I'd like two, please.", "i'd like two please").every(w => w.ok), 'dấu câu / nháy không làm sai');
ok(S.align('a b c', '').every(w => !w.ok), 'không nghe được → mọi từ sai');
ok(S.intentOf('how much is it all together', [{ id: 'pay', keywords: ['how much', 'the bill'] }]) === 'pay', 'ý định theo từ khoá');
ok(S.intentOf('hello there', [{ id: 'pay', keywords: ['how much'] }]) === null, 'không khớp → null');
ok(S.pass({ text: 0.86 }) && !S.pass({ text: 0.5 }) && !S.pass({ text: 1, unclear: true }), 'luật đạt + không rõ không đạt');
// Hợp đồng: UI.recognize giả trả về câu nghe được
ctx.UI = { recognize: (t, acc, cb) => { cb.start(); setTimeout(() => { cb.end(); cb.result({ heard: 'could i get a medium latte please', score: 92 }); }, 5); return { stop() {} }; } };
const r = await S.score({ target: 'Could I get a medium latte, please?', mode: 'drill', intents: [{ id: 'order', keywords: ['latte'] }] });
for (const k of ['engine', 'text', 'words', 'fluency', 'conf', 'ms']) ok(k in r, 'hợp đồng có ' + k);
ok(r.engine === 'webspeech' && r.text === 1 && r.intent === 'order' && r.conf === 0.92 && typeof r.fluency.wpm === 'number', 'kết quả đúng');
ctx.UI = { recognize: (t, acc, cb) => { setTimeout(() => cb.error('no-speech'), 1); return { stop() {} }; } };
const u = await S.score({ target: 'Hi there', mode: 'drill' });
ok(u.unclear && u.error === 'no-speech' && u.text === 0 && !S.pass(u), 'không rõ → unclear, không đạt');
ctx.UI = { recognize: () => null }; ok((await S.score({ target: 'Hi' })).error === 'unsupported', 'không có mic → unsupported');
console.log(`speak: ${n} ok`);
