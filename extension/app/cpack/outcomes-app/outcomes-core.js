/* 📈 Đầu ra 3–6 tháng – lõi THUẦN (docs/specs/outcomes-3-6m.md §5): chỉ số nói/viết, rubric → CEFR, gộp lần đo, lịch 4 tuần, XP theo đầu ra.
 * Không DOM, không t() (dùng được trong Node: scripts/test/outcomes.mjs). Soát lỗi dùng LK_WRITE.check (writecheck-rules.js) khi có.
 *   Outcomes.speech({text, sec}) · Outcomes.read({target, heard, sec}) · Outcomes.writing({text}) → chỉ số
 *   Outcomes.estimate({sp, rd, wr}) → {fl, rg, ac, ph, wr, all} (CEFR, null khi thiếu dữ liệu) · Outcomes.merge(a, b) · Outcomes.due(checks, now)
 * Ngưỡng là bản khởi đầu minh bạch (khóa bằng test), hiệu chuẩn lại trên CI ở mốc 3 – UI luôn ghi "ước tính". */
(function (g) {
  const LV = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  // Ngưỡng tối thiểu để đạt A2, B1, B2, C1, C2 (dưới ngưỡng A2 = A1). low: true = càng thấp càng tốt (ngưỡng tối đa).
  const RUBRIC = {
    wpm: { at: [55, 80, 105, 125, 145] }, // nói tự do, từ/phút (bản ghi chữ – không tính từ đệm)
    acc: { at: [60, 75, 85, 92, 97] }, // đọc to: % từ máy nghe đúng (độ rõ)
    mattr: { at: [0.5, 0.6, 0.68, 0.75, 0.82] }, // đa dạng từ (MATTR cửa sổ 50 – cửa sổ 25 thổi phồng bài ngắn: đoạn A2 lặp từ 0,63 vẫn ra B1)
    epw: { at: [15, 10, 6, 3, 1.5], low: true }, // lỗi / 100 từ
    sl: { at: [7, 10, 13, 16, 19] }, // độ dài câu viết TB (từ)
    ww: { at: [40, 80, 120, 160, 200] }, // số từ viết trong 10 phút
    link: { at: [0.5, 1.5, 2.5, 3.5, 4.5] }, // từ nối / 100 từ
  };
  // Trần theo khía cạnh: máy chỉ bắt lỗi phổ biến (LK_WRITE) và MATTR không đo độ tinh của từ → Chính xác/Vốn từ tối đa B2;
  // tốc độ/độ rõ/viết tối đa C1 cho tới khi hiệu chuẩn CI (mốc 3) – không bao giờ hứa C2 từ số đo máy.
  const CAP = { fl: 'C1', rg: 'B2', ac: 'B2', ph: 'C1', wr: 'C1' };
  const MIN_SPEECH = 20, MIN_SEC = 10, MIN_RANGE = 50, MIN_WRITE = 30, GAP_DAYS = 28, DAY = 864e5;
  const words = s => String(s || '').match(/[A-Za-z][A-Za-z'’-]*/g) || [];
  const r1 = x => Math.round(x * 10) / 10, r2 = x => Math.round(x * 100) / 100;
  function mattr(ws, win = 50) {
    const a = ws.map(w => w.toLowerCase().replace(/’/g, "'"));
    if (!a.length) return 0;
    if (a.length <= win) return r2(new Set(a).size / a.length);
    let sum = 0; const n = a.length - win + 1;
    for (let i = 0; i < n; i++) sum += new Set(a.slice(i, i + win)).size / win;
    return r2(sum / n);
  }
  // Lỗi ngữ pháp + chính tả (không tính văn phong/dấu câu – bản ghi chữ của bài nói không có dấu)
  function errors(text) {
    const W = g.LK_WRITE, out = { n: 0, rules: {}, items: [] };
    if (!W || !W.check || !text) return out;
    let list = []; try { list = W.check(String(text)) || []; } catch (e) { list = []; }
    for (const x of list) {
      if (x.type !== 'grammar' && x.type !== 'spelling') continue;
      out.n++; const k = x.rule || x.title || 'x'; out.rules[k] = (out.rules[k] || 0) + 1;
      if (out.items.length < 12) out.items.push({ rule: k, title: x.title || '', bad: String(text).slice(x.s, x.e), fix: (x.reps && x.reps[0]) || '', lesson: x.lesson || '' });
    }
    return out;
  }
  const per100 = (n, w) => (w ? r1(n / w * 100) : 0);
  function speech(o) {
    const text = String((o && o.text) || '').trim(), sec = Math.max(0, +(o && o.sec) || 0), ws = words(text), E = errors(text);
    return { w: ws.length, sec: Math.round(sec), wpm: sec >= MIN_SEC ? Math.round(ws.length / (sec / 60)) : 0, mattr: mattr(ws), epw: per100(E.n, ws.length), few: ws.length < MIN_SPEECH || sec < MIN_SEC, errs: E.rules, items: E.items }; // < 10 giây: không đủ để đo trôi chảy
  }
  // Đọc to: căn chữ theo LCS giữa đoạn mẫu và câu máy nghe được → % từ khớp (độ rõ)
  function read(o) {
    const a = words(o && o.target).map(w => w.toLowerCase()), b = words(o && o.heard).map(w => w.toLowerCase()), n = a.length, m = b.length;
    if (!n) return { acc: 0, wpm: 0, w: m };
    let prev = new Array(m + 1).fill(0);
    for (let i = n - 1; i >= 0; i--) { const cur = new Array(m + 1).fill(0); for (let j = m - 1; j >= 0; j--) cur[j] = a[i] === b[j] ? prev[j + 1] + 1 : Math.max(prev[j], cur[j + 1]); prev = cur; }
    const sec = +(o && o.sec) || 0;
    return { acc: Math.round(prev[0] / n * 100), wpm: sec >= 5 ? Math.round(m / (sec / 60)) : 0, w: m };
  }
  const LINK = /\b(however|therefore|moreover|furthermore|although|though|because|since|while|whereas|so|but|also|then|finally|firstly|secondly|in addition|for example|for instance|as a result|on the other hand|in contrast|overall|in conclusion|instead|otherwise|meanwhile|unless|despite|even though)\b/gi;
  function writing(o) {
    const text = String((o && o.text) || '').trim(), ws = words(text), E = errors(text);
    const sents = text.split(/[.!?]+(?:\s|$)/).map(s => words(s).length).filter(n => n > 0);
    return { w: ws.length, sl: sents.length ? r1(ws.length / sents.length) : 0, epw: per100(E.n, ws.length), mattr: mattr(ws), link: per100((text.match(LINK) || []).length, ws.length), few: ws.length < MIN_WRITE, errs: E.rules, items: E.items };
  }
  function level(metric, v) {
    const R = RUBRIC[metric]; if (!R || v == null || !isFinite(v)) return null;
    let k = 0; for (let i = 0; i < R.at.length; i++) if (R.low ? v <= R.at[i] : v >= R.at[i]) k = i + 1;
    return LV[k];
  }
  const idx = l => LV.indexOf(l);
  const median = ls => { const a = ls.filter(Boolean).map(idx).sort((x, y) => x - y); if (!a.length) return null; return LV[a[(a.length - 1) >> 1]]; }; // trung vị thấp – không thổi phồng
  function estimate(c) {
    // Kiểm lại ngưỡng từ số đo (không tin cờ few đã lưu – bản ghi cũ/khác phiên bản vẫn chấm đúng luật hiện hành)
    const okSp = p => p && !p.few && p.w >= MIN_SPEECH && (p.sec == null || p.sec >= MIN_SEC), okWr = p => p && !p.few && p.w >= MIN_WRITE;
    const sp = c && okSp(c.sp) ? c.sp : null, rd = c && c.rd && c.rd.w ? c.rd : null, wr = c && okWr(c.wr) ? c.wr : null;
    const wsum = (sp ? sp.w : 0) + (wr ? wr.w : 0);
    const mat = wsum ? ((sp ? sp.mattr * sp.w : 0) + (wr ? wr.mattr * wr.w : 0)) / wsum : null;
    const epw = wsum ? ((sp ? sp.epw * sp.w : 0) + (wr ? wr.epw * wr.w : 0)) / wsum : null;
    const e = { fl: sp ? level('wpm', sp.wpm) : null, rg: mat == null || wsum < MIN_RANGE ? null : level('mattr', mat), ac: epw == null ? null : level('epw', epw), ph: rd ? level('acc', rd.acc) : null, wr: wr ? median([level('ww', wr.w), level('sl', wr.sl), level('link', wr.link)]) : null };
    for (const k of Object.keys(CAP)) if (e[k] && idx(e[k]) > idx(CAP[k])) e[k] = CAP[k];
    const got = [e.fl, e.rg, e.ac, e.ph, e.wr].filter(Boolean);
    e.all = got.length >= 2 ? median(got) : null;
    return e;
  }
  // Gộp 2 danh sách lần đo theo id (hợp, giao hoán, lũy đẳng) – 2 máy cùng đo không mất lần nào; giữ tối đa 36 lần gần nhất
  function merge(a, b) {
    const m = new Map();
    for (const c of [].concat(a || [], b || [])) if (c && c.id && (!m.has(c.id) || (c.at || 0) > (m.get(c.id).at || 0))) m.set(c.id, c);
    return [...m.values()].sort((x, y) => (x.at || 0) - (y.at || 0)).slice(-36);
  }
  function due(checks, now = Date.now()) {
    const last = (checks || []).reduce((t, c) => Math.max(t, c.at || 0), 0);
    if (!last) return { due: true, days: 0, next: now, first: true };
    const next = last + GAP_DAYS * DAY;
    return { due: now >= next, days: Math.max(0, Math.ceil((next - now) / DAY)), next, first: false };
  }
  // Cấp đề: theo placement / lần đo trước; đề khác lần trước cùng cấp
  const bandOf = cefr => (/^A/.test(cefr || '') ? 'a' : /^C/.test(cefr || '') ? 'c' : 'b');
  function pickForm(forms, band, checks) {
    const ids = Object.keys(forms || {}).filter(k => k[0] === band).sort();
    if (!ids.length) return null;
    const used = (checks || []).filter(c => c.form && c.form[0] === band).map(c => c.form);
    const last = used[used.length - 1], fresh = ids.find(k => !used.includes(k));
    return fresh || ids[(ids.indexOf(last) + 1) % ids.length];
  }
  // Thưởng ĐẦU RA (không thưởng chạm): 1 XP / 5 từ đã nói + viết, trần 60
  const xpFor = c => Math.min(60, Math.round((((c && c.sp && c.sp.w) || 0) + ((c && c.rd && c.rd.w) || 0) * 0.2 + ((c && c.wr && c.wr.w) || 0)) / 5));
  // ≤ 3 lỗi ưu tiên (đếm theo luật, gộp nói + viết)
  function topFixes(c, n = 3) {
    const cnt = {}, ex = {};
    for (const p of [c && c.sp, c && c.wr]) if (p) { for (const [k, v] of Object.entries(p.errs || {})) cnt[k] = (cnt[k] || 0) + v; for (const it of p.items || []) if (!ex[it.rule]) ex[it.rule] = it; }
    return Object.keys(cnt).sort((x, y) => cnt[y] - cnt[x] || (x < y ? -1 : 1)).slice(0, n).map(k => Object.assign({ n: cnt[k] }, ex[k] || { rule: k }));
  }
  // Dữ liệu đồng bộ: bỏ ví dụ lỗi chi tiết, cắt bài viết ≤ 1.500 ký tự
  function slim(c) {
    const s = p => p && Object.fromEntries(Object.entries(p).filter(([k]) => k !== 'items'));
    const o = Object.assign({}, c, { sp: s(c.sp), rd: c.rd, wr: s(c.wr) });
    if (o.wr && o.wr.text) o.wr.text = String(o.wr.text).slice(0, 1500);
    return o;
  }
  g.Outcomes = { LV, RUBRIC, CAP, GAP_DAYS, MIN_SPEECH, MIN_WRITE, words, mattr, errors, speech, read, writing, level, estimate, merge, due, bandOf, pickForm, xpFor, topFixes, slim };
  if (typeof module !== 'undefined' && module.exports) module.exports = g.Outcomes;
})(typeof self !== 'undefined' ? self : globalThis);
