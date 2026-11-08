#!/usr/bin/env node
// App Store Connect – chứng chỉ + hồ sơ ký CỐ ĐỊNH cho CI. Thay ký Automatic: mỗi máy CI mới tạo thêm 1 chứng chỉ Development
// → tài khoản đầy hạn mức, archive đỏ (native-m1, 08/11). Chạy trên CI qua .github/workflows/apple-signing.yml.
// Env: ASC_KEY_ID, ASC_ISSUER_ID, ASC_KEY_P8. Chỉ in tên/loại/serial/hạn (không bí mật).
//   list                          liệt kê chứng chỉ + hồ sơ, không đổi gì
//   revoke-ci-dev <id,id,…>       thu hồi đúng các id đã liệt kê; chỉ nhận chứng chỉ Development do API key tạo ("Created via API")
//   create-dist <csr.pem> <outDir> tạo 1 chứng chỉ Apple Distribution từ CSR (khoá riêng không bao giờ lên CI) + hồ sơ App Store
//                                 cho BUNDLES; ghi dist.cer + <bundle>.mobileprovision vào outDir (đều là dữ liệu công khai)
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { isMain } from '../lib/is-main.mjs';

export const BUNDLES = ['com.lexkite.app', 'com.lexkite.app.widget'];
export const PROFILE_PREFIX = 'LexKite CI AppStore ';
const DEV_TYPES = new Set(['DEVELOPMENT', 'IOS_DEVELOPMENT']);
/** Chứng chỉ được phép thu hồi: Development, tạo bởi API key (CI) – không bao giờ Distribution hay chứng chỉ tạo tay. */
export const revocable = c => DEV_TYPES.has(c.attributes.certificateType) && /Created via API/i.test(`${c.attributes.name} ${c.attributes.displayName}`);

const b64u = b => Buffer.from(b).toString('base64url');
function jwt() {
  const { ASC_KEY_ID: kid, ASC_ISSUER_ID: iss, ASC_KEY_P8: key } = process.env;
  if (!kid || !iss || !key) throw new Error('thiếu ASC_KEY_ID / ASC_ISSUER_ID / ASC_KEY_P8');
  const now = Math.floor(Date.now() / 1000), h = b64u(JSON.stringify({ alg: 'ES256', kid, typ: 'JWT' }));
  const p = b64u(JSON.stringify({ iss, iat: now, exp: now + 1100, aud: 'appstoreconnect-v1' }));
  return `${h}.${p}.${b64u(crypto.sign('sha256', Buffer.from(`${h}.${p}`), { key, dsaEncoding: 'ieee-p1363' }))}`;
}
async function api(method, url, body) {
  const r = await fetch(`https://api.appstoreconnect.apple.com${url}`, { method, headers: { Authorization: `Bearer ${jwt()}`, 'Content-Type': 'application/json' }, body: body && JSON.stringify(body) });
  const t = await r.text();
  if (!r.ok) throw new Error(`${method} ${url} → ${r.status} ${t.slice(0, 500)}`);
  return t ? JSON.parse(t) : {};
}
const certs = async () => (await api('GET', '/v1/certificates?limit=200')).data;
const row = c => [c.id, c.attributes.certificateType, c.attributes.displayName || c.attributes.name, c.attributes.serialNumber, (c.attributes.expirationDate || '').slice(0, 10), revocable(c) ? 'CI-dev' : 'giữ'].join(' | ');

async function list() {
  const cs = await certs();
  console.log(`Chứng chỉ (${cs.length}): id | loại | tên | serial | hết hạn | xử lý`);
  for (const c of cs) console.log(row(c));
  const ps = (await api('GET', '/v1/profiles?limit=200')).data;
  console.log(`Hồ sơ (${ps.length}): id | loại | tên | trạng thái | hết hạn`);
  for (const p of ps) console.log([p.id, p.attributes.profileType, p.attributes.name, p.attributes.profileState, (p.attributes.expirationDate || '').slice(0, 10)].join(' | '));
}

async function revoke(ids) {
  const cs = new Map((await certs()).map(c => [c.id, c]));
  const want = ids.split(/[\s,]+/).filter(Boolean);
  const bad = want.filter(id => !cs.has(id) || !revocable(cs.get(id)));
  if (bad.length) throw new Error(`từ chối – không phải chứng chỉ Development do CI tạo (hoặc không còn): ${bad.join(', ')}`);
  for (const id of want) { await api('DELETE', `/v1/certificates/${id}`); console.log(`đã thu hồi: ${row(cs.get(id))}`); }
}

async function createDist(csrFile, out) {
  const csrContent = fs.readFileSync(csrFile, 'utf8').replace(/-----[^-]+-----|\s/g, '');
  const cert = (await api('POST', '/v1/certificates', { data: { type: 'certificates', attributes: { certificateType: 'DISTRIBUTION', csrContent } } })).data;
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, 'dist.cer'), Buffer.from(cert.attributes.certificateContent, 'base64'));
  console.log(`đã tạo: ${row(cert)}`);
  const old = (await api('GET', '/v1/profiles?limit=200')).data.filter(p => p.attributes.name.startsWith(PROFILE_PREFIX));
  for (const p of old) { await api('DELETE', `/v1/profiles/${p.id}`); console.log(`xoá hồ sơ CI cũ: ${p.attributes.name}`); }
  for (const b of BUNDLES) {
    const bid = (await api('GET', `/v1/bundleIds?filter[identifier]=${encodeURIComponent(b)}&filter[platform]=IOS`)).data.find(x => x.attributes.identifier === b);
    if (!bid) throw new Error(`không có bundle id ${b} trên App Store Connect`);
    const prof = (await api('POST', '/v1/profiles', { data: { type: 'profiles', attributes: { name: PROFILE_PREFIX + b, profileType: 'IOS_APP_STORE' },
      relationships: { bundleId: { data: { type: 'bundleIds', id: bid.id } }, certificates: { data: [{ type: 'certificates', id: cert.id }] } } } })).data;
    fs.writeFileSync(path.join(out, `${b}.mobileprovision`), Buffer.from(prof.attributes.profileContent, 'base64'));
    console.log(`hồ sơ: ${prof.attributes.name} (${prof.attributes.uuid}, hết hạn ${(prof.attributes.expirationDate || '').slice(0, 10)})`);
  }
}

if (isMain(import.meta.url)) {
  const [cmd, a, b] = process.argv.slice(2);
  const run = { list, 'revoke-ci-dev': () => revoke(a || ''), 'create-dist': () => createDist(a, b || 'out/signing') }[cmd];
  if (!run) { console.error('dùng: list | revoke-ci-dev <ids> | create-dist <csr.pem> <outDir>'); process.exit(2); }
  run().catch(e => { console.error(`::error::${e.message}`); process.exit(1); });
}
