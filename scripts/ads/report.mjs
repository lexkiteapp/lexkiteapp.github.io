#!/usr/bin/env node
// 💰 Doanh thu THẬT hằng ngày (docs/ADS.md §5) – Action ads-revenue.yml, 06:00 UTC.
//   AdSense Management API v2 accounts.reports.generate + AdMob API v1 networkReport.generate (account pub-2290668854727752)
//   khoảng = min(đầu tháng, hôm nay − 7) → hôm nay, ghi đè (Google sửa số trễ) → POST https://lexkite.com/api/ads-report (X-Studio-Secret) → D1 ads_rev.
// Xác thực OAuth NGƯỜI DÙNG (2 API này không nhận service account): ADS_OAUTH_CLIENT_ID / ADS_OAUTH_CLIENT_SECRET / ADS_OAUTH_REFRESH
//   (lấy 1 lần: node scripts/ads-oauth.mjs). Thiếu secret → chạy fixture (dry-run) + cảnh báo, thoát 0. Không bao giờ in token.
// Cờ: --fixture <thư mục> (đọc adsense-{total,unit,country}.json + admob-{unit,country}.json thay vì gọi API) · --dry (không POST) · --today YYYY-MM-DD
// Hạn mức: 5 lượt API/ngày (AdSense 10.000/ngày, AdMob 10.000/ngày) · ≤ 1 lượt POST · D1 ghi theo diff.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

export const PUB = 'pub-2290668854727752';
export const PLACES = ['home', 'done', 'blog_mid', 'blog', 'dict', 'inter', 'rew', 'banner'];
const ADSENSE_M = ['ESTIMATED_EARNINGS', 'IMPRESSIONS', 'CLICKS', 'AD_REQUESTS', 'MATCHED_AD_REQUESTS', 'IMPRESSIONS_RPM'];
const ADMOB_M = ['ESTIMATED_EARNINGS', 'IMPRESSIONS', 'CLICKS', 'AD_REQUESTS', 'MATCHED_REQUESTS', 'IMPRESSION_RPM'];
const day = t => new Date(t).toISOString().slice(0, 10);
const addDays = (d, n) => day(Date.parse(d + 'T00:00:00Z') + n * 864e5);
/** Khoảng lấy: 7 ngày gần nhất (gồm hôm nay) ∪ tháng này. */
export const rangeOf = today => { const m0 = today.slice(0, 8) + '01', w0 = addDays(today, -7); return { from: m0 < w0 ? m0 : w0, to: today }; };
const micros = v => Math.max(0, Math.round((parseFloat(v) || 0) * 1e6));
const int = v => Math.max(0, Math.round(+v || 0));
const slug = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 24);

/** Mã ô quảng cáo → tên vị trí, từ web/js/ads/config.js (AdSense slots; AdMob live banner/interstitial/rewarded). */
export function unitMap(cfgFile = 'web/js/ads/config.js') {
  const g = {}; try { vm.runInNewContext(fs.readFileSync(cfgFile, 'utf8'), { self: g }); } catch (e) { return {}; }
  const c = g.ADS_CONFIG || {}, map = {};
  for (const [place, id] of Object.entries((c.web && c.web.slots) || {})) if (id) map[String(id)] = place;
  const role = { banner: 'banner', interstitial: 'inter', rewarded: 'rew' };
  for (const p of ['android', 'ios']) for (const [k, id] of Object.entries((c.native && c.native.live && c.native.live[p]) || {})) if (role[k] && id) map[String(id)] = role[k];
  return map;
}
/** Tên vị trí của 1 ô: theo mã trong config → theo tên ô (đặt tên ô trong AdSense/AdMob = home, done, blog_mid, rew_ai…) → 'u_<tên>'. */
export function placeOf(id, label, map = {}) {
  const tail = String(id || '').split(/[:/]/).pop();
  if (map[id]) return map[id]; if (map[tail]) return map[tail];
  const s = slug(label);
  const rew = s.match(/^(?:rew|rewarded)_([a-z0-9]+)/); if (rew) return 'rew:' + rew[1].slice(0, 16);
  for (const p of PLACES) if (s === p || s.startsWith(p + '_')) return p === 'banner' ? 'banner' : p;
  if (/^interstitial/.test(s)) return 'inter'; if (/^rewarded/.test(s)) return 'rew';
  return s ? 'u_' + s.slice(0, 20) : 'other';
}

// ---------- Phân tích phản hồi ----------
/** AdSense ReportResult { headers:[{name}], rows:[{cells:[{value}]}] } → [{…cột theo tên}]. */
export function adsenseTable(res) {
  const h = ((res && res.headers) || []).map(x => x.name);
  return ((res && res.rows) || []).map(r => Object.fromEntries(h.map((n, i) => [n, ((r.cells || [])[i] || {}).value])));
}
const fromAdsense = r => ({ earn: micros(r.ESTIMATED_EARNINGS), imp: int(r.IMPRESSIONS), click: int(r.CLICKS), req: int(r.AD_REQUESTS), mreq: int(r.MATCHED_AD_REQUESTS), pv: int(r.PAGE_VIEWS) });
/** AdMob networkReport (mảng [{header},{row}…,{footer}]) → [{ DATE, PLATFORM, AD_UNIT, AD_UNIT_LABEL, COUNTRY, …chỉ số }]. */
export function admobTable(res) {
  const list = Array.isArray(res) ? res : [];
  return list.filter(x => x && x.row).map(({ row }) => {
    const o = {}, dv = row.dimensionValues || {}, mv = row.metricValues || {};
    for (const [k, v] of Object.entries(dv)) { o[k] = v && v.value; if (v && v.displayLabel) o[k + '_LABEL'] = v.displayLabel; }
    for (const [k, v] of Object.entries(mv)) o[k] = v == null ? 0 : v.microsValue != null ? +v.microsValue / 1e6 : v.integerValue != null ? +v.integerValue : +v.doubleValue || 0;
    if (o.DATE && /^\d{8}$/.test(o.DATE)) o.DATE = `${o.DATE.slice(0, 4)}-${o.DATE.slice(4, 6)}-${o.DATE.slice(6)}`;
    return o;
  });
}
const fromAdmob = r => ({ earn: micros(r.ESTIMATED_EARNINGS), imp: int(r.IMPRESSIONS), click: int(r.CLICKS), req: int(r.AD_REQUESTS), mreq: int(r.MATCHED_REQUESTS), pv: 0 });
const M = ['earn', 'imp', 'click', 'req', 'mreq', 'pv'];
const put = (acc, day, src, dim, key, m) => { const k = `${day}|${src}|${dim}|${key}`, o = acc.get(k) || { day, src, dim, key, earn: 0, imp: 0, click: 0, req: 0, mreq: 0, pv: 0 }; for (const x of M) o[x] += m[x] || 0; acc.set(k, o); };
/** Quốc gia: giữ top 10 theo doanh thu (rồi lượt hiển thị) trên CẢ khoảng, còn lại gộp '_o'. */
function countries(acc, src, list, of) {
  const tot = {}; for (const r of list) { const m = of(r), cc = String(r.cc || 'ZZ').toUpperCase(); (tot[cc] = tot[cc] || [0, 0]); tot[cc][0] += m.earn; tot[cc][1] += m.imp; }
  const top = new Set(Object.entries(tot).sort((a, b) => b[1][0] - a[1][0] || b[1][1] - a[1][1] || (a[0] < b[0] ? -1 : 1)).slice(0, 10).map(x => x[0]));
  for (const r of list) { const cc = String(r.cc || 'ZZ').toUpperCase(); put(acc, r.DATE, src, 'country', top.has(cc) && /^[A-Z]{2}$/.test(cc) ? cc : '_o', of(r)); }
}
/** Gộp 5 báo cáo → dòng ads_rev chuẩn. adsense/admob = null khi nguồn không lấy được (không ghi đè nguồn đó). */
export function buildRows({ adsense, admob }, map = {}) {
  const acc = new Map(), srcs = [];
  if (adsense) {
    srcs.push('adsense');
    for (const r of adsenseTable(adsense.total)) put(acc, r.DATE, 'adsense', 'total', 'all', fromAdsense(r));
    for (const r of adsenseTable(adsense.unit)) put(acc, r.DATE, 'adsense', 'unit', 'web:' + placeOf(r.AD_UNIT_ID, r.AD_UNIT_NAME, map), fromAdsense(r));
    countries(acc, 'adsense', adsenseTable(adsense.country).map(r => ({ ...r, cc: r.COUNTRY_CODE })), fromAdsense);
  }
  if (admob) {
    srcs.push('admob');
    for (const r of admobTable(admob.unit)) {
      const plat = /ios/i.test(r.PLATFORM) ? 'ios' : /android/i.test(r.PLATFORM) ? 'android' : 'app', m = fromAdmob(r);
      put(acc, r.DATE, 'admob', 'unit', plat + ':' + placeOf(r.AD_UNIT, r.AD_UNIT_LABEL, map), m);
      put(acc, r.DATE, 'admob', 'total', 'all', m);
    }
    countries(acc, 'admob', admobTable(admob.country).map(r => ({ ...r, cc: r.COUNTRY })), fromAdmob);
  }
  return { srcs, rows: [...acc.values()].filter(r => /^\d{4}-\d{2}-\d{2}$/.test(r.day)).sort((a, b) => (a.day + a.src + a.dim + a.key < b.day + b.src + b.dim + b.key ? -1 : 1)) };
}

// ---------- Gọi Google ----------
const ymd = d => { const [year, month, dd] = d.split('-').map(Number); return { year, month, day: dd }; };
export function adsenseUrl(dims, metrics, { from, to }) {
  const q = new URLSearchParams({ dateRange: 'CUSTOM', currencyCode: 'USD', reportingTimeZone: 'ACCOUNT_TIME_ZONE' });
  for (const [k, v] of Object.entries(ymd(from))) q.set('startDate.' + k, v);
  for (const [k, v] of Object.entries(ymd(to))) q.set('endDate.' + k, v);
  for (const d of dims) q.append('dimensions', d); for (const m of metrics) q.append('metrics', m);
  return `https://adsense.googleapis.com/v2/accounts/${PUB}/reports:generate?${q}`;
}
export const admobBody = (dims, { from, to }) => ({ reportSpec: { dateRange: { startDate: ymd(from), endDate: ymd(to) }, dimensions: dims, metrics: ADMOB_M, localizationSettings: { currencyCode: 'USD' } } });

async function accessToken(env) {
  const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: env.ADS_OAUTH_CLIENT_ID, client_secret: env.ADS_OAUTH_CLIENT_SECRET, refresh_token: env.ADS_OAUTH_REFRESH, grant_type: 'refresh_token' }) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.access_token) throw new Error(`oauth ${r.status} ${j.error || ''} ${j.error === 'invalid_grant' ? '(refresh token hết hạn/thu hồi – consent screen phải ở "In production"; chạy lại node scripts/ads-oauth.mjs)' : ''}`.trim());
  return j.access_token;
}
async function gget(url, tok, init = {}) {
  const r = await fetch(url, { ...init, headers: { Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json', ...(init.headers || {}) } });
  const t = await r.text(); let j; try { j = JSON.parse(t); } catch (e) { j = null; }
  if (!r.ok) throw new Error(`${new URL(url).host} ${r.status} ${(j && j.error && (j.error.status || j.error.message)) || t.slice(0, 120)}`);
  return j;
}
/** Lấy 5 báo cáo. Mỗi nguồn độc lập: lỗi 1 nguồn → null (nguồn kia vẫn ghi). */
export async function fetchAll(env, range, log = console.log) {
  const tok = await accessToken(env), out = { adsense: null, admob: null, errors: [] };
  try {
    const [total, unit, country] = await Promise.all([
      gget(adsenseUrl(['DATE'], [...ADSENSE_M, 'PAGE_VIEWS'], range), tok),
      gget(adsenseUrl(['DATE', 'AD_UNIT_ID', 'AD_UNIT_NAME'], ADSENSE_M, range), tok),
      gget(adsenseUrl(['DATE', 'COUNTRY_CODE'], ADSENSE_M, range), tok),
    ]);
    out.adsense = { total, unit, country };
  } catch (e) { out.errors.push('adsense: ' + e.message); log('⚠ AdSense: ' + e.message); }
  try {
    const u = `https://admob.googleapis.com/v1/accounts/${PUB}/networkReport:generate`;
    const [unit, country] = await Promise.all([
      gget(u, tok, { method: 'POST', body: JSON.stringify(admobBody(['DATE', 'PLATFORM', 'AD_UNIT'], range)) }),
      gget(u, tok, { method: 'POST', body: JSON.stringify(admobBody(['DATE', 'COUNTRY'], range)) }),
    ]);
    out.admob = { unit, country };
  } catch (e) { out.errors.push('admob: ' + e.message); log('⚠ AdMob: ' + e.message); }
  return out;
}
export function readFixture(dir) {
  const rd = f => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  return { adsense: { total: rd('adsense-total.json'), unit: rd('adsense-unit.json'), country: rd('adsense-country.json') }, admob: { unit: rd('admob-unit.json'), country: rd('admob-country.json') }, errors: [] };
}

// ---------- CLI ----------
async function main() {
  const a = process.argv.slice(2), arg = k => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : null; };
  const env = process.env, today = arg('--today') || day(Date.now()), range = rangeOf(today), summary = [];
  let fixture = arg('--fixture'), dry = a.includes('--dry');
  const have = env.ADS_OAUTH_CLIENT_ID && env.ADS_OAUTH_CLIENT_SECRET && env.ADS_OAUTH_REFRESH;
  if (!fixture && !have) {
    console.log('::warning::Chưa nối Google (thiếu ADS_OAUTH_CLIENT_ID / ADS_OAUTH_CLIENT_SECRET / ADS_OAUTH_REFRESH) → chạy fixture dry-run. Hướng dẫn: docs/ADS.md §5.');
    fixture = 'scripts/test/fixtures/ads-report'; dry = true;
  }
  const raw = fixture ? readFixture(fixture) : await fetchAll(env, range);
  const { srcs, rows } = buildRows(raw, unitMap());
  const pick = fixture ? rows : rows.filter(r => r.day >= range.from && r.day <= range.to);
  const from = fixture ? (pick[0] || {}).day || range.from : range.from, to = fixture ? (pick[pick.length - 1] || {}).day || range.to : range.to;
  const usd = pick.filter(r => r.dim === 'total').reduce((s, r) => s + r.earn, 0) / 1e6;
  summary.push(`Khoảng ${from} → ${to} · nguồn: ${srcs.join(', ') || '—'} · ${pick.length} dòng · tổng $${usd.toFixed(2)}${raw.errors.length ? ' · lỗi: ' + raw.errors.join('; ') : ''}`);
  console.log('· ' + summary[0]);
  if (!srcs.length) { console.error('✗ không lấy được nguồn nào'); process.exit(1); }
  if (dry) { console.log('· --dry: không ghi D1'); }
  else {
    if (!env.STUDIO_CALLBACK_SECRET) { console.error('✗ thiếu STUDIO_CALLBACK_SECRET'); process.exit(1); }
    const r = await fetch(env.ADS_REPORT_API || 'https://lexkite.com/api/ads-report', { method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Studio-Secret': env.STUDIO_CALLBACK_SECRET, 'User-Agent': 'lexkite-ci', ...(env.LEXKITE_CI_HEADER ? { 'X-Lexkite-CI': env.LEXKITE_CI_HEADER } : {}) },
      body: JSON.stringify({ from, to, srcs, rows: pick }) });
    const j = await r.json().catch(() => ({}));
    if (r.status === 429 && j.error === 'quota-guard') { console.log(`::warning::D1 cầu dao (${j.pct} %) – bỏ qua, lượt sau ghi đè 7 ngày`); }
    else if (!r.ok) { console.error(`✗ /api/ads-report ${r.status} ${j.error || ''}`); process.exit(1); }
    else { summary.push(`D1: ghi ${j.written} · xóa ${j.deleted} · không đổi ${j.same}`); console.log('✓ ' + summary[1]); }
  }
  if (raw.errors.length && !fixture) console.log('::warning::' + raw.errors.join(' | '));
  if (env.GITHUB_STEP_SUMMARY) fs.appendFileSync(env.GITHUB_STEP_SUMMARY, '### 💰 Doanh thu thật\n' + summary.map(s => '- ' + s).join('\n') + '\n');
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(e => { console.error('✗ ' + e.message); process.exit(1); });
