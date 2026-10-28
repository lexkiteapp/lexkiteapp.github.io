/* 👩‍🏫 Ama / Carlos đọc lời nhắc trong bài học – viseme sprite (pilot B, PR #151: docs/mocks/teacher-pilot/b-sprite.html, docs/LESSON-ENGINE.md §4).
 * Thân/đầu/chớp mắt = vòng lặp 3 s của chính clip giáo viên; miệng = 10 hình Rhubarb (X A B C1 C D E F G H) đặt lên mặt, bám theo từng khung (track).
 * Câu động (từ của người học) → miệng chạy theo chữ (LessonEngine.visemes) trong lúc UI.tts đọc; có cue sinh sẵn ({ cues:[[t,v]], dur }) thì dùng cue.
 * Nhân vật đã TÁCH NỀN (scripts/teacher/cutout.py, CI teach-cutout.yml): loop-a.mp4 = stacked alpha (nửa trên màu, nửa dưới alpha) → WebGL ghép
 * lên nền của chính app (theo theme) · poster.webp RGBA. Không WebGL → poster tĩnh trong suốt (KHÔNG bao giờ hiện nền phòng).
 * Hạ cấp: saveData / prefers-reduced-motion / thiếu tài sản → ảnh poster tĩnh, bài vẫn chạy. Tài sản: teach/<who>/{poster.webp,loop-a.mp4,mouths.webp,sprite.json}. */
(function (g) {
  const D = g.document;
  const lite = () => { try { const c = navigator.connection; return !!(c && (c.saveData || /2g/.test(c.effectiveType || ''))) || g.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
  const NAME = { ama: 'Ama', carlos: 'Carlos' };

  /** mount(el, who) → { say(text, { rate, cues, dur, onEnd }), stop(), destroy(), who } */
  function mount(el, who) {
    who = NAME[who] ? who : 'ama';
    const base = 'teach/' + who + '/';
    el.classList.add('tch'); el.innerHTML = `<div class="tch-rig"><img class="tch-poster" src="${base}poster.webp" alt="${NAME[who]}" width="480" height="640" decoding="async"></div>`;
    const rig = el.firstChild;
    rig.firstChild.onerror = () => { el.style.display = 'none'; }; // thiếu tài sản (vd. bản add-on không kèm teach/) → ẩn giáo viên, bài vẫn chạy
    let sp = null, vid = null, L = [], front = 0, cur = '', run = 0, dead = false, ro = null, glr = null;
    // WebGL ghép stacked alpha (480×1280 → 480×640 RGBA, premultiplied). Không có WebGL / lỗi biên dịch → null (poster tĩnh)
    function alphaGL() {
      try {
        const cv = D.createElement('canvas'); cv.width = 480; cv.height = 640; cv.className = 'tch-vid'; cv.setAttribute('aria-hidden', 'true');
        const c = cv.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: false, powerPreference: 'low-power' }); if (!c) return null;
        const sh = (t, src) => { const o = c.createShader(t); c.shaderSource(o, src); c.compileShader(o); if (!c.getShaderParameter(o, c.COMPILE_STATUS)) throw new Error('shader'); return o; };
        const pr = c.createProgram();
        c.attachShader(pr, sh(c.VERTEX_SHADER, 'attribute vec2 p;varying vec2 u;void main(){u=vec2(p.x*.5+.5,.5-p.y*.5);gl_Position=vec4(p,0.,1.);}'));
        c.attachShader(pr, sh(c.FRAGMENT_SHADER, 'precision mediump float;varying vec2 u;uniform sampler2D t;void main(){vec3 rgb=texture2D(t,vec2(u.x,u.y*.5)).rgb;float a=smoothstep(.04,.96,texture2D(t,vec2(u.x,.5+u.y*.5)).r);gl_FragColor=vec4(rgb*a,a);}'));
        c.linkProgram(pr); if (!c.getProgramParameter(pr, c.LINK_STATUS)) return null; c.useProgram(pr);
        c.bindBuffer(c.ARRAY_BUFFER, c.createBuffer()); c.bufferData(c.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), c.STATIC_DRAW);
        const loc = c.getAttribLocation(pr, 'p'); c.enableVertexAttribArray(loc); c.vertexAttribPointer(loc, 2, c.FLOAT, false, 0, 0);
        c.bindTexture(c.TEXTURE_2D, c.createTexture());
        [c.TEXTURE_WRAP_S, c.TEXTURE_WRAP_T].forEach(k => c.texParameteri(c.TEXTURE_2D, k, c.CLAMP_TO_EDGE)); [c.TEXTURE_MIN_FILTER, c.TEXTURE_MAG_FILTER].forEach(k => c.texParameteri(c.TEXTURE_2D, k, c.LINEAR));
        let shown = false;
        glr = { canvas: cv, draw(v) { if (v.readyState < 2) return; c.texImage2D(c.TEXTURE_2D, 0, c.RGBA, c.RGBA, c.UNSIGNED_BYTE, v); c.drawArrays(c.TRIANGLE_STRIP, 0, 4); if (!shown) { shown = true; cv.classList.add('on'); } }, lose() { try { const x = c.getExtension('WEBGL_lose_context'); if (x) x.loseContext(); } catch (e) { /* bỏ qua */ } } };
        return glr;
      } catch (e) { return null; }
    }
    const fit = () => { rig.style.transform = `scale(${(el.clientWidth || 120) / 480})`; };
    fit(); if (g.ResizeObserver) { ro = new ResizeObserver(fit); ro.observe(el); }
    if (!lite()) {
      fetch(base + 'sprite.json').then(r => (r.ok ? r.json() : null)).then(j => {
        if (!j || dead || !j.mouth) return; sp = j;
        const gl = alphaGL(); if (!gl) return; // không WebGL → giữ poster trong suốt
        vid = D.createElement('video'); Object.assign(vid, { muted: true, loop: true, playsInline: true, preload: 'auto', crossOrigin: 'anonymous' }); vid.setAttribute('playsinline', ''); vid.setAttribute('aria-hidden', 'true'); vid.className = 'tch-src';
        const face = D.createElement('div'); face.className = 'tch-face';
        const m = sp.mouth;
        L = [0, 1].map(() => { const d = D.createElement('div'); d.className = 'tch-m'; Object.assign(d.style, { left: m.x + 'px', top: m.y + 'px', width: m.w + 'px', height: m.h + 'px', backgroundImage: `url(${base}mouths.webp)`, backgroundSize: `${m.order.length * 100}% 100%` }); face.appendChild(d); return d; });
        vid.oncanplay = () => { vid.oncanplay = null; if (!dead) { rig.appendChild(vid); rig.appendChild(gl.canvas); rig.appendChild(face); vid.play().catch(() => {}); } };
        vid.onerror = () => { vid = null; };
        vid.src = base + 'loop-a.mp4';
        const set = t => { gl.draw(vid); const tr = sp.track; if (!tr || !tr.length) return; const a = tr[Math.round(t * (sp.fps || 24)) % tr.length]; face.style.transform = `matrix(${a.join(',')})`; };
        if (vid.requestVideoFrameCallback) { const cb = (now, md) => { if (dead) return; set(md.mediaTime); vid.requestVideoFrameCallback(cb); }; vid.requestVideoFrameCallback(cb); }
        else (function raf() { if (dead || !vid) return; set(vid.currentTime); requestAnimationFrame(raf); })();
      }).catch(() => {});
    }
    // k = hình miệng hoặc '' (miệng thật của clip – ngậm)
    function show(k) {
      if (!sp || k === cur) return; cur = k;
      const back = L[1 - front], o = sp.mouth.order;
      if (k) { back.style.backgroundPosition = `${o.indexOf(k) / (o.length - 1) * 100}% 0`; back.style.opacity = 1; }
      L[front].style.opacity = 0; if (k) front = 1 - front;
    }
    function lip(cues, dur, my) {
      const t0 = performance.now();
      (function tick() {
        if (my !== run || dead) return;
        const t = ((performance.now() - t0) / 1000) % Math.max(0.3, dur); // câu dài hơn ước tính → lặp lại nhịp miệng tới khi đọc xong
        let i = 0; while (i < cues.length - 1 && cues[i + 1][0] <= t) i++;
        const v = cues[i][1]; show(v === 'X' ? '' : v === 'C' && i % 3 === 0 ? 'C1' : v);
        requestAnimationFrame(tick);
      })();
    }
    let hq = null;
    const api = {
      who,
      // o.voice (Kokoro, vd. af_heart): phát mp3 sinh sẵn trên CI (audio.lexkite.com, khóa KVoice.lineKey) – miệng theo đúng độ dài file; thiếu file → giọng máy
      say(text, o = {}) {
        const my = ++run, rate = o.rate || 0.95, E = g.LessonEngine;
        let ended = false; const end = () => { if (ended) return; ended = true; if (my === run) { run++; show(''); } if (o.onEnd) o.onEnd(); };
        const tts = () => {
          if (my !== run) return;
          const dur = o.dur || Math.max(0.6, String(text || '').length * 0.065 / rate), cues = o.cues || (E ? E.visemes(text, dur) : [[0, 'X']]);
          if (sp && L.length) lip(cues, dur, my);
          if (g.UI && g.UI.tts) g.UI.tts(text, o.accent || 'en-US', rate, { onEnd: end }); else setTimeout(end, dur * 1000);
        };
        if (hq) { try { hq.pause(); } catch (e) { /* bỏ qua */ } hq = null; }
        const base = (g.AUDIO_BASES || [])[0];
        if (!o.voice || !g.KVoice || !base || !g.Audio) return tts();
        const a = hq = new g.Audio(base + g.KVoice.lineKey(o.voice, text) + '.mp3');
        a.onloadedmetadata = () => { if (my === run && sp && L.length && isFinite(a.duration)) lip(o.cues || (E ? E.visemes(text, a.duration) : [[0, 'X']]), a.duration, my); };
        if (rate < 0.9) a.playbackRate = 0.75; // 🐢 nghe chậm
        a.onended = end;
        a.onerror = () => { if (hq === a) { hq = null; tts(); } };
        const p = a.play(); if (p && p.catch) p.catch(() => { if (hq === a) { hq = null; tts(); } });
      },
      stop() { run++; show(''); if (hq) { try { hq.pause(); } catch (e) { /* bỏ qua */ } hq = null; } try { if (g.UI && g.UI.stopSpeak) g.UI.stopSpeak(); } catch (e) { /* bỏ qua */ } },
      destroy() { dead = true; if (glr) glr.lose(); run++; if (hq) { try { hq.pause(); } catch (e) { /* bỏ qua */ } hq = null; } if (ro) ro.disconnect(); if (vid) { try { vid.pause(); vid.removeAttribute('src'); vid.load(); } catch (e) { /* bỏ qua */ } } el.innerHTML = ''; },
    };
    return api;
  }
  const VOICE = { ama: 'af_heart', carlos: 'am_michael' }; // cùng giọng scripts/gen-audio.mjs sinh cho truyện/radio
  g.LessonTeacher = { mount, lite, VOICE };
})(self);
