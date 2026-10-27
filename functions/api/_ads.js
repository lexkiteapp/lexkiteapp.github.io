/* Quảng cáo – phần máy chủ dùng chung (docs/ADS.md): nhận sự kiện từ beacon /api/hit (t:'ad'), cổng giữ chân (retention guard),
 * số liệu cho Quản trị › Quảng cáo, xác minh thưởng AdMob (SSV). Không bảng mới: dùng ext_events (day, kind, n) – PK (day, kind) nên mọi
 * truy vấn là tìm theo khoảng ngày (SEARCH), KHÔNG quét bảng. Mọi cờ mặc định TẮT → không có beacon nào → 0 dòng ghi. */

export const PLATS = ['web', 'android', 'ios'];
export const PLACES = ['home', 'blog', 'inter', 'rew'];
export const EVS = ['req', 'imp', 'nofill', 'click', 'show', 'rewok'];      // yêu cầu · hiển thị · không có quảng cáo · bấm · toàn màn hình/có thưởng đã hiện · đã nhận thưởng
export const COH = ['a', 'h'];                                             // a = có quảng cáo, h = đối chứng 10 % (không quảng cáo)
export const CM = ['n1', 'r1', 'r7', 'ses', 'dur'];                        // máy mới vào nhóm · quay lại ngày 1 · quay lại ngày 7 · phiên · giây dùng app
export const CONSENT = ['pa', 'npa', 'deny', 'na'];                        // cá nhân hóa · không cá nhân hóa (DNT/GPC/chọn) · từ chối (không gọi quảng cáo) · không cần hỏi
const EEA = new Set('AT BE BG HR CY CZ DK EE FI FR DE GR HU IE IT LV LT LU MT NL PL PT RO SK SI ES SE IS LI NO GB CH'.split(' '));
const US_STATES_LAW = 'US'; // luật bang Mỹ (CCPA/CPRA, VCDPA…) – Cloudflare chỉ cho mã nước
export const region = c => (EEA.has(c) ? 'eea' : c === US_STATES_LAW ? 'us' : 'row');

/** Beacon t:'ad' → danh sách [kind, n] (đã lọc theo danh sách cho phép, chặn số ảo). */
export function adRows(b, country) {
  const out = [], cap = (v, m) => Math.min(Math.max(Math.floor(+v || 0), 0), m);
  const plat = PLATS.includes(b && b.plat) ? b.plat : '', coh = COH.includes(b && b.c) ? b.c : '';
  const ev = b && b.ev && typeof b.ev === 'object' ? b.ev : {};
  if (plat) for (const [k, v] of Object.entries(ev).slice(0, 40)) {
    const [e, pl] = String(k).split(':');
    if (EVS.includes(e) && PLACES.includes(pl)) { const n = cap(v, 50); if (n) out.push([`ad:${e}:${plat}:${pl}`, n]); }
  }
  if (coh && b.m && typeof b.m === 'object') for (const m of CM) { const n = cap(b.m[m], m === 'dur' ? 6 * 3600 : 5); if (n) out.push([`adc:${coh}:${m}`, n]); }
  if (CONSENT.includes(b && b.k)) out.push([`adk:${region(String(country || 'XX').toUpperCase())}:${b.k}`, 1]);
  return out.slice(0, 30);
}

const dayAdd = (d, n) => new Date(Date.parse(d + 'T00:00:00Z') + n * 864e5).toISOString().slice(0, 10);
/** Cộng dồn theo khoảng ngày [from, to] (gồm 2 đầu). rows: [{day, kind, n}] */
const sumK = (rows, kind, from, to) => rows.reduce((a, r) => a + (r.kind === kind && r.day >= from && r.day <= to ? +r.n || 0 : 0), 0);

/** Chỉ số 2 nhóm (a/h): D1, D7, thời lượng phiên (giây) – cửa sổ trượt kết thúc hôm qua. */
export function cohorts(rows, today, days = 14) {
  const y = dayAdd(today, -1), out = {};
  for (const c of COH) {
    const n1 = sumK(rows, `adc:${c}:n1`, dayAdd(y, -days), dayAdd(y, -1)), r1 = sumK(rows, `adc:${c}:r1`, dayAdd(y, -days + 1), y);
    const n7 = sumK(rows, `adc:${c}:n1`, dayAdd(y, -days - 7), dayAdd(y, -7)), r7 = sumK(rows, `adc:${c}:r7`, dayAdd(y, -days + 1), y);
    const ses = sumK(rows, `adc:${c}:ses`, dayAdd(y, -days + 1), y), dur = sumK(rows, `adc:${c}:dur`, dayAdd(y, -days + 1), y);
    out[c] = { n1, n7, d1: n1 ? r1 / n1 : null, d7: n7 ? r7 / n7 : null, ses, sl: ses ? dur / ses : null };
  }
  return out;
}

/** Cổng giữ chân: nhóm có quảng cáo tụt > pct % so với đối chứng (D1, D7 hoặc thời lượng phiên) → giảm tần suất.
 *  Trả { factor, prev, why, drop, co } – factor 1 = bình thường, 0.5 = giãn gấp đôi, 0.25 = tắt quảng cáo toàn màn hình. Hồi phục từng nấc ×2. */
export function guardOf(rows, today, opt = {}) {
  const pct = Math.min(Math.max(+opt.pct || 5, 1), 50) / 100, min = Math.max(+opt.min || 200, 50), prev = Math.min(Math.max(+opt.prev || 1, 0.25), 1);
  const co = cohorts(rows, today), a = co.a, h = co.h, drop = {};
  const rel = (x, y) => (x == null || y == null || !(y > 0) ? null : (y - x) / y);
  if (a.n1 >= min && h.n1 >= min) { drop.d1 = rel(a.d1, h.d1); drop.sl = rel(a.sl, h.sl); }
  if (a.n7 >= min && h.n7 >= min) drop.d7 = rel(a.d7, h.d7);
  const vals = Object.values(drop).filter(v => v != null);
  if (!vals.length) return { factor: prev, prev, why: 'sample', drop, co, pct: pct * 100, min };
  const worst = Math.max(...vals);
  let factor = worst > 2 * pct ? 0.25 : worst > pct ? 0.5 : Math.min(1, prev * 2); // xấu → giảm ngay; tốt → hồi 1 nấc mỗi lượt
  if (worst > pct) factor = Math.min(factor, prev);
  return { factor, prev, why: worst > pct ? 'drop' : 'ok', worst, drop, co, pct: pct * 100, min };
}

/** Số liệu cho Quản trị › Quảng cáo. rows: ext_events 'ad*' trong `days` ngày. ecpm: USD / 1000 lượt hiển thị (proxy do quản trị đặt). */
export function stats(rows, today, ecpm = {}, days = 30) {
  const from = dayAdd(today, -days + 1), byDay = {}, place = {}, plat = {}, consent = {}, guardLog = [];
  const ec = p => Math.max(0, +(ecpm[p] ?? ecpm.all ?? 1) || 0);
  for (const r of rows) {
    if (r.day < from) continue;
    const k = String(r.kind).split(':'), n = +r.n || 0;
    if (k[0] === 'ad' && k.length === 4) {
      const [, e, p, pl] = k, pk = `${p}:${pl}`;
      (place[pk] = place[pk] || { plat: p, place: pl, req: 0, imp: 0, nofill: 0, click: 0, show: 0, rewok: 0 })[e] += n;
      (plat[p] = plat[p] || { imp: 0, rev: 0 }).imp += e === 'imp' || e === 'show' ? n : 0;
      if (e === 'imp' || e === 'show') { const rev = n / 1000 * ec(p); plat[p].rev += rev; (byDay[r.day] = byDay[r.day] || { day: r.day, imp: 0, rev: 0 }); byDay[r.day].imp += n; byDay[r.day].rev += rev; }
    } else if (k[0] === 'adk') { const g = (consent[k[1]] = consent[k[1]] || { pa: 0, npa: 0, deny: 0, na: 0 }); if (k[2] in g) g[k[2]] += n; }
    else if (k[0] === 'adg') guardLog.push({ day: r.day, factor: (+k[1] || 100) / 100 });
  }
  const series = Array.from({ length: days }, (_, i) => { const d = dayAdd(from, i); return byDay[d] || { day: d, imp: 0, rev: 0 }; });
  const places = Object.values(place).map(x => ({ ...x, fill: x.req ? (x.imp + x.show) / x.req : null, ctr: x.imp ? x.click / x.imp : null }));
  // Chuỗi giữ chân theo tuần (cửa sổ 7 ngày trượt, 4 điểm) cho biểu đồ
  const trend = [21, 14, 7, 0].map(back => ({ day: dayAdd(today, -back), ...cohorts(rows, dayAdd(today, -back), 7) }));
  return { from, days, series, places, plat, consent, guardLog: guardLog.sort((a, b) => (a.day < b.day ? -1 : 1)), trend, cohorts: cohorts(rows, today) };
}

// ---------- Doanh thu THẬT (AdSense Management API v2 + AdMob API v1) ----------
// scripts/ads/report.mjs (Action ads-revenue.yml, 06:00 UTC) → POST /api/ads-report (ads-report.js) → bảng ads_rev, PK (day, src, dim, key):
// mọi truy vấn = khoảng ngày (SEARCH). 1 dòng = mọi chỉ số của 1 khóa (ít dòng hơn ext_events × chỉ số). Tiền = micro-USD (số nguyên).
export const REV_SRC = ['adsense', 'admob'], REV_DIM = ['total', 'unit', 'country'], REV_M = ['earn', 'imp', 'click', 'req', 'mreq', 'pv'];
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/, KEY_RE = /^[A-Za-z0-9_:.-]{1,48}$/;
const intOk = v => Number.isSafeInteger(v) && v >= 0 && v <= 1e13;
/** Gói từ CI → { from, to, srcs, rows } hợp lệ, hoặc ném Error('bad:<lý do>'). Khoảng ≤ 40 ngày, ≤ 4000 dòng. */
export function cleanRev(b) {
  const from = String((b && b.from) || ''), to = String((b && b.to) || ''), srcs = [...new Set([].concat((b && b.srcs) || []))];
  if (!DAY_RE.test(from) || !DAY_RE.test(to) || from > to || (Date.parse(to) - Date.parse(from)) / 864e5 > 40) throw new Error('bad:range');
  if (!srcs.length || srcs.some(x => !REV_SRC.includes(x))) throw new Error('bad:srcs');
  const raw = Array.isArray(b.rows) ? b.rows : null; if (!raw || raw.length > 4000) throw new Error('bad:rows');
  const seen = new Set(), rows = [];
  for (const r of raw) {
    if (!r || !DAY_RE.test(r.day) || r.day < from || r.day > to || !srcs.includes(r.src) || !REV_DIM.includes(r.dim) || !KEY_RE.test(String(r.key))) throw new Error('bad:row');
    const o = { day: r.day, src: r.src, dim: r.dim, key: String(r.key) };
    for (const m of REV_M) { const v = r[m] == null ? 0 : r[m]; if (!intOk(v)) throw new Error('bad:' + m); o[m] = v; }
    const pk = revPk(o); if (seen.has(pk)) throw new Error('bad:dup'); seen.add(pk); rows.push(o);
  }
  return { from, to, srcs, rows };
}
const revPk = r => `${r.day}|${r.src}|${r.dim}|${r.key}`;
/** Ghi đè khoảng đã lấy: so với dòng cũ (cùng khoảng ngày, nguồn đã lấy) → chỉ ghi dòng đổi/mới, xóa khóa không còn. Không đổi = 0 ghi. */
export function diffRev(old, fresh, srcs) {
  const prev = new Map(old.filter(r => srcs.includes(r.src)).map(r => [revPk(r), r])), up = [];
  for (const r of fresh) { const o = prev.get(revPk(r)); prev.delete(revPk(r)); if (!o || REV_M.some(m => +o[m] !== r[m])) up.push(r); }
  return { up, del: [...prev.values()], same: fresh.length - up.length };
}
const usdOf = micros => (+micros || 0) / 1e6;
const zero = () => ({ earn: 0, imp: 0, click: 0, req: 0, mreq: 0, pv: 0 });
const addM = (a, r) => { for (const m of REV_M) a[m] += +r[m] || 0; return a; };
const ratios = a => ({ ...a, usd: usdOf(a.earn), ecpm: a.imp ? usdOf(a.earn) / a.imp * 1000 : null, fill: a.req ? a.mreq / a.req : null, ctr: a.imp ? a.click / a.imp : null, rpm: a.pv ? usdOf(a.earn) / a.pv * 1000 : null });
const platOfKey = (src, key) => (src === 'adsense' ? 'web' : String(key).split(':')[0]);
/** Số liệu doanh thu thật cho Quản trị › Quảng cáo › Tổng quan.
 *  rev: dòng ads_rev (≥ 35 ngày), adEv: ext_events 'ad:*' (proxy), ecpm: eCPM đặt tay → "ước tính vs thật" 7 ngày theo nền tảng. meta: config ads_report. */
export function realOf(rev, today, meta, adEv = [], ecpm = {}) {
  const y = dayAdd(today, -1), w0 = dayAdd(today, -7), m0 = today.slice(0, 8) + '01', s0 = dayAdd(today, -30);
  const tot = rev.filter(r => r.dim === 'total');
  const per = (from, to) => ratios(tot.filter(r => r.day >= from && r.day <= to).reduce(addM, zero()));
  const byDay = {}; for (const r of tot) if (r.day >= s0) byDay[r.day] = (byDay[r.day] || 0) + usdOf(r.earn);
  const series = Array.from({ length: 30 }, (_, i) => { const d = dayAdd(s0, i + 1); return { day: d, rev: byDay[d] || 0 }; });
  const group = (dim, key) => { const g = {}; for (const r of rev) if (r.dim === dim && r.day >= w0 && r.day <= y) addM(g[key(r)] = g[key(r)] || zero(), r); return g; };
  const places = Object.entries(group('unit', r => platOfKey(r.src, r.key) + '|' + (r.src === 'adsense' ? String(r.key).replace(/^web:/, '') : String(r.key).split(':').slice(1).join(':'))))
    .map(([k, a]) => { const [plat, place] = k.split('|'); return { plat, place, ...ratios(a) }; }).sort((a, b) => b.earn - a.earn || b.imp - a.imp);
  const countries = Object.entries(group('country', r => r.key)).map(([cc, a]) => ({ cc, ...ratios(a) })).sort((a, b) => (a.cc === '_o') - (b.cc === '_o') || b.earn - a.earn || b.imp - a.imp);
  // Ước tính (lượt hiển thị × eCPM đặt tay) vs thật, 7 ngày đã xong theo nền tảng; lệch = (ước tính − thật) / thật
  const real7 = { web: 0, android: 0, ios: 0 }, est7 = { web: 0, android: 0, ios: 0 };
  for (const r of rev) if (r.day >= w0 && r.day <= y && (r.src === 'adsense' ? r.dim === 'total' : r.dim === 'unit')) { const p = platOfKey(r.src, r.key); if (p in real7) real7[p] += usdOf(r.earn); }
  for (const r of adEv) { const k = String(r.kind).split(':'); if (k[0] === 'ad' && (k[1] === 'imp' || k[1] === 'show') && k[2] in est7 && r.day >= w0 && r.day <= y) est7[k[2]] += (+r.n || 0) / 1000 * Math.max(0, +(ecpm[k[2]] ?? 1) || 0); }
  const vs = PLATS.map(p => ({ plat: p, est: est7[p], real: real7[p], dev: real7[p] > 0 ? (est7[p] - real7[p]) / real7[p] : null }));
  return { yday: per(y, y), d7: per(w0, y), mtd: per(m0, today), series, places, countries, vs, ...reporting(meta) };
}
/** Trạng thái nối báo cáo: có lượt ghi thành công từ Action (config ads_report) → connected. Không còn cần biến môi trường ở Pages. */
export function reporting(meta) {
  const m = meta && typeof meta === 'object' ? meta : null;
  return m && m.at ? { connected: true, at: +m.at, srcs: m.srcs || [], range: [m.from, m.to] } : { connected: false };
}

// ---------- AdMob Server-Side Verification (thưởng AI) ----------
const KEYS_URL = 'https://www.gstatic.com/admob/reward/verifier-keys.json';
let keyCache = null, keyAt = 0;
const b64u = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), c => c.charCodeAt(0));
/** Chữ ký DER (ECDSA) → dạng r||s 64 byte cho WebCrypto. */
export function derToRaw(der) {
  let i = 2; if (der[1] & 0x80) i += der[1] & 0x7f;
  const int = () => { i++; const len = der[i++]; let v = der.slice(i, i + len); i += len; while (v.length > 32 && v[0] === 0) v = v.slice(1); const o = new Uint8Array(32); o.set(v, 32 - v.length); return o; };
  const r = int(), s = int(), out = new Uint8Array(64); out.set(r); out.set(s, 32); return out;
}
/** Xác minh URL gọi lại SSV của AdMob. Trả tham số (Object) nếu hợp lệ, null nếu không. fetchKeys để test. */
export async function verifySsv(url, fetchKeys) {
  const u = new URL(url), q = u.search.slice(1), at = q.indexOf('&signature=');
  if (at < 0) return null;
  const msg = q.slice(0, at), p = Object.fromEntries(u.searchParams), sig = p.signature, kid = p.key_id;
  if (!sig || !kid) return null;
  if (!keyCache || Date.now() - keyAt > 864e5) { keyCache = await (fetchKeys ? fetchKeys() : fetch(KEYS_URL).then(r => r.json())); keyAt = Date.now(); }
  const k = ((keyCache && keyCache.keys) || []).find(x => String(x.keyId) === String(kid));
  if (!k) return null;
  const spki = b64u(String(k.base64).replace(/\s/g, ''));
  const key = await crypto.subtle.importKey('spki', spki, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
  const okSig = await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, key, derToRaw(b64u(sig)), new TextEncoder().encode(msg));
  return okSig ? p : null;
}
