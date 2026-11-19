// Gốc CDN âm thanh tự hồi: audioFail() chỉ tăng bộ đếm; trước đây không bao giờ giảm → 2 file thiếu là cả phiên lùi sang gốc kế, 4 file là gốc cuối → giọng máy.
// Kiểm: sau đợt lỗi, 60 s yên → về gốc đầu; lỗi mới đẩy mốc hồi ra xa; audioUrl/audioUrls luôn theo gốc hiện hành. Chạy: node scripts/test/audio-heal.mjs
import fs from 'node:fs'; import vm from 'node:vm'; import assert from 'node:assert/strict';
const ui = fs.readFileSync('web/js/ui.js', 'utf8').split('\n'), i0 = ui.findIndex(l => /^\s*let cdnFail\b/.test(l)), i1 = ui.findIndex(l => /g\.audioFail = /.test(l));
assert.ok(i0 >= 0 && i1 > i0, 'web/js/ui.js: không thấy khối cdnFail … audioFail');
let clock = 1e9; const g = { LISTEN_AUDIO: null, LISTEN_AUDIO_S2: null };
vm.runInNewContext(ui.slice(i0, i1 + 1).join('\n'), { g, Date: { now: () => clock } });
const tick = ms => { clock += ms; };
const first = () => g.audioUrl('k').split('/audio/')[0], N = g.AUDIO_BASES.length;
assert.ok(N >= 2, 'AUDIO_BASES phải có ≥ 2 gốc');
const base0 = first();
for (let i = 0; i < 2 * N; i++) g.audioFail();
assert.notEqual(first(), base0, 'sau nhiều lỗi phải lùi sang gốc khác');
assert.equal(g.audioUrls('k').length, 1, 'chỉ còn gốc cuối');
tick(59000); assert.notEqual(first(), base0, '59 s chưa hồi');
g.audioFail(); tick(59000); assert.notEqual(first(), base0, 'lỗi mới phải đẩy mốc hồi ra xa 60 s');
tick(2000); assert.equal(first(), base0, 'sau 60 s yên phải về gốc đầu');
assert.equal(g.audioUrls('k').length, N, 'về đủ mọi gốc');
console.log('✓ audio-heal: gốc CDN tự hồi sau 60 s yên, lỗi mới đẩy mốc, URL theo gốc hiện hành');
