// content/stories/*.json → web/cpack/stories/lib.js (self.STORIES_LIB, sắp theo cấp rồi id). Dùng: node scripts/stories/build-lib.mjs [--check]
// Chỉ giữ trường app cần (bỏ source.note dài…); nguồn bản quyền vẫn ở content/stories + cổng gate. Spec: docs/STORIES.md.
import fs from 'node:fs';
import { chapterKey, readState } from './render-audio.mjs';
const DIR = 'content/stories', OUT = 'web/cpack/stories/lib.js', LV = ['A1', 'A2', 'B1', 'B2', 'C1'];
const all = fs.readdirSync(DIR).filter(f => f.endsWith('.json')).map(f => JSON.parse(fs.readFileSync(`${DIR}/${f}`, 'utf8')))
  .sort((a, b) => LV.indexOf(a.level) - LV.indexOf(b.level) || a.id.localeCompare(b.id));
// chỉ trường app dùng (bỏ summary/cover.scene/source.* dài – vẫn ở content/stories): gói lười nhỏ nhất có thể
// audio Kokoro (CI dựng, scripts/stories/audio-state.json): chỉ nhận khi khóa khớp chữ hiện tại; chương chưa có → null (app tự đọc từng câu bằng UI.tts)
const AU = readState();
const audioOf = x => { const st = AU[x.id] || {}, ok = x.chapters.map((_, ci) => st[ci] && st[ci].key === chapterKey(x, ci) ? st[ci] : null), got = ok.filter(Boolean); return { wpm: got.length ? Math.round(got.reduce((n, o) => n + o.wpm, 0) / got.length) : x.audio.wpm, files: got.length ? ok.map(o => o && o.key) : null, marks: got.length ? ok.map(o => o && o.marks.map(m => +m[0].toFixed(1))) : null }; };
const slim = x => ({ id: x.id, kind: x.kind, level: x.level, title: x.title, cover: { cast: x.cover.cast }, audio: audioOf(x), speakers: x.speakers, chapters: x.chapters.map(c => ({ title: c.title, sentences: c.sentences, words: c.words, quiz: c.quiz })) });
const out = `/* FILE SINH TỰ ĐỘNG – scripts/stories/build-lib.mjs từ content/stories/*.json. Đừng sửa tay. Truyện & podcast theo cấp (docs/STORIES.md). */\nself.STORIES_LIB = ${JSON.stringify(all.map(slim))};\n`;
if (process.argv.includes('--check')) {
  if ((fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '') !== out) { console.error(`✗ ${OUT} cũ – chạy node scripts/stories/build-lib.mjs`); process.exit(1); }
  console.log(`✓ stories lib: ${all.length} mục`); process.exit(0);
}
fs.writeFileSync(OUT, out); console.log(`stories lib: ${all.length} mục → ${OUT} (${out.length} B)`);
