/* API trang quản trị (/admin.html). Chỉ email trong biến bí mật ADMIN_EMAILS (Cloudflare Pages) được dùng.
 * POST /api/admin  (Authorization: Bearer <Firebase ID token>)  { op, ... }
 * op: usage · services · serviceSet · serviceDelete · overview · users · user · userDelete · inbox · inboxMark · analytics · errors · errorsClear · config · configSet · alerts */
import { claims, limit } from './sync.js';
import { geminiKeys, geminiCall, isCooling, resetGeminiCache } from './ai.js';
import { setup as hitSetup } from './hit.js';

const ORIGINS = /^https:\/\/((www\.)?lexkite\.com|([a-z0-9-]+\.)?lexkite\.pages\.dev)$/;
const REPO = 'lexkiteapp/lexkiteapp.github.io';
const CONFIG_KEYS = ['banner', 'banner_url', 'banner_level', 'ai_user', 'ai_anon', 'ai_global', 'alert_errors', 'note', 'hit_rate'];
const DAY = 86400e3;
const cors = req => { const o = req.headers.get('Origin') || ''; return ORIGINS.test(o) ? { 'Access-Control-Allow-Origin': o, 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Allow-Methods': 'POST, OPTIONS', Vary: 'Origin' } : {}; };
const json = (req, status, data) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...cors(req) } });

// Hạn mức gói miễn phí (cập nhật khi nhà cung cấp đổi) – dùng cho thẻ dung lượng & cảnh báo
const FREE = { dbBytes: 500 * 1024 * 1024, writesDay: 100000, readsDay: 5000000, authMau: 50000, aiDay: 400 };
let ready = false;

async function setup(db) {
  if (ready) return;
  await hitSetup(db);
  await db.batch([
    db.prepare('CREATE TABLE IF NOT EXISTS services (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, purpose TEXT, account TEXT, console TEXT, billing TEXT, free TEXT, secret TEXT, status TEXT, note TEXT, ord INTEGER DEFAULT 0)'),
    db.prepare('CREATE TABLE IF NOT EXISTS admin_log (id INTEGER PRIMARY KEY AUTOINCREMENT, at INTEGER NOT NULL, email TEXT, op TEXT, ok INTEGER, ip TEXT, country TEXT)'),
    db.prepare('CREATE TABLE IF NOT EXISTS i18n_fix (lang TEXT, key TEXT, val TEXT, at INTEGER, by TEXT, PRIMARY KEY (lang, key)) WITHOUT ROWID'),
    db.prepare('CREATE TABLE IF NOT EXISTS i18n_judge (h TEXT PRIMARY KEY, lang TEXT, ok INTEGER, note TEXT, at INTEGER) WITHOUT ROWID'),
    db.prepare('CREATE TABLE IF NOT EXISTS config (k TEXT PRIMARY KEY, v TEXT, at INTEGER, by TEXT) WITHOUT ROWID'),
    db.prepare('CREATE TABLE IF NOT EXISTS users (uid TEXT PRIMARY KEY, email TEXT, name TEXT, created INTEGER NOT NULL, seen INTEGER NOT NULL, plat TEXT, n INTEGER DEFAULT 1) WITHOUT ROWID'),
    db.prepare('CREATE TABLE IF NOT EXISTS contact_msgs (id INTEGER PRIMARY KEY AUTOINCREMENT, who TEXT NOT NULL, at INTEGER NOT NULL, name TEXT, email TEXT, msg TEXT, lang TEXT, sent INTEGER DEFAULT 0)'),
  ]);
  await db.prepare('ALTER TABLE contact_msgs ADD COLUMN handled INTEGER DEFAULT 0').run().catch(() => {});
  ready = true;
}

const one = async (db, sql, ...a) => (await db.prepare(sql).bind(...a).first()) || {};
const all = async (db, sql, ...a) => (await db.prepare(sql).bind(...a).all()).results || [];
const dayStr = t => new Date(t).toISOString().slice(0, 10);

// Danh sách khóa Gemini (gộp khóa đơn cũ 'gemini_key' vào danh sách mới)
async function gkList(db) {
  const rows = (await db.prepare("SELECT k, v, at, by FROM config WHERE k IN ('gemini_keys', 'gemini_key')").all()).results || [];
  let list = []; const many = rows.find(r => r.k === 'gemini_keys'), one = rows.find(r => r.k === 'gemini_key');
  try { list = many ? JSON.parse(many.v) : []; } catch (e) { list = []; }
  if (one && one.v && !list.some(x => x.k === one.v)) list.unshift({ k: one.v, at: one.at || 0, by: one.by || '' });
  return list;
}
async function gkSave(db, list) {
  await db.batch([db.prepare('INSERT OR REPLACE INTO config (k, v, at) VALUES (?, ?, ?)').bind('gemini_keys', JSON.stringify(list), Date.now()), db.prepare("DELETE FROM config WHERE k = 'gemini_key'")]);
  resetGeminiCache();
}

const OPS = {
  async usage(db) {
    const now = Date.now(), d1 = dayStr(now), t0 = Date.parse(d1 + 'T00:00:00Z');
    const r = await db.prepare('SELECT 1').run(), size = (r.meta && (r.meta.size_after ?? r.meta.db_size)) || 0;
    const tables = await all(db, "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%'");
    const counts = {};
    for (const t of tables) counts[t.name] = (await one(db, `SELECT COUNT(*) AS n FROM "${t.name}"`)).n;
    const w = await Promise.all([
      one(db, 'SELECT COUNT(*) AS n FROM sessions WHERE at >= ?', t0), one(db, 'SELECT COUNT(*) AS n FROM docs WHERE updated >= ?', t0),
      one(db, 'SELECT COUNT(*) AS n FROM users WHERE seen >= ?', t0), one(db, 'SELECT COALESCE(SUM(n), 0) AS n FROM errors WHERE last >= ?', t0),
      one(db, 'SELECT COUNT(*) AS n FROM contact_msgs WHERE at >= ?', t0),
    ]);
    const writes = w.reduce((a, x) => a + (x.n || 0), 0);
    const mau = (await one(db, 'SELECT COUNT(*) AS n FROM users WHERE seen > ?', now - 30 * DAY)).n || 0;
    const ai = (await one(db, "SELECT n FROM ai_quota WHERE id = '*' AND day = ?", d1).catch(() => ({}))).n || 0;
    const aiCap = +((await one(db, "SELECT v FROM config WHERE k = 'ai_global'")).v || FREE.aiDay);
    const meter = (name, used, cap, unit, hint) => ({ name, used, cap, pct: cap ? Math.round(used / cap * 1000) / 10 : 0, unit, hint });
    return { counts, meters: [
      meter('Dung lượng cơ sở dữ liệu D1', size, FREE.dbBytes, 'bytes', 'Gói miễn phí: 500 MB/cơ sở dữ liệu. Gói Workers Paid 5 USD/tháng: 10 GB.'),
      meter('Lượt ghi D1 hôm nay (ước tính)', writes, FREE.writesDay, 'rows', 'Miễn phí 100.000 dòng/ngày; reset 0h UTC.'),
      meter('Người dùng hoạt động 30 ngày (Firebase Auth)', mau, FREE.authMau, 'users', 'Miễn phí 50.000 MAU; vượt mức Google tính phí theo MAU.'),
      meter('Lượt chấm AI hôm nay', ai, aiCap, 'calls', 'Trần do mình đặt để không vượt 10.000 neurons/ngày miễn phí của Workers AI.'),
    ] };
  },
  async services(db) { return { rows: await all(db, 'SELECT * FROM services ORDER BY ord, id') }; },
  async serviceSet(db, b) {
    const f = ['name', 'purpose', 'account', 'console', 'billing', 'free', 'secret', 'status', 'note'], v = f.map(k => String(b.row && b.row[k] || '').slice(0, 1000));
    if (!v[0]) throw new Error('name');
    if (b.row.id) await db.prepare(`UPDATE services SET ${f.map(k => k + ' = ?').join(', ')} WHERE id = ?`).bind(...v, +b.row.id).run();
    else await db.prepare(`INSERT INTO services (${f.join(', ')}, ord) VALUES (${f.map(() => '?').join(', ')}, ?)`).bind(...v, +b.row.ord || 99).run();
    return { ok: true };
  },
  async serviceDelete(db, b) { await db.prepare('DELETE FROM services WHERE id = ?').bind(+b.id).run(); return { ok: true }; },
  async overview(db) {
    const now = Date.now(), d1 = dayStr(now), d7 = dayStr(now - 6 * DAY);
    const [u, s, c, e] = await Promise.all([
      one(db, 'SELECT COUNT(*) AS total, SUM(created > ?1) AS new7, SUM(seen > ?2) AS act1, SUM(seen > ?1) AS act7, SUM(seen > ?3) AS act30 FROM users', now - 7 * DAY, now - DAY, now - 30 * DAY),
      one(db, 'SELECT SUM(day = ?1) AS today, COUNT(*) AS s7, COUNT(DISTINCT vid) AS v7, AVG(dur) AS dur7, AVG(pages) AS pages7 FROM sessions WHERE day >= ?2', d1, d7),
      one(db, 'SELECT COUNT(*) AS open FROM contact_msgs WHERE COALESCE(handled, 0) = 0'),
      one(db, 'SELECT COUNT(*) AS kinds, COALESCE(SUM(n), 0) AS hits FROM errors WHERE last > ?', now - DAY),
    ]);
    return { users: u, sessions: s, inbox: c, errors24: e };
  },
  async users(db, b) {
    const q = '%' + String(b.q || '').trim().toLowerCase() + '%', off = Math.max(0, +b.offset || 0);
    const rows = await all(db, 'SELECT uid, email, name, created, seen, plat, n FROM users WHERE lower(email) LIKE ?1 OR lower(name) LIKE ?1 OR uid = ?2 ORDER BY seen DESC LIMIT 50 OFFSET ?3', q, String(b.q || ''), off);
    return { rows, total: (await one(db, 'SELECT COUNT(*) AS n FROM users')).n };
  },
  async user(db, b) {
    const u = await one(db, 'SELECT * FROM users WHERE uid = ?', String(b.uid));
    const docs = await all(db, 'SELECT k, LENGTH(body) AS bytes, updated FROM docs WHERE uid = ? ORDER BY k', String(b.uid));
    return { user: u, docs };
  },
  async userDelete(db, b) { // xóa dữ liệu đồng bộ theo yêu cầu của người dùng (GDPR) – tài khoản Google không bị ảnh hưởng
    const uid = String(b.uid || ''); if (!uid || b.confirm !== uid) throw new Error('confirm');
    await db.batch([db.prepare('DELETE FROM docs WHERE uid = ?').bind(uid), db.prepare('DELETE FROM users WHERE uid = ?').bind(uid)]);
    return { ok: true };
  },
  async inbox(db, b) {
    const f = b.filter === 'all' ? '' : 'WHERE COALESCE(handled, 0) = 0';
    return { rows: await all(db, `SELECT id, at, name, email, msg, lang, sent, COALESCE(handled, 0) AS handled FROM contact_msgs ${f} ORDER BY id DESC LIMIT 200`) };
  },
  async inboxMark(db, b) { await db.prepare('UPDATE contact_msgs SET handled = ? WHERE id = ?').bind(b.handled ? 1 : 0, +b.id).run(); return { ok: true }; },
  async analytics(db, b) {
    const days = Math.min(Math.max(+b.days || 30, 1), 365), from = dayStr(Date.now() - (days - 1) * DAY);
    const top = (col, n = 12) => all(db, `SELECT ${col} AS k, COUNT(*) AS n, COUNT(DISTINCT vid) AS v, AVG(dur) AS dur FROM sessions WHERE day >= ? GROUP BY ${col} ORDER BY n DESC LIMIT ${n}`, from);
    const [daily, refs, countries, devs, langs, plats, paths, sum, freq] = await Promise.all([
      all(db, 'SELECT day, COUNT(*) AS s, COUNT(DISTINCT vid) AS v, AVG(dur) AS dur, AVG(pages) AS pages, SUM(ret) AS ret FROM sessions WHERE day >= ? GROUP BY day ORDER BY day', from),
      top("COALESCE(NULLIF(ref, ''), '(trực tiếp)')"), top('country', 20), top('dev'), top('lang', 15), top('plat'), top('path', 15),
      one(db, 'SELECT COUNT(*) AS s, COUNT(DISTINCT vid) AS v, AVG(dur) AS dur, AVG(pages) AS pages, SUM(ret) AS ret, SUM(pages <= 1 AND dur < 15) AS bounce, AVG(lcp) AS lcp, SUM(lcp > 0 AND lcp <= 2500) AS lcpGood, SUM(lcp > 0) AS lcpN FROM sessions WHERE day >= ?', from),
      all(db, "SELECT CASE WHEN c = 1 THEN '1' WHEN c <= 3 THEN '2–3' WHEN c <= 7 THEN '4–7' WHEN c <= 15 THEN '8–15' ELSE '16+' END AS k, COUNT(*) AS n FROM (SELECT vid, COUNT(*) AS c FROM sessions WHERE day >= ? GROUP BY vid) GROUP BY k", from),
    ]);
    const rate = +((await one(db, "SELECT v FROM config WHERE k = 'hit_rate'").catch(() => null)) || {}).v || 1;
    return { days, daily, refs, countries, devs, langs, plats, paths, sum, freq, rate };
  },
  async errors(db) { return { rows: await all(db, 'SELECT * FROM errors ORDER BY last DESC LIMIT 200') }; },
  async errorsClear(db, b) { if (b.h) await db.prepare('DELETE FROM errors WHERE h = ?').bind(String(b.h)).run(); else await db.prepare('DELETE FROM errors').run(); return { ok: true }; },
  async config(db) { const rows = (await all(db, 'SELECT k, v, at, by FROM config')).filter(r => CONFIG_KEYS.includes(r.k)); return { keys: CONFIG_KEYS, values: Object.fromEntries(rows.map(r => [r.k, r])) }; },
  async configSet(db, b, who) {
    const batch = [];
    for (const [k, v] of Object.entries(b.values || {})) if (CONFIG_KEYS.includes(k)) batch.push(db.prepare('INSERT INTO config (k, v, at, by) VALUES (?1, ?2, ?3, ?4) ON CONFLICT (k) DO UPDATE SET v = ?2, at = ?3, by = ?4').bind(k, String(v).slice(0, 2000), Date.now(), who.email));
    if (batch.length) await db.batch(batch);
    return { ok: true, n: batch.length };
  },
  // Chất lượng: kết quả workflow "Rà soát hằng ngày" (health.yml) – điểm = số hạng mục đạt / tổng; dưới 100% = dưới chuẩn
  async quality() {
    const c = caches.default, key = new Request('https://cache.lexkite.internal/quality'), hit = await c.match(key); if (hit) return hit.json();
    const gh = u => fetch(`https://api.github.com/repos/${REPO}/${u}`, { headers: { 'User-Agent': 'lexkite-admin', Accept: 'application/vnd.github+json' } }).then(r => r.json());
    const runs = ((await gh('actions/workflows/health.yml/runs?per_page=14')).workflow_runs || []).filter(r => r.status === 'completed');
    const CHECK = /^(Kiểm thử|Lẫn tiếng|Kiểm tra kiểu|Cú pháp|Bản live)/;
    const steps = async r => (((await gh(`actions/runs/${r.id}/jobs`)).jobs || [])[0] || { steps: [] }).steps.filter(x => CHECK.test(x.name)).map(x => ({ name: x.name, ok: x.conclusion === 'success' }));
    const latest = runs[0] ? await steps(runs[0]) : [];
    const score = latest.length ? Math.round(latest.filter(x => x.ok).length / latest.length * 100) : null;
    const out = { score, standard: 100, at: runs[0] ? Date.parse(runs[0].updated_at) : 0, url: runs[0] ? runs[0].html_url : '', checks: latest, history: runs.map(r => ({ at: Date.parse(r.updated_at), ok: r.conclusion === 'success', url: r.html_url })) };
    await c.put(key, new Response(JSON.stringify(out), { headers: { 'Cache-Control': 'max-age=600' } }));
    return out;
  },
  // Kiểm nghĩa bản dịch: câu bị dịch ngược nghi sai (web/i18n/backcheck.json) → AI Cloudflare (gói miễn phí) xác nhận theo lô 15 câu
  async judge(db, b, who, env) {
    const lang = String(b.lang || ''), rep = await (await fetch('https://lexkite.com/i18n/backcheck.json?x=' + Date.now())).json(), L = (rep.langs || {})[lang];
    if (!L || !env.AI) return { error: !env.AI ? 'no-ai' : 'no-lang' };
    const done = new Set((await all(db, 'SELECT h FROM i18n_judge WHERE lang = ?', lang)).map(r => r.h)), todo = L.flagged.filter(f => !done.has(f.h)).slice(0, 45);
    for (let i = 0; i < todo.length; i += 15) {
      const part = todo.slice(i, i + 15), list = part.map((f, j) => `${j + 1}. EN: ${f.en.replace(/<[^>]+>/g, '')}\n   ${lang.toUpperCase()}: ${f.tr.replace(/<[^>]+>/g, '')}`).join('\n');
      let out = {};
      try { const r = await env.AI.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast', { messages: [{ role: 'system', content: 'You are a professional UI localization reviewer. For each numbered pair decide if the translation conveys the same meaning as the English UI text (minor wording/style differences are OK). Reply ONLY JSON: {"wrong":[{"i":number,"why":"short reason in Vietnamese"}]} listing only clearly wrong ones.' }, { role: 'user', content: list }], max_tokens: 600 }); out = JSON.parse(String(r.response || r).match(/\{[\s\S]*\}/)[0]); } catch (e) { continue; }
      const wrong = new Map((out.wrong || []).map(w => [+w.i, String(w.why || '').slice(0, 200)]));
      await db.batch(part.map((f, j) => db.prepare('INSERT OR REPLACE INTO i18n_judge (h, lang, ok, note, at) VALUES (?, ?, ?, ?, ?)').bind(f.h, lang, wrong.has(j + 1) ? 0 : 1, wrong.get(j + 1) || '', Date.now())));
    }
    const rows = await all(db, 'SELECT h, ok, note FROM i18n_judge WHERE lang = ?', lang), by = Object.fromEntries(rows.map(r => [r.h, r]));
    return { lang, judged: rows.length, pending: L.flagged.filter(f => !by[f.h]).length, wrong: L.flagged.filter(f => by[f.h] && !by[f.h].ok).map(f => ({ ...f, why: by[f.h].note })) };
  },
  // ---- Gemini API: khóa dán trong Quản trị (D1 config 'gemini_key', không bao giờ trả về nguyên khóa) ----
  async ping() { return { ok: true }; },
  async auditLog(db) { return { rows: await all(db, 'SELECT at, email, op, ok, ip, country FROM admin_log ORDER BY id DESC LIMIT 100') }; },
  // ---- Nhiều khóa Gemini xoay vòng (D1 config 'gemini_keys' = [{k, at, by}]) – không bao giờ trả nguyên khóa ----
  async geminiStatus(db, b, who, env) {
    const list = await gkList(db), keys = [];
    for (const x of list) keys.push({ last4: x.k.slice(-4), at: x.at, by: x.by, cooling: await isCooling(x.k) });
    return { set: keys.length > 0, last4: keys[0] ? keys[0].last4 : '', keys, env: !!(env && env.GEMINI_KEY) };
  },
  async geminiSet(db, b, who) {
    const key = String(b.key || '').trim();
    if (!/^(AIza[\w-]{20,}|AQ\.[\w.-]{20,})$/.test(key)) return { ok: false, error: 'Khóa không đúng định dạng (AIza… hoặc AQ.…)' };
    const list = await gkList(db); if (list.some(x => x.k === key)) return { ok: false, error: 'Khóa này đã có trong danh sách' };
    if (list.length >= 20) return { ok: false, error: 'Tối đa 20 khóa' };
    const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash', { headers: { 'x-goog-api-key': key } });
    if (!r.ok) return { ok: false, error: `Google từ chối khóa (HTTP ${r.status})` };
    list.push({ k: key, at: Date.now(), by: who.email }); await gkSave(db, list);
    return { ok: true, last4: key.slice(-4), count: list.length };
  },
  async geminiRemove(db, b) { const list = (await gkList(db)).filter(x => x.k.slice(-4) !== String(b.last4 || '')); await gkSave(db, list); return { ok: true, count: list.length }; },
  // Duyệt 1 chạm: bản sửa được duyệt lưu D1 → workflow dịch đêm (i18n.yml) tự gộp vào scripts/i18n-fixed.json và áp vào app
  async i18nFixApprove(db, b, who) {
    const lang = String(b.lang || ''), key = String(b.key || ''), val = String(b.val || '').trim();
    if (!/^[a-z]{2}$/.test(lang) || !key || !val) return { ok: false };
    await db.prepare('INSERT OR REPLACE INTO i18n_fix (lang, key, val, at, by) VALUES (?, ?, ?, ?, ?)').bind(lang, key, val, Date.now(), who.email).run();
    return { ok: true };
  },
  async geminiDelete(db) { await db.prepare("DELETE FROM config WHERE k IN ('gemini_key', 'gemini_keys')").run(); resetGeminiCache(); return { ok: true }; },
  // Gemini duyệt chéo bản dịch giao diện: mọi câu nghi sai (dịch ngược) của 1 ngôn ngữ, lô 40 câu, lưu D1 i18n_judge với khóa 'g:'+h
  // Duyệt bản dịch bằng AI – 1 nút: Gemini (xoay vòng nhiều khóa) → hết khóa/hết lượt thì tự chuyển Cloudflare Workers AI
  async review(db, b, who, env) {
    const lang = String(b.lang || ''), rep = await (await fetch('https://lexkite.com/i18n/backcheck.json?x=' + Date.now())).json(), L = (rep.langs || {})[lang];
    if (!L) return { error: 'no-lang' };
    const done = Object.fromEntries((await all(db, 'SELECT h, ok, note FROM i18n_judge WHERE lang = ?', lang)).map(r => [r.h, r]));
    const todo = L.flagged.filter(f => !done[f.h]).slice(0, 60), used = new Set();
    const SYS = 'You are a professional UI localization reviewer for an English-learning app. For each numbered pair decide if the translation conveys the same meaning as the English UI text (minor wording/style differences are fine). Reply ONLY JSON {"wrong":[{"i":number,"why":"short reason in Vietnamese","fix":"corrected translation keeping {placeholders} and HTML tags"}]} listing only clearly wrong ones.';
    for (let i = 0; i < todo.length; i += 20) {
      const part = todo.slice(i, i + 20), list = part.map((f, j) => `${j + 1}. EN: ${f.en.replace(/<[^>]+>/g, '')}\n   ${lang}: ${f.tr}`).join('\n');
      let out = null;
      const g = await geminiCall(env, { systemInstruction: { parts: [{ text: SYS }] }, contents: [{ role: 'user', parts: [{ text: list }] }], generationConfig: { responseMimeType: 'application/json', temperature: 0.1 } });
      if (g) { try { out = JSON.parse(g.text); used.add('Gemini …' + g.key); } catch (e) { out = null; } }
      if (!out && env.AI) { try { const r = await env.AI.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast', { messages: [{ role: 'system', content: SYS }, { role: 'user', content: list }], max_tokens: 900 }); out = JSON.parse(String(r.response || r).match(/\{[\s\S]*\}/)[0]); used.add('Cloudflare Llama 3.3'); } catch (e) { out = null; } }
      if (!out) continue;
      const wrong = new Map((out.wrong || []).map(w => [+w.i, w]));
      await db.batch(part.map((f, j) => db.prepare('INSERT OR REPLACE INTO i18n_judge (h, lang, ok, note, at) VALUES (?, ?, ?, ?, ?)').bind(f.h, lang, wrong.has(j + 1) ? 0 : 1, wrong.has(j + 1) ? JSON.stringify({ why: String(wrong.get(j + 1).why || '').slice(0, 200), fix: String(wrong.get(j + 1).fix || '').slice(0, 400) }) : '', Date.now())));
      part.forEach((f, j) => { done[f.h] = { ok: wrong.has(j + 1) ? 0 : 1, note: wrong.has(j + 1) ? JSON.stringify({ why: wrong.get(j + 1).why, fix: wrong.get(j + 1).fix }) : '' }; });
    }
    const parse = n => { try { return JSON.parse(n); } catch (e) { return { why: n, fix: '' }; } };
    const wrongs = L.flagged.filter(f => done[f.h] && !done[f.h].ok).map(f => ({ ...f, ...parse(done[f.h].note) }));
    return { lang, reviewed: L.flagged.filter(f => done[f.h]).length, total: L.flagged.length, pending: L.flagged.filter(f => !done[f.h]).length, models: [...used], wrong: wrongs };
  },
  async alerts(db) {
    const now = Date.now(), out = [];
    try {
      const r = await fetch(`https://api.github.com/repos/${REPO}/actions/runs?per_page=40`, { headers: { 'User-Agent': 'lexkite-admin', Accept: 'application/vnd.github+json' } });
      const runs = (await r.json()).workflow_runs || [], seen = new Set();
      for (const w of runs) { if (seen.has(w.name)) continue; seen.add(w.name); out.push({ kind: 'workflow', name: w.name, status: w.status, ok: w.conclusion === 'success' || w.conclusion === 'skipped' || w.status !== 'completed', conclusion: w.conclusion, at: Date.parse(w.updated_at), url: w.html_url }); }
    } catch (e) { out.push({ kind: 'workflow', name: 'GitHub API', ok: false, conclusion: 'không đọc được' }); }
    const e = await one(db, 'SELECT COUNT(*) AS kinds, COALESCE(SUM(n), 0) AS hits FROM errors WHERE last > ?', now - DAY);
    const lim = +((await one(db, "SELECT v FROM config WHERE k = 'alert_errors'")).v || 50);
    out.push({ kind: 'errors', name: 'Lỗi JavaScript 24h', ok: e.hits < lim, conclusion: `${e.hits} lượt / ${e.kinds} loại (ngưỡng ${lim})` });
    const c = await one(db, 'SELECT COUNT(*) AS n, MIN(at) AS oldest FROM contact_msgs WHERE COALESCE(handled, 0) = 0');
    out.push({ kind: 'inbox', name: 'Tin nhắn chưa xử lý', ok: !c.n || now - c.oldest < 2 * DAY, conclusion: c.n ? `${c.n} tin, cũ nhất ${Math.round((now - c.oldest) / 36e5)} giờ` : 'không có' });
    const f = await one(db, 'SELECT COUNT(*) AS n FROM contact_msgs WHERE sent = 0 AND at > ?', now - 7 * DAY);
    out.push({ kind: 'mail', name: 'Thư chuyển tiếp lỗi (7 ngày)', ok: !f.n, conclusion: f.n ? `${f.n} tin chưa chuyển được vào Gmail – xem Hộp thư` : 'ổn' });
    const u = await OPS.usage(db);
    for (const m of u.meters) out.push({ kind: 'capacity', name: m.name, ok: m.pct < 70, warn: m.pct >= 70 && m.pct < 90, conclusion: `${m.pct}% hạn mức miễn phí` });
    return { rows: out };
  },
};

export const onRequestOptions = ({ request }) => new Response(null, { status: 204, headers: cors(request) });

// Thao tác ghi/xóa (ghi nhật ký) · thao tác nguy hiểm (phải vừa đăng nhập ≤ 15 phút – chống token bị đánh cắp dùng lại)
const WRITE = /Set$|Delete$|Remove$|Clear$|Mark$|Approve$|^inboxReply$|^judge$|^review$/;
const DANGER = new Set(['userDelete', 'serviceDelete', 'errorsClear', 'geminiDelete', 'geminiRemove']);
const ipOf = req => req.headers.get('CF-Connecting-IP') || '?';
async function audit(env, req, email, op, ok) {
  try { const h = [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode('lexkite-adm|' + ipOf(req))))].slice(0, 6).map(x => x.toString(16).padStart(2, '0')).join('');
    await env.DB.prepare('INSERT INTO admin_log (at, email, op, ok, ip, country) VALUES (?, ?, ?, ?, ?, ?)').bind(Date.now(), String(email || '').slice(0, 120), String(op || '').slice(0, 40), ok ? 1 : 0, h, (req.cf && req.cf.country) || '').run(); } catch (e) { /* nhật ký không được làm hỏng thao tác */ }
}

export async function onRequestPost({ request, env }) {
  // 1) Chỉ nhận từ trang của mình (có Origin lạ → từ chối)  2) Giới hạn tốc độ theo IP: 120 lệnh/phút, lần bị từ chối 10/10 phút
  const origin = request.headers.get('Origin'); if (origin && !ORIGINS.test(origin)) return json(request, 403, { error: 'origin' });
  const ip = ipOf(request);
  if (await limit('adm:' + ip, 120, 60)) return json(request, 429, { error: 'too-fast' });
  const who = await claims((request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '')).catch(() => null);
  const admins = String(env.ADMIN_EMAILS || '').toLowerCase().split(/[,\s]+/).filter(Boolean);
  if (!who || !who.email_verified || !admins.includes(String(who.email).toLowerCase())) {
    if (await limit('admx:' + ip, 10, 600)) return json(request, 429, { error: 'too-many-denied' });
    if (who && who.email) { try { await setup(env.DB); } catch (e) { /* bỏ qua */ } await audit(env, request, who.email, 'denied', false); } // tài khoản Google thật nhưng không phải admin → ghi lại
    return json(request, 403, { error: 'forbidden' });
  }
  let b; try { b = await request.json(); } catch (e) { return json(request, 400, { error: 'json' }); }
  const fn = OPS[b.op]; if (!fn) return json(request, 400, { error: 'op' });
  if (DANGER.has(b.op) && Date.now() / 1000 - (+who.auth_time || 0) > 900) return json(request, 401, { error: 'reauth', message: 'Thao tác quan trọng: hãy đăng xuất rồi đăng nhập lại (bảo mật) rồi thử lại.' });
  try { await setup(env.DB); const out = await fn(env.DB, b, who, env); if (WRITE.test(b.op)) await audit(env, request, who.email, b.op, true); return json(request, 200, out); }
  catch (e) { return json(request, 500, { error: String(e && e.message || e).slice(0, 200) }); }
}
