/* 🗣️ Giao tiếp tự tin (#/confidence) – lộ trình nói theo tình huống thật, A1 → B2 (docs/CONFIDENCE.md).
 * Dữ liệu: js/confidence/data.js (SINH từ content/confidence/*.json bằng scripts/confidence/build.mjs – đừng sửa tay).
 * Tái dùng: UI.tts / UI.recognize (Web Speech + Whisper trên máy), RP.chat của roleplay.js (Nano → /api/ai có hạn mức → kịch bản),
 * App.addWord (SRS), App.reward (XP/chuỗi). Âm thanh thử thách ngày chỉ ở bộ nhớ trình duyệt (không tải lên, không lưu).
 * Route: #/confidence · #/confidence/<bài>[#<cụm>] · #/confidence/toolkit[#<nhóm>-<cụm>] · #/confidence/daily */
(function () {
  const { $, $$, esc, toast } = UI;
  const App = window.App, { state, routes } = App, view = App.view;
  const D = () => window.CONF || { units: [], toolkit: [], daily: [] };
  const LEVELS = ['A1', 'A2', 'B1', 'B2'];
  const KEY = 'vb.conf';
  const load = () => { try { return Object.assign({ done: {}, daily: [] }, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { return { done: {}, daily: [] }; } };
  const save = s => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* riêng tư/đầy bộ nhớ – vẫn dùng được */ } };
  const day = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const accent = () => state.settings.accent || 'en-US';
  const other = a => (a === 'en-GB' ? 'en-US' : 'en-GB'); // 2 giọng khác nhau cho 2 người trong hội thoại mẫu
  const norm = s => String(s || '').toLowerCase().replace(/[’]/g, "'").replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ').trim();
  const toks = s => norm(s).split(' ').filter(Boolean);
  const unitOf = id => D().units.find(u => u.id === id);
  const tts = (text, rate, opts) => UI.tts(text, accent(), rate, opts);
  const say = (text, slow) => tts(text, slow ? 0.72 : 0.95);

  function css() {
    if ($('#cfCss')) return;
    const st = document.createElement('style'); st.id = 'cfCss';
    st.textContent = `.cf-hero{display:flex;gap:1rem;align-items:center;flex-wrap:wrap}.cf-hero .grow{flex:1 1 220px;min-width:0}
.cf-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,240px),1fr));gap:.8rem;margin-bottom:1rem}
.cf-unit{display:flex;gap:.7rem;align-items:flex-start;padding:1rem;border:1px solid var(--line);border-radius:var(--radius-sm);background:var(--surface);color:var(--text);text-decoration:none;min-height:44px;position:relative}
.cf-unit:hover,.cf-unit.next{border-color:var(--primary)}.cf-unit .em{font-size:1.7rem;line-height:1}.cf-unit b{display:block}.cf-unit .cf-done{position:absolute;top:.5rem;inset-inline-end:.6rem}
.cf-steps{display:flex;gap:.3rem;margin:.2rem 0 1rem;flex-wrap:wrap}.cf-steps span{flex:1 1 0;min-width:2.2rem;height:6px;border-radius:6px;background:var(--line)}.cf-steps span.on{background:var(--primary)}
.cf-line{display:flex;gap:.6rem;align-items:flex-start;padding:.45rem .6rem;border-radius:12px}.cf-line.on{background:var(--accent-soft)}.cf-line .who{font-weight:700;min-width:4.5rem;flex:none}
.cf-line button,.cf-ph button.ic{min-width:44px;min-height:44px;border:0;background:transparent;font-size:1.1rem;cursor:pointer;color:inherit;flex:none}
.cf-ph{border:1px solid var(--line);border-radius:var(--radius-sm);padding:.8rem 1rem;margin:.6rem 0;background:var(--surface);scroll-margin-top:5rem}
.cf-ph.hl{border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-soft)}
.cf-ph .say{font-size:1.15rem;font-weight:800;display:flex;align-items:center;gap:.3rem}.cf-ph .say>span{flex:1 1 auto;min-width:0}.cf-ph .say .ic{margin:-.5rem 0}.cf-ph s{opacity:.7}
.cf-pair{display:grid;grid-template-columns:auto 1fr;gap:.2rem .5rem;margin-top:.4rem;font-size:.95rem}
.cf-big{font-size:1.35rem;font-weight:800;line-height:1.4;margin:.6rem 0;overflow-wrap:anywhere}
.cf-w{display:inline-block;padding:0 .15rem;border-radius:4px}.cf-w.y{background:var(--good-soft,#d8f5e3)}.cf-w.n{background:var(--again-soft,#fde2e2);text-decoration:underline dotted}
.cf-bar{display:flex;gap:.5rem;flex-wrap:wrap;align-items:center;margin-top:.8rem}.cf-bar .btn{min-height:44px}
.cf-mic{min-width:64px;font-size:1.4rem}.cf-mic.on{animation:rxp 1s ease-in-out infinite alternate}
.cf-gap{display:inline-block;min-width:4ch;border-bottom:3px solid var(--primary);text-align:center}
.cf-in{flex:1 1 140px;min-width:0;min-height:44px;padding:.5rem .8rem;border:1px solid var(--line);border-radius:12px;background:var(--surface);color:var(--text);font:inherit}
.cf-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,110px),1fr));gap:.6rem;margin:.8rem 0}.cf-stats div{border:1px solid var(--line);border-radius:12px;padding:.6rem;text-align:center}.cf-stats b{display:block;font-size:1.3rem}
.cf-rate{display:flex;gap:.4rem;flex-wrap:wrap}.cf-rate button{min-width:52px;min-height:52px;font-size:1.5rem;border:1px solid var(--line);border-radius:12px;background:var(--surface);cursor:pointer}.cf-rate button[aria-pressed=true]{border-color:var(--primary);background:var(--primary-soft)}
.cf-clock{font-size:2.4rem;font-weight:800;font-variant-numeric:tabular-nums;text-align:center}
.cf-spark{width:100%;max-width:320px;height:56px;display:block}`;
    document.head.appendChild(st);
  }
  const head = (h, sub, back) => `<div class="page-head"><div>${back ? `<a class="small" href="${back}">← ${t('Giao tiếp tự tin')}</a>` : ''}<h1>${h}</h1>${sub ? `<p class="muted">${sub}</p>` : ''}</div></div>`;
  const enSub = u => (I18N.lang() === 'en' ? '' : `<span class="tiny muted" lang="en" style="display:block">${esc(u.titleEn)}</span>`); // tên tiếng Anh gốc (ẩn khi giao diện đã là tiếng Anh)
  const chip = l => `<span class="chip lv">${esc(l)}</span>`;
  const mic = (id, label) => `<button type="button" class="btn primary cf-mic" id="${id}" aria-label="${label || t('Nói')}">🎙️</button>`;
  const speakBtn = (text, label, slow) => `<button type="button" class="ic" data-say="${esc(text)}"${slow ? ' data-slow="1"' : ''} aria-label="${label || t('Nghe')}">🔊</button>`;
  const bindSay = root => $$('[data-say]', root).forEach(b => b.onclick = () => say(b.dataset.say, !!b.dataset.slow));

  // ---------- Điểm tự tin ----------
  const scoreOf = (m, self) => {
    const wpmS = !m.wpm ? null : m.wpm >= 90 && m.wpm <= 160 ? 100 : m.wpm < 90 ? Math.max(20, Math.round(m.wpm / 90 * 100)) : Math.max(50, 100 - (m.wpm - 160));
    const pauseS = Math.max(20, 100 - Math.max(0, m.pausesPerMin - 2) * 12) * Math.min(1, m.secs / 60); // nói < 1 phút → lưu loát tính theo phần thời gian đã nói
    const flu = wpmS == null ? pauseS : (wpmS + pauseS) / 2;
    const phr = Math.min(100, (m.phrases || 0) * 25), sf = ((self || 3) - 1) / 4 * 100;
    return Math.round(flu * 0.35 + phr * 0.25 + sf * 0.4);
  };
  const spark = list => {
    const pts = list.slice(-14); if (pts.length < 2) return '';
    const W = 320, H = 56, x = i => Math.round(i / (pts.length - 1) * (W - 8)) + 4, y = v => Math.round(H - 4 - v / 100 * (H - 8));
    return `<svg class="cf-spark" viewBox="0 0 ${W} ${H}" role="img" aria-label="${t('Điểm tự tin {n} lần gần nhất', { n: pts.length })}"><polyline fill="none" stroke="var(--primary)" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" points="${pts.map((p, i) => x(i) + ',' + y(p.score)).join(' ')}"/>${pts.map((p, i) => `<circle cx="${x(i)}" cy="${y(p.score)}" r="3.5" fill="var(--primary)"/>`).join('')}</svg>`;
  };
  const streakDays = list => { const ds = new Set(list.map(x => x.d)); let n = 0; const d = new Date(); if (!ds.has(day())) d.setDate(d.getDate() - 1); for (;;) { const k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); if (!ds.has(k)) break; n++; d.setDate(d.getDate() - 1); } return n; };

  // ---------- Trang tổng quan ----------
  function overview() {
    const P = load(), units = D().units, last = P.daily[P.daily.length - 1], doneToday = last && last.d === day();
    const next = units.find(u => !P.done[u.id]);
    const card = u => `<a class="cf-unit${next && next.id === u.id ? ' next' : ''}" href="#/confidence/${u.id}"><span class="em" aria-hidden="true">${u.em}</span><span><b>${esc(t(u.title))}</b>${enSub(u)}${next && next.id === u.id ? `<span class="chip ok" style="margin-top:.3rem">${t('Bài tiếp theo')}</span>` : ''}</span>${P.done[u.id] ? `<span class="cf-done" role="img" aria-label="${t('Đã xong')}">✅</span>` : ''}</a>`;
    view.innerHTML = head('🗣️ ' + t('Giao tiếp tự tin'), t('Mỗi bài là một tình huống thật, 5–8 phút: nghe, học cụm câu, nói theo, rồi tự tin nói chuyện. Sai cũng không sao – cứ nói!'))
      + `<section class="card cf-hero"><div>${UI.ring(last ? last.score : 0, last ? last.score : '–', 'var(--primary)')}</div><div class="grow"><h2 style="margin:0">${t('Điểm tự tin')}</h2>
        <p class="small muted" style="margin:.2rem 0">${last ? t('Lần gần nhất: {n}/100 · chuỗi {d} ngày', { n: last.score, d: streakDays(P.daily) }) : t('Nói 2 phút mỗi ngày để theo dõi độ lưu loát và sự tự tin của bạn.')}</p>${spark(P.daily)}
        <div class="cf-bar"><a class="btn primary" href="#/confidence/daily">${doneToday ? '✅ ' + t('Đã nói hôm nay – nói thêm?') : '⏱️ ' + t('Thử thách 2 phút hôm nay')}</a><a class="btn" href="#/confidence/toolkit">🧰 ${t('Bộ công cụ tự tin')}</a></div></div></section>`
      + LEVELS.map(lv => {
        const list = units.filter(u => u.level === lv);
        if (!list.length) return '';
        const n = list.filter(u => P.done[u.id]).length;
        return `<h2 class="set-h">${chip(lv)} ${t('{a}/{b} bài', { a: n, b: list.length })}</h2><div class="cf-grid">${list.map(card).join('')}</div>`;
      }).join('')
      + `<p class="tiny muted">🔒 ${t('Âm thanh của bạn chỉ ở trên máy này: Lexkite không tải lên và không lưu bản ghi.')}</p>`;
  }

  // ---------- Trang 1 bài ----------
  const STEPS = () => [['🎧', t('Nghe hội thoại mẫu')], ['🧩', t('Cụm câu nên nói')], ['🔁', t('Nói theo')], ['✏️', t('Nói điền chỗ trống')], ['🎭', t('Hội thoại ngắn')], ['🏁', t('Tổng kết')]];
  const phraseCard = (u, p, opts = {}) => `<div class="cf-ph" id="${esc(p.id)}"${opts.hl ? ' tabindex="-1"' : ''}><div class="say"><span lang="en">${esc(p.say)}</span>${speakBtn(p.say)}${speakBtn(p.say, t('Nghe chậm'), true).replace('🔊', '🐢')}</div>
    <div class="small muted">${esc(t(p.mean))}</div>
    ${p.not ? `<div class="cf-pair"><span aria-hidden="true">✗</span><span><s lang="en">${esc(p.not)}</s> <span class="sr-only">${t('Tránh nói')}</span></span><span aria-hidden="true">✓</span><span><b lang="en">${esc(p.say)}</b></span></div><div class="small" style="margin-top:.3rem">💡 ${esc(t(p.why))}</div>` : ''}</div>`;

  function unitPage(u, ph) {
    const P = load(), S = STEPS();
    view.innerHTML = head(u.em + ' ' + esc(t(u.title)), `${I18N.lang() === 'en' ? '' : `<span lang="en">${esc(u.titleEn)}</span> · `}${chip(u.level)}`, '#/confidence')
      + `<div class="card"><h2 class="set-h">🎯 ${t('Sau bài này bạn có thể')}</h2><p>${esc(t(u.goal))}</p>
        <ol class="small" style="padding-inline-start:1.2rem">${S.map(([e, n]) => `<li>${e} ${n}</li>`).join('')}</ol>
        <div class="cf-bar"><button class="btn primary lg" id="cfGo">▶ ${P.done[u.id] ? t('Học lại') : t('Bắt đầu')} · ≈ ${t('{m} phút', { m: 7 })}</button></div></div>
        <h2 class="set-h" style="margin-top:1rem">🧩 ${t('Cụm câu nên nói')}</h2>${u.phrases.map(p => phraseCard(u, p, { hl: p.id === ph })).join('')}`;
    bindSay(view);
    $('#cfGo').onclick = () => run(u, 0);
    if (ph) { const el = document.getElementById(ph); if (el) { el.classList.add('hl'); el.scrollIntoView({ block: 'center' }); el.focus({ preventScroll: true }); } }
  }

  // ---------- Chạy bài: 6 bước ----------
  function run(u, step) {
    const S = STEPS(), R = { shadow: {}, gaps: 0, rp: null };
    let dead = false; const rec = { cur: null };
    App.onCleanup(() => { dead = true; UI.stopSpeak(); try { if (rec.cur) rec.cur.stop(); } catch (e) { /* đã dừng */ } });
    const shell = i => {
      view.innerHTML = `<div class="page-head"><div><a class="small" href="#/confidence/${u.id}">← ${esc(t(u.title))}</a><h1 style="margin:.2rem 0">${S[i][0]} ${S[i][1]}</h1>
        <div class="cf-steps" role="progressbar" aria-valuemin="1" aria-valuemax="${S.length}" aria-valuenow="${i + 1}" aria-label="${t('Bước {i}/{n}', { i: i + 1, n: S.length })}">${S.map((x, k) => `<span class="${k <= i ? 'on' : ''}"></span>`).join('')}</div>
        <p class="small muted">${t('Bước {i}/{n}', { i: i + 1, n: S.length })}</p></div></div><div class="card" id="cfBody"></div>
        <div class="cf-bar"><button class="btn primary" id="cfNext">${t('Tiếp tục')} →</button>${i < S.length - 1 ? `<button class="btn" id="cfSkip">${t('Bỏ qua')}</button>` : ''}</div>`;
      const go = () => { UI.stopSpeak(); if (rec.cur) try { rec.cur.stop(); } catch (e) { /* */ } if (!dead) [listen, pack, shadow, gaps, roleplay, recap][i + 1](i + 1); };
      $('#cfNext').onclick = go; if ($('#cfSkip')) $('#cfSkip').onclick = go;
      window.scrollTo(0, 0);
      return $('#cfBody');
    };
    const listenMic = (target, btn, onResult) => {
      if (rec.cur) { try { rec.cur.stop(); } catch (e) { /* */ } return; }
      UI.stopSpeak();
      rec.cur = UI.recognize(target, accent(), {
        start: () => btn.classList.add('on'),
        result: r => { if (!dead) onResult(r); },
        error: code => toast(UI.recErrorText(code), 3500),
        end: () => { rec.cur = null; btn.classList.remove('on'); },
      });
      if (rec.cur) btn.classList.add('on');
    };

    // 1) Nghe hội thoại mẫu: chậm / bình thường, bấm từng câu để nghe lại
    function listen(i) {
      const b = shell(i), L = u.dialogue;
      const who = s => (s === 'a' ? L.a : t('Bạn'));
      b.innerHTML = `<p class="small muted">${t('Nghe cả đoạn 1–2 lần. Lần đầu nghe chậm, chưa cần hiểu hết.')}</p>
        <p class="small"><b>${esc(L.a)}</b> – <span lang="en">${esc(L.aRole)}</span></p>
        <div class="cf-bar" style="margin:.4rem 0 .8rem"><button class="btn" id="cfSlow">🐢 ${t('Nghe chậm')}</button><button class="btn" id="cfNorm">▶ ${t('Tốc độ thường')}</button><button class="btn" id="cfStop" aria-label="${t('Dừng')}">⏹</button></div>
        <div id="cfDlg">${L.lines.map(([s, x], k) => `<div class="cf-line" data-k="${k}"><span class="who">${esc(who(s))}</span><span class="grow" lang="en">${esc(x)}</span>${speakBtn(x, t('Nghe lại'))}</div>`).join('')}</div>`;
      bindSay(b);
      const playAll = rate => {
        let k = 0; const lines = $$('.cf-line', b);
        const next = () => {
          lines.forEach(l => l.classList.remove('on'));
          if (dead || k >= L.lines.length || !document.body.contains(b)) return;
          const [s, x] = L.lines[k]; lines[k].classList.add('on');
          UI.tts(x, s === 'a' ? accent() : other(accent()), rate, { onEnd: () => { k++; setTimeout(next, 350); } });
        };
        next();
      };
      $('#cfSlow').onclick = () => playAll(0.72); $('#cfNorm').onclick = () => playAll(0.98); $('#cfStop').onclick = () => { UI.stopSpeak(); $$('.cf-line', b).forEach(l => l.classList.remove('on')); };
    }
    // 2) Gói cụm câu
    function pack(i) {
      const b = shell(i);
      b.innerHTML = `<p class="small muted">${t('Đây là những câu người bản xứ hay nói. So sánh với cách nói kém tự nhiên hơn.')}</p>${u.phrases.map(p => phraseCard(u, p)).join('')}`;
      bindSay(b);
    }
    // 3) Nói theo: nghe → nói → phản hồi từng từ (nhận dạng trên trình duyệt/máy)
    function shadow(i) {
      const b = shell(i); let k = 0;
      const draw = () => {
        const p = u.phrases[k], best = R.shadow[p.id];
        b.innerHTML = `<p class="small muted">${t('Nghe, rồi bấm micro và nói theo. Không cần hoàn hảo – nói to và rõ là được.')} (${k + 1}/${u.phrases.length})</p>
          <div class="cf-big" lang="en" id="cfT">${esc(p.say)}</div><div class="small muted">${esc(t(p.mean))}</div>
          <div class="cf-bar">${speakBtn(p.say, t('Nghe')).replace('class="ic"', 'class="btn"')}${speakBtn(p.say, t('Nghe chậm'), true).replace('class="ic"', 'class="btn"').replace('🔊', '🐢')}${mic('cfMic', t('Nói theo'))}</div>
          <div id="cfFb" aria-live="polite" style="margin-top:.6rem">${best != null ? `<span class="chip">${t('Tốt nhất: {n}%', { n: best })}</span>` : ''}</div>
          <div class="cf-bar">${k > 0 ? `<button class="btn sm" id="cfPrev">← ${t('Câu trước')}</button>` : ''}${k < u.phrases.length - 1 ? `<button class="btn sm" id="cfNx">${t('Câu sau')} →</button>` : ''}</div>`;
        bindSay(b);
        if ($('#cfPrev')) $('#cfPrev').onclick = () => { k--; draw(); };
        if ($('#cfNx')) $('#cfNx').onclick = () => { k++; draw(); };
        $('#cfMic').onclick = () => listenMic(p.say, $('#cfMic'), ({ heard, score, audio }) => {
          const got = new Set(toks(heard)), words = p.say.split(/\s+/);
          R.shadow[p.id] = Math.max(R.shadow[p.id] || 0, score);
          const msg = score >= 85 ? '🌟 ' + t('Tuyệt! Nghe rất tự nhiên.') : score >= 60 ? '👍 ' + t('Tốt lắm! Thử thêm 1 lần để chắc hơn?') : '🌱 ' + t('Nghe lại bản chậm rồi nói từng cụm nhỏ nhé.');
          $('#cfT').innerHTML = words.map(w => { const n = norm(w); return n ? `<span class="cf-w ${got.has(n) ? 'y' : 'n'}">${esc(w)}</span>` : esc(w); }).join(' ');
          $('#cfFb').innerHTML = `<div><b>${score}%</b> · ${msg}</div>${heard ? `<div class="small muted">${t('Máy nghe được:')} <span lang="en">“${esc(heard)}”</span></div>` : ''}${audio ? `<audio controls src="${audio}" style="margin-top:.4rem;max-width:100%" aria-label="${t('Giọng của bạn')}"></audio>` : ''}`;
          if (score >= 85 && window.Sfx) Sfx.correct();
        });
      };
      draw();
    }
    // 4) Điền chỗ trống bằng giọng nói (gõ phím dự phòng)
    function gaps(i) {
      const b = shell(i), list = u.phrases.filter(p => p.gap).slice(0, 4); let k = 0;
      const blank = p => esc(p.say).replace(new RegExp('\\b' + p.gap.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i'), '<span class="cf-gap" aria-label="' + t('chỗ trống') + '">___</span>');
      const draw = () => {
        if (k >= list.length) { b.innerHTML = `<p>✅ ${t('Xong {a}/{b} câu.', { a: R.gaps, b: list.length })}</p>`; return; }
        const p = list[k];
        b.innerHTML = `<p class="small muted">${t('Nói cả câu, điền từ còn thiếu. Bí thì xem gợi ý.')} (${k + 1}/${list.length})</p>
          <div class="cf-big" lang="en">${blank(p)}</div><div class="small muted">${esc(t(p.mean))}</div>
          <div class="cf-bar">${mic('cfMic', t('Nói cả câu'))}<input class="cf-in" id="cfIn" lang="en" autocomplete="off" aria-label="${t('Hoặc gõ từ còn thiếu')}" placeholder="${t('Hoặc gõ từ còn thiếu')}"><button class="btn" id="cfChk">${t('Kiểm tra')}</button><button class="btn sm" id="cfHint">💡 ${t('Gợi ý')}</button></div>
          <div id="cfFb" aria-live="polite" style="margin-top:.6rem"></div>`;
        const ok = () => { R.gaps++; if (window.Sfx) Sfx.correct(); $('#cfFb').innerHTML = `✅ <b lang="en">${esc(p.say)}</b> ${speakBtn(p.say)}<div class="cf-bar"><button class="btn primary sm" id="cfGn">${t('Câu sau')} →</button></div>`; bindSay(b); say(p.say); $('#cfGn').onclick = () => { k++; draw(); }; };
        const miss = heard => { $('#cfFb').innerHTML = `🌱 ${t('Gần đúng rồi! Thử lại nhé.')}${heard ? ` <span class="small muted">${t('Máy nghe được:')} <span lang="en">“${esc(heard)}”</span></span>` : ''}`; };
        const g = norm(p.gap);
        $('#cfMic').onclick = () => listenMic(p.say, $('#cfMic'), ({ heard }) => (` ${norm(heard)} `.includes(` ${g} `) ? ok() : miss(heard)));
        $('#cfChk').onclick = () => (norm($('#cfIn').value) === g ? ok() : miss(''));
        $('#cfIn').onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); $('#cfChk').click(); } };
        $('#cfHint').onclick = () => { $('#cfFb').innerHTML = `💡 <span lang="en">${esc(p.gap[0])}${'_ '.repeat(Math.max(0, p.gap.length - 1))}</span> · ${speakBtn(p.say, t('Nghe cả câu'))}`; bindSay(b); };
      };
      draw();
    }
    // 5) Hội thoại ngắn: dùng chung bộ não roleplay.js (Nano → /api/ai → kịch bản), có "Giúp tôi nói"
    function roleplay(i) {
      const b = shell(i), r = u.roleplay, x3 = v => [v, v, v];
      b.innerHTML = `<p>${t('Giờ hãy nói chuyện thật. Dùng các cụm câu vừa học. Bí thì bấm "Giúp tôi nói".')}</p><p class="small" lang="en">🎯 ${esc(r.you)}</p>
        <div class="cf-bar"><button class="btn primary lg" id="cfRp">▶ ${t('Bắt đầu hội thoại')}</button></div>`;
      $('#cfRp').onclick = () => {
        if (!window.RP) { toast(t('Không tải được – thử lại sau')); return; }
        const L = { A1: 0, A2: 1, B1: 2 }[u.level] || 0;
        RP.chat({ id: 'cf-' + u.id, em: u.em, title: u.titleEn, name: t(u.title), kind: 'everyday', lv: ['A1', 'A2', 'B1'], ai: r.ai, you: r.you, vocab: [],
          turns: r.turns.map(x => ({ a: x3(x.a), h: x3(x.h), br: x.br })), end: x3(r.end) }, L, { help: true, done: res => { R.rp = res; if (!dead) recap(S.length - 1); } });
      };
    }
    // 6) Tổng kết: lưu cụm vào SRS, +XP, đánh dấu xong
    async function recap(i) {
      const b = shell(i), P = load(), first = !P.done[u.id];
      const avg = Object.values(R.shadow), sh = avg.length ? Math.round(avg.reduce((a, c) => a + c, 0) / avg.length) : null;
      P.done[u.id] = { at: Date.now(), sh, rp: R.rp && R.rp.avg }; save(P);
      const nx = D().units.find(x => !P.done[x.id]);
      b.innerHTML = `<div class="cf-hero">${window.Kit ? Kit.svg('win', 72, true) : '🎉'}<div class="grow"><h2 style="margin:0">${t('Bạn đã hoàn thành bài này!')}</h2><p class="muted" style="margin:.2rem 0">${t('Mỗi lần nói là một lần tự tin hơn.')}</p></div></div>
        <div class="cf-stats"><div><b>${u.phrases.length}</b><span class="tiny muted">${t('Cụm câu')}</span></div><div><b>${sh != null ? sh + '%' : '–'}</b><span class="tiny muted">${t('Nói theo')}</span></div><div><b>${R.rp && R.rp.avg != null ? R.rp.avg : '–'}</b><span class="tiny muted">${t('Hội thoại')}</span></div></div>
        <p id="cfSaved" class="small" aria-live="polite">⏳ ${t('Đang lưu cụm câu vào thẻ ôn…')}</p>
        <ul class="small">${u.phrases.map(p => `<li><b lang="en">${esc(p.say)}</b> – ${esc(t(p.mean))}</li>`).join('')}</ul>
        <div class="cf-bar">${nx ? `<a class="btn primary" href="#/confidence/${nx.id}">${nx.em} ${t('Bài tiếp theo')}: ${esc(t(nx.title))}</a>` : ''}<a class="btn" href="#/confidence/daily">⏱️ ${t('Thử thách 2 phút hôm nay')}</a><a class="btn" href="#/confidence">${t('Về lộ trình')}</a></div>`;
      $('#cfNext').hidden = true;
      let n = 0;
      for (const p of u.phrases) {
        if (App.inDeck(p.say)) continue;
        try { await App.addWord({ word: p.say, vi: t(p.mean), def: p.meanEn, ex: p.say, pos: 'phrase', emoji: u.em, topic: 'confidence' }, { text: p.say, title: 'Speak with confidence: ' + u.titleEn }, { silent: true }); n++; } catch (e) { /* bỏ qua 1 thẻ lỗi */ }
      }
      const el = $('#cfSaved'); if (el) el.textContent = '✓ ' + (n ? t('Đã lưu {n} cụm câu vào thẻ ôn.', { n }) : t('Các cụm câu đã có trong thẻ ôn.'));
      if (first && !R.rp) App.reward({ spoken: Object.keys(R.shadow).length, xp: 15 }); // hội thoại đã tự cộng XP (roleplay.js)
      else if (first) App.reward({ xp: 5 });
      if (window.Sfx) Sfx.win();
    }
    [listen, pack, shadow, gaps, roleplay, recap][step](step);
  }

  // ---------- Bộ công cụ ----------
  function toolkit(ph) {
    view.innerHTML = head('🧰 ' + t('Bộ công cụ tự tin'), t('5 bộ câu giúp bạn không bị "đứng hình": nhờ nhắc lại, câu giờ, bắt chuyện, phản đối lịch sự và nói khi quên từ.'), '#/confidence')
      + D().toolkit.map(g => `<section class="card" style="margin-bottom:.8rem" id="${g.id}"><h2 class="set-h" style="margin-top:0">${g.em} ${esc(t(g.title))}</h2><p class="small muted">${esc(t(g.intro))}</p>
        ${g.phrases.map(p => `<div class="cf-ph" id="${g.id}-${p.id}"><div class="say"><span lang="en">${esc(p.say)}</span>${speakBtn(p.say)}<button type="button" class="ic" data-try="${esc(p.say)}" aria-label="${t('Nói thử')}">🎙️</button></div><div class="small muted">${esc(t(p.mean))}</div><div class="small" data-fb aria-live="polite"></div></div>`).join('')}</section>`).join('');
    bindSay(view);
    let cur = null;
    $$('[data-try]', view).forEach(b => b.onclick = () => {
      if (cur) { try { cur.stop(); } catch (e) { /* */ } return; }
      const fb = b.closest('.cf-ph').querySelector('[data-fb]');
      cur = UI.recognize(b.dataset.try, accent(), { start: () => b.classList.add('cf-mic', 'on'), result: ({ score }) => { fb.textContent = (score >= 80 ? '🌟 ' : score >= 55 ? '👍 ' : '🌱 ') + score + '%'; }, error: c => toast(UI.recErrorText(c), 3500), end: () => { cur = null; b.classList.remove('cf-mic', 'on'); } });
    });
    App.onCleanup(() => { if (cur) try { cur.stop(); } catch (e) { /* */ } });
    if (ph) { const el = document.getElementById(ph); if (el) { el.classList.add('hl'); el.scrollIntoView({ block: 'center' }); } }
  }

  // ---------- Thử thách 2 phút + điểm tự tin ----------
  const FILLERS = /\b(um+|uh+|er+|erm|ah+|you know|i mean|like)\b/gi; // cùng danh sách với speaking.js (không tính kind of/sort of – có trong cụm học)
  const allPhrases = () => [...D().units.flatMap(u => u.phrases.map(p => p.say)), ...D().toolkit.flatMap(g => g.phrases.map(p => p.say))].map(s => norm(s.split('…')[0])).filter(s => s.split(' ').length >= 2);
  function daily() {
    const list = D().daily, n = Math.floor((Date.now() - new Date().getTimezoneOffset() * 6e4) / 864e5), q = list[n % list.length] || { q: '', tip: '' };
    view.innerHTML = head('⏱️ ' + t('Thử thách 2 phút hôm nay'), t('Nói liên tục tối đa 2 phút về đề bên dưới. Không ai chấm lỗi – mục tiêu là nói trôi chảy và dám nói.'), '#/confidence')
      + `<section class="card"><div class="cf-big" lang="en">${esc(q.q)}</div><p class="small">💡 <span lang="en">${esc(q.tip)}</span> ${speakBtn(q.q, t('Nghe đề'))}</p>
        <div class="cf-clock" id="cfClock" role="timer" aria-live="off">2:00</div>
        <div class="cf-bar" style="justify-content:center">${mic('cfRec', t('Bắt đầu nói'))}</div><p class="small muted" id="cfLive" lang="en" style="min-height:1.5em;text-align:center"></p>
        <p class="tiny muted">🔒 ${t('Âm thanh chỉ ở trong trình duyệt này và bị xóa khi rời trang. Chữ được chuyển bằng trình nhận dạng của trình duyệt (hoặc Whisper ngay trên máy nếu bạn đã bật).')}</p></section><div id="cfRes"></div>`;
    bindSay(view);
    let on = false, t0 = 0, tick = null, stream = null, media = null, sr = null, ac = null, chunks = [], text = '', interim = '', samples = [];
    const stopAll = () => { on = false; clearInterval(tick); try { sr && sr.stop(); } catch (e) { /* */ } sr = null; if (ac) { try { ac.close(); } catch (e) { /* */ } ac = null; } };
    App.onCleanup(() => { stopAll(); if (media && media.state !== 'inactive') try { media.stop(); } catch (e) { /* */ } if (stream) stream.getTracks().forEach(x => x.stop()); });
    const start = async () => {
      UI.stopSpeak();
      try { stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } }); }
      catch (e) { toast('⚠️ ' + t('Cần cho phép dùng micro (biểu tượng 🎙️ trên thanh địa chỉ)')); return; }
      chunks = []; text = ''; interim = ''; samples = [];
      try { media = new MediaRecorder(stream); media.ondataavailable = e => e.data.size && chunks.push(e.data); media.start(); } catch (e) { media = null; }
      try { // đo ngập ngừng trên máy: năng lượng âm thanh mỗi 100 ms
        ac = new (window.AudioContext || window.webkitAudioContext)(); const an = ac.createAnalyser(); an.fftSize = 1024; ac.createMediaStreamSource(stream).connect(an);
        const buf = new Float32Array(an.fftSize); samples.read = () => { an.getFloatTimeDomainData(buf); let s = 0; for (const v of buf) s += v * v; return Math.sqrt(s / buf.length); };
      } catch (e) { ac = null; }
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SR) {
        sr = new SR(); sr.lang = accent(); sr.continuous = true; sr.interimResults = true;
        sr.onresult = e => { interim = ''; for (let i = e.resultIndex; i < e.results.length; i++) { const r = e.results[i]; if (r.isFinal) text += r[0].transcript + ' '; else interim += r[0].transcript; } const l = $('#cfLive'); if (l) l.textContent = (text + interim).slice(-140); };
        sr.onend = () => { if (on && sr) try { sr.start(); } catch (e) { /* đang chạy */ } };
        try { sr.start(); } catch (e) { /* */ }
      }
      on = true; t0 = Date.now(); $('#cfRec').classList.add('on'); $('#cfRec').textContent = '⏹'; $('#cfRec').setAttribute('aria-label', t('Dừng'));
      tick = setInterval(() => {
        const s = (Date.now() - t0) / 1000, left = Math.max(0, 120 - s), el = $('#cfClock');
        if (samples.read) samples.push(samples.read());
        if (el) el.textContent = Math.floor(left / 60) + ':' + String(Math.floor(left % 60)).padStart(2, '0');
        if (left <= 0) stop();
      }, 100);
    };
    const stop = () => {
      if (!on) return;
      const secs = Math.min(120, (Date.now() - t0) / 1000); stopAll();
      const b = $('#cfRec'); if (b) { b.classList.remove('on'); b.textContent = '🎙️'; b.setAttribute('aria-label', t('Bắt đầu nói')); }
      const finish = () => { if (stream) stream.getTracks().forEach(x => x.stop()); result(secs, (text + ' ' + interim).trim(), chunks.length ? UI.recUrl(new Blob(chunks, { type: (media && media.mimeType) || 'audio/webm' }), 'conf') : ''); };
      if (media && media.state !== 'inactive') { media.onstop = () => setTimeout(finish, 250); media.stop(); } else setTimeout(finish, 250);
    };
    $('#cfRec').onclick = () => (on ? stop() : start());

    const pauses = () => { // khoảng lặng ≥ 1,2 s giữa 2 lần nói (bỏ đầu/cuối); ngưỡng = 25 % giữa nền ồn và tiếng nói
      const a = samples.filter(x => typeof x === 'number'); if (a.length < 20) return 0;
      const s = [...a].sort((x, y) => x - y), lo = s[Math.floor(s.length * 0.1)], hi = s[Math.floor(s.length * 0.9)], th = lo + (hi - lo) * 0.25;
      let n = 0, run = 0, spoke = false;
      for (const v of a) { if (v > th) { if (spoke && run >= 12) n++; spoke = true; run = 0; } else run++; }
      return n;
    };
    function result(secs, said, audio) {
      const words = toks(said).length, wpm = said && secs > 10 ? Math.round(words / (secs / 60)) : 0, ps = pauses(), fill = (said.match(FILLERS) || []).length;
      const ns = ` ${norm(said)} `, used = [...new Set(allPhrases().filter(p => ns.includes(` ${p} `)))];
      const m = { secs: Math.round(secs), wpm, pauses: ps, pausesPerMin: secs > 5 ? ps / (secs / 60) : 0, fillers: fill, phrases: used.length };
      const box = $('#cfRes'); if (!box) return;
      box.innerHTML = `<section class="card" style="margin-top:.8rem"><h2 class="set-h" style="margin-top:0">📊 ${t('Kết quả của bạn')}</h2>
        <div class="cf-stats"><div><b>${m.secs}s</b><span class="tiny muted">${t('Thời gian nói')}</span></div><div><b>${wpm || '–'}</b><span class="tiny muted">${t('Từ/phút')}</span></div><div><b>${ps}</b><span class="tiny muted">${t('Lần ngập ngừng')}</span></div><div><b>${fill}</b><span class="tiny muted">${t('Từ đệm')}</span></div><div><b>${used.length}</b><span class="tiny muted">${t('Cụm câu đã học')}</span></div></div>
        ${used.length ? `<p class="small">✨ ${t('Bạn đã dùng:')} <span lang="en">${used.map(esc).join(' · ')}</span></p>` : `<p class="small muted">${t('Lần sau thử dùng 1–2 cụm câu từ bài học hoặc bộ công cụ nhé.')}</p>`}
        ${audio ? `<audio controls src="${audio}" style="max-width:100%" aria-label="${t('Giọng của bạn')}"></audio>` : ''}
        ${said ? `<details class="small"><summary>${t('Xem chữ máy nghe được')}</summary><p lang="en">${esc(said)}</p></details>` : `<p class="small muted">${t('Trình duyệt này không chuyển giọng nói thành chữ – điểm dựa trên độ lưu loát và tự đánh giá.')}</p>`}
        <h3 class="set-h">${t('Bạn cảm thấy tự tin đến mức nào?')}</h3><div class="cf-rate" role="group" aria-label="${t('Tự đánh giá')}">${['😟', '😕', '🙂', '😊', '🤩'].map((e, k) => `<button type="button" data-r="${k + 1}" aria-pressed="false" aria-label="${t('{n} trên 5', { n: k + 1 })}">${e}</button>`).join('')}</div>
        <div id="cfScore" aria-live="polite"></div></section>`;
      $$('[data-r]', box).forEach(btn => btn.onclick = () => {
        const self = +btn.dataset.r; $$('[data-r]', box).forEach(x => x.setAttribute('aria-pressed', String(x === btn)));
        const sec = btn.closest('section'), P = load(), score = scoreOf(m, self), today = P.daily.findIndex(x => x.at && x.at === sec.dataset.at); // đổi tự chấm = sửa lượt này, không thêm lượt
        const best = Math.max(0, ...P.daily.filter((x, k) => k !== today).map(x => x.score));
        const rec = { d: day(), at: sec.dataset.at || String(Date.now()), score, wpm, pauses: ps, fillers: fill, phrases: used.length, self, secs: m.secs };
        sec.dataset.at = rec.at;
        if (today >= 0) P.daily[today] = rec; else P.daily.push(rec);
        P.daily = P.daily.slice(-30); save(P);
        const st = streakDays(P.daily), up = P.daily.length > 1 && score > best;
        $('#cfScore').innerHTML = `<div class="cf-hero" style="margin-top:.8rem">${UI.ring(score, score, 'var(--primary)')}<div class="grow"><b>${t('Điểm tự tin hôm nay: {n}/100', { n: score })}</b>
          <p class="small muted" style="margin:.2rem 0">${up ? '🏆 ' + t('Kỷ lục mới! Bạn đang tiến bộ thật sự.') : st >= 3 ? '🔥 ' + t('{n} ngày liên tiếp – giữ nhịp nhé!', { n: st }) : t('Nói mỗi ngày để điểm tăng dần.')}</p>${spark(P.daily)}</div></div>
          <div class="cf-bar"><a class="btn primary" href="#/confidence">${t('Về lộ trình')}</a><a class="btn" href="#/confidence/toolkit">🧰 ${t('Bộ công cụ tự tin')}</a></div>`;
        if (today < 0) { App.reward({ spoken: 1, xp: 10 }); if (up || st === 3) { if (window.Sfx) Sfx.win(); if (window.confetti) confetti(80); } }
      });
    }
  }

  routes.confidence = function (arg) {
    css();
    const [p0, frag] = String(arg || '').split('#'), [id] = p0.split('/');
    if (!id) return overview();
    if (id === 'toolkit') return toolkit(frag);
    if (id === 'daily') return daily();
    const u = unitOf(id);
    if (!u) { location.replace(location.pathname + location.search + '#/confidence'); return; }
    unitPage(u, frag);
  };
  window.Confidence = { scoreOf, units: () => D().units };
})();
