// Gói lười của app trong add-on phải có file thật: #514 thêm App.need('klocal') lúc khởi động trong khi build-extension.sh loại js/klocal*.js
// → mỗi lần mở app add-on 404 + nạp lại 1,5 s sau, chỉ ext-e2e (hiếm khi chạy) thấy. Test này chạy trong npm test nên PR bị chặn ngay.
import fs from 'node:fs';
import assert from 'node:assert';

/** Khối `const G = …, BUNDLES = { … };` của app.js → object thật (đánh giá với Store giả), không phải regex chuỗi: bắt được cả tên ghép bằng ...map(). */
export function bundlesOf(src, isExtension) {
  const a = src.indexOf("const G = 'js/grammar/', BUNDLES = {"); assert.ok(a >= 0, 'không thấy khối BUNDLES trong app.js');
  let i = src.indexOf('{', a), d = 0, q = '', j = i;
  for (; j < src.length; j++) {
    const c = src[j];
    if (q) { if (c === '\\') j++; else if (c === q) q = ''; continue; }
    if (c === "'" || c === '"' || c === '`') q = c;
    else if (c === '/' && src[j + 1] === '/') j = src.indexOf('\n', j);
    else if (c === '{') d++;
    else if (c === '}' && --d === 0) break;
  }
  return new Function('Store', `${src.slice(a, j + 1)}; return BUNDLES;`)({ isExtension });
}

const B = bundlesOf(fs.readFileSync('extension/app/js/app.js', 'utf8'), true);
assert.ok(Object.keys(B).length > 20, 'đọc được BUNDLES');
const missing = [];
for (const [name, files] of Object.entries(B)) for (const f of files) if (!fs.existsSync(`extension/app/${f.split('?')[0]}`)) missing.push(`${name}: ${f}`);
assert.deepStrictEqual(missing, [], 'gói lười trỏ tới file không có trong add-on (build-extension.sh loại) → cho nhánh Store.isExtension trả [] hoặc đừng loại file:\n' + missing.join('\n'));
// Bản web vẫn phải nạp klocal: chặn cách sửa sai là bỏ tính năng khỏi web
assert.deepStrictEqual(bundlesOf(fs.readFileSync('web/js/app.js', 'utf8'), false).klocal, ['js/klocal.js'], 'web vẫn nạp Kokoro trên máy');
console.log(`✓ ext-bundles: ${Object.keys(B).length} gói, mọi file có trong extension/app`);
