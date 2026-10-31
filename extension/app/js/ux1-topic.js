/* 🎨 Stitch v2.1 "Bộ từ" (#/topic/:id, cờ ux1): khung tự sinh web/js/st/v2/topic.js · brand/stitch/v2/bind/topic.json. Tải trong gói ux1 (lười, không vào khung app).
 * Bao routes.topic của app.js: cờ ux1 bật → khung Stitch; tắt → trang cũ nguyên vẹn. Giữ MỌI ý trang cũ: quay lại nhóm · #addAll (thêm mọi từ còn thiếu) · #tCount ·
 * 4 chế độ luyện (Học/Ghép thẻ/Kiểm tra ?src=topic:id, Nghe rảnh tay) · #tpAnki · #lvTabs (data-lv, .on) · #wordList: từ → #/dict/…, [data-speak], [data-add-seed][data-topic],
 * nghĩa (ngôn ngữ người học) + định nghĩa, câu ví dụ tô từ, collocation. Bộ > 20 từ: hiện 20 đầu + "Xem cả n từ" (#tpMore) – không mất từ nào.
 * @icons arrow_back bookmark_add check inventory_2 check_circle download school style quiz headphones volume_up add link expand_more */
(function () {
  const App = window.App; if (!App || !App.routes || !App.routes.topic || !self.IELTS_DATA) return;
  const { state, routes } = App, old = routes.topic, { GROUPS } = IELTS_DATA, esc = UI.esc;
  const on = () => !!(self.ST2 && ST2.topic && App.ux1On && App.ux1On());
  const PAGE = 20;
  const HL = 'font-extrabold underline decoration-2 lt:text-[#0D6964] dk:text-[#6BD8CE]', QT = 'font-bold lt:text-[#0D6964] dk:text-[#6BD8CE]';
  const exH = w => w.ex ? `<span class="${QT}">“</span>${UI.highlight(w.ex, w.word).replace(/<mark>/g, `<span class="${HL}">`).replace(/<\/mark>/g, '</span>')}<span class="${QT}">”</span>` : '';
  const posT = p => p ? String(UI.posChip(p)).replace(/<[^>]+>/g, '').trim() : '';

  routes.topic = function (id, query) {
    const tp = App.topicOf(id);
    if (!on() || !tp) return old.apply(this, arguments);
    const levels = [...new Set(tp.words.map(w => w.level).filter(Boolean))].sort();
    const missing = () => tp.words.filter(w => !App.inDeck(w.word));
    const gr = GROUPS.find(g => g.id === tp.group) || {};
    const q0 = query && query.get && query.get('lv');
    let lv = levels.length > 1 && levels.includes(q0) ? q0 : '', all = false;
    const view = App.view;
    const data = () => {
      const m = missing().length, n = tp.words.length - m, list = tp.words.filter(w => !lv || w.level === lv), more = !all && list.length > PAGE;
      return {
        id: tp.id, group: tp.group, gname: gr.name || '', backL: t('Trở về trang trước'), emoji: tp.emoji, tag: [gr.name, levels.join(' · ')].filter(Boolean).join(' · '), name: tp.name, desc: tp.desc,
        wordsN: t('{n} từ', { n: tp.words.length }), addedN: t('{n} đã thêm', { n }), pct: Math.round(n / tp.words.length * 100), missing: m,
        addL: m ? `+ ${t('Thêm {n} từ vào flashcard', { n: m })}` : `✓ ${t('Đã thêm toàn bộ')}`, lvL: t('Cấp độ CEFR'), speakL: t('Phát âm'),
        lvs: levels.length > 1 ? [{ l: '', label: t('Tất cả'), n: tp.words.length, on: !lv }].concat(levels.map(l => ({ l, label: l, n: tp.words.filter(w => w.level === l).length, on: l === lv }))) : [],
        rows: (more ? list.slice(0, PAGE) : list).map(w => {
          const mean = App.meanOf(w);
          return { word: w.word, added: App.inDeck(w.word), emoji: w.emoji || '📘', wordH: `<a class="w hover:underline" href="#/dict/${encodeURIComponent(w.word)}">${esc(w.word)}</a>`, pos: posT(w.pos), level: w.level || '',
            ipaH: UI.ipaHtml(w, null, { cls: 'ipa-t', noEx: true }), mean, def: w.def && mean !== w.def ? w.def : '', exH: exH(w), col: (w.col || []).join(' · ') };
        }),
        more, moreL: t('Xem cả {n} từ', { n: list.length }),
      };
    };
    const draw = () => {
      const root = ST2.mount(view, 'topic', data(), 'train'), $r = s => root.querySelector(s), $$r = s => [...root.querySelectorAll(s)];
      { const sh = root.querySelector(':scope > header'); if (sh && root.querySelector(':scope > div > header')) sh.remove(); } // mẫu có đầu trang riêng (quay lại nhóm + chuỗi/XP) → bỏ đầu trang shell cố định đang che nó; thanh tab dưới giữ
      const add = $r('#addAll'); add.disabled = !missing().length;
      $$r('[data-added]').forEach(b => { b.disabled = true; });
      $$r('#lvTabs [data-lv]').forEach(b => b.onclick = () => { lv = b.dataset.lv; all = false; draw(); });
      const mo = $r('#tpMore'); if (mo) mo.onclick = () => { all = true; draw(); };
      $r('#tpAnki').onclick = e => { e.preventDefault(); App.anki('export', { cards: tp.words.map(w => state.cards[w.word.toLowerCase()] || w), name: tp.name, progress: false }); };
      add.onclick = async () => {
        const list = missing(); add.disabled = true;
        for (const w of list) await App.addWord(w, null, { silent: true });
        Sfx.win(); UI.toast(t('Đã thêm {n} từ – vào Ôn tập hoặc Học thông minh để bắt đầu!', { n: list.length }));
        draw();
      };
      App.bindCommon(draw); // [data-speak] phát âm · [data-add-seed] thêm 1 từ → dựng lại (đếm + nút Thêm hết cập nhật)
    };
    draw();
  };
})();
