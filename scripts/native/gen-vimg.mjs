/* Native M2 – lesson picture (P03 "pic") conformance vectors. Reference = the REAL web/js/vocab-img.js (VImg v3: small head
 * js/lexicon-img.json {v:3, base, sv, on, n} + n shards js/vimg/NN.json chosen by FNV-1a(word) % n), run in node:vm with fetch served
 * from the repo's own web/js files. Native apps fetch the same head + shard from https://lexkite.com/js/… (cached), then
 * image = base + hash + '.webp'. Rules carried by the vector: exact word#pos (no other part of speech), scene images (s) need an
 * example sentence, dark mode hides cream-background images (a = false). Exports vimgVectors() → vectors/vimg.json.
 * DATA IS A FIXED FIXTURE (not web/js/vimg/*): the image bots add shards every few hours and commit straight to main ([skip ci]), which made
 * `gen.mjs --check` drift on every PR (09/11, cpack PR #951). The vector tests the LOGIC (key/pos/shard/mode/scene/dark rules) of the real
 * vocab-img.js on a deterministic head + shards derived from the word list; native apps fetch the live head/shards at run time. */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const R = p => path.join(ROOT, p);

export async function vimgVectors(words) {
  const FIX_HEAD = { v: 3, base: 'https://media.lexkite.com/vimg/', sv: 's1', on: true, n: 64 }, fixShards = {};
  const fetchLocal = async u => {
    const rel = new URL(u).pathname.replace(/^.*?\/js\//, 'js/'); // app pages load js/… (web/app/js = web/js on Pages)
    const m = /^js\/vimg\/(\d\d)\.json$/.exec(rel), j = rel === 'js/lexicon-img.json' ? FIX_HEAD : (m ? fixShards[+m[1]] || {} : null);
    return j ? { ok: true, json: async () => j } : { ok: false, json: async () => null };
  };
  const store = {};
  const sb = { console, URL, Promise, Math, fetch: fetchLocal, navigator: {}, location: { href: 'https://lexkite.com/' },
    localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } }, setTimeout };
  sb.self = sb; sb.globalThis = sb; vm.createContext(sb);
  vm.runInContext(fs.readFileSync(R('web/js/vocab-img.js'), 'utf8'), sb, { filename: 'web/js/vocab-img.js' });
  const V = sb.VImg;
  const head = FIX_HEAD;
  const real = JSON.parse(fs.readFileSync(R('web/js/lexicon-img.json'), 'utf8'));
  if (real.v !== 3 || !real.n) throw new Error('gen-vimg: expected the v3 image index head'); // the format the fixture mirrors
  // staged rollout: the REAL mode() for each device/config state (1 = on, 0 = off, -1 = rollout → on iff head.on). Native maps
  // Remote Config vocab_img ("on"/"off"/"") + vocab_img_pct + a fixed per-device bucket to the same inputs (lk.vimg / lk.vimg.adm = web-only test overrides).
  const modeCases = [];
  for (const [v, pct, b] of [[undefined, undefined, 0], [undefined, undefined, 9], [undefined, undefined, 10], [undefined, undefined, 99], [undefined, 50, 49], [undefined, 50, 50],
    [undefined, 0, 0], [undefined, 100, 99], [true, undefined, 99], ['1', undefined, 99], [false, undefined, 0], ['0', 100, 0]]) {
    for (const k of Object.keys(store)) delete store[k];
    store['lk.vb'] = String(b); const c = { v: {} }; if (v !== undefined) c.v.vocab_img = v; if (pct !== undefined) c.v.vocab_img_pct = pct; store['lk.cfg'] = JSON.stringify(c);
    modeCases.push({ vocab_img: v === undefined ? null : v, vocab_img_pct: pct === undefined ? null : pct, bucket: b, mode: V.mode() });
  }
  for (const k of Object.keys(store)) delete store[k];
  store['lk.vimg'] = '1'; // lookup vectors: pictures forced on (rollout decided by `mode` above)
  await V.ready([]);
  // shard id: the exact SH of vocab-img.js (sliced from source, not re-typed)
  const shSrc = /const SH = (\(w, n\) => \{[^\n]*?return h % n; \});/.exec(fs.readFileSync(R('web/js/vocab-img.js'), 'utf8'));
  if (!shSrc) throw new Error('gen-vimg: SH not found in web/js/vocab-img.js');
  const SH = vm.runInNewContext('(' + shSrc[1] + ')');
  const posCases = ['n', 'noun', 'Noun', 'danh từ', 'v', 'verb', 'động từ', 'phr v', 'phrasal verb', 'adj', 'adjective', 'tính từ', 'adv', 'trạng từ', 'prep', '', null];
  // fixture shards (deterministic from the word list): ~1/2 of word#pos have a picture (hash = sha1(key)[0..16]), 1/5 of those are scenes, 2/3 transparent
  const shards = fixShards, h1 = k => crypto.createHash('sha1').update(k).digest();
  for (const [w, p] of words) { const k = V.key(w, p), d = h1(k); if (d[0] % 2) continue; const sh = SH(w.trim(), head.n), s = shards[sh] || (shards[sh] = { m: {}, s: [], a: [] });
    s.m[k] = d.toString('hex').slice(0, 16); if (d[1] % 5 === 0) s.s.push(k); if (d[2] % 3) s.a.push(k); }
  const cases = [];
  for (const [w, p] of words) {
    const k = V.key(w, p), sh = SH(w.trim(), head.n), s = shards[sh] || {};
    const got = await V.get(w, p, '');
    cases.push({ word: w, pos: p, key: k, shard: sh, hash: (s.m || {})[k] || null, url: got ? got.url : null, url2x: got && got.url2x ? got.url2x : null,
      scene: (s.s || []).includes(k), a: (s.a || []).includes(k) });
  }
  return {
    _doc: 'Reference outputs of the REAL web/js/vocab-img.js (VImg v3) – see the header of scripts/native/gen-vimg.mjs. head = js/lexicon-img.json; shard file = js/vimg/<shard 2 digits>.json; url = base + m[key] + ".webp"; mode = rollout (see gen-vimg.mjs); scene = needs an example sentence (lesson pic: never shown); a = transparent/photo (shown in dark mode; a=false hidden in dark).',
    head, defaultPct: +/const PCT = (\d+);/.exec(fs.readFileSync(R('web/js/vocab-img.js'), 'utf8'))[1], mode: modeCases, pos: posCases.map(p => ({ in: p, out: V.pos(p) })),
    sh: ['apple', 'Apple', 'café', 'naïve', 'well-being', 'look after', '中文', ''].map(w => ({ w, n: head.n, out: SH(w, head.n) })),
    cases,
  };
}
