/* Kokoro trên máy cho chữ chưa có file dựng sẵn (docs/specs/kokoro-on-device.md). Nạp lười: App.need('klocal'); không nằm trong shell.
 * KLocal.ready() → đã nạp xong mô hình trên máy này · KLocal.want(lý do) → xin nạp nếu chính sách cho phép (không bao giờ chặn người dùng)
 * KLocal.speak(text, { voice, rate, gap, onSentence, onEnd, onFail(phần còn lại) }) → false nếu chưa sẵn (UI.tts đọc giọng máy ngay)
 * KLocalPolicy: hàm thuần (scripts/test/klocal.mjs). Phát qua LKAudio.play (một trình phát, chặn chồng tiếng như file dựng sẵn). */
(function (g) {
  'use strict';
  const VER = 'v1.0-1939ad2'; // = commit Hugging Face onnx-community/Kokoro-82M-v1.0-ONNX được chép lên R2 (scripts/cdn/kokoro-model.mjs)
  const HOSTS = [`https://audio.lexkite.com/kokoro/${VER}/`];
  const SHA = { 'onnx/model_quantized.onnx': 'fbae9257e1e05ffc727e951ef9b9c98418e6d79f1c9b6b13bd59f5c9028a1478' };
  const RTF_MAX = 0.6, IDLE_MS = 10 * 60e3, GEN_TIMEOUT = 8000, PROBE_DAYS = 30, LRU = 300, AUDIO_CACHE = 'lk-kl-audio';
  const P = {
    // Cấp máy: 'wasm' | 'off'. e = { ios, mem, cores, probe, user, iosFlag }
    tier(e) {
      if (e.user === 'off') return 'off';
      if (e.probe && e.probe.v === VER && e.probe.off && Date.now() - e.probe.at < PROBE_DAYS * 864e5) return 'off';
      if (e.ios && !e.iosFlag) return 'off';
      if (e.mem != null && e.mem < 4) return 'off';
      if (e.cores != null && e.cores < 4) return 'off';
      return 'wasm';
    },
    // Bật từ xa: kl '0'/'1', kl_pct canary theo nhóm máy b (0–99). Không có cấu hình → tắt
    remote(c, b) { c = c || {}; if (c.kl === '0' || c.kl === false || c.kl === 'false') return false; if (c.kl === '1' || c.kl === true || c.kl === 'true') return true; const p = +c.kl_pct; return p > 0 && b < p; },
    // Được tải mô hình lần đầu? n = { saveData, eff, type, hidden, cached }
    netOk(n) { if (n.hidden) return false; if (n.cached) return true; if (n.saveData) return false; if (/^(slow-2g|2g|3g)$/.test(n.eff || '')) return false; return n.type !== 'cellular'; },
    // Lý do: 'idle' chỉ từ phiên thứ 2; 'dynamic' / 'listening' = người dùng vừa cần
    reasonOk(r, sessions) { return r === 'idle' ? sessions >= 2 : r === 'dynamic' || r === 'listening'; },
    rtfOk: (genMs, durMs) => durMs > 0 && genMs / durMs <= RTF_MAX,
    // PCM float32 → WAV 16-bit, đỉnh chuẩn về −1 dBFS (đồng mức file dựng sẵn)
    wav(pcm, sr) {
      let peak = 0; for (let i = 0; i < pcm.length; i++) { const a = Math.abs(pcm[i]); if (a > peak) peak = a; }
      const k = peak > 1e-4 ? 0.891 / peak : 1, n = pcm.length, b = new DataView(new ArrayBuffer(44 + n * 2)), w = (o, s) => { for (let i = 0; i < s.length; i++) b.setUint8(o + i, s.charCodeAt(i)); };
      w(0, 'RIFF'); b.setUint32(4, 36 + n * 2, true); w(8, 'WAVE'); w(12, 'fmt '); b.setUint32(16, 16, true); b.setUint16(20, 1, true); b.setUint16(22, 1, true);
      b.setUint32(24, sr, true); b.setUint32(28, sr * 2, true); b.setUint16(32, 2, true); b.setUint16(34, 16, true); w(36, 'data'); b.setUint32(40, n * 2, true);
      for (let i = 0; i < n; i++) b.setInt16(44 + i * 2, Math.max(-32767, Math.min(32767, Math.round(pcm[i] * k * 32767))), true);
      return b.buffer;
    },
    fnv: s => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h.toString(36); },
    // LRU: khóa cũ nhất phải xóa khi vượt trần (keys theo thứ tự thêm)
    evict: (keys, cap) => (keys.length > cap ? keys.slice(0, keys.length - cap) : []),
    VER, HOSTS, SHA,
  };
  g.KLocalPolicy = P;
  if (typeof document === 'undefined' || !g.Worker) return;

  const ls = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* bỏ qua */ } } };
  const LA = () => g.LKAudio || null, note = (k, i) => { const a = LA(); if (a) a.note(k, i); };
  const stat = (k, v) => { const a = LA(); if (!a) return; if (v == null) a.stats[k] = (a.stats[k] || 0) + 1; else a.stats[k] = v; };
  const bucket = () => { let b = ls.get('lk.kb'); if (b == null || isNaN(+b) || +b < 0 || +b > 99) { b = String(Math.floor(Math.random() * 100)); ls.set('lk.kb', b); } return +b; };
  const cfg = () => { try { return JSON.parse(ls.get('lk.cfg') || '{}').v || {}; } catch (e) { return {}; } };
  const env = () => { const n = navigator, ua = n.userAgent || ''; let probe = null; try { probe = JSON.parse(ls.get('lk.kl.probe') || 'null'); } catch (e) { /* bỏ qua */ }
    return { ios: /iP(hone|ad|od)/.test(ua) || (/Macintosh/.test(ua) && n.maxTouchPoints > 1), mem: n.deviceMemory, cores: n.hardwareConcurrency, probe, user: ls.get('lk.kl'), iosFlag: cfg().kl_ios === '1' }; };
  const sessions = () => { let s = +ls.get('lk.kl.s') || 0; if (!g.__klS) { g.__klS = 1; s++; ls.set('lk.kl.s', String(s)); } return s; };
  sessions();

  let worker = null, state = 'idle', idleT = 0, seq = 0, cached = ls.get('lk.kl.ok') === VER;
  const waits = new Map();
  const allowed = () => P.remote(cfg(), bucket()) && P.tier(env()) !== 'off';
  const kill = why => { if (worker) { try { worker.terminate(); } catch (e) { /* bỏ qua */ } } worker = null; for (const [, w] of waits) w.rej(new Error(why)); waits.clear(); if (state !== 'off') state = 'idle'; };
  const touch = () => { clearTimeout(idleT); idleT = setTimeout(() => kill('idle'), IDLE_MS); };
  function gen(text, voice, speed) {
    return new Promise((res, rej) => {
      const id = ++seq, t = setTimeout(() => { waits.delete(id); rej(new Error('timeout')); }, GEN_TIMEOUT);
      waits.set(id, { res: v => { clearTimeout(t); res(v); }, rej: e => { clearTimeout(t); rej(e); } });
      worker.postMessage({ type: 'gen', id, text, voice, speed }); touch();
    });
  }
  function start(reason) {
    if (state !== 'idle' || !allowed()) return;
    const c = navigator.connection || {};
    if (!P.netOk({ saveData: c.saveData, eff: c.effectiveType, type: c.type, hidden: document.hidden, cached })) return;
    if (!P.reasonOk(reason, sessions())) return;
    state = 'loading'; const t0 = Date.now();
    try { worker = new Worker('js/klocal-worker.js', { type: 'module' }); } catch (e) { state = 'off'; note('kl', 'worker ' + e.message); return; }
    worker.onerror = e => { note('kl', 'crash ' + (e && e.message)); stat('kl_fail'); kill('crash'); };
    worker.onmessage = ({ data: d }) => {
      if (d.type === 'audio' || d.type === 'err') { const w = waits.get(d.id); if (!w) return; waits.delete(d.id); if (d.type === 'audio') w.res(d); else w.rej(new Error(d.error)); return; }
      if (d.type === 'note') { note('kl', d.what + ' ' + (d.rel || '')); return; }
      if (d.type === 'fail') { note('kl', 'load ' + d.error); stat('kl_fail'); kill('load'); state = 'off'; return; }
      if (d.type === 'loaded') {
        if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
        state = 'probe'; stat('kl_load_ms', Date.now() - t0);
        const t1 = performance.now();
        gen('This is a quick check of the voice on your device.', 'af_heart', 1).then(a => {
          const genMs = performance.now() - t1, durMs = 1000 * new Float32Array(a.pcm).length / a.sr, ok = P.rtfOk(genMs, durMs);
          ls.set('lk.kl.probe', JSON.stringify({ v: VER, at: Date.now(), off: !ok, rtf: +(genMs / durMs).toFixed(2) }));
          stat('kl_rtf', +(genMs / durMs).toFixed(2));
          if (ok) { state = 'ready'; cached = true; ls.set('lk.kl.ok', VER); stat('kl_tier', 'wasm'); } else { kill('slow'); state = 'off'; stat('kl_tier', 'off'); }
        }).catch(e => { note('kl', 'probe ' + e.message); kill('probe'); state = 'off'; });
      }
    };
    worker.postMessage({ type: 'load', hosts: HOSTS, sha: SHA });
  }
  // Âm đã sinh: Cache Storage, khóa giả theo giọng + băm văn bản, LRU
  const ckey = (v, t) => `/__kl/${VER}/${v}/${P.fnv(t)}.wav`; // khóa giả cùng gốc (không bao giờ gọi mạng)
  async function fromCache(v, t) { try { const c = await caches.open(AUDIO_CACHE), r = await c.match(ckey(v, t)); return r ? r.blob() : null; } catch (e) { return null; } }
  async function toCache(v, t, buf) {
    try { const c = await caches.open(AUDIO_CACHE); await c.put(ckey(v, t), new Response(buf, { headers: { 'Content-Type': 'audio/wav' } }));
      const keys = await c.keys(); for (const k of P.evict(keys, LRU)) await c.delete(k); } catch (e) { /* bỏ qua */ }
  }
  async function blobFor(v, t, speed) {
    const hit = 'caches' in g ? await fromCache(v, t) : null; if (hit) return hit;
    const a = await gen(t, v, speed), buf = P.wav(new Float32Array(a.pcm), a.sr);
    if ('caches' in g) toCache(v, t, buf);
    return new Blob([buf], { type: 'audio/wav' });
  }
  let cur = 0, curH = null;
  function speak(parts, o = {}) {
    if (state !== 'ready' || !worker || !LA() || !parts.length) return false;
    const my = ++cur, v = o.voice || 'af_heart', t0 = performance.now(), urls = [];
    worker.postMessage({ type: 'cancel' });
    const jobs = parts.map(() => null), job = i => jobs[i] || (jobs[i] = blobFor(v, parts[i], 1));
    const done = () => urls.forEach(u => URL.revokeObjectURL(u));
    const play = i => {
      if (my !== cur) return done();
      if (i >= parts.length) { done(); if (o.onEnd) o.onEnd(); return; }
      job(i).then(b => {
        if (my !== cur) return done();
        if (i + 1 < parts.length) job(i + 1).catch(() => {}); // sinh trước câu kế trong lúc câu này phát
        const u = URL.createObjectURL(b); urls.push(u);
        if (o.onSentence) o.onSentence(i, parts[i]);
        curH = LA().play([u], { rate: o.rate || 1,
          onStart: () => { if (i === 0) { stat('kl_ok'); stat('kl_ttfa', Math.round(performance.now() - t0)); } },
          onEnd: () => (i + 1 < parts.length ? setTimeout(() => play(i + 1), o.gap || 0) : play(i + 1)),
          onFail: why => { if (my !== cur) return; note('kl', 'play ' + why); stat('kl_fail'); done(); if (o.onFail) o.onFail(parts.slice(i)); } });
      }).catch(e => { if (my !== cur) return; note('kl', 'gen ' + e.message); stat('kl_fail'); done(); if (/timeout|crash/.test(e.message)) kill(e.message); if (o.onFail) o.onFail(parts.slice(i)); });
    };
    play(0);
    return true;
  }
  g.KLocal = {
    ready: () => state === 'ready' && !!worker,
    state: () => state,
    want: reason => { if (state === 'ready' && !worker) state = 'idle'; if (state === 'idle') start(reason); },
    speak, stop: () => { cur++; if (curH) { curH.stop(); curH = null; } if (worker) worker.postMessage({ type: 'cancel' }); },
  };
  // App đã ổn định: lúc rảnh, 20 s sau khi mở (từ phiên thứ 2) – tab ẩn thì chờ tới khi hiện lại
  const idle = () => (g.requestIdleCallback ? requestIdleCallback(() => g.KLocal.want('idle'), { timeout: 5000 }) : g.KLocal.want('idle'));
  setTimeout(() => (document.hidden ? document.addEventListener('visibilitychange', function f() { if (!document.hidden) { document.removeEventListener('visibilitychange', f); idle(); } }) : idle()), 20000);
})(typeof self !== 'undefined' ? self : this);
