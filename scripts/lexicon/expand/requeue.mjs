#!/usr/bin/env node
// Đưa mục lexicon-expand từ hàng duyệt về CHỜ làm lại (content/lexicon/expand/retry/words.json) – docs/LEXICON.md §Mở rộng 20k.
//   node scripts/lexicon/expand/requeue.mjs --gaps              mọi mục có lý do lỗ dữ liệu nguồn (ipa: …) hoặc gen hỏng không dữ liệu (hạ tầng) – không bao giờ được nằm ở hàng duyệt
//   node scripts/lexicon/expand/requeue.mjs --batch <lô>        + mọi mục trượt của lô (trừ keep:false) – sau khi sửa prompt/cổng
//   node scripts/lexicon/expand/requeue.mjs --pos               mục 'keep: từ đã có trong kho với từ loại khác' (trước 31/10 chờ mục đa từ loại) → retry; lũy đẳng, workflow chạy mỗi lượt
//   node scripts/lexicon/expand/requeue.mjs --funnel            MỘT LẦN sau khi sửa gốc nguồn vi/ví dụ: mục chỉ rớt 'dịch vi:' và/hoặc 'ví dụ:' → retry (không đặt vào lượt tự động)
//   node scripts/lexicon/expand/requeue.mjs --pending <lô>      MỌI mục đạt cổng của lô chờ soát (soát mẫu trượt / sinh trước bản sửa) → làm lại; xoá tệp pending
import fs from 'fs';
import { ROOT, rd, wr } from '../lib.mjs';
import { QUEUE, doneWords, hasGap, OTHER_POS } from './lib.mjs';
const arg = n => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null; };
const GAPS = process.argv.includes('--gaps'), POS = process.argv.includes('--pos'), FUNNEL = process.argv.includes('--funnel'), BATCH = arg('--batch');
const RETRY = 'content/lexicon/expand/retry/words.json';
const q = JSON.parse(rd(QUEUE)), retry = fs.existsSync(new URL(RETRY, ROOT)) ? JSON.parse(rd(RETRY)) : { _doc: 'Từ làm lại ở lượt kế (lỗ dữ liệu nguồn – không vào hàng duyệt). job.mjs tự thêm/bớt.', items: [] };
// --funnel (MỘT LẦN sau khi sửa gốc nguồn – 31/10 Wiktionary tiếng Việt + câu Wiktionary theo nghĩa khoá): mục CHỈ rớt vì vi và/hoặc thiếu câu người viết → làm lại; KHÔNG để trong lệnh mỗi lượt (trượt lại = lặp vô hạn)
const FUNNEL_RE = x => (x.why || []).length > 0 && (x.why || []).every(y => /^(dịch vi|ví dụ):/.test(y));
const move = x => x.src === 'lexicon-expand' && ((GAPS && (hasGap({ ok: false, why: x.why || [] }) || (/^gen:/.test((x.why || [])[0] || '') && !x.data))) || (BATCH && x.batch === BATCH && !/^keep:/.test((x.why || [])[0] || '')) || (POS && OTHER_POS.test((x.why || [])[0] || '')) || (FUNNEL && FUNNEL_RE(x)));
// khoá trùng = từ#loại (31/10): crush#n có trong kho, crush#v vẫn làm được → chỉ chặn ĐÚNG mục đã xuất/chờ soát (test retry ∩ doneWords = ∅)
const DONE = doneWords(), moveOk = x => move(x) && !DONE.has(String(x.id));
const out = q.items.filter(moveOk);
const PEND = arg('--pending') && `content/lexicon/expand/pending/${arg('--pending')}.json`;
if (PEND && fs.existsSync(new URL(PEND, ROOT))) { out.push(...Object.keys(JSON.parse(rd(PEND)).items).filter(id => !DONE.has(id)).map(id => ({ id }))); fs.unlinkSync(new URL(PEND, ROOT)); }
q.items = q.items.filter(x => !move(x)); // mục lỗ nguồn ĐÃ xuất/chờ soát ở lô khác (31/10: underwear#n, exceptionally#adv) = bản cũ thừa → bỏ khỏi hàng duyệt, không làm lại
retry.items = [...new Set([...retry.items, ...out.map(x => x.id)])].sort();
wr(QUEUE, JSON.stringify(q, null, 1) + '\n');
fs.mkdirSync(new URL('content/lexicon/expand/retry/', ROOT), { recursive: true }); wr(RETRY, JSON.stringify(retry, null, 1) + '\n');
console.log(`✓ requeue: ${out.length} mục → ${RETRY} (${out.filter(x => (x.why || []).some(y => /^ipa/.test(y))).length} lỗ IPA) · hàng duyệt còn ${q.items.filter(x => x.src === 'lexicon-expand').length} mục lexicon-expand`);
