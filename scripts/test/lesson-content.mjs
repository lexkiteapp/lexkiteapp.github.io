// Kiểm NỘI DUNG bài học trên MỌI từ chủ đề × mọi dạng × 15 ngôn ngữ (docs/LESSON-UX-V2.md §4) – thuần Node, không mạng.
// Luật: lời dặn khớp dạng · đề xếp câu = bản dịch CÂU (không bao giờ là định nghĩa/nghĩa của TỪ) · đáp án có trong ô · có gợi ý · câu chứa đúng từ ·
//       gõ từ có nghĩa/định nghĩa + độ dài + chữ đầu + ô chữ cái đủ chữ · nhiễu không trùng đáp án · gói bản dịch câu phủ 100 % câu dùng được.
// Chạy: node scripts/test/lesson-content.mjs   (npm test qua scripts/test/lesson.mjs)
import fs from 'node:fs';
import vm from 'node:vm';
import { sentences, shardOf } from '../gen-sent-packs.mjs';

let total = 0, fails = 0; const bad = {};
const ok = (c, m, ex) => { total++; if (!c) { fails++; (bad[m] ||= []).push(ex); } };
const ctx = { self: {} }; ctx.globalThis = ctx.self; vm.createContext(ctx);
vm.runInContext(fs.readFileSync('web/js/lesson/engine.js', 'utf8'), ctx);
const E = ctx.self.LessonEngine;
const UI = fs.readFileSync('web/js/lesson/ui.js', 'utf8');

// 1) Lời dặn của từng dạng có trong TITLE của ui.js và khớp ý dạng bài
const TITLE = { gap: /gap: t\('Chọn từ còn thiếu'\)/, build: /build: it\.prompt \? t\('Xếp câu tiếng Anh'\) : t\('Xếp thành câu'\)/, type: /type: t\('Gõ từ tiếng Anh'\)/, tr: /tr: t\('Dịch câu này'\)/, mean: /mean: t\('Chọn từ đúng'\)/, match: /match: t\('Ghép cặp'\)/, say: /say: t\('Nói câu này'\)/ };
for (const [k, re] of Object.entries(TITLE)) ok(re.test(UI), 'lời dặn khớp dạng (ui.js TITLE)', k);
ok(!/sub = [^;\n]*meanOf\(it\.card\)[^;\n]*build|build[^;\n]*sub = [^;\n]*meanOf/.test(UI) && /it\.type === 'build'\) sub = it\.prompt;/.test(UI), 'đề xếp câu chỉ là bản dịch câu (không rơi về định nghĩa của từ)', 'ui.js');

// 2) Dữ liệu
const S = sentences(), LANGS = ['vi'].concat(fs.readFileSync('scripts/i18n-langs.txt', 'utf8').split('\n').map(s => s.trim()).filter(s => s && !s.startsWith('#')));
const PACK = {}; for (const L of LANGS) { PACK[L] = {}; const d = `web/packs/sent/${L}`; if (fs.existsSync(d)) for (const f of fs.readdirSync(d)) if (f.endsWith('.json')) Object.assign(PACK[L], JSON.parse(fs.readFileSync(`${d}/${f}`, 'utf8'))); }
const card = x => ({ word: x.w.word, pos: x.w.pos, vi: x.w.vi, def: x.w.def, ex: x.w.ex, ipa: x.w.ipa, ipaUS: x.w.ipaUS });
const all = [...S.values()].map(card);
const usable = c => !!E.sentenceOf(c);
for (const c of all) ok(E.norm(c.ex) !== E.norm(c.def), 'câu ví dụ không phải định nghĩa', c.word);

// 3) Độ phủ gói bản dịch câu: mọi câu dùng được trong bài × 14 ngôn ngữ (vi + 13)
for (const L of LANGS) { let miss = 0; const ex = []; for (const c of all) { if (!usable(c)) continue; const v = PACK[L][String(c.word).toLowerCase().trim()]; if (!v || v[0] !== c.ex || !String(v[1] || '').trim()) { miss++; if (ex.length < 3) ex.push(c.word); } } ok(miss === 0, 'gói bản dịch câu phủ đủ', `${L}: thiếu ${miss} (vd ${ex.join(', ')})`); }

// 4) Dựng bài cho từng từ, từng ngôn ngữ, có/không nghe – kiểm mọi bài
const gloss = L => (c, en) => { if (!L) return ''; const v = PACK[L][String(c.word).toLowerCase().trim()]; return v && E.norm(v[0]) === E.norm(en) ? v[1] : ''; };
const mean = L => c => (L === 'vi' ? c.vi || '' : L ? 'm:' + c.word : ''); // nghĩa từ tiếng mẹ đẻ (gói từ kiểm riêng ở word-packs)
const TYPES = ['gap', 'build', 'type', 'say', 'tr', 'mean'];
let n = 0;
for (const [i, c] of all.entries()) {
  const pool = all.slice(Math.max(0, i - 30), i + 30);
  for (const L of ['', 'vi', 'ja', 'ar']) for (const listen of [false, true]) {
    const items = E.build([{ card: c, why: 'new' }], { seed: i + 1, pool, off: { listen }, perWord: 6, match: false, gloss: gloss(L), mean: mean(L) });
    for (const it of items) {
      n++;
      const id = `${c.word}/${L || 'en'}/${listen ? 'no-audio' : 'audio'}/${it.type}`;
      ok(Array.isArray(it.hints) && it.hints.length > 0, 'mỗi bài có gợi ý', id);
      if (it.sent && it.type !== 'say') { const f = E.findWord(it.sent, c.word), k = E.toks(it.sent).length; ok(f && k >= 3 && k <= 14, 'câu chứa đúng từ, 3–14 từ', id); }
      if (it.options) { ok(it.options.some(o => E.norm(o) === E.norm(it.answer)), 'đáp án nằm trong phương án', id); ok(new Set(it.options.map(E.norm)).size === it.options.length, 'phương án không trùng', id); }
      if (it.type === 'build' || it.type === 'tr') {
        const bag = it.tiles.map(E.norm); ok(E.toks(it.answer).every(w => { const j = bag.indexOf(E.norm(w)); if (j < 0) return false; bag.splice(j, 1); return true; }), 'đáp án xếp được từ các ô', id);
        ok(it.prompt || !it.noAudio, 'xếp câu luôn có đề (bản dịch câu hoặc âm thanh)', id);
        if (it.prompt) { const p = E.norm(it.prompt); ok(p !== E.norm(c.def) && p !== E.norm(c.vi) && p !== E.norm(it.mean) && !(c.def && p.includes(E.norm(c.def))), 'đề xếp câu không phải định nghĩa/nghĩa của từ', id); }
        if (L && usable(c) && it.type === 'build') ok(!!it.prompt, 'có bản dịch câu tiếng mẹ đẻ khi người học không dùng tiếng Anh', id);
      }
      if (it.type === 'type') {
        ok(!it.noAudio || it.mean || it.def, 'gõ từ không nghe được vẫn có nghĩa/định nghĩa', id);
        ok(it.len === it.answer.replace(/[\s'-]/g, '').length && it.first === it.answer[0], 'gõ từ: độ dài + chữ đầu đúng', id);
        const bag = it.bank.slice(); ok([...it.answer.toLowerCase()].filter(x => x !== ' ').every(ch => { const j = bag.indexOf(ch); if (j < 0) return false; bag.splice(j, 1); return true; }), 'gõ từ: ô chữ cái đủ để ghép đáp án', id);
        ok(L === '' || L === 'vi' && !c.vi || !!it.mean, 'gõ từ có nghĩa tiếng mẹ đẻ', id);
      }
      ok(TYPES.includes(it.type) || it.type === 'pic', 'dạng hợp lệ', id);
    }
  }
}

console.log(`lesson-content: ${all.length} từ, ${n} bài dựng, ${total} phép kiểm, ${fails} lỗi`);
for (const [m, l] of Object.entries(bad)) console.error(`✗ ${m}: ${l.length} – ${l.slice(0, 5).join(' | ')}`);
process.exit(fails ? 1 : 0);
