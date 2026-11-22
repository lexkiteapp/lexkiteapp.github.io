// run-suite --affected: chọn đúng test liên quan file đổi (chạy trước push). Ca thật 22/11: #1813 thêm web/kl.html → theme-switch đỏ CI;
// #1814 đổi LZCSS trong web/js/app.js → css-lazy đỏ CI. Cả hai phải được chọn; test không liên quan thì không.
import assert from 'node:assert'; import { affected, readSuite } from './run-suite.mjs';
const suite = readSuite(), pick = (ch, add) => affected(suite, ch, add);
assert.ok(pick(['web/kl.html'], ['web/kl.html']).some(c => /theme-switch\.mjs/.test(c)), 'file .html mới trong web/ → chọn theme-switch');
assert.ok(pick(['web/js/app.js'], []).some(c => /css-lazy\.mjs/.test(c)), 'đổi web/js/app.js → chọn css-lazy');
assert.ok(pick(['scripts/test/klocal.mjs'], []).some(c => /klocal\.mjs/.test(c)), 'test tự đổi → chạy chính nó');
const fake = ['node a.mjs', 'node b.mjs'], src = { 'a.mjs': "fs.readFileSync('web/js/ui.js')", 'b.mjs': "fs.readFileSync('docs/x.md')" };
assert.deepStrictEqual(affected(fake, ['web/js/ui.js'], [], f => src[f]), ['node a.mjs'], 'không chọn test không đọc file đổi');
assert.ok(pick(['web/js/app.js'], []).length < suite.length, '--affected là tập con, không chạy cả bộ');
console.log('✓ run-suite --affected: chọn đúng test liên quan');
