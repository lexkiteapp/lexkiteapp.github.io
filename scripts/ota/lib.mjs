// OTA: chuỗi ký + ký/kiểm (docs/OTA.md). canon() PHẢI khớp web/js/ota.js. Chữ ký ECDSA P-256/SHA-256 dạng thô r||s (WebCrypto) mã base64.
import crypto from 'node:crypto';
export const canon = m => ['lexkite-ota-v1', m.version, m.url, m.sha256, m.minNative || '0'].join('\n');
export const releaseUrl = (version, repo = 'lexkiteapp/lexkiteapp.github.io') => `https://github.com/${repo}/releases/download/ota-${version}/bundle.zip`;
export function sign(m, privatePem) {
  return crypto.sign('sha256', Buffer.from(canon(m)), { key: privatePem, dsaEncoding: 'ieee-p1363' }).toString('base64');
}
export function verify(m, publicSpkiB64) {
  try { return crypto.verify('sha256', Buffer.from(canon(m)), { key: crypto.createPublicKey({ key: Buffer.from(publicSpkiB64, 'base64'), format: 'der', type: 'spki' }), dsaEncoding: 'ieee-p1363' }, Buffer.from(m.signature, 'base64')); } catch (e) { return false; }
}
export const decodeKey = s => (/-----BEGIN/.test(s) ? s : Buffer.from(s.trim(), 'base64').toString('utf8')); // secret có thể là PEM hoặc PEM mã base64 (xuống dòng trong secret dễ hỏng)
export function genKeys() {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' });
  return { privatePem: privateKey.export({ type: 'pkcs8', format: 'pem' }), publicB64: publicKey.export({ type: 'spki', format: 'der' }).toString('base64') };
}
