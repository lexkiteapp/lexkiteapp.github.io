/* Bảng tổng hợp thống kê truy cập theo ngày cho Quản trị › Phân tích / Tổng quan / Trực tiếp / Tăng trưởng (docs/CAPACITY.md §D4).
 * Sự cố 03/11: D1 3,9 triệu dòng đọc/ngày (78 % Free) với vài chục người thật – mỗi lần mở trang quản trị ~25 câu quét cả bảng `sessions`
 * (cohort, tổng hợp, quốc gia, giờ…), trang Trực tiếp tự làm mới 30 giây/lần. Nay:
 *   - stats_day: 1 dòng/ngày VN (khoá day) = JSON tổng hợp CHÍNH XÁC của ngày đó (phiên người thật, kèm tập vid để đếm "khách" không trùng
 *     qua nhiều ngày, tập vid máy tự động/quản trị cho "đã loại", cờ ret=0/đã thử theo nền tảng cho Tăng trưởng).
 *   - Ngày đã qua đọc từ stats_day (SEARCH theo khoá, ≤ 1 dòng/ngày); hôm nay + ngày chưa chốt đọc `sessions WHERE day >= ?` (chỉ mục sessions_day).
 *   - Tăng dần, không cần cron: thiếu/cũ thì dựng lại đúng khoảng ngày đó bằng 1 câu đọc theo chỉ mục + 1 lô ghi. Ngày chốt (fin) sau khi hết ngày
 *     + 37 giờ (phiên gửi bù ≤ 36 giờ – hit.js LATE_MAX); chưa chốt dựng lại tối đa 10 phút/lần.
 *   - Danh sách vid quản trị đổi (xh) hoặc ROLLUP_VER đổi → dựng lại (đọc theo chỉ mục, 1 lần).
 * Quay lại: biến Pages ADMIN_ROLLUP=0 → admin.js chạy SQL cũ trên `sessions`. Kiểm khớp cũ ↔ mới: scripts/test/admin-rollup.mjs. */
import { once } from './_schema.js';

const DAY = 86400e3, VN = 7 * 3600e3;
export const ROLLUP_VER = 1;
export const FINAL_MS = 37 * 3600e3, STALE_MS = 10 * 60e3, TODAY_MS = 20e3, FULL_MS = 15 * 60e3; // FULL_MS: đọc lại đủ hôm nay – bắt phiên gửi bù (hit.js lateAt: last = t0 + dur, cũ hơn lượt đọc trước) sau ≤ 15 phút
const NUL = '\u0001'; // khoá thay cho NULL (khoá đối tượng JSON không thể là null)
const key = v => (v == null ? NUL : String(v));
export const unkey = k => (k === NUL ? null : k);
export const dayMs = d => Date.parse(d + 'T00:00:00Z');
export const addDays = (d, n) => new Date(dayMs(d) + n * DAY).toISOString().slice(0, 10);
const dayOf = t => new Date(t + VN).toISOString().slice(0, 10); // = hit.js dayOf (không import để tránh vòng phụ thuộc)
export const DIMS = ['ref', 'country', 'dev', 'lang', 'plat', 'path'];
export const DUR_B = d => (d == null ? '30+ phút' : d < 15 ? '<15 giây' : d < 60 ? '15–60 giây' : d < 180 ? '1–3 phút' : d < 600 ? '3–10 phút' : d < 1800 ? '10–30 phút' : '30+ phút'); // = CASE … ELSE (NULL rơi vào ELSE như SQL)
export const COLS = 'day, vid, at, country, ref, dev, lang, plat, path, dur, pages, ret, lcp, bot';
// Băm ngắn danh sách vid quản trị (FNV-1a) – đổi danh sách → dựng lại các ngày (số liệu "người thật" phải loại đúng tài khoản quản trị hiện tại)
export const vidsHash = vids => { let h = 0x811c9dc5; for (const c of [...vids].sort().join(',')) { h ^= c.charCodeAt(0); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(36); };

export async function rollupSetup(db) {
  await once(db, 'rollup', 1, () => db.prepare('CREATE TABLE IF NOT EXISTS stats_day (day TEXT PRIMARY KEY, ver INTEGER NOT NULL, at INTEGER NOT NULL, fin INTEGER NOT NULL, xh TEXT, v TEXT NOT NULL) WITHOUT ROWID').run());
}

/** Dựng bản tổng hợp 1 ngày từ các dòng sessions của ngày đó. adm = Set vid quản trị. */
export function buildDay(rows, adm) {
  const r = { s: 0, dS: 0, dN: 0, pS: 0, pN: 0, rS: 0, rN: 0, bo: 0, bN: 0, lg: 0, lz: 0, ln: 0, lh: {}, fr: 0, bk: 0,
    V: [], dm: Object.fromEntries(DIMS.map(d => [d, {}])), hr: new Array(24).fill(0), wd: new Array(7).fill(0), du: {}, ex: {} };
  const idx = new Map(), exV = {};
  const vi = vid => { const k = key(vid); let i = idx.get(k); if (i == null) { idx.set(k, i = r.V.length); r.V.push([k, 0, vid != null && adm.has(vid) ? 1 : 0, 0, {}]); } return i; };
  const exAdd = (k, vid) => { const e = r.ex[k] || (r.ex[k] = [0, []]); e[0]++; if (vid != null) (exV[k] || (exV[k] = new Set())).add(vid); };
  for (const x of rows) {
    if (x.bot != null) { exAdd(x.bot, x.vid); continue; } // NOT (H): máy tự động theo loại
    const i = vi(x.vid), V = r.V[i];
    // Tăng trưởng (growth.js): mọi phiên bot IS NULL – kể cả vid quản trị (SQL cũ không loại quản trị ở đó)
    if (x.ret === 0) V[3] = 1;
    const pl = x.plat == null || x.plat === '' ? 'web' : x.plat, tried = (x.pages != null && x.pages >= 2) || (x.dur != null && x.dur >= 60) ? 1 : 0;
    V[4][pl] = Math.max(V[4][pl] || 0, tried);
    if (V[2]) { exAdd('admin', x.vid); continue; } // khách là tài khoản quản trị → "đã loại"
    V[1]++; r.s++;
    if (x.dur != null) { r.dS += x.dur; r.dN++; }
    if (x.pages != null) { r.pS += x.pages; r.pN++; }
    if (x.ret != null) { r.rS += x.ret; r.rN++; if (x.ret === 0) r.fr++; else if (x.ret === 1) r.bk++; }
    // SUM(pages <= 1 AND dur < 15): logic 3 giá trị của SQL – sai AND bất kỳ = 0 (đếm vào mẫu), NULL chỉ khi không vế nào sai
    const p1 = x.pages == null ? null : x.pages <= 1, d1 = x.dur == null ? null : x.dur < 15;
    if (p1 === false || d1 === false) r.bN++; else if (p1 && d1) { r.bN++; r.bo++; }
    if (x.lcp != null) { r.lz++; if (x.lcp > 0) { r.ln++; if (x.lcp <= 2500) r.lg++; r.lh[x.lcp] = (r.lh[x.lcp] || 0) + 1; } }
    for (const d of DIMS) { const m = r.dm[d], k = key(x[d]), e = m[k] || (m[k] = [0, 0, 0, new Set()]); e[0]++; if (x.dur != null) { e[1] += x.dur; e[2]++; } if (x.vid != null) e[3].add(i); }
    r.hr[Math.floor((x.at + VN) / 3600e3) % 24]++;
    r.wd[(Math.floor((x.at + VN) / DAY) + 4) % 7]++;
    const b = DUR_B(x.dur), e = r.du[b] || (r.du[b] = [0, null]); e[0]++; if (x.dur != null && (e[1] == null || x.dur < e[1])) e[1] = x.dur;
  }
  for (const [k, s] of Object.entries(exV)) r.ex[k][1] = [...s];
  for (const d of DIMS) for (const e of Object.values(r.dm[d])) e[3] = [...e[3]];
  return r;
}

// Bộ nhớ isolate: ngày đã đọc/dựng (5 phút) + hôm nay (20 giây) – 1 lượt mở trang gọi nhiều op dùng chung, Trực tiếp tự làm mới không đọc lại
const MEM = { days: new Map(), today: null, min: null, tr: null };
export const _resetRollup = () => { MEM.days.clear(); MEM.today = null; MEM.min = null; MEM.tr = null; };
export const rollStats = { reads: 0, builds: 0 }; // thống kê cho test/đồng hồ (số lần đọc stats_day, số ngày dựng lại)

/** Bản tổng hợp các ngày [from, today] → Map day → rec (ngày không có phiên → không có trong Map). adm = Set vid quản trị. */
export async function loadDays(db, from, adm, now = Date.now()) {
  await rollupSetup(db);
  const today = dayOf(now), xh = vidsHash(adm), out = new Map();
  const young = (at, ttl) => now >= at && now - at < ttl; // đồng hồ lùi (test/giờ máy) → coi là cũ
  if (!MEM.min || !young(MEM.min.at, STALE_MS)) { const r = await db.prepare('SELECT MIN(day) AS d FROM sessions').first().catch(() => null); MEM.min = { at: now, d: (r && r.d) || today }; }
  const lo = from > MEM.min.d ? from : MEM.min.d;
  const fresh = e => e && e.ver === ROLLUP_VER && e.xh === xh && (e.fin || young(e.at, STALE_MS));
  const need = []; let miss = false;
  for (let d = lo; d < today; d = addDays(d, 1)) { const m = MEM.days.get(d); if (!(m && fresh(m) && young(m.seen, 5 * 60e3))) { miss = true; break; } }
  if (miss && lo < today) {
    rollStats.reads++;
    const rows = (await db.prepare('SELECT day, ver, at, fin, xh, v FROM stats_day WHERE day >= ?1 AND day < ?2').bind(lo, today).all()).results || [];
    for (const r of rows) MEM.days.set(r.day, { ver: r.ver, at: r.at, fin: r.fin, xh: r.xh, rec: r.ver === ROLLUP_VER ? JSON.parse(r.v) : null, seen: now });
  }
  for (let d = lo; d < today; d = addDays(d, 1)) if (!fresh(MEM.days.get(d))) need.push(d);
  const todayOk = MEM.today && MEM.today.day === today && MEM.today.xh === xh && young(MEM.today.at, TODAY_MS);
  if (need.length || !todayOk) {
    const tr = MEM.tr && MEM.tr.day === today ? MEM.tr : null;
    let by = null;
    if (!need.length && tr && young(tr.full, FULL_MS)) {
      // Trực tiếp tự làm mới: chỉ đọc phiên vừa ghi/cập nhật (mọi lượt ghi phiên đặt last = lúc nhận → chỉ mục sessions_last), lùi 60 giây cho lệch đồng hồ
      const rows = (await db.prepare(`SELECT sid, ${COLS} FROM sessions WHERE last > ?1`).bind(tr.fetched - 60e3).all()).results || [];
      for (const x of rows) if (x.day >= today) tr.rows.set(x.sid, x);
      tr.fetched = now;
    } else {
      // 1 câu đọc theo chỉ mục sessions_day cho cả khoảng cần dựng (liền tới hôm nay) – không quét bảng, không vượt 50 truy vấn/lượt gọi (Free)
      const a = need.length ? need[0] : today, rows = (await db.prepare(`SELECT sid, ${COLS} FROM sessions WHERE day >= ?1`).bind(a).all()).results || [];
      by = new Map(); for (const x of rows) { let l = by.get(x.day); if (!l) by.set(x.day, l = []); l.push(x); }
      MEM.tr = { day: today, full: now, fetched: now, rows: new Map(rows.filter(x => x.day >= today).map(x => [x.sid, x])) };
      const put = [];
      for (const d of need) {
        const rec = buildDay(by.get(d) || [], adm), fin = now > dayMs(d) + DAY - VN + FINAL_MS ? 1 : 0; rollStats.builds++;
        MEM.days.set(d, { ver: ROLLUP_VER, at: now, fin, xh, rec, seen: now });
        put.push(db.prepare('INSERT INTO stats_day (day, ver, at, fin, xh, v) VALUES (?1, ?2, ?3, ?4, ?5, ?6) ON CONFLICT (day) DO UPDATE SET ver = ?2, at = ?3, fin = ?4, xh = ?5, v = ?6').bind(d, ROLLUP_VER, now, fin, xh, JSON.stringify(rec)));
      }
      if (put.length) await db.batch(put).catch(() => {}); // ghi lỗi (đầy hạn mức ghi) → lần sau dựng lại, số liệu vẫn đúng
    }
    by = new Map(); for (const x of MEM.tr.rows.values()) { let l = by.get(x.day); if (!l) by.set(x.day, l = []); l.push(x); }
    // Ngày > hôm nay (đồng hồ máy chủ lệch / test đổi giờ): dựng như hôm nay, không lưu – SQL cũ `day >= ?` cũng đếm chúng
    const ahead = [...by.keys()].filter(d => d > today).map(d => [d, buildDay(by.get(d), adm)]);
    MEM.today = { day: today, xh, at: now, rec: buildDay(by.get(today) || [], adm), ahead };
  }
  for (let d = lo; d < today; d = addDays(d, 1)) { const m = MEM.days.get(d); if (m && m.rec && m.rec.s + m.rec.V.length + Object.keys(m.rec.ex).length) out.set(d, m.rec); }
  const t = MEM.today.rec; if (from <= today && (t.s + t.V.length + Object.keys(t.ex).length)) out.set(today, t);
  for (const [d, r] of MEM.today.ahead) if (d >= from) out.set(d, r);
  return out;
}

/* ---------- Gộp nhiều ngày → đúng các con số SQL cũ trả (COUNT / COUNT(DISTINCT vid) / AVG / SUM với NULL như SQLite) ---------- */
const avg = (s, n) => (n ? s / n : null);
/** Gộp các ngày trong [a, z] (z mặc định hết). → tổng hợp người thật (đã loại bot + vid quản trị) */
export function merge(days, a, z = '9999') {
  const m = { s: 0, dS: 0, dN: 0, pS: 0, pN: 0, rS: 0, rN: 0, bo: 0, bN: 0, lg: 0, lz: 0, ln: 0, lh: new Map(), fr: 0, bk: 0, vids: new Set(), vs: new Map(),
    dm: Object.fromEntries(DIMS.map(d => [d, new Map()])), hr: new Array(24).fill(0), wd: new Array(7).fill(0), du: new Map(), ex: new Map(), exV: new Set() };
  for (const [d, r] of days) {
    if (d < a || d > z) continue;
    for (const f of ['s', 'dS', 'dN', 'pS', 'pN', 'rS', 'rN', 'bo', 'bN', 'lg', 'lz', 'ln', 'fr', 'bk']) m[f] += r[f];
    for (const [v, n] of Object.entries(r.lh)) m.lh.set(+v, (m.lh.get(+v) || 0) + n);
    for (const V of r.V) if (!V[2] && V[1]) { m.vs.set(V[0], (m.vs.get(V[0]) || 0) + V[1]); if (V[0] !== NUL) m.vids.add(V[0]); }
    for (const dim of DIMS) for (const [k, e] of Object.entries(r.dm[dim])) {
      const t = m.dm[dim].get(k) || (m.dm[dim].set(k, { n: 0, dS: 0, dN: 0, v: new Set() }), m.dm[dim].get(k));
      t.n += e[0]; t.dS += e[1]; t.dN += e[2]; for (const i of e[3]) t.v.add(r.V[i][0]);
    }
    r.hr.forEach((n, i) => { m.hr[i] += n; }); r.wd.forEach((n, i) => { m.wd[i] += n; });
    for (const [k, [n, o]] of Object.entries(r.du)) { const t = m.du.get(k) || [0, null]; t[0] += n; if (o != null && (t[1] == null || o < t[1])) t[1] = o; m.du.set(k, t); }
    for (const [k, [s, vs]] of Object.entries(r.ex)) { const t = m.ex.get(k) || { s: 0, v: new Set() }; t.s += s; for (const v of vs) { t.v.add(v); m.exV.add(v); } m.ex.set(k, t); }
  }
  return m;
}
const ord = (a, b) => b.n - a.n || (a.k < b.k ? -1 : a.k > b.k ? 1 : 0);
/** top(col): { k, n, v, dur } như `GROUP BY col ORDER BY n DESC LIMIT n`; map = đổi khoá (COALESCE/NULLIF) trước khi gộp */
export function top(m, dim, lim, map = k => k) {
  const g = new Map();
  for (const [k0, e] of m.dm[dim]) { const k = map(unkey(k0)), kk = key(k), t = g.get(kk) || (g.set(kk, { k, n: 0, dS: 0, dN: 0, v: new Set() }), g.get(kk)); t.n += e.n; t.dS += e.dS; t.dN += e.dN; for (const v of e.v) t.v.add(v); }
  return [...g.values()].map(t => ({ k: t.k, n: t.n, v: t.v.size, dur: avg(t.dS, t.dN) })).sort(ord).slice(0, lim);
}
/** COUNT(DISTINCT vid) theo khoá: { k, n } */
export function distinctBy(m, dim, lim, map = k => k) {
  const g = new Map();
  for (const [k0, e] of m.dm[dim]) { const k = map(unkey(k0)), kk = key(k), t = g.get(kk) || (g.set(kk, { k, v: new Set() }), g.get(kk)); for (const v of e.v) t.v.add(v); }
  return [...g.values()].map(t => ({ k: t.k, n: t.v.size })).sort(ord).slice(0, lim);
}
export function sumOf(m) {
  const s = m.s; let lcp = null;
  if (m.ln) { const at = Math.floor(m.ln * 0.75); let c = 0; for (const v of [...m.lh.keys()].sort((x, y) => x - y)) { c += m.lh.get(v); if (c > at) { lcp = v; break; } } }
  return { s, v: m.vids.size, dur: avg(m.dS, m.dN), pages: avg(m.pS, m.pN), ret: m.rN ? m.rS : null, bounce: m.bN ? m.bo : null, lcp, lcpGood: m.lz ? m.lg : null, lcpN: m.lz ? m.ln : null };
}
export const FREQ = c => (c === 1 ? '1' : c <= 3 ? '2–3' : c <= 7 ? '4–7' : c <= 15 ? '8–15' : '16+');
export function freqOf(m) { const by = {}; for (const c of m.vs.values()) by[FREQ(c)] = (by[FREQ(c)] || 0) + 1; return Object.entries(by).map(([k, n]) => ({ k, n })); }
export const perDay = (days, a, z, fn) => [...days.keys()].filter(d => d >= a && d <= z).sort().map(d => { const m = merge(new Map([[d, days.get(d)]]), d, d); return m.s ? fn(d, m) : null; }).filter(Boolean);
