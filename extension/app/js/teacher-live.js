/* 🧍 Chỗ giáo viên – phần PHÁT CLIP (WebGL/video), tải lười từ teacher-slot.js khi trang có .tslot[data-clip] (khung app chỉ giữ ảnh tĩnh + CSS).
 * Tách 3/11 để khung app dưới trần size-budget (không nới trần). Cổng: scripts/test/teacher-native.mjs, scripts/test/teacher-quality.mjs (CI teacher-quality.yml).
 * Sửa 05/11 (chủ: lag · vệt đen · lệch miệng): gốc + cách sửa + cổng ở docs/CHARACTERS.md §Phát clip (một nguồn). */
(function (g) {
  const QUIET = new Set([]); // 'who/pose' được phép phát im – rỗng: mọi clip hiện có đều nhép miệng (mouth_motion.py). Thêm = clip ngậm miệng qua cổng.
  const key = u => { const m = /teach\/([\w-]+)\/([\w-]+)\.(?:mp4|webm)/.exec(u || ''); return m ? m[1] + '/' + m[2] : ''; };
  // Clip tư thế = H.264 xếp chồng (nửa trên màu đã nhân alpha, nửa dưới alpha, scripts/teach/build.py) → ghép bằng WebGL; ảnh tĩnh nằm dưới đến khi có khung đầu.
  const VS = 'attribute vec2 p;varying vec2 v;void main(){v=vec2(p.x*.5+.5,.5-p.y*.5);gl_Position=vec4(p,0.,1.);}';
  // highp: mediump (10 bit) lệch ±½ hàng ở ảnh 960 px → lấy mẫu lẫn nửa màu/alpha. e = ½ texel: không lấy mẫu qua đường nối. k = góc đệm (mức đen thật).
  const FS = 'precision highp float;varying vec2 v;uniform sampler2D u;uniform vec2 e;' +
    'void main(){vec2 c=vec2(v.x,clamp(v.y*.5,e.y,.5-e.y));vec2 k=e*3.;' +
    'float a0=texture2D(u,vec2(k.x,.5+k.y)).r,c0=texture2D(u,k).g;float s=a0>.03?255./219.:1.;' + // góc đệm ≈ 16/255 → trình duyệt đọc sai dải → giãn 16–235 về 0–1
    'float a=clamp((texture2D(u,c+vec2(0.,.5)).r-a0)*s,0.,1.);vec3 m=clamp((texture2D(u,c).rgb-c0)*s,0.,1.);' +
    'float b=clamp((a-.06)/.94,0.,1.);b*=step(.036,b);gl_FragColor=vec4(clamp(m/max(a,.004),0.,1.)*b,b);}'; // cắt nhiễu nén ≤ 6 % (CI 05/11: 414 điểm mờ xa người với mức 3 %) + cắt cứng alpha < 9/255 (dốc 0–3,5 % để lại 600–880 điểm mờ: không thấy được nhưng phủ xám nền), màu thẳng × alpha mới (không mép tối)
  const lite = () => { try { const c = navigator.connection; return !!(c && (c.saveData || /2g/.test(c.effectiveType || ''))) || g.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return true; } };
  const live = g.TeacherLive = el => {
    const fig = el.querySelector('.tslot-fig'), src = el.dataset.clip, wm = el.dataset.webm, talk = el.dataset.talk; el.removeAttribute('data-clip'); el.removeAttribute('data-webm'); el.removeAttribute('data-talk'); if (!fig || !src || lite()) return;
    const quiet = QUIET.has(key(src)); if (!quiet && !talk) return; // clip nhép miệng không có lời → ảnh tĩnh (không lệch miệng, 0 giải mã)
    const v = document.createElement('video'); Object.assign(v, { muted: true, playsInline: true, preload: 'metadata', crossOrigin: 'anonymous' }); v.setAttribute('playsinline', '');
    let seen = true, cv = null;
    const vis = () => !document.hidden && seen;
    const stop = () => { v.pause(); v.removeAttribute('src'); try { v.load(); } catch (e) { /* bỏ qua */ } el.classList.remove('live'); if (cv) cv.remove(); };
    const watch = (go, load) => {
      if (g.IntersectionObserver) new IntersectionObserver(es => { seen = es[0].isIntersecting; if (seen) { load(); go(); } else v.pause(); }, { rootMargin: '120px' }).observe(el); else load();
      document.addEventListener('visibilitychange', () => { if (document.hidden) v.pause(); else go(); }); // tab ẩn: video muted vẫn giải mã → dừng hẳn
    };
    // không có H.264 mà có VP9 → idle.webm (VP9α) phát thẳng (docs/CHARACTERS.md)
    if (wm && quiet && !v.canPlayType('video/mp4; codecs="avc1.42E01E"') && v.canPlayType('video/webm; codecs="vp9"')) {
      v.loop = true; v.className = 'tslot-img'; v.setAttribute('aria-hidden', 'true'); v.onplaying = () => el.classList.add('live');
      v.onerror = () => { v.remove(); el.classList.remove('live'); }; // lỗi → giữ ảnh tĩnh
      const go = () => { if (vis() && v.paused && el.isConnected) v.play().catch(() => {}); else if (!el.isConnected) stop(); };
      fig.appendChild(v); return watch(go, () => { if (!v.src) v.src = wm; });
    }
    if (el.dataset.loop === '0') v.loop = true; // vòng nghỉ: lặp liền
    cv = document.createElement('canvas'); const gl = cv.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: false, powerPreference: 'low-power' }); if (!gl) return;
    const sh = (t, x) => { const o = gl.createShader(t); gl.shaderSource(o, x); gl.compileShader(o); return o; }, pr = gl.createProgram();
    gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr); if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return;
    gl.useProgram(pr); gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer()); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const lp = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(lp); gl.vertexAttribPointer(lp, 2, gl.FLOAT, false, 0, 0);
    gl.bindTexture(gl.TEXTURE_2D, gl.createTexture()); for (const k of [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER]) gl.texParameteri(gl.TEXTURE_2D, k, gl.LINEAR);
    for (const k of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T]) gl.texParameteri(gl.TEXTURE_2D, k, gl.CLAMP_TO_EDGE);
    const ue = gl.getUniformLocation(pr, 'e');
    let alloc = '', t = 0, pend = 0, blank = 0, ema = 0, nf = 0;
    const draw = () => { // 1 lần cho MỖI khung video mới (không phải mỗi rAF)
      pend = 0; if (!el.isConnected) return stop();
      if (v.readyState < 2) return;
      const sz = v.videoWidth + 'x' + v.videoHeight;
      const tu = performance.now();
      const fresh = sz !== alloc; if (fresh) { alloc = sz; gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, v); gl.uniform2f(ue, 0.5 / v.videoWidth, 0.5 / v.videoHeight); } else gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, v);
      gl.viewport(0, 0, cv.width, cv.height); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      // khung ĐẦU: chỉ giấu ảnh tĩnh khi texture thật có hình (WebKit/GStreamer, driver lỗi: video→texture rỗng → ô trống "mất hình"). Đọc 1 hàng giữa, 1 lần.
      if (!el.classList.contains('live')) { const W = cv.width, row = new Uint8Array(W * 4); gl.readPixels(0, cv.height >> 1, W, 1, gl.RGBA, gl.UNSIGNED_BYTE, row); let op = 0; for (let i = 3; i < row.length; i += 4) if (row[i] > 128) op++;
        if (op < 3) { if (++blank >= 3) stop(); return; } el.classList.add('live'); }
      el.lkFrames = (el.lkFrames || 0) + 1; const du = performance.now() - tu; el.lkMs = Math.max(el.lkMs || 0, du); el.lkSum = (el.lkSum || 0) + du;
      // máy chậm (không GPU, CPU yếu): tải 1 khung > 12 ms (trung bình trượt, ≥ 6 khung) → ăn > 30 % luồng chính, giật cả trang → về ảnh tĩnh (thở CSS), không giữ clip giật
      if (!fresh) { ema = nf++ ? ema * .75 + du * .25 : du; if (nf >= 6 && ema > 12) { el.lkSlow = 1; return stop(); } } // cổng teacher-quality: số khung tải lên ≈ khung video, không phải số rAF
    };
    const rvfc = !!v.requestVideoFrameCallback;
    const next = () => { if (pend || v.paused) return; if (rvfc) pend = v.requestVideoFrameCallback(() => { draw(); next(); }); else { let lt = -1; const f = () => { pend = 0; if (v.paused) return; if (v.currentTime !== lt) { lt = v.currentTime; draw(); } pend = requestAnimationFrame(f); }; pend = requestAnimationFrame(f); } };
    const go = () => { if (vis() && v.paused && el.isConnected && v.src) v.play().then(next).catch(() => {}); };
    v.onloadeddata = () => { cv.width = v.videoWidth; cv.height = v.videoHeight / 2; cv.className = 'tslot-img'; cv.setAttribute('aria-hidden', 'true'); if (!cv.isConnected) fig.appendChild(cv); draw(); go(); };
    v.onended = () => { if (el.dataset.loop && quiet) { clearTimeout(t); t = setTimeout(() => { v.currentTime = 0; go(); }, +el.dataset.loop); } }; // cử chỉ lặp có nghỉ (chỉ clip ngậm miệng)
    v.onerror = () => { cv.remove(); el.classList.remove('live'); }; // lỗi clip → giữ ảnh tĩnh
    // Nhẹ: chỉ tải clip khi khung hiện trên màn (0 byte nếu cuộn qua), ngoài màn thì dừng; SW + cache tĩnh (#302) → lần sau 0 byte
    let first = talk || src; const load = () => { if (!v.src && first) v.src = first; };
    // data-talk: clip nói chạy đúng lúc chữ hiện (có lời), lkQuiet() → vòng nghỉ nếu ngậm miệng, không thì về ảnh tĩnh (không nhép khi im)
    if (talk) { v.loop = true; el.lkQuiet = () => { el.lkQuiet = null; if (quiet) { v.loop = el.dataset.loop === '0'; first = src; if (v.src) v.src = src; } else { first = ''; stop(); } }; }
    watch(go, load);
  };
})(self);
