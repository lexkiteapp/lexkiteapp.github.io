// Quy trình blog A→Z một lệnh (phần máy làm được; phần viết dùng mẫu lệnh trong content/blog/prompts/ cho AI/người viết).
//   node scripts/blog-pipeline.mjs new <slug> [--lang vi]           → tạo khung bài (status: draft) từ briefs.json
//   node scripts/blog-pipeline.mjs localize <slug> --to en [--as <slug-mới>] → tạo bản địa hóa nháp (cùng translationKey)
//   node scripts/blog-pipeline.mjs gate [file…]                      → chính tả + SEO on-page + trùng lặp (cổng chất lượng)
//   node scripts/blog-pipeline.mjs queue [--seed N]                  → gate toàn bộ rồi xếp lịch bài ready chưa có publishAt
//   node scripts/blog-pipeline.mjs status                            → số bài theo ngôn ngữ/trạng thái + lịch sắp tới
//   node scripts/blog-pipeline.mjs health [--json] [--days 7]        → cảnh báo: ngôn ngữ sắp hết bài chờ đăng, bài kiểm chứng > 12 tháng
//   node scripts/blog-pipeline.mjs links [--lang vi]                 → gợi ý liên kết nội bộ cho bài mồ côi / ít link (nguồn → đích)
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
  for (const l of [...new Set(loadPosts().map(p => p.lang))]) run('scripts/blog-schedule.mjs', ['--lang', l, ...(opt('--seed') ? ['--seed', opt('--seed')] : [])]); // mỗi ngôn ngữ một nhịp đăng
} else if (cmd === 'status') {
  const P = loadPosts(), now = Date.now(), by = {};
  for (const p of P) { const k = `${p.lang}`; by[k] ||= { draft: 0, queued: 0, scheduled: 0, live: 0 }; const t = Date.parse(p.publishAt); by[k][p.status === 'draft' ? 'draft' : !p.publishAt ? 'queued' : t <= now ? 'live' : 'scheduled']++; }
  for (const [l, c] of Object.entries(by)) console.log(`${l}: ${c.live} đã đăng · ${c.scheduled} đã xếp lịch · ${c.queued} chờ xếp · ${c.draft} nháp`);
  run('scripts/blog-schedule.mjs', ['--status']);
} else if (cmd === 'health') {
  const P = loadPosts().filter(p => p.status !== 'draft'), now = Date.now(), days = +(opt('--days') || 7), out = [];
  for (const l of [...new Set(P.map(p => p.lang))]) {
    const last = Math.max(0, ...P.filter(p => p.lang === l && p.publishAt).map(p => Date.parse(p.publishAt)));
    const left = Math.floor((last - now) / 864e5);
    if (left < days) out.push(`${l}: chỉ còn ${Math.max(left, 0)} ngày bài chờ đăng (< ${days}) – viết thêm bài (prompts/1-brief → 6-review) rồi để status: ready`);
  }
  for (const p of P) if (p.factChecked && now - Date.parse(p.factChecked) > 365 * 864e5) out.push(`${p.lang}/${p.slug}: kiểm chứng từ ${p.factChecked} (> 12 tháng) – rà lại theo prompts/4-factcheck.md, cập nhật updated + factChecked`);
  if (args.includes('--json')) console.log(JSON.stringify(out)); else console.log(out.length ? out.map(x => '⚠ ' + x).join('\n') : '✓ Blog khỏe: đủ bài chờ đăng, không bài nào quá hạn kiểm chứng');
} else if (cmd === 'links') {
  // Gợi ý nối link: bài có < 3 bài trỏ tới ← nguồn cùng ngôn ngữ liên quan nhất (cùng chuyên mục/thẻ), mỗi nguồn ≤ 2 gợi ý
  const P = loadPosts().filter(p => p.status !== 'draft' && (!opt('--lang') || p.lang === opt('--lang')));
  const out = p => new Set([...p.body.matchAll(/\]\(\/(?:[a-z]{2}(?:-[a-z]+)?\/)?blog\/([^/)#?]+)\//g)].map(m => m[1]));
  const inb = new Map(P.map(p => [`${p.lang}/${p.slug}`, 0])); for (const p of P) for (const s of out(p)) { const k = `${p.lang}/${s}`; if (inb.has(k)) inb.set(k, inb.get(k) + 1); }
  const sc = (a, b) => (a.category === b.category ? 2 : 0) + (a.tags || []).filter(t => (b.tags || []).includes(t)).length * 3, used = new Map(); let n = 0;
  for (const t of P) { let need = 3 - inb.get(`${t.lang}/${t.slug}`); if (need <= 0) continue;
    for (const [, s] of P.filter(s => s !== t && s.lang === t.lang && !out(s).has(t.slug)).map(s => [sc(s, t) - (used.get(s.slug) || 0) * 2, s]).sort((a, b) => b[0] - a[0]).slice(0, need)) { console.log(`${s.file}  →  /${t.lang}/blog/${t.slug}/  (${t.title})`); used.set(s.slug, (used.get(s.slug) || 0) + 1); n++; } }
  console.log(n ? `${n} gợi ý: thêm 1 câu/cụm có link tự nhiên trong bài nguồn` : '✓ Mọi bài đều có ≥ 3 bài khác trỏ tới');
} else {
  console.log(fs.readFileSync(new URL(import.meta.url), 'utf8').split('\n').filter(l => l.startsWith('//')).join('\n'));
}
