/* 🚀 Thiết lập lần đầu TỪNG BƯỚC (tải lười – gói 'onb', app.js setup() gọi): 1 câu hỏi/màn kiểu Duolingo/Busuu.
 * Thanh tiến độ + nút quay lại + Ama phản hồi từng lựa chọn. Mục tiêu (gói học – tracks.js) → trình độ / kiểm tra đầu vào 5 phút
 * → điểm mục tiêu → cường độ → sẵn sàng → vào thẳng Ngày 1 (đã chọn trình độ) hoặc lời mời bài đầu vào 5 phút, bỏ qua được (placement.js), KHÔNG cần tài khoản (mời lưu tiến độ sau khi xong Ngày 1 – path-reward.js).
 * "Đã có tài khoản?" = liên kết nhỏ ở màn 1. Giữ nguyên mọi lựa chọn & cách lưu của bố cục cũ (id #go = nút bắt đầu ở màn cuối).
 * Mỗi bước 1 hash #/welcome/setup?s=<bước>: tiến = pushState (không chạy lại route, không nháy), Back/vuốt/Esc → hashchange → app.js setup() → Onboard.go chỉ vẽ lại.
 * Lựa chọn + bước ở sessionStorage lk.onbPick (qua được tải lại + I18N.set), xóa khi xong (finishOnboarding). Luật: docs/specs/welcome.md */
(function (g) {
  const App = g.App, { state } = App, { esc } = UI;
  const STEPS = ['goal', 'level', 'target', 'pace', 'ready'], KEY = 'lk.onbPick';
  const readPick = () => { try { const p = JSON.parse(sessionStorage.getItem(KEY) || 'null'); return p && typeof p === 'object' ? p : null; } catch (e) { return null; } };
  const savePick = p => { try { sessionStorage.setItem(KEY, JSON.stringify({ exam: p.exam, target: p.target, pace: p.pace, topics: [...p.topics], v: p.v, lv: p.lv, track: p.track, step: p.step, said: p.said, w: p.w })); } catch (e) { /* riêng tư/đầy: vẫn học bình thường */ } };
  const hashOf = i => '#/welcome/setup?s=' + STEPS[i];
  const urlOf = i => location.pathname + location.search + hashOf(i); // <base href="/">: đường dẫn tương đối sẽ ra khỏi /app/
  let live = null, runs = 0;
  function css() {
    if (document.getElementById('onbCss')) return;
    const s = document.createElement('style'); s.id = 'onbCss';
    s.textContent = `.onb-meta{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:.4rem .6rem}.onb-meta .lang-select{width:auto;max-width:8.5rem;flex:none;min-height:44px;padding:.3rem .6rem;font-size:.9rem}
.onb-acct{border:0;background:none;color:var(--muted);font:inherit;font-size:.9rem;white-space:nowrap;min-height:44px;padding:0 .2rem;cursor:pointer}.onb-acct b{color:var(--primary)}.onb-acct.hl{outline:3px solid var(--primary);border-radius:10px;padding:0 .6rem}.onb-acct:focus-visible{outline:3px solid var(--primary);outline-offset:2px}`;
    document.head.appendChild(s);
  }

  // D = phần dùng chung từ app.js: { view, TOPICS, topicOf, inDeck, addWord, saveSettings, finish, login }
  function run(s, D) {
    css();
    const me = ++runs, fromW = /^#\/welcome(\/login)?\/?(\?|$)/.test(App.prevHash || ''), view = D.view, $ = s => view.querySelector(s), $$ = s => [...view.querySelectorAll(s)];
    const TARGETS = { ielts: ['5.5', '6.0', '6.5', '7.0', '7.5', '8.0+'], ieltsgt: ['5.5', '6.0', '6.5', '7.0', '7.5', '8.0+'], toeic: ['450', '550', '650', '750', '850', '900+'], toefl: ['3.5', '4.0', '4.5', '5.0', '5.5+'], general: ['A2', 'B1', 'B2', 'C1'] };
    const DEF_T = { ielts: '7.0', ieltsgt: '6.5', toeic: '650', toefl: '4.5', general: 'B1' };
    const NEW_OF = { 10: 5, 20: 10, 40: 20 }; // cường độ → dailyGoal (lượt ôn) · dailyNew (từ mới)
    const TOPIC_GROUPS = { ielts: ['topics', 'writing'], ieltsgt: ['topics', 'speaking'], toeic: ['toeic', 'bsl'], toefl: ['awl', 'nawl', 'topics'], general: ['core', 'topics'] };
    // Nhãn "8.0+", "900+", "5.5+" chỉ để hiển thị; lưu không dấu +, phải hợp thang #582 (App.targetFits): IELTS 0–9, TOEIC 10–990, TOEFL 1–6, General A1–C2
    const bare = v => String(v || '').replace(/\+$/, ''), fits = (ex, v) => (TARGETS[ex] || []).find(b => bare(b) === bare(v)) || '';
    const was = ex => (ex === state.settings.exam && fits(ex, state.settings.examTarget)) || ''; // đã có mục tiêu hợp thang → chọn sẵn, không hỏi lại
    const pick = { exam: (App.exam && state.settings.exam) || 'ielts', target: '', pace: 20, topics: new Set(), v: {}, lv: '', step: 0, said: '' };
    pick.target = was(pick.exam);
    { const p = readPick(); if (p) { if (TARGETS[p.exam]) { pick.exam = p.exam; pick.target = fits(p.exam, p.target); } if (NEW_OF[p.pace]) pick.pace = p.pace; if (Array.isArray(p.topics)) pick.topics = new Set(p.topics); if (p.v && typeof p.v === 'object') pick.v = p.v; if (typeof p.lv === 'string') pick.lv = p.lv; if (typeof p.track === 'string') pick.track = p.track; if (typeof p.said === 'string') pick.said = p.said; if (STEPS[p.step]) pick.step = p.step; if (p.w) pick.w = 1; } }
    if (fromW) pick.w = 1; // có mục Welcome ngay trước bước đầu trong lịch sử (finishOnboarding gỡ cùng các bước, app.js)
    if (STEPS.includes(s)) pick.step = STEPS.indexOf(s); // hash thắng bước đã lưu (tải lại, Tiến/Lùi); vào không có ?s= → tiếp bước đang dở
    if (location.hash !== hashOf(pick.step)) try { history.replaceState(null, '', urlOf(pick.step)); } catch (e) { /* bỏ qua */ }
    // Phút khớp Tutor.minutes (tutor/core.js PACE 5/10/15, đọc settings.pace), số từ mới = dailyNew, Hôm nay đọc cùng các ô đó
    const paces = () => [[10, t('Nhẹ nhàng'), t('5 phút/ngày · 5 từ mới')], [20, t('Đều đặn'), t('10 phút/ngày · 10 từ mới')], [40, t('Tăng tốc'), t('15 phút/ngày · 20 từ mới')]];
    const topicsFor = ex => D.TOPICS.filter(x => TOPIC_GROUPS[ex].includes(x.group)).slice(0, 15);
    const TK = () => g.Tracks;
    let TR_ID = '';
    const setExam = async ex => {
      const K = TK(); if (K) { if (TR_ID) pick.track = TR_ID; else pick.track = pick.track || K.EX2T[ex] || 'ielts'; TR_ID = ''; ex = K.pickExam(pick); }
      if (ex !== pick.exam || !pick.target) pick.target = was(ex) || DEF_T[ex];
      pick.exam = ex;
      if (!App.loaded('words')) await App.need('words').catch(() => {});
      if ((ex === 'toeic' || ex === 'toefl') && !App.loaded('tsl')) await App.need('tsl').catch(() => {});
      const list = topicsFor(ex); pick.topics = new Set(list.slice(0, 3).map(x => x.id));
      if (K && state.settings.placement && (!pick.lv || pick.lv === 'test')) { const x = K.TR[pick.track], lv = x && K.start(x); if (lv && x.stages.some(y => y.id === lv)) pick.lv = lv; } // đã làm bài đầu vào: ghi sẵn kết quả (tracks.js start = cùng phép quy đổi của lộ trình), vẫn đổi được
      draw();
    };
    const trName = () => { const x = TK() && TK().TR[pick.track]; return x ? x.name : ''; };
    const lvName = () => { const x = TK() && TK().TR[pick.track], s = x && x.stages.find(y => y.id === pick.lv); return s ? (x.id === 'ielts' ? s.cefr : 'CEFR ' + s.cefr) : ''; };
    const tLabel = () => pick.exam === 'toeic' ? t('Điểm TOEIC mục tiêu?') : pick.exam === 'toefl' ? t('Band TOEFL mục tiêu?') : pick.exam === 'general' ? t('Trình độ bạn muốn đạt?') : t('Band mục tiêu của bạn?');
    // Ama phản hồi theo bước + lựa chọn vừa chạm (pick.said = bước vừa có lựa chọn mới)
    const kitLine = () => {
      const k = STEPS[pick.step], fresh = pick.said === k;
      if (k === 'goal') return fresh ? ['cheer', t('Tuyệt! Mình sẽ chọn bài hợp với mục tiêu {name}.', { name: trName() })] : ['happy', t('Chào bạn, mình là Ama! Vài câu hỏi nhanh để mình lên lộ trình riêng cho bạn nhé.')];
      if (k === 'level') return !fresh ? (state.settings.placement && lvName() ? ['happy', t('Theo bài kiểm tra, bạn bắt đầu từ {lv}. Muốn đổi thì chọn lại nhé.', { lv: lvName() })] : ['think', t('Chưa chắc trình độ? Làm bài kiểm tra 5 phút để mình xếp đúng chặng.')])
        : pick.lv === 'test' ? ['cheer', t('Lựa chọn thông minh! Bài kiểm tra chỉ mất khoảng 5 phút.')] : ['happy', t('Được rồi, mình bắt đầu từ {lv} nhé.', { lv: lvName() })];
      if (k === 'target') return fresh ? ['cheer', t('Mục tiêu {t} – mình sẽ cùng bạn chinh phục!', { t: pick.target })] : ['think', t('Đặt mục tiêu rõ ràng giúp mình chọn đúng độ khó.')];
      if (k === 'pace') return pick.pace === 10 ? ['happy', t('Từ từ mà chắc – 5 phút mỗi ngày cũng tạo khác biệt lớn.')] : pick.pace === 40 ? ['win', t('Tăng tốc nào! Mình sẽ nhắc bạn ôn đúng lúc.')] : ['cheer', t('Đều đặn mỗi ngày là bí quyết nhớ lâu!')];
      return ['win', pick.lv === 'test' ? t('Lộ trình đã sẵn sàng! Làm bài kiểm tra 5 phút rồi học Ngày 1 – không cần tài khoản.') : !pick.lv ? t('Lộ trình đã sẵn sàng! Bước cuối: bài kiểm tra 5 phút để xếp đúng chặng – bỏ qua cũng được.') : t('Lộ trình của bạn đã sẵn sàng! Học Ngày 1 ngay – không cần tài khoản.')];
    };
    const canAcct = () => g.Sync && g.Sync.gBtn && g.Sync.can !== false && !state.user;
    // 🎨 Bước có khung Stitch (brand/stitch/v2/bind/onb-<bước>.json, web/js/st/v2/onb-<bước>.js) → ST2.mount; bước chưa port giữ khung cũ bên dưới
    const TPL = { comm: 'c4', ielts: 'c1', toeic: 'c2', toefl: 'c3', work: 'c2' };
    const vsOf = (x, on) => (on && x.vs ? `<div class="trk-vs" role="group" aria-label="${esc(x.name)}">${x.vs.map(([k, nm]) => `<button type="button" data-tv="${k}" aria-pressed="${(pick.v[x.id] || x.vs[0][0]) === k}">${esc(nm)}</button>`).join('')}</div>` : '');
    const BARS = [['h-2.5', 'h-4', 'h-[22px]', 'h-7'], 'bg-[#2BA39A]', 'lt:bg-[#EADEC8] dk:bg-[#2B4750]'];
    const bars = (i, n) => BARS[0].map((h, j) => `<span class="w-1.5 ${h} rounded-sm ${j < Math.ceil((i + 1) / n * 4) ? BARS[1] : BARS[2]}"></span>`).join('');
    const v2 = (k, say) => { // giáo viên qua Chars.slot, cỡ theo ô khung Stitch: target 56×64 → xs, goal 110×140 → m, còn lại 140×170 → l
      const n = pick.step, S = g.ST2, K = TK(), meta = n === 0 ? `<div class="onb-meta px-5 max-w-xl mx-auto w-full">${canAcct() ? `<button type="button" class="onb-acct" id="setupIn">${t('Đã có tài khoản?')} <b>${t('Đăng nhập')}</b></button>` : '<span></span>'}${App.langPicker ? App.langPicker() : ''}</div>` : '';
      const d = { step: n + 1, steps: STEPS.length, stepTxt: `${n + 1} / ${STEPS.length}`, pct: Math.round((n + 1) / STEPS.length * 100), progAria: t('Tiến độ'), meta, say, foot: t('Miễn phí · Dữ liệu học thuộc về bạn'),
        kicker: g.Chars ? Chars.name('ama') : '', teacher: g.Chars ? Chars.slot('ama', { pose: pick.said === k ? 'cheer' : 'point', size: k === 'target' ? 'xs' : k === 'goal' ? 'm' : 'l' }) : '' };
      const tr = K && K.TR[pick.track], P = paces().find(x => x[0] === pick.pace) || paces()[1];
      if (k === 'goal') { if (K) K.setupGoal(pick); // nạp CSS .trk-vs (chip biến thể) của tracks.js
        Object.assign(d, { q: t('Mục tiêu của bạn là gì?'), foot: t('Chọn 1 gói – có thể học thêm gói khác sau.'),
          tracks: (K ? K.IDS : []).map(id => { const x = K.TR[id], on = id === pick.track; return { id, on, tpl: TPL[id] || 'c4', name: x.name, sub: x.benefit, badge: x.em, vs: vsOf(x, on) }; }) }); }
      if (k === 'level') { const ss = tr ? tr.stages : []; // cùng nhãn với Tracks.lvBtns; chưa chọn = chặng đầu sáng sẵn như bản cũ
        Object.assign(d, { q: t('Trình độ hiện tại của bạn?'), isTest: pick.lv === 'test', lvs: ss.map((x, i) => ({ id: x.id, on: pick.lv === x.id || (!pick.lv && !i), bars: bars(i, ss.length), ti: tr.id === 'ielts' ? x.cefr : 'CEFR ' + x.cefr, sub: tr.id === 'ielts' ? x.band : '' })) }); }
      if (k === 'target') Object.assign(d, { q: tLabel(), bands: TARGETS[pick.exam].map(v => ({ v, on: pick.target === v })) });
      if (k === 'pace') { const B = S.P['onb-pace'](t, esc); // phút khớp Tutor PACE · số từ mới = dailyNew: 1 chuỗi có sẵn, mẫu tách viên phút + dòng phụ
        Object.assign(d, { q: t('Bạn muốn học với cường độ nào?'), foot: t('Miễn phí · Dữ liệu học thuộc về bạn'), paces: paces().map(([v, ti, sub], i) => { const [m, w] = sub.split(' · '); return { v, on: pick.pace === v, ti, min: w ? m : '', sub: w || m, badge: B['b' + i]({}) }; }) }); }
      if (k === 'ready') Object.assign(d, { q: t('Lộ trình của bạn'), goTxt: pick.lv === 'test' ? '🧭 ' + t('Làm bài kiểm tra đầu vào') : !pick.lv ? '🧭 ' + t('Kiểm tra đầu vào (5 phút)') : t('Bắt đầu Ngày {n}', { n: 1 }), sum: [
        { tpl: 'c1', ic: 'menu_book', k: t('Mục tiêu'), v: trName() }, { tpl: 'c1', ic: 'school', k: t('Trình độ'), v: pick.lv === 'test' ? '🧭 ' + t('Làm bài kiểm tra đầu vào') : lvName() || (K ? 'CEFR ' + K.TR[pick.track].stages[0].cefr : '') },
        { tpl: 'c2', ic: 'verified', k: tLabel().replace(/\?$/, ''), v: pick.target }, { tpl: 'c3', ic: 'local_fire_department', k: P[1], v: P[2] }] });
      S.mount(view, 'onb-' + k, d, null).classList.add('overflow-x-clip'); // giáo viên ở mép trái (px-5): canvas trong suốt của Chars.slot vượt mép màn 360/412 → cắt ở mép màn (phần nhìn thấy nằm trong màn), không cuộn ngang
      // thẻ gói = div role=radio của mẫu → bàn phím Enter/Space như bấm
      view.querySelectorAll('[role=radio][data-track]').forEach(c => c.onkeydown = ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); c.click(); } });
    };
    const focusQ = () => { const q = $('#onbQ'); if (q) { q.tabIndex = -1; q.focus({ preventScroll: true }); } };
    // Lùi đúng 1 bước: mục lịch sử do mình đẩy → history.back (như Back hệ thống); vào thẳng (tải lại, link) → thay bằng bước trước. Bước đầu về Welcome.
    const back = () => {
      if (!pick.step) { if (fromW && !history.state) history.back(); else App.replaceHash('#/welcome'); return; }
      if (history.state && history.state.onb === pick.step) history.back(); else App.replaceHash(hashOf(pick.step - 1));
    };
    const draw = () => {
      if (me !== runs || !/^#\/welcome\/setup/.test(location.hash)) return; // đã rời màn trong lúc nạp gói từ → không vẽ đè trang khác
      savePick(pick);
      const n = pick.step, say = kitLine()[1];
      v2(STEPS[n], say);
      $('#onbBack').onclick = back;
      document.onkeydown = e => { if (e.key !== 'Escape' || (e.target && e.target.tagName === 'SELECT') || !document.getElementById('modal').hidden) return; e.preventDefault(); back(); }; // route() tự gỡ khi rời trang
      const nx = $('#obNext'); if (nx) nx.onclick = () => { pick.step++; pick.said = ''; try { history.pushState({ onb: pick.step, n: ((history.state && history.state.n) || 0) + 1 }, '', urlOf(pick.step)); } catch (e) { /* vẫn đi tiếp được */ } draw(); focusQ(); };
      const acct = $('#setupIn'); if (acct) acct.onclick = e => { e.stopPropagation(); D.login(draw); }; // tài khoản trống: ở lại đúng bước, vẽ lại để ẩn liên kết đăng nhập
      if (TK()) TK().bindSetup(view, pick, id => { TR_ID = id; pick.said = 'goal'; setExam(pick.exam); }, () => { pick.said = 'level'; draw(); });
      $$('#bandT button').forEach(b => b.onclick = () => { pick.target = b.dataset.v; pick.said = 'target'; draw(); });
      $$('[data-pace]').forEach(b => b.onclick = () => { pick.pace = +b.dataset.pace; pick.said = 'pace'; draw(); });
      const go = $('#go'); if (go) go.onclick = async () => {
        go.disabled = true; go.textContent = '⏳ ' + t('Đang chuẩn bị bộ thẻ…');
        const tg = bare(pick.target); // không lưu dấu + (xem ghi chú TARGETS)
        Object.assign(state.settings, { exam: pick.exam, examTarget: tg, pace: pick.pace, dailyGoal: pick.pace, dailyNew: NEW_OF[pick.pace] });
        if (/^ielts/.test(pick.exam)) state.settings.targetBand = tg;
        const to = TK() ? await TK().startSetup(pick) : '#/review';
        await D.saveSettings();
        for (const id of pick.topics) for (const w of D.topicOf(id).words) if (!D.inDeck(w.word)) await D.addWord(w, null, { silent: true }); // bộ thẻ ôn ban đầu hợp mục tiêu
        if (to === '#/placement') try { sessionStorage.setItem('lk.plInv', JSON.stringify(topicsFor(pick.exam).map(x => x.id))); } catch (e) { /* riêng tư: không lời mời */ } // lời mời 5 phút (placement.js)
        await D.finish(true, to); // Ngày 1 hoặc lời mời – chưa cần tài khoản
      };
    };
    live = i => { if (!view.querySelector('#onbBack')) return false; if (STEPS[i] && i !== pick.step) { pick.step = i; pick.said = ''; } draw(); focusQ(); return true; };
    setExam(pick.exam);
  }
  // Back/Tiến/Esc khi đang trong thiết lập: vẽ lại đúng bước. false = màn thiết lập không còn trên trang → app.js chạy lại từ đầu
  const go = s => !!live && live(STEPS.indexOf(s));
  g.Onboard = { run, go, STEPS };
})(self);
