// Gói dịch giao diện 13 ngôn ngữ (ngoài en/vi) – MỘT chỗ định nghĩa nguồn ↔ tệp chạy. docs/I18N-PIPELINE.md §1.
//  - NGUỒN (dễ đọc, người/bot sửa ở đây): i18n/ui/<lang>.js + i18n/ui/<lang>/<nhóm>.js – khóa = nguyên câu tiếng Việt, như trước 3/11.
//  - TỆP CHẠY (sinh, đừng sửa tay): web/js/i18n/<lang>.js + web/js/i18n/<lang>/<nhóm>.js – khóa = hk(câu tiếng Việt) ("_" + FNV-1a 32 bit, base36),
//    bớt ~3 MB khóa lặp trên 13 ngôn ngữ. web/js/i18n.js tra D[lang][khóa] rồi D[lang][hk(khóa)].
//  - Hai khóa trùng băm (hoặc một khóa trông như băm của khóa khác) → cả hai giữ NGUYÊN câu làm khóa: không bao giờ hiện nhầm bản dịch.
// Dựng: node scripts/i18n-pack.mjs (build-i18n.sh gọi). Kiểm: node scripts/i18n-pack.mjs --check (test i18n-pack.mjs).
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const SRC = 'i18n/ui';
export const OUT = 'web/js/i18n';
export const LANGS = fs.readFileSync(path.join(ROOT, 'scripts/i18n-langs.txt'), 'utf8').split('\n').map(s => s.trim()).filter(s => s && !s.startsWith('#'));
export const LAZY = ((fs.readFileSync(path.join(ROOT, 'scripts/build-i18n.sh'), 'utf8').match(/^LAZY="([^"]*)"/m) || [])[1] || '').split(/\s+/).filter(Boolean);

/** Khóa ngắn – PHẢI giống hệt hk trong web/js/i18n.js và extension/*.js (test i18n-pack.mjs so khớp). */
export function hk(s) { let x = 0x811c9dc5; for (let i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 0x01000193); } return '_' + ((x >>> 0) % 1679616).toString(36); }

/** Đường dẫn nguồn (tương đối ROOT): nhóm rỗng = gói lõi <lang>.js. */
export const srcPath = (lang, group) => (group ? `${SRC}/${lang}/${group}.js` : `${SRC}/${lang}.js`);
// Nhóm nội dung nút Lộ trình: gói chạy nằm ở web/cpack (giữ gói ngôn ngữ web/js dưới langPackMax; tiền lệ #788) – nguồn và bản en vẫn như mọi nhóm; đường dẫn đủ chữ ở App.pathnPack (web/js/app.js) để build-cpack thay mã băm.
export const CPACK_GROUP = 'pathn';
export const outPath = (lang, group) => (group === CPACK_GROUP ? `web/cpack/lesson/pn-${lang}.js` : group ? `${OUT}/${lang}/${group}.js` : `${OUT}/${lang}.js`);

/** Chạy một tệp từ điển (định dạng D[l] = Object.assign(…)) → từ điển của ngôn ngữ đầu tiên trong tệp. */
export function loadDictFile(file) {
  const f = path.isAbsolute(file) ? file : path.join(ROOT, file);
  if (!fs.existsSync(f)) return {};
  const ctx = { I18N_DICT: {} }; ctx.self = ctx; vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(f, 'utf8'), ctx);
  return Object.values(ctx.I18N_DICT || {})[0] || {};
}
/** Nguồn một ngôn ngữ: lõi + (mặc định) mọi nhóm tải lười gộp lại – thay cho việc đọc web/js/i18n/<lang>.js. */
export function loadLang(lang, { lazy = true, groups } = {}) {
  const out = { ...loadDictFile(srcPath(lang)) };
  for (const g of groups || (lazy ? LAZY : [])) Object.assign(out, loadDictFile(srcPath(lang, g)));
  return out;
}
/** Nguồn đúng một tệp (lõi khi group rỗng). */
export const loadSrc = (lang, group) => loadDictFile(srcPath(lang, group));

/** Định dạng chuẩn tệp NGUỒN (gen-i18n, split-i18n, i18n-fix, confidence/build… cùng ghi kiểu này). */
export function srcText(lang, group, dict) {
  const head = group ? `/* UI ${lang} – ${group} (nhóm tải lười). Nguồn dễ đọc: sửa ở đây rồi chạy node scripts/i18n-pack.mjs. */`
    : `/* UI ${lang} – nguồn (dịch máy từ en.js bằng scripts/gen-i18n.mjs, hiệu đính tay được; chạy lại chỉ dịch khóa mới). Sau khi sửa: node scripts/i18n-pack.mjs. */`;
  return `${head}\n(function (g) { const D = g.I18N_DICT = g.I18N_DICT || {}; D[${JSON.stringify(lang)}] = Object.assign(D[${JSON.stringify(lang)}] || {}, {\n${srcBody(dict)}});\n})(typeof self !== 'undefined' ? self : this);\n`;
}
/** Thân từ điển nguồn: MỖI KHÓA MỘT DÒNG, sắp theo khóa, dòng nào cũng có dấu phẩy cuối – hai PR thêm khóa khác nhau không bao giờ sửa cùng dòng
 *  (trước 10/11 cả tệp là MỘT dòng JSON → mọi PR thêm bản dịch xung đột nhau). Kiểm: node scripts/fmt-stable.mjs --check. */
export const srcBody = dict => Object.keys(dict).sort().map(k => `${JSON.stringify(k)}:${JSON.stringify(dict[k])},\n`).join('');
export const writeSrc = (lang, group, dict) => { const f = path.join(ROOT, srcPath(lang, group)); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, srcText(lang, group, dict)); };

/** Khóa nguyên câu không được nằm trong không gian băm "_[0-9a-z]+": add-on tra băm TRƯỚC (nền en của nó giữ khóa nguyên câu). */
export const HASHLIKE = /^_[0-9a-z]{1,7}$/;
/** Tập khóa phải giữ nguyên văn (hai khóa trùng băm → cả hai; tra băm sẽ không thấy gì, tra nguyên câu ra đúng). Thuần. */
export function verbatimKeys(keys) {
  const by = new Map(), all = new Set(keys);
  for (const k of all) {
    if (HASHLIKE.test(k)) throw new Error(`i18n-pack: khóa ${JSON.stringify(k)} trông như khóa băm – đổi câu khóa (vd. bỏ "_" đầu)`);
    const h = hk(k); if (!by.has(h)) by.set(h, []); by.get(h).push(k);
  }
  const keep = new Set();
  for (const ks of by.values()) if (ks.length > 1) ks.forEach(k => keep.add(k));
  return keep;
}
/** Tệp chạy gọn từ một từ điển nguồn. Thuần. Giữ "});" ngay sau từ điển (background.js của add-on cắt JSON theo mốc này). */
export function packText(lang, group, dict, keep = verbatimKeys(Object.keys(dict))) {
  // Khóa băm viết TRẦN (không ngoặc kép: "_ab12" hợp lệ làm tên thuộc tính) – bớt 2 B/mục; khóa nguyên câu vẫn có ngoặc.
  // background.js (add-on) gỡ ngoặc bằng regex /([{,])(_[0-9a-z]+):/ → cấm giá trị chứa chuỗi trông như vậy (không bao giờ có trong bản dịch thật).
  const body = Object.entries(dict).map(([k, v]) => { const j = JSON.stringify(v); if (/[{,]_[0-9a-z]+:/.test(j)) throw new Error(`i18n-pack: bản dịch ${lang}/${group || 'core'} chứa chuỗi giống khóa băm – ${j.slice(0, 60)}`); return `${keep.has(k) ? JSON.stringify(k) : hk(k)}:${j}`; }).join(',');
  if (!/^[a-z]{2,3}$/.test(lang)) throw new Error(`i18n-pack: mã ngôn ngữ lạ ${lang}`);
  const L = '.' + lang;
  return `/* SINH từ ${srcPath(lang, group)} – đừng sửa tay (scripts/i18n-pack.mjs) */\n(function(g){const D=g.I18N_DICT=g.I18N_DICT||{};D${L}=Object.assign(D${L}||{},{${body}});})(typeof self!=='undefined'?self:this);\n`;
}
/** Giải gói chạy về từ điển khóa tiếng Việt (để test/đối chiếu): keys = vũ trụ khóa nguồn. Thuần. */
export function unpack(packed, keys) {
  const out = {};
  for (const k of keys) { const v = packed[k] !== undefined ? packed[k] : packed[hk(k)]; if (v !== undefined) out[k] = v; }
  return out;
}

/** Mọi tệp nguồn hiện có: [{lang, group}] (group '' = lõi). */
export function sources() {
  const out = [];
  for (const l of LANGS) {
    if (fs.existsSync(path.join(ROOT, srcPath(l)))) out.push({ lang: l, group: '' });
    const d = path.join(ROOT, SRC, l);
    if (fs.existsSync(d)) for (const f of fs.readdirSync(d).sort()) if (f.endsWith('.js')) out.push({ lang: l, group: f.slice(0, -3) });
  }
  return out;
}
/** Mọi khóa tiếng Anh (en.js + mọi en/<nhóm>.js) – web/js/i18n.js chỉ tra băm khi en có khóa. */
export function enKeys() {
  const ctx = { I18N_DICT: {} }; ctx.self = ctx; vm.createContext(ctx);
  const dir = path.join(ROOT, OUT, 'en');
  for (const f of [path.join(ROOT, OUT, 'en.js'), ...fs.readdirSync(dir).filter(f => f.endsWith('.js')).sort().map(f => path.join(dir, f))]) vm.runInContext(fs.readFileSync(f, 'utf8'), ctx);
  return new Set(Object.keys(ctx.I18N_DICT.en || {}));
}
/** Vũ trụ khóa (mọi ngôn ngữ, mọi nhóm) → tập nguyên văn dùng chung: cùng một khóa luôn cùng một dạng ở mọi tệp.
 *  + khóa có bản dịch mà en không có (vd. từ i18n-fixed.json): giữ nguyên câu, vì i18n.js chỉ tra băm khi en có khóa. */
export function universeKeep(list = sources(), en = enKeys()) {
  const keys = new Set();
  for (const { lang, group } of list) for (const k of Object.keys(loadSrc(lang, group))) keys.add(k);
  const keep = verbatimKeys([...keys]);
  for (const k of keys) if (!en.has(k)) keep.add(k);
  return keep;
}
/** Dựng (hoặc kiểm với check=true) mọi tệp chạy. → { files, stale: [đường dẫn lệch], removed, srcBytes, outBytes } */
export function packAll({ check = false } = {}) {
  const list = sources(), keep = universeKeep(list), stale = [], removed = [];
  let srcBytes = 0, outBytes = 0;
  const want = new Set();
  for (const { lang, group } of list) {
    const sp = path.join(ROOT, srcPath(lang, group)), op = path.join(ROOT, outPath(lang, group));
    const txt = packText(lang, group, loadSrc(lang, group), keep);
    want.add(outPath(lang, group)); srcBytes += fs.statSync(sp).size; outBytes += Buffer.byteLength(txt);
    const cur = fs.existsSync(op) ? fs.readFileSync(op, 'utf8') : null;
    if (cur !== txt) { stale.push(outPath(lang, group)); if (!check) { fs.mkdirSync(path.dirname(op), { recursive: true }); fs.writeFileSync(op, txt); } }
  }
  // Tệp chạy không còn nguồn (nhóm bị bỏ) → xóa, không để lại bản cũ
  for (const l of LANGS) {
    const files = [outPath(l), ...(fs.existsSync(path.join(ROOT, OUT, l)) ? fs.readdirSync(path.join(ROOT, OUT, l)).filter(f => f.endsWith('.js')).map(f => outPath(l, f.slice(0, -3))) : [])];
    for (const f of files) if (fs.existsSync(path.join(ROOT, f)) && !want.has(f)) { removed.push(f); if (!check) fs.unlinkSync(path.join(ROOT, f)); }
  }
  return { files: list.length, stale, removed, srcBytes, outBytes };
}
