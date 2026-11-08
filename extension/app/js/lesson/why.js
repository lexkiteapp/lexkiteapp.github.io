/* Lời giải "Vì sao?" theo CÂU, dùng chung mọi dạng bài #/lesson (docs/specs/sentence-builder.md).
 * Thuần (không DOM, 0 lượt AI): so câu người học với đáp án + luật trật tự từ + nghĩa từ nhiễu + ví dụ MỚI (không bao giờ trùng câu bài tập).
 * explain(it, ans, deps) → dữ liệu; html(r, t, esc) → HTML. deps: { gloss(w) → nghĩa theo ngôn ngữ người học, pos(w) → 'noun'|'adjective'|…, examples: [câu en] } */
(function (g) {
  const norm = s => String(s || '').toLowerCase().replace(/[’‘]/g, "'").replace(/[^a-z0-9' -]+/g, ' ').replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
  const toks = s => (Array.isArray(s) ? s.join(' ') : String(s || '')).replace(/[“”"]/g, '').split(/\s+/).map(x => x.replace(/^[^A-Za-z0-9']+|[^A-Za-z0-9']+$/g, '')).filter(Boolean);
  const k = w => norm(w);
  const set = s => new Set(s.split(' '));
  const FREQ = set('always usually often sometimes rarely seldom never frequently normally generally occasionally');
  const MODAL = set('can could will would shall should must may might');
  const AUX = set('am is are was were be been being do does did have has had');
  const FUNC = set('a an the to of in on at for by with from and or but not no this that these those my your his her its our their i you he she it we they me him us them is are was were be');
  // động từ + to + V (Swan, Practical English Usage §295; Cambridge Grammar "verb + to-infinitive")
  const TOINF = 'afford agree aim appear arrange attempt choose decide deserve expect fail forget hesitate hope intend learn manage mean need offer plan prepare pretend promise refuse seem struggle tend threaten try want wish'.split(' ');
  const FORMS = new Map();
  TOINF.forEach(v => {
    const e = v.endsWith('e'), y = /[^aeiou]y$/.test(v), b = y ? v.slice(0, -1) : v;
    [v, y ? b + 'ies' : v + (/(s|sh|ch|x|o)$/.test(v) ? 'es' : 's'), y ? b + 'ied' : v + (e ? 'd' : 'ed'), (e && v !== 'agree' ? v.slice(0, -1) : v) + 'ing'].forEach(f => FORMS.set(f, v));
  });
  [['chose', 'choose'], ['chosen', 'choose'], ['forgot', 'forget'], ['forgotten', 'forget'], ['learnt', 'learn'], ['meant', 'mean'], ['planned', 'plan'], ['planning', 'plan'], ['regretted', 'regret']].forEach(([f, v]) => FORMS.set(f, v));

  // Ví dụ mẫu theo luật: câu tiếng Anh viết tay, ngắn (≤ 9 từ), A2–B1 – luôn khác câu bài tập (lọc ở pickEx)
  const RULE_EX = {
    freq: ['She often walks to work.', 'We usually have dinner at seven.', 'He never drinks coffee at night.'],
    freqBe: ['They are always on time.', 'The bus is often late.'],
    modal: ['You should drink more water.', 'She can speak three languages.'],
    toinf: ['They decided to leave early.', 'He managed to finish on time.', 'Many students struggle to pay rent.'],
    mod: ['She works in a coffee shop.', 'The city bus is late again.'],
    adj: ['He bought a new phone.', 'It was a long day.'],
  };

  // So 2 dãy từ: LCS → từ đúng chỗ; phần còn lại = sai chỗ / thừa / thiếu
  function diff(ans, answer) {
    const A = toks(answer), B = toks(ans), a = A.map(k), b = B.map(k);
    const left = a.slice(), inA = b.map(w => { const i = left.indexOf(w); if (i < 0) return false; left[i] = null; return true; });
    const extra = B.filter((w, i) => !inA[i]);
    const used = b.filter((w, i) => inA[i]);
    const pool = used.slice(), missingIdx = []; a.forEach((w, j) => { const i = pool.indexOf(w); if (i < 0) missingIdx.push(j); else pool[i] = null; });
    // LCS giữa đáp án và phần từ đúng người học dùng
    const n = a.length, m = used.length, L = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
    for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = a[i] === used[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
    const keep = new Set(); for (let i = 0, j = 0; i < n && j < m;) { if (a[i] === used[j]) { keep.add(i); i++; j++; } else if (L[i + 1][j] >= L[i][j + 1]) i++; else j++; }
    const moved = []; a.forEach((w, j) => { if (!keep.has(j) && !missingIdx.includes(j)) moved.push(j); });
    const ok = !extra.length && !missingIdx.length && !moved.length && B.length === A.length;
    return { A, B, ok, extra, missing: missingIdx.map(j => A[j]), moved: moved.map(j => ({ w: A[j], j, after: A[j - 1] || '', before: A[j + 1] || '' })) };
  }
  const lev = (s, t) => { const d = Array.from({ length: s.length + 1 }, (x, i) => [i]); for (let j = 1; j <= t.length; j++) d[0][j] = j; for (let i = 1; i <= s.length; i++) for (let j = 1; j <= t.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (s[i - 1] === t[j - 1] ? 0 : 1)); return d[s.length][t.length]; };

  // Luật trật tự từ tìm thấy trong câu đúng (chỉ luật chắc chắn đúng; không chắc → không nói)
  function rules(answer, pos) {
    const A = toks(answer), a = A.map(k), out = [], P = w => (pos && pos(w)) || '';
    a.forEach((w, i) => {
      if (FREQ.has(w) && i > 0 && a[i + 1]) {
        if (AUX.has(a[i - 1]) || MODAL.has(a[i - 1])) out.push({ k: 'freqBe', i, adv: A[i], be: A[i - 1] });
        else out.push({ k: 'freq', i, adv: A[i], v: A[i + 1] });
      }
      if (MODAL.has(w) && a[i + 1] && !FUNC.has(a[i + 1]) && !FREQ.has(a[i + 1]) && a[i + 1] !== 'not') out.push({ k: 'modal', i, m: A[i], v: A[i + 1] });
      if (FORMS.has(w) && a[i + 1] === 'to' && a[i + 2] && !FUNC.has(a[i + 2])) out.push({ k: 'toinf', i, v: A[i], v2: A[i + 2] });
      if (i + 1 < a.length && P(a[i + 1]) === 'noun' && !FUNC.has(w) && !FUNC.has(a[i + 1])) {
        if (P(w) === 'adjective') out.push({ k: 'adj', i, a: A[i], b: A[i + 1] });
        else if (P(w) === 'noun') out.push({ k: 'mod', i, a: A[i], b: A[i + 1] });
      }
    });
    return out;
  }

  // Ví dụ MỚI: không trùng, không gần trùng (≥ 80 % từ chung) câu bài tập
  function notSame(x, sent) {
    const a = norm(x), b = norm(sent); if (!a || !b) return !!a;
    if (a === b || a.includes(b) || b.includes(a)) return false;
    const A = new Set(a.split(' ')), B = new Set(b.split(' ')); let c = 0; A.forEach(w => { if (B.has(w)) c++; });
    return c / Math.max(A.size, B.size) < 0.8;
  }
  function pickEx(sent, rs, extra, n = 2) {
    const seen = [], out = [];
    const add = x => { if (out.length < n && x && notSame(x, sent) && seen.every(y => notSame(x, y))) { out.push(x); seen.push(x); } };
    (extra || []).forEach(add); // câu thật của từ (gold, thẻ) trước
    rs.forEach(r => (RULE_EX[r.k] || []).forEach(add));
    return out;
  }

  /** Dữ liệu lời giải cho 1 câu đã chấm. it = mục bài (engine.build), ans = câu trả lời (mảng ô / chuỗi / phương án) */
  function explain(it, ans, deps = {}) {
    const gloss = w => (deps.gloss && deps.gloss(w)) || '';
    const sent = it.sent || it.answer || '';
    const r = { type: it.type, sent, mistakes: [], rules: [], noise: [], ex: [] };
    if (it.type === 'build' || it.type === 'tr' || it.type === 'type') {
      const d = diff(ans == null ? [] : ans, it.answer);
      if (it.type === 'type') { // nghe-chép: ghép từ thừa ↔ từ thiếu gần giống = lỗi chính tả
        d.extra.slice().forEach(w => { const j = d.missing.findIndex(m => lev(k(w), k(m)) <= Math.max(1, Math.floor(k(m).length / 3))); if (j >= 0) { r.mistakes.push({ k: 'spell', w, r: d.missing[j] }); d.missing.splice(j, 1); d.extra.splice(d.extra.indexOf(w), 1); } });
      }
      d.moved.forEach(x => r.mistakes.push(Object.assign({ k: 'move' }, x)));
      d.extra.forEach(w => r.mistakes.push({ k: 'extra', w, g: it.type === 'type' ? '' : gloss(w) }));
      d.missing.forEach(w => r.mistakes.push({ k: 'miss', w }));
      r.mine = d.B.join(' ');
      if (it.tiles) { const A = toks(it.answer).map(k), used = new Set(d.extra.map(k)); it.tiles.filter(w => !A.includes(k(w)) && !used.has(k(w))).forEach(w => r.noise.push({ w, g: gloss(w) })); } // từ nhiễu đã dùng = đã giải thích ở "Lỗi của bạn" → không lặp
      const all = rules(it.answer, deps.pos), hot = new Set(d.moved.map(x => x.j));
      const isHot = x => hot.has(x.i) || hot.has(x.i + 1) || (x.k === 'toinf' && hot.has(x.i + 2)), PRI = { freq: 0, freqBe: 0, modal: 1, toinf: 1, mod: 2, adj: 3 }, by = (x, y) => PRI[x.k] - PRI[y.k];
      r.rules = all.filter(isHot).sort(by).concat(all.filter(x => !isHot(x)).sort(by)).slice(0, 3); // luật dính tới lỗi vừa mắc trước, rồi luật quan trọng hơn
    } else if (it.options && ans != null && k(ans) !== k(it.answer)) { // gap / mean / pic / q: phương án sai ↔ đáp án
      r.mistakes.push({ k: 'pick', w: String(ans), g: gloss(ans), r: it.answer, g2: gloss(it.answer) });
      it.options.filter(o => k(o) !== k(it.answer) && k(o) !== k(ans)).forEach(w => r.noise.push({ w, g: gloss(w) }));
      if (it.sent) r.rules = rules(it.sent, deps.pos).slice(0, 2);
    } else if (it.sent) r.rules = rules(it.sent, deps.pos).slice(0, 2);
    r.ex = pickEx(sent, r.rules, deps.examples);
    return r;
  }

  const q = (esc, w) => `“<span lang="en">${esc(w)}</span>”`;
  /** HTML (chữ giao diện qua t(), 15 ngôn ngữ; chữ tiếng Anh gắn lang="en") */
  function html(r, t, esc) {
    if (!r) return '';
    const Q = w => q(esc, w), li = s => `<li>${s}</li>`, ul = (a, c = '') => `<ul class="lsn-why-list${c}">${a.join('')}</ul>`, H = s => `<p class="tiny muted"><b>${esc(s)}</b></p>`;
    let h = '';
    if (r.mistakes.length) {
      h += H(t('Lỗi của bạn'));
      if (r.mine) h += `<p class="small"><s lang="en">${esc(r.mine)}</s><br>✓ <span lang="en">${esc(r.sent)}</span></p>`;
      h += ul(r.mistakes.slice(0, 5).map(m => li(
        m.k === 'move' ? (!m.after ? t('{w} đứng đầu câu, trước {b}.', { w: Q(m.w), b: Q(m.before) }) : !m.before ? t('{w} đứng cuối câu, sau {a}.', { w: Q(m.w), a: Q(m.after) }) : t('{w} đứng sau {a}, trước {b}.', { w: Q(m.w), a: Q(m.after), b: Q(m.before) }))
          : m.k === 'extra' ? (m.g ? t('{w} ({g}) là từ thừa – câu không có ý này.', { w: Q(m.w), g: esc(m.g) }) : t('{w} là từ thừa – câu không có từ này.', { w: Q(m.w) }))
            : m.k === 'miss' ? t('Còn thiếu {w}.', { w: Q(m.w) })
              : m.k === 'spell' ? t('Viết đúng là {r}, không phải {w}.', { r: Q(m.r), w: Q(m.w) })
                : (m.g && m.g2 ? t('Bạn chọn {w} ({g}), nhưng câu cần {r} ({g2}).', { w: Q(m.w), g: esc(m.g), r: Q(m.r), g2: esc(m.g2) }) : t('Bạn chọn {w}, nhưng câu cần {r}.', { w: Q(m.w), r: Q(m.r) })))));
    }
    if (r.rules.length) {
      h += H(t('Trật tự từ trong câu'));
      h += ul(r.rules.map(x => li(
        x.k === 'freq' ? t('Trạng từ tần suất {adv} đứng sau chủ ngữ, trước động từ chính {v}: S + {adv} + V.', { adv: Q(x.adv), v: Q(x.v) })
          : x.k === 'freqBe' ? t('Trạng từ tần suất {adv} đứng sau {be}.', { adv: Q(x.adv), be: Q(x.be) })
            : x.k === 'modal' ? t('Sau {m} là động từ nguyên mẫu, không có “to”: {m} + {v}.', { m: Q(x.m), v: Q(x.v) })
              : x.k === 'toinf' ? t('{v} đi với “to” + động từ nguyên mẫu: {v} to {v2}.', { v: Q(x.v), v2: Q(x.v2) })
                : t('Từ bổ nghĩa đứng trước từ chính: {ab}, không nói {ba}.', { ab: Q(x.a + ' ' + x.b), ba: Q(x.b + ' ' + x.a) }))));
    }
    if (r.noise.length) h += H(t('Vì sao các từ còn lại sai')) + ul(r.noise.slice(0, 4).map(x => li(x.g ? t('{w} ({g}) – không có trong nghĩa câu.', { w: Q(x.w), g: esc(x.g) }) : t('{w} – không có trong nghĩa câu.', { w: Q(x.w) }))));
    if (r.ex.length) h += H(t('Ví dụ khác')) + ul(r.ex.map(x => li(`<span lang="en">${esc(x)}</span>`)), ' lsn-why-ex');
    return h;
  }

  g.LessonWhy = { diff, rules, explain, html, notSame, pickEx, RULE_EX, TOINF };
})(typeof self !== 'undefined' ? self : globalThis);
