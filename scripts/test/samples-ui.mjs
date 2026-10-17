// Kiểm cấu trúc giao diện họ trang "bài mẫu" (scripts/lib/samples-ui.mjs + build-samples*.mjs):
// 1) đơn vị: parseDoc tách vai trò đoạn/câu, cụm từ có nghĩa (vi) / không nghĩa (en), chữ giao diện đủ 2 ngôn ngữ;
// 2) HTML đã dựng (nếu dist/ mới hơn bộ dựng): trang bài mẫu + mục lục vi/en có đủ khối mới, canonical/hreflang/JSON-LD giữ nguyên.
import fs from 'node:fs';
import { S, parseDoc, docStats, docHtml, sideHtml, phraseCards, pager2, typeFilter, SMP_CSS, SMP_JS } from '../lib/samples-ui.mjs';
let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.error('✗ ' + m); } };

// ---- 1. đơn vị ----
const T = '<<Mở bài>> [[In recent years|Trong những năm gần đây]], people argue. {{However}}, I disagree.\n\n<<Thân bài 1>> <<Câu chủ đề>> First point. <<Ví dụ>> {{For example}}, x.\n\n<<Kết bài>> {{In conclusion}}, done.';
const vi = parseDoc(T, 'vi'), en = parseDoc(T, 'en');
ok(vi.length === 3 && vi.map(p => p.role).join() === 'intro,body,concl', 'parseDoc: vai trò đoạn intro/body/concl');
ok(vi[0].label === 'Mở bài' && en[0].label === 'Introduction' && en[1].label === 'Body paragraph 1' && en[2].label === 'Conclusion', 'parseDoc: nhãn đoạn vi/en');
ok(/class="lb lb-ts">Câu chủ đề</.test(vi[1].html) && /class="lb lb-ts">Topic sentence</.test(en[1].html) && /lb-ex">Example</.test(en[1].html), 'parseDoc: nhãn vai trò câu vi/en');
ok(/<mark class="ph" tabindex="0" data-g="Trong những năm gần đây"/.test(vi[0].html), 'vi: cụm từ chạm xem nghĩa (data-g, tabindex)');
ok(/<mark class="ph">In recent years<\/mark>/.test(en[0].html) && !/data-g|Trong/.test(en.map(p => p.html).join('')), 'en: không lộ nghĩa tiếng Việt');
ok(!/[<]{2}|\[\[|\{\{/.test(vi.map(p => p.html).join('')), 'parseDoc: không sót cú pháp chú thích thô');
ok(docStats(T).phrases === 1 && docStats(T).links === 3, 'docStats: đếm cụm từ / từ nối');
const d = docHtml(vi, 'vi'), s = sideHtml(vi, 'vi');
ok((d.match(/<section class="para r-/g) || []).length === 3 && /id="d3"/.test(d) && /Đoạn 3\/3/.test(d), 'docHtml: thẻ đoạn + id + số thứ tự');
ok(/href="#d1"/.test(s) && /data-cls="gl-on"/.test(s) && /data-print/.test(s) && !/data-cls="gl-on"/.test(sideHtml(en, 'en')), 'sideHtml: dàn bài + nút (nút nghĩa chỉ ở vi)');
ok(/<ol class="phr">/.test(phraseCards([['a', 'b']])) && /rel="prev"/.test(pager2(['/x', 'X'], ['/y', 'Y'], 'en')) && /data-g="g-t0"/.test(typeFilter([['t0', 'A', 2, 't-ad']], 2, 'vi')), 'thẻ cụm từ / bài trước-sau / chip lọc');
for (const k of Object.keys(S.vi)) ok(k in S.en, `S.en thiếu khóa "${k}"`);
for (const k of Object.keys(S.en)) ok(k in S.vi, `S.vi thiếu khóa "${k}"`);
ok(/prefers-color-scheme:dark/.test(SMP_CSS) && /@media print/.test(SMP_CSS) && /prefers-reduced-motion/.test(SMP_CSS), 'CSS: chế độ tối + in + giảm chuyển động');
ok(SMP_JS.length < 2500, `JS nhỏ (${SMP_JS.length} B < 2.5 KB)`);

// ---- 2. HTML đã dựng ----
const src = ['scripts/lib/samples-ui.mjs', 'scripts/build-samples.mjs', 'scripts/build-samples-en.mjs'].map(f => fs.statSync(f).mtimeMs);
const fresh = f => fs.existsSync(f) && fs.statSync(f).mtimeMs >= Math.max(...src);
const P = { vi: 'dist/samples/p5.html', en: 'dist/en/samples/p5.html', viIdx: 'dist/samples/index.html', enIdx: 'dist/en/samples/index.html', sp: 'dist/speaking/hoc-tap.html', lt: 'dist/viet-thu/gt1.html' };
if (Object.values(P).every(fresh)) {
  const h = Object.fromEntries(Object.entries(P).map(([k, f]) => [k, fs.readFileSync(f, 'utf8')]));
  for (const k of ['vi', 'en', 'lt']) {
    ok(/<article class="page smp smp-doc/.test(h[k]) && /class="ess-side"/.test(h[k]) && /class="side-box outline"/.test(h[k]) && /class="side-box legend"/.test(h[k]), `${k}: cột dàn bài + chú thích màu`);
    ok((h[k].match(/<section class="para r-/g) || []).length >= 4, `${k}: thẻ đoạn có vai trò`);
    ok(/<ul class="stats">/.test(h[k]) && /class="band"/.test(h[k]) && /class="prompt/.test(h[k]) && /<ol class="phr">/.test(h[k]) && /class="save"/.test(h[k]) && /class="cta2"/.test(h[k]), `${k}: số liệu, đề bài, thẻ cụm từ, lưu cụm, CTA`);
    ok(/<nav class="pg2"/.test(h[k]) && /id="glp"/.test(h[k]) && /<style>\.smp\{/.test(h[k]), `${k}: bài trước/sau + popover + CSS riêng`);
    ok(/<link rel="canonical"/.test(h[k]) && /"@type":"LearningResource"[^<]*"learningResourceType"/.test(h[k]) && /"@type":"BreadcrumbList"/.test(h[k]), `${k}: canonical + JSON-LD (LearningResource mở rộng + Breadcrumb)`);
    ok(/<svg[^>]*aria-hidden="true"/.test(h[k]), `${k}: Kit từ kit.js, trang trí (aria-hidden; màu cũ do brand-check chặn)`);
  }
  ok(/data-g="/.test(h.vi) && !/data-g="[^"]/.test(h.en.split('<main')[1]), 'nghĩa tiếng Việt chỉ ở bản vi');
  for (const k of ['vi', 'en']) ok(/hreflang="vi"/.test(h[k]) && /hreflang="en"/.test(h[k]) && /hreflang="x-default"/.test(h[k]), `${k}: hreflang vi/en/x-default`);
  ok(/Kết bài/.test(h.vi) && /Conclusion/.test(h.en) && !/Kết bài|Mở bài|Thân bài/.test(h.en), 'nhãn đoạn đúng ngôn ngữ (en không lộ tiếng Việt)');
  for (const k of ['viIdx', 'enIdx']) {
    ok(/<nav class="tf"/.test(h[k]) && (h[k].match(/class="card set sc t-/g) || []).length >= 80 && /"@type":"ItemList"/.test(h[k]) && /id="q"/.test(h[k]), `${k}: chip lọc dạng đề, ≥ 80 thẻ có màu, ItemList, ô lọc`);
  }
  ok(/id="part-2"/.test(h.sp) && /class="q cue"/.test(h.sp) && /class="qa"/.test(h.sp) && /<ul class="vch">/.test(h.sp) && /<nav class="pg2"/.test(h.sp), 'speaking: phần thi, cue card, Q&A, từ vựng, chủ đề trước/sau');
  ok(/class="ess2 letter"/.test(h.lt), 'thư mẫu: giao diện giấy viết thư');
  console.log(`✓ samples-ui: HTML đã dựng (${Object.keys(P).length} trang mẫu) đạt`);
} else console.log('• samples-ui: dist/ cũ hơn bộ dựng – bỏ qua kiểm HTML (chạy build-samples*.mjs trước)');
if (fail) { console.error(`✗ samples-ui: ${fail} lỗi`); process.exit(1); }
console.log('✓ samples-ui: cấu trúc giao diện bài mẫu đạt');
