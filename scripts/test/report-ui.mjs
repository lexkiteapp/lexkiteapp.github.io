// Test giao diện báo lỗi bằng jsdom: nút nổi (web/js/report-pill.js), form (web/js/report.js) – nhãn & a11y, kiểm đầu vào, dữ liệu gửi đi,
// màn cảm ơn (Kit, mã LX, mốc dự kiến, liên kết riêng, nhắc trong app), khóa gửi lặp 30 s, trang trạng thái + dòng thời gian.
// Chạy: node scripts/test/report-ui.mjs  (không mạng – fetch giả lập; giao diện tiếng Anh)
import fs from 'node:fs';
import jsdom from 'jsdom';
const { JSDOM } = jsdom;
let fails = 0, n = 0; const ok = (c, m) => { n++; if (!c) { fails++; console.log('✗', m); } };
const rd = f => fs.readFileSync(new URL('../../web/' + f, import.meta.url), 'utf8');
const dom = new JSDOM('<!doctype html><html><head></head><body><nav class="side-foot"></nav><main id="view" class="view"></main></body></html>', { url: 'https://lexkite.com/#/dict/record?q=private', runScripts: 'outside-only', pretendToBeVisual: true });
const w = dom.window, d = w.document;
w.localStorage.setItem('vb.uiLang', 'en'); w.localStorage.setItem('lk.vid', 'abcdefgh12345678xyz');
const mq = { matches: false, fs: [], addEventListener: (e, f) => { mq.fs.push(f); }, f: () => mq.fs.forEach(f => f()) }; w.matchMedia = () => mq; w.console.error = () => {};
let sent = [], reply = () => ({ ok: true, id: 'LX-1001', token: 'T'.repeat(24), eta: { kind: 'normal', h: 72 } });
w.fetch = async (url, init) => { const b = JSON.parse(init.body); sent.push({ url, b, h: init.headers }); return { status: 200, json: async () => reply(b) }; };
for (const f of ['js/i18n.js', 'js/i18n/en.js', 'js/i18n/en/report.js', 'js/kit.js']) w.eval(rd(f));
w.App = { routes: {} };
w.eval(rd('js/report-pill.js'));
d.dispatchEvent(new w.Event('DOMContentLoaded'));
const tick = (ms = 0) => new Promise(r => setTimeout(r, ms));

// ---------- Nút nổi ----------
const pill = d.getElementById('lkRep');
ok(pill && pill.tagName === 'BUTTON' && pill.textContent.includes('Report') && !pill.hidden, 'nút ⚑ Report hiện, là <button>, chữ tiếng Anh');
ok(typeof w.App.routes.report === 'function', 'tự đăng ký route #/report (không sửa app.js)');
w.console.error('Boom: test error'); w.dispatchEvent(new w.ErrorEvent('error', { message: 'TypeError: x is null', filename: 'https://lexkite.com/js/app.js', lineno: 42 }));
ok(w.__lkErrs.length === 2 && w.__lkErrs[1].includes('app.js:42'), 'bộ đệm lỗi console ghi lỗi + console.error');
w.location.hash = '#/practice/flash'; w.dispatchEvent(new w.HashChangeEvent('hashchange'));
ok(pill.hidden, 'ẩn khi đang luyện tập'); w.location.hash = '#/dict/record?q=private'; w.dispatchEvent(new w.HashChangeEvent('hashchange')); ok(!pill.hidden, 'hiện lại ngoài bài luyện');

// Không che nội dung: nút tròn 44 px, tên đọc được, .view chừa đáy (--fab-space), ẩn khi cuộn xuống/gõ phím/có thanh dính đáy
const CSS = w.LexReportCSS || '';
ok(pill.querySelector('.lk-rep-l') && pill.querySelector('.lk-rep-l').textContent === 'Report' && /width:44px;height:44px/.test(CSS), 'nút gọn 44×44 px, nhãn "Report" cho trình đọc màn hình (data-i18n – đổi ngôn ngữ vẫn dịch)');
ok(d.documentElement.classList.contains('lk-fab') && /--fab-space:\d+px/.test(CSS) && /html\.lk-fab body:not\(\.cbt-mode\):not\(\.bare\) \.view\{padding-bottom:calc\([^}]*var\(--fab-space\)/.test(CSS), 'html.lk-fab + .view padding-bottom có var(--fab-space) → nội dung cuối trang không bị nút che');
ok(/:has\([^)]*\.learn-bar[^)]*\.grade-bar[^)]*#modal:not\(\[hidden\]\)[^)]*dialog\[open\]/.test(CSS) && /body\.focus \.lk-rep/.test(CSS), 'ẩn khi có thanh "Tiếp tục"/thanh chấm/hộp thoại/màn tập trung');
const scrollTo = y => { Object.defineProperty(w, 'scrollY', { configurable: true, value: y }); w.dispatchEvent(new w.Event('scroll')); };
scrollTo(400); ok(pill.classList.contains('off'), 'cuộn xuống → ẩn nút');
scrollTo(300); ok(!pill.classList.contains('off'), 'cuộn lên → hiện lại');
scrollTo(0);
const inp = d.createElement('input'); d.getElementById('view').appendChild(inp); inp.focus();
ok(pill.classList.contains('kb'), 'đang gõ vào ô nhập → ẩn (không đè ô nhập/bàn phím ảo)');
inp.blur(); await new Promise(r => setTimeout(r, 5)); ok(!pill.classList.contains('kb'), 'rời ô nhập → hiện lại'); inp.remove();
w.location.hash = '#/review'; w.dispatchEvent(new w.HashChangeEvent('hashchange'));
ok(pill.hidden && !d.documentElement.classList.contains('lk-fab'), 'màn ôn tập: ẩn nút và bỏ khoảng chừa đáy');
w.location.hash = '#/me'; w.dispatchEvent(new w.HashChangeEvent('hashchange'));
mq.matches = true; mq.f();
ok(pill.parentNode === d.querySelector('.side-foot') && pill.classList.contains('in-side') && !d.documentElement.classList.contains('lk-fab'), 'máy tính: nút vào chân thanh bên (không nổi trên nội dung)');
mq.matches = false; mq.f(); ok(pill.parentNode === d.body && d.documentElement.classList.contains('lk-fab'), 'thu nhỏ cửa sổ → nút nổi trở lại');
w.location.hash = '#/dict/record?q=private'; w.dispatchEvent(new w.HashChangeEvent('hashchange'));

// ---------- Form ----------
w.eval(rd('js/report.js'));
const R = w.LexReport;
let dlg = await R.open();
ok(dlg && dlg.getAttribute('aria-labelledby') === 'lkrH' && d.getElementById('lkrH').textContent.includes('Report a problem'), 'hộp thoại có tiêu đề (aria-labelledby), tiếng Anh');
ok(dlg.querySelectorAll('input[name=cat]').length === 6 && dlg.querySelector('fieldset legend').textContent === 'Problem type', '6 loại vấn đề trong fieldset/legend');
ok(d.querySelector('label[for=lkrMsg]') && d.querySelector('label[for=lkrEm]'), 'ô nhập đều có nhãn');
ok(d.getElementById('lkrEmW').hidden, 'ô email ẩn cho tới khi chọn nhận cập nhật (opt-in)');
ok(dlg.querySelector('.lkr-hp').getAttribute('aria-hidden') === 'true' && dlg.querySelector('input[name=website]').tabIndex === -1, 'ô bẫy spam ẩn khỏi trình đọc màn hình & phím Tab');
ok(!/[ăđơư]|Báo|Gửi/.test(dlg.textContent), 'không lẫn tiếng Việt trong giao diện tiếng Anh');
d.getElementById('lkrMsg').value = 'short';
dlg.querySelector('form').dispatchEvent(new w.Event('submit', { cancelable: true })); await tick(5);
ok(d.getElementById('lkrErr').textContent.includes('at least 10') && !sent.length, 'mô tả ngắn → báo lỗi, không gửi');
d.getElementById('lkrMsg').value = 'The IPA for record (verb) is wrong.';
dlg.querySelector('input[value=content]').checked = true;
await new Promise(r => setTimeout(r, 0));
dlg.querySelector('form').dispatchEvent(new w.Event('submit', { cancelable: true })); await tick(20);
const s0 = sent[0];
ok(s0 && s0.url === '/api/report' && s0.b.op === 'create' && s0.b.cat === 'content' && s0.b.notify === false && s0.b.email === '', 'gửi đúng loại; không email khi không chọn nhận cập nhật');
ok(s0 && s0.b.ctx.route === 'dict/record' && s0.b.ctx.cid === 'record' && s0.b.ctx.lang === 'en' && /^\d+x\d+$/.test(s0.b.ctx.vw) && !JSON.stringify(s0.b.ctx).includes('private'), 'ngữ cảnh: trang bỏ ?query, mã nội dung, ngôn ngữ, khung nhìn');
ok(s0 && s0.b.errs.length === 2 && s0.h['X-Lexkite-Device'] === 'abcdefgh12345678xyz', 'kèm lỗi console + mã thiết bị');
// Màn cảm ơn
const done = d.querySelector('.lkr-done');
ok(done && done.getAttribute('role') === 'status' && done.textContent.includes('Thank you for helping make Lexkite better!'), 'màn cảm ơn (role=status)');
ok(done.querySelector('.lkr-kit svg'), 'có Kit (web/js/kit.js)');
ok(done.querySelector('.lkr-tid').textContent === 'LX-1001', 'hiện mã LX');
ok(done.querySelector('.lkr-eta').textContent.includes('within 2–3 days'), 'mốc dự kiến theo loại (72 giờ → 2–3 ngày)');
ok(done.textContent.includes("You'll see updates right in the app"), 'không để email → nhắc xem cập nhật trong app');
ok(done.querySelector('a.btn.primary').getAttribute('href') === '#/report/' + 'T'.repeat(24) && done.querySelector('a.btn.primary').textContent === 'Track progress', 'nút "Theo dõi tiến độ" → link riêng');
ok(d.getElementById('lkrLink').value === 'https://lexkite.com/#/report/' + 'T'.repeat(24) && d.getElementById('lkrCp').textContent === 'Copy link', 'ô link riêng + nút sao chép link');
ok(JSON.parse(w.localStorage.getItem('lk.rp'))[0].id === 'LX-1001', 'lưu phiếu vào "Báo lỗi của tôi" trên máy');
// Khóa gửi lặp 30 s
dlg = await R.open(); await tick(5);
ok(d.getElementById('lkrGo').disabled && /wait \d+ seconds/.test(d.getElementById('lkrErr').textContent), 'mở lại ngay → nút Gửi khóa, báo chờ giây');
dlg.remove();
// Mốc thời gian
const E = R._t.etaText;
ok(E({ kind: 'serious', h: 24 }) === 'Expected: within 24 hours' && E({ kind: 'content', h: 168 }) === 'Expected: within 1 week' && E({ kind: 'normal', h: 72 }) === 'Expected: within 2–3 days', 'mốc: 24 giờ / 2–3 ngày / 1 tuần');
ok(/review your suggestion/.test(E({ kind: 'feature' })), 'đề xuất: "sẽ xem xét, báo nếu làm"');

// ---------- Trang trạng thái + dòng thời gian ----------
reply = () => ({ id: 'LX-1001', status: 'fixed', cat: 'content', at: Date.now() - 864e5, upd: Date.now(), reply: 'Fixed – thanks!', dup: '', fixed_at: Date.now(), fix_ver: 'abc1234', eta: { kind: 'normal', h: 72 }, triaged: true });
await R.page('T'.repeat(24), new w.URLSearchParams()); await tick(5);
const v = d.getElementById('view'), steps = v.querySelectorAll('.lkr-tl li');
ok(steps.length === 3 && steps[0].classList.contains('done') && steps[1].classList.contains('done') && steps[2].getAttribute('aria-current') === 'step', 'dòng thời gian: Đã nhận → Đang xử lý → Đã sửa (bước hiện tại)');
ok(steps[2].textContent.includes('Fixed in version abc1234'), 'kèm phiên bản sửa');
ok(v.textContent.includes('Thank you for helping make Lexkite better!') && v.querySelector('.lkr-kit svg') && v.querySelector('.lkr-reply').textContent === 'Fixed – thanks!', 'đã sửa → lời cảm ơn + Kit + phản hồi');
reply = () => ({ id: 'LX-1002', status: 'prog', cat: 'bug', at: Date.now(), upd: Date.now(), reply: '', dup: '', fixed_at: 0, fix_ver: '', eta: { kind: 'serious', h: 24 }, triaged: true });
await R.page('U'.repeat(24), new w.URLSearchParams()); await tick(5);
const st2 = v.querySelectorAll('.lkr-tl li');
ok(st2[1].getAttribute('aria-current') === 'step' && !st2[2].classList.contains('done') && v.querySelector('.lkr-eta').textContent.includes('within 24 hours'), 'đang xử lý → bước 2, mốc chính xác sau AI (P0 → 24 giờ)');
reply = () => ({ error: 'not-found' }); sent.length = 0;
await R.page('V'.repeat(24), new w.URLSearchParams()); await tick(5);
ok(/not found/.test(v.textContent) || /Could not send/.test(v.textContent), 'mã riêng sai → thông báo không tìm thấy');
await R.page('', new w.URLSearchParams()); await tick(5);
ok(v.querySelector('.lkr-list a[href="#/report/' + 'T'.repeat(24) + '"]'), '#/report → danh sách "Báo lỗi của tôi"');

if (fails) { console.error(`✗ report-ui: ${fails}/${n} lỗi`); process.exit(1); }
console.log(`✓ report-ui: ${n} kiểm tra – nút nổi, form, a11y, dữ liệu gửi, màn cảm ơn, mốc dự kiến, khóa 30 s, trang trạng thái`);
