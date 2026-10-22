/* Quản trị → "🎬 Thư viện video": duyệt & xem mọi short đã dựng (repo riêng tư lexkite-shorts) + thống kê đầy đủ.
 * Tải lười khi mở tab (admin.js). AdminVideo.render(container, vapi, L, { esc, lang, toast })
 *   vapi(op, body) → POST /api/admin-shorts (functions/api/admin-shorts.js, adminGate). Bìa/video = URL ký ngắn hạn do máy chủ cấp
 *   (nguồn: Kho Drive riêng – không cần token GitHub; kho chưa sẵn sàng → manifest gói sẵn, bìa/video hiện "chưa có"). Biểu đồ = SVG nội tuyến, không thư viện. Chữ EN ở bảng EN. */
(function () {
  const EN = {
    "Kênh {c} · sẵn sàng đăng {r} · đã đăng (dò thấy) {u} · trên web {l} · cần xử lý {i}": "Channel {c} · ready to upload {r} · uploaded (detected) {u} · live on web {l} · needs attention {i}", "Cách đăng": "Upload path", "Tay qua YouTube Studio (chờ kiểm định)": "Manual via YouTube Studio (audit pending)", "Tự động qua API": "Automatic via API", "Đồng bộ": "Sync", "Quyền đã cấp chưa đủ cho cách đăng này – bấm Kết nối lại YouTube.": "Granted access is not enough for this path – click Reconnect YouTube.", "Đồng bộ lần cuối {t}: quét {n} video · khớp {k} · vấn đề {i}": "Last sync {t}: scanned {n} videos · matched {k} · issues {i}", "Chỉ bật khi Google đã duyệt kiểm định API – nếu chưa, video tải bằng API bị khóa ở chế độ riêng tư. Tiếp tục?": "Only switch once Google has approved the API audit – otherwise API uploads are locked private. Continue?", "Đồng bộ xong: {k} khớp · {l} mới lên · {i} vấn đề": "Sync done: {k} matched · {l} newly live · {i} issues", "Đang tạo gói": "Building pack", "Sẵn sàng đăng": "Ready to upload", "Đã đăng (dò thấy)": "Uploaded (detected)", "Video đang Riêng tư – đổi sang Không công khai (Unlisted) trong Studio": "Video is Private – switch it to Unlisted in Studio", "YouTube đang xử lý – đồng bộ lại sau": "YouTube is still processing – sync again later", "YouTube xử lý lỗi – xóa và tải lại": "YouTube processing failed – delete and re-upload", "Độ dài khác clip – có thể nhầm file": "Length differs from the clip – wrong file?", "Không còn thấy video trên kênh": "Video no longer found on the channel", "Link dán tay – chưa kiểm (chưa kết nối YouTube)": "Pasted link – unverified (YouTube not connected)", "Tiêu đề = title.txt": "Title = title.txt", "Mô tả = description.txt (giữ dòng lk:…)": "Description = description.txt (keep the lk:… line)", "Không dành cho trẻ em": "Not made for kids", "Nội dung bị thay đổi/tổng hợp = Có": "Altered or synthetic content = Yes", "Thể loại Giáo dục · thẻ = tags.txt": "Category Education · tags = tags.txt", "Chế độ hiển thị = Không công khai (Unlisted)": "Visibility = Unlisted", "Chưa có clip chờ đăng – mở 1 clip → Duyệt & tạo gói đăng.": "No clips waiting – open a clip → Approve & build upload pack.", "Video \"{t}\" ({v}) không có dòng lk:… – dán link vào đúng clip bên dưới": "Video \"{t}\" ({v}) has no lk:… line – paste its link into the right clip below", "Clip {c} được đăng nhiều lần: {v} – xóa bản thừa trong Studio": "Clip {c} was uploaded several times: {v} – delete the extras in Studio", "Mã lk:{c} không khớp clip nào đã duyệt ({v})": "Marker lk:{c} matches no approved clip ({v})", "Tải gói": "Download pack", "Đang tạo gói trên CI…": "Building the pack on CI…", "Chép thẻ": "Copy tags", "Mở YouTube Studio": "Open YouTube Studio", "Dán link YouTube (dự phòng)": "Paste YouTube link (fallback)", "Lưu link": "Save link", "Đã gắn video – trang bài học sẽ nhúng YouTube.": "Video linked – the lesson page will embed YouTube.", "Link không hợp lệ: {e}": "Invalid link: {e}", "Duyệt {n} video: tạo gói đăng tay (Unlisted) trên Kho Drive?": "Approve {n} videos: build manual upload packs (Unlisted) on the Drive pool?", "Đã duyệt {a} video – gói đăng sẽ sẵn sàng trong vài phút · bỏ qua {b}": "Approved {a} videos – packs ready in a few minutes · skipped {b}", "Duyệt & tạo gói đăng": "Approve & build upload pack",
    'Đang tải…': 'Loading…', 'Không tải được thư viện: {e}': 'Could not load the library: {e}', '🔄 Tải lại': '🔄 Reload',
    'QC hằng ngày': 'Daily QC', 'Báo cáo QC hằng ngày (7 ngày)': 'Daily QC report (7 days)', 'đạt': 'passed', 'Điểm': 'Score', 'Kết quả': 'Result', 'Cổng trượt': 'Failed gates', 'Nền': 'Background', 'Chưa có báo cáo QC – cine-render ghi shorts/qc/<ngày>.json sau mỗi lần dựng.': 'No QC report yet – cine-render writes shorts/qc/<date>.json after every run.',
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
  };
  const CSS = `.vid-bar{display:flex;flex-wrap:wrap;gap:.5rem;align-items:center;margin-bottom:.8rem}.vid-bar input,.vid-bar select{min-height:36px;border:1px solid var(--line);border-radius:9px;background:var(--surface);color:var(--text);padding:0 .5rem;font:inherit;font-size:.86rem;max-width:100%}
.vid-bar input[type=search]{flex:1 1 220px}.vid-tabs{display:flex;gap:.4rem;margin-bottom:.8rem}.vid-tabs button[aria-pressed=true]{background:var(--accent);color:#fff;border-color:var(--accent)}
.vid-note{padding:.6rem .8rem;border-radius:10px;background:var(--surface-2);font-size:.85rem;margin-bottom:.8rem}
.vid-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:.7rem}
.vid-card{all:unset;box-sizing:border-box;display:flex;flex-direction:column;cursor:pointer;border:1px solid var(--line);border-radius:12px;overflow:hidden;background:var(--surface);min-width:0}.vid-card:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.vid-th{position:relative;aspect-ratio:9/16;background:var(--surface-2);display:flex;align-items:center;justify-content:center;color:var(--muted);font-size:.8rem;text-align:center}.vid-th img{width:100%;height:100%;object-fit:cover;display:block}
.vid-badge{position:absolute;top:6px;left:6px;font-size:.68rem;font-weight:700;padding:.05rem .4rem;border-radius:999px;background:#16a34a;color:#fff}.vid-badge.bad{background:#dc2626}
.vid-dur{position:absolute;bottom:6px;right:6px;font-size:.7rem;padding:.05rem .35rem;border-radius:6px;background:rgba(0,0,0,.7);color:#fff}
.vid-meta{padding:.45rem .55rem;font-size:.78rem;display:flex;flex-direction:column;gap:.2rem;min-width:0}.vid-meta b{overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
.vid-meta span{color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.vid-dlg{width:min(880px,calc(100vw - 32px))}.vid-dlg .in{display:grid;grid-template-columns:minmax(0,320px) 1fr;gap:1rem;padding:1rem}.vid-dlg video,.vid-ph{width:100%;aspect-ratio:9/16;border-radius:10px;background:#000;display:block}
.vid-ph{display:flex;align-items:center;justify-content:center;color:#ddd;padding:1rem;text-align:center;font-size:.85rem;box-sizing:border-box}
.vid-kv{width:100%;border-collapse:collapse;font-size:.83rem}.vid-kv th{text-align:left;color:var(--muted);font-weight:600;padding:.2rem .5rem .2rem 0;white-space:nowrap;vertical-align:top}.vid-kv td{padding:.2rem 0;word-break:break-word}
.vid-card[aria-pressed=true]{outline:3px solid var(--accent);outline-offset:2px}.vid-yt{margin-bottom:.8rem;padding:.8rem 1rem;border:1px solid var(--line);border-radius:12px;background:var(--surface);font-size:.85rem}.vid-yt-h{display:flex;flex-wrap:wrap;align-items:baseline;gap:.2rem .7rem}.vid-yt-h b{font-size:.95rem}.vid-yt-h span{color:var(--muted)}.vid-yt-hint{margin:.35rem 0 .1rem}.vid-chs{list-style:none;margin:.5rem 0 0;padding:0;display:grid;gap:.4rem}.vid-ch{display:flex;align-items:center;gap:.5rem;padding:.4rem .6rem;border:1px solid var(--line);border-radius:10px;background:var(--surface-2);min-width:0}.vid-ch.on{border-color:var(--accent);box-shadow:0 0 0 1px var(--accent) inset}.vid-ch.off{opacity:.75}.vid-ch label{display:flex;align-items:center;gap:.6rem;flex:1;min-width:0;cursor:pointer}.vid-ch .nm{display:block;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.vid-ch .sub{display:block;font-size:.76rem;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.vid-ch .tx{min-width:0;flex:1}.vid-ch .btn{flex:none;min-height:30px;padding:.2rem .7rem}.vid-av{position:relative;width:34px;height:34px;border-radius:50%;overflow:hidden;flex:none;background:var(--accent-soft);color:var(--accent);display:grid;place-items:center;font-weight:700}.vid-av img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}.vid-yt-c{display:flex;flex-wrap:wrap;gap:.6rem .9rem;align-items:flex-end;margin-top:.7rem;padding-top:.7rem;border-top:1px solid var(--line)}.vid-yt-c label{display:grid;gap:.2rem;font-size:.76rem;color:var(--muted);min-width:0}.vid-yt-c select{min-height:34px;width:min(100%,300px);max-width:100%}.vid-yt-c label.chk{display:flex;align-items:center;gap:.4rem;min-height:34px;color:var(--text);font-size:.85rem}.vid-yt-b{display:flex;flex-wrap:wrap;gap:.5rem;margin-left:auto}.vid-yt-b .btn{min-height:34px;padding:.3rem .95rem}@media(max-width:560px){.vid-yt-b{margin-left:0;width:100%}.vid-yt-b .btn{flex:1}.vid-yt-c label{width:100%}.vid-yt-c select{width:100%}.vid-ch{flex-wrap:wrap}}
.vid-ytp{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:.6rem;margin-bottom:.8rem}.vid-ytc{border:1px solid var(--line);border-radius:10px;padding:.6rem .7rem;font-size:.85rem;min-width:0}.vid-ytc-h{display:flex;justify-content:space-between;gap:.4rem;align-items:flex-start}.vid-ytc-h b{overflow-wrap:anywhere}.vid-st{white-space:nowrap;font-size:.75rem;padding:.1rem .45rem;border-radius:99px;border:1px solid var(--line)}.vid-st.st-live{border-color:currentColor;font-weight:700}.vid-ck{margin:.4rem 0;padding-left:1.2rem}.vid-ck li{margin:.15rem 0}.vid-ytc .inp{flex:1;min-width:0;min-height:32px}
.vid-acts{display:flex;flex-wrap:wrap;gap:.4rem;margin-top:.7rem}
.vid-kpi{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:.6rem;margin-bottom:1rem}.vid-kpi div{border:1px solid var(--line);border-radius:12px;padding:.6rem .8rem;background:var(--surface)}.vid-kpi b{display:block;font-size:1.35rem}.vid-kpi span{font-size:.78rem;color:var(--muted)}
.vid-cols{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:.8rem}.vid-box{border:1px solid var(--line);border-radius:12px;padding:.7rem .8rem;background:var(--surface);min-width:0}.vid-box h3{margin:0 0 .5rem;font-size:.9rem}
.vid-row{display:grid;grid-template-columns:minmax(70px,38%) 1fr auto;gap:.4rem;align-items:center;font-size:.8rem;margin:.2rem 0}.vid-row i{display:block;height:8px;border-radius:4px;background:var(--accent);min-width:2px}
.vid-cov{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:.5rem}.vid-cov div{border-radius:10px;padding:.5rem .6rem;font-size:.8rem;border:1px solid var(--line);background:var(--surface)}
.vid-cov .gap{border-color:#f59e0b;background:color-mix(in srgb,#f59e0b 14%,var(--surface))}.vid-cov .none{border-color:#ef4444;background:color-mix(in srgb,#ef4444 14%,var(--surface))}.vid-cov b{display:block}
.vid-svg{width:100%;height:auto;display:block}.vid-svg rect{fill:var(--accent)}.vid-svg text{fill:var(--muted);font-size:10px}
@media (max-width:640px){.vid-dlg .in{grid-template-columns:1fr}.vid-dlg video,.vid-ph{max-height:60vh;width:auto;margin:0 auto}}`;
  let gen = 0, state = { tab: 'lib', f: {} };
  const sel = { on: false, ids: new Set() }, yt = { st: null, q: {} };

  function render(box, vapi, L, h) {
    const esc = h.esc, lang = h.lang || (() => 'vi'), my = ++gen, LOC = () => (lang() === 'en' ? 'en-US' : 'vi-VN');
    const V = (vi, vars) => { if (lang() !== 'en' || !Object.prototype.hasOwnProperty.call(EN, vi)) return L(vi, vars); const s = EN[vi]; return vars ? s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? String(vars[k]) : m)) : s; };
    const toast = h.toast || (() => {});
    if (!document.getElementById('vid-css')) { const st = document.createElement('style'); st.id = 'vid-css'; st.textContent = CSS; document.head.appendChild(st); }
    box.innerHTML = `<div class="card"><p class="muted">${V('Đang tải…')}</p></div>`;
    const num = n => Number(n || 0).toLocaleString(LOC());
    const mb = b => (b ? (b / 1048576).toFixed(1) + ' MB' : '–');
    const secs = s => (s ? s.toFixed(1) + ' s' : '–');
    const day = s => (s ? String(s).slice(0, 10) : '');
    const today = new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10); // lịch đăng theo giờ Việt Nam
    const pub = it => (!it.slot ? 'none' : it.slot.date < today ? 'due' : 'sched');
    const PUB = { sched: 'Đã lên lịch', due: 'Đã tới lịch', none: 'Chưa xếp lịch' };
    const FMT = { news: 'Bản tin', scene: 'Cảnh' };

    vapi('list').then(data => { if (my === gen) draw(data); }).catch(e => { if (my !== gen) return; box.innerHTML = `<div class="card"><p class="bad-t">${esc(V('Không tải được thư viện: {e}', { e: e.message }))}</p><button class="btn sm" id="vid-re">${V('🔄 Tải lại')}</button></div>`; box.querySelector('#vid-re').onclick = () => render(box, vapi, L, h); });

    function draw(data) {
      const items = Array.isArray(data.items) ? data.items : [], covers = data.covers || {}, f = state.f;
      const uniq = k => [...new Set(items.map(x => x[k]).filter(Boolean))].sort();
      const opt = (k, vals, lab = x => x) => `<select data-f="${k}" aria-label="${esc(V({ format: 'Định dạng', scene: 'Cảnh/chủ đề', template: 'Mẫu', cefr: 'CEFR', status: 'Trạng thái' }[k]))}"><option value="">${esc(V({ format: 'Định dạng', scene: 'Cảnh/chủ đề', template: 'Mẫu', cefr: 'CEFR', status: 'Trạng thái' }[k]))}: ${V('Tất cả')}</option>${vals.map(v => `<option value="${esc(v)}"${f[k] === v ? ' selected' : ''}>${esc(lab(v))}</option>`).join('')}</select>`;
      box.innerHTML = `<div class="vid-tabs" role="group"><button class="btn sm" data-t="lib" aria-pressed="${state.tab === 'lib'}">${V('Thư viện')}</button><button class="btn sm" data-t="stats" aria-pressed="${state.tab === 'stats'}">${V('Thống kê')}</button><button class="btn sm" data-t="web" aria-pressed="${state.tab === 'web'}">${V('Trên web')}</button><button class="btn sm" data-t="qc" aria-pressed="${state.tab === 'qc'}">${V('QC hằng ngày')}</button><span class="small muted" style="margin-left:auto;align-self:center">${esc(data.source === 'drive' ? V('Nguồn: Kho Drive riêng (trực tiếp)') : data.source === 'repo' ? V('Nguồn: repo riêng lexkite-shorts (trực tiếp)') : V('Nguồn: manifest gói sẵn'))}</span></div>
        ${data.media ? '' : `<div class="vid-note" role="note">${esc(V('⚠️ Kho Drive chưa đọc được: đang dùng manifest gói sẵn (cập nhật {d}); bìa và video chưa xem được. Xem docs/SHORTS-ACCESS.md.', { d: day(data.updated) || '–' }))}</div>`}
        <div id="vid-yt"></div><div id="vid-body"></div>`;
      ytBox(box.querySelector('#vid-yt'));
      box.querySelectorAll('[data-t]').forEach(b => { b.onclick = () => { state.tab = b.dataset.t; draw(data); }; });
      const body = box.querySelector('#vid-body');
      if (state.tab === 'stats') return stats(body, data, items);
      if (state.tab === 'web') return webStats(body);
      if (state.tab === 'qc') return qcReport(body);
      if (h.capi && window.AdminClips) { AdminClips.mount(body, { capi: h.capi, yapi: h.yapi, L, lang, esc, toast, open: it => open(it, { ...data, covers: { ...covers, [it.cover]: it.cover_url } }) }); return; } // quy mô lớn: máy chủ lọc/phân trang, lưới ảo hóa (js/admin-clips.js)
      body.innerHTML = `<div class="vid-bar"><input type="search" id="vid-q" placeholder="${esc(V('Tìm điểm học, tiêu đề, mã…'))}" aria-label="${esc(V('Tìm kiếm'))}" value="${esc(f.q || '')}">
        ${opt('format', uniq('format'), v => V(FMT[v] || v))}${opt('scene', uniq('scene'))}${opt('template', uniq('template'))}${opt('cefr', uniq('cefr'))}
        ${opt('status', ['pass', 'fail', 'sched', 'due', 'none'], v => V({ pass: 'QA đạt', fail: 'QA chưa đạt', ...PUB }[v]))}
        <input type="date" data-f="from" aria-label="${esc(V('Từ ngày'))}" title="${esc(V('Từ ngày'))}" value="${esc(f.from || '')}"><input type="date" data-f="to" aria-label="${esc(V('Đến ngày'))}" title="${esc(V('Đến ngày'))}" value="${esc(f.to || '')}">
        <button class="btn ghost sm" id="vid-clr">${V('Xóa lọc')}</button>${h.yapi ? `<button class="btn ghost sm" id="vid-sel" aria-pressed="${sel.on}">☑ ${V('Chọn nhiều')}</button><button class="btn primary sm" id="vid-ap" hidden></button>` : ''}<span class="small muted" id="vid-n"></span></div><div class="vid-grid" id="vid-grid"></div>`;
      const selBar = () => { const b = body.querySelector('#vid-ap'); if (!b) return; b.hidden = !sel.on || !sel.ids.size; b.textContent = '▶ ' + V('Duyệt & lên YouTube ({n})', { n: sel.ids.size }); };
      if (h.yapi) {
        body.querySelector('#vid-sel').onclick = () => { sel.on = !sel.on; if (!sel.on) sel.ids.clear(); body.querySelector('#vid-sel').setAttribute('aria-pressed', String(sel.on)); paint(); selBar(); };
        body.querySelector('#vid-ap').onclick = () => approve([...sel.ids]).then(ok => { if (ok) { sel.ids.clear(); sel.on = false; draw(data); } });
      }
      const grid = body.querySelector('#vid-grid');
      const paint = () => {
        const q = (f.q || '').trim().toLowerCase();
        const list = items.filter(it => (!f.format || it.format === f.format) && (!f.scene || it.scene === f.scene) && (!f.template || it.template === f.template) && (!f.cefr || it.cefr === f.cefr)
          && (!f.status || (f.status === 'pass' || f.status === 'fail' ? (it.qa && it.qa.status) === f.status : pub(it) === f.status))
          && (!f.from || day(it.created) >= f.from) && (!f.to || day(it.created) <= f.to)
          && (!q || [it.point, it.title, it.id, it.lesson, it.area].some(x => String(x || '').toLowerCase().includes(q))));
        body.querySelector('#vid-n').textContent = V('{n} video', { n: num(list.length) });
        grid.innerHTML = list.length ? list.map(it => { const c = covers[it.cover], bad = !it.qa || it.qa.status !== 'pass';
          return `<button class="vid-card" data-id="${esc(it.id)}" aria-label="${esc(V('Mở video {t}', { t: it.title || it.id }))}"><div class="vid-th">${c ? `<img loading="lazy" decoding="async" alt="" src="${esc(c)}">` : `<span>🎬<br>${V('Chưa có')}</span>`}
            <span class="vid-badge${bad ? ' bad' : ''}">${bad ? '✗' : '✓'} QA</span>${it.duration ? `<span class="vid-dur">${esc(secs(it.duration))}</span>` : ''}</div>
            <div class="vid-meta"><b>${esc(it.title || it.point || it.id)}</b><span>${esc([it.scene, it.template, it.cefr].filter(Boolean).join(' · '))}</span><span>${esc(it.rejected ? '⛔ ' + V('Bị loại') + ': ' + it.rejected : it.paused ? '⏸ ' + V('Tạm dừng') + ': ' + it.paused : it.slot ? it.slot.date + ' ' + it.slot.time : V(PUB.none))}</span></div></button>`; }).join('') : `<p class="muted">${V('Không có video khớp bộ lọc.')}</p>`;
        grid.querySelectorAll('.vid-card').forEach(b => {
          if (sel.on) b.setAttribute('aria-pressed', String(sel.ids.has(b.dataset.id)));
          b.onclick = () => { if (!sel.on) return open(items.find(x => x.id === b.dataset.id), data); sel.ids.has(b.dataset.id) ? sel.ids.delete(b.dataset.id) : sel.ids.add(b.dataset.id); b.setAttribute('aria-pressed', String(sel.ids.has(b.dataset.id))); selBar(); };
        });
      };
      body.querySelector('#vid-q').oninput = e => { f.q = e.target.value; paint(); };
      body.querySelectorAll('[data-f]').forEach(s => { s.onchange = () => { f[s.dataset.f] = s.value; paint(); }; });
      body.querySelector('#vid-clr').onclick = () => { state.f = {}; draw(data); };
      paint();
    }

    // ---- YouTube (functions/api/youtube.js): trạng thái kênh + hạn mức, Kết nối YouTube (chỉ chủ kênh), Duyệt & lên YouTube ----
    async function ytBox(el) {
      if (!h.yapi || !el) return;
      try { const q = new URLSearchParams(location.search).get('yt'); if (q) { toast(q === 'ok' ? V('Đã kết nối YouTube.') : V('Kết nối YouTube lỗi: {e}', { e: q })); history.replaceState(null, '', location.pathname + '#video'); } } catch (e) { /* bỏ qua */ }
      try { [yt.st, yt.q] = await Promise.all([h.yapi('status'), h.yapi('queue').then(r => Object.fromEntries((r.rows || []).map(x => [x.clip, x])))]); } catch (e) { el.innerHTML = `<div class="vid-yt">${esc(V('Kết nối YouTube lỗi: {e}', { e: e.code || e.message }))}</div>`; return; }
      const s = yt.st, ch = s.channel, q = s.quota || {}, c = s.queue || {}, st = s.settings || {}, man = st.mode !== 'api', m = s.manual || {}, sy = s.sync, on = ch && ch.status === 'ok';
      const chl = s.channels || (ch ? [{ ...ch, is_default: true }] : []), ini = t => esc(String(t || '?').trim().charAt(0).toUpperCase());
      const chRow = x => { const ok = x.status === 'ok'; return `<li class="vid-ch${x.is_default && ok ? ' on' : ''}${ok ? '' : ' off'}" data-ch="${esc(x.channel_id)}"><label><input type="radio" name="yt-ch" value="${esc(x.channel_id)}"${x.is_default && ok ? ' checked' : ''}${ok ? '' : ' disabled'}><span class="vid-av"><i style="font-style:normal">${ini(x.title)}</i>${x.thumb ? `<img src="${esc(x.thumb)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : ''}</span><span class="tx"><span class="nm">${esc(x.title || x.channel_id)}</span><span class="sub">${esc(ok ? V('{n} video', { n: x.videos || 0 }) + (x.is_default ? ' · ' + V('Mặc định') : '') : V('Mất quyền – bấm Thêm kênh để kết nối lại'))}</span></span></label><button class="btn ghost sm" data-off="${esc(x.channel_id)}" type="button">${V('Ngắt kết nối')}</button></li>`; };
      el.innerHTML = `<div class="vid-yt" role="group" aria-label="YouTube"><div class="vid-yt-h"><b>▶ YouTube</b><span>${on ? esc(man ? V('Kênh {c} · sẵn sàng đăng {r} · đã đăng (dò thấy) {u} · trên web {l} · cần xử lý {i}', { c: ch.title || ch.channel_id, r: m.ready || 0, u: m.uploaded || 0, l: m.live || 0, i: m.issues || 0 }) : V('Kênh {c} · hạn mức hôm nay còn {u} đơn vị (≈ {n} video) · chờ {q} · đã lên {d}', { c: ch.title || ch.channel_id, u: num(q.left), n: q.uploads_left, q: (c.queued || 0) + (c.failed || 0), d: c.done || 0 })) : esc(V('YouTube chưa kết nối – chỉ chủ kênh bấm (đồng ý trong trình duyệt của anh).'))}</span></div>
        <p class="tiny muted vid-yt-hint">${esc(V('Chọn kênh ở màn hình Google; muốn thêm kênh khác thì bấm Thêm kênh và chọn kênh đó.'))}</p>
        ${chl.length ? `<ul class="vid-chs" role="radiogroup" aria-label="${esc(V('Kênh YouTube'))}">${chl.map(chRow).join('')}</ul>` : ''}
        <div class="vid-yt-c">
        <label>${V('Cách đăng')} <select id="yt-mode"><option value="manual"${man ? ' selected' : ''}>${V('Tay qua YouTube Studio (chờ kiểm định)')}</option><option value="api"${man ? '' : ' selected'}>${V('Tự động qua API')}</option></select></label>
        ${man ? '' : `<label>${V('Chế độ')} <select id="yt-pv"><option value="private"${st.privacy !== 'unlisted' ? ' selected' : ''}>${V('Riêng tư')}</option><option value="unlisted"${st.privacy === 'unlisted' ? ' selected' : ''}>${V('Không công khai (unlisted)')}</option></select></label>
        <label class="chk"><input type="checkbox" id="yt-cal" checked> ${V('Theo lịch đăng (publishAt)')}</label>`}
        <div class="vid-yt-b">${on ? `<button class="btn sm" id="yt-sync" type="button">🔄 ${V('Đồng bộ')}</button>` : ''}
        <button class="btn ${on && (s.scope || {}).ok !== false ? 'ghost' : 'primary'} sm" id="yt-con" type="button">${on && (s.scope || {}).ok === false ? V('Kết nối lại YouTube') : on ? '＋ ' + V('Thêm kênh') : V('Kết nối YouTube')}</button></div></div></div>
        ${on && s.scope && !s.scope.ok ? `<p class="small bad-t">${esc(V('Quyền đã cấp chưa đủ cho cách đăng này – bấm Kết nối lại YouTube.'))}</p>` : ''}
        ${sy ? `<p class="tiny muted" id="yt-sy">${esc(V('Đồng bộ lần cuối {t}: quét {n} video · khớp {k} · vấn đề {i}', { t: new Date(sy.at).toLocaleString(LOC()), n: sy.scanned, k: sy.matched, i: (sy.issues || []).length }))}</p>` : ''}
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
      if (sb) sb.onclick = async () => { sb.disabled = true; try { const r = await h.yapi('sync'); toast(V('Đồng bộ xong: {k} khớp · {l} mới lên · {i} vấn đề', { k: r.matched, l: (r.live || []).length, i: (r.issues || []).length })); } catch (x) { toast(V('Kết nối YouTube lỗi: {e}', { e: x.code || x.message })); } ytBox(el); };
      if (man) packCards(el.querySelector('#vid-ytp'), s);
    }
    // Đăng tay (chờ kiểm định API): 1 thẻ/clip – trạng thái, Tải gói, chép tiêu đề/mô tả/thẻ, Mở YouTube Studio, danh sách kiểm, dán link dự phòng
    const STATE = { packing: 'Đang tạo gói', ready: 'Sẵn sàng đăng', uploaded: 'Đã đăng (dò thấy)', live: 'Trên web' };
    const ISSUE = { private: 'Video đang Riêng tư – đổi sang Không công khai (Unlisted) trong Studio', processing: 'YouTube đang xử lý – đồng bộ lại sau', 'processing-failed': 'YouTube xử lý lỗi – xóa và tải lại', 'wrong-file': 'Độ dài khác clip – có thể nhầm file', missing: 'Không còn thấy video trên kênh', unverified: 'Link dán tay – chưa kiểm (chưa kết nối YouTube)' };
    const CHECK = ['Tiêu đề = title.txt', 'Mô tả = description.txt (giữ dòng lk:…)', 'Không dành cho trẻ em', 'Nội dung bị thay đổi/tổng hợp = Có', 'Thể loại Giáo dục · thẻ = tags.txt', 'Chế độ hiển thị = Không công khai (Unlisted)'];
    const ckGet = id => { try { return JSON.parse(localStorage.getItem('lk-ytck-' + id) || '[]'); } catch (e) { return []; } };
    async function packCards(el, s) {
      if (!el) return;
      let r, web = {};
      try { r = await h.yapi('packs'); } catch (e) { el.innerHTML = ''; return; }
      try { const vj = await (await fetch('/data/videos.json', { cache: 'no-store' })).json(); for (const x of vj.items || []) if (x.youtube_id) web[x.id] = x.youtube_id; } catch (e) { /* bỏ qua */ }
      const rows = (r.rows || []).filter(x => x.state !== 'live' || Date.now() - (x.updated || 0) < 7 * 864e5).map(x => ({ ...x, state: x.state === 'uploaded' && x.status === 'done' && web[x.id] === x.video_id ? 'live' : x.state }));
      const iss = ((s.sync || {}).issues || []).filter(i => i.kind === 'no-marker' || i.kind === 'unknown-clip' || i.kind === 'duplicate');
      el.innerHTML = !rows.length && !iss.length ? `<p class="small muted">${esc(V('Chưa có clip chờ đăng – mở 1 clip → Duyệt & tạo gói đăng.'))}</p>` : `${iss.map(i => `<p class="small bad-t">⚠ ${esc(i.kind === 'no-marker' ? V('Video "{t}" ({v}) không có dòng lk:… – dán link vào đúng clip bên dưới', { t: i.title || '', v: i.video_id }) : i.kind === 'duplicate' ? V('Clip {c} được đăng nhiều lần: {v} – xóa bản thừa trong Studio', { c: i.clip, v: (i.video_ids || []).join(', ') }) : V('Mã lk:{c} không khớp clip nào đã duyệt ({v})', { c: i.clip, v: i.video_id }))}</p>`).join('')}
        <div class="vid-ytp">${rows.map(x => { const ck = ckGet(x.id); return `<div class="vid-ytc" data-id="${esc(x.id)}"><div class="vid-ytc-h"><b>${esc(x.title || x.id)}</b><span class="vid-st st-${esc(x.state)}">${esc(V(STATE[x.state] || x.state))}</span></div>
          <p class="tiny muted">${esc(x.id)} · <code>${esc(x.marker)}</code>${x.video_id ? ` · <a href="https://youtu.be/${esc(x.video_id)}" target="_blank" rel="noopener">youtu.be/${esc(x.video_id)}</a>` : ''}</p>
          ${x.err ? `<p class="small bad-t">⚠ ${esc(V(ISSUE[x.err] || x.err))}</p>` : ''}
          ${x.state === 'live' || x.state === 'uploaded' ? '' : `<div class="vid-acts">${x.pack ? `<a class="btn primary sm" data-dl href="${esc(x.pack + '&dl=1')}" download>⬇ ${V('Tải gói')}</a>` : `<span class="small muted">${V('Đang tạo gói trên CI…')}</span>`}
            <button class="btn sm" data-cp="title">${V('Chép tiêu đề')}</button><button class="btn sm" data-cp="description">${V('Chép mô tả')}</button><button class="btn sm" data-cp="tags">${V('Chép thẻ')}</button>
            <a class="btn sm" href="${esc(r.studio || 'https://studio.youtube.com/')}" target="_blank" rel="noopener">${V('Mở YouTube Studio')}</a></div>
          <ol class="vid-ck">${CHECK.map((t, i) => `<li><label><input type="checkbox" data-ck="${i}"${ck.includes(i) ? ' checked' : ''}> ${esc(V(t))}</label></li>`).join('')}</ol>`}
          ${x.state === 'live' ? '' : `<div class="vid-acts"><input type="url" class="inp" data-url placeholder="${esc(V('Dán link YouTube (dự phòng)'))}" aria-label="${esc(V('Dán link YouTube (dự phòng)'))}"><button class="btn sm" data-link>${V('Lưu link')}</button></div>`}</div>`; }).join('')}</div>`;
      const by = Object.fromEntries(rows.map(x => [x.id, x]));
      el.querySelectorAll('.vid-ytc').forEach(card => {
        const x = by[card.dataset.id];
        card.querySelectorAll('[data-cp]').forEach(b => { b.onclick = async () => { const k = b.dataset.cp, v = k === 'tags' ? (x.tags || []).join(', ') : x[k] || ''; try { await navigator.clipboard.writeText(v); b.textContent = '✓ ' + V('Đã chép'); } catch (e) { /* bỏ qua */ } }; });
        card.querySelectorAll('[data-ck]').forEach(b => { b.onchange = () => { const v = [...card.querySelectorAll('[data-ck]')].filter(i => i.checked).map(i => +i.dataset.ck); try { localStorage.setItem('lk-ytck-' + x.id, JSON.stringify(v)); } catch (e) { /* bỏ qua */ } }; });
        const lb = card.querySelector('[data-link]');
        if (lb) lb.onclick = async () => { const u = card.querySelector('[data-url]').value.trim(); if (!u) return; try { const k = await h.yapi('link', { id: x.id, url: u }); toast(k.err ? V(ISSUE[k.err] || k.err) : V('Đã gắn video – trang bài học sẽ nhúng YouTube.')); ytBox(document.getElementById('vid-yt')); } catch (e) { toast(V('Link không hợp lệ: {e}', { e: e.code || e.message })); } };
      });
    }
    async function approve(ids) {
      if (!h.yapi || !ids.length) return false;
      const man = ((yt.st || {}).settings || {}).mode !== 'api';
      const pv = (document.getElementById('yt-pv') || {}).value || 'private', cal = !!(document.getElementById('yt-cal') || {}).checked && pv === 'private';
      if (!confirm(man ? V('Duyệt {n} video: tạo gói đăng tay (Unlisted) trên Kho Drive?', { n: ids.length }) : V('Duyệt {n} video lên YouTube ở chế độ {p}{s}? Không bao giờ công khai ngay.', { n: ids.length, p: pv, s: cal ? V(' (công khai theo lịch đăng)') : '' }))) return false;
      try { const r = await h.yapi('approve', { ids, privacy: pv, schedule: cal ? 'calendar' : 'none' }); toast(V(man ? 'Đã duyệt {a} video – gói đăng sẽ sẵn sàng trong vài phút · bỏ qua {b}' : 'Đã xếp {a} video · bỏ qua {b}', { a: r.queued.length, b: r.skipped.length })); ytBox(document.getElementById('vid-yt')); return true; }
      catch (e) { toast(V('Kết nối YouTube lỗi: {e}', { e: e.code || e.message })); return false; }
    }

    async function open(it, data) {
      if (!it) return;
      const d = document.createElement('dialog'); d.className = 'key-dlg vid-dlg'; d.setAttribute('aria-label', it.title || it.id); document.body.appendChild(d);
      const qa = it.qa || {}, cover = (data.covers || {})[it.cover];
      const row = (k, v) => (v == null || v === '' ? '' : `<tr><th scope="row">${esc(V(k))}</th><td>${esc(v)}</td></tr>`);
      d.innerHTML = `<div class="card-h" style="padding:.8rem 1rem;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;gap:.5rem;align-items:center"><b>${esc(it.title || it.id)}</b><button class="btn ghost sm" data-x>${V('Đóng')}</button></div>
        <div class="in"><div id="vid-pl"><div class="vid-ph">${data.media ? V('Đang tải…') : esc(V('Video chưa có trên Kho Drive.'))}</div></div><div>
        <p style="margin:0 0 .5rem"><span class="vid-badge${qa.status === 'pass' ? '' : ' bad'}" style="position:static">${qa.status === 'pass' ? '✓' : '✗'} QA ${esc(qa.result || '')}</span></p>
        <table class="vid-kv"><tbody>${row('Điểm học', it.point)}${row('Định dạng', V(FMT[it.format] || it.format))}${row('Cảnh/chủ đề', it.scene)}${row('Mẫu', it.template)}${row('Lĩnh vực', it.area)}${row('CEFR', it.cefr)}${row('Chuỗi', it.series)}${row('Ngôn ngữ', it.lang)}
        ${row('Thời lượng', secs(it.duration))}${row('Dung lượng', mb(it.bytes))}${row('Ngày dựng', it.created ? new Date(it.created).toLocaleString(LOC()) : '')}${row('Lượt CI', it.run)}
        ${row('Lịch đăng', it.slot ? `#${it.slot.n} · ${it.slot.date} ${it.slot.time} (${it.slot.tz || ''}) · ${V(PUB[pub(it)])}` : V(PUB.none))}
        ${row('Kết quả QA', qa.result)}${row('Mục đạt', qa.ok)}${row('Mục lỗi', qa.fail)}${row('Khớp môi lệch tối đa', qa.lipsync_ms != null ? qa.lipsync_ms + ' ms' : '')}${row('Phụ đề tối đa (ký tự/giây)', qa.cps_max)}
        ${row('Tiêu đề', it.title)}${row('Mô tả', it.description)}${row('Hashtag', (it.hashtags || []).join(' '))}${yt.q[it.id] ? row('YouTube: {s}', [yt.q[it.id].status, yt.q[it.id].privacy, yt.q[it.id].publish_at, yt.q[it.id].video_id].filter(Boolean).join(' · ')) : ''}</tbody></table>
        ${it.drive && it.drive.video && it.drive.video.retired ? `<p class="small muted">${esc(V('Bản gốc đã xóa theo luật giữ 30 ngày – dựng lại từ công thức (shorts-rebuild).'))}</p>` : ''}
        ${h.yapi && qa.status === 'pass' && !(yt.q[it.id] && /done|uploading|manual|detected/.test(yt.q[it.id].status)) ? `<p><button class="btn primary sm" data-yt>▶ ${V(((yt.st || {}).settings || {}).mode !== 'api' ? 'Duyệt & tạo gói đăng' : 'Duyệt & lên YouTube')}</button></p>` : ''}
        <div class="vid-acts"><button class="btn sm" data-c="title">${V('Chép tiêu đề')}</button><button class="btn sm" data-c="description">${V('Chép mô tả')}</button><button class="btn sm" data-c="hashtags">${V('Chép hashtag')}</button><span id="vid-dl"></span></div></div></div>`;
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
        d.querySelector('#vid-dl').innerHTML = `<a class="btn sm" href="${esc(url + '&dl=1')}" download>${V('Tải xuống')}</a>`;
      } catch (e) { d.querySelector('#vid-pl').innerHTML = `<div class="vid-ph">${esc(V('Không lấy được link video: {e}', { e: e.message }))}</div>`; }
    }

    // 🎬 Hiệu quả trên web theo clip: /api/admin-shorts op 'web' (hit.js t:'v') + tên clip từ /data/videos.json
    async function qcReport(body) {   // docs/VIDEO-QC.md: every clip through qc-gate (approved candidates and dropped), score /100 and failed gates
      body.innerHTML = `<div class="card"><p class="muted">${V('Đang tải…')}</p></div>`;
      const r = await vapi('qc').catch(() => ({ days: [] })); const days = r.days || [];
      body.innerHTML = `<div class="card"><h3 style="margin-top:0">${V('Báo cáo QC hằng ngày (7 ngày)')}</h3>${days.length ? days.map(d => {
        const it = d.items || [], ok = it.filter(x => x.ok).length;
        return `<h4>${esc(d.date)} · ${ok}/${it.length} ${V('đạt')}</h4><div class="tbl"><table><thead><tr><th scope="col">Clip</th><th scope="col">${V('Điểm')}</th><th scope="col">${V('Kết quả')}</th><th scope="col">${V('Cổng trượt')}</th><th scope="col">${V('Nền')}</th><th scope="col">Run</th></tr></thead><tbody>${it.map(x => `<tr><td>${esc(x.id)}</td><td>${esc(String(x.score))}</td><td>${x.ok ? '✓' : '✗'}</td><td>${esc((x.failed || []).join(', ') || '–')}</td><td>${esc(x.bg || '')}</td><td>${esc(String(x.run || ''))}</td></tr>`).join('')}</tbody></table></div>`;
      }).join('') : `<p class="muted">${V('Chưa có báo cáo QC – cine-render ghi shorts/qc/<ngày>.json sau mỗi lần dựng.')}</p>`}</div>`;
    }
    async function webStats(body) {
      body.innerHTML = `<div class="card"><p class="muted">${V('Đang tải…')}</p></div>`;
      const [w, m] = await Promise.all([vapi('web').catch(() => ({ rows: [] })), fetch('/data/videos.json', { cache: 'no-cache' }).then(r => r.json()).catch(() => ({ items: [] }))]);
      const meta = {}; for (const it of m.items || []) meta[it.id] = it;
      const pc = (a, b) => (b ? Math.round(a / b * 100) + '%' : '–');
      const rows = (w.rows || []).concat((m.items || []).filter(it => !(w.rows || []).some(r => r.id === it.id)).map(it => ({ id: it.id, view: 0, done: 0, quiz_ok: 0, quiz_no: 0 }))).sort((a, b) => b.view - a.view);
      body.innerHTML = `<div class="card"><h3 style="margin-top:0">${V('Hiệu quả video trên web (90 ngày)')}</h3>${rows.length ? `<div class="tbl"><table><thead><tr><th scope="col">Clip</th><th scope="col">${V('Mẫu')}</th><th scope="col">${V('Lượt xem')}</th><th scope="col">${V('Xem hết')}</th><th scope="col">${V('Câu đố đúng')}</th></tr></thead><tbody>
        ${rows.map(r => { const it = meta[r.id] || {}; return `<tr><td>${it.slug ? `<a href="/video/${esc(it.slug)}/" target="_blank" rel="noopener">${esc(it.title || r.id)}</a>` : esc(r.id)}${it.test ? ` <span class="small muted">(${V('mẫu thử')})</span>` : ''}</td><td>${esc(it.template || '')}</td><td>${r.view}</td><td>${r.done} · ${pc(r.done, r.view)}</td><td>${r.quiz_ok}/${r.quiz_ok + r.quiz_no} · ${pc(r.quiz_ok, r.quiz_ok + r.quiz_no)}</td></tr>`; }).join('')}</tbody></table></div>`
        : `<p class="muted">${V('Chưa có số liệu web – clip được duyệt sẽ tự lên web (docs/VIDEO-SCALE-PLAN.md §10).')}</p>`}</div>`;
    }
    function stats(body, data, items) {
      const count = k => { const m = {}; items.forEach(x => { const v = typeof k === 'function' ? k(x) : x[k] || '–'; m[v] = (m[v] || 0) + 1; }); return Object.entries(m).sort((a, b) => b[1] - a[1]); };
      const bars = (title, rows, lab = x => x) => { const mx = Math.max(1, ...rows.map(r => r[1])); return `<div class="vid-box"><h3>${esc(V(title))}</h3>${rows.length ? rows.map(([k, n]) => `<div class="vid-row"><span>${esc(lab(k))}</span><i style="width:${Math.round(n / mx * 100)}%"></i><b>${num(n)}</b></div>`).join('') : `<p class="muted small">${V('Không có dữ liệu')}</p>`}</div>`; };
      const pass = items.filter(x => x.qa && x.qa.status === 'pass').length, durs = items.map(x => x.duration).filter(Boolean);
      const cr = data.credits, cal = data.calendar || {}, posts = cal.posts || [];
      // Độ phủ: số video thật theo lĩnh vực so với mục tiêu
      const cov = (data.coverage && data.coverage.areas) || {}, target = (data.coverage && data.coverage.target_per_area) || 5, byArea = Object.fromEntries(count('area'));
      const covHtml = Object.entries(cov).map(([k, a]) => { const n = byArea[k] || 0, gap = Math.max(0, target - n); return `<div class="${n === 0 ? 'none' : gap ? 'gap' : ''}"><b>${esc(a.label || k)}</b>${num(n)}/${target} · ${esc(n === 0 ? V('chưa có') : gap ? V('thiếu {n}', { n: gap }) : V('đủ'))}</div>`; }).join('');
      // Video dựng mỗi ngày (30 ngày gần nhất có dữ liệu)
      const perDay = {}; items.forEach(x => { const dd = day(x.created); if (dd) perDay[dd] = (perDay[dd] || 0) + 1; });
      const days = Object.keys(perDay).sort().slice(-30), mx = Math.max(1, ...days.map(k => perDay[k])), W = Math.max(days.length, 1) * 22 + 10;
      const svg = days.length ? `<svg class="vid-svg" viewBox="0 0 ${W} 130" role="img" aria-label="${esc(V('Số video dựng mỗi ngày'))}">${days.map((k, i) => { const hgt = Math.round(perDay[k] / mx * 90); return `<g><title>${esc(V('ngày {d}: {n}', { d: k, n: perDay[k] }))}</title><rect x="${5 + i * 22}" y="${105 - hgt}" width="16" height="${hgt}" rx="3"></rect><text x="${13 + i * 22}" y="${100 - hgt}" text-anchor="middle">${perDay[k]}</text><text x="${13 + i * 22}" y="122" text-anchor="middle">${esc(k.slice(5))}</text></g>`; }).join('')}</svg>` : `<p class="muted small">${V('Không có dữ liệu')}</p>`;
      const past = posts.filter(p => p.date < today).length, up = posts.filter(p => p.date >= today), next = up[0];
      const banks = cr && cr.banks ? Object.entries(cr.banks).map(([k, b]) => [k, b.total, b]) : [];
      const bmx = Math.max(1, ...banks.map(b => b[1]));
      body.innerHTML = `<div class="vid-kpi"><div><b>${num(items.length)}</b><span>${V('Tổng video')}</span></div><div><b>${items.length ? Math.round(pass / items.length * 100) : 0}%</b><span>${V('Tỉ lệ đạt QA')}</span></div>
        <div><b>${durs.length ? secs(durs.reduce((a, b) => a + b, 0) / durs.length) : '–'}</b><span>${V('Thời lượng TB')}</span></div><div><b>${mb(items.reduce((a, x) => a + (x.bytes || 0), 0))}</b><span>${V('Tổng dung lượng')}</span></div>
        <div><b>${cr ? num(cr.total) : '–'}</b><span>${V('Credit đã dùng')}</span></div></div>
        <div class="vid-cols">${bars('Theo định dạng', count('format'), v => V(FMT[v] || v))}${bars('Theo cảnh', count('scene'))}${bars('Theo mẫu', count('template'))}${bars('Theo lĩnh vực', count('area'))}${bars('Theo CEFR', count('cefr'))}
        <div class="vid-box"><h3>${V('Lịch đăng')}</h3><p class="small">${esc(V('{a} bài đã qua lịch · {b} bài sắp tới · {c} video chưa xếp lịch', { a: past, b: up.length, c: items.filter(x => !x.slot).length }))}</p>
        ${next ? `<p class="small"><b>${V('Kế tiếp')}:</b> ${esc(next.date + ' ' + next.time + ' · ' + next.scene + ' · ' + next.template)}</p>` : ''}${up.slice(0, 6).map(p => `<div class="vid-row"><span>${esc(p.date + ' ' + p.time)}</span><span class="small muted">${esc(p.scene)}</span><b class="small">${esc(p.template)}</b></div>`).join('')}</div></div>
        <h3 class="sec-t">${V('Độ phủ theo khu vực web')}</h3><p class="small muted">${esc(V('Mục tiêu {n}/khu vực · ô cam = còn thiếu, ô đỏ = chưa có video', { n: target }))}</p><div class="vid-cov">${covHtml || `<p class="muted small">${V('Không có dữ liệu')}</p>`}</div>
        <div class="vid-cols" style="margin-top:1rem"><div class="vid-box"><h3>${V('Số video dựng mỗi ngày')}</h3>${svg}</div>
        <div class="vid-box"><h3>${V('Credit theo kho cảnh')}</h3>${banks.length ? banks.map(([k, n, b]) => `<div class="vid-row"><span>${esc(k)}</span><i style="width:${Math.round(n / bmx * 100)}%"></i><b>${num(n)}</b></div><p class="tiny muted" style="margin:0 0 .3rem">${esc(V('ảnh {a} · video {b}', { a: num(b.img_cr), b: num(b.video_cr) }))}</p>`).join('') : `<p class="muted small">${V('Chưa có tóm tắt credit (chạy scripts/cine/credits_summary.py).')}</p>`}</div></div>`;
    }
  }
  window.AdminVideo = { render };
})();
