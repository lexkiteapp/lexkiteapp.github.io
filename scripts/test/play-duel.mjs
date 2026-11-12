// 👻 Đấu bóng ma (docs/specs/play-community-1211.md #1): máy chủ tính lại điểm từ dấu vết, khớp 100 % luật của client; chặn gian lận; ghost tại thời điểm.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { scoreOf, onRequestPost } from '../../functions/api/duel.js';

const w = { btoa, atob }; w.self = w; vm.runInNewContext(fs.readFileSync(new URL('../../web/cpack/play-app/play-blitz.js', import.meta.url), 'utf8'), w);
const { core } = w.PlayBlitz;

// Điểm khớp client: mọi đúng = 10,10,20,20,20,30… ; sai reset combo
const tr = (flags, gap = 1000) => flags.map((f, i) => [300 + i * gap, f]);
for (const flags of [[1], [1, 1, 1], [1, 1, 1, 1, 1, 1, 1], [1, 0, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1]]) {
  const t = tr(flags);
  assert.equal(scoreOf(t), core.ghostAt(Array.from(t, e => Array.from(e)), 60500), 'server ≠ client: ' + flags);
}
assert.equal(scoreOf(tr([1, 1, 1, 1, 1, 1, 1])), 10 + 10 + 20 + 20 + 20 + 30 + 30);
// Gian lận / hỏng
assert.equal(scoreOf([]), null, 'rỗng'); assert.equal(scoreOf('x'), null);
assert.equal(scoreOf([[100, 1], [200, 1]]), null, 'nhanh hơn người (< 250 ms/câu)');
assert.equal(scoreOf([[500, 1], [400, 1]]), null, 'thời gian phải tăng');
assert.equal(scoreOf([[61000, 1]]), null, 'quá giờ');
assert.equal(scoreOf([[100, 2]]), null, 'giá trị lạ'); assert.equal(scoreOf([[1.5, 1]]), null);
assert.equal(scoreOf(Array.from({ length: 101 }, (_, i) => [i * 300, 1])), null, '> 100 mục');
// Ghost tại thời điểm
const g = tr([1, 1, 1, 1]); // t=300,1300,2300,3300
assert.equal(core.ghostAt(g, 0), 0); assert.equal(core.ghostAt(g, 1300), 20); assert.equal(core.ghostAt(g, 60000), 10 + 10 + 20 + 20);
assert.ok(core.goodTrace(g)); assert.ok(!core.goodTrace([[1]])); assert.ok(!core.goodTrace('x'));

// API: chưa đăng nhập → 401; không DB → 500 (không lộ gì)
const post = (body, hdr = {}) => new Request('https://lexkite.com/api/duel', { method: 'POST', headers: { 'Content-Type': 'application/json', ...hdr }, body: JSON.stringify(body) });
assert.equal((await onRequestPost({ request: post({ op: 'ghost' }), env: { DB: {} } })).status, 401);
assert.equal((await onRequestPost({ request: post({ op: 'ghost' }), env: {} })).status, 500);
// Ẩn danh: mã nguồn không bao giờ chọn/ trả nick hay uid của đối thủ
const src = fs.readFileSync(new URL('../../functions/api/duel.js', import.meta.url), 'utf8');
assert.ok(!/nick/.test(src.replace(/\/\*[\s\S]*?\*\//, '').replace(/\/\/.*$/gm, '')), 'bóng ma không được lộ biệt danh');
console.log('play-duel OK');
