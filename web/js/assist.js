/* Trợ lý viết (kiểu QuillBot/Grammarly, miễn phí):
 * – Kiểm tra ngữ pháp & chính tả bằng LanguageTool (mã nguồn mở, máy chủ công khai miễn phí, không cần khóa) → lỗi gạch chân, bấm để sửa, giải thích tiếng Việt.
 * – Viết lại câu (paraphrase) theo phong cách bằng AI trên máy (Chrome) hoặc khóa Gemini của người dùng. */
(function () {
  const { $, $$, esc, toast } = UI;
  const App = window.App;
  const LT = 'https://api.languagetool.org/v2/check';
  const TYPE = () => ({ misspelling: [t('Chính tả'), '#e11d48'], grammar: [t('Ngữ pháp'), '#d97706'], typographical: [t('Dấu câu'), '#64748b'], style: [t('Văn phong'), '#2563eb'], duplication: [t('Lặp từ'), '#7c3aed'], uncategorized: [t('Khác'), '#64748b'] });

  // Dự phòng khi LanguageTool quá tải/mất mạng: Proofreader API có sẵn trong Chrome (chạy trên máy, miễn phí)
  async function chromeProofread(text) {
    const PR = self.Proofreader; if (!PR || (await PR.availability({ expectedInputLanguages: ['en'] })) !== 'available') return null;
    const p = await PR.create({ expectedInputLanguages: ['en'] });
    try {
      const r = await p.proofread(text);
      return (r.corrections || []).map(c => ({ off: c.startIndex, len: c.endIndex - c.startIndex, msg: t('Gợi ý sửa từ AI trên máy'), short: '', reps: [c.correction], type: (c.type || 'grammar').toLowerCase().includes('spell') ? 'misspelling' : 'grammar', bad: text.slice(c.startIndex, c.endIndex), ctx: '' }));
    } finally { try { p.destroy(); } catch (e) { /* bỏ qua */ } }
  }
  async function check(text) {
    try { return await ltCheck(text); } catch (e) { const local = await chromeProofread(text).catch(() => null); if (local) return local; throw e; }
  }
  async function ltCheck(text) {
    const body = new URLSearchParams({ text: text.slice(0, 18000), language: 'en-US', motherTongue: 'vi', level: 'picky', enabledOnly: 'false' });
    const r = await fetch(LT, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
    if (r.status === 429) throw new Error(t('Máy chủ kiểm tra đang bận – thử lại sau 1 phút.'));
    if (!r.ok) throw new Error(t('Không kiểm tra được lúc này.'));
    const j = await r.json();
    return (j.matches || []).filter(m => !(m.rule && /^(EN_QUOTES|WHITESPACE_RULE|DASH_RULE)$/.test(m.rule.id))).map(m => ({
      off: m.offset, len: m.length, msg: m.message, short: m.shortMessage || '', reps: (m.replacements || []).slice(0, 4).map(x => x.value),
      type: (m.rule && m.rule.issueType) || 'uncategorized', bad: text.substr(m.offset, m.length), ctx: m.context ? m.context.text : '' }));
  }

  // Gắn trợ lý vào một ô soạn thảo: nút kiểm tra + danh sách lỗi + viết lại câu đang bôi đen
  function attach(ta, mount) {
    if (!ta || !mount) return;
    const box = document.createElement('div'); box.className = 'card wa-box';
    box.innerHTML = `<div class="row between"><div><b>🧐 ${t('Trợ lý viết')}</b><div class="tiny muted">${t('Kiểm tra ngữ pháp, chính tả, văn phong · bôi đen 1 câu để viết lại hay hơn')}</div></div>
      <div class="row"><button class="btn sm primary" data-wa="check">${t('Kiểm tra ngữ pháp')}</button><button class="btn sm" data-wa="para">🔁 ${t('Viết lại câu đã chọn')}</button></div></div><div data-wa-out></div>`;
    mount.appendChild(box);
    const out = $('[data-wa-out]', box);
    const run = async () => {
      const text = ta.value; if (text.trim().split(/\s+/).length < 5) return toast(t('Viết ít nhất 1–2 câu rồi kiểm tra nhé'));
      out.innerHTML = `<div class="small muted" style="margin-top:.6rem">⏳ ${t('Đang kiểm tra…')}</div>`;
      let ms; try { ms = await check(text); } catch (e) { out.innerHTML = `<div class="small" style="margin-top:.6rem">❌ ${esc(e.message)}</div>`; return; }
      const L = (window.I18N && I18N.lang && I18N.lang()) || 'vi';
      const vi = L === 'en' ? ms.map(m => m.msg) : (await (L === 'vi' ? Dict.translateVi(ms.map(m => m.msg.replace(/\n/g, ' ')).join('\n')) : Dict.translateTo(ms.map(m => m.msg.replace(/\n/g, ' ')).join('\n'), L)).catch(() => '')).split('\n');
      const counts = {}; ms.forEach(m => { counts[m.type] = (counts[m.type] || 0) + 1; });
      out.innerHTML = `<div class="row" style="margin:.6rem 0 .3rem;gap:.3rem">${Object.entries(counts).map(([k, n]) => `<span class="chip" style="color:${(TYPE()[k] || TYPE().uncategorized)[1]}">${(TYPE()[k] || TYPE().uncategorized)[0]}: ${n}</span>`).join('')}</div>
        <div class="wa-list">${ms.map((m, i) => `<div class="wa-it" data-i="${i}"><div class="row between nowrap"><span><span class="wa-tag" style="background:${(TYPE()[m.type] || TYPE().uncategorized)[1]}">${(TYPE()[m.type] || TYPE().uncategorized)[0]}</span> <s class="wa-bad">${esc(m.bad)}</s></span><button class="icon-btn sm" data-ign="${i}" title="${t('Bỏ qua')}">✕</button></div>
          <div class="small" style="margin:.25rem 0">${esc(vi[i] || m.msg)}</div>
          <div class="row" style="gap:.3rem">${m.reps.map((r, k) => `<button class="chip wa-rep" data-i="${i}" data-k="${k}">${esc(r || t('(xóa)'))}</button>`).join('') || `<span class="tiny muted">${t('Không có gợi ý – tự sửa lại câu')}</span>`}</div></div>`).join('')}</div>`;
      $$('.wa-rep', out).forEach(b => b.onclick = () => {
        const m = ms[+b.dataset.i], rep = m.reps[+b.dataset.k];
        if (ta.value.substr(m.off, m.len) !== m.bad) return run(); // văn bản đã đổi → kiểm tra lại
        ta.value = ta.value.slice(0, m.off) + rep + ta.value.slice(m.off + m.len);
        ta.dispatchEvent(new Event('input', { bubbles: true }));
        const d = rep.length - m.len; ms.forEach(x => { if (x.off > m.off) x.off += d; });
        b.closest('.wa-it').remove(); Sfx.correct();
      });
      $$('[data-ign]', out).forEach(b => b.onclick = () => b.closest('.wa-it').remove());
      $$('.wa-it', out).forEach(el => el.addEventListener('mouseenter', () => { const m = ms[+el.dataset.i]; try { ta.focus({ preventScroll: true }); ta.setSelectionRange(m.off, m.off + m.len); } catch (e) { /* bỏ qua */ } }));
    };
    $('[data-wa="check"]', box).onclick = run;
    $('[data-wa="para"]', box).onclick = async () => {
      const a = ta.selectionStart, b = ta.selectionEnd, sel = ta.value.slice(a, b).trim();
      if (sel.split(/\s+/).length < 4) return toast(t('Bôi đen 1 câu (≥ 4 từ) trong bài để viết lại'));
      out.innerHTML = `<div class="small muted" style="margin-top:.6rem">⏳ ${t('AI đang viết lại…')}</div>`;
      // T2: Rewriter API có sẵn trong Chrome (trên máy, miễn phí, không cần khóa) – dùng trước nếu đã sẵn sàng
      const viaChrome = async () => {
        const RW = self.Rewriter; if (!RW || (await RW.availability()) !== 'available') return null;
        const modes = [['Academic', { tone: 'more-formal' }, t('Trang trọng, học thuật hơn')], ['Concise', { length: 'shorter' }, t('Gọn hơn, bỏ ý thừa')], ['Advanced structure', { length: 'longer' }, t('Diễn đạt đầy đủ, nhiều cấu trúc hơn')]];
        const out = await Promise.all(modes.map(async ([style, o, note]) => { const r = await RW.create({ ...o, sharedContext: 'Sentences from an IELTS academic essay' }); try { return { style, text: (await r.rewrite(sel)).trim(), note }; } finally { try { r.destroy(); } catch (e) { /* bỏ qua */ } } }));
        return { variants: out.filter(v => v.text && v.text !== sel) };
      };
      try {
        const local = await viaChrome().catch(() => null);
        const r = local && local.variants.length ? local : await AI.ask(`Rewrite the following sentence from an IELTS essay in 3 different improved ways: (1) more academic and precise, (2) more concise, (3) with a more sophisticated structure (e.g. participle clause, inversion, nominalisation). Keep the meaning and facts. Sentence: "${sel}". Return ONLY JSON: {"variants":[{"style":"Academic|Concise|Advanced structure","text":"...","note":"one short Vietnamese explanation of what improved"}]}`);
        const vs = (r && r.variants) || [];
        out.innerHTML = `<div class="wa-list" style="margin-top:.6rem">${vs.map((v, i) => `<div class="wa-it"><span class="wa-tag" style="background:#2563eb">${esc(v.style || '')}</span><div style="margin:.3rem 0">${esc(v.text)}</div><div class="tiny muted">${esc(v.note || '')}</div><div class="row" style="margin-top:.3rem"><button class="btn sm" data-use="${i}">${t('Dùng câu này')}</button><button class="ctx-say sm" data-saysent="${esc(v.text)}">🔊</button></div></div>`).join('') || `<div class="small muted">${t('Không có kết quả.')}</div>`}</div>`;
        $$('[data-use]', out).forEach(x => x.onclick = () => { const v = vs[+x.dataset.use].text; ta.value = ta.value.slice(0, a) + v + ta.value.slice(b); ta.dispatchEvent(new Event('input', { bubbles: true })); toast(t('Đã thay câu')); });
      } catch (e) {
        out.innerHTML = `<div class="small" style="margin-top:.6rem">❌ ${esc(AI.errText ? AI.errText(e) : e.message)} ${e.message === 'NO_KEY' ? `<button class="btn sm" data-k>${t('Bật AI')}</button>` : ''}</div>`;
        const k = $('[data-k]', out); if (k) k.onclick = () => AI.keyDialog();
      }
    };
  }
  window.Assist = { check, attach };
})();
