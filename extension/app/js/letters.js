/* IELTS General Training – Writing Task 1 (viết thư): chọn đề theo giọng văn, viết có đếm từ & đồng hồ,
 * tự kiểm lời chào/kết thư đúng giọng, đủ 3 ý, xem bài mẫu có chú thích, chấm AI (nếu có). Đề & bài mẫu: js/write/gt-letters.js */
(function () {
  const { $, $$, esc, toast } = UI;
  const App = window.App, { routes } = App, view = App.view, Store = Core.Store;
  const L = () => window.GT_LETTERS || [];
  const TONE = () => ({ formal: t('Trang trọng'), 'semi-formal': t('Bán trang trọng'), informal: t('Thân mật') });
  const TONE_TIP = () => ({
    formal: t('Không biết tên người nhận: Dear Sir or Madam → Yours faithfully. Biết tên: Dear Mr/Ms + họ → Yours sincerely. Không viết tắt, không dùng từ lóng.'),
    'semi-formal': t('Người quen nhưng không thân (hàng xóm, chủ nhà, đồng nghiệp): Dear Mr/Ms + họ → Kind regards / Best regards. Lịch sự nhưng tự nhiên.'),
    informal: t('Bạn bè, người thân: Dear/Hi + tên → Best wishes / Love / See you soon. Được dùng viết tắt (I\'m, can\'t) và câu cảm thán.'),
  });
  const wc = s => (s.trim().match(/[A-Za-z0-9'’-]+/g) || []).length;
  const tab = (k, label, cur, n) => `<a class="${k === cur ? 'on' : ''}" href="#/letters?tone=${k}" style="padding:.45rem .8rem;border-radius:10px;font-weight:700;text-decoration:none;color:inherit;${k === cur ? 'background:var(--surface);box-shadow:var(--shadow-sm)' : ''}">${label} <span class="tiny muted">${n}</span></a>`;

  routes.letters = async function (arg, query) {
    if (arg) return practice(arg);
    let tone = (query && query.get && query.get('tone')) || 'all';
    if (tone !== 'all' && !TONE()[tone]) tone = 'all';
    const list = L().filter(x => tone === 'all' || x.tone === tone), drafts = await Store.get('letterDrafts', {});
    view.innerHTML = `
      <div class="page-head"><div><h1>✉️ ${t('Viết thư – IELTS General Task 1')}</h1><p class="muted">${t('Viết thư ít nhất 150 từ trong 20 phút. Chọn đề theo giọng văn, viết có đếm từ, tự kiểm lời chào – kết thư và xem bài mẫu band 8 có chú thích.')}</p></div></div>
      <div class="tabs" style="display:inline-flex;flex-wrap:wrap;margin-bottom:1rem">${tab('all', t('Tất cả'), tone, L().length)}${Object.keys(TONE()).map(k => tab(k, TONE()[k], tone, L().filter(x => x.tone === k).length)).join('')}</div>
      ${tone !== 'all' ? `<div class="tip small" style="margin-bottom:1rem">💡 ${TONE_TIP()[tone]}</div>` : ''}
      <div class="grid auto">${list.map(x => `<div class="card">
        <div class="row between"><span class="chip">${TONE()[x.tone] || ''}</span>${drafts[x.id] && drafts[x.id].trim() ? `<span class="chip ok">✍️ ${t('{n} từ', { n: wc(drafts[x.id]) })}</span>` : ''}</div>
        <h3 style="margin:.5rem 0 .2rem">${esc(x.titleVi || x.topic)}</h3><div class="small muted">${esc(x.situation.length > 140 ? x.situation.slice(0, 137) + '…' : x.situation)}</div>
        <div class="row" style="margin-top:.7rem"><a class="btn sm primary" href="#/letters/${x.id}">✍️ ${t('Luyện viết')}</a><a class="btn sm" href="#/model/gt-${x.id}">📄 ${t('Bài mẫu')}</a></div></div>`).join('') || `<div class="card muted">${t('Đang cập nhật.')}</div>`}</div>`;
  };

  async function practice(id) {
    const x = L().find(y => y.id === id);
    if (!x) return routes.letters();
    const drafts = await Store.get('letterDrafts', {});
    view.innerHTML = `
      <a href="#/letters?tone=${x.tone}" class="small">← ${t('Tất cả đề viết thư')}</a>
      <div class="card" style="margin-top:.6rem">
        <div class="row between"><span class="chip lv">${TONE()[x.tone] || ''}</span><span class="chip">IELTS General · Task 1</span></div>
        <p style="font-weight:600;margin:.8rem 0 .4rem">${esc(x.situation)}</p>
        <p class="small" style="margin:.2rem 0">Write a letter to ${esc(x.to || 'the person')}. In your letter:</p>
        <ul style="margin:.2rem 0 .6rem;padding-left:1.2rem">${x.bullets.map(b => `<li>${esc(b)}</li>`).join('')}</ul>
        <p class="small muted" style="margin:0">Write at least 150 words. You do NOT need to write any addresses. Begin your letter as follows: <b>${esc(x.open)}</b></p>
        <details style="margin-top:.6rem"><summary class="small"><b>💡 ${t('Giọng văn & lời chào – kết thư')}</b></summary><p class="small" style="margin:.4rem 0 0">${TONE_TIP()[x.tone] || ''}</p></details>
      </div>
      <div class="card">
        <textarea class="input" id="lt" rows="14" style="font-size:1rem;line-height:1.7" placeholder="${esc(x.open)}">${esc(drafts[id] || '')}</textarea>
        <div class="row between" style="margin-top:.5rem"><div class="row"><span class="chip" id="ltWc"></span><button class="btn sm" id="ltTimer">⏱ 20:00</button></div>
          <div class="row"><a class="btn sm" href="#/model/gt-${x.id}">📄 ${t('Xem bài mẫu')}</a><button class="btn sm primary" id="ltCheck">✅ ${t('Kiểm tra')}</button></div></div>
        <div id="ltRes" style="margin-top:.8rem"></div>
      </div>`;
    const ta = $('#lt');
    let saveT = null, timer = null;
    const count = () => { const n = wc(ta.value); $('#ltWc').textContent = t('{n} từ', { n }); $('#ltWc').className = 'chip ' + (n >= 150 ? 'ok' : ''); };
    ta.oninput = () => { count(); clearTimeout(saveT); saveT = setTimeout(async () => { const d = await Store.get('letterDrafts', {}); d[id] = ta.value; Store.set('letterDrafts', d); }, 600); };
    count();
    $('#ltTimer').onclick = () => {
      if (timer) { clearInterval(timer); timer = null; $('#ltTimer').textContent = '⏱ 20:00'; return; }
      const end = Date.now() + 20 * 60e3;
      timer = setInterval(() => { const b = $('#ltTimer'); if (!b) return clearInterval(timer); const s = Math.max(0, Math.round((end - Date.now()) / 1000)); b.textContent = `⏱ ${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; if (!s) { clearInterval(timer); toast(t('Hết giờ!')); } }, 1000);
    };
    $('#ltCheck').onclick = () => {
      const s = ta.value.trim(), n = wc(s), first = s.split('\n')[0] || '', low = s.toLowerCase();
      const closeWord = (x.close || '').toLowerCase().replace(/,$/, '');
      const contractions = (s.match(/\b\w+'(m|re|s|t|ll|ve|d)\b/gi) || []).length;
      const rows = [
        [n >= 150, n >= 150 ? t('Đủ độ dài: {n} từ.', { n }) : t('Mới {n} từ – cần ít nhất 150 từ.', { n })],
        [first.trim().toLowerCase().startsWith((x.open || '').toLowerCase().split(/\s+/)[0]), t('Lời chào nên mở đầu đúng như đề: “{o}”.', { o: x.open })],
        [!closeWord || low.includes(closeWord), t('Kết thư phù hợp giọng văn: “{c}”.', { c: x.close })],
        [(s.split(/\n\s*\n/).filter(p => p.trim()).length) >= 4, t('Chia đoạn rõ: lời chào – mục đích – 3 ý – kết thư (ít nhất 4 đoạn).')],
      ];
      if (x.tone === 'formal') rows.push([contractions === 0, contractions ? t('Thư trang trọng nên tránh viết tắt (có {n} chỗ như I\'m, can\'t).', { n: contractions }) : t('Không dùng viết tắt – đúng văn phong trang trọng.')]);
      $('#ltRes').innerHTML = `<div class="stack">${rows.map(([ok, msg]) => `<div class="small">${ok ? '✅' : '⚠️'} ${msg}</div>`).join('')}</div><div id="ltAi" style="margin-top:.8rem"></div>`;
      if (window.AI && n >= 50) AI.attach($('#ltAi'), () => ({ kind: 'task1', task: `IELTS General Training Task 1 letter (${x.tone}). ${x.situation} Bullet points: ${x.bullets.join('; ')}`, text: s }));
    };
  }
})();
