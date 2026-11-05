// 🎯 Đo chất lượng SỬA CÂU khi nói (docs/specs/ai-speaking-first.md §4, việc T5) trên tập có nhãn scripts/feedback/gec-set.jsonl.
// Mỗi dòng: { id, l1, lvl, q (câu hỏi của giáo viên), src (lời người học, kiểu bản chữ ASR), cor (sửa tối thiểu), alt[], err[] (nhãn kiểu ERRANT) }.
// Engine = hàm (src, q) → câu đã sửa | null. Hiện có 'rules' = CallEngine.correct (11 luật của Call). T2/T3 thêm engine mới vào ENGINES.
// Chỉ số:
//   - Phát hiện: precision = số câu bị báo mà thật sự sai / số câu bị báo; recall = số câu sai bị báo / số câu sai; FP = báo nhầm câu đúng / số câu đúng.
//   - Sửa đúng: fixP = câu sửa khớp cor/alt (bỏ hoa thường, dấu câu) / số câu bị báo; fixR = câu sửa khớp / số câu sai.
//   - Từng chỗ sửa: editP = chỗ sửa (từng từ thêm/bớt, căn LCS) có trong đáp án / tổng chỗ sửa – "không sửa SAI", kể cả khi chưa sửa HẾT.
// Cổng (chặn gộp, chạy trong npm test – thuần JS, < 1 s):
//   - Mọi engine: precision ≥ 0,95 và editP ≥ 0,95 (sai ít còn hơn sửa nhầm – học viên mất tin).
//   - Engine kind 'rewrite' (hiện CẢ câu đã sửa như câu chuẩn – LLM, T3) thêm fixP ≥ 0,95. Engine 'edit' (luật) chỉ được hiện từng chỗ sửa,
//     không hiện câu "đã sửa" như câu chuẩn khi có thể còn lỗi khác (T2: Feedback.turn tô diff).
//   - Không lùi: recall/fixR ≥ mốc trong scripts/feedback/baseline.json (tăng thì cập nhật mốc bằng --write-baseline, không bao giờ hạ mốc để qua cổng).
// Dùng: node scripts/feedback/eval.mjs [--json] [--engine=rules] [--write-baseline] [--show=fp|fn|bad]
import fs from 'node:fs'; import vm from 'node:vm'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SET = path.join(ROOT, 'scripts/feedback/gec-set.jsonl'), BASE = path.join(ROOT, 'scripts/feedback/baseline.json');
export const MIN_PRECISION = 0.95, MIN_FIX_PRECISION = 0.95; // chủ 05/11: không báo nhầm câu đúng

export const norm = s => String(s || '').toLowerCase().replace(/[’‘`]/g, "'").replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ').trim();
export const loadSet = (file = SET) => fs.readFileSync(file, 'utf8').split('\n').filter(l => l.trim()).map((l, i) => {
  const x = JSON.parse(l); if (!x.id || !x.src || typeof x.cor !== 'string' || !Array.isArray(x.err)) throw new Error(`gec-set dòng ${i + 1} thiếu trường`); return x;
});

function loadCallEngine() {
  const c = {}; vm.createContext(c); c.self = c;
  for (const f of ['pron/pairs.js', 'call/engine.js']) vm.runInContext(fs.readFileSync(path.join(ROOT, 'web/js', f), 'utf8'), c);
  return c.CallEngine;
}
export const KIND = { rules: 'edit' };
export const ENGINES = {
  rules: () => { const E = loadCallEngine(); return (src, q) => { const r = E.correct(src, q); return r ? r.good : null; }; },
};

// Căn LCS theo từ → các thao tác NGUYÊN TỬ: "-i:từ" (bỏ từ thứ i của câu gốc) · "+i:từ" (thêm từ trước vị trí i).
// Thay từ = bỏ + thêm, nên "visit → visited" vẫn khớp đáp án "visit → visited a" (một phần đúng của đáp án).
export function edits(a, b) {
  const x = norm(a).split(' ').filter(Boolean), y = norm(b).split(' ').filter(Boolean), n = x.length, m = y.length;
  const L = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = x[i] === y[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const out = []; let i = 0, j = 0;
  while (i < n || j < m) {
    if (i < n && j < m && x[i] === y[j]) { i++; j++; } else if (j < m && (i >= n || L[i][j + 1] >= L[i + 1][j])) out.push(`+${i}:${y[j++]}`); else out.push(`-${i}:${x[i++]}`);
  }
  return out;
}

export function score(set, fix) {
  const m = { n: set.length, err: 0, ok: 0, flagged: 0, tp: 0, fp: 0, fixed: 0, ed: 0, edOk: 0, byTag: {}, byL1: {}, fps: [], fns: [], bad: [] };
  for (const x of set) {
    const out = fix(x.src, x.q), hasErr = x.err.length > 0, flagged = out != null && norm(out) !== norm(x.src);
    const good = flagged && [x.cor, ...(x.alt || [])].map(norm).includes(norm(out));
    hasErr ? m.err++ : m.ok++;
    if (flagged) {
      const gold = new Set([x.cor, ...(x.alt || [])].flatMap(g => edits(x.src, g))), mine = edits(x.src, out);
      m.ed += mine.length; m.edOk += mine.filter(e => gold.has(e)).length;
    }
    if (flagged) { m.flagged++; hasErr ? m.tp++ : (m.fp++, m.fps.push([x.id, x.src, out])); }
    if (good) m.fixed++; else if (flagged && hasErr) m.bad.push([x.id, x.src, out, x.cor]);
    if (hasErr && !flagged) m.fns.push([x.id, x.err.join('+'), x.src]);
    const l = m.byL1[x.l1] || (m.byL1[x.l1] = { err: 0, hit: 0 }); if (hasErr) { l.err++; if (good) l.hit++; }
    for (const t of x.err) { const b = m.byTag[t] || (m.byTag[t] = { n: 0, hit: 0 }); b.n++; if (good) b.hit++; }
  }
  const r = (a, b) => (b ? +(a / b).toFixed(3) : 1);
  Object.assign(m, { precision: r(m.tp, m.flagged), recall: r(m.tp, m.err), fpRate: r(m.fp, m.ok), fixP: r(m.fixed, m.flagged), fixR: r(m.fixed, m.err), editP: r(m.edOk, m.ed) });
  return m;
}

export function gate(name, m, base, kind = KIND[name]) {
  const errs = [];
  if (m.flagged && m.precision < MIN_PRECISION) errs.push(`${name}: precision ${m.precision} < ${MIN_PRECISION} (báo nhầm ${m.fp} câu đúng)`);
  if (m.flagged && m.editP < MIN_FIX_PRECISION) errs.push(`${name}: editP ${m.editP} < ${MIN_FIX_PRECISION} (${m.ed - m.edOk}/${m.ed} chỗ sửa không có trong đáp án)`);
  if (kind === 'rewrite' && m.flagged && m.fixP < MIN_FIX_PRECISION) errs.push(`${name}: fixP ${m.fixP} < ${MIN_FIX_PRECISION} (${m.flagged - m.fixed} câu sửa không khớp đáp án)`);
  const b = base && base[name];
  if (b) for (const k of ['recall', 'fixR', 'editP']) if (m[k] < b[k]) errs.push(`${name}: ${k} ${m[k]} < mốc ${b[k]} (lùi chất lượng)`);
  return errs;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const arg = k => (process.argv.find(a => a.startsWith(`--${k}=`)) || '').split('=')[1], has = k => process.argv.includes(`--${k}`);
  const set = loadSet(), names = arg('engine') ? [arg('engine')] : Object.keys(ENGINES);
  const base = fs.existsSync(BASE) ? JSON.parse(fs.readFileSync(BASE, 'utf8')) : {}, out = {}, errs = [];
  for (const name of names) {
    const m = score(set, ENGINES[name]()); out[name] = m; errs.push(...gate(name, m, base));
    const tags = Object.entries(m.byTag).sort().map(([t, b]) => `${t} ${b.hit}/${b.n}`).join(' · ');
    if (!has('json')) console.log(`${name}: n=${m.n} (sai ${m.err}, đúng ${m.ok}) · precision ${m.precision} · recall ${m.recall} · báo nhầm ${m.fp}/${m.ok} · editP ${m.editP} · fixP ${m.fixP} · fixR ${m.fixR}\n  theo nhãn: ${tags}`);
    const show = arg('show'); if (show) for (const row of m[show + 's'] || m[show] || []) console.log('  ' + row.join(' | '));
  }
  if (has('json')) console.log(JSON.stringify(Object.fromEntries(Object.entries(out).map(([k, m]) => [k, { ...m, fps: undefined, fns: undefined, bad: undefined }])), null, 1));
  if (has('write-baseline')) {
    const nb = { ...base }; for (const [k, m] of Object.entries(out)) nb[k] = { recall: Math.max(m.recall, (base[k] || {}).recall || 0), fixR: Math.max(m.fixR, (base[k] || {}).fixR || 0), editP: Math.max(m.editP, (base[k] || {}).editP || 0), n: m.n };
    fs.writeFileSync(BASE, JSON.stringify(nb, null, 1) + '\n'); console.log('→ ghi mốc', BASE);
  }
  if (errs.length) { console.error('✗ feedback-eval:\n  ' + errs.join('\n  ')); process.exit(1); }
  if (!has('json')) console.log(`✓ feedback-eval: ${names.join(', ')} đạt cổng (precision/editP ≥ ${MIN_PRECISION}, không lùi so với mốc)`);
}
