/* 🧍 Chỗ giáo viên dùng chung (teacher slot) – docs/CHARACTERS.md §Chỗ giáo viên. Ảnh tĩnh Ama/Carlos là NỬA NGƯỜI (đầu → hông, đáy mờ dần + quần xám),
 * nên không bao giờ đặt trần lên màn. Hai cách tiếp đất (option ground), không còn bệ xám lơ lửng (chủ 3/11: khối .tslot-ledge giữa nền trang trông như lỗi):
 *  · 'fade' (mặc định – giáo viên đứng trên nền trống/modal/chip): nửa thân dưới mờ dần mượt vào nền (mask-image trên khung .tslot-fig → ảnh tĩnh LẪN canvas clip)
 *    + bóng tiếp đất elip mềm .tslot-shadow → không khối, không đường cắt cứng, đúng mọi màu nền (sáng/tối/thẻ).
 *  · 'card' (giáo viên đứng ngay SAU mép trên một thẻ đục): không vẽ bệ – chính thẻ là bệ: slot lùi xuống 0,16 khung sau mép thẻ (người gọi đặt lề âm + thẻ z cao hơn),
 *    đường cắt hông khuất sau mặt thẻ thật (liền màu tuyệt đối). Cổng runtime teacher-native-shots kiểm có thẻ đục che dải đáy, không thì đỏ.
 * Cỡ chuẩn s/m/l/xl theo chiều cao khung (đồng bộ cổng scripts/test/teacher-native.mjs). Ảnh chỉ qua Chars (registry). */
(function (g) {
  const SIZES = { xs: 48, s: 72, m: 112, l: 152, xl: 208 }; // px chiều cao khung (đầu → mặt bệ) – thêm cỡ = sửa docs/CHARACTERS.md + cổng
  // Hình học (ảnh 1108×960, người chiếm y 8 %→100 %): ảnh cao 1,2 khung, đáy ảnh lùi 0,18 khung dưới đáy khung (phần mờ + quần bị khung cắt),
  // dải đáy 0,16 khung (72 %→86 % ảnh, vạt áo) là vùng tiếp đất: 'fade' mờ dần từ 0,34 khung → trong suốt hẳn 0,03 khung trên đáy (trước vết cắt khung),
  // 'card' để mép thẻ che dải này; đầu cách đỉnh khung ~7 %.
  // Khung cắt .tslot-fig chỉ rộng vừa ảnh (ảnh rộng 1,2×1108/960 = 1,385 khung-cao, khung rộng 0,9 → mỗi bên lố 0,243 → lề 0,25) và cao hơn đỉnh 0,1.
  // overflow:clip (không phải hidden): khung hidden là KHUNG CUỘN – scrollIntoView/focus/tìm trong trang cuộn ảnh lên 0,18 khung → thân mờ lộ trên bệ
  // (final-qc streak: ảnh đáy = đáy khung dù bottom -20 px); clip không cuộn được. hidden đứng trước làm dự phòng cho trình duyệt cũ:
  // khung thừa (±60 % cũ) làm tràn ngang màn 360 px khi chỗ giáo viên sát mép thẻ (stitch-diff/final-qc 'tràn ngang tslot-fig').
  const CSS = `.tslot{--h:112px;position:relative;display:inline-block;flex:none;width:calc(var(--h)*.9);height:var(--h);vertical-align:bottom;pointer-events:none;user-select:none;-webkit-user-select:none}
.tslot-xs{--h:48px}.tslot-s{--h:72px}.tslot-m{--h:112px}.tslot-l{--h:152px}.tslot-xl{--h:208px}
.tslot-fig{position:absolute;top:calc(var(--h)*-.1);left:calc(var(--h)*-.25);right:calc(var(--h)*-.25);bottom:0;overflow:hidden;overflow:clip}
.tslot-img{position:absolute;left:50%;bottom:calc(var(--h)*-.18);height:calc(var(--h)*1.2);width:auto;max-width:none;transform:translateX(-50%);transform-origin:50% 100%}
.tslot-flip .tslot-img{transform:translateX(-50%) scaleX(-1)}
canvas.tslot-img{opacity:0;transition:opacity .18s}.tslot.live canvas.tslot-img{opacity:1}.tslot.live img.tslot-img{visibility:hidden}
.tslot-fade .tslot-fig{-webkit-mask-image:linear-gradient(to top,transparent calc(var(--h)*.03),rgb(0 0 0/.55) calc(var(--h)*.15),#000 calc(var(--h)*.34));mask-image:linear-gradient(to top,transparent calc(var(--h)*.03),rgb(0 0 0/.55) calc(var(--h)*.15),#000 calc(var(--h)*.34))}
.tslot-shadow{position:absolute;left:16%;right:16%;bottom:calc(var(--h)*-.04);height:calc(var(--h)*.1);border-radius:50%;background:radial-gradient(closest-side,rgb(15 40 42/.22),rgb(15 40 42/.09) 55%,rgb(15 40 42/0))}
:root[data-theme="dark"] .tslot-shadow{background:radial-gradient(closest-side,rgb(0 0 0/.5),rgb(0 0 0/.2) 55%,rgb(0 0 0/0))}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]) .tslot-shadow{background:radial-gradient(closest-side,rgb(0 0 0/.5),rgb(0 0 0/.2) 55%,rgb(0 0 0/0))}}
@supports not ((-webkit-mask-image:linear-gradient(#000,#000)) or (mask-image:linear-gradient(#000,#000))){.tslot-fade .tslot-fig::after{content:"";position:absolute;left:0;right:0;bottom:0;height:calc(var(--h)*.34);background:linear-gradient(to top,var(--bg) calc(var(--h)*.03),transparent)}}
:root[data-theme="dark"] .tslot-img{filter:brightness(.95) saturate(.96)}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]) .tslot-img{filter:brightness(.95) saturate(.96)}}
@media (prefers-reduced-motion:no-preference){img.tslot-img{animation:tslot-in .18s ease-out both,tslot-breathe 4.2s ease-in-out .2s infinite}.tslot-flip .tslot-img{animation:tslot-in .18s ease-out both}}
@keyframes tslot-in{from{opacity:0}}
@keyframes tslot-breathe{50%{transform:translateX(-50%) scaleY(1.012)}}`;
  // Clip tư thế = H.264 xếp chồng (nửa trên màu, nửa dưới alpha, scripts/teach/build.py) → ghép bằng WebGL như lesson/teacher.js; ảnh tĩnh nằm dưới đến khi có khung đầu.
  const VS = 'attribute vec2 p;varying vec2 v;void main(){v=vec2(p.x*.5+.5,.25-p.y*.25);gl_Position=vec4(p,0.,1.);}';
  const FS = 'precision mediump float;varying vec2 v;uniform sampler2D u;void main(){float a=texture2D(u,v+vec2(0.,.5)).r;gl_FragColor=vec4(min(texture2D(u,v).rgb,vec3(a)),a);}';
  const lite = () => { try { const c = navigator.connection; return !!(c && (c.saveData || /2g/.test(c.effectiveType || ''))) || g.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return true; } };
  const live = el => {
    const fig = el.querySelector('.tslot-fig'), src = el.dataset.clip; el.removeAttribute('data-clip'); if (!fig || !src || lite()) return;
    const cv = document.createElement('canvas'), gl = cv.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: false }); if (!gl) return;
    const sh = (t, x) => { const o = gl.createShader(t); gl.shaderSource(o, x); gl.compileShader(o); return o; }, pr = gl.createProgram();
    gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr); if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return;
    gl.useProgram(pr); gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer()); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const lp = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(lp); gl.vertexAttribPointer(lp, 2, gl.FLOAT, false, 0, 0);
    gl.bindTexture(gl.TEXTURE_2D, gl.createTexture()); for (const k of [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER]) gl.texParameteri(gl.TEXTURE_2D, k, gl.LINEAR);
    for (const k of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T]) gl.texParameteri(gl.TEXTURE_2D, k, gl.CLAMP_TO_EDGE);
    const v = document.createElement('video'); Object.assign(v, { muted: true, playsInline: true, preload: 'metadata', crossOrigin: 'anonymous' }); v.setAttribute('playsinline', '');
    let raf = 0, seen = true, t = 0, ft = -1;
    // chỉ tải texture khi video SANG KHUNG MỚI: clip 24 fps, rAF 60/120 Hz (iPhone ProMotion) → texImage2D(video) thừa 2,5–5×/khung, WebKit chép chậm → rớt khung, tay giật
    const draw = () => { raf = 0; if (!el.isConnected) { v.pause(); v.removeAttribute('src'); return; }
      if (v.readyState >= 2 && v.currentTime !== ft) { ft = v.currentTime; gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, v); gl.viewport(0, 0, cv.width, cv.height); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); el.classList.add('live'); }
      if (!v.paused) raf = requestAnimationFrame(draw); };
    const go = () => { if (seen && v.paused && el.isConnected) ft = -1, v.play().then(() => { if (!raf) raf = requestAnimationFrame(draw); }).catch(() => {}); };
    v.onloadeddata = () => { cv.width = v.videoWidth; cv.height = v.videoHeight / 2; cv.className = 'tslot-img'; cv.setAttribute('aria-hidden', 'true'); fig.appendChild(cv); go(); };
    v.onended = () => { if (el.dataset.loop) { clearTimeout(t); t = setTimeout(() => { v.currentTime = 0; go(); }, +el.dataset.loop); } }; // cử chỉ lặp có nghỉ (tay xuôi đầu/cuối clip → nối liền)
    v.onerror = () => { fig.querySelector('canvas') && cv.remove(); el.classList.remove('live'); }; // lỗi clip → giữ ảnh tĩnh
    // Nhẹ: chỉ tải clip khi khung hiện trên màn (0 byte nếu cuộn qua), ngoài màn thì dừng; SW + cache tĩnh (#302) → lần sau 0 byte
    const load = () => { if (!v.src) v.src = src; };
    if (g.IntersectionObserver) new IntersectionObserver(es => { seen = es[0].isIntersecting; if (seen) { load(); go(); } else v.pause(); }, { rootMargin: '120px' }).observe(el); else load();
  };
  let pend = 0;
  const hydrate = () => { pend = 0; document.querySelectorAll('.tslot[data-clip]').forEach(live); };
  let on = 0;
  const css = () => { if (on || !g.document || !document.head) return; on = 1; const s = document.createElement('style'); s.id = 'tslot-css'; s.textContent = CSS; document.head.appendChild(s); };
  g.TeacherSlot = { SIZES, css };
  const C = g.Chars; if (!C) return;
  // Chars.slot(who, {pose, size:'xs'|'s'|'m'|'l'|'xl', cls, flip, lazy, alt, clip:true = clip tư thế phát 1 lần (ảnh tĩnh dưới đến khung đầu; giảm chuyển động/tiết kiệm dữ liệu → ảnh tĩnh), loop:true|ms = lặp cử chỉ, nghỉ 6 s, ground:'fade' (mặc định – nền trống) | 'card' (đứng sau mép thẻ đục: người gọi cho thẻ đè dải đáy 0,16 khung, cổng runtime kiểm), ground:false cũ = 'fade', style = CSS nội dòng (vd. lề), không đổi hình học})
  C.slot = (w, o = {}) => {
    css();
    const sz = SIZES[o.size] ? o.size : 'm', pose = C.poses.includes(o.pose) ? o.pose : 'talk';
    const im = C.img(w, { kind: 'still', pose, cls: 'tslot-img', alt: o.alt || '', size: SIZES[sz], lazy: o.lazy !== false });
    const gr = o.ground === 'card' ? 'card' : 'fade'; // không có chế độ bệ rời: bệ không thẻ phía sau = khối lơ lửng (chủ 3/11)
    if (o.clip && !pend && g.document) pend = setTimeout(hydrate, 0); // HTML chèn xong mới gắn clip
    return `<span class="tslot tslot-${sz} tslot-${gr}${o.flip ? ' tslot-flip' : ''}${o.cls ? ' ' + o.cls : ''}" data-teacher="${C.id(w)}" data-pose="${pose}" data-ground="${gr}"${o.clip ? ` data-clip="${C.clip(w, pose)}"` : ''}${o.clip && o.loop ? ` data-loop="${o.loop === true ? 6000 : +o.loop}"` : ''}${o.style ? ` style="${o.style}"` : ''}${o.alt ? '' : ' aria-hidden="true"'}>${gr === 'fade' ? '<i class="tslot-shadow"></i>' : ''}<span class="tslot-fig">${im}</span></span>`;
  };
})(self);
