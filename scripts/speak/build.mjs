#!/usr/bin/env node
// 🎙️ Play & Speak – content/situations/*.json (MỘT nguồn, cổng scripts/test/situations.mjs) → gói lười 'pas':
//   web/js/speak/data.js          mục lục nhẹ SPK_IDX {id: {g, c, l}} + SPK_P {id: đường dẫn gói gốc, có chữ cpack/… đủ để build-cpack băm tên; đường dẫn bản dịch nằm trong gói gốc (SPK_L)} + SPK_fill (ghép bản dịch) – nạp cùng gói 'pas'
//   web/cpack/speak/s/<id>.js     tình huống, chuỗi nhiều ngôn ngữ chỉ giữ {en} – nạp khi mở #/speak/<id>
//   web/cpack/speak/s/<id>.<lang>.js bản dịch của MỘT ngôn ngữ: mảng chuỗi theo thứ tự duyệt các nút {en} – nạp khi mở, chỉ ngôn ngữ đang dùng
// 3/11: trước đây MỘT gói chứa mọi tình huống × 15 ngôn ngữ (35 tình huống → 984 KB, gzip 517 KB > trần file) dù người học chỉ cần en + 1 ngôn ngữ của 1 tình huống.
// Tệp lười không mang chú thích đầu (35 tình huống × 15 tệp → ~50 KB chỉ là chú thích); nguồn duy nhất ghi ở data.js.
//   node scripts/speak/build.mjs           kiểm bản sinh khớp nguồn + ghép lại đúng nguyên bản mọi ngôn ngữ (npm test / prepush)
//   node scripts/speak/build.mjs --write   sinh lại (xóa tệp thừa trong web/cpack/speak/s/)
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url'; import { isDeepStrictEqual } from 'node:util';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'), SRC = path.join(ROOT, 'content/situations');
const OUT = path.join(ROOT, 'web/js/speak/data.js'), DIR = path.join(ROOT, 'web/cpack/speak/s');
export const LANGS = ['en', 'vi', 'es', 'pt', 'fr', 'de', 'id', 'th', 'zh', 'ja', 'ko', 'hi', 'ar', 'ru', 'tr'];
const isObj = o => o && typeof o === 'object' && !Array.isArray(o);
/** Nút nhiều ngôn ngữ trong nguồn: object có en (chuỗi), mọi khóa là mã ngôn ngữ, mọi giá trị là chuỗi. */
const isML = o => isObj(o) && typeof o.en === 'string' && Object.entries(o).every(([k, v]) => LANGS.includes(k) && typeof v === 'string');
/** Ghép bản dịch vào bản sao của tình huống gốc – CHẠY TRÊN TRÌNH DUYỆT (chép nguyên văn vào data.js) và trong kiểm tra dưới đây. */
export function SPK_fill(base, arr, lang) {
  let i = 0;
  const w = o => {
    if (Array.isArray(o)) return o.map(w);
    if (!o || typeof o !== 'object') return o;
    const k = Object.keys(o);
    if (k.length === 1 && k[0] === 'en' && typeof o.en === 'string') { const v = arr[i++], r = { en: o.en }; if (typeof v === 'string') r[lang] = v; return r; }
    const r = {}; for (const x of k) r[x] = w(o[x]); return r;
  };
  return w(base);
}
/** Tách 1 tình huống → { base, tr: {lang: [chuỗi|null]} } (thuần). Ném lỗi nếu một nút KHÔNG phải bản dịch lại có dạng {en} (trình duyệt sẽ hiểu nhầm). */
export function split(sit) {
  const tr = Object.fromEntries(LANGS.filter(l => l !== 'en').map(l => [l, []]));
  const w = (o, p) => {
    if (Array.isArray(o)) return o.map((x, i) => w(x, p + '[' + i + ']'));
    if (!isObj(o)) return o;
    if (isML(o)) { for (const l in tr) tr[l].push(typeof o[l] === 'string' ? o[l] : null); return { en: o.en }; }
    const k = Object.keys(o); if (k.length === 1 && k[0] === 'en') throw new Error(`${sit.id}${p}: object chỉ có khóa "en" nhưng không phải bản dịch – đổi tên khóa`);
    const r = {}; for (const x of k) r[x] = w(o[x], p + '.' + x); return r;
  };
  const base = w(sit, '');
  for (const l in tr) if (tr[l].every(v => v === null)) delete tr[l]; else while (tr[l].length && tr[l][tr[l].length - 1] === null) tr[l].pop();
  return { base, tr };
}
/** Bản nguồn chỉ còn en + lang (để so với bản ghép lại). */
const only = (o, lang) => Array.isArray(o) ? o.map(x => only(x, lang)) : !isObj(o) ? o : isML(o) ? Object.fromEntries(Object.entries(o).filter(([k]) => k === 'en' || k === lang)) : Object.fromEntries(Object.entries(o).map(([k, v]) => [k, only(v, lang)]));
const HEAD = '/* TỰ SINH bởi scripts/speak/build.mjs từ content/situations/*.json – KHÔNG sửa tay. */\n';
export function build(all) {
  const files = {}, idx = {}, paths = {};
  for (const s of all) {
    const { base, tr } = split(s);
    idx[s.id] = { g: s.group, c: s.cefr, l: Object.keys(tr).join(' ') };
    const P = f => 'cpack/speak/s/' + f, lp = Object.fromEntries(Object.keys(tr).map(l => [l, P(`${s.id}.${l}.js`)]));
    // gốc (en) mang luôn đường dẫn các bản dịch (chữ cpack/… đủ để build-cpack băm tên: lá trước, gói tham chiếu sau) → data.js không phình theo số ngôn ngữ
    files[`${s.id}.js`] = `(self.SPK_B || (self.SPK_B = {}))[${JSON.stringify(s.id)}] = ${JSON.stringify(base)};\n(self.SPK_L || (self.SPK_L = {}))[${JSON.stringify(s.id)}] = ${JSON.stringify(lp)};\n`;
    paths[s.id] = P(`${s.id}.js`);
    for (const [l, a] of Object.entries(tr)) files[`${s.id}.${l}.js`] = `(self.SPK_T || (self.SPK_T = {}))[${JSON.stringify(s.id + '.' + l)}] = ${JSON.stringify(a)};\n`;
    for (const l of LANGS) { // ghép lại phải đúng nguyên bản (en + l) – không mất chuỗi nào
      const got = l === 'en' ? base : SPK_fill(base, tr[l] || [], l);
      if (!isDeepStrictEqual(got, only(s, l))) throw new Error(`${s.id}: ghép lại ${l} khác nguồn`);
    }
  }
  const data = `${HEAD}self.SPK_IDX = ${JSON.stringify(idx)};\nself.SPK_P = ${JSON.stringify(paths)};\nself.SPK_fill = ${SPK_fill.toString()};\n`;
  return { data, files };
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const all = fs.existsSync(SRC) ? fs.readdirSync(SRC).filter(f => f.endsWith('.json')).sort().map(f => JSON.parse(fs.readFileSync(path.join(SRC, f), 'utf8'))) : [];
  let out; try { out = build(all); } catch (e) { console.error('✗ speak/build: ' + e.message); process.exit(1); }
  const { data, files } = out, have = fs.existsSync(DIR) ? fs.readdirSync(DIR).filter(f => f.endsWith('.js')) : [];
  if (process.argv.includes('--write')) {
    fs.mkdirSync(DIR, { recursive: true }); fs.writeFileSync(OUT, data);
    for (const [f, js] of Object.entries(files)) if (!fs.existsSync(path.join(DIR, f)) || fs.readFileSync(path.join(DIR, f), 'utf8') !== js) fs.writeFileSync(path.join(DIR, f), js);
    for (const f of have) if (!files[f]) fs.unlinkSync(path.join(DIR, f));
    const sz = Object.values(files).reduce((n, x) => n + Buffer.byteLength(x), 0) + Buffer.byteLength(data);
    console.log(`speak/build: ${all.length} tình huống → data.js ${(Buffer.byteLength(data) / 1024).toFixed(1)} KB + ${Object.keys(files).length} tệp lười (${(sz / 1024).toFixed(0)} KB tổng mọi ngôn ngữ)`);
  } else {
    const bad = [];
    if (!fs.existsSync(OUT) || fs.readFileSync(OUT, 'utf8') !== data) bad.push('data.js');
    for (const [f, js] of Object.entries(files)) if (!fs.existsSync(path.join(DIR, f)) || fs.readFileSync(path.join(DIR, f), 'utf8') !== js) bad.push('s/' + f);
    for (const f of have) if (!files[f]) bad.push('s/' + f + ' (thừa)');
    if (bad.length) { console.error(`✗ speak/build: web/js/speak trôi so với content/situations (${bad.slice(0, 5).join(', ')}${bad.length > 5 ? '…' : ''}) → node scripts/speak/build.mjs --write`); process.exit(1); }
    console.log(`speak/build: ${all.length} ok`);
  }
}
