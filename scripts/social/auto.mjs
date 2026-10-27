// CI: 1 lượt autopilot social – POST /api/social-auto (ký HMAC LEXKITE_DRIVE_CLI_KEY). Máy chủ làm hết (GrabCast key chỉ ở Pages).
// Dùng: node scripts/social/auto.mjs [run|status]. 429 quota-guard / too-fast → bỏ qua lượt (exit 0, không thử lại).
import { driveCliKey, driveSign } from '../video/library.mjs';

const BASE = String(process.env.LEXKITE_API_BASE || 'https://lexkite.com').replace(/\/+$/, '');
const op = process.argv[2] === 'status' ? 'status' : 'run', key = driveCliKey();
if (!key) { console.log('⏭ chưa có LEXKITE_DRIVE_CLI_KEY – bỏ qua'); process.exit(0); }
const text = JSON.stringify({ op });
const r = await fetch(BASE + '/api/social-auto', { method: 'POST', headers: { 'Content-Type': 'application/json', ...driveSign(key, text) }, body: text, signal: AbortSignal.timeout(240e3) }).catch(e => ({ ok: false, status: 0, json: async () => ({ error: String(e.name || 'fetch') }) }));
const j = await r.json().catch(() => ({}));
if (r.status === 429) { console.log('⏭ bỏ qua lượt:', j.error || 429, j.pct != null ? j.pct + '%' : ''); process.exit(0); }
if (!r.ok) { console.error('✗ social-auto', r.status, j.error || '', j.cause || ''); process.exit(1); }
const x = j.run || j;
console.log(op === 'run' ? `autopilot: đến hạn ${x.due} · tạo ${x.created} · lên lịch ${x.scheduled} · chờ duyệt ${x.review} · lượt GrabCast ${x.calls}${x.stop ? ' · dừng: ' + x.stop : ''}${x.synced ? ' · đồng bộ ' + x.synced.posts + ' bài' : ''}` : JSON.stringify({ cfg: x.cfg, last: x.state && x.state.last_run, budget_left: x.budget_left }));
if (x.skipped && x.skipped.length) console.log('bỏ qua:', x.skipped.map(s => `${s.clip || ''}@${s.ch || ''}:${s.why}`).join(' '));
