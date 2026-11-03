/* 👩‍🏫 Ama / Carlos đọc lời nhắc trong bài học – clip PHÔNG XANH đã tách nền PRO (scripts/teach/build.py, CI teach-build.yml), nền trong suốt, đủ đầu.
 * Đang nói → vòng "talk" (miệng thật của clip, khớp nhịp), im/nghe → vòng "listen"; trộn 160 ms trong CÙNG 1 canvas (không 2 lớp chồng nhau).
 * Video H.264 "xếp chồng" (nửa trên màu đã nhân alpha, nửa dưới alpha) → WebGL ghép thành nền trong suốt: mọi trình duyệt, giải mã phần cứng.
 * Hạ cấp: saveData / giảm chuyển động / không WebGL / thiếu tài sản → poster.webp (alpha) tĩnh. Tài sản: chỉ qua Chars (poster, clip talk/listen). */
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

  /** mount(el, who) → { say(text, { rate, voice, onEnd }), stop(), destroy(), who } */
  function mount(el, who) {
    who = Chars.id(who); // nhân vật + tài sản: chỉ qua Chars (web/js/characters.js, nguồn web/teach/characters.json)
    el.classList.add('tch'); el.innerHTML = `<div class="tch-rig">${Chars.img(who, { cls: 'tch-poster', kind: 'poster', size: 384 })}</div>`;
    const rig = el.firstChild;
    rig.firstChild.onerror = () => { el.style.display = 'none'; }; // thiếu tài sản (vd. bản add-on không kèm teach/) → ẩn giáo viên, bài vẫn chạy
    let run = 0, dead = false, want = 0, mix = 0, draw = null, raf = 0, last = 0, lastK = '';
    const V = [];
    if (!lite()) {
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
      // pose('cheer'|'concern'…): ảnh tĩnh tư thế (đầu→hông) thay người đang đứng NGAY chỗ cũ (phản hồi đúng/sai); pose(null) → trả lại vòng nghe/nói sống
      pose(p) { let im = rig.querySelector('.tch-still'); if (!p) { if (im) im.remove(); rig.classList.remove('posed'); return; }
        if (im) im.src = Chars.still(who, p); else { rig.insertAdjacentHTML('beforeend', Chars.img(who, { kind: 'still', pose: p, cls: 'tch-still', alt: '', size: 384 })); }
        rig.classList.add('posed'); },
      // o.voice (Kokoro, vd. af_heart): phát mp3 sinh sẵn trên CI (audio.lexkite.com, khóa KVoice.lineKey) – vòng nói chạy đúng độ dài file; thiếu file → giọng máy
      say(text, o = {}) {
        const my = ++run, rate = o.rate || 0.95;
        const est = o.dur || Math.max(0.6, String(text || '').length * 0.065 / rate);
        // ⏱️ tiến độ lời (karaoke + vòng nút nghe lại): đồng hồ = currentTime của file Kokoro; giọng máy → đồng hồ tường theo thời lượng ước tính. 1 rAF, chỉ gọi khi đổi ≥0.5%
        let ended = false, t0 = 0, pf = -1, praf = 0;
        const prog = () => { if (ended || my !== run) return; const a = hq && hq.el, d = a && a.duration;
          const f = Math.min(1, d && isFinite(d) && d > 0 ? Math.max(0, a.currentTime - LEAD) / Math.max(0.2, d - 2 * LEAD) : t0 ? (performance.now() - t0) / (est * 1000) : 0);
          if (Math.abs(f - pf) >= 0.005) { pf = f; try { o.onTick(f); } catch (e) { /* bỏ qua */ } } praf = requestAnimationFrame(prog); };
        const go = () => { if (!t0 && o.onTick) { t0 = performance.now(); prog(); } };
        const end = () => { if (ended) return; ended = true; cancelAnimationFrame(praf); if (o.onTick) try { o.onTick(1); } catch (e) { /* bỏ qua */ } if (my === run) { run++; talking(false); } if (o.onEnd) o.onEnd(); };
        talking(true);
        const tts = () => {
          if (my !== run) return;
          const dur = est; go();
          const kv = g.LKAudio && g.LKAudio.kokoro(o.voice); // giọng máy dự phòng đúng người nói: Ama nữ, Carlos nam, đúng UK/US
          if (g.UI && g.UI.tts) { const t0 = Date.now(); g.UI.tts(text, o.accent || (kv && kv.accent) || 'en-US', rate, { voice: o.voice, onEnd: () => { const used = Date.now() - t0; if (used < 300 && my === run) setTimeout(end, Math.max(0, dur * 1000 - used)); else end(); } }); } else setTimeout(end, dur * 1000); // máy không có giọng → onEnd tức thì: giữ vòng nói đủ thời lượng ước tính (khớp miệng)
        };
        if (hq) { hq.stop(); hq = null; }
        // không có file cả câu (chỉ mục LISTEN_AUDIO) → UI.tts: thử file từng câu cùng giọng rồi mới tới giọng máy (không tải 404 qua mọi gốc CDN)
        if (!o.voice || !g.KVoice || !g.audioUrls || !g.LKAudio || (g.LISTEN_AUDIO && !g.LISTEN_AUDIO.has(g.KVoice.lineKey(o.voice, text)))) return tts();
        // LKAudio: thử lần lượt các gốc CDN (lỗi/404/quá giờ → gốc kế tiếp), hết gốc → giọng máy (ghi nhật ký dự phòng)
        const h = hq = g.LKAudio.play(g.audioUrls(g.KVoice.lineKey(o.voice, text)), { rate: rate < 0.9 ? SLOW : 1, // 🐢 nghe chậm 0,75×
          onBase: () => g.audioFail && g.audioFail(), onEnd: end, onStart: go,
          onFail: why => { if (hq === h) { hq = null; g.LKAudio.note('tts', why + ' ' + o.voice); tts(); } } });
      },
      stop() { run++; talking(false); if (hq) { hq.stop(); hq = null; } try { if (g.UI && g.UI.stopSpeak) g.UI.stopSpeak(); } catch (e) { /* bỏ qua */ } },
      destroy() { dead = true; run++; if (hq) { hq.stop(); hq = null; } cancelAnimationFrame(raf); for (const v of V) { if (v) try { v.pause(); v.removeAttribute('src'); v.load(); } catch (e) { /* bỏ qua */ } } el.innerHTML = ''; },
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
    '.kwp .kw{color:var(--kw0);transition:color .12s linear;border-radius:4px;cursor:pointer;-webkit-tap-highlight-color:transparent}.kwp .kw.on{color:inherit}.kwp .kw:focus-visible{outline:2px solid #2BA39A;outline-offset:1px}' +
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
      cc(on) { el.classList.toggle('kw-off', !on); },
    };
    api.cc(ccOn());
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
      const ok = r.width > 0 && who.style.display !== 'none' && r.bottom > c.top - 8; tail.hidden = !ok; if (!ok) return;
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
  g.LessonTeacher = { mount, lite, VOICE, SLOW, bubble, kara, weights, wordAt };
})(self);
