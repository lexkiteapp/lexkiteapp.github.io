// Hồi quy: xác thực OIDC (functions/api/lexai.js verifyOidc + lexaiAllowed) ghim repository_id, thời hạn exp/nbf/iat, nhánh và workflow.
// Token giả ký bằng khóa test; JWKS tiêm qua getKeys (không mạng). Cũng kiểm /api/keysync (aud riêng) vẫn dùng chung verifyOidc.
import assert from 'node:assert/strict';
import { verifyOidc, lexaiAllowed, REPO_ID, WORKFLOWS, BRANCH_OK, PR_OK } from '../../functions/api/lexai.js';
import { allowed as keysyncAllowed } from '../../functions/api/keysync.js';

const { publicKey, privateKey } = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
const jwk = { ...(await crypto.subtle.exportKey('jwk', publicKey)), kid: 'k1' };
const getKeys = async () => [jwk];
const b64 = o => Buffer.from(typeof o === 'string' ? o : JSON.stringify(o)).toString('base64url');
const NOW = 1_800_000_000_000, t = NOW / 1000;
const REPO = ['lexkiteapp', 'lexkiteapp.github.io'].join('/');
async function mint(over = {}, head = {}) {
  const ref = over.ref || 'refs/heads/main', wf = over.wf || 'explain';
  const body = { iss: 'https://token.actions.githubusercontent.com', aud: 'lexkite-lexai', repository: REPO, repository_id: REPO_ID, ref, event_name: 'workflow_dispatch', job_workflow_ref: `${REPO}/.github/workflows/${wf}.yml@${ref}`, iat: t, nbf: t - 5, exp: t + 600, ...over };
  delete body.wf;
  for (const k of Object.keys(body)) if (body[k] === undefined) delete body[k];
  const h = b64({ alg: 'RS256', kid: 'k1', ...head }), p = b64(body);
  const sig = Buffer.from(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', privateKey, new TextEncoder().encode(h + '.' + p))).toString('base64url');
  return `${h}.${p}.${sig}`;
}
// cổng đầy đủ của /api/lexai = chữ ký + claims chung + lexaiAllowed
const ok = async (o, h, aud) => { const c = await verifyOidc(await mint(o, h), NOW, aud, getKeys); return c !== null && lexaiAllowed(c); };

assert.ok(await ok({}), 'token hợp lệ trên main');
for (const wf of WORKFLOWS) assert.ok(await ok({ wf }), 'workflow cho phép: ' + wf);
for (const wf of BRANCH_OK) assert.ok(await ok({ wf, ref: 'refs/heads/feat/x' }), wf + ' chạy trên nhánh tính năng/pilot');
for (const wf of PR_OK) assert.ok(await ok({ wf, ref: 'refs/pull/5/merge', event_name: 'pull_request' }), wf + ' lượt thử pull_request cùng repo');
assert.ok(await ok({ exp: t - 30 }), 'lệch đồng hồ nhỏ khi hết hạn được dung thứ');

assert.ok(!(await ok({ repository_id: '1' })), 'sai repository_id');
assert.ok(!(await ok({ repository_id: undefined })), 'thiếu repository_id');
assert.ok(!(await ok({ repository: 'evil/' + REPO.split('/')[1] })), 'sai repo');
assert.ok(!(await ok({ aud: 'other' })), 'sai aud');
assert.ok(!(await ok({ iss: 'https://evil.example' })), 'sai iss');
assert.ok(!(await ok({ ref: 'refs/heads/feat/x' })), 'explain không được chạy từ nhánh khác');
assert.ok(!(await ok({ ref: 'refs/pull/5/merge', wf: 'say-native', event_name: 'pull_request' })), 'say-native không nằm trong PR_OK');
assert.ok(!(await ok({ ref: 'refs/pull/5/merge', wf: 'explain', event_name: 'pull_request' })), 'explain không được chạy từ PR');
assert.ok(!(await ok({ ref: 'refs/pull/5/merge', wf: 'target-content', event_name: 'workflow_dispatch' })), 'ref PR mà event không phải pull_request');
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
assert.equal(await verifyOidc(bad, NOW, undefined, getKeys), null, 'chữ ký sai');
assert.equal(await verifyOidc('abc', NOW, undefined, getKeys), null);
assert.equal(await verifyOidc('a.b.c', NOW, undefined, getKeys), null, 'rác không ném lỗi');
// keysync: aud riêng, cùng ghim repo id/thời hạn; quyền theo workflow/ref của chính nó
const KS = 'lexkite-keysync', ksWf = `${REPO}/.github/workflows/ai-keys-sync.yml@refs/heads/main`;
const ks = await verifyOidc(await mint({ aud: KS, job_workflow_ref: ksWf }), NOW, KS, getKeys);
assert.ok(ks && keysyncAllowed(ks), 'keysync: token đúng aud/workflow');
assert.equal(await verifyOidc(await mint({ aud: KS, repository_id: '9', job_workflow_ref: ksWf }), NOW, KS, getKeys), null, 'keysync: sai repository_id');
assert.equal(await verifyOidc(await mint({ aud: KS, exp: t - 3600, job_workflow_ref: ksWf }), NOW, KS, getKeys), null, 'keysync: hết hạn');
assert.equal(await verifyOidc(await mint({ aud: 'lexkite-lexai' }), NOW, KS, getKeys), null, 'token lexai không dùng được cho keysync');
console.log('✓ OIDC: ghim repo id, ref, workflow, thời gian (lexai + keysync)');
