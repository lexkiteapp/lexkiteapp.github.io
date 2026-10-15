/* ⚡ Phản xạ 60 giây (#/reflex): nghe 1 câu ngắn → nhại lại ngay → chấm từng từ trên máy (xanh = đúng, đỏ = thiếu/sai).
 * Nguồn câu: (1) đoạn YouTube người học đã lưu kèm mốc thời gian (add-on) – phát đúng 3–5 giây qua trình nhúng chính thức
 * youtube-nocookie (start/end); (2) câu ví dụ có giọng Kokoro. Không máy chủ, không lưu âm thanh. */
(function () {
  const { $, esc, toast } = UI;
  const App = window.App;
  const { state, routes } = App;
  const view = App.view;
  const norm = s => String(s || '').toLowerCase().replace(/[’']/g, "'").replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ').trim();
  const ytOf = src => { try { const u = new URL(src); const id = /youtu\.be$/.test(u.hostname) ? u.pathname.slice(1) : u.searchParams.get('v'); const t = parseInt(String(u.searchParams.get('t') || '0').replace(/s$/, ''), 10) || 0; return id && /^[\w-]{6,15}$/.test(id) ? { id, t } : null; } catch (e) { return null; } };
  const kKey = text => (window.KVoice && window.LISTEN_AUDIO ? (k => (LISTEN_AUDIO.has(k) ? k : ''))(KVoice.lineKey('bf_emma', String(text).trim())) : '');

  function pool() {
    const out = [];
    for (const c of Object.values(state.cards || {})) for (const x of c.contexts || []) {
      const y = x.source && ytOf(x.source), n = norm(x.text).split(' ').length;
      if (y && n >= 3 && n <= 16) out.push({ kind: 'yt', text: x.text, id: y.id, t: y.t, word: c.word });
    }
    const D = window.IELTS_DATA || { TOPICS: [] };
    for (const tp of D.TOPICS) for (const w of tp.words) if (w.ex) { const n = norm(w.ex).split(' ').length, k = n >= 4 && n <= 14 ? kKey(w.ex) : ''; if (k) out.push({ kind: 'audio', text: w.ex, key: k, word: w.word }); }
    // Câu trong 30 bài đọc (đã có giọng Kokoro sẵn) – nguồn dự phòng phong phú
    if (out.length < 40 && window.KVoice) for (const r of window.READINGS || []) for (const sen of KVoice.split(r.text || '')) { const n = norm(sen).split(' ').length, k = n >= 5 && n <= 14 ? kKey(sen) : ''; if (k) out.push({ kind: 'audio', text: sen, key: k }); }
    return UI.shuffle(out).slice(0, 40);
  }

  // Tô từng từ: xanh nếu người học nói được (theo thứ tự, cho phép lệch), đỏ nếu thiếu
  function colorize(target, heard) {
    const want = norm(target).split(' '), got = norm(heard).split(' ');
    let j = 0, ok = 0;
    const html = String(target).split(/\s+/).map((tok, i) => {
      const w = want[i] || ''; let hit = false;
      for (let k = j; k < Math.min(got.length, j + 4); k++) if (got[k] === w) { hit = true; j = k + 1; break; }
      if (hit) ok++;
      return `<span class="rx-w ${hit ? 'ok' : 'no'}">${esc(tok)}</span>`;
    }).join(' ');
    return { html, pct: Math.round(ok / Math.max(1, want.length) * 100) };
  }

  routes.reflex = function () {
    const items = pool();
    view.innerHTML = `
      <div class="page-head"><div><h1>⚡ ${t('Phản xạ 60 giây')}</h1><p class="muted">${t('Nghe một câu ngắn rồi nhại lại ngay – luyện phản xạ nghe nói như người bản xứ.')}</p></div><div class="rx-timer" id="rxT">60</div></div>
      <div class="card rx-stage" id="rxStage" aria-live="polite"></div>
      <div class="row center" style="gap:.6rem;margin-top:1rem"><button class="btn primary lg" id="rxGo">▶ ${t('Bắt đầu')}</button><button class="btn" id="rxNext" hidden>${t('Câu tiếp')} →</button></div>
      <p class="tiny muted center" style="margin-top:.8rem">${t('Mẹo: lưu câu trong video YouTube bằng add-on Lexkite (bấm vào từ trong phụ đề) để luyện đúng những gì bạn đang xem.')}</p>`;
    if (!items.length) { $('#rxStage').innerHTML = `<p class="muted center">${t('Chưa có câu để luyện – hãy lưu vài câu từ YouTube hoặc quay lại sau khi kho giọng đọc cập nhật.')}</p>`; $('#rxGo').hidden = true; return; }
    let i = 0, left = 60, tick = 0, score = 0, done = 0, audio = null, rec = null, ytTimer = 0;
    const stopAll = () => { clearTimeout(ytTimer); if (audio) { audio.pause(); audio = null; } if (rec && rec.stop) try { rec.stop(); } catch (e) { /* bỏ qua */ } const f = $('#rxYT'); if (f) f.remove(); };
    const finish = () => {
      stopAll(); clearInterval(tick);
      $('#rxStage').innerHTML = `<div class="center"><div style="font-size:2.4rem">🏁</div><h2>${t('Hết giờ!')}</h2><p>${t('{n} câu · trung bình {p}%', { n: done, p: done ? Math.round(score / done) : 0 })}</p></div>`;
      $('#rxNext').hidden = true; $('#rxGo').hidden = false; $('#rxGo').textContent = '↻ ' + t('Chơi lại');
      if (done) App.reward({ spoken: done, xp: 5 + done * 2 });
    };
    const listen = it => {
      $('#rxStage').insertAdjacentHTML('beforeend', `<div class="rx-mic" id="rxMic">🎙️ ${t('Nhại lại câu vừa nghe…')}</div>`);
      rec = UI.recognize(it.text, state.settings.accent || 'en-GB', {
        result: ({ heard }) => {
          const c = colorize(it.text, heard); score += c.pct; done++;
          $('#rxStage').innerHTML = `<div class="rx-sent">${c.html}</div><div class="small muted" style="margin-top:.4rem">${t('Bạn nói')}: “${esc(heard || '…')}” · <b>${c.pct}%</b></div>`;
          c.pct >= 80 ? Sfx.correct() : Sfx.wrong && Sfx.wrong();
          $('#rxNext').hidden = false;
        },
        error: () => { $('#rxStage').insertAdjacentHTML('beforeend', `<p class="small muted">${t('Không nghe rõ – thử lại hoặc bỏ qua.')}</p>`); $('#rxNext').hidden = false; },
      });
    };
    const play = () => {
      stopAll(); $('#rxNext').hidden = true;
      const it = items[i % items.length];
      $('#rxStage').innerHTML = `<div class="rx-sent muted">🎧 ${t('Nghe kỹ…')}</div>`;
      if (it.kind === 'yt') {
        const s = Math.max(0, it.t - 1), e = s + 5;
        $('#rxStage').insertAdjacentHTML('afterbegin', `<iframe id="rxYT" class="rx-yt" src="https://www.youtube-nocookie.com/embed/${it.id}?start=${s}&end=${e}&autoplay=1&controls=0&modestbranding=1&rel=0&playsinline=1" allow="autoplay; encrypted-media" title="YouTube"></iframe>`);
        ytTimer = setTimeout(() => { const f = $('#rxYT'); if (f) f.remove(); listen(it); }, 5600);
      } else {
        audio = new Audio('https://lexkiteapp.github.io/audio/l/' + it.key + '.mp3');
        audio.onended = () => listen(it); audio.onerror = () => { i++; play(); };
        audio.play().catch(() => listen(it));
      }
    };
    $('#rxGo').onclick = () => {
      i = 0; left = 60; score = 0; done = 0; $('#rxGo').hidden = true; $('#rxT').textContent = left;
      clearInterval(tick); tick = setInterval(() => { left--; $('#rxT').textContent = left; if (left <= 0) finish(); }, 1000);
      play();
    };
    $('#rxNext').onclick = () => { i++; play(); };
    App.cleanup = () => { stopAll(); clearInterval(tick); };
  };
})();
