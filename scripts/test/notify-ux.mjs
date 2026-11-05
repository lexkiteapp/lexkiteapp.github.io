// 🔔 Chuẩn thông báo (docs/specs/notifications.md) – chạy: node scripts/test/notify-ux.mjs
// (1) Giọng lời nhắc: mọi mẫu (web/js/remind.js TPL) ở 15 ngôn ngữ + câu FCM (workers/push/copy.json) KHÔNG dọa mất chuỗi / trách móc / gấp gáp,
//     tiêu đề ≤ 60 ký tự, thân ≤ 110 ký tự (không bị hệ điều hành cắt), đủ biến {n}/{s}/{w}… như bản gốc.
// (2) Toast (web/js/ui.js, jsdom): MỘT toast mỗi lúc, tự ẩn, không chặn chạm (trừ nút hành động), cùng câu không nháy/xả hàng loạt,
//     nút hành động chạy đúng 1 lần rồi ẩn, giữ khi con trỏ/focus ở trên, xếp hàng khi hộp thoại mở; aria-live; CSS reduced-motion + safe-area.
import fs from 'node:fs';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';

let fail = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fail++; console.error('✗ ' + m); } };
const rd = f => fs.readFileSync(f, 'utf8');
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ---------- (1) Giọng lời nhắc ----------
const src = rd('web/js/remind.js');
const TPL = vm.runInNewContext('(' + src.match(/const TPL = (\{[\s\S]*?\n {2}\});/)[1] + ')');
const pairs = Object.values(TPL).flat().map(([id, a, b]) => ({ id, a, b }));
ok(pairs.length >= 15, `đọc được ${pairs.length} mẫu nhắc`);
const LANGS = fs.readFileSync('scripts/i18n-langs.txt', 'utf8').split('\n').map(x => x.replace(/#.*/, '').trim()).filter(Boolean);
const dict = l => { const g = { I18N_DICT: {} }; g.self = g; const f = l === 'en' ? 'web/js/i18n/en/remind.js' : `i18n/ui/${l}/remind.js`; vm.runInNewContext(rd(f), g); return g.I18N_DICT[l] || {}; };
// Từ/cụm dọa mất, trách móc, gấp gáp (Duolingo-kiểu "streak at risk") – chuẩn Headspace/Apple: khích lệ, cho quyền chủ động
const BAD = {
  vi: /gặp nguy|đừng để|sắp mất|mất chuỗi|sắp quên|quên mất|thất vọng|buồn lắm|nhanh lên|kẻo|cơ hội cuối|lời nhắc cuối|nhớ bạn lắm/i,
  en: /at risk|don'?t let|lose|losing|lost|slip away|forget|disappoint|sad\b|hurry|last chance|before it'?s too late|or else|last reminder|misses you/i, // 05/11: lời cuối ngày 14 "Kit nhớ bạn… lời nhắc cuối cùng" (trách nhẹ) → "Kit tạm ngừng nhắc"
  es: /peligro|perder|olvid/i, pt: /risco|perder|esquec/i, fr: /danger|perdre|oubli/i, de: /gefahr|verlier|vergess/i,
  id: /bahaya|hilang|lupa/i, ru: /угроз|потеря|забуд/i, tr: /tehlike|kaybet|unut/i,
};
const vars = s => (s.match(/\{\w+\}/g) || []).sort().join();
for (const l of ['vi', 'en', ...LANGS.filter(x => x !== 'vi' && x !== 'en')]) {
  const D = l === 'vi' ? null : dict(l);
  for (const { id, a, b } of pairs) for (const [k, max] of [[a, 60], [b, 110]]) {
    const s = D ? D[k] : k;
    if (D) ok(typeof s === 'string' && s.trim(), `${l}: thiếu bản dịch mẫu ${id}: “${k}”`);
    if (typeof s !== 'string') continue;
    if (BAD[l]) ok(!BAD[l].test(s), `${l}: mẫu ${id} giọng dọa/trách: “${s}”`);
    ok([...s].length <= max, `${l}: mẫu ${id} dài ${[...s].length} > ${max} (bị cắt trên màn khóa): “${s}”`);
    ok(vars(s) === vars(k), `${l}: mẫu ${id} sai biến ${vars(s)} ≠ ${vars(k)}`);
  }
}
const copy = JSON.parse(rd('workers/push/copy.json'));
for (const [l, o] of Object.entries(copy)) for (const [k, v] of Object.entries(o)) for (const s of [].concat(v)) if (BAD[l]) ok(!BAD[l].test(s), `FCM ${l}.${k} giọng dọa/trách: “${s}”`);

// ---------- (2) Toast ----------
const dom = new JSDOM(`<!DOCTYPE html><html><body><main id="view"><a class="btn" href="#">x</a></main>
  <div class="toast" id="toast" role="status" aria-live="polite"></div><div class="modal" id="modal" hidden><div id="modalBox"></div></div></body></html>`,
{ url: 'https://lexkite.com/app/#/home', runScripts: 'outside-only', pretendToBeVisual: true });
const w = dom.window, d = w.document;
w.matchMedia = q => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {} });
w.t = k => k; w.I18N = { lang: () => 'vi' };
try { w.eval(rd('web/js/ui.js')); } catch (e) { /* phần khác của ui.js cần API trình duyệt */ }
const UI = w.UI, T = d.getElementById('toast');
ok(UI && typeof UI.toast === 'function', 'ui.js: dựng được UI.toast trong jsdom');
if (UI && UI.toast) {
  ok(T.getAttribute('aria-live') === 'polite' && T.getAttribute('role') === 'status', 'toast: role=status + aria-live=polite');
  UI.toast('Một', 300); ok(T.classList.contains('show') && T.textContent === 'Một' && !T.classList.contains('act'), 'toast: hiện, không nhận chạm khi không có nút');
  UI.toast('Hai', 300); ok(T.textContent === 'Hai' && d.querySelectorAll('.toast.show').length === 1, 'toast: câu mới thay câu cũ – chỉ một toast mỗi lúc');
  const t0 = T._at; await sleep(20); UI.toast('Hai', 300); ok(T._at === t0, 'toast: cùng câu đang hiện → chỉ gia hạn, không nháy lại');
  await sleep(2300); ok(!T.classList.contains('show'), 'toast: tự ẩn (thời gian đọc theo độ dài)');
  UI.toast('Hai', 300); ok(!T.classList.contains('show'), 'toast: cùng câu vừa ẩn < 3 s → bỏ (mạng chập chờn không xả hàng loạt)');
  let hit = 0; UI.toast('Không tải được', { action: 'Thử lại', onAction: () => hit++ });
  const b = T.querySelector('button.toast-act');
  ok(b && b.textContent === 'Thử lại' && T.classList.contains('act'), 'toast: có nút hành động → nhận chạm (.act)');
  ok(T.textContent.startsWith('Không tải được'), 'toast: nút nằm sau lời báo');
  T.dispatchEvent(new w.Event('pointerenter')); await sleep(6200); ok(T.classList.contains('show'), 'toast có nút: con trỏ ở trên → không tự ẩn');
  T.dispatchEvent(new w.Event('pointerleave'));
  b.click(); b.click(); ok(hit === 1 && !T.classList.contains('show') && !T.classList.contains('act'), 'toast: bấm nút → chạy đúng 1 lần rồi ẩn');
  d.getElementById('modal').hidden = false; UI.toast('Sau hộp thoại', 300); ok(!T.classList.contains('show'), 'toast: hộp thoại mở → xếp hàng, không đè');
  d.getElementById('modal').hidden = true; await sleep(400); ok(T.textContent === 'Sau hộp thoại' && T.classList.contains('show'), 'toast: đóng hộp thoại → hiện hàng chờ');
}
const css = rd('web/css/style.css');
ok(/\.toast\s*\{[^}]*pointer-events:\s*none[^}]*safe-area-inset-bottom|\.toast\s*\{[^}]*safe-area-inset-bottom[^}]*pointer-events:\s*none/.test(css), 'CSS: toast tính safe-area + không chặn chạm');
ok(/\.toast-act\s*\{[^}]*min-height:\s*44px/.test(css), 'CSS: nút toast ≥ 44 px (Apple HIG)');
ok(/prefers-reduced-motion:\s*reduce\)\s*\{\s*\*,[^}]*transition:\s*none/.test(css), 'CSS: prefers-reduced-motion tắt chuyển động toàn cục');

console.log(fail ? `✗ notify-ux: ${fail}/${n} lỗi` : `✓ notify-ux: ${n} kiểm`);
process.exit(fail ? 1 : 0);
