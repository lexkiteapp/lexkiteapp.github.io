/* Native M4 – "Writing & grammar" conformance vectors (parity P09: #/write #/task1 #/qstats #/criteria).
 * Reference = the REAL web code, never re-implemented: web/js/write.js (Phòng viết: report + saves), web/js/task1.js (App.task1.score + the Task 1 page), web/js/lexis.js (Lexis.analyze),
 * web/js/qtips.js (#/qstats) and web/js/criteria.js (App.Criteria.DATA) run in node:vm on the RECORDING DOM of gen-skills.mjs (`mk`). Clock, timers and the AI helper are PLATFORM inputs.
 * Vectors keep DATA (numbers, keys, writes, rewards), never HTML. t() keeps the Vietnamese KEY ("key⟦{vars}⟧", parse with tk()) exactly as the web passes it. Determinism: TZ=UTC, clock = skills.now.
 * Exports writeVectors() → text of vectors/write.json, writePack() → web/data/write-pack.json, writeStringKeys(). Spec: docs/specs/native-m4-vectors.md (P09). */
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
/** "key⟦{vars}⟧" → { k, v? } (string vars are unescaped; a var that is itself a t() result is parsed again) */
const tk = str => {
  const m = /^([\s\S]*?)⟦([\s\S]*)⟧$/.exec(String(str)); if (!m) return { k: unesc(String(str)) };
  const v = JSON.parse(m[2]); for (const [a, b] of Object.entries(v)) if (typeof b === 'string') { const u = unesc(b); v[a] = /⟦/.test(u) ? tk(u) : u; }
  return { k: unesc(m[1]), v };
};
const round = n => Math.round(n * 1e9) / 1e9;
const FILES = ['web/js/lexis.js', 'web/js/qengine.js', 'web/js/qtips.js', 'web/cpack/write/task2-more.js', 'web/js/write.js', 'web/cpack/write/task1-more.js', 'web/js/write/task1-more2.js', 'web/js/task1.js', 'web/js/criteria.js'];
const NOW = Date.UTC(2026, 0, 5, 9, 0, 0);

/** the web page env with a t() that keeps keys, toast + reward recorders */
async function page(o = {}) {
  const toasts = [];
  const P = await mk({ hash: o.hash || '#/write', files: FILES.filter(f => fs.existsSync(path.join(ROOT, f))), game: o.game, ui: { toast: s => { toasts.push(tk(s)); } } });
  P.sb.t = RT; P.toasts = toasts; P.sb.Date.now = () => NOW;
  return P;
}
const list = (html, re) => [...html.matchAll(re)].map(m => m);
/** the <li> of the "Nhận xét" block → keys */
const notesOf = html => list(html.slice(html.indexOf('📌')), /<li style="margin:\.3rem 0">([\s\S]*?)<\/li>/g).map(m => tk(m[1]));
const ent = m => [...m.entries()].map(([k, v]) => [k, v]);
const sliceConst = (src, name) => { const a = src.indexOf(`const ${name} = `); let b = src.indexOf('\n  };', a); if (a < 0 || b < 0) throw new Error('const ' + name + ' not found'); return vm.runInNewContext('(' + src.slice(a + `const ${name} = `.length, b + 4) + ')'); };

/** the constants of write.js / task1.js / qtips.js that live in closures, read from their source literals (pack + vectors carry them; the apps never retype them) */
function statics() {
  const S = rd('web/js/write.js'), T = rd('web/js/task1.js'), Q = rd('web/js/qtips.js'), lit = re => vm.runInNewContext('(' + re.exec(Q)[1] + ')');
  return { write: { outline: sliceConst(S, 'OUTLINE'), trends: sliceConst(S, 'TRENDS'), connectors: vm.runInNewContext('[' + /\[('Firstly,'[^\]]*)\]\.map\(w =>/.exec(S)[1] + ']') },
    task1: { vocab: sliceConst(T, 'VOCAB') }, qstats: { skills: Object.entries(lit(/const SKILL = \(\) => \((\{[^\n]*\})\);/)).map(([id, v]) => [id, ...v]), rtype: lit(/const RT = (\{[^\n]*\});/) } };
}
/** Lexis.analyze reads two tables that live in closures: STOP (source literal) and IELTS_DATA.INDEX (the word library) – shipped as data */
async function lexisData() {
  const P = await page({ hash: '#/write' }), src = rd('web/js/lexis.js');
  return { stop: vm.runInNewContext(/const STOP = new Set\(('[^']*')\.split\(' '\)\)/.exec(src)[1] + '.split(" ")'), index: Object.keys(P.sb.IELTS_DATA.INDEX).sort() };
}

// ================================================================== #/write ==================================================================
async function writeVectors0(D) {
  const P = await page(), S = rd('web/js/write.js'), L = P.sb.Lexis;
  const { outline: OUT, trends: TR, connectors } = statics().write;
  const out = { static: {}, analyze: [], flow: [] };
  out.static = { _doc: 'Static page data of write.js (the constants live in closures, read from the source literal): outline per question type, task-2 trends, linking-word chips, clock + word limits.', outline: OUT, trends: TR, connectors,
    minWords: 250, minutes: +/let left = (\d+) \* 60/.exec(S)[1], warnBelowSeconds: +/el\.style\.color = left < (\d+)/.exec(S)[1], minToAnalyse: 40, savedKept: 20, savedShown: 6, topicWords: 14, draftSaveMs: 600, defaultPrompt: /\{ prompt: '(p\d+)', text: '' \}/.exec(S)[1],
    prompts: P.sb.WRITE_PROMPTS.length, promptIds: P.sb.WRITE_PROMPTS.map(p => p.id), types: [...new Set(P.sb.WRITE_PROMPTS.map(p => p.type))] };
  // ---- Lexis.analyze on real texts ----
  const W = D.writing.models, SP = D.speaking.models;
  const cases = [
    ['band-5-essay', 'the criteria page\'s band-5.0 model essay (short sentences, few academic words)', W['5.0'].essay],
    ['band-6.5-essay', 'band-6.5 model essay', W['6.5'].essay],
    ['band-8-essay', 'band-8.0 model essay (AWL density, linking words, collocations)', W['8.0'].essay],
    ['speaking-8', 'a speaking transcript analysed as text (no paragraphs, spoken style)', SP['8.0'].transcript],
    ['repeat', 'a word used ≥ 4 times that is not AWL/linking ⇒ overused (important ×5, people ×4)', 'People say that technology is important for people. It is important to learn and it is important to work. Many people think that school is important. Some people like to travel and people like to eat good food in many places around the world.'],
    ['short-150', 'under 150 words ⇒ band capped at 5', W['6.5'].essay.split(/\s+/).slice(0, 100).join(' ')],
    ['mid-200', '150–249 words ⇒ band capped at 6', W['8.0'].essay.split(/\s+/).slice(0, 200).join(' ')],
    ['long-sentences', 'average sentence length > 30 words ⇒ tip "tách bớt"', 'Although many people believe that the government should invest a significant amount of money in public transport because it reduces pollution and congestion in large cities, others argue that individuals should be responsible for their own choices and that the money would be better spent on schools and hospitals where the need is greater and the benefits are easier to measure over a long period of time in every part of the country.'.repeat(2)],
    ['even-lengths', 'equal sentence lengths (sd < 4, > 4 sentences) ⇒ tip "độ dài khá giống nhau"', 'The city is very big. The park is very nice. The road is very long. The shop is very busy. The bus is very slow. The book is very good. The test is very hard. The day is very warm. The room is very cold.'],
  ];
  for (const [id, why, text] of cases) {
    const a = clone({ ...L.analyze(text), awl: ent(L.analyze(text).awl), link: ent(L.analyze(text).link), topics: ent(L.analyze(text).topics), phrases: ent(L.analyze(text).phrases), lens: undefined });
    for (const k of ['diversity', 'avg', 'sd', 'awlRatio']) a[k] = round(a[k]);
    const Q = await page(); await Q.routes.write(); await settle(); Q.$('#essay').value = text; await Q.$('#analyze').onclick(); await settle(60);
    const html = Q.$('#report').innerHTML, stats = list(html, /<div class="card stat"[^>]*><div><b>(.*?)<\/b><span class="tiny muted">(.*?)<\/span>/g).map(m => ({ n: m[1], label: tk(m[2]) })), ring = /--p:([0-9.]+);--c:var\(--(\w+)\)/.exec(html);
    out.analyze.push({ id, why, input: { text }, out: { ...a, ringPct: ring ? round(+ring[1]) : null, ringColor: ring ? ring[2] : null, stats, tips: notesOf(html), reported: !!html, toast: Q.toasts, writes: Q.writes.filter(w => w.store === 'store').map(w => ({ key: w.key, value: w.value })), rewards: Q.calls.rewards } });
  }
  out.analyze.push(await (async () => { // too short: nothing is reported, nothing saved, a toast says why
    const Q = await page(); await Q.routes.write(); await settle(); Q.$('#essay').value = 'Technology is important for modern education and daily life today.'; await Q.$('#analyze').onclick(); await settle(40);
    return { id: 'too-short', why: 'fewer than 40 words ⇒ toast "Hãy viết ít nhất vài đoạn…", no report, no save, no reward', input: { text: Q.$('#essay').value }, out: { reported: !!Q.$('#report').innerHTML, toast: Q.toasts, writes: Q.writes, rewards: Q.calls.rewards } };
  })());
  // ---- the page: draft, prompt choice, saved list ----
  const flow = async (id, why, setup) => { const Q = await page(setup.page || {}); const r = await setup.run(Q); out.flow.push({ id, why, input: setup.input, out: r }); };
  await flow('open-default', 'no argument and no draft ⇒ prompt p1; word counter starts at 0; the topic of the prompt gives the suggested words', { input: { arg: null, draft: null }, run: async Q => {
    await Q.routes.write(); await settle(); const h = Q.view.innerHTML;
    return { prompt: /<span class="chip lv">(.*?)<\/span>/.exec(h)[1], text: unesc(/<p style="font-size:1\.08rem;font-weight:600;margin:\.8rem 0 0">(.*?)<\/p>/.exec(h)[1]), modelLink: /href="#\/model\/(.*?)"/.exec(h)?.[1] || null, ideasLink: /href="#\/ideas\/(.*?)"/.exec(h)[1], words: tk(/<b id="wc">(.*?)<\/b>/.exec(h)[1]), clock: /id="clock"[^>]*>(.*?)<\/span>/.exec(h)[1],
      outlineKeys: list(h, /<li style="margin:\.25rem 0">(.*?)<\/li>/g).map(m => unesc(m[1])), outlineTitle: tk(/<b>🧭 (.*?)<\/b><\/summary>/.exec(h)[1]), saved: list(h, /data-open="(\d+)"/g).length }; } });
  await flow('open-arg', 'argument = prompt id (#/write/p3); an unknown id ⇒ p1', { input: { arg: 'p3', unknown: 'zz' }, run: async Q => {
    await Q.routes.write('p3'); await settle(); const a = /<span class="chip lv">(.*?)<\/span>/.exec(Q.view.innerHTML)[1];
    const R = await page(); await R.routes.write('zz'); await settle(); return { p3: a, unknown: /<span class="chip lv">(.*?)<\/span>/.exec(R.view.innerHTML)[1] }; } });
  await flow('draft-restored', 'a stored draft of the shown prompt fills the editor and the counter; a draft of ANOTHER prompt is ignored', { input: { draft: { prompt: 'p2', text: 'My draft text for the second prompt.' } }, run: async Q => {
    await Q.E.Core.Store.set('essayDraft', { prompt: 'p2', text: 'My draft text for the second prompt.' }); await Q.routes.write(); await settle(); const h = Q.view.innerHTML, t2 = /<textarea[^>]*>([\s\S]*?)<\/textarea>/.exec(h)[1];
    const R = await page(); await R.E.Core.Store.set('essayDraft', { prompt: 'p2', text: 'x y z' }); await R.routes.write('p1'); await settle(); return { arg_draft_prompt: t2, otherPromptEditor: /<textarea[^>]*>([\s\S]*?)<\/textarea>/.exec(R.view.innerHTML)[1], promptShown: /<span class="chip lv">(.*?)<\/span>/.exec(h)[1] }; } });
  await flow('autosave', 'typing saves { prompt, text } to Store "essayDraft" (600 ms after the last key)', { input: { text: 'Hello world essay text' }, run: async Q => {
    await Q.routes.write('p4'); await settle(); Q.$('#essay').value = 'Hello world essay text'; Q.$('#essay').oninput(); await settle(40); return { writes: Q.writes.filter(w => w.store === 'store').map(w => ({ key: w.key, value: w.value })), counter: tk(Q.$('#wc').textContent) }; } });
  await flow('saved-list', 'after a fresh analysis the text is the newest of "essays" (max 20, newest first); the list shows 6 with "Đề n · n từ · LR ~band"; "Mở" re-reports WITHOUT saving or rewarding', { input: { text: W['6.5'].essay }, run: async Q => {
    await Q.routes.write('p5'); await settle(); Q.$('#essay').value = W['6.5'].essay; await Q.$('#analyze').onclick(); await settle(60);
    const first = clone(Q.writes.filter(w => w.store === 'store' && w.key === 'essays').pop().value[0]); delete first.at;
    const R = await page(); const old = Array.from({ length: 22 }, (_, i) => ({ prompt: 'p' + (i + 1), text: 'old ' + i, words: 10 + i, band: 5.5, at: i })); await R.E.Core.Store.set('essays', old); await R.routes.write('p5'); await settle();
    const h = R.view.innerHTML, rows = list(h, /<span>(.*?) · (.*?)<\/span><span class="chip lv">LR ~(.*?)<\/span>/g).map(m => ({ title: tk(m[1]), words: tk(m[2]), band: m[3] }));
    R.$('#essay').value = W['5.0'].essay; await R.$('#analyze').onclick(); await settle(60);
    const kept = R.writes.filter(w => w.store === 'store' && w.key === 'essays').pop().value;
    return { saved: { prompt: first.prompt, words: first.words, band: first.band }, listedRows: rows, keptAfter: kept.length, newest: kept[0].prompt, shownCount: rows.length }; } });
  out.persist = { _doc: 'What #/write and #/task1 WRITE (web Store keys, per device in the app like letterDrafts): essays [{prompt,text,words,band,at}] (≤ 20, newest first) · essayDraft {prompt,text} · task1Drafts {setId: text}; rewards App.reward({quizzes:1, writes:1, xp:25}) (write) / ({quizzes:1, writes:1, xp:20}) (task1).' };
  return out;
}

// ================================================================== #/task1 ==================================================================
async function task1Vectors(D, wr) {
  const P = await page({ hash: '#/task1' }), T = P.app.task1, S = rd('web/js/task1.js'), VOCAB = statics().task1.vocab;
  const sets = clone(T.SETS), out = { static: { _doc: 'task1.js constants: the chart sets (data), vocabulary chips per type, clock + limits.', ids: sets.map(s => s.id), types: Object.fromEntries(sets.map(s => [s.id, s.type])), vocab: VOCAB,
    minWords: 150, minutes: +/let left = (\d+) \* 60/.exec(S)[1], warnBelowSeconds: +/el\.style\.color = left < (\d+)/.exec(S)[1], minToAnalyse: 30, rewardXp: 20 }, score: [], flow: [] };
  const ESS = wr.analyze.filter(c => /^band-/.test(c.id)).map(c => c.input.text);
  const GOOD = 'The line graph shows how the percentage of households in one European country that used three types of energy for heating changed between 1990 and 2020.\n\nOverall, gas remained the most common source for most of the period, but its share fell steadily, while renewable energy rose dramatically and almost caught up with it by 2020.\n\nIn 1990, gas accounted for 62% of homes, compared with 25% for electricity and just 3% for renewables. Over the following decade gas stayed stable at around 61%, whereas renewables doubled to 6%. From 2005 onwards, gas declined sharply to 35% in 2020, while renewables surged from 10% to 31%.\n\nElectricity fluctuated between 24% and 34% throughout the period and ended at 33%, which made it the second most popular source in the final year. By contrast, gas was the only source that fell, and it lost almost half of its share in thirty years. In addition, the figures for electricity were broadly similar in 2000 and 2010, at 27% and 33% respectively, which suggests that demand for this source was relatively stable compared with the other two sources shown in the graph over the same thirty-year period.';
  const txt = {
    good: GOOD,
    noOverview: GOOD.replace(/\n\n/g, ' ').replace(/Overall, /, '').replace(/ and 1990/, ' and 1990'),
    opinion: GOOD.replace('Overall, ', 'I think that overall, in my opinion, '),
    process: 'The diagram shows how used glass bottles are recycled into new bottles in a factory.\n\nOverall, the process consists of seven stages, beginning with the collection of used bottles and ending with new bottles being delivered to shops, so it is a continuous cycle.\n\nFirst, used bottles are collected from recycling bins and are transported to a sorting plant. There, the glass is sorted by colour and is cleaned. After that, it is crushed into small pieces, which are called cullet, and the cullet is melted in a furnace at about 1,500 degrees. Once the glass has been melted, it is poured into moulds and is shaped into new bottles. Finally, the bottles are cooled, are checked for faults and are delivered to shops, where they are filled and sold again to customers across the whole region. In this way, the same glass is reused many times, and fewer raw materials are needed to make each new bottle that is produced by the factory.',
    empty: '',
  };
  const kinds = {};
  for (const s of sets) kinds[s.type] ||= s;
  const add = (id, why, text, d) => { const r = clone(T.score(text, d)); out.score.push({ id, why, input: { text, set: d.id, type: d.type }, out: { band: r.band, words: r.words, overview: r.overview, numbers: r.numbers, trend: r.trend, compare: r.compare, notes: r.notes.map(tk) } }); };
  add('good-line', 'a complete line-graph answer: overview + numbers + trend + comparison + 3 paragraphs ⇒ band 8, one "all good" note', txt.good, kinds.line);
  add('no-overview-line', 'no "Overall" ⇒ note "Thiếu đoạn tổng quan", no paragraph break ⇒ note "Chia bài thành 3–4 đoạn"', txt.noOverview, kinds.line);
  add('opinion', '"I think / in my opinion" ⇒ -0.5 and the "không nêu ý kiến" note', txt.opinion, kinds.line);
  add('process-passive', 'process: needs ≥ 3 passive sentences (is collected …); numbers are not required', txt.process, kinds.process);
  add('process-active', 'a process answer with no passive ⇒ the process passive note', txt.process.replace(/ (is|are|was|were) (\w+ed)/g, ' they $2').replace(/\bis cleaned\b/, 'they clean'), kinds.process);
  add('map-passive', 'map: the same passive rule with the map wording', 'The maps show a town. Overall, the town changed a lot.\n\nThe shops stayed. The factory went. The park stayed.', kinds.map);
  add('bar-compare', 'bar chart: trend words are not required, comparisons are (whereas, compared with …)', 'The bar chart compares hours.\n\nOverall, younger people spent more time on social media than older people, whereas reading was highest among the oldest group.\n\nThe 16-24 group spent 14 hours, compared with 2 hours for those aged 65+.', kinds.bar);
  add('table-trend', 'table needs trend words + ≥ 4 numbers; a text with none gets both notes', 'The table shows students in five countries.\n\nOverall, Country B had many students and Country E had few. Country A was big, Country C was medium, and Country D was small compared with the others in the table.', kinds.table);
  add('pie-short', 'pie chart with < 150 words', 'The pie charts show spending. Overall, food fell and housing rose, 35% and 17% for food.', kinds.pie);
  add('under-100', 'fewer than 100 words ⇒ the band is capped at 4.5', txt.good.split(/\s+/).slice(0, 70).join(' '), kinds.line);
  add('empty', 'empty text ⇒ band 4 floor… words 0, every note, no crash', txt.empty, kinds.line);
  add('150-words', '150+ words ⇒ +0.5 and no length note; the 100–149 cap is 5.5', ESS[1].split(/\s+/).slice(0, 160).join(' '), kinds.line);
  add('120-words', '100–149 words ⇒ the band is capped at 5.5', ESS[1].split(/\s+/).slice(0, 120).join(' '), kinds.bar);
  // ---- the page ----
  const f = async (id, why, input, run) => { const Q = await page({ hash: '#/task1' }); out.flow.push({ id, why, input, out: await run(Q) }); };
  await f('open-default', 'no id ⇒ the first set; tabs list every set (type · id)', { id: null }, async Q => { await Q.routes.task1(); await settle(); const h = Q.view.innerHTML;
    return { tabs: list(h, /data-set="(.*?)">(.*?) · (.*?)<\/button>/g).map(m => ({ id: m[1], type: tk(m[2]), label: m[3] })), active: /class="on" data-set="(.*?)"/.exec(h)[1], chip: tk(/<span class="chip lv">(.*?)<\/span>/.exec(h)[1]), title: unesc(/font-weight:600;margin:\.6rem 0 1rem">(.*?) Summarise/.exec(h)[1]), structure: list(h.slice(h.indexOf('🧭')), /<li>(.*?)<\/li>/g).slice(0, 4).map(m => tk(m[1])), vocab: list(h.slice(h.indexOf('💡')), /data-ins="(.*?)" style/g).map(m => unesc(m[1])).slice(0, 12), modelLink: /href="#\/model\/(.*?)"/.exec(h)?.[1] || null, placeholder: unesc(/placeholder="(.*?)"/.exec(h)[1]), clock: /id="clock"[^>]*>(.*?)<\/span>/.exec(h)[1] }; });
  await f('analyse', 'analyse(text): < 30 words ⇒ toast + nothing; else report (band, 4 stats, notes) + App.reward({quizzes:1, writes:1, xp:20}); the draft of each set is kept in Store "task1Drafts" {id: text} (600 ms)', { id: 'energy', text: txt.good, short: 'Gas fell a lot.' }, async Q => {
    await Q.routes.task1('energy'); await settle(); Q.$('#t1').value = txt.good; Q.$('#t1').oninput(); await settle(40); await Q.$('#go').onclick(); await settle(60); const h = Q.$('#t1Res').innerHTML;
    const R = await page({ hash: '#/task1' }); await R.routes.task1('energy'); await settle(); R.$('#t1').value = 'Gas fell a lot.'; await R.$('#go').onclick(); await settle(40);
    return { band: tk(/<h2 style="margin:0">(.*?)<\/h2>/.exec(h)[1]), ring: /--p:([0-9.]+)/.exec(h)[1] * 1, stats: list(h, /<div><b>(.*?)<\/b><span class="tiny muted">(.*?)<\/span>/g).map(m => ({ n: m[1], label: tk(m[2]) })), notes: notesOf(h), rewards: Q.calls.rewards, drafts: Q.writes.filter(w => w.store === 'store').map(w => ({ key: w.key, value: w.value })), shortToast: R.toasts, shortReported: !!R.$('#t1Res').innerHTML, shortRewards: R.calls.rewards }; });
  await f('draft-restored', 'the draft of the open set is restored; an unknown id ⇒ the first set', { id: 'leisure' }, async Q => {
    await Q.E.Core.Store.set('task1Drafts', { leisure: 'The bar chart compares', energy: 'other' }); await Q.routes.task1('leisure'); await settle(); const h = Q.view.innerHTML;
    const R = await page({ hash: '#/task1' }); await R.routes.task1('nope'); await settle(); return { editor: /<textarea[^>]*>([\s\S]*?)<\/textarea>/.exec(h)[1], active: /class="on" data-set="(.*?)"/.exec(h)[1], unknownActive: /class="on" data-set="(.*?)"/.exec(R.view.innerHTML)[1] }; });
  return out;
}

// ================================================================== #/qstats ==================================================================
async function qstatsVectors() {
  const mkq = async q => { const P = await page({ hash: '#/qstats', game: { xp: 1, days: {}, total: {}, qstat: q } }); P.routes.qstats(); await settle(); return P.view.innerHTML; };
  const parse = html => list(html, /<div class="card"><h3 style="margin:0">(\S+) <span translate="no">(.*?)<\/span><\/h3>([\s\S]*?)(?=<div class="card"><h3 style="margin:0">|<\/div><div class="row" style="margin-top:1rem|<\/div>\n      <div class="row")/g).map(m => {
    const b = m[3], kpi = list(b, /<span><b>(.*?)<\/b><span class="tiny muted">(.*?)<\/span><\/span>/g).map(x => ({ v: tk(x[1]), label: tk(x[2]) }));
    return { icon: m[1], name: m[2], kpi, rows: list(b, /<a href="(.*?)" translate="no">(.*?)<\/a><span class="tiny muted"> · (.*?)<\/span><div class="bar"><i class="(.*?)" style="width:(\d+)%"><\/i><\/div><\/span><span class="num" role="cell"><b>(\d+)%<\/b><\/span><span class="num[^"]*" role="cell">(.*?)<\/span>/g).map(x => ({ href: x[1], kind: unesc(x[2]), n: tk(x[3]), bar: x[4], pct: +x[5], secs: x[7] === '–' ? null : tk(x[7]) })), weak: /🎯 (.*?)<\/b> <a href="(.*?)" translate="no">(.*?)<\/a>/.exec(b)?.slice(2).map(unesc) || null, tip: /<details class="qtip"/.test(b) };
  });
  const cases = [
    ['empty', 'no qstat ⇒ the empty card "Chưa có dữ liệu…"', {}],
    ['listening-reading', 'two skills: rows sorted by right-rate (weakest first), KPI = pct / answered / seconds per question; bar class ok ≥ 75, no < 50; weak = first row with ≥ 3 answers under 75 %; the skill order is il ir tl tr fr fl fw', { 'il:mcq': { r: 7, t: 10, s: 300, d: 1 }, 'il:notes': { r: 2, t: 6, s: 100, d: 1 }, 'ir:tfng': { r: 3, t: 4, s: 0, d: 1 }, 'ir:headings': { r: 1, t: 2, s: 0, d: 1 } }],
    ['unknown-skill', 'an unknown skill prefix or a zero total is skipped', { 'xx:mcq': { r: 1, t: 1, s: 0, d: 1 }, 'il:mcq': { r: 0, t: 0, s: 0, d: 1 } }],
    ['toeic-toefl', 'TOEIC / TOEFL skills and their practice links', { 'tl:p1': { r: 4, t: 6, s: 120, d: 1 }, 'fr:daily': { r: 8, t: 8, s: 480, d: 1 }, 'fw:email': { r: 1, t: 5, s: 600, d: 1 } }],
    ['minutes', 'seconds per question ≥ 60 ⇒ "{m} phút {s} giây"', { 'il:mcq': { r: 3, t: 4, s: 600, d: 1 } }],
  ];
  const out = [];
  for (const [id, why, q] of cases) { const html = await mkq(q); out.push({ id, why, input: { qstat: q }, out: { empty: /class="card empty"/.test(html), cards: parse(html), head: tk(/<h1>📊 (.*?)<\/h1>/.exec(html)[1]), buttons: list(html.slice(html.lastIndexOf('<div class="row"')), /<a class="btn" href="(.*?)">(\S+) (.*?)<\/a>/g).map(m => ({ href: m[1], icon: m[2], label: tk(m[3]) })) } }); }
  const P = await page({ hash: '#/qstats' });
  return { _doc: 'cases[] = the page for a game.qstat; skills = SKILL() of qtips.js as [id, icon, name, practice link] in page order; rtype = RT (reading kind → #/rtype/<type>); names = QT.NAME (question-type names, shown untranslated). Practice link of a row: ir + known rtype kind → #/rtype/<type>; TOEFL (f*) + named kind → #/toefl-p/<kind> (sentenceB → sentence); else the skill link. Row time = round(s / t) seconds or "–" when s is 0; ≥ 60 s ⇒ "{m} phút {s} giây".',
    cases: out, names: clone(P.sb.QT.NAME), ...statics().qstats };
}

// ================================================================== #/criteria ==================================================================
async function criteriaVectors(D) {
  const wc = s => (String(s || '').trim().match(/\S+/g) || []).length, out = { skills: {} };
  for (const sk of ['writing', 'speaking']) {
    const d = D[sk], isW = sk === 'writing';
    out.skills[sk] = { criteria: d.criteria.map(c => ({ id: c.id, icon: c.icon, short: c.short, weight: c.weight, bands: Object.keys(c.bands) })), models: Object.fromEntries(Object.entries(d.models).map(([b, m]) => [b, { band: m.band, words: wc(isW ? m.essay : m.transcript), scores: m.scores, critique: m.critique.length }])), jump: d.jumpTips.map(j => [j.from, j.to, j.steps.length]) };
  }
  out.rules = { _doc: 'Page state of criteria.js: skill tabs writing|speaking (arg or ?skill=, "write"/"speak" accepted, default writing, kept while the page lives), band filter all|4|5|6|7|8|9 shows only that band row of each criterion, model band 5.0|6.5|8.0 (default 6.5, reset to 6.5 when the skill changes; unknown ⇒ 6.5), word count of the model text (writing: essay, speaking: transcript), score bar width = score / 9, band colour accent ≥ 8, good ≥ 6.5, gold below, weight chip "<short> · 25%".', filters: ['all', '4', '5', '6', '7', '8', '9'], modelBands: ['5.0', '6.5', '8.0'], defaultModel: '6.5' };
  return out;
}

// ================================================================== assembly ==================================================================
export const WRITE_PACK_PATH = 'web/data/write-pack.json';
export async function writePack() {
  const P = await page({ hash: '#/criteria' }), D = clone(P.app.Criteria.DATA);
  const L = await lexisData(), st = { ...statics(), scoreKeys: Object.fromEntries(Object.entries(D).map(([k, v]) => [k, Object.keys(v.models['6.5'].scores)])) }, body = { schema: 1, criteria: D, lexis: { stop: L.stop }, ...st };
  return JSON.stringify({ _doc: 'GENERATED by scripts/native/gen-write.mjs (node scripts/native/gen.mjs) – do not edit by hand. Download pack of the P09 writing screens: criteria = App.Criteria.DATA of web/js/criteria.js (the keys are the Vietnamese strings passed to t()) · lexis.stop = the STOP table of web/js/lexis.js (Lexis.analyze) · write {outline, trends, connectors} (write.js) · task1.vocab (task1.js) · qstats {skills, rtype} (qtips.js) · scoreKeys = the order of the four scores of a criteria model (JS object order). https://lexkite.com/data/write-pack.json', schema: 1, v: crypto.createHash('sha256').update(JSON.stringify(body)).digest('hex').slice(0, 12), criteria: D, lexis: { stop: L.stop }, ...st }) + '\n';
}
/** [{ key, area }] – every Vietnamese key the P09 screens pass to t(), area = the string-id group (write.<area>.*) */
export async function writeStringKeys() {
  const out = new Map(), add = (key, area) => { if (key && !out.has(key)) out.set(key, area); };
  const RE = [/\bt\('((?:[^'\\]|\\.)*)'/g, /\bt\("((?:[^"\\]|\\.)*)"/g, /\bt\(`((?:[^`\\$]|\\.)*)`/g];
  const scan = (src, area) => { for (const ln of src.split('\n')) for (const re of RE) for (const m of ln.matchAll(re)) add(m[1].replace(/\\(['"\\])/g, '$1'), area); };
  const W = rd('web/js/write.js'), T = rd('web/js/task1.js'), Q = rd('web/js/qtips.js'), C = rd('web/js/criteria.js');
  scan(W, 'write'); scan(T, 'task1'); scan(Q.slice(Q.indexOf('routes.qstats')), 'qstats'); scan(C.slice(C.indexOf('function renderPage')), 'criteria');
  const o = sliceConst(W, 'OUTLINE'), tr = sliceConst(W, 'TRENDS'); for (const v of Object.values(o).flat()) add(v, 'write'); for (const [k] of tr.types) if (/[À-ỹ]/.test(k)) add(k, 'write'); for (const k of tr.topics) add(k, 'write'); for (const [k] of tr.task1) add(k, 'write'); // English type names stay English in every language (web t() finds no entry)
  for (const ty of Object.keys(o)) if (ty === 'Khác') add(ty, 'write');
  const D = (await page({ hash: '#/criteria' })).app.Criteria.DATA, walk = (x, k) => { if (typeof x === 'string') { if (/^(desc|summary|details|pitfall|title|text|type)$/.test(k) && /[À-ỹ]/.test(x)) add(x, 'criteria'); } else if (Array.isArray(x)) x.forEach(v => walk(v, k)); else if (x && typeof x === 'object') for (const [a, b] of Object.entries(x)) walk(b, a); };
  walk(D, ''); for (const sk of Object.values(D)) for (const j of sk.jumpTips) for (const s of j.steps) add(s, 'criteria');
  add('(bị động)', 'task1');
  return [...out].map(([key, area]) => ({ key, area }));
}
export async function writeVectors() {
  process.env.TZ = 'UTC';
  const P = await page({ hash: '#/criteria' }), D = clone(P.app.Criteria.DATA);
  const out = { _doc: 'GENERATED by scripts/native/gen-write.mjs – see docs/specs/native-m4-vectors.md (P09). Top level: write (static + analyze[] = Lexis.analyze + the report of #/write on real texts + flow[]) · task1 (static + score[] = App.task1.score + flow[]) · qstats (cases[] + names) · criteria (page state rules + the shape of App.Criteria.DATA; the data itself is write-pack.json) · persist. Cases are {id, why, input, out}; t() keys are the Vietnamese keys as the web passes them ({k, v?}).' };
  out.write = await writeVectors0(D);
  out.task1 = await task1Vectors(D, out.write);
  out.qstats = await qstatsVectors();
  out.criteria = await criteriaVectors(D);
  out.persist = out.write.persist; delete out.write.persist;
  const L = await lexisData(); out.data = { _doc: 'Tables Lexis.analyze reads (the AWL / linking words / phrases are skills.json data.lexis): stop = lexis.js STOP; index = every key of IELTS_DATA.INDEX (the word library, sorted) – the app gets it from its word catalog.', stop: L.stop, index: L.index };
  return rigVectorText(out);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) { const s = await writeVectors(); console.log(Buffer.byteLength(s), 'bytes'); }
