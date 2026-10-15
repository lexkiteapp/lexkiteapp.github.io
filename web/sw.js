/* Service worker: cache giao diện để dùng offline + mở app khi bấm thông báo. */
const CACHE = 'lexkite-20261016002534';
// Chỉ phần lõi (các file trong index.html) – phần nặng tải khi cần từ CDN và được lưu lại lúc dùng
const SHELL = ['./', 'index.html', 'css/style.css', 'js/heal.js', 'js/native.js', 'js/ads-config.js', 'js/ads.js', 'js/kit.js', 'js/i18n.js', 'js/data.js', 'js/lexis.js', 'js/structures.js', 'js/core.js', 'js/dictionary.js', 'js/game.js', 'js/ui.js', 'js/app.js', 'js/study.js', 'js/reading.js', 'js/path.js', 'js/plan.js', 'js/goal.js', 'js/hubs.js', 'js/phrases.js', 'js/ai.js', 'js/assist.js', 'js/firebase-config.js', 'js/sync.js', 'js/i18n/en.js', 'manifest.webmanifest', 'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(SHELL.map(u => c.add(new Request(u, { cache: 'reload' })).catch(() => {}))  /* cache:'reload' – bỏ qua bộ nhớ đệm HTTP, không bao giờ cất nhầm file cũ */)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE && k !== 'lk-meta' && k !== AUDIO).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// HTML/JS/CSS: lấy bản mới từ mạng (chờ tối đa 2,5 giây) → không bao giờ trộn file cũ với file mới; offline thì dùng cache.
// Ảnh/icon: lấy từ cache ngay.
// Âm thanh lưu riêng, tối đa 600 file gần nhất (~12 MB) – nghe lại tức thì, offline được, không phình bộ nhớ máy
const AUDIO = 'lk-audio', AUDIO_MAX = 600;
const trimAudio = c => c.keys().then(ks => { if (ks.length > AUDIO_MAX) return Promise.all(ks.slice(0, ks.length - AUDIO_MAX).map(k => c.delete(k))); });
const STATIC = /\.(png|svg|jpg|jpeg|webp|ico|woff2?|mp3)$/; // âm thanh đặt tên theo nội dung → không bao giờ đổi
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // App/add-on gọi file từ lexkite.com (khác nguồn): lấy mạng trước, lưu lại để dùng khi offline
  if (e.request.method === 'GET' && url.origin !== location.origin && (url.hostname === 'lexkite.pages.dev' || url.hostname === 'lexkite.com')) {
    e.respondWith(fetch(e.request).then(r => { if (r.ok || r.type === 'opaque') { const c = r.clone(); caches.open(CACHE).then(x => x.put(e.request, c)); } return r; }).catch(() => caches.match(e.request)));
    return;
  }
  // Âm thanh trên CDN riêng (tên file theo nội dung, không bao giờ đổi): có sẵn thì phát ngay, nghe được cả khi offline
  if (e.request.method === 'GET' && url.hostname === 'lexkiteapp.github.io' && /\.mp3$/.test(url.pathname)) {
    e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request).then(r => { if (r.ok) { const c = r.clone(); caches.open(AUDIO).then(x => x.put(e.request, c).then(() => trimAudio(x))); } return r; })));
    return;
  }
  if (e.request.method !== 'GET' || url.origin !== location.origin) return; // API từ điển luôn đi mạng
  if (STATIC.test(url.pathname)) {
    e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request).then(r => { const c = r.clone(); caches.open(CACHE).then(x => x.put(e.request, c)); return r; })));
    return;
  }
  e.respondWith(new Promise(resolve => {
    let done = false;
    const fallback = () => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match('index.html'));
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
  const target = (e.notification.data && e.notification.data.url) || './#/review';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const c of list) if ('focus' in c) { c.navigate(target); return c.focus(); }
    return self.clients.openWindow(target);
  }));
});
// Nhắc học khi app đang đóng (Chrome – app đã cài, Periodic Background Sync): không cần máy chủ.
// App ghi sẵn giờ nhắc, ngày học gần nhất và câu nhắc (đúng ngôn ngữ) vào cache 'lk-meta'.
self.addEventListener('periodicsync', e => {
  if (e.tag !== 'vb-daily') return;
  e.waitUntil((async () => {
    const r = await (await caches.open('lk-meta')).match('/__meta'); if (!r) return;
    const m = await r.json(), now = new Date(), today = now.toISOString().slice(0, 10);
    const [hh, mm] = String(m.time || '20:00').split(':').map(Number);
    if (!m.on || m.last === today || m.notified === today || now.getHours() * 60 + now.getMinutes() < hh * 60 + (mm || 0)) return;
    const wins = await self.clients.matchAll({ type: 'window' }); if (wins.some(c => c.visibilityState === 'visible')) return;
    await self.registration.showNotification(m.title, { body: m.body, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', tag: 'daily', data: { url: './#/review' } });
    m.notified = today; await (await caches.open('lk-meta')).put('/__meta', new Response(JSON.stringify(m)));
  })());
});
