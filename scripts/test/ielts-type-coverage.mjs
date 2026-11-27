// B10: phủ kiểu câu IELTS – khoảng trống chỉ được bớt (content/exams/spec/type-gaps.json), kèm test hàm đếm trên dữ liệu giả.
import fs from 'node:fs';
import { coverage } from '../content-qa/ielts-type-coverage.mjs';
const bad = [], base = JSON.parse(fs.readFileSync('content/exams/spec/type-gaps.json', 'utf8')).gaps, cur = coverage().gaps;
for (const u of Object.keys(cur)) {
  for (const g of cur[u]) if (!(base[u] || []).includes(g)) bad.push(`${u}: dạng ${g} thiếu nhóm câu (mới) – thêm nhóm câu, không thêm vào danh sách lệch`);
  for (const g of base[u] || []) if (!cur[u].includes(g)) bad.push(`${u}: dạng ${g} đã có nhóm câu – xoá khỏi content/exams/spec/type-gaps.json`);
}
// hàm đếm: dữ liệu giả
const spec = (id, types) => ({ sections: [{ id, parts: [{ n: 1, types }] }] });
const t = coverage({ LISTENING: [{ part: 1, groups: [{ type: 'form' }, { type: 'shortanswer' }] }], READTESTS: [{ gt: false, passages: [{ n: 1, groups: [{ type: 'match', sub: 'headings' }] }] }] }, spec('listening', ['form', 'short-answer', 'map']), spec('listening', []));
if (t.gaps['ielts-listening'].join() !== 'L1:map') bad.push('đếm Listening sai: ' + t.gaps['ielts-listening']);
if (!t.units['ielts-reading-ac'].spec['P1:headings'] || t.units['ielts-reading-ac'].spec['P1:matching']) bad.push('match.sub=headings phải chỉ tính headings');
if (bad.length) { console.error('✗ ielts-type-coverage:\n  ' + bad.join('\n  ')); process.exit(1); }
console.log('✓ ielts-type-coverage: khoảng trống kiểu câu IELTS không tăng (' + Object.values(cur).flat().length + ' còn lại)');
