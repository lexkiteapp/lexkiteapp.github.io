#!/usr/bin/env node
// Đưa mục lexicon-expand từ hàng duyệt về CHỜ làm lại (content/lexicon/expand/retry/words.json) – docs/LEXICON.md §Mở rộng 20k.
//   node scripts/lexicon/expand/requeue.mjs --gaps              mọi mục có lý do lỗ dữ liệu nguồn (ipa: …) hoặc gen hỏng không dữ liệu (hạ tầng) – không bao giờ được nằm ở hàng duyệt
//   node scripts/lexicon/expand/requeue.mjs --batch <lô>        + mọi mục trượt của lô (trừ keep:false) – sau khi sửa prompt/cổng
//   node scripts/lexicon/expand/requeue.mjs --pending <lô>      MỌI mục đạt cổng của lô chờ soát (soát mẫu trượt / sinh trước bản sửa) → làm lại; xoá tệp pending
import fs from 'fs';
import { ROOT, rd, wr } from '../lib.mjs';
import { QUEUE } from './lib.mjs';
const arg = n => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null; };
const GAPS = process.argv.includes('--gaps'), BATCH = arg('--batch');
const RETRY = 'content/lexicon/expand/retry/words.json';
const q = JSON.parse(rd(QUEUE)), retry = fs.existsSync(new URL(RETRY, ROOT)) ? JSON.parse(rd(RETRY)) : { _doc: 'Từ làm lại ở lượt kế (lỗ dữ liệu nguồn – không vào hàng duyệt). job.mjs tự thêm/bớt.', items: [] };
const move = x => x.src === 'lexicon-expand' && ((GAPS && ((x.why || []).some(y => /^ipa[ :]/.test(y)) || (/^gen:/.test((x.why || [])[0] || '') && !x.data))) || (BATCH && x.batch === BATCH && !/^keep:/.test((x.why || [])[0] || '')));
const out = q.items.filter(move);
const PEND = arg('--pending') && `content/lexicon/expand/pending/${arg('--pending')}.json`;
if (PEND && fs.existsSync(new URL(PEND, ROOT))) { out.push(...Object.keys(JSON.parse(rd(PEND)).items).map(id => ({ id }))); fs.unlinkSync(new URL(PEND, ROOT)); }
q.items = q.items.filter(x => !move(x));
retry.items = [...new Set([...retry.items, ...out.map(x => x.id)])].sort();
wr(QUEUE, JSON.stringify(q, null, 1) + '\n');
fs.mkdirSync(new URL('content/lexicon/expand/retry/', ROOT), { recursive: true }); wr(RETRY, JSON.stringify(retry, null, 1) + '\n');
console.log(`✓ requeue: ${out.length} mục → ${RETRY} (${out.filter(x => (x.why || []).some(y => /^ipa/.test(y))).length} lỗ IPA) · hàng duyệt còn ${q.items.filter(x => x.src === 'lexicon-expand').length} mục lexicon-expand`);
