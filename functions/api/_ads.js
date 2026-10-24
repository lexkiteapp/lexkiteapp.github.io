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

/** Báo cáo chính chủ AdSense Management API / AdMob API – CHƯA nối (cần tài khoản + OAuth của chủ). Trả null → Quản trị hiện "chưa kết nối". */
export async function reporting(env) {
  if (!env || !env.ADSENSE_REPORT_TOKEN || !env.ADMOB_REPORT_TOKEN) return { adsense: null, admob: null, connected: false };
  return { adsense: null, admob: null, connected: false, note: 'stub' }; // TODO(docs/ADS.md §7): accounts.reports.generate / networkReport:generate
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
