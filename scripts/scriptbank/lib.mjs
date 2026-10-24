// Kho kịch bản video ngắn (chỉ CHỮ – không dựng, không credit, không tự đăng). docs/VIDEO-SCALE-PLAN.md §16.
// Nguồn sự thật DUY NHẤT của điểm học: lexicon (web/js/data.js + web/js/lib/*.js), Cách dùng từ (web/js/usage/*.js: cặp dễ nhầm, giới từ,
// mẫu động từ, trạng từ, cấu trúc + lỗi hay gặp), ngữ pháp (web/js/grammar/*.js, câu đố cuối bài) và bảng tình huống nhỏ dưới đây.
// Lược đồ kịch bản (không phụ thuộc template – template nào cũng dựng được từ các trường này):
//   { id, pid, src, type, cefr, diff, topic, hook_type, point, hook, wrong, right, why, ex[2], memory, quiz{q,options,answer,explain},
//     lines[{who:'ama'|'carlos', say}], words, est_s, syl?, stress?, qc{score, judge, flags[]}, gen{model, at} }
import fs from 'fs';
import crypto from 'crypto';
import { createRequire } from 'module';
import { loadAll, key as lexKey } from '../lexicon/lib.mjs';
import { expandRows } from '../lexicon/expand/lib.mjs';
import { syllables, stressIndex } from '../lexicon/ipa.mjs';

const ROOT = new URL('../../', import.meta.url), R = p => new URL(p, ROOT).pathname;
const require = createRequire(import.meta.url);
export const DIR = R('content/video/scripts');
export const h8 = s => crypto.createHash('sha1').update(s).digest('hex').slice(0, 8);
export const TYPES = ['stop-saying', 'x-vs-y', 'preposition', 'verb-pattern', 'adverb', 'structure', 'grammar', 'word-in-use', 'collocation', 'situational', 'pronunciation', 'misunderstanding', 'idiom-phrasal'];
// Nhóm phủ đều (chủ 22/10): 8 nhóm loại bài
export const CAT = { 'stop-saying': 'stop-saying', 'x-vs-y': 'x-vs-y', situational: 'situational', misunderstanding: 'misunderstanding', pronunciation: 'pronunciation', collocation: 'collocation', preposition: 'collocation', adverb: 'collocation', grammar: 'grammar', 'verb-pattern': 'grammar', structure: 'grammar', 'idiom-phrasal': 'idiom-phrasal', 'word-in-use': 'word-in-use' };
export const HOOK_TYPES = ['question', 'mistake_callout', 'challenge', 'myth', 'pov', 'quiz', 'contrast', 'number_list', 'secret_tip', 'story', 'surprise', 'fill_gap', 'listen_diff', 'native_says'];
export const TOPICS = ['daily', 'travel', 'work', 'study', 'shopping', 'food', 'health', 'home', 'social', 'tech', 'money', 'exam'];
const CEFR = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
export const diffOf = c => (/^A/.test(c) ? 'easy' : /^B/.test(c) ? 'medium' : 'hard');

// ---------- Tình huống (situational phrases): chủ đề × chức năng giao tiếp – điểm học = "nói câu X thế nào cho tự nhiên" ----------
const SITUATIONS = {
  travel: ['check in at a hotel', 'ask for directions', 'buy a train ticket', 'report lost luggage', 'ask about a delayed flight', 'ask for a window seat', 'order a taxi', 'ask for the Wi-Fi password', 'ask for a late checkout', 'complain about a noisy room'],
  food: ['order at a cafe', 'ask for the check', 'say you are allergic', 'ask what a dish is', 'send food back politely', 'ask for a table for two', 'order takeout by phone', 'ask for no ice'],
  shopping: ['ask for a different size', 'ask for a refund', 'ask if something is on sale', 'say you are just looking', 'pay by card', 'ask where the fitting room is', 'ask for a receipt'],
  work: ['ask for a deadline extension', 'join a video call late', 'disagree politely in a meeting', 'ask a coworker for help', 'introduce yourself to a team', 'follow up on an email', 'ask for feedback', 'call in sick', 'end a meeting', 'say you will check and reply'],
  study: ['ask a teacher to repeat', 'ask for an example', 'say you do not understand', 'ask about homework', 'join a group project'],
  health: ['describe a headache', 'make a doctor appointment', 'ask a pharmacist for advice', 'say how you feel', 'cancel an appointment'],
  social: ['start small talk', 'accept an invitation', 'say no politely', 'apologize for being late', 'give a compliment', 'end a conversation politely', 'ask someone to repeat their name', 'congratulate a friend', 'offer help'],
  home: ['ask a neighbor for a favor', 'report a broken heater', 'ask about the rent', 'talk about chores'],
  money: ['open a bank account', 'ask about a fee', 'split the bill', 'ask for a discount'],
  tech: ['say your phone is dead', 'ask someone to share their screen', 'say the call is breaking up', 'reset a password with support'],
  exam: ['ask for more time in a speaking test', 'buy time before answering', 'give your opinion in a speaking test', 'paraphrase a question']
};

// ---------- Giao tiếp tự tin: đọc thẳng nguồn content/confidence (không đọc bản sinh) ----------
const CONF_TOPIC = { greetings: 'social', cafe: 'food', shopping: 'shopping', directions: 'travel', travel: 'travel', doctor: 'health', phone: 'daily', friends: 'social', meetings: 'work', interview: 'work', complaints: 'shopping', opinions: 'social' };
export function confidence() { const d = R('content/confidence/units'); return fs.existsSync(d) ? fs.readdirSync(d).filter(f => f.endsWith('.json')).map(f => JSON.parse(fs.readFileSync(d + '/' + f, 'utf8'))).sort((a, b) => a.order - b.order) : []; }
export function confidenceToolkit() { const f = R('content/confidence/toolkit.json'); return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')).groups : []; }

// ---------- NGSL (cổng từ vựng giải thích ≤ B1) ----------
let NG = null;
export function ngsl() {
  if (NG) return NG;
  NG = new Set(fs.readFileSync(R('content/wordlists/ngsl-1.2-defs.csv'), 'utf8').split('\n').slice(1).map(l => l.split(',')[0].trim().toLowerCase()).filter(Boolean));
  for (const w of "a an the i you he she it we they me him her us them my your his its our their this that these those am is are was were be been being do does did have has had will would can could shall should may might must not no yes ok okay hi hey hello please thanks thank sorry wow oops let's let ama carlos blank email emails english american british polite plural casual formal comment comments native natives teacher teachers learner learners repeat say says said tip example examples wrong right correct quiz guess answer pause sentence word words phrase phrases mean means one two three four five first second third today tomorrow yesterday mr mrs ms dr".split(' ')) NG.add(w);
  return NG;
}
const IRREG = { went: 'go', gone: 'go', saw: 'see', seen: 'see', made: 'make', took: 'take', taken: 'take', got: 'get', gotten: 'get', said: 'say', told: 'tell', thought: 'think', knew: 'know', known: 'know', came: 'come', gave: 'give', given: 'give', found: 'find', felt: 'feel', left: 'leave', kept: 'keep', bought: 'buy', brought: 'bring', ate: 'eat', eaten: 'eat', wrote: 'write', written: 'write', spoke: 'speak', spoken: 'speak', met: 'meet', paid: 'pay', sent: 'send', sat: 'sit', stood: 'stand', ran: 'run', heard: 'hear', lost: 'lose', meant: 'mean', began: 'begin', begun: 'begin', chose: 'choose', broke: 'break', broken: 'break', better: 'good', best: 'good', worse: 'bad', worst: 'bad', children: 'child', people: 'person', men: 'man', women: 'woman', isn: 'is', aren: 'are', don: 'do', doesn: 'do', didn: 'do', won: 'will', can: 'can', couldn: 'could', wouldn: 'would', shouldn: 'should', wasn: 'was', weren: 'were', haven: 'have', hasn: 'has' };
export function known(w, extra) {
  const N = ngsl(); w = w.toLowerCase().replace(/’/g, "'").replace(/^'+|'+$/g, '').replace(/'(s|re|ve|ll|d|m|t)$/, '');
  if (!w || /^\d/.test(w) || N.has(w) || (extra && extra.has(w)) || IRREG[w]) return true;
  const c = [w.replace(/ies$/, 'y'), w.replace(/es$/, ''), w.replace(/s$/, ''), w.replace(/ied$/, 'y'), w.replace(/ed$/, ''), w.replace(/ed$/, 'e'), w.replace(/d$/, ''), w.replace(/ing$/, ''), w.replace(/ing$/, 'e'), w.replace(/(.)\1ing$/, '$1'), w.replace(/(.)\1ed$/, '$1'), w.replace(/ly$/, ''), w.replace(/ily$/, 'y'), w.replace(/er$/, ''), w.replace(/est$/, ''), w.replace(/r$/, ''), w.replace(/ier$/, 'y'), w.replace(/iest$/, 'y')];
  return c.some(x => x !== w && x.length > 1 && (N.has(x) || (extra && extra.has(x))));
}
export const words = s => String(s || '').match(/[A-Za-z][A-Za-z'’-]*|\d+/g) || [];
const NW = s => words(s).length;

// ---------- Nguồn ----------
let SRC = null;
export function sources() {
  if (SRC) return SRC;
  globalThis.self = globalThis.self || globalThis;
  require(R('web/js/usage-core.js')); for (const f of fs.readdirSync(R('web/js/usage')).sort()) require(R('web/js/usage/' + f));
  for (const f of ['tenses', 'verbs', 'sentences', 'foundation', 'academic', 'chapters', 'book2', 'drills-a', 'drills-b', 'drills-c', 'check']) require(R(`web/js/grammar/${f}.js`));
  const lex = new Map(); for (const e of [...loadAll(), ...expandRows()]) { const k = lexKey(e.row); if (!lex.has(k)) lex.set(k, e.row); }
  const byWord = new Map(); for (const r of lex.values()) { const w = r[0].toLowerCase(); if (!byWord.has(w)) byWord.set(w, r); }
  return (SRC = { U: self.LK_USAGE, G: self.GRAMMAR, lex, byWord });
}
const levelOf = (w, d = 'B1') => { const r = sources().byWord.get(String(w || '').toLowerCase().replace(/\s*\(.*$/, '').trim()); return (r && CEFR.includes(r[8]) && r[8]) || d; };
const HARD_LESSONS = /inversion|cleft|subjunctive|mixed-cond|hedging|noun-clauses|passive-reporting|quantity-advanced|parallel/;

/** Kế hoạch điểm học – tất định, id ổn định, không trùng (pid). Mỗi điểm: { pid, src, type, point, cefr, diff, topic, facts } */
export function plan() {
  const { U, G, lex } = sources(), out = new Map();
  const add = p => { if (!out.has(p.pid)) out.set(p.pid, { ...p, diff: diffOf(p.cefr), hook_type: HOOK_TYPES[parseInt(h8(p.pid), 16) % HOOK_TYPES.length] }); };
  const KT = { p: 'preposition', v: 'verb-pattern', a: 'adverb', s: 'structure', c: 'x-vs-y' };
  for (const kind of U.KINDS) for (const e of U.load(kind)) {
    const hard = (e.lessons || []).some(l => HARD_LESSONS.test(l)), base = hard ? 'C1' : levelOf(e.key.split('-')[0]);
    const facts = { key: e.key, items: (e.items || []).map(i => ({ form: i.h, meaning: i.en, ex: (i.ex || []).slice(0, 1).map(x => x.replace(/\[([^|\]]+)(\|[^\]]*)?\]/g, '$1')) })), notes: (e.notes || []).map(n => n.en).filter(Boolean).slice(0, 2), lessons: e.lessons };
    for (const [i, m] of (e.mis || []).entries()) add({ pid: `u:${kind}:${e.key}:m${i}`, src: 'usage', type: 'stop-saying', cefr: base, topic: '', point: `Stop saying "${m.w}" – say "${m.r}"`, facts: { ...facts, mistake: m.w, correct: m.r, rule: m.en } });
    if (kind === 'c') { add({ pid: `u:c:${e.key}`, src: 'usage', type: 'x-vs-y', cefr: base, topic: '', point: `${(e.items || []).map(i => i.h).join(' vs ')}`, facts }); continue; }
    for (const it of e.items || []) add({ pid: `u:${kind}:${e.key}:${it.h}`, src: 'usage', type: KT[kind], cefr: base, topic: '', point: `${e.key} + ${it.h}: ${it.en || ''}`.trim(), facts: { ...facts, items: facts.items.filter(x => x.form === it.h) } });
    if (!(e.items || []).length && kind === 's') add({ pid: `u:s:${e.key}`, src: 'usage', type: 'structure', cefr: base, topic: '', point: e.key.replace(/-/g, ' '), facts: { ...facts, ex: (e.ex || []).slice(0, 2).map(x => x.replace(/\[([^|\]]+)(\|[^\]]*)?\]/g, '$1')) } });
  }
  for (const x of G) for (const q of x.quiz || []) {
    if (!Array.isArray(q.options) || q.options[q.answer] == null) continue;
    add({ pid: `g:${x.id}:${h8(q.q)}`, src: 'grammar', type: 'grammar', cefr: CEFR.includes(x.level) ? x.level : 'B1', topic: 'study', point: `${x.en || x.title}: ${q.q.replace(/___/, '[' + q.options[q.answer] + ']')}`, facts: { lesson: x.en || x.title, q: q.q, answer: q.options[q.answer], wrong_options: q.options.filter((o, i) => i !== q.answer) } });
  }
  for (const [topic, list] of Object.entries(SITUATIONS)) for (const s of list) add({ pid: `s:${topic}:${s}`, src: 'situation', type: 'situational', cefr: 'A2', topic, point: `How to ${s} naturally`, facts: { situation: s } });
  // 🗣️ Giao tiếp tự tin (content/confidence, docs/CONFIDENCE.md §6): mỗi cụm = 1 điểm "situational phrase" + 1 điểm "say this instead"; id VĨNH VIỄN, link sâu vào đúng cụm
  for (const u of confidence()) {
    const topic = CONF_TOPIC[u.id] || 'daily', link = `https://lexkite.com/app/#/confidence/${u.id}`;
    for (const p of u.phrases) {
      const facts = { unit: u.id, situation: u.title.en, phrase: p.say, instead: p.not, meaning: p.mean.en, why: p.why.en, link: `${link}#${p.id}`, href: `#/confidence/${u.id}#${p.id}`, area: 'confidence' };
      add({ pid: `cf:${u.id}:${p.id}`, src: 'confidence', type: 'situational', cefr: u.level, topic, point: `${u.title.en}: "${p.say}"`, facts });
      add({ pid: `cf:${u.id}:${p.id}:x`, src: 'confidence', type: 'stop-saying', cefr: u.level, topic, point: `Say "${p.say}" instead of "${p.not}"`, facts: { ...facts, mistake: p.not, correct: p.say, rule: p.why.en } });
    }
  }
  for (const g of confidenceToolkit()) for (const p of g.phrases) add({ pid: `cf:tk:${g.id}:${p.id}`, src: 'confidence', type: 'situational', cefr: 'A2', topic: 'social', point: `${g.title.en}: "${p.say}"`, facts: { group: g.id, phrase: p.say, meaning: p.mean.en, link: `https://lexkite.com/app/#/confidence/toolkit#${g.id}-${p.id}`, href: `#/confidence/toolkit#${g.id}-${p.id}`, area: 'confidence' } });
  for (const r of lex.values()) {
    const [w, ipa, pos, , def, ex, col, syn, lv, , ipaUS] = r, cefr = CEFR.includes(lv) ? lv : 'B1', k = `${w.toLowerCase()}#${pos}`, base = { word: w, pos, def, ex };
    add({ pid: `w:${k}`, src: 'lexicon', type: /idiom|phr/.test(pos) ? 'idiom-phrasal' : / /.test(w) ? 'situational' : 'word-in-use', cefr, topic: '', point: `${w} (${pos}): ${def}`, facts: base });
    const c = String(col || '').split('|').map(s => s.trim()).filter(s => s && s.toLowerCase().includes(w.toLowerCase().split(' ')[0]));
    if (c.length) add({ pid: `c:${k}`, src: 'lexicon', type: 'collocation', cefr, topic: '', point: `Collocation: ${c[0]}`, facts: { ...base, collocations: c.slice(0, 3) } });
    const sy = String(syn || '').split('|').map(s => s.trim()).filter(s => s && !/ /.test(s))[0];
    if (sy && !/ /.test(w)) add({ pid: `x:${k}:${sy.toLowerCase()}`, src: 'lexicon', type: 'x-vs-y', cefr, topic: '', point: `${w} vs ${sy}`, facts: { ...base, other: sy, other_entry: (sources().byWord.get(sy.toLowerCase()) || [])[4] || '' } });
    const us = String(ipaUS || ipa || '').replace(/\//g, ''); const n = syllables(us);
    if (!/ /.test(w) && n >= 3 && us.includes('ˈ')) add({ pid: `p:${k}`, src: 'lexicon', type: 'pronunciation', cefr, topic: '', point: `Word stress: ${w}`, facts: { ...base, ipa_us: '/' + us + '/', syl: n, stress: stressIndex(us) + 1 } });
    if (/^(A1|A2|B1)$/.test(cefr) && /^(n|v|adj|adv)$/.test(pos) && !/ /.test(w)) add({ pid: `m:${k}`, src: 'lexicon', type: 'misunderstanding', cefr, topic: '', point: `A common mix-up with "${w}" (${pos}): ${def}`, facts: base });
  }
  return [...out.values()];
}
// Thứ tự lấy: nguồn giá trị cao trước (lỗi hay gặp, cặp dễ nhầm, tình huống…), trộn 40/40/20 (dễ/vừa/khó) trong MỖI lô.
const PRI = { 'idiom-phrasal': 2, 'stop-saying': 0, 'x-vs-y': 1, situational: 2, preposition: 3, 'verb-pattern': 3, adverb: 3, structure: 3, grammar: 4, collocation: 5, pronunciation: 6, 'word-in-use': 7, misunderstanding: 8 };
export function nextBatch(points, done, n = 20, cap = 6, rot = 0) {
  const q = { easy: {}, medium: {}, hard: {} };
  for (const p of points) if (!done.has(p.pid)) (q[p.diff][p.type] || (q[p.diff][p.type] = [])).push(p);
  for (const d in q) for (const t in q[d]) q[d][t].sort((a, b) => (h8(a.pid) < h8(b.pid) ? -1 : 1));
  const want = { easy: Math.round(n * 0.4), medium: Math.round(n * 0.4), hard: n - 2 * Math.round(n * 0.4) }, out = [], per = {};
  const take = (d, k) => { // vòng tròn theo loại bài (ưu tiên PRI), ≤ cap điểm/loại/lô → mỗi lô đa dạng
    const ts = Object.keys(q[d]).sort((a, b) => PRI[a] - PRI[b]), r = ts.length ? rot % ts.length : 0, types = [...ts.slice(r), ...ts.slice(0, r)]; let got = 0, moved = true;
    while (got < k && moved) { moved = false; for (const t of types) { if (got >= k) break; if (!q[d][t].length || (per[t] || 0) >= cap) continue; out.push(q[d][t].shift()); per[t] = (per[t] || 0) + 1; got++; moved = true; } }
    return got;
  };
  for (const d of ['easy', 'medium', 'hard']) take(d, want[d]);
  for (const d of ['medium', 'easy', 'hard']) if (out.length < n) { cap = Infinity; take(d, n - out.length); } // thiếu loại nào → bù loại khác
  return out;
}

// ---------- Cổng QC tất định (VIDEO-QC dòng "Kịch bản") ----------
export const estSeconds = lines => +(1.5 + lines.reduce((a, l) => a + 0.35 + NW(l.say) / 2.7, 0) + 1.0).toFixed(1); // 162 wpm (VIDEO-QC 150–165) + nghỉ giữa câu + nghỉ đoán
const norm = s => String(s || '').toLowerCase().replace(/[’']/g, "'").replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ').trim();
const stem = w => w.replace(/(ies|ied)$/, 'y').replace(/(es|s|ed|ing|d)$/, '');
const hasForm = (text, phrase) => { const t = ' ' + norm(text) + ' ', ws = norm(phrase).split(' ').filter(Boolean); if (!ws.length) return true; return ws.every(w => w.length < 3 ? t.includes(' ' + w + ' ') : t.split(' ').some(x => x === w || (stem(x) === stem(w) && stem(w).length >= 3) || x.startsWith(w.slice(0, Math.max(3, w.length - 2))))); };

export function qc(p, s) {
  const f = [], L = Array.isArray(s.lines) ? s.lines : [];
  for (const k of ['hook', 'wrong', 'right', 'why', 'memory', 'point']) if (!String(s[k] || '').trim()) f.push('missing:' + k);
  if (!Array.isArray(s.ex) || s.ex.length !== 2 || s.ex.some(e => !String(e || '').trim())) f.push('ex!=2');
  const qz = s.quiz || {}; if (!qz.q || !Array.isArray(qz.options) || qz.options.length < 2 || qz.options.length > 4 || !(Number.isInteger(+qz.answer) && +qz.answer >= 0 && +qz.answer < qz.options.length) || !qz.explain) f.push('quiz');
  else if (new Set(qz.options.map(p.type === 'pronunciation' ? (x => String(x).trim()) : norm)).size !== qz.options.length) f.push('quiz:dup-option');
  if (!CEFR.includes(s.cefr)) f.push('cefr');
  if (!TOPICS.includes(s.topic)) f.push('topic');
  if (NW(s.hook) > 5) f.push('hook>5');
  if (NW(s.why) > 14) f.push('why>14');
  if (NW(s.memory) > 16) f.push('memory>16');
  if ((s.ex || []).some(e => NW(e) > 14)) f.push('ex>14');
  if (L.length < 6 || L.length > 10) f.push('lines:' + L.length);
  if (L.some(l => !['ama', 'carlos'].includes(l.who) || !String(l.say || '').trim())) f.push('lines:who');
  if (L.some(l => NW(l.say) > 14)) f.push('line>14w');
  for (let i = 1; i < L.length; i++) if (L[i].who === L[i - 1].who) { f.push('lines:alternate'); break; }
  const est = estSeconds(L); if (est < 18 || est > 28) f.push('length:' + est + 's');
  if (p.type === 'pronunciation' ? String(s.wrong).trim() === String(s.right).trim() : norm(s.wrong) === norm(s.right)) f.push('wrong==right');
  // tiếng Anh giải thích ≤ B1: từ ngoài NGSL (trừ chữ đang dạy, ví dụ, câu sai/đúng, đáp án) ≤ 2
  const taught = new Set(words([p.point, s.point, s.wrong, s.right, ...(s.ex || []), ...(qz.options || []), qz.q, JSON.stringify(p.facts || {})].join(' ')).map(w => w.toLowerCase()));
  const off = [...new Set(words([s.why, s.memory, qz.explain, ...L.map(l => l.say)].join(' ')).map(w => w.toLowerCase()).filter(w => !known(w, taught) && !(p.type === 'pronunciation' && (w.includes('-') || w.length <= 4))))];
  if (off.length > 2) f.push('ngsl:' + off.slice(0, 5).join(','));
  // khớp nguồn (fact check với lexicon / Cách dùng từ / ngữ pháp)
  const F = p.facts || {};
  if (p.src === 'lexicon' && p.type !== 'pronunciation') {
    const target = p.type === 'collocation' ? F.collocations[0] : F.word;
    if (!hasForm(s.right + ' ' + (s.ex || []).join(' '), target)) f.push('fact:target-missing');
    if (p.type === 'x-vs-y' && !hasForm([s.right, s.wrong, ...(s.ex || []), s.why, s.memory].join(' '), F.other)) f.push('fact:pair-missing');
  }
  if (p.type === 'pronunciation') { if (+s.syl !== F.syl) f.push(`fact:syl ${s.syl}≠${F.syl}`); if (+s.stress !== F.stress) f.push(`fact:stress ${s.stress}≠${F.stress}`); const cap = String(s.right).split(/[-\s]+/).filter(x => /^[A-Z]+$/.test(x)).length; if (cap !== 1) f.push('fact:respelling'); }
  if (p.src === 'usage') {
    if (p.type === 'stop-saying') { // các từ làm nên bản sửa (có trong câu đúng của nguồn mà không có trong câu sai) phải có trong câu đúng của kịch bản
      const mis = new Set(norm(F.mistake).split(' ')), alts = String(F.correct).replace(/\([^)]*\)/g, ' ').split(/\s+\/\s+/).map(a => norm(a).split(' ').filter(w => w && !mis.has(w)));
      if (!alts.some(ws => ws.every(w => hasForm(s.right, w)))) f.push('fact:correct-form');
    }
    if (p.type === 'stop-saying' && norm(s.right) === norm(F.mistake)) f.push('fact:right==known-mistake');
    if (['preposition', 'verb-pattern', 'adverb'].includes(p.type)) { const it = (F.items || [])[0], fm = it ? String(it.form).replace(/\(.*?\)/g, '').trim() : ''; if (it && /^(to|that|in|on|at|for|of|with|about|from|by|into|over|against|after|under|toward|towards|between|among|without|through)$/.test(fm) && !hasForm(s.right + ' ' + (s.ex || []).join(' '), fm)) f.push('fact:form-missing'); }
  }
  if (p.src === 'grammar') { const a = norm(F.answer).split(' / ').join(' '); if (a && !hasForm([s.right, ...(s.ex || []), ...(qz.options || [])].join(' '), a.split(' ').slice(0, 2).join(' '))) f.push('fact:answer-missing'); }
  return { flags: f, est, off };
}

// ---------- Chống trùng gần (3-gram Jaccard trên câu đúng + ví dụ) ----------
export const sig = s => { const w = norm([s.right, ...(s.ex || [])].join(' ')).split(' '); const g = new Set(); for (let i = 0; i + 2 < w.length; i++) g.add(w.slice(i, i + 3).join(' ')); return g; };
export class Dedupe {
  constructor() { this.idx = new Map(); this.sigs = []; this.rights = new Set(); }
  add(s) { const g = sig(s), id = this.sigs.length; this.sigs.push(g); this.rights.add(norm(s.right)); for (const t of g) { let a = this.idx.get(t); if (!a) this.idx.set(t, (a = [])); a.push(id); } }
  dup(s) {
    if (this.rights.has(norm(s.right))) return 'dup:right';
    const g = sig(s), hit = new Map(); for (const t of g) for (const id of this.idx.get(t) || []) hit.set(id, (hit.get(id) || 0) + 1);
    for (const [id, n] of hit) { const j = n / (g.size + this.sigs[id].size - n); if (j >= 0.5) return 'dup:near ' + j.toFixed(2); }
    return '';
  }
}

// ---------- Lưu trữ: JSONL chia mảnh 500 dòng ----------
export const SHARD = 500;
export function readJsonl(f) { try { return fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l)); } catch (e) { return []; } }
export function readBank() { const d = DIR + '/bank'; if (!fs.existsSync(d)) return []; return fs.readdirSync(d).filter(f => /\.jsonl$/.test(f)).sort().flatMap(f => readJsonl(d + '/' + f)); }
export function appendBank(list) {
  const d = DIR + '/bank'; fs.mkdirSync(d, { recursive: true });
  let files = fs.readdirSync(d).filter(f => /\.jsonl$/.test(f)).sort(), cur = files.length ? files[files.length - 1] : '0000.jsonl', n = readJsonl(d + '/' + cur).length;
  for (const s of list) { if (n >= SHARD) { cur = String(parseInt(cur, 10) + 1).padStart(4, '0') + '.jsonl'; n = 0; } fs.appendFileSync(d + '/' + cur, JSON.stringify(s) + '\n'); n++; }
}
export function summary(bank, review, pts, state) {
  const c = k => { const m = {}; for (const s of bank) m[s[k] || '–'] = (m[s[k] || '–'] || 0) + 1; return m; };
  const tot = bank.length + review.length;
  return { updated: new Date().toISOString(), bank: bank.length, review: review.length, pass_rate: tot ? +(bank.length / tot).toFixed(3) : 0, planned: pts.length, left: pts.length - bank.length - review.length,
    by_type: c('type'), by_cefr: c('cefr'), by_diff: c('diff'), by_topic: c('topic'), by_hook: c('hook_type'), avg_score: bank.length ? +(bank.reduce((a, s) => a + (s.qc.judge || 0), 0) / bank.length).toFixed(2) : 0,
    review_reasons: review.reduce((m, r) => { for (const x of r.reasons || []) { const k = x.split(/[: ]/)[0]; m[k] = (m[k] || 0) + 1; } return m; }, {}), days: (state.days || []).slice(-30) };
}

// ---------- Viral (chủ 22/10): công thức hook đã thử, khoảng tò mò, "aha", lưu/chia sẻ, mồi bình luận, kết vòng lặp ----------
export const HOOKS = [
  { id: 'stop', re: /^stop saying\b/i, loop: 'So... are you still saying it?' },
  { id: 'natives', re: /^natives never say\b/i, loop: 'Now you sound like a native.' },
  { id: '90', re: /^90% get this wrong\b/i, loop: 'So... are you in the 90%?' },
  { id: 'which', re: /^which is correct\?/i, loop: 'So... which is correct?' },
  { id: 'embarrass', re: /^don't embarrass yourself\b/i, loop: 'No more embarrassing moments!' },
  { id: 'instead', re: /^say this instead\b/i, loop: 'Say this instead. Every time.' },
  { id: 'rude', re: /^this word is rude\?!/i, loop: 'Rude or not? Now you know.' },
  { id: 'guess', re: /^guess before i tell you\b/i, loop: 'Did you guess right?' }
];
export const hookOf = h => HOOKS.find(x => x.re.test(String(h || '').replace(/[’]/g, "'").trim())) || null;
const GUESS = ['Pause. Guess first.', 'Wait. Guess first.', 'Stop and guess.', 'Think. What sounds right?'];
const SAY = ['Natives say:', 'Say:', 'The natural way:', 'Better:'];
/** Lời thoại mặc định (template nào cũng có thể dựng lại từ các trường): hook ≤ 1,5 s → lỗi → nghỉ đoán (khoảng tò mò) → đáp án giữa clip → vì sao → aha → mồi bình luận → lưu/chia sẻ + câu lặp về hook */
export function expandLines(s) {
  const k = parseInt(h8(s.pid || s.id || s.right), 16), H = hookOf(s.hook), q = String((s.quiz || {}).q || '').replace(/_{2,}/g, 'blank');
  const L = [
    ['ama', s.hook],
    ['carlos', H && H.id === 'which' ? `${s.wrong} Or: ${s.right}` : `Many learners say: ${s.wrong}`],
    ['ama', GUESS[k % GUESS.length]],
    ['carlos', H && H.id === 'which' ? `Correct: ${s.right}` : `${SAY[k % SAY.length]} ${s.right}`],
    ['ama', s.why],
    ['carlos', s.aha],
    ['ama', `Comment below: ${((s.quiz || {}).options || []).slice(0, 3).join(' or ')}?`],
    ['carlos', `${s.save} ${H ? H.loop : ''}`.trim()]
  ];
  return L.map(([who, say]) => ({ who, say: String(say || '').trim() }));
}
/** Điểm hook 1–5 (QC): công thức đã thử + ≤ 5 từ + cụ thể/tò mò, không giữ đáp án trong hook, không lặp công thức liền trước */
export function hookScore(s, prev) {
  const H = hookOf(s.hook); if (!H) return 1;
  let n = 3; if (NW(s.hook) <= 5) n++; else n -= 2;
  if (['which', '90', 'guess', 'embarrass', 'instead'].includes(H.id) || /["'“‘]|\b[A-Z][a-z]+\b.*\?|!/.test(s.hook.replace(/^\S+/, ''))) n++;
  if (H.id === 'stop' || H.id === 'natives') { const t = norm(s.hook).split(' ').slice(H.id === 'stop' ? 2 : 3).join(' '); if (t && norm(s.right).includes(t) && !norm(s.wrong).includes(t)) n -= 2; } // hook lộ đáp án
  if (prev && prev === H.id) n -= 2; // lặp liền nhau
  return Math.max(1, Math.min(5, n));
}
export function qcViral(s, prevHook) {
  const f = [], hs = hookScore(s, prevHook);
  if (hs < 4) f.push('hook<4:' + hs);
  if (!String(s.aha || '').trim() || NW(s.aha) > 13) f.push('aha');
  if (!String(s.save || '').trim() || NW(s.save) > 8 || !/\b(save|send|share|tag)\b/i.test(s.save)) f.push('save');
  if (norm(s.hook).includes(norm(s.right))) f.push('hook-reveals-answer');
  return { flags: f, hook_score: hs };
}
