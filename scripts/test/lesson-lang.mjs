// Hồi quy báo lỗi #5–#13 (lesson/go): người học en/fr/… KHÔNG bao giờ thấy tiếng Việt ở đề bài; mọi bài có "Tôi không biết"; mọi bài xếp từ đủ ô để ghép ra đáp án.
// Chạy: node scripts/test/lesson-lang.mjs (không mạng)
import fs from 'node:fs'; import vm from 'node:vm';
let total = 0, fails = 0; const ok = (c, m) => { total++; if (!c) { fails++; console.error('✗', m); } };
const ctx = { self: {} }; ctx.globalThis = ctx.self; vm.createContext(ctx);
vm.runInContext(fs.readFileSync('web/js/lesson/engine.js', 'utf8'), ctx);
const E = ctx.self.LessonEngine;
const VI = /[ăâđêôơưàáảãạằắẳẵặầấẩẫậèéẻẽẹềếểễệìíỉĩịòóỏõọồốổỗộờớởỡợùúủũụừứửữựỳýỷỹỵ]/i;
const NOW = Date.now(), srs = { reps: 2, lapses: 0, due: NOW - 864e5, last: NOW - 4 * 864e5, step: 0 };
const cards = ['consider', 'afraid', 'salary', 'decide', 'listen', 'travel'].map((w, i) => ({ word: w, pos: 'verb', vi: 'cân nhắc', def: 'to think about it', srs,
  ex: `They ${w} it every day at home.`, sentences: [{ en: `They ${w} it every day at home.`, vi: 'Họ làm điều đó mỗi ngày ở nhà.' }] }));
const picks = cards.map(card => ({ card, why: 'due' }));
const strings = it => [it.prompt, it.tr, it.mean, it.def].filter(Boolean).concat(it.pairs ? it.pairs.map(p => p.mean || '') : []);
for (const lang of ['en', 'fr', 'zh', 'es', 'ar', 'ja']) {
  for (const gloss of [null, (c, en) => (lang === 'fr' ? 'Ils le font chaque jour.' : '')]) {
    const items = E.build(picks, { seed: 5, pool: cards, vi: false, off: {}, gloss: gloss || undefined, mean: () => '', perWord: 3 });
    ok(items.length > 0, `${lang}: có bài`);
    ok(items.every(it => strings(it).every(s => !VI.test(s))), `${lang}: không có chữ Việt trong đề bài (gloss ${gloss ? 'có' : 'không'})`);
    if (!(gloss && lang === 'fr')) ok(!items.some(it => it.type === 'tr'), `${lang}: không dịch được → không sinh dạng 'tr'`);
    else ok(items.every(it => it.type !== 'tr' || it.prompt === 'Ils le font chaque jour.'), 'fr: dạng tr dùng bản dịch fr');
    ok(items.every(it => it.type !== 'build' || it.prompt === '' || !VI.test(it.prompt)), `${lang}: xếp câu không lộ tiếng Việt`);
  }
}
{ const items = E.build(picks, { seed: 5, pool: cards, off: {}, perWord: 3 }); ok(items.some(it => it.type === 'tr' && VI.test(it.prompt)), 'vi: vẫn có dạng dịch tiếng Việt'); }

// Mọi bài xếp từ (build/tr, kể cả truyện/radio) đủ ô để ghép ra đáp án (báo lỗi #7)
const bank = it => { const b = it.tiles.slice(); for (const w of it.answer.split(' ')) { const i = b.indexOf(w); if (i < 0) return w; b.splice(i, 1); } return null; };
{
  const all = [];
  for (const seed of [1, 2, 3, 4, 5, 6, 7]) all.push(...E.build(picks, { seed, pool: cards, vi: true, off: {}, perWord: 3 }));
  const ST = (() => { const c = { window: {}, self: {} }; vm.createContext(c); try { vm.runInContext(fs.readFileSync('web/cpack/lesson/stories.js', 'utf8'), c); } catch (e) { return []; } return c.window.LESSON_STORIES || c.self.LESSON_STORIES || []; })();
  ok(ST.length > 0, `đọc được kho truyện bài học (${ST.length})`);
  ST.forEach(s => { E.storyItems(s, 'en', 3).forEach(x => all.push(x));
    (s.checks || []).forEach((c, i) => {
      if (c.type === 'q') ok(Array.isArray(c.options) && c.options[c.answer] != null, `truyện ${s.id || ''}#${i}: đáp án câu hỏi nằm trong phương án`);
      if (c.type === 'tap') ok(s.lines[c.line] && E.toks(s.lines[c.line].en).length > 0, `truyện ${s.id || ''}#${i}: dòng xếp câu hợp lệ`);
    }); });
  all.filter(it => it.tiles).forEach(it => { const miss = bank(it); ok(miss === null, `bài xếp từ "${it.answer}" đủ ô (thiếu: ${miss})`); });
  ok(E.toks('Un café très bon').join(' ') === 'Un café très bon', 'toks giữ chữ có dấu (café không bị cắt chữ cuối)');
}
// "Tôi không biết" có ở MỌI dạng bài: nút luôn được thêm vào chân trang và đi qua submit(idk) → tính sai, hiện đáp án
{ const ui = fs.readFileSync('web/js/lesson/ui.js', 'utf8');
  ok(/list\.push\(\['lsnIdk'/.test(ui) && /on\('lsnIdk'/.test(ui) && /idk \? false/.test(ui), 'ui: nút "Tôi không biết" luôn có + nối dây');
  ok(!/I18N\.learnLang \? I18N\.learnLang\(\) : 'vi'/.test(ui), "ui: không mặc định 'vi' khi thiếu ngôn ngữ"); }
console.log(`lesson-lang: ${total - fails}/${total}`); process.exit(fails ? 1 : 0);
