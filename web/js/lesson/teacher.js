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
  // 23/11 (LCP #/lesson/go): mặt vẽ + mốc (~100 KB nén, cues.js 62 KB) KHÔNG nạp trước khi ảnh poster (phần tử LCP) hiện – lipLoad(rig) chờ poster tải xong (+60 ms, tối đa 2,5 s) rồi mới nạp;
  // câu đầu vẫn chờ tối đa 2 s cho cổng (gate) như cũ nên vẫn khớp miệng. Công tắc tắt khẩn (về nạp ngay như trước): localStorage lk.lipEarly=1 hoặc cfg công khai lip_early.
  const lipEarly = () => { try { if (localStorage.getItem('lk.lipEarly') === '1') return true; const c = JSON.parse(localStorage.getItem('lk.cfg') || 'null'), v = c && c.v && c.v.lip_early; return v === true || v === '1' || v === 'true'; } catch (e) { return false; } };
  const posterReady = rig => new Promise(r => { const im = rig && rig.querySelector && rig.querySelector('img.tch-poster'); let t = setTimeout(r, 2500); const done = () => { clearTimeout(t); setTimeout(r, 60); };
    if (!im || im.complete) done(); else { im.addEventListener('load', done, { once: true }); im.addEventListener('error', done, { once: true }); } });
  // tải SONG SONG, chạy ĐÚNG THỨ TỰ (async=false; teacher-rig.js cuối) – face.js đọc LipSync/LipMouth lúc nạp; nhanh hơn nạp nối tiếp để câu đầu kịp mốc CI (pre)
  const lipFetch = () => Promise.all(['call/lipsync', 'call/mouths', 'call/face', 'call/paint', 'call/cues', 'teacher-rig'].map(f => new Promise((ok, no) => { const s = D.createElement('script'); s.async = false; s.src = 'js/' + f + '.js'; s.onload = ok; s.onerror = no; D.head.appendChild(s); })))
    .then(() => { if (g.LK_CUES && g.LK_CUES.dict) g.LipSync.setDict(g.LK_CUES.dict); }, e => { lipP = null; throw e; });
  const lipLoad = (rig, force) => lipP || (lipP = ((force || lipEarly() || !rig) ? Promise.resolve() : posterReady(rig)).then(lipFetch));
  // Lớp mặt vẽ = TeacherRig (web/js/teacher-rig.js, MỘT lõi dùng chung Call/bài học/video; spec docs/specs/teacher-rive-rig.md): MỘT <canvas> phủ đúng khung poster
  // (contain, căn đáy – CSS .tch-face), đầu trơn + lớp vector, khớp xương cứng, 0 thay đổi DOM mỗi khung, chỉ vẽ khi trạng thái đổi. Mặt này chỉ là bộ chuyển (adapter): onFail → vòng clip.
  // Biểu cảm cũ (cheer/concern) → tên của rig (praise/sad)
  const EMO = { cheer: 'praise', concern: 'sad' };
  function face(rig, who, onFail) {
    let held = null, idleEmo = '', timer = 0, dead = false;
    if (!D.getElementById('tch-face-css')) D.head.insertAdjacentHTML('beforeend', '<style id="tch-face-css">.tch-rig .tch-face{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;object-position:50% 100%;pointer-events:none}.tch-rig[data-face]>img.tch-poster{visibility:hidden}.tch-rig.posed .tch-face{visibility:hidden}</style>');
    const R = g.TeacherRig.mount(rig, who, { bare: true, cls: 'tch-face', onFail: () => { if (!dead) { dead = true; onFail(); } } }), name = e => (e ? EMO[e] || (g.TeacherRig.core.EMOTIONS[e] ? e : '') : '') || 'neutral';
    R.ready.then(() => { if (!dead) rig.dataset.face = who; }, () => {}); // data-face (không thêm class: giữ khóa bố cục .tch-rig của các cổng QA) · ẩn poster khi canvas đã sẵn sàng
    // QA (final-qc): tư thế của mặt vẽ = biểu cảm đang thể hiện
    const setIdle = emo => { idleEmo = emo; const ps = held && held[0] === emo ? held[1] : emo; if (ps && ps !== 'listen') rig.dataset.pose = ps; else delete rig.dataset.pose; R.setEmotion(name(emo)); };
    const rest = () => setIdle(held ? held[0] : '');
    const self = {
      stats: R.stats,
      cue: key => { const c = g.LK_CUES && g.LK_CUES.k[key]; return c || null; },
      tap: () => R.tap(),
      /** src: { audio?, cue?, text, dur? } – audio + cue → pre; còn lại → live (năng lượng tiếng qua AnalyserNode nếu nối được, không thì theo lúc đang phát) */
      speak(src) { if (!dead) R.speak(src.audio || null, src.cue || null, { text: src.text, dur: src.dur }); },
      quiet() { R.quiet(); },
      /** listen(true): người học đang nói → mắt nhìn người học, mày hơi nhướng, gật nhẹ theo nhịp; false → nghỉ thường */
      listen(on) { if (dead) return; if (on) R.quiet(); clearTimeout(timer); setIdle(on ? 'listen' : held ? held[0] : ''); },
      hold(emo, nm) { if (dead) return; held = emo && name(emo) !== 'neutral' ? [emo, nm || emo] : null; clearTimeout(timer); setIdle(held ? emo : ''); },
      /** react('happy'|'encourage'|'praise'|'sad'|'thinking', ms): biểu cảm ngắn (đúng/sai) – câu nói kế tiếp mang theo biểu cảm đó */
      react(emo, ms = 1800) { if (dead || name(emo) === 'neutral') return; clearTimeout(timer); setIdle(emo); timer = setTimeout(() => { if (!dead && idleEmo !== 'listen') rest(); }, ms); },
      /** gesture(nod|shake|thumbs_up|clap|…): cử chỉ của rig (thủ tục hoặc ảnh tư thế đã duyệt; đang nói thì xếp hàng tới hết câu) */
      gesture(nm) { return dead ? null : R.gesture(nm); },
      state: () => { const f = R.state(); return f && f.s; },
      destroy() { dead = true; clearTimeout(timer); R.destroy(); delete rig.dataset.face; delete rig.dataset.pose; }
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
      gate = lipLoad(rig).then(() => { if (dead) return; fc = face(rig, who, () => { fc = null; clips(); }); if (hq && hq.el && !hq.el.paused) fc.speak({ audio: hq.el, text: lastTxt }); }, clips).then(() => { gate = null; });
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
    // bong bóng của sân khấu (stage): lời đang nói; o.show = chữ hiện thay lời (vd. '🔊 · · ·' khi câu là đáp án), false = giữ nguyên bong bóng
    const sg = el.parentElement && el.parentElement.classList.contains('tstage') ? el.parentElement : null, bub = sg && sg.querySelector('.tstage-bub'), btx = bub && bub.firstChild;
    if (sg) sg.dataset.who = who;
    const line = s => { if (!bub) return null; const v = String(s == null ? '' : s); if (btx.textContent === v && !bub.hidden) return btx; btx.textContent = v; bub.hidden = !/[\p{L}\p{N}]/u.test(v); bub.classList.remove('in'); void bub.offsetWidth; bub.classList.add('in'); return btx; };
    const api = {
      who,
      lip: () => (fc ? fc.stats : null), // số khung mặt vẽ (test e2e đo fps)
      line, // bong bóng sân khấu: đặt lời hiện (đề bài / lời khen) – null khi không ở sân khấu
      // pose('cheer'|'concern'…): ảnh tĩnh tư thế (đầu→hông) thay người đang đứng NGAY chỗ cũ (phản hồi đúng/sai); pose(null) → trả lại vòng nghe/nói sống
      // mặt vẽ: tư thế ảnh tĩnh (tài sản có sẵn) + biểu cảm tương ứng trên mặt vẽ; nói trong lúc đang tư thế → bỏ ảnh tĩnh để miệng vẽ khớp tiếng (không nói bằng ảnh tĩnh ngậm miệng)
      listen(on) { if (fc) fc.listen(on); },
      gesture(nm) { return fc ? fc.gesture(nm) : null; }, // cử chỉ rig (nod/thumbs_up/…) – chỉ khi mặt vẽ đang chạy (vòng clip/poster: không đổi)
      react(emo, ms) { if (fc) fc.react(emo, ms); },
      pose(p) { let im = rig.querySelector('.tch-still'); if (fc) fc.hold(p ? g.Chars.POSE_EMO[p] || p : null, p); if (!p) { if (im) im.remove(); rig.classList.remove('posed'); return; }
        if (im) im.src = Chars.still(who, p); else { rig.insertAdjacentHTML('beforeend', Chars.img(who, { kind: 'still', pose: p, cls: 'tch-still', alt: '', size: 384 })); }
        rig.classList.add('posed'); },
      // o.voice (Kokoro, vd. af_heart): phát mp3 sinh sẵn trên CI (audio.lexkite.com, khóa KVoice.lineKey) – vòng nói chạy đúng độ dài file; thiếu file → giọng máy
      say(text, o = {}) {
        lastTxt = text; // mặt vẽ đang nạp (gate): nói NGAY (không trễ câu đầu); nạp xong → mặt vẽ bám phần tử đang phát (live)
        if (fc && rig.classList.contains('posed')) { const im = rig.querySelector('.tch-still'); if (im) im.remove(); rig.classList.remove('posed'); } // nói: bỏ ảnh tĩnh, mặt vẽ giữ biểu cảm tư thế (fc.hold) tới pose(null)
        const my = ++run, rate = o.rate || 0.95;
        let back = null; if (bub && o.show !== false) { back = o.show != null ? btx.textContent : null; const tx = line(o.show != null ? o.show : text); if (!o.caption && o.show == null && g.SayText && g.SayText.prep) o = Object.assign({}, o, { caption: g.SayText.prep(tx) }); }
        if (capNow && capNow !== o.caption) capNow.all(); const cap = capNow = o.caption || null; // chữ chạy theo lời (SayText, say-text.js)
        let ended = false; const end = () => { if (ended) return; ended = true; if (cap) cap.all(); if (back !== null && btx.textContent === o.show) line(back); if (my === run) { run++; talking(false); if (fc) fc.quiet(); } if (o.onEnd) o.onEnd(); };
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
  // 🎭 Sân khấu giáo viên (teacher-slot chuẩn, chủ 10/11 "to, tự nhiên, chuyên nghiệp"): người cao 192 px khung (~160 px thấy được) đứng SAU mặt thẻ Stitch kế tiếp
  // (thẻ che hông – không bệ giả, không mặt nạ), bong bóng lời bên cạnh, đuôi trỏ đúng tầm miệng (0,4 khung), chữ chạy theo giọng (SayText). Lề theo dáng từng người
  // (Carlos vai rộng ~0,9 khung, Ama ~0,4). Thở / khen (nhún) / sửa nhẹ (nghiêng) / đổi tư thế mờ dần: chỉ transform/opacity, tắt khi giảm chuyển động. Cổng: lesson.mjs, final-qc.
  const STAGE_CSS = `.tstage{--th:192px;--tw:calc(var(--th)*1.154);position:relative;display:flex;align-items:flex-start;width:100%;height:var(--th)}
.tstage>.tch.tstage-tch{position:relative;inset:auto;flex:none;width:var(--tw);height:var(--th);margin-block:0;margin-inline:-12px calc(var(--tw)*-.3 + 10px);transform-origin:50% 100%}
.tstage[data-who=carlos]>.tch.tstage-tch{margin-inline-end:calc(var(--tw)*-.36 + 10px)}
.tstage .tch-rig{filter:none;transform-origin:50% 100%}
.tstage-bub{position:relative;z-index:1;flex:1 1 auto;min-width:0;margin:calc(var(--th)*.4 - 25px) 0 0;padding:10px 14px;border-radius:18px;border:2px solid #EADEC8;background:#fff;color:#10191B;box-shadow:0 3px 0 #D8CFBC;font-size:17px;line-height:1.35;font-weight:700;overflow-wrap:anywhere}
.tstage-bub::before{content:"";position:absolute;inset-inline-start:-8.5px;top:18px;width:13px;height:13px;background:inherit;border:2px solid;border-color:inherit;border-top:0;border-right:0;border-bottom-left-radius:3px;transform:rotate(45deg)}
[dir=rtl] .tstage-bub::before{transform:rotate(-135deg)}
:root[data-theme=dark] .tstage-bub{background:#162528;border-color:#213438;color:#EAF2F2;box-shadow:0 3px 0 #0d1a1e}
@media (prefers-color-scheme:dark){:root:not([data-theme=light]) .tstage-bub{background:#162528;border-color:#213438;color:#EAF2F2;box-shadow:0 3px 0 #0d1a1e}}
@media (prefers-reduced-motion:no-preference){.tstage .tch-rig{animation:tst-br 4.2s ease-in-out infinite}.tstage>.tch.nod{animation:tst-hop .5s cubic-bezier(.3,1.5,.5,1)}.tstage>.tch.shake{animation:tst-sway .6s ease-in-out}
.tstage-bub.in{animation:tst-pop .22s cubic-bezier(.2,.9,.3,1.2)}.tstage .tch-still{animation:tst-fade .2s ease-out}}
@keyframes tst-br{50%{transform:scale(1.006,1.012)}}@keyframes tst-hop{40%{transform:translateY(-7px)}75%{transform:translateY(1px)}}
@keyframes tst-sway{30%{transform:rotate(-2deg)}65%{transform:rotate(1.4deg)}}@keyframes tst-pop{from{opacity:0;transform:scale(.94) translateY(4px)}}@keyframes tst-fade{from{opacity:0}}`;
  /** stage(id) → HTML khung sân khấu (đặt vào chỗ giáo viên của mẫu Stitch); mount(#id) sau đó tự nhận bong bóng (api.line, say hiện lời). Mặt thẻ ngay sau phải che 32 px đáy khung. */
  const stageHTML = id => { if (!D.getElementById('tch-stage-css')) D.head.insertAdjacentHTML('beforeend', `<style id="tch-stage-css">${STAGE_CSS}</style>`);
    return `<div class="tstage"><div id="${id}" class="tstage-tch"></div><p class="tstage-bub" aria-hidden="true" hidden><span class="tstage-txt"></span></p></div>`; };
  const VOICE = { ama: g.Chars.voice('ama'), carlos: g.Chars.voice('carlos') }; // giọng app của giáo viên – chỉ qua Chars (registry), cùng giọng scripts/gen-audio.mjs sinh cho truyện/radio
  /** prep(): nạp trước mặt vẽ + mốc ở màn ngay TRƯỚC khi giáo viên nói (đổ chuông Call, vào bài học) – Home/Today không gọi */
  // prep(force): Call (đổ chuông) gọi prep(true) → nạp ngay; bài học KHÔNG nạp sớm (mount() nạp sau khi poster hiện) trừ khi bật lk.lipEarly
  const prep = force => { try { if (lipOn() && !saveData() && (force === true || lipEarly())) lipLoad(null, true).catch(() => {}); } catch (e) { /* bỏ qua */ } };
  g.LessonTeacher = { mount, lite, VOICE, prep, stage: stageHTML };
})(self);
