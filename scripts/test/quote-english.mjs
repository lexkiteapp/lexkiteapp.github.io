// Cổng "ví dụ tiếng Anh trong ngoặc phải giữ nguyên" cho kho dịch nội dung web/i18n/content/<lang>.json (lỗi gốc 15/11: dịch máy dịch luôn
// ví dụ → "apple"→사과, "can"→"können", giải thích mất nghĩa; đo 81 % chuỗi có ví dụ bị dính). Chạy offline, không mạng.
//  1) luật thuần scripts/lib/quote-english.mjs (khôi phục + phát hiện) có test đơn vị;
//  2) generator gen-content-i18n.mjs bắt buộc gọi restore();
//  3) số chuỗi còn vi phạm mỗi ngôn ngữ KHÔNG được tăng so với content/qa/quote-english-baseline.json (chỉ giảm; --lower hạ baseline).
import fs from 'node:fs'; import assert from 'node:assert';
import { restore, violations, findSpans, isEnglishSpan } from '../lib/quote-english.mjs';
let n = 0; const ok = (c, m) => { n++; assert.ok(c, m); };
ok(violations('Dùng “an apple”.', 'Verwenden Sie „einen Apfel“.').length === 1, 'phát hiện ví dụ bị dịch');
ok(violations('Dùng “an apple”.', 'Verwenden Sie „an apple“.').length === 0, 'ví dụ còn nguyên → sạch');
ok(restore('Dùng “an apple”.', 'Verwenden Sie „einen Apfel“.').text === 'Verwenden Sie „an apple“.', 'khôi phục 1 mảnh');
ok(restore('‘I like’ và ‘I would love to’', '„Ich mag“ und „Ich würde gerne“').text === '„I like“ und „I would love to“', 'khôi phục nhiều mảnh đúng thứ tự');
ok(!restore('Câu “I can swim” có “can”', '„können“').ok, 'lệch số mảnh → không đoán, báo cần dịch lại');
ok(violations('Tên “Hà Nội” là…', 'Name „Hanoi“').length === 0, 'mảnh tiếng Việt (có dấu) không bị coi là ví dụ Anh');
ok(findSpans('a “x” b ‘y’ c "z"').length === 3 && isEnglishSpan('had better'), 'nhận 3 kiểu ngoặc');
ok(/restore\(/.test(fs.readFileSync('scripts/gen-content-i18n.mjs', 'utf8')), 'gen-content-i18n.mjs phải khôi phục ví dụ Anh sau dịch');
const BASE_F = 'content/qa/quote-english-baseline.json', base = fs.existsSync(BASE_F) ? JSON.parse(fs.readFileSync(BASE_F, 'utf8')) : null, cur = {}; let bad = 0;
for (const l of fs.readFileSync('scripts/i18n-langs.txt', 'utf8').split(/\s+/).filter(x => x && !x.startsWith('#') && x.length === 2 && x !== 'en')) {
  const f = `web/i18n/content/${l}.json`; if (!fs.existsSync(f)) continue;
  cur[l] = Object.entries(JSON.parse(fs.readFileSync(f, 'utf8'))).filter(([k, v]) => typeof v === 'string' && violations(k, v).length).length;
  if (base && cur[l] > (base[l] ?? 0)) { bad++; console.error(`✗ ${l}: ${cur[l]} chuỗi mất ví dụ Anh > baseline ${base[l] ?? 0} (chạy node scripts/content-qa/quote-english-fix.mjs --write rồi dịch lại phần còn lại)`); }
}
if (process.argv.includes('--init') || (base && process.argv.includes('--lower'))) {
  const next = base ? Object.fromEntries(Object.entries(cur).map(([l, c]) => [l, Math.min(c, base[l] ?? c)])) : cur;
  fs.writeFileSync(BASE_F, JSON.stringify(next, null, 1) + '\n'); console.log('baseline →', JSON.stringify(next));
} else assert.ok(base, 'thiếu ' + BASE_F + ' (node scripts/test/quote-english.mjs --init)');
assert.equal(bad, 0, 'số chuỗi mất ví dụ Anh tăng');
console.log(`quote-english: ${n} kiểm đơn vị OK; còn vi phạm ${JSON.stringify(cur)}`);
