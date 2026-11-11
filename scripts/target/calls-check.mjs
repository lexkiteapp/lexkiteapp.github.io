#!/usr/bin/env node
// Cổng máy cho cuộc gọi es (W4): chuẩn es-419 (spec §8) + cấu trúc nút. 0 mạng. Dùng: node scripts/target/calls-check.mjs
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url'; import { TL_RULES } from './lib.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'), DIR = path.join(ROOT, 'content/target/es/calls');
const fold = s => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
const LV = ['A1', 'A2', 'B1', 'B2', 'C1'], bad = [];
const lint = TL_RULES.es.lint, extra = [/(^|[^\p{L}])(tío|tía|molar|guay|chaval|móvil|coche|patata|gilipollas)(?=$|[^\p{L}])/iu];
const fs_ = fs.readdirSync(DIR).filter(f => /^calls-\d+\.json$/.test(f)).sort(), all = [];
for (const f of fs_) for (const c of JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'))) all.push(c);
const ids = new Set();
for (const c of all) {
  const e = m => bad.push(c.id + ': ' + m);
  if (!/^es-[a-z0-9-]+$/.test(c.id)) e('id'); if (ids.has(c.id)) e('id trùng'); ids.add(c.id);
  if (!LV.includes(c.lv)) e('lv ' + c.lv); if (!['chat', 'role'].includes(c.kind)) e('kind'); if (!['ama', 'carlos'].includes(c.who)) e('who');
  for (const k of ['em', 'title', 'tr', 'role']) if (!c[k]) e('thiếu ' + k);
  if (!(c.words || []).length || !(c.phrases || []).length) e('thiếu words/phrases');
  const N = c.nodes || {}, keys = Object.keys(N); if (!N[c.start]) e('start không có');
  const reach = new Set(), q = [c.start];
  while (q.length) { const k = q.pop(); if (reach.has(k) || !N[k]) continue; reach.add(k); for (const b of N[k].br || []) if (b[2]) q.push(b[2]); if (N[k].next) q.push(N[k].next); }
  for (const k of keys) if (!reach.has(k)) e('nút mồ côi ' + k);
  const texts = [c.title, c.end, ...(c.phrases || []).map(p => p[0])].filter(Boolean);
  for (const [k, n] of Object.entries(N)) {
    if (!n.m) e(k + ': thiếu m'); if (!n.re) e(k + ': thiếu re'); if (!(n.o || []).length || n.o.length < 3) e(k + ': <3 câu mẫu');
    if (n.next && !N[n.next] && n.next !== 'end') e(k + ': next lạ ' + n.next);
    for (const b of n.br || []) { if (b[2] && !N[b[2]] && b[2] !== 'end') e(k + ': nhánh lạ ' + b[2]); try { new RegExp(b[0]); } catch { e(k + ': regex hỏng'); } texts.push(b[1]); }
    const W = t => (fold(t).match(/[a-z]+/g) || []).length; for (const o of n.o || []) if (n.min && W(o) < n.min) e(k + ': câu mẫu ngắn hơn min ' + n.min + ': ' + o);
    texts.push(n.m, n.re, ...(n.o || []));
  }
  for (const t of texts) { if (typeof t !== 'string') continue; if (lint.some(r => r.test(t)) || extra.some(r => r.test(t))) e('lệch es-419: ' + t); if (/\p{Script=Latin}/u.test(t) && /\b(the|and|you|is)\b/i.test(t)) e('lẫn tiếng Anh: ' + t); }
}
const byLv = {}; for (const c of all) byLv[c.lv] = (byLv[c.lv] || 0) + 1;
if (all.length < 24) bad.push('cần ≥ 24 cuộc, có ' + all.length); for (const l of LV) if (!byLv[l]) bad.push('thiếu cấp ' + l);
if (bad.length) { console.error(bad.join('\n')); console.error(`✗ ${bad.length} lỗi`); process.exit(1); }
console.log(`✓ ${all.length} cuộc gọi es OK`, JSON.stringify(byLv));
