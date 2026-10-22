/* Pure helpers for the admin clip library at scale (functions/api/admin-clips.js, tested in scripts/test/clip-bulk.mjs).
 * normFilter: untrusted filter object → canonical filter · viewOf: manifest item + D1 overlay → state flags · matches/sortRows/pageOf: server-side query ·
 * spreadSlot: spread N clips over D days inside a daily time window. No I/O. */
export const STATUS = ['pass', 'fail', 'pending', 'approved', 'rejected', 'paused', 'ready', 'uploaded', 'web', 'sched', 'due', 'none'];
export const SORTS = ['created', 'qa', 'slot', 'views', 'completion'];
export const SECTIONS = ['pending', 'approved', 'live', 'fail', 'archive'], GROUPS = ['template', 'scene', 'date'];
export const TEXT_KEYS = ['q', 'format', 'template', 'scene', 'cefr', 'hook', 'host', 'bg', 'diff', 'channel'];
const S = v => (typeof v === 'string' ? v.trim().slice(0, 80) : '');
const N = v => (v === '' || v == null || typeof v === 'object' || !Number.isFinite(+v) ? null : Math.min(100, Math.max(0, +v)));
const D = v => (/^\d{4}-\d{2}-\d{2}$/.test(String(v)) ? String(v) : '');
export function normFilter(f) {
  f = f && typeof f === 'object' && !Array.isArray(f) ? f : {};
  const o = {};
  for (const k of TEXT_KEYS) { const v = S(f[k]); if (v) o[k] = v; }
  if (STATUS.includes(f.status)) o.status = f.status;
  if (SECTIONS.includes(f.section)) o.section = f.section;
  if (GROUPS.includes(f.group)) o.group = f.group;
  const a = N(f.qmin), b = N(f.qmax); if (a != null) o.qmin = a; if (b != null) o.qmax = b;
  const from = D(f.from), to = D(f.to); if (from) o.from = from; if (to) o.to = to;
  if (f.dt === 'slot') o.dt = 'slot';
  if (f.hidden === true || f.hidden === '1' || f.hidden === 1) o.hidden = true;
  o.sort = SORTS.includes(f.sort) ? f.sort : 'created'; o.dir = f.dir === 'asc' ? 'asc' : 'desc';
  return o;
}
export const scoreOf = it => { const q = (it && it.qa) || {}; if (Number.isFinite(+q.score) && q.score !== '' && q.score != null) return +q.score; const t = (+q.ok || 0) + (+q.fail || 0); return t ? Math.round(100 * (+q.ok || 0) / t) : null; };
export const field = (it, k) => String((k === 'hook' ? it.hook || it.hook_type : k === 'host' ? it.host || it.anchor : k === 'bg' ? it.bg || it.background : k === 'diff' ? it.difficulty || it.diff : it[k]) || '');
/** Manifest item + overlay context {review, queue, pack, web, views} (all keyed by clip id) → flags used by filters, sorting and the grid. */
export function viewOf(it, c) {
  const rv = c.review[it.id] || {}, q = c.queue[it.id], v = c.views[it.id] || {};
  const slot = rv.slot_date ? { date: rv.slot_date, time: rv.slot_time || '' } : it.slot || null;
  return { rejected: rv.state === 'rejected' || !!it.rejected, reason: rv.reason || (typeof it.rejected === 'string' ? it.rejected : ''), paused: rv.state === 'paused' || !!it.paused, deleted: !!rv.deleted,
    approved: !!q, ready: !!q && q.status === 'manual' && !!c.pack[it.id], uploaded: !!q && (q.status === 'detected' || q.status === 'done'), web: !!c.web[it.id] && rv.web !== 0, webOff: rv.web === 0,
    channel: (q && q.channel_id) || rv.channel_id || '', slot, views: v.view || 0, done: v.done || 0, completion: v.view ? v.done / v.view : 0, score: scoreOf(it) };
}
/** Library sections: Chờ duyệt · Đã duyệt / sẵn sàng đăng · Đã đăng / trên web · Lỗi QA · Lưu trữ (rejected / paused). Exclusive, in this priority. */
export function sectionOf(it, v) {
  if (v.rejected || v.paused) return 'archive';
  if (v.uploaded || v.web) return 'live';
  if (v.approved) return 'approved';
  return (it.qa && it.qa.status) === 'pass' ? 'pending' : 'fail';
}
const today = () => new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);
export function matches(it, v, f, now = today()) {
  if (v.deleted) return false;
  if (f.section) { if (sectionOf(it, v) !== f.section) return false; }
  else if (!f.hidden && (v.rejected || v.paused) && f.status !== 'rejected' && f.status !== 'paused') return false; // default view hides Rejected / Paused
  const st = f.status, pass = (it.qa && it.qa.status) === 'pass';
  if (st === 'pass' && !pass) return false; if (st === 'fail' && pass) return false;
  if (st === 'pending' && !(pass && !v.approved && !v.rejected && !v.paused)) return false;
  if (st === 'approved' && !v.approved) return false; if (st === 'rejected' && !v.rejected) return false; if (st === 'paused' && !v.paused) return false;
  if (st === 'ready' && !v.ready) return false; if (st === 'uploaded' && !v.uploaded) return false; if (st === 'web' && !v.web) return false;
  if (st === 'sched' && !(v.slot && v.slot.date >= now)) return false; if (st === 'due' && !(v.slot && v.slot.date < now)) return false; if (st === 'none' && v.slot) return false;
  for (const k of ['format', 'template', 'scene', 'cefr', 'hook', 'host', 'bg', 'diff']) if (f[k] && field(it, k) !== f[k]) return false;
  if (f.channel && v.channel !== f.channel) return false;
  if ((f.qmin != null || f.qmax != null) && (v.score == null || v.score < (f.qmin ?? 0) || v.score > (f.qmax ?? 100))) return false;
  const day = f.dt === 'slot' ? (v.slot && v.slot.date) || '' : String(it.created || '').slice(0, 10);
  if ((f.from || f.to) && !day) return false; if (f.from && day < f.from) return false; if (f.to && day > f.to) return false;
  if (f.q) { const q = f.q.toLowerCase(); if (![it.point, it.title, it.id, it.lesson, it.area, it.description, field(it, 'hook')].some(x => String(x || '').toLowerCase().includes(q))) return false; }
  return true;
}
const key = (it, v, s) => (s === 'qa' ? v.score : s === 'views' ? v.views : s === 'completion' ? v.completion : s === 'slot' ? (v.slot ? v.slot.date + ' ' + (v.slot.time || '') : null) : String(it.created || '') || null);
/** rows: [{it, v}] → sorted copy; missing values always last, id breaks ties so cursor paging is stable. */
export const groupKey = (it, g) => (g === 'date' ? String(it.created || '').slice(0, 10) : g === 'scene' ? it.scene : g === 'template' ? it.template : '') || '–';
export function sortRows(rows, sort = 'created', dir = 'desc', group = '') {
  const m = dir === 'asc' ? 1 : -1;
  return rows.slice().sort((a, b) => { if (group) { const x = groupKey(a.it, group), y = groupKey(b.it, group); if (x !== y) return group === 'date' ? (x < y ? 1 : -1) : x < y ? -1 : 1; } const x = key(a.it, a.v, sort), y = key(b.it, b.v, sort); if (x == null && y == null) return a.it.id < b.it.id ? -1 : 1; if (x == null) return 1; if (y == null) return -1; return x < y ? -m : x > y ? m : a.it.id < b.it.id ? -1 : 1; });
}
export function pageOf(rows, cursor, limit) {
  const at = Math.max(0, Math.floor(+cursor) || 0), n = Math.min(Math.max(1, Math.floor(+limit) || 60), 120), out = rows.slice(at, at + n);
  return { rows: out, total: rows.length, next: at + n < rows.length ? at + n : null };
}
const pad = n => String(n).padStart(2, '0'), mins = t => { const m = /^(\d{2}):(\d{2})$/.exec(String(t)); return m && +m[1] < 24 && +m[2] < 60 ? +m[1] * 60 + +m[2] : null; };
/** i-th of `total` clips → {date, time}: ceil(total/days) clips per day, evenly spaced inside [from, to]. null when the parameters are invalid. */
export function spreadSlot(i, total, { start, days, from = '09:00', to = '21:00' } = {}) {
  const a = mins(from), b = mins(to), n = Math.floor(+days), t = Math.floor(+total), k = Math.floor(+i);
  if (!D(start) || a == null || b == null || b < a || !(n >= 1 && n <= 365) || !(t >= 1) || !(k >= 0 && k < t)) return null;
  const per = Math.ceil(t / n), d = Math.min(n - 1, Math.floor(k / per)), idx = k - d * per, cnt = Math.min(per, t - d * per), at = cnt > 1 ? a + Math.round(idx * (b - a) / (cnt - 1)) : a;
  const dt = new Date(start + 'T00:00:00Z'); dt.setUTCDate(dt.getUTCDate() + d);
  return { date: dt.toISOString().slice(0, 10), time: pad(Math.floor(at / 60)) + ':' + pad(at % 60) };
}
