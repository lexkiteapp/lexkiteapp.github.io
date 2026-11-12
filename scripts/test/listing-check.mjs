// Kiểm store/chrome/listing.json (mô tả Chrome Web Store / Edge cho 15 ngôn ngữ):
// đủ ngôn ngữ, tên ≤ 75, mô tả ngắn ≤ 132, mô tả ≤ 16.000, có tuyên bố không liên kết + link chính sách đúng ngôn ngữ,
// không "®", không từ ngữ quảng cáo bị cấm (best, #1, official…). Chạy: node scripts/test/listing-check.mjs
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const LOCALES = ['en', 'vi', 'es', 'pt_BR', 'fr', 'de', 'id', 'th', 'zh_CN', 'ja', 'ko', 'hi', 'ar', 'ru', 'tr'];
const WEB = { pt_BR: 'pt', zh_CN: 'zh' }; // mã CWS → thư mục web/<lang>/
// Từ ngữ quảng cáo/so sánh bị cấm (chính sách "keyword spam / misleading" của CWS) – kể cả bản dịch.
const BANNED = [
  /\bbest\b/i, /#1/, /\bnumber one\b/i, /\bofficial\b/i, /\btop[- ]rated\b/i, /\bguaranteed?\b/i,
  /\bmejor(es)?\b/i, /\bmelhor(es)?\b/i, /\bmeilleur/i, /\bbeste[nrs]?\b/i, /\bterbaik\b/i, /tốt nhất/i, /số 1/i, /chính thức/i,
  /\boficial\b/i, /\bofficiel/i, /\boffiziell/i, /\bresmi\b/i, /официальн/i, /лучш/i, /\ben iyi\b/i,
  /最好/, /最佳/, /第一/, /官方/, /公式/, /最強/, /최고/, /공식/, /ดีที่สุด/, /ทางการ/, /सबसे अच्छ/, /आधिकारिक/, /أفضل/, /رسمي/,
];
const fail = [];
let data;
try { data = JSON.parse(readFileSync(ROOT + 'store/chrome/listing.json', 'utf8')); } catch (e) { console.error('✗ listing.json: ' + e.message); process.exit(1); }

const len = s => [...s].length;
for (const loc of LOCALES) {
  const L = data[loc];
  if (!L) { fail.push(`${loc}: thiếu ngôn ngữ`); continue; }
  for (const k of ['name', 'summary', 'description']) if (typeof L[k] !== 'string' || !L[k].trim()) fail.push(`${loc}.${k}: trống`);
  if (fail.length) continue;
  if (len(L.name) > 75) fail.push(`${loc}.name dài ${len(L.name)} > 75`);
  if (L.summary.length > 132) fail.push(`${loc}.summary dài ${L.summary.length} > 132`);
  if (L.description.length > 16000) fail.push(`${loc}.description dài ${L.description.length} > 16000`);
  if (!L.name.startsWith('Lexkite – ')) fail.push(`${loc}.name phải bắt đầu bằng "Lexkite – "`);
  const all = `${L.name}\n${L.summary}\n${L.description}`;
  if (/[®™]/.test(all)) fail.push(`${loc}: có ký hiệu ® / ™`);
  for (const re of BANNED) if (re.test(all)) fail.push(`${loc}: từ bị cấm ${re}`);
  const url = loc === 'en' ? 'https://lexkite.com/privacy' : `https://lexkite.com/${WEB[loc] || loc}/privacy`;
  if (!L.description.includes(url)) fail.push(`${loc}: thiếu link chính sách ${url}`);
  if (!/ETS/.test(L.description) || !/British Council/.test(L.description)) fail.push(`${loc}: thiếu câu không liên kết (British Council / ETS)`);
  if (!/6[.,\s ]?000/.test(L.description)) fail.push(`${loc}: thiếu con số 6,000+ đã kiểm`);
}
for (const k of Object.keys(data)) if (!LOCALES.includes(k)) fail.push(`ngôn ngữ lạ: ${k}`);
// Tên & mô tả ngắn trên cửa hàng lấy từ manifest (_locales appName/appDesc) → phải khớp listing.json
for (const loc of LOCALES) {
  const f = new URL(`../../extension/_locales/${loc}/messages.json`, import.meta.url), m = JSON.parse(readFileSync(f, 'utf8')), L = data[loc] || {};
  if ((m.appName || {}).message !== L.name) fail.push(`${loc}: _locales appName ≠ listing.json name`);
  if ((m.appDesc || {}).message !== L.summary) fail.push(`${loc}: _locales appDesc ≠ listing.json summary`);
  for (const k of ['rateTitle', 'rateBody', 'rateYes', 'rateLater', 'rateNever']) if (!(m[k] || {}).message) fail.push(`${loc}: _locales thiếu ${k}`);
}

if (fail.length) { console.error('✗ listing-check\n  ' + fail.join('\n  ')); process.exit(1); }
console.log('✓ listing-check');
