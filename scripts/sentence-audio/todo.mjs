// Cổng ASR audio câu – danh sách cần nghe (sentence-audio-asr.yml). Câu = khóa trong audio-index.js ∩ kho câu hiện tại (corpus.mjs),
// chưa có kết quả cuối trong web/audio/l/asr.tsv → tiếp tục được (hết giờ / lỗi: lượt sau làm lại).
//   node scripts/sentence-audio/todo.mjs --count | --shard i/N --limit L --out .sa/todo.json
import fs from 'node:fs'; import { collect } from './corpus.mjs'; import { readIndex, readLedger } from './lib.mjs';
const A = process.argv, opt = (k, d) => { const i = A.indexOf('--' + k); return i > 0 ? A[i + 1] : d; };
const { jobs } = collect(), { have } = readIndex(), led = readLedger();
// thứ tự cố định theo khóa (shard chia theo vị trí) – lượt chạy lại lấy đúng phần còn thiếu
const todo = [...jobs].filter(([k]) => have.has(k) && !led.has(k)).sort((a, b) => (a[0] < b[0] ? -1 : 1));
console.log(`${[...jobs.keys()].filter(k => have.has(k)).length} câu có file · cần nghe ${todo.length} câu`);
if (A.includes('--count')) process.exit(0);
const [si, sn] = opt('shard', '0/1').split('/').map(Number), limit = +opt('limit', 300), out = opt('out', '.sa/todo.json');
const mine = todo.filter((_, i) => i % sn === si).slice(0, limit).map(([key, j]) => ({ key, voice: j.voice, text: j.text }));
fs.mkdirSync(out.replace(/\/[^/]*$/, ''), { recursive: true }); fs.writeFileSync(out, JSON.stringify(mine));
console.log(`shard ${si}/${sn}: ${mine.length} câu → ${out}`);
