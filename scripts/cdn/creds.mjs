#!/usr/bin/env node
// Suy khoá S3 của R2 từ API token Cloudflare (tài liệu R2 "Get S3 API credentials from an API token"):
//   Access Key ID = id của token · Secret Access Key = SHA-256 (hex) của giá trị token. Token phải có quyền Workers R2 Storage.
// CI: không cần secret R2_* riêng – dùng CLOUDFLARE_API_TOKEN sẵn có. Ghi vào $GITHUB_ENV, che (::add-mask::) trước khi ghi. Không in khoá.
import crypto from 'node:crypto'; import fs from 'node:fs';
import { isMain } from '../lib/is-main.mjs';
import { ACCOUNT } from './hosts.mjs';

export const s3Secret = token => crypto.createHash('sha256').update(token).digest('hex');
export async function tokenId(token, fetcher = fetch, account = ACCOUNT) {
  for (const p of ['/user/tokens/verify', `/accounts/${account}/tokens/verify`]) { // token người dùng | token tài khoản
    const r = await fetcher('https://api.cloudflare.com/client/v4' + p, { headers: { Authorization: `Bearer ${token}` } });
    const j = await r.json().catch(() => ({}));
    if (r.ok && j.success && j.result && j.result.id) return j.result.id;
  }
  return null;
}
if (isMain(import.meta.url)) { // so realpath: /tmp ↔ /private/tmp (02/11: so chuỗi → khối main không chạy, switch im lặng 'thành công')
  const env = process.env;
  if (env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY) { console.log('creds: dùng secret R2_* có sẵn'); process.exit(0); }
  const tok = env.CLOUDFLARE_API_TOKEN; if (!tok) { console.error('creds: thiếu CLOUDFLARE_API_TOKEN'); process.exit(1); }
  const id = await tokenId(tok); if (!id) { console.error('creds: không đọc được id token (verify lỗi)'); process.exit(1); }
  const sec = s3Secret(tok);
  console.log(`::add-mask::${id}`); console.log(`::add-mask::${sec}`);
  if (env.GITHUB_ENV) fs.appendFileSync(env.GITHUB_ENV, `R2_ACCESS_KEY_ID=${id}\nR2_SECRET_ACCESS_KEY=${sec}\n`);
  console.log('creds: khoá S3 R2 suy từ CLOUDFLARE_API_TOKEN');
}
