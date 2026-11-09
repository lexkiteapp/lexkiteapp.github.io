#!/usr/bin/env node
// Số việc còn của lexicon-expand cho ci-filler (infra/ci-backlog.json probe): 20k − mục SỐNG (kho + đã xuất + chờ soát) + retry chờ làm. Không gọi AI/mạng.
import fs from 'fs';
import { ROOT, rd, loadAll, key } from '../lib.mjs';
import { loadBrowserIndex } from '../shards.mjs';
import { doneWords } from './lib.mjs';
const live = new Set(doneWords({ queue: false }));
for (const { row } of loadAll()) live.add(key(row));
for (const k of Object.keys(loadBrowserIndex().INDEX)) if (k.includes('#')) live.add(k);
const RETRY = 'content/lexicon/expand/retry/words.json', retry = fs.existsSync(new URL(RETRY, ROOT)) ? JSON.parse(rd(RETRY)).items.length : 0;
console.log(`lexicon-expand còn ${Math.max(0, 20000 - live.size) + retry} mục (mốc 20k còn ${Math.max(0, 20000 - live.size)} · retry ${retry})`);
