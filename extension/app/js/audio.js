/* 🔊 LKAudio – phát giọng đọc ổn định mọi máy (docs/specs/audio-quality.md việc 4; nạp trước ui.js). Mở khóa ở lần chạm đầu (iOS),
 * MỘT kênh giọng đọc (file …/audio/l|w/… hoặc giọng máy – cái mới dừng cái cũ; sfx/video không tính; data-lk-mix = phát chồng có chủ đích),
 * play(urls): từng gốc CDN có hạn chờ → hết gốc mới onFail (giọng máy đúng người nói: Ama nữ, Carlos nam, UK/US), gói offline (web/sw.js 'lk-offline').
 * Test: scripts/test/audio-voice.mjs (Node) · scripts/test/audio-play.mjs (Chromium + WebKit). */
(function (g) {
  'use strict';
  const FEM = /\b(Female|Samantha|Ava|Allison|Susan|Zoe|Serena|Kate|Martha|Libby|Sonia|Jenny|Aria|Ana|Karen|Moira|Tessa|Fiona|Victoria|Joanna|Salli|Kimberly|Ivy|Kendra|Emma|Amy|Hazel|Zira|Catherine|Nicky|Stephanie|Michelle|Emily|Olivia|Sara|Nancy|Heather|Jane|Ashley|Cora|Elizabeth|Maisie|Bella|Abbi|Hollie|Shelley|Sandy|Flo|Grandma|Kathy|Vicki)\b/i;
  const MALE = /\b(Male|Daniel|Oliver|Arthur|Tom|Evan|Alex|Fred|Ryan|Guy|Davis|Christopher|Eric|Brian|Matthew|Joey|Justin|George|David|Mark|James|Aaron|Rishi|Reed|Rocko|Eddy|Gordon|Lee|Nathan|Thomas|Andrew|Roger|Steffan|Tony|Jason|Ralph|Albert|Junior|Grandpa|Alfie|Elliot|Noah|Ethan|William|Jacob|Bruce)\b/i;
  /** 'f' | 'm' | '' theo tên giọng hệ điều hành/trình duyệt */
  const genderOf = name => { const n = String(name || ''); const f = FEM.test(n), m = MALE.test(n); return f && !m ? 'f' : m && !f ? 'm' : /Female/i.test(n) ? 'f' : /Male/i.test(n) ? 'm' : ''; };
  /** Mã giọng Kokoro (af_heart, am_michael, bf_emma, bm_george) → { accent, gender } */
  const kokoro = id => { const m = /^([ab])([fm])_/.exec(String(id || '')); return m ? { accent: m[1] === 'a' ? 'en-US' : 'en-GB', gender: m[2] } : null; };
  /** Người nói (ama/carlos, mã Kokoro hoặc 'f'/'m') → giới tính mong muốn */
  const genderFor = who => { if (who === 'f' || who === 'm') return who; const k = kokoro(who); if (k) return k.gender; const v = g.Chars && g.Chars.voice && /^(ama|carlos)$/.test(who) ? kokoro(g.Chars.voice(who)) : null; return v ? v.gender : who === 'carlos' ? 'm' : who === 'ama' ? 'f' : ''; };
  // Xếp hạng: đúng accent trước, giọng neural/tự nhiên, giọng chất lượng cao; có yêu cầu giới tính → đúng giới tính được cộng lớn (nhân vật giữ đúng người)
  function voiceScore(v, accent, gender) {
    let s = 0;
    const n = v.name || '', lang = String(v.lang || '').replace('_', '-');
    if (lang === accent) s += 100; else if (lang.startsWith('en')) s += 10; else return -1;
    if (/Natural|Neural|Online/i.test(n)) s += 60;                       // Edge: Microsoft Sonia/Ryan/Libby Online (Natural)
    if (/^Google (UK|US) English/i.test(n)) s += 50;                       // Chrome
    if (/Premium|Enhanced|Siri/i.test(n)) s += 45;                         // macOS/iOS giọng tải thêm
    if (/Daniel|Serena|Kate|Oliver|Arthur|Martha|Samantha|Ava|Evan|Zoe|Allison|Tom|Susan/i.test(n)) s += 20;
    if (/Fred|Albert|Bad News|Bahh|Bells|Boing|Bubbles|Cellos|Wobble|Zarvox|Trinoids|Whisper|Junior|Ralph|Kathy|Jester|Organ|Superstar|Grandma|Grandpa|Eddy|Flo|Reed|Rocko|Sandy|Shelley/i.test(n)) s -= 200; // giọng hiệu ứng
    if (v.localService === false) s += 5;
    if (gender) { const gv = genderOf(n); if (gv === gender) s += 150; else if (gv) s -= 150; } // Carlos không bao giờ đọc bằng giọng nữ khi máy có giọng nam (và ngược lại)
    return s;
  }
  const rank = (voices, accent, gender) => (voices || []).map(v => ({ v, s: voiceScore(v, accent, gender) })).filter(x => x.s > 0).sort((a, b) => b.s - a.s).map(x => x.v);
  /** Chọn giọng: giọng người dùng chọn (Cài đặt) nếu đúng giới tính yêu cầu, không thì giọng điểm cao nhất */
  function pickVoice(voices, accent, gender, want) {
    const list = rank(voices, accent, gender), mine = want && list.find(v => v.name === want);
    return (mine && (!gender || !genderOf(mine.name) || genderOf(mine.name) === gender) ? mine : list[0]) || null;
  }

  // Nhật ký dự phòng: console + đếm theo ngày trong localStorage (không gửi đi)
  const stats = { cdn: 0, tts: 0, timeout: 0, last: '' };
  function note(kind, info) {
    stats[kind] = (stats[kind] || 0) + 1; stats.last = kind + ':' + (info || '');
    try { console.info('[audio] dự phòng', kind, info || ''); } catch (e) { /* bỏ qua */ }
    try { const d = new Date().toISOString().slice(0, 10), o = JSON.parse(localStorage.getItem('lk.audio.fb') || '{}'); const x = o.d === d ? o : { d }; x[kind] = (x[kind] || 0) + 1; localStorage.setItem('lk.audio.fb', JSON.stringify(x)); } catch (e) { /* bỏ qua */ }
  }

  const fnv36 = s => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(36); }; // = khóa audio/w (ui.js, sw.js)
  const api = { fnv36, genderOf, kokoro, genderFor, voiceScore, rank, pickVoice, stats, note };
  if (typeof module !== 'undefined' && module.exports && !g.document) { module.exports = api; return; }

  // Mở khóa (iOS Safari/WebKit): AudioContext + WAV im lặng 1 mẫu (data: có trong CSP media-src)
  const SILENT = 'data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQIAAAAAAA==';
  let ctx = null, unlocked = false;
  function unlock() {
    if (unlocked) return true;
    try {
      const AC = g.AudioContext || g.webkitAudioContext;
      if (AC) { ctx = ctx || new AC(); if (ctx.state === 'suspended' && ctx.resume) ctx.resume().catch(() => {}); const b = ctx.createBuffer(1, 1, 22050), s = ctx.createBufferSource(); s.buffer = b; s.connect(ctx.destination); (s.start || s.noteOn).call(s, 0); }
    } catch (e) { /* bỏ qua */ }
    try { const a = new Audio(SILENT); a.dataset.lkMix = '1'; a.muted = false; a.volume = 0; const p = a.play(); if (p && p.catch) p.catch(() => {}); } catch (e) { /* bỏ qua */ }
    try { if ('speechSynthesis' in g && /iP(hone|ad|od)|Macintosh.*Mobile|Safari/.test(navigator.userAgent) && !/Chrome|Android/.test(navigator.userAgent)) { const u = new SpeechSynthesisUtterance(' '); u.volume = 0; speechSynthesis.speak(u); } } catch (e) { /* Safari: giọng máy cũng cần 1 lần nói trong cử chỉ người dùng */ }
    unlocked = true; stats.unlocked = Date.now();
    ['pointerdown', 'touchend', 'keydown', 'click'].forEach(t => g.removeEventListener(t, unlock, true));
    return true;
  }
  ['pointerdown', 'touchend', 'keydown', 'click'].forEach(t => g.addEventListener(t, unlock, true));

  const VOICE_RE = /\/audio\/[lw]\/[^/?#]+\.mp3(\?|#|$)/; // file giọng Kokoro (mọi gốc CDN); sfx/ / video không tính
  const isVoice = el => !!el && el.tagName === 'AUDIO' && !(el.dataset && el.dataset.lkMix) && VOICE_RE.test(el.currentSrc || el.src || '');
  let cur = null;
  const quiet = el => { if (cur && cur !== el) { try { cur.pause(); } catch (e) { /* bỏ qua */ } } cur = el || null; };
  try {
    const P = g.HTMLMediaElement && g.HTMLMediaElement.prototype, play0 = P && P.play;
    if (play0 && !play0.__lk) {
      P.play = function () { if (isVoice(this)) { quiet(this); try { if ('speechSynthesis' in g && speechSynthesis.speaking) speechSynthesis.cancel(); } catch (e) { /* bỏ qua */ } } return play0.apply(this, arguments); };
      P.play.__lk = true;
    }
    const SS = g.speechSynthesis, speak0 = SS && SS.speak;
    if (speak0 && !speak0.__lk) { const f = function (u) { if (u && u.text && u.text.trim()) quiet(null); return speak0.call(SS, u); }; f.__lk = true; try { SS.speak = f; } catch (e) { /* đối tượng gốc không cho ghi */ } }
  } catch (e) { /* bỏ qua */ }

  const TIMEOUT = 7000; // ms tới khi bắt đầu phát; mạng chậm 3G vẫn đủ cho file 4–40 KB
  let seq = 0, pre = null;
  /** play(urls, { rate, onStart(url, i), onEnd(), onFail(reason), onBase(i) }) → { el, stop() } · urls: chuỗi hoặc mảng (thứ tự gốc CDN) */
  function play(urls, o = {}) {
    urls = [].concat(urls).filter(Boolean);
    const my = ++seq, h = { el: null, stop() { if (my === seq) seq++; if (h.el) { h.el.onended = h.el.onerror = null; try { h.el.pause(); } catch (e) { /* bỏ qua */ } } } };
    const fail = why => { if (my !== seq) return; h.el = null; if (o.onFail) o.onFail(why); };
    const tryAt = i => {
      if (my !== seq) return;
      if (i >= urls.length) return fail('all');
      const el = h.el = new Audio(); let ok = false, timer = 0;
      const next = why => { if (ok || el._lkDone) return; el._lkDone = 1; clearTimeout(timer); el.onerror = el.onended = null; try { el.pause(); el.removeAttribute('src'); el.load(); } catch (e) { /* bỏ qua */ } if (why === 'timeout') note('timeout', urls[i]); if (o.onBase) o.onBase(i, why); if (i + 1 < urls.length) note('cdn', why + ' ' + urls[i]); tryAt(i + 1); };
      el.preload = 'auto'; el.preservesPitch = true; el.src = urls[i]; el.playbackRate = o.rate || 1;
      el.onerror = () => next('error');
      el.addEventListener('playing', () => { if (ok || my !== seq) return; ok = true; clearTimeout(timer); if (o.onStart) o.onStart(urls[i], i); }, { once: true });
      el.onended = () => { el.onended = null; if (my === seq && o.onEnd) o.onEnd(); };
      timer = setTimeout(() => next('timeout'), o.timeout || TIMEOUT);
      try {
        const p = el.play();
        if (p && p.catch) p.catch(err => { if (ok || el._lkDone) return; if (err && err.name === 'NotAllowedError') { el._lkDone = 1; clearTimeout(timer); return fail('blocked'); } if (err && err.name === 'AbortError') return; /* bị giọng khác dừng – không thử gốc khác */ next('reject'); });
      } catch (e) { next('throw'); }
    };
    tryAt(0);
    return h;
  }
  /** Tải trước mục kế tiếp (1 khe – mục mới thay mục cũ) */
  function preload(url) { if (!url || (pre && pre.src === url)) return; try { pre = new Audio(); pre.preload = 'auto'; pre.dataset.lkMix = '1'; pre.src = url; } catch (e) { pre = null; } }

  // Gói offline (mặc định tắt): phần nặng ở js/audio-offline.js, chỉ nạp khi người dùng bật/xem – không phình khung app
  const OFF_KEY = 'lk.offline';
  const offOn = () => { try { return localStorage.getItem(OFF_KEY) === '1'; } catch (e) { return false; } };
  let offP = null;
  const mod = () => g.LKOffline ? Promise.resolve(g.LKOffline) : (offP = offP || new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'js/audio-offline.js'; s.onload = () => (g.LKOffline ? res(g.LKOffline) : rej(new Error('LKOffline'))); s.onerror = e => { offP = null; rej(e); }; document.head.appendChild(s); }));
  const call = (f, ...a) => mod().then(m => m[f](...a)).catch(() => null);
  const offline = {
    N: 3000, EST_MB: 15, MAX_MB: 40, // ~3000 từ × ~5 KB (đo 31/10/2026) + bài đang học; trần = OFF_MAX_MB trong web/sw.js
    supported: () => !!(g.navigator && navigator.serviceWorker && 'caches' in g) && !(g.Store && g.Store.isExtension),
    on: offOn,
    // Nút trong Cài đặt sau cờ offline_pack (config công khai lk.cfg, chờ anh duyệt giao diện); thử: localStorage lk.offpack=1
    flag: () => { try { const f = localStorage.getItem('lk.offpack'); if (f === '1' || f === '0') return f === '1'; const c = JSON.parse(localStorage.getItem('lk.cfg') || 'null'), v = c && c.v && c.v.offline_pack; return v === true || v === '1' || v === 'true' || offOn(); } catch (e) { return false; } },
    enable: accent => call('enable', accent), disable: () => call('disable'), status: () => call('status'),
    lesson: (items, accent) => (offOn() && items ? call('lesson', items, accent) : Promise.resolve(null)), // bài đang học → cất audio câu/từ của bài
  };
  if (offOn()) setTimeout(() => call('resume'), 15000); // lần trước chưa tải xong → tiếp tục âm thầm
  Object.assign(api, { unlock, play, preload, isVoice, offline, silent: SILENT, isUnlocked: () => unlocked });
  g.LKAudio = api;
})(typeof self !== 'undefined' ? self : globalThis);
