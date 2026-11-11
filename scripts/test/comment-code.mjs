// 🧷 Chú thích "nuốt" code (3/11: 2 lần trong ngày – "x; // ghi chú raf = requestAnimationFrame(frame)" làm chết vòng vẽ mặt (#293), #284 lesson-embed):
// dòng có `//` mà phía SAU vẫn là câu lệnh thật (gán / gọi hàm kết thúc bằng ";") → đỏ. Quét mọi web/js/**/*.js (trừ thư viện bên thứ ba web/js/vendor).
// Cách sửa: đưa code ra TRƯỚC `//` (chú thích luôn ở cuối dòng). Test hồi quy: node scripts/test/comment-code.mjs --self
import fs from 'node:fs'; import path from 'node:path';
import { SCAN_ROOTS } from '../lib/scan-roots.mjs';
// vị trí `//` mở chú thích thật trong 1 dòng (bỏ qua chuỗi '…' "…" `…`, regex /…/ đơn giản, URL "://")
export function commentAt(line) {
  let q = null, re = false, prev = '';
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) { if (c === '\\') { i++; continue; } if (c === q) q = null; continue; }
    if (re) { if (c === '\\') { i++; continue; } if (c === '/') re = false; continue; }
    if (c === '"' || c === "'" || c === '`') { q = c; continue; }
    if (c === '/' && line[i + 1] === '/') return line[i - 1] === ':' ? -1 : i;
    if (c === '/' && line[i + 1] === '*') { const e = line.indexOf('*/', i + 2); if (e < 0) return -1; i = e + 1; continue; }
    if (c === '/' && /[(,=:[!&|?{};>]$|^$|return$/.test(prev.trimEnd())) { re = true; continue; }
    if (!/\s/.test(c)) prev += c; else prev += ' ';
  }
  return -1;
}
// đuôi chú thích trông như câu lệnh: `a.b = …;` · `x += …;` · `f(…);` · `const|let|var …;` – kết thúc bằng ";" (chữ thường không kết thúc như vậy)
const STMT = /(?:^|[\s(])(?:(?:const|let|var)\s+[\w$]+\s*=|[A-Za-z_$][\w$.]*(?:\[[^\]]*\])?\s*(?:=|\+=|-=|\*=)(?!=)|[A-Za-z_$][\w$.]*\([^()]*(?:\([^()]*\)[^()]*)*\))[^;]*;\s*$/;
export const swallowed = line => { const i = commentAt(line); if (i < 0 || !line.slice(0, i).trim()) return null; // chỉ dòng CÓ code trước // (dòng chú thích riêng = ví dụ/tài liệu)
  const tail = line.slice(i + 2); return STMT.test(tail) ? tail.trim() : null; };

if (process.argv.includes('--self')) {
  const bad = ['      cur = s; stats.blink = 1; // blink: test mắt mở raf = requestAnimationFrame(frame);', 'fit(); // data-face (QA) stats.t0 = performance.now();', 'a(); // xem b.c(1);', 'x(); // tạm tắt: const y = 2;'];
  const good = ['a(); // ghi chú thường, có dấu chấm.', "const u = 'https://x.y/z'; // URL", 'b(); // ví dụ: gọi f() khi cần', 's = s.replace(/\\/\\//g, "") // hai gạch trong regex', '// 3/11: đổi a → b (xem #293)', "const t = '// không phải chú thích; x = 1;';", '  // ví dụ: const tok = App.routeToken(); if (x) return;', "const v = o => /^video\\//.test(String(f(o) || '')) || g(o);"];
  const fail = [...bad.filter(l => !swallowed(l)).map(l => 'bỏ sót: ' + l), ...good.filter(l => swallowed(l)).map(l => 'báo nhầm: ' + l)];
  if (fail.length) { console.error('✗ comment-code --self\n  ' + fail.join('\n  ')); process.exit(1); }
  console.log(`✓ comment-code --self: bắt ${bad.length} mẫu nuốt code, bỏ qua ${good.length} mẫu chú thích thường`);
} else {
  const hits = [];
  const walk = d => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) { if (e.name !== 'vendor') walk(p); } else if (p.endsWith('.js') && !p.endsWith('.min.js')) fs.readFileSync(p, 'utf8').split('\n').forEach((l, n) => { if (l.length > 2000) return; const t = swallowed(l); if (t) hits.push(`${p}:${n + 1}  // ${t.slice(0, 90)}`); }); } };
  SCAN_ROOTS.filter(r => fs.existsSync(r)).forEach(walk);
  if (hits.length) { console.error(`✗ comment-code: ${hits.length} dòng có code thật nằm SAU \`//\` (bị chú thích nuốt – đưa code ra trước //):\n  ` + hits.join('\n  ')); process.exit(1); }
  console.log('✓ comment-code: không có code bị chú thích nuốt trong web/js');
}
