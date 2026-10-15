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

  function toast(msg, ms = 2400) {
    const t = $('#toast');
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), ms);
  }

  let lastFocus = null;
  function modal(html) {
    lastFocus = document.activeElement;
    const box = $('#modalBox');
    box.innerHTML = html;
    box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.tabIndex = -1;
    $('#modal').hidden = false;
    (box.querySelector('input, textarea, button.primary, button, a') || box).focus();
    return box;
  }
  const closeModal = () => { if ($('#modal').hidden) return; $('#modal').hidden = true; if (lastFocus && lastFocus.focus) lastFocus.focus(); };
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#modal').hidden) closeModal(); });
  document.addEventListener('click', e => {
    if (e.target.id === 'modal' || (e.target.closest && e.target.closest('[data-close]'))) closeModal();
  });

  // +XP bay lên tại vị trí phần tử
  function xpFloat(n, el) {
    if (!n) return;
    const r = el ? el.getBoundingClientRect() : { left: innerWidth / 2, top: innerHeight / 2, width: 0 };
    const d = document.createElement('div');
    d.className = 'xp-float'; d.textContent = `+${n} XP`;
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
  function tts(text, accent = 'en-GB', rate, opts = {}) {
    if (!text) return;
    stopHq();
    if (g.KVoice && g.LISTEN_AUDIO && prefs().hqVoice !== false && !opts.noHq) {
      const v = accent === 'en-US' ? 'af_heart' : 'bf_emma', whole = g.KVoice.lineKey(v, text);
      const segs = g.LISTEN_AUDIO.has(whole) ? [[whole, text]] : splitSentences(text).map(p => [g.KVoice.lineKey(v, p), p]);
      if (segs.length && segs.every(([k]) => g.LISTEN_AUDIO.has(k))) {
        const my = ++speakSeq; if ('speechSynthesis' in g) speechSynthesis.cancel();
        const pr = Math.min(1.3, Math.max(0.55, (rate || prefs().ttsRate || 0.92) / 0.95));
        const url = k => 'https://lexkite.com/audio/l/' + k + '.mp3';
        const play = i => {
          if (my !== speakSeq) return;
          if (i >= segs.length) { hqEl = null; if (opts.onEnd) opts.onEnd(); return; }
          const el = hqEl = new Audio(url(segs[i][0])); el.preservesPitch = true; el.playbackRate = pr;
          if (opts.onSentence) opts.onSentence(i, segs[i][1]);
          el.onended = () => play(i + 1);
          el.onerror = () => { if (hqEl === el) { hqEl = null; tts(segs.slice(i).map(x => x[1]).join(' '), accent, rate, { ...opts, noHq: true }); } };
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
  function speak(text, accent, url, slow) {
    accent = accent || prefs().accent || 'en-GB';
    const fb = () => tts(text, accent, slow ? 0.55 : undefined);
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
    if (!whisperP) whisperP = import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.5/dist/transformers.min.js')
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
      navigator.mediaDevices.getUserMedia({ audio: true }).then(st => {
        stream = st; media = new MediaRecorder(st); media.ondataavailable = e => e.data.size && chunks.push(e.data);
        media.onstop = async () => {
          st.getTracks().forEach(t => t.stop()); if (stopped) return;
          const blob = new Blob(chunks, { type: media.mimeType || 'audio/webm' }), audio = recUrl(blob);
          try {
            const ac = new (g.AudioContext || g.webkitAudioContext)({ sampleRate: 16000 }), buf = await ac.decodeAudioData(await blob.arrayBuffer()); ac.close && ac.close();
            const asr = await whisper(p => toast(t('Đang tải mô hình nhận dạng giọng nói… {p}%', { p: Math.round(p) })));
            const out = await asr(buf.getChannelData(0)), heard = String((out && out.text) || '').replace(/\[[^\]]*\]|\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim(); // bỏ nhãn [BLANK_AUDIO], (music)…
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
    if (!SR) { if (g.Core && g.Core.Store.isExtension || !(navigator.mediaDevices && g.MediaRecorder)) { cb.error && cb.error('unsupported'); return null; } return recognizeWhisper(target, cb); }
    if (activeRec) { const old = activeRec; activeRec = null; old._stale = true; try { old.abort(); } catch (e) { /* đã dừng */ } }
    stopSpeak();
    const r = new SR();
    activeRec = r;
    r.lang = accent || 'en-GB'; r.maxAlternatives = 5; r.interimResults = false; r.continuous = false;
    // Ghi âm giọng người học song song để nghe lại so với giọng mẫu
    let media = null, chunks = [], stream = null, audioP = null;
    if (navigator.mediaDevices && g.MediaRecorder) {
      navigator.mediaDevices.getUserMedia({ audio: true }).then(st => {
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
  const pic = (c, cls = 'pic') => `<div class="${cls}">${c.image ? `<img src="${esc(c.image)}" alt="${esc(c.word)}" loading="lazy" referrerpolicy="no-referrer">${c.imageCredit ? `<a class="pcredit" href="${esc(c.imageCredit.link)}" target="_blank" rel="noopener" title="${esc(c.imageCredit.text)}" onclick="event.stopPropagation()">ⓘ</a>` : ''}` : esc(c.emoji || '📘')}</div>`;
  const levelChip = l => l ? `<span class="chip lv ${esc(l)}">${esc(l)}</span>` : '';
  const posChip = p => p ? `<span class="chip pos">${esc(p)}</span>` : '';
  const masteryDots = (s, SRS) => { const m = SRS.mastery(s); return `<span class="mastery" title="${t('Mức thuộc')}">${[1, 2, 3].map(i => `<i class="${i <= m ? 'on' : ''}"></i>`).join('')}</span>`; };
  const ring = (pct, label, color) => `<div class="ring" style="--p:${Math.round(pct)};${color ? `--c:${color}` : ''}"><b>${label}</b></div>`;

  function download(blob, name) {
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
  g.UI = { ctxBox, recUrl, clearRecs, $, $$, esc, shuffle, wordRegex, highlight, cloze, clozeAnswer, similarity, toast, modal, closeModal, xpFloat, speak, tts, stopSpeak, recognize, stopRecognize, recErrorText, voicesFor, pickVoice, splitSentences, pic, levelChip, posChip, masteryDots, ring, download };
})(typeof self !== 'undefined' ? self : this);
