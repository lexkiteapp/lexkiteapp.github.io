// 🧩 Stitch v2 → khung màn của app, TỰ ĐỘNG và trung thành: ghép cặp HTML Stitch sáng/tối (brand/stitch/v2/<màn>-light|dark.html,
//   cùng bố cục) thành 1 DOM cho cả 2 giao diện. Không gõ lại giao diện bằng tay → không lệch mẫu, tiết kiệm công.
//   • Mỗi phần tử ghép cặp theo cây (LCS theo thẻ): class chung giữ nguyên · chỉ sáng → `lt:` · chỉ tối → `dk:` · phần tử chỉ có 1 bản → ẩn ở bản kia.
//   • Tên màu/cỡ chữ/bo góc/khoảng cách trong tailwind.config RIÊNG của từng file Stitch → đổi ra giá trị thật (cấu hình các file khác nhau).
//   • style="" nội tuyến → class thuộc tính tuỳ ý [prop:val] (CSP không cần 'unsafe-inline'). Bỏ <script>, on*=, data-active-classes.
//   • Chữ: theo bản đồ gắn dữ liệu brand/stitch/v2/bind/<màn>.json – dữ liệu thật (text/attr/html/repeat) hoặc t('khóa Việt') (bản EN = chữ Stitch).
//     Chữ tĩnh chưa có khóa dịch → ĐỎ (không để lọt chữ cứng). Icon Material giữ tên ligature.
// Ra: web/js/st/v2/<màn>.js (ST2.<màn>(d) → {root, header, main, nav}) + web/js/i18n/en/v2.js (vi → en). Kiểm: --check (trôi = đỏ).
// Dùng: node scripts/stitch-v2-convert.mjs [màn…] [--check] [--web]    (cần jsdom – devDependency)
import fs from 'node:fs'; import path from 'node:path'; import vm from 'node:vm'; import { JSDOM, VirtualConsole } from 'jsdom'; const VC = new VirtualConsole(); // im tiếng lỗi CSS @layer của jsdom (vô hại)
const A = process.argv.slice(2), WEB = A.includes('--web'), CHECK = A.includes('--check'); // --web: trang web tĩnh (lexkite.com) – cùng phép, nguồn/đích riêng, dựng lúc build (Node) bằng scripts/lib/st-web.mjs
const SRC = WEB ? 'brand/stitch/web' : 'brand/stitch/v2', OUT = WEB ? 'brand/stitch/web/gen' : 'web/js/st/v2', EN = WEB ? 'web/js/i18n/en/v2web.js' : 'web/js/i18n/en/v2.js';
const ALL = fs.readdirSync(path.join(SRC, 'bind')).filter(f => f.endsWith('.json')).map(f => f.slice(0, -5));
const ONLY = A.filter(a => !a.startsWith('--')), SCREENS = ALL; // luôn chạy MỌI màn (nhanh) để en/v2.js đủ khóa; chỉ GHI file màn được nêu (ONLY)
const errs = [], enMap = {};
// Khóa dịch đã có ở các nhóm EN khác: trùng nghĩa → dùng lại (không ghi lại), khác nghĩa → ĐỎ (không được đổi nghĩa chữ ở chỗ khác của app)
const EN_HAVE = {}; for (const f of fs.readdirSync('web/js/i18n/en').filter(f => f.endsWith('.js') && f !== 'v2.js' && f !== 'v2web.js')) for (const m of fs.readFileSync('web/js/i18n/en/' + f, 'utf8').matchAll(/^\s*(["'])((?:\\.|(?!\1).)*)\1\s*:\s*(["'])((?:\\.|(?!\3).)*)\3/gm)) EN_HAVE[m[2]] = [m[4], f];

// ---- tailwind.config riêng của file → bảng tra tên → giá trị ----
function cfgOf(html, f) { const m = html.match(/tailwind\.config\s*=\s*(\{[\s\S]*?\})\s*;?\s*<\/script>/); if (!m) return {};
  try { return vm.runInNewContext('(' + m[1] + ')', Object.create(null), { timeout: 200 }).theme?.extend || {}; } catch (e) { errs.push(`${f}: tailwind.config đọc lỗi`); return {}; } }
const COLOR_P = ['bg', 'text', 'border', 'border-t', 'border-b', 'border-l', 'border-r', 'border-x', 'border-y', 'ring', 'ring-offset', 'from', 'via', 'to', 'fill', 'stroke', 'shadow', 'outline', 'divide', 'placeholder', 'decoration', 'accent', 'caret'];
const SPACE_P = ['p', 'px', 'py', 'pt', 'pb', 'pl', 'pr', 'm', 'mx', 'my', 'mt', 'mb', 'ml', 'mr', 'gap', 'gap-x', 'gap-y', 'space-x', 'space-y', 'w', 'h', 'min-w', 'min-h', 'max-w', 'max-h', 'top', 'bottom', 'left', 'right', 'inset', 'inset-x', 'inset-y', 'translate-x', 'translate-y'];
const RAD_P = ['rounded', 'rounded-t', 'rounded-b', 'rounded-l', 'rounded-r', 'rounded-tl', 'rounded-tr', 'rounded-bl', 'rounded-br'];
const arb = v => String(v).trim().replace(/\s+/g, '_');
// "hover:!-mt-2/50" → {pre:'hover:', imp:'!', neg:'-', base:'mt-2', op:'/50'}
const split = c => { const i = c.lastIndexOf(':', c.includes('[') ? c.indexOf('[') : c.length); const pre = i >= 0 ? c.slice(0, i + 1) : '', rest = c.slice(i + 1);
  const m = rest.match(/^(!?)(-?)(.*?)(\/[\w.[\]]+)?$/); return { pre, imp: m[1], neg: m[2], base: m[3], op: m[4] || '' }; };
// màu lồng nhau như Tailwind: { teal: { deep, DEFAULT } } → 'teal-deep', 'teal' (thiếu bước này → lt:bg-teal-deep không ra CSS, nút mất nền)
const flat = (o, k = '', r = {}) => { for (const [s, v] of Object.entries(o || {})) { const n = s === 'DEFAULT' ? k : k ? `${k}-${s}` : s; if (v && typeof v === 'object' && !Array.isArray(v)) flat(v, n, r); else r[n] = v; } return r; };
function resolver(ext) { const col = flat(ext.colors), fs_ = ext.fontSize || {}, rad = ext.borderRadius || {}, sp = ext.spacing || {}, bsh = ext.boxShadow || {};
  return (cls, has) => { const { pre, imp, neg, base, op } = split(cls), out = [];
    if (base.startsWith('shadow-') && bsh[base.slice(7)] != null) return [`${pre}${imp}shadow-[${arb(bsh[base.slice(7)])}]`]; // bóng riêng của mẫu (shadow-btn-teal)
    if (base.startsWith('font-') && (ext.fontFamily || {})[base.slice(5)]) return []; // họ chữ: cả app dùng Plus Jakarta Sans ở gốc
    for (const p of COLOR_P) if (base.startsWith(p + '-') && col[base.slice(p.length + 1)] != null) { const v = col[base.slice(p.length + 1)]; return [`${pre}${imp}${p}-[${arb(v)}]${op}`]; }
    if (base.startsWith('text-') && fs_[base.slice(5)]) { const v = fs_[base.slice(5)], [size, o = {}] = Array.isArray(v) ? v : [v]; const lh = typeof o === 'string' ? o : o.lineHeight;
      out.push(`${pre}${imp}text-[${arb(size)}]`); if (lh && !has(/^leading-/)) out.push(`${pre}leading-[${arb(lh)}]`);
      if (o.letterSpacing && !has(/^tracking-/)) out.push(`${pre}tracking-[${arb(o.letterSpacing)}]`); if (o.fontWeight && !has(/^font-(thin|extralight|light|normal|medium|semibold|bold|extrabold|black|\[)/)) out.push(`${pre}font-[${arb(o.fontWeight)}]`); return out; }
    for (const p of RAD_P) { if (base === p && rad.DEFAULT) return [`${pre}${imp}${p}-[${arb(rad.DEFAULT)}]`]; if (base.startsWith(p + '-') && rad[base.slice(p.length + 1)]) return [`${pre}${imp}${p}-[${arb(rad[base.slice(p.length + 1)])}]`]; }
    for (const p of SPACE_P) if (base.startsWith(p + '-') && sp[base.slice(p.length + 1)]) return [`${pre}${imp}${neg}${p}-[${arb(sp[base.slice(p.length + 1)])}]`];
    return [cls]; }; }
const styleCls = s => (s || '').split(';').map(x => x.trim()).filter(Boolean).map(x => { const i = x.indexOf(':'); return `[${x.slice(0, i).trim().toLowerCase()}:${arb(x.slice(i + 1).replace(/!important/, ''))}]`; });
// bind "styles": true → class tự đặt trong <style> của mẫu (vd .tactile-card, .speech-bubble::before) → class thuộc tính tuỳ ý Tailwind ([prop:val], kèm active:/hover:/before:/after:)
//   Chỉ bật theo màn (màn cũ không có class tự đặt → khung sinh không đổi). Bộ chọn khác dạng ".tên[:biến thể]" → ĐỎ (không lặng lẽ bỏ kiểu).
const VAR = { '': '', ':active': 'active:', ':hover': 'hover:', '::before': 'before:', '::after': 'after:', '::-webkit-scrollbar': '[&::-webkit-scrollbar]:' };
function stylesOf(html, f) { const M = {}, css = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m => m[1]).join('\n').replace(/\/\*[\s\S]*?\*\//g, '');
  for (const [, sel, body] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) for (const one of sel.split(',').map(x => x.trim())) {
    if (/^(html|body|\*|:root)\b/.test(one) || /^@/.test(one) || /^\.material-symbols-/.test(one)) continue; const m = one.match(/^\.([\w-]+(?:\.[\w-]+)*)((?::{1,2}[\w-]+)?)$/); // .a.b = trạng thái (vd .score-tile.selected): xem classesOf; font icon đã có ở PRE
    if (!m || VAR[m[2]] == null) { errs.push(`${f}: <style> bộ chọn chưa hỗ trợ: ${one}`); continue; }
    for (const d of body.split(';').map(x => x.trim()).filter(x => x.includes(':'))) { const i = d.indexOf(':'), pr = d.slice(0, i).trim().toLowerCase(), v = d.slice(i + 1).trim().replace(/\s*!important/, '');
      (M[m[1]] = M[m[1]] || []).push(pr === 'content' && /^(""|'')$/.test(v) ? VAR[m[2]] + "content-['']" : `${VAR[m[2]]}[${pr}:${arb(v)}]`); } }
  return M; }
// bind "swap" {class gốc: class thay}: đổi ngay trên class Stitch, cả ở <body> (vd w-[390px] → w-full: khung phải co theo màn 360–430 px). Thay = '' → bỏ.
function classesOf(el, R) { let raw = (el.getAttribute('class') || '').split(/\s+/).filter(Boolean); if (R.swap) raw = raw.flatMap(c => R.swap[c] != null ? R.swap[c].split(/\s+/).filter(Boolean) : [c]);
  const has = re => raw.some(c => re.test(split(c).base)), out = [];
  for (const c of raw) { if (R.sty && R.sty[c]) { out.push(...R.sty[c]); continue; } out.push(...R(c, has)); }
  if (R.sty) for (const k of Object.keys(R.sty)) if (k.includes('.') && k.split('.').every(x => raw.includes(x))) for (const v of R.sty[k]) { const pf = v.slice(0, v.indexOf(':[') + 2 || v.indexOf('[') + 1), pr = v.slice(pf.length, v.indexOf(':', pf.length)), i = out.findIndex(x => x.startsWith(pf + pr + ':')); if (i >= 0) out[i] = v; else out.push(v); } // .a.b đè đúng thuộc tính của .a (cùng biến thể)
  out.push(...styleCls(el.getAttribute('style')));
  // DESIGN-SYSTEM §0: không nhấp nháy. App: mẫu Stitch có animate-pulse → chấm đứng yên (kèm motion-reduce:animate-none của chính nó)
  return !WEB && out.some(c => c.endsWith('animate-pulse')) ? out.filter(c => !c.endsWith('animate-pulse') && c !== 'motion-reduce:animate-none') : out; }

// ---- ghép 2 cây ----
const sig = n => n.nodeType === 1 ? n.tagName : n.nodeType === 3 ? (n.textContent.trim() ? '#t' : '') : '';
function lcs(a, b) { const n = a.length, m = b.length, T = Array.from({ length: n + 1 }, () => new Int16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) T[i][j] = a[i] === b[j] ? T[i + 1][j + 1] + 1 : Math.max(T[i + 1][j], T[i][j + 1]);
  const pairs = []; let i = 0, j = 0; while (i < n && j < m) { if (a[i] === b[j]) { pairs.push([i, j]); i++; j++; } else if (T[i + 1][j] >= T[i][j + 1]) i++; else j++; } return pairs; }
const SKIP = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT']);
function merge(L, D, RL, RD, doc) {
  const out = doc.createElement(L.tagName.toLowerCase());
  for (const a of L.attributes) if (!/^(class|style|on\w+|data-active-classes)$/i.test(a.name)) out.setAttribute(a.name, a.value);
  if (D) { const cl = classesOf(L, RL), cd = classesOf(D, RD), sl = new Set(cl), sd = new Set(cd);
    // điểm dừng gradient: from-* tách lt:/dk: mà to-/via-* chung → Tailwind cho from-* đặt lại --tw-gradient-to (trong suốt) ở tầng lt:/dk: SAU to-* chung → gradient nhạt dần. Kéo to-/via-* chung theo cùng tầng.
    const varFrom = cl.some(c => /^from-/.test(c) && !sd.has(c)) || cd.some(c => /^from-/.test(c) && !sl.has(c)), stop = c => varFrom && /^(to|via)-/.test(c);
    const cls = [...cl.filter(c => sd.has(c) && !stop(c)), ...cl.filter(c => !sd.has(c) || stop(c)).map(c => 'lt:' + c), ...cd.filter(c => !sl.has(c) || stop(c)).map(c => 'dk:' + c)];
    if (cls.length) out.setAttribute('class', cls.join(' '));
    for (const a of D.attributes) if (!out.hasAttribute(a.name) && !/^(class|style|on\w+|data-active-classes)$/i.test(a.name)) out.setAttribute(a.name, a.value); // thuộc tính chỉ bản tối có (aria…)
  } else { const c = classesOf(L, RL); if (c.length) out.setAttribute('class', c.join(' ')); }
  const lc = [...L.childNodes].filter(n => sig(n) && !SKIP.has(n.tagName)), dc = D ? [...D.childNodes].filter(n => sig(n) && !SKIP.has(n.tagName)) : [];
  const pairs = D ? lcs(lc.map(sig), dc.map(sig)) : lc.map((_, i) => [i, -1]); let pi = 0, j0 = 0;
  const only = (n, R, hide) => { if (n.nodeType === 3) { out.append(doc.createTextNode(n.textContent)); return; } const e = merge(n, null, R, R, doc); e.setAttribute('class', ((e.getAttribute('class') || '') + ' ' + hide).trim()); out.append(e); };
  for (let i = 0; i < lc.length; i++) { const p = pairs[pi];
    if (p && p[0] === i) { if (D) for (; j0 < p[1]; j0++) only(dc[j0], RD, 'lt:hidden'); j0 = p[1] + 1; pi++;
      const a = lc[i], b = D ? dc[p[1]] : null; out.append(a.nodeType === 3 ? doc.createTextNode(a.textContent) : merge(a, b, RL, RD, doc)); }
    else only(lc[i], RL, 'dk:hidden'); }
  if (D) for (; j0 < dc.length; j0++) only(dc[j0], RD, 'lt:hidden');
  return out; }

// ---- gắn dữ liệu + dịch → chuỗi template JS ----
const isIcon = el => /material-symbols/.test(el.getAttribute('class') || '');
const needT = s => /[A-Za-zÀ-ỹ]{2,}/.test(s);
function emit(root, bind, k) {
  const M = [], mark = expr => { M.push(expr); return `\u0001${M.length - 1}\u0002`; }, q = s => JSON.stringify(s);
  const tr = (s, where) => { const key = bind.i18n?.[s.trim()]; if (key == null) { errs.push(`${k}: thiếu khóa dịch ${where}: ${q(s.trim())}`); return mark(`e(${q(s.trim())})`); }
    const have = EN_HAVE[key]; if (have && have[0].toLowerCase() !== s.trim().toLowerCase()) errs.push(`${k}: khóa ${q(key)} đã có nghĩa ${q(have[0])} (${have[1]}) ≠ ${q(s.trim())} → chọn khóa khác`);
    else if (!have) enMap[key] = s.trim(); return mark(`e(t(${q(key)}))`); };
  // bộ chọn: CSS thường, thêm hậu tố " << n" = tổ tiên thứ n của phần tử khớp (bọc hàng/khung quanh nút có aria-label)
  const QA = (scope, sel) => { const m = sel.match(/^(.*?)\s*<<\s*(\d+)$/), base = m ? m[1] : sel; let r = base === ':scope' ? [scope] : [...scope.querySelectorAll(base)];
    if (m) r = r.map(e => { for (let n = +m[2]; n-- && e;) e = e.parentElement; return e; }).filter(Boolean); if (!r.length) errs.push(`${k}: bộ chọn không khớp: ${sel}`); return r; };
  const apply = (scope, b) => {
    // lặp có nhiều khuôn: variants {tên: bộ chọn mẫu}, pick = biểu thức chọn tên theo phần tử; các mẫu Stitch (samples) bị gỡ, chèn danh sách thật vào chỗ mẫu đầu
    for (const r of b.repeat || []) { const V = Object.entries(r.variants || { one: r.sel }).map(([n, sel]) => [n, QA(scope, sel)[0]]).filter(x => x[1]);
      if (!V.length) continue; const samples = r.samples ? QA(scope, r.samples) : V.map(x => x[1]), anchor = samples[0], T = {};
      for (const [n, el] of V) { const box = el.ownerDocument.createElement('div'); box.append(el.cloneNode(true)); apply(box.firstElementChild, (r.bind || {})[n] || r); T[n] = textify(box.firstElementChild); } // bản sao trong hộp: bind 'tag' trên :scope đổi thẻ vẫn lấy đúng HTML
      const names = Object.keys(T), body = names.length === 1 ? `\`${T[names[0]]}\`` : names.map((n, i) => i < names.length - 1 ? `_v === ${q(n)} ? \`${T[n]}\` : ` : `\`${T[n]}\``).join('');
      anchor.before(anchor.ownerDocument.createTextNode(mark(`(${r.list}).map((${r.as}, i) => { const _v = ${r.pick || "'one'"}; return ${body}; }).join('')`)));
      for (const x of new Set([...samples, ...V.map(v => v[1])])) x.remove(); }
    for (const [sel, expr] of Object.entries(b.html || {})) for (const el of QA(scope, sel)) { el.innerHTML = ''; el.append(mark(expr)); }
    for (const [sel, expr] of Object.entries(b.after || {})) for (const el of QA(scope, sel)) el.after(el.ownerDocument.createTextNode(mark(expr))); // chèn thêm (vd giáo viên Chars cạnh nút hiện tại)
    for (const [sel, o] of Object.entries(b.attr || {})) for (const el of QA(scope, sel)) for (const [a, expr] of Object.entries(o)) { if (expr === 'null') el.removeAttribute(a); else el.setAttribute(a, mark(`e(${expr})`)); }
    for (const [sel, o] of Object.entries(b.cls || {})) for (const el of QA(scope, sel)) { const c = (el.getAttribute('class') || '').split(' ');
      for (const [from, expr] of Object.entries(o)) { const i = c.indexOf(from); if (i < 0) errs.push(`${k}: không có class ${from} ở ${sel}`); else c[i] = el === scope && /^'[\w\-[\]./:]*'$/.test(expr) ? expr.slice(1, -1) : mark(expr); } el.setAttribute('class', c.join(' ')); } // gốc khung (root) là chuỗi class tĩnh → chỉ nhận literal, ghi thẳng
    for (const [sel, c] of Object.entries(b.setClass || {})) for (const el of QA(scope, sel)) el.setAttribute('class', c); // đặt lại cả class: chỉ ô giữ chỗ giáo viên (bỏ nền/viền ô, không hộp sau lưng giáo viên)
    for (const [sel, c] of Object.entries(b.addClass || {})) for (const el of QA(scope, sel)) el.setAttribute('class', ((el.getAttribute('class') || '') + ' ' + c).trim()); // chỉ class không đổi hình (cắt tràn, móc kiểm thử…)
    for (const [sel, o] of Object.entries(b.tag || {})) for (const el of QA(scope, sel)) { const n = el.ownerDocument.createElement(o.to); for (const a of el.attributes) n.setAttribute(a.name, a.value); // đổi thẻ (div → a href) giữ nguyên class
      if (o.addClass) n.setAttribute('class', (n.getAttribute('class') || '') + ' ' + o.addClass); n.append(...el.childNodes); el.replaceWith(n); if (el === scope) scope = n; } // đổi thẻ chính phần tử gốc → các phép sau (chữ) chạy trên thẻ mới
    for (const [sel, o] of Object.entries(b.wrap || {})) for (const el of QA(scope, sel)) { const w = el.ownerDocument.createElement(o.to || 'a'); // bọc phần tử trong thẻ mới (vd link trong suốt cao 44 px quanh viên thuốc 32 px: vùng chạm thật, hình giữ nguyên)
      if (o.class) w.setAttribute('class', o.class); for (const [a, expr] of Object.entries(o.attr || {})) w.setAttribute(a, mark(`e(${expr})`)); el.before(w); w.append(el); if (o.append) w.append(el.ownerDocument.createTextNode(mark(o.append))); } // append: HTML dựng sẵn vào cuối khối bọc
    for (const sel of b.remove || []) for (const el of QA(scope, sel)) el.remove(); // chỉ phần tử Stitch giữ chỗ (người vẽ/ảnh mẫu) – thay bằng Chars qua html/after
    const tw = scope.ownerDocument.createTreeWalker(scope, 4); const texts = []; while (tw.nextNode()) texts.push(tw.currentNode);
    for (const n of texts) { const s = n.textContent, key = s.trim(); if (!key || /\u0001/.test(s)) continue; if (n.parentElement && isIcon(n.parentElement)) continue;
      if (b.text && b.text[key] != null) n.textContent = s.replace(key, mark(`e(${b.text[key]})`)); }
  };
  // Thẻ inline (bind `tag` div → a, hoặc <a> của Stitch) bọc khối con mà không có lớp display: viền/nền/padding chỉ vẽ lên 2 mảnh rỗng trước/sau khối (chủ 4/11: thẻ Chuỗi 7 ngày).
  //   Gắn `block` ngay tại khung sinh, nên mọi màn đều đúng; trong cha flex/grid `block` không đổi gì. Cổng: scripts/test/inline-box.mjs + qa-bot `inlinebox`.
  const blockify = el => { for (const e of [el, ...el.querySelectorAll('a,span,label,b,i,em,strong')]) { if (!/^(a|span|label|b|i|em|strong)$/i.test(e.tagName)) continue; if (!e.querySelector(':scope > div,:scope > p,:scope > h1,:scope > h2,:scope > h3,:scope > h4,:scope > ul,:scope > ol,:scope > section,:scope > article')) continue;
      const c = e.getAttribute('class') || ''; if (/\u0001/.test(c)) continue; /* class động (dấu mốc): tự đặt display */ if (!/(?:^|\s)(?:[\w-]+:)*(?:block|flex|grid|inline-flex|inline-block|inline-grid|hidden|contents|table)(?:\s|$)/.test(c)) e.setAttribute('class', ('block ' + c).trim()); } };
  const textify = el => { blockify(el); // chữ tĩnh còn lại + aria-label/title/alt → t(); trả HTML có dấu mốc
    const tw = el.ownerDocument.createTreeWalker(el, 4); const texts = []; while (tw.nextNode()) texts.push(tw.currentNode);
    for (const n of texts) { const s = n.textContent; if (/\u0001/.test(s) || !needT(s) || (n.parentElement && isIcon(n.parentElement))) continue; n.textContent = s.replace(s.trim(), tr(s, 'chữ')); }
    for (const e of [el, ...el.querySelectorAll('*')]) for (const a of ['aria-label', 'title', 'alt', 'placeholder']) { const v = e.getAttribute(a); if (v && !/\u0001/.test(v) && needT(v)) e.setAttribute(a, tr(v, a)); }
    return el.outerHTML.replace(/\s+/g, ' ').replace(/[`\\]|\$\{/g, m => '\\' + m).replace(/ class="([^"]*)"/g, (_, c) => ` class="${WEB ? c : c.split(' ').map(x => (x && !/\u0001/.test(x) ? `\u0005${x}\u0006` : x)).join(' ')}"`).replace(/\u0001(\d+)\u0002/g, (_, i) => '${' + M[+i] + '}'); };
  // protos {tên: bộ chọn | {sel, …phép}}: phần tử Stitch làm KHUÔN cho nội dung dựng lúc build (vd thân bài markdown → h2/p/bảng/FAQ đúng class mẫu, không tự đặt
  //   màu/cỡ) – lấy TRƯỚC các phép của khung (khung có thể thay chỗ đó bằng html), gắn phép riêng → ST2.P.<màn>(t, e).<tên>(d) trả HTML (st-web.mjs protos()).
  const protos = Object.entries(bind.protos || {}).map(([n, o]) => { const sel = typeof o === 'string' ? o : o.sel, el = QA(root, sel)[0]; if (!el) return [n, '``'];
    const box = root.ownerDocument.createElement('div'); box.append(el.cloneNode(true)); apply(box.firstElementChild, typeof o === 'string' ? {} : o); return [n, '`' + textify(box.firstElementChild) + '`']; });
  apply(root, bind);
  const parts = Object.entries(bind.parts || {}).map(([n, sel]) => { const el = QA(root, sel)[0]; return [n, el ? '`' + textify(el) + '`' : '``']; }); // parts {tên: bộ chọn}: thêm phần khung có tên (vd thẻ câu của tấm phản hồi chèn vào khung câu hỏi) → ST2.<màn>(d).<tên>
  if (bind.keep) { const kp = QA(root, bind.keep)[0]; if (kp) { root.textContent = ''; root.append(kp); } } // keep: màn chỉ lấy MỘT phần khung (vd tấm phản hồi gắn vào khung câu hỏi có sẵn) – bộ chọn của các phép khác vẫn theo khung đầy đủ
  const part = sel => { const el = root.querySelector(sel); if (!el) return '``'; const s = textify(el); el.remove(); return '`' + s + '`'; };
  const header = part(':scope > header'), nav = part(':scope > nav'), footer = WEB ? part(':scope > footer') : '``', main = '`' + textify(root).replace(/^<div[^>]*>|<\/div>$/g, '') + '`';
  return { header, nav, footer, main, parts, protos, root: root.getAttribute('class') || '' }; }

// web: CSS thành phần trong <style> của Stitch (nút 3D, thẻ tactile, chấm FAQ…) → brand/stitch/web/gen/<trang>.css, giữ NGUYÊN giá trị Stitch.
//   Bỏ phần nền (html/body/@layer/@import/font icon – đã có ở WPRE). Rule giống nhau ở 2 bản → chung; khác → bản sáng/tối theo cùng cơ chế lt:/dk:.
//   Bộ chọn mang tiền tố `:W ` – scripts/build-stitch-css.mjs thay bằng .v2s-web-<trang> (khóa phạm vi như app).
function webCss(hl, hd) {
  const rules = h => { const out = new Map(), doc = new JSDOM(h, { virtualConsole: VC }).window.document;
    for (const sh of doc.styleSheets) { let rs; try { rs = sh.cssRules; } catch { continue; } for (const r of rs) { if (!r.selectorText || !r.style) continue;
      const sel = r.selectorText.split(',').map(x => x.trim()).filter(x => !/^(html|body|:root|\*)\b|material-symbols|::-webkit-scrollbar/.test(x)); if (!sel.length) continue;
      const k = sel.join(','), body = r.style.cssText.trim(); out.set(k, (out.get(k) || '') + body); } } return out; };
  const L = rules(hl), D = rules(hd), pre = (k, wrap) => k.split(',').map(x => wrap(':W ' + x)).join(','), lines = [];
  const LT = x => `:root:not([data-theme=dark]) ${x}`, DK = x => `:root:not([data-theme=light]) ${x}`;
  for (const k of new Set([...L.keys(), ...D.keys()])) { const l = L.get(k), d = D.get(k);
    if (l && l === d) { lines.push(`${pre(k, x => x)}{${l}}`); continue; }
    if (l) lines.push(`@media (prefers-color-scheme:light){${pre(k, LT)}{${l}}}${pre(k, x => `:root[data-theme=light] ${x}`)}{${l}}`);
    if (d) lines.push(`@media (prefers-color-scheme:dark){${pre(k, DK)}{${d}}}${pre(k, x => `:root[data-theme=dark] ${x}`)}{${d}}`); }
  return lines.join('\n') + (lines.length ? '\n' : ''); }

// Gọn khung (bỏ class lặp, HTML ra y nguyên): textify đánh dấu mỗi class tĩnh \u0005…\u0006; lớp lặp nguyên chuỗi → K[i], từ lặp → _[i], chỉ khi lợi byte. Tailwind vẫn đọc được vì từng class nằm nguyên văn trong bảng.
const plain = s => s.replace(/[\u0005\u0006]/g, '');
function shrink(body) { const cnt = new Map(), WHOLE = /(?<= class=")((?:\u0005[^\u0005\u0006]*\u0006 ?)+)(?=")/g;
  for (const [m] of body.matchAll(WHOLE)) cnt.set(m, (cnt.get(m) || 0) + 1);
  const ICON = /material-symbols/; // giữ nguyên chữ: build-stitch-css icons() đọc tên icon ngay sau class này để dựng phông
  const K = [...cnt].filter(([m, n]) => !ICON.test(m) && n > 1 && (plain(m).length - 8) * n > plain(m).length + 3).sort((a, b) => b[1] - a[1]).map(x => x[0]), ki = new Map(K.map((m, i) => [m, i]));
  let out = body.replace(WHOLE, m => (ki.has(m) ? '${K[' + ki.get(m) + ']}' : m)); const tab = K.join('\n'), tc = new Map();
  for (const [, x] of (out + '\n' + tab).matchAll(/\u0005([^\u0005\u0006]*)\u0006/g)) tc.set(x, (tc.get(x) || 0) + 1);
  const T = [...tc].filter(([x, n]) => !ICON.test(x) && (x.length - 8) * n > x.length + 3).sort((a, b) => b[1] - a[1]).map(x => x[0]), ti = new Map(T.map((x, i) => [x, i]));
  const tok = s => s.replace(/\u0005([^\u0005\u0006]*)\u0006/g, (_, x) => (ti.has(x) ? '${_[' + ti.get(x) + ']}' : x));
  const lit = a => '[' + a.map(x => '`' + x + '`').join(', ') + ']'; // có dấu cách: bộ tách class của Tailwind không dính 2 mục kề nhau
  return { body: tok(out), head: (T.length ? `const _ = ${lit(T)}; ` : '') + (K.length ? `const K = ${lit(K.map(tok))}; ` : '') }; }

// ---- chạy ----
for (const k of SCREENS) { const bind = JSON.parse(fs.readFileSync(path.join(SRC, 'bind', k + '.json'), 'utf8')), f = s => path.join(SRC, `${bind.src || k}-${s}.html`); // src: màn lấy khung từ cặp HTML của màn khác (vd cột phải today-rail ← today-desk)
  if (!fs.existsSync(f('light')) || !fs.existsSync(f('dark'))) { errs.push(`${k}: thiếu file Stitch`); continue; }
  const hl = fs.readFileSync(f('light'), 'utf8'), hd = fs.readFileSync(f('dark'), 'utf8');
  // keys {khóa Việt: chữ EN}: chữ do generator dựng lúc build (tr(lang)(khóa) trong scripts/lib/st-web.mjs) – không nằm trong mẫu nhưng đi cùng pipeline v2web 15 ngôn ngữ
  for (const [kk, v] of Object.entries(bind.keys || {})) { const have = EN_HAVE[kk]; if (have && have[0] !== v) errs.push(`${k}: khóa ${JSON.stringify(kk)} đã có nghĩa ${JSON.stringify(have[0])} (${have[1]}) ≠ ${JSON.stringify(v)}`); else if (!have) enMap[kk] = v; }
  const L = new JSDOM(hl, { virtualConsole: VC }).window.document, D = new JSDOM(hd, { virtualConsole: VC }).window.document, RL = resolver(cfgOf(hl, k + '-light')), RD = resolver(cfgOf(hd, k + '-dark'));
  if (bind.styles) { RL.sty = stylesOf(hl, k + '-light'); RD.sty = stylesOf(hd, k + '-dark'); }
  if (bind.swap) RL.swap = RD.swap = bind.swap;
  const doc = new JSDOM('<div></div>').window.document, body = merge(L.body, D.body, RL, RD, doc), root = doc.createElement('div');
  root.setAttribute('class', `st v2 v2-${k} ` + (body.getAttribute('class') || '') + (bind.rootClass ? ' ' + bind.rootClass : '')); root.append(...body.childNodes); // rootClass: nền/chữ mà mẫu đặt ở rule body của <style> (bỏ khi ghép)
  // unwrap: mẫu bọc header/section/footer trong 1 khung (vd div max-w-[1280px] của landing v3) → gộp class khung vào gốc, đưa con lên gốc
  //   (đầu/chân trang phải là con trực tiếp để tách chrome.js; hình không đổi vì gốc mang đúng class khung)
  if (bind.unwrap) { const w = root.querySelector(bind.unwrap); if (!w || w.parentElement !== root) errs.push(`${k}: unwrap không khớp con trực tiếp: ${bind.unwrap}`);
    else { root.setAttribute('class', root.getAttribute('class') + ' ' + (w.getAttribute('class') || '')); w.replaceWith(...w.childNodes); } }
  if (A.includes('--dump') && ONLY.length && !ONLY.includes(k)) continue;
  if (A.includes('--dump')) { const walk = (e, d, path) => { const cls = (e.getAttribute('class') || '').split(' ').filter(c => !/^(lt|dk):/.test(c)).slice(0, 4).join('.'), al = e.getAttribute('aria-label'), tx = [...e.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join(' ');
      console.log(`${'  '.repeat(d)}${path} <${e.tagName.toLowerCase()}> ${cls}${al ? ` [${al}]` : ''}${tx ? ` "${tx.slice(0, 40)}"` : ''}`); [...e.children].forEach((c, i) => walk(c, d + 1, `${path}>${i + 1}`)); };
    walk(root, 0, '·'); continue; }
  const o = emit(root, bind, k);
  if (WEB) { const cs = `/* TỰ SINH bởi scripts/stitch-v2-convert.mjs --web từ <style> của ${SRC}/${k}-light|dark.html – KHÔNG sửa tay. */\n` + webCss(hl, hd), cf = path.join(OUT, k + '.css');
    if (CHECK) { if (!fs.existsSync(cf) || fs.readFileSync(cf, 'utf8') !== cs) errs.push(`${cf} trôi`); } else if (!ONLY.length || ONLY.includes(k)) { fs.mkdirSync(OUT, { recursive: true }); fs.writeFileSync(cf, cs); } }
  // Thanh tab: icon = sprite SVG #i-* của index.html (cùng nguồn với menu trái + #bnav) thay chữ ghép Material Symbols – font chậm/thiếu glyph không bao giờ lộ chữ "home"/"H"; mục đang chọn = tô đầy (st-ti-on)
  const svgTabs = n => { let i = 0; const r = n.replace(/<span class="material-symbols-outlined[^"]*">\$\{x\.icon\}<\/span>/g, () => `<svg class="i st-ti${i++ ? '' : ' st-ti-on'}" aria-hidden="true" focusable="false"><use href="#\${e(x.svg)}"/></svg>`); if (i !== 2) throw new Error('shell nav: cần đúng 2 ô icon tab (đang chọn + thường), thấy ' + i); return r; };
  if (bind.shell) { // đầu trang + thanh tab chuẩn chung cho mọi màn có tab (lấy từ màn này) → shell.js; màn này chỉ giữ main
    const sh = `/* TỰ SINH bởi scripts/stitch-v2-convert.mjs (đầu trang + thanh tab chung, nguồn: ${k}) – KHÔNG sửa tay. */\n(self.ST2 || (self.ST2 = {})).shell = (d, t = self.t || (s => s), e = self.ST ? ST.esc : (s => String(s))) => ({ header: ${plain(o.header)},\n nav: ${svgTabs(plain(o.nav))} });\n`;
    const so = path.join(OUT, 'shell.js'); if (CHECK) { if (!fs.existsSync(so) || fs.readFileSync(so, 'utf8') !== sh) errs.push(`${so} trôi`); } else { fs.mkdirSync(OUT, { recursive: true }); fs.writeFileSync(so, sh); }
    o.header = '``'; o.nav = '``'; }
  if (WEB && bind.chrome) { // web: đầu trang + chân trang chung cho MỌI trang tĩnh (lấy từ trang này) → chrome.js; các trang khác `remove` header/footer của Stitch
    const ch = `/* TỰ SINH bởi scripts/stitch-v2-convert.mjs --web (đầu trang + chân trang chung, nguồn: ${k}) – KHÔNG sửa tay. */\n(self.ST2 || (self.ST2 = {})).chrome = (d, t = self.t || (s => s), e = self.ST ? ST.esc : (s => String(s))) => ({ header: ${o.header},\n footer: ${o.footer} });\n`;
    const co = path.join(OUT, 'chrome.js'); if (CHECK) { if (!fs.existsSync(co) || fs.readFileSync(co, 'utf8') !== ch) errs.push(`${co} trôi`); } else { fs.mkdirSync(OUT, { recursive: true }); fs.writeFileSync(co, ch); }
    o.header = '``'; o.footer = '``'; }
  const code = `(self.ST2 || (self.ST2 = {}))[${JSON.stringify(k)}] = (d, t = self.t || (s => s), e = self.ST ? ST.esc : (s => String(s))) => ({ root: ${JSON.stringify(o.root)},\n header: ${o.header},\n main: ${o.main},\n nav: ${o.nav}${WEB ? `,\n footer: ${o.footer}` : ''}${o.parts.map(([n, h]) => `,\n ${n}: ${h}`).join('')} });\n` +
    (o.protos.length ? `(self.ST2.P || (self.ST2.P = {}))[${JSON.stringify(k)}] = (t = self.t || (s => s), e = self.ST ? ST.esc : (s => String(s))) => ({\n${o.protos.map(([n, h]) => ` ${JSON.stringify(n)}: d => ${h}`).join(',\n')} });\n` : ''), sk = shrink(code);
  const js = `/* TỰ SINH bởi scripts/stitch-v2-convert.mjs từ ${SRC}/${k}-light|dark.html + bind/${k}.json – KHÔNG sửa tay (sửa bind map rồi chạy lại). */\n` + (sk.head ? `{ ${sk.head}\n${sk.body}}\n` : sk.body);
  const out = path.join(OUT, k + '.js');
  if (CHECK) { if (!fs.existsSync(out) || fs.readFileSync(out, 'utf8') !== js) errs.push(`${k}: ${out} trôi so với Stitch/bind (chạy lại bộ chuyển)`); }
  else if (!ONLY.length || ONLY.includes(k)) { fs.mkdirSync(OUT, { recursive: true }); fs.writeFileSync(out, js); console.log(`✓ ${k}: ${(js.length / 1024).toFixed(1)} KB`); } }
{ const en = `/* English UI – ${WEB ? 'v2web (trang web Stitch' : 'v2 (màn Stitch v2'}: TỰ SINH bởi scripts/stitch-v2-convert.mjs, khóa Việt → chữ Stitch; lazy group, LAZY in scripts/build-i18n.sh) */\n(function (g) { const D = g.I18N_DICT = g.I18N_DICT || {}; D.en = Object.assign(D.en || {}, {\n${Object.entries(enMap).sort().map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)},`).join('\n')}\n}); })(typeof self !== 'undefined' ? self : this);\n`;
  if (CHECK) { if (!fs.existsSync(EN) || fs.readFileSync(EN, 'utf8') !== en) errs.push(`${EN} trôi`); } else if (!A.includes('--dump')) fs.writeFileSync(EN, en); } // --dump chỉ in sơ đồ: KHÔNG ghi en/v2.js (bỏ qua màn → mất khóa các màn khác)
if (errs.length) { console.error('✗ stitch-v2-convert:\n  ' + errs.join('\n  ')); process.exit(1); }
