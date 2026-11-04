// Cổng dấu câu + viết hoa của MỌI câu tiếng Anh dạng bài (docs/specs/learn-card.md): lỗi mới → đỏ; ngoại lệ phải ghi lý do trong content/lesson/card/punct-exceptions.json.
// Chạy: node scripts/test/sentence-punct.mjs  (--list in hết để sửa). Sửa bằng dữ liệu/bộ sinh, không vá màn.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
const R = '.', J = f => JSON.parse(fs.readFileSync(path.join(R, f), 'utf8'));
const EXC = J('content/lesson/card/punct-exceptions.json').sentences, LIST = process.argv.includes('--list');
export function issues(x) {
  const s = String(x), out = [];
  if (!/^["“'‘(¿¡A-Z0-9]/.test(s)) out.push('thiếu viết hoa đầu câu');
  if (!/[.!?…:"”')\]]$/.test(s)) out.push('thiếu dấu cuối câu');
  if (/\s[,.;:!?]/.test(s)) out.push('cách trước dấu');
  if (/\s{2,}/.test(s)) out.push('hai dấu cách');
  if (/(^|[\s"“])i(\s|'[a-z])/.test(s)) out.push('"i" viết thường');
  if (/[a-z][,;:][A-Za-z]/.test(s)) out.push('thiếu cách sau dấu');
  if (/([,.;:!?])\1/.test(s) && !/\.\.\./.test(s)) out.push('lặp dấu');
  return out;
}
// Tự kiểm bộ dò
for (const [t, bad] of [['Hi Can I have a large coffee please', true], ['Hi! Can I have a large coffee, please?', false], ['what is this?', true], ['Yes , it is.', true], ['and i said so.', true], ['“Stop!” she said.', false]]) if (!!issues(t).length !== bad) { console.error('✗ sentence-punct tự kiểm: ' + t); process.exit(1); }

const src = {};
const add = (name, s) => { s = String(s || '').trim(); if (s) (src[name] = src[name] || new Set()).add(s); };
// 1) Câu ví dụ của từ (xếp câu, điền từ, nói theo)
globalThis.t = globalThis.t || (s => s);
const g = {};
new Function('self', fs.readFileSync('web/js/data.js', 'utf8'))(g);
for (const f of fs.readdirSync('web/js/lib').sort()) if (/\.js$/.test(f) && !/^notes/.test(f)) { try { new Function('self', fs.readFileSync('web/js/lib/' + f, 'utf8'))(g); } catch (e) { /* tệp phụ */ } }
for (const tp of g.IELTS_DATA.TOPICS) for (const w of tp.words || []) add('ex', w.ex);
// 2) Truyện/Radio + câu hỏi
for (const s of J('content/lesson/stories.json').items) { s.lines.forEach(l => add('stories', l.en)); (s.checks || []).filter(c => c.type === 'q').forEach(c => add('stories-q', c.q)); }
// 3) Kho gold
for (const L of Object.values(J('web/packs/lesson/gold.json'))) for (const g2 of L) { (g2.ex || []).forEach(x => add('gold', x)); if (g2.r && !/^[A-Za-z]+(-[A-Za-z]+)+$/.test(g2.r)) add('gold', g2.r); } // r dạng "ad-ver-TISE-ment" = cách nhấn âm, không phải câu
// 4) Ngữ pháp: mọi ví dụ/câu xếp (GRAMMAR.*.blocks)
{ const ctx = { self: {}, t: s => s }; ctx.globalThis = ctx.self; vm.createContext(ctx);
  for (const f of fs.readdirSync('web/js/grammar').filter(f => /\.js$/.test(f))) { try { vm.runInContext(fs.readFileSync('web/js/grammar/' + f, 'utf8'), ctx); } catch (e) { /* tệp phụ thuộc */ } }
  const walk = (o, k) => { if (typeof o === 'string') { if (/^(ex|en|s|sent|right|correct|good|sentence)$/.test(k || '') && /\s/.test(o) && /^[A-Za-z"“]/.test(o) && !/[À-ỹ]/.test(o) && !/[_+…/→]|\b(S|V|Ving|V-ing)\b/.test(o)) add('grammar', o); return; } if (Array.isArray(o)) o.forEach(x => walk(x, k)); else if (o && typeof o === 'object') Object.entries(o).forEach(([a, b]) => { if (!(a === 'en' && o.title)) walk(b, a); }); }; // en cạnh title = tên bài, không phải câu
  walk(ctx.self.GRAMMAR || [], ''); }
// 5) Giao tiếp tự tin + kho mẫu câu thẻ kết quả
{ const ctx = { self: {} }; ctx.globalThis = ctx.self; vm.createContext(ctx); vm.runInContext(fs.readFileSync('web/js/confidence/data.js', 'utf8'), ctx);
  const walk = (o, k) => { if (typeof o === 'string') { if (/^(say|not|en|ex|model|line|ai|t)$/.test(k || '') && /\s/.test(o) && !/[À-ỹ]/.test(o) && !/[_…]/.test(o)) add('confidence', o); return; } if (Array.isArray(o)) o.forEach(x => walk(x, k)); else if (o && typeof o === 'object') Object.entries(o).forEach(([a, b]) => walk(b, a)); };
  walk(ctx.self.CONF.units.map(u => ({ say: u.phrases, dialogue: u.dialogue, roleplay: u.roleplay })), ''); }
// 6) Lời thoại Nghe (chép chính tả, câu hỏi nghe)
{ const ctx = { self: {}, t: s => s, I18N: { t: s => s } }; ctx.globalThis = ctx.self; ctx.window = ctx.self; vm.createContext(ctx);
  for (const f of fs.readdirSync('web/js/listen').filter(f => /^test\d+\.js$/.test(f))) { try { vm.runInContext(fs.readFileSync('web/js/listen/' + f, 'utf8'), ctx); } catch (e) { /* tệp phụ thuộc */ } }
  const walk = (o, k) => { if (typeof o === 'string') { if (k === 't' && /\s/.test(o) && /^[A-Za-z"“]/.test(o) && !/[À-ỹ]/.test(o)) add('listening', o); return; } if (Array.isArray(o)) o.forEach(x => walk(x, k)); else if (o && typeof o === 'object') Object.entries(o).forEach(([a, b]) => walk(b, a)); };
  walk(ctx.self, ''); }
// 7) Câu đổi từ của mẫu câu
if (fs.existsSync('content/lesson/card/frames.json')) for (const f of J('content/lesson/card/frames.json').frames) (f.alts || []).forEach(a => add('frames', a.replace(/[[\]]/g, '')));
let all = 0, bad = 0; const rep = [];
for (const [name, set] of Object.entries(src)) {
  let n = 0; for (const s of set) { all++; const iss = issues(s); if (!iss.length || EXC[s]) continue; n++; bad++; rep.push(`${name}: ${iss.join(', ')}: ${s}`); }
  console.log(`  ${name}: ${set.size} câu, ${n} lỗi`);
}
for (const k of Object.keys(EXC)) if (!EXC[k] || EXC[k].length < 5) { console.error(`✗ ngoại lệ thiếu lý do: ${k}`); bad++; }
if (bad) { console.error(`✗ sentence-punct: ${bad} câu sai dấu/viết hoa\n  ` + (LIST ? rep : rep.slice(0, 30)).join('\n  ')); process.exit(1); }
console.log(`✓ sentence-punct: ${all} câu đúng dấu + viết hoa (${Object.keys(EXC).length} ngoại lệ có lý do)`);
