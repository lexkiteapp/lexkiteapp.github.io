/* Kho token Meta theo KÊNH cho đường dự phòng của autopilot social (docs/DISTRIBUTION.md §6b) – mỗi kênh dist_ext (gc-facebook_page-…, gc-instagram-…)
 * một token riêng, đổi được trong Quản trị; 1 kênh lỗi/bị khóa không ảnh hưởng kênh khác.
 * D1 soc_tokens: token mã hóa AES-GCM bằng KEYS_ENC_KEY (encryptKey của _keys.js, AAD "apikey:soctok:<kênh>") + last4, hạn, trạng thái.
 * Khởi tạo không qua Quản trị (tùy chọn): secret META_PAGE_TOKEN + META_PAGE_ID (FB) · META_IG_TOKEN + META_IG_ID (IG Login) – gán cho kênh DUY NHẤT của
 * nền tảng (hoặc cfg.meta_map); lần refresh IG đầu tiên chép token mới vào D1 (secret không ghi lại được). Không bao giờ trả về/ghi log token. */
import { encryptKey, decryptKey, encReady } from './_keys.js';
import { metaClient, okId, igMe, fbPage, igRefresh } from './_meta.js';

const CH = /^gc-(facebook_page|instagram)-[A-Za-z0-9_-]{1,40}$/;
export const KIND = { facebook_page: 'fb', instagram: 'ig' };
export const IG_REFRESH_BEFORE = 10 * 864e5; // refresh khi còn ≤ 10 ngày (≈ ngày 50 của 60)
const one = (db, q, ...a) => db.prepare(q).bind(...a).first();
const all = async (db, q, ...a) => (await db.prepare(q).bind(...a).all()).results || [];
const run = (db, q, ...a) => db.prepare(q).bind(...a).run();
const fail = (status, code) => Object.assign(new Error(code), { status, code });
const kid = ch => 'soctok:' + ch;
const last4 = t => String(t).slice(-4);
const platOfCh = ch => (CH.exec(ch) || [])[1] || '';

/** Kênh dùng env khởi tạo: kênh duy nhất của nền tảng, hoặc cfg.meta_map. */
export function envChannel(p, chans, map = {}) {
  if (map[p]) return chans.some(c => c.channel_id === map[p]) ? map[p] : null;
  const xs = chans.filter(c => c.platform === p); return xs.length === 1 ? xs[0].channel_id : null;
}
/** Danh sách kênh Meta dùng được (không có token bản rõ): D1 trước, env lấp chỗ trống. */
export async function metaChannels(env, db, cfg = {}) {
  const rows = await all(db, 'SELECT channel_id, kind, target_id, name, last4, expires_at, refreshed_at, status, err, updated FROM soc_tokens LIMIT 20');
  const chans = await all(db, "SELECT channel_id, platform, title FROM dist_ext WHERE platform IN ('facebook_page', 'instagram') LIMIT 20");
  const out = rows.map(r => ({ ...r, platform: platOfCh(r.channel_id), src: 'd1', title: (chans.find(c => c.channel_id === r.channel_id) || {}).title || null }));
  const envs = [['facebook_page', env.META_PAGE_TOKEN, env.META_PAGE_ID], ['instagram', env.META_IG_TOKEN, env.META_IG_ID]];
  for (const [p, tok, id] of envs) {
    if (String(tok || '').length < 20 || !okId(id)) continue;
    const ch = envChannel(p, chans, cfg.meta_map || {}); if (!ch || out.some(r => r.channel_id === ch)) continue;
    out.push({ channel_id: ch, kind: KIND[p], target_id: String(id), name: null, last4: last4(tok), expires_at: null, refreshed_at: null, status: 'ok', err: null, platform: p, src: 'env', title: (chans.find(c => c.channel_id === ch) || {}).title || null });
  }
  return { list: out, chans };
}
/** Token bản rõ cho 1 kênh (chỉ dùng trong lượt chạy). */
export async function tokenOf(env, db, m) {
  if (m.src === 'env') return String(m.platform === 'instagram' ? env.META_IG_TOKEN : env.META_PAGE_TOKEN);
  const r = await one(db, 'SELECT enc FROM soc_tokens WHERE channel_id = ?', m.channel_id); if (!r) return '';
  try { return await decryptKey(env, kid(m.channel_id), r.enc); } catch (e) { return ''; }
}
async function store(env, db, ch, kind, target, name, tok, exp, now) {
  const enc = await encryptKey(env, kid(ch), tok);
  await run(db, `INSERT INTO soc_tokens (channel_id, kind, target_id, name, enc, last4, expires_at, refreshed_at, status, err, updated) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ok', NULL, ?)
    ON CONFLICT(channel_id) DO UPDATE SET kind = excluded.kind, target_id = excluded.target_id, name = COALESCE(excluded.name, soc_tokens.name), enc = excluded.enc, last4 = excluded.last4, expires_at = excluded.expires_at, refreshed_at = excluded.refreshed_at, status = 'ok', err = NULL, updated = excluded.updated`,
    ch, kind, String(target), name, enc, last4(tok), exp, now, now);
}
/** Quản trị: lưu token cho 1 kênh – kiểm bằng 1 lượt Graph (FB: GET page · IG: GET me) rồi mới mã hóa + ghi. */
export async function setToken(env, db, b, { fetcher = fetch, now = Date.now() } = {}) {
  const ch = String(b.channel_id || ''), p = platOfCh(ch), tok = String(b.token || '').trim();
  if (!CH.test(ch) || tok.length < 20 || tok.length > 600 || /\s/.test(tok)) throw fail(400, 'bad-input');
  if (!encReady(env)) throw fail(412, 'no-enc-key');
  if (!(await one(db, 'SELECT 1 AS x FROM dist_ext WHERE channel_id = ?', ch))) throw fail(404, 'no-channel');
  const mc = metaClient(env, { token: tok, host: KIND[p], fetcher });
  if (p === 'facebook_page') {
    if (!okId(b.target_id)) throw fail(400, 'bad-page-id');
    const v = await fbPage(mc, b.target_id); if (!v.ok) throw fail(422, 'token-check:' + v.code);
    await store(env, db, ch, 'fb', b.target_id, v.name, tok, 0, now); return { channel_id: ch, kind: 'fb', target_id: String(b.target_id), name: v.name, last4: last4(tok) };
  }
  const v = await igMe(mc); if (!v.ok) throw fail(422, 'token-check:' + v.code);
  if (b.target_id && String(b.target_id) !== v.user_id) throw fail(422, 'ig-id-mismatch');
  await store(env, db, ch, 'ig', v.user_id, v.username ? '@' + v.username : null, tok, now + 60 * 864e5, now); // hạn ước lượng 60 ngày; refresh ghi hạn thật
  return { channel_id: ch, kind: 'ig', target_id: v.user_id, name: v.username, last4: last4(tok) };
}
export async function delToken(db, b) { const ch = String(b.channel_id || ''); if (!CH.test(ch)) throw fail(400, 'bad-input'); await run(db, 'DELETE FROM soc_tokens WHERE channel_id = ?', ch); return { ok: true }; }
export const markToken = (db, ch, status, err) => run(db, 'UPDATE soc_tokens SET status = ?, err = ?, updated = ? WHERE channel_id = ?', status, err ? String(err).slice(0, 120) : null, Date.now(), ch);
/** IG cần refresh? (token D1 ≥ 24 giờ tuổi, còn ≤ 10 ngày; token env: refresh 1 lần để chép vào D1 khi có KEYS_ENC_KEY) */
export const igNeedsRefresh = (m, env, now) => m.platform === 'instagram' && (m.src === 'env' ? encReady(env) : (+m.expires_at || 0) - now <= IG_REFRESH_BEFORE && now - (+m.refreshed_at || 0) >= 864e5);
/** Refresh token IG + ghi D1. → { ok, expires_at } | { ok: false, code, kind } */
export async function refreshIg(env, db, m, tok, { fetcher = fetch, now = Date.now(), onCall = null } = {}) {
  const r = await igRefresh(metaClient(env, { token: tok, host: 'ig', fetcher, onCall }), now);
  if (!r.ok) { if (m.src === 'd1') await markToken(db, m.channel_id, 'refresh-failed', r.code); return r; }
  if (!encReady(env)) return { ok: false, code: 'no-enc-key' };
  await store(env, db, m.channel_id, 'ig', m.target_id, m.name || null, r.token, r.expires_at, now);
  return { ok: true, expires_at: r.expires_at };
}
