// Tìm chuỗi giao diện tiếng Việt chưa có bản tiếng Anh (en/*.js) → tránh lẫn tiếng khi người học dùng ngôn ngữ khác.
// Quét t('…'), data-i18n="…" và tên/mô tả bộ từ add(id, 'tên', emoji, 'mô tả', …). In danh sách thiếu; --strict → thoát mã 1 nếu có.
import fs from 'node:fs'; import path from 'node:path'; import vm from 'node:vm';
const c = { self: {} }; c.self = c; vm.createContext(c); vm.runInContext(fs.readFileSync('web/js/i18n/en.js', 'utf8'), c);
const EN = c.I18N_DICT.en, VI = /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i;
const files = []; const walk = d => { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) { if (!/i18n|notes/.test(f)) walk(p); } else if (/\.(js|html)$/.test(p)) files.push(p); } }; walk('web/js'); files.push('web/index.html');
const miss = new Map(), un = (s, q = "'") => { try { return vm.runInNewContext(q + s + q); } catch (e) { return s; } };
for (const f of files) {
  const s = fs.readFileSync(f, 'utf8');
  const keys = [...s.matchAll(/\bt\('((?:[^'\\]|\\.)*)'/g), ...s.matchAll(/\bt\("((?:[^"\\]|\\.)*)"/g)].map(m => un(m[1], m[0][2])).concat([...s.matchAll(/data-i18n="([^"]*)"/g)].map(m => m[1].replace(/&amp;/g, '&')));
  for (const m of s.matchAll(/\badd\('[^']+', '((?:[^'\\]|\\.)*)', '[^']*', '((?:[^'\\]|\\.)*)'/g)) keys.push(un(m[1]), un(m[2]));
  for (const k of keys) if (k && VI.test(k) && !Object.hasOwn(EN, k) && !k.includes('${')) miss.set(k, f);
}
for (const [k, f] of miss) console.log(`${f}: ${k.slice(0, 110)}`);
console.log(miss.size ? `⚠ i18n: ${miss.size} chuỗi chưa có bản tiếng Anh` : '✓ i18n: mọi chuỗi giao diện đều có bản tiếng Anh');
process.exit(miss.size && process.argv.includes('--strict') ? 1 : 0);
