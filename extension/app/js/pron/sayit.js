/* Phát âm – "Nói thử": luyện NÓI cặp từ tối thiểu (giọng Mỹ). Máy nghe → đúng từ / thành từ còn lại (mẹo khẩu hình) / chưa rõ (thử lại, không trừ điểm).
 * Nhận dạng: UI.recognize (Web Speech, 5 phương án; Whisper trên máy khi trình duyệt không có). Chrome mới: ưu tiên nhận dạng trên máy
 * (processLocally) + thiên vị 2 từ của cặp (phrases / SpeechRecognitionPhrase) – dò tính năng, không có thì chạy như cũ. Logic: pron/pairs.js. */
(function (g) {
  const LANG = 'en-US', N = 10, MAX_RETRY = 2;
  const PP = () => g.PronPairs;
  const esc = s => g.UI.esc(s), ic = n => g.UI.icon(n);
  const bias = { local: false, phrases: false, probed: null };
  // Dò 1 lần: gói nhận dạng tiếng Anh (Mỹ) đã có sẵn trên máy chưa (Chrome 139+: SpeechRecognition.available)
  function probe() {
    if (bias.probed) return bias.probed;
    const SR = g.SpeechRecognition || g.webkitSpeechRecognition;
    bias.probed = (async () => {
      try {
        if (!SR || typeof SR.available !== 'function' || !('processLocally' in SR.prototype)) return;
        const s = await SR.available({ langs: [LANG], processLocally: true });
        bias.local = s === 'available';
        bias.phrases = bias.local && typeof g.SpeechRecognitionPhrase === 'function' && 'phrases' in SR.prototype;
      } catch (e) { bias.local = bias.phrases = false; }
    })();
    return bias.probed;
  }
  const setup = words => r => {
    if (bias.local) r.processLocally = true;
    if (bias.phrases) r.phrases = words.map(w => new g.SpeechRecognitionPhrase(w, 5));
  };
  const today = () => new Date().toISOString().slice(0, 10);

  function weakHtml(cs, stats) {
    const P = PP(), ids = cs.map(c => c.id), wk = P.weak(stats, ids), tried = ids.filter(id => stats[id] && stats[id].n);
    if (!tried.length) return `<p class="small muted">${t('Chưa có dữ liệu – luyện một lượt để xem âm nào cần cải thiện.')}</p>`;
    const row = id => {
      const c = cs.find(x => x.id === id), s = stats[id], pct = Math.round(P.acc(s) * 100), h = (s.hist || []).slice(-5).map(x => Math.round(x.ok / x.n * 100));
      return `<span class="chip ${pct >= 80 ? 'ok' : ''}" title="${esc(t('{n} lần nói', { n: s.n }))}"><b>${esc(P.label(c))}</b> ${pct}%${h.length > 1 ? ` · ${h.join(' → ')}` : ''}</span>`;
    };
    return `<div class="small" style="margin:.2rem 0 .3rem"><b>${ic('target')} ${t('Âm cần luyện thêm')}</b></div><div class="row">${(wk.length ? wk : tried).map(row).join('')}</div>`;
  }

  // box: phần tử chứa · x: bài phát âm (PRON) · o.fallback(): chuyển sang luyện nghe khi không dùng được micro
  function mount(box, x, o = {}) {
    const P = PP(); if (!box || !P) return;
    const cs = P.forSkill(x.id);
    if (!cs.length) { box.remove(); return; }
    const total = cs.reduce((s, c) => s + P.pairsOf(c).length, 0);
    const intro = () => {
      const stats = P.load();
      box.innerHTML = `<h3>${ic('mic')} ${t('Luyện nói cặp từ')}</h3>
        <p class="small muted">${t('Nhìn từ, nghe mẫu rồi bấm micro và nói. Máy sẽ cho biết bạn nói đúng từ, hay nói thành từ còn lại trong cặp.')}</p>
        <div class="row">${cs.map(c => `<span class="chip">${esc(P.label(c))}</span>`).join('')}<span class="chip">${t('{n} cặp', { n: total })}</span></div>
        <div id="sayWeak" style="margin-top:.6rem">${weakHtml(cs, stats)}</div>
        <div style="margin-top:.8rem"><button class="btn primary" id="sayStart">${ic('mic')} ${t('Bắt đầu nói ({n} từ)', { n: N })}</button></div>`;
      box.querySelector('#sayStart').onclick = start;
    };
    function start() {
      probe();
      const stats = P.load(), q = P.buildSession(cs, stats, N), sess = {};
      let i = 0, ok = 0, scored = 0, retry = 0, ctl = null, t0 = Date.now();
      const done = () => {
        P.endSession(stats, sess, today()); P.save(stats);
        const pct = scored ? Math.round(ok / scored * 100) : 0, xp = 5 + ok * 2;
        box.innerHTML = `<h3>${ic('mic')} ${t('Luyện nói cặp từ')}</h3>
          <div class="feedback ${pct >= 80 ? 'ok' : 'no'}" style="position:static" role="status"><b>${t('Nói đúng {ok}/{n} từ', { ok, n: scored })}</b></div>
          <div class="row" style="margin-top:.5rem">${Object.keys(sess).map(id => { const c = cs.find(z => z.id === id), s = sess[id]; return `<span class="chip ${s.ok === s.n ? 'ok' : ''}"><b>${esc(P.label(c))}</b> ${s.ok}/${s.n}</span>`; }).join('')}</div>
          <div id="sayWeak" style="margin-top:.6rem">${weakHtml(cs, stats)}</div>
          <div id="sayFx"></div>
          <div class="row" style="margin-top:.8rem"><button class="btn primary" id="sayAgain">${ic('repeat')} ${t('Luyện lại')}</button></div>`;
        if (g.App && App.reward) App.reward({ spoken: ok, pron: 1, xp });
        if (g.Sfx) Sfx.finish({ pct, xp, el: box.querySelector('#sayFx'), ms: Date.now() - t0, good: 80 });
        const b = box.querySelector('#sayAgain'); b.onclick = start; b.focus();
      };
      const render = () => {
        if (i >= q.length) return done();
        const it = q[i], c = cs.find(z => z.id === it.c), ipa = it.ipa[it.side];
        retry = 0;
        box.innerHTML = `<div class="row between"><h3 style="margin:0">${ic('mic')} ${t('Luyện nói cặp từ')}</h3><span class="small muted">${i + 1}/${q.length}${bias.local ? ` · <span class="chip">${t('Nhận dạng trên máy')}</span>` : ''}</span></div>
          <div style="text-align:center;margin:.8rem 0">
            <div class="small muted">${esc(P.label(c))}${it.retry ? ` · ${t('Thử lại')}` : ''}</div>
            <div lang="en" style="font-size:2.4rem;font-weight:800;line-height:1.2">${esc(it.target)}</div>
            <div class="ipa" lang="en">${esc(ipa)}</div>
            <div class="small muted" lang="en">≠ ${esc(it.other)}</div>
            <div class="row center" style="margin-top:.6rem"><button class="btn sm" id="sayModel">${ic('audio-lines')} ${t('Nghe mẫu')}</button><button class="btn sm" id="saySlow">${ic('turtle')} ${t('Nghe chậm')}</button></div>
            <button class="mic" id="sayMic" style="margin-top:.9rem" aria-describedby="sayState">${ic('mic')}<span class="sr-only">${t('Bấm để nói')}</span></button>
            <div id="sayState" class="small" aria-live="polite" style="min-height:1.4em;margin-top:.5rem">${t('Bấm để nói')}</div>
            <div id="sayOut" aria-live="polite"></div>
          </div>`;
        const $ = s => box.querySelector(s), mic = $('#sayMic'), state = $('#sayState'), out = $('#sayOut');
        $('#sayModel').onclick = () => g.UI.speak(it.target, LANG);
        $('#saySlow').onclick = () => g.UI.tts(it.target, LANG, 0.55);
        setTimeout(() => { if (q[i] === it) g.UI.speak(it.target, LANG); }, 250);
        mic.focus();
        const next = () => { i++; render(); };
        const finish = (res, heard, audio) => {
          mic.classList.remove('rec'); mic.disabled = false;
          const play = audio ? ` <button class="btn sm" id="sayMine">${ic('headphones')} ${t('Nghe lại giọng bạn')}</button>` : '';
          if (res === 'neither') {
            retry++;
            if (retry > MAX_RETRY) {
              state.textContent = t('Vẫn chưa rõ – chuyển sang từ tiếp theo.');
              out.innerHTML = `<div class="row center" style="margin-top:.4rem"><button class="btn primary" id="sayNext">${t('Từ tiếp theo')}</button></div>`;
              $('#sayNext').onclick = next; $('#sayNext').focus(); return;
            }
            state.textContent = t('Chưa nghe rõ – thử lại nhé (không trừ điểm).');
            out.innerHTML = heard ? `<div class="small muted">${t('Máy nghe được: “{heard}”', { heard: esc(heard) })}${play}</div>` : '';
            bindMine(audio); mic.focus(); return;
          }
          const good = res === 'target';
          scored++; if (good) ok++;
          P.record(stats, it.c, good); (sess[it.c] = sess[it.c] || { ok: 0, n: 0 }).n++; if (good) sess[it.c].ok++;
          if (!good) P.adapt(q, i, it);
          if (g.Sfx) Sfx.answer(good, { el: mic });
          mic.disabled = true;
          if (good) {
            state.innerHTML = `<b style="color:var(--good)">${ic('circle-check')} ${t('Chính xác!')}</b>`;
            out.innerHTML = `<div class="row center" style="margin-top:.4rem">${play}<button class="btn primary" id="sayNext">${t('Từ tiếp theo')}</button></div>`;
          } else {
            const tip = (P.TIPS[it.c] || (() => []))()[it.side] || '';
            state.innerHTML = `<b style="color:var(--again)">${ic('circle-x')} ${t('Máy nghe thành “{heard}” – từ còn lại trong cặp.', { heard: esc(it.other) })}</b>`;
            out.innerHTML = `<div class="g-tip" style="text-align:left;margin-top:.5rem">${ic('lightbulb')} <b lang="en">${esc(it.target)} ${esc(ipa)}</b> – ${esc(tip)}</div>
              <div class="row center" style="margin-top:.5rem">${play}<button class="btn" id="sayModel2">${ic('audio-lines')} ${t('Nghe mẫu')}</button><button class="btn primary" id="sayNext">${t('Từ tiếp theo')}</button></div>`;
            $('#sayModel2').onclick = () => g.UI.speak(it.target, LANG);
          }
          bindMine(audio);
          $('#sayNext').onclick = next; $('#sayNext').focus();
        };
        const bindMine = audio => { const b = $('#sayMine'); if (b && audio) { const a = new Audio(audio); b.onclick = () => a.play(); } };
        const fail = code => {
          mic.classList.remove('rec'); mic.disabled = false;
          if ((code === 'phrases-not-supported' || code === 'language-not-supported') && (bias.local || bias.phrases)) { bias.local = bias.phrases = false; return listen(); } // máy chưa hỗ trợ → nhận dạng thường
          if (code === 'not-allowed' || code === 'service-not-allowed' || code === 'unsupported' || code === 'audio-capture') return blocked(code);
          if (code === 'no-speech' || code === 'network' || code === 'busy' || code === 'whisper') return finish('neither', '', '');
          state.textContent = g.UI.recErrorText(code);
        };
        const listen = () => {
          if (ctl && ctl.stop) { ctl.stop(); return; } // bấm lần 2 = dừng, chấm luôn
          let got = false, ended = false;
          state.textContent = t('Đang nghe…'); out.innerHTML = '';
          mic.classList.add('rec'); mic.setAttribute('aria-pressed', 'true');
          ctl = g.UI.recognize(it.target, LANG, {
            setup: setup(it.words),
            result: ({ alts, heard, audio }) => { got = true; ctl = null; const d = P.decide(alts && alts.length ? alts : [heard], it.target, it.other); finish(d.res, d.heard, audio); },
            error: code => { got = true; ctl = null; fail(code); },
            end: () => {
              ended = true; mic.removeAttribute('aria-pressed');
              if (!got) { state.textContent = t('Đang xử lý…'); mic.classList.remove('rec'); setTimeout(() => { if (!got && q[i] === it) { ctl = null; finish('neither', '', ''); } }, 2500); }
            },
          });
        };
        mic.onclick = () => probe().then(listen);
      };
      // Không dùng được micro → hướng dẫn thân thiện + chuyển sang luyện nghe
      const blocked = code => {
        box.innerHTML = `<h3>${ic('mic')} ${t('Luyện nói cặp từ')}</h3>
          <div class="g-tip" role="alert">${ic('info')} ${code === 'unsupported' ? t('Thiết bị này chưa hỗ trợ nhận dạng giọng nói – hãy luyện phần nghe phân biệt bên dưới.') : t('Micro bị chặn. Bấm biểu tượng ổ khóa trên thanh địa chỉ → cho phép Micro, rồi thử lại. Trong lúc đó, bạn có thể luyện phần nghe bên dưới.')}</div>
          <div class="row" style="margin-top:.7rem"><button class="btn primary" id="sayListen">${ic('headphones')} ${t('Luyện nghe')}</button><button class="btn" id="sayRetry">${ic('repeat')} ${t('Thử lại')}</button></div>`;
        box.querySelector('#sayListen').onclick = () => o.fallback && o.fallback();
        box.querySelector('#sayRetry').onclick = start;
        box.querySelector('#sayListen').focus();
      };
      render();
    }
    intro();
  }
  g.PronSay = { mount, probe, _bias: bias };
})(typeof self !== 'undefined' ? self : this);
