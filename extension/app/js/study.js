/* Học & luyện tập: ôn tập SRS, Học thông minh, Trắc nghiệm, Điền từ, Nghe & chép, Ghép thẻ, Phát âm, Kiểm tra. */
(function () {
  const { SRS, Cards, Stats, endOfToday, DAY } = Core;
  const { TOPICS, INDEX } = IELTS_DATA;
  const { $, $$, esc, shuffle, highlight, cloze, clozeAnswer, similarity, toast, speak, tts, pic, levelChip, posChip, xpFloat } = UI;
  const App = window.App;
  const { state, routes } = App;
  const view = App.view;
  const accent = () => state.settings.accent;

  // ---------- Nguồn từ ----------
  // Nghĩa hiển thị theo ngôn ngữ người học: tiếng Việt, hoặc định nghĩa tiếng Anh cho người học quốc tế
  const mean = x => App.meanOf(x);
  // ▶ Xem lại đoạn YouTube gốc (thẻ lưu từ phụ đề có t=): nhúng youtube-nocookie khoảng 8 giây quanh câu
  const ytOf = src => { try { const u = new URL(src); if (!/(^|\.)(youtube\.com|youtu\.be)$/.test(u.hostname)) return null; const id = /youtu\.be$/.test(u.hostname) ? u.pathname.slice(1) : u.searchParams.get('v'); const tt = parseInt(String(u.searchParams.get('t') || '0').replace(/s$/, ''), 10) || 0; return id && /^[\w-]{6,15}$/.test(id) ? { id, t: tt } : null; } catch (e) { return null; } };
  document.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('[data-ytsrc]'); if (!b) return;
    e.preventDefault(); e.stopPropagation();
    const y = ytOf(b.dataset.ytsrc), host = b.closest('.ex'); if (!y || !host) return;
    const old = host.querySelector('.ctx-yt'); if (old) { old.remove(); return; }
    const s0 = Math.max(0, y.t - 2);
    host.insertAdjacentHTML('beforeend', `<iframe class="ctx-yt" src="https://www.youtube-nocookie.com/embed/${y.id}?start=${s0}&end=${s0 + 8}&autoplay=1&rel=0&playsinline=1" allow="autoplay; encrypted-media" title="YouTube"></iframe>`);
  }, true);
  // Người học quốc tế (giao diện es/ja/ar…): thêm nghĩa bằng tiếng mẹ đẻ dưới định nghĩa tiếng Anh
  const nativeFill = (el, word) => { const L = I18N.lang(); if (!el || L === 'vi' || L === 'en' || I18N.meanLang() === 'vi') return; const pk = App.nativeGloss && App.nativeGloss(word); if (pk) { el.textContent = '🌐 ' + pk; return; } (App.loadPack ? App.loadPack() : Promise.resolve()).then(() => App.nativeGloss(word) || Dict.translateTo(word, L)).then(r => { if (r && r.toLowerCase() !== word.toLowerCase() && el.isConnected) el.textContent = '🌐 ' + r; }).catch(() => {}); };
  const norm = w => ({ word: w.word, ipa: w.ipa || '', vi: mean(w), ex: w.ex || '', def: w.def || '', pos: w.pos || '', emoji: w.emoji || '📘', image: w.image || '', audio: w.audio || '', level: w.level || '', topic: w.topic || '' });
  function sourceList() {
    const opts = [['deck', '📒 ' + t('Sổ từ của tôi ({n})', { n: Object.keys(state.cards).length })], ['due', '🔁 ' + t('Thẻ đến hạn hôm nay')], ['forgetting', '⚠️ ' + t('Từ sắp quên (độ nhớ < 85%)')], ['phrases', '🧩 ' + t('Cụm từ & cấu trúc của tôi')], ['weak', '🧩 ' + t('Từ hay quên')], ...[1, 2, 3, 4, 5].map(i => [`level:${i}`, '📶 ' + t('Cấp độ nhớ {n}', { n: i })])];
    Object.entries(App.ORIGINS).forEach(([k, o]) => opts.push([`origin:${k}`, `${o.emoji} ${o.name}`]));
    TOPICS.forEach(tp => opts.push([`topic:${tp.id}`, `${tp.emoji} ${tp.name}`]));
    return opts;
  }
  function pool(src) {
    const cards = Object.values(state.cards).filter(c => c.vi);
    let list = [];
    if (src === 'due') list = cards.filter(c => (c.srs.reps > 0 || c.srs.last) && c.srs.due <= endOfToday());
    else if (src === 'weak') list = cards.filter(c => c.srs.lapses > 0 || (c.srs.D != null ? c.srs.D >= 7 : c.srs.ef && c.srs.ef < 2.3));
    else if (src === 'forgetting') list = App.forgetting();
    else if (src === 'phrases') list = cards.filter(c => App.isPhrase && App.isPhrase(c));
    else if (src && src.startsWith('level:')) list = cards.filter(c => SRS.level5(c.srs) === +src.slice(6));
    else if (src && src.startsWith('origin:')) list = cards.filter(c => App.origin(c) === src.slice(7));
    else if (src && src.startsWith('topic:')) { const t = TOPICS.find(x => x.id === src.slice(6)); list = t ? t.words : []; }
    else list = cards;
    if (list.length < 4 && (!src || src === 'deck')) list = shuffle(TOPICS.filter(t => t.group === 'topics').flatMap(t => t.words)).slice(0, 120);
    return list.map(norm);
  }
  const srcName = src => (sourceList().find(o => o[0] === src) || [0, '📒 ' + t('Sổ từ của tôi')])[1];
  const distractors = (w, list, n, key) => {
    const base = list.length >= n + 1 ? list : TOPICS.flatMap(t => t.words).map(norm);
    const same = shuffle(base.filter(x => x.word !== w.word && x[key] && x[key] !== w[key] && x.pos === w.pos));
    const any = shuffle(base.filter(x => x.word !== w.word && x[key] && x[key] !== w[key]));
    const out = [];
    for (const x of [...same, ...any]) { if (out.length >= n) break; if (!out.some(o => o[key] === x[key])) out.push(x); }
    return out;
  };

  // ================= ÔN TẬP SRS =================
  let session = null;
  // ahead > 0: ôn trước các thẻ đến hạn trong N ngày tới (như "Custom Study" của Anki) – không thêm từ mới
  function buildQueue(ahead = 0) {
    const list = Object.values(state.cards);
    const end = endOfToday() + ahead * DAY;
    const due = list.filter(c => (c.srs.reps > 0 || c.srs.last) && c.srs.due <= end).sort((a, b) => a.srs.due - b.srs.due);
    const { newCount } = ahead ? { newCount: 0 } : Cards.dueCount(state.cards, state.settings, state.stats);
    const fresh = list.filter(c => c.srs.reps === 0 && !c.srs.last).sort((a, b) => a.added - b.added).slice(0, newCount);
    const q = [...due];
    fresh.forEach((c, i) => q.splice(Math.min(q.length, i * 3 + 1), 0, c));
    const cap = +state.settings.sessionCap || 0;
    return (cap ? q.slice(0, cap) : q).map(c => c.word.toLowerCase());
  }

  routes.review = function (arg, query) {
    const ahead = Math.min(7, Math.max(0, +((query && query.get && query.get('ahead')) || 0)));
    if (!Object.keys(state.cards).length) {
      view.innerHTML = `<div class="study-wrap"><div class="card empty"><div class="em">🃏</div><h2>${t('Chưa có flashcard nào')}</h2><p>${t('Thêm từ từ thư viện hoặc tra từ điển để bắt đầu.')}</p><div class="row center"><a class="btn primary" href="#/library">${t('Mở thư viện')}</a><a class="btn" href="#/dict">${t('Tra từ')}</a></div></div></div>`;
      return;
    }
    session = { queue: buildQueue(ahead), done: 0, again: 0, missed: [], total: 0, xp: 0, reverse: !!session && session.reverse };
    session.total = session.queue.length;
    if (!session.queue.length) return reviewDone(true);
    showCard();
  };

  function reviewDone(nothing) {
    const next = Object.values(state.cards).filter(c => c.srs.due > endOfToday()).sort((a, b) => a.srs.due - b.srs.due)[0];
    if (!nothing) { Sfx.win(); confetti(); }
    const acc = session.done ? Math.round((session.done - session.again) / session.done * 100) : 0;
    view.innerHTML = `<div class="study-wrap"><div class="card empty celebrate">
      <div class="em kit-cele">${window.Kit ? Kit.svg('win', 120) : (nothing ? '🎉' : '🏆')}</div>
      <h2>${nothing ? t('Hôm nay bạn đã ôn hết!') : t('Hoàn thành {n} lượt ôn!', { n: session.done })}</h2>
      ${nothing ? '' : `<div class="row center" style="gap:1.5rem;margin:1rem 0"><div><b style="font-size:1.6rem;color:var(--gold)">+${session.xp}</b><div class="tiny muted">XP</div></div><div><b style="font-size:1.6rem;color:var(--good)">${acc}%</b><div class="tiny muted">${t('Nhớ ngay')}</div></div><div><b style="font-size:1.6rem">🔥${App.streak()}</b><div class="tiny muted">${t('Chuỗi ngày')}</div></div></div>`}
      ${(session.missed || []).length ? `<div style="margin:.6rem 0"><div class="small muted">🔁 ${t('Từ vừa quên – xem lại 1 lần nữa:')}</div><div class="row center" style="gap:.35rem;margin-top:.3rem">${session.missed.slice(0, 12).map(w => `<a class="chip" href="#/dict/${encodeURIComponent(w)}">${esc(w)}</a>`).join('')}</div></div>` : ''}
      ${(() => { // Dự báo 7 ngày tới (như Anki): biết trước khối lượng, chủ động sắp xếp thời gian
        const day0 = endOfToday(), n = [0, 0, 0, 0, 0, 0, 0];
        Object.values(state.cards).forEach(c => { const d = Math.floor((c.srs.due - day0) / 864e5); if (c.srs.last && d >= 0 && d < 7) n[d]++; });
        const mx = Math.max(1, ...n);
        return n.some(Boolean) ? `<div class="forecast" title="${t('Số thẻ đến hạn 7 ngày tới')}">${n.map((x, i) => `<div><i style="height:${Math.round(x / mx * 44) + 2}px"></i><b>${x}</b><span>${i === 0 ? t('Mai') : new Date(day0 + (i + 0.5) * 864e5).toLocaleDateString(I18N.lang(), { weekday: 'short' })}</span></div>`).join('')}</div>` : '';
      })()}
      <p>${next ? t('Thẻ tiếp theo đến hạn: <b>{date}</b>.', { date: new Date(next.srs.due).toLocaleDateString(I18N.lang()) }) : ''} ${t('Học đều mỗi ngày là bí quyết nhớ lâu.')}</p>
      ${(() => { const soon = Object.values(state.cards).filter(c => c.srs.last && c.srs.due > endOfToday() && c.srs.due <= endOfToday() + 2 * DAY).length; return soon ? `<div class="tip small" style="margin:.6rem 0">⏩ ${t('Sắp thi hoặc muốn học thêm? Ôn trước {n} thẻ đến hạn trong 2 ngày tới.', { n: soon })} <a href="#/review?ahead=2">${t('Ôn trước →')}</a></div>` : ''; })()}
      <div class="row center"><a class="btn primary" href="#/practice/learn">🧠 ${t('Học thông minh')}</a><a class="btn" href="#/practice/match">⚡ ${t('Ghép thẻ')}</a><a class="btn" href="#/library">${t('Thêm từ mới')}</a></div>
    </div></div>`;
  }

  async function undo() {
    const L = session.last; if (!L) return; session.last = null;
    const c0 = state.cards[L.key]; if (c0) { c0.srs = L.srs; await Cards.update(c0); state.cards[L.key] = c0; }
    Object.assign(session, { queue: L.queue, done: L.done, again: L.again, missed: L.missed, xp: Math.max(0, session.xp - L.xp) });
    // gỡ lượt ôn & XP vừa cộng
    const st = await Stats.get(), k = Core.todayKey(); st.days[k] = Math.max(0, (st.days[k] || 1) - 1); if (L.wasNew && st.newToday && st.newToday.day === k) st.newToday.n = Math.max(0, st.newToday.n - 1); await Core.Store.set('stats', st); state.stats = st;
    state.game = await Game.mutate(gs => { gs.xp = Math.max(0, (gs.xp || 0) - L.xp); const d = gs.days[k] || {}; d.xp = Math.max(0, (d.xp || 0) - L.xp); d.reviews = Math.max(0, (d.reviews || 0) - 1); if (L.wasNew) d.newWords = Math.max(0, (d.newWords || 0) - 1); if (gs.total) { gs.total.reviews = Math.max(0, (gs.total.reviews || 0) - 1); if (L.wasNew) gs.total.newWords = Math.max(0, (gs.total.newWords || 0) - 1); } });
    toast('↶ ' + t('Đã hoàn tác – chấm lại thẻ này'));
    showCard();
  }

  function showCard() {
    const key = session.queue[0];
    const c = state.cards[key];
    if (!c) { session.queue.shift(); return session.queue.length ? showCard() : reviewDone(false); }
    // Thẻ thêm hàng loạt chưa có phiên âm/định nghĩa → bổ sung ngầm cho thẻ này và vài thẻ kế tiếp
    session.queue.slice(0, 3).forEach(k => { const x = state.cards[k]; if (x && (!x.ipa || !x.def) && App.enrichLater) App.enrichLater(k); });
    let flipped = false;
    const ctx = c.contexts[0];
    const isNew = c.srs.reps === 0 && !c.srs.last;
    const rev = session.reverse;
    const pct = session.done / Math.max(1, session.done + session.queue.length) * 100;

    // Nhớ chủ động: thẻ đã ôn ≥ 2 lần thỉnh thoảng (1/3) chuyển sang gõ lại từ từ nghĩa – nhớ sâu hơn nhận diện, đổi nhịp cho đỡ nhàm
    const typeMode = !rev && !isNew && c.srs.reps >= 2 && state.settings.typeReview !== false && c.word.length <= 30 && Math.random() < 1 / 3;
    // Nghe & nhớ nghĩa: thẻ đã ôn ≥ 1 lần thỉnh thoảng chỉ phát âm, không hiện chữ – luyện nhận diện từ qua tai như khi nghe thật
    const listenMode = !typeMode && !rev && !isNew && c.srs.reps >= 1 && Math.random() < 0.15;
    const front = listenMode ? `
        <button class="listen-big" data-say aria-label="${t('Nghe')}">🔊</button>
        <div class="muted small" style="margin-top:1rem">${t('Nghe từ, nhớ lại nghĩa rồi chạm để lật')} <span class="kbd">Space</span> · <span class="kbd">P</span> ${t('nghe lại')}</div>` : typeMode ? `
        ${pic(c)}
        <div class="vi" style="font-size:1.5rem">${esc(mean(c))}</div>${posChip(c.pos)}
        ${c.ex ? `<div class="ctx">“${cloze(c.ex, c.word)}”</div>` : ''}
        <input class="input type-in" id="typeIn" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="${t('Gõ từ tiếng Anh rồi Enter')}" style="margin-top:1rem;text-align:center;font-size:1.2rem">
        <div class="muted tiny" style="margin-top:.4rem">${t('Gợi ý: bắt đầu bằng “{a}”, {n} chữ cái', { a: esc(c.word[0]), n: c.word.replace(/[^A-Za-z]/g, '').length })}</div>
        <div id="typeRes" class="small" style="margin-top:.4rem"></div>` : rev ? `
        ${pic(c)}
        <div class="vi" style="font-size:1.6rem">${esc(mean(c))}</div>${posChip(c.pos)}
        ${c.ex ? `<div class="ctx">“${cloze(c.ex, c.word)}”</div>` : ''}
        <div class="muted small" style="margin-top:1rem">${t('Nhớ lại từ tiếng Anh, rồi chạm để lật')}</div>` : `
        ${pic(c)}
        <div class="entry-word">${esc(c.word)}</div>
        <div class="row center"><span class="ipa">${esc(c.ipa)}</span>${posChip(c.pos)}<button class="icon-btn sm" data-say>🔊</button></div>
        ${ctx ? `<div class="ctx">📌 “${highlight(ctx.text, c.word)}”</div>` : ''}
        <div class="muted small" style="margin-top:1rem">${t('Đoán nghĩa, rồi chạm để lật')} <span class="kbd">Space</span></div>`;

    view.innerHTML = `<div class="study-wrap">
      <div class="study-top">
        <a class="icon-btn" href="${App.backHref().replace(/^#\/practice$/, "#/home")}" title="${t('Thoát')}">✕</a>
        ${session.last ? `<button class="icon-btn" id="undoBtn" title="${t('Hoàn tác lần chấm vừa rồi (Z)')}">↶</button>` : ''}
        <a class="icon-btn" href="#/handsfree" title="${t('Chế độ Rảnh tay')}" aria-label="${t('Chế độ Rảnh tay')}">🎧</a>
        <div class="progress"><i style="width:${pct}%"></i></div>
        <span class="small muted" style="white-space:nowrap" title="${t('Thẻ đang ở bước học (1–10 phút) sẽ quay lại trong phiên')}">✅ ${session.done} · ${t('<b>{n}</b> thẻ còn lại', { n: new Set(session.queue).size })}</span>
      </div>
      <div class="row between small" style="margin-bottom:.6rem">
        <span>${isNew ? `<span class="chip lv">✨ ${t('TỪ MỚI')}</span>` : App.masteryDots(c.srs)}</span>
        <button class="btn sm ghost" id="toggleRev" title="${t('Đổi chiều thẻ')}">${rev ? '🇻🇳 → 🇬🇧' : '🇬🇧 → 🇻🇳'}</button>
      </div>
      <div class="flash" id="flash">
        <div class="flash-inner">
          <div class="card face front">${front}</div>
          <div class="card face back">
            <div class="row"><span class="entry-word" style="font-size:1.9rem">${esc(c.word)}</span>${posChip(c.pos)}${levelChip(c.level)}
              <span class="ipa">${esc(c.ipa)}</span><button class="icon-btn sm" data-say>🔊</button></div>
            <div class="vi" style="margin:.3rem 0">${esc(mean(c))}</div><div class="wi-native" data-native></div>
            ${c.def && mean(c) !== c.def ? `<div>${esc(c.def)}</div>` : ''}
            ${c.ex ? `<div class="example-box" style="margin-top:.8rem">${highlight(c.ex, c.word)} <button class="icon-btn sm" data-speak-text="${esc(c.ex)}">🔊</button></div>` : ''}
            ${c.contexts.length ? `<div style="margin-top:.8rem"><b class="small">📌 ${t('Ngữ cảnh của bạn')}</b>${c.contexts.slice(0, 2).map(x => `<div class="ex small" style="margin-top:.3rem">“${highlight(x.text, c.word)}” <button class="ctx-say sm" data-saysent="${esc(x.text)}" title="${t('Nghe cả câu')}">🔊</button>${ytOf(x.source) ? ` <button class="ctx-say sm" data-ytsrc="${esc(x.source)}" title="${t('Xem lại đoạn gốc')}">▶</button>` : ''}${x.title ? ` <span class="muted">— ${esc(x.title === 'Câu của tôi' ? t('Câu của tôi') : x.title)}</span>` : ''}${x.vi && I18N.meanLang() === 'vi' ? `<div style="font-style:normal">🇻🇳 ${esc(x.vi)}</div>` : ''}</div>`).join('')}</div>` : ''}
            ${(c.sentences || []).length ? `<div style="margin-top:.8rem"><b class="small">💬 ${t('Câu song ngữ')}</b>${c.sentences.map(x => `<div class="small" style="margin-top:.3rem">${highlight(x.en, c.word)}${I18N.meanLang() === 'vi' && x.vi ? `<div class="muted">${esc(x.vi)}</div>` : ''}</div>`).join('')}</div>` : ''}
            ${c.col.length ? `<div class="small" style="margin-top:.8rem">🔗 ${c.col.map(esc).join(' · ')}</div>` : ''}
            ${c.syn.length ? `<div class="small" style="margin-top:.3rem">≈ ${c.syn.map(esc).join(', ')}</div>` : ''}
            ${c.note ? `<div class="small" style="margin-top:.6rem">📝 ${esc(c.note)}</div>` : ''}
            ${App.notesHtml(c.word)}
            ${SRS.retention(c.srs) != null ? `<div class="tiny muted" style="margin-top:.8rem">🧠 ${t('Khả năng còn nhớ trước lần ôn này: <b>{pct}%</b> · đã quên {n} lần', { pct: Math.round(SRS.retention(c.srs) * 100), n: c.srs.lapses })}</div>` : ''}
            ${c.srs.lapses >= 3 ? `<div class="leech" data-leech><b>🐛 ${t('Từ khó nhớ – đã quên {n} lần', { n: c.srs.lapses })}</b>
              <div class="tiny muted" style="margin:.2rem 0 .4rem">${t('Học lại theo cách khác thay vì ôn thêm lần nữa: tạo mẹo nhớ, đọc to theo, đặt câu về chính bạn.')}</div>
              <div class="row" style="gap:.4rem"><button class="btn sm" data-mnem>💡 ${t('Tạo mẹo nhớ bằng AI')}</button><button class="btn sm ghost" data-shadow>🗣️ ${t('Đọc to theo 3 lần')}</button></div>
              <div data-mnem-out class="small" style="margin-top:.4rem"></div>
              <input class="input" data-note style="margin-top:.4rem" maxlength="200" placeholder="${t('Mẹo nhớ của riêng bạn (vd. liên tưởng âm thanh, hình ảnh)…')}" value="${esc(c.note || '')}"></div>` : ''}
            <details style="margin-top:.8rem" data-gen><summary class="small"><b>✍️ ${t('Tự đặt câu với “{word}”', { word: esc(c.word) })}</b> <span class="muted">${t('(+5 XP · giúp nhớ sâu hơn)')}</span></summary>
              <textarea class="input" id="genTxt" style="margin-top:.5rem;min-height:60px" placeholder="${t('Viết một câu về bản thân bạn có dùng từ này…')}"></textarea>
              <button class="btn sm" id="genSave" style="margin-top:.4rem">${t('Lưu câu của tôi')}</button></details>
          </div>
        </div>
      </div>
      <div id="actions" style="margin-top:1rem"><button class="btn primary lg block" id="flipBtn">${t('Lật thẻ')}</button></div>
      <p class="muted tiny center" style="margin-top:1rem">${t('Phím tắt: <span class="kbd">Space</span> lật · <span class="kbd">1</span>–<span class="kbd">4</span> chấm điểm · <span class="kbd">P</span> phát âm')} · <span class="kbd">Z</span> ${t('hoàn tác')}</p>
    </div>`;
    App.bindCommon();
    const say = () => speak(c.word, accent(), c.audio);
    $$('[data-say]').forEach(b => b.onclick = e => { e.stopPropagation(); say(); });
    if (listenMode) setTimeout(say, 250);
    nativeFill($('.back [data-native]'), c.word);
    // Tìm sẵn bản ghi giọng người thật cho 3 thẻ kế tiếp (chạy ngầm, lưu vào thẻ) → thay dần giọng máy bằng giọng thật
    session.queue.slice(1, 4).forEach(k => { const n = state.cards[k]; if (n && !n.audio && !n._aq && navigator.onLine) { n._aq = 1; Dict.lookup(n.word, { image: false, examples: false }).then(e => { if (e && e.found && (e.audio || e.audioUS)) Cards.patch(k, x => { if (!x.audio) x.audio = e.audio || e.audioUS; if (!x.ipaUS && e.ipaUS) x.ipaUS = e.ipaUS; }).then(c2 => { if (c2) state.cards[k] = c2; }); }).catch(() => {}); } });

    const flip = () => {
      if (flipped) return;
      flipped = true; Sfx.flip();
      $('#flash').classList.add('flipped');
      const labels = [[t('Quên'), 'g-again'], [t('Khó'), 'g-hard'], [t('Nhớ'), 'g-good'], [t('Dễ'), 'g-easy']];
      $('#actions').innerHTML = `<div class="grades">${labels.map(([l, cls], i) => `<button class="btn ${cls}" data-grade="${i}">${l}<small>${SRS.preview(c.srs, i)}</small></button>`).join('')}</div>`;
      $$('[data-grade]').forEach(b => b.onclick = () => grade(+b.dataset.grade, b));
      if (rev || state.settings.autoSpeak) say();
    };
    $('#flash').addEventListener('click', e => { if (!e.target.closest('button, details, textarea, input')) flip(); });
    // 👆 Vuốt thẻ (cảm ứng & chuột): phải = Nhớ, trái = Quên, lên = nghe lại. Chưa lật → lật cho thấy đáp án 0,7 s rồi mới chấm.
    if (!typeMode && window.PointerEvent) {
      const fc = $('#flash'); let x0 = 0, y0 = 0, dx = 0, dy = 0, drag = false, moved = false;
      const reset = () => { fc.classList.remove('swiping', 'sw-good', 'sw-again'); fc.style.transform = ''; };
      fc.addEventListener('pointerdown', e => { if (graded || e.target.closest('button, details, textarea, input, a')) return; drag = true; moved = false; x0 = e.clientX; y0 = e.clientY; dx = dy = 0; fc.classList.add('swiping'); try { fc.setPointerCapture(e.pointerId); } catch (err) { /* bỏ qua */ } });
      fc.addEventListener('pointermove', e => {
        if (!drag) return; dx = e.clientX - x0; dy = e.clientY - y0; if (Math.abs(dx) > 8 || Math.abs(dy) > 8) moved = true;
        fc.style.transform = `translate3d(${dx}px, ${Math.min(0, dy) * 0.4}px, 0) rotate(${dx / 18}deg)`;
        fc.classList.toggle('sw-good', dx > 40); fc.classList.toggle('sw-again', dx < -40);
      });
      const end = () => {
        if (!drag) return; drag = false;
        const go = g => { fc.classList.remove('swiping'); fc.classList.add('fly'); fc.style.transform = `translate3d(${g ? 120 : -120}vw, 0, 0) rotate(${g ? 25 : -25}deg)`; setTimeout(() => grade(g ? 2 : 0), 220); };
        if (dx > 80 || dx < -80) { const g = dx > 80; if (!flipped) { reset(); flip(); setTimeout(() => go(g), 700); } else go(g); }
        else { if (dy < -60 && Math.abs(dx) < 60) say(); reset(); }
      };
      fc.addEventListener('pointerup', end); fc.addEventListener('pointercancel', () => { drag = false; reset(); });
      fc.addEventListener('click', e => { if (moved) { e.stopImmediatePropagation(); moved = false; } }, true); // kéo thì không tính là bấm lật
    }
    if (typeMode) {
      const inp = $('#typeIn'); setTimeout(() => inp.focus(), 50);
      const norm = x => x.toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, ' ').trim();
      const dist = (a, b) => { const d = Array.from({ length: a.length + 1 }, (_, i) => [i]); for (let j = 1; j <= b.length; j++) d[0][j] = j; for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); return d[a.length][b.length]; };
      inp.addEventListener('keydown', e => {
        if (e.key !== 'Enter' || flipped) return;
        e.preventDefault(); e.stopPropagation();
        const v = norm(inp.value); if (!v) return;
        const dd = dist(v, norm(c.word)), sug = dd === 0 ? 2 : dd === 1 ? 1 : 0;
        inp.disabled = true; inp.classList.add(dd === 0 ? 'ok' : dd === 1 ? 'near' : 'bad');
        $('#typeRes').innerHTML = dd === 0 ? `✅ ${t('Chính xác!')}` : `${dd === 1 ? '🟡 ' + t('Gần đúng – sai 1 chữ') : '❌ ' + t('Chưa đúng')}: <b>${esc(c.word)}</b>`;
        dd === 0 ? Sfx.correct() : Sfx.wrong && Sfx.wrong();
        flip();
        const b = $(`[data-grade="${sug}"]`); if (b) { b.classList.add('suggest'); b.focus(); }
      });
    }
    // Từ khó nhớ: mẹo nhớ AI (lưu vào ghi chú thẻ), đọc to theo, ghi mẹo riêng
    const lb = $('[data-leech]');
    if (lb) {
      lb.addEventListener('click', e => e.stopPropagation());
      const saveNote = async note => { c.note = note.slice(0, 200); await Cards.update(c); state.cards[key] = c; };
      $('[data-note]', lb).onchange = e => saveNote(e.target.value.trim()).then(() => toast(t('Đã lưu mẹo nhớ')));
      $('[data-shadow]', lb).onclick = async () => { for (let i = 0; i < 3; i++) { say(); await new Promise(r => setTimeout(r, 1600)); } };
      $('[data-mnem]', lb).onclick = async ev => {
        const out = $('[data-mnem-out]', lb), b = ev.currentTarget; b.disabled = true; out.textContent = '⏳ ' + t('AI đang nghĩ mẹo nhớ…');
        try {
          const r = await AI.ask(`Create a memory aid for the English word "${c.word}" (${c.pos || ''}) meaning "${c.vi}" for a ${I18N.learnLang() === 'vi' ? 'Vietnamese' : I18N.LANGS[I18N.learnLang()][0]} learner. Return ONLY JSON: {"mnemonic": "a vivid sound-alike or image association in the learner's language, max 30 words", "parts": "word parts / root meaning if useful, else empty", "confuse": "a commonly confused word and the difference, else empty"}`);
          const tip = [r.mnemonic, r.parts, r.confuse].filter(Boolean).join(' · ');
          out.innerHTML = `💡 ${esc(tip)}`;
          if (r.mnemonic && !c.note) { await saveNote(r.mnemonic); $('[data-note]', lb).value = c.note; }
        } catch (e) { out.innerHTML = `${esc(AI.errText ? AI.errText(e) : e.message)} ${e.message === 'NO_KEY' ? `<button class="btn sm" data-k>${t('Bật AI')}</button>` : ''}`; const k = $('[data-k]', out); if (k) k.onclick = () => AI.keyDialog(); }
        b.disabled = false;
      };
    }
    $('#genSave').onclick = async ev => {
      ev.stopPropagation();
      const text = $('#genTxt').value.trim();
      if (!text) return;
      if (!UI.wordRegex(c.word).test(text)) return toast(t('Câu cần có từ “{word}” nhé', { word: c.word }));
      c.contexts = [{ text, title: 'Câu của tôi', at: Date.now() }, ...c.contexts].slice(0, 5);
      await Cards.update(c); state.cards[key] = c;
      App.reward({ xp: 5 }, ev.currentTarget); Sfx.correct();
      ev.currentTarget.textContent = '✓ ' + t('Đã lưu'); ev.currentTarget.disabled = true;
    };
    $('#flipBtn').onclick = flip;
    $('#toggleRev').onclick = () => { session.reverse = !session.reverse; showCard(); };
    document.onkeydown = e => {
      if (e.target.matches('input, textarea, summary')) return;
      if (e.code === 'Space' || e.key === 'Enter') { e.preventDefault(); flip(); }
      else if (flipped && /^[1-4]$/.test(e.key)) grade(+e.key - 1, $(`[data-grade="${+e.key - 1}"]`));
      else if (e.key.toLowerCase() === 'p') say();
      else if (e.key.toLowerCase() === 'z' && session.last) undo();
    };
    const ub = $('#undoBtn'); if (ub) ub.onclick = () => undo();
    if (!rev && state.settings.autoSpeak) say();

    let graded = false;
    async function grade(g, el) {
      if (graded) return; graded = true;
      document.onkeydown = null;
      const wasNew = c.srs.reps === 0 && !c.srs.last;
      // Lưu trạng thái trước khi chấm → cho phép hoàn tác khi bấm nhầm (như Anki)
      const snap = { key, srs: JSON.parse(JSON.stringify(c.srs)), queue: session.queue.slice(), done: session.done, again: session.again, missed: session.missed.slice(), wasNew, g };
      c.srs = SRS.review(c.srs, g);
      state.cards[key] = c;
      await Cards.update(c);
      state.stats = await Stats.logReview(wasNew);
      const xp = g === 0 ? 2 : wasNew ? 8 : 5;
      session.xp += xp; snap.xp = xp; session.last = snap;
      g === 0 ? Sfx.wrong() : Sfx.correct();
      App.reward({ reviews: 1, newWords: wasNew ? 1 : 0, again: g === 0 ? 1 : 0, xp }, el);
      session.queue.shift();
      session.done += 1;
      // Thẻ còn ở bước học (1–10 phút) quay lại trong cùng phiên
      if (c.srs.reps === 0) session.queue.splice(Math.min(session.queue.length, g === 0 ? 3 : 6), 0, key);
      if (g === 0) { session.again += 1; if (!session.missed.includes(c.word)) session.missed.push(c.word); }
      if (!/^#\/review/.test(location.hash)) return; // đã rời trang ôn tập
      session.queue.length ? showCard() : reviewDone(false);
    }
  }

  // ================= TRUNG TÂM LUYỆN TẬP =================
  const MODES = {
    learn: { em: '🧠', name: t('Học thông minh'), run: runLearn },
    mcq: { em: '🧩', name: t('Trắc nghiệm'), run: src => runQuiz(src, 'mcq') },
    cloze: { em: '✍️', name: t('Điền từ vào câu'), run: src => runQuiz(src, 'cloze') },
    listen: { em: '🎧', name: t('Nghe & chép'), run: src => runQuiz(src, 'listen') },
    test: { em: '📝', name: t('Bài kiểm tra'), run: src => runQuiz(src, 'test') },
    match: { em: '⚡', name: t('Ghép thẻ'), run: runMatch },
    speak: { em: '🎙️', name: t('Luyện phát âm'), run: runSpeak },
  };

  routes.practice = function (mode, query) {
    const src = query.get('src') || 'deck';
    if (mode && MODES[mode]) return MODES[mode].run(src, query);
    view.innerHTML = `
      <div class="page-head"><div><h1>${t('Trò chơi & bài tập')}</h1><p class="muted">${t('Chọn nguồn từ, rồi chọn cách luyện. Mỗi bài đều cộng XP và tính vào nhiệm vụ ngày.')}</p></div>
        <label class="field" style="min-width:260px"><span class="small">${t('Nguồn từ')}</span><select class="input" id="srcSel">${sourceList().map(([v, l]) => `<option value="${esc(v)}" ${v === src ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></label></div>
      <div class="modes" id="modeGrid" style="grid-template-columns:repeat(auto-fill,minmax(200px,1fr))">${App.modeTiles().join('')}</div>`;
    const fix = () => $$('#modeGrid a').forEach(a => { a.href = a.getAttribute('href').split('?')[0] + `?src=${encodeURIComponent($('#srcSel').value)}`; });
    $('#srcSel').onchange = fix; fix();
  };

  function head(title, i, n, extra = '') {
    return `<div class="study-top"><a class="icon-btn" href="${App.backHref()}" title="${t('Thoát')}">✕</a><div class="progress"><i style="width:${i / Math.max(1, n) * 100}%"></i></div><span class="small muted" style="white-space:nowrap">${extra || `${Math.min(i + 1, n)}/${n}`}</span></div>
      <div class="small muted" style="margin:-.4rem 0 .8rem">${title}</div>`;
  }

  // ---------- Bộ máy câu hỏi dùng chung ----------
  // q = { type: 'mcq-vi'|'mcq-en'|'type-cloze'|'type-listen'|'type-vi', w, list }
  function renderQuestion(box, q, onDone) {
    const w = q.w;
    let answered = false;
    const finish = (ok, given) => {
      if (answered) return; answered = true;
      if (!ok && App.logMistake) App.logMistake({ kind: 'vocab', q: q.type.startsWith('mcq-en') || q.type === 'type-vi' || q.type === 'type-spell' ? t('Từ tiếng Anh nghĩa là “{vi}”?', { vi: mean(w) }) : q.type === 'type-cloze' && w.ex ? t('Điền từ: {sentence}', { sentence: w.ex.replace(UI.wordRegex(w.word), '___') }) : t('Nghĩa của “{word}”?', { word: w.word }), answer: q.type === 'mcq-vi' ? w.vi : (q.answer || w.word), given: given || '', explain: `${w.word} ${w.ipa || ''} = ${w.vi}`, ref: w.word });
      ok ? Sfx.correct() : Sfx.wrong();
      const fb = $('#fb', box);
      fb.innerHTML = `<div class="sheet ${ok ? 'ok' : 'no'}"><div class="sheet-in">
        <div class="sheet-head">${ok ? ['✅ ' + t('Chính xác!'), '🎉 ' + t('Tuyệt vời!'), '👏 ' + t('Giỏi lắm!')][Math.floor(Math.random() * 3)] : '❌ ' + t('Chưa đúng · Đáp án: {answer}', { answer: esc(q.answer || w.word) })}</div>
        <div class="sheet-word"><button class="sheet-say" data-sayw aria-label="${t('Nghe')}">🔊</button><div style="min-width:0"><div><b class="sw">${esc(w.word)}</b>${w.pos ? ` <span class="sp">(${esc(w.pos)})</span>` : ''}</div>${w.ipa ? `<div class="sipa">${esc(w.ipa)}</div>` : ''}<div class="svi">${esc(mean(w))}</div></div></div>
        ${w.ex ? `<div class="sheet-ex">${highlight(w.ex, w.word)} <button class="ctx-say sm" data-saysent="${esc(w.ex)}" title="${t('Nghe câu')}">🔊</button><button class="ctx-say sm" data-tr title="${t('Dịch câu')}">🌐</button><div class="sheet-tr" hidden></div></div>` : ''}
        <button class="btn lg block sheet-next" id="nextQ">${t('Tiếp tục')} ↵</button></div></div>`;
      const tr = $('[data-tr]', fb); if (tr) tr.onclick = async () => { const t = $('.sheet-tr', fb); if (!t.hidden) { t.hidden = true; return; } t.hidden = false; t.textContent = '…'; t.textContent = await Dict.translateVi(w.ex); };
      $('[data-sayw]', fb).onclick = () => speak(w.word, accent(), w.audio);
      if (!ok || q.type.startsWith('type')) speak(w.word, accent(), w.audio);
      $('#nextQ').focus();
      $('#nextQ').onclick = () => onDone(ok, $('#nextQ'));
    };

    if (q.type === 'mcq-vi' || q.type === 'mcq-en') {
      const key = q.type === 'mcq-vi' ? 'vi' : 'word';
      const opts = shuffle([w, ...distractors(w, q.list, 3, key)]);
      const prompt = q.type === 'mcq-vi'
        ? `${pic(w)}<div class="entry-word" style="margin-top:.6rem">${esc(w.word)}</div><div class="row center"><span class="ipa">${esc(w.ipa)}</span>${posChip(w.pos)}<button class="icon-btn sm" data-sayw>🔊</button></div><div class="muted small" style="margin-top:.6rem">${t('Chọn nghĩa đúng')}</div>`
        : `<div class="vi" style="font-size:1.5rem">${esc(mean(w))}</div>${posChip(w.pos)}${w.ex ? `<div class="ctx" style="margin:1rem auto 0">“${cloze(w.ex, w.word)}”</div>` : ''}<div class="muted small" style="margin-top:.6rem">${t('Chọn từ tiếng Anh đúng')}</div>`;
      box.innerHTML = `<div class="card q-card">${prompt.replace('class="pic"', 'class="pic" style="width:110px;margin:0 auto"')}</div>
        <div class="options ${key === 'word' ? 'two' : ''}">${opts.map((o, i) => `<button class="option" data-o="${esc(o.word)}"><span class="kbd">${i + 1}</span>${esc(o[key])}</button>`).join('')}</div><div id="fb"></div>`;
      const sw = $('[data-sayw]', box); if (sw) sw.onclick = () => speak(w.word, accent(), w.audio);
      const pick = b => {
        if (answered) return;
        const ok = b.dataset.o === w.word;
        $$('.option', box).forEach(x => { if (x.dataset.o === w.word) x.classList.add('right'); });
        if (!ok) b.classList.add('wrong');
        finish(ok);
      };
      $$('.option', box).forEach(b => b.onclick = () => pick(b));
      document.onkeydown = e => {
        if (answered) { if (e.key === 'Enter') { e.preventDefault(); $('#nextQ') && $('#nextQ').click(); } return; }
        const n = +e.key; if (n >= 1 && n <= opts.length) pick($$('.option', box)[n - 1]);
      };
      if (q.type === 'mcq-vi' && state.settings.autoSpeak) speak(w.word, accent(), w.audio);
      return;
    }

    // Dạng gõ đáp án
    const isCloze = q.type === 'type-cloze' && w.ex && UI.wordRegex(w.word).test(w.ex);
    const target = isCloze ? clozeAnswer(w.ex, w.word) : w.word;
    q.answer = target;
    let prompt;
    if (q.type === 'type-spell') {
      // Gợi ý chữ cái kiểu "_ h _ _ _ _ t _ _": hiện ~1/4 số chữ (không lộ chữ đầu với từ dài)
      const ch = [...w.word], letters = ch.map((c, i) => /[a-z]/i.test(c) ? i : -1).filter(i => i >= 0);
      const show = new Set(letters.length <= 3 ? [letters[0]] : letters.filter((_, k) => k % 4 === 1));
      prompt = `<div class="muted small" style="font-weight:700">${t('Điền từ')}</div><div class="vi" style="font-size:1.6rem;margin:.4rem 0">${esc(mean(w))}${w.pos ? ` <span class="muted" style="font-size:1rem">(${esc(w.pos)})</span>` : ''}</div>
        <div class="spell-hint">${ch.map((c, i) => c === ' ' ? '<i class="sp"></i>' : /[a-z]/i.test(c) ? `<span>${show.has(i) ? esc(c) : ''}</span>` : `<b>${esc(c)}</b>`).join('')}</div>`;
    } else if (q.type === 'type-listen') {
      prompt = `<div style="font-size:3rem">🎧</div><div class="row center"><button class="btn primary" id="play">🔊 ${t('Nghe')}</button><button class="btn" id="slow">🐢 ${t('Chậm')}</button></div><div class="muted small" style="margin-top:.8rem">${t('Gõ lại từ bạn nghe được')}${w.vi ? ' · ' + t('gợi ý: {hint}', { hint: esc(mean(w)) }) : ''}</div>`;
    } else if (isCloze) {
      prompt = `<div style="font-size:1.15rem;line-height:1.8">“${cloze(w.ex, w.word)}”</div><div class="muted" style="margin-top:.8rem">${t('Gợi ý: <b>{hint}</b>', { hint: esc(mean(w)) })} ${posChip(w.pos)} · ${t('bắt đầu bằng “{letter}”, {n} ký tự', { letter: esc(target[0]), n: target.length })}</div>`;
    } else {
      prompt = `<div class="vi" style="font-size:1.5rem">${esc(mean(w))}</div>${posChip(w.pos)}<div class="muted" style="margin-top:.8rem">${t('Gõ từ tiếng Anh')} · ${t('bắt đầu bằng “{letter}”, {n} ký tự', { letter: esc(w.word[0]), n: w.word.length })}</div>`;
    }
    box.innerHTML = `<div class="card q-card">${prompt}</div>
      <form id="ansForm" style="margin-top:1rem" autocomplete="off"><div class="search">
        <input class="input big-input" id="ans" placeholder="${t('Gõ đáp án…')}" autocapitalize="off" autocorrect="off" spellcheck="false">
        <button class="btn primary lg">${t('Kiểm tra')}</button></div>
        <div class="row center" style="margin-top:.5rem"><button type="button" class="btn sm ghost" id="skip">${t('Không biết – xem đáp án')}</button></div></form><div id="fb"></div>`;
    $('#ans').focus();
    if (q.type === 'type-listen') {
      $('#play').onclick = () => speak(w.word, accent(), w.audio);
      $('#slow').onclick = () => speak(w.word, accent(), w.audio, true);
      setTimeout(() => speak(w.word, accent(), w.audio), 250);
    }
    $('#skip').onclick = () => finish(false);
    $('#ansForm').onsubmit = e => {
      e.preventDefault();
      if (answered) return $('#nextQ').click();
      const a = $('#ans').value.trim().toLowerCase().replace(/\s+/g, ' ');
      if (!a) return;
      const ok = a === w.word.toLowerCase() || a === target.toLowerCase();
      // Sai 1 ký tự → cho thử lại một lần
      if (!ok && !q.retried && similarity(a, target) >= 0.8) { q.retried = true; toast(t('Gần đúng rồi! Kiểm tra lại chính tả') + ' 👀'); return; }
      $('#ans').disabled = true;
      finish(ok);
    };
    document.onkeydown = e => { if (answered && e.key === 'Enter' && e.target.id !== 'ans') { e.preventDefault(); $('#nextQ').click(); } };
  }

  // ---------- Trắc nghiệm / Điền từ / Nghe / Kiểm tra ----------
  function runQuiz(src, mode) {
    const list = pool(src);
    const n = mode === 'test' ? 20 : 10;
    const items = shuffle(list).slice(0, Math.min(n, list.length));
    if (!items.length) return emptySource(src);
    const types = { mcq: ['mcq-vi'], cloze: ['type-cloze'], listen: ['type-listen'], test: ['mcq-vi', 'mcq-en', 'type-cloze', 'type-listen', 'type-vi'] }[mode];
    const qs = items.map((w, i) => ({ type: mode === 'test' ? types[i % types.length] : types[0], w, list }));
    if (mode === 'test') qs.sort(() => Math.random() - .5);
    const title = `${MODES[mode].em} ${MODES[mode].name} · ${esc(srcName(src))}`;
    const run = { i: 0, score: 0, wrong: [], xp: 0 };
    const next = () => {
      if (run.i >= qs.length) return finish();
      view.innerHTML = `<div class="study-wrap">${head(title, run.i, qs.length, `✅ ${run.score}`)}<div id="qbox"></div></div>`;
      renderQuestion($('#qbox'), qs[run.i], (ok, el) => {
        if (ok) { run.score++; run.xp += 3; App.reward({ xp: 3 }, el); } else run.wrong.push(qs[run.i].w);
        run.i++; next();
      });
    };
    const finish = () => {
      document.onkeydown = null;
      const pct = Math.round(run.score / qs.length * 100);
      const perfect = pct === 100;
      App.reward({ quizzes: 1, perfect: perfect ? 1 : 0, xp: perfect ? 15 : 5 });
      if (pct >= 80) { Sfx.win(); confetti(); }
      const unit = new URLSearchParams(location.hash.split('?')[1] || '').get('unit');
      const unitPassed = unit && App.completeUnit ? App.completeUnit(unit, pct) : null;
      const band = mode === 'test' ? (pct >= 95 ? '8.5+' : pct >= 85 ? '7.5–8.0' : pct >= 70 ? '6.5–7.0' : pct >= 50 ? '5.5–6.0' : '< 5.5') : '';
      view.innerHTML = `<div class="study-wrap"><div class="card empty celebrate">
        <div class="em kit-cele">${window.Kit ? Kit.svg(pct >= 80 ? 'win' : pct >= 50 ? 'cheer' : 'think', 110) : (pct >= 80 ? '🏆' : pct >= 50 ? '👍' : '💪')}</div>
        <div class="score-ring" style="--p:${pct};--c:${pct >= 80 ? 'var(--good)' : pct >= 50 ? 'var(--hard)' : 'var(--again)'}"><b>${pct}%</b></div>
        <h2 style="margin-top:1rem">${t('{score}/{total} câu đúng', { score: run.score, total: qs.length })}</h2>
        ${band ? `<p>${t('Mức từ vựng ước tính: <b>Band {band}</b>', { band })} <span class="muted small">${t('(tham khảo)')}</span></p>` : ''}
        <p class="muted">+${run.xp + (perfect ? 15 : 5)} XP</p>
        ${run.wrong.length ? `<p>${t('Cần ôn lại:')}</p><div class="row center">${run.wrong.map(w => `<a class="chip" href="#/dict/${encodeURIComponent(w.word)}">${esc(w.word)}</a>`).join('')}</div>
          ${run.wrong.some(w => !App.inDeck(w.word)) ? `<p><button class="btn sm" id="addWrong">+ ${t('Đưa các từ sai vào flashcard')}</button></p>` : ''}` : `<p>${t('Không sai câu nào – xuất sắc!')} 🎉</p>`}
        ${unit ? `<div class="feedback ${pct >= 80 ? 'ok' : 'no'}" style="position:static;margin:1rem 0">${pct >= 80 ? '🏁 ' + t('<b>Hoàn thành bài!</b> Các từ đã được thêm vào flashcard để ôn đúng thời điểm vàng.') : '🔁 ' + t('Cần đạt <b>80%</b> để hoàn thành bài – ôn lại các từ sai rồi thử lại nhé.')}</div>` : ''}
        <div class="row center" style="margin-top:1rem">${unit ? `<a class="btn primary" href="#/path">🗺️ ${t('Về lộ trình')}</a><button class="btn" id="again">${t('Làm lại')}</button>` : `<button class="btn primary" id="again">${t('Làm lượt mới')}</button><a class="btn" href="#/practice?src=${encodeURIComponent(src)}">${t('Đổi chế độ')}</a>`}</div>
      </div></div>`;
      if (unitPassed) unitPassed.then(first => { if (first) { confetti(160); Sfx.win(); } });
      $('#again').onclick = () => runQuiz(src, mode);
      const aw = $('#addWrong');
      if (aw) aw.onclick = async () => { for (const w of run.wrong) if (!App.inDeck(w.word)) await App.addWord(INDEX[w.word.toLowerCase()] || w, null, { silent: true }); toast(t('Đã thêm vào flashcard')); aw.disabled = true; };
    };
    next();
  }

  function emptySource(src) {
    view.innerHTML = `<div class="study-wrap"><div class="card empty"><div class="em">🫙</div><h2>${t('Chưa có từ để luyện')}</h2><p>${t('Nguồn “{name}” đang trống.', { name: esc(srcName(src)) })}</p><div class="row center"><a class="btn primary" href="#/practice?src=deck">${t('Chọn nguồn khác')}</a><a class="btn" href="#/library">${t('Mở thư viện')}</a></div></div></div>`;
  }

  // ---------- Học thông minh (kiểu Quizlet Learn) ----------
  function runLearn(src) {
    const list = pool(src);
    // Ưu tiên từ chưa thuộc
    const rank = w => { const c = state.cards[w.word.toLowerCase()]; return c ? SRS.mastery(c.srs) : -1; };
    const items = shuffle(list).sort((a, b) => rank(a) - rank(b)).slice(0, Math.min(8, list.length));
    if (!items.length) return emptySource(src);
    const stage = new Map(items.map(w => [w.word, 0])); // 0: chọn nghĩa, 1: chọn từ, 2: gõ từ, 3: xong
    const STAGES = ['mcq-vi', 'type-listen', 'type-spell']; // nhận diện → nghe & viết lại → tự nhớ ra cách viết
    let queue = shuffle(items), mistakes = 0, answered = 0;
    const introduced = new Set(), knownSkip = new Set();
    const title = `🧠 ${t('Học thông minh')} · ${esc(srcName(src))}`;
    const next = () => {
      queue = queue.filter(w => stage.get(w.word) < 3);
      if (!queue.length) return finish();
      const w = queue.shift();
      const doneSteps = [...stage.values()].reduce((a, b) => a + b, 0);
      view.innerHTML = `<div class="study-wrap">${head(title, doneSteps, items.length * 3, `🎯 ${t('{done}/{total} từ', { done: [...stage.values()].filter(v => v === 3).length, total: items.length })}`)}<div id="qbox"></div></div>`;
      const st = stage.get(w.word);
      // Lần đầu gặp từ chưa thuộc → giới thiệu từ (hình, âm, nghĩa, ví dụ) trước khi kiểm tra
      if (st === 0 && !introduced.has(w.word) && rank(w) <= 0) {
        introduced.add(w.word);
        // Thẻ giới thiệu từ mới: mọi thông tin cần để hiểu & nhớ trên 1 mặt, sắp theo thứ tự đọc tự nhiên
        // (hình → từ & âm → nghĩa → định nghĩa → ví dụ có dịch → kết hợp từ) – không phải lật, không bỏ sót ví dụ
        const arr = x => [].concat(x || []).filter(Boolean);
        const col = arr(w.col).slice(0, 4), syn = arr(w.syn).slice(0, 4);
        $('#qbox').innerHTML = `<div class="card wi" id="fi">
            <div class="wi-top">${w.image || w.emoji ? pic(w).replace('class="pic"', 'class="pic wi-pic"') : ''}
              <div class="wi-head"><span class="chip lv">✨ ${t('Từ mới')}</span>
                <div class="wi-word">${esc(w.word)}</div>
                <div class="wi-pron"><span class="ipa">${esc(w.ipa || '')}</span>${posChip(w.pos)}${levelChip(w.level)}
                  <button class="fi-btn sm" id="sayI" aria-label="${t('Nghe')}" title="${t('Nghe')}">🔊</button><button class="fi-btn sm" id="slowI" aria-label="${t('Nghe chậm')}" title="${t('Nghe chậm')}">🐢</button></div>
                <div class="wi-vi vi">${esc(mean(w))}</div><div class="wi-native" data-native></div></div></div>
            ${w.def && w.def !== mean(w) ? `<div class="wi-sec"><span class="wi-lb">📖 ${t('Định nghĩa')}</span><div>${esc(w.def)}</div></div>` : ''}
            ${w.ex ? `<div class="wi-sec wi-ex"><span class="wi-lb">💬 ${t('Ví dụ')}</span><div class="fi-ex">${highlight(w.ex, w.word)} <button class="ctx-say" data-saysent="${esc(w.ex)}" title="${t('Nghe cả câu')}">🔊</button><button class="ctx-say" data-saysent="${esc(w.ex)}" data-slow="1" title="${t('Nghe chậm')}">🐢</button></div><div class="fi-tr small muted" data-keep-vi id="fiTr"></div></div>` : ''}
            ${col.length || syn.length ? `<div class="wi-sec wi-chips">${col.length ? `<span class="wi-lb">🔗 ${t('Hay đi với')}</span>${col.map(x => `<span class="chip">${esc(x)}</span>`).join('')}` : ''}${syn.length ? `<span class="wi-lb" style="margin-left:${col.length ? '.6rem' : '0'}">≈ ${t('Đồng nghĩa')}</span>${syn.map(x => `<span class="chip">${esc(x)}</span>`).join('')}` : ''}</div>` : ''}
            ${w.note ? `<div class="wi-sec wi-tip">💡 ${esc(w.note)}</div>` : ''}
            ${App.notesHtml(w.word)}
          </div>
          <button class="btn primary lg block" id="gotIt" style="margin-top:1rem">${t('Tiếp tục')} ↵</button>
          <div class="center" style="margin-top:.6rem"><button class="linklike" id="known">${t('Mình đã biết từ này')}</button></div>`;
        nativeFill($('[data-native]'), w.word);
        if (w.ex && I18N.learnLang() === 'vi') Dict.translateVi(w.ex).then(tr => { const e = $('#fiTr'); if (e && tr) e.textContent = '🇻🇳 ' + tr; }).catch(() => {});
        $('#sayI').onclick = () => speak(w.word, accent(), w.audio);
        $('#slowI').onclick = () => speak(w.word, accent(), w.audio, true);
        speak(w.word, accent(), w.audio);
        $('#gotIt').focus();
        $('#gotIt').onclick = () => { queue.unshift(w); next(); };
        // Đã biết → bỏ khỏi phiên học, lưu thẻ với lịch ôn xa (FSRS: độ ổn định ~30 ngày)
        $('#known').onclick = async () => {
          stage.set(w.word, 3); knownSkip.add(w.word);
          const entry = INDEX[w.word.toLowerCase()] || w;
          if (!App.inDeck(w.word)) await App.addWord(entry, null, { silent: true });
          const now = Date.now();
          await Cards.patch(w.word, c => { c.srs = { ...SRS.newState(), reps: 2, S: 30, D: 3, interval: 30, last: now, due: now + 30 * 864e5, step: 0 }; });
          state.cards = await Cards.all();
          toast('👍 ' + t('Đã đánh dấu “{word}” là từ đã biết – sẽ ôn lại sau ~1 tháng', { word: w.word }));
          next();
        };
        document.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); $('#gotIt').click(); } else if (e.key === ' ' && e.target === document.body) { e.preventDefault(); flip(); } };
        return;
      }
      renderQuestion($('#qbox'), { type: STAGES[st], w, list }, (ok, el) => {
        answered++;
        if (ok) { stage.set(w.word, st + 1); App.reward({ xp: 2 }, el); }
        else { mistakes++; stage.set(w.word, Math.max(0, st - 1)); }
        if (stage.get(w.word) < 3) queue.splice(Math.min(queue.length, 2 + Math.floor(Math.random() * 2)), 0, w);
        next();
      });
    };
    const finish = async () => {
      document.onkeydown = null;
      const notIn = items.filter(w => !App.inDeck(w.word));
      App.reward({ quizzes: 1, perfect: mistakes === 0 ? 1 : 0, newWords: notIn.length, xp: 20 });
      Sfx.win(); confetti();
      view.innerHTML = `<div class="study-wrap"><div class="card empty celebrate">
        <div class="em">🧠</div><h2>${t('Bạn đã học xong {n} từ!', { n: items.length })}</h2>
        <p class="muted">${t('{answered} câu trả lời · {mistakes} lần sai · +20 XP thưởng', { answered, mistakes })}</p>
        <div class="row center" style="margin:1rem 0">${items.map(w => `<a class="chip" href="#/dict/${encodeURIComponent(w.word)}">${esc(w.emoji)} ${esc(w.word)}</a>`).join('')}</div>
        ${notIn.length ? `<p><button class="btn primary" id="addLearned">+ ${t('Đưa {n} từ vào flashcard để ôn định kỳ', { n: notIn.length })}</button></p>` : `<p class="small muted">${t('Các từ này đã có trong flashcard – hệ thống sẽ nhắc bạn ôn đúng lúc.')}</p>`}
        <div class="row center" style="margin-top:.6rem"><button class="btn" id="again">${t('Học 8 từ tiếp theo')}</button><a class="btn" href="#/practice/match?src=${encodeURIComponent(src)}">⚡ ${t('Ghép thẻ')}</a></div>
      </div></div>`;
      $('#again').onclick = () => runLearn(src);
      const al = $('#addLearned');
      if (al) al.onclick = async () => { for (const w of notIn) await App.addWord(INDEX[w.word.toLowerCase()] || w, null, { silent: true }); al.disabled = true; al.textContent = '✓ ' + t('Đã thêm'); Sfx.win(); };
    };
    next();
  }

  // ---------- Ghép thẻ (Match) ----------
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
        Sfx.correct(); sel.classList.add('gone'); b.classList.add('gone'); sel = null; left--;
        if (!left) done();
      } else {
        Sfx.wrong(); misses++; const s = sel; s.classList.remove('sel'); s.classList.add('bad'); b.classList.add('bad');
        setTimeout(() => { s.classList.remove('bad'); b.classList.remove('bad'); }, 400); sel = null;
      }
    });
    async function done() {
      clearInterval(timer);
      const time = +((performance.now() - t0) / 1000 + misses).toFixed(1);
      const best = state.game.best.match;
      const xp = 10 + (time < 25 ? 10 : time < 40 ? 5 : 0);
      await App.reward({ matches: 1, quizzes: 1, perfect: misses === 0 ? 1 : 0, matchTime: time, xp });
      Sfx.win(); confetti();
      view.innerHTML = `<div class="study-wrap"><div class="card empty celebrate">
        <div class="em">⚡</div><h2>${time}s</h2>
        <p>${!best || time < best ? '🏅 ' + t('Kỷ lục mới!') : t('Kỷ lục của bạn: {best}s', { best })} · ${t('{n} lần sai', { n: misses })} · +${xp} XP</p>
        <div class="row center">${items.map(w => `<span class="chip">${esc(w.word)} = ${esc(mean(w))}</span>`).join('')}</div>
        <div class="row center" style="margin-top:1.2rem"><button class="btn primary" id="again">${t('Chơi lại')}</button><a class="btn" href="#/practice?src=${encodeURIComponent(src)}">${t('Chế độ khác')}</a></div>
      </div></div>`;
      $('#again').onclick = () => runMatch(src);
    }
  }

  // ---------- Luyện phát âm (nhận dạng giọng nói) ----------
  function runSpeak(src, query) {
    const one = query && query.get('w');
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
          ${pic(w).replace('class="pic"', 'class="pic" style="width:110px;margin:0 auto 1rem"')}
          <div class="entry-word">${esc(w.word)}</div>
          <div class="row center"><span class="ipa" id="ipaW" style="font-size:1.1rem">${esc(w.ipa) || (w.ipaUS ? '' : `<span class="muted small">${t('đang tra phiên âm…')}</span>`)}</span><button class="icon-btn" id="model" title="${t('Nghe mẫu')}">🔊</button><button class="icon-btn" id="modelSlow" title="${t('Nghe chậm')}">🐢</button></div>
          <div class="vi" id="viW" style="font-size:1rem;margin-top:.3rem">${esc(mean(w))}</div>
          <div style="margin:1.6rem 0 .6rem"><button class="mic" id="mic" title="${t('Bấm và nói')}">🎙️</button></div>
          <div class="muted small" id="hint">${SR ? t('Bấm micro rồi đọc to từ trên') : '⚠️ ' + t('Trình duyệt không hỗ trợ nhận dạng giọng nói – hãy dùng Chrome hoặc Edge.')}</div>
          <div id="result" style="margin-top:1rem"></div>
        </div>
        <div class="row center" style="margin-top:1rem"><button class="btn" id="skipW">${t('Bỏ qua')}</button><button class="btn primary" id="nextW" hidden>${t('Từ tiếp theo →')}</button></div>
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
            if (score >= 65 && !scored) { scored = true; good++; App.reward({ spoken: 1, xp: score >= 85 ? 5 : 3 }, $('#mic')); score >= 85 ? Sfx.win() : Sfx.correct(); }
            else if (score < 65) Sfx.wrong();
            const nb = $('#nextW'); if (nb) nb.hidden = false;
          },
          error: code => { const h = $('#hint'); if (h) h.textContent = UI.recErrorText(code); },
          end: () => { listening = null; const m = $('#mic'); if (m) m.classList.remove('rec'); const h = $('#hint'); if (h && h.textContent.includes(t('Đang nghe… đọc to và rõ (bấm lần nữa để dừng)'))) h.textContent = t('Bấm micro để thử lại'); },
        });
      };
    };
    const finish = () => {
      App.reward({ quizzes: 1, xp: 5 });
      Sfx.win(); if (good >= items.length * 0.7) confetti();
      view.innerHTML = `<div class="study-wrap"><div class="card empty celebrate"><div class="em">🎙️</div>
        <h2>${t('Phát âm tốt {good}/{total} từ', { good, total: items.length })}</h2><p class="muted">${t('Luyện đều mỗi ngày để Speaking tự nhiên hơn.')}</p>
        <div class="row center"><button class="btn primary" id="again">${t('Luyện tiếp')}</button><a class="btn" href="#/practice">${t('Chế độ khác')}</a></div></div></div>`;
      $('#again').onclick = () => runSpeak(src);
    };
    show();
  }
})();
