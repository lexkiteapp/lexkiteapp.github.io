// Chuẩn độ to giọng nói (scripts/audio/norm.mjs) – không dùng ffmpeg, chạy trong npm test:
// hằng số chuẩn KHÔNG được nới (−16 LUFS, ±1 LU, đỉnh ≤ −1 dBTP); đọc đúng kết quả ebur128; phân loại clip; mọi đường ống sinh giọng chuẩn hoá TRƯỚC khi đẩy lên kho media.
import fs from 'node:fs'; import assert from 'node:assert/strict';
import { TARGET_LUFS, MAX_TP, TOL_LU, parseSummary, inSpec } from '../audio/norm.mjs';
import { verdict, summarize } from '../audio/loudness.mjs';
let n = 0; const eq = (a, b, m) => { assert.deepEqual(a, b, m); n++; };
eq([TARGET_LUFS, TOL_LU, MAX_TP], [-16, 1, -1], 'chuẩn −16 LUFS ±1 LU, TP ≤ −1 dBTP không được nới');
const E = `[Parsed_ebur128_0 @ 0x1] t: 1.2 M: -20.0 S:-120.7 I: -19.0 LUFS
[Parsed_ebur128_0 @ 0x1] Summary:

  Integrated loudness:
    I:         -21.3 LUFS
    Threshold: -31.6 LUFS

  Loudness range:
    LRA:         2.4 LU
    Threshold: -41.4 LUFS
    LRA low:   -22.6 LUFS
    LRA high:  -20.2 LUFS

  True peak:
    Peak:       -3.7 dBFS`;
eq(parseSummary(E), { I: -21.3, TP: -3.7, LRA: 2.4 }, 'đọc phần Summary cuối, không lấy số đo tức thời');
eq(parseSummary(E.replace('-21.3', '-inf').replace('-3.7', '-inf')).I, -Infinity);
eq(verdict({ I: -16.9, TP: -1.2 }), 'ok'); eq(verdict({ I: -17.1, TP: -3 }), 'off'); eq(verdict({ I: -14.9, TP: -3 }), 'off');
eq(verdict({ I: -16, TP: -0.5 }), 'peak'); eq(verdict({ I: -Infinity, TP: null }), 'silent'); eq(verdict({ err: 'x' }), 'error');
eq(inSpec({ I: -15.2, TP: -1 }), true); eq(inSpec({ I: -18, TP: -2 }), false);
eq(summarize([{ f: 'a/l/x.mp3', I: -16, TP: -2 }, { f: 'a/l/y.mp3', I: -20, TP: -2 }]).l.verdicts, { ok: 1, off: 1 });
// Đường ống sinh giọng: bước chuẩn hoá nằm TRƯỚC bước đẩy mp3 lên kho media
for (const [wf, dir] of [['audio.yml', 'audio/l'], ['word-audio.yml', 'audio/w']]) {
  const y = fs.readFileSync('.github/workflows/' + wf, 'utf8'), a = y.indexOf(`loudness.mjs normalize .media-out/${dir}`), b = y.indexOf('node scripts/media/push.mjs');
  assert.ok(a > 0 && a < b, `${wf}: thiếu bước chuẩn hoá độ to trước khi đẩy lên kho media`); n++;
}
console.log(`✓ audio-loudness: ${n} kiểm – chuẩn −16 LUFS ±1 LU / TP ≤ −1 dBTP, đường ống chuẩn hoá trước khi đẩy`);
