// Truyện + Radio (content/lesson/stories.json) → web/js/lesson/stories.js, có kiểm lược đồ (đủ 15 ngôn ngữ cho cặp ghép, đáp án hợp lệ…).
// Dùng: node scripts/lesson/build-stories.mjs [--check]  (--check: đỏ khi lỗi lược đồ hoặc file sinh ra cũ – chạy trong test/lesson.mjs)
import fs from 'node:fs';
const SRC = 'content/lesson/stories.json', OUT = 'web/js/lesson/stories.js';
const LANGS = ['en', 'vi', ...fs.readFileSync('scripts/i18n-langs.txt', 'utf8').split('\n').map(s => s.trim()).filter(s => s && !s.startsWith('#'))];
const J = JSON.parse(fs.readFileSync(SRC, 'utf8')), err = [], ids = new Set();
for (const s of J.items) {
  const at = m => err.push(`${s.id}: ${m}`);
  if (!/^[rs]-[a-z0-9-]+$/.test(s.id) || ids.has(s.id)) at('id sai/trùng'); ids.add(s.id);
  if (!['story', 'radio'].includes(s.kind)) at('kind');
  if (!s.title || !s.em || !/^A[12]|B[12]$/.test(s.cefr || '')) at('title/em/cefr');
  if (!(s.lines || []).length || s.lines.some(l => !['ama', 'carlos'].includes(l.who) || !l.en || /\s{2}|^\s|\s$/.test(l.en))) at('lines');
  for (const c of s.checks || []) {
    if (!(c.at >= 0 && c.at < s.lines.length)) at('check.at ngoài câu');
    if (c.type === 'tap') { const l = s.lines[c.line]; if (!l || c.line > c.at) at('tap.line'); else if (l.en.split(/\s+/).length > 10) at('tap: câu > 10 từ'); }
    else if (c.type === 'q') { if (!c.q || (c.options || []).length < 3 || !(c.answer >= 0 && c.answer < c.options.length)) at('q'); }
    else if (c.type === 'match') { if ((c.pairs || []).length < 4) at('match < 4 cặp'); for (const p of c.pairs || []) for (const L of LANGS) if (!p.m || !p.m[L]) at(`match "${p.en}" thiếu ${L}`); }
    else at('check.type');
  }
  if (!(s.checks || []).length) at('không có câu kiểm');
}
if (err.length) { console.error('✗ stories:\n  ' + err.join('\n  ')); process.exit(1); }
const out = `/* FILE SINH TỰ ĐỘNG – scripts/lesson/build-stories.mjs từ ${SRC}. Đừng sửa tay. Truyện + Radio của #/lesson (docs/LESSON-ENGINE.md §2c). */\nself.LESSON_STORIES = ${JSON.stringify(J.items)};\n`;
if (process.argv.includes('--check')) {
  if ((fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '') !== out) { console.error(`✗ ${OUT} cũ – chạy node scripts/lesson/build-stories.mjs`); process.exit(1); }
  console.log(`✓ stories: ${J.items.length} bài`); process.exit(0);
}
fs.writeFileSync(OUT, out); console.log(`stories: ${J.items.filter(s => s.kind === 'story').length} truyện + ${J.items.filter(s => s.kind === 'radio').length} radio → ${OUT} (${out.length} B)`);
