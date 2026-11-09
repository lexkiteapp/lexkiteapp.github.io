// Xưởng nội dung (scripts/factory/): kiểm lõi bằng POOL GIẢ (0 AI, 0 mạng) cho cả hai kind – comm/functions và grammar/mcq.
// Mỗi kind: mục hợp lệ → nhận · phạm luật → loại · điểm thấp → hàng duyệt · soát mẫu sai → loại cả lô · apply() ghi vào THƯ MỤC TẠM · pick() chia shard không trùng.
// Không đụng tệp dữ liệu thật (apply nhận { root } trỏ tới thư mục tạm).
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { runBatch, pick, MAX_TRIES } from '../factory/lib.mjs';
import { KINDS as COMM } from '../factory/comm.mjs';
import { KINDS as GRAM } from '../factory/grammar.mjs';
import { render } from '../factory/build-grammar-bank.mjs';
import { judgeStored } from '../factory/judge-stored.mjs';

let bad = 0;
const t = (ok, msg) => { if (!ok) { bad++; console.error('✗ ' + msg); } };
{ const f = (id, j) => ({ id, name: id, level: 'B1', situations: [], qa: { gen: 'x', ...(j ? { j } : {}) } }), S = { functions: [f('a'), f('b'), f('c'), f('d', { m: 5 })] };
  const out = { a: { s: 5 }, b: { s: 3 } }, AI = { judgePair: async () => ({ a: { model: 'm1', out }, b: { model: 'm2', out } }) };
  const r = await judgeStored(S, AI, () => {});
  t(r.todo === 3 && r.ok === 1 && r.low.length === 1 && r.nojudge === 1 && S.functions[0].qa.j && !S.functions[1].qa.j && !S.functions[2].qa.j, 'judge-stored: đạt ghi qa.j, thấp không ghi, thiếu GK để lượt sau, mục đã chấm bỏ qua'); }
const quiet = () => {};

/** pool giả: gen trả items[k]; điểm giám khảo = score; soát mẫu = audit(k) */
function fakePool({ items, score = 5, audit = true }) {
  const calls = { gen: 0, pair: 0, judge: 0 };
  return {
    calls,
    async gen(req) { calls.gen++; return { out: Object.fromEntries(req.items.map(i => [i.k, items[i.k]]).filter(([, v]) => v)), model: 'gemini-test-flash' }; },
    async judgePair(req) {
      calls.pair++;
      const o = Object.fromEntries(req.items.map(i => [i.k, { s: score, why: score < 4 ? 'yếu' : 'tốt' }]));
      return { a: { out: o, model: 'openai/gpt-oss-120b', fam: 'gpt-oss' }, b: { out: o, model: 'openai/gpt-oss-20b', fam: 'gpt-oss' } };
    },
    async judge(req) { calls.judge++; return { out: Object.fromEntries(req.items.map(i => [i.k, audit ? { ok: true } : { ok: false, bad: ['example: sai'] }])), model: 'llama-test-70b' }; },
  };
}

// ---------- comm/functions ----------
const FN = COMM.functions, fseed = { k: 'zz-test-fn', name: 'Making a polite request', level: 'B1', lo: ['I.B1.05'], situations: ['work', 'travel'] };
const fItem = () => ({
  phrases: { formal: ['Would you be so kind as to hold the door?', 'I wonder if you could possibly pass me that folder.', 'Might I ask you to move your bag, please?'],
    neutral: ['Could you hold the door, please?', 'Can you pass me that folder?', 'Would you mind moving your bag?'],
    informal: ['Hold the door for me, will you?', 'Pass me that, can you?', 'Mind moving your bag?'] },
  responses: ['Of course, here you are.', 'Sure, no problem.', 'Sorry, I am afraid I cannot.'],
  example: [{ who: 'A', en: 'Could you hold the door, please?' }, { who: 'B', en: 'Sure, no problem.' }, { who: 'A', en: 'Thanks a lot.' }, { who: 'B', en: 'You are welcome.' }],
  avoid: { wrong: 'Give me the folder.', right: 'Could you give me the folder, please?', why: 'A bare order sounds rude to a stranger.' },
  note: 'Use "could" or "would" for polite requests; add "please" and a smile.',
});
const fk = { ...FN, seeds: () => [fseed] };
{
  t(FN.rules(fItem(), fseed).length === 0, 'functions: mục hợp lệ bị luật cứng chặn: ' + FN.rules(fItem(), fseed).join(' · '));
  const dup = fItem(); dup.phrases.informal[0] = dup.phrases.neutral[0];
  t(FN.rules(dup, fseed).some(x => /trùng/.test(x)), 'functions: phrase trùng giữa các register phải bị loại');
  const long = fItem(); long.phrases.neutral[0] = Array(30).fill('word').join(' ');
  t(FN.rules(long, fseed).some(x => /từ >/.test(x)), 'functions: câu quá dài so với cấp phải bị loại');
  const vi = fItem(); vi.note = 'Dùng could để lịch sự.';
  t(FN.rules(vi, fseed).some(x => /tiếng Việt/.test(x)), 'functions: tiếng Việt phải bị loại');
  const turns = fItem(); turns.example[1].who = 'A';
  t(FN.rules(turns, fseed).some(x => /xen kẽ/.test(x)), 'functions: lượt thoại không xen kẽ phải bị loại');
  const same = fItem(); same.avoid.right = same.avoid.wrong;
  t(FN.rules(same, fseed).some(x => /wrong trùng right/.test(x)), 'functions: wrong = right phải bị loại');

  let r = await runBatch(fk, { n: 5, pool: fakePool({ items: { [fseed.k]: fItem() } }), log: quiet });
  t(r.accepted.length === 1 && r.accepted[0].item.id === fseed.k && r.accepted[0].item.name === fseed.name && r.accepted[0].qa.gen, 'functions: mục hợp lệ phải được nhận (finalize có id/name)');
  r = await runBatch(fk, { n: 5, pool: fakePool({ items: { [fseed.k]: dup } }), log: quiet });
  t(!r.accepted.length && r.rejected.length === 1, 'functions: mục phạm luật phải bị loại');
  r = await runBatch(fk, { n: 5, pool: fakePool({ items: { [fseed.k]: fItem() }, score: 3 }), log: quiet });
  t(!r.accepted.length && r.review.length === 1, 'functions: điểm giám khảo thấp phải vào hàng duyệt');
  r = await runBatch(fk, { n: 5, pool: fakePool({ items: { [fseed.k]: fItem() }, audit: false }), log: quiet });
  t(!r.accepted.length && r.batch.status === 'rejected' && r.review.length === 1, 'functions: soát mẫu sai > 2 % phải loại cả lô');

  // apply() vào thư mục tạm
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cf-fn-')) + '/';
  const acc = [{ k: 'b', seed: { ...fseed, k: 'b' }, item: FN.finalize(fItem(), { ...fseed, k: 'b' }), qa: { gen: 'g', j: {} } }, { k: 'a', seed: { ...fseed, k: 'a', level: 'A1' }, item: FN.finalize(fItem(), { ...fseed, k: 'a', level: 'A1' }), qa: { gen: 'g', j: {} } }];
  FN.apply(acc, { root }); FN.apply(acc, { root }); // lần hai: không nhân đôi
  const F = JSON.parse(fs.readFileSync(root + 'content/framework/functions.json', 'utf8'));
  t(F.functions.length === 2 && F.functions[0].id === 'a' && F.functions[1].id === 'b' && F.functions[0].qa, 'functions: apply phải ghi, sắp theo cấp rồi id, có qa, không nhân đôi');
  fs.rmSync(root, { recursive: true, force: true });
}

// ---------- grammar/mcq ----------
const MQ = GRAM.mcq, mseed = { k: 'present-simple#99', lesson: 'present-simple', level: 'A2', en: 'Present Simple', summary: 'thói quen', avoid: [] };
const Q = (q, options, answer) => ({ q, options, answer, explain: 'Chủ ngữ số ít ở thì hiện tại đơn thêm -s/-es vào động từ.' });
const mItem = () => ({ qs: [
  Q('Zorblat the cat ___ milk every single morning.', ['drink', 'drinks', 'drinking', 'to drink'], 1),
  Q('Quillfeather and I ___ at the zorblat office on Mondays.', ['works', 'working', 'work', 'is work'], 2),
  Q('Does Quillfeather ___ the zorblat bus to school?', ['takes', 'take', 'taking', 'took'], 1),
  Q('My zorblat brother never ___ late for class.', ['are', 'be', 'is', 'am'], 2),
  Q('The zorblat train ___ at nine o\'clock each day.', ['leaves', 'leave', 'leaving', 'leavs'], 0),
] });
const mk = { ...MQ, seeds: () => [mseed] };
{
  const errs = MQ.rules(mItem(), mseed);
  t(errs.length === 0, 'mcq: mục hợp lệ bị luật cứng chặn: ' + errs.join(' · '));
  const cases = {
    'thiếu ___': i => { i.qs[0].q = 'Zorblat the cat drinks milk.'; },
    'hai ___': i => { i.qs[0].q = 'Zorblat ___ the cat ___ milk.'; },
    'trùng phương án': i => { i.qs[1].options = ['work', 'work', 'works', 'working']; },
    'trùng sau chuẩn hoá của cổng (gạch nối)': i => { i.qs[1].options = ['work', 'works', 'twenty-minute', 'twenty minute']; }, // hồi quy lô thử 02/11 (gate grammar/schema)
    'đáp án ngoài 0–3': i => { i.qs[2].answer = 4; },
    'lời giải không tiếng Việt': i => { i.qs[3].explain = 'Subject is singular so add s.'; },
    'lời giải nhắc chữ cái': i => { i.qs[3].explain = 'Đáp án B vì chủ ngữ số ít.'; },
    'lời giải chữ ngôn ngữ khác': i => { i.qs[3].explain = 'Chủ ngữ số ít 这是错误 nên thêm s.'; },
    'cùng vị trí đáp án': i => { i.qs.forEach(q => { const r = q.options[q.answer]; q.options = [r, ...q.options.filter((_, j) => j !== q.answer)]; q.answer = 0; }); },
    'a/an': i => { i.qs[4].q = 'A apple ___ every day.'; },
    'sai số câu': i => { i.qs.pop(); },
  };
  for (const [name, mut] of Object.entries(cases)) { const i = mItem(); mut(i); t(MQ.rules(i, mseed).length > 0, `mcq: lỗi "${name}" phải bị loại`); }
  const same = mItem(); same.qs[1].q = same.qs[0].q;
  t(MQ.rules(same, mseed).some(x => /trùng/.test(x)), 'mcq: câu trùng trong lô phải bị loại');

  let r = await runBatch(mk, { n: 5, pool: fakePool({ items: { [mseed.k]: mItem() } }), log: quiet });
  t(r.accepted.length === 1 && r.accepted[0].item.qs.length === 5, 'mcq: mục hợp lệ phải được nhận');
  const broken = mItem(); broken.qs[0].answer = 9;
  r = await runBatch(mk, { n: 5, pool: fakePool({ items: { [mseed.k]: broken } }), log: quiet });
  t(!r.accepted.length && r.rejected.length === 1, 'mcq: mục phạm luật phải bị loại');
  r = await runBatch(mk, { n: 5, pool: fakePool({ items: { [mseed.k]: mItem() }, score: 2 }), log: quiet });
  t(!r.accepted.length && r.review.length === 1, 'mcq: điểm thấp phải vào hàng duyệt');
  r = await runBatch(mk, { n: 5, pool: fakePool({ items: { [mseed.k]: mItem() }, audit: false }), log: quiet });
  t(!r.accepted.length && r.batch.status === 'rejected', 'mcq: soát mẫu sai phải loại cả lô');

  // apply() + dựng bank-gen vào thư mục tạm; file sinh chạy được và nối câu vào bài
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cf-gr-')) + '/';
  const a = [{ k: mseed.k, seed: mseed, item: MQ.finalize(mItem(), mseed), qa: { gen: 'g', j: { x: 5 } } }];
  const log = console.log; console.log = quiet;
  try { MQ.apply(a, { root }); MQ.apply(a, { root }); } finally { console.log = log; }
  const D = JSON.parse(fs.readFileSync(root + 'content/factory/grammar-quiz.json', 'utf8'));
  t(D.items['present-simple']?.length === 5 && D.items['present-simple'][0].qa?.gen === 'g', 'mcq: apply phải ghi 5 câu có qa và không nhân đôi');
  const src = fs.readFileSync(root + 'web/js/grammar/bank-gen.js', 'utf8');
  t(!/"qa"/.test(src), 'mcq: bank-gen.js không được chứa qa');
  const g = { GRAMMAR: [{ id: 'present-simple', quiz: [{ q: 'old' }] }, { id: 'other', quiz: [] }] };
  try { new Function('self', src)(g); } catch (e) { t(false, 'mcq: bank-gen.js không chạy được: ' + e.message); }
  t(g.GRAMMAR[0].quiz.length === 6 && g.GRAMMAR[0].quiz[1].q === mItem().qs[0].q && !g.GRAMMAR[1].quiz.length, 'mcq: bank-gen.js phải nối câu vào đúng bài');
  t(src === render(D.items), 'mcq: bank-gen.js phải khớp render(nguồn)');
  fs.rmSync(root, { recursive: true, force: true });

  // hạt giống: số câu ≥ 0, lô lớn nhất trước, khoá duy nhất
  const S = MQ.seeds();
  t(new Set(S.map(s => s.k)).size === S.length, 'mcq: khoá hạt giống phải duy nhất');
  t(S.every(s => s.avoid.length <= 8 && s.summary.length <= 300 && /^.+#\d+$/.test(s.k)), 'mcq: hạt giống sai dạng');
}

// ---------- pick(): shard không trùng ----------
{
  const K = { kind: 'fake', seeds: () => Array.from({ length: 60 }, (_, i) => ({ k: 's' + i })) };
  const st = { tries: {}, done: {}, nights: [] }, sets = [0, 1, 2, 3].map(s => pick(K, { n: 1e9, shard: s, shards: 4, state: st }).map(x => x.k));
  const all = sets.flat();
  t(all.length === 60 && new Set(all).size === 60, 'pick: 4 shard phải chia rời nhau và đủ 60 hạt');
  st.done['fake:s0'] = 1; st.tries['fake:s1'] = MAX_TRIES;
  t(!pick(K, { n: 1e9, state: st }).some(x => x.k === 's0' || x.k === 's1'), 'pick: bỏ hạt đã xong / đã trượt đủ lần');
}

if (bad) { console.error(`✗ content-factory: ${bad} lỗi`); process.exit(1); }
console.log('✓ content-factory: lõi + comm/functions + grammar/mcq (pool giả, apply vào thư mục tạm)');
