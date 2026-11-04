// 🎬 Học qua video/audio (docs/MEDIA.md): logic media/cues.js · cổng chất lượng nội dung + bản dịch 15 ngôn ngữ · mốc giờ căn theo audio ·
// dữ liệu web/data/media khớp nguồn · transcript/thẻ tra từ trên jsdom.  node scripts/test/media.mjs [--strict]
// --strict (npm test, media-clips.yml): MỌI clip phải có timing + mp3 + dữ liệu dựng (không clip nào được chạy với mốc giờ đoán).
import fs from 'node:fs'; import { createRequire } from 'node:module'; import { execFileSync } from 'node:child_process';
import jsdom from 'jsdom';
const require = createRequire(import.meta.url), M = require('../../web/js/media/cues.js');
const strict = process.argv.includes('--strict');
let fails = 0, n = 0; const ok = (c, m) => { n++; if (!c) { fails++; console.log('✗', m); } };

// ---- 1. Logic ----
const cues = [{ start: 0.3, end: 2, text: 'Hi! Can I get a large latte, please?' }, { start: 2.5, end: 4, text: 'To go, please.' }, { start: 4.5, end: 6, text: 'No worries.' }];
ok(M.at(cues, 0) === -1 && M.at(cues, 0.3) === 0 && M.at(cues, 2.2) === 0 && M.at(cues, 3) === 1 && M.at(cues, 99) === 2, 'at(): câu đang phát (giữa 2 câu giữ câu trước)');
ok(M.wordAt({ words: [{ s: 1, e: 1.2 }, { s: 1.3, e: 1.5 }] }, 1.35) === 1 && M.wordAt({ words: [{ s: 1 }] }, 0.5) === -1 && M.wordAt({}, 1) === -1, 'wordAt(): karaoke');
const PH = { 'can I get': {}, 'to go': {}, 'it\'s on me': {}, go: {} };
const sp = M.phraseSpans('Hi! Can I get a latte to go?', PH);
ok(sp.length === 2 && sp[0].key === 'can I get' && sp[1].key === 'to go', 'phraseSpans(): khớp nguyên từ, cụm dài ưu tiên, không chồng ("go" không bị đếm lại)');
ok(M.phraseSpans('This one\'s on me, it’s on me.', PH).length === 1, 'phraseSpans(): nháy cong ’ = nháy thẳng');
ok(M.phraseSpans('I want togo', PH).length === 0, 'phraseSpans(): không khớp giữa từ');
ok(M.segments('Hi! Can I get it', PH).map(s => s.t).join('') === 'Hi! Can I get it', 'segments(): ghép lại đúng câu gốc');
let d = M.dictation('To go, please.', 'to go please'); ok(d.score === 100 && d.words.every(x => x.ok), 'dictation(): bỏ qua hoa thường/dấu câu');
d = M.dictation('I catch up on emails', 'I cach up on emails'); ok(d.words[1].ok === false && d.words[1].typed === 'cach' && d.score === 80, 'dictation(): gõ sai 1 từ → đúng từ đó sai, 80 %');
d = M.dictation('I catch up on emails', 'I up on'); ok(d.words.filter(x => !x.ok).map(x => x.w).join() === 'catch,emails' && d.score === 60, 'dictation(): thiếu từ');
d = M.dictation('Go now', 'go go now now now'); ok(d.extra === 3 && d.score < 100, 'dictation(): từ thừa trừ điểm');
ok(M.dictation('Hello', '').score === 0, 'dictation(): bỏ trống = 0');
const cz = M.cloze('Then I call my team to get the ball rolling.', { 'get the ball rolling': {} }, { seed: 3 });
const blanks = cz.filter(p => p.blank).map(p => p.answer);
ok(blanks.length === 2 && blanks.every(b => ['ball', 'rolling'].includes(b)), 'cloze(): ưu tiên từ trong cụm gạch chân, bỏ từ chức năng');
ok(cz.map(p => p.blank ? p.answer : p.t).join('') === 'Then I call my team to get the ball rolling.', 'cloze(): ghép lại đúng câu');
ok(JSON.stringify(M.cloze('Mondays are busy, so I plan.', {}, { seed: 1 })) === JSON.stringify(M.cloze('Mondays are busy, so I plan.', {}, { seed: 1 })), 'cloze(): cùng seed cùng đề');
ok(M.sameWord('Rolling', 'rolling') && M.sameWord('it’s', "it's") && !M.sameWord('', '') && !M.sameWord('roll', 'rolling'), 'sameWord()');
ok(M.loopSeek(cues[0], 1.99) === 0.3 && M.loopSeek(cues[0], 1) === null, 'loopSeek(): hết câu → tua về đầu câu');
ok(M.trOf({ tr: { vi: 'x' } }, 'vi') === 'x' && M.trOf({ tr: { vi: 'x' } }, 'en') === '' && M.trOf({ tr: {} }, 'ja') === '', 'trOf(): en/thiếu → rỗng');
ok(M.grade(90) === 'great' && M.grade(70) === 'good' && M.grade(10) === 'retry', 'grade()');
ok(M.wpm([{ start: 0, end: 2, text: 'one two three four five' }, { start: 4, end: 6, text: 'six seven eight nine ten' }]) === 100 && M.wpm([]) === 0, 'wpm(): tính cả nghỉ giữa câu (10 từ / 6 s = 100)');
ok(M.LANGS.length === 15 && new Set(M.LANGS).size === 15, '15 ngôn ngữ');

// ---- 2. Cổng nội dung + bản dịch ----
const TR = M.LANGS.filter(l => l !== 'en');
const SCRIPT = { zh: /[一-鿿]/, ja: /[぀-ヿ]/, ko: /[가-힯]/, th: /[฀-๿]/, hi: /[ऀ-ॿ]/, ar: /[؀-ۿ]/, ru: /[Ѐ-ӿ]/ };
const LATIN = ['vi', 'es', 'pt', 'fr', 'de', 'id', 'tr'];
const VI = /[ăâđêôơưàáạảãầấậẩẫằắặẳẵèéẹẻẽềếệểễìíịỉĩòóọỏõồốộổỗờớợởỡùúụủũừứựửữỳýỵỷỹ]/i;
const FOREIGN = /[Ѐ-ӿ؀-ۿऀ-ॿ฀-๿぀-ヿ一-鿿가-힯]/;
const NAMES = ['Ama', 'Carlos'];
function checkTr(where, en, tr, short) {
  for (const l of TR) {
    const s = tr && tr[l];
    if (!s || !String(s).trim()) { ok(false, `${where}: thiếu bản dịch ${l}`); continue; }
    ok(s.trim().toLowerCase() !== en.trim().toLowerCase(), `${where} ${l}: bản dịch trùng tiếng Anh`);
    if (SCRIPT[l]) ok(SCRIPT[l].test(s), `${where} ${l}: sai hệ chữ “${s}”`);
    if (LATIN.includes(l)) ok(!FOREIGN.test(s), `${where} ${l}: lẫn hệ chữ khác “${s}”`);
    if (l === 'vi') ok(VI.test(s), `${where} vi: thiếu dấu tiếng Việt “${s}”`);
    if (!short) {
      const r = s.length / en.length, lo = ['zh', 'ja', 'ko'].includes(l) ? 0.15 : 0.35;
      ok(r >= lo && r <= 3.2, `${where} ${l}: độ dài lệch (×${r.toFixed(2)}) “${s}”`);
      for (const dg of en.match(/\d+/g) || []) ok(s.includes(dg), `${where} ${l}: mất số ${dg}`);
      if (LATIN.includes(l)) for (const nm of NAMES) if (en.includes(nm)) ok(s.includes(nm), `${where} ${l}: mất tên riêng ${nm}`);
    }
  }
}
const ids = fs.readdirSync('content/media/clips').filter(f => f.endsWith('.json')).map(f => f.slice(0, -5));
ok(ids.length >= 2, 'có ≥ 2 clip mẫu');
const PEOPLE = new Set(['ama', 'carlos']);
for (const id of ids) {
  const c = JSON.parse(fs.readFileSync(`content/media/clips/${id}.json`, 'utf8')), W = `[${id}]`;
  ok(c.id === id, `${W} id ≠ tên file`);
  ok(['teacher', 'video'].includes(c.kind) && /^(A1|A2|B1|B2|C1)$/.test(c.level) && c.title, `${W} kind/level/title`);
  ok(Object.values(c.speakers || {}).length && Object.values(c.speakers).every(p => PEOPLE.has(p)), `${W} người nói chỉ Ama/Carlos (nhân vật 2D)`);
  // Bản quyền: chỉ tự làm, public domain, hoặc CC có ghi nguồn
  const s = c.source || {};
  ok(s.type === 'original' ? !!s.author : (['public-domain', 'cc'].includes(s.type) && !!s.url && !!s.author), `${W} nguồn/giấy phép thiếu hoặc không hợp lệ`);
  ok(/^(CC BY|CC0|Public Domain)/.test(c.license || ''), `${W} giấy phép phải CC/PD`);
  if (c.kind === 'video') ok(/^media\//.test(c.src || ''), `${W} video phải tự host (media/…)`);
  ok(c.lines.length >= 3 && c.lines.length <= 30, `${W} 3–30 câu`);
  c.lines.forEach((l, i) => {
    ok(c.speakers[l.who], `${W}#${i} who`);
    ok(/^[\x20-\x7E’]+$/.test(l.text) && M.tokens(l.text).length <= 16, `${W}#${i} câu tiếng Anh ≤ 16 từ, chỉ ASCII`);
    checkTr(`${W}#${i}`, l.text, l.tr, false);
  });
  for (const [k, p] of Object.entries(c.phrases || {})) {
    ok(c.lines.some(l => M.phraseSpans(l.text, { [k]: 1 }).length), `${W} cụm “${k}” không có trong câu nào`);
    ok(p.def && p.def.length >= 8, `${W} cụm “${k}” thiếu def tiếng Anh`);
    checkTr(`${W} cụm “${k}”`, k, p.tr, true);
  }
  ok(Object.keys(c.phrases || {}).length >= 3, `${W} ≥ 3 cụm từ/thành ngữ gạch chân`);

  // ---- 3. Mốc giờ căn theo audio (CI media-clips.yml) ----
  const tp = `content/media/timing/${id}.json`;
  if (!fs.existsSync(tp)) { ok(!strict, `${W} chưa có timing – chạy media-clips.yml`); continue; }
  const tm = JSON.parse(fs.readFileSync(tp, 'utf8'));
  ok(tm.lines.length === c.lines.length, `${W} timing ${tm.lines.length} câu ≠ ${c.lines.length}`);
  const mp3 = `web/${tm.audio}`; ok(fs.existsSync(mp3) && fs.statSync(mp3).size > 10000, `${W} thiếu ${mp3}`);
  let prev = 0;
  tm.lines.forEach((x, i) => {
    ok(x.start >= prev && x.end > x.start + 0.4 && x.end <= tm.dur, `${W}#${i} mốc câu sai thứ tự/chồng nhau (${x.start}–${x.end})`); prev = x.end;
    const tk = M.tokens(c.lines[i] ? c.lines[i].text : '');
    ok(x.words.length === tk.length, `${W}#${i} số mốc từ ${x.words.length} ≠ ${tk.length}`);
    ok(x.words.every((w, k) => w.s >= x.start - 0.05 && w.e <= x.end + 0.05 && w.e >= w.s && (!k || w.s >= x.words[k - 1].s)), `${W}#${i} mốc từ ra ngoài câu/đảo thứ tự`);
    ok(x.match >= 0.6, `${W}#${i} whisper khớp kịch bản ${x.match} < 0.6 (giọng đọc sai chữ?)`);
  });
  const avg = tm.lines.reduce((a, x) => a + x.match, 0) / tm.lines.length; ok(avg >= 0.85, `${W} khớp TB ${avg.toFixed(2)} < 0.85`);
  const wpm = M.wpm(tm.lines.map((x, i) => ({ ...x, text: c.lines[i].text }))); ok(wpm >= 80 && wpm <= 150, `${W} tốc độ ${wpm} wpm ngoài 80–150 (luật video ≤ 150)`);
}
// ---- 4. Dữ liệu dựng khớp nguồn ----
try { execFileSync('node', ['scripts/media/build-clips.mjs', '--check'], { stdio: 'pipe' }); ok(true, ''); } catch (e) { ok(false, 'web/data/media lệch nguồn – chạy node scripts/media/build-clips.mjs\n' + e.stdout); }
if (strict) { const idx = JSON.parse(fs.readFileSync('web/data/media/index.json', 'utf8')); ok(idx.length === ids.length, `index.json có ${idx.length}/${ids.length} clip`); }

// ---- 5. Transcript + thẻ tra từ (jsdom) ----
const dom = new jsdom.JSDOM('<!doctype html><body><div id="tr" style="height:200px;overflow:auto"></div><button id="anchor">x</button></body>', { url: 'https://lexkite.com/app/#/media', runScripts: 'outside-only' });
const w = dom.window; w.HTMLElement.prototype.scrollTo = function () {}; w.t = (k, v) => k.replace(/\{(\w+)\}/g, (_, x) => v[x]);
for (const f of ['cues', 'transcript', 'lookup-card']) w.eval(fs.readFileSync(`web/js/media/${f}.js`, 'utf8'));
const tc = [{ i: 0, who: 'A', start: 0.3, end: 2, text: 'Can I get a latte to go?', tr: { vi: 'Cho tôi một ly latte mang đi?' }, words: [{ w: 'Can', s: 0.3, e: 0.5 }, { w: 'I', s: 0.5, e: 0.6 }, { w: 'get', s: 0.6, e: 0.8 }, { w: 'a', s: 0.8, e: 0.9 }, { w: 'latte', s: 0.9, e: 1.3 }, { w: 'to', s: 1.3, e: 1.5 }, { w: 'go', s: 1.5, e: 1.9 }] },
  { i: 1, who: 'B', start: 2.5, end: 4, text: 'No worries.', tr: { vi: 'Không sao đâu.' } }];
const ev = { seek: [], ph: [], word: [] }, el = w.document.getElementById('tr');
const T = w.MediaTranscript.mount(el, { cues: tc, phrases: { 'can I get': { def: 'order' }, 'to go': { def: 'take away' } }, lang: 'vi', onSeek: (s, i) => ev.seek.push([s, i]), onPhrase: (k, i) => ev.ph.push([k, i]), onWord: (x, i) => ev.word.push([x, i]) });
const rows = el.querySelectorAll('.mt-row');
ok(rows.length === 2 && rows[0].querySelector('.mt-ts').textContent === '0:00' && rows[1].querySelector('.mt-tr').textContent === 'Không sao đâu.', 'transcript: mốc giờ + bản dịch');
ok(rows[0].querySelector('.mt-en').textContent === 'Can I get a latte to go?', 'transcript: chữ hiển thị = câu gốc');
ok(el.querySelectorAll('.mt-ph').length === 2, 'transcript: 2 cụm gạch chân');
T.setTime(1.0); ok(rows[0].classList.contains('on') && rows[0].getAttribute('aria-current') === 'true' && el.querySelectorAll('.w-on').length === 5, 'transcript: câu đang phát tô sáng + karaoke tới "latte"');
T.setTime(3); ok(rows[1].classList.contains('on') && !rows[0].classList.contains('on') && !el.querySelector('.w-on'), 'transcript: chuyển câu, bỏ tô câu cũ');
rows[0].querySelector('.mt-ts').click(); ok(ev.seek.length === 1 && ev.seek[0][0] === 0.3 && ev.seek[0][1] === 0, 'transcript: bấm câu → tua tới mốc câu');
el.querySelector('.mt-ph[data-ph="to go"]').click(); ok(ev.ph.length === 1 && ev.ph[0][0] === 'to go' && ev.seek.length === 1, 'transcript: chạm cụm → tra, không tua');
el.querySelector('.mt-row.on [data-w="4"]').click(); ok(ev.word.length === 1 && ev.word[0][0] === 'latte', 'transcript: câu đang phát, chạm từ → tra từ');
T.showTr(false); ok(el.classList.contains('mt-notr'), 'transcript: tắt bản dịch');
T.setLang('en'); ok(!el.querySelector('.mt-tr'), 'transcript: ngôn ngữ en → không có dòng dịch');
T.setFont(22); ok(el.style.getPropertyValue('--mt-font') === '22px', 'transcript: cỡ chữ');
T.setMode('cloze'); const gaps = el.querySelectorAll('.mt-gap'); ok(gaps.length >= 2, 'transcript: chế độ điền từ có ô trống');
const g0 = gaps[0]; g0.value = g0.dataset.a.toUpperCase(); g0.dispatchEvent(new w.Event('change', { bubbles: true }));
const g1 = gaps[1]; g1.value = 'zzz'; g1.dispatchEvent(new w.Event('change', { bubbles: true }));
ok(g0.classList.contains('ok') && g0.readOnly && g1.classList.contains('bad') && T.score().ok === 1 && T.score().total === gaps.length, 'transcript: chấm từng ô điền từ');
// Thẻ tra từ: cụm có sẵn nghĩa đã dịch → hiện ngay + lưu SRS kèm ngữ cảnh
const saved = []; w.App = { addWord: async (e, ctx) => { saved.push([e, ctx]); return {}; }, inDeck: () => false };
await w.LookupCard.open(w.document.getElementById('anchor'), { text: 'to go', info: { def: 'take away', tr: { vi: 'mang đi', ja: '持ち帰り' } }, sentence: 'Can I get a latte to go?', sentenceTr: '…', title: 'Coffee', lang: 'ja' });
const box = w.document.querySelector('.lkc');
ok(box && box.querySelector('.lkc-mean').textContent === '持ち帰り' && box.querySelector('.lkc-def').textContent === 'take away', 'thẻ tra: nghĩa theo ngôn ngữ mẹ đẻ + def');
box.querySelector('.lkc-save').click(); await new Promise(r => setTimeout(r, 0));
ok(saved.length === 1 && saved[0][0].word === 'to go' && saved[0][1].text === 'Can I get a latte to go?' && box.querySelector('.lkc-save').textContent === 'Đã lưu ✓', 'thẻ tra: lưu vào SRS kèm câu ngữ cảnh');
w.document.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape' })); ok(!w.document.querySelector('.lkc'), 'thẻ tra: Esc đóng');
T.destroy(); ok(!el.innerHTML, 'transcript: destroy');
// Móc nối cho Truyện/Podcast: tô từ mới, avatar theo lượt thoại, nút Đã biết
w.Chars = { img: (who, o) => `<img class="${o.cls}" data-c="${who}">` };
const T2 = w.MediaTranscript.mount(el, { cues: tc, speakers: { A: 'ama', B: 'carlos' }, markWord: t => (t.k === 'latte' ? 'new' : '') });
ok(el.querySelectorAll('[data-w].new').length === 1 && el.querySelector('[data-w].new').textContent === 'latte', 'transcript: markWord tô từ mới');
ok([...el.querySelectorAll('.mt-av')].map(x => x.dataset.c).join() === 'ama,carlos', 'transcript: avatar 2D theo người nói');
T2.destroy();
const known = []; await w.LookupCard.open(w.document.getElementById('anchor'), { text: 'to go', info: { def: 'take away', tr: { vi: 'mang đi' } }, lang: 'vi', onKnown: x => known.push(x) });
w.document.querySelector('.lkc-known').click(); ok(known[0] === 'to go' && !w.document.querySelector('.lkc'), 'thẻ tra: Đã biết → callback + đóng');

// i18n: mọi chuỗi t() của media/* có trong en/media.js hoặc từ điển chung (khóa động t(biến) không bị i18n-missing bắt)
const ctx = { self: {} }; ctx.self = ctx; const vm = await import('node:vm'); vm.createContext(ctx);
vm.runInContext(fs.readFileSync('web/js/i18n/en.js', 'utf8'), ctx); for (const f of fs.readdirSync('web/js/i18n/en')) vm.runInContext(fs.readFileSync('web/js/i18n/en/' + f, 'utf8'), ctx);
const EN = ctx.I18N_DICT.en, dyn = ['Phụ đề', 'Shadowing', 'Chính tả', 'Điền từ', 'Tuyệt vời!', 'Khá tốt!', 'Thử lại nhé'];
for (const k of dyn) ok(EN[k], `i18n: thiếu khóa động “${k}”`);

console.log(fails ? `media: ${fails}/${n} lỗi` : `media: ${n} kiểm tra đạt${strict ? ' (strict)' : ''}`);
process.exit(fails ? 1 : 0);
