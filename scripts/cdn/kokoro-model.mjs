#!/usr/bin/env node
// Chép mô hình Kokoro-82M (onnx-community/Kokoro-82M-v1.0-ONNX, Apache-2.0) từ Hugging Face lên R2 lexkite-audio-cdn → audio.lexkite.com/kokoro/<VER>/…
// cho kokoro-js chạy trên máy người dùng (docs/specs/kokoro-on-device.md, web/js/klocal.js giữ cùng VER + sha256). CHỈ chạy trên CI (kokoro-model.yml).
// Ghim theo commit HF (đổi bản = VER mới, đường mới → cache immutable 1 năm không bao giờ sai). Kiểm sha256 LFS trước khi đẩy; đã có (HEAD 200, cùng cỡ) → bỏ qua.
//   node scripts/cdn/kokoro-model.mjs [--dry]
import { signV4, sha256hex } from '../lib/media-store.mjs';
import { ACCOUNT } from './hosts.mjs';
import { r2Frozen } from '../lib/r2-freeze.mjs'; import { pathToFileURL } from 'node:url';
export const REV = '1939ad2a8e416c0acfeecc08a694d14ef25f2231', VER = 'v1.0-1939ad2', BUCKET = 'lexkite-audio-cdn';
// Chỉ bản q8 (nhẹ nhất, 92 MB) + giọng app dùng (scripts/word-audio/lib.mjs, characters.js, listen/kvoice.js NARRATOR/POOL Anh–Mỹ)
export const FILES = {
  'config.json': null, 'tokenizer.json': null, 'tokenizer_config.json': null,
  'onnx/model_quantized.onnx': 'fbae9257e1e05ffc727e951ef9b9c98418e6d79f1c9b6b13bd59f5c9028a1478',
  'voices/af_heart.bin': 'd583ccff3cdca2f7fae535cb998ac07e9fcb90f09737b9a41fa2734ec44a8f0b',
  'voices/bf_emma.bin': '669fe0647f9dd04fcab92f1439a40eeb4c8b4ab1f82e4996fe3d918ce4a63b73',
  'voices/am_michael.bin': '1d1f21dd8da39c30705cd4c75d039d265e9bc4a2a93ed09bc9e1b1225eb95ba1',
  'voices/bm_george.bin': 'c4b235a4c1f2cd3b939fed08b899ce9385638b763f7b73a59616c4fc9bd6c9bc',
  'voices/bm_lewis.bin': 'b8f671cef828c30e66fdf0b0756a76bba58f6bb3398cbbf27058642acbcedb97',
};
const TYPE = f => (f.endsWith('.json') ? 'application/json' : 'application/octet-stream');
const enc = s => encodeURIComponent(s).replace(/[!'()*]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase());
async function r2(method, key, body, headers = {}) {
  const host = `${process.env.R2_ACCOUNT_ID || ACCOUNT}.r2.cloudflarestorage.com`, p = `/${BUCKET}/${key}`;
  const hs = signV4({ method, host, path: p, headers, payloadHash: sha256hex(body || ''), keyId: process.env.R2_ACCESS_KEY_ID, secret: process.env.R2_SECRET_ACCESS_KEY }); delete hs.host;
  for (let i = 0; ; i++) { try { const r = await fetch(`https://${host}${p.split('/').map(enc).join('/')}`, { method, headers: hs, body }); if (r.status >= 500 && i < 4) throw new Error('R2 ' + r.status); return r; } catch (e) { if (i >= 4) throw e; await new Promise(r => setTimeout(r, 1000 * 2 ** i)); } }
}
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const DRY = process.argv.includes('--dry');
  if (!process.env.CI && !DRY) { console.error('kokoro-model: chỉ chạy trên CI (hoặc --dry)'); process.exit(2); }
  if (r2Frozen() && !DRY) { console.log('::notice::R2 đóng băng (chốt $0) → không ghi'); process.exit(0); }
  if (!DRY && !process.env.R2_ACCESS_KEY_ID) { console.error('thiếu khoá S3 (scripts/cdn/creds.mjs)'); process.exit(1); }
  let bad = 0, put = 0;
  for (const [f, want] of Object.entries(FILES)) {
    const key = `kokoro/${VER}/${f}`;
    const buf = Buffer.from(await (await fetch(`https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX/resolve/${REV}/${f}`)).arrayBuffer());
    const got = sha256hex(buf);
    if (want && got !== want) { console.error(`✗ ${f}: sha256 ${got} ≠ ${want}`); bad++; continue; }
    if (DRY) { console.log(`· ${key} ${buf.length} B ${got.slice(0, 12)}`); continue; }
    const h = await r2('HEAD', key);
    if (h.ok && +h.headers.get('content-length') === buf.length) { console.log(`= ${key}`); continue; }
    const r = await r2('PUT', key, buf, { 'content-type': TYPE(f), 'cache-control': 'public, max-age=31536000, immutable' });
    if (!r.ok) { console.error(`✗ PUT ${key}: ${r.status}`); bad++; } else { put++; console.log(`+ ${key} ${buf.length} B`); }
  }
  // Kiểm qua tên miền thật (cache biên + CORS cho Worker trình duyệt)
  if (!DRY) for (const f of ['config.json', 'voices/af_heart.bin']) {
    const r = await fetch(`https://audio.lexkite.com/kokoro/${VER}/${f}`, { headers: { Origin: 'https://lexkite.com' } });
    console.log(`${r.ok ? '✓' : '✗'} audio.lexkite.com/kokoro/${VER}/${f} ${r.status} CORS=${r.headers.get('access-control-allow-origin')} cache=${r.headers.get('cf-cache-status')}`); if (!r.ok) bad++;
  }
  console.log(`kokoro-model: ${put} tệp mới, ${bad} lỗi`); process.exit(bad ? 1 : 0);
}
