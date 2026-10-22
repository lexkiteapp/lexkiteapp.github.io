// 🎬 Video bài học trên web (docs/VIDEO-SCALE-PLAN.md §10): schema manifest + xếp hạng + chọn clip + phụ đề + câu đố + gắn thẻ.
//   node scripts/test/video-web.mjs [--schema-only]
import fs from 'node:fs'; import { createRequire } from 'node:module';
import { validateManifest, eligible, webScore, sentences, enCues, vtt, quizFor, tagLesson, titleOf, slugOf, blogMatch, MANIFEST, readJSON } from '../lib/video-web.mjs';
const require = createRequire(import.meta.url);
let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.error('✗ ' + m); } };

// 1) manifest thật
const man = readJSON(MANIFEST); ok(man, `${MANIFEST} đọc được`);
const e0 = validateManifest(man); ok(!e0.length, 'manifest hợp lệ: ' + e0.join('; '));
if (process.argv.includes('--schema-only')) { console.log(fail ? `✗ video-web schema: ${fail} lỗi` : `✓ video-web schema: ${man.items.length} clip`); process.exit(fail ? 1 : 0); }

// 2) schema: mẫu đúng qua, mẫu sai bị bắt
const good = { id: 'news_bank_three_15d51e', slug: 'at-the-bank-15d51e', title: 'At the bank', template: 'three', series: 'MONEY ENGLISH', point: 'bank phrases',
  tags: { lex: ['withdraw#v'], words: ['withdraw'], grammar: [], situation: 'bank', cefr: 'B1', exam: 'toeic', skill: 'speaking' }, duration: 21.7,
  src: 'https://media.lexkite.com/video/news_bank_three_15d51e/v-0123abcd.mp4', poster: 'https://media.lexkite.com/video/news_bank_three_15d51e/p-0123abcd.webp',
  vtt: { en: 'https://media.lexkite.com/video/news_bank_three_15d51e/en-0123abcd.vtt', vi: 'https://media.lexkite.com/video/news_bank_three_15d51e/vi-0123abcd.vtt' },
  quiz: { q: 'Which?', options: ['a', 'b'], answer: 1 }, score: 95, test: false };
ok(!validateManifest({ version: 1, items: [good] }).length, 'mẫu manifest đúng phải hợp lệ');
for (const [k, v] of [['score', 80], ['template', 'scene'], ['src', 'http://evil.example/x.mp4'], ['test', 'no'], ['quiz', { q: 'x', options: ['a'], answer: 3 }], ['vtt', { xx: 'a.vtt' }]])
  ok(validateManifest({ version: 1, items: [{ ...good, [k]: v }] }).length > 0, `schema phải bắt lỗi ${k}`);
ok(validateManifest({ version: 1, items: [good, good] }).some(x => /trùng/.test(x)), 'schema bắt id trùng');

// 3) chọn clip: bản tin + QA ≥ 90 + duyệt/mẫu thử; diễn cảnh cũ & bị loại không vào
const qa = (o = {}) => ({ status: 'pass', result: 'ALL PASS', fail: 0, lipsync_ms: 40, cps_max: 15, ...o });
const idx = [
  { id: 'a', lesson: 'news_a_three_aaaaaa', scene: 'news', qa: qa(), created: '2026-10-22' },
  { id: 'a0', lesson: 'news_a_three_aaaaaa', scene: 'news', qa: qa(), created: '2026-10-20' },
  { id: 'b', lesson: 'news_b_fix_bbbbbb', scene: 'news', qa: qa({ fail: 2 }) },
  { id: 'c', lesson: 'cafe_tpl_choose', scene: 'cafe', qa: qa() },
  { id: 'd', lesson: 'news_d_ab_dddddd', scene: 'news', qa: qa(), rejected: true },
  { id: 'e', lesson: 'news_e_ways_eeeeee', scene: 'news', qa: qa({ lipsync_ms: 120, cps_max: 20 }) },
  { id: 'f', lesson: 'news_f_pov_ffffff', scene: 'news', qa: qa() },
];
const el = eligible(idx, { approved: ['news_a_three_aaaaaa', 'cafe_tpl_choose', 'news_d_ab_dddddd', 'news_e_ways_eeeeee', 'news_b_fix_bbbbbb'], test: ['news_f_pov_ffffff'] });
ok(el.map(x => x.lesson).sort().join() === 'news_a_three_aaaaaa,news_e_ways_eeeeee,news_f_pov_ffffff', 'eligible: ' + el.map(x => x.lesson));
ok(el.find(x => x.lesson === 'news_a_three_aaaaaa').id === 'a', 'eligible lấy bản dựng mới nhất');
ok(el.find(x => x.lesson === 'news_f_pov_ffffff').test === true && el.find(x => x.lesson === 'news_a_three_aaaaaa').test === false, 'cờ test');
ok(webScore(qa()) === 100 && webScore(qa({ fail: 1 })) === 90 && webScore({ status: 'fail' }) === 0, 'webScore');

// 4) xếp hạng: khớp thẻ × trình độ × chưa xem × đa dạng; không 2 clip liền nhau cùng template/series
const R = require('../../web/js/lib/video-rank.js');
const mk = (id, template, series, tags) => ({ id, template, series, tags: { lex: [], words: [], grammar: [], situation: '', cefr: 'B1', exam: '', skill: '', ...tags } });
const items = [
  mk('t1', 'three', 'MONEY', { words: ['withdraw', 'fee'], situation: 'bank' }), mk('t2', 'three', 'MONEY', { words: ['withdraw'] }),
  mk('f1', 'fix', 'GRAMMAR FIX', { grammar: ['reported-speech'], words: ['tell'] }), mk('a1', 'ab', 'QUIZ', { cefr: 'A1' }), mk('w1', 'ways', 'POLITE', { cefr: 'C2', words: ['withdraw'] }),
];
let r = R.rank(items, { words: ['withdraw'], level: 'B1' });
ok(r[0].it.id === 't1' || r[0].it.id === 't2', 'khớp từ + đúng trình độ lên đầu: ' + r.map(x => x.it.id));
ok(r.findIndex(x => x.it.id === 'w1') > 0 && R.score(items[4], { words: ['withdraw'], level: 'B1' }) < R.score(items[0], { words: ['withdraw'], level: 'B1' }), 'C2 xa trình độ B1 bị giảm');
for (let i = 1; i < r.length; i++) ok(r[i].it.template !== r[i - 1].it.template || r.slice(i).every(x => x.it.template === r[i - 1].it.template), `không 2 clip liền nhau cùng template (${r.map(x => x.it.template)})`);
r = R.rank(items, { words: ['withdraw'], level: 'B1', seen: { t1: 1, t2: 1 } }); ok(r[0].it.id === 'w1', 'clip chưa xem được ưu tiên: ' + r.map(x => x.it.id));
r = R.rank(items, { grammar: ['reported-speech'], strict: true }); ok(r.length === 1 && r[0].it.id === 'f1', 'strict: chỉ clip khớp chủ điểm ngữ pháp');
r = R.rank(items, { prev: { id: 't1', template: 'three', series: 'MONEY' }, exclude: 't1' }); ok(r[0].it.template !== 'three' && !r.some(x => x.it.id === 't1'), '"video tiếp theo" khác template + bỏ clip vừa xem');
ok(R.rank([], {}).length === 0, 'rỗng');

// 5) phụ đề: câu theo mốc từ, cắt cụm ≤ 42 ký tự, VTT hợp lệ
const text = { n_x_1: 'Could I get some extra towels for the room, please, before dinner tonight?', n_x_2: 'Of course.' };
const tl = { shots: [{ t0: 0, lines: [{ id: 'n_x_1', words: text.n_x_1.split(' ').map((w, i) => [1 + i * 0.3, 1.25 + i * 0.3, 0]) }] }, { t0: 6, lines: [{ id: 'n_x_2', at: 0.2 }] }] };
const ss = sentences(tl, text); ok(ss.length === 2 && ss[0].s === 1 && ss[1].s === 6.2 && ss[0].e < ss[1].s, 'sentences: ' + JSON.stringify(ss.map(x => [x.s, x.e])));
const cs = enCues(ss); ok(cs.length >= 3 && cs.every(c => c.text.length <= 42 && c.e > c.s), 'enCues ≤ 42 ký tự');
const v = vtt(cs); ok(/^WEBVTT\n\n1\n00:00:01\.000 --> /.test(v) && !/-->.*-->/.test(v.split('\n').find(l => l.includes('-->'))) , 'vtt');

// 6) câu đố + thẻ trên kịch bản thật (content/video/cine/news)
const lines = Object.fromEntries((readJSON('content/video/cine/news/lines.json', {}).lines || []).map(l => [l.id, l.text]));
const pool = Object.entries(lines).filter(([k]) => /_2$/.test(k)).map(([, x]) => x);
const files = fs.readdirSync('content/video/cine/news').filter(f => /^news_.*\.json$/.test(f));
let quizzes = 0;
for (const f of files) {
  const L = readJSON('content/video/cine/news/' + f), q = quizFor(L, lines, pool);
  if (q) { quizzes++; ok(q.options.length >= 2 && q.options[q.answer] && new Set(q.options).size === q.options.length, `quiz ${L.id}: ${JSON.stringify(q)}`); }
  ok(/^[a-z0-9-]+-[0-9a-f]{6}$/.test(slugOf(L)) && titleOf(L).length > 3, `slug/title ${L.id}`);
}
ok(quizzes >= files.length * 0.8, `câu đố cho ≥ 80 % kịch bản (${quizzes}/${files.length})`);
const bank = readJSON('content/video/cine/news/news_bank_three_15d51e.json');
const tg = tagLesson(bank, lines, { 'withdraw#v': { w: 'withdraw' }, 'fee#n': { w: 'fee' }, 'open an account#phr': { w: 'open an account' }, 'the#det': { w: 'the' } }, ['modals-ability-permission']);
ok(tg.words.includes('withdraw') && tg.words.includes('fee') && tg.lex.includes('open an account#phr') && !tg.words.includes('the'), 'tagLesson từ: ' + tg.words);
ok(tg.situation === 'bank' && tg.cefr === 'B1' && tg.exam === 'toeic' && tg.skill === 'speaking' && tg.grammar.includes('modals-ability-permission'), 'tagLesson thẻ: ' + JSON.stringify(tg));
const fix = readJSON('content/video/cine/news/news_bookstore_fix_a59145.json'), qf = quizFor(fix, lines, pool);
ok(qf && qf.options[qf.answer] === "I'm looking for a book.", 'quiz fix chọn câu đúng');

// 7) blog: mẫu thử không bao giờ vào bài; clip thật khớp thẻ thì vào
const post = { lang: 'en', title: 'Bank English: how to withdraw cash and avoid a fee', tags: ['bank'], category: 'giao-tiep' };
ok(!blogMatch(post, [{ ...good, test: true }]), 'blog bỏ mẫu thử');
ok(blogMatch(post, [{ ...good, tags: { ...good.tags, words: ['withdraw', 'fee'] } }]), 'blog khớp clip thật');

// 8) nối dây: gói tải lười + i18n nhóm lười + chỗ đặt
const app = fs.readFileSync('web/js/app.js', 'utf8'), sh = fs.readFileSync('scripts/build-i18n.sh', 'utf8');
ok(/lvideo: \['js\/i18n\/en\/lvideo\.js', 'js\/lib\/video-rank\.js', 'js\/lesson-video\.js'\]/.test(app), 'BUNDLES.lvideo');
ok(/^LAZY="[^"]*\blvideo\b/m.test(sh), 'LAZY có lvideo');
for (const f of ['web/js/wordcard.js', 'web/js/grammar.js', 'web/js/path-day.js']) ok(/lv-slot/.test(fs.readFileSync(f, 'utf8')) && /App\.need\('lvideo'\)/.test(fs.readFileSync(f, 'utf8')), 'chỗ đặt video: ' + f);
ok(/blogVideoBox\(p, VIDEOS, esc\)/.test(fs.readFileSync('scripts/build-blog.mjs', 'utf8')), 'mẫu blog có khối video');

console.log(fail ? `✗ video-web: ${fail} lỗi` : `✓ video-web: schema, chọn clip, xếp hạng, phụ đề, câu đố (${quizzes}/${files.length}), thẻ, blog, nối dây`);
process.exit(fail ? 1 : 0);
