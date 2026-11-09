/* 🎯 Tab Kỹ năng (Stitch v2 "skills", khung tự sinh web/js/st/v2/skills.js · bind/skills.json): một gợi ý luyện tiếp + danh sách phẳng.
 * Tải lười (gói skillsv2): hubs.js chỉ gọi App.skillsV2 khi gói có mặt, thiếu gói thì vẽ bản cũ.
 * @icons headphones menu_book edit mic auto_fix_high graphic_eq school edit_note flag grid_view chevron_right expand_more play_arrow */
(function () {
  const DAY = 864e5, ICON = { listening: 'headphones', reading: 'menu_book', writing: 'edit', speaking: 'mic' };
  // Chọn kỹ năng nên luyện: điểm thấp nhất ở lần thi gần nhất → chưa luyện bao giờ → lâu chưa luyện nhất; đã luyện hôm nay thì nhường kỹ năng khác.
  // rows: [{ k, band: số|null, last: mốc ms|0 }]
  const pickNext = (rows, now = Date.now()) => {
    const midnight = new Date(now).setHours(0, 0, 0, 0), notToday = rows.filter(r => r.last < midnight), pool = notToday.length ? notToday : rows;
    const banded = pool.filter(r => r.band != null);
    if (banded.length) return { k: banded.reduce((a, b) => (b.band < a.band ? b : a)).k, why: 'band' };
    const never = pool.find(r => !r.last); if (never) return { k: never.k, why: 'never' };
    const old = pool.reduce((a, b) => (b.last < a.last ? b : a));
    return { k: old.k, why: notToday.length ? 'old' : 'again', days: Math.max(1, Math.floor((midnight - new Date(old.last).setHours(0, 0, 0, 0)) / DAY)) };
  };
  const lastDay = (days, field) => Object.keys(days || {}).reduce((m, k) => ((days[k] || {})[field] > 0 ? Math.max(m, new Date(k + 'T12:00:00').getTime() || 0) : m), 0);
  const bandsOf = async (ex, g) => {
    if (ex === 'ielts' || ex === 'ieltsgt') { const m = ((await Core.Store.get('mocks', [])) || [])[0]; return (m && m.bands) || {}; }
    if (ex === 'toeic') { const x = (g.toeicTests || []).slice(-1)[0]; return x ? { listening: x.ls, reading: x.rs } : {}; }
    return {};
  };
  if (window.App) App.skillsV2 = async ({ SK, itemsFor, cnt }) => {
    const tok = location.hash, ex = App.exam(), X = App.EXAMS[ex], g = App.state.game || {}, D = g.days || {};
    const [essays, bands] = await Promise.all([Core.Store.get('essays', []).then(x => x || []), bandsOf(ex, g)]);
    if (location.hash !== tok) return; // đã sang trang khác trong lúc đọc dữ liệu
    const spokenDays = Object.values(D).filter(x => (x || {}).spoken > 0).length;
    const done = { listening: cnt(g.listenDone), reading: cnt(g.readDone), writing: essays.length };
    const last = { listening: lastDay(D, 'listens'), reading: lastDay(D, 'readings'), speaking: lastDay(D, 'spoken'), writing: essays.reduce((m, e) => Math.max(m, e.at || 0), 0) };
    const keys = Object.keys(SK).filter(k => itemsFor(k, ex)), off = Object.keys(SK).filter(k => !itemsFor(k, ex));
    const nx = pickNext(keys.map(k => ({ k, band: bands[k] != null ? +bands[k] : null, last: last[k] }))), name = SK[nx.k].name();
    const score = bands[nx.k], lab = ex === 'toeic' ? String(score) : 'Band ' + score;
    const why = nx.why === 'band' ? t('Điểm thấp nhất ở lần thi thử gần nhất: {b}', { b: lab }) : nx.why === 'never' ? t('Bạn chưa luyện kỹ năng này') : nx.why === 'old' ? t('Luyện gần nhất {n} ngày trước', { n: nx.days }) : t('Luyện thêm để giữ nhịp');
    const note = (k, n) => (n ? t('{n} bài đã làm', { n }) : k === 'speaking' && spokenDays ? t('{n} ngày đã luyện', { n: spokenDays }) : t('Chưa luyện'));
    const rows = keys.map(k => ({ name: SK[k].name(), note: note(k, done[k]), icon: ICON[k], href: '#/skill/' + k, next: k === nx.k, tag: t('Tiếp theo') }))
      .concat([{ name: t('Ngữ pháp'), note: note('', cnt(g.grammarDone)), icon: 'auto_fix_high', href: '#/grammar' }, { name: t('Phát âm'), note: note('', cnt(g.pronDone)), icon: 'graphic_eq', href: '#/pron' }]);
    const more = [['#/courses', 'school', t('Khóa học theo lộ trình')], ['#/mistakes', 'edit_note', t('Sổ lỗi sai')], ['#/tests', 'flag', t('Thi thử')], ['#/train', 'grid_view', t('Luyện')]].map(([href, icon, n]) => ({ href, icon, name: n }));
    const offHtml = off.length ? `${UI.esc(t('{exam} không thi {skills}.', { exam: X.short, skills: off.map(k => SK[k].name()).join(', ') }))} <a class="underline font-bold" href="#/skill/${off[0]}">${UI.esc(t('Vẫn muốn luyện?'))}</a>` : '';
    const teacher = self.Chars ? Chars.slot('ama', { pose: 'point', size: 'm', lazy: false, hip: true }) : '';
    ST2.mount(App.view, 'skills', { title: t('Kỹ năng'), exam: `${X.short} · ${t('Đổi')}`, examAria: t('Đổi kỳ thi: {x}', { x: X.short }), teacher, offHtml, offText: '', rows, more,
      next: { name, why, cta: t('Bắt đầu'), href: itemsFor(nx.k, ex)[0][0], aria: t('Bắt đầu luyện {x}', { x: name }) } }, 'skills');
  };
  if (typeof self !== 'undefined') (self.SkillsHub = self.SkillsHub || {}).pickNext = pickNext;
})();
