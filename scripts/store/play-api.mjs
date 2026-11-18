#!/usr/bin/env node
// Google Play Developer API (androidpublisher v3) – nộp .aab lên kênh production theo phần trăm (staged rollout), ghi chú mọi ngôn ngữ.
// Khoá: PLAY_SERVICE_ACCOUNT_JSON (tài khoản dịch vụ, quyền "Release to production" + "View app information"). Không in khoá/token.
//
//   node scripts/store/play-api.mjs plan   --app capacitor|native --bump patch|minor [--tags "…"]   CHỈ ĐỌC: versionCode/versionName kế tiếp
//   node scripts/store/play-api.mjs submit --aab x.aab --code 1234 --name 1.0.2 --notes notes-android.json [--dry-run]
//   node scripts/store/play-api.mjs rollout [--dry-run] [--min-hours 24] [--last-step-at <unix>]
//       bậc kế tiếp 1 → 5 → 20 → 50 → 100 % nếu Play vitals đạt (crash ≤ 1,09 %, ANR ≤ 0,47 % – ngưỡng "bad behavior" của Play);
//       API vitals không truy cập được → tăng theo lịch (mỗi bậc ≥ --min-hours giờ) và báo ::notice::.
import fs from 'node:fs';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { nextVersion, nextBuild, versionsFromTags, FLOORS } from './version.mjs';
import { LOCALES } from '../store-metadata.mjs';

export const PKG = 'com.lexkite.app';
export const PLAY_NOTES_MAX = 500;
export const STEPS = [0.01, 0.05, 0.2, 0.5, 1];
export const VITALS_MAX = { crash: 0.0109, anr: 0.0047 };
const API = 'https://androidpublisher.googleapis.com/androidpublisher/v3';
const UPLOAD = 'https://androidpublisher.googleapis.com/upload/androidpublisher/v3';
const REPORTING = 'https://playdeveloperreporting.googleapis.com/v1beta1';
const SCOPES = 'https://www.googleapis.com/auth/androidpublisher https://www.googleapis.com/auth/playdeveloperreporting';

/** JWT RS256 của tài khoản dịch vụ (thuần) → đổi lấy access token OAuth2. */
export function serviceJwt(sa, now = Math.floor(Date.now() / 1000), scope = SCOPES) {
  const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
  const head = b64({ alg: 'RS256', typ: 'JWT', ...(sa.private_key_id ? { kid: sa.private_key_id } : {}) });
  const body = b64({ iss: sa.client_email, scope, aud: sa.token_uri || 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 });
  const sig = crypto.sign('sha256', Buffer.from(`${head}.${body}`), sa.private_key).toString('base64url');
  return `${head}.${body}.${sig}`;
}

/** Mã ngôn ngữ Play → mã ghi chú (webLang); lạ → theo tiền tố, cuối cùng en. zh-TW/zh-HK (phồn thể) → en. */
export function noteLangPlay(lang) {
  for (const [, [play, web]] of Object.entries(LOCALES)) if (play === lang) return web;
  if (/^zh-(TW|HK)/i.test(lang)) return 'en';
  const pre = String(lang).split('-')[0].toLowerCase();
  return Object.values(LOCALES).some(([, w]) => w === pre) ? pre : 'en';
}
/** releaseNotes[] cho Play: mọi ngôn ngữ listing của app (thiếu danh sách → 15 ngôn ngữ của store/metadata), mỗi mục ≤ 500 ký tự. */
export function releaseNotes(notes, languages) {
  const langs = languages?.length ? languages : Object.values(LOCALES).map(([p]) => p);
  return langs.map(language => {
    const text = notes[noteLangPlay(language)] || notes.en;
    if (!text) throw new Error(`thiếu ghi chú cho ${language}`);
    if ([...text].length > PLAY_NOTES_MAX) throw new Error(`ghi chú ${language} dài ${[...text].length} > ${PLAY_NOTES_MAX}`);
    return { language, text };
  });
}
/** Thân tracks.update production cho bản mới (staged rollout 1 %). */
export function productionTrack({ code, name, notes, languages, fraction = STEPS[0] }) {
  return { track: 'production', releases: [{ name: `${name} (${code})`, versionCodes: [String(code)], status: 'inProgress', userFraction: fraction, releaseNotes: releaseNotes(notes, languages) }] };
}
/** Bậc rollout kế tiếp (thuần): null = không đổi. 1 → completed (bỏ userFraction). */
export function nextRollout(release) {
  if (!release || release.status !== 'inProgress') return null;
  const f = Number(release.userFraction || 0);
  const nxt = STEPS.find(s => s > f + 1e-9);
  if (nxt == null) return null;
  const { userFraction, ...rest } = release; // eslint-disable-line no-unused-vars
  return nxt >= 1 ? { ...rest, status: 'completed' } : { ...rest, userFraction: nxt };
}
/** Có được tăng bậc không (thuần). vitals = { crash, anr } (tỉ lệ 0–1) hoặc null (API không truy cập được). */
export function rolloutDecision({ vitals, hoursSinceLast, minHours = 24 }) {
  if (hoursSinceLast != null && hoursSinceLast < minHours) return { go: false, why: `mới ${hoursSinceLast.toFixed(1)} giờ từ bậc trước (< ${minHours})` };
  if (!vitals) return { go: true, why: 'vitals không truy cập được – tăng theo lịch' };
  if (vitals.crash != null && vitals.crash > VITALS_MAX.crash) return { go: false, why: `crash ${(vitals.crash * 100).toFixed(2)} % > 1,09 %`, bad: true };
  if (vitals.anr != null && vitals.anr > VITALS_MAX.anr) return { go: false, why: `ANR ${(vitals.anr * 100).toFixed(2)} % > 0,47 %`, bad: true };
  return { go: true, why: `vitals đạt (crash ${vitals.crash == null ? '–' : (vitals.crash * 100).toFixed(2) + ' %'}, ANR ${vitals.anr == null ? '–' : (vitals.anr * 100).toFixed(2) + ' %'})` };
}
/** Mọi versionCode + versionName (từ tên bản "1.0.2 (1234)") đã có trên mọi kênh (thuần). */
export function usedFromTracks(tracks) {
  const codes = [], names = [];
  for (const t of tracks || []) for (const r of t.releases || []) {
    codes.push(...(r.versionCodes || []));
    const m = /(\d+\.\d+(?:\.\d+)?)/.exec(r.name || ''); if (m) names.push(m[1]);
  }
  return { codes, names };
}

export function createPlay(sa, { fetchImpl = globalThis.fetch } = {}) {
  let tok = null, exp = 0;
  async function token() {
    const now = Math.floor(Date.now() / 1000);
    if (tok && now < exp - 120) return tok;
    const r = await fetchImpl(sa.token_uri || 'https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: serviceJwt(sa, now) }) });
    const j = await r.json();
    if (!r.ok) throw new Error(`OAuth token → ${r.status} ${j.error || ''} ${j.error_description || ''}`);
    tok = j.access_token; exp = now + (j.expires_in || 3600); return tok;
  }
  async function call(method, url, body, headers = { 'Content-Type': 'application/json' }) {
    const r = await fetchImpl(url, { method, headers: { Authorization: `Bearer ${await token()}`, ...headers }, body: body == null ? undefined : (Buffer.isBuffer(body) ? body : JSON.stringify(body)) });
    const txt = await r.text();
    if (!r.ok) { let d = txt.slice(0, 500); try { d = JSON.parse(txt).error.message; } catch { /* nguyên văn */ } const e = new Error(`${method} ${url.split('?')[0].replace(/^https:\/\/[^/]+/, '')} → ${r.status} ${d}`); e.status = r.status; throw e; }
    return txt ? JSON.parse(txt) : {};
  }
  const e = (id, p = '') => `${API}/applications/${PKG}/edits/${id}${p}`;
  return {
    call,
    insertEdit: async () => (await call('POST', `${API}/applications/${PKG}/edits`, {})).id,
    deleteEdit: id => call('DELETE', e(id)).catch(() => null),
    tracks: async id => (await call('GET', e(id, '/tracks'))).tracks || [],
    track: (id, t) => call('GET', e(id, `/tracks/${t}`)),
    listings: async id => ((await call('GET', e(id, '/listings'))).listings || []).map(l => l.language),
    uploadBundle: (id, buf) => call('POST', `${UPLOAD}/applications/${PKG}/edits/${id}/bundles?uploadType=media`, buf, { 'Content-Type': 'application/octet-stream' }),
    updateTrack: (id, t, body) => call('PUT', e(id, `/tracks/${t}`), body),
    commit: id => call('POST', e(id, ':commit')),
    async vitals(code) {
      const d = new Date(Date.now() - 2 * 86400000), end = new Date(Date.now() - 86400000);
      const day = x => ({ year: x.getUTCFullYear(), month: x.getUTCMonth() + 1, day: x.getUTCDate() });
      const q = (set, metric) => call('POST', `${REPORTING}/apps/${PKG}/${set}:query`, { timelineSpec: { aggregationPeriod: 'DAILY', startTime: day(d), endTime: day(end) }, metrics: [metric], dimensions: ['versionCode'], filter: `versionCode = ${code}` });
      const pick = (r, metric) => { const rows = r.rows || []; const v = rows.map(x => (x.metrics || []).find(m => m.metric === metric)?.decimalValue?.value).filter(x => x != null).map(Number); return v.length ? Math.max(...v) : null; };
      return { crash: pick(await q('crashRateMetricSet', 'userPerceivedCrashRate'), 'userPerceivedCrashRate'), anr: pick(await q('anrRateMetricSet', 'userPerceivedAnrRate'), 'userPerceivedAnrRate') };
    },
  };
}

const arg = (a, f, d) => { const i = a.indexOf(f); return i >= 0 && a[i + 1] && !a[i + 1].startsWith('--') ? a[i + 1] : d; };
const out = (k, v) => { if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `${k}=${v}\n`); };

async function main() {
  const a = process.argv.slice(2), cmd = a[0], DRY = a.includes('--dry-run');
  const raw = process.env.PLAY_SERVICE_ACCOUNT_JSON;
  if (!raw) { console.log('::notice title=store-submit Android::chưa có secret PLAY_SERVICE_ACCOUNT_JSON – bỏ qua Android'); out('skipped', 'yes'); return; }
  const G = createPlay(JSON.parse(raw));
  if (cmd === 'plan') {
    const id = await G.insertEdit();
    try {
      const { codes, names } = usedFromTracks(await G.tracks(id));
      const app = arg(a, '--app', 'capacitor'), fl = FLOORS[app];
      const tags = (arg(a, '--tags', '') || '').split(/[\s,]+/).filter(Boolean);
      const nv = nextVersion({ used: names.concat(versionsFromTags(tags, 'android'), arg(a, '--min-used', '') ? [arg(a, '--min-used')] : []), bump: arg(a, '--bump', 'patch'), floor: fl.version });
      const p = { version: nv.version, code: nextBuild(codes, fl.androidCode), usedNames: [...new Set(names)].slice(-5), maxCode: codes.length ? Math.max(...codes.map(Number)) : null };
      console.log(JSON.stringify(p)); out('version', p.version); out('code', p.code); out('skipped', 'no');
    } finally { await G.deleteEdit(id); }
    return;
  }
  if (cmd === 'submit') {
    const code = arg(a, '--code'), name = arg(a, '--name'), notes = JSON.parse(fs.readFileSync(arg(a, '--notes', 'notes-android.json'), 'utf8'));
    const id = await G.insertEdit();
    try {
      const langs = await G.listings(id);
      const body = productionTrack({ code, name, notes, languages: langs });
      console.log(`  production ${name} (${code}) 1 % · ghi chú ${body.releases[0].releaseNotes.length} ngôn ngữ`);
      if (DRY) { console.log('✓ dry-run – không tải/commit'); return; }
      const up = await G.uploadBundle(id, fs.readFileSync(arg(a, '--aab')));
      if (String(up.versionCode) !== String(code)) throw new Error(`.aab có versionCode ${up.versionCode}, mong ${code}`);
      await G.updateTrack(id, 'production', body);
      await G.commit(id);
      console.log(`✓ ĐÃ NỘP Android ${name} (${code}) – production 1 %, store-rollout tăng dần khi vitals đạt`);
    } catch (e) { await G.deleteEdit(id); throw e; }
    return;
  }
  if (cmd === 'rollout') {
    const id = await G.insertEdit();
    let committed = false;
    try {
      const t = await G.track(id, 'production');
      const rel = (t.releases || []).find(r => r.status === 'inProgress');
      const nxt = nextRollout(rel);
      if (!nxt) { console.log('= không có bản production đang rollout'); out('advanced', 'no'); return; }
      const code = rel.versionCodes?.[0];
      let vitals = null;
      try { vitals = await G.vitals(code); } catch (e) { console.log(`::notice title=store-rollout::Play vitals không đọc được (${e.status || e.message.slice(0, 80)}) – tăng theo lịch; cấp quyền "View app information" + bật Play Developer Reporting API cho tài khoản dịch vụ để dùng vitals`); }
      const last = +arg(a, '--last-step-at', '0');
      const d = rolloutDecision({ vitals, hoursSinceLast: last ? (Date.now() / 1000 - last) / 3600 : null, minHours: +arg(a, '--min-hours', '24') });
      const pct = nxt.status === 'completed' ? 100 : Math.round(nxt.userFraction * 100);
      if (!d.go) { console.log(`${d.bad ? '::warning title=store-rollout::' : '= '}giữ ${Math.round(rel.userFraction * 100)} % bản ${rel.name}: ${d.why}`); out('advanced', 'no'); return; }
      console.log(`  ${DRY ? '[dry-run] ' : ''}${rel.name}: ${Math.round(rel.userFraction * 100)} % → ${pct} % (${d.why})`);
      out('name', rel.name); out('pct', pct);
      if (DRY) { out('advanced', 'no'); return; }
      await G.updateTrack(id, 'production', { track: 'production', releases: (t.releases || []).map(r => (r === rel ? nxt : r)) });
      await G.commit(id); committed = true; out('advanced', 'yes');
    } finally { if (!committed) await G.deleteEdit(id); }
    return;
  }
  console.error('Dùng: play-api.mjs plan|submit|rollout …'); process.exit(2);
}
if (import.meta.url === pathToFileURL(process.argv[1] || '').href) main().catch(e => { console.log(`::error title=store Android::${e.message}`); process.exit(1); });
