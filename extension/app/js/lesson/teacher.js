/* 👩‍🏫 Ama / Carlos đọc lời nhắc trong bài học – clip PHÔNG XANH đã tách nền PRO (scripts/teach/build.py, CI teach-build.yml), nền trong suốt, đủ đầu.
 * Đang nói → vòng "talk" (miệng thật của clip, khớp nhịp), im/nghe → vòng "listen"; trộn 160 ms trong CÙNG 1 canvas (không 2 lớp chồng nhau).
 * Video H.264 "xếp chồng" (nửa trên màu đã nhân alpha, nửa dưới alpha) → WebGL ghép thành nền trong suốt: mọi trình duyệt, giải mã phần cứng.
 * Hạ cấp: saveData / giảm chuyển động / không WebGL / thiếu tài sản → poster.webp (alpha) tĩnh. Tài sản: chỉ qua Chars (poster, clip talk/listen, đầu trơn).
 * 🙂 Mặt VẼ khớp miệng (cờ lk.lipsync, chỉ Call: mount(el, who, { lip: true }), docs/LESSON-ENGINE.md §Khớp miệng): đầu trơn + mắt/mi/mày/ria/miệng vector (LipFace) vẽ lại mỗi khung theo
 * audio.currentTime. Có mốc CI (web/js/call/cues.js + <khóa>-ls.mp3) → "pre"; không có → LipSync.live() theo năng lượng tiếng. Thiếu gì → vòng clip như cũ → poster. */
(function (g) {
  const D = g.document;
  const saveData = () => { try { const c = navigator.connection; return !!(c && (c.saveData || /2g/.test(c.effectiveType || ''))); } catch (e) { return false; } };
  const lite = () => { try { return saveData() || g.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
  const VS = 'attribute vec2 p;varying vec2 v;void main(){v=vec2(p.x*.5+.5,.5-p.y*.5);gl_Position=vec4(p,0.,1.);}';
  // u0/u1 = vòng nghe/nói; m = tỉ lệ trộn. Màu đã nhân alpha → xuất thẳng (premultipliedAlpha)
  const FS = 'precision mediump float;varying vec2 v;uniform sampler2D u0,u1;uniform float m;vec4 px(sampler2D t){vec2 c=vec2(v.x,v.y*.5);return vec4(texture2D(t,c).rgb,texture2D(t,c+vec2(0.,.5)).r);}void main(){vec4 a=px(u0),b=px(u1);vec4 o=mix(a,b,m);gl_FragColor=vec4(min(o.rgb,vec3(o.a)),o.a);}';

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
    const um = gl.getUniformLocation(pr, 'm');
    return (v0, v1, m) => {
      [v0, v1].forEach((v, i) => { if (v && v.readyState >= 2) { gl.activeTexture(gl.TEXTURE0 + i); gl.bindTexture(gl.TEXTURE_2D, tex[i]); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, v); } });
      gl.viewport(0, 0, cv.width, cv.height); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); gl.uniform1f(um, m); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };
  }

  // cờ: localStorage lk.lipsync = 1/0 · config công khai lipsync (lk.cfg) – MẶC ĐỊNH BẬT (QC CI xanh 2/11); 0/false = công tắc tắt (về vòng clip)
  const lipOn = () => { try { const f = localStorage.getItem('lk.lipsync'); if (f === '1' || f === '0') return f === '1'; const c = JSON.parse(localStorage.getItem('lk.cfg') || 'null'), v = c && c.v && c.v.lipsync; return !(v === false || v === '0' || v === 'false'); } catch (e) { return true; } };
  // nạp lười (chỉ khi cờ bật – khung app không đổi), tuần tự vì face.js đọc LipSync/LipMouth lúc nạp
  let lipP = null;
  // tải SONG SONG, chạy ĐÚNG THỨ TỰ (async=false) – face.js đọc LipSync/LipMouth lúc nạp; nhanh hơn nạp nối tiếp để câu đầu kịp mốc CI (pre)
  const lipLoad = () => lipP || (lipP = Promise.all(['lipsync', 'mouths', 'face', 'paint', 'cues'].map(f => new Promise((ok, no) => { const s = D.createElement('script'); s.async = false; s.src = 'js/call/' + f + '.js'; s.onload = ok; s.onerror = no; D.head.appendChild(s); })))
    .then(() => { if (g.LK_CUES && g.LK_CUES.dict) g.LipSync.setDict(g.LK_CUES.dict); }, e => { lipP = null; throw e; }));
  const POSE_EMO = { cheer: 'cheer', concern: 'concern', happy: 'happy', laugh: 'happy', encourage: 'encourage', empathy: 'concern', thinking: 'thinking', surprise: 'cheer', explain: 'explain', wave: 'happy', point: 'explain' }; // tư thế ảnh tĩnh → biểu cảm mặt vẽ (face.js EMO)
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
    let cv = null, ctx = null, box = null, S = null, raf = 0, dead = false, last = '', prev = 0, openK = 0;
    const ac = audioCtx();
    const fit = () => { // canvas = đúng khung poster 1108×960 (CSS bài học/Call đặt canvas y như ảnh poster: contain căn đáy, hay phóng 172 % kiểu bán thân) – chỉ khi đổi cỡ
      const w = Math.max(rig.clientWidth || 200, cv.getBoundingClientRect().width || 0), W = Math.round(Math.min(1108, w * dpr));
      cv.width = W; cv.height = Math.round(W * 960 / 1108); box = [W / 1108, 0, 0]; last = '';
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
        const t = S.clk(); talking = S.a ? playing(S.a) : (performance.now() - S.t0) / 1000 < S.dur;
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
        ctx.drawImage(pic, 0, 0, 1108, 960);
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
      tap: () => !!(ac && ac.state === 'running'),
      /** src: { audio?, cue?, text, dur? } – audio + cue → pre; còn lại → live (năng lượng tiếng qua AnalyserNode nếu nối được, không thì theo lúc đang phát) */
      speak(src) {
        if (dead) return; self.quiet();
        if (ac && ac.state !== 'running') ac.resume().catch(() => {});
        const a = src.audio, t0 = performance.now(), clk = a ? () => a.currentTime : () => (performance.now() - t0) / 1000;
        let an = null, buf = null, node = null; const vd = LS.vad();
        const live = () => {
          if (!node && a && a.crossOrigin && self.tap()) { try { node = ac.createMediaElementSource(a); an = ac.createAnalyser(); an.fftSize = 1024; node.connect(an); an.connect(ac.destination); buf = new Float32Array(an.fftSize); } catch (e) { an = null; } }
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
    const api = {
      who,
      lip: () => (fc ? fc.stats : null), // số khung mặt vẽ (test e2e đo fps)
      // pose('cheer'|'concern'…): ảnh tĩnh tư thế (đầu→hông) thay người đang đứng NGAY chỗ cũ (phản hồi đúng/sai); pose(null) → trả lại vòng nghe/nói sống
      // mặt vẽ: tư thế ảnh tĩnh (tài sản có sẵn) + biểu cảm tương ứng trên mặt vẽ; nói trong lúc đang tư thế → bỏ ảnh tĩnh để miệng vẽ khớp tiếng (không nói bằng ảnh tĩnh ngậm miệng)
      listen(on) { if (fc) fc.listen(on); },
      react(emo, ms) { if (fc) fc.react(emo, ms); },
      pose(p) { let im = rig.querySelector('.tch-still'); if (fc) fc.hold(p ? POSE_EMO[p] || p : null, p); if (!p) { if (im) im.remove(); rig.classList.remove('posed'); return; }
        if (im) im.src = Chars.still(who, p); else { rig.insertAdjacentHTML('beforeend', Chars.img(who, { kind: 'still', pose: p, cls: 'tch-still', alt: '', size: 384 })); }
        rig.classList.add('posed'); },
      // o.voice (Kokoro, vd. af_heart): phát mp3 sinh sẵn trên CI (audio.lexkite.com, khóa KVoice.lineKey) – vòng nói chạy đúng độ dài file; thiếu file → giọng máy
      say(text, o = {}) {
        lastTxt = text; // mặt vẽ đang nạp (gate): nói NGAY (không trễ câu đầu); nạp xong → mặt vẽ bám phần tử đang phát (live)
        if (fc && rig.classList.contains('posed')) { const im = rig.querySelector('.tch-still'); if (im) im.remove(); rig.classList.remove('posed'); } // nói: bỏ ảnh tĩnh, mặt vẽ giữ biểu cảm tư thế (fc.hold) tới pose(null)
        const my = ++run, rate = o.rate || 0.95;
        const est = o.dur || Math.max(0.6, String(text || '').length * 0.065 / rate);
        // ⏱️ tiến độ lời (karaoke + vòng nút nghe lại): đồng hồ = currentTime của file Kokoro; giọng máy → đồng hồ tường theo thời lượng ước tính. 1 rAF, chỉ gọi khi đổi ≥0.5%
        let ended = false, t0 = 0, pf = -1, praf = 0;
        const prog = () => { if (ended || my !== run) return; const a = hq && hq.el, d = a && a.duration;
          const f = Math.min(1, d && isFinite(d) && d > 0 ? Math.max(0, a.currentTime - LEAD) / Math.max(0.2, d - 2 * LEAD) : t0 ? (performance.now() - t0) / (est * 1000) : 0);
          if (Math.abs(f - pf) >= 0.005) { pf = f; try { o.onTick(f); } catch (e) { /* bỏ qua */ } } praf = requestAnimationFrame(prog); };
        const go = () => { if (!t0 && o.onTick) { t0 = performance.now(); prog(); } };
        const end = () => { if (ended) return; ended = true; cancelAnimationFrame(praf); if (o.onTick) try { o.onTick(1); } catch (e) { /* bỏ qua */ } if (my === run) { run++; talking(false); if (fc) fc.quiet(); } if (o.onEnd) o.onEnd(); };
        talking(true);
        const tts = () => {
          if (my !== run) return;
          const dur = est; go();
          if (fc) fc.speak({ text, dur }); // giọng máy: không có tiếng để đo → con trỏ live theo thời lượng ước tính
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
        h = hq = g.LKAudio.play(cue ? g.audioUrls(key + '-ls') : g.audioUrls(key), { rate: rate < 0.9 ? SLOW : 1, // 🐢 nghe chậm 0,75× (giữ cao độ)
          cross: !!(fc && !cue && fc.tap()), // live đo năng lượng tiếng (Web Audio cần CORS – gốc audio trả ACAO *)
          onEl: a => { if (fc && (h === null || hq === h)) fc.speak({ audio: a, cue, text }); }, // mỗi gốc CDN thử = 1 phần tử mới → mặt vẽ bám đúng phần tử đang phát
          onBase: () => g.audioFail && g.audioFail(), onEnd: end, onStart: go, // onStart → đồng hồ karaoke bám currentTime file đang phát
          onFail: why => { if (hq !== h) return; hq = null; if (cue) return api.say(text, Object.assign({}, o, { plain: 1 })); g.LKAudio.note('tts', why + ' ' + o.voice); tts(); } });
      },
      stop() { run++; talking(false); if (fc) fc.quiet(); if (hq) { hq.stop(); hq = null; } try { if (g.UI && g.UI.stopSpeak) g.UI.stopSpeak(); } catch (e) { /* bỏ qua */ } },
      destroy() { dead = true; run++; if (fc) fc.destroy(); if (hq) { hq.stop(); hq = null; } cancelAnimationFrame(raf); for (const v of V) { if (v) try { v.pause(); v.removeAttribute('src'); v.load(); } catch (e) { /* bỏ qua */ } } el.innerHTML = ''; },
    };
    return api;
  }
  // 💬 Bong bóng lời giáo viên (khung Stitch lesson-question, docs/DESIGN-SYSTEM.md §5d) – chuẩn Duolingo/Speak/ELSA, không chữ bay từ miệng:
  // đuôi neo vào miệng người đang nói (đo bbox thật mỗi lần đổi cỡ – đúng mọi cỡ, sáng/tối, RTL), hiện nhẹ 0.92→1 + mờ 160 ms (giảm chuyển động → tắt),
  // chữ sáng dần theo giọng (karaoke; chỉ đổi màu/opacity – không layout), chạm từ → nghe lại đúng từ + nghĩa (Dict), phụ đề bật/tắt để luyện nghe thuần (lk.cc).
  const LEAD = 0.12, SLOW = 0.75, CC = 'lk.cc'; // giây im đầu/cuối file Kokoro · tốc độ 🐢 · khóa phụ đề
  const MOUTH = 0.5; // khung clip/poster căn giữa người (characters.json frame) → miệng ở giữa bề ngang hình đang vẽ
  const DK = s => `@media (prefers-color-scheme: dark){:root:not([data-theme=light]) ${s}}:root[data-theme=dark] ${s}`;
  const CSS = '.tchb{position:relative}.tchb-tail{position:absolute;top:0;left:0;width:18px;height:18px;margin-top:-10px;background:inherit;border-style:solid;border-color:inherit;border-width:inherit;border-right:0;border-bottom:0;border-radius:4px 0 0 0;transform:translateX(var(--tx,0px)) rotate(45deg);pointer-events:none;z-index:1}' +
    '.tchb-pop{transform-origin:var(--tx,50%) 0;animation:tchb-in .16s cubic-bezier(.2,.8,.2,1)}@keyframes tchb-in{from{opacity:0;transform:scale(.92)}to{opacity:1;transform:none}}' +
    '.kwp{--kw0:#4E5F62;--kwb:#DCE3E1}' + DK('.kwp{--kw0:#A9BFC1;--kwb:#2A434C}') +
    '.kwp .kw{display:inline-block;min-width:24px;min-height:24px;text-align:center;color:var(--kw0);transition:color .12s linear;border-radius:4px;cursor:pointer;-webkit-tap-highlight-color:transparent}.kwp .kw.on{color:inherit}.kwp .kw:focus-visible{outline:2px solid #2BA39A;outline-offset:1px}' +
    '.kwp.kw-off .kw{color:transparent;background:var(--kwb)}.kwp.kw-off .kw.on{color:transparent}' +
    '.tchb-cc{position:absolute;top:1.2rem;right:3.9rem;z-index:20;min-width:2.25rem;height:1.75rem;padding:0 .4rem;border-radius:9999px;font:800 11px/1 system-ui,sans-serif;letter-spacing:.04em;border:1.5px solid currentColor;background:transparent;color:#0D6964}.tchb-cc[aria-pressed=false]{opacity:1;color:#4E5F62;text-decoration:line-through}' + DK('.tchb-cc{color:#2BA39A}') + DK('.tchb-cc[aria-pressed=false]{color:#A9BFC1}') +
    '.tchb-ring{--p:0;background:conic-gradient(currentColor calc(var(--p)*1turn),transparent 0);-webkit-mask:radial-gradient(farthest-side,transparent calc(100% - 3px),#000 calc(100% - 2.5px));mask:radial-gradient(farthest-side,transparent calc(100% - 3px),#000 calc(100% - 2.5px));position:absolute;inset:-4px;border-radius:9999px;pointer-events:none;opacity:0;transition:opacity .16s}.tchb-play .tchb-ring{opacity:1}' +
    '.tchb-peek{position:absolute;z-index:30;max-width:min(18rem,calc(100% - 1rem));padding:.55rem .75rem;border-radius:14px;font-size:14px;line-height:1.35;text-align:start;background:#10191B;color:#EEF6F7;box-shadow:0 6px 18px rgba(0,0,0,.25)}' + DK('.tchb-peek{background:#EEF6F7;color:#10191B}') +
    '@media (prefers-reduced-motion:reduce){.tchb-pop{animation:none}.kwp .kw,.tchb-ring{transition:none}}';
  const css = () => { if (D.getElementById('tchb-css')) return; const st = D.createElement('style'); st.id = 'tchb-css'; st.textContent = CSS; D.head.appendChild(st); };
  const ccOn = () => { try { return g.localStorage.getItem(CC) !== '0'; } catch (e) { return true; } };

  // Trọng số thời gian từng từ ≈ số âm tiết + nghỉ ở dấu câu (Kokoro chưa xuất mốc thời gian từng từ → ước lượng, co giãn theo độ dài file thật)
  const SYL = w => { const s = String(w).toLowerCase().replace(/[^a-z]/g, ''); if (!s) return /\d/.test(w) ? 2 : 1; return Math.max(1, (s.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').replace(/^y/, '').match(/[aeiouy]{1,2}/g) || []).length); };
  // ≈ giây: chữ cái (âm vị) + âm tiết + nhịp nối từ + nghỉ dấu câu – hệ số đo trên giọng Kokoro af_heart/am_michael ~150 wpm
  const weights = words => words.map(w => 0.048 * String(w).replace(/[^A-Za-z0-9]/g, '').length + 0.04 * SYL(w) + 0.07 + (/[,;:—–]$/.test(w) ? 0.22 : /[.!?…]["”’)]*$/.test(w) ? 0.3 : 0));
  /** wordAt(weights, f) → chỉ số từ đang đọc ở tiến độ f (0..1); -1 = chưa bắt đầu */
  function wordAt(ws, f) { if (!(f > 0)) return -1; const tot = ws.reduce((a, b) => a + b, 0); let acc = 0; for (let i = 0; i < ws.length; i++) { acc += ws[i]; if (f * tot < acc) return i; } return ws.length - 1; }

  /** kara(el, spoken, { onWord(word, span) }) → { at(f), cc(on) } · bọc từ của el (text, giữ thẻ con như chỗ trống .lsn-gap = n từ qua data-kn) */
  function kara(el, spoken, o = {}) {
    css(); if (!el) return null;
    const said = String(spoken || '').trim().split(/\s+/).filter(Boolean), ws = weights(said), units = []; // units[i] = span ứng với từ nói thứ i
    const walk = n => { for (const c of [...n.childNodes]) {
      if (c.nodeType === 3) { const parts = c.textContent.split(/(\s+)/), f = D.createDocumentFragment();
        for (const p of parts) { if (!p) continue; if (/^\s+$/.test(p)) { f.appendChild(D.createTextNode(p)); continue; } const s = D.createElement('span'); s.className = 'kw'; s.textContent = p; s.tabIndex = 0; s.setAttribute('role', 'button'); units.push(s); f.appendChild(s); }
        c.replaceWith(f); }
      else if (c.nodeType === 1) { const kn = +c.dataset.kn || (c.classList.contains('lsn-gap') ? 1 : 0); if (kn) { for (let k = 0; k < kn; k++) units.push(c); } else walk(c); } } };
    walk(el); el.classList.add('kwp');
    let cur = -2;
    const api = {
      words: units, at(f) { const i = f >= 1 ? units.length : wordAt(ws.length === units.length ? ws : units.map(() => 1), f); if (i === cur) return; cur = i;
        units.forEach((s, k) => s.classList && s.classList.toggle('on', k <= i)); },
      // part(k0, n, f): lời nói theo từng câu (cuộc gọi: mỗi câu 1 file) → tiến độ f của câu gồm từ k0..k0+n-1
      part(k0, n, f) { const i = f >= 1 ? k0 + n - 1 : f > 0 ? k0 + Math.max(0, wordAt(ws.slice(k0, k0 + n), f)) : k0 - 1; if (i === cur) return; cur = i; units.forEach((s, k) => s.classList && s.classList.toggle('on', k <= i)); },
      cc(on) { el.classList.toggle('kw-off', !on); },
    };
    api.cc(o.cc === false ? true : ccOn()); // màn không có nút CC (truyện, cuộc gọi) → luôn hiện chữ
    const tap = e => { const s = e.target.closest && e.target.closest('.kw'); if (!s || !el.contains(s)) return; if (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return; e.preventDefault(); e.stopPropagation(); if (o.onWord) o.onWord(s.textContent.replace(/^[^\w']+|[^\w']+$/g, ''), s); };
    el.addEventListener('click', tap); el.addEventListener('keydown', tap);
    return api;
  }

  /** bubble(card, tch, { speaker() }) → { point(el), pop(), playing(btn, f), peek(span, word), destroy() } · card = thẻ đục chứa lời, tch = khung giáo viên đứng sau thẻ */
  function bubble(card, tch, o = {}) {
    css(); if (!card) return null;
    card.classList.add('tchb');
    const tail = D.createElement('span'); tail.className = 'tchb-tail'; tail.setAttribute('aria-hidden', 'true'); card.prepend(tail);
    let who = tch, pk = null;
    const fig = () => who && (who.querySelector('.tch-rig.live canvas') || who.querySelector('.tch-poster') || who);
    // đuôi trỏ đúng miệng: x = giữa hình người đang vẽ, kẹp trong bo góc thẻ; ẩn khi không có giáo viên (thiếu tài sản)
    const place = () => { const f = fig(); if (!f || !card.isConnected) return; const r = f.getBoundingClientRect(), c = card.getBoundingClientRect();
      const ok = r.width > 0 && who.style.display !== 'none'; tail.hidden = !ok; if (!ok) return;
      const x = Math.round(Math.max(18, Math.min(c.width - 36, r.left + r.width * MOUTH - c.left - 9))); card.style.setProperty('--tx', x + 'px'); tail.dataset.x = x; };
    const ro = g.ResizeObserver ? new ResizeObserver(() => place()) : null;
    const watch = () => { if (!ro) return; ro.disconnect(); ro.observe(card); if (who) ro.observe(who); };
    // clip WebGL nạp xong → canvas thay poster (cỡ khác) → đo lại 1 lần
    const mo = g.MutationObserver && tch ? new MutationObserver(() => place()) : null; if (mo) mo.observe(tch, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style'] });
    g.addEventListener('resize', place); watch(); place();
    const api = {
      tail, place,
      point(el) { if (el && el !== who) { who = el; watch(); } place(); }, // đổi người nói (Ama ↔ Carlos) → đuôi chuyển theo
      pop() { place(); card.classList.remove('tchb-pop'); void card.offsetWidth; card.classList.add('tchb-pop'); }, // 1 lần khi lời mới hiện (đọc 1 lần offsetWidth để chạy lại animation)
      playing(btn, f) { if (!btn) return; let r = btn.querySelector('.tchb-ring'); const host = btn.querySelector('.rounded-\\[9999px\\]') || btn;
        if (!r) { r = D.createElement('span'); r.className = 'tchb-ring'; r.setAttribute('aria-hidden', 'true'); host.style.position = 'relative'; host.appendChild(r); }
        const on = f != null && f < 1; btn.classList.toggle('tchb-play', on); r.style.setProperty('--p', on ? f.toFixed(3) : 0); },
      // nghĩa nhanh dưới từ vừa chạm: Dict.quick → Dict.lookup (engine tra từ sẵn có), không tìm thấy → báo ngắn; chạm chỗ khác / Esc → đóng
      peek(span, word) { api.unpeek(); if (!span || !word || !g.Dict) return; const p = pk = D.createElement('div'); p.className = 'tchb-peek'; p.setAttribute('role', 'status'); p.lang = 'en';
        const c = card.getBoundingClientRect(), s = span.getBoundingClientRect(); p.style.top = Math.round(s.bottom - c.top + 6) + 'px';
        p.style.left = Math.round(Math.max(8, Math.min(s.left - c.left, c.width - 8 - 288))) + 'px';
        p.textContent = (g.t ? g.t('Đang tra “{w}”…', { w: word }) : word); card.appendChild(p);
        const q = g.Dict.quick ? Promise.resolve(g.Dict.quick(word)).catch(() => null) : Promise.resolve(null);
        q.then(d => d || (g.Dict.lookup ? g.Dict.lookup(word, { examples: false, image: false }) : null)).catch(() => null).then(d => { if (pk !== p) return;
          const m = d && d.found ? (g.App && g.App.meanOf ? g.App.meanOf(d) : d.vi) : '';
          p.textContent = ''; const b = D.createElement('b'); b.textContent = (d && d.word) || word; p.appendChild(b);
          if (m) { const sp = D.createElement('span'); sp.lang = ''; sp.textContent = ' · ' + m; p.appendChild(sp); } else if (!d || !d.found) p.append(' · ' + (g.t ? g.t('Không tìm thấy “{w}”.', { w: word }) : '')); });
        setTimeout(() => D.addEventListener('pointerdown', api.unpeek, { once: true }), 0); },
      unpeek() { if (pk) { pk.remove(); pk = null; } },
      // nút phụ đề "CC" (bật/tắt chữ, giữ nhịp karaoke) – nhớ lựa chọn trên máy
      ccBtn(label, onChange) { let b = card.querySelector('.tchb-cc'); if (!b) { b = D.createElement('button'); b.type = 'button'; b.className = 'tchb-cc'; b.textContent = 'CC'; b.setAttribute('aria-label', label); b.title = label; card.appendChild(b);
          b.onclick = () => { const on = b.getAttribute('aria-pressed') !== 'true'; try { g.localStorage.setItem(CC, on ? '1' : '0'); } catch (e) { /* bỏ qua */ } b.setAttribute('aria-pressed', String(on)); if (onChange) onChange(on); }; }
        b.setAttribute('aria-pressed', String(ccOn())); return b; },
      destroy() { if (ro) ro.disconnect(); if (mo) mo.disconnect(); g.removeEventListener('resize', place); api.unpeek(); },
    };
    return api;
  }
  const VOICE = { ama: g.Chars.voice('ama'), carlos: g.Chars.voice('carlos') }; // giọng app của giáo viên – chỉ qua Chars (registry), cùng giọng scripts/gen-audio.mjs sinh cho truyện/radio
  /** prep(): nạp trước mặt vẽ + mốc ở màn ngay TRƯỚC khi giáo viên nói (đổ chuông Call, vào bài học) – Home/Today không gọi */
  const prep = () => { try { if (lipOn() && !saveData()) lipLoad().catch(() => {}); } catch (e) { /* bỏ qua */ } };
  g.LessonTeacher = { mount, lite, VOICE, prep, SLOW, bubble, kara, weights, wordAt };
})(self);
