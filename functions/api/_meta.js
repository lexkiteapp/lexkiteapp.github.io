/* Client Meta phía máy chủ – đường DỰ PHÒNG của autopilot social khi GrabCast lỗi (docs/DISTRIBUTION.md §6b). Mỗi kênh một token, tách biệt:
 *  · FB Page: Graph API (graph.facebook.com) + Page token không hết hạn, lấy từ user token dài hạn của tài khoản GIỮ Page – tài khoản đó là
 *    Tester của app Meta riêng của Lexkite (chế độ Development, KHÔNG gắn Business Portfolio) → Standard Access, không cần App Review.
 *  · IG: "Instagram API with Instagram Login" (graph.instagram.com, IG Professional, không cần Page/BM) – token 60 ngày, tự refresh (refreshToken).
 * Token (lưu mã hóa ở D1 soc_tokens – functions/api/_meta_tokens.js, hoặc secret khởi tạo) chỉ gắn vào header ở đây (riêng refresh/debug_token Meta
 * bắt buộc để trong query) – không bao giờ vào log, D1 bản rõ hay nội dung trả về (scrub). Kiểm tài liệu 27/10/2026: Graph v26.0. */
export const GRAPH = 'https://graph.facebook.com';
export const IGRAPH = 'https://graph.instagram.com';
export const RUPLOAD = 'https://rupload.facebook.com/video-upload';
export const VER = 'v26.0';
export const IG_DAY_CAP = 25; // trần riêng của Lexkite / 24 giờ (Meta hiện cho 100 – đọc content_publishing_limit, lấy số nhỏ hơn)
const TIMEOUT = 20000;
const ID = /^\d{5,30}$/;
export const okId = v => ID.test(String(v || ''));
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
/** host 'fb' = graph.facebook.com (Page token) · 'ig' = graph.instagram.com (Instagram Login token). */
export function metaClient(env, { token = '', host = 'fb', fetcher = fetch, onCall = null } = {}) {
  const tok = String(token || ''), ver = /^v\d{2}\.\d$/.test(String(env.META_GRAPH_VERSION || '')) ? env.META_GRAPH_VERSION : VER, base = host === 'ig' ? IGRAPH : GRAPH;
  const mc = async (m, p, params, o = {}) => {
    const url = new URL(o.url || `${base}/${ver}/${p}`), headers = { Authorization: 'Bearer ' + tok, Accept: 'application/json', ...(o.headers || {}) };
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
  mc.ver = ver; mc.host = host; mc.tok = () => tok;
  return mc;
}

/** Sức khỏe token (≤ 1 lần/ngày): debug_token trên chính token → hợp lệ? hết hạn khi nào (0 = không hết hạn)? quyền dữ liệu hết hạn khi nào? */
export async function tokenHealth(mc, pageId, now = Date.now()) {
  const r = await mc('GET', 'debug_token', { input_token: mc.tok() });
  if (r.kind === 'token') return { ok: false, why: 'revoked', code: r.code, at: now };
  if (r.status >= 400) { // debug_token không dùng được → thử đọc Page
    const p = await mc('GET', String(pageId), { fields: 'id' });
    return p.status < 400 ? { ok: true, why: 'unknown-expiry', at: now } : { ok: false, why: p.kind === 'token' ? 'revoked' : 'error', code: p.code, at: now };
  }
  const d = (r.data && r.data.data) || {}, exp = +d.expires_at || 0, dax = +d.data_access_expires_at || 0, scopes = d.scopes || [];
  const soon = t => t > 0 && t * 1000 - now < 7 * 864e5;
  if (d.is_valid === false) return { ok: false, why: 'revoked', at: now };
  const miss = ['pages_manage_posts', 'pages_read_engagement'].filter(s => scopes.length && !scopes.includes(s));
  return { ok: !soon(exp) && !soon(dax) && !miss.length, why: miss.length ? 'missing-scope' : soon(exp) ? 'expiring' : soon(dax) ? 'data-access-expiring' : '', expires_at: exp * 1000 || 0, data_access_expires_at: dax * 1000 || 0, missing: miss, at: now };
}

/** Reel Facebook Page qua Reels API (3 lượt): start → rupload (Meta tự tải file_url) → finish (PUBLISHED, hoặc SCHEDULED nếu at ≥ now + 15 phút).
 * Trả { video_id, scheduled, permalink } hoặc ném lỗi { meta: true, kind, code, step }. onStart(video_id) lưu id NGAY sau bước 1 (chống trùng khi lượt chết giữa chừng). */
export async function fbReel(mc, pageId, { file_url, description, title, at = 0, now = Date.now(), video_id = '', onStart = null }) {
  const page = String(pageId), err = (r, step) => Object.assign(new Error('meta'), { meta: true, kind: r.kind, code: r.code || String(r.status), step });
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
export async function igContainer(mc, igId, { video_url, caption }) {
  const r = await mc('POST', `${igId}/media`, { media_type: 'REELS', video_url, caption: String(caption || '').slice(0, 2200), share_to_feed: 'true' });
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
export async function igQuota(mc, igId) {
  const r = await mc('GET', `${igId}/content_publishing_limit`, { fields: 'quota_usage,config' });
  if (r.status >= 400) return { ok: false, code: r.code, kind: r.kind };
  const d = ((r.data && r.data.data) || [])[0] || {}, total = +((d.config || {}).quota_total) || 100;
  return { ok: true, used: +d.quota_usage || 0, cap: Math.min(total, IG_DAY_CAP) };
}
export async function igPublish(mc, igId, cid) {
  const r = await mc('POST', `${igId}/media_publish`, { creation_id: cid }); const id = String((r.data && r.data.id) || '');
  if (r.status >= 400 || !ID.test(id)) throw Object.assign(new Error('meta'), { meta: true, kind: r.kind, code: r.code || String(r.status), step: 'publish' });
  const g = await mc('GET', id, { fields: 'permalink' });
  return { media_id: id, permalink: g.status < 400 && /^https:\/\/www\.instagram\.com\//.test(String((g.data || {}).permalink || '')) ? g.data.permalink : '' };
}
/** Kiểm token IG (Instagram Login) khi lưu: → { ok, user_id, username } */
export async function igMe(mc) {
  const r = await mc('GET', 'me', { fields: 'user_id,username' });
  return r.status < 400 && okId(r.data && (r.data.user_id || r.data.id)) ? { ok: true, user_id: String(r.data.user_id || r.data.id), username: String(r.data.username || '').slice(0, 60) } : { ok: false, code: r.code, kind: r.kind };
}
/** Kiểm Page token khi lưu: → { ok, name } */
export async function fbPage(mc, pageId) {
  const r = await mc('GET', String(pageId), { fields: 'id,name' });
  return r.status < 400 && r.data && String(r.data.id) === String(pageId) ? { ok: true, name: String(r.data.name || '').slice(0, 80) } : { ok: false, code: r.code, kind: r.kind };
}
/** Refresh token IG dài hạn (≥ 24 giờ tuổi, chưa hết hạn) → { ok, token, expires_at } – 60 ngày từ lúc refresh. */
export async function igRefresh(mc, now = Date.now()) {
  const r = await mc('GET', '', null, { url: `${IGRAPH}/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(mc.tok())}` });
  const t = String((r.data && r.data.access_token) || '');
  return r.status < 400 && t.length >= 20 ? { ok: true, token: t, expires_at: now + (+r.data.expires_in || 5184000) * 1000 } : { ok: false, code: r.code, kind: r.kind };
}
