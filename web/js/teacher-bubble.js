/* 💬 TeacherBubble – bong bóng lời giáo viên dùng chung: gõ chữ theo cụm ký tự 1 lần/ngày, CLS 0, 🔊 chỉ khi bấm (giọng nữ), miệng/biểu cảm qua TeacherRig.
 * Hành vi đầy đủ: docs/specs/teacher-bubble.md. Lõi thuần (Node + trình duyệt): TeacherBubble.core – cổng scripts/test/teacher-bubble.mjs. */
(function (g) {
  'use strict';
  const node = typeof module !== 'undefined' && module.exports;
  const CPS = 40;                  // chữ/giây (cụm ký tự) – cổng: 35–45
  const MOUTH_Y = 392 / 960;       // miệng Ama trong ảnh 1108×960 (web/js/call/face.js RIG.ama.mouth) – tỉ lệ chiều cao ảnh
  const MOODS = { greet: { emo: 'happy', gesture: 'wave' }, goal: { emo: 'praise', gesture: 'thumbs_up' }, streak: { emo: 'praise', gesture: 'cheer' }, review: { emo: 'encourage', gesture: null }, plan: { emo: 'explain', gesture: 'point' } };
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));

  /** Tách chuỗi thành cụm ký tự người đọc thấy. Dự phòng (không có Segmenter): Array.from rồi gộp dấu kết hợp (\p{M}) và ZWJ vào ký tự trước. */
  function graphemes(s, lang, noSeg) {
    s = String(s == null ? '' : s);
    if (!noSeg && typeof Intl !== 'undefined' && Intl.Segmenter) { try { return Array.from(new Intl.Segmenter(lang || undefined, { granularity: 'grapheme' }).segment(s), x => x.segment); } catch (e) { /* dùng dự phòng */ } }
    const out = [];
    for (const ch of Array.from(s)) { if (out.length && (/^\p{M}$/u.test(ch) || ch === '‍' || /‍$/.test(out[out.length - 1]))) out[out.length - 1] += ch; else out.push(ch); }
    return out;
  }
  const hash = s => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(36); };
  const day = () => { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };
  const store = { get(k) { try { return g.localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { g.localStorage.setItem(k, v); } catch (e) { /* chế độ riêng tư */ } } };
  /** Đã gõ câu này hôm nay chưa (khóa theo key + băm chữ → câu đổi thì gõ lại) */
  const seen = (key, text) => store.get('lk.tb.' + key) === day() + ':' + hash(text);
  const mark = (key, text) => store.set('lk.tb.' + key, day() + ':' + hash(text));
  /** Thời lượng gõ (ms) của một câu */
  const typeMs = n => Math.round(n * 1000 / CPS);
  const core = { CPS, MOUTH_Y, MOODS, graphemes, hash, typeMs, seen, mark };
  if (node) { module.exports = core; return; }

  const D = g.document;
  const SFX = 'sfx/pop.mp3', JS = 'js/'; // như teach/, js/ khác: tương đối theo <base> của app (add-on: extension/app/)
  const rm = () => { try { return g.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
  const lite = () => { try { const c = navigator.connection; return !!(c && (c.saveData || /2g/.test(c.effectiveType || ''))); } catch (e) { return false; } };
  // trình duyệt tự động hóa (CI) giữ chữ đứng yên như SayText cũ – cổng riêng bật lại bằng localStorage lk.tb = 1
  const bot = () => { try { return !!navigator.webdriver && store.get('lk.tb') !== '1'; } catch (e) { return false; } };
  const muted = () => (g.Core && g.Core.sfxOff) || (g.App && g.App.state && g.App.state.settings && g.App.state.settings.sfx === false);
  const tr = s => (typeof g.t === 'function' ? g.t(s) : s);

  const CSS = `.tb-sr{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);clip-path:inset(50%);white-space:nowrap;border:0}
.tb-h{visibility:hidden}
.tb-snd{display:inline-flex;align-items:center;justify-content:center;vertical-align:middle;width:44px;height:44px;margin:-14px 0 -14px 2px;padding:0;border:0;background:none;color:inherit;cursor:pointer;-webkit-tap-highlight-color:transparent;touch-action:manipulation}
.tb-snd[hidden]{display:inline-flex;visibility:hidden}
.tb-snd i{display:grid;place-items:center;width:30px;height:30px;border-radius:50%;background:color-mix(in srgb,currentColor 12%,transparent)}
.tb-snd:focus-visible{outline:2px solid currentColor;outline-offset:-3px;border-radius:50%}
.tb-snd svg{width:18px;height:18px;fill:currentColor}
.tb-snd .tb-i2,.tb-snd[aria-pressed="true"] .tb-i1{display:none}.tb-snd[aria-pressed="true"] .tb-i2{display:block}
.tb-on[data-tch]{border-style:solid!important;border-color:transparent!important;background:none!important;box-shadow:none!important;overflow:visible}
.tb-on .tslot-ledge{border-radius:calc(var(--h)*.03) calc(var(--h)*.03) calc(var(--h)*.05) calc(var(--h)*.05)}
.tb-on .tslot::after{content:"";position:absolute;left:14%;right:14%;bottom:calc(var(--h)*.12);height:calc(var(--h)*.08);border-radius:50%;background:radial-gradient(closest-side,rgb(0 0 0/.22),rgb(0 0 0/.08) 55%,transparent);pointer-events:none}
.tb-on .tslot-hip::after{bottom:calc(var(--h)*.06)}
.tb-rig{position:absolute;left:50%;bottom:var(--fb);height:var(--fh);width:calc(var(--fh)*1108/960);transform:translateX(-50%);pointer-events:none}
.tb-rig>canvas{width:100%;height:100%}
.tb-live .tslot-img{visibility:hidden}
.tb-b::before{translate:0 var(--tb-d1,0px)}.tb-b::after{translate:0 var(--tb-d2,0px)}
@media (prefers-reduced-motion:no-preference){.tb-on img.tslot-img{animation:tslot-in .18s ease-out both,tb-br 4.2s ease-in-out .2s infinite}}
@keyframes tb-br{50%{transform:translateX(-50%) scaleY(1.006)}}
.tb-paused img.tslot-img{animation-play-state:paused}`;
  const css = () => { if (D.getElementById('tb-css')) return; const s = D.createElement('style'); s.id = 'tb-css'; s.textContent = CSS; D.head.appendChild(s); };
  const ICON = '<i aria-hidden="true"><svg class="tb-i1" viewBox="0 0 24 24"><path d="M3 9v6h4l5 4V5L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 8v8a4.5 4.5 0 0 0 2.5-4zM14 3.2v2.1a7 7 0 0 1 0 13.4v2.1a9 9 0 0 0 0-17.6z"/></svg><svg class="tb-i2" viewBox="0 0 24 24"><path d="M6 6h12v12H6z"/></svg></i>';

  // ---- giọng: chỉ hứa khi thật sự có giọng NỮ cho ngôn ngữ giao diện ----
  /** → { accent } | null. en: Ama = Kokoro af_heart (en-US) qua UI.tts({who:'ama'}); ngôn ngữ khác: chỉ khi máy có giọng nữ (tên giọng → LKAudio.genderOf) */
  function voicePlan() {
    const ui = (g.I18N && g.I18N.lang && g.I18N.lang()) || (D.documentElement.lang || 'en').slice(0, 2);
    if (!g.UI || !g.UI.tts) return null;
    if (ui === 'en') return { accent: 'en-US' };
    const LA = g.LKAudio; if (!LA || !LA.genderOf || !('speechSynthesis' in g)) return null;
    const vs = (speechSynthesis.getVoices() || []).filter(v => String(v.lang || '').toLowerCase().replace('_', '-').split('-')[0] === ui && LA.genderOf(v.name) === 'f');
    return vs.length ? { accent: (LA.rank(vs, vs[0].lang, 'f')[0] || vs[0]).lang.replace('_', '-') } : null;
  }

  // ---- TeacherRig (tải lười, một lần) ----
  let rigLib = null;
  const loadRig = () => rigLib || (rigLib = g.TeacherRig ? Promise.resolve() : (g.App && g.App.loadScript ? g.App.loadScript('js/teacher-rig.js') : new Promise((ok, no) => { const s = D.createElement('script'); s.src = JS + 'teacher-rig.js'; s.onload = ok; s.onerror = no; D.head.appendChild(s); })).then(() => { if (!g.TeacherRig) throw new Error('rig'); })).catch(e => { rigLib = null; throw e; });
  /** Đồng hồ trang giả dạng phần tử audio (rig.speak(audio…) chỉ cần currentTime/paused/ended/readyState/sự kiện 'ended') – end() chủ động khép miệng */
  function pageClock(dur) {
    const t0 = performance.now(), L = [], c = { paused: false, ended: false, readyState: 4, duration: dur, get currentTime() { return (performance.now() - t0) / 1000; },
      addEventListener(t, f) { if (t === 'ended') L.push(f); }, end() { if (c.ended) return; c.ended = true; L.splice(0).forEach(f => f()); } };
    return c;
  }
  let curCtl = null;

  /** attach({ root, textEl, slotEl, pointerEl?, bubbleEl?, who, text, mood, key }) → { finish(), speak(audio, visemes, text), destroy(), stats } */
  function attach(o) {
    if (curCtl) curCtl.destroy();
    const textEl = o.textEl; if (!textEl || !textEl.isConnected) return null;
    css();
    const who = o.who || 'ama', mood = MOODS[o.mood] ? o.mood : 'plan', text = String(o.text != null ? o.text : textEl.textContent).trim(), key = o.key || 'bubble';
    const slot = o.slotEl || null, cell = slot && (slot.closest('[data-tch]') || slot.parentElement), bubble = o.bubbleEl || (textEl.parentElement && (textEl.parentElement.closest('.relative') || textEl.parentElement));
    const G = graphemes(text, D.documentElement.lang), offs = []; { let n = 0; for (const x of G) { n += x.length; offs.push(n); } }
    const stats = { typed: false, shown: 0, graphemes: G.length, frames: 0, voice: false, idle: 0 };
    const typing = !bot() && !rm() && !lite() && !seen(key, text);
    let dead = false, done = !typing, shown = 0, raf = 0, tm = 0, rig = null, rigP = null, rigWant = false, tClock = null, queued = typing ? MOODS[mood].gesture : null;
    let playing = false, restore = null, vSeq = 0, vTimer = 0, vSafe = 0, lastEl = null;

    // --- DOM: chữ đã gõ + phần chờ (cùng 1 dòng văn bản → xuống dòng y hệt bản đầy đủ → không xô bố cục), bản đọc 1 lần cho trình đọc màn hình ---
    textEl.textContent = '';
    const vis = D.createElement('span'), vv = D.createElement('span'), hh = D.createElement('span'), tn1 = D.createTextNode(typing ? '' : text), tn2 = D.createTextNode(typing ? text : '');
    vis.setAttribute('aria-hidden', 'true'); hh.className = 'tb-h'; vv.appendChild(tn1); hh.appendChild(tn2); vis.append(vv, hh); textEl.appendChild(vis);
    if (!textEl.hasAttribute('dir')) textEl.dir = 'auto'; const sr = D.createElement('span'); sr.className = 'tb-sr sr-only'; sr.dir = 'auto'; sr.setAttribute('role', 'status'); sr.setAttribute('aria-live', 'polite'); (textEl.parentNode).insertBefore(sr, textEl.nextSibling);
    const announce = setTimeout(() => { if (!dead) sr.textContent = text; }, 60);
    const btn = D.createElement('button'); btn.type = 'button'; btn.className = 'tb-snd'; btn.hidden = true; btn.innerHTML = ICON; btn.setAttribute('aria-pressed', 'false'); textEl.appendChild(btn); // cùng bề rộng với chỗ giữ .tb-snd-slot (TeacherBubble.SLOT) mà trang chèn trước khi nạp → gắn không xô bố cục
    const label = () => { const s = tr(playing ? 'Dừng Ama đọc' : 'Nghe Ama đọc'); btn.setAttribute('aria-label', s); btn.title = s; };
    const plan = () => { const p = voicePlan(); btn.hidden = !p; return p; };
    plan(); label();
    if ('speechSynthesis' in g && speechSynthesis.addEventListener) speechSynthesis.addEventListener('voiceschanged', plan);
    if (cell) cell.classList.add('tb-on'); if (bubble) bubble.classList.add('tb-b');

    // --- mũi nhọn bong bóng thẳng hàng miệng Ama (đo hộp ảnh 1 lần/khi đổi cỡ, ngoài vòng gõ) ---
    const pointers = bubble ? [...(o.pointerEl ? [].concat(o.pointerEl) : bubble.querySelectorAll(':scope > div.absolute'))].filter(p => /(^|\s)-left-/.test(p.className)) : [];
    let placeRaf = 0;
    const place = () => { placeRaf = 0; if (dead || !slot || !bubble) return; const im = slot.querySelector('.tslot-img'); if (!im) return; const r = im.getBoundingClientRect(), b = bubble.getBoundingClientRect(); if (!r.height || !b.height) return;
      const py = Math.round(clamp(r.top + r.height * MOUTH_Y - b.top, 14, b.height - 14)); bubble.style.setProperty('--tb-py', py + 'px');
      for (const p of pointers) { p.style.translate = ''; const pr = p.getBoundingClientRect(); p.style.translate = '0 ' + Math.round(b.top + py - (pr.top + pr.height / 2)) + 'px'; }
      for (const [ps, k, off] of [['::before', '--tb-d1', 8], ['::after', '--tb-d2', 7]]) { const t = parseFloat(g.getComputedStyle(bubble, ps).top); if (!isNaN(t)) bubble.style.setProperty(k, Math.round(py - off - t) + 'px'); } };
    const replace = () => { if (!placeRaf) placeRaf = requestAnimationFrame(place); };
    replace();
    let ro = null; if (g.ResizeObserver && bubble) { ro = new ResizeObserver(replace); ro.observe(bubble); }
    g.addEventListener('resize', replace);

    // --- rig: vòng nghỉ + miệng + biểu cảm ---
    const useRig = slot && !bot() && !rm() && !lite();
    if (slot && useRig) { slot.removeAttribute('data-clip'); slot.removeAttribute('data-webm'); } // rig thay clip nghỉ (clip + rig = hai vòng lặp chồng) – gỡ trước khi teacher-slot nạp clip
    const ensureRig = () => rigP || (slot ? (rigP = loadRig().then(() => {
      if (dead) return null;
      const host = D.createElement('div'); host.className = 'tb-rig'; (slot.querySelector('.tslot-fig') || slot).appendChild(host);
      rig = g.TeacherRig.mount(host, who, {});
      return rig.ready.then(() => { if (dead) return null; slot.classList.add('tb-live'); rig.setEmotion(MOODS[mood].emo); sync(); if (typing && !done) lipType(); replace(); return rig; });
    }).catch(() => { rigP = null; return null; })) : Promise.resolve(null));
    // tạm dừng vòng nghỉ khi tab ẩn / ngoài màn (rAF của rig + hoạt ảnh CSS dừng hẳn – 0 CPU)
    let inView = true; const sync = () => { const on = inView && !D.hidden; if (rig && rig.pause) rig.pause(!on); if (cell) cell.classList.toggle('tb-paused', !on); stats.paused = !on; };
    const io = g.IntersectionObserver && cell ? new IntersectionObserver(es => { inView = es[es.length - 1].isIntersecting; if (!cell.isConnected) return destroy(); sync(); }) : null; if (io) io.observe(cell);
    const vc = () => { if (D.hidden && !done) finish(); sync(); }; D.addEventListener('visibilitychange', vc);

    const lipType = () => { if (!rig || tClock || done) return; const rest = Math.max(1, G.length - shown); tClock = pageClock(Math.max(0.3, rest / CPS)); rig.speak(tClock, null, { text: text.slice(shown ? offs[shown - 1] : 0), dur: tClock.duration }); };
    const lipStop = () => { if (tClock) { const c = tClock; tClock = null; c.end(); } };

    // --- gõ chữ ---
    const paint = n => { shown = n; const at = n ? offs[n - 1] : 0; tn1.nodeValue = text.slice(0, at); tn2.nodeValue = text.slice(at); stats.shown = n; };
    let off = () => {};
    function finish() {
      if (done) return; done = true; clearTimeout(tm); cancelAnimationFrame(raf); paint(G.length); off(); lipStop();
      if (queued && rig) { const q = queued; queued = null; rig.gesture(q); }
    }
    if (typing) {
      stats.typed = true; mark(key, text);
      const t0 = performance.now(); let typeStep;
      typeStep = () => { if (done || dead) return; clearTimeout(tm); cancelAnimationFrame(raf); stats.frames++;
        const want = Math.min(G.length, Math.floor((performance.now() - t0) * CPS / 1000) + 1); if (want > shown) paint(want);
        if (shown >= G.length) return finish();
        raf = requestAnimationFrame(typeStep); tm = setTimeout(typeStep, 120); }; // rAF khi thấy được; setTimeout dự phòng (tab ẩn → rAF dừng, chữ không kẹt)
      const kd = e => { if (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return; if (e.target.closest && e.target.closest('.tb-snd')) return finish(); e.preventDefault(); finish(); };
      if (bubble) { bubble.addEventListener('click', kd); bubble.addEventListener('keydown', kd); bubble.tabIndex = 0; bubble.setAttribute('role', 'group'); }
      off = () => { if (bubble) { bubble.removeEventListener('click', kd); bubble.removeEventListener('keydown', kd); bubble.removeAttribute('tabindex'); bubble.removeAttribute('role'); } };
      if (!muted()) { try { const a = new Audio(SFX); a.dataset.lkMix = '1'; a.volume = 0.6; const p = a.play(); if (p && p.catch) p.catch(() => {}); } catch (e) { /* trình duyệt chặn tự phát – im lặng */ } }
      paint(0); typeStep();
    }
    if (useRig) { const idle = g.requestIdleCallback || (f => setTimeout(f, 200)); idle(() => { if (!dead) ensureRig(); }); }

    // --- 🔊 Ama đọc (chỉ khi bấm) ---
    const setPlaying = on => { playing = on; btn.setAttribute('aria-pressed', on ? 'true' : 'false'); label(); stats.voice = on; };
    function speakLip(audio, visemes, line) { // đường nói của bong bóng: miệng bám đồng hồ của audio (file giọng) hoặc đồng hồ trang (giọng máy)
      finish(); lipStop();
      return ensureRig().then(r => { if (!r || dead) return; lastEl = audio; return r.speak(audio, visemes || null, { text: line || text }); });
    }
    function endVoice() { vSeq++; clearTimeout(vTimer); clearTimeout(vSafe); if (restore) { restore(); restore = null; } if (lastEl && lastEl.end) lastEl.end(); lastEl = null; setPlaying(false); if (rig) rig.quiet(); }
    function capture(on) { // bắt phần tử Audio giọng Kokoro (UI.tts không đưa ra) – chỉ trong lúc đọc, trả lại play gốc ngay khi xong
      const P = g.HTMLMediaElement.prototype, orig = P.play; let live = true;
      const w = function () { if (live && this.tagName === 'AUDIO' && !(this.dataset && this.dataset.lkMix) && /\/audio\/[lw]\//.test(this.currentSrc || this.src || '')) { try { on(this); } catch (e) { /* bỏ qua */ } } return orig.apply(this, arguments); };
      P.play = w; return () => { live = false; if (P.play === w) P.play = orig; };
    }
    function startVoice() {
      const p = plan(); if (!p) return; finish();
      const clean = text.replace(/^[“"«]+|[”"»]+$/g, ''); let pend = clean, got = 0;
      setPlaying(true); ensureRig();
      restore = capture(el => { got = vSeq + 'a'; speakLip(el, null, pend); });
      const my = ++vSeq;
      g.UI.tts(clean, p.accent, undefined, { who: 'ama', gender: 'f',
        onSentence: (i, s) => { pend = s || clean; got = 0; clearTimeout(vTimer); vTimer = setTimeout(() => { if (my === vSeq && !got) { const c = pageClock(Math.max(0.6, String(pend).length * 0.065)); if (lastEl && lastEl.end) lastEl.end(); speakLip(c, null, pend); } }, 90); },
        onEnd: () => { if (my === vSeq) endVoice(); }, onErr: () => { if (my === vSeq) endVoice(); } });
      vSafe = setTimeout(() => { if (my === vSeq) { if (g.UI.stopSpeak) g.UI.stopSpeak(); endVoice(); } }, 90000);
    }
    btn.addEventListener('click', e => { e.stopPropagation(); if (playing) { if (g.UI.stopSpeak) g.UI.stopSpeak(); endVoice(); } else startVoice(); });

    function destroy() {
      if (dead) return; dead = true; clearTimeout(tm); clearTimeout(announce); cancelAnimationFrame(raf); cancelAnimationFrame(placeRaf); off();
      if (playing) { if (g.UI && g.UI.stopSpeak) g.UI.stopSpeak(); endVoice(); }
      if (io) io.disconnect(); if (ro) ro.disconnect(); g.removeEventListener('resize', replace); D.removeEventListener('visibilitychange', vc);
      if ('speechSynthesis' in g && speechSynthesis.removeEventListener) speechSynthesis.removeEventListener('voiceschanged', plan);
      if (rig) rig.destroy(); if (curCtl === ctl) curCtl = null;
    }
    const ctl = { finish, speak: speakLip, destroy, stats, rig: () => rig, ready: () => (useRig ? ensureRig() : Promise.resolve(null)), place, button: btn };
    if (g.App && g.App.onCleanup) g.App.onCleanup(destroy);
    return (curCtl = ctl);
  }

  g.TeacherBubble = { attach, core, graphemes, voicePlan };
})(typeof self !== 'undefined' ? self : this);
