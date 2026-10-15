#!/usr/bin/env node
// Sinh bản dịch giao diện cho ngôn ngữ mới từ bản tiếng Anh (web/js/i18n/en.js) – chạy 1 lần khi mở thị trường mới:
//   node scripts/gen-i18n.mjs es            → web/js/i18n/es.js
// Sau đó thêm 'es' vào SUPPORTED trong web/js/i18n.js. Chạy lại để cập nhật: chỉ dịch khóa mới, giữ bản đã có (có thể đã được người hiệu đính).
// An toàn: giữ nguyên {biến} và thẻ HTML; câu nào dịch làm hỏng biến/thẻ → giữ tiếng Anh (không bao giờ hiện lỗi định dạng).
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const lang = process.argv[2];
if (!/^[a-z]{2}(-[A-Z]{2})?$/.test(lang || '') || lang === 'en' || lang === 'vi') { console.error('Dùng: node scripts/gen-i18n.mjs <mã ngôn ngữ, vd. es>'); process.exit(1); }
const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '../web/js/i18n');
const load = f => { const ctx = { self: {} }; ctx.self = ctx; vm.createContext(ctx); vm.runInContext(fs.readFileSync(f, 'utf8'), ctx); return ctx.I18N_DICT || {}; };
const EN = load(path.join(DIR, 'en.js')).en;
const outFile = path.join(DIR, `${lang}.js`);
const old = fs.existsSync(outFile) ? (load(outFile)[lang] || {}) : {};

// Che biến/thẻ bằng mã [[n]] để máy dịch không đụng vào
const protect = s => { const keep = []; const t = s.replace(/\{\w+\}|<[^>]+>|&\w+;/g, m => `[[${keep.push(m) - 1}]]`); return { t, keep }; };
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

const keys = Object.keys(EN).filter(k => !old[k]);
const out = { ...old };
let ok = 0, kept = 0;
for (let i = 0; i < keys.length;) {
  const batch = []; let len = 0;
  while (i < keys.length && len < 1500) { const v = EN[keys[i]].replace(/\n/g, ' '); batch.push([keys[i], v]); len += v.length + 1; i++; }
  const prot = batch.map(([, v]) => protect(v));
  let res = await translate(prot.map(p => p.t));
  // Lô bị lệch dòng (Google gộp/tách câu) → dịch lại từng câu, không bỏ sót cả lô
  if (!res || res.length !== batch.length) { res = []; for (const p of prot) { const r1 = await translate([p.t]); res.push(r1 ? r1.join(' ') : ''); await new Promise(r => setTimeout(r, 300)); } }
  batch.forEach(([k, v], j) => {
    const tr = res && res[j] ? restore(res[j].trim(), prot[j].keep) : '';
    const cased = tr && /^\p{Lu}/u.test(v) && /^\p{Ll}/u.test(tr) ? tr[0].toLocaleUpperCase(lang) + tr.slice(1) : tr; // viết hoa chữ đầu như bản tiếng Anh
    if (cased && sameTokens(v, cased)) { out[k] = cased; ok++; } else kept++; // không lưu → giao diện tự dùng tiếng Anh, lần chạy sau thử dịch lại
  });
  process.stdout.write(`\r${i}/${keys.length}`);
}
const body = `/* UI ${lang} – SINH TỰ ĐỘNG từ en.js bằng scripts/gen-i18n.mjs (có thể hiệu đính tay; chạy lại chỉ dịch khóa mới). */\n(function (g) { const D = g.I18N_DICT = g.I18N_DICT || {}; D[${JSON.stringify(lang)}] = Object.assign(D[${JSON.stringify(lang)}] || {}, ${JSON.stringify(out, null, 0)}); })(typeof self !== 'undefined' ? self : this);\n`;
fs.writeFileSync(outFile, body);
console.log(`\n✓ ${outFile}: dịch mới ${ok}, giữ tiếng Anh ${kept} (sai định dạng/lỗi mạng), tổng ${Object.keys(out).length}`);
