#!/usr/bin/env node
// Đánh giá cửa hàng → artifact + tóm tắt CI (workflow store-reviews.yml). Chỉ ĐỌC; không trả lời đánh giá, không in bí mật.
//   App Store: App Store Connect API GET /v1/apps/{id}/customerReviews (khoá ASC_KEY_ID/ASC_ISSUER_ID/ASC_KEY_P8 – vai trò Admin/App Manager/Customer Support).
//   Google Play: Android Publisher API v3 reviews.list (secret PLAY_SERVICE_ACCOUNT_JSON – CHƯA có → bỏ qua, ghi việc chủ cần làm). Play chỉ trả đánh giá có chữ trong ~7 ngày gần nhất.
// Dùng: node scripts/store/reviews.mjs [out-dir=out/reviews] [--days 30]   → reviews.json + REVIEWS.md (+ $GITHUB_STEP_SUMMARY)
// Không ghi tên người đánh giá (nickname) – chỉ sao, ngôn ngữ/quốc gia, tiêu đề, nội dung, phiên bản, ngày.
import fs from 'node:fs';
import crypto from 'node:crypto';

export const ASC_APP_ID = '6824714708', PLAY_PKG = 'com.lexkite.app';
const b64u = x => Buffer.from(typeof x === 'string' ? x : JSON.stringify(x)).toString('base64url');

export function ascJwt({ kid, iss, pem }, now = Math.floor(Date.now() / 1000)) {
  const head = b64u({ alg: 'ES256', kid, typ: 'JWT' }), body = b64u({ iss, iat: now, exp: now + 1100, aud: 'appstoreconnect-v1' });
  const sig = crypto.sign('sha256', Buffer.from(`${head}.${body}`), { key: pem, dsaEncoding: 'ieee-p1363' }).toString('base64url');
  return `${head}.${body}.${sig}`;
}
export function googleJwt(sa, now = Math.floor(Date.now() / 1000)) {
  const head = b64u({ alg: 'RS256', typ: 'JWT' }), body = b64u({ iss: sa.client_email, scope: 'https://www.googleapis.com/auth/androidpublisher', aud: sa.token_uri || 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 });
  const sig = crypto.sign('sha256', Buffer.from(`${head}.${body}`), sa.private_key).toString('base64url');
  return `${head}.${body}.${sig}`;
}
const clip = (s, n) => { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1) + '…' : s; };

// Chuẩn hoá về một dạng chung
export const fromAsc = d => (d || []).map(r => ({ store: 'ios', id: r.id, stars: r.attributes.rating, title: r.attributes.title || '', body: r.attributes.body || '', lang: '', country: r.attributes.territory || '', version: '', at: r.attributes.createdDate }));
export const fromPlay = d => (d || []).map(r => { const c = ((r.comments || []).find(x => x.userComment) || {}).userComment || {}; const s = c.lastModified && c.lastModified.seconds; return { store: 'android', id: r.reviewId, stars: c.starRating, title: '', body: c.text || '', lang: c.reviewerLanguage || '', country: '', version: c.appVersionName || '', at: s ? new Date(+s * 1000).toISOString() : '' }; });

export function summary(list, notes = []) {
  const by = s => list.filter(r => r.store === s), avg = a => a.length ? (a.reduce((x, r) => x + (+r.stars || 0), 0) / a.length).toFixed(2) : '–';
  const row = r => `| ${r.store === 'ios' ? 'iOS' : 'Android'} | ${'★'.repeat(+r.stars || 0)}${'☆'.repeat(5 - (+r.stars || 0))} | ${(r.at || '').slice(0, 10)} | ${r.country || r.lang} | ${r.version} | ${clip((r.title ? r.title + ' – ' : '') + r.body, 220).replace(/\|/g, '/')} |`;
  return [`# ⭐ Đánh giá cửa hàng – ${list.length} đánh giá`, '',
    `iOS: ${by('ios').length} (TB ${avg(by('ios'))}) · Android: ${by('android').length} (TB ${avg(by('android'))}) · ≤ 2 sao: ${list.filter(r => r.stars <= 2).length}`, '',
    ...notes.map(n => '- ' + n), '',
    '| Store | Sao | Ngày | Nơi | Bản | Nội dung |', '|---|---|---|---|---|---|',
    ...list.slice().sort((a, b) => (a.stars - b.stars) || String(b.at).localeCompare(String(a.at))).slice(0, 100).map(row)].join('\n');
}

async function getJson(url, opt, tries = 4) {
  for (let i = 0; ; i++) {
    const r = await fetch(url, { ...opt, signal: AbortSignal.timeout(30000) }).catch(e => ({ ok: false, status: 0, text: async () => String(e.message) }));
    if ((r.status === 429 || r.status >= 500 || r.status === 0) && i < tries) { await new Promise(s => setTimeout(s, 3000 * (i + 1))); continue; }
    const t = await r.text(); if (!r.ok) throw new Error(`HTTP ${r.status} ${clip(t, 300)}`);
    return t ? JSON.parse(t) : {};
  }
}
export async function ascReviews(env, { days = 30, fetchJson = getJson } = {}) {
  const k = { kid: env.ASC_KEY_ID, iss: env.ASC_ISSUER_ID, pem: env.ASC_KEY_P8 };
  if (!k.kid || !k.iss || !k.pem) return { skip: 'thiếu ASC_KEY_ID/ASC_ISSUER_ID/ASC_KEY_P8' };
  const since = Date.now() - days * 864e5, out = [];
  let url = `https://api.appstoreconnect.apple.com/v1/apps/${ASC_APP_ID}/customerReviews?sort=-createdDate&limit=200&fields[customerReviews]=rating,title,body,territory,createdDate`;
  for (let page = 0; url && page < 10; page++) {
    const j = await fetchJson(url, { headers: { Authorization: `Bearer ${ascJwt(k)}` } });
    const rows = fromAsc(j.data); out.push(...rows.filter(r => Date.parse(r.at) >= since));
    url = rows.length && Date.parse(rows[rows.length - 1].at) >= since ? j.links && j.links.next : null;
  }
  return { list: out };
}
export async function playReviews(env, { fetchJson = getJson } = {}) {
  if (!env.PLAY_SERVICE_ACCOUNT_JSON) return { skip: 'chưa có secret PLAY_SERVICE_ACCOUNT_JSON' };
  let sa; try { sa = JSON.parse(env.PLAY_SERVICE_ACCOUNT_JSON); } catch { return { error: 'PLAY_SERVICE_ACCOUNT_JSON không phải JSON hợp lệ' }; }
  if (!sa.client_email || !sa.private_key) return { error: 'PLAY_SERVICE_ACCOUNT_JSON thiếu client_email/private_key' };
  const tk = await fetchJson(sa.token_uri || 'https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: googleJwt(sa) }).toString() });
  const out = []; let token = '';
  for (let page = 0; page < 20; page++) {
    const j = await fetchJson(`https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PLAY_PKG}/reviews?maxResults=100${token ? '&token=' + encodeURIComponent(token) : ''}`, { headers: { Authorization: `Bearer ${tk.access_token}` } });
    out.push(...fromPlay(j.reviews)); token = j.tokenPagination && j.tokenPagination.nextPageToken; if (!token) break;
  }
  return { list: out };
}

async function main() {
  const A = process.argv.slice(2), OUT = A.find(a => !a.startsWith('--')) || 'out/reviews', di = A.indexOf('--days'), days = di >= 0 ? +A[di + 1] || 30 : 30;
  fs.mkdirSync(OUT, { recursive: true });
  const notes = [], list = []; let hard = 0;
  for (const [name, fn] of [['App Store', () => ascReviews(process.env, { days })], ['Google Play', () => playReviews(process.env)]]) {
    let r; try { r = await fn(); } catch (e) { r = { error: e.message }; }
    if (r.list) { list.push(...r.list); notes.push(`${name}: ${r.list.length} đánh giá${name === 'App Store' ? ` (${days} ngày)` : ' (Play API: ~7 ngày gần nhất)'}`); }
    else if (r.skip) notes.push(`${name}: bỏ qua – ${r.skip}${name === 'Google Play' ? ' (owner: Play Console → Setup → API access → tạo service account, cấp quyền "View app information" + "Reply to reviews" → tải khoá JSON → secret PLAY_SERVICE_ACCOUNT_JSON)' : ''}`);
    else { hard++; notes.push(`${name}: ❌ ${r.error}`); console.log(`::error::${name}: ${r.error}`); }
  }
  const md = summary(list, notes);
  fs.writeFileSync(`${OUT}/reviews.json`, JSON.stringify({ at: new Date().toISOString(), days, notes, reviews: list }, null, 1));
  fs.writeFileSync(`${OUT}/REVIEWS.md`, md);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md + '\n');
  console.log(md.split('\n').slice(0, 8).join('\n'));
  return hard ? 1 : 0;
}
if (process.argv[1] && /(^|[\/])store[\/]reviews\.mjs$/.test(process.argv[1])) main().then(c => process.exit(c), e => { console.error('✗ ' + e.message); process.exit(1); });
