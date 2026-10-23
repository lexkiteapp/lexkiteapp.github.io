/* Service worker của app học. App ở /app/ (đăng ký: register('/sw.js', { scope: '/app/' })); / và /<lang>/ là trang giới thiệu tĩnh.
 * CÙNG FILE này còn chạy cho bản cài CŨ có phạm vi "/" (trước 10/2026 app nằm ở /): trình duyệt tự cập nhật sw.js cho đăng ký cũ
 * → LEGACY = true: xóa cache khung app cũ (giữ dữ liệu: lk-meta nhắc học, lk-audio, cache hiện hành dùng chung với /app/),
 * không bao giờ trả app cũ ở "/", chỉ khi MẤT MẠNG mở "/" hoặc "/index.html" (PWA cài cũ có start_url "/index.html#/home",
 * iOS không cập nhật start_url) thì chuyển hướng sang /app/ (đã có trong cache của /app/) → vẫn học offline được.
 * Dữ liệu học (IndexedDB, localStorage) thuộc nguồn lexkite.com, không phụ thuộc phạm vi SW → không mất. Test: scripts/test/landing-routing.mjs */
const CACHE = 'lexkite-20261023185111';
const APP = '/app/';
const LEGACY = new URL(self.registration.scope).pathname === '/';
// Chỉ phần lõi (các file trong app/index.html) – phần nặng tải khi cần từ CDN và được lưu lại lúc dùng
const SHELL = ['/app/', '/css/style.css', '/js/heal.js', '/js/native.js', '/js/ads-config.js', '/js/ads.js', '/js/kit.js', '/js/i18n.js', '/js/data.js', '/js/lexis.js', '/js/core.js', '/js/dictionary.js', '/js/game.js', '/js/ui.js', '/js/app.js', '/js/study.js', '/js/reading.js', '/js/path.js', '/js/plan.js', '/js/hubs.js', '/js/phrases.js', '/js/ai.js', '/js/assist.js', '/js/firebase-config.js', '/js/sync.js', '/js/i18n/en.js', '/manifest.webmanifest', '/icons/icon.svg', '/icons/icon-192.png', '/icons/icon-512.png'];
const KEEP = k => k === CACHE || k === 'lk-meta' || k === AUDIO || k === VIMG; // dữ liệu người dùng & cache dùng chung – không bao giờ xóa khi dọn

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
// Ảnh minh hoạ từ vựng (media.lexkite.com/vimg/<băm>.webp, ~12 KB, immutable): lưu khi xem, tối đa 400 ảnh (~5 MB) – offline được (docs/LEXICON.md § Ảnh minh hoạ)
const VIMG = 'lk-vimg', VIMG_MAX = 400;
const trimVimg = c => c.keys().then(ks => { if (ks.length > VIMG_MAX) return Promise.all(ks.slice(0, ks.length - VIMG_MAX).map(k => c.delete(k))); });
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
    e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request).then(r => { if (r.ok) { const c = r.clone(); caches.open(AUDIO).then(x => x.put(e.request, c).then(() => trimAudio(x))); } return r; })));
    return;
  }
  if (e.request.method === 'GET' && url.hostname === 'media.lexkite.com' && /^\/vimg\/[0-9a-f]{16}\.webp$/.test(url.pathname)) {
    e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request).then(r => { if (r.ok) { const c = r.clone(); caches.open(VIMG).then(x => x.put(e.request, c).then(() => trimVimg(x))); } return r; })));
    return;
  }
  if (e.request.method !== 'GET' || url.origin !== location.origin) return; // API từ điển luôn đi mạng
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
self.addEventListener('notificationclick', e => {
  e.notification.close();
  if (e.action === 'later') return;
  const target = (e.notification.data && e.notification.data.url) || '/app/#/review';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const c of list) if ('focus' in c) { c.navigate(target); return c.focus(); }
    return self.clients.openWindow(target);
  }));
});
// Nhắc học khi app đang đóng (Chrome – app đã cài, Periodic Background Sync): không cần máy chủ.
// App ghi sẵn giờ nhắc, ngày học gần nhất và câu nhắc (đúng ngôn ngữ) vào cache 'lk-meta'.
self.addEventListener('periodicsync', e => {
  if (e.tag !== 'vb-daily' || LEGACY) return;
  e.waitUntil((async () => {
    const r = await (await caches.open('lk-meta')).match('/__meta'); if (!r) return;
    const m = await r.json(), now = new Date(), today = now.toISOString().slice(0, 10);
    const [hh, mm] = String(m.time || '20:00').split(':').map(Number);
    if (!m.on || m.last === today || m.notified === today || now.getHours() * 60 + now.getMinutes() < hh * 60 + (mm || 0)) return;
    const wins = await self.clients.matchAll({ type: 'window' }); if (wins.some(c => c.visibilityState === 'visible')) return;
    await self.registration.showNotification(m.title, { body: m.body, icon: '/icons/icon-192.png', badge: '/icons/icon-192.png', tag: 'daily', data: { url: '/app/#/review' } });
    m.notified = today; await (await caches.open('lk-meta')).put('/__meta', new Response(JSON.stringify(m)));
  })());
});
