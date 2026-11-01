/* 🏁 Màn thưởng cuối bước lộ trình (tải lười – bundle 'pathx', gọi từ path.js khi study.js báo 'lexkite:practice-done').
 * Gắn vào thẻ kết quả của lượt luyện: tiến độ 4 bước của bài, chuỗi ngày + XP hôm nay, nút "bước tiếp theo" 1 chạm,
 * và lời mời bật nhắc học nhẹ nhàng (chỉ khi chưa bật, tối đa 1 lần/7 ngày, người dùng tự bấm mới xin quyền thông báo). */
(function (g) {
  const { esc } = UI;
  const App = g.App;
  const ls = (k, v) => { try { if (v === undefined) return localStorage.getItem('vb.' + k); localStorage.setItem('vb.' + k, v); } catch (e) { return null; } };
  function css() {
    if (document.getElementById('prCss')) return;
    const st = document.createElement('style'); st.id = 'prCss';
    st.textContent = `.path-reward{margin-top:1.1rem;padding-top:1rem;border-top:1px solid var(--line);text-align:left}
.pr-stats{display:flex;gap:.5rem;flex-wrap:wrap;justify-content:center;margin-bottom:.8rem}.pr-stats span{padding:.35rem .75rem;border-radius:999px;background:var(--surface-2);font-weight:700}
.pr-steps{list-style:none;padding:0;margin:0 0 .9rem;display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:.4rem}
.pr-steps a{display:flex;gap:.4rem;align-items:center;min-height:44px;padding:.4rem .6rem;border:1px solid var(--line);border-radius:12px;color:var(--text);text-decoration:none;font-size:.9rem}
.pr-steps a.ok{border-color:var(--good);background:var(--good-soft,transparent)}.pr-rem{margin-top:.8rem;padding:.7rem .8rem;border-radius:12px;background:var(--surface-2);display:flex;gap:.5rem;align-items:center;flex-wrap:wrap}
.pr-rem p{margin:0;flex:1 1 180px}.pr-rem .btn{min-height:44px}
.pr-save{margin-top:.9rem;padding:.9rem;border-radius:16px;border:2px solid var(--primary);background:var(--primary-soft);display:flex;gap:.7rem;align-items:center;flex-wrap:wrap}
.pr-save svg{flex:none}.pr-save>div{flex:1 1 200px}.pr-save p{margin:.2rem 0 0}.pr-save .row{flex:1 1 100%;gap:.5rem}.pr-save .btn{min-height:44px}`;
    document.head.appendChild(st);
  }
  function remNudge() {
    const s = App.state.settings || {};
    try { if (localStorage.getItem('lk.edu') === '1' || localStorage.getItem('lk.u13') === '1') return ''; } catch (e) { /* bỏ qua */ } // lớp học: không mời nhắc học
    if (s.reminderOn || (!Core.Store.isExtension && (!('Notification' in g) || Notification.permission === 'denied'))) return '';
    const last = +ls('remNudge') || 0; if (Date.now() - last < 7 * 864e5) return '';
    return `<div class="pr-rem" id="prRem"><p class="small">🔔 ${t('Học đều mỗi ngày dễ hơn khi có lời nhắc nhẹ nhàng.')}</p>
      <button class="btn sm primary" id="prRemOn">${t('Nhắc tôi lúc {time}', { time: esc(s.reminderTime || '20:00') })}</button><button class="btn sm ghost" id="prRemNo">${t('Để sau')}</button></div>`;
  }
  // Lưu tiến độ: chỉ mời đăng nhập SAU khi xong 1 buổi (Ngày 1 trở đi) – không bắt tạo tài khoản trước khi thấy giá trị. "Để sau" → hỏi lại sau 3 ngày.
  function saveNudge(c) {
    const S = g.Sync;
    if (!c.title || App.state.user || !S || !S.gBtn || S.can === false) return '';
    const last = +ls('saveNudge') || 0; if (Date.now() - last < 3 * 864e5) return '';
    return `<div class="pr-save" id="prSave">${g.Kit ? Kit.svg('cheer', 52) : ''}<div><b>${t('Lưu tiến độ của bạn')}</b><p class="small">${t('Đăng nhập miễn phí để giữ chuỗi ngày, XP và từ đã học – học tiếp trên mọi thiết bị.')}</p></div>
      <div class="row">${S.authBtns ? S.authBtns('prSaveIn') : S.gBtn('prSaveIn')}<button class="btn ghost sm" id="prSaveNo">${t('Để sau')}</button></div></div>`;
  }
  g.PathReward = {
    // Xử lý khi xong 1 lượt luyện của bài lộ trình id (P = hàm nội bộ của path.js)
    async done(d, id, P) {
      const r = await P.recLoad();
      // Ghép thẻ / Nghe & chép: chỉ ghi khi làm XONG lượt (trước đây ghi lúc mở bước)
      if ((d.mode === 'match' || d.mode === 'listen') && !P.recOf(id).includes(d.mode)) { r[id] = [...(r[id] || []), d.mode]; Core.Store.set('pathSteps', r).catch(() => {}); }
      // Học từ mới: từ vừa học vào flashcard, đánh dấu đã gặp (srs.last) → tính vào "đã học %" của bài và được nhắc ôn
      if (d.mode === 'learn' && d.items) {
        const now = Date.now(), IX = (g.IELTS_DATA || {}).INDEX || {};
        for (const w of d.items) {
          if (!App.inDeck(w.word)) await App.addWord(IX[w.word.toLowerCase()] || w, null, { silent: true });
          await Core.Cards.patch(w.word, c => { if (c.srs && !c.srs.last) c.srs = { ...c.srs, last: now, due: now + 6e5 }; }).catch(() => {});
        }
        App.state.cards = await Core.Cards.all();
      }
      if (d.wait) await d.wait.catch(() => {}); // Kiểm tra bài: chờ ghi unitDone xong
      const u = P.unitState().find(x => x.topic.id === id); if (!u) return;
      const nx = App.pathCurrent(), stName = m => (P.STEPS().find(x => x[0] === m) || [])[2];
      this.show({ unit: u,
        steps: P.STEPS().map(([m, em, name]) => ({ m, em, name, ok: P.stepDone(u, m), href: P.stepHref(id, m) })),
        next: u.status === 'done' ? nx && nx.topic.id !== id && { name: nx.topic.name, emoji: nx.topic.emoji, href: P.stepHref(nx.topic.id, P.nextStep(nx)) }
          : { name: stName(P.nextStep(u)), href: P.stepHref(id, P.nextStep(u)), same: 1 } });
    },
    show(c) {
      const card = App.view.querySelector('.celebrate');
      if (!card || card.querySelector('.path-reward')) return;
      css();
      const gm = App.state.game || {}, k = Core.todayKey(), xp = ((gm.days || {})[k] || {}).xp || 0, sk = App.streak ? App.streak() : 0;
      const nOk = c.steps.filter(x => x.ok).length;
      const nx = c.next;
      const sec = document.createElement('section');
      sec.className = 'path-reward'; sec.setAttribute('aria-label', t('Tiến độ bài'));
      sec.innerHTML = `<div class="pr-stats">${sk ? `<span>🔥 ${t('{n} ngày liên tiếp', { n: sk })}</span>` : ''}<span>⚡ ${t('+{xp} XP hôm nay', { xp })}</span><span>${c.unit.topic.emoji} ${t('{done}/{total} bước', { done: nOk, total: c.steps.length })}</span></div>
        ${c.title ? `<h2 style="margin:.2rem 0 .3rem;text-align:center">${esc(c.title)}</h2>` : ''}<h3 style="margin:.2rem 0 .5rem">${esc(c.unit.topic.name)}</h3>
        <ol class="pr-steps">${c.steps.map(x => `<li><a class="${x.ok ? 'ok' : ''}" href="${x.href}"><span aria-hidden="true">${x.ok ? '✅' : x.em}</span>${esc(x.name)}${x.ok ? `<span class="sr-only"> – ${t('Đã hoàn thành')}</span>` : ''}</a></li>`).join('')}</ol>
        ${nx ? `<a class="btn primary lg block" href="${nx.href}">${nx.same ? t('Bước tiếp theo: {step}', { step: esc(nx.name) }) : `${nx.emoji} ${t('Bài mới đã mở: {name}', { name: esc(nx.name) })}`} →</a>` : `<p class="center">🏆 ${t('Bạn đã hoàn thành toàn bộ lộ trình!')}</p>`}
        ${saveNudge(c) || remNudge()}`;
      card.appendChild(sec);
      const sv = sec.querySelector('#prSaveNo'); if (sv) sv.onclick = () => { ls('saveNudge', Date.now()); sec.querySelector('#prSave').remove(); };
      const on = sec.querySelector('#prRemOn'), no = sec.querySelector('#prRemNo');
      if (no) no.onclick = () => { ls('remNudge', Date.now()); sec.querySelector('#prRem').remove(); };
      if (on) on.onclick = async () => {
        const s = App.state.settings; s.reminderOn = true;
        try { if ('Notification' in g && Notification.permission === 'default') await Notification.requestPermission(); } catch (e) { /* trình duyệt cũ */ }
        await App.saveSettings();
        ls('remNudge', Date.now());
        sec.querySelector('#prRem').innerHTML = `<p class="small" role="status">✓ ${t('Sẽ nhắc lúc {time} mỗi ngày', { time: esc(s.reminderTime || '20:00') })}</p>`;
      };
    },
  };
})(self);
