/* Phát âm – "Nói đuổi liên tục" (spec upgrade-2026-11 #8): nghe câu 1 → nói theo ngay → tự sang câu 2… hết cả đoạn 3 câu, không bấm giữa chừng,
 * rồi tô từng TỪ (✓ đúng · ✗ sót/sai · ~ yếu) và, khi máy có mô hình âm vị (window.Gop → Speak.score trả r.phones), nêu cả ÂM yếu của từ; không có mô hình thì chỉ mức từ.
 * Tải lười: gói 'shadow' (speak/score.js + file này) khi bấm nút trong pron/rhythm.js. Dùng lại: PronCoach (SENTENCES, band) · Speak.score/align (speak/score.js) · UI.tts. Âm thanh không rời máy.
 * Không mic (từ chối / không hỗ trợ / người học chọn): nghe và đọc theo, chạm "Đã nói theo" để sang câu kế – không chấm, không thưởng.
 * Phần thuần (test: scripts/test/pron-shadow.mjs): passages · mark · summary. */
(function (g) {
  const KEY = 'vb.pron.shadow', THR = 50, GAP = 500; // THR: âm có điểm < 50 bị coi là yếu
  const C = () => g.PronCoach;

  /** passages(SENTENCES) → [{ id, lv, sents:[câu] }] – 3 câu liên tiếp cùng danh sách với bài nhịp câu (không biên soạn trùng) */
  function passages(S) {
    const out = [];
    for (let i = 0; i < S.length; i += 3) { const ch = S.slice(i, i + 3); out.push({ id: i / 3, lv: ch[ch.length - 1].lv, sents: ch.map(x => x.s) }); }
    return out;
  }

  /** mark(words:[{w,ok}], phones?:[{w:chỉ số từ, p, score}]) → [{ w, st:'ok'|'miss'|'weak', ph:[âm yếu] }]
   *  miss = máy không nghe thấy từ đó theo thứ tự · weak = nghe được nhưng có âm điểm < THR (chỉ khi có mô hình âm vị) */
  function mark(words, phones) {
    const by = {};
    for (const f of Array.isArray(phones) ? phones : []) if (f && f.w >= 0 && f.score != null && f.score < THR && f.p) (by[f.w] = by[f.w] || []).push(String(f.p));
    return (words || []).map((x, i) => ({ w: x.w, st: !x.ok ? 'miss' : by[i] ? 'weak' : 'ok', ph: by[i] || [] }));
  }

  /** summary(rows:[mark…|null]) → { total, ok, miss, weak, score 0–100, band, worst:[từ cần luyện], heardN } – null = câu máy không nghe được (bỏ khỏi điểm) */
  function summary(rows) {
    const used = (rows || []).filter(Boolean), all = used.flat(), n = all.length, ok = all.filter(x => x.st === 'ok').length, weak = all.filter(x => x.st === 'weak').length;
    const score = n ? Math.round((ok + weak * 0.5) / n * 100) : 0, seen = new Set(), worst = [];
    for (const x of all) { const k = x.w.toLowerCase().replace(/[^a-z']/g, ''); if (x.st !== 'ok' && k && !seen.has(k)) { seen.add(k); worst.push(x.w.replace(/[^A-Za-z']/g, '')); } }
    return { total: n, ok, miss: all.length - ok - weak, weak, score, band: C() ? C().band(score) : 'again', worst, heardN: used.length };
  }

  const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { return {}; } };
  const save = d => { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) { /* bộ nhớ đầy / chế độ riêng tư */ } };
  const accent = () => { const a = g.App && App.state && App.state.settings && App.state.settings.accent; return a === 'en-US' ? 'en-US' : 'en-GB'; };
  const canMic = () => { const SR = g.SpeechRecognition || g.webkitSpeechRecognition; return !!(SR || (g.navigator && navigator.mediaDevices && g.MediaRecorder)); };
  const LBL = { ok: () => t('đúng'), miss: () => t('sót hoặc sai'), weak: () => t('âm yếu') }, MARK = { ok: '✓', miss: '✗', weak: '~' };

  function css() {
    if (document.getElementById('shdCss')) return;
    const st = document.createElement('style'); st.id = 'shdCss';
    st.textContent = `.shd-s{margin:.6rem 0;padding:.6rem .7rem;border:1px solid var(--line);border-radius:var(--radius-sm);background:var(--surface)}
.shd-s[aria-current=true]{border-color:var(--primary)}.shd-line{display:flex;flex-wrap:wrap;gap:.3rem .55rem;align-items:flex-start;font-size:1.1rem}
.shd-w{display:inline-flex;flex-direction:column;align-items:center;padding:0 .15rem}.shd-w i{font-style:normal;font-size:.8rem;font-weight:700}
.shd-w .ph{font-size:.75rem;color:var(--muted)}.shd-w.ok{color:var(--good-text)}.shd-w.miss{color:var(--again-text);text-decoration:underline wavy;text-underline-offset:4px}
.shd-w.weak{color:var(--text);text-decoration:underline dashed;text-underline-offset:4px}
.shd-bar{display:flex;gap:.5rem;flex-wrap:wrap;align-items:center}.shd-bar .btn{min-height:44px;min-width:44px}`;
    document.head.appendChild(st);
  }

  // box: phần tử chứa · x: bài phát âm (để lấy id gợi ý, không bắt buộc)
  function mount(box) {
    if (!box || !C() || !g.UI) return;
    css();
    const P = passages(C().SENTENCES), esc = s => g.UI.esc(s), ic = n => g.UI.icon(n), acc = accent();
    let k = Math.max(0, P.findIndex((p, i) => !(load()[i] >= 85))), run = 0, noMic = !canMic(), rows = [], cur = -1, phase = '', timer = 0, wake = null;
    const dev = () => !!(g.Gop && g.Gop.score);
    const stop = () => { run++; clearTimeout(timer); phase = ''; cur = -1; if (g.Speak && Speak.stop) Speak.stop(); if (wake) wake(); wake = null; if (g.speechSynthesis) try { speechSynthesis.cancel(); } catch (e) { /* bỏ qua */ } };

    const line = (r, i) => `<div class="shd-line" lang="en" translate="no">${r.map(x => `<span class="shd-w ${x.st}"><i aria-hidden="true">${MARK[x.st]}</i><span>${esc(x.w)}</span><span class="sr-only"> (${esc(LBL[x.st]())})</span>${x.ph.length ? `<span class="ph">${esc(x.ph.join(' '))}</span>` : ''}</span>`).join('')}</div>`;
    const plain = s => `<div class="shd-line" lang="en" translate="no">${esc(s)}</div>`;

    function render(done) {
      const p = P[k], sm = done ? summary(rows) : null, working = !!phase;
      box.innerHTML = `<div class="row between"><h3 style="margin:0">${ic('repeat')} ${t('Nói đuổi liên tục')}</h3><span class="chip">${noMic ? t('Không dùng mic') : dev() ? t('Chấm từng âm trên máy') : t('Chấm theo từng từ')}</span></div>
        <p class="small muted">${t('Nghe câu rồi nói theo ngay, máy tự sang câu kế – không cần bấm giữa chừng. Cuối đoạn, các từ sai được đánh dấu.')}</p>
        <div class="shd-bar" role="group" aria-label="${t('Chọn đoạn')}">${P.map((x, i) => `<button type="button" class="btn sm ${i === k ? 'primary' : ''}" data-k="${i}" aria-pressed="${i === k}" ${working ? 'disabled' : ''}>${load()[i] >= 85 ? '✓' : i + 1}</button>`).join('')}</div>
        <div id="shdList" aria-live="polite">${p.sents.map((s, i) => `<div class="shd-s" ${i === cur ? 'aria-current="true"' : ''}>${rows[i] ? line(rows[i], i) : plain(s)}</div>`).join('')}</div>
        <div id="shdMsg" role="status" aria-live="polite" class="small" style="margin:.4rem 0">${msg(sm)}</div>
        <div class="shd-bar">${working ? `<button type="button" class="btn" id="shdStop">${ic('x')} ${t('Dừng')}</button>`
          : `<button type="button" class="btn primary" id="shdGo">${ic(noMic ? 'headphones' : 'mic')} ${done ? t('Nói đuổi lại') : t('Bắt đầu nói đuổi')}</button>${canMic() ? `<button type="button" class="btn" id="shdMic">${noMic ? ic('mic') + ' ' + t('Dùng mic') : ic('circle-x') + ' ' + t('Không dùng mic')}</button>` : ''}`}</div>`;
      box.querySelectorAll('[data-k]').forEach(b => b.onclick = () => { stop(); k = +b.dataset.k; rows = []; render(); });
      const go = box.querySelector('#shdGo'), mc = box.querySelector('#shdMic'), sp = box.querySelector('#shdStop');
      if (go) go.onclick = start; if (sp) sp.onclick = () => { stop(); render(); };
      if (mc) mc.onclick = () => { noMic = !noMic; rows = []; render(); };
    }
    function msg(sm) {
      if (sm) {
        const b = { great: t('Rất tốt – bạn bắt kịp cả đoạn!'), close: t('Gần rồi! Nghe lại các từ đánh dấu rồi nói đuổi thêm một lần.'), again: t('Chưa sao – nghe chậm từng câu rồi thử lại nhé.') }[sm.band];
        if (!sm.heardN) return t('Chưa nghe rõ câu nào – kiểm tra mic rồi thử lại, bạn không bị trừ điểm.');
        return `<b>${sm.score}/100 · ${esc(b)}</b>${sm.worst.length ? `<div lang="en" translate="no">${t('Luyện thêm')}: ${esc(sm.worst.join(', '))}</div>` : ''}<div class="muted">✓ ${t('đúng')} · ✗ ${t('sót hoặc sai')} · ~ ${t('âm yếu')}</div>`;
      }
      if (phase === 'tts') return t('Nghe câu mẫu…');
      if (phase === 'mic') return `<b>${ic('mic')} ${t('Nói theo ngay bây giờ…')}</b>`;
      if (phase === 'self') return t('Đọc to theo, xong thì chạm “Đã nói theo”.');
      return noMic ? t('Không dùng mic: nghe và đọc to theo, không chấm điểm.') : t('Nhấn Bắt đầu: nghe rồi nói theo ngay, lần lượt 3 câu.');
    }

    async function start() {
      stop(); const my = run; rows = [];
      const p = P[k];
      for (let i = 0; i < p.sents.length; i++) {
        if (my !== run || !box.isConnected) return;
        cur = i; phase = 'tts'; render();
        await new Promise(res => { wake = res; g.UI.tts(p.sents[i], acc, 0.9, { onEnd: res }); timer = setTimeout(res, 15000); }); clearTimeout(timer); wake = null; // 15 s: máy không phát được tiếng vẫn đi tiếp
        if (my !== run || !box.isConnected) return;
        if (noMic || !g.Speak) { phase = 'self'; render(); await new Promise(res => { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn primary'; b.id = 'shdDone'; b.textContent = t('Đã nói theo'); box.querySelector('.shd-bar:last-child').prepend(b); wake = b.onclick = res; }); wake = null; if (my !== run) return; continue; }
        phase = 'mic'; render();
        const r = await Speak.score({ target: p.sents[i], mode: 'drill', accent: acc });
        if (my !== run || !box.isConnected) return;
        if (r.error === 'not-allowed' || r.error === 'unsupported' || r.error === 'service-not-allowed') { noMic = true; phase = ''; cur = -1; render(); box.querySelector('#shdMsg').textContent = t('Không dùng được mic – chuyển sang nghe và đọc theo.'); return; }
        rows[i] = r.unclear ? null : mark(r.words, r.phones);
        await new Promise(res => { wake = res; timer = setTimeout(res, GAP); }); wake = null;
      }
      if (my !== run) return;
      phase = ''; cur = -1;
      if (!noMic) {
        const sm = summary(rows), d = load(); if (sm.heardN) { d[k] = Math.max(d[k] || 0, sm.score); save(d); if (g.App && App.reward && sm.score >= 65) App.reward({ spoken: sm.heardN, pron: 1, xp: sm.score >= 85 ? 5 : 3 }); }
        render(true);
      } else render();
    }
    render();
    if (g.App && App.onCleanup) App.onCleanup(stop);
  }

  g.PronShadow = { mount, passages, mark, summary, KEY, THR };
})(typeof self !== 'undefined' ? self : this);
