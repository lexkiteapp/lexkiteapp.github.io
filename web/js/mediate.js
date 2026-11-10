/* 🤝 Trung gian (#/mediate, O3 – docs/specs/mediation.md §2, mẫu Stitch 390 sáng/tối đã duyệt 10/11):
 * đọc/nghe một nguồn tiếng Anh → chuyển ý cho MỘT người cụ thể (viết hoặc nói) → tự kiểm ý đạt/thiếu, ý thừa, chép nguyên văn → bài mẫu + mẹo.
 * Dữ liệu: cpack/mediation/index.js (danh sách) + cpack/mediation/<id>.js (tải khi mở bài) – sinh từ content/mediation bằng scripts/mediation/build.mjs.
 * Chấm: js/mediate-core.js (MỘT nguồn với cổng mediation-check). Không CSS riêng: card/chip/btn/learn-bar/khung FOCUS (ExitGuard) có sẵn.
 * B2 trở lên + nguồn đọc được: "Nghe trước" – chữ ẩn tới khi nghe xong hoặc bấm Hiện chữ (luyện cả nghe). Giọng Kokoro dựng sẵn (nhóm mediation-source). */
(function () {
  const { $, esc, toast } = UI;
  const App = window.App, { state, routes } = App, view = App.view, MC = window.MediateCore;
  const LEVELS = ['A2', 'B1', 'B2', 'C1', 'C2'], LISTEN_FIRST = ['B2', 'C1', 'C2'];
  const ACT = () => ({ relay: t('Chuyển lời nhắn'), summarise: t('Tóm tắt'), 'explain-data': t('Giải thích số liệu'), simplify: t('Nói cho dễ hiểu'), notes: t('Ghi chú'), facilitate: t('Điều phối trao đổi') });
  const KIND = () => ({ announcement: ['megaphone', t('Thông báo')], text: ['file-text', t('Bài đọc')], email: ['mail', 'Email'], notice: ['pin', t('Bảng tin')], talk: ['mic', t('Bài nói')], dialogue: ['message-circle', t('Hội thoại')], chart: ['chart-column', t('Biểu đồ')] });
  const list = () => self.MEDIATION_INDEX || [];
  const best = () => { const g = state.game || (state.game = {}); return (g.medBest = g.medBest || {}); };
  const DKEY = id => 'lk.medDraft.' + id;
  const draft = { get: id => { try { return localStorage.getItem(DKEY(id)) || ''; } catch (e) { return ''; } }, set: (id, s) => { try { s ? localStorage.setItem(DKEY(id), s) : localStorage.removeItem(DKEY(id)); } catch (e) { /* riêng tư */ } } };
  const head = (title, sub) => `<div class="page-head"><div><h1>${title}</h1>${sub ? `<p class="muted">${sub}</p>` : ''}</div></div>`;

  routes.mediate = function (id) {
    if (id && list().some(x => x.id === id)) return open(id);
    const b = best();
    view.innerHTML = head(UI.icon('users') + ' ' + t('Trung gian'), t('Đọc hoặc nghe một nguồn tiếng Anh rồi chuyển ý cho một người cụ thể: giữ điều họ cần, bỏ điều họ không cần.'))
      + LEVELS.map(l => { const xs = list().filter(x => x.level === l); return xs.length ? `<h2 style="margin-top:1.2rem">${l}</h2><div class="grid auto">${xs.map(x => {
        const [ic] = KIND()[x.kind] || ['file-text'], s = b[x.id];
        return `<a class="card hover" href="#/mediate/${x.id}"><div class="row" style="gap:.4rem;flex-wrap:wrap"><span class="chip lv">${l}</span><span class="chip">${UI.icon(ic)} ${esc(ACT()[x.activity] || '')}</span><span class="chip">${UI.icon(x.mode === 'speak' ? 'mic' : 'pen-line')} ${x.mode === 'speak' ? t('Nói') : t('Viết')}</span></div>
          <b style="display:block;margin-top:.5rem">${esc(x.title)}</b>${s ? `<small class="muted">${UI.icon('circle-check')} ${t('{a}/{b} ý chính', { a: s.ok, b: s.of })}</small>` : ''}</a>`; }).join('')}</div>` : ''; }).join('');
  };

  // ---------- Một bài ----------
  async function open(id) {
    view.innerHTML = `<div class="card"><p class="muted">${t('Đang tải…')}</p></div>`;
    try { if (!(self.MEDIATION || {})[id]) await App.loadScript((list().find(x => x.id === id) || {}).src); } catch (e) { /* báo dưới */ }
    const X = (self.MEDIATION || {})[id];
    if (!X) { view.innerHTML = `<div class="card"><p>${t('Không tải được bài – thử lại sau')}</p><a class="btn" href="#/mediate">${t('Danh sách bài')}</a></div>`; return; }
    render(X);
  }

  function sourceHtml(S) {
    if (S.kind === 'chart') return `<p class="small muted" style="margin:.2rem 0 .5rem">${esc(S.caption || '')}</p><div style="overflow-x:auto"><table class="gtable"><thead><tr><th></th>${(S.cols || []).map(c => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${(S.rows || []).map(r => `<tr><th scope="row" style="text-align:left">${esc(r[0])}</th>${r.slice(1).map(v => `<td>${esc(v)}${S.unit === '%' ? '%' : ''}</td>`).join('')}</tr>`).join('')}</tbody></table></div>${S.note ? `<p class="tiny muted">${esc(S.note)}</p>` : ''}`;
    if (S.kind === 'dialogue') return (S.lines || []).map(l => `<p style="margin:.35rem 0"><b>${esc(l.s)}:</b> ${esc(l.t)}</p>`).join('');
    return (Array.isArray(S.text) ? S.text : [S.text]).map(p => `<p style="margin:.35rem 0;line-height:1.55">${esc(p)}</p>`).join('');
  }
  // Phát nguồn bằng giọng Kokoro dựng sẵn (MediateCore.voices – cùng giọng corpus mediation-source); hội thoại đọc từng lượt theo giọng người nói
  function play(S, onEnd) {
    const V = MC.voices(S);
    if (S.kind !== 'dialogue') return UI.tts(MC.sourceText(S), 'en-GB', 0.95, { voice: V._narrator, onEnd });
    const L = S.lines || [], step = i => (i < L.length ? UI.tts(L[i].t, 'en-GB', 0.95, { voice: V[L[i].s], onEnd: () => step(i + 1) }) : onEnd && onEnd());
    step(0);
  }

  function render(X) {
    const S = X.source, T = X.task, K = KIND()[S.kind] || ['file-text', ''], speak = T.mode === 'speak';
    const hideText = LISTEN_FIRST.includes(X.level) && S.kind !== 'chart';
    const teacher = window.Chars && Chars.slot ? Chars.slot('ama', { pose: 'explain', size: 's', alt: '' }) : '';
    const range = T.max_words ? `${T.min_words}–${T.max_words}` : `${T.min_words}+`;
    view.innerHTML = `<div class="study-top lk-exitbar"><a class="icon-btn" href="#/mediate" data-exit aria-label="${t('Thoát bài học')}">${UI.icon('x')}</a><div class="progress" id="mdProg" role="progressbar" aria-label="${t('Tiến độ')}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="10"><i style="width:10%"></i></div></div>
      <div class="row" style="gap:.4rem;flex-wrap:wrap;margin-top:.4rem"><span class="chip lv">${X.level}</span><span class="chip">${UI.icon(K[0])} ${esc(ACT()[X.activity] || '')}</span></div>
      <h1 style="margin:.5rem 0 .8rem" lang="en">${esc(X.title)}</h1>
      <div class="card row" style="gap:.8rem;align-items:center;flex-wrap:nowrap">${teacher ? `<div style="flex:0 0 auto">${teacher}</div>` : ''}<p style="margin:0;flex:1;min-width:0" lang="en">${esc(X.scenario)}</p></div>
      <section class="card" style="margin-top:.8rem" aria-labelledby="mdSrcH"><div class="row" style="justify-content:space-between;align-items:center;gap:.6rem">
        <h2 id="mdSrcH" style="margin:0;font-size:1.05rem">${UI.icon(K[0])} ${esc(K[1])}</h2>
        ${S.kind !== 'chart' ? `<button type="button" class="btn icon-btn" id="mdPlay" style="min-width:44px;min-height:44px" aria-label="${t('Nghe nguồn')}">${UI.icon('volume-2')}</button>` : ''}</div>
        <hr style="border:0;border-top:1px solid var(--line);margin:.6rem 0">
        <div id="mdSrc" lang="en"${hideText ? ' hidden' : ''}>${sourceHtml(S)}</div>
        ${hideText ? `<div id="mdLF"><p class="muted" style="margin:.2rem 0 .6rem">${UI.icon('headphones')} ${t('Nghe trước: bấm loa để nghe nguồn, chữ sẽ hiện khi nghe xong.')}</p><button type="button" class="btn sm" id="mdShow">${t('Hiện chữ')}</button></div>` : ''}
      </section>
      <section class="card" style="margin-top:.8rem" aria-labelledby="mdTaskH"><h2 id="mdTaskH" class="sr-only">${t('Nhiệm vụ')}</h2>
        <span class="chip">${t('Gửi tới')}: <b lang="en">${esc(T.audience)}</b></span>
        <p style="margin:.6rem 0" lang="en">${esc(T.prompt)}</p>
        <textarea class="input" id="mdTx" lang="en" rows="${speak ? 4 : 6}" style="width:100%" aria-label="${speak ? t('Bản ghi lời bạn nói (sửa được)') : t('Bài viết của bạn')}" placeholder="${speak ? t('Bấm Nói rồi nói – lời bạn hiện ở đây, sửa được.') : t('Viết tin của bạn…')}"></textarea>
        <div class="row" style="justify-content:space-between;align-items:center;gap:.6rem;margin-top:.6rem;flex-wrap:wrap">
          <span class="chip" id="mdWc" aria-live="polite"></span>
          <button type="button" class="btn${speak ? ' primary' : ''}" id="mdMic" style="min-height:44px">${UI.icon('mic')} <span>${speak ? t('Nói') : t('Nói thay vì viết')}</span></button></div>
      </section>
      <div id="mdRes"></div>
      <div class="learn-bar"><button type="button" class="btn primary lg block" id="mdCheck">${t('Kiểm tra bài của tôi')}</button><p class="tiny muted" id="mdHint" style="margin:0;text-align:center"></p></div>`;
    const tx = $('#mdTx'), wc = $('#mdWc'), btn = $('#mdCheck'), hint = $('#mdHint'), prog = $('#mdProg');
    const setProg = v => { prog.setAttribute('aria-valuenow', v); prog.firstElementChild.style.width = v + '%'; if (window.ExitGuard) ExitGuard.progress(); };
    const reveal = () => { const s = $('#mdSrc'), lf = $('#mdLF'); if (s) s.hidden = false; if (lf) lf.remove(); };
    tx.value = draft.get(X.id);
    const count = () => {
      const n = MC.words(tx.value).length, ok = n >= T.min_words && (!T.max_words || n <= T.max_words), over = T.max_words && n > T.max_words;
      wc.textContent = t('{n} / {r} từ', { n, r: range });
      wc.style.color = ok ? 'var(--good-text)' : over ? 'var(--again-text)' : '';
      btn.disabled = n < T.min_words;
      hint.textContent = n < T.min_words ? (speak ? t('Nói ít nhất {n} từ để kiểm tra', { n: T.min_words }) : t('Viết ít nhất {n} từ để kiểm tra', { n: T.min_words })) : over ? t('Dài hơn {n} từ – thử bỏ bớt ý không cần', { n: T.max_words }) : '';
      if (n) setProg(Math.max(+prog.getAttribute('aria-valuenow'), 50));
      draft.set(X.id, tx.value);
    };
    tx.oninput = count; count();
    if (window.ExitGuard) ExitGuard.onSave(() => draft.set(X.id, tx.value));
    const pb = $('#mdPlay'); if (pb) pb.onclick = () => { setProg(Math.max(+prog.getAttribute('aria-valuenow'), 30)); play(S, reveal); };
    const sb = $('#mdShow'); if (sb) sb.onclick = reveal;
    // Nói: ghi tiếp vào ô (nói nhiều lượt được), bản ghi sửa tay được trước khi kiểm
    let rec = null; const mic = $('#mdMic'), micLabel = () => mic.querySelector('span');
    mic.onclick = () => {
      if (rec) { rec.stop(); return; }
      if (!UI.recognize) { toast(t('Trình duyệt này chưa nhận giọng nói – hãy viết.')); return; }
      micLabel().textContent = t('Đang nghe… bấm để dừng'); mic.setAttribute('aria-pressed', 'true');
      rec = UI.recognize('', 'en-GB', {
        setup: r => { r.continuous = true; },
        result: ({ heard }) => { if (heard) { tx.value = (tx.value.trim() + ' ' + heard).trim(); count(); } },
        error: e => toast(UI.recErrorText ? UI.recErrorText(e) : t('Không nhận được giọng nói')),
        end: () => { rec = null; mic.removeAttribute('aria-pressed'); micLabel().textContent = speak ? t('Nói') : t('Nói thay vì viết'); },
      });
    };
    btn.onclick = () => { if (rec) rec.stop(); reveal(); result(X, tx.value); setProg(100); };
  }

  function result(X, text) {
    const R = MC.check(X, text), got = R.points.filter(p => p.ok).length, of = R.points.length, T = X.task;
    const b = best(), prev = b[X.id]; if (!prev || got > prev.ok) b[X.id] = { ok: got, of };
    App.reward({ quizzes: 1, xp: 5 + got * 2 });
    if (window.ExitGuard) ExitGuard.done();
    const li = (ic, col, s, sr) => `<li style="display:flex;gap:.5rem;align-items:flex-start;margin:.35rem 0"><span style="color:${col};flex:0 0 auto" aria-hidden="true">${UI.icon(ic)}</span><span><span class="sr-only">${sr} </span><span lang="en">${esc(s)}</span></span></li>`;
    const L = list(), next = L[(L.findIndex(x => x.id === X.id) + 1) % L.length];
    $('#mdRes').innerHTML = `<section class="card" style="margin-top:.8rem" aria-labelledby="mdResH" tabindex="-1" id="mdResBox">
        <h2 id="mdResH" style="margin-top:0">${t('{a}/{b} ý chính', { a: got, b: of })}</h2>
        <ul style="list-style:none;padding:0;margin:0">${R.points.map(p => li(p.ok ? 'circle-check' : 'circle-x', p.ok ? 'var(--good-text)' : 'var(--again-text)', p.idea, p.ok ? t('Đã có:') : t('Còn thiếu:'))).join('')}</ul>
        ${R.extra.length ? `<h3>${t('Có thể bỏ')}</h3><ul style="list-style:none;padding:0;margin:0">${R.extra.map(s => li('info', 'var(--muted)', s, t('Có thể bỏ:'))).join('')}</ul>` : ''}
        ${R.copied ? `<p class="small">${UI.icon('lightbulb')} ${t('Hãy dùng lời của bạn – có đoạn chép nguyên văn từ nguồn:')} <i lang="en">“${esc(R.copied)}…”</i></p>` : ''}
        ${!R.inRange && T.max_words && R.n > T.max_words ? `<p class="small">${UI.icon('lightbulb')} ${t('Dài hơn {n} từ – thử bỏ bớt ý không cần', { n: T.max_words })}</p>` : ''}
        <p class="small muted" lang="en">${esc(X.explain || '')}</p>
      </section>
      <details class="card" style="margin-top:.8rem" open><summary><b>${t('Bài mẫu')}</b></summary><p lang="en" style="line-height:1.55">${esc(X.model)}</p></details>
      ${(X.useful || []).length ? `<details class="card" style="margin-top:.8rem"><summary><b>${t('Cụm từ hữu ích')}</b></summary><ul lang="en">${X.useful.map(u => `<li>${esc(u)}</li>`).join('')}</ul></details>` : ''}
      ${(X.tips || []).length ? `<details class="card" style="margin-top:.8rem"><summary><b>${t('Mẹo')}</b></summary><ul lang="en">${X.tips.map(u => `<li>${esc(u)}</li>`).join('')}</ul></details>` : ''}`;
    const bar = view.querySelector('.learn-bar');
    bar.innerHTML = `<a class="btn primary lg block" href="#/mediate/${next.id}">${t('Bài tiếp theo')}</a><button type="button" class="btn block" id="mdAgain">${t('Sửa bài và kiểm lại')}</button>`;
    $('#mdAgain').onclick = () => { const v = text; render(X); $('#mdTx').value = v; $('#mdTx').dispatchEvent(new Event('input')); $('#mdTx').focus(); };
    const box = $('#mdResBox'); box.scrollIntoView({ behavior: 'smooth', block: 'start' }); box.focus({ preventScroll: true });
  }
})();
