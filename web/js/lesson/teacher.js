/* 👩‍🏫 Ama / Carlos đọc lời nhắc trong bài học – viseme sprite (pilot B, PR #151: docs/mocks/teacher-pilot/b-sprite.html, docs/LESSON-ENGINE.md §4).
 * Thân/đầu/chớp mắt = vòng lặp 3 s của chính clip giáo viên; miệng = 10 hình Rhubarb (X A B C1 C D E F G H) đặt lên mặt, bám theo từng khung (track).
 * Câu động (từ của người học) → miệng chạy theo chữ (LessonEngine.visemes) trong lúc UI.tts đọc; có cue sinh sẵn ({ cues:[[t,v]], dur }) thì dùng cue.
 * Hạ cấp: saveData / prefers-reduced-motion / thiếu tài sản → ảnh poster tĩnh, bài vẫn chạy. Tài sản: teach/<who>/{poster.jpg,loop.mp4,mouths.webp,sprite.json} ≤ 180 KB. */
(function (g) {
  const D = g.document;
  const lite = () => { try { const c = navigator.connection; return !!(c && (c.saveData || /2g/.test(c.effectiveType || ''))) || g.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
  const NAME = { ama: 'Ama', carlos: 'Carlos' };

  /** mount(el, who) → { say(text, { rate, cues, dur, onEnd }), stop(), destroy(), who } */
  function mount(el, who) {
    who = NAME[who] ? who : 'ama';
    const base = 'teach/' + who + '/';
    el.classList.add('tch'); el.innerHTML = `<div class="tch-rig"><img class="tch-poster" src="${base}poster.jpg" alt="${NAME[who]}" width="480" height="640" decoding="async"></div>`;
    const rig = el.firstChild;
    rig.firstChild.onerror = () => { el.style.display = 'none'; }; // thiếu tài sản (vd. bản add-on không kèm teach/) → ẩn giáo viên, bài vẫn chạy
    let sp = null, vid = null, L = [], front = 0, cur = '', run = 0, dead = false, ro = null;
    const fit = () => { rig.style.transform = `scale(${(el.clientWidth || 120) / 480})`; };
    fit(); if (g.ResizeObserver) { ro = new ResizeObserver(fit); ro.observe(el); }
    if (!lite()) {
      fetch(base + 'sprite.json').then(r => (r.ok ? r.json() : null)).then(j => {
        if (!j || dead || !j.mouth) return; sp = j;
        vid = D.createElement('video'); Object.assign(vid, { muted: true, loop: true, playsInline: true, preload: 'auto', poster: base + 'poster.jpg' }); vid.setAttribute('playsinline', ''); vid.setAttribute('aria-hidden', 'true'); vid.className = 'tch-vid';
        const face = D.createElement('div'); face.className = 'tch-face';
        const m = sp.mouth;
        L = [0, 1].map(() => { const d = D.createElement('div'); d.className = 'tch-m'; Object.assign(d.style, { left: m.x + 'px', top: m.y + 'px', width: m.w + 'px', height: m.h + 'px', backgroundImage: `url(${base}mouths.webp)`, backgroundSize: `${m.order.length * 100}% 100%` }); face.appendChild(d); return d; });
        vid.oncanplay = () => { vid.oncanplay = null; if (!dead) { rig.appendChild(vid); rig.appendChild(face); vid.play().catch(() => {}); } };
        vid.onerror = () => { vid = null; };
        vid.src = base + 'loop.mp4';
        const set = t => { const tr = sp.track; if (!tr || !tr.length) return; const a = tr[Math.round(t * (sp.fps || 24)) % tr.length]; face.style.transform = `matrix(${a.join(',')})`; };
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
    const api = {
      who,
      say(text, o = {}) {
        const my = ++run, rate = o.rate || 0.95, E = g.LessonEngine;
        const dur = o.dur || Math.max(0.6, String(text || '').length * 0.065 / rate), cues = o.cues || (E ? E.visemes(text, dur) : [[0, 'X']]);
        const end = () => { if (my === run) { run++; show(''); } if (o.onEnd) o.onEnd(); };
        if (sp && L.length) lip(cues, dur, my);
        if (g.UI && g.UI.tts) g.UI.tts(text, o.accent || 'en-US', rate, { onEnd: end }); else setTimeout(end, dur * 1000);
      },
      stop() { run++; show(''); try { if (g.UI && g.UI.stopSpeak) g.UI.stopSpeak(); } catch (e) { /* bỏ qua */ } },
      destroy() { dead = true; run++; if (ro) ro.disconnect(); if (vid) { try { vid.pause(); vid.removeAttribute('src'); vid.load(); } catch (e) { /* bỏ qua */ } } el.innerHTML = ''; },
    };
    return api;
  }
  g.LessonTeacher = { mount, lite };
})(self);
