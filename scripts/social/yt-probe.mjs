// Phép thử audit YouTube (chủ OK 16/11): node scripts/social/yt-probe.mjs queue [channel_id] | status <clip>
//  queue  → op probe: 1 clip QC-pass bản ngữ vào hàng tải PUBLIC ngay (youtube-upload.yml tải, input max=1)
//  status → op probe_status: đọc lại videos.list part=status; privacy=public ⇒ project KHÔNG bị khoá Private; private ⇒ còn khoá.
import { driveCliKey, driveSign } from '../video/library.mjs';

const BASE = String(process.env.LEXKITE_API_BASE || 'https://lexkite.com').replace(/\/+$/, ''), key = driveCliKey(), [mode, arg] = process.argv.slice(2);
if (!key) { console.log('⏭ chưa có LEXKITE_DRIVE_CLI_KEY – bỏ qua'); process.exit(0); }
if (!['queue', 'status'].includes(mode) || (mode === 'status' && !/^[a-z0-9-]{3,120}$/.test(arg || ''))) { console.error('dùng: yt-probe.mjs queue [channel_id] | status <clip>'); process.exit(2); }
const text = JSON.stringify(mode === 'queue' ? { op: 'probe', ...(arg ? { channel_id: arg } : {}) } : { op: 'probe_status', clip: arg });
const r = await fetch(BASE + '/api/youtube', { method: 'POST', headers: { 'Content-Type': 'application/json', ...driveSign(key, text) }, body: text, signal: AbortSignal.timeout(60e3) }).catch(() => null);
const j = r ? await r.json().catch(() => ({})) : {};
if (!r || !r.ok) { console.error('✗ probe', r ? r.status : 'fetch', JSON.stringify(j).slice(0, 300)); process.exit(1); }
console.log(JSON.stringify(j, null, 1));
if (process.env.GITHUB_STEP_SUMMARY) (await import('node:fs')).appendFileSync(process.env.GITHUB_STEP_SUMMARY, '### Phép thử YouTube ' + mode + '\n```\n' + JSON.stringify(j, null, 1) + '\n```\n');
if (mode === 'status' && j.found) console.log(j.privacy === 'public' ? '✓ PUBLIC – project không bị khoá Private' : `⚠ ${j.privacy} – còn khoá hoặc đang xử lý (upload=${j.upload}, rejection=${j.rejection || '-'})`);
