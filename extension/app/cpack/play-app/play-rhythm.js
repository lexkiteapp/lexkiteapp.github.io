/* 🥁 Nhịp điệu (docs/specs/play-community-1211.md, chuỗi mini-game 12/11) – chạm đúng nhịp NHẤN của câu tiếng Anh. Tải lười trong gói 'pgames'.
   Luật: một câu hiện từng từ theo nhịp đều; từ NHẤN (từ nội dung) → chạm đúng lúc, từ YẾU (a, the, to…) → để im. Đó chính là nhịp "stress-timed"
   của tiếng Anh – kỹ năng nói thật, chấm bằng PronCoach.plan (cùng nguồn với bài Nhịp câu ở phần Phát âm, không chép lại luật nhấn).
   Câu: ví dụ của từ ĐẾN HẠN / yếu trước (PlayBlitz.core.order) → ví dụ chung → 12 câu mẫu của PronCoach.
   SRS: chỉ từ ĐẾN HẠN, chỉ khi chạm đúng từ đó, cả câu ≥ 90 % và KHÔNG chạm thừa → Good qua SRS.review (không đụng FSRS; sai/lỡ KHÔNG bị phạt – đây là bài nhịp, không phải nhớ nghĩa).
   Âm: tích-tắc Web Audio lên lịch trên đồng hồ âm thanh (chính xác, không trôi) + phản hồi chung Sfx.answer; nút tắt âm riêng; không dùng màu làm tín hiệu duy nhất. */
(function (g) {
  const GOOD = 240, PERFECT = 90, N_SENT = 5, LEAD = 4, MKEY = 'lk.rhythm.mute', BKEY = 'lk.rhythm.best';
  const beatOf = i => 700 - 35 * i; // câu 1 → 5: 700 → 560 ms/nhịp (≈ 86 → 107 bpm)
  const mult = combo => (combo >= 6 ? 3 : combo >= 3 ? 2 : 1); // cùng luật combo với Thử thách 60 giây
  const key = w => String(w || '').toLowerCase().trim();

  /* ---------- Lõi thuần (có test: scripts/test/play-rhythm.mjs) ---------- */
  // Một lần chạm (ms tính từ nhịp của từ đầu tiên) → { k: chỉ số từ, d: lệch ms } hoặc null nếu không gần nhịp nào / nhịp đó đã có chạm.
  function snap(tap, n, beat, used) {
    const k = Math.round(tap / beat), d = tap - k * beat;
    return k >= 0 && k < n && Math.abs(d) <= GOOD && !used.has(k) ? { k, d } : null;
  }
  // plan = [{ stress }], taps = [ms…] → { words: ['perfect'|'good'|'miss'|'wrong'|'rest'], extra, hits, stressed, acc 0–100, score, best, hitAt: Set }
  function judge(plan, taps, beat, combo0 = 0) {
    const n = plan.length, slot = new Map(), ev = [];
    let extra = 0;
    for (const tp of taps.slice().sort((a, b) => a - b)) { // hai chạm cùng một nhịp: giữ chạm GẦN nhịp hơn, chạm xa hơn thành "thừa" (chạm sớm không cướp chỗ chạm đúng)
      const s = snap(tp, n, beat, new Set()); if (!s) { extra++; ev.push({ at: tp, k: -1 }); continue; }
      const o = slot.get(s.k); if (!o) slot.set(s.k, s); else { extra++; ev.push({ at: tp, k: -1 }); if (Math.abs(s.d) < Math.abs(o.d)) slot.set(s.k, s); }
    }
    for (const [k, s] of slot) ev.push({ at: k * beat, k, d: s.d });
    plan.forEach((w, k) => { if (w.stress && !slot.has(k)) ev.push({ at: k * beat, k: -2 }); }); // bỏ lỡ từ nhấn cũng đứt combo (không "bỏ bớt từ để giữ chuỗi")
    const words = plan.map(() => 'rest');
    let combo = combo0, best = 0, score = 0, hits = 0;
    plan.forEach((w, k) => { if (w.stress) words[k] = 'miss'; });
    for (const e of ev.sort((a, b) => a.at - b.at)) {
      if (e.k < 0) { combo = 0; continue; }
      if (!plan[e.k].stress) { words[e.k] = 'wrong'; combo = 0; continue; }
      const p = Math.abs(e.d) <= PERFECT; words[e.k] = p ? 'perfect' : 'good'; hits++; combo++; best = Math.max(best, combo); score += (p ? 20 : 10) * mult(combo);
    }
    const stressed = plan.filter(w => w.stress).length, wrong = words.filter(x => x === 'wrong').length;
    const acc = stressed ? Math.round((hits / (stressed + extra + wrong)) * 100) : 0;
    return { words, extra: extra + wrong, hits, stressed, acc, score, best, combo }; // combo = chuỗi còn lại cuối câu (mang sang câu sau) · extra = mọi lần chạm thừa (ngoài nhịp + chạm vào từ yếu)
  }
  const xpOf = (hits, acc) => Math.min(40, 5 + hits * 2 + (acc >= 90 ? 5 : 0));
  const srsGrade = (res, k) => (k >= 0 && (res.words[k] === 'perfect' || res.words[k] === 'good') && res.acc >= 90 && !res.extra ? 2 : null); // null = không chấm · phải im ở từ yếu (không "chạm mọi nhịp" để ăn gian)
  // Câu hợp lệ: toàn chữ Latinh, 4–10 từ, có ≥ 2 từ nhấn và ≥ 1 từ yếu (có gì để im), chứa từ đích.
  function usable(s, plan, word) {
    if (!/^[A-Za-z][A-Za-z0-9 ,.'’!?;:-]{8,90}$/.test(s)) return null;
    if (plan.length < 4 || plan.length > 10 || plan.filter(w => w.stress).length < 2 || plan.every(w => w.stress)) return null;
    const k = plan.findIndex(w => key(w.w) === key(word)); return { k };
  }
  // Chọn N câu: {s, word, k (chỉ số từ đích trong câu hoặc -1)}
  function pick(items, coach, accent, WEAK, n, fallback) {
    const out = [], seen = new Set();
    for (const w of items) {
      const s = String(w.ex || '').trim(), pl = coach.plan(s, accent, WEAK), u = usable(s, pl, w.word);
      if (u && u.k >= 0 && !seen.has(s)) { seen.add(s); out.push({ s, word: w.word, k: u.k }); if (out.length >= n) return out; }
    }
    for (const x of fallback) { if (out.length >= n) break; if (!seen.has(x.s) && usable(x.s, coach.plan(x.s, accent, WEAK), '')) { seen.add(x.s); out.push({ s: x.s, word: '', k: -1 }); } }
    return out;
  }
  const core = { snap, judge, xpOf, srsGrade, usable, pick, mult, beatOf, GOOD, PERFECT };

  /* ---------- Vòng chơi (DOM) ---------- */
  function run(H, src) {
    const { Cards, SRS, Stats, endOfToday } = g.Core, App = g.App, { state } = App, view = App.view;
    const { $, esc, speak } = g.UI, t = g.t, Coach = g.PronCoach, B = g.PlayBlitz.core;
    const { accent, emptySource, head, norm, pool, practiceDone } = H;
    const list = (!src || src === 'deck' ? [...pool('due'), ...pool('weak'), ...pool('deck')] : pool(src)).filter(w => w && w.word && w.ex), hash0 = location.hash;
    const sents = pick(B.order(list.map(norm), state.cards, endOfToday(), Math.random), Coach, accent(), g.UI.WEAK, N_SENT, [...Coach.SENTENCES].sort(() => Math.random() - 0.5));
    if (sents.length < 3) return emptySource(src);
    let muted = false, best = 0; try { muted = localStorage.getItem(MKEY) === '1'; best = +localStorage.getItem(BKEY) || 0; } catch (e) { /* riêng tư */ }
    const S = { osc: [], i: 0, score: 0, combo: 0, bestCombo: 0, hits: 0, stressed: 0, extra: 0, missed: [], over: false, T0: 0, taps: [], plan: [], live: false, raf: 0, timers: [] };
    if (!document.getElementById('rhCss')) {
      const st = document.createElement('style'); st.id = 'rhCss';
      st.textContent = `.rh-s{display:flex;flex-wrap:wrap;gap:.9rem .6rem;justify-content:center;margin:.9rem 0 1rem;direction:ltr}.rh-b{display:block;width:14px;height:14px;border-radius:50%;margin:0 auto;background:var(--primary);opacity:.25}.rh-b.p{opacity:1}
.rh-w{position:relative;display:inline-flex;flex-direction:column;align-items:center;min-width:2.2rem;padding:.45rem .6rem .3rem;border-radius:12px;background:var(--surface-2,rgba(127,127,127,.12));border:2px solid transparent;font-size:1.15rem}
.rh-w i{font-style:normal;font-size:.8rem;line-height:1;min-height:.9rem}.rh-w.on{border-color:var(--primary);background:var(--primary-soft)}.rh-w.on::before{content:'▼';position:absolute;top:-.95rem;left:50%;transform:translateX(-50%);font-size:.7rem;line-height:1}
.rh-w.perfect,.rh-w.good{background:var(--good-soft);color:var(--good-text);border-color:var(--good-text)}.rh-w.miss{border-style:dashed;border-color:var(--again-text,currentColor);background:var(--again-soft)}.rh-w.wrong{background:var(--again-soft);border-color:var(--again-text,currentColor);text-decoration:line-through}
.rh-w.st b{font-weight:800}.rh-w.wk{font-size:.95rem}#rhM{min-width:44px;min-height:44px}.rh-c[hidden]{display:inline-flex;visibility:hidden}.rh-tap{width:100%;margin-top:.9rem;min-height:96px;font-size:1.4rem;touch-action:manipulation;user-select:none;-webkit-user-select:none}
.rh-tap:active,.rh-tap.hit{transform:scale(.97)}.rh-tap.hit{box-shadow:0 0 0 4px var(--primary-soft)}.rh-cue{min-height:1.6rem;font-weight:700;text-align:center}@media(prefers-reduced-motion:reduce){.rh-tap:active,.rh-tap.hit{transform:none}}`;
      document.head.appendChild(st);
    }
    // --- Âm: tích-tắc lên lịch theo đồng hồ âm thanh ---
    let ctx = null; const ac = () => { if (ctx) return ctx; try { ctx = new (g.AudioContext || g.webkitAudioContext)(); } catch (e) { ctx = null; } return ctx; };
    const audible = () => !muted && !(g.Core && g.Core.sfxOff) && state.settings.sfx !== false;
    function tick(atMs) {
      const c = ac(); if (!c || !audible()) return;
      if (c.state === 'suspended') c.resume().catch(() => {});
      const when = c.currentTime + Math.max(0, (atMs - performance.now()) / 1000), o = c.createOscillator(), gn = c.createGain();
      o.type = 'triangle'; o.frequency.value = 990; gn.gain.setValueAtTime(0.0001, when); gn.gain.exponentialRampToValueAtTime(0.05, when + 0.004); gn.gain.exponentialRampToValueAtTime(0.0001, when + 0.07);
      o.connect(gn).connect(c.destination); o.start(when); o.stop(when + 0.08); S.osc.push(o);
    }
    const silence = () => { S.osc.forEach(o => { try { o.stop(0); } catch (e) { /* đã dừng */ } }); S.osc = []; }; // tích-tắc đã lên lịch trước phải tắt được (tạm dừng / tắt âm)
    const stop = () => { silence(); cancelAnimationFrame(S.raf); S.timers.forEach(clearTimeout); S.timers = []; S.live = false; };
    const later = (f, ms) => { const id = setTimeout(f, ms); S.timers.push(id); };
    const live = m => { const r = document.getElementById('fxLive'); if (r) { r.textContent = ''; setTimeout(() => { r.textContent = m; }, 40); } };
    const muteBtn = () => `<button class="icon-btn" id="rhM" aria-pressed="${muted}" aria-label="${esc(muted ? t('Bật âm') : t('Tắt âm'))}">${muted ? '🔇' : '🔊'}</button>`;
    const wireMute = () => { const b = $('#rhM'); if (b) b.onclick = () => { muted = !muted; try { localStorage.setItem(MKEY, muted ? '1' : '0'); } catch (e) { /* bỏ qua */ } if (muted) silence(); b.textContent = muted ? '🔇' : '🔊'; b.setAttribute('aria-pressed', muted); b.setAttribute('aria-label', muted ? t('Bật âm') : t('Tắt âm')); }; };
    const vis = () => { if (document.hidden && S.live) { stop(); S.retry = true; } else if (!document.hidden && S.retry && !S.over) { S.retry = false; sentence(); } };
    const keys = e => { const tg = e.target; if (e.repeat || !S.live || (tg && tg.closest && tg.closest('input,textarea,a,button') && tg.id !== 'rhT')) return; /* Space/Enter trên ✕ hoặc nút tắt âm vẫn dùng được */ if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); tap(); } };
    document.addEventListener('visibilitychange', vis); document.addEventListener('keydown', keys);
    App.cleanup = () => { stop(); document.removeEventListener('visibilitychange', vis); document.removeEventListener('keydown', keys); if (ctx && ctx.close) ctx.close().catch(() => {}); };

    const chips = plan => plan.map((w, k) => `<span class="rh-w ${w.stress ? 'st' : 'wk'}" data-k="${k}" lang="en" role="listitem"><i aria-hidden="true">${w.stress ? '●' : ''}</i>${w.stress ? `<b>${esc(w.w)}</b>` : esc(w.w)}<i aria-hidden="true" data-m></i></span>`).join('');
    const MARK = { perfect: '✓✓', good: '✓', miss: '✗', wrong: '!' };
    function intro() {
      const demo = Coach.plan('I want to go to the shop.', accent(), g.UI.WEAK);
      view.innerHTML = `<div class="study-wrap rh">${head(`🥁 ${t('Nhịp điệu')}`, 0, 1, muteBtn())}
        <div class="card empty"><div class="em">🥁</div><p>${t('Từ NHẤN (to, đậm, có chấm ●) thì chạm đúng nhịp; từ yếu (a, the, to…) thì để im.')}</p>
        <div class="rh-s" aria-hidden="true">${chips(demo)}</div>
        <p class="small muted">${t('Gõ phím Cách (Space) hoặc chạm nút to. Có {n} câu, nhịp nhanh dần.', { n: sents.length })}${best ? ' · ' + t('Kỷ lục của bạn: {best}', { best }) : ''}</p>
        <button class="btn primary" id="rhGo" style="margin-top:1rem">${t('Bắt đầu')}</button></div></div>`;
      const x = view.querySelector('.study-top a.icon-btn'); if (x) { x.style.width = x.style.height = '44px'; x.setAttribute('aria-label', t('Thoát')); }
      wireMute(); $('#rhGo').onclick = () => { const c = ac(); if (c && c.resume) c.resume().catch(() => {}); sentence(); };
    }
    function sentence() {
      stop(); if (document.hidden) { S.retry = true; return; } // ẩn trong lúc chờ chuyển câu → bắt đầu khi quay lại (không để câu trôi qua rồi chấm 0 chạm)
      const x = sents[S.i], beat = beatOf(S.i), plan = Coach.plan(x.s, accent(), g.UI.WEAK);
      Object.assign(S, { plan, beat, taps: [], used: new Set(), T0: performance.now() + LEAD * beat, live: true });
      view.innerHTML = `<div class="study-wrap rh">${head(`🥁 ${t('Câu số {a}/{b}', { a: S.i + 1, b: sents.length })}`, S.i, sents.length, muteBtn())}
        <div class="row between nowrap" style="margin-bottom:.6rem"><b id="rhS" aria-live="off">${S.score}</b><span class="chip rh-c" id="rhC" ${S.combo < 3 ? 'hidden' : ''}>${t('COMBO ×{n}', { n: mult(S.combo) })}</span></div>
        <div class="card q-card"><span class="rh-b" id="rhB" aria-hidden="true"></span><div class="rh-s" id="rhW" role="list" aria-label="${esc(x.s)}">${chips(plan)}</div><div class="rh-cue" id="rhQ" dir="auto" aria-hidden="true">…</div></div>
        <button class="btn primary rh-tap" id="rhT" aria-label="${esc(t('Chạm vào từ nhấn'))}">${t('CHẠM')} <span class="kbd">␣</span></button></div>`;
      const q = view.querySelector('.study-top a.icon-btn'); if (q) { q.style.width = q.style.height = '44px'; q.setAttribute('aria-label', t('Thoát')); }
      wireMute(); const b = $('#rhT'); b.onpointerdown = e => { e.preventDefault(); if (e.button > 0 || e.isPrimary === false) return; tap(); }; /* chỉ chạm chính (không chuột phải / ngón thứ hai) */ b.onkeydown = e => { if (e.key === ' ' || e.key === 'Enter') e.preventDefault(); }; /* phím xử lý ở keys (tránh chạm hai lần) */
      for (let i = 0; i < LEAD + plan.length; i++) tick(S.T0 - (LEAD - i) * beat); // mọi nhịp cùng một tiếng – không lộ từ nào nhấn
      const cue = n => { const el = $('#rhQ'); if (el) el.textContent = n; }; let cleared = false, lastBeat = -99;
      for (let i = 0; i < LEAD; i++) later(() => cue(i < LEAD - 1 ? String(LEAD - 1 - i) : t('Bắt đầu')), Math.max(0, S.T0 - (LEAD - i) * beat - performance.now()));
      const frame = () => {
        if (!S.live) return; const now = performance.now() - S.T0, k = Math.floor(now / beat); // nhịp k (âm trong lúc đếm nhịp)
        if (k !== lastBeat) { lastBeat = k; const d = $('#rhB'); if (d) { d.classList.add('p'); later(() => d.classList.remove('p'), 110); } } // chấm nhịp: theo dõi bằng mắt khi tắt âm / tai nghe trễ // từ k sáng ĐÚNG lúc nhịp k (tiếng tích-tắc) và giữ tới nhịp sau
        if (now >= 0) { const w = view.querySelectorAll('#rhW .rh-w'); w.forEach((e, j) => e.classList.toggle('on', j === k && k < plan.length)); if (!cleared) { cleared = true; cue(''); } }
        if (now > (plan.length - 1) * beat + beat * 0.6) return finish(x);
        S.raf = requestAnimationFrame(frame);
      };
      S.raf = requestAnimationFrame(frame);
    }
    function tap() {
      if (!S.live) return; const lat = ctx && audible() ? Math.min(250, (ctx.outputLatency || ctx.baseLatency || 0) * 1000) : 0, ms = performance.now() - S.T0 - lat; if (ms < -GOOD) return; // bù độ trễ phát âm (Bluetooth/iOS): người nghe tiếng chạm muộn hơn đồng hồ // chạm trong lúc đếm nhịp: bỏ qua, không phạt
      const s = snap(ms, S.plan.length, S.beat, S.used), b = $('#rhT'); S.taps.push(ms);
      let ok = false; if (s) { S.used.add(s.k); ok = !!S.plan[s.k].stress; }
      if (b) { b.classList.add('hit'); setTimeout(() => b.classList.remove('hit'), 90); }
      if (muted) { if (g.Sfx && g.Sfx.haptic) g.Sfx.haptic(ok ? 'correct' : 'wrong'); } else (ok ? g.Sfx.correct : g.Sfx.wrong)(); // âm + rung của Sfx, KHÔNG qua Sfx.answer (nó ghi aria-live từng chạm, đếm chuỗi chung và tải gói lười giữa vòng)
      if (s) { const ch = view.querySelectorAll('#rhW .rh-w')[s.k]; if (ch) { const r = ok ? (Math.abs(s.d) <= PERFECT ? 'perfect' : 'good') : 'wrong'; ch.classList.remove('perfect', 'good', 'wrong'); ch.classList.add(r); const m = ch.querySelector('[data-m]'); if (m) m.textContent = MARK[r]; } } // thấy ngay từ nào vừa chạm (chữ ✓✓/✓/! chứ không chỉ màu)
      const cue = $('#rhQ'); if (cue) cue.textContent = ok ? (Math.abs(s.d) <= PERFECT ? t('Chuẩn!') : t('Tốt')) : s ? t('Từ này yếu – để im') : t('Lệch nhịp');
    }
    async function grade(x, res) {
      const gr = srsGrade(res, x.k), k = key(x.word), c = k && state.cards[k];
      if (gr === null || !c || !c.srs || !(c.srs.reps > 0 || c.srs.last) || c.srs.due > endOfToday() || (S.graded = S.graded || new Set()).has(k)) return;
      S.graded.add(k); const old = c.srs; c.srs = SRS.review(old, gr); state.cards[k] = c;
      try { await Cards.update(c); state.stats = await Stats.logReview(false); } catch (e) { c.srs = old; S.graded.delete(k); } // lưu lỗi → trả lại, lượt sau chấm lại
    }
    function finish(x) {
      stop(); const res = judge(S.plan, S.taps, S.beat, S.combo), LAB = { perfect: t('Chuẩn!'), good: t('Tốt'), miss: t('Từ nhấn bị lỡ'), wrong: t('Từ này yếu – để im') };
      view.querySelectorAll('#rhW .rh-w').forEach((e, k) => { e.classList.remove('on', 'perfect', 'good', 'wrong'); e.classList.add(res.words[k]); if (LAB[res.words[k]]) e.setAttribute('aria-label', S.plan[k].w + ' – ' + LAB[res.words[k]]); /* trình đọc màn hình: từng từ kèm kết quả */ const m = e.querySelector('[data-m]'); if (m) m.textContent = MARK[res.words[k]] || ''; });
      S.score += res.score; S.hits += res.hits; S.stressed += res.stressed; S.extra += res.extra; S.bestCombo = Math.max(S.bestCombo, res.best); S.combo = res.combo; // chuỗi mang sang câu sau
      S.plan.forEach((w, k) => { if (w.stress && res.words[k] === 'miss') S.missed.push(w.w); });
      $('#rhS').textContent = S.score; const c = $('#rhC'); c.hidden = S.combo < 3; c.textContent = t('COMBO ×{n}', { n: mult(S.combo) });
      const cue = $('#rhQ'); cue.textContent = t('Chạm đúng {a}/{b} từ nhấn', { a: res.hits, b: res.stressed }); live(cue.textContent);
      grade(x, res);
      if (!muted) speak(x.s, accent());
      later(() => { S.i++; S.i < sents.length ? sentence() : end(); }, 1900);
    }
    async function end() {
      S.over = true; App.cleanup();
      const acc = S.stressed ? Math.max(0, Math.round((S.hits / (S.stressed + S.extra)) * 100)) : 0, xp = xpOf(S.hits, acc), isBest = S.score > best;
      await App.reward({ quizzes: 1, xp });
      if (location.hash !== hash0) return; // đã rời màn trong lúc chờ thưởng: không ghi đè trang mới
      if (isBest) try { localStorage.setItem(BKEY, String(S.score)); } catch (e) { /* bỏ qua */ }
      const missed = [...new Set(S.missed.map(key))].slice(0, 8);
      view.innerHTML = `<div class="study-wrap"><div class="card empty celebrate"><div class="em">🥁</div><h2 dir="ltr">${S.score}</h2>
        <p>${isBest ? '🏅 ' + t('Kỷ lục mới!') : t('Kỷ lục của bạn: {best}', { best })} · ${t('Độ chính xác {n}%', { n: acc })} · ${t('Combo cao nhất {n}', { n: S.bestCombo })} · +${xp} XP</p>
        ${missed.length ? `<p class="small muted">${t('Từ nhấn bị lỡ')}</p><div class="row center">${missed.map(w => `<span class="chip" lang="en">${esc(w)}</span>`).join('')}</div>` : ''}
        <div class="row center" style="margin-top:1.2rem"><button class="btn primary" id="rhAgain">${t('Chơi lại')}</button><a class="btn" href="#/practice?src=${encodeURIComponent(src || 'deck')}">${t('Chế độ khác')}</a></div></div></div>`;
      $('#rhAgain').onclick = () => run(H, src);
      g.Sfx.finish({ pct: acc, xp, good: 80, el: $('.celebrate', view) });
      practiceDone({ mode: 'rhythm', src, pct: acc });
    }
    intro();
  }
  g.PlayRhythm = { core, run };
})(typeof self !== 'undefined' ? self : this);
