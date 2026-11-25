/* 🎬 Video "trước/sau" của Nhật ký giọng nói (docs/specs/voice-diary.md §4) – dựng HOÀN TOÀN trên máy, chỉ khi người học bấm Chia sẻ.
 * 720×1280 (9:16), 30 fps, ≤ 25 s: mở đầu · bản ngày 1 · bản mới nhất · điểm trước→sau + biểu đồ + Ama/Carlos 2D (Chars.still) · link thách đấu.
 * canvas.captureStream + WebAudio (MediaStreamDestination) → MediaRecorder (mp4 nếu có, không thì webm). Gói lười 'diaryvid'. Bảng màu = brand/tokens.json brand.*. */
(function (g) {
  'use strict';
  const W = 720, H = 1280, FPS = 30, MAXV = 8; // tối đa 8 s mỗi bản ghi trong video
  const C = { teal: '#0F3D3E', teal2: '#17595A', coral: '#F2553B', apricot: '#FFB054', cream: '#FFE7C2', paper: '#F4FBF8', mint: '#2FBF71' };
  const F = '"Plus Jakarta Sans","Noto Sans",system-ui,sans-serif';
  const clampV = s => Math.max(2.5, Math.min(MAXV, +s || 3));
  /** Kịch bản thuần (test): cảnh + thời lượng (giây). dA/dB = thời lượng bản ghi (giây) hoặc 0 khi không có âm thanh. */
  function script(o) {
    const sc = [{ k: 'intro', d: 1.8 }, { k: 'a', d: clampV(o.dA) + 0.4 }];
    if (o.hasLast) sc.push({ k: 'b', d: clampV(o.dB) + 0.4 }, { k: 'up', d: 3.6 });
    sc.push({ k: 'end', d: o.hasLast ? 2.6 : 3.2 });
    let t = 0; for (const s of sc) { s.t0 = t; t += s.d; s.t1 = t; }
    return { scenes: sc, total: t };
  }
  const pickMime = MR => ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'].find(m => MR && MR.isTypeSupported && MR.isTypeSupported(m)) || '';
  g.VDiaryVideo = Object.assign(g.VDiaryVideo || {}, { script, pickMime, W, H, FPS });
  if (!g.document || !g.HTMLCanvasElement) return;

  const ease = p => 1 - Math.pow(1 - Math.max(0, Math.min(1, p)), 3);
  const reduce = () => g.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function wrap(x, text, maxW) { // ngắt dòng theo từ (chữ không dấu cách – ja/zh/th – ngắt theo ký tự)
    const parts = /\s/.test(text) ? text.split(/(\s+)/) : [...text], lines = []; let cur = '';
    for (const p of parts) { const t = cur + p; if (x.measureText(t.trim()).width > maxW && cur.trim()) { lines.push(cur.trim()); cur = p.trimStart(); } else cur = t; }
    if (cur.trim()) lines.push(cur.trim()); return lines;
  }
  const img = src => new Promise(res => { if (!src) return res(null); const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });

  async function render(o) {
    const T = o.T, MR = g.MediaRecorder, mime = pickMime(MR);
    const cv = document.createElement('canvas'); if (!MR || !cv.captureStream) throw new Error('unsupported');
    cv.width = W; cv.height = H; const x = cv.getContext('2d'); x.direction = (g.I18N && I18N.lang && I18N.lang()) === 'ar' ? 'rtl' : 'ltr';
    const AC = g.AudioContext || g.webkitAudioContext, ac = AC ? new AC() : null, dest = ac && ac.createMediaStreamDestination ? ac.createMediaStreamDestination() : null;
    const dec = async b => { if (!ac || !b) return null; try { return await ac.decodeAudioData(await b.arrayBuffer()); } catch (e) { return null; } };
    const [bA, bB, chr] = await Promise.all([dec(o.first.audio), o.last ? dec(o.last.audio) : null, img(g.Chars ? Chars.still(o.who, o.last ? 'cheer' : 'wave') : '')]);
    const plan = script({ dA: bA ? bA.duration : 0, dB: bB ? bB.duration : 0, hasLast: !!o.last }), an = ac ? ac.createAnalyser() : null;
    if (an) { an.fftSize = 256; an.connect(dest || ac.destination); }
    const wave = new Uint8Array(an ? an.frequencyBinCount : 0);
    const tracks = [...cv.captureStream(FPS).getVideoTracks(), ...(dest ? dest.stream.getAudioTracks() : [])];
    const rec = new MR(new MediaStream(tracks), mime ? { mimeType: mime, videoBitsPerSecond: 2.5e6 } : undefined), chunks = [];
    rec.ondataavailable = e => e.data && e.data.size && chunks.push(e.data);
    const done = new Promise(res => { rec.onstop = () => res(); });
    const tx = (t, y, size, col, wt, maxW) => { x.fillStyle = col; x.font = `${wt || 700} ${size}px ${F}`; x.textAlign = 'center'; const ls = maxW ? wrap(x, t, maxW) : [t]; ls.forEach((l, i) => x.fillText(l, W / 2, y + i * size * 1.25)); return ls.length; };
    const pill = (t, cx, y, bg, fg) => { x.font = `800 34px ${F}`; const w = x.measureText(t).width + 56; x.fillStyle = bg; x.beginPath(); x.roundRect ? x.roundRect(cx - w / 2, y - 44, w, 64, 32) : x.rect(cx - w / 2, y - 44, w, 64); x.fill(); x.fillStyle = fg; x.textAlign = 'center'; x.fillText(t, cx, y); };
    const bg = () => { const gr = x.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, C.teal); gr.addColorStop(1, C.teal2); x.fillStyle = gr; x.fillRect(0, 0, W, H); tx('Lexkite', 96, 40, C.cream, 800); };
    const day = n => (n === 0 ? T('Ngày 1') : T('Ngày thứ {n}', { n }));
    function words(tk, y, p) { // chữ chạy theo tiến độ bản ghi; từ máy nghe sai gạch chân cam
      const ws = (tk.words && tk.words.length ? tk.words : o.sentence.split(/\s+/).map(w => ({ w, ok: true }))), n = Math.ceil(ws.length * Math.min(1, p * 1.15));
      x.font = `700 40px ${F}`; x.textAlign = 'left'; x.direction = 'ltr'; const max = W - 120, sp = x.measureText(' ').width, lines = [[]]; let lw = 0;
      ws.forEach(w => { const ww = x.measureText(w.w).width; if (lw + ww > max && lines[lines.length - 1].length) { lines.push([]); lw = 0; } lines[lines.length - 1].push({ ...w, ww }); lw += ww + sp; });
      let k = 0; lines.forEach((ln, i) => { const tw = ln.reduce((a, w) => a + w.ww + sp, -sp); let cx = (W - tw) / 2; ln.forEach(w => { const on = k++ < n; x.fillStyle = on ? (w.ok ? C.paper : C.apricot) : 'rgba(244,251,248,.28)'; x.fillText(w.w, cx, y + i * 58); if (on && !w.ok) { x.fillStyle = C.coral; x.fillRect(cx, y + i * 58 + 10, w.ww, 5); } cx += w.ww + sp; }); });
      x.direction = (g.I18N && I18N.lang && I18N.lang()) === 'ar' ? 'rtl' : 'ltr';
    }
    function bars(y, live) { // sóng âm thật (AnalyserNode) – không có âm thanh thì sóng tĩnh nhẹ
      if (an && live) an.getByteFrequencyData(wave);
      const n = 28, bw = 14, gap = 8, x0 = (W - n * (bw + gap)) / 2; x.fillStyle = C.apricot;
      for (let i = 0; i < n; i++) { const v = an && live ? wave[(i * 3) % wave.length] / 255 : 0.15 + 0.1 * Math.sin(i); const h = 12 + v * 150; x.fillRect(x0 + i * (bw + gap), y - h / 2, bw, h); }
    }
    function clip(tk, label, p) { bg(); pill(label, W / 2, 250, C.coral, '#fff'); bars(470, true); words(tk, 660, p); tx(`${tk.score}/100 · ${tk.cefr}`, 1010, 64, C.cream, 800); tx(`${T('Lưu loát')} ${tk.fl} · ${T('Phát âm')} ${tk.pr}`, 1080, 32, 'rgba(255,231,194,.8)', 600); }
    function up(p) {
      bg(); const a = o.first.score, b = o.last.score, cur = Math.round(a + (b - a) * ease(p * 1.4));
      tx(`${day(0)} → ${day(o.last.day)}`, 230, 44, 'rgba(255,231,194,.85)', 700);
      tx(`${a} → ${cur}`, 400, 120, C.cream, 800);
      if (b - a > 0) pill('+' + (b - a), W / 2, 520, C.mint, C.teal);
      const pts = [o.first, o.last], X0 = 140, X1 = W - 140, Y0 = 730, Y1 = 600, py = s => Y0 - (Y0 - Y1) * s / 100, q = ease(p * 1.6);
      x.strokeStyle = 'rgba(255,231,194,.25)'; x.lineWidth = 3; x.beginPath(); x.moveTo(X0, Y0); x.lineTo(X1, Y0); x.stroke();
      x.strokeStyle = C.apricot; x.lineWidth = 10; x.lineCap = 'round'; x.beginPath(); x.moveTo(X0, py(pts[0].score)); x.lineTo(X0 + (X1 - X0) * q, py(pts[0].score + (pts[1].score - pts[0].score) * q)); x.stroke();
      x.fillStyle = C.cream; [[X0, pts[0]], [X1, pts[1]]].forEach(([px, tk], i) => { if (i && q < 1) return; x.beginPath(); x.arc(px, py(tk.score), 14, 0, 7); x.fill(); });
      if (chr) { const ch = 430, s = ch / chr.height, w = chr.width * s, k = reduce() ? 1 : ease(p * 2); x.globalAlpha = k; x.drawImage(chr, (W - w) / 2, H - 100 - ch + (1 - k) * 40, w, ch); x.globalAlpha = 1; } // nhân vật dưới biểu đồ (không đè trục), chữ chúc mừng bên dưới
      tx(b >= a ? T('Tiến bộ thật sự!') : T('Mỗi ngày một chút'), H - 40, 40, C.cream, 800);
    }
    function intro(p) { bg(); tx(T('Nhật ký giọng nói'), 420, 64, C.cream, 800, W - 100); tx(o.last ? `${day(0)} → ${day(o.last.day)}` : day(0), 560, 52, C.apricot, 800); x.globalAlpha = ease(p * 2); tx(o.sentence, 740, 38, 'rgba(244,251,248,.85)', 600, W - 120); x.globalAlpha = 1; }
    function end() {
      bg(); if (chr) { const ch = 430, s = ch / chr.height; x.drawImage(chr, (W - chr.width * s) / 2, H - 60 - ch, chr.width * s, ch); } // giáo viên 2D đứng dưới, lời mời + link phía trên
      const y0 = 330; const n = tx(o.last ? T('Bạn thử câu này được không?') : T('Hẹn gặp lại ở ngày 30!'), y0, 52, C.cream, 800, W - 100);
      pill(o.link, W / 2, y0 + n * 66 + 90, C.apricot, C.teal); tx(T('Học ngoại ngữ miễn phí'), y0 + n * 66 + 200, 34, 'rgba(255,231,194,.8)', 600);
    }
    const play = (buf, at) => { if (!buf || !ac) return; const s = ac.createBufferSource(); s.buffer = buf; s.connect(an || dest); s.start(at); };
    // resume() có thể treo khi trình duyệt chưa cho phát âm (hết hiệu lực cú bấm) → chờ tối đa 0,8 s; âm thanh không chạy thì đồng hồ = performance.now (video vẫn xong, chỉ không có tiếng)
    if (ac && ac.state === 'suspended') await Promise.race([ac.resume().catch(() => {}), new Promise(r => setTimeout(r, 800))]);
    const live = !!ac && ac.state === 'running', t0 = (live ? ac.currentTime : 0) + 0.25, sA = plan.scenes.find(s => s.k === 'a'), sB = plan.scenes.find(s => s.k === 'b');
    if (live) { play(bA, t0 + sA.t0 + 0.2); if (sB) play(bB, t0 + sB.t0 + 0.2); }
    rec.start(250);
    const p0 = performance.now() + 250, clock = () => (live ? ac.currentTime - t0 : (performance.now() - p0) / 1000);
    await new Promise(res => {
      const step = () => {
        const t = clock(); if (t >= plan.total) return res();
        const s = plan.scenes.find(z => t >= z.t0 && t < z.t1) || plan.scenes[0], p = (t - s.t0) / s.d;
        if (s.k === 'intro') intro(p); else if (s.k === 'a') clip(o.first, day(o.first.day), p); else if (s.k === 'b') clip(o.last, day(o.last.day), p); else if (s.k === 'up') up(p); else end(p);
        if (o.onProgress) o.onProgress(Math.min(1, t / plan.total));
        setTimeout(step, 1000 / FPS); // hẹn giờ cố định 30 fps, không dùng rAF: rAF đứng hẳn khi khung/tab không hiển thị → video kẹt mãi (đo 22/11 trong khung ẩn)
      };
      step();
    });
    rec.stop(); await done; if (ac) ac.close().catch(() => {});
    const type = (rec.mimeType || mime || 'video/webm').split(';')[0];
    return { blob: new Blob(chunks, { type }), mime: type, seconds: plan.total };
  }
  g.VDiaryVideo.render = render;
})(typeof self !== 'undefined' ? self : globalThis);
