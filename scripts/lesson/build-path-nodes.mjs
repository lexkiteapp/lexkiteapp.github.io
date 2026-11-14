// Nội dung nút Lộ trình (content/lesson/path-nodes.json) → web/cpack/lesson/path-nodes.js, có kiểm: từ phải CÓ trong kho + đúng CEFR chặng,
// câu ví dụ là ví dụ nguyên văn của kho (không câu AI mới), tên bài không chỉ là tên loại bài, mọi chữ Việt có bản en (pathn).
// Dùng: node scripts/lesson/build-path-nodes.mjs [--check]
import fs from 'node:fs';
import { loadAll } from '../lexicon/lib.mjs';
const SRC = 'content/lesson/path-nodes.json', OUT = 'web/cpack/lesson/path-nodes.js', EN = 'web/js/i18n/en/pathn.js', EN_DIR = 'web/js/i18n/en/'; // chữ mới → pathn.js; khóa đã dịch sẵn ở nhóm khác (vd. câu "Bạn sẽ…" ở ux1.js) dùng lại
const SLOTS = ['lesson', 'listen', 'speak', 'story', 'review', 'exam'], WORD_SLOTS = ['lesson', 'listen', 'speak', 'review'], LV = { A1: 1, A2: 2, B1: 3, B2: 4, C1: 5, C2: 6 };
const BARE = /^(bài học|nghe|nói|truyện|radio|ôn|ôn tập|ôn lỗi|kiểm tra)$/i, TITLE_MAX = 32, SUB_MAX = 40;
const J = JSON.parse(fs.readFileSync(SRC, 'utf8')), err = [];
const kho = new Map(); for (const e of loadAll()) { const k = e.row[0].toLowerCase(); (kho.get(k) || kho.set(k, []).get(k)).push(e.row); }
const stories = new Set(JSON.parse(fs.readFileSync('content/lesson/stories.json', 'utf8')).items.map(s => s.id));
const enKeys = new Set(fs.readdirSync(EN_DIR).filter(f => f.endsWith('.js')).flatMap(f => [...fs.readFileSync(EN_DIR + f, 'utf8').matchAll(/^"((?:[^"\\]|\\.)*)":/gm)].map(m => JSON.parse('"' + m[1] + '"'))));
const posOf = p => ({ noun: 'n', verb: 'v', adjective: 'adj', adverb: 'adv', preposition: 'prep', exclamation: 'excl', determiner: 'det' }[p] || p);
const uses = (s, w) => new RegExp(`\\b${w.replace(/e$/, '(?:e)?').replace(/y$/, '(?:y|ie)')}(?:s|es|ed|d|ing)?\\b`, 'i').test(s);
const need = (s, at) => { if (!enKeys.has(s)) err.push(`${at}: thiếu bản en trong ${EN}: ${JSON.stringify(s)}`); };
for (const [uid, u] of Object.entries(J.units)) {
  const cap = LV[u.cap]; if (!cap) err.push(`${uid}: cap`);
  need(u.theme, uid + '.theme'); need(u.can, uid + '.can');
  if (u.nodes.length !== 6 || u.nodes.some((n, i) => n.slot !== SLOTS[i])) { err.push(`${uid}: cần đúng 6 ô theo thứ tự ${SLOTS.join(',')}`); continue; }
  const seen = new Map();
  u.nodes.forEach(n => {
    const at = `${uid}.${n.slot}`;
    if (n.slot === 'story' && !n.story) { if (n.title || n.sub || (n.words || []).length || (n.ex || []).length) err.push(`${at}: chưa có truyện thì ô để trống (app hiện tên chặng)`); return; } // chưa có truyện đúng chủ đề → không bịa
    if (!n.title || n.title.length > TITLE_MAX || BARE.test(n.title.trim())) err.push(`${at}: title rỗng/quá ${TITLE_MAX} ký tự/chỉ là tên loại bài`);
    if (!n.sub || n.sub.length > SUB_MAX) err.push(`${at}: sub rỗng/quá ${SUB_MAX} ký tự`);
    if (!(n.min >= 2 && n.min <= 10)) err.push(`${at}: min`);
    need(n.title, at + '.title'); need(n.sub, at + '.sub');
    const isW = WORD_SLOTS.includes(n.slot);
    if (n.slot === 'story') { if (!stories.has(n.story)) err.push(`${at}: story "${n.story}" không có trong content/lesson/stories.json`); } else if (n.story) err.push(`${at}: chỉ ô story có story`);
    if (!isW) { if (n.words.length || n.ex.length) err.push(`${at}: ô này không có words/ex`); return; }
    if (n.words.length !== 4) err.push(`${at}: cần đúng 4 từ`);
    if (!n.ex.length || n.ex.length > 2) err.push(`${at}: cần 1–2 câu ví dụ`);
    for (const [w, pos] of n.words) {
      const rows = (kho.get(w) || []).filter(r => posOf(r[2]) === pos);
      if (!rows.length) { err.push(`${at}: từ "${w}" (${pos}) không có trong kho`); continue; }
      if (Math.min(...rows.map(r => LV[r[8]] || 9)) > cap) err.push(`${at}: "${w}" cấp ${rows[0][8]} vượt cap ${u.cap}`);
      if (n.slot !== 'review') { if (seen.has(w)) err.push(`${at}: "${w}" trùng với ô ${seen.get(w)}`); seen.set(w, n.slot); } else if (!seen.has(w)) err.push(`${at}: từ ôn "${w}" chưa học ở 3 ô trước`);
    }
    for (const x of n.ex) {
      need(x.vi, at + '.ex');
      const rows = n.words.flatMap(([w]) => (kho.get(w) || []).filter(r => uses(x.en, w)));
      if (!rows.length) err.push(`${at}: câu "${x.en}" không dùng từ nào trong words`);
      else if (!rows.some(r => r[5] === x.en)) err.push(`${at}: câu "${x.en}" không phải ví dụ nguyên văn của kho (ưu tiên câu có sẵn)`);
    }
  });
}
if (err.length) { console.error('✗ path-nodes:\n  ' + err.join('\n  ')); process.exit(1); }
const out = { v: J.v, units: {} };
for (const [uid, u] of Object.entries(J.units)) out.units[uid] = { theme: u.theme, can: u.can, nodes: u.nodes.map(n => ({ slot: n.slot, title: n.title || '', sub: n.sub || '', words: (n.words || []).map(([w, pos]) => { const r = kho.get(w).find(x => posOf(x[2]) === pos); return { w, pos, vi: r[3], def: r[4], ipa: r[1], ipaUS: r[10] || r[1] }; }), ex: n.ex || [], min: n.min || 0, xp: null, story: n.story || null })).map(n => n.story || n.slot !== 'story' ? n : { slot: 'story', title: '', sub: '', words: [], ex: [], min: 0, xp: null, story: null }) };
const text = `/* FILE SINH TỰ ĐỘNG – scripts/lesson/build-path-nodes.mjs từ ${SRC}. Đừng sửa tay. Nội dung nút Lộ trình (tải lười; chữ Việt qua t() – nhóm i18n pathn). */\nself.LESSON_PATH_NODES = ${JSON.stringify(out)};\n`;
if (process.argv.includes('--check')) { if ((fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '') !== text) { console.error(`✗ ${OUT} cũ – chạy node scripts/lesson/build-path-nodes.mjs`); process.exit(1); } console.log('✓ path-nodes khớp nguồn + kiểm kho/CEFR/ví dụ'); }
else { fs.writeFileSync(OUT, text); console.log(`✓ ${OUT}: ${Object.keys(out.units).length} chặng`); }
