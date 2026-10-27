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
    'phiên': 'sessions', 'phút': 'min', 'giờ': 'h', 'Khoảng {a}–{b}': 'Range {a}–{b}', 'Giá trị ngoài khoảng an toàn.': 'Value outside the safe range.',
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
.ax-cap{display:grid;grid-template-columns:1fr auto;gap:.5rem 1rem;align-items:center;margin:.5rem 0}.ax-cap input{width:7rem}.ax-note{font-size:.8rem;color:var(--muted)}`;

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
    const BOUNDS = { ads_cap_sessions: [3, 20, 3, 'phiên', 'Toàn màn hình tối đa 1 lần mỗi … phiên học'], ads_cap_gap: [10, 240, 10, 'phút', 'và cách nhau tối thiểu … phút'], ads_cap_firstday: [24, 336, 24, 'giờ', 'Không hiện toàn màn hình trong … giờ đầu'] };
    const ADMIN = { ads_ecpm_web: [0, 50, 1, 'USD', 'eCPM ước tính (USD / 1000 lượt)', 'web'], ads_ecpm_android: [0, 50, 1, 'USD', 'eCPM ước tính (USD / 1000 lượt)', 'android'], ads_ecpm_ios: [0, 50, 1, 'USD', 'eCPM ước tính (USD / 1000 lượt)', 'ios'], ads_guard_pct: [1, 50, 5, '%', 'Ngưỡng tụt giữ chân (%)'], ads_guard_min: [50, 100000, 200, '', 'Cỡ mẫu tối thiểu mỗi nhóm'] };
    const hd = (t, d, act = '') => `<div class="ax-h"><div><h2 id="ax-t" tabindex="-1">${esc(A(t))}</h2>${d ? `<p>${esc(A(d))}</p>` : ''}</div>${act}</div>`;
    const kpi = (l, v, s = '') => `<div class="card kpi"><div class="l">${esc(A(l))}</div><div class="v">${v}</div>${s ? `<div class="s">${s}</div>` : ''}</div>`;
    const empty = t => `<div class="empty"><span class="em-i" aria-hidden="true">💤</span><b>${esc(A(t))}</b></div>`;
    let S = null, CFG = null;
    const load = async force => { if (force) { S = null; CFG = null; } [S, CFG] = await Promise.all([S || api('adsStats'), CFG || api('config')]); return S; };
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
    const bars = (series, key, fmt) => {
      const W = 600, H = 150, max = Math.max(1e-9, ...series.map(x => x[key] || 0)), bw = W / series.length;
      return `<div class="ax-chart" role="img" aria-label="${esc(series.map(x => x.day + ': ' + fmt(x[key])).slice(-7).join(', '))}"><svg viewBox="0 0 ${W} ${H + 16}" aria-hidden="true">${series.map((x, i) => { const v = x[key] || 0, bh = Math.round(v / max * H); return `<rect x="${i * bw + 1}" y="${H - bh}" width="${bw - 2}" height="${bh}" rx="2" fill="var(--primary)"><title>${esc(x.day + ': ' + fmt(v))}</title></rect>`; }).join('')}<text x="0" y="${H + 13}">${esc(series[0].day)}</text><text x="${W}" y="${H + 13}" text-anchor="end">${esc(series[series.length - 1].day)}</text></svg></div>`;
    };

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
      el.innerHTML = hd('Doanh thu quảng cáo', '', `<span class="ax-acts"><button class="btn sm" type="button" data-rf>🔄 ${esc(A('Làm mới'))}</button></span>`)
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
          : `<div class="card">${empty('Chưa có số trong khoảng này.')}</div>`)
        + `<section class="card"><div class="ax-h3row"><div class="ax-seg" role="group" aria-label="${esc(A('Chi tiết'))}">${Object.entries(TABS).map(([k, [l]]) => `<button type="button" class="btn sm ${tabSt.tab === k ? 'primary' : 'ghost'}" data-tab="${k}" aria-pressed="${tabSt.tab === k}">${esc(A(l))}</button>`).join('')}</div><button class="btn sm ghost" type="button" data-csv${sorted.length ? '' : ' disabled'}>⬇ CSV</button></div>${table}</section>`
        + `<div class="ax-2col"><section class="card"><h3 class="h3">${esc(A('Ước tính nội bộ vs số thật'))}</h3><p class="ax-note">${esc(A('ước tính = lượt hiển thị đo trong app × eCPM đặt tay ở mục Tần suất'))}</p><div class="tbl-x" tabindex="0"><table class="tbl"><thead><tr><th scope="col">${esc(A('Nền tảng'))}</th><th scope="col" class="num">${esc(A('Ước tính'))}</th><th scope="col" class="num">${esc(A('Thật'))}</th><th scope="col" class="num">${esc(A('Độ lệch'))}</th></tr></thead><tbody>${a.vs.map(v => `<tr><td>${esc(A(PF[v.plat]))}</td><td class="num">${esc(usd(v.est))}</td><td class="num">${esc(usd(v.real))}</td><td class="num">${esc(dev(v.dev))}</td></tr>`).join('')}</tbody></table></div></section>`
        + `<section class="card"><h3 class="h3">${esc(A('Thanh toán'))}</h3>${hasPay ? `<dl class="ax-dl"><dt>${esc(A('Số dư hiện tại'))}</dt><dd>${esc(R.pay.balance || '–')}</dd><dt>${esc(A('Ngưỡng thanh toán'))}</dt><dd>$100 <span class="ax-note">(${esc(A('mặc định AdSense/AdMob'))})</span></dd><dt>${esc(A('Lần trả gần nhất'))}</dt><dd>${esc(R.pay.last ? R.pay.last.amount + ' · ' + R.pay.last.date : '–')}</dd></dl><p class="ax-note">${esc(A('AdMob dùng chung hồ sơ thanh toán với AdSense.'))}</p>` : `<p class="ax-note">${esc(A('Chưa có dữ liệu thanh toán – cập nhật ở lượt đồng bộ đêm.'))}</p>`}</section>`
        + `<section class="card"><h3 class="h3">${esc(A('Hiệu quả vs trải nghiệm'))}</h3><dl class="ax-dl"><dt>${esc(A('Doanh thu / 1.000 phiên có quảng cáo'))}</dt><dd>${esc(money(a.per1k))}</dd><dt>${esc(A('Giữ chân D1 (có QC / đối chứng)'))}</dt><dd>${esc(pct(ca.d1))} / ${esc(pct(ch.d1))}</dd><dt>${esc(A('Giữ chân D7 (có QC / đối chứng)'))}</dt><dd>${esc(pct(ca.d7))} / ${esc(pct(ch.d7))}</dd><dt>${esc(A('Hệ số cổng giữ chân'))}</dt><dd>×${esc(String(gf))}</dd></dl><p class="ax-note">${esc(A('Đối chứng = 10 % người dùng không thấy quảng cáo; cửa sổ 14 ngày. Chi tiết ở mục Giữ chân.'))}</p></section></div>`
        + `<p class="ax-note">${esc(A('Ngày báo cáo theo múi giờ tài khoản Google (AdSense: giờ Thái Bình Dương, America/Los_Angeles); bộ đếm nội bộ theo giờ Việt Nam. Số tháng hiện tại là ước tính, Google chốt sau khi hết tháng.'))}</p>`;
      const f = el.querySelector('#ax-filt');
      f.addEventListener('change', () => { const d = Object.fromEntries(new FormData(f)); const nq = { r: d.r, p: d.p, c: d.c, f: d.f || a.from, t: d.t || a.to }; qSet(nq); dash(el, nq); });
      el.querySelector('[data-rf]').onclick = () => { load(true).then(() => go('overview')); };
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
    async function overview(el) {
      const kill = cv('ads_kill') === '1', on = p => cv('ads_' + p) === '1';
      const last7 = S.series.slice(-7), rev7 = last7.reduce((a, x) => a + x.rev, 0) / 7, imp30 = S.series.reduce((a, x) => a + x.imp, 0);
      const req = S.places.reduce((a, x) => a + x.req, 0), fill = req ? S.places.reduce((a, x) => a + x.imp + x.show, 0) / req : null;
      const rev30 = S.series.reduce((a, x) => a + x.rev, 0), ecpm = imp30 ? rev30 / imp30 * 1000 : null, gf = +(cv('ads_guard') || 1);
      const R = S.real || {};
      const flags = (kill ? `<div class="card ax-kill" role="alert">${esc(A('Công tắc khẩn cấp đang BẬT – mọi quảng cáo dừng trên mọi nền tảng (≤ 1 giờ do bộ đệm cấu hình).'))}</div>` : !['web', 'android', 'ios'].some(on) ? `<p class="ax-note">${esc(A('Mọi cờ đang tắt: app không tải mã quảng cáo nào. Bật cần cả mã nhà xuất bản trong web/js/ads/config.js (enabled: true).'))}</p>` : '')
        + `<h3 class="h3">${esc(A('Trạng thái theo nền tảng'))}</h3><div class="ax-plats">${['web', 'android', 'ios'].map(p => `<div class="card ax-plat"><div class="row"><b>${esc(A(PF[p]))}</b><span class="chip ${on(p) && !kill ? 'ok' : 'muted'}">${esc(A(on(p) && !kill ? 'Đang bật' : 'Đang tắt'))}</span></div><div class="row"><span class="small muted">${esc(usd((S.plat[p] || {}).rev || 0))} · ${num((S.plat[p] || {}).imp || 0)}</span><button class="btn sm ${on(p) ? 'ghost' : 'primary'}" type="button" data-flag="ads_${p}" data-v="${on(p) ? '0' : '1'}">${esc(A(on(p) ? 'Tắt' : 'Bật'))}</button></div></div>`).join('')}
          <div class="card ax-plat ${kill ? 'ax-kill' : ''}"><div class="row"><b>⛔ ${esc(A('Công tắc khẩn cấp'))}</b></div><button class="btn sm ${kill ? 'primary' : 'danger'}" type="button" data-flag="ads_kill" data-v="${kill ? '0' : '1'}">${esc(A(kill ? 'Mở lại quảng cáo' : 'TẮT TOÀN BỘ quảng cáo'))}</button>
          <div class="row"><span class="small">${esc(A('Toàn màn hình cuối phiên'))}</span><button class="btn sm ghost" type="button" data-flag="ads_inter" data-v="${cv('ads_inter') === '0' ? '1' : '0'}">${esc(A(cv('ads_inter') === '0' ? 'Bật' : 'Tắt'))}</button></div>
          <div class="row"><span class="small">${esc(A('Có thưởng'))}</span><button class="btn sm ghost" type="button" data-flag="ads_rew" data-v="${cv('ads_rew') === '0' ? '1' : '0'}">${esc(A(cv('ads_rew') === '0' ? 'Bật' : 'Tắt'))}</button></div></div></div>`;
      if (R.connected) { el.innerHTML = `<div id="ax-dash"></div><section class="ax-flags">${flags}</section>`; dash(el.querySelector('#ax-dash'), qOf()); }
      else el.innerHTML = hd('Quảng cáo', '', `<button class="btn sm" type="button" data-rf>🔄 ${esc(A('Làm mới'))}</button>`) + flags + (`<div class="kpis">${kpi('Doanh thu ước tính/ngày (7 ngày)', esc(usd(rev7)))}${kpi('Lượt hiển thị (30 ngày)', esc(num(imp30)))}${kpi('Tỉ lệ lấp đầy', esc(pct(fill)))}${kpi('eCPM (proxy)', esc(ecpm == null ? '–' : usd(ecpm)))}${kpi('Hệ số cổng giữ chân', '×' + esc(String(gf)))}</div>`
        + `<section class="card"><h3 class="h3">${esc(A('Doanh thu ước tính theo ngày (USD)'))}</h3><p class="ax-note">${esc(A('ước tính = lượt hiển thị × eCPM đặt tay – thay bằng số AdSense/AdMob khi nối Reporting API'))}</p>${bars(S.series, 'rev', usd)}
          <div class="ax-conn"><p class="ax-note">${esc(A('Báo cáo AdSense/AdMob: chưa kết nối – đang hiện số ước tính.'))}</p><button class="btn sm primary" type="button" data-howto aria-expanded="false" aria-controls="ax-howto">🔗 ${esc(A('Nối Google'))}</button></div>
          <div id="ax-howto" class="ax-howto" hidden><h4 class="h3">${esc(A('Cách nối báo cáo Google (1 lần)'))}</h4><ol>${['Google Cloud Console › dự án lexkite-app: màn hình đồng ý OAuth ở trạng thái "In production" (để "Testing" thì token hết hạn sau 7 ngày) + client OAuth loại "Desktop app" → tải file JSON của client.', 'Bật 2 API: AdSense Management API và AdMob API.', 'Trên máy Mac: node scripts/ads-oauth.mjs --client <file JSON> → đăng nhập vintagezulilyjewelry@gmail.com → Allow. Script tự đặt 3 secret GitHub (ADS_OAUTH_CLIENT_ID, ADS_OAUTH_CLIENT_SECRET, ADS_OAUTH_REFRESH).', 'GitHub › Actions › Ads revenue › Run workflow. Số thật hiện ở đây sau khoảng 1 phút, rồi tự cập nhật mỗi ngày lúc 06:00 UTC.'].map(t => `<li>${esc(A(t))}</li>`).join('')}</ol></div></section>`);
      if (!R.connected) el.querySelector('[data-rf]').onclick = () => { load(true).then(() => go('overview')); };
      const hb = el.querySelector('[data-howto]');
      if (hb) hb.onclick = () => { const p = el.querySelector('#ax-howto'), open = p.hidden; p.hidden = !open; hb.setAttribute('aria-expanded', String(open)); };
      el.querySelectorAll('[data-flag]').forEach(b => { b.onclick = async () => {
        const ok = h.confirm ? await h.confirm({ title: A('Xác nhận đổi cờ quảng cáo?'), body: A('Hiệu lực trên máy người dùng sau tối đa 1 giờ.'), danger: b.dataset.flag === 'ads_kill' && b.dataset.v === '1' }) : true;
        if (ok && await setCfg({ [b.dataset.flag]: b.dataset.v })) { await load(); go('overview'); }
      }; });
    }

    async function places(el) {
      const rows = S.places.slice().sort((a, b) => (a.plat + a.place < b.plat + b.place ? -1 : 1)), ec = S.ecpm || {};
      el.innerHTML = hd('Vị trí') + (rows.length ? `<div class="tbl-x" tabindex="0"><table class="tbl"><thead><tr><th>${esc(A('Nền tảng'))}</th><th>${esc(A('Vị trí đặt'))}</th><th>${esc(A('Yêu cầu'))}</th><th>${esc(A('Hiển thị'))}</th><th>${esc(A('Tỉ lệ lấp đầy'))}</th><th>${esc(A('Bấm'))}</th><th>${esc(A('CTR'))}</th><th>${esc(A('Thưởng'))}</th><th>${esc(A('Doanh thu ƯT'))}</th></tr></thead><tbody>
        ${rows.map(r => `<tr><td>${esc(A(PF[r.plat] || r.plat))}</td><td>${esc(plName(r.place))}</td><td>${num(r.req)}</td><td>${num(r.imp + r.show)}</td><td>${esc(pct(r.fill))}</td><td>${num(r.click)}</td><td>${esc(pct(r.ctr))}</td><td>${num(r.rewok)}</td><td>${esc(usd((r.imp + r.show) / 1000 * (+ec[r.plat] || 0)))}</td></tr>`).join('')}</tbody></table></div>` : empty('Chưa có số liệu – cờ đang tắt hoặc chưa có lượt hiển thị.'));
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
      const tr = S.trend || [], W = 600, H = 140, mx = Math.max(0.01, ...tr.flatMap(p => [p.a.d1 || 0, p.h.d1 || 0]));
      const line = (k, col) => `<polyline fill="none" stroke="${col}" stroke-width="2.5" points="${tr.map((p, i) => `${Math.round(i * (W - 20) / Math.max(1, tr.length - 1)) + 10},${Math.round(H - (p[k].d1 || 0) / mx * (H - 10))}`).join(' ')}"/>`;
      el.innerHTML = hd('Giữ chân', 'Nhóm có quảng cáo so với nhóm đối chứng (10 % không quảng cáo)')
        + `<div class="card ${gf < 1 ? 'ax-kill' : ''}" role="status"><b>×${esc(String(gf))}</b> – ${esc(status)}</div>`
        + `<div class="kpis">${pair('Giữ chân D1', a.d1, c.d1, pct)}${pair('Giữ chân D7', a.d7, c.d7, pct)}${pair('Thời lượng phiên TB', a.sl, c.sl, secs)}${kpi('máy mới', esc(num(a.n1)) + ' <small>/ ' + esc(num(c.n1)) + '</small>')}</div>`
        + `<section class="card"><h3 class="h3">${esc(A('Xu hướng D1 theo tuần'))}</h3><div class="ax-legend"><span><i style="background:var(--primary)"></i>${esc(A('Nhóm có QC'))}</span><span><i style="background:var(--muted)"></i>${esc(A('Đối chứng'))}</span></div>
          <div class="ax-chart" role="img" aria-label="${esc(tr.map(p => `${p.day}: ${pct(p.a.d1)} / ${pct(p.h.d1)}`).join(', '))}"><svg viewBox="0 0 ${W} ${H + 16}" aria-hidden="true">${tr.length ? line('h', 'var(--muted)') + line('a', 'var(--primary)') : ''}${tr.map((p, i) => `<text x="${Math.round(i * (W - 20) / Math.max(1, tr.length - 1)) + 10}" y="${H + 13}" text-anchor="middle">${esc(p.day.slice(5))}</text>`).join('')}</svg></div></section>`
        + `<section class="card"><h3 class="h3">${esc(A('Lịch sử tự giảm tần suất'))}</h3>${(S.guardLog || []).length ? `<table class="tbl"><thead><tr><th>${esc(A('Ngày'))}</th><th>${esc(A('Hệ số'))}</th></tr></thead><tbody>${S.guardLog.slice().reverse().map(x => `<tr><td>${esc(x.day)}</td><td>×${esc(String(x.factor))}</td></tr>`).join('')}</tbody></table>` : `<p class="ax-note">${esc(A('Chưa có lần tự điều chỉnh nào.'))}</p>`}</section>`;
    }

    async function consent(el) {
      const rows = Object.entries(S.consent || {});
      el.innerHTML = hd('Tỉ lệ đồng ý theo vùng (30 ngày)', 'Mỗi phiên có quảng cáo ghi 1 kết quả; vùng suy từ mã nước của Cloudflare, không lưu IP.')
        + (rows.length ? `<div class="tbl-x" tabindex="0"><table class="tbl"><thead><tr><th>${esc(A('Vùng'))}</th><th>${esc(A('Cá nhân hóa'))}</th><th>${esc(A('Không cá nhân hóa'))}</th><th>${esc(A('Từ chối'))}</th><th>${esc(A('Không cần hỏi'))}</th></tr></thead><tbody>
          ${rows.map(([r, x]) => { const n = x.pa + x.npa + x.deny + x.na || 1; return `<tr><td>${esc(A(RG[r] || r))}</td><td>${esc(pct(x.pa / n))} <span class="tiny muted">(${num(x.pa)})</span></td><td>${esc(pct(x.npa / n))}</td><td>${esc(pct(x.deny / n))}</td><td>${esc(pct(x.na / n))}</td></tr>`; }).join('')}</tbody></table></div>` : empty('Chưa có số liệu – cờ đang tắt hoặc chưa có lượt hiển thị.'));
    }
  }
  window.AdminAds = { render, EN, agg, rangeOf, csvOf };
})();
