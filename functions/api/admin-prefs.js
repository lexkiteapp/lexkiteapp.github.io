/* API Cài đặt nâng cao tài khoản quản trị (khối 🛡️ Tài khoản quản trị).
 * POST /api/admin-prefs (Authorization: Bearer <Firebase ID token>)
 * op: get · set · logs
 * Lưu trữ: D1 chính (bảng config), khóa adm_pref:<email>, blob JSON ≤ 4 KB.
 * Whitelist schema chặt chẽ, kiểm tra kiểu dữ liệu, bảo mật adminGate.
 */
import { adminGate, adminAudit, adminCors } from './admin.js';
import { limit } from './sync.js';

const ALLOWED_TABS = new Set([
  'overview', 'analytics', 'live', 'users', 'inbox', 'alerts',
  'reports', 'quality', 'services', 'growth', 'social', 'dist',
  'studio', 'video', 'backlinks', 'drive', 'keys', 'quota', 'notices', 'settings'
]);
const ALLOWED_LANGS = new Set(['vi', 'en']);
const ALLOWED_THEMES = new Set(['auto', 'light', 'dark']);
const ALLOWED_LOGOUT = new Set([0, 15, 30, 60, 120]);
const ALLOWED_ALERTS = new Set([
  'js_error', 'workflow_fail', 'inbox_new', 'quality_alert', 'i18n_missing', 'quota_warning'
]);
const ALLOWED_KEYS = new Set([
  'tab', 'lang', 'theme', 'autoLogoutMin', 'alertTypes', 'jsErrorThreshold', 'quotaThresholdPct'
]);

const DEFAULT_PREF = {
  tab: 'overview',
  lang: 'vi',
  theme: 'auto',
  autoLogoutMin: 0,
  alertTypes: ['js_error', 'workflow_fail', 'inbox_new', 'quality_alert', 'i18n_missing', 'quota_warning'],
  jsErrorThreshold: 10,
  quotaThresholdPct: 70
};

const json = (req, status, data) => new Response(JSON.stringify(data), {
  status,
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
    ...adminCors(req)
  }
});

function validatePref(p) {
  if (!p || typeof p !== 'object' || Array.isArray(p)) return { error: 'invalid-pref' };
  for (const k of Object.keys(p)) {
    if (!ALLOWED_KEYS.has(k)) return { error: 'unknown-key:' + k };
  }
  const clean = {};
  if ('tab' in p) {
    if (typeof p.tab !== 'string' || (!ALLOWED_TABS.has(p.tab) && p.tab !== '')) return { error: 'invalid-tab' };
    clean.tab = p.tab || 'overview';
  } else {
    clean.tab = DEFAULT_PREF.tab;
  }
  if ('lang' in p) {
    if (typeof p.lang !== 'string' || !ALLOWED_LANGS.has(p.lang)) return { error: 'invalid-lang' };
    clean.lang = p.lang;
  } else {
    clean.lang = DEFAULT_PREF.lang;
  }
  if ('theme' in p) {
    if (typeof p.theme !== 'string' || !ALLOWED_THEMES.has(p.theme)) return { error: 'invalid-theme' };
    clean.theme = p.theme;
  } else {
    clean.theme = DEFAULT_PREF.theme;
  }
  if ('autoLogoutMin' in p) {
    const m = Number(p.autoLogoutMin);
    if (!ALLOWED_LOGOUT.has(m)) return { error: 'invalid-autoLogoutMin' };
    clean.autoLogoutMin = m;
  } else {
    clean.autoLogoutMin = DEFAULT_PREF.autoLogoutMin;
  }
  if ('alertTypes' in p) {
    if (!Array.isArray(p.alertTypes)) return { error: 'invalid-alertTypes' };
    const set = new Set();
    for (const t of p.alertTypes) {
      if (typeof t !== 'string' || !ALLOWED_ALERTS.has(t)) return { error: 'invalid-alertType:' + t };
      set.add(t);
    }
    clean.alertTypes = [...set];
  } else {
    clean.alertTypes = [...DEFAULT_PREF.alertTypes];
  }
  if ('jsErrorThreshold' in p) {
    const j = Number(p.jsErrorThreshold);
    if (!Number.isInteger(j) || j < 1 || j > 1000) return { error: 'invalid-jsErrorThreshold' };
    clean.jsErrorThreshold = j;
  } else {
    clean.jsErrorThreshold = DEFAULT_PREF.jsErrorThreshold;
  }
  if ('quotaThresholdPct' in p) {
    const q = Number(p.quotaThresholdPct);
    if (!Number.isInteger(q) || q < 50 || q > 95) return { error: 'invalid-quotaThresholdPct' };
    clean.quotaThresholdPct = q;
  } else {
    clean.quotaThresholdPct = DEFAULT_PREF.quotaThresholdPct;
  }
  return { clean };
}

let dbReady = false;
async function ensureDb(db) {
  if (dbReady || !db) return;
  try {
    await db.prepare('CREATE TABLE IF NOT EXISTS config (k TEXT PRIMARY KEY, v TEXT, at INTEGER, by TEXT) WITHOUT ROWID').run();
    dbReady = true;
  } catch (e) {
    /* bỏ qua nếu đã tồn tại */
  }
}

export async function onRequestOptions({ request }) {
  return new Response(null, { headers: adminCors(request) });
}

export async function onRequestPost({ request, env }) {
  const g = await adminGate(request, env, 'adm');
  if (!g.who) return json(request, g.status, { error: g.error });
  const who = g.who;

  const ip = request.headers.get('CF-Connecting-IP') || '?';
  if (await limit('admpref:' + ip, 120, 60)) return json(request, 429, { error: 'too-fast' });

  const text = await request.text().catch(() => '');
  if (text.length > 65536) return json(request, 413, { error: 'too-large' });
  let b;
  try { b = JSON.parse(text || '{}'); } catch (e) { b = null; }
  if (!b || typeof b !== 'object' || Array.isArray(b)) return json(request, 400, { error: 'body' });

  if (!env.DB) return json(request, 412, { error: 'not-configured' });
  await ensureDb(env.DB);

  const emailKey = 'adm_pref:' + String(who.email || '').toLowerCase().trim();

  if (b.op === 'get') {
    let row = null;
    try {
      row = await env.DB.prepare('SELECT v FROM config WHERE k = ?').bind(emailKey).first();
    } catch (e) {
      row = null;
    }
    let parsed = null;
    if (row && row.v) {
      try { parsed = JSON.parse(row.v); } catch (e) { parsed = null; }
    }
    const val = validatePref(parsed || {});
    return json(request, 200, { ok: true, pref: val.clean || DEFAULT_PREF });
  }

  if (b.op === 'set') {
    const val = validatePref(b.pref);
    if (val.error) return json(request, 400, { error: val.error });
    const payload = JSON.stringify(val.clean);
    if (payload.length > 4096) return json(request, 413, { error: 'too-large' });
    try {
      await env.DB.prepare(
        'INSERT INTO config (k, v, at, by) VALUES (?, ?, ?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v, at = excluded.at, by = excluded.by'
      ).bind(emailKey, payload, Date.now(), who.email).run();
      await adminAudit(env, request, who.email, 'adminPrefSet', true);
      return json(request, 200, { ok: true, pref: val.clean });
    } catch (e) {
      await adminAudit(env, request, who.email, 'adminPrefSet', false);
      return json(request, 500, { error: String(e && e.message || e).slice(0, 150) });
    }
  }

  if (b.op === 'logs') {
    // admin_log nằm ở D1 CHÍNH (adminAudit ghi env.DB) – không đọc qua D1 nội bộ
    const db = env.DB;
    const mine = b.mine !== false;
    const limitNum = Math.min(Math.max(1, parseInt(b.limit, 10) || 100), 500);
    let rows = [];
    try {
      if (mine) {
        rows = (await db.prepare('SELECT at, email, op, ok, ip, country FROM (SELECT at, email, op, ok, ip, country FROM admin_log ORDER BY id DESC LIMIT 2000) WHERE lower(email) = ? LIMIT ?').bind(String(who.email).toLowerCase(), limitNum).all()).results || [];
      } else {
        rows = (await db.prepare('SELECT at, email, op, ok, ip, country FROM admin_log ORDER BY id DESC LIMIT ?').bind(limitNum).all()).results || [];
      }
    } catch (e) {
      rows = [];
    }
    return json(request, 200, { ok: true, rows });
  }

  return json(request, 400, { error: 'op' });
}
