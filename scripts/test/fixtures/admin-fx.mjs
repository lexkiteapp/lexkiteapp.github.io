// Dữ liệu mẫu quản trị (không số thật) – dùng chung: admin-ui.mjs (jsdom) + admin-guard.mjs (Chromium, gác bố cục mọi trang).
const NOW = Date.now(), DAY = 864e5, vday = t => new Date(t + 7 * 3600e3).toISOString().slice(0, 10);
const CONFIG_KEYS = ['banner', 'banner_url', 'banner_level', 'ai_user', 'ai_anon', 'ai_global', 'alert_errors', 'note', 'hit_rate'];
const FX = {
  whoami: { admin: true },
  overview: { users: { total: 120, new7: 8, act1: 14, act7: 40, act30: 70 }, sessions: { today: 30, s7: 200, v7: 90, dur7: 180, pages7: 3.2 }, inbox: { open: 2 }, errors24: { kinds: 1, hits: 3 }, humans: { d1: 25, p1: 20, d7: 90, p7: 80, d30: 300, p30: 310 }, online: 4, excluded: 12, series: Array.from({ length: 14 }, (_, i) => ({ day: vday(NOW - (13 - i) * DAY), v: i * 2 })) },
  alerts: { rows: [{ name: 'Translate', ok: true, conclusion: 'success', at: NOW }, { name: 'Android build', ok: false, conclusion: 'failure', at: NOW - 3600e3, url: 'https://github.com/x' }] },
  quality: { score: 100, standard: 100, at: NOW, url: 'https://github.com/run', checks: [{ name: 'Unit tests', ok: true }, { name: 'Live site', ok: true }], history: [{ at: NOW, ok: true, url: 'https://github.com/r1' }, { at: NOW - DAY, ok: false, url: 'https://github.com/r2' }] },
  geminiStatus: { set: true, keys: [{ last4: 'abcd', at: NOW - DAY, by: 'admin@example.com' }] },
  usage: { meters: [{ name: 'D1 storage', pct: 12, used: 60 * 1048576, cap: 500 * 1048576, unit: 'bytes' }] },
  config: { keys: CONFIG_KEYS, values: { banner: { k: 'banner', v: 'Maintenance tonight', at: NOW - 3600e3, by: 'admin@example.com' }, ai_user: { k: 'ai_user', v: '8', at: NOW - DAY, by: 'admin@example.com' }, hit_rate: { k: 'hit_rate', v: '', at: NOW - DAY, by: 'admin@example.com' } } },
  configSet: { ok: true, n: 3 },
  analytics: { days: 30, sum: { s: 10, v: 5, dur: 60, pages: 2, ret: 3, bounce: 1, lcp: 1800, lcpGood: 8, lcpN: 9 }, daily: [{ day: vday(NOW), s: 10 }], refs: [{ k: 'google.com', n: 4, dur: 30 }], countries: [{ k: 'US', n: 3 }], devs: [{ k: 'mobile', n: 6 }], langs: [{ k: 'en', n: 6 }], plats: [{ k: 'web', n: 6 }], paths: [{ k: 'home', n: 6 }], freq: [{ k: '1', n: 4 }], rate: 1, hours: [{ k: 9, n: 3 }], wdays: [{ k: 1, n: 3 }], durs: [{ k: '1–3 phút', n: 3 }], nr: [{ day: vday(NOW), fresh: 3, back: 2 }], signups: [{ day: vday(NOW), n: 2 }], excluded: { s: 2 } },
  live: { at: NOW, rate: 1, online: 3, viewing: [{ k: 'home', n: 2 }], today: { s: 5, views: 12, visitors: 4, dur: 80, perVisitor: 3 }, countries: [{ k: 'US', n: 2 }, { k: 'XX', n: 1 }], pagesToday: [{ k: 'home', n: 5 }], refs: [], platsToday: [{ k: 'web', n: 3 }], excluded: { s: 3, kinds: [{ k: 'bot', s: 2 }, { k: 'admin', s: 1 }] }, total: { views: 100, visitors: 40 }, plats30: [{ k: 'web', n: 20 }], pages7: [{ k: 'home', n: 30 }], series: Array.from({ length: 14 }, (_, i) => ({ day: vday(NOW - (13 - i) * DAY), views: i, visitors: i >> 1 })) },
  users: { rows: [{ uid: 'u1', email: 'learner@example.com', name: 'Ann', created: NOW - 9 * DAY, seen: NOW - 3600e3, plat: 'web', n: 5, isAdmin: false }], filtered: 1, total: 1, kpi: { act1: 1, act7: 1, act30: 1, new7: 1 }, plats: [{ k: 'web', n: 1 }] },
  user: { user: { uid: 'u1', email: 'learner@example.com', name: 'Ann', created: NOW - 9 * DAY, seen: NOW - 3600e3, plat: 'web', n: 5 }, docs: [{ k: 'meta', bytes: 300, updated: NOW }], learn: { xp: 10, streak: 2, studyDays: 3, reviews: 40, newWords: 5, quizzes: 1, readings: 1, spoken: 0, badges: 1, lastStudy: vday(NOW) } },
  userDelete: { ok: true },
  inbox: { rows: [{ id: 7, at: NOW - 600e3, name: 'Bob', email: 'bob@example.com', msg: 'Hello there', lang: 'en', sent: 1, handled: 0 }] },
  inboxMark: { ok: true },
  errors: { rows: [{ h: 'h1', msg: 'TypeError: x is undefined', src: 'app.js:1', path: 'home', n: 3, last: NOW }, { h: 'h2', msg: 'ReferenceError: y', src: 'ui.js:9', path: 'vocab', n: 9, last: NOW - DAY }] },
  auditLog: { rows: [{ at: NOW, email: 'admin@example.com', op: 'configSet', ip: 'abc123', country: 'VN', ok: 1 }, { at: NOW - 60e3, email: 'stranger@example.com', op: 'overview', ip: 'ff00', country: 'US', ok: 0 }] },
  services: { rows: [{ id: 1, name: 'Cloudflare Pages', purpose: 'Hosting', account: 'ops@example.com', status: 'active', console: 'https://dash.cloudflare.com', free: '500 builds', secret: '', note: '' }] },
};
// Backlink, PR & Thương hiệu (/api/backlinks) – có dữ liệu độc để thử chống XSS
const EVIL = '<img src=x onerror="window.__pwn=1">';
const BFX = {
  list: { configured: { ci: true, dispatch: true, mail: true }, run: { at: NOW - 3600e3, url: 'https://github.com/lexkiteapp/lexkiteapp.github.io/actions/runs/1' },
    placements: [
      { id: 'medium', platform: 'Medium', type: 'article', url: 'https://medium.com/@lexkite/post', account: 'lexkite', status: 'live', expectLink: 'lexkite.com', expectedRel: 'nofollow', notes: '', submittedAt: '2026-10-17', history: [{ at: NOW - DAY, level: 'ok', state: 'ok' }, { at: NOW, level: 'regression', state: 'removed', http: 404 }], last: { at: NOW, http: 404, final: 'https://medium.com/@lexkite/post', link: null, rel: null, noindex: null, title: EVIL, state: 'removed', level: 'regression', reasons: ['removed'], change: NOW } },
      { id: 'evil', platform: EVIL, type: 'listing', url: 'javascript:alert(1)', account: 'x', status: 'pending', expectLink: 'lexkite.com', expectedRel: 'unknown', notes: EVIL, history: [], last: { at: NOW, http: 200, link: true, rel: 'follow', noindex: false, title: '', state: 'ok', level: 'change', reasons: ['listed'] } },
      { id: 'devto', platform: 'dev.to', type: 'article', url: 'https://dev.to/u/p', account: 'u', status: 'live', expectLink: 'lexkite.com', expectedRel: 'unknown', notes: '', history: [{ at: NOW, level: 'ok', state: 'ok' }], last: { at: NOW, http: 200, link: true, rel: 'follow', noindex: false, state: 'ok', level: 'ok', reasons: [] } },
      { id: 'peer', platform: 'Peerlist', type: 'profile', url: 'https://peerlist.io/lexkite', account: 'lexkite', status: 'live', expectLink: 'lexkite.com', expectedRel: 'unknown', notes: '', history: [], last: { at: NOW, http: 403, state: 'blocked', level: 'manual', reasons: ['blocked'] } },
    ],
    domains: [{ domain: 'lexkite.net', status: 'ok', ns: true, a: true, aaaa: false, mx: true, mxHosts: ['mx.phish.example'], ips: ['203.0.113.9'], level: 'regression', reasons: ['resolves', 'mx-added'], since: NOW, at: NOW }, { domain: 'lexkite.org', status: 'nx', level: 'ok', reasons: [], at: NOW }],
    handles: [{ k: 'github:lexkiteapp', platform: 'github', handle: 'lexkiteapp', url: 'https://github.com/lexkiteapp', status: 'owned', notes: '', last: { state: 'ours', level: 'ok', reasons: [] } }, { k: 'x:lexkite', platform: 'x', handle: 'lexkite', url: 'https://x.com/lexkite', status: 'not-yet', notes: '', last: { state: 'unknown', level: 'manual', reasons: ['manual-only'] } }],
    copy: { at: NOW, configured: true, probes: [{ url: 'https://lexkite.com/en/blog/a/', sentence: 'A distinctive sentence', suspects: [{ url: 'https://copycat.example.net/a', title: EVIL }] }] } },
  checkNow: { ok: true }, placementSet: { ok: true }, handleSet: { ok: true }, domainAck: { ok: true }, export: { version: 1, placements: [{ id: 'devto' }] },
};
// Thư viện video (/api/admin-shorts) – manifest gói sẵn (chưa có token: không bìa/video) + 1 mục độc thử chống XSS
const VIT = (id, o = {}) => ({ id, lesson: id, scene: 'cafe', format: 'scene', template: 'choose', area: 'listening', cefr: 'A2', point: 'listen ' + id, title: 'Title ' + id, description: 'Desc ' + id, hashtags: ['#a', '#b'], duration: 21.5, qa: { status: 'pass', result: 'ALL PASS', ok: 30, fail: 0, lipsync_ms: 35, cps_max: 14.2 }, created: '2026-10-20T05:00:00Z', bytes: 8e6, video: `shorts/cafe/${id}/v.mp4`, cover: `shorts/cafe/${id}/v.jpg`, slot: { n: 1, date: '2099-01-01', time: '11:30', tz: 'Asia/Ho_Chi_Minh' }, ...o });
const VFX = { items: [VIT('a1'), VIT('n1', { scene: 'anchor', format: 'news', template: 'news', area: 'grammar', cefr: 'B1', created: '2026-10-21T05:00:00Z', slot: null }), VIT('x1', { title: EVIL, point: EVIL, qa: { status: 'fail' } })],
  source: 'bundle', media: false, updated: '2026-10-21T00:00:00Z', coverage: { target_per_area: 5, areas: { listening: { label: 'Listening' }, grammar: { label: 'Grammar' }, dictionary: { label: 'Dictionary' } } },
  calendar: { posts: [{ n: 1, date: '2099-01-01', time: '11:30', id: 'a1', scene: 'cafe', template: 'choose' }] }, credits: { total: 100, banks: { cafe: { total: 100, img_cr: 20, video_cr: 80 } } }, covers: {} };
export { NOW, DAY, vday, CONFIG_KEYS, FX, EVIL, BFX, VIT, VFX };
