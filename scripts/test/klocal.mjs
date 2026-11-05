// Kokoro trên máy (docs/specs/kokoro-on-device.md): chính sách cấp máy / mạng / bật từ xa, WAV, LRU – hàm thuần của web/js/klocal.js.
// Rơi giọng máy khi chưa sẵn / lỗi: scripts/test/audio-play.mjs (Chromium + WebKit). Khóa: mô hình q8 + sha256 khớp scripts/cdn/kokoro-model.mjs.
import assert from 'node:assert/strict'; import fs from 'node:fs'; import vm from 'node:vm';
const c = { Date, Math, JSON, DataView, ArrayBuffer, Float32Array }; c.self = c; vm.createContext(c);
vm.runInContext(fs.readFileSync('web/js/klocal.js', 'utf8'), c);
const P = c.KLocalPolicy; assert.ok(P, 'KLocalPolicy nạp được không cần DOM');
const pc = { ios: false, mem: 8, cores: 8, probe: null, user: null };
assert.equal(P.tier(pc), 'wasm', 'máy tính 8 GB → wasm');
assert.equal(P.tier({ ...pc, mem: undefined, cores: undefined }), 'wasm', 'không đo được RAM (Firefox/Safari máy tính) → wasm, đo thử RTF quyết');
assert.equal(P.tier({ ...pc, mem: 2 }), 'off', 'RAM 2 GB → giọng máy');
assert.equal(P.tier({ ...pc, cores: 2 }), 'off', '2 nhân → giọng máy');
assert.equal(P.tier({ ...pc, ios: true }), 'off', 'iOS mặc định tắt (giới hạn bộ nhớ WebKit)');
assert.equal(P.tier({ ...pc, ios: true, iosFlag: true }), 'wasm', 'iOS bật bằng cờ kl_ios');
assert.equal(P.tier({ ...pc, user: 'off' }), 'off', 'người dùng tắt');
assert.equal(P.tier({ ...pc, probe: { v: P.VER, at: Date.now(), off: true } }), 'off', 'đã đo chậm → nhớ, không thử lại');
assert.equal(P.tier({ ...pc, probe: { v: P.VER, at: Date.now() - 31 * 864e5, off: true } }), 'wasm', 'sau 30 ngày đo lại');
assert.equal(P.tier({ ...pc, probe: { v: 'old', at: Date.now(), off: true } }), 'wasm', 'đổi phiên bản mô hình → đo lại');
assert.deepEqual([P.remote({}, 0), P.remote(null, 99), P.remote({ kl_pct: '' }, 50)], [true, true, true], 'không có cấu hình → BẬT (chủ 5/11: một giọng Kokoro, không để chữ động ra giọng máy)');
assert.equal(P.remote({ kl: '0', kl_pct: 100 }, 0), false, 'kl=0 tắt khẩn thắng canary');
assert.equal(P.remote({ kl: '1' }, 99), true, 'kl=1 bật hết');
assert.deepEqual([P.remote({ kl_pct: '10' }, 9), P.remote({ kl_pct: '10' }, 10)], [true, false], 'canary theo nhóm máy');
assert.equal(P.netOk({ saveData: true }), false, 'Tiết kiệm dữ liệu → không tải');
assert.equal(P.netOk({ eff: '3g' }), false, '3g → không tải');
assert.equal(P.netOk({ type: 'cellular' }), false, 'mạng di động → không tải');
assert.equal(P.netOk({ type: 'cellular', cached: true }), true, 'đã có trong cache → nạp mọi mạng');
assert.equal(P.netOk({ cached: true, hidden: true }), false, 'tab ẩn → không nạp');
assert.equal(P.netOk({ eff: '4g', type: 'wifi' }), true, 'Wi-Fi → tải');
assert.deepEqual([P.reasonOk('idle', 1), P.reasonOk('idle', 2), P.reasonOk('dynamic', 1)], [true, true, true], 'nạp nền lúc rảnh mọi phiên; cần đọc động: ngay');
assert.deepEqual([P.idleDelay(1), P.idleDelay(2)], [60e3, 20e3], 'phiên đầu chờ 60 s (màn chào mượt), sau đó 20 s');
assert.deepEqual([P.remote({ kl_pct: '0' }, 0)], [false], 'kl_pct=0 đặt rõ → tắt (canary 0 %)');
assert.deepEqual([P.rtfOk(500, 1000), P.rtfOk(700, 1000), P.rtfOk(1, 0)], [true, false, false], 'RTF ≤ 0,6');
const w = new DataView(P.wav(new c.Float32Array([0, 0.5, -0.25]), 24000));
assert.equal(w.getUint32(24, true), 24000, 'WAV: tần số mẫu');
assert.equal(w.getUint32(40, true), 6, 'WAV: 3 mẫu 16-bit');
assert.equal(w.getInt16(46, true), Math.round(0.891 * 32767), 'WAV: đỉnh chuẩn −1 dBFS');
assert.deepEqual(P.evict([1, 2, 3, 4], 3), [1], 'LRU bỏ mục cũ nhất');
assert.notEqual(P.fnv('Hello.'), P.fnv('Hello!'), 'khóa cache khác theo văn bản');
// Khóa mô hình: cùng bản (VER) + sha256 với script chép R2
const mir = fs.readFileSync('scripts/cdn/kokoro-model.mjs', 'utf8');
assert.ok(mir.includes(P.VER) && mir.includes(P.SHA['onnx/model_quantized.onnx']), 'klocal.js VER/sha256 khớp scripts/cdn/kokoro-model.mjs');
assert.ok(P.HOSTS.every(h => h.startsWith('https://audio.lexkite.com/kokoro/' + P.VER + '/')), 'host mô hình = R2 audio.lexkite.com theo phiên bản');
// Không vào shell: chỉ nạp lười qua App.need('klocal')
const idx = fs.readFileSync('web/app/index.html', 'utf8');
assert.ok(!/klocal/.test(idx), 'klocal.js không nằm trong khung app (shell)');
// Chuỗi dự phòng trong UI.tts (thứ tự CỐ ĐỊNH): file dựng sẵn → Kokoro trên máy → giọng HĐH (app) → speechSynthesis; mỗi nhánh đếm nguồn giọng
const ui = fs.readFileSync('web/js/ui.js', 'utf8'), body = ui.slice(ui.indexOf('function tts('), ui.indexOf('const stopSpeak'));
const at = re => { const m = re.exec(body); assert.ok(m, 'UI.tts thiếu nhánh ' + re); return m.index; };
const order = [/g\.LISTEN_AUDIO\.has\(/, /K\.ready\(\)/, /LA\(\)\.src\('s', why\)/, /nativeTTS\(\)/, /new SpeechSynthesisUtterance/].map(at);
assert.deepEqual(order, [...order].sort((a, b) => a - b), 'thứ tự dự phòng: file → Kokoro máy → (đếm giọng máy) → HĐH → speechSynthesis');
assert.ok(/LA\(\)\.src\('f'\)/.test(body), 'file dựng sẵn được đếm (src f)');
assert.ok(/onStart: \(\) => \{ if \(i === 0\) \{[^}]*src\('k'\)/.test(fs.readFileSync('web/js/klocal.js', 'utf8')), 'Kokoro trên máy được đếm (src k) lúc ra tiếng');
assert.ok(/onStart: \(\) => \{ LA\(\)\.src\('f'\)/.test(ui), 'UI.speak từ đơn (audio/w) được đếm (src f)');
// 🐢 chậm: phát CÙNG file Kokoro ở tốc độ thấp, giữ cao độ (không sang giọng máy)
assert.ok(/el\.preservesPitch = true/.test(fs.readFileSync('web/js/audio.js', 'utf8')), 'LKAudio.play giữ cao độ khi phát chậm');
assert.ok(/rate: slow \? 0\.7 : 1/.test(ui) && /data-slow/.test(ui), 'nút 🐢 từ/câu phát file Kokoro chậm 0,7×');
console.log('✓ klocal: chính sách cấp máy/mạng/bật từ xa, WAV, LRU, khóa mô hình, chuỗi dự phòng + đếm nguồn giọng, 🐢 từ file');
