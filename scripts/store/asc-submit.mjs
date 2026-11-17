#!/usr/bin/env node
// Nộp bản iOS mới lên App Store TỰ ĐỘNG qua App Store Connect API (luật chủ 05/11: thay đổi cần duyệt store do CI nộp; chủ chỉ bấm logo/tiền/điều khoản).
// Gọi từ .github/workflows/store-submit.yml. Client + JWT ES256: scripts/lib/asc-api.mjs. Khoá/JWT không bao giờ được in.
//
//   node scripts/store/asc-submit.mjs plan   --app capacitor|native --bump patch|minor [--out plan.json]
//       CHỈ ĐỌC: version kế tiếp (không dùng lại), số build kế tiếp, bản đang sửa được, bản đang chờ duyệt (chặn), ngôn ngữ, quyền khoá.
//   node scripts/store/asc-submit.mjs submit --version 1.0.2 --build 58 --notes notes.json [--dry-run] [--wait-min 75]
//       tạo/nâng appStoreVersion → chờ build VALID → khai mã hoá (false) → gắn build → "What's New" mọi ngôn ngữ → phát hành
//       AFTER_APPROVAL + phased release 7 ngày → reviewSubmission → Submit. Chạy lại an toàn (idempotent từng bước).
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { ascKeyFromEnv, createAsc } from '../lib/asc-api.mjs';
import { nextVersion, nextBuild, versionsFromTags, FLOORS } from './version.mjs';
import { LOCALES } from '../store-metadata.mjs';

export const APP_ID = '6824714708', BUNDLE_ID = 'com.lexkite.app';
// Trạng thái appStoreVersion (appVersionState mới / appStoreState cũ)
export const EDITABLE = ['PREPARE_FOR_SUBMISSION', 'DEVELOPER_REJECTED', 'REJECTED', 'METADATA_REJECTED', 'INVALID_BINARY', 'READY_FOR_REVIEW'];
export const IN_FLIGHT = ['WAITING_FOR_REVIEW', 'IN_REVIEW', 'PENDING_DEVELOPER_RELEASE', 'PENDING_APPLE_RELEASE', 'PROCESSING_FOR_APP_STORE', 'PROCESSING_FOR_DISTRIBUTION', 'ACCEPTED', 'WAITING_FOR_EXPORT_COMPLIANCE', 'PENDING_CONTRACT'];
export const WHATS_NEW_MAX = 4000;
const stateOf = v => v.attributes.appVersionState || v.attributes.appStoreState;

/** Locale App Store → mã ngôn ngữ ghi chú (webLang của store/metadata) – locale lạ theo tiền tố, cuối cùng en. zh-Hant ≠ zh (giản thể) → en. */
export function noteLang(locale) {
  for (const [apple, [, web]] of Object.entries(LOCALES)) if (apple === locale) return web;
  if (/^zh-Hant/i.test(locale)) return 'en';
  const pre = String(locale).split('-')[0].toLowerCase();
  const hit = Object.values(LOCALES).find(([, web]) => web === pre);
  return hit ? hit[1] : 'en';
}
/** Chữ "What's New" cho 1 locale từ bảng ghi chú {lang: text}; luôn ≤ 4000 ký tự. */
export function whatsNewFor(locale, notes) {
  const t = notes[noteLang(locale)] || notes.en;
  if (!t) throw new Error(`thiếu ghi chú cho ${locale}`);
  if ([...t].length > WHATS_NEW_MAX) throw new Error(`ghi chú ${locale} dài ${[...t].length} > ${WHATS_NEW_MAX}`);
  return t;
}

// ---------- Payload (thuần – test so với dạng JSON:API của App Store Connect) ----------
const rel = (type, id) => ({ data: { type, id } });
export const P = {
  createVersion: (appId, versionString) => ({ data: { type: 'appStoreVersions', attributes: { platform: 'IOS', versionString, releaseType: 'AFTER_APPROVAL' }, relationships: { app: rel('apps', appId) } } }),
  patchVersion: (id, attributes) => ({ data: { type: 'appStoreVersions', id, attributes } }),
  attachBuild: buildId => ({ data: { type: 'builds', id: buildId } }),
  encryption: buildId => ({ data: { type: 'builds', id: buildId, attributes: { usesNonExemptEncryption: false } } }),
  whatsNew: (locId, whatsNew) => ({ data: { type: 'appStoreVersionLocalizations', id: locId, attributes: { whatsNew } } }),
  phased: versionId => ({ data: { type: 'appStoreVersionPhasedReleases', attributes: { phasedReleaseState: 'INACTIVE' }, relationships: { appStoreVersion: rel('appStoreVersions', versionId) } } }),
  submission: appId => ({ data: { type: 'reviewSubmissions', attributes: { platform: 'IOS' }, relationships: { app: rel('apps', appId) } } }),
  submissionItem: (subId, versionId) => ({ data: { type: 'reviewSubmissionItems', relationships: { reviewSubmission: rel('reviewSubmissions', subId), appStoreVersion: rel('appStoreVersions', versionId) } } }),
  submit: subId => ({ data: { type: 'reviewSubmissions', id: subId, attributes: { submitted: true } } }),
};

/** Kế hoạch từ dữ liệu ASC đã đọc (thuần). */
export function planFrom({ versions, builds, tags = [], app = 'capacitor', bump = 'patch' }) {
  const fl = FLOORS[app]; if (!fl) throw new Error(`app phải là capacitor|native, không phải ${app}`);
  const inflight = versions.find(v => IN_FLIGHT.includes(stateOf(v)));
  const editable = versions.find(v => EDITABLE.includes(stateOf(v)));
  const used = versions.filter(v => !EDITABLE.includes(stateOf(v))).map(v => v.attributes.versionString).concat(versionsFromTags(tags, 'ios'));
  const nv = nextVersion({ used, editable: editable?.attributes.versionString || null, bump, floor: fl.version });
  return {
    version: nv.version, build: nextBuild(builds.map(b => b.attributes.version), fl.iosBuild),
    editable: editable ? { id: editable.id, version: editable.attributes.versionString, state: stateOf(editable) } : null,
    reuseEditable: nv.reuseEditable,
    blocked: inflight ? `bản ${inflight.attributes.versionString} đang ${stateOf(inflight)} – Apple chỉ cho 1 bản trong hàng duyệt; chạy lại sau khi bản đó xong` : null,
    live: versions.filter(v => ['READY_FOR_SALE', 'READY_FOR_DISTRIBUTION'].includes(stateOf(v))).map(v => v.attributes.versionString)[0] || null,
  };
}

const arg = (a, f, d) => { const i = a.indexOf(f); return i >= 0 && a[i + 1] && !a[i + 1].startsWith('--') ? a[i + 1] : d; };
const out = (k, v) => { if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `${k}=${v}\n`); };
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function loadApp(C) {
  const app = (await C.get(`/v1/apps/${APP_ID}`)).data;
  if (app.attributes.bundleId !== BUNDLE_ID) throw new Error(`app ${APP_ID} có bundleId ${app.attributes.bundleId}, không phải ${BUNDLE_ID}`);
  return app;
}
const listVersions = async C => (await C.all(`/v1/apps/${APP_ID}/appStoreVersions?filter[platform]=IOS&limit=200`)).data;

async function plan(C, a) {
  const app = await loadApp(C);
  const versions = await listVersions(C);
  const builds = (await C.get(`/v1/builds?filter[app]=${APP_ID}&sort=-uploadedDate&limit=200&fields[builds]=version,uploadedDate,processingState`)).data;
  const tags = (arg(a, '--tags', '') || '').split(/[\s,]+/).filter(Boolean);
  const p = planFrom({ versions, builds, tags, app: arg(a, '--app', 'capacitor'), bump: arg(a, '--bump', 'patch') });
  // Quyền của khoá: đọc thử vài endpoint chỉ vai trò cao mới đọc được (chỉ GET, không ghi gì) – báo trong tóm tắt
  const probe = {};
  for (const [k, path] of [['users', '/v1/users?limit=1'], ['reviewSubmissions', `/v1/reviewSubmissions?filter[app]=${APP_ID}&limit=1`], ['phased', versions[0] ? `/v1/appStoreVersions/${versions[0].id}/appStoreVersionPhasedRelease` : null]]) {
    if (!path) continue;
    try { await C.get(path); probe[k] = 200; } catch (e) { probe[k] = e.status || 'err'; }
  }
  p.role = probe.users === 200 ? 'Admin (đọc được /v1/users)' : `chưa xác định Admin (/v1/users → ${probe.users}); nộp duyệt cần App Manager hoặc Admin`;
  p.probe = probe;
  p.app = app.attributes.name;
  p.versions = versions.slice(0, 6).map(v => `${v.attributes.versionString}:${stateOf(v)}`);
  p.lastBuilds = builds.slice(0, 3).map(b => `${b.attributes.version}:${b.attributes.processingState}`);
  console.log(JSON.stringify(p, null, 1));
  const f = arg(a, '--out'); if (f) fs.writeFileSync(f, JSON.stringify(p, null, 1));
  out('version', p.version); out('build', p.build); out('blocked', p.blocked ? 'yes' : 'no');
  if (p.blocked) console.log(`::notice title=store-submit iOS::${p.blocked}`);
}

async function submit(C, a) {
  const DRY = a.includes('--dry-run');
  const version = arg(a, '--version'), build = String(arg(a, '--build', ''));
  const notes = JSON.parse(fs.readFileSync(arg(a, '--notes', 'notes-ios.json'), 'utf8'));
  if (!version || !build) throw new Error('cần --version và --build');
  const log = s => console.log(`  ${DRY ? '[dry-run] ' : ''}${s}`);
  const write = async (desc, method, path, body) => { log(desc); return DRY ? null : C.api(method, path, body); };
  await loadApp(C);
  // 1) appStoreVersion: dùng bản đang sửa được (nâng versionString nếu cần) hoặc tạo mới
  let versions = await listVersions(C);
  const flying = versions.find(v => IN_FLIGHT.includes(stateOf(v)));
  if (flying) throw new Error(`bản ${flying.attributes.versionString} đang ${stateOf(flying)} – không nộp chồng`);
  if (versions.some(v => v.attributes.versionString === version && !EDITABLE.includes(stateOf(v)))) throw new Error(`version ${version} đã dùng – không dùng lại`);
  let ver = versions.find(v => EDITABLE.includes(stateOf(v)));
  if (ver && ver.attributes.versionString !== version) {
    const r = await write(`version ${ver.attributes.versionString} (${stateOf(ver)}) → ${version}`, 'PATCH', `/v1/appStoreVersions/${ver.id}`, P.patchVersion(ver.id, { versionString: version }));
    if (r) ver = r.data;
  } else if (!ver) {
    const r = await write(`tạo appStoreVersion ${version}`, 'POST', '/v1/appStoreVersions', P.createVersion(APP_ID, version));
    ver = r ? r.data : { id: 'DRY', attributes: { versionString: version } };
  } else log(`= dùng bản ${version} (${stateOf(ver)})`);
  // 2) chờ build xử lý xong (VALID)
  const waitMin = +arg(a, '--wait-min', '75');
  let b = null;
  for (const t0 = Date.now(); ;) {
    const bs = (await C.get(`/v1/builds?filter[app]=${APP_ID}&filter[version]=${encodeURIComponent(build)}&filter[preReleaseVersion.version]=${encodeURIComponent(version)}&limit=5`)).data;
    b = bs[0];
    const st = b?.attributes.processingState;
    if (st === 'VALID') break;
    if (st === 'FAILED' || st === 'INVALID') throw new Error(`build ${build} ${st} – xem email Apple`);
    if (DRY) { log(`build ${build}: ${st || 'chưa có'} (dry-run không chờ)`); b = null; break; }
    if (Date.now() - t0 > waitMin * 60000) throw new Error(`build ${build} chưa VALID sau ${waitMin} phút (đang ${st || 'chưa thấy'})`);
    console.log(`  … build ${build}: ${st || 'chưa thấy'} – chờ 30 s`); await sleep(30000);
  }
  if (b) {
    if (b.attributes.usesNonExemptEncryption == null) await write('build: khai mã hoá usesNonExemptEncryption=false', 'PATCH', `/v1/builds/${b.id}`, P.encryption(b.id));
    else log(`= mã hoá đã khai (${b.attributes.usesNonExemptEncryption})`);
    let cur = null; if (ver.id !== 'DRY') try { cur = (await C.get(`/v1/appStoreVersions/${ver.id}/build`)).data; } catch (e) { if (e.status !== 404) throw e; }
    if (cur?.id === b.id) log(`= build ${build} đã gắn`); else await write(`gắn build ${build}`, 'PATCH', `/v1/appStoreVersions/${ver.id}/relationships/build`, P.attachBuild(b.id));
  }
  // 3) What's New cho MỌI ngôn ngữ app đang có
  if (ver.id !== 'DRY') {
    const locs = (await C.get(`/v1/appStoreVersions/${ver.id}/appStoreVersionLocalizations?limit=200`)).data;
    for (const l of locs) {
      const t = whatsNewFor(l.attributes.locale, notes);
      if (l.attributes.whatsNew === t) log(`= ${l.attributes.locale} What's New`);
      else await write(`${l.attributes.locale} What's New (${noteLang(l.attributes.locale)}, ${[...t].length} ký tự)`, 'PATCH', `/v1/appStoreVersionLocalizations/${l.id}`, P.whatsNew(l.id, t));
    }
    // 4) phát hành tự động sau khi duyệt + phased release (Apple tự tăng 1→2→5→10→20→50→100 % trong 7 ngày)
    if (ver.attributes.releaseType !== 'AFTER_APPROVAL') await write('releaseType → AFTER_APPROVAL', 'PATCH', `/v1/appStoreVersions/${ver.id}`, P.patchVersion(ver.id, { releaseType: 'AFTER_APPROVAL' }));
    let ph = null; try { ph = (await C.get(`/v1/appStoreVersions/${ver.id}/appStoreVersionPhasedRelease`)).data; } catch (e) { if (e.status !== 404) throw e; }
    if (ph) log(`= phased release ${ph.attributes.phasedReleaseState}`); else await write('phased release: BẬT (7 ngày)', 'POST', '/v1/appStoreVersionPhasedReleases', P.phased(ver.id));
  } else log('What\'s New + phased release: sau khi tạo version');
  // 5) nộp duyệt
  const subs = (await C.get(`/v1/reviewSubmissions?filter[app]=${APP_ID}&filter[platform]=IOS&limit=20`)).data;
  if (subs.some(x => ['WAITING_FOR_REVIEW', 'IN_REVIEW', 'UNRESOLVED_ISSUES'].includes(x.attributes.state))) throw new Error('đã có lượt duyệt đang chạy – không nộp chồng');
  let sub = subs.find(x => x.attributes.state === 'READY_FOR_REVIEW');
  if (!sub) { const r = await write('reviewSubmission: tạo', 'POST', '/v1/reviewSubmissions', P.submission(APP_ID)); sub = r ? r.data : { id: 'DRY' }; }
  if (sub.id !== 'DRY' && ver.id !== 'DRY') {
    const items = (await C.get(`/v1/reviewSubmissions/${sub.id}/items?include=appStoreVersion&limit=50`)).data;
    if (!items.some(i => i.relationships?.appStoreVersion?.data?.id === ver.id)) await write(`reviewSubmissionItem: bản ${version}`, 'POST', '/v1/reviewSubmissionItems', P.submissionItem(sub.id, ver.id));
  }
  await write(`SUBMIT ${version} (${build}) for Review`, 'PATCH', `/v1/reviewSubmissions/${sub.id}`, P.submit(sub.id));
  console.log(DRY ? '✓ dry-run xong – không ghi gì' : `✓ ĐÃ NỘP DUYỆT iOS ${version} (${build}) – phased release BẬT, tự phát hành sau khi Apple duyệt`);
}

async function main() {
  const a = process.argv.slice(2), cmd = a[0];
  const key = ascKeyFromEnv();
  if (!key) { console.log('::error::thiếu ASC_KEY_ID / ASC_ISSUER_ID / ASC_KEY_P8'); process.exit(1); }
  const C = createAsc(key);
  if (cmd === 'plan') return plan(C, a);
  if (cmd === 'submit') return submit(C, a);
  console.error('Dùng: asc-submit.mjs plan|submit …'); process.exit(2);
}
if (import.meta.url === pathToFileURL(process.argv[1] || '').href) main().catch(e => { console.log(`::error title=store-submit iOS::${e.message}`); process.exit(1); });
