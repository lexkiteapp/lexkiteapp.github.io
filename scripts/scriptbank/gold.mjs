// Bộ VÀNG (chủ 22/10): 1.500–2.000 kịch bản viết tay (Claude), phủ đều 8 nhóm loại bài × chủ đề × CEFR 40/40/20, điểm học chỉ từ lexicon /
// Cách dùng từ / ngữ pháp, không trùng. Dùng làm kho chính + mẫu few-shot cho Gemini sau này. docs/VIDEO-SCALE-PLAN.md §16.
//   node scripts/scriptbank/gold.mjs plan            → content/video/scripts/gold/plan.json (kế hoạch phủ, thứ tự xen kẽ)
//   node scripts/scriptbank/gold.mjs next 50         → in gọn 50 điểm chưa viết (để soạn lô kế)
//   node scripts/scriptbank/gold.mjs build [--md N]  → gold/src/*.jsonl (bản gọn) → đủ lược đồ + lời thoại → QC → bank/gNNNN.jsonl, gold/review.jsonl,
//                                                     summary, out/script-bank/*.md (bản đọc + bảng phủ)
// Bản gọn mỗi dòng: { p, h, w, r, y, a, e:[2], m, q:[câu, [phương án], đáp án, giải thích], s, t, l, syl?, st? }
import fs from 'fs';
import { DIR, plan, h8, CAT, diffOf, qc, qcViral, hookOf, expandLines, Dedupe, readBank, readJsonl, summary, SHARD, TOPICS } from './lib.mjs';
import { loadAll, key as lexKey } from '../lexicon/lib.mjs';

const G = DIR + '/gold', OUT = new URL('../../out/script-bank/', import.meta.url).pathname;
const CATS = ['stop-saying', 'x-vs-y', 'situational', 'misunderstanding', 'pronunciation', 'collocation', 'grammar', 'idiom-phrasal'];
const SET_TOPIC = [[/travel|hosp/, 'travel'], [/office|toeic|work|biz|mkt|log|law|bsl|economy/, 'work'], [/ielts|toefl|education|edu|awl|nawl|task|linking|opinion|describe|language|c2/, 'exam'],
  [/tech|it$|eng|science|space/, 'tech'], [/health|med|sport/, 'health'], [/food/, 'food'], [/consumer/, 'shopping'], [/money/, 'money'], [/housing|architecture|urban/, 'home'],
  [/society|culture|media|crime|government|idioms|phrasal/, 'social'], [/./, 'daily']];
const topicOfSets = sets => { for (const [re, t] of SET_TOPIC) { const s = sets.find(x => re.test(x)); if (s) return t; } return 'daily'; };

function makePlan(total = 2000) {
  const sets = new Map(); for (const e of loadAll()) { const k = lexKey(e.row); (sets.get(k) || sets.set(k, []).get(k)).push(e.set); }
  const pts = plan().filter(p => p.src !== 'situation' && CAT[p.type] && CATS.includes(CAT[p.type]));
  const TOP = ['daily', 'travel', 'work', 'exam', 'tech', 'health', 'food', 'shopping', 'social', 'money', 'home', 'study'];
  for (const p of pts) { const k = p.pid.replace(/^[a-z]:/, '').replace(/:[^:#]*$/, m => (p.pid.startsWith('x:') ? '' : m)); const s = sets.get(k) || sets.get(p.pid.slice(2)); p.cat = CAT[p.type]; p.topic = s ? topicOfSets(s) : TOP[parseInt(h8(p.pid), 16) % TOP.length]; }
  const per = Math.round(total / CATS.length), out = [];
  for (const c of CATS) {
    const pool = pts.filter(p => p.cat === c), want = { easy: Math.round(per * 0.4), medium: Math.round(per * 0.4), hard: per - 2 * Math.round(per * 0.4) }, got = [];
    // stop-saying: mọi lỗi hay gặp (nguồn chuẩn nhất) trước
    for (const d of ['easy', 'medium', 'hard']) {
      const byT = {}; for (const p of pool.filter(x => x.diff === d).sort((a, b) => (a.src === 'usage' ? 0 : 1) - (b.src === 'usage' ? 0 : 1) || (h8(a.pid) < h8(b.pid) ? -1 : 1))) (byT[p.topic] || (byT[p.topic] = [])).push(p);
      const ts = Object.keys(byT); let n = 0, moved = true;
      while (n < want[d] && moved) { moved = false; for (const t of ts) { if (n >= want[d]) break; const x = byT[t].shift(); if (x) { got.push(x); n++; moved = true; } } }
      want._short = (want._short || 0) + (want[d] - n);
    }
    if (want._short) { const have = new Set(got.map(p => p.pid)); got.push(...pool.filter(p => !have.has(p.pid)).slice(0, want._short)); }
    const D = { easy: got.filter(p => p.diff === 'easy'), medium: got.filter(p => p.diff === 'medium'), hard: got.filter(p => p.diff === 'hard') }, mix = [];
    for (let i = 0; mix.length < got.length; i++) for (const d of ['easy', 'medium', 'easy', 'medium', 'hard']) { const x = D[d].shift(); if (x) mix.push(x); } // 40/40/20 trong mọi đoạn
    out.push(mix);
  }
  // xen kẽ nhóm → mỗi lô 50 đều loại bài
  const seq = []; for (let i = 0; out.some(g => g[i]); i++) for (const g of out) if (g[i]) seq.push(g[i]);
  return seq.map((p, i) => ({ n: i + 1, pid: p.pid, cat: p.cat, type: p.type, cefr: p.cefr, diff: p.diff, topic: p.topic, point: p.point, facts: p.facts }));
}
const brief = p => { const F = p.facts || {};
  if (p.src === 'usage' || /^u:/.test(p.pid)) return F.mistake ? `MIS "${F.mistake}" → "${F.correct}" (${F.rule || ''})` : `${p.point} | ${(F.items || []).map(i => i.form + '=' + i.meaning).join('; ')} | ${(F.notes || [])[0] || ''}`;
  if (/^g:/.test(p.pid)) return `${F.lesson}: ${F.q} → ${F.answer} (x ${F.wrong_options.join(', ')})`;
  return `${F.word} (${F.pos}) ${F.def}${F.other ? ' | vs ' + F.other + ': ' + F.other_entry : ''}${F.collocations ? ' | col ' + F.collocations.join(', ') : ''}${F.ipa_us ? ' | ' + F.ipa_us + ' syl ' + F.syl + ' stress ' + F.stress : ''}`; };

function srcRecords() { if (!fs.existsSync(G + '/src')) return []; return fs.readdirSync(G + '/src').filter(f => /\.jsonl$/.test(f)).sort().flatMap(f => readJsonl(G + '/src/' + f)); }

function build(mdN = 100) {
  const P = JSON.parse(fs.readFileSync(G + '/plan.json', 'utf8')), byPid = new Map(P.map(p => [p.pid, p])), full = new Map(plan().map(p => [p.pid, p]));
  const ok = [], bad = [], dd = new Dedupe(), seen = new Set(); let prevHook = null;
  for (const g of srcRecords()) {
    if (g.skip) { bad.push({ pid: g.p, reasons: ['skip:' + g.skip] }); seen.add(g.p); continue; }
    const p = byPid.get(g.p) || full.get(g.p); if (!p) { bad.push({ pid: g.p, reasons: ['unknown-pid'] }); continue; }
    if (seen.has(g.p)) { bad.push({ pid: g.p, reasons: ['dup:pid'] }); continue; } seen.add(g.p);
    const s = { id: 'sb_' + h8(p.pid), pid: p.pid, src: 'gold', type: p.type, cat: CAT[p.type], cefr: g.l || p.cefr, diff: diffOf(g.l || p.cefr), topic: g.t || p.topic, hook_type: (hookOf(g.h) || {}).id || '', point: p.point,
      hook: g.h, wrong: g.w, right: g.r, why: g.y, aha: g.a, ex: g.e, memory: g.m, quiz: g.q ? { q: g.q[0], options: g.q[1], answer: g.q[2], explain: g.q[3] } : null, save: g.s,
      ...(p.type === 'pronunciation' ? { syl: g.syl, stress: g.st } : {}), gen: { model: 'claude-gold', at: new Date().toISOString().slice(0, 10) } };
    if (s.quiz && Array.isArray(s.quiz.options)) { const n = s.quiz.options.length, r = parseInt(h8('q' + p.pid), 16) % n, a = s.quiz.options[+s.quiz.answer]; // xáo vị trí đáp án (tránh luôn là A)
      s.quiz.options = [...s.quiz.options.slice(r), ...s.quiz.options.slice(0, r)]; s.quiz.answer = s.quiz.options.indexOf(a); }
    s.lines = expandLines(s);
    const ph = prevHook; prevHook = s.hook_type;
    const q = qc({ ...p, src: p.src || (/^u:/.test(p.pid) ? 'usage' : /^g:/.test(p.pid) ? 'grammar' : 'lexicon') }, s), v = qcViral(s, ph);
    s.words = s.lines.reduce((a, l) => a + (l.say.match(/[A-Za-z0-9']+/g) || []).length, 0); s.est_s = q.est;
    const flags = [...q.flags.filter(f => !/^topic$/.test(f) || !TOPICS.includes(s.topic)), ...v.flags], d = flags.length ? '' : dd.dup(s);
    s.qc = { flags: d ? [d] : flags, hook_score: v.hook_score, judge: null, gold: true };
    if (flags.length || d) { bad.push({ ...s, reasons: s.qc.flags }); continue; }
    dd.add(s); ok.push(s);
  }
  // ghi kho (mảnh gNNNN – dựng lại tất định mỗi lần)
  fs.mkdirSync(DIR + '/bank', { recursive: true }); for (const f of fs.readdirSync(DIR + '/bank')) if (/^g\d+\.jsonl$/.test(f)) fs.unlinkSync(DIR + '/bank/' + f);
  for (let i = 0; i < ok.length; i += SHARD) fs.writeFileSync(`${DIR}/bank/g${String(i / SHARD).padStart(4, '0')}.jsonl`, ok.slice(i, i + SHARD).map(s => JSON.stringify(s)).join('\n') + '\n');
  fs.writeFileSync(G + '/review.jsonl', bad.map(s => JSON.stringify(s)).join('\n') + (bad.length ? '\n' : ''));
  const bank = readBank(), review = [...readJsonl(DIR + '/review.jsonl'), ...bad], st = fs.existsSync(DIR + '/state.json') ? JSON.parse(fs.readFileSync(DIR + '/state.json', 'utf8')) : { days: [] };
  const sum = summary(bank, review, plan(), st); sum.gold = ok.length; sum.gold_plan = P.length; sum.by_cat = bank.reduce((m, s) => ((m[s.cat || CAT[s.type]] = (m[s.cat || CAT[s.type]] || 0) + 1), m), {});
  sum.by_hook_formula = bank.reduce((m, s) => ((m[s.hook_type] = (m[s.hook_type] || 0) + 1), m), {});
  fs.writeFileSync(DIR + '/summary.json', JSON.stringify(sum, null, 1) + '\n'); fs.writeFileSync(new URL('../../web/data/script-bank.json', import.meta.url), JSON.stringify(sum) + '\n');
  // bản đọc + bảng phủ
  fs.mkdirSync(OUT, { recursive: true });
  const quota = { easy: Math.round(mdN * 0.4), medium: Math.round(mdN * 0.4), hard: mdN - 2 * Math.round(mdN * 0.4) }, pick = [];
  for (const s of ok) if (quota[s.diff] > 0) { quota[s.diff]--; pick.push(s); } // mẫu duyệt 40/40/20
  for (const s of ok) if (pick.length < mdN && !pick.includes(s)) pick.push(s);
  const md = pick.slice(0, mdN).map((s, i) => `### ${i + 1}. ${s.point}\n\`${s.id}\` · ${s.cat} · ${s.cefr} (${s.diff}) · ${s.topic} · hook ${s.hook_type} (${s.qc.hook_score}/5) · ~${s.est_s}s\n\n` +
    `- **Hook:** ${s.hook}\n- ✗ ${s.wrong}\n- ✓ ${s.right}\n- **Why:** ${s.why}\n- **Aha:** ${s.aha}\n- **Examples:** ${s.ex.join(' / ')}\n- **Memory:** ${s.memory}\n- **Quiz:** ${s.quiz.q} [${s.quiz.options.map((o, j) => (j === +s.quiz.answer ? `**${o}**` : o)).join(' | ')}] – ${s.quiz.explain}\n- **Save/share:** ${s.save}\n\n` +
    s.lines.map(l => `> **${l.who === 'ama' ? 'Ama' : 'Carlos'}:** ${l.say}`).join('\n') + '\n').join('\n');
  fs.writeFileSync(OUT + `gold-001-${String(Math.min(mdN, ok.length)).padStart(3, '0')}.md`, `# Gold scripts 1–${Math.min(mdN, ok.length)} (text only)\n\n${md}`);
  const G2 = ok, tab = (k, keys) => { const m = {}; for (const s of G2) { const r = s.cat, c = s[k]; m[r] = m[r] || {}; m[r][c] = (m[r][c] || 0) + 1; } return `| nhóm | ${keys.join(' | ')} | tổng |\n|---|${keys.map(() => '---').join('|')}|---|\n` + CATS.map(c => `| ${c} | ${keys.map(x => (m[c] || {})[x] || 0).join(' | ')} | ${Object.values(m[c] || {}).reduce((a, b) => a + b, 0)} |`).join('\n'); };
  fs.writeFileSync(OUT + 'coverage.md', `# Bảng phủ bộ vàng (${ok.length} đạt / ${P.length} kế hoạch · ${bad.length} trượt QC)\n\n## Nhóm × độ khó\n${tab('diff', ['easy', 'medium', 'hard'])}\n\n## Nhóm × CEFR\n${tab('cefr', ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'])}\n\n## Nhóm × chủ đề\n${tab('topic', TOPICS)}\n\n## Công thức hook\n${Object.entries(sum.by_hook_formula).map(([k, n]) => `- ${k}: ${n}`).join('\n')}\n`);
  console.log(`gold: đạt ${ok.length} · trượt ${bad.length}`); for (const b of bad.slice(0, 40)) console.log('  ✗', b.pid, (b.reasons || []).join(' '));
}

const [cmd, a1] = process.argv.slice(2);
if (cmd === 'plan') { fs.mkdirSync(G + '/src', { recursive: true }); const P = makePlan(+(a1 || 2000)); fs.writeFileSync(G + '/plan.json', '[\n' + P.map(p => JSON.stringify(p)).join(',\n') + '\n]\n'); const c = (k) => P.reduce((m, p) => ((m[p[k]] = (m[p[k]] || 0) + 1), m), {}); console.log(P.length, c('cat'), c('diff'), c('topic')); }
else if (cmd === 'next') { const P = JSON.parse(fs.readFileSync(G + '/plan.json', 'utf8')), done = new Set(srcRecords().map(g => g.p)), full = new Map(plan().map(p => [p.pid, p])); for (const p of P.filter(p => !done.has(p.pid)).slice(0, +(a1 || 50))) console.log(`${p.pid}|${p.cat}|${p.cefr}|${p.topic}|${brief({ ...full.get(p.pid), ...p })}`.slice(0, 330)); }
else if (cmd === 'build') build(+(process.argv[process.argv.indexOf('--md') + 1]) || 100);
else console.log('usage: gold.mjs plan|next N|build');
