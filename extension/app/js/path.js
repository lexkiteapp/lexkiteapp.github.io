/* Lộ trình học kiểu Duolingo: các chặng theo band, mỗi bài = 1 bộ từ với vòng học Giới thiệu → Ghép thẻ → Nghe → Kiểm tra. */
(function () {
  const { $, $$, esc, modal, closeModal, ring } = UI;
  const { SRS } = Core;
  const App = window.App;
  const { state, routes } = App;
  const view = App.view;

  const STAGES = [
    { id: 's0', name: t('Chặng 0 · Từ cốt lõi'), band: 'Band 4.0 – 5.0', color: '#64748b', desc: t('Những từ thông dụng nhất tiếng Anh (NGSL) – nền móng cho người mới'),
      units: ['ngsl1', 'ngsl2', 'ngsl3', 'ngsl4', 'ngsl5'] },
    { id: 's1', name: t('Chặng 1 · Nền tảng'), band: 'Band 5.5 – 6.0', color: '#16a34a', desc: t('Từ vựng chủ đề quen thuộc trong Speaking Part 1–2'),
      units: ['education', 'work', 'health', 'travel', 'society', 'technology', 'food', 'sport'] },
    { id: 's2', name: t('Chặng 2 · Mở rộng chủ đề'), band: 'Band 6.5', color: '#0ea5a4', desc: t('Chủ đề Writing Task 2 hay gặp và từ mô tả biểu đồ'),
      units: ['environment', 'media', 'urban', 'crime', 'culture', 'consumerism', 'task1', 'describe'] },
    { id: 's3', name: t('Chặng 3 · Học thuật'), band: 'Band 7.0', color: '#6d5dfc', desc: t('Từ học thuật AWL, từ nối, cách nêu quan điểm'),
      units: ['awl1', 'awl2', 'linking', 'awl3', 'opinion', 'awl4', 'awl5', 'task2', 'phrasal'] },
    { id: 's4', name: t('Chặng 4 · Tinh hoa'), band: 'Band 7.5+', color: '#c026d3', desc: t('Collocation, thành ngữ và từ học thuật nâng cao'),
      units: ['collocations', 'idioms', 'awl6', 'science', 'awl7', 'government', 'economy', 'awl8', 'energy', 'awl9', 'wildlife', 'awl10', 'architecture', 'space', 'language'] },
  ];
  const STEPS = [
    ['learn', '🧠', t('Học từ mới'), t('Giới thiệu từ → trắc nghiệm → tự gõ lại')],
    ['match', '⚡', t('Ghép thẻ'), t('Củng cố nhanh nghĩa – từ')],
    ['listen', '🎧', t('Nghe & chép'), t('Nhận diện âm và chính tả')],
    ['test', '🏁', t('Kiểm tra bài'), t('Đạt ≥ 80% để mở bài tiếp theo')],
  ];

  const unitsFlat = () => STAGES.flatMap(s => s.units.map(u => ({ stage: s, topic: App.topicOf(u) })).filter(x => x.topic));
  const doneMap = () => (state.game.unitDone || {});
  function learnedPct(t) {
    const n = t.words.filter(w => { const c = state.cards[w.word.toLowerCase()]; return c && c.srs.last; }).length;
    return n / t.words.length;
  }
  function unitState() {
    const list = unitsFlat();
    const done = doneMap();
    let currentFound = false;
    return list.map((u, i) => {
      const isDone = !!done[u.topic.id];
      // Mở khóa nếu bài trước đã xong, hoặc đã học ≥ 80% từ của bài này
      const prevDone = i === 0 || !!done[list[i - 1].topic.id];
      const unlocked = isDone || prevDone || learnedPct(u.topic) >= 0.8;
      let status = isDone ? 'done' : unlocked ? 'open' : 'locked';
      if (status === 'open' && !currentFound) { status = 'current'; currentFound = true; }
      return { ...u, i, status, pct: learnedPct(u.topic), score: done[u.topic.id] };
    });
  }
  App.pathCurrent = () => unitState().find(u => u.status === 'current');

  routes.path = function () {
    const us = unitState();
    const doneN = us.filter(u => u.status === 'done').length;
    let idx = 0;
    view.innerHTML = `
      <div class="page-head"><div><h1>${t('Lộ trình chinh phục IELTS')}</h1><p class="muted">${t('{done}/{total} bài hoàn thành · Học theo vòng: giới thiệu → luyện → nghe → kiểm tra, rồi ôn lại đúng thời điểm vàng.', { done: doneN, total: us.length })}</p></div>
        <div class="row">${ring(doneN / us.length * 100, `${Math.round(doneN / us.length * 100)}%`, 'var(--good)')}</div></div>
      <div class="path">
        ${STAGES.map(st => {
          const su = us.filter(u => u.stage.id === st.id);
          const sd = su.filter(u => u.status === 'done').length;
          return `<div class="stage-banner" style="--sc:${st.color}">
              <div><div class="tiny" style="opacity:.85;font-weight:700;letter-spacing:.05em;text-transform:uppercase">${st.band}</div><h2 style="margin:.1rem 0;color:#fff">${st.name}</h2><div class="small" style="opacity:.9">${st.desc}</div></div>
              <div class="stage-count">${sd}/${su.length}</div></div>
            <div class="nodes">${su.map(u => {
              const off = Math.round(Math.sin(idx++ * 0.9) * 90);
              const p = Math.round(u.pct * 100);
              return `<div class="node-wrap" style="transform:translateX(${off}px)">
                ${u.status === 'current' ? `<div class="node-tip">${t('BẮT ĐẦU')}</div>` : ''}
                <button class="node ${u.status}" data-unit="${u.topic.id}" style="--sc:${st.color};--p:${p}" title="${esc(u.topic.name)}">
                  <span>${u.status === 'locked' ? '🔒' : u.status === 'done' ? '⭐' : u.topic.emoji}</span></button>
                <div class="node-label">${esc(u.topic.name)}</div>
              </div>`;
            }).join('')}</div>`;
        }).join('')}
      </div>`;
    $$('[data-unit]').forEach(b => b.onclick = () => openUnit(b.dataset.unit));
    const cur = $('.node.current');
    if (cur) setTimeout(() => cur.scrollIntoView({ behavior: 'smooth', block: 'center' }), 150);
  };

  function openUnit(id) {
    const u = unitState().find(x => x.topic.id === id);
    if (!u) return;
    if (u.status === 'locked') {
      modal(`<div class="celebrate"><div class="em">🔒</div><h2>${t('Bài này đang khóa')}</h2><p class="muted">${t('Hoàn thành bài trước (kiểm tra đạt ≥ 80%) hoặc học ≥ 80% số từ của bài này để mở khóa.')}</p>
        <div class="row center"><a class="btn" href="#/topic/${id}" data-close>${t('Xem trước bộ từ')}</a><button class="btn primary" data-close>${t('Đã hiểu')}</button></div></div>`);
      return;
    }
    const src = `topic:${id}`;
    const tp = u.topic;
    modal(`<div class="row nowrap" style="gap:1rem"><div style="font-size:2.6rem;width:70px;height:70px;border-radius:20px;display:grid;place-items:center;background:var(--surface-2)">${tp.emoji}</div>
        <div><div class="tiny muted" style="font-weight:700">${esc(u.stage.name)}</div><h2 style="margin:0">${esc(tp.name)}</h2><div class="small muted">${t('{n} từ · đã học {pct}%', { n: tp.words.length, pct: Math.round(u.pct * 100) })}${u.score ? ' · ' + t('điểm kiểm tra {score}%', { score: u.score }) : ''}</div></div></div>
      <div class="stack" style="margin-top:1.2rem">
        ${STEPS.map(([m, em, name, d], i) => `<a class="card hover row nowrap" href="#/practice/${m}?src=${encodeURIComponent(src)}${m === 'test' ? `&unit=${id}` : ''}" data-close style="color:var(--text);padding:.9rem 1rem">
          <span style="font-size:1.5rem;width:44px;height:44px;border-radius:12px;display:grid;place-items:center;background:var(--surface-2)">${em}</span>
          <div class="grow"><b>${i + 1}. ${name}</b><div class="small muted">${d}</div></div><span class="muted">→</span></a>`).join('')}
      </div>
      <div class="row between" style="margin-top:1rem"><a class="btn sm ghost" href="#/topic/${id}" data-close>📚 ${t('Xem danh sách từ')}</a><button class="btn sm" data-close>${t('Đóng')}</button></div>`);
  }

  // Ghi nhận hoàn thành bài (gọi từ bài kiểm tra)
  App.completeUnit = async (id, pct) => {
    let prev = 0;
    state.game = await Game.mutate(g => {
      prev = (g.unitDone || {})[id] || 0;
      if (pct >= 80 || prev) g.unitDone = { ...(g.unitDone || {}), [id]: Math.max(prev, pct) };
    });
    if (pct < 80 && !prev) return false;
    if (!prev && pct >= 80) {
      // Thêm từ của bài vào flashcard để hệ thống nhắc ôn đúng thời điểm vàng
      const t = App.topicOf(id);
      if (t) for (const w of t.words) if (!App.inDeck(w.word)) await App.addWord(w, null, { silent: true });
      return true;
    }
    return false;
  };
})();
