/* Phát âm – "Nhịp câu & shadowing": thấy từ nhấn (to, đậm) và hư từ đọc dạng yếu (nhỏ, kèm IPA yếu theo giọng Anh/Mỹ – UI.WEAK, PR #178),
 * nghe mẫu thường / chậm, rồi shadowing: nghe → nói theo ngay → điểm tử tế + nghe lại giọng mình (thường / chậm 0,75×) xen kẽ giọng mẫu.
 * Nhận dạng: UI.recognize (ưu tiên trên máy – processLocally khi có; âm thanh ghi lại chỉ giữ trong RAM). Logic: pron/coach.js. */
(function (g) {
  const KEY = 'vb.pron.rhythm';
  const C = () => g.PronCoach;
  const esc = s => g.UI.esc(s), ic = n => g.UI.icon(n);
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { return {}; } };
  const save = d => { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) { /* bộ nhớ đầy / chế độ riêng tư */ } };
  const accent = () => { const a = g.App && App.state && App.state.settings && App.state.settings.accent; return a === 'en-US' ? 'en-US' : 'en-GB'; }; // cùng giọng với bài phát âm (pron.js)
  let localSR = null;
  const probe = () => localSR || (localSR = (async () => { try { const SR = g.SpeechRecognition || g.webkitSpeechRecognition; return !!(SR && SR.available && 'processLocally' in SR.prototype && await SR.available({ langs: ['en-US'], processLocally: true }) === 'available'); } catch (e) { return false; } })());

  function css() {
    if (document.getElementById('rhyCss')) return;
    const st = document.createElement('style'); st.id = 'rhyCss';
    st.textContent = `.rhy-s{display:flex;flex-wrap:wrap;gap:.25rem .5rem;align-items:flex-end;margin:.8rem 0;line-height:1.2}
.rhy-w{display:inline-flex;flex-direction:column;align-items:center}.rhy-w b{font-size:1.35rem}.rhy-w b::before{content:'●';display:block;font-size:.5rem;text-align:center;color:var(--primary)}
.rhy-w span{font-size:.95rem;color:var(--muted)}.rhy-w .ipa{font-size:.75rem;color:var(--primary)}
.rhy-pick{display:flex;gap:.35rem;flex-wrap:wrap}.rhy-pick button{min-width:44px;min-height:36px}`;
    document.head.appendChild(st);
  }

  // box: phần tử chứa · x: bài phát âm (skills.js) – chỉ các bài về nhịp/trọng âm/nối âm
  function mount(box, x) {
    if (!box || !C() || !g.UI) return;
    css();
    const S = C().SENTENCES, WEAK = g.UI.WEAK || {};
    let k = Math.max(0, S.findIndex((s, i) => !(load()[i] >= 85))), ctl = null, mine = null;
    const BAND = { great: () => t('Rất giống giọng mẫu – nhịp tự nhiên!'), close: () => t('Gần rồi! Nghe lại mẫu chậm rồi nói theo một lần nữa.'), again: () => t('Chưa sao – nghe chậm, nhấn đúng các từ to rồi thử lại nhé.') };
    const render = (res) => {
      const acc = accent(), it = S[k], pl = C().plan(it, acc, WEAK), d = load();
      box.innerHTML = `<div class="row between"><h3 style="margin:0">${ic('audio-lines')} ${t('Nhịp câu & shadowing')}</h3><span class="chip">${acc === 'en-US' ? t('Giọng Mỹ') : t('Giọng Anh')}</span></div>
        <p class="small muted">${t('Từ in to được nhấn; từ nhỏ đọc nhanh, nhẹ (dạng yếu). Nghe mẫu, rồi bấm Shadowing và nói theo ngay.')}</p>
        <div class="rhy-pick" role="group" aria-label="${t('Chọn câu')}">${S.map((s, i) => `<button type="button" class="btn sm ${i === k ? 'primary' : ''}" data-k="${i}" aria-pressed="${i === k}" title="${esc(s.s)}">${d[i] >= 85 ? '✓' : i + 1}</button>`).join('')}</div>
        <div class="rhy-s" lang="en" translate="no">${pl.map(p => p.stress ? `<span class="rhy-w"><b>${esc(p.w)}</b></span>` : `<span class="rhy-w"><span>${esc(p.w)}</span>${p.weak ? `<span class="ipa">${esc(p.weak)}</span>` : ''}</span>`).join('')}</div>
        <div class="row" style="gap:.5rem;flex-wrap:wrap"><button class="btn sm" id="rhyN">${ic('volume-2')} ${t('Nghe mẫu')}</button><button class="btn sm" id="rhyS">${ic('turtle')} ${t('Nghe chậm')}</button><button class="btn primary" id="rhyGo">${ic('mic')} ${t('Shadowing')}</button></div>
        <div id="rhyRes" role="status" aria-live="polite" style="margin-top:.7rem">${res || ''}</div>`;
      box.querySelectorAll('[data-k]').forEach(b => b.onclick = () => { stop(); k = +b.dataset.k; render(); });
      box.querySelector('#rhyN').onclick = () => g.UI.tts(it.s, acc);
      box.querySelector('#rhyS').onclick = () => g.UI.tts(it.s, acc, 0.6);
      box.querySelector('#rhyGo').onclick = () => shadow(it, acc);
      bindMine(it, acc);
    };
    const stop = () => { if (ctl && ctl.stop) try { ctl.stop(); } catch (e) { /* bỏ qua */ } ctl = null; };
    const bindMine = (it, acc) => {
      const a = box.querySelector('#rhyMine'), sl = box.querySelector('#rhyMineS'), ab = box.querySelector('#rhyAB');
      if (!mine) return;
      const au = new Audio(mine);
      if (a) a.onclick = () => { au.playbackRate = 1; au.currentTime = 0; au.play().catch(() => {}); };
      if (sl) sl.onclick = () => { au.playbackRate = 0.75; au.currentTime = 0; au.play().catch(() => {}); };
      if (ab) ab.onclick = () => { g.UI.tts(it.s, acc, undefined, { onEnd: () => { au.playbackRate = 1; au.currentTime = 0; au.play().catch(() => {}); } }); };
    };
    async function shadow(it, acc) {
      stop();
      const res = box.querySelector('#rhyRes'); res.textContent = t('Nghe mẫu…');
      const local = await probe();
      g.UI.tts(it.s, acc, 0.9, {
        onEnd: () => {
          if (!box.isConnected) return;
          res.innerHTML = `<b>${ic('mic')} ${t('Nói theo ngay bây giờ…')}</b>`;
          ctl = g.UI.recognize(it.s, acc, {
            setup: r => { if (local) r.processLocally = true; },
            result: ({ heard, alts, audio }) => {
              ctl = null; mine = audio || null;
              const sim = Math.max(0, ...(alts && alts.length ? alts : [heard]).map(a => g.UI.similarity(a, it.s)));
              const d = C().diff(heard, it.s, WEAK), sc = C().score(sim, d), b = C().band(sc), st = load();
              st[k] = Math.max(st[k] || 0, sc); save(st);
              if (g.App && App.reward && sc >= 65) App.reward({ spoken: 1, pron: 1, xp: sc >= 85 ? 4 : 2 });
              const tips = [];
              if (d.missingContent.length) tips.push(t('Nhấn rõ hơn các từ chính: {w}', { w: d.missingContent.join(', ') }));
              else if (d.missingWeak.length) tips.push(t('Máy nghe sót từ nhỏ: {w} – vẫn đọc nhẹ nhưng đừng bỏ hẳn.', { w: d.missingWeak.join(', ') }));
              const nx = C().next({ pairs: g.PronPairs, stats: g.PronPairs ? g.PronPairs.load() : {}, rhythm: load(), skill: x.id });
              const sug = nx.map(s => s.kind === 'rhythm' ? `<button type="button" class="btn sm" data-goto="${s.k}">${t('Câu {n}', { n: s.k + 1 })}</button>` : `<a class="btn sm" href="#/pron/${encodeURIComponent(s.skill || s.id)}">${esc(s.kind === 'pair' && g.PronPairs ? g.PronPairs.label(g.PronPairs.CONTRASTS.find(c => c.id === s.id)) : t('Bài liên quan'))}</a>`).join('');
              render(`<div class="feedback ${b === 'again' ? 'no' : 'ok'}" style="position:static"><b>${sc}/100 · ${esc(BAND[b]())}</b>
                <div class="small" lang="en" style="margin-top:.3rem">${t('Máy nghe được')}: “${esc(heard || '…')}”</div>${tips.map(x => `<div class="small">💡 ${esc(x)}</div>`).join('')}</div>
                <div class="row" style="gap:.5rem;flex-wrap:wrap;margin-top:.5rem">${mine ? `<button class="btn sm" id="rhyMine">${ic('headphones')} ${t('Nghe lại giọng bạn')}</button><button class="btn sm" id="rhyMineS">${ic('turtle')} ${t('Giọng bạn chậm')}</button><button class="btn sm" id="rhyAB">${ic('repeat')} ${t('Mẫu rồi giọng bạn')}</button>` : ''}</div>
                <div class="small muted" style="margin-top:.6rem">${t('Luyện tiếp:')}</div><div class="row" style="gap:.4rem;flex-wrap:wrap">${sug}</div>`);
              box.querySelectorAll('[data-goto]').forEach(bt => bt.onclick = () => { k = +bt.dataset.goto; mine = null; render(); });
            },
            error: code => { ctl = null; res.textContent = g.UI.recErrorText(code); },
            end: () => { ctl = null; },
          });
        },
      });
    }
    render();
    if (g.App && App.onCleanup) App.onCleanup(stop);
  }

  g.PronRhythm = { mount, load, KEY };
})(typeof self !== 'undefined' ? self : this);
