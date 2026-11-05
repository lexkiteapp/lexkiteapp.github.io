// App Store Connect API – client dùng chung (JWT ES256 từ khoá .p8, không fastlane). Dùng bởi scripts/asc-upload.mjs (chữ niêm yết/ảnh)
// và scripts/store/asc-submit.mjs (nộp bản mới tự động – .github/workflows/store-submit.yml). Khoá/JWT KHÔNG BAO GIỜ được in ra.
import fs from 'node:fs';
import crypto from 'node:crypto';

export const ASC_API = 'https://api.appstoreconnect.apple.com';

/** Khoá từ env: ASC_KEY_ID, ASC_ISSUER_ID + ASC_KEY_P8 (nội dung .p8) hoặc ASC_KEY_PATH. Thiếu → null. */
export function ascKeyFromEnv(env = process.env) {
  const kid = env.ASC_KEY_ID, iss = env.ASC_ISSUER_ID;
  const pem = env.ASC_KEY_P8 || (env.ASC_KEY_PATH && fs.existsSync(env.ASC_KEY_PATH) ? fs.readFileSync(env.ASC_KEY_PATH, 'utf8') : '');
  return kid && iss && pem ? { kid, iss, pem } : null;
}

/** JWT ES256 cho App Store Connect (thuần, `now` = giây). Hạn ≤ 20 phút theo luật Apple (dùng 1100 s). */
export function ascJwt(key, now = Math.floor(Date.now() / 1000), ttl = 1100) {
  if (ttl > 1200) throw new Error('ASC JWT: hạn tối đa 20 phút');
  const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
  const head = b64({ alg: 'ES256', kid: key.kid, typ: 'JWT' });
  const body = b64({ iss: key.iss, iat: now, exp: now + ttl, aud: 'appstoreconnect-v1' });
  const sig = crypto.sign('sha256', Buffer.from(`${head}.${body}`), { key: key.pem, dsaEncoding: 'ieee-p1363' }).toString('base64url');
  return `${head}.${body}.${sig}`;
}

/** Lỗi API Apple → 1 dòng dễ đọc (không chứa khoá/JWT). */
export function ascErrorText(txt) {
  try {
    return JSON.parse(txt).errors.map(e => `${e.code}: ${e.detail || e.title}` + (e.meta?.associatedErrors ? ' ' + JSON.stringify(e.meta.associatedErrors).slice(0, 2500) : '')).join(' | ');
  } catch { return String(txt).slice(0, 600); }
}

/** Client: { api(method, path, body), get(path), all(path) }. `fetchImpl` thay được trong test. Lỗi HTTP → Error có .status. */
export function createAsc(key, { fetchImpl = globalThis.fetch, base = ASC_API, sleep = ms => new Promise(r => setTimeout(r, ms)) } = {}) {
  let tok = null, tokExp = 0;
  const jwt = () => { const now = Math.floor(Date.now() / 1000); if (!tok || now >= tokExp - 60) { tok = ascJwt(key, now); tokExp = now + 1100; } return tok; };
  async function api(method, p, body) {
    for (let attempt = 0; ; attempt++) {
      const r = await fetchImpl(base + p, { method, headers: { Authorization: `Bearer ${jwt()}`, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
      if ((r.status === 429 || r.status >= 500) && attempt < 4) { await sleep(3000 * (attempt + 1)); continue; }
      const txt = await r.text();
      if (!r.ok) { const e = new Error(`${method} ${p.split('?')[0]} → ${r.status} ${ascErrorText(txt)}`); e.status = r.status; throw e; }
      return txt ? JSON.parse(txt) : {};
    }
  }
  const get = p => api('GET', p);
  async function all(p) {
    const data = [], included = [];
    for (let next = p; next;) { const r = await get(next); data.push(...(r.data || [])); included.push(...(r.included || [])); next = r.links?.next ? r.links.next.replace(base, '') : null; }
    return { data, included };
  }
  return { api, get, all };
}
