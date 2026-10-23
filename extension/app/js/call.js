/* 📞 Call Mia (#/call): cuộc gọi video luyện nói có kịch bản (kiểu "video call" của app học ngôn ngữ).
 * Mia nói câu soạn sẵn bằng UI.tts (giọng Mỹ) → phản hồi tức thì (không gọi máy chủ, mục tiêu ≤ 0,3 s – docs/MEDIA-QA-RUBRIC.md mục D).
 * Người học trả lời bằng giọng nói (UI.recognize) hoặc chạm câu gợi ý; Mia đáp theo nhánh (js/call/calls.js).
 * Lỗi phổ biến được sửa tế nhị bằng thẻ gợi ý + giải thích theo ngôn ngữ người học (t()). Lời người học không gửi đi đâu.
 * Cuối cuộc gọi: tổng kết, cách nói tự nhiên hơn, thêm cụm từ vào thẻ ôn, cộng XP. Ảnh Mia tạm thời: img/call/mia.webp. */
(function () {
  const { $, $$, esc, toast } = UI;
  const App = window.App;
  const { routes } = App;
  const view = App.view;
  const ACCENT = 'en-US', MIA = 'img/call/mia.webp';
  const NAME = { coffee: () => t('Mua cà phê cho cả nhóm'), weekend: () => t('Kể chuyện cuối tuần'), 'first-day': () => t('Ngày đầu đi làm ở Mỹ'), standup: () => t('Họp đầu ngày (stand-up)'), doctor: () => t('Đặt lịch khám bác sĩ'), apartment: () => t('Gọi hỏi thuê căn hộ') };
  const nameOf = c => (NAME[c.id] ? NAME[c.id]() : c.title);
  const pref = (k, v) => { try { if (v === undefined) return localStorage.getItem('vb.call.' + k); localStorage.setItem('vb.call.' + k, v); } catch (e) { return null; } };

  // ---------- Sửa lỗi tế nhị: phát hiện lỗi phổ biến của người học → câu đúng + lý do (theo ngôn ngữ giao diện) ----------
  const PAST = { go: 'went', have: 'had', eat: 'ate', buy: 'bought', see: 'saw', do: 'did', make: 'made', take: 'took', get: 'got', meet: 'met', come: 'came', drink: 'drank', swim: 'swam', run: 'ran', sleep: 'slept', leave: 'left', spend: 'spent', watch: 'watched', visit: 'visited', play: 'played', cook: 'cooked', clean: 'cleaned', work: 'worked', walk: 'walked', stay: 'stayed', finish: 'finished', fix: 'fixed', call: 'called', study: 'studied', try: 'tried', relax: 'relaxed' };
  const S3 = { go: 'goes', do: 'does', have: 'has', work: 'works', like: 'likes', want: 'wants', need: 'needs', live: 'lives', watch: 'watches', study: 'studies', play: 'plays', make: 'makes', know: 'knows', think: 'thinks' };
  const MODAL = /\b(to|will|would|can|could|should|must|might|may|did|didn'?t|does|doesn'?t|do|don'?t|let'?s|let|make|help)\s+$/i;
  const keepCase = (from, to) => (/^[A-Z]/.test(from) ? to[0].toUpperCase() + to.slice(1) : to);
  const RULES = [
    { why: () => t('“Agree” đã là động từ – không cần “am/is/are” đứng trước.'), fix: s => s.replace(/\b(I|we|they|you)\s+(am|are|'m|'re)\s+agree\b/i, (m, p) => p + ' agree') },
    { why: () => t('Với he/she/it, phủ định dùng “doesn’t”, không dùng “don’t”.'), fix: s => s.replace(/\b(he|she|it)\s+don'?t\b/i, (m, p) => p + " doesn't") },
    { why: () => t('Sau can/could/should/will không dùng “to”.'), fix: s => s.replace(/\b(can|could|should|will|must)\s+to\s+(\w+)/i, '$1 $2') },
    { why: () => t('Từ so sánh hơn như “better” đã mang nghĩa “hơn” – bỏ “more”.'), fix: s => s.replace(/\bmore\s+(better|easier|faster|bigger|cheaper|closer|worse)\b/i, '$1') },
    { why: () => t('Danh từ không đếm được (information, advice…) không thêm -s.'), fix: s => s.replace(/\b(information|advice|furniture|equipment|homework|luggage)s\b/i, '$1') },
    { why: () => t('“Very” không đứng trước động từ – dùng “really” hoặc “very much” ở cuối câu.'), fix: s => s.replace(/\bI\s+very\s+(like|love|want|enjoy)\b/i, 'I really $1') },
    { why: () => t('Sau want/need/would like, động từ tiếp theo cần “to”.'), fix: s => s.replace(/\b(want|need|would like|'d like)\s+(go|eat|buy|see|try|have|book|make|visit|ask|join|pay|come)\b/i, '$1 to $2') },
    { why: () => t('Trước nghề nghiệp số ít cần mạo từ “a/an”.'), fix: s => s.replace(/\b(I'm|I am)\s+(engineer|teacher|student|developer|designer|manager|doctor|nurse|accountant|intern)\b/i, (m, p, w) => p + (/^[aeiou]/i.test(w) ? ' an ' : ' a ') + w) },
    { why: () => t('Với he/she/it ở thì hiện tại đơn, động từ thêm -s/-es.'), fix: s => s.replace(/\b(he|she)\s+(go|do|have|work|like|want|need|live|watch|study|play|make|know|think)\b/gi, (m, p, v, off, str) => (MODAL.test(str.slice(0, off)) ? m : p + ' ' + keepCase(v, S3[v.toLowerCase()]))) },
    { past: true, why: () => t('Chuyện đã xảy ra (hôm qua, cuối tuần trước…) dùng động từ ở thì quá khứ.'), fix: s => s.replace(new RegExp('\\b(I|we|they|he|she)\\s+(' + Object.keys(PAST).join('|') + ')\\b', 'gi'), (m, p, v, off, str) => (MODAL.test(str.slice(0, off)) ? m : p + ' ' + keepCase(v, PAST[v.toLowerCase()]))) },
  ];
  const PAST_Q = /\b(did you|how was|what did|yesterday|last (night|week|weekend))\b/i;
  function correct(text, miaLine) {
    for (const r of RULES) {
      if (r.past && !(PAST_Q.test(miaLine) || /\b(yesterday|last (night|week|weekend|month|year)|ago)\b/i.test(text))) continue;
      const good = r.fix(text);
      if (good !== text) return { bad: text, good, why: r.why() };
    }
    return null;
  }
  // An toàn: lời lẽ thô tục/nhạy cảm → Mia nhẹ nhàng đưa cuộc gọi về chủ đề, không lặp lại lời đó
  const UNSAFE = /\b(fuck|shit|bitch|asshole|dick|sex|kill|suicide|drugs?|nigg|whore|slut)\w*/i;

  function css() {
    if ($('#callCss')) return;
    const st = document.createElement('style'); st.id = 'callCss';
    st.textContent = `.call-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:.8rem}
.call-card{display:flex;gap:.8rem;align-items:center;padding:.9rem;border:1px solid var(--line);border-radius:var(--radius-sm);background:var(--surface);color:var(--text);text-decoration:none;min-height:44px}
.call-card:hover{border-color:var(--primary)}.call-card img{width:56px;height:56px;border-radius:50%;object-fit:cover;background:#f4efe6;flex:none}.call-card b{display:block}
.call-ov{position:fixed;inset:0;z-index:9000;display:flex;flex-direction:column;align-items:center;background:radial-gradient(120% 80% at 50% 0%,#1f4f4d 0%,#0f2223 55%,#0a1414 100%);color:#fff;padding:max(14px,env(safe-area-inset-top)) 16px max(16px,env(safe-area-inset-bottom));overflow-y:auto}
.call-top{width:100%;max-width:560px;display:flex;justify-content:space-between;align-items:center;font-size:.9rem;opacity:.9}
.call-av{position:relative;width:min(52vw,230px);aspect-ratio:1;margin:2.2vh auto 1.2vh;border-radius:50%;background:#f4efe6;box-shadow:0 0 0 6px rgba(255,255,255,.08);flex:none}
.call-av img{width:100%;height:100%;border-radius:50%;object-fit:cover}
.call-av.talk{animation:callTalk .5s ease-in-out infinite alternate;box-shadow:0 0 0 6px rgba(255,165,130,.55),0 0 40px rgba(255,132,102,.45)}
.call-av.listen{box-shadow:0 0 0 6px rgba(94,234,212,.6),0 0 40px rgba(94,234,212,.35)}
@keyframes callTalk{from{transform:translateY(0) scale(1)}to{transform:translateY(-3px) scale(1.012)}}
@media (prefers-reduced-motion:reduce){.call-av.talk{animation:none}}
.call-name{font-weight:800;font-size:1.25rem}.call-sub{font-size:.85rem;opacity:.8}
.call-cap{width:100%;max-width:560px;min-height:5.4em;margin:1.2vh 0;padding:.7rem .9rem;border-radius:16px;background:rgba(0,0,0,.35);text-align:center;line-height:1.45}
.call-cap .l1{font-size:1.12rem;font-weight:600}.call-cap .l2{font-size:.92rem;opacity:.82;margin-top:.25rem}
.call-tip{width:100%;max-width:560px;padding:.6rem .8rem;border-radius:14px;background:rgba(245,165,36,.18);border:1px solid rgba(245,165,36,.45);font-size:.92rem;margin-bottom:.6rem}
.call-tip s{opacity:.75}.call-opts{width:100%;max-width:560px;display:flex;flex-direction:column;gap:.45rem}
.call-opts button{min-height:44px;padding:.55rem .9rem;border-radius:14px;border:1px solid rgba(255,255,255,.28);background:rgba(255,255,255,.08);color:#fff;font:inherit;text-align:start;cursor:pointer}
.call-opts button:hover,.call-opts button:focus-visible{background:rgba(255,255,255,.18)}
.call-ctl{display:flex;gap:1.4rem;justify-content:center;align-items:center;margin-top:auto;padding-top:1rem}
.call-ctl button{width:64px;height:64px;border-radius:50%;border:0;font-size:1.6rem;cursor:pointer;color:#fff}
.call-mic{background:#0D6964}.call-mic.on{background:#14b8a6;animation:callTalk .6s ease-in-out infinite alternate}.call-end{background:#d1343a}.call-tr{background:rgba(255,255,255,.16);font-size:1rem!important;width:52px!important;height:52px!important}
.call-ring{margin:auto;text-align:center}.call-ring .call-av{animation:callTalk .8s ease-in-out infinite alternate}
.call-accept{background:#15803d!important}
body.call-on{overflow:hidden}`;
    document.head.appendChild(st);
  }

  routes.call = function (arg) {
    css();
    const list = window.CALLS || [];
    const c = list.find(x => x.id === arg);
    if (c) return ring(c);
    view.innerHTML = `<div class="page-head"><div><h1>📞 ${t('Gọi cho Mia')}</h1><p class="muted">${t('Cuộc gọi video luyện nói: Mia hỏi, bạn trả lời bằng giọng nói hoặc chọn gợi ý. Lỗi được sửa nhẹ nhàng, cuối cuộc gọi có tổng kết.')}</p></div></div>
      <div class="call-grid">${list.map(x => `<a class="call-card" href="#/call/${x.id}"><img src="${MIA}" alt="" width="56" height="56" loading="lazy"><span><b>${x.em} ${esc(nameOf(x))}</b><span class="tiny muted"><span class="chip lv">${x.lv}</span> <span lang="en">${esc(x.title)}</span></span></span></a>`).join('')}</div>
      <p class="tiny muted" style="margin-top:1rem">${t('Lời bạn nói được nhận dạng ngay trên trình duyệt, Lexkite không lưu lại.')}</p>`;
  };

  // Màn "đang gọi đến" – chạm Nghe máy để bắt đầu (trình duyệt cần 1 lần chạm để phát âm thanh)
  function ring(c) {
    view.innerHTML = `<div class="page-head"><div><h1>📞 ${esc(nameOf(c))}</h1><p class="muted"><span class="chip lv">${c.lv}</span> <span lang="en">${esc(c.title)}</span></p></div></div>
      <div class="card center"><img src="${MIA}" alt="Mia" width="120" height="120" style="border-radius:50%;background:#f4efe6"><p><b>Mia</b> – <span lang="en">${esc(c.role)}</span></p>
      <div class="row center" style="gap:.6rem;flex-wrap:wrap"><button class="btn primary lg" id="callGo">📞 ${t('Gọi ngay')}</button><a class="btn" href="#/call">${t('Cuộc gọi khác')}</a></div></div>`;
    $('#callGo').onclick = () => start(c);
  }

  function start(c) {
    const ov = document.createElement('div'); ov.className = 'call-ov'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-label', t('Cuộc gọi với Mia'));
    document.body.appendChild(ov); document.body.classList.add('call-on');
    let i = 0, rec = null, dead = false, t0 = Date.now(), tick = 0, autoMic = false, showTr = pref('tr') !== '0' && I18N.lang() !== 'en', busy = false;
    const answers = [], tips = [], lat = [], tr = {};
    const close = () => { dead = true; clearInterval(tick); UI.stopSpeak(); if (rec && rec.stop) try { rec.stop(); } catch (e) { /* bỏ qua */ } ov.remove(); document.body.classList.remove('call-on'); document.removeEventListener('keydown', onKey); };
    App.cleanups.push(close);
    const onKey = e => { if (e.key === 'Escape') hang(); };
    document.addEventListener('keydown', onKey);
    ov.innerHTML = `<div class="call-top"><span>🔒 ${t('Cuộc gọi luyện tập')}</span><span id="cT" aria-live="off">00:00</span></div>
      <div class="call-av" id="cAv"><img src="${MIA}" alt="Mia" width="230" height="230"></div>
      <div class="call-name">Mia</div><div class="call-sub" lang="en">${esc(c.role)}</div>
      <div class="call-cap" id="cCap" aria-live="polite"><div class="l1" lang="en" id="cL1"></div><div class="l2" id="cL2"></div></div>
      <div id="cTip" style="width:100%;display:flex;justify-content:center"></div>
      <div class="call-opts" id="cOpts" role="group" aria-label="${t('Gợi ý trả lời')}"></div>
      <div class="call-ctl">${I18N.lang() !== 'en' ? `<button class="call-tr" id="cTr" aria-pressed="${showTr}" aria-label="${t('Bật/tắt phụ đề dịch')}">Aa</button>` : ''}<button class="call-mic" id="cMic" aria-label="${t('Nói')}">🎙️</button><button class="call-end" id="cEnd" aria-label="${t('Kết thúc cuộc gọi')}">📵</button></div>`;
    const alive = () => !dead && document.body.contains(ov);
    tick = setInterval(() => { const s = Math.floor((Date.now() - t0) / 1000); const el = $('#cT', ov); if (el) el.textContent = String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); }, 1000);

    // Dịch sẵn mọi câu của Mia trong 1 lần gọi (phụ đề dòng 2) – không chặn cuộc gọi; lỗi mạng thì chỉ hiện tiếng Anh
    const pieces = [...new Set(c.turns.flatMap(x => [x.m, x.re, ...(x.br || []).map(b => b[1])]).concat(c.end).filter(Boolean))];
    if (I18N.lang() !== 'en' && window.Dict && Dict.translateTo) Dict.translateTo(pieces.join('\n'), I18N.lang()).then(out => { const ls = String(out || '').split('\n'); if (ls.length === pieces.length) pieces.forEach((p, k) => { tr[p] = ls[k]; }); paintTr(); }).catch(() => {});
    let cur = [];
    const canTr = I18N.lang() !== 'en' && window.Dict && Dict.translateTo;
    const fetchTr = ps => ps.filter(p => !tr[p]).forEach(p => Dict.translateTo(p, I18N.lang()).then(o => { if (o && alive()) { tr[p] = o; paintTr(); } }).catch(() => {}));
    const paintTr = () => { const l2 = $('#cL2', ov); if (l2) l2.textContent = showTr && cur.every(p => tr[p]) ? cur.map(p => tr[p]).join(' ') : ''; };
    const say = parts => {
      cur = parts.filter(Boolean); const text = cur.join(' ');
      $('#cL1', ov).textContent = text; paintTr(); if (canTr && showTr) setTimeout(() => alive() && fetchTr(cur), 1200); // bản dịch gộp chưa về → dịch riêng câu đang nói
      const av = $('#cAv', ov); av.classList.remove('listen'); av.classList.add('talk');
      UI.tts(text, ACCENT, undefined, { onEnd: () => { if (!alive()) return; av.classList.remove('talk'); if (autoMic && i < c.turns.length) listen(); } });
      setTimeout(() => alive() && av.classList.remove('talk'), Math.min(9000, 900 + text.length * 70)); // trình duyệt không báo kết thúc → vẫn dừng hiệu ứng
    };
    const showOpts = () => {
      const box = $('#cOpts', ov); const turn = c.turns[i];
      box.innerHTML = turn ? turn.o.map((o, k) => `<button type="button" data-o="${k}" lang="en">💬 ${esc(o)}</button>`).join('') : '';
      $$('[data-o]', box).forEach(b => b.onclick = () => answer(turn.o[+b.dataset.o], true));
    };

    function answer(text, picked) {
      text = String(text || '').replace(/\s+/g, ' ').trim();
      if (!text || busy || !alive() || i >= c.turns.length) return;
      busy = true;
      const a0 = performance.now(), turn = c.turns[i];
      if (rec && rec.stop) try { rec.stop(); } catch (e) { /* bỏ qua */ }
      const tipBox = $('#cTip', ov); tipBox.innerHTML = '';
      if (UNSAFE.test(text)) { busy = false; say(['Let\'s keep our chat friendly and on topic!', turn.m]); return; }
      const fix = picked ? null : correct(text, turn.m);
      answers.push({ text, picked, fix });
      if (fix) {
        tips.push(fix);
        tipBox.innerHTML = `<div class="call-tip">💡 ${t('Mia hiểu ý bạn! Nói tự nhiên hơn:')}<div lang="en"><s>${esc(fix.bad)}</s> → <b>${esc(fix.good)}</b></div><div class="small">${esc(fix.why)}</div></div>`;
      }
      let react = turn.re;
      for (const [re, line] of turn.br || []) { try { if (new RegExp('\\b(' + re + ')', 'i').test(text)) { react = line; break; } } catch (e) { /* bỏ qua */ } }
      i++;
      const next = c.turns[i];
      say([react, next ? next.m : c.end]);
      lat.push(performance.now() - a0);
      showOpts(); busy = false;
      if (!next) { $('#cMic', ov).disabled = true; setTimeout(() => alive() && finish(), 4500); }
    }

    function listen() {
      if (!alive() || rec) return;
      const mic = $('#cMic', ov), av = $('#cAv', ov), turn = c.turns[i]; if (!turn) return;
      UI.stopSpeak(); av.classList.remove('talk');
      rec = UI.recognize(turn.o[0], ACCENT, {
        start: () => { mic.classList.add('on'); av.classList.add('listen'); },
        result: ({ heard }) => { if (heard) answer(heard, false); },
        error: code => { autoMic = false; if (code !== 'no-speech') toast(UI.recErrorText(code), 3500); },
        end: () => { rec = null; mic.classList.remove('on'); av.classList.remove('listen'); },
      });
      if (rec) { mic.classList.add('on'); av.classList.add('listen'); }
    }
    $('#cMic', ov).onclick = () => { if (rec) { try { rec.stop(); } catch (e) { /* bỏ qua */ } return; } autoMic = true; listen(); };
    const trBtn = $('#cTr', ov); if (trBtn) trBtn.onclick = () => { showTr = !showTr; pref('tr', showTr ? '1' : '0'); trBtn.setAttribute('aria-pressed', String(showTr)); paintTr(); };
    const hang = () => { if (answers.length) finish(); else { close(); location.hash = '#/call'; } };
    $('#cEnd', ov).onclick = hang;

    function finish() {
      if (!alive()) return;
      const secs = Math.round((Date.now() - t0) / 1000), avgLat = lat.length ? Math.round(lat.reduce((a, b) => a + b, 0) / lat.length) : 0;
      close();
      summary(c, answers, tips, secs, avgLat);
    }
    showOpts();
    say([c.turns[0].m]);
    $('#cMic', ov).focus({ preventScroll: true });
  }

  function summary(c, answers, tips, secs, avgLat) {
    const spoken = answers.filter(a => !a.picked).length, xp = 5 + answers.length * 2 + spoken * 2;
    App.reward({ spoken, xp });
    view.innerHTML = `<div class="page-head"><div><h1>📞 ${t('Tổng kết cuộc gọi')}</h1><p class="muted">${esc(nameOf(c))} · ${t('{m} phút {s} giây', { m: Math.floor(secs / 60), s: secs % 60 })} · +${xp} XP</p></div></div>
      <div class="card" data-latency="${avgLat}"><p>${t('Bạn đã trả lời {n}/{k} lượt, trong đó {s} lượt bằng giọng nói.', { n: answers.length, k: c.turns.length, s: spoken })}</p>
      <h2 class="set-h">💡 ${t('Cách nói tự nhiên hơn')}</h2>
      ${tips.length ? tips.map(x => `<div style="padding:.5rem 0;border-top:1px solid var(--line)"><div lang="en"><s>${esc(x.bad)}</s> → <b>${esc(x.good)}</b></div><div class="small muted">${esc(x.why)}</div></div>`).join('') : `<p class="muted">${t('Không có lỗi nào cần sửa – tuyệt vời!')}</p>`}
      <h2 class="set-h">🧩 ${t('Cụm từ nên nhớ')}</h2>
      <ul class="small" style="padding-left:1.1rem">${c.phrases.map(([p, d]) => `<li lang="en"><b>${esc(p)}</b> – <span class="muted">${esc(d)}</span></li>`).join('')}</ul>
      <div class="row" style="gap:.6rem;flex-wrap:wrap;margin-top:1rem"><button class="btn primary" id="cSave">+ ${t('Thêm vào thẻ ôn')}</button><a class="btn" href="#/call/${c.id}">↻ ${t('Gọi lại')}</a><a class="btn" href="#/call">${t('Cuộc gọi khác')}</a></div></div>`;
    $('#cSave').onclick = async () => {
      const b = $('#cSave'); b.disabled = true;
      for (const [p, d] of c.phrases) await App.addWord({ word: p, def: d, pos: 'phrase', emoji: '📞', topic: 'call' }, { text: d, title: 'Call Mia: ' + c.title }, { silent: true });
      for (const x of tips) await App.addWord({ word: x.good, pos: 'phrase', ex: x.good, emoji: '📞', topic: 'call' }, { text: x.good, title: 'Call Mia: ' + c.title }, { silent: true });
      b.textContent = '✓ ' + t('Đã thêm {n} thẻ', { n: c.phrases.length + tips.length }); toast(t('Đã thêm {n} thẻ', { n: c.phrases.length + tips.length }));
    };
  }
  window.CallMia = { correct }; // để kiểm thử
})();
