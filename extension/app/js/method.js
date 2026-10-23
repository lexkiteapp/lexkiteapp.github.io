/* Phương pháp học: nguyên lý nghiên cứu → tính năng cụ thể → số liệu thật của chính người học.
 * Gồm vòng lặp mỗi ngày, bộ nhớ từ vựng (FSRS), cân bằng 4 mạch học (Nation), 12 nguyên lý và lộ trình theo band. */
(function () {
  const { $, $$, esc } = UI;
  const { Store, SRS, Golden, todayKey, DAY } = Core;
  const App = window.App;
  const { state, routes } = App;
  const view = App.view;

  const sumDays = (days, keys, n = 7) => {
    let t = 0; const d = new Date();
    for (let i = 0; i < n; i++) { const k = todayKey(d); const x = days[k] || {}; keys.forEach(m => { t += x[m] || 0; }); d.setDate(d.getDate() - 1); }
    return t;
  };
  const reviewsIn = n => { let t = 0; const d = new Date(); for (let i = 0; i < n; i++) { t += state.stats.days[todayKey(d)] || 0; d.setDate(d.getDate() - 1); } return t; };
  const pct = (a, b) => b ? Math.round(a / b * 100) : 0;

  // ---------- Bộ nhớ từ vựng: dự báo khả năng còn nhớ nếu ngừng ôn ----------
  function memory() {
    const cards = Object.values(state.cards).filter(c => c.srs && c.srs.last && c.srs.reps > 0);
    const now = Date.now();
    const S = c => c.srs.S != null ? c.srs.S : Math.max(0.5, c.srs.interval || 1);
    const at = days => cards.length ? cards.reduce((a, c) => a + SRS.F.R(Math.max(0, (now - c.srs.last) / DAY) + days, S(c)), 0) / cards.length : 0;
    return { cards, at, learning: Object.values(state.cards).filter(c => c.srs && c.srs.last && c.srs.reps === 0).length };
  }
  function curveSvg(m, mark) {
    const W = 560, H = 190, P = 34, days = 60;
    const x = d => P + d / days * (W - P - 10), y = r => 12 + (1 - r) * (H - 40);
    const demo = !m.cards.length;
    const f = demo ? (d => SRS.F.R(d, 3)) : m.at;
    const keep = SRS.retentionTarget;
    let path = ''; for (let d = 0; d <= days; d += 1) path += `${d ? 'L' : 'M'}${x(d).toFixed(1)},${y(f(d)).toFixed(1)}`;
    // Có ôn đúng lịch: răng cưa quanh mức mục tiêu
    let saw = `M${x(0)},${y(Math.max(keep, f(0)))}`; let t0 = 0, S = 2;
    while (t0 < days) { const ivl = Math.max(1, SRS.F.ivl(S, keep)); const t2 = Math.min(days, t0 + ivl); for (let d = t0 + 1; d <= t2; d++) saw += `L${x(d).toFixed(1)},${y(SRS.F.R(d - t0, S)).toFixed(1)}`; saw += `L${x(t2).toFixed(1)},${y(1).toFixed(1)}`; t0 = t2; S *= 2.6; }
    const grid = [1, 0.8, 0.6, 0.4].map(r => `<line x1="${P}" x2="${W - 10}" y1="${y(r)}" y2="${y(r)}" stroke="var(--line)"/><text x="4" y="${y(r) + 4}" font-size="11" fill="var(--muted)">${r * 100}%</text>`).join('');
    const xt = [0, 7, 14, 30, 60].map(d => `<text x="${x(d) - 6}" y="${H - 8}" font-size="11" fill="var(--muted)">${d}d</text>`).join('');
    return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto" role="img" aria-label="${t('Đường cong quên lãng')}">
      ${grid}${xt}
      <path d="${saw}" fill="none" stroke="#16a34a" stroke-width="2" stroke-dasharray="4 3" opacity=".8"/>
      <path d="${path}" fill="none" stroke="var(--primary)" stroke-width="3"/>
      <line x1="${x(mark)}" x2="${x(mark)}" y1="10" y2="${H - 26}" stroke="#f59e0b" stroke-width="2"/>
      <circle cx="${x(mark)}" cy="${y(f(mark))}" r="5" fill="#f59e0b"/>
    </svg>
    <div class="row small" style="gap:1rem"><span><b style="color:var(--primary)">━</b> ${demo ? t('Ví dụ 1 từ mới học') : t('Từ của bạn nếu ngừng ôn')}</span><span><b style="color:#16a34a">┅</b> ${t('Ôn đúng “thời điểm vàng” (FSRS)')}</span></div>`;
  }

  routes.method = App.guard(async function () {
    const w = App.W;
    const g = state.game, s = state.settings, d = g.days[todayKey()] || {};
    const dueNow = Golden.dueNow(state.cards);
    const forget = App.forgetting().length;
    const mistakes = (await w(Store.get('mistakes', []))).filter(x => !x.fixed).length;
    const essays = (await w(Store.get('essays', []))).length;
    const cards = Object.values(state.cards);
    const mine = cards.reduce((a, c) => a + (c.contexts || []).filter(x => x.title === 'Câu của tôi').length, 0);
    const withCtx = cards.filter(c => (c.contexts || []).some(x => x.title !== 'Câu của tôi')).length;
    const phrases = cards.filter(c => App.isPhrase ? App.isPhrase(c) : /\s/.test(c.word)).length;
    const READ = window.READINGS || [];
    const readDone = Object.keys(g.readDone || {}).length, listenDone = Object.keys(g.listenDone || {}).length, grammarDone = Object.keys(g.grammarDone || {}).length, pronDone = Object.keys(g.pronDone || {}).length;
    const totalReviews = Object.values(state.stats.days || {}).reduce((a, b) => a + b, 0);
    const m = memory();
    const pl = s.placement;

    // Vòng lặp hôm nay
    const LOOP = [
      { em: '🔁', t: t('Ôn thẻ đến hạn'), sub: dueNow ? t('{n} thẻ đang ở thời điểm vàng', { n: dueNow }) : t('Không còn thẻ đến hạn'), href: '#/review', done: !dueNow && (state.stats.days[todayKey()] || 0) > 0, why: t('Lặp lại ngắt quãng') },
      { em: '🎧', t: t('Nghe hoặc đọc 1 bài'), sub: t('Đầu vào dễ hiểu, hơi vượt trình độ'), href: (d.readings || 0) > (d.listens || 0) ? '#/listening' : '#/reading', done: (d.readings || 0) + (d.listens || 0) > 0, why: t('Ngữ liệu dễ hiểu') },
      { em: '📌', t: t('Lưu 5 từ kèm câu gốc'), sub: t('Hôm nay: {n} từ', { n: d.newWords || 0 }), href: '#/reading', done: (d.newWords || 0) >= 5, why: t('Học trong ngữ cảnh') },
      { em: '📐', t: t('1 bài ngữ pháp'), sub: t('Học từng bước + tự luận'), href: '#/grammar', done: (d.grammar || 0) > 0, why: t('Học tập trung vào ngôn ngữ') },
      { em: '🗣️', t: t('Nói hoặc viết'), sub: t('Dùng lại từ vừa học'), href: (d.spoken || 0) ? '#/write' : '#/speaking', done: (d.spoken || 0) + (d.writes || 0) > 0, why: t('Đầu ra bắt buộc') },
      { em: '📕', t: t('Sửa lỗi sai'), sub: mistakes ? t('{n} lỗi chưa xem lại', { n: mistakes }) : t('Không có lỗi tồn đọng'), href: '#/mistakes', done: !mistakes, why: t('Phản hồi sửa lỗi') },
    ];
    const loopDone = LOOP.filter(x => x.done).length;

    // 4 mạch học (7 ngày) – quy đổi về “phiên” ~10 phút
    const D = g.days || {};
    const strands = [
      { k: 'in', em: '📖', t: t('Đầu vào có nghĩa'), sub: t('Đọc, nghe'), v: sumDays(D, ['readings']) + sumDays(D, ['listens']), href: '#/listening', cta: t('Nghe 1 phần') },
      { k: 'out', em: '🗣️', t: t('Đầu ra có nghĩa'), sub: t('Nói, viết, tự đặt câu'), v: Math.round(sumDays(D, ['spoken']) / 3) + sumDays(D, ['writes']) + cards.reduce((a, c) => a + (c.contexts || []).filter(x => x.title === 'Câu của tôi' && Date.now() - (x.at || 0) < 7 * DAY).length, 0) / 3, href: '#/speaking', cta: t('Luyện Speaking') },
      { k: 'lang', em: '🧠', t: t('Tập trung ngôn ngữ'), sub: t('Flashcard, ngữ pháp, phát âm'), v: Math.round(reviewsIn(7) / 20) + sumDays(D, ['grammar', 'pron']), href: '#/grammar', cta: t('Học ngữ pháp') },
      { k: 'flu', em: '⚡', t: t('Luyện trôi chảy'), sub: t('Ghép thẻ tính giờ, chép chính tả, thi thử'), v: sumDays(D, ['matches', 'dictations']), href: '#/practice/match?src=deck', cta: t('Ghép thẻ tính giờ') },
    ].map(x => ({ ...x, v: Math.round(x.v) }));
    const sTotal = strands.reduce((a, x) => a + x.v, 0);
    const weakest = sTotal ? strands.slice().sort((a, b) => a.v - b.v)[0] : null;

    // 12 nguyên lý → tính năng → số liệu của bạn
    const P = [
      { em: '📉', t: t('Đường cong quên lãng'), who: t('Ebbinghaus (1885) · Murre & Dros (2015, tái lập)'), idea: t('Trí nhớ về thông tin mới giảm nhanh nhất trong vài ngày đầu; mỗi lần nhớ lại thành công làm đường cong thoải hơn.'), how: t('Mỗi từ có chỉ số <b>🧠 % còn nhớ</b> tính theo FSRS. Từ tụt dưới mục tiêu vào danh sách <b>Sắp quên</b>.'), stat: forget ? t('{n} từ đang sắp quên', { n: forget }) : t('Chưa có từ nào sắp quên'), links: [['#/deck?from=forget', t('Xem từ sắp quên')]] },
      { em: '🔁', t: t('Lặp lại ngắt quãng (FSRS)'), who: t('Leitner (1972) · Woźniak (1987) · Ye và cs. (2022)'), idea: t('Ôn với khoảng cách tăng dần, đúng lúc sắp quên, cho hiệu quả gấp nhiều lần học dồn.'), how: t('Thuật toán <b>FSRS</b> (mặc định của Anki) tính độ ổn định & độ khó riêng từng từ; lịch ôn giữ khả năng nhớ ≈ <b>{pct}%</b>.', { pct: Math.round(SRS.retentionTarget * 100) }), stat: t('{due} thẻ đến hạn · {total} lượt ôn đã làm', { due: dueNow, total: totalReviews }), links: [['#/review', t('Ôn tập ngay')], ['#/settings', t('Chỉnh mục tiêu ghi nhớ')]] },
      { em: '🎯', t: t('Chủ động nhớ lại'), who: 'Roediger & Karpicke (2006)', idea: t('Tự kiểm tra – cố nhớ ra trước khi xem đáp án – giúp nhớ lâu hơn hẳn đọc lại nhiều lần.'), how: t('Thẻ luôn bắt <b>đoán trước khi lật</b>; Học thông minh đi từ nhận diện (trắc nghiệm) đến <b>tự gõ lại từ</b>; ngữ pháp có <b>bài tự luận</b>.'), stat: t('{n} từ đã học', { n: cards.filter(c => c.srs && c.srs.last).length }), links: [['#/practice/learn?src=deck', t('Học thông minh')]] },
      { em: '📖', t: t('Ngữ liệu dễ hiểu (i+1)'), who: t('Krashen (1985) · Nation (2006): cần biết ~98% từ để đọc thoải mái'), idea: t('Ngôn ngữ được tiếp thu qua nội dung có ý nghĩa, hơi vượt trình độ hiện tại.'), how: t('Bài đọc B1→C1 và <b>20 phần nghe</b> nhiều giọng Anh–Mỹ–Úc; chạm từ bất kỳ để tra & lưu kèm câu gốc.'), stat: t('Đã đọc {read}/{readTotal} bài · nghe {listen}/{listenTotal} phần', { read: readDone, readTotal: READ.length, listen: listenDone, listenTotal: (window.LISTENING || []).length || 20 }), links: [['#/reading', t('Đọc bài')], ['#/listening', t('Luyện nghe')]] },
      { em: '🔦', t: t('Chú ý có chủ đích (Noticing)'), who: 'Schmidt (1990)', idea: t('Người học chỉ tiếp thu được những gì họ để ý thấy – tô sáng cấu trúc giúp “nhìn ra” ngôn ngữ.'), how: t('Bài đọc tô sáng <b>từ học thuật AWL, từ nối, collocation</b>; bài mẫu Writing chú thích <b>cụm hay, nghĩa, vai trò từng câu</b>.'), stat: t('{n} từ đã lưu kèm ngữ cảnh thật', { n: withCtx }), links: [['#/phrases', t('Bài mẫu có chú thích')]] },
      { em: '✍️', t: t('Hiệu ứng tự tạo'), who: 'Slamecka & Graf (1978) · Laufer & Hulstijn (2001)', idea: t('Thông tin do chính mình tạo ra (tự đặt câu, tự viết lại) được nhớ tốt hơn thông tin cho sẵn.'), how: t('Mặt sau flashcard có ô <b>Tự đặt câu</b>; câu của bạn thành ngữ cảnh cho lần ôn sau. Bài mẫu có dạng <b>viết lại câu</b>.'), stat: t('{n} câu tự đặt', { n: mine }), links: [['#/review', t('Thử đặt câu')]] },
      { em: '🖼️', t: t('Mã hóa kép'), who: 'Paivio (1971) · Mayer (2009)', idea: t('Kết hợp hình ảnh, chữ và âm thanh tạo nhiều “đường dẫn” để gọi lại trí nhớ.'), how: t('Từ có <b>hình minh họa</b> (ảnh giấy phép mở), IPA, <b>phát âm UK/US</b>; ngữ pháp có dòng thời gian & sơ đồ màu.'), stat: t('{n} bài phát âm đã học', { n: pronDone }), links: [['#/practice/speak?src=deck', t('Luyện phát âm từ')], ['#/pron', t('Thư viện phát âm')]] },
      { em: '🔀', t: t('Học xen kẽ'), who: 'Rohrer & Taylor (2007) · Brunmair & Richter (2019)', idea: t('Trộn nhiều dạng bài/chủ điểm trong một buổi giúp phân biệt và ghi nhớ tốt hơn học từng khối.'), how: t('<b>Kiểm tra chương</b> trộn trắc nghiệm với tự luận; phiên ôn xen từ mới vào giữa từ cũ.'), stat: t('{n} bài ngữ pháp đã làm', { n: grammarDone }), links: [['#/grammar/mix', t('Luyện trộn ngữ pháp')]] },
      { em: '🗣️', t: t('Đầu ra bắt buộc'), who: 'Swain (1985, Output Hypothesis)', idea: t('Phải nói/viết mới phát hiện ra lỗ hổng của mình – đầu ra buộc xử lý ngữ pháp sâu hơn đầu vào.'), how: t('<b>Phòng Speaking</b> ghi âm & phân tích từ vựng; <b>Phòng viết</b> Task 1 & 2 bấm giờ, chấm sơ bộ theo band.'), stat: t('{essays} bài viết · {spoken} điểm nói (30 ngày)', { essays, spoken: sumDays(D, ['spoken'], 30) }), links: [['#/speaking', t('Phòng Speaking')], ['#/write', t('Phòng viết')]] },
      { em: '🧩', t: t('Học theo cụm từ'), who: 'Lewis (1993, Lexical Approach) · Boers & Lindstromberg (2009)', idea: t('Người bản ngữ nói bằng các cụm có sẵn; học collocation giúp nói & viết tự nhiên và nhanh hơn.'), how: t('<b>Sổ cụm từ</b>: bôi đen bất kỳ đoạn nào để lưu cụm kèm nghĩa; 5 dạng bài luyện từ mỗi bài mẫu.'), stat: t('{n} cụm từ đã lưu', { n: phrases }), links: [['#/phrases', t('Sổ cụm từ')]] },
      { em: '📕', t: t('Phản hồi sửa lỗi'), who: 'Lyster & Ranta (1997) · Hattie (2007)', idea: t('Phản hồi cụ thể, kịp thời và được xem lại là một trong những yếu tố tác động mạnh nhất tới kết quả học.'), how: t('Mọi câu sai (từ vựng, ngữ pháp, đọc, nghe) tự vào <b>Sổ lỗi sai</b> kèm giải thích và nút học lại đúng chỗ.'), stat: mistakes ? t('{n} lỗi chưa xem lại', { n: mistakes }) : t('Không có lỗi tồn đọng'), links: [['#/mistakes', t('Sổ lỗi sai')]] },
      { em: '🏆', t: t('Động lực & thói quen'), who: t('Deci & Ryan (Self-Determination) · Lally và cs. (2010)'), idea: t('Thói quen hình thành sau trung bình ~66 ngày lặp lại; mục tiêu nhỏ, phản hồi tiến bộ giữ động lực.'), how: t('Chuỗi ngày, XP, nhiệm vụ & huy hiệu; <b>thời điểm vàng</b> nhắc đúng lúc; kế hoạch hôm nay cá nhân hóa.'), stat: t('Chuỗi {n} ngày · {xp} XP', { n: App.streak(), xp: g.xp || 0 }), links: [['#/stats', t('Tiến độ & huy hiệu')]] },
    ];

    // Lộ trình gợi ý theo band (phút/ngày)
    const stage = pl ? pl.stage : null;
    const PLAN = {
      s0: [t('Nền tảng (band < 4.5)'), [[t('Từ vựng cốt lõi NGSL'), 15, '#/path'], [t('Ngữ pháp A2–B1'), 10, '#/grammar'], [t('Phát âm IPA'), 5, '#/pron'], [t('Nghe Part 1'), 5, '#/listening']]],
      s1: [t('Tăng tốc (band 4.5–5.5)'), [[t('Flashcard + từ chủ đề'), 15, '#/review'], [t('Ngữ pháp B1–B2'), 10, '#/grammar'], [t('Nghe Part 1–2'), 10, '#/listening'], [t('Đọc 1 bài'), 10, '#/reading']]],
      s2: [t('Bứt phá (band 5.5–6.5)'), [['Flashcard AWL', 10, '#/review'], [t('Nghe Part 3–4 + chép chính tả'), 15, '#/listening'], [t('Đọc & tô sáng'), 10, '#/reading'], [t('Viết 1 đoạn / nói 1 câu'), 10, '#/write']]],
      s3: [t('Về đích (band 6.5+)'), [[t('Ôn thẻ'), 10, '#/review'], [t('Thi thử Listening/Reading'), 20, '#/listening'], [t('Bài mẫu + viết Task 2'), 15, '#/phrases'], ['Speaking Part 2–3', 10, '#/speaking']]],
    };
    const plan = PLAN[stage] || PLAN.s1;

    view.innerHTML = `
      <div class="page-head"><div><h1>🧪 ${t('Phương pháp học của Lexkite')}</h1><p class="muted">${t('Mỗi tính năng dựa trên một nguyên lý đã được nghiên cứu về trí nhớ và thụ đắc ngôn ngữ – kèm số liệu thật của chính bạn để biết nên làm gì tiếp theo.')}</p></div></div>

      <div class="card hero-main" style="margin-bottom:1rem">
        <div class="row between"><h2 style="color:#fff;margin:0">${t('Vòng lặp học mỗi ngày (~30 phút)')}</h2><span class="chip" style="background:rgba(255,255,255,.2);color:#fff">${t('Hôm nay {done}/{total}', { done: loopDone, total: LOOP.length })}</span></div>
        <div class="mloop">${LOOP.map((x, i) => `<a class="mstep ${x.done ? 'done' : ''}" href="${x.href}"><span class="mnum">${x.done ? '✓' : i + 1}</span><span class="mem">${x.em}</span><b>${x.t}</b><small>${esc(x.sub)}</small><i>${x.why}</i></a>`).join('')}</div>
      </div>

      <div class="grid g2" style="margin-bottom:1rem">
        <div class="card">
          <div class="row between"><h2 style="margin:0">🧠 ${t('Bộ nhớ từ vựng của bạn')}</h2><a class="small" href="#/settings">${t('Mục tiêu {pct}% →', { pct: Math.round(SRS.retentionTarget * 100) })}</a></div>
          ${m.cards.length ? `<div class="mstats"><div><b>${m.cards.length}</b><span>${t('từ đang nhớ')}</span></div><div><b>${Math.round(m.at(0) * 100)}%</b><span>${t('khả năng nhớ trung bình')}</span></div><div><b>${dueNow}</b><span>${t('đến hạn ôn')}</span></div><div><b>${m.learning}</b><span>${t('đang ở bước học')}</span></div></div>`
            : `<p class="small muted">${t('Bạn chưa có từ nào ở lịch ôn theo ngày. Dưới đây là đường cong của một từ mới học – hãy học vài từ để xem biểu đồ của chính bạn.')}</p>`}
          <div id="mCurve" style="margin-top:.6rem">${curveSvg(m, 7)}</div>
          <label class="field" style="margin-top:.4rem"><span>${t('Nếu ngừng ôn <b id="mDays">7</b> ngày → còn nhớ khoảng <b id="mPct"></b>')}</span><input type="range" min="0" max="60" value="7" id="mSlide" style="width:100%"></label>
          <div class="row" style="margin-top:.4rem">${dueNow ? `<a class="btn primary sm" href="#/review">${t('Ôn {n} thẻ ngay', { n: dueNow })}</a>` : `<a class="btn primary sm" href="#/library">${t('Học từ mới')}</a>`}${forget ? `<a class="btn sm" href="#/deck?from=forget">${t('{n} từ sắp quên', { n: forget })}</a>` : ''}</div>
        </div>
        <div class="card">
          <h2 style="margin:0 0 .3rem">⚖️ ${t('Cân bằng 4 mạch học')} <span class="tiny muted">${t('· 7 ngày qua')}</span></h2>
          <p class="small muted" style="margin-top:0">${t('Paul Nation (2007): một chương trình hiệu quả chia thời gian gần đều cho 4 mạch. Thiếu mạch nào thì tiến bộ chậm ở mạch đó.')}</p>
          ${strands.map(x => `<div class="mstrand"><span class="mse">${x.em}</span><div class="grow"><div class="row between nowrap"><b class="small">${x.t}</b><span class="tiny muted">${sTotal ? pct(x.v, sTotal) : 0}%</span></div><div class="progress"><i style="width:${sTotal ? pct(x.v, sTotal) : 0}%;background:${weakest && x.k === weakest.k ? '#f59e0b' : 'var(--primary)'}"></i></div><div class="tiny muted">${x.sub}</div></div></div>`).join('')}
          ${weakest ? `<div class="example-box small" style="margin-top:.6rem">💡 ${t('Mạch đang thiếu: <b>{name}</b>.', { name: weakest.t })} <a href="${weakest.href}">${weakest.cta} →</a></div>` : `<div class="example-box small" style="margin-top:.6rem">${t('Bắt đầu học để xem bạn đang cân bằng thế nào giữa 4 mạch.')}</div>`}
        </div>
      </div>

      <div class="card" style="margin-bottom:1rem">
        <div class="row between"><h2 style="margin:0">🗺️ ${t('Lộ trình gợi ý: {name}', { name: plan[0] })}</h2>${pl ? `<span class="chip">${t('Band đầu vào {band}', { band: esc(pl.band) })}</span>` : `<a class="btn sm primary" href="#/placement">🧭 ${t('Kiểm tra trình độ để cá nhân hóa')}</a>`}</div>
        <div class="mplan">${plan[1].map(([label, min, href]) => `<a class="mpi" href="${href}"><b>${min}′</b><span>${label}</span></a>`).join('')}</div>
        <div class="tiny muted" style="margin-top:.4rem">${t('Tổng ~{n} phút/ngày. Đều đặn mỗi ngày hiệu quả hơn học dồn cuối tuần.', { n: plan[1].reduce((a, x) => a + x[1], 0) })} <a href="#/path">${t('Xem Lộ trình chi tiết →')}</a></div>
      </div>

      <h2>📚 ${t('12 nguyên lý & cách Lexkite áp dụng')}</h2>
      <div class="grid g2">${P.map(p => `
        <div class="card mprin">
          <div class="row nowrap"><span style="font-size:2rem">${p.em}</span><div><h3 style="margin:0">${p.t}</h3><div class="tiny muted">${p.who}</div></div></div>
          <p class="small" style="margin:.6rem 0">${p.idea}</p>
          <div class="example-box small" style="border-left-color:var(--primary)"><b>${t('Trong Lexkite:')}</b> ${p.how}</div>
          <div class="row between" style="margin-top:auto;padding-top:.7rem"><span class="chip">📊 ${esc(p.stat)}</span><div class="row">${p.links.map(([h, l], i) => `<a class="btn sm ${i ? 'ghost' : ''}" href="${h}">${l} →</a>`).join('')}</div></div>
        </div>`).join('')}</div>

      <div class="card" style="margin-top:1rem"><h2 style="margin-top:0">❓ ${t('Câu hỏi thường gặp')}</h2>
        <details><summary><b>${t('Mỗi ngày nên học bao nhiêu từ mới?')}</b></summary><p class="small">${t('10–20 từ là hợp lý. Mỗi từ mới sinh ra khoảng 5–8 lượt ôn trong tháng đầu, nên học quá nhiều sẽ khiến lượng ôn dồn lên. Chỉnh số từ mới/ngày và giới hạn phiên ôn trong <a href="#/settings">Cài đặt</a>.')}</p></details>
        <details><summary><b>${t('Bấm “Khó” hay “Quên” khác nhau thế nào?')}</b></summary><p class="small">${t('“Quên” = không nhớ ra → thẻ quay lại bước học (1 phút), độ ổn định giảm. “Khó” = nhớ ra nhưng vất vả → khoảng ôn tăng ít. Hãy trả lời trung thực – FSRS dựa vào đó để tính lịch tối ưu cho riêng bạn.')}</p></details>
        <details><summary><b>${t('Mục tiêu ghi nhớ 90% nghĩa là gì?')}</b></summary><p class="small">${t('Khi một từ đến lượt ôn, bạn có ~90% khả năng còn nhớ. Tăng lên 95% thì nhớ chắc hơn nhưng số lượt ôn gần gấp đôi; giảm xuống 85% thì ít ôn hơn. 90% là điểm cân bằng được khuyên dùng.')}</p></details>
        <details><summary><b>${t('Bỏ lỡ vài ngày thì sao?')}</b></summary><p class="small">${t('Không sao – FSRS tính đến thời gian thực tế đã trôi qua. Từ bạn vẫn nhớ sau thời gian dài sẽ được giãn lịch xa hơn; hãy ôn phần “Sắp quên” trước, giới hạn phiên ôn để không bị ngợp.')}</p></details>
        <details><summary><b>${t('Vì sao nên lưu từ kèm câu gốc?')}</b></summary><p class="small">${t('Câu gốc cho biết cách dùng thật: từ đi với giới từ nào, collocation nào, sắc thái ra sao. Khi ôn, nhìn lại ngữ cảnh giúp bạn dùng đúng từ khi nói và viết – điều Lexical Resource trong IELTS chấm.')}</p></details>
      </div>`;
    App.bindCommon && App.bindCommon();
    const paint = n => { $('#mDays').textContent = n; const r = m.cards.length ? m.at(n) : SRS.F.R(n, 3); $('#mPct').textContent = Math.round(r * 100) + '%' + (m.cards.length ? ' ' + t('(≈{n}/{total} từ)', { n: Math.round(r * m.cards.length), total: m.cards.length }) : ''); $('#mCurve').innerHTML = curveSvg(m, n); };
    $('#mSlide').oninput = e => paint(+e.target.value);
    paint(7);
  });
})();
