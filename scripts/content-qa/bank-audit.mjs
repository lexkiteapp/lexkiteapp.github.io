#!/usr/bin/env node
// Kiểm toán kho đề/bài tập trắc nghiệm (docs/CONTENT-WORLD-PLAN.md §7, sóng E0). 0 token, chỉ đọc repo, tất định.
// Duyệt đệ quy mọi nội dung nạp bởi loadContent(), gặp đối tượng có `options` (mảng) + đáp án (`a` | `answer`) = 1 câu trắc nghiệm.
// Đo: số câu theo nhóm/cấp/dạng · vị trí đáp án (lệch?) · đáp án dài nhất (mẹo làm bài) · đáp án nhiễu trùng/“all of the above” ·
// câu trùng · lời giải thiếu / ngắn / RẬP KHUÔN (cùng 4 từ đầu lặp ≥ 8 lần) · lời giải không nhắc đáp án đúng.
// Dùng: node scripts/content-qa/bank-audit.mjs [--json]  → ghi reports/bank-audit.json, in bảng; không đổi exit code (đo, chưa chặn).
import fs from 'node:fs';
import { loadContent } from '../lib/content-load.mjs';

const C = loadContent();
const SKIP = new Set(['console', 'Date', 'Math', 'JSON', 'setTimeout', 'clearTimeout', 'localStorage', 'navigator', 'self', 'window', 't', 'GRAMMAR_CHECK', 'DistRules', 'KVoice', 'LKFile', 'LKQR', 'LkVideoRank', 'VBStruct', 'Lexis', 'IELTS_DATA']);
const norm = s => String(s || '').toLowerCase().replace(/[^\p{L}\p{N} ]+/gu, ' ').replace(/\s+/g, ' ').trim();
const groups = {};
const G = name => (groups[name] ||= { n: 0, pos: [0, 0, 0, 0, 0, 0], nOpt: {}, noExplain: 0, shortExplain: 0, explainNotMention: 0, longestIsAnswer: 0, dupOpts: 0, allAbove: 0, level: {}, kind: {}, q: new Map(), lead: new Map(), expl: new Map() });
const seen = new WeakSet();
function walk(v, path, lvl) {
  if (!v || typeof v !== 'object' || seen.has(v)) return; seen.add(v);
  if (Array.isArray(v)) { for (const x of v) walk(x, path, lvl); return; }
  const level = String(v.level || v.cefr || lvl || '').toUpperCase() || '—';
  if (Array.isArray(v.options) && v.options.length >= 2 && (Number.isInteger(v.a) || Number.isInteger(v.answer))) {
    const g = G(path), a = Number.isInteger(v.a) ? v.a : v.answer, opts = v.options.map(String);
    g.n++; g.pos[Math.min(a, 5)]++; g.nOpt[opts.length] = (g.nOpt[opts.length] || 0) + 1;
    g.level[level] = (g.level[level] || 0) + 1; const kind = v.kind || v.type || '—'; g.kind[kind] = (g.kind[kind] || 0) + 1;
    const lens = opts.map(o => o.length), mx = Math.max(...lens);
    if (lens[a] === mx && lens.filter(l => l === mx).length === 1 && opts.length > 2 && mx - Math.max(...lens.filter((_, i) => i !== a)) >= 4) g.longestIsAnswer++;
    if (new Set(opts.map(norm)).size < opts.length) g.dupOpts++;
    if (opts.some(o => /all of the above|none of the above/i.test(o))) g.allAbove++;
    const k = norm((v.q || v.text || '') + '|' + opts.map(norm).sort().join('|')); if (k.length > 12) g.q.set(k, (g.q.get(k) || 0) + 1);
    const ex = Array.isArray(v.explain) ? v.explain.join(' ') : v.explain || v.why || v.exp || '';
    if (!String(ex).trim()) g.noExplain++;
    else {
      if (String(ex).length < 40) g.shortExplain++;
      const ans = norm(opts[a]); if (ans && ans.length > 1 && !norm(ex).includes(ans)) g.explainNotMention++;
      const lead = norm(ex).split(' ').slice(0, 4).join(' '); if (lead.split(' ').length === 4) g.lead.set(lead, (g.lead.get(lead) || 0) + 1);
      const key = norm(ex); g.expl.set(key, (g.expl.get(key) || 0) + 1);
    }
  }
  for (const [k, x] of Object.entries(v)) if (x && typeof x === 'object') walk(x, path, v.level || lvl);
}
for (const [name, val] of Object.entries(C)) {
  if (SKIP.has(name) || !val || typeof val !== 'object') continue;
  if (!Array.isArray(val) && !['TOEIC', 'TOEFL', 'TQH'].includes(name)) { const sub = Object.entries(val); if (sub.length && sub.every(([, x]) => x && typeof x === 'object')) { for (const [k, x] of sub) walk(x, `${name}.${k}`); continue; } }
  if (['TOEIC', 'TOEFL', 'TQH'].includes(name)) { for (const [k, x] of Object.entries(val)) walk(x, `${name}.${k}`); continue; }
  walk(val, name);
}
const out = {}, pc = (a, b) => (b ? Math.round((1000 * a) / b) / 10 : 0);
for (const [name, g] of Object.entries(groups)) {
  const dupQ = [...g.q.values()].filter(x => x > 1).reduce((a, x) => a + x - 1, 0);
  const templated = [...g.lead.values()].filter(x => x >= 8).reduce((a, x) => a + x, 0);
  const dupExpl = [...g.expl.values()].filter(x => x > 1).reduce((a, x) => a + x - 1, 0);
  const posMax = Math.max(...g.pos.slice(0, 4)), posMin = Math.min(...g.pos.slice(0, 4));
  out[name] = { items: g.n, levels: g.level, kinds: g.kind, answerPos: g.pos.slice(0, 4).map(x => pc(x, g.n)), posSkew: pc(posMax - posMin, g.n),
    noExplainPct: pc(g.noExplain, g.n), shortExplainPct: pc(g.shortExplain, g.n), explainNotMentionAnsPct: pc(g.explainNotMention, g.n),
    templatedExplainPct: pc(templated, g.n), duplicateExplainPct: pc(dupExpl, g.n), duplicateQuestionPct: pc(dupQ, g.n),
    longestIsAnswerPct: pc(g.longestIsAnswer, g.n), dupOptionPct: pc(g.dupOpts, g.n), allAbovePct: pc(g.allAbove, g.n) };
}
fs.mkdirSync('reports', { recursive: true }); fs.writeFileSync('reports/bank-audit.json', JSON.stringify(out, null, 1));
const tot = Object.values(out).reduce((a, x) => a + x.items, 0);
if (process.argv.includes('--json')) console.log(JSON.stringify(out, null, 1));
else {
  console.log(`Kho trắc nghiệm đo được: ${tot} câu, ${Object.keys(out).length} nhóm\n`);
  console.log('nhóm | câu | lệch vị trí đ.án % | đ.án dài nhất % | không giải thích % | rập khuôn % | trùng lời giải % | trùng câu %');
  for (const [k, x] of Object.entries(out).sort((a, b) => b[1].items - a[1].items)) console.log([k, x.items, x.posSkew, x.longestIsAnswerPct, x.noExplainPct, x.templatedExplainPct, x.duplicateExplainPct, x.duplicateQuestionPct].join(' | '));
}
