// 🎯 Luật thưởng một nguồn (docs/GAME-FEEL.md §6): Game.xpFor đúng luật học-thật, chống cày lại cùng bài, vectors native mới,
// và KHÔNG còn chỗ nào tự đặt số XP (xp: 5 + right * 2…) trong web/js + web/cpack – trừ danh sách chờ (file đang bị PR khác giữ), chỉ được GIẢM.
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { loadGame } from '../lib/game-rules.mjs';
import { rewardVectors, OUT } from '../native/gen-rewards.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
let bad = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) bad++; };
const { Game } = loadGame(), X = Game.xpFor;

// 1) luật: đúng mới ăn điểm, tạo ra > nhận diện, nói theo ngưỡng máy nghe, không âm, có trần
ok(X('set', { right: 0, total: 10 }) === 10 && X('set', { right: 10, total: 10 }) === 35, 'bài 10 câu: 0 đúng = 10 (tối thiểu hoàn thành), 10/10 = 10 + 2·10 + 5 hoàn hảo');
ok(X('set', { right: 5, total: 5, mode: 'pick' }) < X('set', { right: 5, total: 5, mode: 'type' }) && X('set', { right: 5, total: 5, mode: 'type' }) < X('set', { right: 5, total: 5, mode: 'write' }), 'chọn < gõ < viết câu (sản sinh ngôn ngữ đáng giá hơn)');
ok(X('say', { score: 40 }) === 0 && X('say', { score: 70 }) === 3 && X('say', { score: 90 }) === 5, 'nói: < 65 không XP, 65–84 = 3, ≥ 85 = 5');
ok(X('set', { right: 2, total: 6, hints: 9 }) === 12 && X('talk', { right: 0, hints: 5 }) === 10, 'gợi ý chỉ trừ tối đa phần câu đúng (không phạt quá tay)');
ok(X('set', { right: 2, total: 2 }) === 14, 'bài < 3 câu không có thưởng hoàn hảo');
ok(X('set', { right: 9999, total: 9999 }) === Game.XPR.cap && X('set', { right: -5 }) >= 0, 'có trần và không âm');
ok(X('set', { right: 5, total: 5, paid: 1 }) === 15, 'paid: câu đã trả XP từng câu → cuối bài chỉ thưởng hoàn thành + hoàn hảo');

// 2) chống cày: cùng src trong ngày – lần 3–4 nửa XP, từ lần 5 ≤ 2; khác src/ngày mới không ảnh hưởng; delta.xp sửa tại chỗ
{
  const { Game: G } = loadGame(), got = [];
  for (let i = 0; i < 6; i++) { const d = { quizzes: 1, xp: 20, src: 'gq:a' }; const r = await G.track(d); got.push(r.gained - r.events.filter(e => e.type === 'quest').reduce((s, e) => s + e.quest.xp, 0)); if (d.xp !== got[i]) bad++; }
  ok(JSON.stringify(got) === '[20,20,10,10,2,2]', `cùng bài 6 lần: ${got.join(',')}`);
  const r2 = await G.track({ xp: 20, src: 'gq:b' }); ok(r2.gained >= 20, 'bài khác không bị cắt');
  const s = await G.get(); ok(!('src' in (s.days['2026-11-22'] || {})), 'src không lọt vào số liệu ngày (đồng bộ)');
}

// 3) vectors native cập nhật
ok(fs.readFileSync(path.join(ROOT, OUT), 'utf8') === rewardVectors(), `${OUT} khớp web/js/game.js (node scripts/native/gen-rewards.mjs)`);

// 4) không còn công thức XP tự chế ngoài game.js
const WAIT = { // chờ PR đang giữ file gộp xong rồi chuyển sang Game.xpFor (chỉ được xoá dòng)
  'web/js/app.js': 2, // #1840/#1814/#1713/#1769 giữ: 3 vòng mục tiêu +50, XP bài đầu vào +20
  'web/js/path-day.js': 1, // #1840 giữ: ngày xong +15
  'web/js/lesson/ui.js': 0, // #1830 giữ (công thức lesson dùng biến xp, không số trực tiếp)
};
const files = []; const walk = d => { for (const e of fs.readdirSync(path.join(ROOT, d), { withFileTypes: true })) { const p = d + '/' + e.name; if (e.isDirectory()) { if (!/\/(i18n|vendor)$/.test(p)) walk(p); } else if (/\.js$/.test(e.name) && !/^admin-/.test(e.name)) files.push(p); } };
walk('web/js'); walk('web/cpack');
const RE = /(?:reward\(\{[^)]*?\bxp: *\d|\bxp: *\d+ *[+*]|Sfx\.finish\(\{[^)]*?\bxp: *\d|\b(?:const|let) xp = *\d+ *[+*?]|\$\{ *\d+ *\+ *[\w.]+ *\* *\d+ *\} ?XP)/g; // cả số XP hiện trên màn
for (const f of files) {
  if (f === 'web/js/game.js' || f === 'web/js/app-demo.js') continue; // app-demo = số liệu mẫu, không phải thưởng
  const n = (fs.readFileSync(path.join(ROOT, f), 'utf8').match(RE) || []).length, allow = WAIT[f] || 0;
  if (n > allow) ok(false, `${f}: ${n} chỗ tự đặt số XP (cho phép ${allow}) → dùng Game.xpFor(kind, {right,total,mode,…})`);
  if (n < allow) ok(false, `${f}: còn ${n} < ${allow} trong danh sách chờ → hạ WAIT trong scripts/test/reward-rules.mjs`);
}
ok(true, `${files.length} file quét: không công thức XP tự chế ngoài danh sách chờ`);
if (bad) { console.log(`✗ reward-rules: ${bad} lỗi`); process.exit(1); }
console.log('✓ reward-rules');
