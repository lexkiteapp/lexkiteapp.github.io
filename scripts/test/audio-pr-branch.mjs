#!/usr/bin/env node
// audio.yml chạy được trên nhánh PR: render Kokoro rồi commit chỉ mục vào CHÍNH nhánh (gỡ kẹt gà–trứng của PR nội dung lớn), main vẫn như cũ.
import fs from 'node:fs';
import { scanPrUpdate } from './bot-push-key.mjs';
let bad = 0; const ok = (c, m) => { if (!c) { bad++; console.error('✗', m); } };
const wf = fs.readFileSync('.github/workflows/audio.yml', 'utf8'), sh = fs.readFileSync('scripts/ci/commit-regen-pr.sh', 'utf8');
const step = n => (wf.split(/\n(?=      - name: )/).find(b => b.includes(n)) || '');
const main = step('→ main'), br = step('→ chính nhánh PR');
ok(/if: github\.ref == 'refs\/heads\/main'/.test(main) && /commit-regen\.sh/.test(main), 'bước đẩy main chỉ chạy khi ref = main');
ok(/if: github\.ref != 'refs\/heads\/main'/.test(br) && /commit-regen-pr\.sh/.test(br) && /BR: '\$\{\{ github\.ref_name \}\}'/.test(br), 'bước nhánh chỉ chạy khi ref ≠ main, truyền BR = ref_name');
ok(!/coverage\.mjs --ratchet/.test(br) && !/coverage\.json/.test(br), 'nhánh PR không nâng sàn độ phủ (tránh xung đột coverage.json với main)');
ok(/workflow_dispatch:/.test(wf) && /ssh-key: '\$\{\{ secrets\.BOT_DEPLOY_KEY \}\}'/.test(wf), 'dispatch được + checkout bằng khoá deploy');
ok(scanPrUpdate('commit-regen-pr.sh', sh).length === 0, 'script nhánh PR: không đẩy main, không force-push');
ok(/refs\/heads\/\$BR/.test(sh) && /main\|master/.test(sh) && !/skip ci/.test(sh.replace(/^#.*$/gm, '')), 'đẩy đúng refs/heads/$BR, từ chối main, không [skip ci] (kích lại check PR)');
if (bad) process.exit(1); console.log('✓ audio-pr-branch: audio.yml render + đẩy chỉ mục vào nhánh PR, main giữ nguyên');
