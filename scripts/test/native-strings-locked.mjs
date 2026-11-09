// Gác: chuỗi native mà nhiều ngôn ngữ còn giữ nguyên tiếng Anh phải có bản dịch tay trong scripts/i18n-fixed.json. Nếu không, bot i18n trên main dịch máy sau khi gộp
// (06 ngôn ngữ "Shadowing" → "Beschattung"…), native/shared/gen trôi và mọi PR đỏ native-android/ios mà không đụng native.
import fs from 'node:fs';
const S = JSON.parse(fs.readFileSync('native/shared/strings.json', 'utf8')), F = JSON.parse(fs.readFileSync('scripts/i18n-fixed.json', 'utf8')), D = 'native/shared/gen/strings';
const flat = (o, x = '', a = {}) => { for (const k in o) typeof o[k] === 'object' ? flat(o[k], x + k + '.', a) : a[x + k] = o[k]; return a; };
const load = l => flat(JSON.parse(fs.readFileSync(`${D}/${l}.json`, 'utf8'))), E = load('en');
const L = fs.readdirSync(D).map(f => f.replace('.json', '')).filter(l => l !== 'en' && l !== 'vi').map(load);
const hasWord = s => /\p{L}{4,}/u.test(s.replace(/\{[^}]*\}/g, ''));   // chỉ còn biến/ký hiệu ({title} – Q{n}) thì không có gì để dịch
const bad = Object.keys(E).filter(k => hasWord(E[k]) && L.filter(d => d[k] === E[k]).length >= 3 && !F[S[k]]);
if (bad.length) { console.error(`✗ ${bad.length} chuỗi native chưa khoá bản dịch (thêm vào scripts/i18n-fixed.json):\n` + bad.map(k => `  ${k}: ${E[k]}`).join('\n')); process.exit(1); }
console.log(`✓ native-strings-locked: ${Object.keys(E).length} chuỗi, không chuỗi nào chờ bot dịch máy`);
