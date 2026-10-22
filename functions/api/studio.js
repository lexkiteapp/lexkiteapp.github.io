/* Video Studio – quản lý dây chuyền sản xuất video tự động A→Z (Quản trị → Video Studio, js/admin-studio.js). Luồng: docs/VIDEO-PIPELINE.md §7.
 * POST /api/studio
 *   1) Quản trị viên (Authorization: Bearer <Firebase ID token>, cùng cổng adminGate với /api/admin)  { op, ... }
 *      op: list · get · create · createFromQueue · jobDelete · scriptGen · scriptSave · scriptApprove · render · qaSet · publish · schedule · unschedule · sync · slots · settings · settingsSet · assets
 *   2) GitHub Actions video.yml (header X-Studio-Secret = secret STUDIO_CALLBACK_SECRET)  { op: 'ciJob' | 'ciResult', id, ... } · video-auto.yml { op: 'ciCreate', source, topic, script, force? }
 * Trạng thái: idea → script → script_ok → rendering → rendered → qa_ok / qa_fail → uploaded → scheduled → published (TRANS bên dưới).
 * Bí mật (chỉ ở máy chủ, không bao giờ trả về/ghi log): GH_DISPATCH_TOKEN (chạy video.yml), STUDIO_CALLBACK_SECRET (CI gọi lại), GRABCAST_API_KEY (đăng bài).
 * Thiếu bí mật nào → 503 { error: 'not-configured', need: '<TÊN>' } để giao diện hiện hướng dẫn. */
import { adminGate, adminAudit, adminCors } from './admin.js';
import { allowed as gcAllowed } from './social.js';
import { geminiCall } from './ai.js';
import { limit } from './sync.js';

const REPO = 'lexkiteapp/lexkiteapp.github.io';
const RAW = `https://raw.githubusercontent.com/${REPO}/main/`;
const GC_BASE = 'https://grabcast-api-342720596878.us-central1.run.app', GC_WS = '4';
const MAX_BODY = 640 * 1024, TIMEOUT = 15000;
const DAY = 864e5;

// ---------- Trạng thái & chuyển trạng thái hợp lệ ----------
export const STATUSES = ['idea', 'script', 'script_ok', 'rendering', 'rendered', 'qa_ok', 'qa_fail', 'uploaded', 'scheduled', 'published'];
export const TRANS = {
  idea: ['script'],
  script: ['script', 'script_ok'],
  script_ok: ['script', 'rendering'],
  rendering: ['rendered', 'qa_ok', 'qa_fail', 'script_ok'], // CI lỗi → về script_ok để chạy lại
  rendered: ['qa_ok', 'qa_fail', 'rendering', 'script'],
  qa_fail: ['qa_ok', 'qa_fail', 'script', 'rendering'],
  qa_ok: ['qa_ok', 'qa_fail', 'uploaded', 'rendering', 'script'],
  uploaded: ['scheduled'],
  scheduled: ['uploaded', 'published'],
  published: [],
};
export const canMove = (from, to) => !!(TRANS[from] && TRANS[from].includes(to));

// ---------- Thang chấm video (docs/MEDIA-QA-RUBRIC.md mục C) – ≥ 90 mới được đăng ----------
export const RUBRIC = [
  { k: 'hook', max: 15, vi: 'Hook ≤ 2 s, có xung đột/tò mò' },
  { k: 'knowledge', max: 20, vi: 'Kiến thức đúng 100%' },
  { k: 'lipsync', max: 15, vi: 'Khớp miệng < 80 ms & biểu cảm' },
  { k: 'audio', max: 10, vi: 'Âm thanh −16 LUFS ±1' },
  { k: 'subs', max: 10, vi: 'Phụ đề karaoke đúng chữ, vùng an toàn' },
  { k: 'pacing', max: 10, vi: 'Nhịp dựng 2–4 s, không khung tĩnh > 4 s' },
  { k: 'brand', max: 10, vi: 'Thương hiệu & pháp lý' },
  { k: 'cta', max: 5, vi: 'CTA đúng bài trong app' },
  { k: 'share', max: 5, vi: 'Giá trị chia sẻ' },
];
export const PASS = 90;
// Tính lại tổng ở máy chủ (không tin tổng do máy khách/CI gửi). Còn tiêu chí chưa chấm (null) → chưa kết luận.
export function qaTotal(scores) {
  const s = {}; let total = 0, missing = [];
  for (const r of RUBRIC) {
    const v = scores && scores[r.k];
    if (v == null || v === '' || isNaN(+v)) { s[r.k] = null; missing.push(r.k); continue; }
    s[r.k] = Math.max(0, Math.min(r.max, Math.round(+v))); total += s[r.k];
  }
  return { scores: s, total, missing, pass: !missing.length && total >= PASS };
}

// ---------- Kiểm kịch bản (VIDEO-PIPELINE §2 bước 3, VIDEO-CONTENT-PLAN §6) ----------
export const CAST = ['mia', 'leo', 'ama', 'kit', 'diane', 'carlos'];
export const BEATS = ['hook', 'situation', 'explain', 'example', 'tip', 'cta'];
const BRANDS = /\b(duolingo|babbel|busuu|memrise|rosetta\s*stone|cambly|preply|italki|elsa\s*speak|quizlet|cake\s*app|lingoda|mondly|ling\s*app|praktika|speak\s*app)\b/i;
const STATS = /\d+(?:[.,]\d+)?\s?%|\bpercent\b|\b\d+\s+(?:out\s+of|in)\s+\d+\b|\b(?:studies|research|surveys?|scientists|experts)\s+(?:show|shows|found|prove|proves|say|says)\b/i;
const WPS = 2.6, HOOK_WORDS = 6; // ~155 từ/phút; hook ≤ 6 từ ≈ ≤ 2 s ở nhịp nhanh
const words = t => String(t || '').trim().split(/\s+/).filter(Boolean).length;
export const lineSec = l => +(words(l.text) / WPS + 0.3).toFixed(2);
export function checkScript(sc, format = 'short') {
  const errs = [], warns = [];
  if (!sc || typeof sc !== 'object' || !Array.isArray(sc.lines) || !sc.lines.length) return { ok: false, errs: ['Thiếu lượt thoại (lines)'], warns, sec: 0 };
  if (sc.lines.length > (format === 'lesson' ? 80 : 14)) errs.push(`Quá nhiều lượt thoại (${sc.lines.length})`);
  let sec = 0;
  sc.lines.forEach((l, i) => {
    const n = i + 1;
    if (!CAST.includes(String(l.who || '').toLowerCase())) errs.push(`Dòng ${n}: nhân vật "${String(l.who || '').slice(0, 20)}" không có trong dàn (${CAST.join(', ')})`);
    if (!String(l.text || '').trim()) errs.push(`Dòng ${n}: trống`);
    if (String(l.text || '').length > 160) errs.push(`Dòng ${n}: dài quá 160 ký tự`);
    if (STATS.test(l.text || '')) errs.push(`Dòng ${n}: có số liệu/thống kê – không bịa số ("Most learners…" thay cho "90%…")`);
    if (BRANDS.test(l.text || '')) errs.push(`Dòng ${n}: nhắc tên thương hiệu đối thủ`);
    sec += lineSec(l);
  });
  for (const k of ['title', 'caption']) { if (BRANDS.test(sc[k] || '')) errs.push(`${k}: nhắc tên thương hiệu đối thủ`); if (STATS.test(sc[k] || '')) errs.push(`${k}: có số liệu/thống kê`); }
  const beats = sc.lines.map(l => l.beat);
  for (const b of BEATS) if (!beats.includes(b)) (b === 'situation' ? warns : errs).push(`Thiếu phần "${b}" theo khuôn hook → situation → explain → example → tip → cta`);
  if (sc.lines[0].beat !== 'hook') errs.push('Dòng đầu phải là hook');
  if (words(sc.lines[0].text) > HOOK_WORDS) errs.push(`Hook dài ${words(sc.lines[0].text)} từ (> ${HOOK_WORDS} từ ≈ 2 s)`);
  const cta = sc.lines.filter(l => l.beat === 'cta').map(l => l.text).join(' ');
  if (cta && !/lexkite/i.test(cta)) errs.push('CTA phải dẫn về lexkite.com');
  const max = format === 'lesson' ? 480 : 60;
  if (sec > max) errs.push(`Dài ước tính ${Math.round(sec)} s > ${max} s`);
  if (format !== 'lesson' && sec < 15) warns.push(`Ngắn (${Math.round(sec)} s) – Shorts nên 20–45 s`);
  return { ok: !errs.length, errs, warns, sec: Math.round(sec) };
}
// Chuẩn hóa kịch bản (từ AI hoặc từ máy khách) về đúng khuôn, cắt độ dài
export function normScript(sc, job) {
  const s = sc && typeof sc === 'object' ? sc : {};
  const str = (v, n) => String(v == null ? '' : v).slice(0, n);
  return {
    title: str(s.title || job.topic, 120), hook: str(s.hook || '', 120),
    lines: (Array.isArray(s.lines) ? s.lines : []).slice(0, 100).map(l => ({ who: str(l && l.who, 12).toLowerCase(), text: str(l && l.text, 200).trim(), expr: str(l && l.expr, 40), gesture: str(l && l.gesture, 40), beat: BEATS.includes(l && l.beat) ? l.beat : 'situation', ...lineOpt(l) })),
    keywords: (Array.isArray(s.keywords) ? s.keywords : []).slice(0, 8).map(k => str(k, 40)),
    caption: str(s.caption, 1500), hashtags: (Array.isArray(s.hashtags) ? s.hashtags : []).slice(0, 10).map(h => str(h, 40).replace(/^#/, '')),
    link: /^https:\/\/lexkite\.com\//.test(s.link || '') ? str(s.link, 200) : 'https://lexkite.com/',
    ...scriptOpt(s),
  };
}
// Trường tuỳ chọn mà render.mjs/variants đọc (khuôn nội dung content/video/templates – VIDEO-PIPELINE §11): giữ lại khi hợp lệ, bỏ khi lạ.
// scene/outfit/format_id/template/area = id chữ thường (area = khu vực app, content/video/ecosystem.json) · time day|night · recast bool · wrong/right = chữ thẻ payoff ❌/✅ · từng câu: punch, scene, transition fade|wipe
const OPT_ID = /^[a-z][a-z0-9-]{0,39}$/;
function scriptOpt(s) {
  const o = {};
  for (const k of ['scene', 'outfit', 'format_id', 'template', 'area']) if (typeof s[k] === 'string' && OPT_ID.test(s[k])) o[k] = s[k];
  if (s.time === 'day' || s.time === 'night') o.time = s.time;
  if (typeof s.recast === 'boolean') o.recast = s.recast;
  for (const k of ['wrong', 'right']) if (typeof s[k] === 'string' && s[k].trim()) o[k] = s[k].trim().slice(0, 60);
  return o;
}
function lineOpt(l) {
  const o = {}; if (!l || typeof l !== 'object') return o;
  if (l.punch === true) o.punch = true;
  if (typeof l.scene === 'string' && OPT_ID.test(l.scene)) o.scene = l.scene;
  if (l.transition === 'fade' || l.transition === 'wipe') o.transition = l.transition;
  return o;
}
// Khung kịch bản khi chưa có AI (quản trị sửa tay)
export const skeleton = job => normScript({ title: job.topic, lines: [
  { who: 'mia', beat: 'hook', text: 'Wait, is that wrong?', expr: 'surprised', gesture: '' },
  { who: 'mia', beat: 'situation', text: `Today's topic: ${job.topic}.`, expr: 'thinking', gesture: '' },
  { who: 'leo', beat: 'explain', text: 'Here is the natural way to say it.', expr: 'happy smile', gesture: 'pointing' },
  { who: 'leo', beat: 'example', text: 'Example sentence goes here.', expr: 'happy smile', gesture: '' },
  { who: 'kit', beat: 'tip', text: "Kit's tip: say it out loud three times.", expr: 'proud', gesture: '' },
  { who: 'mia', beat: 'cta', text: 'Practice this free on lexkite.com', expr: 'happy smile', gesture: 'waving hello' },
], caption: job.topic, hashtags: ['learnenglish', 'englishtips', 'lexkite'] }, job);

const PROMPT_SYS = `You write scripts for Lexkite short English-learning videos (US English, natural, friendly sitcom humor).
Cast: mia (24, office worker, confused by business English, dry humor), leo (28, British coworker, explains, over-enthusiastic), ama (curious friend, asks "why"), kit (kite mascot, gives the final tip only).
Structure, one line per beat in this order: hook (≤ 6 words, curiosity or conflict, ≤ 2 seconds) → situation (funny) → explain → example → tip ("Kit's tip: …") → cta ("Practice this free on lexkite.com").
Rules: total ≤ 60 seconds spoken (about 130 words max); never invent statistics or percentages ("Most learners…" instead); never mention other apps or brands; no song lyrics or copyrighted quotes; CEFR-appropriate.
Reply with ONE JSON object: {"title","hook","lines":[{"who","beat","text","expr","gesture"}],"keywords":[],"caption","hashtags":[],"link"}.
expr is one of: happy smile, big laugh, surprised, thinking, confused, proud, embarrassed smile, agreeing nod, worried, annoyed, excited, deadpan. gesture is empty or one of: waving hello, pointing, thumbs up, arms crossed, facepalm, clapping, shrugging, explaining with hands, holding phone, thinking pose.`;
const parseJSON = t => { const s = String(t || '').replace(/^```(json)?|```$/g, '').trim(); try { return JSON.parse(s); } catch (e) { const m = s.match(/\{[\s\S]*\}/); try { return m ? JSON.parse(m[0]) : null; } catch (e2) { return null; } } };

// ---------- Khung giờ đăng ở Mỹ (giờ New York, tự xử lý EST/EDT) ----------
export const SLOTS = [7, 8, 12, 19, 20];
const NY = 'America/New_York';
const nyParts = d => Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: NY, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).formatToParts(d).map(x => [x.type, x.value]));
export const nyAt = (y, m, d, h) => { const want = Date.UTC(y, m - 1, d, h); let t = want + 5 * 36e5; for (let i = 0; i < 3; i++) { const p = nyParts(new Date(t)); t += want - Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute); } return t; };
export const nyDay = t => { const p = nyParts(new Date(t)); return `${p.year}-${p.month}-${p.day}`; };
// Khung trống kế tiếp: bỏ khung cách bài đã lên lịch < 45 phút, bỏ ngày đã đủ hạn mức/ngày, cách hiện tại ≥ leadMin phút
export function nextSlots({ now = Date.now(), taken = [], n = 5, quota = 1, leadMin = 20, days = 21 } = {}) {
  const out = [], p = nyParts(new Date(now)), perDay = {};
  for (const t of taken) perDay[nyDay(t)] = (perDay[nyDay(t)] || 0) + 1;
  for (let dd = 0; dd < days && out.length < n; dd++) {
    const b = new Date(Date.UTC(+p.year, +p.month - 1, +p.day + dd));
    for (const h of SLOTS) {
      if (out.length >= n) break;
      const t = nyAt(b.getUTCFullYear(), b.getUTCMonth() + 1, b.getUTCDate(), h), day = nyDay(t);
      if (t < now + leadMin * 6e4 || (perDay[day] || 0) >= quota || taken.some(x => Math.abs(x - t) < 45 * 6e4)) continue;
      out.push({ at: t, h, day }); perDay[day] = (perDay[day] || 0) + 1;
    }
  }
  return out;
}

// ---------- Cài đặt (config 'studio') ----------
export const DEFAULTS = { auto: false, manualFirst: 5, dailyQuota: 1, backlog: 3, platforms: [], accounts: [] };
const normSettings = s => ({
  auto: !!(s && s.auto),
  manualFirst: Math.max(0, Math.min(50, Math.round(+((s && s.manualFirst) ?? 5)) || 0)),
  dailyQuota: Math.max(1, Math.min(10, Math.round(+((s && s.dailyQuota) ?? 1)) || 1)),
  backlog: Math.max(1, Math.min(20, Math.round(+((s && s.backlog) ?? 3)) || 3)), // video tự động chờ duyệt tối đa (script_ok lỗi dựng/rendering/rendered/qa_fail) – đủ thì CI ngừng tạo thêm
  platforms: (Array.isArray(s && s.platforms) ? s.platforms : []).map(x => String(x).toLowerCase().replace(/[^a-z]/g, '')).filter(Boolean).slice(0, 10),
  accounts: (Array.isArray(s && s.accounts) ? s.accounts : []).map(x => String(x)).filter(x => /^[A-Za-z0-9_-]{1,100}$/.test(x)).slice(0, 20),
});

let ready = false;
async function setup(db) {
  if (ready) return;
  await db.batch([
    db.prepare('CREATE TABLE IF NOT EXISTS video_jobs (id TEXT PRIMARY KEY, topic TEXT NOT NULL, format TEXT NOT NULL, lang TEXT NOT NULL, status TEXT NOT NULL, script_json TEXT, qa_json TEXT, files_json TEXT, grabcast_media_id TEXT, grabcast_post_id TEXT, schedule_at INTEGER, created INTEGER NOT NULL, updated INTEGER NOT NULL, error TEXT, by TEXT) WITHOUT ROWID'),
    db.prepare('CREATE INDEX IF NOT EXISTS video_jobs_status ON video_jobs (status, updated)'),
    db.prepare('CREATE TABLE IF NOT EXISTS config (k TEXT PRIMARY KEY, v TEXT, at INTEGER, by TEXT) WITHOUT ROWID'),
  ]);
  ready = true;
}
const J = (s, d) => { try { return s ? JSON.parse(s) : d; } catch (e) { return d; } };
const rowOut = r => r && ({ id: r.id, topic: r.topic, format: r.format, lang: r.lang, status: r.status, script: J(r.script_json, null), qa: J(r.qa_json, null), files: J(r.files_json, {}), media_id: r.grabcast_media_id || null, post_id: r.grabcast_post_id || null, schedule_at: r.schedule_at || null, created: r.created, updated: r.updated, error: r.error || null });
const getJob = async (db, id) => rowOut(await db.prepare('SELECT * FROM video_jobs WHERE id = ?').bind(String(id || '')).first());
async function getSettings(db) { const r = await db.prepare("SELECT v FROM config WHERE k = 'studio'").first(); return normSettings({ ...DEFAULTS, ...J(r && r.v, {}) }); }
// Ghi job + kiểm chuyển trạng thái (sai luồng → lỗi 409)
class Bad extends Error { constructor(status, code, extra) { super(code); this.status = status; this.code = code; this.extra = extra; } }
async function save(db, job, patch = {}) {
  if (patch.status && patch.status !== job.status && !canMove(job.status, patch.status)) throw new Bad(409, 'bad-transition', { from: job.status, to: patch.status });
  const n = { ...job, ...patch, updated: Date.now() };
  await db.prepare('UPDATE video_jobs SET status = ?, script_json = ?, qa_json = ?, files_json = ?, grabcast_media_id = ?, grabcast_post_id = ?, schedule_at = ?, updated = ?, error = ? WHERE id = ?')
    .bind(n.status, n.script ? JSON.stringify(n.script) : null, n.qa ? JSON.stringify(n.qa) : null, JSON.stringify(n.files || {}), n.media_id || null, n.post_id || null, n.schedule_at || null, n.updated, n.error ? String(n.error).slice(0, 500) : null, n.id).run();
  return n;
}
const newId = () => 'v' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
async function insertJob(db, { topic, format, lang }, by) {
  const t = String(topic || '').trim().slice(0, 200); if (!t) throw new Bad(400, 'topic');
  const id = newId(), now = Date.now();
  await db.prepare('INSERT INTO video_jobs (id, topic, format, lang, status, files_json, created, updated, by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(id, t, format === 'lesson' ? 'lesson' : 'short', /^[a-z]{2}(-[A-Z]{2})?$/.test(lang || '') ? lang : 'en', 'idea', '{}', now, now, String(by || '').slice(0, 120)).run();
  return getJob(db, id);
}

// ---------- Tài nguyên trong repo (công khai) – đệm 10 phút ở biên ----------
async function repoJson(file) {
  const url = RAW + file;
  try { const c = /** @type {any} */ (caches).default, hit = await c.match(url); if (hit) return await hit.json(); } catch (e) { /* bỏ qua */ }
  const r = await fetch(url, { headers: { 'User-Agent': 'lexkite-studio' } });
  if (!r.ok) return null;
  const text = await r.text(), j = J(text, null);
  try { await /** @type {any} */ (caches).default.put(url, new Response(text, { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'max-age=600' } })); } catch (e) { /* bỏ qua */ }
  return j;
}

// ---------- GrabCast (cùng whitelist & cách gắn khóa như functions/api/social.js) ----------
const scrub = (t, ...keys) => { let s = String(t); for (const k of keys) if (k && k.length >= 6) s = s.split(k).join('***'); return s; };
async function gc(env, method, path, body, idem) {
  const key = env.GRABCAST_API_KEY; if (!key) throw new Bad(503, 'not-configured', { need: 'GRABCAST_API_KEY' });
  if (!gcAllowed(method, path)) throw new Bad(400, 'route');
  if (await limit('gc:min', 55, 60) || await limit('gc:day', 2900, 86400)) throw new Bad(429, 'grabcast-rate');
  const headers = { 'X-API-Key': key, 'X-Workspace': String(env.GRABCAST_WORKSPACE || GC_WS).trim() || GC_WS, Accept: 'application/json' };
  if (method !== 'GET') headers['Content-Type'] = 'application/json';
  if (idem) headers['Idempotency-Key'] = idem;
  const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), TIMEOUT);
  let r, text;
  try { r = await fetch(String(env.GRABCAST_API_BASE || GC_BASE).replace(/\/+$/, '') + '/api/social/' + path, { method, headers, body: method === 'GET' ? undefined : JSON.stringify(body || {}), signal: ctl.signal }); text = await r.text(); }
  catch (e) { throw new Bad(504, ctl.signal.aborted ? 'timeout' : 'upstream'); }
  finally { clearTimeout(timer); }
  const j = J(scrub(text, key), { raw: scrub(text, key).slice(0, 200) });
  if (!r.ok) throw new Bad(r.status === 429 ? 429 : 502, (j && typeof j.error === 'string' && /^[a-z_-]{2,40}$/.test(j.error)) ? j.error : 'upstream', { message: scrub(JSON.stringify(j), key).slice(0, 300) });
  return j;
}
const pick = (o, ...ks) => { for (const k of ks) if (o && o[k] != null && o[k] !== '') return o[k]; return undefined; };
const arr = j => (Array.isArray(j) ? j : (j && (j.items || j.data || j.results || j.accounts || j.posts)) || []);
const hex = async s => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))].map(b => b.toString(16).padStart(2, '0')).join('');

// Lịch đã chiếm: bài studio đã lên lịch (D1) – GrabCast có thể có thêm bài tay, UI xem ở lịch đăng
async function takenSlots(db) { return ((await db.prepare("SELECT schedule_at FROM video_jobs WHERE status IN ('scheduled', 'published') AND schedule_at > ?").bind(Date.now() - 2 * DAY).all()).results || []).map(r => +r.schedule_at); }
async function doneCount(db) { return +((await db.prepare("SELECT COUNT(*) AS n FROM video_jobs WHERE status IN ('scheduled', 'published')").first()) || {}).n || 0; }

// Chữ bài đăng: caption + link sâu đúng tính năng (script.link – Shorts/TikTok/Reels bỏ qua trường link nên phải nằm trong chữ) + hashtag
export function postCaption(sc, topic = '') {
  const cap = String(sc.caption || sc.title || topic || ''), link = /^https:\/\/lexkite\.com\//.test(sc.link || '') && !cap.includes(sc.link) ? sc.link : '';
  return [cap, link, (sc.hashtags || []).map(h => '#' + h).join(' ')].filter(Boolean).join('\n\n').slice(0, 2200);
}
// Đăng: kho (object đã tải lên từ CI) → use (media_id) → validate → tạo bài (Idempotency-Key ổn định) → lên lịch khung trống kế tiếp
export async function publishJob(env, db, job, { at, accounts, auto = false } = {}) {
  const st = await getSettings(db);
  if (auto) {
    if (!st.auto) throw new Bad(409, 'auto-off');
    const done = await doneCount(db); if (done < st.manualFirst) throw new Bad(409, 'manual-approval', { done, need: st.manualFirst });
  }
  if (job.status === 'qa_ok') {
    if (!job.qa || job.qa.blocked || !qaTotal(job.qa.scores).pass) throw new Bad(409, job.qa && job.qa.blocked ? 'qa-blocked' : 'qa-below-90'); // blocked = lỗi cổng nhất quán/chống lặp (VIDEO-PIPELINE §8–9)
    const oid = job.files && job.files.object_id; if (!oid || !/^[A-Za-z0-9_-]{1,100}$/.test(String(oid))) throw new Bad(409, 'no-file');
    const used = await gc(env, 'POST', `storage/objects/${oid}/use`, {});
    const mediaId = pick(used, 'media_id') || pick(used.media || {}, 'id') || pick(used, 'id'); if (!mediaId) throw new Bad(502, 'no-media-id');
    const sc = job.script || {}, ids = (accounts && accounts.length ? accounts : st.accounts).map(String);
    let acc = arr(await gc(env, 'GET', 'accounts')).filter(a => !/expired|error|revoked|disconnected/i.test(String(pick(a, 'status', 'state') || '')));
    if (ids.length) acc = acc.filter(a => ids.includes(String(a.id)));
    else if (st.platforms.length) acc = acc.filter(a => st.platforms.includes(String(pick(a, 'platform', 'provider') || '').toLowerCase().replace(/[^a-z]/g, '')));
    if (!acc.length) throw new Bad(409, 'no-accounts');
    const kind = a => { const k = a && (a.kinds || a.supported_kinds || a.post_kinds); return Array.isArray(k) && k.length ? String(k[0]) : 'video'; };
    const caption = postCaption(sc, job.topic);
    const payload = { title: String(sc.title || job.topic).slice(0, 200), caption, link: sc.link || 'https://lexkite.com/', media_ids: [mediaId], targets: acc.map(a => ({ account_id: a.id, kind: kind(a), options: {} })) };
    const v = await gc(env, 'POST', 'validate', payload), errs = [...(v.errors || []), ...(v.problems || []), ...((v.targets || []).flatMap(t => [...(t.errors || []), ...(t.problems || [])]))].filter(x => !/warn/.test(String((x && x.level) || '')));
    if (v.valid === false || v.ok === false || errs.length) throw new Bad(422, 'validate', { message: JSON.stringify(errs.length ? errs : v).slice(0, 400) });
    const c = await gc(env, 'POST', 'posts', payload, (await hex(job.id + '|' + mediaId)).slice(0, 40));
    const postId = pick(c, 'id') || pick(c.post || c.data || {}, 'id'); if (!postId) throw new Bad(502, 'no-post-id');
    job = await save(db, job, { status: 'uploaded', media_id: String(mediaId), post_id: String(postId), error: null });
  }
  if (job.status !== 'uploaded') throw new Bad(409, 'bad-transition', { from: job.status, to: 'scheduled' });
  return scheduleJob(env, db, job, at, st);
}
async function scheduleJob(env, db, job, at, st) {
  st = st || await getSettings(db);
  let t = at ? +new Date(at) : 0;
  if (at && (!t || t < Date.now() + 60e3)) throw new Bad(400, 'at-past');
  if (!t) { const s = nextSlots({ taken: await takenSlots(db), quota: st.dailyQuota, n: 1 })[0]; if (!s) throw new Bad(409, 'no-slot'); t = s.at; }
  if (!job.post_id || !/^[A-Za-z0-9_-]{1,100}$/.test(job.post_id)) throw new Bad(409, 'no-post');
  await gc(env, 'POST', `posts/${job.post_id}/schedule`, { scheduled_at: new Date(t).toISOString(), consent: true });
  return save(db, job, { status: 'scheduled', schedule_at: t, error: null });
}

// Chạy video.yml qua GitHub API (workflow_dispatch) – token không bao giờ trả về/ghi log
async function dispatch(env, job) {
  const tok = env.GH_DISPATCH_TOKEN; if (!tok) throw new Bad(503, 'not-configured', { need: 'GH_DISPATCH_TOKEN' });
  const r = await fetch(`https://api.github.com/repos/${REPO}/actions/workflows/video.yml/dispatches`, { method: 'POST', headers: { Authorization: 'Bearer ' + tok, Accept: 'application/vnd.github+json', 'User-Agent': 'lexkite-studio', 'X-GitHub-Api-Version': '2022-11-28', 'Content-Type': 'application/json' }, body: JSON.stringify({ ref: String(env.STUDIO_REF || 'main'), inputs: { job_id: job.id } }) }).catch(() => null);
  if (!r) throw new Bad(504, 'upstream');
  if (r.status !== 204 && !r.ok) { const t = scrub(await r.text().catch(() => ''), tok); throw new Bad(502, r.status === 401 || r.status === 403 ? 'gh-auth' : r.status === 404 ? 'gh-no-workflow' : 'upstream', { message: t.slice(0, 200) }); }
}

// ---------- Thao tác quản trị ----------
const OPS = {
  async list(env, db, b) {
    const st = STATUSES.includes(b.status) ? b.status : null;
    const rows = ((await db.prepare(`SELECT id, topic, format, lang, status, qa_json, files_json, grabcast_post_id, schedule_at, created, updated, error FROM video_jobs ${st ? 'WHERE status = ?1' : ''} ORDER BY updated DESC LIMIT 300`).bind(...(st ? [st] : [])).all()).results || [])
      .map(r => ({ id: r.id, topic: r.topic, format: r.format, lang: r.lang, status: r.status, total: (J(r.qa_json, {}) || {}).total ?? null, preview: !!(J(r.files_json, {}) || {}).preview_url, post_id: r.grabcast_post_id || null, schedule_at: r.schedule_at || null, created: r.created, updated: r.updated, error: r.error || null }));
    const counts = Object.fromEntries(STATUSES.map(s => [s, 0])); for (const r of ((await db.prepare('SELECT status, COUNT(*) AS n FROM video_jobs GROUP BY status').all()).results || [])) counts[r.status] = r.n;
    const set = { render: !!env.GH_DISPATCH_TOKEN, callback: !!env.STUDIO_CALLBACK_SECRET, grabcast: !!env.GRABCAST_API_KEY };
    return { rows, counts, statuses: STATUSES, trans: TRANS, rubric: RUBRIC, pass: PASS, settings: await getSettings(db), done: await doneCount(db), configured: set };
  },
  async get(env, db, b) { const j = await getJob(db, b.id); if (!j) throw new Bad(404, 'not-found'); return { job: j, check: j.script ? checkScript(j.script, j.format) : null, rubric: RUBRIC, pass: PASS, trans: TRANS }; },
  async create(env, db, b, who) { return { job: await insertJob(db, b, who.email) }; },
  async createFromQueue(env, db, b, who) {
    const q = await repoJson('content/video/queue.json'); const items = Array.isArray(q) ? q : (q && q.topics) || [];
    if (!items.length) throw new Bad(404, 'no-queue');
    const have = new Set(((await db.prepare('SELECT topic FROM video_jobs').all()).results || []).map(r => r.topic.toLowerCase()));
    const fresh = items.map(x => (typeof x === 'string' ? { topic: x } : x)).filter(x => x && x.topic && !have.has(String(x.topic).toLowerCase()));
    const out = []; for (const x of fresh.slice(0, Math.max(1, Math.min(10, +b.n || 1)))) out.push(await insertJob(db, x, who.email));
    return { jobs: out, left: Math.max(0, fresh.length - out.length) };
  },
  async jobDelete(env, db, b) { const j = await getJob(db, b.id); if (!j) throw new Bad(404, 'not-found'); if (['uploaded', 'scheduled', 'published'].includes(j.status)) throw new Bad(409, 'has-post'); await db.prepare('DELETE FROM video_jobs WHERE id = ?').bind(j.id).run(); return { ok: true }; },
  async scriptGen(env, db, b) {
    const j = await getJob(db, b.id); if (!j) throw new Bad(404, 'not-found');
    if (!canMove(j.status, 'script')) throw new Bad(409, 'bad-transition', { from: j.status, to: 'script' });
    const g = await geminiCall(env, { systemInstruction: { parts: [{ text: PROMPT_SYS }] }, contents: [{ role: 'user', parts: [{ text: `Format: ${j.format === 'lesson' ? 'YouTube lesson 16:9 (5–8 min, 6–8 situations)' : 'Short 9:16 (20–45 s)'}\nTopic: ${j.topic}${b.hint ? '\nEditor note: ' + String(b.hint).slice(0, 300) : ''}` }] }], generationConfig: { responseMimeType: 'application/json', temperature: 0.8 } }).catch(() => null);
    const raw = g && parseJSON(g.text), ai = !!(raw && Array.isArray(raw.lines) && raw.lines.length);
    const script = ai ? normScript(raw, j) : skeleton(j), check = checkScript(script, j.format);
    let job = await save(db, j, { status: 'script', script, error: ai ? null : 'ai-unavailable: dùng khung mẫu, sửa tay' });
    const st = await getSettings(db);
    if (st.auto && ai && check.ok) { job = await save(db, job, { status: 'script_ok' }); if (env.GH_DISPATCH_TOKEN && env.STUDIO_CALLBACK_SECRET) { await dispatch(env, job); job = await save(db, job, { status: 'rendering' }); } }
    return { job, check, ai };
  },
  async scriptSave(env, db, b) {
    const j = await getJob(db, b.id); if (!j) throw new Bad(404, 'not-found');
    const script = normScript(b.script, j); return { job: await save(db, j, { status: 'script', script, qa: null, error: null }), check: checkScript(script, j.format) };
  },
  async scriptApprove(env, db, b) {
    const j = await getJob(db, b.id); if (!j) throw new Bad(404, 'not-found');
    const check = checkScript(j.script, j.format); if (!check.ok) throw new Bad(422, 'script-invalid', { errs: check.errs });
    return { job: await save(db, j, { status: 'script_ok' }), check };
  },
  async render(env, db, b) {
    const j = await getJob(db, b.id); if (!j) throw new Bad(404, 'not-found');
    if (!canMove(j.status, 'rendering')) throw new Bad(409, 'bad-transition', { from: j.status, to: 'rendering' });
    if (!env.STUDIO_CALLBACK_SECRET) throw new Bad(503, 'not-configured', { need: 'STUDIO_CALLBACK_SECRET' });
    await dispatch(env, j);
    return { job: await save(db, j, { status: 'rendering', error: null, files: { ...(j.files || {}), dispatched: Date.now() } }) };
  },
  async qaSet(env, db, b) {
    const j = await getJob(db, b.id); if (!j) throw new Bad(404, 'not-found');
    if (!['rendered', 'qa_ok', 'qa_fail'].includes(j.status)) throw new Bad(409, 'bad-transition', { from: j.status, to: 'qa' });
    const q = qaTotal({ ...((j.qa && j.qa.scores) || {}), ...(b.scores || {}) });
    const pass = q.pass && !(j.qa && j.qa.blocked); // chấm tay không gỡ được chặn của cổng nhất quán – phải dựng lại
    const qa = { ...(j.qa || {}), scores: q.scores, total: q.total, missing: q.missing, pass, manual: Date.now() };
    return { job: await save(db, j, { status: q.missing.length ? (j.status === 'rendered' ? 'rendered' : 'qa_fail') : pass ? 'qa_ok' : 'qa_fail', qa }) };
  },
  async publish(env, db, b) {
    if (b.confirm !== true) throw new Bad(400, 'confirm');
    const j = await getJob(db, b.id); if (!j) throw new Bad(404, 'not-found');
    try { return { job: await publishJob(env, db, j, { at: b.at, accounts: b.accounts }) }; }
    catch (e) { if (e instanceof Bad && e.status !== 503) await save(db, await getJob(db, j.id), { error: e.code + (e.extra && e.extra.message ? ': ' + e.extra.message : '') }).catch(() => {}); throw e; }
  },
  async schedule(env, db, b) { const j = await getJob(db, b.id); if (!j) throw new Bad(404, 'not-found'); if (j.status !== 'uploaded') throw new Bad(409, 'bad-transition', { from: j.status, to: 'scheduled' }); return { job: await scheduleJob(env, db, j, b.at) }; },
  async unschedule(env, db, b) {
    const j = await getJob(db, b.id); if (!j) throw new Bad(404, 'not-found'); if (j.status !== 'scheduled') throw new Bad(409, 'bad-transition', { from: j.status, to: 'uploaded' });
    await gc(env, 'POST', `posts/${j.post_id}/unschedule`, {}); return { job: await save(db, j, { status: 'uploaded', schedule_at: null }) };
  },
  // Đồng bộ trạng thái bài đã lên lịch với GrabCast (đã đăng → published)
  async sync(env, db) {
    const rows = ((await db.prepare("SELECT id FROM video_jobs WHERE status = 'scheduled' AND grabcast_post_id IS NOT NULL ORDER BY schedule_at LIMIT 10").all()).results || []); let n = 0;
    for (const r of rows) { const j = await getJob(db, r.id); const p = await gc(env, 'GET', `posts/${j.post_id}`).catch(() => null); const s = String(pick(p || {}, 'status', 'state') || pick((p || {}).post || {}, 'status') || ''); if (/publish|posted|done|success|live/i.test(s)) { await save(db, j, { status: 'published' }); n++; } }
    return { checked: rows.length, published: n };
  },
  async slots(env, db, b) { const st = await getSettings(db); return { slots: nextSlots({ taken: await takenSlots(db), quota: st.dailyQuota, n: Math.max(1, Math.min(15, +b.n || 6)) }) }; },
  async settings(env, db) { return { settings: await getSettings(db), done: await doneCount(db) }; },
  async settingsSet(env, db, b, who) { const s = normSettings({ ...(await getSettings(db)), ...(b.settings || {}) }); await db.prepare("INSERT OR REPLACE INTO config (k, v, at, by) VALUES ('studio', ?, ?, ?)").bind(JSON.stringify(s), Date.now(), String(who.email || '').slice(0, 120)).run(); return { settings: s }; },
  async assets() { const a = await repoJson('content/video/assets.json'); if (!a) throw new Bad(502, 'assets-unavailable'); return { assets: a }; },
};
const WRITE = new Set(['create', 'createFromQueue', 'jobDelete', 'scriptGen', 'scriptSave', 'scriptApprove', 'render', 'qaSet', 'publish', 'schedule', 'unschedule', 'settingsSet']);

// ---------- CI gọi lại (video.yml / scripts/video/render.mjs) ----------
async function secretOk(env, given) {
  const want = env.STUDIO_CALLBACK_SECRET; if (!want || !given) return false;
  const [a, b] = await Promise.all([hex('studio|' + want), hex('studio|' + given)]); let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; // so sánh băm, thời gian không đổi
}
const CI = {
  // cine-render (news, owner 22/10 VIDEO-SCALE-PLAN §11): AI vision gate on 3 composited frames - does the presenter stand naturally in the scene?
  // Gemini vision from the key pool; fallback Workers AI llava (one image at a time). Images: base64 JPEG <= 180 KB each, max 4.
  async visionCheck(env, db, b) {
    const imgs = (Array.isArray(b.images) ? b.images : []).slice(0, 4).filter(x => typeof x === 'string' && x.length < 250000 && /^[A-Za-z0-9+/=]+$/.test(x));
    if (!imgs.length) throw new Bad(400, 'images');
    const q = String(b.question || '').slice(0, 2000);
    const g = await geminiCall(env, { contents: [{ role: 'user', parts: [{ text: q }, ...imgs.map(d => ({ inline_data: { mime_type: 'image/jpeg', data: d } }))] }], generationConfig: { temperature: 0, responseMimeType: 'application/json' } });
    if (g && g.text) return { provider: 'gemini', text: g.text };
    if (env.AI) {
      const frames = [];
      for (const d of imgs) {
        const bytes = [...Uint8Array.from(atob(d), c => c.charCodeAt(0))];
        const r = await env.AI.run('@cf/llava-hf/llava-1.5-7b-hf', { image: bytes, prompt: 'Does the person in this image stand naturally in the scene, or do they appear to stand on/in a table, chair, counter, bed, water or vehicle, float, or have a wrong scale? Answer starting with NATURAL or PROBLEM, then a short reason.', max_tokens: 60 }).catch(() => null);
        const t = String((r && (r.description || r.response)) || '').trim();
        frames.push({ natural: /^\s*natural/i.test(t), problem: /^\s*natural/i.test(t) ? '' : t.slice(0, 140) || 'no answer' });
      }
      return { provider: 'workers-ai', text: JSON.stringify({ frames }) };
    }
    return { provider: 'none', text: null };
  },
  // video-auto.yml (theo lịch): tạo job từ kịch bản khuôn đã qua lint (scripts/video/auto.mjs) → script_ok → rendering; CI tự gọi video.yml.
  // Chặn: trùng nguồn (vars file) · công tắc Tự động tắt · đủ hạn mức/ngày · tồn đọng chờ duyệt ≥ backlog. force (chạy tay) bỏ qua 3 chặn sau.
  async ciCreate(env, db, b) {
    const src = String(b.source || ''); if (!/^[a-z0-9-]{1,40}--[a-z0-9-]{1,60}$/.test(src)) throw new Bad(400, 'source');
    const dup = await db.prepare('SELECT id, status FROM video_jobs WHERE files_json LIKE ?').bind(`%"source":"${src}"%`).first();
    if (dup) {
      // dựng lỗi (CI trả về script_ok) → cho dựng lại tối đa 2 lần, không tính hạn mức
      let d = await getJob(db, dup.id), tries = +((d.files || {}).retries || 0);
      if (d.status !== 'script_ok' || tries >= 2) return { exists: true, job: { id: d.id, status: d.status } };
      d = await save(db, d, { status: 'rendering', error: null, files: { ...d.files, retries: tries + 1, dispatched: Date.now() } });
      return { retry: tries + 1, job: { id: d.id, status: d.status } };
    }
    const st = await getSettings(db), force = b.force === true;
    if (!force && !st.auto) throw new Bad(409, 'auto-off');
    const n = async sql => +(((await db.prepare(sql).bind(Date.now() - DAY).first()) || {}).n || 0);
    if (!force && await n(`SELECT COUNT(*) AS n FROM video_jobs WHERE created > ? AND files_json LIKE '%"source":"%'`) >= st.dailyQuota) throw new Bad(409, 'quota', { quota: st.dailyQuota });
    const pending = +(((await db.prepare(`SELECT COUNT(*) AS n FROM video_jobs WHERE status IN ('script_ok', 'rendering', 'rendered', 'qa_fail') AND created > ? AND files_json LIKE '%"source":"%'`).bind(Date.now() - 30 * DAY).first()) || {}).n || 0);
    if (!force && pending >= st.backlog) throw new Bad(409, 'backlog', { pending, backlog: st.backlog });
    const sc = b.script && typeof b.script === 'object' ? b.script : null;
    const check = checkScript(sc, 'short'); if (!check.ok) throw new Bad(422, 'script-invalid', { errs: check.errs });
    let j = await insertJob(db, { topic: b.topic || sc.title, format: 'short', lang: 'en' }, 'ci:auto');
    j = await save(db, j, { status: 'script', script: normScript(sc, j), files: { source: src, auto: Date.now() } });
    j = await save(db, j, { status: 'script_ok' });
    j = await save(db, j, { status: 'rendering', files: { ...j.files, dispatched: Date.now() } });
    return { job: { id: j.id, status: j.status } };
  },
  async ciJob(env, db, b) {
    const j = await getJob(db, b.id); if (!j) throw new Bad(404, 'not-found');
    // dấu vân tay biến thể của 30 video gần nhất → bộ sinh chống lặp (scripts/video/variants.mjs)
    const rows = ((await db.prepare('SELECT files_json FROM video_jobs WHERE id != ? AND files_json LIKE ? ORDER BY updated DESC LIMIT 30').bind(j.id, '%"variant"%').all()).results || []);
    const recent = rows.map(r => J(r.files_json, {}).variant).filter(v => v && typeof v === 'object').reverse();
    return { job: { id: j.id, topic: j.topic, format: j.format, lang: j.lang, status: j.status, script: j.script, recent } };
  },
  async ciResult(env, db, b) {
    let j = await getJob(db, b.id); if (!j) throw new Bad(404, 'not-found');
    if (!['rendering', 'rendered'].includes(j.status)) throw new Bad(409, 'bad-transition', { from: j.status, to: 'rendered' });
    const f = b.files && typeof b.files === 'object' ? b.files : {}, files = { ...(j.files || {}) };
    for (const k of ['object_id', 'run_url', 'preview_url', 'artifact']) if (typeof f[k] === 'string' && f[k].length <= 300 && (k === 'object_id' ? /^[A-Za-z0-9_-]{1,100}$/.test(f[k]) : /^https:\/\//.test(f[k]) || k === 'artifact')) files[k] = f[k];
    for (const k of ['duration', 'size', 'width', 'height']) if (Number.isFinite(+f[k])) files[k] = +f[k];
    if (Array.isArray(f.todo)) files.todo = f.todo.slice(0, 12).map(x => String(x).slice(0, 60));
    if (f.variant && typeof f.variant === 'object') { // dấu vân tay tổ hợp (chuỗi ngắn) để chống lặp
      const v = {}; for (const k of ['format', 'setting', 'cast', 'hookStyle', 'transition', 'music', 'endCard', 'cameraSet', 'scene', 'time', 'season', 'room']) if (typeof f.variant[k] === 'string') v[k] = f.variant[k].slice(0, 80);
      if (Array.isArray(f.variant.clips)) v.clips = f.variant.clips.slice(0, 20).map(x => String(x).slice(0, 60)); files.variant = v;
    }
    if (!b.ok) return { job: await save(db, j, { status: j.status === 'rendering' ? 'script_ok' : j.status, files, error: 'render: ' + String(b.error || 'lỗi không rõ').slice(0, 300) }) };
    const blocked = !!(b.qa && b.qa.blocked), consistency = (b.qa && Array.isArray(b.qa.consistency) ? b.qa.consistency.slice(0, 20) : []).map(x => String(x).slice(0, 200));
    const q = qaTotal(b.qa && b.qa.scores), qa = { scores: q.scores, total: q.total, missing: q.missing, pass: q.pass && !blocked, blocked, consistency, gates: (b.qa && Array.isArray(b.qa.gates) ? b.qa.gates.slice(0, 20) : []).map(g => ({ k: String(g.k || '').slice(0, 30), ok: !!g.ok, note: String(g.note || '').slice(0, 160) })), at: Date.now() };
    j = await save(db, j, { status: q.missing.length ? 'rendered' : qa.pass ? 'qa_ok' : 'qa_fail', files, qa, error: null });
    let auto = null;
    if (j.status === 'qa_ok') { try { j = await publishJob(env, db, j, { auto: true }); auto = 'scheduled'; } catch (e) { auto = e.code || 'error'; } }
    return { job: { id: j.id, status: j.status }, auto };
  },
};

const json = (req, status, data) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...adminCors(req) } });
export const onRequestOptions = ({ request }) => new Response(null, { status: 204, headers: adminCors(request) });

export async function onRequestPost({ request, env }) {
  if (+(request.headers.get('Content-Length') || 0) > MAX_BODY) return json(request, 413, { error: 'too-large' });
  const ciSecret = request.headers.get('X-Studio-Secret');
  let who = null;
  if (ciSecret != null) {
    if (!env.STUDIO_CALLBACK_SECRET) return json(request, 503, { error: 'not-configured', need: 'STUDIO_CALLBACK_SECRET' });
    if (await limit('studio-ci:' + (request.headers.get('CF-Connecting-IP') || '?'), 60, 60)) return json(request, 429, { error: 'too-fast' });
    if (!(await secretOk(env, ciSecret))) return json(request, 403, { error: 'forbidden' });
  } else {
    const g = await adminGate(request, env, 'std'); if (!g.who) return json(request, g.status, { error: g.error }); who = g.who;
  }
  let b; try { b = await request.json(); } catch (e) { return json(request, 400, { error: 'json' }); }
  const T = who ? OPS : CI, fn = b && typeof b === 'object' && Object.hasOwn(T, b.op) ? T[b.op] : null; if (!fn) return json(request, 400, { error: 'op' });
  try {
    await setup(env.DB);
    const out = await fn(env, env.DB, b, who);
    if (who && WRITE.has(b.op)) await adminAudit(env, request, who.email, 'studio:' + b.op, true);
    return json(request, 200, out);
  } catch (e) {
    if (who && WRITE.has(b.op)) await adminAudit(env, request, who.email, 'studio:' + b.op, false);
    if (e instanceof Bad) return json(request, e.status, { error: e.code, ...(e.extra || {}) });
    return json(request, 500, { error: 'server', message: scrub(String((e && e.message) || e), env.GH_DISPATCH_TOKEN, env.GRABCAST_API_KEY, env.STUDIO_CALLBACK_SECRET).slice(0, 200) });
  }
}
