#!/usr/bin/env node
// Hồi quy cổng lkf-check (P0-C): bản thật xanh; mỗi kiểu hỏng phải làm cổng đỏ với đúng thông báo.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lkf-'));
const LKF = JSON.parse(fs.readFileSync('content/framework/lkf.json', 'utf8'));
const MAP = JSON.parse(fs.readFileSync('content/framework/lo-map.json', 'utf8'));
const clone = o => JSON.parse(JSON.stringify(o));
const run = (lkf, map) => {
  const a = path.join(dir, 'lkf.json'), b = path.join(dir, 'map.json');
  fs.writeFileSync(a, JSON.stringify(lkf)); fs.writeFileSync(b, JSON.stringify(map));
  return spawnSync('node', ['scripts/content-qa/lkf-check.mjs', '--lkf', a, '--map', b, '--report', path.join(dir, 'r.json')], { encoding: 'utf8' });
};
let bad = 0;
const expect = (name, r, ok, re) => {
  const pass = ok ? r.status === 0 : r.status !== 0 && re.test(r.stdout);
  if (!pass) { bad++; console.log(`✗ ${name}: status ${r.status}\n${(r.stdout + r.stderr).slice(0, 600)}`); } else console.log(`✓ ${name}`);
};

expect('bản thật xanh', run(LKF, MAP), true);
{ const m = clone(MAP); m.items.grammar['present-simple'] = 'S.A1.99'; expect('lo không tồn tại', run(LKF, m), false, /không có trong lkf\.json/); }
{ const m = clone(MAP); m.items.grammar['present-simple'] = 'W.C1.06'; expect('lệch cấp > 1 bậc', run(LKF, m), false, /lệch cấp nội dung A2/); }
{ const m = clone(MAP); m.items.grammar['khong-co-bai-nay'] = 'S.A2.01'; expect('khoá thừa', run(LKF, m), false, /không còn trong dữ liệu/); }
{ const m = clone(MAP); for (const k of Object.keys(m.items.grammar).slice(0, 8)) delete m.items.grammar[k]; expect('độ phủ < 95 %', run(LKF, m), false, /grammar: độ phủ lo .* < 95 %/); }
{ const m = clone(MAP); m.vocab.B2 = 'R.Z9.01'; expect('luật vocab trỏ sai', run(LKF, m), false, /vocab\.B2/); }
{ const l = clone(LKF); l.objectives[0].can_do_en = 'Can understand and use familiar everyday expressions and very basic phrases.'; expect('chép bộ mô tả đã xuất bản', run(l, MAP), false, /bộ mô tả đã xuất bản/); }
{ const l = clone(LKF); l.objectives[1].can_do_en = l.objectives[0].can_do_en; expect('câu trùng', run(l, MAP), false, /trùng câu/); }
{ const l = clone(LKF); l.objectives.push({ ...l.objectives[0] }); expect('id trùng', run(l, MAP), false, /id trùng/); }
{ const l = clone(LKF); l.objectives[0].gse = 60; expect('gse ngoài dải', run(l, MAP), false, /gse 60 ngoài dải/); }
{ const l = clone(LKF); l.objectives = l.objectives.filter(o => !(o.skill === 'M' && o.level === 'C2' && o.id !== 'M.C2.01')); const m = clone(MAP);
  expect('ô kỹ năng×cấp < 15', run(l, m), false, /lkf M×C2: 1 mục tiêu < 15/); }
{ const l = clone(LKF); l.objectives = l.objectives.filter(o => !(o.skill === 'R' && o.level === 'A1' && o.audience === 'work')); expect('thiếu đối tượng', run(l, MAP), false, /R×A1: thiếu đối tượng work/); }
fs.rmSync(dir, { recursive: true, force: true });
if (bad) { console.log(`✗ lkf test: ${bad} ca sai`); process.exit(1); }
console.log('✓ lkf test: cổng bắt đủ 11 kiểu hỏng');
