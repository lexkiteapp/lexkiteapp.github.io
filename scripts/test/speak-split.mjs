// Play & Speak tải lười (scripts/speak/build.mjs): mục lục nhẹ + mỗi tình huống 1 tệp gốc (en) + 1 tệp/ngôn ngữ.
// Khóa: ghép lại đúng nguyên bản mọi ngôn ngữ, tệp lười nhỏ, data.js không mang nội dung, trình duyệt chỉ nạp tệp của tình huống + ngôn ngữ đang mở.
import fs from 'node:fs';
import { split, build, SPK_fill, LANGS } from '../speak/build.mjs';
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('✗', m); } };
const S = { id: 'x', group: 'g', cefr: 'A2', title: { en: 'Bank', vi: 'Ngân hàng', hi: 'बैंक' }, roles: ['a'], lines: [{ id: 'l1', who: 'a', en: 'Hi', variants: { polite: 'Hello' }, gloss: { en: 'greet', vi: 'chào' }, pitfalls: [{ l1: '*', w: 'hi', hi: 'HI', note: { en: 'n', fr: 'n-fr' } }] }] };
const { base, tr } = split(S);
ok(JSON.stringify(base.title) === '{"en":"Bank"}' && base.lines[0].en === 'Hi' && base.lines[0].variants.polite === 'Hello', 'gốc giữ en + mọi trường không dịch');
ok(base.lines[0].pitfalls[0].hi === 'HI', 'khóa "hi" của pitfall (không phải bản dịch) giữ nguyên');
ok(JSON.stringify(tr.vi) === '["Ngân hàng","chào"]' && JSON.stringify(tr.fr) === '[null,null,"n-fr"]' && !tr.es, 'bản dịch theo thứ tự duyệt; thiếu → null; ngôn ngữ trống → không có tệp');
const v = SPK_fill(base, tr.vi, 'vi');
ok(v.title.vi === 'Ngân hàng' && v.lines[0].gloss.vi === 'chào' && !('vi' in v.lines[0].pitfalls[0].note) && v.lines[0].pitfalls[0].note.en === 'n', 'ghép vi: có bản dịch, chỗ thiếu rơi về en');
ok(!('vi' in base.title), 'ghép không sửa gốc dùng chung (đổi ngôn ngữ vẫn đúng)');
ok(SPK_fill(base, [], 'ko').title.en === 'Bank', 'mảng ngắn/thiếu → vẫn có en');
let threw = ''; try { split({ id: 'y', odd: { en: 'x', foo: 1 }, bad: { en: 'only' } }); } catch (e) { threw = e.message; }
ok(threw === '', '{en} thật (bản dịch chỉ có en) hợp lệ');
threw = ''; try { split({ id: 'y', meta: { en: 'x', id: 3 } }); } catch (e) { threw = e.message; }
ok(threw === '', 'object có en + khóa khác kiểu số không bị coi là bản dịch');
// Nguồn thật: mọi tình huống ghép lại đúng (build ném lỗi nếu khác), tệp lười nhỏ
const all = fs.readdirSync('content/situations').filter(f => f.endsWith('.json')).map(f => JSON.parse(fs.readFileSync('content/situations/' + f, 'utf8')));
const { data, files } = build(all);
ok(all.length > 0 && Object.keys(files).length >= all.length, `sinh tệp cho ${all.length} tình huống`);
ok(Buffer.byteLength(data) < 200 * all.length + 600, `data.js chỉ là mục lục + bảng đường dẫn cpack (${Buffer.byteLength(data)} B, ≤ 200 B/tình huống; đường dẫn bản dịch nằm trong gói gốc)`);
ok(Object.values(files).every(f => Buffer.byteLength(f) < 64 * 1024), 'mỗi tệp lười < 64 KB');
const idx = (0, eval)(`(() => { const self = {}; ${data}; return self; })()`);
for (const s of all) ok(idx.SPK_IDX[s.id] && idx.SPK_IDX[s.id].l.split(' ').every(l => LANGS.includes(l) && files[`${s.id}.${l}.js`]), `${s.id}: mục lục liệt kê đúng tệp ngôn ngữ`);
ok(typeof idx.SPK_fill === 'function' && idx.SPK_fill.toString() === SPK_fill.toString(), 'data.js mang đúng SPK_fill đã kiểm');
// Mã trình duyệt: nạp theo id + ngôn ngữ, không còn gói SPK toàn bộ
const app = fs.readFileSync('web/js/speak/app.js', 'utf8'), main = fs.readFileSync('web/js/app.js', 'utf8');
ok(/ld\(SPK_P\[id\]\)/.test(app) && /ld\(\(\(window\.SPK_L \|\| \{\}\)\[id\] \|\| \{\}\)\[lang\]\)/.test(app) && /App\.loadScript \? App\.loadScript\(src\)/.test(app), 'speak/app.js nạp cpack/speak/s/<id>.js + <id>.<lang>.js (gốc qua SPK_P, bản dịch qua SPK_L trong gói gốc) khi mở');
ok(Object.keys(idx.SPK_P).length === all.length && Object.entries(idx.SPK_P).every(([k, v]) => v === 'cpack/speak/s/' + k + '.js' && files[k + '.js']), 'SPK_P trỏ đúng từng gói gốc (build-cpack băm tên theo chuỗi cpack/… này)');
// SPK_L (trong gói gốc): đúng các ngôn ngữ có bản dịch, mỗi mục trỏ tệp có thật – data.js không phình theo số ngôn ngữ
for (const s of all) { const L = (0, eval)(`(() => { const self = {}; ${files[s.id + '.js']}; return self.SPK_L; })()`)[s.id], ls = idx.SPK_IDX[s.id].l.split(' ').filter(Boolean);
  ok(JSON.stringify(Object.keys(L)) === JSON.stringify(ls) && ls.every(l => L[l] === `cpack/speak/s/${s.id}.${l}.js` && files[`${s.id}.${l}.js`]), `${s.id}: SPK_L khớp mục lục ngôn ngữ`); }
ok(!/window\.SPK\b(?!_)/.test(app), 'không còn đọc gói SPK toàn bộ');
ok(/App\.loadScript = src => Promise\.all\(\[loadScript\(src\)/.test(main), 'App.loadScript (CDN → máy chủ chính, thử lại) cho tệp lười');
console.log(fails ? `speak-split: ${fails} lỗi` : `✓ speak-split: ${all.length} tình huống, ${Object.keys(files).length} tệp lười, ghép lại đúng ${LANGS.length} ngôn ngữ`);
process.exit(fails ? 1 : 0);
