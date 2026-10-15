// Pipeline A–Z cho danh sách từ nguồn mở (content/wordlists/*.csv) → web/js/lib/<id>.js (bộ 100 từ, cùng định dạng awl.js).
//   node scripts/gen-wordlist.mjs <nawl|bsl> [--max N]   (mặc định 400 từ mới/lần – chạy dần mỗi đêm trong GitHub Action)
// Mỗi từ: phiên âm + định nghĩa + ví dụ (Free Dictionary API – Wiktionary CC BY-SA; Tatoeba CC BY 2.0 FR dự phòng)
//         + nghĩa tiếng Việt đúng từ loại (Google Translate dt=bd). Kết quả lưu đệm content/wordlists/<id>.cache.json.
// Kiểm tra chất lượng: bỏ từ đã có trong app, bỏ mục thiếu phiên âm/nghĩa/định nghĩa, nghĩa Việt phải có dấu tiếng Việt hoặc là từ mượn hợp lệ.
import fs from 'fs';
const R = new URL('../', import.meta.url), rd = p => fs.readFileSync(new URL(p, R), 'utf8');
const ID = process.argv[2], mi = process.argv.indexOf('--max'), MAX = mi > 0 ? +process.argv[mi + 1] : 400;
const LISTS = {
  nawl: { file: 'content/wordlists/nawl-1.2.csv', title: 'NAWL – Từ học thuật mới', emoji: '🎓', desc: 'New Academic Word List: từ học thuật hay gặp trong IELTS Academic & TOEFL (ngoài AWL)', head: 'New Academic Word List 1.2 © Browne, Culligan & Phillips (newgeneralservicelist.com), CC BY-SA 4.0', level: () => 'C1' },
  bsl: { file: 'content/wordlists/bsl-1.20.csv', title: 'BSL – Từ vựng kinh doanh', emoji: '💼', desc: 'Business Service List: từ vựng công việc, văn phòng, kinh doanh hay gặp trong TOEIC', head: 'Business Service List 1.20 © Browne & Culligan (newgeneralservicelist.com), CC BY-SA 4.0', level: i => (i < 900 ? 'B1' : 'B2') },
};
const L = LISTS[ID]; if (!L) { console.error('dùng: gen-wordlist.mjs <' + Object.keys(LISTS).join('|') + '>'); process.exit(1); }
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function get(url) { for (let i = 0; i < 3; i++) { try { const r = await fetch(url, { headers: { 'User-Agent': 'lexkite-wordlist (support@lexkite.com)' } }); if (r.status === 404) return null; if (r.ok) return await r.json(); if (r.status === 429) await sleep(20000); } catch (e) { /* thử lại */ } await sleep(1500 * (i + 1)); } return undefined; }

// 1) Đọc danh sách nguồn
const csv = rd(L.file).replace(/^﻿/, '').split(/\r?\n/).slice(1).filter(Boolean);
const parseRow = line => { const out = []; let cur = '', q = false; for (const ch of line) { if (ch === '"') q = !q; else if (ch === ',' && !q) { out.push(cur); cur = ''; } else cur += ch; } out.push(cur); return out.map(s => s.trim()); };
const SRC = csv.map(parseRow).map(c => (ID === 'nawl' ? { word: c[0], def: c[1], pos: c[2] } : { word: c[0], def: '', pos: '' })).filter(x => /^[a-z][a-z' -]*$/i.test(x.word));

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
let n = 0;
for (const x of LIST) {
  if (n >= MAX) break;
  const k = x.word.toLowerCase(); if (cache[k]) continue;
  const fd = await get(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(k)}`);
  if (fd === undefined) break; // mạng/giới hạn → lần sau chạy tiếp
  n++;
  const e = { ipa: '', pos: POSN(x.pos), def: x.def || '', ex: '', syn: [] };
  for (const en of Array.isArray(fd) ? fd : []) {
    e.ipa = e.ipa || (en.phonetics || []).map(p => p.text).find(s => s && /^\/.+\/$/.test(s)) || en.phonetic || '';
    for (const m of en.meanings || []) {
      if (!e.pos) e.pos = m.partOfSpeech;
      if (m.partOfSpeech !== e.pos) continue;
      for (const d of m.definitions || []) { if (!e.def) e.def = d.definition; if (!e.ex && d.example && d.example.split(' ').length >= 5 && new RegExp('\\b' + k.slice(0, Math.max(4, k.length - 2)), 'i').test(d.example)) e.ex = d.example; }
      e.syn.push(...(m.synonyms || []));
    }
  }
  if (!e.ex) {
    const tt = await get(`https://api.tatoeba.org/unstable/sentences?lang=eng&q=${encodeURIComponent(k)}&sort=relevance&limit=10`);
    const s = tt && Array.isArray(tt.data) ? tt.data.map(d => d.text).filter(s => s.split(' ').length >= 6 && s.length < 140).sort((a, b) => Math.abs(a.length - 75) - Math.abs(b.length - 75))[0] : '';
    if (s) e.ex = s;
  }
  const gt = await get(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=vi&dt=t&dt=bd&q=${encodeURIComponent(k)}`);
  const bd = gt && Array.isArray(gt[1]) ? gt[1] : [];
  const hit = bd.find(d => d[0] === e.pos) || bd[0];
  e.vi = hit && hit[1] ? hit[1].slice(0, 2).join(', ') : (gt && gt[0] ? gt[0].map(z => z[0]).join('') : '');
  if (!e.pos && hit) e.pos = hit[0];
  e.syn = [...new Set(e.syn)].filter(s => !/\s/.test(s)).slice(0, 3);
  cache[k] = e;
  await sleep(500);
}
fs.writeFileSync(cp, JSON.stringify(cache, null, 1));

// 4) Kiểm tra chất lượng & xuất file
const VI = /[ăâđêôơưàáạảãèéẹẻẽìíịỉĩòóọỏõùúụủũỳýỵỷỹ]/i;
const good = [], bad = [];
LIST.forEach((x, i) => {
  const e = cache[x.word.toLowerCase()]; if (!e) return;
  const why = !e.ipa ? 'thiếu phiên âm' : !e.vi || e.vi.toLowerCase() === x.word.toLowerCase() ? 'thiếu nghĩa' : !VI.test(e.vi) && e.vi.split(' ').length < 2 ? 'nghĩa không phải tiếng Việt' : !e.def ? 'thiếu định nghĩa' : !SHORT[e.pos] ? 'từ loại lạ' : '';
  if (why) { bad.push(x.word + ' – ' + why); return; }
  const ipa = e.ipa.startsWith('/') ? e.ipa : '/' + e.ipa.replace(/^\[|\]$/g, '') + '/';
  good.push([x.word, ipa, SHORT[e.pos], e.vi, e.def.replace(/\s+/g, ' ').trim(), e.ex, '', e.syn.join('|'), L.level(i), '']);
});
const q = s => "'" + String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
let js = `/* ${L.head}. Phiên âm/định nghĩa/ví dụ: Free Dictionary API (Wiktionary, CC BY-SA), Tatoeba (CC BY 2.0 FR); nghĩa tiếng Việt: Lexkite.\n * FILE SINH TỰ ĐỘNG bởi scripts/gen-wordlist.mjs – đừng sửa tay. Row: [word, ipa, pos, vi, def, ex, col, syn, level, emoji] */\n(function (g) {\n  const add = g.IELTS_DATA.add;\n`;
for (let i = 0; i < good.length; i += 100) {
  const part = good.slice(i, i + 100);
  js += `  add('${ID}${i / 100 + 1}', '${L.title} ${i + 1}–${i + part.length}', '${L.emoji}', ${q(L.desc)}, [\n${part.map(r => '    [' + r.map(q).join(', ') + '],').join('\n')}\n  ], '${ID}');\n`;
}
js += '})(typeof self !== \'undefined\' ? self : this);\n';
fs.writeFileSync(new URL(`web/js/lib/${ID}.js`, R), js);
console.log(`✓ ${ID}: ${good.length} từ đạt chuẩn · ${bad.length} bị loại · còn ${LIST.filter(x => !cache[x.word.toLowerCase()]).length} chờ xử lý`);
if (bad.length) console.log('  loại (ví dụ): ' + bad.slice(0, 8).join('; '));
