// Chặn tái phát "ValueError: cannot write empty image as JPEG" (vocab-img-free đỏ 24/10→9/11):
// lượt 0 ảnh đạt → tờ soát (sheet) phải bỏ qua, KHÔNG tạo ảnh cao 0 px; có ảnh → vẫn ra JPEG.
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const py = process.env.PY || 'python3';
const src = fs.readFileSync('scripts/vocab-img/free_tier.py', 'utf8');
// luôn kiểm tĩnh: nhánh 0 ảnh phải thoát TRƯỚC khi dựng ảnh sheet
assert.ok(src.indexOf("if not ks: print(") > 0 && src.indexOf("if not ks: print(") < src.indexOf("S = Image.new('RGB', (cols * cell"), 'sheet(): guard 0 ảnh phải đứng trước Image.new');
if (spawnSync(py, ['-c', 'import PIL'], { stdio: 'ignore' }).status !== 0) { console.log('vocab-img-free-sheet ✓ (tĩnh; runner không có Pillow)'); process.exit(0); }
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'free-sheet-'));
const run = res => execFileSync(py, ['-c', `
import sys, json, os
sys.argv = ['free_tier.py', ${JSON.stringify(dir)}]
sys.path.insert(0, 'scripts/vocab-img')
import free_tier as f
from PIL import Image
os.makedirs(f.OUT + '/final', exist_ok=True)
res = json.loads(${JSON.stringify(JSON.stringify(res))})
for r in res.values(): Image.new('RGB', (384, 384), (255, 247, 234)).save(f.OUT + '/final/' + r['h'] + '.webp', 'WEBP')
f.sheet(res, f.OUT + '/sheet.jpg')
`], { encoding: 'utf8' });
const out0 = run({});
assert.match(out0, /0 ảnh đạt/); assert.ok(!fs.existsSync(path.join(dir, 'sheet.jpg')), '0 ảnh → không tạo tờ soát');
run({ 'a#n#1': { tier: 'icon', h: 'abc123' } });
assert.ok(fs.statSync(path.join(dir, 'sheet.jpg')).size > 500, '≥1 ảnh → có tờ soát JPEG');
fs.rmSync(dir, { recursive: true, force: true });
console.log('vocab-img-free-sheet ✓');
