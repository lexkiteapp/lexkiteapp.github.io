// Dịch sẵn lời giải đề thi (IELTS Reading/Listening, TOEIC, TOEFL – bản gốc tiếng Việt tự biên soạn) sang ngôn ngữ khác.
// Dùng: node --require ./scripts/lib-curl-fetch.cjs scripts/gen-explain.mjs en [ja …]  → web/i18n/explain/<lang>.json { hash: bản dịch }
// Giữ nguyên: chữ cái đáp án (→ {B}, để app đổi theo vị trí đã xoay), trích dẫn tiếng Anh trong ngoặc kép. Chạy lại chỉ dịch câu mới.
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const g = {};
for (const d of ['listen', '../cpack/listen', 'readtest', '../cpack/readtest', 'toeic', '../cpack/toefl', '../cpack/cambridge/a2', '../cpack/cambridge/b1', '../cpack/cambridge/b2', '../cpack/cambridge/c1', '../cpack/cambridge/c2']) { const dir = path.join(ROOT, 'web/js', d); if (fs.existsSync(dir)) for (const f of fs.readdirSync(dir).sort()) if (f.endsWith('.js')) try { new Function('self', fs.readFileSync(path.join(dir, f), 'utf8'))(g); } catch (e) { /* bỏ tệp không phải dữ liệu */ } }
const src = new Set();
const srcEn = new Set(); // lời giải Cambridge viết gốc TIẾNG ANH (docs/specs/cambridge.md) → dịch từ en (sl=en), không phải từ vi
JSON.stringify(g.CAMBRIDGE || [], (k, v) => { if (k === 'explain' && typeof v === 'string' && v.trim()) srcEn.add(v); return v; });
JSON.stringify([g.LISTENING, g.READ_EXPLAIN, g.TOEIC, g.TOEFL], (k, v) => { if ((k === 'why' || k === 'explain') && typeof v === 'string' && v.trim()) src.add(v); return v; });
export const hash = s => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); };
const VI = /[ăđơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i; // trích dẫn tiếng Việt → dịch; tiếng Anh → giữ nguyên
const LET = /(→\s*|\((?=[A-D]\))|[Đđ]áp án\s+|[Cc]họn\s+|[Pp]hương án\s+)([A-D])\b/g;
// 13/11: chữ số cũng được bảo vệ ([[n]]) – máy dịch không được đổi/mất số (15 → 十五, 8/12 → 12月8日, ٢٠ …): gate explain-i18n so số với bản en từng chữ số (lỗi "số không khớp" 14 ngôn ngữ do bot 9d9483a20)
const protect = s => { const keep = []; const t = s.replace(LET, (m, pre, L) => pre + `{${L}}`).replace(/\{[A-D]\}|“[^”]{1,120}”|"[^"]{1,120}"|‘[^’]{1,80}’|\d+/g, m => (/^\d+$/.test(m) || !VI.test(m) ? `[[${keep.push(m) - 1}]]` : m)); return { t, keep }; }; // một lượt (không bọc số 2 lần: chữ số trong [[n]] của trích dẫn)
const restore = (t, keep) => t.replace(/\[\[\s*(\d+)\s*\]\]/g, (m, i) => keep[+i] ?? m);
// cả SỐ THỨ TỰ của [[n]] phải khớp (máy dịch từng đổi [[3]] → [[14]] khi gặp "3 p.m." → 15 giờ: restore ra chuỗi [[14]] trơ trên màn hình)
const tokensOk = (a, b) => { const ix = (t, re) => (t.match(re) || []).map(x => +x.replace(/\D/g, '')).sort((x, y) => x - y).join(','); return ix(a, /\[\[\d+\]\]/g) === ix(b, /\[\[\s*\d+\s*\]\]/g); };
// Ngân sách thời gian (CI): EXPLAIN_MIN=50 → dừng đúng hạn, lưu phần đã dịch, lần chạy sau làm tiếp
const DEADLINE = Date.now() + (process.env.EXPLAIN_MIN ? +process.env.EXPLAIN_MIN : 1e6) * 60000;
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function tr(lang, lines, sl = 'vi') {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${lang}&dt=t&q=${encodeURIComponent(lines.join('\n'))}`;
  for (let k = 0; k < 4; k++) { try { const r = await fetch(url); if (r.ok) { const j = await r.json(); return j[0].map(x => x[0]).join('').split('\n'); } if (r.status === 429) await sleep(20000); } catch (e) { /* thử lại */ } await sleep(1500 * (k + 1)); }
  return null;
}
for (const lang of process.argv.slice(2)) {
  const file = path.join(ROOT, 'web/i18n/explain', lang + '.json');
  const old = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
  const out = {}, todo = [];
  const slOf = new Map(); for (const s of srcEn) slOf.set(s, 'en');
  for (const s of [...src, ...(lang === 'en' ? [] : srcEn)]) { const h = hash(s); if (old[h] && (slOf.has(s) || !VI.test(old[h]))) out[h] = old[h]; else todo.push(s); }
  let ok = 0, fail = 0;
  todo.sort((x, y) => (slOf.has(x) ? 1 : 0) - (slOf.has(y) ? 1 : 0)); // nguồn vi trước, en sau (mỗi lô cùng ngôn ngữ nguồn)
  for (let i = 0; i < todo.length && Date.now() < DEADLINE;) {
    const batch = []; let len = 0;
    const bsl = slOf.get(todo[i]) || 'vi';
    while (i < todo.length && len < 1800 && (slOf.get(todo[i]) || 'vi') === bsl) { batch.push(todo[i]); len += todo[i].length + 1; i++; }
    const prot = batch.map(s => protect(s.replace(/\n/g, ' ')));
    let res = await tr(lang, prot.map(p => p.t), bsl);
    if (!res || res.length !== batch.length) { res = []; for (const p of prot) { const r1 = await tr(lang, [p.t], bsl); res.push(r1 ? r1.join(' ') : ''); await sleep(300); } }
    const digits = x => (String(x).match(/\d+/g) || []).sort().join('|'); // bản en là chuẩn so sánh của mọi ngôn ngữ (gate explain-i18n): đổi/mất số (15 → "fifteen", 8/12 → "December 8") bị loại, lần sau dịch lại
    batch.forEach((s, j) => { const t = (res[j] || '').trim(); if (t && tokensOk(prot[j].t, t) && (lang !== 'en' || digits(prot[j].t) === digits(t))) { out[hash(s)] = restore(t, prot[j].keep); ok++; } else fail++; });
    process.stdout.write(`\r${lang} ${i}/${todo.length}`); await sleep(400);
    if (ok && ok % 200 < batch.length) fs.writeFileSync(file, JSON.stringify(out)); // lưu dần, ngắt giữa chừng không mất
  }
  // Câu dịch lỗi định dạng nhiều lần (máy dịch gộp/tách dấu ngoặc): dùng bản tiếng Anh thay vì để người học thấy tiếng Việt
  if (lang !== 'en') { const ef = path.join(ROOT, 'web/i18n/explain/en.json'), en = fs.existsSync(ef) ? JSON.parse(fs.readFileSync(ef, 'utf8')) : {}; for (const s of src) { const h = hash(s); if (!out[h] && en[h]) out[h] = en[h]; } }
  fs.writeFileSync(file, JSON.stringify(out));
  console.log(`\n✓ ${lang}: ${Object.keys(out).length}/${src.size} câu (mới ${ok}, lỗi ${fail} – lần chạy sau thử lại)`);
}
