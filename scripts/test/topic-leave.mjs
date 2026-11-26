// Issue #1625 (26/11): E2E báo Lỗi JS ở #/model/t1-travel "Cannot set properties of null (setting 'textContent')" (app.js: trang bộ từ #/topic).
// Gốc: "Thêm tất cả" (#addAll) thêm từng từ bất đồng bộ; xong sau khi người dùng đã sang trang khác → header()/draw() ghi vào #tCount/#addAll/#wordList đã mất.
// Cổng: header()/draw() chỉ chạy khi khung trang bộ từ còn (không ném lỗi), và onclick không giả định #addAll còn tồn tại.
//   node scripts/test/topic-leave.mjs
import fs from 'node:fs';
let n = 0, fails = 0; const ok = (c, m) => { n++; if (!c) { fails++; console.log('✗', m); } };
const app = fs.readFileSync('web/js/app.js', 'utf8');
const hd = app.indexOf("const header = () => {"), hdEnd = app.indexOf('const draw = () => {', hd);
const head = app.slice(hd, hdEnd);
ok(hd > 0 && /const m = missing\(\)\.length, tc = \$\('#tCount'\), b = \$\('#addAll'\);\s*\n\s*if \(!tc \|\| !b\) return;/.test(head), 'header(): lấy #tCount/#addAll rồi thoát nếu đã rời trang (không ghi textContent vào null)');
ok(!/\$\('#tCount'\)\.textContent/.test(app), "không còn $('#tCount').textContent ghi thẳng (null khi đã sang trang khác)");
const oc = app.indexOf("$('#addAll').onclick = async () => {"), ocEnd = app.indexOf('\n    };', oc);
const click = app.slice(oc, ocEnd);
ok(oc > 0 && /if \(ab\) ab\.disabled = true;/.test(click) && /if \(\$\('#wordList'\)\) \{ header\(\); draw\(\); \}/.test(click), "#addAll onclick: không giả định khung còn; chỉ vẽ lại khi #wordList còn");
// Chạy thật phần chặn: dựng hàm header/draw tối giản với $ trả null → không được ném lỗi
{ const $ = () => null, missing = () => [], tp = { words: [] }, t = x => x;
  const header = new Function('$', 'missing', 'tp', 't', head.replace(/^const header = /, 'return ').replace(/;\s*$/, ''))($, missing, tp, t);
  let err = null; try { header(); } catch (e) { err = e; }
  ok(!err, 'header() với trang đã mất không ném lỗi (' + (err && err.message) + ')'); }
console.log(fails ? `✗ topic-leave: ${fails}/${n} kiểm tra hỏng` : `✓ topic-leave: ${n} kiểm tra – thêm hàng loạt xong sau khi rời trang bộ từ không ném lỗi`);
process.exit(fails ? 1 : 0);
