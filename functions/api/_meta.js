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
/** Carousel ảnh (Slang Card, docs/DISTRIBUTION.md "Carousel ảnh"). Kiểm tài liệu 22/11/2026 (Graph v26.0): IG child `is_carousel_item=true` + `image_url` (CHỈ JPEG), parent `media_type=CAROUSEL` + `children` (id cách nhau dấu phẩy) + `caption`;
 *  FB: mỗi ảnh POST /{page}/photos {url, published=false} → POST /{page}/feed {message, attached_media[i]={"media_fbid":id}} (+ published=false & scheduled_publish_time: 10 phút–75 ngày). 2–10 ảnh, URL https. */
const imgUrls = (xs, max = 10) => { xs = Array.isArray(xs) ? xs : []; if (xs.length < 2 || xs.length > max || !xs.every(u => /^https:\/\//.test(String(u || '')))) throw Object.assign(new Error('meta'), { meta: true, kind: '', code: 'bad-images', step: 'images' }); return xs.map(String); };
/** Tìm bài feed (đã đăng hoặc đang hẹn giờ) của Page chứa ĐỦ các ảnh này – chống đăng trùng khi lượt trước chết sau lệnh feed (không biết đã tạo bài chưa).
 *  → { ok, post_id|'', scheduled } | { ok: false, code, kind } (không tra được thì KHÔNG đăng mù). */
export async function fbFindCarousel(mc, pageId, photoIds) {
  for (const [edge, scheduled] of [['feed', false], ['scheduled_posts', true]]) {
    const r = await mc('GET', `${pageId}/${edge}`, { fields: 'id,attachments{subattachments{target{id}}}', limit: 25 });
    if (r.status >= 400) return { ok: false, code: r.code || String(r.status), kind: r.kind };
    for (const p of (r.data && r.data.data) || []) {
      const sub = ((((p.attachments || {}).data || [])[0] || {}).subattachments || {}).data || [], got = new Set(sub.map(x => String((x.target || {}).id || '')));
      if (photoIds.length && photoIds.every(id => got.has(id)) && /^[\d_]{5,60}$/.test(String(p.id))) return { ok: true, post_id: String(p.id), scheduled };
    }
  }
  return { ok: true, post_id: '', scheduled: false };
}
/** Bài nhiều ảnh trên Page → { post_id, scheduled, permalink, found? } hoặc ném { meta, kind, code, step } như fbReel.
 *  Chống trùng (như onStart của fbReel): onPhoto(ids) lưu id ảnh NGAY sau mỗi lần tải; photo_ids = ảnh đã tải ở lượt trước (dùng lại, không tải lại);
 *  onFeed() lưu dấu "sắp gọi feed" TRƯỚC lệnh feed; recheck = lượt trước đã đặt dấu đó → tra bài có sẵn (fbFindCarousel) trước khi gọi feed (có rồi → found, không đăng lần 2). */
export async function fbCarousel(mc, pageId, { image_urls, message, at = 0, now = Date.now(), photo_ids = [], onPhoto = null, onFeed = null, recheck = false }) {
  const page = String(pageId), urls = imgUrls(image_urls), err = (r, step) => Object.assign(new Error('meta'), { meta: true, kind: r.kind, code: r.code || String(r.status), step });
  const ids = photo_ids.filter(id => ID.test(String(id))).slice(0, urls.length).map(String);
  for (const url of urls.slice(ids.length)) {
    const r = await mc('POST', `${page}/photos`, { url, published: 'false' }); const id = String((r.data && r.data.id) || '');
    if (r.status >= 400 || !ID.test(id)) throw err(r, 'photo'); ids.push(id); if (onPhoto) await onPhoto(ids.slice());
  }
  if (recheck) {
    const f = await fbFindCarousel(mc, page, ids);
    if (!f.ok) throw err(f, 'recheck');
    if (f.post_id) return { post_id: f.post_id, scheduled: f.scheduled, permalink: `https://www.facebook.com/${f.post_id}`, found: true };
  }
  const sched = at >= now + 15 * 60e3;
  if (onFeed) await onFeed();
  const f = await mc('POST', `${page}/feed`, { message: String(message || '').slice(0, 2200), ...Object.fromEntries(ids.map((id, i) => [`attached_media[${i}]`, JSON.stringify({ media_fbid: id })])), ...(sched ? { published: 'false', scheduled_publish_time: Math.floor(at / 1000) } : {}) });
  const post_id = String((f.data && f.data.id) || '');
  if (f.status >= 400 || !/^[\d_]{5,60}$/.test(post_id)) throw err(f, 'feed');
  return { post_id, scheduled: sched, permalink: `https://www.facebook.com/${post_id}` };
}
/** IG carousel: container con cho từng ảnh → container cha. Trả id cha (rồi dùng igStatus → igQuota → igPublish như Reel).
 *  kids = container con đã tạo ở lượt trước (dùng lại); onChild(kids) lưu NGAY sau mỗi container con. Container cha chưa công khai nên lượt chết trước khi lưu chỉ để lại container mồ côi vô hại;
 *  đăng trùng không thể xảy ra vì media_publish chỉ chạy trên container cha đã lưu (igStatus PUBLISHED → coi như đã đăng). */
export async function igCarouselContainer(mc, igId, { image_urls, caption, kids = [], onChild = null }) {
  const urls = imgUrls(image_urls), err = (r, step) => Object.assign(new Error('meta'), { meta: true, kind: r.kind, code: r.code || String(r.status), step });
  kids = kids.filter(id => ID.test(String(id))).slice(0, urls.length).map(String);
  for (const image_url of urls.slice(kids.length)) {
    const r = await mc('POST', `${igId}/media`, { image_url, is_carousel_item: 'true' }); const id = String((r.data && r.data.id) || '');
    if (r.status >= 400 || !ID.test(id)) throw err(r, 'child'); kids.push(id); if (onChild) await onChild(kids.slice());
  }
  const r = await mc('POST', `${igId}/media`, { media_type: 'CAROUSEL', children: kids.join(','), caption: String(caption || '').slice(0, 2200) }); const id = String((r.data && r.data.id) || '');
  if (r.status >= 400 || !ID.test(id)) throw err(r, 'container');
  return id;
}
/** Trạng thái 1 video FB (kiểm chống trùng khi lượt trước chết sau bước start). */
export async function fbStatus(mc, video_id, post = false) {
  const r = await mc('GET', video_id, { fields: post ? 'is_published,permalink_url' : 'status,permalink_url,published' });
  if (r.status >= 400) return { ok: false, code: r.code, kind: r.kind };
  if (post) return { ok: true, published: r.data.is_published === true, uploaded: true, permalink: r.data.permalink_url ? 'https://www.facebook.com' + String(r.data.permalink_url).replace(/^https:\/\/www\.facebook\.com/, '') : '' }; // bài feed (carousel): is_published
  const s = (r.data && r.data.status) || {};
  return { ok: true, published: !!r.data.published, uploaded: (s.uploading_phase || {}).status === 'complete' || s.video_status === 'ready' || s.video_status === 'processing', permalink: r.data.permalink_url ? 'https://www.facebook.com' + String(r.data.permalink_url).replace(/^https:\/\/www\.facebook\.com/, '') : '' };
}

/** IG Reels: tạo container (Meta tự tải video_url) → chờ status_code FINISHED (lượt sau) → media_publish. */
export async function igContainer(mc, igId, { video_url, caption, cover_url = '' }) {
  const r = await mc('POST', `${igId}/media`, { media_type: 'REELS', video_url, caption: String(caption || '').slice(0, 2200), share_to_feed: 'true', ...(/^https:\/\//.test(cover_url) ? { cover_url } : {}) });
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
/** Bình luận đầu của Page trên Reel/bài của chính Page (docs/DISTRIBUTION.md §6c): POST /{object-id}/comments {message} – Page token,
 *  quyền pages_manage_engagement (Graph reference object/comments, kiểm 05/11/2026). Graph KHÔNG có API ghim bình luận → không ghim.
 *  → { ok, id } | { ok: false, code, kind, status } (không ném: lỗi bình luận không bao giờ làm dừng kênh đăng bài). */
export async function fbComment(mc, objectId, message) {
  const r = await mc('POST', `${objectId}/comments`, { message: String(message || '').slice(0, 8000) }); const id = String((r.data && r.data.id) || '');
  return r.status < 400 && /^[\d_]{5,80}$/.test(id) ? { ok: true, id } : { ok: false, code: r.code || String(r.status), kind: r.kind, status: r.status };
}
/** Tìm bình luận của chính Page có chứa link (chống trùng khi lần trước hết giờ chờ – có thể đã đăng). → { ok, id|'' } */
export async function fbFindComment(mc, objectId, pageId, link) {
  const r = await mc('GET', `${objectId}/comments`, { fields: 'id,message,from', filter: 'toplevel', order: 'reverse_chronological', limit: 50 });
  if (r.status >= 400) return { ok: false, code: r.code, kind: r.kind };
  const hit = ((r.data && r.data.data) || []).find(c => c && c.from && String(c.from.id) === String(pageId) && String(c.message || '').includes(link));
  return { ok: true, id: hit ? String(hit.id) : '' };
}
