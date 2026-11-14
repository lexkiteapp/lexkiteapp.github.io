/* Call RT – micro rảnh tay thời gian thực cho #/call (cờ lk.call_rt, docs/specs/call-realtime.md M1).
 * CallRT.on() · CallRT.session() → { start(), detect(opts, {start,end}) → { hint(text), stop() }, filler(who, kind), mark(name), stop() }
 * Nguồn xác suất có tiếng: Silero VAD v5 (@ricky0123/vad-web ISC + onnxruntime-web MIT, nạp lười từ jsdelivr) – tới khi nạp xong
 * (hoặc saveData / lỗi / lk.call_rt_vad=energy) dùng năng lượng RMS so với nền ồn (CallEP.energy). Khung âm thanh chỉ nằm trong RAM:
 * không ghi, không gửi đi đâu. Một luồng micro cho cả cuộc gọi (mở sau khi người học bấm 🎙️), cúp máy → tắt hết. */
(function (g) {
  const VAD_V = '0.0.31', ORT_V = '1.22.0', CDN = 'https://cdn.jsdelivr.net/npm/';
  const MIC = { audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true } };
  const pref = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  // cờ: localStorage lk.call_rt = 1/0 (thử) · config công khai call_rt (lk.cfg) – mặc định tắt
  const on = () => { const f = pref('lk.call_rt'); if (f === '1' || f === '0') return f === '1'; try { const c = JSON.parse(pref('lk.cfg') || 'null'), v = c && c.v && c.v.call_rt; return v === true || v === '1' || v === 'true'; } catch (e) { return false; } };
  const script = src => new Promise((res, rej) => { if (document.querySelector(`script[src="${src}"]`)) return res(); const s = document.createElement('script'); s.src = src; s.async = true; s.crossOrigin = 'anonymous'; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
  let sileroP = null;
  const loadSilero = () => sileroP || (sileroP = script(CDN + `onnxruntime-web@${ORT_V}/dist/ort.wasm.min.js`).then(() => script(CDN + `@ricky0123/vad-web@${VAD_V}/dist/bundle.min.js`)).then(() => { if (!g.vad || !g.vad.MicVAD) throw new Error('vad'); return g.vad; }).catch(e => { sileroP = null; throw e; }));
  const marks = g.__callRt = g.__callRt || { marks: [], src: '' }; // đo trên CI (scripts/test/call-rt-e2e.mjs)
  const mark = (name, extra) => { marks.marks.push(Object.assign({ name, t: performance.now() }, extra || {})); if (marks.marks.length > 400) marks.marks.shift(); };

  function session() {
    let stream = null, ac = null, src = null, an = null, iv = 0, sil = null, startP = null, dead = false, last = {};
    const subs = new Set(), en = g.CallEP.energy();
    const emit = (p, from) => { if (from !== marks.src) return; const t = performance.now(); for (const s of [...subs]) s(p, t); };
    async function start() {
      if (startP) return startP;
      startP = (async () => {
        stream = await navigator.mediaDevices.getUserMedia(MIC);
        if (dead) { stream.getTracks().forEach(x => x.stop()); throw new Error('dead'); }
        // năng lượng: có ngay, mỗi 32 ms (= khung Silero 512 mẫu @16 kHz)
        ac = new (g.AudioContext || g.webkitAudioContext)(); src = ac.createMediaStreamSource(stream); an = ac.createAnalyser(); an.fftSize = 1024; src.connect(an);
        const buf = new Float32Array(an.fftSize); marks.src = 'energy';
        iv = setInterval(() => { an.getFloatTimeDomainData(buf); let s = 0; for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i]; emit(en(Math.sqrt(s / buf.length)), 'energy'); }, 32);
        const save = navigator.connection && navigator.connection.saveData;
        const ext = g.Core && g.Core.Store && g.Core.Store.isExtension; // add-on (MV3): không nạp mã từ xa → năng lượng
        if (!save && !ext && pref('lk.call_rt_vad') !== 'energy') loadSilero().then(V => V.MicVAD.new({
          model: 'v5', baseAssetPath: CDN + `@ricky0123/vad-web@${VAD_V}/dist/`, onnxWASMBasePath: CDN + `onnxruntime-web@${ORT_V}/dist/`,
          getStream: async () => stream, pauseStream: async () => {}, resumeStream: async () => stream, startOnLoad: true,
          positiveSpeechThreshold: 0.5, negativeSpeechThreshold: 0.35, // cắt đoạn của thư viện không dùng – chỉ lấy xác suất từng khung
          onFrameProcessed: pr => emit(pr && pr.isSpeech || 0, 'silero'),
        })).then(m => { if (dead) { try { m.destroy(); } catch (e) { /* bỏ qua */ } return; } sil = m; marks.src = 'silero'; mark('silero'); }).catch(() => mark('silero-fail'));
      })();
      return startP;
    }
    // detect: một bộ CallEP cho một lượt (turn) hoặc một lần giáo viên nói (barge)
    function detect(opts, cb) {
      const ep = g.CallEP.create(opts);
      const sub = (p, t) => { const e = ep.push(p, t); if (e) { mark(opts.mode + ':' + e, { hang: e === 'end' ? ep.hang() : 0 }); if (cb[e]) cb[e](t); } };
      subs.add(sub);
      return { hint: s => ep.hint(s), stop: () => subs.delete(sub), ep };
    }
    // câu đệm: không lặp câu vừa dùng
    function filler(who, kind = 'ack') {
      const F = (g.CALL_FILLERS || {})[who] || (g.CALL_FILLERS || {}).ama; const a = (F && F[kind]) || []; if (!a.length) return '';
      let x = a[Math.floor(Math.random() * a.length)]; if (x === last[kind] && a.length > 1) x = a[(a.indexOf(x) + 1) % a.length];
      return (last[kind] = x);
    }
    function stop() {
      dead = true; subs.clear(); clearInterval(iv);
      if (sil) try { sil.destroy(); } catch (e) { /* bỏ qua */ }
      try { if (src) src.disconnect(); if (ac) ac.close(); } catch (e) { /* bỏ qua */ }
      if (stream) stream.getTracks().forEach(x => x.stop());
    }
    return { start, detect, filler, mark, stop, live: () => !!stream && !dead };
  }

  g.CallRT = { on, session, mark, loadSilero };
})(typeof self !== 'undefined' ? self : this);
