#!/usr/bin/env node
// Sinh bản dịch giao diện cho ngôn ngữ mới từ bản tiếng Anh (web/js/i18n/en.js) – chạy 1 lần khi mở thị trường mới:
//   node scripts/gen-i18n.mjs es            → web/js/i18n/es.js
//   node scripts/gen-i18n.mjs es --redo-english → dịch lại mọi khóa chứa nội dung học tiếng Anh (sau khi sửa scripts/i18n-english.mjs)
// Sau đó thêm 'es' vào SUPPORTED trong web/js/i18n.js. Chạy lại để cập nhật: chỉ dịch khóa mới, giữ bản đã có (có thể đã được người hiệu đính).
// An toàn: giữ nguyên {biến} và thẻ HTML; câu nào dịch làm hỏng biến/thẻ → giữ tiếng Anh (không bao giờ hiện lỗi định dạng).
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { englishSegments, isEnglishKey, missingSegments, protectEnglish } from './i18n-english.mjs';

const lang = process.argv[2];
const REDO = process.argv.includes('--redo-english'); // dịch lại mọi khóa có nội dung học tiếng Anh (sau khi đổi quy tắc che)
if (!/^[a-z]{2}(-[A-Z]{2})?$/.test(lang || '') || lang === 'en' || lang === 'vi') { console.error('Dùng: node scripts/gen-i18n.mjs <mã ngôn ngữ, vd. es>'); process.exit(1); }
const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '../web/js/i18n');
const load = f => { const ctx = { self: {} }; ctx.self = ctx; vm.createContext(ctx); vm.runInContext(fs.readFileSync(f, 'utf8'), ctx); return ctx.I18N_DICT || {}; };
const EN = load(path.join(DIR, 'en.js')).en;
const outFile = path.join(DIR, `${lang}.js`);
const old = fs.existsSync(outFile) ? (load(outFile)[lang] || {}) : {};

const FIXED = JSON.parse(fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'i18n-fixed.json'), 'utf8'));
// Che bằng mã [[n]] để máy dịch không đụng vào: (1) nội dung học tiếng Anh (“could of”, so + adj + that, câu mẫu… – xem i18n-english.mjs),
// (2) biến {n}, thẻ HTML, thực thể &…; → trả lại nguyên văn sau khi dịch
const protect = (s, key) => { const keep = []; const t = protectEnglish(key, s, keep).replace(/\{\w+\}|<[^>]+>|&\w+;/g, m => `[[${keep.push(m) - 1}]]`); return { t, keep }; };
const restore = (t, keep) => t.replace(/\[\[\s*(\d+)\s*\]\]/g, (m, i) => keep[+i] ?? m);
const sameTokens = (a, b) => JSON.stringify((a.match(/\{\w+\}|<[^>]+>/g) || []).sort()) === JSON.stringify((b.match(/\{\w+\}|<[^>]+>/g) || []).sort());

async function translate(lines) {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${lang}&dt=t&q=${encodeURIComponent(lines.join('\n'))}`;
  for (let k = 0; k < 4; k++) {
    try { const r = await fetch(url); if (r.ok) { const j = await r.json(); return j[0].map(x => x[0]).join('').split('\n'); } } catch (e) { /* thử lại */ }
    await new Promise(r => setTimeout(r, 1500 * (k + 1)));
  }
  return null;
}

const out = { ...old };
let ok = 0, kept = 0, eng = 0;
// Khóa toàn tiếng Anh là mẫu học (tiêu đề cấu trúc "Not only … but also …", cặp từ dễ nhầm) → giữ nguyên bản tiếng Anh, không dịch
for (const k of Object.keys(EN)) if (isEnglishKey(k) && !(FIXED[k] && FIXED[k][lang]) && out[k] !== EN[k]) { out[k] = EN[k]; eng++; }
// Dịch: khóa mới + khóa mà bản dịch cũ làm mất nội dung học tiếng Anh (trừ khóa đã có bản dịch tay – i18n-fix.mjs sẽ áp)
// Kiểm một câu dịch: mỗi mã [[n]] xuất hiện đúng 1 lần (máy dịch không nuốt/nhân bản), viết hoa chữ đầu như tiếng Anh (trừ khi câu mở đầu
// bằng đoạn tiếng Anh được che – giữ nguyên văn), trả lại nguyên văn, đúng biến/thẻ, đủ nội dung học tiếng Anh → câu dịch hoặc ''
function finish(v, k, raw, p) {
  if (!raw) return '';
  let t = raw.trim();
  for (let n = 0; n < p.keep.length; n++) if ((t.match(new RegExp(`\\[\\[\\s*${n}\\s*\\]\\]`, 'g')) || []).length !== 1) return '';
  if (/^\p{Lu}/u.test(v) && /^\p{Ll}/u.test(t)) t = t[0].toLocaleUpperCase(lang) + t.slice(1); // viết hoa chữ đầu như bản tiếng Anh
  const tr = restore(t, p.keep);
  return tr && sameTokens(v, tr) && !/\[\[\s*\d+\s*\]\]/.test(tr) && !missingSegments(k, v, tr).length ? tr : '';
}
const keys = Object.keys(EN).filter(k => !out[k] || ((REDO ? englishSegments(k, EN[k]).length && !isEnglishKey(k) : missingSegments(k, EN[k], out[k]).length) && !(FIXED[k] && FIXED[k][lang])));
for (let i = 0; i < keys.length;) {
  const batch = []; let len = 0;
  while (i < keys.length && len < 1500) { const v = EN[keys[i]].replace(/\n/g, ' '); batch.push([keys[i], v]); len += v.length + 1; i++; }
  const prot = batch.map(([k, v]) => protect(v, k));
  let res = await translate(prot.map(p => p.t));
  // Lô bị lệch dòng (Google gộp/tách câu) → dịch lại từng câu, không bỏ sót cả lô
  if (!res || res.length !== batch.length) { res = []; for (const p of prot) { const r1 = await translate([p.t]); res.push(r1 ? r1.join(' ') : ''); await new Promise(r => setTimeout(r, 300)); } }
  for (let j = 0; j < batch.length; j++) {
    const [k, v] = batch[j];
    let tr = finish(v, k, res && res[j], prot[j]);
    if (!tr && res && res[j]) { const r1 = await translate([prot[j].t]); tr = finish(v, k, r1 && r1.join(' '), prot[j]); } // dịch riêng câu lỗi 1 lần
    if (tr) { out[k] = tr; ok++; } else kept++; // không lưu → giữ bản cũ / giao diện tự dùng tiếng Anh, lần chạy sau thử dịch lại
  }
  process.stdout.write(`\r${i}/${keys.length}`);
}
const body = `/* UI ${lang} – SINH TỰ ĐỘNG từ en.js bằng scripts/gen-i18n.mjs (có thể hiệu đính tay; chạy lại chỉ dịch khóa mới). */\n(function (g) { const D = g.I18N_DICT = g.I18N_DICT || {}; D[${JSON.stringify(lang)}] = Object.assign(D[${JSON.stringify(lang)}] || {}, ${JSON.stringify(out, null, 0)}); })(typeof self !== 'undefined' ? self : this);\n`;
fs.writeFileSync(outFile, body);
console.log(`\n✓ ${outFile}: dịch mới ${ok}, giữ nguyên mẫu tiếng Anh ${eng}, chưa dịch được ${kept} (sai định dạng/mất nội dung học/lỗi mạng), tổng ${Object.keys(out).length}`);
