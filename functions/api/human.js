/* Vé "người thật": POST /api/human { token, dev2? }  (header X-Lexkite-Device bắt buộc)
 *   token = Turnstile giải trên web/human.html (iframe ẩn cho app gốc/add-on; trực tiếp trên lexkite.com)
 *   dev2  = mã thiết bị thứ 2 (service worker add-on dùng chrome.storage, khác localStorage của trang add-on)
 *   → 200 { ticket, exp } · 403 { error:'turnstile' } · 503 { error:'turnstile-unavailable' | 'not-configured' } (fail closed)
 * Vé dùng ở header X-Lexkite-Human cho /api/ai, /api/contact, /api/report (functions/api/_human.js). Tài liệu docs/HUMAN.md */
import { limit } from './sync.js';
import { readJSON, bodyFail } from './_body.js';
import { humanOn, siteverify, issueTicket, DEV_RE } from './_human.js';

const ORIGINS = /^(https:\/\/((www\.)?lexkite\.com|([a-z0-9-]+\.)?lexkite\.pages\.dev)|https?:\/\/localhost(:\d+)?|capacitor:\/\/localhost|chrome-extension:\/\/[a-z]{32})$/;
const cors = req => { const o = req.headers.get('Origin') || ''; return ORIGINS.test(o) ? { 'Access-Control-Allow-Origin': o, 'Access-Control-Allow-Headers': 'Content-Type, X-Lexkite-Device', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Max-Age': '86400', Vary: 'Origin' } : {}; };
const json = (req, status, data) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...cors(req) } });

export const onRequestOptions = ({ request }) => new Response(null, { status: 204, headers: cors(request) });

export async function onRequestPost({ request, env }) {
  if (!humanOn(env)) return json(request, 503, { error: 'not-configured' });
  let b; try { b = await readJSON(request, 4096); } catch (e) { const f = bodyFail(e); return json(request, f.status, { error: f.error }); }
  if (!b || typeof b !== 'object') return json(request, 400, { error: 'json' });
  const dev = request.headers.get('X-Lexkite-Device') || '', dev2 = typeof b.dev2 === 'string' ? b.dev2 : '';
  if (!DEV_RE.test(dev) || (dev2 && !DEV_RE.test(dev2))) return json(request, 400, { error: 'device' });
  if (await limit('human:' + (request.headers.get('CF-Connecting-IP') || '?'), 20, 60)) return json(request, 429, { error: 'too-fast' });
  const v = await siteverify(env, b.token, request.headers.get('CF-Connecting-IP') || '');
  if (v === 'error') return json(request, 503, { error: 'turnstile-unavailable' });
  if (v !== 'ok') return json(request, 403, { error: 'turnstile' });
  const t = await issueTicket(env, [dev, dev2]);
  return t ? json(request, 200, t) : json(request, 503, { error: 'not-configured' });
}
