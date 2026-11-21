/* 📚 Truyện & podcast theo cấp (#/stories · #/stories/<id>/<chương>) – gói lười 'stories'. Lõi thuần: stories/core.js; nội dung: cpack/stories/lib.js (scripts/stories/build-lib.mjs); spec: docs/STORIES.md §5.
 * Thư viện → trình đọc/nghe (tô câu theo giọng đọc) → chạm từ → thẻ tra (Đã biết / Học → App.addWord) → quiz → tổng kết. Chỉ token sẵn có (css/stories.css) → tự đúng sáng/tối. */
(function (g) {
  const { $, $$, esc } = UI, S = g.Stories, App = g.App, { state, routes } = App, view = App.view;
  const LIB = () => g.STORIES_LIB || [];
  const byId = id => LIB().find(x => x.id === id);
  const LS = { get: (k, d) => { try { const v = localStorage.getItem('lk.st.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }, set: (k, v) => { try { localStorage.setItem('lk.st.' + k, JSON.stringify(v)); } catch (e) { /* đầy / riêng tư */ } } };
  const today = () => new Date().toLocaleDateString('sv');
  const mine = () => ({ ...S.empty(), ...((state.game || {}).story || {}) });
  const save = fn => Game.mutate(gs => { gs.story = fn({ ...S.empty(), ...(gs.story || {}) }); }).then(s => { state.game = s; if (g.Sync) Sync.schedule(); return s; });
  const accent = () => (state.settings && state.settings.accent) || 'en-GB';
  const KIND = x => x.kind === 'podcast' ? t('Podcast') : t('Truyện đọc');
  const chTitle = (x, i) => (x.chapters[i] || {}).title || '';
  const minsOf = x => S.minutes(x);
  const doneCount = x => x.chapters.filter((_, i) => mine().done[x.id + '#' + i]).length;
  const nextCh = x => Math.min(x.chapters.length - 1, (mine().at || {})[x.id] || 0);
  // chương kế cho lộ trình ngày (ux1.js đọc lk.st.next, không cần nạp gói truyện): đang dở thì tiếp, chưa thì truyện đầu của cấp mình
  const rememberNext = () => { const st = mine(), lv = myLevel(), x = LIB().find(y => (st.at || {})[y.id] != null && doneCount(y) < y.chapters.length) || LIB().find(y => y.level === lv && doneCount(y) < y.chapters.length); LS.set('next', x ? { id: x.id, title: x.title, level: x.level, kind: x.kind, ch: nextCh(x), min: minsOf(x) } : null); };
  const myLevel = () => { const l = LS.get('lv', ''); if (S.LEVELS.includes(l)) return l; const p = (state.settings || {}).placement, c = p && String(p.vCefr || p.gCefr || '').toUpperCase().slice(0, 2); return S.LEVELS.includes(c) ? c : 'A2'; };
  const bar = (pct, label) => `<div class="st-bar" role="progressbar" aria-label="${esc(label || t('Tiến độ'))}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><i style="width:${pct}%"></i></div>`;
  // bìa 2D 0 credit: nhân vật 2D có sẵn (Ama/Carlos/Kit – x.cover.cast[0]) trên nền cấp độ, huy hiệu loại nội dung; không sinh ảnh nên không dính cổng TEXT_OBJ/credit
  const cover = x => `<div class="st-cover st-lv-${x.level}" aria-hidden="true">${g.Chars && g.Chars.slot ? Chars.slot((x.cover && x.cover.cast && x.cover.cast[0]) || 'kit', { size: 'xs', pose: 'idle', cls: 'st-cav', lazy: true }) : ''}<span class="st-ck">${x.kind === 'podcast' ? UI.icon('headphones') : UI.icon('book-open')}</span></div>`;

  // ---- thời gian đọc/nghe → game.storyMin (mỗi 15 s khi tab hiện) ----
  let tick = 0;
  function startClock() {
    stopClock();
    tick = setInterval(() => { if (document.hidden || !document.getElementById('stReader')) return; save(st => st).then(() => Game.mutate(gs => { gs.storyMin = S.addTime(gs.storyMin, today(), 15); }).then(s => { state.game = s; })); }, 15000);
  }
  const stopClock = () => { if (tick) clearInterval(tick); tick = 0; };
  const goalNow = () => S.goal((state.game || {}).storyMin, today(), 10);

  // ================= Thư viện =================
  routes.stories = arg => {
    if (arg) return reader(arg);
    stopAll();
    const lv = myLevel(), st = mine(), gl = goalNow();
    rememberNext();
    const cont = LIB().filter(x => (st.at || {})[x.id] != null && doneCount(x) < x.chapters.length).sort((a, b) => 0)[0];
    const list = LIB().filter(x => x.level === lv);
    view.innerHTML = `<div class="st-lib">
      <div class="page-head"><div><h1>${UI.icon('book-open')} ${t('Truyện & podcast')}</h1><p class="muted">${t('Đọc và nghe truyện theo cấp độ; chạm từ mới để học.')}</p></div></div>
      <div class="card st-goal"><div class="row between"><b>${t('Hôm nay')}</b><span class="tiny muted" dir="ltr">${gl.min} / ${gl.target} ${t('phút')}</span></div>${bar(gl.pct, t('Hôm nay'))}</div>
      <div class="st-lvs" role="radiogroup" aria-label="${t('Trình độ')}">${S.LEVELS.map(l => `<button type="button" role="radio" class="chip st-lvb" data-lv="${l}" aria-checked="${l === lv}">${l}</button>`).join('')}</div>
      ${cont ? `<a class="card st-cont" href="#/stories/${cont.id}/${nextCh(cont)}">${cover(cont)}<div class="st-info"><span class="tiny muted">${t('Tiếp tục')}</span><b>${esc(cont.title)}</b><span class="tiny muted">${t('Chương {n}/{m}', { n: nextCh(cont) + 1, m: cont.chapters.length })}</span>${bar(Math.round(doneCount(cont) / cont.chapters.length * 100))}</div></a>` : ''}
      <div class="st-list" id="stList">${list.length ? list.map(card).join('') : `<p class="muted">${t('Chưa có nội dung cho cấp này.')}</p>`}</div>
    </div>`;
    $$('.st-lvb').forEach(b => { b.onclick = () => { LS.set('lv', b.dataset.lv); routes.stories(); }; });
  };
  const card = x => { const n = doneCount(x), tot = x.chapters.length; return `<a class="card st-card" href="#/stories/${x.id}/${nextCh(x)}">${cover(x)}<div class="st-info"><b>${esc(x.title)}</b><span class="st-meta"><span class="chip">${x.level}</span><span class="chip">${x.kind === 'podcast' ? UI.icon('headphones') : UI.icon('book-open')} ${KIND(x)}</span><span class="tiny muted">${t('{n} phút', { n: minsOf(x) })}</span>${n >= tot ? `<span class="st-done" aria-label="${t('Đã đọc hết')}">${UI.icon('check')}</span>` : n ? `<span class="tiny muted">${n}/${tot}</span>` : ''}</span></div></a>`; };

  // ================= Trình đọc / nghe =================
  let P = null; // trạng thái trình phát hiện tại
  function stopAll() { if (P) { P.stop(); P = null; } stopClock(); const sh = $('#stSheet'); if (sh) sh.remove(); }

  function reader(arg) {
    stopAll();
    const [id, c0] = String(arg || '').split('/'), x = byId(id), ci = Math.max(0, parseInt(c0 || '0', 10) || 0);
    if (!x || !x.chapters[ci]) { location.replace('#/stories'); return; }
    const ch = x.chapters[ci], sents = S.sentencesOf(ch), pod = x.kind === 'podcast', t0 = Date.now();
    const st0 = mine(), inDeck = w => App.inDeck(w), wset = new Set((ch.words || []).map(S.base));
    const isNew = tk => tk.w && tk.l.some(l => wset.has(l)) && !st0.known[tk.w] && !tk.l.some(l => st0.known[l]);
    const row = (s, i) => {
      const who = pod ? (x.speakers || {})[s.who] : '';
      const toks = S.tokens(S.textOf(s)).map(tk => tk.w ? `<button type="button" class="st-w${tk.l.some(l => wset.has(l)) ? ' st-key' : ''}" data-w="${esc(tk.w)}" data-i="${i}">${esc(tk.t)}</button>` : esc(tk.t)).join('');
      return `<div class="st-s${pod ? ' st-pod ' + (s.who === 'A' ? 'st-a' : 'st-b') : ''}" data-i="${i}">${pod && g.Chars && g.Chars.slot ? Chars.slot(who, { size: 'xs', pose: 'talk', cls: 'st-av', lazy: true }) : ''}<button type="button" class="st-rp icon-btn sm" data-rp="${i}" aria-label="${t('Nghe lại câu này')}">${UI.icon('volume-2')}</button><p dir="ltr">${toks}</p></div>`;
    };
    view.innerHTML = `<div class="st-reader" id="stReader">
      <div class="st-top"><a class="icon-btn" href="#/stories" aria-label="${t('Thư viện truyện')}">${UI.icon('arrow-left')}</a><div class="st-ttl"><b>${esc(x.title)}</b><span class="tiny muted">${t('Chương {n}/{m}', { n: ci + 1, m: x.chapters.length })} · ${esc(ch.title)}</span></div></div>
      <div class="st-text" id="stText" lang="en">${sents.map((_, i) => row(ch.sentences[i], i)).join('')}</div>
      <p class="tiny muted st-hint">${t('Chạm từ gạch chân để xem nghĩa và lưu vào thẻ ôn.')}</p>
      <div class="st-player card" role="group" aria-label="${t('Trình phát')}">
        <div class="row between"><button class="btn primary st-play" id="stPlay" type="button">${UI.icon('play')} <span>${t('Nghe')}</span></button>
        <div class="st-rate" role="radiogroup" aria-label="${t('Tốc độ')}">${[0.8, 0.9, 1].map(r => `<button type="button" role="radio" class="chip st-rb" data-r="${r}" aria-checked="${r === (LS.get('rate', 1))}">${r}×</button>`).join('')}</div></div>
        ${bar(0).replace('class="st-bar"', 'class="st-bar" id="stProg"')}
      </div>
      <div class="st-foot"><button class="btn" id="stQuiz" type="button">${ci + 1 < x.chapters.length || true ? t('Làm bài kiểm tra') : ''}</button></div>
    </div>`;
    startClock();
    // --- trình phát: mỗi câu = một lượt UI.tts (đúng giọng Ama/Carlos), hoặc file audio + mốc câu khi có (audio.files/marks do CI dựng) ---
    const cur = i => { $$('.st-s.st-cur').forEach(e => e.classList.remove('st-cur')); const e = $(`.st-s[data-i="${i}"]`); if (e) { e.classList.add('st-cur'); e.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); } const pr = $('#stProg'); if (pr) { const p = Math.round((i + 1) / sents.length * 100); pr.setAttribute('aria-valuenow', p); pr.firstElementChild.style.width = p + '%'; } };
    const setPlay = on => { const b = $('#stPlay'); if (b) { b.innerHTML = `${UI.icon(on ? 'pause' : 'play')} <span>${on ? t('Dừng') : t('Nghe')}</span>`; b.setAttribute('aria-pressed', String(on)); } };
    const files = x.audio && x.audio.files && x.audio.files[ci], st0 = x.audio && x.audio.marks && x.audio.marks[ci], marks = st0 && st0.map((a, i) => [a, i + 1 < st0.length ? st0[i + 1] : a + 6]); // marks trong lib = giây bắt đầu từng câu
    let seq = 0, at = -1, playing = false, audio = null;
    const rate = () => LS.get('rate', 1);
    const stopNow = () => { seq++; playing = false; if (audio) { audio.pause(); audio = null; } if (UI.stopSpeak) UI.stopSpeak(); setPlay(false); };
    function playFrom(i) {
      stopNow(); const my = seq; playing = true; setPlay(true);
      if (files) {
        const tl = S.timeline(sents, { marks, wpm: x.audio.wpm }); audio = new Audio(UI.audioUrls ? UI.audioUrls(files)[0] : 'https://audio.lexkite.com/audio/l/' + files + '.mp3'); audio.playbackRate = rate();
        audio.ontimeupdate = () => { const k = S.sentenceAt(tl, audio.currentTime); if (k >= 0 && k !== at) { at = k; cur(k); } };
        audio.onended = () => { if (my === seq) stopNow(); };
        audio.onloadedmetadata = () => { if (i > 0 && tl[i]) audio.currentTime = tl[i].start; audio.play().catch(() => stopNow()); };
        audio.onerror = () => { if (my === seq) { audio = null; playFrom.tts(i, my); } };
        return;
      }
      playFrom.tts(i, my);
    }
    playFrom.tts = (i, my) => {
      if (my !== seq) return; if (i >= sents.length) { stopNow(); return; }
      at = i; cur(i); const s = ch.sentences[i];
      UI.tts(S.textOf(s), accent(), rate(), { who: pod ? (x.speakers || {})[s.who] : 'ama', onEnd: () => { if (my === seq) setTimeout(() => playFrom.tts(i + 1, my), 220); }, onErr: () => { if (my === seq) stopNow(); } });
    };
    P = { stop: () => { stopNow(); } };
    $('#stPlay').onclick = () => { if (playing) stopNow(); else playFrom(Math.max(0, at >= sents.length - 1 ? 0 : at)); };
    $$('.st-rb').forEach(b => { b.onclick = () => { LS.set('rate', +b.dataset.r); $$('.st-rb').forEach(e => e.setAttribute('aria-checked', String(e === b))); if (playing) playFrom(at); }; });
    $$('[data-rp]').forEach(b => { b.onclick = () => { stopNow(); const i = +b.dataset.rp, my = ++seq; playing = true; setPlay(true); const s = ch.sentences[i]; at = i; cur(i); UI.tts(S.textOf(s), accent(), rate(), { who: pod ? (x.speakers || {})[s.who] : 'ama', onEnd: () => { if (my === seq) stopNow(); } }); }; });
    $('#stText').addEventListener('click', e => { const w = e.target.closest('.st-w'); if (w) openCard(x, ci, w.dataset.w, +w.dataset.i, sents[+w.dataset.i], w); });
    $('#stQuiz').onclick = () => { stopNow(); quiz(x, ci, t0); };
    const hide = () => { if (document.hidden && playing) stopNow(); }; document.addEventListener('visibilitychange', hide);
    window.addEventListener('hashchange', function off() { window.removeEventListener('hashchange', off); document.removeEventListener('visibilitychange', hide); stopAll(); }, { once: true });
    // từ mới tô gạch chân
    $$('.st-w.st-key').forEach(b => { const w = b.dataset.w; if (st0.known[w] || inDeck(w) || (S.lemmas(w).some(l => st0.known[l]))) b.classList.remove('st-key'); else b.classList.add('st-new'); });
  }

  // ================= Thẻ tra từ =================
  async function openCard(x, ci, word, si, sentence, el) {
    const old = $('#stSheet'); if (old) old.remove();
    const sh = document.createElement('div'); sh.id = 'stSheet'; sh.className = 'st-sheet card'; sh.setAttribute('role', 'dialog'); sh.setAttribute('aria-modal', 'false'); sh.setAttribute('aria-label', esc(word));
    sh.innerHTML = `<div class="muted">${UI.icon('hourglass')} ${t('Đang tra “{w}”…', { w: esc(word) })}</div>`; document.body.appendChild(sh);
    const close = () => { sh.remove(); document.removeEventListener('keydown', esc_); }; const esc_ = ev => { if (ev.key === 'Escape') close(); }; document.addEventListener('keydown', esc_);
    let e = null; try { e = (await Dict.quick(word)) || (await Dict.lookup(word, { examples: false, image: false })); } catch (er) { /* offline */ }
    if (!document.body.contains(sh)) return;
    if (!e || !e.found) { sh.innerHTML = `<div class="row between nowrap"><span>${t('Không tìm thấy “{w}”.', { w: esc(word) })}</span><button class="icon-btn" data-x aria-label="${t('Đóng')}">${UI.icon('x')}</button></div>`; sh.querySelector('[data-x]').onclick = close; return; }
    const saved = App.inDeck(e.word), mean = App.meanOf ? App.meanOf(e) : e.vi, sent = S.textOf(sentence);
    sh.innerHTML = `<div class="row between nowrap"><div><b class="st-hw">${esc(e.word)}</b></div><div class="row nowrap"><button class="icon-btn" data-s aria-label="${t('Nghe')}">${UI.icon('volume-2')}</button><button class="icon-btn" data-x aria-label="${t('Đóng')}">${UI.icon('x')}</button></div></div>
      <div>${UI.ipaHtml(e)}</div>${mean ? `<div class="st-mean">${esc(mean)}</div>` : ''}${e.def && e.def !== mean ? `<div class="small muted">${esc(e.def)}</div>` : ''}
      <blockquote class="st-ctx small" dir="ltr">${esc(sent)}</blockquote>
      <div class="row st-acts"><button class="btn" data-known type="button">${t('Đã biết')}</button><button class="btn primary" data-learn type="button" ${saved ? 'disabled' : ''}>${saved ? UI.icon('check') + ' ' + t('Đã trong sổ') : t('Học')}</button></div>`;
    $('[data-x]', sh).onclick = close;
    $('[data-s]', sh).onclick = () => UI.tts(e.word, accent(), 1, {});
    $('[data-known]', sh).onclick = async () => { await save(s => S.mark(s, word, 'known')); $$(`.st-w[data-w="${CSS.escape(word)}"]`).forEach(b => b.classList.remove('st-new', 'st-key')); close(); };
    $('[data-learn]', sh).onclick = async ev => {
      const b = ev.currentTarget; b.disabled = true;
      let vi = ''; try { const L = I18N.learnLang(); vi = L === 'vi' ? await Dict.translateVi(sent) : await Dict.translateTo(sent, L); } catch (er) { /* offline */ }
      await App.addWord(e, { text: sent, vi, title: 'Truyện: ' + x.title /* khóa – dịch lúc vẽ (study.js ctxTitle) */ });
      await save(s => S.mark(s, e.word, 'learn'));
      $$(`.st-w[data-w="${CSS.escape(word)}"]`).forEach(w => { w.classList.remove('st-new'); w.classList.add('st-mine'); });
      b.innerHTML = UI.icon('check') + ' ' + t('Đã lưu vào thẻ ôn');
    };
  }

  // ================= Quiz + tổng kết =================
  function quiz(x, ci, t0) {
    const ch = x.chapters[ci], Q = ch.quiz || [], ans = {}; let i = 0;
    const q = () => {
      const it = Q[i];
      view.innerHTML = `<div class="st-reader" id="stReader"><div class="st-top"><a class="icon-btn" href="#/stories/${x.id}/${ci}" aria-label="${t('Quay lại')}">${UI.icon('arrow-left')}</a><div class="st-ttl"><b>${t('Câu hỏi {n}/{m}', { n: i + 1, m: Q.length })}</b></div></div>${bar(Math.round(i / Q.length * 100))}
        <div class="card st-q"><h2 dir="ltr" lang="en">${esc(it.q)}</h2><div class="st-opts" role="group" aria-label="${t('Chọn đáp án')}">${it.options.map((o, k) => `<button type="button" class="btn st-opt" data-k="${k}" lang="en" dir="ltr">${esc(o)}</button>`).join('')}</div><div id="stFb" aria-live="polite"></div></div></div>`;
      $$('.st-opt').forEach(b => { b.onclick = () => {
        const k = +b.dataset.k; ans[i] = k; const ok = k === it.answer; $$('.st-opt').forEach(o => { o.disabled = true; if (+o.dataset.k === it.answer) o.classList.add('st-ok'); });
        if (!ok) { b.classList.add('st-bad'); if (App.logMistake) App.logMistake({ kind: 'story', q: it.q, answer: it.options[it.answer], given: it.options[k], explain: it.explain || '', ref: 'story:' + x.id }); }
        $('#stFb').innerHTML = `<p class="st-fb ${ok ? 'ok' : 'bad'}"><b>${ok ? t('Chính xác!') : t('Chưa đúng')}</b> <span lang="en" dir="ltr">${esc(it.explain || '')}</span></p><button class="btn primary" id="stNext" type="button">${i + 1 < Q.length ? t('Tiếp tục') : t('Xem kết quả')}</button>`;
        $('#stNext').focus(); $('#stNext').onclick = () => { i++; if (i < Q.length) q(); else summary(x, ci, S.grade(Q, ans), t0); };
      }; });
    };
    q();
  }
  async function summary(x, ci, r, t0) {
    const first = !mine().done[x.id + '#' + ci], pod = x.kind === 'podcast';
    await save(s => S.chapterDone(s, x.id, ci, r.score + '/' + r.n));
    if (first) await App.reward({ [pod ? 'listens' : 'readings']: 1, quizzes: 1, perfect: r.score === r.n ? 1 : 0, xp: Game.xpFor('set', { right: r.score, total: r.n }) });
    rememberNext();
    const gl = goalNow(), cn = S.counter(mine(), t0), nxt = ci + 1 < x.chapters.length;
    view.innerHTML = `<div class="st-reader" id="stSum"><div class="st-top"><a class="icon-btn" href="#/stories" aria-label="${t('Thư viện truyện')}">${UI.icon('x')}</a><div class="st-ttl"><b>${t('Hoàn thành chương')}</b><span class="tiny muted">${esc(x.title)} · ${esc(chTitle(x, ci))}</span></div></div>
      <div class="card st-res"><div class="st-score" dir="ltr">${r.score}/${r.n}</div><p>${r.score === r.n ? t('Tuyệt vời! Bạn hiểu toàn bộ chương.') : t('Làm tốt lắm! Đọc lại chương để nắm chắc hơn.')}</p></div>
      <div class="card"><div class="row between"><b>${t('Hôm nay')}</b><span class="tiny muted" dir="ltr">${gl.min} / ${gl.target} ${t('phút')}</span></div>${bar(gl.pct, t('Hôm nay'))}</div>
      <div class="card st-new-n"><b>${t('+{n} từ mới', { n: cn.learned })}</b><span class="tiny muted">${t('{n} từ đã đánh dấu biết', { n: cn.known })}</span></div>
      <div class="st-sum-acts">${cn.learned ? `<a class="btn" href="#/practice/learn?src=deck">${t('Ôn {n} từ vừa học', { n: cn.learned })}</a>` : ''}${nxt ? `<a class="btn primary" href="#/stories/${x.id}/${ci + 1}">${t('Chương tiếp')}</a>` : `<a class="btn primary" href="#/stories">${t('Về thư viện')}</a>`}</div></div>`;
    startClock();
  }
  g.StoriesUI = { byId, minsOf };
})(self);
