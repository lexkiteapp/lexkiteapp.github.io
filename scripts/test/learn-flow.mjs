// Test (jsdom) 3 luồng: 🧠 Học thông minh (thẻ từ mới) · 🧩 trắc nghiệm nghĩa · 🧭 Kiểm tra đầu vào.
// Kiểm: thanh "Tiếp tục" dính đáy không che nội dung (nằm sau thẻ, có vùng an toàn), hình minh họa đúng từ loại (live 🏠 → ẩn),
// gợi ý phím ↵ ẩn trên cảm ứng, nút nghe có nhãn & vùng chạm 44 px, phương án nhiễu (cùng từ loại/trình độ, không đồng nghĩa,
// không trùng, tất định theo seed), không đáp án nào trông như đã chọn trước khi chạm, chạm đúp không trả lời hộ câu kế,
// ước tính band (ánh xạ, khoảng, "Tôi không biết" không bị phạt), kế hoạch hôm nay + lộ trình đổi theo kết quả.
// Chạy: node scripts/test/learn-flow.mjs
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import jsdom from 'jsdom';
const require = createRequire(import.meta.url);
const { JSDOM } = jsdom;
const WEB = 'web';
let n = 0, fails = 0; const ok = (c, m) => { n++; if (!c) { fails++; console.log('✗', m); } };
const html = fs.readFileSync(path.join(WEB, 'app', 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script(?: defer)? src="([^"]+)"><\/script>/g)].map(m => m[1]);
const css = fs.readFileSync(path.join(WEB, 'css/style.css'), 'utf8');
const vc = new jsdom.VirtualConsole(); vc.on('jsdomError', e => { if (!/Not implemented|Could not parse CSS/.test(e.message)) console.error(e.message); });
const dom = new JSDOM(html.replace(/<!--hero-->[\s\S]*?<!--\/hero-->/, '').replace(/<script(?: defer)? src="[^"]+"><\/script>/g, '').replace(/<link[^>]+>/g, '').replace('</head>', `<style>${css}</style></head>`), { url: 'http://localhost/app/#/home', runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole: vc });
const w = dom.window, errors = [];
w.addEventListener('error', e => errors.push(e.message));
w.console.error = (...a) => errors.push(a.join(' '));
w.scrollTo = () => {}; w.HTMLElement.prototype.scrollIntoView = () => {}; w.matchMedia = () => ({ matches: false, addEventListener() {}, addListener() {} });
w.CSS = { escape: s => s };
w.fetch = async () => ({ ok: false, status: 404, json: async () => ({}), text: async () => '' });
for (const f of scripts) { try { w.eval(fs.readFileSync(path.join(WEB, f), 'utf8')); } catch (e) { errors.push(f + ': ' + e.message); } }
require('./lazyfix.js')(w, fs, path, WEB, errors);
const tick = (ms = 40) => new Promise(r => setTimeout(r, ms));
const $ = (s, r = w.document) => r.querySelector(s), $$ = (s, r = w.document) => [...r.querySelectorAll(s)];
const go = async (h, ms = 150) => { w.location.hash = h; await tick(ms); };
const click = el => el && el.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true }));
const cs = el => w.getComputedStyle(el);
w.UI.speak = () => {}; w.speechSynthesis = { speak() {}, cancel() {}, getVoices: () => [], pause() {}, resume() {} };
w.SpeechSynthesisUtterance = function (t) { this.text = t; };
w.Audio = function () { return { play: async () => {}, pause() {}, addEventListener() {} }; };

await tick(300); await go('#/welcome/setup'); if ($('#go')) $('#go').click(); await tick(1500);
const { Distract: D, Placement: P, IELTS_DATA } = w;
ok(D && P, 'nạp js/distract.js (gói words) + js/placement.js (gói placement)');
const ALL = IELTS_DATA.TOPICS.flatMap(t => t.words).filter(x => x.vi && x.level && !/\s/.test(x.word));
const W = s => ALL.find(x => x.word === s);
const LV = { A1: 0, A2: 1, B1: 2, B2: 3, C1: 4, C2: 5 };

// ===== 1) Phương án nhiễu =====
for (const word of ['mutual', 'live', 'curator', 'extravagant', 'significant', 'reduce', 'however']) {
  const t = W(word); if (!t) { ok(false, 'thiếu từ mẫu ' + word); continue; }
  const ds = D.pick(t, ALL, { n: 3, seed: 7 });
  ok(ds.length === 3, `${word}: đủ 3 phương án nhiễu`);
  ok(ds.every(x => D.posOf(x.pos) === D.posOf(t.pos)), `${word}: cùng từ loại (${t.pos}) – ${ds.map(x => x.word + '/' + x.pos).join(', ')}`);
  ok(ds.every(x => Math.abs(LV[x.level] - LV[t.level]) <= 1), `${word}: trình độ lệch ≤ 1 bậc (${t.level}) – ${ds.map(x => x.level).join(', ')}`);
  const shown = [t, ...ds].map(x => x.vi.toLowerCase());
  ok(new Set(shown).size === 4, `${word}: 4 phương án không trùng chữ`);
  ok(!ds.some(x => D.nearSynonym(t, x, y => y.vi)), `${word}: không phương án nào gần nghĩa/cùng họ với đáp án`);
  ok(!ds.some(x => [].concat(t.syn || []).includes(x.word)), `${word}: không lấy từ đồng nghĩa trong dữ liệu`);
  ok(JSON.stringify(D.pick(t, ALL, { n: 3, seed: 7 }).map(x => x.word)) === JSON.stringify(ds.map(x => x.word)), `${word}: tất định theo seed`);
}
{ const m = W('mutual'), seeds = new Set([1, 2, 3, 4, 5, 6].map(s => D.pick(m, ALL, { seed: s }).map(x => x.word).join())); ok(seeds.size > 1, 'seed khác → phương án đổi (không học vẹt vị trí)'); }
ok(D.nearSynonym({ word: 'mutual', vi: 'lẫn nhau', syn: ['shared'] }, { word: 'shared', vi: 'chung' }, x => x.vi), 'đồng nghĩa trong syn bị loại');
ok(D.nearSynonym({ word: 'mutual', vi: 'lẫn nhau' }, { word: 'reciprocal', vi: 'qua lại, lẫn nhau' }, x => x.vi), 'nghĩa chồng lấn (“lẫn nhau”) bị loại');
ok(D.sameFamily('mutual', 'mutually') && D.sameFamily('economy', 'economic') && !D.sameFamily('present', 'prevent'), 'nhận diện cùng họ từ');
{ const t = W('reduce'), ds = D.pick(t, ALL, { n: 3, key: 'word', seed: 3 }); ok(ds.length === 3 && ds.every(x => x.word !== t.word && D.posOf(x.pos) === 'v'), 'chế độ chọn từ tiếng Anh: cùng từ loại'); }
ok(!D.pick(W('live'), ALL, { seed: 1 }).some(x => ['must', 'can', 'will', 'be', 'have', 'do'].includes(x.word)), 'không dùng trợ động từ/khuyết thiếu làm nhiễu cho động từ thường');

// ===== 2) Ước tính band =====
const R = (kind, lv, r) => ({ kind, lv, r, c: 0.25 });
const mk = (fn) => Array.from({ length: 20 }, (_, i) => fn(i % 2 ? 'grammar' : 'vocab', i));
const allRight = P.estimate(mk(k => R(k, 'C1', 'right'))), allIdk = P.estimate(mk(k => R(k, 'A2', 'idk'))), allWrong = P.estimate(mk(k => R(k, 'A2', 'wrong')));
ok(+allRight.band >= 7.5, 'đúng hết câu C1 → band cao (' + allRight.band + ')');
ok(+allIdk.band <= 4, 'không biết hết câu A2 → band thấp (' + allIdk.band + ')');
ok(allIdk.theta === allWrong.theta, '“Tôi không biết” không bị phạt hơn trả lời sai (cùng θ)');
const lucky = P.estimate(mk(k => R(k, 'B2', 'right'))), sure = P.estimate(mk(k => ({ ...R(k, 'B2', 'right'), c: 0 })));
ok(lucky.theta < sure.theta, 'đúng nhờ đoán mò (4 phương án) được tính thấp hơn câu không thể đoán');
for (const E of [allRight, allIdk, lucky]) ok(+E.lo <= +E.band && +E.band <= +E.hi && E.range.includes(E.lo) && E.range.includes(E.hi), 'khoảng band chứa điểm ước tính: ' + E.range);
const mid = P.estimate(mk((k, i) => R(k, i < 10 ? 'B1' : 'B2', i % 3 ? 'right' : 'wrong')));
ok(mid.lo !== mid.hi && /–/.test(mid.range), '20 câu → hiện khoảng, không giả vờ chính xác: ' + mid.range);
const few = P.posterior([R('vocab', 'B1', 'right'), R('vocab', 'B2', 'wrong')]), many = P.posterior(mk((k, i) => R(k, i % 2 ? 'B1' : 'B2', i % 2 ? 'right' : 'wrong')));
ok(many.se < few.se, 'càng nhiều câu, độ bất định càng nhỏ');
let mono = true; for (let th = -1; th < 4.5; th += 0.1) if (P.bandOf(th + 0.1) < P.bandOf(th)) mono = false;
ok(mono && P.bandOf(1) === 4 && P.bandOf(2) === 5.5 && P.bandOf(3) === 7, 'ánh xạ θ → band đơn điệu, mốc B1/B2/C1 = 4.0/5.5/7.0');
ok(P.cefrOf(4.5) === 'B1' && P.cefrOf(6) === 'B2' && P.cefrOf(7.5) === 'C1' && P.cefrOf(3.5) === 'A2', 'band ↔ CEFR nhất quán (B1 4.0–5.0, B2 5.5–6.5, C1 7.0–8.0)');
ok(P.stageOf(4.5) === 's0' && P.stageOf(5.5) === 's1' && P.stageOf(6.5) === 's2' && P.stageOf(7.5) === 's3', 'band → chặng lộ trình khớp nhãn chặng');
ok(P.nextLevel([]) === 'B1' && P.nextLevel([R('vocab', 'B1', 'right'), R('vocab', 'B2', 'right'), R('vocab', 'B2', 'right')]) !== 'A2', 'thích ứng: bắt đầu B1, trả lời đúng → câu khó hơn');

// ===== 3) Học thông minh: thẻ từ mới “live” =====
for (const x of ['live', 'house', 'water', 'family']) if (W(x) && !w.App.inDeck(x)) await w.App.addWord(W(x), null, { silent: true });
const deckAll = w.App.state.cards; w.App.state.cards = Object.fromEntries(['live', 'house', 'water', 'family'].map(k => [k, deckAll[k]]));
let found = false;
for (let k = 0; k < 40 && !found; k++) { await go('#/home', 30); await go('#/practice/learn?src=deck', 120); found = /^live$/.test(($('.wi-word') || {}).textContent || ''); }
ok(found, 'thẻ giới thiệu từ mới “live” hiện ra');
if (found) {
  const bar = $('.learn-bar'), fi = $('#fi');
  ok(bar && cs(bar).position === 'sticky' && cs(bar).bottom === '0px', 'thanh Tiếp tục dính đáy (sticky, bottom 0 ở chế độ tập trung)');
  ok(fi.compareDocumentPosition(bar) & w.Node.DOCUMENT_POSITION_FOLLOWING, 'thanh nằm SAU thẻ trong luồng → cuộn hết không che khối Hiểu sâu');
  ok(cs(bar).backgroundImage !== 'none' || cs(bar).backgroundColor !== 'rgba(0, 0, 0, 0)', 'thanh có nền (chữ phía sau không lẫn vào nút)');
  ok(/\.learn-bar \{[^}]*safe-area-inset-bottom/.test(css) && !/#gotIt \{ position: sticky; bottom: calc\(72px/.test(css), 'đệm vùng an toàn iOS; bỏ khoảng hở 72px cũ khi đã ẩn thanh điều hướng');
  ok(/scroll-padding-bottom/.test(css) && /\.wi-sec \{ scroll-margin-bottom/.test(css), 'cuộn tới mục (Tab/mở mục) chừa chỗ cho thanh dính');
  ok(!$('.wi-pic') && $('.wi-top.nopic'), 'động từ “live” không dùng hình 🏠 (dễ hiểu nhầm là “ngôi nhà”)');
  ok(w.App.picOk(W('house')) && !w.App.picOk(W('live')) && w.App.picOk({ word: 'run', pos: 'v', emoji: '🏃' }) && !w.App.picOk({ word: 'keep', pos: 'v', emoji: '🔒' }), 'hình theo từ loại: danh từ/hành động người → hiện; đồ vật cho động từ trừu tượng → ẩn');
  const hint = $('#gotIt .kbd-hint');
  ok(hint && hint.getAttribute('aria-hidden') === 'true' && !/↵/.test($('#gotIt').textContent.replace(hint.textContent, '')), 'gợi ý ↵ tách riêng, ẩn với trình đọc màn hình');
  ok(/@media \(hover: none\), \(pointer: coarse\) \{ \.kbd-hint, \.options \.kbd \{ display: none; \} \}/.test(css), 'ẩn gợi ý phím ↵ / 1–4 trên màn cảm ứng');
  ok($('#sayI').getAttribute('aria-label') && $('#slowI').getAttribute('aria-label'), 'nút 🔊/🐢 có nhãn trợ năng');
  ok(cs($('#slowI')).width === '40px' && /\.fi-btn\.sm::after \{[^}]*width: 44px; height: 44px/.test(css), 'vùng chạm nút nghe ≥ 44px');
  ok($$('#fi .ctx-say').every(b => b.getAttribute('aria-label')), 'nút nghe câu ví dụ có nhãn');
  w.document.body.dispatchEvent(new w.KeyboardEvent('keydown', { key: ' ', bubbles: true })); await tick(30);
  ok(!errors.some(e => /flip is not defined/.test(e)), 'phím cách không gây lỗi (flip không tồn tại)');
  click($('#gotIt')); click($('#gotIt')); await tick(60);
  ok($$('.options .option').length === 4, 'Tiếp tục → câu trắc nghiệm nghĩa (chạm đúp không nhảy 2 bước)');
  ok(!$$('.options .option').some(b => /right|wrong|picked/.test(b.className)), 'chưa chạm: không đáp án nào được tô');
  ok(/@media \(hover: hover\) and \(pointer: fine\) \{ \.option:hover/.test(css) && !/\n\.option:hover \{/.test(css), ':hover của đáp án chỉ áp dụng cho chuột (iOS không “dính” màu cam)');
  const opts = $$('.options .option'), texts = opts.map(b => b.textContent.replace(/^\d/, '').trim());
  const meanOf = w.App.meanOf, byMean = new Map(ALL.map(x => [meanOf(x), x]));
  const others = texts.filter(x => x !== meanOf(W('live'))).map(x => byMean.get(x)).filter(Boolean);
  ok(others.length === 3 && others.every(x => D.posOf(x.pos) === 'v'), 'phương án nhiễu cho “live” đều là động từ: ' + others.map(x => x.word).join(', '));
  click(opts[0]); await tick(10);
  ok(!$('#fb .sheet'), 'chạm ngay khi vừa hiện câu (chạm đúp từ màn trước) bị bỏ qua');
  await tick(300); click(opts[0]); await tick(40);
  ok($('#fb .sheet'), 'chạm sau đó → hiện bảng phản hồi');
  ok($('.study-wrap').style.getPropertyValue('--sheet-h') && /\.study-wrap:has\(\.sheet\) \{ padding-bottom: calc\(var\(--sheet-h/.test(css), 'chừa đáy bằng đúng chiều cao bảng phản hồi');
  // ✕ giữa chừng → hỏi lại
  await tick(300); const x = $('.study-top a.icon-btn'), before = w.location.hash; click($('#nextQ')); await tick(400);
  click($('.study-top a.icon-btn')); await tick(40);
  ok(!$('#modal').hidden && /Thoát giữa chừng/.test($('#modalBox').textContent) && w.location.hash === before, '✕ giữa phiên học → hỏi xác nhận, không mất tiến độ ngay');
  click($('#modalBox [data-close].primary')); await tick(30);
  ok(x && $('#modal').hidden, 'Làm tiếp → đóng hộp thoại, ở lại phiên');
}

w.App.state.cards = deckAll;
// ===== 4) Kiểm tra đầu vào =====
await go('#/home', 500); await go('#/placement', 800);
ok($('.pl-result h2') && $('#go'), 'trang giới thiệu bài kiểm tra');
click($('#go')); await tick(320);
ok($$('.pl-wrap .option').length >= 4 && $('.opt-idk'), 'câu 1: có phương án + “Tôi không biết”');
ok(!$$('.pl-wrap .option').some(b => /picked|right|wrong/.test(b.className) || b.getAttribute('aria-pressed')), 'không phương án nào được chọn sẵn');
const prog = () => ($('.study-top .small') || {}).textContent;
ok(prog() === '1/20', 'bộ đếm 1/20');
const first = $('.pl-wrap .opt-idk'); click(first); click(first); await tick(320);
ok(prog() === '2/20', 'chạm đúp chỉ tính 1 câu (bộ đếm 2/20, không nhảy 3/20)');
click($('.pl-wrap .opt-idk')); await tick(320);
click($('#plX')); await tick(30);
ok(!$('#modal').hidden && /placement/.test(w.location.hash), '✕ khi đang làm → hỏi xác nhận');
click($('#modalBox [data-close].primary')); await tick(30);
const kinds = [];
for (let k = 0; k < 30 && $('.pl-wrap .option'); k++) {
  kinds.push(/NGỮ PHÁP|GRAMMAR/.test($('.pl-tag').textContent) ? 'g' : 'v');
  const bs = $$('.pl-wrap .option:not(.opt-idk)'); click(k % 3 ? bs[0] : $('.pl-wrap .opt-idk')); await tick(450);
}
await tick(200);
ok(kinds.includes('g') && kinds.includes('v'), 'xen kẽ câu từ vựng và ngữ pháp');
ok(!$$('.pl-q').some(e => /[ăđơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i.test(e.textContent)), 'đề ngữ pháp không chứa tiếng Việt (không lộ chữ Việt ở giao diện khác)');
const pl = w.App.state.settings.placement;
ok(pl && pl.v === 2 && pl.n === 20 && pl.lo && pl.hi && +pl.lo <= +pl.band && +pl.band <= +pl.hi && /^(vocab|grammar)$/.test(pl.weak) && /^s[0-3]$/.test(pl.stage), 'kết quả lưu settings.placement (band, khoảng, kỹ năng yếu, chặng)');
const stored = await w.Core.Store.get('settings', {});
ok(stored.placement && stored.placement.at === pl.at, 'đã ghi vào bộ nhớ (đồng bộ qua settingsAt)');
const h = $('.pl-h');
ok(h && /Band/.test(h.textContent) && (pl.lo === pl.hi || h.textContent.includes(pl.lo + '–' + pl.hi)), 'tiêu đề hiện khoảng band: ' + (h && h.textContent));
ok(h && cs(h).color !== cs($('.pl-how')).color, 'tiêu đề dùng màu chữ chính (không xám như chữ phụ)');
ok($$('.pl-skill').length === 2 && $$('.pl-skill .ring b').every(b => /^\d\.\d$/.test(b.textContent)), 'vòng kỹ năng hiện band từng kỹ năng (nhất quán với band tổng)');
const ctas = $$('.pl-cta .btn');
ok(ctas.length === 2 && ctas[0].classList.contains('primary') && /home/.test(ctas[0].getAttribute('href')) && !ctas[1].classList.contains('primary'), 'CTA: “Xem kế hoạch hôm nay” chính, “Lộ trình” phụ');

// ===== 5) Kế hoạch & lộ trình đổi theo kết quả =====
w.App.state.settings.placement = { ...pl, weak: 'grammar', gCefr: 'B2', stage: 's2' };
let plan = await w.App.todayPlan();
const gT = plan.find(x => x.focus === 'grammar');
ok(gT && /grammar/.test(gT.href) && /B2/.test(gT.sub), 'kỹ năng yếu ngữ pháp → kế hoạch hôm nay có bài ngữ pháp B2 (ưu tiên theo kết quả)');
ok(!plan.some(x => x.href === '#/placement'), 'đã làm kiểm tra → không còn nhắc làm bài đầu vào');
const curU = w.App.pathCurrent();
ok(curU && curU.stage.id === 's2', 'lộ trình mở từ chặng gợi ý (s2): ' + (curU && curU.topic.id));
w.App.state.settings.placement = { ...pl, weak: 'vocab', stage: 's0' };
plan = await w.App.todayPlan();
ok(plan.some(x => x.focus === 'vocab' && /^#\/practice\/(learn|test)\?src=topic/.test(x.href)) && !plan.some(x => x.focus === 'grammar'), 'kỹ năng yếu từ vựng → bài lộ trình được đánh dấu ưu tiên');
w.App.state.settings.placement = { band: '6.0', pct: 55, vocab: 40, grammar: 70, stage: 's1', at: 1 }; // bản ghi cũ (v1)
plan = await w.App.todayPlan();
ok(plan.some(x => x.focus === 'vocab') && w.App.pathCurrent().stage.id === 's1', 'bản ghi cũ (v1) vẫn điều chỉnh kế hoạch + lộ trình');
delete w.App.state.settings.placement;
ok((await w.App.todayPlan()).some(x => x.href === '#/placement') && w.App.pathCurrent().i === 0, 'chưa làm kiểm tra → nhắc làm, lộ trình từ bài đầu');

const real = errors.filter(e => !/Not implemented|navigation|Could not parse CSS/.test(e));
ok(!real.length, 'không lỗi JS: ' + real.slice(0, 3).join(' | '));
if (fails) { console.log(`✗ learn-flow: ${fails}/${n} lỗi`); process.exit(1); }
console.log(`✓ learn-flow: ${n} phép kiểm (Học thông minh · phương án nhiễu · kiểm tra đầu vào · kế hoạch)`);
process.exit(0);
