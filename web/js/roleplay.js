/* 💼 Roleplay for Work (#/roleplay): hội thoại công sở bằng giọng nói – AI đóng vai sếp, khách hàng, nhà tuyển dụng…
 * AI nói bằng UI.tts; người học trả lời bằng micro (UI.recognize: Web Speech, Whisper trên máy dự phòng) hoặc gõ phím.
 * AI đối thoại theo thứ tự chi phí $0: (a) Gemini Nano trong Chrome (Prompt API, chạy trên máy) → (b) /api/ai của Lexkite
 * (kind 'rp', hạn mức riêng) → (c) kịch bản nhánh cố định (js/roleplay/data-*.js). Khách chưa đăng nhập: tối đa GUEST_AI hội thoại AI/ngày.
 * Kết thúc: chấm 4 tiêu chí (tự nhiên, lịch sự, rõ ý, ngữ pháp) + 3 câu viết lại "sắc hơn", lưu câu vào flashcard, cộng XP. */
(function () {
  const { $, $$, esc, toast } = UI;
  const App = window.App;
  const { state, routes } = App;
  const view = App.view;
  const LV = ['B1', 'B2', 'C1'], GUEST_AI = 2;
  const RATE = [0.82, 0.92, 1];
  const PROXY = /(^|\.)lexkite\.(com|pages\.dev)$/.test(location.hostname) ? '/api/ai' : 'https://lexkite.com/api/ai';
  // Tên kịch bản theo ngôn ngữ giao diện (nội dung hội thoại giữ tiếng Anh)
  const NAME = { manager: () => t('Họp với sếp nước ngoài'), 'dev-interview': () => t('Phỏng vấn Senior Developer'), 'marketing-interview': () => t('Phỏng vấn vị trí Marketing'), salary: () => t('Đàm phán lương'), delay: () => t('Báo cáo dự án trễ hạn'), 'client-call': () => t('Gọi điện cho khách hàng'), complaint: () => t('Xử lý khiếu nại'), presentation: () => t('Thuyết trình ngắn'), 'small-talk': () => t('Small talk với đồng nghiệp'), leave: () => t('Xin nghỉ phép'),
    neighbour: () => t('Làm quen hàng xóm mới'), cafe: () => t('Gọi đồ ở quán cà phê'), shop: () => t('Mua quần áo'), directions: () => t('Hỏi đường'), hotel: () => t('Nhận phòng khách sạn'), doctor: () => t('Đi khám bác sĩ') };
  // Kịch bản hằng ngày (data-everyday.js) dùng 3 cấp A1/A2/B1; công sở B1/B2/C1 – cùng chỉ số mức 0–2
  const nm = s => (NAME[s.id] ? NAME[s.id]() : s.name || s.title); // s.name: tên đã dịch do Giao tiếp tự tin truyền vào
  // Bài trong 🗣️ Giao tiếp tự tin (#/confidence) ứng với từng kịch bản – lối vào cuối hội thoại
  const CONF = { neighbour: 'greetings', 'small-talk': 'greetings', cafe: 'cafe', shop: 'shopping', directions: 'directions', hotel: 'travel', doctor: 'doctor', manager: 'meetings', delay: 'meetings', 'marketing-interview': 'interview', 'dev-interview': 'interview', complaint: 'complaints' };
  const lvOf = s => s.lv || LV, daily = s => s.kind === 'everyday';
  const all = () => window.ROLEPLAY || [];
  const store = (k, v) => { try { if (v === undefined) return JSON.parse(localStorage.getItem('vb.rp.' + k) || 'null'); localStorage.setItem('vb.rp.' + k, JSON.stringify(v)); } catch (e) { return null; } };
  const level = () => { const l = store('level'); return l === 0 || l === 1 || l === 2 ? l : 1; };
  const today = () => new Date().toISOString().slice(0, 10);
  const signedIn = () => !!(window.Sync && Sync.user);
  const aiLeft = () => { if (signedIn()) return 99; const u = store('day'); return GUEST_AI - (u && u.d === today() ? u.n : 0); };
  const useAi = () => { const u = store('day'), n = u && u.d === today() ? u.n : 0; store('day', { d: today(), n: n + 1 }); };
  const langName = () => { const l = I18N.lang(); try { return new Intl.DisplayNames(['en'], { type: 'language' }).of(l) || 'English'; } catch (e) { return 'English'; } };
  const words = s => (String(s).match(/[A-Za-z][A-Za-z'’-]*/g) || []);

  function css() {
    if ($('#rpCss')) return;
    const st = document.createElement('style'); st.id = 'rpCss';
    st.textContent = `.rp-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:.8rem}
.rp-card{display:flex;gap:.7rem;align-items:flex-start;padding:1rem;border:1px solid var(--line);border-radius:var(--radius-sm);background:var(--surface);color:var(--text);text-decoration:none;min-height:44px}
.rp-card:hover{border-color:var(--primary)}.rp-card .em{font-size:1.7rem;line-height:1}.rp-card b{display:block}
.rp-seg{display:inline-flex;border:1px solid var(--line);border-radius:999px;overflow:hidden}.rp-seg button{min-height:44px;min-width:56px;border:0;background:transparent;color:var(--text);font:inherit;font-weight:700;cursor:pointer}
.rp-seg button[aria-pressed=true]{background:var(--primary);color:var(--primary-ink)}
.rp-chat{display:flex;flex-direction:column;gap:.6rem;max-height:56vh;overflow-y:auto;padding:.4rem .1rem}
.rp-b{max-width:85%;padding:.65rem .85rem;border-radius:16px;line-height:1.5;overflow-wrap:anywhere}
.rp-b.ai{align-self:flex-start;background:var(--accent-soft);border-bottom-left-radius:4px}.rp-b.me{align-self:flex-end;background:var(--primary-soft);border-bottom-right-radius:4px}
.rp-b .who{font-size:.75rem;font-weight:700;opacity:.75;display:flex;justify-content:space-between;gap:.5rem;align-items:center}
.rp-b .who button{min-width:44px;min-height:44px;margin:-.6rem -.4rem -.6rem 0;border:0;background:transparent;font-size:1.05rem;cursor:pointer;color:inherit}
.rp-bar{display:flex;gap:.5rem;align-items:center;flex-wrap:wrap;margin-top:.7rem}.rp-bar input{flex:1 1 160px;min-width:0;min-height:44px;padding:.5rem .8rem;border:1px solid var(--line);border-radius:12px;background:var(--surface);color:var(--text);font:inherit}
.rp-bar .btn{min-height:44px}.rp-mic{min-width:56px;font-size:1.3rem}.rp-mic.on{animation:rxp 1s ease-in-out infinite alternate}
.rp-hint{margin-top:.6rem;padding:.6rem .8rem;border-radius:12px;background:var(--gold-soft)}
.rp-meter{display:grid;grid-template-columns:minmax(90px,auto) 1fr 3ch;gap:.5rem;align-items:center;margin:.35rem 0}.rp-meter i{display:block;height:10px;border-radius:9px;background:var(--line);overflow:hidden}.rp-meter i b{display:block;height:100%;background:var(--accent)}
.rp-rw{border-top:1px solid var(--line);padding:.7rem 0}.rp-rw:first-child{border-top:0}.rp-rw s{opacity:.7}
.rp-chips{display:flex;flex-wrap:wrap;gap:.4rem}.rp-chips button{min-height:44px}`;
    document.head.appendChild(st);
  }

  // ---------- (a) Gemini Nano trên máy ----------
  const LM = () => self.LanguageModel || null;
  const LMO = { expectedInputs: [{ type: 'text', languages: ['en'] }], expectedOutputs: [{ type: 'text', languages: ['en'] }] };
  async function nanoReady() { try { return !!LM() && (await LM().availability(LMO)) === 'available'; } catch (e) { return false; } }
  const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('TIMEOUT')), ms))]);
  // ---------- (b) AI miễn phí của Lexkite (/api/ai, kind 'rp') ----------
  async function proxy(sys, prompt) {
    const h = { 'Content-Type': 'application/json', 'X-Lexkite-Device': UI.dev() };
    try { if (signedIn()) h.Authorization = 'Bearer ' + await Sync.user.getIdToken(); } catch (e) { /* khách */ }
    const ctrl = new AbortController(), to = setTimeout(() => ctrl.abort(), 30000);
    let r; try { r = await fetch(PROXY, { method: 'POST', headers: h, signal: ctrl.signal, body: JSON.stringify({ prompt, sys, kind: 'rp' }) }); } finally { clearTimeout(to); }
    const j = await r.json().catch(() => ({}));
    if (r.status === 429) { UI.quota(j); throw new Error('QUOTA'); } // toast giờ mở lại + gợi ý đăng nhập (khách)
    if (!r.ok || !j.out) throw new Error('FAILED');
    return j.out;
  }

  const sysOf = (s, L) => `You are role-playing ${daily(s) ? 'an everyday' : 'a workplace'} English conversation to help a ${lvOf(s)[L]} English learner practise speaking.
Your character: ${s.ai.name}, ${s.ai.role}. Personality: ${s.ai.persona}. Your goal: ${s.ai.goal}.
Scenario: ${s.title}. The learner's goal: ${s.you}
Rules: stay in character; speak natural spoken English at ${lvOf(s)[L]} level (${(daily(s) ? ['very short, simple sentences with the most common words', 'short, simple sentences with common everyday words', 'natural everyday English'] : ['short simple sentences, common words', 'natural everyday business English', 'fluent, idiomatic professional English'])[L]}); never correct the learner during the conversation; never mention you are an AI; keep each reply under 45 words.`;
  const transcript = (hist, s) => hist.map(m => (m.who === 'ai' ? s.ai.name : 'Learner') + ': ' + m.text).join('\n');

  // ---------- Chọn câu trả lời theo kịch bản cố định (c) ----------
  const ACK = [['Okay.', 'I see.', 'Right.'], ['Okay, I see.', 'Got it.', 'Right, thanks.'], ['Understood.', 'That makes sense.', 'Fair enough.']];
  function scripted(s, L, i, reply, retried) {
    const next = s.turns[i + 1];
    if (!retried && words(reply).length < 3) return { text: ['Sorry, can you say a little more?', 'Sorry, could you tell me a bit more?', 'Could you expand on that a little?'][L], advance: false };
    let react = '';
    for (const [re, say] of s.turns[i].br || []) { try { if (new RegExp('\\b(' + re + ')', 'i').test(reply) || (re.includes('\\?') && /\?/.test(reply))) { react = say; break; } } catch (e) { /* mẫu lỗi */ } }
    if (!react && Math.random() < 0.5) react = ACK[L][Math.floor(Math.random() * 3)];
    const line = next ? next.a[L] : s.end[L];
    return { text: react ? react + ' ' + line : line, advance: true };
  }

  routes.roleplay = function (arg) {
    css();
    const list = all();
    if (arg && list.find(x => x.id === arg)) return brief(list.find(x => x.id === arg));
    const L = level();
    view.innerHTML = `<div class="page-head"><div><h1>🎭 ${t('Hội thoại đóng vai')}</h1><p class="muted">${t('Đóng vai hội thoại với AI – từ tình huống hằng ngày (A1–A2) đến công sở: nói bằng micro hoặc gõ phím, nhận điểm và câu viết lại hay hơn.')}</p></div></div>
      <div class="row" style="gap:.6rem;align-items:center;flex-wrap:wrap;margin-bottom:1rem"><span class="small muted">${t('Trình độ')}</span><div class="rp-seg" role="group" aria-label="${t('Trình độ')}">${LV.map((x, i) => `<button type="button" data-lv="${i}" aria-pressed="${i === L}">${['A1', 'A2', 'B1'][i]} / ${x}</button>`).join('')}</div></div>
      ${[[t('Tình huống hằng ngày'), 'A1 – B1', list.filter(daily)], [t('Công sở'), 'B1 – C1', list.filter(s => !daily(s))]].filter(x => x[2].length).map(([h, lv, l]) => `<h2 class="set-h">${h} <span class="chip">${lv}</span></h2>
      <div class="rp-grid" style="margin-bottom:1rem">${l.map(s => `<a class="rp-card" href="#/roleplay/${s.id}"><span class="em" aria-hidden="true">${s.em}</span><span><b>${esc(nm(s))}</b><span class="tiny muted" lang="en">${esc(s.title)} · ${t('{n} lượt', { n: s.turns.length })}</span></span></a>`).join('')}</div>`).join('')}
      <p class="tiny muted" style="margin-top:1rem">${signedIn() ? t('AI trên máy (Chrome) hoặc AI miễn phí của Lexkite sẽ đóng vai. Hết lượt AI thì dùng kịch bản soạn sẵn.') : t('Khách: {n} hội thoại có AI mỗi ngày, sau đó dùng kịch bản soạn sẵn. Đăng nhập để luyện với AI nhiều hơn.', { n: GUEST_AI })}</p>`;
    $$('[data-lv]', view).forEach(b => b.onclick = () => { store('level', +b.dataset.lv); $$('[data-lv]', view).forEach(x => x.setAttribute('aria-pressed', String(x === b))); });
  };

  function brief(s) {
    const L = level();
    view.innerHTML = `<div class="page-head"><div><h1>${s.em} ${esc(nm(s))}</h1><p class="muted" lang="en">${esc(s.title)}</p></div></div>
      <div class="card"><h2 class="set-h">🎭 ${t('Vai của AI')}</h2><p lang="en"><b>${esc(s.ai.name)}</b> – ${esc(s.ai.role)}<br><span class="muted small">${esc(s.ai.persona)}</span></p>
      <h2 class="set-h">${UI.icon('target')} ${t('Mục tiêu của bạn')}</h2>${s.cando ? `<p><b>${esc(t(s.cando))}</b></p>` : ''}<p lang="en"${s.cando ? ' class="small muted"' : ''}>${esc(s.you)}</p>
      <h2 class="set-h">${UI.icon('library')} ${t('Từ vựng chủ đề')}</h2><div class="rp-chips">${s.vocab.map(([w, d], i) => `<button class="btn sm" data-v="${i}" title="${esc(d)}" lang="en">+ ${esc(w)}</button>`).join('')}</div>
      <p class="tiny muted">${t('Bấm để lưu từ vào flashcard.')}</p>
      <div class="row" style="gap:.6rem;align-items:center;flex-wrap:wrap;margin-top:1rem"><div class="rp-seg" role="group" aria-label="${t('Trình độ')}">${lvOf(s).map((x, i) => `<button type="button" data-lv="${i}" aria-pressed="${i === L}">${x}</button>`).join('')}</div>
      <button class="btn primary lg" id="rpGo">▶ ${t('Bắt đầu hội thoại')}</button><a class="btn" href="#/roleplay">${t('Chọn tình huống khác')}</a></div></div>`;
    $$('[data-lv]', view).forEach(b => b.onclick = () => { store('level', +b.dataset.lv); $$('[data-lv]', view).forEach(x => x.setAttribute('aria-pressed', String(x === b))); });
    $$('[data-v]', view).forEach(b => b.onclick = async () => {
      const [w, d] = s.vocab[+b.dataset.v];
      await App.addWord({ word: w, def: d, emoji: s.em, topic: 'roleplay' }, { text: d, title: 'Roleplay: ' + s.title });
      b.disabled = true; b.textContent = '✓ ' + w; toast(t('Đã lưu vào flashcard'));
    });
    $('#rpGo').onclick = () => chat(s, level());
  }

  async function chat(s, L, opts = {}) {
    const accent = state.settings.accent || 'en-GB';
    const hist = []; let i = 0, retried = false, busy = false, rec = null, dead = false, hintsUsed = 0;
    // Chọn "bộ não" cho hội thoại: Nano → máy chủ (nếu còn lượt) → kịch bản
    let mode = 'script', nano = null;
    if (aiLeft() > 0) {
      if (await nanoReady()) { try { nano = await LM().create({ ...LMO, initialPrompts: [{ role: 'system', content: sysOf(s, L) + '\nReply with only what your character says next – no names, no quotes, no notes.' }] }); mode = 'nano'; } catch (e) { nano = null; } }
      if (!nano && navigator.onLine !== false) mode = 'server';
      if (mode !== 'script') useAi();
    }
    App.cleanups.push(() => { dead = true; try { if (rec && rec.stop) rec.stop(); } catch (e) { /* bỏ qua */ } if (nano) try { nano.destroy(); } catch (e) { /* bỏ qua */ } });
    const MODE = { nano: '🧠 ' + t('AI trên máy (Gemini Nano)'), server: '☁️ ' + t('AI miễn phí của Lexkite'), script: '📜 ' + t('Kịch bản soạn sẵn') };
    view.innerHTML = `<div class="page-head"><div><h1>${s.em} ${esc(nm(s))}</h1><p class="muted small"><span id="rpMode">${MODE[mode]}</span> · ${lvOf(s)[L]} · <span id="rpN"></span></p></div></div>
      <div class="card"><div class="rp-chat" id="rpChat" aria-live="polite"></div>
      <div id="rpHintBox"></div>
      <div class="rp-bar"><button class="btn primary rp-mic" id="rpMic" aria-label="${t('Nói')}">🎙️</button><input id="rpIn" type="text" autocomplete="off" lang="en" placeholder="${t('Nói hoặc gõ câu trả lời…')}" aria-label="${t('Câu trả lời của bạn')}"><button class="btn" id="rpSend">${t('Gửi')}</button></div>
      <div class="rp-bar"><button class="btn sm" id="rpHint">${UI.icon('lightbulb')} ${t('Gợi ý')}</button>${opts.help ? `<button class="btn sm" id="rpHelp">🆘 ${t('Giúp tôi nói')}</button>` : ''}<button class="btn sm" id="rpEnd">${UI.icon('flag')} ${t('Kết thúc & chấm điểm')}</button></div></div>`;
    const alive = () => !dead && document.body.contains($('#rpChat'));
    const setN = () => { const n = $('#rpN'); if (n) n.textContent = t('Lượt {i}/{n}', { i: Math.min(i + 1, s.turns.length), n: s.turns.length }); };
    const bubble = (who, text) => {
      hist.push({ who, text, turn: Math.min(i, s.turns.length - 1) });
      const el = document.createElement('div'); el.className = 'rp-b ' + who; el.lang = 'en';
      el.innerHTML = `<div class="who"><span>${who === 'ai' ? esc(s.ai.name) : t('Bạn')}</span>${who === 'ai' ? `<button type="button" aria-label="${t('Nghe lại')}">🔊</button>` : ''}</div><div>${esc(text)}</div>`;
      if (who === 'ai') el.querySelector('button').onclick = () => UI.tts(text, accent, RATE[L]);
      $('#rpChat').appendChild(el); $('#rpChat').scrollTop = 1e6;
      if (who === 'ai') UI.tts(text, accent, RATE[L]);
    };
    const thinking = on => { let d = $('#rpDots'); if (on && !d) { $('#rpChat').insertAdjacentHTML('beforeend', `<div class="rp-b ai" id="rpDots" aria-label="${t('Đang trả lời…')}">…</div>`); $('#rpChat').scrollTop = 1e6; } if (!on && d) d.remove(); };
    const downgrade = msg => { mode = 'script'; if (nano) { try { nano.destroy(); } catch (e) { /* bỏ qua */ } nano = null; } const m = $('#rpMode'); if (m) m.textContent = MODE.script; if (msg) toast(msg, 4000); };

    async function aiReply(reply) {
      const next = s.turns[i + 1], beat = next ? next.a[L] : s.end[L];
      if (mode === 'nano') {
        try {
          const out = String(await withTimeout(nano.prompt(`The learner said: "${reply}"\nRespond briefly to what they said, then ${next ? 'naturally move on with this point (same meaning, your own words): "' + beat + '"' : 'close the conversation politely, similar to: "' + beat + '"'}`), 25000)).replace(/^["“]|["”]$/g, '').replace(new RegExp('^' + s.ai.name + ':\\s*'), '').trim();
          if (out) return { text: out.slice(0, 400), advance: true };
        } catch (e) { /* Nano lỗi → máy chủ */ }
        mode = 'server'; const m = $('#rpMode'); if (m) m.textContent = MODE.server;
      }
      if (mode === 'server') {
        try {
          const out = await proxy(sysOf(s, L) + '\nReturn JSON only.', `Conversation so far:\n${transcript(hist, s)}\n\n${next ? `Next point you must cover (say it in your own words, same meaning): "${beat}"` : `This is the end: close the conversation politely, similar to: "${beat}"`}\nIf the learner's last reply is unclear, off-topic or too short to understand, ask them to clarify instead and set "advance" to false (only once per point).\nJSON: {"reply": string (what ${s.ai.name} says next, under 45 words), "advance": boolean}`);
          if (out && out.reply) return { text: String(out.reply).slice(0, 400), advance: retried || out.advance !== false };
        } catch (e) { downgrade(e.message === 'QUOTA' ? t('Đã hết lượt AI hôm nay – tiếp tục bằng kịch bản soạn sẵn.') : t('AI đang bận – tiếp tục bằng kịch bản soạn sẵn.')); }
      }
      return scripted(s, L, i, reply, retried);
    }

    async function send(text) {
      text = String(text || '').replace(/\s+/g, ' ').trim();
      if (!text || busy || !alive() || i >= s.turns.length) return; // hết lượt → đang chấm, không gửi thêm
      busy = true; $('#rpIn').value = ''; $('#rpHintBox').innerHTML = '';
      bubble('me', text); thinking(true);
      const r = await aiReply(text);
      if (!alive()) return;
      thinking(false);
      if (r.advance) { i++; retried = false; } else retried = true;
      bubble('ai', r.text); setN(); busy = false;
      if (i >= s.turns.length) setTimeout(() => alive() && finish(), 600);
    }

    $('#rpSend').onclick = () => send($('#rpIn').value);
    $('#rpIn').onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); send($('#rpIn').value); } };
    $('#rpHint').onclick = () => {
      const tr = s.turns[Math.min(i, s.turns.length - 1)]; hintsUsed++;
      $('#rpHintBox').innerHTML = `<div class="rp-hint">${tr.tip ? `<div class="small">${UI.icon('compass')} ${esc(t(tr.tip))}</div>` : ''}<div class="tiny muted">${UI.icon('lightbulb')} ${t('Bạn có thể nói:')}</div><div lang="en">${esc(tr.h[L])} <button class="btn sm" data-hs aria-label="${t('Nghe')}">🔊</button></div></div>`;
      $('[data-hs]', view).onclick = () => UI.tts(tr.h[L], accent, RATE[L]);
    };
    // 🆘 Giúp tôi nói: đọc chậm câu gợi ý và đặt sẵn vào ô trả lời – người học nói theo (micro) hoặc bấm Gửi
    if (opts.help) $('#rpHelp').onclick = () => {
      const tr = s.turns[Math.min(i, s.turns.length - 1)]; hintsUsed++;
      $('#rpHintBox').innerHTML = `<div class="rp-hint"><div class="tiny muted">🆘 ${t('Nghe rồi nói theo câu này:')}</div><div lang="en"><b>${esc(tr.h[L])}</b></div></div>`;
      $('#rpIn').value = tr.h[L]; UI.tts(tr.h[L], accent, 0.72);
    };
    $('#rpMic').onclick = () => {
      const mic = $('#rpMic');
      if (rec) { try { rec.stop(); } catch (e) { /* bỏ qua */ } return; }
      UI.stopSpeak();
      const tr = s.turns[Math.min(i, s.turns.length - 1)];
      rec = UI.recognize(tr.h[L], accent, {
        start: () => mic.classList.add('on'),
        result: ({ heard }) => { if (heard && alive()) send(heard); },
        error: code => toast(UI.recErrorText(code), 3500),
        end: () => { rec = null; mic.classList.remove('on'); },
      });
      if (rec) mic.classList.add('on');
    };
    $('#rpEnd').onclick = () => { if (!busy) finish(); };

    function finish() {
      if (!alive()) return;
      if (nano) { try { nano.destroy(); } catch (e) { /* bỏ qua */ } nano = null; }
      report(s, L, hist, mode, hintsUsed, opts);
    }
    setN();
    bubble('ai', s.turns[0].a[L]);
    $('#rpIn').focus({ preventScroll: true });
  }

  // ---------- Chấm điểm ----------
  const POLITE = /\b(please|thank|thanks|could|would|may i|i'?d like|i'?m afraid|sorry|appreciate|mind|if possible|i was wondering|happy to)\b/i;
  const ERR = [/\bi am agree\b/i, /\b(he|she|it) don'?t\b/i, /\bmore (better|easier|faster)\b/i, /\bdid(n'?t)? \w+ed\b/i, /\ba (?!one|once|uni|use|usu|eu)[aeiou]\w*/i, /\bi (very|really) (like|want)\b/i, /\b(informations|advices|equipments|furnitures)\b/i, /\bcan (to|went)\b/i, /(?<!\b(did|does|do|will|would|can|could|should|may|might|must|to|let|make|made|help|let's) )\b(he|she) (go|want|need|like|work)\b/i, /^i\s/, /\bi\b(?![''’])/];
  function localScore(s, L, hist) {
    const mine = [];
    hist.forEach(m => { if (m.who === 'me') mine.push({ text: m.text, turn: s.turns[m.turn || 0] }); });
    if (!mine.length) return null;
    const avgW = mine.reduce((a, m) => a + words(m.text).length, 0) / mine.length;
    const sim = mine.map(m => UI.similarity(m.text.toLowerCase(), m.turn.h[L].toLowerCase()));
    const polite = mine.filter(m => POLITE.test(m.text)).length / mine.length;
    const contractions = mine.filter(m => /\b\w+'(m|re|s|ll|ve|d|t)\b/i.test(m.text)).length / mine.length;
    const errs = mine.map(m => ERR.filter(re => re.test(m.text)).length);
    const errSum = errs.reduce((a, b) => a + b, 0);
    const clamp = x => Math.max(20, Math.min(98, Math.round(x)));
    const lenOk = avgW >= 6 && avgW <= 35 ? 1 : avgW >= 4 ? 0.6 : 0.25;
    const sc = {
      natural: clamp(45 + contractions * 25 + lenOk * 15 + (sim.reduce((a, b) => a + b, 0) / sim.length) * 25),
      polite: clamp(45 + polite * 55),
      clarity: clamp(35 + lenOk * 40 + Math.min(1, mine.length / s.turns.length) * 25),
      grammar: clamp(96 - errSum / mine.length * 30),
    };
    const order = mine.map((m, n) => ({ m, n, w: sim[n] - errs[n] * 0.3 - (words(m.text).length < 4 ? 0.3 : 0) })).sort((a, b) => a.w - b.w).slice(0, 3);
    const rewrites = order.map(({ m, n }) => {
      const better = m.turn.h[Math.min(2, L + 1)];
      const why = words(m.text).length < 4 ? t('Câu trả lời quá ngắn – thêm một lý do hoặc chi tiết cụ thể để ý rõ hơn.')
        : errs[n] ? t('Có lỗi ngữ pháp cơ bản – câu viết lại đúng ngữ pháp và tự nhiên hơn.')
          : !POLITE.test(m.text) ? t('Thêm từ lịch sự (could, would, please, I\'m afraid…) để lời nói mềm và chuyên nghiệp hơn.')
            : daily(s) ? t('Cách nói này rõ ý và tự nhiên hơn.') : t('Cách nói này rõ ý hơn và đúng phong cách công sở hơn.');
      return { you: m.text, better, why };
    });
    return { ...sc, rewrites, summary: '' };
  }

  async function aiScore(s, L, hist, mode) {
    const lang = langName();
    const prompt = `${daily(s) ? 'Everyday' : 'Workplace'} role-play for a ${lvOf(s)[L]} English learner. Scenario: ${s.title}. Learner's goal: ${s.you}\nTranscript:\n${transcript(hist, s)}\n
Assess ONLY the learner's lines. Return JSON: {"natural": 0-100, "polite": 0-100, "clarity": 0-100, "grammar": 0-100, "summary": string (2 sentences of feedback written in ${lang}), "rewrites": [ {"you": exact learner line, "better": a sharper, more natural and professional version in English (keep their idea, ${lvOf(s)[Math.min(2, L + 1)]} level), "why": string (1-2 sentences in ${lang} explaining what improved), "meaning": string (translation of "better" into ${lang})} ] exactly 3 items, choosing the learner lines that would improve most}`;
    try { return await proxy(`You are a strict but encouraging ${daily(s) ? 'everyday' : 'business'} English coach. Be accurate: very short or off-topic answers get low scores. Return JSON only.`, prompt); } catch (e) { /* hết lượt/mất mạng → AI trên máy */ }
    if (lang === 'English' && await nanoReady()) {
      let ss = null;
      try { ss = await LM().create(LMO); const out = await withTimeout(ss.prompt(prompt + '\nReturn only JSON.'), 60000); return JSON.parse(String(out).replace(/^[^{]*/, '').replace(/[^}]*$/, '')); } catch (e) { /* bỏ qua */ } finally { if (ss) try { ss.destroy(); } catch (e) { /* bỏ qua */ } }
    }
    return null;
  }

  async function report(s, L, hist, mode, hintsUsed, opts = {}) {
    const spoken = hist.filter(m => m.who === 'me').length;
    view.innerHTML = `<div class="page-head"><div><h1>${UI.icon('flag')} ${t('Kết quả hội thoại')}</h1><p class="muted">${s.em} ${esc(nm(s))} · ${lvOf(s)[L]}</p></div></div><div class="card" id="rpRep" aria-busy="true"><p class="muted">${UI.icon('hourglass')} ${t('Đang chấm…')}</p></div>`;
    if (!spoken) { $('#rpRep').innerHTML = `<p>${t('Bạn chưa trả lời câu nào – hãy thử lại nhé.')}</p>${opts.done ? `<button class="btn primary" id="rpDone">${t('Tiếp tục')} →</button>` : `<a class="btn primary" href="#/roleplay/${s.id}">↻ ${t('Thử lại')}</a>`}`; if (opts.done) $('#rpDone').onclick = () => opts.done({ avg: null }); return; }
    const loc = localScore(s, L, hist);
    let r = null;
    if (mode !== 'script' || signedIn()) r = await aiScore(s, L, hist, mode).catch(() => null);
    const ok = r && ['natural', 'polite', 'clarity', 'grammar'].every(k => typeof r[k] === 'number') && Array.isArray(r.rewrites);
    const res = ok ? r : loc;
    if (!document.body.contains($('#rpRep') || document.createElement('i'))) return;
    const xp = 10 + spoken * 3 - Math.min(hintsUsed, spoken);
    App.reward({ spoken, xp: Math.max(5, xp) });
    const crit = [['natural', t('Độ tự nhiên')], ['polite', t('Mức lịch sự')], ['clarity', t('Độ rõ ý')], ['grammar', t('Ngữ pháp')]];
    const avg = Math.round(crit.reduce((a, [k]) => a + Math.max(0, Math.min(100, +res[k] || 0)), 0) / 4);
    const rws = (res.rewrites || []).filter(x => x && x.better).slice(0, 3);
    $('#rpRep').removeAttribute('aria-busy');
    $('#rpRep').innerHTML = `<div class="row between" style="flex-wrap:wrap;gap:.8rem"><div>${UI.ring(avg, avg)}</div><div style="flex:1 1 220px">${crit.map(([k, n]) => { const v = Math.max(0, Math.min(100, Math.round(+res[k] || 0))); return `<div class="rp-meter"><span class="small">${n}</span><i role="img" aria-label="${n}: ${v}/100"><b style="width:${v}%"></b></i><b class="small">${v}</b></div>`; }).join('')}</div></div>
      ${res.summary ? `<p style="margin-top:.8rem">${esc(res.summary)}</p>` : ''}
      <p class="tiny muted">${ok ? t('Chấm bởi AI') : t('Ước lượng nhanh trên máy (không có AI).')} · +${Math.max(5, xp)} XP</p>
      <h2 class="set-h" style="margin-top:1rem">${UI.icon('sparkles')} ${t('3 câu nói sắc hơn')}</h2>
      ${rws.map((x, n) => `<div class="rp-rw"><div class="small"><s lang="en">${esc(x.you || '')}</s></div><div lang="en"><b>${esc(x.better)}</b> <button class="btn sm" data-say="${n}" aria-label="${t('Nghe')}">🔊</button></div>${x.meaning ? `<div class="small muted">${esc(x.meaning)}</div>` : ''}<div class="small">${UI.icon('lightbulb')} ${esc(x.why || '')}</div><button class="btn sm" data-save="${n}">+ ${t('Lưu vào flashcard')}</button></div>`).join('') || `<p class="muted">${t('Rất tốt – không có câu nào cần viết lại!')}</p>`}
      <div class="row" style="gap:.6rem;flex-wrap:wrap;margin-top:1rem">${opts.done ? `<button class="btn primary" id="rpDone">${t('Tiếp tục')} →</button>` : `<a class="btn primary" href="#/roleplay/${s.id}">↻ ${t('Luyện lại')}</a><a class="btn" href="#/roleplay">${t('Chọn tình huống khác')}</a>`}</div>
      ${opts.done ? '' : `<a class="card hover hub-card" style="margin-top:1rem" href="#/confidence${CONF[s.id] ? '/' + CONF[s.id] : ''}"><span class="hub-ic" aria-hidden="true">${UI.icon('message-circle')}</span><span class="hub-tx"><b>${t('Giao tiếp tự tin')}</b><small>${CONF[s.id] ? t('Học các cụm câu tự nhiên cho đúng tình huống này') : t('Lộ trình nói theo tình huống thật, từ A1 đến B2')}</small></span><span class="chev" aria-hidden="true">›</span></a>`}`;
    if (opts.done) $('#rpDone').onclick = () => opts.done({ avg });
    $$('[data-say]', view).forEach(b => b.onclick = () => UI.tts(rws[+b.dataset.say].better, state.settings.accent || 'en-GB', RATE[L]));
    $$('[data-save]', view).forEach(b => b.onclick = async () => {
      const x = rws[+b.dataset.save];
      await App.addWord({ word: x.better, vi: x.meaning || '', pos: 'phrase', ex: x.better, emoji: s.em, topic: 'roleplay' }, { text: x.better, title: 'Roleplay: ' + s.title }, { silent: true });
      b.disabled = true; b.textContent = '✓ ' + t('Đã lưu'); toast(t('Đã lưu vào flashcard'));
    });
  }
  // Dùng chung bộ não hội thoại cho 🗣️ Giao tiếp tự tin: RP.chat(kịch bản cùng định dạng data-*.js, mức 0–2, { help, done(kết quả) })
  window.RP = { chat: (s, L, opts) => { css(); return chat(s, L, opts); } };
})();
