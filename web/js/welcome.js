/* 🌟 Trang giới thiệu #/welcome (tải lười – gói 'welcome', app.js routes.welcome chỉ còn chuyển hướng + gọi module; chuỗi vẫn ở en.js vì gen-hero đọc).
 * Khung đầu do gen-hero vẽ sẵn (#lkHero, LCP) – có khung thì lấp phần còn thiếu, không thì vẽ cả trang. Giữ nguyên id: #wCard #wFront #wBack #wDone #wSay #wKit [data-wg] #loginW #loginH .w-nav [data-wjump] #wFeats.
 * Luật chuyển hướng + đăng nhập: docs/specs/welcome.md. */
(function (g) {
  const App = g.App, { state, view } = App, { $, $$, esc, speak } = UI;
  // hl: vào từ #/welcome/login → làm nổi nút Đăng nhập + đưa focus vào đó
  function draw(hl) {
    const feats = [
      ['📚', t('6.800+ từ IELTS, TOEIC & TOEFL'), t('NGSL, 570 từ học thuật AWL, 1.250 từ TOEIC, chủ đề IELTS, phrasal verb, collocation band 7+')],
      ['🧠', t('Flashcard FSRS như Anki'), t('Thuật toán ghi nhớ hiện đại nhất nhắc bạn ôn đúng lúc sắp quên')],
      ['📌', t('Từ gắn ngữ cảnh'), t('Lưu từ kèm câu gốc từ bài đọc, báo, YouTube… nhớ lâu gấp nhiều lần')],
      ['🎙️', t('Luyện phát âm có chấm điểm'), t('Nói vào micro, AI nhận dạng giọng và chấm điểm ngay')],
      ['⚡', t('Trò chơi & bài kiểm tra'), t('Ghép thẻ tính giờ, điền từ, nghe chép, test ước tính band')],
      ['🧩', t('Add-on Chrome'), t('Bấm đúp tra từ, bôi đen dịch câu, tra từ trong phụ đề YouTube')],
      ['📐', t('77 bài ngữ pháp trực quan'), t('Học từng bước, 1.700 câu luyện: trắc nghiệm, viết lại câu, tìm lỗi sai')],
      ['🔤', t('Thư viện phát âm 44 âm IPA'), t('Khẩu hình, cặp từ dễ nhầm, trọng âm & ngữ điệu')],
      ['🏁', t('Thi thử IELTS 4 kỹ năng & TOEIC'), t('Bấm giờ như thi thật, quy đổi band/điểm, chấm Writing & Speaking bằng AI')],
    ];
    // Cùng một nội dung cho 2 đường: có khung gen-hero thì lấp phần thiếu, không thì vẽ cả trang
    const headH = () => `<a class="brand" href="#/welcome" style="padding:0"><img class="logo" src="icons/icon.svg" width="36" height="36" alt=""><span class="wordmark">lex<b>kite</b></span></a>
          <nav class="w-nav" aria-label="Lexkite"><button type="button" data-wjump="wFeats">${t('Tính năng')}</button><a href="#/tests">${t('Thi thử')}</a><a href="#/settings">${t('Add-on Chrome')}</a><a href="${App.blogUrl ? App.blogUrl() : '/vi/blog/'}" data-blog hidden>${t('Blog')}</a></nav>
          <span class="row w-tools">${App.langPicker()}<button type="button" class="btn ghost sm" id="loginH">${t('Đăng nhập')}</button><a class="btn primary sm" href="#/welcome/setup">${t('Bắt đầu học')}</a></span>`;
    const linksH = () => `<a class="small w-lk" href="#/placement">🧭 ${t('Kiểm tra trình độ trước (5 phút) →')}</a>
          <a class="small w-lk" href="#/style">🎯 ${t('Phong cách tiếng Anh của bạn (1 phút) →')}</a>
          <p class="small muted" style="margin-top:.8rem">${t('Miễn phí · Dữ liệu học thuộc về bạn')}</p>`;
    const demoH = () => `<div class="card w-card" id="wCard" style="padding:0;overflow:hidden;box-shadow:var(--shadow-lg)">
            <div style="background:linear-gradient(135deg,#0F3D3E,#17595A 60%,#1F7A72);padding:1.6rem;color:#fff;text-align:center;position:relative"><div class="kit-cele" id="wKit" style="position:absolute;right:.6rem;top:.5rem">${window.Kit ? Kit.svg('cheer', 64) : ''}</div>
              <div style="font-size:4rem">🌿</div><div style="font-size:2rem;font-weight:800">sustainable</div>
              <div class="row center" style="opacity:.9;gap:.4rem">/səˈsteɪnəbl/ · adj · B2 <button type="button" class="icon-btn sm" id="wSay" aria-label="${t('Nghe')}: sustainable" style="background:rgba(255,255,255,.18);color:#fff"><span aria-hidden="true">🔊</span></button></div></div>
            <div style="padding:1.2rem 1.4rem">
              <button type="button" id="wFront" class="linkish muted small center" style="display:block;width:100%;background:none;border:0;cursor:pointer;font:inherit">👆 ${t('Chạm để lật')}</button>
              <div id="wBack" hidden><div class="vi">${esc(I18N.meanLang() === 'en' ? 'able to continue without harming the environment' : 'bền vững')}</div>
              <div class="example-box small" style="margin-top:.6rem">Governments must invest in <mark>sustainable</mark> energy to protect future generations.</div>
              <div class="grades" style="margin-top:1rem">${[['again', t('Quên')], ['hard', t('Khó')], ['good', t('Nhớ')], ['easy', t('Dễ')]].map(([g, l]) => `<button type="button" class="btn g-${g} sm" data-wg="${g}">${l}</button>`).join('')}</div></div>
              <div id="wDone" hidden class="center"><div class="kit-say" style="margin:.4rem 0">${t('Tuyệt vời! Đó chính là cách Lexkite giúp bạn nhớ lâu.')}</div><a class="btn primary" href="#/welcome/setup">${t('Tiếp tục học lộ trình của bạn →')}</a></div>
            </div>
          </div>
          <div class="grid g2 w-hl" style="margin-top:1rem">
            <div class="card"><b>🎬 ${t('Bắt từ trên YouTube')}</b><div class="muted small">${t('Dừng video, lưu từ kèm câu gốc và mốc thời gian.')}</div></div>
            <div class="card"><b>🌐 ${t('Tra từ trên mọi trang web')}</b><div class="muted small">${t('Bấm đúp để tra, bôi đen để dịch cả câu.')}</div></div>
          </div>`;
    const tailH = () => `<div class="grid g3 w-feats" id="wFeats" style="margin-top:3rem;scroll-margin-top:5rem">${feats.map(([em, ti, d]) => `<div class="card"><div style="font-size:2rem">${em}</div><h3 style="margin:.5rem 0 .3rem">${ti}</h3><div class="muted small">${d}</div></div>`).join('')}</div>
          <footer class="w-foot">
            <div><span class="brand" style="padding:0"><img class="logo" src="icons/icon.svg" width="36" height="36" alt=""><span class="wordmark">lex<b>kite</b></span></span><p class="small muted">${t('Học từ vựng & luyện thi tiếng Anh miễn phí – nhớ lâu bằng khoa học.')}</p><p class="tiny muted">${t('IELTS, TOEIC, TOEFL là nhãn hiệu của các tổ chức sở hữu. Lexkite là sản phẩm độc lập, không liên kết với các tổ chức này.')}</p></div>
            <div><b class="small">${t('Sản phẩm')}</b><a href="#/welcome/setup">${t('Ứng dụng web')}</a><a href="#/settings">${t('Add-on Chrome')}</a><a href="#/tests">${t('Thi thử')}</a><a href="${App.blogUrl ? App.blogUrl() : '/vi/blog/'}">${t('Blog học tiếng Anh')}</a></div>
            <div><b class="small">${t('Pháp lý & hỗ trợ')}</b><a href="${App.legalUrl('privacy')}">${t('Chính sách quyền riêng tư')}</a><a href="${App.legalUrl('terms')}">${t('Điều khoản sử dụng')}</a><a href="#/contact">${t('Liên hệ')}</a></div>
            <p class="tiny muted" style="grid-column:1/-1;margin:0">© ${new Date().getFullYear()} Lexkite · ${t('Lexkite™ là nhãn hiệu của {owner}.', { owner: 'MODIAN LUXURY JEWELRY LLC' })}</p>
          </footer>`;
    const hero = document.getElementById('lkHero');
    const heroMatch = hero && (!hero.dataset.heroLang || hero.dataset.heroLang === I18N.lang());
    if (heroMatch) {
      const head = hero.querySelector('.w-head');
      if (head && !head.querySelector('.w-nav')) head.innerHTML = headH();
      const cta = hero.querySelector('.w-cta');
      if (cta && !hero.querySelector('a[href="#/placement"]')) cta.insertAdjacentHTML('afterend', linksH());
      const demo = hero.querySelector('.w-demo');
      if (demo && !demo.querySelector('#wCard')) demo.innerHTML = demoH();
      if (!hero.querySelector('#wFeats')) hero.insertAdjacentHTML('beforeend', tailH());
    } else {
      view.innerHTML = `
        <div style="max-width:980px;margin:0 auto">
          <header class="w-head">${headH()}</header>
          <div class="grid g2" style="align-items:center;gap:2.5rem">
            <div>
              <span class="chip lv">✨ ${t('Nền tảng học từ vựng IELTS, TOEIC & tiếng Anh thực chiến')}</span>
              <h1 style="font-size:clamp(2rem,5vw,3.2rem);line-height:1.1;margin:1rem 0">${t('Từ vựng vững,')}<br><span class="grad-text">${t('band điểm bứt phá.')}</span></h1>
              <p class="muted" style="font-size:1.1rem">${t('Học 15 phút mỗi ngày với flashcard thông minh, trò chơi, bài đọc và luyện phát âm. Mọi từ đều có phiên âm chuẩn Anh–Anh, nghĩa tiếng Việt và câu ví dụ IELTS.')}</p>
              <div class="row w-cta" style="margin-top:1.5rem"><a class="btn primary lg" href="#/welcome/setup">${t('Bắt đầu miễn phí →')}</a><button class="btn lg" id="loginW">${t('Tôi đã có tài khoản')}</button></div>
              ${linksH()}
            </div>
            <div class="w-demo">${demoH()}</div>
          </div>
          ${tailH()}
        </div>`;
    }
    // Thẻ demo tương tác: chạm lật → chấm Nhớ/Dễ → chuông + pháo hoa + Kit chúc mừng → mời học tiếp
    const flip = () => { $('#wFront').hidden = true; $('#wBack').hidden = false; };
    $('#wCard').onclick = e => { if (!e.target.closest('button:not(#wFront),a')) flip(); };
    $('#wSay').onclick = e => { e.stopPropagation(); speak('sustainable', state.settings.accent); };
    $$('[data-wg]').forEach(b => b.onclick = e => { e.stopPropagation(); const g = b.dataset.wg;
      if (g === 'good' || g === 'easy') { Sfx.correct(); confetti(30); const k = $('#wKit'); if (k && window.Kit) k.innerHTML = Kit.svg('win', 72, true); }
      else Sfx.wrong();
      $('#wBack').hidden = true; $('#wDone').hidden = false; });
    const login = () => App.loginOnboard(() => { location.hash = '#/welcome/setup'; }); // tài khoản trống → sang thiết lập, không đánh dấu đã thiết lập
    for (const b of [$('#loginW'), $('#loginH')]) if (b) { if (window.Sync && Sync.can === false) b.remove(); else b.onclick = login; }
    if (hl) { const b = [$('#loginH'), $('#loginW')].find(x => x && x.isConnected && x.getClientRects().length) || $('#loginH') || $('#loginW'); if (b) { b.classList.add('hl'); b.style.outline = '3px solid var(--primary)'; b.style.outlineOffset = '2px'; b.focus({ preventScroll: true }); } }
    view.querySelectorAll('[data-wjump]').forEach(b => b.onclick = () => document.getElementById(b.dataset.wjump).scrollIntoView({ behavior: 'smooth' }));
    if (App.blogLive) App.blogLive().then(on => { const a = view.querySelector('.w-nav a[data-blog]'); if (on && a) { a.hidden = false; a.href = App.blogUrl(); } });
  }
  g.Welcome = { draw };
})(self);
