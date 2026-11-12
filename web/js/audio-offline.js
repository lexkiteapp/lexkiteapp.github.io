/* 📥 Gói nghe offline – phần tải lười của LKAudio.offline (web/js/audio.js), chỉ nạp khi người dùng bật/xem trong Cài đặt hoặc gói đang bật.
 * Service worker (web/sw.js, cache 'lk-offline') làm việc tải: ~3000 từ thông dụng (/data/offline-pack.json) + audio bài đang học. */
(function (g) {
  'use strict';
  const KEY = 'lk.offline';
  const post = msg => new Promise(res => {
    const sw = navigator.serviceWorker; if (!sw || !sw.controller) return res(null);
    const ch = new MessageChannel(), t = setTimeout(() => res(null), 4000); ch.port1.onmessage = e => { clearTimeout(t); res(e.data); };
    try { sw.controller.postMessage(Object.assign({ type: 'lk-offline' }, msg), [ch.port2]); } catch (e) { clearTimeout(t); res(null); }
  });
  const voiceOf = accent => (accent === 'en-US' ? 'af_heart' : 'bf_emma');
  const accentNow = () => ((g.App && g.App.state && g.App.state.settings) || {}).accent;
  /** URL audio của 1 bài (mục bài học/truyện): khóa 'word' → audio/w giọng người học; câu → audio/l các giọng đã có file (LISTEN_AUDIO) */
  function urlsFor(items, accent) {
    const out = new Set(), wv = voiceOf(accent), lv = new Set([wv, 'af_heart', 'bf_emma'].concat(g.Chars ? g.Chars.ids.map(g.Chars.voice) : []));
    const W = k => g.audioUrls(k, 'w')[0], L = k => g.audioUrls(k)[0];
    const walk = (x, key, d) => {
      if (d > 6 || out.size > 400 || x == null) return;
      if (typeof x === 'string') {
        const s = x.trim();
        if (key === 'word' && /^[a-z][a-z' -]{0,40}$/i.test(s)) out.add(W(g.LKAudio.fnv36(wv + '|' + s + '|s3')));
        else if (/\s/.test(s) && s.length <= 220 && g.KVoice && g.LISTEN_AUDIO) for (const v of lv) { const k = g.KVoice.lineKey(v, s); if (g.LISTEN_AUDIO.has(k)) out.add(L(k)); }
        return;
      }
      if (Array.isArray(x)) x.forEach(y => walk(y, key, d + 1));
      else if (typeof x === 'object') for (const k of Object.keys(x)) walk(x[k], k, d + 1);
    };
    if (g.audioUrls) walk(items, '', 0);
    return [...out];
  }
  const M = g.LKOffline = {
    urlsFor,
    async enable(accent) {
      try { localStorage.setItem(KEY, '1'); } catch (e) { /* bỏ qua */ }
      try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {}); } catch (e) { /* bỏ qua */ } // xin giữ dữ liệu (không bị trình duyệt dọn khi đầy)
      return post({ op: 'start', voice: voiceOf(accent || accentNow()), base: (g.AUDIO_BASES || [])[0] });
    },
    async disable() { try { localStorage.removeItem(KEY); } catch (e) { /* bỏ qua */ } return post({ op: 'clear' }); },
    status: () => post({ op: 'status' }),
    lesson: (items, accent) => { const u = urlsFor(items, accent || accentNow()); return u.length ? post({ op: 'add', urls: u }) : Promise.resolve(null); },
    resume: () => M.status().then(st => (st && !st.complete && !st.full && !st.running ? M.enable() : st)),
  };
})(self);
