// ⏱ ExamClock (web/js/exam-clock.js) – đồng hồ phòng thi theo MỐC THỜI GIAN. Gác các lỗi gốc cũ: đếm `left--` trong setInterval (tab nền bị hãm → chậm hơn
// giờ thật; tải lại trang → về đầu/mất 15 s; mock.js biến hẹn giờ `t` che hàm dịch t() → lỗi lúc nhắc 5′/1′).
// Kiểm: tải lại trang giữ đúng giờ · đổi tab (không có tick) vẫn trừ đúng · hết giờ khi vắng mặt → onEnd đúng 1 lần ngay khi mở lại · tạm dừng (luyện tập)
// giữ nguyên qua tải lại · nhắc 5′/1′ đúng một lần, không nhắc lại sau tải lại · ẩn đồng hồ được ghi nhớ · màn chuẩn bị tự gọi onGo khi hết giờ đọc.
// Chạy: node scripts/test/exam-clock.mjs (jsdom, không mạng)
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url'; import { JSDOM } from 'jsdom';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SRC = fs.readFileSync(path.join(ROOT, 'web/js/exam-clock.js'), 'utf8');
let fails = 0; const ok = (c, m) => { if (c) console.log('  ✓ ' + m); else { fails++; console.log('  ✗ ' + m); } };

// Một "trình duyệt" giả: cùng localStorage giữa các lần tải lại (như thật), đồng hồ hệ thống điều khiển tay
const store = {}; let NOW = Date.UTC(2026, 10, 3, 8, 0, 0);
function boot() {
  const dom = new JSDOM('<!doctype html><body><div id="h"></div><div id="p"></div></body>', { runScripts: 'outside-only', url: 'https://lexkite.com/app/' });
  const w = dom.window;
  Object.defineProperty(w, 'localStorage', { value: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } } });
  w.Date.now = () => NOW;
  w.toasts = [];
  w.t = (k, v) => k.replace(/\{(\w+)\}/g, (_, x) => (v && x in v ? v[x] : '{' + x + '}'));
  w.UI = { toast: m => w.toasts.push(m), esc: s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])) };
  w.eval(SRC);
  return w;
}
const tickVis = w => w.document.dispatchEvent(new w.Event('visibilitychange'));

console.log('▶ lõi + định dạng');
{
  const w = boot(), X = w.ExamClock;
  ok(X.fmt(1800) === '30:00' && X.fmt(59.2) === '01:00' && X.fmt(3725) === '1:02:05' && X.fmt(-3) === '00:00', 'fmt mm:ss / h:mm:ss, không âm');
  ok(X.STD.ielts.listening === 30 && X.STD.ielts.reading === 60 && X.STD.ielts.writing === 60 && X.STD.toeic.listening === 45 && X.STD.toeic.reading === 75 && X.STD.toefl.reading > 0, 'thời lượng chuẩn IELTS 30/60/60 · TOEIC 45/75 · TOEFL theo section');
  const c = X.core('a', { now: () => NOW }).start(600);
  NOW += 100e3; ok(c.left() === 500, 'trừ theo giờ thật: 600 − 100 s = 500');
  const c2 = X.core('a', { now: () => NOW }).start(600); // "tải lại trang"
  ok(c2.left() === 500, 'tải lại trang: tiếp tục đúng 500 s (không về 600)');
  ok(X.core('a', { now: () => NOW }).start(600, true).left() === 600, 'fresh=true: làm lại từ đầu');
  X.clear('a');
  const old = X.core('b', { now: () => NOW }).start(4500, false, 1200); ok(old.left() === 1200, 'bản lưu cũ (số giây còn lại) → giữ đúng 1200 s');
  ok(X.core('b', { now: () => NOW }).start(4500).left() === 1200, '…và lần tải sau vẫn 1200 s (không nhảy về 75′)');
  const st = X.core('c', { now: () => NOW }).start(300); NOW += 13 * 3600e3; ok(X.core('c', { now: () => NOW }).start(300).left() === 300, 'mốc đã hết > 12 giờ (hôm sau) → bài mới, không tự nộp bài cũ'); void st;
  X.clear('b'); X.clear('c');
}

console.log('▶ đồng hồ trên màn: đổi tab, tải lại, hết giờ');
{
  let w = boot(); let ends = 0;
  let k = w.ExamClock.mount(w.document.getElementById('h'), { key: 'ielts.L', secs: 1800, fresh: true, onEnd: () => ends++ });
  const txt = () => w.document.querySelector('.xclk-t').textContent;
  ok(txt() === '30:00', 'hiện 30:00 khi bắt đầu');
  ok(w.document.querySelector('.xclk').getAttribute('role') === 'timer' && /30:00/.test(w.document.querySelector('.xclk').getAttribute('aria-label')), 'role=timer + aria-label đọc được giờ còn lại');
  NOW += 7 * 60e3; tickVis(w); // tab nền 7 phút: không có tick nào chạy, quay lại → tính lại từ mốc
  ok(txt() === '23:00', 'đổi tab 7 phút (không tick) → quay lại hiện 23:00');
  k.stop();
  w = boot(); // tải lại trang
  k = w.ExamClock.mount(w.document.getElementById('h'), { key: 'ielts.L', secs: 1800, onEnd: () => ends++ });
  ok(w.document.querySelector('.xclk-t').textContent === '23:00', 'tải lại trang → vẫn 23:00');
  ok(w.ExamClock.saved('ielts.L') === 1380, 'saved() trả 1380 s cho nút "Tiếp tục · còn 23:00"');
  // nhắc 5′ đúng 1 lần
  NOW += (23 * 60 - 299) * 1e3; tickVis(w);
  ok(w.toasts.length === 1 && /5/.test(w.toasts[0]), 'còn 4:59 → MỘT toast nhắc 5 phút (lịch sự)');
  ok(w.document.querySelector('.xclk').classList.contains('w5'), 'đổi màu dịu ở mốc 5′ (class w5)');
  tickVis(w); ok(w.toasts.length === 1, 'không nhắc lặp lại');
  k.stop(); w = boot(); k = w.ExamClock.mount(w.document.getElementById('h'), { key: 'ielts.L', secs: 1800, onEnd: () => ends++ });
  ok(w.toasts.length === 0, 'tải lại sau mốc 5′ → không nhắc lại');
  NOW += 250e3; tickVis(w);
  ok(w.toasts.length === 1 && /1/.test(w.toasts[0]) && w.document.querySelector('.xclk').classList.contains('w1'), 'còn 49 s → nhắc 1 phút + màu w1');
  k.stop();
  // hết giờ khi trang đóng → mở lại: onEnd ngay, đúng 1 lần, mốc bị xóa
  NOW += 10 * 60e3; w = boot();
  k = w.ExamClock.mount(w.document.getElementById('h'), { key: 'ielts.L', secs: 1800, onEnd: () => ends++ });
  ok(ends === 1, 'hết giờ khi vắng mặt → mở lại gọi onEnd (tự nộp) ngay');
  tickVis(w); tickVis(w); ok(ends === 1, 'onEnd chỉ 1 lần');
  ok(w.ExamClock.saved('ielts.L') === null, 'mốc đã xóa sau khi nộp');
}

console.log('▶ hết giờ khi đang mở (hẹn giờ thật)');
{
  const w = boot(); let ended = 0; const real = Date.now;
  w.Date.now = () => real(); // dùng giờ thật cho bài 2 giây
  w.ExamClock.mount(w.document.getElementById('h'), { key: 'short', secs: 2, fresh: true, onEnd: () => ended++ });
  await new Promise(r => setTimeout(r, 2600));
  ok(ended === 1, 'đếm tới 0 → onEnd đúng 1 lần (không cần đổi tab)');
}

console.log('▶ tạm dừng (luyện tập)');
{
  let w = boot();
  let k = w.ExamClock.mount(w.document.getElementById('h'), { key: 'prac', secs: 600, fresh: true, practice: true, onEnd: () => {} });
  NOW += 60e3; tickVis(w);
  w.document.querySelector('.xclk-b[data-a="p"]').click();
  ok(k.paused && w.document.querySelector('.xclk').classList.contains('paused'), 'bấm tạm dừng → đồng hồ dừng ở 9:00');
  NOW += 30 * 60e3; tickVis(w);
  ok(w.document.querySelector('.xclk-t').textContent === '09:00', 'dừng 30 phút vẫn 09:00');
  k.stop(); w = boot();
  k = w.ExamClock.mount(w.document.getElementById('h'), { key: 'prac', secs: 600, practice: true, onEnd: () => {} });
  ok(k.paused && w.document.querySelector('.xclk-t').textContent === '09:00', 'tải lại khi đang dừng → vẫn dừng ở 09:00');
  w.document.querySelector('.xclk-b[data-a="p"]').click(); NOW += 60e3; tickVis(w);
  ok(!k.paused && w.document.querySelector('.xclk-t').textContent === '08:00', 'tiếp tục → đếm tiếp từ 9:00 (08:00 sau 1 phút)');
  ok(!w.document.querySelector('.xclk-b[data-a="p"]') === false, 'chế độ luyện tập có nút tạm dừng');
  k.done();
  const w2 = boot(); w2.ExamClock.mount(w2.document.getElementById('h'), { key: 'ex', secs: 600, fresh: true, onEnd: () => {} });
  ok(!w2.document.querySelector('.xclk-b[data-a="p"]'), 'chế độ thi thật KHÔNG có nút tạm dừng');
}

console.log('▶ ẩn đồng hồ');
{
  let w = boot(); let k = w.ExamClock.mount(w.document.getElementById('h'), { key: 'hide', secs: 600, fresh: true, onEnd: () => {} });
  const hb = w.document.querySelector('.xclk-b[data-a="h"]'); hb.click();
  ok(w.document.querySelector('.xclk').classList.contains('hid') && hb.getAttribute('aria-pressed') === 'true', 'bấm ẩn → ẩn số, nút aria-pressed');
  k.stop(); w = boot(); k = w.ExamClock.mount(w.document.getElementById('h'), { key: 'hide', secs: 600, onEnd: () => {} });
  ok(w.document.querySelector('.xclk').classList.contains('hid'), 'lựa chọn ẩn được ghi nhớ');
  w.document.querySelector('.xclk-b[data-a="h"]').click(); ok(!w.document.querySelector('.xclk').classList.contains('hid'), 'bấm lại → hiện');
  k.done();
}

console.log('▶ màn chuẩn bị (đọc câu hỏi → tự phát)');
{
  const w = boot(); let go = 0; const real = Date.now; w.Date.now = () => real();
  const p = w.ExamClock.prep(w.document.getElementById('p'), { secs: 1, title: 'Đọc trước câu hỏi', onGo: () => go++ });
  ok(/Âm thanh tự phát sau 1 giây/.test(w.document.getElementById('p').textContent), 'hiện "Âm thanh tự phát sau n giây"');
  await new Promise(r => setTimeout(r, 1400));
  ok(go === 1 && p.done, 'hết thời gian đọc → tự gọi onGo (phát audio) đúng 1 lần');
  let go2 = 0; w.ExamClock.prep(w.document.getElementById('p'), { secs: 30, onGo: () => go2++ });
  w.document.querySelector('#p [data-a="go"]').click(); w.document.querySelector('#p [data-a="go"]').click();
  ok(go2 === 1, 'bấm "Nghe ngay" → phát ngay, bấm 2 lần vẫn 1 lần');
  let go3 = 0; const p3 = w.ExamClock.prep(w.document.getElementById('p'), { secs: 1, practice: true, onGo: () => go3++ });
  w.document.querySelector('#p [data-a="p"]').click();
  await new Promise(r => setTimeout(r, 1400));
  ok(go3 === 0 && /Đã tạm dừng/.test(w.document.getElementById('p').textContent), 'luyện tập: tạm dừng màn chuẩn bị → không tự phát');
  w.document.querySelector('#p [data-a="p"]').click(); await new Promise(r => setTimeout(r, 1400));
  ok(go3 === 1, 'tiếp tục → phát sau phần còn lại'); void p3;
}

console.log('▶ không còn lỗi "t" che hàm dịch ở mock.js');
{
  const m = fs.readFileSync(path.join(ROOT, 'web/js/mock.js'), 'utf8');
  ok(!/const t = setInterval/.test(m), 'mock.js không đặt tên biến hẹn giờ là t');
  for (const f of ['cbt.js', 'mock.js', 'toeic.js', 'listening.js']) ok(/ExamClock/.test(fs.readFileSync(path.join(ROOT, 'web/js', f), 'utf8')), f + ' dùng ExamClock');
  const app = fs.readFileSync(path.join(ROOT, 'web/js/app.js'), 'utf8');
  ok(/'js\/exam-clock\.js', 'js\/listening\.js'/.test(app) && /'js\/exam-clock\.js', 'js\/cbt\.js'/.test(app), 'exam-clock.js nạp lười trước listening.js và cbt.js');
}

console.log(fails ? `\n❌ exam-clock: ${fails} lỗi` : '\n✅ exam-clock: đồng hồ đúng giờ qua đổi tab/tải lại, hết giờ tự nộp, tạm dừng, nhắc nhẹ, ẩn được, chuẩn bị → tự phát');
process.exit(fails ? 1 : 0);
