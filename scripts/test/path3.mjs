// Test lộ trình v3 (docs/specs/play-and-speak-path.md): lõi PathV3 – phần lớn luôn mở, bài nhỏ khóa tuần tự, nhảy cóc, xếp lớp, di trú ux1, gợi ý tiếp,
// dữ liệu đồng bộ hỏng, không sửa tại chỗ, "không mất nội dung" + kiểm bất biến ngẫu nhiên (500 lượt). Chạy: node scripts/test/path3.mjs
import fs from 'node:fs';
import vm from 'node:vm';

let total = 0, fails = 0;
const ok = (c, m) => { total++; if (!c) { fails++; console.error('✗', m); } else console.log('✓', m); };
const ctx = { self: {} }; ctx.globalThis = ctx.self; vm.createContext(ctx);
vm.runInContext(fs.readFileSync('web/js/lesson/path3.js', 'utf8'), ctx);
const P = ctx.self.PathV3;
const J = x => JSON.parse(JSON.stringify(x)); // bỏ prototype của vm context để so sánh

// Fixture: mỗi phần 2 bài/bậc ở 3 bậc, phần review không bậc
const items = (tr, levels = ['A1', 'A2', 'B1']) => levels.flatMap(l => [1, 2].map(k => ({ id: `${tr}-${l}-${k}`, cefr: l, href: `#/${tr}/${l}/${k}` })));
const SRC = { words: items('words'), listen: items('listen'), speak: items('speak'), story: items('story'), grammar: items('grammar'), exam: items('exam', ['B1', 'B2']), review: [1, 2, 3].map(k => ({ id: 'rv' + k, href: '#/review?p=' + k })) };
const T = P.build(SRC, 'ielts'), tr = id => T.find(t => t.id === id), lad = id => tr(id).ladder;
const st = (id, prog) => P.status(id, lad(id), prog);

// ---------- A. Dựng thang ----------
ok(Object.keys(P.ORDER).every(g => P.TRACKS.every(t => P.ORDER[g].includes(t)) && P.ORDER[g].length === P.TRACKS.length), 'ORDER: mọi mục tiêu chứa đủ 7 phần, không trùng/thiếu');
ok(T.map(t => t.id).join() === P.ORDER.ielts.join(), 'build: thứ tự phần theo mục tiêu');
ok(P.build(SRC, 'zzz').map(t => t.id).join() === P.ORDER.ielts.join(), 'build: mục tiêu lạ → mặc định IELTS, không vỡ');
ok(P.build({}, 'general').length === 7 && P.build(null, 'general').every(t => Array.isArray(t.ladder)), 'build: thiếu nội dung → vẫn đủ 7 phần, thang rỗng');
ok(lad('words').filter(x => x.jump).map(x => x.cefr).join() === 'A1,A2,B1' && lad('words')[0].jump, 'ladder: nút nhảy cóc ở đầu MỖI bậc');
ok(!lad('review').some(x => x.jump), 'ladder: Ôn lỗi không có nút nhảy cóc');
{
  const L = P.ladder('words', [{ id: 'b', cefr: 'B1' }, { id: 'a', cefr: 'a1' }, { id: 'c', cefr: 'B1' }, { id: 'a', cefr: 'A1' }, null, { cefr: 'A1' }, { id: 'x', cefr: 'Z9' }]);
  ok(L.filter(x => !x.jump).map(x => x.id).join() === 'a,x,b,c', 'ladder: sắp ổn định theo CEFR, CEFR thường/lạ → A1, bỏ id trùng/null');
}

// ---------- B. Khóa/mở ----------
{
  const s0 = st('words', P.empty());
  ok(s0[0] === 'jump' && s0[1] === 'next' && s0.slice(2).filter(x => x !== 'jump').every(x => x === 'lock'), 'status: ngày đầu – bài 1 là next, còn lại khóa, nút nhảy bấm được');
  ok(T.every(t => !t.ladder.length || P.status(t.id, t.ladder, P.empty()).some(x => x === 'next')), 'phần lớn LUÔN mở: mọi phần có bài next từ ngày đầu');
  let p = P.complete(P.empty(), 'words', 'words-A1-1');
  ok(st('words', p)[2] === 'next' && st('words', p)[4] === 'lock', 'xong bài 1 → mở bài 2, bài sau vẫn khóa');
  p = P.complete(p, 'words', 'words-A1-2');
  ok(st('words', p)[3] === 'jump' && st('words', p)[4] === 'next', 'nút nhảy không chắn đường: xong hết A1 → bài A2 đầu là next');
  ok(st('listen', p)[1] === 'next', 'tiến độ mỗi phần độc lập');
  const s = st('words', P.complete(P.empty(), 'words', 'words-B1-2'));
  ok(s[s.length - 1] === 'done' && s[1] === 'next', 'bài xong ngoài thứ tự (đồng bộ máy khác) vẫn giữ done, không mở bừa bài khác');
}

// ---------- C. Nhảy cóc ----------
{
  const L = lad('words'), jA2 = 'jump:words:A2';
  ok(J(P.jump(P.empty(), 'words', L, jA2, 0.79)).skip.words === undefined, 'nhảy cóc trượt (< 80 %) → không đổi, không phạt');
  ok(J(P.jump(P.empty(), 'words', L, jA2, 79)).skip.words === undefined && J(P.jump(P.empty(), 'words', L, jA2, NaN)).skip.words === undefined, 'điểm dạng % (79) và NaN không lọt qua');
  const p = P.jump(P.empty(), 'words', L, jA2, 85), s = st('words', p);
  ok(s[3] === 'done' && L[6].jump && s[7] === 'next', 'qua nhảy cóc A2 (85 %) → bài đầu B1 là next');
  ok(s[1] === 'open' && s[4] === 'open', 'bài đã nhảy qua vẫn mở để chơi lại');
  ok(J(P.jump(P.empty(), 'words', L, 'words-A1-1', 1)).skip.words === undefined, 'chỉ nút nhảy cóc mới nhảy được (id bài thường → bỏ qua)');
  const pl = P.jump(P.empty(), 'words', L, 'jump:words:B1', 1);
  ok(st('words', pl).filter(x => x !== 'done').every(x => x === 'open' || x === 'jump' || x === 'next') && !st('words', pl).includes('lock'), 'nhảy bậc cuối → mở hết phần');
  const back = P.jump(P.jump(P.empty(), 'words', L, 'jump:words:B1', 1), 'words', L, jA2, 1);
  ok(J(back).skip.words === L.length, 'nhảy bậc thấp sau bậc cao → không hạ vùng đã mở');
}

// ---------- D. Xếp lớp ----------
{
  const p = P.place(P.empty(), T, 'B1');
  ok(st('words', p)[7] === 'next' && st('words', p)[1] === 'open', 'xếp lớp B1 → mọi phần bắt đầu ở bài B1 đầu tiên, bài A1/A2 vẫn mở');
  ok(J(p).skip.review === undefined && st('review', p)[0] === 'next', 'xếp lớp không đụng Ôn lỗi');
  ok(st('exam', p)[1] === 'next', 'phần chỉ có B1+ → bắt đầu bình thường');
  ok(J(P.place(P.place(P.empty(), T, 'B1'), T, 'A1')).skip.words === J(p).skip.words, 'xếp lớp lại thấp hơn không hạ vùng đã mở');
  ok(J(P.place(P.empty(), T, 'C1')).skip.words === lad('words').length, 'xếp lớp cao hơn mọi bài → mở hết');
}

// ---------- E. Di trú ux1 ----------
{
  const old = ['lesson', 'listen', 'speak', 'story', 'review', 'exam', 'lesson', 'listen', 'radio'];
  const p = P.migrate(P.empty(), T, old), d = J(p).done;
  ok(d.words.length === 2 && d.listen.length === 2 && d.story.length === 2 && d.speak.length === 1 && d.review.length === 1 && d.exam.length === 1, 'migrate: mỗi nút cũ → 1 bài của phần tương ứng (radio → Truyện)');
  ok(Object.values(d).reduce((a, x) => a + x.length, 0) === old.length, 'migrate: không ai mất tiến độ (tổng bài = số nút cũ)');
  ok(J(P.migrate(p, T, old)).done.words.length === 2, 'migrate: chạy lại không cộng đôi');
  ok(st('words', p)[4] === 'next', 'migrate: sau di trú, bài kế đúng chỗ');
  ok(J(P.migrate(P.empty(), T, ['lesson', 'lesson', 'lesson', 'lesson', 'lesson', 'lesson', 'lesson', 'zzz'])).done.words.length === 6, 'migrate: hết bài/loại lạ → dừng an toàn');
}

// ---------- F. Gợi ý tiếp ----------
{
  ok(P.recommend(T, P.empty(), {}).track === T[0].id, 'recommend: hòa điểm → phần đầu theo mục tiêu');
  ok(P.recommend(T, P.empty(), { due: 20 }).track === 'review', 'recommend: nợ ôn nhiều → Ôn lỗi trước');
  ok(P.recommend(T, P.empty(), { weak: { grammar: 1 } }).track === 'grammar', 'recommend: điểm yếu khớp phần');
  ok(P.recommend(T, P.empty(), { last: T[0].id }).track !== T[0].id, 'recommend: vừa học phần này → đổi phần (xen kẽ)');
  let all = P.empty(); for (const t of T) for (const x of t.ladder) all = P.complete(all, t.id, x.id);
  ok(P.recommend(T, all, {}) === null, 'recommend: xong hết → null (không vỡ)');
  const sm = P.summary(tr('words'), P.complete(P.empty(), 'words', 'words-A1-1'));
  ok(sm.done === 1 && sm.total === 6 && sm.cefr === 'A1' && sm.next.id === 'words-A1-2', 'summary: x/y không tính nút nhảy, bậc + bài kế đúng');
}

// ---------- G. Dữ liệu hỏng, không sửa tại chỗ, không mất nội dung ----------
{
  const bad = { done: { words: 'x', listen: [null, 3] }, skip: { words: -4, listen: 'abc', speak: '2' } };
  const n = J(P.norm(bad));
  ok(!n.done.words && n.done.listen.join() === '3' && !n.skip.words && !n.skip.listen && n.skip.speak === 2, 'norm: prog đồng bộ hỏng → chuẩn hóa, không ném lỗi');
  ok(st('words', null)[1] === 'next' && st('words', 'rác')[1] === 'next' && P.status('words', null, null).length === 0, 'status: prog/thang null → không ném lỗi');
  const p0 = P.empty(), snap = JSON.stringify(p0);
  P.complete(p0, 'words', 'a'); P.jump(p0, 'words', lad('words'), 'jump:words:A2', 1); P.place(p0, T, 'B1'); P.migrate(p0, T, ['lesson']);
  ok(JSON.stringify(p0) === snap, 'mọi hàm trả bản mới, không sửa prog đầu vào');
  const old = Object.values(SRC).flat().map(x => x.href);
  ok(P.missing(old, T).length === 0 && P.missing(old.concat('#/gone'), T).join() === '#/gone', 'missing: lối vào cũ đều có trong lộ trình mới (báo đúng lối thiếu)');
}

// ---------- H. Bất biến ngẫu nhiên (500 lượt) ----------
{
  let seed = 7; const rnd = n => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed % n; };
  let bad = '';
  for (let run = 0; run < 500 && !bad; run++) {
    let p = P.empty();
    if (rnd(3) === 0) p = P.place(p, T, P.CEFR[rnd(5)]);
    for (let step = 0; step < 40 && !bad; step++) {
      const t = T[rnd(T.length)], s = P.status(t.id, t.ladder, p), L = t.ladder;
      // 1) không phần nào bị khóa cả phần; 2) ≤ 1 next; 3) bài khóa ⇒ bài liền trước chưa xong và ngoài vùng skip; 4) next luôn chơi được
      const lessons = L.map((x, i) => i).filter(i => !L[i].jump);
      if (lessons.length && lessons.every(i => s[i] === 'lock')) bad = `${t.id}: cả phần bị khóa`;
      if (s.filter(x => x === 'next').length > 1) bad = `${t.id}: > 1 next`;
      const sk = J(p).skip[t.id] || 0;
      lessons.forEach((i, k) => { if (s[i] === 'lock') { const pr = lessons[k - 1]; if (pr == null || s[pr] === 'done' || pr < sk) bad = `${t.id}#${i}: khóa sai`; } });
      if (s.includes('open') && !s.includes('next')) bad = `${t.id}: có bài mở mà không có next`;
      // hành động ngẫu nhiên: chơi bài next/open, hoặc thử nhảy cóc
      const playable = s.map((x, i) => i).filter(i => !L[i].jump && (s[i] === 'next' || s[i] === 'open'));
      if (rnd(4) === 0) { const js = L.filter(x => x.jump); if (js.length) p = P.jump(p, t.id, L, js[rnd(js.length)].id, rnd(101) / 100); }
      else if (playable.length) p = P.complete(p, t.id, L[playable[rnd(playable.length)]].id);
    }
  }
  ok(!bad, 'bất biến (500 lượt ngẫu nhiên): không khóa cả phần, ≤ 1 next, khóa chỉ khi bài trước chưa qua' + (bad ? ' – ' + bad : ''));
  // chơi tuần tự next tới hết → mọi bài done, không kẹt
  let p = P.empty(), guard = 0;
  for (const t of T) { for (;;) { const i = P.status(t.id, t.ladder, p).indexOf('next'); if (i < 0 || ++guard > 999) break; p = P.complete(p, t.id, t.ladder[i].id); } }
  ok(T.every(t => P.status(t.id, t.ladder, p).every(x => x === 'done' || x === 'jump')), 'chơi lần lượt bài next → đi hết mọi phần, không kẹt');
}

console.log(`\n${total - fails}/${total} path3`);
if (fails) process.exit(1);
