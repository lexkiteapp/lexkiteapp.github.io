// listTreeFiles (scripts/lib/gh-tree.mjs): đệ quy khi được; 500 → đi bộ thư mục; 4xx/cây bị cắt → ném. Gốc 16/11: cây đệ quy lexkite-media-2 trả 500, cdn-mirror đỏ.
import assert from 'node:assert/strict';
import { listTreeFiles } from '../lib/gh-tree.mjs';
const res = (status, body) => ({ ok: status < 300, status, json: async () => body });
const T = { // kho giả: root có a.txt, d1/ (b.txt, d2/c.txt), d3/ (e.txt)
  HEAD: { sha: 'R', tree: [{ type: 'blob', path: 'a.txt', sha: 'sa', size: 1 }, { type: 'tree', path: 'd1', sha: 'S1' }, { type: 'tree', path: 'd3', sha: 'S3' }] },
  S1: { sha: 'S1', tree: [{ type: 'blob', path: 'b.txt', sha: 'sb', size: 2 }, { type: 'tree', path: 'd2', sha: 'S2' }] },
  S2: { sha: 'S2', tree: [{ type: 'blob', path: 'c.txt', sha: 'sc', size: 3 }] },
  S3: { sha: 'S3', tree: [{ type: 'blob', path: 'e.txt', sha: 'se', size: 4 }] } };
const log = () => {}, paths = o => o.files.map(f => f.path).sort();
{ const calls = []; const get = async u => { calls.push(u); return u.includes('recursive=1') ? res(200, { sha: 'R', truncated: false, tree: [{ type: 'blob', path: 'x/y.txt', sha: 's', size: 9 }, { type: 'tree', path: 'x', sha: 'S' }] }) : res(404, {}); };
  const o = await listTreeFiles('o/r', get, { log }); assert.deepEqual(paths(o), ['x/y.txt']); assert.equal(calls.length, 1, 'đệ quy được → 1 lượt gọi'); assert.equal(o.commit, 'R'); }
{ const calls = []; const get = async u => { calls.push(u); if (u.includes('recursive=1')) return res(500, {}); return res(200, { ...T[u.split('/trees/')[1]], truncated: false }); };
  const o = await listTreeFiles('o/r', get, { log }); assert.deepEqual(paths(o), ['a.txt', 'd1/b.txt', 'd1/d2/c.txt', 'd3/e.txt'], '500 → đi bộ đủ mọi thư mục, đường dẫn đầy đủ');
  assert.equal(o.commit, 'R'); assert.equal(o.files.find(f => f.path === 'd1/d2/c.txt').size, 3); assert.equal(calls.length, 1 + 1 + 3, 'đệ quy(500) + gốc + 3 thư mục'); }
{ const get = async u => (u.includes('recursive=1') ? res(404, {}) : res(200, {})); await assert.rejects(listTreeFiles('o/r', get, { log }), /404/, '4xx → ném, không đi bộ'); }
{ const get = async () => res(200, { sha: 'R', truncated: true, tree: [] }); await assert.rejects(listTreeFiles('o/r', get, { log }), /bị cắt/, 'cây đệ quy bị cắt → ném'); }
{ const get = async u => (u.includes('recursive=1') ? res(500, {}) : u.endsWith('/HEAD') ? res(200, T.HEAD) : res(502, {})); await assert.rejects(listTreeFiles('o/r', get, { log }), /502/, 'thư mục con hỏng khi đi bộ → ném (không báo thiếu tệp)'); }
{ const get = async u => (u.includes('recursive=1') ? res(500, {}) : u.endsWith('/HEAD') ? res(200, T.HEAD) : res(200, { sha: 'x', truncated: true, tree: [] })); await assert.rejects(listTreeFiles('o/r', get, { log }), /bị cắt/, 'thư mục con bị cắt → ném'); }
console.log('✓ gh-tree: đệ quy khi được, 500 → đi bộ thư mục đủ tệp, lỗi/cắt → ném');
