#!/usr/bin/env node
// Phiên bản add-on tự tăng theo lịch sử git (08/11: 206 commit đụng extension/ từ 01/11 mà manifest vẫn 2.6.444 – chưa ai bump tay nên người dùng không nhận gì).
//   version = <major.minor của extension/manifest.json> . <số commit trên nhánh hiện tại có đụng extension/>   (≤ 65535 – giới hạn Chrome)
// Mỗi commit đụng extension/ (kể cả extension/app = bản sao web/) làm số vá tăng ≥ 1 → luôn lớn hơn bản đã đăng; không ai phải bump tay, không xung đột manifest giữa các PR.
// manifest.json trong kho giữ "major.minor.0" (số danh nghĩa); CHỈ bản dựng đăng cửa hàng được ghi số thật (build-extension.sh --zip với EXT_AUTOVERSION=1).
// Dùng: node scripts/ext-version.mjs [--apply extension/manifest.json]   (cần clone ĐỦ lịch sử – cws-publish dùng fetch-depth: 0)
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { isMain } from './lib/is-main.mjs';
export const cmp = (a, b) => { const x = String(a).split('.').map(Number), y = String(b).split('.').map(Number); for (let i = 0; i < 4; i++) { const d = (x[i] || 0) - (y[i] || 0); if (d) return d; } return 0; };
/** Thuần: manifestVersion "2.7.0" + số commit → "2.7.<n>" (n ≥ 1, ≤ 65535; n quá lớn → lỗi rõ ràng, không cắt âm thầm). */
export function nextVersion(manifestVersion, commits) {
  const m = /^(\d+)\.(\d+)(?:\.\d+){0,2}$/.exec(String(manifestVersion || ''));
  if (!m) throw new Error(`manifest version "${manifestVersion}" sai định dạng`);
  const n = Math.max(1, Math.floor(+commits || 0));
  if (n > 65535) throw new Error(`số commit ${n} > 65535 – tăng minor trong extension/manifest.json`);
  return `${m[1]}.${m[2]}.${n}`;
}
/** Thuần: bản tự tăng cho lượt đăng kế (manifest + số commit) có lớn hơn bản ĐÃ đăng không. Không so với số vá tối thiểu (.1) – số vá thật = số commit, tăng theo thời gian. */
export const publishable = (manifestVersion, lastPublished, commits) => cmp(nextVersion(manifestVersion, commits), lastPublished) > 0;
/** Thuần: major.minor của manifest không được thấp hơn bản đã đăng (thấp hơn thì số tự tăng không bao giờ vượt được). */
export const baseOk = (manifestVersion, lastPublished) => { const mm = v => String(v).split('.').slice(0, 2).join('.'); return cmp(mm(manifestVersion), mm(lastPublished)) >= 0; };
export const countCommits = () => +execFileSync('git', ['rev-list', '--count', 'HEAD', '--', 'extension'], { encoding: 'utf8' }).trim();
if (isMain(import.meta.url)) {
  const i = process.argv.indexOf('--apply'), file = i > 0 ? process.argv[i + 1] : '';
  const mf = file || 'extension/manifest.json', m = JSON.parse(fs.readFileSync(mf, 'utf8'));
  if (execFileSync('git', ['rev-parse', '--is-shallow-repository'], { encoding: 'utf8' }).trim() === 'true') { console.error('✗ ext-version: clone nông (fetch-depth: 1) đếm sai số commit – dùng fetch-depth: 0'); process.exit(1); }
  const v = nextVersion(m.version, countCommits());
  if (file) { m.version = v; fs.writeFileSync(file, JSON.stringify(m, null, 2) + '\n'); console.log(`✓ ext-version: ${file} → ${v}`); } else console.log(v);
}
