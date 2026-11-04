/* 🎬 Học qua video/audio – trình phát + transcript tương tác + 4 chế độ (Phụ đề · Shadowing · Chính tả · Điền từ). Spec: docs/MEDIA.md.
 * Route #/media (danh sách) · #/media/<id> (1 clip). Dữ liệu web/data/media/{index,<id>}.json (dựng bằng scripts/media/build-clips.mjs,
 * mốc giờ căn theo audio trên CI media-clips.yml). Clip 'teacher' = audio + giáo viên 2D Ama/Carlos (LessonTeacher) nói đúng lúc có câu;
 * clip 'video' = <video src> (nguồn tự làm / CC có ghi nguồn). Giao diện tạm (chưa có màn Stitch – M2 chờ chủ duyệt). */
(function (g) {
  const { routes } = g.App, D = g.document, C = () => g.MediaCues;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const KEY = 'vb.media', FONTS = [15, 17, 19, 22, 26];
  const MODES = [['sub', 'Phụ đề'], ['shadow', 'Shadowing'], ['dict', 'Chính tả'], ['cloze', 'Điền từ']];
  const pref = () => { try { return Object.assign({ font: 1, loop: false, tr: true, view: 'sub', trLang: '' }, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { return { font: 1, loop: false, tr: true, view: 'sub', trLang: '' }; } };
  const save = p => { try { localStorage.setItem(KEY, JSON.stringify(p)); } catch (e) { /* bỏ qua */ } };
  const getJSON = (u, signal) => fetch(u, { signal }).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); });
  const view = () => D.getElementById('view');

  routes.media = g.App.guard(async function (id) {
    const w = g.App.W; await w(g.I18N && g.I18N.whenReady ? g.I18N.whenReady() : null);
    view().innerHTML = g.UI && g.UI.skelPage ? g.UI.skelPage(t('Đang tải…')) : '';
    if (!id) return list(w);
    let clip; try { clip = await w(getJSON(`data/media/${encodeURIComponent(id)}.json`, w.signal)); } catch (e) { return list(w); }
    play(clip, w);
  });

  async function list(w) {
    let items = []; try { items = await w(getJSON('data/media/index.json', w.signal)); } catch (e) { items = []; }
    view().innerHTML = `<div class="page-head"><div><h1>🎬 ${t('Học qua video')}</h1><p class="muted">${t('Xem clip ngắn, đọc phụ đề song ngữ, luyện nói theo, chính tả và điền từ.')}</p></div></div>
      <div class="grid auto mp-list">${items.map(c => `<a class="card hover mp-card" href="#/media/${esc(c.id)}">${g.Chars ? g.Chars.img(c.teacher, { size: 56, lazy: true, alt: '' }) : ''}<div><b lang="en">${esc(c.title)}</b><p class="muted small">${esc(c.level)} · ${g.MediaTranscript.mmss(c.dur)}</p></div></a>`).join('') || `<p class="muted">${t('Chưa có clip.')}</p>`}</div>`;
  }

  function play(clip, w) {
    const P = pref(), cues = clip.cues, ui = g.I18N ? g.I18N.lang() : 'en';
    const trLang = () => P.trLang || (ui === 'en' ? 'vi' : ui);
    const langs = C().LANGS.filter(l => l !== 'en');
    const lname = l => (g.I18N && g.I18N.LANGS && g.I18N.LANGS[l] ? g.I18N.LANGS[l][1] : l);
    const who = Object.values(clip.speakers || {});
    view().innerHTML = `<div class="mp" data-view="${P.view === 'live' ? 'live' : 'sub'}">
      <a class="small" href="#/media">← ${t('Học qua video')}</a>
      <h1 class="mp-title" lang="en">${esc(clip.title)} <span class="chip">${esc(clip.level)}</span></h1>
      <div class="mp-stage${clip.kind === 'video' ? ' is-video' : ''}">${clip.kind === 'video' ? `<video class="mp-video" playsinline preload="metadata" src="${esc(clip.src)}"${clip.poster ? ` poster="${esc(clip.poster)}"` : ''}></video>` : who.map(x => `<div class="mp-tch" data-who="${esc(x)}"></div>`).join('')}
        ${clip.kind === 'video' ? '' : `<audio class="mp-audio" preload="auto" src="${esc(clip.audio)}"></audio>`}</div>
      <div class="mp-ctl">
        <button type="button" class="mp-b" data-a="prev" aria-label="${esc(t('Câu trước'))}">⏮</button>
        <button type="button" class="mp-b mp-play" data-a="play" aria-label="${esc(t('Phát'))}">▶</button>
        <button type="button" class="mp-b" data-a="next" aria-label="${esc(t('Câu tiếp'))}">⏭</button>
        <input class="mp-seek" type="range" min="0" max="${Math.ceil(clip.dur * 10)}" value="0" aria-label="${esc(t('Tua'))}"><span class="mp-time">0:00 / ${g.MediaTranscript.mmss(clip.dur)}</span></div>
      <div class="mp-modes" role="tablist">${MODES.map(([k, l]) => `<button type="button" role="tab" data-m="${k}" aria-selected="${k === 'sub'}">${esc(t(l))}</button>`).join('')}</div>
      <div class="mp-tools">
        <button type="button" class="mp-b" data-a="font-" aria-label="${esc(t('Chữ nhỏ hơn'))}">A−</button><button type="button" class="mp-b" data-a="font+" aria-label="${esc(t('Chữ lớn hơn'))}">A+</button>
        <button type="button" class="mp-b" data-a="loop" aria-pressed="${!!P.loop}">🔁 ${esc(t('Lặp câu'))}</button>
        <button type="button" class="mp-b" data-a="tr" aria-pressed="${!!P.tr}">${esc(t('Bản dịch'))}</button>
        <select class="mp-lang" aria-label="${esc(t('Ngôn ngữ dịch'))}">${langs.map(l => `<option value="${l}"${l === trLang() ? ' selected' : ''}>${esc(lname(l))}</option>`).join('')}</select>
        <button type="button" class="mp-b" data-a="view" aria-pressed="${P.view === 'live'}">${esc(t('Live'))}</button>
        <button type="button" class="mp-b" data-a="fold" aria-pressed="false">${esc(t('Thu gọn'))}</button></div>
      <div class="mp-panel" hidden></div>
      <div class="mp-tr"></div></div>`;
    const root = view().querySelector('.mp'), $ = s => root.querySelector(s);
    const med = $('.mp-video') || $('.mp-audio');
    const tch = {}; if (g.LessonTeacher) root.querySelectorAll('.mp-tch').forEach(el => { tch[el.dataset.who] = g.LessonTeacher.mount(el, el.dataset.who); });
    let mode = 'sub', hold = -1, rec = null, raf = 0, dead = false;
    const T = g.MediaTranscript.mount($('.mp-tr'), {
      cues, phrases: clip.phrases, lang: trLang(), showTr: P.tr,
      onSeek: (sec, i) => { seek(sec); if (mode === 'shadow' || mode === 'dict') { hold = i; panel(i); } },
      onPhrase: (key, i, btn) => lookup(key, i, btn, clip.phrases[key]),
      onWord: (word, i, span) => lookup(word, i, span, null),
      onGap: () => { const s = T.score(); $('.mp-panel').hidden = false; $('.mp-panel').innerHTML = `<p class="mp-score">${esc(t('Đúng {n}/{m} chỗ trống', { n: s.ok, m: s.total }))}</p>`; },
    });
    T.setFont(FONTS[P.font] || 17);
    function lookup(text, i, el, info) { med.pause(); g.LookupCard.open(el, { text, info, sentence: cues[i] && cues[i].text, sentenceTr: C().trOf(cues[i], trLang()), title: clip.title, lang: trLang() }); }
    function seek(sec) { try { med.currentTime = Math.max(0, sec); } catch (e) { /* bỏ qua */ } }
    const playCue = i => { if (!cues[i]) return; hold = i; seek(cues[i].start); med.play().catch(() => {}); };

    // Bảng chế độ Shadowing/Chính tả cho câu i (sau khi câu phát xong thì dừng chờ người học)
    function panel(i) {
      const p = $('.mp-panel'), c = cues[i]; if (!c) { p.hidden = true; return; }
      p.hidden = false;
      if (mode === 'shadow') {
        p.innerHTML = `<p class="mp-say" lang="en">${esc(c.text)}</p><div class="row"><button type="button" class="btn" data-p="again">🔊 ${esc(t('Nghe lại'))}</button><button type="button" class="btn primary" data-p="rec">🎤 ${esc(t('Nói theo'))}</button><button type="button" class="btn" data-p="next">${esc(t('Câu tiếp'))} →</button></div><div class="mp-res" aria-live="polite"></div>`;
      } else if (mode === 'dict') {
        p.innerHTML = `<label class="mp-q">${esc(t('Nghe rồi gõ lại câu:'))}<input class="mp-in" autocomplete="off" autocapitalize="off" spellcheck="false" lang="en"></label><div class="row"><button type="button" class="btn" data-p="again">🔊 ${esc(t('Nghe lại'))}</button><button type="button" class="btn primary" data-p="check">${esc(t('Kiểm tra'))}</button><button type="button" class="btn" data-p="next">${esc(t('Câu tiếp'))} →</button></div><div class="mp-res" aria-live="polite"></div>`;
        const inp = p.querySelector('.mp-in'); inp.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); p.querySelector('[data-p=check]').click(); } };
      }
    }
    $('.mp-panel').addEventListener('click', e => {
      const b = e.target.closest('[data-p]'); if (!b) return; const i = hold, c = cues[i], res = $('.mp-res');
      if (b.dataset.p === 'again') playCue(i);
      else if (b.dataset.p === 'next') { if (rec) rec.stop(); if (cues[i + 1]) { panel(i + 1); playCue(i + 1); } else { hold = -1; $('.mp-panel').innerHTML = `<p class="mp-score">${esc(t('Hết clip – làm tốt lắm!'))}</p>`; } }
      else if (b.dataset.p === 'check') {
        const r = C().dictation(c.text, $('.mp-in').value);
        res.innerHTML = `<p class="mp-diff" lang="en">${r.words.map(x => `<span class="${x.ok ? 'ok' : 'bad'}">${esc(x.w)}</span>`).join(' ')}</p><p class="mp-score">${esc(t('Đúng {n}%', { n: r.score }))}</p>`;
      } else if (b.dataset.p === 'rec') {
        if (rec) { rec.stop(); return; } med.pause();
        if (!g.UI || !g.UI.recognize) { res.textContent = t('Trình duyệt này chưa hỗ trợ ghi âm.'); return; }
        b.classList.add('on'); res.textContent = t('Đang nghe… nói câu trên');
        rec = g.UI.recognize(c.text, 'en-US', {
          result: r => { const gr = C().grade(r.score); res.innerHTML = `<p class="mp-score mp-${gr}">${esc(t({ great: 'Tuyệt vời!', good: 'Khá tốt!', retry: 'Thử lại nhé' }[gr]))} · ${r.score}/100</p><p class="muted small" lang="en">${esc(t('Máy nghe được:'))} “${esc(r.heard)}”</p>${r.audio ? `<audio controls src="${esc(r.audio)}"></audio>` : ''}`; },
          error: code => { res.textContent = code === 'not-allowed' ? t('Hãy cho phép dùng micro để luyện nói.') : t('Chưa nghe rõ – thử lại nhé.'); },
          end: () => { rec = null; b.classList.remove('on'); },
        });
        if (!rec) { b.classList.remove('on'); res.textContent = t('Trình duyệt này chưa hỗ trợ ghi âm.'); }
      }
    });

    function setMode(m) {
      mode = m; root.dataset.mode = m; root.querySelectorAll('.mp-modes [data-m]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.m === m)));
      T.setMode(m === 'cloze' ? 'cloze' : 'sub'); $('.mp-panel').hidden = true;
      if (m === 'shadow' || m === 'dict') { med.pause(); const i = Math.max(0, T.active()); panel(i); playCue(i); }
    }
    root.querySelector('.mp-modes').addEventListener('click', e => { const b = e.target.closest('[data-m]'); if (b) setMode(b.dataset.m); });
    root.querySelector('.mp-tools').addEventListener('click', e => {
      const b = e.target.closest('[data-a]'); if (!b) return; const a = b.dataset.a;
      if (a === 'font-' || a === 'font+') { P.font = Math.max(0, Math.min(FONTS.length - 1, P.font + (a === 'font+' ? 1 : -1))); T.setFont(FONTS[P.font]); }
      else if (a === 'loop') { P.loop = !P.loop; b.setAttribute('aria-pressed', String(P.loop)); if (P.loop) hold = T.active(); }
      else if (a === 'tr') { P.tr = !P.tr; b.setAttribute('aria-pressed', String(P.tr)); T.showTr(P.tr); }
      else if (a === 'view') { P.view = P.view === 'live' ? 'sub' : 'live'; b.setAttribute('aria-pressed', String(P.view === 'live')); root.dataset.view = P.view; }
      else if (a === 'fold') { const on = !root.classList.contains('folded'); root.classList.toggle('folded', on); b.setAttribute('aria-pressed', String(on)); }
      save(P);
    });
    $('.mp-lang').onchange = e => { P.trLang = e.target.value; save(P); T.setLang(trLang()); };
    root.querySelector('.mp-ctl').addEventListener('click', e => {
      const b = e.target.closest('[data-a]'); if (!b) return; const i = Math.max(0, T.active());
      if (b.dataset.a === 'play') { if (med.paused) med.play().catch(() => {}); else med.pause(); }
      else if (b.dataset.a === 'prev') playCue(med.currentTime - cues[i].start > 1.2 ? i : Math.max(0, i - 1));
      else if (b.dataset.a === 'next') playCue(Math.min(cues.length - 1, i + 1));
      if (mode === 'shadow' || mode === 'dict') panel(hold);
    });
    $('.mp-seek').oninput = e => seek(e.target.value / 10);
    med.onplay = () => { $('.mp-play').textContent = '⏸'; $('.mp-play').setAttribute('aria-label', t('Tạm dừng')); };
    med.onpause = med.onended = () => { $('.mp-play').textContent = '▶'; $('.mp-play').setAttribute('aria-label', t('Phát')); for (const k in tch) tch[k].talk && tch[k].talk(false); };

    // 1 vòng rAF: transcript + karaoke, lặp câu, dừng sau mỗi câu (Shadowing/Chính tả), giáo viên đang nói
    function tick() {
      if (dead) return; const s = med.currentTime; T.setTime(s);
      const i = T.active(), c = cues[i];
      if (hold >= 0 && (P.loop || mode === 'shadow' || mode === 'dict')) {
        const back = C().loopSeek(cues[hold], s);
        if (back != null) { if (P.loop && mode !== 'shadow' && mode !== 'dict') seek(back); else { med.pause(); seek(cues[hold].end - 0.05); } }
      } else if (P.loop && i >= 0) hold = i;
      const live = !med.paused && c && s < c.end;
      for (const k in tch) if (tch[k].talk) tch[k].talk(live && clip.speakers[c.who] === k);
      $('.mp-seek').value = Math.round(s * 10); $('.mp-time').textContent = `${g.MediaTranscript.mmss(s)} / ${g.MediaTranscript.mmss(clip.dur)}`;
      raf = requestAnimationFrame(tick);
    }
    tick();
    const bye = () => { dead = true; cancelAnimationFrame(raf); try { med.pause(); } catch (e) { /* bỏ qua */ } if (rec) rec.stop(); for (const k in tch) tch[k].destroy(); T.destroy(); g.LookupCard.close(); };
    if (w.signal) w.signal.addEventListener('abort', bye, { once: true });
  }
})(self);
