// Đo nhẹ, chỉ đọc: kho từ vựng EN + ảnh theo nghĩa (docs/research/vocab-top1-2311.md).
//   node scripts/lexicon/vocab-stats.mjs [--json]
import fs from 'fs';
import { rd, key, normPos, loadAll, loadAllPlus } from './lib.mjs';

const rows = (await loadAllPlus()).map(e => e.row);
const keys = new Set(rows.map(key));
const lemmas = new Set(rows.map(r => r[0].toLowerCase()));
const out = { senseKeys: keys.size, lemmas: lemmas.size, baseRows: loadAll().length };
const lv = {}, pos = {};
let ex = 0, col = 0, syn = 0, def = 0, ipa = 0, ipaUS = 0;
for (const r of rows) {
  const L = r[8] || '?'; lv[L] = (lv[L] || 0) + 1;
  const p = normPos(r[2]); pos[p] = (pos[p] || 0) + 1;
  if (r[5]) ex++; if (r[6]) col++; if (r[7]) syn++; if (r[4]) def++; if (r[1]) ipa++; if (r[10]) ipaUS++;
}
Object.assign(out, { level: lv, pos, withExample: ex, withCollocation: col, withSynonym: syn, withDef: def, withIpa: ipa, withIpaUS: ipaUS });

const img = JSON.parse(rd('content/lexicon/img.json')).items;
const ik = Object.keys(img);
const inLex = ik.filter(k => keys.has(k));
const kind = {}, tries = {};
for (const k of ik) { const x = img[k]; kind[x.kind] = (kind[x.kind] || 0) + 1; const t = x.q?.tries || 1; tries[t] = (tries[t] || 0) + 1; }
const noimgPos = {};
for (const r of rows) { const k = key(r); if (!img[k]) { const p = normPos(r[2]); noimgPos[p] = (noimgPos[p] || 0) + 1; } }
Object.assign(out, { img: ik.length, imgInLexicon: inLex.length, imgCoverage: +(inLex.length / keys.size).toFixed(4), imgKind: kind, imgTriesHistogram: tries, firstTryShareOfPublished: +((tries[1] || 0) / ik.length).toFixed(4), noImgByPos: noimgPos });

const aud = new Set(rd('web/audio/w/index.txt').split('\n').filter(Boolean));
let a = 0; for (const l of lemmas) if (aud.has(l)) a++;
Object.assign(out, { audioIndex: aud.size, audioLemmas: a });
console.log(JSON.stringify(out, null, process.argv.includes('--json') ? 0 : 1));
