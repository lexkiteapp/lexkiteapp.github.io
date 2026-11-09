/* 📚 Tab Từ vựng (#/vocab): một việc chính là ôn, phần còn lại là danh sách phẳng + ô tra từ. Khung Stitch brand/stitch/v2/vocab-hub-*.html (gói lười vhub). */
(function () {
  const App = window.App, { state, routes } = App, view = App.view;
  const row = (href, title, sub) => ({ href, t: title, s: sub }), pill = (href, title) => ({ href, t: title });
  routes.vocab = function () {
    const { total } = Core.Cards.dueCount(state.cards, state.settings, state.stats);
    const deck = Object.values(state.cards), mastered = deck.filter(c => c.srs && c.srs.interval >= 21).length;
    const lib = '#/library' + (App.exam() === 'toeic' ? '?g=toeic' : '');
    const root = ST2.mount(view, 'vocab-hub', {
      title: t('Từ vựng'), ph: t('Tra từ…'), tools: t('Tra cứu'),
      count: total ? total.toLocaleString(I18N.lang()) : '', label: total ? t('Thẻ cần ôn hôm nay') : t('Không còn thẻ cần ôn – học từ mới nhé'),
      stats: t('{n} từ · {m} từ đã thuộc', { n: deck.length, m: mastered }), cta: total ? t('Ôn ngay') : t('Học từ mới'),
      href: '#/review' + (App.ux1On() ? '?hub=1' : ''),
      teacher: Chars.slot('ama', { pose: total ? 'point' : 'happy', size: 's', lazy: false }),
      r: [row('#/path', t('Lộ trình từ vựng'), t('Từng chặng nhỏ, mở khóa dần theo trình độ')), row(lib, t('Thư viện từ'), t('Bộ từ theo chủ đề, kỳ thi và trình độ')), row('#/deck', t('Sổ từ của tôi'), t('{n} từ · {m} từ đã thuộc', { n: deck.length, m: mastered })), row('#/practice', t('Trò chơi từ vựng'), t('Ghép thẻ, gõ từ, nghe – gõ, trắc nghiệm'))],
      p: [pill('#/verb', t('Chia động từ')), pill('#/usage', t('Cách dùng từ')), pill('#/phrases', t('Cụm từ & cấu trúc'))],
    }, null);
    document.body.classList.remove('st', 'v2on'); // ST2.mount bật st + v2on (ẩn thanh trên chung < 1024 px, #view mất lề): tab này dùng thanh trên, #bnav và lề #view chung như Kỹ năng/Thi
    const f = root.querySelector('[data-vh=search]'), q = root.querySelector('[data-vh=q]');
    // Bàn phím ảo: đưa ô nhập lên vùng nhìn thấy sau khi bàn phím mở xong
    q.addEventListener('focus', () => setTimeout(() => q.scrollIntoView({ block: 'center', behavior: 'smooth' }), 300));
    f.addEventListener('submit', e => { e.preventDefault(); const w = q.value.trim(); location.hash = '#/dict' + (w ? '/' + encodeURIComponent(w) : ''); });
  };
})();
