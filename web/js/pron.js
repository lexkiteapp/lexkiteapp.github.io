/* Thư viện phát âm (kiểu ELSA): bảng 44 âm IPA, khẩu hình, cặp từ dễ nhầm (nghe – chọn), luyện nói có chấm điểm,
 * chuyên đề cho người Việt: âm cuối, -ed/-s, trọng âm, ngữ điệu, nối âm. */
(function () {
  const { $, $$, esc, speak, tts, ring, shuffle } = UI;
  const App = window.App;
  const { state, routes } = App;
  const view = App.view;
  const P = () => window.PRON || [];
  const GROUPS = [
    { id: 'vowels', name: 'Nguyên âm đơn', emoji: '🅰️', desc: '12 nguyên âm – phân biệt âm dài/ngắn (ship – sheep)' },
    { id: 'diphthongs', name: 'Nguyên âm đôi', emoji: '🔀', desc: '8 nguyên âm đôi – trượt từ âm này sang âm kia' },
    { id: 'consonants', name: 'Phụ âm', emoji: '🅱️', desc: '24 phụ âm – vô thanh/hữu thanh, vị trí cấu âm' },
    { id: 'vn', name: 'Sửa lỗi người Việt', emoji: '🇻🇳', desc: 'Âm cuối, đuôi -ed/-s, /θ ð/, /ʃ s/, cụm phụ âm' },
    { id: 'stress', name: 'Trọng âm & ngữ điệu', emoji: '🎵', desc: 'Trọng âm từ, câu, ngữ điệu, nối âm – điểm Pronunciation band 7+' },
  ];
  const done = () => state.game.pronDone || {};
  const accent = () => state.settings.accent;

  routes.pron = function (id) {
    if (id) return lesson(decodeURIComponent(id));
    const d = done(), all = P();
    view.innerHTML = `
      <div class="page-head"><div><h1>🔤 ${t('Thư viện phát âm')}</h1><p class="muted">${t('Luyện như ELSA: học khẩu hình từng âm IPA, nghe – phân biệt cặp từ dễ nhầm, nói và được chấm điểm, rồi sửa các lỗi người Việt hay mắc.')}</p></div>
        ${ring(all.length ? Object.keys(d).length / all.length * 100 : 0, `${Object.keys(d).length}/${all.length}`, 'var(--good)')}</div>
      ${GROUPS.map(gr => {
        const ls = all.filter(x => x.group === gr.id);
        if (!ls.length) return '';
        const isChart = ['vowels', 'diphthongs', 'consonants'].includes(gr.id);
        return `<div class="section-title"><h2>${gr.emoji} ${esc(t(gr.name))}</h2><span class="muted small">${esc(t(gr.desc))}</span></div>
          ${isChart ? `<div class="ipa-grid">${ls.map(x => `<a class="ipa-tile ${d[x.id] ? 'ok' : ''} ${x.mouth && x.mouth.voiced === false ? 'unv' : ''}" href="#/pron/${encodeURIComponent(x.id)}" title="${esc(x.title)}">
              <b>${esc(x.ipa.replace(/\//g, ''))}</b><span>${esc((x.words[0] || {}).w || '')}</span>${d[x.id] ? '<i>✓</i>' : ''}</a>`).join('')}</div>`
          : `<div class="grid auto">${ls.map(x => `<a class="card hover topic-card" href="#/pron/${encodeURIComponent(x.id)}" style="color:var(--text)">
              <div class="row between"><span class="em">${x.emoji}</span>${d[x.id] ? `<span class="chip ok">✓ ${d[x.id]}%</span>` : `<span class="chip">${esc(x.ipa || '')}</span>`}</div>
              <h3>${esc(x.title)}</h3><div class="muted small">${esc((x.how || '').slice(0, 110))}${(x.how || '').length > 110 ? '…' : ''}</div></a>`).join('')}</div>`}`;
      }).join('') || `<div class="card empty"><div class="em">🔤</div>${t('Đang cập nhật bài học…')}</div>`}
      <p class="tiny muted" style="margin-top:1rem">${t('Ô viền xám nhạt = phụ âm vô thanh · Mỗi bài: khẩu hình → nghe mẫu → phân biệt cặp từ → nói & chấm điểm.')}</p>`;
  };

  // Hình khẩu hình đơn giản (SVG) cho nguyên âm
  function mouthSvg(m) {
    if (!m || !m.lips) return '';
    const open = { close: 6, mid: 16, open: 28 }[m.jaw] || 14;
    const wide = { spread: 70, neutral: 56, round: 34 }[m.lips] || 56;
    const tx = { front: 92, central: 100, back: 112 }[m.tongue] || 100;
    const ty = 108 - ({ close: 14, mid: 8, open: 2 }[m.jaw] || 8);
    return `<svg viewBox="0 0 200 160" class="mouth" role="img" aria-label="${t('Khẩu hình')}">
      <circle cx="100" cy="80" r="74" fill="var(--surface-2)"/>
      <ellipse cx="100" cy="98" rx="${wide / 2 + 10}" ry="${open / 2 + 12}" fill="#f9a8b8"/>
      <ellipse cx="100" cy="98" rx="${wide / 2}" ry="${open / 2 + 2}" fill="#7f1d1d"/>
      <ellipse cx="${tx}" cy="${ty + open / 3}" rx="18" ry="6" fill="#fb7185" opacity=".9"/>
      <text x="100" y="152" text-anchor="middle" class="tl-ax">${{ spread: t('môi dàn rộng'), neutral: t('môi tự nhiên'), round: t('môi tròn') }[m.lips] || ''} · ${{ close: t('hàm khép'), mid: t('hàm hé'), open: t('hàm mở rộng') }[m.jaw] || ''}</text></svg>`;
  }
  const placeVi = k => ({ lips: t('hai môi'), teeth: t('môi – răng'), 'tongue-teeth': t('lưỡi – răng'), ridge: t('lợi trên'), palate: t('vòm miệng'), back: t('cuống lưỡi'), throat: t('thanh hầu') })[k];
  const mannerVi = k => ({ stop: t('âm tắc (bật hơi)'), fricative: t('âm xát'), affricate: t('âm tắc – xát'), nasal: t('âm mũi'), approximant: t('âm tiếp cận') })[k];

  function lesson(id) {
    const all = P(), i = all.findIndex(x => x.id === id), x = all[i];
    if (!x) return routes.pron();
    const m = x.mouth || {};
    const next = all[i + 1], prev = all[i - 1];
    let scores = {};
    App.cleanup = () => UI.stopRecognize();
    view.innerHTML = `
      <a href="#/pron" class="small">← ${t('Thư viện phát âm')}</a>
      <div class="grid" style="grid-template-columns:minmax(0,1fr) 220px;align-items:center;margin:.7rem 0 1rem" id="pHead">
        <div class="card hero-main" style="min-height:100%">
          <div class="row nowrap"><div class="ipa-big">${esc(x.ipa)}</div><div><h1 style="margin:0;color:#fff">${esc(x.title)}</h1>
            <div class="row" style="margin-top:.4rem">${m.voiced != null ? `<span class="chip" style="background:rgba(255,255,255,.2);color:#fff">${m.voiced ? t('hữu thanh (rung cổ)') : t('vô thanh (không rung)')}</span>` : ''}${m.long ? `<span class="chip" style="background:rgba(255,255,255,.2);color:#fff">${t('âm dài ː')}</span>` : ''}${m.place ? `<span class="chip" style="background:rgba(255,255,255,.2);color:#fff">${placeVi(m.place) || m.place}</span><span class="chip" style="background:rgba(255,255,255,.2);color:#fff">${mannerVi(m.manner) || m.manner || ''}</span>` : ''}</div></div></div>
          <p style="margin:.8rem 0 0;opacity:.95">${esc(x.how)}</p>
        </div>
        <div class="card" style="text-align:center">${mouthSvg(m) || `<div style="font-size:3.5rem">${x.emoji}</div>`}</div>
      </div>
      ${x.rules ? `<div class="card"><h3>📋 ${t('Quy tắc')}</h3><div class="grid g3">${x.rules.map(r => `<div class="sortbox"><b style="font-size:1.2rem">${esc(r.label)}</b><div class="small muted">${esc(r.when)}</div><div class="row center" style="margin-top:.4rem">${(r.ex || []).map(w => `<button class="chip" data-speak="${esc(w)}" style="border:0;cursor:pointer">🔊 ${esc(w)}</button>`).join('')}</div></div>`).join('')}</div></div>` : ''}
      <div class="grid g2" style="margin-top:1rem">
        <div class="g-mistake"><b>🇻🇳 ${t('Lỗi hay gặp')}</b><div class="small" style="margin-top:.3rem">${esc(x.vn)}</div></div>
        <div class="g-tip">💡 ${esc(x.tip)}</div>
      </div>

      <div class="card" style="margin-top:1rem"><div class="row between"><h3 style="margin:0">🗣️ ${t('Luyện từ ({n})', { n: x.words.length })}</h3><span class="small muted">${t('Bấm 🔊 nghe mẫu → 🎙️ nói → xem điểm')}</span></div>
        <div id="wList">${x.words.map((w, k) => `<div class="prow" data-k="${k}">
          <div class="grow"><b style="font-size:1.1rem">${esc(w.w)}</b> <span class="ipa">${esc(w.ipa)}</span>${w.note ? ` <span class="chip">${esc(w.note)}</span>` : ''}</div>
          <button class="icon-btn sm" data-speak="${esc(w.w)}">🔊</button><button class="icon-btn sm" data-slow="${esc(w.w)}">🐢</button>
          <button class="icon-btn sm pmic" data-k="${k}" title="${t('Nói & chấm điểm')}">🎙️</button><span class="pscore" data-s="${k}"></span></div>`).join('')}</div>
        <div class="small muted" id="pHint" style="margin-top:.5rem"></div></div>

      ${(x.pairs || []).length ? `<div class="card" style="margin-top:1rem"><h3>👂 ${t('Nghe & phân biệt cặp từ')}</h3><p class="small muted">${t('Nghe một từ trong cặp rồi chọn đúng từ bạn nghe được. Luyện tai trước, miệng sẽ chuẩn theo.')}</p>
        <div class="row">${x.pairs.map(p => `<span class="chip">${esc(p[0])} ↔ ${esc(p[1])}</span>`).join('')}</div>
        <div id="pairGame" style="margin-top:.8rem"><button class="btn primary" id="startPairs">▶️ ${t('Bắt đầu ({n} lượt)', { n: 8 })}</button></div></div>` : ''}

      ${(x.sentences || []).length ? `<div class="card" style="margin-top:1rem"><h3>📢 ${t('Luyện câu')}</h3>${x.sentences.map((s, k) => `<div class="prow"><div class="grow">${esc(s)}</div>
        <button class="icon-btn sm" data-speak-text="${esc(s.replace(/[↗↘‿]|\s\/\s/g, ' ').replace(/\s+/g, ' ').trim())}">🔊</button><button class="icon-btn sm smic" data-k="${k}">🎙️</button><span class="pscore" data-ss="${k}"></span></div>`).join('')}</div>` : ''}

      ${(x.quiz || []).length ? `<div class="card" style="margin-top:1rem"><h3>✏️ ${t('Kiểm tra nhanh')}</h3>${x.quiz.map((q, k) => `<div class="q-item" data-q="${k}"><b>${k + 1}. ${esc(q.q)}</b><div class="opts">${q.options.map((o, j) => `<button data-v="${j}">${esc(o)}</button>`).join('')}</div><div class="small" data-explain hidden></div></div>`).join('')}</div>` : ''}

      <div class="row between" style="margin-top:1rem">${prev ? `<a class="btn" href="#/pron/${encodeURIComponent(prev.id)}">← ${esc(prev.ipa)}</a>` : '<span></span>'}${next ? `<a class="btn primary" href="#/pron/${encodeURIComponent(next.id)}">${esc(next.ipa)} →</a>` : `<a class="btn primary" href="#/pron">${t('Về thư viện')}</a>`}</div>`;
    if (innerWidth < 700) $('#pHead').style.gridTemplateColumns = '1fr';
    App.bindCommon();
    $$('[data-slow]').forEach(b => b.onclick = () => tts(b.dataset.slow, accent(), 0.55));
    setTimeout(() => speak(x.words[0].w, accent()), 300);

    const save = async () => {
      const vals = Object.values(scores);
      if (vals.length < Math.min(5, x.words.length)) return;
      const pct = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
      state.game = await Game.mutate(g => { g.pronDone = { ...(g.pronDone || {}), [x.id]: Math.max(pct, (g.pronDone || {})[x.id] || 0) }; });
    };
    const mic = (btn, target, out, onScore) => {
      btn.onclick = () => {
        btn.classList.add('rec');
        UI.recognize(target.replace(/[↗↘‿]|\s\/\s/g, ' ').replace(/\s+/g, ' ').trim(), accent(), {
          result: ({ score, heard, audio }) => {
            const c = score >= 85 ? 'var(--good)' : score >= 65 ? 'var(--hard)' : 'var(--again)';
            out.innerHTML = `<b style="color:${c}">${score}</b>${audio ? ` <button class="icon-btn sm" title="${t('Nghe lại giọng bạn')}">▶️</button>` : ''}`;
            out.title = t('Máy nghe: “{heard}”', { heard });
            const pb = out.querySelector('button'); if (pb) { const a = new Audio(audio); pb.onclick = () => a.play(); }
            score >= 85 ? Sfx.correct() : score < 65 && Sfx.wrong();
            $('#pHint').textContent = t('Máy nghe được: “{heard}”', { heard });
            onScore && onScore(score);
          },
          error: code => { $('#pHint').textContent = UI.recErrorText(code); },
          end: () => btn.classList.remove('rec'),
        });
      };
    };
    $$('.pmic').forEach(b => mic(b, x.words[+b.dataset.k].w, $(`[data-s="${b.dataset.k}"]`), s => { scores[b.dataset.k] = Math.max(scores[b.dataset.k] || 0, s); if (s >= 65) App.reward({ spoken: 1, xp: 2 }); save(); }));
    $$('.smic').forEach(b => mic(b, x.sentences[+b.dataset.k], $(`[data-ss="${b.dataset.k}"]`), s => { if (s >= 70) App.reward({ spoken: 2, xp: 4 }); }));

    // Trò chơi nghe – phân biệt cặp từ
    const sp = $('#startPairs');
    if (sp) sp.onclick = () => {
      const rounds = shuffle(Array.from({ length: 8 }, (_, k) => x.pairs[k % x.pairs.length])).map(p => ({ p, ans: Math.random() < .5 ? 0 : 1 }));
      let r = 0, ok = 0;
      const box = $('#pairGame');
      const step = () => {
        if (r >= rounds.length) {
          const pct = Math.round(ok / rounds.length * 100);
          box.innerHTML = `<div class="feedback ${pct >= 75 ? 'ok' : 'no'}" style="position:static"><b>${t('Nghe đúng {ok}/{n}', { ok, n: rounds.length })}</b> – ${pct >= 75 ? t('tai bạn đã phân biệt tốt!') : t('nghe chậm lại từng cặp và thử lần nữa.')} <button class="btn sm" id="startPairs2">↺ ${t('Chơi lại')}</button></div>`;
          App.reward({ quizzes: 1, pron: 1, xp: 5 + ok * 2 }); if (pct >= 75) Sfx.win();
          $('#startPairs2').onclick = sp.onclick; return;
        }
        const { p, ans } = rounds[r];
        box.innerHTML = `<div class="row"><button class="btn" id="replay">🔊 ${t('Nghe lại ({i}/{n})', { i: r + 1, n: rounds.length })}</button></div>
          <div class="options two" style="margin-top:.6rem">${p.map((w, k) => `<button class="option" data-k="${k}">${esc(w)}</button>`).join('')}</div>`;
        const play = () => tts(p[ans], accent(), 0.85);
        $('#replay').onclick = play; setTimeout(play, 200);
        $$('#pairGame .option').forEach(b => b.onclick = () => {
          const right = +b.dataset.k === ans;
          b.classList.add(right ? 'right' : 'wrong'); if (!right) $$('#pairGame .option')[ans].classList.add('right');
          right ? (ok++, Sfx.correct()) : Sfx.wrong();
          r++; setTimeout(step, 900);
        });
      };
      step();
    };

    // Kiểm tra nhanh (chuyên đề)
    let qa = 0, qr = 0;
    $$('.q-item').forEach(item => $$('.opts button', item).forEach(btn => btn.onclick = async () => {
      if (item.dataset.locked) return; item.dataset.locked = 1;
      const q = x.quiz[+item.dataset.q], okk = +btn.dataset.v === q.answer;
      qa++; if (okk) qr++;
      $$('.opts button', item).forEach(b2 => { if (+b2.dataset.v === q.answer) b2.classList.add('right'); });
      if (!okk) btn.classList.add('wrong');
      Sfx.answer(okk);
      const ex = $('[data-explain]', item); ex.hidden = false; ex.innerHTML = `${okk ? '✅' : '❌'} ${esc(q.explain)}`;
      if (qa === x.quiz.length) {
        const pct = Math.round(qr / qa * 100);
        await App.reward({ quizzes: 1, pron: 1, perfect: pct === 100 ? 1 : 0, xp: 8 + qr * 3 });
        state.game = await Game.mutate(g => { g.pronDone = { ...(g.pronDone || {}), [x.id]: Math.max(pct, (g.pronDone || {})[x.id] || 0) }; });
        if (pct >= 80) { Sfx.win(); confetti(80); }
      }
    }));
  }
})();
