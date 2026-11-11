// DRY-RUN autopilot social không cần máy chủ: đọc manifest kho (lexkite-shorts shorts/index.json) → payload từng nền tảng đúng như autopilot sẽ gửi GrabCast.
// 0 lượt GrabCast/Meta, không tải video, không ghi gì. Kênh: chưa nối (định tuyến thật theo kênh D1 → `node scripts/social/auto.mjs preview`).
// Dùng: node scripts/social/dryrun.mjs --index /tmp/shorts/shorts/index.json [--clip <id>] [--lang vi] [--json out.json]
import fs from 'node:fs';
import { previewClip, previewText } from '../../functions/api/_social_preview.js';
import { clipOf } from '../../functions/api/distribution.js';
import { pickPreviewClip } from '../../functions/api/social-auto.js';

const arg = k => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : ''; };
const idx = arg('index'); if (!idx || !fs.existsSync(idx)) { console.error('✗ thiếu --index <shorts/index.json>'); process.exit(2); }
const raw = JSON.parse(fs.readFileSync(idx, 'utf8')), items = Array.isArray(raw) ? raw : raw.items || [];
const it = pickPreviewClip(items, arg('clip'));
if (!it) { console.error(`✗ không có clip ${arg('clip') ? arg('clip') : 'đạt QC'} trong kho (${items.length} mục)`); process.exit(1); }
const c = { ...clipOf(it), cover: clipOf(it).cover || it.cover || '' }; if (arg('lang')) c.lang = arg('lang').toLowerCase();
const pv = previewClip(c);
console.log(previewText(pv));
const bad = pv.posts.filter(x => x.issues.some(i => i.startsWith('error:')));
console.log(`\n(dry-run: ${pv.posts.length} nền tảng · đăng 0 · lượt GrabCast 0 · lỗi chặn ${bad.length}${bad.length ? ': ' + bad.map(x => x.platform + '=' + x.issues.join('+')).join(' ') : ''})`);
if (arg('json')) fs.writeFileSync(arg('json'), JSON.stringify(pv, null, 1));
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, '## Dry-run autopilot social\n\n```\n' + previewText(pv).slice(0, 60000) + '\n```\n');
