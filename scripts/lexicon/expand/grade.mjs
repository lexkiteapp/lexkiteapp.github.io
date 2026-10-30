#!/usr/bin/env node
// Chấm TỰ ĐỘNG mẫu pilot cố định (docs/QUALITY-PIPELINE.md bước 3) – chạy trên CI sau job.mjs --words content/lexicon/expand/pilot/hard.json.
//   node scripts/lexicon/expand/grade.mjs [--out reports/pilot-hard-out.json] [--labels content/lexicon/expand/pilot/labels.json] [--sheet 50]
// Nhãn xấu (lớp L1–L6 LÕI, D1–D3 DỊCH): mục ĐẠT mà trường còn giá trị xấu = LỌT → exit 1. Nhãn tốt: tỉ lệ còn đạt (theo dõi).
// In tóm tắt LÕI / DỊCH / IPA + sản lượng; ghi reports/pilot-grade.json + reports/pilot-sheet.md (50 mục đạt ngẫu nhiên tất định – tờ soát cho mắt người/tác tử).
import fs from 'fs';
import crypto from 'crypto';
import { viNorm } from './lib.mjs';
const arg = (n, d) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; };
const parts = v => String(v || '').split(/\s*;\s*/).map(x => x.trim()).filter(Boolean);
/** giá trị xấu còn trong trường? */
export function hasBad(e, lb) {
  const f = lb.field, re = lb.re ? new RegExp(lb.bad, 'i') : null;
  if (f === 'vi') return viNorm(e.vi).includes(viNorm(lb.bad)[0]);
  if (f === 'ex') return (e.ex || []).some(x => (re ? re.test(x) : x.trim() === lb.bad));
  if (f === 'sense') return String((e.src || {}).sense || '').replace(/^wordnet-3\.0:/, '') === lb.bad;
  if (f === 'def') return new RegExp(lb.bad, 'i').test(e.def || '');
  if (f === 'ipa' || f === 'ipaUS') return e[f] === lb.bad;
  if (f.startsWith('m.')) return parts((e.m || {})[f.slice(2)]).includes(lb.bad);
  return false;
}
export function applies(e, lb) {
  if (!lb.when) return true;
  if (lb.when.sense && String((e.src || {}).sense || '').replace(/^wordnet-3\.0:/, '') !== lb.when.sense) return false;
  if (lb.when.def && !new RegExp(lb.when.def, 'i').test(e.def || '')) return false;
  return true;
}
export function grade(items, L) {
  const res = { bad: { n: 0, blocked: 0, fixed: 0, leak: [], missing: 0, byCls: {} }, good: { n: 0, pass: 0, fail: [] } };
  for (const lb of L.bad) { const r = items[lb.k], c = res.bad.byCls[lb.cls] || (res.bad.byCls[lb.cls] = { n: 0, leak: 0 });
    if (!r) { res.bad.missing++; continue; } res.bad.n++; c.n++;
    if (!r.pass) { res.bad.blocked++; continue; }
    if (applies(r.ent, lb) && hasBad(r.ent, lb)) { res.bad.leak.push(`${lb.k} ${lb.cls} ${lb.field}=${lb.bad}`); c.leak++; } else res.bad.fixed++; }
  for (const g of L.good) { const r = items[g.k]; if (!r) continue; res.good.n++; if (r.pass) res.good.pass++; else res.good.fail.push(`${g.k}: ${(r.why || [])[0] || '?'}`); }
  return res;
}
if (process.argv[1] && process.argv[1].endsWith('grade.mjs')) {
  const O = JSON.parse(fs.readFileSync(arg('--out', 'reports/pilot-hard-out.json'), 'utf8')), L = JSON.parse(fs.readFileSync(arg('--labels', 'content/lexicon/expand/pilot/labels.json'), 'utf8'));
  const items = O.items || {}, N = +arg('--sheet', 50);
  const g = grade(items, L), all = Object.entries(items), pass = all.filter(([, r]) => r.pass);
  const ipaBad = pass.filter(([, r]) => r.ent && r.ent.ipaBad && r.ent.ipaBad.length).length;
  const why = {}; for (const [, r] of all) if (!r.pass) { const w = String((r.why || ['?'])[0]).split(':')[0]; why[w] = (why[w] || 0) + 1; }
  const LEAK = { core: g.bad.leak.filter(x => / L\d /.test(x)).length, tr: g.bad.leak.filter(x => / D\d /.test(x)).length };
  const sum = { batch: O.batch, n: all.length, pass: pass.length, yield: +(pass.length / Math.max(1, all.length)).toFixed(3), labelsBad: g.bad, labelsGood: { n: g.good.n, pass: g.good.pass, fail: g.good.fail.slice(0, 20) }, leakCore: LEAK.core, leakTr: LEAK.tr, ipaBad, why };
  fs.mkdirSync('reports', { recursive: true }); fs.writeFileSync('reports/pilot-grade.json', JSON.stringify(sum, null, 1));
  const h = k => crypto.createHash('sha1').update(O.batch + k).digest('hex');
  const sheet = pass.map(([k]) => k).sort((a, b) => (h(a) < h(b) ? -1 : 1)).slice(0, N).map((k, i) => { const e = items[k].ent;
    return `### ${i + 1}. ${k} — ${(e.src || {}).sense} (${e.level}, khoá ${(e.src || {}).senseLock})\n- def: ${e.def}\n- ex: ${e.ex.join(' | ')} (${((e.src || {}).ex || []).join(', ')})\n- vi: ${e.vi} (${((e.src || {}).tr || {}).vi}; nguồn ${(e.qa.viSrc || []).join('+')})\n- IPA: ${e.ipa} · US ${e.ipaUS}\n- dịch: ${Object.entries(e.m || {}).map(([l, v]) => `${l} ${v} [${((e.src || {}).tr || {})[l]}]`).join(' · ') || '—'}`; });
  fs.writeFileSync('reports/pilot-sheet.md', `# Tờ soát ${O.batch} – ${sheet.length} mục đạt ngẫu nhiên\n\n` + sheet.join('\n\n') + '\n');
  console.log(`PILOT ${O.batch}: ${pass.length}/${all.length} đạt (yield ${sum.yield}) · nhãn xấu ${g.bad.n}: chặn ${g.bad.blocked}, sửa đúng ${g.bad.fixed}, LỌT ${g.bad.leak.length} (LÕI ${LEAK.core}, DỊCH ${LEAK.tr}) · nhãn tốt còn đạt ${g.good.pass}/${g.good.n} · IPA lệch ${ipaBad}`);
  for (const [c, v] of Object.entries(g.bad.byCls)) console.log(`  ${c}: ${v.n} nhãn, lọt ${v.leak}`);
  if (g.bad.leak.length) console.log('::error::nhãn xấu LỌT: ' + g.bad.leak.join(' · '));
  console.log('lý do trượt: ' + JSON.stringify(why));
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `\n## Chấm pilot cố định\n\`\`\`\n${JSON.stringify(sum, null, 1)}\n\`\`\`\n`);
  process.exit(g.bad.leak.length || ipaBad ? 1 : 0);
}
