// 🪁 Logo trong màn Stitch: mẫu Stitch hay tự vẽ logo tạm (diều hình thoi + chữ "Lexkite") và bộ sinh code giữ nguyên → lên web (03–04/11, màn Hôm nay v2).
//   Luật: màn sinh ra (web/js/st) chỉ được dùng logo thật: <img class="logo" src="icons/icon.svg?v=N"> + <span class="wordmark">lex<b>kite</b></span>, N khớp web/app.
//   Đổi logo cần chủ dự án duyệt trước – test này không thay cho việc duyệt.
import fs from 'node:fs'; import path from 'node:path';
const ROOT = 'web/js/st';
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(x => x.isDirectory() ? walk(path.join(d, x.name)) : x.name.endsWith('.js') ? [path.join(d, x.name)] : []);
const SHELL = fs.readFileSync(fs.existsSync('web/app/index.html') ? 'web/app/index.html' : 'web/index.html', 'utf8');
const V = (SHELL.match(/icons\/icon\.svg\?v=(\d+)/) || [])[1];
export function check(src, ver = V) {
  const bad = [];
  if (/>\s*Lexkite\s*</.test(src) || />\$\{e\(t\("Lexkite"\)\)\}</.test(src) || />\$\{t\(s\("Lexkite"\)\)\}</.test(src)) bad.push('chữ "Lexkite" tự đặt thay cho wordmark lex<b>kite</b>');
  for (const m of src.matchAll(/<header\b[^>]*>\s*(?:<(?:div|a)\b[^>]*>\s*)*<svg\b[\s\S]*?<\/svg>\s*(<span\b[^>]*>)?/g)) if (/<polygon\b/.test(m[0]) || m[1]) bad.push('logo vẽ tay (svg) ở đầu header');
  for (const m of src.matchAll(/(.{0,240})<span class="wordmark">/gs)) { const v = m[1].match(/<img\b[^>]*src="icons\/icon\.svg\?v=(\d+)"[^>]*>\s*$/); if (!v) bad.push('wordmark không đi cùng <img icons/icon.svg?v=N>'); else if (ver && v[1] !== ver) bad.push(`icon.svg?v=${v[1]} lệch khung app (v=${ver})`); }
  return bad;
}
// Tự kiểm: đúng mẫu lỗi đã lên web phải ĐỎ, logo thật phải XANH (test mù thì vô nghĩa).
const OLD = '<header class="h"><div class="flex"><svg width="26"><polygon points="13,2 23,12 13,15 3,12" fill="#F59E0B"></polygon></svg><span class="text-xl">${t(s("Lexkite"))}</span></div></header>';
const OK = '<header class="h"><div class="flex"><img alt="L" class="logo" src="icons/icon.svg?v=7"><span class="wordmark">${\'lex<b>kite</b>\'}</span></div></header>';
if (!check(OLD, '7').length || check(OK, '7').length) { console.error('✗ brand-logo-stitch: tự kiểm sai', check(OLD, '7'), check(OK, '7')); process.exit(1); }
if (!V) { console.error('✗ brand-logo-stitch: không đọc được icons/icon.svg?v=N của khung app'); process.exit(1); }
const errs = walk(ROOT).flatMap(f => check(fs.readFileSync(f, 'utf8')).map(b => `${f}: ${b}`));
if (errs.length) { console.error('✗ brand-logo-stitch:\n  ' + errs.join('\n  ')); process.exit(1); }
console.log('✓ brand-logo-stitch: màn Stitch chỉ dùng logo thật');
