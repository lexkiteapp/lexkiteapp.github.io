// 🔊 Chọn giọng máy dự phòng đúng người nói (web/js/audio.js – docs/specs/audio-quality.md việc 4): Ama nữ, Carlos nam, đúng UK/US.
// Danh sách giọng mẫu = giọng thật của Chrome/Edge/Safari (macOS, iOS, Windows, Android). Chạy: node scripts/test/audio-voice.mjs
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const A = createRequire(import.meta.url)('../../web/js/audio.js');
const V = (name, lang, localService = true) => ({ name, lang, localService });
const MAC = [V('Samantha', 'en-US'), V('Daniel', 'en-GB'), V('Kate', 'en-GB'), V('Alex', 'en-US'), V('Fred', 'en-US'), V('Karen', 'en-AU'), V('Albert', 'en-US'), V('Amélie', 'fr-CA')];
const CHROME = [V('Google US English', 'en-US', false), V('Google UK English Female', 'en-GB', false), V('Google UK English Male', 'en-GB', false)];
const EDGE = [V('Microsoft Aria Online (Natural) - English (United States)', 'en-US', false), V('Microsoft Guy Online (Natural) - English (United States)', 'en-US', false),
  V('Microsoft Sonia Online (Natural) - English (United Kingdom)', 'en-GB', false), V('Microsoft Ryan Online (Natural) - English (United Kingdom)', 'en-GB', false)];
const IOS = [V('Samantha', 'en-US'), V('Daniel', 'en-GB'), V('Arthur (Enhanced)', 'en-GB'), V('Martha', 'en-GB'), V('Evan (Enhanced)', 'en-US'), V('Ava (Premium)', 'en-US')];
const ANDROID = [V('English United States', 'en_US'), V('English United Kingdom', 'en_GB')];
let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; };
const pick = (list, acc, who, want) => A.pickVoice(list, acc, A.genderFor(who), want);

// mã Kokoro → accent + giới tính
assert.deepEqual(A.kokoro('af_heart'), { accent: 'en-US', gender: 'f' }); assert.deepEqual(A.kokoro('am_michael'), { accent: 'en-US', gender: 'm' });
assert.deepEqual(A.kokoro('bf_emma'), { accent: 'en-GB', gender: 'f' }); assert.equal(A.kokoro('xyz'), null); n += 4;
ok(A.genderFor('ama') === 'f' && A.genderFor('carlos') === 'm' && A.genderFor('am_michael') === 'm' && A.genderFor('m') === 'm', 'genderFor');
// giới tính theo tên giọng
for (const [nm, gx] of [['Google UK English Female', 'f'], ['Google UK English Male', 'm'], ['Microsoft Guy Online (Natural) - English (United States)', 'm'], ['Microsoft Aria Online (Natural) - English (United States)', 'f'],
  ['Samantha', 'f'], ['Daniel', 'm'], ['Arthur (Enhanced)', 'm'], ['Ava (Premium)', 'f'], ['English United States', '']]) ok(A.genderOf(nm) === gx, `genderOf ${nm} → ${gx}`);

// Carlos (am_michael, Mỹ): giọng nam Mỹ; Ama (af_heart): giọng nữ
ok(pick(EDGE, 'en-US', 'carlos').name.includes('Guy'), 'Edge: Carlos → Guy');
ok(pick(EDGE, 'en-US', 'ama').name.includes('Aria'), 'Edge: Ama → Aria');
ok(pick(EDGE, 'en-GB', 'f').name.includes('Sonia') && pick(EDGE, 'en-GB', 'm').name.includes('Ryan'), 'Edge UK: nữ Sonia, nam Ryan');
ok(pick(CHROME, 'en-GB', 'carlos').name === 'Google UK English Male', 'Chrome UK: nam');
ok(pick(CHROME, 'en-GB', 'ama').name === 'Google UK English Female', 'Chrome UK: nữ');
ok(pick(MAC, 'en-US', 'carlos').name === 'Alex', 'macOS Mỹ: Carlos → Alex (không phải Samantha, không giọng hiệu ứng Fred/Albert)');
ok(pick(MAC, 'en-US', 'ama').name === 'Samantha', 'macOS Mỹ: Ama → Samantha');
ok(pick(IOS, 'en-US', 'carlos').name === 'Evan (Enhanced)' && pick(IOS, 'en-GB', 'carlos').name === 'Arthur (Enhanced)', 'iOS: Carlos giọng nam đúng accent');
ok(pick(IOS, 'en-GB', 'ama').name === 'Martha', 'iOS UK: Ama → Martha');
// Chỉ có giọng nữ Mỹ: Carlos UK vẫn ưu tiên giọng nam (khác accent) hơn giọng nữ đúng accent
ok(pick([V('Samantha', 'en-US'), V('Kate', 'en-GB'), V('Alex', 'en-US')], 'en-GB', 'carlos').name === 'Alex', 'đúng giới tính trước accent cho nhân vật');
// Không biết giới tính (Android) → vẫn chọn đúng accent
ok(pick(ANDROID, 'en-GB', 'carlos').lang === 'en_GB' && pick(ANDROID, 'en-US', 'ama').lang === 'en_US', 'Android: đúng accent');
// Không yêu cầu giới tính (từ đơn) → như cũ: đúng accent, giọng neural
ok(A.pickVoice(EDGE, 'en-GB', '').lang === 'en-GB', 'từ đơn: đúng accent');
// Giọng người dùng chọn trong Cài đặt: giữ nếu không trái giới tính; Carlos không bao giờ dùng giọng nữ người dùng chọn khi có giọng nam
ok(A.pickVoice(EDGE, 'en-US', '', 'Microsoft Aria Online (Natural) - English (United States)').name.includes('Aria'), 'giữ giọng người dùng chọn');
ok(pick(EDGE, 'en-US', 'carlos', 'Microsoft Aria Online (Natural) - English (United States)').name.includes('Guy'), 'Carlos bỏ giọng nữ người dùng chọn');
ok(pick(EDGE, 'en-US', 'ama', 'Microsoft Aria Online (Natural) - English (United States)').name.includes('Aria'), 'Ama giữ giọng nữ người dùng chọn');
// Không có giọng tiếng Anh → null
ok(A.pickVoice([V('Amélie', 'fr-CA')], 'en-GB', 'f') === null, 'không giọng Anh → null');
ok(typeof A.fnv36('bf_emma|the|s3') === 'string', 'fnv36');
console.log(`✓ audio-voice: ${n} kiểm tra đạt`);
