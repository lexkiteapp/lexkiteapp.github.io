/* 🚀 Thiết lập lần đầu TỪNG BƯỚC (tải lười – gói 'onb', app.js setup() gọi): 1 câu hỏi/màn kiểu Duolingo/Busuu.
 * Thanh tiến độ + nút quay lại + Kit phản hồi từng lựa chọn. Mục tiêu (gói học – tracks.js) → trình độ / kiểm tra đầu vào 5 phút
 * → điểm mục tiêu → cường độ → sẵn sàng → vào thẳng Ngày 1, KHÔNG cần tài khoản (mời lưu tiến độ sau khi xong Ngày 1 – path-reward.js).
 * "Đã có tài khoản?" = liên kết nhỏ ở màn 1. Giữ nguyên mọi lựa chọn & cách lưu của bố cục cũ (id #go = nút bắt đầu ở màn cuối). */
(function (g) {
  const App = g.App, { state } = App, { esc } = UI;
  const STEPS = ['goal', 'level', 'target', 'pace', 'ready'];
  function css() {
    if (document.getElementById('onbCss')) return;
    const s = document.createElement('style'); s.id = 'onbCss';
    s.textContent = `.onb{max-width:600px;margin:0 auto;display:flex;flex-direction:column;gap:1rem}@media (max-width:700px){.onb{min-height:calc(100svh - 2rem)}}
.onb-top{display:flex;align-items:center;gap:.7rem}.onb-top .progress{flex:1}.onb-back{min-width:44px;min-height:44px;border:0;background:transparent;color:var(--muted);font-size:1.5rem;line-height:1;border-radius:12px;cursor:pointer}
.onb-back:hover{background:var(--surface-2);color:var(--text)}.onb-back:focus-visible,.onb-acct:focus-visible{outline:3px solid var(--primary);outline-offset:2px}
.onb-meta{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:.4rem .6rem;margin-top:-.4rem}.onb-meta .lang-select{width:auto;max-width:8.5rem;flex:none;min-height:40px;padding:.3rem .6rem;font-size:.9rem}
.onb-acct{border:0;background:none;color:var(--muted);font:inherit;font-size:.9rem;white-space:nowrap;min-height:44px;padding:0 .2rem;cursor:pointer}.onb-acct b{color:var(--primary)}.onb-acct.hl{outline:3px solid var(--primary);border-radius:10px;padding:0 .6rem}
.onb-kit{display:flex;align-items:flex-end;gap:.6rem}.onb-kit svg{flex:none;filter:drop-shadow(0 6px 10px rgba(0,0,0,.18))}
.onb-say{position:relative;padding:.7rem .9rem;border-radius:16px 16px 16px 4px;background:var(--primary-soft);font-weight:700;line-height:1.35}
.onb-q{margin:.2rem 0 .9rem;font-size:clamp(1.35rem,4.6vw,1.75rem);line-height:1.2}.onb-sub{margin:-.6rem 0 .9rem}
.onb-body{flex:1;animation:onbIn .28s ease-out}.onb-foot{position:sticky;bottom:0;padding:.8rem 0 calc(.8rem + env(safe-area-inset-bottom));background:linear-gradient(transparent,var(--bg) 30%)}
.onb-pick{display:grid;gap:.6rem}.onb-pick .option{flex-direction:column;align-items:flex-start;gap:.2rem;min-height:64px;text-align:start}
.onb-test{display:flex;gap:.7rem;align-items:center;width:100%;min-height:72px;padding:.8rem .9rem;border:2px solid var(--line);border-radius:16px;background:var(--surface);color:var(--text);font:inherit;text-align:start;cursor:pointer}
.onb-test[aria-pressed=true]{border-color:var(--primary);background:var(--primary-soft)}.onb-test .trk-em{font-size:1.8rem}
.onb-or{margin:1rem 0 .2rem;color:var(--muted);font-size:.9rem;font-weight:700}
.onb-sum{list-style:none;margin:0;padding:0;display:grid;gap:.5rem}.onb-sum li{display:flex;gap:.6rem;align-items:center;padding:.7rem .85rem;border-radius:14px;background:var(--surface-2)}
.onb-sum b{margin-inline-start:auto}.onb-free{margin:.8rem 0 0;text-align:center}
#bandT{flex-wrap:wrap}#bandT button{min-height:48px;min-width:64px}
@keyframes onbIn{from{opacity:0;transform:translateX(18px)}to{opacity:1;transform:none}}[dir=rtl] .onb-body{animation-name:onbInR}@keyframes onbInR{from{opacity:0;transform:translateX(-18px)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){.onb-body{animation:none}}`;
    document.head.appendChild(s);
  }

  // D = phần dùng chung từ app.js: { view, TOPICS, topicOf, inDeck, addWord, saveSettings, finish, login }
  function run(login, D) {
    css();
    const view = D.view, $ = s => view.querySelector(s), $$ = s => [...view.querySelectorAll(s)];
    const TARGETS = { ielts: ['5.5', '6.0', '6.5', '7.0', '7.5', '8.0+'], ieltsgt: ['5.5', '6.0', '6.5', '7.0', '7.5', '8.0+'], toeic: ['450', '550', '650', '750', '850', '900+'], toefl: ['3.5', '4.0', '4.5', '5.0', '5.5+'], general: ['A2', 'B1', 'B2', 'C1'] };
    const DEF_T = { ielts: '7.0', ieltsgt: '6.5', toeic: '650', toefl: '4.5', general: 'B1' };
    const TOPIC_GROUPS = { ielts: ['topics', 'writing'], ieltsgt: ['topics', 'speaking'], toeic: ['toeic', 'bsl'], toefl: ['awl', 'nawl', 'topics'], general: ['core', 'topics'] };
    const pick = { exam: (App.exam && state.settings.exam) || 'ielts', target: '', pace: 20, topics: new Set(), v: {}, lv: '', step: 0, said: '' };
    const paces = () => [[10, '🐢 ' + t('Nhẹ nhàng'), t('5 phút/ngày · 5 từ mới')], [20, '🚶 ' + t('Đều đặn'), t('10–15 phút/ngày · 10 từ mới')], [40, '🚀 ' + t('Tăng tốc'), t('25 phút/ngày · 20 từ mới')]];
    const topicsFor = ex => D.TOPICS.filter(x => TOPIC_GROUPS[ex].includes(x.group)).slice(0, 15);
    const TK = () => g.Tracks;
    let TR_ID = '';
    const setExam = async ex => {
      const K = TK(); if (K) { if (TR_ID) pick.track = TR_ID; else pick.track = pick.track || K.EX2T[ex] || 'ielts'; TR_ID = ''; ex = K.pickExam(pick); }
      if (ex !== pick.exam || !pick.target) pick.target = DEF_T[ex];
      pick.exam = ex;
      if (!App.loaded('words')) await App.need('words').catch(() => {});
      if ((ex === 'toeic' || ex === 'toefl') && !App.loaded('tsl')) await App.need('tsl').catch(() => {});
      const list = topicsFor(ex); pick.topics = new Set(list.slice(0, 3).map(x => x.id));
      draw();
    };
    const trName = () => { const x = TK() && TK().TR[pick.track]; return x ? x.name : ''; };
    const lvName = () => { const x = TK() && TK().TR[pick.track], s = x && x.stages.find(y => y.id === pick.lv); return s ? (x.id === 'ielts' ? s.cefr : 'CEFR ' + s.cefr) : ''; };
    const tLabel = () => pick.exam === 'toeic' ? t('Điểm TOEIC mục tiêu?') : pick.exam === 'toefl' ? t('Band TOEFL mục tiêu?') : pick.exam === 'general' ? t('Trình độ bạn muốn đạt?') : t('Band mục tiêu của bạn?');
    // Kit phản hồi theo bước + lựa chọn vừa chạm (pick.said = bước vừa có lựa chọn mới)
    const kitLine = () => {
      const k = STEPS[pick.step], fresh = pick.said === k;
      if (k === 'goal') return fresh ? ['cheer', t('Tuyệt! Mình sẽ chọn bài hợp với mục tiêu {name}.', { name: trName() })] : ['happy', t('Chào bạn, mình là Kit! Vài câu hỏi nhanh để mình lên lộ trình riêng cho bạn nhé.')];
      if (k === 'level') return !fresh ? ['think', t('Chưa chắc trình độ? Làm bài kiểm tra 5 phút để mình xếp đúng chặng.')]
        : pick.lv === 'test' ? ['cheer', t('Lựa chọn thông minh! Bài kiểm tra chỉ mất khoảng 5 phút.')] : ['happy', t('Được rồi, mình bắt đầu từ {lv} nhé.', { lv: lvName() })];
      if (k === 'target') return fresh ? ['cheer', t('Mục tiêu {t} – mình sẽ cùng bạn chinh phục!', { t: pick.target })] : ['think', t('Đặt mục tiêu rõ ràng giúp mình chọn đúng độ khó.')];
      if (k === 'pace') return pick.pace === 10 ? ['happy', t('Từ từ mà chắc – 5 phút mỗi ngày cũng tạo khác biệt lớn.')] : pick.pace === 40 ? ['win', t('Tăng tốc nào! Mình sẽ nhắc bạn ôn đúng lúc.')] : ['cheer', t('Đều đặn mỗi ngày là bí quyết nhớ lâu!')];
      return ['win', pick.lv === 'test' ? t('Lộ trình đã sẵn sàng! Làm bài kiểm tra 5 phút rồi học Ngày 1 – không cần tài khoản.') : t('Lộ trình của bạn đã sẵn sàng! Học Ngày 1 ngay – không cần tài khoản.')];
    };
    const body = () => {
      const k = STEPS[pick.step];
      if (k === 'goal') return `<h1 class="onb-q" id="onbQ">${t('Mục tiêu của bạn là gì?')}</h1><p class="muted small onb-sub">${t('Chọn 1 gói – có thể học thêm gói khác sau.')}</p>${TK() ? TK().setupGoal(pick) : ''}`;
      if (k === 'level') return `<h1 class="onb-q" id="onbQ">${t('Trình độ hiện tại của bạn?')}</h1>
        <button type="button" class="onb-test" data-lv="test" aria-pressed="${pick.lv === 'test'}"><span class="trk-em" aria-hidden="true">🧭</span><span><b>${t('Kiểm tra trình độ (5 phút)')}</b><span class="small muted" style="display:block">${t('Để Lexkite cá nhân hóa lộ trình cho bạn')}</span></span></button>
        <p class="onb-or">${t('Hoặc tự chọn trình độ:')}</p>${TK() ? TK().setupLevel(pick, true) : ''}`;
      if (k === 'target') return `<h1 class="onb-q" id="onbQ">${tLabel()}</h1><div class="tabs" style="display:inline-flex" id="bandT" role="group" aria-labelledby="onbQ">${TARGETS[pick.exam].map(b => `<button type="button" data-v="${b}" class="${pick.target === b ? 'on' : ''}" aria-pressed="${pick.target === b}">${b}</button>`).join('')}</div>`;
      if (k === 'pace') return `<h1 class="onb-q" id="onbQ">${t('Bạn muốn học với cường độ nào?')}</h1><div class="onb-pick" role="group" aria-labelledby="onbQ">${paces().map(([v, pt, d]) => `<button type="button" class="option ${pick.pace === v ? 'right' : ''}" data-pace="${v}" aria-pressed="${pick.pace === v}"><b>${pt}</b><span class="small muted">${d}</span></button>`).join('')}</div>`;
      const P = paces().find(x => x[0] === pick.pace) || paces()[1];
      return `<h1 class="onb-q" id="onbQ">${t('Lộ trình của bạn')}</h1><ul class="onb-sum">
        <li><span aria-hidden="true">${TK() && TK().TR[pick.track] ? TK().TR[pick.track].em : '🎯'}</span>${t('Mục tiêu')}<b>${esc(trName())}</b></li>
        <li><span aria-hidden="true">📶</span>${t('Trình độ')}<b>${pick.lv === 'test' ? '🧭 ' + t('Làm bài kiểm tra đầu vào') : esc(lvName() || (TK() ? 'CEFR ' + TK().TR[pick.track].stages[0].cefr : ''))}</b></li>
        <li><span aria-hidden="true">🏁</span>${esc(tLabel().replace(/\?$/, ''))}<b>${esc(pick.target)}</b></li>
        <li><span aria-hidden="true">⏱</span>${P[1]}<b>${P[2]}</b></li></ul>
        <p class="small muted onb-free">${t('Miễn phí · Dữ liệu học thuộc về bạn')}</p>`;
    };
    const canAcct = () => g.Sync && g.Sync.gBtn && g.Sync.can !== false && !state.user;
    const draw = () => {
      const n = pick.step, last = n === STEPS.length - 1, [mood, say] = kitLine();
      view.innerHTML = `<div class="onb">
        <div class="onb-top"><button type="button" class="onb-back" id="onbBack" aria-label="${esc(t('Quay lại'))}">${document.dir === 'rtl' ? '→' : '←'}</button>
          <div class="progress" role="progressbar" aria-label="${esc(t('Tiến độ'))}" aria-valuemin="1" aria-valuemax="${STEPS.length}" aria-valuenow="${n + 1}"><i style="width:${(n + 1) / STEPS.length * 100}%"></i></div></div>
        ${n === 0 ? `<div class="onb-meta">${canAcct() ? `<button type="button" class="onb-acct" id="setupIn">${t('Đã có tài khoản?')} <b>${t('Đăng nhập')}</b></button>` : '<span></span>'}${App.langPicker ? App.langPicker() : ''}</div>` : ''}
        <div class="onb-kit">${g.Kit ? Kit.svg(mood, 64) : ''}<div class="onb-say" role="status" aria-live="polite">${esc(say)}</div></div>
        <div class="onb-body" data-step="${STEPS[n]}">${body()}</div>
        <div class="onb-foot">${last ? `<button type="button" class="btn primary lg block" id="go">${pick.lv === 'test' ? '🧭 ' + t('Làm bài kiểm tra đầu vào') : t('Bắt đầu Ngày {n}', { n: 1 })} →</button>` : `<button type="button" class="btn primary lg block" id="obNext">${t('Tiếp tục')} →</button>`}</div>
      </div>`;
      $('#onbBack').onclick = () => { if (n) { pick.step--; pick.said = ''; draw(); } else location.hash = '#/welcome'; };
      const nx = $('#obNext'); if (nx) nx.onclick = () => { pick.step++; pick.said = ''; draw(); const q = $('#onbQ'); if (q) { q.tabIndex = -1; q.focus({ preventScroll: true }); } };
      const acct = $('#setupIn'); if (acct) { acct.onclick = e => { e.stopPropagation(); D.login(); }; if (login && !pick.shownLogin) { pick.shownLogin = 1; acct.classList.add('hl'); acct.focus(); } }
      if (TK()) TK().bindSetup(view, pick, id => { TR_ID = id; pick.said = 'goal'; setExam(pick.exam); }, () => { pick.said = 'level'; draw(); });
      $$('#bandT button').forEach(b => b.onclick = () => { pick.target = b.dataset.v; pick.said = 'target'; draw(); });
      $$('[data-pace]').forEach(b => b.onclick = () => { pick.pace = +b.dataset.pace; pick.said = 'pace'; draw(); });
      const go = $('#go'); if (go) go.onclick = async () => {
        go.disabled = true; go.textContent = '⏳ ' + t('Đang chuẩn bị bộ thẻ…');
        Object.assign(state.settings, { exam: pick.exam, examTarget: pick.target, dailyGoal: pick.pace, dailyNew: pick.pace === 10 ? 5 : pick.pace === 20 ? 10 : 20 });
        if (/^ielts/.test(pick.exam)) state.settings.targetBand = pick.target;
        const to = TK() ? await TK().startSetup(pick) : '#/review';
        await D.saveSettings();
        for (const id of pick.topics) for (const w of D.topicOf(id).words) if (!D.inDeck(w.word)) await D.addWord(w, null, { silent: true }); // bộ thẻ ôn ban đầu hợp mục tiêu
        await D.finish(true, to); // vào thẳng Ngày 1 của gói (hoặc bài kiểm tra đầu vào) – chưa cần tài khoản
      };
    };
    setExam(pick.exam);
  }
  g.Onboard = { run, STEPS };
})(self);
