const { JSDOM } = require('jsdom');
const fs = require('fs'), path = require('path');
const WEB = process.argv[2];
const html = fs.readFileSync(path.join(WEB, 'app', 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script(?: defer)? src="([^"]+)"><\/script>/g)].map(m => m[1]);
const dom = new JSDOM(html.replace(/<script(?: defer)? src="[^"]+"><\/script>/g, '').replace(/<link[^>]+>/g, ''), { url: 'http://localhost/app/' + (process.argv[3] || '#/home'), runScripts: 'outside-only', pretendToBeVisual: true });
const w = dom.window, errors = [];
w.addEventListener("error", e => errors.push(e.message + " :: " + (e.error && e.error.stack || "").split("\n").slice(0,3).join(" < ")));
w.console.error = (...a) => errors.push(a.join(' '));
w.scrollTo = () => {}; w.HTMLElement.prototype.scrollIntoView = () => {}; w.matchMedia = () => ({ matches: false });
w.CSS = { escape: s => s };
w.fetch = async () => ({ ok: false, json: async () => ({}) });
for (const f of scripts) { try { w.eval(fs.readFileSync(path.join(WEB, f), 'utf8')); } catch (e) { errors.push(f + ': ' + e.message); } }
require('./lazyfix.js')(w, fs, path, WEB, errors);
const tick = (ms = 40) => new Promise(r => setTimeout(r, ms));
const $ = s => w.document.querySelector(s);
const txt = () => $('#view').textContent.replace(/\s+/g, ' ').trim();
const go = async h => { w.location.hash = h; await tick(80); };
(async () => {
  await tick(300);
  console.log('START', w.location.hash, '|', txt().slice(0, 80));
  console.log('WORDS', Object.keys(w.IELTS_DATA.INDEX).length, 'TOPICS', w.IELTS_DATA.TOPICS.length, 'READINGS', w.READINGS.length);
  $('a[href="#/welcome/setup"]') && $('a[href="#/welcome/setup"]').click(); await go('#/welcome/setup');
  for (let i = 0; i < 60 && !$('#go'); i++) { if ($('#obNext')) $('#obNext').click(); await tick(100); } $('#go').click(); await tick(1500); // thiết lập từng bước (onboard.js): Tiếp tục tới màn cuối rồi Bắt đầu
  console.log('AFTER SETUP', w.location.hash, 'cards', Object.keys(JSON.parse(w.localStorage.getItem('ielts.cards') || '{}')).length);
  for (const r of ['#/models', '#/models?t=gt', '#/home', '#/stats?s=quests', '#/vocab', '#/skills', '#/skill/listening', '#/skill/reading', '#/skill/writing', '#/skill/speaking', '#/tests', '#/me', '#/khong-co', '#/model/t1-energy', '#/model/t2-p8', '#/phrases', '#/dict/threat', '#/practice/learn?src=phrases', '#/grammar/word-formation', '#/grammar/hedging', '#/grammar/numbers-data-language?view=full', '#/topic/ngsl1', '#/library?g=core', '#/task1', '#/task1/spending', '#/task1/glass', '#/task1/town', '#/task1/students', '#/grammar/mix', '#/grammar', '#/grammar/present-perfect', '#/grammar/passive-voice', '#/grammar/countable-uncountable', '#/grammar/modals-deduction', '#/pron', '#/pron/iː', '#/pron/θ', '#/pron/ed-endings', '#/pron/intonation', '#/placement', '#/mistakes', '#/resources', '#/cbt', '#/cbt/urban-farming,four-day-week', '#/write/p13', '#/speaking', '#/speaking/p2/2', '#/speaking/p3/1', '#/path', '#/write', '#/method', '#/home', '#/library', '#/library?g=awl', '#/topic/awl1', '#/deck', '#/stats', '#/settings', '#/reading', '#/read/space-debris', '#/practice', '#/dict']) { await go(r); console.log(r.padEnd(22), txt().slice(0, 70)); }
  // Mẹo theo dạng câu + tiến bộ theo dạng (qtips.js): làm 1 nhóm rtype → #/qstats có số liệu
  for (const r of ['#/listen/t1p1', '#/toeic-r/tr1?part=5', '#/toefl-p/daily', '#/rtype/tfng']) { await go(r); await tick(400); console.log(r.padEnd(22), 'tips', w.document.querySelectorAll('.qtip').length, '|', txt().slice(0, 50)); }
  $('#rSub') && $('#rSub').click(); await tick(300); await go('#/qstats'); await tick(300); console.log('QSTATS rows', w.document.querySelectorAll('.qs-row').length, txt().slice(0, 60));
  await go('#/review');
  for (let i = 0; i < 6; i++) { $('#flipBtn') && $('#flipBtn').click(); await tick(20); const g = w.document.querySelectorAll('[data-grade]'); if (!g.length) break; g[2].click(); await tick(80); }
  console.log('SRS', JSON.stringify(Object.values(JSON.parse(w.localStorage.getItem('ielts.cards'))).filter(c => c.srs.last).slice(0, 3).map(c => [c.word, c.srs.S, c.srs.D, c.srs.step, c.srs.reps])));
  console.log('REVIEW', txt().slice(0, 60), '| xp', JSON.parse(w.localStorage.getItem('ielts.game')).xp);
  for (const m of ['learn', 'mcq', 'cloze', 'listen', 'test', 'match', 'speak']) {
    await go('#/practice/' + m + '?src=topic:environment');
    const opt = w.document.querySelector('.option'); if (opt) { opt.click(); await tick(20); }
    console.log('MODE', m.padEnd(7), txt().slice(0, 70));
  }
  // match: click pairs correctly
  await go('#/practice/match?src=topic:education');
  const tiles = [...w.document.querySelectorAll('.tile')];
  console.log('tiles', tiles.length);
  await go('#/read/sleep-memory');
  w.document.querySelector('.tw').click(); await tick(60);
  console.log('POP', !!w.document.querySelector('.pop'));
  w.document.querySelectorAll('.q-item').forEach(q => q.querySelector('.opts button').click());
  w.confirm = () => true; $('#check').click(); await tick(200);
  console.log('READ RESULT', $('#qResult').textContent.trim().slice(0, 50));
  console.log('ERRORS', errors.length ? errors.slice(0, 8) : 'none');
  process.exit(0);
})().catch(e => { console.error('FAIL', e); process.exit(1); });
