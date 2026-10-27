// CI: 1 lượt autopilot social – POST /api/social-auto (ký HMAC LEXKITE_DRIVE_CLI_KEY). Máy chủ làm hết (GrabCast key chỉ ở Pages).
// Dùng: node scripts/social/auto.mjs [run|status]. 429 quota-guard / too-fast → bỏ qua lượt (exit 0, không thử lại).
// Cảnh báo (failover sang Meta, token Meta sắp hết/bị thu hồi, GrabCast hồi phục, đăng trùng): máy chủ giao 1 lần trong run.alerts →
// mở 1 issue nhãn social-alert (GitHub gửi email cho người theo dõi repo); trùng tiêu đề issue đang mở → thêm bình luận thay vì issue mới.
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
console.log(op === 'run' ? `autopilot: đến hạn ${x.due} · tạo ${x.created} · lên lịch ${x.scheduled} · chờ duyệt ${x.review} · lượt GrabCast ${x.calls}${x.stop ? ' · dừng: ' + x.stop : ''}${x.synced ? ' · đồng bộ ' + x.synced.posts + ' bài' : ''}${x.provider ? ' · đường FB/IG ' + x.provider.cur + (x.provider.why ? ' (' + x.provider.why + ')' : '') : ''}${x.meta && x.meta.calls ? ` · Meta: đăng ${x.meta.posted} · hẹn ${x.meta.scheduled} · container ${x.meta.containers} · ${x.meta.calls} lượt Graph${x.meta.stop ? ' · dừng ' + x.meta.stop : ''}` : ''}` : JSON.stringify({ cfg: x.cfg, last: x.state && x.state.last_run, budget_left: x.budget_left }));
if (x.skipped && x.skipped.length) console.log('bỏ qua:', x.skipped.map(s => `${s.clip || ''}@${s.ch || ''}:${s.why}`).join(' '));
for (const a of x.alerts || []) await alert(a);

async function alert(a) {
  const tok = process.env.GITHUB_TOKEN, repo = process.env.GITHUB_REPOSITORY;
  const title = '🛰️ Social autopilot: ' + String(a.k || 'alert').split(':')[0], body = `${a.text}\n\n- khóa: \`${a.k}\`\n- lúc: ${new Date(a.at || Date.now()).toISOString()}\n- Quản trị › Video & Social › Hàng đợi › Autopilot · docs/DISTRIBUTION.md §6b`;
  console.log('⚠️', a.k, '–', a.text);
  if (!tok || !repo) return;
  const gh = (path, init = {}) => fetch('https://api.github.com/repos/' + repo + path, { ...init, headers: { Authorization: 'Bearer ' + tok, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' } }).catch(() => null);
  const open = await gh('/issues?state=open&labels=social-alert&per_page=30'), list = open && open.ok ? await open.json() : [];
  const ex = list.find(i => i.title === title);
  const r = ex ? await gh(`/issues/${ex.number}/comments`, { method: 'POST', body: JSON.stringify({ body }) }) : await gh('/issues', { method: 'POST', body: JSON.stringify({ title, body, labels: ['social-alert'] }) });
  console.log(r && r.ok ? (ex ? '↳ bình luận issue #' + ex.number : '↳ đã mở issue') : '✗ không mở được issue ' + (r ? r.status : ''));
}
