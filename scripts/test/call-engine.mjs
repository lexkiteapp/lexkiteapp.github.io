// Call Ama/Carlos (web/js/call/engine.js + kịch bản): rẽ nhánh đồ thị, mọi nút đến được & không gãy, sửa ngữ pháp, nhầm cặp âm (bread ≠ breast),
// độ trôi chảy, tổng kết + điểm tử tế, luyện lại câu yếu, chọn đường nhận dạng (trên máy trước). Kịch bản mẫu chạy hết từ đầu đến cuối bằng câu gợi ý.
import fs from 'node:fs'; import vm from 'node:vm'; import assert from 'node:assert/strict';
const c = {}; vm.createContext(c); c.self = c;
for (const f of ['pron/pairs.js', 'call/calls.js', 'call/calls-exam.js', 'call/engine.js']) vm.runInContext(fs.readFileSync('web/js/' + f, 'utf8'), c);
const E = c.CallEngine, CALLS = c.CALLS; let n = 0;
const ok = (v, m) => { assert.ok(v, m || 'lỗi'); n++; }, eq = (a, b, m) => { assert.equal(JSON.stringify(a), JSON.stringify(b), m || JSON.stringify(a)); n++; };
const byId = id => E.prep(CALLS.find(x => x.id === id));

// 1. Kịch bản: đủ loại thi, 2 giáo viên, id duy nhất, nút đích tồn tại, mọi nút đến được, đi hết bằng câu mẫu
ok(CALLS.length >= 11, 'ít nhất 11 cuộc gọi: ' + CALLS.length);
eq(new Set(CALLS.map(x => x.id)).size, CALLS.length, 'id trùng');
for (const ex of ['ielts-p1', 'ielts-p2', 'ielts-p3', 'toeic', 'everyday']) ok(CALLS.some(x => x.exam === ex), 'thiếu loại ' + ex);
ok(CALLS.every(x => ['ama', 'carlos'].includes(x.who)), 'chỉ Ama/Carlos');
for (const x of CALLS) {
  E.prep(x);
  const ids = Object.keys(x.nodes);
  ok(x.nodes[x.start], x.id + ': nút đầu');
  for (const id of ids) {
    const nd = x.nodes[id];
    ok(nd.m && nd.o && nd.o.length, `${x.id}/${id}: có câu hỏi + gợi ý`);
    for (const to of [nd.next, ...(nd.br || []).map(b => b[2])]) ok(to == null || x.nodes[to], `${x.id}/${id} → ${to} không tồn tại`);
    for (const b of nd.br || []) ok((() => { try { new RegExp(b[0]); return true; } catch (e) { return false; } })(), `${x.id}/${id}: regex hỏng ${b[0]}`);
  }
  // mọi nút đến được từ start
  const seen = new Set(), st = [x.start];
  while (st.length) { const id = st.pop(); if (!id || seen.has(id)) continue; seen.add(id); const nd = x.nodes[id]; st.push(nd.next, ...(nd.br || []).map(b => b[2])); }
  eq(ids.filter(id => !seen.has(id)), [], x.id + ': nút mồ côi');
  // đi hết bằng gợi ý đầu, không vòng lặp
  let id = x.start, k = 0; while (id && k < 40) { id = E.step(x, id, x.nodes[id].o[0]).next; k++; }
  ok(!id && k >= 3, x.id + ': đi hết ' + k + ' lượt');
  ok(x.phrases && x.phrases.length >= 4 && x.end, x.id + ': cụm từ + câu kết');
  for (const id of ids) { const nd = x.nodes[id], f = E.fluency(nd.o[0], nd); ok(!f.short && !E.correct(nd.o[0], nd.m), `${x.id}/${id}: câu mẫu đạt chuẩn (${f.words}/${nd.min} từ)`); }
}

// 2. Rẽ nhánh theo câu trả lời (IELTS P1: sinh viên / đi làm / cả hai)
const p1 = byId('ielts-p1-home');
eq(E.step(p1, 'job', 'I am a student at a university').next, 'study');
eq(E.step(p1, 'job', 'I work in a bank').next, 'work');
eq(E.step(p1, 'job', 'A bit of both, I work part-time').next, 'both');
eq(E.step(p1, 'job', 'hmm').next, 'work', 'mặc định');
eq(E.step(p1, 'nope', 'x').next, null, 'nút lạ');
const toeic = byId('toeic-reschedule');
eq(E.step(toeic, 'when', 'How about Monday morning?').react.slice(0, 6), 'Monday');
// kịch bản cũ (turns) vẫn chạy
const coffee = byId('coffee'); eq(coffee.start, 't0'); eq(E.step(coffee, 't0', 'no thanks').react, 'No problem! How about a snack, then?'); eq(E.step(coffee, 't5', 'ok').next, null);
eq(E.depth(coffee), 6);

// 3. Sửa ngữ pháp (giữ nguyên hành vi cũ của CallMia.correct)
eq(E.correct('I am agree with you', 'x').good, 'I agree with you');
eq(E.correct('Yesterday I go to the beach', 'What did you do?').good, 'Yesterday I went to the beach');
eq(E.correct('I go to the beach', 'Where do you like to go?'), null, 'không phải quá khứ');
eq(E.correct('I want to go home', 'x'), null, 'câu đúng');
eq(E.correct('She want to go', 'x').good, 'She wants to go');

// 4. Nhầm cặp âm: bread ≠ breast (bakery), không báo nhầm khi nói đúng
const bk = byId('bakery');
eq(E.slips('Could I have a loaf of breast please', bk, bk.nodes.hi).map(x => [x.said, x.meant, x.skill]), [['breast', 'bread', 'final-consonants']]);
eq(E.slips('Could I have a loaf of bread please', bk, bk.nodes.hi), [], 'nói đúng');
eq(E.slips('I live in a quiet town', p1, p1.nodes.live), [], 'hư từ ngắn không báo nhầm');
ok(E.slips('I like to sink about it', p1, { o: ['I think about it a lot'] }).some(x => x.meant === 'think' && x.id === 'th-s'), 'think/sink từ pairs.js');

// 5. Độ trôi chảy
const f1 = E.fluency('um I uh like it', { min: 12 }, 3);
eq([f1.words, f1.fillers, f1.short], [3, 2, true]);
ok(E.fluency('I like it because it is quiet', {}, 0).link, 'từ nối');
eq(E.fluency('one two three four five six', {}, 3).wpm, 120);

// 6. Tổng kết: câu ngắn → "trả lời đầy đủ hơn", từ chủ đề đã dùng, câu yếu, điểm tử tế (≥ 40), nhãn
const log = [
  { id: 'name', text: 'My name is Linh Nguyen', secs: 2 },
  { id: 'job', text: 'Student', secs: 1 },
  { id: 'study', text: 'I like my major because my classmates are friendly and the teachers are kind', secs: 6 },
  { id: 'home', text: 'My hometown is Hue, it is quiet and not crowded at all', secs: 5, asr: 90 },
  { id: 'live', text: 'Yes, I would like to live there.', picked: true },
];
const r = E.recap(p1, log);
eq(r.weak, ['job'], 'câu yếu: ' + JSON.stringify(r.weak));
ok(r.notes.some(x => x.id === 'short' && x.n === 1), 'nhắc trả lời đầy đủ');
ok(!r.notes.some(x => x.id === 'link'), 'đã có từ nối');
eq(r.used, ['hometown', 'quiet', 'crowded', 'major'].filter(w => r.target.includes(w)).sort((a, b) => r.target.indexOf(a) - r.target.indexOf(b)));
eq([r.spoken, r.picked], [4, 1]);
ok(r.score >= 40 && r.score <= 100 && ['great', 'good', 'keep'].includes(r.band), 'điểm ' + r.score);
const rb = E.recap(bk, [{ id: 'hi', text: 'A loaf of breast please' }]);
ok(rb.turns[0].slips.length === 1 && rb.weak[0] === 'hi' && rb.notes.some(x => x.id === 'slips'), 'tổng kết có nhầm âm');
const r0 = E.recap(p1, [{ id: 'name', text: 'Linh', picked: true }]);
ok(r0.notes.some(x => x.id === 'speak') && r0.score >= 40, 'chỉ chạm gợi ý → nhắc nói');
eq(E.recap(p1, []).score, 0);
const perfect = E.recap(p1, ['name', 'job', 'study', 'home', 'live', 'free', 'prefer'].map(id => ({ id, text: p1.nodes[id].o[0] })));
ok(perfect.band === 'great' && perfect.weak.length === 0 && perfect.notes[0].id === 'good', 'câu mẫu = tuyệt: ' + perfect.score);

// 7. Luyện lại câu yếu: chỉ nút yếu, nối thẳng, kết thúc đúng
const rt = E.retry(p1, ['job', 'live', 'job', 'zzz']);
eq([rt.start, rt.nodes.job.next, rt.nodes.live.next, Object.keys(rt.nodes).length], ['job', 'live', null, 2]);
eq(E.step(rt, 'job', 'I am a student').next, 'live', 'nhánh không nhảy ra ngoài bản luyện lại');

// 8. Nhận dạng: trên máy trước; đám mây chỉ khi tự chọn
eq(E.asrMode({ local: true, sr: true, media: true }), 'local');
eq(E.asrMode({ sr: true, media: true }), 'ask', 'chưa chọn → hỏi');
eq(E.asrMode({ sr: true, media: true, whisper: true }), 'whisper');
eq(E.asrMode({ sr: true, media: true, pref: 'cloud' }), 'cloud');
eq(E.asrMode({ sr: true, media: true, pref: 'device' }), 'whisper');
eq(E.asrMode({ media: true, ext: true }), 'tap', 'add-on không micro');
eq(E.asrMode({ sr: true, pref: 'tap' }), 'tap');

console.log(`call-engine: ${n} kiểm tra OK`);
