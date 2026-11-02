// ✉️ Email HTML (600 px): mẫu Stitch (Tailwind) + data.json → HTML một tệp, CSS gộp vào style="" (juice), giữ khối @media (prefers-color-scheme: dark) ở <head>. Chạy trên CI (cards-render.yml).
// Dùng: node scripts/email/build.mjs <mẫu.html> <data.json> <ra.html>
// Cổng (đỏ = exit 1): còn Tailwind CDN/tài nguyên ngoài (ảnh https của mình được phép) · slot thiếu dữ liệu · không có liên kết huỷ đăng ký a[data-slot-href="unsubscribe"] · thiếu khối dark · > 100 KB (Gmail cắt).
import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module';
import { prepare, compile, fillStatic, parseArgs, die, ROOT } from '../cards/tw.mjs';

const { pos: [tplPath, dataPath, outPath] } = parseArgs(process.argv.slice(2));
if (!tplPath || !dataPath || !outPath) die('dùng: build.mjs <mẫu.html> <data.json> <ra.html>');
let juice; try { juice = createRequire(path.join(ROOT, 'package.json'))('juice'); } catch { die('thiếu juice — CI: npm i --no-save juice@10.0.1'); }
const MAX = 100 * 1024, data = JSON.parse(fs.readFileSync(dataPath, 'utf8')), bad = [];
let html, css;
try { const p = prepare(fs.readFileSync(tplPath, 'utf8'), { allowExtImg: true }); css = compile(p.html, p.cfg, 'email'); html = p.html; } catch (e) { die(`${tplPath}: ${e.message}`); }
const f = fillStatic(html, data); html = f.html;
if (f.missing.length) bad.push(`slot thiếu dữ liệu: ${f.missing.join(', ')}`);
const un = html.match(/<a\b[^>]*\bdata-slot-href="unsubscribe"[^>]*>/); if (!un) bad.push('thiếu liên kết huỷ đăng ký a[data-slot-href="unsubscribe"]'); else if (!/\shref="(https:\/\/|mailto:)[^"]+"/.test(un[0])) bad.push('liên kết huỷ đăng ký không có href https:/mailto:');
if (!/prefers-color-scheme:\s*dark/.test(css)) bad.push('mẫu không có kiểu dark: nào → email không hỗ trợ chế độ tối');
if (!/name=["']color-scheme["']/.test(html)) html = html.replace(/<head[^>]*>/i, m => m + '<meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark">');
html = html.replace(/<\/head>/i, `<style>${css}</style></head>`);
let out = ''; try { out = juice(html, { removeStyleTags: true, preserveMediaQueries: true, preserveImportant: true, applyWidthAttributes: true, insertPreservedExtraCss: true }); } catch (e) { bad.push('juice lỗi: ' + e.message); }
if (out && !/@media\s*\(prefers-color-scheme:\s*dark\)/.test(out.match(/<head[\s\S]*?<\/head>/i)?.[0] || '')) bad.push('khối @media dark không còn trong <head> sau khi gộp CSS');
if (/<script/i.test(out)) bad.push('còn <script>');
const bytes = Buffer.byteLength(out); if (bytes > MAX) bad.push(`${(bytes / 1024).toFixed(1)} KB > 100 KB (Gmail sẽ cắt email)`);
if (bad.length) die(`${path.basename(tplPath)} ${bad.join(' | ')}`);
fs.mkdirSync(path.dirname(path.resolve(outPath)), { recursive: true }); fs.writeFileSync(outPath, out);
console.log(`✓ ${outPath} ${(bytes / 1024).toFixed(1)} KB (≤ 100 KB)`);
