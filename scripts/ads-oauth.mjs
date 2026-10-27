#!/usr/bin/env node
// 🔑 Lấy refresh token OAuth 1 LẦN cho báo cáo doanh thu thật (docs/ADS.md §5) – chủ chạy trên máy mình:
//   node scripts/ads-oauth.mjs --client ~/Downloads/client_secret_XXXX.json
// Client OAuth loại "Desktop app" trong GCP project lexkite-app (consent screen "In production", scope adsense.readonly + admob.readonly).
// Luồng loopback 127.0.0.1 + PKCE: mở URL in ra → chọn vintagezulilyjewelry@gmail.com → Allow → script nhận mã, đổi lấy refresh token.
// Kết quả: ghi ~/.config/lexkite/ads-oauth.json (quyền 600) và, nếu có gh CLI, tự đặt 3 secret GitHub ADS_OAUTH_CLIENT_ID / _SECRET / ADS_OAUTH_REFRESH
// (giá trị đi qua stdin của gh, không in ra màn hình). Không có gh → in lệnh để chủ tự chạy. Không gửi gì đi đâu khác ngoài Google.
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const SCOPES = ['https://www.googleapis.com/auth/adsense.readonly', 'https://www.googleapis.com/auth/admob.readonly'];
const REPO = 'lexkiteapp/lexkiteapp.github.io';
const b64u = b => Buffer.from(b).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
/** Đọc client từ file JSON tải về của Google ({installed|web: {client_id, client_secret}}) hoặc biến môi trường. */
export function readClient(file, env = process.env) {
  if (file) { const j = JSON.parse(fs.readFileSync(file.replace(/^~/, os.homedir()), 'utf8')), c = j.installed || j.web || j; return { id: c.client_id, secret: c.client_secret }; }
  return { id: env.ADS_OAUTH_CLIENT_ID, secret: env.ADS_OAUTH_CLIENT_SECRET };
}
export function authUrl(clientId, redirect, challenge, state) {
  const q = new URLSearchParams({ client_id: clientId, redirect_uri: redirect, response_type: 'code', scope: SCOPES.join(' '), access_type: 'offline', prompt: 'consent', code_challenge: challenge, code_challenge_method: 'S256', state, login_hint: 'vintagezulilyjewelry@gmail.com' });
  return 'https://accounts.google.com/o/oauth2/v2/auth?' + q;
}

async function main() {
  const a = process.argv.slice(2), fi = a.indexOf('--client'), client = readClient(fi >= 0 ? a[fi + 1] : null);
  if (!client.id || !client.secret) { console.error('✗ cần --client <client_secret_*.json> (tải ở GCP › APIs & Services › Credentials) hoặc ADS_OAUTH_CLIENT_ID/_SECRET'); process.exit(1); }
  const verifier = b64u(crypto.randomBytes(32)), challenge = b64u(crypto.createHash('sha256').update(verifier).digest()), state = b64u(crypto.randomBytes(12));
  let redirect = '';
  const code = await new Promise((resolve, reject) => {
    const srv = http.createServer((req, res) => {
      const u = new URL(req.url, 'http://127.0.0.1');
      if (u.pathname !== '/cb') { res.writeHead(404).end(); return; }
      const ok = u.searchParams.get('state') === state && u.searchParams.get('code');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }).end(ok ? '<h1>✓ Xong – đóng tab này, quay lại Terminal.</h1>' : '<h1>✗ Lỗi: ' + String(u.searchParams.get('error') || 'state').replace(/[<>&]/g, '') + '</h1>');
      srv.close(); ok ? resolve({ code: ok, redirect }) : reject(new Error(u.searchParams.get('error') || 'state'));
    });
    srv.listen(0, '127.0.0.1', () => {
      redirect = `http://127.0.0.1:${srv.address().port}/cb`;
      console.log('\n1) Mở link này trong Chrome (tài khoản vintagezulilyjewelry@gmail.com) → Allow:\n\n' + authUrl(client.id, redirect, challenge, state) + '\n');
      try { spawnSync(process.platform === 'darwin' ? 'open' : 'xdg-open', [authUrl(client.id, redirect, challenge, state)], { stdio: 'ignore' }); } catch (e) { /* tự mở */ }
    });
    setTimeout(() => { srv.close(); reject(new Error('hết 5 phút chờ')); }, 300000).unref();
  });
  const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ code: code.code, client_id: client.id, client_secret: client.secret, redirect_uri: code.redirect, grant_type: 'authorization_code', code_verifier: verifier }) });
  const j = await r.json();
  if (!j.refresh_token) { console.error('✗ Google không trả refresh token: ' + (j.error_description || j.error || r.status)); process.exit(1); }
  const dir = path.join(os.homedir(), '.config/lexkite'); fs.mkdirSync(dir, { recursive: true });
  const f = path.join(dir, 'ads-oauth.json'); fs.writeFileSync(f, JSON.stringify({ client_id: client.id, client_secret: client.secret, refresh_token: j.refresh_token, at: new Date().toISOString() }), { mode: 0o600 });
  console.log('✓ Đã lưu ' + f + ' (600)');
  const set = (name, value) => spawnSync('gh', ['secret', 'set', name, '--repo', REPO], { input: value, stdio: ['pipe', 'inherit', 'inherit'] }).status === 0;
  if (set('ADS_OAUTH_CLIENT_ID', client.id) && set('ADS_OAUTH_CLIENT_SECRET', client.secret) && set('ADS_OAUTH_REFRESH', j.refresh_token)) console.log('✓ Đã đặt 3 secret GitHub. Chạy thử: Actions › Ads revenue › Run workflow.');
  else console.log(`· Không đặt được secret bằng gh – tự chạy (giá trị lấy từ ${f}):\n  gh secret set ADS_OAUTH_CLIENT_ID --repo ${REPO}\n  gh secret set ADS_OAUTH_CLIENT_SECRET --repo ${REPO}\n  gh secret set ADS_OAUTH_REFRESH --repo ${REPO}`);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(e => { console.error('✗ ' + e.message); process.exit(1); });
