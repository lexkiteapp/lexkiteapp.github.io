// Cổng trung gian (O3): bài gold xanh + cổng bắt đủ kiểu hỏng (đột biến từ bài gold). Chạy: node scripts/test/mediation.mjs
import fs from 'fs';
import { run, checkItem, loadLkf, hit, copied, words } from '../content-qa/mediation-check.mjs';

let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('✗', m); } else console.log('✓', m); };
const lkf = loadLkf(), R = run('content/mediation', lkf);
ok(R.files >= 2 && !R.errors.length, `content/mediation: ${R.files} bài, 0 lỗi` + (R.errors.length ? ' – ' + R.errors.slice(0, 3).join(' | ') : ''));
ok(hit('Platform 9 now', [['platform 9']]) && !hit('platform 4', [['platform 9']]) && !hit('x', []), 'hit: mọi nhóm phải khớp, checks rỗng không bao giờ đạt');
ok(copied('we said this train will now depart from platform 9 today', 'this train will now depart from platform 9, not 4') === 'this train will now depart from platform 9', 'copied: bắt cụm ≥ 8 từ chép nguồn');
ok(words("It's 14:50, OK?").length === 3, 'đếm từ giữ It\'s / 14:50');

const gold = JSON.parse(fs.readFileSync('content/mediation/m01.json', 'utf8'));
const mut = (name, f, want) => { const x = structuredClone(gold); f(x); const E = checkItem(x, 'm01.json', lkf); ok(E.some(e => want.test(e)), `bắt hỏng: ${name}`); };
mut('lo không có thật', x => { x.lo = 'M.B1.99'; }, /không có trong/);
mut('lo không phải M.*', x => { x.lo = 'R.B1.01'; }, /không phải mục tiêu trung gian|không có trong/);
mut('lo lệch cấp > 1', x => { x.level = 'C2'; }, /lệch cấp/);
mut('activity lạ', x => { x.activity = 'translate'; }, /activity/);
mut('id ≠ tên file', x => { x.id = 'm09'; }, /trùng tên file/);
mut('nguồn quá dài cho cấp', x => { x.source.text = Array(30).fill('This is a very long sentence about trains.').join(' '); }, /nguồn \d+ từ/);
mut('thiếu người nhận', x => { delete x.task.audience; }, /audience/);
mut('< 3 ý bắt buộc', x => { x.points = x.points.slice(0, 2); }, /≥ 3 ý/);
mut('không có ý nên bỏ', x => { x.leave_out = []; }, /leave_out/);
mut('checks quá rộng', x => { x.points[0].checks = [['the']]; }, /quá rộng/);
mut('bài mẫu thiếu ý', x => { x.model = x.model.replaceAll('platform 9', 'another platform'); }, /thiếu ý "platform"/);
mut('bài mẫu chứa ý nên bỏ', x => { x.model = x.model.replace('Hi Sam!', 'Hi Sam! There was a signal problem.'); }, /ý nên bỏ/);
mut('bài mẫu chép nguồn', x => { x.model += ' Passengers should board at the rear of the train please.'; }, /chép nguyên văn/);
mut('bài mẫu quá số từ', x => { x.model += ' ' + Array(40).fill('really').join(' '); }, /bài mẫu \d+ từ/);
mut('còn tiếng Việt', x => { x.tips[0] = 'Chỉ chuyển ý cần thiết.'; }, /tiếng Việt/);
const chart = JSON.parse(fs.readFileSync('content/mediation/m02.json', 'utf8'));
const E2 = checkItem({ ...chart, source: { ...chart.source, rows: [['Car', 58], ['Bus', 17, 15], ['Bike', 6, 19]] } }, 'm02.json', lkf);
ok(E2.some(e => /mỗi row/.test(e)), 'bắt hỏng: hàng biểu đồ thiếu số');

const src = JSON.parse(fs.readFileSync('content/qa/sources.json', 'utf8')).sources.find(s => s.paths.includes('content/mediation'));
ok(src && (src.delegate || []).includes('content-qa/mediation-check.mjs'), 'content/mediation đăng ký trong content/qa/sources.json, giao cổng mediation-check');
console.log(fails ? `✗ mediation: ${fails} lỗi` : '✓ mediation: xanh');
process.exit(fails ? 1 : 0);
