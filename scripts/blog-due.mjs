// Liệt kê bài vừa đến giờ đăng (cho cron): now - since < publishAt ≤ now, bỏ draft. In mỗi URL một dòng.
// Dùng: node scripts/blog-due.mjs --since 70 [--base https://lexkite.com] [--json] [--all-live] [--now ISO] [--root content/blog]
// Luôn thoát mã 0 (không có bài → không in gì).
import { ROOT, config, loadPostsAt, publishTime, isLive, postUrl } from './lib/blog-content.mjs';

const a = process.argv.slice(2), opt = { since: 70, base: null, json: false, all: false, now: Date.now(), root: ROOT };
for (let i = 0; i < a.length; i++) {
  const k = a[i];
  if (k === '--since') opt.since = Number(a[++i]); else if (k === '--base') opt.base = a[++i]; else if (k === '--json') opt.json = true;
  else if (k === '--all-live') opt.all = true; else if (k === '--root') opt.root = a[++i]; else if (k === '--now') opt.now = Date.parse(a[++i]);
  else console.error(`⚠ bỏ qua tham số lạ: ${k}`);
}
let cfg = {}; try { cfg = config(); } catch {}
const base = (opt.base || cfg.site || 'https://lexkite.com').replace(/\/$/, ''), def = cfg.defaultLang || 'vi';
if (!Number.isFinite(opt.since) || !Number.isFinite(opt.now)) { console.error('⚠ --since/--now không hợp lệ'); process.exit(0); }
let posts = [];
try { posts = loadPostsAt(opt.root); } catch (e) { console.error(`⚠ không đọc được bài: ${e.message}`); }
const from = opt.now - opt.since * 60e3;
const due = posts.filter(p => isLive(p, opt.now) && (opt.all || publishTime(p) > from))
  .sort((x, y) => publishTime(x) - publishTime(y))
  .map(p => ({ url: postUrl(p, base, def), slug: p.slug, lang: p.lang, publishAt: p.publishAt }));
if (opt.json) console.log(JSON.stringify(due, null, 1)); else if (due.length) console.log(due.map(d => d.url).join('\n'));
