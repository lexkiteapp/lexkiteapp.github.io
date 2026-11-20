#!/usr/bin/env node
// Workflow sản xuất khai báo SẢN LƯỢNG mỗi lượt: node scripts/ci/record-yield.mjs <workflow-id> <số mục tạo ra> [--unit mục] [--note "…"]
// Ghi reports/yield/<id>.json (giữ 120 lượt cuối); health-board.yml đọc và báo đỏ khi 24–48 h ra 0 / dưới sàn (infra/yield-floors.json).
// Bước này nên nằm TRƯỚC bước commit của workflow để file đi cùng commit dữ liệu (không thêm lượt push). Docs: docs/HEALTH-BOARD.md.
import fs from 'node:fs';
import path from 'node:path';
export function addYield(doc, { n, run = '', note = '', unit = '', t = new Date().toISOString() }, id) {
  const d = doc && Array.isArray(doc.runs) ? doc : { wf: id, runs: [] };
  d.wf = id; if (unit) d.unit = unit;
  d.runs.push({ t, n: Math.max(0, Math.round(+n) || 0), ...(run ? { run } : {}), ...(note ? { note: String(note).slice(0, 160) } : {}) });
  d.runs = d.runs.slice(-120);
  return d;
}
if (process.argv[1] && process.argv[1].endsWith('record-yield.mjs')) {
  const [id, n, ...rest] = process.argv.slice(2), opt = k => { const i = rest.indexOf(k); return i >= 0 ? rest[i + 1] : ''; };
  if (!id || n === undefined || isNaN(+n)) { console.error('Dùng: record-yield.mjs <workflow-id> <n> [--unit u] [--note t]'); process.exit(2); }
  const f = path.join(process.env.YIELD_DIR || 'reports/yield', `${id}.json`);
  let cur = null; try { cur = JSON.parse(fs.readFileSync(f, 'utf8')); } catch { /* chưa có */ }
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, JSON.stringify(addYield(cur, { n, run: process.env.GITHUB_RUN_ID || '', note: opt('--note'), unit: opt('--unit') }, id), null, 1) + '\n');
  console.log(`yield ${id}: ${n} ${opt('--unit') || 'mục'}`);
}
