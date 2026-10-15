// Kiểm tra chất lượng bản dịch giao diện cho MỌI ngôn ngữ (chạy trong ship & GitHub Action):
//   1. Đủ khóa: mỗi chuỗi tiếng Anh (en.js) phải có bản dịch ở từng ngôn ngữ
//   2. Giữ nguyên biến {n} và thẻ HTML <b>…</b>
//   3. Không lẫn tiếng: bản dịch không được còn chữ tiếng Việt có dấu
//   4. Không mắc lỗi dịch máy đã biết (CV/Lebenslauf cho "Resume", "nhìn lên" cho "Look up"…)
//   5. Nhãn ngắn (≤ 3 từ) phải có bản dịch tay trong scripts/i18n-fixed.json (cảnh báo – dịch máy hay sai nghĩa chữ ngắn)
// Dùng: node scripts/i18n-qa.mjs            → báo lỗi, thoát mã 1 nếu có lỗi nghiêm trọng (1–4)
//       node scripts/i18n-qa.mjs --short    → liệt kê nhãn ngắn chưa có bản dịch tay
import fs from 'fs';
const root = new URL('../web/js/i18n/', import.meta.url);
const langs = fs.readFileSync(new URL('./i18n-langs.txt', import.meta.url), 'utf8').split('\n').map(s => s.trim()).filter(s => s && !s.startsWith('#'));
const fixed = JSON.parse(fs.readFileSync(new URL('./i18n-fixed.json', import.meta.url), 'utf8'));
const load = f => { const g = {}; new Function('self', fs.readFileSync(new URL(f, root), 'utf8'))(g); return g.I18N_DICT; };
const EN = load('en.js').en;
const VI = /[ăđơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i; // chỉ chữ riêng của tiếng Việt (â ê ô cũng có trong tiếng Pháp/Bồ Đào Nha)
const BAD = /\b(Currículo|Currículum|Lebenslauf|CV)\b|简历|이력서|बायोडाटा|Резюме|Mirar hacia arriba|Olhe para cima|Schau nach oben|抬头看|見上げ|올려다|ऊपर देखो|Посмотрите вверх|Yukarıya bak|Lihatlah ke atas|มองขึ้น/;
const vars = s => (String(s).match(/\{[a-zA-Z0-9_]+\}/g) || []).sort().join(',');
const tags = s => (String(s).match(/<\/?[a-z]+/gi) || []).map(x => x.toLowerCase()).sort().join(',');
const short = k => String(EN[k]).trim().split(/\s+/).length <= 3 && !/[{<]/.test(EN[k]) && /[a-z]/i.test(EN[k]);
let errors = 0; const report = [];
for (const l of langs) {
  let D; try { D = load(l + '.js')[l] || {}; } catch (e) { report.push(`✗ ${l}: không đọc được (${e.message})`); errors++; continue; }
  const miss = [], mix = [], bad = [], ph = [];
  for (const k of Object.keys(EN)) {
    const v = D[k];
    if (v == null) { miss.push(k); continue; }
    if (vars(v) !== vars(EN[k]) || tags(v) !== tags(EN[k])) ph.push(k);
    if (VI.test(v) && !VI.test(EN[k])) mix.push(k);
    if (BAD.test(v)) bad.push(k);
  }
  const shortMissing = Object.keys(EN).filter(k => short(k) && !(fixed[k] && fixed[k][l]));
  const line = `${l}: thiếu ${miss.length} · sai biến/thẻ ${ph.length} · lẫn tiếng Việt ${mix.length} · dịch sai đã biết ${bad.length} · nhãn ngắn chưa dịch tay ${shortMissing.length}`;
  report.push((miss.length + ph.length + mix.length + bad.length ? '✗ ' : '✓ ') + line);
  for (const [name, arr] of [['thiếu', miss], ['sai biến/thẻ', ph], ['lẫn tiếng', mix], ['dịch sai', bad]]) if (arr.length) report.push(`   ${name}: ${arr.slice(0, 5).map(k => JSON.stringify(k)).join(', ')}${arr.length > 5 ? ' …' : ''}`);
  errors += miss.length + ph.length + mix.length + bad.length;
}
if (process.argv.includes('--short')) {
  const ks = Object.keys(EN).filter(short).filter(k => langs.some(l => !(fixed[k] && fixed[k][l])));
  console.log(ks.map(k => JSON.stringify(k) + ' → ' + JSON.stringify(EN[k])).join('\n')); console.log(ks.length + ' nhãn ngắn chưa đủ bản dịch tay');
  process.exit(0);
}
console.log(report.join('\n'));
console.log(errors ? `✗ i18n-qa: ${errors} lỗi bản dịch` : '✓ i18n-qa: mọi ngôn ngữ đủ khóa, đúng biến, không lẫn tiếng');
process.exit(errors && process.argv.includes('--strict') ? 1 : 0);
