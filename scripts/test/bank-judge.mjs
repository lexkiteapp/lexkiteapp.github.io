// Kiểm kho trắc nghiệm E0 (CONTENT-WORLD-PLAN §7): auditBank đếm đúng, sample tất định + phân tầng, judge dùng POOL GIẢ (0 AI, 0 mạng).
import { auditBank } from '../content-qa/bank-audit.mjs';
import { sample, judge } from '../content-qa/judge-bank.mjs';
let bad = 0; const t = (ok, m) => { if (!ok) { bad++; console.error('✗ ' + m); } };
const mk = (n, a, extra = {}) => Array.from({ length: n }, (_, i) => ({ id: i, q: `Question number ${i} is here ___.`, options: ['alpha one', 'beta', 'gamma', 'delta'], a: a(i), explain: `Because alpha ${i}.`, ...extra }));
{ const { out, items } = auditBank({ G1: mk(40, () => 0), G2: mk(40, i => i % 4), AUD: [{ q: 'Mark your answer.', options: ['A', 'B', 'C'], a: 1, explain: 'x'.repeat(50) }] });
  t(items.length === 81 && out.G1.items === 40 && out.G2.items === 40, 'auditBank: đếm câu');
  t(out.G1.posSkew === 100 && out.G2.posSkew === 0, 'auditBank: lệch vị trí (toàn A = 100 %, đều = 0 %)');
  t(out.G1.longestIsAnswerPct === 100 && out.G2.longestIsAnswerPct === 25, 'auditBank: đáp án dài nhất');
  t(out.AUD.duplicateQuestionPct === 0, 'auditBank: câu chỉ audio (đáp án A/B/C trần) không tính trùng');
  t(sample(items).every(i => i.options.some(o => o.length > 1) || i.ctx), 'sample: bỏ câu chỉ audio không có kịch bản'); }
{ const s = { script: [{ say: 'Part 2.' }, { say: 'Number 7.' }, { s: 'A', t: 'Where should I put these?' }, { s: 'B', t: 'A. In the closet.' }, { say: 'Number 8.' }, { s: 'A', t: 'Other.' }] };
  const { items } = auditBank({ TL: [{ ...s, groups: [{ items: [{ n: 7, q: 'Mark your answer.', options: ['A', 'B', 'C'], a: 0, cue: 'closet', explain: 'ok' }] }] }] });
  t(items[0].ctx.includes('Where should I put') && !items[0].ctx.includes('Other.') && items[0].ctx.includes('cue: closet'), 'contextOf: đoạn kịch bản đúng số câu + cue');
  t(sample(items).length === 1, 'sample: câu chỉ audio CÓ kịch bản được chấm'); }
{ const items = [...mk(300, i => i % 4, {}).map(x => ({ ...x, group: 'X', level: 'B1' })), ...mk(100, i => i % 4).map(x => ({ ...x, group: 'Y', level: 'B2' }))];
  const a = sample(items, 100, 's'), b = sample(items, 100, 's'), c = sample(items, 100, 't');
  t(JSON.stringify(a.map(x => x.k)) === JSON.stringify(b.map(x => x.k)), 'sample: tất định theo hạt giống');
  t(JSON.stringify(a.map(x => x.k)) !== JSON.stringify(c.map(x => x.k)), 'sample: đổi hạt giống → đổi mẫu');
  t(a.some(x => x.group === 'X') && a.some(x => x.group === 'Y') && a.length >= 100, 'sample: phân tầng đủ nhóm');
  const out = { }, AI = { judgePair: async ({ items: ch }) => { const o = {}; ch.forEach((x, i) => { o[x.k] = { s: i === 0 ? 2 : 5, why: 'w' }; }); return { a: { model: 'm1', out: o }, b: { model: 'm2', out: o } }; } };
  const r = await judge(a.slice(0, 12), AI, () => {});
  t(r.sampled === 12 && r.judged === 12 && r.pass === 10 && r.low.length === 2 && r.passPct === 83.3, `judge: 10/12 đạt (got ${r.pass}/${r.judged})`);
  const none = await judge(a.slice(0, 6), { judgePair: async () => ({ a: null, b: null }) }, () => {});
  t(none.judged === 0 && none.nojudge === 6 && none.low.length === 0, 'judge: thiếu giám khảo = trung lập, không tính trượt'); }
if (bad) { console.error(`✗ bank-judge: ${bad} lỗi`); process.exit(1); }
console.log('✓ bank-judge: auditBank + sample + judge (pool giả) đạt');
await import('./bank-rewrite.mjs'); // E1b: luật cứng + áp bản vá (một file test, không đụng suite.txt → không dính khung merge cổng)
