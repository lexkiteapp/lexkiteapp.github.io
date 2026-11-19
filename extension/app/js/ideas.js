/* Ngân hàng ý tưởng Writing Task 2: theo chủ đề → vấn đề → luận điểm ủng hộ / phản đối, câu mẫu và cụm từ để lưu. */
(function () {
  const { $, $$, esc, toast } = UI;
  const App = window.App;
  const { state, routes } = App;
  const view = App.view;
  const I = () => window.IDEAS || [];

  routes.ideas = function (topic) {
    const all = I();
    if (!all.length) { view.innerHTML = `<div class="card empty"><div class="em">💡</div>${t('Đang cập nhật ngân hàng ý tưởng.')}</div>`; return; }
    const tp = all.find(x => x.topic === topic) || all[0];
    const prompt = (window.WRITE_PROMPTS || []).filter(p => p.topic === tp.topic);
    view.innerHTML = `
      <div class="page-head"><div><h1>💡 ${t('Ngân hàng ý tưởng Task 2')}</h1><p class="muted">${t('Bí ý là lỗi phổ biến nhất khi viết Task 2. Chọn chủ đề → vấn đề → lấy luận điểm ủng hộ/phản đối kèm câu mẫu band 8 và cụm từ hay để lưu vào Sổ cụm từ.')}</p></div></div>
      <div class="row" style="margin-bottom:1rem">${all.map(x => `<a class="chip ${x === tp ? 'lv' : ''}" href="#/ideas/${x.topic}">${x.emoji} ${esc(t(x.title))}</a>`).join('')}</div>
      <div class="stack">${tp.issues.map((iss, i) => `<details class="card idea" ${i ? '' : 'open'}><summary><b>❓ ${esc(iss.q)}</b></summary>
        <div class="grid g2" style="margin-top:.8rem">${[['for', `👍 ${t('Ủng hộ')}`], ['against', `👎 ${t('Phản đối')}`]].map(([k, l]) => `<div><h4 style="margin:.2rem 0 .5rem">${l}</h4>${(iss[k] || []).map(x => `<div class="idea-it">
          <b>${esc(x.idea)}</b><div class="small muted">${App.viHtml(x.vi)}</div>
          <div class="ctx-box"><div class="ctx-tx">${esc(x.ex)}</div><div class="ctx-act"><button class="ctx-say" data-saysent="${esc(x.ex)}">🔊</button></div></div>
          <div class="row" style="margin-top:.4rem;gap:.3rem">${(x.chunks || []).map(c => { const [en, vi] = String(c).split('|'); return `<button class="chip idea-ch" data-en="${esc(en)}" data-vi="${esc(vi || '')}" data-ex="${esc(x.ex)}" title="${vi && I18N.learnLang() === 'vi' ? esc(vi) + ' – ' : ''}${t('bấm để lưu')}">+ ${esc(en)}</button>`; }).join('')}</div></div>`).join('')}</div>`).join('')}</div>
      </details>`).join('')}</div>
      <div class="card" style="margin-top:1rem"><h3 style="margin-top:0">📚 ${t('Từ vựng chủ đề {topic}', { topic: esc(t(tp.title)) })}</h3><div class="ai-vocab">${(tp.vocab || []).map(([en, vi]) => `<div><b>${esc(en)}</b><div class="tiny muted">${App.viHtml(vi)}</div></div>`).join('')}</div></div>
      ${prompt.length ? `<div class="card" style="margin-top:1rem"><h3 style="margin-top:0">✍️ ${t('Luyện viết với chủ đề này')}</h3>${prompt.slice(0, 5).map(p => `<a class="md-item" href="#/write/${p.id}" style="color:var(--text)"><span class="small">${esc(p.text)}</span><span>→</span></a>`).join('')}</div>` : ''}`;
    $$('.idea-ch').forEach(b => b.onclick = () => App.savePhraseDialog ? App.savePhraseDialog({ phrase: b.dataset.en, vi: I18N.learnLang() === 'vi' ? b.dataset.vi : '', sentence: b.dataset.ex, title: t('Ý tưởng Task 2') }) : toast(t('Không lưu được')));
  };
})();
