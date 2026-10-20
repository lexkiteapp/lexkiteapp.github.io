// Soát alt/chú thích ảnh chụp dùng chung theo content/blog/shot-facts.json (cùng luật [caption-truth]/[caption-exam] của blog-check).
// Dùng: node scripts/blog-captions.mjs [file.md …] [--lang fr] [--warn]          (luật từ khóa – nhanh, không mạng)
//       node scripts/blog-captions.mjs [file.md …] [--lang fr] --ai [--limit 200]  (thêm ý kiến thứ hai của Gemini: so alt/caption với desc trong shots.json)
// --ai CHỈ chạy tay (không nằm trong npm test): khóa Gemini xoay vòng lấy từ env GEMINI_KEYS hoặc D1 (scripts/video/library.mjs → loadGeminiKeys).
// Không có file → mọi bài không phải draft. Thoát 1 nếu có lỗi (hoặc AI đánh dấu sai).
import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { loadFacts, postCaptionIssues } from './lib/blog-captions.mjs';
import { loadPostsAt, readPost, ROOT } from './lib/blog-content.mjs';

const args = process.argv.slice(2), flag = k => args.includes(k), val = k => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const files = args.filter((a, i) => a.endsWith('.md') && !['--lang', '--limit'].includes(args[i - 1]));
const lang = val('--lang'), limit = +(val('--limit') || 300);
const F = loadFacts();
const posts = (files.length ? files.map(readPost) : loadPostsAt(ROOT).filter(p => p.status !== 'draft')).filter(p => !lang || p.lang === lang);

let errors = 0, warns = 0; const items = [];
for (const p of posts) for (const r of postCaptionIssues(F, p)) {
  items.push({ file: `${p.lang}/${p.slug}.md:${r.line}`, lang: p.lang, id: r.id, alt: r.alt, caption: r.caption });
  for (const x of r.issues) { if (x.level === 'error') errors++; else warns++; if (x.level === 'error' || flag('--warn')) console.log(`${x.level === 'error' ? '✗' : '⚠'} ${p.lang}/${p.slug}.md:${r.line} [${x.rule}] ${x.msg}`); }
}
console.log(`${errors ? '✗' : '✓'} caption truth: ${posts.length} bài, ${items.length} ảnh dùng chung, ${errors} lỗi, ${warns} cảnh báo`);

// ——— Ý kiến thứ hai bằng AI (tay) ———
const AI_PROMPT = rows => `You audit image ALT texts and CAPTIONS in a language-learning blog. Each image is a screenshot of the Lexkite app.
TRUTH = what the screenshot actually shows (Vietnamese description from shots.json). The ALT must describe only what is on the screen.
The CAPTION may add how the reader can use that screen for the article's topic, but must NOT claim features, modes, exam names, results or promises the screen does not show
(e.g. a timer/timed mode, grammar drills on a vocabulary quiz, "never forget", AI/real-time scoring, a different exam than the screen's, a different screen).
For each item return {"i": <index>, "ok": true|false, "claim": "<the unsupported claim in English, empty if ok>"}. Be strict but do not flag reasonable usage advice.
Answer ONLY with a JSON array.
ITEMS:
${rows.map((r, i) => JSON.stringify({ i, lang: r.lang, screen: r.id, truth: F.desc?.[r.id] || '', alt: r.alt, caption: r.caption })).join('\n')}`;

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  let aiBad = 0;
  if (flag('--ai')) {
    const { loadGeminiKeys, gemini } = await import('./video/library.mjs');
    const keys = loadGeminiKeys();
    if (!keys.length) { console.log('⚠ --ai: không có khóa Gemini (đặt GEMINI_KEYS hoặc ~/.config/lexkite/cf-token để đọc D1) – bỏ qua'); }
    else {
      const todo = items.filter(r => r.alt.trim() || r.caption.trim()).slice(0, limit); let asked = 0;
      for (let k = 0; k < todo.length; k += 25) {
        const batch = todo.slice(k, k + 25); let out = null;
        try { out = JSON.parse((await gemini([{ text: AI_PROMPT(batch) }], keys)) || 'null'); } catch (e) { console.log(`⚠ AI lô ${k / 25 + 1}: ${e.message.slice(0, 120)}`); }
        if (!Array.isArray(out)) { console.log(`⚠ AI lô ${k / 25 + 1}: không có kết quả (hết hạn mức?) – dừng`); break; }
        asked += batch.length;
        for (const o of out) { const r = batch[o.i]; if (r && o.ok === false) { aiBad++; console.log(`🤖 ${r.file} media:${r.id} – ${o.claim}\n    alt: ${r.alt}\n    caption: ${r.caption}`); } }
      }
      console.log(`${aiBad ? '✗' : asked < todo.length ? '⚠' : '✓'} AI: ${asked}/${todo.length} ảnh đã hỏi, ${aiBad} nghi bịa (duyệt tay rồi sửa theo shots.json; từ khóa lặp lại thì thêm vào shot-facts.json)`);
    }
  }
  process.exit(errors || aiBad ? 1 : 0);
}
