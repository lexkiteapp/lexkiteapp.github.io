// Định dạng ỔN ĐỊNH cho registry (object literal mà mỗi màn/tính năng mới đều thêm một mục): MỖI MỤC MỘT DÒNG, dấu phẩy cuối mọi dòng,
// sắp theo khóa (trừ registry mà thứ tự có nghĩa, sort:false). Hai PR thêm hai mục khác nhau → sửa hai dòng khác nhau → git/GitHub tự gộp.
// Gốc 10/11: ROUTE_BUNDLE/BCSS (web/js/app.js), V2DATA (build-stitch-css), SCREENS/V2REF (stitch-screens) viết trên MỘT dòng dài → PR nào
// thêm màn cũng sửa cùng dòng đó → #934 xung đột 3 lần/ngày. Kiểm + sửa: node scripts/fmt-stable.mjs [--check]; quy tắc: docs/METHODS.md › Chống xung đột.
// Bộ quét nhỏ, không phụ thuộc (chuỗi '"`, ${…}, chú thích // và /* */, ngoặc lồng nhau) – registry chỉ chứa literal/biểu thức đơn giản, không có regex literal.

/** Danh sách registry được giữ định dạng. mark = đoạn mã đứng ngay trước dấu "{" mở registry (duy nhất trong tệp). */
export const REGISTRIES = [
  { file: 'web/js/app.js', mark: "const G = 'js/grammar/', BUNDLES = ", sort: false }, // thứ tự = thứ tự tải sẵn (App.prefetchAll) → không sắp
  { file: 'web/js/app.js', mark: 'const ROUTE_BUNDLE = ' },
  { file: 'web/js/app.js', mark: 'const BCSS = ' },
  { file: 'scripts/build-stitch-css.mjs', mark: 'const V2DATA = ' },
  { file: 'scripts/build-stitch-css.mjs', mark: 'const WEBDATA = ' },
  { file: 'scripts/test/stitch-screens.mjs', mark: 'export const SCREENS = ' },
  { file: 'scripts/test/stitch-screens.mjs', mark: 'export const V2REF = ' },
];

const OPEN = { '{': '}', '[': ']', '(': ')' };

/** Quét từ vị trí `{` (src[i0] === '{') tới ngoặc đóng khớp. Trả { end, items, tailComments }: items = [{ text, lead, trail }] theo thứ tự,
 *  text = mã một mục (không gồm dấu phẩy); lead = chú thích dòng riêng NGAY TRƯỚC mục; trail = chú thích cuối dòng của mục. */
export function scanObject(src, i0) {
  if (src[i0] !== '{') throw new Error('fmt-registry: không phải "{" ở vị trí ' + i0);
  const items = []; let depth = 0, cur = '', i = i0 + 1, pend = [], ctrail = [];
  const push = () => { const t = cur.trim(); if (t) items.push({ text: t, lead: pend, trail: ctrail, line: lineOf(i - (cur.length - cur.trimEnd().length) - t.length) }), pend = [], ctrail = []; cur = ''; };
  const lineOf = p => { let n = 0; for (let j = i0; j < p; j++) if (src[j] === '\n') n++; return n; };
  const lineHasCode = () => /\S/.test(cur.slice(cur.lastIndexOf('\n') + 1));
  const stack = [];
  for (; i < src.length; i++) {
    const c = src[i];
    if (c === '/' && src[i + 1] === '/') { // chú thích dòng
      const e = src.indexOf('\n', i), end = e < 0 ? src.length : e, text = src.slice(i, end);
      if (depth > 0) { cur += text; i = end - 1; continue; }
      // sau mục trên cùng dòng → đuôi của mục vừa xong (hoặc mục đang viết); dòng riêng → dẫn của mục kế tiếp
      const before = src.slice(src.lastIndexOf('\n', i - 1) + 1, i);
      if (lineHasCode()) ctrail.push(text); // mục chưa có dấu phẩy (mục cuối) → đuôi của chính mục đó
      else if (/\S/.test(before) && items.length) { // nhiều mục chung dòng có một chú thích → chú thích của cả nhóm: đặt thành dòng dẫn trên mục đầu nhóm
        const ln = lineOf(i), same = items.filter(it => it.line === ln);
        if (same.length > 1) same[0].lead.push(text); else items[items.length - 1].trail.push(text);
      }
      else pend.push(text);
      i = end - 1; continue;
    }
    if (c === '/' && src[i + 1] === '*') { const e = src.indexOf('*/', i + 2) + 2; if (e < 2) throw new Error('fmt-registry: /* không đóng'); cur += src.slice(i, e); i = e - 1; continue; }
    if (c === "'" || c === '"') { let j = i + 1; for (; j < src.length && src[j] !== c; j++) if (src[j] === '\\') j++; cur += src.slice(i, j + 1); i = j; continue; }
    if (c === '`') { // template: ${…} có thể lồng ngoặc nhưng không lồng template khác (đủ cho registry)
      let j = i + 1, d = 0; for (; j < src.length; j++) { const x = src[j]; if (x === '\\') { j++; continue; } if (x === '$' && src[j + 1] === '{') { d++; j++; continue; } if (x === '}' && d) { d--; continue; } if (x === '`' && !d) break; }
      cur += src.slice(i, j + 1); i = j; continue;
    }
    if (OPEN[c]) { stack.push(OPEN[c]); depth++; cur += c; continue; }
    if (c === '}' || c === ']' || c === ')') {
      if (!depth) { if (c !== '}') throw new Error('fmt-registry: ngoặc lệch ' + c); push(); return { end: i, items, tailComments: pend }; }
      if (stack.pop() !== c) throw new Error('fmt-registry: ngoặc lệch ' + c);
      depth--; cur += c; continue;
    }
    if (c === ',' && !depth) { push(); continue; }
    cur += c;
  }
  throw new Error('fmt-registry: không thấy ngoặc đóng');
}

/** Khóa sắp xếp của một mục: tên định danh hoặc chuỗi trước dấu ":"; mục kiểu ...spread / viết tắt → null. */
export function keyOf(text) {
  const m = /^(?:([A-Za-z_$][\w$]*)|'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)")\s*:/.exec(text);
  return m ? (m[1] ?? m[2] ?? m[3]) : null;
}

/** Định dạng một registry trong mã nguồn → mã mới (không đổi nếu đã chuẩn). Thuần. */
export function formatRegistry(src, { mark, sort = true, file = '' }) {
  const at = src.indexOf(mark);
  if (at < 0) throw new Error(`fmt-registry: ${file} không còn "${mark}" – sửa REGISTRIES trong scripts/lib/fmt-registry.mjs`);
  if (src.indexOf(mark, at + 1) >= 0) throw new Error(`fmt-registry: ${file} có hai chỗ "${mark}"`);
  const i0 = at + mark.length, { end, items, tailComments } = scanObject(src, i0);
  const ind = /^[ \t]*/.exec(src.slice(src.lastIndexOf('\n', at) + 1))[0], in2 = ind + '  ';
  let list = items;
  if (sort) {
    const bad = items.find(it => keyOf(it.text) === null);
    if (bad) throw new Error(`fmt-registry: ${file} ${mark.trim()} có mục không khóa (${bad.text.slice(0, 40)}) – không sắp được`);
    const keys = items.map(it => keyOf(it.text)), dup = keys.find((k, j) => keys.indexOf(k) !== j);
    if (dup) throw new Error(`fmt-registry: ${file} ${mark.trim()} trùng khóa "${dup}"`);
    list = [...items].sort((a, b) => (keyOf(a.text) < keyOf(b.text) ? -1 : keyOf(a.text) > keyOf(b.text) ? 1 : 0));
  }
  const lines = list.flatMap(it => [...it.lead.map(c => in2 + c), in2 + it.text + ',' + (it.trail.length ? ' ' + it.trail.join(' ') : '')]);
  const body = '{\n' + [...lines, ...tailComments.map(c => in2 + c)].join('\n') + '\n' + ind + '}';
  return src.slice(0, i0) + body + src.slice(end + 1);
}

/** Định dạng mọi registry của một tệp. Thuần. */
export function formatFile(src, regs) { return regs.reduce((s, r) => formatRegistry(s, r), src); }
