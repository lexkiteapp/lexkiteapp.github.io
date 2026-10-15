/* Gửi thư nội bộ qua Cloudflare Email Routing (miễn phí, chỉ tới địa chỉ đã xác minh).
 * Chỉ được gọi qua service binding MAIL từ Pages Functions – workers_dev=false nên không ai gọi trực tiếp được. */
import { EmailMessage } from 'cloudflare:email';

const b64 = s => btoa(String.fromCharCode(...new TextEncoder().encode(s)));
const wrap = s => s.replace(/.{1,76}/g, '$&\r\n');
const hdr = s => '=?UTF-8?B?' + b64(String(s).replace(/[\r\n]+/g, ' ').slice(0, 150)) + '?=';
const safeAddr = s => /^[^\s@<>"',;]+@[^\s@<>"',;]+\.[a-z]{2,}$/i.test(s || '') ? s : '';

export default {
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
