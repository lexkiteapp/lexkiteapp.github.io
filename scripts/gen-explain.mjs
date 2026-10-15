// Dịch sẵn lời giải đề thi (IELTS Reading/Listening, TOEIC, TOEFL – bản gốc tiếng Việt tự biên soạn) sang ngôn ngữ khác.
// Dùng: node --require ./scripts/lib-curl-fetch.cjs scripts/gen-explain.mjs en [ja …]  → web/i18n/explain/<lang>.json { hash: bản dịch }
// Giữ nguyên: chữ cái đáp án (→ {B}, để app đổi theo vị trí đã xoay), trích dẫn tiếng Anh trong ngoặc kép. Chạy lại chỉ dịch câu mới.
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const g = {};
for (const d of ['listen', 'readtest', 'toeic', 'toefl']) { const dir = path.join(ROOT, 'web/js', d); if (fs.existsSync(dir)) for (const f of fs.readdirSync(dir)) if (f.endsWith('.js')) try { new Function('self', fs.readFileSync(path.join(dir, f), 'utf8'))(g); } catch (e) { /* bỏ tệp không phải dữ liệu */ } }
const src = new Set();
JSON.stringify([g.LISTENING, g.READ_EXPLAIN, g.TOEIC, g.TOEFL], (k, v) => { if ((k === 'why' || k === 'explain') && typeof v === 'string' && v.trim()) src.add(v); return v; });
export const hash = s => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); };
const VI = /[ăâđêôơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i; // trích dẫn tiếng Việt → dịch; tiếng Anh → giữ nguyên
const LET = /(→\s*|\(|[Đđ]áp án\s+|[Cc]họn\s+|[Pp]hương án\s+)([A-D])\b/g;
const protect = s => { const keep = []; const t = s.replace(LET, (m, pre, L) => pre + `{${L}}`).replace(/\{[A-D]\}|“[^”]{1,120}”|"[^"]{1,120}"|‘[^’]{1,80}’/g, m => (VI.test(m) ? m : `[[${keep.push(m) - 1}]]`)); return { t, keep }; };
const restore = (t, keep) => t.replace(/\[\[\s*(\d+)\s*\]\]/g, (m, i) => keep[+i] ?? m);
const tokensOk = (a, b) => (a.match(/\[\[\d+\]\]/g) || []).length === (b.match(/\[\[\s*\d+\s*\]\]/g) || []).length;
// Ngân sách thời gian (CI): EXPLAIN_MIN=50 → dừng đúng hạn, lưu phần đã dịch, lần chạy sau làm tiếp
const DEADLINE = Date.now() + (process.env.EXPLAIN_MIN ? +process.env.EXPLAIN_MIN : 1e6) * 60000;
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function tr(lang, lines) {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=vi&tl=${lang}&dt=t&q=${encodeURIComponent(lines.join('\n'))}`;
  for (let k = 0; k < 4; k++) { try { const r = await fetch(url); if (r.ok) { const j = await r.json(); return j[0].map(x => x[0]).join('').split('\n'); } if (r.status === 429) await sleep(20000); } catch (e) { /* thử lại */ } await sleep(1500 * (k + 1)); }
  return null;
}
for (const lang of process.argv.slice(2)) {
  const file = path.join(ROOT, 'web/i18n/explain', lang + '.json');
  const old = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
  const out = {}, todo = [];
  for (const s of src) { const h = hash(s); if (old[h] && !VI.test(old[h])) out[h] = old[h]; else todo.push(s); }
  let ok = 0, fail = 0;
  for (let i = 0; i < todo.length && Date.now() < DEADLINE;) {
    const batch = []; let len = 0;
    while (i < todo.length && len < 1800) { batch.push(todo[i]); len += todo[i].length + 1; i++; }
    const prot = batch.map(s => protect(s.replace(/\n/g, ' ')));
    let res = await tr(lang, prot.map(p => p.t));
    if (!res || res.length !== batch.length) { res = []; for (const p of prot) { const r1 = await tr(lang, [p.t]); res.push(r1 ? r1.join(' ') : ''); await sleep(300); } }
    batch.forEach((s, j) => { const t = (res[j] || '').trim(); if (t && tokensOk(prot[j].t, t)) { out[hash(s)] = restore(t, prot[j].keep); ok++; } else fail++; });
    process.stdout.write(`\r${lang} ${i}/${todo.length}`); await sleep(400);
    if (ok && ok % 200 < batch.length) fs.writeFileSync(file, JSON.stringify(out)); // lưu dần, ngắt giữa chừng không mất
  }
  fs.writeFileSync(file, JSON.stringify(out));
  console.log(`\n✓ ${lang}: ${Object.keys(out).length}/${src.size} câu (mới ${ok}, lỗi ${fail} – lần chạy sau thử lại)`);
}
