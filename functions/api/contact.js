/* Form liên hệ: POST /api/contact { name, email, msg, lang, hp, ms }
 * → lưu D1 (bảng contact_msgs) → chuyển thư vào support qua Worker lexkite-mail (service binding MAIL).
 * Chống spam: ô bẫy hp, gửi quá nhanh (< 3 s), tối đa 5 tin/giờ mỗi người (IP đã băm, không lưu IP gốc). */
import { gate } from './_quota.js'; // hạn mức theo IP/thiết bị + cầu dao thư (docs/QUOTAS.md)

const ORIGINS = /^(https:\/\/((www\.)?lexkite\.com|([a-z0-9-]+\.)?lexkite\.pages\.dev)|https?:\/\/localhost(:\d+)?|capacitor:\/\/localhost|chrome-extension:\/\/[a-z]{32})$/;
const PER_HOUR = 5;
const cors = req => { const o = req.headers.get('Origin') || ''; return ORIGINS.test(o) ? { 'Access-Control-Allow-Origin': o, 'Access-Control-Allow-Headers': 'Content-Type, X-Lexkite-Device', 'Access-Control-Allow-Methods': 'POST, OPTIONS', Vary: 'Origin' } : {}; };
const json = (req, status, data) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...cors(req) } });
const sha = async s => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))].map(b => b.toString(16).padStart(2, '0')).join('');
let ready = false;

export const onRequestOptions = ({ request }) => new Response(null, { status: 204, headers: cors(request) });

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json(request, 500, { error: 'no-db' });
  let b; try { b = await request.json(); } catch (e) { return json(request, 400, { error: 'json' }); }
  const name = String(b.name || '').trim().slice(0, 100), email = String(b.email || '').trim().slice(0, 200), msg = String(b.msg || '').trim().slice(0, 5000), lang = String(b.lang || '').slice(0, 8);
  if (b.hp || Number(b.ms) < 3000) return json(request, 200, { ok: true }); // máy spam: giả vờ thành công
  if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email) || msg.length < 10) return json(request, 400, { error: 'invalid' });
  // Kiểm tra Turnstile nếu được cấu hình khóa bí mật
  if (env.TURNSTILE_SECRET_KEY && b.token) {
    try {
      const ip = request.headers.get('CF-Connecting-IP') || '';
      const params = new URLSearchParams({ secret: env.TURNSTILE_SECRET_KEY, response: b.token });
      if (ip) params.set('remoteip', ip);
      const vr = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: params });
      const vj = await vr.json();
      if (!vj.success) return json(request, 403, { error: 'turnstile' });
    } catch (e) { /* bỏ qua lỗi mạng tạm thời tới Cloudflare verify */ }
  }
  const q = await gate(request, env, 'contact', { who: null, json }); if (q.res) return q.res;
  const who = (await sha('lexkite-contact|' + (request.headers.get('CF-Connecting-IP') || ''))).slice(0, 24);
  try {
    if (!ready) { await env.DB.prepare('CREATE TABLE IF NOT EXISTS contact_msgs (id INTEGER PRIMARY KEY AUTOINCREMENT, who TEXT NOT NULL, at INTEGER NOT NULL, name TEXT, email TEXT, msg TEXT, lang TEXT, sent INTEGER DEFAULT 0)').run(); ready = true; }
    const now = Date.now();
    const n = (await env.DB.prepare('SELECT COUNT(*) AS n FROM contact_msgs WHERE who = ? AND at > ?').bind(who, now - 3600e3).first())?.n || 0;
    if (n >= PER_HOUR) return json(request, 429, { error: 'rate' });
    if ((await q.take()).res) return q.res;
    const row = await env.DB.prepare('INSERT INTO contact_msgs (who, at, name, email, msg, lang) VALUES (?, ?, ?, ?, ?, ?) RETURNING id').bind(who, now, name, email, msg, lang).first();
    let sent = false;
    if (env.MAIL && !q.near('mail')) { // gần trần gửi thư/ngày → vẫn lưu tin (Quản trị → Hộp thư), chỉ chưa chuyển thư
      const text = `${msg}\n\n— ${name || '(no name)'} <${email}>\nLang: ${lang} · #${row.id} · ${new Date(now).toISOString()}`;
      const r = await env.MAIL.fetch('https://mail/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subject: `[Lexkite] ${name || email}: ${msg.slice(0, 60)}`, text, replyTo: email, replyName: name }) }).catch(() => null);
      sent = !!(r && r.ok);
      if (sent) await env.DB.batch([env.DB.prepare('UPDATE contact_msgs SET sent = 1 WHERE id = ?').bind(row.id), q.use('mail')]);
    }
    return json(request, 200, { ok: true, id: row.id, sent });
  } catch (e) {
    return json(request, 503, { error: 'server' });
  }
}
