// Cổng ASR audio câu (docs/WORD-AUDIO.md mục "Audio câu", sentence-audio-asr.yml): dữ liệu chỉ mục hợp lệ, khóa -s2 trỏ đúng, ngưỡng không bị nới.
import fs from 'node:fs'; import vm from 'node:vm';
import { readIndex, readLedger, LEDGER, FAIL, STATS, S2 } from '../sentence-audio/lib.mjs';
const errs = [], ok = (c, m) => c || errs.push(m);
const { have, s2 } = readIndex(), led = readLedger();
// 1) chỉ mục: mọi khóa s2 đều có file gốc và ghi "s2" trong sổ; sổ chỉ có ok|s2|fail, khóa base36 thuộc LISTEN_AUDIO
for (const k of s2) { ok(have.has(k), `${k}: -s2 nhưng không có trong LISTEN_AUDIO`); ok(led.get(k) === 's2', `${k}: -s2 nhưng sổ ghi "${led.get(k)}"`); }
for (const [k, v] of led) { ok(/^[0-9a-z]+$/.test(k) && have.has(k), `${LEDGER}: khóa lạ ${k}`); ok(['ok', 's2', 'fail'].includes(v), `${LEDGER}: ${k} trạng thái lạ "${v}"`); if (v === 's2') ok(s2.has(k), `${k}: sổ ghi s2 nhưng thiếu trong LISTEN_AUDIO_S2`); }
// 2) danh sách trượt công khai: đúng các khóa "fail", có giọng, lý do, câu; câu trượt KHÔNG được trỏ sang -s2 (app phát bản cũ)
const fl = fs.readFileSync(FAIL, 'utf8').split('\n').filter(Boolean); ok(/^khóa\tgiọng\t/.test(fl[0] || ''), `${FAIL}: thiếu dòng tiêu đề`);
const fk = new Set(fl.slice(1).map(l => { const c = l.split('\t'); ok(c.length === 4 && c.every(Boolean), `${FAIL}: dòng thiếu cột: ${l.slice(0, 80)}`); return c[0]; }));
for (const [k, v] of led) if (v === 'fail') ok(fk.has(k) && !s2.has(k), `${k}: trượt nhưng thiếu trong ${FAIL} hoặc bị trỏ -s2`);
for (const k of fk) ok(led.get(k) === 'fail', `${FAIL}: ${k} không phải "fail" trong sổ`);
// 3) số liệu khớp sổ
const S = JSON.parse(fs.readFileSync(STATS, 'utf8')), cnt = x => [...led.values()].filter(v => v === x).length;
ok(S.checked === led.size && S.oldOk === cnt('ok') && S.s2 === cnt('s2') && S.fail === cnt('fail') && S.checked <= S.total, `${STATS} lệch sổ ${LEDGER}`);
// 4) app: audioUrl (web/js/ui.js) trỏ khóa s2 sang <khóa>-s2.mp3, khóa khác giữ nguyên
const ui = fs.readFileSync('web/js/ui.js', 'utf8'), line = ui.split('\n').find(l => /g\.audioUrl = k =>/.test(l)) || '';
const g = { LISTEN_AUDIO_S2: new Set(['abc']) }; vm.runInNewContext(`let cdnFail = 0; const AUDIO_BASES = ['B/']; ${line}`, { g });
ok(g.audioUrl && g.audioUrl('abc') === `B/abc${S2}.mp3` && g.audioUrl('xyz') === 'B/xyz.mp3', `web/js/ui.js audioUrl không trỏ khóa s2 sang "${S2}.mp3"`);
// 5) ngưỡng: hằng WER_MAX trong scripts/sentence-asr.py khớp tài liệu (≤ 10 %) – chỉ được siết
const py = fs.readFileSync('scripts/sentence-asr.py', 'utf8'), w = +((py.match(/^WER_MAX = ([0-9.]+)/m) || [])[1]);
ok(w > 0 && w <= 0.10, `scripts/sentence-asr.py WER_MAX = ${w} – không được nới quá 0.10`);
ok(/WER ≤ 10 %/.test(fs.readFileSync('docs/WORD-AUDIO.md', 'utf8')), 'docs/WORD-AUDIO.md phải ghi ngưỡng "WER ≤ 10 %"');
if (errs.length) { console.error('✗ sentence-asr:\n  ' + errs.slice(0, 20).join('\n  ')); process.exit(1); }
console.log(`✓ sentence-asr: ${led.size} câu đã kiểm · ${s2.size} khóa -s2 · ${fk.size} câu trượt có lý do`);
