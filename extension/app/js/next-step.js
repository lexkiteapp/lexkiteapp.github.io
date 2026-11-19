/* ➡️ Bước tiếp theo cuối 1 bài đọc / 1 phần nghe (tải lười – gói 'nxs'): phần kế tiếp cùng bộ + kỹ năng khác → không ngõ cụt.
 * reading.js / listening.js gọi NextStep.render(el, 'read' | 'listen', id) sau khi chấm. */
(function (g) {
  const { esc } = UI;
  function links(kind, id) {
    const out = [], a = (h, em, tx, pri) => ({ h, em, tx, pri });
    if (kind === 'read') {
      const R = g.READINGS || [], i = R.findIndex(x => x.id === id), nx = i >= 0 ? R[i + 1] || R[0] : null;
      if (nx && nx.id !== id) out.push(a('#/read/' + encodeURIComponent(nx.id), '📖', t('Bài đọc tiếp theo: {name}', { name: nx.title }), 1));
      out.push(a('#/listening', '🎧', t('Luyện nghe')), a('#/grammar', '📐', t('Ngữ pháp')));
    } else {
      const T = ((g.TOEIC || {}).listening) || [], A = g.LISTENING || [], L = A.some(p => p.id === id) ? A : T;
      const i = L.findIndex(p => p.id === id), nx = i >= 0 ? L[i + 1] : null;
      if (nx) out.push(a('#/listen/' + encodeURIComponent(nx.id), '🎧', t('Phần tiếp theo: {name}', { name: nx.title || ('Part ' + nx.part) }), 1));
      out.push(a('#/reading', '📖', t('Đọc hiểu')), a('#/speaking', '🗣️', t('Luyện nói')));
    }
    return out;
  }
  function render(el, kind, id) {
    if (!el || el.querySelector('.nx-step')) return;
    const ls = links(kind, id);
    el.insertAdjacentHTML('beforeend', `<nav class="nx-step" aria-label="${esc(t('Học tiếp'))}" style="margin-top:.8rem"><div class="small muted" style="font-weight:700">➡️ ${t('Học tiếp')}</div>
      <div class="row" style="flex-wrap:wrap;gap:.5rem;margin-top:.4rem">${ls.map(x => `<a class="btn sm${x.pri ? ' primary' : ''}" href="${x.h}"><span aria-hidden="true">${x.em}</span> ${esc(x.tx)}</a>`).join('')}</div></nav>`);
  }
  g.NextStep = { links, render };
})(self);
