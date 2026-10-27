// Gold bank (content/video/scripts/bank/*.jsonl) → web/js/lesson/gold.js: chỉ mục THEO TỪ cho nút "Giải thích" của #/lesson (0 AI).
// Dùng: node scripts/lesson/build-gold.mjs [--check]  (--check: đỏ khi file sinh ra cũ hơn nguồn – chạy trong npm test)
import fs from 'node:fs';
import path from 'node:path';
const SRC = 'content/video/scripts/bank', OUT = 'web/js/lesson/gold.js';
const keyOf = pid => { const p = String(pid || '').split(':'); // u:v:consider:m0 · u:c:see-look-watch · w:sleeping bag#n · m:hang#v · p:x#n · u:p:cope:with
  if (p[0] === 'u') return p[1] === 'c' ? (p[2] || '').split('-') : [p[2]];
  if (['w', 'm', 'p'].includes(p[0])) return [String(p[1] || '').split('#')[0]];
  return []; };
const m = {};
for (const f of fs.readdirSync(SRC).filter(f => f.endsWith('.jsonl')).sort()) {
  for (const line of fs.readFileSync(path.join(SRC, f), 'utf8').split('\n')) {
    if (!line.trim()) continue; const d = JSON.parse(line);
    if (!d.why || !d.right) continue;
    for (const k of keyOf(d.pid).map(x => String(x || '').trim().toLowerCase()).filter(x => x.length > 1)) {
      const e = { why: d.why, w: d.wrong || '', r: d.right, ex: (d.ex || []).slice(0, 2), mem: (d.memory || '').replace(/🙂/g, '(+)').replace(/🙁/g, '(−)') }; // không emoji mặt (luật nhân vật: chỉ Ama/Carlos bank v2)
      (m[k] = m[k] || []).length < 2 && m[k].push(e);
    }
  }
}
const keys = Object.keys(m).sort(), body = {}; keys.forEach(k => { body[k] = m[k]; });
const out = `/* FILE SINH TỰ ĐỘNG – scripts/lesson/build-gold.mjs từ gold bank (${SRC}). Đừng sửa tay. Chỉ mục theo từ cho "Giải thích" của #/lesson (docs/LESSON-ENGINE.md). */\nself.LESSON_GOLD = ${JSON.stringify(body)};\n`;
if (process.argv.includes('--check')) {
  const cur = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
  if (cur !== out) { console.error(`✗ ${OUT} cũ – chạy node scripts/lesson/build-gold.mjs`); process.exit(1); }
  console.log(`✓ lesson gold: ${keys.length} từ`); process.exit(0);
}
fs.writeFileSync(OUT, out); console.log(`lesson gold: ${keys.length} từ → ${OUT} (${out.length} B)`);
