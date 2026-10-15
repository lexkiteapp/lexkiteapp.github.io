// Sinh web/js/lib/paraphrase-data.js (cặp [cụm câu hỏi, cách bài đọc diễn đạt lại]) từ lời giải đề Reading – để #/paraphrase
// chỉ tải vài chục KB thay vì cả bộ đề (~700 KB). Bỏ câu đáp án FALSE/NO/NOT GIVEN (mâu thuẫn/không có, không phải đồng nghĩa).
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), g = {};
const dir = path.join(ROOT, 'web/js/readtest');
for (const f of fs.readdirSync(dir)) if (f.endsWith('.js')) try { new Function('self', fs.readFileSync(path.join(dir, f), 'utf8'))(g); } catch (e) { /* bỏ qua */ }
const NEG = /^(FALSE|NO|NOT GIVEN)$/i, ans = {};
for (const tst of g.READTESTS || []) for (const p of tst.passages || []) for (const gr of p.groups || []) for (const it of gr.items || []) (ans[tst.id] = ans[tst.id] || {})[it.n] = Array.isArray(it.a) ? it.a[0] : it.a;
const out = [], seen = new Set();
for (const [tid, qs] of Object.entries(g.READ_EXPLAIN || {})) for (const [n, e] of Object.entries(qs)) {
  if (NEG.test(String((ans[tid] || {})[n] || ''))) continue;
  for (const [q, p] of e.keys || []) { const k = String(q).toLowerCase() + '|' + String(p).toLowerCase(); if (q && p && !seen.has(k) && q.toLowerCase() !== p.toLowerCase()) { seen.add(k); out.push([q, p]); } }
}
fs.writeFileSync(path.join(ROOT, 'web/js/lib/paraphrase-data.js'), `/* SINH TỰ ĐỘNG bởi scripts/gen-paraphrase.mjs – đừng sửa tay */\nself.PARAPHRASE = ${JSON.stringify(out)};\n`);
console.log(`✓ paraphrase: ${out.length} cặp`);
