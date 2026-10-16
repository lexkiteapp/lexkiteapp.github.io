/* Cụm từ & cấu trúc câu: bài mẫu có chú thích (cụm từ + nghĩa, từ nối, vai trò câu), Sổ cụm từ,
 * bôi đen bất kỳ đoạn nào trong app để lưu thành cụm kèm nghĩa, cách dùng và câu ví dụ. */
(function () {
  const { $, $$, esc, toast, modal, closeModal } = UI;
  const App = window.App;
  const { state, routes } = App;
  const view = App.view;

  // ---------- Hiển thị bài mẫu có chú thích ----------
  // [[cụm|nghĩa]]  {{từ nối}}  <<Nhãn vai trò>>
  const roleT = r => t(String(r).trim()); // Mở bài, Thân bài 1… → bản dịch tay (scripts/i18n-fixed.json)
  function renderAnnotated(text) {
    return text.split(/\n\s*\n/).map(p => {
      let h = esc(p.trim());
      // Vai trò ở đầu đoạn → nhãn phía trên đoạn; giữa đoạn → nhãn nhỏ trong dòng
      let head = '';
      h = h.replace(/^&lt;&lt;([^&]+?)&gt;&gt;\s*/, (m, r) => { head = `<div class="an-ptag"><span class="an-role" translate="no">${esc(roleT(r))}</span></div>`; return ''; });
      h = h.replace(/&lt;&lt;([^&]+?)&gt;&gt;\s*/g, (m, r) => `<span class="an-role an-inl" translate="no">${esc(roleT(r))}</span> `)
        .replace(/\[\[([^|\]]+)\|([^\]]+)\]\]/g, (m, en, vi) => `<span class="an-ch" data-ph="${en}" data-vi="${vi}" tabindex="0"><span class="an-en">${en}</span><span class="an-gl">${vi}</span></span>`)
        .replace(/\{\{([^}]+)\}\}/g, '<span class="an-lk">$1</span>');
      return head + '<p>' + h + '</p>';
    }).join('');
  }
  App.renderAnnotated = renderAnnotated;
  const plain = t => t.replace(/<<[^>]*>>/g, '').replace(/\[\[([^|\]]*)\|[^\]]*\]\]/g, '$1').replace(/\{\{([^}]*)\}\}/g, '$1');
  // Chữ "sạch" của một vùng: bỏ chú thích tiếng Việt, nhãn vai trò, nút bấm → không bị dính chữ hay lẫn Việt – Anh
  const NOISE = '.an-gl, .an-role, button, .ctxvi, .vi, .tiny, sup, [hidden], .kbd';
  const cleanText = node => { const c = node.cloneNode(true); if (c.querySelectorAll) c.querySelectorAll(NOISE).forEach(x => x.remove()); return (c.textContent || '').replace(/🔊/g, '').replace(/\s+/g, ' ').replace(/\s+([,.;:!?])/g, '$1').trim(); };
  const sentenceOf = (el) => {
    // câu chứa phần tử (để làm ngữ cảnh khi lưu)
    const p = el.closest('p'); if (!p) return '';
    const text = p.innerText.replace(/\n/g, ' ');
    const t = cleanText(p);
    const sents = t.match(/[^.!?]+[.!?]+/g) || [t];
    const ph = el.dataset.ph || el.textContent;
    return (sents.find(s => s.includes(ph)) || text).trim();
  };

  routes.model = function (id) {
    const m = (window.MODELS || []).find(x => x.id === id);
    if (!m) { view.innerHTML = `<div class="card empty"><div class="em">📄</div>${t('Chưa có bài mẫu này.')}</div>`; return; }
    const p2 = m.task === 2 ? (window.WRITE_PROMPTS || []).find(p => p.id === m.ref) : null;
    const d1 = m.task === 1 && App.task1 ? App.task1.SETS.find(x => x.id === m.ref) : null;
    const gl = m.task === 'gt' ? (window.GT_LETTERS || []).find(x => x.id === m.ref) : null; // IELTS General – viết thư
    const TYPE_VI = { line: t('Biểu đồ đường'), bar: t('Biểu đồ cột'), pie: t('Biểu đồ tròn'), table: t('Bảng số liệu'), process: t('Quy trình'), map: t('Bản đồ') };
    const kind = gl ? ({ formal: t('Trang trọng'), 'semi-formal': t('Bán trang trọng'), informal: t('Thân mật') })[gl.tone] || gl.tone : m.task === 1 ? (d1 ? TYPE_VI[d1.type] : 'Task 1') : (p2 ? p2.type : 'Task 2');
    const hl = state.settings.annot2 || 'ch lk role';
    const on = k => hl.split(' ').includes(k);
    const chunks = [...m.text.matchAll(/\[\[([^|\]]+)\|([^\]]+)\]\]/g)].map(x => ({ en: x[1], vi: x[2] }));
    const links = [...new Set([...m.text.matchAll(/\{\{([^}]+)\}\}/g)].map(x => x[1]))];
    const back = `#/${gl ? 'letters/' + m.ref : m.task === 1 ? 'task1/' + m.ref : 'write/' + m.ref}`;
    view.innerHTML = `
      <a href="${back}" class="small">← ${t('Về đề bài')}</a>
      <div class="md-head card">
        <div class="row between" style="align-items:flex-start">
          <div><div class="row" style="gap:.35rem"><span class="md-badge">${gl ? 'General · Task 1' : 'Writing Task ' + m.task}</span><span class="md-badge soft">${esc(kind)}</span><span class="md-badge band">Band ${esc(m.band)}</span></div>
            <h1 class="md-title">${t('Bài mẫu có phân tích')}</h1></div>
          <div class="row"><span class="chip">${t('{n} từ', { n: m.words })}</span><button class="btn sm" id="readM">🔊 ${t('Nghe bài')}</button><a class="btn sm ghost" href="${back}">✍️ ${t('Tự viết đề này')}</a></div>
        </div>
        <div class="md-prompt">${gl ? `<div class="small muted" style="margin-bottom:.4rem">${t('ĐỀ BÀI')}</div><div>${esc(gl.situation)}</div><ul style="margin:.4rem 0 0;padding-left:1.2rem">${gl.bullets.map(b => `<li>${esc(b)}</li>`).join('')}</ul>` : m.task === 1 ? `<div class="small muted" style="margin-bottom:.4rem">${t('ĐỀ BÀI')}</div><div>${esc(d1 ? d1.title : 'Task 1 · ' + m.ref)} Summarise the information by selecting and reporting the main features, and make comparisons where relevant.</div>${d1 ? `<details class="md-chart"><summary class="small">📊 ${t('Xem biểu đồ')}</summary><div class="t1chart">${App.task1.draw(d1)}</div></details>` : ''}`
          : `<div class="small muted" style="margin-bottom:.4rem">${t('ĐỀ BÀI')}</div><div>${esc(p2 ? p2.text : 'Task 2 · ' + m.ref)}</div>`}</div>
      </div>
      <div class="tabs" id="mTabs" style="margin:1rem 0">${[['read', `📄 ${t('Đọc bài mẫu')}`], ['vocab', `🧩 ${t('Điền cụm từ')}`], ['gram', `🛠️ ${t('Sửa lỗi ngữ pháp')}`], ['link', `🔗 ${t('Từ nối')}`], ['copy', `⌨️ ${t('Chép cả bài')}`], ['write', `✍️ ${t('Viết từ từ gốc')}`]].map(([k, l], i) => `<button class="${i ? '' : 'on'}" data-mt="${k}">${l}</button>`).join('')}</div>
      <div id="mPane" hidden></div>
      <div id="mRead" class="md-grid">
        <div>
          <div class="md-tools" id="anBar">
            ${[['ch', t('Cụm từ hay')], ['gl', t('Nghĩa dưới cụm')], ['lk', t('Từ nối')], ['role', t('Vai trò câu')]].map(([k, l]) => `<label class="md-sw"><input type="checkbox" data-an="${k}" ${on(k) ? 'checked' : ''}><span></span>${l}</label>`).join('')}
            <button class="btn sm ghost" id="hlMode" title="${t('Bôi đen chữ trong bài để tô màu – tự lưu')}">🖍 ${t('Tô sáng')}</button><button class="btn sm ghost" id="hlClear" title="${t('Xóa mọi chỗ tô sáng của bạn')}">↺</button>
          </div>
          <article class="card annot md-paper ${['ch', 'gl', 'lk', 'role'].filter(on).map(k => 'an-' + k).join(' ')}" id="annot">${renderAnnotated(m.text)}</article>
          <p class="tiny muted" style="margin-top:.5rem">💡 ${t('Di chuột / chạm vào cụm tô màu để xem nghĩa, bấm để lưu. Bôi đen bất kỳ chữ nào để tra nghĩa hoặc lưu cấu trúc của riêng bạn.')}</p>
        </div>
        <aside class="md-side">
          <div class="card">
            <div class="row between"><h3 style="margin:0">🧩 ${t('Cụm từ hay')} <span class="muted small">(${chunks.length})</span></h3><button class="btn sm primary" id="saveAll">${t('Lưu tất cả')}</button></div>
            <div class="md-list">${chunks.map((c, i) => `<div class="md-item"><div><b>${esc(c.en)}</b><div class="small muted">${esc(c.vi)}</div></div><button class="icon-btn sm" data-sv="${i}" title="${t('Lưu vào Sổ cụm từ')}">${App.inDeck(c.en) ? '✓' : '+'}</button></div>`).join('')}</div>
          </div>
          ${links.length ? `<div class="card" style="margin-top:1rem"><h3 style="margin:0 0 .5rem">🔗 ${t('Từ nối & liên kết')}</h3><div class="row">${links.map(l => `<span class="md-lchip">${esc(l)}</span>`).join('')}</div></div>` : ''}
        </aside>
      </div>
      ${m.band6 || m.outline || m.vocab ? `<div id="mExtra" class="grid g2" style="align-items:start;margin-top:1rem">
        ${m.outline ? `<div class="card" style="margin:0"><h3 style="margin-top:0">🧭 ${t('Dàn ý')}</h3><ol class="small" style="margin:0;padding-left:1.3rem;line-height:1.7">${m.outline.map(o => `<li>${esc(o)}</li>`).join('')}</ol></div>` : ''}
        ${m.vocab ? `<div class="card" style="margin:0"><h3 style="margin-top:0">🔤 ${t('Từ vựng chủ đề')}</h3><div class="md-list">${m.vocab.map(([en, vi]) => `<div class="md-item"><div><b>${esc(en)}</b><div class="small muted">${esc(vi)}</div></div></div>`).join('')}</div></div>` : ''}
        ${m.band6 ? `<details class="card" style="margin:0;grid-column:1/-1"><summary style="cursor:pointer;font-weight:700">📉 ${t('Bài band 6 để so sánh')} <span class="md-badge band">Band 6.0</span></summary>
          <div style="white-space:pre-wrap;line-height:1.7;margin-top:.8rem">${esc(m.band6.text)}</div>
          <h4 style="margin:1rem 0 .4rem">🔍 ${t('Vì sao chỉ đạt band 6')}</h4>
          ${[['TR', 'Task Response'], ['CC', 'Coherence & Cohesion'], ['LR', 'Lexical Resource'], ['GRA', 'Grammatical Range & Accuracy']].filter(([k]) => m.band6.notes && m.band6.notes[k]).map(([k, n]) => `<div class="tip small" style="margin:.4rem 0"><b>${k} · ${n}:</b> ${esc(m.band6.notes[k])}</div>`).join('')}</details>` : ''}
      </div>` : ''}`;
    $$('[data-sv]').forEach(b => b.onclick = async () => {
      const c = chunks[+b.dataset.sv]; if (App.inDeck(c.en)) return;
      const sent = (plain(m.text).match(/[^.!?]+[.!?]+/g) || []).find(s => s.includes(c.en)) || '';
      await App.addWord({ word: c.en, vi: c.vi, pos: 'phrase', ex: sent.trim(), emoji: '🧩', topic: 'phrases' }, sent ? { text: sent.trim(), title: t('Bài mẫu Task {n}', { n: m.task }) } : null, { silent: true });
      b.textContent = '✓'; Sfx.correct();
    });
    Core.Store.get('mdone:' + m.id, []).then(markDone);
    $$('#mTabs button').forEach(b => b.onclick = () => {
      $$('#mTabs button').forEach(x => x.classList.toggle('on', x === b));
      const k = b.dataset.mt; $('#mRead').hidden = k !== 'read'; $('#mPane').hidden = k === 'read'; if ($('#mExtra')) $('#mExtra').hidden = k !== 'read';
      if (k !== 'read') EX[k](m, $('#mPane'));
    });
    $$('[data-an]').forEach(b => b.onchange = () => {
      $('#annot').classList.toggle('an-' + b.dataset.an, b.checked);
      state.settings.annot2 = $$('[data-an]:checked').map(x => x.dataset.an).join(' '); App.saveSettings();
    });
    $('#annot').addEventListener('click', e => {
      if ($('#annot').classList.contains('hl-mode') || String(getSelection()).trim()) return; // đang tô sáng / bôi đen → để thanh công cụ xử lý
      const ch = e.target.closest('.an-ch, .an-lk'); if (!ch) return;
      const phrase = ch.dataset.ph || ch.textContent.trim();
      phrasePop(ch, { phrase, vi: I18N.learnLang() === 'vi' ? ch.dataset.vi || '' : '', sentence: sentenceOf(ch), title: t('Bài mẫu Task {n}', { n: m.task }) });
    });
    $('#saveAll').onclick = async () => {
      const ps = [...m.text.matchAll(/\[\[([^|\]]+)\|([^\]]+)\]\]/g)];
      let n = 0;
      for (const [, en, vi] of ps) if (!App.inDeck(en)) {
        const sent = (plain(m.text).match(/[^.!?]+[.!?]+/g) || []).find(s => s.includes(en)) || '';
        await App.addWord({ word: en, vi, pos: 'phrase', ex: sent.trim(), emoji: '🧩', topic: 'phrases' }, sent ? { text: sent.trim(), title: t('Bài mẫu Task {n}', { n: m.task }) } : null, { silent: true }); n++;
      }
      Sfx.win(); toast(t('Đã lưu {n} cụm từ vào Sổ cụm từ', { n })); $('#saveAll').disabled = true;
    };
    // Tô sáng tự do (lưu theo từng bài mẫu, chỉ trên máy)
    const hlKey = 'uhl:' + m.id, hlVer = String(m.text.length);
    Core.Store.get(hlKey, null).then(sv => { if (sv && sv.v === hlVer && $('#annot')) $('#annot').innerHTML = sv.h; });
    let hlOn = false;
    $('#hlMode').onclick = () => { hlOn = !hlOn; $('#hlMode').classList.toggle('primary', hlOn); $('#annot').classList.toggle('hl-mode', hlOn); toast(hlOn ? `🖍 ${t('Bôi đen chữ trong bài để tô sáng')}` : t('Đã tắt tô sáng')); };
    $('#hlClear').onclick = async () => { await Core.Store.remove(hlKey); $('#annot').innerHTML = renderAnnotated(m.text); toast(t('Đã xóa tô sáng')); };
    $('#annot').addEventListener('mouseup', () => setTimeout(async () => {
      if (!hlOn) return; const sel = getSelection(); if (!sel.rangeCount || sel.isCollapsed || !$('#annot').contains(sel.anchorNode)) return;
      const r = sel.getRangeAt(0), mk = document.createElement('mark'); mk.className = 'uhl';
      try { r.surroundContents(mk); } catch (e) { mk.appendChild(r.extractContents()); r.insertNode(mk); }
      sel.removeAllRanges(); await Core.Store.set(hlKey, { v: hlVer, h: $('#annot').innerHTML });
    }, 10));
    let reading = false;
    $('#readM').onclick = () => { if (reading) { UI.stopSpeak(); reading = false; return; } reading = true; UI.tts(plain(m.text), state.settings.accent, null, { onEnd: () => { reading = false; } }); };
  };


  // ================= BÀI TẬP SINH TỰ ĐỘNG TỪ BÀI MẪU =================
  const paras = t => t.split(/\n\s*\n/);
  const stripRole = p => p.replace(/<<[^>]*>>\s*/g, '');
  const roleOf = p => (p.match(/<<([^>]*)>>/) || [])[1] || '';
  const norm = x => x.toLowerCase().replace(/[’']/g, "'").replace(/[^a-z0-9' ]/g, ' ').replace(/\s+/g, ' ').trim();
  // ✓ trên các chế độ luyện đã đạt ≥ 70% (lưu theo từng bài mẫu)
  function markDone(d) { document.querySelectorAll('#mTabs button[data-mt]').forEach(b => { const ok = d.includes(b.dataset.mt); b.classList.toggle('done', ok); if (ok && !b.querySelector('.mdone')) b.insertAdjacentHTML('beforeend', ' <span class="mdone" aria-label="' + t('Đã hoàn thành') + '">✓</span>'); }); }
  function finish(m, kind, right, total, box) {
    const pct = Math.round(right / Math.max(1, total) * 100);
    if (pct >= 70) Core.Store.get('mdone:' + m.id, []).then(d => { if (!d.includes(kind)) { d.push(kind); Core.Store.set('mdone:' + m.id, d); } markDone(d); });
    App.reward({ quizzes: 1, perfect: pct === 100 ? 1 : 0, xp: 5 + right * 2 }); pct >= 80 ? (Sfx.win(), confetti(80)) : Sfx.correct();
    const tabs = [...document.querySelectorAll('#mTabs button[data-mt]')], cur = tabs.findIndex(b => b.dataset.mt === kind), nx = tabs[cur + 1];
    box.insertAdjacentHTML('beforeend', `<div class="feedback ${pct >= 70 ? 'ok' : 'no'}" style="position:static;margin-top:1rem"><b>${t('{right}/{total} đúng ({pct}%)', { right, total, pct })}</b> · +${5 + right * 2} XP${pct >= 70 && nx ? ` <button class="btn sm primary" id="mNext" style="margin-left:.6rem">${t('Chế độ tiếp theo')} → ${esc(nx.textContent.replace(/✓/g, '').trim())}</button>` : ''}</div>`);
    const nb = box.querySelector('#mNext'); if (nb) nb.onclick = () => { nx.click(); nx.scrollIntoView({ behavior: 'smooth', block: 'center' }); };
  }
  // Ô điền + ngân hàng từ (dùng cho từ vựng & liên kết)
  function gapExercise(m, box, kind) {
    const re = kind === 'vocab' ? /\[\[([^|\]]+)\|[^\]]+\]\]/g : /\{\{([^}]+)\}\}/g;
    const answers = [];
    const html = paras(m.text).map(p => '<p>' + esc(stripRole(p)).replace(kind === 'vocab' ? /\[\[([^|\]]+)\|([^\]]+)\]\]/g : /\{\{([^}]+)\}\}/g, (x, a, vi) => { const raw = a.replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&'); const i = answers.push(raw) - 1; return `<input class="gap" data-i="${i}" size="${Math.max(6, raw.length)}" autocomplete="off" spellcheck="false">${kind === 'vocab' && vi ? `<span class="gap-vi" data-gi="${i}">${I18N.learnLang() === 'vi' ? vi : '…'}</span>` : ''}`; })
      .replace(kind === 'vocab' ? /\{\{([^}]+)\}\}/g : /\[\[([^|\]]+)\|[^\]]+\]\]/g, '$1') + '</p>').join('');
    const bank = UI.shuffle([...new Set(answers)]);
    box.innerHTML = `<div class="card"><p class="small muted">${kind === 'vocab' ? t('Điền các <b>cụm từ</b> vào chỗ trống. Bấm vào cụm trong ngân hàng để điền vào ô đang chọn.') : t('Điền <b>từ nối / cụm liên kết</b> phù hợp vào chỗ trống.')}</p>
      ${kind === 'vocab' ? `<label class="md-sw" style="margin:.2rem 0 .6rem"><input type="checkbox" id="viHint" checked><span></span>${t('Hiện gợi ý nghĩa cạnh ô trống')}</label>` : ''}
      <div class="bank">${bank.map(w => `<button class="chip bankw" style="border:2px solid var(--line);cursor:pointer">${esc(w)}</button>`).join('')}</div>
      <div class="annot" style="font-size:1rem;line-height:2.3;margin-top:1rem">${html}</div>
      <div class="row" style="margin-top:1rem"><button class="btn primary" id="chk">${t('Kiểm tra')}</button><button class="btn" id="show">${t('Xem đáp án')}</button><button class="btn ghost" id="clr">${t('Xóa hết')}</button></div></div>`;
    const vh = $('#viHint', box); if (vh) vh.onchange = () => box.classList.toggle('no-vi', !vh.checked);
    if (kind === 'vocab' && I18N.learnLang() !== 'vi') { // không bao giờ hiện gợi ý tiếng Việt cho người học ngôn ngữ khác
      const L = I18N.learnLang(), spans = [...box.querySelectorAll('.gap-vi[data-gi]')];
      const fill = arr => spans.forEach(sp => { const v = arr[+sp.dataset.gi]; sp.textContent = v || ''; sp.hidden = !v; });
      if (L === 'en') fill([]); else {
        const pre = answers.map(a => (App.nativeGloss && App.nativeGloss(a)) || '');
        const miss = answers.map((a, k) => (pre[k] ? null : a)).filter(Boolean);
        (miss.length ? Dict.translateTo(miss.join('\n'), L).catch(() => '') : Promise.resolve('')).then(r => { const tr = String(r || '').split('\n'); let j = 0; fill(pre.map(v => v || (tr[j++] || '').trim())); });
      }
    }
    let focus = box.querySelector('.gap');
    $$('.gap', box).forEach(g => g.onfocus = () => { focus = g; });
    // Mờ các cụm đã dùng trong ngân hàng
    const syncBank = () => { const used = new Set($$('.gap', box).map(g => norm(g.value)).filter(Boolean)); $$('.bankw', box).forEach(b => b.classList.toggle('used', used.has(norm(b.textContent)))); };
    $$('.gap', box).forEach(g => g.addEventListener('input', syncBank));
    $$('.bankw', box).forEach(b => b.onclick = () => { if (!focus) return; focus.value = b.textContent; focus.classList.remove('ok', 'no'); syncBank(); const nx = [...box.querySelectorAll('.gap')].find(x => !x.value); if (nx) nx.focus(); });
    $('#chk', box).onclick = () => { let r = 0; $$('.gap', box).forEach(g => { const ok = norm(g.value) === norm(answers[+g.dataset.i]); g.classList.toggle('ok', ok); g.classList.toggle('no', !ok); if (ok) r++; }); finish(m, kind, r, answers.length, box.firstElementChild); };
    $('#show', box).onclick = () => $$('.gap', box).forEach(g => { g.value = answers[+g.dataset.i]; g.classList.remove('no'); }) || syncBank();
    $('#clr', box).onclick = () => $$('.gap', box).forEach(g => { g.value = ''; g.className = 'gap'; }) || syncBank();
  }
  // Luyện ngữ pháp: chọn dạng đúng của từ tại các vị trí trong bài
  const FORMS = [['rise', 'rose', 'risen', 'rising', 'rises'], ['fall', 'fell', 'fallen', 'falling', 'falls'], ['increase', 'increased', 'increasing', 'increases'], ['decrease', 'decreased', 'decreasing', 'decreases'], ['decline', 'declined', 'declining', 'declines'], ['grow', 'grew', 'grown', 'growing', 'grows'], ['remain', 'remained', 'remaining', 'remains'], ['show', 'shows', 'showed', 'shown'], ['see', 'saw', 'seen', 'sees'], ['have', 'has', 'had', 'having'], ['is', 'are', 'was', 'were', 'be', 'been'], ['reach', 'reached', 'reaches', 'reaching'], ['become', 'became', 'becomes', 'becoming'], ['spend', 'spent', 'spends', 'spending'], ['lead', 'led', 'leads', 'leading'], ['make', 'made', 'makes', 'making'], ['take', 'took', 'taken', 'takes', 'taking'], ['give', 'gave', 'given', 'gives'], ['believe', 'believes', 'believed', 'believing'], ['argue', 'argues', 'argued', 'arguing'], ['provide', 'provides', 'provided', 'providing'], ['encourage', 'encourages', 'encouraged', 'encouraging'], ['reduce', 'reduces', 'reduced', 'reducing'], ['country', 'countries'], ['student', 'students'], ['household', 'households'], ['figure', 'figures'], ['people', 'person'], ['a', 'an', 'the'], ['much', 'many'], ['less', 'fewer'], ['high', 'higher', 'highest'], ['low', 'lower', 'lowest'], ['large', 'larger', 'largest'], ['significant', 'significantly'], ['dramatic', 'dramatically'], ['steady', 'steadily'], ['sharp', 'sharply'], ['slight', 'slightly']];
  const formOf = w => FORMS.find(f => f.includes(w.toLowerCase()));
  function gramExercise(m, box) {
    const text = paras(plain(m.text)).join('\n\n');
    let picked = 0; const answers = [];
    const html = text.split(/\n\n/).map(p => '<p>' + p.split(/(\s+)/).map(tok => {
      const mm = tok.match(/^([^A-Za-z]*)([A-Za-z]+)([^A-Za-z]*)$/);
      const f = mm && formOf(mm[2]);
      if (!f || picked >= 12 || Math.random() < 0.45) return esc(tok);
      picked++; const i = answers.push(mm[2]) - 1;
      const opts = UI.shuffle(f.slice()).map(o => mm[2][0] === mm[2][0].toUpperCase() ? o[0].toUpperCase() + o.slice(1) : o);
      return `${esc(mm[1])}<select class="gap gsel" data-i="${i}"><option value="">…</option>${opts.map(o => `<option>${esc(o)}</option>`).join('')}</select>${esc(mm[3])}`;
    }).join('') + '</p>').join('');
    box.innerHTML = `<div class="card"><p class="small muted">${t('Chọn <b>dạng đúng</b> của từ ở mỗi ô (thì, số ít/số nhiều, so sánh, tính từ/trạng từ, mạo từ) cho phù hợp ngữ pháp.')}</p>
      <div class="annot" style="font-size:1rem;line-height:2.4">${html}</div>
      <div class="row" style="margin-top:1rem"><button class="btn primary" id="chk">${t('Kiểm tra')}</button><button class="btn" id="redo">🔀 ${t('Đổi vị trí khác')}</button></div></div>`;
    $('#chk', box).onclick = () => { let r = 0; $$('.gsel', box).forEach(g => { const ok = g.value.toLowerCase() === answers[+g.dataset.i].toLowerCase(); g.classList.toggle('ok', ok); g.classList.toggle('no', !ok); if (ok) r++; else g.title = t('Đáp án: {ans}', { ans: answers[+g.dataset.i] }); }); finish(m, 'gram', r, answers.length, box.firstElementChild); };
    $('#redo', box).onclick = () => gramExercise(m, box);
  }
  // Chép câu: chỉ hiện chữ cái đầu, gõ lại cả câu từ trí nhớ
  const sentencesOf = m => paras(m.text).flatMap(p => { const role = roleOf(p); return (plain(stripRole(p)).match(/[^.!?]+[.!?]+/g) || []).map((s, i) => ({ s: s.trim(), role: i === 0 ? role : '' })); });
  const hint = s => s.split(/\s+/).map(w => w.replace(/^([^A-Za-z]*)([A-Za-z])[A-Za-z'’-]*/, '$1$2…')).join(' ');
  function diffHtml(a, b) {
    // tô màu từ sai/thiếu so với câu mẫu
    const A = norm(a).split(' '), B = b.split(/\s+/);
    return B.map(w => A.includes(norm(w).split(' ')[0]) ? `<span style="color:var(--good)">${esc(w)}</span>` : `<b style="color:var(--again)">${esc(w)}</b>`).join(' ');
  }
  function lineExercise(m, box, mode) {
    const sents = sentencesOf(m);
    box.innerHTML = `<div class="card"><p class="small muted">${mode === 'copy' ? t('Mỗi câu chỉ hiện <b>chữ cái đầu</b> của từng từ. Nhớ lại và gõ cả câu – luyện ghi nhớ cấu trúc câu band 8.') : t('Dịch <b>câu tiếng Việt</b> sang tiếng Anh theo cách diễn đạt học thuật, rồi so với bài mẫu.')}</p>
      <div id="lines">${sents.map((x, i) => `<div class="line" data-i="${i}">${x.role ? `<span class="an-role" translate="no" style="display:inline-block;background:#16a34a;color:#fff;border-radius:6px;padding:.05rem .5rem;font-size:.75rem;font-weight:700">${esc(x.role)}</span> ` : ''}<span class="lhint">${mode === 'copy' ? esc(hint(x.s)) : `<i class="muted">⏳ ${t('đang dịch…')}</i>`}</span>
        <textarea class="input lin" rows="2" placeholder="${t('Gõ câu tiếng Anh…')}" spellcheck="false"></textarea><div class="lres small"></div></div>`).join('')}</div>
      <div class="row" style="margin-top:1rem"><button class="btn primary" id="chk">${t('Kiểm tra tất cả')}</button><button class="btn" id="show">${t('Xem bài mẫu')}</button></div></div>`;
    if (mode === 'write') {
      const L = (I18N && I18N.lang && I18N.lang()) || 'vi';
      const flg = (I18N && I18N.flag ? I18N.flag(L) : (L === 'vi' ? '🇻🇳' : '🌐'));
      sents.forEach(async (x, i) => {
        const v = L === 'vi' ? await Dict.translateVi(x.s) : await Dict.translateTo(x.s, L);
        const el = box.querySelector(`.line[data-i="${i}"] .lhint`);
        if (el) el.innerHTML = `${flg} <b>${esc(v || t('(không dịch được)'))}</b>`;
      });
    }
    $('#chk', box).onclick = () => {
      let r = 0;
      $$('.line', box).forEach(l => {
        const s = sents[+l.dataset.i].s, v = l.querySelector('.lin').value.trim();
        if (!v) return;
        const sc = Math.round(UI.similarity(norm(v), norm(s)) * 100);
        if (sc >= (mode === 'copy' ? 90 : 60)) r++;
        l.querySelector('.lres').innerHTML = `<b style="color:${sc >= 85 ? 'var(--good)' : sc >= 60 ? 'var(--hard)' : 'var(--again)'}">${t('{n}% giống bài mẫu', { n: sc })}</b> · ${diffHtml(v, s)}`;
      });
      finish(m, mode, r, sents.length, box.firstElementChild);
    };
    $('#show', box).onclick = () => $$('.line', box).forEach(l => { l.querySelector('.lres').innerHTML = `<span class="muted">${t('Bài mẫu:')}</span> ${esc(sents[+l.dataset.i].s)}`; });
  }
  // ================= Dạng bài kiểu Study4: sửa lỗi sai · chép cả bài · viết câu từ “từ gốc” =================
  // Bảng động từ bất quy tắc: gốc quá-khứ phân-từ-II (dùng để đưa về từ gốc và tạo lỗi sai thì)
  const IRR = 'arise arose arisen|be was been|bear bore born|beat beat beaten|become became become|begin began begun|bend bent bent|bind bound bound|bite bit bitten|blow blew blown|break broke broken|breed bred bred|bring brought brought|build built built|burn burnt burnt|buy bought bought|catch caught caught|choose chose chosen|come came come|cost cost cost|cut cut cut|deal dealt dealt|dig dug dug|do did done|draw drew drawn|drink drank drunk|drive drove driven|eat ate eaten|fall fell fallen|feed fed fed|feel felt felt|fight fought fought|find found found|fly flew flown|forget forgot forgotten|forgive forgave forgiven|freeze froze frozen|get got got|give gave given|go went gone|grow grew grown|hang hung hung|have had had|hear heard heard|hide hid hidden|hit hit hit|hold held held|hurt hurt hurt|keep kept kept|know knew known|lead led led|learn learnt learnt|leave left left|lend lent lent|let let let|lose lost lost|make made made|mean meant meant|meet met met|pay paid paid|put put put|quit quit quit|read read read|ride rode ridden|ring rang rung|rise rose risen|run ran run|say said said|see saw seen|seek sought sought|sell sold sold|send sent sent|set set set|shake shook shaken|shine shone shone|shoot shot shot|show showed shown|shrink shrank shrunk|shut shut shut|sing sang sung|sink sank sunk|sit sat sat|sleep slept slept|slide slid slid|speak spoke spoken|spend spent spent|split split split|spread spread spread|stand stood stood|steal stole stolen|stick stuck stuck|strike struck struck|swim swam swum|take took taken|teach taught taught|tear tore torn|tell told told|think thought thought|throw threw thrown|understand understood understood|wake woke woken|wear wore worn|win won won|write wrote written|overtake overtook overtaken|undergo underwent undergone|withdraw withdrew withdrawn|rebuild rebuilt rebuilt|outgrow outgrew outgrown';
  const PAST = {}, PP = {}, BASE = {};
  IRR.split('|').forEach(x => { const [b, p2, pp] = x.split(' '); PAST[b] = p2; PP[b] = pp; if (p2 !== b) BASE[p2] = b; if (pp !== b) BASE[pp] = b; });
  Object.assign(BASE, { is: 'be', are: 'be', am: 'be', was: 'be', were: 'be', been: 'be', being: 'be', has: 'have', had: 'have', having: 'have', does: 'do', did: 'do', done: 'do', better: 'good', best: 'good', worse: 'bad', worst: 'bad', further: 'far', farther: 'far', children: 'child', men: 'man', women: 'woman', people: 'people', feet: 'foot', teeth: 'tooth', its: 'its', this: 'this', thus: 'thus', news: 'news', series: 'series', species: 'species', means: 'means', analysis: 'analysis' });
  const KNOWN = w => !!IELTS_DATA.INDEX[w];
  const KEEP = new Set('as was has is his its this thus us yes less unless across perhaps whereas always sometimes nevertheless upon bus gas status focus plus process business analysis basis crisis'.split(' '));
  // Đưa một từ về dạng gốc (từ điển): số nhiều → số ít, quá khứ/phân từ → nguyên mẫu, so sánh → tính từ gốc
  function lemma(w) {
    const l = w.toLowerCase();
    if (BASE[l]) return BASE[l];
    if (KEEP.has(l) || l.length < 4 || KNOWN(l) && !/(ies|es|s|ed|ing|er|est)$/.test(l)) return l;
    const tryB = arr => arr.find(x => x && KNOWN(x));
    let b;
    if (/ies$/.test(l)) b = tryB([l.slice(0, -3) + 'y']);
    if (!b && /ves$/.test(l)) b = tryB([l.slice(0, -3) + 'f', l.slice(0, -3) + 'fe']);
    if (!b && /(ss|x|z|ch|sh|o)es$/.test(l)) b = tryB([l.slice(0, -2)]);
    if (!b && /[^s]s$/.test(l)) b = tryB([l.slice(0, -1)]);
    if (!b && /ied$/.test(l)) b = tryB([l.slice(0, -3) + 'y']);
    if (!b && /ed$/.test(l)) b = tryB([l.slice(0, -1), l.slice(0, -2), /(.)\1ed$/.test(l) && l.slice(0, -3)]);
    if (!b && /ing$/.test(l)) b = tryB([l.slice(0, -3), l.slice(0, -3) + 'e', /(.)\1ing$/.test(l) && l.slice(0, -4)]);
    if (!b && /iest$/.test(l)) b = tryB([l.slice(0, -4) + 'y']);
    if (!b && /est$/.test(l)) b = tryB([l.slice(0, -3), l.slice(0, -2), /(.)\1est$/.test(l) && l.slice(0, -4)]);
    if (!b && /ier$/.test(l)) b = tryB([l.slice(0, -3) + 'y']);
    if (!b && /er$/.test(l) && !KNOWN(l)) b = tryB([l.slice(0, -2), l.slice(0, -1), /(.)\1er$/.test(l) && l.slice(0, -3)]);
    return b || l;
  }
  const tokens = str => str.match(/[A-Za-z][A-Za-z'’-]*|\d+(?:[.,]\d+)*%?|[^\sA-Za-z\d]/g) || [];

  // 2) Sửa lỗi sai: app tự “gài” lỗi thật vào bài mẫu, người học sửa lại
  function errExercise(m, box) {
    const text = paras(plain(stripRole(m.text))).join('\n\n');
    const cand = [];
    const toks = text.split(/(\s+)/);
    toks.forEach((tok, i) => {
      const mm = tok.match(/^([^A-Za-z]*)([A-Za-z]+)([^A-Za-z]*)$/); if (!mm) return;
      const w = mm[2], l = w.toLowerCase(), e = IELTS_DATA.INDEX[lemma(l)];
      let wrong = null, why = '';
      if (/^(the|a|an)$/.test(l) && Math.random() < .5) { wrong = ''; why = t('Thiếu mạo từ'); }
      else if (BASE[l] && PAST[BASE[l]] === l && !/^(was|were|had|did)$/.test(l)) { wrong = BASE[l]; why = t('Sai thì (cần quá khứ)'); }
      else if (/^(was|were)$/.test(l)) { wrong = l === 'was' ? 'were' : 'was'; why = t('Sai hòa hợp chủ – vị'); }
      else if (/ed$/.test(l) && lemma(l) !== l && e && /v/.test(e.pos || 'v')) { wrong = lemma(l); why = t('Sai thì / thiếu -ed'); }
      else if (/ly$/.test(l) && KNOWN(l.slice(0, -2)) && l.length > 5) { wrong = l.replace(/ily$/, 'y').replace(/ally$/, 'al').replace(/ly$/, ''); if (!KNOWN(wrong)) wrong = null; else why = t('Cần trạng từ (-ly)'); }
      else if (/[^s]s$/.test(l) && lemma(l) !== l && e && /^n/.test(e.pos || '')) { wrong = lemma(l); why = t('Danh từ số nhiều'); }
      else if (/(er|est)$/.test(l) && lemma(l) !== l && !KNOWN(l)) { wrong = lemma(l); why = t('Thiếu so sánh hơn/nhất'); }
      if (wrong != null && wrong !== l) cand.push({ i, pre: mm[1], post: mm[3], ans: w, wrong: w[0] === w[0].toUpperCase() && wrong ? wrong[0].toUpperCase() + wrong.slice(1) : wrong, why });
    });
    // chọn tối đa 12 lỗi, rải đều, không sát nhau
    const pick = []; UI.shuffle(cand).forEach(c => { if (pick.length < 12 && !pick.some(p2 => Math.abs(p2.i - c.i) < 6)) pick.push(c); });
    if (pick.length < 5) return gramExercise(m, box);
    const at = new Map(pick.map((c, k) => [c.i, { ...c, k }]));
    const html = toks.map((tok, i) => { const c = at.get(i); if (!c) return tok === '\n\n' ? '</p><p>' : /\n\n/.test(tok) ? '</p><p>' : esc(tok);
      return c.wrong === '' ? `${esc(c.pre)}<input class="gap err-miss" data-k="${c.k}" size="4" placeholder="+" autocomplete="off" spellcheck="false">${esc(c.post)} ` + esc(c.post ? '' : '')
        : `${esc(c.pre)}<u class="err-w">${esc(c.wrong)}</u><input class="gap" data-k="${c.k}" size="${Math.max(5, c.ans.length)}" autocomplete="off" spellcheck="false">${esc(c.post)}`; }).join('');
    box.innerHTML = `<div class="card"><p class="small muted">${t('Bài mẫu đã bị <b>gài {n} lỗi ngữ pháp</b>. Từ <u class="err-w">gạch chân</u> có thể sai dạng – gõ dạng đúng vào ô bên cạnh; ô trống không gạch chân là chỗ <b>thiếu từ</b> (thường là mạo từ).', { n: pick.length })}</p>
      <div class="annot" style="font-size:1rem;line-height:2.4"><p>${html}</p></div>
      <div class="row" style="margin-top:1rem"><button class="btn primary" id="chk">${t('Kiểm tra')}</button><button class="btn" id="show">${t('Đáp án')}</button><button class="btn ghost" id="redo">🔀 ${t('Bộ lỗi khác')}</button></div></div>`;
    const ans = k => pick[k];
    $('#chk', box).onclick = () => { let r = 0; $$('.gap', box).forEach(g => { const c = ans(+g.dataset.k), ok = norm(g.value) === norm(c.ans); g.classList.toggle('ok', ok); g.classList.toggle('no', !ok); g.title = ok ? '' : `${c.why}: ${c.ans}`; if (ok) r++; }); finish(m, 'gram', r, pick.length, box.firstElementChild); };
    $('#show', box).onclick = () => $$('.gap', box).forEach(g => { const c = ans(+g.dataset.k); g.value = c.ans; g.classList.remove('no'); g.title = c.why; });
    $('#redo', box).onclick = () => errExercise(m, box);
    $$('.gap', box).forEach((g, k, arr) => g.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); (arr[k + 1] || $('#chk', box)).focus(); } }));
  }

  // 3) Chép cả bài: mỗi từ một ô (độ dài bằng từ), dấu câu & nhãn vai trò giữ nguyên; gõ xong tự nhảy ô
  function slotExercise(m, box) {
    const blocks = paras(m.text).map(p => { const role = roleOf(p); return { role, toks: tokens(plain(stripRole(p))) }; });
    let n = 0; const answers = [];
    const html = blocks.map(b => `<p class="slot-p">${b.role ? `<span class="an-role slot-role" translate="no">${esc(roleT(b.role))}</span> ` : ''}${b.toks.map(t => {
      if (/^[^A-Za-z\d]$/.test(t)) return `<span class="slot-pun">${esc(t)}</span>`;
      const i = answers.push(t) - 1; n++;
      return `<input class="slot" data-i="${i}" size="${Math.max(2, t.length)}" maxlength="${t.length + 4}" autocomplete="off" spellcheck="false" autocapitalize="off">`;
    }).join(' ')}</p>`).join('');
    box.innerHTML = `<div class="card"><div class="row between"><p class="small muted" style="margin:0">${t('Gõ lại <b>cả bài mẫu</b> – mỗi ô là một từ (độ dài ô = độ dài từ). Gõ xong bấm <kbd>Space</kbd> để sang ô tiếp theo.')}</p>
      <label class="md-sw"><input type="checkbox" id="slotHint"><span></span>${t('Gợi ý chữ đầu')}</label></div>
      <div class="slot-wrap">${html}</div>
      <div class="row" style="margin-top:1rem"><button class="btn primary" id="chk">${t('Kiểm tra')}</button><button class="btn ghost" id="clr">${t('Xóa hết')}</button><span class="small muted" id="slotProg">${t('{done}/{n} từ', { done: 0, n })}</span></div></div>`;
    const ins = $$('.slot', box);
    const prog = () => { $('#slotProg', box).textContent = t('{done}/{n} từ', { done: ins.filter(x => x.value.trim()).length, n }); };
    ins.forEach((inp, k) => inp.addEventListener('keydown', e => {
      if ((e.key === ' ' || e.key === 'Enter') && inp.value.trim()) { e.preventDefault(); if (ins[k + 1]) ins[k + 1].focus(); prog(); }
      else if (e.key === 'Backspace' && !inp.value && ins[k - 1]) { e.preventDefault(); ins[k - 1].focus(); }
    }));
    ins.forEach(inp => inp.addEventListener('input', () => { if (/\s/.test(inp.value)) inp.value = inp.value.trim(); }));
    $('#slotHint', box).onchange = e => ins.forEach(inp => { inp.placeholder = e.target.checked ? answers[+inp.dataset.i][0] : ''; });
    $('#chk', box).onclick = () => { let r = 0; ins.forEach(inp => { const a = answers[+inp.dataset.i], ok = norm(inp.value) === norm(a); inp.classList.toggle('ok', ok); inp.classList.toggle('no', !!inp.value && !ok); inp.title = ok ? '' : a; if (ok) r++; }); prog(); finish(m, 'copy', r, n, box.firstElementChild); };
    $('#clr', box).onclick = () => { ins.forEach(inp => { inp.value = ''; inp.className = 'slot'; }); prog(); ins[0] && ins[0].focus(); };
  }

  // 4) Viết câu từ “từ gốc”: the / table / show / … → tự chia thì, số nhiều, so sánh để viết lại câu đúng
  function lemmaExercise(m, box) {
    const sents = sentencesOf(m);
    const prompt = s => { const ts = tokens(s); return ts.map((t, k) => /^[A-Za-z]/.test(t) ? (t[0] === t[0].toUpperCase() && k > 0 && !/^I$/.test(t) ? t : (t.includes("'") ? t.split(/['’]/).map((x, j) => j ? "'" + x : lemma(x)).join(' / ') : lemma(t))) : t).join(' / '); };
    box.innerHTML = `<div class="card"><p class="small muted">${t('Mỗi câu được cho dưới dạng <b>từ gốc</b> (chưa chia thì, chưa thêm số nhiều/so sánh). Hãy viết lại thành câu hoàn chỉnh, đúng ngữ pháp – luyện “ngữ pháp chủ động” giống khi tự viết bài.')}</p>
      <ol class="lem-list">${sents.map((x, i) => `<li class="line" data-i="${i}">${x.role ? `<span class="an-role slot-role" translate="no">${esc(roleT(x.role))}</span> ` : ''}<div class="lem-q">${esc(prompt(x.s))}</div><textarea class="input lin" rows="2" placeholder="${t('Viết câu hoàn chỉnh…')}" spellcheck="false"></textarea><div class="lres small"></div></li>`).join('')}</ol>
      <div class="row" style="margin-top:1rem"><button class="btn primary" id="chk">${t('Kiểm tra tất cả')}</button><button class="btn" id="show">${t('Xem câu mẫu')}</button></div></div>`;
    $('#chk', box).onclick = () => {
      let r = 0;
      $$('.line', box).forEach(l => {
        const s = sents[+l.dataset.i].s, v = l.querySelector('.lin').value.trim(); if (!v) return;
        const exact = norm(v) === norm(s), sc = Math.round(UI.similarity(norm(v), norm(s)) * 100);
        if (exact || sc >= 95) r++;
        l.querySelector('.lres').innerHTML = exact ? `<b style="color:var(--good)">✅ ${t('Chính xác!')}</b>` : `<b style="color:${sc >= 85 ? 'var(--hard)' : 'var(--again)'}">${t('{n}% khớp', { n: sc })}</b> · ${diffHtml(v, s)}`;
      });
      finish(m, 'write', r, sents.length, box.firstElementChild);
    };
    $('#show', box).onclick = () => $$('.line', box).forEach(l => { l.querySelector('.lres').innerHTML = `<span class="muted">${t('Câu mẫu:')}</span> ${esc(sents[+l.dataset.i].s)}`; });
  }
  App.lemma = lemma;

  const EX = { vocab: (m, b) => gapExercise(m, b, 'vocab'), link: (m, b) => gapExercise(m, b, 'link'), gram: errExercise, copy: slotExercise, write: lemmaExercise };

  // ---------- Hộp thoại lưu cụm từ / cấu trúc ----------
  async function savePhraseDialog({ phrase, vi = '', sentence = '', title = '' }) {
    const box = modal(`<h2>🧩 ${t('Lưu cụm từ / cấu trúc')}</h2>
      <div class="stack">
        <label class="field"><span>${t('Cụm từ hoặc cấu trúc')}</span><input class="input" id="pPh" value="${esc(phrase)}" placeholder="${t('vd: pose a threat to / not only … but also …')}"></label>
        <label class="field"><span>${t('Nghĩa theo cụm')}</span><div class="row nowrap"><input class="input" id="pVi" value="${esc(vi)}" placeholder="${t('Nghĩa tiếng Việt của cả cụm')}"><button class="btn sm" id="pTr" type="button">🌐 ${t('Dịch')}</button></div></label>
        <label class="field"><span>${t('Cách dùng / mẫu cấu trúc (tùy chọn)')}</span><input class="input" id="pUse" placeholder="${t('vd: S + pose a threat to + N · dùng trong Writing Task 2')}"></label>
        <label class="field"><span>${t('Câu ví dụ / ngữ cảnh')}</span><textarea class="input" id="pEx">${esc(sentence)}</textarea></label>
      </div>
      <div class="row between" style="margin-top:1rem"><button class="btn" data-close>${t('Hủy')}</button><button class="btn primary" id="pSave">${t('Lưu vào Sổ cụm từ')}</button></div>`);
    const tr = async () => { const ph = $('#pPh').value.trim(); if (!ph) return; $('#pVi').placeholder = `⏳ ${t('Đang dịch…')}`; const L = I18N.learnLang(); const v = L === 'vi' ? await Dict.translateVi(ph) : await Dict.translateTo(ph, L); if (!$('#pVi').value) $('#pVi').value = v; $('#pVi').placeholder = t('Nghĩa tiếng Việt của cả cụm'); };
    $('#pTr').onclick = tr;
    if (!vi) tr();
    $('#pSave').onclick = async () => {
      const p = $('#pPh').value.trim().replace(/\s+/g, ' '); if (!p) return;
      const ex = $('#pEx').value.trim();
      const card = await App.addWord({ word: p, vi: $('#pVi').value.trim(), pos: 'phrase', ex, emoji: '🧩', topic: 'phrases' }, ex ? { text: ex, title } : null);
      const use = $('#pUse').value.trim();
      if (use) { card.note = use; await Core.Cards.update(card); }
      closeModal(); toast(t('Đã lưu “{p}” – vào Sổ cụm từ để ôn', { p })); Sfx.correct();
    };
    return box;
  }
  App.savePhraseDialog = savePhraseDialog;

  // ---------- Bôi đen bất kỳ đoạn nào trong app: 🔎 tra nghĩa · 🌐 dịch · 🧩 lưu cụm ----------
  // (Trên trang Lexkite, tiện ích Chrome nhường phần này cho app để không hiện 2 bảng tra)
  const bar = document.createElement('div');
  bar.className = 'sel-bar'; bar.hidden = true;
  document.body.appendChild(bar);
  const pop = document.createElement('div');
  pop.className = 'sel-pop card'; pop.hidden = true;
  document.body.appendChild(pop);
  let selInfo = null;
  // Khung nghĩa khi bấm vào cụm từ/từ nối trong bài mẫu: nghĩa + nghe + lưu (điền sẵn) – không mở form trống
  function phrasePop(el, info) {
    bar.hidden = true; pop.hidden = false;
    pop.innerHTML = `<div class="row between nowrap" style="gap:.6rem"><b>${esc(info.phrase)}</b><button class="icon-btn sm" data-x aria-label="${t('Đóng')}">✕</button></div>
      <div class="vi" style="margin:.35rem 0 .6rem">${info.vi ? esc(info.vi) : `<span class="muted small">⏳ ${t('Đang dịch…')}</span>`}</div>
      <div class="row" style="gap:.4rem"><button class="btn sm" data-sp>🔊 ${t('Nghe')}</button><button class="btn sm primary" data-save>${App.inDeck && App.inDeck(info.phrase) ? t('✓ Đã lưu') : '＋ ' + t('Lưu vào Sổ cụm từ')}</button></div>`;
    place(pop, el.getBoundingClientRect());
    $('[data-x]', pop).onclick = () => { pop.hidden = true; };
    $('[data-sp]', pop).onclick = () => UI.speak(info.phrase, state.settings.accent);
    $('[data-save]', pop).onclick = () => { pop.hidden = true; savePhraseDialog(info); };
    if (!info.vi) { const L = I18N.learnLang(); (L === 'vi' ? Dict.translateVi(info.phrase) : Dict.translateTo(info.phrase, L)).then(v => { info.vi = v || ''; const d = $('.vi', pop); if (d && !pop.hidden) d.textContent = info.vi || t('Không dịch được – thử lại sau'); }).catch(() => {}); }
  }
  const NO_LOOKUP = 'input, textarea, select, .cbt, .mk-read, .mk-write, .mk-qs, .sel-pop, .sel-bar, .pop';
  const place = (el, r, below = 8) => {
    el.style.left = Math.max(8, Math.min(innerWidth - el.offsetWidth - 8, r.left + r.width / 2 - el.offsetWidth / 2)) + 'px';
    const top = r.bottom + below; el.style.top = (top + el.offsetHeight > innerHeight - 8 ? Math.max(8, r.top - el.offsetHeight - 8) : top) + 'px';
  };
  const readSel = () => {
    const sel = getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) return null;
    const node = sel.anchorNode, el = node && (node.nodeType === 1 ? node : node.parentElement);
    if (!el || !view.contains(el) || el.closest(NO_LOOKUP) || document.body.classList.contains('bare')) return null;
    const t = cleanText(sel.getRangeAt(0).cloneContents());
    if (!t || t.length > 600 || !/[A-Za-z]{2}/.test(t) || /[À-ỹ]/.test(t)) return null;
    const block = el.closest('p, li, .example-box, .ex, .meaning, .sent, .tl, .lq-item, div');
    const full = block ? cleanText(block) : t;
    const sents = full.match(/[^.!?]+[.!?]+["”’)]*|[^.!?]+$/g) || [full];
    let sentence = (sents.find(x => x.toLowerCase().includes(t.toLowerCase().slice(0, 40))) || full).trim();
    if (sentence.length > 300) sentence = sentence.slice(0, 297) + '…';
    return { text: t.replace(/^[^A-Za-z(]+|[^A-Za-z)]+$/g, ''), sentence, rect: sel.getRangeAt(0).getBoundingClientRect() };
  };
  const onSelect = () => setTimeout(() => {
    const info = readSel();
    if (!info) { bar.hidden = true; return; }
    selInfo = info;
    const n = info.text.split(/\s+/).length;
    bar.innerHTML = `${n <= 4 ? `<button data-act="look">🔎 ${t('Tra nghĩa')}</button>` : `<button data-act="tr">🌐 ${t('Dịch')}</button>`}${n >= 2 && n <= 14 ? `<button data-act="save">🧩 ${t('Lưu cụm')}</button>` : ''}${n <= 4 ? `<button data-act="say" title="${t('Nghe')}">🔊</button>` : ''}`;
    bar.hidden = false; place(bar, info.rect);
  }, 10);
  document.addEventListener('mouseup', e => { if (!bar.contains(e.target) && !pop.contains(e.target)) onSelect(); });
  document.addEventListener('touchend', e => { if (!bar.contains(e.target) && !pop.contains(e.target)) setTimeout(onSelect, 250); });
  document.addEventListener('mousedown', e => { if (!bar.contains(e.target)) bar.hidden = true; if (!pop.contains(e.target) && !bar.contains(e.target)) pop.hidden = true; });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { bar.hidden = true; pop.hidden = true; } });
  window.addEventListener('hashchange', () => { bar.hidden = true; pop.hidden = true; });
  bar.addEventListener('mousedown', e => e.preventDefault()); // giữ nguyên vùng chọn khi bấm nút
  bar.onclick = async e => {
    const act = e.target.closest('[data-act]'); if (!act || !selInfo) return;
    const info = selInfo, k = act.dataset.act;
    if (k === 'say') return UI.speak(info.text, state.settings.accent);
    bar.hidden = true;
    if (k === 'save') { getSelection().removeAllRanges(); return savePhraseDialog({ phrase: info.text, sentence: info.sentence, title: t('Lưu từ Lexkite') }); }
    pop.hidden = false; pop.innerHTML = `<div class="muted small">⏳ ${k === 'look' ? t('Đang tra “{text}”…', { text: esc(info.text.slice(0, 60)) }) : t('Đang dịch “{text}”…', { text: esc(info.text.slice(0, 60)) })}</div>`; place(pop, info.rect);
    if (k === 'tr') {
      const L = I18N.learnLang();
      const vi = L === 'vi' ? await Dict.translateVi(info.text) : await Dict.translateTo(info.text, L);
      const structs = window.VBStruct ? VBStruct.analyze(info.text, 4) : [];
      pop.innerHTML = `<div class="row between nowrap"><b class="small">🌐 ${t('Bản dịch')}</b><button class="icon-btn sm" data-x>✕</button></div><div style="margin:.4rem 0;line-height:1.6">${esc(vi || t('Không dịch được – thử lại sau.'))}</div>
        ${structs.length ? `<div class="st-box"><b class="small">🧩 ${t('Cấu trúc trong đoạn')}</b>${structs.map(x => `<div class="st-row"><b>${esc(t(x.name))}</b> <i class="muted">“${esc(x.match)}”</i><div class="small muted">${esc(t(x.vi))}</div><a class="small" href="#/grammar/${esc(x.lesson)}">📐 ${t('Học bài này →')}</a></div>`).join('')}</div>` : ''}
        <div data-aiout></div>
        <div class="row" style="margin-top:.5rem"><button class="btn sm" data-sp>🔊 ${t('Nghe')}</button><button class="btn sm" data-sps>🐢</button><button class="btn sm primary" data-deep>🤖 ${t('Giải thích sâu')}</button></div>`;
      $('[data-sp]', pop).onclick = () => UI.tts(info.text, state.settings.accent);
      $('[data-sps]', pop).onclick = () => UI.tts(info.text, state.settings.accent, 0.65);
      $('[data-deep]', pop).onclick = async ev => {
        const out = $('[data-aiout]', pop), btn = ev.currentTarget; btn.disabled = true;
        // 1) Phân tích từ vựng tức thì, miễn phí (từ điển sẵn có) – luôn có kết quả, không phụ thuộc AI
        const STOP = new Set('the a an and or but of to in on at for with by from as is are was were be been being it its this that these those which who whom whose what when where why how than then there their they them we our you your he she his her i me my not no do does did have has had can could will would should may might must shall also very more most such into over under about after before between through during without within upon'.split(' '));
        const ws = [...new Set((info.text.match(/[A-Za-z][A-Za-z'-]{3,}/g) || []).map(x => x.toLowerCase()).filter(x => !STOP.has(x)))].slice(0, 8);
        out.innerHTML = `<div class="small muted">⏳ ${t('Đang phân tích từ vựng…')}</div>`;
        // Nhanh & tiết kiệm: từ có trong thư viện → lấy ngay trên máy; từ còn lại → 1 lượt dịch gộp duy nhất (không gọi từng từ)
        const lem = w0 => (App.lemma && App.lemma(w0)) || w0;
        const local = ws.map(w0 => IELTS_DATA.INDEX[lem(w0)] || IELTS_DATA.INDEX[w0] || null);
        const miss = ws.filter((w0, i) => !local[i]);
        const tr = miss.length ? (await (L === 'vi' ? Dict.translateVi(miss.map(lem).join('\n')) : Dict.translateTo(miss.map(lem).join('\n'), L)).catch(() => '')).split('\n') : [];
        const looks = ws.map((w0, i) => { const loc = local[i]; if (loc) return { w: loc.word, vi: App.meanOf ? App.meanOf(loc) : loc.vi, ipa: loc.ipa || '', pos: loc.pos || '' }; const k = miss.indexOf(w0), vi = (tr[k] || '').trim(); return vi && vi.toLowerCase() !== lem(w0) ? { w: lem(w0), vi: L === 'vi' ? Dict.fixVi(vi) : vi, ipa: '', pos: '' } : null; });
        const vocab = looks.filter(Boolean);
        out.innerHTML = `${vocab.length ? `<div class="st-box"><b class="small">📚 ${t('Từ vựng quan trọng')}</b>${vocab.map(v => `<div class="st-row"><b>${esc(v.w)}</b> <span class="muted small">${esc(v.ipa)} ${esc(v.pos)}</span><div class="small">${esc(v.vi)}</div></div>`).join('')}</div>` : ''}<div data-ai2></div>`;
        place(pop, info.rect);
        // 2) Giải thích sâu bằng AI chỉ khi thật sự sẵn sàng (khóa Gemini / AI Chrome đã tải) – không bao giờ treo vì tải ngầm
        const box = $('[data-ai2]', out);
        const run = async () => {
          box.innerHTML = `<div class="small muted">⏳ ${t('AI đang phân tích…')}</div>`;
          try { box.innerHTML = AI.renderExplain(await AI.explain(info.text, info.sentence)); } catch (e) { box.innerHTML = `<div class="small">❌ ${esc(AI.errText(e))}</div>`; }
          place(pop, info.rect);
        };
        if (!window.AI) { btn.disabled = false; return; }
        const key = await AI.getKey(), st = key ? 'key' : await AI.nanoStatus();
        if (key || st === 'available') await run();
        else box.innerHTML = `<div class="tip small" style="margin-top:.5rem">🤖 ${t('Muốn AI giải thích ngữ pháp, cấu trúc & cách dùng? Chọn 1 cách miễn phí:')}
          <div class="row" style="gap:.4rem;margin-top:.4rem"><button class="btn sm primary" data-k>🔑 ${t('Dùng khóa Gemini (miễn phí, 1 phút)')}</button>${st === 'downloadable' || st === 'downloading' ? `<button class="btn sm" data-dl>⬇️ ${t('Tải AI của Chrome (~2GB, 1 lần)')}</button>` : ''}</div></div>`;
        const k = $('[data-k]', box); if (k) k.onclick = () => AI.keyDialog(run);
        const dl = $('[data-dl]', box); if (dl) dl.onclick = () => { dl.disabled = true; AI.onNanoProgress && AI.onNanoProgress(p => { dl.textContent = `⬇️ ${Math.round(p * 100)}%`; }); run(); };
        btn.disabled = false;
      };
    } else {
      const w = info.text.toLowerCase();
      const d = (await Dict.quick(w)) || (await Dict.lookup(w, { examples: false, image: false }));
      const L = I18N.learnLang();
      if (!d || !d.found) {
        const vi = (d && (App.meanOf ? App.meanOf(d) : d.vi)) || (L === 'vi' ? await Dict.translateVi(info.text) : await Dict.translateTo(info.text, L));
        pop.innerHTML = `<div class="row between nowrap"><b>${esc(info.text)}</b><button class="icon-btn sm" data-x>✕</button></div><div class="vi" style="margin:.3rem 0">${esc(vi || t('Không tìm thấy'))}</div>${info.text.includes(' ') ? `<button class="btn sm primary" data-ph>🧩 ${t('Lưu cụm')}</button>` : ''}`;
      } else {
        const mText = App.meanOf ? App.meanOf(d) : d.vi;
        pop.innerHTML = `<div class="row between nowrap"><div><b style="font-size:1.2rem">${esc(d.word)}</b> ${UI.posChip ? UI.posChip(d.pos) : ''}</div><button class="icon-btn sm" data-x>✕</button></div>
          <div class="row" style="gap:.3rem"><span class="ipa">${esc(d.ipa || '')}</span><button class="icon-btn sm" data-sp>🔊</button></div>
          ${mText ? `<div class="vi" style="font-size:1.05rem;margin:.2rem 0">${esc(mText)}</div>` : ''}
          ${d.def && d.def !== mText ? `<div class="small muted">${esc(d.def)}</div>` : ''}
          ${info.sentence && info.sentence !== info.text ? UI.ctxBox(info.sentence, d.word) : ''}
          <div class="row" style="margin-top:.6rem"><button class="btn sm primary" data-save>${App.inDeck(d.word) ? `+ ${t('Thêm ngữ cảnh')}` : `+ ${t('Lưu flashcard')}`}</button>${info.text.includes(' ') ? `<button class="btn sm" data-ph>🧩 ${t('Lưu cụm')}</button>` : ''}<a class="btn sm ghost" href="#/dict/${encodeURIComponent(d.word)}">${t('Chi tiết')}</a></div>`;
        $('[data-sp]', pop).onclick = () => UI.speak(d.word, state.settings.accent, d.audio);
        $('[data-save]', pop).onclick = async ev => {
          const b = ev.currentTarget; b.disabled = true;
          const vi = info.sentence ? (L === 'vi' ? await Dict.translateVi(info.sentence) : await Dict.translateTo(info.sentence, L)) : '';
          await App.addWord(d, info.sentence ? { text: info.sentence, vi, title: document.title.replace(/ – Lexkite$/, '') || 'Lexkite' } : null);
          b.textContent = `✓ ${t('Đã lưu')}`;
        };
        if (state.settings.autoSpeak) UI.speak(d.word, state.settings.accent, d.audio);
      }
      const ph = $('[data-ph]', pop); if (ph) ph.onclick = () => { pop.hidden = true; savePhraseDialog({ phrase: info.text, sentence: info.sentence, title: t('Lưu từ Lexkite') }); };
    }
    place(pop, info.rect);
    $('[data-x]', pop).onclick = () => { pop.hidden = true; };
  };

  // ---------- Sổ cụm từ & cấu trúc ----------
  const isPhrase = c => /\s/.test(c.word.trim()) || c.pos === 'phrase' || c.topic === 'phrases';
  App.isPhrase = isPhrase;
  // ================= THƯ VIỆN BÀI MẪU: theo Task, có tên đề, dạng bài, chủ đề, tìm kiếm =================
  routes.models = function (arg, query) {
    const M = window.MODELS || [];
    const TYPE_VI = { line: t('Biểu đồ đường'), bar: t('Biểu đồ cột'), pie: t('Biểu đồ tròn'), table: t('Bảng số liệu'), process: t('Quy trình'), map: t('Bản đồ') };
    const TONE = { formal: t('Trang trọng'), 'semi-formal': t('Bán trang trọng'), informal: t('Thân mật') };
    const info = m => {
      if (m.task === 1) { const d = App.task1 && App.task1.SETS.find(x => x.id === m.ref); return { title: d ? d.title : m.ref, kind: d ? TYPE_VI[d.type] || d.type : 'Task 1', topic: '' }; }
      if (m.task === 'gt') { const l = (window.GT_LETTERS || []).find(x => x.id === m.ref); return { title: l ? (I18N.lang() === 'vi' ? l.titleVi : t(l.titleVi)) : m.ref, kind: l ? TONE[l.tone] || l.tone : t('Viết thư'), topic: '' }; }
      const p = (window.WRITE_PROMPTS || []).find(x => x.id === m.ref); return { title: p ? p.text : m.ref, kind: p ? p.type : 'Task 2', topic: p ? p.topic : '' };
    };
    const TABS = [['2', 'Task 2'], ['1', t('Task 1 – Biểu đồ')], ['gt', t('Task 1 – Viết thư')]];
    const ex = App.exam ? App.exam() : 'ielts';
    let tab = (query && query.get && query.get('t')) || (ex === 'ieltsgt' ? 'gt' : '2');
    const rows = M.map(m => ({ m, ...info(m) }));
    const draw = () => {
      const q = ($('#mq') && $('#mq').value.trim().toLowerCase()) || '';
      const list = rows.filter(r => String(r.m.task) === tab && (!q || (r.title + ' ' + r.kind + ' ' + r.topic).toLowerCase().includes(q)))
        .sort((a, b) => a.kind.localeCompare(b.kind) || a.title.localeCompare(b.title));
      $('#mList').innerHTML = list.length ? list.map(r => `<a class="card hover model-row" href="#/model/${r.m.id}"><span class="model-tx"><b>${esc(r.title)}</b><small>${esc(r.kind)}${r.topic && App.topicOf(r.topic) ? ' · ' + esc(App.topicOf(r.topic).name) : ''} · ${t('{n} từ', { n: r.m.words || '–' })}</small></span><span class="chip ok">Band ${esc(r.m.band)}</span></a>`).join('')
        : `<div class="card empty-note"><p class="muted" style="margin:0">${t('Không có bài mẫu phù hợp.')}</p></div>`;
      $$('#mTabs button').forEach(b => b.classList.toggle('on', b.dataset.v === tab));
    };
    view.innerHTML = `<div class="page-head"><div><h1>📄 ${t('Bài mẫu band 8')}</h1><p class="muted">${t('Bài mẫu tự biên soạn, có đánh dấu cụm từ hay, từ nối và vai trò từng câu. Bấm vào cụm để lưu vào sổ.')}</p></div></div>
      <div class="row between" style="gap:.6rem;margin-bottom:.8rem"><div class="tabs seg" id="mTabs">${TABS.map(([v, l]) => `<button type="button" data-v="${v}">${l} <span class="muted small">${rows.filter(r => String(r.m.task) === v).length}</span></button>`).join('')}</div>
      <input class="input" id="mq" type="search" placeholder="${t('Tìm theo chủ đề, dạng bài…')}" style="max-width:280px"></div>
      <div class="model-list" id="mList"></div>`;
    $$('#mTabs button').forEach(b => b.onclick = () => { tab = b.dataset.v; draw(); });
    $('#mq').oninput = draw;
    draw();
  };

  routes.phrases = function () {
    const list = Object.values(state.cards).filter(isPhrase).sort((a, b) => b.added - a.added);
    const models = window.MODELS || [];
    view.innerHTML = `
      <div class="page-head"><div><h1>🧩 ${t('Sổ cụm từ & cấu trúc')}</h1><p class="muted">${t('Học theo <b>cụm</b> (chunk) giúp nói và viết tự nhiên hơn học từng từ rời. Lưu cụm từ, cấu trúc câu kèm nghĩa theo cụm, cách dùng và câu ví dụ – ôn đúng thời điểm vàng như từ vựng.')}</p></div>
        <div class="row"><button class="btn primary" id="addP">＋ ${t('Thêm cụm / cấu trúc')}</button>${list.length >= 4 ? `<a class="btn" href="#/practice/learn?src=phrases">🧠 ${t('Học các cụm')}</a>` : ''}</div></div>
      <a class="card hover hub-card" href="#/models" style="margin-bottom:1rem"><span class="hub-ic" aria-hidden="true">📄</span><span class="hub-tx"><b>${t('Bài mẫu band 8 có đánh dấu cụm từ')}</b><small>${t('Đọc bài mẫu, bấm vào cụm hay để lưu vào sổ này')}</small></span><span class="hub-meta">${models.length ? t('{n} bài', { n: models.length }) : ''} ›</span></a>
      <div class="card" style="margin-top:1rem" id="pList">${list.length ? list.map(c => `<div class="deck-row" style="grid-template-columns:minmax(0,1.2fr) minmax(0,1.6fr) auto">
          <div style="min-width:0"><b>${esc(c.word)}</b><div class="small" style="color:var(--accent);font-weight:700">${esc(App.meanOf(c))}</div>${c.note ? `<div class="tiny muted">📐 ${esc(c.note)}</div>` : ''}</div>
          <div class="small muted hide-sm">${c.contexts[0] ? `“${UI.highlight(c.contexts[0].text.slice(0, 140), c.word)}”` : esc(c.ex || '')}</div>
          <div class="row nowrap" style="gap:.3rem"><button class="icon-btn sm" data-speak="${esc(c.word)}">🔊</button>${App.masteryDots(c.srs)}</div></div>`).join('')
        : `<div class="empty"><div class="em">🧩</div>${t('Chưa có cụm từ nào. Bôi đen một cụm trong bài đọc, bài mẫu hay ví dụ từ điển rồi bấm “🧩 Lưu cụm này”, hoặc thêm thủ công.')}${models.length ? `<div style="margin-top:1rem"><button class="btn primary" id="starter">✨ ${t('Thêm nhanh 20 cụm hay từ bài mẫu')}</button></div>` : ''}</div>`}</div>`;
    App.bindCommon();
    $('#addP').onclick = () => savePhraseDialog({ phrase: '' });
    // Gói khởi đầu: 20 cụm học thuật hay gặp nhất trong các bài mẫu (kèm câu gốc làm ngữ cảnh) → sổ không bao giờ trống
    const st = $('#starter'); if (st) st.onclick = async () => {
      st.disabled = true;
      const seen = new Map();
      for (const m of models) for (const x of m.text.matchAll(/\[\[([^|\]]+)\|([^\]]+)\]\]/g)) {
        const en = x[1].trim(), k = en.toLowerCase(); if (en.split(' ').length < 2 || en.length > 48) continue;
        const sent = (m.text.replace(/<<[^>]+>>/g, '').replace(/\{\{([^}]+)\}\}/g, '$1').split(/(?<=[.!?])\s+/).find(z => z.includes('[[' + x[1])) || '').replace(/\[\[([^|\]]+)\|[^\]]+\]\]/g, '$1');
        const e = seen.get(k) || { en, vi: x[2].trim(), n: 0, sent, task: m.task }; e.n++; seen.set(k, e);
      }
      const top = [...seen.values()].filter(e => !App.inDeck(e.en)).sort((a, b) => b.n - a.n).slice(0, 20);
      for (const e of top) await App.addWord({ word: e.en, vi: e.vi, pos: 'phrase', ex: e.sent.trim(), emoji: '🧩', topic: 'phrases' }, e.sent ? { text: e.sent.trim(), title: t('Bài mẫu Task {n}', { n: e.task }) } : null, { silent: true });
      toast('🧩 ' + t('Đã thêm {n} cụm vào sổ', { n: top.length }));
      routes.phrases();
    };
  };
})();
