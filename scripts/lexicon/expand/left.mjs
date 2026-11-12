#!/usr/bin/env node
// (--idle: chỉ kiểm lượt gần rỗng, exit 0 = rỗng) Số việc còn của lexicon-expand cho ci-filler (infra/ci-backlog.json probe): 20k − mục SỐNG (kho + đã xuất + chờ soát) + retry chờ làm. Không gọi AI/mạng.
import fs from 'fs';
import { ROOT, rd, loadAll, key } from '../lib.mjs';
import { loadBrowserIndex } from '../shards.mjs';
import { doneWords, laneEmpty } from './lib.mjs';
const RETRY = 'content/lexicon/expand/retry/words.json', retry = fs.existsSync(new URL(RETRY, ROOT)) ? JSON.parse(rd(RETRY)).items.length : 0;
const LR = new URL('content/lexicon/expand/last-run/', ROOT), runs = fs.existsSync(LR) ? fs.readdirSync(LR).map(f => JSON.parse(fs.readFileSync(new URL(f, LR), 'utf8'))) : [];
if (laneEmpty(runs, retry)) { console.log('lexicon-expand còn 0 mục (lượt gần nhất gần rỗng, thử lại sau 24 h hoặc khi retry tăng)'); process.exit(0); }
if (process.argv.includes('--idle')) process.exit(1);   // workflow plan: 0 = gần rỗng (bỏ lượt), 1 = có việc – không tải kho

const live = new Set(doneWords({ queue: false }));
for (const { row } of loadAll()) live.add(key(row));
for (const k of Object.keys(loadBrowserIndex().INDEX)) if (k.includes('#')) live.add(k);
console.log(`lexicon-expand còn ${Math.max(0, 20000 - live.size) + retry} mục (mốc 20k còn ${Math.max(0, 20000 - live.size)} · retry ${retry})`);
