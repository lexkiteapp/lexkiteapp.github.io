/* 🎨 Stitch v2.1 "Thư viện" (#/library, cờ ux1): khung tự sinh web/js/st/v2/library.js · brand/stitch/v2/bind/library.json. Tải trong gói ux1 (lười, không vào khung app).
 * Bao routes.library của app.js: cờ ux1 bật → khung Stitch; tắt → trang cũ nguyên vẹn. Giữ MỌI ý trang cũ: ô lọc #libQ · Anki xuất/nhập #libAnkiOut/#libAnkiIn · tab nhóm #libTabs (data-g, .on)
 * + "Đang học" (mine: Thư viện của tôi theo nguồn → #/deck?from=… + bộ đang học) · lọc CEFR [data-lvf] (aria-pressed) · "Xem cả n bộ" [data-go-g] · URL #/library?g=…&lv=… · trạng thái trống.
 * Thẻ nổi bật = bộ đang học dở nhiều nhất (không có → bộ đầu của nhóm theo kỳ thi) – dữ liệu thật (A/B chủ). "Tạo bộ từ của bạn" → Nhập từ Anki (tính năng thật).
 * @icons apps push_pin foundation school edit_note record_voice_over work category quiz business_center menu_book */
(function () {
  const App = window.App; if (!App || !App.routes || !App.routes.library || !self.IELTS_DATA) return;
  const { state, routes } = App, old = routes.library, { TOPICS, GROUPS, INDEX } = IELTS_DATA, { SRS, endOfToday } = Core;
  const on = () => !!(self.ST2 && ST2.library && App.ux1On && App.ux1On());
  const IC = { core: 'foundation', topics: 'school', writing: 'edit_note', speaking: 'record_voice_over', toeic: 'work', bsl: 'work', domain: 'category', exam: 'quiz', awl: 'school', office: 'business_center', nawl: 'menu_book', mine: 'push_pin' };
  const CV = ['teal', 'amber', 'coral'], num = n => (n || 0).toLocaleString(I18N.lang());
  const EMPTY = 'rounded-2xl border-2 p-5 text-center text-sm font-medium lt:bg-white lt:border-[#EADEC8] lt:text-[#4E5F62] dk:bg-[#142328] dk:border-[#233942] dk:text-[#8FA9AF]';
  const empty = (em, msg) => `<div class="${EMPTY}" data-lib-empty><div class="text-3xl pb-2" aria-hidden="true">${em}</div>${msg}</div>`;
  const pctOf = tp => Math.round(tp.words.filter(w => App.inDeck(w.word)).length / tp.words.length * 100);
  const cardV = (pct, i) => pct >= 100 ? 'done' : pct <= 0 ? 'zero' : CV[i % 3];

  function topicCard(tp, i, lvf) {
    const n = tp.words.filter(w => App.inDeck(w.word)).length, pct = Math.round(n / tp.words.length * 100);
    const lv = [...new Set(tp.words.map(w => w.level).filter(Boolean))].sort().join(' · ');
    const words = t('{n} từ', { n: tp.words.length }) + (lv ? ' · ' + lv : '');
    return { v: cardV(pct, i), href: `#/topic/${tp.id}${lvf ? '?lv=' + lvf : ''}`, emoji: tp.emoji, pct, name: tp.name, desc: tp.desc, words, added: t('{n} đã thêm', { n }), al: `${tp.name} · ${words} · ${n}/${tp.words.length}` };
  }
  // "Thư viện của tôi": từ đã lưu tự chia theo nguồn gặp từ (App.ORIGINS) – như personalCollections() của trang cũ
  function mineCards() {
    const groups = {};
    Object.values(state.cards).forEach(c => { const o = App.origin(c); (groups[o] = groups[o] || []).push(c); });
    return Object.keys(App.ORIGINS).filter(k => groups[k]).map((k, i) => {
      const list = groups[k], o = App.ORIGINS[k], m = list.filter(c => SRS.mastery(c.srs) === 3).length, due = list.filter(c => (c.srs.reps > 0 || c.srs.last) && c.srs.due <= endOfToday()).length, pct = Math.round(m / list.length * 100);
      return { v: cardV(pct, i), href: `#/deck?from=${k}`, emoji: o.emoji, pct, name: o.name, desc: o.desc, words: t('{n} từ', { n: list.length }), added: due ? t('{n} cần ôn', { n: due }) : `${m}/${list.length}`, al: `${o.name} · ${t('{n} từ', { n: list.length })} · ${m}/${list.length}` };
    });
  }

  function page(g, lvf, q) {
    const ql = q.trim().toLowerCase();
    const hasLv = tp => { if (!lvf) return true; const n = tp.words.filter(w => w.level === lvf).length; return n >= 5 || n >= tp.words.length * 0.3 && n > 0; };
    const match = tp => hasLv(tp) && (!ql || tp.name.toLowerCase().includes(ql) || tp.desc.toLowerCase().includes(ql) || tp.words.some(w => w.word.toLowerCase() === ql));
    const mineN = TOPICS.filter(tp => tp.words.some(w => App.inDeck(w.word))).length;
    const secs = []; let emptyH = '';
    if (g === 'mine') {
      const mc = mineCards(), ts = TOPICS.filter(tp => tp.words.some(w => App.inDeck(w.word)) && match(tp));
      if (mc.length) secs.push({ g: 'mine', icon: IC.mine, name: t('Thư viện của tôi'), desc: t('Tự động phân loại theo nơi bạn gặp từ'), count: num(mc.length), cut: false, more: '', cards: mc });
      if (ts.length) secs.push({ g: 'mine', icon: 'menu_book', name: mc.length ? t('Bộ từ IELTS đang học') : t('Bộ từ đang học'), desc: '', count: num(ts.length), cut: false, more: '', cards: ts.map((tp, i) => topicCard(tp, i, lvf)) });
      if (!secs.length) emptyH = empty('📌', t('Bạn chưa lưu từ nào. Tra từ, đọc bài hoặc dùng add-on khi xem YouTube để bắt đầu.'));
    } else {
      (g === 'all' ? GROUPS : GROUPS.filter(x => x.id === g)).forEach(gr => {
        const ts = TOPICS.filter(tp => tp.group === gr.id && match(tp)); if (!ts.length) return;
        const cut = g === 'all' && !ql && ts.length > 6; // Tab "Tất cả": mỗi nhóm 6 bộ đầu + nút xem hết → không ngợp
        secs.push({ g: gr.id, icon: IC[gr.id] || 'menu_book', name: gr.name, desc: gr.desc, count: num(ts.length), cut, more: t('Xem cả {n} bộ', { n: ts.length }), cards: (cut ? ts.slice(0, 6) : ts).map((tp, i) => topicCard(tp, i, lvf)) });
      });
      if (!secs.length) emptyH = empty('🔍', t('Không tìm thấy bộ từ phù hợp.'));
    }
    secs.forEach((s, i) => { s.v = i % 2 ? 'amber' : 'teal'; });
    // Thẻ nổi bật: bộ đang học dở nhiều nhất; chưa có → bộ đầu của nhóm theo kỳ thi
    let ft = null, best = 0;
    TOPICS.forEach(tp => { const p = pctOf(tp); if (p > best && p < 100) { best = p; ft = tp; } });
    if (!ft) { const ex = App.exam ? App.exam() : 'ielts', fg = ({ toeic: 'toeic', toefl: 'exam', general: 'core' })[ex] || 'topics'; ft = TOPICS.find(tp => tp.group === fg) || TOPICS[0]; }
    const fgr = ft && GROUPS.find(x => x.id === ft.group);
    const total = Object.keys(INDEX).length;
    return {
      words: t('{n} từ', { n: num(total) }), sets: t('{n} bộ', { n: num(TOPICS.length) }), q, qPh: t('Lọc bộ từ…'), ankiOut: t('Xuất sang Anki'), ankiIn: t('Nhập từ Anki'),
      groupsL: t('Nhóm bộ từ'), lvL: t('Cấp độ CEFR'),
      tabsG: [{ g: 'all', label: t('Tất cả'), icon: 'apps', on: g === 'all', n: 0 }].concat(GROUPS.map(x => ({ g: x.id, label: x.name, icon: '', on: g === x.id, n: 0 })), [{ g: 'mine', label: t('Đang học'), icon: 'push_pin', on: g === 'mine', n: mineN ? num(mineN) : 0 }]),
      lvs: ['', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map(l => ({ l, label: l || t('Tất cả'), on: l === lvf })),
      featL: t('Gợi ý cho bạn'), feat: ft && !ql ? { group: fgr ? fgr.name : '', name: ft.name, desc: ft.desc, href: `#/topic/${ft.id}` } : null,
      secs, empty: emptyH, newSetSub: t('Nhập bộ thẻ Anki (.apkg) của bạn thành bộ từ để học và ôn.'),
    };
  }

  routes.library = function (arg, query) {
    if (!on()) return old.apply(this, arguments);
    const ex = App.exam ? App.exam() : 'ielts', gq = query.get('g');
    let g = gq && (gq === 'all' || gq === 'mine' || GROUPS.some(x => x.id === gq)) ? gq : (Object.keys(state.cards).length >= 10 ? 'mine' : ({ toeic: 'toeic', toefl: 'exam', general: 'core' })[ex] || 'topics');
    let lvf = /^[ABC][12]$/.test(query.get('lv') || '') ? query.get('lv') : '', q = '';
    const view = App.view;
    const syncUrl = () => history.replaceState(null, '', location.pathname + location.search + `#/library?g=${g}${lvf ? '&lv=' + lvf : ''}`);
    const draw = (focusQ, scrollTab) => {
      const caret = focusQ ? [focusQ.selectionStart, focusQ.selectionEnd] : null;
      const root = ST2.mount(view, 'library', page(g, lvf, q), 'train');
      const $r = s => root.querySelector(s), $$r = s => [...root.querySelectorAll(s)];
      $$r('#libTabs [data-g]').forEach(b => b.onclick = () => { g = b.dataset.g; syncUrl(); draw(null, true); });
      $$r('[data-lvf]').forEach(b => b.onclick = () => { lvf = b.dataset.lvf; syncUrl(); draw(); });
      const qi = $r('#libQ'); if (qi) { qi.oninput = () => { q = qi.value; draw(qi); }; if (caret) { qi.focus(); try { qi.setSelectionRange(caret[0], caret[1]); } catch (e) { /* bỏ qua */ } } }
      const ao = $r('#libAnkiOut'), ai = $r('#libAnkiIn'), ns = $r('#libNewSet');
      if (ao) ao.onclick = () => App.anki('export', App.settingsDeps.ankiAll());
      if (ai) ai.onclick = () => App.anki('import');
      if (ns) ns.onclick = () => App.anki('import');
      root.addEventListener('click', e => { const a = e.target.closest('[data-go-g]'); if (!a) return; e.preventDefault(); g = a.dataset.goG; syncUrl(); draw(null, true); window.scrollTo(0, 0); });
      const on1 = $r('#libTabs .on'); if (scrollTab && on1 && on1.scrollIntoView) on1.scrollIntoView({ inline: 'center', block: 'nearest' });
      return root;
    };
    draw();
  };
})();
