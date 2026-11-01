/* 🎬 Transcript tương tác dùng chung (clip video/audio + Truyện/Podcast): mỗi câu có mốc giờ, câu đang phát tô sáng + tự cuộn,
 * karaoke từng từ (khi có mốc từ), bấm câu → tua, bản dịch ngôn ngữ mẹ đẻ bật/tắt, cụm từ/thành ngữ gạch chân (chạm → onPhrase), cỡ chữ.
 * Chế độ 'cloze': câu thành chỗ trống để điền (chấm từng ô). Logic: media/cues.js. Spec: docs/MEDIA.md §3.
 * MediaTranscript.mount(el, { cues, phrases, lang, showTr, font, mode, onSeek(sec, i), onPhrase(key, i, btn) })
 *   (+ markWord(token{w,k}, cue) → class tô từ (vd. 'new' của Truyện) · speakers {A:'ama',B:'carlos'} → avatar 2D mỗi lượt thoại
 *    · onWord(word, i, span): chạm 1 từ trong câu đang phát · onGap(ok, answer): mỗi ô điền từ được chấm)
 *    · skin (màn Stitch v2 #/watch, web/js/media/player.js): { row({ cue, i, en, tr, ts, lang }) → HTML 1 câu (giữ .mt-row[data-i] .mt-en .mt-tr),
 *      state(rowEl, 'done'|'on'|'next') đổi class thẻ câu, word(span, on) tô từ đang nói } · onPlay(i): nút [data-play] trong câu
 *   → { setTime(sec), setLang(l), showTr(on), setFont(px), setMode(m), active(), destroy() } */
(function (g) {
  const C = () => g.MediaCues;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const mmss = s => { s = Math.max(0, Math.floor(s || 0)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  const tt = (k, v) => (typeof g.t === 'function' ? g.t(k, v) : k);

  // Câu → HTML: mỗi từ 1 <span data-w> (karaoke), cụm từ bọc trong <button class="mt-ph">
  function lineHtml(cue, phrases, mark) {
    const text = cue.text, tk = C().tokens(text), sp = C().phraseSpans(text, phrases);
    let html = '', c = 0, k = 0;
    const words = (a, b) => { let h = ''; while (k < tk.length && tk[k].s < b) { const t = tk[k]; if (t.s > c) h += esc(text.slice(c, t.s)); const mc = mark ? mark(t, cue) : ''; h += `<span data-w="${k}"${mc ? ` class="${esc(mc)}"` : ''}>${esc(t.w)}</span>`; c = t.e; k++; } if (b > c && b <= text.length) { h += esc(text.slice(c, b)); c = b; } return h; };
    for (const x of sp) { html += words(c, x.s); html += `<button type="button" class="mt-ph" data-ph="${esc(x.key)}">${words(x.s, x.e)}</button>`; }
    return html + words(c, text.length);
  }
  function clozeHtml(cue, phrases, i) {
    return C().cloze(cue.text, phrases, { seed: i + 1 }).map((p, b) => (p.blank
      ? `<input class="mt-gap" data-a="${esc(p.answer)}" data-b="${b}" size="${Math.max(3, p.answer.length)}" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="${esc(tt('Điền từ còn thiếu'))}">`
      : esc(p.t))).join('');
  }

  function mount(el, o) {
    const cues = o.cues || [], phrases = o.phrases || {};
    let lang = o.lang || 'en', tr = o.showTr !== false, mode = o.mode || 'sub', cur = -1, curW = -1, userScroll = 0, dead = false;
    const sk = o.skin || null;
    el.classList.add('mt'); if (sk) el.classList.add('mt-st'); el.setAttribute('role', 'list');
    const draw = () => {
      el.dataset.mode = mode; el.classList.toggle('mt-notr', !tr);
      el.innerHTML = cues.map((c, i) => {
        const tx = C().trOf(c, lang);
        if (sk) return sk.row({ cue: c, i, en: mode === 'cloze' ? clozeHtml(c, phrases, i) : lineHtml(c, phrases, o.markWord), tr: tx, ts: mmss(c.start), lang });
        const av = o.speakers && o.speakers[c.who] && g.Chars ? g.Chars.img(o.speakers[c.who], { size: 32, cls: 'mt-av', alt: '' }) : '';
        return `<div class="mt-row" role="listitem" data-i="${i}" data-who="${esc(c.who || '')}" tabindex="0"><span class="mt-ts">${av}${mmss(c.start)}</span>` +
          `<div class="mt-body"><p class="mt-en" lang="en">${mode === 'cloze' ? clozeHtml(c, phrases, i) : lineHtml(c, phrases, o.markWord)}</p>` +
          (tx ? `<p class="mt-tr" lang="${esc(lang)}"${lang === 'ar' ? ' dir="rtl"' : ''}>${esc(tx)}</p>` : '') + '</div></div>';
      }).join('');
      const a = cur; cur = -1; curW = -1; if (a >= 0) mark(a, true); else paint();
    };
    // Màn Stitch: mỗi thẻ câu 1 trong 3 khuôn (đã qua / đang phát / sắp tới)
    const paint = () => { if (sk && sk.state) el.querySelectorAll('.mt-row').forEach(r => { const i = +r.dataset.i; sk.state(r, i === cur ? 'on' : cur >= 0 && i < cur ? 'done' : 'next'); }); };
    const rowOf = i => el.querySelector(`.mt-row[data-i="${i}"]`);
    function mark(i, quiet) {
      if (i === cur) return; const old = rowOf(cur); if (old) { old.classList.remove('on'); old.removeAttribute('aria-current'); old.querySelectorAll('.w-on').forEach(x => { x.classList.remove('w-on'); if (sk && sk.word) sk.word(x, false); }); }
      cur = i; curW = -1; paint(); const r = rowOf(i); if (!r) return; r.classList.add('on'); r.setAttribute('aria-current', 'true');
      if (!quiet && Date.now() - userScroll > 2500) { // người học vừa tự cuộn → không giật về
        const top = r.offsetTop - el.clientHeight * 0.3; try { el.scrollTo({ top, behavior: 'smooth' }); } catch (e) { el.scrollTop = top; }
      }
    }
    function setTime(sec) {
      if (dead) return; const i = C().at(cues, sec); mark(i);
      const w = i >= 0 ? C().wordAt(cues[i], sec) : -1; if (w === curW) return; curW = w;
      const r = rowOf(i); if (!r) return; r.querySelectorAll('[data-w]').forEach(s => { s.classList.toggle('w-on', +s.dataset.w <= w); if (sk && sk.word) sk.word(s, +s.dataset.w === w); });
    }
    // Chạm cụm từ → tra (không tua); chạm câu/mốc giờ → tua tới câu; ô điền từ → chấm khi rời ô/Enter
    el.addEventListener('click', e => {
      const ph = e.target.closest('.mt-ph'); const row = e.target.closest('.mt-row');
      if (ph && o.onPhrase) { e.stopPropagation(); o.onPhrase(ph.dataset.ph, row ? +row.dataset.i : -1, ph); return; }
      if (row && o.onPlay && e.target.closest('[data-play]')) { e.stopPropagation(); const i = +row.dataset.i; o.onPlay(i); mark(i, true); return; }
      if (e.target.closest('.mt-gap')) return;
      const w = e.target.closest('[data-w]'); // câu đang phát: chạm 1 từ → tra từ đó (lần chạm đầu chỉ tua tới câu)
      if (w && row && +row.dataset.i === cur && o.onWord) { e.stopPropagation(); o.onWord(w.textContent, cur, w); return; }
      if (row && o.onSeek) { const i = +row.dataset.i; o.onSeek(cues[i].start, i); mark(i, true); }
    });
    el.addEventListener('keydown', e => {
      const gap = e.target.closest && e.target.closest('.mt-gap');
      if (gap && e.key === 'Enter') { e.preventDefault(); check(gap); const nx = [...el.querySelectorAll('.mt-gap')].find(x => !x.classList.contains('ok') && x !== gap); if (nx) nx.focus(); return; }
      if (!gap && e.key === 'Enter' && e.target.classList.contains('mt-row')) e.target.click();
    });
    el.addEventListener('change', e => { if (e.target.classList.contains('mt-gap')) check(e.target); });
    const onScroll = () => { userScroll = Date.now(); };
    el.addEventListener('wheel', onScroll, { passive: true }); el.addEventListener('touchmove', onScroll, { passive: true });
    function check(inp) {
      const ok = C().sameWord(inp.value, inp.dataset.a); inp.classList.toggle('ok', ok); inp.classList.toggle('bad', !ok && !!inp.value.trim());
      if (ok) inp.readOnly = true; if (o.onGap) o.onGap(ok, inp.dataset.a);
    }
    draw();
    return {
      setTime, active: () => cur,
      setLang(l) { lang = l; draw(); }, showTr(on) { tr = !!on; el.classList.toggle('mt-notr', !tr); },
      refresh() { draw(); }, setFont(px) { el.style.setProperty('--mt-font', px + 'px'); }, setMode(m) { if (m !== mode) { mode = m; draw(); } },
      // Điền từ: ô đúng / tổng số ô
      score() { const all = el.querySelectorAll('.mt-gap'); return { ok: el.querySelectorAll('.mt-gap.ok').length, total: all.length }; },
      destroy() { dead = true; el.innerHTML = ''; el.classList.remove('mt', 'mt-st'); },
    };
  }
  g.MediaTranscript = { mount, lineHtml, mmss };
})(typeof self !== 'undefined' ? self : globalThis);
