// 🎨 CSS trang tải lười ra khỏi khung app (06/11): web/css/style.css (nạp ngay, tính vào trần 374 KB) chỉ giữ luật mà khung có thể vẽ;
// luật chỉ phần tử do module LƯỜI tạo ra mới có → web/css/lazy-ui.css, nạp cùng mọi gói lười (need1 trong web/js/app.js, chờ xong mới vẽ).
//   "Lười" = file trong BUNDLES (web/js/app.js) trừ gói ux1 (Hôm nay – vẽ ngay, không chờ lazy-ui.css), i18n, file nạp ngay (SHELL ∪ /app/)
//   và file có <script src> ở bất kỳ trang HTML nào. Một selector "lười" khi có token .class/#id (ngoài :not) chỉ xuất hiện trong file lười
//   – không có trong file khung, trang HTML, add-on ngoài app/ – và không khớp tiền tố lớp ghép động của khung ('hl-' + x, `g-${g}`).
// Kiểm (npm test): 1) style.css KHÔNG còn luật lười (khung phình lại) → chạy --move; 2) mọi luật trong lazy-ui.css vẫn lười (khung bắt đầu
// dùng lớp đó → phải trả luật về style.css, kẻo vẽ thiếu kiểu trước khi gói lười nạp); 3) lazy-ui.css không nạp ngay, need1 nạp nó.
// Dùng: node scripts/test/css-lazy.mjs [--move]
import { isMain } from '../lib/is-main.mjs';
import fs from 'fs';
import path from 'path';
import { firstLoadFiles, gzSize } from '../lib/gz-canon.mjs';

const STYLE = 'web/css/style.css', LAZY_CSS = 'web/css/lazy-ui.css';
const rd = f => fs.readFileSync(f, 'utf8');
const walk = (d, o = []) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) { if (!/node_modules|vendor/.test(p)) walk(p, o); } else if (/\.(js|mjs|html|json|svg)$/.test(p)) o.push(p); } return o; };

export function lazyModel() {
  const app = rd('web/js/app.js'), a0 = app.indexOf("const G = 'js/grammar/', BUNDLES = {"), a1 = app.indexOf('\n  };', a0);
  const BUNDLES = new Function(app.slice(a0, a1 + 4) + '; return BUNDLES;')();
  const ux1 = new Set(BUNDLES.ux1 || []);
  const lazy = new Set(Object.entries(BUNDLES).flatMap(([k, v]) => /^(ux1|i18nx|i18nl)$/.test(k) ? [] : v).filter(f => !ux1.has(f) && !f.startsWith('js/i18n/')).map(f => 'web/' + f));
  for (const u of firstLoadFiles()) lazy.delete('web' + u);
  const all = walk('web');
  for (const h of all.filter(f => f.endsWith('.html'))) for (const m of rd(h).matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g)) lazy.delete('web/' + m[1].replace(/^(\.\.\/)+|^\//, '').replace(/\?.*/, ''));
  const ext = fs.existsSync('extension') ? walk('extension').filter(f => !f.startsWith('extension/app/')) : [];
  const keepText = [...all.filter(f => !lazy.has(f) && !f.startsWith('web/css/')), ...ext].map(rd).join('\n');
  const lazyText = [...lazy].filter(f => fs.existsSync(f)).map(rd).join('\n');
  const dyn = [...keepText.matchAll(/['"`\s.]([A-Za-z]\w*(?:-\w+)*)[-_](?:\$\{|['"`]\s*\+)/g)].map(m => m[1] + '-');
  const inKeep = c => keepText.includes(c) || dyn.some(p => c.startsWith(p));
  const tokens = s => { const p = s.replace(/:not\([^)]*\)/g, '').replace(/:(is|where|has)\(/g, ' ('); return [...p.matchAll(/[.#]([A-Za-z_][\w-]*)/g)].map(m => m[1]); };
  const selLazy = s => tokens(s).some(t => t.length > 2 && !inKeep(t) && lazyText.includes(t));
  return { selLazy, lazy };
}

// Bộ tách CSS cấp trên cùng (giữ nguyên từng byte: ghép lại = file gốc); @media/@supports/@container xét đệ quy
export function parseCss(src) {
  const out = []; let i = 0; const n = src.length;
  const skipStr = k => { const q = src[k++]; while (k < n && src[k] !== q) { if (src[k] === '\\') k++; k++; } return k + 1; };
  while (i < n) {
    const s = i; while (i < n && /\s/.test(src[i])) i++;
    if (src.startsWith('/*', i)) { i = src.indexOf('*/', i) + 2; out.push({ kind: 'c', text: src.slice(s, i) }); continue; }
    if (i >= n) { out.push({ kind: 'c', text: src.slice(s) }); break; }
    let j = i;
    while (j < n && src[j] !== '{' && src[j] !== ';') { if (src.startsWith('/*', j)) j = src.indexOf('*/', j) + 2; else if (src[j] === '"' || src[j] === "'") j = skipStr(j); else j++; }
    if (src[j] === ';') { j++; out.push({ kind: 'x', text: src.slice(s, j) }); i = j; continue; }
    let k = j + 1, depth = 1;
    while (k < n && depth) { if (src.startsWith('/*', k)) { k = src.indexOf('*/', k) + 2; continue; } const ch = src[k]; if (ch === '"' || ch === "'") { k = skipStr(k); continue; } if (ch === '{') depth++; else if (ch === '}') depth--; k++; }
    const head = src.slice(i, j);
    out.push({ kind: head.trim().startsWith('@') ? 'at' : 'r', lead: src.slice(s, i), head, body: src.slice(j + 1, k - 1), text: src.slice(s, k) }); i = k;
  }
  return out;
}
const splitSel = h => { const o = []; let d = 0, c = ''; for (const ch of h.replace(/\/\*[\s\S]*?\*\//g, '')) { if (ch === '(') d++; if (ch === ')') d--; if (ch === ',' && !d) { o.push(c); c = ''; } else c += ch; } o.push(c); return o.map(x => x.trim()).filter(Boolean); };
const GROUP = /^@(media|supports|container)\b/;
// Chia danh sách luật: lazyTest(selectors) → true = luật lười
export function split(items, isLazy) {
  const keep = [], mv = [];
  for (const it of items) {
    if (it.kind === 'r') { const sels = splitSel(it.head); (sels.length && sels.every(isLazy) ? mv : keep).push(it); }
    else if (it.kind === 'at' && GROUP.test(it.head.trim())) {
      const r = split(parseCss(it.body), isLazy);
      if (!r.mv.length) { keep.push(it); continue; }
      mv.push({ kind: 'at', text: '\n' + it.head.trim() + ' {' + r.mv.map(x => x.text).join('') + '\n}' });
      if (r.keep.some(x => x.kind !== 'c')) keep.push({ kind: 'at', text: it.lead + it.head + '{' + r.keep.map(x => x.text).join('') + '\n}' });
    } else keep.push(it);
  }
  return { keep, mv };
}

if (isMain(import.meta.url)) {
  let fail = 0; const ok = (c, m) => { if (c) console.log('✓ css-lazy: ' + m); else { fail++; console.error('✗ css-lazy: ' + m); } };
  const { selLazy } = lazyModel();
  const src = rd(STYLE), items = parseCss(src);
  ok(items.map(x => x.text).join('') === src, 'bộ tách CSS ghép lại đúng từng byte style.css');
  const r = split(items, selLazy);
  if (process.argv.includes('--move') && r.mv.length) {
    fs.writeFileSync(STYLE, r.keep.map(x => x.text).join(''));
    fs.writeFileSync(LAZY_CSS, rd(LAZY_CSS).replace(/\s*$/, '') + r.mv.map(x => x.text).join('') + '\n');
    console.log(`→ đã chuyển ${r.mv.length} luật style.css → lazy-ui.css`);
  } else {
    const names = r.mv.map(x => (x.head || x.text).trim().split('\n')[0].slice(0, 70));
    ok(!r.mv.length, `style.css không còn luật chỉ trang tải lười dùng${r.mv.length ? ` (${r.mv.length}: ${names.slice(0, 8).join(' | ')}) → node scripts/test/css-lazy.mjs --move` : ''}`);
  }
  // 2) mọi luật trong lazy-ui.css vẫn lười
  const lz = rd(LAZY_CSS), li = parseCss(lz);
  ok(li.map(x => x.text).join('') === lz, 'bộ tách CSS ghép lại đúng từng byte lazy-ui.css');
  const notLazy = list => list.flatMap(it => it.kind === 'r' ? (splitSel(it.head).every(selLazy) ? [] : [it.head.trim().slice(0, 70)])
    : it.kind === 'at' ? (GROUP.test(it.head.trim()) ? notLazy(parseCss(it.body)) : [it.head.trim().slice(0, 70)]) : []);
  const back = notLazy(li);
  ok(!back.length, `lazy-ui.css chỉ có luật của module lười${back.length ? ` – khung nay dùng (${back.length}): ${back.slice(0, 8).join(' | ')} → trả về style.css` : ''}`);
  // 3) cách nạp
  const first = firstLoadFiles(), app = rd('web/js/app.js');
  ok(!first.includes('/css/lazy-ui.css'), 'lazy-ui.css KHÔNG nằm trong file nạp ngay (SHELL ∪ web/app/index.html)');
  ok(/const LZCSS = n => \/\^\(ux1\|i18nx\|i18nl\)\$\/\.test\(n\) \? \[\] : \['css\/lazy-ui\.css'\]/.test(app) && /need1 = [^\n]*LZCSS\(n\)[^\n]*map\(loadCss\)/.test(app), 'need1 nạp + chờ lazy-ui.css cho mọi gói lười (trừ ux1/i18n)');
  ok(/App\.loadScript = src => Promise\.all\(\[loadScript\(src\), loadCss\('css\/lazy-ui\.css'\)\]\)/.test(app), 'App.loadScript (file lười lẻ) cũng chờ lazy-ui.css');
  // thêm: App.loadScript (speak/app.js: cpack/speak/s/<id>.js qua SPK_P) chỉ nạp tệp NGOÀI gói lười
  const lzFiles = [...lazyModel().lazy].map(f => f.slice(4)), lsPre = [];
  for (const f of fs.readdirSync('web/js', { recursive: true }).filter(f => /\.js$/.test(f) && f !== 'app.js')) { const t = rd('web/js/' + f); if (/App\.loadScript\b/.test(t)) for (const m of t.matchAll(/(?:App\.loadScript|\bld)\(\s*'([^']+)'/g)) lsPre.push(m[1]); }
  ok(lsPre.length > 0 && !lsPre.some(p => lzFiles.some(f => f.startsWith(p))), `App.loadScript chỉ nạp tệp ngoài gói lười (${[...new Set(lsPre)].join(', ')})`);
  console.log(`  style.css ${(gzSize(rd(STYLE)) / 1024).toFixed(1)} KB gz (khung) · lazy-ui.css ${(gzSize(rd(LAZY_CSS)) / 1024).toFixed(1)} KB gz (lười)`);
  if (fail) process.exit(1);
}
