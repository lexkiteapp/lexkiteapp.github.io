/* 🎨 Stitch v2.1 "Sổ từ" (#/deck, cờ ux1): khung tự sinh web/js/st/v2/deck.js · brand/stitch/v2/bind/deck.json. Tải trong gói ux1 (lười, không vào khung app).
 * Bao routes.deck của app.js: cờ ux1 bật → khung Stitch; tắt (hoặc link chia sẻ ?share=) → trang cũ nguyên vẹn. Giữ MỌI ý trang cũ:
 * tiêu đề n từ · k đã thuộc · Học / Kiểm tra (?src=deck) · #shareBtn (chia sẻ bộ thẻ đang lọc) · #exportBtn (xuất phần đang hiện) · Nhập .json (#importBtn → #importFile)
 * · #ankiOut (xuất Anki, kèm phần đang hiện) · #ankiIn · ô tìm #filterQ (từ hoặc nghĩa) · #filterTopic (bộ từ / Từ tự thêm / bộ Anki) · #filterFrom (nguồn + Sắp quên, ?from=)
 * · #filterM (mức độ) · #deckList: ảnh/emoji, từ → #/dict/…, IPA, nghĩa, ngữ cảnh đã lưu (tô từ) hoặc định nghĩa, chấm mức thuộc, % nhớ FSRS (title = ngày đến hạn),
 * [data-speak][data-url], [data-edit] → hộp Sửa cũ (sửa / học lại / xóa) · sắp xếp mới thêm (Sắp quên: dễ quên trước) · tối đa 400 thẻ + ghi chú · trạng thái trống cũ.
 * Thêm từ mẫu: kính lúp đầu trang → con trỏ vào ô tìm; micro → UI.recognize đọc từ vào ô tìm; "Thêm từ mới" → #/dict (tra & lưu); thẻ đến hạn hôm nay = khuôn "Ôn hôm nay".
 * @icons arrow_back search school bolt share file_download file_upload ios_share sync mic category travel_explore military_tech expand_more priority_high volume_up edit add_circle trending_up trending_down horizontal_rule */
(function () {
  const App = window.App; if (!App || !App.routes || !App.routes.deck || !self.IELTS_DATA) return;
  const { state, routes } = App, old = routes.deck, { TOPICS } = IELTS_DATA, esc = UI.esc;
  const on = () => !!(self.ST2 && ST2.deck && App.ux1On && App.ux1On());
  const SRS = () => Core.SRS, CAP = 400;
  const posT = p => p ? String(UI.posChip(p)).replace(/<[^>]+>/g, '').trim() : '';
  // màu chữ đạt WCAG AA trên nền thẻ (mẫu Stitch dùng #279655/#FFB054/#F2553B cho chữ 10–11 px → thiếu tương phản ở bản sáng)
  const ST = {
    m3: { n: 5, dot: 'lt:bg-[#279655] dk:bg-[#34D399]', tx: 'lt:text-[#1E7542] dk:text-[#34D399]' },
    m2: { n: 4, dot: 'lt:bg-[#0D6964] dk:bg-[#2BA39A]', tx: 'lt:text-[#0D6964] dk:text-[#2BA39A]' },
    m1: { n: 2, dot: 'bg-[#FFB054]', tx: 'lt:text-[#9A4A07] dk:text-[#FFB054]' },
    m0: { n: 0, dot: '', tx: 'lt:text-[#5F7376] dk:text-[#8EACB0]' },
    forget: { n: 1, dot: 'bg-[#F2553B]', tx: 'lt:text-[#B53A22] dk:text-[#FFA493]' },
  };
  const DOT = 'w-2.5 h-2.5 rounded-full shadow-xs', OFF = 'lt:bg-[#E5DFD4] dk:bg-[#1E333B]';
  const CHIP = {
    good: 'lt:bg-[#E7F7ED] lt:border-[#279655]/30 lt:text-[#1E7542] dk:bg-[rgba(52,_211,_153,_0.15)] dk:border-[#34D399]/40 dk:text-[#34D399]',
    mid: 'lt:bg-[#FFF7EA] lt:border-[#EADEC8] lt:text-[#5F7376] dk:bg-[#1A2E35] dk:border-[#233942] dk:text-[#A9BFC1]',
    bad: 'lt:bg-[#FDECEC] lt:border-[#E03131]/30 lt:text-[#B02525] dk:bg-[rgba(248,_113,_113,_0.15)] dk:border-[#F87171]/40 dk:text-[#F87171]',
  };
  const HL = { plain: 'font-semibold not-italic underline lt:text-[#0D6964] lt:decoration-[#0D6964]/40 dk:text-[#2BA39A] dk:decoration-[#2BA39A]/50', due: 'font-semibold not-italic underline lt:text-[#B53A22] dk:text-[#FFA493]' };
  const SEL = 'absolute left-0 top-1/2 -translate-y-1/2 w-full h-11 opacity-0 cursor-pointer text-[16px]';
  const EMPTY = 'rounded-[18px] p-3.5 text-center text-[13px] font-semibold lt:bg-white lt:border lt:border-[#EADEC8] lt:text-[#5F7376] dk:bg-[#142328] dk:border-2 dk:border-[#233942] dk:text-[#8EACB0]';
  const NOTE = 'text-center text-[12px] font-semibold lt:text-[#5F7376] dk:text-[#8EACB0]';
  const opt = (v, label, cur) => `<option value="${esc(v)}"${v === cur ? ' selected' : ''}>${esc(label)}</option>`;

  routes.deck = function (arg, query) {
    const qy = query && query.get ? query : null;
    if (!on() || (qy && qy.get('share'))) return old.apply(this, arguments);
    const { ORIGINS } = App, view = App.view;
    let q = '', tp = '', m = '', fr = qy && qy.get('from') || '', rec = null;
    if (fr && fr !== 'forget' && !ORIGINS[fr]) fr = '';
    const stOf = (c, fset) => fset.has(c.word) ? 'forget' : 'm' + SRS().mastery(c.srs);
    const label = k => ({ m3: t('Đã thuộc'), m2: t('Quen'), m1: t('Đang học'), m0: t('Chưa học'), forget: t('Sắp quên') })[k];
    const dn = () => { const T = TOPICS.find(x => x.id === tp); return T ? T.name : tp.startsWith('deck:') ? tp.slice(5) : t('Sổ từ'); };
    let shown = [];
    const data = () => {
      const S = SRS(), list = Object.values(state.cards), fset = new Set(App.forgetting().map(c => c.word)), end = Core.endOfToday(), ql = q.trim().toLowerCase();
      const rows = list.filter(c => (!ql || c.word.includes(ql) || (c.vi || '').toLowerCase().includes(ql)) && (!tp || (tp.startsWith('deck:') ? c.deck === tp.slice(5) : c.topic === tp)) && (m === '' || S.mastery(c.srs) === +m)
        && (!fr || (fr === 'forget' ? fset.has(c.word) : App.origin(c) === fr))).sort((a, b) => fr === 'forget' ? S.retention(a.srs) - S.retention(b.srs) : b.added - a.added);
      shown = rows;
      const mast = App.masteredCount(), due = list.filter(c => (c.srs.reps > 0 || c.srs.last) && c.srs.due <= end).length;
      const ex = (App.EXAMS || {})[App.exam ? App.exam() : 'ielts'] || { short: 'IELTS' }, se = state.settings || {};
      const decks = [...new Set(list.map(c => c.deck).filter(Boolean))].sort();
      const T = TOPICS.find(x => x.id === tp), O = ORIGINS[fr];
      const tVal = T ? T.name : tp === 'mine' ? t('Từ tự thêm') : tp.startsWith('deck:') ? tp.slice(5) : t('Tất cả bộ từ');
      const fVal = O ? O.name : fr === 'forget' ? t('Sắp quên') : t('Mọi nguồn');
      const mVal = m === '' ? t('Mọi mức độ') : label('m' + m);
      const sel = (id, al, opts) => `<select id="${id}" class="${SEL}" aria-label="${esc(al)}">${opts}</select>`;
      const chips = [
        { on: !!tp, icon: 'category', label: t('Bộ từ'), val: tVal, sel: sel('filterTopic', t('Chọn bộ từ'), opt('', t('Tất cả bộ từ'), tp) + TOPICS.map(x => opt(x.id, `${x.emoji} ${x.name}`, tp)).join('') + opt('mine', `📌 ${t('Từ tự thêm')}`, tp) + decks.map(d => opt('deck:' + d, `🃏 ${d}`, tp)).join('')) },
        { on: !!fr, icon: 'travel_explore', label: t('Nguồn'), val: fVal, sel: sel('filterFrom', t('Mọi nguồn'), opt('', t('Mọi nguồn'), fr) + Object.entries(ORIGINS).map(([k, o]) => opt(k, `${o.emoji} ${o.name}`, fr)).join('') + opt('forget', `⚠️ ${t('Sắp quên')}`, fr)) },
        { on: m !== '', icon: 'military_tech', label: t('Mức thuộc'), val: mVal, sel: sel('filterM', t('Mọi mức độ'), opt('', t('Mọi mức độ'), m) + [0, 1, 2, 3].map(i => opt(String(i), label('m' + i), m)).join('')) },
      ];
      const lang = I18N.lang();
      return {
        title: t('Sổ từ của bạn'), backL: t('Trở về trang trước'), findL: t('Tìm trong sổ từ'), mastL: t('Mức thuộc'),
        exam: se.goal && se.goal.exam && App.goalLabel ? `${ex.short} ${App.goalLabel(se.goal)}` : ex.short,
        savedN: t('{n} từ đã lưu', { n: list.length }), mastN: t('{n} đã thuộc', { n: mast }), pct: list.length ? Math.round(mast / list.length * 100) : 0,
        dueT: t('{n} đến hạn', { n: due }), testT: t('{n} từ', { n: list.length }),
        shareL: t('Chia sẻ bộ thẻ'), importL: t('Nhập'), ankiOutL: t('Xuất sang Anki'), ankiInL: t('Nhập từ Anki'),
        qPh: t('Tìm từ hoặc nghĩa…'), q, micL: t('Tìm bằng giọng nói'), filtL: t('Bộ lọc'), chips,
        listT: t('Từ đã lưu ({n} đang hiện)', { n: Math.min(rows.length, CAP) }), sortT: fr === 'forget' ? t('Sắp xếp: dễ quên trước') : t('Sắp xếp: mới thêm'),
        speakL: t('Phát âm'), editL: t('Sửa'),
        rows: rows.slice(0, CAP).map(c => {
          const k = stOf(c, fset), s = ST[k], r = S.retention(c.srs), isDue = (c.srs.reps > 0 || c.srs.last) && c.srs.due <= end, v = isDue ? 'due' : 'plain';
          const cx = c.contexts && c.contexts[0], o = ORIGINS[App.origin(c)], T2 = TOPICS.find(x => x.id === c.topic);
          const ctxH = cx ? `“${UI.highlight(cx.text.slice(0, 110), c.word).replace(/<mark>/g, `<span class="${HL[v]}">`).replace(/<\/mark>/g, '</span>')}${cx.text.length > 110 ? '…' : ''}”` : esc((c.def || '').slice(0, 110));
          const dots = [1, 2, 3, 4, 5].map(i => `<span class="${DOT} ${i <= s.n ? s.dot : OFF}"></span>`).join('') + `<span class="text-[10px] font-extrabold ml-1 uppercase whitespace-nowrap ${s.tx}">${esc(label(k))}</span>`;
          const pr = r != null ? Math.round(r * 100) : null;
          return {
            due: isDue, word: c.word, url: UI.audioFor(c),
            emH: c.image ? `<img src="${esc(c.image)}" alt="" class="w-full h-full object-cover rounded-[13px]" loading="lazy" referrerpolicy="no-referrer">` : esc(c.emoji || '📘'),
            wordH: `<a class="[color:inherit] hover:underline" href="#/dict/${encodeURIComponent(c.word)}">${esc(c.word)}</a>`, ipa: c.ipa || '', pos: posT(c.pos), mean: App.meanOf(c), ctxH,
            dotsH: dots, mL: `${t('Mức thuộc')}: ${label(k)}`,
            src: [o ? o.name : '', T2 ? T2.name : c.deck || '', isDue && v !== 'due' ? t('Ôn hôm nay') : ''].filter(Boolean).join(' · '),
            retH: pr == null ? '' : `<span class="material-symbols-rounded text-[12px]" aria-hidden="true">${pr >= 85 ? 'trending_up' : pr >= 60 ? 'horizontal_rule' : 'trending_down'}</span> ${pr}%`,
            chipC: CHIP[pr == null || pr >= 85 ? 'good' : pr >= 60 ? 'mid' : 'bad'], dueL: t('Đến hạn {date}', { date: new Date(c.srs.due).toLocaleDateString(lang) }),
          };
        }),
        noteH: !rows.length ? `<div class="${EMPTY}" data-deck-empty><div class="text-[22px] pb-2" aria-hidden="true">📒</div>${list.length ? t('Không có từ phù hợp bộ lọc.') : t('Sổ từ đang trống. Hãy thêm từ từ <a href="#/library">thư viện</a> hoặc <a href="#/dict">tra từ</a>.')}</div>`
          : rows.length > CAP ? `<p class="${NOTE}">${t('Hiển thị 400/{n} từ – dùng bộ lọc để thu hẹp.', { n: rows.length })}</p>` : '',
      };
    };
    const draw = focusId => {
      const fo = focusId && document.getElementById(focusId), caret = fo && fo.id === 'filterQ' ? [fo.selectionStart, fo.selectionEnd] : null;
      const root = ST2.mount(view, 'deck', data(), 'train'), $r = s => root.querySelector(s), $$r = s => [...root.querySelectorAll(s)];
      const shH = root.querySelector(':scope > header'); if (shH) shH.remove(); // mẫu Sổ từ có đầu trang riêng (quay lại · tiêu đề · tìm · thanh % thuộc) → bỏ đầu trang chung của shell (cố định, che đầu trang Stitch); thanh tab dưới giữ
      const qi = $r('#filterQ');
      qi.oninput = () => { q = qi.value; draw('filterQ'); };
      [['filterTopic', v => { tp = v; }], ['filterFrom', v => { fr = v; }], ['filterM', v => { m = v; }]].forEach(([id, set]) => { const s = $r('#' + id); s.onchange = () => { set(s.value); draw(id); }; });
      if (focusId) { const f = $r('#' + focusId); if (f) { f.focus({ preventScroll: true }); if (caret) try { f.setSelectionRange(caret[0], caret[1]); } catch (e) { /* bỏ qua */ } } }
      $r('#dkFind').onclick = () => { qi.focus(); qi.scrollIntoView && qi.scrollIntoView({ block: 'center' }); };
      const mic = $r('#dkMic');
      mic.onclick = () => {
        if (rec) { rec.stop(); return; }
        rec = UI.recognize('', state.settings.accent || 'en-GB', {
          start: () => mic.setAttribute('aria-pressed', 'true'),
          result: ({ heard }) => { if (heard) { q = heard.toLowerCase(); draw('filterQ'); } },
          error: c => UI.toast(UI.recErrorText(c), 3500),
          end: () => { rec = null; mic.removeAttribute('aria-pressed'); },
        });
      };
      $r('#shareBtn').onclick = () => { const T = TOPICS.find(x => x.id === tp); App.shareDeck(T ? T.name : t('Bộ từ của {n}', { n: (state.user && state.user.displayName) || 'Lexkite' }), shown); };
      $r('#exportBtn').onclick = () => App.xport({ shown, name: dn() });
      $r('#importBtn').onclick = () => $r('#importFile').click();
      $r('#importFile').onchange = App.settingsDeps.importData;
      $r('#ankiOut').onclick = () => App.anki('export', { ...App.settingsDeps.ankiAll(), shown, name: dn() });
      $r('#ankiIn').onclick = () => App.anki('import');
      App.bindCommon(); // [data-speak] phát âm (kèm data-url)
      $$r('[data-edit]').forEach(b => b.onclick = () => App.editCard(b.dataset.edit, () => draw()));
    };
    draw();
  };
})();
