// Hồi quy 3/11: gen-explain bọc chữ đáp án thành {X} để đổi chỗ khi xáo phương án. "(A hay B)" (loại câu hỏi) KHÔNG phải đáp án;
// en.json phải giữ {X} như mọi ngôn ngữ (33 mục gt3/toefl từng mất {X} → cổng báo lỗi ở cả 13 ngôn ngữ).
import fs from 'node:fs'; import assert from 'node:assert/strict';
const src = fs.readFileSync(new URL('../gen-explain.mjs', import.meta.url), 'utf8');
const LET = eval(src.match(/const LET = (\/.+\/g);/)[1]);
const wrap = s => s.replace(LET, (m, p, L) => p + `{${L}}`);
assert.equal(wrap('Câu hỏi lựa chọn (A hay B) → chọn một'), 'Câu hỏi lựa chọn (A hay B) → chọn một');
assert.equal(wrap('đúng (B) – sai → C, đáp án D'), 'đúng ({B}) – sai → {C}, đáp án {D}');
const D = new URL('../../web/i18n/explain/', import.meta.url), en = JSON.parse(fs.readFileSync(new URL('en.json', D), 'utf8'));
const t = s => (String(s).match(/\{\w+\}/g) || []).sort().join(',');
for (const l of ['es', 'fr', 'de']) { const d = JSON.parse(fs.readFileSync(new URL(l + '.json', D), 'utf8')); const bad = Object.keys(d).filter(k => en[k] && t(en[k]) !== t(d[k])); assert.ok(bad.length === 0, `${l}: ${bad.length} mục {X} lệch en (vd ${bad.slice(0, 3)})`); }
console.log('✓ explain-let: (A hay B) không bọc; en giữ {X}');
