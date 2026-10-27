/* Quản trị → Backlink, PR & Thương hiệu (tải lười). Gọi /api/backlinks (functions/api/backlinks.js, chỉ quản trị).
 * admin.js gọi AdminBacklinks.render(container, bapi, L, { esc, when, lang, toast }). Chữ tiếng Anh trong bảng EN riêng.
 * Mọi dữ liệu hiển thị qua esc(); link chỉ nhận https:// (chặn javascript:). Mẫu thư/thông báo sinh tại chỗ, có chỗ trống [..] để anh tự điền (không lưu email/địa chỉ).
 * Tài liệu: docs/PR-PLATFORMS.md § Theo dõi tự động · docs/legal/DMCA-KIT.md */
(function () {
  const EN = {
    'Backlink, PR & Thương hiệu': 'Backlinks, PR & Brand', 'Đang tải…': 'Loading…', 'Không tải được': 'Could not load', 'Làm mới': 'Refresh',
    'Sự cố': 'Incidents', 'Thay đổi': 'Changes', 'Kiểm tay': 'Check manually', 'Ổn': 'OK', 'Bỏ qua': 'Skipped',
    'Lần kiểm cuối': 'Last check', 'chưa chạy': 'never run', 'Xem lần chạy': 'View run', 'Kiểm ngay': 'Check now', 'Thêm mục': 'Add item', 'Xuất JSON': 'Export JSON',
    'Đã yêu cầu chạy kiểm – kết quả sau khoảng 5 phút.': 'Check requested – results in about 5 minutes.',
    'Chưa đặt GH_DISPATCH_TOKEN ở Cloudflare – chạy tay workflow pr-check.yml trên GitHub.': 'GH_DISPATCH_TOKEN is not set on Cloudflare – run the pr-check.yml workflow manually on GitHub.',
    'Máy chủ chưa có STUDIO_CALLBACK_SECRET – CI chưa gửi kết quả lên đây được (vẫn có artifact + issue GitHub).': 'The server has no STUDIO_CALLBACK_SECRET – CI cannot send results here yet (artifact + GitHub issue still work).',
    '📰 Bản tin tuần + thư sự cố nghiêm trọng gửi qua lexkite-mail.': '📰 Weekly digest + serious-incident emails go through lexkite-mail.',
    '🔗 Bài PR & hồ sơ': '🔗 PR posts & profiles', 'Mọi trạng thái': 'All statuses', 'Mọi loại': 'All types', 'Mọi kết quả': 'All results', 'Tìm trang, URL, tài khoản…': 'Search site, URL, account…',
    'Lọc trạng thái': 'Filter status', 'Lọc loại': 'Filter type', 'Lọc kết quả': 'Filter result', 'Tìm': 'Search',
    'Trang': 'Site', 'Loại': 'Type', 'Tài khoản': 'Account', 'Trạng thái': 'Status', 'Kiểm lúc': 'Checked', 'Link': 'Link', 'Kết quả': 'Result', 'Lịch sử': 'History', 'Đổi lúc': 'Changed',
    'Không có mục nào khớp bộ lọc.': 'No items match the filters.', 'Sửa': 'Edit', 'Xóa': 'Delete', 'Đánh dấu live': 'Mark live', 'Cách xử lý': 'What to do',
    'Bài viết': 'Article', 'Trang ra mắt': 'Launch listing', 'Hồ sơ': 'Profile', 'PR GitHub': 'GitHub PR', 'Thư mục': 'Directory',
    'Đang hiển thị': 'Live', 'Chờ duyệt': 'Pending', 'Nháp': 'Draft', 'Đã gỡ': 'Removed',
    'có': 'yes', 'không': 'no', 'chưa kiểm': 'not checked',
    // Lý do
    'bị gỡ / 404': 'removed / 404', 'tài khoản hoặc bài bị khóa': 'account or post banned', 'mất link về lexkite.com': 'link to lexkite.com lost', 'rel tụt xuống nofollow/ugc': 'rel downgraded to nofollow/ugc',
    'trang bị thêm noindex': 'page became noindex', 'đã lên – nên đổi sang live': 'listed – switch to live', 'PR đã merge – nên đổi sang live': 'PR merged – switch to live', 'PR bị đóng, không merge': 'PR closed without merge',
    'rel nâng lên follow': 'rel upgraded to follow', 'trang chuyển hướng': 'page redirects', 'PR đang chờ': 'PR open', 'chưa lên': 'not listed yet', 'trang xem trước (noindex)': 'preview page (noindex)',
    'bị chặn bot – mở bằng trình duyệt': 'bot-blocked – open in a browser', 'lỗi mạng': 'network error', 'chưa có URL': 'no URL', 'chuyển về trang chủ': 'redirects to home page',
    'tên miền bắt đầu phân giải': 'domain started resolving', 'có MX – nguy cơ thư lừa đảo': 'has MX – phishing-mail risk', 'đã có người dùng từ trước': 'already in use before tracking', 'đang phân giải': 'resolving',
    'vừa được đăng ký': 'newly registered', 'lỗi DNS': 'DNS error', 'tài khoản của mình không còn': 'our account is gone', 'tên đã có người khác dùng': 'name used by someone else', 'tên vừa bị người khác lấy': 'name just taken by someone else',
    'còn trống – nên giữ ngay': 'available – claim it now', 'chỉ kiểm tay được': 'manual check only', 'không kiểm được': 'check failed',
    // Tên miền
    '🌐 Tên miền na ná': '🌐 Lookalike domains', 'Kiểm DNS hằng ngày (NS/A/AAAA/MX qua DoH). Báo khi tên miền trước đó không phân giải nay phân giải, hoặc có MX mới – giữ đỏ tới khi bấm "Đã xem".': 'Daily DNS check (NS/A/AAAA/MX over DoH). Alerts when a domain that did not resolve starts resolving, or gets a new MX – stays red until you click "Seen".',
    'Tên miền': 'Domain', 'Bản ghi': 'Records', 'Từ': 'Since', 'Đã xem': 'Seen', 'chưa đăng ký': 'not registered', 'đã đăng ký': 'registered', 'Chưa có dữ liệu – chờ lần kiểm đầu.': 'No data yet – waiting for the first check.',
    'Đã đánh dấu đã xem': 'Marked as seen',
    // Tài khoản
    '👤 Tài khoản mạng xã hội': '👤 Social accounts', 'Danh sách tên cần giữ. Tự kiểm GitHub, Bluesky, YouTube (hồ sơ công khai); nền tảng khác anh tự kiểm rồi tích "Đã giữ".': 'Names to hold. GitHub, Bluesky and YouTube are checked automatically (public profiles); for other platforms check yourself and tick "Owned".',
    'Nền tảng': 'Platform', 'Tên': 'Name', 'Đã giữ': 'Owned', 'Tình trạng': 'State', 'Ghi chú': 'Notes', 'Thêm tài khoản': 'Add account', 'Lưu': 'Save', 'Hủy': 'Cancel',
    'Của mình': 'Ours', 'Người khác dùng': 'Taken', 'Còn trống': 'Available', 'Mất': 'Missing', 'Chưa rõ': 'Unknown', 'đã giữ {a}/{b}': 'owned {a}/{b}',
    // Sao chép
    '📄 Nghi bị chép nội dung': '📄 Suspected content copies', 'Kết quả dò hằng tuần (content-protect.yml → copy-watch.mjs). Mỗi trang nghi chép có mẫu DMCA điền sẵn.': 'Weekly search results (content-protect.yml → copy-watch.mjs). Each suspected page has a pre-filled DMCA notice.',
    'Chưa bật dò tự động – cần secret GitHub BRAVE_SEARCH_KEY (docs/CONTENT-PROTECTION.md).': 'Automatic search is off – needs the GitHub secret BRAVE_SEARCH_KEY (docs/CONTENT-PROTECTION.md).',
    'Chưa có kết quả – workflow Content protection chạy mỗi Chủ nhật.': 'No results yet – the Content protection workflow runs every Sunday.', 'Không thấy trang nào chép ({n} câu đã dò).': 'No copies found ({n} sentences searched).',
    'Bài gốc': 'Original', 'Trang nghi chép': 'Suspected copy',
    // Biểu mẫu
    'Sửa mục': 'Edit item', 'Mã (vd. devto-bai-moi)': 'ID (e.g. devto-new-post)', 'Tên trang': 'Site name', 'URL công khai (https://)': 'Public URL (https://)', 'Tài khoản (tên công khai, không email)': 'Account (public username, no email)',
    'chỉ nhắc tên – không có link': 'mention only – no link',
    'Ngày gửi': 'Submitted', 'Tên miền đích': 'Target domain', 'rel mong đợi': 'Expected rel', 'chưa biết (lấy lần kiểm đầu)': 'unknown (use first check)',
    'Thiếu hoặc sai: {f}': 'Missing or invalid: {f}', 'Mã đã tồn tại': 'This ID already exists', 'Không ghi email ở đây (repo/quản trị chỉ lưu tên công khai).': 'No emails here (only public usernames are stored).',
    'Đã lưu': 'Saved', 'Đã xóa': 'Deleted', 'Xóa mục này khỏi sổ theo dõi?': 'Remove this item from tracking?', 'Lỗi: {e}': 'Error: {e}', 'Sao chép': 'Copy', 'Đã sao chép': 'Copied', 'Đóng': 'Close',
    'Chép nội dung này vào content/pr/placements.json (giữ _note, version, fields) rồi chạy node scripts/pr-check.mjs --table.': 'Paste this into content/pr/placements.json (keep _note, version, fields), then run node scripts/pr-check.mjs --table.',
    // Cách xử lý
    'Cách xử lý: {t}': 'What to do: {t}', 'Mẫu (tiếng Anh, điền chỗ [..] trước khi gửi)': 'Template (English, fill the [..] blanks before sending)', 'Trang hỗ trợ': 'Support page',
    'Mở link bằng trình duyệt thường (không đăng nhập) để xác nhận – có thể chỉ là lỗi tạm.': 'Open the link in a normal browser (signed out) to confirm – it may be temporary.',
    'Đăng nhập tài khoản nền tảng, đọc thông báo hoặc thư về lý do gỡ/khóa.': 'Sign in to the platform and read the notice or email explaining the removal/ban.',
    'Đọc lại luật nội dung; sửa phần có thể vi phạm (tự quảng bá, nhiều link, nội dung AI chưa khai báo).': 'Re-read the content rules; fix anything that may violate them (self-promotion, many links, undisclosed AI content).',
    'Gửi khiếu nại bằng mẫu bên dưới qua trang hỗ trợ của nền tảng.': 'Send an appeal with the template below through the platform support page.',
    'Bài lên lại: hệ thống tự hết cảnh báo ở lần kiểm sau. Không lấy lại được: Sửa → trạng thái Đã gỡ.': 'If restored, the alert clears on the next check. If not recoverable: Edit → status Removed.',
    'Mở bài/hồ sơ, xem link về lexkite.com còn không (biên tập viên hoặc bộ lọc có thể đã gỡ).': 'Open the post/profile and check whether the lexkite.com link is still there (an editor or filter may have removed it).',
    'Thêm lại link (UTM theo content/pr/kit.md §7); nếu nền tảng tự gỡ thì hỏi lý do bằng mẫu bên dưới.': 'Add the link back (UTM per content/pr/kit.md §7); if the platform removed it, ask why with the template below.',
    'rel tụt xuống nofollow/ugc thường do nền tảng đổi chính sách hoặc hạ mức tin cậy tài khoản – vẫn nên giữ bài (lượt truy cập + thương hiệu).': 'rel dropping to nofollow/ugc usually means a platform policy change or lower account trust – keep the post anyway (traffic + brand).',
    'Chính sách chung của nền tảng: Sửa → rel mong đợi = nofollow để hết cảnh báo.': 'If it is a platform-wide policy: Edit → expected rel = nofollow to clear the alert.',
    'Kiểm cài đặt bài (một số nền tảng có tùy chọn ẩn khỏi máy tìm kiếm) và trạng thái tài khoản.': 'Check the post settings (some platforms can hide posts from search engines) and the account status.',
    'Không tự bật lại được: hỏi hỗ trợ bằng mẫu bên dưới.': 'If you cannot turn it back on: ask support with the template below.',
    'Mục đã lên – bấm "Đánh dấu live" để bắt đầu theo dõi mất link/rel.': 'The item is listed – click "Mark live" to start monitoring link/rel loss.',
    'Đọc bình luận của người duyệt, sửa theo góp ý; mở PR mới nếu phù hợp – hoặc Sửa → trạng thái Đã gỡ.': 'Read the maintainer comments and address them; open a new PR if appropriate – or Edit → status Removed.',
    'Mở trang bằng trình duyệt; nếu chặn bot thì đó không phải lỗi – xác nhận link và rel bằng tay.': 'Open the page in a browser; bot blocking is not an error – confirm the link and rel by hand.',
    'Mở {d} bằng trình duyệt an toàn (không nhập gì) – xem có giả mạo Lexkite không.': 'Open {d} in a safe browser (do not enter anything) – check whether it impersonates Lexkite.',
    'Tra nhà đăng ký, hosting và email lạm dụng bằng ICANN Lookup (RDAP).': 'Look up the registrar, host and abuse email with ICANN Lookup (RDAP).',
    'Giả mạo/lừa đảo: gửi mẫu báo lạm dụng bên dưới tới nhà đăng ký + hosting, và báo Google Safe Browsing.': 'Impersonation/phishing: send the abuse report below to the registrar + host, and report it to Google Safe Browsing.',
    'Có MX: tên miền nhận được thư – nguy cơ giả thư Lexkite. Nhắc người dùng chỉ tin thư từ @lexkite.com.': 'Has MX: the domain can receive mail – risk of fake Lexkite emails. Remind users to trust only @lexkite.com mail.',
    'Chỉ là tên miền đỗ/bán lại: bấm "Đã xem"; cân nhắc mua nếu giá rẻ.': 'Just parked/for sale: click "Seen"; consider buying it if cheap.',
    'Đăng nhập kiểm tài khoản; nếu bị khóa, làm theo hướng dẫn khiếu nại của nền tảng (mẫu bên dưới).': 'Sign in to check the account; if suspended, follow the platform appeal process (template below).',
    'Tên đã có người khác dùng: chọn biến thể (lexkiteapp, lexkite_app) và cập nhật; nếu họ mạo danh Lexkite thì báo cáo mạo danh trên nền tảng.': 'Name already taken: pick a variant (lexkiteapp, lexkite_app) and update; if they impersonate Lexkite, file an impersonation report.',
    'Còn trống: đăng ký bằng email chính thức (ACCOUNTS.local.md), bật 2FA, rồi tích "Đã giữ".': 'Available: register with the official email (ACCOUNTS.local.md), enable 2FA, then tick "Owned".',
    'Chưa kiểm tự động được: mở link hồ sơ bằng trình duyệt rồi cập nhật "Đã giữ".': 'Cannot be checked automatically: open the profile link in a browser and update "Owned".',
    'Mở trang nghi chép, chụp màn hình và lưu bản Wayback của trang đó làm bằng chứng.': 'Open the suspected page, take a screenshot and save a Wayback copy of it as evidence.',
    'Tra hosting/nhà đăng ký (ICANN Lookup) để tìm địa chỉ nhận DMCA/abuse.': 'Look up the host/registrar (ICANN Lookup) to find the DMCA/abuse contact.',
    'Gửi thông báo DMCA bên dưới (điền tên/địa chỉ thật theo docs/legal/DMCA-KIT.md).': 'Send the DMCA notice below (fill in your real name/address per docs/legal/DMCA-KIT.md).',
    'Yêu cầu Google gỡ khỏi kết quả tìm kiếm (biểu mẫu DMCA của Google).': 'Ask Google to remove it from search results (Google DMCA form).',
    'Ghi kết quả vào issue GitHub "Nghi bị chép nội dung".': 'Record the outcome in the GitHub issue "Suspected content copy".',
  };
  const TYPE = { article: ['📝', 'Bài viết'], listing: ['🚀', 'Trang ra mắt'], profile: ['👤', 'Hồ sơ'], pr: ['🔀', 'PR GitHub'], directory: ['📚', 'Thư mục'] };
  const STATUS = { live: ['ok', 'Đang hiển thị'], pending: ['info', 'Chờ duyệt'], draft: ['', 'Nháp'], removed: ['bad', 'Đã gỡ'] };
  const LEVEL = { regression: ['bad', 'Sự cố'], change: ['warn', 'Thay đổi'], manual: ['info', 'Kiểm tay'], ok: ['ok', 'Ổn'], skip: ['', 'Bỏ qua'] };
  const HSTATE = { ours: ['ok', 'Của mình'], taken: ['warn', 'Người khác dùng'], available: ['info', 'Còn trống'], missing: ['bad', 'Mất'], unknown: ['', 'Chưa rõ'] };
  const WHY = { removed: 'bị gỡ / 404', banned: 'tài khoản hoặc bài bị khóa', 'link-gone': 'mất link về lexkite.com', 'rel-nofollow': 'rel tụt xuống nofollow/ugc', 'noindex-added': 'trang bị thêm noindex', listed: 'đã lên – nên đổi sang live',
    merged: 'PR đã merge – nên đổi sang live', 'pr-closed': 'PR bị đóng, không merge', 'rel-follow': 'rel nâng lên follow', redirected: 'trang chuyển hướng', 'pr-open': 'PR đang chờ', 'not-listed': 'chưa lên', 'preview-noindex': 'trang xem trước (noindex)',
    blocked: 'bị chặn bot – mở bằng trình duyệt', error: 'lỗi mạng', 'no-url': 'chưa có URL', 'redirect-home': 'chuyển về trang chủ', resolves: 'tên miền bắt đầu phân giải', 'mx-added': 'có MX – nguy cơ thư lừa đảo',
    'baseline-active': 'đã có người dùng từ trước', active: 'đang phân giải', registered: 'vừa được đăng ký', 'dns-error': 'lỗi DNS', missing: 'tài khoản của mình không còn', taken: 'tên đã có người khác dùng', 'taken-now': 'tên vừa bị người khác lấy',
    claim: 'còn trống – nên giữ ngay', 'manual-only': 'chỉ kiểm tay được', 'check-failed': 'không kiểm được', draft: 'Nháp', pending: 'Chờ duyệt' };
  const SUPPORT = { devto: 'https://dev.to/contact', medium: 'https://help.medium.com/hc/en-us/requests/new', github: 'https://support.github.com/contact' };
  const ICANN = d => 'https://lookup.icann.org/en/lookup?name=' + encodeURIComponent(d), WAYBACK = u => 'https://web.archive.org/web/*/' + u;
  const SAFE_BROWSING = 'https://safebrowsing.google.com/safebrowsing/report_phish/', GOOGLE_DMCA = 'https://reportcontent.google.com/forms/dmca_search';
  const platKey = u => { try { const h = new URL(u).hostname.replace(/^www\./, ''); return h === 'dev.to' ? 'devto' : /(^|\.)medium\.com$/.test(h) ? 'medium' : h === 'github.com' ? 'github' : ''; } catch (e) { return ''; } };
  const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/;

  function render(box, bapi, L, { esc, when, lang, toast }) {
    const B = (vi, vars) => { if (lang() !== 'en' || !Object.prototype.hasOwnProperty.call(EN, vi)) return L(vi, vars); const s = EN[vi]; return vars ? s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? String(vars[k]) : m)) : s; };
    const say = (m, k) => (toast ? toast(m, k) : window.alert(m));
    const url = u => (/^https:\/\/[^\s<>"']+$/.test(String(u || '')) ? String(u) : '');
    const ext = (u, label) => (url(u) ? `<a href="${esc(url(u))}" target="_blank" rel="noopener noreferrer">${esc(label == null ? u : label)}</a>` : esc(label == null ? u || '–' : label));
    const chip = ([cls, vi]) => `<span class="chip ${cls}">${esc(B(vi))}</span>`;
    const why = rs => (rs || []).map(r => B(WHY[r] || r)).join(' · ');
    const yn = v => (v == null ? '?' : v ? '✓' : '✗');
    const F = { status: '', type: '', level: '', q: '' }; let D = null;

    async function load() {
      box.innerHTML = `<p class="small muted">${esc(B('Đang tải…'))}</p>`;
      try { D = await bapi('list'); } catch (e) { box.innerHTML = `<div class="card err-box"><p class="bad-t">✗ ${esc(B('Không tải được'))}: ${esc(e.message)}</p><button type="button" class="btn sm" id="bwRetry">${esc(B('Làm mới'))}</button></div>`; box.querySelector('#bwRetry').onclick = load; return; }
      paint();
    }
    function counts() { const c = { regression: 0, change: 0, manual: 0 }; for (const p of D.placements) if (p.last && c[p.last.level] != null) c[p.last.level]++; for (const d of D.domains) if (d.level === 'regression') c.regression++; for (const h of D.handles) if (h.last && h.last.level === 'regression') c.regression++; return c; }
    function paint() {
      const c = counts(), run = D.run, cf = D.configured || {};
      box.innerHTML = `<section class="card"><div class="card-h"><h2 class="h3">${esc(B('Backlink, PR & Thương hiệu'))}</h2>
          <div class="tools" style="margin:0"><button type="button" class="btn sm primary" id="bwNow">↻ ${esc(B('Kiểm ngay'))}</button><button type="button" class="btn sm" id="bwAdd">＋ ${esc(B('Thêm mục'))}</button><button type="button" class="btn sm ghost" id="bwExp">${esc(B('Xuất JSON'))}</button><button type="button" class="btn sm ghost" id="bwRe">${esc(B('Làm mới'))}</button></div></div>
          <p class="bw-kpi"><span class="chip bad">${esc(B('Sự cố'))}: ${c.regression}</span> <span class="chip warn">${esc(B('Thay đổi'))}: ${c.change}</span> <span class="chip info">${esc(B('Kiểm tay'))}: ${c.manual}</span>
          <span class="small muted">${esc(B('Lần kiểm cuối'))}: ${run ? esc(when(run.at)) : esc(B('chưa chạy'))}${run && url(run.url) ? ' · ' + ext(run.url, B('Xem lần chạy')) : ''}</span></p>
          ${cf.ci === false ? `<p class="small warn-t">⚠ ${esc(B('Máy chủ chưa có STUDIO_CALLBACK_SECRET – CI chưa gửi kết quả lên đây được (vẫn có artifact + issue GitHub).'))}</p>` : ''}
          ${cf.mail ? `<p class="tiny muted">${esc(B('📰 Bản tin tuần + thư sự cố nghiêm trọng gửi qua lexkite-mail.'))}</p>` : ''}
          <div id="bwPlay" hidden></div><div id="bwForm" hidden></div></section>
        <section class="card mt"><div class="card-h"><h3>${esc(B('🔗 Bài PR & hồ sơ'))}</h3></div>
          <div class="tools"><select id="bwFs" aria-label="${esc(B('Lọc trạng thái'))}"><option value="">${esc(B('Mọi trạng thái'))}</option>${Object.entries(STATUS).map(([k, v]) => `<option value="${k}"${F.status === k ? ' selected' : ''}>${esc(B(v[1]))}</option>`).join('')}</select>
          <select id="bwFt" aria-label="${esc(B('Lọc loại'))}"><option value="">${esc(B('Mọi loại'))}</option>${Object.entries(TYPE).map(([k, v]) => `<option value="${k}"${F.type === k ? ' selected' : ''}>${esc(B(v[1]))}</option>`).join('')}</select>
          <select id="bwFl" aria-label="${esc(B('Lọc kết quả'))}"><option value="">${esc(B('Mọi kết quả'))}</option>${Object.entries(LEVEL).map(([k, v]) => `<option value="${k}"${F.level === k ? ' selected' : ''}>${esc(B(v[1]))}</option>`).join('')}</select>
          <input id="bwFq" type="search" value="${esc(F.q)}" placeholder="${esc(B('Tìm trang, URL, tài khoản…'))}" aria-label="${esc(B('Tìm'))}"></div>
          <div class="tbl-wrap" id="bwT"></div></section>
        <section class="card mt"><div class="card-h"><h3>${esc(B('🌐 Tên miền na ná'))}</h3></div><p class="small muted">${esc(B('Kiểm DNS hằng ngày (NS/A/AAAA/MX qua DoH). Báo khi tên miền trước đó không phân giải nay phân giải, hoặc có MX mới – giữ đỏ tới khi bấm "Đã xem".'))}</p><div class="tbl-wrap" id="bwD"></div></section>
        <section class="card mt"><div class="card-h"><h3>${esc(B('👤 Tài khoản mạng xã hội'))} <span class="small muted">${esc(B('đã giữ {a}/{b}', { a: D.handles.filter(h => h.status === 'owned').length, b: D.handles.length }))}</span></h3><button type="button" class="btn sm" id="bwHAdd">＋ ${esc(B('Thêm tài khoản'))}</button></div><p class="small muted">${esc(B('Danh sách tên cần giữ. Tự kiểm GitHub, Bluesky, YouTube (hồ sơ công khai); nền tảng khác anh tự kiểm rồi tích "Đã giữ".'))}</p><div id="bwHForm" hidden></div><div class="tbl-wrap" id="bwH"></div></section>
        <section class="card mt"><div class="card-h"><h3>${esc(B('📄 Nghi bị chép nội dung'))}</h3></div><p class="small muted">${esc(B('Kết quả dò hằng tuần (content-protect.yml → copy-watch.mjs). Mỗi trang nghi chép có mẫu DMCA điền sẵn.'))}</p><div id="bwC"></div></section>`;
      const $ = s => box.querySelector(s);
      $('#bwRe').onclick = load; $('#bwAdd').onclick = () => form(null); $('#bwExp').onclick = exportJson; $('#bwHAdd').onclick = () => hform();
      $('#bwNow').onclick = async () => { const b = $('#bwNow'); b.disabled = true; try { await bapi('checkNow'); say(B('Đã yêu cầu chạy kiểm – kết quả sau khoảng 5 phút.')); } catch (e) { say(e.code === 'not-configured' ? B('Chưa đặt GH_DISPATCH_TOKEN ở Cloudflare – chạy tay workflow pr-check.yml trên GitHub.') : B('Lỗi: {e}', { e: e.message }), 'bad'); } b.disabled = false; };
      for (const [id, k] of [['#bwFs', 'status'], ['#bwFt', 'type'], ['#bwFl', 'level']]) $(id).onchange = e => { F[k] = e.target.value; table(); };
      $('#bwFq').oninput = e => { F.q = e.target.value; table(); };
      table(); domains(); handles(); copies();
    }
    // ---------- Bảng bài PR ----------
    function table() {
      const q = F.q.trim().toLowerCase(), rows = D.placements.filter(p => (!F.status || p.status === F.status) && (!F.type || p.type === F.type) && (!F.level || (p.last ? p.last.level : '') === F.level) && (!q || [p.platform, p.url, p.account, p.notes].join(' ').toLowerCase().includes(q)));
      const order = { regression: 0, change: 1, manual: 2, ok: 3, skip: 4 }; rows.sort((a, b) => (order[a.last ? a.last.level : 'skip'] ?? 5) - (order[b.last ? b.last.level : 'skip'] ?? 5) || a.platform.localeCompare(b.platform));
      const el = box.querySelector('#bwT');
      if (!rows.length) { el.innerHTML = `<p class="small muted">${esc(B('Không có mục nào khớp bộ lọc.'))}</p>`; return; }
      el.innerHTML = `<table class="tbl bw-tbl"><thead><tr><th scope="col">${esc(B('Trang'))}</th><th scope="col">${esc(B('Loại'))}</th><th scope="col">${esc(B('Tài khoản'))}</th><th scope="col">${esc(B('Trạng thái'))}</th><th scope="col">${esc(B('Kiểm lúc'))}</th><th scope="col">HTTP</th><th scope="col">${esc(B('Link'))}</th><th scope="col">rel</th><th scope="col">${esc(B('Kết quả'))}</th><th scope="col">${esc(B('Lịch sử'))}</th><th scope="col"><span class="sr-only">${esc(B('Sửa'))}</span></th></tr></thead><tbody>${rows.map(p => {
        const l = p.last, t = TYPE[p.type] || ['🔗', p.type], lv = l ? LEVEL[l.level] || LEVEL.manual : null, act = l && (l.reasons.includes('listed') || l.reasons.includes('merged')) && p.status === 'pending';
        return `<tr data-id="${esc(p.id)}" class="${l && l.level === 'regression' ? 'bad-row' : ''}"><td><span aria-hidden="true">${t[0]}</span> <b>${esc(p.platform)}</b><div class="tiny bw-url">${ext(p.url, p.url ? p.url.replace(/^https:\/\//, '').slice(0, 60) : '–')}</div></td>
          <td class="small">${esc(B(t[1]))}</td><td class="small">${p.account ? '@' + esc(p.account) : '–'}</td><td>${chip(STATUS[p.status] || ['', p.status])}</td>
          <td class="small nowrap">${l ? esc(when(l.at)) : esc(B('chưa kiểm'))}</td><td class="small">${l && l.http ? esc(l.http) : '–'}</td><td title="${esc(l && l.final ? l.final : '')}">${l ? yn(l.link) : '–'}</td>
          <td class="small">${l && l.rel ? esc(l.rel) : '–'}${l && l.noindex ? ' · <span class="chip warn">noindex</span>' : ''}</td>
          <td>${lv ? chip(lv) : '–'}<div class="tiny muted">${l ? esc(why(l.reasons)) : ''}</div></td>
          <td><span class="bw-spark" role="img" aria-label="${esc(B('Lịch sử'))}">${(p.history || []).map(h => `<i class="bw-h ${esc((LEVEL[h.level] || LEVEL.skip)[0])}" title="${esc(when(h.at) + ' · ' + h.state + (h.http ? ' · ' + h.http : ''))}"></i>`).join('')}</span><div class="tiny muted">${l && l.change ? esc(B('Đổi lúc')) + ' ' + esc(when(l.change)) : ''}</div></td>
          <td class="nowrap">${act ? `<button type="button" class="btn sm primary" data-live="${esc(p.id)}">${esc(B('Đánh dấu live'))}</button> ` : ''}${l && l.level !== 'ok' && l.level !== 'skip' ? `<button type="button" class="btn sm ghost" data-play="${esc(p.id)}">${esc(B('Cách xử lý'))}</button> ` : ''}<button type="button" class="btn sm ghost" data-edit="${esc(p.id)}">${esc(B('Sửa'))}</button></td></tr>`;
      }).join('')}</tbody></table>`;
      const byId = id => D.placements.find(p => p.id === id);
      el.querySelectorAll('[data-edit]').forEach(b => { b.onclick = () => form(byId(b.dataset.edit)); });
      el.querySelectorAll('[data-play]').forEach(b => { b.onclick = () => play(placementPlay(byId(b.dataset.play))); });
      el.querySelectorAll('[data-live]').forEach(b => { b.onclick = async () => { const p = byId(b.dataset.live); try { await bapi('placementSet', { row: { ...strip(p), status: 'live' } }); say(B('Đã lưu')); load(); } catch (e) { say(B('Lỗi: {e}', { e: e.message }), 'bad'); } }; });
    }
    const strip = p => ({ id: p.id, platform: p.platform, type: p.type, url: p.url, account: p.account, submittedAt: p.submittedAt, status: p.status, expectLink: p.expectLink, expectedRel: p.expectedRel, notes: p.notes });
    // ---------- Biểu mẫu thêm/sửa ----------
    function form(p) {
      const el = box.querySelector('#bwForm'), isNew = !p, v = p ? strip(p) : { id: '', platform: '', type: 'article', url: '', account: '', submittedAt: new Date().toISOString().slice(0, 10), status: 'pending', expectLink: 'lexkite.com', expectedRel: 'unknown', notes: '' };
      const inp = (k, label, extra = '') => `<label class="bw-f">${esc(B(label))}<input name="${k}" value="${esc(v[k] || '')}" ${extra}></label>`;
      const sel = (k, label, opts) => `<label class="bw-f">${esc(B(label))}<select name="${k}">${opts.map(([o, t]) => `<option value="${o}"${v[k] === o ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select></label>`;
      el.hidden = false;
      el.innerHTML = `<div class="bw-box"><h3>${esc(isNew ? B('Thêm mục') : B('Sửa mục'))}</h3><div class="bw-grid">
        ${inp('id', 'Mã (vd. devto-bai-moi)', isNew ? 'required pattern="[a-z0-9][a-z0-9-]{1,59}"' : 'readonly')}${inp('platform', 'Tên trang', 'required')}
        ${sel('type', 'Loại', Object.entries(TYPE).map(([k, t]) => [k, B(t[1])]))}${sel('status', 'Trạng thái', Object.entries(STATUS).map(([k, t]) => [k, B(t[1])]))}
        ${inp('url', 'URL công khai (https://)', 'type="url" placeholder="https://"')}${inp('account', 'Tài khoản (tên công khai, không email)')}
        ${inp('submittedAt', 'Ngày gửi', 'type="date"')}${inp('expectLink', 'Tên miền đích')}
        ${sel('expectedRel', 'rel mong đợi', [['unknown', B('chưa biết (lấy lần kiểm đầu)')], ['follow', 'follow'], ['nofollow', 'nofollow'], ['ugc', 'ugc'], ['sponsored', 'sponsored'], ['none', B('chỉ nhắc tên – không có link')]])}
        <label class="bw-f wide">${esc(B('Ghi chú'))}<textarea name="notes" rows="2" maxlength="500">${esc(v.notes || '')}</textarea></label></div>
        <p class="fld-err" id="bwErr" role="alert"></p>
        <div class="row between">${isNew ? '<span></span>' : `<button type="button" class="btn sm ghost danger" id="bwDel">${esc(B('Xóa'))}</button>`}<span class="row" style="gap:.5rem"><button type="button" class="btn sm ghost" id="bwCancel">${esc(B('Hủy'))}</button><button type="button" class="btn sm primary" id="bwSave">${esc(B('Lưu'))}</button></span></div></div>`;
      const q = s => el.querySelector(s), err = m => { q('#bwErr').textContent = m; };
      q('#bwCancel').onclick = () => { el.hidden = true; el.innerHTML = ''; };
      q('#bwSave').onclick = async () => {
        const row = {}; el.querySelectorAll('[name]').forEach(i => { row[i.name] = i.value.trim(); });
        const bad = [];
        if (!/^[a-z0-9][a-z0-9-]{1,59}$/.test(row.id)) bad.push('id'); if (!row.platform) bad.push('platform');
        if (row.url && !/^https:\/\/[^\s<>"']+$/.test(row.url)) bad.push('url'); if ((row.status === 'live' || row.status === 'pending') && !row.url) bad.push('url');
        if (EMAIL.test([row.account, row.notes, row.url].join(' '))) return err(B('Không ghi email ở đây (repo/quản trị chỉ lưu tên công khai).'));
        if (bad.length) return err(B('Thiếu hoặc sai: {f}', { f: [...new Set(bad)].join(', ') }));
        try { await bapi('placementSet', { row, isNew }); say(B('Đã lưu')); load(); }
        catch (e) { err(e.code === 'exists' ? B('Mã đã tồn tại') : e.code === 'invalid' && e.data && e.data.fields ? (e.data.fields.includes('email') ? B('Không ghi email ở đây (repo/quản trị chỉ lưu tên công khai).') : B('Thiếu hoặc sai: {f}', { f: e.data.fields.join(', ') })) : B('Lỗi: {e}', { e: e.message })); }
      };
      const del = q('#bwDel'); if (del) del.onclick = async () => { if (!window.confirm(B('Xóa mục này khỏi sổ theo dõi?'))) return; try { await bapi('placementDelete', { id: v.id }); say(B('Đã xóa')); load(); } catch (e) { err(B('Lỗi: {e}', { e: e.message })); } };
      const first = q(isNew ? '[name=id]' : '[name=platform]'); if (first) first.focus();
    }
    async function exportJson() {
      try { const j = await bapi('export'); play({ title: B('Xuất JSON'), steps: [B('Chép nội dung này vào content/pr/placements.json (giữ _note, version, fields) rồi chạy node scripts/pr-check.mjs --table.')], tpl: JSON.stringify(j.placements, null, 2) }); }
      catch (e) { say(B('Lỗi: {e}', { e: e.message }), 'bad'); }
    }
    // ---------- Tên miền ----------
    function domains() {
      const el = box.querySelector('#bwD'), rows = D.domains.slice().sort((a, b) => (a.level === 'regression' ? 0 : 1) - (b.level === 'regression' ? 0 : 1) || a.domain.localeCompare(b.domain));
      if (!rows.length) { el.innerHTML = `<p class="small muted">${esc(B('Chưa có dữ liệu – chờ lần kiểm đầu.'))}</p>`; return; }
      const rec = d => [d.a && 'A', d.aaaa && 'AAAA', d.mx && 'MX', d.ns && 'NS'].filter(Boolean).map(x => `<span class="chip ${x === 'MX' ? 'warn' : 'info'}">${x}</span>`).join(' ') || `<span class="small muted">${esc(B(d.status === 'nx' ? 'chưa đăng ký' : 'đã đăng ký'))}</span>`;
      el.innerHTML = `<table class="tbl"><thead><tr><th scope="col">${esc(B('Tên miền'))}</th><th scope="col">${esc(B('Bản ghi'))}</th><th scope="col">${esc(B('Kết quả'))}</th><th scope="col">${esc(B('Từ'))}</th><th scope="col"><span class="sr-only">${esc(B('Cách xử lý'))}</span></th></tr></thead><tbody>${rows.map(d => `<tr class="${d.level === 'regression' ? 'bad-row' : ''}">
        <td><code>${esc(d.domain)}</code>${d.mxHosts && d.mxHosts.length ? `<div class="tiny muted">MX: ${esc(d.mxHosts.join(', '))}</div>` : ''}</td><td>${rec(d)}</td><td>${chip(LEVEL[d.level] || LEVEL.manual)}<div class="tiny muted">${esc(why(d.reasons))}</div></td>
        <td class="small nowrap">${d.since ? esc(when(d.since)) : '–'}</td><td class="nowrap">${d.level === 'regression' ? `<button type="button" class="btn sm ghost" data-dplay="${esc(d.domain)}">${esc(B('Cách xử lý'))}</button> <button type="button" class="btn sm" data-ack="${esc(d.domain)}">${esc(B('Đã xem'))}</button>` : d.a || d.aaaa || d.mx ? `<button type="button" class="btn sm ghost" data-dplay="${esc(d.domain)}">${esc(B('Cách xử lý'))}</button>` : ''}</td></tr>`).join('')}</tbody></table>`;
      el.querySelectorAll('[data-ack]').forEach(b => { b.onclick = async () => { try { await bapi('domainAck', { domain: b.dataset.ack }); say(B('Đã đánh dấu đã xem')); load(); } catch (e) { say(B('Lỗi: {e}', { e: e.message }), 'bad'); } }; });
      el.querySelectorAll('[data-dplay]').forEach(b => { b.onclick = () => play(domainPlay(D.domains.find(d => d.domain === b.dataset.dplay))); });
    }
    // ---------- Tài khoản ----------
    function handles() {
      const el = box.querySelector('#bwH');
      el.innerHTML = `<table class="tbl"><thead><tr><th scope="col">${esc(B('Nền tảng'))}</th><th scope="col">${esc(B('Tên'))}</th><th scope="col">${esc(B('Đã giữ'))}</th><th scope="col">${esc(B('Tình trạng'))}</th><th scope="col">${esc(B('Ghi chú'))}</th><th scope="col"><span class="sr-only">${esc(B('Cách xử lý'))}</span></th></tr></thead><tbody>${D.handles.map(h => {
        const st = h.last ? HSTATE[h.last.state] || HSTATE.unknown : HSTATE.unknown;
        return `<tr class="${h.last && h.last.level === 'regression' ? 'bad-row' : ''}"><td>${esc(h.platform)}</td><td>${ext(h.url, '@' + h.handle)}</td>
          <td><input type="checkbox" data-own="${esc(h.k)}"${h.status === 'owned' ? ' checked' : ''} aria-label="${esc(B('Đã giữ') + ': ' + h.platform + ' @' + h.handle)}"></td>
          <td>${chip(st)}<div class="tiny muted">${h.last ? esc(why(h.last.reasons)) : ''}</div></td><td class="small">${esc(h.notes || '')}</td>
          <td class="nowrap"><button type="button" class="btn sm ghost" data-hplay="${esc(h.k)}">${esc(B('Cách xử lý'))}</button> <button type="button" class="btn sm ghost danger" data-hdel="${esc(h.k)}">${esc(B('Xóa'))}</button></td></tr>`;
      }).join('')}</tbody></table>`;
      const byK = k => D.handles.find(h => h.k === k);
      el.querySelectorAll('[data-own]').forEach(c => { c.onchange = async () => { const h = byK(c.dataset.own); try { await bapi('handleSet', { row: { platform: h.platform, handle: h.handle, url: h.url, notes: h.notes, status: c.checked ? 'owned' : 'not-yet' } }); say(B('Đã lưu')); load(); } catch (e) { c.checked = !c.checked; say(B('Lỗi: {e}', { e: e.message }), 'bad'); } }; });
      el.querySelectorAll('[data-hplay]').forEach(b => { b.onclick = () => play(handlePlay(byK(b.dataset.hplay))); });
      el.querySelectorAll('[data-hdel]').forEach(b => { b.onclick = async () => { if (!window.confirm(B('Xóa mục này khỏi sổ theo dõi?'))) return; try { await bapi('handleDelete', { k: b.dataset.hdel }); say(B('Đã xóa')); load(); } catch (e) { say(B('Lỗi: {e}', { e: e.message }), 'bad'); } }; });
    }
    function hform() {
      const el = box.querySelector('#bwHForm'); el.hidden = false;
      el.innerHTML = `<div class="bw-box"><div class="bw-grid"><label class="bw-f">${esc(B('Nền tảng'))}<select name="platform">${['x', 'facebook', 'instagram', 'tiktok', 'youtube', 'threads', 'linkedin', 'pinterest', 'reddit', 'github', 'bluesky'].map(p => `<option>${p}</option>`).join('')}</select></label>
        <label class="bw-f">${esc(B('Tên'))}<input name="handle" required></label><label class="bw-f">${esc(B('Ghi chú'))}<input name="notes" maxlength="300"></label>
        <label class="bw-f">${esc(B('Đã giữ'))}<input type="checkbox" name="owned"></label></div><p class="fld-err" id="bwHErr" role="alert"></p>
        <div class="row" style="gap:.5rem;justify-content:flex-end"><button type="button" class="btn sm ghost" id="bwHC">${esc(B('Hủy'))}</button><button type="button" class="btn sm primary" id="bwHS">${esc(B('Lưu'))}</button></div></div>`;
      const q = s => el.querySelector(s);
      q('#bwHC').onclick = () => { el.hidden = true; el.innerHTML = ''; };
      q('#bwHS').onclick = async () => {
        const row = { platform: q('[name=platform]').value, handle: q('[name=handle]').value.trim().replace(/^@/, ''), notes: q('[name=notes]').value.trim(), status: q('[name=owned]').checked ? 'owned' : 'not-yet' };
        if (!/^[A-Za-z0-9_.-]{1,60}$/.test(row.handle)) return void (q('#bwHErr').textContent = B('Thiếu hoặc sai: {f}', { f: 'handle' }));
        if (EMAIL.test(row.notes)) return void (q('#bwHErr').textContent = B('Không ghi email ở đây (repo/quản trị chỉ lưu tên công khai).'));
        try { await bapi('handleSet', { row }); say(B('Đã lưu')); load(); } catch (e) { q('#bwHErr').textContent = B('Lỗi: {e}', { e: e.message }); }
      };
    }
    // ---------- Bản sao chép ----------
    function copies() {
      const el = box.querySelector('#bwC'), c = D.copy;
      if (!c) { el.innerHTML = `<p class="small muted">${esc(B('Chưa có kết quả – workflow Content protection chạy mỗi Chủ nhật.'))}</p>`; return; }
      if (c.configured === false) { el.innerHTML = `<p class="small warn-t">⚠ ${esc(B('Chưa bật dò tự động – cần secret GitHub BRAVE_SEARCH_KEY (docs/CONTENT-PROTECTION.md).'))}</p>`; return; }
      const hits = []; (c.probes || []).forEach((p, i) => (p.suspects || []).forEach((s, j) => hits.push({ p, s, k: i + ':' + j })));
      if (!hits.length) { el.innerHTML = `<p class="small muted">✓ ${esc(B('Không thấy trang nào chép ({n} câu đã dò).', { n: (c.probes || []).length }))} · ${esc(when(c.at))}</p>`; return; }
      el.innerHTML = `<table class="tbl"><thead><tr><th scope="col">${esc(B('Trang nghi chép'))}</th><th scope="col">${esc(B('Bài gốc'))}</th><th scope="col"><span class="sr-only">${esc(B('Cách xử lý'))}</span></th></tr></thead><tbody>${hits.map(h => `<tr class="bad-row"><td>${ext(h.s.url)}<div class="tiny muted">${esc(h.s.title || '')}</div></td><td>${ext(h.p.url)}<div class="tiny muted">“${esc(h.p.sentence)}”</div></td><td><button type="button" class="btn sm ghost" data-cplay="${esc(h.k)}">${esc(B('Cách xử lý'))}</button></td></tr>`).join('')}</tbody></table>`;
      el.querySelectorAll('[data-cplay]').forEach(b => { b.onclick = () => { const h = hits.find(x => x.k === b.dataset.cplay); play(copyPlay(h.p, h.s, c.at)); }; });
    }
    // ---------- Cách xử lý (playbook) + mẫu điền sẵn ----------
    const today = () => new Date().toISOString().slice(0, 10);
    function placementPlay(p) {
      const rs = (p.last && p.last.reasons) || [], sup = SUPPORT[platKey(p.url)], steps = [], links = sup ? [[B('Trang hỗ trợ'), sup]] : [];
      let tpl = '';
      if (rs.includes('removed') || rs.includes('banned')) {
        steps.push(B('Mở link bằng trình duyệt thường (không đăng nhập) để xác nhận – có thể chỉ là lỗi tạm.'), B('Đăng nhập tài khoản nền tảng, đọc thông báo hoặc thư về lý do gỡ/khóa.'), B('Đọc lại luật nội dung; sửa phần có thể vi phạm (tự quảng bá, nhiều link, nội dung AI chưa khai báo).'), B('Gửi khiếu nại bằng mẫu bên dưới qua trang hỗ trợ của nền tảng.'), B('Bài lên lại: hệ thống tự hết cảnh báo ở lần kiểm sau. Không lấy lại được: Sửa → trạng thái Đã gỡ.'));
        tpl = `Subject: Appeal – ${rs.includes('banned') ? 'account/post restriction' : 'removed post'} (${p.platform})\n\nHello ${p.platform} support team,\n\nMy ${p.type === 'article' ? 'post' : 'page'} at ${p.url}${p.account ? ` (account: @${p.account})` : ''} is no longer available as of ${today()}. I could not find a notice explaining which rule it broke.\n\nThe content is an original technical write-up about Lexkite (https://lexkite.com), a free vocabulary-learning web app that I build. It contains one link to the project and no paid promotion. If any part conflicts with your guidelines, please tell me which one and I will edit it right away.\n\nCould you please review and restore it?\n\nThank you,\n[Your name]\nLexkite`;
      } else if (rs.includes('link-gone')) {
        steps.push(B('Mở bài/hồ sơ, xem link về lexkite.com còn không (biên tập viên hoặc bộ lọc có thể đã gỡ).'), B('Thêm lại link (UTM theo content/pr/kit.md §7); nếu nền tảng tự gỡ thì hỏi lý do bằng mẫu bên dưới.'));
        tpl = `Subject: Question about a removed link (${p.platform})\n\nHello,\n\nThe link to https://lexkite.com was removed from ${p.url} on or before ${today()}. Could you let me know whether this was intentional and which guideline applies? I am happy to adjust the wording or placement of the link.\n\nThank you,\n[Your name]\nLexkite`;
      } else if (rs.includes('rel-nofollow')) steps.push(B('rel tụt xuống nofollow/ugc thường do nền tảng đổi chính sách hoặc hạ mức tin cậy tài khoản – vẫn nên giữ bài (lượt truy cập + thương hiệu).'), B('Chính sách chung của nền tảng: Sửa → rel mong đợi = nofollow để hết cảnh báo.'));
      else if (rs.includes('noindex-added')) {
        steps.push(B('Kiểm cài đặt bài (một số nền tảng có tùy chọn ẩn khỏi máy tìm kiếm) và trạng thái tài khoản.'), B('Không tự bật lại được: hỏi hỗ trợ bằng mẫu bên dưới.'));
        tpl = `Subject: Page is now marked noindex (${p.platform})\n\nHello,\n\nSince ${today()} my page ${p.url} is served with a noindex directive, so it no longer appears in search engines. I did not change any visibility setting. Could you check whether my account or the page is restricted, and how to make it indexable again?\n\nThank you,\n[Your name]\nLexkite`;
      } else if (rs.includes('listed') || rs.includes('merged')) steps.push(B('Mục đã lên – bấm "Đánh dấu live" để bắt đầu theo dõi mất link/rel.'));
      else if (rs.includes('pr-closed')) steps.push(B('Đọc bình luận của người duyệt, sửa theo góp ý; mở PR mới nếu phù hợp – hoặc Sửa → trạng thái Đã gỡ.'));
      else steps.push(B('Mở trang bằng trình duyệt; nếu chặn bot thì đó không phải lỗi – xác nhận link và rel bằng tay.'));
      return { title: p.platform, steps, links: [[p.url.replace(/^https:\/\//, '').slice(0, 50), p.url], ...links], tpl };
    }
    function domainPlay(d) {
      const steps = [B('Mở {d} bằng trình duyệt an toàn (không nhập gì) – xem có giả mạo Lexkite không.', { d: d.domain }), B('Tra nhà đăng ký, hosting và email lạm dụng bằng ICANN Lookup (RDAP).'), B('Giả mạo/lừa đảo: gửi mẫu báo lạm dụng bên dưới tới nhà đăng ký + hosting, và báo Google Safe Browsing.')];
      if (d.mx) steps.push(B('Có MX: tên miền nhận được thư – nguy cơ giả thư Lexkite. Nhắc người dùng chỉ tin thư từ @lexkite.com.'));
      steps.push(B('Chỉ là tên miền đỗ/bán lại: bấm "Đã xem"; cân nhắc mua nếu giá rẻ.'));
      const tpl = `Subject: Abuse report – lookalike domain ${d.domain} impersonating lexkite.com\n\nTo: [Registrar / hosting abuse contact from ICANN Lookup]\n\nHello,\n\nI am the operator of Lexkite (https://lexkite.com). The domain ${d.domain} closely imitates our name${d.since ? ` and started resolving on ${new Date(d.since).toISOString().slice(0, 10)}` : ''}.\nObserved DNS records: ${[d.a && 'A', d.aaaa && 'AAAA', d.mx && 'MX'].filter(Boolean).join(', ') || 'none'}${d.ips && d.ips.length ? `\nIP addresses: ${d.ips.join(', ')}` : ''}${d.mxHosts && d.mxHosts.length ? `\nMail servers (MX): ${d.mxHosts.join(', ')}` : ''}\n\nEvidence of misuse: [describe what the site shows – copied logo/branding, login or payment form, phishing emails received; attach screenshots]\n\nWe believe this domain is used to deceive our users. Please investigate and suspend it under your abuse policy.\n\nRegards,\n[Your name]\nLexkite – https://lexkite.com\n[Contact email]`;
      return { title: d.domain, steps, links: [['ICANN Lookup', ICANN(d.domain)], ['Google Safe Browsing', SAFE_BROWSING]], tpl };
    }
    function handlePlay(h) {
      const s = h.last ? h.last.state : 'unknown', steps = [];
      let tpl = '';
      if (s === 'missing') { steps.push(B('Đăng nhập kiểm tài khoản; nếu bị khóa, làm theo hướng dẫn khiếu nại của nền tảng (mẫu bên dưới).')); tpl = `Subject: Appeal – account @${h.handle} suspended or unavailable\n\nHello ${h.platform} support,\n\nThe account @${h.handle} (${h.url}) is the official account of Lexkite (https://lexkite.com) and has become unavailable as of ${today()}. We are not aware of any violation. Please review the account and restore access, or tell us what needs to be fixed.\n\nThank you,\n[Your name]\nLexkite`; }
      else if (s === 'taken') steps.push(B('Tên đã có người khác dùng: chọn biến thể (lexkiteapp, lexkite_app) và cập nhật; nếu họ mạo danh Lexkite thì báo cáo mạo danh trên nền tảng.'));
      else if (s === 'available') steps.push(B('Còn trống: đăng ký bằng email chính thức (ACCOUNTS.local.md), bật 2FA, rồi tích "Đã giữ".'));
      else steps.push(B('Chưa kiểm tự động được: mở link hồ sơ bằng trình duyệt rồi cập nhật "Đã giữ".'));
      return { title: `${h.platform} @${h.handle}`, steps, links: [['@' + h.handle, h.url]], tpl };
    }
    function copyPlay(p, s, at) {
      const steps = [B('Mở trang nghi chép, chụp màn hình và lưu bản Wayback của trang đó làm bằng chứng.'), B('Tra hosting/nhà đăng ký (ICANN Lookup) để tìm địa chỉ nhận DMCA/abuse.'), B('Gửi thông báo DMCA bên dưới (điền tên/địa chỉ thật theo docs/legal/DMCA-KIT.md).'), B('Yêu cầu Google gỡ khỏi kết quả tìm kiếm (biểu mẫu DMCA của Google).'), B('Ghi kết quả vào issue GitHub "Nghi bị chép nội dung".')];
      let host = ''; try { host = new URL(s.url).hostname; } catch (e) { host = ''; }
      const tpl = `Subject: DMCA Takedown Notice – copied content from lexkite.com\n\nTo: [Service provider / designated DMCA agent / abuse contact for ${host}]\n\nI am the [owner / authorized agent of the owner] of the copyrighted work described below.\n\n1. Original work:\n   - ${p.url}\n     (archived copies: ${WAYBACK(p.url)})\n   Example passage: "${p.sentence}"\n\n2. Infringing material:\n   - ${s.url}  – copies the text of the work above verbatim, found on ${new Date(at || Date.now()).toISOString().slice(0, 10)}\n\n3. Contact information:\n   Name: [Full legal name]            Organization: Lexkite\n   Address: [Postal address]\n   Email: [email]                     Phone: [phone]\n\n4. I have a good faith belief that use of the material in the manner complained of is not authorized by the copyright owner, its agent, or the law.\n\n5. The information in this notification is accurate, and under penalty of perjury, I am the owner, or authorized to act on behalf of the owner, of the copyright that is allegedly infringed.\n\nSignature: /[Full legal name]/\nDate: ${today()}`;
      return { title: host || s.url, steps, links: [['Wayback', WAYBACK(p.url)], ['ICANN Lookup', ICANN(host)], ['Google DMCA', GOOGLE_DMCA]], tpl };
    }
    function play(pb) {
      const el = box.querySelector('#bwPlay'); el.hidden = false;
      el.innerHTML = `<div class="bw-box bw-play"><div class="row between"><h3>${esc(B('Cách xử lý: {t}', { t: pb.title }))}</h3><button type="button" class="btn sm ghost" id="bwPClose">${esc(B('Đóng'))}</button></div>
        <ol class="small">${pb.steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol>${(pb.links || []).length ? `<p class="small">${pb.links.map(([t, u]) => ext(u, t)).join(' · ')}</p>` : ''}
        ${pb.tpl ? `<label class="bw-f wide">${esc(B('Mẫu (tiếng Anh, điền chỗ [..] trước khi gửi)'))}<textarea id="bwTpl" rows="12" readonly>${esc(pb.tpl)}</textarea></label><button type="button" class="btn sm" id="bwCopy">${esc(B('Sao chép'))}</button>` : ''}</div>`;
      el.querySelector('#bwPClose').onclick = () => { el.hidden = true; el.innerHTML = ''; };
      const cp = el.querySelector('#bwCopy'); if (cp) cp.onclick = async () => { try { await navigator.clipboard.writeText(pb.tpl); say(B('Đã sao chép')); } catch (e) { el.querySelector('#bwTpl').select(); } };
      if (el.scrollIntoView) el.scrollIntoView({ block: 'nearest' });
    }
    const tab = document.querySelector('#tabs [data-tab="backlinks"] .nav-l'); if (tab) tab.textContent = B('Backlink, PR & Thương hiệu');
    load();
  }
  window.AdminBacklinks = { render };
})();
