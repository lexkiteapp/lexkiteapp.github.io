// Test lõi Truyện & podcast (web/js/stories/core.js) + nội dung mẫu content/stories/*.json. Spec: docs/STORIES.md.
// Chạy: node scripts/test/stories.mjs  (không cần thư viện ngoài; nằm trong npm test + CI)
import fs from 'node:fs'; import vm from 'node:vm'; import { createRequire } from 'node:module';
const S = createRequire(import.meta.url)('../../web/js/stories/core.js');
let fails = 0, n = 0; const ok = (c, m) => { n++; if (!c) { fails++; console.log('✗', m); } };
const DIR = new URL('../../content/stories/', import.meta.url);
const ALL = fs.readdirSync(DIR).filter(f => f.endsWith('.json')).map(f => JSON.parse(fs.readFileSync(new URL(f, DIR), 'utf8')));

// ---------- Tách từ chạm được ----------
{
  const s = '"They are sour," he says – the fox\'s grapes.';
  const tk = S.tokens(s);
  ok(tk.map(x => x.t).join('') === s, 'tokens nối lại đúng câu gốc (giữ dấu câu, ngoặc kép)');
  ok(tk.filter(x => x.w).map(x => x.w).join(' ') === 'they are sour he says the fox grapes', 'từ chạm được: chữ thường, bỏ \'s sở hữu');
  ok(S.words("Don't worry").join() === "don't,worry", 'giữ dạng rút gọn don\'t');
  ok(S.lemmas('grapes').includes('grape') && S.lemmas('elves').includes('elf') && S.lemmas('stopped').includes('stop') && S.lemmas('carefully').includes('careful') && S.lemmas('hid').includes('hide'), 'lemmas: số nhiều, quá khứ, -ly, bất quy tắc');
  ok(S.tokens('Grapes!')[0].l.includes('grape'), 'token mang dạng gốc để khớp từ tô sáng');
}

// ---------- Karaoke: mốc thời gian câu ----------
{
  const ss = ['One two three four five.', 'Six seven.', 'Eight nine ten eleven twelve thirteen.'];
  const tl = S.timeline(ss, { wpm: 120 });
  ok(tl.length === 3 && tl[0].start === 0 && Math.abs(tl[0].end - 2.5) < 1e-9, 'ước lượng: 5 từ @120 wpm = 2,5 s');
  ok(tl[1].start > tl[0].end && tl[2].start > tl[1].end, 'câu sau bắt đầu sau câu trước (có nghỉ)');
  ok(S.sentenceAt(tl, -1) === -1 && S.sentenceAt(tl, 0) === 0 && S.sentenceAt(tl, 2.6) === 0 && S.sentenceAt(tl, tl[1].start + 0.1) === 1 && S.sentenceAt(tl, 999) === 2, 'sentenceAt: trước/đầu/khoảng nghỉ/giữa/cuối');
  const slow = S.timeline(ss, { wpm: 400 });
  ok(Math.abs(slow[0].end - 2) < 1e-9, 'wpm bị chặn ở ≤ 150 kể cả khi truyền cao hơn');
  const real = S.timeline(ss, { marks: [[0.2, 1.9], [2.3, 3.1], [3.5, 6]] });
  ok(real[1].start === 2.3 && real[2].end === 6, 'có mốc audio thật → dùng mốc thật');
  ok(S.timeline(ss, { marks: [[0, 1]] }).length === 3 && S.timeline(ss, { marks: [[0, 1]] })[0].end !== 1, 'mốc thật lệch số câu → bỏ, quay về ước lượng');
  ok(S.wpm('one two three four five six', 3) === 120 && S.wpm('x', 0) === 0, 'đo wpm từ thời lượng audio');
  const podLines = [{ who: 'A', text: 'Hello there, Carlos.' }, { who: 'B', text: 'Hi.' }];
  ok(S.timeline(podLines).length === 2 && S.textOf(podLines[0]) === 'Hello there, Carlos.', 'podcast: lượt thoại {who,text} dùng chung timeline');
}

// ---------- Đã biết / Học / từ mới / bộ đếm ----------
{
  const ch = { words: ['fox', 'grape', 'Sour', 'grape'] };
  let st = S.empty();
  ok(S.newWords(ch, st).join() === 'fox,grape,sour', 'newWords: bỏ trùng, chữ thường');
  st = S.mark(st, 'Grape', 'known', 1000);
  ok(st.known.grape === 1000 && S.newWords(ch, st).join() === 'fox,sour', 'Đã biết → không tô nữa');
  const st2 = S.mark(st, 'grape', 'learn', 2000);
  ok(!st2.known.grape && st2.learn.grape === 2000 && st.known.grape === 1000, 'Học thay Đã biết; bản cũ không bị sửa tại chỗ');
  ok(S.newWords(ch, st2, w => w === 'fox').join() === 'grape,sour', 'từ đã có trong sổ (inDeck) không tính là mới');
  const st3 = S.mark(S.mark(st2, 'fox', 'learn', 3000), 'sour', 'known', 500);
  const c = S.counter(st3, 1500);
  ok(c.learned === 2 && c.known === 0 && c.total === 2, 'bộ đếm "+N từ mới" chỉ tính từ mốc buổi học');
  ok(S.counter(st3).total === 3, 'bộ đếm toàn bộ');
  ok(!S.mark(st3, 'fox', 'reset').learn.fox, 'bỏ đánh dấu');
  const d = S.chapterDone(S.chapterDone(S.empty(), 'x', 1, '3/3'), 'x', 0, '2/3');
  ok(d.done['x#1'] === '3/3' && d.done['x#0'] === '2/3' && d.at.x === 2, 'chapterDone: lưu điểm, chương đọc tiếp không lùi');
}

// ---------- Quiz ----------
{
  const q = [{ answer: 0 }, { answer: 2 }, { answer: 1 }];
  const g = S.grade(q, { 0: 0, 1: '2', 2: 0 });
  ok(g.score === 2 && g.n === 3 && g.pct === 67 && g.wrong.join() === '2', 'grade: đếm đúng, nhận chuỗi số, liệt kê câu sai');
  ok(S.grade(q, {}).score === 0 && S.grade([], {}).pct === 0, 'grade: bỏ trống = sai; quiz rỗng an toàn');
}

// ---------- Phút đọc / mục tiêu 10 phút ----------
{
  let log = {};
  for (let i = 0; i < 20; i++) log = S.addTime(log, '2026-11-01', 30);
  ok(log['2026-11-01'] === 600 && S.goal(log, '2026-11-01', 10).done && S.goal(log, '2026-11-01').pct === 100, '20 nhịp × 30 s = 10 phút → đạt mục tiêu');
  ok(S.addTime({}, 'd', 3600).d === 60 && S.addTime({}, 'd', -5).d === 0, 'mỗi nhịp chặn 0–60 s (tab treo không thổi phồng)');
  const g = S.goal({ d: 270 }, 'd', 10); ok(g.min === 4 && g.pct === 40 && !g.done, 'goal: 4/10 phút = 40%');
  let big = {}; for (let i = 1; i <= 40; i++) big = S.addTime(big, `2026-10-${String(i).padStart(2, '0')}`, 10);
  ok(Object.keys(big).length === 35 && !big['2026-10-01'] && big['2026-10-40'], 'chỉ giữ 35 ngày gần nhất');
}

// ---------- Bản quyền ----------
{
  const pd = { type: 'public-domain', work: 'X', author: 'Y', url: 'https://www.gutenberg.org/ebooks/1', published: 1891, authorDied: 1930 };
  ok(S.licenseOk(pd).length === 0, 'Sherlock Holmes (1891, Doyle mất 1930) = public domain');
  ok(S.licenseOk({ ...pd, work: 'Animal Farm', published: 1945, authorDied: 1950 }).length >= 2, 'Animal Farm bị chặn (danh sách chặn + xuất bản 1945)');
  ok(S.licenseOk({ ...pd, work: 'The Great Gatsby', published: 1925, authorDied: 1940 }).length === 1, 'danh sách chặn bắt cả khi ngày tháng "đạt"');
  ok(S.licenseOk({ ...pd, published: 1925, authorDied: 1961 }).length === 1, 'tác giả mất sau 1955 → chưa hết đời + 70');
  ok(S.licenseOk({ ...pd, url: 'http://x' }).length === 1, 'cần url https bản PD');
  ok(S.licenseOk({ type: 'original', author: 'Lexkite' }).length === 0 && S.licenseOk({ type: 'original', author: 'Ai đó' }).length === 1, 'truyện gốc phải của Lexkite');
  ok(S.licenseOk({ type: 'cc-by' }).length === 1, 'loại nguồn lạ bị từ chối');
}

// ---------- validate: bắt đúng lỗi ----------
{
  const base = ALL.find(x => x.id === 'aesop-fox-grapes');
  const bad = JSON.parse(JSON.stringify(base));
  bad.cover.style = 'photo'; bad.cover.cast = ['priya']; bad.audio.wpm = 170; bad.chapters[0].quiz[0].answer = 5; bad.chapters[0].words.push('dragon');
  bad.chapters[0].sentences.push('This is a very long sentence that keeps going and going with many words for a beginner reader to follow today.');
  const E = S.validate(bad).join('\n');
  for (const [re, m] of [[/2D/, 'bìa không 2D'], [/cast/, 'nhân vật ngoài bộ 2D'], [/wpm/, 'wpm > 150'], [/ngoài phạm vi/, 'đáp án ngoài phạm vi'], [/dragon/, 'từ tô sáng không có trong chương']]) ok(E.match(re), 'validate bắt: ' + m);
  const long = JSON.parse(JSON.stringify(base)); long.chapters[0].sentences = Array(5).fill('This sentence is much too long for a reader who is only at the very first level.');
  ok(/từ\/câu/.test(S.validate(long).join()), 'validate bắt: câu quá dài so với cấp A1');
  const pod = JSON.parse(JSON.stringify(ALL.find(x => x.kind === 'podcast'))); pod.chapters[0].sentences[0].who = 'Z'; pod.speakers.B = 'mia';
  ok(S.validate(pod).length >= 2, 'validate bắt: lượt thoại sai người nói, người nói ngoài bộ 2D');
  const dup = JSON.parse(JSON.stringify(base)); dup.chapters[0].quiz[0].options = ['Yes', 'yes ', 'No'];
  ok(/trùng/.test(S.validate(dup).join()), 'validate bắt: phương án trùng');
}

// ---------- Nội dung mẫu ----------
{
  ok(ALL.length >= 4, 'có ≥ 4 nội dung mẫu');
  ok(ALL.some(x => x.kind === 'podcast') && new Set(ALL.map(x => x.level)).size >= 3, 'có podcast và ≥ 3 cấp');
  for (const x of ALL) {
    const E = S.validate(x); ok(!E.length, `${x.id}: validate sạch ${E.join(' · ')}`);
    ok(x.audio.wpm <= 150, `${x.id}: audio ≤ 150 wpm`);
    for (const ch of x.chapters) for (const s of S.sentencesOf(ch)) ok(S.tokens(s).map(t => t.t).join('') === s, `${x.id}: tokens giữ nguyên câu`);
  }
  ok(ALL.filter(x => x.source.type === 'public-domain').every(x => /gutenberg\.org|wikisource\.org/.test(x.source.url)), 'nguồn PD trỏ Gutenberg/Wikisource');
}

// ---------- Cổng ngữ pháp còn sống (LK_WRITE bắt lỗi thật) ----------
{
  const w = { console }; w.self = w; vm.createContext(w); vm.runInContext(fs.readFileSync(new URL('../../web/js/writecheck-rules.js', import.meta.url), 'utf8'), w);
  ok(w.LK_WRITE && w.LK_WRITE.check('He go to school every day.').some(h => h.type === 'grammar'), 'LK_WRITE bắt "He go" → cổng stories/grammar không chạy rỗng');
  for (const x of ALL) for (const ch of x.chapters) for (const s of S.sentencesOf(ch)) { const b = w.LK_WRITE.check(s).filter(h => h.type === 'grammar' || h.type === 'spelling'); ok(!b.length, `${x.id}: soát lỗi sạch "${s}" ${b.map(h => h.rule).join()}`); }
}

console.log(fails ? `✗ stories: ${fails}/${n} kiểm trượt` : `✓ stories: ${n} kiểm đạt (lõi + ${ALL.length} nội dung mẫu)`);
process.exit(fails ? 1 : 0);
