// Bảng "Bạn đang luyện kỳ thi nào?" (TLPick.exam, web/cpack/tl-app/tl-pick.js): MÃ THẬT target.js + tl-pick.js trong jsdom.
// Kiểm: ngôn ngữ đứng TRƯỚC kỳ thi · kỳ thi lọc theo ngôn ngữ (en: 4 kỳ + mục tiêu giao tiếp; es: DELE/SIELE, không IELTS) · đúng MỘT radio đang chọn trong toàn bảng ·
// kỳ thi chưa có nội dung = "Sắp ra mắt" (không chọn được) · tay nắm, nút đóng, "Xong" · Xong áp dụng (kỳ thi / ngôn ngữ).  Chạy: node scripts/test/exam-sheet.mjs
import fs from 'node:fs'; import { JSDOM } from 'jsdom';
let n = 0, fails = 0; const ok = (c, m) => { n++; if (!c) { fails++; console.log('✗', m); } };
const rd = f => fs.readFileSync(f, 'utf8'), tick = () => new Promise(r => setTimeout(r, 20));
function mk(cfg = {}, exam = 'ielts') {
  const dom = new JSDOM('<!doctype html><body><div id="modal" hidden><div id="modalBox"></div></div><main id="view"></main></body>', { url: 'https://x.test/#/home', runScripts: 'outside-only' });
  const w = dom.window; w.self = w; w.localStorage.setItem('lk.cfg', JSON.stringify({ v: cfg }));
  w.t = (k, v) => String(k).replace(/\{(\w+)\}/g, (_, x) => (v && v[x] != null ? v[x] : '{' + x + '}'));
  const calls = []; w.UI = { esc: s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])),
    modal(html, o) { const m = w.document.getElementById('modal'); w.document.getElementById('modalBox').innerHTML = html; m.dataset.v = (o && o.v) || ''; m.hidden = false; return w.document.getElementById('modalBox'); },
    closeModal() { w.document.getElementById('modal').hidden = true; }, toast() {} };
  w.Core = { Cards: { all: async () => ({}) } };
  let ex = exam; w.App = { EXAMS: { ielts: { name: 'IELTS Academic' }, ieltsgt: { name: 'IELTS General Training' }, toeic: { name: 'TOEIC Listening & Reading' }, toefl: { name: 'TOEFL iBT' }, general: { name: 'Everyday English' } }, exam: () => ex, setExam: async e => { ex = e; calls.push(e); } };
  w.eval(rd('web/js/target.js')); w.eval(rd('web/cpack/tl-app/tl-pick.js')); return { w, d: w.document, calls };
}
const checked = d => [...d.querySelectorAll('[role=radio][aria-checked=true]')];
{ const { w, d, calls } = mk({ es_course: true }); await w.TLPick.exam(); await tick();
  const labs = [...d.querySelectorAll('.tlp-lab')].map(x => x.textContent); ok(labs[0] === 'Ngôn ngữ đang học' && labs[1] === 'Kỳ thi', 'ngôn ngữ đứng trước kỳ thi: ' + labs);
  ok(d.querySelector('.tlp-grab') && d.querySelector('[data-close][aria-label]') && d.querySelector('.tlp-top-s #tlpT') && d.getElementById('xpDone'), 'tay nắm, nút đóng, tiêu đề dính, nút Xong');
  ok([...d.querySelectorAll('[data-xex]')].map(x => x.dataset.xex).join() === 'ielts,ieltsgt,toeic,toefl,general', 'en: 4 kỳ thi + giao tiếp');
  ok(labs.includes('Hoặc chỉ học giao tiếp') && !/Tiếng Anh nền tảng/.test(d.getElementById('xpE').nextElementSibling.textContent), 'nền tảng tách khỏi danh sách kỳ thi');
  ok(checked(d).length === 2 && checked(d).some(x => x.dataset.xex === 'ielts') && checked(d).some(x => x.dataset.xtl === 'en'), 'đúng 1 ngôn ngữ + 1 kỳ thi đang chọn');
  ok(![...d.querySelectorAll('.tlp-row')].some(r => r.matches('.on') !== (r.getAttribute('aria-checked') === 'true')), '.on ⇔ aria-checked (một kiểu chọn duy nhất)');
  ok(d.querySelectorAll('.tlp-row.soon').length === 4 && /JLPT|TOPIK|DELF|CELPE/.test(d.querySelector('.tlp-row.soon').textContent), 'ngôn ngữ chưa mở: Sắp ra mắt + tên kỳ thi');
  // chọn TOEIC → chỉ 1 kỳ thi chọn, Xong gọi setExam
  d.querySelector('[data-xex="toeic"]').click(); ok(checked(d).filter(x => x.dataset.xex).length === 1 && d.querySelector('[data-xex="toeic"]').getAttribute('aria-checked') === 'true', 'chọn TOEIC → bỏ IELTS');
  d.querySelector('[data-xex="general"]').click(); ok(d.querySelector('[data-xex="general"]').getAttribute('aria-checked') === 'true' && d.querySelector('[data-xex="toeic"]').getAttribute('aria-checked') === 'false', 'Giao tiếp thay TOEIC (chỉ một mục chọn)');
  d.getElementById('xpDone').click(); await tick(); ok(calls.join() === 'general' && d.getElementById('modal').hidden, 'Xong → setExam(general) + đóng');
}
// đổi sang Español: kỳ thi lọc theo ngôn ngữ (không còn IELTS), Xong → Target.set(es) + về trang chủ khóa
{ const { w, d } = mk({ es_course: true }); await w.TLPick.exam(); await tick();
  d.querySelector('[data-xtl="es"]').click(); await tick();
  ok(!/IELTS|TOEIC|TOEFL/.test(d.getElementById('xpE').nextElementSibling.textContent) && /DELE \/ SIELE/.test(d.getElementById('xpB').textContent) && !d.querySelector('[data-xex="ielts"]'), 'es: chỉ DELE/SIELE, không IELTS');
  ok(!d.querySelector('#xpG') && checked(d).length === 2, 'es: không có mục giao tiếp, vẫn đúng 1 ngôn ngữ + 1 kỳ thi');
  d.getElementById('xpDone').click(); await tick(); ok(w.Target.cur() === 'es' && w.location.hash === '#/practice/esd', 'Xong → Target.set(es) + trang chủ es: ' + w.location.hash);
}
// không đổi gì → Xong chỉ đóng
{ const { w, d, calls } = mk(); await w.TLPick.exam(); await tick(); d.getElementById('xpDone').click(); ok(!calls.length && w.Target.cur() === 'en' && d.getElementById('modal').hidden, 'không đổi → chỉ đóng'); }
console.log(fails ? `✗ exam-sheet: ${fails}/${n} lỗi` : `✓ exam-sheet: ${n}/${n} đạt`); process.exit(fails ? 1 : 0);
