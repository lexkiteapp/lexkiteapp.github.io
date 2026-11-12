// Tách ghi chú học từ (content/notes-src/notes-*.js) thành file nhỏ theo chữ cái đầu: web/js/notes/<a-z|_>.json
// → khi học chỉ tải đúng phần cần (≈1/26 dung lượng), không tải cả kho ghi chú. Chạy lại khi ghi chú thay đổi.
import fs from 'node:fs';
import vm from 'node:vm';
const ctx = { self: {} }; ctx.self = ctx; vm.createContext(ctx);
for (const f of fs.readdirSync('content/notes-src').filter(f => /^notes-.*\.js$/.test(f)).sort()) { try { vm.runInContext(fs.readFileSync('content/notes-src/' + f, 'utf8'), ctx); } catch (e) { console.warn('⚠ bỏ qua ' + f + ': ' + e.message); } }
const N = ctx.WORD_NOTES || {}, by = {};
for (const [w, n] of Object.entries(N)) { const c = /^[a-z]/.test(w) ? w[0] : '_'; (by[c] = by[c] || {})[w] = n; }
fs.mkdirSync('web/js/notes', { recursive: true });
for (const f of fs.readdirSync('web/js/notes')) fs.unlinkSync('web/js/notes/' + f);
for (const [c, o] of Object.entries(by)) fs.writeFileSync(`web/js/notes/${c}.json`, JSON.stringify(o));
console.log(`✓ ghi chú: ${Object.keys(N).length} từ → ${Object.keys(by).length} file theo chữ cái`);
