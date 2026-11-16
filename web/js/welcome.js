/* 🌟 Trang giới thiệu #/welcome (tải lười – gói 'welcome', app.js routes.welcome chỉ còn chuyển hướng + gọi module; chuỗi hero vẫn ở en.js vì gen-hero đọc).
 * Khung = Stitch: web/js/st/v2/welcome.js (< 1024 px) · welcome-desk.js (≥ 1024 px), chọn bằng matchMedia, đổi khung khi qua mốc mà giữ trạng thái thẻ thử. Khung đầu #lkHero do gen-hero vẽ cùng số đo (LCP, không nhảy), mount thay nó.
 * Giữ nguyên id: #wCard #wFront #wBack #wDone #wSay #wKit [data-wg] #loginW #loginH .w-nav [data-wjump] #wFeats. Luật chuyển hướng + đăng nhập: docs/specs/welcome.md
 * @icons school style format_quote mic sports_esports extension menu_book graphic_eq assignment auto_stories schema smart_display language travel_explore */
(function (g) {
  const App = g.App, { state, view } = App, { $, $$, esc, speak } = UI;
  const DESK = '(min-width:1024px)', pose = p => (g.Chars ? Chars.slot('ama', { pose: p, size: g.matchMedia && matchMedia(DESK).matches ? 'xl' : 'l' }) : ''); // chỗ giáo viên chung (bệ, cỡ chuẩn): điện thoại ô 200×170 → l, máy tính ô cao 240 → xl
  const noArrow = s => s.replace(/\s*→\s*$/, ''); // khóa cũ có sẵn → trong chữ, mẫu Stitch vẽ mũi tên riêng
  let st = null, mq = null; // trạng thái thẻ thử qua được lần vẽ lại khi đổi khung
  const data = k => {
    const P = S => g.ST2.P[k](t, esc)[S], blog = App.blogUrl ? App.blogUrl() : '/vi/blog/', L = I18N.LANGS[I18N.lang()], desk = k === 'welcome-desk';
    const F = desk ? ['menu_book', 'style', 'auto_stories', 'mic', 'sports_esports', 'extension', 'schema', 'graphic_eq', 'assignment'] : ['school', 'style', 'format_quote', 'mic', 'sports_esports', 'extension', 'menu_book', 'graphic_eq', 'assignment'];
    const feats = [
      [t('6.800+ từ IELTS, TOEIC & TOEFL'), t('NGSL, 570 từ học thuật AWL, 1.250 từ TOEIC, chủ đề IELTS, phrasal verb, collocation band 7+')],
      [t('Flashcard FSRS như Anki'), t('Thuật toán ghi nhớ hiện đại nhất nhắc bạn ôn đúng lúc sắp quên')],
      [t('Từ gắn ngữ cảnh'), t('Lưu từ kèm câu gốc từ bài đọc, báo, YouTube… nhớ lâu gấp nhiều lần')],
      [t('Luyện phát âm có chấm điểm'), t('Nói vào micro, AI nhận dạng giọng và chấm điểm ngay')],
      [t('Trò chơi & bài kiểm tra'), t('Ghép thẻ tính giờ, điền từ, nghe chép, test ước tính band')],
      [t('Add-on Chrome'), t('Bấm đúp tra từ, bôi đen dịch câu, tra từ trong phụ đề YouTube')],
      [t('80 bài ngữ pháp trực quan'), t('Học từng bước, 2.000 câu luyện: trắc nghiệm, viết lại câu, tìm lỗi sai')],
      [t('Thư viện phát âm 44 âm IPA'), t('Khẩu hình, cặp từ dễ nhầm, trọng âm & ngữ điệu')],
      [t('Thi thử IELTS 4 kỹ năng & TOEIC'), t('Bấm giờ như thi thật, quy đổi band/điểm, chấm Writing & Speaking bằng AI')],
    ].map(([ti, d], i) => ({ ic: F[i], ti, d }));
    const back = `<div id="wBack" hidden class="w-full mt-3 text-start"><p class="text-base font-bold lt:text-[#191C1B] dk:text-[#EEF6F7]">${esc(I18N.meanLang() === 'en' ? 'able to continue without harming the environment' : 'bền vững')}</p><p class="mt-2 text-sm font-medium leading-relaxed lt:text-[#4B5554] dk:text-[#A9BFC1]">Governments must invest in <b class="lt:text-[#00504B] dk:text-[#45D1C5]">sustainable</b> energy to protect future generations.</p></div>
      <div id="wDone" hidden class="w-full mt-3 text-center"><p class="text-sm font-bold lt:text-[#191C1B] dk:text-[#EEF6F7]">${esc(t('Tuyệt vời! Đó chính là cách Lexkite giúp bạn nhớ lâu.'))}</p>${P('cta')({ href: '#/welcome/setup', s: t('Tiếp tục học lộ trình của bạn →') })}</div>`;
    return { logo: '<img src="icons/icon.svg" width="40" height="40" alt="" class="w-full h-full rounded-[inherit]">', kicker: t('Nền tảng học từ vựng IELTS, TOEIC & tiếng Anh thực chiến'), h1: `${esc(t('Từ vựng vững,'))}<br>${esc(t('band điểm bứt phá.'))}`, lead: t('Học 15 phút mỗi ngày với flashcard thông minh, trò chơi, bài đọc và luyện phát âm. Mọi từ đều có phiên âm chuẩn Anh–Anh, nghĩa tiếng Việt và câu ví dụ IELTS.'),
      start: t('Bắt đầu miễn phí →'), have: t('Tôi đã có tài khoản'), lkTest: noArrow(t('Kiểm tra trình độ trước (5 phút) →')), lkStyle: noArrow(t('Phong cách tiếng Anh của bạn (1 phút) →')), free: t('Miễn phí · Dữ liệu học thuộc về bạn'),
      teacher: pose(st.win ? 'cheer' : 'happy'), back, langTxt: desk ? (L ? L[1] : '') : I18N.lang().toUpperCase(), lang: App.langPicker().replace('class="input lang-select"', 'class="absolute inset-0 w-full h-full opacity-0 cursor-pointer"'),
      hl: [{ ic: 'smart_display', ti: t('Bắt từ trên YouTube'), d: t('Dừng video, lưu từ kèm câu gốc và mốc thời gian.') }, { ic: desk ? 'travel_explore' : 'language', ti: t('Tra từ trên mọi trang web'), d: t('Bấm đúp để tra, bôi đen để dịch cả câu.') }], feats,
      tag: t('Học từ vựng & luyện thi tiếng Anh miễn phí – nhớ lâu bằng khoa học.'), tm: t('IELTS, TOEIC, TOEFL là nhãn hiệu của các tổ chức sở hữu. Lexkite là sản phẩm độc lập, không liên kết với các tổ chức này.'), blog, privacy: App.legalUrl('privacy'), terms: App.legalUrl('terms'),
      copy: `© ${new Date().getFullYear()} Lexkite · ${t('Lexkite™ là nhãn hiệu của {owner}.', { owner: 'MODIAN LUXURY JEWELRY LLC' })}` };
  };
  // Thẻ thử: chạm lật → chấm → chúc mừng → mời học tiếp. Thứ tự: mặt trước → sau → xong; chấm khi chưa lật = lật trước, không bỏ qua nghĩa
  const paint = () => { $('#wFront').hidden = st.flip || st.done; $('#wBack').hidden = !st.flip || st.done; $('#wDone').hidden = !st.done; $('#wGrades').hidden = st.done; };
  const bind = hl => {
    const flip = () => { st.flip = true; paint(); };
    $('#wCard').onclick = e => { if (!e.target.closest('button:not(#wFront),a')) flip(); };
    $('#wSay').onclick = e => { e.stopPropagation(); speak('sustainable', state.settings.accent); };
    $$('[data-wg]').forEach(b => b.onclick = e => { e.stopPropagation(); if (!st.flip) return flip(); const g2 = b.dataset.wg;
      if (g2 === 'good' || g2 === 'easy') { Sfx.correct(); confetti(30); st.win = true; const k = $('#wKit'); if (k) k.innerHTML = pose('cheer'); } else Sfx.wrong();
      st.done = true; paint(); });
    const login = () => App.loginOnboard(() => { location.hash = '#/welcome/setup'; }); // tài khoản trống → sang thiết lập, không đánh dấu đã thiết lập
    for (const b of [$('#loginW'), $('#loginH')]) if (b) { if (window.Sync && Sync.can === false) b.remove(); else b.onclick = login; }
    if (hl) { const b = [$('#loginH'), $('#loginW')].find(x => x && x.isConnected && x.getClientRects().length) || $('#loginH') || $('#loginW'); if (b) { b.classList.add('hl'); b.style.outline = '3px solid var(--primary)'; b.style.outlineOffset = '2px'; b.focus({ preventScroll: true }); } }
    view.querySelectorAll('[data-wjump]').forEach(b => b.onclick = () => document.getElementById(b.dataset.wjump).scrollIntoView({ behavior: 'smooth' }));
    if (App.blogLive && !(window.Capacitor && Capacitor.isNativePlatform && Capacitor.isNativePlatform())) App.blogLive().then(on => { const a = view.querySelector('.w-nav a[data-blog]'); if (on && a) { a.hidden = false; a.href = App.blogUrl(); } });
    paint();
  };
  // hl: vào từ #/welcome/login → làm nổi nút Đăng nhập + đưa focus vào đó
  function draw(hl) {
    st = { flip: false, done: false, win: false };
    const render = () => { const k = mq && mq.matches ? 'welcome-desk' : 'welcome'; g.ST2.mount(view, k, data(k), null); bind(hl); };
    mq = g.matchMedia ? matchMedia(DESK) : null;
    if (mq && mq.addEventListener && mq.removeEventListener) { const my = st, on = () => { if (st !== my) return; App.loadCss('css/st-v2-' + (mq.matches ? 'welcome-desk' : 'welcome') + '.css').then(() => { if (st === my && $('#wCard')) render(); }); };
      mq.addEventListener('change', on); App.onCleanup(() => mq.removeEventListener('change', on)); }
    render();
  }
  g.Welcome = { draw };
})(self);
