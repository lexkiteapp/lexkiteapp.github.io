/* Service worker của app học. App ở /app/ (đăng ký: register('/sw.js', { scope: '/app/' })); / và /<lang>/ là trang giới thiệu tĩnh.
 * CÙNG FILE này còn chạy cho bản cài CŨ có phạm vi "/" (trước 10/2026 app nằm ở /): trình duyệt tự cập nhật sw.js cho đăng ký cũ
 * → LEGACY = true: xóa cache khung app cũ (giữ dữ liệu: lk-meta nhắc học, lk-audio, cache hiện hành dùng chung với /app/),
 * không bao giờ trả app cũ ở "/", chỉ khi MẤT MẠNG mở "/" hoặc "/index.html" (PWA cài cũ có start_url "/index.html#/home",
 * iOS không cập nhật start_url) thì chuyển hướng sang /app/ (đã có trong cache của /app/) → vẫn học offline được.
 * Dữ liệu học (IndexedDB, localStorage) thuộc nguồn lexkite.com, không phụ thuộc phạm vi SW → không mất. Test: scripts/test/landing-routing.mjs */
const CACHE = 'lexkite-20261031212019';
const APP = '/app/';
const LEGACY = new URL(self.registration.scope).pathname === '/';
// Chỉ phần lõi (các file trong app/index.html) – phần nặng tải khi cần từ CDN và được lưu lại lúc dùng
const SHELL = ['/app/', '/css/style.css', '/js/heal.js', '/js/native.js', '/js/ads.js', '/js/kit.js', '/js/characters.js', '/js/audio.js', '/js/i18n.js', '/js/data.js', '/js/lexis.js', '/js/core.js', '/js/dictionary.js', '/js/game.js', '/js/ui.js', '/js/app.js', '/js/study.js', '/js/reading.js', '/js/path.js', '/js/plan.js', '/js/hubs.js', '/js/phrases.js', '/js/ai.js', '/js/assist.js', '/js/firebase-config.js', '/js/sync.js', '/js/i18n/en.js', '/manifest.webmanifest', '/icons/icon.svg', '/icons/icon-192.png'];
const KEEP = k => k === CACHE || k === 'lk-meta' || k === AUDIO || k === VIMG || k === OFFLINE; // dữ liệu người dùng & cache dùng chung – không bao giờ xóa khi dọn

self.addEventListener('install', e => {
  if (LEGACY) { e.waitUntil(self.skipWaiting()); return; } // bản cũ: thay ngay, không cache gì
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(SHELL.map(u => c.add(new Request(u, { cache: 'reload' })).catch(() => {}))  /* cache:'reload' – bỏ qua bộ nhớ đệm HTTP, không bao giờ cất nhầm file cũ */)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => !KEEP(k)).map(k => caches.delete(k))))
    .then(() => LEGACY && self.registration.periodicSync ? self.registration.periodicSync.unregister('vb-daily').catch(() => {}) : null) // nhắc học chạy ở đăng ký /app/ – tránh nhắc 2 lần
    .then(() => self.clients.claim()));
});
// HTML/JS/CSS: lấy bản mới từ mạng (chờ tối đa 2,5 giây) → không bao giờ trộn file cũ với file mới; offline thì dùng cache.
// Ảnh/icon: lấy từ cache ngay.
// Âm thanh lưu riêng, tối đa 2000 file gần nhất (~40 MB) – nghe lại tức thì, offline được, không gọi lại Worker audio.lexkite.com
// (Worker = lượt tính hạn mức 100k/ngày – docs/CAPACITY.md §Kiến trúc A3; trước 600 file → người học nhiều bị đẩy ra rồi tải lại)
const AUDIO = 'lk-audio', AUDIO_MAX = 2000;
const trimAudio = c => c.keys().then(ks => { if (ks.length > AUDIO_MAX) return Promise.all(ks.slice(0, ks.length - AUDIO_MAX).map(k => c.delete(k))); });
// Ảnh minh họa từ vựng (media.lexkite.com/vimg/<băm>[@2x].avif|webp, ≤ 6 KB, immutable): lưu khi xem, LRU 800 ảnh (~5 MB) – offline được (docs/LEXICON.md § Ảnh minh họa)
// LRU: keys() theo thứ tự ghi → trúng cache thì xóa + ghi lại (thành mới nhất), vượt trần thì xóa cũ nhất.
const VIMG = 'lk-vimg', VIMG_MAX = 800, VIMG_RE = /^\/vimg\/[0-9a-f]{16}(@2x)?\.(avif|webp)$/;
const trimVimg = c => c.keys().then(ks => { if (ks.length > VIMG_MAX) return Promise.all(ks.slice(0, ks.length - VIMG_MAX).map(k => c.delete(k))); });
const vimgFetch = e => caches.open(VIMG).then(c => c.match(e.request).then(hit => {
  if (hit) { const keep = hit.clone(); e.waitUntil(c.delete(e.request).then(() => c.put(e.request, keep)).catch(() => {})); return hit; } // làm mới thứ tự LRU
  return fetch(e.request).then(r => { if (r.ok) { const x = r.clone(); e.waitUntil(c.put(e.request, x).then(() => trimVimg(c)).catch(() => {})); } return r; });
}));
const STATIC = /\.(png|svg|jpg|jpeg|webp|ico|woff2?|mp3)$/; // âm thanh đặt tên theo nội dung → không bao giờ đổi
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (LEGACY) { // phạm vi "/" (bản cài cũ): mọi thứ đi mạng như không có SW; riêng mở "/" khi mất mạng → app trong cache /app/
    if (e.request.mode === 'navigate' && url.origin === location.origin && (url.pathname === '/' || url.pathname === '/index.html'))
      e.respondWith(fetch(e.request).catch(() => caches.match(APP, { ignoreSearch: true }).then(r => r ? Response.redirect(new URL(APP, location.origin).href, 302) : Response.error())));
    return;
  }
  // App/add-on gọi file từ lexkite.com (khác nguồn): lấy mạng trước, lưu lại để dùng khi offline
  if (e.request.method === 'GET' && url.origin !== location.origin && (url.hostname === 'lexkite.pages.dev' || url.hostname === 'lexkite.com')) {
    e.respondWith(fetch(e.request).then(r => { if (r.ok || r.type === 'opaque') { const c = r.clone(); caches.open(CACHE).then(x => x.put(e.request, c)); } return r; }).catch(() => caches.match(e.request)));
    return;
  }
  // Âm thanh trên CDN riêng (tên file theo nội dung, không bao giờ đổi): có sẵn thì phát ngay, nghe được cả khi offline
  if (e.request.method === 'GET' && /^(audio\.lexkite\.com|lexkiteapp\.github\.io)$/.test(url.hostname) && /\.mp3$/.test(url.pathname)) {
    // Worker lỗi (mạng/5xx) → thử Pages kho media m2 rồi gốc cũ (dự phòng 1 bản phát hành, docs/STORAGE.md); lưu dưới URL gốc để lần sau trúng cache
    const alt = url.hostname === 'audio.lexkite.com' ? ['https://lexkiteapp.github.io/lexkite-media-2', 'https://lexkiteapp.github.io'].map(o => o + url.pathname) : [];
    const get = (i = -1) => fetch(i < 0 ? e.request : alt[i], i < 0 ? undefined : { mode: 'cors' }).then(r => (r.status >= 500 && i + 1 < alt.length ? get(i + 1) : r), err => (i + 1 < alt.length ? get(i + 1) : Promise.reject(err)));
    e.respondWith(caches.match(e.request).then(hit => hit || get().then(r => { if (r.ok) { const c = r.clone(); caches.open(AUDIO).then(x => x.put(e.request, c).then(() => trimAudio(x))); } return r; })));
    return;
  }
  if (e.request.method === 'GET' && url.hostname === 'media.lexkite.com' && VIMG_RE.test(url.pathname)) {
    e.respondWith(vimgFetch(e));
    return;
  }
  if (e.request.method !== 'GET' || url.origin !== location.origin) return; // API từ điển luôn đi mạng
  if (url.pathname.startsWith('/data/lex/')) return; // mảnh kho từ: immutable + IndexedDB (lex.js)
  if (STATIC.test(url.pathname)) {
    e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request).then(r => { const c = r.clone(); caches.open(CACHE).then(x => x.put(e.request, c)); return r; })));
    return;
  }
  e.respondWith(new Promise(resolve => {
    let done = false;
    // Trang chủ index.html chỉ là phương án dự phòng khi MỞ TRANG (navigate) – không bao giờ trả HTML thay cho file JS/CSS/JSON
    // (mạng chậm > 2,5 s mà file chưa có trong bộ đệm → trước đây trả index.html → lỗi "MIME text/html", mất tính năng)
    const nav = e.request.mode === 'navigate';
    const fallback = () => caches.match(e.request, { ignoreSearch: true }).then(r => r || (nav ? caches.match(APP) : null));
    const t = setTimeout(() => { fallback().then(r => { if (!done && r) { done = true; resolve(r); } }); }, 2500);
    let req = e.request; try { req = new Request(e.request, { cache: 'no-cache' }); } catch (x) { /* giữ nguyên */ }
    fetch(req).then(r => {
      if (r.ok) { const c = r.clone(); caches.open(CACHE).then(x => x.put(e.request, c)); }
      clearTimeout(t); if (!done) { done = true; resolve(r); }
    }).catch(() => { clearTimeout(t); fallback().then(r => { if (!done) { done = true; resolve(r || Response.error()); } }); });
  }));
});
// 📥 Gói nghe offline (người dùng bật trong Cài đặt – mặc định tắt; web/js/audio.js LKAudio.offline): cache riêng 'lk-offline', không bị trimAudio đẩy ra.
// Từ: /data/offline-pack.json (~3000 từ thông dụng, khóa audio/w theo giọng – scripts/audio/offline-pack.mjs) · bài đang học: tối đa OFF_LESSON file gần nhất.
// Trần OFF_MAX_MB; trạng thái ghi trong '/__offline' của chính cache này. Fetch audio ở trên dùng caches.match → trúng cache này khi offline.
const OFFLINE = 'lk-offline', OFF_MAX_MB = 40, OFF_LESSON = 600, OFF_META = '/__offline';
let offJob = 0;
const offMeta = async c => { const r = await c.match(OFF_META); return (r && (await r.json().catch(() => null))) || { voice: '', total: 0, done: 0, bytes: 0, fail: 0, lesson: [] }; };
const offSave = (c, m) => c.put(OFF_META, new Response(JSON.stringify(m), { headers: { 'Content-Type': 'application/json' } }));
const offGet = async (c, m, url) => { // → số byte đã thêm (0 = đã có / lỗi)
  if (await c.match(url)) return 0;
  try { const r = await fetch(url, { mode: 'cors' }); if (!r.ok) { m.fail++; return 0; } const b = await r.clone().blob(); await c.put(url, r); return b.size; } catch (e) { m.fail++; return 0; }
};
async function offStart(o) {
  const job = ++offJob, c = await caches.open(OFFLINE); let m = await offMeta(c);
  if (m.voice && m.voice !== o.voice) { await caches.delete(OFFLINE); return offStart(o); } // đổi giọng Anh ↔ Mỹ → tải lại đúng giọng
  const pack = await fetch('/data/offline-pack.json', { cache: 'no-cache' }).then(r => r.json()).catch(() => null);
  const keys = pack && pack.w && pack.w[o.voice]; if (!keys) return;
  const base = String(o.base || 'https://audio.lexkite.com/audio/l/').replace(/l\/$/, 'w/');
  Object.assign(m, { voice: o.voice, total: keys.length, done: 0, fail: 0, full: false, at: Date.now() });
  let i = 0;
  const worker = async () => {
    while (i < keys.length && job === offJob && !m.full) {
      const url = base + keys[i++] + '.mp3';
      const n = await offGet(c, m, url); m.bytes += n; m.done++; // đọc m.bytes SAU await – 4 luồng không cộng đè nhau
      if (m.bytes > OFF_MAX_MB * 1048576) m.full = true;
      if (m.done % 100 === 0) await offSave(c, m);
    }
  };
  await Promise.all([worker(), worker(), worker(), worker()]); // 4 luồng – nhẹ cho mạng di động
  if (job === offJob) { m.complete = m.done >= m.total; await offSave(c, m); }
}
async function offAdd(urls) {
  const c = await caches.open(OFFLINE), m = await offMeta(c); if (!m.voice) return; // gói đã tắt
  for (const u of urls) {
    if (typeof u !== 'string' || !/^https:\/\/(audio\.lexkite\.com|lexkiteapp\.github\.io)\/.*\.mp3$/.test(u) || m.bytes > OFF_MAX_MB * 1048576) continue;
    const n = await offGet(c, m, u); m.bytes += n; if (n) m.lesson.push([u, n]);
  }
  while (m.lesson.length > OFF_LESSON) { const [u, n] = m.lesson.shift(); await c.delete(u); m.bytes -= n; }
  await offSave(c, m);
}
self.addEventListener('message', e => {
  const d = e.data || {}, port = e.ports && e.ports[0], reply = x => { try { port && port.postMessage(x); } catch (er) { /* bỏ qua */ } };
  if (d.type !== 'lk-offline' || LEGACY) return;
  const status = () => caches.has(OFFLINE).then(h => (h ? caches.open(OFFLINE).then(offMeta) : null)).then(m => reply(Object.assign({ running: !!offJob && !!(m && !m.complete && !m.full), maxMb: OFF_MAX_MB }, m || { off: true })));
  if (d.op === 'start') { const p = offStart(d); e.waitUntil(p.catch(() => {})); return status(); }
  if (d.op === 'add') { e.waitUntil(offAdd(d.urls || []).catch(() => {}).then(status)); return; }
  if (d.op === 'clear') { offJob++; e.waitUntil(caches.delete(OFFLINE).then(() => reply({ off: true }))); return; }
  if (d.op === 'status') e.waitUntil(status());
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const d = e.notification.data || {};
  if (d.tpl) e.waitUntil(ev([['open', d.tpl, 1]])); // CTR theo mẫu (docs/REMINDERS.md)
  if (e.action === 'later') return;
  const target = d.url || '/app/#/review';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const c of list) if ('focus' in c) { c.navigate(target); return c.focus(); }
    return self.clients.openWindow(target);
  }));
});
// Số liệu nhắc học (functions/api/push.js op ev): chỉ mã mẫu + đếm, không nội dung học
const ev = e => fetch('/api/push', { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ op: 'ev', e }), keepalive: true }).catch(() => {});
const localDay = (d = new Date()) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const META = async () => { const r = await (await caches.open('lk-meta')).match('/__meta'); return r ? r.json().catch(() => null) : null; };
const putMeta = async m => (await caches.open('lk-meta')).put('/__meta', new Response(JSON.stringify(m), { headers: { 'Content-Type': 'application/json' } }));
/** Nội dung lời nhắc hôm nay từ kế hoạch app đã ghi sẵn (đã dịch, web/js/remind.js) – máy chủ không biết gì về việc học. */
function pickToday(m) {
  const today = localDay(), it = m && (m.plan || []).find(x => x.day === today);
  if (it) return it;
  const act = m && m.act ? Date.parse(m.act + 'T00:00:00') : 0, idle = act ? Math.floor((Date.now() - act) / 864e5) : 0;
  const g = m && (idle >= 13 ? m.miss : m.gen);
  return g ? { ...g, url: idle >= 13 ? '/app/#/home' : '/app/#/review' } : { title: 'Lexkite', body: '⏰', url: '/app/#/review', tpl: 'gen1' };
}
// Web Push (cron Worker workers/push gửi push RỖNG – không mã hóa nội dung, không dữ liệu cá nhân). iOS/Safari bắt buộc hiện thông báo cho MỌI push → luôn hiện.
self.addEventListener('push', e => {
  if (LEGACY) return;
  e.waitUntil((async () => {
    const m = (await META()) || {}, it = pickToday(m), today = new Date().toISOString().slice(0, 10);
    await self.registration.showNotification(it.title, { body: it.body, icon: '/icons/icon-192.png', badge: '/icons/icon-192.png', tag: 'daily', data: { url: it.url || '/app/#/review', tpl: it.tpl || 'gen1' } });
    if (m.v) { m.notified = today; await putMeta(m); }
    await ev([['shown', it.tpl || 'gen1', 1]]);
  })());
});
self.addEventListener('pushsubscriptionchange', e => { e.waitUntil(ev([['optout', 'expired', 1]])); }); // app tự đăng ký lại ở lần mở sau (touch → gone)
// Nhắc học khi app đang đóng (Chrome – app đã cài, Periodic Background Sync): không cần máy chủ.
// App ghi sẵn giờ nhắc, ngày học gần nhất và câu nhắc (đúng ngôn ngữ) vào cache 'lk-meta'.
self.addEventListener('periodicsync', e => {
  if (e.tag !== 'vb-daily' || LEGACY) return;
  e.waitUntil((async () => {
    const m = await META(); if (!m) return;
    const now = new Date(), today = now.toISOString().slice(0, 10);
    const [hh, mm] = String(m.time || '20:00').split(':').map(Number);
    if (!m.on || m.last === today || m.notified === today || now.getHours() * 60 + now.getMinutes() < hh * 60 + (mm || 0)) return;
    const wins = await self.clients.matchAll({ type: 'window' }); if (wins.some(c => c.visibilityState === 'visible')) return;
    const it = m.v ? pickToday(m) : { title: m.title, body: m.body, url: '/app/#/review' };
    await self.registration.showNotification(it.title, { body: it.body, icon: '/icons/icon-192.png', badge: '/icons/icon-192.png', tag: 'daily', data: { url: it.url, tpl: it.tpl } });
    m.notified = today; await putMeta(m);
    if (it.tpl) await ev([['shown', it.tpl, 1]]);
  })());
});
