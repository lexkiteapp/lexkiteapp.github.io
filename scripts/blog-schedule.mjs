// Lịch đăng thông minh (mỗi ngôn ngữ một nhịp riêng):
//  • tối đa --per bài/ngôn ngữ/ngày (mặc định 1), giờ ngẫu nhiên 07:00–21:59 theo MÚI GIỜ NƯỚC ĐÓ (config.json → timezones)
//  • cùng cụm từ khóa (brief.cluster | front matter cluster | translationKey) cách nhau ≥ 7 ngày trong cùng ngôn ngữ (chống ăn thịt từ khóa)
//  • xếp theo thứ tự briefs.json (bài trụ cột trước vệ tinh), lấp ngày trống sớm nhất; chỉ sửa dòng publishAt
//  • bài không qua blog-check bị giữ lại (không vào lịch) trừ khi --no-check
// Dùng: node scripts/blog-schedule.mjs [--lang vi] [--per 1] [--from YYYY-MM-DD] [--seed N] [--dry] [--no-check]
//                                      [--reflow]   xếp lại cả bài đã có lịch nhưng chưa đăng theo luật mới
//                                      [--verify]   chỉ kiểm lịch hiện có (≤ per/ngày/ngôn ngữ, cụm cách ≥ 7 ngày) – lỗi → exit 1
//                                      [--status]   in lịch sắp tới
//                                      [--space auto|N] [--horizon 21]  khoảng cách tối thiểu (ngày) giữa 2 bài cùng ngôn ngữ; auto = rải kho bài
//                                                   của ngôn ngữ đó đều trong ~horizon ngày (1–3 ngày/bài) thay vì dồn vài ngày rồi bỏ trống
//  • giờ đăng: khung đọc cao điểm địa phương (07–09, 12, 19–21 giờ) thay vì ngẫu nhiên cả ngày
import fs from 'node:fs'; import path from 'node:path';
import { checkPosts } from './blog-check.mjs';
import { ROOT, setField, loadPostsAt, publishTime, config } from './lib/blog-content.mjs';

const opt = { check: true, dry: false, status: false, verify: false, reflow: false, seed: null, from: null, per: 1, root: ROOT, gap: 7, space: 'auto', horizon: 21 };
const a = process.argv.slice(2);
for (let i = 0; i < a.length; i++) {
  const k = a[i];
  if (k === '--dry') opt.dry = true; else if (k === '--no-check') opt.check = false; else if (k === '--status') opt.status = true;
  else if (k === '--verify') opt.verify = true; else if (k === '--reflow') opt.reflow = true; else if (k === '--root') opt.root = a[++i];
  else if (k === '--space') opt.space = a[++i]; else if (k === '--horizon') opt.horizon = Number(a[++i]) || 21;
  else if (k === '--lang') opt.lang = a[++i]; else if (k === '--seed') opt.seed = Number(a[++i]); else if (k === '--from') opt.from = a[++i];
  else if (k === '--per') { opt.per = Number(String(a[++i]).split('-').pop()); if (!(opt.per >= 1 && opt.per <= 15)) { console.error('--per phải 1–15'); process.exit(2); } }
  else { console.error(`Tham số lạ: ${k}`); process.exit(2); }
}
if (opt.from && !/^\d{4}-\d{2}-\d{2}$/.test(opt.from)) { console.error('--from phải dạng YYYY-MM-DD'); process.exit(2); }

let s = (opt.seed ?? Date.now()) >>> 0; // PRNG mulberry32 (--seed → lặp lại được)
const rnd = () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const int = (lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1));

// Múi giờ theo ngôn ngữ (IANA) → ngày địa phương + độ lệch giờ (tính cả giờ mùa hè)
const C = config(), ZONES = { vi: 'Asia/Ho_Chi_Minh', ...(C.timezones || {}) };
const zone = l => ZONES[l] || 'UTC';
const localDay = (t, l) => new Intl.DateTimeFormat('en-CA', { timeZone: zone(l), year: 'numeric', month: '2-digit', day: '2-digit' }).format(t);
const offsetMin = (d, l) => { const t = Date.parse(d + 'T12:00:00Z'), p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: zone(l), hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' }).formatToParts(t).map(x => [x.type, x.value])); return Math.round((Date.UTC(+p.year, p.month - 1, +p.day, +p.hour, +p.minute) - t) / 6e4); };
const fmtOff = m => `${m < 0 ? '-' : '+'}${String(Math.floor(Math.abs(m) / 60)).padStart(2, '0')}:${String(Math.abs(m) % 60).padStart(2, '0')}`;
const addDays = (d, n) => new Date(Date.parse(d + 'T00:00:00Z') + n * 864e5).toISOString().slice(0, 10);
const diffDays = (x, y) => Math.round((Date.parse(x) - Date.parse(y)) / 864e5);

const briefs = JSON.parse(fs.readFileSync(path.join(opt.root, 'briefs.json'), 'utf8')).briefs || [];
const order = new Map(briefs.map((b, i) => [`${b.lang || 'vi'}/${b.slug}`, i])), bcluster = new Map(briefs.map(b => [`${b.lang || 'vi'}/${b.slug}`, b.cluster]));
const cluster = p => bcluster.get(`${p.lang}/${p.slug}`) || p.cluster || p.translationKey || p.slug;

const now = Date.now(), all = loadPostsAt(opt.root).filter(p => p.status !== 'draft');
const posts = opt.lang ? all.filter(p => p.lang === opt.lang) : all;
for (const p of posts.filter(p => p.publishAt && isNaN(publishTime(p)))) console.log(`⚠ ${p.file}: publishAt "${p.publishAt}" không hợp lệ – bỏ qua`);

// ——— Kiểm lịch ———
function verify(list) {
  const out = [], byLang = new Map();
  for (const p of list.filter(p => publishTime(p) > now)) (byLang.get(p.lang) || byLang.set(p.lang, []).get(p.lang)).push(p);
  for (const [l, arr] of byLang) {
    const perDay = new Map(); for (const p of arr) { const d = localDay(publishTime(p), l); perDay.set(d, [...(perDay.get(d) || []), p.slug]); }
    for (const [d, ss] of perDay) if (ss.length > opt.per) out.push(`${l} ${d}: ${ss.length} bài (> ${opt.per}/ngày): ${ss.join(', ')}`);
    const byC = new Map(); for (const p of all.filter(p => p.lang === l && !isNaN(publishTime(p)))) (byC.get(cluster(p)) || byC.set(cluster(p), []).get(cluster(p))).push(p);
    for (const [c, ps] of byC) { ps.sort((x, y) => publishTime(x) - publishTime(y)); for (let i = 1; i < ps.length; i++) if (publishTime(ps[i]) > now && diffDays(localDay(publishTime(ps[i]), l), localDay(publishTime(ps[i - 1]), l)) < opt.gap) out.push(`${l} cụm "${c}": ${ps[i - 1].slug} → ${ps[i].slug} cách < ${opt.gap} ngày`); }
  }
  return out;
}
if (opt.verify) { const v = verify(posts); for (const x of v) console.log('✗ ' + x); console.log(v.length ? `✗ blog-schedule --verify: ${v.length} vi phạm` : '✓ blog-schedule --verify: lịch hợp lệ (≤ ' + opt.per + ' bài/ngôn ngữ/ngày, cụm cách ≥ ' + opt.gap + ' ngày)'); process.exit(v.length ? 1 : 0); }

if (opt.status) {
  const fut = posts.filter(p => publishTime(p) > now).sort((x, y) => publishTime(x) - publishTime(y));
  console.log(`Đã đăng: ${posts.filter(p => publishTime(p) <= now).length} · Chờ đăng: ${fut.length} · Hàng đợi (chưa xếp): ${posts.filter(p => !p.publishAt).length} · Draft: ${loadPostsAt(opt.root).length - all.length}`);
  const cal = new Map(); for (const p of fut) { const d = localDay(publishTime(p), p.lang); cal.set(d, [...(cal.get(d) || []), `${p.lang}/${p.slug}`]); }
  for (const [d, l] of [...cal].sort()) console.log(`${d}  ${l.length}  ${l.join(' · ')}`);
  process.exit(0);
}

// ——— Xếp lịch ———
let queue = posts.filter(p => !p.publishAt || (opt.reflow && publishTime(p) > now));
if (opt.check && queue.length) {
  const { errors } = checkPosts(queue.filter(p => !p.publishAt), { all, root: opt.root }), failed = errors.map(e => path.resolve(e.slice(0, e.indexOf(': ['))));
  queue = queue.filter(p => { const bad = failed.includes(path.resolve(p.file)); if (bad) console.log(`⚠ ${p.file}: chưa qua blog-check – không xếp lịch`); return !bad; });
}
if (!queue.length) { console.log('✓ Hàng đợi trống – không có bài nào cần xếp lịch'); process.exit(0); }
queue.sort((x, y) => (publishTime(x) || 9e15) - (publishTime(y) || 9e15) || (order.get(`${x.lang}/${x.slug}`) ?? 1e9) - (order.get(`${y.lang}/${y.slug}`) ?? 1e9) || x.file.localeCompare(y.file));
const qset = new Set(queue), rows = [];
for (const l of [...new Set(queue.map(p => p.lang))]) {
  const fixed = all.filter(p => p.lang === l && !qset.has(p) && !isNaN(publishTime(p)));
  const count = new Map(), cdays = new Map();
  const mark = (d, c) => { count.set(d, (count.get(d) || 0) + 1); cdays.set(c, [...(cdays.get(c) || []), d]); };
  for (const p of fixed) mark(localDay(publishTime(p), l), cluster(p));
  const start = opt.from || addDays(localDay(now, l), 1), mine = queue.filter(p => p.lang === l);
  const space = opt.space === 'auto' ? Math.max(1, Math.min(3, Math.floor(opt.horizon / Math.max(1, mine.length + fixed.filter(p => publishTime(p) > now).length)))) : Math.max(1, Number(opt.space) || 1);
  const near = d => [...count.keys()].some(x => (count.get(x) || 0) > 0 && x !== d && Math.abs(diffDays(d, x)) < space);
  for (const p of mine) {
    let d = start; const c = cluster(p);
    while ((count.get(d) || 0) >= opt.per || near(d) || (cdays.get(c) || []).some(x => Math.abs(diffDays(d, x)) < opt.gap)) d = addDays(d, 1);
    mark(d, c);
    const PEAK = [7, 8, 9, 12, 19, 20, 21];
    const iso = `${d}T${String(PEAK[int(0, PEAK.length - 1)]).padStart(2, '0')}:${String(int(0, 59)).padStart(2, '0')}:00${fmtOff(offsetMin(d, l))}`;
    rows.push({ p, iso });
  }
}
rows.sort((x, y) => Date.parse(x.iso) - Date.parse(y.iso));
for (const { p, iso } of rows) {
  console.log(`${iso.slice(0, 16).replace('T', ' ')} ${iso.slice(19)}  ${p.lang}/${p.slug}`);
  if (!opt.dry) fs.writeFileSync(p.file, setField(fs.readFileSync(p.file, 'utf8'), 'publishAt', iso));
}
console.log(`${opt.dry ? '(thử – chưa ghi) ' : '✓ '}${rows.length} bài xếp lịch (≤ ${opt.per}/ngôn ngữ/ngày, cụm cách ≥ ${opt.gap} ngày, giờ địa phương)${opt.seed != null ? ` · seed ${opt.seed}` : ''}`);
