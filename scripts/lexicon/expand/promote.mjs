#!/usr/bin/env node
// Xuất 1 lô mở rộng sau khi SOÁT MẪU (docs/CONTENT-QA.md lớp 6: ≥ 5 % mục, sai > 2 % → loại cả lô).
//   node scripts/lexicon/expand/promote.mjs <lô> --checked <checked.json>   (checked = [{ id: "từ#loại", ok: true|false, note }])
//   node scripts/lexicon/expand/promote.mjs <lô> --sample 25                 in mẫu ngẫu nhiên tất định để soát
// Đạt → content/lexicon/expand/<lô>.json + content/qa/batches/lx-<lô>.json (status published). Loại → status rejected, mục vào hàng duyệt, không xuất.
import fs from 'fs';
import crypto from 'crypto';
import { ROOT, rd, wr } from '../lib.mjs';
import { spot } from '../../content-qa/lib.mjs';
import { QUEUE } from './lib.mjs';
const [id] = process.argv.slice(2), arg = n => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null; };
const PEND = `content/lexicon/expand/pending/${id}.json`, P = JSON.parse(rd(PEND)), keys = Object.keys(P.items);
if (arg('--sample')) { const s = keys.slice().sort((a, b) => crypto.createHash('sha1').update(id + a).digest('hex') < crypto.createHash('sha1').update(id + b).digest('hex') ? -1 : 1).slice(0, +arg('--sample')); console.log(JSON.stringify(s.map(k => ({ k, ...P.items[k], qa: undefined, src: undefined })), null, 1)); process.exit(0); }
const checked = JSON.parse(fs.readFileSync(arg('--checked'), 'utf8')), b = { id, source: 'lexicon-expand', n: keys.length, checked, at: new Date().toISOString().slice(0, 10) };
const s = spot(b); b.status = s.ok ? 'published' : 'rejected'; if (!s.ok) b.why = s.why;
fs.mkdirSync(new URL('content/qa/batches/', ROOT), { recursive: true });
wr(`content/qa/batches/lx-${id}.json`, JSON.stringify(b, null, 1) + '\n');
const bad = new Set(checked.filter(x => !x.ok).map(x => x.id));
if (s.ok) {
  const q = JSON.parse(rd(QUEUE));
  for (const k of bad) { q.items.push({ src: 'lexicon-expand', id: k, batch: id, why: ['soát mẫu: ' + (checked.find(x => x.id === k).note || 'sai')], at: b.at, data: P.items[k] }); delete P.items[k]; }
  P.n = Object.keys(P.items).length; wr(QUEUE, JSON.stringify(q, null, 1) + '\n');
  wr(`content/lexicon/expand/${id}.json`, rd(PEND).length && JSON.stringify(P).replace(/,"(?=[^"]+#(n|v|adj|adv)":)/g, ',\n"') + '\n'); fs.unlinkSync(new URL(PEND, ROOT));
}
console.log(`${s.ok ? '✓ xuất' : '✗ loại'} lô ${id}: ${keys.length} mục · soát ${checked.length} · sai ${bad.size}${s.ok ? '' : ' – ' + s.why}`);
