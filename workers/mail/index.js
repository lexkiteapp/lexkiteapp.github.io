import { judgeNightly } from './judge.js';
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
  // Báo lỗi người dùng (functions/api/report.js): mới trong 24h + đang mở; chế độ 'digest' → kèm danh sách
  try {
    const rp = await q("SELECT SUM(at > ?) AS fresh, SUM(status IN ('new', 'ack', 'prog')) AS open FROM reports WHERE spam = 0 AND sandbox = 0", now - DAY);
    if (rp.fresh || rp.open) {
      items.push(`• Báo lỗi: ${rp.fresh || 0} mới trong 24h · ${rp.open || 0} đang mở – https://lexkite.com/admin.html#reports`);
      // P0/P1 đã báo ngay; bản tóm tắt liệt kê phiếu mới 24h theo mức ưu tiên (P2/P3 chỉ xuất hiện ở đây) – đề xuất đếm riêng
      const rows = (await env.DB.prepare("SELECT id, cat, area, sev, msg, json_extract(ai, '$.summary_vi') AS s FROM reports WHERE spam = 0 AND sandbox = 0 AND dup_of IS NULL AND at > ? ORDER BY COALESCE(sev, 'P9'), id LIMIT 25").bind(now - DAY).all().catch(() => ({}))).results || [];
      for (const x of rows) items.push(`   ${x.cat === 'idea' ? '💡' : '[' + (x.sev || '?') + ']'} LX-${1000 + x.id} · ${x.area}: ${String(x.s || x.msg || '').replace(/\s+/g, ' ').slice(0, 90)}`);
    }
  } catch (x) { /* bảng chưa có */ }
  // YouTube đăng tay (functions/api/youtube.js): sẵn sàng đăng → đã đăng (dò thấy) → trên web; nhắc khi còn clip chờ hoặc có vấn đề
  try {
    const y = await q("SELECT SUM(q.status = 'manual') AS ready, SUM(q.status = 'detected') AS up, SUM(q.status = 'done') AS live, SUM(q.status = 'done' AND q.updated > ?) AS fresh, SUM(q.err IS NOT NULL AND q.status != 'done') AS bad FROM yt_pack p JOIN yt_queue q ON q.clip = p.clip", now - DAY);
    if (y.ready || y.up || y.bad) items.push(`• YouTube đăng tay: ${y.ready || 0} sẵn sàng đăng · ${y.up || 0} đã đăng (dò thấy) · ${y.live || 0} trên web (+${y.fresh || 0} trong 24h) · ${y.bad || 0} cần xử lý – https://lexkite.com/admin.html#video`);
  } catch (x) { /* bảng chưa có */ }
  const r = await env.DB.prepare('SELECT 1').run().catch(() => null), size = r && r.meta && (r.meta.size_after || 0);
  if (size > 0.7 * 500 * 1048576) items.push(`• Dung lượng D1: ${(size / 1048576).toFixed(0)} MB / 500 MB miễn phí – cân nhắc nâng gói`);
  try {
    const runs = (await (await fetch('https://api.github.com/repos/lexkiteapp/lexkiteapp.github.io/actions/runs?per_page=40', { headers: { 'User-Agent': 'lexkite-digest' } })).json()).workflow_runs || [], seen = new Set();
    for (const w of runs) { if (seen.has(w.name)) continue; seen.add(w.name); if (w.status === 'completed' && w.conclusion === 'failure') items.push(`• Workflow "${w.name}" thất bại: ${w.html_url}`); }
  } catch (x) { /* GitHub tạm lỗi – bỏ qua */ }
  try { const j = await judgeNightly(env); if (j.wrong) items.push(`• AI phát hiện ${j.wrong} câu dịch sai nghĩa (${j.langs.join(', ')}) – xem Quản trị → Chất lượng`); } catch (x) { /* AI tạm lỗi – đêm sau làm tiếp */ }
  if (items.length) await sendText(env, `[Lexkite] ${items.length} cảnh báo hệ thống`, `Tóm tắt tự động ${new Date(now).toISOString().slice(0, 10)}:\n\n${items.join('\n')}\n\nXem chi tiết: https://lexkite.com/admin.html`);
  return items;
}

// Thư tới người dùng (người báo lỗi đã đồng ý nhận cập nhật – functions/api/report.js; REPORT_NOTIFY_EMAIL): Email Routing chỉ gửi được
// tới địa chỉ đã xác minh → dùng nhà cung cấp gửi thư (secret RESEND_API_KEY / BREVO_API_KEY trên Worker này), xoay vòng theo giờ, lỗi → nhà kế tiếp.
// Chưa cấu hình nhà nào → 501 (máy gọi ghi 'mail-failed', người dùng vẫn thấy trạng thái trong app).
const USER_FROM = 'noreply@lexkite.com';
async function sendUser(env, { to, subject, text }) {
  const addr = safeAddr(to); if (!addr) return { ok: false, status: 400 };
  const P = [];
  if (env.RESEND_API_KEY) P.push(() => fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: 'Bearer ' + env.RESEND_API_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ from: `Lexkite <${USER_FROM}>`, to: [addr], subject: String(subject || 'Lexkite').slice(0, 150), text: String(text || '').slice(0, 20000) }) }));
  if (env.BREVO_API_KEY) P.push(() => fetch('https://api.brevo.com/v3/smtp/email', { method: 'POST', headers: { 'api-key': env.BREVO_API_KEY, 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ sender: { name: 'Lexkite', email: USER_FROM }, to: [{ email: addr }], subject: String(subject || 'Lexkite').slice(0, 150), textContent: String(text || '').slice(0, 20000) }) }));
  if (!P.length) return { ok: false, status: 501 };
  const start = new Date().getUTCHours() % P.length;
  for (let i = 0; i < P.length; i++) { try { const r = await P[(start + i) % P.length](); if (r.ok) return { ok: true, status: 200 }; } catch (e) { /* nhà kế tiếp */ } }
  return { ok: false, status: 502 };
}

export default {
  async scheduled(ev, env, ctx) { ctx.waitUntil(digest(env)); },
  async fetch(req, env) {
    if (req.method !== 'POST') return new Response('no', { status: 405 });
    if (new URL(req.url).pathname === '/user') { const r = await sendUser(env, await req.json()); return Response.json(r, { status: r.status }); }
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
