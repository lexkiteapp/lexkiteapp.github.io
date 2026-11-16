/* 🗺️ Lộ trình v3 – lõi THUẦN (không DOM, không t()): phần lớn luôn mở, bài nhỏ khóa tuần tự A1→C1, nhảy cóc theo bậc, xếp lớp, di trú tiến độ ux1, gợi ý tiếp.
 * Spec: docs/specs/play-and-speak-path.md. Test: scripts/test/path3.mjs. Giao diện gắn ở ux1.js (cờ path3).
 * Tiến độ prog = { v: 1, done: { track: [id…] }, skip: { track: n } } – hàm trả bản MỚI, không sửa tại chỗ. */
(function (g) {
  const CEFR = ['A1', 'A2', 'B1', 'B2', 'C1'];
  const lv = c => { const i = CEFR.indexOf(String(c || '').toUpperCase().slice(0, 2)); return i < 0 ? 0 : i; };
  const TRACKS = ['words', 'listen', 'speak', 'story', 'grammar', 'exam', 'review'];
  // Thứ tự hiển thị theo mục tiêu (chỉ để sắp, KHÔNG khóa) – nối luật ORDER của LEARNING-PATH §2
  const ORDER = {
    general: ['speak', 'listen', 'words', 'story', 'grammar', 'review', 'exam'],
    ielts: ['words', 'listen', 'speak', 'grammar', 'exam', 'story', 'review'],
    ieltsgt: ['words', 'listen', 'speak', 'grammar', 'exam', 'story', 'review'],
    toeic: ['listen', 'grammar', 'words', 'exam', 'speak', 'story', 'review'],
    toefl: ['words', 'listen', 'speak', 'grammar', 'exam', 'story', 'review'],
  };
  const NOJUMP = { review: 1 }; // Ôn lỗi = hàng thẻ đến hạn của riêng người học, không có bậc để nhảy
  const PASS = 0.8; // nhảy cóc đạt ≥ 80 %

  /** Thang bài của 1 phần: sắp ổn định theo CEFR, chèn nút nhảy cóc ở đầu mỗi bậc (trừ phần không bậc).
   *  items: [{ id, cefr, kind?, href, min? }] → [{ id, cefr, kind, href, min, jump? }] */
  function ladder(track, items) {
    const L = (Array.isArray(items) ? items : []).filter(x => x && x.id != null).map((x, i) => ({ x, i })).sort((a, b) => lv(a.x.cefr) - lv(b.x.cefr) || a.i - b.i).map(o => o.x);
    const out = [], seen = new Set(); let cur = -1;
    for (const x of L) {
      if (seen.has(String(x.id))) continue; // id trùng → bỏ bản sau (id là khóa tiến độ, trùng sẽ đánh xong 2 bài một lúc)
      seen.add(String(x.id));
      const l = lv(x.cefr);
      if (l !== cur && !NOJUMP[track]) { out.push({ id: `jump:${track}:${CEFR[l]}`, cefr: CEFR[l], kind: 'jump', jump: true, href: '', min: 3 }); }
      cur = l;
      out.push({ id: String(x.id), cefr: CEFR[l], kind: x.kind || track, href: x.href || '', min: x.min || 4 });
    }
    return out;
  }
  /** Mọi phần theo mục tiêu. src: { track: items } → [{ id, ladder }] (phần không có bài vẫn hiện, ladder rỗng) */
  function build(src, goal) {
    const ids = (ORDER[goal] || ORDER.ielts).concat(Object.keys(src || {}).filter(k => !TRACKS.includes(k)));
    return ids.map(id => ({ id, ladder: ladder(id, (src || {})[id]) }));
  }
  const empty = () => ({ v: 1, done: {}, skip: {} });
  // Chuẩn hóa prog (dữ liệu đồng bộ có thể hỏng/cũ): done[track] luôn là mảng chuỗi, skip[track] số nguyên ≥ 0
  const obj = o => (o && typeof o === 'object' && !Array.isArray(o) ? o : {});
  function norm(p) {
    const D = obj(p && p.done), S = obj(p && p.skip), out = { v: 1, done: {}, skip: {} };
    for (const k of Object.keys(D)) if (Array.isArray(D[k])) out.done[k] = D[k].filter(x => x != null).map(String);
    for (const k of Object.keys(S)) { const n = Math.floor(+S[k]); if (n > 0) out.skip[k] = n; }
    if (p && p.mig) out.mig = 1;
    return out;
  }
  const doneSet = (p, track) => new Set(norm(p).done[track] || []);
  const accOf = a => { a = +a; return !isFinite(a) || a < 0 ? 0 : a > 1 ? a / 100 : a; }; // nhận 0–1 hoặc 0–100

  /** Trạng thái từng nút: 'done' | 'next' (bài mở đầu tiên chưa xong) | 'open' (mở nhờ nhảy cóc/xếp lớp, chưa xong) | 'lock' | 'jump' (nhảy cóc chưa qua, luôn bấm được).
   *  Luật: bài đầu luôn mở; bài i mở khi bài (không tính nút nhảy) liền trước đã xong, hoặc i < skip[track]. Phần lớn không bao giờ khóa. */
  function status(track, lad, prog) {
    const P = norm(prog), D = new Set(P.done[track] || []), skip = P.skip[track] || 0;
    let prevClear = true; // bài liền trước "đã qua" = đã xong HOẶC nằm trong vùng nhảy cóc/xếp lớp
    const st = (lad || []).map((x, i) => {
      if (x.jump) return D.has(x.id) ? 'done' : 'jump';
      const isDone = D.has(x.id), open = prevClear;
      prevClear = isDone || i < skip;
      return isDone ? 'done' : open ? 'open' : 'lock';
    });
    // 'next' = bài mở chưa xong đầu tiên Ở BIÊN (từ skip trở đi); bài trong vùng đã nhảy vẫn 'open' để chơi lại. Không có ở biên → bài mở chưa xong đầu tiên.
    let at = st.findIndex((s, i) => s === 'open' && i >= skip);
    if (at < 0) at = st.indexOf('open');
    if (at >= 0) st[at] = 'next';
    return st;
  }
  const canPlay = s => s !== 'lock';
  /** Xong 1 bài → prog mới */
  function complete(prog, track, id) {
    const p = norm(prog), D = new Set(p.done[track] || []); D.add(String(id)); p.done[track] = [...D]; return p;
  }
  /** Bỏ qua nút nhảy cóc của bậc L: mở tới hết bậc L (tức tới nút đầu bậc kế). acc 0–1. Trượt → prog giữ nguyên (không phạt, thử lại thoải mái). */
  function jump(prog, track, lad, jumpId, acc) {
    const at = lad.findIndex(x => x.id === jumpId);
    if (at < 0 || !lad[at].jump || accOf(acc) < PASS) return norm(prog);
    const l = lv(lad[at].cefr), end = lad.findIndex((x, i) => i > at && lv(x.cefr) > l);
    const p = complete(prog, track, jumpId);
    p.skip[track] = Math.max(p.skip[track] || 0, end < 0 ? lad.length : end);
    return p;
  }
  /** Xếp lớp ban đầu (#/placement): mọi phần mở hết các bậc dưới cefr. Không bao giờ hạ skip đã có. */
  function place(prog, tracks, cefr) {
    const p = norm(prog), l = lv(cefr);
    for (const t of tracks || []) {
      const at = t.ladder.findIndex(x => lv(x.cefr) >= l);
      const to = at < 0 ? t.ladder.length : at;
      if (!NOJUMP[t.id] && to > (p.skip[t.id] || 0)) p.skip[t.id] = to;
    }
    return p;
  }
  // Loại nút ux1 cũ → phần mới (di trú)
  const KIND2TRACK = { lesson: 'words', listen: 'listen', speak: 'speak', story: 'story', radio: 'story', review: 'review', exam: 'exam' };
  /** Di trú tiến độ ux1: oldKinds = loại các nút ĐÃ XONG theo thứ tự (từ bộ đếm n + unitPlan). Mỗi nút cũ → đánh xong bài đầu chưa xong của phần tương ứng.
   *  Không ai mất tiến độ: tổng bài xong ≥ số nút cũ có phần đích còn bài. */
  function migrate(prog, tracks, oldKinds) {
    let p = norm(prog);
    if (p.mig) return p; // chỉ di trú 1 lần (gọi lại sau đồng bộ không cộng đôi)
    for (const k of oldKinds || []) {
      const t = tracks.find(x => x.id === KIND2TRACK[k]); if (!t) continue;
      const D = doneSet(p, t.id), x = t.ladder.find(y => !y.jump && !D.has(y.id));
      if (x) p = complete(p, t.id, x.id);
    }
    p.mig = 1;
    return p;
  }
  /** Gợi ý tiếp (spec §3): điểm = 3·nợ ôn + 2·điểm yếu khớp phần + 1·mục tiêu thi − 1·vừa học phần này. ctx: { due, weak: {track: 0–1}, goal: {track: 0–1}, last }.
   *  → { track, id, i } của bài 'next' tốt nhất, hoặc null khi mọi phần đã xong. Hòa điểm → theo thứ tự phần. */
  function recommend(tracks, prog, ctx = {}) {
    let best = null;
    (tracks || []).forEach((t, ti) => {
      const st = status(t.id, t.ladder, prog), i = st.indexOf('next'); if (i < 0) return;
      const owe = t.id === 'review' ? Math.min(1, (ctx.due || 0) / 10) : 0;
      const s = 3 * owe + 2 * ((ctx.weak || {})[t.id] || 0) + ((ctx.goal || {})[t.id] || 0) - (ctx.last === t.id ? 1 : 0);
      if (!best || s > best.s) best = { s, track: t.id, id: t.ladder[i].id, i, ti };
    });
    return best && { track: best.track, id: best.id, i: best.i, score: best.s };
  }
  /** Tóm tắt 1 phần cho thẻ "Lộ trình": số bài xong/tổng (không tính nút nhảy), bậc hiện tại, bài kế. */
  function summary(t, prog) {
    const st = status(t.id, t.ladder, prog), L = t.ladder.map((x, i) => ({ x, s: st[i] })).filter(o => !o.x.jump);
    const nx = L.find(o => o.s === 'next');
    return { id: t.id, done: L.filter(o => o.s === 'done').length, total: L.length, cefr: nx ? nx.x.cefr : (L.length ? L[L.length - 1].x.cefr : 'A1'), next: nx ? nx.x : null };
  }
  /** "Không mất nội dung": các đích href cũ không có trong lộ trình mới → [] khi đủ. */
  function missing(oldHrefs, tracks) {
    const have = new Set(tracks.flatMap(t => t.ladder.map(x => x.href)).filter(Boolean));
    return [...new Set(oldHrefs || [])].filter(h => h && !have.has(h));
  }

  g.PathV3 = { CEFR, TRACKS, ORDER, PASS, lv, norm, accOf, ladder, build, empty, status, canPlay, complete, jump, place, migrate, recommend, summary, missing };
})(typeof self !== 'undefined' ? self : globalThis);
