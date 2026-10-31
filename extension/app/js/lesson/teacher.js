/* 👩‍🏫 Ama / Carlos đọc lời nhắc trong bài học – clip PHÔNG XANH đã tách nền PRO (scripts/teach/build.py, CI teach-build.yml), nền trong suốt, đủ đầu.
 * Đang nói → vòng "talk" (miệng thật của clip, khớp nhịp), im/nghe → vòng "listen"; trộn 160 ms trong CÙNG 1 canvas (không 2 lớp chồng nhau).
 * Video H.264 "xếp chồng" (nửa trên màu đã nhân alpha, nửa dưới alpha) → WebGL ghép thành nền trong suốt: mọi trình duyệt, giải mã phần cứng.
 * Hạ cấp: saveData / giảm chuyển động / không WebGL / thiếu tài sản → poster.webp (alpha) tĩnh. Tài sản: chỉ qua Chars (poster, clip talk/listen, đầu trơn).
 * 🙂 Mặt VẼ khớp miệng (cờ lk.lipsync, chỉ Call: mount(el, who, { lip: true }), docs/specs/call-lipsync.md): đầu trơn + mắt/mi/mày/ria/miệng vector (LipFace) vẽ lại mỗi khung theo
 * audio.currentTime. Có mốc CI (web/js/call/cues.js + <khóa>-ls.mp3) → "pre"; không có → LipSync.live() theo năng lượng tiếng. Thiếu gì → vòng clip như cũ → poster. */
(function (g) {
  const D = g.document;
  const lite = () => { try { const c = navigator.connection; return !!(c && (c.saveData || /2g/.test(c.effectiveType || ''))) || g.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
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

  // cờ: localStorage lk.lipsync = 1/0 (thử) · config công khai lipsync (lk.cfg) – mặc định tắt
  const lipOn = () => { try { const f = localStorage.getItem('lk.lipsync'); if (f === '1' || f === '0') return f === '1'; const c = JSON.parse(localStorage.getItem('lk.cfg') || 'null'), v = c && c.v && c.v.lipsync; return v === true || v === '1' || v === 'true'; } catch (e) { return false; } };
  // nạp lười (chỉ khi cờ bật – khung app không đổi), tuần tự vì face.js đọc LipSync/LipMouth lúc nạp
  let lipP = null;
  const lipLoad = () => lipP || (lipP = ['lipsync', 'mouths', 'face', 'cues'].reduce((p, f) => p.then(() => new Promise((ok, no) => { const s = D.createElement('script'); s.src = 'js/call/' + f + '.js'; s.onload = ok; s.onerror = no; D.head.appendChild(s); })), Promise.resolve())
    .then(() => { if (g.LK_CUES && g.LK_CUES.dict) g.LipSync.setDict(g.LK_CUES.dict); }, e => { lipP = null; throw e; }));
  let uid = 0;
  // Lớp mặt vẽ trong rig: <svg> (đầu trơn + lớp vector, nghiêng/gật quanh cổ) phủ đúng khung poster (contain, căn đáy). onFail → vòng clip.
  function face(rig, who, onFail) {
    const LS = g.LipSync, LF = g.LipFace, R = LF.RIG[who], id = 'tf' + (++uid), pic = new Image(), hi = (g.devicePixelRatio || 1) * (rig.clientWidth || 200) > 320;
    const seed = s => { let h = 7; for (const ch of String(s)) h = (h * 31 + ch.charCodeAt(0)) | 0; return h; };
    const idle = LF.machine(who, { dur: 120, seed: seed(who) }), stats = { frames: 0, long: 0, t0: 0, mode: 'idle' };
    let W = null, G = null, S = null, raf = 0, dead = false, last = '', lastTf = '', prev = 0, ac = null;
    try { const A = g.AudioContext || g.webkitAudioContext; if (A) ac = new A(); } catch (e) { ac = null; }
    const frame = now => {
      if (dead) return;
      const dt = prev ? (now - prev) / 1000 : 1 / 60; prev = now; stats.frames++; if (dt > 0.05) stats.long++;
      let s;
      stats.mode = S ? (S.L ? 'live' : 'pre') : 'idle';
      if (S) { const t = S.clk(); if (S.L) { S.L.tick(t, S.voiced(), Math.min(dt, 0.1)); s = S.M.at(Math.max(0, t - LS.LEAD)); } else s = S.M.at(t); }
      else s = idle.at((now / 1000) % 120);
      // chỉ dựng lại lớp vector khi trạng thái đổi thấy được (bước 1/100) – khung nghỉ/giữ hình không tốn gì (máy yếu giữ ≥ 50 fps)
      const m = s.mouth, k = [m.w, m.u, m.d, m.a, m.s, m.tt, m.tb, m.tg, m.tu, m.bite, m.lip, s.blink, s.look.x, s.look.y, s.brow, s.knit, s.open].map(v => Math.round((v || 0) * 100)).join();
      if (k !== last) { G.innerHTML = LF.svg(who, s, id); last = k; }
      const tf = `rotate(${(-s.tilt).toFixed(2)} ${R.pivot[0]} ${R.pivot[1]}) translate(0 ${s.nod.toFixed(1)})`; if (tf !== lastTf) { W.setAttribute('transform', tf); lastTf = tf; }
      raf = requestAnimationFrame(frame);
    };
    pic.onerror = () => { if (!dead) { dead = true; onFail(); } };
    pic.onload = () => {
      if (dead) return;
      rig.insertAdjacentHTML('beforeend', `<svg class="tch-face" viewBox="0 0 1108 960" preserveAspectRatio="xMidYMax meet" aria-hidden="true" focusable="false"><g><image href="${pic.src}" width="1108" height="960"/><g></g></g></svg>`);
      W = rig.lastChild.firstChild; G = W.lastChild; rig.classList.add('drawn'); stats.t0 = performance.now(); raf = requestAnimationFrame(frame);
    };
    if (!D.getElementById('tch-face-css')) D.head.insertAdjacentHTML('beforeend', '<style id="tch-face-css">.tch-rig .tch-face{position:absolute;inset:0;width:100%;height:100%;overflow:visible;pointer-events:none}.tch-rig.drawn>img.tch-poster{visibility:hidden}.tch-rig.posed .tch-face{visibility:hidden}</style>');
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
          S = { clk, L, node, M: LF.machine(who, { cues: L.cues, dur: Math.max(30, est), seed: seed(src.text), text: src.text }),
            voiced: () => { if (a && (a.paused || a.ended)) return false; if (!an) return true; an.getFloatTimeDomainData(buf); let e = 0; for (const x of buf) e += x * x; return vd(Math.sqrt(e / buf.length)); } };
          // chưa biết độ dài tiếng lúc bắt đầu → dựng lại con trỏ theo độ dài thật khi có (trước khi phát)
          if (a && !isFinite(a.duration)) a.addEventListener('loadedmetadata', () => { if (S && S.L === L && a.currentTime < 0.05) live(); }, { once: true });
        };
        if (a && src.cue) {
          const [ms, cs, eb] = src.cue, dur = ms / 1000, env = Array.from(atob(eb), ch => ch.charCodeAt(0) / 255);
          const q = cs.split(' ').map(x => ({ value: x[0], start: +x.slice(1) / 1000 })); q.forEach((x, i) => { x.end = i < q.length - 1 ? q[i + 1].start : dur; });
          S = { clk, M: LF.machine(who, { cues: q, env, dur, seed: seed(src.text), text: src.text }) };
          // mp3 đệm cũ / sai bản → độ dài lệch mốc > 120 ms thì chuyển live (không bao giờ khớp sai)
          a.addEventListener('loadedmetadata', () => { if (S && S.clk === clk && isFinite(a.duration) && Math.abs(a.duration - dur) > 0.12) live(); }, { once: true });
        } else live();
      },
      quiet() { if (S && S.node) try { S.node.disconnect(); } catch (e) { /* bỏ qua */ } S = null; },
      destroy() { dead = true; self.quiet(); cancelAnimationFrame(raf); if (ac) try { ac.close(); } catch (e) { /* bỏ qua */ } }
    };
    return self;
  }

  /** mount(el, who, { lip }) → { say(text, { rate, voice, onEnd }), stop(), destroy(), who } · lip: cho phép mặt vẽ khớp miệng (Call, sau cờ lk.lipsync) */
  function mount(el, who, mo = {}) {
    who = Chars.id(who); // nhân vật + tài sản: chỉ qua Chars (web/js/characters.js, nguồn web/teach/characters.json)
    el.classList.add('tch'); el.innerHTML = `<div class="tch-rig">${Chars.img(who, { cls: 'tch-poster', kind: 'poster', size: 384 })}</div>`;
    const rig = el.firstChild;
    rig.firstChild.onerror = () => { el.style.display = 'none'; }; // thiếu tài sản (vd. bản add-on không kèm teach/) → ẩn giáo viên, bài vẫn chạy
    let run = 0, dead = false, want = 0, mix = 0, draw = null, raf = 0, last = 0, lastK = '', fc = null, gate = null;
    const V = [];
    const clips = () => {
      if (dead) return;
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
    if (!lite()) {
      // mặt vẽ; lỗi nạp/thiếu tài sản → vòng clip. Câu nói trong lúc đang nạp chờ tối đa 2 s (để câu đầu cũng có mốc CI, đúng bản -ls.mp3)
      if (mo.lip && lipOn()) gate = Promise.race([lipLoad().then(() => { if (!dead) fc = face(rig, who, () => { fc = null; clips(); }); }, clips), new Promise(z => setTimeout(z, 2000))]).then(() => { gate = null; });
      else clips();
    }
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
      pose(p) { let im = rig.querySelector('.tch-still'); if (!p) { if (im) im.remove(); rig.classList.remove('posed'); return; }
        if (im) im.src = Chars.still(who, p); else { rig.insertAdjacentHTML('beforeend', Chars.img(who, { kind: 'still', pose: p, cls: 'tch-still', alt: '', size: 384 })); }
        rig.classList.add('posed'); },
      // o.voice (Kokoro, vd. af_heart): phát mp3 sinh sẵn trên CI (audio.lexkite.com, khóa KVoice.lineKey) – vòng nói chạy đúng độ dài file; thiếu file → giọng máy
      say(text, o = {}) {
        if (gate) { const my0 = ++run; talking(true); gate.then(() => { if (my0 === run && !dead) api.say(text, o); }); return; }
        const my = ++run, rate = o.rate || 0.95;
        let ended = false; const end = () => { if (ended) return; ended = true; if (my === run) { run++; talking(false); if (fc) fc.quiet(); } if (o.onEnd) o.onEnd(); };
        talking(true);
        const tts = () => {
          if (my !== run) return;
          const dur = o.dur || Math.max(0.6, String(text || '').length * 0.065 / rate);
          if (fc) fc.speak({ text, dur }); // giọng máy: không có tiếng để đo → con trỏ live theo thời lượng ước tính
          if (g.UI && g.UI.tts) { const t0 = Date.now(); g.UI.tts(text, o.accent || 'en-US', rate, { onEnd: () => { const used = Date.now() - t0; if (used < 300 && my === run) setTimeout(end, Math.max(0, dur * 1000 - used)); else end(); } }); } else setTimeout(end, dur * 1000); // máy không có giọng → onEnd tức thì: giữ vòng nói đủ thời lượng ước tính (khớp miệng)
        };
        if (hq) { try { hq.pause(); } catch (e) { /* bỏ qua */ } hq = null; }
        const base = (g.AUDIO_BASES || [])[0];
        if (!o.voice || !g.KVoice || !base || !g.Audio) return tts();
        // mặt vẽ: câu có mốc CI → bản <khóa>-ls.mp3 sinh CÙNG lần với mốc; lỗi tải bản đó → mp3 thường + live
        const key = g.KVoice.lineKey(o.voice, text), cue = fc && !o.plain ? fc.cue(key) : null, a = hq = new g.Audio();
        if (fc && !cue && fc.tap()) a.crossOrigin = 'anonymous'; // live đo năng lượng tiếng (Web Audio cần CORS – audio.lexkite.com trả ACAO *)
        a.src = base + key + (cue ? '-ls' : '') + '.mp3';
        if (rate < 0.9) a.playbackRate = 0.75; // 🐢 nghe chậm
        a.onended = end;
        const fail = () => { if (hq !== a) return; hq = null; if (cue) api.say(text, Object.assign({}, o, { plain: 1 })); else tts(); };
        a.onerror = fail;
        if (fc) fc.speak({ audio: a, cue, text });
        const p = a.play(); if (p && p.catch) p.catch(fail);
      },
      stop() { run++; talking(false); if (fc) fc.quiet(); if (hq) { try { hq.pause(); } catch (e) { /* bỏ qua */ } hq = null; } try { if (g.UI && g.UI.stopSpeak) g.UI.stopSpeak(); } catch (e) { /* bỏ qua */ } },
      destroy() { dead = true; run++; if (fc) fc.destroy(); if (hq) { try { hq.pause(); } catch (e) { /* bỏ qua */ } hq = null; } cancelAnimationFrame(raf); for (const v of V) { if (v) try { v.pause(); v.removeAttribute('src'); v.load(); } catch (e) { /* bỏ qua */ } } el.innerHTML = ''; },
    };
    return api;
  }
  const VOICE = { ama: g.Chars.voice('ama'), carlos: g.Chars.voice('carlos') }; // giọng app của giáo viên – chỉ qua Chars (registry), cùng giọng scripts/gen-audio.mjs sinh cho truyện/radio
  g.LessonTeacher = { mount, lite, VOICE };
})(self);
