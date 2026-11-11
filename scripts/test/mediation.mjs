// Cổng trung gian (O3): bài gold xanh + cổng bắt đủ kiểu hỏng (đột biến từ bài gold). Chạy: node scripts/test/mediation.mjs
import fs from 'fs';
import vm from 'vm';
import { execFileSync } from 'child_process';
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

// Màn #/mediate (web/js/mediate.js): gói cpack sinh khớp nguồn, lõi chấm MỘT nguồn với cổng, giọng đọc ổn định, nối đủ chỗ
try { execFileSync('node', ['scripts/mediation/build.mjs', '--check'], { stdio: 'pipe' }); ok(true, 'web/cpack/mediation khớp content/mediation'); } catch (e) { ok(false, String(e.stderr || e.message).trim()); }
const C = {}; vm.runInNewContext(fs.readFileSync('web/js/mediate-core.js', 'utf8'), { globalThis: C, self: C }); const MC = C.MediateCore;
const all = fs.readdirSync('content/mediation').filter(f => f.endsWith('.json')).map(f => JSON.parse(fs.readFileSync('content/mediation/' + f, 'utf8')));
const bad = all.filter(x => { const r = MC.check(x, x.model); return !r.inRange || r.points.some(p => !p.ok) || r.extra.length || r.copied; }).map(x => x.id);
ok(!bad.length, `MediateCore.check: bài mẫu của ${all.length} bài đủ ý, đúng độ dài, không ý thừa, không chép` + (bad.length ? ' – ' + bad.join(', ') : ''));
const r0 = MC.check(gold, 'Hi Sam. The train leaves from platform 9 now. There was a signal problem near Croydon.');
ok(r0.points.find(p => p.id === 'platform').ok && !r0.points.find(p => p.id === 'time').ok && r0.extra.length === 1 && !r0.inRange, 'check: ý đạt/thiếu, ý thừa, ngoài khoảng từ');
ok(MC.check(gold, 'Passengers should board at the rear of the train today ok').copied, 'check: bắt chép nguyên văn ≥ 8 từ');
const vs = all.filter(x => x.source.kind === 'dialogue').map(x => [x, MC.voices(x.source)]);
ok(vs.every(([x, v]) => { const who = [...new Set(x.source.lines.map(l => l.s))]; return who.every(s => /^b[fm]_/.test(v[s])) && new Set(who.map(s => v[s])).size === who.length; }), `voices: ${vs.length} hội thoại – mỗi người nói một giọng Anh-Anh riêng`);
ok(MC.voices({ lines: [{ s: 'Ms Ito' }, { s: 'Mr Kovac' }, { s: 'Hana' }, { s: 'Omar' }] }).Hana.startsWith('bf_') && MC.voices({ lines: [{ s: 'Mr Kovac' }] })['Mr Kovac'].startsWith('bm_'), 'voices: Ms/tên -a → nữ, Mr → nam');
const app = fs.readFileSync('web/js/app.js', 'utf8'), eg = fs.readFileSync('web/js/exit-guard.js', 'utf8'), corpus = fs.readFileSync('scripts/sentence-audio/corpus.mjs', 'utf8');
ok(/mediate: \['js\/i18n\/en\/mediate\.js'[^\]]*'js\/mediate-core\.js'[^\]]*'cpack\/mediation\/index\.js'[^\]]*'js\/mediate\.js'\]/.test(app) && /mediate: 'mediate'/.test(app), 'app.js: gói lười mediate + route');
ok(/WITH_ARG = \[[^\]]*'mediate'/.test(eg), 'ExitGuard: #/mediate/<bài> là màn FOCUS (X + thanh tiến độ)');
ok(/mediation-source/.test(corpus) && JSON.parse(fs.readFileSync('web/audio/coverage.json', 'utf8')).groups['mediation-source'], 'corpus Kokoro nhóm mediation-source có sàn độ phủ');
const ms = fs.readFileSync('web/js/mediate.js', 'utf8');
ok(/LISTEN_FIRST = \['B2', 'C1', 'C2'\]/.test(ms) && /btn\.disabled = n < T\.min_words/.test(ms) && /Chars\.slot\(/.test(ms), 'màn: Nghe trước từ B2, nút Kiểm tra tắt tới khi đủ số từ, giáo viên 2D qua Chars.slot');
// build-cpack.mjs đổi tên gói sang bản băm và chỉ sửa đường dẫn viết nguyên văn → mỗi bài cần src literal trong index, màn không được ghép đường dẫn
{ const g = {}; new Function('self', fs.readFileSync('web/cpack/mediation/index.js', 'utf8'))(g);
  ok(g.MEDIATION_INDEX.every(x => x.src === `cpack/mediation/${x.id}.js` && fs.existsSync('web/' + x.src)), 'index: mọi bài có src nguyên văn trỏ tới gói có thật (cho build-cpack băm tên)');
  ok(!/loadScript\(`cpack\/mediation\/\$\{/.test(ms), 'màn: không ghép đường dẫn gói bài (sẽ 404 sau khi băm)'); }
ok(/id="mdCheck" data-lk-primary/.test(ms) && /id="mdResBox" data-lesson-done/.test(ms), 'màn: Enter bấm nút chính (data-lk-primary), thẻ kết quả là màn kết (data-lesson-done) cho nav-sweep');
const src = JSON.parse(fs.readFileSync('content/qa/sources.json', 'utf8')).sources.find(s => s.paths.includes('content/mediation'));
ok(src && (src.delegate || []).includes('content-qa/mediation-check.mjs'), 'content/mediation đăng ký trong content/qa/sources.json, giao cổng mediation-check');
console.log(fails ? `✗ mediation: ${fails} lỗi` : '✓ mediation: xanh');
process.exit(fails ? 1 : 0);
