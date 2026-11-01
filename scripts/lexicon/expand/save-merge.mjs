#!/usr/bin/env node
// Lưu kết quả lexicon-expand lên main KHÔNG mất lô (31/10: run 41178484346 – lượt cron chờ hàng đợi checkout SHA cũ, 2 giờ ra 161 mục đạt,
// `git pull --rebase` xung đột ở retry/words.json · review-queue.json · ai-capacity.json → bước lưu đỏ, mất cả lô).
//   node scripts/lexicon/expand/save-merge.mjs <baseRef> <oursDir> <tệp>…
// Đĩa = origin/main mới (theirs); <oursDir>/<tệp> = bản lượt này (thiếu = lượt đã xoá); <baseRef> = commit lượt đã checkout.
// Gộp 3 chiều theo JSON: khoá đối tượng đệ quy; mảng theo danh tính (src|id|batch, k, hoặc cả phần tử) – thêm/sửa/xoá của lượt áp lên bản mới; cùng sửa → bản lượt thắng.
import fs from 'fs';
import { execFileSync } from 'child_process';

const NONE = Symbol('none');
const eq = (a, b) => a === b || (a !== NONE && b !== NONE && JSON.stringify(a) === JSON.stringify(b));
const isObj = v => v && typeof v === 'object' && !Array.isArray(v);
const ident = x => (isObj(x) && (x.id != null || x.k != null) ? [x.src ?? '', x.id ?? x.k, x.batch ?? ''].join('|') : JSON.stringify(x));

export function merge3(base, ours, theirs) {
  if (eq(ours, base)) return theirs;
  if (eq(theirs, base) || eq(ours, theirs)) return ours;
  if (isObj(ours) && isObj(theirs)) {
    const b = isObj(base) ? base : {}, out = {};
    for (const k of new Set([...Object.keys(theirs), ...Object.keys(ours)])) {
      const v = merge3(k in b ? b[k] : NONE, k in ours ? ours[k] : NONE, k in theirs ? theirs[k] : NONE);
      if (v !== NONE) out[k] = v;
    }
    return out;
  }
  if (Array.isArray(ours) && Array.isArray(theirs)) {
    const B = new Map((Array.isArray(base) ? base : []).map(x => [ident(x), x])), O = new Map(ours.map(x => [ident(x), x]));
    const gone = new Set([...B.keys()].filter(k => !O.has(k)));                       // lượt đã xoá (vd. retry đã làm xong)
    const mine = new Set([...O.keys()].filter(k => !B.has(k) || !eq(B.get(k), O.get(k)))); // lượt đã thêm/sửa
    const out = theirs.filter(x => !gone.has(ident(x)) && !mine.has(ident(x)));
    for (const x of ours) if (mine.has(ident(x))) out.push(x);
    return out;
  }
  return ours; // vô hướng / khác kiểu: cùng sửa → bản lượt thắng
}

// giữ đúng định dạng tệp (thụt 1 / dòng mỗi mục kiểu lô chờ) để diff gọn
export function fmt(v, like) {
  const m = /^[[{]\n( +)\S/.exec(like || '');
  if (m) return JSON.stringify(v, null, m[1].length) + '\n';
  return JSON.stringify(v).replace(/,"(?=[^"]+#(n|v|adj|adv)":)/g, ',\n"') + '\n';
}

const parse = t => { try { return t == null ? NONE : JSON.parse(t); } catch { return undefined; } };
const read = p => (fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null);
const atBase = (ref, f) => { try { return execFileSync('git', ['show', `${ref}:${f}`], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 1 << 28 }); } catch { return null; } };

if (import.meta.url === `file://${process.argv[1]}`) {
  const [ref, dir, ...files] = process.argv.slice(2);
  let n = 0;
  for (const f of files) {
    const oT = read(`${dir}/${f}`), tT = read(f), bT = atBase(ref, f), [b, o, t] = [bT, oT, tT].map(parse);
    let out;
    if (o === undefined || t === undefined || b === undefined) out = oT == null ? NONE : oT; // không phải JSON → bản lượt
    else { const v = merge3(b, o, t); if (isObj(v) && isObj(v.items) && typeof v.n === 'number') v.n = Object.keys(v.items).length; // lô chờ: n = số mục sau gộp
      out = v === NONE ? NONE : eq(v, o) ? oT : eq(v, t) ? tT : fmt(v, oT || tT); }
    if (out === NONE) { if (tT != null) fs.unlinkSync(f); } else if (out !== tT) { fs.mkdirSync(f.replace(/\/[^/]*$/, ''), { recursive: true }); fs.writeFileSync(f, out); n++; }
  }
  console.log(`✓ save-merge: ${files.length} tệp, ${n} ghi (gộp 3 chiều trên origin/main)`);
}
