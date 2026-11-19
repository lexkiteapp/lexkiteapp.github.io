// 🏆 Top-1 score: MỘT bảng 0–100 gộp từ nguồn đã có (KHÔNG quét lại) – docs/TOP1-SCORE.md.
// Nguồn: quality-sweep (qs-report/items.json + lh.json), bảng World (build() của scripts/world-scorecard.mjs: probe, content, i18n, stitch,
// mốc Duolingo), ngưỡng SSIM Stitch (scripts/test/stitch-diff.json), kết luận CI trên main (qa-bot, journey-e2e, frame-consistency, mobile-qa),
// vài test nhanh (bất biến logic, Thoát/Back, nhắc học). Chạy đêm trong quality-sweep, tuần trong world-scorecard (nâng sàn).
// Dùng: node scripts/top1/score.mjs [--qs <qs-report>] [--lh <lh.json>] [--qs-latest] [--ci] [--check] [--raise] [--write] [--issue] [--summary]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const P = (...a) => path.join(ROOT, ...a);
const J = f => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } };
const clamp = x => Math.max(0, Math.min(100, x));
const r1 = x => x == null || Number.isNaN(x) ? null : Math.round(x * 10) / 10;
const mean = a => { const v = a.filter(x => x != null); return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null; };
export const BUDGET = 'content/pipeline/top1.budget.json', OUT_MD = 'content/pipeline/TOP1.md', LABEL = 'top1-score', MARK = '<!-- top1-score -->';
const REPO = process.env.GITHUB_REPOSITORY || 'lexkiteapp/lexkiteapp.github.io', BLOB = `https://github.com/${REPO}/blob/main/`;

// ---------- trục: trọng số (tổng 100) + trục World làm mốc Duolingo ----------
export const AXES = [
  { id: 'ui', name: 'UI (một khung, bám Stitch)', weight: 15, world: ['stitch'] },
  { id: 'ux', name: 'UX flows (hành trình, Thoát/Back, số chạm)', weight: 15, world: ['firstRun', 'todayTaps'] },
  { id: 'perf', name: 'Hiệu năng (Lighthouse, Web Vitals, máy yếu)', weight: 15, world: ['perf'] },
  { id: 'a11y', name: 'Trợ năng (axe AA, vùng chạm, tương phản)', weight: 15, world: ['a11y'] },
  { id: 'latent', name: 'Lỗi tiềm ẩn & logic', weight: 15, world: [] },
  { id: 'content', name: 'Nội dung (content-qa, dễ học)', weight: 10, world: ['content', 'learn'] },
  { id: 'i18n', name: 'i18n (15 ngôn ngữ)', weight: 10, world: ['i18n'] },
  { id: 'notif', name: 'Thông báo (chuẩn notif-ux)', weight: 5, world: [] },
];
// Phát hiện của quality-sweep → trục; điểm phạt theo mức; công sức ước lượng (1 = sửa CSS/aria, 2 = logic 1 màn, 3 = xuyên suốt/hiệu năng)
export const TYPE_AXIS = { 'axe-critical': 'a11y', 'axe-serious': 'a11y', 'touch-target': 'a11y', cls: 'perf', 'layout-shift': 'perf', longtask: 'perf' };
export const SEV_P = { critical: 15, high: 6, medium: 3, low: 1 }, K = 50;
export const EFFORT = { 'axe-critical': 1, 'axe-serious': 1, 'touch-target': 1, 'text-clip': 1, overlap: 1, hscroll: 1, console: 2, http4xx: 2, http5xx: 2, reqfail: 2, rejection: 2, pageerror: 2,
  cls: 2, 'layout-shift': 2, longtask: 3, addon: 2, heavy: 3, lighthouse: 3,
  frame: 3, ssim: 5, stitch: 5, qaBot: 2, journey: 2, firstRun: 2, todayTaps: 2, tests: 2, lhPerf: 3, lcp: 3, inp: 3, cls_m: 2, tbt: 3, lhA11y: 2, invariants: 2, content: 4, learn: 4, i18n: 2, notif: 2 };
export const NOISE = { perf: 3, a11y: 2, ux: 5, ui: 2, latent: 3, total: 2 }; // trục phụ thuộc máy CI → sàn = điểm − noise (như World)
export const SSIM_GOAL = 0.85;

// ---------- hàm thuần (test: scripts/test/top1-score.mjs) ----------
/** Điểm phạt → 0..100 (giảm dần, không bao giờ kẹt 0: sửa 1 mục luôn cộng điểm). */
export const penaltyScore = p => r1(100 * Math.exp(-Math.max(0, p) / K));
/** Thang tuyến tính: ≤ good → 100, ≥ bad → 0. */
export const linScore = (v, good, bad) => v == null ? null : r1(clamp(100 * (bad - v) / (bad - good)));
export const gateScore = c => c == null ? null : c === 'success' ? 100 : 0;
export function webItems(items) {
  const out = [];
  for (const r of (items && items.web) || []) {
    const axis = TYPE_AXIS[r.type] || (/^axe-/.test(r.type) ? 'a11y' : 'latent');
    out.push({ axis, comp: axis === 'latent' ? 'runtime' : axis === 'perf' ? 'findings' : r.type === 'touch-target' ? 'touch' : 'axe', type: r.type, p: SEV_P[r.sev] ?? 1,
      title: `${r.sev} ${r.type}: \`${String(r.key).slice(0, 70)}\``, evidence: [r.link && `[ảnh](${r.link})`, `route ${(r.where || []).slice(0, 3).join(', ')} (${(r.where || []).length})`].filter(Boolean).join(' · '), effort: EFFORT[r.type] || 2 });
  }
  const byCheck = new Map();
  for (const e of (items && items.addon) || []) { const x = byCheck.get(e.check) || byCheck.set(e.check, { langs: [], detail: e.detail }).get(e.check); x.langs.push(e.lang); }
  for (const [check, x] of byCheck) out.push({ axis: 'latent', comp: 'addon', type: 'addon', p: 2 * x.langs.length, title: `add-on: ${check}`, evidence: `${x.langs.join('/')}${x.detail ? ' — ' + String(x.detail).slice(0, 90) : ''}`, effort: EFFORT.addon });
  for (const h of (items && items.heavy) || []) out.push({ axis: 'latent', comp: 'addon', type: 'heavy', p: SEV_P.high, title: `add-on ${h}`, evidence: 'dict-perf (quality-sweep ext-heavy)', effort: EFFORT.heavy });
  for (const l of (items && items.lighthouse) || []) out.push({ axis: 'perf', comp: 'findings', type: 'lighthouse', p: SEV_P.high, title: `Lighthouse ${l.page}: ${l.error || l.fails.join('; ')}`, evidence: 'quality-sweep lighthouse', effort: EFFORT.lighthouse });
  return out;
}
/** Gom thành phần → trục → tổng. comps: [{axis, id, score|null, note, effort, evidence}], items: phát hiện (thành phần phạt). */
export function compose(comps, items, worldRows = []) {
  const all = [...comps];
  const pen = {}; for (const it of items) { const k = it.axis + '/' + it.comp; (pen[k] = pen[k] || []).push(it); }
  for (const c of all) if (c.penalty) { const L = pen[c.axis + '/' + c.id] || []; c.items = L; c.score = c.available === false ? null : penaltyScore(L.reduce((s, x) => s + x.p, 0)); }
  const W = AXES.reduce((s, a) => s + a.weight, 0);
  const axes = AXES.map(a => {
    const cs = all.filter(c => c.axis === a.id), got = cs.filter(c => c.score != null);
    const wr = worldRows.filter(r => a.world.includes(r.id) && r.duo != null);
    return { ...a, comps: cs, score: r1(mean(got.map(c => c.score))), n: got.length, duo: wr.length ? r1(mean(wr.map(r => r.duo))) : null, duoNote: wr.map(r => `${r.id} ${r.duo}`).join(', ') };
  });
  const have = axes.filter(a => a.score != null), wsum = have.reduce((s, a) => s + a.weight, 0);
  const total = wsum ? r1(have.reduce((s, a) => s + a.score * a.weight, 0) / wsum) : null;
  const both = axes.filter(a => a.score != null && a.duo != null), bw = both.reduce((s, a) => s + a.weight, 0);
  const vs = bw ? { lex: r1(both.reduce((s, a) => s + a.score * a.weight, 0) / bw), duo: r1(both.reduce((s, a) => s + a.duo * a.weight, 0) / bw), n: both.length } : null;
  return { axes, total, vs, W, wsum };
}
/** Top N nâng cấp theo lợi ích (điểm tổng tăng nếu sửa) ÷ công sức. */
export function upgrades(res, n = 10) {
  const out = [];
  for (const a of res.axes) {
    if (a.score == null || !res.wsum) continue;
    const share = a.weight / res.wsum / a.n; // 1 điểm thành phần → điểm tổng
    for (const c of a.comps) {
      if (c.score == null) continue;
      if (c.penalty) {
        const P = (c.items || []).reduce((s, x) => s + x.p, 0);
        for (const it of c.items || []) { const gain = (penaltyScore(P - it.p) - penaltyScore(P)) * share; out.push({ axis: a.id, title: it.title, evidence: it.evidence, gain: r1(gain), effort: it.effort, prio: r1(gain / it.effort) }); }
      } else if (c.score < 100) { const gain = (100 - c.score) * share; out.push({ axis: a.id, title: `${c.name}: ${c.score} → 100`, evidence: c.evidence || c.note || `${c.axis}/${c.id}`, gain: r1(gain), effort: c.effort || 2, prio: r1(gain / (c.effort || 2)) }); }
    }
  }
  return out.filter(x => x.gain > 0).sort((a, b) => b.prio - a.prio || b.gain - a.gain).slice(0, n);
}
export function raiseFloors(floors, res) {
  const o = { ...floors }, up = (k, v) => { if (v != null) o[k] = Math.max(o[k] ?? 0, r1(v - (NOISE[k] || 0))); };
  for (const a of res.axes) up(a.id, a.score); up('total', res.total); return o;
}
export function checkFloors(floors, res) {
  const bad = [], cur = { total: res.total, ...Object.fromEntries(res.axes.map(a => [a.id, a.score])) };
  for (const [k, f] of Object.entries(floors || {})) { if (cur[k] === undefined) continue; if (cur[k] == null) bad.push(`${k}: mất số đo (sàn ${f})`); else if (cur[k] + 1e-9 < f) bad.push(`${k}: ${cur[k]} < sàn ${f}`); }
  return bad;
}
export function render(res, top, floors, meta = {}) {
  const f = x => x == null ? '–' : String(x);
  const L = [MARK, `## 🏆 Top-1 score: **${f(res.total)} / 100**${res.vs ? ` · trên ${res.vs.n} trục có mốc: Lexkite ${res.vs.lex} vs Duolingo ${res.vs.duo}` : ''}`, '',
    `Gộp từ nguồn đã có, không quét lại – cách đo: [docs/TOP1-SCORE.md](${BLOB}docs/TOP1-SCORE.md) · sàn chỉ tăng: \`${BUDGET}\`${meta.run ? ` · lượt: ${meta.run}` : ''}${meta.qs ? ` · quality-sweep: ${meta.qs}` : ''}`, '',
    '| Trục | Trọng số | Lexkite | Duolingo | Sàn | Thành phần |', '|---|---|---|---|---|---|'];
  for (const a of res.axes) L.push(`| ${a.name} | ${a.weight} | **${f(a.score)}** | ${f(a.duo)} | ${f(floors[a.id])} | ${a.comps.map(c => `${c.name} ${f(c.score)}`).join(' · ').replace(/\|/g, '/')} |`);
  L.push(`| **Tổng** | ${res.W} | **${f(res.total)}** | ${res.vs ? f(res.vs.duo) + ` (${res.vs.n} trục)` : '–'} | ${f(floors.total)} | trục thiếu số đo không tính (trọng số còn ${res.wsum}) |`, '');
  if (meta.bad && meta.bad.length) L.push('### ⛔ Dưới sàn', '', ...meta.bad.map(b => '- ' + b), '');
  L.push('### Top 10 nâng cấp (lợi ích ÷ công sức)', '', '| # | Trục | Việc | +điểm tổng | Công sức | Ưu tiên | Bằng chứng |', '|---|---|---|---|---|---|---|');
  top.forEach((t, i) => L.push(`| ${i + 1} | ${t.axis} | ${String(t.title).replace(/\|/g, '/')} | +${t.gain} | ${t.effort} | ${t.prio} | ${String(t.evidence || '').replace(/\|/g, '/').replace(/\n/g, ' ')} |`));
  if (!top.length) L.push('| – | | không còn khoảng cách đo được | | | | |');
  L.push('', '<details><summary>Chi tiết thành phần</summary>', '');
  for (const a of res.axes) for (const c of a.comps) L.push(`- **${a.id}/${c.name}** ${f(c.score)} – ${String(c.note || '').replace(/\n/g, ' ')}${c.evidence && c.evidence !== c.note ? ` (${c.evidence})` : ''}`);
  L.push('', '</details>', '');
  return L.join('\n');
}
export const digestLine = (res, top, url) => `• Top-1 score ${res.total ?? '–'}/100${res.vs ? ` (Duolingo ${res.vs.duo} trên ${res.vs.n} trục)` : ''} · nâng cấp #1: ${top[0] ? String(top[0].title).replace(/[`*]/g, '').slice(0, 80) + ` (+${top[0].gain})` : '–'}${url ? ' – ' + url : ''}`;

// ---------- đo (đọc nguồn đã có) ----------
function runTest(f, args = []) {
  if (!fs.existsSync(P(f))) return null;
  const r = spawnSync(process.execPath, [P(f), ...args], { cwd: ROOT, encoding: 'utf8', timeout: 180e3, maxBuffer: 32 << 20 });
  return { ok: r.status === 0, out: (r.stdout || '') + (r.stderr || '') };
}
function testsComp(axis, files, name = 'test nhanh') {
  const rs = files.map(f => [f, runTest(f)]).filter(([, r]) => r);
  const ok = rs.filter(([, r]) => r.ok).length;
  return { axis, id: 'tests', name, score: rs.length ? r1(ok / rs.length * 100) : null, effort: EFFORT.tests,
    note: rs.length ? rs.map(([f, r]) => `${r.ok ? '✓' : '✗'}${path.basename(f)}`).join(' ') : 'chưa có test', evidence: rs.filter(([, r]) => !r.ok).map(([f]) => `[${path.basename(f)}](${BLOB}${f})`).join(', ') };
}
export function measure({ items, lh, ci, world, journey }) {
  const wr = id => (world || []).find(r => r.id === id) || {}, C = [];
  const wc = (axis, id, name, effort) => { const r = wr(id); C.push({ axis, id, name, score: r.lexkite ?? null, note: r.note || 'chưa có số đo World', effort, evidence: `[WORLD.md](${BLOB}content/pipeline/WORLD.md) · ${r.note || ''}` }); };
  const run = k => ci && ci.workflows && ci.workflows[k], ev = k => run(k) ? `${run(k).conclusion} ${String(run(k).at).slice(0, 10)} https://github.com/${REPO}/actions/runs/${run(k).id}` : 'chưa có lượt trên main';
  // UI
  C.push({ axis: 'ui', id: 'frame', name: 'frame-consistency', score: gateScore(run('frame-consistency') && run('frame-consistency').conclusion), effort: EFFORT.frame, note: ev('frame-consistency'), evidence: ev('frame-consistency') });
  const sd = J(P('scripts/test/stitch-diff.json')), ss = sd ? Object.entries(sd).filter(([k, v]) => k[0] !== '_' && v && typeof v.ssim === 'number').map(([, v]) => v.ssim) : [];
  const ms = mean(ss); C.push({ axis: 'ui', id: 'ssim', name: 'SSIM vs Stitch', score: ms == null ? null : r1(clamp(ms / SSIM_GOAL * 100)), effort: EFFORT.ssim,
    note: ms == null ? 'thiếu scripts/test/stitch-diff.json' : `SSIM trung bình ${ms.toFixed(3)} trên ${ss.length} màn×chế độ (đích ${SSIM_GOAL}; ngưỡng ratchet = điểm CI − 0,01)`, evidence: `[stitch-diff.json](${BLOB}scripts/test/stitch-diff.json)` });
  wc('ui', 'stitch', 'màn đã Stitch', EFFORT.stitch);
  // UX
  const qb = run('qa-bot'); C.push({ axis: 'ux', id: 'qaBot', name: 'qa-bot (live)', score: gateScore(qb && qb.conclusion), effort: EFFORT.qaBot, note: ev('qa-bot'), evidence: ev('qa-bot') });
  const jr = journey || (run('journey-e2e') && run('journey-e2e').conclusion);
  C.push({ axis: 'ux', id: 'journey', name: 'journey-e2e', score: gateScore(jr || null), effort: EFFORT.journey, note: journey ? `quality-sweep job journey: ${journey}` : ev('journey-e2e'), evidence: journey ? 'quality-sweep › journey' : ev('journey-e2e') });
  wc('ux', 'firstRun', 'lần đầu → câu đầu', EFFORT.firstRun); wc('ux', 'todayTaps', 'chạm tới bài hôm nay', EFFORT.todayTaps);
  C.push(testsComp('ux', ['scripts/test/exit-guard.mjs', 'scripts/test/learn-flow.mjs'], 'Thoát/Back + luồng học'));
  // Hiệu năng
  const lhOk = (lh || []).filter(x => x && x.scores);
  C.push({ axis: 'perf', id: 'lhPerf', name: 'Lighthouse perf', score: lhOk.length ? r1(mean(lhOk.map(x => x.scores.performance))) : null, effort: EFFORT.lhPerf, note: lhOk.map(x => `${x.page} ${x.scores.performance}`).join(', ') || 'chưa có lh.json', evidence: 'quality-sweep › lighthouse (6 trang, điện thoại)' });
  const mq = ci && ci.mobile, mev = `mobile-qa (máy yếu, 4G chậm) ${mq ? String(mq.at).slice(0, 10) : ''} – ${ev('mobile-qa')}`;
  C.push({ axis: 'perf', id: 'lcp', name: 'LCP máy yếu', score: linScore(mq && mq.maxLcp, 2500, 6000), effort: EFFORT.lcp, note: mq ? `LCP tối đa ${mq.maxLcp} ms (tốt ≤ 2500, 0 điểm ≥ 6000)` : 'chưa có mobile-qa', evidence: mev });
  C.push({ axis: 'perf', id: 'inp', name: 'INP', score: linScore(mq && mq.maxInp, 200, 500), effort: EFFORT.inp, note: mq ? `INP tối đa ${mq.maxInp} ms (tốt ≤ 200)` : 'chưa có mobile-qa', evidence: mev });
  C.push({ axis: 'perf', id: 'cls_m', name: 'CLS', score: linScore(mq && mq.maxCls, 0.1, 0.25), effort: EFFORT.cls_m, note: mq ? `CLS tối đa ${mq.maxCls} (tốt ≤ 0,1)` : 'chưa có mobile-qa', evidence: mev });
  C.push({ axis: 'perf', id: 'tbt', name: 'TBT (tác vụ dài)', score: linScore(mq && mq.maxTbt, 200, 600), effort: EFFORT.tbt, note: mq ? `TBT tối đa ${mq.maxTbt} ms (tốt ≤ 200)` : 'chưa có mobile-qa', evidence: mev });
  const qsHas = !!(items && items.sources && items.sources.web);
  C.push({ axis: 'perf', id: 'findings', name: 'CLS/long task quét đêm', penalty: true, available: qsHas, effort: 2, note: 'quality-sweep: cls, layout-shift, longtask, ngân sách Lighthouse' });
  // a11y
  C.push({ axis: 'a11y', id: 'lhA11y', name: 'Lighthouse a11y', score: lhOk.length ? r1(mean(lhOk.map(x => x.scores.accessibility))) : null, effort: EFFORT.lhA11y, note: lhOk.map(x => `${x.page} ${x.scores.accessibility}`).join(', ') || 'chưa có lh.json', evidence: 'quality-sweep › lighthouse' });
  C.push({ axis: 'a11y', id: 'axe', name: 'axe AA (mọi route × vi/en/ar × sáng/tối)', penalty: true, available: qsHas, note: 'quality-sweep: axe serious/critical (gồm tương phản)' });
  C.push({ axis: 'a11y', id: 'touch', name: 'vùng chạm ≥ 44 px', penalty: true, available: qsHas, note: 'quality-sweep: touch-target (điện thoại)' });
  // Lỗi tiềm ẩn & logic
  C.push({ axis: 'latent', id: 'runtime', name: 'console/promise/4xx/tràn chữ', penalty: true, available: qsHas, note: 'quality-sweep: pageerror, rejection, console, http4xx/5xx, hscroll, text-clip, overlap' });
  C.push({ axis: 'latent', id: 'addon', name: 'add-on E2E', penalty: true, available: !!(items && items.sources && items.sources.addon), note: 'quality-sweep: ext-e2e vi/en/ar + trang nặng' });
  const li = runTest('scripts/test/logic-invariants.mjs', ['--json']); let lo = null; try { lo = li && JSON.parse(li.out.trim().split('\n').pop()); } catch {}
  C.push({ axis: 'latent', id: 'invariants', name: 'bất biến FSRS/chuỗi ngày', score: lo ? r1(lo.pass / Math.max(1, lo.checks) * 100) : null, effort: EFFORT.invariants,
    note: lo ? `${lo.pass}/${lo.checks} bất biến đạt ở 4 múi giờ${lo.fails.length ? ' – ' + lo.fails[0] : ''}` : 'logic-invariants không chạy được', evidence: `[logic-invariants.mjs](${BLOB}scripts/test/logic-invariants.mjs)` });
  C.push(testsComp('latent', ['scripts/test/sync-pack.mjs', 'scripts/test/sync-ctx.mjs', 'scripts/test/streak-ui.mjs'], 'đồng bộ + chuỗi'));
  // Nội dung, i18n
  wc('content', 'content', 'content-qa', EFFORT.content); wc('content', 'learn', 'learnability', EFFORT.learn); wc('i18n', 'i18n', 'i18n-qa --strict', EFFORT.i18n);
  // Thông báo (chuẩn phiên notif-ux: docs/specs/notifications.md + scripts/test/notify-ux.mjs khi đã gộp)
  C.push(testsComp('notif', ['scripts/test/reminders.mjs', 'scripts/test/notify-ux.mjs'], 'nhắc học + notify-ux'));
  const rm = (() => { try { return fs.readFileSync(P('web/js/remind.js'), 'utf8'); } catch { return ''; } })();
  const N = [['giờ yên lặng', /inQuiet|quietStart/.test(rm)], ['nhắc thông minh theo giờ học', /smartTime|hb >= 0/.test(rm)], ['spec thông báo', fs.existsSync(P('docs/specs/notifications.md'))]];
  C.push({ axis: 'notif', id: 'notif', name: 'chuẩn thông báo (tĩnh)', score: r1(N.filter(x => x[1]).length / N.length * 100), effort: EFFORT.notif, note: N.map(([n, ok]) => (ok ? '✓' : '✗') + n).join(' '), evidence: `[REMINDERS.md](${BLOB}docs/REMINDERS.md)` });
  return C;
}

// ---------- GitHub (CI) ----------
const T = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
const api = (p, o = {}) => fetch(p.startsWith('http') ? p : `https://api.github.com/repos/${REPO}/${p}`, { ...o, headers: { Authorization: `Bearer ${T}`, Accept: 'application/vnd.github+json', 'User-Agent': 'lexkite-top1', ...(o.body ? { 'Content-Type': 'application/json' } : {}) } });
const apiJ = async (p, o) => { const r = await api(p, o).catch(() => null); return r && r.ok ? r.json() : null; };
async function ciStatus() { // lượt gần nhất trên main không phải PR, bỏ huỷ/bỏ qua
  const out = { workflows: {}, mobile: (J(P('reports/world/ci.json')) || {}).mobile || null };
  for (const w of ['qa-bot', 'journey-e2e', 'frame-consistency', 'mobile-qa']) {
    const j = await apiJ(`actions/workflows/${w}.yml/runs?branch=main&status=completed&per_page=15`);
    const r = j && (j.workflow_runs || []).find(x => x.event !== 'pull_request' && !['cancelled', 'skipped'].includes(x.conclusion));
    out.workflows[w] = r ? { conclusion: r.conclusion, at: r.updated_at, id: r.id } : null;
  }
  return out;
}
async function latestQs(dir) { // artifact qs-report của lượt quality-sweep mới nhất trên main (dùng ở world-scorecard hằng tuần)
  const j = await apiJ('actions/workflows/quality-sweep.yml/runs?branch=main&status=completed&per_page=10');
  for (const r of (j && j.workflow_runs) || []) {
    const a = ((await apiJ(`actions/runs/${r.id}/artifacts`)) || {}).artifacts || [], art = a.find(x => x.name === 'qs-report' && !x.expired);
    if (!art) continue;
    const z = await api(art.archive_download_url, { redirect: 'follow' }); if (!z.ok) continue;
    fs.mkdirSync(dir, { recursive: true }); const zf = path.join(dir, 'a.zip'); fs.writeFileSync(zf, Buffer.from(await z.arrayBuffer()));
    execFileSync('unzip', ['-o', '-q', zf, '-d', dir]); return r.html_url;
  }
  return '';
}
async function upsertIssue(title, body) {
  const iss = (await apiJ(`issues?state=open&labels=${LABEL}&per_page=10`)) || [], cur = iss.find(i => !i.pull_request && (i.body || '').includes(MARK));
  if (!(await apiJ(`labels/${LABEL}`))) await api('labels', { method: 'POST', body: JSON.stringify({ name: LABEL, color: '0e8a16', description: 'Bảng Top-1 score (scripts/top1/score.mjs) – cập nhật tại chỗ' }) }).catch(() => {});
  const r = cur ? await apiJ(`issues/${cur.number}`, { method: 'PATCH', body: JSON.stringify({ title, body }) }) : await apiJ('issues', { method: 'POST', body: JSON.stringify({ title, body, labels: [LABEL] }) });
  return r ? r.html_url : '';
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const argv = process.argv.slice(2), has = k => argv.includes(k), val = k => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : null; };
  let qsDir = val('--qs'), lhFile = val('--lh'), qsUrl = process.env.QS_RUN_URL || '';
  if (has('--qs-latest') && T) { const d = fs.mkdtempSync(path.join(os.tmpdir(), 'top1-qs-')); qsUrl = await latestQs(d); if (qsUrl) { qsDir = d; lhFile = lhFile || path.join(d, 'lh.json'); } }
  const items = qsDir ? J(path.join(qsDir, 'items.json')) : null, lh = (lhFile && J(lhFile)) || (qsDir && J(path.join(qsDir, 'lh.json'))) || [];
  const ci = has('--ci') && T ? await ciStatus() : { workflows: {}, mobile: (J(P('reports/world/ci.json')) || {}).mobile || null };
  const { build } = await import('../world-scorecard.mjs'), world = build().rows;
  const comps = measure({ items, lh, ci, world, journey: process.env.JOURNEY_RESULT || '' });
  const res = compose(comps, webItems(items), world), top = upgrades(res);
  const B = J(P(BUDGET)) || { floors: {} };
  if (has('--raise')) { B.floors = raiseFloors(B.floors || {}, res); fs.writeFileSync(P(BUDGET), JSON.stringify(B, null, 1) + '\n'); }
  const bad = checkFloors(B.floors || {}, res), runUrl = process.env.GITHUB_RUN_ID ? `https://github.com/${REPO}/actions/runs/${process.env.GITHUB_RUN_ID}` : '';
  const md = render(res, top, B.floors || {}, { run: runUrl, qs: qsUrl, bad });
  fs.mkdirSync(P('reports/top1'), { recursive: true });
  fs.writeFileSync(P('reports/top1/score.json'), JSON.stringify({ at: new Date().toISOString(), total: res.total, vs: res.vs, axes: Object.fromEntries(res.axes.map(a => [a.id, a.score])), top, bad }, null, 1) + '\n');
  if (has('--write')) fs.writeFileSync(P(OUT_MD), `# Top-1 score (tự sinh – \`node scripts/top1/score.mjs --write\`, đừng sửa tay)\n\n${md}`);
  if (has('--summary') && process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md + '\n');
  let url = '';
  if (has('--issue') && T) url = await upsertIssue(`Top-1 score: ${res.total ?? '–'}/100`, md.slice(0, 60000));
  fs.writeFileSync(P('reports/top1/digest.txt'), digestLine(res, top, url) + '\n');
  console.log(digestLine(res, top, url));
  for (const a of res.axes) console.log(`${a.id.padEnd(8)} ${String(a.score ?? '–').padStart(5)} (${a.n}/${a.comps.length} thành phần)${a.duo != null ? ` · Duolingo ${a.duo}` : ''}`);
  top.slice(0, 3).forEach((t, i) => console.log(`#${i + 1} [${t.axis}] ${t.title} +${t.gain} / công ${t.effort}`));
  if (has('--check')) { if (bad.length) { console.error('✗ top1-score: dưới sàn\n  ' + bad.join('\n  ')); process.exit(1); } console.log('✓ top1-score: tổng và mọi trục ≥ sàn'); }
}
