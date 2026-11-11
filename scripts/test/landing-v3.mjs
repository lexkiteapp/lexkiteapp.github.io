// 🎯 Hồi quy landing v3 (Stitch brand/stitch/web/landing-v3 → khung brand/stitch/web/gen/home.js, docs/specs/landing.md) – chạy trên 15 trang đã dựng:
//   đủ nội dung (no-cuts: 6 tính năng, 5 thẻ tài nguyên giữ liên kết SEO, mọi câu FAQ = JSON-LD, 3 bước), giáo viên 2D đúng Chars.idle (poster có width/height → CLS 0,
//   video TẮT TIẾNG, không src/autoplay lúc tải → không tốn băng thông/không tự phát), không chữ lỗi (undefined/khóa Việt ở trang ngôn ngữ khác), gzip ≤ 16 KB,
//   và bộ chuyển giữ được tuỳ chọn unwrap (đầu/chân trang tách ra chrome.js).
import fs from 'node:fs'; import zlib from 'node:zlib';
import { LANGS, fileOf } from '../build-landing.mjs'; import { LANG_NAMES } from '../lib/site-layout.mjs';
let bad = 0; const ok = (c, m) => { if (!c) { bad++; console.error('✗ ' + m); } };
const VI = /[ăđơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i;
const bind = JSON.parse(fs.readFileSync('brand/stitch/web/bind/home.json', 'utf8')), chrome = fs.readFileSync('brand/stitch/web/gen/chrome.js', 'utf8');
ok(bind.unwrap && /header: `<header/.test(chrome) && /footer: `<footer/.test(chrome), 'bộ chuyển: unwrap + đầu/chân trang landing v3 trong chrome.js');
for (const l of LANGS) {
  const f = fileOf(l), html = fs.readFileSync(f, 'utf8'), body = html.slice(html.indexOf('<body'));
  const text = body.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ');
  ok(zlib.gzipSync(html, { level: 9 }).length <= 16 * 1024, `${f}: > 16 KB gzip`);
  ok(!/\bundefined\b|\bNaN\b/.test(text), `${f}: còn chữ undefined/NaN`);
  if (l !== 'vi') ok(!VI.test(Object.values(LANG_NAMES).reduce((t, n) => t.split(n).join(' '), text)), `${f}: lẫn chữ tiếng Việt (khóa dịch chưa có bản ${l})`);
  ok((body.match(/<h3 /g) || []).length >= 6 + 3 + 5, `${f}: thiếu thẻ (6 tính năng + 3 bước + 5 tài nguyên)`);
  const ld = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1].replace(/\\u003c/g, '<'));
  const faq = ld['@graph'].find(x => x['@type'] === 'FAQPage').mainEntity;
  ok((body.match(/<details/g) || []).length === faq.length && /<details[^>]* open/.test(body), `${f}: FAQ <details> ≠ JSON-LD (${faq.length}) hoặc câu đầu chưa mở`);
  for (const u of ['/blog/', 'samples/', 'speaking/']) ok(body.includes(u), `${f}: mất liên kết tài nguyên ${u}`);
  const idle = [...body.matchAll(/<span class="[^"]*" data-idle><img [^>]*src="\/teach\/(ama|carlos)\/idle-poster\.webp"[^>]*width="\d+" height="\d+"[^>]*><video ([^>]*)>/g)];
  ok(idle.length === 2 && idle.map(m => m[1]).join() === 'ama,carlos', `${f}: cần Ama (hero) + Carlos (cách học) qua Chars.idle, poster có width/height`);
  for (const m of idle) ok(/\bmuted\b/.test(m[2]) && /data-src="\/teach\/\w+\/idle\.webm"/.test(m[2]) && !/\s(src|autoplay)=?/.test(m[2].replace(/data-src/g, '')), `${f}: video giáo viên phải tắt tiếng, chưa có src/autoplay lúc tải`);
  ok(!/<audio|autoplay/.test(body), `${f}: không được tự phát âm thanh/video`);
  ok(!/\banimate-(pulse|bounce|ping|spin)\b/.test(html) && !/animation:[^;}]*infinite/.test(html), `${f}: không được có chuyển động lặp vô hạn (gây khó chịu, làm mờ chữ – known-issues.json)`);
}
const site = fs.readFileSync('web/js/site.js', 'utf8');
ok(/prefers-reduced-motion/.test(site) && /data-idle/.test(site), 'web/js/site.js: thiếu bật vòng nghỉ giáo viên (tôn trọng giảm chuyển động)');
if (bad) { console.error(`✗ landing-v3: ${bad} lỗi`); process.exit(1); }
console.log(`✓ landing-v3: ${LANGS.length} trang đủ nội dung, giáo viên 2D tĩnh→sống tắt tiếng, không lẫn tiếng, ≤ 16 KB gzip`);
