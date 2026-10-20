/* 📅 Lộ trình theo NGÀY kiểu Duolingo (tải lười – gói 'pathx'): Chặng CEFR → Bài (bộ từ) → Ngày 1, 2, 3…
 * Mỗi Ngày = 1 buổi 5–10 phút trộn nhiều dạng bài có sẵn, DỄ → KHÓ trong buổi: (ôn nhanh từ đến hạn) → học 6–8 từ mới (nhận diện)
 * → ghép thẻ → trắc nghiệm / nghe & chép → điền từ vào câu (dùng trong ngữ cảnh) → phần thưởng cuối: nói / ngữ pháp nhanh /
 * hội thoại ngắn / collocation – cấu trúc học thuật (chặng cao) → ngày cuối của bài: kiểm tra cuối bài (≥ 80% mở bài sau).
 * Tiến độ cũ không mất: ngày được tính xong nếu bài đã qua (unitDone), đã ghi trong 'pathDays', hoặc mọi từ của ngày đã học (srs.last). */
(function (g) {
  const { $, $$, esc, modal, ring } = UI;
  const App = g.App, { state } = App;
  const P = () => App.PathAPI;
  const ls = (k, v) => { try { if (v === undefined) return localStorage.getItem('vb.' + k); if (v === null) localStorage.removeItem('vb.' + k); else localStorage.setItem('vb.' + k, v); } catch (e) { return null; } };
  let REC = null; // { [dayId]: { s: ['learn', …], done: ts } }
  const load = () => REC ? Promise.resolve(REC) : Core.Store.get('pathDays', {}).then(v => (REC = v || {})).catch(() => (REC = {}));
  const save = () => Core.Store.set('pathDays', REC).catch(() => {});
  const learned = w => { const c = state.cards[w.word.toLowerCase()]; return !!(c && c.srs && c.srs.last); };
  const today = () => (state.game.days || {})[Core.todayKey()] || {};

  // ---------- Danh sách ngày (thứ tự toàn lộ trình) + trạng thái ----------
  // Gói học (tracks.js): mỗi gói có chặng riêng; khóa bản ghi "gói:bộ~N" (gói nhận tiến độ cũ giữ khóa "bộ~N")
  const TK = () => g.Tracks;
  function days(tr) {
    tr = tr || TK().cur();
    const sid = TK().start(tr), us = P().unitState(tr.id === 'ielts' ? null : tr.stages, sid), out = [], leg = TK().isLegacy(tr), old = TK().readsOld(tr);
    for (const u of us) {
      const n = App.dayN(u.topic.id);
      for (let j = 1; j <= n; j++) {
        const id = u.topic.id + '~' + j, tp = App.topicOf(id); if (!tp) continue;
        const key = TK().key(tr, id), r = REC[key] || (old && REC[id]) || {};
        out.push({ n: out.length + 1, id, key, tr, j, of: n, unit: u, topic: tp, rec: r, done: u.status === 'done' || !!r.done || (leg && !REC[key] && tp.words.every(learned)) }); // tiến độ cũ: đã học hết từ của ngày (chưa có bản ghi ngày)
      }
    }
    // Kiểm tra đầu vào / trình độ chọn → ngày bắt đầu = ngày đầu của chặng gợi ý; ngày trước đó "đã nhảy qua" (vẫn mở để học lại)
    const st = sid ? out.findIndex(d => d.unit.stage.id === sid) : 0, start = Math.max(0, st);
    const cur = out.find(d => !d.done && d.n - 1 >= start) || out.find(d => !d.done);
    for (const d of out) d.status = d.done ? 'done' : d === cur ? 'current' : cur && d.n < cur.n ? 'skip' : 'locked';
    return out;
  }

  // ---------- Các hoạt động của 1 ngày: dễ → khó, đổi theo trình độ chặng ----------
  function plan(d) {
    const tr = d.tr || TK().cur(), tier = TK().tierOf(tr, d.unit.stage), src = encodeURIComponent('topic:' + d.id), lis = tr.id === 'ielts' || tr.id === 'comm';
    const S = (k, em, name, sub, mins, extra) => ({ k, em, name, sub, mins, href: `#/practice/${k}?src=${src}`, mode: k, ...extra });
    const X = (k, em, name, sub, mins, href, c) => ({ k, em, name, sub, mins, href, ext: c, tap: !c }); // tap: trang không cộng điểm → xong khi mở
    const ST = P().STEPS(), sub = k => (ST.find(x => x[0] === k) || [])[3];
    const out = [];
    const due = Core.Cards.dueCount(state.cards, state.settings, state.stats).total;
    if (d.n > 1 && (due >= 3 || (d.rec.s || []).includes('review'))) out.push({ ...S('review', '🔁', t('Ôn nhanh từ cũ'), t('Lặp lại ngắt quãng – ưu tiên số 1'), 1), href: '#/practice/mcq?src=due', mode: 'mcq', src: 'due' });
    out.push(S('learn', '🧠', t('Học từ mới'), sub('learn'), 3));
    out.push(S('match', '⚡', t('Ghép thẻ'), sub('match'), 1));
    const early = tier === 0 && d.n <= 3; // 3 ngày đầu cho người mới: chỉ nhận diện (thắng sớm), chưa bắt gõ/nghe chép
    if (early) out.push(S('mcq', '🧩', t('Trắc nghiệm'), t('Chọn nghĩa đúng của từ vừa học'), 1));
    else {
      if (lis && tier < 2) out.push(S('listen', '🎧', t('Nghe & chép'), sub('listen'), 2));
      out.push(S('cloze', '✍️', t('Điền từ vào câu'), t('Dùng từ trong câu'), 2));
      if (lis && tier === 2) out.push(S('listen', '🎧', t('Nghe & chép'), sub('listen'), 2));
    }
    // Phần cuối buổi = kỹ năng riêng của gói (hội thoại, dạng câu đề thi, email…); ngày cuối bài: kiểm tra cuối bài thay thế → buổi vẫn ≤ 10 phút
    const last = d.j === d.of && d.unit.status !== 'done';
    if (!last) out.push(...TK().skill(tr, d, tier, X));
    if (last) out.push({ ...S('test', '🏁', t('Kiểm tra bài'), sub('test'), 3), href: P().stepHref(d.unit.topic.id, 'test'), src: 'topic:' + d.unit.topic.id });
    for (const s of out) s.ok = s.k === 'test' ? d.unit.status === 'done' : d.done || (d.rec.s || []).includes(s.k);
    return out;
  }
  const minsOf = st => st.filter(s => !s.ok).reduce((a, s) => a + s.mins, 0) || st.reduce((a, s) => a + s.mins, 0);

  // Bước ngoài bộ luyện từ (ngữ pháp, hội thoại, cách dùng từ): xong khi bộ đếm hôm nay tăng sau lúc bấm mở (không tính lúc mở)
  function settleExt() {
    let x = null; try { x = JSON.parse(ls('dayExt') || 'null'); } catch (e) { /* hỏng → bỏ */ }
    if (!x || x.day !== Core.todayKey() || (today()[x.c] || 0) <= x.base) return false;
    ls('dayExt', null); return mark(x.id, x.k);
  }
  function mark(id, k) {
    const r = REC[id] = REC[id] || {}; r.s = r.s || []; // id = khóa ngày theo gói (d.key)
    if (!r.s.includes(k)) r.s.push(k);
    save(); return true;
  }
  // Mọi hoạt động xong → ngày xong (+15 XP thưởng, 1 lần)
  async function finishIf(d) {
    const st = plan(d);
    // chỉ tính các bước làm thật trong buổi (bản ghi), không thưởng lại cho ngày cũ được tính xong từ tiến độ trước đây
    if (d.rec.done || !(d.rec.s || []).length || !st.every(s => s.k === 'test' ? s.ok : (d.rec.s || []).includes(s.k))) return false;
    REC[d.key] = { ...d.rec, ...REC[d.key], done: Date.now() }; await save();
    ls('daySess', null);
    try { await App.reward({ xp: 15 }); } catch (e) { /* bỏ qua */ }
    return true;
  }
  const find = id => id && days().find(d => d.id === id);

  function css() {
    if (document.getElementById('pdCss')) return;
    const s = document.createElement('style'); s.id = 'pdCss';
    s.textContent = `.dp-unit{margin:1.2rem auto .4rem;max-width:520px;display:flex;flex-wrap:wrap;align-items:center;gap:.4rem .6rem}.dp-unit h3{margin:0;font-size:1rem;flex:1;min-width:0}
.dp-unit .progress{width:84px;flex:none}.dp-stage>summary{list-style:none}.dp-stage>summary::-webkit-details-marker{display:none}.dp-unit .btn{min-height:40px}
.node.skip span{background:var(--surface-2)}.node .dn{font-weight:800;font-size:1.15rem;color:var(--text)}.node.current .dn{color:#fff}.node.done .dn{color:#5b3a00}
.day-bar{display:flex;align-items:center;gap:.6rem;padding:.45rem .8rem;margin:0 0 .8rem;border-radius:999px;background:var(--surface-2);color:var(--text);text-decoration:none;font-weight:700;font-size:.9rem;min-height:44px}
.day-bar .progress{flex:1;height:8px}.day-steps{list-style:none;margin:1rem 0;padding:0;display:grid;gap:.5rem}
.day-steps a{display:flex;gap:.7rem;align-items:center;min-height:56px;padding:.6rem .8rem;border:1px solid var(--line);border-radius:14px;color:var(--text);text-decoration:none;background:var(--surface)}
.day-steps a.ok{border-color:var(--good)}.day-steps a.next{border:2px solid var(--primary);box-shadow:0 3px 0 color-mix(in srgb,var(--primary) 40%,transparent)}
.day-steps .ds-em{font-size:1.5rem;width:2rem;text-align:center;flex:none}.day-steps .ds-min{margin-left:auto;font-size:.8rem;color:var(--muted);flex:none}
.day-hero{display:flex;gap:1rem;align-items:center}.day-hero .dh-n{flex:none;width:72px;height:72px;border-radius:22px;display:grid;place-items:center;color:#fff;font-weight:800;font-size:1.6rem;background:var(--sc,var(--primary))}
@media (prefers-reduced-motion:reduce){.node.current{animation:none}}`;
    document.head.appendChild(s);
  }

  // ---------- Bản đồ: chặng (gập/mở) → bài (tiến độ x/y ngày) → nút Ngày ----------
  async function map() {
    await load(); const tr = TK().cur(); await TK().ready(tr); settleExt(); css();
    const view = App.view, ds = days();
    if (!ds.length) { view.innerHTML = `<div class="card empty"><div class="em" aria-hidden="true">🗺️</div><h2>${t('Không tải được – thử lại sau')}</h2><button class="btn primary" id="pathRetry">${t('Thử lại')}</button></div>`; $('#pathRetry').onclick = () => App.need('words').then(map).catch(() => {}); return; }
    const ielts = tr.id === 'ielts', cur = ds.find(d => d.status === 'current'), nDone = ds.filter(d => d.done).length;
    const curSt = cur ? cur.unit.stage.id : 's0';
    view.innerHTML = `<div class="page-head"><div><h1>${ielts ? t('Lộ trình chinh phục IELTS') : tr.em + ' ' + esc(tr.name)}</h1><p class="muted">${t('Đã xong {a}/{b} ngày · mỗi ngày 5–10 phút, dễ trước khó sau.', { a: nDone, b: ds.length })}</p></div>
      <div class="row">${ring(nDone / ds.length * 100, `${Math.round(nDone / ds.length * 100)}%`, 'var(--good)')}</div></div>${TK().switcher('path')}
      ${cur ? `<a class="btn primary lg block path-cta" href="#/day/${cur.n}">${(cur.rec.s || []).length ? t('Tiếp tục Ngày {n}', { n: cur.n }) : t('Bắt đầu Ngày {n}', { n: cur.n })} · ${esc(cur.unit.topic.name)} →</a>` : `<p class="center">🏆 ${t('Bạn đã hoàn thành toàn bộ lộ trình!')}</p>`}
      <div class="path">${tr.stages.map(st => {
        const sd = ds.filter(d => d.unit.stage.id === st.id), k = sd.filter(d => d.done).length;
        return `<details class="dp-stage" data-st="${st.id}"${st.id === curSt ? ' open' : ''}><summary class="stage-banner" style="--sc:${st.color};cursor:pointer">
          <div><div class="tiny stage-lv">${ielts ? `${st.cefr} · ${st.band}` : `CEFR ${st.cefr}`}</div><h2 style="margin:.1rem 0;color:#fff">${st.name}</h2><div class="small" style="opacity:.92">${st.desc}</div><div class="small stage-cando">🎯 ${st.cando}</div>${st.id === 's0' || st.id === 'comm1' ? `<a class="chip stage-rp" href="#/roleplay">🎭 ${t('Luyện nói: tình huống hằng ngày')}</a>` : ''}</div>
          <div class="stage-count">${k}/${sd.length}</div></summary><div class="dp-body"></div></details>`;
      }).join('')}</div>`;
    const fill = el => {
      const body = el.querySelector('.dp-body'); if (body.childElementCount) return;
      const st = tr.stages.find(s => s.id === el.dataset.st), sd = ds.filter(d => d.unit.stage.id === st.id);
      const units = [...new Set(sd.map(d => d.unit))];
      let idx = 0;
      body.innerHTML = units.map(u => {
        const ud = sd.filter(d => d.unit === u), k = ud.filter(d => d.done).length;
        const testOut = u.status !== 'done' && ud.some(d => d.status === 'locked');
        return `<div class="dp-unit"><span aria-hidden="true">${u.topic.emoji}</span><h3>${esc(u.topic.name)} <span class="small muted">· ${t('{a}/{b} ngày', { a: k, b: ud.length })}</span></h3>
          <div class="progress thin" aria-hidden="true"><i style="width:${k / ud.length * 100}%"></i></div>${testOut ? `<a class="btn sm ghost" href="${P().stepHref(u.topic.id, 'test')}" title="${esc(t('Đã biết các từ này? Đạt ≥ 80% ở bài kiểm tra cuối bài là qua cả bài.'))}">⏩ ${t('Kiểm tra vượt')}</a>` : ''}</div>
          <div class="nodes">${ud.map(d => {
            const off = Math.round(Math.sin(idx++ * 0.9) * 80);
            const s = { done: t('Đã hoàn thành'), current: t('Hôm nay'), skip: t('Đã nhảy qua'), locked: t('Đang khóa') }[d.status];
            return `<div class="node-wrap${d.status === 'current' ? ' cur' : ''}" style="transform:translateX(${off}px)">${d.status === 'current' ? `<div class="node-tip" aria-hidden="true">${t('Hôm nay')}</div>` : ''}
              <button class="node ${d.status === 'skip' ? 'open skip' : d.status}" data-day="${d.n}" style="--sc:${st.color};--p:${d.done ? 100 : Math.round(d.topic.words.filter(learned).length / d.topic.words.length * 100)}" aria-label="${esc(t('Ngày {n}', { n: d.n }) + ' · ' + u.topic.name + ' – ' + s)}"${d.status === 'current' ? ' aria-current="step"' : ''}>
              <span aria-hidden="true">${d.status === 'locked' ? '🔒' : d.done ? '⭐' : `<b class="dn">${d.n}</b>`}</span></button>
              <div class="node-label" aria-hidden="true">${t('Ngày {n}', { n: d.n })}</div></div>`;
          }).join('')}</div>`;
      }).join('');
      $$('[data-day]', body).forEach(b => b.onclick = () => open(+b.dataset.day));
    };
    $$('.dp-stage').forEach(el => { if (el.open) fill(el); el.addEventListener('toggle', () => el.open && fill(el)); });
    $$('.stage-rp').forEach(a => a.addEventListener('click', e => e.stopPropagation()));
    const cn = $('.node.current');
    if (cn && !location.hash.includes('?')) setTimeout(() => cn.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' }), 150);
  }

  function open(n) {
    const d = days()[n - 1]; if (!d) return;
    if (d.status !== 'locked') { location.hash = '#/day/' + n; return; }
    modal(`<div class="celebrate"><div class="em" aria-hidden="true">🔒</div><h2>${t('Ngày {n}', { n })} · ${t('Đang khóa')}</h2><p class="muted">${t('Hoàn thành ngày trước để mở. Đã biết các từ này? Đạt ≥ 80% ở bài kiểm tra cuối bài là qua cả bài.')}</p>
      <div class="row center"><a class="btn" href="${P().stepHref(d.unit.topic.id, 'test')}" data-close>⏩ ${t('Kiểm tra vượt')}</a><button class="btn primary" data-close>${t('Đã hiểu')}</button></div></div>`);
  }

  // ---------- Trang buổi học #/day/N ----------
  async function page(arg) {
    await load(); await TK().ready(TK().cur()); settleExt(); css();
    const view = App.view, ds = days();
    const d = ds[(+arg || (ds.find(x => x.status === 'current') || ds[0] || {}).n) - 1];
    if (!d) { location.hash = '#/path'; return; }
    if (d.status === 'locked') { location.hash = '#/path'; setTimeout(() => open(d.n), 300); return; }
    await finishIf(d);
    const st = plan(d), okN = st.filter(s => s.ok).length, nx = st.find(s => !s.ok), stage = d.unit.stage;
    view.innerHTML = `<div class="page-head"><div class="day-hero" style="--sc:${stage.color}"><div class="dh-n" aria-hidden="true">${d.n}</div>
        <div><div class="tiny muted" style="font-weight:700">${d.tr.em} ${esc(d.tr.name)} · ${esc(stage.name)}${stage.band === '' ? '' : ' · CEFR ' + stage.cefr}</div><h1 style="margin:.1rem 0">${t('Ngày {n}', { n: d.n })}: ${esc(d.unit.topic.name)}</h1>
        <div class="small muted">${t('Hôm nay học {n} từ mới · ≈ {m} phút', { n: d.topic.words.length, m: minsOf(st) })}</div></div></div></div>
      <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="${st.length}" aria-valuenow="${okN}" aria-label="${esc(t('{a}/{b} hoạt động', { a: okN, b: st.length }))}"><i style="width:${okN / st.length * 100}%"></i></div>
      <p class="small muted" style="margin:.4rem 0 0">${t('{a}/{b} hoạt động', { a: okN, b: st.length })} · ${t('Dễ trước, khó sau: nhận diện → ghép → nghe → dùng trong câu → nói.')}</p>
      ${nx ? `<a class="btn primary lg block" style="margin-top:1rem" href="${nx.href}" data-step="${nx.k}">${okN ? t('Tiếp tục Ngày {n}', { n: d.n }) : t('Bắt đầu Ngày {n}', { n: d.n })}: ${esc(nx.name)} →</a>`
        : `<div class="card center" role="status" style="margin-top:1rem"><div style="font-size:2rem" aria-hidden="true">🎉</div><h2 style="margin:.3rem 0">${t('Hoàn thành Ngày {n}!', { n: d.n })}</h2>${ds[d.n] && ds[d.n].status !== 'locked' ? `<a class="btn primary" href="#/day/${d.n + 1}">${t('Học tiếp Ngày {n}', { n: d.n + 1 })} →</a>` : ''}</div>`}
      <ol class="day-steps">${st.map((s, i) => `<li><a class="${s.ok ? 'ok' : ''}${s === nx ? ' next' : ''}" href="${s.href}" data-step="${s.k}"${s === nx ? ' aria-current="step"' : ''}>
        <span class="ds-em" aria-hidden="true">${s.ok ? '✅' : s.em}</span><span class="grow"><b>${i + 1}. ${esc(s.name)}</b><span class="small muted" style="display:block">${esc(s.sub || '')}</span></span>
        ${s.ok ? `<span class="sr-only">${t('Đã hoàn thành')}</span>` : `<span class="ds-min">${t('{m} phút', { m: s.mins })}</span>`}</a></li>`).join('')}</ol>
      <div class="row between"><a class="btn sm ghost" href="#/path">🗺️ ${t('Lộ trình từ vựng')}</a><a class="btn sm ghost" href="#/topic/${encodeURIComponent(d.unit.topic.id)}">📚 ${t('Xem danh sách từ')}</a></div>`;
    $$('[data-step]', view).forEach(a => a.addEventListener('click', () => {
      ls('daySess', d.id);
      const s = st.find(x => x.k === a.dataset.step);
      if (s && s.tap && !s.ok) { mark(d.key, s.k); finishIf(find(d.id)); }
      else if (s && s.ext) ls('dayExt', JSON.stringify({ id: d.key, k: s.k, c: s.ext, base: today()[s.ext] || 0, day: Core.todayKey() }));
    }));
  }

  // ---------- Thanh tiến độ buổi học trên trang bài tập ----------
  async function bar() {
    await load(); await TK().ready(TK().cur());
    if (settleExt()) { const d0 = find(ls('daySess')); if (d0) await finishIf(d0); }
    const d = find(ls('daySess')); if (!d || d.done) { ls('daySess', null); return; }
    const view = App.view; if (view.querySelector('.day-bar')) return;
    const st = plan(d), okN = st.filter(s => s.ok).length;
    view.insertAdjacentHTML('afterbegin', `<a class="day-bar" href="#/day/${d.n}"><span>📅 ${t('Ngày {n}', { n: d.n })}</span><span class="progress" aria-hidden="true"><i style="width:${okN / st.length * 100}%"></i></span><span>${okN}/${st.length}</span><span class="sr-only">${t('{a}/{b} hoạt động', { a: okN, b: st.length })}</span><span aria-hidden="true">›</span></a>`);
    css();
  }

  // ---------- Xong 1 lượt luyện (study.js → 'lexkite:practice-done') ----------
  async function done(det) {
    await load();
    const m = /^topic:(.+)$/.exec(det.src || ''), sid = m ? m[1] : '';
    let d = sid.includes('~') ? find(sid) : find(ls('daySess'));
    const st = d && plan(d), s = st && st.find(x => x.mode === det.mode && (x.src ? x.src === det.src : sid === d.id));
    if (!s) { // không thuộc buổi học theo ngày → màn thưởng theo bài như cũ
      if (m && !sid.includes('~') && P().STAGES.some(x => x.units.includes(sid))) return PathReward.done(det, sid, P());
      return;
    }
    if (det.mode === 'learn' && det.items) { // từ vừa học vào flashcard + đánh dấu đã gặp (như path-reward.js)
      const now = Date.now(), IX = (g.IELTS_DATA || {}).INDEX || {};
      for (const w of det.items) {
        if (!App.inDeck(w.word)) await App.addWord(IX[w.word.toLowerCase()] || w, null, { silent: true });
        await Core.Cards.patch(w.word, c => { if (c.srs && !c.srs.last) c.srs = { ...c.srs, last: now, due: now + 6e5 }; }).catch(() => {});
      }
      state.cards = await Core.Cards.all();
    }
    if (det.wait) await det.wait.catch(() => {});
    if (s.k !== 'test') mark(d.key, s.k);
    d = find(d.id); const fin = await finishIf(d);
    const st2 = plan(d), nx = st2.find(x => !x.ok), ds = days(), next = ds[d.n];
    PathReward.show({ unit: { topic: { name: t('Ngày {n}', { n: d.n }) + ': ' + d.unit.topic.name, emoji: '📅' } },
      steps: st2.map(x => ({ m: x.k, em: x.em, name: x.name, ok: x.ok, href: x.href })),
      next: nx ? { name: nx.name, href: nx.href, same: 1 } : fin || d.rec.done ? next && { name: t('Ngày {n}', { n: next.n }) + ' · ' + next.unit.topic.name, emoji: '📅', href: '#/day/' + next.n } : null,
      title: fin ? '🎉 ' + t('Hoàn thành Ngày {n}!', { n: d.n }) : '' });
    // Nút bước kế tiếp trong buổi: giữ phiên + bộ đếm cho bước ngoài bộ luyện
    const cta = App.view.querySelector('.path-reward .btn.primary');
    if (cta && nx) cta.addEventListener('click', () => { ls('daySess', d.id); if (nx.tap) mark(d.key, nx.k); else if (nx.ext) ls('dayExt', JSON.stringify({ id: d.key, k: nx.k, c: nx.ext, base: today()[nx.ext] || 0, day: Core.todayKey() })); });
  }

  // ---------- Kế hoạch hôm nay: "Ngày N" là việc chính (plan.js) ----------
  async function todayTask() {
    await load(); const tr = TK().cur(); await TK().ready(tr); settleExt();
    const ds = days(), k = Core.todayKey();
    const doneToday = ds.filter(d => d.rec.done && Core.todayKey(new Date(d.rec.done)) === k).pop();
    const cur = ds.find(d => d.status === 'current');
    const d = doneToday && (!cur || !(cur.rec.s || []).length) ? doneToday : cur; if (!d) return null;
    const st = plan(d), okN = st.filter(s => s.ok).length;
    return { em: tr.em, day: d.n, track: tr.name, sw: TK().switcher('home'), started: okN > 0, t: t('Ngày {n}', { n: d.n }) + ': ' + d.unit.topic.name, sub: `${tr.name} · ${d.unit.stage.name} · ${t('{a}/{b} hoạt động', { a: okN, b: st.length })}`, href: '#/day/' + d.n, mins: minsOf(st), done: d.done, unit: d.unit };
  }

  g.DayPath = { days: () => load().then(() => days()), daysOf: tr => load().then(() => days(tr)), plan, map, page, bar, done, todayTask, tracks: (...a) => TK().page(...a) };
})(self);
