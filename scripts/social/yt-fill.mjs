// CI hằng ngày (social-coverage.yml, trước bước máy gác): POST /api/youtube op fill (ký HMAC) – mỗi kênh YouTube trực tiếp có ngôn ngữ riêng được xếp đủ 30 ngày × 1 video/ngày
// bằng clip bản ngữ đã đạt QC (private + publishAt). In số bài vừa xếp + số ngày còn thiếu từng kênh (thiếu clip bản ngữ → video-script-bank cần thêm). 429/409 → bỏ qua lượt, không thử lại.
import { driveCliKey, driveSign } from '../video/library.mjs';

const BASE = String(process.env.LEXKITE_API_BASE || 'https://lexkite.com').replace(/\/+$/, ''), key = driveCliKey();
if (!key) { console.log('⏭ chưa có LEXKITE_DRIVE_CLI_KEY – bỏ qua'); process.exit(0); }
const text = JSON.stringify({ op: 'fill', days: 30 });
const r = await fetch(BASE + '/api/youtube', { method: 'POST', headers: { 'Content-Type': 'application/json', ...driveSign(key, text) }, body: text, signal: AbortSignal.timeout(120e3) }).catch(() => null);
const j = r ? await r.json().catch(() => ({})) : {};
if (r && (r.status === 429 || r.status === 409)) { console.log('⏭ bỏ qua lượt:', j.error || r.status); process.exit(0); }
if (!r || !r.ok) { console.error('✗ yt fill', r ? r.status : 'fetch', j.error || ''); process.exit(1); }
const lines = [`YouTube trực tiếp: vừa xếp ${j.queued} bài; còn thiếu ${j.short} ngày-kênh (chưa đủ clip bản ngữ đạt QC).`, ...(j.channels || []).map(c => `- ${c.lang} · ${c.title}: ${c.have}/30 ngày${c.queued ? ` (+${c.queued})` : ''}${c.short ? ` · thiếu ${c.short} clip` : ''}`)];
console.log(lines.join('\n'));
if (process.env.GITHUB_STEP_SUMMARY) (await import('node:fs')).appendFileSync(process.env.GITHUB_STEP_SUMMARY, '### Lấp lịch YouTube trực tiếp\n```\n' + lines.join('\n') + '\n```\n');
