// Theo dõi thương hiệu (thuần, fetch tiêm vào; test: scripts/test/pr-check.mjs): tên miền na ná (DNS qua DoH JSON của Cloudflare)
// + tên tài khoản mạng xã hội (chỉ nơi đọc được hồ sơ công khai không cần đăng nhập). Không tra WHOIS, không cào máy tìm kiếm.
import { PLATFORMS, HANDLE_STATUSES, profileUrl, validateHandle } from '../../functions/api/_bw.js';
export { PLATFORMS, HANDLE_STATUSES, profileUrl, validateHandle };
const ORDER = { ok: 0, skip: 0, manual: 1, change: 2, regression: 3 };

/** Danh sách tên miền cần theo dõi từ content/brand/watch.json (bỏ tên miền của mình, trùng, sai định dạng). */
export function domainList(cfg) {
  const d = (cfg && cfg.domains) || {}, own = new Set((cfg && cfg.own) || []), base = d.base || 'lexkite';
  const all = [...(d.tlds || []).map(t => `${base}.${t}`), ...(d.typos || [])].map(x => String(x).toLowerCase().trim());
  return [...new Set(all)].filter(x => /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(x) && !own.has(x));
}
/** Câu trả lời DoH (application/dns-json) → { status: 'nx'|'ok'|'err', records: bool, hosts: [] } */
export function parseDoh(j, type) {
  if (!j || typeof j.Status !== 'number') return { status: 'err', records: false, hosts: [] };
  if (j.Status === 3) return { status: 'nx', records: false, hosts: [] };
  if (j.Status !== 0) return { status: 'err', records: false, hosts: [] };
  const code = { A: 1, NS: 2, MX: 15, AAAA: 28 }[type];
  const ans = (j.Answer || []).filter(a => a.type === code).map(a => String(a.data || '').replace(/^\d+\s+/, '').replace(/\.$/, '').toLowerCase()).filter(Boolean);
  return { status: 'ok', records: ans.length > 0, hosts: ans.slice(0, 4) };
}
const DOH = 'https://cloudflare-dns.com/dns-query';
/** Kiểm DNS 1 tên miền: NS (đã đăng ký?), A, AAAA, MX. get = makeFetcher(). → { domain, status, ns, a, aaaa, mx, mxHosts, ips } */
export async function checkDomain(domain, get) {
  const q = async type => { const r = await get(`${DOH}?name=${encodeURIComponent(domain)}&type=${type}`, { accept: 'application/dns-json' }); let j = null; try { j = JSON.parse(r.body || 'null'); } catch { j = null; } return r.status === 200 ? parseDoh(j, type) : { status: 'err', records: false, hosts: [] }; };
  const ns = await q('NS'), a = await q('A'), aaaa = await q('AAAA'), mx = await q('MX');
  const st = [ns, a, aaaa, mx]; const status = st.every(x => x.status === 'err') ? 'err' : st.some(x => x.status === 'ok') ? 'ok' : 'nx';
  return { domain, status, ns: ns.records, a: a.records, aaaa: aaaa.records, mx: mx.records, mxHosts: mx.hosts, ips: [...a.hosts, ...aaaa.hosts].slice(0, 4) };
}
/** So với lần trước: tên miền trước không có A/AAAA/MX nay phân giải → regression 'resolves'; MX mới xuất hiện → regression 'mx-added'.
 * Báo động giữ nguyên tới khi anh bấm "Đã xem" (prev.acked) – không tự tắt sau 1 ngày. Lần đầu = mốc (không báo). */
export function classifyDomain(cur, prev) {
  if (cur.status === 'err') return { level: 'manual', reasons: ['dns-error'] };
  const any = x => !!(x && (x.a || x.aaaa || x.mx));
  if (!prev) return { level: 'ok', reasons: any(cur) ? ['baseline-active'] : cur.ns ? ['registered'] : [] };
  const reasons = []; let level = 'ok';
  if (!any(prev) && any(cur)) { reasons.push('resolves'); level = 'regression'; }
  if (!prev.mx && cur.mx) { reasons.push('mx-added'); level = 'regression'; }
  if (!prev.ns && cur.ns && !any(cur)) { reasons.push('registered'); level = 'change'; }
  if (level === 'ok' && prev.level === 'regression' && !prev.acked && any(cur)) return { level: 'regression', reasons: (prev.reasons && prev.reasons.length ? prev.reasons : ['resolves']).filter(r => r !== 'baseline-active') };
  if (!reasons.length && any(cur)) reasons.push('active');
  return { level, reasons };
}

// Chỉ kiểm tự động nơi có API/trang công khai trả 200/404 rõ ràng, không cần đăng nhập, không vi phạm điều khoản. Còn lại → unknown (kiểm tay).
export const AUTO = new Set(['github', 'bluesky', 'youtube']);
/** Có tồn tại tài khoản không? → true | false | null (không chắc). */
export async function handleExists(platform, handle, get, { ghHeaders = {} } = {}) {
  const h = String(handle || '').replace(/^@/, '');
  if (!AUTO.has(platform) || !/^[A-Za-z0-9_.-]{1,60}$/.test(h)) return null;
  if (platform === 'github') { const r = await get(`https://api.github.com/users/${encodeURIComponent(h)}`, { accept: 'application/vnd.github+json', headers: ghHeaders }); return r.status === 200 ? true : r.status === 404 ? false : null; }
  if (platform === 'bluesky') {
    const r = await get(`https://public.api.bsky.app/xrpc/com.atproto.identity.resolveHandle?handle=${encodeURIComponent(h.includes('.') ? h : h + '.bsky.social')}`, { accept: 'application/json' });
    if (r.status === 200) return true; if (r.status === 400 && /resolve handle|InvalidRequest|not found/i.test(r.body || '')) return false; return null;
  }
  if (platform === 'youtube') { const r = await get(profileUrl('youtube', h)); if (r.status === 404) return false; if (r.status === 200 && !/consent\.(youtube|google)\.com/.test(r.url || '') && /"(channelId|externalId)"/.test(r.body || '')) return true; return null; }
  return null;
}
/** Tình trạng tài khoản. owned + còn → ours · owned + mất → missing (regression: bị khóa/xóa) · chưa giữ + có người dùng → taken (change)
 * · chưa giữ + trống → available (ok – nên giữ ngay) · không kiểm được → unknown (manual). */
export function classifyHandle(h, exists, prev) {
  const owned = h.status === 'owned';
  if (exists == null) return { state: 'unknown', level: 'manual', reasons: [AUTO.has(h.platform) ? 'check-failed' : 'manual-only'] };
  if (owned) return exists ? { state: 'ours', level: 'ok', reasons: [] } : { state: 'missing', level: 'regression', reasons: ['missing'] };
  if (exists) return { state: 'taken', level: 'change', reasons: [prev && prev.state === 'available' ? 'taken-now' : 'taken'] };
  return { state: 'available', level: 'ok', reasons: ['claim'] };
}
export const worst = levels => levels.reduce((a, b) => (ORDER[b] > ORDER[a] ? b : a), 'ok');

