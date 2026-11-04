/* 🧭 3 hub (Từ vựng · Kỹ năng · Thi) khung Stitch v2 khi cờ ux1 bật: dựng d từ dữ liệu thật rồi ST2.mount (bind: brand/stitch/v2/bind/hub-*.json; quy trình docs/STITCH-V2-PORT.md).
 * Nạp lười (gói hubv2, chỉ khi cờ bật). Cờ tắt → bản cũ trong js/hubs.js, đủ mục như nhau. Dữ liệu kỳ thi/bài dùng chung qua App.hub (hubs.js). Không số giả: chưa có điểm → ẩn, nói bước tiếp theo.
 * @icons folder chat_bubble link sports_esports spellcheck trending_up desktop_windows menu_book school flag headphones auto_stories edit_note mic bolt graphic_eq assignment_late work account_balance rule style */
(function () {
  const { state, view } = App, N = n => (+n || 0).toLocaleString(I18N.lang()), teacher = (o) => (window.Chars && Chars.slot ? Chars.slot('ama', Object.assign({ size: 'xs', lazy: false }, o)) : '');
  // Bộ màu thẻ (nguyên văn mẫu Stitch): nền+viền+bóng ô icon · chữ icon · viên số
  const TV = [['lt:bg-[#e6f4f2] lt:border-[#bfe4df] lt:shadow-[0_1.5px_0_#d3ede9]', 'lt:text-[#00504b] dk:text-[#6bd8ce]', 'lt:text-[#00504b] lt:bg-[#e6f4f2] lt:border-[#c1e5e0] dk:text-[#6bd8ce]'],
    ['lt:bg-[#fff9e6] lt:border-[#fce7ab] lt:shadow-[0_1.5px_0_#fae092]', 'lt:text-[#8c6500] dk:text-[#f4bf40]', 'lt:text-[#8c6500] lt:bg-[#fff9e6] lt:border-[#fce49e] dk:text-[#f4bf40]'],
    ['lt:bg-[#fff0ed] lt:border-[#fed4cd] lt:shadow-[0_1.5px_0_#fac6be]', 'lt:text-[#b0351f] dk:text-[#ffb4a6]', 'lt:text-[#a0301a] lt:bg-[#fff0ed] lt:border-[#ffd2c8] dk:text-[#ffb4a6]'],
    ['lt:bg-[#fff3e0] lt:border-[#ffddb3] lt:shadow-[0_1.5px_0_#fed39f]', 'lt:text-[#b85b00] dk:text-[#fd9500]', 'lt:text-[#994c00] lt:bg-[#fff3e0] lt:border-[#ffdbad] dk:text-[#fd9500]']];
  const TS = ['lt:bg-[#a4f1e7] lt:text-[#00504b] lt:border-[#00504b] dk:text-[#2DD4BF]', 'lt:bg-[#f4e5db] lt:text-[#136a63] lt:border-[#e6d7cd] dk:text-[#FDBA74]', 'lt:bg-[#ffdf9b] lt:text-[#5b4300] lt:border-[#5b4300] dk:text-[#FBBF24]', 'lt:bg-[#ffdcbf] lt:text-[#8c5000] lt:border-[#8c5000] dk:text-[#2DD4BF]'];
  const SI = { listening: 'headphones', reading: 'auto_stories', writing: 'edit_note', speaking: 'mic' };
  const lastMock = async w => (await w(Core.Store.get('mocks', [])) || [])[0] || null;

  const vocab = () => {
    const { total } = Core.Cards.dueCount(state.cards, state.settings, state.stats), deck = Object.values(state.cards), mastered = deck.filter(c => c.srs && c.srs.interval >= 21).length, ex = App.exam();
    const stat = t('{n} từ · {m} từ đã thuộc', { n: N(deck.length), m: N(mastered) }), c = (href, icon, title, sub, tint, chip) => ({ href, icon, title, sub, tint: TV[tint], chip: chip || '' });
    ST2.mount(view, 'hub-vocab', { exam: App.EXAMS[ex].short, deckStat: stat, due: N(total), cta: total ? t('Ôn ngay') : t('Học từ mới'), ctaHref: '#/review?hub=1',
      ctaAria: total ? t('Ôn {n} thẻ hôm nay', { n: total }) : t('Không còn thẻ cần ôn – học từ mới nhé'),
      cards: [c('#/dict', 'menu_book', t('Từ điển'), t('Phát âm, nghĩa, ví dụ, lưu thành thẻ'), 0), c('#/deck', 'style', t('Sổ từ của tôi'), stat, 1, deck.length ? N(deck.length) : ''),
        c('#/library' + (ex === 'toeic' ? '?g=toeic' : ''), 'folder', t('Thư viện từ'), t('Bộ từ theo chủ đề, kỳ thi và trình độ'), 2), c('#/phrases', 'chat_bubble', t('Cụm từ & cấu trúc'), t('Collocation và cấu trúc ăn điểm'), 0),
        c('#/verb', 'bolt', t('Chia động từ'), t('Mọi thì, bị động, cách đọc -ed/-s'), 3), c('#/usage', 'link', t('Cách dùng từ'), t('Giới từ đi kèm, to-V/V-ing, trạng từ, từ dễ nhầm'), 0)] }, 'vocab');
  };

  const skills = App.guard(async function () {
    const w = App.W, ex = App.exam(), g = state.game || {}, { SK, itemsFor } = App.hub, X = App.EXAMS[ex], m = /^ielts/.test(ex) ? await lastMock(w) : null;
    const done = { listening: g.listenDone, reading: g.readDone, grammar: g.grammarDone, pron: g.pronDone }, n = o => Object.keys(o || {}).length, dn = k => (n(done[k]) ? t('{n} bài đã làm', { n: n(done[k]) }) : '');
    const off = Object.keys(SK).filter(k => !itemsFor(k, ex));
    ST2.mount(view, 'hub-skills', { exam: X.short, sub: t('Dạng bài {exam}', { exam: X.name }), teacher: teacher({ pose: 'point' }),
      skills: Object.keys(SK).map((k, i) => { const list = itemsFor(k, ex); return list && { href: '#/skill/' + k, name: SK[k].name(), icon: SI[k], tint: TS[i], sub: list.map(x => x[2]).slice(0, 3).join(' · '), done: dn(k), band: m && m.bands && m.bands[k] != null ? 'Band ' + m.bands[k] : '' }; }).filter(Boolean),
      off: off.length ? `<p class="text-[14px] leading-[20px] font-[500] lt:text-[#3f4947] dk:text-[#A9BDBB]">${ST.esc(t('{exam} không thi {skills}.', { exam: X.short, skills: off.map(k => SK[k].name()).join(', ') }))} <a class="inline-flex items-center min-h-[44px] underline lt:text-[#00504b] dk:text-[#2DD4BF]" href="#/skill/${off[0]}">${ST.esc(t('Vẫn muốn luyện?'))}</a></p>` : '',
      rows: [['#/grammar', 'spellcheck', t('Ngữ pháp'), t('Bài học ngắn kèm bài tập'), 2, 'grammar'], ['#/pron', 'graphic_eq', t('Phát âm'), t('Âm khó, trọng âm, chấm phát âm từ'), 0, 'pron'], ['#/train', 'bolt', t('Luyện'), t('Mọi bài luyện theo nhóm, luyện thi trước'), 3], ['#/mistakes', 'assignment_late', t('Sổ lỗi sai'), t('Làm lại các câu đã sai để không sai lần nữa'), 1], ['#/tests', 'flag', t('Thi thử'), t('Làm đề đầy đủ có tính giờ khi đã sẵn sàng'), 0]]
        .map(([href, icon, title, sub, c, k]) => ({ href, icon, title, sub: k && dn(k) ? sub + ' · ' + dn(k) : sub, tint: TS[c] })) }, 'skills');
  });

  // Hub Thi (route trong hubs.js: rows = lịch sử điểm thật [ngày, kỳ thi, tên, điểm], T = bài theo kỳ thi [đường dẫn, _, tên, mô tả], fmt = định dạng ngày)
  const IC = { '#/mock': 'flag', '#/listening': 'headphones', '#/cbt': 'desktop_windows', '#/toeic': 'work', '#/toefl': 'account_balance' }, ic = h => IC[h] || 'rule';
  const tests = ({ mocks, toeic, rows, T, fmt }) => {
    const ex = App.exam(), { SK } = App.hub, X = App.EXAMS[ex], list = T[ex] || T.ielts, [h, , ti, de] = list[0], P = ST2.P['hub-tests'](), row = ([href, , title, desc]) => P.row({ href, icon: ic(href), title, desc });
    const m = /^ielts/.test(ex) ? mocks[0] : null, tg = parseFloat(state.settings.examTarget), last = ex === 'toeic' ? toeic[0] : null, bands = m && m.bands ? Object.keys(SK).filter(k => m.bands[k] != null).map(k => ({ k, name: SK[k].name(), val: String(m.bands[k]) })) : [], low = bands.slice().sort((a, b) => a.val - b.val)[0], gap = m && m.overall != null && tg > m.overall ? tg - m.overall : 0;
    const MIN = { listening: 30, reading: 60, writing: 60, speaking: 12 };
    ST2.mount(view, 'hub-tests', { teacher: teacher({ pose: 'happy' }), placeSub: state.settings.placement ? t('Làm lại để cập nhật trình độ') : t('Biết ngay trình độ để có lộ trình phù hợp'),
      tip: low ? t('Nên luyện thêm {skill}: điểm thấp nhất ở lần thi gần nhất.', { skill: low.name }) : (rows.length ? t('Làm đề đầy đủ có tính giờ khi đã sẵn sàng') : t('Chưa có bài thi nào. Làm bài kiểm tra trình độ 5 phút để bắt đầu.')),
      exams: Object.keys(App.EXAMS).map(k => ({ k, short: App.EXAMS[k].short, name: App.EXAMS[k].name, on: k === ex })),
      ready: m && m.overall != null ? [{ score: 'Band ' + m.overall, target: tg ? t('Mục tiêu') + ' ' + tg : '', gap: gap ? ['+' + gap] : [], bands }] : last ? [{ score: last.total + '/990', target: '', gap: [], bands: [] }] : [],
      main: { href: h, exam: X.name, title: ti, chip: '', mods: /^ielts/.test(ex) ? Object.keys(SK).map(k => ({ icon: SI[k], name: SK[k].name(), sub: t('{n} phút', { n: MIN[k] }) })) : [], desc: de },
      more: list.slice(1).map(row).join(''),
      rows: rows.length ? rows.map(r => ({ score: String(r[3]).replace(/^Band /, '').replace(/\/990$/, '') || '–', title: r[2], meta: r[1] + (fmt(r[0]) ? ' · ' + fmt(r[0]) : '') })) : [{ score: '–', title: t('Chưa có bài thi nào. Làm bài kiểm tra trình độ 5 phút để bắt đầu.'), meta: '' }],
      other: `<details class="rounded-[1rem] border-2 p-3 lt:bg-[#ffffff] lt:border-[#efe0d6] dk:border-[#25393E] dk:[background-color:#172427]"><summary class="min-h-[44px] flex items-center font-extrabold cursor-pointer">${ST.esc(t('Kỳ thi khác'))}</summary><div class="flex flex-col gap-3 pt-2">${Object.keys(T).filter(e => e !== ex && e !== 'ieltsgt' && !(ex === 'ieltsgt' && e === 'ielts')).map(e => T[e].map(row).join('')).join('')}</div></details>` }, 'tests');
  };

  document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('[data-exam-set]'); if (b && b.getAttribute('aria-pressed') !== 'true') App.setExam(b.dataset.examSet); });
  window.HubV2 = { vocab, skills, tests };
})();
