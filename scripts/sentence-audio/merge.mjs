// Gộp kết quả cổng ASR audio câu của các shard (sentence-audio-asr.yml) → web/audio/l/asr.tsv, asr-fail.tsv, asr-stats.json
// và LISTEN_AUDIO_S2 trong web/js/listen/audio-index.js (app tải <khóa>-s2.mp3). Chỉ ghi câu đã có kết quả CUỐI ("pending" → lượt sau làm lại).
//   node scripts/sentence-audio/merge.mjs <res1.json> [res2.json …]
// Chạy SAU khi scripts/media/push.mjs đẩy xong mp3 -s2 (đẩy lỗi → workflow dừng, app không trỏ tới tệp chưa có).
import fs from 'node:fs'; import { collect } from './corpus.mjs';
import { readIndex, writeIndex, readLedger, LEDGER, FAIL, STATS } from './lib.mjs';
const res = Object.assign({}, ...process.argv.slice(2).filter(f => fs.existsSync(f)).map(f => JSON.parse(fs.readFileSync(f, 'utf8'))));
const { jobs } = collect(), { have, s2 } = readIndex(), led = readLedger(), clean = s => String(s).replace(/[\t\n]+/g, ' ').slice(0, 400);
const fails = new Map((fs.existsSync(FAIL) ? fs.readFileSync(FAIL, 'utf8') : '').split('\n').slice(1).filter(Boolean).map(l => [l.split('\t')[0], l]));
const run = { ok: 0, s2: 0, fail: 0 };
for (const [k, v] of Object.entries(res)) {
  if (led.has(k) || !have.has(k) || !jobs.has(k) || String(v).startsWith('pending')) continue;
  const st = v === 'ok' ? 'ok' : v === 's2' ? 's2' : 'fail'; led.set(k, st); run[st]++;
  if (st === 's2') s2.add(k);
  if (st === 'fail') { const j = jobs.get(k); fails.set(k, [k, j.voice, clean(v), clean(j.text)].join('\t')); }
}
fs.mkdirSync(LEDGER.replace(/\/[^/]*$/, ''), { recursive: true });
fs.writeFileSync(LEDGER, [...led].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(x => x.join('\t')).join('\n') + '\n');
fs.writeFileSync(FAIL, 'khóa\tgiọng\tlý do (Whisper nghe được, WER)\tcâu\n' + [...fails.keys()].sort().map(k => fails.get(k)).join('\n') + (fails.size ? '\n' : ''));
writeIndex(have, s2);
const all = [...led.values()], c = x => all.filter(v => v === x).length, total = [...jobs.keys()].filter(k => have.has(k)).length;
const S = { checked: led.size, total, oldOk: c('ok'), s2: c('s2'), fail: c('fail'), passPct: led.size ? +(100 * (c('ok') + c('s2')) / led.size).toFixed(2) : 0, oldPassPct: led.size ? +(100 * c('ok') / led.size).toFixed(2) : 0 };
fs.writeFileSync(STATS, JSON.stringify(S) + '\n');
const n = run.ok + run.s2 + run.fail, pct = x => (n ? (100 * x / n).toFixed(1) : '0') + '%';
const md = `## Cổng ASR audio câu: +${n} câu (${S.checked}/${total} đã kiểm)
- Lượt này: bản cũ đạt ${run.ok} (${pct(run.ok)}) · render lại đạt (-s2, 64 kbps) ${run.s2} · vẫn trượt (giữ bản cũ, asr-fail.tsv) ${run.fail} → đạt ${pct(run.ok + run.s2)}
- Cộng dồn: bản cũ đạt ${S.oldPassPct}% · sau render lại ${S.passPct}% · trượt ${S.fail}`;
console.log(md);
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md + '\n');
