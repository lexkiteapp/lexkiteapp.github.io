// Chuẩn hóa đáp án điền từ IELTS (web/cpack/qe/norm.js, nối vào web/js/qengine.js gradeGap) – không cần jsdom.
// Chạy: node scripts/test/qengine-norm.mjs
import fs from 'node:fs'; import vm from 'node:vm';
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('✗', m); } };
const w = { }; vm.createContext(w); vm.runInContext(fs.readFileSync(new URL('../../web/cpack/qe/norm.js', import.meta.url), 'utf8'), w);
const k = w.QEN.key, same = (a, b) => k(a) === k(b);
for (const [a, b] of [['colour', 'color'], ['Centre', 'center'], ['travelled', 'traveled'], ['organise', 'organize'], ['organisation', 'organization'], ['analysed', 'analyzed'], ['licence', 'license'], ['grey', 'gray'], ['theatre', 'theater'], ['neighbours', 'neighbors'], ['programme', 'program'],
  ['twenty-five', '25'], ['twenty five', '25'], ['one hundred', '100'], ['two hundred and fifty', '250'], ['one thousand five hundred', '1500'], ['twelve', '12'], ['forty', '40'], ['1,000', '1000'], ['£50', 'fifty'], ['1st', 'first'], ['twentieth', '20th'],
  ['well-known', 'well known'], ['well-known', 'wellknown'], ['the museum', 'museum'], ['ice-cream', 'ice cream']]) ok(same(a, b), `cùng đáp án: ${a} = ${b}`);
for (const [a, b] of [['colour', 'colors'], ['two', '3'], ['twenty five', '20'], ['first', 'second'], ['advise', 'advice'], ['rise', 'rice'], ['centre', 'central'], ['one hundred', '10'], ['year 2', 'year 3'], ['mumble', 'mombl'], ['label', 'lable']]) ok(!same(a, b), `khác đáp án: ${a} ≠ ${b}`);
// ghép với gradeGap của qengine: chỉ trích hàm chấm, không dựng DOM
const src = fs.readFileSync(new URL('../../web/js/qengine.js', import.meta.url), 'utf8');
const m = /const plain = [^\n]+\n\s*const norm = [^\n]+\n[^\n]*\n\s*const words = [^\n]+\n\s*function gradeGap[\s\S]*?\n  \}\n/.exec(src); ok(!!m, 'tìm thấy norm/words/gradeGap trong qengine.js');
if (m) {
  const g = { QEN: w.QEN }, gg = new Function('g', m[0] + '\nreturn gradeGap;')(g);
  const it = { a: ['color'] }, it2 = { a: ['25'] }, it3 = { a: ['well-known'] };
  ok(gg(it, 2, 'colour').ok && gg(it2, 2, 'twenty-five').ok && gg(it3, 2, 'well known').ok, 'gradeGap: Anh/Mỹ, số chữ, gạch nối đều đúng');
  ok(!gg(it2, 1, 'twenty five').ok && gg(it2, 1, 'twenty five').over, 'gradeGap: giới hạn từ vẫn đếm chữ ("twenty five" = 2 từ > 1 → sai)');
  ok(!gg(it, 1, 'color blue').ok && gg(it, 1, 'color blue').over && !gg(it, 2, 'red').ok && gg(it, 2, '').empty, 'gradeGap: quá giới hạn/sai/trống vẫn sai');
  const gn = new Function('g', m[0] + '\nreturn gradeGap;')({});
  ok(gn(it, 2, 'color').ok && !gn(it, 2, 'colour').ok, 'thiếu gói QEN → so như cũ (không vỡ)');
}
console.log(fails ? `✗ qengine-norm: ${fails} lỗi` : '✓ qengine-norm: Anh/Mỹ, số chữ↔số, gạch nối, giới hạn từ'); process.exit(fails ? 1 : 0);
