// Pipeline A–Z cho danh sách từ nguồn mở (content/wordlists/*.csv) → web/js/lib/<id>.js (bộ 100 từ, cùng định dạng awl.js).
//   node scripts/gen-wordlist.mjs <nawl|bsl> [--max N]   (mặc định 400 từ mới/lần – chạy dần mỗi đêm trong GitHub Action)
// Mỗi từ: phiên âm + định nghĩa + ví dụ (Free Dictionary API – Wiktionary CC BY-SA; Tatoeba CC BY 2.0 FR dự phòng)
//         + nghĩa tiếng Việt đúng từ loại (Google Translate dt=bd). Kết quả lưu đệm content/wordlists/<id>.cache.json.
// Kiểm tra chất lượng: bỏ từ đã có trong app, bỏ mục thiếu phiên âm/nghĩa/định nghĩa, nghĩa Việt phải có dấu tiếng Việt hoặc là từ mượn hợp lệ.
import fs from 'fs';
import { normUK } from './lexicon/ipa.mjs'; // IPA Anh chuẩn của app: bỏ (r) tùy chọn, đúng quy ước build-lexicon
import { has as hasForm } from './lib/irregular.mjs';
const R = new URL('../', import.meta.url), rd = p => fs.readFileSync(new URL(p, R), 'utf8');
const ID = process.argv[2], mi = process.argv.indexOf('--max'), MAX = mi > 0 ? +process.argv[mi + 1] : 400;
const LISTS = {
  nawl: { file: 'content/wordlists/nawl-1.2.csv', title: 'NAWL – Từ học thuật mới', emoji: '🎓', desc: 'New Academic Word List: từ học thuật hay gặp trong IELTS Academic & TOEFL (ngoài AWL)', head: 'New Academic Word List 1.2 © Browne, Culligan & Phillips (newgeneralservicelist.com), CC BY-SA 4.0', level: () => 'C1' },
  bsl: { file: 'content/wordlists/bsl-1.20.csv', title: 'BSL – Từ vựng kinh doanh', emoji: '💼', desc: 'Business Service List: từ vựng công việc, văn phòng, kinh doanh hay gặp trong TOEIC', head: 'Business Service List 1.20 © Browne & Culligan (newgeneralservicelist.com), CC BY-SA 4.0', level: i => (i < 900 ? 'B1' : 'B2') },
};
const L = LISTS[ID]; if (!L) { console.error('dùng: gen-wordlist.mjs <' + Object.keys(LISTS).join('|') + '>'); process.exit(1); }
// Định nghĩa Wiktionary lệch nghĩa (trang viết hoa/viết tắt, mã ngôn ngữ, chỉ trỏ sang từ khác) → không dùng
const BADDEF = /ISO 639|NATO|ICAO|radiotelephony|[Aa]lternative (?:form|spelling|letter-case)|^Synonym of|[Ii]nitialism of|[Aa]bbreviation of|Greek alphabet|^A rope\b/;
// Ví dụ phải chứa đúng từ (hoặc biến thể chia -s/-es/-ed/-d/-ing/-ly) – tránh 'denominator' cho denominate
const hasWord = (w, s) => !!s && new RegExp('\\b' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(s|es|ed|d|ing|ly)?\\b', 'i').test(s);
// Câu ví dụ Tatoeba: loại chủ đề nhạy cảm (chính trị, tôn giáo, bạo lực, tình dục…) và bộ nhân vật meme (Sami/Layla…) – không hợp với app học
export const SENSITIVE = /\b(hamas|israel\w*|palestin\w*|gaza|terror\w*|bomb\w*|kill\w*|murder\w*|hitler|nazi\w*|rap(e|ed|ist)|suicide|sex\w*|naked|porn\w*|prostitut\w*|drunk\w*|cocaine|heroin|guns?|shoot\w*|stab\w*|corpse|god|allah|jesus|bible|church|mosque|islam\w*|muslim\w*|christian\w*|jews?|jewish|communis\w*|algeria\w*|kabyle|berber|trump|obama|putin|hate|stupid|idiot|damn|hell|sami|layla|fadil|dania|salima|rima|skura|mennad|baya|yanni|ziri)\b/i;
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function get(url) { for (let i = 0; i < 3; i++) { try { const r = await fetch(url, { headers: { 'User-Agent': 'lexkite-wordlist (support@lexkite.com)' } }); if (r.status === 404) return null; if (r.ok) return await r.json(); if (r.text) { const tx = await r.text(); if (/^\s*\{/.test(tx)) { try { return JSON.parse(tx); } catch (e) { return null; } } } /* {…} = không tìm thấy / đối tượng JSON – không phải lỗi mạng */ if (r.status === 429) await sleep(20000); } catch (e) { /* thử lại */ } await sleep(1500 * (i + 1)); } return undefined; }

// 1) Đọc danh sách nguồn
const csv = rd(L.file).replace(/^﻿/, '').split(/\r?\n/).slice(1).filter(Boolean);
const parseRow = line => { const out = []; let cur = '', q = false; for (const ch of line) { if (ch === '"') q = !q; else if (ch === ',' && !q) { out.push(cur); cur = ''; } else cur += ch; } out.push(cur); return out.map(s => s.trim()); };
const AFFIX = new Set(['non', 'anti', 'pre', 'co', 're', 'mid', 'vice', 'ex', 'sub', 'semi', 'multi', 'inter', 'post', 'pro', 'un', 'dis', 'mis', 'over', 'under', 'self']); // tiền tố trong danh sách gốc – không phải từ độc lập
const SRC = csv.map(parseRow).map(c => (ID === 'nawl' ? { word: c[0], def: c[1], pos: c[2] } : { word: c[0], def: '', pos: '' })).filter(x => /^[a-z][a-z' -]*$/i.test(x.word) && !AFFIX.has(x.word.toLowerCase()));

// 2) Bỏ từ đã có trong app
globalThis.t = s => s;
const g = {};
new Function('self', rd('web/js/data.js'))(g);
for (const f of fs.readdirSync(new URL('web/js/lib/', R))) if (/\.js$/.test(f) && !/^notes/.test(f) && f !== ID + '.js') { try { new Function('self', rd('web/js/lib/' + f))(g); } catch (e) { /* bỏ qua */ } }
const HAVE = new Set(); g.IELTS_DATA.TOPICS.forEach(tp => tp.words.forEach(w => HAVE.add(w.word.toLowerCase())));
const LIST = SRC.filter(x => !HAVE.has(x.word.toLowerCase()));
console.log(`${ID}: ${SRC.length} từ nguồn, ${LIST.length} từ mới chưa có trong app`);

// 3) Làm giàu dữ liệu (có lưu đệm, chạy dần)
const cp = new URL(`content/wordlists/${ID}.cache.json`, R);
const cache = fs.existsSync(cp) ? JSON.parse(fs.readFileSync(cp, 'utf8')) : {};
const POSN = p => /^(n|noun)/.test(p) ? 'noun' : /^(v|verb)/.test(p) ? 'verb' : /^adj/.test(p) ? 'adjective' : /^adv/.test(p) ? 'adverb' : /^prep/.test(p) ? 'preposition' : /^conj/.test(p) ? 'conjunction' : '';
const SHORT = { noun: 'n', verb: 'v', adjective: 'adj', adverb: 'adv', preposition: 'prep', conjunction: 'conj' };
let n = 0, fails = 0, dictFails = 0, dictDown = false;
// Phiên âm dự phòng từ Wiktionary (CC BY-SA) khi Free Dictionary API lỗi/thiếu: ưu tiên giọng RP/UK
async function wikiIPA(w) {
  const j = await get(`https://en.wiktionary.org/w/api.php?action=parse&page=${encodeURIComponent(w)}&prop=wikitext&format=json&formatversion=2`);
  const tx = j && j.parse && j.parse.wikitext || '';
  const all = [...tx.matchAll(/\{\{IPA\|en\|([^}]*)\}\}/g)].map(m => m[1]);
  const pick = all.find(a => /RP|UK/.test(a)) || all[0] || '';
  return (pick.split('|').find(x => /^\/.+\/$/.test(x)) || '');
}
let saved = 0;
for (const x of LIST) {
  if (n >= MAX) break;
  const k = x.word.toLowerCase(); const ce = cache[k]; if (ce && ce.v === 2 && ((ce.ipa && ce.def && ce.vi) || (ce.tries || 0) >= 3)) continue;
  const fd = dictDown ? null : await get(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(k)}`);
  if (fd === undefined && ++dictFails >= 3) { dictDown = true; console.warn('Free Dictionary API lỗi – chuyển sang Wiktionary cho phần còn lại'); } else if (fd) dictFails = 0;
  if (fd === undefined && dictDown && ++fails > 15) { console.warn('dừng ở', k, '– nguồn từ điển lỗi liên tiếp, lần sau chạy tiếp'); break; }
  if (fd !== undefined) fails = 0;
  n++;
  const e = { ipa: '', pos: POSN(x.pos), def: x.def || '', ex: '', syn: [] };
  for (const en of Array.isArray(fd) ? fd : []) {
    e.ipa = e.ipa || (en.phonetics || []).map(p => p.text).find(s => s && /^\/.+\/$/.test(s)) || en.phonetic || '';
    for (const m of en.meanings || []) {
      if (!e.pos) e.pos = m.partOfSpeech;
      if (m.partOfSpeech !== e.pos) continue;
      for (const d of m.definitions || []) { if (!e.def) e.def = d.definition; if (!e.ex && d.example && d.example.split(' ').length >= 5 && !SENSITIVE.test(d.example) && new RegExp('\\b' + k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(s|es|ed|d|ing|ly)?\\b', 'i').test(d.example)) e.ex = d.example; }
      e.syn.push(...(m.synonyms || []));
    }
  }
  if (!e.ipa) e.ipa = await wikiIPA(k);
  if (!e.def) { // Wiktionary REST (CC BY-SA): định nghĩa đúng từ loại nếu có
    const wd = await get(`https://en.wiktionary.org/api/rest_v1/page/definition/${encodeURIComponent(k)}`);
    const ens = wd && Array.isArray(wd.en) ? wd.en : [];
    const pe = ens.find(z => z.partOfSpeech && POSN(z.partOfSpeech.toLowerCase()) === e.pos) || ens[0];
    const d0 = pe && (pe.definitions || []).map(z => String(z.definition || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()).find(z => z.length > 8 && !/^\(.*\)$/.test(z) && !BADDEF.test(z));
    if (d0) { e.def = d0.slice(0, 200); if (!e.pos) e.pos = POSN(pe.partOfSpeech.toLowerCase()); }
  }
  if (!e.ex) {
    const tt = await get(`https://api.tatoeba.org/unstable/sentences?lang=eng&q=${encodeURIComponent(k)}&sort=relevance&limit=10`);
    const s = tt && Array.isArray(tt.data) ? tt.data.map(d => d.text).filter(s => s.split(' ').length >= 6 && s.length < 140 && hasWord(k, s) && !SENSITIVE.test(s)).sort((a, b) => Math.abs(a.length - 75) - Math.abs(b.length - 75))[0] : '';
    if (s) e.ex = s;
  }
  // Nghĩa: bản dịch thông dụng (dt=t) là nghĩa chính – dữ liệu từ điển (dt=bd) của từ hiếm thường cổ/lệch, chỉ dùng bổ sung khi từ phổ biến (≥ 3 nghĩa)
  const gt = await get(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=vi&dt=t&dt=bd&q=${encodeURIComponent(k)}`);
  const bd = gt && Array.isArray(gt[1]) ? gt[1] : [];
  if (bd.length && e.pos && !bd.some(d => d[0] === e.pos)) e.pos = bd[0][0]; // từ loại trong danh sách gốc sai (vd. portrayal ghi adj) → theo từ điển
  const plain = gt && gt[0] ? gt[0].map(z => z[0]).join('').trim() : '';
  const hit = bd.find(d => d[0] === e.pos);
  const extra = hit && hit[1] && hit[1].length >= 3 ? hit[1].find(x => x && x.toLowerCase() !== plain.toLowerCase() && !plain.toLowerCase().includes(x.toLowerCase())) : '';
  e.vi = plain && plain.toLowerCase() !== k ? [plain, extra].filter(Boolean).join(', ') : (hit && hit[1] ? hit[1].slice(0, 2).join(', ') : '');
  if (!e.pos && bd[0]) e.pos = bd[0][0];
  e.v = 2; e.tries = ((ce && ce.tries) || 0) + 1;
  if (ce) { e.ipa = e.ipa || ce.ipa || ''; e.def = e.def || ce.def || ''; e.ex = e.ex || ce.ex || ''; }
  e.syn = [...new Set(e.syn)].filter(s => !/\s/.test(s)).slice(0, 3);
  cache[k] = e;
  if (++saved % 25 === 0) fs.writeFileSync(cp, JSON.stringify(cache, null, 1)); // lưu dần: dừng giữa chừng không mất tiến độ
  await sleep(900);
}
fs.writeFileSync(cp, JSON.stringify(cache, null, 1));

// 4) Kiểm tra chất lượng & xuất file
// Sửa lỗi chính tả hay gặp trong dữ liệu từ điển (bảng VI_TYPO dùng chung với vi-lint & app) – dữ liệu Google có lỗi như "giửa", "dể"
const TYPO = JSON.parse(rd('web/js/dictionary.js').match(/const VI_TYPO = (\{[^}]*\})/)[1]);
const fixVi = v => String(v).normalize('NFC').replace(/[\p{L}]+/gu, w => { const r = TYPO[w.toLowerCase()]; return r ? (w[0] === w[0].toUpperCase() ? r[0].toUpperCase() + r.slice(1) : r) : w; });
const OLDTONE = /(?<![\p{L}q])(?:[bcdđghklmnprstvx]|ch|kh|ng|nh|ph|th|tr)?(oà|oá|oả|oã|oạ|oè|oé|oẻ|oẽ|oẹ|uỳ|uý|uỷ|uỹ|uỵ)(?!\p{L})/iu;
for (const k in cache) if (cache[k] && cache[k].vi) cache[k].vi = fixVi(cache[k].vi);
const VI = /[À-ỹđĐ]/u;
 // mọi chữ Latin có dấu (gồm dấu kép ố, ắ, ữ…) – nghĩa tiếng Việt hầu như luôn có dấu
// Sửa tay sau khi duyệt (content/wordlists/<id>.fix.json): { "từ": "nghĩa đúng" } hoặc "-" để loại từ (thuật ngữ lệch ngữ cảnh, nghĩa máy dịch sai)
const FIX = (() => { try { return JSON.parse(rd(`content/wordlists/${ID}.fix.json`)); } catch (e) { return {}; } })();
const EDIT = (() => { try { return JSON.parse(rd(`content/wordlists/${ID}.edit.json`)); } catch (e) { return {}; } })(); // sửa tay: { "từ": { def, ex, pos, vi, level? } }
// Cấp độ CEFR theo danh sách công khai Oxford 3000/5000 (từ + từ loại → cấp), chỉ các từ của nawl/bsl. Từ ngoài danh sách giữ mặc định L.level(i)
const CEFR = (() => { try { return JSON.parse(rd('content/wordlists/cefr-oxford.json')); } catch (e) { return {}; } })();
const cleanDef = d => String(d).replace(/\.mw-parser-output[^}]*\}/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&\w+;/g, '').replace(/\s+/g, ' ').replace(/\s+([.,;])/g, '$1').trim();
const good = [], bad = [];
LIST.forEach((x, i) => {
  const e = cache[x.word.toLowerCase()]; if (!e) return;
  if (FIX[x.word] === '-') { bad.push(x.word + ' – loại khi duyệt tay'); return; }
  const ed = EDIT[x.word] || {}; const def = cleanDef(ed.def || e.def || ''), ex = ed.ex || (e.ex && !SENSITIVE.test(e.ex) ? e.ex : '');
  const why = !ed.def ? 'chờ biên soạn định nghĩa (CONTENT-RULES: định nghĩa tự viết)' : !e.ipa ? 'thiếu phiên âm' : !e.vi || e.vi.toLowerCase() === x.word.toLowerCase() ? 'thiếu nghĩa' : !VI.test(e.vi) && e.vi.split(' ').length < 2 ? 'nghĩa không phải tiếng Việt' : !def ? 'thiếu định nghĩa' : !ed.def && BADDEF.test(def) ? 'định nghĩa lệch nghĩa (mã ngôn ngữ/dạng khác…) – cần sửa tay' : OLDTONE.test(e.vi) ? 'kiểu bỏ dấu cũ' : !SHORT[e.pos] ? 'từ loại lạ' : '';
  if (why) { bad.push(x.word + ' – ' + why); return; }
  const ipa = ('/' + e.ipa.replace(/^[\/\[]|[\/\]]$/g, '') + '/').replace(/ɹ/g, 'r').replace(/ɫ/g, 'l').replace(/\.(?=\S)/g, '').replace(/ɛ/g, 'e').replace(/ɝ/g, 'ɜː').replace(/ɚ/g, 'ə').replace(/oʊ/g, 'əʊ').replace(/ɾ/g, 't').replace(/d͡ʒ/g, 'dʒ').replace(/t͡ʃ/g, 'tʃ'); // ô phiên âm là giọng Anh – Wiktionary hay lẫn dạng Mỹ
  const viMain = FIX[x.word] || String(e.vi).split(/,\s*/)[0].trim(); // chỉ giữ nghĩa thông dụng chính – nghĩa phụ từ dữ liệu từ điển hay lệch/lặp
  good.push([x.word, normUK(ipa.replace(/[\u032F\u02D1\u0329\u0306]/g, ''), x.word), ed.pos || SHORT[e.pos], ed.vi || viMain, def, (ed.ex || hasWord(x.word, ex) || hasForm(x.word, ex)) ? ex : '', '', e.syn.join('|'), ed.level || (CEFR[x.word.toLowerCase()] || {})[ed.pos || SHORT[e.pos]] || L.level(i), '']);
});
const q = s => "'" + String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
let js = `/* ${L.head}. Phiên âm: Wiktionary (CC BY-SA); định nghĩa tiếng Anh, câu ví dụ, nghĩa tiếng Việt: Lexkite tự biên soạn (content/wordlists/<id>.edit.json).\n * FILE SINH TỰ ĐỘNG bởi scripts/gen-wordlist.mjs – đừng sửa tay. Row: [word, ipa, pos, vi, def, ex, col, syn, level, emoji] */\n(function (g) {\n  const add = g.IELTS_DATA.add;\n`;
for (let i = 0; i < good.length; i += 100) {
  const part = good.slice(i, i + 100);
  js += `  add('${ID}${i / 100 + 1}', '${ID.toUpperCase()} ${i + 1}–${i + part.length}', '${L.emoji}', ${q(L.desc)}, [\n${part.map(r => '    [' + r.map(q).join(', ') + '],').join('\n')}\n  ], '${ID}');\n`;
}
js += '})(typeof self !== \'undefined\' ? self : this);\n';
fs.writeFileSync(new URL(`web/js/lib/${ID}.js`, R), js);
console.log(`✓ ${ID}: ${good.length} từ đạt chuẩn · ${bad.length} bị loại · còn ${LIST.filter(x => !cache[x.word.toLowerCase()]).length} chờ xử lý`);
if (bad.length) console.log('  loại (ví dụ): ' + bad.slice(0, 8).join('; '));
