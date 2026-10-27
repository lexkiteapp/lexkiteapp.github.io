/* Quản trị → "Kho Drive": Kho Google Drive riêng của Lexkite (sao lưu nguồn 2 cho kho dựng video – docs/ASSET-LIBRARY.md §8.6).
 * Tải lười khi mở tab (admin.js). AdminDrive.render(container, dapi, L, { esc, when, lang }) – dapi(op, body) → /api/drive (functions/api/drive.js).
 * 4 mục (giữ trong địa chỉ #drive/<mục>?bộ-lọc để mở lại / chia sẻ nội bộ):
 *   Tổng quan – nối/kết nối lại Drive (OAuth drive.file), cảnh báo chủ động, tra cứu vị trí file, kiểm tra ngay / cân bằng / sửa bản sao,
 *              danh sách Drive có lọc (live/mất kết nối/đầy/cảnh báo/rút/trọng số 0), tìm email/id, sắp xếp.
 *   Duyệt file – như Google Drive: tab mỗi Drive + thanh dung lượng, lưới/danh sách, ảnh thu nhỏ (proxy ký), đường dẫn, tìm, sắp xếp, chọn nhiều,
 *              xem trước (ảnh/video qua link tải ký), menu chuột phải/⋮ (mở Google Drive, tải, đổi tên, chuyển, vứt), thùng rác (khôi phục, xóa vĩnh viễn),
 *              "Dọn dẹp thông minh" (quét → nhóm → bỏ tích → vào thùng rác + Hoàn tác), báo cáo dung lượng.
 *   Sổ kho – drive_files lọc phía máy chủ (tên/asset/file_id/sha, Drive, loại, thư mục, trạng thái kho, số bản sao, tình trạng Google, ngày, dung lượng),
 *              phân trang, xuất CSV theo bộ lọc, kiểm tra theo lô trên Google.   Nhật ký – drive_audit lọc theo thao tác/Drive/từ khóa.
 * Không bao giờ nhận/hiện token: máy chủ chỉ trả email + số liệu + link ký nội bộ. Chữ tiếng Anh ở bảng EN. */
(function () {
  const EN = {
    'Toàn Kho Drive đã dùng {p}% – nối thêm Drive': 'Whole Drive pool is {p}% used – connect another Drive', 'Repo git {r} đã {g} GB (> 2 GB)': 'Git repo {r} is {g} GB (> 2 GB)', 'D1 đã đọc {n} M dòng hôm nay ({p}%) – việc nền tạm dừng': 'D1 has read {n} M rows today ({p}%) – background jobs paused', 'Kho footage: {n} file lỗi/thiếu bản sao (footage-verify)': 'Footage bank: {n} file(s) broken or under-replicated (footage-verify)', 'Bản deploy production KHÔNG qua smoke – xem issue ci-failure, khôi phục: docs/ROLLBACK.md': 'Production deploy FAILED smoke – see ci-failure issue, rollback: docs/ROLLBACK.md', 'Sao lưu D1 lỗi hoặc diễn tập khôi phục thất bại – xem docs/ROLLBACK.md': 'D1 backup or restore drill failed – see docs/ROLLBACK.md', 'Sao lưu mã nguồn (git bundle) lỗi – xem docs/ROLLBACK.md': 'Source backup (git bundle) failed – see docs/ROLLBACK.md', 'Lưu bản phát hành (AAB/IPA/zip add-on) lỗi – xem docs/ROLLBACK.md': 'Release archive (AAB/IPA/add-on zip) failed – see docs/ROLLBACK.md',
    'CI: {n} workflow đỏ trong 24 h – xem issue nhãn ci-failure (bản tin ci-triage)': 'CI: {n} workflows failed in 24 h – see issues labelled ci-failure (ci-triage digest)',
    'Dự báo: +{g} GB/tháng (từ {s}) · {d}': 'Forecast: +{g} GB/month (since {s}) · {d}', 'còn ≈ {n} ngày tới khi đầy': '≈ {n} days until full', 'không tăng': 'not growing', 'Dự báo: cần ≥ 2 ngày số liệu (health hằng ngày)': 'Forecast: needs ≥ 2 days of data (daily health)',
    '🎬 Shorts: {b} ({p}% Drive) · {n} file': '🎬 Shorts: {b} ({p}% of this Drive) · {n} files', '🎬 Kho shorts: {b} · {m} master (TB {a}) · còn chứa ≈ {c} clip (≈ 10 MB/master, tới ngưỡng 90 %)': '🎬 Shorts archive: {b} · {m} masters (avg {a}) · room for ≈ {c} more clips (≈ 10 MB/master, up to the 90 % stop)',
    'Sổ kho': 'Ledger', '🗄️ Kho Drive riêng': '🗄️ Private Drive storage', 'Sao lưu bản gốc, clip và bản dựng của kho tài nguyên vào Google Drive của chính bạn (nguồn sao lưu 2). App chỉ thấy file do nó tạo (quyền drive.file).': 'Back up originals, clips and renders of the asset library to your own Google Drive (backup source 2). The app only sees files it created (drive.file scope).',
    '➕ Kết nối Google Drive': '➕ Connect Google Drive', '🔄 Tải lại': '🔄 Reload', 'Đang mở Google…': 'Opening Google…', 'Tổng dung lượng': 'Total capacity', 'Đã dùng': 'Used', 'Còn trống': 'Free', '{n} Drive': ['{n} Drive', '{n} Drives'],
    'Chưa nối Drive nào. Bấm "Kết nối Google Drive" và đăng nhập tài khoản Google muốn dùng.': 'No Drive connected yet. Click "Connect Google Drive" and sign in with the Google account to use.',
    'Đang nhận file': 'Accepting files', 'Đang rút (không nhận file mới)': 'Draining (no new files)', 'Mất quyền – cần nối lại': 'Access lost – reconnect', '{n} file · {b}': ['{n} file · {b}', '{n} files · {b}'], 'Kiểm tra gần nhất: {t}': 'Last check: {t}',
    '⚠️ Đã dùng {p}% – sắp đầy': '⚠️ {p}% used – nearly full', '⛔ Đã dùng {p}% – nối thêm Drive': '⛔ {p}% used – connect another Drive', '🟡 Đã dùng {p}%': '🟡 {p}% used', 'không giới hạn': 'unlimited',
    'Trọng số (0–100)': 'Weight (0–100)', 'Lưu': 'Save', 'Drive có chỗ trống × trọng số lớn nhất nhận file mới; 0 = không nhận.': 'The Drive with the largest free space × weight gets new files; 0 = none.',
    'Cập nhật dung lượng': 'Refresh quota', 'Rút': 'Drain', 'Nhận file lại': 'Resume', 'Ngắt kết nối': 'Disconnect',
    'Rút Drive {e}? Drive sẽ không nhận file mới (file cũ vẫn giữ, vẫn tải được).': 'Drain {e}? It will stop receiving new files (existing files stay and can still be downloaded).',
    'Ngắt kết nối {e}?\nLexkite thu hồi quyền ở Google và xóa bản ghi {n} file khỏi danh sách (file trong Drive của bạn KHÔNG bị xóa).\nGõ lại email để xác nhận:': 'Disconnect {e}?\nLexkite revokes access at Google and removes {n} file record(s) from the list (files in your Drive are NOT deleted).\nType the email to confirm:',
    'Email không khớp – chưa ngắt gì.': 'Email does not match – nothing was disconnected.', '✓ Đã ngắt kết nối': '✓ Disconnected', '✓ Đã lưu': '✓ Saved', '✓ Đã cập nhật': '✓ Updated', 'Lỗi: {e}': 'Error: {e}',
    '✓ Đã nối Google Drive': '✓ Google Drive connected', 'Đã hủy kết nối ở Google': 'Connection cancelled at Google', 'Liên kết hết hạn hoặc không hợp lệ – bấm Kết nối lại': 'Link expired or invalid – click Connect again', 'Google không cấp quyền drive.file – thử lại và tích chọn quyền': 'Google did not grant drive.file – try again and tick the permission', 'Google không trả refresh token – vào myaccount.google.com/permissions gỡ Lexkite rồi nối lại': 'Google returned no refresh token – remove Lexkite at myaccount.google.com/permissions and reconnect',
    // Hướng dẫn
    '⚙️ Chưa cấu hình Kho Drive': '⚙️ Drive storage is not set up', 'Còn thiếu: {k}': 'Missing: {k}', 'Cài đặt 1 lần (khoảng 10 phút, miễn phí):': 'One-time setup (about 10 minutes, free):',
    'Mở {a} bằng tài khoản chính thức của dự án → chọn (hoặc tạo) project Lexkite.': 'Open {a} with the project\'s official account → select (or create) the Lexkite project.',
    '<b>APIs &amp; Services → Library</b> → tìm "Google Drive API" → <b>Enable</b>.': '<b>APIs &amp; Services → Library</b> → search "Google Drive API" → <b>Enable</b>.',
    '<b>Google Auth Platform → Branding</b> (màn hình đồng ý OAuth): User type <b>External</b>, tên app "Lexkite", email hỗ trợ, domain lexkite.com.': '<b>Google Auth Platform → Branding</b> (OAuth consent screen): User type <b>External</b>, app name "Lexkite", support email, domain lexkite.com.',
    '<b>Data Access → Add or remove scopes</b>: chỉ thêm {s} (không nhạy cảm – không cần Google thẩm định) + openid, email.': '<b>Data Access → Add or remove scopes</b>: add only {s} (non-sensitive – no Google verification needed) + openid, email.',
    '<b>Audience</b>: thêm chính bạn vào <b>Test users</b>, hoặc bấm <b>Publish app</b> (chỉ có drive.file nên không cần thẩm định). Ở chế độ Testing, Google tự thu hồi quyền sau 7 ngày.': '<b>Audience</b>: add yourself under <b>Test users</b>, or click <b>Publish app</b> (drive.file only, so no verification needed). In Testing mode Google revokes access after 7 days.',
    '<b>Clients → Create client</b> → Web application → <b>Authorized redirect URIs</b>: {u} → Create → chép Client ID + Client secret.': '<b>Clients → Create client</b> → Web application → <b>Authorized redirect URIs</b>: {u} → Create → copy the Client ID + Client secret.',
    'Cloudflare → Pages → lexkite → Settings → <b>Variables and Secrets</b> (Production) thêm 3 secret: {v}. DRIVE_ENC_KEY tạo bằng {c}.': 'Cloudflare → Pages → lexkite → Settings → <b>Variables and Secrets</b> (Production) add 3 secrets: {v}. Generate DRIVE_ENC_KEY with {c}.',
    'Tùy chọn cho CLI/CI: secret {k} (≥ 24 ký tự) ở cả Pages và GitHub Actions, máy: ~/.config/lexkite/drive-cli-key.': 'Optional for CLI/CI: secret {k} (≥ 24 chars) on both Pages and GitHub Actions; local: ~/.config/lexkite/drive-cli-key.',
    'Triển khai lại Pages rồi tải lại trang này → bấm "Kết nối Google Drive".': 'Redeploy Pages, reload this page → click "Connect Google Drive".',
    'Sao chép': 'Copy', '✓ Đã chép': '✓ Copied', 'CLI/CI: đã có khóa': 'CLI/CI: key set', 'CLI/CI: chưa có LEXKITE_DRIVE_CLI_KEY (CI sẽ dùng GrabCast)': 'CLI/CI: no LEXKITE_DRIVE_CLI_KEY yet (CI falls back to GrabCast)',
    // Kho Drive – trình duyệt, dọn dẹp, sổ kho, cảnh báo, bản sao
    '🗄️ Tổng quan': '🗄️ Overview', '📂 Duyệt file': '📂 Browse files', '📒 Sổ kho': '📒 Ledger', '🧾 Nhật ký': '🧾 Activity log', 'Hoàn tác': 'Undo', 'Đóng': 'Close', '✓ Đã hoàn tác': '✓ Undone',
    '✓ Đã kết nối lại Drive (giữ nguyên lịch sử file)': '✓ Drive reconnected (file history kept)', 'Sai tài khoản Google – đăng nhập đúng email của Drive cần kết nối lại': 'Wrong Google account – sign in with the email of the Drive to reconnect', 'Kết nối lỗi – thử lại': 'Connection failed – try again',
    'Mất kết nối – bấm Kết nối lại': 'Disconnected – click Reconnect', 'Kết nối lại': 'Reconnect', 'Giữ nguyên lịch sử file – đăng nhập đúng {e}': 'Keeps file history – sign in as {e}', 'tự ngừng nhận file (≥ 90 %)': 'auto-paused (≥ 90%)', 'Duyệt': 'Browse', 'File': 'Files',
    'Drive {e} mất kết nối – bấm Kết nối lại': 'Drive {e} disconnected – click Reconnect', 'Drive {e}: Google không phản hồi {n} lần liên tiếp': 'Drive {e}: Google failed {n} times in a row', 'Drive {e}: tải lên lỗi {n} lần liên tiếp': 'Drive {e}: {n} uploads failed in a row', 'Drive {e} đã dùng {p}%': 'Drive {e} is {p}% full', 'Toàn kho chỉ còn {g} GB trống': 'Whole pool has only {g} GB free', '{n} file chỉ còn 1 bản sao': '{n} file(s) have only 1 copy',
    '🔎 Tra cứu vị trí file': '🔎 Find where a file lives', 'Tên file / asset id / sha / file_id': 'File name / asset id / sha / file_id', 'Tìm': 'Search', 'Nhập ít nhất 3 ký tự': 'Type at least 3 characters', 'Không thấy bản sao nào': 'No copies found',
    'Kiểm tra ngay': 'Check now', 'Cân bằng': 'Rebalance', 'Sửa bản sao': 'Repair copies', 'Đang kiểm…': 'Checking…', '✓ Đã kiểm {n} Drive · {a} cảnh báo · thiếu bản sao {u}': '✓ Checked {n} Drive(s) · {a} alert(s) · {u} under-replicated',
    'Đang lập kế hoạch…': 'Planning…', '✓ Các Drive đã cân bằng (chênh ≤ 10 %)': '✓ Drives are balanced (spread ≤ 10%)', 'Kế hoạch: chuyển {n} file · {b}': 'Plan: move {n} file(s) · {b}', 'chạy thử – chưa đổi gì': 'dry run – nothing changed', 'Từ': 'From', 'Sang': 'To', 'Dung lượng': 'Size',
    'Áp dụng: chép sang Drive tỉ lệ thấp, kiểm md5, rồi chuyển bản cũ vào thùng rác (dung lượng giải phóng khi dọn thùng rác).': 'Apply: copy to the emptier Drive, verify md5, then move the old copy to trash (space is freed when trash is emptied).', 'Áp dụng': 'Apply',
    'Chép {n} file sang Drive khác rồi chuyển bản cũ vào thùng rác?': 'Copy {n} file(s) to another Drive and move the old copies to trash?', '✓ Đã chuyển {n} file · còn {m}': '✓ Moved {n} file(s) · {m} left', 'bản': 'copies',
    'Thiếu bản sao: {u} · chỉ còn 1 bản: {s} · chỉ còn trên Drive mất kết nối: {l}': 'Under-replicated: {u} · single copy: {s} · only on disconnected Drives: {l}', 'File chỉ có 1 bản': 'Files with a single copy', 'Chỉ còn trên Drive mất kết nối (cần tải lại từ máy / nguồn chính)': 'Only on disconnected Drives (re-upload from a machine / primary source)',
    'Chép bù ngay': 'Copy missing now', '✓ Đủ bản sao': '✓ All copies present', 'Đã chép {n}…': 'Copied {n}…', '✓ Đã chép bù {n} bản · còn thiếu {m}': '✓ Copied {n} · {m} still missing',
    'Tất cả': 'All', 'Đang chạy': 'Live', 'Mất kết nối': 'Disconnected', 'Đầy ≥ 90 %': 'Full ≥ 90%', 'Cảnh báo ≥ 80 %': 'Warning ≥ 80%', 'Đang rút': 'Draining', 'Trọng số 0': 'Weight 0', 'Tìm email / id Drive': 'Search email / Drive id', 'Sắp xếp': 'Sort',
    '% đã dùng': '% used', 'Ngày kết nối': 'Connected date', 'Lần kiểm cuối': 'Last check', 'Không có Drive khớp bộ lọc.': 'No Drive matches the filter.',
    'Drive có tỉ lệ đã dùng thấp nhất nhận file mới (chia đều); bản gốc lưu 2 bản trên 2 Drive khác nhau; ≥ 90 % tự ngừng nhận.': 'The Drive with the lowest usage ratio gets new files (even spread); originals are stored twice on 2 different Drives; ≥ 90% stops receiving.',
    'Không có Drive nào đang kết nối.': 'No Drive is connected.', 'Tìm trong Drive này': 'Search this Drive', 'Tên A→Z': 'Name A→Z', 'Tên Z→A': 'Name Z→A', 'Mới nhất': 'Newest', 'Cũ nhất': 'Oldest', 'Lớn nhất': 'Largest', 'Nhỏ nhất': 'Smallest',
    'Lưới / danh sách': 'Grid / list', 'Danh sách': 'List', 'Lưới': 'Grid', 'Thùng rác': 'Trash', 'Dọn dẹp thông minh': 'Smart cleanup', 'Báo cáo dung lượng': 'Storage report', 'Đường dẫn': 'Path',
    '{n}/{w} bản sao': '{n}/{w} copies', '1 bản': '1 copy', 'Thùng rác trống.': 'Trash is empty.', 'Không có kết quả.': 'No results.', 'Thư mục trống.': 'Empty folder.', 'Chọn {n}': 'Select {n}', 'Thư mục': 'Folder', 'Thao tác cho {n}': 'Actions for {n}',
    'Tự xóa sau 30 ngày': 'Auto-deleted after 30 days', 'Kết quả cho "{q}"': 'Results for "{q}"', 'Tải thêm': 'Load more', 'Không xem trước được loại file này.': 'No preview for this file type.', 'Tải về': 'Download', 'Mở trong Google Drive': 'Open in Google Drive',
    '✓ Đã chuyển {n} mục vào thùng rác': '✓ Moved {n} item(s) to trash', '{n} lỗi': '{n} failed', '✓ Đã khôi phục {n} mục': '✓ Restored {n} item(s)', 'Gõ DELETE để xác nhận:': 'Type DELETE to confirm:', 'Xóa VĨNH VIỄN {n} mục? Không thể khôi phục.': 'PERMANENTLY delete {n} item(s)? This cannot be undone.',
    '✓ Đã xóa vĩnh viễn {n} mục · giải phóng {b}': '✓ Permanently deleted {n} item(s) · freed {b}', 'Dọn sạch thùng rác của kho Lexkite trên {e}? File bị xóa vĩnh viễn.': 'Empty the Lexkite trash on {e}? Files are permanently deleted.', 'còn {n}': '{n} left',
    'Tên mới:': 'New name:', '✓ Đã đổi tên': '✓ Renamed', 'Chuyển {n} mục tới…': 'Move {n} item(s) to…', 'Chuyển vào đây': 'Move here', 'Không có thư mục con.': 'No subfolders.', '✓ Đã chuyển {n} mục': '✓ Moved {n} item(s)',
    '♻️ Khôi phục': '♻️ Restore', '⛔ Xóa vĩnh viễn': '⛔ Delete forever', '📂 Mở': '📂 Open', '👁️ Xem trước': '👁️ Preview', '⬇️ Tải về': '⬇️ Download', '↗ Mở trong Google Drive': '↗ Open in Google Drive', '✏️ Đổi tên': '✏️ Rename', '📦 Chuyển tới…': '📦 Move to…', '🗑️ Chuyển vào thùng rác': '🗑️ Move to trash',
    'Dọn sạch thùng rác': 'Empty trash', 'Đã chọn {n}': '{n} selected', 'Khôi phục': 'Restore', 'Xóa vĩnh viễn': 'Delete forever', 'Chuyển tới…': 'Move to…', 'Chuyển vào thùng rác': 'Move to trash', 'Chọn tất cả': 'Select all', 'Bỏ chọn': 'Clear selection',
    '♊ Trùng lặp': '♊ Duplicates', '👻 Mồ côi (không còn được tham chiếu)': '👻 Orphans (no longer referenced)', '🗃️ Reject / dự phòng cũ': '🗃️ Old rejects / reserve', '⏳ Bản tạm / render cũ': '⏳ Old temp / render outputs', '💔 Tải dở / hỏng': '💔 Partial / broken uploads', '🗑️ Đã ở thùng rác': '🗑️ Already in trash',
    'Trùng – giữ bản manifest đang dùng: {k}': 'Duplicate – keeping the copy the manifest uses: {k}', 'Trùng – giữ bản mới nhất: {k}': 'Duplicate – keeping the newest: {k}', 'Không có trong drive_files lẫn manifest': 'Not in drive_files nor any manifest', 'Manifest không còn trỏ tới': 'No manifest references it any more',
    'reject · {d} ngày': 'reject · {d} days', 'dự phòng · {d} ngày': 'reserve · {d} days', 'bản tạm · {d} ngày': 'temp · {d} days', '0 byte': '0 bytes', 'kích thước lệch bản ghi': 'size differs from the record', 'tải xong nhưng chưa ghi nhận (complete)': 'uploaded but never completed', 'đang ở thùng rác (Google tự xóa sau 30 ngày)': 'in trash (Google deletes after 30 days)',
    'Chỉ quét (không xóa gì). Bạn xem lại, bỏ tích mục muốn giữ, rồi chuyển vào thùng rác – khôi phục được 30 ngày.': 'Scan only (nothing is deleted). Review, untick what to keep, then move to trash – recoverable for 30 days.',
    'Reject cũ hơn (ngày)': 'Rejects older than (days)', 'Dự phòng cũ hơn (ngày)': 'Reserve older than (days)', 'Bản tạm cũ hơn (ngày)': 'Temp older than (days)', 'Quét': 'Scan', 'Đang quét…': 'Scanning…', 'Chọn cả nhóm': 'Select group',
    'File trong thùng rác vẫn tính vào dung lượng – dọn ở chế độ Thùng rác.': 'Trashed files still count toward quota – empty them in Trash view.', 'Tìm thấy {n} file · có thể thu hồi {b}': 'Found {n} file(s) · {b} reclaimable',
    'chưa đồng bộ manifest (chạy library.mjs drive-refs) – mồ côi chỉ tính file lạ': 'manifests not synced (run library.mjs drive-refs) – orphans only count unknown files', 'Drive quá lớn – kết quả chưa đầy đủ': 'Drive too large – results are partial', '✓ Không có gì cần dọn.': '✓ Nothing to clean.',
    'Chuyển mục đã chọn vào thùng rác': 'Move selected to trash', 'Đã chọn {n} · thu hồi {b}': '{n} selected · reclaim {b}', 'Chuyển {n} file vào thùng rác của Google Drive? Khôi phục được trong 30 ngày.': 'Move {n} file(s) to Google Drive trash? Recoverable for 30 days.', '✓ Đã chuyển {n} file vào thùng rác': '✓ Moved {n} file(s) to trash',
    '{n} file · {b} · thùng rác {t}': '{n} files · {b} · trash {t}', 'Theo thư mục': 'By folder', 'Theo loại': 'By type', '10 file lớn nhất': 'Top 10 largest', 'Mới thêm gần đây': 'Recently added', '(gốc)': '(root)', '(ngoài kho)': '(outside library)', 'image': 'images', 'video': 'videos', 'audio': 'audio', 'data': 'data', 'other': 'other',
    'Asset': 'Asset', 'Bản sao': 'Copies', 'Kho': 'Library', 'Trên Google': 'On Google', 'Ngày': 'Date', 'còn': 'present', 'thùng rác': 'trashed', 'mất': 'missing', 'đang tải': 'uploading', 'Chép file_id': 'Copy file_id',
    'Xuất CSV (theo bộ lọc)': 'Export CSV (current filter)', 'Kiểm tra trên Google': 'Verify on Google', 'Xóa bộ lọc': 'Clear filters', 'Tìm (tên, asset, file_id, sha)': 'Search (name, asset, file_id, sha)', 'Loại': 'Type', 'Ảnh': 'Images', 'Clip': 'Clips', 'Bản dựng': 'Renders', 'Khác': 'Other',
    'Trạng thái kho': 'Library status', 'Số bản sao': 'Copies', 'Chỉ 1 bản': 'Single copy', '≥ 2 bản': '≥ 2 copies', 'Còn + thùng rác + mất': 'Present + trashed + missing', 'Từ ngày': 'From date', 'Đến ngày': 'To date', 'Từ (MB)': 'Min (MB)', 'Đến (MB)': 'Max (MB)', 'Chiều': 'Order', 'Giảm dần': 'Descending', 'Tăng dần': 'Ascending', 'Tên': 'Name',
    '{n} bản ghi · {b}': '{n} record(s) · {b}', 'Không có bản ghi khớp bộ lọc.': 'No records match the filter.', 'Trước': 'Previous', 'Sau': 'Next', '✓ Đã xuất {n} dòng': '✓ Exported {n} rows', 'Đã kiểm {n}…': 'Checked {n}…', '✓ Đã kiểm {n} file · {c} thay đổi': '✓ Checked {n} file(s) · {c} changed',
    'Nhật ký thao tác': 'Activity log', 'Thao tác': 'Action', 'Mọi thao tác': 'All actions', 'Mọi Drive': 'All Drives', 'Tên file / file_id / người': 'File name / file_id / person', 'Lúc': 'When', 'Ai': 'Who', 'Ghi chú': 'Note', 'Chưa có thao tác nào.': 'No activity yet.', 'Đang tải…': 'Loading…',
  };
  const BACK = { ok: '✓ Đã nối Google Drive', reconnected: '✓ Đã kết nối lại Drive (giữ nguyên lịch sử file)', 'wrong-account': 'Sai tài khoản Google – đăng nhập đúng email của Drive cần kết nối lại', denied: 'Đã hủy kết nối ở Google', 'bad-state': 'Liên kết hết hạn hoặc không hợp lệ – bấm Kết nối lại', replay: 'Liên kết hết hạn hoặc không hợp lệ – bấm Kết nối lại', scope: 'Google không cấp quyền drive.file – thử lại và tích chọn quyền', 'no-refresh': 'Google không trả refresh token – vào myaccount.google.com/permissions gỡ Lexkite rồi nối lại' };
  const STYLE = `.drv-nav{display:flex;gap:.35rem;flex-wrap:wrap;margin:1rem 0 .6rem}.drv-bar{display:flex;gap:.4rem;flex-wrap:wrap;align-items:center}.drv-bar input,.drv-bar select,.drv-f input,.drv-f select{font:inherit;font-size:.85rem;padding:.35rem .5rem;border:1px solid var(--line);border-radius:8px;background:var(--surface);color:inherit;min-width:0}
.drv-tabs{display:flex;gap:.4rem;overflow-x:auto;padding-bottom:.2rem}.drv-tab{flex:0 0 auto;min-width:170px;text-align:left;border:1.5px solid var(--line);background:var(--surface);color:inherit;border-radius:10px;padding:.45rem .6rem;font:inherit;font-size:.8rem;cursor:pointer}.drv-tab.on{border-color:var(--primary)}.drv-tab .track{height:5px;border-radius:3px;background:var(--line);overflow:hidden;margin-top:.3rem}.drv-tab .fill{height:100%;background:var(--good,#15803d)}.drv-tab .fill.warn{background:#d97706}.drv-tab .fill.crit{background:var(--again,#d1343a)}
.drv-crumbs{display:flex;flex-wrap:wrap;gap:.2rem;font-size:.85rem;margin:.6rem 0}.drv-crumbs button{border:0;background:none;color:var(--primary);font:inherit;cursor:pointer;padding:0 .15rem}
.drv-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:.6rem}.drv-it{position:relative;border:1px solid var(--line);border-radius:10px;background:var(--surface);overflow:hidden;cursor:pointer;min-width:0}.drv-it.sel{outline:2px solid var(--primary)}.drv-it .th{aspect-ratio:4/3;background:var(--surface-2,var(--bg));display:flex;align-items:center;justify-content:center;font-size:2rem}.drv-it .th img{width:100%;height:100%;object-fit:cover}.drv-it .nm{font-size:.78rem;padding:.35rem .45rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.drv-it .mt{font-size:.7rem;color:var(--muted);padding:0 .45rem .35rem}.drv-it input[type=checkbox]{position:absolute;top:.35rem;left:.35rem;width:1.1rem;height:1.1rem}.drv-it .kb{position:absolute;top:.2rem;right:.2rem;border:0;border-radius:6px;background:var(--surface);color:inherit;cursor:pointer;padding:.1rem .4rem;font-size:1rem}
.drv-list .drv-it{display:grid;grid-template-columns:1.6rem 2.4rem minmax(0,1fr) auto 2rem;align-items:center;gap:.5rem;border-radius:8px;padding:.25rem .4rem}.drv-list{display:flex;flex-direction:column;gap:.3rem}.drv-list .drv-it .th{aspect-ratio:1;width:2.4rem;font-size:1.2rem;border-radius:6px;overflow:hidden}.drv-list .drv-it input[type=checkbox],.drv-list .drv-it .kb{position:static}.drv-list .drv-it .nm,.drv-list .drv-it .mt{padding:0}
.drv-rep{display:inline-block;font-size:.68rem;border-radius:99px;padding:0 .4rem;background:var(--surface-2,var(--line));margin-left:.25rem}.drv-rep.bad{background:#fdecec;color:#b42318}
.drv-sel{position:sticky;bottom:.5rem;z-index:5;display:flex;gap:.4rem;flex-wrap:wrap;align-items:center;margin-top:.6rem;padding:.5rem .7rem;border-radius:10px;background:var(--surface);border:1px solid var(--primary);box-shadow:0 6px 20px rgba(0,0,0,.12)}
.drv-menu{position:fixed;z-index:60;min-width:190px;background:var(--surface);border:1px solid var(--line);border-radius:10px;box-shadow:0 10px 30px rgba(0,0,0,.2);padding:.3rem}.drv-menu button{display:block;width:100%;text-align:left;border:0;background:none;color:inherit;font:inherit;font-size:.88rem;padding:.45rem .6rem;border-radius:6px;cursor:pointer}.drv-menu button:hover,.drv-menu button:focus{background:var(--surface-2,var(--line))}
.drv-modal{position:fixed;inset:0;z-index:70;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;padding:16px}.drv-modal>div{background:var(--surface);color:var(--text);border-radius:12px;max-width:min(960px,100%);max-height:100%;overflow:auto;padding:1rem;position:relative;min-width:min(320px,100%)}.drv-modal img,.drv-modal video{max-width:100%;max-height:75vh;display:block;margin:0 auto}.drv-x{position:absolute;top:.4rem;right:.5rem}
.drv-toast{position:fixed;left:50%;bottom:1rem;transform:translateX(-50%);z-index:80;background:#1f2330;color:#fff;border-radius:10px;padding:.6rem .9rem;display:flex;gap:.7rem;align-items:center;font-size:.9rem;max-width:calc(100% - 32px)}.drv-toast button{background:none;border:1px solid #fff6;color:#fff;border-radius:7px;padding:.2rem .6rem;cursor:pointer;font:inherit}
.drv-grp{border:1px solid var(--line);border-radius:10px;margin:.6rem 0;overflow:hidden}.drv-grp>summary{cursor:pointer;padding:.5rem .7rem;font-weight:600;display:flex;gap:.5rem;align-items:center;flex-wrap:wrap}.drv-grp .rw{display:grid;grid-template-columns:1.4rem minmax(0,1fr) auto;gap:.5rem;padding:.3rem .7rem;border-top:1px solid var(--line);font-size:.82rem;align-items:center}.drv-grp .rw span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.drv-hb{display:grid;grid-template-columns:minmax(0,9rem) minmax(0,1fr) auto;gap:.5rem;align-items:center;font-size:.8rem;margin:.25rem 0}.drv-hb i{display:block;height:9px;border-radius:5px;background:var(--primary)}
.drv-tw{overflow-x:auto}.drv-t{width:100%;border-collapse:collapse;font-size:.8rem}.drv-t th,.drv-t td{text-align:left;padding:.35rem .45rem;border-bottom:1px solid var(--line);white-space:nowrap}.drv-t td.n{max-width:16rem;overflow:hidden;text-overflow:ellipsis}
.drv-f{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:.4rem;margin:.6rem 0}.drv-f label{display:flex;flex-direction:column;font-size:.72rem;color:var(--muted);gap:.15rem}
.drv-al{margin:.3rem 0;padding:.45rem .7rem;border-radius:8px;font-size:.85rem}.drv-al.crit{background:#fdecec;color:#8a1c1c}.drv-al.warn{background:#fff6e0;color:#7a4b00}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]) .drv-al.crit,:root:not([data-theme="light"]) .drv-rep.bad{background:#3a1a1c;color:#fca5a5}:root:not([data-theme="light"]) .drv-al.warn{background:#3a2e12;color:#fde68a}}
:root[data-theme="dark"] .drv-al.crit,:root[data-theme="dark"] .drv-rep.bad{background:#3a1a1c;color:#fca5a5}:root[data-theme="dark"] .drv-al.warn{background:#3a2e12;color:#fde68a}
@media (max-width:640px){.drv-grid{grid-template-columns:repeat(auto-fill,minmax(110px,1fr))}.drv-list .drv-it{grid-template-columns:1.4rem 2rem minmax(0,1fr) 2rem}.drv-list .drv-it .mt{display:none}}`;
  const VIEWS = ['overview', 'browse', 'ledger', 'audit'];
  const CATS = ['duplicate', 'orphan', 'old_reject', 'temp', 'partial', 'trashed'];
  /** #drive/<view>?k=v → {view, p}. */
  function parseHash(hs) {
    const m = String(hs || '').replace(/^#/, '').match(/^drive(?:\/([a-z]+))?(?:\?(.*))?$/);
    const p = {}; if (m && m[2]) new URLSearchParams(m[2]).forEach((v, k) => { p[k] = v; });
    return { view: m && VIEWS.includes(m[1]) ? m[1] : 'overview', p };
  }
  const toHash = (view, p) => { const q = new URLSearchParams(); for (const [k, v] of Object.entries(p || {})) if (v !== '' && v != null) q.set(k, v); const s = q.toString(); return '#drive' + (view && view !== 'overview' ? '/' + view : '') + (s ? '?' + s : ''); };
  const pctOf = x => (x.quota_total ? Math.round(x.quota_used / x.quota_total * 100) : 0);
  /** Lọc/sắp xếp danh sách Drive (thuần). st: all|live|die|full|warn|drain|w0 · q: email/id · sort: pct|free|created|checked */
  function filterDrives(list, { st = 'all', q = '', sort = 'pct' } = {}) {
    const ok = { all: () => true, live: x => x.status === 'ok', die: x => x.status === 'disconnected' || x.status === 'revoked', full: x => pctOf(x) >= 90, warn: x => pctOf(x) >= 80 && pctOf(x) < 90, drain: x => x.status === 'draining', w0: x => +x.weight === 0 }[st] || (() => true);
    const qq = String(q).trim().toLowerCase();
    const free = x => (x.quota_total == null ? Infinity : x.quota_total - x.quota_used);
    const cmp = { pct: (a, b) => pctOf(b) - pctOf(a), free: (a, b) => free(b) - free(a), created: (a, b) => (b.created || 0) - (a.created || 0), checked: (a, b) => (a.checked || a.last_ok || 0) - (b.checked || b.last_ok || 0) }[sort] || (() => 0);
    return list.filter(ok).filter(x => !qq || String(x.email).toLowerCase().includes(qq) || String(x.id) === qq).sort(cmp);
  }
  let gen = 0;
  function render(box, dapi, L, h) {
    const esc = h.esc, lang = h.lang || (() => 'vi'), when = h.when || (t => (t ? new Date(t).toLocaleString() : '–')), my = ++gen;
    const S = (vi, vars) => {
      if (lang() !== 'en' || !Object.prototype.hasOwnProperty.call(EN, vi)) return L(vi, vars);
      let s = EN[vi]; if (Array.isArray(s)) s = s[vars && +vars.n === 1 ? 0 : 1];
      return vars ? s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? String(vars[k]) : m)) : s;
    };
    const GB = b => (b == null ? '–' : b >= 1099511627776 ? (b / 1099511627776).toFixed(2) + ' TB' : b >= 1073741824 ? (b / 1073741824).toFixed(1) + ' GB' : b >= 1048576 ? (b / 1048576).toFixed(b >= 104857600 ? 0 : 1) + ' MB' : b >= 1024 ? Math.round(b / 1024) + ' KB' : (+b || 0) + ' B');
    const reload = () => render(box, dapi, L, h);
    if (!document.getElementById('drvCss')) { const st = document.createElement('style'); st.id = 'drvCss'; st.textContent = STYLE; document.head.appendChild(st); }
    const hs = parseHash(location.hash), P = hs.p; let view = hs.view;
    const save = () => { try { history.replaceState(null, '', location.pathname + location.search + toHash(view, P)); } catch (e) { /* bỏ qua */ } };
    // thông báo sau khi Google trả về (?drive=…), rồi xóa khỏi địa chỉ
    let note = '';
    try { const q = new URLSearchParams(location.search).get('drive'); if (q) { note = S(BACK[q] || 'Kết nối lỗi – thử lại'); history.replaceState(null, '', location.pathname + '#drive'); } } catch (e) { /* bỏ qua */ }
    box.innerHTML = `<div class="card"><p class="small muted">${S('Đang tải…')}</p></div>`;
    const errTxt = e => S('Lỗi: {e}', { e: e.code || e.message });
    let toastT = 0;
    const toast = (msg, undo) => {
      document.querySelectorAll('.drv-toast').forEach(x => x.remove()); clearTimeout(toastT);
      const t = document.createElement('div'); t.className = 'drv-toast'; t.setAttribute('role', 'status');
      t.innerHTML = `<span>${esc(msg)}</span>${undo ? `<button type="button" data-undo>${S('Hoàn tác')}</button>` : ''}<button type="button" data-close aria-label="${S('Đóng')}">✕</button>`;
      document.body.appendChild(t);
      t.querySelector('[data-close]').onclick = () => t.remove();
      if (undo) t.querySelector('[data-undo]').onclick = async () => { t.remove(); try { await undo(); toast(S('✓ Đã hoàn tác')); } catch (e) { toast(errTxt(e)); } };
      toastT = setTimeout(() => t.remove(), undo ? 15000 : 5000);
    };
    const modal = (html, onClose) => {
      const m = document.createElement('div'); m.className = 'drv-modal'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true');
      m.innerHTML = `<div><button type="button" class="btn ghost sm drv-x" data-x aria-label="${S('Đóng')}">✕</button>${html}</div>`;
      const close = () => { m.remove(); removeEventListener('keydown', key); if (onClose) onClose(); };
      const key = e => { if (e.key === 'Escape') close(); };
      m.onclick = e => { if (e.target === m || e.target.closest('[data-x]')) close(); };
      addEventListener('keydown', key); document.body.appendChild(m); m.close = close; return m;
    };
    let D = null;
    dapi('list').then(d => { if (my !== gen) return; D = d; draw(); }).catch(e => { box.innerHTML = `<div class="card"><p class="small">${esc(errTxt(e))}</p></div>`; });

    function draw() {
      const d = D, c = d.configured || {}, ready = c.client && c.secret && c.key;
      const nav = `<div class="drv-nav" role="tablist">${[['overview', '🗄️ Tổng quan'], ['browse', '📂 Duyệt file'], ['ledger', '📒 Sổ kho'], ['audit', '🧾 Nhật ký']].map(([v, t]) => `<button type="button" role="tab" class="chip-f ${view === v ? 'on' : ''}" aria-selected="${view === v}" data-view="${v}">${S(t)}</button>`).join('')}</div>`;
      box.innerHTML = nav + '<div id="drvView"></div>';
      box.querySelectorAll('[data-view]').forEach(b => { b.onclick = () => { view = b.dataset.view; for (const k of Object.keys(P)) delete P[k]; save(); draw(); }; });
      const host = box.querySelector('#drvView');
      if (view === 'browse' && ready && d.drives.length) return browse(host);
      if (view === 'ledger') return ledger(host);
      if (view === 'audit') return audit(host);
      view = 'overview'; return overview(host, ready, c);
    }

    // ---------------- Tổng quan ----------------
    function overview(host, ready, c) {
      const d = D, pct = d.total ? Math.round(d.used / d.total * 100) : 0;
      const miss = [!c.client && 'GOOGLE_DRIVE_CLIENT_ID', !c.secret && 'GOOGLE_DRIVE_CLIENT_SECRET', !c.key && 'DRIVE_ENC_KEY (32 byte base64)'].filter(Boolean);
      const code = s => `<code style="word-break:break-all">${esc(s)}</code>`;
      const guide = `<div class="card" style="margin-top:1rem;border-left:4px solid #d97706"><h3 style="margin-top:0">${S('⚙️ Chưa cấu hình Kho Drive')}</h3>
        <p class="small">${S('Còn thiếu: {k}', { k: miss.map(code).join(', ') })}</p><p class="small"><b>${S('Cài đặt 1 lần (khoảng 10 phút, miễn phí):')}</b></p>
        <ol class="small" style="padding-left:1.2rem;line-height:1.6">
          <li>${S('Mở {a} bằng tài khoản chính thức của dự án → chọn (hoặc tạo) project Lexkite.', { a: '<a href="https://console.cloud.google.com/" target="_blank" rel="noopener">console.cloud.google.com</a>' })}</li>
          <li>${S('<b>APIs &amp; Services → Library</b> → tìm "Google Drive API" → <b>Enable</b>.')}</li>
          <li>${S('<b>Google Auth Platform → Branding</b> (màn hình đồng ý OAuth): User type <b>External</b>, tên app "Lexkite", email hỗ trợ, domain lexkite.com.')}</li>
          <li>${S('<b>Data Access → Add or remove scopes</b>: chỉ thêm {s} (không nhạy cảm – không cần Google thẩm định) + openid, email.', { s: code('.../auth/drive.file') })}</li>
          <li>${S('<b>Audience</b>: thêm chính bạn vào <b>Test users</b>, hoặc bấm <b>Publish app</b> (chỉ có drive.file nên không cần thẩm định). Ở chế độ Testing, Google tự thu hồi quyền sau 7 ngày.')}</li>
          <li>${S('<b>Clients → Create client</b> → Web application → <b>Authorized redirect URIs</b>: {u} → Create → chép Client ID + Client secret.', { u: code(d.redirect || 'https://lexkite.com/api/drive/callback') + ` <button class="btn ghost sm" data-copy="${esc(d.redirect || 'https://lexkite.com/api/drive/callback')}">${S('Sao chép')}</button>` })}</li>
          <li>${S('Cloudflare → Pages → lexkite → Settings → <b>Variables and Secrets</b> (Production) thêm 3 secret: {v}. DRIVE_ENC_KEY tạo bằng {c}.', { v: ['GOOGLE_DRIVE_CLIENT_ID', 'GOOGLE_DRIVE_CLIENT_SECRET', 'DRIVE_ENC_KEY'].map(code).join(', '), c: code('openssl rand -base64 32') })}</li>
          <li>${S('Tùy chọn cho CLI/CI: secret {k} (≥ 24 ký tự) ở cả Pages và GitHub Actions, máy: ~/.config/lexkite/drive-cli-key.', { k: code('LEXKITE_DRIVE_CLI_KEY') })}</li>
          <li>${S('Triển khai lại Pages rồi tải lại trang này → bấm "Kết nối Google Drive".')}</li>
        </ol></div>`;
      const band = p => (p >= 90 ? 'crit' : p >= 80 ? 'warn' : '');
      const warnTxt = p => (p >= 95 ? S('⛔ Đã dùng {p}% – nối thêm Drive', { p }) : p >= 90 ? S('⚠️ Đã dùng {p}% – sắp đầy', { p }) : p >= 80 ? S('🟡 Đã dùng {p}%', { p }) : '');
      const stTxt = st => (st === 'ok' ? S('Đang nhận file') : st === 'draining' ? S('Đang rút (không nhận file mới)') : S('Mất kết nối – bấm Kết nối lại'));
      const card = x => {
        const p = pctOf(x), w = warnTxt(p), dead = x.status === 'disconnected' || x.status === 'revoked';
        return `<div class="card drv-card" data-id="${x.id}" ${dead ? 'style="border-left:4px solid var(--again,#d1343a)"' : ''}>
          <div class="row between" style="gap:.5rem;flex-wrap:wrap"><b style="word-break:break-all">${esc(x.email)} <span class="tiny muted">#${x.id}</span></b><span class="small ${x.status === 'ok' ? '' : 'muted'}">${x.status === 'ok' ? '🟢' : x.status === 'draining' ? '⏸️' : '🔴'} ${esc(stTxt(x.status))}</span></div>
          <div class="meter ${band(p)}"><div class="row between small"><span>${GB(x.quota_used)} / ${x.quota_total ? GB(x.quota_total) : S('không giới hạn')}</span><b>${x.quota_total ? p + '%' : ''}</b></div><div class="track"><div class="fill" style="width:${Math.min(100, p)}%"></div></div>${w ? `<div class="tiny">${esc(w)}</div>` : ''}</div>
          <p class="tiny muted" style="margin:.2rem 0">${esc(S('{n} file · {b}', { n: x.files, b: GB(x.bytes) }))} · ${esc(S('Kiểm tra gần nhất: {t}', { t: when(x.checked || x.last_ok) }))}${x.shorts_bytes ? ' · ' + esc(S('🎬 Shorts: {b} ({p}% Drive) · {n} file', { b: GB(x.shorts_bytes), p: x.quota_total ? (x.shorts_bytes / x.quota_total * 100).toFixed(1) : '–', n: x.shorts_files })) : ''}${x.auto_paused ? ' · ' + esc(S('tự ngừng nhận file (≥ 90 %)')) : ''}${x.err ? ' · ' + esc(x.err) : ''}</p>
          ${dead ? `<p style="margin:.4rem 0"><button class="btn primary sm" data-act="reconnect">🔌 ${S('Kết nối lại')}</button> <span class="tiny muted">${S('Giữ nguyên lịch sử file – đăng nhập đúng {e}', { e: esc(x.email) })}</span></p>` : ''}
          <label class="small" style="display:flex;gap:.4rem;align-items:center;flex-wrap:wrap;margin:.4rem 0">${S('Trọng số (0–100)')} <input type="number" min="0" max="100" step="1" value="${+x.weight}" data-w style="width:5rem"> <button class="btn ghost sm" data-act="weight">${S('Lưu')}</button></label>
          <div class="tools" style="display:flex;gap:.4rem;flex-wrap:wrap">${dead ? '' : `<button class="btn ghost sm" data-act="browse">📂 ${S('Duyệt')}</button>`}<button class="btn ghost sm" data-act="files">📄 ${S('File')}</button><button class="btn ghost sm" data-act="quota">🔄 ${S('Cập nhật dung lượng')}</button>${x.status === 'draining' ? `<button class="btn ghost sm" data-act="resume">▶️ ${S('Nhận file lại')}</button>` : `<button class="btn ghost sm" data-act="drain" ${x.status === 'ok' ? '' : 'disabled'}>⏸️ ${S('Rút')}</button>`}<button class="btn ghost sm" data-act="disconnect">⛓️‍💥 ${S('Ngắt kết nối')}</button></div>
          <p class="tiny muted" data-msg aria-live="polite"></p></div>`;
      };
      const alertTxt = a => { const p = a.p || {}; return S({ conn: 'Drive {e} mất kết nối – bấm Kết nối lại', net: 'Drive {e}: Google không phản hồi {n} lần liên tiếp', upload: 'Drive {e}: tải lên lỗi {n} lần liên tiếp', quota: 'Drive {e} đã dùng {p}%', pool: 'Toàn kho chỉ còn {g} GB trống', replica: '{n} file chỉ còn 1 bản sao', poolpct: 'Toàn Kho Drive đã dùng {p}% – nối thêm Drive', gitsize: 'Repo git {r} đã {g} GB (> 2 GB)', d1: 'D1 đã đọc {n} M dòng hôm nay ({p}%) – việc nền tạm dừng', footage: 'Kho footage: {n} file lỗi/thiếu bản sao (footage-verify)', ci: 'CI: {n} workflow đỏ trong 24 h – xem issue nhãn ci-failure (bản tin ci-triage)', deploy: 'Bản deploy production KHÔNG qua smoke – xem issue ci-failure, khôi phục: docs/ROLLBACK.md', backup_d1: 'Sao lưu D1 lỗi hoặc diễn tập khôi phục thất bại – xem docs/ROLLBACK.md', backup_code: 'Sao lưu mã nguồn (git bundle) lỗi – xem docs/ROLLBACK.md', backup_rel: 'Lưu bản phát hành (AAB/IPA/zip add-on) lỗi – xem docs/ROLLBACK.md' }[a.t] || a.kind, { e: p.email || '', n: p.n ?? '', p: p.pct ?? '', g: p.gb ?? '', r: p.repo || '' }); };
      const al = d.alerts || [];
      const list = filterDrives(d.drives, { st: P.ds || 'all', q: P.dq || '', sort: P.dsort || 'pct' });
      const stChips = [['all', 'Tất cả'], ['live', 'Đang chạy'], ['die', 'Mất kết nối'], ['full', 'Đầy ≥ 90 %'], ['warn', 'Cảnh báo ≥ 80 %'], ['drain', 'Đang rút'], ['w0', 'Trọng số 0']];
      host.innerHTML = `<div class="card"><div class="row between" style="gap:.6rem;flex-wrap:wrap"><div style="min-width:0"><h3 style="margin:0">${S('🗄️ Kho Drive riêng')}</h3><p class="small muted" style="margin:.3rem 0 0">${S('Sao lưu bản gốc, clip và bản dựng của kho tài nguyên vào Google Drive của chính bạn (nguồn sao lưu 2). App chỉ thấy file do nó tạo (quyền drive.file).')}</p>${d.shorts ? `<p class="small" style="margin:.3rem 0 0" data-shorts-cap>${esc(S('🎬 Kho shorts: {b} · {m} master (TB {a}) · còn chứa ≈ {c} clip (≈ 10 MB/master, tới ngưỡng 90 %)', { b: GB(d.shorts.bytes), m: d.shorts.masters, a: GB(d.shorts.avg_master), c: (+d.shorts.clips || 0).toLocaleString() }))}</p>` : ''}</div>
          <div style="display:flex;gap:.4rem;flex-wrap:wrap"><button class="btn primary" id="drvConnect" ${ready ? '' : 'disabled'}>${S('➕ Kết nối Google Drive')}</button><button class="btn ghost" id="drvReload">${S('🔄 Tải lại')}</button></div></div>
          ${note ? `<p class="small" role="status" style="margin:.6rem 0 0"><b>${esc(note)}</b></p>` : ''}
          ${d.drives.length ? `<div class="meter ${band(pct)}" style="margin-top:1rem"><div class="row between small"><b>${S('Tổng dung lượng')} · ${esc(S('{n} Drive', { n: d.drives.length }))}</b><span>${S('Đã dùng')} ${GB(d.used)} / ${GB(d.total)} · ${S('Còn trống')} <b>${GB(d.free)}</b></span></div><div class="track"><div class="fill" style="width:${Math.min(100, pct)}%"></div></div></div>` : ''}
          ${d.forecast ? `<p class="small" style="margin:.4rem 0 0">📈 ${esc(S('Dự báo: +{g} GB/tháng (từ {s}) · {d}', { g: d.forecast.gb_month, s: d.forecast.since, d: d.forecast.days_left == null ? S('không tăng') : S('còn ≈ {n} ngày tới khi đầy', { n: d.forecast.days_left }) }))}</p>` : `<p class="tiny muted" style="margin:.4rem 0 0">${esc(S('Dự báo: cần ≥ 2 ngày số liệu (health hằng ngày)'))}</p>`}
          <p class="tiny muted" style="margin:.4rem 0 0">${c.cli ? S('CLI/CI: đã có khóa') : S('CLI/CI: chưa có LEXKITE_DRIVE_CLI_KEY (CI sẽ dùng GrabCast)')}</p>
          ${al.length ? `<div style="margin-top:.6rem">${al.map(a => `<div class="drv-al ${a.level}" role="${a.level === 'crit' ? 'alert' : 'status'}">${a.level === 'crit' ? '⛔' : '⚠️'} ${esc(alertTxt(a))}${a.mailed ? ' · ✉' : ''}</div>`).join('')}</div>` : ''}
        </div>
        ${ready ? '' : guide}
        ${d.drives.length ? `<div class="card" style="margin-top:1rem"><h3 style="margin:0 0 .5rem">${S('🔎 Tra cứu vị trí file')}</h3><form class="drv-bar" id="drvWhereF"><input id="drvWhereQ" placeholder="${S('Tên file / asset id / sha / file_id')}" aria-label="${S('Tên file / asset id / sha / file_id')}" style="flex:1 1 220px"><button class="btn ghost sm">${S('Tìm')}</button></form><div id="drvWhere"></div>
          <div class="drv-bar" style="margin-top:.8rem"><button class="btn ghost sm" id="drvHealth">🩺 ${S('Kiểm tra ngay')}</button><button class="btn ghost sm" id="drvRebal">⚖️ ${S('Cân bằng')}</button><button class="btn ghost sm" id="drvRepair">🩹 ${S('Sửa bản sao')}</button></div><div id="drvPool" aria-live="polite"></div></div>
        <div class="drv-bar" style="margin:1rem 0 .4rem">${stChips.map(([k, t]) => `<button type="button" class="chip-f ${(P.ds || 'all') === k ? 'on' : ''}" data-ds="${k}">${S(t)}</button>`).join('')}</div>
        <div class="drv-bar" style="margin-bottom:.5rem"><input id="drvDq" value="${esc(P.dq || '')}" placeholder="${S('Tìm email / id Drive')}" aria-label="${S('Tìm email / id Drive')}"><select id="drvDsort" aria-label="${S('Sắp xếp')}">${[['pct', '% đã dùng'], ['free', 'Còn trống'], ['created', 'Ngày kết nối'], ['checked', 'Lần kiểm cuối']].map(([k, t]) => `<option value="${k}" ${(P.dsort || 'pct') === k ? 'selected' : ''}>${S(t)}</option>`).join('')}</select><span class="small muted">${esc(S('{n} Drive', { n: list.length }))}</span></div>
        <p class="small muted" style="margin:.2rem 0 .4rem">${S('Drive có tỉ lệ đã dùng thấp nhất nhận file mới (chia đều); bản gốc lưu 2 bản trên 2 Drive khác nhau; ≥ 90 % tự ngừng nhận.')}</p><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:.9rem">${list.map(card).join('') || `<p class="small muted">${S('Không có Drive khớp bộ lọc.')}</p>`}</div>`
          : ready ? `<div class="card" style="margin-top:1rem"><p class="small muted">${S('Chưa nối Drive nào. Bấm "Kết nối Google Drive" và đăng nhập tài khoản Google muốn dùng.')}</p></div>` : ''}`;
      const $ = s => host.querySelector(s);
      $('#drvReload').onclick = reload;
      const cb = $('#drvConnect'); if (cb) cb.onclick = async () => { cb.disabled = true; cb.textContent = S('Đang mở Google…'); try { const r = await dapi('connect'); location.href = r.url; } catch (e) { cb.disabled = false; cb.textContent = S('➕ Kết nối Google Drive'); alert(errTxt(e)); } };
      host.querySelectorAll('[data-copy]').forEach(b => { b.onclick = () => { try { navigator.clipboard.writeText(b.dataset.copy); b.textContent = S('✓ Đã chép'); } catch (e) { /* bỏ qua */ } }; });
      host.querySelectorAll('[data-ds]').forEach(b => { b.onclick = () => { P.ds = b.dataset.ds === 'all' ? '' : b.dataset.ds; save(); overview(host, ready, c); }; });
      const dq = $('#drvDq'); if (dq) { let t = 0; dq.oninput = () => { clearTimeout(t); t = setTimeout(() => { P.dq = dq.value.trim(); save(); overview(host, ready, c); const n = host.querySelector('#drvDq'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }, 300); }; }
      const ds = $('#drvDsort'); if (ds) ds.onchange = () => { P.dsort = ds.value === 'pct' ? '' : ds.value; save(); overview(host, ready, c); };
      const wf = $('#drvWhereF'); if (wf) wf.onsubmit = async e => {
        e.preventDefault(); const q = $('#drvWhereQ').value.trim(), out = $('#drvWhere'); if (q.length < 3) { out.innerHTML = `<p class="small muted">${S('Nhập ít nhất 3 ký tự')}</p>`; return; }
        out.innerHTML = `<p class="small muted">${S('Đang tải…')}</p>`;
        try { const r = await dapi('where', { q }); out.innerHTML = r.copies.length ? ledgerTable(r.copies) : `<p class="small muted">${S('Không thấy bản sao nào')}</p>`; } catch (er) { out.innerHTML = `<p class="small">${esc(errTxt(er))}</p>`; }
      };
      const pool = $('#drvPool');
      const hb = $('#drvHealth'); if (hb) hb.onclick = async () => { hb.disabled = true; pool.innerHTML = `<p class="small muted">${S('Đang kiểm…')}</p>`; try { const r = await dapi('health'); pool.innerHTML = `<p class="small">${esc(S('✓ Đã kiểm {n} Drive · {a} cảnh báo · thiếu bản sao {u}', { n: r.drives.length, a: r.alerts.length, u: r.under_replicated || 0 }))}</p>`; setTimeout(reload, 1200); } catch (e) { pool.innerHTML = `<p class="small">${esc(errTxt(e))}</p>`; } hb.disabled = false; };
      const rb = $('#drvRebal'); if (rb) rb.onclick = async () => {
        pool.innerHTML = `<p class="small muted">${S('Đang lập kế hoạch…')}</p>`;
        try {
          const r = await dapi('rebalance');
          if (!r.plan.length) { pool.innerHTML = `<p class="small">${S('✓ Các Drive đã cân bằng (chênh ≤ 10 %)')}</p>`; return; }
          pool.innerHTML = `<p class="small"><b>${esc(S('Kế hoạch: chuyển {n} file · {b}', { n: r.plan.length, b: GB(r.bytes) }))}</b> (${S('chạy thử – chưa đổi gì')})</p><div class="drv-tw"><table class="drv-t"><tr><th>${S('File')}</th><th>${S('Dung lượng')}</th><th>${S('Từ')}</th><th>${S('Sang')}</th></tr>${r.plan.slice(0, 30).map(x => `<tr><td class="n">${esc(x.name)}</td><td>${GB(x.size)}</td><td>#${x.from} (${Math.round((r.before[x.from] || 0) * 100)}%)</td><td>#${x.to} (${Math.round((r.before[x.to] || 0) * 100)}%)</td></tr>`).join('')}</table></div><p class="tiny muted">${S('Áp dụng: chép sang Drive tỉ lệ thấp, kiểm md5, rồi chuyển bản cũ vào thùng rác (dung lượng giải phóng khi dọn thùng rác).')}</p><button class="btn primary sm" data-apply>${S('Áp dụng')}</button>`;
          pool.querySelector('[data-apply]').onclick = async () => { if (!confirm(S('Chép {n} file sang Drive khác rồi chuyển bản cũ vào thùng rác?', { n: r.plan.length }))) return; try { const x = await dapi('rebalance', { apply: true }); toast(S('✓ Đã chuyển {n} file · còn {m}', { n: x.done.length, m: x.remaining })); } catch (e) { toast(errTxt(e)); } };
        } catch (e) { pool.innerHTML = `<p class="small">${esc(errTxt(e))}</p>`; }
      };
      const rp = $('#drvRepair'); if (rp) rp.onclick = async () => {
        pool.innerHTML = `<p class="small muted">${S('Đang tải…')}</p>`;
        try {
          const r = await dapi('replicas'), k = r.counts;
          const rows = a => a.slice(0, 20).map(x => `<li>${esc(x.name || x.sha.slice(0, 12))} – ${x.copies}/${x.want} ${S('bản')}${x.asset ? ' · ' + esc(x.asset) : ''}</li>`).join('');
          pool.innerHTML = `<p class="small">${esc(S('Thiếu bản sao: {u} · chỉ còn 1 bản: {s} · chỉ còn trên Drive mất kết nối: {l}', { u: k.under, s: k.single, l: k.lost_only }))}</p>${k.single ? `<p class="small"><b>⚠️ ${S('File chỉ có 1 bản')}</b></p><ul class="small">${rows(r.single)}</ul>` : ''}${k.lost_only ? `<p class="small"><b>⛔ ${S('Chỉ còn trên Drive mất kết nối (cần tải lại từ máy / nguồn chính)')}</b></p><ul class="small">${rows(r.lost_only)}</ul>` : ''}${k.under ? `<button class="btn primary sm" data-fix>🩹 ${S('Chép bù ngay')}</button>` : `<p class="small">${S('✓ Đủ bản sao')}</p>`}`;
          const fx = pool.querySelector('[data-fix]'); if (fx) fx.onclick = async () => {
            fx.disabled = true; let tot = 0, last = Infinity;
            try { for (let i = 0; i < 20; i++) { const x = await dapi('repair', { max_files: 5 }); tot += x.done.length; fx.textContent = S('Đã chép {n}…', { n: tot }); if (!x.remaining || x.remaining >= last || !x.done.length) { toast(S('✓ Đã chép bù {n} bản · còn thiếu {m}', { n: tot, m: x.remaining })); break; } last = x.remaining; } } catch (e) { toast(errTxt(e)); }
            fx.disabled = false;
          };
        } catch (e) { pool.innerHTML = `<p class="small">${esc(errTxt(e))}</p>`; }
      };
      host.querySelectorAll('.drv-card').forEach(el => {
        const id = +el.dataset.id, x = d.drives.find(r => r.id === id), msg = el.querySelector('[data-msg]');
        const act = async (fn, ok) => { try { await fn(); msg.textContent = ok; setTimeout(reload, 600); } catch (e) { msg.textContent = errTxt(e); } };
        el.querySelectorAll('[data-act]').forEach(b => {
          b.onclick = async () => {
            const a = b.dataset.act;
            if (a === 'browse') { view = 'browse'; for (const k of Object.keys(P)) delete P[k]; P.d = id; save(); return draw(); }
            if (a === 'files') { view = 'ledger'; for (const k of Object.keys(P)) delete P[k]; P.drive_id = id; save(); return draw(); }
            if (a === 'reconnect') { b.disabled = true; try { const r = await dapi('connect', { reconnect_id: id }); location.href = r.url; } catch (e) { b.disabled = false; msg.textContent = errTxt(e); } return; }
            if (a === 'weight') return act(() => dapi('set_weight', { id, weight: +el.querySelector('[data-w]').value }), S('✓ Đã lưu'));
            if (a === 'quota') return act(() => dapi('refresh_quota', { id }), S('✓ Đã cập nhật'));
            if (a === 'drain') { if (confirm(S('Rút Drive {e}? Drive sẽ không nhận file mới (file cũ vẫn giữ, vẫn tải được).', { e: x.email }))) act(() => dapi('drain', { id }), S('✓ Đã lưu')); return; }
            if (a === 'resume') return act(() => dapi('drain', { id, on: false }), S('✓ Đã lưu'));
            if (a === 'disconnect') {
              const t = prompt(S('Ngắt kết nối {e}?\nLexkite thu hồi quyền ở Google và xóa bản ghi {n} file khỏi danh sách (file trong Drive của bạn KHÔNG bị xóa).\nGõ lại email để xác nhận:', { e: x.email, n: x.files }));
              if (t == null) return;
              if (t.trim().toLowerCase() !== x.email.toLowerCase()) { alert(S('Email không khớp – chưa ngắt gì.')); return; }
              act(() => dapi('disconnect', { id }), S('✓ Đã ngắt kết nối'));
            }
          };
        });
      });
    }

    // ---------------- Duyệt file (như Google Drive) ----------------
    function browse(host) {
      const live = D.drives.filter(x => x.status !== 'disconnected' && x.status !== 'revoked');
      if (!live.length) { host.innerHTML = `<div class="card"><p class="small muted">${S('Không có Drive nào đang kết nối.')}</p></div>`; return; }
      const drive = live.find(x => x.id === +P.d) || live[0]; P.d = drive.id;
      let mode = 'grid'; try { mode = localStorage.getItem('lk.drvView') === 'list' ? 'list' : 'grid'; } catch (e) { /* bỏ qua */ }
      const sel = new Set(); let items = [], next = null, crumbs = [], panel = '';
      const trash = P.trash === '1';
      const tabs = live.map(x => { const p = pctOf(x); return `<button type="button" class="drv-tab ${x.id === drive.id ? 'on' : ''}" data-d="${x.id}" aria-pressed="${x.id === drive.id}"><b style="display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(x.email)}</b><span class="tiny muted">${GB(x.quota_used)} / ${x.quota_total ? GB(x.quota_total) : '∞'} · ${p}%</span><div class="track"><div class="fill ${p >= 90 ? 'crit' : p >= 80 ? 'warn' : ''}" style="width:${Math.min(100, p)}%"></div></div></button>`; }).join('');
      host.innerHTML = `<div class="drv-tabs" role="tablist" aria-label="${S('Drive')}">${tabs}</div>
        <div class="card" style="margin-top:.6rem"><div class="drv-bar">
          <input id="bQ" type="search" value="${esc(P.q || '')}" placeholder="${S('Tìm trong Drive này')}" aria-label="${S('Tìm trong Drive này')}" style="flex:1 1 180px">
          <select id="bSort" aria-label="${S('Sắp xếp')}">${[['name', 'Tên A→Z'], ['name_desc', 'Tên Z→A'], ['date', 'Mới nhất'], ['date_asc', 'Cũ nhất'], ['size', 'Lớn nhất'], ['size_asc', 'Nhỏ nhất']].map(([k, t]) => `<option value="${k}" ${(P.order || 'name') === k ? 'selected' : ''}>${S(t)}</option>`).join('')}</select>
          <button type="button" class="btn ghost sm" id="bMode" aria-label="${S('Lưới / danh sách')}">${mode === 'grid' ? '☰ ' + S('Danh sách') : '▦ ' + S('Lưới')}</button>
          <button type="button" class="btn ghost sm ${trash ? 'primary' : ''}" id="bTrash" aria-pressed="${trash}">🗑️ ${S('Thùng rác')}</button>
          <button type="button" class="btn ghost sm" id="bClean">🧹 ${S('Dọn dẹp thông minh')}</button>
          <button type="button" class="btn ghost sm" id="bRep">📊 ${S('Báo cáo dung lượng')}</button>
        </div><div id="bPanel"></div><nav class="drv-crumbs" id="bCrumbs" aria-label="${S('Đường dẫn')}"></nav><div id="bItems" aria-live="polite"></div><div id="bMore"></div><div id="bSel"></div></div>`;
      const $ = s => host.querySelector(s);
      host.querySelectorAll('[data-d]').forEach(b => { b.onclick = () => { for (const k of Object.keys(P)) delete P[k]; P.d = b.dataset.d; save(); browse(host); }; });
      let qt = 0; $('#bQ').oninput = () => { clearTimeout(qt); qt = setTimeout(() => { P.q = $('#bQ').value.trim(); delete P.f; save(); load(); }, 350); };
      $('#bSort').onchange = () => { P.order = $('#bSort').value === 'name' ? '' : $('#bSort').value; save(); load(); };
      $('#bMode').onclick = () => { mode = mode === 'grid' ? 'list' : 'grid'; try { localStorage.setItem('lk.drvView', mode); } catch (e) { /* bỏ qua */ } $('#bMode').textContent = mode === 'grid' ? '☰ ' + S('Danh sách') : '▦ ' + S('Lưới'); paint(); };
      $('#bTrash').onclick = () => { P.trash = trash ? '' : '1'; delete P.f; delete P.q; save(); browse(host); };
      $('#bClean').onclick = () => { panel = panel === 'clean' ? '' : 'clean'; cleanup($('#bPanel'), drive, panel === 'clean'); };
      $('#bRep').onclick = () => { panel = panel === 'rep' ? '' : 'rep'; report($('#bPanel'), drive, panel === 'rep'); };
      const icon = it => (it.folder ? '📁' : it.kind === 'image' ? '🖼️' : it.kind === 'video' ? '🎬' : it.kind === 'audio' ? '🎵' : it.kind === 'data' ? '📄' : '📦');
      const rep = it => (it.copies == null ? '' : `<span class="drv-rep ${it.copies < (it.want || 1) ? 'bad' : ''}" title="${esc(S('{n}/{w} bản sao', { n: it.copies, w: it.want || 1 }))}">${it.copies < 2 && (it.want || 1) >= 2 ? '⚠ ' + S('1 bản') : '×' + it.copies}</span>`);
      function paint() {
        const box2 = $('#bItems');
        if (!items.length) { box2.innerHTML = `<p class="small muted">${trash ? S('Thùng rác trống.') : P.q ? S('Không có kết quả.') : S('Thư mục trống.')}</p>`; selBar(); return; }
        box2.innerHTML = `<div class="${mode === 'grid' ? 'drv-grid' : 'drv-list'}">${items.map((it, i) => `<div class="drv-it ${sel.has(it.id) ? 'sel' : ''}" data-i="${i}" tabindex="0" role="button" aria-label="${esc(it.name)}">
          ${it.sys ? '<span></span>' : `<input type="checkbox" data-ck aria-label="${esc(S('Chọn {n}', { n: it.name }))}" ${sel.has(it.id) ? 'checked' : ''}>`}
          <div class="th">${it.thumb ? `<img loading="lazy" alt="" src="${esc(it.thumb)}">` : icon(it)}</div>
          <div class="nm" title="${esc(it.name)}">${esc(it.name)}${it.sys ? ' 🔒' : ''}${rep(it)}</div>
          <div class="mt">${it.folder ? S('Thư mục') : GB(it.size)}${it.modified ? ' · ' + esc(new Date(it.modified).toLocaleDateString()) : ''}</div>
          <button type="button" class="kb" data-kb aria-label="${esc(S('Thao tác cho {n}', { n: it.name }))}">⋮</button></div>`).join('')}</div>`;
        box2.querySelectorAll('.drv-it').forEach(el => {
          const it = items[+el.dataset.i];
          el.onclick = e => {
            if (e.target.closest('[data-kb]')) return menu(it, e.target.getBoundingClientRect());
            if (e.target.closest('[data-ck]')) { if (e.target.checked) sel.add(it.id); else sel.delete(it.id); el.classList.toggle('sel', e.target.checked); return selBar(); }
            open(it);
          };
          el.onkeydown = e => { if (e.key === 'Enter' && e.target === el) open(it); };
          el.oncontextmenu = e => { e.preventDefault(); menu(it, { left: e.clientX, bottom: e.clientY, right: e.clientX }); };
          const im = el.querySelector('img'); if (im) im.onerror = () => { im.replaceWith(document.createTextNode(icon(it))); };
        });
        selBar();
      }
      function crumbBar() {
        const c = $('#bCrumbs');
        if (trash) { c.innerHTML = `<b>🗑️ ${S('Thùng rác')}</b> <span class="tiny muted">${S('Tự xóa sau 30 ngày')}</span>`; return; }
        if (P.q) { c.innerHTML = `<b>🔎 ${esc(S('Kết quả cho "{q}"', { q: P.q }))}</b>`; return; }
        c.innerHTML = crumbs.map((x, i) => `${i ? '<span aria-hidden="true">›</span>' : ''}<button type="button" data-f="${esc(x.id)}">${esc(x.name)}</button>`).join('');
        c.querySelectorAll('[data-f]').forEach(b => { b.onclick = () => { P.f = b.dataset.f; save(); load(); }; });
      }
      async function load(more) {
        if (!more) { sel.clear(); items = []; $('#bItems').innerHTML = `<p class="small muted">${S('Đang tải…')}</p>`; }
        try {
          const r = await dapi('browse', { drive_id: drive.id, folder_id: P.f || undefined, q: P.q || undefined, order: P.order || 'name', trash, page_token: more ? next : undefined, page_size: 60 });
          items = more ? items.concat(r.items) : r.items; next = r.next; crumbs = r.crumbs || [];
          crumbBar(); paint();
          $('#bMore').innerHTML = next ? `<button type="button" class="btn ghost sm" style="margin-top:.6rem">${S('Tải thêm')}</button>` : '';
          if (next) $('#bMore').firstChild.onclick = () => load(true);
        } catch (e) { $('#bItems').innerHTML = `<p class="small">${esc(errTxt(e))}</p>`; }
      }
      function open(it) {
        if (it.folder) { if (trash) return; P.f = it.id; delete P.q; save(); return load(); }
        preview(it);
      }
      async function preview(it) {
        const m = modal(`<h3 style="margin:.2rem 2rem .6rem 0;word-break:break-all">${esc(it.name)}</h3><div data-pv><p class="small muted">${S('Đang tải…')}</p></div>`);
        try {
          const r = await dapi('preview', { drive_id: drive.id, file_id: it.id }), pv = m.querySelector('[data-pv]');
          pv.innerHTML = (r.kind === 'image' ? `<img src="${esc(r.url)}" alt="${esc(it.name)}">` : r.kind === 'video' ? `<video src="${esc(r.url)}" controls playsinline preload="metadata"></video>` : r.kind === 'audio' ? `<audio src="${esc(r.url)}" controls></audio>` : `<p class="small muted">${S('Không xem trước được loại file này.')}</p>`)
            + `<p class="tiny muted" style="margin-top:.6rem">${esc(it.mime)} · ${GB(r.size)}${it.md5 ? ' · md5 ' + esc(it.md5) : ''}${it.copies != null ? ' · ' + esc(S('{n}/{w} bản sao', { n: it.copies, w: it.want || 1 })) : ''}</p><div class="drv-bar"><a class="btn ghost sm" href="${esc(r.url)}" download="${esc(it.name)}">⬇️ ${S('Tải về')}</a>${it.web ? `<a class="btn ghost sm" href="${esc(it.web)}" target="_blank" rel="noopener">↗ ${S('Mở trong Google Drive')}</a>` : ''}</div>`;
        } catch (e) { m.querySelector('[data-pv]').innerHTML = `<p class="small">${esc(errTxt(e))}</p>`; }
      }
      async function download(it) { try { const r = await dapi('preview', { drive_id: drive.id, file_id: it.id }); const a = document.createElement('a'); a.href = r.url; a.download = it.name; document.body.appendChild(a); a.click(); a.remove(); } catch (e) { toast(errTxt(e)); } }
      const doTrash = async ids => { try { const r = await dapi('trash', { drive_id: drive.id, file_ids: ids }); toast(S('✓ Đã chuyển {n} mục vào thùng rác', { n: r.done.length }) + (r.failed.length ? ' · ' + S('{n} lỗi', { n: r.failed.length }) : ''), r.done.length ? async () => { await dapi('restore', { drive_id: drive.id, file_ids: r.done }); load(); } : null); load(); } catch (e) { toast(errTxt(e)); } };
      const doRestore = async ids => { try { const r = await dapi('restore', { drive_id: drive.id, file_ids: ids }); toast(S('✓ Đã khôi phục {n} mục', { n: r.done.length })); load(); } catch (e) { toast(errTxt(e)); } };
      const typed = msg => { const t = prompt(msg + '\n\n' + S('Gõ DELETE để xác nhận:')); return t != null && t.trim() === 'DELETE'; };
      const doDelete = async ids => { if (!typed(S('Xóa VĨNH VIỄN {n} mục? Không thể khôi phục.', { n: ids.length }))) return; try { const r = await dapi('delete', { drive_id: drive.id, file_ids: ids, confirm: 'DELETE' }); toast(S('✓ Đã xóa vĩnh viễn {n} mục · giải phóng {b}', { n: r.done.length, b: GB(r.bytes) })); load(); } catch (e) { if (e.message !== 'reauth') toast(errTxt(e)); } };
      const emptyTrash = async () => { if (!typed(S('Dọn sạch thùng rác của kho Lexkite trên {e}? File bị xóa vĩnh viễn.', { e: drive.email }))) return; try { const r = await dapi('empty_trash', { drive_id: drive.id, confirm: 'DELETE' }); toast(S('✓ Đã xóa vĩnh viễn {n} mục · giải phóng {b}', { n: r.done.length, b: GB(r.bytes) }) + (r.remaining ? ' · ' + S('còn {n}', { n: r.remaining }) : '')); load(); } catch (e) { if (e.message !== 'reauth') toast(errTxt(e)); } };
      async function rename(it) { const n = prompt(S('Tên mới:'), it.name); if (!n || n === it.name) return; try { await dapi('rename', { drive_id: drive.id, file_id: it.id, name: n }); toast(S('✓ Đã đổi tên')); load(); } catch (e) { toast(errTxt(e)); } }
      async function move(ids) {
        let cur = null;
        const m = modal(`<h3 style="margin:.2rem 2rem .6rem 0">${esc(S('Chuyển {n} mục tới…', { n: ids.length }))}</h3><nav class="drv-crumbs" data-c></nav><div data-l style="max-height:50vh;overflow:auto"></div><div class="drv-bar" style="margin-top:.6rem"><button class="btn primary sm" data-go>${S('Chuyển vào đây')}</button></div>`);
        const go = async fid => {
          m.querySelector('[data-l]').innerHTML = `<p class="small muted">${S('Đang tải…')}</p>`;
          try {
            const r = await dapi('browse', { drive_id: drive.id, folder_id: fid || undefined, page_size: 200 }); cur = r.folder && r.folder.id;
            m.querySelector('[data-c]').innerHTML = (r.crumbs || []).map((x, i) => `${i ? '›' : ''}<button type="button" data-f="${esc(x.id)}">${esc(x.name)}</button>`).join('');
            const fs = r.items.filter(x => x.folder && !ids.includes(x.id));
            m.querySelector('[data-l]').innerHTML = fs.map(x => `<button type="button" class="btn ghost sm" style="display:block;width:100%;text-align:left;margin:.2rem 0" data-f="${esc(x.id)}">📁 ${esc(x.name)}</button>`).join('') || `<p class="small muted">${S('Không có thư mục con.')}</p>`;
            m.querySelectorAll('[data-f]').forEach(b => { b.onclick = () => go(b.dataset.f); });
          } catch (e) { m.querySelector('[data-l]').innerHTML = `<p class="small">${esc(errTxt(e))}</p>`; }
        };
        m.querySelector('[data-go]').onclick = async () => { if (!cur) return; try { const r = await dapi('move', { drive_id: drive.id, file_ids: ids, folder_id: cur }); m.close(); toast(S('✓ Đã chuyển {n} mục', { n: r.done.length }) + (r.failed.length ? ' · ' + S('{n} lỗi', { n: r.failed.length }) : '')); load(); } catch (e) { toast(errTxt(e)); } };
        go(null);
      }
      function menu(it, rect) {
        document.querySelectorAll('.drv-menu').forEach(x => x.remove());
        const acts = trash ? [['restore', '♻️ Khôi phục'], ['delete', '⛔ Xóa vĩnh viễn']] : [
          ...(it.folder ? [['open', '📂 Mở']] : [['preview', '👁️ Xem trước'], ['download', '⬇️ Tải về']]),
          ...(it.web ? [['web', '↗ Mở trong Google Drive']] : []), ...(it.sys ? [] : [['rename', '✏️ Đổi tên'], ['move', '📦 Chuyển tới…'], ['trash', '🗑️ Chuyển vào thùng rác']])];
        const mm = document.createElement('div'); mm.className = 'drv-menu'; mm.setAttribute('role', 'menu');
        mm.innerHTML = acts.map(([k, t]) => `<button type="button" role="menuitem" data-m="${k}">${S(t)}</button>`).join('');
        document.body.appendChild(mm);
        const x = Math.min(innerWidth - mm.offsetWidth - 8, Math.max(8, (rect.right || rect.left) - mm.offsetWidth)), y = Math.min(innerHeight - mm.offsetHeight - 8, rect.bottom || 0);
        mm.style.left = Math.max(8, x) + 'px'; mm.style.top = Math.max(8, y) + 'px';
        const close = () => { mm.remove(); removeEventListener('mousedown', out, true); removeEventListener('keydown', esc2); };
        const out = e => { if (!mm.contains(e.target)) close(); }, esc2 = e => { if (e.key === 'Escape') close(); };
        setTimeout(() => { addEventListener('mousedown', out, true); addEventListener('keydown', esc2); }, 0);
        const f = mm.querySelector('button'); if (f) f.focus();
        mm.onclick = e => {
          const b = e.target.closest('[data-m]'); if (!b) return; close();
          ({ open: () => open(it), preview: () => preview(it), download: () => download(it), web: () => window.open(it.web, '_blank', 'noopener'), rename: () => rename(it), move: () => move([it.id]), trash: () => doTrash([it.id]), restore: () => doRestore([it.id]), delete: () => doDelete([it.id]) })[b.dataset.m]();
        };
      }
      function selBar() {
        const s = $('#bSel'), ids = [...sel];
        if (!ids.length) { s.innerHTML = trash && items.length ? `<div class="drv-bar" style="margin-top:.6rem"><button type="button" class="btn ghost sm" data-empty>⛔ ${S('Dọn sạch thùng rác')}</button></div>` : ''; const em = s.querySelector('[data-empty]'); if (em) em.onclick = emptyTrash; return; }
        s.innerHTML = `<div class="drv-sel"><b>${esc(S('Đã chọn {n}', { n: ids.length }))}</b>${trash ? `<button type="button" class="btn ghost sm" data-a="restore">♻️ ${S('Khôi phục')}</button><button type="button" class="btn ghost sm" data-a="delete">⛔ ${S('Xóa vĩnh viễn')}</button>` : `<button type="button" class="btn ghost sm" data-a="move">📦 ${S('Chuyển tới…')}</button><button type="button" class="btn ghost sm" data-a="trash">🗑️ ${S('Chuyển vào thùng rác')}</button>`}<button type="button" class="btn ghost sm" data-a="all">${S('Chọn tất cả')}</button><button type="button" class="btn ghost sm" data-a="none">${S('Bỏ chọn')}</button></div>`;
        s.querySelectorAll('[data-a]').forEach(b => { b.onclick = () => ({ restore: () => doRestore(ids), delete: () => doDelete(ids), move: () => move(ids), trash: () => doTrash(ids), all: () => { items.filter(x => !x.sys).forEach(x => sel.add(x.id)); paint(); }, none: () => { sel.clear(); paint(); } })[b.dataset.a](); });
      }
      load();
    }

    // ---------------- Dọn dẹp thông minh ----------------
    const CAT_T = { duplicate: '♊ Trùng lặp', orphan: '👻 Mồ côi (không còn được tham chiếu)', old_reject: '🗃️ Reject / dự phòng cũ', temp: '⏳ Bản tạm / render cũ', partial: '💔 Tải dở / hỏng', trashed: '🗑️ Đã ở thùng rác' };
    const REASON = { 'dup-keep-referenced': 'Trùng – giữ bản manifest đang dùng: {k}', 'dup-keep-newest': 'Trùng – giữ bản mới nhất: {k}', 'orphan-unknown': 'Không có trong drive_files lẫn manifest', 'orphan-unreferenced': 'Manifest không còn trỏ tới', 'reject-older': 'reject · {d} ngày', 'reserve-older': 'dự phòng · {d} ngày', 'temp-older': 'bản tạm · {d} ngày', 'zero-byte': '0 byte', 'size-mismatch': 'kích thước lệch bản ghi', 'incomplete-upload': 'tải xong nhưng chưa ghi nhận (complete)', 'in-trash': 'đang ở thùng rác (Google tự xóa sau 30 ngày)' };
    function cleanup(el, drive, on) {
      if (!on) { el.innerHTML = ''; return; }
      el.innerHTML = `<div class="card" style="margin:.8rem 0;border:1px solid var(--line)"><h3 style="margin:0 0 .4rem">🧹 ${S('Dọn dẹp thông minh')}</h3><p class="small muted" style="margin:0 0 .5rem">${S('Chỉ quét (không xóa gì). Bạn xem lại, bỏ tích mục muốn giữ, rồi chuyển vào thùng rác – khôi phục được 30 ngày.')}</p>
        <div class="drv-bar"><label class="small">${S('Reject cũ hơn (ngày)')} <input type="number" min="0" value="30" data-o="reject_days" style="width:5rem"></label><label class="small">${S('Dự phòng cũ hơn (ngày)')} <input type="number" min="0" value="90" data-o="reserve_days" style="width:5rem"></label><label class="small">${S('Bản tạm cũ hơn (ngày)')} <input type="number" min="0" value="7" data-o="temp_days" style="width:5rem"></label><button type="button" class="btn primary sm" data-scan>🔍 ${S('Quét')}</button></div><div data-res aria-live="polite"></div></div>`;
      el.querySelector('[data-scan]').onclick = async () => {
        const o = {}; el.querySelectorAll('[data-o]').forEach(i => { o[i.dataset.o] = +i.value; });
        const res = el.querySelector('[data-res]'); res.innerHTML = `<p class="small muted">${S('Đang quét…')}</p>`;
        try { showScan(res, drive, await dapi('cleanup_scan', { drive_id: drive.id, ...o })); } catch (e) { res.innerHTML = `<p class="small">${esc(errTxt(e))}</p>`; }
      };
    }
    function showScan(res, drive, r) {
      const pick = new Map(); // id → size
      for (const c of CATS) if (c !== 'trashed') for (const x of r.groups[c] || []) pick.set(x.id, x.size);
      const why = x => S(REASON[x.reason] || x.reason, { k: x.keep ? (x.keep.path ? x.keep.path + '/' : '') + x.keep.name : '', d: x.days ?? '' });
      const grp = c => { const g = r.groups[c] || []; if (!g.length) return ''; const tr = c === 'trashed';
        return `<details class="drv-grp" ${tr ? '' : 'open'} data-g="${c}"><summary>${tr ? '' : `<input type="checkbox" data-all="${c}" checked aria-label="${esc(S('Chọn cả nhóm'))}">`}<span>${S(CAT_T[c])}</span><span class="small muted">${esc(S('{n} file · {b}', { n: g.length, b: GB(r.by[c].bytes) }))}</span></summary>
          ${g.slice(0, 300).map(x => `<div class="rw">${tr ? '<span>🗑️</span>' : `<input type="checkbox" data-id="${esc(x.id)}" checked aria-label="${esc(x.name)}">`}<span title="${esc((x.path ? x.path + '/' : '') + x.name)}"><b>${esc(x.name)}</b> <span class="muted">${esc(x.path || '')} · ${esc(why(x))}</span></span><span>${GB(x.size)}</span></div>`).join('')}
          ${tr ? `<div class="rw"><span></span><span class="small muted">${S('File trong thùng rác vẫn tính vào dung lượng – dọn ở chế độ Thùng rác.')}</span><span></span></div>` : ''}</details>`; };
      res.innerHTML = `<p class="small">${esc(S('Tìm thấy {n} file · có thể thu hồi {b}', { n: r.count, b: GB(r.total) }))}${r.refs_synced ? '' : ' · ' + esc(S('chưa đồng bộ manifest (chạy library.mjs drive-refs) – mồ côi chỉ tính file lạ'))}${r.truncated ? ' · ' + esc(S('Drive quá lớn – kết quả chưa đầy đủ')) : ''}</p>
        ${CATS.map(grp).join('') || `<p class="small">${S('✓ Không có gì cần dọn.')}</p>`}
        <div class="drv-sel" data-foot><b data-sum></b><button type="button" class="btn primary sm" data-apply>🗑️ ${S('Chuyển mục đã chọn vào thùng rác')}</button></div>`;
      const sum = () => { let n = 0, b = 0; res.querySelectorAll('input[data-id]').forEach(i => { if (i.checked) { n++; b += pick.get(i.dataset.id) || 0; } }); res.querySelector('[data-sum]').textContent = S('Đã chọn {n} · thu hồi {b}', { n, b: GB(b) }); res.querySelector('[data-apply]').disabled = !n; return n; };
      res.querySelectorAll('[data-all]').forEach(a => { a.onclick = e => e.stopPropagation(); a.onchange = () => { res.querySelectorAll(`[data-g="${a.dataset.all}"] input[data-id]`).forEach(i => { i.checked = a.checked; }); sum(); }; });
      res.querySelectorAll('input[data-id]').forEach(i => { i.onchange = sum; });
      sum();
      res.querySelector('[data-apply]').onclick = async () => {
        const ids = [...res.querySelectorAll('input[data-id]')].filter(i => i.checked).map(i => i.dataset.id);
        if (!ids.length || !confirm(S('Chuyển {n} file vào thùng rác của Google Drive? Khôi phục được trong 30 ngày.', { n: ids.length }))) return;
        try {
          let done = [], failed = 0;
          for (let i = 0; i < ids.length; i += 200) { const x = await dapi('cleanup_apply', { drive_id: drive.id, file_ids: ids.slice(i, i + 200) }); done = done.concat(x.undo || []); failed += x.failed.length; }
          toast(S('✓ Đã chuyển {n} file vào thùng rác', { n: done.length }) + (failed ? ' · ' + S('{n} lỗi', { n: failed }) : ''), done.length ? () => dapi('restore', { drive_id: drive.id, file_ids: done.slice(0, 200) }) : null);
          ids.forEach(id => { const i = res.querySelector(`input[data-id="${window.CSS && CSS.escape ? CSS.escape(id) : id}"]`); if (i) i.closest('.rw').remove(); });
          sum();
        } catch (e) { toast(errTxt(e)); }
      };
    }
    // ---------------- Báo cáo dung lượng ----------------
    async function report(el, drive, on) {
      if (!on) { el.innerHTML = ''; return; }
      el.innerHTML = `<p class="small muted">${S('Đang tải…')}</p>`;
      try {
        const r = await dapi('storage_report', { drive_id: drive.id });
        const bars = o => { const e = Object.entries(o).sort((a, b) => b[1].bytes - a[1].bytes), m = Math.max(1, ...e.map(x => x[1].bytes)); return e.map(([k, v]) => `<div class="drv-hb"><span title="${esc(k)}" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(S(k))}</span><span><i style="width:${Math.max(1, v.bytes / m * 100)}%"></i></span><span>${GB(v.bytes)} · ${v.files}</span></div>`).join('') || `<p class="small muted">–</p>`; };
        const tbl = a => `<div class="drv-tw"><table class="drv-t">${a.map(x => `<tr><td class="n" title="${esc(x.name)}">${esc(x.name)}</td><td>${esc(x.path || '')}</td><td>${GB(x.size)}</td></tr>`).join('')}</table></div>`;
        el.innerHTML = `<div class="card" style="margin:.8rem 0;border:1px solid var(--line)"><h3 style="margin:0 0 .4rem">📊 ${S('Báo cáo dung lượng')}</h3><p class="small">${esc(S('{n} file · {b} · thùng rác {t}', { n: r.total.files, b: GB(r.total.bytes), t: GB(r.trash.bytes) }))}</p>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,280px),1fr));gap:1rem"><div><b class="small">${S('Theo thư mục')}</b>${bars(r.by_folder)}</div><div><b class="small">${S('Theo loại')}</b>${bars(r.by_type)}</div></div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr));gap:1rem;margin-top:.6rem"><div><b class="small">${S('10 file lớn nhất')}</b>${tbl(r.largest)}</div><div><b class="small">${S('Mới thêm gần đây')}</b>${tbl(r.recent)}</div></div></div>`;
      } catch (e) { el.innerHTML = `<p class="small">${esc(errTxt(e))}</p>`; }
    }

    // ---------------- Sổ kho (lọc máy chủ, CSV, kiểm Google) ----------------
    const LF = ['q', 'drive_id', 'type', 'folder', 'lib', 'copies', 'gstate', 'from', 'to', 'min', 'max', 'sort', 'dir', 'page'];
    const ledgerTable = rows => `<div class="drv-tw"><table class="drv-t"><thead><tr><th>${S('File')}</th><th>${S('Asset')}</th><th>${S('Drive')}</th><th>${S('Thư mục')}</th><th>${S('Dung lượng')}</th><th>${S('Bản sao')}</th><th>${S('Kho')}</th><th>${S('Trên Google')}</th><th>${S('Ngày')}</th><th></th></tr></thead><tbody>${rows.map(x => `<tr><td class="n" title="${esc(x.name)}">${esc(x.name)}</td><td class="n">${esc(x.asset_id || '–')}</td><td>${esc(x.email || x.email_masked)}</td><td>${esc(x.folder || '/')}</td><td>${GB(x.size)}</td><td><span class="drv-rep ${x.copies < (x.want || 1) ? 'bad' : ''}">${x.copies}/${x.want || 1}</span></td><td>${esc(x.lib || '–')}</td><td>${esc(S({ ok: 'còn', trashed: 'thùng rác', gone: 'mất', pending: 'đang tải' }[x.status] || x.status))}</td><td>${x.at ? esc(new Date(x.at).toLocaleDateString()) : ''}</td><td>${x.web ? `<a href="${esc(x.web)}" target="_blank" rel="noopener" aria-label="${S('Mở trong Google Drive')}">↗</a>` : ''} <button type="button" class="btn ghost sm" data-cp="${esc(x.file_id)}" title="file_id" aria-label="${S('Chép file_id')}">⧉</button></td></tr>`).join('')}</tbody></table></div>`;
    async function ledger(host) {
      const day = v => (v ? new Date(+v).toISOString().slice(0, 10) : ''), MB = 1048576;
      const opt = (k, list) => `<select data-k="${k}" aria-label="${S(k)}">${list.map(([v, t]) => `<option value="${v}" ${String(P[k] || '') === v ? 'selected' : ''}>${S(t)}</option>`).join('')}</select>`;
      host.innerHTML = `<div class="card"><div class="row between" style="gap:.5rem;flex-wrap:wrap"><h3 style="margin:0">📒 ${S('Sổ kho')}</h3><div class="drv-bar"><button type="button" class="btn ghost sm" id="lCsv">⬇️ ${S('Xuất CSV (theo bộ lọc)')}</button><button type="button" class="btn ghost sm" id="lVer">🔁 ${S('Kiểm tra trên Google')}</button><button type="button" class="btn ghost sm" id="lReset">${S('Xóa bộ lọc')}</button></div></div>
        <div class="drv-f">
          <label>${S('Tìm (tên, asset, file_id, sha)')}<input data-k="q" value="${esc(P.q || '')}"></label>
          <label>${S('Drive')}${opt('drive_id', [['', 'Tất cả'], ...D.drives.map(x => [String(x.id), x.email])])}</label>
          <label>${S('Loại')}${opt('type', [['', 'Tất cả'], ['image', 'Ảnh'], ['clip', 'Clip'], ['render', 'Bản dựng'], ['other', 'Khác']])}</label>
          <label>${S('Thư mục')}<input data-k="folder" value="${esc(P.folder || '')}" placeholder="originals/clips"></label>
          <label>${S('Trạng thái kho')}${opt('lib', [['', 'Tất cả'], ['approved', 'approved'], ['reserve', 'reserve'], ['reject', 'reject']])}</label>
          <label>${S('Số bản sao')}${opt('copies', [['', 'Tất cả'], ['1', 'Chỉ 1 bản'], ['2+', '≥ 2 bản']])}</label>
          <label>${S('Trên Google')}${opt('gstate', [['', 'Còn + thùng rác + mất'], ['ok', 'còn'], ['trashed', 'thùng rác'], ['gone', 'mất']])}</label>
          <label>${S('Từ ngày')}<input type="date" data-k="from" value="${day(P.from)}"></label>
          <label>${S('Đến ngày')}<input type="date" data-k="to" value="${day(P.to)}"></label>
          <label>${S('Từ (MB)')}<input type="number" min="0" data-k="min" value="${P.min ? +P.min / MB : ''}"></label>
          <label>${S('Đến (MB)')}<input type="number" min="0" data-k="max" value="${P.max ? +P.max / MB : ''}"></label>
          <label>${S('Sắp xếp')}${opt('sort', [['', 'Ngày'], ['name', 'Tên'], ['size', 'Dung lượng'], ['copies', 'Số bản sao'], ['drive', 'Drive']])}</label>
          <label>${S('Chiều')}${opt('dir', [['', 'Giảm dần'], ['asc', 'Tăng dần']])}</label>
        </div><p class="small muted" id="lSum" aria-live="polite"></p><div id="lRows"></div><div class="drv-bar" id="lPg" style="margin-top:.5rem"></div></div>`;
      const $ = s => host.querySelector(s), PS = 50;
      const filt = () => { const f = {}; for (const k of LF) if (k !== 'page' && P[k] !== undefined && P[k] !== '') f[k] = P[k]; f.limit = PS; f.offset = (+P.page || 0) * PS; return f; };
      const load = async () => {
        $('#lRows').innerHTML = `<p class="small muted">${S('Đang tải…')}</p>`;
        try {
          const r = await dapi('ledger', { f: filt() }), pg = +P.page || 0, pages = Math.max(1, Math.ceil(r.total / PS));
          $('#lSum').textContent = S('{n} bản ghi · {b}', { n: r.total, b: GB(r.bytes) });
          $('#lRows').innerHTML = r.rows.length ? ledgerTable(r.rows) : `<p class="small muted">${S('Không có bản ghi khớp bộ lọc.')}</p>`;
          $('#lPg').innerHTML = `<button type="button" class="btn ghost sm" data-p="-1" ${pg ? '' : 'disabled'}>‹ ${S('Trước')}</button><span class="small">${pg + 1} / ${pages}</span><button type="button" class="btn ghost sm" data-p="1" ${pg + 1 < pages ? '' : 'disabled'}>${S('Sau')} ›</button>`;
          host.querySelectorAll('[data-p]').forEach(b => { b.onclick = () => { P.page = String(Math.max(0, pg + +b.dataset.p) || ''); save(); load(); }; });
        } catch (e) { $('#lRows').innerHTML = `<p class="small">${esc(errTxt(e))}</p>`; }
      };
      let t = 0;
      host.querySelectorAll('[data-k]').forEach(i => {
        const set = () => { const k = i.dataset.k, v = i.value.trim(); P[k] = !v ? '' : (k === 'from' || k === 'to') ? String(Date.parse(v + (k === 'to' ? 'T23:59:59' : 'T00:00:00')) || '') : (k === 'min' || k === 'max') ? String(Math.round(+v * MB)) : v; delete P.page; save(); load(); };
        if (i.tagName === 'SELECT' || i.type === 'date') i.onchange = set; else i.oninput = () => { clearTimeout(t); t = setTimeout(set, 350); };
      });
      host.addEventListener('click', e => { const b = e.target.closest('[data-cp]'); if (!b) return; try { navigator.clipboard.writeText(b.dataset.cp); b.textContent = '✓'; } catch (x) { /* bỏ qua */ } });
      $('#lReset').onclick = () => { for (const k of Object.keys(P)) delete P[k]; save(); ledger(host); };
      $('#lCsv').onclick = async () => {
        try {
          const f = filt(); delete f.limit; delete f.offset;
          const r = await dapi('ledger', { f, format: 'csv' }), a = document.createElement('a');
          a.href = URL.createObjectURL(new Blob(['﻿' + r.csv], { type: 'text/csv;charset=utf-8' })); a.download = `lexkite-so-kho-${new Date().toISOString().slice(0, 10)}.csv`;
          document.body.appendChild(a); a.click(); a.remove(); toast(S('✓ Đã xuất {n} dòng', { n: r.count }));
        } catch (e) { toast(errTxt(e)); }
      };
      $('#lVer').onclick = async () => {
        const b = $('#lVer'); b.disabled = true; let after = 0, ch = 0, n = 0;
        try { for (let i = 0; i < 200; i++) { const r = await dapi('verify_files', { after, batch: 50, drive_id: P.drive_id || undefined }); n += r.checked; ch += r.changed; b.textContent = S('Đã kiểm {n}…', { n }); if (!r.next) break; after = r.next; } toast(S('✓ Đã kiểm {n} file · {c} thay đổi', { n, c: ch })); load(); } catch (e) { toast(errTxt(e)); }
        b.disabled = false; b.textContent = '🔁 ' + S('Kiểm tra trên Google');
      };
      load();
    }

    // ---------------- Nhật ký thao tác ----------------
    async function audit(host) {
      const ACTS = ['upload', 'trash', 'restore', 'delete', 'empty_trash', 'move', 'rename', 'cleanup', 'rebalance', 'repair'];
      host.innerHTML = `<div class="card"><h3 style="margin:0 0 .5rem">🧾 ${S('Nhật ký thao tác')}</h3><div class="drv-bar"><select id="aAct" aria-label="${S('Thao tác')}"><option value="">${S('Mọi thao tác')}</option>${ACTS.map(a => `<option ${P.act === a ? 'selected' : ''}>${a}</option>`).join('')}</select><select id="aDrv" aria-label="${S('Drive')}"><option value="">${S('Mọi Drive')}</option>${D.drives.map(x => `<option value="${x.id}" ${+P.drive_id === x.id ? 'selected' : ''}>${esc(x.email)}</option>`).join('')}</select><input id="aQ" value="${esc(P.q || '')}" placeholder="${S('Tên file / file_id / người')}" aria-label="${S('Tên file / file_id / người')}"></div><div id="aRows" style="margin-top:.5rem"></div><div id="aMore"></div></div>`;
      const $ = s => host.querySelector(s); let rows = [];
      const load = async before => {
        try {
          const r = await dapi('audit_list', { act: P.act || undefined, drive_id: P.drive_id || undefined, q: P.q || undefined, before });
          rows = before ? rows.concat(r.rows) : r.rows;
          $('#aRows').innerHTML = rows.length ? `<div class="drv-tw"><table class="drv-t"><thead><tr><th>${S('Lúc')}</th><th>${S('Ai')}</th><th>${S('Thao tác')}</th><th>${S('File')}</th><th>${S('Drive')}</th><th>${S('Dung lượng')}</th><th>${S('Ghi chú')}</th></tr></thead><tbody>${rows.map(x => `<tr><td>${esc(when(x.at))}</td><td>${esc(x.who)}</td><td>${x.ok ? '' : '❌ '}${esc(x.act)}</td><td class="n" title="${esc(x.file_id || '')}">${esc(x.name || x.file_id || '')}</td><td>${esc(x.email || (x.drive_id ? '#' + x.drive_id : ''))}</td><td>${x.size != null ? GB(x.size) : ''}</td><td class="n">${esc(x.note || '')}</td></tr>`).join('')}</tbody></table></div>` : `<p class="small muted">${S('Chưa có thao tác nào.')}</p>`;
          $('#aMore').innerHTML = r.next ? `<button type="button" class="btn ghost sm" style="margin-top:.5rem">${S('Tải thêm')}</button>` : '';
          if (r.next) $('#aMore').firstChild.onclick = () => load(r.next);
        } catch (e) { $('#aRows').innerHTML = `<p class="small">${esc(errTxt(e))}</p>`; }
      };
      $('#aAct').onchange = () => { P.act = $('#aAct').value; save(); load(); };
      $('#aDrv').onchange = () => { P.drive_id = $('#aDrv').value; save(); load(); };
      let t = 0; $('#aQ').oninput = () => { clearTimeout(t); t = setTimeout(() => { P.q = $('#aQ').value.trim(); save(); load(); }, 350); };
      load();
    }
  }
  window.AdminDrive = { render, _t: { parseHash, toHash, filterDrives } };
})();
