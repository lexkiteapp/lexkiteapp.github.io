/* Client GrabCast phía máy chủ (dùng chung: proxy quản trị functions/api/social.js + autopilot functions/api/_social_auto.js).
 * Khóa (secret GRABCAST_API_KEY) chỉ gắn vào header ở đây: không bao giờ trả về trình duyệt, không ghi log; xóa khỏi nội dung trả về (scrub). */
export const BASE = 'https://grabcast-api-342720596878.us-central1.run.app'; // ghi đè bằng env GRABCAST_API_BASE
export const WS_DEFAULT = '4'; // workspace Lexkite trên GrabCast (không phải bí mật) – ghi đè bằng env GRABCAST_WORKSPACE
const TIMEOUT = 15000;
// Xóa mọi lần xuất hiện của khóa (phòng máy chủ GrabCast lỡ trả lại khóa trong nội dung/lỗi)
export const scrub = (text, key) => (key && key.length >= 6 ? String(text).split(key).join('***') : String(text));
export const gcConfigured = env => !!(env.GRABCAST_API_KEY && String(env.GRABCAST_WORKSPACE || WS_DEFAULT).trim());
/** → gc(method, path, body?, query?, idem?) → { status, data, code } – path tương đối sau /api/social/. onCall(status) đếm lượt gọi (ngân sách). */
export function gcClient(env, { fetcher = fetch, onCall = null } = {}) {
  const key = env.GRABCAST_API_KEY, ws = String(env.GRABCAST_WORKSPACE || WS_DEFAULT).trim(), base = String(env.GRABCAST_API_BASE || BASE).replace(/\/+$/, '');
  return async (m, p, body, query, idem) => {
    const url = new URL(base + '/api/social/' + p);
    if (query && typeof query === 'object') for (const [k, v] of Object.entries(query)) if (/^[a-z_]{1,24}$/.test(k) && v != null && v !== '') url.searchParams.set(k, String(v).slice(0, 200));
    const headers = { 'X-API-Key': key, 'X-Workspace': String(ws), Accept: 'application/json' };
    if (m !== 'GET') headers['Content-Type'] = 'application/json';
    if (idem && /^[A-Za-z0-9_-]{8,80}$/.test(String(idem))) headers['Idempotency-Key'] = String(idem);
    const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), TIMEOUT);
    let st = 502, text = '';
    try { const r = await fetcher(url.toString(), { method: m, headers, body: m === 'GET' ? undefined : JSON.stringify(body || {}), signal: ctl.signal }); st = r.status; text = await r.text(); }
    catch (e) { clearTimeout(timer); if (onCall) onCall(504); return { status: 504, data: { error: ctl.signal.aborted ? 'timeout' : 'upstream' }, code: ctl.signal.aborted ? 'timeout' : 'upstream' }; } // không đưa e.message (có thể chứa URL/headers)
    clearTimeout(timer); if (onCall) onCall(st);
    let data; try { data = JSON.parse(scrub(text, key)); } catch (e) { data = { error: 'upstream', message: scrub(text, key).slice(0, 300) }; }
    if (st >= 400 && data && typeof data === 'object' && !Array.isArray(data) && !data.error) data.error = 'upstream';
    const code = st >= 400 ? String((data && data.error && typeof data.error === 'object' ? data.error.code : data && data.error) || 'upstream').slice(0, 60) : '';
    return { status: st >= 200 && st < 600 ? st : 502, data, code };
  };
}
