// 📘 Test "Cách dùng từ" (#/usage): (1) dữ liệu soạn tay – cú pháp, số lượng, ví dụ chứa đúng từ/mẫu, không trùng mã, bài ngữ pháp có thật,
// câu luyện hợp lệ, không lẫn tiếng Việt vào phần tiếng Anh, đủ bản tiếng Anh cho mọi ghi chú; chỉ mục khớp dữ liệu;
// (2) giao diện chạy cả app trong jsdom: trang chính, 5 từ (giới từ, mẫu động từ, trạng từ, cặp dễ nhầm, từ chưa có dữ liệu → trang dự phòng),
// chuyên mục + bộ lọc, ô tìm kiếm (combobox), luyện nhanh (chấm ngay), lưu vào sổ, liên kết từ Chia động từ / Sửa ngữ pháp / Từ điển;
// (3) khóa giao diện có bản tiếng Anh. Chạy: node scripts/test/usage.mjs
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import jsdom from 'jsdom';
const require = createRequire(import.meta.url);
const WEB = 'web';
let n = 0, fails = 0; const ok = (c, m) => { n++; if (!c) { fails++; console.log('✗', m); } };

// ================= 1. Dữ liệu =================
const ctx = { self: {} }; ctx.self = ctx; vm.createContext(ctx);
const run = f => vm.runInContext(fs.readFileSync(f, 'utf8'), ctx, { filename: f });
run('web/js/verbs-core.js'); run('web/js/usage-core.js');
const FILES = fs.readdirSync('web/js/usage').filter(f => f.endsWith('.js')).sort();
FILES.forEach(f => run('web/js/usage/' + f));
const U = ctx.LK_USAGE, V = ctx.LK_VERBS;
const VI = /[àáạảãâầấậẩẫăằắặẳẵèẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;
const errs = [];
const E = (e, m) => errs.push(`${e.kind}:${e.key}: ${m}`);
// Mọi dạng của một từ (study → studies, studied, studying; good → better…), để kiểm ví dụ có chứa đúng từ
const formsOf = w => {
  const s = new Set([w]);
  const add = x => x && s.add(x);
  add(w + 's'); add(w + 'es'); add(w + 'd'); add(w + 'ed'); add(w + 'ing'); add(w + 'ly'); add(w + 'er'); add(w + 'r');
  if (/y$/.test(w)) { add(w.slice(0, -1) + 'ies'); add(w.slice(0, -1) + 'ied'); add(w.slice(0, -1) + 'ily'); }
  if (/e$/.test(w)) { add(w.slice(0, -1) + 'ing'); add(w.slice(0, -1) + 'y'); }
  if (/^[a-z]+$/.test(w) && V) { try { const f = V.forms(w); [...f.past, ...f.pp, ...f.ing, ...f.s].forEach(x => add(x.w)); } catch (e) { /* bỏ qua */ } }
  if (w === 'good') ['better', 'best', 'well'].forEach(add);
  if (w === 'bad') ['worse', 'worst'].forEach(add);
  if (w === 'can\'t') add('can’t');
  return [...s];
};
const hasWord = (text, w) => { const t0 = U.norm(text), t = ' ' + (t0 + ' ' + t0.replace(/n't\b/g, ' not').replace(/'d\b/g, ' would had')).replace(/[^a-z' -]/g, ' ') + ' '; return w.split(' ').length > 1 ? t.includes(' ' + U.norm(w) + ' ') || formsOf(w.split(' ')[0]).some(f => t.includes(' ' + f + ' ')) : formsOf(U.norm(w)).some(f => t.includes(' ' + f + ' ')); };
const stars = s => (String(s).replace(/\*\*/g, '').match(/\*/g) || []).length % 2 === 0;
const total = {};
for (const k of U.KINDS) {
  const { entries, errors } = U.parse(k, ctx.LK_USAGE_SRC[k]);
  errors.forEach(x => errs.push(x));
  total[k] = { entries: entries.length, items: entries.reduce((a, e) => a + e.items.length, 0) };
  const seen = new Set();
  for (const e of entries) {
    const id = e.sub + ':' + e.key; if (seen.has(id)) E(e, 'trùng mục'); seen.add(id);
    if (k !== 's' && !e.items.length) E(e, 'không có dòng +');
    if (k === 's' && (!e.f || !(e.ex.length + e.items.length) || !e.k.length)) E(e, 'cấu trúc thiếu công thức/ví dụ/từ khóa');
    if (k === 'v') e.items.forEach(x => { if (!U.VCODES.includes(x.h)) E(e, 'mã mẫu lạ ' + x.h); });
    if (k === 'p') e.items.forEach(x => { if (!U.PREPS.includes(x.h.split(' ').pop())) E(e, 'giới từ lạ ' + x.h); });
    if (k === 'a') e.pos.forEach(p => { if (!['front', 'mid', 'end'].includes(p)) E(e, 'vị trí lạ ' + p); });
    if (k === 'c' && e.items.length < 2) E(e, 'cặp dễ nhầm cần ≥ 2 thành viên');
    // Nghĩa & ghi chú: có bản Việt thì phải có bản Anh; bản Anh không lẫn tiếng Việt; dấu *…* đóng mở đủ
    const pairs = [...(k === 'v' ? e.items.filter(x => x.vi || x.en) : k === 's' ? e.items : e.items), ...e.notes, ...e.mis.filter(m => m.vi || m.en), ...e.reg];
    for (const x of pairs) { if (!x.vi || !x.en) E(e, 'thiếu bản vi/en: ' + (x.vi || x.en || x.h)); if (VI.test(x.en)) E(e, 'bản tiếng Anh lẫn tiếng Việt: ' + x.en); if (!stars(x.vi) || !stars(x.en)) E(e, 'dấu * lẻ: ' + (x.vi || x.en)); }
    // Phần tiếng Anh (ví dụ, câu sai/đúng, công thức, collocation) không có chữ tiếng Việt
    const englishBits = [...e.items.flatMap(x => x.ex), ...e.ex, ...e.quiz, ...e.mis.flatMap(m => [m.w, m.r]), e.f, ...e.col, ...(k === 'c' ? [] : e.items.map(x => x.h))];
    englishBits.forEach(s => { if (VI.test(s)) E(e, 'phần tiếng Anh lẫn tiếng Việt: ' + s); });
    for (const m of e.mis) if (!m.w || !m.r || m.w === m.r) E(e, 'lỗi sai/đúng không hợp lệ: ' + m.w);
    // Ví dụ: đúng một cặp [ ], đáp án ≠ phương án nhiễu, chứa đúng từ/mẫu
    const checkEx = (s, head, free) => {
      if (free && !/\[/.test(s)) { if (head && !hasWord(s, head)) E(e, `ví dụ không chứa “${head}”: ${s}`); return; }
      if ((s.match(/\[/g) || []).length !== 1 || (s.match(/\]/g) || []).length !== 1) return E(e, 'ví dụ cần đúng 1 cặp [ ]: ' + s);
      const x = U.example(s);
      if (!x.ans) E(e, 'đáp án trống: ' + s);
      if (x.alts.includes(x.ans)) E(e, 'phương án nhiễu trùng đáp án: ' + s);
      if (head && !hasWord(x.text, head)) E(e, `ví dụ không chứa “${head}”: ${s}`);
    };
    for (const it of e.items) for (const s of it.ex) {
      if (k === 'p') { checkEx(s, e.key); const x = U.example(s); if (U.norm(x.ans) !== it.h.split(' ').pop()) E(e, `ví dụ của “${it.h}” phải đánh dấu đúng giới từ: ${s}`); }
      else if (k === 'v') checkEx(s, e.key.replace(/^(be|can't|would|had|look forward|feel|give|end|carry|put|go)\b.*/, m => m.split(' ')[0]));
      else if (k === 'a') checkEx(s, it.h);
      else if (k === 'c') checkEx(s, it.h.replace(/\s*\(.*\)$/, '').split(' ')[0]);
      else checkEx(s, '');
    }
    for (const s of e.ex) { checkEx(s, k === 'p' || k === 'v' ? e.key.split(' ')[0] : '', true); if (k === 's' && !e.k.some(w => hasWord(U.example(s).text, w) || U.norm(U.example(s).text).includes(w.replace(/ … /, ' ')))) E(e, 'ví dụ cấu trúc không chứa từ khóa: ' + s); }
    for (const s of e.quiz) { checkEx(s, ''); if (!U.example(s).alts.length) E(e, 'câu luyện "?" cần phương án nhiễu: ' + s); }
    // Câu luyện tự sinh/soạn tay: đáp án nằm trong lựa chọn, lựa chọn không trùng
    for (const q of U.quizItems(e)) if (!q.choices.includes(q.ans) || new Set(q.choices).size !== q.choices.length || q.choices.length < 2) E(e, 'câu luyện không hợp lệ: ' + q.pre + '___' + q.post);
  }
}
ok(!errs.length, 'dữ liệu hợp lệ' + (errs.length ? `: ${errs.length} lỗi\n  ` + errs.slice(0, 25).join('\n  ') : ''));
ok(total.p.items >= 300, `≥ 300 cụm từ + giới từ (có ${total.p.items} cụm / ${total.p.entries} từ)`);
ok(total.v.entries >= 120, `≥ 120 động từ có mẫu (có ${total.v.entries})`);
ok(total.a.entries >= 60, `≥ 60 ghi chú trạng từ (có ${total.a.entries})`);
ok(total.s.entries >= 40, `≥ 40 cấu trúc câu (có ${total.s.entries})`);
ok(total.c.entries >= 60, `≥ 60 cặp từ dễ nhầm (có ${total.c.entries})`);
const subs = Object.fromEntries(['a', 'v', 'n'].map(s => [s, U.list('p', s).length]));
ok(subs.a >= 80 && subs.v >= 80 && subs.n >= 50, `đủ 3 nhóm giới từ (tính từ ${subs.a}, động từ ${subs.v}, danh từ ${subs.n})`);
const mc = ['stop', 'remember', 'forget', 'try', 'regret'].filter(v => { const e = U.lookup(v).v[0]; return e && e.items.some(x => x.h === 'to') && e.items.some(x => x.h === 'ing') && e.notes.length; });
ok(mc.length === 5, 'cặp đổi nghĩa stop/remember/forget/try/regret có cả to-V, V-ing và ghi chú');
// Bài luyện: n câu, mỗi câu có đúng 1 đáp án trong 2–4 lựa chọn, ổn định theo hạt giống
const qz = U.quiz([...U.lookup('interested').p, ...U.lookup('stop').v], 5, 42);
ok(qz.length >= 3 && qz.length <= 5 && qz.every(q => q.choices.includes(q.ans) && q.choices.length >= 2 && q.choices.length <= 4), 'quiz(): 3–5 câu hợp lệ');
ok(JSON.stringify(U.quiz(U.lookup('depend').p, 5, 7)) === JSON.stringify(U.quiz(U.lookup('depend').p, 5, 7)), 'quiz(): cùng hạt giống → cùng đề');
// Chỉ mục & tra cứu dạng biến đổi
try { execFileSync('node', ['scripts/build-usage-index.mjs', '--check'], { stdio: 'pipe' }); ok(true, ''); } catch (e) { ok(false, 'usage-index.js khớp dữ liệu & bài ngữ pháp tồn tại: ' + String(e.stderr || e.stdout).trim()); }
run('web/js/usage-index.js');
const R = q => U.resolve(q);
ok(R('interested') === 'interested' && R('Depends') === 'depend' && R('stopped') === 'stop' && R('relied') === 'rely' && R('arriving') === 'arrive', 'resolve: depends → depend, stopped → stop, relied → rely, arriving → arrive');
ok(R('interested in') === 'interested' && R('affect-effect') === 'affect-effect' && R('blorfx') === null, 'resolve: cụm “interested in”, mã cặp, từ không có');
ok(U.suggest('interes')[0] === 'interest' || U.suggest('interes').includes('interested'), 'suggest: “interes” → interested/interest');
ok(U.near('responsable').includes('responsible'), 'near: gõ sai “responsable” → responsible');
const idx = ctx.LK_USAGE_IDX;
ok(Object.keys(idx.l).length >= 20 && Object.values(idx.l).every(x => x[0] && x[1]), `tên bài ngữ pháp liên kết (${Object.keys(idx.l).length} bài)`);

// ================= 2. Giao diện =================
const { JSDOM } = jsdom;
const html = fs.readFileSync(path.join(WEB, 'app', 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script(?: defer)? src="([^"]+)"><\/script>/g)].map(m => m[1]);
const vc = new jsdom.VirtualConsole(); vc.on('jsdomError', e => { if (!/Not implemented/.test(e.message)) console.error(e.message); });
const dom = new JSDOM(html.replace(/<!--hero-->[\s\S]*?<!--\/hero-->/, '').replace(/<script(?: defer)? src="[^"]+"><\/script>/g, '').replace(/<link[^>]+>/g, ''), { url: 'http://localhost/app/#/home', runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole: vc });
const w = dom.window, errors = [], net = [];
w.addEventListener('error', e => errors.push(e.message));
w.console.error = (...a) => errors.push(a.join(' '));
w.localStorage.setItem('vb.uiLang', 'vi'); w.scrollTo = () => {}; w.HTMLElement.prototype.scrollIntoView = () => {}; w.matchMedia = () => ({ matches: false, addEventListener() {} });
w.CSS = { escape: s => s };
const NOTES = { interested: null, depend: { m: 'De- + pend.', e: 'Sai: depend in → Đúng: depend on.', u: 'IELTS Speaking: It depends on the situation.', f: 'dependent (adj), dependence (n), dependable (adj)' } };
w.fetch = async url => { const u = String(url); net.push(u); if (/js\/notes\/d\.json/.test(u)) return { ok: true, json: async () => ({ depend: NOTES.depend }) }; return { ok: false, status: 404, json: async () => ({}), text: async () => '' }; };
for (const f of scripts) { try { w.eval(fs.readFileSync(path.join(WEB, f), 'utf8')); } catch (e) { errors.push(f + ': ' + e.message); } }
require('./lazyfix.js')(w, fs, path, WEB, errors);
const tick = (ms = 40) => new Promise(r => setTimeout(r, ms));
const $ = s => w.document.querySelector(s), $$ = s => [...w.document.querySelectorAll(s)];
const go = async (h, ms = 160) => { w.location.hash = h; await tick(ms); };
const txt = s => ($(s) || {}).textContent || '';
const click = el => el && el.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true }));
const key = (el, k) => el.dispatchEvent(new w.KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
await tick(300); await go('#/welcome/setup'); if ($('#go')) $('#go').click(); await tick(1500);
ok(w.LK_USAGE && w.LK_USAGE_IDX && w.App.routes.usage, 'nạp gói usage + chỉ mục + route #/usage');

// Trang chính
const net0 = net.length;
await go('#/usage');
ok(/Cách dùng từ/.test(txt('h1')) && $('#usQ') && $$('.us-cat').length === 5, 'trang chính: tiêu đề, ô tìm, 5 chuyên mục');
ok($$('.us-cat').every(a => /^#\/usage\?c=(prep|verb|adv|struct|pair)$/.test(a.getAttribute('href'))) && /\d+ mục/.test(txt('.us-cat .n')), 'chuyên mục có liên kết + số mục');
// Ô tìm kiếm: gợi ý, phím ↓ Enter
const q = $('#usQ'); q.value = 'interes'; q.dispatchEvent(new w.Event('input')); await tick(140);
ok(!$('#usList').hidden && $$('.us-opt').length >= 1 && q.getAttribute('aria-expanded') === 'true', 'gợi ý khi gõ “interes” (combobox)');
key(q, 'ArrowDown'); ok($('#uso0').getAttribute('aria-selected') === 'true' && q.getAttribute('aria-activedescendant') === 'uso0', 'phím ↓ chọn gợi ý (aria-activedescendant)');
key(q, 'Enter'); await tick(250);
ok(/^#\/usage\/interest/.test(w.location.hash), 'Enter → mở trang từ');

// Từ 1: giới từ – interested
await go('#/usage/interested', 300);
ok(txt('#usW') === 'interested', 'interested: tiêu đề');
ok($('#us-prep') && /interested in/.test(txt('#us-prep')) && $('#us-prep .us-ex mark') && txt('#us-prep .us-ex mark') === 'in', 'interested: giới từ “in” + ví dụ tô đậm');
ok($('#us-mis') && /interested about politics/.test(txt('#us-mis')) && /interested in politics/.test(txt('#us-mis')) && /about/.test(txt('#us-mis .us-tx')), 'interested: lỗi hay gặp ❌/✅ + giải thích');
ok($$('#us-gr a[href^="#/grammar/"]').length >= 1 && $$('#us-gr a[href^="#/grammar/"]').every(a => !/dependent-prepositions$/.test(a.textContent)), 'interested: link bài ngữ pháp có tên bài');
ok($$('.us-q').length >= 3 && $$('.us-q').length <= 5, 'interested: luyện nhanh 3–5 câu');
ok($$('[data-usay]').length >= 3, 'interested: nút nghe');
ok($$('.us-jump a').length >= 3, 'interested: thanh đi tới mục');
{ const li = $('.us-q'), inputs = [...li.querySelectorAll('input')], ans = w.LK_USAGE.example; const right = inputs.find(i => li.querySelector('p').textContent && i.value) ; const wrong = inputs[0];
  wrong.checked = true; wrong.dispatchEvent(new w.Event('change', { bubbles: true })); await tick();
  ok(li.dataset.done && li.querySelector('.us-fb').textContent.length > 5 && li.querySelector('label.ok') && inputs.every(i => i.disabled), 'luyện nhanh: chấm ngay, hiện đáp án đúng, khóa câu'); void right; void ans; }
for (const li of $$('.us-q').slice(1)) { const i = li.querySelector('input'); i.checked = true; i.dispatchEvent(new w.Event('change', { bubbles: true })); await tick(10); }
ok(/\d\/\d/.test(txt('.us-score')) && $('#usAgain'), 'luyện nhanh: điểm tổng + làm bộ khác');
click($('#usAgain')); await tick(); ok($$('.us-q').length >= 3 && !$('.us-q[data-done]'), 'làm bộ câu khác → đề mới');
// Lưu vào sổ
const sv = $$('#us-prep [data-usave]')[0]; click(sv); await tick(150);
ok(w.App.inDeck('interested in') && sv.disabled && /Đã lưu/.test(sv.textContent), 'lưu “interested in” vào sổ');

// Từ 2: mẫu động từ – “stopped” → stop
await go('#/usage/stopped', 300);
ok(txt('#usW') === 'stop' && $('#us-verb') && /\+ V-ing/.test(txt('#us-verb')) && /\+ to-V/.test(txt('#us-verb')), 'stopped → stop: mẫu + V-ing / + to-V');
ok(/ngừng hẳn/.test(txt('#us-verb')) && $('#us-verb .us-tip'), 'stop: nghĩa khác nhau + ghi chú đổi nghĩa');
ok($('a[href="#/verb/stop"]'), 'stop: liên kết Chia động từ');

// Từ 3: trạng từ – hardly
await go('#/usage/hardly', 300);
ok($('#us-adv .us-table') && /hầu như không/.test(txt('#us-adv')) && /Giữa câu/.test(txt('#us-adv')), 'hardly: bảng dạng + nghĩa + vị trí');

// Từ 4: cặp dễ nhầm – trang mã affect-effect, và từ “affect”
await go('#/usage/affect-effect', 300);
ok(/affect \/ effect/.test(txt('#usW')) && $('#us-pair .us-table') && $$('#us-pair tbody tr').length === 2, 'affect-effect: bảng so sánh 2 từ');
await go('#/usage/affect', 300);
ok($('#us-pair') && $('#us-pair a[href="#/usage/effect"]'), 'affect: mục “Dễ nhầm với” + liên kết effect');

// Từ 5: chưa có dữ liệu → trang dự phòng (không trống)
await go('#/usage/blorfing', 300);
ok(/Chưa có ghi chú cách dùng riêng/.test(txt('#view')) && $('a[href="#/dict/blorfing"]') && $$('.us-cat').length === 5, 'từ chưa có dữ liệu: trang dự phòng + tra nghĩa + chuyên mục');
await go('#/usage/responsable', 300);
ok($('#us-near a[href="#/usage/responsible"]'), 'gõ sai “responsable” → gợi ý responsible');
// Họ từ từ ghi chú (js/notes)
await go('#/usage/depend', 400);
ok($('#us-fam') && /dependent/.test(txt('#us-fam')), 'depend: họ từ lấy từ ghi chú từ vựng');

// Chuyên mục + lọc
await go('#/usage?c=prep', 300);
const rows = () => $$('#usRows .us-row').length;
const all0 = rows();
ok(all0 >= 300, `chuyên mục giới từ: ${all0} mục`);
click($('#usSub [data-v="n"]')); await tick();
ok(rows() > 40 && rows() < all0 && $('#usSub [data-v="n"]').getAttribute('aria-pressed') === 'true', 'lọc Danh từ + giới từ');
click($('#usPr [data-p="on"]')); await tick();
ok(rows() > 0 && $$('#usRows .us-row').every(a => / on\b| on /.test(a.querySelector('b').textContent)), 'lọc theo giới từ “on”');
const f = $('#usF'); f.value = 'impact'; f.dispatchEvent(new w.Event('input')); await tick();
ok(rows() === 1, 'lọc nhanh “impact”');
ok($$('#usQz .us-q').length >= 3, 'chuyên mục: luyện nhanh cả chuyên mục');
await go('#/usage?c=verb', 300);
click($('#usSub [data-v="both"]')); await tick();
ok(rows() >= 5 && /stop/.test(txt('#usRows')) && /remember/.test(txt('#usRows')), 'động từ: lọc “cả hai – đổi nghĩa”');
await go('#/usage?c=adv', 300);
ok(/Trạng từ đứng ở đâu/.test(txt('#view')) && rows() >= 60, 'trạng từ: bảng vị trí + danh sách');
await go('#/usage?c=struct', 300);
click($('#usSub [data-v="ielts"]')); await tick();
ok(rows() >= 10 && rows() < 48, 'cấu trúc: lọc hợp IELTS Writing');
await go('#/usage?c=pair', 300);
ok(rows() >= 60 && /↔/.test(txt('#usRows')), 'từ dễ nhầm: danh sách cặp');

// Liên kết từ công cụ khác
await go('#/verb/stop', 200);
ok($('a[href="#/usage/stop"]'), 'Chia động từ → “Cách dùng & mẫu câu”');
await go('#/fix', 200);
{ const ta = $('#fxT'); ta.value = 'I am interested about politics and it depends of the weather.'; ta.dispatchEvent(new w.Event('input')); await tick(450);
  const it = $$('#fxList [data-i]').find(b => /about/.test(b.textContent)); click(it); await tick(80);
  ok($('#fxCard a[href="#/usage/interested"]'), 'Sửa ngữ pháp: lỗi giới từ → link “Cách dùng interested”'); }
await go('#/hubs', 50); await go('#/vocab', 200);
ok($('a.hub-card[href="#/usage"]'), 'Từ vựng › Tra cứu: thẻ “Cách dùng từ”');

ok(!errors.length, 'không lỗi JS: ' + errors.slice(0, 5).join(' | '));
ok(!net.slice(net0).some(u => /translate\.googleapis[^ ]*sl=vi|generativelanguage/.test(u)), 'giao diện tiếng Việt: không dịch máy nội dung, không gọi AI');

// ================= 3. Khóa giao diện có bản tiếng Anh =================
const src = fs.readFileSync('web/js/usage.js', 'utf8');
const keys = [...new Set([...src.matchAll(/\bt\('((?:[^'\\]|\\.)*)'/g)].map(m => m[1]))];
const D = {}; new Function('self', fs.readFileSync('web/js/i18n/en.js', 'utf8') + '\n' + fs.readFileSync('web/js/i18n/en/usage.js', 'utf8'))(D);
const missing = keys.filter(k => D.I18N_DICT.en[k] === undefined);
ok(!missing.length, 'mọi chuỗi giao diện có bản tiếng Anh: ' + missing.slice(0, 5).join(' | '));
ok(['Cách dùng', 'Cách dùng & mẫu câu', 'Cách dùng “{w}”', 'Giới từ đi kèm, to-V/V-ing, trạng từ, từ dễ nhầm'].every(k => D.I18N_DICT.en[k]), 'chuỗi ở từ điển/chia động từ/sửa ngữ pháp/hub có bản tiếng Anh');
const F = JSON.parse(fs.readFileSync('scripts/i18n-fixed.json', 'utf8')), LANGS = ['es', 'pt', 'fr', 'de', 'id', 'th', 'zh', 'ja', 'ko', 'hi', 'ar', 'ru', 'tr'];
const noFix = keys.filter(k => D.I18N_DICT.en[k] && !(F[k] && LANGS.every(l => F[k][l])) && !LANGS.every(l => { const c = {}; try { new Function('self', fs.readFileSync(`web/js/i18n/${l}.js`, 'utf8'))(c); const uf = `web/js/i18n/${l}/usage.js`; if (fs.existsSync(uf)) new Function('self', fs.readFileSync(uf, 'utf8'))(c); } catch (e) { return false; } return c.I18N_DICT[l][k]; }));
ok(!noFix.length, 'mọi chuỗi có bản dịch 13 ngôn ngữ: ' + noFix.slice(0, 5).join(' | '));

console.log(fails ? `✗ usage: ${fails}/${n} kiểm tra lỗi` : `✓ usage: ${n} kiểm tra – dữ liệu ${total.p.items} cụm giới từ (${total.p.entries} từ), ${total.v.entries} động từ, ${total.a.entries} trạng từ, ${total.s.entries} cấu trúc, ${total.c.entries} cặp dễ nhầm`);
process.exit(fails ? 1 : 0);
