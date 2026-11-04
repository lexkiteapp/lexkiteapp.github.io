#!/usr/bin/env node
// Hồi quy cổng grammar-map-check (P0-D): bản thật xanh; mỗi kiểu hỏng phải làm cổng đỏ với đúng thông báo.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ginv-'));
const INV = JSON.parse(fs.readFileSync('content/framework/grammar-inventory.json', 'utf8'));
const TGT = JSON.parse(fs.readFileSync('content/pipeline/targets.json', 'utf8'));
const clone = o => JSON.parse(JSON.stringify(o));
const pt = (inv, id) => inv.points.find(p => p.id === id);
const run = (inv, tgt) => {
  const a = path.join(dir, 'inv.json'), b = path.join(dir, 't.json');
  fs.writeFileSync(a, JSON.stringify(inv)); fs.writeFileSync(b, JSON.stringify(tgt));
  return spawnSync('node', ['scripts/content-qa/grammar-map-check.mjs', '--inv', a, '--targets', b, '--report', path.join(dir, 'r.json')], { encoding: 'utf8' });
};
let bad = 0, n = 0;
const expect = (name, r, ok, re) => {
  n += ok ? 0 : 1;
  const pass = ok ? r.status === 0 : r.status !== 0 && re.test(r.stdout);
  if (!pass) { bad++; console.log(`✗ ${name}: status ${r.status}\n${(r.stdout + r.stderr).slice(0, 600)}`); } else console.log(`✓ ${name}`);
};

expect('bản thật xanh', run(INV, TGT), true);
{ const i = clone(INV); pt(i, 'present-perfect-unfinished').lessons.push('khong-co-bai'); expect('bài không tồn tại', run(i, TGT), false, /không có trong web\/js\/grammar/); }
{ const i = clone(INV); pt(i, 'be-present').lessons.push('inversion-cleft'); expect('lệch cấp > 1 bậc', run(i, TGT), false, /be-present \(A1\): bài inversion-cleft \(C1\) lệch quá 1 bậc/); }
{ const i = clone(INV); for (const p of i.points) p.lessons = p.lessons.filter(l => l !== 'idioms-style'); const t = clone(TGT);
  for (const p of i.points) if (p.level === 'B2' && !p.lessons.length && !t['Ngữ pháp – bài B2'].points.includes(p.id)) t['Ngữ pháp – bài B2'].points.push(p.id);
  expect('bài không có điểm', run(i, t), false, /bài idioms-style: chưa gắn điểm/); }
{ const q = TGT['Ngữ pháp – bài A1'].points[0], t = clone(TGT); // điểm A1 đầu hàng chờ (đổi dần khi viết bài mới) – không gắn cứng id đã dạy
  t['Ngữ pháp – bài A1'].points = t['Ngữ pháp – bài A1'].points.filter(id => id !== q); expect('điểm chưa dạy không vào hàng chờ', run(INV, t), false, new RegExp(`thiếu điểm chưa dạy "${q}"`)); }
{ const i = clone(INV); pt(i, 'be-present').lessons = pt(i, 'be-present').lessons.filter(l => l !== 'be-am-is-are'); expect('gỡ bài A1 khỏi điểm → điểm phải về hàng chờ', run(i, TGT), false, /thiếu điểm chưa dạy "be-present"/); }
{ const t = clone(TGT); t['Ngữ pháp – bài B1'].points.push('present-perfect-unfinished'); expect('hàng chờ chứa điểm đã dạy', run(INV, t), false, /đã có bài cùng cấp/); }
{ const t = clone(TGT); t['Ngữ pháp – bài C2'].points.push('khong-co-diem'); expect('hàng chờ chứa điểm lạ', run(INV, t), false, /không có trong kho/); }
{ const t = clone(TGT); t['Ngữ pháp – bài C1'].have = 99; expect('have lệch số bài thật', run(INV, t), false, /have = 99 nhưng thực có/); }
{ const t = clone(TGT); delete t['Ngữ pháp – bài C2']; expect('thiếu hàng chờ cả cấp', run(INV, t), false, /thiếu hàng chờ "Ngữ pháp – bài C2"/); }
{ const i = clone(INV); i.points.push(clone(i.points[0])); expect('id trùng', run(i, TGT), false, /id trùng/); }
{ const i = clone(INV); i.points[0].example = 'Tôi là Lan.'; expect('ví dụ không phải tiếng Anh', run(i, TGT), false, /ví dụ phải là tiếng Anh/); }
{ const i = clone(INV); i.points[1].can_do_en = i.points[0].can_do_en; expect('can_do_en trùng', run(i, TGT), false, /trùng can_do_en/); }
fs.rmSync(dir, { recursive: true, force: true });
if (bad) { console.log(`✗ grammar-inventory test: ${bad} ca sai`); process.exit(1); }
console.log(`✓ grammar-inventory test: cổng bắt đủ ${n} kiểu hỏng`);
