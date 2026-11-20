// CI: 1 lượt autopilot social – POST /api/social-auto (ký HMAC LEXKITE_DRIVE_CLI_KEY). Máy chủ làm hết (GrabCast key chỉ ở Pages).
// Dùng: node scripts/social/auto.mjs [run|status|preview [clip]] – preview = dry-run, in payload từng nền tảng, không đăng. 429 quota-guard / too-fast → bỏ qua lượt (exit 0, không thử lại).
// Cảnh báo (failover sang Meta, token Meta sắp hết/bị thu hồi, GrabCast hồi phục, đăng trùng): máy chủ giao 1 lần trong run.alerts →
// mở 1 issue nhãn social-alert (GitHub gửi email cho người theo dõi repo); trùng tiêu đề issue đang mở → thêm bình luận thay vì issue mới.
import { driveCliKey, driveSign } from '../video/library.mjs';
import { alert } from './alert.mjs';

const BASE = String(process.env.LEXKITE_API_BASE || 'https://lexkite.com').replace(/\/+$/, '');
const op = ['status', 'preview'].includes(process.argv[2]) ? process.argv[2] : 'run', key = driveCliKey();
if (!key) { console.log('⏭ chưa có LEXKITE_DRIVE_CLI_KEY – bỏ qua'); process.exit(0); }
// THÔNG LƯỢNG (20/11): mỗi lượt máy chủ bị khóa 60 s (tránh 524) nên chỉ tạo ~2–3 bài; backlog 46 bài/34 kênh không hết. Lượt `run` lặp tối đa MAX_PASSES lần trong 1 job
// (mỗi lượt = 1 request riêng ≤ 60 s; giới hạn máy chủ 6 request/10 phút/IP) cho tới khi hết việc (tạo + lên lịch = 0), gặp dừng/lỗi, hoặc quá ngân sách thời gian job.
if (op === 'run' && !process.env.AUTO_PASS) {
  const { spawnSync } = await import('node:child_process'), MAX_PASSES = 5, T0 = Date.now();
  for (let i = 1; i <= MAX_PASSES; i++) {
    const c = spawnSync(process.execPath, [process.argv[1], 'run'], { env: { ...process.env, AUTO_PASS: String(i) }, encoding: 'utf8', timeout: 150e3 });
    process.stdout.write((i > 1 ? `── lượt ${i} ──\n` : '') + (c.stdout || '')); process.stderr.write(c.stderr || '');
    if (c.status !== 0) process.exit(c.status || 1);
    const m = /tạo (\d+) · lên lịch (\d+)/.exec(c.stdout || ''), did = m ? +m[1] + +m[2] : 0;
    if (!did || /dừng:/.test(c.stdout || '') || /bỏ qua lượt/.test(c.stdout || '') || Date.now() - T0 > 5 * 60e3) break;
  }
  process.exit(0);
}
const text = JSON.stringify(op === 'preview' && process.argv[3] ? { op, clip: process.argv[3] } : { op });
const r = await fetch(BASE + '/api/social-auto', { method: 'POST', headers: { 'Content-Type': 'application/json', ...driveSign(key, text) }, body: text, signal: AbortSignal.timeout(120e3) }).catch(e => ({ ok: false, status: 0, json: async () => ({ error: String(e.name || 'fetch') }) }));
const j = await r.json().catch(() => ({}));
if (r.status === 429) { console.log('⏭ bỏ qua lượt:', j.error || 429, j.pct != null ? j.pct + '%' : ''); process.exit(0); }
if (!r.ok) { console.error('✗ social-auto', r.status, j.error || '', j.cause || ''); process.exit(1); }
if (op === 'preview') { console.log(j.text || JSON.stringify(j.preview, null, 1)); console.log(`\n(dry-run: đăng ${j.posted ?? 0} · lượt GrabCast ${j.grabcast_calls ?? 0})`); process.exit(0); }
const x = j.run || j;
console.log(op === 'run' ? `autopilot: đến hạn ${x.due} · tạo ${x.created} · lên lịch ${x.scheduled} · chờ duyệt ${x.review} · lượt GrabCast ${x.calls}${x.stop ? ' · dừng: ' + x.stop : ''}${x.synced ? ' · đồng bộ ' + x.synced.posts + ' bài' : ''}${x.provider ? ' · đường FB/IG ' + x.provider.cur + (x.provider.why ? ' (' + x.provider.why + ')' : '') : ''}${x.meta && x.meta.calls ? ` · Meta: đăng ${x.meta.posted} · hẹn ${x.meta.scheduled} · container ${x.meta.containers} · ${x.meta.calls} lượt Graph${x.meta.stop ? ' · dừng ' + x.meta.stop : ''}` : ''}` : JSON.stringify({ cfg: x.cfg, last: x.state && x.state.last_run, budget_left: x.budget_left }));
if (x.health) console.log(`chuỗi đăng: kênh ${x.health.channels ? 'có' : 'CHƯA CÓ'} · clip đã duyệt ${x.health.approved ? 'có' : 'CHƯA CÓ'} · lịch sắp tới ${x.health.planned ? 'có' : 'CHƯA CÓ'}${x.health.newest_days != null ? ' · clip mới nhất ' + x.health.newest_days + ' ngày trước' : ''}${x.auto_queued ? ' · vừa duyệt theo QC ' + x.auto_queued + ' clip' : ''}${x.planned ? ' · vừa xếp ' + x.planned + ' bài' : ''}`);
if (x.skipped && x.skipped.length) console.log('bỏ qua:', x.skipped.map(s => `${s.clip || ''}@${s.ch || ''}:${s.why}`).join(' '));
for (const a of x.alerts || []) await alert(a);
