// Cổng ngôn ngữ của blog-check (lô B5-R2, 5/11/2026): bài ngôn ngữ khác không được mang chữ/nhãn tiếng Việt,
// không trỏ /tu-vung/ (trang tiếng Việt), coverAlt phải tả đúng ảnh bìa. Bài factChecked < 2026-11-05 chỉ bị cảnh báo.
// Dùng: node scripts/test/blog-lang-gates.mjs
import assert from 'node:assert/strict';
import { checkPosts } from '../blog-check.mjs';

const post = (o = {}) => ({ file: 'x.md', lang: 'de', slug: 'gate-test', title: 'T', description: 'd', factChecked: '2026-11-05', cover: 'toeic', coverAlt: 'Lexkite TOEIC-Übungsseite mit Probetests', body: 'Text [Wortschatz](/en/vocabulary/).\n', ...o });
const run = o => { const r = checkPosts([post(o)]); const pick = (l, rule) => l.filter(x => x.includes(`[${rule}]`)); return { e: rule => pick(r.errors, rule), w: rule => pick(r.warnings, rule) }; };

assert.equal(run({ body: 'Siehe [Wortschatz](/tu-vung/).\n' }).e('lang-link').length, 1, '/tu-vung/ trong bài de phải lỗi');
assert.equal(run({ lang: 'vi', body: 'Xem [từ vựng](/tu-vung/).\n' }).e('lang-link').length, 0, 'bài vi được trỏ /tu-vung/');
assert.equal(run({ body: 'Klicken Sie auf „Nghe 1 lần“.\n' }).e('lang-mix').length, 1, 'nhãn app tiếng Việt trong thân bài de phải lỗi');
assert.equal(run({ body: '![Seite](media:toeic "Trang Luyện thi TOEIC")\n' }).e('lang-mix').length, 1, 'chú thích ảnh tiếng Việt phải lỗi');
assert.equal(run({ factChecked: '2026-10-20', body: 'Klicken Sie auf „Nghe 1 lần“.\n' }).w('lang-mix').length, 1, 'bài cũ: chỉ cảnh báo');
assert.equal(run({ factChecked: '2026-10-20', body: 'Klicken Sie auf „Nghe 1 lần“.\n' }).e('lang-mix').length, 0, 'bài cũ: không lỗi');
assert.equal(run().e('lang-mix').length + run().e('lang-link').length, 0, 'bài de sạch không bị bắt');
assert.ok(run({ cover: 'path', coverAlt: 'Ein TOEIC-Kandidat mit Stoppuhr übt Part 5' }).e('cover-truth').length >= 1, 'coverAlt tả sai ảnh bìa (path = lộ trình IELTS) phải lỗi');
assert.equal(run({ body: 'Siehe [Wortschatz](/vocabulary/).\n' }).e('dead-link').length, 1, '/vocabulary/ không được build → lỗi');
assert.equal(run({ body: 'Siehe [Wortschatz](/de/vocabulary/).\n' }).e('dead-link').length, 1, '/de/vocabulary/ không tồn tại → lỗi');
assert.equal(run({ body: 'Siehe [Speaking](/speaking/).\n' }).e('lang-link').length, 1, '/speaking/ là trang tiếng Việt → lỗi trong bài de');
assert.equal(run({ body: 'Siehe [Speaking](/en/speaking/) und [Muster](/en/samples/).\n' }).e('dead-link').length + run({ body: 'Siehe [Speaking](/en/speaking/).\n' }).e('lang-link').length, 0, '/en/speaking/, /en/samples/ hợp lệ');
assert.equal(run({ lang: 'vi', body: 'Xem [mẫu](/samples/) và [ngữ pháp](/ngu-phap/).\n' }).e('lang-link').length + run({ lang: 'vi', body: 'Xem [mẫu](/samples/).\n' }).e('dead-link').length, 0, 'bài vi được trỏ trang tĩnh tiếng Việt');
assert.equal(run({ factChecked: '2026-10-20', body: 'Siehe [Wortschatz](/de/vocabulary/).\n' }).w('dead-link').length, 1, 'bài cũ: link chết chỉ cảnh báo');
const Q = (a, o) => ({ q: 'q', options: o, answer: a, explain: 'e' });
assert.equal(run({ quiz: [Q(0, ['long correct option', 'short', 'tiny']), Q(1, ['x', 'long correct option', 'y']), Q(0, ['a', 'bb', 'ccc'])] }).e('quiz').length, 1, 'đáp án đúng dài nhất 2/3 câu → lỗi');
assert.equal(run({ quiz: [Q(0, ['a', 'bb', 'ccc']), Q(1, ['xxx', 'y', 'zz']), Q(2, ['aaaa', 'b', 'cc'])] }).e('quiz').length, 0, 'độ dài cân → không lỗi');
assert.equal(run({ quiz: [Q(0, ['a', 'b']), Q(1, ['a', 'b'])] }).e('quiz').length, 1, 'quiz 2 câu → lỗi');
console.log('✓ blog-lang-gates: quiz, dead-link, lang-link, lang-mix (lỗi/cảnh báo theo factChecked), cover-truth');
