// Hồi quy: xác thực OIDC của /api/lexai ghim repository_id, nhánh, workflow, exp/nbf/iat (JWT giả ký bằng khóa test)
import assert from 'node:assert/strict';
import { verifyOidc, REPO_ID, WORKFLOWS } from '../../functions/api/lexai.js';

const { publicKey, privateKey } = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
const jwk = { ...(await crypto.subtle.exportKey('jwk', publicKey)), kid: 'k1' };
const getKeys = async () => [jwk];
const b64 = o => Buffer.from(typeof o === 'string' ? o : JSON.stringify(o)).toString('base64url');
const NOW = 1_800_000_000_000, t = NOW / 1000;
const REPO = ['lexkiteapp', 'lexkiteapp.github.io'].join('/');
async function mint(over = {}, head = {}) {
  const ref = over.ref || 'refs/heads/main', wf = over.wf || 'explain';
  const body = { iss: 'https://token.actions.githubusercontent.com', aud: 'lexkite-lexai', repository: REPO, repository_id: REPO_ID, ref, job_workflow_ref: `${REPO}/.github/workflows/${wf}.yml@${ref}`, iat: t, nbf: t - 5, exp: t + 600, ...over };
  delete body.wf;
  for (const k of Object.keys(body)) if (body[k] === undefined) delete body[k];
  const h = b64({ alg: 'RS256', kid: 'k1', ...head }), p = b64(body);
  const sig = Buffer.from(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', privateKey, new TextEncoder().encode(h + '.' + p))).toString('base64url');
  return `${h}.${p}.${sig}`;
}
const ok = async (o, h) => (await verifyOidc(await mint(o, h), NOW, getKeys)) !== null;

assert.ok(await ok({}), 'token hợp lệ trên main');
for (const wf of WORKFLOWS) assert.ok(await ok({ wf }), 'workflow cho phép: ' + wf);
assert.ok(await ok({ wf: 'say-native', ref: 'refs/heads/feat/x' }), 'say-native chạy trên nhánh tính năng');
assert.ok(await ok({ wf: 'lexicon-expand', ref: 'refs/heads/pilot-1' }), 'lexicon-expand pilot nhánh');
assert.ok(await ok({ exp: t - 30 }), 'lệch đồng hồ nhỏ khi hết hạn được dung thứ');

assert.ok(!(await ok({ repository_id: '1' })), 'sai repository_id');
assert.ok(!(await ok({ repository_id: undefined })), 'thiếu repository_id');
assert.ok(!(await ok({ repository: 'evil/' + REPO.split('/')[1] })), 'sai repo');
assert.ok(!(await ok({ aud: 'other' })), 'sai aud');
assert.ok(!(await ok({ iss: 'https://evil.example' })), 'sai iss');
assert.ok(!(await ok({ ref: 'refs/heads/feat/x' })), 'explain không được chạy từ nhánh khác');
assert.ok(!(await ok({ ref: 'refs/pull/5/merge', wf: 'say-native' })), 'ref pull request bị chặn');
assert.ok(!(await ok({ ref: 'refs/tags/v1', wf: 'say-native' })), 'tag bị chặn');
assert.ok(!(await ok({ wf: 'ci' })), 'workflow ngoài danh sách');
assert.ok(!(await ok({ job_workflow_ref: 'evil/x/.github/workflows/explain.yml@refs/heads/main' })), 'workflow của repo khác');
assert.ok(!(await ok({ job_workflow_ref: `${REPO}/.github/workflows/explain.yml@refs/heads/other` })), 'ref workflow khác ref token');
assert.ok(!(await ok({ exp: t - 3600 })), 'hết hạn');
assert.ok(!(await ok({ nbf: t + 3600 })), 'chưa đến nbf');
assert.ok(!(await ok({ iat: t + 3600 })), 'iat ở tương lai');
assert.ok(!(await ok({}, { alg: 'none' })), 'alg lạ');
assert.ok(!(await ok({}, { kid: 'zzz' })), 'kid lạ');
const bad = (await mint()).slice(0, -4) + 'AAAA';
assert.equal(await verifyOidc(bad, NOW, getKeys), null, 'chữ ký sai');
assert.equal(await verifyOidc('abc', NOW, getKeys), null);
assert.equal(await verifyOidc('a.b.c', NOW, getKeys), null, 'rác không ném lỗi');
console.log('✓ lexai OIDC: ghim repo id, ref, workflow, thời gian');
