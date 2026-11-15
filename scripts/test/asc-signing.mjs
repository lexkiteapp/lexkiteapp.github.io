// Test scripts/native/asc-signing.mjs (không mạng, khoá ASC giả): đường dẫn API hợp lệ + ensureCaps chỉ bật capability còn thiếu.
// Gác lỗi 08/11: GET /v1/bundleIds/<id>/bundleIdCapabilities?limit=200 → 400 (relationship không nhận limit).
import crypto from 'node:crypto';
import { urls, ensureCaps, CAPS, BUNDLES } from '../native/asc-signing.mjs';
let fails = 0, n = 0; const ok = (c, m) => { n++; if (!c) { fails++; console.log('✗', m); } };

// 1. relationship (/v1/<loại>/<id>/<quan hệ>) không có limit; danh sách cấp cao nhất có limit; id được mã hoá
const rel = u => /^\/v1\/[A-Za-z]+\/[^/?]+\/[A-Za-z]+/.test(u);
const all = { certs: urls.certs(), cert: urls.cert('AB/C'), profiles: urls.profiles(), bundleId: urls.bundleId('com.lexkite.app'), caps: urls.caps('5XB356CS5C') };
for (const [k, u] of Object.entries(all)) {
  ok(u.startsWith('/v1/'), `${k}: bắt đầu /v1/ (${u})`);
  if (rel(u)) ok(!/[?&]limit=/.test(u), `${k}: relationship không được có limit (${u})`);
}
ok(rel(all.caps), 'caps là lời gọi relationship');
ok(/[?&]limit=200/.test(all.certs) && /[?&]limit=200/.test(all.profiles), 'danh sách cấp cao nhất có limit=200');
ok(all.cert === '/v1/certificates/AB%2FC', 'id chứng chỉ được mã hoá');
ok(all.bundleId.includes('filter[identifier]=com.lexkite.app') && all.bundleId.includes('filter[platform]=IOS'), 'bundleId lọc đúng');
for (const b of BUNDLES) ok(Array.isArray(CAPS[b]) && CAPS[b].includes('APP_GROUPS'), `CAPS có ${b}`);

// 2. ensureCaps với fetch giả: theo links.next, chỉ POST cái thiếu, không DELETE, không limit trên relationship
const { privateKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' });
Object.assign(process.env, { ASC_KEY_ID: 'K', ASC_ISSUER_ID: 'I', ASC_KEY_P8: privateKey.export({ type: 'pkcs8', format: 'pem' }) });
const calls = [];
globalThis.fetch = async (url, o) => {
  calls.push([o.method, url, o.body && JSON.parse(o.body)]);
  const cap = t => ({ attributes: { capabilityType: t } });
  if (/[?&]limit=/.test(url) && /bundleIdCapabilities/.test(url)) return new Response('{"errors":[{"code":"PARAMETER_ERROR.ILLEGAL"}]}', { status: 400 });
  if (url.endsWith('/bundleIds/X1/bundleIdCapabilities')) return Response.json({ data: [cap('APP_GROUPS')], links: { next: 'https://api.appstoreconnect.apple.com/v1/bundleIds/X1/bundleIdCapabilities?cursor=2' } });
  if (url.includes('cursor=2')) return Response.json({ data: [cap('PUSH_NOTIFICATIONS'), cap('APPLE_ID_AUTH')], links: {} });
  if (o.method === 'POST') return Response.json({ data: {} }, { status: 201 });
  return new Response('không mong đợi', { status: 500 });
};
const log = console.log; console.log = () => {};
try { await ensureCaps('com.lexkite.app', 'X1'); } catch (e) { ok(false, `ensureCaps lỗi: ${e.message}`); } finally { console.log = log; }
const posts = calls.filter(c => c[0] === 'POST');
ok(posts.length === 1 && posts[0][2].data.attributes.capabilityType === 'ASSOCIATED_DOMAINS', `chỉ bật ASSOCIATED_DOMAINS (đã bật: ${posts.map(p => p[2].data.attributes.capabilityType)})`);
ok(posts[0]?.[2].data.relationships.bundleId.data.id === 'X1', 'POST gắn đúng bundle id');
ok(!calls.some(c => c[0] === 'DELETE' || c[0] === 'PATCH'), 'không tắt/sửa capability nào');
ok(calls.filter(c => c[0] === 'GET').length === 2, 'theo links.next đủ 2 trang');

// 3. từ chối gửi khoá ASC tới máy khác qua links.next
globalThis.fetch = async (url) => Response.json({ data: [], links: { next: 'https://evil.example/x' } });
let refused = false; try { await ensureCaps('com.lexkite.app.widget', 'X2'); } catch (e) { refused = /từ chối/.test(e.message); }
ok(refused, 'links.next ngoài api.appstoreconnect.apple.com bị từ chối');

console.log(fails ? `✗ asc-signing: ${fails}/${n} lỗi` : `✓ asc-signing: ${n} kiểm tra đạt (relationship không limit, ensureCaps chỉ bật cái thiếu)`);
process.exit(fails ? 1 : 0);
