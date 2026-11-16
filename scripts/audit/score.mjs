// Audit tổng – chấm 0–100 từ số đo thô, ra MỘT bảng (docs/QUALITY-SWEEP.md §Audit tổng). Thuần, tách khỏi trình duyệt để đổi công thức không phải quét lại và có test (--self-test).
// Mục/tiêu chí không đo được = null = "chưa đo": không tính vào điểm, không bao giờ cho điểm giả.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

export const PASS = 90; // chuẩn "đạt" của một mục
export const CRIT = [
  { k: 'fn', w: 20, label: 'Chức năng' }, { k: 'js', w: 15, label: 'Lỗi JS' }, { k: 'state', w: 10, label: 'Rỗng/lỗi/tải' }, { k: 'exit', w: 5, label: 'Back/Thoát' },
  { k: 'contrast', w: 10, label: 'Tương phản' }, { k: 'tap', w: 5, label: 'Chạm ≥44' }, { k: 'layout', w: 10, label: 'Bố cục' }, { k: 'i18n', w: 10, label: 'i18n 15' },
  { k: 'perf', w: 10, label: 'Hiệu năng' }, { k: 'beauty', w: 15, label: 'Độ đẹp' },
];
const clamp = x => Math.max(0, Math.min(100, Math.round(x)));
const ramp = (v, good, bad) => 100 * (1 - (v - good) / (bad - good)); // ≤ good = 100, ≥ bad = 0
const uniq = a => [...new Set(a)];

/** Điểm từng tiêu chí + danh sách lỗi cụ thể từ số đo thô của một mục. */
export function scoreItem(raw) {
  const s = {}, issues = [], push = (c, m) => issues.push({ c, m });
  if (raw.kind === 'native') {
    s.fn = raw.ci == null ? null : raw.done ? (raw.ci ? 100 : 0) : null;
    if (raw.done && raw.ci === false) push('fn', `workflow native trên main đang đỏ`);
    if (!raw.done) push('fn', 'chưa có màn native (app Capacitor vẫn phục vụ)');
    return finish(raw, s, issues);
  }
  const V = raw.variants || [];
  if (!V.length) return finish(raw, s, issues.concat(raw.fatal ? [{ c: 'fn', m: 'không đo được: ' + raw.fatal }] : []));
  const blank = V.filter(v => !v.painted || v.painted.err || !v.painted.viewText);
  let fn = 100 * (1 - blank.length / V.length);
  for (const v of blank) push('fn', `${v.tag}: màn trống/báo lỗi`);
  if (raw.cta) { if (raw.cta.found && raw.cta.live === false) { fn = Math.min(fn, 50); push('fn', `nút chính không phản hồi: ${raw.cta.label || ''}`); } }
  if (raw.links) { fn -= Math.min(40, raw.links.bad.length * 10); for (const l of raw.links.bad.slice(0, 5)) push('fn', 'link hỏng: ' + l); }
  s.fn = clamp(fn);
  const errs = uniq(V.flatMap(v => v.errs || [])); s.js = clamp(100 - errs.length * 25); for (const e of errs.slice(0, 5)) push('js', e.slice(0, 160));
  if (raw.states) {
    const parts = Object.entries(raw.states).filter(([, v]) => v && v.ok != null);
    s.state = parts.length ? clamp(100 * parts.filter(([, v]) => v.ok).length / parts.length) : null;
    for (const [k, v] of parts) if (!v.ok) push('state', `${k}: ${v.msg}`);
  } else s.state = raw.kind === 'page' ? 'na' : null;
  if (raw.exit && raw.exit.na) s.exit = 'na';
  else if (raw.exit) { const parts = ['button', 'click', 'esc', 'back'].filter(k => raw.exit[k] != null); s.exit = parts.length ? clamp(100 * parts.filter(k => raw.exit[k]).length / parts.length) : null; for (const k of parts) if (!raw.exit[k]) push('exit', `thoát bằng ${k} không chạy`); } else s.exit = null;
  const scan = uniq(V.flatMap(v => (v.scan || []).map(i => JSON.stringify(i)))).map(x => JSON.parse(x));
  const sig = k => uniq(scan.filter(i => i.k === k).map(i => i.sig));
  const axe = uniq(V.flatMap(v => (v.axe || [])));
  const ctr = uniq([...sig('contrast'), ...axe]); s.contrast = clamp(100 - ctr.length * 10); for (const c of ctr.slice(0, 5)) push('contrast', c.slice(0, 140));
  const tap = sig('tap'); s.tap = clamp(100 - tap.length * 8); for (const c of tap.slice(0, 5)) push('tap', scan.find(i => i.sig === c).msg.slice(0, 140));
  const LAY = ['hscroll', 'clip', 'spill', 'offscreen', 'covered', 'align', 'inlinebox', 'wrap', 'lone', 'cls', 'nolabel', 'indicator'];
  const lay = scan.filter(i => LAY.includes(i.k)); const fails = uniq(lay.filter(i => i.sev === 'fail').map(i => i.sig)), warns = uniq(lay.filter(i => i.sev !== 'fail').map(i => i.sig));
  s.layout = clamp(100 - fails.length * 15 - warns.length * 4); for (const c of [...fails, ...warns].slice(0, 5)) push('layout', lay.find(i => i.sig === c).msg.slice(0, 140));
  if (raw.i18n && raw.i18n.length) { const bad = raw.i18n.filter(x => !x.ok); s.i18n = clamp(100 * (1 - bad.length / raw.i18n.length)); for (const b of bad.slice(0, 4)) push('i18n', `${b.lang}: ${(b.leak || []).slice(0, 2).join(' · ')}`.slice(0, 160)); } else s.i18n = null;
  if (raw.perf && raw.perf.lcp != null) {
    const p = raw.perf, parts = [[ramp(p.lcp, 2500, 6000), .5], [ramp(p.cls, .1, .4), .25], [ramp(p.tbt, 200, 1000), .25]];
    s.perf = clamp(parts.reduce((a, [v, w]) => a + Math.max(0, Math.min(100, v)) * w, 0));
    if (s.perf < PASS) push('perf', `LCP ${p.lcp} ms · CLS ${p.cls} · TBT ${p.tbt} ms`);
  } else s.perf = null;
  if (raw.beauty && raw.beauty.score != null) { s.beauty = clamp(raw.beauty.score); for (const m of (raw.beauty.problems || []).slice(0, 3)) push('beauty', String(m).slice(0, 180)); } else s.beauty = null;
  return finish(raw, s, issues);
}

function finish(raw, s, issues) {
  const on = CRIT.filter(c => s[c.k] !== 'na'), measured = on.filter(c => typeof s[c.k] === 'number');
  const W = measured.reduce((a, c) => a + c.w, 0), all = on.reduce((a, c) => a + c.w, 0), cov = all ? W / all : 0;
  let score = W ? clamp(measured.reduce((a, c) => a + s[c.k] * c.w, 0) / W) : null;
  if (score != null && s.fn != null && s.fn < 50) score = Math.min(score, 40); // màn hỏng không được cứu bằng tiêu chí khác
  if (cov < .5) score = null; // đo chưa tới nửa trọng số: "chưa đo", không xếp hạng
  return { id: raw.id, kind: raw.kind, name: raw.name, score, coverage: Math.round(cov * 100), c: s, issues, shots: raw.shots || {}, url: raw.hash || raw.url || raw.page || '' };
}

export function buildReport(raws, prev, meta) {
  const items = raws.map(scoreItem), scored = items.filter(i => i.score != null).sort((a, b) => a.score - b.score || a.id.localeCompare(b.id)), none = items.filter(i => i.score == null);
  const before = Object.fromEntries(((prev && prev.items) || []).map(i => [i.id, i.score]));
  for (const i of items) i.delta = i.score != null && before[i.id] != null ? i.score - before[i.id] : null;
  const avg = l => l.length ? Math.round(l.reduce((a, i) => a + i.score, 0) / l.length * 10) / 10 : null;
  const coverage = Object.fromEntries(CRIT.map(c => { const on = items.filter(i => i.c[c.k] !== 'na'); return [c.k, { measured: on.filter(i => typeof i.c[c.k] === 'number').length, of: on.length }]; }));
  return { ...meta, summary: { items: items.length, scored: scored.length, notMeasured: none.length, avg: avg(scored), pass: scored.filter(i => i.score >= PASS).length, below: scored.filter(i => i.score < PASS).length, byKind: Object.fromEntries(['app', 'page', 'ext', 'native'].map(k => [k, avg(scored.filter(i => i.kind === k))])), prevAvg: prev && prev.summary ? prev.summary.avg : null }, coverage, items: [...scored, ...none] };
}

const cell = v => v === 'na' ? '–' : v == null ? '∅' : v;
const slug = id => id.replace(/[^\w.-]+/g, '_');
export function toMarkdown(R) {
  const s = R.summary, L = [`# Audit tổng – ${R.at} · ${String(R.sha).slice(0, 7)}`, '',
    `**Trung bình ${s.avg}**${s.prevAvg != null ? ` (lần trước ${s.prevAvg})` : ''} · ${s.items} mục · đạt ≥ ${PASS}: **${s.pass}** · dưới chuẩn: **${s.below}** · chưa đo: **${s.notMeasured}**`,
    `App ${s.byKind.app ?? '∅'} · Web ${s.byKind.page ?? '∅'} · Add-on ${s.byKind.ext ?? '∅'} · Native ${s.byKind.native ?? '∅'}`, '',
    `Độ phủ: ${CRIT.map(c => `${c.label} ${R.coverage[c.k].measured}/${R.coverage[c.k].of}`).join(' · ')}`, '',
    '∅ = chưa đo (không tính điểm) · – = không áp dụng. Công thức: docs/QUALITY-SWEEP.md.', '',
    `| # | Mục | Điểm | Δ | ${CRIT.map(c => c.label).join(' | ')} | Ảnh | Lỗi chính |`, `|--:|---|--:|--:|${CRIT.map(() => '--:').join('|')}|---|---|`];
  R.items.forEach((i, n) => {
    const shot = Object.values(i.shots)[0], top = i.issues.slice(0, 3).map(x => `[${x.c}] ${x.m}`.replace(/\|/g, '\\|').replace(/\n/g, ' ')).join('<br>');
    L.push(`| ${n + 1} | [${i.name.replace(/\|/g, '\\|')}](items/${slug(i.id)}.md) | **${cell(i.score)}** | ${i.delta == null ? '' : i.delta > 0 ? '+' + i.delta : i.delta} | ${CRIT.map(c => cell(i.c[c.k])).join(' | ')} | ${shot ? `<img src="${shot}" width="70">` : ''} | ${top} |`);
  });
  return L.join('\n') + '\n';
}
export const itemMd = i => [`# ${i.name}`, '', `Điểm: **${cell(i.score)}** · độ phủ ${i.coverage} % · ${i.url}`, '', ...CRIT.map(c => `- ${c.label}: ${cell(i.c[c.k])}`), '', '## Lỗi', ...i.issues.map(x => `- [${x.c}] ${x.m}`), '', '## Ảnh', ...Object.entries(i.shots).map(([k, f]) => `${k}<br><img src="../${f}" width="260">`)].join('\n') + '\n';

/** Gom data-*.json của các shard + judge → bộ số đo đầy đủ (mục nào không có shard nào đo → giữ, ghi fatal). */
export function mergeRaw(dir, all) {
  const got = new Map();
  for (const f of fs.readdirSync(dir).filter(x => /^data-.*\.json$/.test(x))) for (const r of JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))) got.set(r.id, r);
  return all.map(i => got.get(i.id) || { ...i, fatal: 'không có shard nào trả kết quả' });
}

if (process.argv.includes('--self-test')) {
  const V = [{ tag: '390l', painted: { viewText: 50 }, errs: [], scan: [], axe: [] }];
  const ok = { id: 'a', kind: 'app', name: 'a', variants: V, states: { empty: { ok: true } }, exit: { na: true }, i18n: [{ lang: 'de', ok: true }], perf: { lcp: 2000, cls: 0, tbt: 0 } };
  const a = scoreItem(ok); assert.equal(a.c.fn, 100); assert.equal(a.c.beauty, null, 'không có giám khảo = chưa đo'); assert.equal(a.c.exit, 'na'); assert.equal(a.score, 100, 'chưa đo không kéo điểm xuống hay lên');
  const blank = scoreItem({ ...ok, variants: [{ tag: '390l', painted: { viewText: 0 }, errs: [], scan: [], axe: [] }] }); assert.ok(blank.score <= 40, 'màn trống bị chặn trần');
  const nm = scoreItem({ id: 'b', kind: 'app', name: 'b', fatal: 'timeout' }); assert.equal(nm.score, null, 'đo hỏng = chưa đo, không phải 0'); 
  const nat = scoreItem({ id: 'n', kind: 'native', name: 'n', done: false, ci: true }); assert.equal(nat.score, null, 'native chưa có màn = chưa đo');
  const R = buildReport([ok, { ...ok, id: 'c', name: 'c', perf: { lcp: 9000, cls: 1, tbt: 3000 } }, { id: 'd', kind: 'app', name: 'd' }], { items: [{ id: 'a', score: 80 }], summary: { avg: 80 } }, { at: 'x', sha: 'y' });
  assert.equal(R.items[0].id, 'c', 'xếp thấp → cao'); assert.equal(R.items.find(i => i.id === 'a').delta, 20, 'so lần trước'); assert.equal(R.items.at(-1).id, 'd', 'chưa đo xuống cuối'); assert.equal(R.summary.notMeasured, 1); assert.ok(toMarkdown(R).includes('∅'));
  console.log('✓ audit score: self-test');
}
