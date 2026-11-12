// Test giao diện (jsdom, chạy cả app) cho 🔤 Động từ bất quy tắc: bảng (#/irregular), lọc/tìm, tờ chi tiết (#/irregular/<động từ>, lưu vào ôn tập), luyện (#/irregular/practice).
// Chạy: node scripts/test/irregular-ui.mjs
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import jsdom from 'jsdom';
const require = createRequire(import.meta.url);
const { JSDOM } = jsdom, WEB = 'web';
let n = 0, fails = 0; const ok = (c, m) => { n++; if (!c) { fails++; console.log('✗', m); } };
const html = fs.readFileSync(path.join(WEB, 'app', 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script(?: defer)? src="([^"]+)"><\/script>/g)].map(m => m[1]);
const vc = new jsdom.VirtualConsole(); vc.on('jsdomError', e => { if (!/Not implemented/.test(e.message)) console.error(e.message); });
const dom = new JSDOM(html.replace(/<!--hero-->[\s\S]*?<!--\/hero-->/, '').replace(/<script(?: defer)? src="[^"]+"><\/script>/g, '').replace(/<link[^>]+>/g, ''), { url: 'http://localhost/app/?hl=vi#/home', runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole: vc });
const w = dom.window, errors = [];
w.addEventListener('error', e => errors.push(e.message));
w.console.error = (...a) => errors.push(a.join(' '));
w.scrollTo = () => {}; w.HTMLElement.prototype.scrollIntoView = () => {}; w.matchMedia = () => ({ matches: false, addEventListener() {} });
w.CSS = { escape: s => s };
w.fetch = async url => {
  const m = /^js\/irv\/([a-z]+)\.json$/.exec(String(url)), f = m && path.join(WEB, 'js/irv', m[1] + '.json');
  if (f && fs.existsSync(f)) { const j = JSON.parse(fs.readFileSync(f, 'utf8')); return { ok: true, status: 200, json: async () => j, text: async () => '' }; }
  return { ok: false, status: 404, json: async () => ({}), text: async () => '' };
};
for (const f of scripts) { try { w.eval(fs.readFileSync(path.join(WEB, f), 'utf8')); } catch (e) { errors.push(f + ': ' + e.message); } }
require('./lazyfix.js')(w, fs, path, WEB, errors);
const tick = (ms = 40) => new Promise(r => setTimeout(r, ms));
const $ = s => w.document.querySelector(s), $$ = s => [...w.document.querySelectorAll(s)];
const go = async (h, ms = 400) => { w.location.hash = h; await tick(ms); };
const txt = s => ($(s) || {}).textContent || '';
const click = el => el && el.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true }));
const type = (el, v) => { el.value = v; el.dispatchEvent(new w.Event('input', { bubbles: true })); };
const rows = () => $$('#irvList article');

await tick(300); await go('#/welcome/setup', 120); for (let i = 0; i < 60 && !$('#go'); i++) { if ($('#obNext')) $('#obNext').click(); await tick(100); } if ($('#go')) $('#go').click(); await tick(1500);
const said = [], added = [];
w.UI.tts = (...a) => { said.push(a); return Promise.resolve(); }; w.UI.speak = (...a) => { said.push(a); return Promise.resolve(); };
const addWord = w.App.addWord; w.App.addWord = async (e, c, o) => { added.push([e, c, o]); return addWord(e, c, o); };
ok(w.LK_VERBS && w.Irv && w.App.routes.irregular && w.Irv.drill, 'nạp: LK_VERBS, Irv (bảng + luyện), route irregular');

// ---- bảng ----
await go('#/irregular', 600);
const all = rows().length;
ok(all >= 200, `bảng vẽ đủ (≥ 200 hàng, có ${all})`);
ok(/\d+ động từ, đã lưu \d+ vào ôn tập/.test(txt('#irvCnt')), 'dòng đếm: “{n} động từ, đã lưu {s} vào ôn tập”');
ok(rows()[0].querySelector('a[href^="#/irregular/"]') && rows()[0].querySelector('[data-irv-spk]'), 'hàng: link chi tiết + loa đọc cả ba dạng');
type($('#irvQ'), 'gone');
ok(rows().length >= 1 && rows().length < 8 && rows().some(r => r.querySelector('[data-irv-open="go"]')), 'tìm “gone” (dạng V3) → ra “go”');
type($('#irvQ'), 'swum'); ok(rows().length === 1 && /swim/.test(txt('#irvList')), 'tìm “swum” → swim');
type($('#irvQ'), 'đi'); ok(rows().some(r => r.querySelector('[data-irv-open="go"]')), 'tìm theo nghĩa tiếng Việt “đi” → go');
type($('#irvQ'), 'zzzz'); ok(rows().length === 0 && !$('#irvNone').hidden, 'không khớp → thông báo trống');
type($('#irvQ'), '');
click($('#irvPat [data-pat="AAA"]')); const aaa = rows().length;
ok(aaa > 10 && aaa < all && /cut/.test(txt('#irvList')) && !rows().some(r => r.querySelector('[data-irv-open="go"]')), 'lọc mẫu A-A-A: có cut, không có go');
click($('#irvPat [data-pat=""]')); click($('#irvCef [data-cef="A1"]')); const a1 = rows().length;
ok(a1 > 5 && a1 < all, `lọc CEFR A1 giảm số hàng (${a1}/${all})`);
click($('#irvCef [data-cef=""]'));
click($('#irvSort [data-sort="az"]')); ok(rows()[0].querySelector('[data-irv-open]').dataset.irvOpen < rows()[5].querySelector('[data-irv-open]').dataset.irvOpen, 'A đến Z: sắp xếp theo chữ cái');
click($('#irvSort [data-sort="freq"]'));
ok(/^#\/irregular\/practice/.test($('#irvGo').getAttribute('href')) && /10/.test(txt('#irvGoT')), 'nút Luyện nhanh 10 động từ');

// ---- tờ chi tiết ----
await go('#/irregular/go');
ok($('#modal') && !$('#modal').hidden && txt('#irvH') === 'go', 'link sâu #/irregular/go mở tờ chi tiết');
ok(/went/.test(txt('#modalBox')) && /gone/.test(txt('#modalBox')) && $$('#modalBox [data-irv-say]').length >= 4, 'tờ: 3 ô dạng chia có loa + dòng go, went, gone');
ok($('#modalBox [data-irv-acc]') && $('#modalBox a[href="#/verb/go"]') && $('#modalBox a[href="#/dict/go"]'), 'tờ: UK/US, Bảng chia đầy đủ, Từ điển');
click($('#modalBox [data-irv-sent="p"]')); ok(said.some(a => /went/.test(a[0])), 'loa câu ví dụ đọc câu quá khứ');
click($('#modalBox [data-irv-save]')); await tick(200);
ok(added.some(([e, c]) => e.word === 'go' && e.topic === 'irregular' && e.pos === 'verb' && c && c.text), 'Lưu vào ôn tập → App.addWord({word:go, topic:irregular}, câu ngữ cảnh)');
ok(w.App.inDeck('go') && /Đã lưu/.test(txt('#modalBox [data-irv-save]')), 'đã lưu → nút hiện “Đã lưu vào ôn tập”');
w.UI.closeModal(); await tick(300);
ok(w.location.hash === '#/irregular', 'đóng tờ → quay về #/irregular');
ok(rows().length > 100, 'đóng tờ không vẽ lại mất bảng');

// ---- luyện ----
const drillOf = async (q, answer) => {
  await go('#/irregular', 200); await go('#/irregular/practice?retry=' + q, 500); // đi qua bảng: cùng hash thì không vẽ lại
  if (!$('#irvBlank')) return '';
  $('#irvIn').value = answer; click($('#irvChk')); await tick(50);
  return txt('#irvFb');
};
await go('#/irregular/practice?retry=get%3App', 500);
ok(/Điền quá khứ phân từ/.test(txt('main')), 'luyện get (V3): đề “Điền quá khứ phân từ”');
ok($('[data-exit]') && $('[role=progressbar]'), 'luyện: nút thoát [data-exit] + thanh tiến độ');
let fb = await drillOf('get%3App', 'Gotten.'); ok(/Đúng rồi/.test(fb), 'get (V3) nhận “gotten” (hoa/thường, dấu chấm cuối)');
fb = await drillOf('get%3App', 'got'); ok(/Đúng rồi/.test(fb), 'get (V3) nhận cả “got”');
added.length = 0; fb = await drillOf('go%3App', 'went'); ok(/Đáp án đúng: gone/.test(fb), 'go (V3) trả lời went → “Đáp án đúng: gone”');
await tick(100); ok(w.App.inDeck('go'), 'sai → vào ôn tập (đã lưu)');
ok(JSON.parse(w.localStorage.getItem('lk.irv.miss') || '{}').go >= 1, 'sai → ghi vào “hay sai của tôi” (lk.irv.miss)');
click($('#irvChk')); await tick(60);
click($('#irvChk')); await tick(60); // câu sai được hỏi lại một lần
ok($('#irvBlank') || /trên \d+ câu đúng/.test(txt('main')), 'sai → hỏi lại một lần');
$('#irvIn') && ($('#irvIn').value = 'gone', click($('#irvChk')), await tick(50), click($('#irvChk')), await tick(60));
ok(/trên \d+ câu đúng/.test(txt('main')), 'tổng kết: “{c} trên {n} câu đúng”');
ok($('a[href^="#/irregular/practice?retry="]'), 'tổng kết: “Luyện lại câu sai”');
ok(w.Irv.accepts({ ans: ['got', 'gotten'] }, 'GOTTEN.') && !w.Irv.accepts({ ans: ['got', 'gotten'] }, 'get'), 'chuẩn hóa đáp án');
ok(w.ExitGuard.isLearn('irregular', 'practice', '') && !w.ExitGuard.isLearn('irregular', 'go', '') && !w.ExitGuard.isLearn('irregular', '', ''), 'ExitGuard: chỉ #/irregular/practice là màn học');

const bad = errors.filter(e => !/Not implemented|navigation/i.test(e)); ok(!bad.length, 'không lỗi JS: ' + bad.slice(0, 3).join(' | '));
if (fails) { console.log(`✗ irregular-ui: ${fails}/${n} lỗi`); process.exit(1); }
console.log(`✓ irregular-ui: ${n} phép kiểm (bảng, lọc, chi tiết, luyện)`); process.exit(0);
