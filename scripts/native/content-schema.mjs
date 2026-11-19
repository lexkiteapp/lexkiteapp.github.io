#!/usr/bin/env node
/* Server-driven native content, SIGNED (docs/specs/native-apps.md §4 "Cập nhật không cần duyệt lại store").
 * Data only (Today config, module order, banners) – never executable code. Same signing scheme as web OTA (scripts/ota/lib.mjs,
 * web/js/ota.js): ECDSA P-256 / SHA-256, raw r||s (ieee-p1363) base64, public key = web/js/ota-key.js LK_OTA_KEY, private key = CI secret
 * OTA_SIGNING_KEY. Envelope:
 *   { kind: "lexkite-content-v1", type: "today"|"modules"|"banner", schema: int, minApp: "x.y.z", version: string, body: {...}, signature }
 *   signed string = ["lexkite-content-v1", type, schema, minApp, version, sha256hex(stable JSON of body)].join("\n")
 * Reader rules (this file is the reference; vectors/compat.json is generated from it): bad/missing signature or broken JSON → reject
 * (keep last cached + starter pack); minApp > app → reject "minApp"; unknown kind/type → reject; schema newer than the app → read
 * best-effort; unknown fields ignored; missing/wrong-typed fields → defaults; unknown block/component types skipped.
 * CLI (CI only, needs OTA_SIGNING_KEY):  node scripts/native/content-schema.mjs sign <type> <body.json> --schema N --min-app x.y.z --version v > out.json */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { decodeKey } from '../ota/lib.mjs';

export const KIND = 'lexkite-content-v1';
export const stable = v => JSON.stringify(v, (k, x) => (x && typeof x === 'object' && !Array.isArray(x) ? Object.keys(x).sort().reduce((o, key) => ((o[key] = x[key]), o), {}) : x));
export const canon = e => [KIND, e.type, e.schema, e.minApp, e.version, crypto.createHash('sha256').update(stable(e.body)).digest('hex')].join('\n');
export const sign = (e, privatePem) => crypto.sign('sha256', Buffer.from(canon(e)), { key: privatePem, dsaEncoding: 'ieee-p1363' }).toString('base64');
export function verify(e, spkiB64) {
  try { return crypto.verify('sha256', Buffer.from(canon(e)), { key: crypto.createPublicKey({ key: Buffer.from(spkiB64, 'base64'), format: 'der', type: 'spki' }), dsaEncoding: 'ieee-p1363' }, Buffer.from(String(e.signature || ''), 'base64')); } catch (err) { return false; }
}
export const cmpVer = (a, b) => { const p = s => String(s || '0').split(/[.-]/).slice(0, 3).map(x => parseInt(x, 10) || 0); const x = p(a), y = p(b); for (let i = 0; i < 3; i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) < (y[i] || 0) ? -1 : 1; return 0; };

// ---------- schemas: what each app build understands ----------
// apps[...] = snapshot of a RELEASED build (old app) or the current build. Old snapshots are append-only: never edit a shipped one.
const str = (d = '') => ({ t: 'string', d }), int = (d = 0) => ({ t: 'int', d }), bool = (d = false) => ({ t: 'bool', d }), strs = (d = []) => ({ t: 'strings', d });
export const APPS = {
  '2.0.0': { maxSchema: { today: 1, modules: 1, banner: 1 }, blocks: ['streak', 'goal', 'continue', 'review'] },
  '2.1.0': { maxSchema: { today: 2, modules: 1, banner: 2 }, blocks: ['streak', 'goal', 'continue', 'review', 'word', 'banner'] },
};
export const CURRENT_APP = '2.1.0', SHIPPED_APP = '2.0.0';
const BLOCK = { id: str(), type: str(), titleKey: str(), route: str() };
const BLOCK_EXTRA = { word: { word: str() }, banner: { bannerId: str() }, goal: { target: int(20) } };
const FIELDS = {
  today: { greetingKey: str('home.greeting'), blocks: { t: 'blocks', d: [] }, maxBlocks: int(8) },
  modules: { order: strs(['home', 'vocab', 'skills', 'tests', 'me']), hidden: strs([]) },
  banner: { id: str(), kind: str('info'), titleKey: str(), bodyKey: str(), route: str(), from: int(0), to: int(0), priority: int(0), dismissible: bool(true) },
};
const coerce = (f, v) => {
  if (f.t === 'string') return typeof v === 'string' ? v : f.d;
  if (f.t === 'int') return Number.isInteger(v) ? v : f.d;
  if (f.t === 'bool') return typeof v === 'boolean' ? v : f.d;
  if (f.t === 'strings') return Array.isArray(v) && v.every(x => typeof x === 'string') ? v : f.d;
  return f.d;
};
function model(type, body, app) {
  const out = {}, F = FIELDS[type];
  for (const [k, f] of Object.entries(F)) {
    if (f.t !== 'blocks') { out[k] = coerce(f, body && body[k]); continue; }
    const list = Array.isArray(body && body[k]) ? body[k] : [];
    out[k] = list.filter(b => b && typeof b === 'object' && APPS[app].blocks.includes(b.type)).map(b => {
      const o = {}; for (const [bk, bf] of Object.entries({ ...BLOCK, ...(BLOCK_EXTRA[b.type] || {}) })) o[bk] = coerce(bf, b[bk]); return o;
    });
  }
  if (type === 'today') out.blocks = out.blocks.slice(0, Math.max(0, out.maxBlocks));
  if (type === 'modules') { const known = FIELDS.modules.order.d; const seen = new Set(); out.order = out.order.filter(m => known.includes(m) && !seen.has(m) && seen.add(m)); for (const m of known) if (!seen.has(m)) out.order.push(m); out.hidden = out.hidden.filter(m => known.includes(m) && m !== 'home'); }
  return out;
}
/** Reference reader: (raw JSON text, app version, public key) → { ok, reason?, schemaNewer?, value? } */
export function read(text, app, spkiB64) {
  let e; try { e = JSON.parse(text); } catch (err) { return { ok: false, reason: 'corrupt' }; }
  if (!e || typeof e !== 'object' || e.kind !== KIND) return { ok: false, reason: 'kind' };
  if (!FIELDS[e.type]) return { ok: false, reason: 'type' };
  if (!Number.isInteger(e.schema) || e.schema < 1 || typeof e.minApp !== 'string' || typeof e.version !== 'string' || !e.body || typeof e.body !== 'object') return { ok: false, reason: 'corrupt' };
  if (!verify(e, spkiB64)) return { ok: false, reason: 'badsig' };
  if (cmpVer(e.minApp, app) > 0) return { ok: false, reason: 'minApp' };
  return { ok: true, schemaNewer: e.schema > APPS[app].maxSchema[e.type], value: model(e.type, e.body, app) };
}

// ---------- compat vectors (deterministic: fixed public TEST key, signatures reused while the payload is unchanged) ----------
export function testKey() {
  // TEST-ONLY key derived from a public seed – it signs nothing real; production uses OTA_SIGNING_KEY / LK_OTA_KEY.
  const d = crypto.createHash('sha256').update('lexkite-compat-vectors-test-key-not-secret').digest();
  const ecdh = crypto.createECDH('prime256v1'); ecdh.setPrivateKey(d); const pub = ecdh.getPublicKey();
  const b = x => Buffer.from(x).toString('base64url');
  const priv = crypto.createPrivateKey({ key: { kty: 'EC', crv: 'P-256', d: b(d), x: b(pub.subarray(1, 33)), y: b(pub.subarray(33)) }, format: 'jwk' });
  return { privatePem: priv.export({ type: 'pkcs8', format: 'pem' }), spki: crypto.createPublicKey(priv).export({ type: 'spki', format: 'der' }).toString('base64') };
}
export function compatVectors(prev) {
  const K = testKey(), old = new Map(((prev && prev.cases) || []).map(c => [c.name, c.doc]));
  const env = (type, schema, minApp, version, body) => ({ kind: KIND, type, schema, minApp, version, body });
  const memo = new Map();
  const signed = (name, e) => memo.get(name + '\n' + canon(e)) || memo.set(name + '\n' + canon(e), signed0(name, e)).get(name + '\n' + canon(e));
  const signed0 = (name, e) => { // reuse the previous signature when it still verifies the same payload (ECDSA signatures are randomised)
    let p = null; try { p = JSON.parse(old.get(name)); } catch (err) { /* new case */ }
    const s = p && canon(p) === canon(e) && verify({ ...e, signature: p.signature }, K.spki) ? p.signature : sign(e, K.privatePem);
    return { ...e, signature: s };
  };
  const t1 = { greetingKey: 'home.greeting', blocks: [{ id: 'b1', type: 'streak' }, { id: 'b2', type: 'goal', target: 30 }, { id: 'b3', type: 'continue', route: 'lesson/ngsl1.1' }, { id: 'b4', type: 'review', titleKey: 'home.review' }] };
  const t2 = { ...t1, maxBlocks: 6, blocks: [...t1.blocks, { id: 'b5', type: 'word', word: 'curriculum' }, { id: 'b6', type: 'banner', bannerId: 'spring' }], layout: 'v2' };
  const t3 = { ...t2, blocks: [...t2.blocks, { id: 'b7', type: 'video_carousel', items: [1, 2] }, { id: 'b8', type: 'goal', target: 'thirty' }], newField: { x: 1 } };
  const ban = { id: 'spring', kind: 'event', titleKey: 'banner.spring.title', bodyKey: 'banner.spring.body', route: 'path', from: 1772323200000, to: 1773532800000, priority: 2 };
  const C = [];
  const add = (group, name, raw, apps) => C.push({ group, name, raw, apps });
  const J = e => JSON.stringify(e);
  // new app reads old JSON
  add('new-reads-old', 'today schema 1 (shipped format)', J(signed('today schema 1 (shipped format)', env('today', 1, '2.0.0', 't1', t1))), [CURRENT_APP]);
  add('new-reads-old', 'today schema 1 missing optional fields', J(signed('today schema 1 missing optional fields', env('today', 1, '2.0.0', 't1b', { blocks: [{ type: 'streak' }] }))), [CURRENT_APP]);
  add('new-reads-old', 'modules schema 1 partial order', J(signed('modules schema 1 partial order', env('modules', 1, '2.0.0', 'm1', { order: ['me', 'vocab'] }))), [CURRENT_APP]);
  add('new-reads-old', 'banner schema 1', J(signed('banner schema 1', env('banner', 1, '2.0.0', 'bn1', { id: 'old', titleKey: 'banner.old' }))), [CURRENT_APP]);
  // old (shipped) app reads new JSON
  add('old-reads-new', 'today schema 2: new block types skipped', J(signed('today schema 2: new block types skipped', env('today', 2, '2.0.0', 't2', t2))), [SHIPPED_APP, CURRENT_APP]);
  add('old-reads-new', 'today schema 3: unknown fields/components, wrong types → defaults', J(signed('today schema 3: unknown fields/components, wrong types → defaults', env('today', 3, '2.0.0', 't3', t3))), [SHIPPED_APP, CURRENT_APP]);
  add('old-reads-new', 'modules: unknown module + duplicates + hidden home', J(signed('modules: unknown module + duplicates + hidden home', env('modules', 2, '2.0.0', 'm2', { order: ['tests', 'arcade', 'tests', 'home'], hidden: ['home', 'me', 'arcade'] }))), [SHIPPED_APP, CURRENT_APP]);
  add('old-reads-new', 'banner schema 2 with extra fields', J(signed('banner schema 2 with extra fields', env('banner', 2, '2.0.0', 'bn2', { ...ban, animation: 'confetti', priority: 'high' }))), [SHIPPED_APP, CURRENT_APP]);
  add('old-reads-new', 'minApp newer than the app → rejected', J(signed('minApp newer than the app → rejected', env('today', 2, '2.1.0', 't2m', t2))), [SHIPPED_APP, CURRENT_APP]);
  // tampering / broken input – both apps
  const good = signed('today schema 1 (shipped format)', env('today', 1, '2.0.0', 't1', t1));
  add('old-reads-new', 'bad signature (body changed after signing)', J({ ...good, body: { ...good.body, greetingKey: 'evil' } }), [SHIPPED_APP, CURRENT_APP]);
  add('old-reads-new', 'bad signature (minApp changed after signing)', J({ ...good, minApp: '1.0.0' }), [SHIPPED_APP, CURRENT_APP]);
  add('old-reads-new', 'missing signature', J({ ...good, signature: undefined }), [SHIPPED_APP, CURRENT_APP]);
  add('old-reads-new', 'signature from another key', J({ ...good, signature: sign(good, crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' }).privateKey.export({ type: 'pkcs8', format: 'pem' })) }), [SHIPPED_APP, CURRENT_APP]);
  add('old-reads-new', 'truncated JSON', J(good).slice(0, 60), [SHIPPED_APP, CURRENT_APP]);
  add('old-reads-new', 'unknown type', J(signed('unknown type', { ...env('today', 1, '2.0.0', 'x', t1), type: 'quiz' })), [SHIPPED_APP, CURRENT_APP]);
  add('old-reads-new', 'unknown kind (executable payload refused)', J({ kind: 'lexkite-code', type: 'today', schema: 1, minApp: '2.0.0', version: 'js', body: { js: 'alert(1)' }, signature: '' }), [SHIPPED_APP, CURRENT_APP]);
  const cases = [];
  for (const c of C) for (const app of c.apps) {
    let raw = c.raw;
    // the "another key" signature is random: keep the previous one if it still fails to verify with the test key
    if (c.name === 'signature from another key') { const p = (prev && prev.cases || []).find(x => x.name === c.name); if (p) raw = p.doc; }
    cases.push({ group: c.group, name: c.name, app, doc: raw, expect: read(raw, app, K.spki) });
  }
  return { v: 1, _doc: 'GENERATED by scripts/native/gen.mjs from scripts/native/content-schema.mjs (reference reader). doc = raw JSON text served by the CDN; app = build version reading it (apps = snapshots of what each build understands); expect = reader result { ok, reason: corrupt|kind|type|badsig|minApp, schemaNewer, value }. Signature: ECDSA P-256/SHA-256 raw r||s base64 over canon (see contract) – same scheme as web OTA; vectors use the public TEST key below, production uses web/js/ota-key.js.', testKeySpki: K.spki, canon: '["lexkite-content-v1", type, schema, minApp, version, sha256hex(stableJSON(body))].join("\\n")', apps: APPS, fields: FIELDS, blockFields: { common: BLOCK, extra: BLOCK_EXTRA }, cases };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [cmd, type, file] = process.argv.slice(2), arg = k => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : ''; };
  if (cmd !== 'sign' || !FIELDS[type] || !file) { console.error('dùng: content-schema.mjs sign <today|modules|banner> <body.json> --schema N --min-app x.y.z --version v'); process.exit(2); }
  const key = process.env.OTA_SIGNING_KEY; if (!key) { console.error('✗ thiếu secret OTA_SIGNING_KEY (chỉ chạy trên CI)'); process.exit(1); }
  const e = { kind: KIND, type, schema: +arg('schema') || 1, minApp: arg('min-app') || '2.0.0', version: arg('version') || new Date().toISOString(), body: JSON.parse(fs.readFileSync(file, 'utf8')) };
  const out = { ...e, signature: sign(e, decodeKey(key)) };
  const pub = (fs.readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../web/js/ota-key.js'), 'utf8').match(/LK_OTA_KEY = '([^']*)'/) || [])[1];
  if (!pub || !verify(out, pub)) { console.error('✗ chữ ký không khớp khóa công khai web/js/ota-key.js'); process.exit(1); }
  process.stdout.write(JSON.stringify(out) + '\n');
}
