// Đẩy chữ niêm yết + ảnh App Store lên App Store Connect bằng API chính thức (JWT ES256), chạy lại bao nhiêu lần cũng được (idempotent).
// Nguồn chữ: store/apple/listing.json · ảnh: <shots>/<device>/<lang>/<n>.png (scripts/ios-shots.mjs, nhánh ios-shots).
// CHỈ ghi: tên/phụ đề/URL chính sách (appInfoLocalizations), mô tả/từ khóa/quảng bá/URL (appStoreVersionLocalizations), danh mục,
// bản quyền, ghi chú cho người duyệt, ảnh chụp – của bản 1.0 đang "Prepare for Submission".
// KHÔNG nộp duyệt, KHÔNG đổi giá/phân phối/độ tuổi/quyền riêng tư (anh chủ tự làm – docs/STORE-READINESS.md § B).
//
//   node scripts/asc-upload.mjs --check [--write-md]       kiểm giới hạn ký tự + luật Apple (offline); --write-md sinh lại phần ngôn ngữ trong LISTING.md
//   node scripts/asc-upload.mjs --dry-run [--shots dir]    đọc App Store Connect, in những gì SẼ đổi (không ghi)
//   node scripts/asc-upload.mjs [--shots dir] [--only text|shots]
// Khóa: ASC_KEY_ID, ASC_ISSUER_ID + ASC_KEY_P8 (nội dung .p8) hoặc ASC_KEY_PATH (đường dẫn .p8). Khóa/JWT không bao giờ được in ra.
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const args = process.argv.slice(2);
const flag = f => args.includes(f);
const opt = (f, d) => { const i = args.indexOf(f); return i >= 0 && args[i + 1] ? args[i + 1] : d; };
const DRY = flag('--dry-run');
const ONLY = opt('--only', 'all');
const SHOTS = opt('--shots', 'store/apple/screenshots');
const L = JSON.parse(fs.readFileSync('store/apple/listing.json', 'utf8'));
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
      let detail = txt.slice(0, 600); try { detail = JSON.parse(txt).errors.map(e => `${e.code}: ${e.detail || e.title}`).join(' | '); } catch { /* giữ nguyên */ }
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
  if (ONLY !== 'shots') { console.log('— Chữ niêm yết'); vl = await syncText(app, ver); }
  if (ONLY !== 'text') { console.log('— Ảnh chụp'); await syncShots(vl); }
  console.log(`${errors.length ? '✗' : '✓'} ${DRY ? 'sẽ đổi' : 'đã đổi'} ${changes.length} mục${errors.length ? `, ${errors.length} lỗi:\n  ` + errors.join('\n  ') : ''}`);
  console.log('ℹ Không nộp duyệt. Anh chủ tự điền: App Privacy, Age Rating, Pricing/Availability, thông tin liên hệ người duyệt, chọn build → Submit for Review.');
  if (errors.length) process.exit(1);
}

main().catch(e => { console.error('✗ ' + e.message); process.exit(1); });
