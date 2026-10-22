// Kho kịch bản video (docs/VIDEO-SCALE-PLAN.md §16): kế hoạch không trùng, trộn 40/40/20, cổng QC tất định, chống trùng, dữ liệu kho hợp lệ.
import assert from 'assert';
import { plan, nextBatch, qc, Dedupe, known, readBank, estSeconds, TYPES } from '../scriptbank/lib.mjs';

const P = plan(), ids = new Set(P.map(p => p.pid));
assert.strictEqual(ids.size, P.length, 'pid trùng');
assert(P.length >= 20000, 'kế hoạch < 20k điểm: ' + P.length);
for (const t of TYPES) assert(P.some(p => p.type === t), 'thiếu loại ' + t);
const done = new Set(), b = nextBatch(P, done, 20, 2, 0);
assert.strictEqual(b.length, 20); assert.deepStrictEqual(['easy', 'medium', 'hard'].map(d => b.filter(p => p.diff === d).length), [8, 8, 4]);
assert(new Set(b.map(p => p.type)).size >= 6, 'lô không đa dạng');

const p = P.find(x => x.pid === 'u:p:interested:m0');
const good = { point: 'Use "interested in", not "interested about".', cefr: 'A2', topic: 'study', hook: 'Interested about? Stop!', wrong: "I'm interested about politics.", right: "I'm interested in politics.",
  why: 'Interested always goes with in.', ex: ['She is interested in art.', 'Are you interested in this job?'], memory: 'interested + IN + thing', quiz: { q: "I'm interested ___ music.", options: ['in', 'about'], answer: 0, explain: 'Interested takes in.' },
  lines: [{ who: 'ama', say: 'Interested about? Stop!' }, { who: 'carlos', say: "Many learners say: I'm interested about politics." }, { who: 'ama', say: 'What sounds right?' },
    { who: 'carlos', say: "Say: I'm interested in politics." }, { who: 'ama', say: 'Interested always goes with in.' }, { who: 'carlos', say: 'For example: She is interested in art.' },
    { who: 'ama', say: 'Remember: interested plus in.' }, { who: 'carlos', say: "Repeat after me: I'm interested in politics." }, { who: 'ama', say: 'Quiz: interested in or about music?' }] };
const q = qc(p, good);
assert.deepStrictEqual(q.flags, [], 'kịch bản tốt bị chặn: ' + q.flags.join(', '));
assert(estSeconds(good.lines) >= 18 && estSeconds(good.lines) <= 28);
const bad = { ...good, hook: 'This is a very long hook line', right: good.wrong, ex: ['only one'], quiz: { q: 'x', options: ['in', 'in'], answer: 0, explain: 'x' } };
const fb = qc(p, bad).flags.join(' ');
for (const k of ['hook>5', 'wrong==right', 'ex!=2', 'quiz:dup-option']) assert(fb.includes(k), 'thiếu cờ ' + k + ' trong ' + fb);
const hard = { ...good, why: 'Interested necessitates the preposition in, notwithstanding colloquial idiosyncrasies.' };
assert(qc(p, hard).flags.some(f => f.startsWith('ngsl') || f.startsWith('why')), 'từ khó lọt cổng NGSL');
assert(known('learners') && known("don't") && known('stopped') && !known('notwithstanding'));
// sai sự thật so với nguồn: phát âm sai trọng âm
const pp = P.find(x => x.type === 'pronunciation' && x.facts.word === 'company');
assert(qc(pp, { ...good, wrong: 'com-PA-ny', right: 'COM-pa-ny', syl: 3, stress: 2 }).flags.some(f => f.startsWith('fact:stress')));
const dd = new Dedupe(); dd.add(good);
assert(dd.dup({ ...good }), 'không bắt trùng');
assert(!dd.dup({ ...good, right: 'She depends on her parents.', ex: ['It depends on the weather.', 'We rely on buses.'] }));
// kho đã có: mọi mục đúng lược đồ, không pid trùng, đều có điểm giám khảo ≥ 4
const bank = readBank(), seen = new Set();
for (const s of bank) { assert(!seen.has(s.pid), 'kho trùng ' + s.pid); seen.add(s.pid); assert(s.qc && s.qc.judge >= 4 && !(s.qc.flags || []).length, 'mục kho chưa qua cổng ' + s.id); assert(ids.has(s.pid) || /^[a-z]:/.test(s.pid)); }
console.log(`script-bank OK – kế hoạch ${P.length} điểm, kho ${bank.length}`);
