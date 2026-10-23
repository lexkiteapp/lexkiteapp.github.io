import { judgeNightly } from './judge.js';
/* Gửi thư nội bộ qua Cloudflare Email Routing (miễn phí, chỉ tới địa chỉ đã xác minh).
 * Chỉ được gọi qua service binding MAIL từ Pages Functions – workers_dev=false nên không ai gọi trực tiếp được. */
import { EmailMessage } from 'cloudflare:email';

const b64 = s => btoa(String.fromCharCode(...new TextEncoder().encode(s)));
const wrap = s => s.replace(/.{1,76}/g, '$&\r\n');
const hdr = s => '=?UTF-8?B?' + b64(String(s).replace(/[\r\n]+/g, ' ').slice(0, 150)) + '?=';
const safeAddr = s => /^[^\s@<>"',;]+@[^\s@<>"',;]+\.[a-z]{2,}$/i.test(s || '') ? s : '';

const ALL_ALERT_TYPES = ['js_error', 'workflow_fail', 'inbox_new', 'quality_alert', 'i18n_missing', 'quota_warning'];

export function adminList(env) {
  const s = env && (env.ADMIN_EMAILS || env.SEB_TO);
  const list = String(s || 'vintagezulilyjewelry@gmail.com')
    .toLowerCase()
    .split(/[,\s]+/)
    .map(safeAddr)
    .filter(Boolean);
  return list.length ? [...new Set(list)] : ['vintagezulilyjewelry@gmail.com'];
}

export function resolvePref(rawPref, defaultJsThreshold = 50) {
  if (!rawPref || typeof rawPref !== 'object') {
    return {
      alertTypes: new Set(ALL_ALERT_TYPES),
      jsErrorThreshold: defaultJsThreshold,
      quotaThresholdPct: 70
    };
  }
  const alertTypes = Array.isArray(rawPref.alertTypes)
    ? new Set(rawPref.alertTypes)
    : new Set(ALL_ALERT_TYPES);

  const jsErrorThreshold = Number.isInteger(rawPref.jsErrorThreshold) && rawPref.jsErrorThreshold > 0
    ? rawPref.jsErrorThreshold
    : defaultJsThreshold;

  const quotaThresholdPct = Number.isInteger(rawPref.quotaThresholdPct) && rawPref.quotaThresholdPct >= 50 && rawPref.quotaThresholdPct <= 95
    ? rawPref.quotaThresholdPct
    : 70;

  return { alertTypes, jsErrorThreshold, quotaThresholdPct };
}

export async function loadConfigAndKeys(db, keys) {
  if (!db || !keys || !keys.length) return new Map();
  try {
    const placeholders = keys.map(() => '?').join(',');
    const rows = (await db.prepare(`SELECT k, v FROM config WHERE k IN (${placeholders})`).bind(...keys).all()).results || [];
    const map = new Map();
    for (const r of rows) {
      if (r && r.k) map.set(r.k, r.v);
    }
    return map;
  } catch (_) {
    return new Map();
  }
}

export async function sendText(env, subject, text, reply, toAddr) {
  const from = 'contact@lexkite.com';
  const to = safeAddr(toAddr) || env.SEB_TO || 'vintagezulilyjewelry@gmail.com';
  const r = safeAddr(reply && reply.addr);
  const raw = [
    `From: ${hdr('Lexkite')} <${from}>`,
    `To: <${to}>`,
    r ? `Reply-To: ${hdr(reply.name || r)} <${r}>` : null,
    `Subject: ${hdr(subject)}`,
    `Message-ID: <${crypto.randomUUID()}@lexkite.com>`,
    `Date: ${new Date().toUTCString()}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=utf-8',
    'Content-Transfer-Encoding: base64',
    '',
    wrap(b64(String(text).slice(0, 20000)))
  ].filter(l => l !== null).join('\r\n');
  await env.SEB.send(new EmailMessage(from, to, raw));
}

// Tóm tắt cảnh báo hằng ngày: lỗi JS, tin nhắn tồn, thư chuyển lỗi, dung lượng D1, workflow GitHub thất bại
export async function digest(env) {
  const now = Date.now(), DAY = 864e5;
  const q = async (sql, ...a) => (await env.DB.prepare(sql).bind(...a).first().catch(() => null)) || {};

  // Đọc cấu hình adm_pref của các quản trị viên 1 lần duy nhất theo khóa
  const admins = adminList(env);
  const keysToLoad = ['alert_errors', ...admins.map(e => 'adm_pref:' + e.toLowerCase().trim())];
  const cfgMap = await loadConfigAndKeys(env.DB, keysToLoad);
  const defaultLim = +((cfgMap.get('alert_errors')) || 50);

  // 1. Lỗi JavaScript 24h
  const e = await q('SELECT COUNT(*) AS k, COALESCE(SUM(n), 0) AS n FROM errors WHERE last > ?', now - DAY);

  // 2. Tin nhắn liên hệ
  const c = await q('SELECT COUNT(*) AS n FROM contact_msgs WHERE COALESCE(handled, 0) = 0');
  const f = await q('SELECT COUNT(*) AS n FROM contact_msgs WHERE sent = 0 AND at > ?', now - DAY);

  // 3. Báo lỗi người dùng (functions/api/report.js): mới trong 24h + đang mở
  const reportLines = [];
  try {
    const rp = await q("SELECT SUM(at > ?) AS fresh, SUM(status IN ('new', 'ack', 'prog')) AS open FROM reports WHERE spam = 0 AND sandbox = 0", now - DAY);
    if (rp.fresh || rp.open) {
      reportLines.push(`• Báo lỗi: ${rp.fresh || 0} mới trong 24h · ${rp.open || 0} đang mở – https://lexkite.com/admin.html#reports`);
      // P0/P1 đã báo ngay; bản tóm tắt liệt kê phiếu mới 24h theo mức ưu tiên (P2/P3 chỉ xuất hiện ở đây)
      const rows = (await env.DB.prepare("SELECT id, cat, area, sev, msg, json_extract(ai, '$.summary_vi') AS s FROM reports WHERE spam = 0 AND sandbox = 0 AND dup_of IS NULL AND at > ? ORDER BY COALESCE(sev, 'P9'), id LIMIT 25").bind(now - DAY).all().catch(() => ({}))).results || [];
      for (const x of rows) {
        reportLines.push(`   ${x.cat === 'idea' ? '💡' : '[' + (x.sev || '?') + ']'} LX-${1000 + x.id} · ${x.area}: ${String(x.s || x.msg || '').replace(/\s+/g, ' ').slice(0, 90)}`);
      }
    }
  } catch (_) { /* bảng chưa có */ }

  // 4. YouTube đăng tay (functions/api/youtube.js)
  let ytLine = null;
  try {
    const y = await q("SELECT SUM(q.status = 'manual') AS ready, SUM(q.status = 'detected') AS up, SUM(q.status = 'done') AS live, SUM(q.status = 'done' AND q.updated > ?) AS fresh, SUM(q.err IS NOT NULL AND q.status != 'done') AS bad FROM yt_pack p JOIN yt_queue q ON q.clip = p.clip", now - DAY);
    if (y.ready || y.up || y.bad) {
      ytLine = `• YouTube đăng tay: ${y.ready || 0} sẵn sàng đăng · ${y.up || 0} đã đăng (dò thấy) · ${y.live || 0} trên web (+${y.fresh || 0} trong 24h) · ${y.bad || 0} cần xử lý – https://lexkite.com/admin.html#video`;
    }
  } catch (_) { /* bảng chưa có */ }

  // 5. Dung lượng D1
  const r = await env.DB.prepare('SELECT 1').run().catch(() => null);
  const size = r && r.meta && (r.meta.size_after || 0);

  // 6. Workflow GitHub
  const wfLines = [];
  try {
    const runs = (await (await fetch('https://api.github.com/repos/lexkiteapp/lexkiteapp.github.io/actions/runs?per_page=40', { headers: { 'User-Agent': 'lexkite-digest' } })).json()).workflow_runs || [];
    const seen = new Set();
    for (const w of runs) {
      if (seen.has(w.name)) continue;
      seen.add(w.name);
      if (w.status === 'completed' && w.conclusion === 'failure') {
        wfLines.push(`• Workflow "${w.name}" thất bại: ${w.html_url}`);
      }
    }
  } catch (_) { /* GitHub tạm lỗi – bỏ qua */ }

  // 7. Tự xác nhận bản dịch hàng đêm
  let judgeLine = null;
  try {
    const j = await judgeNightly(env);
    if (j && j.wrong) {
      judgeLine = `• AI phát hiện ${j.wrong} câu dịch sai nghĩa (${j.langs.join(', ')}) – xem Quản trị → Chất lượng`;
    }
  } catch (_) { /* AI tạm lỗi – đêm sau làm tiếp */ }

  // Xây dựng danh sách cảnh báo cá nhân hóa cho từng quản trị viên
  const sentSummaries = [];
  for (const adminEmail of admins) {
    let prefObj = null;
    const rawVal = cfgMap.get('adm_pref:' + adminEmail.toLowerCase().trim());
    if (rawVal) {
      try { prefObj = JSON.parse(rawVal); } catch (_) {}
    }
    const pref = resolvePref(prefObj, defaultLim);
    const items = [];

    // Lỗi JavaScript: kiểm tra alertTypes và ngưỡng cá nhân hóa
    if (pref.alertTypes.has('js_error')) {
      if (e.n >= pref.jsErrorThreshold) {
        items.push(`• Lỗi JavaScript 24h: ${e.n} lượt / ${e.k} loại (ngưỡng ${pref.jsErrorThreshold})`);
      }
    }

    // Tin nhắn liên hệ mới
    if (pref.alertTypes.has('inbox_new')) {
      if (c.n) items.push(`• Tin nhắn liên hệ chưa xử lý: ${c.n}`);
      if (f.n) items.push(`• ${f.n} tin nhắn chưa chuyển được vào Gmail`);
    }

    // Cảnh báo chất lượng / bài thi
    if (pref.alertTypes.has('quality_alert')) {
      for (const line of reportLines) items.push(line);
      if (ytLine) items.push(ytLine);
    }

    // Dung lượng D1 / AI
    if (pref.alertTypes.has('quota_warning')) {
      const quotaPct = (pref.quotaThresholdPct || 70) / 100;
      if (size > quotaPct * 500 * 1048576) {
        items.push(`• Dung lượng D1: ${(size / 1048576).toFixed(0)} MB / 500 MB miễn phí – cân nhắc nâng gói`);
      }
    }

    // Tác vụ GitHub thất bại
    if (pref.alertTypes.has('workflow_fail')) {
      for (const line of wfLines) items.push(line);
    }

    // Thiếu bản dịch / nghi sai nghĩa
    if (pref.alertTypes.has('i18n_missing') || pref.alertTypes.has('quality_alert')) {
      if (judgeLine && !items.includes(judgeLine)) {
        items.push(judgeLine);
      }
    }

    if (items.length) {
      await sendText(
        env,
        `[Lexkite] ${items.length} cảnh báo hệ thống`,
        `Tóm tắt tự động ${new Date(now).toISOString().slice(0, 10)}:\n\n${items.join('\n')}\n\nXem chi tiết: https://lexkite.com/admin.html`,
        null,
        adminEmail
      );
    }
    sentSummaries.push({ to: adminEmail, items });
  }

  const primaryItems = sentSummaries[0] ? sentSummaries[0].items : [];
  primaryItems.all = sentSummaries;
  return primaryItems;
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
    const { subject, text, replyTo, replyName, to: reqTo, alertType } = await req.json();
    const from = 'contact@lexkite.com', to = safeAddr(reqTo) || env.SEB_TO || 'vintagezulilyjewelry@gmail.com';
    const reply = safeAddr(replyTo);

    // Kiểm tra cài đặt adm_pref của người nhận nếu có alertType (truy vấn theo khóa 1 lần)
    if (alertType && env.DB && to) {
      try {
        const row = await env.DB.prepare('SELECT v FROM config WHERE k = ?').bind('adm_pref:' + to.toLowerCase().trim()).first();
        if (row && row.v) {
          const pref = JSON.parse(row.v);
          if (Array.isArray(pref.alertTypes) && !pref.alertTypes.includes(alertType)) {
            return Response.json({ ok: true, skipped: 'alert-disabled' });
          }
        }
      } catch (_) {}
    }

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
