// 🔊 Gate âm lượng gói SFX (docs/specs/play-learn.md): mỗi âm −16 LUFS ±1 LU (BS.1770-4), đỉnh ≤ −1 dBFS.
// (1) dựng lại từ công thức scripts/sfx/build.mjs (thuần JS) · (2) có ffmpeg → giải mã đúng file mp3 phát hành web/sfx/*.mp3 và đo lại
// (bắt trường hợp sửa công thức mà quên dựng lại mp3, hoặc thay mp3 bằng tay). (3) bộ đo tự kiểm trên sóng sin 1 kHz chuẩn.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { loudness, peakDb, TARGET, TOL, PEAK_MAX } from '../sfx/loudness.mjs';
import { SOUNDS, SR, finish } from '../sfx/build.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));

{ // bộ đo: sin 1 kHz biên độ 1 (0 dBFS) dài 3 s = −3.01 LUFS theo BS.1770 (K-weight ≈ 0 dB ở 1 kHz, +0.691 bù)
  const x = new Float64Array(3 * SR); for (let i = 0; i < x.length; i++) x[i] = Math.sin((2 * Math.PI * 1000 * i) / SR);
  const L = loudness(x, SR); assert.ok(Math.abs(L - -3.01) < 0.1, `bộ đo lệch chuẩn: ${L}`);
  for (let i = 0; i < x.length; i++) x[i] *= 0.1; assert.ok(Math.abs(loudness(x, SR) - -23.01) < 0.1, 'bộ đo không tuyến tính');
  assert.equal(loudness(new Float64Array(SR), SR), -Infinity, 'im lặng phải bị cổng −70 loại');
}

const names = Object.keys(SOUNDS);
assert.deepEqual(names.sort(), ['combo', 'complete', 'correct', 'streak', 'tap', 'wrong'], 'gói âm đổi tên/thiếu – cập nhật feel.js NAMES + test này');
for (const [n, make] of Object.entries(SOUNDS)) {
  const o = finish(make()), L = loudness(o, SR), P = peakDb(o);
  assert.ok(Math.abs(L - TARGET) <= TOL, `${n}: ${L.toFixed(2)} LUFS (cần ${TARGET} ±${TOL})`);
  assert.ok(P <= PEAK_MAX, `${n}: đỉnh ${P.toFixed(2)} dBFS > ${PEAK_MAX}`);
}

let ff = false; try { execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' }); ff = true; } catch (e) { /* không có ffmpeg */ }
if (ff) {
  for (const n of names) {
    const f = root + 'web/sfx/' + n + '.mp3'; assert.ok(existsSync(f), 'thiếu ' + f);
    const raw = execFileSync('ffmpeg', ['-v', 'error', '-i', f, '-f', 'f32le', '-ac', '1', '-ar', String(SR), '-']);
    const x = new Float32Array(raw.buffer, raw.byteOffset, raw.byteLength / 4);
    const L = loudness(x, SR), P = peakDb(x);
    assert.ok(Math.abs(L - TARGET) <= TOL, `web/sfx/${n}.mp3: ${L.toFixed(2)} LUFS – chạy lại node scripts/sfx/build.mjs`);
    assert.ok(P <= PEAK_MAX + 0.5, `web/sfx/${n}.mp3: đỉnh ${P.toFixed(2)} dBFS (mp3 cho vượt ≤ 0.5 dB do lọc của bộ mã hoá)`);
  }
}
console.log(`sfx-loudness OK – ${names.length} âm ${TARGET} ±${TOL} LUFS, đỉnh ≤ ${PEAK_MAX} dBFS${ff ? ' (đã đo cả mp3)' : ' (không có ffmpeg: chỉ đo bản dựng)'}`);
