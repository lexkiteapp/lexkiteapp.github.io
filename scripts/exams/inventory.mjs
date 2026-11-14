// 📊 Kiểm kê kho đề thi: đề / câu theo kỳ thi × kỹ năng × dạng câu (đọc data thật qua loadContent, không đoán).
//   node scripts/exams/inventory.mjs            in bảng Markdown
//   node scripts/exams/inventory.mjs --json     in JSON (cho audit / so sánh trước-sau)
// Dùng cho docs/audits/exams-2026-11.md; chạy trên CI hoặc máy, nhẹ (< 2 s).
import { loadContent } from '../lib/content-load.mjs';
const K = loadContent();
const cnt = (a) => (a || []).length;
// Gom câu theo dạng từ mọi `groups` (định dạng qengine) trong một đơn vị
function groupsOf(unit, acc = {}) {
  const walk = (o) => {
    if (!o || typeof o !== 'object') return;
    if (Array.isArray(o)) return o.forEach(walk);
    if (Array.isArray(o.groups)) for (const g of o.groups) { const t = g.type || '?'; acc[t] = (acc[t] || 0) + (cnt(g.items) || cnt(g.n)); }
    for (const k of Object.keys(o)) if (k !== 'groups' && typeof o[k] === 'object') walk(o[k]);
  };
  walk(unit); return acc;
}
const add = (a, b) => { for (const k in b) a[k] = (a[k] || 0) + b[k]; return a; };
const sum = (o) => Object.values(o).reduce((a, b) => a + b, 0);
const R = {};
// IELTS
const gtOf = (r) => !!r.gt;
const rd = K.READTESTS || [];
for (const [key, list] of [['ielts-reading-ac', rd.filter((r) => !gtOf(r))], ['ielts-reading-gt', rd.filter(gtOf)]]) {
  const types = {}; list.forEach((r) => groupsOf(r, types));
  R[key] = { tests: list.length, questions: sum(types), types, perTest: list.map((r) => [r.id, sum(groupsOf(r))]) };
}
{ const types = {}; (K.LISTENING || []).forEach((u) => groupsOf(u, types));
  R['ielts-listening'] = { tests: new Set((K.LISTENING || []).map((u) => u.test)).size, sections: cnt(K.LISTENING), questions: sum(types), types }; }
R['ielts-writing-models'] = { models: cnt(K.MODELS), task1: (K.MODELS || []).filter((m) => m.task === 1).length, task2: (K.MODELS || []).filter((m) => m.task === 2).length };
R['ielts-speaking'] = { sets: cnt(K.SPEAK_MORE) };
// TOEIC
{ const T = K.TOEIC || {}; const r = {}, l = {};
  (T.reading || []).forEach((t) => groupsOf(t, r)); (T.listening || []).forEach((u) => groupsOf(u, l));
  const parts = {}; (T.listening || []).forEach((u) => { parts['L' + u.part] = (parts['L' + u.part] || 0) + sum(groupsOf(u)); });
  R['toeic-lr'] = { readingTests: cnt(T.reading), listeningUnits: cnt(T.listening), listeningTests: new Set((T.listening || []).map((u) => u.test)).size, readingQ: sum(r), listeningQ: sum(l), readingTypes: r, listeningTypes: l, listeningByPart: parts };
  const S = K.TOEIC_SW || {}; const bt = (a) => (a || []).reduce((m, x) => ((m[x.task] = (m[x.task] || 0) + 1), m), {});
  R['toeic-sw'] = { speaking: bt(S.speaking), writing: bt(S.writing), pictureTasks: [...(S.speaking || []), ...(S.writing || [])].filter((x) => /pic|photo|describe/i.test(x.task)).length };
}
// TOEFL
{ const T = K.TOEFL || {}; const sets = {};
  for (const sk of ['reading', 'listening', 'writing', 'speaking']) for (const u of T[sk] || []) { const s = (sets[u.set] = sets[u.set] || { reading: 0, listening: 0, writing: 0, speaking: 0 }); s[sk] += 1; }
  const t = {}; for (const sk of ['reading', 'listening']) (T[sk] || []).forEach((u) => groupsOf(u, t));
  const tasks = {}; for (const sk of ['reading', 'listening', 'writing', 'speaking']) for (const u of T[sk] || []) { const k = sk + ':' + u.task; tasks[k] = (tasks[k] || 0) + 1; }
  R['toefl-2026'] = { sets: Object.keys(sets).length, bySet: sets, mcqQuestions: sum(t), mcqTypes: t, unitsByTask: tasks };
}
// Cambridge
{ const by = {}; for (const x of K.CAMBRIDGE || []) { by[x.level] = (by[x.level] || 0) + 1; }
  R.cambridge = { tests: cnt(K.CAMBRIDGE), byLevel: { a2: by.a2 || 0, b1: by.b1 || 0, b2: by.b2 || 0, c1: by.c1 || 0, c2: by.c2 || 0 } }; }
if (process.argv.includes('--json')) console.log(JSON.stringify(R, null, 1));
else for (const [k, v] of Object.entries(R)) console.log(`### ${k}\n\`\`\`\n${JSON.stringify(v)}\n\`\`\``);
