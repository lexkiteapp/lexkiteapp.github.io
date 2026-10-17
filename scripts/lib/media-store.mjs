// Nơi đẩy ảnh blog riêng từng bài (content hash → blog/p/<hash>-<w>.<ext>), phục vụ qua https://media.lexkite.com/blog/p/…
//  1) R2 (đích chính, không giới hạn 1 GB): bucket lexkite-blog-media qua API S3 (SigV4 tự ký, không gói ngoài).
//     Cần secret R2_ACCESS_KEY_ID + R2_SECRET_ACCESS_KEY (token R2 "Object Read & Write" chỉ bucket này); account = R2_ACCOUNT_ID | CF_ACCOUNT_ID.
//  2) Dự phòng = cơ chế cũ của blog-media.mjs: repo GitHub lexkiteapp/lexkite-media (GitHub Pages là ORIGIN của Worker media),
//     token GH_MEDIA_TOKEN (CI: secret LEXKITE_MEDIA_TOKEN) hoặc `gh auth token` khi chạy tay. Chỉ hợp tới ~1 GB (≈ 1.000 bài).
// Không in/ghi token ra log hay cấu hình git.
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto'; import { execFileSync } from 'node:child_process';

export const DEFAULT_ACCOUNT = 'e34e14b7ab35eaf2b3d9d84fcce011f7', DEFAULT_BUCKET = 'lexkite-blog-media';
export const TYPES = { avif: 'image/avif', webp: 'image/webp', jpg: 'image/jpeg', png: 'image/png' };
export const IMMUTABLE = 'public, max-age=31536000, immutable';

export function r2Config(env = process.env) {
  if (!env.R2_ACCESS_KEY_ID || !env.R2_SECRET_ACCESS_KEY) return null;
  const account = env.R2_ACCOUNT_ID || env.CF_ACCOUNT_ID || DEFAULT_ACCOUNT;
  return { account, bucket: env.R2_BUCKET || DEFAULT_BUCKET, keyId: env.R2_ACCESS_KEY_ID, secret: env.R2_SECRET_ACCESS_KEY, host: `${account}.r2.cloudflarestorage.com`, region: 'auto' };
}

// ---------- AWS Signature V4 (S3) ----------
const hmac = (k, s) => crypto.createHmac('sha256', k).update(s).digest();
export const sha256hex = b => crypto.createHash('sha256').update(b).digest('hex');
const enc = s => encodeURIComponent(s).replace(/[!'()*]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase());
export function signV4({ method, host, path: p, query = {}, headers = {}, payloadHash, keyId, secret, region = 'auto', service = 's3', date = new Date() }) {
  const amz = date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''), day = amz.slice(0, 8);
  const h = { ...Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), String(v).trim()])), host, 'x-amz-content-sha256': payloadHash, 'x-amz-date': amz };
  const names = Object.keys(h).sort(), canonHeaders = names.map(k => `${k}:${h[k]}\n`).join(''), signed = names.join(';');
  const canonQuery = Object.keys(query).sort().map(k => `${enc(k)}=${enc(query[k])}`).join('&');
  const canonPath = p.split('/').map(enc).join('/');
  const creq = [method, canonPath, canonQuery, canonHeaders, signed, payloadHash].join('\n');
  const scope = `${day}/${region}/${service}/aws4_request`, sts = ['AWS4-HMAC-SHA256', amz, scope, sha256hex(creq)].join('\n');
  const kSign = hmac(hmac(hmac(hmac('AWS4' + secret, day), region), service), 'aws4_request');
  const sig = crypto.createHmac('sha256', kSign).update(sts).digest('hex');
  return { ...h, authorization: `AWS4-HMAC-SHA256 Credential=${keyId}/${scope}, SignedHeaders=${signed}, Signature=${sig}` };
}
async function r2(cfg, method, key, { body, query = {}, headers = {} } = {}) {
  const p = `/${cfg.bucket}${key ? '/' + key : ''}`, payloadHash = body ? sha256hex(body) : sha256hex('');
  const hs = signV4({ method, host: cfg.host, path: p, query, headers, payloadHash, keyId: cfg.keyId, secret: cfg.secret, region: cfg.region });
  delete hs.host;
  const qs = Object.keys(query).length ? '?' + new URLSearchParams(query).toString() : '';
  for (let i = 0; ; i++) {
    try { const r = await fetch(`https://${cfg.host}${p.split('/').map(enc).join('/')}${qs}`, { method, headers: hs, body }); if (r.status >= 500 && i < 3) throw new Error('R2 ' + r.status); return r; }
    catch (e) { if (i >= 3) throw e; await new Promise(r => setTimeout(r, 800 * 2 ** i)); }
  }
}
export const r2Head = async (cfg, key) => (await r2(cfg, 'HEAD', key)).status === 200;
export async function r2Put(cfg, key, body, type) { const r = await r2(cfg, 'PUT', key, { body, headers: { 'content-type': type, 'cache-control': IMMUTABLE } }); if (!r.ok) throw new Error(`R2 PUT ${key}: ${r.status}`); }
export async function r2Delete(cfg, key) { const r = await r2(cfg, 'DELETE', key); if (!r.ok && r.status !== 404) throw new Error(`R2 DELETE ${key}: ${r.status}`); }
export async function* r2List(cfg, prefix) {
  let token = '';
  for (;;) {
    const q = { 'list-type': '2', prefix, ...(token ? { 'continuation-token': token } : {}) }, r = await r2(cfg, 'GET', '', { query: q });
    if (!r.ok) throw new Error(`R2 LIST: ${r.status}`);
    const x = await r.text();
    for (const m of x.matchAll(/<Contents>([\s\S]*?)<\/Contents>/g)) yield { key: (m[1].match(/<Key>([^<]*)<\/Key>/) || [])[1], size: +((m[1].match(/<Size>(\d+)/) || [])[1] || 0), modified: (m[1].match(/<LastModified>([^<]*)/) || [])[1] };
    token = (x.match(/<NextContinuationToken>([^<]*)</) || [])[1]; if (!token) return;
  }
}

// ---------- Đẩy cả thư mục ra (bỏ qua file đã có → chạy lại an toàn, tiếp tục được) ----------
export async function pushDir(dir, { prefix = 'blog/p/', env = process.env, log = console.log } = {}) {
  const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => /\.(avif|webp|jpg|png)$/.test(f)).sort() : [];
  if (!files.length) return { backend: 'none', uploaded: 0, files: 0 };
  const cfg = r2Config(env);
  if (cfg) {
    let up = 0, i = 0; const queue = [...files];
    const worker = async () => { while (queue.length) { const f = queue.shift(), key = prefix + f; i++; if (await r2Head(cfg, key)) continue; await r2Put(cfg, key, fs.readFileSync(path.join(dir, f)), TYPES[f.split('.').pop()]); up++; } };
    await Promise.all(Array.from({ length: 8 }, worker));
    log(`✓ R2 ${cfg.bucket}: ${up} file mới / ${files.length}`);
    return { backend: 'r2', uploaded: up, files: files.length };
  }
  const tok = env.GH_MEDIA_TOKEN || (env.CI ? '' : (() => { try { return execFileSync('gh', ['auth', 'token'], { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch { return ''; } })());
  if (!tok) return { backend: 'missing', uploaded: 0, files: files.length };
  const repo = env.MEDIA_REPO || 'lexkiteapp/lexkite-media', clone = env.MEDIA_REPO_DIR || path.join(env.RUNNER_TEMP || env.TMPDIR || '/tmp', 'lexkite-media-repo');
  const auth = ['-c', 'credential.helper=', '-c', `http.extraHeader=Authorization: Basic ${Buffer.from('x-access-token:' + tok).toString('base64')}`];
  const git = (...a) => execFileSync('git', [...auth, '-C', clone, ...a], { stdio: ['ignore', 'ignore', 'inherit'] });
  if (!fs.existsSync(clone)) execFileSync('git', [...auth, 'clone', '-q', '--template=', '--depth', '1', '--filter=blob:none', '--sparse', `https://github.com/${repo}.git`, clone], { stdio: ['ignore', 'ignore', 'inherit'] });
  else git('pull', '-q', '--ff-only');
  try { git('sparse-checkout', 'set', '--no-cone', '/blog/p/', '/.nojekyll'); } catch { /* git cũ: lấy cả kho */ }
  const out = path.join(clone, prefix); fs.mkdirSync(out, { recursive: true });
  let n = 0; for (const f of files) if (!fs.existsSync(path.join(out, f))) { fs.copyFileSync(path.join(dir, f), path.join(out, f)); n++; }
  if (n) { git('add', '-A', '--sparse', prefix); git('-c', 'user.name=lexkite-bot', '-c', 'user.email=lexkiteapp@users.noreply.github.com', 'commit', '-qm', `Ảnh blog riêng từng bài: ${n} file`); for (let i = 0; ; i++) { try { git('push', '-q'); break; } catch (e) { if (i >= 3) throw e; git('pull', '-q', '--rebase'); } } }
  log(`✓ ${repo}: ${n} file mới / ${files.length} (dự phòng – chuyển sang R2 khi có secret R2_*)`);
  return { backend: 'git', uploaded: n, files: files.length };
}
