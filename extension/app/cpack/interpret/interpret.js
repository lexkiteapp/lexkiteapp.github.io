/* 🗣️ Phiên dịch (#/interpret): hai người nói hai ngôn ngữ, mỗi bên một nút micro; nửa trên xoay 180° cho người đối diện.
 * Nhận giọng: UI.speechSession (Web Speech; app gốc dùng nhận dạng của máy). Dịch (miễn phí, trên máy trước): AILocal.translate (Chrome Translator / ML Kit / Apple Translation)
 * → Dict.translateTo (có chuỗi dự phòng). Đọc: UI.tts (Kokoro cho tiếng Anh, giọng hệ thống cho còn lại). Lớp học: lưu Sổ từ, nghe chậm, nói lại chấm điểm, tóm tắt từ mới.
 * Lõi thuần: js/interpret/core.js · câu mẫu: cpack/interpret/phrases.js · CSS: css/interpret.css · tài liệu: docs/INTERPRET.md. Không CSS/JS nào nằm trong khung app. */
(function () {
  const { esc, toast } = UI, App = window.App, { routes } = App, view = App.view, C = window.InterpretCore;
  const PK = 'lk.interp.pair', icon = UI.icon, I = () => window.I18N;
  const nameOf = l => (I().LANGS[l] || [l, l])[1];
  const pair = () => { let p = null; try { p = JSON.parse(localStorage.getItem(PK) || 'null'); } catch (e) { /* riêng tư */ } const me = I().lang();
    if (!p || !C.ok(p.a) || !C.ok(p.b) || p.a === p.b) p = { a: me, b: me === 'en' ? 'es' : 'en' }; return p; };
  const setPair = p => { try { localStorage.setItem(PK, JSON.stringify(p)); } catch (e) { /* riêng tư */ } };
  const opts = sel => C.CODES.map(l => `<option value="${l}"${l === sel ? ' selected' : ''}>${esc(nameOf(l))}</option>`).join('');
  const head = (title, back) => `<div class="ip-bar"><a class="ip-back" href="${back || '#/skills'}" aria-label="${t('Quay lại')}">${icon('arrow-left')}</a><h1>${title}</h1></div>`;
  const nav = cur => `<nav class="ip-tabs" aria-label="${t('Phiên dịch')}">${[['', t('Đối mặt')], ['phrases', t('Câu nói mẫu')], ['history', t('Lịch sử')]].map(([h, n]) => `<a class="chip${h === cur ? ' on' : ''}" href="#/interpret${h ? '/' + h : ''}"${h === cur ? ' aria-current="page"' : ''}>${n}</a>`).join('')}</nav>`;

  // ---------- Dịch: trên máy trước (miễn phí, offline sau khi có gói), rồi Dict.translateTo ----------
  async function xlate(text, from, to) {
    if (from === to) return { text, local: true };
    try { await App.need('ailocal'); } catch (e) { /* không có: đi tiếp */ }
    if (window.AILocal) { const r = await AILocal.translate(text, from, to, { timeout: 7000 }).catch(() => null); if (r) return { text: r, local: true }; }
    if (window.Dict) { const r = await Dict.translateTo(text, to, from).catch(() => ''); if (r) return { text: r, local: false }; }
    return null;
  }
  async function detect(text) { try { await App.need('ailocal'); return window.AILocal ? await AILocal.detect(text, { timeout: 3000 }) : null; } catch (e) { return null; } }
  const speak = (tx, l, rate) => UI.tts(tx, C.LOC[l], rate);
  const saveCards = (list) => Promise.all(list.map(c => App.addWord({ word: c.word, def: c.def, pos: 'phrase', emoji: '🗣️', topic: 'interpret' }, { text: c.def, title: t('Phiên dịch') }, { silent: true })));

  // ---------- Đối mặt ----------
  function talk() {
    const P = pair(), cid = 'c' + Date.now(); let ses = null, side = null, last = null, nTurns = 0, busy = false;
    const lg = s => P[s];
    const half = s => `<section class="ip-half ip-${s}" data-side="${s}" lang="${lg(s)}" dir="${C.dirOf(lg(s))}">
      <div class="ip-hd"><select class="ip-lang" data-s="${s}" aria-label="${t('Chọn ngôn ngữ')}">${opts(lg(s))}</select><span class="ip-badge" hidden></span></div>
      <p class="ip-heard" aria-live="polite" data-ph="${t('Bản dịch sẽ hiện ở đây')}"></p>
      <p class="ip-live muted" aria-live="off"></p>
      <button class="ip-mic" data-s="${s}" aria-pressed="false" aria-label="${t('Nói')}"><span class="ip-ring" aria-hidden="true"></span>${icon('mic')}<span class="ip-ml">${t('Chạm để bắt đầu nói')}</span></button>
    </section>`;
    view.innerHTML = `<div class="ip">${head(icon('globe') + ' ' + t('Phiên dịch'))}${nav('')}
      ${half('b')}
      <div class="ip-mid" role="group" aria-label="${t('Câu vừa dịch')}"><button class="ip-act" data-a="play" disabled aria-label="${t('Nghe lại')}">${icon('volume-2')}</button><button class="ip-act" data-a="slow" disabled aria-label="${t('Nghe chậm')}">${icon('turtle')}</button><button class="ip-act" data-a="save" disabled aria-label="${t('Lưu vào Sổ từ')}">${icon('notebook-pen')}</button><button class="ip-act" data-a="say" disabled aria-label="${t('Nói lại để chấm phát âm')}">${icon('repeat')}</button><button class="ip-act" data-a="swap" aria-label="${t('Đổi hai ngôn ngữ')}">${icon('refresh-cw')}</button><button class="ip-act" data-a="pack" aria-label="${t('Tải gói dùng offline')}">${icon('download')}</button></div>
      <p class="ip-score muted" role="status" aria-live="polite"></p>
      ${half('a')}
      <div class="ip-foot"><button class="btn" id="ipEnd">${t('Kết thúc & xem từ mới')}</button><p class="tiny muted">${t('Dùng được offline sau khi tải gói ngôn ngữ. Lịch sử chỉ lưu trên máy này.')}</p></div></div>`;
    const $q = (q, r = view) => r.querySelector(q), half$ = s => $q(`.ip-half.ip-${s}`);
    const other = s => (s === 'a' ? 'b' : 'a'), rec = (s, on) => { const b = $q(`.ip-mic[data-s="${s}"]`); b.setAttribute('aria-pressed', on ? 'true' : 'false'); b.classList.toggle('on', on); $q('.ip-ml', b).textContent = on ? t('Đang nghe… chạm để xong') : t('Chạm để bắt đầu nói'); view.querySelectorAll('.ip-mic').forEach(x => { x.disabled = on && x !== b; }); };
    const acts = on => view.querySelectorAll('.ip-act[data-a="play"],[data-a="slow"],[data-a="save"],[data-a="say"]').forEach(b => { b.disabled = !on; });
    const stopAll = () => { try { if (ses) ses.cancel(); } catch (e) { /* đã dừng */ } ses = null; side = null; UI.stopSpeak && UI.stopSpeak(); };
    App.onCleanup(stopAll);

    async function finish(s, text) {
      const t0 = text.trim(); if (!t0) { toast(t('Chưa nghe thấy gì – thử lại gần micro hơn')); return; }
      busy = true; $q('.ip-live', half$(other(s))).textContent = t0;
      const det = await detect(t0), who = C.speaker(det, P, s), to = other(who), r = await xlate(t0, lg(who), lg(to));
      busy = false;
      if (!r) { toast(t('Chưa dịch được – kiểm tra mạng hoặc tải gói ngôn ngữ')); return; }
      const turn = { from: who, src: t0, dst: lg(to), tx: r.text, ts: Date.now() }; last = turn; nTurns++;
      InterpretCore.addTurn(cid, P, turn);
      $q('.ip-live', half$(other(who))).textContent = ''; $q('.ip-live', half$(who)).textContent = t0;
      const hh = $q('.ip-heard', half$(to)); hh.textContent = r.text; hh.classList.add('on');
      for (const x of view.querySelectorAll('.ip-badge')) x.hidden = true; const bd = $q('.ip-badge', half$(to)); bd.hidden = false; bd.textContent = r.local ? t('Trên máy') : t('Trực tuyến');
      acts(true); speak(r.text, lg(to));
    }
    async function toggle(s) {
      if (busy) return;
      if (ses) { const cur = ses, sd = side; ses = null; side = null; rec(sd, false); const o = await cur.stop(); finish(sd, o.text || ''); return; }
      stopAll(); side = s;
      ses = await UI.speechSession({ lang: C.LOC[lg(s)], slot: 'ip', onText: x => { $q('.ip-live', half$(s)).textContent = x; $q('.ip-live', half$(other(s))).textContent = x; }, onError: c => { rec(s, false); ses = null; side = null; toast(c === 'not-allowed' ? t('Cần cho phép micro để dùng Phiên dịch') : c === 'unsupported' ? t('Trình duyệt không hỗ trợ nhận dạng giọng nói – hãy dùng Chrome hoặc Edge.') : t('Lỗi nhận dạng: {err}', { err: c })); } });
      if (ses) rec(s, true); else side = null;
    }
    view.onchange = e => { const sel = e.target.closest('.ip-lang'); if (!sel) return; const s = sel.dataset.s, o = other(s); if (sel.value === P[o]) { P[o] = P[s]; } P[s] = sel.value; setPair(P); talk(); };
    view.onclick = async e => {
      const m = e.target.closest('.ip-mic'); if (m) return toggle(m.dataset.s);
      if (e.target.closest('#ipEnd')) { stopAll(); location.hash = nTurns ? '#/interpret/recap/' + cid : '#/interpret/history'; return; }
      const b = e.target.closest('.ip-act'); if (!b) return; const a = b.dataset.a;
      if (a === 'swap') { const x = P.a; P.a = P.b; P.b = x; setPair(P); return talk(); }
      if (a === 'pack') return pack(P);
      if (!last) return;
      if (a === 'play') speak(last.tx, last.dst); else if (a === 'slow') speak(last.tx, last.dst, 0.55);
      else if (a === 'save') { const cs = InterpretCore.cards({ a: P.a, b: P.b, turns: [last] }, I().lang()); if (!cs.length) return toast(t('Câu này đã bằng ngôn ngữ của bạn')); await saveCards(cs); toast(t('Đã lưu vào Sổ từ')); }
      else if (a === 'say') practice(last, P, $q('.ip-score'));
    };
  }

  async function pack(P) {
    try { await App.need('ailocal'); } catch (e) { /* tiếp */ }
    if (!window.AILocal) return toast(t('Thiết bị này chưa hỗ trợ dịch trên máy'));
    toast(t('Đang tải gói ngôn ngữ… (nên dùng Wi-Fi)'));
    const a = await AILocal.download('translate', { from: P.a, to: P.b }).catch(() => null), b = await AILocal.download('translate', { from: P.b, to: P.a }).catch(() => null);
    toast(a || b ? t('Đã sẵn sàng dùng offline') : t('Thiết bị này chưa hỗ trợ dịch trên máy'));
  }

  // "Nói lại": chấm phát âm cụm tiếng nước ngoài của câu vừa dịch (ngôn ngữ ≠ ngôn ngữ của tôi)
  function practice(turn, P, out) {
    const me = I().lang(), srcL = turn.from === 'a' ? P.a : P.b, [w, wl] = srcL === me ? [turn.tx, turn.dst] : [turn.src, srcL];
    if (wl === me) return;
    out.textContent = t('Hãy nói: “{s}”', { s: w });
    UI.recognize(w, C.LOC[wl], { result: r => { out.textContent = t('Điểm {n}/100 · máy nghe được: “{h}”', { n: r.score, h: r.heard }); }, error: c => { out.textContent = t('Lỗi nhận dạng: {err}', { err: c }); } });
  }

  // ---------- Câu mẫu du lịch ----------
  async function phrases(grp) {
    view.innerHTML = UI.skelPage(t('Đang tải…'));
    try { if (!window.INTERPRET_PHRASES) await App.loadScript('cpack/interpret/phrases.js'); } catch (e) { /* báo dưới */ }
    const D = window.INTERPRET_PHRASES; if (!D) { view.innerHTML = `<div class="card"><p>${t('Không tải được câu mẫu – thử lại sau')}</p><a class="btn" href="#/interpret">${t('Quay lại')}</a></div>`; return; }
    const P = pair(), G = { hi: t('Chào hỏi'), go: t('Đi lại'), eat: t('Ăn uống'), stay: t('Lưu trú & mua sắm'), sos: t('Khẩn cấp') }, cur = D.order.includes(grp) ? grp : D.order[0];
    const rows = D.items.filter(x => x[0] === cur).map(([, o], i) => `<div class="card ip-ph"><p class="ip-ph-a" lang="${P.a}" dir="${C.dirOf(P.a)}">${esc(o[P.a])}</p><p class="ip-ph-b" lang="${P.b}" dir="${C.dirOf(P.b)}"><b>${esc(o[P.b])}</b></p>
      <div class="ip-acts"><button class="ip-act" data-i="${i}" data-a="play" aria-label="${t('Nghe')}">${icon('volume-2')}</button><button class="ip-act" data-i="${i}" data-a="slow" aria-label="${t('Nghe chậm')}">${icon('turtle')}</button><button class="ip-act" data-i="${i}" data-a="save" aria-label="${t('Lưu vào Sổ từ')}">${icon('notebook-pen')}</button><button class="ip-act" data-i="${i}" data-a="say" aria-label="${t('Nói lại để chấm phát âm')}">${icon('repeat')}</button></div></div>`).join('');
    view.innerHTML = `<div class="ip">${head(icon('globe') + ' ' + t('Câu mẫu du lịch'), '#/interpret')}${nav('phrases')}
      <div class="ip-pair"><select class="ip-lang" data-s="a" aria-label="${t('Chọn ngôn ngữ')}">${opts(P.a)}</select><span aria-hidden="true">→</span><select class="ip-lang" data-s="b" aria-label="${t('Chọn ngôn ngữ')}">${opts(P.b)}</select></div>
      <div class="ip-chips">${D.order.map(k => `<a class="chip${k === cur ? ' on' : ''}" href="#/interpret/phrases/${k}">${G[k]}</a>`).join('')}</div>${rows}<p class="ip-score muted" role="status" aria-live="polite"></p></div>`;
    const items = D.items.filter(x => x[0] === cur);
    view.onchange = e => { const sel = e.target.closest('.ip-lang'); if (!sel) return; const s = sel.dataset.s, o = s === 'a' ? 'b' : 'a'; if (sel.value === P[o]) P[o] = P[s]; P[s] = sel.value; setPair(P); phrases(cur); };
    view.onclick = e => { const b = e.target.closest('.ip-act'); if (!b) return; const o = items[+b.dataset.i][1], a = b.dataset.a, me = I().lang(), fl = P.a === me ? P.b : P.a, ft = o[fl];
      if (a === 'play') speak(o[P.b], P.b); else if (a === 'slow') speak(o[P.b], P.b, 0.55);
      else if (a === 'save') { saveCards([{ word: o[fl], def: o[me] || o[P.a], lang: fl }]).then(() => toast(t('Đã lưu vào Sổ từ'))); }
      else practice({ from: 'a', src: o[P.a], tx: o[P.b], dst: P.b }, P, view.querySelector('.ip-score')); void ft; };
  }

  // ---------- Lịch sử + tóm tắt từ mới ----------
  const when = ts => { try { return new Date(ts).toLocaleString(I().lang(), { dateStyle: 'medium', timeStyle: 'short' }); } catch (e) { return ''; } };
  function history() {
    const h = InterpretCore.load().convs;
    view.innerHTML = `<div class="ip">${head(icon('globe') + ' ' + t('Lịch sử phiên dịch'), '#/interpret')}${nav('history')}${h.length ? h.map(c => `<a class="card hover ip-conv" href="#/interpret/recap/${c.id}"><b>${esc(nameOf(c.a))} ⇄ ${esc(nameOf(c.b))}</b><small class="muted">${esc(when(c.t))} · ${t('{n} câu', { n: c.turns.length })}</small><span class="small">${esc((c.turns[0] || {}).src || '')}</span></a>`).join('') + `<button class="btn" id="ipClear">${t('Xóa lịch sử trên máy')}</button>` : `<div class="card"><p>${t('Chưa có cuộc hội thoại nào. Bắt đầu một phiên dịch đối mặt nhé!')}</p><a class="btn primary" href="#/interpret">${t('Bắt đầu')}</a></div>`}</div>`;
    const b = view.querySelector('#ipClear'); if (b) b.onclick = async () => { if (await UI.confirm(t('Xóa toàn bộ lịch sử phiên dịch trên máy này?'))) { InterpretCore.clear(); history(); } };
  }
  async function recap(id) {
    const c = InterpretCore.load().convs.find(x => x.id === id); if (!c) return history();
    const me = I().lang(), foreign = c.a === me ? c.b : c.a, cs = InterpretCore.cards(c, me), texts = cs.map(x => x.word);
    const known = new Set(Object.keys(App.state.cards || {})), kw = InterpretCore.keyWords(texts, foreign, 8, known);
    view.innerHTML = `<div class="ip">${head(icon('globe') + ' ' + t('Từ mới sau cuộc hội thoại'), '#/interpret/history')}
      <div class="card"><h2>${t('Câu đáng nhớ')}</h2>${cs.length ? cs.map((x, i) => `<div class="ip-rc"><span lang="${x.lang}"><b>${esc(x.word)}</b></span><small class="muted">${esc(x.def)}</small><button class="ip-act" data-i="${i}" aria-label="${t('Nghe')}">${icon('volume-2')}</button></div>`).join('') : `<p class="muted">${t('Cuộc này chưa có câu ngoại ngữ để học.')}</p>`}</div>
      ${kw.length ? `<div class="card"><h2>${t('Từ khóa')}</h2><div class="ip-kw" lang="${foreign}">${kw.map(w => `<span class="chip">${esc(w)}</span>`).join('')}</div></div>` : ''}
      <div class="row" style="gap:.6rem;flex-wrap:wrap">${cs.length ? `<button class="btn primary" id="ipAll">${icon('notebook-pen')} ${t('Lưu {n} câu vào Sổ từ', { n: cs.length })}</button>` : ''}<a class="btn" href="#/interpret">${t('Cuộc mới')}</a></div></div>`;
    view.onclick = async e => { const s = e.target.closest('.ip-act'); if (s) { const x = cs[+s.dataset.i]; return speak(x.word, x.lang); } if (e.target.closest('#ipAll')) { await saveCards(cs); toast(t('Đã lưu vào Sổ từ')); } };
  }

  routes.interpret = function (arg) {
    view.onclick = view.onchange = null; const [k, v] = String(arg || '').split('/');
    if (k === 'phrases') return phrases(v);
    if (k === 'history') return history();
    if (k === 'recap') return recap(v);
    return talk();
  };
})();
