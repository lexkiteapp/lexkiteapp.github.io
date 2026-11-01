// Cổng kho DỊCH SẴN (web/packs/tr – scripts/gen-tr-packs.mjs): đủ phủ + đúng chữ viết + không lẫn tiếng + không chép nguyên tiếng Anh + không mục mồ côi.
//   npm test: phủ ≥ 97 % mỗi ngôn ngữ (dữ liệu có thể thêm từ mới trong ngày, kho dịch bù đêm đó) · --strict (job tr-packs sau khi dịch): ≥ 99,5 %.
import fs from 'fs';
import { items, LANGS } from '../gen-tr-packs.mjs';
const strict = process.argv.includes('--strict'), MIN = strict ? 0.995 : 0.97;
const VI = /[ăđơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i; // chỉ chữ RIÊNG tiếng Việt (â ê ô có cả ở fr/pt)
const SCRIPT = { vi: VI, th: /[฀-๿]/, zh: /[一-鿿]/, ja: /[぀-ヿ一-鿿]/, ko: /[가-힯]/, hi: /[ऀ-ॿ]/, ar: /[؀-ۿ]/, ru: /[Ѐ-ӿ]/ };
const CJK = new Set(['zh', 'ja', 'ko']);
const all = items(), byH = new Map(all.map(x => [x.h, x]));
let bad = 0;
const fail = (l, m) => { bad++; console.error(`✗ tr-packs ${l}: ${m}`); };
for (const L of LANGS) {
  const d = `web/packs/tr/${L}/`, m = {};
  if (!fs.existsSync(d)) { fail(L, 'thiếu thư mục kho'); continue; }
  for (let k = 0; k < 64; k++) { const f = d + k + '.json'; if (!fs.existsSync(f)) { fail(L, 'thiếu mảnh ' + k); continue; } Object.assign(m, JSON.parse(fs.readFileSync(f, 'utf8'))); }
  const keys = Object.keys(m), orphan = keys.filter(h => !byH.has(h));
  if (orphan.length) fail(L, `${orphan.length} mục không còn trong dữ liệu (chạy lại gen-tr-packs)`);
  const cov = keys.length ? keys.filter(h => byH.has(h)).length / all.length : 0;
  if (cov < MIN) fail(L, `phủ ${(cov * 100).toFixed(1)} % < ${MIN * 100} % (${keys.length}/${all.length})`);
  const errs = { empty: [], script: [], leak: [], copy: [], len: [] };
  for (const h of keys) {
    const x = byH.get(h), v = m[h]; if (!x) continue;
    if (typeof v !== 'string' || !v.trim()) { errs.empty.push(x.en); continue; }
    if (SCRIPT[L] && !SCRIPT[L].test(v)) errs.script.push(x.en + ' → ' + v);
    if (L !== 'vi' && VI.test(v) && !VI.test(x.en)) errs.leak.push(v); // tên riêng tiếng Việt có sẵn trong câu EN (Huế…) không phải lẫn tiếng
    if (v.trim().toLowerCase() === x.en.trim().toLowerCase() && x.en.split(' ').length > 2) errs.copy.push(x.en);
    const r = v.length / x.en.length; if (r < (CJK.has(L) ? 0.1 : 0.3) || r > 4) errs.len.push(x.en + ' → ' + v);
  }
  const n = keys.length || 1, lim = { empty: 0, script: 0.01, leak: 0.001, copy: 0.01, len: 0.01 };
  for (const [k, a] of Object.entries(errs)) if (a.length / n > lim[k]) fail(L, `${k} ${a.length} mục (> ${lim[k] * 100} %), vd: ${a.slice(0, 2).join(' | ')}`);
  if (!bad) console.log(`  ${L}: ${keys.length}/${all.length} (${(cov * 100).toFixed(1)} %) · script ${errs.script.length} · copy ${errs.copy.length} · len ${errs.len.length}`);
}
if (bad) process.exit(1);
console.log(`✓ tr-packs: ${LANGS.length} ngôn ngữ, ${all.length} câu, phủ ≥ ${MIN * 100} %, đúng chữ viết, không lẫn tiếng`);
