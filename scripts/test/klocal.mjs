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
// LX-1004: nhãn con của 'off' để đo từng nhóm máy; offWhy rỗng ⇔ tier wasm
assert.deepEqual([pc, { ...pc, user: 'off' }, { ...pc, ios: true }, { ...pc, mem: 2 }, { ...pc, cores: 2 }].map(e => P.offWhy(e)), ['', 'user', 'ios', 'mem', 'cores'], 'offWhy theo từng nhóm');
assert.equal(P.tier({ ...pc, ios: true, iosFlag: true }), 'wasm', 'iOS bật bằng cờ kl_ios');
assert.equal(P.tier({ ...pc, user: 'off' }), 'off', 'người dùng tắt');
assert.equal(P.tier({ ...pc, probe: { v: P.VER, at: Date.now(), off: true } }), 'off', 'đã đo chậm → nhớ, không thử lại');
assert.equal(P.tier({ ...pc, probe: { v: P.VER, at: Date.now() - 13 * 864e5, off: true, rtf: 1.45 } }), 'off', 'chậm rõ (RTF 1,45): nhớ 14 ngày');
assert.equal(P.tier({ ...pc, probe: { v: P.VER, at: Date.now() - 15 * 864e5, off: true, rtf: 1.45 } }), 'wasm', 'chậm rõ: sau 14 ngày đo lại');
assert.deepEqual([P.tier({ ...pc, probe: { v: P.VER, at: Date.now() - 2 * 864e5, off: true, rtf: 0.8 } }), P.tier({ ...pc, probe: { v: P.VER, at: Date.now() - 4 * 864e5, off: true, rtf: 0.8 } })], ['off', 'wasm'], 'sát ngưỡng (RTF ≤ 0,9): đo lại sau 3 ngày');
assert.equal(P.tier({ ...pc, probe: { v: 'old', at: Date.now(), off: true } }), 'wasm', 'đổi phiên bản mô hình → đo lại');
{ // LX-1004: probe timeout = máy quá chậm → ghi off, P.tier tắt tới hết PROBE_DAYS; lỗi khác không đánh dấu
  const now = Date.now(), r = P.probeFail(new Error('timeout'), now);
  assert.deepEqual(JSON.parse(JSON.stringify(r)), { v: P.VER, at: now, off: true, rtf: null, why: 'timeout' }, 'timeout → hồ sơ off');
  assert.equal(P.tier({ ...pc, probe: r }), 'off', 'timeout → tắt Kokoro, không nạp lại mỗi phiên');
  assert.equal(P.tier({ ...pc, probe: { ...r, at: now - 6 * 864e5 } }), 'off', 'timeout: vẫn tắt trong 6 ngày');
  assert.equal(P.tier({ ...pc, probe: { ...r, at: now - 8 * 864e5 } }), 'wasm', 'timeout (máy có thể đang bận): sau 7 ngày đo lại');
  assert.equal(P.probeFail(new Error('crash'), now), null, 'lỗi khác → không đánh dấu máy yếu');
  assert.equal(P.probeRecord(500, 1000, now).off, false, 'RTF 0.5 → ổn');
  assert.equal(P.probeRecord(700, 1000, now).off, true, 'RTF 0.7 > RTF_MAX → off');
  // 22/11: đo công bằng – trung vị 3 câu sau làm nóng, ngưỡng RTF_MAX không đổi; nhóm RTF cho số đo phân bố máy thật
  assert.deepEqual([P.median([1.4, 0.5, 0.55]), P.median([0.5, 4.7, 0.6]), P.median([2, 1])], [0.55, 0.6, 1.5], 'median: một câu máy bận không quyết');
  assert.equal(P.probeRecord(P.median([0.5, 4.7, 0.58]), 1, now).off, false, 'trung vị ≤ 0,6 → dùng Kokoro dù một câu bị máy bận kéo dài');
  assert.deepEqual([0.5, 0.6, 0.9, 1.45, 2, 3, null].map(P.rtfBucket), ['r06', 'r06', 'r10', 'r15', 'r25', 'rhi', 'to'], 'rtfBucket');
  assert.equal(P.PROBE_TEXTS.length, 3, 'đo 3 câu');
}
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
// Chủ 5/11: không hộp thoại/quyền HĐH; chỉ Wi-Fi/không tính cước + đủ chỗ trống; dữ liệu di động chỉ khi người dùng bật
const MB = 2 ** 20;
assert.equal(P.netWhy({ type: 'wifi', free: 299 * MB }), 'storage', 'còn < 300 MB trống → không tải');
assert.equal(P.netWhy({ type: 'wifi', free: 2000 * MB }), '', 'đủ chỗ trống + Wi-Fi → tải');
assert.equal(P.netWhy({ type: 'wifi', free: 10 * MB, cached: true }), '', 'đã có trong cache → không cần chỗ trống mới');
assert.equal(P.netWhy({ type: 'wifi', metered: true }), 'cell', 'mạng tính cước (connection.metered) → không tải');
assert.equal(P.netWhy({ type: 'cellular', cell: true, eff: '4g' }), '', 'người dùng cho phép dữ liệu di động → tải');
assert.equal(P.netWhy({ type: 'cellular', cell: true, saveData: true }), 'data', 'Tiết kiệm dữ liệu vẫn thắng công tắc di động');
assert.equal(P.netWhy({ mobile: true }), 'cell', 'điện thoại không rõ loại mạng (iOS WebView) → coi như di động');
assert.equal(P.netWhy({ mobile: true, type: 'wifi' }), '', 'điện thoại trên Wi-Fi → tải');
assert.equal(P.netWhy({ mobile: true, cell: true }), '', 'điện thoại không rõ mạng + cho phép di động → tải');
assert.deepEqual([P.persistOk('Mozilla/5.0 (X11; rv:130.0) Gecko/20100101 Firefox/130.0'), P.persistOk('Mozilla/5.0 Chrome/130 Safari/537.36')], [false, true], 'Firefox: không gọi storage.persist() (bật hộp thoại xin quyền)');
assert.ok(P.reasonOk('user', 1), 'vừa bật trong Cài đặt → tải ngay (nếu mạng cho phép)');
assert.deepEqual([...P.CACHES], ['transformers-cache', 'kokoro-voices', 'lk-kl-audio'], 'Xóa/đo MB đủ 3 kho: mô hình, giọng, âm đã sinh');
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
// Không quyền/hộp thoại HĐH trong klocal.js: chỉ persist() có gác Firefox; không Notification/geolocation/confirm/alert
const kl = fs.readFileSync('web/js/klocal.js', 'utf8');
assert.ok(!/requestPermission|confirm\(|alert\(|prompt\(|geolocation/.test(kl), 'klocal.js không xin quyền / không mở hộp thoại');
assert.ok(/storage\.persist && P\.persistOk\(/.test(kl), 'storage.persist() chỉ gọi khi persistOk');
// Cài đặt › Âm thanh: settings.js chừa #klBox (web + add-on – add-on chạy Kokoro qua khung lexkite.com/kl.html) và gọi KLocal.settings; chuỗi có tiếng Anh
const st = fs.readFileSync('web/js/settings.js', 'utf8');
assert.ok(/\+ '<div id="klBox"><\/div>'/.test(st) && /KLocal\.settings\(\$\('#klBox'\)\)/.test(st), 'Cài đặt có mục giọng Kokoro trên máy (#klBox)');
assert.ok(/sw\('sKl',/.test(kl) && /sw\('sKlCell',/.test(kl) && /id="klDel"/.test(kl) && /id="klMb"/.test(kl), 'mục Cài đặt: bật/tắt, dữ liệu di động, Xóa, MB');
assert.ok(/id="klDel"[^>]*min-height:44px/.test(kl), 'nút Xóa khỏi máy: vùng chạm ≥ 44px (qa-bot tap)');
const en = fs.readFileSync('web/js/i18n/en/lazyui.js', 'utf8');
for (const k of [...kl.matchAll(/\bt\('([^']+)'/g)].map(m => m[1])) assert.ok(en.includes(`'${k}'`), 'thiếu tiếng Anh: ' + k);
// Không vào shell: chỉ nạp lười qua App.need('klocal')
const idx = fs.readFileSync('web/app/index.html', 'utf8');
assert.ok(!/klocal/.test(idx), 'klocal.js không nằm trong khung app (shell)');
// Chuỗi dự phòng trong UI.tts (thứ tự CỐ ĐỊNH): file dựng sẵn → Kokoro trên máy → giọng HĐH (app) → speechSynthesis; mỗi nhánh đếm nguồn giọng
const ui = fs.readFileSync('web/js/ui.js', 'utf8'), body = ui.slice(ui.indexOf('function tts('), ui.indexOf('const stopSpeak'));
const at = re => { const m = re.exec(body); assert.ok(m, 'UI.tts thiếu nhánh ' + re); return m.index; };
const order = [/g\.LISTEN_AUDIO\.has\(/, /K\.ready\(\)/, /LA\(\)\.src\('s', why, /, /nativeTTS\(\)/, /new SpeechSynthesisUtterance/].map(at);
assert.deepEqual(order, [...order].sort((a, b) => a - b), 'thứ tự dự phòng: file → Kokoro máy → (đếm giọng máy) → HĐH → speechSynthesis');
assert.ok(/LA\(\)\.src\('f'\)/.test(body), 'file dựng sẵn được đếm (src f)');
assert.ok(/onStart: \(\) => \{ if \(i === 0\) \{[^}]*src\('k'\)/.test(fs.readFileSync('web/js/klocal.js', 'utf8')), 'Kokoro trên máy được đếm (src k) lúc ra tiếng');
assert.ok(/onStart: \(\) => \{ LA\(\)\.src\('f'\)/.test(ui), 'UI.speak từ đơn (audio/w) được đếm (src f)');
// 🐢 chậm: phát CÙNG file Kokoro ở tốc độ thấp, giữ cao độ (không sang giọng máy)
assert.ok(/el\.preservesPitch = true/.test(fs.readFileSync('web/js/audio.js', 'utf8')), 'LKAudio.play giữ cao độ khi phát chậm');
assert.ok(/rate: slow \? 0\.7 : 1/.test(ui) && /data-slow/.test(ui), 'nút 🐢 từ/câu phát file Kokoro chậm 0,7×');
// Đo khi tab hiện: tab ẩn trong lúc đo → bỏ kết quả (không ghi máy chậm); số đo phân bố RTF qua LKAudio.src('p', nhóm)
assert.ok(/document\.addEventListener\('visibilitychange', onVis\)/.test(kl) && /if \(hid\) \{ kill\('hidden'\)/.test(kl), 'probe: tab ẩn → bỏ kết quả, đo lại sau');
assert.ok(/P\.median\(rtfs\)/.test(kl) && /a\.src\('p', P\.rtfBucket\(r\)\)/.test(kl), 'probe: trung vị + đếm nhóm RTF');
console.log('✓ klocal: chính sách cấp máy/mạng/bật từ xa, WAV, LRU, khóa mô hình, chuỗi dự phòng + đếm nguồn giọng, 🐢 từ file');

// Add-on (22/11: ~2.550 lượt/tuần giọng máy 'off' không nhãn vì add-on không có Kokoro): klocal chạy worker trong khung ẩn
// https://lexkite.com/kl.html cùng giao thức; khung chỉ nói chuyện với origin trong danh sách cho phép; header riêng cho phép nhúng từ add-on.
assert.ok(/EXT \? frameWorker\(\) : new Worker\('js\/klocal-worker\.js'/.test(kl) && /e\.origin !== SITE/.test(kl), 'add-on dùng khung kl.html, kiểm origin');
const fr = fs.readFileSync('web/kl.html', 'utf8');
assert.ok(/chrome-extension:\\\/\\\/\[a-p\]\{32\}/.test(fr) && /e\.origin !== o/.test(fr) && /new Worker\('\/js\/klocal-worker\.js'/.test(fr), 'kl.html: danh sách origin + kiểm nguồn + worker cùng gốc');
const hd = fs.readFileSync('web/_headers', 'utf8'), kb = hd.split(/\n(?=\/)/).find(b => b.startsWith('/kl*')) || '';
assert.ok(/frame-ancestors[^\n]*chrome-extension:/.test(kb) && /! X-Frame-Options/.test(kb) && /no-transform/.test(kb), '/kl*: cho add-on nhúng, không beacon');
assert.ok(!/isExtension \? 'off'/.test(fs.readFileSync('web/js/ui.js', 'utf8')), "ui.js: add-on chưa nạp KLocal = 'load', không 'off' rỗng nhãn");
