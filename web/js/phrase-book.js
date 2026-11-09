/* Sổ mẫu câu theo chức năng (mục trong #/phrases). Gói lười 'pbook' (cpack/framework/functions.js + file này) – chỉ nạp khi người học mở mục lần đầu (phrases-model.js).
 * Dữ liệu: content/framework/functions.json → scripts/framework/build-functions.mjs. Chi tiết từng chức năng vẽ khi mở (<details>), nên 100 mục vẫn nhẹ. */
(function () {
  const { $, $$, esc, toast } = UI;
  const App = window.App;
  const LV = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'], REG = [['formal', 'Mẫu câu trang trọng'], ['neutral', 'Mẫu câu trung tính'], ['informal', 'Mẫu câu thân mật']];
  // name/note/avoid.why theo ngôn ngữ người học: vi = bản soạn tay trong gói (f.vi); L1 khác = bản CI dịch từ en (gen-content-i18n; khóa = chuỗi vi trong content/i18n/en-src/functions.json); thiếu → tiếng Anh, không bao giờ hiện tiếng Việt cho L1 khác
  let l1 = {};
  const to = () => I18N.learnLang();
  const L1 = (f, k, en) => { const v = f.vi && f.vi[k]; return to() === 'vi' ? v || en : to() === 'en' || !v ? en : l1[v] || en; };
  const loadL1 = () => {
    if (to() === 'en' || to() === 'vi') return Promise.resolve();
    const base = /(^|\.)lexkite\.(com|pages\.dev)$/.test(location.hostname) || (window.VBNative && VBNative.is) ? '' : 'https://lexkite.com';
    return fetch(base + '/i18n/content/' + to() + '.json').then(r => (r.ok ? r.json() : {})).catch(() => ({})).then(j => { l1 = j || {}; });
  };
  const row = (en, extra = '', who = '') => `<div class="deck-row" style="grid-template-columns:minmax(0,1fr) auto"><span lang="en">${who ? `<b>${esc(who)}</b> ` : ''}${esc(en)}</span><span class="row nowrap" style="gap:.3rem"><button type="button" class="icon-btn sm" data-speak="${esc(en)}" aria-label="${t('Nghe')}: ${esc(en)}">🔊</button>${extra}</span></div>`;
  const saveBtn = (en, name) => { const saved = App.inDeck(en); return `<button type="button" class="icon-btn sm" data-pb-save="${esc(en)}" data-pb-vi="${esc(name)}" ${saved ? 'disabled' : ''} aria-label="${saved ? t('Đã lưu') : t('Lưu cụm này vào sổ')}: ${esc(en)}">${saved ? '✓' : '＋'}</button>`; };
  const h = k => `<h4 style="margin:.8rem 0 .2rem">${t(k)}</h4>`;
  const detail = f => {
    const sv = en => saveBtn(en, L1(f, 'name', f.name));
    return `${REG.map(([k, lab]) => (f.phrases[k] || []).length ? h(lab) + f.phrases[k].map(p => row(p, sv(p))).join('') : '').join('')}
      ${(f.responses || []).length ? h('Câu đáp thường gặp') + f.responses.map(p => row(p, sv(p))).join('') : ''}
      ${(f.example || []).length ? h('Hội thoại mẫu') + f.example.map(x => row(x.en, '', x.who)).join('') : ''}
      ${f.avoid ? `${h('Tránh nói')}<div class="small"><div><span class="chip">✗</span> <span lang="en">${esc(f.avoid.wrong)}</span></div><div style="margin-top:.2rem"><span class="chip ok">✓</span> <span lang="en">${esc(f.avoid.right)}</span></div><p class="muted small" style="margin:.3rem 0 0">${esc(L1(f, 'why', f.avoid.why))}</p></div>` : ''}
      ${f.note ? `<p class="muted small" style="margin:.8rem 0 0">${UI.icon('ruler')} ${esc(L1(f, 'note', f.note))}</p>` : ''}`;
  };
  // host = phần tử rỗng trong #/phrases; gọi một lần khi mở mục. Trả true nếu có dữ liệu để vẽ.
  App.phraseBook = async host => {
    host.textContent = '…';
    await loadL1();
    const items = (window.PHRASEBOOK && PHRASEBOOK.items) || [];
    if (!items.length) { host.innerHTML = `<p class="muted small">${t('Không tải được sổ mẫu câu. Thử lại sau.')}</p>`; return false; }
    const idx = items.map(f => (f.name + ' ' + L1(f, 'name', f.name) + ' ' + Object.values(f.phrases).flat().join(' ') + ' ' + (f.responses || []).join(' ')).toLowerCase());
    let lv = '';
    host.innerHTML = `<div class="row between" style="gap:.6rem;margin-bottom:.6rem"><div class="tabs seg" id="pbLv" role="group" aria-label="${t('Lọc theo cấp độ')}">${['', ...LV].map(v => `<button type="button" data-v="${v}" aria-pressed="false">${v || t('Tất cả')}</button>`).join('')}</div>
      <input class="input" id="pbq" type="search" placeholder="${t('Tìm chức năng hoặc câu…')}" aria-label="${t('Tìm chức năng hoặc câu…')}" style="max-width:280px"></div>
      <div id="pbList"></div>`;
    const draw = () => {
      const q = $('#pbq').value.trim().toLowerCase();
      const list = items.filter((f, i) => (!lv || f.level === lv) && (!q || idx[i].includes(q)));
      $('#pbList').innerHTML = list.length ? list.map(f => `<details data-id="${esc(f.id)}"><summary class="row between" style="gap:.5rem;padding:.55rem 0"><b>${esc(L1(f, 'name', f.name))}</b><span class="chip">${esc(f.level)}</span></summary><div></div></details>`).join('')
        : `<p class="muted small">${t('Chưa có mẫu câu phù hợp.')}</p>`;
      $$('#pbLv button').forEach(b => { const on = b.dataset.v === lv; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
    };
    $('#pbLv').onclick = e => { const b = e.target.closest('button'); if (b) { lv = b.dataset.v; draw(); } };
    $('#pbq').oninput = draw;
    // Chi tiết vẽ khi mở lần đầu (sự kiện toggle không nổi bọt → bắt ở pha capture)
    $('#pbList').addEventListener('toggle', e => {
      const d = e.target, body = d.open && d.lastElementChild; if (!body || body.firstChild) return;
      body.innerHTML = detail(items.find(f => f.id === d.dataset.id)); App.bindCommon();
    }, true);
    $('#pbList').addEventListener('click', async e => {
      const b = e.target.closest('[data-pb-save]'); if (!b || b.disabled) return;
      b.disabled = true;
      await App.addWord({ word: b.dataset.pbSave, vi: b.dataset.pbVi, pos: 'phrase', ex: '', emoji: '🧩', topic: 'phrases' }, null, { silent: true });
      b.textContent = '✓'; toast('🧩 ' + t('Đã lưu') + ': ' + b.dataset.pbSave);
    });
    draw();
    return true;
  };
})();
