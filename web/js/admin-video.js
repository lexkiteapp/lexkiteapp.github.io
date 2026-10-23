/* Quản trị → "🎬 Video" (#video/<mục>): thanh mục con dính (Tổng quan · Chờ duyệt · Thư viện · Sản xuất & QC · Kịch bản · Kênh & phân phối · Lưu trữ), mỗi mục tải lười.
 * Tải lười khi mở tab (admin.js). AdminVideo.render(container, vapi, L, { esc, lang, toast, yapi, capi }) – capi có → Thư viện/Lưu trữ/Chờ duyệt dùng /api/admin-clips (js/admin-clips.js)
 *   vapi(op, body) → POST /api/admin-shorts (functions/api/admin-shorts.js, adminGate). Bìa/video = URL ký ngắn hạn do máy chủ cấp
 *   (nguồn: Kho Drive riêng – không cần token GitHub; kho chưa sẵn sàng → manifest gói sẵn, bìa/video hiện "chưa có"). Biểu đồ = SVG nội tuyến, không thư viện. Chữ EN ở bảng EN. */
(function () {
  const EN = {
    "Kênh {c} · sẵn sàng đăng {r} · đã đăng (dò thấy) {u} · trên web {l} · cần xử lý {i}": "Channel {c} · ready to upload {r} · uploaded (detected) {u} · live on web {l} · needs attention {i}", "Cách đăng": "Upload path", "Tay qua YouTube Studio (chờ kiểm định)": "Manual via YouTube Studio (audit pending)", "Tự động qua API": "Automatic via API", "Đồng bộ": "Sync", "Quyền đã cấp chưa đủ cho cách đăng này – bấm Kết nối lại YouTube.": "Granted access is not enough for this path – click Reconnect YouTube.", "Đồng bộ lần cuối {t}: quét {n} video · khớp {k} · vấn đề {i}": "Last sync {t}: scanned {n} videos · matched {k} · issues {i}", "Chỉ bật khi Google đã duyệt kiểm định API – nếu chưa, video tải bằng API bị khóa ở chế độ riêng tư. Tiếp tục?": "Only switch once Google has approved the API audit – otherwise API uploads are locked private. Continue?", "Đồng bộ xong: {k} khớp · {l} mới lên · {i} vấn đề": "Sync done: {k} matched · {l} newly live · {i} issues", "Đang tạo gói": "Building pack", "Sẵn sàng đăng": "Ready to upload", "Đã đăng (dò thấy)": "Uploaded (detected)", "Video đang Riêng tư – đổi sang Không công khai (Unlisted) trong Studio": "Video is Private – switch it to Unlisted in Studio", "YouTube đang xử lý – đồng bộ lại sau": "YouTube is still processing – sync again later", "YouTube xử lý lỗi – xóa và tải lại": "YouTube processing failed – delete and re-upload", "Độ dài khác clip – có thể nhầm file": "Length differs from the clip – wrong file?", "Không còn thấy video trên kênh": "Video no longer found on the channel", "Link dán tay – chưa kiểm (chưa kết nối YouTube)": "Pasted link – unverified (YouTube not connected)", "Tiêu đề = title.txt": "Title = title.txt", "Mô tả = description.txt (giữ dòng lk:…)": "Description = description.txt (keep the lk:… line)", "Không dành cho trẻ em": "Not made for kids", "Nội dung bị thay đổi/tổng hợp = Có": "Altered or synthetic content = Yes", "Thể loại Giáo dục · thẻ = tags.txt": "Category Education · tags = tags.txt", "Chế độ hiển thị = Không công khai (Unlisted)": "Visibility = Unlisted", "Chưa có clip chờ đăng – mở 1 clip → Duyệt & tạo gói đăng.": "No clips waiting – open a clip → Approve & build upload pack.", "Video \"{t}\" ({v}) không có dòng lk:… – dán link vào đúng clip bên dưới": "Video \"{t}\" ({v}) has no lk:… line – paste its link into the right clip below", "Clip {c} được đăng nhiều lần: {v} – xóa bản thừa trong Studio": "Clip {c} was uploaded several times: {v} – delete the extras in Studio", "Mã lk:{c} không khớp clip nào đã duyệt ({v})": "Marker lk:{c} matches no approved clip ({v})", "Tải gói": "Download pack", "Đang tạo gói trên CI…": "Building the pack on CI…", "Chép thẻ": "Copy tags", "Mở YouTube Studio": "Open YouTube Studio", "Dán link YouTube (dự phòng)": "Paste YouTube link (fallback)", "Lưu link": "Save link", "Đã gắn video – trang bài học sẽ nhúng YouTube.": "Video linked – the lesson page will embed YouTube.", "Link không hợp lệ: {e}": "Invalid link: {e}", "Duyệt {n} video: tạo gói đăng tay (Unlisted) trên Kho Drive?": "Approve {n} videos: build manual upload packs (Unlisted) on the Drive pool?", "Đã duyệt {a} video – gói đăng sẽ sẵn sàng trong vài phút · bỏ qua {b}": "Approved {a} videos – packs ready in a few minutes · skipped {b}", "Duyệt & tạo gói đăng": "Approve & build upload pack",
    'Đang tải…': 'Loading…', 'Không tải được thư viện: {e}': 'Could not load the library: {e}', '🔄 Tải lại': '🔄 Reload',
    'QC hằng ngày': 'Daily QC', 'Kho kịch bản': 'Script bank', 'Kho kịch bản video (chỉ chữ)': 'Video script bank (text only)', 'Trong kho': 'In bank', 'Cần xem lại': 'For review', 'Chờ chấm': 'Awaiting judge', 'Tỉ lệ đạt': 'Pass rate', 'Kế hoạch': 'Planned', 'Còn lại': 'Remaining', 'Điểm giám khảo TB': 'Avg judge score',
    'Theo loại bài': 'By type', 'Theo độ khó': 'By difficulty', 'Theo chủ đề': 'By topic', 'Lý do xem lại': 'Review reasons', 'Ngày': 'Date', 'Lần gọi': 'Calls', 'Sinh': 'Generated', 'Trượt QC': 'QC failed', 'Trùng': 'Duplicates', 'Đạt': 'Passed', 'Điểm thấp': 'Low score',
    'Chưa có kho kịch bản – CI script-bank.yml ghi /data/script-bank.json sau mỗi lượt.': 'No script bank yet – CI script-bank.yml writes /data/script-bank.json after every run.', 'Cập nhật {d} · chỉ chữ, không dựng, không đăng (docs/VIDEO-SCALE-PLAN.md §16).': 'Updated {d} · text only, no renders, no publishing (docs/VIDEO-SCALE-PLAN.md §16).', 'Báo cáo QC hằng ngày (7 ngày)': 'Daily QC report (7 days)', 'đạt': 'passed', 'Điểm': 'Score', 'Kết quả': 'Result', 'Cổng trượt': 'Failed gates', 'Nền': 'Background', 'Chưa có báo cáo QC – cine-render ghi shorts/qc/<ngày>.json sau mỗi lần dựng.': 'No QC report yet – cine-render writes shorts/qc/<date>.json after every run.',
    'Thư viện': 'Library', 'Trên web': 'On the web', 'Hiệu quả video trên web (90 ngày)': 'Web performance (90 days)', 'Lượt xem': 'Views', 'Xem hết': 'Completed', 'Câu đố đúng': 'Quiz correct',
    'Chưa có số liệu web – clip được duyệt sẽ tự lên web (docs/VIDEO-SCALE-PLAN.md §10).': 'No web data yet – approved clips go live automatically (docs/VIDEO-SCALE-PLAN.md §10).', 'mẫu thử': 'test', 'Thống kê': 'Statistics', 'Tìm điểm học, tiêu đề, mã…': 'Search learning point, title, id…', 'Tìm kiếm': 'Search',
    'Định dạng': 'Format', 'Cảnh/chủ đề': 'Scene/topic', 'Mẫu': 'Template', 'Trạng thái': 'Status', 'Từ ngày': 'From', 'Đến ngày': 'To', 'Tất cả': 'All', 'Xóa lọc': 'Clear filters',
    'Bản tin': 'News', 'Cảnh': 'Scene', 'QA đạt': 'QA passed', 'QA chưa đạt': 'QA failed', 'Đã lên lịch': 'Scheduled', 'Đã tới lịch': 'Slot passed', 'Chưa xếp lịch': 'Unscheduled', 'Bị loại': 'Rejected', 'Tạm dừng': 'Paused',
    '{n} video': '{n} videos', 'Không có video khớp bộ lọc.': 'No videos match the filters.', 'Chưa có': 'Unavailable', 'Mở video {t}': 'Open video {t}',
    '⚠️ Kho Drive chưa đọc được: đang dùng manifest gói sẵn (cập nhật {d}); bìa và video chưa xem được. Xem docs/SHORTS-ACCESS.md.': '⚠️ The Drive pool is not readable: using the bundled manifest (updated {d}); covers and videos are unavailable. See docs/SHORTS-ACCESS.md.',
    'Nguồn: repo riêng lexkite-shorts (trực tiếp)': 'Source: private repo lexkite-shorts (live)', 'Nguồn: manifest gói sẵn': 'Source: bundled manifest', 'Nguồn: Kho Drive riêng (trực tiếp)': 'Source: private Drive pool (live)',
    'Đóng': 'Close', 'Tải xuống': 'Download', 'Video chưa có trên Kho Drive.': 'This video is not on the Drive pool yet.',
    'Không lấy được link video: {e}': 'Could not get the video link: {e}', 'Chép tiêu đề': 'Copy title', 'Chép mô tả': 'Copy description', 'Chép hashtag': 'Copy hashtags', 'Đã chép': 'Copied',
    'Điểm học': 'Learning point', 'Lĩnh vực': 'Area', 'Thời lượng': 'Duration', 'Dung lượng': 'Size', 'Ngày dựng': 'Rendered', 'Lượt CI': 'CI run', 'Lịch đăng': 'Publish slot', 'Chuỗi': 'Series', 'Ngôn ngữ': 'Language',
    'Kết quả QA': 'QA result', 'Mục đạt': 'Checks OK', 'Mục lỗi': 'Checks failed', 'Khớp môi lệch tối đa': 'Max lip-sync error', 'Phụ đề tối đa (ký tự/giây)': 'Max caption speed (cps)', 'Tiêu đề': 'Title', 'Mô tả': 'Description',
    'Tổng video': 'Total videos', 'Tỉ lệ đạt QA': 'QA pass rate', 'Thời lượng TB': 'Avg duration', 'Tổng dung lượng': 'Total size', 'Credit đã dùng': 'Credits spent',
    'Theo định dạng': 'By format', 'Theo cảnh': 'By scene', 'Theo mẫu': 'By template', 'Theo lĩnh vực': 'By area', 'Theo CEFR': 'By CEFR',
    'Độ phủ theo khu vực web': 'Coverage by web area', 'Mục tiêu {n}/khu vực · ô cam = còn thiếu, ô đỏ = chưa có video': 'Target {n} per area · amber = gap, red = no videos',
    'thiếu {n}': '{n} missing', 'đủ': 'complete', 'chưa có': 'none',
    'Số video dựng mỗi ngày': 'Renders per day', 'Lịch đăng': 'Publish calendar', '{a} bài đã qua lịch · {b} bài sắp tới · {c} video chưa xếp lịch': '{a} past slots · {b} upcoming · {c} videos unscheduled',
    'Kế tiếp': 'Next', 'Credit theo kho cảnh': 'Credits per bank', 'ảnh {a} · video {b}': 'images {a} · videos {b}', 'Chưa có tóm tắt credit (chạy scripts/cine/credits_summary.py).': 'No credit summary yet (run scripts/cine/credits_summary.py).',
    'Không có dữ liệu': 'No data', 'ngày {d}: {n}': '{d}: {n}',
    'Chọn kênh ở màn hình Google; muốn thêm kênh khác thì bấm Thêm kênh và chọn kênh đó.': 'Pick the channel on Google\'s screen; to add another channel, click Add channel and pick that one.', 'Thêm kênh': 'Add channel', 'Kênh đăng mặc định': 'Default channel to post to', 'Ngắt kết nối': 'Disconnect', 'Mặc định': 'Default', '{n} video': '{n} videos', 'Mất quyền – bấm Thêm kênh để kết nối lại': 'Access lost – click Add channel to reconnect', 'Ngắt kết nối kênh {c}? Token sẽ bị thu hồi và xóa.': 'Disconnect channel {c}? Its token will be revoked and deleted.', 'Đã ngắt kết nối kênh.': 'Channel disconnected.', 'Thao tác nhạy cảm: đăng xuất rồi đăng nhập lại, sau đó thử lại.': 'Sensitive action: sign out and sign in again, then retry.', 'Đã chọn kênh mặc định.': 'Default channel set.', 'Kênh YouTube': 'YouTube channels', 'Kết nối YouTube': 'Connect YouTube', 'Kết nối lại YouTube': 'Reconnect YouTube', 'YouTube chưa kết nối – chỉ chủ kênh bấm (đồng ý trong trình duyệt của anh).': 'YouTube not connected – channel owner only (consent in your own browser).',
    'Kênh {c} · hạn mức hôm nay còn {u} đơn vị (≈ {n} video) · chờ {q} · đã lên {d}': 'Channel {c} · quota left today {u} units (≈ {n} videos) · queued {q} · uploaded {d}',
    'Chế độ': 'Privacy', 'Riêng tư': 'Private', 'Không công khai (unlisted)': 'Unlisted', 'Theo lịch đăng (publishAt)': 'Follow the publish calendar (publishAt)',
    'Chọn nhiều': 'Select', 'Duyệt & lên YouTube': 'Approve & upload to YouTube', 'Duyệt & lên YouTube ({n})': 'Approve & upload to YouTube ({n})',
    'Duyệt {n} video lên YouTube ở chế độ {p}{s}? Không bao giờ công khai ngay.': 'Approve {n} videos for YouTube as {p}{s}? Never public immediately.', ' (công khai theo lịch đăng)': ' (goes public at its calendar slot)',
    'Đã xếp {a} video · bỏ qua {b}': 'Queued {a} · skipped {b}', 'Đã kết nối YouTube.': 'YouTube connected.', 'Kết nối YouTube lỗi: {e}': 'YouTube connection failed: {e}',
    'YouTube: {s}': 'YouTube: {s}', 'Bản gốc đã xóa theo luật giữ 30 ngày – dựng lại từ công thức (shorts-rebuild).': 'Master removed by the 30-day retention rule – rebuild from the recipe (shorts-rebuild).',
    // ---- bố cục mới (thanh mục con, 23/10/2026) ----
    'Các mục video': 'Video sections', 'Tổng quan': 'Overview', 'Chờ duyệt': 'To review', 'Sản xuất & QC': 'Production & QC', 'Kịch bản': 'Scripts', 'Kênh & phân phối': 'Channels & distribution', 'Lưu trữ': 'Archive',
    'Việc cần làm hôm nay và số liệu chính của kho video.': 'What needs you today and the key numbers of the video library.', 'Cần anh làm': 'Needs your action', '{n} việc': '{n} tasks', 'Đã xong': 'All done',
    'Không có việc nào cần làm': 'Nothing needs your action', 'Mọi video đã được xử lý.': 'Every video has been handled.', 'Gấp': 'Urgent', 'Cần xử lý': 'Action needed', 'Việc mới': 'New',
    '{n} video đạt QA đang chờ anh duyệt': '{n} QA-passed videos are waiting for your review', 'Duyệt ngay': 'Review now', 'YouTube chưa kết nối – chưa đăng được video': 'YouTube is not connected – videos cannot be posted', 'Kết nối': 'Connect',
    'Quyền YouTube chưa đủ – cần kết nối lại': 'YouTube permission is incomplete – reconnect needed', 'Mở': 'Open', '{n} gói đăng sẵn sàng – tải lên YouTube Studio': '{n} upload packs ready – upload them in YouTube Studio', 'Mở gói đăng': 'Open packs',
    '{n} video trên YouTube cần xử lý': '{n} YouTube videos need attention', 'Xem': 'View', '{n} kênh mất quyền – kết nối lại': '{n} channels lost access – reconnect', '{n} clip trượt QC trong 7 ngày – xem lý do và cách sửa': '{n} clips failed QC in 7 days – see reasons and fixes',
    'Xem lỗi': 'See failures', 'Kho Drive chưa đọc được – bìa và video chưa xem được (docs/SHORTS-ACCESS.md).': 'Drive pool unreadable – covers and videos cannot be viewed (docs/SHORTS-ACCESS.md).', '{n} khu vực web chưa có video nào': '{n} web areas have no video yet', 'Xem độ phủ': 'See coverage',
    'Có tác vụ hàng loạt dang dở': 'A bulk action is unfinished', 'Tiếp tục': 'Continue', 'Đã đăng': 'Published', 'Lỗi QA': 'QA failed', 'Video dựng mỗi ngày (30 ngày)': 'Videos rendered per day (30 days)', 'Lịch đăng sắp tới': 'Upcoming posts',
    'Chưa có bài nào sắp đăng.': 'No upcoming posts.', 'Phân tích chi tiết': 'Detailed breakdown', 'Theo kho cảnh': 'By scene bank', 'Credit đã dùng: {n}': 'Credits used: {n}',
    'Video đã qua QA tự động. Xem thử, rồi Duyệt (tạo gói đăng) hoặc Loại.': 'Videos that passed automatic QA. Preview, then Approve (creates the upload pack) or Reject.', 'Sắp xếp': 'Sort', 'Điểm QC cao trước': 'Highest QC first', 'Điểm QC thấp trước': 'Lowest QC first', 'Mới nhất': 'Newest',
    'Chọn nhiều trong Thư viện': 'Multi-select in Library', '{n} video chờ duyệt': '{n} videos to review', 'Xem thử': 'Preview', 'Xem thử {t}': 'Preview {t}', 'Duyệt': 'Approve', 'Loại…': 'Reject…', 'Lý do loại': 'Reason for rejecting', 'Tải thêm': 'Load more',
    'Không còn video chờ duyệt': 'Nothing left to review', 'Video mới đạt QA sẽ hiện ở đây.': 'New QA-passed videos will appear here.', 'Đã duyệt – gói đăng sẽ sẵn sàng trong vài phút.': 'Approved – the upload pack will be ready in a few minutes.', 'Đã loại video.': 'Video rejected.',
    'Không thực hiện được: {e}': 'Could not do it: {e}', 'QC {n}/100': 'QC {n}/100', 'Lịch {d}': 'Slot {d}',
    'Mọi video: tìm, lọc, chọn nhiều và thao tác hàng loạt.': 'Every video: search, filter, multi-select and bulk actions.',
    'Mọi clip đi qua cổng QC tự động (7 ngày gần nhất). Clip trượt không được đăng.': 'Every clip goes through the automatic QC gate (last 7 days). Failed clips are never posted.', 'Mở dây chuyền (Video Studio)': 'Open pipeline (Video Studio)',
    'Clip đã chấm (7 ngày)': 'Clips checked (7 days)', 'Trượt': 'Failed', 'Điểm TB': 'Avg score', 'Lỗi cần xử lý': 'Failures to fix', 'Cách sửa': 'Fix', '{n} clip': '{n} clips', 'Không có clip trượt trong 7 ngày.': 'No failed clips in 7 days.',
    'Xem {n} clip lỗi QA trong Thư viện': 'See {n} QA-failed clips in the Library', 'Theo ngày': 'By day', '{a}/{b} đạt': '{a}/{b} passed',
    'Giám khảo AI chấm kịch bản thấp': 'AI judge scored the script low', 'Sửa kịch bản (mục Kịch bản) rồi dựng lại': 'Fix the script (Scripts section), then re-render', 'AI nhìn khung thấy lỗi hình (đứng sai chỗ, khung hỏng)': 'AI vision found a picture problem (wrong placement, broken frame)',
    'Đổi nền hoặc tổ hợp cảnh rồi dựng lại': 'Change the background or scene combination, then re-render', 'Giọng đọc không khớp kịch bản': 'Voice does not match the script', 'Tạo lại giọng đọc rồi dựng lại': 'Regenerate the voice, then re-render',
    'Nền có chữ giả': 'Background has fake text', 'Chọn nền khác (hoặc sửa chữ trên nền) rồi dựng lại': 'Pick another background (or fix the sign text), then re-render', 'Âm thanh / phụ đề chưa đạt chuẩn': 'Audio / subtitles below standard',
    'Mở chi tiết QA của clip, dựng lại': 'Open the clip QA details, re-render', 'Người dẫn đứng sai vị trí trong cảnh': 'Host placed wrongly in the scene', 'Chọn nền có sàn đứng phù hợp rồi dựng lại': 'Pick a background with a usable floor, then re-render',
    'Kịch bản sai luật (độ dài, CEFR, câu mở đầu)': 'Script breaks the rules (length, CEFR, hook)', 'Sửa kịch bản rồi dựng lại': 'Fix the script, then re-render', 'Tốc độ nói ngoài 150–165 từ/phút': 'Speaking rate outside 150–165 wpm', 'Chỉnh tốc độ giọng rồi dựng lại': 'Adjust the voice speed, then re-render',
    'Xem tiêu chí ở docs/VIDEO-QC.md': 'See the criteria in docs/VIDEO-QC.md',
    'Kho kịch bản (chỉ chữ) và độ phủ video theo khu vực web.': 'Script bank (text only) and video coverage by web area.',
    'Kết nối YouTube, gói đăng tay và hiệu quả trên web. Luật định tuyến theo kênh ở tab Kênh & phân phối.': 'YouTube connection, manual upload packs and web performance. Per-channel routing rules live in the Channels & distribution tab.', 'Luật & lịch theo kênh': 'Channel rules & schedule',
    'Đã kết nối': 'Connected', 'Chưa kết nối': 'Not connected', 'Nâng cao': 'Advanced', 'Gói chờ đăng tay': 'Manual upload packs',
    'Clip bị loại hoặc tạm dừng. Chọn clip rồi Khôi phục / Bỏ tạm dừng ở thanh thao tác.': 'Rejected or paused clips. Select clips, then Restore / Resume from the action bar.', 'Kho Drive (sao lưu)': 'Drive pool (backup)', 'Không có clip nào trong lưu trữ.': 'No clips in the archive.',
    'Không tải được: {e}': 'Could not load: {e}', 'Thử lại': 'Retry', 'Video': 'Video',
  };
  // Hệ thống hình ảnh: dùng token/thành phần quản trị sẵn có (.card, .kpis/.kpi, .chip ok/warn/bad/info, .btn primary/ghost, .empty, .err-box, .sk, .tbl) – chỉ thêm bố cục vx-*.
  const CSS = `.vx-nav{position:sticky;top:var(--a-top,56px);z-index:20;display:flex;gap:.2rem;overflow-x:auto;scrollbar-width:thin;margin:-.3rem 0 1.1rem;padding:.4rem .1rem;background:color-mix(in srgb,var(--bg) 94%,transparent);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);border-bottom:1px solid var(--line)}
.vx-tab{flex:none;display:inline-flex;align-items:center;gap:.4rem;min-height:40px;padding:0 .85rem;border-radius:10px;color:var(--muted);font-weight:600;font-size:.88rem;text-decoration:none;white-space:nowrap}.vx-tab:hover{background:var(--surface-2);color:var(--text)}
.vx-tab[aria-current=page]{background:var(--surface);color:var(--text);box-shadow:inset 0 -3px 0 var(--primary),var(--shadow-sm)}.vx-tab:focus-visible{outline:2px solid var(--primary);outline-offset:-2px}
.vx-n{min-width:1.4rem;padding:0 .4rem;border-radius:99px;font-size:.72rem;line-height:1.35rem;text-align:center;background:var(--a-info-bg);color:var(--a-info);font-variant-numeric:tabular-nums}.vx-n.bad{background:var(--a-bad-bg);color:var(--a-bad)}
.vx-body{min-height:70vh;outline:none}.vx-h{display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;gap:.6rem 1rem;margin-bottom:1rem}.vx-h h2{margin:0;font-size:1.2rem;font-weight:800}.vx-h p{margin:.2rem 0 0;color:var(--muted);font-size:.88rem;max-width:72ch}.vx-act{display:flex;flex-wrap:wrap;gap:.45rem}
.vx .card{margin-bottom:.9rem;min-width:0}.vx .card-h h3{margin:0}.vx .kpis{margin-bottom:.9rem}.vx .kpi .v{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.vx-2{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr));gap:0 .9rem}
.vx-list{list-style:none;margin:0;padding:0}.vx-list>li{display:flex;align-items:center;flex-wrap:wrap;gap:.45rem .7rem;padding:.65rem 0;border-top:1px solid var(--line)}.vx-list>li:first-child{border-top:0;padding-top:.2rem}.vx-list .tx{flex:1 1 220px;min-width:0}.vx-list .tx b{display:block}.vx-list .tx span{display:block;font-size:.82rem;color:var(--muted)}
.vx details>summary{cursor:pointer;font-weight:700;min-height:40px;display:flex;align-items:center;gap:.5rem;list-style:none}.vx details>summary::-webkit-details-marker{display:none}.vx details>summary::before{content:'▸';color:var(--muted);transition:transform .15s}.vx details[open]>summary::before{transform:rotate(90deg)}.vx details>summary:focus-visible{outline:2px solid var(--primary);outline-offset:2px;border-radius:6px}
.vx-tools{display:flex;flex-wrap:wrap;gap:.5rem;align-items:center;margin-bottom:.7rem}.vx-tools .sp{flex:1}.vx-tools label{display:inline-flex;align-items:center;gap:.4rem;font-size:.84rem;color:var(--muted)}.vx select,.vx input[type=search],.vx input[type=date]{min-height:36px;border:1px solid var(--line);border-radius:9px;background:var(--surface);color:var(--text);padding:0 .5rem;font:inherit;font-size:.86rem;max-width:100%}
.vx-q{list-style:none;margin:0;padding:0;display:grid;gap:.5rem}.vx-r{display:grid;grid-template-columns:54px minmax(0,1fr) auto;gap:.8rem;align-items:center;padding:.6rem .7rem;border:1px solid var(--line);border-radius:var(--a-r-sm,10px);background:var(--surface)}
.vx-th{all:unset;box-sizing:border-box;position:relative;width:54px;height:96px;border-radius:8px;overflow:hidden;background:var(--surface-2);display:grid;place-items:center;cursor:pointer;font-size:1.2rem}.vx-th img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}.vx-th:focus-visible{outline:2px solid var(--primary);outline-offset:2px}
.vx-rm{display:grid;gap:.25rem;min-width:0}.vx-rm b{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.vx-rm .m{color:var(--muted);font-size:.8rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.vx-chips{display:flex;flex-wrap:wrap;gap:.3rem}
.vx-ra{display:flex;gap:.4rem;flex-wrap:wrap;justify-content:flex-end}.vx-r.done{opacity:.45;pointer-events:none}@media(max-width:640px){.vx-r{grid-template-columns:54px minmax(0,1fr)}.vx-ra{grid-column:1/-1}.vx-ra .btn{flex:1}}
.vx-bar{height:8px;border-radius:99px;background:var(--surface-2);overflow:hidden;flex:1 1 80px;min-width:60px;max-width:220px}.vx-bar i{display:block;height:100%;background:var(--good)}.vx-day{border-top:1px solid var(--line);padding:.2rem 0}.vx-day:first-of-type{border-top:0}.vx-day summary .sp{flex:1}
.vx-sk{display:grid;gap:.9rem}.vx-sk .sk-h{height:52px}.vx .tbl-wrap,.vx .tbl-x{overflow-x:auto}.vx .empty{padding:1.6rem 1rem}
.vid-bar{display:flex;flex-wrap:wrap;gap:.5rem;align-items:center;margin-bottom:.8rem}.vid-bar input[type=search]{flex:1 1 220px}
.vid-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:.7rem}
.vid-card{all:unset;box-sizing:border-box;display:flex;flex-direction:column;cursor:pointer;border:1px solid var(--line);border-radius:12px;overflow:hidden;background:var(--surface);min-width:0}.vid-card:focus-visible{outline:2px solid var(--primary);outline-offset:2px}.vid-card[aria-pressed=true]{outline:3px solid var(--primary);outline-offset:2px}
.vid-th{position:relative;aspect-ratio:9/16;background:var(--surface-2);display:flex;align-items:center;justify-content:center;color:var(--muted);font-size:.8rem;text-align:center}.vid-th img{width:100%;height:100%;object-fit:cover;display:block}
.vid-th .chip{position:absolute;top:6px;left:6px}.vid-dur{position:absolute;bottom:6px;right:6px;font-size:.7rem;padding:.05rem .35rem;border-radius:6px;background:rgba(0,0,0,.72);color:#fff}
.vid-meta{padding:.45rem .55rem;font-size:.78rem;display:flex;flex-direction:column;gap:.2rem;min-width:0}.vid-meta b{overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}.vid-meta span{color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.vid-dlg{width:min(880px,calc(100vw - 32px))}.vid-dlg .in{display:grid;grid-template-columns:minmax(0,320px) 1fr;gap:1rem;padding:1rem}.vid-dlg video,.vid-ph{width:100%;aspect-ratio:9/16;border-radius:10px;background:#000;display:block}
.vid-ph{display:flex;align-items:center;justify-content:center;color:#ddd;padding:1rem;text-align:center;font-size:.85rem;box-sizing:border-box}.vid-dlg-h{padding:.8rem 1rem;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;gap:.5rem;align-items:center}
.vid-kv{width:100%;border-collapse:collapse;font-size:.83rem}.vid-kv th{text-align:left;color:var(--muted);font-weight:600;padding:.2rem .5rem .2rem 0;white-space:nowrap;vertical-align:top}.vid-kv td{padding:.2rem 0;word-break:break-word}
.vid-chs{list-style:none;margin:.6rem 0 0;padding:0;display:grid;gap:.4rem}.vid-ch{display:flex;align-items:center;gap:.5rem;padding:.4rem .6rem;border:1px solid var(--line);border-radius:10px;background:var(--surface-2);min-width:0}.vid-ch.on{border-color:var(--primary);box-shadow:0 0 0 1px var(--primary) inset}.vid-ch.off{opacity:.8}.vid-ch label{display:flex;align-items:center;gap:.6rem;flex:1;min-width:0;cursor:pointer}.vid-ch .nm{display:block;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.vid-ch .sub{display:block;font-size:.76rem;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.vid-ch .tx{min-width:0;flex:1}.vid-ch .btn{flex:none}
.vid-av{position:relative;width:34px;height:34px;border-radius:50%;overflow:hidden;flex:none;background:var(--primary-soft);color:var(--primary-text);display:grid;place-items:center;font-weight:700}.vid-av img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.vid-yt-c{display:flex;flex-wrap:wrap;gap:.6rem .9rem;align-items:flex-end;margin-top:.4rem}.vid-yt-c label{display:grid;gap:.2rem;font-size:.78rem;color:var(--muted);min-width:0}.vid-yt-c select{width:min(100%,300px)}.vid-yt-c label.chk{display:flex;align-items:center;gap:.4rem;min-height:36px;color:var(--text);font-size:.85rem}
.vid-yt-b{display:flex;flex-wrap:wrap;gap:.5rem;margin-top:.8rem}@media(max-width:560px){.vid-yt-b .btn{flex:1}.vid-yt-c label{width:100%}.vid-yt-c select{width:100%}.vid-ch{flex-wrap:wrap}}
.vid-ytp{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,300px),1fr));gap:.6rem}.vid-ytc{border:1px solid var(--line);border-radius:10px;padding:.7rem .8rem;font-size:.85rem;min-width:0;background:var(--surface)}.vid-ytc-h{display:flex;justify-content:space-between;gap:.4rem;align-items:flex-start}.vid-ytc-h b{overflow-wrap:anywhere}.vid-ck{margin:.4rem 0;padding-left:1.2rem}.vid-ck li{margin:.15rem 0}.vid-ytc .inp{flex:1;min-width:0;min-height:34px}
.vid-acts{display:flex;flex-wrap:wrap;gap:.4rem;margin-top:.7rem}
.vid-cols{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,240px),1fr));gap:.8rem;margin-top:.6rem}.vid-box{border:1px solid var(--line);border-radius:12px;padding:.7rem .8rem;background:var(--surface);min-width:0}.vid-box h3{margin:0 0 .5rem;font-size:.9rem}
.vid-row{display:grid;grid-template-columns:minmax(70px,38%) 1fr auto;gap:.4rem;align-items:center;font-size:.8rem;margin:.25rem 0}.vid-row>span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.vid-row i{display:block;height:8px;border-radius:4px;background:var(--primary);min-width:2px}
.vid-cov{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,160px),1fr));gap:.5rem}.vid-cov div{border-radius:10px;padding:.55rem .65rem;font-size:.8rem;border:1px solid var(--line);background:var(--surface)}.vid-cov b{display:block}
.vid-cov .gap{border-color:color-mix(in srgb,var(--gold) 60%,var(--line));background:var(--a-warn-bg);color:var(--a-warn)}.vid-cov .none{border-color:color-mix(in srgb,var(--again) 50%,var(--line));background:var(--a-bad-bg);color:var(--a-bad)}
.vid-svg{width:100%;height:auto;display:block}.vid-svg rect{fill:var(--primary)}.vid-svg text{fill:var(--muted);font-size:10px}
@media (max-width:640px){.vid-dlg .in{grid-template-columns:1fr}.vid-dlg video,.vid-ph{max-height:60vh;width:auto;margin:0 auto}.vx-h .vx-act{width:100%}}`;
  const SECS = [['overview', 'Tổng quan'], ['review', 'Chờ duyệt'], ['library', 'Thư viện'], ['qc', 'Sản xuất & QC'], ['scripts', 'Kịch bản'], ['channels', 'Kênh & phân phối'], ['archive', 'Lưu trữ']];
  // cổng QC (scripts/cine/qc_gate.py) → chữ của chủ + cách sửa
  const GATE = { ai_script_judge: ['Giám khảo AI chấm kịch bản thấp', 'Sửa kịch bản (mục Kịch bản) rồi dựng lại'], ai_vision: ['AI nhìn khung thấy lỗi hình (đứng sai chỗ, khung hỏng)', 'Đổi nền hoặc tổ hợp cảnh rồi dựng lại'], asr_vs_script: ['Giọng đọc không khớp kịch bản', 'Tạo lại giọng đọc rồi dựng lại'], bg_no_text: ['Nền có chữ giả', 'Chọn nền khác (hoặc sửa chữ trên nền) rồi dựng lại'], qa_news: ['Âm thanh / phụ đề chưa đạt chuẩn', 'Mở chi tiết QA của clip, dựng lại'], scene_placement: ['Người dẫn đứng sai vị trí trong cảnh', 'Chọn nền có sàn đứng phù hợp rồi dựng lại'], script_rules: ['Kịch bản sai luật (độ dài, CEFR, câu mở đầu)', 'Sửa kịch bản rồi dựng lại'], speaking_rate: ['Tốc độ nói ngoài 150–165 từ/phút', 'Chỉnh tốc độ giọng rồi dựng lại'] };
  let gen = 0;
  const state = { sec: 'overview', f: {} }, sel = { on: false, ids: new Set() }, yt = { st: null, q: {} };

  function render(box, vapi, L, h) {
    const esc = h.esc, lang = h.lang || (() => 'vi'), my = ++gen, LOC = () => (lang() === 'en' ? 'en-US' : 'vi-VN');
    const V = (vi, vars) => { if (lang() !== 'en' || !Object.prototype.hasOwnProperty.call(EN, vi)) return L(vi, vars); const s = EN[vi]; return vars ? s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? String(vars[k]) : m)) : s; };
    const toast = h.toast || (() => {});
    if (!document.getElementById('vid-css')) { const st = document.createElement('style'); st.id = 'vid-css'; st.textContent = CSS; document.head.appendChild(st); }
    const num = n => Number(n || 0).toLocaleString(LOC());
    const mb = b => (b ? (b / 1048576).toFixed(1) + ' MB' : '–');
    const secs = s => (s ? s.toFixed(1) + ' s' : '–');
    const day = s => (s ? String(s).slice(0, 10) : '');
    const today = new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10); // lịch đăng theo giờ Việt Nam
    const pub = it => (!it.slot ? 'none' : it.slot.date < today ? 'due' : 'sched');
    const PUB = { sched: 'Đã lên lịch', due: 'Đã tới lịch', none: 'Chưa xếp lịch' };
    const FMT = { news: 'Bản tin', scene: 'Cảnh' };
    const pct = (a, b) => (b ? Math.round(a / b * 100) + '%' : '–');
    const scoreOf = it => { const s = ((it && it._v) || {}).score; return s != null ? s : ((it && it.qa) || {}).score; };
    const qcChip = it => { const s = scoreOf(it), pass = ((it && it.qa) || {}).status === 'pass'; return s != null ? `<span class="chip ${s >= 90 ? 'ok' : s >= 75 ? 'warn' : 'bad'}">${esc(V('QC {n}/100', { n: s }))}</span>` : `<span class="chip ${pass ? 'ok' : 'bad'}">${pass ? '✓ ' + esc(V('QA đạt')) : '✗ ' + esc(V('QA chưa đạt'))}</span>`; };
    const hd = (t, d, act = '') => `<div class="vx-h"><div><h2 id="vx-t" tabindex="-1">${esc(V(t))}</h2>${d ? `<p>${esc(V(d))}</p>` : ''}</div>${act ? `<div class="vx-act">${act}</div>` : ''}</div>`;
    const kpi = (l, v, s = '') => `<div class="card kpi"><div class="l">${esc(V(l))}</div><div class="v">${v}</div>${s ? `<div class="s">${s}</div>` : ''}</div>`;
    const emptyBox = (t, d, i = '✓') => `<div class="empty"><span class="em-i" aria-hidden="true">${i}</span><b>${esc(V(t))}</b>${d ? esc(V(d)) : ''}</div>`;
    const skel = () => `<div class="vx-sk" aria-busy="true" aria-label="${esc(V('Đang tải…'))}"><span class="sk sk-h"></span><div class="sk-tiles">${'<span class="sk sk-tile"></span>'.repeat(4)}</div><span class="sk sk-block"></span></div>`;

    // ---- dữ liệu dùng chung (tải lười, mỗi lần mở tab 1 lần) ----
    const C = {}, once = (k, fn) => C[k] || (C[k] = Promise.resolve().then(fn).catch(e => { delete C[k]; throw e; }));
    const getList = () => once('list', () => vapi('list'));
    const getQc = () => once('qc', () => vapi('qc').catch(() => ({ days: [] })));
    const getYt = () => (h.yapi ? once('yt', async () => { const [st, q] = await Promise.all([h.yapi('status'), h.yapi('queue').then(r => Object.fromEntries((r.rows || []).map(x => [x.clip, x]))).catch(() => ({}))]); yt.st = st; yt.q = q; return st; }).catch(() => null) : Promise.resolve(null));
    const legacyCounts = items => { const c = { pending: 0, approved: 0, live: 0, fail: 0, archive: 0 }; items.forEach(it => { const st = (yt.q[it.id] || {}).status; c[it.rejected || it.paused ? 'archive' : st && /done|detected/.test(st) ? 'live' : st ? 'approved' : it.qa && it.qa.status === 'pass' ? 'pending' : 'fail']++; }); return c; };
    const getCounts = () => once('cnt', () => (h.capi ? h.capi('query', { filter: {}, cursor: 0, limit: 1 }).then(r => r.counts || {}) : Promise.all([getList(), getYt()]).then(([d]) => legacyCounts(d.items || []))));
    const legacyPending = (items) => items.filter(it => it.qa && it.qa.status === 'pass' && !it.rejected && !it.paused && !yt.q[it.id]);

    // ---- khung: thanh mục con dính trên cùng + vùng nội dung ----
    const fromHash = () => { const m = String(location.hash).match(/^#video\/([a-z]+)/); return m && SECS.some(s => s[0] === m[1]) ? m[1] : null; };
    state.sec = fromHash() || (/[?&]yt=/.test(location.search) ? 'channels' : state.sec); // về từ Google OAuth → mục Kênh
    box.innerHTML = `<div class="vx"><nav class="vx-nav" aria-label="${esc(V('Các mục video'))}">${SECS.map(([k, t]) => `<a class="vx-tab" href="#video/${k}" data-sec="${k}">${esc(V(t))}<span class="vx-n" data-n="${k}" hidden></span></a>`).join('')}</nav><div class="vx-body" id="vx-body" tabindex="-1"></div></div>`;
    const nav = box.querySelector('.vx-nav'), body = box.querySelector('#vx-body');
    nav.addEventListener('click', e => { const a = e.target.closest('[data-sec]'); if (!a || e.button || e.metaKey || e.ctrlKey || e.shiftKey) return; e.preventDefault(); go(a.dataset.sec, true); });
    body.addEventListener('click', e => { const g = e.target.closest('[data-go2]'); if (!g) return; e.preventDefault(); go(g.dataset.go2, true, g.dataset.qs || ''); });
    const setN = (k, n, cls) => { const b = nav.querySelector(`[data-n="${k}"]`); if (!b) return; b.hidden = !n; b.textContent = n ? num(n) : ''; b.className = 'vx-n' + (cls ? ' ' + cls : ''); };
    getCounts().then(c => { if (my === gen) { setN('review', c.pending); setN('qc', c.fail, 'bad'); } }).catch(() => {});
    let tok = 0;
    function go(sec, user, qs) {
      state.sec = sec; const t = ++tok, alive = () => t === tok && my === gen;
      nav.querySelectorAll('[data-sec]').forEach(a => { if (a.dataset.sec === sec) { a.setAttribute('aria-current', 'page'); if (user && a.scrollIntoView) a.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } else a.removeAttribute('aria-current'); });
      try { history.replaceState(null, '', location.pathname + (qs === true ? location.search : qs ? '?' + qs : '') + '#video/' + sec); } catch (e) { /* bỏ qua */ }
      if (user) { const y = box.getBoundingClientRect().top + (window.scrollY || 0) - 70; if ((window.scrollY || 0) > y) window.scrollTo(0, Math.max(0, y)); }
      body.innerHTML = skel();
      const fn = { overview, review, library, qc: qcSec, scripts: scriptSec, channels, archive }[sec] || overview;
      Promise.resolve().then(() => fn(body, alive)).then(() => { if (alive() && user) { const hh = body.querySelector('#vx-t'); if (hh) hh.focus({ preventScroll: true }); } })
        .catch(e => { if (!alive()) return; body.innerHTML = `<div class="err-box" role="alert"><span>${esc(V('Không tải được: {e}', { e: e.message || e.code || 'error' }))}</span><button class="btn sm" type="button" data-vx-retry>${esc(V('Thử lại'))}</button></div>`; body.querySelector('[data-vx-retry]').onclick = () => { delete C.list; delete C.cnt; go(sec, true, true); }; });
    }
    go(state.sec, false, true);

    // ---- Tổng quan: "Cần anh làm" + KPI + biểu đồ + phân tích chi tiết ----
    async function overview(el, alive) {
      const [dR, cR, sR, qR] = await Promise.allSettled([getList(), getCounts(), getYt(), getQc()]);
      if (!alive()) return; if (dR.status === 'rejected') throw dR.reason;
      const data = dR.value, items = Array.isArray(data.items) ? data.items : [], c = cR.value || legacyCounts(items), s = sR.value, qd = (qR.value || {}).days || [];
      const total = Object.values(c).reduce((a, b) => a + (+b || 0), 0) || items.length, passN = items.filter(x => x.qa && x.qa.status === 'pass').length;
      const qcFail = qd.reduce((a, d) => a + (d.items || []).filter(x => !x.ok).length, 0), todo = [];
      if (c.pending) todo.push(['info', V('{n} video đạt QA đang chờ anh duyệt', { n: num(c.pending) }), V('Duyệt ngay'), 'review']);
      if (s) {
        const on = s.channel && s.channel.status === 'ok', m = s.manual || {}, lost = (s.channels || []).filter(x => x.status && x.status !== 'ok').length, iss = m.issues || ((s.sync || {}).issues || []).length;
        if (!on) todo.push(['warn', V('YouTube chưa kết nối – chưa đăng được video'), V('Kết nối'), 'channels']);
        else if (s.scope && s.scope.ok === false) todo.push(['warn', V('Quyền YouTube chưa đủ – cần kết nối lại'), V('Mở'), 'channels']);
        if (on && (s.settings || {}).mode !== 'api' && m.ready) todo.push(['info', V('{n} gói đăng sẵn sàng – tải lên YouTube Studio', { n: num(m.ready) }), V('Mở gói đăng'), 'channels']);
        if (on && iss) todo.push(['bad', V('{n} video trên YouTube cần xử lý', { n: num(iss) }), V('Xem'), 'channels']);
        if (lost) todo.push(['warn', V('{n} kênh mất quyền – kết nối lại', { n: num(lost) }), V('Mở'), 'channels']);
      }
      if (qcFail) todo.push(['bad', V('{n} clip trượt QC trong 7 ngày – xem lý do và cách sửa', { n: num(qcFail) }), V('Xem lỗi'), 'qc']);
      const cov = (data.coverage && data.coverage.areas) || {}, byArea = {}; items.forEach(x => { if (x.area) byArea[x.area] = (byArea[x.area] || 0) + 1; });
      const zero = Object.keys(cov).filter(k => !byArea[k]).length; if (zero) todo.push(['warn', V('{n} khu vực web chưa có video nào', { n: zero }), V('Xem độ phủ'), 'scripts']);
      try { if (JSON.parse(localStorage.getItem('lk.cl.job') || 'null')) todo.push(['info', V('Có tác vụ hàng loạt dang dở'), V('Tiếp tục'), 'library']); } catch (e) { /* bỏ qua */ }
      if (!data.media) todo.push(['warn', V('Kho Drive chưa đọc được – bìa và video chưa xem được (docs/SHORTS-ACCESS.md).'), '', '']);
      const ord = { bad: 0, warn: 1, info: 2 }; todo.sort((a, b) => ord[a[0]] - ord[b[0]]);
      const LV = { bad: ['bad', 'Gấp'], warn: ['warn', 'Cần xử lý'], info: ['info', 'Việc mới'] }; let first = true;
      const todoHtml = todo.map(([lv, t, b, g]) => { const p = b && first; if (b) first = false; return `<li><span class="chip ${LV[lv][0]}">${esc(V(LV[lv][1]))}</span><span class="tx">${esc(t)}</span>${b ? `<button class="btn sm${p ? ' primary' : ''}" type="button" data-go2="${g}">${esc(b)}</button>` : ''}</li>`; }).join('');
      // biểu đồ dựng mỗi ngày (30 ngày có dữ liệu)
      const perDay = {}; items.forEach(x => { const dd = day(x.created); if (dd) perDay[dd] = (perDay[dd] || 0) + 1; });
      const days = Object.keys(perDay).sort().slice(-30), mx = Math.max(1, ...days.map(k => perDay[k])), W = Math.max(days.length, 1) * 22 + 10;
      const svg = days.length ? `<svg class="vid-svg" viewBox="0 0 ${W} 130" role="img" aria-label="${esc(V('Số video dựng mỗi ngày'))}">${days.map((k, i) => { const hgt = Math.round(perDay[k] / mx * 90); return `<g><title>${esc(V('ngày {d}: {n}', { d: k, n: perDay[k] }))}</title><rect x="${5 + i * 22}" y="${105 - hgt}" width="16" height="${hgt}" rx="3"></rect><text x="${13 + i * 22}" y="${100 - hgt}" text-anchor="middle">${perDay[k]}</text><text x="${13 + i * 22}" y="122" text-anchor="middle">${esc(k.slice(5))}</text></g>`; }).join('')}</svg>` : `<p class="muted small">${esc(V('Không có dữ liệu'))}</p>`;
      const posts = ((data.calendar || {}).posts || []), up = posts.filter(p => p.date >= today), past = posts.length - up.length;
      el.innerHTML = hd('Tổng quan', 'Việc cần làm hôm nay và số liệu chính của kho video.') +
        `<section class="card" aria-labelledby="vx-todo-h"><div class="card-h"><h3 id="vx-todo-h">${esc(V('Cần anh làm'))}</h3><span class="chip ${todo.length ? 'warn' : 'ok'}">${esc(todo.length ? V('{n} việc', { n: todo.length }) : V('Đã xong'))}</span></div>
        ${todo.length ? `<ul class="vx-list">${todoHtml}</ul>` : emptyBox('Không có việc nào cần làm', 'Mọi video đã được xử lý.')}</section>
        <div class="kpis">${kpi('Tổng video', num(total))}${kpi('Chờ duyệt', num(c.pending))}${kpi('Đã đăng', num(c.live))}${kpi('Tỉ lệ đạt QA', items.length ? Math.round(passN / items.length * 100) + '%' : '–')}${kpi('Lỗi QA', num(c.fail))}</div>
        <div class="vx-2"><section class="card"><h3>${esc(V('Video dựng mỗi ngày (30 ngày)'))}</h3>${svg}</section>
        <section class="card"><div class="card-h"><h3>${esc(V('Lịch đăng sắp tới'))}</h3></div><p class="small muted">${esc(V('{a} bài đã qua lịch · {b} bài sắp tới · {c} video chưa xếp lịch', { a: past, b: up.length, c: items.filter(x => !x.slot).length }))}</p>
        ${up.length ? up.slice(0, 6).map(p => `<div class="vid-row"><span>${esc(p.date + ' ' + p.time)}</span><span class="small muted">${esc(p.scene || '')}</span><b class="small">${esc(p.template || '')}</b></div>`).join('') : `<p class="muted small">${esc(V('Chưa có bài nào sắp đăng.'))}</p>`}</section></div>
        <details class="card vx-more"><summary>${esc(V('Phân tích chi tiết'))}</summary><div id="vx-stats"></div></details>`;
      const det = el.querySelector('.vx-more'); det.addEventListener('toggle', () => { if (det.open && !det.dataset.done) { det.dataset.done = '1'; stats(el.querySelector('#vx-stats'), data, items); } });
    }
    function stats(el, data, items) { // phân tích chi tiết (tải lười khi mở)
      const count = k => { const m = {}; items.forEach(x => { const v = x[k] || '–'; m[v] = (m[v] || 0) + 1; }); return Object.entries(m).sort((a, b) => b[1] - a[1]); };
      const bars = (title, rows, lab = x => x) => { const mx = Math.max(1, ...rows.map(r => r[1])); return `<div class="vid-box"><h3>${esc(V(title))}</h3>${rows.length ? rows.map(([k, n]) => `<div class="vid-row"><span title="${esc(lab(k))}">${esc(lab(k))}</span><i style="width:${Math.round(n / mx * 100)}%"></i><b>${num(n)}</b></div>`).join('') : `<p class="muted small">${esc(V('Không có dữ liệu'))}</p>`}</div>`; };
      const durs = items.map(x => x.duration).filter(Boolean), cr = data.credits, banks = cr && cr.banks ? Object.entries(cr.banks).map(([k, b]) => [k, b.total, b]) : [], bmx = Math.max(1, ...banks.map(b => b[1]));
      el.innerHTML = `<div class="kpis" style="margin-top:.6rem">${kpi('Thời lượng TB', durs.length ? secs(durs.reduce((a, b) => a + b, 0) / durs.length) : '–')}${kpi('Tổng dung lượng', mb(items.reduce((a, x) => a + (x.bytes || 0), 0)))}${kpi('Credit đã dùng', cr ? num(cr.total) : '–')}</div>
        <div class="vid-cols">${bars('Theo định dạng', count('format'), v => V(FMT[v] || v))}${bars('Theo cảnh', count('scene'))}${bars('Theo mẫu', count('template'))}${bars('Theo lĩnh vực', count('area'))}${bars('Theo CEFR', count('cefr'))}
        <div class="vid-box"><h3>${esc(V('Credit theo kho cảnh'))}</h3>${banks.length ? banks.map(([k, n, b]) => `<div class="vid-row"><span>${esc(k)}</span><i style="width:${Math.round(n / bmx * 100)}%"></i><b>${num(n)}</b></div><p class="tiny muted" style="margin:0 0 .3rem">${esc(V('ảnh {a} · video {b}', { a: num(b.img_cr), b: num(b.video_cr) }))}</p>`).join('') : `<p class="muted small">${esc(V('Chưa có tóm tắt credit (chạy scripts/cine/credits_summary.py).'))}</p>`}</div></div>`;
    }

    // ---- Chờ duyệt: hàng đợi duyệt/loại từng clip, xem thử + điểm QC ----
    async function review(el, alive) {
      const R = { rows: [], next: 0, sort: 'qa:desc' };
      el.innerHTML = hd('Chờ duyệt', 'Video đã qua QA tự động. Xem thử, rồi Duyệt (tạo gói đăng) hoặc Loại.', h.capi ? `<button class="btn sm ghost" type="button" data-go2="library" data-qs="section=pending">${esc(V('Chọn nhiều trong Thư viện'))}</button>` : '') +
        `<div class="vx-tools"><span class="small muted" id="vx-rn" aria-live="polite"></span><span class="sp"></span><label>${esc(V('Sắp xếp'))} <select id="vx-rs"><option value="qa:desc">${esc(V('Điểm QC cao trước'))}</option><option value="qa:asc">${esc(V('Điểm QC thấp trước'))}</option><option value="created:desc">${esc(V('Mới nhất'))}</option></select></label></div>
        <ul class="vx-q" id="vx-q"></ul><div class="vx-tools" id="vx-more" style="justify-content:center;margin-top:.7rem"></div>`;
      const list = el.querySelector('#vx-q'), more = el.querySelector('#vx-more'), n = el.querySelector('#vx-rn');
      let data = null, all = null;
      const rowHtml = it => { const c = it.cover_url || ((data || {}).covers || {})[it.cover], t = it.title || it.point || it.id, sub = [it.scene, it.template, it.cefr, it.duration ? secs(it.duration) : ''].filter(Boolean).join(' · ');
        return `<li class="vx-r" data-id="${esc(it.id)}"><button class="vx-th" type="button" data-open aria-label="${esc(V('Xem thử {t}', { t }))}">${c ? `<img loading="lazy" decoding="async" alt="" width="54" height="96" src="${esc(c)}">` : '🎬'}</button>
          <div class="vx-rm"><b title="${esc(t)}">${esc(t)}</b><span class="m">${esc(sub)}</span><span class="vx-chips">${qcChip(it)}${it.slot ? `<span class="chip muted">${esc(V('Lịch {d}', { d: it.slot.date }))}</span>` : ''}</span></div>
          <div class="vx-ra"><button class="btn sm" type="button" data-open>${esc(V('Xem thử'))}</button>${h.capi ? `<button class="btn sm ghost danger" type="button" data-rej>${esc(V('Loại…'))}</button>` : ''}${h.capi || h.yapi ? `<button class="btn sm primary" type="button" data-ok>${esc(V('Duyệt'))}</button>` : ''}</div></li>`; };
      const paint = (total) => {
        n.textContent = V('{n} video chờ duyệt', { n: num(total) });
        if (!R.rows.length) { list.innerHTML = ''; more.innerHTML = emptyBox('Không còn video chờ duyệt', 'Video mới đạt QA sẽ hiện ở đây.'); return; }
        list.innerHTML = R.rows.map(rowHtml).join('');
        more.innerHTML = R.next != null ? `<button class="btn sm" type="button" id="vx-mo">${esc(V('Tải thêm'))}</button>` : '';
        const mo = more.querySelector('#vx-mo'); if (mo) mo.onclick = () => { mo.disabled = true; load(false); };
      };
      async function load(reset) {
        const [s, d] = R.sort.split(':');
        if (h.capi) {
          const r = await h.capi('query', { filter: { section: 'pending', sort: s, dir: d }, cursor: reset ? 0 : R.next, limit: 24 }); if (!alive()) return;
          R.rows = reset ? r.rows : R.rows.concat(r.rows); R.next = r.next; R.total = r.total; paint(r.total); return;
        }
        if (!all) { [data] = await Promise.all([getList(), getYt()]); all = legacyPending(data.items || []); } if (!alive()) return;
        const key = s === 'qa' ? x => scoreOf(x) || 0 : x => x.created || '', sorted = all.slice().sort((a, b) => (key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0) * (d === 'asc' ? 1 : -1));
        const k = reset ? 24 : R.rows.length + 24; R.rows = sorted.slice(0, k); R.next = k < sorted.length ? k : null; R.total = sorted.length; paint(sorted.length);
      }
      el.querySelector('#vx-rs').onchange = e => { R.sort = e.target.value; load(true).catch(x => toast(V('Không tải được: {e}', { e: x.message }))); };
      const done = (li, msg) => { li.classList.add('done'); toast(msg); R.rows = R.rows.filter(x => x.id !== li.dataset.id); R.total = Math.max(0, (R.total || 1) - 1); setTimeout(() => { if (alive()) paint(R.total); }, 350); delete C.cnt; getCounts().then(c => setN('review', c.pending)).catch(() => {}); };
      list.addEventListener('click', async e => {
        const li = e.target.closest('.vx-r'); if (!li) return; const it = R.rows.find(x => x.id === li.dataset.id); if (!it) return;
        if (e.target.closest('[data-open]')) return openClip(it);
        const okB = e.target.closest('[data-ok]'), rejB = e.target.closest('[data-rej]'); if (!okB && !rejB) return;
        if (!h.capi) { if (okB) approve([it.id]).then(ok => { if (ok) done(li, V('Đã duyệt – gói đăng sẽ sẵn sàng trong vài phút.')); }); return; }
        const params = { offset: 0, total: 1 };
        if (rejB) { const why = (prompt(V('Lý do loại')) || '').trim().slice(0, 200); if (!why) return; params.reason = why; }
        (okB || rejB).disabled = true;
        try { const r = await h.capi('bulk', { action: okB ? 'approve' : 'reject', ids: [it.id], params }), x = (r.results || [])[0] || {};
          if (x.ok === false) { (okB || rejB).disabled = false; return toast(V('Không thực hiện được: {e}', { e: x.why || '?' })); }
          done(li, okB ? V('Đã duyệt – gói đăng sẽ sẵn sàng trong vài phút.') : V('Đã loại video.'));
        } catch (er) { (okB || rejB).disabled = false; toast(er.code === 'reauth' ? V('Thao tác nhạy cảm: đăng xuất rồi đăng nhập lại, sau đó thử lại.') : V('Không thực hiện được: {e}', { e: er.code || er.message })); }
      });
      await load(true);
    }
    async function openClip(it) { const d = await getList().catch(() => ({ media: !!it.cover_url, covers: {} })); return open(it, { ...d, media: d.media || !!it.cover_url, covers: { ...(d.covers || {}), [it.cover]: it.cover_url || (d.covers || {})[it.cover] } }); }

    // ---- Thư viện / Lưu trữ: lưới ảo hóa (js/admin-clips.js, máy chủ lọc/phân trang) – dự phòng: lưới đơn giản từ manifest ----
    async function library(el, alive) {
      el.innerHTML = hd('Thư viện', 'Mọi video: tìm, lọc, chọn nhiều và thao tác hàng loạt.') + '<div id="vx-lib"></div>';
      const host = el.querySelector('#vx-lib');
      if (h.capi && window.AdminClips && AdminClips.mount) { AdminClips.mount(host, { capi: h.capi, yapi: h.yapi, L, lang, esc, toast, open: openClip, sections: ['', 'pending', 'approved', 'live', 'fail'], section: '' }); return; }
      const data = await getList(); if (alive()) grid(host, data, (data.items || []).filter(x => !x.rejected && !x.paused));
    }
    async function archive(el, alive) {
      el.innerHTML = hd('Lưu trữ', 'Clip bị loại hoặc tạm dừng. Chọn clip rồi Khôi phục / Bỏ tạm dừng ở thanh thao tác.', `<button class="btn sm" type="button" data-go="drive">${esc(V('Kho Drive (sao lưu)'))}</button>`) + '<div id="vx-lib"></div>';
      const host = el.querySelector('#vx-lib');
      if (h.capi && window.AdminClips && AdminClips.mount) { AdminClips.mount(host, { capi: h.capi, yapi: h.yapi, L, lang, esc, toast, open: openClip, sections: ['archive'], section: 'archive' }); return; }
      const data = await getList(); if (!alive()) return; const arc = (data.items || []).filter(x => x.rejected || x.paused);
      if (!arc.length) { host.innerHTML = `<div class="card">${emptyBox('Không có clip nào trong lưu trữ.', '', '🗄')}</div>`; return; } grid(host, data, arc);
    }
    function grid(body, data, items) { // lưới đơn giản (khi chưa có /api/admin-clips)
      const covers = data.covers || {}, f = state.f;
      const uniq = k => [...new Set(items.map(x => x[k]).filter(Boolean))].sort();
      const NAMES = { format: 'Định dạng', scene: 'Cảnh/chủ đề', template: 'Mẫu', cefr: 'CEFR', status: 'Trạng thái' };
      const opt = (k, vals, lab = x => x) => `<select data-f="${k}" aria-label="${esc(V(NAMES[k]))}"><option value="">${esc(V(NAMES[k]))}: ${esc(V('Tất cả'))}</option>${vals.map(v => `<option value="${esc(v)}"${f[k] === v ? ' selected' : ''}>${esc(lab(v))}</option>`).join('')}</select>`;
      body.innerHTML = `${data.media ? '' : `<div class="drv-banner warn" role="note">${esc(V('⚠️ Kho Drive chưa đọc được: đang dùng manifest gói sẵn (cập nhật {d}); bìa và video chưa xem được. Xem docs/SHORTS-ACCESS.md.', { d: day(data.updated) || '–' }))}</div>`}
        <div class="vid-bar"><input type="search" id="vid-q" placeholder="${esc(V('Tìm điểm học, tiêu đề, mã…'))}" aria-label="${esc(V('Tìm kiếm'))}" value="${esc(f.q || '')}">
        ${opt('format', uniq('format'), v => V(FMT[v] || v))}${opt('scene', uniq('scene'))}${opt('template', uniq('template'))}${opt('cefr', uniq('cefr'))}
        ${opt('status', ['pass', 'fail', 'sched', 'due', 'none'], v => V({ pass: 'QA đạt', fail: 'QA chưa đạt', ...PUB }[v]))}
        <input type="date" data-f="from" aria-label="${esc(V('Từ ngày'))}" title="${esc(V('Từ ngày'))}" value="${esc(f.from || '')}"><input type="date" data-f="to" aria-label="${esc(V('Đến ngày'))}" title="${esc(V('Đến ngày'))}" value="${esc(f.to || '')}">
        <button class="btn ghost sm" type="button" id="vid-clr">${esc(V('Xóa lọc'))}</button>${h.yapi ? `<button class="btn ghost sm" type="button" id="vid-sel" aria-pressed="${sel.on}">☑ ${esc(V('Chọn nhiều'))}</button><button class="btn primary sm" type="button" id="vid-ap" hidden></button>` : ''}<span class="small muted" id="vid-n" aria-live="polite"></span></div><div class="vid-grid" id="vid-grid"></div>`;
      const selBar = () => { const b = body.querySelector('#vid-ap'); if (!b) return; b.hidden = !sel.on || !sel.ids.size; b.textContent = '▶ ' + V('Duyệt & lên YouTube ({n})', { n: sel.ids.size }); };
      if (h.yapi) {
        body.querySelector('#vid-sel').onclick = () => { sel.on = !sel.on; if (!sel.on) sel.ids.clear(); body.querySelector('#vid-sel').setAttribute('aria-pressed', String(sel.on)); paint(); selBar(); };
        body.querySelector('#vid-ap').onclick = () => approve([...sel.ids]).then(ok => { if (ok) { sel.ids.clear(); sel.on = false; grid(body, data, items); } });
      }
      const gridEl = body.querySelector('#vid-grid');
      const paint = () => {
        const q = (f.q || '').trim().toLowerCase();
        const list = items.filter(it => (!f.format || it.format === f.format) && (!f.scene || it.scene === f.scene) && (!f.template || it.template === f.template) && (!f.cefr || it.cefr === f.cefr)
          && (!f.status || (f.status === 'pass' || f.status === 'fail' ? (it.qa && it.qa.status) === f.status : pub(it) === f.status))
          && (!f.from || day(it.created) >= f.from) && (!f.to || day(it.created) <= f.to)
          && (!q || [it.point, it.title, it.id, it.lesson, it.area].some(x => String(x || '').toLowerCase().includes(q))));
        body.querySelector('#vid-n').textContent = V('{n} video', { n: num(list.length) });
        gridEl.innerHTML = list.length ? list.map(it => { const c = covers[it.cover], bad = !it.qa || it.qa.status !== 'pass';
          return `<button class="vid-card" type="button" data-id="${esc(it.id)}" aria-label="${esc(V('Mở video {t}', { t: it.title || it.id }))}"><div class="vid-th">${c ? `<img loading="lazy" decoding="async" alt="" src="${esc(c)}">` : `<span>🎬<br>${esc(V('Chưa có'))}</span>`}
            <span class="chip ${bad ? 'bad' : 'ok'}">${bad ? '✗' : '✓'} QA</span>${it.duration ? `<span class="vid-dur">${esc(secs(it.duration))}</span>` : ''}</div>
            <div class="vid-meta"><b>${esc(it.title || it.point || it.id)}</b><span>${esc([it.scene, it.template, it.cefr].filter(Boolean).join(' · '))}</span><span>${esc(it.rejected ? '⛔ ' + V('Bị loại') + ': ' + it.rejected : it.paused ? '⏸ ' + V('Tạm dừng') + ': ' + it.paused : it.slot ? it.slot.date + ' ' + it.slot.time : V(PUB.none))}</span></div></button>`; }).join('') : `<div class="card" style="grid-column:1/-1">${emptyBox('Không có video khớp bộ lọc.', '', '⌕')}</div>`;
        gridEl.querySelectorAll('.vid-card').forEach(b => {
          if (sel.on) b.setAttribute('aria-pressed', String(sel.ids.has(b.dataset.id)));
          b.onclick = () => { if (!sel.on) return open(items.find(x => x.id === b.dataset.id), data); sel.ids.has(b.dataset.id) ? sel.ids.delete(b.dataset.id) : sel.ids.add(b.dataset.id); b.setAttribute('aria-pressed', String(sel.ids.has(b.dataset.id))); selBar(); };
        });
      };
      body.querySelector('#vid-q').oninput = e => { f.q = e.target.value; paint(); };
      body.querySelectorAll('[data-f]').forEach(s => { s.onchange = () => { f[s.dataset.f] = s.value; paint(); }; });
      body.querySelector('#vid-clr').onclick = () => { state.f = {}; grid(body, data, items); };
      paint();
    }

    // ---- Sản xuất & QC: KPI 7 ngày, lỗi theo cổng (lý do + cách sửa), chi tiết từng ngày ----
    async function qcSec(el, alive) {
      const [r, cnt] = await Promise.all([getQc(), getCounts().catch(() => ({}))]); if (!alive()) return;
      const days = r.days || [], all = days.flatMap(d => d.items || []), okN = all.filter(x => x.ok).length, failN = all.length - okN;
      const sc = all.map(x => +x.score).filter(Number.isFinite), avg = sc.length ? Math.round(sc.reduce((a, b) => a + b, 0) / sc.length) : null;
      const G = {}; all.filter(x => !x.ok).forEach(x => (x.failed && x.failed.length ? x.failed : ['?']).forEach(g => { (G[g] = G[g] || { n: 0, ids: [] }).n++; if (G[g].ids.length < 4) G[g].ids.push(x.id); }));
      const gl = g => (GATE[g] ? V(GATE[g][0]) : g === '?' ? V('Kết quả') : g), gates = Object.entries(G).sort((a, b) => b[1].n - a[1].n);
      const act = `<button class="btn sm" type="button" data-go="studio">${esc(V('Mở dây chuyền (Video Studio)'))}</button>`;
      if (!days.length) { el.innerHTML = hd('Sản xuất & QC', 'Mọi clip đi qua cổng QC tự động (7 ngày gần nhất). Clip trượt không được đăng.', act) + `<div class="card">${emptyBox('Chưa có báo cáo QC – cine-render ghi shorts/qc/<ngày>.json sau mỗi lần dựng.', '', '⚙')}</div>`; return; }
      el.innerHTML = hd('Sản xuất & QC', 'Mọi clip đi qua cổng QC tự động (7 ngày gần nhất). Clip trượt không được đăng.', act) +
        `<div class="kpis">${kpi('Clip đã chấm (7 ngày)', num(all.length))}${kpi('Đạt', num(okN))}${kpi('Trượt', num(failN))}${kpi('Tỉ lệ đạt', pct(okN, all.length))}${kpi('Điểm TB', avg == null ? '–' : avg + '<small>/100</small>')}</div>
        <section class="card"><div class="card-h"><h3>${esc(V('Lỗi cần xử lý'))}</h3>${cnt.fail ? `<button class="btn sm" type="button" data-go2="library" data-qs="section=fail">${esc(V('Xem {n} clip lỗi QA trong Thư viện', { n: num(cnt.fail) }))}</button>` : ''}</div>
        ${gates.length ? `<ul class="vx-list vx-gate">${gates.map(([g, x]) => `<li><span class="chip bad">${esc(V('{n} clip', { n: num(x.n) }))}</span><span class="tx"><b>${esc(gl(g))}</b><span>${esc(V('Cách sửa'))}: ${esc(GATE[g] ? V(GATE[g][1]) : V('Xem tiêu chí ở docs/VIDEO-QC.md'))}</span><span class="tiny">${esc(x.ids.join(', '))}${x.n > x.ids.length ? '…' : ''}</span></span></li>`).join('')}</ul>` : emptyBox('Không có clip trượt trong 7 ngày.', '')}</section>
        <section class="card"><h3>${esc(V('Theo ngày'))}</h3>${days.map((d, i) => { const it = d.items || [], ok = it.filter(x => x.ok).length;
          return `<details class="vx-day"${i === 0 ? ' open' : ''}><summary><span>${esc(d.date)}</span><span class="vx-bar" aria-hidden="true"><i style="width:${it.length ? Math.round(ok / it.length * 100) : 0}%"></i></span><span class="chip ${ok === it.length ? 'ok' : 'warn'}">${esc(V('{a}/{b} đạt', { a: ok, b: it.length }))}</span></summary>
          <div class="tbl-x"><table class="tbl"><thead><tr><th scope="col">Clip</th><th scope="col">${esc(V('Điểm'))}</th><th scope="col">${esc(V('Kết quả'))}</th><th scope="col">${esc(V('Cổng trượt'))}</th><th scope="col">${esc(V('Nền'))}</th><th scope="col">Run</th></tr></thead><tbody>${it.map(x => `<tr><td>${esc(x.id)}</td><td>${esc(String(x.score ?? '–'))}</td><td>${x.ok ? `<span class="chip ok">✓ ${esc(V('Đạt'))}</span>` : `<span class="chip bad">✗ ${esc(V('Trượt'))}</span>`}</td><td>${esc((x.failed || []).map(gl).join(', ') || '–')}</td><td>${esc(x.bg || '')}</td><td>${esc(String(x.run || ''))}</td></tr>`).join('')}</tbody></table></div></details>`; }).join('')}</section>`;
    }

    // ---- Kịch bản: kho kịch bản (chỉ chữ) + độ phủ video theo khu vực web ----
    async function scriptSec(el, alive) {
      const [r, dR] = await Promise.all([fetch('/data/script-bank.json', { cache: 'no-cache' }).then(x => (x.ok ? x.json() : null)).catch(() => null), getList().catch(() => null)]); if (!alive()) return;
      const rows = o => Object.entries(o || {}).sort((a, b) => b[1] - a[1]);
      const bars = (title, list) => { const mx = Math.max(1, ...list.map(x => x[1])); return `<div class="vid-box"><h3>${esc(V(title))}</h3>${list.length ? list.map(([k, n]) => `<div class="vid-row"><span title="${esc(k)}">${esc(k)}</span><i style="width:${Math.round(n / mx * 100)}%"></i><b>${num(n)}</b></div>`).join('') : `<p class="muted small">${esc(V('Không có dữ liệu'))}</p>`}</div>`; };
      const items = (dR && dR.items) || [], cov = (dR && dR.coverage && dR.coverage.areas) || {}, target = (dR && dR.coverage && dR.coverage.target_per_area) || 5, byArea = {}; items.forEach(x => { if (x.area) byArea[x.area] = (byArea[x.area] || 0) + 1; });
      const covHtml = Object.entries(cov).map(([k, a]) => { const n = byArea[k] || 0, gap = Math.max(0, target - n); return `<div class="${n === 0 ? 'none' : gap ? 'gap' : ''}"><b>${esc(a.label || k)}</b>${num(n)}/${target} · ${esc(n === 0 ? V('chưa có') : gap ? V('thiếu {n}', { n: gap }) : V('đủ'))}</div>`; }).join('');
      const days = ((r && r.days) || []).slice().reverse();
      el.innerHTML = hd('Kịch bản', 'Kho kịch bản (chỉ chữ) và độ phủ video theo khu vực web.') +
        (r ? `<div class="kpis">${kpi('Trong kho', num(r.bank))}${kpi('Cần xem lại', num(r.review))}${kpi('Chờ chấm', num(r.pending))}${kpi('Tỉ lệ đạt', Math.round((r.pass_rate || 0) * 100) + '%')}${kpi('Còn lại', num(r.left), esc(V('Kế hoạch')) + ' ' + num(r.planned))}${kpi('Điểm giám khảo TB', esc(String(r.avg_score || '–')))}</div>
          <p class="small muted">${esc(V('Cập nhật {d} · chỉ chữ, không dựng, không đăng (docs/VIDEO-SCALE-PLAN.md §16).', { d: day(r.updated) || '–' }))}</p>` : `<div class="card">${emptyBox('Chưa có kho kịch bản – CI script-bank.yml ghi /data/script-bank.json sau mỗi lượt.', '', '✎')}</div>`) +
        `<section class="card"><div class="card-h"><h3>${esc(V('Độ phủ theo khu vực web'))}</h3><span class="small muted">${esc(V('Mục tiêu {n}/khu vực · ô cam = còn thiếu, ô đỏ = chưa có video', { n: target }))}</span></div><div class="vid-cov">${covHtml || `<p class="muted small">${esc(V('Không có dữ liệu'))}</p>`}</div></section>` +
        (r ? `<div class="vid-cols">${bars('Theo loại bài', rows(r.by_type))}${bars('Theo CEFR', rows(r.by_cefr))}${bars('Theo độ khó', rows(r.by_diff))}${bars('Theo chủ đề', rows(r.by_topic))}${bars('Lý do xem lại', rows(r.review_reasons))}</div>
        ${days.length ? `<details class="card" style="margin-top:.9rem"><summary>${esc(V('Theo ngày'))}</summary><div class="tbl-x"><table class="tbl"><thead><tr><th scope="col">${esc(V('Ngày'))}</th><th scope="col">${esc(V('Lần gọi'))}</th><th scope="col">${esc(V('Sinh'))}</th><th scope="col">${esc(V('Trượt QC'))}</th><th scope="col">${esc(V('Trùng'))}</th><th scope="col">${esc(V('Đạt'))}</th><th scope="col">${esc(V('Điểm thấp'))}</th><th scope="col">Neuron</th></tr></thead><tbody>${days.map(d => `<tr><td>${esc(d.date)}</td><td>${num(d.gen_calls)}+${num(d.judge_calls)}</td><td>${num(d.generated)}</td><td>${num(d.qc_fail)}</td><td>${num(d.dup)}</td><td>${num(d.passed)}</td><td>${num(d.low)}</td><td>${num(d.neurons)}</td></tr>`).join('')}</tbody></table></div></details>` : ''}` : '');
    }

    // ---- Kênh & phân phối: YouTube (kết nối, kênh, đồng bộ; cài đặt ở "Nâng cao"), gói đăng tay, hiệu quả trên web ----
    async function channels(el, alive) {
      el.innerHTML = hd('Kênh & phân phối', 'Kết nối YouTube, gói đăng tay và hiệu quả trên web. Luật định tuyến theo kênh ở tab Kênh & phân phối.', `<a class="btn sm" href="#dist" data-go="dist">${esc(V('Luật & lịch theo kênh'))} →</a>`) +
        `<div id="vid-yt">${h.yapi ? '<span class="sk sk-block" style="height:180px;margin:0 0 .9rem"></span>' : ''}</div><section class="card" id="vx-web"><span class="sk" style="height:120px"></span></section>`;
      ytBox(el.querySelector('#vid-yt')); await webStats(el.querySelector('#vx-web'));
    }
    async function ytBox(el) {
      if (!h.yapi || !el) return;
      try { const q = new URLSearchParams(location.search).get('yt'); if (q) { toast(q === 'ok' ? V('Đã kết nối YouTube.') : V('Kết nối YouTube lỗi: {e}', { e: q })); history.replaceState(null, '', location.pathname + '#video/channels'); } } catch (e) { /* bỏ qua */ }
      try { [yt.st, yt.q] = await Promise.all([h.yapi('status'), h.yapi('queue').then(r => Object.fromEntries((r.rows || []).map(x => [x.clip, x])))]); } catch (e) { el.innerHTML = `<div class="err-box" role="alert">${esc(V('Kết nối YouTube lỗi: {e}', { e: e.code || e.message }))}</div>`; return; }
      if (!el.isConnected) return;
      const s = yt.st, ch = s.channel, q = s.quota || {}, c = s.queue || {}, st = s.settings || {}, man = st.mode !== 'api', m = s.manual || {}, sy = s.sync, on = ch && ch.status === 'ok', weak = on && (s.scope || {}).ok === false;
      const chl = s.channels || (ch ? [{ ...ch, is_default: true }] : []), ini = t => esc(String(t || '?').trim().charAt(0).toUpperCase());
      const chRow = x => { const ok = x.status === 'ok'; return `<li class="vid-ch${x.is_default && ok ? ' on' : ''}${ok ? '' : ' off'}" data-ch="${esc(x.channel_id)}"><label><input type="radio" name="yt-ch" value="${esc(x.channel_id)}"${x.is_default && ok ? ' checked' : ''}${ok ? '' : ' disabled'}><span class="vid-av"><i style="font-style:normal">${ini(x.title)}</i>${x.thumb ? `<img src="${esc(x.thumb)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : ''}</span><span class="tx"><span class="nm">${esc(x.title || x.channel_id)}</span><span class="sub">${esc(ok ? V('{n} video', { n: x.videos || 0 }) + (x.is_default ? ' · ' + V('Mặc định') : '') : V('Mất quyền – bấm Thêm kênh để kết nối lại'))}</span></span></label><button class="btn ghost sm" data-off="${esc(x.channel_id)}" type="button">${esc(V('Ngắt kết nối'))}</button></li>`; };
      el.innerHTML = `<section class="card vid-yt" role="group" aria-label="YouTube"><div class="card-h"><h3>▶ YouTube</h3><span class="chip ${on ? (weak ? 'warn' : 'ok') : 'bad'}">${esc(on ? V('Đã kết nối') : V('Chưa kết nối'))}</span></div>
        <p class="small" style="margin:0">${on ? esc(man ? V('Kênh {c} · sẵn sàng đăng {r} · đã đăng (dò thấy) {u} · trên web {l} · cần xử lý {i}', { c: ch.title || ch.channel_id, r: m.ready || 0, u: m.uploaded || 0, l: m.live || 0, i: m.issues || 0 }) : V('Kênh {c} · hạn mức hôm nay còn {u} đơn vị (≈ {n} video) · chờ {q} · đã lên {d}', { c: ch.title || ch.channel_id, u: num(q.left), n: q.uploads_left, q: (c.queued || 0) + (c.failed || 0), d: c.done || 0 })) : esc(V('YouTube chưa kết nối – chỉ chủ kênh bấm (đồng ý trong trình duyệt của anh).'))}</p>
        ${chl.length ? `<ul class="vid-chs" role="radiogroup" aria-label="${esc(V('Kênh YouTube'))}">${chl.map(chRow).join('')}</ul>` : ''}
        ${weak ? `<p class="small bad-t">${esc(V('Quyền đã cấp chưa đủ cho cách đăng này – bấm Kết nối lại YouTube.'))}</p>` : ''}
        <div class="vid-yt-b"><button class="btn ${on && !weak ? '' : 'primary'} sm" id="yt-con" type="button">${esc(weak ? V('Kết nối lại YouTube') : on ? '＋ ' + V('Thêm kênh') : V('Kết nối YouTube'))}</button>${on ? `<button class="btn ghost sm" id="yt-sync" type="button">🔄 ${esc(V('Đồng bộ'))}</button>` : ''}</div>
        ${sy ? `<p class="tiny muted" id="yt-sy">${esc(V('Đồng bộ lần cuối {t}: quét {n} video · khớp {k} · vấn đề {i}', { t: new Date(sy.at).toLocaleString(LOC()), n: sy.scanned, k: sy.matched, i: (sy.issues || []).length }))}</p>` : ''}
        <details class="vx-adv"><summary>${esc(V('Nâng cao'))}</summary><p class="tiny muted" style="margin:0 0 .4rem">${esc(V('Chọn kênh ở màn hình Google; muốn thêm kênh khác thì bấm Thêm kênh và chọn kênh đó.'))}</p><div class="vid-yt-c">
        <label>${esc(V('Cách đăng'))} <select id="yt-mode"><option value="manual"${man ? ' selected' : ''}>${esc(V('Tay qua YouTube Studio (chờ kiểm định)'))}</option><option value="api"${man ? '' : ' selected'}>${esc(V('Tự động qua API'))}</option></select></label>
        ${man ? '' : `<label>${esc(V('Chế độ'))} <select id="yt-pv"><option value="private"${st.privacy !== 'unlisted' ? ' selected' : ''}>${esc(V('Riêng tư'))}</option><option value="unlisted"${st.privacy === 'unlisted' ? ' selected' : ''}>${esc(V('Không công khai (unlisted)'))}</option></select></label>
        <label class="chk"><input type="checkbox" id="yt-cal" checked> ${esc(V('Theo lịch đăng (publishAt)'))}</label>`}</div></details></section>
        <div id="vid-ytp"></div>`;
      el.querySelector('#yt-con').onclick = async () => { try { const r = await h.yapi('connect'); if (/^https:\/\/accounts\.google\.com\//.test(r.url)) location.href = r.url; } catch (e) { toast(V('Kết nối YouTube lỗi: {e}', { e: e.code || e.message })); } };
      el.querySelectorAll('.vid-av img').forEach(i => { i.onerror = () => i.remove(); });
      el.querySelectorAll('input[name=yt-ch]').forEach(r => { r.onchange = async () => { try { await h.yapi('setdefault', { channel_id: r.value }); toast(V('Đã chọn kênh mặc định.')); } catch (x) { toast(V('Kết nối YouTube lỗi: {e}', { e: x.code || x.message })); } ytBox(el); }; });
      el.querySelectorAll('[data-off]').forEach(bt => { bt.onclick = async () => { const x = chl.find(k => k.channel_id === bt.dataset.off) || {}; if (!confirm(V('Ngắt kết nối kênh {c}? Token sẽ bị thu hồi và xóa.', { c: x.title || x.channel_id }))) return; bt.disabled = true; try { await h.yapi('disconnect', { channel_id: bt.dataset.off }); toast(V('Đã ngắt kết nối kênh.')); } catch (e2) { toast(e2.code === 'reauth' ? V('Thao tác nhạy cảm: đăng xuất rồi đăng nhập lại, sau đó thử lại.') : V('Kết nối YouTube lỗi: {e}', { e: e2.code || e2.message })); } ytBox(el); }; });
      const pv = el.querySelector('#yt-pv'); if (pv) pv.onchange = e => h.yapi('settings', { privacy: e.target.value }).catch(() => {});
      el.querySelector('#yt-mode').onchange = async e => {
        if (e.target.value === 'api' && !confirm(V('Chỉ bật khi Google đã duyệt kiểm định API – nếu chưa, video tải bằng API bị khóa ở chế độ riêng tư. Tiếp tục?'))) { e.target.value = 'manual'; return; }
        try { await h.yapi('settings', { mode: e.target.value }); } catch (x) { /* bỏ qua */ } ytBox(el);
      };
      const sb = el.querySelector('#yt-sync');
      if (sb) sb.onclick = async () => { sb.disabled = true; try { const r = await h.yapi('sync', { channel_id: on ? ch.channel_id : undefined }); toast(V('Đồng bộ xong: {k} khớp · {l} mới lên · {i} vấn đề', { k: r.matched, l: (r.live || []).length, i: (r.issues || []).length })); } catch (x) { toast(V('Kết nối YouTube lỗi: {e}', { e: x.code || x.message })); } ytBox(el); };
      if (man) packCards(el.querySelector('#vid-ytp'), s);
    }
    // Đăng tay (chờ kiểm định API): 1 thẻ/clip – trạng thái, Tải gói, chép tiêu đề/mô tả/thẻ, Mở YouTube Studio, danh sách kiểm, dán link dự phòng
    const STATE = { packing: 'Đang tạo gói', ready: 'Sẵn sàng đăng', uploaded: 'Đã đăng (dò thấy)', live: 'Trên web' }, STC = { packing: 'muted', ready: 'info', uploaded: 'ok', live: 'ok' };
    const ISSUE = { private: 'Video đang Riêng tư – đổi sang Không công khai (Unlisted) trong Studio', processing: 'YouTube đang xử lý – đồng bộ lại sau', 'processing-failed': 'YouTube xử lý lỗi – xóa và tải lại', 'wrong-file': 'Độ dài khác clip – có thể nhầm file', missing: 'Không còn thấy video trên kênh', unverified: 'Link dán tay – chưa kiểm (chưa kết nối YouTube)' };
    const CHECK = ['Tiêu đề = title.txt', 'Mô tả = description.txt (giữ dòng lk:…)', 'Không dành cho trẻ em', 'Nội dung bị thay đổi/tổng hợp = Có', 'Thể loại Giáo dục · thẻ = tags.txt', 'Chế độ hiển thị = Không công khai (Unlisted)'];
    const ckGet = id => { try { return JSON.parse(localStorage.getItem('lk-ytck-' + id) || '[]'); } catch (e) { return []; } };
    async function packCards(el, s) {
      if (!el) return;
      let r; const web = {};
      const sc = s && s.channel && s.channel.status === 'ok' ? s.channel.channel_id : undefined; // "Chọn kênh YouTube" (kênh mặc định) → gói đăng của kênh đó
      try { r = await h.yapi('packs', { channel_id: sc }); } catch (e) { el.innerHTML = ''; return; }
      try { const vj = await (await fetch('/data/videos.json', { cache: 'no-store' })).json(); for (const x of vj.items || []) if (x.youtube_id) web[x.id] = x.youtube_id; } catch (e) { /* bỏ qua */ }
      const rows = (r.rows || []).filter(x => x.state !== 'live' || Date.now() - (x.updated || 0) < 7 * 864e5).map(x => ({ ...x, state: x.state === 'uploaded' && x.status === 'done' && web[x.id] === x.video_id ? 'live' : x.state }));
      const iss = ((s.sync || {}).issues || []).filter(i => i.kind === 'no-marker' || i.kind === 'unknown-clip' || i.kind === 'duplicate');
      el.innerHTML = `<section class="card"><div class="card-h"><h3>${esc(V('Gói chờ đăng tay'))}</h3></div>` + (!rows.length && !iss.length ? emptyBox('Chưa có clip chờ đăng – mở 1 clip → Duyệt & tạo gói đăng.', '', '▶') : `${iss.map(i => `<p class="small bad-t">⚠ ${esc(i.kind === 'no-marker' ? V('Video "{t}" ({v}) không có dòng lk:… – dán link vào đúng clip bên dưới', { t: i.title || '', v: i.video_id }) : i.kind === 'duplicate' ? V('Clip {c} được đăng nhiều lần: {v} – xóa bản thừa trong Studio', { c: i.clip, v: (i.video_ids || []).join(', ') }) : V('Mã lk:{c} không khớp clip nào đã duyệt ({v})', { c: i.clip, v: i.video_id }))}</p>`).join('')}
        <div class="vid-ytp">${rows.map(x => { const ck = ckGet(x.id); return `<div class="vid-ytc" data-id="${esc(x.id)}"><div class="vid-ytc-h"><b>${esc(x.title || x.id)}</b><span class="chip ${STC[x.state] || 'muted'}">${esc(V(STATE[x.state] || x.state))}</span></div>
          <p class="tiny muted">${esc(x.id)} · <code>${esc(x.marker)}</code>${x.video_id ? ` · <a href="https://youtu.be/${esc(x.video_id)}" target="_blank" rel="noopener">youtu.be/${esc(x.video_id)}</a>` : ''}</p>
          ${x.err ? `<p class="small bad-t">⚠ ${esc(V(ISSUE[x.err] || x.err))}</p>` : ''}
          ${x.state === 'live' || x.state === 'uploaded' ? '' : `<div class="vid-acts">${x.pack ? `<a class="btn primary sm" data-dl href="${esc(x.pack + '&dl=1')}" download>⬇ ${esc(V('Tải gói'))}</a>` : `<span class="small muted">${esc(V('Đang tạo gói trên CI…'))}</span>`}
            <button class="btn sm" type="button" data-cp="title">${esc(V('Chép tiêu đề'))}</button><button class="btn sm" type="button" data-cp="description">${esc(V('Chép mô tả'))}</button><button class="btn sm" type="button" data-cp="tags">${esc(V('Chép thẻ'))}</button>
            <a class="btn ghost sm" href="${esc(r.studio || 'https://studio.youtube.com/')}" target="_blank" rel="noopener">${esc(V('Mở YouTube Studio'))}</a></div>
          <ol class="vid-ck">${CHECK.map((t, i) => `<li><label><input type="checkbox" data-ck="${i}"${ck.includes(i) ? ' checked' : ''}> ${esc(V(t))}</label></li>`).join('')}</ol>`}
          ${x.state === 'live' ? '' : `<div class="vid-acts"><input type="url" class="inp" data-url placeholder="${esc(V('Dán link YouTube (dự phòng)'))}" aria-label="${esc(V('Dán link YouTube (dự phòng)'))}"><button class="btn sm" type="button" data-link>${esc(V('Lưu link'))}</button></div>`}</div>`; }).join('')}</div>`) + '</section>';
      const by = Object.fromEntries(rows.map(x => [x.id, x]));
      el.querySelectorAll('.vid-ytc').forEach(card => {
        const x = by[card.dataset.id];
        card.querySelectorAll('[data-cp]').forEach(b => { b.onclick = async () => { const k = b.dataset.cp, v = k === 'tags' ? (x.tags || []).join(', ') : x[k] || ''; try { await navigator.clipboard.writeText(v); b.textContent = '✓ ' + V('Đã chép'); } catch (e) { /* bỏ qua */ } }; });
        card.querySelectorAll('[data-ck]').forEach(b => { b.onchange = () => { const v = [...card.querySelectorAll('[data-ck]')].filter(i => i.checked).map(i => +i.dataset.ck); try { localStorage.setItem('lk-ytck-' + x.id, JSON.stringify(v)); } catch (e) { /* bỏ qua */ } }; });
        const lb = card.querySelector('[data-link]');
        if (lb) lb.onclick = async () => { const u = card.querySelector('[data-url]').value.trim(); if (!u) return; try { const k = await h.yapi('link', { id: x.id, url: u }); toast(k.err ? V(ISSUE[k.err] || k.err) : V('Đã gắn video – trang bài học sẽ nhúng YouTube.')); const yb = document.getElementById('vid-yt'); if (yb) ytBox(yb); } catch (e) { toast(V('Link không hợp lệ: {e}', { e: e.code || e.message })); } };
      });
    }
    async function approve(ids) {
      if (!h.yapi || !ids.length) return false;
      if (!yt.st) await getYt();
      const set = (yt.st || {}).settings || {}, man = set.mode !== 'api', cb = document.getElementById('yt-cal');
      const pv = (document.getElementById('yt-pv') || {}).value || set.privacy || 'private', cal = (cb ? cb.checked : true) && pv === 'private';
      if (!confirm(man ? V('Duyệt {n} video: tạo gói đăng tay (Unlisted) trên Kho Drive?', { n: ids.length }) : V('Duyệt {n} video lên YouTube ở chế độ {p}{s}? Không bao giờ công khai ngay.', { n: ids.length, p: pv, s: cal ? V(' (công khai theo lịch đăng)') : '' }))) return false;
      try { const r = await h.yapi('approve', { ids, privacy: pv, schedule: cal ? 'calendar' : 'none' }); toast(V(man ? 'Đã duyệt {a} video – gói đăng sẽ sẵn sàng trong vài phút · bỏ qua {b}' : 'Đã xếp {a} video · bỏ qua {b}', { a: r.queued.length, b: r.skipped.length })); delete C.yt; delete C.cnt; const yb = document.getElementById('vid-yt'); if (yb) ytBox(yb); return true; }
      catch (e) { toast(V('Kết nối YouTube lỗi: {e}', { e: e.code || e.message })); return false; }
    }

    async function open(it, data) {
      if (!it) return;
      const d = document.createElement('dialog'); d.className = 'key-dlg vid-dlg'; d.setAttribute('aria-label', it.title || it.id); document.body.appendChild(d);
      const qa = it.qa || {}, cover = (data.covers || {})[it.cover];
      const row = (k, v) => (v == null || v === '' ? '' : `<tr><th scope="row">${esc(V(k))}</th><td>${esc(v)}</td></tr>`);
      d.innerHTML = `<div class="vid-dlg-h"><b>${esc(it.title || it.id)}</b><button class="btn ghost sm" type="button" data-x>${esc(V('Đóng'))}</button></div>
        <div class="in"><div id="vid-pl"><div class="vid-ph">${data.media ? esc(V('Đang tải…')) : esc(V('Video chưa có trên Kho Drive.'))}</div></div><div>
        <p class="vx-chips" style="margin:0 0 .6rem">${qcChip(it)}${qa.result ? `<span class="chip muted">QA ${esc(qa.result)}</span>` : ''}</p>
        ${h.yapi && qa.status === 'pass' && !(yt.q[it.id] && /done|uploading|manual|detected/.test(yt.q[it.id].status)) ? `<p style="margin:0 0 .6rem"><button class="btn primary sm" type="button" data-yt>▶ ${esc(V(((yt.st || {}).settings || {}).mode !== 'api' ? 'Duyệt & tạo gói đăng' : 'Duyệt & lên YouTube'))}</button></p>` : ''}
        <table class="vid-kv"><tbody>${row('Điểm học', it.point)}${row('Định dạng', V(FMT[it.format] || it.format))}${row('Cảnh/chủ đề', it.scene)}${row('Mẫu', it.template)}${row('Lĩnh vực', it.area)}${row('CEFR', it.cefr)}${row('Chuỗi', it.series)}${row('Ngôn ngữ', it.lang)}
        ${row('Thời lượng', secs(it.duration))}${row('Dung lượng', mb(it.bytes))}${row('Ngày dựng', it.created ? new Date(it.created).toLocaleString(LOC()) : '')}${row('Lượt CI', it.run)}
        ${row('Lịch đăng', it.slot ? `#${it.slot.n} · ${it.slot.date} ${it.slot.time} (${it.slot.tz || ''}) · ${V(PUB[pub(it)])}` : V(PUB.none))}
        ${row('Kết quả QA', qa.result)}${row('Mục đạt', qa.ok)}${row('Mục lỗi', qa.fail)}${row('Khớp môi lệch tối đa', qa.lipsync_ms != null ? qa.lipsync_ms + ' ms' : '')}${row('Phụ đề tối đa (ký tự/giây)', qa.cps_max)}
        ${row('Tiêu đề', it.title)}${row('Mô tả', it.description)}${row('Hashtag', (it.hashtags || []).join(' '))}${yt.q[it.id] ? row('YouTube: {s}', [yt.q[it.id].status, yt.q[it.id].privacy, yt.q[it.id].publish_at, yt.q[it.id].video_id].filter(Boolean).join(' · ')) : ''}</tbody></table>
        ${it.drive && it.drive.video && it.drive.video.retired ? `<p class="small muted">${esc(V('Bản gốc đã xóa theo luật giữ 30 ngày – dựng lại từ công thức (shorts-rebuild).'))}</p>` : ''}
        <div class="vid-acts"><button class="btn sm" type="button" data-c="title">${esc(V('Chép tiêu đề'))}</button><button class="btn sm" type="button" data-c="description">${esc(V('Chép mô tả'))}</button><button class="btn sm" type="button" data-c="hashtags">${esc(V('Chép hashtag'))}</button><span id="vid-dl"></span></div></div></div>`;
      const close = () => { const v = d.querySelector('video'); if (v) { v.pause(); v.removeAttribute('src'); v.load(); } if (d.close) d.close(); d.remove(); };
      d.querySelector('[data-x]').onclick = close; d.addEventListener('cancel', e => { e.preventDefault(); close(); }); d.addEventListener('click', e => { if (e.target === d) close(); });
      d.querySelectorAll('[data-c]').forEach(b => { b.onclick = async () => { const k = b.dataset.c, v = k === 'hashtags' ? (it.hashtags || []).join(' ') : it[k] || ''; try { await navigator.clipboard.writeText(v); toast(V('Đã chép')); b.textContent = '✓ ' + V('Đã chép'); } catch (e) { /* bỏ qua */ } }; });
      const yb = d.querySelector('[data-yt]'); if (yb) yb.onclick = () => approve([it.id]).then(ok => { if (ok) close(); });
      if (d.showModal) d.showModal(); else d.setAttribute('open', '');
      if (!data.media || !it.video) return;
      try {
        const { url } = await vapi('sign', { path: it.video });
        if (!d.isConnected || !/^\/api\/admin-shorts\?/.test(url)) return;
        d.querySelector('#vid-pl').innerHTML = `<video controls playsinline preload="metadata"${cover ? ` poster="${esc(cover)}"` : ''} src="${esc(url)}"></video>`;
        d.querySelector('#vid-dl').innerHTML = `<a class="btn sm" href="${esc(url + '&dl=1')}" download>${esc(V('Tải xuống'))}</a>`;
      } catch (e) { d.querySelector('#vid-pl').innerHTML = `<div class="vid-ph">${esc(V('Không lấy được link video: {e}', { e: e.message }))}</div>`; }
    }

    // 🎬 Hiệu quả trên web theo clip: /api/admin-shorts op 'web' (hit.js t:'v') + tên clip từ /data/videos.json
    async function webStats(el) {
      const [w, m] = await Promise.all([vapi('web').catch(() => ({ rows: [] })), fetch('/data/videos.json', { cache: 'no-cache' }).then(r => r.json()).catch(() => ({ items: [] }))]);
      if (!el.isConnected) return;
      const meta = {}; for (const it of m.items || []) meta[it.id] = it;
      const rows = (w.rows || []).concat((m.items || []).filter(it => !(w.rows || []).some(r => r.id === it.id)).map(it => ({ id: it.id, view: 0, done: 0, quiz_ok: 0, quiz_no: 0 }))).sort((a, b) => b.view - a.view);
      el.innerHTML = `<h3>${esc(V('Hiệu quả video trên web (90 ngày)'))}</h3>${rows.length ? `<div class="tbl-x"><table class="tbl"><thead><tr><th scope="col">Clip</th><th scope="col">${esc(V('Mẫu'))}</th><th scope="col">${esc(V('Lượt xem'))}</th><th scope="col">${esc(V('Xem hết'))}</th><th scope="col">${esc(V('Câu đố đúng'))}</th></tr></thead><tbody>
        ${rows.map(r => { const it = meta[r.id] || {}; return `<tr><td>${it.slug ? `<a href="/video/${esc(it.slug)}/" target="_blank" rel="noopener">${esc(it.title || r.id)}</a>` : esc(r.id)}${it.test ? ` <span class="small muted">(${esc(V('mẫu thử'))})</span>` : ''}</td><td>${esc(it.template || '')}</td><td>${num(r.view)}</td><td>${num(r.done)} · ${pct(r.done, r.view)}</td><td>${r.quiz_ok}/${r.quiz_ok + r.quiz_no} · ${pct(r.quiz_ok, r.quiz_ok + r.quiz_no)}</td></tr>`; }).join('')}</tbody></table></div>`
        : emptyBox('Chưa có số liệu web – clip được duyệt sẽ tự lên web (docs/VIDEO-SCALE-PLAN.md §10).', '', '🌐')}`;
    }
  }
  window.AdminVideo = { render };
})();
