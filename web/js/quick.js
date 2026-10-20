/* ⚡ Chơi nhanh 15 giây (#/quick) & 🎯 Phong cách tiếng Anh của bạn (#/style)
   • 15 giây: 3–5 câu siêu ngắn, làm trong ~15s, không phạt/sợ sai, khen ngợi + tích hợp chia sẻ S1.
   • Phong cách: 6 câu tình huống vui, không có đáp án sai → xác định hệ phong cách & gợi ý lộ trình.
   • Nạp lười hoàn toàn, CSS đóng gói bên trong, không phình khung shell. */
(function () {
  'use strict';
  const g = typeof window !== 'undefined' ? window : globalThis;
  const App = g.App;
  if (!App || !App.routes) return;

  const UI = g.UI || {};
  const { $, $$, esc, modal } = UI;
  const { state, routes } = App;
  const view = App.view;

  function ensureCss() {
    if (document.getElementById('qk-css')) return;
    const st = document.createElement('style');
    st.id = 'qk-css';
    st.textContent = `
      .qk-wrap { max-width: 540px; margin: 0 auto; padding: 1rem .85rem 2.5rem; }
      .qk-top { display: flex; align-items: center; justify-content: space-between; gap: .75rem; margin-bottom: 1.1rem; }
      .qk-progress-wrap { flex: 1; height: 10px; background: var(--surface-2, rgba(0,0,0,.08)); border-radius: 999px; overflow: hidden; position: relative; }
      .qk-progress-bar { height: 100%; background: linear-gradient(90deg, var(--primary, #E5502F), var(--accent, #17595A)); border-radius: 999px; transition: width .3s ease; }
      .qk-timer-pill { display: inline-flex; align-items: center; gap: .3rem; font-weight: 800; font-size: .95rem; color: var(--primary, #E5502F); padding: .25rem .6rem; background: var(--surface-2, rgba(0,0,0,.06)); border-radius: 999px; white-space: nowrap; }
      .qk-card { background: var(--surface, #fff); border: 1px solid var(--line, rgba(0,0,0,.08)); border-radius: 22px; padding: 1.6rem 1.25rem; text-align: center; box-shadow: var(--shadow, 0 4px 16px rgba(0,0,0,.06)); margin-bottom: 1.1rem; }
      .qk-badge { display: inline-flex; align-items: center; gap: .35rem; padding: .25rem .75rem; border-radius: 999px; font-size: .78rem; font-weight: 800; text-transform: uppercase; letter-spacing: .05em; background: var(--surface-2, rgba(0,0,0,.06)); color: var(--muted, #666); margin-bottom: .6rem; }
      .qk-word { font-size: 1.9rem; font-weight: 800; color: var(--text, #111); margin-bottom: .35rem; line-height: 1.25; }
      .qk-prompt { font-size: .95rem; color: var(--muted, #666); margin: 0; }
      .qk-opts { display: grid; gap: .7rem; margin-bottom: 1.2rem; }
      .qk-btn { display: flex; align-items: center; justify-content: space-between; gap: .75rem; width: 100%; min-height: 52px; padding: .8rem 1.15rem; border: 2px solid var(--line, rgba(0,0,0,.1)); border-radius: 16px; background: var(--surface, #fff); color: var(--text, #111); font-size: 1.02rem; font-weight: 600; text-align: start; cursor: pointer; transition: transform .12s, border-color .12s, background-color .12s; box-shadow: 0 2px 0 var(--line, rgba(0,0,0,.08)); -webkit-tap-highlight-color: transparent; }
      .qk-btn:active { transform: translateY(2px); box-shadow: none; }
      @media (hover: hover) and (pointer: fine) {
        .qk-btn:hover { border-color: var(--primary, #E5502F); background: var(--surface-2, rgba(0,0,0,.02)); }
      }
      .qk-btn .qk-key { display: inline-flex; align-items: center; justify-content: center; width: 26px; height: 26px; border-radius: 6px; background: var(--surface-2, rgba(0,0,0,.06)); font-size: .85rem; font-weight: 800; color: var(--muted, #666); flex-shrink: 0; }
      .qk-btn.qk-right { border-color: #16a34a !important; background: #dcfce7 !important; color: #14532d !important; transform: scale(1.02); }
      .qk-btn.qk-wrong { border-color: #dc2626 !important; background: #fee2e2 !important; color: #7f1d1d !important; opacity: .85; }
      .qk-btn.qk-reveal { border-color: #16a34a !important; background: #f0fdf4 !important; color: #14532d !important; font-weight: 700; }
      .qk-result-box { text-align: center; padding: 1.6rem 1rem; }
      .qk-result-em { font-size: 3.6rem; line-height: 1; margin-bottom: .6rem; }
      .qk-result-title { font-size: 1.5rem; font-weight: 800; color: var(--text, #111); margin-bottom: .4rem; }
      .qk-result-sub { font-size: 1rem; color: var(--muted, #666); margin-bottom: 1.4rem; }
      .qk-actions { display: grid; gap: .7rem; max-width: 360px; margin: 1.4rem auto 0; }
      .qk-actions .btn { min-height: 46px; }

      /* Styles for English Style Quiz */
      .sty-card { background: var(--surface, #fff); border: 1px solid var(--line, rgba(0,0,0,.08)); border-radius: 22px; padding: 1.6rem 1.25rem; box-shadow: var(--shadow, 0 4px 16px rgba(0,0,0,.06)); margin-bottom: 1.2rem; }
      .sty-q { font-size: 1.15rem; font-weight: 800; color: var(--text, #111); line-height: 1.45; margin-bottom: 1.2rem; text-wrap: balance; }
      .sty-opts { display: grid; gap: .75rem; }
      .sty-opt { display: flex; align-items: center; gap: .85rem; padding: .95rem 1.15rem; min-height: 54px; border: 2px solid var(--line, rgba(0,0,0,.1)); border-radius: 16px; background: var(--surface, #fff); color: var(--text, #111); font-size: .98rem; font-weight: 600; text-align: start; cursor: pointer; transition: all .15s ease; box-shadow: 0 2px 0 var(--line, rgba(0,0,0,.08)); }
      .sty-opt:active { transform: translateY(2px); box-shadow: none; }
      @media (hover: hover) and (pointer: fine) {
        .sty-opt:hover { border-color: var(--accent, #17595A); background: color-mix(in srgb, var(--accent, #17595A) 5%, var(--surface, #fff)); }
      }
      .sty-opt.picked { border-color: var(--accent, #17595A) !important; background: color-mix(in srgb, var(--accent, #17595A) 12%, var(--surface, #fff)) !important; transform: scale(1.01); }
      .sty-res-box { text-align: center; padding: 1.5rem 1rem; max-width: 520px; margin: 0 auto; }
      .sty-badge { display: inline-flex; align-items: center; gap: .4rem; padding: .45rem 1.2rem; border-radius: 999px; background: linear-gradient(135deg, var(--brand-ink, #0F3D3E), var(--accent, #17595A)); color: #fff; font-weight: 800; font-size: 1.15rem; margin-bottom: 1rem; box-shadow: 0 4px 14px rgba(15,61,62,.2); }
      .sty-desc { font-size: 1.02rem; line-height: 1.6; color: var(--text, #111); margin-bottom: 1.25rem; text-wrap: pretty; }
      .sty-recs { background: var(--surface-2, rgba(0,0,0,.03)); border: 1px solid var(--line, rgba(0,0,0,.08)); border-radius: 16px; padding: 1rem 1.25rem; text-align: start; margin-bottom: 1.4rem; }
      .sty-recs h4 { margin: 0 0 .5rem; font-size: .88rem; text-transform: uppercase; letter-spacing: .05em; color: var(--muted, #666); }
      .sty-recs ul { margin: 0; padding-inline-start: 1.25rem; }
      .sty-recs li { margin-bottom: .35rem; font-size: .95rem; }
      .qk-result-title, .sty-q, .sty-badge { margin-top: 0; }
      .qk-result-sub { margin-top: .8rem; font-weight: 600; }
      .qk-btn, .sty-opt { text-align: start; }
      @media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) .qk-btn.qk-reveal { background: #14532d !important; color: #dcfce7 !important; } }
      :root[data-theme="dark"] .qk-btn.qk-reveal { background: #14532d !important; color: #dcfce7 !important; }
      @media (prefers-reduced-motion: reduce) { .qk-btn, .sty-opt, .qk-progress-bar { transition: none !important; transform: none !important; } }
    `;
    document.head.appendChild(st);
  }

  // ==========================================
  // ⚡ 1. CHƠI NHANH 15 GIÂY (#/quick)
  // ==========================================
  const LIMIT = 15, N = 4;
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  routes.quick = function () {
    ensureCss();
    const mean = w => (App.meanOf ? App.meanOf(w) : (w.vi || w.def || ''));
    const uniq = arr => { const seen = new Set(); return arr.filter(w => { const k = String(w.word || '').toLowerCase(); if (!k || seen.has(k) || !mean(w)) return false; seen.add(k); return true; }); };
    const bank = uniq(App.allWords ? App.allWords() : []);
    const cards = uniq(Object.values(state.cards || {}).filter(c => c && c.word));
    const due = cards.filter(c => c.srs && c.srs.due <= Date.now() + 864e5);
    const pool = due.length >= N ? due : cards.length >= N ? cards : bank;
    const others = bank.length >= 10 ? bank : uniq([...cards, ...bank]);

    if (pool.length < 3 || others.length < 3) {
      view.innerHTML = `<div class="qk-wrap center"><div class="qk-card"><h2>${t('Chưa có đủ từ vựng')}</h2><p class="muted">${t('Hãy lưu một vài từ vựng hoặc học theo lộ trình trước khi chơi nhanh nhé.')}</p><a class="btn primary" href="#/home">${t('Về trang chủ')}</a></div></div>`;
      return;
    }

    // 4 câu, mỗi câu 3 lựa chọn; phương án nhiễu khác nghĩa rõ ràng (không trùng/chứa nghĩa đúng)
    const D = g.Distract;
    const questions = shuffle(pool).slice(0, N).map(w => {
      const right = mean(w), rl = right.toLowerCase();
      const ok = x => x.word.toLowerCase() !== w.word.toLowerCase() && (() => { const m = mean(x).toLowerCase(); return m && m !== rl && !m.includes(rl) && !rl.includes(m); })();
      let ds = [];
      try { if (D && D.pick) ds = D.pick(w, others, { n: 2, key: 'vi', mean, seed: Math.floor(Math.random() * 1e9) }).filter(ok); } catch (e) { ds = []; }
      if (ds.length < 2) ds = ds.concat(shuffle(others.filter(x => ok(x) && !ds.includes(x))).slice(0, 2 - ds.length));
      const opts = shuffle([right, ...ds.slice(0, 2).map(mean)]);
      return { word: w.word, ipa: w.ipa || '', options: opts, correctIdx: opts.indexOf(right) };
    });

    const total = questions.length;
    let qIdx = 0, score = 0, busy = false, done = false, timer = null, secondsLeft = LIMIT, startTime = 0;

    const endPlay = timedOut => {
      if (done) return;
      done = true;
      if (timer) clearInterval(timer);
      const elapsed = Math.min(LIMIT, Math.max(1, Math.round((Date.now() - startTime) / 1000)));
      const pct = Math.round((score / total) * 100);
      const isGood = pct >= 75;
      const xp = score * 2;
      if (isGood && g.Sfx && g.Sfx.win) g.Sfx.win();
      if (xp && App.reward) App.reward({ xp });
      const praise = pct === 100 ? t('Phản xạ thần tốc! Trí nhớ như máy quét ⚡')
        : isGood ? t('Rất xuất sắc! Não bộ vừa được khởi động cực mượt 🚀')
        : t('Khởi động tuyệt vời! Mỗi lần luyện là một lần nhớ sâu hơn 🌱');
      view.innerHTML = `
        <div class="qk-wrap">
          <div class="card qk-card qk-result-box" role="status">
            <div class="qk-result-em" aria-hidden="true">${isGood ? '⚡' : '🌱'}</div>
            <h1 class="qk-result-title">${timedOut ? t('Hết 15 giây!') : t('Hoàn thành trong {s} giây!', { s: elapsed })}</h1>
            <div class="muted">${t('Đúng {n}/{total} câu', { n: score, total })}${xp ? ` · +${xp} XP` : ''}</div>
            <p class="qk-result-sub">${praise}</p>
            <div class="qk-actions">
              ${isGood ? `<button type="button" class="btn primary lg" data-share="${pct}">📸 ${t('Khoe thành tích')}</button>` : ''}
              <button type="button" class="btn lg${isGood ? '' : ' primary'}" id="qkAgain">⚡ ${t('Làm thêm lượt nữa')}</button>
              <a class="btn ghost" href="#/home">${t('Về trang chủ')}</a>
            </div>
          </div>
        </div>`;
      const againBtn = $('#qkAgain');
      if (againBtn) againBtn.onclick = () => routes.quick();
    };

    const renderQuestion = () => {
      if (done) return;
      if (qIdx >= total) return endPlay(false);
      if (startTime && usedSec() >= LIMIT) return endPlay(true);
      const q = questions[qIdx];
      view.innerHTML = `
        <div class="qk-wrap">
          <div class="qk-top">
            <a class="icon-btn" href="#/home" aria-label="${t('Thoát')}" title="${t('Thoát')}">✕</a>
            <div class="qk-progress-wrap" role="progressbar" aria-label="${t('Câu {i}/{total}', { i: qIdx + 1, total })}" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${qIdx}">
              <div class="qk-progress-bar" style="width:${(qIdx / total) * 100}%"></div>
            </div>
            <span class="qk-timer-pill" aria-hidden="true">⏱️ <span id="qkTimer">${secondsLeft}s</span></span>
          </div>
          <div class="card qk-card">
            <div class="qk-badge">⚡ ${t('Câu {i}/{total}', { i: qIdx + 1, total })}</div>
            <div class="qk-word" lang="en">${esc(q.word)}</div>
            ${q.ipa ? `<div class="small muted" style="margin-bottom:.4rem">${esc(q.ipa)}</div>` : ''}
            <div class="qk-prompt">${t('Chọn nghĩa đúng')}</div>
          </div>
          <div class="qk-opts" id="qkOpts">
            ${q.options.map((opt, i) => `<button type="button" class="qk-btn" data-idx="${i}"><span>${esc(opt)}</span><span class="qk-key" aria-hidden="true">${i + 1}</span></button>`).join('')}
          </div>
        </div>`;
      $$('#qkOpts .qk-btn').forEach(btn => {
        btn.onclick = () => {
          if (busy || done) return;
          busy = true;
          const isCorrect = +btn.dataset.idx === q.correctIdx;
          if (isCorrect) { score++; btn.classList.add('qk-right'); if (g.Sfx && g.Sfx.correct) g.Sfx.correct(); }
          else { btn.classList.add('qk-wrong'); const rb = $$('#qkOpts .qk-btn')[q.correctIdx]; if (rb) rb.classList.add('qk-reveal'); }
          // Sai: giữ đáp án đúng lâu hơn một chút để kịp đọc (thời gian này không tính vào 15 giây)
          const hold = isCorrect ? 320 : 900;
          paused += hold;
          setTimeout(() => { qIdx++; busy = false; renderQuestion(); }, hold);
        };
      });
    };

    // Đồng hồ theo thời gian thật; thời gian xem phản hồi (đúng/sai) không bị trừ
    let paused = 0;
    const usedSec = () => (Date.now() - startTime - paused) / 1000;
    const tick = () => {
      if (done) return;
      const used = usedSec();
      secondsLeft = Math.max(0, Math.ceil(LIMIT - used));
      const el = $('#qkTimer');
      if (el) el.textContent = `${secondsLeft}s`;
      if (used >= LIMIT && !busy) endPlay(true);
    };

    const keyHandler = e => {
      if (busy || done || e.ctrlKey || e.metaKey || e.altKey) return;
      const btns = $$('#qkOpts .qk-btn');
      const idx = /^[1-3]$/.test(e.key) ? +e.key - 1 : -1;
      if (idx >= 0 && btns[idx]) { e.preventDefault(); btns[idx].click(); }
    };
    document.addEventListener('keydown', keyHandler);
    const stop = () => { done = true; if (timer) clearInterval(timer); document.removeEventListener('keydown', keyHandler); };
    if (App.onCleanup) App.onCleanup(stop); else if (App.cleanups) App.cleanups.push(stop);

    renderQuestion();
    startTime = Date.now();
    timer = setInterval(tick, 250);
  };

  // ==========================================
  // 🎯 2. TRẮC NGHIỆM PHONG CÁCH TIẾNG ANH (#/style)
  // ==========================================
  routes.style = function () {
    ensureCss();

    const STYLES = {
      natural: {
        id: 'natural',
        icon: '🌊',
        name: t('Hệ Tự Nhiên & Phản Xạ'),
        desc: t('Bạn học bằng trực giác, không sợ sai và thích tương tác thực tế. Bạn tiến bộ nhanh nhất khi biến tiếng Anh thành trò chơi và giao tiếp tự nhiên mỗi ngày.'),
        recs: [
          ['#/call', '🎙️ ' + t('Luyện nói & đóng vai tình huống cùng Call Mia')],
          ['#/quick', '⚡ ' + t('Chơi nhanh 15 giây mỗi khi có thời gian rảnh')],
          ['#/reflex', '🎧 ' + t('Luyện phản xạ nghe – nói')]
        ]
      },
      precision: {
        id: 'precision',
        icon: '📐',
        name: t('Hệ Cầu Toàn & Chuẩn Xác'),
        desc: t('Bạn coi trọng sự chuẩn mực, thích nắm chắc gốc rễ ngữ pháp và dùng từ chính xác. Độ tỉ mỉ giúp bạn làm chủ các cấu trúc học thuật và kỳ thi quốc tế.'),
        recs: [
          ['#/grammar', '📐 ' + t('Ngữ pháp từ nền tảng đến nâng cao')],
          ['#/write', '✍️ ' + t('Phòng luyện viết IELTS Task 1 & Task 2 có sửa lỗi')],
          ['#/mistakes', '🚩 ' + t('Sổ lỗi sai để không vấp lại lỗi cũ')]
        ]
      },
      pragmatic: {
        id: 'pragmatic',
        icon: '💼',
        name: t('Hệ Tối Giản & Thực Chiến'),
        desc: t('Bạn thực tế, học có trọng tâm và ưu tiên những gì dùng được ngay. Bạn không thích lý thuyết rườm rà mà nhắm thẳng vào kết quả công việc và kỳ thi.'),
        recs: [
          ['#/toeic', '💼 ' + t('Luyện TOEIC với từ vựng công sở')],
          ['#/cbt', '🏁 ' + t('Phòng thi thử CBT có bấm giờ và phân tích điểm')],
          ['#/review', '⏰ ' + t('Ôn thẻ FSRS: nhắc ôn đúng lúc sắp quên')]
        ]
      },
      curious: {
        id: 'curious',
        icon: '🧭',
        name: t('Hệ Khám Phá & Tri Thức'),
        desc: t('Bạn có niềm say mê tự nhiên với tri thức, văn hóa và sự phong phú của ngôn ngữ. Càng hiểu sâu ngữ cảnh, bạn càng nhớ lâu và hứng thú học tập.'),
        recs: [
          ['#/reading', '📖 ' + t('Bài đọc học thuật IELTS kèm từ điển bấm tra')],
          ['#/usage', '🌿 ' + t('Cách dùng từ: kết hợp từ & cụm động từ')],
          ['#/settings', '🌐 ' + t('Cài Add-on Chrome để biến mọi trang web thành bài học')]
        ]
      }
    };

    const QUESTIONS = [
      {
        q: t('Khi nhận một email tiếng Anh dài từ đối tác, phản xạ đầu tiên của bạn là:'),
        opts: [
          { text: t('Gõ ngắn gọn: "Got it, thanks!" hoặc dùng emoji 👍'), style: 'natural' },
          { text: t('Dò từng câu, tra từ điển, chỉnh ngữ pháp chuẩn chỉ rồi mới gửi 🧐'), style: 'precision' },
          { text: t('Lướt tìm ý chính, trả lời vừa đủ ý rồi giải quyết việc khác 💼'), style: 'pragmatic' },
          { text: t('Đọc kỹ để học thêm từ vựng và cấu trúc câu hay 📖'), style: 'curious' }
        ]
      },
      {
        q: t('Đang nói chuyện với người nước ngoài mà bỗng "bí" từ:'),
        opts: [
          { text: t('Dùng ngôn ngữ cơ thể, diễn giải vòng quanh rồi cười tươi nói tiếp 🌊'), style: 'natural' },
          { text: t('Dừng lại suy nghĩ cho bằng được từ chính xác nhất 🎯'), style: 'precision' },
          { text: t('Dùng ngay một từ đơn giản hơn thay thế để không ngắt quãng 💡'), style: 'pragmatic' },
          { text: t('Hỏi thẳng: "How do you say... in English?" 🙋'), style: 'curious' }
        ]
      },
      {
        q: t('Cuối tuần xem một bộ phim tiếng Anh yêu thích:'),
        opts: [
          { text: t('Tắt sạch phụ đề, nghe được chữ nào hay chữ đó, tận hưởng cảm xúc 🎬'), style: 'natural' },
          { text: t('Bật phụ đề tiếng Anh để đọc kịp mọi từ và ngữ pháp 📝'), style: 'precision' },
          { text: t('Bật song ngữ hoặc phụ đề mẹ đẻ để nắm trọn 100% cốt truyện 🍿'), style: 'pragmatic' },
          { text: t('Vừa xem vừa nhại lại giọng điệu nhân vật yêu thích 🗣️'), style: 'curious' }
        ]
      },
      {
        q: t('Khi học từ mới, điều gì giúp bạn nhớ lâu nhất:'),
        opts: [
          { text: t('Chơi mini-game nhanh, lật flashcard 5–10 phút mỗi ngày 🎮'), style: 'natural' },
          { text: t('Viết ra sổ, phân tích tiền tố, hậu tố và họ từ ✍️'), style: 'precision' },
          { text: t('Đặt ngay câu ví dụ gắn liền với công việc hoặc đời sống thật 🏢'), style: 'pragmatic' },
          { text: t('Nghe phát âm nhiều lần và nhại lại trong ngữ cảnh 🎧'), style: 'curious' }
        ]
      },
      {
        q: t('Mục tiêu lớn nhất khi bạn học tiếng Anh cùng Lexkite:'),
        opts: [
          { text: t('Tự tin bật ra phản xạ tự nhiên, không còn sợ sai hay ngập ngừng 🚀'), style: 'natural' },
          { text: t('Chinh phục chứng chỉ mục tiêu (IELTS, TOEIC, TOEFL) với band điểm cao 🏆'), style: 'precision' },
          { text: t('Nâng cấp vốn từ công sở, tự tin giao tiếp và mở rộng cơ hội nghề nghiệp 📈'), style: 'pragmatic' },
          { text: t('Khám phá thế giới, đọc hiểu tài liệu quốc tế và yêu thích việc học mỗi ngày 🌍'), style: 'curious' }
        ]
      },
      {
        q: t('Nếu tiếng Anh là một người bạn, bạn muốn người bạn đó thế nào:'),
        opts: [
          { text: t('Hài hước, phóng khoáng, gặp nhau là ríu rít cả ngày 🥳'), style: 'natural' },
          { text: t('Điềm tĩnh, uyên bác, mỗi câu nói đều chuẩn mực sâu sắc 🧐'), style: 'precision' },
          { text: t('Nhanh nhẹn, thực tế, luôn giúp đỡ kịp thời và đúng trọng tâm 🤝'), style: 'pragmatic' },
          { text: t('Cuốn hút, thú vị, luôn mở ra những chân trời kiến thức mới lạ 🧭'), style: 'curious' }
        ]
      }
    ];

    let currentQ = 0;
    const scores = { natural: 0, precision: 0, pragmatic: 0, curious: 0 };
    const picks = [];
    let busy = false;

    const showResult = (winnerStyle) => {
      if (g.Sfx && typeof g.Sfx.win === 'function') g.Sfx.win();
      // Lưu kết quả vào settings
      if (state.settings) {
        state.settings.englishStyle = { id: winnerStyle.id, date: Date.now() };
        if (App.saveSettings) App.saveSettings();
      }

      view.innerHTML = `
        <div class="qk-wrap">
          <div class="card sty-card sty-res-box">
            <div style="margin-bottom:.5rem" aria-hidden="true">${g.Kit && typeof g.Kit.svg === 'function' ? g.Kit.svg('win', 68) : winnerStyle.icon}</div>
            <div class="tiny muted" style="font-weight:700;text-transform:uppercase;letter-spacing:.06em;margin-bottom:.3rem">${t('Kết quả phong cách tiếng Anh')}</div>
            <h1 class="sty-badge">${winnerStyle.icon} ${esc(winnerStyle.name)}</h1>
            <p class="sty-desc">${esc(winnerStyle.desc)}</p>

            <div class="sty-recs">
              <h4>${t('Gợi ý tính năng dành riêng cho bạn:')}</h4>
              <ul>
                ${winnerStyle.recs.map(([href, txt]) => `<li><a href="${href}">${esc(txt)}</a></li>`).join('')}
              </ul>
            </div>

            <div class="qk-actions">
              <a class="btn primary lg" href="#/path">🚀 ${t('Bắt đầu lộ trình ngay')}</a>
              <a class="btn" href="#/placement">🧭 ${t('Kiểm tra trình độ chi tiết (20 câu)')}</a>
              <button type="button" class="btn ghost" id="styShare">📤 ${t('Chia sẻ phong cách')}</button>
            </div>
          </div>
        </div>
      `;

      const shareBtn = $('#styShare');
      if (shareBtn) {
        shareBtn.onclick = async () => {
          const text = t('Mình là {style} trên Lexkite! Khám phá phong cách tiếng Anh của bạn tại {url}', {
            style: winnerStyle.name,
            url: 'https://lexkite.com/app/#/style'
          });
          if (navigator.share) {
            try { await navigator.share({ title: t('Phong cách tiếng Anh của bạn'), text }); } catch (e) { /* bỏ qua */ }
          } else {
            try {
              await navigator.clipboard.writeText(text);
              UI.toast(t('Đã chép link kết quả'));
            } catch (e) { /* bỏ qua: không có quyền clipboard */ }
          }
        };
      }
    };

    const renderQ = () => {
      if (currentQ >= QUESTIONS.length) {
        // Hòa điểm → ưu tiên hệ được chọn gần nhất (câu sau phản ánh mục tiêu rõ hơn)
        const max = Math.max(...Object.values(scores));
        const bestStyle = picks.slice().reverse().find(s => scores[s] === max) || 'natural';
        showResult(STYLES[bestStyle] || STYLES.natural);
        return;
      }

      const q = QUESTIONS[currentQ];
      const progressPct = (currentQ / QUESTIONS.length) * 100;

      view.innerHTML = `
        <div class="qk-wrap">
          <div class="qk-top">
            <a class="icon-btn" href="#/home" aria-label="${t('Thoát')}" title="${t('Thoát')}">✕</a>
            <div class="qk-progress-wrap" role="progressbar" aria-label="${t('Phong cách tiếng Anh của bạn')}" aria-valuemin="0" aria-valuemax="${QUESTIONS.length}" aria-valuenow="${currentQ}">
              <div class="qk-progress-bar" style="width:${progressPct}%"></div>
            </div>
            <span class="small muted" style="font-weight:700">${currentQ + 1}/${QUESTIONS.length}</span>
          </div>

          <div class="card sty-card">
            <div class="tiny muted" style="font-weight:700;text-transform:uppercase;letter-spacing:.06em;margin-bottom:.5rem">${t('Phong cách tiếng Anh của bạn')}</div>
            <h1 class="sty-q" id="styQ">${esc(q.q)}</h1>
            <div class="sty-opts" id="styOpts" role="group" aria-labelledby="styQ">
              ${q.opts.map((opt, i) => `
                <button type="button" class="sty-opt" data-style="${opt.style}">
                  <span>${esc(opt.text)}</span>
                </button>
              `).join('')}
            </div>
          </div>
        </div>
      `;

      $$('#styOpts .sty-opt').forEach(btn => {
        btn.onclick = () => {
          if (busy) return;
          busy = true;
          btn.classList.add('picked');
          scores[btn.dataset.style] = (scores[btn.dataset.style] || 0) + 1;
          picks.push(btn.dataset.style);
          setTimeout(() => {
            currentQ++;
            busy = false;
            renderQ();
          }, 240);
        };
      });
    };

    renderQ();
  };

  g.QuickPlay = { routes };
})();
