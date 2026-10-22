/* Học & luyện tập: ôn tập SRS, Học thông minh, Trắc nghiệm, Điền từ, Nghe & chép, Ghép thẻ, Phát âm, Kiểm tra. */
(function () {
  const { SRS, Cards, Stats, endOfToday, DAY } = Core;
  const { TOPICS, INDEX } = IELTS_DATA;
  const { $, $$, esc, shuffle, highlight, cloze, clozeAnswer, similarity, toast, speak, tts, pic, levelChip, posChip, xpFloat } = UI;
  const App = window.App;
  const { state, routes } = App;
  const view = App.view;
  const accent = () => state.settings.accent;
  // Nhãn nguồn của ngữ cảnh (thẻ lưu & đồng bộ KHÓA tiếng Việt, vd. "Bài đọc: <tên bài>") → dịch lúc vẽ
  const ctxTitle = s => {
    if (s === 'Câu của tôi') return t('Câu của tôi');
    let m = /^Bài đọc: ([\s\S]*)$/.exec(s); if (m) return t('Bài đọc: {title}', { title: m[1] });
    m = /^Bài mẫu Task (\d+)$/.exec(s); if (m) return t('Bài mẫu Task {n}', { n: m[1] });
    return s;
  };
  // Phản hồi xúc giác chuẩn Duolingo: đúng = rung ngắn 35ms; sai = rung đôi [50, 40, 50]ms (tôn trọng prefers-reduced-motion & tắt âm)
  const haptic = ok => {
    try {
      if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      if (navigator.vibrate && (!state.settings || state.settings.sfx !== false)) {
        navigator.vibrate(ok ? 35 : [50, 40, 50]);
      }
    } catch (e) { /* bỏ qua */ }
  };

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
  const nativeFill = (el, word) => App.nativeFill(el, word);
  const picOk = w => !!w && (window.Distract ? Distract.picOk(w) : !!w.image); // js/distract.js: emoji đúng nghĩa theo từ loại
  App.picOk = picOk;
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
    else if (src && src.startsWith('topic:')) { const t = App.topicOf(src.slice(6)); list = t ? t.words : []; } // gồm bài con lộ trình (ngsl1.3 – path.js)
    else list = cards;
    if (list.length < 4 && (!src || src === 'deck')) list = shuffle(TOPICS.filter(t => t.group === 'topics').flatMap(t => t.words)).slice(0, 120);
    return list.map(norm);
  }
  const srcName = src => { const o = sourceList().find(o => o[0] === src), tp = !o && /^topic:/.test(src || '') && App.topicOf(src.slice(6)); return o ? o[1] : tp ? `${tp.emoji} ${tp.name}` : '📒 ' + t('Sổ từ của tôi'); };
  // Báo hoàn thành lượt (lộ trình ghi bước đã xong + màn thưởng cuối bài – path.js)
  const practiceDone = detail => window.dispatchEvent(new CustomEvent('lexkite:practice-done', { detail }));
  let libN = null;
  const libNorm = () => libN && libN.length === TOPICS.length ? libN.list : (libN = { length: TOPICS.length, list: TOPICS.flatMap(t => t.words).filter(x => x.vi || x.def).map(norm) }).list;
  const distractors = (w, list, n, key) => {
    const base = list.length >= n + 1 ? list : TOPICS.flatMap(t => t.words).map(norm);
    // js/distract.js: cùng từ loại/trình độ/độ dài, không đồng nghĩa/cùng họ; sổ từ + thư viện
    if (window.Distract) { const out = Distract.pick(w, list.concat(libNorm()), { n, key, mean, seed: Math.random() }); if (out.length >= n) return out; }
    const same = shuffle(base.filter(x => x.word !== w.word && x[key] && x[key] !== w[key] && x.pos === w.pos));
    const any = shuffle(base.filter(x => x.word !== w.word && x[key] && x[key] !== w[key]));
    const out = [];
    for (const x of [...same, ...any]) { if (out.length >= n) break; if (!out.some(o => o[key] === x[key])) out.push(x); }
    return out;
  };

  // ================= ÔN TẬP SRS =================
  let session = null;
  App.currentSession = () => session;
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
    // Từ thông báo "sắp quên" (checkReminder): ôn đúng nhóm từ sắp quên bằng chế độ học nhanh (nguồn 'forgetting')
    if (query && query.get && query.get('src') === 'forgetting' && App.forgetting().length) { location.hash = '#/practice/learn?src=forgetting'; return; }
    const ahead = Math.min(7, Math.max(0, +((query && query.get && query.get('ahead')) || 0)));
    if (!Object.keys(state.cards).length) {
      view.innerHTML = `<div class="study-wrap"><div class="card empty"><div class="em">🃏</div><h2>${t('Chưa có flashcard nào')}</h2><p>${t('Thêm từ từ thư viện hoặc tra từ điển để bắt đầu.')}</p><div class="row center"><a class="btn primary" href="#/library">${t('Mở thư viện')}</a><a class="btn" href="#/dict">${t('Tra từ')}</a></div></div></div>`;
      return;
    }
    session = { queue: buildQueue(ahead), done: 0, again: 0, missed: [], total: 0, xp: 0, g: [0, 0, 0, 0], t0: Date.now(), reverse: !!session && session.reverse };
    // Từ widget màn hình chính/khóa (#/review?w=từ): đưa đúng thẻ đang hiện lên đầu phiên ôn
    const pin = query && query.get && String(query.get('w') || '').toLowerCase();
    if (pin && state.cards[pin]) session.queue = [pin, ...session.queue.filter(k => k !== pin)];
    session.total = session.queue.length;
    if (!session.queue.length) return reviewDone(true);
    showCard();
  };

  // Từ khó nhất phiên [U2d]: trong các từ bấm "Quên", chọn từ có số lần quên (lapses) cao nhất
  function hardestOf(missed) {
    const list = [...new Set(missed || [])], card = w => state.cards[String(w).toLowerCase()] || state.cards[w] || null;
    if (!list.length) return null;
    let w = list[0], c = card(w);
    list.slice(1).forEach(x => { const cx = card(x); if (((cx && cx.srs.lapses) || 0) > ((c && c.srs.lapses) || 0)) { w = x; c = cx; } });
    return { w, c, others: list.filter(x => x !== w) };
  }

  function reviewDone(nothing) {
    const next = Object.values(state.cards).filter(c => c.srs.due > endOfToday()).sort((a, b) => a.srs.due - b.srs.due)[0];
    if (!nothing) { Sfx.win(); confetti(); }
    const acc = session.done ? Math.round((session.done - session.again) / session.done * 100) : 0;
    const streak = App.streak(), hitGoal = (state.stats.days[Core.todayKey()] || 0) >= (state.settings.dailyGoal || 10);
    const mood = nothing || acc >= 90 ? 'win' : acc >= 60 ? 'happy' : 'cheer';
    const soon = Object.values(state.cards).filter(c => c.srs.last && c.srs.due > endOfToday() && c.srs.due <= endOfToday() + 2 * DAY).length;
    const H = nothing ? null : hardestOf(session.missed);
    const pill = (v, l, col) => `<div class="rev-pill"><b${col ? ` style="color:var(${col})"` : ''}>${v}</b><span class="tiny muted">${l}</span></div>`;
    view.innerHTML = `<div class="study-wrap"><div class="card empty celebrate rev-done">
      <div class="em kit-cele" aria-hidden="true">${window.Kit ? Kit.svg(mood, 120) : (nothing ? '🎉' : '🏆')}</div>
      <h2>${nothing ? t('Hôm nay bạn đã ôn hết!') : t('Hoàn thành {n} lượt ôn!', { n: session.done })}</h2>
      ${nothing ? '' : `<div class="rev-stats" role="group" aria-label="${t('Kết quả phiên ôn')}">
        ${pill('+' + session.xp, 'XP', '--gold')}${pill(acc + '%', t('Nhớ ngay'), '--good-text')}${pill('🔥 ' + streak, t('Chuỗi ngày'))}${pill('⏱ ' + t('{m} phút', { m: Math.max(1, Math.round((Date.now() - (session.t0 || Date.now())) / 6e4)) }), t('Thời gian'))}
      </div>
      ${hitGoal ? `<div class="rev-goal small">🎯 ${t('Hoàn thành mục tiêu ngày')}</div>` : ''}
      ${gradeMix(session.g)}
      ${H ? `<div class="rev-hardest">
        <div class="rev-hard-head"><span class="small muted">${t('Từ cần chú ý nhất:')}</span>
          <span class="row nowrap" style="gap:.35rem"><button type="button" class="btn sm ghost" data-say-hard aria-label="${t('Nghe phát âm')}">🔊</button><a class="btn sm ghost" href="#/dict/${encodeURIComponent(H.w)}">${t('Tra từ')} →</a></span></div>
        <div><b class="rev-hard-word">${esc(H.w)}</b>${H.c && H.c.ipa ? ` <span class="ipa">/${esc(String(H.c.ipa).replace(/^\/|\/$/g, ''))}/</span>` : ''}</div>
        ${H.c && mean(H.c) ? `<div class="rev-hard-mean small muted">${esc(mean(H.c))}</div>` : ''}
        ${H.others.length ? `<div class="rev-hard-more"><span class="tiny muted">${t('Từ vừa quên khác:')}</span> ${H.others.slice(0, 10).map(w => `<a class="chip" href="#/dict/${encodeURIComponent(w)}">${esc(w)}</a>`).join('')}</div>` : ''}
      </div>` : `<div class="tip rev-perfect">🌟 <b>${t('Phiên ôn xuất sắc!')}</b> ${t('Bạn không quên từ nào trong phiên này.')}</div>`}`}
      ${(() => { // Dự báo 7 ngày tới (như Anki): biết trước khối lượng, chủ động sắp xếp thời gian
        const day0 = endOfToday(), n = [0, 0, 0, 0, 0, 0, 0];
        Object.values(state.cards).forEach(c => { const d = Math.floor((c.srs.due - day0) / 864e5); if (c.srs.last && d >= 0 && d < 7) n[d]++; });
        const mx = Math.max(1, ...n);
        return n.some(Boolean) ? `<div class="forecast" title="${t('Số thẻ đến hạn 7 ngày tới')}">${n.map((x, i) => `<div><i style="height:${Math.round(x / mx * 44) + 2}px"></i><b>${x}</b><span>${i === 0 ? t('Mai') : new Date(day0 + (i + 0.5) * 864e5).toLocaleDateString(I18N.lang(), { weekday: 'short' })}</span></div>`).join('')}</div>` : '';
      })()}
      <p>${next ? t('Thẻ tiếp theo đến hạn: <b>{date}</b>.', { date: new Date(next.srs.due).toLocaleDateString(I18N.lang()) }) : ''} ${t('Học đều mỗi ngày là bí quyết nhớ lâu.')}</p>
      ${soon ? `<div class="tip small" style="margin:.6rem 0">⏩ ${t('Sắp thi hoặc muốn học thêm? Ôn trước {n} thẻ đến hạn trong 2 ngày tới.', { n: soon })} <a href="#/review?ahead=2">${t('Ôn trước →')}</a></div>` : ''}
      <a class="btn primary lg block rev-next" href="#/home">${t('Học tiếp')} →</a>
      <div class="row center rev-more"><a class="btn" href="#/practice/learn">🧠 ${t('Học thông minh')}</a><a class="btn" href="#/practice/match">⚡ ${t('Ghép thẻ')}</a>${!nothing && (acc >= 80 && session.done >= 5 || hitGoal || [3, 7, 14, 30, 100].includes(streak)) ? `<button type="button" class="btn" data-share="${acc}">✨ ${t('Khoe thành tích')}</button>` : ''}</div>
    </div></div>`;
    const hs = view.querySelector('[data-say-hard]');
    if (hs && H) hs.onclick = () => speak(H.w, accent(), H.c ? H.c.audio : '');
  }

  // Phân bố 4 mức chấm của phiên
  function gradeMix(g) {
    const n = (g || []).reduce((a, b) => a + b, 0); if (!n) return '';
    const L = [[t('Quên'), 'again'], [t('Khó'), 'hard'], [t('Nhớ'), 'good'], [t('Dễ'), 'easy']];
    return `<figure class="gmix" aria-label="${t('Phân bố mức độ nhớ')}"><div class="gmix-bar" aria-hidden="true">${L.map(([, k], i) => g[i] ? `<i class="gm-${k}" style="flex:${g[i]}"></i>` : '').join('')}</div>
      <figcaption class="gmix-leg">${L.map(([l, k], i) => `<span><i class="gm-${k}" aria-hidden="true"></i>${esc(l)} <b>${g[i]}</b></span>`).join('')}</figcaption></figure>`;
  }

  async function undo() {
    const L = session.last; if (!L) return; session.last = null;
    const c0 = state.cards[L.key]; if (c0) { c0.srs = L.srs; await Cards.update(c0); state.cards[L.key] = c0; }
    Object.assign(session, { queue: L.queue, done: L.done, again: L.again, missed: L.missed, xp: Math.max(0, session.xp - L.xp) });
    if (session.g && session.g[L.g] > 0) session.g[L.g]--;
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
        <div class="muted small" style="margin-top:1rem">${t('Nghe từ, nhớ lại nghĩa rồi chạm để lật')} <span class="kbd kbd-hint">Space</span> · <span class="kbd kbd-hint">P</span> ${t('nghe lại')}</div>` : typeMode ? `
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
        <div class="row center"><span class="ipa">${esc(c.ipa)}</span>${posChip(c.pos)}<button class="icon-btn sm" data-say aria-label="${t('Nghe')}">🔊</button></div>
        ${ctx ? `<div class="ctx">📌 “${highlight(ctx.text, c.word)}”</div>` : ''}
        <div class="muted small" style="margin-top:1rem">${t('Đoán nghĩa, rồi chạm để lật')} <span class="kbd kbd-hint">Space</span></div>`;

    view.innerHTML = `<div class="study-wrap">
      <div class="study-top">
        <a class="icon-btn" href="${App.backHref().replace(/^#\/practice$/, "#/home")}" title="${t('Thoát')}" aria-label="${t('Thoát')}">✕</a>
        ${session.last ? `<button class="icon-btn" id="undoBtn" title="${t('Hoàn tác lần chấm vừa rồi (Z)')}" aria-label="${t('Hoàn tác lần chấm vừa rồi (Z)')}" aria-keyshortcuts="Z">↶</button>` : ''}
        <a class="icon-btn" href="#/handsfree/session" title="${t('Chế độ Rảnh tay')}" aria-label="${t('Chế độ Rảnh tay')}">🎧</a>
        <div class="progress" role="progressbar" aria-label="${t('Tiến độ')}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(pct)}"><i style="width:${pct}%"></i></div>
        <span class="small muted" style="white-space:nowrap" title="${t('Thẻ đang ở bước học (1–10 phút) sẽ quay lại trong phiên')}">✅ ${session.done} · ${t('<b>{n}</b> thẻ còn lại', { n: new Set(session.queue).size })}</span>
        <div id="studyKit" class="study-kit-mini" role="img" aria-label="Kit"></div>
      </div>
      <div class="row between small" style="margin-bottom:.6rem">
        <span>${isNew ? `<span class="chip lv">✨ ${t('TỪ MỚI')}</span>` : App.masteryDots(c.srs)}</span>
        <button class="btn sm ghost" id="toggleRev" title="${t('Đổi chiều thẻ')}">${rev ? `${(I18N && I18N.flag ? I18N.flag(I18N.lang() !== 'en' ? I18N.lang() : 'vi') : '🇻🇳')} → 🇬🇧` : `🇬🇧 → ${(I18N && I18N.flag ? I18N.flag(I18N.lang() !== 'en' ? I18N.lang() : 'vi') : '🇻🇳')}`}</button>
      </div>
      <div class="flash" id="flash">
        <div class="sw-badge sw-badge-again" aria-hidden="true">↺ ${t('Quên')}</div>
        <div class="sw-badge sw-badge-good" aria-hidden="true">✓ ${t('Nhớ')}</div>
        <div class="flash-inner">
          <div class="card face front">${front}</div>
          <div class="card face back">
            <div class="wc-hd"><div class="wc-wrow"><span class="entry-word wc-word">${esc(c.word)}</span><button class="icon-btn sm" data-say aria-label="${t('Nghe')}">🔊</button></div>
              <div class="wi-pron">${posChip(c.pos)}${levelChip(c.level)}${c.ipaUS && c.ipaUS !== c.ipa ? `<span class="wi-acc">🇬🇧 <span class="ipa">${esc(c.ipa)}</span><button class="icon-btn sm" data-say-acc="en-GB" aria-label="${t('Nghe giọng Anh–Anh')}">🔊</button></span><span class="wi-acc">🇺🇸 <span class="ipa">${esc(c.ipaUS)}</span><button class="icon-btn sm" data-say-acc="en-US" aria-label="${t('Nghe giọng Anh–Mỹ')}">🔊</button></span>` : `<span class="ipa">${esc(c.ipa)}</span>`}</div>
              <div class="vi wi-vi">${esc(mean(c))}</div><div class="wi-native" data-native></div></div>
            ${c.def && mean(c) !== c.def ? `<div class="wi-sec"><span class="wi-lb">📖 ${t('Định nghĩa')}</span><div lang="en">${esc(c.def)}</div></div>` : ''}
            ${c.ex ? `<div class="wi-sec wi-ex"><span class="wi-lb">💬 ${t('Ví dụ')}</span><div class="fi-ex">${highlight(c.ex, c.word)} <button class="icon-btn sm" data-speak-text="${esc(c.ex)}" aria-label="${t('Nghe cả câu')}">🔊</button></div></div>` : ''}
            ${c.contexts.length ? `<div class="wi-sec"><span class="wi-lb">📌 ${t('Ngữ cảnh của bạn')}</span>${c.contexts.slice(0, 2).map(x => `<div class="ex small" style="margin-top:.3rem">“${highlight(x.text, c.word)}” <button class="ctx-say sm" data-saysent="${esc(x.text)}" title="${t('Nghe cả câu')}">🔊</button>${ytOf(x.source) ? ` <button class="ctx-say sm" data-ytsrc="${esc(x.source)}" title="${t('Xem lại đoạn gốc')}">▶</button>` : ''}${x.title ? ` <span class="muted">— ${esc(ctxTitle(x.title))}</span>` : ''}${x.vi && (I18N.meanLang() === 'vi' || I18N.lang() !== 'en') ? `<div style="font-style:normal">${(I18N && I18N.flag ? I18N.flag(I18N.lang() !== 'en' ? I18N.lang() : 'vi') : '🇻🇳')} ${esc(x.vi)}</div>` : ''}</div>`).join('')}</div>` : ''}
            ${(c.sentences || []).length ? `<div class="wi-sec"><span class="wi-lb">💬 ${t('Câu song ngữ')}</span>${c.sentences.map(x => `<div class="small" style="margin-top:.3rem">${highlight(x.en, c.word)}${I18N.meanLang() === 'vi' && x.vi ? `<div class="muted">${esc(x.vi)}</div>` : ''}</div>`).join('')}</div>` : ''}
            ${c.col.length || c.syn.length ? `<div class="wi-sec">${App.chipsHtml(c.col, '🔗', t('Hay đi với'))}${App.chipsHtml(c.syn, '≈', t('Đồng nghĩa'))}</div>` : ''}
            ${c.note ? `<div class="wi-sec wi-tip">📝 ${esc(c.note)}</div>` : ''}
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
      <div id="actions" class="grade-bar"><button class="btn primary lg block" id="flipBtn">${t('Lật thẻ')}</button></div>
      <p class="muted tiny center kbd-hint" style="margin-top:1rem">${t('Phím tắt: <span class="kbd">Space</span> lật · <span class="kbd">1</span>–<span class="kbd">4</span> chấm điểm · <span class="kbd">P</span> phát âm')} · <span class="kbd">Z</span> ${t('hoàn tác')}</p>
    </div>`;
    App.bindCommon();
    const say = () => speak(c.word, accent(), c.audio);
    $$('[data-say]').forEach(b => b.onclick = e => { e.stopPropagation(); say(); });
    // Nghe riêng giọng UK/US
    $$('[data-say-acc]').forEach(b => b.onclick = e => { e.stopPropagation(); const a = b.dataset.sayAcc, u = c.audio || '', us = /-us\.mp3$/.test(u); speak(c.word, a, a === 'en-US' ? (us ? u : '') : (us ? '' : u)); });
    if (listenMode) setTimeout(say, 250);
    nativeFill($('.back [data-native]'), c.word);
    // Tìm sẵn bản ghi giọng người thật cho 3 thẻ kế tiếp (chạy ngầm, lưu vào thẻ) → thay dần giọng máy bằng giọng thật
    session.queue.slice(1, 4).forEach(k => { const n = state.cards[k]; if (n && !n.audio && !n._aq && navigator.onLine) { n._aq = 1; Dict.lookup(n.word, { image: false, examples: false }).then(e => { if (e && e.found && (e.audio || e.audioUS)) Cards.patch(k, x => { if (!x.audio) x.audio = e.audio || e.audioUS; if (!x.ipaUS && e.ipaUS) x.ipaUS = e.ipaUS; }).then(c2 => { if (c2) state.cards[k] = c2; }); }).catch(() => {}); } });

    // 🐦 Kit mascot theo ngữ cảnh học tập
    const reduceMotion = Boolean(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    const updateKit = mood => {
      const el = $('#studyKit');
      if (el && window.Kit && typeof Kit.svg === 'function') {
        el.innerHTML = Kit.svg(mood, 38, !reduceMotion);
      }
    };
    updateKit('think');
    const sk = $('#studyKit');
    if (sk) sk.onclick = () => updateKit('cheer');

    const flip = () => {
      if (flipped) return;
      flipped = true; Sfx.flip();
      $('#flash').classList.add('flipped');
      updateKit('happy');
      const labels = [[t('Quên'), 'g-again'], [t('Khó'), 'g-hard'], [t('Nhớ'), 'g-good'], [t('Dễ'), 'g-easy']];
      $('#actions').innerHTML = `<div class="grades" role="group" aria-label="${t('Chấm mức độ nhớ')}">${labels.map(([l, cls], i) => { const p = SRS.preview(c.srs, i); return `<button class="btn ${cls}" data-grade="${i}" aria-keyshortcuts="${i + 1}" aria-label="${esc(l)} · ${esc(p)} (${i + 1})"><b>${l}</b><small>${p}</small><kbd class="g-k" aria-hidden="true">${i + 1}</kbd></button>`; }).join('')}</div>`;
      $$('[data-grade]').forEach(b => b.onclick = () => grade(+b.dataset.grade, b));
      if (rev || state.settings.autoSpeak) say();
    };
    $('#flash').addEventListener('click', e => { if (!e.target.closest('button, details, textarea, input')) flip(); });

    // 👆 Vuốt thẻ (cảm ứng & chuột): Chỉ vuốt được khi đã lật xem đáp án. Trước khi lật, chạm là lật thẻ.
    // Quy ước phổ quát: Trái = Again (Quên), Phải = Good (Nhớ) (giữ nguyên ở cả LTR và RTL).
    if (!typeMode && window.PointerEvent) {
      const fc = $('#flash');
      let x0 = 0, y0 = 0, dx = 0, dy = 0, t0 = 0;
      let drag = false, moved = false, axisLock = null; // null | 'x' | 'y'
      let hasVibrated = false;

      const reset = () => {
        fc.classList.remove('swiping', 'sw-good', 'sw-again');
        fc.style.transform = '';
      };

      const springBack = () => {
        fc.classList.remove('swiping', 'sw-good', 'sw-again');
        fc.classList.add('spring-back');
        fc.style.transform = '';
        setTimeout(() => {
          fc.classList.remove('spring-back');
        }, 240);
      };

      fc.addEventListener('pointerdown', e => {
        // Chỉ cho phép vuốt khi ĐÃ LẬT, chưa chấm, và là nút chuột chính/chạm
        if (graded || !flipped || (e.button !== undefined && e.button !== 0)) return;
        if (e.target.closest('button, details, textarea, input, a, [data-note], [data-mnem], [data-shadow]')) return;

        // Bỏ qua cú chạm bắt đầu trong 24px sát mép trái/phải để không đụng cử chỉ back của iOS/Android
        const winW = window.innerWidth || document.documentElement.clientWidth || 360;
        if (e.clientX < 24 || e.clientX > winW - 24) return;

        drag = true;
        moved = false;
        axisLock = null;
        hasVibrated = false;
        x0 = e.clientX;
        y0 = e.clientY;
        dx = 0;
        dy = 0;
        t0 = Date.now();
        fc.classList.remove('fly', 'spring-back');
        try { fc.setPointerCapture(e.pointerId); } catch (_) {}
      });

      fc.addEventListener('pointermove', e => {
        if (!drag) return;
        dx = e.clientX - x0;
        dy = e.clientY - y0;

        // Khóa trục sau khoảng 10px để phân biệt cuộn dọc vs vuốt ngang
        if (!axisLock) {
          const dist = Math.hypot(dx, dy);
          if (dist >= 10) {
            if (Math.abs(dy) > Math.abs(dx)) {
              // Cuộn dọc tự nhiên: nhường quyền cho trình duyệt, hủy cử chỉ vuốt
              axisLock = 'y';
              drag = false;
              reset();
              try { fc.releasePointerCapture(e.pointerId); } catch (_) {}
              return;
            } else {
              // Vuốt thẻ ngang: khóa trục x
              axisLock = 'x';
              fc.classList.add('swiping');
            }
          } else {
            return;
          }
        }

        if (axisLock === 'x') {
          if (e.cancelable) e.preventDefault();
          moved = true;
          const cardW = fc.offsetWidth || 340;
          const rot = reduceMotion ? 0 : (dx / 18);
          fc.style.transform = `translate3d(${dx}px, ${Math.min(0, dy) * 0.25}px, 0) rotate(${rot}deg)`;

          // Trái = Again (Quên), Phải = Good (Nhớ)
          fc.classList.toggle('sw-good', dx > 40);
          fc.classList.toggle('sw-again', dx < -40);

          // Rung haptic 15ms khi qua ngưỡng vuốt (≥ 30% bề rộng hoặc vận tốc cao)
          const threshDist = cardW * 0.3;
          const dt = Math.max(1, Date.now() - t0);
          const vx = Math.abs(dx) / dt;
          if (!hasVibrated && (Math.abs(dx) >= threshDist || (Math.abs(dx) >= 40 && vx > 0.5))) {
            hasVibrated = true;
            try { if (navigator.vibrate) navigator.vibrate(15); } catch (_) {}
          }
        }
      });

      const end = e => {
        if (!drag) return;
        drag = false;
        try { if (e && e.pointerId) fc.releasePointerCapture(e.pointerId); } catch (_) {}

        if (axisLock !== 'x') {
          reset();
          return;
        }

        const cardW = fc.offsetWidth || 340;
        const threshDist = cardW * 0.3;
        const dt = Math.max(1, Date.now() - t0);
        const vx = Math.abs(dx) / dt;
        const isSwipe = Math.abs(dx) >= threshDist || (Math.abs(dx) >= 40 && vx > 0.5);

        if (isSwipe) {
          const isGood = dx > 0;
          const gradeIdx = isGood ? 2 : 0;
          updateKit(isGood ? 'win' : 'think');

          if (reduceMotion) {
            reset();
            grade(gradeIdx);
          } else {
            fc.classList.remove('swiping');
            fc.classList.add('fly');
            fc.style.transform = `translate3d(${isGood ? 120 : -120}vw, 0, 0) rotate(${isGood ? 25 : -25}deg)`;
            setTimeout(() => grade(gradeIdx), 220);
          }
        } else {
          // Thả tay giữa chừng không đủ ngưỡng: bật thẻ về vị trí cũ
          springBack();
        }
      };

      fc.addEventListener('pointerup', end);
      fc.addEventListener('pointercancel', () => { drag = false; reset(); });
      fc.addEventListener('click', e => {
        if (moved) {
          e.stopImmediatePropagation();
          moved = false;
        }
      }, true);
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
        inp.disabled = true;
        inp.classList.remove('ans-bounce', 'ans-shake');
        void inp.offsetWidth;
        inp.classList.add(dd === 0 ? 'ok' : dd === 1 ? 'near' : 'bad');
        inp.classList.add(dd === 0 ? 'ans-bounce' : 'ans-shake');
        $('#typeRes').innerHTML = dd === 0 ? `✅ ${t('Chính xác!')}` : `${dd === 1 ? '🟡 ' + t('Gần đúng – sai 1 chữ') : '❌ ' + t('Chưa đúng')}: <b>${esc(c.word)}</b>`;
        dd === 0 ? Sfx.correct() : Sfx.wrong && Sfx.wrong();
        haptic(dd === 0);
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
        } catch (e) { out.innerHTML = `${esc(AI.errText ? AI.errText(e) : e.message)} ${e.message === 'BAD_KEY' ? `<button class="btn sm" data-k>${t('Nhập khóa')}</button>` : ''}`; const k = $('[data-k]', out); if (k) k.onclick = () => AI.keyDialog(); }
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
      if ((e.code === 'Space' || e.key === 'Enter') && e.target.closest('.wc-chip, [data-grade], .wn a, .wn button')) return; // chip/nút chấm đang focus → để bàn phím bấm nút
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
      if (session.g) session.g[g]++;
      if (g === 0) updateKit('think');
      else if (g >= 2) updateKit('win');
      else updateKit('happy');
      g === 0 ? Sfx.wrong() : Sfx.correct();
      haptic(g > 0);
      const fc = $('#flash');
      if (fc) {
        fc.classList.remove('ans-bounce', 'ans-shake');
        void fc.offsetWidth;
        fc.classList.add(g === 0 ? 'ans-shake' : 'ans-bounce');
      }
      if (el) {
        el.classList.remove('ans-bounce', 'ans-shake');
        void el.offsetWidth;
        el.classList.add(g === 0 ? 'ans-shake' : 'ans-bounce');
      }
      App.reward({ reviews: 1, newWords: wasNew ? 1 : 0, again: g === 0 ? 1 : 0, xp }, el);
      session.queue.shift();
      session.done += 1;
      // Thẻ còn ở bước học (1–10 phút) quay lại trong cùng phiên
      if (c.srs.reps === 0) session.queue.splice(Math.min(session.queue.length, g === 0 ? 3 : 6), 0, key);
      if (g === 0) { session.again += 1; if (!session.missed.includes(c.word)) session.missed.push(c.word); }
      if (!/^#\/review/.test(location.hash)) return; // đã rời trang ôn tập
      if (g === 0) await new Promise(r => setTimeout(r, 200));
      session.queue.length ? showCard() : reviewDone(false);
    }
  }

  // ================= TRUNG TÂM LUYỆN TẬP =================
  const MODES = {
    learn: { em: '🧠', get name() { return t('Học thông minh'); }, run: runLearn },
    mcq: { em: '🧩', get name() { return t('Trắc nghiệm'); }, run: src => runQuiz(src, 'mcq') },
    cloze: { em: '✍️', get name() { return t('Điền từ vào câu'); }, run: src => runQuiz(src, 'cloze') },
    listen: { em: '🎧', get name() { return t('Nghe & chép'); }, run: src => runQuiz(src, 'listen') },
    test: { em: '📝', get name() { return t('Bài kiểm tra'); }, run: src => runQuiz(src, 'test') },
    match: { em: '⚡', get name() { return t('Ghép thẻ'); }, run: runMatch },
    speak: { em: '🎙️', get name() { return t('Luyện phát âm'); }, run: runSpeak },
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

  // ✕ giữa lượt: hỏi lại trước khi bỏ dở (tiến độ lượt này chưa lưu)
  const guardExit = busy => { const x = $('.study-top a.icon-btn'); if (x) x.onclick = e => { if (!busy()) return; e.preventDefault(); UI.modal(`<div class="celebrate"><h2>${t('Thoát giữa chừng?')}</h2><p class="muted">${t('Kết quả của lượt này sẽ không được lưu.')}</p><div class="row center"><button class="btn primary" data-close>${t('Làm tiếp')}</button><a class="btn" href="${esc(x.getAttribute('href'))}" data-close>${t('Thoát')}</a></div></div>`); }; };
  function head(title, i, n, extra = '') {
    return `<div class="study-top"><a class="icon-btn" href="${App.backHref()}" title="${t('Thoát')}">✕</a><div class="progress"><i style="width:${i / Math.max(1, n) * 100}%"></i></div><span class="small muted" style="white-space:nowrap">${extra || `${Math.min(i + 1, n)}/${n}`}</span></div>
      <div class="small muted" style="margin:-.4rem 0 .8rem">${title}</div>`;
  }

  // ---------- Bộ máy câu hỏi dùng chung ----------
  // q = { type: 'mcq-vi'|'mcq-en'|'type-cloze'|'type-listen'|'type-vi', w, list }
  function renderQuestion(box, q, onDone) {
    const w = q.w;
    let answered = false;
    const FX = window.LessonFx, mute = () => !!(FX && FX.audioOff());
    const finish = (ok, given, ty) => {
      if (answered) return; answered = true;
      if (!ok && App.logMistake) App.logMistake({ kind: 'vocab', q: q.type.startsWith('mcq-en') || q.type === 'type-vi' || q.type === 'type-spell' ? I18N.tk('Từ tiếng Anh nghĩa là “{vi}”?', { vi: mean(w) }) : q.type === 'type-cloze' && w.ex ? I18N.tk('Điền từ: {sentence}', { sentence: w.ex.replace(UI.wordRegex(w.word), '___') }) : I18N.tk('Nghĩa của “{word}”?', { word: w.word }), answer: q.type === 'mcq-vi' ? w.vi : (q.answer || w.word), given: given || '', explain: `${w.word} ${w.ipa || ''} = ${w.vi}`, ref: w.word });
      ok ? Sfx.correct() : Sfx.wrong();
      haptic(ok);
      const fb = $('#fb', box);
      fb.innerHTML = `<div class="sheet ${ok ? 'ok' : 'no'}"><div class="sheet-in">
        <div class="sheet-head">${ty && ty.typo ? FX.typoHead(ty.marks) : ok ? ['✅ ' + t('Chính xác!'), '🎉 ' + t('Tuyệt vời!'), '👏 ' + t('Giỏi lắm!')][Math.floor(Math.random() * 3)] : '❌ ' + t('Chưa đúng · Đáp án: {answer}', { answer: esc(q.answer || w.word) })}</div>
        <div class="sheet-word"><button class="sheet-say" data-sayw aria-label="${t('Nghe')}">🔊</button><div style="min-width:0"><div><b class="sw">${esc(w.word)}</b>${w.pos ? ` <span class="sp">(${esc(w.pos)})</span>` : ''}</div>${w.ipa ? `<div class="sipa">${esc(w.ipa)}</div>` : ''}<div class="svi">${esc(mean(w))}</div></div></div>
        ${w.ex ? `<div class="sheet-ex">${highlight(w.ex, w.word)} <button class="ctx-say sm" data-saysent="${esc(w.ex)}" title="${t('Nghe câu')}" aria-label="${t('Nghe câu')}">🔊</button><button class="ctx-say sm" data-tr title="${t('Dịch câu')}" aria-label="${t('Dịch câu')}">🌐</button><div class="sheet-tr" hidden></div></div>` : ''}
        <button class="btn lg block sheet-next" id="nextQ">${t('Tiếp tục')}<span class="kbd-hint" aria-hidden="true"> ↵</span></button></div></div>`;
      // chừa đáy đúng chiều cao bảng phản hồi
      const fit = () => { const sh = $('.sheet', fb), wrap = box.closest('.study-wrap'); if (sh && wrap) wrap.style.setProperty('--sheet-h', (sh.offsetHeight || 280) + 'px'); }; fit();
      if (FX && (!ok || (ty && ty.typo))) FX.explain(fb, w.word, fit); // 💡 Giải thích: chỉ khi từ có ghi chú "Hiểu sâu"
      const tr = $('[data-tr]', fb); if (tr) tr.onclick = async () => { const t = $('.sheet-tr', fb); if (!t.hidden) { t.hidden = true; return; } t.hidden = false; t.textContent = '…'; const L = I18N.learnLang(); t.textContent = L === 'vi' ? await Dict.translateVi(w.ex) : await Dict.translateTo(w.ex, L); };
      $('[data-sayw]', fb).onclick = () => speak(w.word, accent(), w.audio);
      if ((!ok || q.type.startsWith('type')) && !mute()) speak(w.word, accent(), w.audio);
      $('#nextQ').focus({ preventScroll: true });
      let went = false; const t1 = Date.now();
      $('#nextQ').onclick = () => { if (went || Date.now() - t1 < 250) return; went = true; onDone(ok, $('#nextQ')); };
    };

    if (q.type === 'mcq-vi' || q.type === 'mcq-en') {
      const key = q.type === 'mcq-vi' ? 'vi' : 'word';
      const opts = shuffle([w, ...distractors(w, q.list, 3, key)]);
      const prompt = q.type === 'mcq-vi'
        ? `${picOk(w) ? pic(w) : ''}<div class="entry-word" style="margin-top:.6rem">${esc(w.word)}</div><div class="row center"><span class="ipa">${esc(w.ipa)}</span>${posChip(w.pos)}<button class="icon-btn sm" data-sayw aria-label="${t('Nghe')}">🔊</button></div><div class="muted small" style="margin-top:.6rem">${t('Chọn nghĩa đúng')}</div>`
        : `<div class="vi" style="font-size:1.5rem">${esc(mean(w))}</div>${posChip(w.pos)}${w.ex ? `<div class="ctx" style="margin:1rem auto 0">“${cloze(w.ex, w.word)}”</div>` : ''}<div class="muted small" style="margin-top:.6rem">${t('Chọn từ tiếng Anh đúng')}</div>`;
      box.innerHTML = `<div class="card q-card">${prompt.replace('class="pic"', 'class="pic" style="width:110px;margin:0 auto"')}</div>
        <div class="options ${key === 'word' ? 'two' : ''}">${opts.map((o, i) => `<button class="option" data-o="${esc(o.word)}"><span class="kbd">${i + 1}</span>${esc(o[key])}</button>`).join('')}</div><div id="fb"></div>`;
      const sw = $('[data-sayw]', box); if (sw) sw.onclick = () => speak(w.word, accent(), w.audio);
      const shownAt = Date.now();
      const pick = b => {
        if (answered || !b || Date.now() - shownAt < 250) return; // chạm đúp từ màn trước
        const ok = b.dataset.o === w.word;
        $$('.option', box).forEach(x => {
          if (x.dataset.o === w.word) {
            x.classList.add('right');
            x.classList.add('ans-bounce');
          }
        });
        if (!ok) {
          b.classList.add('wrong');
          b.classList.add('ans-shake');
        }
        const qc = $('.q-card', box);
        if (qc) {
          qc.classList.remove('ans-bounce', 'ans-shake');
          void qc.offsetWidth;
          qc.classList.add(ok ? 'ans-bounce' : 'ans-shake');
        }
        finish(ok);
      };
      $$('.option', box).forEach(b => b.onclick = () => pick(b));
      document.onkeydown = e => {
        if (answered) { if (e.key === 'Enter') { e.preventDefault(); $('#nextQ') && $('#nextQ').click(); } return; }
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        const n = /^[1-9]$/.test(e.key) ? +e.key : /^[a-dA-D]$/.test(e.key) ? e.key.toLowerCase().charCodeAt(0) - 96 : 0;
        if (n >= 1 && n <= opts.length) pick($$('.option', box)[n - 1]);
      };
      if (q.type === 'mcq-vi' && state.settings.autoSpeak && !mute()) speak(w.word, accent(), w.audio);
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
      prompt = `<div style="font-size:3rem">🎧</div><div class="row center"><button class="btn primary" id="play">🔊 ${t('Nghe')}</button><button class="btn" id="slow">🐢 ${t('Chậm')}</button></div><div class="muted small" style="margin-top:.8rem">${t('Gõ lại từ bạn nghe được')}${w.vi && !q.hard ? ' · ' + t('gợi ý: {hint}', { hint: esc(mean(w)) }) : ''}</div>`;
    } else if (isCloze) {
      prompt = `<div style="font-size:1.15rem;line-height:1.8">“${cloze(w.ex, w.word)}”</div><div class="muted" style="margin-top:.8rem">${t('Gợi ý: <b>{hint}</b>', { hint: esc(mean(w)) })} ${posChip(w.pos)}${q.hard ? '' : ` · ${t('bắt đầu bằng “{letter}”, {n} ký tự', { letter: esc(target[0]), n: target.length })}`}</div>`;
    } else {
      prompt = `<div class="vi" style="font-size:1.5rem">${esc(mean(w))}</div>${posChip(w.pos)}<div class="muted" style="margin-top:.8rem">${t('Gõ từ tiếng Anh')}${q.hard ? '' : ` · ${t('bắt đầu bằng “{letter}”, {n} ký tự', { letter: esc(w.word[0]), n: w.word.length })}`}</div>`;
    }
    box.innerHTML = `<div class="card q-card">${prompt}</div>
      <form id="ansForm" style="margin-top:1rem" autocomplete="off"><div class="search">
        <input class="input big-input" id="ans" placeholder="${t('Gõ đáp án…')}" autocapitalize="off" autocorrect="off" spellcheck="false">
        <button class="btn primary lg">${t('Kiểm tra')}</button></div>
        <div class="row center" style="margin-top:.5rem"><button type="button" class="btn sm ghost" id="skip">${t('Không biết – xem đáp án')}</button>${FX && q.type === 'type-listen' ? FX.skipAudioBtn() : ''}</div></form><div id="fb"></div>`;
    $('#ans').focus();
    if (q.type === 'type-listen') {
      $('#play').onclick = () => speak(w.word, accent(), w.audio);
      $('#slow').onclick = () => speak(w.word, accent(), w.audio, true);
      setTimeout(() => speak(w.word, accent(), w.audio), 250);
      const na = $('#lfxNoAudio'); if (na) na.onclick = () => { FX.pauseAudio(); q.type = 'type-vi'; document.onkeydown = null; renderQuestion(box, q, onDone); }; // 🔇 đổi câu này (và các câu nghe sau) sang dạng gõ nghĩa
    }
    $('#skip').onclick = () => finish(false);
    $('#ansForm').onsubmit = e => {
      e.preventDefault();
      if (answered) return $('#nextQ').click();
      const a = $('#ans').value.trim().toLowerCase().replace(/\s+/g, ' ');
      if (!a) return;
      let ok = a === w.word.toLowerCase() || a === target.toLowerCase(), ty = null;
      // Lỗi chính tả nhỏ (≤ 1 sửa/từ ≥ 4 chữ cái) → vẫn đúng + gạch chân chỗ sửa. Không áp cho bài chính tả và dạng từ đang kiểm (điền từ đã chia ≠ từ gốc)
      if (!ok && FX) {
        const strict = q.type === 'type-spell' || (isCloze && target.toLowerCase() !== w.word.toLowerCase());
        ty = FX.typo(a, target, { strict, isWord: x => x !== target.toLowerCase() && !!INDEX[x] });
        if (ty.ok) ok = true; else ty = null;
      }
      // Sai 1 ký tự → cho thử lại một lần
      if (!ok && !q.retried && similarity(a, target) >= 0.8) {
        q.retried = true;
        toast(t('Gần đúng rồi! Kiểm tra lại chính tả') + ' 👀');
        haptic(false);
        const inp = $('#ans');
        if (inp) {
          inp.classList.remove('ans-shake');
          void inp.offsetWidth;
          inp.classList.add('ans-shake');
        }
        return;
      }
      $('#ans').disabled = true;
      const inp = $('#ans');
      if (inp) {
        inp.classList.remove('ans-bounce', 'ans-shake');
        void inp.offsetWidth;
        inp.classList.add(ok ? 'ans-bounce' : 'ans-shake');
      }
      const qc = $('.q-card', box);
      if (qc) {
        qc.classList.remove('ans-bounce', 'ans-shake');
        void qc.offsetWidth;
        qc.classList.add(ok ? 'ans-bounce' : 'ans-shake');
      }
      finish(ok, a, ty);
    };
    document.onkeydown = e => { if (answered && e.key === 'Enter' && e.target.id !== 'ans') { e.preventDefault(); $('#nextQ').click(); } };
  }

  // ---------- Trắc nghiệm / Điền từ / Nghe / Kiểm tra ----------
  // as: báo bước khác khi chạy thay thế (vd. 'speak' khi tạm tắt micro → trắc nghiệm nghĩa vẫn tính bước nói của lộ trình)
  function runQuiz(src, mode, as) {
    const FX = window.LessonFx;
    const list = pool(src);
    const n = mode === 'test' ? 20 : 10;
    const items = shuffle(list).slice(0, Math.min(n, list.length));
    if (!items.length) return emptySource(src);
    const types = { mcq: ['mcq-vi'], cloze: ['type-cloze'], listen: ['type-listen'], test: ['mcq-vi', 'mcq-en', 'type-cloze', 'type-listen', 'type-vi'] }[mode];
    const qs = items.map((w, i) => ({ type: mode === 'test' ? types[i % types.length] : types[0], w, list }));
    if (mode === 'test') qs.sort(() => Math.random() - .5);
    const title = `${MODES[mode].em} ${MODES[mode].name} · ${esc(srcName(src))}`;
    const run = { i: 0, score: 0, wrong: [], xp: 0, c: FX ? FX.combo() : null };
    const again = () => runQuiz(src, mode, as);
    const notice = FX ? (as === 'speak' ? 'mic' : mode === 'listen' && FX.audioOff() ? 'audio' : '') : '';
    const next = () => {
      if (run.i >= qs.length) return finish();
      const q = qs[run.i];
      if (FX && FX.audioOff() && q.type === 'type-listen') q.type = 'type-vi'; // 🔇 đang tạm tắt bài nghe
      view.innerHTML = `<div class="study-wrap">${head(title, run.i, qs.length, `✅ ${run.score}`)}<div id="qbox"></div></div>`;
      guardExit(() => run.i > 0);
      // 💪 8 câu đúng liền → mời chế độ khó (1 lần/lượt; câu còn lại: gõ thay vì chọn, ít gợi ý, +6 XP)
      if (FX && FX.wantsHard(run.c, qs.length - run.i, mode)) { document.onkeydown = null; return FX.offerHard($('#qbox'), run.c, yes => { if (yes) FX.harden(qs.slice(run.i)); next(); }); }
      if (notice && run.i === 0) $('.study-top').before(FX.note(notice, again));
      renderQuestion($('#qbox'), q, (ok, el) => {
        const xp = q.hard ? 6 : 3;
        if (ok) { run.score++; run.xp += xp; App.reward({ xp }, el); } else run.wrong.push(q.w);
        if (FX) FX.hit(run.c, ok);
        run.i++; next();
      });
      if (FX) FX.decorate($('.study-top'), run.c, q); // 🔥 chuỗi đúng liền + trạng thái hoàn hảo trên thanh tiến độ
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
        ${FX ? FX.summary(run.c, run.xp + (perfect ? 15 : 5), pct) : `<p class="muted">+${run.xp + (perfect ? 15 : 5)} XP</p>`}
        ${run.wrong.length ? `<p>${t('Cần ôn lại:')}</p><div class="row center">${run.wrong.map(w => `<a class="chip" href="#/dict/${encodeURIComponent(w.word)}">${esc(w.word)}</a>`).join('')}</div>
          ${run.wrong.some(w => !App.inDeck(w.word)) ? `<p><button class="btn sm" id="addWrong">+ ${t('Đưa các từ sai vào flashcard')}</button></p>` : ''}` : `<p>${t('Không sai câu nào – xuất sắc!')} 🎉</p>`}
        ${unit ? `<div class="feedback ${pct >= 80 ? 'ok' : 'no'}" style="position:static;margin:1rem 0">${pct >= 80 ? '🏁 ' + t('<b>Hoàn thành bài!</b> Các từ đã được thêm vào flashcard để ôn đúng thời điểm vàng.') : '🔁 ' + t('Cần đạt <b>80%</b> để hoàn thành bài – ôn lại các từ sai rồi thử lại nhé.')}</div>` : ''}
        <div class="row center" style="margin-top:1rem">${unit ? `<a class="btn primary" href="#/path">🗺️ ${t('Về lộ trình')}</a><button class="btn" id="again">${t('Làm lại')}</button>` : `<button class="btn primary" id="again">${t('Làm lượt mới')}</button><a class="btn" href="#/practice?src=${encodeURIComponent(src)}">${t('Đổi chế độ')}</a>`}${FX ? FX.shareBtn(pct) : ''}</div>
      </div></div>`;
      if (unitPassed) unitPassed.then(first => { if (first) { confetti(160); Sfx.win(); } });
      practiceDone({ mode: as || mode, src, pct, wait: unitPassed });
      $('#again').onclick = again;
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
      guardExit(() => answered > 0 || introduced.size > 1);
      const st = stage.get(w.word);
      // Lần đầu gặp từ chưa thuộc → giới thiệu từ (hình, âm, nghĩa, ví dụ) trước khi kiểm tra
      if (st === 0 && !introduced.has(w.word) && rank(w) <= 0) {
        introduced.add(w.word);
        // Thẻ giới thiệu từ mới: mọi thông tin cần để hiểu & nhớ trên 1 mặt, sắp theo thứ tự đọc tự nhiên
        // (hình → từ & âm → nghĩa → định nghĩa → ví dụ có dịch → kết hợp từ) – không phải lật, không bỏ sót ví dụ
        const arr = x => [].concat(x || []).filter(Boolean);
        const col = arr(w.col).slice(0, 4), syn = arr(w.syn).slice(0, 4);
        $('#qbox').innerHTML = `<div class="card wi" id="fi">
            <div class="wi-top${picOk(w) ? '' : ' nopic'}">${picOk(w) ? pic(w).replace('class="pic"', 'class="pic wi-pic" aria-hidden="true"') : ''}
              <div class="wi-head"><span class="chip lv">✨ ${t('Từ mới')}</span>
                <div class="wi-word">${esc(w.word)}</div>
                <div class="wi-pron"><span class="ipa">${esc(w.ipa || '')}</span>${posChip(w.pos)}${levelChip(w.level)}
                  <button class="fi-btn sm" id="sayI" aria-label="${t('Nghe')}" title="${t('Nghe')}">🔊</button><button class="fi-btn sm" id="slowI" aria-label="${t('Nghe chậm')}" title="${t('Nghe chậm')}">🐢</button></div>
                <div class="wi-vi vi">${esc(mean(w))}</div><div class="wi-native" data-native></div></div></div>
            ${w.def && w.def !== mean(w) ? `<div class="wi-sec"><span class="wi-lb">📖 ${t('Định nghĩa')}</span><div>${esc(w.def)}</div></div>` : ''}
            ${w.ex ? `<div class="wi-sec wi-ex"><span class="wi-lb">💬 ${t('Ví dụ')}</span><div class="fi-ex">${highlight(w.ex, w.word)} <button class="ctx-say" data-saysent="${esc(w.ex)}" title="${t('Nghe cả câu')}" aria-label="${t('Nghe cả câu')}">🔊</button><button class="ctx-say" data-saysent="${esc(w.ex)}" data-slow="1" title="${t('Nghe chậm')}" aria-label="${t('Nghe chậm')}">🐢</button></div><div class="fi-tr small muted" data-keep-vi id="fiTr"></div></div>` : ''}
            ${col.length || syn.length ? `<div class="wi-sec">${App.chipsHtml(col, '🔗', t('Hay đi với'))}${App.chipsHtml(syn, '≈', t('Đồng nghĩa'))}</div>` : ''}
            ${w.note ? `<div class="wi-sec wi-tip">💡 ${esc(w.note)}</div>` : ''}
            ${App.notesHtml(w.word)}
          </div>
          <div class="learn-bar"><button class="btn primary lg block" id="gotIt">${t('Tiếp tục')}<span class="kbd-hint" aria-hidden="true"> ↵</span></button>
          <div class="center"><button class="linklike" id="known">${t('Mình đã biết từ này')}</button></div></div>`;
        nativeFill($('[data-native]'), w.word);
        const ll = I18N.learnLang();
        if (w.ex && ll !== 'en') {
          const flg = (I18N && I18N.flag ? I18N.flag(ll) : (ll === 'vi' ? '🇻🇳' : '🌐'));
          (ll === 'vi' ? Dict.translateVi(w.ex) : Dict.translateTo(w.ex, ll)).then(tr => { const e = $('#fiTr'); if (e && tr) e.textContent = flg + ' ' + tr; }).catch(() => {});
        }
        $('#sayI').onclick = () => speak(w.word, accent(), w.audio);
        $('#slowI').onclick = () => speak(w.word, accent(), w.audio, true);
        speak(w.word, accent(), w.audio);
        $('#gotIt').focus({ preventScroll: true });
        let went = false;
        $('#gotIt').onclick = () => { if (went) return; went = true; queue.unshift(w); next(); };
        // Đã biết → bỏ khỏi phiên học, lưu thẻ với lịch ôn xa (FSRS: độ ổn định ~30 ngày)
        $('#known').onclick = async () => {
          if (went) return; went = true;
          stage.set(w.word, 3); knownSkip.add(w.word);
          const entry = INDEX[w.word.toLowerCase()] || w;
          if (!App.inDeck(w.word)) await App.addWord(entry, null, { silent: true });
          const now = Date.now();
          await Cards.patch(w.word, c => { c.srs = { ...SRS.newState(), reps: 2, S: 30, D: 3, interval: 30, last: now, due: now + 30 * 864e5, step: 0 }; });
          state.cards = await Cards.all();
          toast('👍 ' + t('Đã đánh dấu “{word}” là từ đã biết – sẽ ôn lại sau ~1 tháng', { word: w.word }));
          next();
        };
        document.onkeydown = e => { if (e.key === 'Enter' && !(e.target.closest && e.target.closest('button:not(#gotIt), a, summary, input, textarea'))) { e.preventDefault(); $('#gotIt').click(); } };
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
      practiceDone({ mode: 'learn', src, items });
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
        Sfx.correct(); haptic(true); sel.classList.add('gone'); b.classList.add('gone'); sel = null; left--;
        if (!left) done();
      } else {
        Sfx.wrong(); haptic(false); misses++; const s = sel; s.classList.remove('sel'); s.classList.add('bad'); b.classList.add('bad');
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
          <div class="row center"><span class="ipa" id="ipaW" style="font-size:1.1rem">${esc(w.ipa) || (w.ipaUS ? '' : `<span class="muted small">${t('đang tra phiên âm…')}</span>`)}</span><button class="icon-btn" id="model" title="${t('Nghe mẫu')}">🔊</button><button class="icon-btn" id="modelSlow" title="${t('Nghe chậm')}">🐢</button></div>
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
      practiceDone({ mode: 'speak', src, pct: Math.round(good / Math.max(1, items.length) * 100) }); // buổi học theo Ngày (path-day.js)
    };
    show();
  }
})();
