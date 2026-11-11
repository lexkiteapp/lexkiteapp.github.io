#!/usr/bin/env node
// Bảng điểm chất lượng nội dung (docs/CONTENT-WORLD-PLAN.md §3.5, P0.7): 8 mảng × 0–100 + tổng, từ ĐỘ PHỦ × TỈ LỆ QUA CỔNG.
// Số liệu dùng lại cổng có sẵn: lkf-check (khung Can-do, P0-C), grammar-map-check (kho điểm ngữ pháp, P0-D), content-check (--json → reports/content-stats.json + lỗi theo mảng), build-lexicon (kho từ một nguồn + mở rộng, loadAllPlus),
// content/lexicon/img.json (ảnh theo nghĩa), i18n-qa (lỗi bản dịch 15 ngôn ngữ). 0 token, chỉ đọc repo.
// Chuẩn đích (CHUAN) cố định theo "ông lớn" ở §2 của kế hoạch – KHÔNG hạ; khác targets.json (chỉ tiêu lô, được nâng dần).
// Ngưỡng sàn: content/pipeline/score.budget.json (như scripts/test/visual-qa.budget.json) – điểm < sàn → exit 1; sàn chỉ được tăng.
// Dùng: node scripts/content-score.mjs              → ghi content/pipeline/SCORE.md + reports/content-score.json, kiểm sàn
//       node scripts/content-score.mjs --bump       → nâng sàn lên điểm hiện tại (không bao giờ hạ)
//       node scripts/content-score.mjs --base <ref> → thêm: sàn trong file không được thấp hơn sàn ở <ref> (CI so với main)
import fs from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { loadContent } from './lib/content-load.mjs';
import { loadAllPlus, key } from './lexicon/lib.mjs';

const ARG = process.argv.slice(2), BUDGET = 'content/pipeline/score.budget.json', OUT = 'content/pipeline/SCORE.md';
const rd = p => fs.readFileSync(p, 'utf8'), ex = p => fs.existsSync(p);
const pct = (a, b) => (b > 0 ? Math.min(1, a / b) : 0), r1 = x => Math.round(x * 10) / 10;
const fails = [];

// ---------- Cổng 1: content-check (đếm + lỗi theo mảng) ----------
const cc = spawnSync('node', ['scripts/test/content-check.mjs', '--json', '--all'], { encoding: 'utf8' });
const S = JSON.parse(rd('reports/content-stats.json'));
const errLines = (cc.stdout || '').split('\n').filter(l => l.startsWith('✗ ') && !l.startsWith('✗ content:')).map(l => l.slice(2));
const areaOf = w => /^nạp:/.test(w) ? 'all' : /^vocab /.test(w) ? 'vocab' : /^grammar /.test(w) ? 'grammar'
  : /^(speak-sample|speak|model|ideas|gt-letter|reading) /.test(w) ? 'skills' : 'exam';
const ERR = { all: 0, vocab: 0, grammar: 0, skills: 0, exam: 0 };
for (const l of errLines) ERR[areaOf(l)]++;
const sum = o => Object.entries(o || {}).filter(([k]) => k !== '—').reduce((a, [, v]) => a + (+v || 0), 0);
const n = k => sum(S[k]);
const C = loadContent();
const T = JSON.parse(rd('content/pipeline/targets.json'));
const countRe = (files, re) => files.filter(ex).reduce((a, f) => a + (rd(f).match(re) || []).length, 0);
const ls = (d, re) => (ex(d) ? fs.readdirSync(d).filter(f => re.test(f)) : []);

// ---------- Cổng 2: build-lexicon (kho từ một nguồn phải nhất quán) ----------
const lex = spawnSync('node', ['scripts/build-lexicon.mjs'], { encoding: 'utf8' });
const lexOk = lex.status === 0;
const rows = new Map(); for (const e of await loadAllPlus()) { const k = key(e.row); if (!rows.has(k)) rows.set(k, e.row); }
const R = [...rows.values()], NV = R.length, has = i => R.filter(r => String(r[i] || '').trim()).length / (NV || 1);
const img = JSON.parse(rd('content/lexicon/img.json')).items || {};
const imgN = [...rows.keys()].filter(k => img[k]).length;
const lvN = l => R.filter(r => r[8] === l).length;

// ---------- Cổng 4: lkf-check (khung Can-do + gắn lo, P0-C) ----------
const lkfRun = spawnSync('node', ['scripts/content-qa/lkf-check.mjs'], { encoding: 'utf8' });
const LK = ex('reports/lkf-coverage.json') ? JSON.parse(rd('reports/lkf-coverage.json')) : { objectives: 0, cellsOk: 0, objectivesUsed: 0, total: { tagged: 0, items: 0 }, errors: 1 };

// ---------- Cổng 5: grammar-map-check (kho điểm ngữ pháp ↔ 77 bài + hàng chờ, P0-D) ----------
const giRun = spawnSync('node', ['scripts/content-qa/grammar-map-check.mjs'], { encoding: 'utf8' });
const GI = ex('reports/grammar-inventory.json') ? JSON.parse(rd('reports/grammar-inventory.json')) : { points: 0, taught: 0, errors: 1 };

// ---------- Cổng 6: learnability (sư phạm "dễ học – dễ nhớ", P0-H, docs/specs/learnability.md) → content/pipeline/LEARN.md ----------
const lnRun = spawnSync('node', ['scripts/content-qa/learnability.mjs'], { encoding: 'utf8' });
const LN = ex('reports/learnability.json') ? JSON.parse(rd('reports/learnability.json')) : { areas: {} };

// ---------- Cổng 3: i18n-qa (15 ngôn ngữ) ----------
const qa = spawnSync('node', ['scripts/i18n-qa.mjs'], { encoding: 'utf8' }).stdout || '';
const qaRows = [...qa.matchAll(/^[✓✗] ([\w-]+): thiếu (\d+) · sai biến\/thẻ (\d+) · lẫn tiếng Việt (\d+) · dịch sai đã biết (\d+) · mất tiếng Anh mẫu (\d+) · nhãn ngắn chưa dịch tay (\d+)/gm)]
  .map(m => ({ l: m[1], hard: +m[2] + +m[3] + +m[4] + +m[5] + +m[6], short: +m[7] }));
const LANGS = rd('scripts/i18n-langs.txt').split('\n').map(x => x.trim()).filter(x => x && !x.startsWith('#'));
const enDict = (() => { const g = {}; new Function('self', rd('web/js/i18n/en.js'))(g); return g.I18N_DICT.en; })();
const lazy = ((rd('scripts/build-i18n.sh').match(/^LAZY="([^"]*)"/m) || [])[1] || '').split(/\s+/).filter(Boolean);
let NK = Object.keys(enDict).length; for (const gname of lazy) { const g = {}; new Function('self', rd(`web/js/i18n/en/${gname}.js`))(g); NK += Object.keys(g.I18N_DICT.en).length; }
const packs = ls('web/packs', /^[a-z]{2}\.json$/).map(f => { try { const j = JSON.parse(rd('web/packs/' + f)); return Object.keys(j.words || j.m || j).length; } catch { return 0; } });
const native = ex('content/i18n-native-score.json') ? JSON.parse(rd('content/i18n-native-score.json')) : null;
const nativeAvg = native ? +(native.avg ?? native.mean ?? 0) : 0;

// ---------- Thành phần: [tên, có, chuẩn, trọng số, future?] – future = chưa làm (được phép 0, chưa có nguồn) ----------
const grammar = C.GRAMMAR || [], gLv = l => grammar.filter(g => g.level === l).length;
const readLv = l => +(S['Bài đọc ngắn']?.[l] || 0);
const roleplay = (() => { const w = { self: {} }; w.window = w.self; for (const f of ls('web/js/roleplay', /^data-.*\.js$/)) { try { new Function('self', 'window', rd('web/js/roleplay/' + f))(w.self, w.self); } catch {} } return (w.self.ROLEPLAY || []).length; })();
// Thành phần đếm tuyệt đối so với chuẩn cố định → thêm nội dung không bao giờ làm tụt điểm; chỉ xoá/lỗi/thiếu trường bắt buộc mới tụt.
const VSTD = 20000; // kho đích 20k từ#loại (docs/CONTENT-WORLD-PLAN.md §2)
// Chuẩn đề thi "đủ format + nhiều đề hoàn chỉnh" (≈ 20 đề IELTS, 10 TOEIC/TOEFL) – cố định, độc lập với targets.json
const EXAM_STD = { 'IELTS Listening': 800, 'IELTS Reading AC': 800, 'IELTS Reading GT': 400, 'IELTS Writing Task 2': 200, 'IELTS Writing Task 1 Academic': 80,
  'TOEIC Listening': 1000, 'TOEIC Reading': 1000, 'TOEIC Speaking & Writing': 190, 'TOEFL Reading': 500, 'TOEFL Listening': 400, 'TOEFL Writing': 200, 'TOEFL Speaking': 300 };
const AREAS = {
  vocab: { name: 'Kho từ', err: ERR.vocab, items: n('Từ vựng (mục)'), gate: lexOk, parts: [
    ['từ#loại duy nhất', NV, VSTD, 25], ['IPA·nghĩa·định nghĩa·ví dụ·CEFR', (has(1) + has(3) + has(4) + has(5) + has(8)) / 5 * NV, NV, 20],
    ['collocation', has(6) * NV, VSTD, 12], ['đồng nghĩa', has(7) * NV, VSTD, 8], ['IPA Mỹ', has(10) * NV, VSTD, 5],
    ['ảnh theo nghĩa', imgN, VSTD, 15], ['C2', lvN('C2'), 1000, 10], ['A1', lvN('A1'), 1000, 5]] },
  grammar: { name: 'Ngữ pháp', err: ERR.grammar + GI.errors, items: grammar.length, gate: giRun.status === 0, parts: [
    ...[['A1', 15], ['A2', 15], ['B1', 30], ['B2', 27], ['C1', 15], ['C2', 10]].map(([l, t]) => [`bài ${l}`, gLv(l), t, 8, l === 'C2']), // A1 có bài từ 2026-11 (web/js/grammar/starter.js) → về 0 là nguồn hỏng
    ['trắc nghiệm', n('Ngữ pháp – trắc nghiệm'), 3000, 20], ['tự luận', n('Ngữ pháp – tự luận'), 3000, 20],
    // chuẩn ~300 điểm A1–C2; "đã có bài đúng cấp" chỉ tăng khi viết bài mới cho điểm trong hàng chờ (targets.json "Ngữ pháp – bài <cấp>")
    ['kho điểm ngữ pháp', GI.points, 300, 12], ['điểm đã có bài đúng cấp', GI.taught, 300, 12]] },
  comm: { name: 'Giao tiếp', err: 0, parts: [
    ['cuộc gọi Ama/Carlos', countRe(ls('web/js/call', /^calls.*\.js$/).map(f => 'web/js/call/' + f), /^\s*id: '/gm), 60, 20],
    ['roleplay', roleplay, 60, 20], ['tình huống Play & Speak', ls('content/situations', /\.json$/).length, 40, 20],
    ['mục gold (giải thích cách dùng)', (rd('web/cpack/lesson/gold.js').match(/":\[\{"why"/g) || []).length, 1000, 20],
    ['sổ mẫu câu theo chức năng', ex('content/framework/functions.json') ? (JSON.parse(rd('content/framework/functions.json')).functions || []).length : 0, 100, 20, 1]] },
  skills: { name: '4 kỹ năng', err: ERR.skills, parts: [
    ['Nghe: bộ bài', (C.LISTENING || []).length, 80, 15], ['Đọc: bài', (C.READINGS || []).length + n('Bài đọc ngắn'), 600, 15],
    ...['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map(l => [`Đọc ngắn ${l}`, readLv(l), 80, 3, l === 'A1' || l === 'C2']),
    ['Nói: chủ đề', (C.SPEAK_MORE || []).length, 60, 10], ['Nói: câu trả lời mẫu', Object.keys(C.SPEAK_SAMPLES || {}).length, 600, 10],
    ['Viết: bài mẫu', (C.MODELS || []).length + (C.WRITE_MORE || []).length + (C.TASK1_MORE || []).length + (C.GT_LETTERS || []).length, 400, 18],
    ['trung gian (mediation)', ls('content/mediation', /\.json$/).length, 30, 14, 1]] },
  exam: { name: 'Đề thi', err: ERR.exam, parts: [
    ...Object.entries(EXAM_STD).map(([k, t]) => [k, S[k] ? n(k) : +T[k]?.have || 0, t, 5]), // loại chưa đếm trong content-check: số đếm tay ở targets.json (như content-queue)
    ...['a2', 'b1', 'b2', 'c1', 'c2'].map(l => [`Cambridge ${l.toUpperCase()}`, (C.CAMBRIDGE || []).filter(x => x.level === l && x.id === `${l}-t${x.n}`).length, 6, 8, 1])] }, // Cambridge: đề nạp được qua content-load (không đếm file rác); exam-format-check chặn đề lệch spec
  // Chuẩn: ~600 mục tiêu (6 kỹ năng × 6 cấp × ≥ 15), mọi nội dung có lo; "mục tiêu có nội dung" đo khoảng trống thật (vd trung gian, A1, C2) – chỉ tăng khi thêm bài
  lkf: { name: 'Khung Can-do', err: LK.errors, items: LK.total.items, gate: lkfRun.status === 0, parts: [
    ['mục tiêu LKF tự soạn', LK.objectives, 600, 25], ['ô kỹ năng × cấp đủ ≥ 15', LK.cellsOk, 36, 15],
    ['nội dung có lo hợp lệ', LK.total.tagged, LK.total.items || 1, 35], ['mục tiêu đã có nội dung luyện', LK.objectivesUsed, 600, 25]] },
  // Điểm sư phạm trung bình từng mảng bài (12 tiêu chí a…l, chuẩn 100 = mọi bài đạt mọi tiêu chí áp dụng được)
  learn: { name: 'Dễ học – dễ nhớ', err: 0, gate: lnRun.status === 0, parts: Object.entries({ grammar: 'Ngữ pháp', path: 'Bài lộ trình', vocab: 'Bộ từ', skills: 'Kỹ năng' })
    .map(([k, nm]) => [nm, LN.areas[k]?.score || 0, 100, 25]) },
  i18n: { name: 'i18n', err: 0, parts: [
    ['ngôn ngữ đạt i18n-qa', qaRows.reduce((a, q) => a + (1 - Math.min(1, q.hard / NK)), 0), LANGS.length, 45],
    ['nhãn ngắn dịch tay', qaRows.reduce((a, q) => a + (1 - Math.min(1, q.short / NK)), 0), LANGS.length, 10],
    ['gói nghĩa từ theo ngôn ngữ', packs.reduce((a, k) => a + Math.min(1, k / VSTD), 0), LANGS.length, 20],
    ['điểm bản xứ (native-score/5)', nativeAvg, 5, 25, 1]] },
};

// ---------- Tính điểm ----------
const out = {};
for (const [id, A] of Object.entries(AREAS)) {
  const W = A.parts.reduce((a, p) => a + p[3], 0), cov = A.parts.reduce((a, p) => a + pct(p[1], p[2]) * p[3], 0) / W;
  const items = A.items || A.parts.reduce((a, p) => a + (p[2] > 1 ? p[1] : 0), 0);
  const pass = ERR.all ? 0 : A.gate === false ? 0 : 1 - Math.min(1, A.err / Math.max(1, items));
  out[id] = { name: A.name, score: r1(cov * pass * 100), coverage: r1(cov * 100), pass: r1(pass * 100), errors: A.err, parts: A.parts.map(p => ({ k: p[0], have: r1(p[1]), std: p[2], w: p[3], future: !!p[4] })) };
  for (const p of A.parts) if (!p[4] && !(p[1] > 0)) fails.push(`${A.name}: "${p[0]}" đếm được 0 (nguồn hỏng hoặc bị xoá)`);
}
const total = r1(Object.values(out).reduce((a, x) => a + x.score, 0) / Object.keys(out).length);

// ---------- Sàn (chỉ tăng) ----------
const budget = ex(BUDGET) ? JSON.parse(rd(BUDGET)) : {};
const cur = { ...Object.fromEntries(Object.entries(out).map(([k, v]) => [k, v.score])), total };
for (const [k, v] of Object.entries(cur)) if (typeof budget[k] === 'number' && v < budget[k]) fails.push(`${out[k]?.name || 'Tổng'}: ${v} < sàn ${budget[k]} (điểm giảm)`);
const bi = ARG.indexOf('--base');
if (bi >= 0) {
  let base = null; try { base = JSON.parse(execFileSync('git', ['show', `${ARG[bi + 1]}:${BUDGET}`], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })); } catch {}
  if (base) for (const [k, v] of Object.entries(base)) if (typeof v === 'number' && !(budget[k] >= v)) fails.push(`sàn "${k}" bị hạ ${v} → ${budget[k]} (sàn chỉ được tăng)`);
}
if (ARG.includes('--bump')) {
  const nb = { _note: budget._note, ...Object.fromEntries(Object.keys(cur).map(k => [k, Math.max(budget[k] || 0, cur[k])])) };
  fs.writeFileSync(BUDGET, JSON.stringify(nb, null, 1) + '\n');
}

// ---------- Báo cáo ----------
const md = ['# Bảng điểm nội dung (tự sinh – `npm run content:score`, đừng sửa tay)', '',
  'Cách tính, chuẩn đích, sàn: `scripts/content-score.mjs` · `content/pipeline/score.budget.json` · kế hoạch `docs/CONTENT-WORLD-PLAN.md` §3.5. Điểm = độ phủ so với chuẩn × tỉ lệ qua cổng.', '',
  `**Tổng: ${total} / 100**`, '', '| Mảng | Điểm | Sàn | Độ phủ | Qua cổng | Lỗi |', '|---|---|---|---|---|---|',
  ...Object.entries(out).map(([k, v]) => `| ${v.name} | **${v.score}** | ${budget[k] ?? '–'} | ${v.coverage}% | ${v.pass}% | ${v.errors} |`), '',
  ...Object.values(out).flatMap(v => [`## ${v.name}`, '', '| Thành phần | Có / chuẩn | % | Trọng số |', '|---|---|---|---|',
    ...v.parts.map(p => `| ${p.k}${p.future ? ' (chưa làm)' : ''} | ${p.have} / ${p.std} | ${Math.round(pct(p.have, p.std) * 100)}% | ${p.w} |`), ''])].join('\n');
fs.mkdirSync('reports', { recursive: true });
fs.writeFileSync(OUT, md);
fs.writeFileSync('reports/content-score.json', JSON.stringify({ total, areas: out, fails }, null, 1) + '\n');
console.log(Object.values(out).map(v => `${v.name} ${v.score}`).join(' · ') + ` · Tổng ${total}`);
if (fails.length) { fails.forEach(f => console.log('✗', f)); process.exit(1); }
console.log('✓ content-score: không mảng nào giảm, không nguồn nào = 0');
