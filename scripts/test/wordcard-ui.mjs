// Test giao diện (jsdom) cho THẺ TỪ MỚI: mặt sau thẻ ôn tập (✨ TỪ MỚI · chấm FSRS), khối 🧠 Hiểu sâu dùng chung (web/js/wordcard.js), từ điển.
// Kiểm: thẻ cao theo nội dung (không khung cố định + overflow cắt chữ), thanh chấm dính đáy, cặp ✕ sai / ✓ đúng tách đúng,
// chip cụm từ/đồng nghĩa/họ từ (chạm = nghe, chạm lần 2 = tra tại chỗ), 4 mục Hiểu sâu + nhớ mục đang mở (Store),
// nút chấm có tên trợ năng + phím tắt 1–4. Chạy: node scripts/test/wordcard-ui.mjs
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
w.scrollTo = () => {}; w.HTMLElement.prototype.scrollIntoView = () => {}; w.matchMedia = () => ({ matches: false, addEventListener() {} });
w.CSS = { escape: s => s };
const NOTE = { curriculum: JSON.parse(fs.readFileSync(path.join(WEB, 'js/notes/c.json'), 'utf8')).curriculum };
w.fetch = async url => /js\/notes\/c\.json/.test(String(url)) ? { ok: true, status: 200, json: async () => NOTE, text: async () => JSON.stringify(NOTE) } : { ok: false, status: 404, json: async () => ({}), text: async () => '' };
for (const f of scripts) { try { w.eval(fs.readFileSync(path.join(WEB, f), 'utf8')); } catch (e) { errors.push(f + ': ' + e.message); } }
require('./lazyfix.js')(w, fs, path, WEB, errors);
const tick = (ms = 40) => new Promise(r => setTimeout(r, ms));
const $ = (s, r = w.document) => r.querySelector(s), $$ = (s, r = w.document) => [...r.querySelectorAll(s)];
const go = async (h, ms = 150) => { w.location.hash = h; await tick(ms); };
const txt = s => ($(s) || {}).textContent || '';
const click = el => el && el.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true }));
const until = async (f, ms = 3000) => { const t0 = Date.now(); while (!f() && Date.now() - t0 < ms) await tick(30); return f(); };
const said = []; w.UI.speak = (...a) => { said.push(a[0]); }; // app.js giữ tham chiếu speak lúc nạp → chặn ở tầng TTS
if (w.speechSynthesis) w.speechSynthesis.speak = u => said.push(u.text); else w.speechSynthesis = { speak: u => said.push(u.text), cancel() {}, getVoices: () => [], pause() {}, resume() {} };
w.SpeechSynthesisUtterance = w.SpeechSynthesisUtterance || function (t) { this.text = t; };
w.Audio = function () { return { play: async () => { said.push('audio'); }, pause() {}, addEventListener() {} }; };

await tick(300); await go('#/welcome/setup'); if ($('#go')) $('#go').click(); await tick(1500);
ok(w.WordCard && typeof w.WordCard.parseErrors === 'function', 'nạp module wordcard (bundle lười)');

// ===== Bộ tách dữ liệu =====
const P = w.WordCard.parseErrors(NOTE.curriculum.e);
ok(P.pairs.length === 2 && P.pairs[0].wrong === 'the curriculums of school' && P.pairs[0].right === 'the school curricula/curriculums' && P.pairs[1].right === 'add skills to the curriculum', 'tách 2 cặp Sai → Đúng của “curriculum”');
const P2 = w.WordCard.parseErrors('Sai: How much does it costs? → Đúng: How much does it cost? Sai: It costed → Đúng: It cost.');
ok(P2.pairs.length === 2 && P2.pairs[0].right === 'How much does it cost?' && P2.pairs[1].right === 'It cost', 'câu hỏi (?) không làm dính 2 cặp');
const P3 = w.WordCard.parseErrors('Sai: I appreciate for your help → Đúng: I appreciate your help (không dùng for; chủ ngữ là người). Nhấn âm 2.');
ok(P3.pairs.length === 1 && P3.pairs[0].right === 'I appreciate your help' && /không dùng for/.test(P3.pairs[0].rn) && P3.notes[0] === 'Nhấn âm 2.', 'ghi chú trong ngoặc tách riêng, câu giải thích thành ghi chú');
ok(w.WordCard.parseErrors('Wrong: an information → Correct: a piece of information.').pairs[0].right === 'a piece of information', 'nhãn tiếng Anh Wrong/Correct');
const P4 = w.WordCard.parseErrors('Đừng nhầm complex với complicated.');
ok(!P4.pairs.length && P4.notes[0] === 'Đừng nhầm complex với complicated.', 'không có mẫu sai/đúng → giữ nguyên văn bản');
const F = w.WordCard.parseFamily(NOTE.curriculum.f, 'curriculum');
ok(F.length === 3 && F[0].w === 'curricula' && F[0].pos === 'pl' && F[1].pos === 'adj', 'họ từ: curricula (pl), curricular (adj), bỏ chính từ gốc');
ok(w.WordCard.parseFamily('areas (n, số nhiều)', 'area')[0].pos === 'n, số nhiều', 'dấu phẩy trong ngoặc không tách');
const U = w.WordCard.parseUsage(NOTE.curriculum.u);
ok(U.length === 2 && U[0].tag === 'Writing Task 2' && U[1].tag === 'Speaking Part 3', 'dùng khi thi: tách mốc Writing Task 2 / Speaking Part 3');

// ===== Thẻ ôn tập: từ mới “curriculum” =====
await w.App.addWord(w.IELTS_DATA.INDEX.curriculum, null, { silent: true });
await go('#/review', 400);
ok(/TỪ MỚI/.test(txt('.study-wrap')), 'thẻ hiện nhãn ✨ TỪ MỚI');
const flash = $('#flash'), back = $('.face.back');
ok(flash && back, 'có thẻ lật');
ok($('#actions.grade-bar'), 'vùng nút có lớp grade-bar');
click($('#flipBtn')); await tick(80);
ok(flash.classList.contains('flipped'), 'bấm Lật thẻ → lật');
const cs = el => w.getComputedStyle(el);
ok(cs(back).position === 'relative' && cs(back).overflow !== 'hidden' && cs(back).overflow !== 'auto', 'mặt sau nằm trong luồng, không cuộn/cắt trong thẻ (position ' + cs(back).position + ', overflow ' + cs(back).overflow + ')');
const clip = []; for (let el = back; el && el !== w.document.body; el = el.parentElement) { const s = cs(el); if (/hidden|auto|scroll|clip/.test(s.overflow + s.overflowY) && (/px|vh|%/.test(s.height) || (s.maxHeight && s.maxHeight !== 'none'))) clip.push(el.className || el.id); }
ok(!clip.length, 'không có khung cao cố định + overflow cắt chữ quanh mặt sau: ' + clip.join(', '));
ok(cs($('#actions')).position === 'sticky' && cs($('#actions')).bottom === '0px', 'thanh chấm điểm dính đáy (sticky)');
ok(back.compareDocumentPosition($('#actions')) & w.Node.DOCUMENT_POSITION_FOLLOWING, 'thanh chấm nằm sau thẻ trong luồng → không che nội dung');

// Phần cốt lõi
ok(txt('.back .wc-word') === 'curriculum' && /n/.test(txt('.back .wi-pron')) && /B2/.test(txt('.back .wi-pron')) && /kəˈrɪkjələm/.test(txt('.back .wi-pron')), 'đầu thẻ: từ + từ loại + CEFR + IPA');
ok($('.back [data-say][aria-label]'), 'nút nghe có nhãn trợ năng');
ok(txt('.back .wi-vi').trim().length > 3, 'nghĩa hiện ngay dưới từ: ' + txt('.back .wi-vi'));
ok(/subjects included in a course/.test(txt('.back')), 'định nghĩa tiếng Anh');
ok($('.back .wi-ex mark') && $('.back .wi-ex [data-speak-text]'), 'ví dụ có tô từ + nút nghe câu');

// Chip cụm từ & đồng nghĩa
const chips = $$('.back .wc-chip').map(b => b.textContent.trim());
ok(chips.includes('national curriculum') && chips.includes('broaden the curriculum') && chips.includes('syllabus') && chips.includes('programme'), 'cụm từ & đồng nghĩa là chip: ' + chips.join(' | '));
ok($$('.back .wc-chip').every(b => b.tagName === 'BUTTON' && b.type === 'button'), 'chip là nút bấm được (bàn phím)');
said.length = 0; const ch = $$('.back .wc-chip').find(b => b.textContent.trim() === 'national curriculum');
click(ch); await tick(60);
ok(!flash.classList.contains('fly') && flash.classList.contains('flipped'), 'bấm chip không lật/chấm thẻ');
click(ch); await tick(60);
const pop = $('.sel-pop');
ok(pop && !pop.hidden && /national curriculum/.test(pop.textContent), 'chạm chip lần 2 → bảng tra nghĩa tại chỗ (không rời phiên học)');
if (pop) pop.hidden = true;

// Khối Hiểu sâu
await until(() => $('.back .wc'));
const wc = $('.back .wc');
ok(wc && wc.getAttribute('aria-label'), 'khối Hiểu sâu hiện, có aria-label');
ok(['m', 'e', 'u', 'f'].every(k => $(`.back details[data-wc="${k}"] summary`)), '4 mục: Mẹo nhớ · Lỗi hay gặp · Dùng khi thi · Họ từ');
ok(/Mẹo nhớ/.test(txt('.back [data-wc=m] summary')) && /Lỗi hay gặp/.test(txt('.back [data-wc=e] summary')) && /Dùng khi thi/.test(txt('.back [data-wc=u] summary')) && /Họ từ/.test(txt('.back [data-wc=f] summary')), 'nhãn các mục');
ok($('.back [data-wc=m]').open && !$('.back [data-wc=e]').open, 'mặc định chỉ mở Mẹo nhớ (gọn)');
const pairs = $$('.back .wc-pair');
ok(pairs.length === 2, '2 cặp sai/đúng, mỗi cặp 1 hàng');
ok(pairs[0] && $('.wc-wrong s', pairs[0]).textContent === 'the curriculums of school' && $('.wc-right b', pairs[0]).textContent === 'the school curricula/curriculums', 'cặp 1: ✕ gạch ngang · ✓ in đậm');
ok(pairs[0] && /Sai/.test(txt('.back .wc-wrong .sr-only')) && /Đúng/.test(txt('.back .wc-right .sr-only')), 'trình đọc màn hình nghe “Sai:” / “Đúng:”');
ok(!/→/.test(txt('.back .wc-pairs')), 'không còn chuỗi “Sai: … → Đúng: …” thô');
const fam = $$('.back [data-wc=f] .wc-chip');
ok(fam.length === 3 && /curricula/.test(fam[0].textContent) && $('.wc-pos', fam[0]).textContent === 'pl' && $('.wc-pos', fam[1]).textContent === 'adj', 'họ từ: chip + nhãn từ loại');
ok($$('.back [data-wc=u] .wc-tag').length === 2 && $('.back [data-wc=u] q'), 'dùng khi thi: thẻ mốc thi + câu mẫu nổi bật');
// Nhớ trạng thái mở (Store)
const de = $('.back [data-wc=e]'); de.open = true; de.dispatchEvent(new w.Event('toggle')); await tick(350);
const saved = await w.Core.Store.get('wcOpen');
ok(Array.isArray(saved) && saved.includes('e') && saved.includes('m'), 'nhớ mục đang mở vào Store: ' + JSON.stringify(saved));

// Nút chấm FSRS
const gb = $$('[data-grade]');
ok(gb.length === 4, '4 nút chấm');
ok(gb.every((b, i) => b.getAttribute('aria-keyshortcuts') === String(i + 1) && (b.getAttribute('aria-label') || '').startsWith(['Quên', 'Khó', 'Nhớ', 'Dễ'][i])), 'tên trợ năng Quên/Khó/Nhớ/Dễ + phím tắt 1–4');
ok(gb.every(b => $('small', b) && $('small', b).textContent.trim()), 'giữ khoảng ôn lại (1 phút / … ngày)');
ok(gb.every(b => $('.g-k', b) && $('.g-k', b).getAttribute('aria-hidden') === 'true'), 'nhãn phím 1–4 trên nút (ẩn với trình đọc màn hình)');
ok($('.grades[role=group][aria-label]'), 'nhóm nút có nhãn');
ok(/min-height:\s*56px/.test(css.match(/\.grades \.btn \{[^}]*\}/)[0]), 'nút chấm cao ≥ 48 px (56 px)');
ok(!/\.g-easy[^{]*\{[^}]*--easy/.test(css), 'nút Dễ không còn màu xanh dương lệch thương hiệu');
w.document.body.dispatchEvent(new w.KeyboardEvent('keydown', { key: '3', bubbles: true, cancelable: true })); await tick(400);
ok(!$('#flash') || !$('#flash').classList.contains('flipped') || $('.fly'), 'phím 3 chấm “Nhớ” → sang thẻ/kết thúc');
const c2 = w.App.state.cards.curriculum;
ok(c2 && c2.srs && c2.srs.last, 'FSRS đã ghi lần chấm: ' + JSON.stringify(c2 && c2.srs));

// ===== Từ điển: cùng khối chip + Hiểu sâu =====
await go('#/dict/curriculum', 600);
await until(() => $('#result .wc'), 2500);
ok($$('#result .wc-chip').some(b => b.textContent.trim() === 'national curriculum'), 'từ điển: cụm từ là chip');
ok($('#result .wc .wc-pair'), 'từ điển: dùng chung khối Hiểu sâu (cặp sai/đúng)');

const real = errors.filter(e => !/Not implemented|navigation|Could not parse CSS/.test(e));
ok(!real.length, 'không lỗi JS: ' + real.slice(0, 3).join(' | '));
// CSS: khối Hiểu sâu đang chờ dịch phải ẩn – .wn.wc không được ghi đè .wn.wn-tr (lỗi 17/10: lộ tiếng Việt trên add-on ja/en/ar)
{ const css = fs.readFileSync(new URL('../../web/css/wordcard.css', import.meta.url), 'utf8');
  ok(/\.wn\.wc\.wn-tr\s*\{\s*display:\s*none/.test(css), 'CSS: .wn.wc.wn-tr { display: none } (chờ dịch thì ẩn)'); }

if (fails) { console.log(`✗ wordcard-ui: ${fails}/${n} lỗi`); process.exit(1); }
console.log(`✓ wordcard-ui: ${n} phép kiểm (thẻ từ mới · Hiểu sâu · chip · nút chấm FSRS)`);
process.exit(0);
