/* Quản trị → "💰 Quảng cáo" (#ads/<mục>) – tải lười, cùng kiểu trung tâm Video: thanh mục con dính + KPI + biểu đồ SVG nội tuyến (không thư viện).
 * AdminAds.render(container, api, L, { esc, lang, toast, confirm }) – api('adsStats') (functions/api/admin.js → _ads.js, ext_events SEARCH theo ngày, đệm 10 phút),
 * api('config') / api('configSet') để bật/tắt cờ, công tắc khẩn cấp và tần suất (chỉ trong khoảng an toàn – web/js/ads/policy.js BOUNDS).
 * Doanh thu: THẬT (S.real – AdSense/AdMob API qua Action ads-revenue.yml, docs/ADS.md §5) khi đã nối; chưa nối → ƯỚC TÍNH (lượt hiển thị × eCPM đặt tay) + nút "Nối Google". Mọi chữ qua esc(). */
(function () {
  const EN = {
    'Quảng cáo': 'Ads', 'Tổng quan': 'Overview', 'Vị trí': 'Placements', 'Tần suất': 'Frequency', 'Giữ chân': 'Retention guard', 'Đồng ý': 'Consent', 'Các mục quảng cáo': 'Ad sections',
    'Đang tải…': 'Loading…', 'Không tải được: {e}': 'Could not load: {e}', 'Thử lại': 'Retry', 'Làm mới': 'Refresh',
    'Trạng thái theo nền tảng': 'Status by platform', 'Web (AdSense)': 'Web (AdSense)', 'Android (AdMob)': 'Android (AdMob)', 'iOS (AdMob)': 'iOS (AdMob)',
    'Đang bật': 'On', 'Đang tắt': 'Off', 'Bật': 'Turn on', 'Tắt': 'Turn off', 'Công tắc khẩn cấp': 'Kill switch', 'TẮT TOÀN BỘ quảng cáo': 'TURN OFF ALL ads', 'Mở lại quảng cáo': 'Re-enable ads',
    'Công tắc khẩn cấp đang BẬT – mọi quảng cáo dừng trên mọi nền tảng (≤ 1 giờ do bộ đệm cấu hình).': 'Kill switch is ON – all ads are stopped on every platform (≤ 1 hour, config cache).',
    'Mọi cờ đang tắt: app không tải mã quảng cáo nào. Bật cần cả mã nhà xuất bản trong web/js/ads/config.js (enabled: true).': 'All flags are off: the app loads no ad code. Turning on also needs the publisher id in web/js/ads/config.js (enabled: true).',
    'Toàn màn hình cuối phiên': 'End-of-session interstitial', 'Có thưởng': 'Rewarded', 'Xác nhận đổi cờ quảng cáo?': 'Change this ad flag?', 'Hiệu lực trên máy người dùng sau tối đa 1 giờ.': 'Takes effect on user devices within 1 hour.',
    'Đã lưu': 'Saved', 'Lưu': 'Save', 'Không lưu được: {e}': 'Could not save: {e}',
    'Doanh thu ước tính/ngày (7 ngày)': 'Est. revenue/day (7 days)', 'Lượt hiển thị (30 ngày)': 'Impressions (30 days)', 'Tỉ lệ lấp đầy': 'Fill rate', 'eCPM (proxy)': 'eCPM (proxy)', 'Hệ số cổng giữ chân': 'Guard factor',
    'Doanh thu ước tính theo ngày (USD)': 'Estimated revenue per day (USD)', 'ước tính = lượt hiển thị × eCPM đặt tay – thay bằng số AdSense/AdMob khi nối Reporting API': 'estimate = impressions × manual eCPM – replaced by AdSense/AdMob figures once the Reporting API is connected',
    'Nền tảng': 'Platform', 'Vị trí đặt': 'Placement', 'Yêu cầu': 'Requests', 'Hiển thị': 'Impressions', 'Không có QC': 'No fill', 'Bấm': 'Clicks', 'CTR': 'CTR', 'Thưởng': 'Rewards', 'Doanh thu ƯT': 'Est. revenue',
    'Trang Hôm nay': 'Home dashboard', 'Blog / trang SEO': 'Blog / SEO pages', 'Toàn màn hình': 'Interstitial', 'Chưa có số liệu – cờ đang tắt hoặc chưa có lượt hiển thị.': 'No data yet – flags are off or there are no impressions.',
    'Giới hạn tần suất': 'Frequency caps', 'Chỉ chỉnh được trong khoảng an toàn – không bao giờ dày hơn mặc định.': 'Editable only within safe bounds – never denser than the defaults.',
    'Toàn màn hình tối đa 1 lần mỗi … phiên học': 'Interstitial at most once every … study sessions', 'và cách nhau tối thiểu … phút': 'and at least … minutes apart', 'Không hiện toàn màn hình trong … giờ đầu': 'No interstitial in the first … hours',
    'phiên': 'sessions', 'phút': 'min', 'giờ': 'h', 'lần': 'times', 'Người mới: không toàn màn hình trong … phiên học đầu': 'New learners: no interstitial in the first … study sessions', 'Tối đa … lần toàn màn hình mỗi ngày': 'At most … interstitials per day', 'Khoảng {a}–{b}': 'Range {a}–{b}', 'Giá trị ngoài khoảng an toàn.': 'Value outside the safe range.',
    'eCPM ước tính (USD / 1000 lượt)': 'Estimated eCPM (USD / 1000 impressions)', 'Ngưỡng tụt giữ chân (%)': 'Retention drop threshold (%)', 'Cỡ mẫu tối thiểu mỗi nhóm': 'Minimum sample per cohort',
    'Nhóm có quảng cáo so với nhóm đối chứng (10 % không quảng cáo)': 'Ads cohort vs control cohort (10% see no ads)', 'Nhóm có QC': 'Ads cohort', 'Đối chứng': 'Control',
    'Giữ chân D1': 'D1 retention', 'Giữ chân D7': 'D7 retention', 'Thời lượng phiên TB': 'Avg session length', 'Xu hướng D1 theo tuần': 'Weekly D1 trend', 'máy mới': 'new devices',
    'Bình thường – tần suất đầy đủ.': 'Normal – full frequency.', 'Đã giảm tần suất (×{f}): nhóm có QC tụt {p} so với đối chứng.': 'Frequency reduced (×{f}): ads cohort dropped {p} vs control.',
    'Chưa đủ mẫu ({n}/{m} máy mỗi nhóm) – cổng chưa can thiệp.': 'Not enough sample yet ({n}/{m} devices per cohort) – guard not acting.', 'Tắt toàn màn hình (×0,25)': 'Interstitials off (×0.25)',
    'Lịch sử tự giảm tần suất': 'Auto-reduce history', 'Chưa có lần tự điều chỉnh nào.': 'No automatic adjustments yet.', 'Ngày': 'Date', 'Hệ số': 'Factor',
            'Ước tính': 'Estimate', 'Thật': 'Actual', 'Độ lệch': 'Deviation', 'ước tính = lượt hiển thị đo trong app × eCPM đặt tay ở mục Tần suất': 'estimate = impressions measured in the app × manual eCPM from Frequency',
    'Quốc gia': 'Country', 'Doanh thu': 'Revenue', 'Khác': 'Other', 'eCPM': 'eCPM',
    'Thẻ kết quả cuối lượt': 'End-of-round result card', 'Giữa bài blog': 'Mid-article (blog)', 'Trang từ điển': 'Dictionary page', 'Biểu ngữ trong app': 'In-app banner', 'Có thưởng · {x}': 'Rewarded · {x}',     'Báo cáo AdSense/AdMob: chưa kết nối – đang hiện số ước tính.': 'AdSense/AdMob reports: not connected – showing estimates.', 'Nối Google': 'Connect Google', 'Cách nối báo cáo Google (1 lần)': 'How to connect Google reports (once)',
    'Google Cloud Console › dự án lexkite-app: màn hình đồng ý OAuth ở trạng thái "In production" (để "Testing" thì token hết hạn sau 7 ngày) + client OAuth loại "Desktop app" → tải file JSON của client.': 'Google Cloud Console › project lexkite-app: OAuth consent screen set to "In production" ("Testing" expires tokens after 7 days) + an OAuth client of type "Desktop app" → download the client JSON file.',
    'Bật 2 API: AdSense Management API và AdMob API.': 'Enable 2 APIs: AdSense Management API and AdMob API.',
    'Trên máy Mac: node scripts/ads-oauth.mjs --client <file JSON> → đăng nhập vintagezulilyjewelry@gmail.com → Allow. Script tự đặt 3 secret GitHub (ADS_OAUTH_CLIENT_ID, ADS_OAUTH_CLIENT_SECRET, ADS_OAUTH_REFRESH).': 'On the Mac: node scripts/ads-oauth.mjs --client <JSON file> → sign in as vintagezulilyjewelry@gmail.com → Allow. The script sets 3 GitHub secrets (ADS_OAUTH_CLIENT_ID, ADS_OAUTH_CLIENT_SECRET, ADS_OAUTH_REFRESH).',
    'GitHub › Actions › Ads revenue › Run workflow. Số thật hiện ở đây sau khoảng 1 phút, rồi tự cập nhật mỗi ngày lúc 06:00 UTC.': 'GitHub › Actions › Ads revenue › Run workflow. Actual figures appear here after about 1 minute, then update daily at 06:00 UTC.',
    'Định nghĩa': 'Definition',
    'cao nhất': 'max',
    'so với kỳ trước': 'vs previous period',
    'Tổng': 'Total',
    'Số Google cập nhật lúc {t} · trễ vài giờ và có thể được điều chỉnh': 'Google figures updated {t} · a few hours behind and may be adjusted',
    'Bộ lọc': 'Filters',
    'Khoảng ngày': 'Date range',
    'Từ': 'From',
    'Đến': 'To',
    'Tất cả': 'All',
    'kỳ trước': 'previous period',
    'Lọc quốc gia: Android + iOS gộp (AdMob không chia nước theo nền tảng).': 'Country filter: Android + iOS combined (AdMob does not split countries by platform).',
    'Hôm nay (Google, ước tính)': 'Today (Google, estimated)',
    'lượt hiển thị': 'impressions',
    'Google chưa có số hôm nay': 'No Google figures for today yet',
    'Đang diễn ra (bộ đếm nội bộ)': 'Live (internal counter)',
    'bấm': 'clicks',
    'thưởng': 'rewards',
    'gần thời gian thực, giờ Việt Nam': 'near real time, Vietnam time',
    'Xem bảng số liệu theo ngày': 'Show daily data table',
    'Chi tiết': 'Breakdown',
    'Ước tính nội bộ vs số thật': 'Internal estimate vs actual',
    'Thanh toán': 'Payments',
    'Số dư hiện tại': 'Current balance',
    'Ngưỡng thanh toán': 'Payment threshold',
    'mặc định AdSense/AdMob': 'AdSense/AdMob default',
    'Lần trả gần nhất': 'Last payment',
    'AdMob dùng chung hồ sơ thanh toán với AdSense.': 'AdMob shares the payments profile with AdSense.',
    'Chưa có dữ liệu thanh toán – cập nhật ở lượt đồng bộ đêm.': 'No payment data yet – updated by the nightly sync.',
    'Hiệu quả vs trải nghiệm': 'Revenue vs experience',
    'Doanh thu / 1.000 phiên có quảng cáo': 'Revenue / 1,000 ad sessions',
    'Giữ chân D1 (có QC / đối chứng)': 'D1 retention (ads / control)',
    'Giữ chân D7 (có QC / đối chứng)': 'D7 retention (ads / control)',
    'Đối chứng = 10 % người dùng không thấy quảng cáo; cửa sổ 14 ngày. Chi tiết ở mục Giữ chân.': 'Control = 10% of users see no ads; 14-day window. Details under Retention guard.',
    'Ngày báo cáo theo múi giờ tài khoản Google (AdSense: giờ Thái Bình Dương, America/Los_Angeles); bộ đếm nội bộ theo giờ Việt Nam. Số tháng hiện tại là ước tính, Google chốt sau khi hết tháng.': 'Report days follow the Google account time zone (AdSense: Pacific Time, America/Los_Angeles); the internal counter uses Vietnam time. Current-month figures are estimates; Google finalises them after the month ends.',
    'Hôm nay': 'Today',
    'Hôm qua': 'Yesterday',
    '7 ngày': '7 days',
    '28 ngày': '28 days',
    'Tháng này': 'This month',
    'Tháng trước': 'Last month',
    'Tùy chọn': 'Custom',
    'Doanh thu ước tính Google ghi nhận (USD); Google có thể điều chỉnh tới khi chốt số cuối tháng.': 'Estimated revenue recorded by Google (USD); Google may adjust it until month-end finalisation.',
    'eCPM = doanh thu ÷ lượt hiển thị × 1.000.': 'eCPM = revenue ÷ impressions × 1,000.',
    'RPM trang = doanh thu web ÷ lượt xem trang × 1.000 (chỉ AdSense).': 'Page RPM = web revenue ÷ page views × 1,000 (AdSense only).',
    'Lượt hiển thị Google tính là đã hiện (đã tải và vào màn hình).': 'Impressions Google counts as shown (loaded and on screen).',
    'Tỉ lệ lấp đầy = yêu cầu có quảng cáo trả về ÷ tổng yêu cầu quảng cáo.': 'Fill rate = matched ad requests ÷ total ad requests.',
    'CTR = lượt bấm ÷ lượt hiển thị.': 'CTR = clicks ÷ impressions.',
    'Doanh thu quảng cáo': 'Ad revenue',
    'Theo vị trí': 'By placement',
    'Theo nền tảng': 'By platform',
    'Theo quốc gia': 'By country',
    'Chưa có số trong khoảng này.': 'No figures in this range.',
    'Doanh thu theo ngày (USD)': 'Revenue per day (USD)',
    'eCPM theo ngày (USD)': 'eCPM per day (USD)',
    'RPM trang': 'Page RPM',
    'Lượt hiển thị': 'Impressions',
    'Đã chốt': 'Finalised',
    'tăng': 'up',
    'giảm': 'down',
    'Tỉ lệ đồng ý theo vùng (30 ngày)': 'Consent rates by region (30 days)', 'Vùng': 'Region', 'Cá nhân hóa': 'Personalised', 'Không cá nhân hóa': 'Non-personalised', 'Từ chối': 'Refused', 'Không cần hỏi': 'Not required',
    // Sẵn sàng bật quảng cáo (thẻ đầu trang) + tab Vị trí trực quan
    'Kiểm tra điều kiện và bật/tắt theo nền tảng; doanh thu ở cuối trang.': 'Check readiness and switch platforms on/off; revenue is at the bottom.',
    'Sẵn sàng bật quảng cáo': 'Ready to turn on ads', 'Điều kiện đạt': 'Conditions met', '{a}/{b} điều kiện đạt': '{a} of {b} conditions met',
    'Nút Bật của mỗi nền tảng chỉ mở khi mọi điều kiện bắt buộc của nền tảng đó đạt. Công tắc khẩn cấp luôn dùng được.': 'Each platform’s Turn on button unlocks only when all of its required conditions are met. The kill switch always works.',
    'Tài khoản & giấy tờ': 'Accounts & paperwork', 'Kỹ thuật': 'Technical', 'Lưu lượng': 'Traffic',
    'Đạt': 'Met', 'Chờ': 'Waiting', 'Chặn': 'Blocked', 'Việc của anh': 'Owner', 'Khuyến nghị': 'Advisory', 'Trạng thái: {t}': 'Status: {t}', 'đánh dấu tay {t}': 'set by hand {t}', 'mặc định theo lần kiểm 10/11': 'default from the 10 Nov check',
    'Thư IRS (EIN của LLC)': 'IRS letter (LLC EIN)', 'Tài khoản AdSense được duyệt': 'AdSense account approved', 'Tài khoản AdMob được duyệt': 'AdMob account approved',
    'App iOS liên kết App Store trong AdMob': 'iOS app linked to the App Store in AdMob', 'Thông điệp đồng ý (CMP) đã xuất bản': 'Consent message (CMP) published', 'Nhận tiền: PingPong đứng tên LLC': 'Payouts: PingPong in the LLC’s name',
    'ads.txt hợp lệ': 'ads.txt valid', 'app-ads.txt hợp lệ': 'app-ads.txt valid', 'Mã quảng cáo bật trong code (enabled: true)': 'Ad code enabled (enabled: true)', 'Mã ô AdSense cho web': 'AdSense ad units for the web',
    'Bản app phát hành dùng mã thật': 'Release app build uses real ad units', 'Xác minh thưởng phía máy chủ (SSV)': 'Server-side reward verification (SSV)', 'Người thật mỗi ngày': 'Real users per day',
    'Chờ thư IRS gửi về LLC; nhận được thì đánh dấu Đạt.': 'Wait for the IRS letter to the LLC; mark Met once it arrives.',
    'Google: "Your account wasn\'t approved – Meet program policies" (kiểm 10/11).': 'Google: "Your account wasn\'t approved – Meet program policies" (checked 10 Nov).',
    'Sửa theo chính sách chương trình rồi bấm Request review ở AdSense › Sites.': 'Fix per the program policies, then click Request review in AdSense › Sites.',
    'AdMob › Policy center: xử lý vi phạm rồi bấm Request review.': 'AdMob › Policy center: resolve the issues, then click Request review.',
    'Sau khi AdMob duyệt: Apps › iOS › Add store (App Store) để Google kiểm app-ads.txt.': 'Once AdMob approves: Apps › iOS › Add store (App Store) so Google can verify app-ads.txt.',
    'AdSense/AdMob › Privacy & messaging: tạo thông điệp GDPR + luật bang Mỹ rồi Publish.': 'AdSense/AdMob › Privacy & messaging: create the GDPR + US state messages, then Publish.',
    'Đổi tài khoản nhận tiền sang tên LLC trước ngưỡng thanh toán $100 – không khóa nút Bật.': 'Move the payout account to the LLC’s name before the $100 threshold – does not lock Turn on.',
    'Có dòng google.com, pub-…, DIRECT đúng mã nhà xuất bản.': 'Has the google.com, pub-…, DIRECT line with the right publisher id.',
    'Không tải được tệp – thử lại sau.': 'Could not fetch the file – try again later.', 'Thiếu dòng google.com, pub-…, DIRECT.': 'Missing the google.com, pub-…, DIRECT line.',
    'Đang là mã giữ chỗ pub-0000….': 'Still the pub-0000… placeholder.', 'Mã trong tệp khác mã ở web/js/ads/config.js.': 'The id in the file differs from web/js/ads/config.js.',
    'Không đọc được web/js/ads/config.js.': 'Could not read web/js/ads/config.js.',
    'web/js/ads/config.js đang enabled: false (đúng khi còn chờ duyệt).': 'web/js/ads/config.js has enabled: false (correct while approval is pending).', 'Đổi enabled: true trong lần ship bật quảng cáo.': 'Set enabled: true in the release that turns ads on.',
    'Chưa có mã nhà xuất bản.': 'No publisher id yet.', 'Chưa dán mã ô (home, blog…) vào config.js.': 'No ad unit ids (home, blog…) in config.js yet.', 'Tạo ô hiển thị ở AdSense › Ads › By ad unit rồi dán mã vào config.js.': 'Create display units in AdSense › Ads › By ad unit, then paste the ids into config.js.',
    'native.testing: true – app đang dùng mã THỬ của Google.': 'native.testing: true – the app uses Google TEST ad units.', 'Bản phát hành: testing: false + build ADS_NATIVE=1.': 'Release build: testing: false + build with ADS_NATIVE=1.',
    'Đặt biến Pages ADS_SSV=1 và dán URL /api/ads-reward vào ô có thưởng trong AdMob.': 'Set the Pages variable ADS_SSV=1 and paste the /api/ads-reward URL into the AdMob rewarded unit.',
    'Người thật/ngày (TB 7 ngày)': 'Real users/day (7-day avg)', 'gợi ý ≥ {m}': 'suggested ≥ {m}', 'Không đọc được số liệu Phân tích.': 'Could not read Analytics.', 'Khuyến nghị, không khóa nút Bật: đủ người để lấp đầy và cổng giữ chân có mẫu.': 'Advisory, does not lock Turn on: enough users for fill and a meaningful retention guard.',
    'Đã đạt.': 'Done.', 'Đã lưu trạng thái': 'Status saved',
    'Khóa – còn {n} điều kiện': 'Locked – {n} conditions left', 'Đủ điều kiện': 'Ready', 'Còn: {x}': 'Left: {x}', 'mã ô web': 'web ad units', 'mã app thật': 'real app units',
    'Chưa có doanh thu': 'No revenue yet', 'Quảng cáo đang tắt. Doanh thu hiện ở đây vài giờ sau lượt hiển thị đầu tiên.': 'Ads are off. Revenue shows here a few hours after the first impressions.',
    'Xem điều kiện còn thiếu': 'See what is missing', 'Ước tính vs thật · Thanh toán · Hiệu quả – chưa có dữ liệu': 'Estimate vs actual · Payments · Efficiency – no data yet', 'Chi tiết theo vị trí/nền tảng/quốc gia – chưa có dữ liệu': 'Breakdown by placement/platform/country – no data yet',
    'Không có số trong khoảng ngày này. Thử khoảng dài hơn hoặc bỏ bộ lọc.': 'No figures in this date range. Try a longer range or clear the filters.',
    // Tab Vị trí
    'Mỗi vị trí, luật tần suất và vùng cấm đọc thẳng từ web/js/ads/policy.js – đổi luật ở đó, trang này tự đúng.': 'Each placement, frequency rule and no-ads zone is read straight from web/js/ads/policy.js – change the rules there and this page follows.',
    'Add-on Chrome không bao giờ có quảng cáo': 'The Chrome add-on never shows ads', 'build-extension.sh loại js/ads/ khỏi gói; vỏ quảng cáo tự tắt trên chrome-extension:.': 'build-extension.sh strips js/ads/ from the package; the ad shell switches itself off on chrome-extension:.',
    'Sơ đồ vị trí': 'Placement map', 'Không tải được luật quảng cáo (policy.js).': 'Could not load the ad rules (policy.js).',
    'Trang Hôm nay – cuối trang': 'Today – end of page', 'Cuối bài blog': 'End of blog article', 'Giữa bài blog dài': 'Middle of long blog articles', 'Trang từ điển 1 từ': 'Single-word dictionary page', 'Thẻ kết quả cuối lượt': 'End-of-round result card', 'Toàn màn hình cuối phiên (app)': 'End-of-session interstitial (app)', 'Có thưởng – người học tự chọn': 'Rewarded – learner opts in',
    'Ô 300×250 trong khung cố định 290 px – không xô lệch bố cục (CLS 0).': '300×250 unit in a fixed 290 px frame – no layout shift (CLS 0).', 'App gốc: biểu ngữ thích ứng ở đáy, chỉ khi đang ở tab Hôm nay.': 'Native app: adaptive banner at the bottom, only on the Today tab.',
    'Trước "Bài liên quan" – không bao giờ trên nội dung chính (giữ LCP).': 'Before "Related articles" – never above the main content (keeps LCP).', 'Tối đa {n} ô mỗi bài (cuối + giữa).': 'At most {n} units per article (end + middle).',
    'Sau đoạn văn ở 40–50 % thân bài, chỉ bài ≥ 1200 từ.': 'After a paragraph at 40–50% of the body, only in articles ≥ 1,200 words.', 'Không chen giữa danh sách, bảng, trích dẫn hay sát ảnh/video.': 'Never inside lists, tables or quotes, nor next to images/videos.',
    'Ngay dưới thẻ nghĩa + "Ví dụ".': 'Right below the meaning card + "Examples".', 'Tối đa {n} ô mỗi trang; không ở hub hay A–Z.': 'At most {n} unit per page; never on hubs or A–Z lists.',
    'Chỉ sau {h} giờ kể từ lần mở đầu tiên.': 'Only {h} hours after the first visit.', 'Chỉ khi điểm ≥ {p} % – không "xát muối" lúc làm kém.': 'Only when the score is ≥ {p}% – never rubbing it in after a poor round.', 'Chèn dưới cùng, cách nút ≥ 2,5rem (chống bấm nhầm).': 'Inserted at the very bottom, ≥ 2.5rem from buttons (no accidental clicks).',
    'Chỉ khi vừa xong 1 phiên học và đã về tab chính ({t}).': 'Only right after a study session, once back on a main tab ({t}).', 'Tối đa 1 lần mỗi {s} phiên, cách nhau ≥ {g} phút, ≤ {d} lần/ngày.': 'At most once every {s} sessions, ≥ {g} min apart, ≤ {d} per day.',
    'Không trong {h} giờ đầu, ngày lịch đầu tiên và {n} phiên học đầu.': 'Never in the first {h} hours, the first calendar day or the first {n} study sessions.', 'Vừa xem video có thưởng → yên {c} phút; vừa làm < {p} % → không hiện.': 'After a rewarded video → {c} quiet minutes; after a round < {p}% → not shown.',
    'Cổng giữ chân giãn tần suất khi nhóm có quảng cáo tụt; ×0,25 = tắt hẳn.': 'The retention guard spaces them out when the ads cohort drops; ×0.25 = off.',
    'Người học tự bấm "Xem video" – không bao giờ tự phát.': 'The learner taps "Watch video" – never autoplays.', 'Chờ ≥ {m} phút giữa 2 video.': 'At least {m} min between two videos.', 'Web chỉ có: {x} (không cần SSV).': 'Web only offers: {x} (no SSV needed).',
    'Cứu chuỗi': 'Save the streak', '+{n} lượt AI chấm/giải thích': '+{n} AI grading/explanations', '+{n} lượt Roleplay': '+{n} Roleplay turns', 'Cơ hội thứ 2': 'Second chance', 'Nhân đôi XP': 'Double XP', '+{n} món trang trí': '+{n} cosmetic item', '{x} · ≤ {n}/ngày': '{x} · ≤ {n}/day',
    '30 ngày: {i} hiển thị · lấp đầy {f}': '30 days: {i} impressions · fill {f}', 'Chưa có lượt hiển thị.': 'No impressions yet.',
    'Vùng cấm quảng cáo': 'No-ads zones', 'Luôn chặn, trước mọi luật khác': 'Always blocked, before any other rule', 'Cấm hẳn – kể cả video có thưởng': 'Hard – not even rewarded video', 'Trạng thái lúc chạy (mọi màn)': 'Live state (any screen)', 'Đang học – chỉ lời mời có thưởng ở điểm nghỉ': 'Studying – only opt-in rewarded offers at breaks',
    'Quản trị': 'Admin', 'Lớp học (giáo viên & học sinh)': 'Classroom (teachers & students)', 'Dưới 13 tuổi': 'Under 13', 'Trình duyệt tự động': 'Automated browsers', 'Nhóm đối chứng {p} %': 'Control cohort {p}%', 'Người dùng Pro': 'Pro users',
    'Bài thi / thi thử': 'Tests / mock exams', 'Làm quen lần đầu': 'Onboarding', 'Thanh toán / nâng cấp': 'Payment / upgrade', 'Gọi / roleplay': 'Calls / roleplay', 'Luyện nói': 'Speaking', 'Bài học & ôn tập': 'Lessons & review', 'Mic đang thu': 'Mic recording', 'Đang gọi': 'In a call', 'Đang trả lời câu hỏi': 'Answering a question',
    'Số liệu theo vị trí (30 ngày)': 'Placement figures (30 days)', '+{n} màn': '+{n} screens', 'Add-on Chrome': 'Chrome add-on', '?sandbox · ?demo': '?sandbox · ?demo',
    'EEA + Anh + Thụy Sĩ (TCF v2.2)': 'EEA + UK + Switzerland (TCF v2.2)', 'Mỹ (luật bang)': 'US (state laws)', 'Nơi khác': 'Rest of world', 'Mỗi phiên có quảng cáo ghi 1 kết quả; vùng suy từ mã nước của Cloudflare, không lưu IP.': 'Each ad session records one outcome; region comes from Cloudflare’s country code, no IP stored.',
  };
  let gen = 0;
  // ---------- Doanh thu thật: gộp theo bộ lọc (thuần – test qua AdminAds.agg). R = S.real từ admin.js revPack(): rows [day, src, dim, key, earn µUSD, imp, click, req, mreq, pv] ----------
  const dAdd = (d, n) => new Date(Date.parse(d + 'T00:00:00Z') + n * 864e5).toISOString().slice(0, 10);
  const M6 = ['earn', 'imp', 'click', 'req', 'mreq', 'pv'], DRE = /^\d{4}-\d{2}-\d{2}$/;
  const fin = a => ({ ...a, usd: a.earn / 1e6, ecpm: a.imp ? a.earn / 1e6 / a.imp * 1000 : null, rpm: a.pv ? a.earn / 1e6 / a.pv * 1000 : null, fill: a.req ? a.mreq / a.req : null, ctr: a.imp ? a.click / a.imp : null });
  const sumOf = list => { const a = { earn: 0, imp: 0, click: 0, req: 0, mreq: 0, pv: 0 }; for (const r of list) for (let i = 0; i < 6; i++) a[M6[i]] += +r[4 + i] || 0; return fin(a); };
  const platOf = r => (r[1] === 'adsense' ? 'web' : String(r[3]).split(':')[0]);
  /** Khoảng [from, to] (ngày báo cáo Google) theo lựa chọn; rt = "hôm nay" theo múi giờ báo cáo. */
  function rangeOf(r, rt, f, t) {
    const m0 = rt.slice(0, 8) + '01';
    if (r === 'today') return [rt, rt];
    if (r === 'yday') return [dAdd(rt, -1), dAdd(rt, -1)];
    if (r === '28d') return [dAdd(rt, -28), dAdd(rt, -1)];
    if (r === 'mtd') return [m0, rt];
    if (r === 'lm') { const e = dAdd(m0, -1); return [e.slice(0, 8) + '01', e]; }
    if (r === 'custom' && DRE.test(f || '') && DRE.test(t || '') && f <= t) return [f, t > rt ? rt : t];
    return [dAdd(rt, -7), dAdd(rt, -1)];
  }
  /** Dòng gốc cho KPI: không lọc nước → dòng 'total' (web = AdSense, app = tổng ô AdMob theo nền tảng); lọc nước → dòng 'country' (AdMob gộp Android+iOS). */
  function baseRows(rows, plat, cc) {
    if (cc) return rows.filter(r => r[2] === 'country' && r[3] === cc && (plat === 'all' || (plat === 'web') === (r[1] === 'adsense')));
    if (plat === 'all') return rows.filter(r => r[2] === 'total');
    if (plat === 'web') return rows.filter(r => r[2] === 'total' && r[1] === 'adsense');
    return rows.filter(r => r[2] === 'unit' && r[1] === 'admob' && platOf(r) === plat);
  }
  function agg(R, q) {
    const rt = R.rt || R.today, rows = R.rows || [], plat = ['web', 'android', 'ios'].includes(q.p) ? q.p : 'all', cc = q.c || '';
    const [from, to] = rangeOf(q.r, rt, q.f, q.t), L = Math.round((Date.parse(to) - Date.parse(from)) / 864e5) + 1, pf = dAdd(from, -L), pt = dAdd(from, -1);
    const inR = (r, a, b) => r[0] >= a && r[0] <= b, b = baseRows(rows, plat, cc), cur = b.filter(r => inR(r, from, to));
    const days = Array.from({ length: L }, (_, i) => dAdd(from, i)), byDay = {};
    for (const r of cur) (byDay[r[0]] = byDay[r[0]] || []).push(r);
    const grp = (list, kf) => { const g = {}; for (const r of list) (g[kf(r)] = g[kf(r)] || []).push(r); return Object.entries(g).map(([k, l]) => ({ k, ...sumOf(l) })); };
    const places = grp(rows.filter(r => r[2] === 'unit' && inR(r, from, to) && (plat === 'all' || platOf(r) === plat)), r => platOf(r) + '|' + (r[1] === 'adsense' ? String(r[3]).replace(/^web:/, '') : String(r[3]).split(':').slice(1).join(':')))
      .map(x => ({ ...x, plat: x.k.split('|')[0], place: x.k.split('|')[1] }));
    const plats = ['web', 'android', 'ios'].filter(p => plat === 'all' || p === plat).map(p => ({ k: p, plat: p, ...sumOf(baseRows(rows, p, '').filter(r => inR(r, from, to))) })).filter(x => x.imp || x.earn || x.req);
    const countries = grp(rows.filter(r => r[2] === 'country' && inR(r, from, to) && (plat === 'all' || (plat === 'web') === (r[1] === 'adsense'))), r => r[3]).map(x => ({ ...x, cc: x.k }));
    const vs = ['web', 'android', 'ios'].filter(p => plat === 'all' || p === plat).map(p => {
      const real = sumOf(baseRows(rows, p, '').filter(r => inR(r, from, to))).usd, est = days.reduce((s, d) => s + (+(((R.est || {})[d] || {})[p]) || 0), 0);
      return { k: p, plat: p, est, real, dev: real > 0 ? (est - real) / real : null };
    });
    const ses = days.reduce((s, d) => s + (+(R.ses || {})[d] || 0), 0), c = sumOf(cur);
    return { from, to, L, rt, prevFrom: pf, prevTo: pt, cur: c, prev: sumOf(b.filter(r => inR(r, pf, pt))), series: days.map(d => ({ day: d, ...sumOf(byDay[d] || []) })),
      places, plats, countries, vs, ses, per1k: ses && plat === 'all' && !cc ? c.usd / ses * 1000 : null, final: to < rt.slice(0, 8) + '01', has: cur.length > 0,
      today: sumOf(baseRows(rows, plat, cc).filter(r => r[0] === rt)), ccs: [...new Set(rows.filter(r => r[2] === 'country').map(r => r[3]))] };
  }
  /** CSV (RFC 4180, ; không – dấu phẩy) cho bảng chi tiết. */
  const csvOf = (head, rows) => [head, ...rows].map(r => r.map(v => { const s = v == null ? '' : String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(',')).join('\n');
  // ---------- Sẵn sàng bật quảng cáo (thuần – test qua AdminAds.readyOf): một nguồn cho checklist đầu trang + khóa nút "Bật" theo nền tảng ----------
  // k · g nhóm · p nền tảng bị khóa khi chưa đạt · who: o = việc của chủ, d = kỹ thuật · m = nhập tay (khóa quản trị ads_ready, JSON; giá trị = mặc định theo lần kiểm 10/11) · soft = khuyến nghị, không khóa
  const ALL = ['web', 'android', 'ios'], APP = ['android', 'ios'], ST = ['ok', 'wait', 'block'];
  const READY = [
    { k: 'irs', g: 'acct', p: ALL, who: 'o', m: 'wait' }, { k: 'adsense', g: 'acct', p: ['web'], who: 'o', m: 'block' }, { k: 'admob', g: 'acct', p: APP, who: 'o', m: 'block' },
    { k: 'ios_store', g: 'acct', p: ['ios'], who: 'o', m: 'wait' }, { k: 'cmp', g: 'acct', p: ALL, who: 'o', m: 'wait' }, { k: 'pingpong', g: 'acct', p: ALL, who: 'o', m: 'wait', soft: 1 },
    { k: 'ads_txt', g: 'tech', p: ['web'], who: 'd' }, { k: 'app_ads_txt', g: 'tech', p: APP, who: 'd' }, { k: 'code_web', g: 'tech', p: ['web'], who: 'd' },
    { k: 'code_app', g: 'tech', p: APP, who: 'd' }, { k: 'ssv', g: 'tech', p: APP, who: 'd', m: 'wait' }, { k: 'enabled', g: 'tech', p: ALL, who: 'd' },
    { k: 'traffic', g: 'reach', p: ALL, soft: 1 },
  ];
  const TRAFFIC_MIN = 100; // người thật/ngày gợi ý (không phải luật Google): đủ lượt để lấp đầy có nghĩa và cổng giữ chân đủ mẫu (docs/ADS.md §5)
  const PUB_RE = /^\s*google\.com\s*,\s*pub-(\d{16})\s*,\s*DIRECT\s*,\s*f08c47fec0942fa0\s*(?:#.*)?$/im;
  /** ads.txt / app-ads.txt → '' (đạt) hoặc lý do: http | missing | placeholder | mismatch. r = { ok, text } (fetch), pub = 16 số của ca-pub-… */
  const txtWhy = (r, pub) => { if (!r || !r.ok) return 'http'; const m = String(r.text || '').match(PUB_RE); return !m ? 'missing' : /^0+$/.test(m[1]) ? 'placeholder' : pub && m[1] !== pub ? 'mismatch' : ''; };
  /** inp = { man: ads_ready đã parse, txt: { ads, app }, conf: ADS_CONFIG | null, traffic: { avg } | null } → { items, block: { web|android|ios: [mục chưa đạt bắt buộc] }, met } */
  function readyOf(inp) {
    const x = inp || {}, man = x.man || {}, c = x.conf, w = (c && c.web) || {}, pub = String(w.client || '').replace(/^ca-pub-/, '');
    const items = READY.map(d => {
      let why = '', v = {};
      if (d.m) { const e = man[d.k] || {}; why = ST.includes(e.st) ? e.st : d.m; v = { at: ST.includes(e.st) ? +e.at || 0 : 0 }; return { ...d, st: why, why: d.k + ':' + why, v }; }
      if (d.k === 'ads_txt' || d.k === 'app_ads_txt') why = txtWhy((x.txt || {})[d.k === 'ads_txt' ? 'ads' : 'app'], pub);
      else if (!c && d.k !== 'traffic') why = 'nocfg';
      else if (d.k === 'code_web') why = !pub ? 'pub' : !Object.values(w.slots || {}).some(Boolean) ? 'slots' : '';
      else if (d.k === 'code_app') why = (c.native || {}).testing !== false ? 'testing' : '';
      else if (d.k === 'enabled') why = c.enabled ? '' : 'off';
      else if (d.k === 'traffic') { why = !x.traffic ? 'na' : x.traffic.avg >= TRAFFIC_MIN ? '' : 'low'; v = x.traffic ? { n: Math.round(x.traffic.avg), m: TRAFFIC_MIN } : {}; }
      return { ...d, st: !why ? 'ok' : ['missing', 'placeholder', 'mismatch'].includes(why) ? 'block' : 'wait', why, v };
    });
    return { items, met: items.filter(i => i.st === 'ok').length, block: Object.fromEntries(ALL.map(p => [p, items.filter(i => !i.soft && i.p.includes(p) && i.st !== 'ok')])) };
  }
  /** Tuyến cấm từ biểu thức chính quy trong ZONES (một nguồn, không chép tay): ^(a|b|c-.+)$ → ['a', 'b', 'c-*']; không neo $ → tiền tố 'x*'. */
  const routesOf = re => { const src = re.source, m = src.match(/^\^\(([^()]*)\)/), open = /\(-\.\*\)\?|[^$]$/.test(src) ? '*' : ''; return (m ? m[1].split('|') : [src.replace(/^\^/, '').replace(/\$$/, '')]).map(r => r.replace(/\.[+*]/g, '*') + (open && !/\*$/.test(r) ? open : '')).map(r => r.replace(/\*+$/, '*').replace(/(\w)\?(?=\*?$)/, '($1)')); };
  const CSS = `.ax-nav{position:sticky;top:var(--a-top,56px);z-index:20;display:flex;gap:.2rem;overflow-x:auto;margin:-.3rem 0 1.1rem;padding:.4rem .1rem;background:color-mix(in srgb,var(--bg) 94%,transparent);backdrop-filter:blur(10px);border-bottom:1px solid var(--line)}
.ax-tab{flex:none;display:inline-flex;align-items:center;min-height:40px;padding:0 .85rem;border-radius:10px;color:var(--muted);font-weight:600;font-size:.88rem;text-decoration:none;white-space:nowrap}.ax-tab:hover{background:var(--surface-2);color:var(--text)}
.ax-tab[aria-current=page]{background:var(--surface);color:var(--text);box-shadow:inset 0 -3px 0 var(--primary),var(--shadow-sm)}.ax-tab:focus-visible{outline:2px solid var(--primary);outline-offset:-2px}
.ax-body{min-height:60vh;outline:none}.ax-h{display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;gap:.6rem 1rem;margin-bottom:1rem}.ax-h h2{margin:0;font-size:1.2rem;font-weight:800}.ax-h p{margin:.2rem 0 0;color:var(--muted);font-size:.88rem;max-width:72ch}
.ax-plats{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr));gap:.85rem;margin-bottom:1rem}.ax-plat{display:flex;flex-direction:column;gap:.5rem}.ax-plat .row{display:flex;align-items:center;justify-content:space-between;gap:.5rem;flex-wrap:wrap}
.ax-kill{border-color:var(--a-bad);background:var(--a-bad-bg)}.ax-chart svg{width:100%;height:auto;display:block}.ax-chart text{fill:var(--muted);font-size:10px}.ax-legend{display:flex;gap:1rem;font-size:.8rem;color:var(--muted);margin:.4rem 0}.ax-legend i{display:inline-block;width:.8rem;height:.8rem;border-radius:3px;margin-inline-end:.3rem;vertical-align:-.1rem}
.ax .tbl-x{overflow-x:auto;max-width:100%;-webkit-overflow-scrolling:touch}.ax .card,.ax section{min-width:0}
.ax-sr{position:absolute!important;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.ax-upd{margin:-.5rem 0 .8rem}.ax-filt{display:flex;flex-wrap:wrap;gap:.6rem 1rem;align-items:flex-end;margin:0 0 .6rem}.ax-filt label{display:flex;flex-direction:column;gap:.2rem;font-size:.78rem;font-weight:650;color:var(--muted)}.ax-filt select,.ax-filt input{min-height:40px;min-width:8.5rem;max-width:100%}.ax-cust{display:flex;gap:.6rem;flex-wrap:wrap}
.ax-meta{display:flex;flex-wrap:wrap;gap:.3rem .5rem;align-items:center;font-size:.82rem;color:var(--muted);margin:0 0 1rem}
.ax-live{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,240px),1fr));gap:.85rem;margin-bottom:1rem}.ax-live .card{padding:.9rem 1.1rem}.ax-live .l,.ax-live .s{font-size:.78rem;color:var(--muted)}.ax-live .l{font-weight:650}.ax-live .v{font-size:1.4rem;font-weight:800;font-variant-numeric:tabular-nums}.ax-live .v small{font-size:.8rem;color:var(--muted);font-weight:600}
.ax-k{position:relative;display:flex;flex-direction:column;gap:.15rem;min-width:0}.ax-k .l{display:flex;align-items:center;gap:.35rem}.ax-k .v{font-size:1.5rem;overflow-wrap:anywhere}.ax-k .s{font-size:.78rem;color:var(--muted);display:flex;gap:.35rem;flex-wrap:wrap;align-items:center}
.ax-d{font-weight:700;font-variant-numeric:tabular-nums}.ax-d.up{color:var(--a-ok)}.ax-d.down{color:var(--a-bad)}.ax-sp{width:100%;height:26px;margin-top:.35rem}.ax-sp polyline{fill:none;stroke:var(--primary);stroke-width:2;vector-effect:non-scaling-stroke;stroke-linejoin:round}
.ax-i{position:relative;display:inline-block}.ax-i summary{list-style:none;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:50%;border:1px solid var(--line);font-size:.72rem;font-style:italic;font-weight:700;color:var(--muted)}.ax-i summary::-webkit-details-marker{display:none}.ax-i summary:focus-visible{outline:2px solid var(--primary);outline-offset:1px}
.ax-i p{position:absolute;z-index:5;top:28px;left:-.5rem;width:min(15rem,70vw);margin:0;padding:.55rem .7rem;border-radius:10px;background:var(--surface);border:1px solid var(--line);box-shadow:var(--a-card-shadow);font-size:.78rem;font-weight:500;line-height:1.4;color:var(--text)}
.ax-charts{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr));gap:1rem 1.5rem}.ax-charts .ax-days{grid-column:1/-1}.ax-fig{margin:0;min-width:0}.ax-lc{position:relative;outline:none;border-radius:8px}.ax-lc:focus-visible{outline:2px solid var(--primary);outline-offset:3px}.ax-lc svg{display:block;width:100%;height:130px;touch-action:pan-y}
.ax-ln{fill:none;stroke:var(--primary);stroke-width:2;vector-effect:non-scaling-stroke;stroke-linejoin:round}.ax-ar{fill:color-mix(in srgb,var(--primary) 12%,transparent)}.ax-gr{stroke:var(--line);stroke-dasharray:3 4;vector-effect:non-scaling-stroke}.ax-base{stroke:var(--line);vector-effect:non-scaling-stroke}.ax-x{stroke:var(--muted);stroke-width:1;vector-effect:non-scaling-stroke}
.ax-ax{display:flex;justify-content:space-between;gap:.5rem;font-size:.72rem;color:var(--muted);margin-top:.25rem}.ax-tip{position:absolute;top:.25rem;width:150px;padding:.45rem .6rem;border-radius:8px;background:var(--surface);border:1px solid var(--line);box-shadow:var(--a-card-shadow);font-size:.76rem;line-height:1.45;pointer-events:none}
.ax-h3row{display:flex;flex-wrap:wrap;gap:.5rem;align-items:center;justify-content:space-between;margin-bottom:.6rem}.ax-seg{display:flex;flex-wrap:wrap;gap:.3rem}.ax-sort{all:unset;cursor:pointer;font-weight:inherit;white-space:nowrap}.ax-sort:focus-visible{outline:2px solid var(--primary);outline-offset:2px}.ax-tbl .num,.tbl .num{text-align:end;font-variant-numeric:tabular-nums}.ax-tbl tfoot th,.ax-tbl tfoot td{font-weight:800;border-top:2px solid var(--line)}
.ax-2col{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:.85rem;margin-top:1rem}.ax-dl{display:grid;grid-template-columns:1fr auto;gap:.45rem 1rem;margin:0;font-size:.88rem}.ax-dl dt{color:var(--muted)}.ax-dl dd{margin:0;font-weight:700;text-align:end;font-variant-numeric:tabular-nums}.ax-flags{margin-top:1.5rem}.ax-days summary{cursor:pointer;font-size:.85rem;color:var(--muted);min-height:32px}
.ax-conn{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:.5rem}.ax-howto ol{margin:.4rem 0 0;padding-inline-start:1.2rem;font-size:.88rem;line-height:1.5}.ax-howto li{margin:.25rem 0}
.ax-cap{display:grid;grid-template-columns:1fr auto;gap:.5rem 1rem;align-items:center;margin:.5rem 0}.ax-cap input{width:7rem}.ax-note{font-size:.8rem;color:var(--muted)}
.ax-rd{margin-bottom:1rem}.ax-rd-h{display:flex;flex-wrap:wrap;gap:.8rem 1.6rem;align-items:flex-start;justify-content:space-between}.ax-rd-h h3{margin:0;font-size:1.05rem;font-weight:800}.ax-rd-h p{margin:.25rem 0 0;font-size:.85rem;color:var(--muted);max-width:62ch}.ax-rd-h .vx-m{flex:0 1 260px;min-width:min(100%,220px)}
.ax-rd-g{margin:1.1rem 0 0}.ax-rd-g h4{margin:0 0 .45rem;font-size:.72rem;letter-spacing:.05em;text-transform:uppercase;color:var(--muted)}.ax-rd-l{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,330px),1fr));gap:.5rem}
.ax-rd-i{display:grid;grid-template-columns:auto minmax(0,1fr);gap:.2rem .65rem;padding:.7rem .8rem;border:1px solid var(--line);border-radius:12px;background:var(--surface);min-width:0}.ax-rd-i .ic{grid-row:span 4;width:1.6rem;height:1.6rem;border-radius:50%;display:grid;place-items:center;font-size:.8rem;font-weight:800}
.ax-rd-i.ok .ic{background:var(--a-ok-bg);color:var(--a-ok)}.ax-rd-i.wait .ic{background:var(--a-warn-bg);color:var(--a-warn)}.ax-rd-i.block .ic{background:var(--a-bad-bg);color:var(--a-bad)}.ax-rd-i.block{border-color:color-mix(in srgb,var(--again) 35%,var(--line))}
.ax-rd-t{display:flex;flex-wrap:wrap;align-items:center;gap:.3rem .5rem;font-weight:700;font-size:.9rem;min-width:0}.ax-rd-d,.ax-rd-do{margin:0;font-size:.82rem;overflow-wrap:anywhere}.ax-rd-d{color:var(--muted)}.ax-rd-i .vx-m{margin:.2rem 0}
.ax-rd-f{display:flex;flex-wrap:wrap;gap:.35rem;align-items:center;margin-top:.3rem}.ax-rd-s{display:inline-flex;flex-wrap:wrap;align-items:center;gap:.2rem .5rem;margin-inline-start:auto}.ax-rd-f select{width:auto;min-width:6.5rem;min-height:36px;padding-block:0;font-size:.82rem;max-width:100%}.ax-pc{display:inline-block;padding:.05rem .45rem;border-radius:6px;background:var(--surface-2);font-size:.72rem;font-weight:650;color:var(--muted)}
.ax-why{margin:0;font-size:.8rem;color:var(--muted);overflow-wrap:anywhere}.ax-why.ok{color:var(--a-ok)}.ax-plat .btn[disabled]{cursor:not-allowed;opacity:1;background:var(--surface-2);color:var(--muted);border-color:var(--line);box-shadow:none}
.ax-rev{margin-top:1.6rem}.ax-emp{border:1px dashed var(--line);border-radius:12px;background:var(--surface-2);margin:.4rem 0 0}.ax-emp .btn{margin-top:.7rem}.ax-fold{margin-top:1rem}.ax-fold>summary{cursor:pointer;min-height:44px;display:flex;align-items:center;gap:.5rem;font-weight:650;font-size:.88rem;color:var(--muted)}
.axp-addon{display:flex;gap:.75rem;align-items:flex-start;padding:.85rem 1rem;border-radius:12px;background:var(--a-info-bg);border:1px solid color-mix(in srgb,var(--accent) 30%,transparent);margin-bottom:1rem}.axp-addon b{display:block}.axp-addon p{margin:.15rem 0 0;font-size:.82rem;color:var(--muted)}.axp-addon>span{font-size:1.3rem;line-height:1}
.axp-g{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,340px),1fr));gap:.85rem}.axp{display:grid;grid-template-columns:auto minmax(0,1fr);gap:.5rem 1rem;align-items:start;min-width:0}.axp h3{margin:0 0 .3rem;font-size:.95rem}.axp ul{margin:.35rem 0 0;padding-inline-start:1.1rem;font-size:.82rem;line-height:1.45}.axp li{margin:.15rem 0;overflow-wrap:anywhere}
.axp-m{grid-column:1/-1;margin:0;font-size:.78rem;color:var(--muted);border-top:1px solid var(--line);padding-top:.5rem;font-variant-numeric:tabular-nums}.axp-pl{display:flex;flex-wrap:wrap;gap:.3rem}
.axp-wf{box-sizing:border-box;width:72px;height:104px;border:2px solid var(--line);border-radius:12px;padding:7px 6px;display:flex;flex-direction:column;gap:4px;background:var(--surface-2);position:relative;overflow:hidden;flex:none}.axp-wf.pg{width:92px;height:84px;border-radius:6px}
.axp-wf i{display:block;flex:none;height:5px;border-radius:3px;background:color-mix(in srgb,var(--muted) 35%,transparent)}.axp-wf i.h{height:8px;width:65%;background:color-mix(in srgb,var(--muted) 60%,transparent)}.axp-wf i.c{height:18px;background:var(--surface);border:1px solid var(--line)}
.axp-wf b{display:block;flex:none;height:16px;border-radius:4px;background:color-mix(in srgb,var(--accent) 24%,transparent);border:1.5px dashed var(--accent)}.axp-wf b.full{position:absolute;inset:5px;height:auto}.axp-wf b.mod{position:absolute;left:9px;right:9px;top:34%;height:34px}
.axp-z{margin-top:1rem}.axp-zr{display:grid;grid-template-columns:minmax(0,13rem) minmax(0,1fr);gap:.4rem 1rem;padding:.65rem 0;border-top:1px solid var(--line);font-size:.84rem}.axp-zr:first-of-type{border-top:0}.axp-zr dt{font-weight:700}.axp-zr dd{margin:0;min-width:0}
.axp-rt{display:flex;flex-wrap:wrap;gap:.25rem;align-items:center}.axp-rt code{font-size:.74rem;padding:.08rem .4rem;border-radius:5px;background:var(--surface-2);color:var(--muted);overflow-wrap:anywhere}.axp-rt details{display:contents}.axp-rt summary{cursor:pointer;font-size:.76rem;color:var(--muted);min-height:24px;display:inline-flex;align-items:center}
.axp-h{display:flex;flex-wrap:wrap;align-items:center;gap:.4rem .6rem;margin:0 0 .3rem}.axp-h h4{margin:0;font-size:.86rem}
@media(max-width:600px){.axp-zr{grid-template-columns:1fr}.ax-rd-h .vx-m{flex-basis:100%}}`;

  function render(box, api, L, h) {
    const esc = h.esc, lang = h.lang || (() => 'vi'), my = ++gen, toast = h.toast || (() => {});
    const A = (vi, vars) => { const s = lang() === 'en' && Object.prototype.hasOwnProperty.call(EN, vi) ? EN[vi] : L(vi, vars); return vars ? String(s).replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? String(vars[k]) : m)) : s; };
    const LOC = () => (lang() === 'en' ? 'en-US' : 'vi-VN');
    const num = n => Number(n || 0).toLocaleString(LOC()), usd = n => '$' + Number(n || 0).toLocaleString(LOC(), { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const pct = x => (x == null || !isFinite(x) ? '–' : (x * 100).toLocaleString(LOC(), { maximumFractionDigits: 1 }) + '%');
    const secs = s => (s == null ? '–' : s < 60 ? Math.round(s) + ' s' : Math.floor(s / 60) + ' m ' + Math.round(s % 60) + ' s');
    if (!document.getElementById('ax-css')) { const st = document.createElement('style'); st.id = 'ax-css'; st.textContent = CSS; document.head.appendChild(st); }
    const SECS = [['overview', 'Tổng quan'], ['places', 'Vị trí'], ['freq', 'Tần suất'], ['guard', 'Giữ chân'], ['consent', 'Đồng ý']];
    const PL = { home: 'Trang Hôm nay', done: 'Thẻ kết quả cuối lượt', blog: 'Blog / trang SEO', blog_mid: 'Giữa bài blog', dict: 'Trang từ điển', banner: 'Biểu ngữ trong app', inter: 'Toàn màn hình', rew: 'Có thưởng', other: 'Khác' }, PF = { web: 'Web (AdSense)', android: 'Android (AdMob)', ios: 'iOS (AdMob)' };
    const plName = p => (PL[p] ? A(PL[p]) : /^rew:/.test(p) ? A('Có thưởng · {x}', { x: p.slice(4) }) : String(p).replace(/^u_/, ''));
    const ccName = c => { if (c === '_o') return A('Khác'); try { return new Intl.DisplayNames([LOC()], { type: 'region' }).of(c) || c; } catch (e) { return c; } };
    const RG = { eea: 'EEA + Anh + Thụy Sĩ (TCF v2.2)', us: 'Mỹ (luật bang)', row: 'Nơi khác' };
    const BOUNDS = { ads_cap_sessions: [3, 20, 3, 'phiên', 'Toàn màn hình tối đa 1 lần mỗi … phiên học'], ads_cap_gap: [10, 240, 10, 'phút', 'và cách nhau tối thiểu … phút'], ads_cap_firstday: [24, 336, 24, 'giờ', 'Không hiện toàn màn hình trong … giờ đầu'], ads_cap_newbie: [5, 50, 5, 'phiên', 'Người mới: không toàn màn hình trong … phiên học đầu'], ads_cap_daymax: [1, 4, 4, 'lần', 'Tối đa … lần toàn màn hình mỗi ngày'] };
    const ADMIN = { ads_ecpm_web: [0, 50, 1, 'USD', 'eCPM ước tính (USD / 1000 lượt)', 'web'], ads_ecpm_android: [0, 50, 1, 'USD', 'eCPM ước tính (USD / 1000 lượt)', 'android'], ads_ecpm_ios: [0, 50, 1, 'USD', 'eCPM ước tính (USD / 1000 lượt)', 'ios'], ads_guard_pct: [1, 50, 5, '%', 'Ngưỡng tụt giữ chân (%)'], ads_guard_min: [50, 100000, 200, '', 'Cỡ mẫu tối thiểu mỗi nhóm'] };
    const hd = (t, d, act = '', id = 'ax-t') => `<div class="ax-h"><div><h2 id="${id}" tabindex="-1">${esc(A(t))}</h2>${d ? `<p>${esc(A(d))}</p>` : ''}</div>${act}</div>`;
    const kpi = (l, v, s = '') => `<div class="card kpi"><div class="l">${esc(A(l))}</div><div class="v">${v}</div>${s ? `<div class="s">${s}</div>` : ''}</div>`;
    const empty = t => `<div class="empty"><span class="em-i" aria-hidden="true">💤</span><b>${esc(A(t))}</b></div>`;
    // empty state có hướng dẫn (cùng kiểu .empty của #998): tiêu đề + câu giải thích + nút dẫn tới việc cần làm
    const guide = (t, d, act = '') => `<div class="empty ax-emp" role="note"><span class="em-i" aria-hidden="true">💵</span><b>${esc(A(t))}</b>${esc(A(d))}${act ? `<div>${act}</div>` : ''}</div>`;
    const toReady = `<a class="btn sm" href="#ax-rd" data-to-rd>${esc(A('Xem điều kiện còn thiếu'))} ↑</a>`;
    const lazyJs = (name, src) => (window[name] ? Promise.resolve(true) : new Promise(y => { const sc = document.createElement('script'), t = setTimeout(() => y(!!window[name]), 4000); sc.src = src; sc.onload = () => { clearTimeout(t); y(!!window[name]); }; sc.onerror = () => { clearTimeout(t); y(false); }; document.head.appendChild(sc); }));
    // Dữ liệu thẻ sẵn sàng: ads.txt + app-ads.txt (fetch cùng nguồn, tự kiểm), ADS_CONFIG (js/ads/config.js), người thật/ngày 7 ngày trọn gần nhất (op live – Phân tích sẵn có, đã loại bot + quản trị)
    let RD = null;
    const txt = u => (typeof fetch === 'function' ? fetch(u, { cache: 'no-store' }).then(async r => ({ ok: r.ok, text: r.ok ? await r.text() : '' })) : Promise.resolve(null)).catch(() => null);
    const readyData = () => (RD = RD || Promise.all([txt('/ads.txt'), txt('/app-ads.txt'), lazyJs('ADS_CONFIG', 'js/ads/config.js'), Promise.resolve().then(() => api('live', { days: 7 })).catch(() => null)])
      .then(([ads, app, , lv]) => { const ser = ((lv && lv.series) || []).slice(-8, -1); return { txt: { ads, app }, conf: window.ADS_CONFIG || null, traffic: ser.length ? { avg: ser.reduce((a, x) => a + (+x.visitors || 0), 0) / ser.length } : null }; }));
    let S = null, CFG = null;
    const load = async force => { if (force) { S = null; CFG = null; RD = null; } [S, CFG] = await Promise.all([S || api('adsStats'), CFG || api('config')]); return S; };
    const cv = k => String(((CFG && CFG.values) || {})[k] ? CFG.values[k].v : '');
    const setCfg = async values => { try { await api('configSet', { values }); toast(A('Đã lưu')); CFG = null; return true; } catch (e) { toast(A('Không lưu được: {e}', { e: e.message || e }), 'bad'); return false; } };

    box.innerHTML = `<div class="ax"><nav class="ax-nav" aria-label="${esc(A('Các mục quảng cáo'))}">${SECS.map(([k, t]) => `<a class="ax-tab" href="#ads/${k}" data-sec="${k}">${esc(A(t))}</a>`).join('')}</nav><div class="ax-body" id="ax-body" tabindex="-1"></div></div>`;
    const nav = box.querySelector('.ax-nav'), body = box.querySelector('#ax-body');
    nav.addEventListener('click', e => { const a = e.target.closest('[data-sec]'); if (!a || e.button || e.metaKey || e.ctrlKey) return; e.preventDefault(); go(a.dataset.sec, true); });
    let tok = 0;
    function go(sec, user) {
      const t = ++tok, alive = () => t === tok && my === gen;
      nav.querySelectorAll('[data-sec]').forEach(a => (a.dataset.sec === sec ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current')));
      const keep = sec === 'overview' && /^#ads\/overview\?/.test(location.hash) ? String(location.hash).slice(String(location.hash).indexOf('?')) : '';
      try { history.replaceState(null, '', location.pathname + location.search + '#ads/' + sec + keep); } catch (e) { /* bỏ qua */ }
      body.innerHTML = `<div class="vx-sk" aria-busy="true" aria-label="${esc(A('Đang tải…'))}"><span class="sk sk-h"></span><span class="sk sk-block"></span></div>`;
      const fn = { overview, places, freq, guard, consent }[sec] || overview;
      load().then(() => alive() && fn(body)).then(() => { if (alive() && user) { const x = body.querySelector('#ax-t'); if (x) x.focus({ preventScroll: true }); } })
        .catch(e => { if (!alive()) return; body.innerHTML = `<div class="err-box" role="alert"><span>${esc(A('Không tải được: {e}', { e: e.message || e.code || 'error' }))}</span><button class="btn sm" type="button" data-retry>${esc(A('Thử lại'))}</button></div>`; body.querySelector('[data-retry]').onclick = () => { S = null; go(sec); }; });
    }
    const m = String(location.hash).match(/^#ads\/([a-z]+)/);
    go(m && SECS.some(s => s[0] === m[1]) ? m[1] : 'overview', false);

    // ---- biểu đồ cột SVG (doanh thu/ngày) ----
    const bars = (series, key, fmt) => AdminChart.bars(series, { key, fmt, x: x => x.day.slice(5), aria: series.map(x => x.day + ': ' + fmt(x[key])).slice(-7).join(', '), empty: A('Chưa có dữ liệu') });

    const RANGES = [['today', 'Hôm nay'], ['yday', 'Hôm qua'], ['7d', '7 ngày'], ['28d', '28 ngày'], ['mtd', 'Tháng này'], ['lm', 'Tháng trước'], ['custom', 'Tùy chọn']];
    const DEF = { rev: 'Doanh thu ước tính Google ghi nhận (USD); Google có thể điều chỉnh tới khi chốt số cuối tháng.', ecpm: 'eCPM = doanh thu ÷ lượt hiển thị × 1.000.', rpm: 'RPM trang = doanh thu web ÷ lượt xem trang × 1.000 (chỉ AdSense).', imp: 'Lượt hiển thị Google tính là đã hiện (đã tải và vào màn hình).', fill: 'Tỉ lệ lấp đầy = yêu cầu có quảng cáo trả về ÷ tổng yêu cầu quảng cáo.', ctr: 'CTR = lượt bấm ÷ lượt hiển thị.' };
    const qOf = () => { const mm = String(location.hash).match(/^#ads\/overview\?(.*)$/), p = new URLSearchParams(mm ? mm[1] : ''); return { r: RANGES.some(x => x[0] === p.get('r')) ? p.get('r') : '7d', p: p.get('p') || 'all', c: p.get('c') || '', f: p.get('f') || '', t: p.get('t') || '' }; };
    const qSet = q => { const p = new URLSearchParams(); if (q.r !== '7d') p.set('r', q.r); if (q.p !== 'all') p.set('p', q.p); if (q.c) p.set('c', q.c); if (q.r === 'custom') { p.set('f', q.f); p.set('t', q.t); } try { history.replaceState(null, '', location.pathname + location.search + '#ads/overview' + (String(p) ? '?' + p : '')); } catch (e) { /* bỏ qua */ } };
    let tabSt = { tab: 'place', k: 'usd', dir: -1 };
    const money = x => (x == null ? '–' : usd(x)), dev = x => (x == null ? '–' : (x > 0 ? '+' : '') + pct(x));
    const info = id => `<details class="ax-i"><summary aria-label="${esc(A('Định nghĩa'))}">i</summary><p>${esc(A(DEF[id]))}</p></details>`;
    const delta = (x, y) => { if (x == null || y == null || !(y > 0)) return `<span class="ax-d">–</span>`; const d = (x - y) / y, up = d >= 0; if (Math.abs(d) < 0.0005) return `<span class="ax-d">= ${esc(pct(0))}</span>`; return `<span class="ax-d ${up ? 'up' : 'down'}"><span aria-hidden="true">${up ? '▲' : '▼'}</span> ${esc(pct(Math.abs(d)))}<span class="ax-sr"> ${esc(A(up ? 'tăng' : 'giảm'))}</span></span>`; };
    const spark = (s, k) => { const v = s.map(x => +x[k] || 0), mx = Math.max(1e-9, ...v); return s.length < 2 ? '' : `<svg class="ax-sp" viewBox="0 0 100 24" preserveAspectRatio="none" aria-hidden="true"><polyline points="${v.map((y, i) => `${(i * 100 / (v.length - 1)).toFixed(1)},${(22 - y / mx * 20).toFixed(1)}`).join(' ')}"/></svg>`; };
    const lineChart = (s, key, title, fmt) => {
      const W = 600, H = 120, v = s.map(x => (x[key] == null ? 0 : +x[key])), mx = Math.max(1e-9, ...v), X = i => (s.length > 1 ? i * W / (s.length - 1) : W / 2), Y = y => H - 4 - y / mx * (H - 12);
      const area = `0,${H} ${v.map((y, i) => `${X(i).toFixed(1)},${Y(y).toFixed(1)}`).join(' ')} ${W},${H}`;
      return `<figure class="ax-fig"><figcaption class="h3">${esc(A(title))}</figcaption><div class="ax-lc" data-key="${key}" tabindex="0" role="img" aria-label="${esc(A(title) + ': ' + s.map(x => x.day + ' ' + fmt(x[key])).slice(-7).join(', '))}">
        <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"><line class="ax-gr" x1="0" x2="${W}" y1="${H / 2}" y2="${H / 2}"/><line class="ax-base" x1="0" x2="${W}" y1="${H - 0.5}" y2="${H - 0.5}"/><polygon class="ax-ar" points="${area}"/><polyline class="ax-ln" points="${v.map((y, i) => `${X(i).toFixed(1)},${Y(y).toFixed(1)}`).join(' ')}"/><line class="ax-x" x1="-9" x2="-9" y1="0" y2="${H}"/></svg>
        <div class="ax-ax"><span>${esc(s[0].day)}</span><span>${esc(A('cao nhất'))} ${esc(fmt(mx))}</span><span>${esc(s[s.length - 1].day)}</span></div><div class="ax-tip" hidden></div></div></figure>`;
    };
    function dash(el, q) {
      const R = S.real, a = agg(R, q), c = a.cur, p = a.prev, gf = +(cv('ads_guard') || 1), co = (S.guard && S.guard.co) || {}, ca = co.a || {}, ch = co.h || {};
      const opt = (v, l, sel) => `<option value="${esc(v)}"${v === sel ? ' selected' : ''}>${esc(l)}</option>`;
      const tile = (id, label, val, x, y, k) => `<div class="card kpi ax-k"><div class="l">${esc(A(label))} ${info(id)}</div><div class="v">${esc(val)}</div><div class="s">${delta(x, y)} <span class="ax-vs">${esc(A('so với kỳ trước'))}</span></div>${spark(a.series, k)}</div>`;
      const MC = [['usd', 'Doanh thu', r => money(r.usd), r => r.usd.toFixed(2)], ['imp', 'Hiển thị', r => num(r.imp), r => r.imp], ['ecpm', 'eCPM', r => money(r.ecpm), r => (r.ecpm == null ? '' : r.ecpm.toFixed(2))], ['fill', 'Tỉ lệ lấp đầy', r => pct(r.fill), r => (r.fill == null ? '' : r.fill.toFixed(4))], ['click', 'Bấm', r => num(r.click), r => r.click], ['ctr', 'CTR', r => pct(r.ctr), r => (r.ctr == null ? '' : r.ctr.toFixed(4))]];
      const TABS = { place: ['Theo vị trí', a.places, [['plat', 'Nền tảng', r => A(PF[r.plat] || r.plat), r => r.plat], ['place', 'Vị trí đặt', r => plName(r.place), r => r.place]]], plat: ['Theo nền tảng', a.plats, [['plat', 'Nền tảng', r => A(PF[r.plat] || r.plat), r => r.plat]]], country: ['Theo quốc gia', a.countries, [['cc', 'Quốc gia', r => ccName(r.cc), r => r.cc]]] };
      const [, list, dimCols] = TABS[tabSt.tab], cols = [...dimCols, ...MC];
      const sorted = list.slice().sort((x, y) => { const u = x[tabSt.k], w = y[tabSt.k]; return (u == null) - (w == null) || (typeof u === 'string' ? String(u).localeCompare(String(w)) : (u || 0) - (w || 0)) * tabSt.dir; });
      const tot = (fin(list.reduce((s, r) => { for (const m of M6) s[m] += r[m] || 0; return s; }, { earn: 0, imp: 0, click: 0, req: 0, mreq: 0, pv: 0 })));
      const table = sorted.length ? `<div class="tbl-x" tabindex="0"><table class="tbl ax-tbl"><caption class="ax-sr">${esc(A(TABS[tabSt.tab][0]))}</caption><thead><tr>${cols.map(([k, l], i) => `<th scope="col"${i >= dimCols.length ? ' class="num"' : ''} aria-sort="${tabSt.k === k ? (tabSt.dir > 0 ? 'ascending' : 'descending') : 'none'}"><button type="button" class="ax-sort" data-sort="${k}">${esc(A(l))}<span aria-hidden="true">${tabSt.k === k ? (tabSt.dir > 0 ? ' ▲' : ' ▼') : ''}</span></button></th>`).join('')}</tr></thead>
        <tbody>${sorted.map(r => `<tr>${cols.map(([, , f], i) => `<td${i >= dimCols.length ? ' class="num"' : ''}>${esc(f(r))}</td>`).join('')}</tr>`).join('')}</tbody>
        <tfoot><tr><th scope="row"${dimCols.length > 1 ? ` colspan="${dimCols.length}"` : ''}>${esc(A('Tổng'))}</th>${MC.map(([, , f]) => `<td class="num">${esc(f(tot))}</td>`).join('')}</tr></tfoot></table></div>` : empty('Chưa có số trong khoảng này.');
      const hasPay = R.pay && (R.pay.balance || R.pay.last);
      const none = !(R.rows || []).length, fold = !a.has && !hasPay; // chưa có số → bảng chi tiết + ước tính/thật/thanh toán thu gọn (mở được), không phô dãy $0.00
      const brk = `<section class="card"><div class="ax-h3row"><div class="ax-seg" role="group" aria-label="${esc(A('Chi tiết'))}">${Object.entries(TABS).map(([k, [l]]) => `<button type="button" class="btn sm ${tabSt.tab === k ? 'primary' : 'ghost'}" data-tab="${k}" aria-pressed="${tabSt.tab === k}">${esc(A(l))}</button>`).join('')}</div><button class="btn sm ghost" type="button" data-csv${sorted.length ? '' : ' disabled'}>⬇ CSV</button></div>${table}</section>`;
      el.innerHTML = hd('Doanh thu quảng cáo', '', '', 'ax-rev-h')
        + `<p class="ax-note ax-upd" role="status">${esc(A('Số Google cập nhật lúc {t} · trễ vài giờ và có thể được điều chỉnh', { t: new Date(R.at).toLocaleString(LOC()) }))}</p>`
        + `<form class="ax-filt" id="ax-filt" aria-label="${esc(A('Bộ lọc'))}"><label>${esc(A('Khoảng ngày'))}<select name="r">${RANGES.map(([v, l]) => opt(v, A(l), q.r)).join('')}</select></label>
          <span class="ax-cust"${q.r === 'custom' ? '' : ' hidden'}><label>${esc(A('Từ'))}<input type="date" name="f" value="${esc(a.from)}" max="${esc(a.rt)}"></label><label>${esc(A('Đến'))}<input type="date" name="t" value="${esc(a.to)}" max="${esc(a.rt)}"></label></span>
          <label>${esc(A('Nền tảng'))}<select name="p">${opt('all', A('Tất cả'), q.p)}${['web', 'android', 'ios'].map(x => opt(x, A(PF[x]), q.p)).join('')}</select></label>
          <label>${esc(A('Quốc gia'))}<select name="c">${opt('', A('Tất cả'), q.c)}${a.ccs.map(x => [x, ccName(x)]).sort((x, y) => (x[0] === '_o') - (y[0] === '_o') || x[1].localeCompare(y[1])).map(([x, n]) => opt(x, n, q.c)).join('')}</select></label></form>`
        + `<p class="ax-meta"><span class="chip ${a.final ? 'ok' : 'warn'}">${esc(A(a.final ? 'Đã chốt' : 'Ước tính'))}</span> <span>${esc(a.from === a.to ? a.from : a.from + ' → ' + a.to)}</span> · <span>${esc(A('kỳ trước'))}: ${esc(a.prevFrom + ' → ' + a.prevTo)}</span>${q.c ? ` · <span>${esc(A('Lọc quốc gia: Android + iOS gộp (AdMob không chia nước theo nền tảng).'))}</span>` : ''}</p>`
        + `<div class="ax-live"><div class="card"><div class="l">${esc(A('Hôm nay (Google, ước tính)'))}</div><div class="v">${esc(a.today.imp || a.today.earn ? usd(a.today.usd) : '–')}</div><div class="s">${esc(a.today.imp || a.today.earn ? num(a.today.imp) + ' ' + A('lượt hiển thị') : A('Google chưa có số hôm nay'))}</div></div>
          <div class="card"><div class="l">${esc(A('Đang diễn ra (bộ đếm nội bộ)'))}</div><div class="v">${esc(num(R.live.imp))} <small>${esc(A('lượt hiển thị'))}</small></div><div class="s">${esc(num(R.live.click))} ${esc(A('bấm'))} · ${esc(num(R.live.rew))} ${esc(A('thưởng'))} · ${esc(A('gần thời gian thực, giờ Việt Nam'))}</div></div></div>`
        + (a.has ? `<div class="kpis ax-kpis">${tile('rev', 'Doanh thu', usd(c.usd), c.usd, p.usd, 'usd')}${tile('ecpm', 'eCPM', money(c.ecpm), c.ecpm, p.ecpm, 'ecpm')}${c.pv ? tile('rpm', 'RPM trang', money(c.rpm), c.rpm, p.rpm, 'rpm') : ''}${tile('imp', 'Lượt hiển thị', num(c.imp), c.imp, p.imp, 'imp')}${tile('fill', 'Tỉ lệ lấp đầy', pct(c.fill), c.fill, p.fill, 'fill')}${tile('ctr', 'CTR', pct(c.ctr), c.ctr, p.ctr, 'ctr')}</div>`
          + `<section class="card ax-charts">${lineChart(a.series, 'usd', 'Doanh thu theo ngày (USD)', usd)}${lineChart(a.series, 'ecpm', 'eCPM theo ngày (USD)', money)}
            <details class="ax-days"><summary>${esc(A('Xem bảng số liệu theo ngày'))}</summary><div class="tbl-x" tabindex="0"><table class="tbl"><thead><tr><th scope="col">${esc(A('Ngày'))}</th><th scope="col" class="num">${esc(A('Doanh thu'))}</th><th scope="col" class="num">eCPM</th><th scope="col" class="num">${esc(A('Hiển thị'))}</th></tr></thead><tbody>${a.series.slice().reverse().map(x => `<tr><td>${esc(x.day)}</td><td class="num">${esc(usd(x.usd))}</td><td class="num">${esc(money(x.ecpm))}</td><td class="num">${esc(num(x.imp))}</td></tr>`).join('')}</tbody></table></div></details></section>`
          : none ? guide('Chưa có doanh thu', 'Quảng cáo đang tắt. Doanh thu hiện ở đây vài giờ sau lượt hiển thị đầu tiên.', toReady) : guide('Chưa có số trong khoảng này.', 'Không có số trong khoảng ngày này. Thử khoảng dài hơn hoặc bỏ bộ lọc.'))
        + (sorted.length ? brk : `<details class="ax-fold"><summary>${esc(A('Chi tiết theo vị trí/nền tảng/quốc gia – chưa có dữ liệu'))}</summary>${brk}</details>`)
        + (fold ? `<details class="ax-fold"><summary>${esc(A('Ước tính vs thật · Thanh toán · Hiệu quả – chưa có dữ liệu'))}</summary>` : '') + `<div class="ax-2col"><section class="card"><h3 class="h3">${esc(A('Ước tính nội bộ vs số thật'))}</h3><p class="ax-note">${esc(A('ước tính = lượt hiển thị đo trong app × eCPM đặt tay ở mục Tần suất'))}</p><div class="tbl-x" tabindex="0"><table class="tbl"><thead><tr><th scope="col">${esc(A('Nền tảng'))}</th><th scope="col" class="num">${esc(A('Ước tính'))}</th><th scope="col" class="num">${esc(A('Thật'))}</th><th scope="col" class="num">${esc(A('Độ lệch'))}</th></tr></thead><tbody>${a.vs.map(v => `<tr><td>${esc(A(PF[v.plat]))}</td><td class="num">${esc(usd(v.est))}</td><td class="num">${esc(usd(v.real))}</td><td class="num">${esc(dev(v.dev))}</td></tr>`).join('')}</tbody></table></div></section>`
        + `<section class="card"><h3 class="h3">${esc(A('Thanh toán'))}</h3>${hasPay ? `<dl class="ax-dl"><dt>${esc(A('Số dư hiện tại'))}</dt><dd>${esc(R.pay.balance || '–')}</dd><dt>${esc(A('Ngưỡng thanh toán'))}</dt><dd>$100 <span class="ax-note">(${esc(A('mặc định AdSense/AdMob'))})</span></dd><dt>${esc(A('Lần trả gần nhất'))}</dt><dd>${esc(R.pay.last ? R.pay.last.amount + ' · ' + R.pay.last.date : '–')}</dd></dl><p class="ax-note">${esc(A('AdMob dùng chung hồ sơ thanh toán với AdSense.'))}</p>` : `<p class="ax-note">${esc(A('Chưa có dữ liệu thanh toán – cập nhật ở lượt đồng bộ đêm.'))}</p>`}</section>`
        + `<section class="card"><h3 class="h3">${esc(A('Hiệu quả vs trải nghiệm'))}</h3><dl class="ax-dl"><dt>${esc(A('Doanh thu / 1.000 phiên có quảng cáo'))}</dt><dd>${esc(money(a.per1k))}</dd><dt>${esc(A('Giữ chân D1 (có QC / đối chứng)'))}</dt><dd>${esc(pct(ca.d1))} / ${esc(pct(ch.d1))}</dd><dt>${esc(A('Giữ chân D7 (có QC / đối chứng)'))}</dt><dd>${esc(pct(ca.d7))} / ${esc(pct(ch.d7))}</dd><dt>${esc(A('Hệ số cổng giữ chân'))}</dt><dd>×${esc(String(gf))}</dd></dl><p class="ax-note">${esc(A('Đối chứng = 10 % người dùng không thấy quảng cáo; cửa sổ 14 ngày. Chi tiết ở mục Giữ chân.'))}</p></section></div>${fold ? '</details>' : ''}`
        + `<p class="ax-note">${esc(A('Ngày báo cáo theo múi giờ tài khoản Google (AdSense: giờ Thái Bình Dương, America/Los_Angeles); bộ đếm nội bộ theo giờ Việt Nam. Số tháng hiện tại là ước tính, Google chốt sau khi hết tháng.'))}</p>`;
      const f = el.querySelector('#ax-filt');
      f.addEventListener('change', () => { const d = Object.fromEntries(new FormData(f)); const nq = { r: d.r, p: d.p, c: d.c, f: d.f || a.from, t: d.t || a.to }; qSet(nq); dash(el, nq); });
      el.querySelectorAll('[data-tab]').forEach(b => { b.onclick = () => { tabSt = { tab: b.dataset.tab, k: 'usd', dir: -1 }; dash(el, q); const x = el.querySelector(`[data-tab="${b.dataset.tab}"]`); if (x) x.focus(); }; });
      el.querySelectorAll('[data-sort]').forEach(b => { b.onclick = () => { const k = b.dataset.sort; tabSt = { ...tabSt, k, dir: tabSt.k === k ? -tabSt.dir : (['plat', 'place', 'cc'].includes(k) ? 1 : -1) }; dash(el, q); const x = el.querySelector(`[data-sort="${k}"]`); if (x) x.focus(); }; });
      const cb = el.querySelector('[data-csv]');
      if (cb) cb.onclick = () => { const txt = csvOf(cols.map(x => A(x[1])), sorted.map(r => cols.map(x => x[3](r)))); try { const u = URL.createObjectURL(new Blob(['﻿' + txt], { type: 'text/csv' })), l = document.createElement('a'); l.href = u; l.download = `lexkite-ads-${tabSt.tab}-${a.from}_${a.to}.csv`; document.body.appendChild(l); l.click(); l.remove(); setTimeout(() => URL.revokeObjectURL(u), 1000); } catch (e) { toast(A('Không tải được: {e}', { e: e.message || e }), 'bad'); } };
      // Hover/phím: đường dọc + chú giải số (cả doanh thu và eCPM của ngày đó)
      el.querySelectorAll('.ax-lc').forEach(box => {
        const tip = box.querySelector('.ax-tip'), xl = box.querySelector('.ax-x'), n = a.series.length; let at = n - 1;
        const show = i => { at = Math.max(0, Math.min(n - 1, i)); const d = a.series[at], x = n > 1 ? at * 600 / (n - 1) : 300; xl.setAttribute('x1', x); xl.setAttribute('x2', x);
          tip.hidden = false; tip.innerHTML = `<b>${esc(d.day)}</b><br>${esc(A('Doanh thu'))}: ${esc(usd(d.usd))}<br>eCPM: ${esc(money(d.ecpm))}<br>${esc(A('Hiển thị'))}: ${esc(num(d.imp))}`;
          const w = box.clientWidth || 600; tip.style.left = Math.min(Math.max(0, x / 600 * w - 70), Math.max(0, w - 150)) + 'px'; };
        const hide = () => { tip.hidden = true; xl.setAttribute('x1', -9); xl.setAttribute('x2', -9); };
        box.addEventListener('pointermove', e => { const r = box.getBoundingClientRect(); show(Math.round((e.clientX - r.left) / Math.max(1, r.width) * (n - 1))); });
        box.addEventListener('pointerleave', hide); box.addEventListener('blur', hide); box.addEventListener('focus', () => show(at));
        box.addEventListener('keydown', e => { if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); show(at + (e.key === 'ArrowRight' ? 1 : -1)); } else if (e.key === 'Escape') hide(); });
      });
    }
    // ---- Thẻ "Sẵn sàng bật quảng cáo" (mẫu Stitch 10/11): chữ từng điều kiện, trạng thái tay (ads_ready), lý do khóa nút Bật ----
    const RT = { irs: ['Thư IRS (EIN của LLC)', 'Chờ thư IRS gửi về LLC; nhận được thì đánh dấu Đạt.'], adsense: ['Tài khoản AdSense được duyệt', 'Sửa theo chính sách chương trình rồi bấm Request review ở AdSense › Sites.'],
      admob: ['Tài khoản AdMob được duyệt', 'AdMob › Policy center: xử lý vi phạm rồi bấm Request review.'], ios_store: ['App iOS liên kết App Store trong AdMob', 'Sau khi AdMob duyệt: Apps › iOS › Add store (App Store) để Google kiểm app-ads.txt.'],
      cmp: ['Thông điệp đồng ý (CMP) đã xuất bản', 'AdSense/AdMob › Privacy & messaging: tạo thông điệp GDPR + luật bang Mỹ rồi Publish.'], pingpong: ['Nhận tiền: PingPong đứng tên LLC', 'Đổi tài khoản nhận tiền sang tên LLC trước ngưỡng thanh toán $100 – không khóa nút Bật.'],
      ads_txt: ['ads.txt hợp lệ', 'Có dòng google.com, pub-…, DIRECT đúng mã nhà xuất bản.'], app_ads_txt: ['app-ads.txt hợp lệ', 'Có dòng google.com, pub-…, DIRECT đúng mã nhà xuất bản.'],
      code_web: ['Mã ô AdSense cho web', 'Tạo ô hiển thị ở AdSense › Ads › By ad unit rồi dán mã vào config.js.'], code_app: ['Bản app phát hành dùng mã thật', 'Bản phát hành: testing: false + build ADS_NATIVE=1.'],
      ssv: ['Xác minh thưởng phía máy chủ (SSV)', 'Đặt biến Pages ADS_SSV=1 và dán URL /api/ads-reward vào ô có thưởng trong AdMob.'], enabled: ['Mã quảng cáo bật trong code (enabled: true)', 'Đổi enabled: true trong lần ship bật quảng cáo.'],
      traffic: ['Người thật mỗi ngày', 'Khuyến nghị, không khóa nút Bật: đủ người để lấp đầy và cổng giữ chân có mẫu.'] };
    const WHY = { 'adsense:block': 'Google: "Your account wasn\'t approved – Meet program policies" (kiểm 10/11).', 'admob:block': 'Google: "Your account wasn\'t approved – Meet program policies" (kiểm 10/11).',
      http: 'Không tải được tệp – thử lại sau.', missing: 'Thiếu dòng google.com, pub-…, DIRECT.', placeholder: 'Đang là mã giữ chỗ pub-0000….', mismatch: 'Mã trong tệp khác mã ở web/js/ads/config.js.', nocfg: 'Không đọc được web/js/ads/config.js.',
      pub: 'Chưa có mã nhà xuất bản.', slots: 'Chưa dán mã ô (home, blog…) vào config.js.', testing: 'native.testing: true – app đang dùng mã THỬ của Google.', off: 'web/js/ads/config.js đang enabled: false (đúng khi còn chờ duyệt).', na: 'Không đọc được số liệu Phân tích.' };
    const STL = { ok: 'Đạt', wait: 'Chờ', block: 'Chặn' }, CHIP = { ok: 'ok', wait: 'warn', block: 'bad' }, ICO = { ok: '✓', wait: '…', block: '✕' }, GRP = [['acct', 'Tài khoản & giấy tờ'], ['tech', 'Kỹ thuật'], ['reach', 'Lưu lượng']];
    const SHORT = { irs: 'IRS', adsense: 'AdSense', admob: 'AdMob', ios_store: 'App Store', cmp: 'CMP', ads_txt: 'ads.txt', app_ads_txt: 'app-ads.txt', code_web: 'mã ô web', code_app: 'mã app thật', ssv: 'SSV', enabled: 'enabled' }; // tên ngắn cho lý do khóa trên thẻ nền tảng
    const PS = { web: 'Web', android: 'Android', ios: 'iOS' }, man = () => { try { return JSON.parse(cv('ads_ready') || '{}') || {}; } catch (e) { return {}; } };
    const readyCard = rd => {
      const row = i => {
        const [title, todo] = RT[i.k], chips = `${i.p.map(p => `<span class="ax-pc">${esc(PS[p])}</span>`).join('')}${i.who === 'o' ? `<span class="chip info">${esc(A('Việc của anh'))}</span>` : ''}${i.soft ? `<span class="chip muted">${esc(A('Khuyến nghị'))}</span>` : ''}`;
        const det = i.k === 'traffic' && i.v.m ? AdminChart.meter(A('Người thật/ngày (TB 7 ngày)'), i.v.n, i.v.m, '', { goal: 1, fmt: num }) : i.st === 'ok' ? (i.m ? A('Đã đạt.') : A(todo)) : WHY[i.why] || WHY[i.k + ':' + i.st] ? A(WHY[i.why] || WHY[i.k + ':' + i.st]) : '';
        const sel = i.m ? `<span class="ax-rd-s"><select data-man="${i.k}" aria-label="${esc(A('Trạng thái: {t}', { t: A(title) }))}">${['ok', 'wait', 'block'].map(x => `<option value="${x}"${x === i.st ? ' selected' : ''}>${esc(A(STL[x]))}</option>`).join('')}</select><span class="tiny muted">${esc(i.v.at ? A('đánh dấu tay {t}', { t: new Date(i.v.at).toLocaleDateString(LOC()) }) : A('mặc định theo lần kiểm 10/11'))}</span></span>` : '';
        return `<li class="ax-rd-i ${i.st}"><span class="ic" aria-hidden="true">${ICO[i.st]}</span><div class="ax-rd-t">${esc(A(title))} <span class="chip ${CHIP[i.st]}">${esc(A(STL[i.st]))}</span></div>${det && det[0] === '<' ? det : det ? `<p class="ax-rd-d">${esc(det)}</p>` : ''}${i.st !== 'ok' && !(i.k === 'traffic' && !i.v.m) ? `<p class="ax-rd-do">→ ${esc(A(todo))}</p>` : ''}<div class="ax-rd-f">${chips}${sel}</div></li>`;
      };
      return `<section class="card ax-rd" id="ax-rd" tabindex="-1" aria-labelledby="ax-rd-h"><div class="ax-rd-h"><div><h3 id="ax-rd-h">${esc(A('Sẵn sàng bật quảng cáo'))}</h3><p>${esc(A('Nút Bật của mỗi nền tảng chỉ mở khi mọi điều kiện bắt buộc của nền tảng đó đạt. Công tắc khẩn cấp luôn dùng được.'))}</p></div>${AdminChart.meter(A('Điều kiện đạt'), rd.met, rd.items.length, '', { goal: 1, fmt: num })}</div>`
        + GRP.map(([g, t]) => `<div class="ax-rd-g"><h4>${esc(A(t))}</h4><ul class="ax-rd-l">${rd.items.filter(i => i.g === g).map(row).join('')}</ul></div>`).join('') + `</section>`;
    };
    async function overview(el) {
      const kill = cv('ads_kill') === '1', on = p => cv('ads_' + p) === '1';
      const rd = readyOf({ ...(await readyData()), man: man() });
      const last7 = S.series.slice(-7), rev7 = last7.reduce((a, x) => a + x.rev, 0) / 7, imp30 = S.series.reduce((a, x) => a + x.imp, 0);
      const req = S.places.reduce((a, x) => a + x.req, 0), fill = req ? S.places.reduce((a, x) => a + x.imp + x.show, 0) / req : null;
      const rev30 = S.series.reduce((a, x) => a + x.rev, 0), ecpm = imp30 ? rev30 / imp30 * 1000 : null, gf = +(cv('ads_guard') || 1);
      const R = S.real || {};
      // Nút Bật khóa (disabled + lý do aria-describedby) khi nền tảng còn điều kiện bắt buộc chưa đạt; Tắt + công tắc khẩn cấp luôn bấm được
      const plat = p => { const bl = rd.block[p], lock = !on(p) && bl.length > 0, names = bl.map(i => A(SHORT[i.k] || i.k)).join(' · ');
        return `<div class="card ax-plat"><div class="row"><b>${esc(A(PF[p]))}</b><span class="chip ${on(p) && !kill ? 'ok' : 'muted'}">${esc(A(on(p) && !kill ? 'Đang bật' : 'Đang tắt'))}</span></div>
          <p class="ax-why${bl.length ? '' : ' ok'}" id="ax-why-${p}">${bl.length ? `🔒 ${esc(A('Khóa – còn {n} điều kiện', { n: bl.length }))} · ${esc(A('Còn: {x}', { x: names }))}` : `✓ ${esc(A('Đủ điều kiện'))}`}</p>
          <div class="row"><span class="small muted">${esc(usd((S.plat[p] || {}).rev || 0))} · ${num((S.plat[p] || {}).imp || 0)}</span><button class="btn sm ${on(p) || lock ? 'ghost' : 'primary'}" type="button" data-flag="ads_${p}" data-v="${on(p) ? '0' : '1'}"${lock ? ` disabled aria-describedby="ax-why-${p}"` : ''}>${lock ? '🔒 ' : ''}${esc(A(on(p) ? 'Tắt' : 'Bật'))}</button></div></div>`; };
      const flags = (kill ? `<div class="card ax-kill" role="alert">${esc(A('Công tắc khẩn cấp đang BẬT – mọi quảng cáo dừng trên mọi nền tảng (≤ 1 giờ do bộ đệm cấu hình).'))}</div>` : !['web', 'android', 'ios'].some(on) ? `<p class="ax-note">${esc(A('Mọi cờ đang tắt: app không tải mã quảng cáo nào. Bật cần cả mã nhà xuất bản trong web/js/ads/config.js (enabled: true).'))}</p>` : '')
        + `<h3 class="h3">${esc(A('Trạng thái theo nền tảng'))}</h3><div class="ax-plats">${['web', 'android', 'ios'].map(plat).join('')}
          <div class="card ax-plat ${kill ? 'ax-kill' : ''}"><div class="row"><b>⛔ ${esc(A('Công tắc khẩn cấp'))}</b></div><button class="btn sm ${kill ? 'primary' : 'danger'}" type="button" data-flag="ads_kill" data-v="${kill ? '0' : '1'}">${esc(A(kill ? 'Mở lại quảng cáo' : 'TẮT TOÀN BỘ quảng cáo'))}</button>
          <div class="row"><span class="small">${esc(A('Toàn màn hình cuối phiên'))}</span><button class="btn sm ghost" type="button" data-flag="ads_inter" data-v="${cv('ads_inter') === '0' ? '1' : '0'}">${esc(A(cv('ads_inter') === '0' ? 'Bật' : 'Tắt'))}</button></div>
          <div class="row"><span class="small">${esc(A('Có thưởng'))}</span><button class="btn sm ghost" type="button" data-flag="ads_rew" data-v="${cv('ads_rew') === '0' ? '1' : '0'}">${esc(A(cv('ads_rew') === '0' ? 'Bật' : 'Tắt'))}</button></div></div></div>`;
      const conn = `<div class="ax-conn"><p class="ax-note">${esc(A('Báo cáo AdSense/AdMob: chưa kết nối – đang hiện số ước tính.'))}</p><button class="btn sm primary" type="button" data-howto aria-expanded="false" aria-controls="ax-howto">🔗 ${esc(A('Nối Google'))}</button></div>
          <div id="ax-howto" class="ax-howto" hidden><h4 class="h3">${esc(A('Cách nối báo cáo Google (1 lần)'))}</h4><ol>${['Google Cloud Console › dự án lexkite-app: màn hình đồng ý OAuth ở trạng thái "In production" (để "Testing" thì token hết hạn sau 7 ngày) + client OAuth loại "Desktop app" → tải file JSON của client.', 'Bật 2 API: AdSense Management API và AdMob API.', 'Trên máy Mac: node scripts/ads-oauth.mjs --client <file JSON> → đăng nhập vintagezulilyjewelry@gmail.com → Allow. Script tự đặt 3 secret GitHub (ADS_OAUTH_CLIENT_ID, ADS_OAUTH_CLIENT_SECRET, ADS_OAUTH_REFRESH).', 'GitHub › Actions › Ads revenue › Run workflow. Số thật hiện ở đây sau khoảng 1 phút, rồi tự cập nhật mỗi ngày lúc 06:00 UTC.'].map(t => `<li>${esc(A(t))}</li>`).join('')}</ol></div>`;
      // Doanh thu ở DƯỚI trạng thái: đã nối Google → bảng kiểu AdSense (dash); chưa nối → ước tính (lượt hiển thị × eCPM đặt tay), chưa có lượt nào → empty state có hướng dẫn thay cho dãy $0.00
      const est = !(imp30 || rev30) ? hd('Doanh thu quảng cáo', '', '', 'ax-rev-h') + guide('Chưa có doanh thu', 'Quảng cáo đang tắt. Doanh thu hiện ở đây vài giờ sau lượt hiển thị đầu tiên.', toReady) + `<div class="card ax-fold">${conn}</div>`
        : hd('Doanh thu quảng cáo', '', '', 'ax-rev-h') + `<div class="kpis">${kpi('Doanh thu ước tính/ngày (7 ngày)', esc(usd(rev7)))}${kpi('Lượt hiển thị (30 ngày)', esc(num(imp30)))}${kpi('Tỉ lệ lấp đầy', esc(pct(fill)))}${kpi('eCPM (proxy)', esc(ecpm == null ? '–' : usd(ecpm)))}${kpi('Hệ số cổng giữ chân', '×' + esc(String(gf)))}</div>`
          + `<section class="card"><h3 class="h3">${esc(A('Doanh thu ước tính theo ngày (USD)'))}</h3><p class="ax-note">${esc(A('ước tính = lượt hiển thị × eCPM đặt tay – thay bằng số AdSense/AdMob khi nối Reporting API'))}</p>${bars(S.series, 'rev', usd)}${conn}</section>`;
      el.innerHTML = hd('Quảng cáo', 'Kiểm tra điều kiện và bật/tắt theo nền tảng; doanh thu ở cuối trang.', `<button class="btn sm" type="button" data-rf>🔄 ${esc(A('Làm mới'))}</button>`)
        + readyCard(rd) + `<section class="ax-flags" aria-label="${esc(A('Trạng thái theo nền tảng'))}">${flags}</section><section class="ax-rev" aria-labelledby="ax-rev-h">${R.connected ? '<div id="ax-dash"></div>' : est}</section>`;
      if (R.connected) dash(el.querySelector('#ax-dash'), qOf());
      el.querySelector('[data-rf]').onclick = () => { load(true).then(() => go('overview')); };
      el.addEventListener('click', e => { if (!e.target.closest('[data-to-rd]')) return; e.preventDefault(); const c = el.querySelector('#ax-rd'); c.scrollIntoView({ behavior: 'smooth', block: 'start' }); c.focus({ preventScroll: true }); });
      const hb = el.querySelector('[data-howto]');
      if (hb) hb.onclick = () => { const p = el.querySelector('#ax-howto'), open = p.hidden; p.hidden = !open; hb.setAttribute('aria-expanded', String(open)); };
      el.querySelectorAll('[data-man]').forEach(sel => { sel.onchange = async () => { // trạng thái tay (không phải cờ quảng cáo): lưu ngay, vẽ lại thẻ + khóa nút
        const m = man(); m[sel.dataset.man] = { st: sel.value, at: Date.now() };
        if (await setCfg({ ads_ready: JSON.stringify(m) })) { await load(); go('overview'); } }; });
      el.querySelectorAll('[data-flag]').forEach(b => { b.onclick = async () => {
        if (b.disabled) return;
        const ok = h.confirm ? await h.confirm({ title: A('Xác nhận đổi cờ quảng cáo?'), body: A('Hiệu lực trên máy người dùng sau tối đa 1 giờ.'), danger: b.dataset.flag === 'ads_kill' && b.dataset.v === '1' }) : true;
        if (ok && await setCfg({ [b.dataset.flag]: b.dataset.v })) { await load(); go('overview'); }
      }; });
    }

    // ---- Vị trí: sơ đồ trực quan từng vị trí + luật tần suất + vùng cấm, đọc thẳng từ web/js/ads/policy.js (SLOTS/PER_PAGE/CAP/ZONES/LIVE/REWARDS…) – không chép tay số nào ----
    const WF = { home: ['', 'h c c l l s'], blog: ['pg', 'h l l l s c'], blog_mid: ['pg', 'h l l s l l'], dict: ['pg', 'h c s l'], done: ['', 'h c c s'], inter: ['', 'h c l l full'], rew: ['', 'h c l l mod'] };
    const wf = k => { const [cls, parts] = WF[k]; return `<div class="axp-wf ${cls}" aria-hidden="true">${parts.split(' ').map(x => (x === 's' ? '<b></b>' : x === 'full' || x === 'mod' ? `<b class="${x}"></b>` : `<i class="${x}"></i>`)).join('')}</div>`; };
    const ZL = { exam: 'Bài thi / thi thử', onboarding: 'Làm quen lần đầu', pay: 'Thanh toán / nâng cấp', admin: 'Quản trị', classroom: 'Lớp học (giáo viên & học sinh)', call: 'Gọi / roleplay', speak: 'Luyện nói', lesson: 'Bài học & ôn tập', mic: 'Mic đang thu', answering: 'Đang trả lời câu hỏi' };
    const RW = { streak: 'Cứu chuỗi', ai: '+{n} lượt AI chấm/giải thích', chat: '+{n} lượt Roleplay', retry: 'Cơ hội thứ 2', xp2: 'Nhân đôi XP', cosmetic: '+{n} món trang trí' };
    async function places(el) {
      const P = (await lazyJs('AdsPolicy', 'js/ads/policy.js')) && window.AdsPolicy, rows = S.places.slice().sort((a, b) => (a.plat + a.place < b.plat + b.place ? -1 : 1)), ec = S.ecpm || {};
      const tbl = rows.length ? `<div class="tbl-x" tabindex="0"><table class="tbl"><thead><tr><th>${esc(A('Nền tảng'))}</th><th>${esc(A('Vị trí đặt'))}</th><th>${esc(A('Yêu cầu'))}</th><th>${esc(A('Hiển thị'))}</th><th>${esc(A('Tỉ lệ lấp đầy'))}</th><th>${esc(A('Bấm'))}</th><th>${esc(A('CTR'))}</th><th>${esc(A('Thưởng'))}</th><th>${esc(A('Doanh thu ƯT'))}</th></tr></thead><tbody>
        ${rows.map(r => `<tr><td>${esc(A(PF[r.plat] || r.plat))}</td><td>${esc(plName(r.place))}</td><td>${num(r.req)}</td><td>${num(r.imp + r.show)}</td><td>${esc(pct(r.fill))}</td><td>${num(r.click)}</td><td>${esc(pct(r.ctr))}</td><td>${num(r.rewok)}</td><td>${esc(usd((r.imp + r.show) / 1000 * (+ec[r.plat] || 0)))}</td></tr>`).join('')}</tbody></table></div>` : empty('Chưa có số liệu – cờ đang tắt hoặc chưa có lượt hiển thị.');
      const figs = `<section class="card" aria-labelledby="axp-t"><h3 class="h3" id="axp-t">${esc(A('Số liệu theo vị trí (30 ngày)'))}</h3>${tbl}</section>`;
      if (!P) { el.innerHTML = hd('Vị trí') + `<div class="err-box" role="alert">${esc(A('Không tải được luật quảng cáo (policy.js).'))}</div>` + figs; return; }
      // tần suất HIỆU LỰC = mặc định policy.js kẹp với cờ quản trị (cùng hàm flags() app dùng)
      const k = P.flags(Object.fromEntries(['ads_cap_sessions', 'ads_cap_gap', 'ads_cap_firstday', 'ads_cap_newbie', 'ads_cap_daymax'].map(x => [x, cv(x)])), { enabled: true }).caps;
      const live = key => { const l = rows.filter(r => r.place === key || (key === 'rew' && /^rew/.test(r.place))), imp = l.reduce((a, r) => a + r.imp + r.show, 0), rq = l.reduce((a, r) => a + r.req, 0);
        return `<p class="axp-m">${esc(imp ? A('30 ngày: {i} hiển thị · lấp đầy {f}', { i: num(imp), f: pct(rq ? imp / rq : null) }) : A('Chưa có lượt hiển thị.'))}</p>`; };
      const rw = r => A(RW[r] || r, { n: P.REWARDS[r] });
      const PLC = [
        ['home', 'Trang Hôm nay – cuối trang', ['web', 'android', 'ios'], [['Ô 300×250 trong khung cố định 290 px – không xô lệch bố cục (CLS 0).'], ['App gốc: biểu ngữ thích ứng ở đáy, chỉ khi đang ở tab Hôm nay.']]],
        ['done', 'Thẻ kết quả cuối lượt', ['web'], [['Chỉ sau {h} giờ kể từ lần mở đầu tiên.', { h: P.CAP.firstDayH }], ['Chỉ khi điểm ≥ {p} % – không "xát muối" lúc làm kém.', { p: P.FAIL_PCT }], ['Chèn dưới cùng, cách nút ≥ 2,5rem (chống bấm nhầm).']]],
        ['blog', 'Cuối bài blog', ['web'], [['Trước "Bài liên quan" – không bao giờ trên nội dung chính (giữ LCP).'], ['Tối đa {n} ô mỗi bài (cuối + giữa).', { n: P.PER_PAGE.blog }]]],
        ['blog_mid', 'Giữa bài blog dài', ['web'], [['Sau đoạn văn ở 40–50 % thân bài, chỉ bài ≥ 1200 từ.'], ['Không chen giữa danh sách, bảng, trích dẫn hay sát ảnh/video.']]],
        ['dict', 'Trang từ điển 1 từ', ['web'], [['Ngay dưới thẻ nghĩa + "Ví dụ".'], ['Tối đa {n} ô mỗi trang; không ở hub hay A–Z.', { n: P.PER_PAGE.dict }]]],
        ['inter', 'Toàn màn hình cuối phiên (app)', ['android', 'ios'], [['Chỉ khi vừa xong 1 phiên học và đã về tab chính ({t}).', { t: P.BREAK.join(' · ') }], ['Tối đa 1 lần mỗi {s} phiên, cách nhau ≥ {g} phút, ≤ {d} lần/ngày.', { s: k.everySessions, g: k.gapMin, d: k.dayMax }],
          ['Không trong {h} giờ đầu, ngày lịch đầu tiên và {n} phiên học đầu.', { h: k.firstDayH, n: k.newbie }], ['Vừa xem video có thưởng → yên {c} phút; vừa làm < {p} % → không hiện.', { c: P.CALM_MIN, p: P.FAIL_PCT }], ['Cổng giữ chân giãn tần suất khi nhóm có quảng cáo tụt; ×0,25 = tắt hẳn.']]],
        ['rew', 'Có thưởng – người học tự chọn', ['android', 'ios', 'web'], [['Người học tự bấm "Xem video" – không bao giờ tự phát.'], ...Object.keys(P.REWARDS).map(r => ['{x} · ≤ {n}/ngày', { x: rw(r), n: P.PER_DAY[r] }]), ['Chờ ≥ {m} phút giữa 2 video.', { m: P.REW_GAP_MIN }], ['Web chỉ có: {x} (không cần SSV).', { x: P.WEB_REW.map(rw).join(', ') }]]],
      ];
      const card = ([key, t, pl, rules]) => `<article class="card axp" aria-labelledby="axp-${key}">${wf(key)}<div><h3 id="axp-${key}">${esc(A(t))}</h3><div class="axp-pl">${pl.map(p => `<span class="ax-pc">${esc(PS[p])}</span>`).join('')}</div><ul>${rules.map(([r, v]) => `<li>${esc(A(r, v))}</li>`).join('')}</ul></div>${live(key)}</article>`;
      const chips = list => { const c = x => `<code>${esc(x)}</code>`; return `<span class="axp-rt">${list.slice(0, 10).map(c).join('')}${list.length > 10 ? `<details><summary>${esc(A('+{n} màn', { n: list.length - 10 }))}</summary>${list.slice(10).map(c).join('')}</details>` : ''}</span>`; };
      const zr = (t, body) => `<div class="axp-zr"><dt>${esc(A(t))}</dt><dd>${body}</dd></div>`;
      const zlist = hard => P.ZONES.filter(z => !!z[1] === hard).map(([zk, , re]) => `<div class="axp-h"><h4>${esc(A(ZL[zk] || zk))}</h4></div>${chips(routesOf(re))}`).join('');
      const always = ['Add-on Chrome', 'Quản trị', 'Lớp học (giáo viên & học sinh)', 'Dưới 13 tuổi', '?sandbox · ?demo', 'Trình duyệt tự động', ['Nhóm đối chứng {p} %', { p: Math.round(P.CAP.holdout * 100) }], 'Người dùng Pro'];
      el.innerHTML = hd('Sơ đồ vị trí', 'Mỗi vị trí, luật tần suất và vùng cấm đọc thẳng từ web/js/ads/policy.js – đổi luật ở đó, trang này tự đúng.')
        + `<div class="axp-addon" role="note"><span aria-hidden="true">🧩</span><div><b>${esc(A('Add-on Chrome không bao giờ có quảng cáo'))}</b><p>${esc(A('build-extension.sh loại js/ads/ khỏi gói; vỏ quảng cáo tự tắt trên chrome-extension:.'))}</p></div></div>`
        + `<div class="axp-g">${PLC.map(card).join('')}</div>`
        + `<section class="card axp-z" aria-labelledby="axp-z"><h3 class="h3" id="axp-z">${esc(A('Vùng cấm quảng cáo'))}</h3><dl>`
        + zr('Luôn chặn, trước mọi luật khác', `<span class="axp-rt">${always.map(x => `<span class="ax-pc">${esc(Array.isArray(x) ? A(x[0], x[1]) : A(x))}</span>`).join('')}</span>`)
        + zr('Cấm hẳn – kể cả video có thưởng', zlist(true))
        + zr('Trạng thái lúc chạy (mọi màn)', `<span class="axp-rt">${P.LIVE.map(x => `<span class="ax-pc">${esc(A({ mic: 'Mic đang thu', call: 'Đang gọi', answering: 'Đang trả lời câu hỏi' }[x] || x))}</span>`).join('')}</span>`)
        + zr('Đang học – chỉ lời mời có thưởng ở điểm nghỉ', zlist(false)) + `</dl></section>` + figs;
    }

    async function freq(el) {
      const field = (k, [lo, hi, def, unit, label]) => `<label class="ax-cap" for="ax-${k}"><span>${esc(A(label))}<br><span class="ax-note">${esc(A('Khoảng {a}–{b}', { a: lo, b: hi }))}</span></span><span><input id="ax-${k}" type="number" min="${lo}" max="${hi}" step="${hi <= 50 && unit === 'USD' ? '0.1' : '1'}" value="${esc(cv(k) || String(def))}" data-k="${k}"> ${esc(A(unit))}${ADMIN[k] && ADMIN[k][5] ? ' · ' + esc(A(PF[ADMIN[k][5]])) : ''}</span></label>`;
      el.innerHTML = hd('Giới hạn tần suất', 'Chỉ chỉnh được trong khoảng an toàn – không bao giờ dày hơn mặc định.')
        + `<form class="card" id="ax-f" novalidate>${Object.entries(BOUNDS).map(([k, b]) => field(k, b)).join('')}<hr>${Object.entries(ADMIN).map(([k, b]) => field(k, b)).join('')}<p class="small bad-t" id="ax-err" role="alert"></p><button class="btn primary sm" type="submit">${esc(A('Lưu'))}</button></form>`;
      el.querySelector('#ax-f').onsubmit = async e => {
        e.preventDefault();
        const vals = {}; let bad = false;
        el.querySelectorAll('input[data-k]').forEach(i => { const [lo, hi] = (BOUNDS[i.dataset.k] || ADMIN[i.dataset.k]), v = +i.value; if (!isFinite(v) || v < lo || v > hi) { bad = true; i.setAttribute('aria-invalid', 'true'); } else { i.removeAttribute('aria-invalid'); vals[i.dataset.k] = String(v); } });
        el.querySelector('#ax-err').textContent = bad ? A('Giá trị ngoài khoảng an toàn.') : '';
        if (!bad && await setCfg(vals)) { S = null; await load(); }
      };
    }

    async function guard(el) {
      const g = S.guard || {}, co = g.co || {}, a = co.a || {}, c = co.h || {}, gf = +(cv('ads_guard') || 1);
      const status = g.why === 'sample' ? A('Chưa đủ mẫu ({n}/{m} máy mỗi nhóm) – cổng chưa can thiệp.', { n: num(Math.min(a.n1 || 0, c.n1 || 0)), m: num(g.min || 200) }) : gf < 1 ? A('Đã giảm tần suất (×{f}): nhóm có QC tụt {p} so với đối chứng.', { f: gf, p: pct(g.worst) }) + (gf <= 0.25 ? ' · ' + A('Tắt toàn màn hình (×0,25)') : '') : A('Bình thường – tần suất đầy đủ.');
      const pair = (l, x, y, f) => `<div class="card kpi"><div class="l">${esc(A(l))}</div><div class="v">${esc(f(x))} <small>/ ${esc(f(y))}</small></div><div class="s">${esc(A('Nhóm có QC'))} / ${esc(A('Đối chứng'))}</div></div>`;
      const tr = S.trend || [];
      el.innerHTML = hd('Giữ chân', 'Nhóm có quảng cáo so với nhóm đối chứng (10 % không quảng cáo)')
        + `<div class="card ${gf < 1 ? 'ax-kill' : ''}" role="status"><b>×${esc(String(gf))}</b> – ${esc(status)}</div>`
        + `<div class="kpis">${pair('Giữ chân D1', a.d1, c.d1, pct)}${pair('Giữ chân D7', a.d7, c.d7, pct)}${pair('Thời lượng phiên TB', a.sl, c.sl, secs)}${kpi('máy mới', esc(num(a.n1)) + ' <small>/ ' + esc(num(c.n1)) + '</small>')}</div>`
        + `<section class="card"><h3 class="h3">${esc(A('Xu hướng D1 theo tuần'))}</h3><div class="ax-legend"><span><i style="background:var(--primary)"></i>${esc(A('Nhóm có QC'))}</span><span><i style="background:var(--muted)"></i>${esc(A('Đối chứng'))}</span></div>
          ${AdminChart.line(tr.map(p => ({ day: p.day, a: p.a.d1 || 0, h: p.h.d1 || 0 })), { keys: [{ k: 'h', c: 'var(--muted)' }, { k: 'a', c: 'var(--primary)' }], x: p => p.day.slice(5), fmt: pct, tip: p => `${p.day}: ${pct(p.a)} / ${pct(p.h)}`, aria: tr.map(p => `${p.day}: ${pct(p.a.d1)} / ${pct(p.h.d1)}`).join(', '), empty: A('Chưa có dữ liệu') })}</section>`
        + `<section class="card"><h3 class="h3">${esc(A('Lịch sử tự giảm tần suất'))}</h3>${(S.guardLog || []).length ? `<table class="tbl"><thead><tr><th>${esc(A('Ngày'))}</th><th>${esc(A('Hệ số'))}</th></tr></thead><tbody>${S.guardLog.slice().reverse().map(x => `<tr><td>${esc(x.day)}</td><td>×${esc(String(x.factor))}</td></tr>`).join('')}</tbody></table>` : `<p class="ax-note">${esc(A('Chưa có lần tự điều chỉnh nào.'))}</p>`}</section>`;
    }

    async function consent(el) {
      const rows = Object.entries(S.consent || {});
      el.innerHTML = hd('Tỉ lệ đồng ý theo vùng (30 ngày)', 'Mỗi phiên có quảng cáo ghi 1 kết quả; vùng suy từ mã nước của Cloudflare, không lưu IP.')
        + (rows.length ? `<div class="tbl-x" tabindex="0"><table class="tbl"><thead><tr><th>${esc(A('Vùng'))}</th><th>${esc(A('Cá nhân hóa'))}</th><th>${esc(A('Không cá nhân hóa'))}</th><th>${esc(A('Từ chối'))}</th><th>${esc(A('Không cần hỏi'))}</th></tr></thead><tbody>
          ${rows.map(([r, x]) => { const n = x.pa + x.npa + x.deny + x.na || 1; return `<tr><td>${esc(A(RG[r] || r))}</td><td>${esc(pct(x.pa / n))} <span class="tiny muted">(${num(x.pa)})</span></td><td>${esc(pct(x.npa / n))}</td><td>${esc(pct(x.deny / n))}</td><td>${esc(pct(x.na / n))}</td></tr>`; }).join('')}</tbody></table></div>` : empty('Chưa có số liệu – cờ đang tắt hoặc chưa có lượt hiển thị.'));
    }
  }
  window.AdminAds = { render, EN, agg, rangeOf, csvOf, readyOf, txtWhy, routesOf, READY };
})();
