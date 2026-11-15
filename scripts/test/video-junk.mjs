#!/usr/bin/env node
// Chạy scripts/test/video-junk.py (python3 stdlib) cho npm test; thiếu python3 → bỏ qua có ghi chú.
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const py = path.join(path.dirname(fileURLToPath(import.meta.url)), 'video-junk.py');
const r = spawnSync('python3', [py], { stdio: 'inherit', timeout: 240000 });
if (r.error && r.error.code === 'ENOENT') { console.log('… bỏ qua video-junk (không có python3)'); process.exit(0); }
process.exit(r.status ?? 1);
