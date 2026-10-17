/* Báo lỗi ("⚑ Report a problem") – web, app, add-on. Tài liệu: docs/REPORTS.md
 * POST /api/report  { op, ... }
 *   Công khai (không cần đăng nhập; có Firebase ID token thì gắn uid):
 *     create { cat, msg, email?, notify?, ctx, errs[], shot?, hp, ms, ts? } → { ok, id: 'LX-1234', token }
 *     status { t }            → trạng thái 1 báo lỗi theo mã riêng (không email/uid/ngữ cảnh/IP)
 *     mine   { ts: [≤20] }    → trạng thái nhiều báo lỗi của chính máy này (để nhắc khi đổi trạng thái)
 *   Quản trị (Authorization: Bearer <Firebase ID token>, cổng adminGate – ADMIN_EMAILS), mọi lệnh đều ghi admin_log ('report:<op>'):
 *     list · get · shot · set · merge · spam · export · stats · cfg
 * Chống lạm dụng: _quota.js gate('report') (thiết bị/IP/uid, phút + ngày) + ≤ 5 báo/giờ/IP (D1) + ô bẫy + gửi quá nhanh + điểm spam.
 * Ảnh chụp: data URL ≤ 300 KB (đã nén ở máy) lưu D1 bảng report_shots – không bao giờ công khai, chỉ lệnh quản trị 'shot' đọc được.
 * Thư: báo lỗi mới → quản trị (Worker lexkite-mail, /send; REPORT_NOTIFY_EMAIL nếu có) theo chế độ config 'report_notify' (instant|digest|off);
 *      đổi trạng thái/phản hồi → người báo (nếu đã đồng ý) qua /user của Worker (Resend/Brevo). Trong app: trang #/report/<token> + nhắc khi mở app. */
import { claims } from './sync.js';
import { adminGate, adminAudit } from './admin.js';
import { gate, DEFAULTS } from './_quota.js';
import { triage, errSig, createIssue, scrub, SEVS } from './_triage.js';
import { moderate, mask, defang } from './_abuse.js';

// Ngân sách mặc định cho tính năng 'report' (đăng ký tại đây để không phải sửa _quota.js; quản trị vẫn đè được qua quota_config)
if (!DEFAULTS.report) DEFAULTS.report = { anon: [2, 6], free: [3, 12], ipx: 2, store: 'd1', providers: ['mail', 'ai'] };

const ORIGINS = /^(https:\/\/((www\.)?lexkite\.com|([a-z0-9-]+\.)?lexkite\.pages\.dev)|https?:\/\/localhost(:\d+)?|capacitor:\/\/localhost|chrome-extension:\/\/[a-z]{32})$/;
const SITE = 'https://lexkite.com';
export const STATUSES = ['new', 'ack', 'prog', 'fixed', 'wontfix', 'dup'];
export const CATS = ['bug', 'content', 'i18n', 'audio', 'account', 'idea'];
export const AREAS = ['vocab', 'grammar', 'pron', 'reading', 'listening', 'writing', 'speaking', 'tests', 'account', 'addon', 'other'];
export const LIM = { body: 600000, msg: 4000, shot: 420000, errs: 20, err: 300, perHour: 5 };
const PLATS = ['web', 'pwa', 'ext', 'ios', 'android', 'app'];
const DAY = 864e5;
export const tid = id => 'LX-' + (1000 + (+id || 0));
// 'LX-1234' → id 234 · số trần → id nội bộ (máy khách Quản trị luôn gửi 'LX-…')
const rid = s => { const m = String(s == null ? '' : s).trim().match(/^(LX-)?(\d{1,9})$/i); return m ? (m[1] ? +m[2] - 1000 : +m[2]) : 0; };

const cors = req => { const o = req.headers.get('Origin') || ''; return ORIGINS.test(o) ? { 'Access-Control-Allow-Origin': o, 'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-Lexkite-Device', 'Access-Control-Allow-Methods': 'POST, OPTIONS', Vary: 'Origin' } : {}; };
const json = (req, status, data) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...cors(req) } });
const sha = async s => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))].map(b => b.toString(16).padStart(2, '0')).join('');
const token = () => btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(18)))).replace(/\+/g, '-').replace(/\//g, '_'); // 144 bit, 24 ký tự
const TOK = /^[A-Za-z0-9_-]{24}$/;
const str = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim().slice(0, n);
const EMAIL = /^[^\s@<>"',;]+@[^\s@<>"',;]+\.[a-z]{2,}$/i;

let ready = false;
export async function setup(db) {
  if (ready) return;
  await db.batch([
    db.prepare("CREATE TABLE IF NOT EXISTS reports (id INTEGER PRIMARY KEY AUTOINCREMENT, tok TEXT NOT NULL UNIQUE, at INTEGER NOT NULL, upd INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'new', cat TEXT, area TEXT, msg TEXT, email TEXT, notify INTEGER DEFAULT 0, uid TEXT, who TEXT, lang TEXT, plat TEXT, ver TEXT, route TEXT, ctx TEXT, errs TEXT, has_shot INTEGER DEFAULT 0, spam INTEGER DEFAULT 0, sandbox INTEGER DEFAULT 0, asg TEXT, reply TEXT, note TEXT, dup_of INTEGER, fixed_at INTEGER, sev TEXT, sig TEXT, ai TEXT, issue TEXT, feat TEXT, fix_ver TEXT)"),
    db.prepare('CREATE INDEX IF NOT EXISTS reports_st ON reports (status, at)'),
    db.prepare('CREATE INDEX IF NOT EXISTS reports_who ON reports (who, at)'),
    db.prepare('CREATE TABLE IF NOT EXISTS report_shots (rid INTEGER PRIMARY KEY, mime TEXT, data TEXT NOT NULL)'),
    db.prepare('CREATE TABLE IF NOT EXISTS report_events (id INTEGER PRIMARY KEY AUTOINCREMENT, rid INTEGER NOT NULL, at INTEGER NOT NULL, by TEXT, act TEXT, note TEXT)'),
    db.prepare('CREATE INDEX IF NOT EXISTS report_events_rid ON report_events (rid)'),
    db.prepare('CREATE TABLE IF NOT EXISTS admin_log (id INTEGER PRIMARY KEY AUTOINCREMENT, at INTEGER NOT NULL, email TEXT, op TEXT, ok INTEGER, ip TEXT, country TEXT)'),
    db.prepare('CREATE TABLE IF NOT EXISTS config (k TEXT PRIMARY KEY, v TEXT, at INTEGER, by TEXT) WITHOUT ROWID'),
  ]);
  for (const c of ['sev TEXT', 'sig TEXT', 'ai TEXT', 'issue TEXT', 'feat TEXT', 'fix_ver TEXT']) await db.prepare('ALTER TABLE reports ADD COLUMN ' + c).run().catch(() => {}); // bảng tạo trước bản AI
  await db.prepare('CREATE INDEX IF NOT EXISTS reports_sig ON reports (sig, at)').run().catch(() => {});
  ready = true;
}
// Chỉ LỖI mới vào hàng tự xử lý của Claude Code; 'idea' (đề xuất) cần admin Duyệt; 'account' (dữ liệu/tài khoản) luôn cần người
export const AUTO_CATS = ['bug', 'content', 'i18n', 'audio'];
const SEV_RANK = { P0: 0, P1: 1, P2: 2, P3: 3 };
const PEOPLE = '(1 + (SELECT COUNT(*) FROM reports d WHERE d.dup_of = reports.id))';

// Khu vực (công cụ) theo trang đang mở – để lọc trong Quản trị
const AREA_RE = [
  ['tests', /^(mock|tests|toeic|toeic-r|toeic-sw|toeic-test|toefl|toefl-p|rtype|placement-test)$/], ['grammar', /^(grammar|placement|structures)$/], ['pron', /^pron$/],
  ['reading', /^(reading|read|cbt|method|skill)$/], ['listening', /^(listening|listen|listen-test|dictation)$/], ['writing', /^(write|task1|model|models|letters|ideas|paraphrase|phrases)$/],
  ['speaking', /^(speaking|call|roleplay|reflex|handsfree)$/], ['vocab', /^(home|vocab|library|topic|practice|review|deck|dict|path|stats|plan|goal|courses|course)$/],
  ['account', /^(settings|me|sync|handoff|welcome|contact)$/],
];
export function areaOf(route, plat, dom) {
  if (plat === 'ext' && (dom || /^popup/.test(route || ''))) return 'addon';
  const n = String(route || '').split('/')[0] || 'home';
  for (const [a, re] of AREA_RE) if (re.test(n)) return a;
  return 'other';
}

// Ngữ cảnh: chỉ giữ trường cho phép, cắt độ dài. Add-on: chỉ tên miền (không URL đầy đủ). route bỏ phần ?query.
export function cleanCtx(c) {
  c = c && typeof c === 'object' ? c : {};
  const dom = str(c.dom, 100).toLowerCase();
  return {
    route: str(c.route, 120).split('?')[0].replace(/^report\/.*/, 'report'), lang: str(c.lang, 8), ver: str(c.ver, 40), plat: PLATS.includes(c.plat) ? c.plat : 'web',
    vw: /^\d{2,5}x\d{2,5}$/.test(c.vw || '') ? c.vw : '', dpr: Math.min(8, Math.max(0, +c.dpr || 0)) || undefined, ua: str(c.ua, 300), sandbox: !!c.sandbox,
    cid: str(c.cid, 120), dom: /^[a-z0-9.-]{1,100}$/.test(dom) && dom.includes('.') ? dom : '', tz: str(c.tz, 40), online: c.online === false ? false : undefined,
  };
}

// Điểm spam (≥ 2 → đánh dấu spam: vẫn lưu, ẩn khỏi danh sách mặc định, không gửi thư)
export function spamScore(msg, email) {
  let s = 0; const m = String(msg || '');
  const links = (m.match(/https?:\/\/|www\./gi) || []).length;
  if (links >= 3) s += 2; else if (links) s += 0.5;
  if (/(.)\1{14,}/.test(m)) s += 1;
  if (/\b(viagra|casino|crypto|bitcoin|forex|loan|seo services?|backlinks?|porn|sex|escort|betting|bet88|slot gacor)\b/i.test(m)) s += 2;
  if (m.length > 30 && !/[\s]/.test(m)) s += 1;
  if (/<a\s+href|\[url=/i.test(m)) s += 2;
  if (email && /\.(ru|cn|xyz|top|click)$/i.test(email) && links) s += 1;
  return s;
}

// Mốc xử lý dự kiến (giờ) – quản trị đổi được (config 'report_eta'): nghiêm trọng · lỗi thường · nội dung/dịch/âm thanh; đề xuất = không hẹn giờ
export const ETA_DEFAULT = { serious: 24, normal: 72, content: 168 };
async function etaCfg(db) { try { const r = await db.prepare("SELECT v FROM config WHERE k = 'report_eta'").first(); const o = r ? JSON.parse(r.v) : {}; const ok = v => Number.isInteger(v) && v >= 1 && v <= 2160; return { serious: ok(o.serious) ? o.serious : ETA_DEFAULT.serious, normal: ok(o.normal) ? o.normal : ETA_DEFAULT.normal, content: ok(o.content) ? o.content : ETA_DEFAULT.content }; } catch (e) { return { ...ETA_DEFAULT }; } }
// Lúc gửi (chưa có AI): theo loại người dùng chọn · sau AI: theo mức P0–P3
export function etaOf(cat, sev, E = ETA_DEFAULT) {
  if (cat === 'idea') return { kind: 'feature' };
  if (sev === 'P0') return { kind: 'serious', h: E.serious };
  if (sev === 'P1') return { kind: 'normal', h: E.normal };
  if (sev === 'P2' || sev === 'P3') return ['content', 'i18n', 'audio'].includes(cat) || sev === 'P3' ? { kind: 'content', h: E.content } : { kind: 'normal', h: E.normal };
  return cat === 'account' ? { kind: 'serious', h: E.serious } : cat === 'bug' ? { kind: 'normal', h: E.normal } : { kind: 'content', h: E.content };
}
const pub = (r, E) => r && ({ id: tid(r.id), status: r.status, cat: r.cat, at: r.at, upd: r.upd, reply: r.reply || '', dup: r.dup_of ? tid(r.dup_of) : '', fixed_at: r.fixed_at || 0, fix_ver: r.fix_ver || '', eta: etaOf(r.cat, r.sev, E), triaged: !!r.sev });
const ev = (db, id, by, act, note = '') => db.prepare('INSERT INTO report_events (rid, at, by, act, note) VALUES (?, ?, ?, ?, ?)').bind(id, Date.now(), str(by, 120), act, str(note, 500));
async function cfgGet(db) { try { const r = await db.prepare("SELECT v FROM config WHERE k = 'report_notify'").first(); return ['instant', 'digest', 'off'].includes(r && r.v) ? r.v : 'instant'; } catch (e) { return 'instant'; } }

async function mail(env, path, payload) {
  if (!env.MAIL) return false;
  const r = await env.MAIL.fetch('https://mail/' + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).catch(() => null);
  return !!(r && r.ok);
}
// Thư cho quản trị khi có báo lỗi mới: tóm tắt + liên kết Quản trị (không chứa mã riêng của người báo)
export function adminMail(row, ctx, env) {
  const to = String(env.REPORT_NOTIFY_EMAIL || '').trim();
  const lines = [
    `${tid(row.id)} · ${row.cat} · ${row.area}${row.has_shot ? ' · 📎' : ''}`, '', defang(mask(String(row.msg || ''))).slice(0, 1500), '',
    `Route: #/${ctx.route || ''}${ctx.cid ? ' · content: ' + ctx.cid : ''}${ctx.dom ? ' · site: ' + ctx.dom : ''}`,
    `Platform: ${ctx.plat} ${ctx.ver || ''} · UI: ${ctx.lang} · ${ctx.vw || ''}`, `Errors: ${row.nerr || 0}`, '',
    `Admin: ${SITE}/admin.html?r=${row.id}#reports`,
  ];
  if (row.tri) lines.splice(2, 0, `AI (${row.tri.by}${row.tri.confidence ? ' ' + Math.round(row.tri.confidence * 100) + '%' : ''}): ${row.tri.summary_vi || ''}`, row.tri.suggested_fix ? 'Fix: ' + row.tri.suggested_fix : '', '');
  return { subject: `[Lexkite]${row.sev ? ' [' + row.sev + ']' : ''} ${tid(row.id)} ${row.cat}: ${defang(mask(String(row.msg || ''))).replace(/\s+/g, ' ').slice(0, 60)}`, text: lines.filter(x => x != null).join('\n'), ...(EMAIL.test(to) ? { to } : {}), ...(row.notify && EMAIL.test(row.email || '') ? { replyTo: row.email } : {}) };
}
const ST_TXT = { vi: { new: 'Mới', ack: 'Đã tiếp nhận', prog: 'Đang xử lý', fixed: 'Đã sửa', wontfix: 'Không sửa', dup: 'Trùng lặp' }, en: { new: 'New', ack: 'Acknowledged', prog: 'In progress', fixed: 'Fixed', wontfix: "Won't fix", dup: 'Duplicate' } };
// Thư cho người báo khi đổi trạng thái / có phản hồi (chỉ khi họ đã đồng ý nhận thư)
export function userMail(row) {
  const vi = row.lang === 'vi', s = ST_TXT[vi ? 'vi' : 'en'][row.status] || row.status, link = `${SITE}/app/#/report/${row.tok}`;
  const text = vi
    ? `Báo lỗi ${tid(row.id)} của bạn: ${s}.${row.reply ? `\n\nPhản hồi từ Lexkite:\n${row.reply}` : ''}${row.dup_of ? `\n\nTrùng với ${tid(row.dup_of)}.` : ''}\n\nXem trạng thái: ${link}\n\n— Lexkite (bạn nhận thư này vì đã chọn nhận cập nhật khi gửi báo lỗi)`
    : `Your report ${tid(row.id)}: ${s}.${row.reply ? `\n\nReply from Lexkite:\n${row.reply}` : ''}${row.dup_of ? `\n\nDuplicate of ${tid(row.dup_of)}.` : ''}\n\nView status: ${link}\n\n— Lexkite (you get this email because you asked for updates when sending the report)`;
  return { to: row.email, subject: vi ? `[Lexkite] ${tid(row.id)}: ${s}` : `[Lexkite] ${tid(row.id)}: ${s}`, text };
}

// Sau khi tạo: chữ ký lỗi → phiếu gốc trùng (7 ngày) · số phiếu tương tự · AI/luật phân loại · thư quản trị theo mức · Issue cho Claude Code
async function after(env, db, q, r) {
  if (r.spam) return;
  const now = Date.now(), sig = await errSig(r.errs, r.area);
  const sim = await db.prepare(`SELECT COUNT(*) AS n FROM reports WHERE id != ?1 AND spam = 0 AND at > ?2 AND (area = ?3 OR (?4 != '' AND sig = ?4))`).bind(r.id, now - 7 * DAY, r.area, sig).first() || {};
  const root = sig ? await db.prepare("SELECT id FROM reports WHERE sig = ? AND id < ? AND dup_of IS NULL AND spam = 0 AND sandbox = 0 AND status IN ('new', 'ack', 'prog') AND at > ? ORDER BY id LIMIT 1").bind(sig, r.id, now - 7 * DAY).first() : null;
  const cands = ((await db.prepare(`SELECT id, status, substr(msg, 1, 160) AS msg FROM reports WHERE id != ?1 AND spam = 0 AND dup_of IS NULL AND at > ?2 AND (area = ?3 OR (?4 != '' AND sig = ?4)) ORDER BY id DESC LIMIT 5`).bind(r.id, now - 7 * DAY, r.area, sig).all()).results || []).map(c => ({ tid: tid(c.id), status: c.status, msg: c.msg }));
  const sameSig = sig ? ((await db.prepare('SELECT COUNT(*) AS n FROM reports WHERE sig = ? AND spam = 0 AND at > ?').bind(sig, now - 7 * DAY).first()) || {}).n || 0 : 0;
  const tri = await triage(env, { msg: r.msg, cat: r.cat, area: r.area, route: r.ctx.route, plat: r.ctx.plat, ver: r.ctx.ver, lang: r.ctx.lang, errs: r.errs, shot: r.shot, similar: sim.n || 0, same: Math.max(0, sameSig - 1), cands, deploy: env.CF_PAGES_COMMIT_SHA ? String(env.CF_PAGES_COMMIT_SHA).slice(0, 10) : '' }, { noAI: r.ctx.sandbox || q.near('ai') });
  if (root) tri.duplicate_of = tid(root.id);
  // Ảnh 18+/bạo lực/máu me/thù ghét (AI soi) → xóa ảnh ngay, ẩn phiếu, không thư, không Issue
  if (tri.image_safety && !['ok', 'none'].includes(tri.image_safety)) {
    await db.batch([db.prepare('DELETE FROM report_shots WHERE rid = ?').bind(r.id), db.prepare('UPDATE reports SET has_shot = 0, spam = 1, sev = ?, ai = ? WHERE id = ?').bind(tri.severity, JSON.stringify(tri), r.id), ev(db, r.id, 'ai', 'shot-removed', tri.image_safety)]);
    return;
  }
  const w = [db.prepare(`UPDATE reports SET sev = ?, sig = ?, ai = ?${root ? ", dup_of = ?, status = 'dup'" : ''} WHERE id = ?`).bind(...[tri.severity, sig, JSON.stringify(tri), ...(root ? [root.id] : []), r.id]), ev(db, r.id, 'ai', 'triage', `${tri.severity} · ${tri.by}${root ? ' · dup ' + tid(root.id) : ''}`)];
  if (root) w.push(db.prepare('UPDATE reports SET upd = upd WHERE id = ?').bind(root.id), ev(db, root.id, 'ai', 'merged', tid(r.id) + ' (auto)'));
  if (tri.by === 'ai') w.push(q.use('ai', q.cost || 60));
  await db.batch(w);
  if (r.ctx.sandbox) return;
  // Thư: P0 → ngay ([P0]) · P1 → ngay nếu chế độ 'instant' · P2/P3 → chỉ bản tóm tắt ngày · phiếu trùng tự gom (không P0) → không thư
  const mode = await cfgGet(db);
  if (mode !== 'off' && !q.near('mail') && (tri.severity === 'P0' || (tri.severity === 'P1' && mode === 'instant' && !root))) {
    const m = adminMail({ id: r.id, cat: r.cat, area: r.area, msg: r.msg, email: r.email, notify: r.notify, has_shot: !!r.shot, nerr: r.errs.length, sev: tri.severity, tri }, r.ctx, env);
    const ok = (m.to && await mail(env, 'user', m)) || await mail(env, 'send', { ...m, to: undefined });
    if (ok) await db.batch([q.use('mail')]).catch(() => {});
  }
  // P0/P1 là LỖI (không phải đề xuất/tài khoản), không trùng → GitHub Issue cho Claude Code
  if ((tri.severity === 'P0' || tri.severity === 'P1') && AUTO_CATS.includes(r.cat) && !root) await toClaude(env, db, r.id, 'ai');
}

// Tạo GitHub Issue (đã làm sạch) cho 1 phiếu; đề xuất chỉ khi admin đã Duyệt (label feature-approved)
async function toClaude(env, db, id, by) {
  const r = await db.prepare('SELECT * FROM reports WHERE id = ?').bind(id).first(); if (!r) throw new Error('not-found');
  if (r.issue) return { url: r.issue, existed: true };
  if (r.cat === 'idea' && r.feat !== 'approved') return { error: 'idea-needs-approval' };
  let tri = {}, errs = []; try { tri = JSON.parse(r.ai || '{}'); errs = JSON.parse(r.errs || '[]'); } catch (e) { /* bỏ qua */ }
  if (!tri.severity) tri = { severity: r.sev || 'P2', area: r.area, type: r.cat, summary_vi: '', confidence: 0, needs_human: true };
  const res = await createIssue(env, { ...r, errs }, tri, r.cat === 'idea' ? ['feature-request', 'feature-approved'] : ['bug-report', 'claude']);
  if (res.url) await db.batch([db.prepare('UPDATE reports SET issue = ? WHERE id = ?').bind(res.url, id), ev(db, id, by, 'issue', res.url)]);
  else await ev(db, id, by, 'issue-failed', res.error || '').run();
  return res;
}

async function create(request, env, b, bg) {
  const db = env.DB, now = Date.now();
  if (b.hp || !(+b.ms >= 2500)) return json(request, 200, { ok: true }); // máy spam: giả vờ thành công, không lưu
  const cat = CATS.includes(b.cat) ? b.cat : '', msg = str(b.msg, LIM.msg);
  if (!cat) return json(request, 400, { error: 'cat' });
  if (msg.length < 10) return json(request, 400, { error: 'short' });
  let email = str(b.email, 200).toLowerCase(), notify = !!b.notify;
  if (env.TURNSTILE_SECRET_KEY && b.ts) { // Turnstile (tùy chọn – cùng khóa với form liên hệ; máy khách gửi kèm khi có)
    try { const p = new URLSearchParams({ secret: env.TURNSTILE_SECRET_KEY, response: String(b.ts).slice(0, 2048) }); const vr = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: p }); if (!(await vr.json()).success) return json(request, 403, { error: 'turnstile' }); } catch (e) { /* lỗi mạng tạm thời → bỏ qua */ }
  }
  const tk = (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  const who0 = tk ? await claims(tk).catch(() => null) : null;
  if (notify && !email && who0 && who0.email_verified && who0.email) email = String(who0.email).toLowerCase();
  if (notify && !EMAIL.test(email)) return json(request, 400, { error: 'email' });
  if (!notify) email = '';
  const shot = typeof b.shot === 'string' && b.shot ? b.shot : '';
  if (shot && (shot.length > LIM.shot || !/^data:image\/(jpeg|webp|png);base64,[A-Za-z0-9+/]+=*$/.test(shot))) return json(request, 413, { error: 'shot' });
  const who = (await sha('lexkite-report|' + (request.headers.get('CF-Connecting-IP') || ''))).slice(0, 24);
  await setup(db);
  // Người đã bị ẩn ≥ 2 phiếu (chửi bới/đe dọa/link độc/ảnh xấu) trong 7 ngày → nhận im lặng, không lưu
  if ((((await db.prepare("SELECT COUNT(*) AS n FROM reports WHERE who = ? AND spam = 1 AND at > ?").bind(who, now - 7 * DAY).first()) || {}).n || 0) >= 2) return json(request, 200, { ok: true });
  const q = await gate(request, env, 'report', { who: who0, json }); if (q.res) return q.res;
  const n = (await db.prepare('SELECT COUNT(*) AS n FROM reports WHERE who = ? AND at > ?').bind(who, now - 3600e3).first() || {}).n || 0;
  if (n >= LIM.perHour) return json(request, 429, { error: 'rate' });
  if ((await q.take()).res) return q.res;
  const ctx = cleanCtx(b.ctx), errs = (Array.isArray(b.errs) ? b.errs : []).slice(-LIM.errs).map(e => str(e, LIM.err)).filter(Boolean);
  const mod = moderate(msg);
  let spam = mod.hide || spamScore(msg, email) >= 2 ? 1 : 0;
  if (!spam && (await db.prepare('SELECT id FROM reports WHERE who = ? AND msg = ? AND at > ? LIMIT 1').bind(who, msg, now - DAY).first())) spam = 1; // gửi lặp y hệt
  const area = areaOf(ctx.route, ctx.plat, ctx.dom), tok = token();
  const row = await db.prepare('INSERT INTO reports (tok, at, upd, status, cat, area, msg, email, notify, uid, who, lang, plat, ver, route, ctx, errs, has_shot, spam, sandbox) VALUES (?, ?, ?, \'new\', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id')
    .bind(tok, now, now, cat, area, msg, email, notify ? 1 : 0, (who0 && who0.sub) || '', who, ctx.lang, ctx.plat, ctx.ver, ctx.route, JSON.stringify(ctx), JSON.stringify(errs), shot ? 1 : 0, spam, ctx.sandbox ? 1 : 0).first();
  const id = row.id, w = [ev(db, id, 'reporter', 'create', spam ? 'spam' + (mod.why.length ? ' · ' + mod.why.join(', ') : '') : '')];
  if (shot) w.push(db.prepare('INSERT INTO report_shots (rid, mime, data) VALUES (?, ?, ?)').bind(id, shot.slice(5, shot.indexOf(';')), shot));
  // Dọn lười (≈1% lượt gửi): xóa báo lỗi > 24 tháng (chính sách quyền riêng tư) – kèm ảnh & lịch sử
  if (Math.random() < 0.01) { const old = now - 730 * DAY; w.push(db.prepare('DELETE FROM report_shots WHERE rid IN (SELECT id FROM reports WHERE at < ?)').bind(old), db.prepare('DELETE FROM report_events WHERE rid IN (SELECT id FROM reports WHERE at < ?)').bind(old), db.prepare('DELETE FROM reports WHERE at < ?').bind(old)); }
  await db.batch(w);
  // AI phân loại + gom trùng + thư quản trị + GitHub Issue: chạy nền (waitUntil) – người dùng nhận mã ngay
  const p = after(env, db, q, { id, cat, area, msg, email, notify, shot, errs, ctx, spam }).catch(() => {});
  if (bg) bg(p); else await p;
  return json(request, 200, { ok: true, id: tid(id), token: tok, eta: etaOf(cat, null, await etaCfg(db)) });
}

// ---------- Quản trị ----------
const LIST_COLS = 'id, at, upd, status, cat, area, substr(msg, 1, 240) AS msg, email, notify, lang, plat, ver, route, has_shot, spam, sandbox, asg, dup_of, (uid != \'\') AS signed, sev, feat, issue, ' + PEOPLE + ' AS people, json_extract(ai, \'$.summary_vi\') AS ai_sum';
function where(b) {
  const w = [], a = [];
  // 'open' = lỗi đang mở (không gồm đề xuất) · 'ideas' = mục Đề xuất (chờ duyệt/để sau)
  if (STATUSES.includes(b.status)) { a.push(b.status); w.push('status = ?' + a.length); } else if (b.status === 'open') w.push("status IN ('new', 'ack', 'prog') AND cat != 'idea'");
  else if (b.status === 'ideas') w.push("cat = 'idea' AND dup_of IS NULL AND status NOT IN ('wontfix', 'fixed') AND COALESCE(feat, '') != 'rejected'");
  if (SEVS.includes(b.sev)) { a.push(b.sev); w.push('sev = ?' + a.length); }
  if (CATS.includes(b.cat)) { a.push(b.cat); w.push('cat = ?' + a.length); }
  if (AREAS.includes(b.area)) { a.push(b.area); w.push('area = ?' + a.length); }
  if (PLATS.includes(b.plat)) { a.push(b.plat); w.push('plat = ?' + a.length); }
  w.push(b.spam ? 'spam = 1' : 'spam = 0');
  if (!b.sandbox) w.push('sandbox = 0');
  const q = str(b.q, 100).toLowerCase();
  if (q) { const id = /^(lx-?)?\d{4,9}$/.test(q) ? +q.replace(/\D/g, '') - 1000 : 0; if (id > 0) { a.push(id); w.push('id = ?' + a.length); } else { a.push('%' + q.replace(/[\\%_]/g, c => '\\' + c) + '%'); w.push(`(lower(msg) LIKE ?${a.length} ESCAPE '\\' OR lower(email) LIKE ?${a.length} ESCAPE '\\' OR lower(route) LIKE ?${a.length} ESCAPE '\\' OR lower(ver) LIKE ?${a.length} ESCAPE '\\')`); } }
  return { sql: ' WHERE ' + w.join(' AND '), a };
}
const csvCell = v => { const s = String(v == null ? '' : v); const x = /^[=+\-@\t\r]/.test(s) ? "'" + s : s; return /[",\n\r]/.test(x) ? '"' + x.replace(/"/g, '""') + '"' : x; }; // chống CSV injection
const median = a => { if (!a.length) return null; a = [...a].sort((x, y) => x - y); const m = a.length >> 1; return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2; };

async function notifyReporter(env, db, id) {
  const r = await db.prepare('SELECT id, tok, status, reply, dup_of, email, notify, lang FROM reports WHERE id = ?').bind(id).first();
  if (!r || !r.notify || !EMAIL.test(r.email || '')) return false;
  const ok = await mail(env, 'user', userMail(r));
  await ev(db, id, 'system', ok ? 'mailed' : 'mail-failed').run();
  return ok;
}

const OPS = {
  async list(env, db, b) {
    const { sql, a } = where(b), lim = Math.min(200, Math.max(10, Math.floor(+b.limit) || 50)), off = Math.min(1e6, Math.max(0, Math.floor(+b.offset) || 0)); // số nguyên hữu hạn (nối vào SQL)
    const rows = (await db.prepare(`SELECT ${LIST_COLS} FROM reports${sql} ORDER BY ${b.sort === 'old' ? 'at ASC' : b.sort === 'upd' ? 'upd DESC' : b.sort === 'sev' || b.status === 'ideas' ? (b.status === 'ideas' ? 'people DESC, at ASC' : "COALESCE(sev, 'P9'), people DESC, at ASC") : 'at DESC'} LIMIT ${lim} OFFSET ${off}`).bind(...a).all()).results || [];
    const total = (await db.prepare(`SELECT COUNT(*) AS n FROM reports${sql}`).bind(...a).first() || {}).n || 0;
    const counts = Object.fromEntries(((await db.prepare("SELECT status, COUNT(*) AS n FROM reports WHERE spam = 0 AND sandbox = 0 AND cat != 'idea' GROUP BY status").all()).results || []).map(r => [r.status, r.n]));
    counts.ideas = (await db.prepare("SELECT COUNT(*) AS n FROM reports WHERE spam = 0 AND sandbox = 0 AND cat = 'idea' AND dup_of IS NULL AND status NOT IN ('wontfix', 'fixed') AND COALESCE(feat, '') NOT IN ('rejected')").first() || {}).n || 0;
    const sevs = Object.fromEntries(((await db.prepare("SELECT sev, COUNT(*) AS n FROM reports WHERE spam = 0 AND sandbox = 0 AND cat != 'idea' AND status IN ('new', 'ack', 'prog') GROUP BY sev").all()).results || []).map(r => [r.sev || '-', r.n]));
    const areas = Object.fromEntries(((await db.prepare("SELECT area, COUNT(*) AS n FROM reports WHERE spam = 0 AND sandbox = 0 AND status IN ('new', 'ack', 'prog') GROUP BY area").all()).results || []).map(r => [r.area, r.n]));
    const spam = (await db.prepare('SELECT COUNT(*) AS n FROM reports WHERE spam = 1').first() || {}).n || 0;
    return { rows: rows.map(r => ({ ...r, tid: tid(r.id), dup: r.dup_of ? tid(r.dup_of) : '' })), total, counts, sevs, areas, spam, gh: !!env.GH_ISSUES_TOKEN, admins: String(env.ADMIN_EMAILS || '').toLowerCase().split(/[,\s]+/).filter(Boolean) };
  },
  async get(env, db, b) {
    const id = rid(b.id); const r = await db.prepare('SELECT * FROM reports WHERE id = ?').bind(id).first(); if (!r) throw new Error('not-found');
    const { tok, who, uid, ...rest } = r; // mã riêng, IP băm, uid không trả về
    const events = (await db.prepare('SELECT at, by, act, note FROM report_events WHERE rid = ? ORDER BY id DESC LIMIT 50').bind(id).all()).results || [];
    const dups = ((await db.prepare('SELECT id FROM reports WHERE dup_of = ?').bind(id).all()).results || []).map(x => tid(x.id));
    let ctx = {}, errs = [], ai = null; try { ctx = JSON.parse(r.ctx || '{}'); errs = JSON.parse(r.errs || '[]'); ai = r.ai ? JSON.parse(r.ai) : null; } catch (e) { /* bỏ qua */ }
    return { ...rest, tid: tid(id), signed: !!uid, ctx, errs, ai, events, dups, people: 1 + dups.length, dup: r.dup_of ? tid(r.dup_of) : '', gh: !!env.GH_ISSUES_TOKEN };
  },
  async shot(env, db, b) { const r = await db.prepare('SELECT data FROM report_shots WHERE rid = ?').bind(rid(b.id)).first(); return { data: r ? r.data : '' }; },
  async set(env, db, b, who) { return apply(env, db, rid(b.id), b, who.email); },
};
async function apply(env, db, id0, b, by) {
  {
    const id = id0, r = await db.prepare('SELECT id, status, reply, asg FROM reports WHERE id = ?').bind(id).first(); if (!r) throw new Error('not-found');
    const now = Date.now(), sets = [], a = [], evs = []; let tell = false;
    if (b.status != null && b.status !== r.status) {
      if (!STATUSES.includes(b.status)) throw new Error('status');
      sets.push('status = ?', 'fixed_at = ?'); a.push(b.status, b.status === 'fixed' ? now : null); evs.push(['status', r.status + ' → ' + b.status]); tell = true;
      if (b.status !== 'dup') { sets.push('dup_of = NULL'); }
    }
    if (b.reply != null && str(b.reply, 2000) !== (r.reply || '')) { sets.push('reply = ?'); a.push(str(b.reply, 2000)); evs.push(['reply', str(b.reply, 500)]); tell = true; }
    if (b.note != null) { sets.push('note = ?'); a.push(str(b.note, 2000)); evs.push(['note', '']); }
    if (b.asg != null) { const e = str(b.asg, 120).toLowerCase(); const adm = String(env.ADMIN_EMAILS || '').toLowerCase().split(/[,\s]+/); if (e && !adm.includes(e)) throw new Error('asg'); sets.push('asg = ?'); a.push(e); evs.push(['assign', e || '—']); }
    if (!sets.length) return { ok: true, changed: false };
    // Chỉ đổi trạng thái/phản hồi mới làm "upd" thay đổi (máy người báo sẽ nhắc); ghi chú nội bộ/giao việc thì không
    if (tell) { sets.push('upd = ?'); a.push(now); }
    await db.batch([db.prepare(`UPDATE reports SET ${sets.join(', ')} WHERE id = ?`).bind(...a, id), ...evs.map(([act, note]) => ev(db, id, by, act, note))]);
    const mailed = tell && b.mail !== false ? await notifyReporter(env, db, id) : false;
    return { ok: true, changed: true, mailed };
  }
}
Object.assign(OPS, {
  async merge(env, db, b, who) {
    const into = rid(b.into), ids = [...new Set((Array.isArray(b.ids) ? b.ids : []).map(rid))].filter(x => x > 0 && x !== into).slice(0, 50);
    if (!into || !ids.length) throw new Error('ids');
    const t = await db.prepare('SELECT id, dup_of FROM reports WHERE id = ?').bind(into).first(); if (!t) throw new Error('not-found'); if (t.dup_of) throw new Error('into-is-dup');
    const now = Date.now();
    await db.batch([...ids.map(id => db.prepare("UPDATE reports SET status = 'dup', dup_of = ?, upd = ? WHERE id = ?").bind(into, now, id)), db.prepare('UPDATE reports SET dup_of = ? WHERE dup_of IN (' + ids.map(() => '?').join(', ') + ')').bind(into, ...ids), ...ids.map(id => ev(db, id, who.email, 'merge', '→ ' + tid(into))), ev(db, into, who.email, 'merged', ids.map(tid).join(', '))]);
    let mailed = 0; for (const id of ids) if (await notifyReporter(env, db, id)) mailed++;
    return { ok: true, merged: ids.length, mailed };
  },
  async spam(env, db, b, who) { const id = rid(b.id); await db.batch([db.prepare('UPDATE reports SET spam = ? WHERE id = ?').bind(b.spam ? 1 : 0, id), ev(db, id, who.email, b.spam ? 'spam' : 'not-spam')]); return { ok: true }; },
  async export(env, db, b) {
    const { sql, a } = where(b);
    const rows = (await db.prepare(`SELECT id, at, upd, status, cat, area, plat, ver, lang, route, msg, email, asg, dup_of, fixed_at, reply FROM reports${sql} ORDER BY at DESC LIMIT 5000`).bind(...a).all()).results || [];
    const H = ['ticket', 'created', 'updated', 'status', 'category', 'area', 'platform', 'version', 'ui_lang', 'route', 'description', 'email', 'assignee', 'duplicate_of', 'fixed', 'reply'];
    const iso = t => t ? new Date(t).toISOString() : '';
    const csv = [H.join(','), ...rows.map(r => [tid(r.id), iso(r.at), iso(r.upd), r.status, r.cat, r.area, r.plat, r.ver, r.lang, r.route, r.msg, r.email, r.asg, r.dup_of ? tid(r.dup_of) : '', iso(r.fixed_at), r.reply].map(csvCell).join(','))].join('\r\n');
    return { csv, n: rows.length };
  },
  async stats(env, db) {
    const now = Date.now(), base = 'spam = 0 AND sandbox = 0';
    const byStatus = Object.fromEntries(((await db.prepare(`SELECT status, COUNT(*) AS n FROM reports WHERE ${base} GROUP BY status`).all()).results || []).map(r => [r.status, r.n]));
    const byArea = ((await db.prepare(`SELECT area, COUNT(*) AS n, SUM(status IN ('new', 'ack', 'prog')) AS open FROM reports WHERE ${base} AND at > ? GROUP BY area ORDER BY n DESC`).bind(now - 30 * DAY).all()).results || []);
    const start = new Date(now - 6 * DAY).setUTCHours(0, 0, 0, 0);
    const d = Object.fromEntries(((await db.prepare(`SELECT strftime('%Y-%m-%d', at / 1000, 'unixepoch') AS day, COUNT(*) AS n, SUM(status = 'fixed') AS fixed FROM reports WHERE ${base} AND at >= ? GROUP BY day`).bind(start).all()).results || []).map(r => [r.day, r]));
    const days7 = Array.from({ length: 7 }, (_, i) => { const k = new Date(start + i * DAY).toISOString().slice(0, 10); return { day: k, n: (d[k] || {}).n || 0, fixed: (d[k] || {}).fixed || 0 }; });
    const fx = ((await db.prepare(`SELECT fixed_at - at AS dt FROM reports WHERE ${base} AND status = 'fixed' AND fixed_at > ? LIMIT 2000`).bind(now - 90 * DAY).all()).results || []).map(r => r.dt).filter(x => x >= 0);
    const m = median(fx);
    return { byStatus, byArea, days7, medianFixH: m == null ? null : Math.round(m / 36e5 * 10) / 10, fixedN: fx.length, open: (byStatus.new || 0) + (byStatus.ack || 0) + (byStatus.prog || 0) };
  },
  async cfg(env, db, b, who) {
    if (b.eta && typeof b.eta === 'object') { const e = {}; for (const k of ['serious', 'normal', 'content']) { const v = Math.round(+b.eta[k]); if (!(v >= 1 && v <= 2160)) throw new Error('eta'); e[k] = v; } await db.prepare("INSERT OR REPLACE INTO config (k, v, at, by) VALUES ('report_eta', ?, ?, ?)").bind(JSON.stringify(e), Date.now(), who.email).run(); }
    if (b.notify != null) { if (!['instant', 'digest', 'off'].includes(b.notify)) throw new Error('notify'); await db.prepare("INSERT OR REPLACE INTO config (k, v, at, by) VALUES ('report_notify', ?, ?, ?)").bind(b.notify, Date.now(), who.email).run(); }
    return { notify: await cfgGet(db), eta: await etaCfg(db), gh: !!env.GH_ISSUES_TOKEN, cli: !!env.LEXKITE_REPORT_CLI_KEY, ai: !!(env.AI || env.CF_AI_TOKEN), to: env.REPORT_NOTIFY_EMAIL ? 'REPORT_NOTIFY_EMAIL' : 'default', user: !!env.MAIL };
  },
  // AI phân loại lại (nút trong Quản trị)
  async retriage(env, db, b, who) {
    const id = rid(b.id), r = await db.prepare('SELECT * FROM reports WHERE id = ?').bind(id).first(); if (!r) throw new Error('not-found');
    let ctx = {}, errs = []; try { ctx = JSON.parse(r.ctx || '{}'); errs = JSON.parse(r.errs || '[]'); } catch (e) { /* bỏ qua */ }
    const shot = r.has_shot ? ((await db.prepare('SELECT data FROM report_shots WHERE rid = ?').bind(id).first()) || {}).data : '';
    const sim = (await db.prepare(`SELECT COUNT(*) AS n FROM reports WHERE id != ?1 AND spam = 0 AND at > ?2 AND (area = ?3 OR (?4 != '' AND sig = ?4))`).bind(id, Date.now() - 7 * DAY, r.area, r.sig || '').first() || {}).n || 0;
    const tri = await triage(env, { msg: r.msg, cat: r.cat, area: r.area, route: r.route, plat: r.plat, ver: r.ver, lang: r.lang, errs, shot, similar: sim, cands: [] });
    await db.batch([db.prepare('UPDATE reports SET sev = ?, ai = ? WHERE id = ?').bind(tri.severity, JSON.stringify(tri), id), ev(db, id, who.email, 'triage', tri.severity + ' · ' + tri.by)]);
    return { ok: true, ai: tri };
  },
  // "Giao Claude Code": tạo GitHub Issue (đề xuất phải được Duyệt trước)
  async claude(env, db, b, who) { const res = await toClaude(env, db, rid(b.id), who.email); if (res.error) throw new Error(res.error); return { ok: true, ...res }; },
  // Mục Đề xuất: approve (→ Issue feature-approved, xếp sau mọi lỗi) · reject (→ Không sửa) · later (để sau)
  async idea(env, db, b, who) {
    const id = rid(b.id), r = await db.prepare('SELECT id, cat FROM reports WHERE id = ?').bind(id).first(); if (!r) throw new Error('not-found');
    if (r.cat !== 'idea') throw new Error('not-idea');
    const d = { approve: 'approved', reject: 'rejected', later: 'later' }[b.decision]; if (!d) throw new Error('decision');
    await db.batch([db.prepare('UPDATE reports SET feat = ? WHERE id = ?').bind(d, id), ev(db, id, who.email, 'idea', d)]);
    const st = d === 'approved' ? 'ack' : d === 'rejected' ? 'wontfix' : null;
    const out = st ? await apply(env, db, id, { status: st, reply: b.reply }, who.email) : { ok: true };
    if (d === 'approved') out.issue = await toClaude(env, db, id, who.email);
    return { ok: true, feat: d, ...out };
  },
  // Hàng đợi cho phiên Claude Code (HMAC LEXKITE_REPORT_CLI_KEY hoặc quản trị): LỖI đang mở P0→P1→P2→P3, cùng mức theo số người gặp rồi thời gian;
  // đề xuất đã Duyệt xếp sau mọi lỗi. Đã làm sạch: không email/IP/uid/mã riêng/ảnh.
  async queue(env, db, b) {
    const rows = (await db.prepare(`SELECT id, at, status, cat, area, sev, msg, route, plat, ver, lang, errs, ai, issue, has_shot, feat, ${PEOPLE} AS people FROM reports
      WHERE spam = 0 AND sandbox = 0 AND dup_of IS NULL AND status IN ('new', 'ack', 'prog') AND (cat IN ('bug', 'content', 'i18n', 'audio') OR (cat = 'idea' AND feat = 'approved')) LIMIT 500`).all()).results || [];
    const kind = r => (r.cat === 'idea' ? 1 : 0);
    rows.sort((x, y) => kind(x) - kind(y) || (SEV_RANK[x.sev] ?? 9) - (SEV_RANK[y.sev] ?? 9) || y.people - x.people || x.at - y.at);
    const lim = Math.min(100, Math.max(1, +b.limit || 30));
    return { rows: rows.slice(0, lim).map(r => { let ai = {}, errs = []; try { ai = JSON.parse(r.ai || '{}'); errs = JSON.parse(r.errs || '[]'); } catch (e) { /* bỏ qua */ }
      return { id: tid(r.id), kind: kind(r) ? 'feature' : 'bug', sev: r.sev || '', people: r.people, status: r.status, cat: r.cat, area: r.area, at: r.at, route: scrub(r.route), plat: r.plat, ver: r.ver, lang: r.lang,
        msg: scrub(r.msg).slice(0, 1500), errs: errs.map(e => scrub(e)), ai: { summary_vi: ai.summary_vi || '', type: ai.type || '', likely_cause: ai.likely_cause || '', suggested_fix: ai.suggested_fix || '', confidence: ai.confidence || 0, needs_human: ai.needs_human !== false || r.cat === 'account', by: ai.by || '' },
        issue: r.issue || '', screenshot: !!r.has_shot, admin: `${SITE}/admin.html?r=${r.id}#reports` }; }), total: rows.length };
  },
  // Claude Code sửa & ship xong → Đã sửa + báo người báo (và các phiếu trùng)
  async resolve(env, db, b, who) {
    const id = rid(b.id), commit = /^[0-9a-f]{7,40}$/i.test(b.commit || '') ? String(b.commit).slice(0, 12) : '', note = str(b.note, 1500);
    const r = await db.prepare('SELECT id, cat FROM reports WHERE id = ?').bind(id).first(); if (!r) throw new Error('not-found');
    const reply = (note || 'Fixed – thank you for reporting!') + (commit ? ` (commit ${commit})` : '');
    const fv = str(b.ver, 40) || commit;
    const out = await apply(env, db, id, { status: 'fixed', reply }, who.email);
    if (fv) await db.prepare('UPDATE reports SET fix_ver = ? WHERE id = ? OR dup_of = ?').bind(fv, id, id).run();
    const dups = ((await db.prepare("SELECT id FROM reports WHERE dup_of = ? AND status != 'fixed'").bind(id).all()).results || []).map(x => x.id);
    let mailed = out.mailed ? 1 : 0; for (const d of dups) { const o = await apply(env, db, d, { status: 'fixed', reply }, who.email); if (o.mailed) mailed++; }
    await ev(db, id, who.email, 'resolve', commit).run();
    return { ok: true, id: tid(id), dups: dups.length, mailed };
  },
});
export const ADMIN_OPS = Object.keys(OPS);

export const CLI_OPS = ['queue', 'resolve'];
const hex = b => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
export async function cliSign(key, ts, raw) { const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']); return hex(await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(ts + '.' + raw))); }
async function cliOk(env, h, raw) {
  const key = env.LEXKITE_REPORT_CLI_KEY; if (!key || String(key).length < 32) return false;
  const m = String(h).match(/^(\d{10,13})\.([0-9a-f]{64})$/); if (!m || Math.abs(Date.now() - +m[1]) > 300e3) return false;
  const want = await cliSign(key, m[1], raw); let d = 0; for (let i = 0; i < 64; i++) d |= want.charCodeAt(i) ^ m[2].charCodeAt(i); return d === 0; // so sánh thời gian hằng
}

export const onRequestOptions = ({ request }) => new Response(null, { status: 204, headers: cors(request) });

export async function onRequestPost({ request, env, waitUntil }) {
  if (!env || !env.DB) return json(request, 500, { error: 'no-db' });
  const raw = await request.text().catch(() => '');
  if (raw.length > LIM.body) return json(request, 413, { error: 'too-big' });
  let b; try { b = JSON.parse(raw); } catch (e) { return json(request, 400, { error: 'json' }); }
  if (!b || typeof b !== 'object') return json(request, 400, { error: 'json' });
  try {
    if (b.op === 'create') return await create(request, env, b, typeof waitUntil === 'function' ? waitUntil : null);
    if (b.op === 'status' || b.op === 'mine') {
      const ts = (b.op === 'status' ? [b.t] : Array.isArray(b.ts) ? b.ts.slice(0, 20) : []).filter(x => TOK.test(String(x || '')));
      if (!ts.length) return json(request, b.op === 'status' ? 404 : 200, b.op === 'status' ? { error: 'not-found' } : { rows: [] });
      await setup(env.DB);
      const E = await etaCfg(env.DB), rows = (await env.DB.prepare(`SELECT id, tok, status, cat, sev, at, upd, reply, dup_of, fixed_at, fix_ver FROM reports WHERE tok IN (${ts.map(() => '?').join(', ')})`).bind(...ts).all()).results || [];
      if (b.op === 'status') return rows[0] ? json(request, 200, pub(rows[0], E)) : json(request, 404, { error: 'not-found' });
      return json(request, 200, { rows: rows.map(r => ({ t: r.tok, ...pub(r, E) })) });
    }
    const fn = Object.hasOwn(OPS, b.op) ? OPS[b.op] : null; if (!fn) return json(request, 400, { error: 'op' }); // hasOwn: 'constructor' → Object(env) sẽ trả cả env
    // Phiên Claude Code (scripts/report-cli.mjs): chỉ 'queue' & 'resolve', ký HMAC-SHA256 bằng LEXKITE_REPORT_CLI_KEY: X-Lexkite-Cli: <ts>.<hex(HMAC(key, ts + '.' + body))>, lệch ≤ 5 phút
    let g;
    const cli = request.headers.get('X-Lexkite-Cli');
    if (cli && CLI_OPS.includes(b.op)) { g = (await cliOk(env, cli, raw)) ? { who: { email: 'claude-code' } } : { status: 403, error: 'forbidden' }; }
    else g = await adminGate(request, env, 'rep');
    if (!g.who) return json(request, g.status, { error: g.error });
    await setup(env.DB);
    let out, ok = true;
    try { out = await fn(env, env.DB, b, g.who); } catch (e) { ok = false; out = { error: String(e && e.message || e).slice(0, 120) }; }
    await adminAudit(env, request, g.who.email, 'report:' + b.op, ok);
    return json(request, ok ? 200 : 400, out);
  } catch (e) {
    return json(request, 503, { error: 'server' });
  }
}
