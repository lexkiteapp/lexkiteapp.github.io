/* 🔁 Ôn tập đa chế độ [P2-1.2] + ✍️ thẻ "Câu của bạn" [P2-1.1-UI] – tải lười khi mở #/review (App.need('rmodes')), ngoài khung app.
   Chế độ: flip (lật/vuốt – study-swipe.js) · type (gõ phản xạ) · audio (nghe US/UK → chọn 1/4 nghĩa).
   Kết quả quy về mức Again/Hard/Good/Easy (0–3) rồi study.js chấm qua SRS.review – KHÔNG đụng thuật toán FSRS.
   StudyModes.pick(card, want, rev) · front(mode, card) · bind(mode, card, {flip, say}) → hàm phím · ctx(card) · gradeType/gradeAudio (thuần, có test). */
(function (g) {
  const MODES = ['auto', 'flip', 'type', 'audio'];
  const LB = () => ({ auto: t('Tự động'), flip: t('Lật thẻ'), type: t('Gõ từ'), audio: t('Nghe chọn nghĩa') });
  // Khoảng cách Levenshtein (gõ sai nhỏ)
  const dist = (a, b) => { const d = Array.from({ length: a.length + 1 }, (_, i) => [i]); for (let j = 1; j <= b.length; j++) d[0][j] = j; for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); return d[a.length][b.length]; };
  const norm = x => String(x || '').toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, ' ').trim();
  const tolOf = n => (n >= 8 ? 2 : n >= 4 ? 1 : 0); // từ ngắn phải đúng hẳn

  // Gõ phản xạ → mức chấm. dist: số lỗi gõ · len: độ dài từ · hints: số gợi ý đã dùng · ms: thời gian · gaveUp: bấm "Không nhớ"
  function gradeType(r) {
    if (r.gaveUp || r.dist > tolOf(r.len)) return 0; // Again
    if (r.dist > 0 || r.hints >= 2) return 1; // Hard: sai gõ nhỏ hoặc cần nhiều gợi ý
    if (r.hints === 0 && r.ms < 2500 + 350 * r.len) return 3; // Easy: đúng ngay, nhanh, không gợi ý
    return 2; // Good
  }
  // Nghe chọn nghĩa → mức chấm. ok: chọn đúng · replays: số lần nghe lại · ms: thời gian
  function gradeAudio(r) {
    if (!r.ok) return 0;
    if (r.replays >= 2) return 1;
    if (r.replays === 0 && r.ms < 5000) return 3;
    return 2;
  }

  // Phương án nhiễu: nghĩa của thẻ khác (ưu tiên cùng từ loại), rồi từ vựng thư viện; trùng nghĩa bị loại
  function options(c) {
    const mean = x => App.meanOf(x), right = mean(c), seen = new Set([norm(right)]), out = [];
    const take = list => { for (const x of list) { if (out.length >= 3) break; const m = x && x.word !== c.word && mean(x); if (m && !seen.has(norm(m))) { seen.add(norm(m)); out.push(m); } } };
    const cards = Object.values(App.state.cards || {}), mix = a => a.map(x => [Math.random(), x]).sort((p, q) => p[0] - q[0]).map(p => p[1]);
    take(mix(cards.filter(x => x.pos && x.pos === c.pos))); take(mix(cards));
    if (out.length < 3 && g.IELTS_DATA && IELTS_DATA.TOPICS) take(mix([].concat(...IELTS_DATA.TOPICS.map(tp => tp.words || [])).slice(0, 400)));
    if (out.length < 3) return null;
    const all = mix([right, ...out]);
    return { all, right: all.indexOf(right) };
  }

  // Tự chọn chế độ theo độ khó FSRS (D 1–10) + số lần quên: thẻ khó → lật (có câu ngữ cảnh), vừa → nghe chọn nghĩa, dễ → gõ phản xạ
  function auto(c) {
    const s = c.srs || {}, D = s.D != null ? s.D : (s.ef ? (3 - s.ef) * 6 : 5), lap = s.lapses || 0;
    if (lap >= 3 || D >= 7.5) return 'flip';
    if (s.reps >= 2 && D <= 5 && lap <= 1) return s.reps % 3 === 1 ? 'audio' : 'type';
    return 'audio';
  }
  const canType = c => c.word.length <= 30 && /[a-z]/i.test(c.word) && App.state.settings.typeReview !== false;
  function pick(c, want, rev) {
    const s = c.srs || {};
    if (rev || (s.reps === 0 && !s.last)) return 'flip'; // thẻ mới / chiều ngược: luôn lật
    let m = want && want !== 'auto' ? want : auto(c);
    if (m === 'type' && !canType(c)) m = 'audio';
    if (m === 'audio' && !(c._opt = options(c))) m = 'flip';
    return m;
  }

  // Cắt mềm quanh từ (≤ max ký tự, theo ranh giới từ)
  function trim(text, word, max = 200) {
    const s = String(text || '').replace(/\s+/g, ' ').trim();
    if (s.length <= max) return s;
    const m = UI.wordRegex(word).exec(s), at = m ? m.index : 0;
    let a = Math.max(0, at - Math.floor((max - word.length) / 2)), b = Math.min(s.length, a + max);
    a = Math.max(0, b - max);
    if (a > 0) { const sp = s.indexOf(' ', a); if (sp > 0 && sp < at) a = sp + 1; }
    if (b < s.length) { const sp = s.lastIndexOf(' ', b); if (sp > at + word.length) b = sp; }
    return (a > 0 ? '…' : '') + s.slice(a, b) + (b < s.length ? '…' : '');
  }
  const host = s => String(s || '').replace(/^[a-z][\w+.-]*:\/\//i, '').split(/[/?#\s]/)[0].replace(/^www\./, '').slice(0, 60);
  // ✍️ Thẻ "Câu của bạn" (own) / "Ví dụ" (thư viện) – luôn esc qua UI.highlight
  function ctx(c, o = {}) {
    const x = Core.Cards.ctxOf(c); if (!x) return '';
    const tx = trim(x.text, c.word), src = x.own && host(x.src);
    const body = o.cloze ? UI.cloze(tx, c.word) : UI.highlight(tx, c.word);
    return `<figure class="rctx${x.own ? ' own' : ''}"><figcaption class="rctx-hd"><span class="rctx-lb">${x.own ? '✍️ ' + t('Câu của bạn') : '💬 ' + t('Ví dụ')}</span>${src ? `<span class="rctx-src" title="${t('Nguồn')}"><span class="sr-only">${t('Nguồn')}: </span>${UI.esc(src)}</span>` : ''}</figcaption>
      <blockquote class="rctx-tx" lang="en" dir="ltr">${body}</blockquote>
      ${o.cloze ? '' : `<div class="rctx-act"><button type="button" class="ctx-say" data-saysent="${UI.esc(tx.replace(/…/g, ''))}" title="${t('Nghe cả câu')}" aria-label="${t('Nghe cả câu')}">🔊</button><button type="button" class="ctx-say" data-saysent="${UI.esc(tx.replace(/…/g, ''))}" data-slow="1" title="${t('Nghe chậm')}" aria-label="${t('Nghe chậm')}">🐢</button></div>`}</figure>`;
  }

  // Bộ chọn chế độ (đổi tay) – nằm cạnh nút đổi chiều thẻ
  const switcher = cur => `<label class="rm-sw"><span class="sr-only">${t('Chế độ ôn')}</span><select id="rmSel" aria-label="${t('Chế độ ôn')}" aria-keyshortcuts="M" title="${t('Chế độ ôn')} (M)">${MODES.map(m => `<option value="${m}"${m === (cur || 'auto') ? ' selected' : ''}>${LB()[m]}</option>`).join('')}</select></label>`;

  function front(mode, c) {
    const { esc, pic, posChip } = UI, mean = App.meanOf(c);
    if (mode === 'type') {
      const n = c.word.replace(/[^A-Za-z]/g, '').length;
      return `<div class="rm-tag">⌨️ ${t('Gõ từ')}</div>${pic(c)}
        <div class="vi" style="font-size:1.5rem">${esc(mean)}</div>${posChip(c.pos)}
        ${ctx(c, { cloze: true })}
        <input class="input type-in" id="typeIn" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="${t('Gõ từ tiếng Anh rồi Enter')}" aria-describedby="rmHint" placeholder="${t('Gõ từ tiếng Anh rồi Enter')}" style="margin-top:1rem;text-align:center;font-size:1.2rem">
        <div class="rm-hint tiny muted" id="rmHint" lang="en" dir="ltr" aria-live="polite">${t('Gợi ý: bắt đầu bằng “{a}”, {n} chữ cái', { a: esc(c.word[0]), n })}</div>
        <div class="row center rm-btns"><button type="button" class="btn sm ghost" id="rmLet" aria-keyshortcuts="?">💡 ${t('Gợi ý chữ cái')} <kbd aria-hidden="true">?</kbd></button><button type="button" class="btn sm ghost" id="rmHear" aria-label="${t('Nghe từ')}">🔊</button><button type="button" class="btn sm ghost" id="rmGive" aria-keyshortcuts="Escape">${t('Không nhớ')} <kbd aria-hidden="true">Esc</kbd></button></div>
        <div id="typeRes" class="small" role="status" style="margin-top:.4rem"></div>`;
    }
    const op = c._opt;
    return `<div class="rm-tag">🎧 ${t('Nghe chọn nghĩa')}</div>
      <button type="button" class="listen-big" id="rmPlay" aria-label="${t('Nghe')} (P)">🔊</button>
      <div class="row center rm-btns"><button type="button" class="btn sm ghost" data-acc="en-US" aria-label="${t('Nghe giọng Anh–Mỹ')}">🇺🇸 US</button><button type="button" class="btn sm ghost" data-acc="en-GB" aria-label="${t('Nghe giọng Anh–Anh')}">🇬🇧 UK</button></div>
      <div class="rm-opts" role="group" aria-label="${t('Chọn nghĩa đúng')}">${op.all.map((m, i) => `<button type="button" class="btn rm-opt" data-opt="${i}" aria-keyshortcuts="${i + 1}"><kbd aria-hidden="true">${i + 1}</kbd><span>${esc(m)}</span></button>`).join('')}</div>
      <div id="typeRes" class="small" role="status" style="margin-top:.4rem"></div>`;
  }

  // Sau khi trả lời: lật thẻ + gợi ý mức chấm (người học vẫn đổi được: 1–4, Enter xác nhận)
  const settle = (o, gr) => { o.flip(); const b = document.querySelector(`[data-grade="${gr}"]`); if (b) { b.classList.add('suggest'); b.focus(); } };
  const fb = ok => { try { ok ? Sfx.correct() : Sfx.wrong(); if (navigator.vibrate && !matchMedia('(prefers-reduced-motion: reduce)').matches) navigator.vibrate(ok ? 35 : [50, 40, 50]); } catch (e) { /* bỏ qua */ } };

  function bind(mode, c, o) {
    const $ = s => document.querySelector(s), t0 = Date.now(), res = $('#typeRes');
    const sel = $('#rmSel'); if (sel) sel.onchange = () => o.onMode(sel.value);
    const cycle = () => o.onMode(MODES[(MODES.indexOf(sel ? sel.value : 'auto') + 1) % MODES.length]);
    let done = false;
    if (mode === 'type') {
      const inp = $('#typeIn'), w = c.word; let hints = 0, heard = false;
      setTimeout(() => inp && inp.focus(), 50);
      const hint = () => { if (done) return; hints = Math.min(hints + 1, Math.max(1, w.length - 1)); $('#rmHint').textContent = w.slice(0, hints + 1).split('').concat(Array(Math.max(0, w.length - hints - 1)).fill('_')).join(' '); inp.focus(); };
      const finish = gaveUp => {
        if (done) return; const v = norm(inp.value); if (!v && !gaveUp) return;
        done = true; inp.disabled = true;
        const dd = gaveUp ? 99 : dist(v, norm(w)), gr = gradeType({ dist: dd, len: w.length, hints: hints + (heard ? 1 : 0), ms: Date.now() - t0, gaveUp });
        inp.classList.add(dd === 0 ? 'ok' : gr ? 'near' : 'bad', dd === 0 ? 'ans-bounce' : 'ans-shake');
        res.innerHTML = dd === 0 ? `✅ ${t('Chính xác!')}` : `${gr ? '🟡 ' + t('Gần đúng – sai 1 chữ') : '❌ ' + t('Chưa đúng')}: <b lang="en">${UI.esc(w)}</b>`;
        fb(gr > 0); settle(o, gr);
      };
      inp.addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); finish(false); }
        else if (e.key === '?') { e.preventDefault(); hint(); }
        else if (e.key === 'Escape') { e.preventDefault(); finish(true); }
      });
      $('#rmLet').onclick = e => { e.stopPropagation(); hint(); };
      $('#rmHear').onclick = e => { e.stopPropagation(); heard = true; o.say(); inp.focus(); };
      $('#rmGive').onclick = e => { e.stopPropagation(); finish(true); };
      return e => { if (!done && e.target === inp) return true; if (!o.flipped() && e.key.toLowerCase() === 'm' && !e.target.matches('input, textarea, select')) { cycle(); return true; } return false; };
    }
    if (mode === 'audio') {
      const op = c._opt; let replays = -1;
      const play = acc => { replays++; if (!acc) return o.say(); const u = c.audio || '', us = /-us\.mp3$/.test(u); UI.speak(c.word, acc, acc === 'en-US' ? (us ? u : '') : (us ? '' : u)); };
      setTimeout(() => play(), 250);
      $('#rmPlay').onclick = e => { e.stopPropagation(); play(); };
      document.querySelectorAll('[data-acc]').forEach(b => b.onclick = e => { e.stopPropagation(); play(b.dataset.acc); });
      const choose = i => {
        if (done) return; done = true;
        const ok = i === op.right, gr = gradeAudio({ ok, replays: Math.max(0, replays), ms: Date.now() - t0 });
        document.querySelectorAll('[data-opt]').forEach(b => { const k = +b.dataset.opt; b.disabled = true; if (k === op.right) { b.classList.add('ok'); b.insertAdjacentHTML('beforeend', ` <span aria-hidden="true">✓</span>`); b.setAttribute('aria-label', b.textContent + ' – ' + t('Đáp án đúng')); } else if (k === i) { b.classList.add('bad'); b.insertAdjacentHTML('beforeend', ` <span aria-hidden="true">✗</span>`); } });
        res.innerHTML = ok ? `✅ ${t('Chính xác!')}` : `❌ ${t('Chưa đúng')}: <b>${UI.esc(op.all[op.right])}</b>`;
        fb(ok); settle(o, gr);
      };
      document.querySelectorAll('[data-opt]').forEach(b => b.onclick = e => { e.stopPropagation(); choose(+b.dataset.opt); });
      return e => {
        if (e.target.matches && e.target.matches('input, textarea, select')) return false;
        if (!done && /^[1-4]$/.test(e.key)) { choose(+e.key - 1); return true; }
        if (!done && e.key.toLowerCase() === 'p') { play(); return true; }
        if (!o.flipped() && e.key.toLowerCase() === 'm') { cycle(); return true; }
        return false;
      };
    }
    return e => { if (!o.flipped() && e.key.toLowerCase() === 'm' && !(e.target.matches && e.target.matches('input, textarea, select'))) { cycle(); return true; } return false; };
  }

  // .suggest toàn cục (style.css) là hộp gợi ý tìm kiếm position:absolute → nút chấm được gợi ý phải ở yên trong hàng
  const CSS = `.grades .btn.suggest{position:relative;inset:auto;z-index:auto;overflow:visible}.rctx{margin:1rem auto 0;max-width:540px;text-align:start;background:var(--surface-2);border:1px solid var(--line);border-inline-start:4px solid var(--primary);border-radius:var(--radius-sm,12px);padding:.7rem .9rem .6rem}.rctx-hd{display:flex;flex-wrap:wrap;align-items:center;gap:.4rem;margin-bottom:.35rem;font-size:.8rem}.rctx-lb{font-weight:700;color:var(--text)}.rctx-src{margin-inline-start:auto;padding:.1rem .55rem;border-radius:999px;background:var(--surface);border:1px solid var(--line);color:var(--muted);max-width:60%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.rctx-tx{margin:0;font-size:1rem;line-height:1.5;color:var(--text);overflow-wrap:anywhere;text-align:left}.rctx-tx mark{background:var(--gold-soft,#FFE7C2);color:inherit;font-weight:700;border-radius:4px;padding:0 .15em;text-decoration:underline;text-decoration-thickness:2px;text-underline-offset:3px}.rctx-act{display:flex;gap:.35rem;margin-top:.45rem;justify-content:flex-end}.rctx:not(.own){border-inline-start-color:var(--muted)}.rm-tag{font-size:.75rem;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--muted);margin-bottom:.4rem}.rm-btns{gap:.4rem;margin-top:.5rem;flex-wrap:wrap}.rm-btns kbd,.rm-opt kbd{font-size:.7rem;opacity:.7;border:1px solid var(--line);border-radius:4px;padding:0 .3rem}.rm-opts{display:grid;gap:.5rem;margin:1rem auto 0;max-width:480px}.rm-opt{display:flex;align-items:center;gap:.6rem;text-align:start;white-space:normal;justify-content:flex-start;min-height:48px}.rm-opt.ok{border-color:var(--good);background:var(--good-soft)}.rm-opt.bad{border-color:var(--again);background:var(--again-soft)}.rm-opt:disabled{opacity:1}.rm-sw select{font:inherit;font-size:.8rem;padding:.25rem .5rem;border-radius:999px;border:1px solid var(--line);background:var(--surface);color:var(--text)}`;
  if (typeof document !== 'undefined' && !document.getElementById('rmCss')) { const s = document.createElement('style'); s.id = 'rmCss'; s.textContent = CSS; document.head.appendChild(s); }

  g.StudyModes = { MODES, pick, auto, front, bind, ctx, trim, host, switcher, options, gradeType, gradeAudio, dist };
})(typeof self !== 'undefined' ? self : this);
