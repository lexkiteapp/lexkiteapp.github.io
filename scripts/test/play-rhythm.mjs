// 🥁 Nhịp điệu (chuỗi mini-game 12/11): lõi thuần – bắt nhịp, chấm, combo, chọn câu, luật chấm SRS. Chạy bằng vm (không cần DOM).
import fs from 'node:fs';
import assert from 'node:assert'; // lỏng: đối tượng từ vm khác realm nên deepStrictEqual (so prototype) sẽ lệch
import vm from 'node:vm';

const w = {}; w.self = w;
for (const f of ['web/js/pron/coach.js', 'web/cpack/play-app/play-blitz.js', 'web/cpack/play-app/play-rhythm.js']) vm.runInNewContext(fs.readFileSync(new URL('../../' + f, import.meta.url), 'utf8'), w);
const { core } = w.PlayRhythm, Coach = w.PronCoach, B = 700;
const P = [{ stress: true }, { stress: false }, { stress: true }, { stress: false }, { stress: true }]; // 0,2,4 nhấn · 1,3 yếu

// snap: đúng nhịp, trong cửa sổ, lệch quá, trước nhịp đầu, quá cuối, đã dùng
assert.deepEqual(core.snap(0, 5, B, new Set()), { k: 0, d: 0 });
assert.deepEqual(core.snap(B * 2 + 100, 5, B, new Set()), { k: 2, d: 100 });
assert.equal(core.snap(B * 2 + 400, 5, B, new Set()), null, 'lệch > 240');
assert.equal(core.snap(-300, 5, B, new Set()), null); assert.equal(core.snap(B * 5, 5, B, new Set()), null);
assert.equal(core.snap(B * 2, 5, B, new Set([2])), null, 'mỗi từ một lần chạm');

// judge: hoàn hảo
let r = core.judge(P, [0, B * 2, B * 4], B);
assert.deepEqual(r.words, ['perfect', 'rest', 'perfect', 'rest', 'perfect']);
assert.equal(r.hits, 3); assert.equal(r.stressed, 3); assert.equal(r.acc, 100); assert.equal(r.extra, 0);
assert.equal(r.score, 80, 'chạm 1,2 → ×1 (20+20), chạm 3 → ×2 (40)');
assert.equal(r.best, 3);
// good vs perfect
r = core.judge(P, [150, B * 2 - 200], B); assert.deepEqual(r.words.slice(0, 3), ['good', 'rest', 'good']); assert.equal(r.score, 10 + 10);
// chạm từ yếu = sai + reset combo; bỏ lỡ từ nhấn = miss
r = core.judge(P, [0, B * 1, B * 2], B);
assert.deepEqual(r.words, ['perfect', 'wrong', 'perfect', 'rest', 'miss']);
assert.equal(r.score, 20 + 20, 'combo bị reset sau chạm sai'); assert.equal(r.extra, 1); assert.equal(r.acc, Math.round(2 / (3 + 0 + 1) * 100));
// chạm ngoài nhịp = thừa; không chạm gì = 0 điểm, 0 %
r = core.judge(P, [B / 2], B); assert.equal(r.extra, 1); assert.equal(r.hits, 0); assert.equal(r.acc, 0); assert.deepEqual(r.words.filter(x => x === 'miss').length, 3);
r = core.judge(P, [], B); assert.equal(r.score, 0); assert.equal(r.acc, 0);
// hai chạm cùng một nhịp: giữ chạm GẦN hơn (chạm sớm không cướp chỗ chạm đúng), chạm xa thành thừa
r = core.judge(P, [B * 2 - 200, B * 2 + 10], B); assert.equal(r.words[2], 'perfect'); assert.equal(r.extra, 1);
r = core.judge(P, [B * 2 + 10, B * 2 - 200], B); assert.equal(r.words[2], 'perfect', 'thứ tự đến không đổi kết quả');
// combo mang sang câu sau: bắt đầu 2 → chạm đúng đầu tiên là combo 3 → ×2; chuỗi còn lại trả về
r = core.judge([{ stress: true }], [0], B, 2); assert.equal(r.score, 40); assert.equal(r.combo, 3);
r = core.judge(P, [0, B * 1], B, 5); assert.equal(r.combo, 0, 'chạm nhầm làm đứt chuỗi mang sang');
// thứ tự chạm không quan trọng (máy gửi lộn xộn vẫn ra cùng kết quả)
assert.deepEqual(core.judge(P, [B * 4, 0, B * 2], B), core.judge(P, [0, B * 2, B * 4], B));
// combo ×2 từ lần thứ 3, ×3 từ lần thứ 6 (cùng luật Thử thách 60 giây)
const all = Array.from({ length: 8 }, () => ({ stress: true })), t8 = all.map((_, i) => i * B);
r = core.judge(all, t8, B); assert.equal(r.score, 20 * (1 + 1 + 2 + 2 + 2 + 3 + 3 + 3)); assert.equal(r.best, 8);
assert.equal(core.mult(2), 1); assert.equal(core.mult(3), 2); assert.equal(core.mult(6), 3);

// Nhịp nhanh dần, XP có trần
assert.equal(core.beatOf(0), 700); assert.equal(core.beatOf(4), 560);
assert.equal(core.xpOf(0, 0), 5); assert.equal(core.xpOf(100, 100), 40); assert.equal(core.xpOf(5, 95), 20);

// SRS: chỉ chấm khi chạm đúng từ đích, cả câu ≥ 90 % VÀ không chạm thừa; còn lại không chấm (không phạt)
assert.equal(core.srsGrade({ words: ['perfect'], acc: 100, extra: 0 }, 0), 2); assert.equal(core.srsGrade({ words: ['good'], acc: 90, extra: 0 }, 0), 2);
assert.equal(core.srsGrade({ words: ['good'], acc: 89, extra: 0 }, 0), null, 'cả câu phải ≥ 90 %'); assert.equal(core.srsGrade({ words: ['perfect'], acc: 100, extra: 1 }, 0), null, 'chạm thừa (vd. chạm mọi nhịp) → không chấm'); assert.equal(core.srsGrade({ words: ['miss'], acc: 100 }, 0), null);
assert.equal(core.srsGrade({ words: ['perfect'], acc: 100 }, -1), null);

// Chọn câu: dùng ví dụ có từ đích; bỏ câu ngắn/dài/lạ/toàn từ nhấn; bù bằng câu mẫu; không trùng
const WEAK = { a: ['ə', 'ə', ''], the: ['ðə', 'ðə', ''], to: ['tə', 'tə', ''], of: ['əv', 'əv', ''], for: ['fə', 'fər', ''], and: ['ənd', 'ənd', ''] };
const items = [
  { word: 'budget', ex: 'We need to cut the budget for the project.' }, { word: 'cat', ex: 'Cats sleep.' },
  { word: 'x', ex: 'Tôi thích học tiếng Anh mỗi ngày nhé.' }, { word: 'run', ex: 'Big dogs run fast here.' },
  { word: 'budget', ex: 'We need to cut the budget for the project.' }, { word: 'plan', ex: 'Make a plan and follow the plan to the end of the day.' },
];
let pk = core.pick(items, Coach, 'en-GB', WEAK, 5, Coach.SENTENCES);
assert.equal(pk.length, 5); assert.equal(pk[0].word, 'budget'); assert.equal(pk[0].k, 5);
assert.equal(new Set(pk.map(x => x.s)).size, 5, 'không trùng câu'); assert.ok(pk.slice(1).every(x => x.k === -1 || x.word), 'câu bù không có từ đích');
assert.ok(!pk.some(x => /Cats sleep|Tôi thích|Big dogs/.test(x.s)), 'loại câu ngắn / không phải chữ Latinh / không có từ yếu');
assert.equal(core.pick([], Coach, 'en-GB', WEAK, 5, Coach.SENTENCES).length, 5, 'không có ví dụ vẫn đủ câu mẫu');
console.log('play-rhythm OK');
