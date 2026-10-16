// Kiểm tra lời giải đề thi dịch sẵn (web/i18n/explain/<lang>.json): mục tiêu ≥ 98% mỗi ngôn ngữ, không lẫn tiếng Việt, JSON hợp lệ.
// Lô đề mới làm tỉ lệ tạm tụt tới khi bot dịch đêm (i18n.yml) bù → 90–98% chỉ CẢNH BÁO (không chặn, không ai phải chờ/làm tay);
// < 90% = pipeline dịch hỏng thật → chặn. Thiếu lời giải tiếng Việt (nguồn) luôn chặn.
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'), g = {};
for (const d of ['listen', 'readtest', 'toeic', 'toefl']) for (const f of fs.readdirSync(path.join(ROOT, 'web/js', d))) if (f.endsWith('.js')) try { new Function('self', fs.readFileSync(path.join(ROOT, 'web/js', d, f), 'utf8'))(g); } catch (e) { /* bỏ qua */ }
const src = new Set(); JSON.stringify([g.LISTENING, g.READ_EXPLAIN, g.TOEIC, g.TOEFL], (k, v) => { if ((k === 'why' || k === 'explain') && typeof v === 'string' && v.trim()) src.add(v); return v; });
const hash = s => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); };
const VI = /[ăđơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i;
const langs = ['en', ...fs.readFileSync(path.join(ROOT, 'scripts/i18n-langs.txt'), 'utf8').split('\n').map(s => s.trim()).filter(s => s && !s.startsWith('#'))];
let bad = 0; const rows = [];
let warn = 0;
for (const l of langs) {
  const f = path.join(ROOT, 'web/i18n/explain', l + '.json'); if (!fs.existsSync(f)) { rows.push(`${l}: thiếu file`); bad++; continue; }
  const j = JSON.parse(fs.readFileSync(f, 'utf8')); let have = 0, vi = 0;
  for (const s of src) { const x = j[hash(s)]; if (x) { have++; if (VI.test(x)) vi++; } }
  const pct = have / src.size * 100; rows.push(`${l} ${pct.toFixed(1)}%${vi ? ` lẫn-Việt ${vi}` : ''}`);
  if (pct < 90 || vi > 2) bad++; else if (pct < 98) warn++;
}
// Mọi câu thi phải có lời giải (TOEIC/TOEFL/IELTS Listening: explain trong câu; IELTS Reading: READ_EXPLAIN)
const noEx = [];
JSON.stringify([g.TOEIC, g.TOEFL], (k, v) => { if (v && typeof v === 'object' && 'a' in v && 'n' in v && 'options' in v && !v.explain) noEx.push(v.n); return v; });
for (const p of g.LISTENING || []) for (const gr of p.groups || []) { if (gr.type === 'multi') { if (!gr.explain && !(gr.items || []).length) noEx.push(p.id + ':' + gr.n); } for (const it of gr.items || []) if (!it.explain) noEx.push(p.id + ':' + it.n); }
for (const t of g.READTESTS || []) for (const p of t.passages || []) for (const gr of p.groups || []) for (const it of gr.items || []) if (!((g.READ_EXPLAIN || {})[t.id] || {})[it.n]) noEx.push(t.id + ':' + it.n);
if (noEx.length) { bad++; rows.unshift(`thiếu lời giải ${noEx.length} câu (${noEx.slice(0, 5).join(', ')})`); }
console.log((bad ? '✗' : warn ? '⚠' : '✓') + ` explain: ${src.size} lời giải · ` + rows.join(' · ') + (warn && !bad ? ` · ${warn} ngôn ngữ < 98% – bot dịch đêm sẽ bù, không cần làm gì` : '')); process.exit(bad ? 1 : 0);
