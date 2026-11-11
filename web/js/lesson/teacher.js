/* 👩‍🏫 Ama / Carlos trong bài học: clip phông xanh đã tách nền (H.264 xếp chồng → WebGL), vòng nói/nghe trộn 160 ms trong 1 canvas, hạ cấp → poster;
 * mặt VẼ khớp miệng (cờ lk.lipsync). Tài sản chỉ qua Chars. Chi tiết + cổng: docs/LESSON-ENGINE.md (§Giáo viên, §Khớp miệng mặt VẼ). */
(function (g) {
  const IOS_WA = typeof navigator !== 'undefined' && (/iP(hone|ad|od)/.test(navigator.userAgent || '') || (/Macintosh/.test(navigator.userAgent || '') && navigator.maxTouchPoints > 1));
  const D = g.document;
  const saveData = () => { try { const c = navigator.connection; return !!(c && (c.saveData || /2g/.test(c.effectiveType || ''))); } catch (e) { return false; } };
  const lite = () => { try { return saveData() || g.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
  const VS = 'attribute vec2 p;varying vec2 v;void main(){v=vec2(p.x*.5+.5,.5-p.y*.5);gl_Position=vec4(p,0.,1.);}';
  // u0/u1 = vòng nghe/nói; m = tỉ lệ trộn. Màu đã nhân alpha. 05/11 (vệt đen): highp + không lấy mẫu qua đường nối, tự đo mức đen ở góc đệm (H.264 không gắn
  // dải màu → có máy đọc 16/255 = khung xám-đen), cắt nhiễu nén ≤ 3 %, nhân lại từ màu thẳng – cùng công thức web/js/teacher-live.js (cổng teacher-quality.mjs)
  const FS = 'precision highp float;varying vec2 v;uniform sampler2D u0,u1;uniform float m;uniform vec2 e;' +
    'vec4 px(sampler2D t){vec2 c=vec2(v.x,clamp(v.y*.5,e.y,.5-e.y)),k=e*3.;float a0=texture2D(t,vec2(k.x,.5+k.y)).r,c0=texture2D(t,k).g,s=a0>.03?255./219.:1.;' +
    'float a=clamp((texture2D(t,c+vec2(0.,.5)).r-a0)*s,0.,1.);vec3 q=clamp((texture2D(t,c).rgb-c0)*s,0.,1.);float b=clamp((a-.06)/.94,0.,1.);b*=step(.036,b);return vec4(clamp(q/max(a,.004),0.,1.)*b,b);}' +
    'void main(){gl_FragColor=mix(px(u0),px(u1),m);}';

  // Canvas WebGL ghép alpha; trả null nếu máy không hỗ trợ (→ poster)
  function stage(cv) {
    const gl = cv.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: false }); if (!gl) return null;
    const sh = (t, src) => { const s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s); return s; };
    const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return null;
    gl.useProgram(pr); gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer()); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const tex = [0, 1].map(i => { const t = gl.createTexture(); gl.activeTexture(gl.TEXTURE0 + i); gl.bindTexture(gl.TEXTURE_2D, t);
      for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
      gl.uniform1i(gl.getUniformLocation(pr, 'u' + i), i); return t; });
    const um = gl.getUniformLocation(pr, 'm'), ue = gl.getUniformLocation(pr, 'e'), seen = [-1, -1], sz = ['', ''];
    // Lag 05/11: trước tải CẢ 2 video (khung 554×960) mỗi lần 1 trong 2 đổi giờ, kể cả vòng đang ẩn (m = 0/1) → chỉ tải video đang hiện và chỉ khi có khung mới
    return (v0, v1, m) => {
      let up = 0;
      [v0, v1].forEach((v, i) => { if (!v || v.readyState < 2 || (i ? m <= 0 : m >= 1) || v.currentTime === seen[i] && sz[i]) return; seen[i] = v.currentTime; up++;
        gl.activeTexture(gl.TEXTURE0 + i); gl.bindTexture(gl.TEXTURE_2D, tex[i]); const z = v.videoWidth + 'x' + v.videoHeight;
        if (z !== sz[i]) { sz[i] = z; gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, v); gl.uniform2f(ue, 0.5 / v.videoWidth, 0.5 / v.videoHeight); } else gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, v); });
      gl.viewport(0, 0, cv.width, cv.height); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); gl.uniform1f(um, m); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      return up;
    };
  }

  // cờ: localStorage lk.lipsync = 1/0 · config công khai lipsync (lk.cfg) – MẶC ĐỊNH BẬT (QC CI xanh 2/11); 0/false = công tắc tắt (về vòng clip)
  const lipOn = () => { try { const f = localStorage.getItem('lk.lipsync'); if (f === '1' || f === '0') return f === '1'; const c = JSON.parse(localStorage.getItem('lk.cfg') || 'null'), v = c && c.v && c.v.lipsync; return !(v === false || v === '0' || v === 'false'); } catch (e) { return true; } };
  // nạp lười (chỉ khi cờ bật – khung app không đổi), tuần tự vì face.js đọc LipSync/LipMouth lúc nạp
  let lipP = null;
  // tải SONG SONG, chạy ĐÚNG THỨ TỰ (async=false) – face.js đọc LipSync/LipMouth lúc nạp; nhanh hơn nạp nối tiếp để câu đầu kịp mốc CI (pre)
  const lipLoad = () => lipP || (lipP = Promise.all(['lipsync', 'mouths', 'face', 'paint', 'cues'].map(f => new Promise((ok, no) => { const s = D.createElement('script'); s.async = false; s.src = 'js/call/' + f + '.js'; s.onload = ok; s.onerror = no; D.head.appendChild(s); })))
    .then(() => { if (g.LK_CUES && g.LK_CUES.dict) g.LipSync.setDict(g.LK_CUES.dict); }, e => { lipP = null; throw e; }));
  let uid = 0, actx = null;
  const motionLow = () => { try { return g.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
  // 1 AudioContext dùng chung cho mọi mặt vẽ trên trang (trình duyệt giới hạn số context; nhiều giáo viên trên 1 trang không tranh nhau)
  const audioCtx = () => { if (actx) return actx; try { const A = g.AudioContext || g.webkitAudioContext; if (A) actx = new A(); } catch (e) { actx = null; } return actx; };
  // Lớp mặt vẽ trong rig: MỘT <canvas> (đầu trơn + lớp vector LipFace qua LipPaint, nghiêng/gật quanh cổ) phủ đúng khung poster (contain, căn đáy). onFail → vòng clip.
  // Gốc fps (call-e2e 4b, CPU 4×): vá DOM SVG mỗi khung → tính lại style + MutationObserver của app mỗi khung. Canvas: 0 thay đổi DOM mỗi khung, chỉ vẽ khi trạng thái đổi.
  function face(rig, who, onFail) {
    const LS = g.LipSync, LF = g.LipFace, LM = g.LipMouth, R = LF.RIG[who], id = 'tf' + (++uid), pic = new Image(), hi = Math.min(2, g.devicePixelRatio || 1) * (rig.clientWidth || 200) > 320;
    let dpr = Math.min(2, g.devicePixelRatio || 1); // let: máy yếu hạ về 1 (frame)
    const seed = s => { let h = 7; for (const ch of String(s)) h = (h * 31 + ch.charCodeAt(0)) | 0; return h; };
    const calm = motionLow(); // giảm chuyển động: giữ khớp miệng + chớp mắt (thông tin), bỏ nghiêng/gật/liếc
    const stats = { frames: 0, long: 0, draws: 0, t0: 0, mode: 'idle', emo: '' };
    let idleEmo = '', idle = LF.machine(who, { dur: 120, seed: seed(who), calm }), emoUntil = 0;
    let cv = null, hb = null, ctx = null, box = null, S = null, raf = 0, dead = false, last = '', prev = 0, openK = 0;
    const ac = audioCtx();
    const fit = () => { // canvas = đúng khung poster 1108×960 (CSS bài học/Call đặt canvas y như ảnh poster: contain căn đáy, hay phóng 172 % kiểu bán thân) – chỉ khi đổi cỡ
      const w = Math.max(rig.clientWidth || 200, cv.getBoundingClientRect().width || 0), W = Math.round(Math.min(1108, w * dpr));
      cv.width = W; cv.height = Math.round(W * 960 / 1108); box = [W / 1108, 0, 0]; last = '';
      // lag 05/11: vẽ đầu trơn 1108 px THU NHỎ lại mỗi khung (lấy mẫu lại ~1 M điểm ảnh) → thu nhỏ 1 lần theo cỡ canvas, mỗi khung chỉ chép 1:1
      hb = D.createElement('canvas'); hb.width = cv.width; hb.height = cv.height; const hx = hb.getContext('2d'); if (hx) { hx.imageSmoothingQuality = 'high'; hx.drawImage(pic, 0, 0, hb.width, hb.height); } else hb = null;
    };
    const playing = a => !!(a && !a.paused && !a.ended && a.readyState >= 2);
    const frame = now => {
      if (dead) return;
      const dt = prev ? (now - prev) / 1000 : 1 / 60; prev = now; stats.frames++; if (dt > 0.05) stats.long++;
      // máy yếu (> 15 % khung dài sau 1,5 s): vẽ ở độ phân giải CSS (dpr 1) – ít điểm ảnh hơn tới 4×, miệng vẫn khớp đủ khung
      if (!stats.low && dpr > 1 && stats.frames >= 90 && stats.long > stats.frames * 0.15) { stats.low = 1; dpr = 1; if (cv) fit(); }
      let s, talking = false;
      if (emoUntil && now > emoUntil) { emoUntil = 0; if (idleEmo !== 'listen') setIdle(held ? held[0] : ''); } // phản ứng ngắn đã hết → về tư thế đang giữ / nghỉ thường (câu đang nói giữ biểu cảm tới hết câu)
      stats.mode = S ? (S.L ? 'live' : 'pre') : 'idle';
      if (S) {
        const t = S.clk(now); talking = S.a ? playing(S.a) : (performance.now() - S.t0) / 1000 < S.dur;
        if (S.L) { S.L.tick(t, talking && S.voiced(), Math.min(dt, 0.1)); s = S.M.at(Math.max(0, t - LS.LEAD)); } else s = S.M.at(t);
      } else s = idle.at((now / 1000) % 120);
      // miệng ngậm khi không phát (tạm dừng, hết, chờ tải, tab quay lại sau khi tiếng tắt): trộn về X trong ~80 ms, mở lại ~40 ms – không bao giờ đứng hình giữa âm
      openK = talking ? Math.min(1, openK + dt / 0.04) : Math.max(0, openK - dt / 0.08);
      if (openK < 1) { s.mouth = LM.mix('X', s.mouth, openK); if (openK < 0.5) s.shape = 'X'; s.open *= openK; }
      // chỉ vẽ lại khi trạng thái đổi thấy được (bước 1/100)
      const m = s.mouth, k = [m.w, m.u, m.d, m.a, m.s, m.tt, m.tb, m.tg, m.tu, m.bite, m.lip, s.blink, s.look.x, s.look.y, s.brow, s.knit, s.open, s.tilt / 10, s.nod / 10].map(v => Math.round((v || 0) * 100)).join();
      if (k !== last && ctx) {
        last = k; stats.draws++;
        ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height);
        ctx.setTransform(box[0], 0, 0, box[0], box[1], box[2]);
        if (s.tilt || s.nod) { ctx.translate(R.pivot[0], R.pivot[1]); ctx.rotate(-s.tilt * Math.PI / 180); ctx.translate(-R.pivot[0], -R.pivot[1] - s.nod); }
        ctx.drawImage(hb || pic, 0, 0, 1108, 960);
        for (const p of LF.parts(who, s, id)) if (p) g.LipPaint.draw(ctx, p);
      }
      cur = s; stats.shape = s.shape; stats.open = Math.round(s.open * 100) / 100; stats.blink = Math.round((s.blink || 0) * 100) / 100; raf = requestAnimationFrame(frame); // blink: test mắt mở trên khung ghép (call-e2e)
    };
    let cur = null, held = null; // held = [biểu cảm, tên tư thế] do pose(p) giữ tới pose(null) – như ảnh tư thế, nhưng miệng vẫn khớp khi nói
    const talkEmo = () => (emoUntil && idleEmo && idleEmo !== 'listen' ? idleEmo : held ? held[0] : undefined); // vừa phản ứng xong mà nói luôn → giữ biểu cảm khi nói
    const setIdle = emo => { idleEmo = emo; stats.emo = emo; const ps = held && held[0] === emo ? held[1] : emo; if (ps && ps !== 'listen') rig.dataset.pose = ps; else delete rig.dataset.pose; // QA (final-qc): tư thế của mặt vẽ = biểu cảm đang thể hiện
 idle = LF.machine(who, { dur: 120, seed: seed(who + emo), emo: emo || undefined, calm }); };
    let ro = null;
    pic.onerror = () => { if (!dead) { dead = true; onFail(); } };
    pic.onload = () => {
      if (dead) return;
      cv = D.createElement('canvas'); cv.className = 'tch-face'; cv.setAttribute('aria-hidden', 'true');
      ctx = cv.getContext('2d'); if (!ctx || !g.Path2D) { dead = true; return onFail(); }
      rig.appendChild(cv); rig.dataset.face = who; fit(); stats.t0 = performance.now(); // data-face (không thêm class: giữ khóa bố cục .tch-rig của các cổng QA)
      if (g.ResizeObserver) { ro = new ResizeObserver(() => { if (!dead) fit(); }); ro.observe(rig); ro.observe(cv); }
      raf = requestAnimationFrame(frame);
    };
    if (!D.getElementById('tch-face-css')) D.head.insertAdjacentHTML('beforeend', '<style id="tch-face-css">.tch-rig .tch-face{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;object-position:50% 100%;pointer-events:none}.tch-rig[data-face]>img.tch-poster{visibility:hidden}.tch-rig.posed .tch-face{visibility:hidden}</style>');
    pic.src = Chars.head(who, hi);
    const self = {
      stats,
      cue: key => { const c = g.LK_CUES && g.LK_CUES.k[key]; return c || null; },
      // iOS/iPadOS: KHÔNG nối <audio> vào Web Audio (createMediaElementSource) – Web Audio bị công tắc im lặng tắt tiếng còn <audio> thì không,
      // và nối rồi không gỡ được → phần tử dùng chung (LKAudio.el) im lặng mãi (gốc lỗi 5/11 "Truyện › Xếp thành câu" không tiếng). Khẩu hình theo lúc đang phát.
      tap: () => !IOS_WA && !!(ac && ac.state === 'running'),
      /** src: { audio?, cue?, text, dur? } – audio + cue → pre; còn lại → live (năng lượng tiếng qua AnalyserNode nếu nối được, không thì theo lúc đang phát) */
      speak(src) {
        if (dead) return; self.quiet();
        if (ac && ac.state !== 'running') ac.resume().catch(() => {});
        const a = src.audio, t0 = performance.now(); // đồng hồ hiển thị = tiếng THẬT tới tai (LipSync.clock: nội suy currentTime, − trễ loa, + 1 khung) – lệch ≤ ±33 ms (lip-clock.mjs)
        const clk = a && LS.clock ? LS.clock(() => ({ t: a.currentTime, playing: playing(a), rate: a.playbackRate }), () => (ac ? ac.outputLatency || ac.baseLatency || 0 : 0)) : a ? () => a.currentTime : () => (performance.now() - t0) / 1000;
        let an = null, buf = null, node = null; const vd = LS.vad();
        const live = () => {
          if (!node && a && a.crossOrigin && self.tap()) { try { node = ac.createMediaElementSource(a); a._lkWA = 1; an = ac.createAnalyser(); an.fftSize = 1024; node.connect(an); an.connect(ac.destination); buf = new Float32Array(an.fftSize); } catch (e) { an = null; } }
          const est = src.dur || Math.max(0.6, String(src.text || '').length * 0.065), L = LS.live(src.text || '', { dur: a && isFinite(a.duration) ? a.duration : est });
          S = { clk, L, node, a, t0, dur: est, M: LF.machine(who, { cues: L.cues, dur: Math.max(30, est), seed: seed(src.text), text: src.text, emo: talkEmo(), calm }),
            voiced: () => { if (a && !playing(a)) return false; if (!an) return true; an.getFloatTimeDomainData(buf); let e = 0; for (const x of buf) e += x * x; return vd(Math.sqrt(e / buf.length)); } };
          // chưa biết độ dài tiếng lúc bắt đầu → dựng lại con trỏ theo độ dài thật khi có (trước khi phát)
          if (a && !isFinite(a.duration)) a.addEventListener('loadedmetadata', () => { if (S && S.L === L && a.currentTime < 0.05) live(); }, { once: true });
          if (a && !refined) refine();
        };
        // câu có file tiếng nhưng chưa có mốc CI (bài học: mọi câu đọc từ kho mp3) → giải mã đúng file đang phát, căn âm vị theo độ lớn tiếng thật (LS.fromEnv)
        // rồi chuyển sang chế độ mốc (môi mím M/B/P, tròn O/U đúng lúc); trong lúc chờ (vài chục ms) con trỏ live chạy; lỗi CORS/giải mã → giữ live
        let refined = false;
        const refine = () => { const url = a.currentSrc || a.src; if (!url || !ac || !g.fetch || !LS.fromEnv) return; refined = true;
          g.fetch(url).then(r => (r.ok ? r.arrayBuffer() : Promise.reject(r.status))).then(b => new Promise((ok, no) => { const p = ac.decodeAudioData(b, ok, no); if (p && p.catch) p.catch(no); }))
            .then(buf => { if (dead || !S || !S.L || S.a !== a || (isFinite(a.duration) && Math.abs(a.duration - buf.duration) > 0.12)) return;
              const env = LS.envOf(buf), dur = buf.duration, cues = LS.fromEnv(src.text || '', dur, env);
              S = { clk, a, t0, dur, node: S.node, M: LF.machine(who, { cues, env, dur, seed: seed(src.text), text: src.text, emo: talkEmo(), calm }) }; stats.fit = (stats.fit || 0) + 1; })
            .catch(() => {}); };
        if (a && src.cue) {
          const { dur, cues: q, env } = LS.unpack(src.cue); // mốc + độ lớn tiếng nén (call_cues.mjs)
          S = { clk, a, t0, dur, M: LF.machine(who, { cues: q, env, dur, seed: seed(src.text), text: src.text, emo: talkEmo(), calm }) };
          // mp3 đệm cũ / sai bản → độ dài lệch mốc > 120 ms thì chuyển live (không bao giờ khớp sai)
          a.addEventListener('loadedmetadata', () => { if (S && S.clk === clk && isFinite(a.duration) && Math.abs(a.duration - dur) > 0.12) live(); }, { once: true });
        } else live();
      },
      quiet() { if (S && S.node) try { S.node.disconnect(); } catch (e) { /* bỏ qua */ } S = null; },
      /** listen(true): người học đang nói → mắt nhìn người học, mày hơi nhướng, gật nhẹ theo nhịp (máy nghỉ 'listen'); false → nghỉ thường */
      listen(on) { if (dead) return; if (on) self.quiet(); emoUntil = 0; setIdle(on ? 'listen' : held ? held[0] : ''); },
      hold(emo, name) { if (dead) return; held = emo && LF.EMO[emo] ? [emo, name || emo] : null; emoUntil = 0; setIdle(held ? emo : ''); },
      /** react('happy'|'encourage'|'cheer'|'concern'|'thinking', ms): biểu cảm ngắn trên mặt vẽ (đúng/sai) – câu nói kế tiếp mang theo biểu cảm đó */
      react(emo, ms = 1800) { if (dead || !LF.EMO[emo]) return; setIdle(emo); emoUntil = performance.now() + ms; },
      state: () => cur,
      destroy() { dead = true; self.quiet(); cancelAnimationFrame(raf); if (ro) ro.disconnect(); if (cv) cv.remove(); delete rig.dataset.face; }
    };
    return self;
  }

  // mặt vẽ + mốc (cues.js ~109 KB) nạp lười khi MOUNT giáo viên (Call, bài học, Truyện) – KHÔNG nạp lúc teacher.js vào gói ux1 (Home/Today không tải thêm, call-e2e 4b kiểm)
  /** mount(el, who, { lip }) → { say(text, { rate, voice, onEnd }), stop(), destroy(), who } · lip: cho phép mặt vẽ khớp miệng (Call, sau cờ lk.lipsync) */
  function mount(el, who, mo = {}) {
    who = Chars.id(who); // nhân vật + tài sản: chỉ qua Chars (web/js/characters.js, nguồn web/teach/characters.json)
    el.classList.add('tch'); el.innerHTML = `<div class="tch-rig">${Chars.img(who, { cls: 'tch-poster', kind: 'poster', size: 384 })}</div>`;
    const rig = el.firstChild;
    rig.firstChild.onerror = () => { el.style.display = 'none'; }; // thiếu tài sản (vd. bản add-on không kèm teach/) → ẩn giáo viên, bài vẫn chạy
    let lastTxt = '', run = 0, dead = false, want = 0, mix = 0, draw = null, raf = 0, last = 0, lastK = '', fc = null, gate = null;
    const V = [];
    const clips = () => {
      if (dead || lite()) return; // tiết kiệm dữ liệu / giảm chuyển động → poster tĩnh (vòng clip là chuyển động trang trí)
      const cv = D.createElement('canvas'); cv.width = 384; cv.height = 480; cv.className = 'tch-cv'; cv.setAttribute('aria-hidden', 'true');
      try { draw = stage(cv); } catch (e) { draw = null; }
      if (draw) {
        ['listen', 'talk'].forEach((k, i) => {
          const v = V[i] = D.createElement('video');
          Object.assign(v, { muted: true, loop: true, playsInline: true, preload: i ? 'metadata' : 'auto', crossOrigin: 'anonymous' }); v.setAttribute('playsinline', '');
          v.onerror = () => { if (!i) { draw = null; cv.remove(); rig.classList.remove('live'); } else V[1] = null; };
          v.src = Chars.clip(who, k);
        });
        V[0].oncanplay = () => { V[0].oncanplay = null; if (dead || !draw) return; cv.width = V[0].videoWidth || 384; cv.height = (V[0].videoHeight || 960) / 2; // khung theo dáng từng người (Carlos rộng hơn) – CSS contain + căn đáy
          V[0].play().catch(() => {}); rig.appendChild(cv); rig.classList.add('live'); tick(); };
      }
    };
    // mặt vẽ (cả khi giảm chuyển động: miệng + chớp mắt vẫn chạy, bỏ nghiêng/gật/liếc – face() calm); tiết kiệm dữ liệu → poster. Lỗi nạp/thiếu tài sản → vòng clip.
    // Câu nói trong lúc đang nạp chờ tối đa 2 s (để câu đầu cũng có mốc CI, đúng bản -ls.mp3)
    if (mo.lip !== false && lipOn() && !saveData()) {
      gate = lipLoad().then(() => { if (dead) return; fc = face(rig, who, () => { fc = null; clips(); }); if (hq && hq.el && !hq.el.paused) fc.speak({ audio: hq.el, text: lastTxt }); }, clips).then(() => { gate = null; });
    } else clips();
    // 1 vòng vẽ: chỉ chạy khi đang hiện (IntersectionObserver không cần – rAF tự dừng ở tab ẩn); trộn nói/nghe 160 ms
    function tick(now = performance.now()) {
      if (dead || !draw) return;
      const dt = last ? Math.min(64, now - last) : 16; last = now;
      mix += Math.sign(want - mix) * Math.min(Math.abs(want - mix), dt / 160);
      const k = `${V[0].currentTime}|${V[1] ? V[1].currentTime : 0}|${mix}`; if (k !== lastK) { lastK = k; draw(V[0], V[1] || V[0], V[1] ? mix : 0); } // chỉ vẽ khi có khung mới (24 fps, không 60)
      if (mix === 0 && V[1] && !V[1].paused) V[1].pause(); if (mix === 1 && !V[0].paused) V[0].pause(); // vòng đã ẩn hẳn thì dừng (pin)
      raf = requestAnimationFrame(tick);
    }
    function talking(on) {
      if (dead) return; el.classList.toggle('speaking', on); want = on && V[1] ? 1 : 0;
      const v = V[want]; if (v && v.paused) v.play().catch(() => {});
    }
    let hq = null;
    let capNow = null;
    const api = {
      who,
      lip: () => (fc ? fc.stats : null), // số khung mặt vẽ (test e2e đo fps)
      // pose('cheer'|'concern'…): ảnh tĩnh tư thế (đầu→hông) thay người đang đứng NGAY chỗ cũ (phản hồi đúng/sai); pose(null) → trả lại vòng nghe/nói sống
      // mặt vẽ: tư thế ảnh tĩnh (tài sản có sẵn) + biểu cảm tương ứng trên mặt vẽ; nói trong lúc đang tư thế → bỏ ảnh tĩnh để miệng vẽ khớp tiếng (không nói bằng ảnh tĩnh ngậm miệng)
      listen(on) { if (fc) fc.listen(on); },
      react(emo, ms) { if (fc) fc.react(emo, ms); },
      pose(p) { let im = rig.querySelector('.tch-still'); if (fc) fc.hold(p ? g.Chars.POSE_EMO[p] || p : null, p); if (!p) { if (im) im.remove(); rig.classList.remove('posed'); return; }
        if (im) im.src = Chars.still(who, p); else { rig.insertAdjacentHTML('beforeend', Chars.img(who, { kind: 'still', pose: p, cls: 'tch-still', alt: '', size: 384 })); }
        rig.classList.add('posed'); },
      // o.voice (Kokoro, vd. af_heart): phát mp3 sinh sẵn trên CI (audio.lexkite.com, khóa KVoice.lineKey) – vòng nói chạy đúng độ dài file; thiếu file → giọng máy
      say(text, o = {}) {
        lastTxt = text; // mặt vẽ đang nạp (gate): nói NGAY (không trễ câu đầu); nạp xong → mặt vẽ bám phần tử đang phát (live)
        if (fc && rig.classList.contains('posed')) { const im = rig.querySelector('.tch-still'); if (im) im.remove(); rig.classList.remove('posed'); } // nói: bỏ ảnh tĩnh, mặt vẽ giữ biểu cảm tư thế (fc.hold) tới pose(null)
        const my = ++run, rate = o.rate || 0.95;
        if (capNow && capNow !== o.caption) capNow.all(); const cap = capNow = o.caption || null; // chữ chạy theo lời (SayText, say-text.js)
        let ended = false; const end = () => { if (ended) return; ended = true; if (cap) cap.all(); if (my === run) { run++; talking(false); if (fc) fc.quiet(); } if (o.onEnd) o.onEnd(); };
        talking(true);
        const tts = () => {
          if (my !== run) return;
          const dur = o.dur || Math.max(0.6, String(text || '').length * 0.065 / rate);
          if (cap) cap.clock(dur * 1000); if (fc) fc.speak({ text, dur }); // giọng máy: không có tiếng để đo → con trỏ live theo thời lượng ước tính
          const kv = g.LKAudio && g.LKAudio.kokoro(o.voice); // giọng máy dự phòng đúng người nói: Ama nữ, Carlos nam, đúng UK/US
          if (g.UI && g.UI.tts) { const t0 = Date.now(); g.UI.tts(text, o.accent || (kv && kv.accent) || 'en-US', rate, { voice: o.voice, onEnd: () => { const used = Date.now() - t0; if (used < 300 && my === run) setTimeout(end, Math.max(0, dur * 1000 - used)); else end(); } }); } else setTimeout(end, dur * 1000); // máy không có giọng → onEnd tức thì: giữ vòng nói đủ thời lượng ước tính (khớp miệng theo ước tính)
        };
        if (hq) { hq.stop(); hq = null; }
        // mặt vẽ: câu có mốc CI → bản <khóa>-ls.mp3 sinh CÙNG lần với mốc (không nằm trong LISTEN_AUDIO); lỗi tải bản đó → mp3 thường + live
        const key = o.voice && g.KVoice ? g.KVoice.lineKey(o.voice, text) : '', cue = fc && key && !o.plain ? fc.cue(key) : null;
        // không có file cả câu (chỉ mục LISTEN_AUDIO) → UI.tts: thử file từng câu cùng giọng rồi mới tới giọng máy (không tải 404 qua mọi gốc CDN)
        if (!key || !g.audioUrls || !g.LKAudio || (!cue && g.LISTEN_AUDIO && !g.LISTEN_AUDIO.has(key))) return tts();
        // LKAudio: thử lần lượt các gốc CDN (lỗi/404/quá giờ → gốc kế tiếp), hết gốc → giọng máy (ghi nhật ký dự phòng)
        let h = null; // onEl chạy ĐỒNG BỘ trong play() trước khi gán h (phần tử gốc CDN đầu) → không đọc h ở TDZ
        h = hq = g.LKAudio.play(cue ? g.audioUrls(key + '-ls') : g.audioUrls(key), { rate: rate < 0.9 ? 0.75 : 1, // 🐢 nghe chậm
          cross: !!(fc && !cue && fc.tap()), // live đo năng lượng tiếng (Web Audio cần CORS – gốc audio trả ACAO *)
          onEl: a => { if (h !== null && hq !== h) return; if (fc) fc.speak({ audio: a, cue, text }); if (cap) cap.audio(a, cue && g.LipSync ? g.LipSync.unpack(cue) : null); }, // mỗi gốc CDN thử = 1 phần tử mới → mặt vẽ bám đúng phần tử đang phát
          onBase: () => g.audioFail && g.audioFail(), onEnd: end,
          onFail: why => { if (hq !== h) return; hq = null; if (cue) return api.say(text, Object.assign({}, o, { plain: 1 })); g.LKAudio.note('tts', why + ' ' + o.voice); tts(); } });
      },
      stop() { if (capNow) capNow.all(); run++; talking(false); if (fc) fc.quiet(); if (hq) { hq.stop(); hq = null; } try { if (g.UI && g.UI.stopSpeak) g.UI.stopSpeak(); } catch (e) { /* bỏ qua */ } },
      destroy() { if (capNow) capNow.all(); dead = true; run++; if (fc) fc.destroy(); if (hq) { hq.stop(); hq = null; } cancelAnimationFrame(raf); for (const v of V) { if (v) try { v.pause(); v.removeAttribute('src'); v.load(); } catch (e) { /* bỏ qua */ } } el.innerHTML = ''; },
    };
    return api;
  }
  const VOICE = { ama: g.Chars.voice('ama'), carlos: g.Chars.voice('carlos') }; // giọng app của giáo viên – chỉ qua Chars (registry), cùng giọng scripts/gen-audio.mjs sinh cho truyện/radio
  /** prep(): nạp trước mặt vẽ + mốc ở màn ngay TRƯỚC khi giáo viên nói (đổ chuông Call, vào bài học) – Home/Today không gọi */
  const prep = () => { try { if (lipOn() && !saveData()) lipLoad().catch(() => {}); } catch (e) { /* bỏ qua */ } };
  g.LessonTeacher = { mount, lite, VOICE, prep };
})(self);
