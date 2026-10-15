/* Gửi thư nội bộ qua Cloudflare Email Routing (miễn phí, chỉ tới địa chỉ đã xác minh).
 * Chỉ được gọi qua service binding MAIL từ Pages Functions – workers_dev=false nên không ai gọi trực tiếp được. */
import { EmailMessage } from 'cloudflare:email';

const b64 = s => btoa(String.fromCharCode(...new TextEncoder().encode(s)));
const wrap = s => s.replace(/.{1,76}/g, '$&\r\n');
const hdr = s => '=?UTF-8?B?' + b64(String(s).replace(/[\r\n]+/g, ' ').slice(0, 150)) + '?=';
const safeAddr = s => /^[^\s@<>"',;]+@[^\s@<>"',;]+\.[a-z]{2,}$/i.test(s || '') ? s : '';

async function sendText(env, subject, text, reply) {
  const from = 'contact@lexkite.com', to = 'vintagezulilyjewelry@gmail.com', r = safeAddr(reply && reply.addr);
  const raw = [`From: ${hdr('Lexkite')} <${from}>`, `To: <${to}>`, r ? `Reply-To: ${hdr(reply.name || r)} <${r}>` : null, `Subject: ${hdr(subject)}`, `Message-ID: <${crypto.randomUUID()}@lexkite.com>`, `Date: ${new Date().toUTCString()}`, 'MIME-Version: 1.0', 'Content-Type: text/plain; charset=utf-8', 'Content-Transfer-Encoding: base64', '', wrap(b64(String(text).slice(0, 20000)))].filter(l => l !== null).join('\r\n');
  await env.SEB.send(new EmailMessage(from, to, raw));
}

// Tóm tắt cảnh báo hằng ngày: lỗi JS, tin nhắn tồn, thư chuyển lỗi, dung lượng D1, workflow GitHub thất bại
async function digest(env) {
  const now = Date.now(), DAY = 864e5, q = async (sql, ...a) => (await env.DB.prepare(sql).bind(...a).first().catch(() => null)) || {}, items = [];
  const e = await q('SELECT COUNT(*) AS k, COALESCE(SUM(n), 0) AS n FROM errors WHERE last > ?', now - DAY);
  const lim = +((await q("SELECT v FROM config WHERE k = 'alert_errors'")).v || 50);
  if (e.n >= lim) items.push(`• Lỗi JavaScript 24h: ${e.n} lượt / ${e.k} loại (ngưỡng ${lim})`);
  const c = await q('SELECT COUNT(*) AS n FROM contact_msgs WHERE COALESCE(handled, 0) = 0');
  if (c.n) items.push(`• Tin nhắn liên hệ chưa xử lý: ${c.n}`);
  const f = await q('SELECT COUNT(*) AS n FROM contact_msgs WHERE sent = 0 AND at > ?', now - DAY);
  if (f.n) items.push(`• ${f.n} tin nhắn chưa chuyển được vào Gmail`);
  const r = await env.DB.prepare('SELECT 1').run().catch(() => null), size = r && r.meta && (r.meta.size_after || 0);
  if (size > 0.7 * 500 * 1048576) items.push(`• Dung lượng D1: ${(size / 1048576).toFixed(0)} MB / 500 MB miễn phí – cân nhắc nâng gói`);
  try {
    const runs = (await (await fetch('https://api.github.com/repos/lexkiteapp/lexkiteapp.github.io/actions/runs?per_page=40', { headers: { 'User-Agent': 'lexkite-digest' } })).json()).workflow_runs || [], seen = new Set();
    for (const w of runs) { if (seen.has(w.name)) continue; seen.add(w.name); if (w.status === 'completed' && w.conclusion === 'failure') items.push(`• Workflow "${w.name}" thất bại: ${w.html_url}`); }
  } catch (x) { /* GitHub tạm lỗi – bỏ qua */ }
  if (items.length) await sendText(env, `[Lexkite] ${items.length} cảnh báo hệ thống`, `Tóm tắt tự động ${new Date(now).toISOString().slice(0, 10)}:\n\n${items.join('\n')}\n\nXem chi tiết: https://lexkite.com/admin.html`);
  return items;
}

export default {
  async scheduled(ev, env, ctx) { ctx.waitUntil(digest(env)); },
  async fetch(req, env) {
    if (req.method !== 'POST') return new Response('no', { status: 405 });
    const { subject, text, replyTo, replyName } = await req.json();
    const from = 'contact@lexkite.com', to = env.SEB_TO || 'vintagezulilyjewelry@gmail.com';
    const reply = safeAddr(replyTo);
    const raw = [
      `From: ${hdr('Lexkite Contact')} <${from}>`,
      `To: <${to}>`,
      reply ? `Reply-To: ${hdr(replyName || reply)} <${reply}>` : '',
      `Subject: ${hdr(subject || 'Lexkite contact')}`,
      `Message-ID: <${crypto.randomUUID()}@lexkite.com>`,
      `Date: ${new Date().toUTCString()}`,
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset=utf-8',
      'Content-Transfer-Encoding: base64',
      '', wrap(b64(String(text || '').slice(0, 20000))),
    ].filter((l, i, a) => l !== '' || i === a.length - 2).join('\r\n');
    await env.SEB.send(new EmailMessage(from, to, raw));
    return Response.json({ ok: true });
  },
};
