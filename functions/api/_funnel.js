/* Phễu kênh (docs/specs/funnel.md): mã kênh/bài → vào trang đích → quiz → vào app → bài đầu → quay lại D1/D7+.
 * Module thuần (không route). Ghi: hit.js gọi attrStmts (bảng vid_attr, 1 dòng/máy mới có UTM) + funStmt (đếm go_* theo kênh trong ext_events 'fun:<sự kiện>:<nguồn>|<chiến dịch>|<mã>').
 * Đọc: channelData → op 'channels' của admin.js (đệm 10 phút). Không IP/URL/dữ liệu cá nhân; chỉ giá trị khớp ATTR_RE; bot/CI/quản trị đã bị hit.js loại trước khi gọi. */
const DAY = 86400e3;
export const ATTR_RE = /^[A-Za-z0-9._~-]{1,40}$/;
const FUN_CAP = 600; // số tổ hợp nguồn|chiến dịch|mã tối đa mỗi ngày (chống phình ext_events nếu ai đó gửi giá trị ngẫu nhiên)
const STAGES = ['go_view', 'go_start', 'go_done', 'go_cta'];
export const DDL = [
  'CREATE TABLE IF NOT EXISTS vid_attr (vid TEXT PRIMARY KEY, day TEXT NOT NULL, src TEXT, med TEXT, camp TEXT, code TEXT, lang TEXT, plat TEXT, fl TEXT, d1 TEXT, d7 TEXT) WITHOUT ROWID',
  'CREATE INDEX IF NOT EXISTS vid_attr_day ON vid_attr (day)',
];

/** Khoá ngắn s/m/c/k (nguồn, phương tiện, chiến dịch, mã) từ client → object sạch hoặc null (cần ít nhất nguồn hoặc mã). */
export function attrOf(x) {
  if (!x || typeof x !== 'object') return null;
  const o = {}; for (const k of ['s', 'm', 'c', 'k']) { const v = x[k]; if (typeof v === 'string' && ATTR_RE.test(v)) o[k] = v; }
  return o.s || o.k ? o : null;
}
const keyOf = a => [a.s || '', a.c || '', a.k || ''].join('|');

/** Lệnh ghi cho 1 beacon phiên: máy MỚI (ret = 0) có UTM → dòng đầu tiên (INSERT OR IGNORE: lượt đầu thắng); máy cũ có UTM → đánh dấu quay lại D1/D7+;
 *  fl = đã xong bài đầu (chỉ khi có dòng, chỉ lần đầu). Ghi nhiều nhất vài dòng/máy trong cả vòng đời; không khớp → 0 dòng ghi. */
export function attrStmts(db, { vid, day, ret, at, fl, plat, lang }) {
  const a = attrOf(at), s = [];
  if (!vid) return s;
  if (a && !ret) s.push(db.prepare('INSERT OR IGNORE INTO vid_attr (vid, day, src, med, camp, code, lang, plat) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)').bind(vid, day, a.s || '', a.m || '', a.c || '', a.k || '', String(lang || '').slice(0, 8), String(plat || '').slice(0, 8)));
  if (a && ret) s.push(db.prepare("UPDATE vid_attr SET d1 = CASE WHEN d1 IS NULL AND ?2 = date(day, '+1 day') THEN ?2 ELSE d1 END, d7 = CASE WHEN d7 IS NULL AND ?2 >= date(day, '+7 day') THEN ?2 ELSE d7 END WHERE vid = ?1 AND (d1 IS NULL OR d7 IS NULL)").bind(vid, day));
  if (fl) s.push(db.prepare('UPDATE vid_attr SET fl = ?2 WHERE vid = ?1 AND fl IS NULL').bind(vid, day));
  return s;
}

/** Đếm sự kiện trang đích theo kênh (go_view|go_start|go_done|go_cta). null nếu không có UTM hợp lệ. */
export function funStmt(db, day, ev, at) {
  const a = attrOf(at); if (!a || !STAGES.includes(ev)) return null;
  const kind = `fun:${ev}:${keyOf(a)}`;
  return db.prepare("INSERT INTO ext_events (day, kind, n) SELECT ?1, ?2, 1 WHERE EXISTS (SELECT 1 FROM ext_events WHERE day = ?1 AND kind = ?2) OR (SELECT COUNT(*) FROM ext_events WHERE day = ?1 AND kind LIKE 'fun:go_view:%') < ?3 ON CONFLICT (day, kind) DO UPDATE SET n = n + 1").bind(day, kind, FUN_CAP);
}

const dayOf = ms => new Date(ms + 7 * 3600e3).toISOString().slice(0, 10); // ngày giờ Việt Nam (khớp hit.js dayOf)
const pct = (a, b) => (b > 0 ? Math.round((a / b) * 1000) / 10 : null);

/** Bảng phễu theo kênh/mã trong P ngày + tóm tắt hôm qua so với hôm kia. D1 = quay lại đúng ngày kế; D7+ = quay lại từ ngày thứ 7 trở đi (chỉ tính nhóm đã đủ 7 ngày). */
export async function channelData(db, P, now = Date.now()) {
  P = [7, 30, 90].includes(+P) ? +P : 30;
  const from = dayOf(now - (P - 1) * DAY), today = dayOf(now), cut7 = dayOf(now - 7 * DAY), cut1 = dayOf(now - DAY);
  const [att, fun, dd] = await Promise.all([
    db.prepare("SELECT src, camp, code, COUNT(*) AS app, SUM(fl IS NOT NULL) AS fl, SUM(CASE WHEN day <= ?2 THEN 1 ELSE 0 END) AS n1, SUM(CASE WHEN day <= ?2 AND d1 IS NOT NULL THEN 1 ELSE 0 END) AS d1, SUM(CASE WHEN day <= ?3 THEN 1 ELSE 0 END) AS n7, SUM(CASE WHEN day <= ?3 AND d7 IS NOT NULL THEN 1 ELSE 0 END) AS d7 FROM vid_attr WHERE day >= ?1 GROUP BY src, camp, code").bind(from, cut1, cut7).all(),
    db.prepare("SELECT day, kind, n FROM ext_events WHERE day >= ?1 AND kind LIKE 'fun:%'").bind(from).all(),
    db.prepare('SELECT day, COUNT(*) AS app, SUM(fl IS NOT NULL) AS fl FROM vid_attr WHERE day >= ?1 GROUP BY day').bind(dayOf(now - 2 * DAY)).all(),
  ]);
  const rows = new Map(), row = (s, c, k) => { const id = [s, c, k].join('|'); if (!rows.has(id)) rows.set(id, { src: s, camp: c, code: k, go_view: 0, go_start: 0, go_done: 0, go_cta: 0, app: 0, fl: 0, n1: 0, d1: 0, n7: 0, d7: 0 }); return rows.get(id); };
  const byDay = {};
  for (const r of att.results || []) Object.assign(row(r.src || '', r.camp || '', r.code || ''), { app: r.app, fl: r.fl, n1: r.n1, d1: r.d1, n7: r.n7, d7: r.d7 });
  for (const r of fun.results || []) {
    const m = /^fun:(go_\w+):([^|]*)\|([^|]*)\|(.*)$/.exec(r.kind); if (!m) continue;
    row(m[2], m[3], m[4])[m[1]] += r.n; (byDay[r.day] ||= { go_view: 0, go_cta: 0 })[m[1]] = ((byDay[r.day] || {})[m[1]] || 0) + r.n;
  }
  const list = [...rows.values()].sort((a, b) => (b.go_view + b.app) - (a.go_view + a.app)).slice(0, 80)
    .map(r => ({ ...r, startPct: pct(r.go_start, r.go_view), donePct: pct(r.go_done, r.go_start), ctaPct: pct(r.go_cta, r.go_done), flPct: pct(r.fl, r.app), d1Pct: pct(r.d1, r.n1), d7Pct: pct(r.d7, r.n7) }));
  const tot = list.reduce((t, r) => { for (const k of ['go_view', 'go_start', 'go_done', 'go_cta', 'app', 'fl', 'n1', 'd1', 'n7', 'd7']) t[k] = (t[k] || 0) + r[k]; return t; }, {});
  const y = dayOf(now - DAY), y2 = dayOf(now - 2 * DAY), A = Object.fromEntries((dd.results || []).map(r => [r.day, r]));
  return { days: P, today, rows: list, total: { ...tot, flPct: pct(tot.fl, tot.app), d1Pct: pct(tot.d1, tot.n1), d7Pct: pct(tot.d7, tot.n7) }, summary: { day: y, views: (byDay[y] || {}).go_view || 0, prevViews: (byDay[y2] || {}).go_view || 0, ctas: (byDay[y] || {}).go_cta || 0, prevCtas: (byDay[y2] || {}).go_cta || 0, app: (A[y] || {}).app || 0, prevApp: (A[y2] || {}).app || 0, fl: (A[y] || {}).fl || 0, prevFl: (A[y2] || {}).fl || 0 } };
}
