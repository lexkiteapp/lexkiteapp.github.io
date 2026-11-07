#!/usr/bin/env node
// audio-cdn-check: 404 ngay sau khi đẩy lô media = chờ bản dựng Pages (không đỏ); kẹt > 90 phút hoặc dựng xong vẫn 404 = đỏ.
import fs from 'node:fs';
import { pagesPending, MAX_MIN } from '../lib/pages-lag.mjs';
let bad = 0; const ok = (c, m) => { if (!c) { bad++; console.error('✗', m); } };
const now = Date.parse('2026-11-06T16:20:00Z'), mk = (status, at) => [{ status, created_at: at }];
ok(pagesPending(mk('building', '2026-11-06T15:55:30Z'), now).pending, 'đang dựng 25 phút → chờ');
ok(pagesPending(mk('queued', '2026-11-06T16:10:00Z'), now).pending, 'xếp hàng 10 phút → chờ');
ok(!pagesPending(mk('building', '2026-11-06T14:00:00Z'), now).pending, 'dựng > 90 phút = kẹt → đỏ');
ok(!pagesPending(mk('built', '2026-11-06T16:00:00Z'), now).pending, 'đã dựng xong mà 404 → đỏ');
ok(!pagesPending(mk('errored', '2026-11-06T16:00:00Z'), now).pending, 'dựng lỗi → đỏ');
ok(!pagesPending([], now).pending && !pagesPending(null, now).pending && !pagesPending({ message: 'Not Found' }, now).pending, 'không đọc được → đỏ (không nới)');
ok(MAX_MIN === 90, 'hạn chờ 90 phút');
const src = fs.readFileSync('scripts/audio-cdn-check.mjs', 'utf8'), wf = fs.readFileSync('.github/workflows/pages.yml', 'utf8');
ok(/pend && !res\.other\.length/.test(src) && /--pages-repo lexkiteapp\/lexkite-media-2/.test(wf), 'công cụ + workflow nối --pages-repo (chỉ kho media Pages, không áp cho audio.lexkite.com)');
if (bad) process.exit(1); console.log('✓ pages-lag: 404 lúc Pages kho đang dựng = chờ, kẹt/xong rồi = đỏ');
