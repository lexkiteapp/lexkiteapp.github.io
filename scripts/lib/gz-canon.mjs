// 📏 Đo khung app CHUẨN cho size-budget.mjs (cổng) và shell-size.mjs (báo cáo): cùng một con số trên mọi máy, mọi bản Node.
// 1) gzSize – vì sao không dùng zlib.gzipSync: Node chính thức (CI, Node 22) gói zlib bản Chromium (tối ưu SIMD theo CPU) – cùng mức 9
//    nhưng chọn chuỗi khớp khác zlib gốc → file nén to hơn ~0,7% (khung app CI 376,1 KB khi máy Mac đo 373,4 KB, cùng mã nguồn);
//    Node Homebrew/hệ thống dùng zlib gốc. Con số phụ thuộc bản dựng Node + CPU → "máy xanh, CI đỏ" (shell-size in process.versions.zlib).
//    Ở đây: pako 2.1.0 (bản port JS thuần của zlib gốc, MIT – scripts/lib/pako-deflate.min.cjs), mức 9: không phụ thuộc CPU/bản Node,
//    byte-khớp zlib gốc (đã đối chiếu 31 file khung). Trần trong budget.json quy đổi sang thước này rồi làm TRÒN XUỐNG (không nới).
// 2) firstLoadFiles – mọi file trình duyệt tải ngay khi mở /app/: SHELL (web/sw.js, cache sẵn) ∪ <script src>/<link stylesheet> cục bộ
//    trong web/app/index.html. Trước 01/11 chỉ đếm SHELL → file nạp ngay mà không có trong SHELL (report-pill.js, css/tactile.css) lọt khỏi trần.
import fs from 'fs';
import { createRequire } from 'module';
const pako = createRequire(import.meta.url)('./pako-deflate.min.cjs');
export const gzSize = buf => pako.gzip(buf, { level: 9 }).length;

export const swShell = (web = 'web') => { const sw = fs.readFileSync(`${web}/sw.js`, 'utf8'); return [...(sw.match(/const SHELL = \[([\s\S]*?)\];/) || [, ''])[1].matchAll(/'([^']+)'/g)].map(m => m[1]).filter(u => u !== './').map(u => u.endsWith('/') ? u + 'index.html' : u); }; // '/app/' = web/app/index.html
export const eagerFiles = (web = 'web') => { const h = fs.readFileSync(`${web}/app/index.html`, 'utf8'); return [...h.matchAll(/<script\b[^>]*\bsrc="([^"]+)"|<link\b[^>]*\brel="stylesheet"[^>]*\bhref="([^"]+)"/g)].map(m => m[1] || m[2]).filter(u => !/^(https?:)?\/\//.test(u)).map(u => '/' + u.replace(/^\/+/, '').replace(/[?#].*$/, '')); };
export const firstLoadFiles = (web = 'web') => [...new Set([...swShell(web), ...eagerFiles(web)])];
