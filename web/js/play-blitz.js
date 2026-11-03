/* ⚡ Thử thách 60 giây (play-learn M1, docs/specs/play-learn.md) – mini-game ôn từ trên dữ liệu SRS THẬT, tải lười trong gói 'pgames'.
   Nguồn: thẻ đến hạn → từ yếu → sổ từ (hoặc nguồn người dùng chọn). 3 dạng câu: từ → nghĩa · nghe → từ · ảnh → từ. Combo ×1/×2/×3.
   Chấm SRS: CHỈ lần trả lời đầu của thẻ ĐẾN HẠN (đúng ≤ 6 s = Good, đúng chậm = Hard, sai = Again) qua SRS.review – không đụng thuật toán FSRS;
   thẻ chưa đến hạn không bị đẩy xa giả tạo. Sai → logMistake + hỏi lại sau 3 câu. Không tim/mạng; tab ẩn → dừng giờ.
   👥 Thách đấu bạn: link #/practice/blitz?ch=… mang đúng bộ từ + điểm cần vượt (không máy chủ, không dữ liệu cá nhân).
   Phản hồi âm/rung/aria-live/combo qua Sfx.answer/finish (game.js) – một chỗ duy nhất. Giao diện = thành phần luyện tập có sẵn
   (study-top, q-card, options) cho tới khi có màn Stitch 'play-blitz' (spec › Cần Stitch). */
(function (g) {
  const DUR = 60000, FAST = 6000, MAXW = 30;
  const shuffle = (a, rnd = Math.random) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const key = w => String(w || '').toLowerCase().trim();
  const isDue = (c, end) => !!(c && c.srs && (c.srs.reps > 0 || c.srs.last) && c.srs.due <= end);

  /* ---------- Lõi thuần (có test: scripts/test/play-blitz.mjs) ---------- */
  // Thứ tự câu: thẻ đến hạn (quá hạn lâu nhất trước) → từ yếu (quên nhiều) → còn lại xáo trộn. Bỏ trùng.
  function order(list, cards, end, rnd) {
    const seen = new Set(), uniq = list.filter(w => w && w.word && !seen.has(key(w.word)) && seen.add(key(w.word)));
    const c = w => cards[key(w.word)], lap = w => (c(w) && c(w).srs.lapses) || 0;
    const due = uniq.filter(w => isDue(c(w), end)).sort((a, b) => c(a).srs.due - c(b).srs.due);
    const weak = uniq.filter(w => !isDue(c(w), end) && lap(w) > 0).sort((a, b) => lap(b) - lap(a));
    const rest = shuffle(uniq.filter(w => !isDue(c(w), end) && !lap(w)), rnd);
    return [...due, ...weak, ...rest];
  }
  const gradeOf = (ok, ms) => (!ok ? 0 : ms <= FAST ? 2 : 1);
  const mult = combo => (combo >= 6 ? 3 : combo >= 3 ? 2 : 1);
  const xpOf = (right, n) => Math.min(40, 5 + right * 2 + (n >= 10 && right === n ? 5 : 0));
  // Dạng câu: ảnh nếu từ có ảnh đúng nghĩa (xen kẽ), nghe nếu được phát âm, còn lại từ → nghĩa
  function kindOf(w, i, o) { if (o.pic && o.pic(w) && i % 3 === 2) return 'pic'; if (o.audio && i % 3 === 1) return 'listen'; return 'mean'; }
  // 4 lựa chọn: đáp án + 3 nhiễu khác nhãn (ưu tiên cùng từ loại), nhãn không trùng nhau
  function options(w, kind, cands, label, rnd) {
    const lab = x => (kind === 'mean' ? label(x) : x.word), right = lab(w), used = new Set([key(right)]), out = [];
    const pool = shuffle(cands.filter(x => x && key(x.word) !== key(w.word) && lab(x)), rnd);
    for (const pass of [x => w.pos && x.pos === w.pos, () => true]) for (const x of pool) { if (out.length >= 3) break; const l = lab(x); if (pass(x) && !used.has(key(l))) { used.add(key(l)); out.push(l); } }
    return out.length < 3 ? null : shuffle([right, ...out], rnd);
  }
  // Link thách đấu: base64url của {w: từ (≤ 30, chỉ chữ/khoảng/gạch/nháy), s: điểm}. Giải mã từ chối mọi thứ lạ.
  const OKW = /^[a-z][a-z' -]{0,39}$/i;
  const b64e = s => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const b64d = s => decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/'))));
  const encodeCh = (words, score) => b64e(JSON.stringify({ w: words.filter(x => OKW.test(x)).slice(0, MAXW), s: Math.max(0, Math.min(9999, score | 0)) }));
  function decodeCh(s) {
    try {
      if (!s || s.length > 2000) return null; const o = JSON.parse(b64d(s));
      if (!o || !Array.isArray(o.w) || !Number.isInteger(o.s) || o.s < 0 || o.s > 9999) return null;
      const w = [...new Set(o.w.filter(x => typeof x === 'string' && OKW.test(x)).map(key))].slice(0, MAXW);
      return w.length >= 4 ? { w, s: o.s } : null;
    } catch (e) { return null; }
  }
  const core = { DUR, FAST, order, gradeOf, mult, xpOf, kindOf, options, encodeCh, decodeCh, isDue };

  /* ---------- Vòng chơi (DOM) ---------- */
  function run(H, src, query) {
    const { Cards, SRS, Stats, endOfToday } = g.Core, { INDEX, TOPICS } = g.IELTS_DATA, App = g.App, { state } = App, view = App.view;
    const { $, esc, toast, speak, pic } = g.UI, t = g.t;
    const { accent, emptySource, head, mean, norm, picOk, pool, practiceDone } = H;
    const FX = g.LessonFx, audio = !(FX && FX.audioOff && FX.audioOff()) && !!(g.speechSynthesis || g.Audio);
    const ch = decodeCh(query && query.get('ch'));
    let list;
    if (ch) list = ch.w.map(w => INDEX[w] || state.cards[w]).filter(Boolean).map(norm);
    else if (!src || src === 'deck') list = [...pool('due'), ...pool('weak'), ...pool('deck')];
    else list = pool(src);
    list = list.filter(w => mean(w));
    if (ch && list.length < 4) { toast(t('Link thách đấu không còn dùng được – chơi bộ từ của bạn')); list = [...pool('due'), ...pool('deck')].filter(w => mean(w)); }
    const items = ch ? list : order(list, state.cards, endOfToday(), Math.random);
    if (items.length < 4) return emptySource(src);
    const lib = () => { const o = []; for (const tp of TOPICS) { for (const w of tp.words) { if (o.length >= 400) return o; o.push(norm(w)); } } return o; }; // dừng ở 400, không trải cả kho 20k từ
    const cands = items.length >= 12 ? items : [...items, ...lib()];
    const title = ch ? `👥 ${t('Thách đấu: vượt {n} điểm', { n: ch.s })}` : `⚡ ${t('Thử thách 60 giây')}`;
    const S = { i: 0, q: items.slice(), score: 0, combo: 0, best: 0, right: 0, n: 0, graded: new Set(), missed: [], used: 0, at: performance.now(), paused: false, over: false, busy: false };
    view.innerHTML = `<div class="study-wrap bz">${head(title, 0, 1, `<span id="bzT" dir="ltr">60s</span>`)}
      <div class="row between nowrap" style="margin-bottom:.6rem"><b id="bzS" aria-live="off">0</b><span class="chip" id="bzC" hidden></span></div>
      <div id="bzQ"></div></div>`;
    const x = view.querySelector('.study-top .icon-btn'); if (x) { x.style.width = x.style.height = '44px'; x.setAttribute('aria-label', t('Thoát')); }
    const left = () => Math.max(0, DUR - S.used - (S.paused ? 0 : performance.now() - S.at));
    const tick = () => {
      const ms = left(), bar = view.querySelector('.study-top .progress i'), tm = $('#bzT');
      if (bar) bar.style.width = (ms / DUR) * 100 + '%'; if (tm) tm.textContent = Math.ceil(ms / 1000) + 's';
      if (!ms && !S.over) end();
    };
    const vis = () => { if (document.hidden && !S.paused) { S.used += performance.now() - S.at; S.paused = true; } else if (!document.hidden && S.paused) { S.at = performance.now(); S.paused = false; } };
    const timer = setInterval(tick, 200);
    document.addEventListener('visibilitychange', vis);
    const keys = e => { if (S.over || S.busy || e.target.closest && e.target.closest('input,textarea')) return; const n = +e.key; if (n >= 1 && n <= 4) { const b = view.querySelectorAll('#bzQ .option')[n - 1]; if (b) b.click(); } };
    document.addEventListener('keydown', keys);
    App.cleanup = () => { clearInterval(timer); document.removeEventListener('visibilitychange', vis); document.removeEventListener('keydown', keys); };

    async function grade(w, ok, ms) {
      const k = key(w.word), c = state.cards[k];
      if (S.graded.has(k)) return; S.graded.add(k);
      if (!ok && App.logMistake) App.logMistake({ kind: 'vocab', q: I18N.tk('Nghĩa của “{word}”?', { word: w.word }), a: w.word });
      if (!isDue(c, endOfToday())) return; // chỉ thẻ đến hạn được chấm (không đẩy xa giả tạo thẻ chưa đến hạn)
      c.srs = SRS.review(c.srs, gradeOf(ok, ms)); state.cards[k] = c;
      try { await Cards.update(c); state.stats = await Stats.logReview(false); } catch (e) { /* lưu lỗi: lượt sau chấm lại */ }
    }
    function next() {
      if (S.over) return;
      if (!S.q.length) S.q = shuffle(items); // hết lượt từ → vòng lại (đã chấm rồi thì không chấm lại)
      const w = S.q.shift(), kind = kindOf(w, S.i++, { pic: picOk, audio });
      const op = options(w, kind, cands, mean, Math.random); if (!op) return next();
      const right = kind === 'mean' ? mean(w) : w.word, t0 = performance.now();
      const say = () => speak(w.word, accent(), g.UI.audioFor && g.UI.audioFor(w, accent()));
      const prompt = kind === 'mean' ? `<div class="entry-word">${esc(w.word)}</div><div class="row center"><span class="ipa">${esc(w.ipa)}</span><button class="icon-btn sm" data-say aria-label="${esc(t('Nghe'))}">🔊</button></div><div class="muted small">${t('Chọn nghĩa đúng')}</div>`
        : kind === 'listen' ? `<button class="icon-btn" data-say style="width:64px;height:64px;font-size:1.6rem" aria-label="${esc(t('Nghe lại'))}">🔊</button><div class="muted small" style="margin-top:.6rem">${t('Nghe và chọn từ đúng')}</div>`
        : `${pic(w).replace('class="pic"', 'class="pic" style="width:110px;margin:0 auto"')}<div class="muted small" style="margin-top:.6rem">${t('Đây là gì?')}</div>`;
      $('#bzQ').innerHTML = `<div class="card q-card">${prompt}</div><div class="options ${kind === 'mean' ? '' : 'two'}">${op.map((o, i) => `<button class="option" data-i="${i}" ${kind === 'mean' ? '' : 'lang="en"'}><span class="kbd">${i + 1}</span>${esc(o)}</button>`).join('')}</div>`;
      const sb = $('#bzQ [data-say]'); if (sb) sb.onclick = say;
      if (kind === 'listen') say();
      $('#bzQ').querySelectorAll('.option').forEach(b => b.onclick = () => {
        if (S.busy || S.over) return; S.busy = true;
        const ok = op[+b.dataset.i] === right, ms = performance.now() - t0;
        S.n++; grade(w, ok, ms);
        if (ok) { S.right++; S.combo++; S.best = Math.max(S.best, S.combo); S.score += 10 * mult(S.combo); b.classList.add('right'); }
        else { S.combo = 0; b.classList.add('wrong'); const r = [...$('#bzQ').querySelectorAll('.option')].find(e => op[+e.dataset.i] === right); if (r) r.classList.add('right'); S.missed.push(w); S.q.splice(Math.min(3, S.q.length), 0, w); if (kind !== 'listen') say(); }
        Sfx.answer(ok, { el: b, answer: right, badge: false });
        $('#bzS').textContent = S.score; const cb = $('#bzC'); cb.hidden = S.combo < 3; cb.textContent = t('COMBO ×{n}', { n: mult(S.combo) });
        setTimeout(() => { S.busy = false; next(); }, ok ? 260 : 1100);
      });
    }
    async function end() {
      S.over = true; App.cleanup();
      const prev = (state.game.best && state.game.best.blitz) || 0, xp = xpOf(S.right, S.n), pct = S.n ? Math.round((S.right / S.n) * 100) : 0;
      await App.reward({ quizzes: 1, blitz: 1, blitzScore: S.score, xp });
      const missed = [...new Map(S.missed.map(w => [key(w.word), w])).values()].slice(0, 8);
      const beat = ch ? (S.score > ch.s ? t('Bạn đã thắng thách đấu! 🎉') : S.score === ch.s ? t('Hòa! Thử lại để vượt lên') : t('Còn thiếu {n} điểm – thử lại nhé', { n: ch.s - S.score })) : '';
      view.innerHTML = `<div class="study-wrap"><div class="card empty celebrate">
        <div class="em">⚡</div><h2 dir="ltr">${S.score}</h2>
        <p>${beat ? esc(beat) + ' · ' : ''}${S.score > prev ? '🏅 ' + t('Kỷ lục mới!') : t('Kỷ lục của bạn: {best}', { best: prev })} · ${t('{a}/{b} đúng', { a: S.right, b: S.n })} · ${t('Combo cao nhất {n}', { n: S.best })} · +${xp} XP</p>
        ${missed.length ? `<p class="small muted">${t('Từ cần ôn lại')}</p><div class="row center">${missed.map(w => `<span class="chip" lang="en">${esc(w.word)} = ${esc(mean(w))}</span>`).join('')}</div>` : ''}
        <div class="row center" style="margin-top:1.2rem"><button class="btn primary" id="bzAgain">${t('Chơi lại')}</button><button class="btn" id="bzCh">👥 ${t('Thách đấu bạn bè')}</button><a class="btn" href="#/practice?src=${encodeURIComponent(src || 'deck')}">${t('Chế độ khác')}</a></div>
      </div></div>`;
      $('#bzAgain').onclick = () => run(H, src, query);
      $('#bzCh').onclick = async () => {
        const url = location.origin + location.pathname + '#/practice/blitz?ch=' + encodeCh(items.map(w => w.word), S.score), text = t('Mình được {n} điểm trong Thử thách 60 giây trên Lexkite – bạn vượt được không?', { n: S.score });
        if (navigator.share) { try { await navigator.share({ title: 'Lexkite', text, url }); return; } catch (e) { /* hủy → chép link */ } }
        try { await navigator.clipboard.writeText(text + ' ' + url); toast(t('Đã chép link thách đấu')); } catch (e) { toast(url, 6000); }
      };
      Sfx.finish({ pct, xp, good: 80, el: $('.celebrate', view) });
      practiceDone({ mode: 'blitz', src, pct });
    }
    tick(); next();
  }
  g.PlayBlitz = { core, run };
})(typeof self !== 'undefined' ? self : this);
