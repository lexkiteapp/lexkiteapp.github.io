/* 🏁 Tab Thi (Stitch v2 "hub-tests", khung tự sinh web/js/st/v2/hub-tests.js · bind/hub-tests.json): kỳ thi, điểm thật gần nhất, thẻ giáo viên, đề theo kỳ thi, lịch sử điểm.
 * Tải lười (gói testsv2): hubs.js chỉ gọi App.testsV2 khi cờ ux1 bật và gói có mặt, thiếu gói thì vẽ bản cũ (đủ mục như nhau). Không số giả: chưa có điểm thì không hiện thẻ điểm.
 * @icons flag headphones desktop_windows work account_balance rule mic edit_note auto_stories */
(function () {
  const { state } = App, teacher = o => (window.Chars && Chars.slot ? Chars.slot('ama', Object.assign({ size: 'xs', lazy: false }, o)) : '');
  const SI = { listening: 'headphones', reading: 'auto_stories', writing: 'edit_note', speaking: 'mic' };
  const IC = { '#/mock': 'flag', '#/listening': 'headphones', '#/cbt': 'desktop_windows', '#/toeic': 'work', '#/toefl': 'account_balance' }, ic = h => IC[h] || 'rule';
  const tests = ({ SK, mocks, toeic, rows, T, fmt }) => {
    const ex = App.exam(), X = App.EXAMS[ex], list = T[ex] || T.ielts, [h, , ti, de] = list[0], P = ST2.P['hub-tests'](), row = ([href, , title, desc]) => P.row({ href, icon: ic(href), title, desc });
    const m = /^ielts/.test(ex) ? mocks[0] : null, tg = parseFloat(state.settings.examTarget), last = ex === 'toeic' ? toeic[0] : null, bands = m && m.bands ? Object.keys(SK).filter(k => m.bands[k] != null).map(k => ({ k, name: SK[k].name(), val: String(m.bands[k]) })) : [], low = bands.slice().sort((a, b) => a.val - b.val)[0], gap = m && m.overall != null && tg > m.overall ? tg - m.overall : 0;
    const MIN = { listening: 30, reading: 60, writing: 60, speaking: 12 };
    ST2.mount(App.view, 'hub-tests', { teacher: teacher({ pose: 'happy' }), placeSub: state.settings.placement ? t('Làm lại để cập nhật trình độ') : t('Biết ngay trình độ để có lộ trình phù hợp'),
      tip: low ? t('Nên luyện thêm {skill}: điểm thấp nhất ở lần thi gần nhất.', { skill: low.name }) : (rows.length ? t('Làm đề đầy đủ có tính giờ khi đã sẵn sàng') : t('Chưa có bài thi nào. Làm bài kiểm tra trình độ 5 phút để bắt đầu.')),
      exams: Object.keys(App.EXAMS).map(k => ({ k, short: App.EXAMS[k].short, name: App.EXAMS[k].name, on: k === ex })),
      ready: m && m.overall != null ? [{ score: 'Band ' + m.overall, target: tg ? t('Mục tiêu') + ' ' + tg : '', gap: gap ? ['+' + gap] : [], bands }] : last ? [{ score: last.total + '/990', target: '', gap: [], bands: [] }] : [],
      main: { href: h, exam: X.name, title: ti, chip: '', mods: /^ielts/.test(ex) ? Object.keys(SK).map(k => ({ icon: SI[k], name: SK[k].name(), sub: t('{n} phút', { n: MIN[k] }) })) : [], desc: de },
      more: list.slice(1).map(row).join(''),
      rows: rows.length ? rows.map(r => ({ score: String(r[3]).replace(/^Band /, '').replace(/\/990$/, '') || '–', title: r[2], meta: r[1] + (fmt(r[0]) ? ' · ' + fmt(r[0]) : '') })) : [{ score: '–', title: t('Chưa có bài thi nào. Làm bài kiểm tra trình độ 5 phút để bắt đầu.'), meta: '' }],
      other: `<details class="rounded-[1rem] border-2 p-3 lt:bg-[#ffffff] lt:border-[#efe0d6] dk:border-[#25393E] dk:[background-color:#172427]"><summary class="min-h-[44px] flex items-center font-extrabold cursor-pointer">${ST.esc(t('Kỳ thi khác'))}</summary><div class="flex flex-col gap-3 pt-2">${Object.keys(T).filter(e => e !== ex && e !== 'ieltsgt' && !(ex === 'ieltsgt' && e === 'ielts')).map(e => T[e].map(row).join('')).join('')}</div></details>` }, 'tests');
  };
  document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('[data-exam-set]'); if (b && b.getAttribute('aria-pressed') !== 'true') App.setExam(b.dataset.examSet); });
  if (window.App) App.testsV2 = tests;
})();
