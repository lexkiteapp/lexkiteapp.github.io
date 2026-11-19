# Ghi chú mã đồng bộ tài khoản

> TL;DR: giải thích các đoạn trong `web/js/sync.js`, chuyển khỏi mã (4/11) để giảm byte người học tải. Mã không đổi.

- Trước `const LG = API.replace('/api/sync', '/api/league');`: Bảng xếp hạng tuần (functions/api/league.js): chỉ khi đã đăng nhập & tự bật tham gia. UI: Sync.league('me'|'join'|'leave'|'xp')
- Trước `const LG = API.replace('/api/sync', '/api/league');`: XP tuần = tổng XP các ngày từ thứ Hai (giờ UTC, giống máy chủ) trong game.days. pushLeague() tự gửi, tối đa 1 lần/5 phút.
- Trước `if ((j.error === 'too-fast' || j.msg === 'quota.burst') && tries < 2) `: Chống spam phía máy chủ: gửi quá nhanh → chờ đúng số giây rồi gửi lại (không tạm dừng đồng bộ, không mất dữ liệu)
- Trước `const isNative = !!(window.VBNative && window.VBNative.is);`: App gốc: đăng nhập bằng SDK gốc (js/native-auth.js) khi bản build có cấu hình Firebase (LK_NATIVE_AUTH, scripts/mobile-auth-config.mjs); chưa có → tắt
- Trước `const ord = f => (a, b) => a && b && stable(b) < stable(a) ? f(b, a) :`: Gộp giao hoán: sắp 2 bản theo chuỗi ổn định trước khi gộp → merge(a, b) === merge(b, a) (đồng bộ Drive không có máy chủ phân xử)
- Trước `function mergeRet(a, b) {`: Lớp giữ thói quen (retention.js, game.ret): hợp mốc/đồ/sự kiện, rương đã mở = max, khung = bản chọn sau cùng – cùng luật Ret.core.merge (kiểm thử retention.mjs)
- Trước `const pruneDel = d => { const cut = Date.now() - 90 * 864e5; for (cons`: Dấu “đã xóa” chỉ cần giữ đủ lâu để mọi thiết bị kịp đồng bộ → bỏ mục quá 90 ngày, tránh phình dữ liệu
- Trước `const pulling = {};`: Một lượt kéo tại một thời điểm: đăng nhập chuyển hướng gọi start() 2 lần (getRedirectResult + onAuth) → dùng chung 1 lượt
- Trước `let netN = 0, netT = null, needPull = false;`: Offline-first: lỗi mạng → thử lại lùi dần 30 s → 10 phút và ngay khi có mạng; dữ liệu luôn ở máy, không báo lỗi khi chỉ là mất mạng
- Trước `const pauseMs = (retry, rnd = Math.random()) => (retry > 0 ? Math.min(`: D1 hết hạn mức ngày (429 quota): nghỉ tới lúc máy chủ báo đặt lại (retry giây, 00:00 UTC) + rải 1–21 phút cho khỏi dồn cùng lúc; tối đa 6 giờ. Thẻ vẫn lưu trên máy (dirty giữ nguyên) – scripts/test/d1-cap.mjs
- Trước `let vid = ''; try { const v = localStorage.getItem('lk.vid') || ''; if`: Phễu chuyển đổi: gửi mã khách ẩn danh (lk.vid) 1 lần cho mỗi tài khoản trên máy này → máy chủ ghi vid_uid (khách → đăng ký)
- Trước `if (!keep && Date.now() - t0 >= 40) { await Store.set('acctBackup', { `: WebView (Facebook/Zalo…) chặn hộp thoại → trả về ngay: coi như gộp, không bao giờ xóa. Trước khi xóa luôn giữ 1 bản sao (Sync.restoreBackup)
- Trước `if (opt.migrate) { if (docs.meta) await push(); else setStatus('ok'); `: Chuyển sang Drive: chỉ đẩy lên D1 khi tài khoản ĐÃ có dữ liệu ở D1 (để máy chưa cập nhật vẫn khớp) – người mới không tạo dòng D1 nào
- Trước `if (Cards.mutate) await Cards.mutate(m => mergeCards(m, remoteCards, d`: Đọc lại bản trên máy SÁT lúc ghi (thẻ: trong khóa Cards) → câu trả lời/XP ghi giữa lúc chờ mạng (đang làm bài) không bị đè
- Trước `const after = stable([await Cards.all(), await Core.Stats.get(), await`: Chỉ vẽ lại các trang tổng quan khi dữ liệu THẬT SỰ đổi (tránh chớp trắng/giật mỗi lần mở app đã đăng nhập); giữ vị trí cuộn
- Trước `const syncMode = () => (window.LK_SYNC && LK_SYNC.mode) || 'auto';`: Bật theo cấu hình tĩnh LK_SYNC.drive (firebase-config.js – 0 lượt gọi máy chủ); app gốc cần thêm LK_SYNC.native. lk.syncDrive = 1/0: ép bật/tắt trên máy này (thử nghiệm)
- Trước `const syncMode = () => (window.LK_SYNC && LK_SYNC.mode) || 'auto';`: Công tắc từ xa LK_SYNC.mode: 'auto' (mặc định) · 'd1' = chỉ đường D1 · 'off' = chỉ lưu trên máy (không gọi mạng nào)
- Trước `async function snapLocal() {`: Ảnh chụp v2 = toàn bộ dữ liệu học đã rút gọn (thẻ thư viện chỉ giữ phần riêng) – 500 thẻ ≈ 15 KB gzip, 5.000 thẻ ≈ 105 KB
- Trước `async function renewTok(interactive) {`: Token Drive mới: web = popup Firebase (prompt=none khi đã đồng ý → tự đóng); app gốc = SDK gốc, chỉ khi người dùng bấm
- Trước `if (st.fail >= 5 && Date.now() - (st.d1SafeAt || 0) > 6 * 3600e3) { st`: Drive lỗi kéo dài (≥ 5 lượt liên tiếp) → bản sao an toàn qua D1, tối đa 1 lần/6 giờ (vẫn im lặng, không chặn việc học)
- Trước `async function start() {`: Chọn đường đồng bộ khi đăng nhập/mở app; tự di chuyển từ D1 sang Drive ở lần đăng nhập đầu tiên có quyền Drive
- Trước `const had = await pullMerge({ migrate: true });`: Lần đầu: kéo D1 (nếu có) gộp vào máy; 30 ngày sau đó kéo/đẩy D1 tối đa 1 lần/ngày để máy chưa cập nhật vẫn thấy dữ liệu
- Trước `const had = await pullMerge({ migrate: true });`: had: true/false = đã kiểm D1 xong; undefined = D1 tạm nghỉ/lỗi → chưa đánh dấu, lần mở sau kiểm lại (không bỏ sót dữ liệu cũ)
- Trước `Sync.driveConnect = async () => {`: Nút "Sao lưu vào Google Drive của bạn" (thẻ tài khoản): người đăng nhập từ trước bản cập nhật / đã bỏ ô Drive – chỉ khi họ bấm
- Trước `const chunks = NB, parts = Array.from({ length: NB }, () => ({}));`: 32 nhóm CỐ ĐỊNH theo mã băm của từ (không cắt theo thứ tự chữ cái): thêm/sửa 1 từ chỉ đổi đúng 1 nhóm → chỉ 1 lượt ghi D1
- Trước `Sync.nice = v => { const n = String(v || '').trim(); if (n.length < 4 `: Tên Google viết HOA toàn bộ ("KHIEU DINH THONG") → hiện "Khieu Dinh Thong" (chỉ khi hiển thị, không đổi dữ liệu); chữ không phân hoa/thường giữ nguyên
- Trước `const GSVG = '<svg width="18" height="18" viewBox="0 0 48 48" aria-hid`: ---------- Nút tài khoản (đầu trang + thanh bên): chưa đăng nhập = nút Google; đã đăng nhập = avatar mở menu (js/account.js, tải lười) ----------
- Trước `const gLab = () => isNative ? t('Tiếp tục với Google') : t('Đăng nhập `: Nút Google theo thương hiệu Google (short = nhãn ngắn); app iOS: nút chung → bảng chọn Apple/Google (native-auth.js, App Store 4.8)
- Trước `/** @type {(v?: any) => void} */ let authDone = () => {}; const authP `: Phiên đã nhớ (lk.acct) mà Firebase chưa báo trạng thái → chờ thay vì vội hiện “Đăng nhập” (trang giải đấu, lớp học…)
- Trước `let agoT = 0;`: Thẻ tài khoản (Cài đặt + trang Tôi): avatar · tên/email (cắt "…", đủ giá trị ở title) · trạng thái · nút – lưới tự xuống hàng, không chồng lấn ở 320 px
