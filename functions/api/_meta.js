/* Client Meta Graph API phía máy chủ – đường DỰ PHÒNG của autopilot social khi GrabCast lỗi (docs/DISTRIBUTION.md §6b).
 * Chỉ đăng lên Page Lexkite + IG Business đã liên kết của CHÍNH owner: app Meta ở chế độ Development, owner là admin của app → quyền
 * pages_manage_posts / pages_read_engagement / instagram_basic / instagram_content_publish dùng Standard Access, không cần App Review
 * (kiểm 27/10/2026: developers.facebook.com/docs/graph-api/overview/access-levels + instagram-platform/content-publishing, Graph v26.0).
 * Secret Pages: META_PAGE_TOKEN (Page token dài hạn – lấy từ user token dài hạn → không hết hạn), META_PAGE_ID, META_IG_ID; tùy chọn META_GRAPH_VERSION.
 * Token chỉ gắn vào header Authorization ở đây: không bao giờ vào URL, log, D1 hay nội dung trả về (scrub). */
export const GRAPH = 'https://graph.facebook.com';
export const RUPLOAD = 'https://rupload.facebook.com/video-upload';
export const VER = 'v26.0';
export const IG_DAY_CAP = 25; // trần riêng của Lexkite / 24 giờ (Meta hiện cho 100 – đọc content_publishing_limit, lấy số nhỏ hơn)
const TIMEOUT = 20000;
const ID = /^\d{5,30}$/;
export const metaConfigured = env => String(env.META_PAGE_TOKEN || '').length >= 40 && ID.test(String(env.META_PAGE_ID || ''));
export const igConfigured = env => metaConfigured(env) && ID.test(String(env.META_IG_ID || ''));
export const scrubTok = (text, tok) => (tok && tok.length >= 20 ? String(text).split(tok).join('***') : String(text));
/** Mã lỗi Graph → loại: token (190/102/463/467 – hết hạn/bị thu hồi), perm (10/200–299), rate (4/17/32/613/80001–80014), '' = lỗi riêng 1 bài. */
export function metaKind(code, status) {
  code = +code || 0;
  if ([190, 102, 463, 467].includes(code)) return 'token';
  if (code === 10 || (code >= 200 && code <= 299)) return 'perm';
  if ([4, 17, 32, 613].includes(code) || (code >= 80001 && code <= 80014)) return 'rate';
  if (!code && (status === 401 || status === 403)) return 'token';
  if (status === 429) return 'rate';
  if (status >= 500 || status === 504) return 'down';
  return '';
}
/** → mc(method, path, params?, { url, headers }) → { status, data, code, kind } – path tương đối sau /<ver>/. onCall() đếm lượt gọi. */
export function metaClient(env, { fetcher = fetch, onCall = null } = {}) {
  const tok = String(env.META_PAGE_TOKEN || ''), ver = /^v\d{2}\.\d$/.test(String(env.META_GRAPH_VERSION || '')) ? env.META_GRAPH_VERSION : VER;
  const mc = async (m, p, params, o = {}) => {
    const url = new URL(o.url || `${GRAPH}/${ver}/${p}`), headers = { Authorization: 'Bearer ' + tok, Accept: 'application/json', ...(o.headers || {}) };
    let body;
    if (m === 'GET') { for (const [k, v] of Object.entries(params || {})) if (v != null) url.searchParams.set(k, String(v)); }
    else { const f = new URLSearchParams(); for (const [k, v] of Object.entries(params || {})) if (v != null && v !== '') f.set(k, String(v)); body = f.toString(); headers['Content-Type'] = 'application/x-www-form-urlencoded'; }
    const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), TIMEOUT);
    let st = 502, text = '';
    try { const r = await fetcher(url.toString(), { method: m, headers, body, signal: ctl.signal }); st = r.status; text = await r.text(); }
    catch (e) { clearTimeout(timer); if (onCall) onCall(504); return { status: 504, data: { error: 'timeout' }, code: ctl.signal.aborted ? 'timeout' : 'upstream', kind: 'down' }; }
    clearTimeout(timer); if (onCall) onCall(st);
    let data; try { data = JSON.parse(scrubTok(text, tok)); } catch (e) { data = { message: scrubTok(text, tok).slice(0, 200) }; }
    const er = data && data.error && typeof data.error === 'object' ? data.error : null;
    const code = st >= 400 || er ? String((er && (er.error_subcode ? er.code + '.' + er.error_subcode : er.code)) || st) : '';
    return { status: er && st < 400 ? 400 : st, data, code, kind: st >= 400 || er ? metaKind(er && er.code, st) : '' };
  };
  mc.ver = ver;
  return mc;
}

/** Sức khỏe token (≤ 1 lần/ngày): debug_token trên chính token → hợp lệ? hết hạn khi nào (0 = không hết hạn)? quyền dữ liệu hết hạn khi nào? */
export async function tokenHealth(mc, env, now = Date.now()) {
  const r = await mc('GET', 'debug_token', { input_token: String(env.META_PAGE_TOKEN || '') });
  if (r.kind === 'token') return { ok: false, why: 'revoked', code: r.code, at: now };
  if (r.status >= 400) { // debug_token không dùng được → thử đọc Page
    const p = await mc('GET', String(env.META_PAGE_ID), { fields: 'id' });
    return p.status < 400 ? { ok: true, why: 'unknown-expiry', at: now } : { ok: false, why: p.kind === 'token' ? 'revoked' : 'error', code: p.code, at: now };
  }
  const d = (r.data && r.data.data) || {}, exp = +d.expires_at || 0, dax = +d.data_access_expires_at || 0, scopes = d.scopes || [];
  const soon = t => t > 0 && t * 1000 - now < 7 * 864e5;
  if (d.is_valid === false) return { ok: false, why: 'revoked', at: now };
  const miss = ['pages_manage_posts', 'pages_read_engagement', ...(igConfigured(env) ? ['instagram_content_publish'] : [])].filter(s => scopes.length && !scopes.includes(s));
  return { ok: !soon(exp) && !soon(dax) && !miss.length, why: miss.length ? 'missing-scope' : soon(exp) ? 'expiring' : soon(dax) ? 'data-access-expiring' : '', expires_at: exp * 1000 || 0, data_access_expires_at: dax * 1000 || 0, missing: miss, at: now };
}

/** Reel Facebook Page qua Reels API (3 lượt): start → rupload (Meta tự tải file_url) → finish (PUBLISHED, hoặc SCHEDULED nếu at ≥ now + 15 phút).
 * Trả { video_id, scheduled, permalink } hoặc ném lỗi { meta: true, kind, code, step }. onStart(video_id) lưu id NGAY sau bước 1 (chống trùng khi lượt chết giữa chừng). */
export async function fbReel(mc, env, { file_url, description, title, at = 0, now = Date.now(), video_id = '', onStart = null }) {
  const page = String(env.META_PAGE_ID), err = (r, step) => Object.assign(new Error('meta'), { meta: true, kind: r.kind, code: r.code || String(r.status), step });
  if (!video_id) {
    const s = await mc('POST', `${page}/video_reels`, { upload_phase: 'start' }); const vid = String((s.data && s.data.video_id) || '');
    if (s.status >= 400 || !ID.test(vid)) throw err(s, 'start');
    video_id = vid; if (onStart) await onStart(vid);
    const u = await mc('POST', '', null, { url: `${RUPLOAD}/${mc.ver}/${vid}`, headers: { file_url } });
    if (u.status >= 400) throw err(u, 'upload');
  }
  const sched = at >= now + 15 * 60e3;
  const f = await mc('POST', `${page}/video_reels`, { upload_phase: 'finish', video_id, video_state: sched ? 'SCHEDULED' : 'PUBLISHED', scheduled_publish_time: sched ? Math.floor(at / 1000) : null, description: String(description || '').slice(0, 2200), title: title ? String(title).slice(0, 100) : null });
  if (f.status >= 400 || (f.data && f.data.success === false)) throw err(f, 'finish');
  return { video_id, scheduled: sched, permalink: `https://www.facebook.com/reel/${video_id}` };
}
/** Trạng thái 1 video FB (kiểm chống trùng khi lượt trước chết sau bước start). */
export async function fbStatus(mc, video_id) {
  const r = await mc('GET', video_id, { fields: 'status,permalink_url,published' });
  if (r.status >= 400) return { ok: false, code: r.code, kind: r.kind };
  const s = (r.data && r.data.status) || {};
  return { ok: true, published: !!r.data.published, uploaded: (s.uploading_phase || {}).status === 'complete' || s.video_status === 'ready' || s.video_status === 'processing', permalink: r.data.permalink_url ? 'https://www.facebook.com' + String(r.data.permalink_url).replace(/^https:\/\/www\.facebook\.com/, '') : '' };
}

/** IG Reels: tạo container (Meta tự tải video_url) → chờ status_code FINISHED (lượt sau) → media_publish. */
export async function igContainer(mc, env, { video_url, caption }) {
  const r = await mc('POST', `${env.META_IG_ID}/media`, { media_type: 'REELS', video_url, caption: String(caption || '').slice(0, 2200), share_to_feed: 'true' });
  const id = String((r.data && r.data.id) || '');
  if (r.status >= 400 || !ID.test(id)) throw Object.assign(new Error('meta'), { meta: true, kind: r.kind, code: r.code || String(r.status), step: 'container' });
  return id;
}
/** → IN_PROGRESS | FINISHED | ERROR | EXPIRED | PUBLISHED | '' (lỗi gọi) */
export async function igStatus(mc, cid) {
  const r = await mc('GET', cid, { fields: 'status_code,status' });
  return r.status >= 400 ? { code: '', err: r.code, kind: r.kind } : { code: String((r.data && r.data.status_code) || ''), detail: String((r.data && r.data.status) || '').slice(0, 120) };
}
/** Số bài IG đã đăng qua API trong 24 giờ + trần (min của Meta và IG_DAY_CAP). */
export async function igQuota(mc, env) {
  const r = await mc('GET', `${env.META_IG_ID}/content_publishing_limit`, { fields: 'quota_usage,config' });
  if (r.status >= 400) return { ok: false, code: r.code, kind: r.kind };
  const d = ((r.data && r.data.data) || [])[0] || {}, total = +((d.config || {}).quota_total) || 100;
  return { ok: true, used: +d.quota_usage || 0, cap: Math.min(total, IG_DAY_CAP) };
}
export async function igPublish(mc, env, cid) {
  const r = await mc('POST', `${env.META_IG_ID}/media_publish`, { creation_id: cid }); const id = String((r.data && r.data.id) || '');
  if (r.status >= 400 || !ID.test(id)) throw Object.assign(new Error('meta'), { meta: true, kind: r.kind, code: r.code || String(r.status), step: 'publish' });
  const g = await mc('GET', id, { fields: 'permalink' });
  return { media_id: id, permalink: g.status < 400 && /^https:\/\/www\.instagram\.com\//.test(String((g.data || {}).permalink || '')) ? g.data.permalink : '' };
}
