#!/usr/bin/env node
// B10 (docs/research/ielts-format-coverage-2311.md): đếm số NHÓM câu theo từng DẠNG câu trong dữ liệu IELTS (Listening, Reading AC/GT)
// và so với `types` của từng phần trong content/exams/spec/ielts-ac.json. exam-format-check kiểm đếm phần/câu; file này kiểm PHỦ KIỂU CÂU.
// Dùng: node scripts/content-qa/ielts-type-coverage.mjs [--write]  → in bảng; --write ghi reports/ielts-type-coverage.json.
// Cổng (scripts/test/ielts-type-coverage.mjs): dạng spec chưa có nhóm nào = "khoảng trống đã biết" ở content/exams/spec/type-gaps.json – CHỈ được bớt (no-cuts).
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { loadContent, ROOT } from '../lib/content-load.mjs';
// kiểu trong dữ liệu (qengine groupHtml) → kiểu trong spec
export const DATA2SPEC = {
  form: ['form'], note: ['note'], table: ['table'], mcq: ['mcq'], multi: ['mcq'], summary: ['summary'], sentence: ['sentence'],
  tfng: ['tfng'], ynng: ['ynng'], shortanswer: ['short-answer'], summarybank: ['summary'], figure: ['map', 'plan', 'diagram'], map: ['map', 'plan'], flow: ['flow-chart'], flowchart: ['flow-chart'],
  match: ['matching', 'headings', 'sentence-endings'], // `match` chung: dạng con (đề mục / câu kết) phân biệt bằng g.sub nếu có
};
const subOf = g => (g.type === 'match' && g.sub) ? ({ headings: ['headings'], endings: ['sentence-endings'], 'sentence-endings': ['sentence-endings'], features: ['matching'], info: ['matching'] }[g.sub] || ['matching']) : null;
export function coverage(K = loadContent(), specAc = JSON.parse(fs.readFileSync(ROOT + '/content/exams/spec/ielts-ac.json', 'utf8')), specGt = JSON.parse(fs.readFileSync(ROOT + '/content/exams/spec/ielts-gt.json', 'utf8'))) {
  const out = {}, add = (unit, part, g) => { const t = g.type || '?', u = (out[unit] = out[unit] || { groups: {}, spec: {} }); u.groups[t] = (u.groups[t] || 0) + 1; (subOf(g) || DATA2SPEC[t] || []).forEach(s => { const k = `${part}:${s}`; u.spec[k] = (u.spec[k] || 0) + 1; }); };
  for (const L of K.LISTENING || []) for (const g of L.groups || []) add('ielts-listening', 'L' + L.part, g);
  for (const R of K.READTESTS || []) for (const p of R.passages || []) for (const g of p.groups || []) add(R.gt ? 'ielts-reading-gt' : 'ielts-reading-ac', 'P' + p.n, g);
  const need = (spec, sk, pre) => ((spec.sections || []).find(s => s.id === sk) || { parts: [] }).parts.flatMap(p => (p.types || []).map(t => `${pre}${p.n}:${t}`));
  const gaps = {};
  const chk = (unit, keys) => { const have = (out[unit] || { spec: {} }).spec; gaps[unit] = keys.filter(k => !have[k]); };
  chk('ielts-listening', need(specAc, 'listening', 'L')); chk('ielts-reading-ac', need(specAc, 'reading', 'P')); chk('ielts-reading-gt', need(specGt, 'reading', 'P'));
  return { units: out, gaps };
}
if (process.argv[1] && fileURLToPath(import.meta.url) === fs.realpathSync(process.argv[1])) {
  const r = coverage();
  for (const [u, g] of Object.entries(r.gaps)) console.log(`${u}: ${g.length} dạng spec chưa có nhóm câu: ${g.join(', ') || '—'}`);
  if (process.argv.includes('--write')) fs.writeFileSync(ROOT + '/reports/ielts-type-coverage.json', JSON.stringify(r, null, 1) + '\n');
}
