// iOS/WebKit mở khóa âm thanh THEO PHẦN TỬ (gốc lỗi 5/11: Mock Listening trên iPhone hiện "Đang phát" mà im lặng).
// Phần tử mới + play() ngoài cú chạm (bộ đếm 30 s, setTimeout chuyển câu, sau await) → NotAllowedError. Khóa: mọi trình phát giọng
// mượn phần tử đã mồi (LKAudio.el), play bị chặn → LKAudio.blocked (đếm) + trang hiện ▶ "Chạm để nghe", "Đang phát" chỉ sau onSound.
import assert from 'node:assert/strict'; import fs from 'node:fs';
const rd = f => fs.readFileSync(f, 'utf8');
const au = rd('web/js/audio.js');
assert.ok(/for \(let i = 0; i < POOL_N; i\+\+\)[^\n]*a\.play\(\)/.test(au) && /function unlock\(\)[\s\S]*POOL_N[\s\S]*unlocked = true/.test(au), 'unlock() mồi POOL phần tử trong cú chạm');
assert.ok(/const el = h\.el = borrow\(\)/.test(au), 'LKAudio.play mượn phần tử đã mồi (không new Audio)');
assert.ok(/NotAllowedError'\) \{[^}]*blocked\('play'\)/.test(au), 'play bị chặn → đếm + sự kiện lk-audio-blocked');
assert.ok(/el: borrow, blocked/.test(au), 'API LKAudio.el / LKAudio.blocked');
const ls = rd('web/js/listening.js'), ui = rd('web/js/ui.js');
assert.ok(/el = window\.LKAudio && LKAudio\.el \? LKAudio\.el\(\) : new Audio\(\); el\.src = aUrl\(key\)/.test(ls), 'Listening Player mượn phần tử đã mồi');
assert.ok(/NotAllowedError'\) return blockedAt\(\)/.test(ls) && /opts\.onBlocked/.test(ls) && /opts\.onSound/.test(ls), 'Listening Player: chặn → onBlocked (giữ vị trí), có tiếng → onSound');
assert.ok(/audioEl = g\.LKAudio && LKAudio\.el \? LKAudio\.el\(\) : new Audio\(\); audioEl\.src = src/.test(ui), 'UI.speak (sau await) mượn phần tử đã mồi');
// Màn thi nghe 1 lần: không ghi "Đang phát" trước khi có tiếng; chặn → nút ▶, phát tiếp từ đúng câu (chưa tính lượt nghe)
for (const f of ['web/js/mock.js', 'web/js/listening.js', 'web/js/toeic.js']) {
  const s = rd(f);
  assert.ok(/onSound: \(\) => \{[^}]*Đang phát – chỉ nghe 1 lần/.test(s), f + ': "Đang phát" chỉ trong onSound');
  assert.ok(/onBlocked: /.test(s) && /Chạm ▶ để nghe[\s\S]{0,300}\.play\(\)/.test(s), f + ': chặn → nút ▶ phát tiếp');
  assert.ok(!/textContent = '🔊 ' \+ t\('Đang phát – chỉ nghe 1 lần'\);\n/.test(s.replace(/onSound: \(\) => \{[^\n]*/g, '')), f + ': không còn ghi "Đang phát" ngay khi bấm');
}
// Bài học (Truyện › Xếp thành câu, "Nghe lại · Ama"): giáo viên đo tiếng bằng Web Audio. iOS: Web Audio bị công tắc im lặng tắt tiếng và
// createMediaElementSource không gỡ được → cấm trên iOS; phần tử đã nối bị loại khỏi pool dùng chung
const tc = rd('web/js/lesson/teacher.js');
assert.ok(/tap: \(\) => !IOS_WA && /.test(tc) && /const IOS_WA = [^\n]*iP\(hone\|ad\|od\)[^\n]*maxTouchPoints/.test(tc), 'teacher.js: không nối <audio> vào Web Audio trên iOS/iPadOS');
assert.ok(/createMediaElementSource\(a\); a\._lkWA = 1;/.test(tc) && /pool\[i\]\._lkWA\) pool\.splice/.test(au), 'phần tử đã nối Web Audio bị bỏ khỏi pool LKAudio.el');
const wa = fs.readdirSync('web/js', { recursive: true }).filter(f => /\.js$/.test(f) && !/^i18n|vendor/.test(f)).filter(f => /createMediaElementSource\(/.test(rd('web/js/' + f)));
assert.deepEqual(wa, ['lesson/teacher.js'], 'createMediaElementSource chỉ ở teacher.js (có gác iOS): ' + wa);
console.log('✓ ios-audio-unlock: phần tử đã mồi cho mọi trình phát giọng, chặn → ▶ Chạm để nghe (không "Đang phát" khi im lặng)');
