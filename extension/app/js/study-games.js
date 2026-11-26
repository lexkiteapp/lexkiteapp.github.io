/* ⚡ Ghép thẻ + 🎙️ Luyện phát âm – tách khỏi study.js, tải lười khi mở (App.need('pgames')) để khung app ≤ 375 KB gz.
   study.js truyền các hàm dùng chung qua H. */
(function () {
  const { SRS, Cards, Stats, endOfToday, DAY } = Core;
  const { TOPICS, INDEX } = IELTS_DATA;
  const { $, $$, esc, shuffle, highlight, cloze, clozeAnswer, similarity, toast, speak, tts, pic, levelChip, posChip, xpFloat } = UI;
  const App = window.App;
  const { state, routes } = App;
  const view = App.view;
  // CSS Ghép thẻ (chuyển từ style.css)
  if (!document.getElementById('mgCss')) { const st = document.createElement('style'); st.id = 'mgCss'; st.textContent = `.match-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: .7rem; } .tile { min-height: 96px; padding: .7rem; border-radius: 14px; border: 2px solid var(--line); border-bottom-width: 4px; background: var(--surface); cursor: pointer; font-weight: 700; display: grid; place-items: center; text-align: center; transition: transform .12s, opacity .3s, border-color .12s; font-size: .95rem; } .tile:hover { border-color: var(--primary); } .tile.sel { border-color: var(--primary); background: var(--primary-soft); } .tile.bad { border-color: var(--again); background: var(--again-soft); animation: shakeWrong .35s ease-in-out; } .tile.gone { opacity: 0; transform: scale(.85); pointer-events: none; } @media (max-width: 900px) { .match-grid { grid-template-columns: repeat(3, 1fr); } } @media (max-width: 480px) { .match-grid { grid-template-columns: repeat(2, 1fr); } }`; document.head.appendChild(st); }
  window.StudyGames = H => {
    const { accent, emptySource, head, mean, norm, picOk, pool, practiceDone, runQuiz, srcName } = H;
  function runMatch(src) {
    const list = pool(src).filter(w => w.vi);
    const items = shuffle(list).slice(0, 6);
    if (items.length < 3) return emptySource(src);
    const tiles = shuffle([...items.map(w => ({ id: w.word, label: w.word, kind: 'en' })), ...items.map(w => ({ id: w.word, label: mean(w), kind: 'vi' }))]);
    const t0 = performance.now();
    let sel = null, left = items.length, misses = 0, timer;
    view.innerHTML = `<div class="study-wrap" style="max-width:820px">
      <div class="study-top"><a class="icon-btn" href="${App.backHref()}" title="${t('Thoát')}">✕</a><div class="grow small muted">⚡ ${t('Ghép từ với nghĩa đúng')} · ${esc(srcName(src))}</div><span class="timer" id="timer">0.0s</span></div>
      <div class="match-grid">${tiles.map((tl, i) => `<button class="tile" data-i="${i}">${esc(tl.label)}</button>`).join('')}</div>
      <p class="muted small center" style="margin-top:1rem">${t('Mỗi lần ghép sai +1 giây phạt')}</p></div>`;
    timer = setInterval(() => { const el = $('#timer'); if (el) el.textContent = ((performance.now() - t0) / 1000 + misses).toFixed(1) + 's'; }, 100);
    App.cleanup = () => clearInterval(timer);
    $$('.tile').forEach(b => b.onclick = () => {
      const t = tiles[+b.dataset.i];
      if (b.classList.contains('gone')) return;
      if (t.kind === 'en') speak(t.label, accent());
      if (!sel) { sel = b; b.classList.add('sel'); Sfx.pop(); return; }
      if (sel === b) { b.classList.remove('sel'); sel = null; return; }
      const a = tiles[+sel.dataset.i];
      if (a.id === t.id && a.kind !== t.kind) {
        Sfx.answer(true, { el: b }); sel.classList.add('gone'); b.classList.add('gone'); sel = null; left--;
        if (!left) done();
      } else {
        Sfx.answer(false, { el: b }); misses++; const s = sel; s.classList.remove('sel'); s.classList.add('bad'); b.classList.add('bad');
        setTimeout(() => { s.classList.remove('bad'); b.classList.remove('bad'); }, 400); sel = null;
      }
    });
    async function done() {
      clearInterval(timer);
      const time = +((performance.now() - t0) / 1000 + misses).toFixed(1);
      const best = state.game.best.match;
      const xp = Game.xpFor('game', { right: items.length - Math.min(misses, items.length), total: items.length }); // không thưởng tốc độ – kỷ lục giờ vẫn có huy hiệu Tia chớp
      await App.reward({ matches: 1, quizzes: 1, perfect: misses === 0 ? 1 : 0, matchTime: time, xp });
      const h0 = location.hash, rec = !best || time < best, pct = Math.round(items.length / (items.length + misses) * 100);
      await App.need('gend').catch(() => {});
      if (location.hash === h0 && window.GameEnd) GameEnd.show(view, { icon: '⚡', chip: t('Ghép thẻ'), head: rec ? '🏅 ' + t('Kỷ lục mới!') : t('Kỷ lục của bạn: {best}s', { best }), acc: pct, xp, good: 0,
        tiles: [[time + 's', t('Thời gian')], [misses, t('Lần sai')], [(rec ? time : best) + 's', t('Kỷ lục')]],
        words: items.map(w => w.word), more: GameEnd.row('style', '', items.map(w => `<span lang="en">${esc(w.word)}</span> = ${esc(mean(w))}`).join(' · ')),
        again: { label: t('Chơi lại'), fn: () => runMatch(src) }, rev: { label: t('Chế độ khác'), href: '#/practice?src=' + encodeURIComponent(src) } });
      practiceDone({ mode: 'match', src, pct: 100 });
    }
  }

  // ---------- Luyện phát âm (nhận dạng giọng nói) ----------
  function runSpeak(src, query) {
    const one = query && query.get('w'), FX = window.LessonFx;
    if (!one && FX && FX.micOff()) return runQuiz(src, 'mcq', 'speak'); // 🎙️ đang tạm tắt micro → trắc nghiệm nghĩa thay thế
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const items = one ? [norm(INDEX[one.toLowerCase()] || state.cards[one.toLowerCase()] || { word: one })] : shuffle(pool(src)).slice(0, 10);
    if (!items.length) return emptySource(src);
    let i = 0, good = 0, rec = null, total = 0;
    const title = `🎙️ ${t('Luyện phát âm')} · ${one ? esc(one) : esc(srcName(src))}`;
    App.cleanup = () => UI.stopRecognize();
    const show = () => {
      if (i >= items.length) return finish();
      const w = items[i];
      view.innerHTML = `<div class="study-wrap">${head(title, i, items.length, `🎯 ${good}`)}
        <div class="card q-card">
          ${picOk(w) ? pic(w).replace('class="pic"', 'class="pic" style="width:110px;margin:0 auto 1rem"') : ''}
          <div class="entry-word">${esc(w.word)}</div>
          <div class="row center"><span class="ipa" id="ipaW" style="font-size:1.1rem">${UI.ipaHtml(w, null, { cls: 'ipa', noEx: true }) || (w.ipaUS ? '' : `<span class="muted small">${t('đang tra phiên âm…')}</span>`)}</span><button class="icon-btn" id="model" title="${t('Nghe mẫu')}">🔊</button><button class="icon-btn" id="modelSlow" title="${t('Nghe chậm')}">🐢</button></div>
          <div class="vi" id="viW" style="font-size:1rem;margin-top:.3rem">${esc(mean(w))}</div>
          <div style="margin:1.6rem 0 .6rem"><button class="mic" id="mic" title="${t('Bấm và nói')}">🎙️</button></div>
          <div class="muted small" id="hint">${SR ? t('Bấm micro rồi đọc to từ trên') : '⚠️ ' + t('Trình duyệt không hỗ trợ nhận dạng giọng nói – hãy dùng Chrome hoặc Edge.')}</div>
          <div id="result" style="margin-top:1rem"></div>
        </div>
        <div class="row center" style="margin-top:1rem"><button class="btn" id="skipW">${t('Bỏ qua')}</button>${!one && FX ? FX.skipMicBtn() : ''}<button class="btn primary" id="nextW" hidden>${t('Từ tiếp theo →')}</button></div>
      </div>`;
      $('#model').onclick = () => speak(w.word, accent(), w.audio);
      $('#modelSlow').onclick = () => speak(w.word, accent(), w.audio, true);
      // Từ ngoài thư viện (vd. mở từ add-on): tự tra phiên âm UK/US, nghĩa và bản ghi phát âm
      if (!w.ipa || !w.vi || !w.audio) Dict.quick(w.word).then(d => {
        if (!d || !d.found || items[i] !== w) return;
        w.ipa = w.ipa || d.ipa || ''; w.ipaUS = w.ipaUS || d.ipaUS || ''; w.vi = w.vi || d.vi || ''; w.audio = w.audio || d.audio || '';
        const ip = $('#ipaW'); if (ip) ip.innerHTML = w.ipaUS && w.ipaUS !== w.ipa ? `🇬🇧 ${esc(w.ipa)} · 🇺🇸 ${esc(w.ipaUS)}` : esc(w.ipa || '');
        const vi = $('#viW'); if (vi) vi.textContent = mean(w);
        if (App.inDeck(w.word)) Cards.patch(w.word, c => { if (!c.ipa && w.ipa) c.ipa = w.ipa; if (!c.ipaUS && w.ipaUS) c.ipaUS = w.ipaUS; if (!c.vi && w.vi) c.vi = w.vi; });
      }).catch(() => {}).then(async () => {
        if (w.ipa || items[i] !== w) return;
        const gs = await Dict.ipaGuess(w.word).catch(() => null);
        const ip = $('#ipaW'); if (!ip || items[i] !== w) return;
        if (!gs) { ip.innerHTML = `<span class="muted small">${t('Chưa có phiên âm – nghe mẫu 🔊 rồi bắt chước')}</span>`; return; }
        w.ipa = gs.ipa; w.ipaUS = gs.ipaUS;
        ip.innerHTML = `${gs.ipaUS && gs.ipaUS !== gs.ipa ? `🇬🇧 ${esc(gs.ipa)} · 🇺🇸 ${esc(gs.ipaUS)}` : esc(gs.ipa)}${gs.guess ? ` <span class="chip" title="${t('Ghép từ {parts}', { parts: esc(gs.parts.join(' + ')) })}" style="font-size:.7rem">${t('ước tính')} · ${esc(gs.parts.join(' + '))}</span>` : ''}`;
        if (App.inDeck(w.word)) Cards.patch(w.word, c => { if (!c.ipa) c.ipa = gs.ipa; if (!c.ipaUS) c.ipaUS = gs.ipaUS; });
      });
      $('#skipW').onclick = () => { i++; show(); };
      const nm = $('#lfxNoMic'); if (nm) nm.onclick = () => { FX.pauseMic(); runQuiz(src, 'mcq', 'speak'); };
      $('#nextW').onclick = () => { i++; show(); };
      setTimeout(() => speak(w.word, accent(), w.audio), 300);
      let scored = false;
      let listening = null;
      $('#mic').onclick = () => {
        if (listening) { listening.stop(); return; } // bấm lần nữa để dừng
        listening = UI.recognize(w.word, accent(), {
          start: () => { $('#mic').classList.add('rec'); $('#hint').textContent = '🔴 ' + t('Đang nghe… đọc to và rõ (bấm lần nữa để dừng)'); },
          result: ({ heard, score, audio }) => {
            total++;
            const color = score >= 85 ? 'var(--good)' : score >= 65 ? 'var(--hard)' : 'var(--again)';
            const el = $('#result'); if (!el) return;
            el.innerHTML = `<div class="score-ring" style="--p:${score};--c:${color}"><b>${score}</b></div>
              <p style="margin-top:.6rem"><b>${score >= 85 ? '🌟 ' + t('Xuất sắc!') : score >= 65 ? '👍 ' + t('Khá tốt – nghe mẫu và thử lại cho chuẩn hơn') : '🔁 ' + t('Chưa đúng – nghe chậm từng âm rồi thử lại')}</b></p>
              <p class="muted small">${t('Máy nghe được: “{heard}”', { heard: esc(heard || '…') })}</p>
              ${audio ? `<div class="row center" style="margin-top:.4rem"><button class="btn sm" id="playMine">▶️ ${t('Giọng của bạn')}</button><button class="btn sm" id="playModel">🔊 ${t('Giọng mẫu')}</button></div>` : ''}`;
            if (audio) { const a = new Audio(audio); $('#playMine').onclick = () => { UI.stopSpeak(); a.currentTime = 0; a.play(); }; $('#playModel').onclick = () => speak(w.word, accent(), w.audio); }
            if (score >= 65 && !scored) { scored = true; good++; App.reward({ spoken: 1, xp: Game.xpFor('say', { score }) }, $('#mic')); score >= 85 ? Sfx.win() : Sfx.correct(); }
            else if (score < 65) Sfx.wrong();
            const nb = $('#nextW'); if (nb) nb.hidden = false;
          },
          error: code => { const h = $('#hint'); if (h) h.textContent = UI.recErrorText(code); },
          end: () => { listening = null; const m = $('#mic'); if (m) m.classList.remove('rec'); const h = $('#hint'); if (h && h.textContent.includes(t('Đang nghe… đọc to và rõ (bấm lần nữa để dừng)'))) h.textContent = t('Bấm micro để thử lại'); },
        });
      };
    };
    const finish = () => {
      const xp = Game.xpFor('set', { right: good, total: items.length, mode: 'say', paid: 1 });
      App.reward({ quizzes: 1, xp });
      const pct = Math.round(good / Math.max(1, items.length) * 100), h0 = location.hash;
      App.need('gend').catch(() => {}).then(() => {
        if (location.hash === h0 && window.GameEnd) GameEnd.show(view, { icon: '🎙️', chip: t('Luyện phát âm'), head: t('Phát âm tốt {good}/{total} từ', { good, total: items.length }), acc: pct, xp, good: 70,
          tiles: [[good + '/' + items.length, t('Đúng')]], sub: t('Luyện đều mỗi ngày để Speaking tự nhiên hơn.'), words: items.map(w => w.word),
          again: { label: t('Luyện tiếp'), fn: () => runSpeak(src) }, rev: { label: t('Chế độ khác'), href: '#/practice' } });
        practiceDone({ mode: 'speak', src, pct }); // sau màn kết: path-reward gắn vào khe .celebrate
      }); // buổi học theo Ngày (path-day.js)
    };
    show();
  }
    return { runMatch, runSpeak, runBlitz: (src, q) => window.PlayBlitz.run(H, src, q), runRhythm: src => window.PlayRhythm.run(H, src), runPicmatch: src => App.need('ppm').then(() => { if (window.PlayPicmatch) window.PlayPicmatch.run(H, src); }), runCrossword: src => App.need('pxw').then(() => { if (window.PlayCrossword) window.PlayCrossword.run(H, src); }) }; // ⏱️ 🥁 cpack/play-app/ (cùng gói pgames)
  };
})();
