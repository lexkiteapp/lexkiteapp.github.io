#!/usr/bin/env node
// E1b – viết lại phương án nhiễu (đáp án dài nhất = mẹo làm bài) và lời giải rập khuôn bằng AI MIỄN PHÍ, có giám khảo kép (docs/CONTENT-WORLD-PLAN.md §7.3).
// Hai chế độ:
//   node scripts/content-qa/bank-rewrite.mjs gen [--shard i --of n] [--max N]  → soạn lại + chấm kép; ghi reports/bank-patches-<i>.json (chạy trên CI: bank-rewrite.yml)
//   node scripts/content-qa/bank-rewrite.mjs apply <patches.json…> [--write]   → áp bản vá ĐÃ ĐẠT vào nguồn (khớp đúng mảng options + đáp án đúng giữ nguyên chữ)
// Luật cứng sau soạn (rồi mới tới giám khảo): cùng số phương án, đáp án đúng GIỮ NGUYÊN chữ + ô, nhiễu không trùng/không "all of the above",
// đáp án KHÔNG còn dài nhất (cách ≥ 4 ký tự), nhiễu ≤ 2× đáp án. Chỉ nhận khi cả 2 giám khảo (khác họ) ≥ 4 và lệch ≤ 1.
import fs from 'node:fs'; import path from 'node:path';
import { loadContent, ROOT } from '../lib/content-load.mjs';
import { auditBank } from './bank-audit.mjs';
import { JUDGE_SYS, score, chunks } from '../factory/lib.mjs';
import { createPool } from '../lib/ai-pool.mjs';
import { RUBRIC } from './judge-bank.mjs';
import { files } from './bank-balance.mjs';

const GEN_SYS = 'You are a senior item writer for Cambridge/ETS-style English exams. For each item, REWRITE the wrong options (distractors) so the item has no test-taking giveaways. ' +
  'Rules: keep the correct option EXACTLY as given and at the same index; every distractor must be about the same length (±25%) and the same grammatical form and specificity as the correct option, plausible to a learner but clearly wrong for a reason a teacher can state, ' +
  'no duplicates, no "all/none of the above", no joke options, nothing that is also defensible. If "explain" mentions the old distractors, or is a generic template that does not say what is special about THIS item, ' +
  'rewrite it in the SAME language as the original (usually Vietnamese), 1-2 sentences, specific to this item, saying why the correct option is right and why the main distractor is wrong; otherwise return it unchanged. ' +
  'Return JSON {"<k>": {"options": [...], "explain": "..."}} with one key per item and nothing else.';
// TOEFL: đáp án đúng thường là câu dài nhất (~50 %) → KHÔNG rút ngắn đáp án; KÉO DÀI nhiễu bằng chi tiết hợp lý (lý do, giới hạn, danh từ cụ thể) cho dài ngang đáp án.
const GEN_SYS_TOEFL = 'You are a senior item writer for TOEFL iBT (ETS-style) reading and listening questions. In these items the correct option is usually the LONGEST one, which is a test-taking giveaway. ' +
  'For each item, REWRITE only the wrong options (distractors): make EACH distractor 90%-125% of the correct option\'s length in characters, and at least one distractor LONGER than the correct option, by adding plausible, specific detail (a reason, a qualifier, a concrete noun phrase, a contrast) in the same register and grammatical form as the correct option. ' +
  'Keep the correct option EXACTLY as given at the same index; do NOT shorten it. Each distractor must still be clearly wrong for a reason a teacher can state against the passage/audio, not defensible, no duplicates, no "all/none of the above", no joke options. ' +
  'If "explain" mentions the old distractors, or is a generic template, rewrite it in the SAME language as the original (usually Vietnamese), 1-2 sentences, specific to this item, keeping any English quotation from the passage that supports the correct option; otherwise return it unchanged. ' +
  'Return JSON {"<k>": {"options": [...], "explain": "..."}} with one key per item and nothing else.';
const view = i => ({ q: i.q, options: i.options, key: i.a, explain: i.explain.slice(0, 600), level: i.level, ...(i.ctx ? { context: i.ctx.slice(0, 3000) } : {}) });
const lens = o => o.map(x => x.length);
const longestBias = (o, a) => { const l = lens(o), mx = Math.max(...l); return o.length > 2 && l[a] === mx && l.filter(x => x === mx).length === 1 && mx - Math.max(...l.filter((_, i) => i !== a)) >= 4; };
export const hardRules = (it, out) => {
  const e = [], o = out && out.options;
  if (!Array.isArray(o) || o.length !== it.options.length) return ['số phương án đổi'];
  if (o.some(x => typeof x !== 'string' || !x.trim())) e.push('phương án rỗng');
  if (o[it.a] !== it.options[it.a]) e.push('đáp án đúng bị đổi chữ/ô');
  if (new Set(o.map(x => String(x).toLowerCase().trim())).size < o.length) e.push('trùng phương án');
  if (o.some(x => /(all|none|both) of the above|^both\b/i.test(x))) e.push('all/none of the above');
  if (longestBias(o, it.a)) e.push('đáp án vẫn dài nhất');
  if (!/^TOEFL/.test(it.group || '') && o.some((x, i) => i !== it.a && x.length > 2 * Math.max(8, o[it.a].length))) e.push('nhiễu quá dài');
  if (/^TOEFL/.test(it.group || '')) { const L = o.map(x => String(x).length), c = L[it.a], w = L.filter((_, i) => i !== it.a);
    if (w.some(x => x < 0.75 * c)) e.push('TOEFL: nhiễu ngắn hơn 75 % đáp án'); if (Math.max(...w) < c) e.push('TOEFL: không nhiễu nào dài bằng đáp án'); if (w.some(x => x > 1.8 * c)) e.push('TOEFL: nhiễu quá dài (>180 %)'); }
  if (typeof out.explain !== 'string' || out.explain.trim().length < 20) e.push('lời giải quá ngắn');
  return e;
};
// ----- chọn câu cần viết lại: đáp án dài nhất (+ lời giải rập khuôn: 4 từ đầu lặp ≥ 8 lần trong nhóm)
const norm = s => String(s || '').toLowerCase().replace(/[^\p{L}\p{N} ]+/gu, ' ').replace(/\s+/g, ' ').trim();
export function pickTargets(items) {
  const lead = {}; for (const i of items) { const l = norm(i.explain).split(' ').slice(0, 4).join(' '); if (l.split(' ').length === 4) lead[i.group + '|' + l] = (lead[i.group + '|' + l] || 0) + 1; }
  return items.map((i, ix) => ({ ...i, k: `${i.group}#${ix}`, why: [longestBias(i.options, i.a) && 'long', i.explain && lead[i.group + '|' + norm(i.explain).split(' ').slice(0, 4).join(' ')] >= 8 && 'tmpl'].filter(Boolean) }))
    .filter(i => i.why.length && (i.q.trim().length >= 12 || i.ctx) && i.options.every(o => o.trim().length > 1));
}
// ----- áp bản vá vào nguồn
const STR = String.raw`(?:"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|\x60(?:[^\x60\\$]|\\.)*\x60)`;
const TOK = new RegExp(STR, 'g'), val = t => (0, eval)(t);
const OPT = new RegExp(String.raw`options:\s*\[((?:\s*${STR}\s*,?)+)\]\s*,\s*(?:a|answer):\s*\d\b`, 'g');
const EXP = new RegExp(String.raw`^([^{}]*?\bexplain:\s*)(${STR})`);
const quote = (s, tk) => { const q = tk[0]; return q === '`' ? '`' + s.replace(/[`\\]|\$\{/g, m => '\\' + m) + '`' : q + s.replace(/\\/g, '\\\\').replace(new RegExp(q, 'g'), '\\' + q).replace(/\n/g, '\\n') + q; };
// Dạng hàm (đề TOEFL): Q(n, …, [đúng, sai, sai, sai], cue, lời giải) và m(n, q, 'đúng', [sai…], pos, cue, lời giải). Khớp CHÍNH XÁC chữ, duy nhất; đáp án đúng giữ nguyên.
const ARR = new RegExp(String.raw`\[((?:\s*${STR}\s*,?)+)\]`, 'g'), TAIL = new RegExp(String.raw`^\s*,\s*(?:\d+\s*,\s*)?(${STR})\s*,\s*(${STR})`);
const MFORM = new RegExp(String.raw`\bm\(\s*\d+\s*,\s*${STR}\s*,\s*(${STR})\s*,\s*\[((?:\s*${STR}\s*,?)+)\]`, 'g');
const sameSet = (a, b) => a.length === b.length && new Set(a).size === a.length && [...a].sort().every((x, i) => x === [...b].sort()[i]);
const mapOf = p => { const m = new Map(); p.old.forEach((x, i) => { if (i !== p.a) m.set(x, p.new[i]); }); return m; }; // nguồn có thể xếp lại lúc nạp: ghép theo CHỮ (nhiễu cũ → nhiễu mới), đáp án đúng giữ nguyên
const arrOf = body => (body.match(TOK) || []).map(val), eq = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
function applyHelper(t, p) {
  const right = p.old[p.a], wrongOld = p.old.filter((_, i) => i !== p.a), wrongNew = p.new.filter((_, i) => i !== p.a);
  if (p.new[p.a] !== right || wrongNew.length !== wrongOld.length) return null;
  const hits = []; let m;
  ARR.lastIndex = 0;
  while ((m = ARR.exec(t))) { if (!/^\s*Q\(/.test(t.slice(t.lastIndexOf('\n', m.index) + 1, m.index)) && !/^\s*Q\([^\n]*$/.test(t.slice(t.lastIndexOf('\n', m.index) + 1, m.index))) continue;
    if (arrOf(m[1])[0] === right && sameSet(arrOf(m[1]), p.old)) hits.push({ at: m.index, len: m[0].length, body: m[1], bodyAt: m.index + 1, kind: 'Q' }); }
  MFORM.lastIndex = 0;
  while ((m = MFORM.exec(t))) { if (val(m[1]) !== right || !sameSet(arrOf(m[2]), wrongOld)) continue;
    const bodyAt = m.index + m[0].length - 1 - m[2].length; hits.push({ at: m.index, len: m[0].length, body: m[2], bodyAt, kind: 'm' }); }
  if (hits.length !== 1) return null;
  const h = hits[0];
  const W = mapOf(p), nb = h.body.replace(TOK, tk => { const x = val(tk); return x === right ? tk : quote(W.get(x), tk); });
  const end = h.at + h.len; let rest = t.slice(end);
  const e = TAIL.exec(rest.slice(0, 1500));
  if (e && p.explain && p.explain !== p.oldExplain && val(e[2]) === p.oldExplain) rest = rest.slice(0, e.index + e[0].length - e[2].length) + quote(p.explain, e[2]) + rest.slice(e.index + e[0].length);
  return t.slice(0, h.bodyAt) + nb + t.slice(h.bodyAt + h.body.length, end) + rest;
}
// Áp một danh sách bản vá lên văn bản nguồn: tìm mảng options trùng ĐÚNG chữ + thứ tự (phải duy nhất), thay phương án và (nếu khớp) lời giải đứng ngay sau.
export function applyAll(src, patches) {
  let t = src, hit = 0;
  for (const p of patches) {
    const at = []; OPT.lastIndex = 0; let m;
    while ((m = OPT.exec(t))) { const cur = (m[1].match(TOK) || []).map(val); if (cur[p.a] === p.old[p.a] ? sameSet(cur, p.old) : (cur.includes(p.old[p.a]) && sameSet(cur, p.old))) at.push(m); }
    if (at.length === 0) { const r = applyHelper(t, p); if (r) { t = r; hit++; } continue; } // dạng hàm Q(...) / m(...): đáp án đúng đứng đầu, vị trí dựng lúc chạy
    if (at.length !== 1) continue; // không thấy hoặc mơ hồ → bỏ (an toàn)
    m = at[0]; const W = mapOf(p), nb = m[1].replace(TOK, tk => { const x = val(tk); return x === p.old[p.a] ? tk : quote(W.get(x), tk); }), start = m.index, end = start + m[0].length;
    let head = t.slice(0, start) + m[0].replace(m[1], nb), rest = t.slice(end);
    const e = EXP.exec(rest.slice(0, 1500));
    if (e && p.explain && p.explain !== p.oldExplain && val(e[2]) === p.oldExplain) rest = e[1] + quote(p.explain, e[2]) + rest.slice(e[0].length);
    t = head + rest; hit++;
  }
  return { text: t, hit };
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const A = process.argv.slice(2), cmd = A[0], arg = f => { const i = A.indexOf(f); return i >= 0 ? A[i + 1] : null; };
  if (cmd === 'gen') {
    const sh = +(arg('--shard') || 0), of = +(arg('--of') || 1), max = +(arg('--max') || 1e9), deadline = Date.now() + (+(arg('--budget-min') || 45)) * 60000;
    const { items } = auditBank(loadContent()), all = pickTargets(items).filter((_, i) => i % of === sh).slice(0, max);
    console.log(`cần viết lại ${pickTargets(items).length} câu (long/tmpl) · shard ${sh}/${of}: ${all.length}`);
    const AI = createPool({ budget: { lexai: 0, cf2: 0 }, prompt: req => ({ sys: req.mode === 'cfgen' ? (req.toefl ? GEN_SYS_TOEFL : GEN_SYS) : JUDGE_SYS(RUBRIC + ' The item was REWRITTEN to remove giveaways; judge the new options and explanation as a whole.'), user: JSON.stringify(req.items), temp: req.mode === 'cfgen' ? 0.6 : 0.1 }) });
    const R = { shard: sh, targets: all.length, gen: 0, rule: 0, judged: 0, pass: 0, patches: [], rejected: [] }, isT = i => /^TOEFL/.test(i.group), queue = [...chunks(all.filter(isT), 5).map(c => ({ c, toefl: true })), ...chunks(all.filter(i => !isT(i)), 5).map(c => ({ c, toefl: false }))];
    await Promise.all(Array.from({ length: 4 }, async () => { for (let q; (q = queue.shift()) && Date.now() < deadline;) { const ch = q.c;
      try {
        const g = await AI.gen({ mode: 'cfgen', toefl: q.toefl, items: ch.map(i => ({ k: i.k, ...view(i), why: i.why })) }); if (!g) continue;
        const ok = [];
        for (const i of ch) { const o = g.out[i.k]; if (!o) continue; R.gen++; const e = hardRules(i, o); if (e.length) { R.rule++; R.rejected.push({ k: i.k, why: e.join(' · ') }); } else ok.push({ i, o }); }
        if (!ok.length) continue;
        const { a, b } = await AI.judgePair({ mode: 'cfjudge', items: ok.map(({ i, o }) => ({ k: i.k, ...view({ ...i, options: o.options, explain: o.explain }) })) }, { exclude: [] });
        for (const { i, o } of ok) { const sa = a && score(a.out, i.k), sb = b && score(b.out, i.k); if (sa == null || sb == null) continue; R.judged++;
          if (sa >= 4 && sb >= 4 && Math.abs(sa - sb) <= 1) { R.pass++; R.patches.push({ group: i.group, q: i.q.slice(0, 80), old: i.options, new: o.options, oldExplain: i.explain, explain: o.explain, a: i.a, sa, sb }); }
          else R.rejected.push({ k: i.k, why: `giám khảo ${sa}/${sb}` }); }
      } catch (e) { /* lô hỏng: bỏ qua, câu giữ nguyên */ }
    } }));
    fs.mkdirSync('reports', { recursive: true }); fs.writeFileSync(`reports/bank-patches-${sh}.json`, JSON.stringify(R, null, 1));
    console.log(`soạn ${R.gen} · trượt luật ${R.rule} · chấm ${R.judged} · đạt ${R.pass} (${R.judged ? Math.round(100 * R.pass / R.judged) : 0}%)`);
    if (R.targets && !R.gen) { console.error('✗ 0 câu soạn được (hạ tầng AI?)'); process.exit(1); }
  } else if (cmd === 'apply') {
    const P = A.slice(1).filter(x => x.endsWith('.json')).flatMap(f => JSON.parse(fs.readFileSync(f, 'utf8')).patches), write = A.includes('--write'); let hit = 0;
    const orig = {}; for (const f of files()) { const src = fs.readFileSync(f, 'utf8'), r = applyAll(src, P); hit += r.hit; if (write && r.text !== src) { orig[f] = src; fs.writeFileSync(f, r.text); } }
    console.log(`bank-rewrite apply: ${P.length} bản vá, áp ${hit} câu${write ? ' (đã ghi)' : ''}`); void path; void ROOT;
    // Cổng: --gate-longest N (mặc định không bật) → sau khi áp, tỉ lệ "đáp án dài nhất" của nhóm TOEFL.* phải ≤ N %, không thì HOÀN LẠI nguồn và thoát 1 (không nhận lô).
    const gate = arg('--gate-longest'); if (write && gate) { const { out } = auditBank(loadContent()), bad = Object.entries(out).filter(([k, x]) => /^TOEFL/.test(k) && x.longestIsAnswerPct > +gate);
      console.log('đáp án dài nhất (TOEFL): ' + Object.entries(out).filter(([k]) => /^TOEFL/.test(k)).map(([k, x]) => `${k} ${x.longestIsAnswerPct}%`).join(' · '));
      if (bad.length) { for (const [f, src] of Object.entries(orig)) fs.writeFileSync(f, src); console.error(`✗ cổng: ${bad.map(([k, x]) => `${k} ${x.longestIsAnswerPct}%`).join(', ')} > ${gate}% – đã hoàn lại nguồn, không nhận lô`); process.exit(1); } }
  } else { console.error('dùng: gen | apply'); process.exit(2); }
}
