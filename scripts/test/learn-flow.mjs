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

await tick(300); await go('#/welcome/setup'); for (let i = 0; i < 60 && !$('#go'); i++) { if ($('#obNext')) $('#obNext').click(); await tick(100); } if ($('#go')) $('#go').click(); await tick(1500); // thiết lập từng bước (onboard.js): bấm Tiếp tục tới màn cuối rồi Bắt đầu
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
for (let k = 0; k < 40 && !found; k++) { await go('#/home', 30); await go('#/practice/learn?src=deck', 120); found = /^live$/.test(($('.wi-word') || {}).textContent || ''); } // (vẽ đè muộn do đua điều hướng đã được App.route chặn bằng token – xem route-race.mjs)
ok(found, 'thẻ giới thiệu từ mới “live” hiện ra');
if (found) {
  const bar = $('.learn-bar'), fi = $('#fi');
  ok(bar && cs(bar).position === 'sticky' && cs(bar).bottom === '0px', 'thanh Tiếp tục dính đáy (sticky, bottom 0 ở chế độ tập trung)');
  ok(fi.compareDocumentPosition(bar) & w.Node.DOCUMENT_POSITION_FOLLOWING, 'thanh nằm SAU thẻ trong luồng → cuộn hết không che khối Hiểu sâu');
  ok(cs(bar).backgroundImage !== 'none' || cs(bar).backgroundColor !== 'rgba(0, 0, 0, 0)' || /\.learn-bar \{[^}]*background:\s*linear-gradient/.test(fs.readFileSync(path.join(WEB, 'css', 'style.css'), 'utf8')), // jsdom bỏ qua gradient có var() → đọc thẳng luật CSS
     'thanh có nền (chữ phía sau không lẫn vào nút)');
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
ok(w.App.routeHeld(), 'đang làm bài → giữ phiên: lần vẽ lại lúc khởi động xong (boot) không xóa tiến độ');
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
ok(plan.some(x => x.focus === 'vocab' && /^#\/day\/\d+$/.test(x.href)) && !plan.some(x => x.focus === 'grammar'), 'kỹ năng yếu từ vựng → “Ngày N” của lộ trình được đánh dấu ưu tiên');
w.App.state.settings.placement = { band: '6.0', pct: 55, vocab: 40, grammar: 70, stage: 's1', at: 1 }; // bản ghi cũ (v1)
plan = await w.App.todayPlan();
ok(plan.some(x => x.focus === 'vocab') && w.App.pathCurrent().stage.id === 's1', 'bản ghi cũ (v1) vẫn điều chỉnh kế hoạch + lộ trình');
delete w.App.state.settings.placement;
ok((await w.App.todayPlan()).some(x => x.href === '#/placement') && w.App.pathCurrent().i === 0, 'chưa làm kiểm tra → nhắc làm, lộ trình từ bài đầu');

// ===== 6) Lộ trình theo NGÀY (path-day.js): dễ → khó, đứng đầu kế hoạch, giữ tiến độ cũ =====
{
  const DP = w.DayPath; ok(DP && w.App.PathAPI, 'nạp path-day.js (gói pathx)');
  let ds = await DP.days();
  ok(ds.length > 200 && ds[0].id === 'ngsl1.1~1' && ds[0].topic.words.length >= 5 && ds[0].topic.words.length <= 8, 'Ngày 1 = 5–8 từ đầu của bài đầu: ' + ds.length + ' ngày');
  const p1 = DP.plan(ds[0]).map(s => s.k), p4 = DP.plan(ds[3]).map(s => s.k), big = ds.find(d => d.unit.stage.id === 's3' && d.j < d.of), pa = DP.plan(big).map(s => s.k);
  ok(p1.join() === 'learn,match,mcq,gl,pr,rt', 'Ngày 1 (gói IELTS): nhận diện (thắng sớm) + 1 bài ngữ pháp + 1 bài phát âm + 1 dạng câu Reading: ' + p1);
  ok(p4.indexOf('learn') < p4.indexOf('match') && p4.indexOf('match') < p4.indexOf('cloze') && p4.includes('listen'), 'Ngày 4: học → ghép → nghe → điền câu: ' + p4);
  ok(pa.some(k => /^(use|gram|rt|il|is|iw|mock)$/.test(k)) && pa.includes('cloze'), 'ngày chặng học thuật có collocation/ngữ pháp/đề thi: ' + pa);
  const lastDay = ds.find(d => d.j === d.of && d.unit.status !== 'done');
  ok(DP.plan(lastDay).pop().k === 'test', 'ngày cuối bài kết thúc bằng kiểm tra cuối bài');
  w.App.state.settings.placement = { ...pl, stage: 's2' };
  ds = await DP.days(); const c2 = ds.find(d => d.status === 'current');
  ok(c2 && c2.unit.stage.id === 's2' && ds[0].status === 'skip', 'kiểm tra đầu vào → nhảy tới Ngày đầu chặng s2 (' + (c2 && c2.n) + ')');
  delete w.App.state.settings.placement;
  // tiến độ cũ: bài đã qua (unitDone) → mọi ngày của bài tính là xong
  w.App.state.game.unitDone = { ...(w.App.state.game.unitDone || {}), ngsl1: 90 };
  ds = await DP.days();
  ok(ds.filter(d => d.id.startsWith('ngsl1.')).every(d => d.done) && ds.find(d => d.status === 'current').id.startsWith('ngsl2.'), 'bài cũ đã qua → các ngày của bài đó xong, Ngày hiện tại ở bài kế');
  delete w.App.state.game.unitDone.ngsl1;
  plan = await w.App.todayPlan();
  ok(plan[0].day === 1 && plan[0].href === '#/day/1', 'kế hoạch hôm nay: “Ngày 1” đứng đầu (nút lớn Bắt đầu Ngày 1)');
  await go('#/home', 400);
  ok(/Ngày 1|Day 1/.test(($('.today-cta') || {}).textContent || ''), 'nút chính trang chủ: ' + (($('.today-cta') || {}).textContent || '').trim());
  await go('#/day/1', 400);
  ok($$('.day-steps li').length === 6 && $('.day-hero') && $('[role=progressbar]'), 'trang #/day/1: 6 hoạt động + thanh tiến độ');
  click($('.day-steps a')); await tick(50);
  ok(w.localStorage.getItem('vb.daySess') === 'ngsl1.1~1', 'bấm hoạt động → giữ phiên Ngày 1');
  w.dispatchEvent(new w.CustomEvent('lexkite:practice-done', { detail: { mode: 'match', src: 'topic:ngsl1.1~1', pct: 100 } })); await tick(200);
  const rec = await w.Core.Store.get('pathDays', {});
  ok(rec['ngsl1.1~1'] && rec['ngsl1.1~1'].s.includes('match'), 'xong Ghép thẻ → ghi bước của Ngày 1');
  await go('#/practice/mcq?src=topic:ngsl1.1~1', 400);
  ok($('.day-bar') && /1\/6/.test($('.day-bar').textContent), 'thanh tiến độ buổi học trên trang bài tập: ' + (($('.day-bar') || {}).textContent || '').trim());
  await go('#/path', 400);
  ok($$('.node[data-day]').length > 20 && $('.node.current[aria-current=step]') && /Ngày 1|Day 1/.test($('.path-cta').textContent), 'bản đồ: nút Ngày + Ngày hiện tại + CTA: ' + $$('.node[data-day]').length + ' ' + !!$('.node.current') + ' ' + (($('.path-cta') || {}).textContent || ''));
}

// ===== 7) Gói học (tracks.js): 5 gói × công thức Ngày 1–3 hợp lệ + nội dung có thật, chuyển dữ liệu cũ, đổi gói giữ tiến độ =====
{
  const TK = w.Tracks, DP = w.DayPath, S = w.App.state; ok(TK && TK.IDS.length === 5, 'nạp tracks.js: 5 gói học');
  delete S.settings.placement;
  // Nội dung đích của mọi bước (đọc thẳng file dữ liệu – không cần nạp từng gói)
  const src = (...fs) => fs.map(f => fs0(f)).join('\n'), fs0 = f => { try { return fs.readFileSync(path.join(WEB, 'js', f), 'utf8'); } catch (e) { return ''; } };
  const dir = d => fs.readdirSync(path.join(WEB, 'js', d)).map(f => d + '/' + f);
  const C = { roleplay: src(...dir('roleplay')), call: src('call/calls.js'), listen: src(...dir('listen'), ...dir('toeic')), task1: src('task1.js'), write: src('write.js'), letters: src('write/gt-letters.js'),
    rtype: src('rtype.js'), toefl: src('toefl.js'), toeic: src('toeic.js'), treading: src(...dir('toeic')), grammar: src(...dir('grammar')) };
  const has = (txt, id) => new RegExp(`id: '${id}'|T\\('${id}'`).test(txt);
  const exists = h => { const [, r, a = '', q = ''] = /^#\/([a-z0-9-]+)\/?([^?]*)\??(.*)$/.exec(h) || [];
    if (r === 'practice') { const id = decodeURIComponent(new URLSearchParams(q).get('src') || '').replace(/^topic:/, ''); return id === 'due' || (w.App.topicOf(id) || { words: [] }).words.length >= 3; }
    if (r === 'roleplay' || r === 'call' || r === 'task1' || r === 'write' || r === 'letters') return has(C[r], a);
    if (r === 'listen') return has(C.listen, a);
    if (r === 'rtype') return new RegExp(`\\b${a}: `).test(C.rtype);
    if (r === 'toefl-p') return new RegExp(`\\b${a}: \\{ name`).test(C.toefl);
    if (r === 'toeic-sw') return new RegExp(`\\b${a}: \\{ sec`).test(C.toeic);
    if (r === 'toeic-r') return has(C.treading, a) && /^part=[5-7]$/.test(q);
    if (r === 'toeic-test') return +a >= 1 && +a <= 7;
    if (r === 'speaking') return /^p[1-3]$/.test(a);
    if (r === 'grammar') return a === 'mix' || has(C.grammar, a);
    return ['mock', 'qstats', 'pron', 'usage'].includes(r); };
  const CORE = ['review', 'learn', 'match', 'mcq', 'listen', 'cloze', 'test'], first3 = {};
  const combos = [['comm'], ['ielts', 'ac'], ['ielts', 'gt'], ['toeic', 'lr'], ['toeic', 'sw'], ['toefl'], ['work']];
  for (const [id, v] of combos) {
    await TK.use(id, v); await TK.ready(TK.TR[id]);
    const ds = await DP.daysOf(TK.TR[id]), nm = id + (v ? '/' + v : '');
    ok(ds.length >= 40 && TK.TR[id].stages.every(st => ds.some(d => d.unit.stage === st)), `${nm}: lộ trình đủ chặng, ${ds.length} ngày`);
    ok(TK.TR[id].stages.every((st, i, a) => !i || id === 'ielts' || st.lo >= a[i - 1].lo), `${nm}: chặng CEFR tăng dần`);
    const p3 = ds.slice(0, 3).map(d => DP.plan(d).filter(x => x.k !== 'review'));
    ok(p3.every(st => st[0].k === 'learn' && st[1].k === 'match' && (st.some(x => !CORE.includes(x.k)) || st[st.length - 1].k === 'test')) && p3.slice(0, 2).every(st => st.some(x => !CORE.includes(x.k))), `${nm}: Ngày 1–3 = từ mới → ghép thẻ (dễ) → kỹ năng riêng của gói: ` + p3.map(st => st.map(x => x.k).join('+')).join(' | '));
    ok(p3.every(st => st.reduce((a, x) => a + x.mins, 0) <= 12), `${nm}: Ngày 1–3 ≤ 12 phút`);
    first3[nm] = p3.map(st => st.filter(x => !CORE.includes(x.k)).map(x => x.href).join()).join('|');
    const bad = ds.slice(0, 60).flatMap(d => DP.plan(d)).filter(x => !exists(x.href)).map(x => x.href);
    ok(!bad.length, `${nm}: mọi bước của 60 ngày đầu trỏ tới nội dung có thật` + (bad.length ? ' – thiếu: ' + [...new Set(bad)].slice(0, 5).join(', ') : ''));
    ok(DP.plan(ds.find(d => d.j === d.of && d.unit.status !== 'done')).pop().k === 'test', `${nm}: ngày cuối bài = kiểm tra cuối bài (kiểm tra vượt)`);
    { // trộn 1 bài ngữ pháp + 1 bài phát âm đúng CEFR chặng (nếu có bài khớp); bài trỏ tới nội dung có thật; sau bước từ vựng; xoay vòng trong chặng
      const M = w.PATH_MIX, CE = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'], lv = c => { const m = String(c).match(/[ABC][12]/g) || []; return m.length ? CE.slice(CE.indexOf(m[0]), CE.indexOf(m[m.length - 1]) + 1) : []; };
      const G = new Map(M.g.map(x => [x[0], x[1]])), Pm = new Map(M.p.map(x => [x[0], x[1]])), errs = [], seen = new Set();
      for (const d of ds.slice(0, 80)) {
        const st = DP.plan(d), L = lv(d.unit.stage.cefr), gl = st.filter(x => x.k === 'gl'), pr = st.filter(x => x.k === 'pr'), gram = st.filter(x => x.ext === 'grammar');
        const wantG = M.g.some(x => L.includes(x[1])), wantP = M.p.some(x => L.includes(x[1]));
        if (gl.length > 1 || (wantG && gram.length !== 1)) errs.push(d.n + ':gram' + gram.length);
        if (pr.length !== (wantP ? 1 : 0)) errs.push(d.n + ':pr' + pr.length);
        for (const x of gl) { const id = decodeURIComponent(x.href.replace('#/grammar/', '')); seen.add(id); if (!L.includes(G.get(id))) errs.push(d.n + ':gCEFR ' + id); }
        for (const x of pr) { const id = decodeURIComponent(x.href.replace('#/pron/', '')); if (!L.includes(Pm.get(id))) errs.push(d.n + ':pCEFR ' + id); }
        const fm = st.findIndex(x => x.k === 'gl' || x.k === 'pr'); if (fm >= 0 && st.findIndex(x => x.k === 'match') > fm) errs.push(d.n + ':order');
      }
      ok(!errs.length && seen.size >= 3, `${nm}: mỗi ngày 1 bước ngữ pháp + 1 bài phát âm đúng CEFR (xoay ${seen.size} bài ngữ pháp)` + (errs.length ? ' – ' + errs.slice(0, 5).join(', ') : ''));
    }
  }
  { // hết lộ trình → màn "Tiếp theo học gì?" (gói khác, khóa học, nói tự tin, ôn tập), không ngõ cụt
    const tr = TK.TR.work, gm = w.App.state.game, keep = gm.unitDone; await TK.use('work'); await TK.ready(tr);
    gm.unitDone = { ...(keep || {}) }; for (const st of tr.stages) for (const u of st.units) gm.unitDone[u] = 100;
    const all = await DP.daysOf(tr); await go('#/home', 300); await go('#/path', 500); const nx = $('.path-next');
    ok(all.every(d => d.done) && nx && $$('a[href^="#/tracks?use="]', nx).length === TK.IDS.length - 1 && $('a[href="#/courses"]', nx) && $('a[href="#/confidence"]', nx) && $('a[href="#/review"]', nx),
      'hết lộ trình: màn "Tiếp theo" có gói khác + khóa học + nói tự tin + ôn tập' + (nx ? '' : ` – ${all.filter(d => !d.done).length}/${all.length} ngày chưa xong · ${w.location.hash}`));
    await go('#/day/' + all.length, 400); ok(!!$('.path-next'), 'ngày cuối cùng của lộ trình: hiện "Tiếp theo học gì?"');
    gm.unitDone = keep;
  }
  { const f = Object.entries(first3).filter(([k]) => k !== 'ielts/gt').map(x => x[1]); ok(new Set(f).size === f.length, 'mỗi gói (và TOEIC L&R/S&W) có Ngày 1–3 riêng'); }
  ok(/rtype|listen\/t1p|speaking/.test(first3['ielts/ac']) && /letters|task1|write|rtype/.test(first3['ielts/ac'] + first3['ielts/gt']), 'IELTS: dạng câu Reading/Listening/Speaking');
  ok(/listen\/tl1p1/.test(first3['toeic/lr']) && /toeic-sw\/read/.test(first3['toeic/sw']), 'TOEIC L&R mở đầu Part 1, S&W mở đầu Read a Text Aloud');
  ok(/toefl-p\/cw.*toefl-p\/response.*toefl-p\/sentence/.test(first3.toefl), 'TOEFL 2026: Complete the Words → Listen and Choose → Build a Sentence');
  ok(/roleplay\/cafe/.test(first3.comm) && /call\/first-day/.test(first3.work), 'Giao tiếp: hội thoại quán cà phê; Công sở: cuộc gọi ngày đầu đi làm');
  // mỗi gói một trình độ riêng
  await TK.setLevel('work', 'work3'); ok((await DP.daysOf(TK.TR.work)).find(d => d.status === 'current').unit.stage.id === 'work3' && TK.start(TK.TR.comm) !== 'work3', 'gói Công sở bắt đầu chặng 3, gói khác không đổi');
  S.settings.placement = { v: 2, band: '6.0', vCefr: 'B2', gCefr: 'B1', stage: 's1', at: Date.now() + 5 };
  ok(TK.start(TK.TR.toeic) === 'toeic3' && TK.start(TK.TR.comm) === 'comm4' && TK.start(TK.TR.ielts) === 's1', 'kiểm tra đầu vào (mới hơn) → chặng theo CEFR của từng gói: ' + TK.start(TK.TR.toeic));
  delete S.settings.placement;
  // đổi gói giữ tiến độ từng gói
  await TK.use('comm'); let dc = (await DP.daysOf(TK.TR.comm))[0];
  w.localStorage.setItem('vb.daySess', dc.id);
  w.dispatchEvent(new w.CustomEvent('lexkite:practice-done', { detail: { mode: 'match', src: 'topic:' + dc.id, pct: 100 } })); await tick(200);
  await TK.use('toeic', 'lr'); await TK.use('comm');
  dc = (await DP.daysOf(TK.TR.comm))[0];
  ok((dc.rec.s || []).includes('match') && dc.key !== dc.id, 'Giao tiếp: đổi sang TOEIC rồi quay lại vẫn giữ bước đã xong của Ngày 1 (khóa riêng ' + dc.key + ')');
  ok(TK.cfg().on.includes('toeic') && TK.cfg().on.includes('comm') && TK.cfg().cur === 'comm', 'theo dõi nhiều gói cùng lúc');
  await go('#/home', 500); await go('#/path', 600);
  ok($$('.trk-sw a').length >= TK.cfg().on.length + 1 && $('.trk-sw a[aria-current]') && /Giao tiếp|Everyday/.test($('#view h1').textContent), 'đầu lộ trình: thanh đổi gói + tên gói đang học');
  await go('#/tracks', 500);
  ok($$('.trk-card').length === 5 && $('.trk-card.on') && $$('[data-unf]').length >= 1, 'trang Gói học: 5 gói, gói đang học, bỏ theo dõi');
  await go('#/tracks?use=toefl&to=home', 400);
  ok(TK.cfg().cur === 'toefl' && S.settings.exam === 'toefl' && w.location.hash === '#/home', 'đổi gói qua thanh đổi gói → kỳ thi (goal.js) theo gói');
  plan = await w.App.todayPlan();
  ok(plan[0].track === 'TOEFL 2026' && plan[0].sw && /Ngày|Day/.test(plan[0].t), 'Hôm nay: “Ngày N · TOEFL 2026” + thanh đổi gói');
  await go('#/home', 500);
  ok(/TOEFL 2026/.test(($('.today-cta') || {}).textContent || '') && $('#todayPlan .trk-sw'), 'nút chính trang chủ ghi tên gói: ' + (($('.today-cta') || {}).textContent || '').trim());
  // Trang chủ gọn: 1 thẻ "Học tiếp" duy nhất có nút chính; khối phụ gom dưới "Thêm cho hôm nay" – không mất khối nào
  ok($$('#view .btn.primary.lg').length === 1 && $('#todayPlan.home-hero .home-hero-k') && $('#todayPlan details.plan-more .plan-item'), 'trang chủ: 1 thẻ Học tiếp, 1 nút chính, kế hoạch thu gọn trong thẻ');
  const more = $('.home-more');
  ok(more && ['.rings-card', '.quest-card .qc-it', '#leagueHomeCard', 'a[href="#/quick"]', 'a[href="#/confidence"]', '.wotd'].every(s => more.querySelector(s)) && $('.home-more-h'), 'trang chủ: khối phụ đủ (3 vòng, nhiệm vụ, giải đấu, chơi nhanh, giao tiếp, từ của ngày) dưới "Thêm cho hôm nay"');
  ok(w.document.querySelector('.topbar [data-lsw] #langBtn') && w.document.querySelector('.topbar #langMenu[data-lang-pick]') && /lang-select|data-lang-pick/.test(w.App.langPicker()), 'thanh trên CÓ nút ngôn ngữ 🌐 (chủ 28/10) + vẫn đổi được ở Cài đặt');
  ok(/\.bottom-nav \.badge \{[^}]*width: 9px[^}]*(font-size: 0|font-size: \d+px;[^}]*color: transparent)/.test(css), 'tab Từ vựng: chấm nhỏ thay số đỏ'); // số ẩn bằng font-size 0 hoặc chữ trong suốt (font audit #98)
  // chuyển dữ liệu người dùng cũ: kỳ thi → gói; giữ XP/chuỗi/bản ghi ngày cũ
  const xp0 = S.game.xp, rec0 = await w.Core.Store.get('pathDays', {});
  for (const [ex, id] of [['general', 'comm'], ['ieltsgt', 'ielts'], ['toeic', 'toeic'], ['toefl', 'toefl'], ['ielts', 'ielts']]) {
    delete S.settings.tracks; S.settings.exam = ex;
    const c = TK.cfg(); ok(c.cur === id && c.legacy === id && (ex !== 'ieltsgt' || c.v.ielts === 'gt'), `người dùng cũ (${ex}) → gói ${id}`);
  }
  const ds = await DP.daysOf(TK.TR.ielts);
  ok(S.game.xp === xp0 && ds[0].key === ds[0].id && (ds[0].rec.s || []).includes('match') && JSON.stringify(await w.Core.Store.get('pathDays', {})) === JSON.stringify(rec0), 'chuyển dữ liệu: giữ XP + bản ghi Ngày cũ (khóa cũ) cho gói nhận tiến độ');
  // thiết lập lần đầu: mục tiêu (5 gói) → trình độ → Ngày 1
  delete S.settings.tracks;
  await go('#/welcome/setup', 900);
  ok($$('.trk-opt[data-track]').length === 5 && $$('.trk-opt[aria-pressed=true]').length === 1, 'thiết lập: “Mục tiêu của bạn là gì?” 5 gói');
  ok($('.onb .progress[aria-valuenow="1"]') && $('#onbBack') && $('.onb-say') && $('#obNext') && !$('#go') && !$('[data-lv]'), 'thiết lập từng bước: 1 câu hỏi/màn, thanh tiến độ, nút quay lại, Kit, nút Tiếp tục');
  const say0 = $('.onb-say').textContent;
  click($('[data-track=work]')); await tick(600);
  ok($('.onb-say').textContent !== say0 && $('[data-track=work][aria-pressed=true]'), 'Kit phản hồi khi chọn gói');
  click($('#obNext')); await tick(100);
  ok($('.onb .progress[aria-valuenow="2"]') && $('.onb-test[data-lv=test]') && $('[data-lv=work2]'), 'màn 2: kiểm tra đầu vào 5 phút + trình độ của gói Công sở');
  click($('#onbBack')); await tick(100);
  ok($('[data-track=work][aria-pressed=true]') && $('.onb .progress[aria-valuenow="1"]'), 'quay lại màn 1 giữ lựa chọn');
  click($('#obNext')); await tick(100);
  click($('[data-lv=work2]')); await tick(100);
  ok($('[data-lv=work2][aria-pressed=true]'), 'chọn trình độ chặng 2');
  for (let i = 0; i < 5 && !$('#go'); i++) { click($('#obNext')); await tick(100); }
  ok($('#go') && /Day 1|Ngày 1/.test($('#go').textContent) && $('.onb-sum'), 'chọn gói Công sở + trình độ → màn tóm tắt + nút Bắt đầu Ngày 1');
  click($('#go')); await tick(1500);
  ok(S.settings.tracks.cur === 'work' && S.settings.tracks.lv.work.s === 'work2' && S.settings.exam === 'general' && /^#\/day/.test(w.location.hash), 'thiết lập xong → gói Công sở, chặng 2, vào Ngày 1 của gói: ' + w.location.hash);
  ok(!S.user && !w.document.querySelector('#view [data-acct], #view .gsi'), 'vào Ngày 1 KHÔNG cần tài khoản, không có nút đăng nhập trên trang bài học');
}

// ===== 5) 🔥 Nhịp buổi học (web/js/lesson-fx.js): chuỗi đúng liền + hoàn hảo, mời chế độ khó, lỗi chính tả nhỏ, 3 thẻ số liệu, tạm tắt nghe/nói =====
{
  w.localStorage.removeItem('vb.noAudioUntil'); w.localStorage.removeItem('vb.noMicUntil');
  const tw = w.App.topicOf('awl1').words, BM = new Map(tw.map(x => [w.App.meanOf(x), x.word]));
  const typoOf = s => { if ((s.match(/[a-z]/g) || []).length < 4) return s; for (let i = s.length - 2; i >= 1; i--) { const m = s.slice(0, i) + s.slice(i + 1); if (!w.IELTS_DATA.INDEX[m.toLowerCase()]) return m; } return s; }; // bỏ 1 chữ (thử từng vị trí tới khi được chuỗi không phải từ thật) → luôn tạo được lỗi gõ cho mọi từ ≥ 4 chữ cái (trước đây chỉ từ ≥ 6 chữ & đúng vị trí → thi thoảng không có câu nào đủ điều kiện)
  await go('#/home', 100); await go('#/practice/mcq?src=topic:awl1', 400);
  ok(w.LessonFx && $('.study-top') && $('.lfx-combo'), 'lesson-fx nạp cùng #/practice, có chỗ cho chip chuỗi đúng');
  const chips = []; let sawHard = false, badge = false, typoOk = false, typed = 0;
  for (let k = 0; k < 30 && !$('.lfx-stats'); k++) {
    await tick(280); chips.push((($('.lfx-combo') || {}).textContent || '').trim());
    if ($('#lfxHardYes')) { sawHard = /8/.test($('#lfxHardH').textContent) && /<svg/.test($('.lfx-hardin').innerHTML); click($('#lfxHardYes')); continue; }
    if ($('.options .option')) { const wd = ($('.entry-word') || {}).textContent; click($$('.options .option').find(b => b.dataset.o === wd)); }
    else if ($('#ans')) {
      badge = badge || !!$('.lfx-hard'); const word = BM.get(($('.q-card .vi') || {}).textContent) || 'zzzz';
      $('#ans').value = typoOk ? word : typoOf(word); typed++; $('#ansForm').dispatchEvent(new w.Event('submit', { cancelable: true })); await tick(30);
      if (!$('#nextQ')) { $('#ans').value = word; $('#ansForm').dispatchEvent(new w.Event('submit', { cancelable: true })); await tick(30); }
      typoOk = typoOk || /lfx-fix/.test((($('#fb .sheet-head') || {}).innerHTML) || '');
    }
    await tick(280); click($('#nextQ')); await tick(60);
  }
  ok(chips.some(c => /🔥|✨/.test(c)) && chips.some(c => /✨/.test(c)), 'chip chuỗi đúng liền + trạng thái hoàn hảo khi chưa sai câu nào: ' + chips.slice(0, 5).join(' | '));
  ok(sawHard && badge, 'sau 8 câu đúng liền: màn mời chế độ khó có Kit; câu sau có nhãn Câu khó');
  ok(typoOk, 'gõ sai 1 chữ ở từ ≥ 4 chữ cái → vẫn đúng, gạch chân chỗ sửa');
  ok($$('.lfx-stat').length === 3 && $('.lfx-head') && $('.celebrate [data-share]'), 'màn cuối: 3 thẻ số liệu (XP / chuỗi dài nhất / thời gian) + lời chào + nút khoe kết quả');
  await go('#/home', 100); await go('#/practice/listen?src=topic:ngsl1.1', 400);
  const na = $('#lfxNoAudio'); ok(na, 'câu nghe có nút tạm tắt âm thanh 15 phút'); await tick(280); click(na); await tick(40);
  ok(+w.localStorage.getItem('vb.noAudioUntil') > Date.now() && !$('#play') && $('#ans'), 'tạm tắt âm thanh → câu này đổi sang dạng gõ nghĩa');
  await go('#/home', 100); await go('#/practice/listen?src=topic:ngsl1.1', 400);
  ok($('.lfx-note') && !$('#play'), 'đang tạm tắt: lượt nghe mới có dải thông báo, không câu nghe');
  click($('.lfx-note button')); await tick(60);
  ok(!w.localStorage.getItem('vb.noAudioUntil') && $('#play'), 'Bật lại → câu nghe trở lại');
  w.LessonFx.pauseMic(); await go('#/home', 100); await go('#/practice/speak?src=topic:ngsl1.1', 400);
  ok($('.lfx-note') && $$('.options .option').length === 4 && !$('#mic'), 'tạm tắt micro → bài nói thay bằng trắc nghiệm nghĩa');
  w.LessonFx.resume();
}

// ===== Lần đầu mở, storage trống: Tracks.cur() chưa có / gói thiếu chặng → lộ trình vẫn dựng, không ném lỗi ('stages') =====
{
  const TK = w.Tracks, S = w.App.state, e0 = errors.length, cur0 = TK.cur;
  S.settings = {}; try { w.localStorage.clear(); } catch (e) {}
  let thrown = '';
  try { TK.cur = () => undefined; await go('#/path', 500); await w.DayPath.daysOf(undefined); } catch (e) { thrown = e.message; }
  ok(!thrown, 'path-day: storage trống + Tracks.cur() undefined không lỗi: ' + thrown);
  ok($('.path') || $('.empty'), 'path-day: lộ trình hoặc trạng thái rỗng vẫn hiển thị');
  TK.cur = cur0;
  ok(!errors.slice(e0).some(m => /stages/.test(m)), 'path-day: không lỗi đọc stages');
}

// ===== Tracks.setupCards: pick.track thiếu/lạ (lần đầu) không ném 'stages' =====
{
  let thrown = '';
  try { for (const pk of [{ v: {} }, { track: 'khong-co', v: {}, lv: '' }, undefined]) { const h = w.Tracks.setupCards(pk); if (!/trk-opt/.test(h)) thrown = 'thiếu thẻ gói'; } } catch (e) { thrown = e.message; }
  ok(!thrown, 'Tracks.setupCards chịu được pick.track thiếu/lạ: ' + thrown);
  ok(/trk-opt/.test(w.Tracks.setupGoal({ v: {} })) && /data-lv="test"/.test(w.Tracks.setupLevel({})) && !/data-lv="test"/.test(w.Tracks.setupLevel({}, true)), 'Tracks.setupGoal/setupLevel (màn riêng của thiết lập từng bước)');
}

// ===== Mời lưu tiến độ CHỈ sau khi xong 1 buổi (path-reward.js), không khi đã đăng nhập; "Để sau" → ẩn 3 ngày =====
{
  const S0 = w.Sync, u0 = w.App.state.user;
  w.Sync = Object.assign(Object.create(S0 || {}), { gBtn: id => `<button type="button" id="${id}" data-acct="in">G</button>`, can: true, authBtns: null });
  w.localStorage.removeItem('vb.saveNudge');
  const show = title => { w.App.view.innerHTML = '<div class="card celebrate"></div>'; w.PathReward.show({ unit: { topic: { name: 'Ngày 1', emoji: '📅' } }, steps: [{ m: 'a', em: '🧠', name: 'A', ok: 1, href: '#' }], next: null, title }); return w.App.view; };
  w.App.state.user = null;
  ok(!show('').querySelector('#prSave'), 'chưa xong buổi (không có tiêu đề hoàn thành) → không mời đăng nhập');
  const v = show('🎉 Ngày 1'); ok(v.querySelector('#prSave #prSaveIn[data-acct=in]'), 'xong Ngày 1, chưa đăng nhập → thẻ “Lưu tiến độ” + nút đăng nhập');
  click(v.querySelector('#prSaveNo')); ok(!v.querySelector('#prSave') && !show('🎉 Ngày 2').querySelector('#prSave'), '“Để sau” → ẩn, không hỏi lại ngay');
  w.localStorage.removeItem('vb.saveNudge'); w.App.state.user = { uid: 'x' };
  ok(!show('🎉 Ngày 1').querySelector('#prSave'), 'đã đăng nhập → không mời');
  w.App.state.user = u0; w.Sync = S0; w.localStorage.removeItem('vb.saveNudge');
}

const real = errors.filter(e => !/Not implemented|navigation|Could not parse CSS/.test(e));
ok(!real.length, 'không lỗi JS: ' + real.slice(0, 3).join(' | '));
if (fails) { console.log(`✗ learn-flow: ${fails}/${n} lỗi`); process.exit(1); }
console.log(`✓ learn-flow: ${n} phép kiểm (Học thông minh · phương án nhiễu · kiểm tra đầu vào · kế hoạch)`);
process.exit(0);
