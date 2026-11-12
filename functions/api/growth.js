/* Số liệu "Tăng trưởng & giữ chân", add-on Chrome và phễu chuyển đổi cho trang Quản trị (op 'growth' trong admin.js).
 * Module chỉ có hàm dùng chung (không export onRequest… → không thành route). Mọi phép gộp chạy trong SQL; admin.js đệm 10 phút.
 * Nguồn: sessions (web/app, vid ẩn danh), ext_daily / ext_events (add-on, hit.js t:'x'), users (tài khoản), vid_uid (khách ↔ tài khoản). */
const DAY = 86400e3;
import { dayOf as dayStr } from './hit.js'; // ngày theo giờ Việt Nam – khớp sessions.day
import { loadDays, addDays, dayMs } from './_rollup.js';
// Chỉ bind đúng số tham số câu SQL dùng (?1…?N) – các câu dựng từ mẫu chung không phải câu nào cũng dùng hết
const fit = (sql, a) => a.slice(0, Math.max(0, ...[...sql.matchAll(/\?(\d+)/g)].map(m => +m[1])));
const one = async (db, sql, ...a) => (await db.prepare(sql).bind(...fit(sql, a)).first()) || {};
const all = async (db, sql, ...a) => (await db.prepare(sql).bind(...fit(sql, a)).all()).results || [];
const PLATS = ['web', 'pwa', 'ext', 'ios', 'android'];

// Hoạt động theo ngày: khách ẩn danh = phiên web/app ∪ ngày dùng add-on; tài khoản = phiên của các vid đã gắn uid ∪ ngày "seen" gần nhất
const ACT_V = "SELECT vid AS id, day FROM sessions WHERE bot IS NULL AND day >= ?1 AND vid <> '' UNION SELECT vid AS id, day FROM ext_daily WHERE day >= ?1";
const ACT_U = "SELECT m.uid AS id, s.day FROM sessions s JOIN vid_uid m ON m.vid = s.vid WHERE s.bot IS NULL AND s.day >= ?1 UNION SELECT uid AS id, date(seen / 1000, 'unixepoch') AS day FROM users WHERE seen >= ?2";
// Nhóm thuần tập: khách = ngày phiên đầu tiên (ret = 0 → máy chưa có lk.vid); tài khoản = ngày đăng ký
const FIRST_V = "SELECT vid AS id, MIN(day) AS d FROM sessions WHERE bot IS NULL AND ret = 0 AND vid <> '' AND day >= ?1 GROUP BY vid";
const FIRST_U = "SELECT uid AS id, date(created / 1000, 'unixepoch') AS d FROM users WHERE created >= ?2";

// Quay lại D1 (ngày +1), D2–7, D8–30 theo từng ngày bắt đầu (JS gộp theo kỳ & chỉ tính nhóm đã đủ tuổi)
const retSQL = (first, act) => `WITH f AS (${first}), a AS (${act}),
  x AS (SELECT f.id, f.d, MAX(CASE WHEN julianday(a.day) - julianday(f.d) = 1 THEN 1 ELSE 0 END) AS r1,
    MAX(CASE WHEN julianday(a.day) - julianday(f.d) BETWEEN 2 AND 7 THEN 1 ELSE 0 END) AS r7,
    MAX(CASE WHEN julianday(a.day) - julianday(f.d) BETWEEN 8 AND 30 THEN 1 ELSE 0 END) AS r30
    FROM f LEFT JOIN a ON a.id = f.id AND a.day > f.d GROUP BY f.id)
  SELECT d, COUNT(*) AS n, SUM(r1) AS r1, SUM(r7) AS r7, SUM(r30) AS r30 FROM x GROUP BY d ORDER BY d`;
// Thuần tập theo tuần (thứ Hai đầu tuần): tuần 0..7 – số người có hoạt động trong tuần thứ k kể từ tuần bắt đầu
const cohortSQL = (first, act) => `WITH f AS (SELECT id, d, date(d, 'weekday 0', '-6 days') AS wk FROM (${first})), a AS (${act})
  SELECT f.wk, CAST((julianday(a.day) - julianday(f.wk)) / 7 AS INTEGER) AS k, COUNT(DISTINCT f.id) AS n
  FROM f JOIN a ON a.id = f.id AND a.day >= f.d WHERE f.wk >= ?3 GROUP BY f.wk, k`;
// Nhịp học: hoạt động ≥ 2 ngày khác nhau trong 7 ngày (so với 7 ngày trước đó) · rời bỏ = hoạt động kỳ trước nhưng không hoạt động kỳ này
const habitSQL = act => `WITH a AS (${act}), p AS (SELECT id,
    COUNT(DISTINCT CASE WHEN day >= ?3 THEN day END) AS n7, COUNT(DISTINCT CASE WHEN day >= ?4 AND day < ?3 THEN day END) AS m7,
    MAX(day >= ?5) AS c, MAX(day >= ?6 AND day < ?5) AS pv, MAX(day >= ?7 AND day < ?6) AS pp FROM a GROUP BY id)
  SELECT SUM(n7 > 0) AS a7, SUM(n7 >= 2) AS r7, SUM(m7 > 0) AS pa7, SUM(m7 >= 2) AS pr7,
    SUM(pv) AS prevAct, SUM(pv AND NOT c) AS churn, SUM(pp) AS pprevAct, SUM(pp AND NOT pv) AS pchurn FROM p`;

export async function growthData(db, P) {
  const now = Date.now(), today = dayStr(now), d = k => dayStr(now - k * DAY);
  const cur = d(P - 1), prev = d(2 * P - 1), back = Math.max(3 * P, 2 * P + 30) - 1; // ngày bắt đầu kỳ này / kỳ trước / mốc xa nhất cần đọc
  const from = d(back), fromMs = Date.parse(from + 'T00:00:00Z'), curMs = Date.parse(cur + 'T00:00:00Z'), prevMs = Date.parse(prev + 'T00:00:00Z');
  const wk0 = dayStr(Date.parse(today + 'T00:00:00Z') - (((new Date(today).getUTCDay() + 6) % 7) + 7 * 7) * DAY); // thứ Hai 7 tuần trước
  const actFrom = from < wk0 ? from : wk0, actMs = Date.parse(actFrom + 'T00:00:00Z');
  const [users, newVis, active, ext, extDays, extNow, versions, reasons, funnel, funnelAll, retV, retU, cohV, cohU, habV, habU] = await Promise.all([
    one(db, 'SELECT COUNT(*) AS total, SUM(created >= ?1) AS cur, SUM(created >= ?2 AND created < ?1) AS prev FROM users', curMs, prevMs),
    one(db, "SELECT COUNT(DISTINCT CASE WHEN day >= ?1 THEN vid END) AS cur, COUNT(DISTINCT CASE WHEN day < ?1 THEN vid END) AS prev FROM sessions WHERE bot IS NULL AND ret = 0 AND vid <> '' AND day >= ?2", cur, prev),
    // DAU theo ngày (2 kỳ) + WAU/MAU tính tại cuối mỗi kỳ
    all(db, `WITH a AS (${ACT_V}) SELECT day, COUNT(*) AS n FROM a WHERE day >= ?2 GROUP BY day
      UNION ALL SELECT 'W', COUNT(DISTINCT CASE WHEN day >= ?3 THEN id END) FROM a UNION ALL SELECT 'M', COUNT(DISTINCT CASE WHEN day >= ?4 THEN id END) FROM a
      UNION ALL SELECT 'PW', COUNT(DISTINCT CASE WHEN day >= ?5 AND day < ?7 THEN id END) FROM a UNION ALL SELECT 'PM', COUNT(DISTINCT CASE WHEN day >= ?6 AND day < ?7 THEN id END) FROM a`,
      prev < d(P + 29) ? prev : d(P + 29), prev, d(6), d(29), d(P + 6), d(P + 29), cur),
    // Add-on: sự kiện theo ngày (2 kỳ), hoạt động theo ngày 30 ngày
    all(db, 'SELECT day, kind, n FROM ext_events WHERE day >= ?1 ORDER BY day', prev < d(29) ? prev : d(29)),
    all(db, 'SELECT day, COUNT(*) AS dau, SUM(lookup) AS lookup, SUM(save) AS save, SUM(popup) AS popup, SUM(newtab) AS newtab FROM ext_daily WHERE day >= ?1 GROUP BY day ORDER BY day', d(29)),
    one(db, 'SELECT COUNT(DISTINCT CASE WHEN day >= ?2 THEN vid END) AS wau, COUNT(DISTINCT vid) AS mau FROM ext_daily WHERE day >= ?1', d(29), d(6)),
    all(db, "SELECT COALESCE(NULLIF(ver, ''), '?') AS k, COUNT(DISTINCT vid) AS n FROM ext_daily WHERE day >= ?1 GROUP BY k ORDER BY n DESC LIMIT 8", d(6)),
    all(db, "SELECT substr(kind, 11) AS k, SUM(n) AS n FROM ext_events WHERE kind LIKE 'uninstall:%' AND day >= ?1 GROUP BY k ORDER BY n DESC", d(89)),
    // Phễu (kỳ này): Khách → Dùng thử (≥ 2 trang hoặc ≥ 60 giây, hoặc tra từ trong add-on) → Đăng ký → Học đều (≥ 7 ngày sau đăng ký hoặc ≥ 5 lần vào)
    ...['GROUP BY v.plat', ''].map(g => all(db, `WITH v AS (SELECT vid, COALESCE(NULLIF(plat, ''), 'web') AS plat, MAX(pages >= 2 OR dur >= 60) AS tried FROM sessions WHERE bot IS NULL AND day >= ?1 AND vid <> '' GROUP BY vid, plat
        UNION ALL SELECT vid, 'ext', MAX(lookup >= 1) FROM ext_daily WHERE day >= ?1 GROUP BY vid),
      r AS (SELECT m.vid, u.uid, (u.seen - u.created >= 604800000 OR u.n >= 5) AS kept FROM vid_uid m JOIN users u ON u.uid = m.uid WHERE u.created >= ?2)
      SELECT ${g ? 'v.plat AS plat,' : ''} COUNT(DISTINCT v.vid) AS visitors, COUNT(DISTINCT CASE WHEN v.tried THEN v.vid END) AS tried, COUNT(DISTINCT r.uid) AS signed, COUNT(DISTINCT CASE WHEN r.kept THEN r.uid END) AS kept
      FROM v LEFT JOIN r ON r.vid = v.vid ${g}`, cur, curMs)),
    all(db, retSQL(FIRST_V, ACT_V), from, fromMs),
    all(db, retSQL(FIRST_U, ACT_U), from, fromMs),
    all(db, cohortSQL(FIRST_V, ACT_V), actFrom, actMs, wk0),
    all(db, cohortSQL(FIRST_U, ACT_U), actFrom, actMs, wk0),
    one(db, habitSQL(ACT_V), d(3 * P - 1), 0, d(6), d(13), cur, prev, d(3 * P - 1)),
    one(db, habitSQL(ACT_U), d(3 * P - 1), Date.parse(d(3 * P - 1) + 'T00:00:00Z'), d(6), d(13), cur, prev, d(3 * P - 1)),
  ]);
  const newByPlat = await all(db, "SELECT COALESCE(NULLIF(plat, ''), 'web') AS k, SUM(created >= ?1) AS cur, SUM(created >= ?2 AND created < ?1) AS prev FROM users WHERE created >= ?2 GROUP BY k ORDER BY cur DESC", curMs, prevMs);
  return shape(now, P, { users, newVis, active, ext, extDays, extNow, versions, reasons, funnel, funnelAll, retV, retU, cohV, cohU, habV, habU, newByPlat });
}

// Hậu xử lý dùng chung cho SQL cũ (growthData) và bản đọc bảng tổng hợp (growthRoll) – cùng đầu vào → cùng kết quả
function shape(now, P, { users, newVis, active, ext, extDays, extNow, versions, reasons, funnel, funnelAll, retV, retU, cohV, cohU, habV, habU, newByPlat }) {
  const today = dayStr(now), d = k => dayStr(now - k * DAY), cur = d(P - 1), prev = d(2 * P - 1);

  // DAU trung bình mỗi kỳ (chia cho số ngày của kỳ, kể cả ngày 0 khách)
  const dau = { cur: 0, prev: 0 }, act = {};
  for (const r of active) { if (r.day.length > 2) { if (r.day >= cur) dau.cur += r.n; else if (r.day >= prev) dau.prev += r.n; } else act[r.day] = r.n; }
  dau.cur /= P; dau.prev /= P;
  const sumEv = (kind, a, z) => ext.filter(r => r.kind === kind && r.day >= a && (!z || r.day < z)).reduce((t, r) => t + r.n, 0);
  const evPeriod = (a, z) => ({ install: sumEv('install', a, z), uninstall: sumEv('uninstall', a, z), update: sumEv('update', a, z) });
  // Giữ chân: gộp các ngày bắt đầu trong kỳ, chỉ tính nhóm đã đủ tuổi cho từng mốc (D1: ≥ 1 ngày, D2–7: ≥ 7 ngày, D8–30: ≥ 30 ngày)
  const ret = (rows, a, z) => { const o = { n: 0 }; for (const [k, age] of [['r1', 1], ['r7', 7], ['r30', 30]]) { const lim = d(age), ok = rows.filter(r => r.d >= a && (!z || r.d < z) && r.d <= lim); o[k] = { n: ok.reduce((t, r) => t + r.n, 0), r: ok.reduce((t, r) => t + (r[k] || 0), 0) }; } o.n = rows.filter(r => r.d >= a && (!z || r.d < z)).reduce((t, r) => t + r.n, 0); return o; };
  const coh = rows => { const by = {}; for (const r of rows) if (r.k >= 0 && r.k <= 7) (by[r.wk] = by[r.wk] || {})[r.k] = r.n; return Object.keys(by).sort().map(wk => ({ wk, size: by[wk][0] || 0, w: Array.from({ length: 8 }, (_, k) => by[wk][k] || 0) })); };
  const byDay = Object.fromEntries(extDays.map(r => [r.day, r]));
  const ctaPeriod = (a, z) => {
    const av = sumEv('cta:cta_addon_view', a, z);
    const ac = sumEv('cta:cta_addon_click', a, z) + sumEv('cta:ext_land', a, z) + sumEv('cta:ext_feat', a, z) + sumEv('cta:ext_blog', a, z);
    const pv = sumEv('cta:cta_pwa_view', a, z);
    const pc = sumEv('cta:cta_pwa_click', a, z);
    const tc = sumEv('cta:cta_topic_click', a, z) + sumEv('cta:quiz_cta', a, z);
    return {
      addonView: av, addonClick: ac,
      pwaView: pv, pwaClick: pc,
      topicClick: tc,
      totalClick: ac + pc + tc
    };
  };
  const langClicks = {}, pageClicks = {};
  for (const r of ext) {
    if (r.day < cur) continue;
    const m = r.kind.match(/^cta:([^:]+):(lang|page):([^:]+)$/);
    if (!m) continue;
    const [, ev, type, val] = m;
    if (!ev.endsWith('_click') && ev !== 'quiz_cta') continue;
    if (type === 'lang') langClicks[val] = (langClicks[val] || 0) + r.n;
    else if (type === 'page') pageClicks[val] = (pageClicks[val] || 0) + r.n;
  }
  const ctaByLang = Object.entries(langClicks).map(([k, n]) => ({ k, n })).sort((a, b) => b.n - a.n);
  const ctaByPage = Object.entries(pageClicks).map(([k, n]) => ({ k, n })).sort((a, b) => b.n - a.n);
  return {
    at: now, days: P, cur, prev,
    users: { total: users.total || 0, cur: users.cur || 0, prev: users.prev || 0, byPlat: newByPlat },
    newVisitors: { cur: newVis.cur || 0, prev: newVis.prev || 0 },
    active: { dau: dau, wau: { cur: act.W || 0, prev: act.PW || 0 }, mau: { cur: act.M || 0, prev: act.PM || 0 } },
    addon: {
      cur: evPeriod(cur), prev: evPeriod(prev, cur),
      events: Array.from({ length: 30 }, (_, i) => { const k = d(29 - i), n = kind => ext.filter(r => r.day === k && r.kind === kind).reduce((t, r) => t + r.n, 0); return { day: k, install: n('install'), uninstall: n('uninstall'), update: n('update') }; }),
      daily: Array.from({ length: 14 }, (_, i) => { const k = d(13 - i), r = byDay[k] || {}; return { day: k, dau: r.dau || 0, lookup: r.lookup || 0, save: r.save || 0, popup: r.popup || 0, newtab: r.newtab || 0 }; }),
      today: byDay[today] || { dau: 0, lookup: 0, save: 0, popup: 0, newtab: 0 }, wau: extNow.wau || 0, mau: extNow.mau || 0,
      i30: sumEv('install', d(29)), u30: sumEv('uninstall', d(29)), versions, reasons,
    },
    funnel: { all: funnelAll[0] || {}, plats: Object.fromEntries(funnel.filter(r => PLATS.includes(r.plat) || r.plat === 'app').map(r => [r.plat, r])) },
    retention: { visitors: { cur: ret(retV, cur), prev: ret(retV, prev, cur) }, users: { cur: ret(retU, cur), prev: ret(retU, prev, cur) } },
    cohorts: { visitors: coh(cohV), users: coh(cohU) },
    habit: { visitors: habV, users: habU },
    cta: { cur: ctaPeriod(cur), prev: ctaPeriod(prev, cur), byLang: ctaByLang, byPage: ctaByPage },
  };
}

/* Bản đọc bảng tổng hợp (functions/api/_rollup.js, docs/CAPACITY.md §D4): cùng đầu vào cho shape() như growthData nhưng phần `sessions`
 * lấy từ stats_day (ngày đã qua, 1 dòng/ngày) + phiên hôm nay theo chỉ mục → 0 câu quét `sessions` (trước: 7 câu × cả bảng mỗi lần mở).
 * vid ↔ tài khoản: vid_uid theo khoá chính (json_each); users: 1 câu thay 3. Kiểm khớp từng trường với growthData: scripts/test/admin-rollup.mjs. */
const NUL = '\u0001';
const utcDay = t => new Date(t).toISOString().slice(0, 10); // = date(t / 1000, 'unixepoch') của SQL cũ
export async function growthRoll(db, P, adm, now = Date.now()) {
  const today = dayStr(now), d = k => dayStr(now - k * DAY);
  const cur = d(P - 1), prev = d(2 * P - 1), back = Math.max(3 * P, 2 * P + 30) - 1;
  const from = d(back), fromMs = dayMs(from), curMs = dayMs(cur), prevMs = dayMs(prev);
  const wk0 = dayStr(dayMs(today) - (((new Date(today).getUTCDay() + 6) % 7) + 7 * 7) * DAY);
  const actFrom = from < wk0 ? from : wk0, actMs = dayMs(actFrom), d3 = d(3 * P - 1);
  const days = await loadDays(db, actFrom, adm, now);
  const [users, ext, extDays, extNow, versions, reasons, extAct, urows] = await Promise.all([
    one(db, 'SELECT COUNT(*) AS total, SUM(created >= ?1) AS cur, SUM(created >= ?2 AND created < ?1) AS prev FROM users', curMs, prevMs),
    all(db, 'SELECT day, kind, n FROM ext_events WHERE day >= ?1 ORDER BY day', prev < d(29) ? prev : d(29)),
    all(db, 'SELECT day, COUNT(*) AS dau, SUM(lookup) AS lookup, SUM(save) AS save, SUM(popup) AS popup, SUM(newtab) AS newtab FROM ext_daily WHERE day >= ?1 GROUP BY day ORDER BY day', d(29)),
    one(db, 'SELECT COUNT(DISTINCT CASE WHEN day >= ?2 THEN vid END) AS wau, COUNT(DISTINCT vid) AS mau FROM ext_daily WHERE day >= ?1', d(29), d(6)),
    all(db, "SELECT COALESCE(NULLIF(ver, ''), '?') AS k, COUNT(DISTINCT vid) AS n FROM ext_daily WHERE day >= ?1 GROUP BY k ORDER BY n DESC LIMIT 8", d(6)),
    all(db, "SELECT substr(kind, 11) AS k, SUM(n) AS n FROM ext_events WHERE kind LIKE 'uninstall:%' AND day >= ?1 GROUP BY k ORDER BY n DESC", d(89)),
    all(db, 'SELECT day, vid, lookup FROM ext_daily WHERE day >= ?1', actFrom),
    all(db, 'SELECT uid, created, seen, n FROM users WHERE created >= ?1 OR seen >= ?1', actMs),
  ]);
  const newByPlat = await all(db, "SELECT COALESCE(NULLIF(plat, ''), 'web') AS k, SUM(created >= ?1) AS cur, SUM(created >= ?2 AND created < ?1) AS prev FROM users WHERE created >= ?2 GROUP BY k ORDER BY cur DESC", curMs, prevMs);
  // Phiên bot IS NULL, vid <> '' theo ngày: [day, vid, có phiên ret = 0, { nền tảng: đã thử }]
  const sv = []; for (const [day, r] of days) for (const V of r.V) if (V[0] !== NUL && V[0] !== '') sv.push([day, V[0], V[3], V[4]]);
  const look = [...new Set([...sv.map(x => x[1]), ...extAct.filter(x => x.day >= cur).map(x => x.vid)])];
  const links = look.length ? await all(db, 'SELECT m.vid, m.uid FROM json_each(?1) AS j CROSS JOIN vid_uid AS m ON m.vid = j.value', JSON.stringify(look)) : [];
  const v2u = new Map(links.map(r => [r.vid, r.uid])), U = new Map(urows.map(u => [u.uid, u]));
  const addTo = (a, id, day) => { let s = a.get(id); if (!s) a.set(id, s = new Set()); s.add(day); };
  const actV = lo => { const a = new Map(); for (const [day, vid] of sv) if (day >= lo) addTo(a, vid, day); for (const x of extAct) if (x.day >= lo) addTo(a, x.vid, x.day); return a; };
  const actU = (lo, loMs) => { const a = new Map(); for (const [day, vid] of sv) if (day >= lo && v2u.has(vid)) addTo(a, v2u.get(vid), day); for (const u of urows) if (u.seen >= loMs) addTo(a, u.uid, utcDay(u.seen)); return a; };
  const firstV = lo => { const f = new Map(); for (const [day, vid, r0] of sv) if (r0 && day >= lo && (!f.has(vid) || day < f.get(vid))) f.set(vid, day); return f; };
  const firstU = loMs => new Map(urows.filter(u => u.created >= loMs).map(u => [u.uid, utcDay(u.created)]));
  const diff = (x, y) => Math.round((dayMs(x) - dayMs(y)) / DAY);
  const retCalc = (f, a) => {
    const by = new Map();
    for (const [id, d0] of f) {
      let r1 = 0, r7 = 0, r30 = 0;
      for (const day of a.get(id) || []) { if (day <= d0) continue; const k = diff(day, d0); if (k === 1) r1 = 1; else if (k >= 2 && k <= 7) r7 = 1; else if (k >= 8 && k <= 30) r30 = 1; }
      const t = by.get(d0) || { d: d0, n: 0, r1: 0, r7: 0, r30: 0 }; t.n++; t.r1 += r1; t.r7 += r7; t.r30 += r30; by.set(d0, t);
    }
    return [...by.values()].sort((x, y) => (x.d < y.d ? -1 : 1));
  };
  const wkOf = d0 => addDays(d0, ((7 - new Date(dayMs(d0)).getUTCDay()) % 7) - 6); // date(d, 'weekday 0', '-6 days') = thứ Hai đầu tuần
  const cohCalc = (f, a) => {
    const by = new Map();
    for (const [id, d0] of f) {
      const wk = wkOf(d0); if (wk < wk0) continue;
      for (const day of a.get(id) || []) { if (day < d0) continue; const k = Math.floor(diff(day, wk) / 7), kk = wk + '|' + k; let s = by.get(kk); if (!s) by.set(kk, s = { wk, k, ids: new Set() }); s.ids.add(id); }
    }
    return [...by.values()].map(x => ({ wk: x.wk, k: x.k, n: x.ids.size }));
  };
  const habCalc = a => {
    const o = { a7: 0, r7: 0, pa7: 0, pr7: 0, prevAct: 0, churn: 0, pprevAct: 0, pchurn: 0 };
    if (!a.size) return Object.fromEntries(Object.keys(o).map(k => [k, null])); // SQL: SUM trên 0 dòng = NULL
    const d6 = d(6), d13 = d(13);
    for (const ds of a.values()) {
      let n7 = 0, m7 = 0, c = 0, pv = 0, pp = 0;
      for (const day of ds) { if (day >= d6) n7++; else if (day >= d13) m7++; if (day >= cur) c = 1; else if (day >= prev) pv = 1; else if (day >= d3) pp = 1; }
      o.a7 += n7 > 0; o.r7 += n7 >= 2; o.pa7 += m7 > 0; o.pr7 += m7 >= 2; o.prevAct += pv; o.churn += pv && !c; o.pprevAct += pp; o.pchurn += pp && !pv;
    }
    return o;
  };
  const aA = actV(prev < d(P + 29) ? prev : d(P + 29)), perDayN = new Map();
  for (const ds of aA.values()) for (const day of ds) if (day >= prev) perDayN.set(day, (perDayN.get(day) || 0) + 1);
  const cnt = (lo, hi) => { let n = 0; for (const ds of aA.values()) for (const day of ds) if (day >= lo && (!hi || day < hi)) { n++; break; } return n; };
  const active = [...perDayN].map(([day, n]) => ({ day, n })).concat([{ day: 'W', n: cnt(d(6)) }, { day: 'M', n: cnt(d(29)) }, { day: 'PW', n: cnt(d(P + 6), cur) }, { day: 'PM', n: cnt(d(P + 29), cur) }]);
  const nv = { cur: new Set(), prev: new Set() }; for (const [day, vid, r0] of sv) if (r0 && day >= prev) nv[day >= cur ? 'cur' : 'prev'].add(vid);
  // Phễu: (vid, nền tảng) đã thử trong kỳ ∪ add-on (tra từ) → tài khoản đăng ký trong kỳ (vid_uid) → học đều
  const fv = new Map();
  for (const [day, vid, , pl] of sv) if (day >= cur) for (const [p, t] of Object.entries(pl)) { const k = vid + '\0' + p; const e = fv.get(k) || { vid, plat: p, t: 0 }; if (t) e.t = 1; fv.set(k, e); }
  const fe = new Map(); for (const x of extAct) if (x.day >= cur) { const e = fe.get(x.vid) || { vid: x.vid, plat: 'ext', t: 0 }; if (x.lookup != null && x.lookup >= 1) e.t = 1; fe.set(x.vid, e); }
  const vrows = [...fv.values(), ...fe.values()];
  const fun = rows => {
    const vs = new Set(), ts = new Set(), sg = new Set(), kp = new Set();
    for (const x of rows) { vs.add(x.vid); if (x.t) ts.add(x.vid); const uid = v2u.get(x.vid), u = uid != null ? U.get(uid) : null; if (u && u.created >= curMs) { sg.add(uid); if (u.seen - u.created >= 604800000 || u.n >= 5) kp.add(uid); } }
    return { visitors: vs.size, tried: ts.size, signed: sg.size, kept: kp.size };
  };
  const funnel = [...new Set(vrows.map(x => x.plat))].map(p => ({ plat: p, ...fun(vrows.filter(x => x.plat === p)) }));
  return shape(now, P, { users, newVis: { cur: nv.cur.size, prev: nv.prev.size }, active, ext, extDays, extNow, versions, reasons, funnel, funnelAll: [fun(vrows)],
    retV: retCalc(firstV(from), actV(from)), retU: retCalc(firstU(fromMs), actU(from, fromMs)),
    cohV: cohCalc(firstV(actFrom), actV(actFrom)), cohU: cohCalc(firstU(actMs), actU(actFrom, actMs)),
    habV: habCalc(actV(d3)), habU: habCalc(actU(d3, dayMs(d3))), newByPlat });
}
