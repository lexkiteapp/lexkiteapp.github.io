/* Native M4 – "Writing & grammar" part 2 (parity P09: #/fix #/grammar #/method #/quick #/style #/confidence).
 * Reference = the REAL web code, never re-implemented: web/js/writecheck-rules.js (LK_WRITE.check), web/js/grammar.js + grammar/*.js (lessons, chapters, answer matching), web/js/method.js,
 * web/js/quick.js (#/style), web/js/confidence.js (+ confidence/data.js). Rules / tables that live in closures are read from the source literals; pages run in node:vm on the RECORDING DOM of gen-skills.mjs (`mk`).
 * Outputs: learn.json (vectors) · learn-content.json (bundled: rules, tables, style quiz, confidence units, method texts) · web/data/grammar-pack.json (download: 80 lessons + self-check regexes + L1 notes) ·
 * grammar-starter.json (bundled: lesson index + 3 lessons, offline). t() keeps the Vietnamese KEY ("key⟦{vars}⟧", parse with tk()) exactly as the web passes it.
 * Spec: docs/specs/native-m4-write.md (P09 part 2). Exports learnVectors() · learnContent() · grammarPack() · grammarStarter() · learnStringKeys(). */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { rigVectorText } from './gen-teach.mjs';
import { mk, settle, clone } from './gen-skills.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const unesc = x => (typeof x === 'string' ? x.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&') : x);
const RT = (k, v) => (v ? String(k) + '⟦' + JSON.stringify(v) + '⟧' : String(k));
const tk = str => {
  const m = /^([\s\S]*?)⟦([\s\S]*)⟧$/.exec(String(str)); if (!m) return { k: unesc(String(str)) };
  const v = JSON.parse(/^\{&quot;/.test(m[2]) ? unesc(m[2]) : m[2]); for (const [a, b] of Object.entries(v)) if (typeof b === 'string') { const u = unesc(b); v[a] = /⟦/.test(u) ? tk(u) : u; }
  return { k: unesc(m[1]), v };
};
const round = n => Math.round(n * 1e9) / 1e9;
const NOW = Date.UTC(2026, 0, 5, 9, 0, 0);
const sliceLit = (src, name, end = '\n  };') => { const a = src.indexOf(`const ${name} = `); const b = src.indexOf(end, a); if (a < 0 || b < 0) throw new Error('const ' + name + ' not found'); return vm.runInNewContext('(' + src.slice(a + `const ${name} = `.length, b + end.length - 1) + ')', { t: x => x }); };
const sliceFn = (src, from, to) => { const a = src.indexOf(from), b = src.indexOf(to, a); if (a < 0 || b < 0) throw new Error('slice ' + from); return src.slice(a, b); };

// ================================================================== #/fix ==================================================================
function fixSource() {
  const src = rd('web/js/writecheck-rules.js'), sb = {}; sb.self = sb; vm.createContext(sb); vm.runInContext(src, sb);
  const W = sb.LK_WRITE, lit = n => vm.runInNewContext('(' + (() => { const a = src.indexOf(`const ${n} = `) + `const ${n} = `.length; return src.slice(a, src.indexOf('};', a) + 1); })() + ')');
  const fx = rd('web/js/fixer.js');
  return { W, spell: lit('SPELL'), v3: lit('V3'), base: lit('BASE'), upg: W.UPG,
    rules: W.rules.map(r => ({ id: r.id, re: r.re.source, flags: r.re.flags, type: r.type, title: r.title, why: r.why, lesson: r.lesson })),
    types: [['spelling', 'Chính tả'], ['grammar', 'Ngữ pháp'], ['punct', 'Dấu câu'], ['style', 'Văn phong']],
    sample: /const SAMPLE = '((?:[^'\\]|\\.)*)'/.exec(fx)[1].replace(/\\'/g, "'"), maxLen: +/const MAXLEN = (\d+)/.exec(fx)[1],
    useRule: sliceLit(fx, 'USE_RULE', ' };'), useScan: [...vm.runInNewContext('(' + /const USE_SCAN = new Set\((\[[^\]]*\])\)/.exec(fx)[1] + ')')] };
}
/** one sentence per rule (plus the traps each rule guards against) – every outcome is the real LK_WRITE.check */
const FIX_CASES = [
  ['spell', 'I recieve the definately seperate untill wich.'], ['i-lower', "i think i'm right and i've won. (i.e. fine) i-beam"], ['a-an', 'a apple, an book, a hour, an university, an MBA, a umbrella, an honest man, a one-day trip'],
  ['dup', 'This is is a test. That that is fine. Very very good.'], ['sva-3', 'He have a car. She do not like it. It are big. Did he go home? Let it go.'], ['sva-pl', 'They is happy. We was late. People has opinions. Children goes out.'],
  ['sva-i', 'I is a student. I has a car. I goes home.'], ['sva-every', 'Everyone are here. Somebody have it. Each were told.'], ['modal-to', 'You should to study. He can to swim. We must to go.'],
  ['modal-s', 'She can goes home. He should has a plan. They will not goes.'], ['modal-of', 'You could of called. We should of left. He must of known.'], ['perf-v2', 'I have went there. She has saw it. They had ate. We have never wrote it.'],
  ['did-v2', "I didn't went. Did you went home? He doesn't goes. She does not has it. Did he saw it?"], ['do-subj-s', 'Does he likes it? Did she went? Do you wants tea? Did the man lived here?'],
  ['make-to', 'It made me to laugh. Let him to go. She makes people to think.'], ['ger', 'I enjoy to read. He avoids to speak. She finished to eat. They suggest to go. I keep to try the new one.'], ['look-fwd', 'I look forward to meet you. We looked forward to see it.'],
  ['be-agree', 'I am agree with you. They are disagree.'], ['if-will', 'If it will rain tomorrow, we stay. When I will arrive, call me. Unless she will come, go.'], ['uncount', 'He gave me many informations and advices about furnitures.'],
  ['more-er', 'This is more better. It is the most easiest test. She is more taller.'], ['then-than', 'It is bigger then me. Better then before. Other then that.'], ['since-for', 'I have lived here since three years. She waited since 2 hours.'],
  ['discuss-about', 'We discussed about the plan. He mentioned about it. She entered into the room. They lack of money. A lack of sleep. Reach to the top.'], ['dep-prep', 'It depends of you. He is interested on music. She arrived to the city. They are famous of it.'],
  ['other-hand', 'In the other hand, it is cheap.'], ['despite-of', 'Despite of the rain, we went.'], ['although-but', 'Although it rained, but we went out.'], ['because-so', 'Because it was late, so we left. As it was late, so we left.'],
  ['explain-me', 'Please explain me the rule. He described them the plan. She suggested him to rest.'], ['your-welcome', 'Your welcome! Your right. Your going home.'], ['its-a', 'Its a nice day. Its very good.'], ['there-their', 'There house is big. There children play.'],
  ['sp-before', 'I was sick ,so I stayed. Wait . Really ? www.example.com :) hello ; world'], ['sp-after', 'Yes,please come. Wait;no. Really?yes!'], ['dbl-space', 'Two  spaces   here.'], ['cap-start', 'hello there. this is a test! next one? e.g. like this. okay\nnew line here. 3. item.'],
  ['linker-comma', 'It was cold. However it was fine. In conclusion we agree. For example it works.'], ['redund', 'Please return back. Repeat again. The end result is a free gift. In my opinion I think so.'],
  ['upgrade', 'It is very important and a lot of people find out that very big problems go up. Nowadays this is very good.'], ['sample', rd('web/js/fixer.js').match(/const SAMPLE = '((?:[^'\\]|\\.)*)'/)[1].replace(/\\'/g, "'")],
  ['clean', 'The weather is nice today. We are going to the park to meet our friends.'], ['empty', ''], ['whitespace', '   \n  '], ['overlap', 'i am agree that he have a apple , but he do not like it'], ['unicode', 'I like café, it’s “good”,so I stay.  Ok?'],
  ['long-repeat', Array.from({ length: 60 }, () => 'a apple').join(' ')], ['cap-sva', 'He Have a car. SHE DO NOT LIKE IT. It Are big.'], ['upper-i', 'I AM HERE. i am here'],
];
function fixVectors() {
  const W = fixSource().W;
  return { _doc: 'LK_WRITE.check(text) of web/js/writecheck-rules.js on one text per rule (+ traps, overlap, unicode, empty, the page sample): issues [{s,e,type,reps,levels?,rule,title,why,lesson}] sorted by position; s/e are UTF-16 offsets. fixes = what the "Sửa nhanh" button does (safe = one replacement and not style, applied from the end).',
    cases: FIX_CASES.map(([id, text]) => {
      const issues = clone(W.check(text)).map(x => { const o = { s: x.s, e: x.e, type: x.type, reps: x.reps, rule: x.rule, title: x.title, why: x.why, lesson: x.lesson }; if (x.levels) o.levels = x.levels; return o; });
      let fixed = text; issues.filter(x => x.reps.length === 1 && x.type !== 'style').sort((a, b) => b.s - a.s).forEach(x => { fixed = fixed.slice(0, x.s) + x.reps[0] + fixed.slice(x.e); });
      return { id, text, issues, fixed };
    }) };
}

// ================================================================== #/quick + #/style ==================================================================
function styleSource() {
  const q = rd('web/js/quick.js'), a = q.indexOf('routes.style = function'), body = q.slice(a);
  const styles = sliceLit(body, 'STYLES', '\n    };'), questions = sliceLit(body, 'QUESTIONS', '\n    ];');
  return { styles, questions };
}
async function styleVectors(S) {
  // the real route, driven by picks: the winner is the style shown in the result (ties → the most recent pick among the leaders)
  const runs = [['natural-all', [0, 0, 0, 0, 0, 0]], ['precision-all', [1, 1, 1, 1, 1, 1]], ['pragmatic-all', [2, 2, 2, 2, 2, 2]], ['curious-all', [3, 3, 3, 3, 3, 3]],
    ['tie-last-wins', [0, 0, 0, 1, 1, 1]], ['tie-three-way', [0, 1, 2, 0, 1, 2]], ['tie-four-way', [0, 1, 2, 3, 0, 1]], ['mixed-majority', [1, 1, 2, 1, 3, 0]], ['curious-late', [0, 1, 3, 3, 2, 3]]];
  const out = [];
  for (const [id, picks] of runs) {
    const P = await mk({ hash: '#/style', files: ['web/js/quick.js'], game: { xp: 1, days: {}, total: {} } }); P.sb.t = RT; P.sb.UI.glyph = x => x;
    let cur = []; P.E.dom.resolveList('#styOpts .sty-opt', () => (cur = [...P.view.innerHTML.matchAll(/data-style="(\w+)"/g)].map(m => ({ dataset: { style: m[1] }, classList: { add() {} }, onclick: null }))));
    P.routes.style(); await settle();
    const seen = [];
    for (const k of picks) {
      const h = P.view.innerHTML; seen.push(unesc(/<h1 class="sty-q" id="styQ">(.*?)<\/h1>/.exec(h)[1]));
      const btns = [...h.matchAll(/<button type="button" class="sty-opt" data-style="(\w+)">/g)].map(m => m[1]);
      const sty = btns[k]; if (!sty) throw new Error('style vector ' + id);
      await cur[k].onclick(); await new Promise(r => setTimeout(r, 300)); await settle();
    }
    const h = P.view.innerHTML, win = /<h1 class="sty-badge">(.*?)<\/h1>/.exec(h)[1].replace(/^\S+ /, '');
    const winner = Object.values(S.styles).find(s => unesc(win) === s.name || unesc(win) === tk(s.name).k).id;
    out.push({ id, picks, winner, saved: P.writes.filter(w => w.store === 'settings').map(w => ({ key: w.key, id: w.value.id })), links: [...h.matchAll(/<li><a href="(.*?)">/g)].map(m => m[1]) });
  }
  return { _doc: 'The real routes.style of web/js/quick.js driven by option picks (index into the 4 options of each of the 6 questions): winner = the style of the result card; settings.englishStyle = {id, date} is written once at the end. Ties go to the most recent pick among the leaders.', cases: out };
}

// ================================================================== #/confidence ==================================================================
function confData() {
  const sb = {}; sb.window = sb; sb.self = sb; vm.createContext(sb); vm.runInContext(rd('web/js/confidence/data.js'), sb); return clone(sb.CONF);
}
function confVectors(C) {
  const src = rd('web/js/confidence.js');
  const env = { Math, Date, String, Array, Set, RegExp, Number, Object, JSON };
  const pure = vm.runInNewContext(`(function(){ ${sliceFn(src, 'const norm = ', 'const unitOf')} ${sliceFn(src, 'const scoreOf = ', 'const spark = ')} ${sliceFn(src, 'const spark = ', '// ---------- Trang tổng quan').replace(/const spark[\s\S]*?\n  };\n/, '')}
    return { norm, toks, scoreOf }; })()`, env);
  const FILL = /\b(um+|uh+|er+|erm|ah+|you know|i mean|like)\b/gi;
  const metrics = [{ secs: 120, wpm: 120, pausesPerMin: 1, phrases: 2 }, { secs: 30, wpm: 60, pausesPerMin: 4, phrases: 0 }, { secs: 120, wpm: 200, pausesPerMin: 0, phrases: 5 }, { secs: 5, wpm: 0, pausesPerMin: 0, phrases: 0 }, { secs: 60, wpm: 90, pausesPerMin: 2, phrases: 1 }, { secs: 90, wpm: 160, pausesPerMin: 10, phrases: 4 }, { secs: 120, wpm: 300, pausesPerMin: 3, phrases: 1 }];
  const score = []; for (const m of metrics) for (const self of [null, 1, 3, 5]) score.push({ m, self, out: pure.scoreOf(m, self) });
  const normCases = ['Nice to meet you.', "How's it going?", '  I’m  FINE!! ', 'café au lait', 'It’s 5 o’clock…', '', 'Hello,world'].map(s => ({ in: s, norm: pure.norm(s), toks: pure.toks(s) }));
  const fillers = ['Um, I think, you know, like, it was uh fine', 'I like it', 'ERR erm AH well I mean so'].map(s => ({ in: s, n: (s.match(FILL) || []).length }));
  const allPh = [...C.units.flatMap(u => u.phrases.map(p => p.say)), ...C.toolkit.flatMap(g => g.phrases.map(p => p.say))].map(s => pure.norm(s.split('…')[0])).filter(s => s.split(' ').length >= 2);
  const said = ['Hi, nice to meet you. How is it going? Pretty good, thanks.', 'no phrases here at all', C.units[0].dialogue.lines.map(l => l[1]).join(' ')];
  const used = said.map(s => { const ns = ` ${pure.norm(s)} `; return { said: s, used: [...new Set(allPh.filter(p => ns.includes(` ${p} `)))] }; });
  const days = ['2026-01-05', '2026-01-04', '2026-01-03', '2026-01-01'];
  const streak = [[[]], [['2026-01-05']], [['2026-01-04', '2026-01-03']], [['2026-01-05', '2026-01-04', '2026-01-03']], [['2026-01-01']]].map(([ds]) => ({ days: ds, today: '2026-01-05', out: (() => { const set = new Set(ds); let n = 0; const d = new Date(Date.UTC(2026, 0, 5)); if (!set.has('2026-01-05')) d.setUTCDate(d.getUTCDate() - 1); for (;;) { const k = d.toISOString().slice(0, 10); if (!set.has(k)) break; n++; d.setUTCDate(d.getUTCDate() - 1); } return n; })() }));
  void days;
  // gap blanking of the "fill the blank" step + the per-word feedback of the shadowing step
  const blank = C.units.flatMap(u => u.phrases.filter(p => p.gap).slice(0, 2).map(p => ({ say: p.say, gap: p.gap, out: p.say.replace(new RegExp('\\b' + p.gap.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i'), '___') }))).slice(0, 12);
  const shadow = [['Nice to meet you.', 'nice to meet you'], ["How's it going?", 'how is it going'], ['Pretty good, thanks. How about you?', 'pretty good how about you']].map(([say, heard]) => ({ say, heard, marks: say.split(/\s+/).map(w => { const n = pure.norm(w); return n ? new Set(pure.toks(heard)).has(n) ? 'y' : 'n' : '' ; }) }));
  const rpLevel = ['A1', 'A2', 'B1', 'B2', 'C1'].map(l => { const b2 = l === 'B2'; return { level: l, L: b2 ? 2 : ({ A1: 0, A2: 1, B1: 2 }[l] ?? 0), lv: b2 ? ['A2', 'B1', 'B2'] : ['A1', 'A2', 'B1'] }; });
  const dailyIdx = [0, 1, 19900, 20458, 20459].map(n => ({ epochDay: n, idx: n % C.daily.length }));
  return { _doc: 'Pure functions of web/js/confidence.js read from the source (the page code is DOM-heavy): scoreOf (confidence score 0–100), norm/toks, fillers (FILLERS regex), phrases used (allPhrases + " norm ")…, streakDays (the date is a PARAMETER here), the fill-in-the-blank mask, per-word shadowing marks (y = heard, n = missed, "" = no word), rpLevel, daily question index = epochDay % daily.length with epochDay = floor((now − tzOffset·60000) / 864e5). Stored in localStorage "vb.conf" = {done:{unitId:{at,sh,rp}}, daily:[{d,at,score,wpm,pauses,fillers,phrases,self,secs}] (≤ 30)}; unit done → App.reward({spoken, xp:15}) first time (5 when the role-play already paid), daily → App.reward({spoken:1, xp:10}) once a day, cards: App.addWord({word:say, vi, def:meanEn, ex:say, pos:"phrase", emoji, topic:"confidence"}, {text:say, title:"Speak with confidence: <titleEn>"}, {silent:true}).',
    score, norm: normCases, fillers, used, streak, blank, shadow, rpLevel, dailyIdx, levels: ['A1', 'A2', 'B1', 'B2'], dailySeconds: 120, pauseGapMs: 1200,
    counts: { units: C.units.length, toolkit: C.toolkit.length, daily: C.daily.length, phrases: allPh.length } };
}

// ================================================================== #/method ==================================================================
const parseMethod = html => {
  const A = (re, s = html) => [...s.matchAll(re)];
  const loopHtml = html.slice(html.indexOf('<div class="mloop">'), html.indexOf('<div class="grid g2"'));
  const loop = A(/<a class="mstep (done)?" href="(.*?)"><span class="mnum">(.*?)<\/span><span class="mem">.*?<\/span><b>(.*?)<\/b><small>(.*?)<\/small><i>(.*?)<\/i><\/a>/g, loopHtml).map(m => ({ done: !!m[1], href: m[2], title: tk(m[4]), sub: tk(m[5]), why: tk(m[6]) }));
  const strandsHtml = html.slice(html.indexOf('<div class="mstrand">'), html.indexOf('</div>', html.indexOf('<div class="example-box small"', html.indexOf('<div class="mstrand">'))) + 6);
  const strands = A(/<div class="mstrand"><span class="mse">.*?<\/span><div class="grow"><div class="row between nowrap"><b class="small">(.*?)<\/b><span class="tiny muted">(\d+)%<\/span><\/div><div class="progress"><i style="width:\d+%;background:(.*?)"><\/i><\/div><div class="tiny muted">(.*?)<\/div>/g, strandsHtml).map(m => ({ title: tk(m[1]), pct: +m[2], weak: m[3] === '#f59e0b', sub: tk(m[4].replace(/<a .*$/, '')) }));
  const planName = tk(/<h2 style="margin:0">.*? (Lộ trình gợi ý: \{name\}⟦.*?⟧)<\/h2>/.exec(html)[1]);
  const plan = A(/<a class="mpi" href="(.*?)"><b>(\d+)′<\/b><span>(.*?)<\/span><\/a>/g).map(m => ({ href: m[1], min: +m[2], label: tk(m[3]) }));
  const mstats = A(/<div><b>(.*?)<\/b><span>(.*?)<\/span><\/div>/g, html.slice(html.indexOf('<div class="mstats">'), html.indexOf('</div></div>', html.indexOf('<div class="mstats">')) + 12)).map(m => ({ v: m[1], label: tk(m[2]) }));
  const prin = A(/<div class="card mprin">[\s\S]*?<h3 style="margin:0">(.*?)<\/h3><div class="tiny muted">(.*?)<\/div><\/div><\/div>\s*<p class="small" style="margin:\.6rem 0">(.*?)<\/p>\s*<div class="example-box small"[^>]*><b>.*?<\/b> (.*?)<\/div>\s*<div class="row between"[^>]*><span class="chip">.*? (.*?)<\/span><div class="row">(.*?)<\/div><\/div>/g).map(m => ({ title: tk(m[1]), who: tk(m[2]), idea: tk(m[3]), how: tk(m[4]), stat: tk(m[5]), links: A(/<a class="btn sm (?:ghost)?" href="(.*?)">(.*?) →<\/a>/g, m[6]).map(l => ({ href: l[1], label: tk(l[2]) })) }));
  const faq = A(/<details><summary><b>(.*?)<\/b><\/summary><p class="small">([\s\S]*?)<\/p><\/details>/g).map(m => ({ q: tk(m[1]), a: tk(m[2]) }));
  const weakest = /Mạch đang thiếu: <b>\{name\}<\/b>\.⟦(.*?)⟧/.exec(html);
  const hero = tk(/<span class="chip" style="background:rgba\(255,255,255,\.2\);color:#fff">(.*?)<\/span>/.exec(html)[1]);
  const cta = /Mạch đang thiếu[\s\S]*?<a href="(.*?)">(.*?) →<\/a>/.exec(html);
  return { loop, loopDone: hero.v.done, strands, plan, planName, mstats, prin, faq, weakest: weakest ? tk('x⟦' + unesc(weakest[1]) + '⟧').v.name : null, cta: cta ? { href: cta[1], label: tk(cta[2]) } : null };
};
const DAYMS = 864e5;
async function methodRun(o) {
  const day = k => new Date(NOW - k * DAYMS).toISOString().slice(0, 10);
  const days = {}; for (const [k, v] of Object.entries(o.days || {})) days[day(+k)] = v;
  const cards = {}; for (const c of o.cards || []) cards[c.word] = { word: c.word, srs: c.srs, contexts: c.contexts || [] };
  const P = await mk({ hash: '#/method', files: ['web/js/method.js'], settings: o.settings || {}, cards, game: { xp: o.xp ?? 100, days, total: {}, readDone: o.readDone || {}, listenDone: o.listenDone || {}, grammarDone: o.grammarDone || {}, pronDone: o.pronDone || {}, ...(o.game || {}) } });
  P.sb.t = RT; P.sb.Date.now = () => NOW;
  if (o.essays) await P.E.Core.Store.set('essays', o.essays);
  if (o.mistakes) await P.E.Core.Store.set('mistakes', o.mistakes);
  P.sb.READINGS = o.readings || [{ id: 'r1' }, { id: 'r2' }, { id: 'r3' }]; P.sb.LISTENING = o.listening || [{ id: 'l1' }, { id: 'l2' }];
  P.sb.GRAMMAR = o.grammar || [{ id: 'g1' }, { id: 'g2' }]; P.sb.WRITE_PROMPTS = o.prompts || [{ id: 'p1' }, { id: 'p2' }, { id: 'p3' }];
  await P.routes.method(); await settle(60);
  return parseMethod(P.view.innerHTML);
}
async function methodVectors() {
  const srs = (last, S, reps = 3, due = NOW - 1) => ({ last, S, reps, interval: S, due });
  const cards = [{ word: 'alpha', srs: srs(NOW - 2 * DAYMS, 3) }, { word: 'beta', srs: srs(NOW - 10 * DAYMS, 8) }, { word: 'gamma phrase', srs: srs(NOW - 1 * DAYMS, 2, 1, NOW + 5 * DAYMS), contexts: [{ title: 'Câu của tôi', at: NOW - DAYMS, text: 'x' }] }, { word: 'delta', srs: srs(NOW - 30 * DAYMS, 5, 4), contexts: [{ title: 'Reading', text: 'y' }] }, { word: 'eps', srs: { last: NOW - DAYMS, reps: 0, S: 1, interval: 0, due: NOW } }];
  const cases = [
    ['empty', 'no cards, no activity: loop 1 done (nothing due … but 0 reviews ⇒ not done), strands all 0, no weakest, plan s1', {}],
    ['busy-day', 'activity today + a week of history: loop done flags, strand shares, weakest strand, memory stats', { cards, days: { 0: { readings: 1, newWords: 6, grammar: 1, spoken: 6, writes: 1 }, 1: { listens: 2, matches: 1 }, 3: { readings: 2, dictations: 1, grammar: 2, pron: 1 }, 6: { writes: 1, spoken: 3 } }, readDone: { r1: 1 }, listenDone: { l1: 1 }, grammarDone: { g1: 90 }, pronDone: { p: 1 }, essays: [{ prompt: 'p1', words: 200 }], mistakes: [{ fixed: false }, { fixed: true }], game: { stats: undefined } }],
    ['stage-s0', 'placement stage s0 ⇒ the "Nền tảng" plan (4 items, 35 min)', { settings: { placement: { stage: 's0', band: '4.0' } } }],
    ['stage-s2', 'stage s2 ⇒ "Bứt phá" (first item is the untranslated "Flashcard AWL")', { settings: { placement: { stage: 's2', band: '6.0' } } }],
    ['stage-s3', 'stage s3 ⇒ "Về đích"', { settings: { placement: { stage: 's3', band: '7.0' } } }],
    ['all-next-done', 'every reading / listening / grammar item done ⇒ links fall back to the list pages', { readDone: { r1: 1, r2: 1, r3: 1 }, listenDone: { l1: 1, l2: 1 }, grammarDone: { g1: 80, g2: 90 } }],
  ];
  const out = [];
  for (const [id, why, o] of cases) {
    const r = await methodRun(o);
    out.push({ id, why, input: { ...o, cards: o.cards ? o.cards.map(c => ({ word: c.word, srs: c.srs, ctx: (c.contexts || []).map(x => x.title) })) : [] }, out: r });
  }
  return { _doc: 'The real routes.method of web/js/method.js (now fixed at 2026-01-05 09:00 UTC; days keys = N days ago): loop (6 steps: done flag, href, sub key+vars, why), loopDone, strands (7-day share %, weak = the amber bar, sub), weakest strand, plan (name + items), memory stats (cards remembered / average retrievability / due / learning), the 12 principles (title, who, idea, how, stat key+vars, links) and the FAQ. State inputs are small stand-ins: READINGS 3, LISTENING 2, GRAMMAR 2, WRITE_PROMPTS 3.', cases: out };
}
async function methodContent() {
  const r = await methodRun({}); // static texts
  const plans = {}; for (const st of ['s0', 's1', 's2', 's3']) { const x = await methodRun({ settings: { placement: { stage: st, band: '5' } } }); plans[st] = { name: x.planName, items: x.plan }; }
  return { loop: r.loop.map(l => ({ href: l.href, title: l.title, why: l.why })), principles: r.prin.map(p => ({ title: p.title, who: p.who, idea: p.idea, how: p.how, links: p.links })), faq: r.faq, plans,
    icons: { loop: ['layers', 'headphones', 'pin', 'ruler', 'message-circle', 'book-x'] } };
}

// ================================================================== #/grammar ==================================================================
const GRAMMAR_FILES = ['tenses', 'verbs', 'sentences', 'foundation', 'starter', 'academic', 'chapters', 'book2', 'drills-a', 'drills-b', 'drills-c', 'drills-own', 'bank-gen', 'check'];
function grammarSource() {
  const sb = { console }; sb.window = sb; sb.self = sb; vm.createContext(sb);
  for (const f of GRAMMAR_FILES) vm.runInContext(rd(f === 'drills-own' ? 'web/cpack/grammar/drills-own.js' : `web/js/grammar/${f}.js`), sb, { filename: f });
  const l1 = {}; for (const f of fs.readdirSync(path.join(ROOT, 'web/js/grammar/l1')).filter(x => x.endsWith('.js')).sort()) { sb.GRAMMAR_L1 = undefined; vm.runInContext(rd('web/js/grammar/l1/' + f), sb); l1[sb.GRAMMAR_L1.lang] = sb.GRAMMAR_L1; }
  const gs = rd('web/js/grammar.js');
  const units = sliceLit(gs, 'UNITS', '\n  ];'), chapters = sliceLit(gs, 'CHAPTERS', '\n  ];'), fb = sliceLit(gs, 'UNIT_FALLBACK', ' };');
  const FOCUS = (() => { const a = gs.indexOf('const FOCUS = {'), b = gs.indexOf('\n    };', a); return vm.runInNewContext('(' + gs.slice(a + 'const FOCUS = '.length, b + 6) + ')'.replace('\n    }', '}')).valueOf; })();
  return { G: clone(sb.GRAMMAR), check: clone(sb.GRAMMAR_CHECK), l1: clone(l1), units, chapters, fallback: fb, gs };
}
function grammarFocus(gs) { const a = gs.indexOf('const FOCUS = {'), b = gs.indexOf('\n    };', a); const o = vm.runInNewContext('(' + gs.slice(a + 'const FOCUS = '.length, b + 6) + ')'); return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, Array.isArray(v) ? v : []])); }
const lessonIndex = x => ({ id: x.id, unit: x.unit, order: x.order, title: x.title, en: x.en, level: x.level, emoji: x.emoji, summary: x.summary });
const STARTER_IDS = ['present-simple', 'articles', 'passive-voice'];
export const GRAMMAR_PACK_PATH = 'web/data/grammar-pack.json', GRAMMAR_PACK_URL = 'https://lexkite.com/data/grammar-pack.json', GRAMMAR_STARTER_PATH = 'native/shared/gen/content-pack/grammar-starter.json';
export async function grammarPack() {
  const S = grammarSource(), focus = grammarFocus(S.gs);
  const body = { schema: 1, units: S.units, chapters: S.chapters, fallback: S.fallback, focus, index: S.G.map(lessonIndex), lessons: S.G, check: S.check, l1: S.l1 };
  const v = crypto.createHash('sha256').update(JSON.stringify(body)).digest('hex').slice(0, 12);
  return JSON.stringify({ _doc: 'GENERATED by scripts/native/gen-learn.mjs (node scripts/native/gen.mjs) – do not edit by hand. Download pack of #/grammar: lessons = window.GRAMMAR of web/js/grammar/*.js (+ cpack drills-own), check = GRAMMAR_CHECK (self-made-sentence regexes, flags "iu"), l1 = GRAMMAR_L1 of the 14 UI languages, units/chapters/fallback/focus = the page tables of web/js/grammar.js. Served as https://lexkite.com/data/grammar-pack.json.', v, ...body });
}
export async function grammarStarter() {
  const S = grammarSource(), focus = grammarFocus(S.gs);
  return JSON.stringify({ _doc: 'GENERATED by scripts/native/gen-learn.mjs – the offline start of #/grammar: the page tables + the index of every lesson + three full lessons; the rest comes from grammar-pack.json.', schema: 1, units: S.units, chapters: S.chapters, fallback: S.fallback, focus, index: S.G.map(lessonIndex), lessons: S.G.filter(x => STARTER_IDS.includes(x.id)), check: Object.fromEntries(Object.entries(S.check).filter(([k]) => STARTER_IDS.includes(k))), l1: {} });
}
/** the pure helpers of grammar.js (answer matching, normalisation) cut out of the source and run as they are */
function grammarFns() {
  const gs = rd('web/js/grammar.js');
  const code = sliceFn(gs, 'const dnorm = ', 'const drillsOf');
  return vm.runInNewContext(`(function(){ ${code}\n return { dnorm, dnorm2, variants, matchAnswer }; })()`, { String, RegExp, Math });
}
async function grammarVectors() {
  const S = grammarSource(), F = grammarFns();
  const ans = [['go', ['go']], ['Goes', ['goes']], ["I'd go", ['I would go']], ["it's done", ['it is done', 'it has done']], ['2,000', ['2000']], ['three-fold', ['threefold']], ['realise', ['realize']], ['10 percent', ['10%']], ["won't", ['will not']], ["can't", ['cannot']], ["she's gone", ['she has gone']], ['I am here.', ['I am here']], ['wrong', ['right']], ['  spaced   out  ', ['spaced out']], ['colour', ['color']], ["they're", ['they are']]];
  const dn = ['Hello, World!', "Don't stop", 'a-b c', '1,234 per cent', 'organization'];
  const own = []; for (const [id, [src, formula]] of Object.entries(S.check).slice(0, 12)) { const re = new RegExp(src, 'iu'); const L = S.G.find(x => x.id === id), exs = L ? L.blocks.flatMap(b => b.type === 'formula' ? b.rows.map(r => r.ex) : b.type === 'uses' ? b.items.map(i => i.ex) : []).filter(Boolean).map(x => x.replace(/\[\[|\]\]/g, '')) : [], good = exs.find(x => re.test(x)) || exs[0] || 'We should have been going home early.'; const m = good.match(re); own.push({ id, src, sentence: good, hit: m ? m[0] : '' }); }
  // chapter / lesson ordering of the hub page
  const byId = Object.fromEntries(S.G.map(x => [x.id, x]));
  const chapterOf = id => { const c = S.chapters.find(c => c.ids.includes(id)); if (c) return c; const l = byId[id]; return S.chapters.find(c => c.n === S.fallback[l && l.unit]) || S.chapters[6]; };
  const lessonsOf = c => { const listed = c.ids.map(id => byId[id]).filter(Boolean); const extra = S.G.filter(x => !S.chapters.some(cc => cc.ids.includes(x.id)) && chapterOf(x.id) === c); return [...listed, ...extra]; };
  const order = S.chapters.flatMap(c => lessonsOf(c).map(x => ({ id: x.id, chapter: c.n })));
  const missing = S.chapters.flatMap(c => c.ids.filter(id => !byId[id]));
  const quizShape = S.G.map(x => ({ id: x.id, quiz: x.quiz.length, drills: (x.drills || []).length, blocks: x.blocks.map(b => b.type) }));
  return { _doc: 'web/js/grammar.js: matchAnswer(given, answers) (contractions, 2,000 = 2000, -ize/-ise, per cent = %, hyphens) cut from the source; dnorm2; GRAMMAR_CHECK self-made-sentence regexes (flags iu); order = every lesson in hub order (chapters → listed ids → extras) with its chapter; missingListed = chapter ids without a lesson (must be empty or the hub skips them); shape = per lesson counts + block types.',
    answers: ans.map(([given, answers]) => ({ given, answers, ok: F.matchAnswer(given, answers) })), dnorm2: dn.map(s => ({ in: s, out: F.dnorm2(s) })), own, order, missingListed: missing, shape: quizShape,
    counts: { lessons: S.G.length, units: S.units.length, chapters: S.chapters.length, check: Object.keys(S.check).length, l1: Object.keys(S.l1) },
    reward: { quiz: { quizzes: 1, grammar: 1, perfectPer100: 1, xpBase: 10, xpPerRight: 3 }, drills: { quizzes: 1, grammar: 1, writes: 1, xpBase: 10, xpPerRight: 4 }, mix: { quizzes: 1, grammar: 1, xpBase: 10, xpPerRight: 2 }, own: { xp: 15 }, passPct: 80 } };
}

// ================================================================== assembly ==================================================================
export const LEARN_CONTENT_PATH = 'native/shared/gen/content-pack/learn-content.json';
export async function learnContent() {
  const F = fixSource(), St = styleSource(), C = confData(), M = await methodContent();
  const q = rd('web/js/quick.js');
  return JSON.stringify({ _doc: 'GENERATED by scripts/native/gen-learn.mjs – bundled content of #/fix (rule table + word tables of web/js/writecheck-rules.js), #/style (STYLES + QUESTIONS of web/js/quick.js), #/confidence (web/js/confidence/data.js) and #/method (texts of web/js/method.js). Vietnamese keys are translated by the app (strings.json); do not edit by hand.', schema: 1,
    fix: { types: F.types, sample: F.sample, maxLen: F.maxLen, rules: F.rules, spell: F.spell, upg: F.upg, v3: F.v3, base: F.base, useRule: F.useRule, useScan: F.useScan },
    style: St, conf: C, method: M, quick: { limit: +/const LIMIT = (\d+), N = (\d+)/.exec(q)[1], n: +/const LIMIT = (\d+), N = (\d+)/.exec(q)[2] } });
}
export async function learnVectors() {
  process.env.TZ = 'UTC';
  const C = confData(), S = styleSource();
  const out = { _doc: 'GENERATED by scripts/native/gen-learn.mjs – see docs/specs/native-m4-write.md (P09 part 2). Top level: fix (LK_WRITE.check cases) · style · conf · method · grammar · quick. Reference = the real web code.' };
  out.fix = fixVectors(); out.style = await styleVectors(S); out.conf = confVectors(C); out.method = await methodVectors(); out.grammar = await grammarVectors();
  out.quick = { _doc: 'web/js/quick.js #/quick: 15 s for N = 4 questions of 3 options (one right, two distractors with a clearly different meaning); the pool = due cards (due ≤ now + 1 day) if ≥ 4, else all cards if ≥ 4, else the word library; fewer than 3 pool words or 3 other words ⇒ the "Chưa có đủ từ vựng" card. Feedback holds 320 ms (right) / 900 ms (wrong) and that time is NOT counted in the 15 s. End: xp = 2 × right ⇒ App.reward({xp}); pct ≥ 75 = good; the headline is "Hết 15 giây!" when time ran out else "Hoàn thành trong {s} giây!" with s = clamp(1, 15, round(elapsed)). Praise: 100 % / ≥ 75 % / below.', limit: 15, n: 4, options: 3, holdRightMs: 320, holdWrongMs: 900, goodPct: 75, xpPerRight: 2, minPool: 3,
    cases: [[4, 4, false, 4], [3, 4, false, 7], [2, 4, true, 15], [0, 4, true, 15], [1, 3, false, 0]].map(([right, total, timedOut, elapsed]) => ({ right, total, timedOut, elapsed, pct: Math.round(right / total * 100), good: Math.round(right / total * 100) >= 75, xp: right * 2, secs: Math.min(15, Math.max(1, Math.round(elapsed))) })) };
  return rigVectorText(out);
}
/** [{ key, area }] – the Vietnamese keys the part-2 screens pass to t() (page code + data), area = string-id group */
export async function learnStringKeys() {
  const out = new Map(), add = (key, area) => { if (key && typeof key === 'string' && !out.has(key)) out.set(key, area); };
  const RE = [/\bt\('((?:[^'\\]|\\.)*)'/g, /\bt\("((?:[^"\\]|\\.)*)"/g, /\bt\(`((?:[^`\\$]|\\.)*)`/g];
  const scan = (src, area) => { for (const ln of src.split('\n')) for (const re of RE) for (const m of ln.matchAll(re)) add(m[1].replace(/\\(['"\\])/g, '$1'), area); };
  const fx = rd('web/js/fixer.js'), qk = rd('web/js/quick.js'), gs = rd('web/js/grammar.js'), cf = rd('web/js/confidence.js'), md = rd('web/js/method.js');
  scan(fx, 'fix'); scan(qk.slice(0, qk.indexOf('routes.style = function')), 'quick'); scan(qk.slice(qk.indexOf('routes.style = function')), 'style'); scan(gs, 'grammar'); scan(cf, 'conf'); scan(md, 'method');
  const F = fixSource(); for (const r of F.rules) { add(r.title, 'fix'); add(r.why, 'fix'); } for (const [, n] of F.types) add(n, 'fix');
  const St = styleSource(); for (const s of Object.values(St.styles)) { add(s.name, 'style'); add(s.desc, 'style'); for (const [, txt] of s.recs) add(txt.replace(/^\S+ /, ''), 'style'); }
  for (const q of St.questions) { add(q.q, 'style'); for (const o of q.opts) add(o.text, 'style'); }
  const S = grammarSource(); for (const c of S.chapters) { add(c.name, 'grammar'); add(c.desc, 'grammar'); }
  const C = confData(); const walkC = (o, k) => { if (typeof o === 'string') { if (/^(title|goal|mean|why|intro)$/.test(k) && /[À-ỹ]/.test(o)) add(o, 'conf'); } else if (Array.isArray(o)) o.forEach(x => walkC(x, k)); else if (o && typeof o === 'object') for (const [a, b] of Object.entries(o)) walkC(b, a); }; walkC(C, '');
  const M = await methodContent(); const walkM = (o) => { if (o && typeof o === 'object') { if (typeof o.k === 'string' && Object.keys(o).every(x => x === 'k' || x === 'v')) { if (/[À-ỹ]/.test(o.k)) add(o.k, 'method'); } else for (const v of Object.values(o)) walkM(v); } }; walkM(M);
  const V = JSON.parse(rd('native/shared/gen/vectors/learn.json')); const walkV = o => { if (o && typeof o === 'object') { if (typeof o.k === 'string' && Object.keys(o).every(x => x === 'k' || x === 'v')) { if (/[À-ỹ]/.test(o.k)) add(o.k, 'method'); } else for (const v of Object.values(o)) walkV(v); } }; try { walkV(V); } catch (e) { void e; }
  return [...out].filter(([k]) => /[À-ỹ]|[A-Za-z]/.test(k)).map(([key, area]) => ({ key, area }));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const t0 = Date.now();
  const v = await learnVectors(); console.log('learn.json', Buffer.byteLength(v), 'bytes'); console.log('learn-content', Buffer.byteLength(await learnContent()), 'bytes');
  console.log('grammar-pack', Buffer.byteLength(await grammarPack()), 'bytes', 'starter', Buffer.byteLength(await grammarStarter()), 'bytes', Date.now() - t0, 'ms');
}
