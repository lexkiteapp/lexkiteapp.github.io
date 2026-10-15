/* 🎧 Học rảnh tay (#/handsfree, #/handsfree/<topic>, #/handsfree/session): nghe từ → (nghĩa) → câu ví dụ, tự chuyển từ kế tiếp.
 * Chạy liên tục khi TẮT MÀN HÌNH (iOS/Android): kết hợp file mp3 Kokoro và audio từ điển (Oxford/Wiktionary/dictionaryapi),
 * xâu chuỗi hoàn toàn bằng sự kiện `ended` của thẻ <audio> và âm thanh im lặng (không dựa vào setTimeout khi ẩn trình duyệt),
 * điều khiển đầy đủ từ màn hình khóa và tai nghe qua MediaSession (play, pause, next, previous, seek).
 */
(function () {
  const { $, esc, toast } = UI;
  const App = window.App;
  const { state, routes } = App;
  const view = App.view;
  const URL_OF = k => 'https://lexkiteapp.github.io/audio/l/' + k + '.mp3';
  const kKey = text => (window.KVoice && window.LISTEN_AUDIO ? (k => (LISTEN_AUDIO.has(k) ? k : ''))(KVoice.lineKey('bf_emma', String(text).trim())) : '');
  let player = null;

  // Đoạn âm thanh im lặng chuẩn WAV (8000 Hz, 8-bit mono) – dùng làm cầu nối khi màn hình tắt để mobile không dừng tiến trình
  let silentUrl = null;
  const getSilent = () => {
    if (silentUrl) return silentUrl;
    try {
      const rate = 8000, dur = 1.0, samples = Math.floor(rate * dur);
      const buf = new Uint8Array(44 + samples);
      const writeStr = (off, s) => { for (let i = 0; i < s.length; i++) buf[off + i] = s.charCodeAt(i); };
      const write32 = (off, n) => { buf[off] = n & 255; buf[off + 1] = (n >> 8) & 255; buf[off + 2] = (n >> 16) & 255; buf[off + 3] = (n >> 24) & 255; };
      const write16 = (off, n) => { buf[off] = n & 255; buf[off + 1] = (n >> 8) & 255; };
      writeStr(0, 'RIFF'); write32(4, 36 + samples); writeStr(8, 'WAVE');
      writeStr(12, 'fmt '); write32(16, 16); write16(20, 1); write16(22, 1);
      write32(24, rate); write32(28, rate); write16(32, 1); write16(34, 8);
      writeStr(36, 'data'); write32(40, samples);
      buf.fill(128, 44);
      silentUrl = URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
    } catch (e) {
      silentUrl = 'data:audio/wav;base64,UklGRjIAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YRAAAAAAAAAAAAAAAAAAAAAA';
    }
    return silentUrl;
  };

  function queueOf(arg) {
    const D = window.IELTS_DATA || { TOPICS: [] };
    const curSess = App.currentSession && App.currentSession();
    if (arg === 'session' && curSess && curSess.queue && curSess.queue.length) {
      const words = curSess.queue.map(k => state.cards[k]).filter(Boolean);
      if (words.length) return { title: t('Phiên ôn tập ({n} thẻ)', { n: words.length }), words };
    }
    if (arg) { const tp = D.TOPICS.find(x => x.id === arg); if (tp) return { title: tp.name, words: tp.words.slice() }; }
    const now = Date.now(), cards = Object.values(state.cards || {});
    const due = cards.filter(c => c.srs && (c.srs.reps > 0 || c.srs.last) && c.srs.due <= now + 864e5).sort((a, b) => a.srs.due - b.srs.due);
    if (due.length) return { title: t('Từ đến hạn ôn'), words: due.slice(0, 60) };
    if (cards.length) return { title: t('Sổ từ của bạn'), words: cards.sort((a, b) => (b.added || 0) - (a.added || 0)).slice(0, 60) };
    const tp = D.TOPICS.find(x => x.id === 'ngsl1'); return { title: tp ? tp.name : 'Lexkite', words: tp ? tp.words.slice(0, 60) : [] };
  }

  routes.handsfree = function (arg) {
    const q = queueOf(arg), words = q.words.filter(w => w && w.word);
    const opt = Object.assign({ ex: true, mean: true, gap: 900 }, state.settings.hf || {});
    view.innerHTML = `
      <div class="page-head"><div><h1>🎧 ${t('Học rảnh tay')}</h1><p class="muted">${t('Nghe từ, nghĩa và câu ví dụ liên tục – vừa đi bộ, lái xe hay làm việc nhà. Khóa màn hình vẫn nghe được, điều khiển từ màn hình khóa & tai nghe.')}</p></div></div>
      <div class="hf-wave" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>
      <div class="card hf-card" id="hfCard" aria-live="polite"></div>
      <div class="hf-ctl"><button class="icon-btn" id="hfPrev" aria-label="${t('Từ trước')}">⏮</button><button class="btn primary lg" id="hfPlay">▶ ${t('Bắt đầu')}</button><button class="icon-btn" id="hfNext" aria-label="${t('Từ tiếp')}">⏭</button></div>
      <div class="row center small muted" style="gap:1rem;flex-wrap:wrap;margin-top:.8rem">
        <label class="md-sw"><input type="checkbox" id="hfEx" ${opt.ex ? 'checked' : ''}><span></span>${t('Câu ví dụ')}</label>
        <label class="md-sw"><input type="checkbox" id="hfMean" ${opt.mean ? 'checked' : ''}><span></span>${t('Đọc nghĩa (khi mở màn hình)')}</label>
        <button type="button" class="btn sm ghost" id="hfDark">🌙 ${t('Màn tối')}</button><span id="hfPos"></span></div>
      <p class="tiny muted center" style="margin-top:.8rem">🔒 ${t('Khóa màn hình vẫn phát tiếp tục qua tai nghe / loa ngoài. Danh sách: {t}', { t: esc(q.title) })}</p>`;
    if (!words.length) { $('#hfCard').innerHTML = `<p class="muted center">${t('Chưa có từ nào để nghe.')}</p>`; return; }
    let i = 0, playing = false, step = 0, timer = 0;
    const audio = player = new Audio(); audio.preload = 'auto'; audio.setAttribute('playsinline', '');
    const hidden = () => document.visibilityState === 'hidden';
    const draw = () => {
      const w = words[i];
      $('#hfCard').innerHTML = `<div class="hf-word">${esc(w.word)}</div><div class="ipa">${esc(w.ipa || '')}</div><div class="vi hf-mean">${esc(App.meanOf(w))}</div>${w.ex ? `<div class="ex small" style="margin-top:.6rem">“${esc(w.ex)}”</div>` : ''}`;
      $('#hfPos').textContent = `${i + 1}/${words.length}`;
      if ('mediaSession' in navigator && window.MediaMetadata) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: w.word,
          artist: [w.ipa, App.meanOf(w)].filter(Boolean).join(' · '),
          album: 'Lexkite · ' + q.title,
          artwork: [
            { src: 'icons/icon-128.png', sizes: '128x128', type: 'image/png' },
            { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' }
          ]
        });
        navigator.mediaSession.playbackState = playing ? 'playing' : 'paused';
      }
    };

    // Tìm URL audio tốt nhất cho từ: Kokoro mp3 → audio lưu trong thẻ (US hoặc UK)
    const clip = text => { const k = kKey(text); return k ? URL_OF(k) : ''; };
    const wordAudio = w => {
      const k = clip(w.word);
      if (k) return k;
      const acc = state.settings.accent || 'en-GB';
      return (acc === 'en-US' ? w.audioUS : w.audio) || w.audio || w.audioUS || '';
    };

    const tts = (text, lang) => new Promise(res => {
      if (!('speechSynthesis' in window) || hidden()) return res();
      const u = new SpeechSynthesisUtterance(text); u.lang = lang; u.rate = 0.95;
      u.onend = u.onerror = () => res();
      speechSynthesis.cancel(); speechSynthesis.speak(u);
    });
    const LANG = { vi: 'vi-VN', en: 'en-GB', zh: 'zh-CN', ja: 'ja-JP', ko: 'ko-KR', es: 'es-ES', pt: 'pt-BR', fr: 'fr-FR', de: 'de-DE', id: 'id-ID', th: 'th-TH', hi: 'hi-IN', ar: 'ar-SA', ru: 'ru-RU', tr: 'tr-TR' };

    const playTrack = url => {
      audio.src = url;
      const p = audio.play();
      if (p) p.catch(() => advance());
    };

    const advance = () => {
      clearTimeout(timer);
      if (!playing) return;
      if (hidden()) run(); else timer = setTimeout(run, opt.gap);
    };

    async function run() {
      if (!playing) return;
      const w = words[i];
      // Bước 0: Phát âm từ vựng (chạy file thật; khi khóa màn hình không có file thì phát đoạn im lặng để giữ luồng)
      if (step === 0) {
        draw();
        step = 1;
        const u = wordAudio(w);
        if (u) {
          playTrack(u);
        } else if (hidden()) {
          playTrack(getSilent());
        } else {
          await tts(w.word, state.settings.accent || 'en-GB');
          advance();
        }
        return;
      }
      // Bước 1: Quãng nghỉ ghi nhớ nghĩa (khi khóa màn hình dùng đoạn âm im lặng giữ wake lock)
      if (step === 1) {
        step = 2;
        if (hidden()) {
          playTrack(getSilent());
        } else {
          await new Promise(r => { timer = setTimeout(r, 2200); });
          if (!playing) return;
          if (opt.mean && App.meanOf(w)) {
            await tts(App.meanOf(w), I18N.meanLang() === 'vi' ? 'vi-VN' : LANG[I18N.lang()] || 'en-GB');
          }
          advance();
        }
        return;
      }
      // Bước 2: Câu ví dụ
      if (step === 2) {
        step = 3;
        if (opt.ex && w.ex) {
          const u = clip(w.ex);
          if (u) {
            playTrack(u);
            return;
          }
          if (!hidden()) {
            await tts(w.ex, state.settings.accent || 'en-GB');
          }
        }
        return advance();
      }
      // Sang từ tiếp theo
      next(true);
    }

    const next = auto => { i = (i + 1) % words.length; step = 0; if (auto) run(); else { draw(); if (playing) run(); } };
    const prev = () => { i = (i - 1 + words.length) % words.length; step = 0; draw(); if (playing) run(); };

    audio.addEventListener('ended', advance);
    audio.addEventListener('error', advance);

    const setPlay = on => {
      playing = on;
      document.body.classList.toggle('hf-on', on);
      $('#hfPlay').textContent = on ? '⏸ ' + t('Tạm dừng') : '▶ ' + t('Tiếp tục');
      if ('mediaSession' in navigator) navigator.mediaSession.playbackState = on ? 'playing' : 'paused';
      if (on) {
        run();
      } else {
        clearTimeout(timer);
        audio.pause();
        if ('speechSynthesis' in window) speechSynthesis.cancel();
      }
    };

    $('#hfPlay').onclick = () => setPlay(!playing);
    $('#hfDark').onclick = () => { document.body.classList.toggle('hf-ambient'); };
    $('#hfNext').onclick = () => next(false);
    $('#hfPrev').onclick = prev;
    $('#hfEx').onchange = e => { opt.ex = e.target.checked; state.settings.hf = opt; App.saveSettings(); };
    $('#hfMean').onchange = e => { opt.mean = e.target.checked; state.settings.hf = opt; App.saveSettings(); };

    if ('mediaSession' in navigator) {
      const ms = navigator.mediaSession, set = (a, f) => { try { ms.setActionHandler(a, f); } catch (e) { /* trình duyệt không hỗ trợ */ } };
      set('play', () => setPlay(true));
      set('pause', () => setPlay(false));
      set('nexttrack', () => next(false));
      set('previoustrack', prev);
      set('seekbackward', prev);
      set('seekforward', () => next(false));
    }
    draw();

    App.cleanup = () => {
      document.body.classList.remove('hf-ambient', 'hf-on');
      playing = false;
      clearTimeout(timer);
      audio.pause();
      audio.src = '';
      if ('speechSynthesis' in window) speechSynthesis.cancel();
      if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = null;
        ['play', 'pause', 'nexttrack', 'previoustrack', 'seekbackward', 'seekforward'].forEach(a => {
          try { navigator.mediaSession.setActionHandler(a, null); } catch (e) { /* bỏ qua */ }
        });
      }
    };
  };
})();
