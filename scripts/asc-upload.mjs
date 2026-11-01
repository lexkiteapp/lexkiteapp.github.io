// Đẩy chữ niêm yết + ảnh App Store lên App Store Connect bằng API chính thức (JWT ES256), chạy lại bao nhiêu lần cũng được (idempotent).
// Nguồn chữ: store/metadata/<locale>.json (khối "apple", qua scripts/store-metadata.mjs) + store/apple/listing.json (phần chung) · ảnh: <shots>/<device>/<lang>/<n>.png (scripts/ios-shots.mjs, nhánh ios-shots).
// CHỈ ghi: tên/phụ đề/URL chính sách (appInfoLocalizations), mô tả/từ khóa/quảng bá/URL (appStoreVersionLocalizations), danh mục,
// bản quyền, ghi chú cho người duyệt, ảnh chụp – của bản 1.0 đang "Prepare for Submission".
// KHÔNG nộp duyệt, KHÔNG đổi giá/phân phối/độ tuổi/quyền riêng tư (anh chủ tự làm – docs/STORE-READINESS.md § B).
//
//   node scripts/asc-upload.mjs --check [--write-md]       kiểm giới hạn ký tự + luật Apple (offline); --write-md sinh lại phần ngôn ngữ trong LISTING.md
//   node scripts/asc-upload.mjs --dry-run [--shots dir]    đọc App Store Connect, in những gì SẼ đổi (không ghi)
//   node scripts/asc-upload.mjs [--shots dir] [--only text|shots]
//   node scripts/asc-upload.mjs --only settings [--dry-run]   quyền nội dung, độ tuổi, giá Free, quốc gia (trừ EU-27), liên hệ duyệt, phát hành thủ công
//   node scripts/asc-upload.mjs --only review [--dry-run]   gắn build VALID mới nhất (ASC_BUILD = số build, tuỳ chọn) vào bản 1.0, tạo/thử
//     reviewSubmission + item (Apple kiểm hồ sơ, in lỗi thiếu). CHỈ bấm Submit khi env ASC_SUBMIT=yes (anh chủ đồng ý + App Privacy đã Publish).
//     (listing.json → settings; số điện thoại liên hệ CHỈ lấy từ env ASC_REVIEW_PHONE lúc chạy – không lưu trong repo công khai)
// Khóa: ASC_KEY_ID, ASC_ISSUER_ID + ASC_KEY_P8 (nội dung .p8) hoặc ASC_KEY_PATH (đường dẫn .p8). Khóa/JWT không bao giờ được in ra.
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { load as loadMetadata } from './store-metadata.mjs';

const args = process.argv.slice(2);
const flag = f => args.includes(f);
const opt = (f, d) => { const i = args.indexOf(f); return i >= 0 && args[i + 1] ? args[i + 1] : d; };
const DRY = flag('--dry-run');
const ONLY = opt('--only', 'all');
const SHOTS = opt('--shots', 'store/apple/screenshots');
const L = JSON.parse(fs.readFileSync('store/apple/listing.json', 'utf8'));
// Chữ từng ngôn ngữ: một file một ngôn ngữ trong store/metadata/ (nguồn duy nhất, chung với Google Play)
L.locales = Object.fromEntries(Object.entries(loadMetadata()).map(([loc, d]) => [loc, d.apple]));
const MD = 'store/apple/LISTING.md';

// ---------- Kiểm tra offline ----------
const LIMITS = { name: 30, subtitle: 30, promotionalText: 170, description: 4000, keywords: 100 };
// Apple 2.3.7 / 2.3.10: không giá, không xếp hạng, không tên nền tảng/app khác, không thương hiệu người khác trong từ khóa
const BANNED_SHORT = /\b(best|#1|number one|top|free|cheap|sale|android|google play|anki|duolingo|quizlet|memrise|ielts|toeic|toefl)\b/i;
const BANNED_ALL = /(\bandroid\b|google play|\banki\b|duolingo|quizlet|memrise|#1|\bbest\b|\bnumber one\b)/i;
const chars = s => [...s].length;

function check() {
  const errs = [], warns = [];
  const locs = Object.entries(L.locales);
  for (const [loc, v] of locs) {
    for (const [k, max] of Object.entries(LIMITS)) {
      if (!v[k]) { errs.push(`${loc}.${k}: thiếu`); continue; }
      if (chars(v[k]) > max) errs.push(`${loc}.${k}: ${chars(v[k])} > ${max} ký tự`);
    }
    for (const k of ['name', 'subtitle', 'keywords', 'promotionalText']) {
      const m = (k === 'promotionalText' ? BANNED_ALL : BANNED_SHORT).exec(v[k] || '');
      if (m) errs.push(`${loc}.${k}: chứa "${m[0]}" (Apple 2.3.7 – không giá/xếp hạng/nền tảng/thương hiệu khác)`);
    }
    const m = BANNED_ALL.exec(v.description || ''); if (m) errs.push(`${loc}.description: chứa "${m[0]}"`);
    if (!/^Lexkite/.test(v.name)) errs.push(`${loc}.name: phải bắt đầu bằng "Lexkite"`);
    const kw = (v.keywords || '').split(',');
    if (kw.some(k => k !== k.trim() || !k)) errs.push(`${loc}.keywords: không để khoảng trắng quanh dấu phẩy / mục rỗng (phí ký tự)`);
    if (new Set(kw.map(k => k.toLowerCase())).size !== kw.length) errs.push(`${loc}.keywords: trùng từ`);
    if (kw.some(k => /lexkite/i.test(k))) warns.push(`${loc}.keywords: không cần lặp tên app`);
    for (const u of ['privacyPolicyUrl', 'supportUrl', 'marketingUrl']) if (!/^https:\/\/lexkite\.com\//.test(v[u] || '')) errs.push(`${loc}.${u}: phải là https://lexkite.com/…`);
    if (!v.description.includes('not affiliated') && !/IELTS/.test(v.description.split('\n').pop())) errs.push(`${loc}.description: thiếu dòng không liên kết IELTS/TOEIC/TOEFL ở cuối`);
  }
  if (!L.locales['en-US']) errs.push('thiếu en-US (ngôn ngữ chính)');
  for (const [a, src] of Object.entries(L.aliases || {})) if (!L.locales[src]) errs.push(`alias ${a} → ${src} không tồn tại`);
  if (chars(L.reviewNotes) > 4000) errs.push('reviewNotes > 4000');
  if (!/^\d{4} \S/.test(L.copyright)) errs.push('copyright phải dạng "2026 Tên chủ sở hữu"');
  return { errs, warns };
}

// ---------- LISTING.md: phần ngôn ngữ sinh từ listing.json ----------
const BEGIN = '<!-- BEGIN GENERATED: node scripts/asc-upload.mjs --write-md -->', END = '<!-- END GENERATED -->';
function genLocales() {
  const out = [];
  for (const [loc, v] of Object.entries(L.locales)) {
    const al = Object.entries(L.aliases || {}).filter(([, s]) => s === loc).map(([a]) => a);
    out.push(`### ${loc}${al.length ? ' (also used for ' + al.join(', ') + ')' : ''}`, '',
      '| Field | Value | Chars |', '|---|---|---|',
      `| Name | \`${v.name}\` | ${chars(v.name)}/30 |`,
      `| Subtitle | \`${v.subtitle}\` | ${chars(v.subtitle)}/30 |`,
      `| Keywords | \`${v.keywords}\` | ${chars(v.keywords)}/100 |`,
      `| Privacy policy URL | ${v.privacyPolicyUrl} | |`,
      `| Support URL | ${v.supportUrl} | |`,
      `| Marketing URL | ${v.marketingUrl} | |`, '',
      `**Promotional text (${chars(v.promotionalText)}/170):**`, '```', v.promotionalText, '```', '',
      `**Description (${chars(v.description)}/4000):**`, '```', v.description, '```', '');
  }
  return out.join('\n');
}
function mdBlock() { return `${BEGIN}\n\n### App Review notes (all locales)\n\n\`\`\`\n${L.reviewNotes}\n\`\`\`\n\n${genLocales()}\n${END}`; }
function mdCheck(write) {
  const s = fs.readFileSync(MD, 'utf8');
  const i = s.indexOf(BEGIN), j = s.indexOf(END);
  if (i < 0 || j < 0) throw new Error(`${MD}: thiếu khối ${BEGIN} … ${END}`);
  const next = s.slice(0, i) + mdBlock() + s.slice(j + END.length);
  if (next === s) return true;
  if (write) { fs.writeFileSync(MD, next); console.log(`✎ đã sinh lại phần ngôn ngữ trong ${MD}`); return true; }
  return false;
}

// ---------- App Store Connect API ----------
const API = 'https://api.appstoreconnect.apple.com';
function key() {
  const kid = process.env.ASC_KEY_ID, iss = process.env.ASC_ISSUER_ID;
  let pem = process.env.ASC_KEY_P8 || (process.env.ASC_KEY_PATH && fs.readFileSync(process.env.ASC_KEY_PATH, 'utf8'));
  if (!kid || !iss || !pem) return null;
  return { kid, iss, pem };
}
let K = null, tok = null, tokExp = 0;
function jwt() {
  const now = Math.floor(Date.now() / 1000);
  if (tok && now < tokExp - 60) return tok;
  const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
  const head = b64({ alg: 'ES256', kid: K.kid, typ: 'JWT' }), body = b64({ iss: K.iss, iat: now, exp: now + 1100, aud: 'appstoreconnect-v1' });
  const sig = crypto.sign('sha256', Buffer.from(`${head}.${body}`), { key: K.pem, dsaEncoding: 'ieee-p1363' }).toString('base64url');
  tokExp = now + 1100; tok = `${head}.${body}.${sig}`; return tok;
}
async function api(method, p, body) {
  for (let attempt = 0; ; attempt++) {
    const r = await fetch(API + p, { method, headers: { Authorization: `Bearer ${jwt()}`, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    if (r.status === 429 && attempt < 4) { await new Promise(s => setTimeout(s, 3000 * (attempt + 1))); continue; }
    const txt = await r.text();
    if (!r.ok) {
      let detail = txt.slice(0, 600); try { detail = JSON.parse(txt).errors.map(e => `${e.code}: ${e.detail || e.title}` + (e.meta?.associatedErrors ? ' ' + JSON.stringify(e.meta.associatedErrors).slice(0, 2500) : '')).join(' | '); } catch { /* giữ nguyên */ }
      throw new Error(`${method} ${p.split('?')[0]} → ${r.status} ${detail}`);
    }
    return txt ? JSON.parse(txt) : {};
  }
}
const get = p => api('GET', p);
const changes = [], errors = [];
// Ghi nhận 1 thay đổi; trả về true nếu được phép ghi thật (không phải dry-run)
function plan(desc) { changes.push(desc); console.log(`  ${DRY ? '[dry-run]' : '✎'} ${desc}`); return !DRY; }
async function write(desc, method, p, body) { return plan(desc) ? api(method, p, body) : null; }
const diff = (cur, want) => Object.fromEntries(Object.entries(want).filter(([k, v]) => (cur?.[k] ?? '') !== v));
const EDITABLE = ['PREPARE_FOR_SUBMISSION'];

async function syncText(app, ver) {
  // Danh mục + tên/phụ đề/URL chính sách (appInfo đang sửa được)
  const infos = (await get(`/v1/apps/${app.id}/appInfos?include=primaryCategory,secondaryCategory`)).data;
  const info = infos.find(i => !['READY_FOR_DISTRIBUTION', 'READY_FOR_SALE', 'REPLACED_WITH_NEW_INFO'].includes(i.attributes.state || i.attributes.appStoreState));
  if (!info) throw new Error('Không có appInfo nào đang sửa được');
  const pc = info.relationships?.primaryCategory?.data?.id, sc = info.relationships?.secondaryCategory?.data?.id;
  if (pc !== L.primaryCategory || sc !== L.secondaryCategory) {
    await write(`appInfo: danh mục ${pc || '–'}/${sc || '–'} → ${L.primaryCategory}/${L.secondaryCategory}`, 'PATCH', `/v1/appInfos/${info.id}`, {
      data: { type: 'appInfos', id: info.id, relationships: {
        primaryCategory: { data: { type: 'appCategories', id: L.primaryCategory } },
        secondaryCategory: { data: { type: 'appCategories', id: L.secondaryCategory } } } } });
  } else console.log(`  = danh mục ${pc}/${sc}`);
  const ail = (await get(`/v1/appInfos/${info.id}/appInfoLocalizations?limit=200`)).data;
  const vl = (await get(`/v1/appStoreVersions/${ver.id}/appStoreVersionLocalizations?limit=200`)).data;
  const all = { ...L.locales, ...Object.fromEntries(Object.entries(L.aliases || {}).map(([a, s]) => [a, L.locales[s]])) };
  for (const [loc, v] of Object.entries(all)) {
    try {
      const a = ail.find(x => x.attributes.locale === loc);
      const wantA = { name: v.name, subtitle: v.subtitle, privacyPolicyUrl: v.privacyPolicyUrl };
      if (!a) await write(`${loc}: tạo appInfoLocalization`, 'POST', '/v1/appInfoLocalizations', { data: { type: 'appInfoLocalizations', attributes: { locale: loc, ...wantA }, relationships: { appInfo: { data: { type: 'appInfos', id: info.id } } } } });
      else { const d = diff(a.attributes, wantA); if (Object.keys(d).length) await write(`${loc}: appInfo ${Object.keys(d).join(', ')}`, 'PATCH', `/v1/appInfoLocalizations/${a.id}`, { data: { type: 'appInfoLocalizations', id: a.id, attributes: d } }); }
      let b = vl.find(x => x.attributes.locale === loc);
      // Tạo appInfoLocalization xong, Apple tự tạo appStoreVersionLocalization rỗng cùng ngôn ngữ → đọc lại rồi PATCH (tránh 409)
      if (!b && !a && !DRY) { vl.splice(0, vl.length, ...(await get(`/v1/appStoreVersions/${ver.id}/appStoreVersionLocalizations?limit=200`)).data); b = vl.find(x => x.attributes.locale === loc); }
      const wantB = { description: v.description, keywords: v.keywords, promotionalText: v.promotionalText, supportUrl: v.supportUrl, marketingUrl: v.marketingUrl };
      if (!b) {
        const r = await write(`${loc}: tạo appStoreVersionLocalization`, 'POST', '/v1/appStoreVersionLocalizations', { data: { type: 'appStoreVersionLocalizations', attributes: { locale: loc, ...wantB }, relationships: { appStoreVersion: { data: { type: 'appStoreVersions', id: ver.id } } } } });
        if (r) vl.push(r.data);
      } else { const d = diff(b.attributes, wantB); if (Object.keys(d).length) await write(`${loc}: version ${Object.keys(d).join(', ')}`, 'PATCH', `/v1/appStoreVersionLocalizations/${b.id}`, { data: { type: 'appStoreVersionLocalizations', id: b.id, attributes: d } }); }
      if (a && b && !Object.keys(diff(a.attributes, wantA)).length && !Object.keys(diff(b.attributes, wantB)).length) console.log(`  = ${loc}`);
    } catch (e) { errors.push(`${loc}: ${e.message}`); console.error(`  ✗ ${loc}: ${e.message}`); }
  }
  // Bản quyền + ghi chú cho người duyệt (không đụng thông tin liên hệ – anh chủ tự điền)
  if (ver.attributes.copyright !== L.copyright) await write(`version: copyright → "${L.copyright}"`, 'PATCH', `/v1/appStoreVersions/${ver.id}`, { data: { type: 'appStoreVersions', id: ver.id, attributes: { copyright: L.copyright } } });
  let rd = null; try { rd = (await get(`/v1/appStoreVersions/${ver.id}/appStoreReviewDetail`)).data; } catch (e) { if (!/404/.test(e.message)) throw e; }
  const wantR = { notes: L.reviewNotes, demoAccountRequired: false };
  if (!rd) await write('review detail: tạo (notes, demoAccountRequired=false)', 'POST', '/v1/appStoreReviewDetails', { data: { type: 'appStoreReviewDetails', attributes: wantR, relationships: { appStoreVersion: { data: { type: 'appStoreVersions', id: ver.id } } } } });
  else { const d = diff(rd.attributes, wantR); if (Object.keys(d).length) await write(`review detail: ${Object.keys(d).join(', ')}`, 'PATCH', `/v1/appStoreReviewDetails/${rd.id}`, { data: { type: 'appStoreReviewDetails', id: rd.id, attributes: d } }); }
  return vl;
}

async function uploadShot(setId, file, name) {
  const buf = fs.readFileSync(file);
  const r = await api('POST', '/v1/appScreenshots', { data: { type: 'appScreenshots', attributes: { fileName: name, fileSize: buf.length }, relationships: { appScreenshotSet: { data: { type: 'appScreenshotSets', id: setId } } } } });
  for (const op of r.data.attributes.uploadOperations) {
    const h = Object.fromEntries((op.requestHeaders || []).map(x => [x.name, x.value]));
    const u = await fetch(op.url, { method: op.method, headers: h, body: buf.subarray(op.offset, op.offset + op.length) });
    if (!u.ok) throw new Error(`tải phần ảnh ${name} → ${u.status}`);
  }
  await api('PATCH', `/v1/appScreenshots/${r.data.id}`, { data: { type: 'appScreenshots', id: r.data.id, attributes: { uploaded: true, sourceFileChecksum: crypto.createHash('md5').update(buf).digest('hex') } } });
  return r.data.id;
}

async function syncShots(vl) {
  if (!fs.existsSync(SHOTS)) { errors.push(`không thấy thư mục ảnh ${SHOTS}`); return; }
  const pending = [];
  for (const [dev, type] of Object.entries(L.screenshots)) {
    for (const [lang, locs] of Object.entries(L.screenshotLangs)) {
      const dir = path.join(SHOTS, dev, lang);
      if (!fs.existsSync(dir)) { console.log(`  · bỏ qua ${dev}/${lang} (không có ảnh)`); continue; }
      const files = fs.readdirSync(dir).filter(f => /^\d+\.png$/.test(f)).sort((a, b) => parseInt(a) - parseInt(b)).slice(0, 10);
      const want = files.map(f => { const b = fs.readFileSync(path.join(dir, f)); return { file: path.join(dir, f), name: `${dev}-${lang}-${f}`, md5: crypto.createHash('md5').update(b).digest('hex') }; });
      for (const loc of locs) {
        try {
          const l = vl.find(x => x.attributes.locale === loc);
          if (!l) { if (DRY) { plan(`${loc} ${type}: tải ${want.length} ảnh (sau khi tạo localization)`); continue; } throw new Error('chưa có appStoreVersionLocalization'); }
          const sets = (await get(`/v1/appStoreVersionLocalizations/${l.id}/appScreenshotSets?filter[screenshotDisplayType]=${type}`)).data;
          let set = sets[0];
          const cur = set ? (await get(`/v1/appScreenshotSets/${set.id}/appScreenshots?limit=50`)).data : [];
          const same = cur.length === want.length && cur.every((c, i) => c.attributes.fileName === want[i].name && c.attributes.sourceFileChecksum === want[i].md5 && c.attributes.assetDeliveryState?.state !== 'FAILED');
          if (same) { console.log(`  = ${loc} ${type}: ${cur.length} ảnh khớp`); continue; }
          if (!plan(`${loc} ${type}: thay ${cur.length} → ${want.length} ảnh`)) continue;
          if (!set) set = (await api('POST', '/v1/appScreenshotSets', { data: { type: 'appScreenshotSets', attributes: { screenshotDisplayType: type }, relationships: { appStoreVersionLocalization: { data: { type: 'appStoreVersionLocalizations', id: l.id } } } } })).data;
          for (const c of cur) await api('DELETE', `/v1/appScreenshots/${c.id}`); // chỉ ảnh do chính script này quản lý (bản 1.0)
          for (const w of want) pending.push({ id: await uploadShot(set.id, w.file, w.name), name: `${loc}/${w.name}` });
        } catch (e) { errors.push(`${loc} ${type}: ${e.message}`); console.error(`  ✗ ${loc} ${type}: ${e.message}`); }
      }
    }
  }
  // Chờ Apple xử lý ảnh (COMPLETE / FAILED)
  const t0 = Date.now();
  while (pending.length && Date.now() - t0 < 300000) {
    await new Promise(s => setTimeout(s, 5000));
    for (const p of [...pending]) {
      const st = (await get(`/v1/appScreenshots/${p.id}`)).data.attributes.assetDeliveryState?.state;
      if (st === 'COMPLETE') pending.splice(pending.indexOf(p), 1);
      else if (st === 'FAILED') { pending.splice(pending.indexOf(p), 1); errors.push(`ảnh ${p.name}: Apple xử lý FAILED`); }
    }
  }
  if (pending.length) console.log(`  ⚠ ${pending.length} ảnh vẫn đang xử lý – xem lại trên App Store Connect sau vài phút`);
}

// ---------- Cài đặt nộp duyệt (CHỈ khi --only settings) ----------
// Không chọn build, không nộp. Mỗi bước độc lập: lỗi 1 bước không chặn bước khác.
const EU27 = ['AUT', 'BEL', 'BGR', 'HRV', 'CYP', 'CZE', 'DNK', 'EST', 'FIN', 'FRA', 'DEU', 'GRC', 'HUN', 'IRL', 'ITA', 'LVA', 'LTU', 'LUX', 'MLT', 'NLD', 'POL', 'PRT', 'ROU', 'SVK', 'SVN', 'ESP', 'SWE'];
const manual = [];
async function step(name, fn) { try { await fn(); } catch (e) { errors.push(`${name}: ${e.message}`); console.error(`  ✗ ${name}: ${e.message}`); } }
async function all(p) { const out = [], inc = []; for (let next = p; next;) { const r = await get(next); out.push(...r.data); inc.push(...(r.included || [])); next = r.links?.next ? r.links.next.replace(API, '') : null; } return { data: out, included: inc }; }
async function syncReview(app, ver) {
  // 1) build: VALID mới nhất (hoặc ASC_BUILD) của đúng phiên bản → gắn vào appStoreVersion
  const want = (process.env.ASC_BUILD || '').trim();
  const builds = (await get(`/v1/builds?filter[app]=${app.id}&filter[preReleaseVersion.version]=${L.version}&sort=-uploadedDate&limit=10`)).data;
  builds.forEach(b => console.log(`  · build ${b.attributes.version} ${b.attributes.processingState}${b.attributes.expired ? ' (expired)' : ''} ${b.attributes.uploadedDate}`));
  const pick = builds.find(b => b.attributes.processingState === 'VALID' && !b.attributes.expired && (!want || b.attributes.version === want));
  if (!pick) { errors.push(`không có build VALID${want ? ' số ' + want : ''}`); return; }
  let cur = null; try { cur = (await get(`/v1/appStoreVersions/${ver.id}/build`)).data; } catch (e) { if (!/404/.test(e.message)) throw e; }
  if (cur?.id === pick.id) console.log(`  = build ${pick.attributes.version} đã gắn`);
  else await write(`version: build ${cur?.attributes?.version || '–'} → ${pick.attributes.version}`, 'PATCH', `/v1/appStoreVersions/${ver.id}/relationships/build`, { data: { type: 'builds', id: pick.id } });
  if (DRY) return;
  // 2) reviewSubmission đang mở (READY_FOR_REVIEW) hoặc tạo mới; thêm item = Apple kiểm hồ sơ (thiếu gì → lỗi 409 kèm danh sách)
  const subs = (await get(`/v1/reviewSubmissions?filter[app]=${app.id}&filter[platform]=IOS&include=items&limit=20`)).data;
  subs.forEach(x => console.log(`  · reviewSubmission ${x.id.slice(0, 8)} ${x.attributes.state}`));
  if (subs.some(x => ['WAITING_FOR_REVIEW', 'IN_REVIEW', 'UNRESOLVED_ISSUES'].includes(x.attributes.state))) { console.log('  = đã có lượt duyệt đang chạy – không làm gì'); return; }
  let sub = subs.find(x => x.attributes.state === 'READY_FOR_REVIEW');
  if (!sub) sub = (await write('reviewSubmission: tạo (IOS)', 'POST', '/v1/reviewSubmissions', { data: { type: 'reviewSubmissions', attributes: { platform: 'IOS' }, relationships: { app: { data: { type: 'apps', id: app.id } } } } })).data;
  const items = (await get(`/v1/reviewSubmissions/${sub.id}/items?include=appStoreVersion`)).data;
  if (items.some(i => i.relationships?.appStoreVersion?.data?.id === ver.id)) console.log('  = item bản 1.0 đã có trong submission');
  else await write('reviewSubmissionItem: thêm bản ' + L.version + ' (Apple kiểm hồ sơ)', 'POST', '/v1/reviewSubmissionItems', { data: { type: 'reviewSubmissionItems', relationships: { reviewSubmission: { data: { type: 'reviewSubmissions', id: sub.id } }, appStoreVersion: { data: { type: 'appStoreVersions', id: ver.id } } } } });
  console.log('  ✓ hồ sơ hợp lệ theo Apple (item đã vào submission)');
  if (process.env.ASC_SUBMIT !== 'yes') { console.log('  ⏸ chưa Submit (ASC_SUBMIT != yes)'); return; }
  await write('reviewSubmission: SUBMIT for Review', 'PATCH', `/v1/reviewSubmissions/${sub.id}`, { data: { type: 'reviewSubmissions', id: sub.id, attributes: { submitted: true } } });
  console.log('  ✓ ĐÃ GỬI DUYỆT');
}
async function syncSettings(app, ver) {
  const S = L.settings;
  await step('content rights', async () => {
    if (app.attributes.contentRightsDeclaration === S.contentRightsDeclaration) return console.log(`  = content rights ${S.contentRightsDeclaration}`);
    await write(`content rights → ${S.contentRightsDeclaration}`, 'PATCH', `/v1/apps/${app.id}`, { data: { type: 'apps', id: app.id, attributes: { contentRightsDeclaration: S.contentRightsDeclaration } } });
  });
  await step('age rating', async () => {
    const info = (await get(`/v1/apps/${app.id}/appInfos`)).data.find(i => !['READY_FOR_DISTRIBUTION', 'READY_FOR_SALE', 'REPLACED_WITH_NEW_INFO'].includes(i.attributes.state || i.attributes.appStoreState));
    const d = (await get(`/v1/appInfos/${info.id}/ageRatingDeclaration`)).data, have = d.attributes || {};
    // Chỉ gửi khóa API hiện có (tên khóa đổi theo bảng hỏi của Apple); khóa không có → anh chủ bấm tay
    const missing = Object.keys(S.ageRating).filter(k => !(k in have));
    if (missing.length) { manual.push(`Age rating: ${missing.join(', ')}`); console.log(`  ⚠ age rating: API không có khóa ${missing.join(', ')} – bấm tay`); }
    const dd = Object.fromEntries(Object.entries(S.ageRating).filter(([k, v]) => k in have && have[k] !== v));
    if (!Object.keys(dd).length) return console.log('  = age rating');
    await write(`age rating: ${Object.entries(dd).map(([k, v]) => `${k}=${v}`).join(', ')}`, 'PATCH', `/v1/ageRatingDeclarations/${d.id}`, { data: { type: 'ageRatingDeclarations', id: d.id, attributes: dd } });
  });
  await step('price', async () => {
    let free = false;
    try {
      const mp = await get(`/v1/appPriceSchedules/${app.id}/manualPrices?include=appPricePoint&limit=50`);
      const pts = (mp.included || []).filter(x => x.type === 'appPricePoints');
      free = mp.data.length > 0 && pts.length > 0 && pts.every(p => Number(p.attributes.customerPrice) === 0);
    } catch (e) { if (!/404/.test(e.message)) throw e; }
    if (free) return console.log('  = giá Free');
    const pp = (await all(`/v1/apps/${app.id}/appPricePoints?filter[territory]=${S.baseTerritory}&limit=200`)).data.find(p => Number(p.attributes.customerPrice) === 0);
    if (!pp) throw new Error('không thấy mức giá 0 cho ' + S.baseTerritory);
    const tmp = '${p0}';
    await write(`giá → Free (lãnh thổ gốc ${S.baseTerritory})`, 'POST', '/v1/appPriceSchedules', {
      data: { type: 'appPriceSchedules', relationships: { app: { data: { type: 'apps', id: app.id } }, baseTerritory: { data: { type: 'territories', id: S.baseTerritory } }, manualPrices: { data: [{ type: 'appPrices', id: tmp }] } } },
      included: [{ type: 'appPrices', id: tmp, attributes: { startDate: null }, relationships: { appPricePoint: { data: { type: 'appPricePoints', id: pp.id } } } }] });
  });
  await step('availability', async () => {
    const terrs = (await all('/v1/territories?limit=200')).data.map(t => t.id);
    const want = Object.fromEntries(terrs.map(t => [t, !EU27.includes(t)]));
    let av = null; try { av = (await get(`/v1/apps/${app.id}/appAvailabilityV2`)).data; } catch (e) { if (!/404/.test(e.message)) throw e; }
    if (!av) {
      const inc = terrs.map(t => ({ type: 'territoryAvailabilities', id: '${' + t + '}', attributes: { available: want[t] }, relationships: { territory: { data: { type: 'territories', id: t } } } }));
      return write(`quốc gia: tạo – ${terrs.filter(t => want[t]).length}/${terrs.length} mở (trừ EU-27), availableInNewTerritories=${S.availableInNewTerritories}`, 'POST', '/v2/appAvailabilities', {
        data: { type: 'appAvailabilities', attributes: { availableInNewTerritories: S.availableInNewTerritories }, relationships: { app: { data: { type: 'apps', id: app.id } }, territoryAvailabilities: { data: inc.map(i => ({ type: i.type, id: i.id })) } } }, included: inc });
    }
    const ta = (await all(`/v2/appAvailabilities/${av.id}/territoryAvailabilities?include=territory&limit=200`)).data;
    let n = 0;
    for (const x of ta) {
      const t = x.relationships?.territory?.data?.id;
      if (!t || !(t in want) || x.attributes.available === want[t]) continue;
      n++; await write(`quốc gia ${t}: available → ${want[t]}`, 'PATCH', `/v1/territoryAvailabilities/${x.id}`, { data: { type: 'territoryAvailabilities', id: x.id, attributes: { available: want[t] } } });
    }
    if (av.attributes.availableInNewTerritories !== S.availableInNewTerritories) manual.push(`Availability: "available in new territories" đang ${av.attributes.availableInNewTerritories}, muốn ${S.availableInNewTerritories}`);
    if (!n) console.log(`  = quốc gia (${ta.filter(x => x.attributes.available).length} mở, EU-27 tắt)`);
  });
  await step('review contact', async () => {
    let rd = null; try { rd = (await get(`/v1/appStoreVersions/${ver.id}/appStoreReviewDetail`)).data; } catch (e) { if (!/404/.test(e.message)) throw e; }
    const phone = (process.env.ASC_REVIEW_PHONE || '').trim();
    if (!phone) manual.push('App Review: số điện thoại liên hệ (đặt ASC_REVIEW_PHONE)');
    const want = { ...S.reviewContact, demoAccountRequired: false, ...(phone ? { contactPhone: phone } : {}) };
    const label = k => (k === 'contactPhone' ? 'contactPhone (ẩn)' : k);
    if (!rd) return write(`review detail: tạo ${Object.keys(want).map(label).join(', ')}`, 'POST', '/v1/appStoreReviewDetails', { data: { type: 'appStoreReviewDetails', attributes: { ...want, notes: L.reviewNotes }, relationships: { appStoreVersion: { data: { type: 'appStoreVersions', id: ver.id } } } } });
    const d = diff(rd.attributes, want);
    if (!Object.keys(d).length) return console.log('  = liên hệ người duyệt');
    await write(`review detail: ${Object.keys(d).map(label).join(', ')}`, 'PATCH', `/v1/appStoreReviewDetails/${rd.id}`, { data: { type: 'appStoreReviewDetails', id: rd.id, attributes: d } });
  });
  await step('release type', async () => {
    if (ver.attributes.releaseType === S.releaseType) return console.log(`  = phát hành ${S.releaseType}`);
    await write(`phát hành → ${S.releaseType}`, 'PATCH', `/v1/appStoreVersions/${ver.id}`, { data: { type: 'appStoreVersions', id: ver.id, attributes: { releaseType: S.releaseType } } });
  });
  if (manual.length) console.log('ℹ Còn bấm tay:\n  - ' + manual.join('\n  - '));
}

async function main() {
  const { errs, warns } = check();
  warns.forEach(w => console.warn('⚠ ' + w));
  if (errs.length) { console.error('✗ listing.json:\n  ' + errs.join('\n  ')); process.exit(1); }
  if (flag('--check')) {
    if (!mdCheck(flag('--write-md'))) { console.error(`✗ ${MD} lệch với listing.json – chạy: node scripts/asc-upload.mjs --check --write-md`); process.exit(1); }
    console.log(`✓ asc-check: ${Object.keys(L.locales).length} ngôn ngữ đúng giới hạn Apple, ${MD} khớp listing.json`);
    return;
  }
  K = key();
  if (!K) {
    if (DRY) { console.log('ℹ dry-run offline (thiếu ASC_KEY_ID / ASC_ISSUER_ID / ASC_KEY_P8): listing hợp lệ; cần khóa để so với App Store Connect.'); return; }
    console.error('✗ thiếu ASC_KEY_ID / ASC_ISSUER_ID / ASC_KEY_P8 (hoặc ASC_KEY_PATH)'); process.exit(1);
  }
  const app = (await get(`/v1/apps/${L.appId}`)).data;
  if (app.attributes.bundleId !== L.bundleId) throw new Error(`app ${L.appId} có bundleId ${app.attributes.bundleId}, không phải ${L.bundleId}`);
  const vers = (await get(`/v1/apps/${app.id}/appStoreVersions?filter[platform]=IOS&filter[versionString]=${L.version}`)).data;
  const ver = vers[0];
  if (!ver) throw new Error(`chưa có bản iOS ${L.version} trên App Store Connect`);
  const state = ver.attributes.appVersionState || ver.attributes.appStoreState;
  console.log(`App ${app.attributes.name} (${app.attributes.bundleId}) · bản ${L.version}: ${state}${DRY ? ' · DRY-RUN' : ''}`);
  if (!EDITABLE.includes(state) && !(ver.attributes.appStoreState && EDITABLE.includes(ver.attributes.appStoreState))) throw new Error(`bản ${L.version} đang ${state} – script chỉ sửa khi PREPARE_FOR_SUBMISSION`);
  let vl = (await get(`/v1/appStoreVersions/${ver.id}/appStoreVersionLocalizations?limit=200`)).data;
  if (ONLY === 'review') { console.log('— Build + hồ sơ duyệt'); await step('review', () => syncReview(app, ver)); }
  else if (ONLY === 'settings') { console.log('— Cài đặt nộp duyệt (không chọn build, không nộp)'); await syncSettings(app, ver); }
  else {
    if (ONLY !== 'shots') { console.log('— Chữ niêm yết'); vl = await syncText(app, ver); }
    if (ONLY !== 'text') { console.log('— Ảnh chụp'); await syncShots(vl); }
  }
  console.log(`${errors.length ? '✗' : '✓'} ${DRY ? 'sẽ đổi' : 'đã đổi'} ${changes.length} mục${errors.length ? `, ${errors.length} lỗi:\n  ` + errors.join('\n  ') : ''}`);
  console.log('ℹ Không nộp duyệt. Anh chủ tự điền: App Privacy, Age Rating, Pricing/Availability, thông tin liên hệ người duyệt, chọn build → Submit for Review.');
  if (errors.length) process.exit(1);
}

main().catch(e => { console.error('✗ ' + e.message); process.exit(1); });
