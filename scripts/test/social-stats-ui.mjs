// Quản trị › Phân tích (web/js/admin-social-mgr.js): số liệu YouTube vào bảng — top/bottom 5, theo kênh (tên), độ dài, giờ đăng, cột 7 ngày, video bị gỡ. DOM giả tối thiểu, không jsdom.
import fs from 'node:fs'; import vm from 'node:vm';
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('✗', m); } };
const stub = () => ({ onclick: null, onchange: null, textContent: '', className: '', value: '', appendChild() {}, querySelector: () => null });
const doc = { getElementById: () => ({}), createElement: stub, head: { appendChild() {} } };
const win = {}; vm.runInNewContext(fs.readFileSync(new URL('../../web/js/admin-social-mgr.js', import.meta.url), 'utf8'), { window: win, document: doc, console, Date, Math, Map, Set, JSON, Number, String, Array, Object, Promise, URL, Blob: class {}, setTimeout, clearTimeout, setInterval, clearInterval, confirm: () => true, navigator: {}, localStorage: {} });
const data = {
  rows: [{ platform: 'youtube', post_id: 'V1', account_id: 'UC1', views: 100, likes: 5, comments: 1, saves: 0, shares: 0, watch_s: 0 }, { platform: 'youtube', post_id: 'V2', account_id: 'UC1', views: 3, likes: 0, comments: 0, saves: 0, shares: 0, watch_s: 0 }, { platform: 'youtube', post_id: 'V3', account_id: 'UC2', views: 0, likes: 0, comments: 0, saves: 0, shares: 0, watch_s: 0 }],
  vmeta: [{ video_id: 'V1', secs: 25, publish_at: '2026-11-10T09:00:00Z', missing: 0 }, { video_id: 'V2', secs: 55, publish_at: null, missing: 0 }, { video_id: 'V3', secs: 70, missing: 0 }, { video_id: 'V9', missing: 1 }],
  growth: [{ video_id: 'V1', d7: 40, d30: 90 }], channels: [{ channel_id: 'UC1', title: 'Lexkite English' }], alerts: [{ k: 'yt-gone', text: 'Video không còn đọc được' }], weights: null };
const run = async by => {
  const el = { innerHTML: '', q: {}, querySelector(s) { return this.q[s] || (this.q[s] = stub()); } };
  const store = {}; const ctx = { lang: () => 'vi', L: s => s, esc: s => String(s).replace(/[&<>"]/g, c => '&#' + c.charCodeAt(0) + ';'), errText: e => String(e), accById: () => null, LS: { get: (k, d) => store[k] || d, set: (k, v) => { store[k] = v; } }, sapi: async () => data };
  store.sby = by; await win.AdminSocialMgr.paint('stats', el, ctx); await new Promise(r => setTimeout(r, 20)); return el.q['#sOut'].innerHTML;
};
let h = await run('account');
ok(/Lexkite English/.test(h) && !/UC1/.test(h), 'theo kênh hiện tên kênh, không hiện id');
ok(/Top 5/.test(h) && /V1 · <b>100/.test(h) && /Thấp nhất 5/.test(h), 'top/bottom 5');
ok(/Bị gỡ\/hạn chế[\s\S]*?>1</.test(h), 'đếm video bị gỡ');
ok(/role="alert"[\s\S]*Video không còn đọc được/.test(h), 'cảnh báo hiện trong Quản trị');
ok(/\+40/.test(h), 'cột 7 ngày');
h = await run('len'); ok(/20–40s/.test(h) && /40–60s/.test(h) && /&#62;60s/.test(h), 'theo độ dài (bucket)');
h = await run('hour'); ok(/\d\d:00/.test(h), 'theo giờ đăng');
if (fails) process.exit(1); console.log('social-stats-ui ok');
