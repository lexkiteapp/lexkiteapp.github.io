// World probe (scripts/world/probe.mjs) bấm nút chính trang giới thiệu bằng bộ chọn CTA; landing dựng lại (Stitch) đổi class → probe đỏ 3 lượt liền
// ("không thấy nút chính" rồi "/app/ quay về màn chào" vì chưa thiết lập). Test này chạy không cần trình duyệt: bộ chọn phải trúng ĐÚNG nút
// trỏ #/welcome/setup trong landing đã dựng (web/<lang>/index.html), và phải cùng bộ chọn với journey-e2e.
import fs from 'node:fs';
let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.log('✗ ' + m); } };
const probe = fs.readFileSync('scripts/world/probe.mjs', 'utf8');
const sel = (probe.match(/const CTA = '([^']+)'/) || [])[1];
ok(sel, 'probe.mjs phải khai báo const CTA');
ok(/c\.tap\(CTA,/.test(probe), 'probe bấm nút chính bằng CTA (không bộ chọn viết cứng)');
const je = fs.readFileSync('scripts/test/journey-e2e.mjs', 'utf8');
ok(je.includes(`locator('${sel}')`), 'CTA của probe trùng journey-e2e');
// khớp bộ chọn đơn giản: [attr=v] hoặc tag.class… trên thẻ <a> của landing
function matches(tag, alt) {
  const attr = alt.match(/^\[([\w-]+)=([\w-]+)\]$/);
  if (attr) return new RegExp(`\\s${attr[1]}=["']?${attr[2]}["']?[\\s>]`).test(tag);
  const m = alt.match(/^\.ctas a((?:\.[\w-]+)+)$/); // .ctas a.x.y: không dò được cha từ thẻ → cần class + cha; chỉ chấp nhận khi landing còn .ctas
  return !!m && /class="[^"]*\bctas\b/.test(tag);
}
for (const lang of ['en', 'de', 'ja']) {
  const html = fs.readFileSync(`web/${lang}/index.html`, 'utf8');
  const hits = [...html.matchAll(/<a\s[^>]*>/g)].map(m => m[0]).filter(t => (sel || '').split(',').some(a => matches(t, a.trim())));
  ok(hits.length >= 1, `${lang}: bộ chọn "${sel}" không trúng nút nào trên landing`);
  ok(hits.some(t => new RegExp(`href="/app/\\?hl=${lang}#/welcome/setup"`).test(t)), `${lang}: nút chính phải trỏ /app/?hl=${lang}#/welcome/setup`);
}
// bước đầu thiết lập: probe chọn mục tiêu bằng cùng bộ chọn với journey-e2e, và màn s=goal phải còn render bộ chọn đó
const pick = (probe.match(/const PICK = '([^']+)'/) || [])[1];
ok(pick && /c\.tap\(PICK\)/.test(probe) && !/button\.trk-opt/.test(probe.replace(/^\s*\/\/.*$/gm, '')), 'probe chọn mục tiêu bằng const PICK (không bộ chọn viết cứng)');
ok(je.includes(`h.click('${pick}')`), `PICK của probe (${pick}) trùng journey-e2e`);
ok(/data-track=/.test(fs.readFileSync('web/js/onboard.js', 'utf8') + fs.readFileSync('web/js/tracks.js', 'utf8')), 'onboard/tracks còn render [data-track]');
if (fail) process.exit(1);
console.log('✓ probe-cta: bộ chọn nút chính của probe trúng landing dựng thật');
