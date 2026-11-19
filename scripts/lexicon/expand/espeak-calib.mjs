#!/usr/bin/env node
// Hiệu chuẩn IPA Anh espeak-ng so với Wiktionary (docs/LEXICON.md §Mở rộng 20k): ~N từ của kho có IPA Anh Wiktionary.
//   ESPEAK_PY=<python có espeakng-loader> node scripts/lexicon/expand/espeak-calib.mjs [--n 300] [--out reports/espeak-calib.json]
// Đạt khi khớp gần (lệch ≤ 1 âm vị) ≥ 90 % → job.mjs mới dùng espeak cho từ thiếu IPA Anh.
import fs from 'fs';
import crypto from 'crypto';
import { loadAll } from '../lib.mjs';
import { kaikki, clean, pmap } from './wikt.mjs';
import { espeakUK, compare, ACCEPT } from './espeak.mjs';
const arg = (n, d) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; };
const N = +arg('--n', 300), OUT = arg('--out', '');
const P = { n: 'n', noun: 'n', v: 'v', verb: 'v', adj: 'adj', adjective: 'adj', adv: 'adv', adverb: 'adv' };
const seen = new Set(), all = [];
for (const { row } of loadAll()) { const w = row[0]; if (!/^[a-z]{3,}$/.test(w) || seen.has(w)) continue; seen.add(w); all.push({ w, pos: P[String(row[2]).split(/[ ,/]/)[0]] || 'n' }); }
const h = w => crypto.createHash('sha1').update('calib' + w).digest('hex');
const sample = all.sort((a, b) => h(a.w) < h(b.w) ? -1 : 1).slice(0, Math.round(N * 1.7));
const wk = await pmap(sample, 6, async e => clean((await kaikki(e.w, e.pos)).uk));
const have = sample.map((e, i) => ({ ...e, wk: wk[i] })).filter(e => e.wk).slice(0, N);
const es = espeakUK(have.map(e => e.w));
let exact = 0, near = 0; const miss = [];
for (const e of have) { const c = compare(es[e.w], e.wk); exact += c.exact; near += c.near; if (!c.near) miss.push(`${e.w} wk ${e.wk} es ${es[e.w]} (d${c.d})`); }
const rep = { n: have.length, exact: +(exact / have.length).toFixed(3), near: +(near / have.length).toFixed(3), accept: ACCEPT, ok: near / have.length >= ACCEPT, miss: miss.slice(0, 60) };
if (OUT) fs.writeFileSync(OUT, JSON.stringify(rep, null, 1));
console.log(JSON.stringify({ ...rep, miss: rep.miss.slice(0, 40) }, null, 1));
