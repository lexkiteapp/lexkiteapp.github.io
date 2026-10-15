// Quy trình blog A→Z một lệnh (phần máy làm được; phần viết dùng mẫu lệnh trong content/blog/prompts/ cho AI/người viết).
//   node scripts/blog-pipeline.mjs new <slug> [--lang vi]           → tạo khung bài (status: draft) từ briefs.json
//   node scripts/blog-pipeline.mjs localize <slug> --to en [--as <slug-mới>] → tạo bản địa hóa nháp (cùng translationKey)
//   node scripts/blog-pipeline.mjs gate [file…]                      → chính tả + SEO on-page + trùng lặp (cổng chất lượng)
//   node scripts/blog-pipeline.mjs queue [--seed N]                  → gate toàn bộ rồi xếp lịch bài ready chưa có publishAt
//   node scripts/blog-pipeline.mjs status                            → số bài theo ngôn ngữ/trạng thái + lịch sắp tới
import fs from 'node:fs'; import path from 'node:path'; import { execFileSync } from 'node:child_process';
import { loadPosts, parse, setField, ROOT, CATEGORIES } from './lib/blog-content.mjs';
const [cmd, ...args] = process.argv.slice(2), opt = k => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const run = (f, a = []) => { try { execFileSync('node', [f, ...a], { stdio: 'inherit' }); return true; } catch (e) { return false; } };
const briefs = () => JSON.parse(fs.readFileSync(`${ROOT}/briefs.json`, 'utf8')).briefs;

if (cmd === 'new') {
  const slug = args[0], lang = opt('--lang') || 'vi', b = briefs().find(x => x.slug === slug);
  if (!b) { console.error(`✗ Chưa có brief "${slug}" trong ${ROOT}/briefs.json – viết brief trước (prompts/1-brief.md)`); process.exit(1); }
  const f = `${ROOT}/${lang}/${slug}.md`; if (fs.existsSync(f)) { console.error(`✗ ${f} đã tồn tại`); process.exit(1); }
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, `---\ntitle: ""\ndescription: ""\nslug: ${slug}\nlang: ${lang}\ntranslationKey: ${slug}\ncategory: ${b.category}\ntags: [${b.tags.join(', ')}]\nkeyword: "${b.keyword}"\ncover: ${b.shots[0]}\ncoverAlt: ""\npublishAt:\nfactChecked:\nqualityScore:\nauthor: Lexkite\nstatus: draft\n---\n<!-- Brief: ${b.angle} · ảnh: ${b.shots.join(', ')} · app: ${b.routes.join(', ')} -->\n<!-- Viết theo content/blog/prompts/3-write.md, rồi 4-factcheck.md, 6-review.md; xong đổi status: ready -->\n`);
  console.log(`✓ Tạo ${f} (status: draft)`);
} else if (cmd === 'localize') {
  const slug = args[0], to = opt('--to'), as = opt('--as') || slug, src = loadPosts().find(p => p.slug === slug && p.lang !== to);
  if (!src || !to) { console.error('✗ Dùng: localize <slug> --to <lang> [--as <slug-mới>]'); process.exit(1); }
  const f = `${ROOT}/${to}/${as}.md`; if (fs.existsSync(f)) { console.error(`✗ ${f} đã tồn tại`); process.exit(1); }
  fs.mkdirSync(path.dirname(f), { recursive: true });
  let s = fs.readFileSync(src.file, 'utf8');
  for (const [k, v] of [['slug', as], ['lang', to], ['translationKey', src.translationKey || src.slug], ['publishAt', ''], ['factChecked', ''], ['qualityScore', ''], ['status', 'draft'], ['title', '""'], ['description', '""'], ['keyword', '""'], ['coverAlt', '""']]) s = setField(s, k, v);
  const end = s.indexOf('\n---', 4) + 4;
  s = s.slice(0, end) + `\n<!-- TODO-LOCALIZE: viết lại cho người đọc ${to} theo content/blog/prompts/5-localize.md (từ khóa bản địa, ví dụ & lỗi của người học nước đó). Bản gốc ${src.lang} bên dưới chỉ để tham khảo – xóa sau khi viết. -->\n` + s.slice(end);
  fs.writeFileSync(f, s); console.log(`✓ Tạo ${f} (draft, translationKey=${src.translationKey || src.slug}) – ảnh dùng chung, chỉ viết lại alt/chú thích`);
} else if (cmd === 'gate') {
  const ok = [run('scripts/vi-lint.mjs'), run('scripts/blog-check.mjs', args), run('scripts/blog-dupes.mjs', args)].every(Boolean);
  console.log(ok ? '✓ Cổng chất lượng: ĐẠT' : '✗ Cổng chất lượng: CHƯA ĐẠT – sửa lỗi trên rồi chạy lại'); process.exit(ok ? 0 : 1);
} else if (cmd === 'queue') {
  if (![run('scripts/vi-lint.mjs'), run('scripts/blog-check.mjs'), run('scripts/blog-dupes.mjs')].every(Boolean)) { console.error('✗ Chưa xếp lịch vì cổng chất lượng chưa đạt'); process.exit(1); }
  run('scripts/blog-schedule.mjs', opt('--seed') ? ['--seed', opt('--seed')] : []);
} else if (cmd === 'status') {
  const P = loadPosts(), now = Date.now(), by = {};
  for (const p of P) { const k = `${p.lang}`; by[k] ||= { draft: 0, queued: 0, scheduled: 0, live: 0 }; const t = Date.parse(p.publishAt); by[k][p.status === 'draft' ? 'draft' : !p.publishAt ? 'queued' : t <= now ? 'live' : 'scheduled']++; }
  for (const [l, c] of Object.entries(by)) console.log(`${l}: ${c.live} đã đăng · ${c.scheduled} đã xếp lịch · ${c.queued} chờ xếp · ${c.draft} nháp`);
  run('scripts/blog-schedule.mjs', ['--status']);
} else {
  console.log(fs.readFileSync(new URL(import.meta.url), 'utf8').split('\n').filter(l => l.startsWith('//')).join('\n'));
}
