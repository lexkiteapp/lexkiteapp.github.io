// Độ phủ giọng Kokoro dựng sẵn (audio.lexkite.com) theo từng chỗ phát âm trong app – 0 credit, chỉ đọc repo (docs/TTS-AB.md §Độ phủ).
//   node scripts/tts-ab/coverage.mjs [--out .tts-ab/coverage.json]
// Phần trăm = số chuỗi app sẽ phát mà CÓ file dựng sẵn đúng khóa (cùng quy tắc với web/js/ui.js: audio/w theo fnv(giọng|từ|s3) + web/audio/w/s3.tsv;
// audio/l theo KVoice.lineKey(giọng, chữ) – cả câu, hoặc MỌI câu con sau splitSentences) / tổng chuỗi. Phần còn lại rơi về speechSynthesis của máy.
import fs from 'node:fs'; import vm from 'node:vm';
import { readIndex } from '../sentence-audio/lib.mjs'; import { collect } from '../sentence-audio/corpus.mjs'; import { loadBrowserIndex } from '../lexicon/shards.mjs';
const oi = process.argv.indexOf('--out'), OUT = oi > 0 ? process.argv[oi + 1] : '.tts-ab/coverage.json';
const c = { self: {} }; c.self = c; vm.createContext(c); vm.runInContext(fs.readFileSync('web/js/listen/kvoice.js', 'utf8'), c);
const { lineKey, split } = c.KVoice, { have, s2 } = readIndex();
const fail = new Set(fs.readFileSync('web/audio/l/asr-fail.tsv', 'utf8').split('\n').slice(1).map(l => l.split('\t')[0]).filter(Boolean));
// audio/l: phát dựng sẵn khi khóa cả câu có, hoặc mọi câu con đều có (ui.js UI.tts); câu trượt cổng ASR vẫn phát bản cũ → tính riêng
const lHit = (voice, text) => { const k = lineKey(voice, text); if (have.has(k)) return [k]; const ks = split(text).map(s => lineKey(voice, s)); return ks.length && ks.every(x => have.has(x)) ? ks : null; };
const pct = (a, b) => (b ? +(100 * a / b).toFixed(1) : null);
const R = {};
// 1) Từ đơn (UI.speak → audio/w): s3.tsv = từ \t bf_emma \t af_heart (scripts/word-audio/*); app không kiểm theo giọng → giọng trượt = 404 → speechSynthesis
const { INDEX } = loadBrowserIndex(), words = Object.keys(INDEX);
const s3 = new Map(fs.readFileSync('web/audio/w/s3.tsv', 'utf8').split('\n').filter(Boolean).map(l => { const [w, uk, us] = l.split('\t'); return [w, { uk: uk === 'ok', us: us === 'ok' }]; }));
const wUS = words.filter(w => (s3.get(w) || {}).us).length, wUK = words.filter(w => (s3.get(w) || {}).uk).length;
R.words = { total: words.length, us_af_heart: pct(wUS, words.length), uk_bf_emma: pct(wUK, words.length), note: 'mục tiêu 20k từ; phần chưa có mục từ không tính' };
// 2) Câu ví dụ (UI.speak câu → UI.tts giọng af_heart / bf_emma theo giọng Mỹ/Anh); rảnh tay + phản xạ dùng bf_emma
const ex = words.map(w => INDEX[w].ex).filter(x => typeof x === 'string' && x.trim());
const exUS = ex.filter(t => lHit('af_heart', t)).length, exUK = ex.filter(t => lHit('bf_emma', t)).length;
R.examples = { total: ex.length, us_af_heart: pct(exUS, ex.length), uk_bf_emma: pct(exUK, ex.length) };
// 3) Rảnh tay – từ đọc bằng audio/l bf_emma (handsfree.js), không phải audio/w
const hf = words.filter(w => have.has(lineKey('bf_emma', w))).length; R.handsfree_word = { total: words.length, bf_emma: pct(hf, words.length) };
// 4) Kho câu dựng sẵn (listening IELTS/TOEIC/TOEFL, mock, reading, speaking, call, stories…) – collect() là mẫu số
const { jobs } = collect(); let jh = 0, jf = 0; for (const [k] of jobs) { if (have.has(k)) jh++; if (fail.has(k)) jf++; }
R.corpus = { total: jobs.size, prebuilt: pct(jh, jobs.size), asr_fail_kept_old: pct(jf, jobs.size), s2_rerendered: s2.size };
// 5) Phần đọc động (không có trong kho dựng sẵn → engine đọc động / giọng máy): khai báo theo chỗ gọi, có cổng npm test (scripts/audio/tts-sites.json)
R.device_only = Object.entries(JSON.parse(fs.readFileSync('scripts/audio/tts-sites.json', 'utf8')).sites).filter(([, x]) => x.dynamic).map(([f, x]) => `${f}: ${x.dynamic}`);
fs.mkdirSync(OUT.replace(/\/[^/]+$/, ''), { recursive: true }); fs.writeFileSync(OUT, JSON.stringify(R, null, 1));
const L = ['## Độ phủ giọng dựng sẵn (Kokoro, audio.lexkite.com)', '| chỗ phát | tổng | có file dựng sẵn |', '|---|---|---|',
  `| Từ đơn (audio/w) | ${R.words.total} | Mỹ ${R.words.us_af_heart}% · Anh ${R.words.uk_bf_emma}% |`,
  `| Câu ví dụ (audio/l) | ${R.examples.total} | Mỹ ${R.examples.us_af_heart}% · Anh ${R.examples.uk_bf_emma}% |`,
  `| Rảnh tay – từ (audio/l bf_emma) | ${R.handsfree_word.total} | ${R.handsfree_word.bf_emma}% |`,
  `| Kho câu (listening, mock, reading, speaking, call, stories) | ${R.corpus.total} | ${R.corpus.prebuilt}% (trượt ASR giữ bản cũ ${R.corpus.asr_fail_kept_old}%) |`,
  '', '**Phần đọc động (chưa dựng sẵn được – engine đọc động, cuối cùng giọng máy):**', ...R.device_only.map(x => '- ' + x)];
console.log(L.join('\n')); if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, L.join('\n') + '\n');
