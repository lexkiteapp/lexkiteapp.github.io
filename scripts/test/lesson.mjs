// Test bài học trộn #/lesson (docs/LESSON-ENGINE.md): lõi thuần (chọn từ, dạng theo dữ liệu, lỗi cũ, COMBO, tắt nghe/nói, FSRS) + jsdom chạy trọn 1 bài.
// Chạy: node scripts/test/lesson.mjs  (fixture, không tài khoản thật, không mạng)
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import jsdom from 'jsdom';

const require = createRequire(import.meta.url);
const WEB = 'web';
let total = 0, fails = 0;
const ok = (c, m) => { total++; if (!c) { fails++; console.error('✗', m); } else console.log('✓', m); };

// ---------- A. Lõi thuần ----------
const ctx = { self: {} }; ctx.globalThis = ctx.self; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(WEB, 'js/lesson/engine.js'), 'utf8'), ctx);
const E = ctx.self.LessonEngine;
const NOW = new Date(2026, 9, 27, 12).getTime(), DAY = 864e5;
const srs = (due, reps) => ({ reps, lapses: 0, due, last: reps ? due - 3 * DAY : null, step: 0 });
const C = {
  oldDue: { word: 'consider', pos: 'verb', vi: 'cân nhắc', ex: "We're considering moving to a new city.", sentences: [{ en: "We're considering moving to a new city.", vi: 'Chúng tôi đang cân nhắc chuyển nhà.' }], srs: srs(NOW - 5 * DAY, 3) },
  due: { word: 'afraid', pos: 'adjective', vi: 'sợ', ex: "She's afraid of the dark.", srs: srs(NOW - DAY, 2) },
  ext: { word: 'decide', pos: 'verb', vi: 'quyết định', ctx: 'We decided to stay at home tonight.', src: 'news.example.com', srs: srs(NOW + 5 * DAY, 2), mod: NOW },
  fresh: { word: 'salary', pos: 'noun', vi: 'tiền lương', ex: 'Her salary is paid every month.', srs: srs(NOW, 0) },
  bare: { word: 'key card', pos: 'noun', vi: 'thẻ từ', srs: srs(NOW, 0) },
  later: { word: 'listen', pos: 'verb', vi: 'nghe', ex: 'I like listening to music.', srs: srs(NOW + 9 * DAY, 4) },
  nomean: { word: 'zzz', pos: 'noun', srs: srs(NOW - DAY, 2) },
};
{
  const p = E.pickWords(C, { now: NOW, n: 6 });
  const words = p.map(x => x.card.word);
  ok(words[0] === 'consider' && words[1] === 'afraid', 'pickWords: đến hạn trước, quá hạn lâu nhất đứng đầu');
  ok(p[2].card.word === 'decide' && p[2].why === 'ext', 'pickWords: sau đến hạn là từ tra bằng add-on');
  ok(words.includes('salary') && p.find(x => x.card.word === 'salary').why === 'new', 'pickWords: rồi tới thẻ mới');
  ok(!words.includes('listen'), 'pickWords: thẻ chưa đến hạn, không từ add-on → không chọn');
  ok(!words.includes('zzz'), 'pickWords: thẻ không có nghĩa → bỏ');
  const st = E.pickWords({}, { now: NOW, starter: [C.fresh, C.bare] });
  ok(st.length === 2 && st.every(x => x.why === 'start'), 'pickWords: người mới 0 thẻ → bộ khởi đầu');
}
{
  const has = w => w === 'key card';
  const items = E.build(E.pickWords(C, { now: NOW, n: 6 }), { seed: 3, hasImg: has, perWord: 2 });
  const of = w => items.filter(i => i.word === w).map(i => i.type);
  ok(items.length >= 8, `build: đủ bài (${items.length})`);
  ok(of('key card').includes('pic') && !of('key card').some(x => ['gap', 'build', 'tr'].includes(x)), 'build: thẻ không có câu → chỉ ảnh/nói, không dạng câu');
  ok(of('consider').includes('tr') || of('consider').length === 2, 'build: thẻ có câu song ngữ được dạng dịch');
  ok(!items.some(i => i.type === 'tr' && !i.prompt), 'build: dạng dịch luôn có câu gốc ngôn ngữ người học');
  ok(!items.some(i => i.type === 'pic' && i.word !== 'key card'), 'build: ảnh chỉ khi có đúng từ#loại');
  let adj = 0; for (let i = 1; i < items.length; i++) if (items[i].word === items[i - 1].word) adj++;
  ok(adj === 0, 'build: không 2 bài liền cùng một từ');
  const gap = items.find(i => i.type === 'gap');
  ok(!gap || (gap.options.length === 4 && gap.options.includes(gap.answer)), 'build: điền từ có 4 lựa chọn, có đáp án');
  const m = items.find(i => i.type === 'match');
  ok(m && m.card === null && m.pairs.length === 4 && E.check(m, true) && !E.check(m, false), 'build: 1 bài ghép cặp (4 cặp) khi ≥ 4 từ, không gắn 1 từ');
  ok(items.filter(i => i.type === 'match').length === 1, 'build: chỉ 1 bài ghép cặp/bài');
  const ty = items.find(i => i.type === 'type');
  ok(!items.some(i => i.type === 'type' && /\s/.test(i.word)), 'build: nghe gõ lại chỉ cho từ đơn');
  ok(!ty || (E.check(ty, ' ' + ty.answer.toUpperCase() + ' ') && !E.check(ty, ty.answer + 'x')), 'check: gõ lại không phân biệt hoa/thường, khoảng trắng');
  const ext = items.find(i => i.word === 'decide' && (i.type === 'gap' || i.type === 'build'));
  ok(!ext || ext.own === true, 'build: từ tra bằng add-on dùng chính câu người học gặp');
  const b = items.find(i => i.type === 'build');
  ok(!b || (E.check(b, b.answer.split(' ')) && !E.check(b, b.answer.split(' ').reverse())), 'check: xếp câu đúng thứ tự mới đúng');
}
{
  const it = { type: 'say', word: 'salary', answer: 'Her salary is paid every month.', alt: { type: 'gap', answer: 'salary', options: ['salary', 'a', 'b', 'c'], blank: { i: 1, n: 1, toks: [] } } };
  ok(E.check(it, 0.82) && !E.check(it, 0.5), 'check: nói theo ≥ 0,7 là đúng');
  const s = E.adapt(it, { speak: true });
  ok(s.type === 'gap' && s.answer === 'salary', 'adapt: tắt nói → nói theo đổi thành điền từ');
  const p = E.adapt({ type: 'pic', word: 'x', answer: 'x' }, { speak: true });
  ok(p.choice === true && E.check(p, 'x'), 'adapt: tắt nói → ảnh đổi sang chọn 1/4');
  ok(E.adapt({ type: 'gap' }, { listen: true }).noAudio === true, 'adapt: tắt nghe → bài nghe thành bài đọc');
  const m = E.build([{ card: C.bare, why: 'new' }, { card: C.fresh, why: 'new' }], { seed: 1, off: { speak: true } });
  ok(!m.some(i => i.type === 'say') && m.some(i => i.type === 'mean' || i.type === 'gap'), 'build + tắt nói: không còn bài nói');
}
{
  const items = [1, 2, 3, 4].map(i => ({ id: i, type: 'gap', word: 'w' + i, answer: 'w' + i, retry: 0, card: { word: 'w' + i } }));
  const s = new E.Session(items);
  s.answer(true); s.answer(true); s.answer(true);
  ok(s.combo === 3 && s.best === 3, 'Session: COMBO tăng khi đúng liên tiếp');
  ok(Math.abs(s.progress - 0.75) < 1e-9, 'Session: tiến độ chỉ tăng khi đúng');
  const r = s.answer(false);
  ok(r.requeued && s.combo === 0 && s.cur.retry === 1 && s.cur.word === 'w4', 'Session: sai → COMBO về 0, câu quay lại cuối bài ("Lỗi cũ")');
  ok(Math.abs(s.progress - 0.75) < 1e-9, 'Session: sai không tăng tiến độ');
  s.answer(false); s.answer(false);
  ok(s.done && s.progress === 1, 'Session: tối đa 2 lần gặp lại rồi kết thúc (không kẹt)');
  ok(s.best === 3 && s.wrong.get('w4') === 3, 'Session: lưu kỷ lục COMBO + số lần sai');
}
{
  const a = Object.assign({}, C.due), b2 = Object.assign({}, C.later), cardsMap = { afraid: a, listen: b2 };
  const items = [{ word: 'afraid', card: a }, { word: 'listen', card: b2 }, { word: 'brand-new', card: { word: 'brand-new', vi: 'mới' } }, { word: 'afraid2', card: { word: 'afraid2' } }];
  const s = new E.Session(items.map((x, i) => Object.assign({ id: i, type: 'gap', answer: x.word, retry: 0 }, x)));
  s.answer(true); s.answer(true); s.answer(false); s.answer(true); s.answer(true);
  const res = E.results(s, items, cardsMap, NOW);
  const g = w => res.find(r => r.word === w);
  ok(g('afraid') && g('afraid').grade === 2, 'results: từ đến hạn đúng ngay → Nhớ (grade 2)');
  ok(!g('listen'), 'results: từ chưa đến hạn đúng → không đổi lịch FSRS');
  ok(g('brand-new') && g('brand-new').grade === 0 && g('brand-new').add, 'results: từ sai chưa có thẻ → thêm thẻ + Quên (vào hàng ôn)');
}
{
  ok(E.stress('/ɪˈfem.ər.əl/').syl === 2, 'stress: đọc âm tiết nhấn từ IPA');
  ok(E.stress('/kæt/') === null, 'stress: không dấu nhấn → null');
  ok(E.usuk({ ipa: '/ˈsæl.ər.i/', ipaUS: '/ˈsæl.ɚ.i/' }) && !E.usuk({ ipa: '/x/', ipaUS: '/x/' }), 'usuk: chỉ báo khi UK ≠ US');
  const v = E.visemes('Hello, Ama!', 1);
  ok(v.length > 3 && v[v.length - 1][1] === 'X' && v.every((c, i) => !i || c[0] >= v[i - 1][0]), 'visemes: dòng thời gian tăng dần, kết thúc miệng nghỉ');
}
{
  const P = E.pathPlan({}, NOW).map(x => x.kind);
  ok(P.length === 6 && P[0] === 'lesson' && P.includes('listen') && P.includes('speak') && P[5] === 'review', 'pathPlan: chặng 6 nút tự trộn bài học/nghe/nói/ôn');
  const weak = Object.assign({}, C, { w1: { word: 'w1', vi: 'x', srs: Object.assign(srs(NOW - DAY, 2), { lapses: 2 }) } });
  ok(E.pathPlan(weak, NOW)[0].kind === 'review', 'pathPlan: nhiều từ đến hạn/hay quên → mở chặng bằng Ôn lỗi');
  const li = E.build(E.pickWords(C, { now: NOW, n: 4 }), { seed: 5, only: E.KIND.listen });
  ok(li.every(i => E.KIND.listen.includes(i.type)), 'nút Nghe: chỉ dạng nghe');
  const rv = E.pickWords(weak, { now: NOW, n: 4, mode: 'review' });
  ok(rv[0].card.word === 'w1', 'nút Ôn lỗi: từ hay quên lên đầu');
}
{
  vm.runInContext(fs.readFileSync(path.join(WEB, 'js/lesson/stories.js'), 'utf8'), ctx);
  const SS = ctx.self.LESSON_STORIES, st = SS.find(x => x.kind === 'story'), ra = SS.find(x => x.kind === 'radio');
  ok(SS.filter(x => x.kind === 'story').length >= 3 && SS.filter(x => x.kind === 'radio').length >= 2, 'stories: ≥ 3 truyện + ≥ 2 radio');
  const P = E.pathPlan({}, NOW, { story: 1, radio: 1 }).map(x => x.kind);
  ok(P.includes('story') && P.includes('radio') && P.includes('review') && P.length === 6, 'pathPlan: có nội dung → chặng có nút Truyện + Radio');
  const it = E.storyItems(st, 'es', 3), lines = it.filter(i => i.type === 'line');
  ok(lines.length === st.lines.length && it.some(i => i.type === 'build') && it.some(i => i.type === 'q') && it.some(i => i.type === 'match'), 'storyItems: câu thoại + xếp câu + câu hỏi + ghép cặp xen giữa');
  const m = it.find(i => i.type === 'match');
  ok(m.pairs.every(p => p.mean && !/[ăâđêôơư]/i.test(p.mean)), 'storyItems: nghĩa cặp ghép theo ngôn ngữ người học (es), không lẫn tiếng Việt');
  const q = it.find(i => i.type === 'q');
  ok(E.check(q, q.answer) && !E.check(q, q.options.find(o => o !== q.answer)), 'check: câu hỏi hiểu');
  const S = new E.Session(it); let k = 0;
  while (!S.done && k++ < 60) { const c = S.cur; S.answer(c.free ? true : E.check(c, c.type === 'build' ? c.answer.split(' ') : c.type === 'match' ? true : c.answer)); }
  ok(S.done && S.n === it.filter(i => !i.free).length && S.accuracy === 100, 'Session: câu thoại không tính điểm, chỉ tiến độ');
  ok(E.storyItems(ra, 'vi', 1).filter(i => i.type === 'q').length === 3 && E.storyItems(ra, 'vi', 1).every(i => i.type !== 'line' || i.radio), 'radio: nghe hết rồi 3 câu hỏi, không hiện chữ');
}
try { execFileSync('node', ['scripts/lesson/build-stories.mjs', '--check'], { stdio: 'pipe' }); ok(true, 'stories.js khớp nội dung + lược đồ (15 ngôn ngữ cặp ghép)'); } catch (e) { ok(false, 'stories: ' + String(e.stderr || e.message).slice(0, 300)); }
try { execFileSync('node', ['scripts/lesson/build-gold.mjs', '--check'], { stdio: 'pipe' }); ok(true, 'gold.js khớp gold bank'); } catch (e) { ok(false, 'gold.js cũ – chạy node scripts/lesson/build-gold.mjs'); }

// ---------- B. jsdom: chạy trọn 1 bài ----------
const html = fs.readFileSync(path.join(WEB, 'app', 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script(?: defer)? src="([^"]+)"><\/script>/g)].map(m => m[1]);
const vc = new jsdom.VirtualConsole(); const consoleErr = [];
vc.on('jsdomError', e => { if (!/Not implemented|Could not parse CSS/.test(e.message)) consoleErr.push(e.message); });
vc.on('error', e => consoleErr.push(String(e)));
const dom = new jsdom.JSDOM(html.replace(/<!--hero-->[\s\S]*?<!--\/hero-->/, '').replace(/<script(?: defer)? src="[^"]+"><\/script>/g, '').replace(/<link[^>]+>/g, ''),
  { url: 'http://localhost/app/#/home', runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole: vc });
const w = dom.window;
w.scrollTo = () => {}; w.HTMLElement.prototype.scrollIntoView = () => {};
w.matchMedia = () => ({ matches: false, addEventListener() {}, addListener() {} }); w.CSS = { escape: s => s };
const IMG = JSON.parse(fs.readFileSync(path.join(WEB, 'js/lexicon-img.json'), 'utf8'));
const VSH = u => { const m = /js\/vimg\/(\d\d)\.json/.exec(String(u)); return m && JSON.parse(fs.readFileSync(path.join(WEB, 'js/vimg/' + m[1] + '.json'), 'utf8')); };   // mảnh chỉ mục ảnh v3
w.fetch = async u => (/lexicon-img\.json/.test(String(u)) ? { ok: true, json: async () => IMG } : VSH(u) ? { ok: true, json: async () => VSH(u) } : { ok: false, status: 404, json: async () => ({}), text: async () => '' });
const errors = [];
for (const f of scripts) { try { w.eval(fs.readFileSync(path.join(WEB, f), 'utf8')); } catch (e) { errors.push(f + ': ' + e.message); } }
require('./lazyfix.js')(w, fs, path, WEB, errors);
const tick = (ms = 30) => new Promise(r => setTimeout(r, ms));
await tick(200);
ok(!errors.length, 'nạp mã + bundle lesson không lỗi' + (errors.length ? ': ' + errors.join(' | ') : ''));
const { App, UI, Core } = w;
let spoken = [], updates = [], added = [], rewards = [];
UI.tts = (text, a, r, o) => { spoken.push(text); if (o && o.onEnd) setTimeout(o.onEnd, 5); };
UI.recognize = (target, acc, cb) => { setTimeout(() => cb.result({ heard: target, score: 92 }), 5); return { stop() {} }; };
Core.Cards.update = async c => { updates.push(JSON.parse(JSON.stringify(c))); };
App.addWord = async e => { added.push(e.word); App.state.cards[Core.keyOf(e.word)] = { word: e.word, vi: e.vi, srs: Core.SRS.newState() }; };
App.reward = async d => { rewards.push(d); };
const $ = s => w.document.querySelector(s);
const st = () => App.lessonState();

// cờ tắt: trang chủ không có thẻ, route báo sắp ra mắt
w.localStorage.removeItem('lk.lesson');
ok(App.lessonOn() === false, 'cờ lesson_mix mặc định TẮT');
await App.routes.lesson(); await tick();
ok(!$('#lsn') && App.view.querySelector('a[href="#/home"]'), 'cờ tắt: #/lesson không chạy bài');

// Trả lời đúng mục hiện tại qua DOM (đáp án đọc từ trạng thái – chỉ test)
async function solve(right) {
  const it = st().sess.cur;
  if (it.type === 'line') { $('#lsnGo').click(); await tick(); return; }
  if (it.type === 'q') { const opts = [...w.document.querySelectorAll('.lsn-opts .lsn-opt')]; (right ? opts.find(o => o.dataset.o === it.answer) : opts.find(o => o.dataset.o !== it.answer)).click(); $('#lsnCheck').click(); await tick(); return; }
  if (it.type === 'match') {
    const B = s2 => [...w.document.querySelectorAll(`.lsn-match .lsn-opt[data-s="${s2}"]`)];
    if (!right) { const a = B('w')[0], b = B('m').find(x => x.dataset.m !== a.dataset.m); a.click(); b.click(); }
    for (const a of B('w')) { if (a.disabled) continue; a.click(); B('m').find(x => x.dataset.m === a.dataset.m).click(); }
    await tick(300); return;
  }
  if (it.type === 'type') { const inp = $('#lsnIn'); inp.value = right ? it.answer : 'nope'; inp.dispatchEvent(new w.Event('input')); $('#lsnCheck').click(); await tick(); return; }
  if (it.type === 'build' || it.type === 'tr') {
    const want = right ? it.answer.split(' ') : it.answer.split(' ').reverse();
    for (const word of want) { const b = [...w.document.querySelectorAll('#lsnBank .lsn-tile:not(.used)')].find(x => x.textContent === word); if (b) b.click(); }
    $('#lsnCheck').click();
  } else if ($('#lsnMic')) {
    if (!right) { const old = UI.recognize; UI.recognize = (t, a, cb) => { setTimeout(() => cb.result({ heard: 'mmm', score: 10 }), 3); return { stop() {} }; }; $('#lsnMic').click(); await tick(); $('#lsnMic').click(); await tick(); UI.recognize = old; }
    else { $('#lsnMic').click(); await tick(); }
  } else {
    const opts = [...w.document.querySelectorAll('.lsn-opt')];
    (right ? opts.find(o => o.dataset.o === it.answer) : opts.find(o => o.dataset.o !== it.answer)).click();
    $('#lsnCheck').click();
  }
  await tick();
}

// Demo: chạy trọn bài, sai câu đầu, mở Giải thích, kiểm Lỗi cũ + COMBO, không ghi FSRS
w.localStorage.removeItem('lk.lsn.path.demo');
w.location.hash = '#/lesson?demo=1';
await App.routes.lesson(); await tick(60);
ok(w.document.querySelectorAll('.lsn-node').length === 6 && w.document.querySelectorAll('.lsn-node.next').length === 1 && $('.lsn-node.next .lsn-start'), 'bản đồ: 6 nút, đúng MỘT nút "tiếp theo" có nút Bắt đầu');
ok($('.lsn-start').getAttribute('href') === '#/lesson/go?demo=1' && !w.document.querySelector('.lsn-node.done'), 'bản đồ: Bắt đầu → #/lesson/go, chưa nút nào xong');
w.location.hash = '#/lesson/go?demo=1';
await App.routes.lesson('go'); await tick(320);
ok($('#lsn') && $('.lsn-bar') && $('#lsnBub').textContent.length > 3, 'demo: dựng màn bài học (thanh tiến độ + lời nhắc)');
const L0 = st();
ok(L0.demo && L0.items.length >= 7 && L0.items.length <= 11, `demo: ${L0.items.length} bài (2–3 phút)`);
const types = new Set(L0.items.map(i => i.type));
ok(types.size >= 5 && types.has('match') && (types.has('tr') || w.I18N.learnLang() !== 'vi'), 'demo: đủ dạng (' + [...types].join(',') + ', ngôn ngữ học ' + w.I18N.learnLang() + ')');
ok(spoken.length > 0 || !['gap', 'build', 'say'].includes(L0.sess.cur.type), 'giáo viên đọc lời nhắc');
const firstWord = L0.sess.cur.word;
await solve(false);
ok($('#lsnFoot.bad') && (!L0.items[0].card || $('#lsnFoot').textContent.includes(L0.items[0].answer.split(' ')[0])), 'sai → sheet đỏ có đáp án đúng');
ok($('#lsnTch').classList.contains('shake') || !$('#lsnTch .tch-rig') , 'giáo viên phản ứng khi sai');
$('#lsnWhy').click(); await tick(40);
ok($('#lsnXp') && !$('#lsnXp').hidden && $('#lsnXp').textContent.length > 10, 'Giải thích hiện ngay (0 AI)');
$('#lsnNext').click(); await tick();
let sawRetry = false, sawCombo = false, guard = 0;
while (st() && st().sess && !st().sess.done && guard++ < 60) {
  if (st().sess.cur.retry) { sawRetry = sawRetry || /Lỗi cũ|Past mistake/.test($('#lsnBub').textContent); }
  await solve(true);
  if ($('#lsnCombo.on')) sawCombo = true;
  ok($("#lsnFoot.ok"), `đúng → sheet xanh (${guard} · ${(st().sess.log.slice(-1)[0] || {}).type})`);
  $('#lsnNext').click(); await tick();
}
ok(sawRetry, `câu sai (${firstWord}) quay lại với nhãn "Lỗi cũ"`);
ok(sawCombo, 'COMBO hiện khi đúng ≥ 3 liên tiếp');
ok(/Hoàn thành bài học|Lesson complete/.test(App.view.textContent) && /\+\d+\s*XP/.test(App.view.querySelector('.lsn-stats').textContent), 'màn kết thúc có XP, tỉ lệ đúng, COMBO, thời gian');
ok(updates.length === 0 && added.length === 0 && rewards.length === 0, 'demo: không ghi FSRS / thẻ / XP');
ok(w.localStorage.getItem('lk.lsn.path.demo') === '1' && !w.localStorage.getItem('lk.lsn.path'), 'xong bài → bản đồ demo tiến 1 nút (khóa riêng)');
ok($('#lsnAgain') && /Bài khác|Next lesson/.test($('#lsnAgain').textContent), 'màn kết: 1 chạm sang bài tiếp');
w.location.hash = '#/lesson?demo=1'; await App.routes.lesson(); await tick(40);
ok(w.document.querySelectorAll('.lsn-node.done').length === 1 && w.document.querySelectorAll('.lsn-node')[1].classList.contains('next'), 'bản đồ: nút 1 ✓, nút 2 phát sáng');
// Nút Truyện (nút 2) và Radio (nút 5) của demo
for (const [pos, kind] of [[1, 'story'], [4, 'radio']]) {
  w.localStorage.setItem('lk.lsn.path.demo', String(pos)); w.localStorage.removeItem(`lk.lsn.s.${kind}.demo`);
  w.location.hash = '#/lesson/go?demo=1'; await App.routes.lesson('go'); await tick(60);
  ok(st().story && st().story.kind === kind && $('.lsn-duo') && $('#lsnTch2'), `${kind}: Ama + Carlos cùng lên màn`);
  let g2 = 0, sawLine = false;
  while (st() && st().sess && !st().sess.done && g2++ < 60) {
    if (st().sess.cur.type === 'line') { sawLine = sawLine || (kind === 'story' ? !!$('#lsnChat .lsn-ln') : /🔊/.test($('#lsnBub').textContent)); await solve(true); continue; }
    await solve(true); ok($('#lsnFoot.ok'), `${kind}: trả lời đúng (${st().sess.log.slice(-1)[0].type})`); $('#lsnNext').click(); await tick();
  }
  ok(sawLine, kind === 'story' ? 'truyện: hiện lời thoại theo từng câu' : 'radio: chỉ nghe, không hiện chữ');
  ok(/Hoàn thành bài học|Lesson complete/.test(App.view.textContent) && w.localStorage.getItem(`lk.lsn.s.${kind}.demo`) === '1', `${kind}: xong → lần sau bài kế tiếp`);
}

// Thật (cờ bật): từ sai → FSRS Quên, XP ghi
w.localStorage.setItem('lk.lesson', '1');
ok(App.lessonOn(), 'cờ bật bằng lk.lesson=1');
w.location.hash = '#/home'; await App.routes.home(); await tick(60);
ok(App.view.querySelector('.lsn-map .lsn-node.next .lsn-start'), 'cờ bật: trang chủ = bản đồ chặng, 1 nút Bắt đầu');
w.location.hash = '#/home?all=1'; App.routes.home(); await tick(60);
ok(App.view.querySelector('a[href="#/lesson"]') && !App.view.querySelector('.lsn-map'), 'cờ bật: #/home?all=1 = trang chủ đầy đủ, có thẻ Bài học trộn');
const now = Date.now();
App.state.cards = {
  consider: { word: 'consider', pos: 'verb', vi: 'cân nhắc', ex: "We're considering moving to a new city.", contexts: [], srs: { ef: 2.5, interval: 3, reps: 3, lapses: 0, due: now - 864e5, last: now - 4 * 864e5, step: 0, S: 3, D: 5 } },
  afraid: { word: 'afraid', pos: 'adjective', vi: 'sợ', ex: "She's afraid of the dark.", contexts: [], srs: { ef: 2.5, interval: 3, reps: 2, lapses: 0, due: now - 864e5, last: now - 4 * 864e5, step: 0, S: 3, D: 5 } },
};
w.location.hash = '#/lesson/go';
await App.routes.lesson('go'); await tick(60);
const target = st().sess.cur.word;
await solve(false); $('#lsnNext').click(); await tick();
// tắt nói giữa bài → bài nói còn lại đổi dạng
const before = st().sess.q.filter(i => i.type === 'say').length;
if ($('#lsnNoS')) { $('#lsnNoS').click(); await tick(); ok(!st().sess.q.some(i => i.type === 'say') && JSON.parse(w.localStorage.getItem('lk.lsn.off')).speak > now, '"Không nói được lúc này" → đổi các bài nói còn lại, nhớ 1 giờ'); }
else ok(before >= 0, '(không gặp bài nói ở lượt này)');
guard = 0;
while (st() && !st().sess.done && guard++ < 60) { await solve(true); $('#lsnNext').click(); await tick(); }
await tick(60);
const up = updates.find(c => c.word === target);
ok(up && up.srs.lapses === 1 && up.srs.reps === 0, `thật: từ sai (${target}) → FSRS Quên, vào hàng ôn`);
ok(rewards.length === 1 && rewards[0].quizzes === 1, 'thật: ghi XP 1 lần');
ok(!consoleErr.length, '0 lỗi console' + (consoleErr.length ? ': ' + consoleErr.slice(0, 3).join(' | ') : ''));
w.localStorage.removeItem('lk.lsn.off');

console.log(`\n${total - fails}/${total} lesson`);
w.close(); process.exit(fails ? 1 : 0); // jsdom còn vòng rAF của giáo viên → thoát dứt khoát
