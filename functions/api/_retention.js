/* Giữ chân theo nền tảng & quốc gia cho Quản trị → Phân tích (op 'retention' trong admin.js, docs/specs/retention-1211.md).
 * Khác growth.js (D1 · D2–7 · D8–30 gộp): đây là D1 / D7 / D30 CHÍNH XÁC (có phiên đúng ngày +N) tách theo nền tảng và quốc gia, thêm
 * tỉ lệ "chạm thật" ngày đầu (≥ 2 trang hoặc ≥ 60 giây) và số phiên / người / tuần. Chỉ người thật (bot IS NULL, loại vid quản trị do admin.js truyền vào).
 * Không trả email/uid/vid – chỉ số đếm theo nhóm. Chỉ tính nhóm đã đủ tuổi cho từng mốc (D7: ≥ 7 ngày, D30: ≥ 30 ngày). */
import { dayOf as dayStr } from './hit.js';
const DAY = 86400e3;
const all = async (db, sql, ...a) => (await db.prepare(sql).bind(...a).all()).results || [];

/** Nhóm có quá ít người thì gộp vào 'other' (khỏi trả hàng trăm quốc gia 1 người) */
export const MIN_GROUP = 5;

export function shape(rows, weekly) {
  const key = (k, r) => (r[k] || (k === 'plat' ? 'web' : '??'));
  const group = k => {
    const m = new Map();
    for (const r of rows) {
      const g = key(k, r), e = m.get(g) || { k: g, n: 0, eng: 0, n1: 0, r1: 0, n7: 0, r7: 0, n30: 0, r30: 0 };
      for (const f of ['n', 'eng', 'n1', 'r1', 'n7', 'r7', 'n30', 'r30']) e[f] += r[f] || 0;
      m.set(g, e);
    }
    const out = [...m.values()].sort((a, b) => b.n - a.n);
    if (k !== 'country') return out;
    const keep = out.filter(x => x.n >= MIN_GROUP).slice(0, 12), rest = out.filter(x => !keep.includes(x));
    if (rest.length) { const o = { k: 'other', n: 0, eng: 0, n1: 0, r1: 0, n7: 0, r7: 0, n30: 0, r30: 0 }; for (const x of rest) for (const f of Object.keys(o)) if (f !== 'k') o[f] += x[f]; keep.push(o); }
    return keep;
  };
  const total = group('plat').reduce((t, x) => { for (const f of Object.keys(x)) if (f !== 'k') t[f] = (t[f] || 0) + x[f]; return t; }, { k: 'all' });
  const wk = {}; for (const r of weekly) wk[r.plat || 'web'] = r;
  const wAll = weekly.reduce((t, r) => ({ s: t.s + r.s, uw: t.uw + r.uw }), { s: 0, uw: 0 });
  return { total, plats: group('plat').map(x => ({ ...x, spw: wk[x.k] && wk[x.k].uw ? Math.round(wk[x.k].s / wk[x.k].uw * 100) / 100 : null })), countries: group('country'), spw: wAll.uw ? Math.round(wAll.s / wAll.uw * 100) / 100 : null };
}

/** P = số ngày nhóm bắt đầu cần nhìn lại (30/90) */
export async function retentionData(db, P, adminVids = [], now = Date.now()) {
  const today = dayStr(now), d = k => dayStr(now - k * DAY), from = d(P - 1), wk0 = d(27);
  const ex = adminVids.length ? ` AND vid NOT IN (${adminVids.filter(v => /^[a-z0-9]{8,32}$/i.test(v)).map(v => `'${v}'`).join(',') || "''"})` : '';
  const H = `bot IS NULL AND vid <> ''${ex}`;
  // 1 dòng / vid nhóm (ngày phiên đầu có ret = 0); gộp theo nền tảng × quốc gia trong SQL → vài trăm dòng
  const rows = await all(db, `WITH f AS (SELECT vid, MIN(day) AS d, MIN(COALESCE(NULLIF(plat, ''), 'web')) AS plat, MIN(COALESCE(NULLIF(country, ''), '??')) AS country, MAX(pages >= 2 OR dur >= 60) AS eng FROM sessions WHERE ${H} AND ret = 0 AND day >= ?1 GROUP BY vid),
    a AS (SELECT DISTINCT vid, day FROM sessions WHERE ${H} AND day >= ?1),
    x AS (SELECT f.plat, f.country, f.d, f.eng, MAX(julianday(a.day) - julianday(f.d) = 1) AS r1, MAX(julianday(a.day) - julianday(f.d) = 7) AS r7, MAX(julianday(a.day) - julianday(f.d) = 30) AS r30
      FROM f LEFT JOIN a ON a.vid = f.vid AND a.day > f.d GROUP BY f.vid)
    SELECT plat, country, COUNT(*) AS n, SUM(eng) AS eng, SUM(d <= ?2) AS n1, SUM(r1 AND d <= ?2) AS r1, SUM(d <= ?3) AS n7, SUM(r7 AND d <= ?3) AS r7, SUM(d <= ?4) AS n30, SUM(r30 AND d <= ?4) AS r30
    FROM x WHERE d >= ?5 GROUP BY plat, country`, from, d(1), d(7), d(30), d(P - 1));
  // Phiên / người / tuần: tổng phiên chia số (người × tuần có hoạt động) trong 28 ngày – người học đều thì ≥ 3
  const weekly = await all(db, `SELECT COALESCE(NULLIF(plat, ''), 'web') AS plat, COUNT(*) AS s, COUNT(DISTINCT vid || '|' || strftime('%Y-%W', day)) AS uw FROM sessions WHERE ${H} AND day >= ?1 GROUP BY 1`, wk0);
  return { at: now, today, days: P, ...shape(rows, weekly) };
}
