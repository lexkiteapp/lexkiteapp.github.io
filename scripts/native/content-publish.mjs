#!/usr/bin/env node
/* Signed server-driven content for the native apps (docs/specs/native-apps.md §4) – ONE source: native/shared/content/<type>.json.
 *   node scripts/native/content-publish.mjs sign    (CI only, secret OTA_SIGNING_KEY) → web/native/content/<type>.json, committed like
 *                                                   any web file, then served by Cloudflare Pages at https://lexkite.com/native/content/<type>.json
 *                                                   (both deploy modes – git build and Direct Upload – serve it; no key needed at deploy)
 *   node scripts/native/content-publish.mjs check   (npm test, no key) every published file verifies against web/js/ota-key.js,
 *                                                   is readable by the shipped + current app, and matches its source (else "needs signing").
 * Same scheme as web OTA (ECDSA P-256, scripts/ota/lib.mjs): signatures are public, only the private key is secret. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { decodeKey } from '../ota/lib.mjs';
import { KIND, canon, sign, verify, read, SHIPPED_APP, CURRENT_APP } from './content-schema.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const R = p => path.join(ROOT, p);
export const CONTENT_URL = 'https://lexkite.com/native/content/{type}.json';
export const SRC_DIR = 'native/shared/content', OUT_DIR = 'web/native/content';
const PUB = (fs.readFileSync(R('web/js/ota-key.js'), 'utf8').match(/LK_OTA_KEY = '([^']*)'/) || [])[1];
const sources = () => fs.readdirSync(R(SRC_DIR)).filter(f => f.endsWith('.json')).sort().map(f => {
  const type = f.replace(/\.json$/, ''), s = JSON.parse(fs.readFileSync(R(`${SRC_DIR}/${f}`), 'utf8'));
  return { type, e: { kind: KIND, type, schema: s.schema, minApp: s.minApp, version: '', body: s.body } };
});
const frameTabs = () => JSON.parse(fs.readFileSync(R('native/shared/gen/frame.json'), 'utf8')).tabs.map(t => t.k);

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const cmd = process.argv[2], errs = [], warn = [];
  for (const { type, e } of sources()) {
    if (type === 'modules' && JSON.stringify([...e.body.order].sort()) !== JSON.stringify([...frameTabs()].sort())) errs.push('modules.order ≠ frame.json tabs');
    const out = R(`${OUT_DIR}/${type}.json`);
    if (cmd === 'sign') {
      const key = process.env.OTA_SIGNING_KEY; if (!key) { console.error('✗ thiếu secret OTA_SIGNING_KEY (chỉ chạy trên CI)'); process.exit(1); }
      const prev = fs.existsSync(out) ? JSON.parse(fs.readFileSync(out, 'utf8')) : null;
      if (prev && canon({ ...e, version: prev.version }) === canon(prev) && verify(prev, PUB)) { console.log(`= ${type} không đổi`); continue; }
      const env = { ...e, version: new Date().toISOString().replace(/\.\d+Z$/, 'Z') }, signed = { ...env, signature: sign(env, decodeKey(key)) };
      if (!verify(signed, PUB)) { console.error('✗ chữ ký không khớp khóa công khai web/js/ota-key.js'); process.exit(1); }
      fs.mkdirSync(path.dirname(out), { recursive: true }); fs.writeFileSync(out, JSON.stringify(signed) + '\n'); console.log(`✓ ký ${type} ${env.version}`);
    } else if (cmd === 'check') {
      if (!fs.existsSync(out)) { warn.push(`${type}: chưa ký/đăng (app dùng gói khởi động) – chạy content-publish sign trên CI`); continue; }
      const txt = fs.readFileSync(out, 'utf8'), p = JSON.parse(txt);
      for (const app of [SHIPPED_APP, CURRENT_APP]) { const r = read(txt, app, PUB); if (!r.ok) errs.push(`${type} @${app}: ${r.reason}`); }
      if (canon({ ...e, version: p.version }) !== canon(p)) warn.push(`${type}: nguồn đã đổi – cần ký lại trên CI`);
    } else { console.error('dùng: content-publish.mjs sign | check'); process.exit(2); }
  }
  warn.forEach(w => console.log('⚠ ' + w));
  if (errs.length) { console.log(errs.map(x => '✗ ' + x).join('\n')); process.exit(1); }
  console.log(`✓ content-publish ${cmd}: ${sources().length} loại nội dung, URL ${CONTENT_URL}`);
}
