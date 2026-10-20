// Mini-quiz cuối bài blog (web/blog/quiz.js): ngân sách, chấm điểm, a11y, sự kiện /api/hit, URL CTA, dữ liệu quiz trong bài.
import fs from 'node:fs';
import zlib from 'node:zlib';
import { JSDOM } from 'jsdom';
import { loadPosts } from '../lib/blog-content.mjs';

let n = 0, fails = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.error('✗', m); } };

const code = fs.readFileSync('web/blog/quiz.js', 'utf8');
const gz = zlib.gzipSync(code).length;
ok(gz < 5120, `quiz.js ≤ 5 KB gz (${gz} B)`);

const quiz = { items: [
  { q: 'What is the past simple form of go?', options: ['went', 'gone', 'going', 'goes'], answer: 0, explain: "'Went' is the past simple of 'go'." },
  { q: 'She has lived here _____ 2020.', options: ['for', 'since', 'during', 'at'], answer: 1, explain: "'Since' + a point in time." },
  { q: 'bad item', options: ['x'], answer: 3 },
], cta: { url: '/app/#/grammar' } };
const run = (lang, dir, q, app = '/app/') => {
  const dom = new JSDOM(`<!doctype html><html lang="${lang}" dir="${dir}"><head></head><body><section class="blog-quiz" data-lang="${lang}" data-app="${app}"><details>fallback</details></section></body></html>`, { runScripts: 'outside-only', url: `https://lexkite.com/${lang}/blog/x/` });
  const hits = [];
  dom.window.navigator.sendBeacon = (u, b) => { hits.push({ u, b: JSON.parse(b) }); return true; };
  dom.window.document.querySelector('.blog-quiz').dataset.quiz = JSON.stringify(q);
  dom.window.eval(code);
  if (dom.window.document.readyState === 'loading') dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));
  return { doc: dom.window.document, hits };
};

const { doc, hits } = run('vi', 'ltr', quiz);
const c = doc.querySelector('.blog-quiz');
ok(!c.querySelector('details'), 'bản tương tác thay khối đáp án tĩnh');
ok(c.querySelector('.bq-title').textContent.includes('Kiểm tra nhanh'), 'tiêu đề theo ngôn ngữ bài');
ok(c.querySelector('.bq-prog').textContent === 'Câu 1/2', 'bỏ câu dữ liệu hỏng (answer ngoài phạm vi)');
ok(hits.length === 1 && hits[0].u === '/api/hit' && hits[0].b.t === 'q' && hits[0].b.ev === 'quiz_view' && Object.keys(hits[0].b).length === 2, 'quiz_view gửi {t:q, ev} – không kèm đường dẫn/định danh');
ok(c.querySelector('.bq-opts').getAttribute('role') === 'group' && c.querySelector('.bq-opts').getAttribute('aria-labelledby'), 'nhóm đáp án có nhãn là câu hỏi');
ok(c.querySelector('.bq-fb').getAttribute('aria-live') === 'polite', 'phản hồi đọc qua aria-live');
let o = c.querySelectorAll('.bq-opt');
ok(o.length === 4, '4 đáp án');
o[0].click(); o[1].click();
const fb = c.querySelector('.bq-fb');
ok(fb.classList.contains('ok') && fb.textContent.includes('Chính xác') && fb.textContent.includes('Went'), 'đúng → xanh + giải thích');
ok([...o].every(x => x.disabled) && !o[1].classList.contains('no'), 'khóa sau lần chọn đầu');
ok(doc.activeElement === c.querySelector('.bq-btn'), 'chuyển focus tới nút tiếp');
c.querySelector('.bq-btn').click();
ok(doc.activeElement === c.querySelector('.bq-q'), 'câu mới: focus vào câu hỏi');
o = c.querySelectorAll('.bq-opt');
o[0].click();
ok(c.querySelector('.bq-fb').classList.contains('no') && o[1].classList.contains('ok') && o[0].classList.contains('no'), 'sai → đỏ + hiện đáp án đúng');
ok(c.querySelector('.bq-btn').textContent.includes('Xem kết quả'), 'câu cuối: nút xem kết quả');
c.querySelector('.bq-btn').click();
ok(c.querySelector('.bq-score').textContent === '1/2', 'điểm 1/2');
const a = c.querySelector('.bq-cta');
ok(a.getAttribute('href') === '/app/?utm_source=blog&utm_medium=quiz#/grammar', `utm đặt trước # (${a.getAttribute('href')})`);
a.addEventListener('click', e => e.preventDefault()); a.click();
ok(hits.map(h => h.b.ev).join() === 'quiz_view,quiz_done,quiz_cta', 'đủ 3 sự kiện');

const ar = run('ar', 'rtl', [quiz.items[0]], '/app/?hl=ar');
ok(ar.doc.querySelector('.bq-title').textContent.includes('اختبار سريع') && ar.doc.querySelector('.bq-btn').textContent.includes('←'), 'ar: chữ Ả Rập + mũi tên RTL');
ar.doc.querySelector('.bq-opt').click(); ar.doc.querySelector('.bq-btn').click();
ok(ar.doc.querySelector('.bq-cta').getAttribute('href') === '/app/?hl=ar&utm_source=blog&utm_medium=quiz', 'CTA mặc định giữ ?hl=');
const evil = run('en', 'ltr', { items: [quiz.items[0]], cta: { url: 'javascript:alert(1)', text: '<img src=x onerror=1>' } });
evil.doc.querySelector('.bq-opt').click(); evil.doc.querySelector('.bq-btn').click();
ok(evil.doc.querySelector('.bq-cta').getAttribute('href').startsWith('/app/') && !evil.doc.querySelector('.bq-cta img'), 'CTA lạ bị thay, chữ được esc');
ok(/\.blog-quiz\{--qok[^}]*\}@media \(prefers-color-scheme:dark\)/.test(evil.doc.getElementById('lk-qz-css').textContent), 'có màu riêng cho chế độ tối');

// Dữ liệu quiz trong mọi bài: đúng cấu trúc, đáp án duy nhất
for (const p of loadPosts().filter(p => p.quiz)) {
  const items = Array.isArray(p.quiz) ? p.quiz : p.quiz.items || [];
  ok(items.length >= 2 && items.length <= 5, `${p.lang}/${p.slug}: 2–5 câu`);
  items.forEach((q, i) => {
    ok(q.q && Array.isArray(q.options) && q.options.length >= 2 && Number.isInteger(q.answer) && q.answer >= 0 && q.answer < q.options.length, `${p.lang}/${p.slug} câu ${i + 1}: cấu trúc/answer`);
    ok(new Set(q.options.map(x => String(x).trim().toLowerCase())).size === q.options.length, `${p.lang}/${p.slug} câu ${i + 1}: đáp án trùng`);
    ok(q.explain && q.explain.length >= 20, `${p.lang}/${p.slug} câu ${i + 1}: thiếu giải thích`);
  });
}

console.log(fails ? `✗ quiz: ${fails}/${n} lỗi` : `✓ quiz: ${n} kiểm tra đạt (${gz} B gz, chấm điểm, a11y, RTL, sự kiện ẩn danh, CTA an toàn, dữ liệu bài)`);
process.exit(fails ? 1 : 0);
