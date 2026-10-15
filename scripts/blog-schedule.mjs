// Xếp lịch hàng đợi: bài (không phải draft) có publishAt trống → 2–3 bài/ngày, giờ ngẫu nhiên 06:00–22:59 (giờ VN, +07:00),
// mỗi bài trong ngày một khung giờ khác nhau, phút ngẫu nhiên; bắt đầu từ ngày sau max(hôm nay, ngày cuối đã xếp).
// Thứ tự: theo briefs.json rồi theo tên file. Chỉ sửa dòng publishAt (setField).
// Bài không qua blog-check bị giữ lại (không vào lịch) trừ khi --no-check.
// Dùng: node scripts/blog-schedule.mjs [--dry] [--no-check] [--seed N] [--from YYYY-MM-DD] [--per 2-3] [--lang vi] [--status] [--root content/blog]
import fs from 'node:fs'; import path from 'node:path';
import { checkPosts } from './blog-check.mjs';
import { ROOT, setField, loadPostsAt, briefSlugs, publishTime } from './lib/blog-content.mjs';

const TZ = 7 * 3600e3, day = t => new Date(t + TZ).toISOString().slice(0, 10), hourOf = t => new Date(t + TZ).getUTCHours();
const addDays = (d, n) => new Date(Date.parse(d + 'T00:00:00Z') + n * 864e5).toISOString().slice(0, 10);
const opt = { check: true, dry: false, status: false, seed: null, from: null, per: [2, 3], root: ROOT };
const a = process.argv.slice(2);
for (let i = 0; i < a.length; i++) {
  const k = a[i];
  if (k === '--dry') opt.dry = true; else if (k === '--no-check') opt.check = false; else if (k === '--status') opt.status = true; else if (k === '--root') opt.root = a[++i];
  else if (k === '--lang') opt.lang = a[++i]; else if (k === '--seed') opt.seed = Number(a[++i]); else if (k === '--from') opt.from = a[++i];
  else if (k === '--per') { const m = String(a[++i]).match(/^(\d)(?:-(\d))?$/); if (!m) throw new Error('--per phải dạng 2 hoặc 2-3'); opt.per = [+m[1], +(m[2] || m[1])]; }
  else { console.error(`Tham số lạ: ${k}`); process.exit(2); }
}
if (opt.from && !/^\d{4}-\d{2}-\d{2}$/.test(opt.from)) { console.error('--from phải dạng YYYY-MM-DD'); process.exit(2); }
if (opt.per[0] < 1 || opt.per[1] > 17 || opt.per[0] > opt.per[1]) { console.error('--per ngoài khoảng 1–17'); process.exit(2); }

// PRNG mulberry32 (--seed → lặp lại được)
let s = (opt.seed ?? Date.now()) >>> 0;
const rnd = () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const int = (lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1));

const now = Date.now(), today = day(now);
const posts = loadPostsAt(opt.root).filter(p => p.status !== 'draft');
if (opt.lang) posts.splice(0, posts.length, ...posts.filter(p => p.lang === opt.lang)); // mỗi ngôn ngữ có nhịp đăng riêng
const scheduled = posts.filter(p => !isNaN(publishTime(p)));
let queue = posts.filter(p => !p.publishAt);
if (opt.check && queue.length && !opt.status) {
  const { errors } = checkPosts(queue, { all: posts, root: opt.root }), failed = new Set(errors.map(e => e.slice(0, e.indexOf(': ['))));
  queue = queue.filter(p => { const bad = [...failed].some(f => path.resolve(f) === path.resolve(p.file)); if (bad) console.log(`⚠ ${p.file}: chưa qua blog-check – không xếp lịch (chạy node scripts/blog-check.mjs ${p.file})`); return !bad; });
}
const bad = posts.filter(p => p.publishAt && isNaN(publishTime(p)));
for (const p of bad) console.log(`⚠ ${p.file}: publishAt "${p.publishAt}" không hợp lệ – bỏ qua`);

if (opt.status) {
  const live = scheduled.filter(p => publishTime(p) <= now), cal = new Map();
  for (const p of scheduled) if (publishTime(p) > now) { const d = day(publishTime(p)); cal.set(d, [...(cal.get(d) || []), p]); }
  console.log(`Đã đăng: ${live.length} · Chờ đăng: ${scheduled.length - live.length} · Hàng đợi (chưa xếp): ${queue.length} · Draft: ${loadPostsAt(opt.root).length - posts.length}`);
  for (const [d, l] of [...cal].sort()) console.log(`${d}  ${l.length}  ${l.sort((x, y) => publishTime(x) - publishTime(y)).map(p => new Date(publishTime(p) + TZ).toISOString().slice(11, 16) + ' ' + p.slug).join(' · ')}`);
  if (!cal.size) console.log('(không có bài nào chờ đăng)');
  process.exit(0);
}
if (!queue.length) { console.log('✓ Hàng đợi trống – không có bài nào cần xếp lịch'); process.exit(0); }

const order = new Map(briefSlugs(opt.root).map((s, i) => [s, i]));
queue.sort((x, y) => (order.get(x.slug) ?? 1e9) - (order.get(y.slug) ?? 1e9) || path.basename(x.file).localeCompare(path.basename(y.file)));
const lastDay = scheduled.reduce((m, p) => (day(publishTime(p)) > m ? day(publishTime(p)) : m), today);
let d = opt.from || addDays(lastDay, 1);
// Giờ đã có bài trong từng ngày (khi --from chồng lên ngày đã xếp)
const used = new Map(); for (const p of scheduled) { const k = day(publishTime(p)); used.set(k, [...(used.get(k) || []), hourOf(publishTime(p))]); }
const rows = [];
for (let q = 0; q < queue.length; d = addDays(d, 1)) {
  const taken = used.get(d) || [], free = Array.from({ length: 17 }, (_, i) => i + 6).filter(h => !taken.includes(h));
  const n = Math.min(Math.max(0, int(...opt.per) - taken.length), free.length, queue.length - q);
  for (let i = free.length - 1; i > 0; i--) { const j = int(0, i); [free[i], free[j]] = [free[j], free[i]]; }
  for (const h of free.slice(0, n).sort((x, y) => x - y)) {
    const p = queue[q++], iso = `${d}T${String(h).padStart(2, '0')}:${String(int(0, 59)).padStart(2, '0')}:00+07:00`;
    rows.push({ p, iso });
  }
}
for (const { p, iso } of rows) {
  console.log(`${iso.slice(0, 10)} ${iso.slice(11, 16)}  ${p.lang}/${p.slug}`);
  if (!opt.dry) { const src = fs.readFileSync(p.file, 'utf8'); fs.writeFileSync(p.file, setField(src, 'publishAt', iso)); }
}
const days = new Set(rows.map(r => r.iso.slice(0, 10)));
console.log(`${opt.dry ? '(thử – chưa ghi) ' : '✓ '}${rows.length} bài → ${days.size} ngày, ${[...days][0]} … ${[...days].at(-1)}${opt.seed != null ? ` (seed ${opt.seed})` : ''}`);
