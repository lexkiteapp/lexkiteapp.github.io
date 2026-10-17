/* Bộ câu hỏi kiểu IELTS dùng chung cho Listening & Reading:
 * điền từ (form/note/table/sentence/summary, có giới hạn số từ), trắc nghiệm A–D, nối (tiêu đề i/ii/iii, đoạn A–F, đặc điểm),
 * chọn 2 đáp án, TRUE/FALSE/NOT GIVEN, YES/NO/NOT GIVEN. Chấm điểm + đánh dấu đúng/sai + nút "xem chỗ có đáp án". */
(function (g) {
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = (s, el = document) => el.querySelector(s), $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const L = 'ABCDEFGH';
  const code = o => String(o).split(' ')[0];
  const label = o => String(o).slice(code(o).length + 1);
  // Lời giải dịch sẵn theo ngôn ngữ người học (i18n/explain/<lang>.json – scripts/gen-explain.mjs), tải lười khi mở phần thi.
  // Chưa có bản dịch → giữ bản gốc. mv: hàm đổi chữ cái đáp án khi phương án đã được xoay vị trí (TOEIC).
  const fnv = s => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); };
  const XL = g.I18N && I18N.learnLang ? I18N.learnLang() : 'vi';
  let XT = null;
  if (XL !== 'vi' && g.fetch) fetch((/^https?:/.test(location.protocol) ? '' : 'https://lexkite.com/') + 'i18n/explain/' + XL + '.json').then(r => (r.ok ? r.json() : null)).then(j => { XT = j; }).catch(() => {});
  const LETRE = /(→\s*|\(|[Đđ]áp án\s+|[Cc]họn\s+|[Pp]hương án\s+)([A-D])\b/g;
  const exT = (s, mv) => { if (!s) return ''; const x = XT && XT[fnv(s)]; if (x) return x.replace(/\{([A-D])\}/g, (m, l) => (mv ? mv(l) : l)); return mv ? s.replace(LETRE, (m, pre, l) => pre + mv(l)) : s; };
  const TF = { tfng: ['TRUE', 'FALSE', 'NOT GIVEN'], ynng: ['YES', 'NO', 'NOT GIVEN'] };

  // ---------- Chấm ----------
  const norm = s => String(s || '').toLowerCase().replace(/[’‘`]/g, "'").replace(/[£$€]/g, '').replace(/(\d),(\d{3})/g, '$1$2').replace(/[.,!?;:"“”()]/g, ' ').replace(/\s+/g, ' ').trim().replace(/^(the|a|an) /, '');
  const words = s => norm(s).split(' ').filter(Boolean).length;
  function gradeGap(it, limit, given) {
    if (!given || !given.trim()) return { ok: false, empty: true };
    const over = limit && words(given) > limit;
    return { ok: !over && it.a.some(a => norm(a) === norm(given)), over };
  }
  const numsOf = p => p.groups.flatMap(gr => gr.type === 'multi' ? gr.n : gr.items.map(i => i.n));

  // Trả về { n: { ok, given, answer, cue, q } } cho mọi câu
  function collect(p, root) {
    const res = {};
    p.groups.forEach((gr, gi) => {
      if (gr.type === 'multi') {
        const picked = $$(`[data-multi="${gi}"]:checked`, root).map(x => x.value);
        const correct = picked.filter(x => gr.a.includes(x));
        gr.n.forEach((n, k) => { res[n] = { ok: k < correct.length, given: picked.join(', '), answer: gr.a.join(', '), cue: gr.cue, q: gr.q, type: 'multi', alts: gr.a }; });
        return;
      }
      gr.items.forEach(it => {
        const el = $(`[data-qn="${it.n}"]`, root);
        if (gr.type === 'mcq') { const v = $(`input[name="q${it.n}"]:checked`, root); const given = v ? +v.value : null; res[it.n] = { ok: given === it.a, given: given == null ? '' : L[given], answer: L[it.a] + '. ' + it.options[it.a], cue: it.cue, q: it.q, type: 'mcq', alts: [String(it.a)], stm: gr.photo ? it.options : null }; }
        else if (TF[gr.type]) { const v = $(`input[name="q${it.n}"]:checked`, root); const given = v ? v.value : ''; res[it.n] = { ok: given === it.a, given, answer: it.a, cue: it.cue, q: it.text, type: gr.type, alts: [it.a] }; }
        else if (gr.type === 'match') { const v = el ? el.value : ''; const opt = gr.options.find(o => code(o) === it.a); res[it.n] = { ok: v === it.a, given: v, answer: it.a + (opt && label(opt) ? ' – ' + label(opt) : ''), cue: it.cue, q: it.text, type: 'match', alts: [it.a] }; }
        else { const v = el ? el.value.trim() : ''; const r = gradeGap(it, gr.limit, v); res[it.n] = { ok: r.ok, over: r.over, given: v, answer: it.a[0], cue: it.cue, q: it.text, type: 'gap', alts: it.a, limit: gr.limit }; }
      });
    });
    return res;
  }

  // ---------- Hiển thị ----------
  function groupHtml(gr, gi) {
    const head = `<div class="lq-instr">${gr.title ? `<b>${esc(gr.title)}</b><br>` : ''}<i>${esc(gr.instr)}</i></div>`;
    // TOEIC Part 1 (photo): ảnh + chỉ chữ (A)–(D); 4 câu mô tả chỉ nghe, hiện lại sau khi nộp (mark)
    if (gr.type === 'mcq' && gr.photo) return `<div class="lq-group">${head}${gr.items.map(it => `<div class="lq-item" data-item="${it.n}"><div><span class="qn">${it.n}</span> ${esc(it.q)}</div>
      <img class="lq-photo" src="${esc((/^https?:/.test(location.protocol) ? "" : "https://lexkite.com/") + it.img)}" alt="${esc(t('Ảnh câu {n}', { n: it.n }))}" loading="lazy" style="display:block;max-width:100%;height:auto;border-radius:12px;margin:.4rem 0">
      <div class="lq-opts">${it.options.map((o, k) => `<label><input type="radio" name="q${it.n}" value="${k}"> <b>(${L[k]})</b></label>`).join('')}</div><div class="lq-fb" hidden></div></div>`).join('')}</div>`;
    if (gr.type === 'mcq') return `<div class="lq-group">${head}${gr.items.map(it => `<div class="lq-item" data-item="${it.n}"><div><span class="qn">${it.n}</span> ${esc(it.q)}</div>
      <div class="lq-opts">${it.options.map((o, k) => `<label><input type="radio" name="q${it.n}" value="${k}"> <b>${L[k]}</b>${o === L[k] ? '' : ' ' + esc(o)}</label>`).join('')}</div><div class="lq-fb" hidden></div></div>`).join('')}</div>`;
    if (TF[gr.type]) return `<div class="lq-group">${head}${gr.items.map(it => `<div class="lq-item" data-item="${it.n}"><div><span class="qn">${it.n}</span> ${esc(it.text)}</div>
      <div class="lq-tf">${TF[gr.type].map(v => `<label><input type="radio" name="q${it.n}" value="${v}"> ${v}</label>`).join('')}</div><div class="lq-fb" hidden></div></div>`).join('')}</div>`;
    if (gr.type === 'match') {
      const box = gr.options.some(o => label(o)) ? `<div class="lq-box">${gr.options.map(o => `<div><b>${esc(code(o))}</b> ${esc(label(o))}</div>`).join('')}</div>` : '';
      return `<div class="lq-group">${head}${box}${gr.items.map(it => `<div class="lq-item lq-row" data-item="${it.n}"><span class="qn">${it.n}</span><span style="flex:1">${esc(it.text)}</span><select data-qn="${it.n}"><option value="">–</option>${gr.options.map(o => `<option>${esc(code(o))}</option>`).join('')}</select><div class="lq-fb" hidden></div></div>`).join('')}</div>`;
    }
    if (gr.type === 'multi') return `<div class="lq-group">${head}<div class="lq-item" data-item="${gr.n.join(',')}"><div><span class="qn">${gr.n.join('–')}</span> ${esc(gr.q)}</div>
      <div class="lq-opts">${gr.options.map(o => `<label><input type="checkbox" data-multi="${gi}" value="${esc(code(o))}"> <b>${esc(code(o))}</b> ${esc(label(o))}</label>`).join('')}</div><div class="lq-fb" hidden></div></div></div>`;
    const cls = gr.type === 'table' ? 'lq-table' : 'lq-notes';
    return `<div class="lq-group">${head}<div class="${cls}">${gr.items.map(it => `<div class="lq-item lq-gap" data-item="${it.n}">${esc(it.text).replace('___', `<span class="qn">${it.n}</span><input class="gap" data-qn="${it.n}" autocomplete="off" spellcheck="false" size="12">`)}<div class="lq-fb" hidden></div></div>`).join('')}</div></div>`;
  }
  const questionsHtml = p => `<div class="lq">${p.groups.map(groupHtml).join('')}</div>`;

  // Chọn 2 đáp án: không cho tick quá 2
  function bind(root) {
    if (g.ChoiceKit && root) g.ChoiceKit.attach(root); // phím A–D/1–4 + gạch đáp án (choice-kit.js)
    $$('input[data-multi]', root).forEach(c => c.addEventListener('change', () => { const same = $$(`input[data-multi="${c.dataset.multi}"]:checked`, root); if (same.length > 2) c.checked = false; }));
    $$('input.gap', root).forEach((inp, k, arr) => inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); if (arr[k + 1]) arr[k + 1].focus(); } }));
  }

  // Đánh dấu kết quả; onEvidence(n) khi bấm nút xem chỗ có đáp án
  function mark(root, res, evLabel, onEvidence) {
    $$('.lq-item', root).forEach(item => {
      const ns = item.dataset.item.split(',').map(Number), r = res[ns[0]]; if (!r) return;
      const ok = ns.every(n => res[n].ok), part = ns.some(n => res[n].ok);
      item.classList.add(ok ? 'ok' : part ? 'half' : 'no');
      const fb = $('.lq-fb', item); fb.hidden = false;
      fb.innerHTML = `${ok ? '✅' : '❌'} ${t('Đáp án: <b>{a}</b>', { a: esc(r.answer) })}${r.over ? ` <span class="tiny">(${t('vượt quá số từ cho phép')})</span>` : ''} ${r.cue && onEvidence ? `<button class="btn sm ghost" data-ev="${ns[0]}">${evLabel}</button>` : ''}${r.stm ? `<div class="small" style="margin-top:.3rem">${r.stm.map((s, k) => `<div>${k === +r.alts[0] ? '✅ <b>' : ''}(${L[k]}) ${esc(s)}${k === +r.alts[0] ? '</b>' : ''}</div>`).join('')}</div>` : ''}`;
      $$('input, select', item).forEach(x => x.disabled = true);
    });
    if (onEvidence) $$('[data-ev]', root).forEach(b => b.onclick = () => onEvidence(+b.dataset.ev));
    stats(root, res);
  }

  // Bảng độ chính xác theo dạng câu hỏi + nút "Làm lại câu sai" (chỉ mở lại câu sai, ẩn câu đúng, chấm lại tại chỗ)
  const TYPE_NAME = () => ({ mcq: t('Trắc nghiệm'), multi: t('Chọn 2 đáp án'), match: t('Nối thông tin'), tfng: 'TRUE / FALSE / NOT GIVEN', ynng: 'YES / NO / NOT GIVEN', gap: t('Điền từ') });
  function stats(root, res) {
    const by = {};
    Object.entries(res).forEach(([n, r]) => { const k = r.type || 'gap'; (by[k] = by[k] || { ok: 0, all: 0, wrong: [] }).all++; if (r.ok) by[k].ok++; else by[k].wrong.push(n); });
    if (Object.keys(by).length < 1) return;
    const old = root.querySelector('.qe-stats'); if (old) old.remove();
    const wrongN = Object.values(res).filter(r => !r.ok).length;
    root.insertAdjacentHTML('afterbegin', `<div class="card qe-stats"><div class="row between" style="gap:.5rem;flex-wrap:wrap"><b>📊 ${t('Kết quả theo dạng câu hỏi')}</b>${wrongN ? `<button type="button" class="btn sm primary" data-retake>↻ ${t('Làm lại {n} câu sai', { n: wrongN })}</button>` : ''}</div>
      <table class="qe-tbl"><tr><th>${t('Dạng câu hỏi')}</th><th>${t('Đúng')}</th><th>%</th><th>${t('Câu sai')}</th></tr>${Object.entries(by).map(([k, v]) => `<tr><td>${esc(TYPE_NAME()[k] || k)}</td><td>${v.ok}/${v.all}</td><td><span class="qe-pct ${v.ok / v.all >= 0.75 ? 'ok' : v.ok / v.all >= 0.5 ? 'mid' : 'no'}">${Math.round(v.ok / v.all * 100)}%</span></td><td>${v.wrong.map(n => `<button type="button" class="qe-n" data-goq="${n}">${n}</button>`).join(' ') || '–'}</td></tr>`).join('')}</table></div>`);
    $$('[data-goq]', root).forEach(b => b.onclick = () => { const el = itemOf(root, b.dataset.goq); if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.classList.add('qe-flash'); setTimeout(() => el.classList.remove('qe-flash'), 1200); } });
    const rb = $('[data-retake]', root); if (rb) rb.onclick = () => retake(root, res);
  }
  function retake(root, res) {
    const items = $$('.lq-item', root);
    items.forEach(item => {
      const ns = item.dataset.item.split(',').map(Number), ok = ns.every(n => res[n] && res[n].ok);
      item.hidden = ok; if (ok) return;
      item.classList.remove('no', 'half', 'ok'); const fb = $('.lq-fb', item); if (fb) { fb.hidden = true; fb.innerHTML = ''; }
      $$('input, select', item).forEach(x => { x.disabled = false; if (x.type === 'radio' || x.type === 'checkbox') x.checked = false; else x.value = ''; });
    });
    const st = $('.qe-stats', root); if (st) st.innerHTML = `<div class="row between" style="gap:.5rem;flex-wrap:wrap"><b>↻ ${t('Làm lại các câu sai')}</b><span><button type="button" class="btn sm primary" data-recheck>${t('Kiểm tra')}</button> <button type="button" class="btn sm ghost" data-showall>${t('Hiện tất cả câu')}</button></span></div>`;
    $('[data-showall]', root).onclick = () => items.forEach(i => { i.hidden = false; });
    $('[data-recheck]', root).onclick = () => {
      let right = 0, total = 0;
      items.filter(i => !i.hidden).forEach(item => {
        const ns = item.dataset.item.split(',').map(Number), r = res[ns[0]]; if (!r) return;
        let ok;
        if (r.type === 'multi') { const picked = $$('input[data-multi]:checked', item).map(x => x.value); ok = picked.length === r.alts.length && picked.every(x => r.alts.includes(x)); }
        else if (r.type === 'mcq' || r.type === 'tfng' || r.type === 'ynng') { const v = $('input[type=radio]:checked', item); ok = !!v && String(v.value) === String(r.alts[0]); }
        else if (r.type === 'match') { const v = $('select', item); ok = !!v && v.value === r.alts[0]; }
        else { const v = $('input', item); ok = !!v && gradeGap({ a: r.alts }, r.limit, v.value).ok; }
        total++; if (ok) right++;
        item.classList.add(ok ? 'ok' : 'no'); const fb = $('.lq-fb', item); fb.hidden = false; fb.innerHTML = `${ok ? '✅' : '❌'} ${t('Đáp án: <b>{a}</b>', { a: esc(r.answer) })}`;
        $$('input, select', item).forEach(x => x.disabled = true);
      });
      st.innerHTML = `<b>${t('Làm lại: đúng {right}/{total} câu', { right, total })}</b> <button type="button" class="btn sm ghost" data-showall2>${t('Hiện tất cả câu')}</button>`;
      $('[data-showall2]', root).onclick = () => items.forEach(i => { i.hidden = false; });
    };
    const first = items.find(i => !i.hidden); if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  // Quy đổi điểm thô → band (thang công bố phổ biến, chỉ tham khảo)
  const BAND = {
    listening: [[39, 9], [37, 8.5], [35, 8], [32, 7.5], [30, 7], [26, 6.5], [23, 6], [18, 5.5], [16, 5], [13, 4.5], [10, 4], [8, 3.5], [6, 3], [4, 2.5], [0, 0]],
    'reading-gt': [[40, 9], [39, 8.5], [37, 8], [36, 7.5], [34, 7], [32, 6.5], [30, 6], [27, 5.5], [23, 5], [19, 4.5], [15, 4], [12, 3.5], [9, 3], [6, 2.5], [0, 0]], // General Training (khắt khe hơn Academic)
    reading: [[39, 9], [37, 8.5], [35, 8], [33, 7.5], [30, 7], [27, 6.5], [23, 6], [19, 5.5], [15, 5], [13, 4.5], [10, 4], [8, 3.5], [6, 3], [4, 2.5], [0, 0]],
  };
  const bandOf = (raw, skill = 'listening') => (BAND[skill].find(([m]) => raw >= m) || [0, 0])[1];
  // Điểm tổng IELTS: trung bình 4 kỹ năng, .25 làm tròn lên .5, .75 làm tròn lên số nguyên
  const overall = bands => { const avg = bands.reduce((a, b) => a + b, 0) / bands.length; const f = avg - Math.floor(avg); return Math.floor(avg) + (f >= 0.75 ? 1 : f >= 0.25 ? 0.5 : 0); };

  // Câu q đã được trả lời chưa (radio/checkbox đã chọn, ô điền/select có giá trị) – dùng cho bảng số câu
  const itemOf = (root, q) => [...root.querySelectorAll('[data-item]')].find(x => x.dataset.item.split(',').includes(String(q)));
  const answered = (root, q) => { const el = itemOf(root, q); return !!el && [...el.querySelectorAll('input, select')].some(i => i.type === 'radio' || i.type === 'checkbox' ? i.checked : i.value.trim()); };
  // Lời giải 3 phần chuẩn chữa đề: 📍 đoạn chứa đáp án · 🔁 từ khóa câu hỏi ↔ paraphrase trong bài · 💡 vì sao
  const explainHtml = e => !e ? '' : `<div class="qx">${e.para ? `<div class="qx-r"><span class="qx-l">📍 ${t('Vị trí')}</span><span>${t('Đoạn {p}', { p: esc(e.para) })}</span></div>` : ''}${(e.keys || []).length ? `<div class="qx-r"><span class="qx-l">🔁 ${t('Từ khóa ↔ Paraphrase')}</span><span>${e.keys.map(k2 => `<i>${esc(k2[0])}</i> ≈ <b>${esc(k2[1])}</b>`).join('<br>')}</span></div>` : ''}${e.why ? `<div class="qx-r"><span class="qx-l">💡 ${t('Vì sao')}</span><span translate="${XL === 'vi' || (XT && XT[fnv(e.why)]) ? 'no' : 'yes'}"${XL !== 'vi' && !(XT && XT[fnv(e.why)]) ? ' class="tr-wait"' : ''}>${esc(exT(e.why))}</span></div>` : ''}</div>`;
  g.QE = { exT, explainHtml, itemOf, answered, norm, words, gradeGap, collect, groupHtml, questionsHtml, bind, mark, numsOf, bandOf, overall, code, label };
})(typeof self !== 'undefined' ? self : this);
