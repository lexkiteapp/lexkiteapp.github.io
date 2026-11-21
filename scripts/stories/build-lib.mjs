// content/stories/*.json → web/cpack/stories/lib.js (self.STORIES_LIB, sắp theo cấp rồi id). Dùng: node scripts/stories/build-lib.mjs [--check]
// Chỉ giữ trường app cần (bỏ source.note dài…); nguồn bản quyền vẫn ở content/stories + cổng gate. Spec: docs/STORIES.md.
import fs from 'node:fs';
const DIR = 'content/stories', OUT = 'web/cpack/stories/lib.js', LV = ['A1', 'A2', 'B1', 'B2', 'C1'];
const all = fs.readdirSync(DIR).filter(f => f.endsWith('.json')).map(f => JSON.parse(fs.readFileSync(`${DIR}/${f}`, 'utf8')))
  .sort((a, b) => LV.indexOf(a.level) - LV.indexOf(b.level) || a.id.localeCompare(b.id));
const slim = x => ({ id: x.id, kind: x.kind, level: x.level, title: x.title, summary: x.summary, cover: x.cover, audio: x.audio, speakers: x.speakers, source: { type: x.source.type, work: x.source.work, author: x.source.author }, chapters: x.chapters });
const out = `/* FILE SINH TỰ ĐỘNG – scripts/stories/build-lib.mjs từ content/stories/*.json. Đừng sửa tay. Truyện & podcast theo cấp (docs/STORIES.md). */\nself.STORIES_LIB = ${JSON.stringify(all.map(slim))};\n`;
if (process.argv.includes('--check')) {
  if ((fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '') !== out) { console.error(`✗ ${OUT} cũ – chạy node scripts/stories/build-lib.mjs`); process.exit(1); }
  console.log(`✓ stories lib: ${all.length} mục`); process.exit(0);
}
fs.writeFileSync(OUT, out); console.log(`stories lib: ${all.length} mục → ${OUT} (${out.length} B)`);
