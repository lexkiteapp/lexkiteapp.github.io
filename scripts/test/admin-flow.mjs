// Dải luồng Nội dung & Video (web/js/admin-flow.js + functions/api/admin-clips.js op 'flow'): số thật, null ≠ 0, trạng thái tải/lỗi/thử lại, đệm 60 s, bấm = sang mục.
// Run: node scripts/test/admin-flow.mjs (no network)
import fs from 'node:fs';
import { JSDOM } from 'jsdom';
let fails = 0, n = 0; const ok = (c, m) => { n++; if (!c) { fails++; console.log('✗', m); } };

// ---------- máy chủ: flowStats trên D1 giả ----------
const { flowStats, _resetFlow } = await import('../../functions/api/admin-clips.js');
const mkDb = (tables) => ({ prepare(sql) { const q = { bind() { return q; }, async all() {
  for (const [re, rows] of tables) if (re.test(sql)) { if (rows instanceof Error) throw rows; return { results: rows }; }
  return { results: [] };
}, async run() { return {}; } }; return q; } });
const full = [
  [/FROM video_jobs/, [{ k: 'script', n: 2 }, { k: 'rendering', n: 1 }, { k: 'rendered', n: 1 }, { k: 'qa_fail', n: 3 }, { k: 'published', n: 5 }]],
  [/FROM yt_pack WHERE file_id IS NOT NULL AND/, [{ n: 4 }]],
  [/FROM yt_channel c LEFT JOIN/, [{ channel_id: 'UCa', cfg: '{"role":"embed"}' }, { channel_id: 'UCb', cfg: '{"role":"social"}' }, { channel_id: 'UCc', cfg: '{"role":"embed","active":0}' }]],
  [/FROM dist_ext/, [{ k: 'ok', n: 3 }, { k: 'paused', n: 2 }, { k: 'gone', n: 1 }]],
  [/FROM dist_social/, [{ k: 'planned', n: 7 }, { k: 'published', n: 2 }, { k: 'failed', n: 1 }]],
  [/FROM soc_board/, [{ k: 'review', n: 2 }, { k: 'scheduled', n: 1 }]],
  [/FROM drives/, [{ n: 24, used: 77.2e9, total: 360e9 }]],
  [/FROM drive_alerts/, [{ level: 'warn', n: 1 }]],
  [/SELECT clip, status, video_id, channel_id FROM yt_queue/, [{ clip: 'x1', status: 'done', video_id: 'V1' }]],
];
_resetFlow();
const d = await flowStats({}, mkDb(full), 1e12);
ok(d.studio.total === 12 && d.studio.active === 3 && d.studio.qa === 1 && d.studio.qa_fail === 3, 'studio: video_jobs đếm theo trạng thái thật');
ok(d.dist.embed_channels === 1 && d.dist.yt_channels === 3, 'kênh nhúng = role embed + active (cùng luật youtube.js), bỏ kênh tắt');
ok(d.dist.embedded === 1 && d.dist.ready === 3, 'sẵn sàng cho bài = gói Drive chưa nhúng (4 − 1)');
ok(d.dist.social_channels === 5, 'kênh social = dist_ext trừ gone');
ok(d.publish.planned === 7 && d.publish.published === 2 && d.publish.failed === 1 && d.publish.review === 2 && d.publish.scheduled === 1, 'đăng: dist_social + soc_board');
ok(d.drive.drives === 24 && d.drive.warn === 1 && d.drive.crit === 0, 'Drive: tổng dung lượng + cảnh báo');
ok(typeof d.library.total === 'number' && 'pending' in d.library && 'archive' in d.library, 'thư viện: mọi mục + tổng (cả lưu trữ)');
const again = await flowStats({}, mkDb([]), 1e12 + 30e3); ok(again === d, 'đệm 60 s/isolate: không đọc lại D1');
_resetFlow();
const empty = await flowStats({}, mkDb([[/COUNT\(\*\)[^]*FROM (video_jobs|yt_pack|dist_ext|dist_social|soc_board|drives|drive_alerts)|FROM yt_channel c/, new Error('no such table')]]), 2e12);
ok(empty.studio === null && empty.dist.ready === null && empty.dist.embed_channels === null && empty.publish.planned === null && empty.drive === null, 'bảng chưa có → null (không bịa 0)');

// ---------- khách: model + paint ----------
const dom = new JSDOM('<!doctype html><body><nav id="f" hidden></nav></body>', { url: 'https://lexkite.com/admin.html#video', runScripts: 'outside-only' });
dom.window.eval(fs.readFileSync('web/js/admin-flow.js', 'utf8'));
const F = dom.window.AdminFlow, P = F.pure, el = dom.window.document.getElementById('f');
const m = P.model(d);
ok(m.studio.state === 'warn' && /3/.test(m.studio.warn), 'studio lỗi QC → cảnh báo');
ok(m.social.state === 'warn' && /1/.test(m.social.warn), 'đăng lỗi → cảnh báo trước "chờ duyệt"');
ok(m.drive.pct === 21 && m.drive.state === 'warn', 'Drive: % dùng + cảnh báo');
const me = P.model(empty);
ok(me.studio.state === 'none' && /—/.test(me.dist.line) && me.drive.state === 'warn', 'null hiện "—"/"Chưa có dữ liệu", không phải 0');
ok(P.model({ ...d, dist: { ...d.dist, embed_channels: 0 } }).dist.warn === 'Chưa có kênh nhúng', 'chưa có kênh nhúng → nhắc');
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

let calls = 0, mode = 'ok', went = null;
const capi = async op => { calls++; if (op !== 'flow') throw new Error('op'); if (mode === 'err') throw new Error('500'); return d; };
const opt = { capi, go: t => { went = t; }, L: s => s, esc, lang: () => 'en' };
await F.paint(el, 'video', opt);
ok(!el.hidden && el.querySelectorAll('.flow-step').length === 4 && el.querySelector('[aria-current="step"]').dataset.flow === 'video', '4 bước, bước hiện tại đánh dấu aria-current');
ok(/Video hub/.test(el.textContent) && /to review/.test(el.textContent) && /Drive storage/.test(el.textContent), 'tiếng Anh khi lang=en');
ok(el.querySelector('.flow-bar[role="meter"]').getAttribute('aria-valuenow') === '21', 'thanh Drive có role meter');
await F.paint(el, 'studio', opt); ok(calls === 1, 'chuyển mục trong 60 s: không gọi lại máy chủ');
el.querySelector('[data-flow="dist"]').dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true, cancelable: true })); ok(went === 'dist', 'bấm bước → sang mục');
await F.paint(el, 'overview', opt); ok(el.hidden && el.innerHTML === '', 'mục ngoài luồng → ẩn dải');
F._reset(); mode = 'err'; await F.paint(el, 'social', opt);
ok(el.querySelector('.flow-err') && el.querySelector('[data-flow-retry]'), 'lỗi → thông báo + Thử lại');
mode = 'ok'; el.querySelector('[data-flow-retry]').dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })); await new Promise(r => setTimeout(r, 10));
ok(el.querySelectorAll('.flow-step').length === 4, 'Thử lại → vẽ lại số liệu');
await F.paint(el, 'video', { ...opt, lang: () => 'vi' }); ok(/chờ duyệt/.test(el.textContent), 'tiếng Việt mặc định');
const evil = P.html(P.model({ ...d, library: { pending: '<img src=x onerror=1>' } }), 'video', s => s, esc); ok(!/<img/.test(evil), 'số liệu luôn được esc');
// không có chuỗi hiển thị nào thiếu bản EN
const src = fs.readFileSync('web/js/admin-flow.js', 'utf8'), used = [...src.matchAll(/T\('([^']+)'\)|tr\('([^']+)'\)/g)].map(x => x[1] || x[2]);
const missing = [...new Set(used)].filter(k => !(k in P.EN)); ok(!missing.length, 'mọi chuỗi có bản EN: ' + missing.join(' | '));
for (const s of P.STEPS) ok(s.t in P.EN && s.k in P.EN, 'nhãn bước có EN: ' + s.t);

console.log(fails ? `✗ admin-flow ${fails}/${n} FAIL` : `✓ admin-flow ${n} OK`); process.exit(fails ? 1 : 0);
