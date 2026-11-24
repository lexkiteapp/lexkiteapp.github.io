// Trần web/cpack (gói nội dung TẢI LƯỜI – không phải first-load) theo MỐC ĐO do bot giữ, thay cho budget.cpackTotal sửa tay (gốc xung đột 24/11:
// mỗi PR sửa cpackTotal + thêm _cpackNote… trong budget.json → một PR gộp là mọi PR còn lại xung đột, json-dupkeys bắt khoá trùng).
//   scripts/test/cpack-floor.json {measured, updated}: CHỈ bot (cpack-floor.yml → scripts/ci/cpack-ratchet.mjs) ghi, sau mỗi lần gộp vào main. PR không sửa.
//   Trần PR = measured + ALLOWANCE (+ phần khai trong scripts/test/cpack-notes/<tên-nhánh>.md, dòng `cpack-extra: <byte>` + lý do; tệp riêng mỗi PR → không đụng dòng chung;
//   bot xoá ghi chú khi nâng mốc). Ngân sách first-load/khung/người học (budget.json) KHÔNG liên quan. Xem docs/CI-RUNNERS.md › Trần web/cpack.
import fs from 'node:fs';
import path from 'node:path';
export const FLOOR = 'scripts/test/cpack-floor.json', NOTES = 'scripts/test/cpack-notes';
export const ALLOWANCE = 400 * 1000; // mỗi PR được thêm tối đa ~400 KB dữ liệu lười; hơn thì khai lý do trong NOTES (không nâng tay số chung)
export const cpackFiles = (d = 'web/cpack') => fs.existsSync(d) ? fs.readdirSync(d, { withFileTypes: true }).flatMap(e => { const p = path.join(d, e.name); return e.isDirectory() ? cpackFiles(p) : p.endsWith('.js') ? [p] : []; }) : [];
export const cpackBytes = () => cpackFiles().reduce((n, p) => n + fs.statSync(p).size, 0);
export const readFloor = () => { try { return JSON.parse(fs.readFileSync(FLOOR, 'utf8')).measured; } catch { return -1; } }; // thiếu tệp → -1: size-budget đỏ rõ, ratchet tạo mới
export const noteFiles = () => fs.existsSync(NOTES) ? fs.readdirSync(NOTES).filter(f => f.endsWith('.md')).map(f => path.join(NOTES, f)) : [];
export const noteExtra = () => noteFiles().reduce((n, f) => n + (+(fs.readFileSync(f, 'utf8').match(/^cpack-extra:\s*(\d+)/m) || [])[1] || 0), 0);
export const cpackCeiling = () => readFloor() + ALLOWANCE + noteExtra();
// diff của budget.json (unified) có THÊM/sửa (dòng +; xoá thì không sao) trần cpack hay ghi chú _cpackNote…? → danh sách dòng vi phạm
export const ceilingEdits = diff => diff.split('\n').filter(l => /^\+\s*"(cpackTotal|_cpackNote\w*)"/.test(l));
