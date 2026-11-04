/* 🧍 Chỗ giáo viên – phần PHÁT CLIP (WebGL/video), tải lười từ teacher-slot.js khi trang có .tslot[data-clip] (khung app chỉ giữ ảnh tĩnh + CSS).
 * Tách 3/11 để khung app dưới trần size-budget (không nới trần). Cổng: scripts/test/teacher-native.mjs. */
(function (g) {
  // Clip tư thế = H.264 xếp chồng (nửa trên màu, nửa dưới alpha, scripts/teach/build.py) → ghép bằng WebGL như lesson/teacher.js; ảnh tĩnh nằm dưới đến khi có khung đầu.
  const VS = 'attribute vec2 p;varying vec2 v;void main(){v=vec2(p.x*.5+.5,.25-p.y*.25);gl_Position=vec4(p,0.,1.);}';
  const FS = 'precision mediump float;varying vec2 v;uniform sampler2D u;void main(){float a=texture2D(u,v+vec2(0.,.5)).r;gl_FragColor=vec4(min(texture2D(u,v).rgb,vec3(a)),a);}';
  const lite = () => { try { const c = navigator.connection; return !!(c && (c.saveData || /2g/.test(c.effectiveType || ''))) || g.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return true; } };
  const live = g.TeacherLive = el => {
    const fig = el.querySelector('.tslot-fig'), src = el.dataset.clip, wm = el.dataset.webm; el.removeAttribute('data-clip'); el.removeAttribute('data-webm'); if (!fig || !src || lite()) return;
    const v = document.createElement('video'); Object.assign(v, { muted: true, playsInline: true, preload: 'metadata', crossOrigin: 'anonymous' }); v.setAttribute('playsinline', '');
    if (el.dataset.loop === '0') v.loop = true; // vòng nghỉ: lặp liền (docs/CHARACTERS.md)
    let seen = true;
    const watch = (go, load) => { if (g.IntersectionObserver) new IntersectionObserver(es => { seen = es[0].isIntersecting; if (seen) { load(); go(); } else v.pause(); }, { rootMargin: '120px' }).observe(el); else load(); };
    // không có H.264 mà có VP9 → idle.webm (VP9α) phát thẳng (docs/CHARACTERS.md)
    if (wm && !v.canPlayType('video/mp4; codecs="avc1.42E01E"') && v.canPlayType('video/webm; codecs="vp9"')) {
      v.className = 'tslot-img'; v.setAttribute('aria-hidden', 'true'); v.onplaying = () => el.classList.add('live');
      v.onerror = () => { v.remove(); el.classList.remove('live'); }; // lỗi → giữ ảnh tĩnh
      const go = () => { if (seen && v.paused && el.isConnected) v.play().catch(() => {}); else if (!el.isConnected) { v.pause(); v.removeAttribute('src'); } };
      fig.appendChild(v); return watch(go, () => { if (!v.src) v.src = wm; });
    }
    const cv = document.createElement('canvas'), gl = cv.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: false }); if (!gl) return;
    const sh = (t, x) => { const o = gl.createShader(t); gl.shaderSource(o, x); gl.compileShader(o); return o; }, pr = gl.createProgram();
    gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr); if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return;
    gl.useProgram(pr); gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer()); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const lp = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(lp); gl.vertexAttribPointer(lp, 2, gl.FLOAT, false, 0, 0);
    gl.bindTexture(gl.TEXTURE_2D, gl.createTexture()); for (const k of [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER]) gl.texParameteri(gl.TEXTURE_2D, k, gl.LINEAR);
    for (const k of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T]) gl.texParameteri(gl.TEXTURE_2D, k, gl.CLAMP_TO_EDGE);
    let raf = 0, t = 0, ft = -1;
    // chỉ tải texture khi video SANG KHUNG MỚI (WebKit chép video chậm → tải thừa mỗi rAF làm tay Ama giật, live 3/11). currentTime chạy liên tục giữa 2 khung nên KHÔNG dùng so sánh được (WebKit đo: 179 lần tải / 56 khung):
    // requestVideoFrameCallback (Safari 15.4+, Chrome) báo đúng khung đã hiện; máy cũ → rAF + làm tròn về chỉ số khung 24 fps.
    const rv = !!v.requestVideoFrameCallback, next = f => rv ? v.requestVideoFrameCallback(f) : requestAnimationFrame(f);
    const draw = () => { raf = 0; if (!el.isConnected) { v.pause(); v.removeAttribute('src'); return; }
      const k = rv ? 0 : Math.floor(v.currentTime * 24);
      if (v.readyState >= 2 && (rv || k !== ft)) { ft = k; gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, v); gl.viewport(0, 0, cv.width, cv.height); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); el.classList.add('live'); }
      if (!v.paused) raf = next(draw); };
    const go = () => { if (seen && v.paused && el.isConnected) ft = -1, v.play().then(() => { if (!raf) raf = next(draw); }).catch(() => {}); };
    v.onloadeddata = () => { cv.width = v.videoWidth; cv.height = v.videoHeight / 2; cv.className = 'tslot-img'; cv.setAttribute('aria-hidden', 'true'); fig.appendChild(cv); go(); };
    v.onended = () => { if (el.dataset.loop) { clearTimeout(t); t = setTimeout(() => { v.currentTime = 0; go(); }, +el.dataset.loop); } }; // cử chỉ lặp có nghỉ (tay xuôi đầu/cuối clip → nối liền)
    v.onerror = () => { fig.querySelector('canvas') && cv.remove(); el.classList.remove('live'); }; // lỗi clip → giữ ảnh tĩnh
    // Nhẹ: chỉ tải clip khi khung hiện trên màn (0 byte nếu cuộn qua), ngoài màn thì dừng; SW + cache tĩnh (#302) → lần sau 0 byte
    const load = () => { if (!v.src) v.src = src; };
    watch(go, load);
  };
})(self);
