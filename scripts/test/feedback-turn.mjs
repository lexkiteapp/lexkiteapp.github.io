// 🧩 Feedback.turn / Feedback.engine / Feedback.card (web/js/feedback/turn.js) – spec docs/specs/ai-speaking-first.md T2 + T12.
// Cổng chủ 05/11 "trên máy, 100% free, KHÔNG lỗi, KHÔNG giới hạn": giả lập 429 hết quota, 5xx, quá giờ, offline, net trả rác, máy cấp C
// → mỗi lượt vẫn có thẻ trên máy ≤ 300 ms, không chữ hết lượt/lỗi, không lượt trống. Thuần Node, < 2 s.
import fs from 'node:fs'; import vm from 'node:vm'; import path from 'node:path'; import assert from 'node:assert/strict'; import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const c = { setTimeout, clearTimeout, AbortController, Promise, navigator: { onLine: true } }; vm.createContext(c); c.self = c; c.window = c;
for (const f of ['pron/pairs.js', 'call/engine.js', 'feedback/turn.js']) vm.runInContext(fs.readFileSync(path.join(ROOT, 'web/js', f), 'utf8'), c, { filename: f });
const { Feedback: F, CallEngine: E } = c;
let n = 0; const ok = (v, m) => { assert.ok(v, m); n++; };

// 1. Mọi luật có cấu trúc + ví dụ + bài ngữ pháp CÓ THẬT; ví dụ sai bị chính luật bắt, ví dụ đúng không bị báo
const gdir = path.join(ROOT, 'web/js/grammar');
const gsrc = [path.join(ROOT, 'web/js/grammar.js'), ...fs.readdirSync(gdir).filter(f => f.endsWith('.js')).map(f => path.join(gdir, f))].map(f => fs.readFileSync(f, 'utf8')).join('\n');
const PQ = 'What did you do yesterday?';
for (const id of E.ruleIds()) {
  const m = F.META[id];
  ok(m && m.name && m.ok && m.bad && m.lesson, `luật ${id} thiếu META`);
  ok(new RegExp(`id: ?'${m.lesson}'`).test(gsrc), `luật ${id}: bài ngữ pháp '${m.lesson}' không tồn tại`);
  ok(E.whyOf(id).length > 10, `luật ${id}: thiếu giải thích`);
  ok(!E.correct(m.ok, PQ), `luật ${id}: ví dụ ĐÚNG bị báo sai: ${m.ok}`);
  const fb = F.turn(m.bad, PQ);
  ok(fb && fb.items.some(x => x.id === id), `luật ${id}: ví dụ SAI không bị chính luật bắt: ${m.bad}`);
}
ok(Object.keys(F.META).every(id => E.ruleIds().includes(id)), 'META có id không còn luật');

// 2. Diff theo từ: gộp thay từ, giữ chữ người học gõ
const J = v => JSON.parse(JSON.stringify(v));
assert.deepEqual(J(F.diff('he go to school', 'he goes to school')), [['=', 'he'], ['~', 'go', 'goes'], ['=', 'to'], ['=', 'school']]); n++;
assert.deepEqual(J(F.diff('I want go home.', 'I want to go home.')), [['=', 'I'], ['=', 'want'], ['+', 'to'], ['=', 'go'], ['=', 'home.']]); n++;
assert.deepEqual(J(F.diff('I can to swim', 'I can swim')), [['=', 'I'], ['=', 'can'], ['-', 'to'], ['=', 'swim']]); n++;
ok(F.diff('', '').length === 0, 'diff rỗng');

// 3. Toàn tập gec-set: câu bị báo → thẻ đủ mục, diff dựng lại đúng câu sửa; câu không bị báo → null; ≤ 5 ms/câu trung bình
const set = fs.readFileSync(path.join(ROOT, 'scripts/feedback/gec-set.jsonl'), 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
const words = s => s.split(/\s+/).filter(Boolean).join(' ');
const t0 = performance.now(); let hit = 0;
for (const x of set) {
  const r = E.correct(x.src, x.q), fb = F.turn(x.src, x.q);
  if (!r) { ok(fb === null, `${x.id}: luật im nhưng thẻ hiện`); continue; }
  hit++;
  ok(fb && fb.items.length >= 1, `${x.id}: thiếu mục lỗi`);
  for (const it of fb.items) ok(it.name && it.why && it.lesson && it.ok && it.bad, `${x.id}: mục ${it.id} thiếu trường`);
  const rebuilt = fb.ops.flatMap(o => (o[0] === '=' || o[0] === '+' ? [o[1]] : o[0] === '~' ? [o[2]] : [])).join(' ');
  ok(rebuilt === words(r.good), `${x.id}: diff không dựng lại câu sửa: ${rebuilt} ≠ ${r.good}`);
  ok(fb.ops.some(o => o[0] !== '='), `${x.id}: thẻ không có chỗ sửa nào`);
  ok(fb.srs && fb.srs.front === r.good, `${x.id}: thiếu dữ liệu ôn FSRS`);
}
const per = (performance.now() - t0) / set.length;
ok(hit >= 50, `chỉ ${hit} câu bị bắt – luật/tập bị hỏng?`);
ok(per < 5, `Feedback.turn chậm: ${per.toFixed(2)} ms/câu`);

// 4. Thẻ: không chữ lỗi/hết lượt, thoát HTML, gọn khi compact
const BAD_UI = /hết lượt|quota|limit|lỗi|error|undefined|null|NaN/i, txt = h => h.replace(/<[^>]+>/g, ' ');
for (const x of set) { const h = F.card(F.turn(x.src, x.q)); ok(!BAD_UI.test(txt(h)), `${x.id}: thẻ có chữ lỗi: ${h}`); }
ok(F.card(null) === '', 'card(null) phải rỗng');
const xss = F.card(F.turn('<img src=x onerror=alert(1)> I can to swim', ''));
ok(!/<img/.test(xss) && /&lt;img/.test(xss), 'card không thoát HTML');
const two = F.turn('He want go and I can to swim', '');
ok(two && two.items.length >= 2, 'câu nhiều lỗi phải có nhiều mục');
ok((F.card(two, { compact: true }).match(/class="fb-item"/g) || []).length === 1, 'compact chỉ 1 mục');

// 5. Tầng: trên máy trước, mạng chỉ nâng thêm, mọi kiểu hỏng → local im lặng
const SRC = 'I can to swim very well', ms = () => performance.now();
async function within(p, lim, m) { const a = ms(); const v = await p; ok(ms() - a <= lim, `${m}: ${Math.round(ms() - a)} ms > ${lim}`); return v; }
const local = F.turn(SRC, '');
{ // máy cấp C: không có net
  const r = F.engine().run(SRC, '');
  ok(r.local && r.local.tier === 'local', 'cấp C: phải có thẻ trên máy');
  ok((await r.upgrade) === r.local, 'cấp C: upgrade = local');
}
{ // net tốt → nâng thêm câu tự nhiên, vẫn giữ chỗ sửa của luật
  const u = await F.engine({ net: async () => ({ natural: 'I am a pretty good swimmer.' }) }).run(SRC, '').upgrade;
  ok(u.tier === 'net' && u.natural === 'I am a pretty good swimmer.' && u.items.length === local.items.length, 'net tốt phải nâng thêm');
  ok(/Cách nói tự nhiên hơn/.test(F.card(u)), 'thẻ phải hiện câu tự nhiên');
}
const cases = {
  '429 hết quota': async () => ({ status: 429, error: 'quota exceeded' }),
  '429 ném lỗi': async () => { const e = new Error('Too Many Requests'); e.status = 429; throw e; },
  '500': async () => ({ status: 500 }),
  '503 ném lỗi': async () => { throw Object.assign(new Error('x'), { response: { status: 503 } }); },
  'ném đồng bộ': () => { throw new Error('boom'); },
  'quá giờ': () => new Promise(() => {}),
  'trả rác': async () => 'nope',
  'chữ lỗi lọt vào': async () => ({ natural: 'Daily limit exceeded, try tomorrow' }),
  'HTML': async () => ({ natural: '<html>502 Bad Gateway</html>' }),
  'rỗng': async () => ({ natural: '   ' }),
  'trùng câu gốc': async () => ({ natural: SRC }),
  'dài bất thường': async () => ({ natural: 'a '.repeat(400) }),
};
for (const [name, net] of Object.entries(cases)) {
  const a = ms(); const r = F.engine({ net, timeoutMs: 120 }).run(SRC, '');
  ok(ms() - a < 300 && r.local && r.local.items.length, `${name}: thẻ trên máy phải có ngay`);
  const u = await within(r.upgrade, 300, name);
  ok(u === r.local, `${name}: phải rơi về đúng thẻ trên máy`);
  ok(!BAD_UI.test(txt(F.card(u))), `${name}: thẻ có chữ lỗi`);
}
{ // sau 429: nghỉ gọi mạng (không dội máy chủ), hết giờ nghỉ thì thử lại
  let calls = 0, clock = 1e6;
  const eng = F.engine({ net: async () => { calls++; return { status: 429 }; }, now: () => clock, restMs: 1000 });
  await eng.run(SRC, '').upgrade; await eng.run(SRC, '').upgrade;
  ok(calls === 1, `sau 429 phải nghỉ gọi mạng (gọi ${calls} lần)`);
  clock += 1001; await eng.run(SRC, '').upgrade; ok(calls === 2, 'hết giờ nghỉ phải thử lại');
}
{ // offline → không gọi mạng
  let calls = 0; const r = F.engine({ net: async () => { calls++; return { natural: 'x y' }; }, online: () => false }).run(SRC, '');
  ok((await r.upgrade) === r.local && calls === 0, 'offline không được gọi mạng');
  c.navigator.onLine = false; let k = 0;
  await F.engine({ net: async () => { k++; return {}; } }).run(SRC, '').upgrade; ok(k === 0, 'navigator.onLine=false không được gọi mạng'); c.navigator.onLine = true;
}
{ // câu đúng + net hỏng → null (không thẻ, không lỗi); câu đúng + net tốt → chỉ câu tự nhiên
  const r = F.engine({ net: async () => ({ status: 429 }) }).run('I agree with you.', '');
  ok(r.local === null && (await r.upgrade) === null, 'câu đúng + 429 phải im lặng');
  const u2 = await F.engine({ net: async () => ({ natural: 'Totally, I agree.' }) }).run('I agree with you.', '').upgrade;
  ok(u2 && u2.natural && u2.items.length === 0 && !/fb-diff/.test(F.card(u2)), 'câu đúng + net: chỉ câu tự nhiên, không diff');
}
// 6. Không có chuỗi giao diện hết lượt/lỗi trong module
const srcTxt = fs.readFileSync(path.join(ROOT, 'web/js/feedback/turn.js'), 'utf8');
ok(!/t\(['"`][^'"`]*(hết lượt|lỗi|thử lại sau)/i.test(srcTxt), 'turn.js không được có chuỗi giao diện hết lượt/lỗi');
// 7. Call dùng đúng thẻ chung (không tự dựng câu "bad → good" riêng)
const callTxt = fs.readFileSync(path.join(ROOT, 'web/js/call.js'), 'utf8');
ok(/Feedback\.card\(/.test(callTxt) && !/TIP_FIX\(fix\.bad/.test(callTxt), 'call.js phải dùng Feedback.card');
console.log(`feedback-turn: ${n} kiểm tra OK (bắt ${hit}/${set.length} câu, ${per.toFixed(2)} ms/câu)`);
