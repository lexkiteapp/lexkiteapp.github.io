/* Tiện ích giao diện dùng chung. */
(function (g) {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const reEsc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  // Bắt cả dạng biến đổi: recruit → recruited/recruiting; cụm từ: so khớp nguyên cụm
  function wordRegex(word) {
    const w = word.toLowerCase().trim();
    if (/[\s-]/.test(w)) {
      // cụm động từ/thành ngữ: cho phép biến đổi ở từ đầu (cut down on → cutting down on)
      const parts = w.split(/\s+/);
      const first = parts[0].length > 3 ? reEsc(parts[0].replace(/(e|y)$/, '')) + '[a-z]*' : reEsc(parts[0]);
      return new RegExp(`\\b(${[first, ...parts.slice(1).map(reEsc)].join('\\s+')})\\b`, 'gi');
    }
    const stem = w.length > 4 ? w.replace(/(e|y|s)$/, '') : w;
    return new RegExp(`\\b(${reEsc(stem)}[a-z]*)\\b`, 'gi');
  }
  // So khớp trên văn bản gốc rồi mới mã hóa từng đoạn (tránh khớp nhầm vào &quot; / &#39;)
  function wrapMatches(text, word, fn) {
    const t = String(text || '');
    let out = '', i = 0;
    for (const m of t.matchAll(wordRegex(word))) { out += esc(t.slice(i, m.index)) + fn(esc(m[0])); i = m.index + m[0].length; }
    return out + esc(t.slice(i));
  }
  const highlight = (text, word) => wrapMatches(text, word, s => `<mark>${s}</mark>`);
  const cloze = (text, word) => wrapMatches(text, word, () => '<span class="blank"></span>');
  const clozeAnswer = (text, word) => ((text || '').match(wordRegex(word)) || [word])[0];

  // Độ giống nhau 0..1 (Levenshtein)
  function similarity(a, b) {
    a = a.toLowerCase().replace(/[^a-z ]/g, '').trim(); b = b.toLowerCase().replace(/[^a-z ]/g, '').trim();
    if (!a.length && !b.length) return 1;
    const m = Array.from({ length: a.length + 1 }, (_, i) => [i]);
    for (let j = 1; j <= b.length; j++) m[0][j] = j;
    for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
      m[i][j] = Math.min(m[i - 1][j] + 1, m[i][j - 1] + 1, m[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return 1 - m[a.length][b.length] / Math.max(a.length, b.length);
  }

  // Toast dùng chung mọi màn: (1) hộp thoại #modal đang mở → xếp hàng, hiện lần lượt sau khi đóng (không chồng lên modal, không che nút);
  // (2) né vùng nút/thanh cố định ở đáy (thanh điều hướng, "Tiếp tục", nút chính sát đáy) → đặt ngay phía trên; vị trí CSS gốc đã tính safe-area.
  const toastQ = [];
  const modalOpen = () => { const m = document.getElementById('modal'); return !!(m && !m.hidden); };
  const AVOID = '.bottom-nav, .learn-bar, .sheet, .install-nudge, [data-toast-avoid], header button, header a, .topbar button, .topbar a, #view button, #view a.btn, #view a.chip, #view [role="button"], #view .option';
  // Chọn chỗ đặt toast không đè vật cản: vị trí CSS gốc → ngay trên từng vật cản ở nửa dưới màn (≤ 55 %) → mép trên (dưới tai thỏ); hết chỗ thì giữ gốc
  function toastLift(t) {
    t.style.bottom = ''; t.style.top = ''; const H = g.innerHeight || document.documentElement.clientHeight || 0, W = g.innerWidth || document.documentElement.clientWidth || 0; if (!H) return;
    const tr = t.getBoundingClientRect(), h = tr.height || 48, tw = Math.min(tr.width || W, W), x0 = (W - tw) / 2, x1 = x0 + tw; // không getComputedStyle (chậm)
    const base = tr.height ? H - tr.bottom + (t.classList.contains('show') ? 0 : 20) : 28; // chưa .show: translateY(20px)
    const obs = [...document.querySelectorAll(AVOID)].map(el => el.getBoundingClientRect()).filter(r => r.height && r.width && r.top < H && r.bottom > 0 && (!W || (r.left < x1 && r.right > x0)));
    const free = (top, bot) => !obs.some(r => r.top < bot && r.bottom > top);
    if (free(H - base - h, H - base)) return;
    const cands = obs.filter(r => r.top > H * .45).map(r => H - r.top + 10).filter(b => b > base && b <= H * .55).sort((a, b) => a - b);
    for (const b of cands) if (free(H - b - h, H - b)) { t.style.bottom = b + 'px'; return; }
    const top = 12;
    if (free(top, top + h)) { t.style.top = 'calc(' + top + 'px + env(safe-area-inset-top, 0px))'; t.style.bottom = 'auto'; return; }
    if (cands.length) t.style.bottom = cands[cands.length - 1] + 'px';
  }
  function toastShow(msg, ms) {
    const t = $('#toast'); if (!t) return;
    t.textContent = msg; toastLift(t); t.classList.add('show'); t._msg = [msg, ms];
    // Màn vẽ lại khi toast đang hiện (vd. hết bài → màn "Bạn đã học xong") → đặt lại chỗ để không đè nút mới
    const v = document.getElementById('view'); if (v && g.MutationObserver && !toast._mo) { let q = 0; toast._mo = new MutationObserver(() => { if (q) return; q = 1; (g.requestAnimationFrame || setTimeout)(() => { q = 0; if (t._msg) toastLift(t); }); }); toast._mo.observe(v, { childList: true, subtree: true }); }
    clearTimeout(toast._t); toast._t = setTimeout(() => { t.classList.remove('show'); t._msg = null; if (toast._mo) { toast._mo.disconnect(); toast._mo = null; } if (toastQ.length && !modalOpen()) toastShow(...toastQ.shift()); }, ms);
  }
  function toast(msg, ms = 2400) {
    ms = Math.max(ms, Math.min(7000, 1400 + String(msg).length * 55)); // đủ thời gian đọc theo độ dài (WCAG 2.2.1): câu dài không biến mất giữa chừng
    if (modalOpen()) { if (!toastQ.some(q => q[0] === msg)) toastQ.push([msg, ms]); return; }
    toastShow(msg, ms);
  }
  // Theo dõi #modal: mở ra khi toast đang hiện → cất toast vào hàng; đóng lại → hiện hàng chờ (mọi cách đóng: closeModal, gán hidden trực tiếp…)
  function watchModal() {
    const m = document.getElementById('modal'); if (!m || !g.MutationObserver) return;
    new MutationObserver(() => {
      const t = $('#toast'); if (!t) return;
      if (!m.hidden) { if (t._msg) { toastQ.unshift(t._msg); t._msg = null; clearTimeout(toast._t); t.classList.remove('show'); if (toast._mo) { toast._mo.disconnect(); toast._mo = null; } } }
      else if (toastQ.length && !t._msg) setTimeout(() => { if (!modalOpen() && toastQ.length && !t._msg) toastShow(...toastQ.shift()); }, 250);
    }).observe(m, { attributes: true, attributeFilter: ['hidden'] });
  }
  if (document.getElementById('modal')) watchModal(); else document.addEventListener('DOMContentLoaded', watchModal);

  let lastFocus = null;
  function modal(html) {
    lastFocus = document.activeElement;
    const box = $('#modalBox');
    box.innerHTML = html;
    box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.tabIndex = -1;
    $('#modal').hidden = false;
    trapFocus(true); requestAnimationFrame(() => trapFocus()); setTimeout(trapFocus, 120); // WebView (iOS/Android) có thể bỏ qua focus() lần đầu
    return box;
  }
  // Bẫy focus dùng chung mọi nền tảng: focus phải ở trong hộp thoại khi #modal mở. focus() vào ô nhập có thể bị WKWebView từ chối (không có cử chỉ) → thử nút, rồi chính hộp (tabindex=-1)
  function trapFocus(first) {
    const m = $('#modal'), box = $('#modalBox'); if (!m || m.hidden || !box) return;
    const a = document.activeElement; if (!first && a && a !== document.body && box.contains(a)) return;
    const tryF = el => { if (!el) return false; try { el.focus({ preventScroll: true }); } catch (e) { /* bỏ qua */ } return box.contains(document.activeElement); };
    if (tryF(box.querySelector('input:not([disabled]), textarea')) || tryF(box.querySelector('button.primary, button:not([disabled]), a[href]'))) return;
    box.tabIndex = -1; tryF(box);
  }
  // Trang bên dưới (vd. ôn tập tự focus #typeIn, vẽ lại nút) giành focus khi hộp thoại đang mở → kéo về hộp thoại
  document.addEventListener('focusin', e => { const m = $('#modal'); if (m && !m.hidden && !$('#modalBox').contains(e.target)) trapFocus(); });
  document.addEventListener('focusout', () => setTimeout(() => { const a = document.activeElement; if (!a || a === document.body) trapFocus(); }, 0));
  try { const mo = new MutationObserver(() => { const a = document.activeElement; if (!a || a === document.body || !a.isConnected) trapFocus(); }); const b = document.getElementById('modalBox'); if (b) mo.observe(b, { childList: true, subtree: true }); else document.addEventListener('DOMContentLoaded', () => { const x = document.getElementById('modalBox'); x && mo.observe(x, { childList: true, subtree: true }); }); } catch (e) { /* bỏ qua */ }
  // Trả focus: phần tử cũ đã bị vẽ lại (vd. nút cuối bài học) → tiêu đề/nút chính của trang thay vì rơi về <body> (journey-e2e)
  const closeModal = () => { if ($('#modal').hidden) return; $('#modal').hidden = true; const f = lastFocus && lastFocus.isConnected && lastFocus !== document.body ? lastFocus : $('#view .btn.primary, #view h1, #view h2'); const put = el => { if (!el || !el.focus) return false; if (!el.matches('a[href],button,input,select,textarea,[tabindex]')) el.tabIndex = -1; try { el.focus({ preventScroll: true }); } catch (e) { /* bỏ qua */ } return document.activeElement === el; };
    if (!put(f)) put($('#view h1, #view h2') || $('#view')); };
  document.addEventListener('keydown', e => {
    if ($('#modal').hidden) return;
    if (e.key === 'Escape') return closeModal();
    if (e.key !== 'Tab') return; // bẫy focus trong hộp thoại (a11y – hộp mời xem quảng cáo có thưởng, xác nhận…)
    const f = [...$('#modalBox').querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])')].filter(x => x.offsetParent !== null || x === document.activeElement);
    if (!f.length) return;
    const a = f[0], z = f[f.length - 1];
    if (e.shiftKey ? document.activeElement === a || !$('#modalBox').contains(document.activeElement) : document.activeElement === z) { e.preventDefault(); (e.shiftKey ? z : a).focus(); }
  });
  document.addEventListener('click', e => {
    if (e.target.id === 'modal' || (e.target.closest && e.target.closest('[data-close]'))) closeModal();
  });

  // +XP bay lên tại vị trí phần tử
  function xpFloat(n, el) {
    if (!n) return;
    const r = el ? el.getBoundingClientRect() : { left: innerWidth / 2, top: innerHeight / 2, width: 0 };
    const d = document.createElement('div');
    d.className = 'xp-float'; d.setAttribute('aria-hidden', 'true'); d.textContent = `+${n} XP`;
    d.style.left = (r.left + r.width / 2 - 30) + 'px'; d.style.top = (r.top - 10) + 'px';
    document.body.appendChild(d); setTimeout(() => d.remove(), 1000);
  }

  // ---------- Phát âm ----------
  // Xếp hạng giọng đọc: ưu tiên giọng neural/tự nhiên, rồi giọng chất lượng cao của hệ điều hành
  function voiceScore(v, accent) {
    let s = 0;
    const n = v.name;
    if (v.lang === accent || v.lang.replace('_', '-') === accent) s += 100; else if (v.lang.startsWith('en')) s += 10; else return -1;
    if (/Natural|Neural|Online/i.test(n)) s += 60;                       // Edge: Microsoft Sonia/Ryan/Libby Online (Natural)
    if (/^Google (UK|US) English/i.test(n)) s += 50;                       // Chrome
    if (/Premium|Enhanced|Siri/i.test(n)) s += 45;                         // macOS/iOS giọng tải thêm
    if (/Daniel|Serena|Kate|Oliver|Arthur|Martha|Samantha|Ava|Evan|Zoe|Allison|Tom|Susan/i.test(n)) s += 20;
    if (/Fred|Albert|Bad News|Bahh|Bells|Boing|Bubbles|Cellos|Wobble|Zarvox|Trinoids|Whisper|Junior|Ralph|Kathy|Jester|Organ|Superstar|Grandma|Grandpa|Eddy|Flo|Reed|Rocko|Sandy|Shelley/i.test(n)) s -= 200; // giọng hiệu ứng
    if (v.localService === false) s += 5;
    return s;
  }
  function voicesFor(accent) {
    if (!('speechSynthesis' in g)) return [];
    return speechSynthesis.getVoices().map(v => ({ v, s: voiceScore(v, accent) })).filter(x => x.s > 0).sort((a, b) => b.s - a.s).map(x => x.v);
  }
  const prefs = () => (g.App && g.App.state && g.App.state.settings) || {};
  // Micro: bật tự tăng âm + lọc ồn + khử vọng của trình duyệt (giọng nhỏ, văn phòng/xe bus vẫn thu rõ)
  const MIC = { audio: { autoGainControl: true, noiseSuppression: true, echoCancellation: true, channelCount: 1 } };
  // 🤫 Chế độ thì thầm: chuẩn hóa âm lượng bản ghi trước khi nhận dạng (khuếch đại tới đỉnh 0,9 – tối đa 8×, không vỡ tiếng)
  const boost = ch => { let pk = 0; for (let i = 0; i < ch.length; i++) { const a = Math.abs(ch[i]); if (a > pk) pk = a; } const gain = pk > 0 ? Math.min(8, 0.9 / pk) : 1; if (gain > 1.05) for (let i = 0; i < ch.length; i++) ch[i] *= gain; return ch; };
  function pickVoice(accent) {
    const want = prefs().voice && prefs().voice[accent];
    const list = voicesFor(accent);
    return (want && list.find(v => v.name === want)) || list[0] || null;
  }
  // Tách đoạn dài thành câu (giữ ngữ điệu tự nhiên, tránh Chrome cắt khi > ~15 giây)
  function splitSentences(text) {
    const parts = String(text).replace(/\s+/g, ' ').match(/[^.!?;:]+[.!?;:]+["”’)]*|[^.!?;:]+$/g) || [text];
    const out = [];
    for (let p of parts) {
      p = p.trim(); if (!p) continue;
      while (p.length > 220) { const cut = p.lastIndexOf(',', 200) > 60 ? p.lastIndexOf(',', 200) + 1 : p.lastIndexOf(' ', 200); out.push(p.slice(0, cut).trim()); p = p.slice(cut).trim(); }
      out.push(p);
    }
    return out;
  }
  let speakSeq = 0;
  const nativeTTS = () => (g.VBNative && g.VBNative.is && g.Capacitor && g.Capacitor.Plugins && g.Capacitor.Plugins.TextToSpeech) || null;
  // opts: { rate, onSentence(i, text), onEnd() }
  // Giọng Kokoro tạo sẵn cho câu đọc đơn (câu hỏi giám khảo, TOEFL…): có file thì phát mp3, không thì giọng máy
  let hqEl = null;
  const stopHq = () => { if (hqEl) { hqEl.onended = hqEl.onerror = null; hqEl.pause(); hqEl = null; } };
  // CDN âm thanh: audio.lexkite.com (Cloudflare Worker workers/audio, cache 1 năm, máy chủ gần người dùng, dò các kho media) → dự phòng
  // Pages của kho media m2 (infra/media-repos.json) → gốc cũ lexkiteapp.github.io/audio (dự phòng 1 bản phát hành, docs/STORAGE.md).
  // Đăng ký trong infra/resources.json. Mỗi 2 lỗi liên tiếp → chuyển sang gốc kế tiếp cho cả phiên.
  let cdnFail = 0;
  const AUDIO_BASES = g.AUDIO_BASES = ['https://audio.lexkite.com/audio/l/', 'https://lexkiteapp.github.io/lexkite-media-2/audio/l/', 'https://lexkiteapp.github.io/audio/l/'];
  g.audioUrl = k => AUDIO_BASES[Math.min(AUDIO_BASES.length - 1, cdnFail >> 1)] + k + '.mp3';
  g.audioFail = () => { cdnFail++; };
  g.audioHas = k => !g.LISTEN_AUDIO || g.LISTEN_AUDIO.has(k); // chỉ phát câu đã có giọng đọc (tránh 404)
  function tts(text, accent = 'en-GB', rate, opts = {}) {
    if (!text) return;
    stopHq();
    if (g.KVoice && g.LISTEN_AUDIO && prefs().hqVoice !== false && !opts.noHq) {
      const v = accent === 'en-US' ? 'af_heart' : 'bf_emma', whole = g.KVoice.lineKey(v, text);
      const segs = g.LISTEN_AUDIO.has(whole) ? [[whole, text]] : splitSentences(text).map(p => [g.KVoice.lineKey(v, p), p]);
      if (segs.length && segs.every(([k]) => g.LISTEN_AUDIO.has(k))) {
        const my = ++speakSeq; if ('speechSynthesis' in g) speechSynthesis.cancel();
        const pr = Math.min(1.3, Math.max(0.55, (rate || prefs().ttsRate || 0.92) / 0.95));
        const url = g.audioUrl;
        const play = i => {
          if (my !== speakSeq) return;
          if (i >= segs.length) { hqEl = null; if (opts.onEnd) opts.onEnd(); return; }
          const el = hqEl = new Audio(url(segs[i][0])); el.preservesPitch = true; el.playbackRate = pr;
          if (opts.onSentence) opts.onSentence(i, segs[i][1]);
          el.onended = () => play(i + 1);
          el.onerror = () => { g.audioFail(); if (hqEl === el) { hqEl = null; tts(segs.slice(i).map(x => x[1]).join(' '), accent, rate, { ...opts, noHq: true }); } };
          if (segs[i + 1]) { const n = new Audio(); n.preload = 'auto'; n.src = url(segs[i + 1][0]); }
          try { const r = el.play(); if (r && r.catch) r.catch(() => el.onerror && el.onerror()); } catch (e) { el.onerror(); }
        };
        play(0);
        return;
      }
    }
    // App iOS/Android: WebView (nhất là Android) không có giọng đọc của trình duyệt → dùng giọng gốc của hệ điều hành (miễn phí, chạy offline)
    const NT = nativeTTS();
    if (NT) {
      const my = ++speakSeq, parts = splitSentences(text), r = rate || prefs().ttsRate || 0.92;
      NT.stop().catch(() => {});
      (async () => {
        for (let i = 0; i < parts.length; i++) {
          if (my !== speakSeq) return;
          if (opts.onSentence) opts.onSentence(i, parts[i]);
          try { await NT.speak({ text: parts[i], lang: accent, rate: r, pitch: 1, volume: 1, category: 'playback' }); } catch (e) { break; }
        }
        if (my === speakSeq && opts.onEnd) opts.onEnd();
      })();
      return;
    }
    if (!('speechSynthesis' in g)) { // không có giọng máy: từ đơn → thử bản ghi giọng người thật từ từ điển
      if (!/\s/.test(text.trim()) && g.Dict && g.Dict.quick) g.Dict.quick(text.trim()).then(d => { if (d && d.audio) speak(text, accent, d.audio); }).catch(() => {});
      if (opts.onEnd) opts.onEnd();
      return;
    }
    const my = ++speakSeq;
    speechSynthesis.cancel();
    if (speechSynthesis.paused) speechSynthesis.resume(); // Chrome đôi khi kẹt ở trạng thái tạm dừng → không đọc nữa
    const voice = pickVoice(accent);
    const base = rate || prefs().ttsRate || 0.92;
    const parts = splitSentences(text);
    // Chrome đôi khi "treo" sau cancel → resume định kỳ khi đọc đoạn dài
    const keep = parts.length > 1 ? setInterval(() => { if (speechSynthesis.speaking) { speechSynthesis.pause(); speechSynthesis.resume(); } }, 10000) : null;
    parts.forEach((p, i) => {
      const u = new SpeechSynthesisUtterance(p);
      u.lang = accent; u.rate = base; u.pitch = 1;
      if (voice) u.voice = voice;
      u.onstart = () => { if (my === speakSeq && opts.onSentence) opts.onSentence(i, p); };
      if (i === parts.length - 1) u.onend = u.onerror = () => { if (keep) clearInterval(keep); if (my === speakSeq && opts.onEnd) opts.onEnd(); };
      speechSynthesis.speak(u);
    });
  }
  const stopSpeak = () => { speakSeq++; stopHq(); const NT = nativeTTS(); if (NT) NT.stop().catch(() => {}); if ('speechSynthesis' in g) speechSynthesis.cancel(); if (audioEl) audioEl.pause(); };
  // Từ đơn: ưu tiên bản ghi giọng người thật; câu: giọng tổng hợp tốt nhất
  let audioEl = null;
  // Bộ nhớ đệm bản ghi giọng người thật (Cache Storage, tối đa 400 file gần nhất): lần sau phát tức thì, nghe được cả khi offline
  const AUDIO_CACHE = 'vb-audio-v1';
  async function audioSrc(url) {
    if (!('caches' in g) || !/^https:\/\/(upload\.wikimedia\.org|api\.dictionaryapi\.dev|ssl\.gstatic\.com)\//.test(url)) return url;
    try {
      const c = await caches.open(AUDIO_CACHE);
      let r = await c.match(url);
      if (!r) {
        r = await fetch(url, { mode: 'cors' }); if (!r.ok) return url;
        await c.put(url, r.clone());
        c.keys().then(ks => { if (ks.length > 400) ks.slice(0, ks.length - 400).forEach(k => c.delete(k)); });
      }
      return URL.createObjectURL(await r.blob());
    } catch (e) { return url; } // máy chủ không cho tải (CORS) → phát trực tiếp
  }
  // speak(text, accent, url, slow): slow = true → bản ghi người thật phát chậm 0,7× (giữ cao độ); không có bản ghi → giọng máy chậm
  const wordMiss = new Set(), fnv36 = s => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(36); };
  const WAV = '|s3'; // hậu tố khóa giọng từ đơn audio/w (scripts/word-audio-strong.mjs WAV) – mọi từ; bản s3 đã qua Whisper
  function speak(text, accent, url, slow) {
    accent = accent || prefs().accent || 'en-GB';
    const fb = () => tts(text, accent, slow ? 0.55 : undefined);
    // Một giọng thống nhất: bỏ bản ghi âm tình nguyện viên (Wiktionary/dictionaryapi – mỗi từ một người, nhiều bản rè) khi máy có giọng đọc;
    // chỉ giữ file âm thanh của Lexkite. tts() tự ưu tiên giọng Kokoro chất lượng cao nếu có, rồi tới giọng máy tốt nhất.
    if (url && !/lexkite/.test(url) && 'speechSynthesis' in g) url = '';
    // Từ trong kho: giọng Kokoro Anh/Mỹ (scripts/gen-word-audio.mjs, audio.lexkite.com/audio/w/) – chưa có file/không mạng → giọng máy
    const wk = String(text || '').trim(), au = g.Lex && g.Lex.peekAu ? g.Lex.peekAu(wk) : undefined; // Lex biết từ không có file → không tải 404
    const lx = au && g.Lex.peek(wk), we = !url && au !== false && g.navigator && navigator.onLine && ((g.IELTS_DATA && g.IELTS_DATA.INDEX[wk.toLowerCase()]) || (lx && lx.word.toLowerCase() === wk.toLowerCase() ? lx : null));
    if (we && !wordMiss.has(accent + wk)) {
      const v = accent === 'en-US' ? 'af_heart' : 'bf_emma', base = g.audioUrl('x').replace(/l\/x\.mp3$/, 'w/');
      stopSpeak();
      const my = speakSeq, el = audioEl = new Audio(base + fnv36(v + '|' + we.word.trim() + WAV) + '.mp3'); el.preservesPitch = true; el.playbackRate = slow ? 0.7 : 1;
      const miss = () => { if (el.onerror) { el.onerror = null; wordMiss.add(accent + wk); if (my === speakSeq) fb(); } };
      el.onerror = miss; try { const pr = el.play(); if (pr && pr.catch) pr.catch(miss); } catch (e) { miss(); }
      return;
    }
    if (url) {
      stopSpeak();
      const my = speakSeq;
      audioSrc(url).then(src => {
        if (my !== speakSeq) return; // người dùng đã bấm nghe từ khác
        try {
          audioEl = new Audio(src); audioEl.preservesPitch = true; audioEl.playbackRate = slow ? 0.7 : 1;
          if (src.startsWith('blob:')) audioEl.onended = () => URL.revokeObjectURL(src);
          audioEl.play().catch(fb);
        } catch (e) { fb(); }
      });
      return;
    }
    fb();
  }
  if ('speechSynthesis' in g) { speechSynthesis.getVoices(); speechSynthesis.addEventListener && speechSynthesis.addEventListener('voiceschanged', () => speechSynthesis.getVoices()); }

  // ---------- Nhận dạng & chấm phát âm (dùng chung) ----------
  let activeRec = null;
  const REC_ERR = {
    'not-allowed': () => '⚠️ ' + t('Cần cho phép dùng micro – bấm biểu tượng 🎙️/🔒 trên thanh địa chỉ và chọn “Cho phép”.'),
    'service-not-allowed': () => '⚠️ ' + t('Trình duyệt đang chặn nhận dạng giọng nói trên trang này.'),
    'no-speech': () => '🤫 ' + t('Không nghe thấy gì – bấm micro rồi đọc to, rõ ràng nhé.'),
    'audio-capture': () => '🎙️ ' + t('Không tìm thấy micro – kiểm tra tai nghe/micro của máy.'),
    network: () => '📶 ' + t('Không kết nối được dịch vụ nhận dạng giọng nói (cần Internet).'),
    unsupported: () => t('Trình duyệt không hỗ trợ nhận dạng giọng nói – hãy dùng Chrome hoặc Edge.'),
    busy: () => t('Micro đang bận – thử lại sau 1 giây.'),
  };
  const recErrorText = err => Object.prototype.hasOwnProperty.call(REC_ERR, err) ? REC_ERR[err]() : t('Lỗi nhận dạng: {err}', { err });
  /* recognize(target, accent, { start, result({heard, score, audio, alts}), error(code), end }) → { stop } */
  // Bản ghi giọng nói: chỉ giữ tạm trong RAM (không lưu ổ đĩa, không gửi lên cloud).
  // Mỗi "ô" chỉ giữ bản mới nhất – bản cũ được giải phóng ngay; rời trang thì xóa hết.
  const recUrls = {};
  function recUrl(blob, slot = 'rec') { if (recUrls[slot]) URL.revokeObjectURL(recUrls[slot]); return (recUrls[slot] = URL.createObjectURL(blob)); }
  function clearRecs() { Object.keys(recUrls).forEach(k => { URL.revokeObjectURL(recUrls[k]); delete recUrls[k]; }); }
  // ---------- Whisper trên máy (dự phòng khi trình duyệt không có nhận dạng giọng nói: Firefox, app Android…) ----------
  // Mô hình mã nguồn mở whisper-tiny.en (~40 MB, tải 1 lần khi người dùng đồng ý), chạy bằng WebAssembly – âm thanh không gửi đi đâu.
  let whisperP = null;
  const whisperOK = () => { try { return localStorage.getItem('vb.whisper') === '1'; } catch (e) { return false; } };
  async function whisper(onProgress) {
    if (!whisperP) whisperP = import('')
      .then(m => m.pipeline('automatic-speech-recognition', 'onnx-community/whisper-tiny.en', { dtype: 'q8', device: 'wasm', progress_callback: p => { if (p && p.status === 'progress' && onProgress) onProgress(p.progress); } }))
      .catch(e => { whisperP = null; throw e; });
    return whisperP;
  }
  function recognizeWhisper(target, cb) {
    const run = () => {
      const words = String(target).split(/\s+/).length, ms = Math.min(12000, Math.max(2500, 1500 + words * 600));
      let stream = null, media = null, chunks = [], stopped = false;
      const ctl = { _whisper: true, stop: () => finish(), abort: () => { stopped = true; if (media && media.state !== 'inactive') media.stop(); if (stream) stream.getTracks().forEach(t => t.stop()); } };
      const finish = () => { if (media && media.state !== 'inactive') media.stop(); };
      navigator.mediaDevices.getUserMedia(MIC).then(st => {
        stream = st; media = new MediaRecorder(st); media.ondataavailable = e => e.data.size && chunks.push(e.data);
        media.onstop = async () => {
          st.getTracks().forEach(t => t.stop()); if (stopped) return;
          const blob = new Blob(chunks, { type: media.mimeType || 'audio/webm' }), audio = recUrl(blob);
          try {
            const ac = new (g.AudioContext || g.webkitAudioContext)({ sampleRate: 16000 }), buf = await ac.decodeAudioData(await blob.arrayBuffer()); ac.close && ac.close();
            const asr = await whisper(p => toast(t('Đang tải mô hình nhận dạng giọng nói… {p}%', { p: Math.round(p) })));
            const out = await asr(boost(buf.getChannelData(0))), heard = String((out && out.text) || '').replace(/\[[^\]]*\]|\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim(); // bỏ nhãn [BLANK_AUDIO], (music)…
            cb.result && cb.result({ heard, score: Math.round(similarity(heard, target) * 100), audio, alts: [heard] });
          } catch (e) { cb.error && cb.error('whisper'); }
          cb.end && cb.end();
        };
        media.start(); setTimeout(finish, ms); activeRec = ctl;
      }).catch(() => { cb.error && cb.error('not-allowed'); });
      return ctl;
    };
    if (whisperOK()) return run();
    modal(`<h2 style="margin-top:0">🎙️ ${t('Bật nhận dạng giọng nói trên máy')}</h2><p class="small">${t('Trình duyệt này chưa có nhận dạng giọng nói. Lexkite có thể dùng <b>Whisper</b> (mã nguồn mở) chạy ngay trên máy của bạn: miễn phí, riêng tư – âm thanh không gửi đi đâu.')}</p><p class="small muted">${t('Cần tải mô hình khoảng 40 MB một lần (nên dùng Wi-Fi).')}</p><div class="row"><button class="btn primary" id="wOk">${t('Tải & bật')}</button><button class="btn ghost" data-close>${t('Để sau')}</button></div>`);
    const b = document.getElementById('wOk'); if (b) b.onclick = () => { try { localStorage.setItem('vb.whisper', '1'); } catch (e) { /* bỏ qua */ } closeModal(); whisper().catch(() => {}); toast(t('Đang chuẩn bị… bấm micro lần nữa để nói')); };
    cb.end && cb.end();
    return null;
  }
  function recognize(target, accent, cb = {}) {
    const SR = g.SpeechRecognition || g.webkitSpeechRecognition;
    if (SR && prefs().whisperMode && whisperOK() && navigator.mediaDevices && g.MediaRecorder) return recognizeWhisper(target, cb);
    if (!SR) { if (g.Core && g.Core.Store.isExtension || !(navigator.mediaDevices && g.MediaRecorder)) { cb.error && cb.error('unsupported'); return null; } return recognizeWhisper(target, cb); }
    if (activeRec) { const old = activeRec; activeRec = null; old._stale = true; try { old.abort(); } catch (e) { /* đã dừng */ } }
    stopSpeak();
    const r = new SR();
    activeRec = r;
    r.lang = accent || 'en-GB'; r.maxAlternatives = 5; r.interimResults = false; r.continuous = false;
    if (cb.setup) try { cb.setup(r); } catch (e) { /* thuộc tính mới (processLocally, phrases) chưa có */ }
    // Ghi âm giọng người học song song để nghe lại so với giọng mẫu
    let media = null, chunks = [], stream = null, audioP = null;
    if (navigator.mediaDevices && g.MediaRecorder) {
      navigator.mediaDevices.getUserMedia(MIC).then(st => {
        if (r._stale || r._ended) { st.getTracks().forEach(t => t.stop()); return; }
        stream = st;
        try { media = new MediaRecorder(st); media.ondataavailable = e => e.data.size && chunks.push(e.data); media.start(); } catch (e) { media = null; }
      }).catch(() => {});
    }
    const finishAudio = () => audioP || (audioP = new Promise(res => {
      const done = () => { if (stream) stream.getTracks().forEach(t => t.stop()); res(chunks.length ? recUrl(new Blob(chunks, { type: (media && media.mimeType) || 'audio/webm' })) : ''); };
      if (media && media.state !== 'inactive') { media.onstop = done; try { media.stop(); } catch (e) { done(); } } else done();
    }));
    r.onresult = async e => {
      if (r._stale) return;
      const alts = [...e.results[0]].map(a => a.transcript.trim()).filter(Boolean);
      const best = alts.map(a => ({ a, s: similarity(a, target) })).sort((x, y) => y.s - x.s)[0] || { a: '', s: 0 };
      const audio = await finishAudio();
      cb.result && cb.result({ heard: best.a, score: Math.round(best.s * 100), audio, alts });
    };
    r.onerror = e => { if (r._stale || e.error === 'aborted') return; cb.error && cb.error(e.error); };
    r.onend = () => { r._ended = true; if (activeRec === r) activeRec = null; finishAudio(); if (!r._stale) cb.end && cb.end(); };
    try { r.start(); } catch (e) { cb.error && cb.error('busy'); return null; }
    cb.start && cb.start();
    return { stop: () => { try { r.stop(); } catch (e) { /* đã dừng */ } } };
  }
  const stopRecognize = () => { if (activeRec) { activeRec._stale = true; try { activeRec.abort(); } catch (e) { /* đã dừng */ } activeRec = null; } };

  // Ảnh minh họa kèm ghi nguồn theo giấy phép Creative Commons
  // Không dùng onclick="…" nội tuyến (CSP của add-on chặn): bấm ⓘ ghi nguồn ảnh không lật thẻ; [data-confirm] hỏi lại trước khi đi tiếp
  if (g.document && !g.__lkDeleg) {
    g.__lkDeleg = true;
    document.addEventListener('click', e => {
      if (e.target.closest && e.target.closest('.pcredit')) { e.stopPropagation(); return; }
      const c = e.target.closest && e.target.closest('[data-confirm]');
      if (c && !confirm(c.dataset.confirm)) { e.preventDefault(); e.stopPropagation(); }
    }, true);
  }
  const pic = (c, cls = 'pic') => `<div class="${cls}">${c.image ? `<img src="${esc(c.image)}" alt="${esc(c.word)}" loading="lazy" referrerpolicy="no-referrer">${c.imageCredit ? `<a class="pcredit" href="${esc(/^https?:\/\//i.test(String(c.imageCredit.link || '')) ? c.imageCredit.link : '#')}" target="_blank" rel="noopener" title="${esc(c.imageCredit.text)}">ⓘ</a>` : ''}` : esc(c.emoji || '📘')}</div>`;
  const levelChip = l => l ? `<span class="chip lv ${esc(l)}">${esc(l)}</span>` : '';
  // Từ loại lưu bằng tiếng Việt trong dữ liệu (vd. "danh từ") → giao diện ngôn ngữ khác hiện thuật ngữ tiếng Anh chuẩn (noun, verb…)
  const VI_POS = { 'danh từ': 'noun', 'động từ': 'verb', 'tính từ': 'adjective', 'trạng từ': 'adverb', 'giới từ': 'preposition', 'liên từ': 'conjunction', 'đại từ': 'pronoun', 'thán từ': 'interjection', 'từ hạn định': 'determiner', 'cụm động từ': 'phrasal verb', 'cụm từ': 'phrase', 'thành ngữ': 'idiom', 'trợ động từ': 'auxiliary verb', 'số từ': 'number', 'mạo từ': 'article' };
  const posLabel = p => { const k = String(p || '').trim().toLowerCase(); return (!g.I18N || I18N.lang() === 'vi') ? p : VI_POS[k] || p; };
  const posChip = p => p ? `<span class="chip pos">${esc(posLabel(p))}</span>` : '';
  const masteryDots = (s, SRS) => { const m = SRS.mastery(s); return `<span class="mastery" title="${t('Mức thuộc')}">${[1, 2, 3].map(i => `<i class="${i <= m ? 'on' : ''}"></i>`).join('')}</span>`; };
  const ring = (pct, label, color) => `<div class="ring" style="--p:${Math.round(pct)};${color ? `--c:${color}` : ''}"><b>${label}</b></div>`;

  function download(blob, name) {
    if (g.VBNative && VBNative.is) return (g.LKFile ? Promise.resolve() : App.need('file')).then(() => LKFile.save(blob, name)).catch(() => { toast(t('Không tải được – thử lại sau')); return 'error'; }); // app gốc → js/lib/save-file.js
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  // Ô ngữ cảnh có nút nghe cả câu (🔊 tốc độ chuẩn · 🐢 chậm) – dùng chung cho mọi bảng tra
  function ctxBox(sentence, word, extra = '') {
    if (!sentence) return '';
    return `<div class="ctx-box ${extra}"><div class="ctx-tx">📌 ${highlight(sentence, word)}</div><div class="ctx-act"><button class="ctx-say" data-saysent="${esc(sentence)}" title="${t('Nghe cả câu')}" aria-label="${t('Nghe cả câu')}">🔊</button><button class="ctx-say" data-saysent="${esc(sentence)}" data-slow="1" title="${t('Nghe chậm')}" aria-label="${t('Nghe chậm')}">🐢</button></div></div>`;
  }
  if (typeof document !== 'undefined') document.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('[data-saysent]'); if (!b) return;
    e.preventDefault(); e.stopPropagation();
    const playing = b.classList.contains('on');
    document.querySelectorAll('.ctx-say.on').forEach(x => x.classList.remove('on'));
    if (playing) return stopSpeak();
    b.classList.add('on');
    const st = (g.App && g.App.state && g.App.state.settings) || {};
    tts(b.dataset.saysent, st.accent || 'en-GB', (b.dataset.slow || e.shiftKey) ? 0.7 : undefined, { onEnd: () => b.classList.remove('on') });
  }, true);
  // Hạn mức máy chủ (functions/api/_quota.js): mã thiết bị ngẫu nhiên (X-Lexkite-Device) · 429 { error:'quota', msg, resetAt, signIn } → câu báo
  const dev = () => { try { let d = localStorage.getItem('lk.dev'); if (!d) localStorage.setItem('lk.dev', d = [...crypto.getRandomValues(new Uint8Array(20))].map(b => (b % 36).toString(36)).join('')); return d; } catch (e) { return ''; } };
  const quotaText = (j = {}) => { const r = j.resetAt, at = r && new Date(r).toLocaleString([], r - Date.now() > 864e5 ? { dateStyle: 'short', timeStyle: 'short' } : { timeStyle: 'short' }); return (j.msg === 'quota.daily' && at ? t('Đã hết lượt miễn phí hôm nay – mở lại lúc {time}.', { time: at }) : t('Máy chủ đang bận – thử lại sau ít phút.')) + (j.signIn ? ' ' + t('Đăng nhập để có thêm lượt.') : ''); };
  // Icon UI: 1 bộ Lucide, sprite #lk-sprite (docs/DESIGN-SYSTEM.md)
  const icon = (n, cls) => `<svg class="i${cls ? ' ' + cls : ''}" aria-hidden="true"><use href="#i-${n}"/></svg>`;
  // Dữ liệu còn lưu emoji (nhiệm vụ, kế hoạch, thẻ chế độ…) → vẽ bằng icon Lucide; emoji lạ giữ nguyên. CHỈ dùng trong HTML (không dùng cho toast/title/thuộc tính).
  const EMI = { '🎧': 'headphones', '📰': 'newspaper', '✍': 'pen-line', '🗣': 'message-circle', '💬': 'message-circle', '🎙': 'mic', '⚡': 'zap', '🧠': 'brain', '🧩': 'puzzle', '📝': 'file-pen', '🎯': 'target', '🔥': 'flame', '✨': 'sparkles', '🔁': 'repeat', '📅': 'calendar', '📚': 'library', '📖': 'book-open', '🏅': 'medal', '🏆': 'trophy', '⏰': 'alarm-clock', '⏳': 'hourglass', '⏱': 'timer', '🌱': 'sprout', '📶': 'signal', '✅': 'circle-check', '📈': 'trending-up', '✉': 'mail', '📐': 'ruler', '🏛': 'landmark', '💼': 'briefcase', '📄': 'file-text', '🔤': 'a-large-small', '🖥': 'monitor', '💡': 'lightbulb', '🃏': 'layers', '⭐': 'star', '🔊': 'volume-2', '🎓': 'graduation-cap', '🧳': 'luggage', '📢': 'megaphone', '📌': 'pin', '🔑': 'key-round', '🧬': 'dna', '🧷': 'paperclip', '📴': 'wifi-off', '⬇': 'download', '❌': 'circle-x', '🔒': 'lock', '🔔': 'bell', '⚙': 'settings', '🌍': 'globe', '📊': 'chart-column', '🗺': 'map', '🏁': 'flag', '🎮': 'puzzle', '🐣': 'egg', '📗': 'book-marked', '🌋': 'mountain', '💎': 'gem', '🚀': 'rocket', '💯': 'badge-check', '🦉': 'moon', '🐦': 'bird', '🏹': 'crosshair', '🎖': 'medal', '👑': 'crown', '🔎': 'search', '🧰': 'briefcase', '🧭': 'compass', '📕': 'book-x', '✏': 'pencil', '🎭': 'smile', '🚩': 'flag' };
  const glyph = (e, cls) => { e = String(e == null ? '' : e); const n = /^[a-z][a-z0-9-]*$/.test(e) ? e : EMI[e.replace(/\uFE0F/g, '')]; return n ? icon(n, cls) : e; };
  const addIcons = h => { const s = document.getElementById('lk-sprite'); if (s && h) s.insertAdjacentHTML('beforeend', h); };
  const GLYPH = { '🔊': ['volume-2', 'Nghe'], '🔉': ['volume-2', 'Nghe'], '🐢': ['turtle', 'Nghe chậm'], '⚙️': ['settings', 'Cài đặt'], '⚙': ['settings', 'Cài đặt'], '🔎': ['search', 'Tra từ'], '🔍': ['search', 'Tra từ'], '🔔': ['bell', 'Thông báo'], '🎙️': ['mic'], '🎙': ['mic'], '✕': ['x', 'Đóng', 1], '×': ['x', 'Đóng', 1], '✖': ['x', 'Đóng', 1], '←': ['arrow-left', 0, 0, 1], '‹': ['chevron-left', 0, 1, 1], '›': ['chevron-right', 0, 1, 1] }; // [icon, nhãn, chỉ khi đứng 1 mình, lật RTL]
  for (const k in EMI) { if (!GLYPH[k]) GLYPH[k] = [EMI[k]]; if (!GLYPH[k + '\uFE0F']) GLYPH[k + '\uFE0F'] = [EMI[k]]; } // emoji đầu nút/liên kết/tiêu đề → icon Lucide (tự vẽ lại khi DOM đổi)
  const GRE = new RegExp('^(\\s*)(' + Object.keys(GLYPH).sort((a, b) => b.length - a.length).join('|') + ')(?=\\s|$)\\s*', 'u');
  const PAINT = 'button, a, .ctx-say, .fi-btn, summary, h1, h2, h3, .set-h';
  const paintEl = el => {
    if (el.closest('[data-noicon], #lk-sprite, svg')) return;
    const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); let n, hit;
    while ((n = w.nextNode())) { if (/\S/.test(n.nodeValue)) { hit = n; break; } }
    if (!hit) return;
    const m = hit.nodeValue.match(GRE); if (!m) return;
    const [ic, lab, solo, dir] = GLYPH[m[2]], rest = hit.nodeValue.slice(m[0].length);
    if (solo && (rest.trim() || el.textContent.trim() !== m[2])) return;
    const only = !el.textContent.replace(m[2], '').trim();
    const name = el.getAttribute('aria-label') || el.getAttribute('title') || el.getAttribute('aria-labelledby');
    if (only && !name) { if (!lab) return; el.setAttribute('aria-label', g.t ? g.t(lab) : lab); }
    const t0 = document.createElement('template'); t0.innerHTML = icon(ic, dir ? 'i-dir' : '');
    hit.nodeValue = m[1] + (rest && !/^\s/.test(rest) ? ' ' : '') + rest;
    if (!hit.nodeValue.trim()) hit.nodeValue = '';
    hit.parentNode.insertBefore(t0.content.firstChild, hit);
    el.classList.add('has-i');
  };
  const paint = root => {
    if (!root || root.nodeType !== 1 || !document.getElementById('lk-sprite')) return;
    if (root.matches(PAINT)) paintEl(root);
    root.querySelectorAll(PAINT).forEach(paintEl);
  };
  if (typeof document !== 'undefined' && g.MutationObserver) {
    const start = () => {
      if (!document.getElementById('lk-sprite')) return;
      paint(document.body);
      new MutationObserver(ms => { for (const m of ms) { if (m.type === 'characterData') { const p = m.target.parentElement, b = p && p.closest(PAINT); if (b) paintEl(b); continue; } for (const n of m.addedNodes) { if (n.nodeType === 1) { if (n.tagName !== 'svg') { paint(n); const b = n.parentElement && n.parentElement.closest(PAINT); if (b) paintEl(b); } } else if (n.nodeType === 3 && n.parentElement) { const b = n.parentElement.closest(PAINT); if (b) paintEl(b); } } } }).observe(document.body, { childList: true, subtree: true, characterData: true });
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  }
  // Khung chờ dùng chung (thay chữ "Đang tải…" trơn): giữ bố cục → không nhảy trang khi nội dung về; trình đọc màn hình nghe nhãn
  const skel = (label, n = 3) => `<div class="card skel-block" role="status" aria-busy="true"><span class="sr-only">${label}</span><div class="skel skel-h"></div>${'<div class="skel skel-l"></div>'.repeat(n)}</div>`;
  const skelPage = (label, n = 4) => `<div class="skel-page" role="status" aria-busy="true"><span class="sr-only">${label}</span><div class="skel skel-h"></div><div class="skel skel-l"></div><div class="skel-grid">${'<div class="skel skel-card"></div>'.repeat(n)}</div></div>`;
  g.UI = { icon, glyph, addIcons, paintIcons: paint, skel, skelPage, dev, quotaText, quota: j => { toast(quotaText(j), 6000); if (g.Ads && g.Ads.quota) g.Ads.quota(j); }, ctxBox, recUrl, clearRecs, $, $$, esc, shuffle, wordRegex, highlight, cloze, clozeAnswer, similarity, toast, modal, closeModal, xpFloat, speak, tts, stopSpeak, recognize, stopRecognize, recErrorText, voicesFor, pickVoice, splitSentences, pic, levelChip, posChip, masteryDots, ring, download };
})(typeof self !== 'undefined' ? self : this);
