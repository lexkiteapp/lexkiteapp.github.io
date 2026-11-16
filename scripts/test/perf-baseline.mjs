// Đo tốc độ CPU thật của runner (lib/perf-calibrate.mjs benchMs) – dùng cho workflow perf-baseline (chọn REF_MS bằng số liệu) và báo cáo chập chờn.
import { chromium } from 'playwright';
import fs from 'node:fs';
import { benchMs } from './lib/perf-calibrate.mjs';
const b = await chromium.launch(); const p = await b.newPage();
const t = []; for (let i = 0; i < 3; i++) t.push(Math.round(await benchMs(p)));
await b.close();
const out = { bench: t, min: Math.min(...t), runner: process.env.RUNNER_NAME || '', image: process.env.ImageVersion || '', cpus: (await import('node:os')).cpus().length, model: (await import('node:os')).cpus()[0].model };
console.log(JSON.stringify(out)); fs.mkdirSync('perf-baseline', { recursive: true }); fs.writeFileSync(`perf-baseline/${process.env.M || 'x'}.json`, JSON.stringify(out));
