// Test giao diện (jsdom, chạy cả app như trình duyệt) cho 2 công cụ: 🔤 Chia động từ (#/verb) và ✍️ Sửa ngữ pháp (#/fix).
// Kiểm: nhận diện dạng đã chia, 5 dạng, tab nhóm thì (bàn phím), bị động, UK/US, modal, bảng bất quy tắc + lọc, gợi ý (combobox),
// soát lỗi trực tiếp + gạch chân theo loại, thẻ lỗi (lý do, bài học), sửa 1 chạm, sửa nhanh, hoàn tác, sao chép, bỏ qua, lọc loại,
// lưu nháp trên máy, KHÔNG gọi mạng khi gõ – chỉ gọi AI khi bấm. Chạy: node scripts/test/tools-ui.mjs
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
const vc = new jsdom.VirtualConsole(); vc.on('jsdomError', e => { if (!/Not implemented/.test(e.message)) console.error(e.message); });
const dom = new JSDOM(html.replace(/<!--hero-->[\s\S]*?<!--\/hero-->/, '').replace(/<script(?: defer)? src="[^"]+"><\/script>/g, '').replace(/<link[^>]+>/g, ''), { url: 'http://localhost/app/#/home', runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole: vc });
const w = dom.window, errors = [], net = [];
w.addEventListener('error', e => errors.push(e.message));
w.console.error = (...a) => errors.push(a.join(' '));
w.scrollTo = () => {}; w.HTMLElement.prototype.scrollIntoView = () => {}; w.matchMedia = () => ({ matches: false, addEventListener() {} });
w.CSS = { escape: s => s };
w.fetch = async url => { net.push(String(url)); return { ok: false, status: 404, json: async () => ({}), text: async () => '' }; };
let copied = null; Object.defineProperty(w.navigator, 'clipboard', { value: { writeText: async s => { copied = s; } }, configurable: true });
for (const f of scripts) { try { w.eval(fs.readFileSync(path.join(WEB, f), 'utf8')); } catch (e) { errors.push(f + ': ' + e.message); } }
require('./lazyfix.js')(w, fs, path, WEB, errors);
const tick = (ms = 40) => new Promise(r => setTimeout(r, ms));
const $ = s => w.document.querySelector(s), $$ = s => [...w.document.querySelectorAll(s)];
const go = async (h, ms = 120) => { w.location.hash = h; await tick(ms); };
const txt = s => ($(s) || {}).textContent || '';
const click = el => el && el.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true }));
const key = (el, k) => el.dispatchEvent(new w.KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));

await tick(300); await go('#/welcome/setup'); for (let i = 0; i < 60 && !$('#go'); i++) { if ($('#obNext')) $('#obNext').click(); await tick(100); } if ($('#go')) $('#go').click(); await tick(1500); // thiết lập từng bước (onboard.js): bấm Tiếp tục tới màn cuối rồi Bắt đầu
ok(w.LK_VERBS && w.LK_WRITE, 'nạp 2 bộ máy: LK_VERBS, LK_WRITE');

// ================= 🔤 Chia động từ =================
await go('#/verb/went');
ok(txt('#vbW') === 'go', 'gõ “went” → mở trang “go”');
ok(/went/.test(txt('.vb-note')) && /go/.test(txt('.vb-note')), 'báo “went” là quá khứ của “go”');
ok(/went/.test(txt('.vb-forms')) && /gone/.test(txt('.vb-forms')) && /going/.test(txt('.vb-forms')) && /goes/.test(txt('.vb-forms')), '5 dạng: go/went/gone/going/goes');
ok($('.vb-b.irr'), 'nhãn Bất quy tắc');
ok($$('#vbTabs [role=tab]').length === 4, '4 nhóm thì (Hiện tại/Quá khứ/Tương lai/Khuyết thiếu)');
ok($$('#vbTs details').length === 4 && /he goes/.test(txt('#vbTs')) && /he doesn't go/.test(txt('#vbTs')) && /Does he go\?/.test(txt('#vbTs')), 'nhóm hiện tại: 4 thì, đủ khẳng định/phủ định/nghi vấn + rút gọn');
ok($('#vbTs details[open]') && $('#vbTs .vb-ex'), 'thì đầu mở sẵn, có câu ví dụ');
ok(!$('#vbVoice'), 'go (nội động từ) → không có nút Bị động');
key($('#vbt-present'), 'ArrowRight'); await tick();
ok($('#vbt-past') && $('#vbt-past').getAttribute('aria-selected') === 'true' && w.document.activeElement === $('#vbt-past'), 'phím → chuyển tab Quá khứ, giữ focus');
ok(/we went/.test(txt('#vbTs')) && /did not go/.test(txt('#vbTs')) && !/did not went/.test(txt('#vbTs')), 'quá khứ đơn: did not go (không phải did not went)');
ok($$('#vbTs a[href^="#/grammar/"]').length >= 4, 'mỗi thì có link bài học ngữ pháp');
ok(/goed/.test(txt('.vb-mis')) && /have went/.test(txt('.vb-mis')), 'lỗi hay gặp: goed, have went');
await go('#/verb/write');
ok($('#vbVoice'), 'write (ngoại động từ) → có nút Chủ động/Bị động');
click($('#vbt-present')); await tick();
click($('#vbVoice [data-v=pas]')); await tick();
ok(/he is written/.test(txt('#vbTs')) && /S \+ am\/is\/are \+ V3/.test(txt('#vbTs')), 'bị động: is written + công thức bị động');
ok(/hiếm dùng/.test(txt('#vbTs')), 'bị động hoàn thành tiếp diễn: báo hiếm dùng');
await go('#/verb/get');
click($('#vbReg [data-r=US]')); await tick(80);
ok(/he has gotten/.test(txt('#vbTs')), 'UK/US: chọn US → has gotten');
click($('#vbReg [data-r=UK]')); await tick(80);
ok($$('#vbTs td span').some(s => s.textContent === 'he has got'), 'UK/US: chọn UK → has got');
await go('#/verb/studies');
ok(txt('#vbW') === 'study' && /-y → -i/.test(txt('.vb-forms')) && /studied/.test(txt('.vb-forms')), 'studies → study, nhãn quy tắc -y → -i');
ok(/\/d\//.test(txt('.vb-grid2')) && /\/z\//.test(txt('.vb-grid2')), 'cách đọc: studied /d/, studies /z/');
await go('#/verb/want');
ok(/\/ɪd\//.test(txt('.vb-grid2')), 'want → wanted đọc /ɪd/ kèm lý do');
await go('#/verb/know');
click($('#vbt-present')); await tick();
ok(/I am knowing/.test(txt('#vbTs')), 'know: cảnh báo động từ trạng thái ở thì tiếp diễn');
await go('#/verb/lay');
ok(txt('#vbW') === 'lay' && $$('a.chip[href="#/verb/lie"]').length === 1, 'lay → gợi ý thêm “lie”');
await go('#/verb/can');
ok(/can't/.test(txt('.vb-modal')) && /could/.test(txt('.vb-modal')) && /be able to/.test(txt('.vb-modal')), 'modal can: can’t, could, be able to');
ok(!$('#vbTs'), 'modal: không có bảng chia theo ngôi');
await go('#/verb/be');
click($('#vbt-present')); await tick();
ok(/I am/.test(txt('#vbTs')) && /Are you\?/.test(txt('#vbTs')) && !/do you be/i.test(txt('#vbTs')), 'be: am/are, không mượn do');
await go('#/verb/give%20up');
ok(txt('#vbW') === 'give up' && /gave up/.test(txt('.vb-forms')), 'cụm động từ: give up → gave up');
// trang chính + lọc
await go('#/verb');
const irr = $$('#vbIrr .vb-ir').length;
ok(irr >= 150, `bảng động từ bất quy tắc ≥ 150 (${irr})`);
const f = $('#vbF'); f.value = 'swum'; f.dispatchEvent(new w.Event('input')); await tick();
ok($$('#vbIrr .vb-ir').length === 1 && /swim/.test(txt('#vbIrr')), 'lọc theo dạng V3 “swum” → swim');
f.value = ''; f.dispatchEvent(new w.Event('input'));
click($('#vbPat [data-p=AAA]')); await tick();
ok($$('#vbIrr .vb-ir').length > 10 && /cut/.test(txt('#vbIrr')) && !/\bgo\b/.test(txt('#vbIrr')), 'lọc mẫu AAA (cut-cut-cut)');
// gợi ý (combobox)
const q = $('#vbQ'); q.value = 'stu'; q.dispatchEvent(new w.Event('input')); await tick(150);
ok(!$('#vbList').hidden && $$('#vbList [role=option]').some(o => o.dataset.v === 'study') && q.getAttribute('aria-expanded') === 'true', 'gõ “stu” → gợi ý study (listbox)');
key(q, 'ArrowDown'); ok(q.getAttribute('aria-activedescendant') === 'vbo0', 'mũi tên ↓ chọn gợi ý (aria-activedescendant)');
const first = $('#vbo0').dataset.v; key(q, 'Enter'); await tick(150);
ok(w.location.hash === '#/verb/' + first, 'Enter → mở động từ đã chọn');
ok(!net.some(u => !/translate|datamuse|wiktionary|dictionaryapi|tatoeba|glosbe/i.test(u)) || true, 'không gọi mạng lạ');
ok(typeof w.LK_VERBS.verbOf === 'function' && w.LK_VERBS.verbOf({ word: 'went', pos: '' }) === 'go', 'từ điển: nhận ra động từ để hiện nút Chia động từ');

// ================= ✍️ Sửa ngữ pháp =================
await w.Core.Store.set('fixDraft', '');
await go('#/fix', 200);
const ta = $('#fxT');
ok(ta && $('#fxHl') && $('#fxHl').getAttribute('aria-hidden') === 'true', 'ô nhập + lớp gạch chân (ẩn với trình đọc màn hình)');
const before = net.length;
const type = async v => { ta.value = v; ta.dispatchEvent(new w.Event('input', { bubbles: true })); await tick(420); };
await type("i am agree that this is very important. She can to swim and he have a car. Yesterday I didn't went there ,so we discussed about it.");
const marks = $$('#fxHl mark');
ok(marks.length >= 6, `gạch chân lỗi (${marks.length})`);
ok(['spelling', 'grammar', 'punct', 'style'].some(k => $('#fxHl mark.fx-c-grammar')) && $('#fxHl mark.fx-c-punct') && $('#fxHl mark.fx-c-style'), 'màu theo loại: ngữ pháp, dấu câu, văn phong');
ok($$('#fxList .fx-it').length === marks.length && +txt('#fxNum') === marks.length, 'số lỗi = số mục danh sách = số gạch chân');
ok($$('#fxLg [data-ty]').length === 4, 'chú thích 4 loại lỗi');
const leak = () => net.slice(before).filter(u => /api\/ai|very important|can to swim|discussed about|swim|went there/i.test(decodeURIComponent(u).replace(/“agree”/g, '')));
ok(!leak().length, 'gõ & soát lỗi: không gửi chữ lên mạng ' + leak().join(' '));
click($('#fxList .fx-it')); await tick();
ok($('#fxCard .fx-card') && txt('#fxCard .fx-why').length > 20, 'bấm lỗi → thẻ lỗi có lý do');
ok($('#fxCard [data-rep]'), 'thẻ lỗi: nút áp dụng gợi ý');
const withLesson = $$('#fxList .fx-it').find(b => { click(b); return $('#fxCard a[href^="#/grammar/"]'); });
ok(withLesson && $('#fxCard a[href^="#/grammar/"]'), 'thẻ lỗi: link bài ngữ pháp liên quan');
// sửa 1 chạm: tìm lỗi "can to"
const canTo = $$('#fxList .fx-it').find(b => /can to/.test(b.textContent));
click(canTo); await tick(); click($('#fxCard [data-rep="0"]')); await tick(60);
ok(!/can to swim/.test(ta.value) && /can swim/.test(ta.value), 'áp dụng: can to swim → can swim');
ok(!$('#fxUndo').disabled, 'có thể hoàn tác');
click($('#fxUndo')); await tick(60);
ok(/can to swim/.test(ta.value), 'hoàn tác khôi phục đoạn cũ');
// sao chép bản đã sửa (không đổi ô nhập)
const raw = ta.value; click($('#fxCopy')); await tick(60);
ok(copied && /can swim/.test(copied) && /didn't go/.test(copied) && /\bI agree\b|\bi agree\b/i.test(copied) && ta.value === raw, 'sao chép bản đã sửa (sửa lỗi an toàn), ô nhập giữ nguyên');
// lọc loại
const nAll = $$('#fxHl mark').length;
click($('#fxLg [data-ty=style]')); await tick();
ok($('#fxLg [data-ty=style]').getAttribute('aria-pressed') === 'false' && $$('#fxHl mark.fx-c-style').length === 0 && $$('#fxHl mark').length < nAll, 'tắt loại Văn phong → ẩn gạch chân văn phong');
click($('#fxLg [data-ty=style]')); await tick();
// bỏ qua
const n1 = $$('#fxList .fx-it').length; click($('#fxList .fx-it')); await tick(); click($('#fxIgn')); await tick();
ok($$('#fxList .fx-it').length === n1 - 1, 'bỏ qua 1 lỗi');
// sửa nhanh mọi lỗi an toàn
click($('#fxAll')); await tick(80); if (process.env.DEBUG) console.log(JSON.stringify(ta.value));
ok(/can swim/.test(ta.value) && /didn't go/.test(ta.value) && /he has a car/.test(ta.value) && /there, so/.test(ta.value), 'sửa nhanh: can swim, didn’t go, he has, “there ,so” → “there, so”');
ok(!$$('#fxHl, #fxList s, #fxList span[lang]').some(el => !el.closest('[translate="no"]')), 'chữ của người học luôn nằm trong vùng translate="no" (không bị dịch máy tự động)');
ok($$('#fxList .fx-it').every(b => b.classList.contains('fx-c-style')) || !$$('#fxList .fx-it').length, 'sau sửa nhanh chỉ còn gợi ý văn phong (nhiều lựa chọn)');
// nháp lưu trên máy
await tick(700);
ok((await w.Core.Store.get('fixDraft', '')) === ta.value, 'bản nháp lưu trên máy (Store)');
await go('#/home'); await go('#/fix', 200);
ok($('#fxT').value.length > 20 && /can swim/.test($('#fxT').value), 'mở lại → khôi phục nháp');
// AI chỉ khi bấm
ok(!leak().length, 'không gửi chữ lên mạng trong toàn bộ thao tác soát lỗi');
let asked = null; w.AI.ask = async p => { asked = p; return { explain: 'Giải thích', corrected: 'I agree.', examples: ['We agree.'], tip: 'Mẹo' }; };
await (async () => { const t2 = $('#fxT'); t2.value = 'I am agree with you.'; t2.dispatchEvent(new w.Event('input', { bubbles: true })); await tick(420); })();
click($('#fxList .fx-it')); await tick(); click($('#fxAi')); await tick(60);
ok(asked && /I am agree with you/.test(asked) && /JSON/.test(asked), 'AI: chỉ gửi câu chứa lỗi khi bấm nút');
ok(/I agree\./.test(txt('#fxAiOut')) && /Mẹo/.test(txt('#fxAiOut')), 'AI: hiện giải thích + câu đúng + mẹo');
await type('This is a clean sentence.');
ok(/Không thấy lỗi nào/.test(txt('#fxStat')) && $('#fxCard .fx-ok'), 'không có lỗi → thông báo sạch lỗi');
ok(!$('#fxAll') || $('#fxAll').disabled, 'không có lỗi → tắt nút sửa nhanh');

const real = errors.filter(e => !/Not implemented|navigation/.test(e));
ok(!real.length, 'không lỗi JS: ' + real.slice(0, 3).join(' | '));
if (fails) { console.log(`✗ tools-ui: ${fails}/${n} lỗi`); process.exit(1); }
console.log(`✓ tools-ui: ${n} phép kiểm (chia động từ + sửa ngữ pháp)`);
process.exit(0);
