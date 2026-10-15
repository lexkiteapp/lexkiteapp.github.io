/* Bộ câu hỏi kiểu IELTS dùng chung cho Listening & Reading:
 * điền từ (form/note/table/sentence/summary, có giới hạn số từ), trắc nghiệm A–D, nối (tiêu đề i/ii/iii, đoạn A–F, đặc điểm),
 * chọn 2 đáp án, TRUE/FALSE/NOT GIVEN, YES/NO/NOT GIVEN. Chấm điểm + đánh dấu đúng/sai + nút "xem chỗ có đáp án". */
(function (g) {
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = (s, el = document) => el.querySelector(s), $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const L = 'ABCDEFGH';
  const code = o => String(o).split(' ')[0];
  const label = o => String(o).slice(code(o).length + 1);
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
        gr.n.forEach((n, k) => { res[n] = { ok: k < correct.length, given: picked.join(', '), answer: gr.a.join(', '), cue: gr.cue, q: gr.q }; });
        return;
      }
      gr.items.forEach(it => {
        const el = $(`[data-qn="${it.n}"]`, root);
        if (gr.type === 'mcq') { const v = $(`input[name="q${it.n}"]:checked`, root); const given = v ? +v.value : null; res[it.n] = { ok: given === it.a, given: given == null ? '' : L[given], answer: L[it.a] + '. ' + it.options[it.a], cue: it.cue, q: it.q }; }
        else if (TF[gr.type]) { const v = $(`input[name="q${it.n}"]:checked`, root); const given = v ? v.value : ''; res[it.n] = { ok: given === it.a, given, answer: it.a, cue: it.cue, q: it.text }; }
        else if (gr.type === 'match') { const v = el ? el.value : ''; const opt = gr.options.find(o => code(o) === it.a); res[it.n] = { ok: v === it.a, given: v, answer: it.a + (opt && label(opt) ? ' – ' + label(opt) : ''), cue: it.cue, q: it.text }; }
        else { const v = el ? el.value.trim() : ''; const r = gradeGap(it, gr.limit, v); res[it.n] = { ok: r.ok, over: r.over, given: v, answer: it.a[0], cue: it.cue, q: it.text }; }
      });
    });
    return res;
  }

  // ---------- Hiển thị ----------
  function groupHtml(gr, gi) {
    const head = `<div class="lq-instr">${gr.title ? `<b>${esc(gr.title)}</b><br>` : ''}<i>${esc(gr.instr)}</i></div>`;
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
      fb.innerHTML = `${ok ? '✅' : '❌'} ${t('Đáp án: <b>{a}</b>', { a: esc(r.answer) })}${r.over ? ` <span class="tiny">(${t('vượt quá số từ cho phép')})</span>` : ''} ${r.cue && onEvidence ? `<button class="btn sm ghost" data-ev="${ns[0]}">${evLabel}</button>` : ''}`;
      $$('input, select', item).forEach(x => x.disabled = true);
    });
    if (onEvidence) $$('[data-ev]', root).forEach(b => b.onclick = () => onEvidence(+b.dataset.ev));
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
  g.QE = { itemOf, answered, norm, words, gradeGap, collect, groupHtml, questionsHtml, bind, mark, numsOf, bandOf, overall, code, label };
})(typeof self !== 'undefined' ? self : this);
