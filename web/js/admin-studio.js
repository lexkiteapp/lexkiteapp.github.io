/* Quản trị → "Video Studio": dây chuyền sản xuất video tự động A→Z (ý tưởng → kịch bản → dựng → QA → kho GrabCast → lên lịch → đã đăng).
 * Tải lười khi mở tab (admin.js). AdminStudio.render(container, stapi, sapi, L, { esc, lang }):
 *   stapi(op, body) → /api/studio (functions/api/studio.js) · sapi(method, path, body?, { query }) → /api/social (lịch đăng GrabCast).
 * Mọi thao tác ra ngoài (chạy GitHub Actions, đăng/lên lịch, hủy lịch) đều hỏi xác nhận. Khóa/bí mật chỉ ở máy chủ. Chữ tiếng Anh ở bảng EN. */
(function () {
  const EN = {
    '🎞️ Video Studio': '🎞️ Video Studio', 'Dây chuyền video tự động: kịch bản → dựng → chấm QA → kho GrabCast → lên lịch đăng.': 'Automatic video pipeline: script → render → QA → GrabCast storage → scheduled posts.',
    '➕ Job mới': '➕ New job', '📥 Lấy từ hàng đợi': '📥 From queue', '🔄 Tải lại': '🔄 Reload', '⚙️ Cài đặt': '⚙️ Settings', 'Đang tải…': 'Loading…', 'Tự động': 'Auto mode',
    'Chủ đề video (vd: Đừng nói "I\'m agree"):': 'Video topic (e.g. Don\'t say "I\'m agree"):', 'Bài dài (YouTube 16:9)?': 'Long lesson (YouTube 16:9)?',
    'Ý tưởng': 'Idea', 'Kịch bản': 'Script', 'KB đã duyệt': 'Script OK', 'Đang dựng': 'Rendering', 'Chờ chấm': 'Needs QA', 'QA đạt': 'QA passed', 'QA chưa đạt': 'QA failed', 'Đã tải lên': 'Uploaded', 'Đã lên lịch': 'Scheduled', 'Đã đăng': 'Published',
    'Trống': 'Empty', '🗓️ 7 ngày tới (giờ New York)': '🗓️ Next 7 days (New York time)', 'Chưa có bài lên lịch.': 'Nothing scheduled.', '🧩 Kho tài nguyên': '🧩 Asset library',
    'Nhân vật': 'Characters', 'Biểu cảm': 'Expressions', 'Cử chỉ': 'Gestures', 'Góc nhìn': 'Views', 'Trang phục': 'Outfits', 'Phòng/bối cảnh': 'Rooms', 'Cặp nhân vật': 'Pairs', 'Clip': 'Clips', 'Đạo cụ': 'Props',
    '⚙️ Chưa cấu hình đủ': '⚙️ Setup incomplete', 'Đặt secret trên Cloudflare Pages (và GitHub Actions nếu ghi chú) rồi triển khai lại:': 'Set these secrets on Cloudflare Pages (and GitHub Actions where noted), then redeploy:',
    'chạy video.yml (PAT fine-grained, quyền Actions: write cho repo)': 'runs video.yml (fine-grained PAT, Actions: write on the repo)', 'CI gọi lại – đặt cùng giá trị ở Cloudflare Pages và GitHub Actions': 'CI callback – same value on Cloudflare Pages and GitHub Actions', 'đăng bài GrabCast (Pages + GitHub Actions)': 'GrabCast posting (Pages + GitHub Actions)',
    'Duyệt tay {d}/{n} video đầu': 'Manual review {d}/{n} first videos', 'Tự động bật: video QA ≥ 90 tự lên lịch (sau {n} video duyệt tay).': 'Auto mode on: videos with QA ≥ 90 schedule themselves (after {n} manually reviewed).',
    // Chi tiết
    'Đóng': 'Close', 'Lỗi gần nhất': 'Last error', '✍️ Kịch bản': '✍️ Script', '✨ Viết bằng AI': '✨ Write with AI', '💾 Lưu': '💾 Save', '✅ Duyệt kịch bản': '✅ Approve script', '+ Dòng': '+ Line',
    'Ai': 'Who', 'Phần': 'Beat', 'Lời thoại': 'Line', 'Biểu cảm ': 'Expression', 'Cử chỉ ': 'Gesture', 'Tiêu đề': 'Title', 'Caption': 'Caption', 'Hashtag (cách nhau dấu phẩy)': 'Hashtags (comma separated)', 'Từ khóa tô cam': 'Highlighted keywords',
    '≈ {s} s': '≈ {s} s', '✓ Kịch bản hợp lệ': '✓ Script is valid', 'AI chưa sẵn sàng – đã tạo khung mẫu, hãy sửa tay.': 'AI unavailable – a template was created, edit it by hand.',
    '🎬 Dựng & xem trước': '🎬 Render & preview', '▶️ Dựng video': '▶️ Render video', 'Chạy GitHub Actions video.yml để dựng job này?': 'Run GitHub Actions video.yml to render this job?', 'Xem trước ↗': 'Preview ↗', 'Lượt chạy ↗': 'Run log ↗', 'Còn TODO: {t}': 'Still TODO: {t}',
    '🧪 Chấm QA (≥ {p} mới đăng)': '🧪 QA score (≥ {p} to publish)', 'Tổng': 'Total', 'Lưu điểm': 'Save scores', 'chưa chấm': 'not scored',
    '📤 Đăng & lên lịch': '📤 Publish & schedule', 'Khung trống gợi ý (giờ New York):': 'Suggested free slots (New York time):', 'Giờ đăng (giờ máy bạn, để trống = khung trống kế tiếp)': 'Publish time (your local time, empty = next free slot)',
    'Tải lên GrabCast, tạo bài và lên lịch lúc {d}?': 'Upload to GrabCast, create the post and schedule it at {d}?', 'khung trống kế tiếp': 'the next free slot', 'Lên lịch': 'Schedule', 'Hủy lịch': 'Unschedule', 'Hủy lịch bài này? Bài trở về "Đã tải lên".': 'Unschedule this post? It goes back to "Uploaded".',
    '🗑️ Xóa job': '🗑️ Delete job', 'Xóa job này?': 'Delete this job?', '✓ Xong': '✓ Done', 'Lịch: {d}': 'Scheduled: {d}',
    // Cài đặt
    'Hạn mức/ngày': 'Daily quota', 'Duyệt tay N video đầu': 'Manually review first N videos', 'Nền tảng (để trống = mọi kênh)': 'Platforms (empty = all channels)', 'Kênh mặc định': 'Default accounts', 'Lưu cài đặt': 'Save settings',
    'Bật chế độ tự động? Kịch bản AI hợp lệ sẽ tự dựng; video QA ≥ 90 tự lên lịch đăng công khai (sau {n} video duyệt tay).': 'Turn on auto mode? Valid AI scripts render automatically; videos with QA ≥ 90 get scheduled publicly (after {n} manually reviewed).',
    // Lỗi
    'Thiếu cấu hình: {k}': 'Not configured: {k}', 'Sai luồng: {a} → {b}': 'Not allowed: {a} → {b}', 'Kịch bản chưa hợp lệ': 'Script is not valid', 'Điểm QA dưới 90': 'QA score below 90', 'Chưa có file video trong kho (bước dựng chưa tải lên GrabCast)': 'No video file in storage yet (render did not upload to GrabCast)',
    'Không có kênh phù hợp – kết nối kênh trên GrabCast hoặc sửa cài đặt': 'No matching channels – connect one on GrabCast or adjust settings', 'Hàng đợi content/video/queue.json trống hoặc chưa đẩy lên': 'Queue content/video/queue.json is empty or not pushed yet',
    'Quá giới hạn GrabCast – đợi 1 phút': 'GrabCast rate limit – wait a minute', 'Token GitHub sai/thiếu quyền': 'GitHub token invalid or missing permission', 'Chưa có workflow video.yml trên nhánh main': 'video.yml is not on main yet', 'Đã tạo {n} job · còn {l} chủ đề': 'Created {n} jobs · {l} topics left',
  };
  const RUB_EN = { hook: 'Hook ≤ 2 s with curiosity', knowledge: 'Knowledge 100% correct', lipsync: 'Lip sync < 80 ms & expressions', audio: 'Audio −16 LUFS ±1', subs: 'Karaoke subs exact, safe zone', pacing: 'Pacing 2–4 s cuts', brand: 'Brand & legal', cta: 'CTA to the right lesson', share: 'Shareability' };
  const ST = { idea: 'Ý tưởng', script: 'Kịch bản', script_ok: 'KB đã duyệt', rendering: 'Đang dựng', rendered: 'Chờ chấm', qa_ok: 'QA đạt', qa_fail: 'QA chưa đạt', uploaded: 'Đã tải lên', scheduled: 'Đã lên lịch', published: 'Đã đăng' };
  const HUE = { idea: '#94a3b8', script: '#a78bfa', script_ok: '#8b5cf6', rendering: '#f59e0b', rendered: '#eab308', qa_ok: '#22c55e', qa_fail: '#ef4444', uploaded: '#06b6d4', scheduled: '#0ea5e9', published: '#16a34a' };
  const CAST = ['mia', 'leo', 'ama', 'kit', 'diane', 'carlos'], BEATS = ['hook', 'situation', 'explain', 'example', 'tip', 'cta'];
  const CSS = `.stu-head{display:flex;flex-wrap:wrap;gap:.6rem;align-items:center;justify-content:space-between;margin-bottom:1rem}.stu-head h2{margin:0;font-size:1.25rem}.stu-acts{display:flex;flex-wrap:wrap;gap:.5rem;align-items:center}
.stu-sw{display:inline-flex;align-items:center;gap:.4rem;font-size:.85rem;font-weight:600;cursor:pointer}
.stu-board{display:grid;grid-template-columns:repeat(10,minmax(150px,1fr));gap:.6rem;overflow-x:auto;padding-bottom:.4rem;margin-bottom:1rem}
.stu-col{background:var(--surface,#fff);border:1px solid var(--line,#e5e7eb);border-radius:12px;padding:.5rem;min-width:0;border-top:4px solid var(--h)}.stu-col h4{margin:0 0 .4rem;font-size:.8rem;display:flex;justify-content:space-between;gap:.3rem}
.stu-card{display:block;width:100%;text-align:left;font:inherit;color:inherit;background:transparent;border:1px solid var(--line,#e5e7eb);border-radius:10px;padding:.45rem .5rem;margin-bottom:.4rem;cursor:pointer;font-size:.8rem;overflow-wrap:anywhere}.stu-card:hover{border-color:var(--primary)}.stu-card small{display:block;opacity:.7;margin-top:.15rem}.stu-card .e{color:#dc2626}
.stu-cal{display:grid;grid-template-columns:repeat(7,minmax(110px,1fr));gap:.5rem;overflow-x:auto}.stu-day{border:1px solid var(--line,#e5e7eb);border-radius:10px;padding:.45rem;font-size:.78rem;min-height:4rem}.stu-day b{display:block;margin-bottom:.25rem}.stu-day div{border-radius:6px;padding:.15rem .3rem;margin-top:.2rem;background:color-mix(in srgb,var(--primary) 14%,transparent);overflow-wrap:anywhere}
.stu-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1rem;margin-top:1rem}.stu-grid>.card{margin:0;min-width:0}
.stu-assets{display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:.5rem;margin-top:.5rem}.stu-assets div{border:1px solid var(--line,#e5e7eb);border-radius:10px;padding:.5rem;text-align:center;font-size:.8rem}.stu-assets b{display:block;font-size:1.3rem}
.stu-dlg{width:min(980px,calc(100vw - 24px))}.stu-dlg .key-box{max-height:88vh;overflow:auto}.stu-sec{border-top:1px solid var(--line,#e5e7eb);padding-top:.8rem;margin-top:.8rem}.stu-sec h4{margin:0 0 .5rem}
.stu-lines{width:100%;border-collapse:collapse;font-size:.82rem}.stu-lines td,.stu-lines th{padding:.2rem;vertical-align:top;text-align:left}
.stu-dlg input,.stu-dlg select,.stu-dlg textarea{font:inherit;font-size:.82rem;padding:.35rem .45rem;border:1.5px solid var(--line,#e5e7eb);border-radius:8px;background:var(--surface,#fff);color:inherit;width:100%;box-sizing:border-box;min-width:0}
.stu-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.5rem;margin-top:.5rem}.stu-form label{display:flex;flex-direction:column;gap:.2rem;font-size:.8rem;font-weight:600}
.stu-btns{display:flex;flex-wrap:wrap;gap:.45rem;margin-top:.6rem}.stu-msg{min-height:1.2em;margin-top:.4rem;white-space:pre-line;font-size:.85rem}.stu-bad{color:#dc2626}.stu-ok{color:#16a34a}
.stu-qa td{padding:.25rem .3rem;font-size:.82rem}.stu-qa input{width:4.5rem}.stu-bar{height:8px;border-radius:99px;background:var(--line,#e5e7eb);overflow:hidden;margin:.3rem 0}.stu-bar i{display:block;height:100%}
.stu-times{display:flex;flex-wrap:wrap;gap:.35rem;margin:.35rem 0}.stu-times .chip-f{font-size:.78rem;padding:.3rem .6rem}
@media (max-width:760px){.stu-grid,.stu-form{grid-template-columns:1fr}.stu-lines thead{display:none}.stu-lines tr{display:grid;grid-template-columns:1fr 1fr;gap:.25rem;border-bottom:1px solid var(--line,#e5e7eb);padding:.3rem 0}.stu-lines td.t{grid-column:1/-1}.stu-acts .btn{flex:1 1 auto}}`;
  const NY = 'America/New_York';
  const nyDay = t => new Intl.DateTimeFormat('en-CA', { timeZone: NY, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(t));
  const arr = j => (Array.isArray(j) ? j : (j && (j.items || j.data || j.results || j.accounts || j.posts)) || []);
  const pick = (o, ...ks) => { for (const k of ks) if (o && o[k] != null && o[k] !== '') return o[k]; return undefined; };

  let gen = 0;
  function render(box, stapi, sapi, L, h) {
    const esc = h.esc, lang = h.lang || (() => 'vi'), my = ++gen, LOC = () => (lang() === 'en' ? 'en-US' : 'vi-VN');
    const S = (vi, vars) => { if (lang() !== 'en' || !Object.prototype.hasOwnProperty.call(EN, vi)) return L(vi, vars); const s = EN[vi]; return vars ? s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? String(vars[k]) : m)) : s; };
    const when = t => (t ? new Date(t).toLocaleString(LOC(), { dateStyle: 'short', timeStyle: 'short' }) : '–');
    const nyWhen = t => new Date(t).toLocaleString(LOC(), { timeZone: NY, weekday: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) + ' ET';
    const errMsg = e => { const c = e && e.code, d = (e && e.data) || {};
      return c === 'not-configured' ? S('Thiếu cấu hình: {k}', { k: d.need || 'GRABCAST_API_KEY' }) : c === 'bad-transition' ? S('Sai luồng: {a} → {b}', { a: d.from, b: d.to }) : c === 'script-invalid' ? S('Kịch bản chưa hợp lệ') + ':\n• ' + (d.errs || []).join('\n• ')
        : c === 'qa-below-90' ? S('Điểm QA dưới 90') : c === 'no-file' ? S('Chưa có file video trong kho (bước dựng chưa tải lên GrabCast)') : c === 'no-accounts' ? S('Không có kênh phù hợp – kết nối kênh trên GrabCast hoặc sửa cài đặt') : c === 'no-queue' ? S('Hàng đợi content/video/queue.json trống hoặc chưa đẩy lên')
        : c === 'grabcast-rate' ? S('Quá giới hạn GrabCast – đợi 1 phút') : c === 'gh-auth' ? S('Token GitHub sai/thiếu quyền') : c === 'gh-no-workflow' ? S('Chưa có workflow video.yml trên nhánh main') : String((d.message || (e && e.message)) || e).slice(0, 300); };
    if (!document.getElementById('admStudioCss')) { const st = document.createElement('style'); st.id = 'admStudioCss'; st.textContent = CSS; document.head.appendChild(st); }
    const reload = () => render(box, stapi, sapi, L, h);
    box.innerHTML = `<p class="small muted">${S('Đang tải…')}</p>`;

    Promise.all([stapi('list'), sapi('GET', 'posts', null, { query: { status: 'scheduled', limit: 50 } }).catch(() => null), stapi('assets').catch(() => null)]).then(([d, posts, as]) => {
      if (my !== gen || !box.isConnected) return;
      const st = d.settings, cfg = d.configured, byS = s => d.rows.filter(r => r.status === s);
      const miss = [['GH_DISPATCH_TOKEN', cfg.render, 'chạy video.yml (PAT fine-grained, quyền Actions: write cho repo)'], ['STUDIO_CALLBACK_SECRET', cfg.callback, 'CI gọi lại – đặt cùng giá trị ở Cloudflare Pages và GitHub Actions'], ['GRABCAST_API_KEY', cfg.grabcast, 'đăng bài GrabCast (Pages + GitHub Actions)']].filter(x => !x[1]);
      box.innerHTML = `<div class="stu-head"><div><h2>${S('🎞️ Video Studio')}</h2><p class="small muted" style="margin:.2rem 0 0">${S('Dây chuyền video tự động: kịch bản → dựng → chấm QA → kho GrabCast → lên lịch đăng.')}</p></div>
        <div class="stu-acts"><label class="stu-sw"><input type="checkbox" id="stuAuto" ${st.auto ? 'checked' : ''}> ${S('Tự động')}</label><span class="pill ${d.done >= st.manualFirst ? 'ok' : 'warn'}">${S('Duyệt tay {d}/{n} video đầu', { d: Math.min(d.done, st.manualFirst), n: st.manualFirst })}</span>
        <button class="btn sm primary" id="stuNew">${S('➕ Job mới')}</button><button class="btn sm" id="stuQueue">${S('📥 Lấy từ hàng đợi')}</button><button class="btn ghost sm" id="stuSet">${S('⚙️ Cài đặt')}</button><button class="btn ghost sm" id="stuReload">${S('🔄 Tải lại')}</button></div></div>
        <p class="small stu-msg" id="stuMsg" role="status" aria-live="polite">${st.auto ? S('Tự động bật: video QA ≥ 90 tự lên lịch (sau {n} video duyệt tay).', { n: st.manualFirst }) : ''}</p>
        ${miss.length ? `<section class="card" style="margin-bottom:1rem"><h3 style="margin:0">${S('⚙️ Chưa cấu hình đủ')}</h3><p class="small" style="margin:.4rem 0">${S('Đặt secret trên Cloudflare Pages (và GitHub Actions nếu ghi chú) rồi triển khai lại:')}</p><ul class="small" style="margin:0">${miss.map(m => `<li><code>${m[0]}</code> – ${S(m[2])}</li>`).join('')}</ul></section>` : ''}
        <div class="stu-board">${d.statuses.map(s => `<div class="stu-col" style="--h:${HUE[s]}"><h4><span>${S(ST[s])}</span><span class="pill">${d.counts[s] || 0}</span></h4>${byS(s).slice(0, 30).map(r => `<button class="stu-card" data-id="${esc(r.id)}">${esc(r.topic)}<small>${r.format === 'lesson' ? '16:9' : '9:16'} · ${esc(r.lang)}${r.total != null ? ' · QA ' + r.total : ''}${r.schedule_at ? ' · ' + esc(nyWhen(r.schedule_at)) : ''}</small>${r.error ? `<small class="e">⚠ ${esc(r.error.slice(0, 60))}</small>` : ''}</button>`).join('') || `<p class="tiny muted" style="margin:0">${S('Trống')}</p>`}</div>`).join('')}</div>
        <section class="card"><h3 style="margin:0 0 .5rem">${S('🗓️ 7 ngày tới (giờ New York)')}</h3>${cal(d.rows, posts)}</section>
        <div class="stu-grid"><section class="card">${assets(as && as.assets)}</section><section class="card" id="stuSetBox" hidden></section></div>`;
      const msg = (t, bad) => { const m = box.querySelector('#stuMsg'); m.textContent = t; m.className = 'small stu-msg ' + (bad ? 'stu-bad' : 'stu-ok'); };
      box.querySelector('#stuReload').onclick = reload;
      box.querySelector('#stuNew').onclick = async () => { const t = prompt(S('Chủ đề video (vd: Đừng nói "I\'m agree"):')); if (!t || !t.trim()) return; try { const r = await stapi('create', { topic: t.trim(), format: confirm(S('Bài dài (YouTube 16:9)?')) ? 'lesson' : 'short', lang: 'en' }); reload(); setTimeout(() => detail(r.job.id), 300); } catch (e) { msg(errMsg(e), 1); } };
      box.querySelector('#stuQueue').onclick = async () => { try { const r = await stapi('createFromQueue', { n: 3 }); msg(S('Đã tạo {n} job · còn {l} chủ đề', { n: r.jobs.length, l: r.left })); setTimeout(reload, 900); } catch (e) { msg(errMsg(e), 1); } };
      box.querySelector('#stuAuto').onchange = async e => { const on = e.target.checked; if (on && !confirm(S('Bật chế độ tự động? Kịch bản AI hợp lệ sẽ tự dựng; video QA ≥ 90 tự lên lịch đăng công khai (sau {n} video duyệt tay).', { n: st.manualFirst }))) { e.target.checked = false; return; } try { await stapi('settingsSet', { settings: { auto: on } }); reload(); } catch (x) { e.target.checked = !on; msg(errMsg(x), 1); } };
      box.querySelector('#stuSet').onclick = () => settings(st);
      box.querySelector('.stu-board').onclick = e => { const b = e.target.closest('[data-id]'); if (b) detail(b.dataset.id); };
    }).catch(e => { if (my === gen) box.innerHTML = `<p class="small stu-bad">✗ ${esc(errMsg(e))}</p>`; });

    function cal(rows, posts) {
      const days = Array.from({ length: 7 }, (_, i) => nyDay(Date.now() + i * 864e5)), items = {};
      const add = (t, label) => { const k = nyDay(t); (items[k] = items[k] || []).push([t, label]); };
      const seen = new Set(rows.filter(r => r.status === 'scheduled' && r.schedule_at).map(r => { add(r.schedule_at, '🎞️ ' + r.topic); return String(r.post_id); }));
      for (const p of arr(posts)) { const t = Date.parse(pick(p, 'scheduled_at', 'publish_at', 'scheduled_for') || ''); if (t && !seen.has(String(p.id))) add(t, pick(p, 'title', 'caption') || '–'); }
      if (!days.some(k => items[k])) return `<p class="small muted" style="margin:0">${S('Chưa có bài lên lịch.')}</p>`;
      return `<div class="stu-cal">${days.map(k => `<div class="stu-day"><b>${esc(new Date(k + 'T12:00:00Z').toLocaleDateString(LOC(), { weekday: 'short', day: 'numeric', month: 'numeric' }))}</b>${(items[k] || []).sort((a, b) => a[0] - b[0]).map(([t, l]) => `<div title="${esc(String(l))}">${esc(new Date(t).toLocaleTimeString(LOC(), { timeZone: NY, hour: '2-digit', minute: '2-digit' }))} · ${esc(String(l).slice(0, 40))}</div>`).join('')}</div>`).join('')}</div>`;
    }
    function assets(a) {
      if (!a) return `<h3 style="margin:0">${S('🧩 Kho tài nguyên')}</h3><p class="small muted">content/video/assets.json –</p>`;
      const n = v => (Array.isArray(v) ? v.length : v && typeof v === 'object' ? Object.keys(v).length : 0);
      const rows = [['Nhân vật', a.characters], ['Biểu cảm', a.expressions], ['Cử chỉ', a.gestures], ['Góc nhìn', a.views], ['Trang phục', a.outfits], ['Phòng/bối cảnh', a.rooms || a.backgrounds], ['Cặp nhân vật', a.pairs], ['Clip', a.clips], ['Đạo cụ', a.props]].filter(r => r[1]);
      const groups = {}; for (const b of a.rooms || a.backgrounds || []) groups[b.group || '?'] = (groups[b.group || '?'] || 0) + 1;
      return `<h3 style="margin:0">${S('🧩 Kho tài nguyên')}</h3><div class="stu-assets">${rows.map(([k, v]) => `<div><b>${n(v)}</b>${S(k)}</div>`).join('')}</div>
        <p class="tiny muted" style="margin:.6rem 0 0">${a.characters ? Object.keys(a.characters).map(esc).join(' · ') : ''}${Object.keys(groups).length ? ' — ' + Object.entries(groups).map(([g, c]) => esc(g) + ' ' + c).join(' · ') : ''}</p>`;
    }
    async function settings(st) {
      const el = box.querySelector('#stuSetBox'); el.hidden = false;
      const acc = await sapi('GET', 'accounts').then(arr).catch(() => []);
      el.innerHTML = `<h3 style="margin:0">${S('⚙️ Cài đặt')}</h3><div class="stu-form stu-dlg" style="width:auto"><label>${S('Hạn mức/ngày')}<input type="number" min="1" max="10" id="sq" value="${st.dailyQuota}"></label><label>${S('Duyệt tay N video đầu')}<input type="number" min="0" max="50" id="sm" value="${st.manualFirst}"></label>
        <label style="grid-column:1/-1">${S('Nền tảng (để trống = mọi kênh)')}<input id="sp" value="${esc(st.platforms.join(', '))}" placeholder="youtube, tiktok, instagram, facebook"></label></div>
        ${acc.length ? `<p class="small" style="margin:.6rem 0 .2rem"><b>${S('Kênh mặc định')}</b></p><div class="stu-times">${acc.map(a => `<label class="chip-f"><input type="checkbox" value="${esc(String(a.id))}" ${st.accounts.includes(String(a.id)) ? 'checked' : ''}> ${esc(pick(a, 'name', 'username', 'display_name') || a.id)} <small>${esc(pick(a, 'platform', 'provider') || '')}</small></label>`).join('')}</div>` : ''}
        <div class="stu-btns"><button class="btn primary sm" id="ssave">${S('Lưu cài đặt')}</button></div><p class="stu-msg" id="smsg"></p>`;
      el.querySelector('#ssave').onclick = async () => {
        try { await stapi('settingsSet', { settings: { dailyQuota: +el.querySelector('#sq').value, manualFirst: +el.querySelector('#sm').value, platforms: el.querySelector('#sp').value.split(',').map(x => x.trim()).filter(Boolean), accounts: [...el.querySelectorAll('.stu-times input:checked')].map(i => i.value) } }); el.querySelector('#smsg').textContent = S('✓ Xong'); }
        catch (e) { el.querySelector('#smsg').textContent = errMsg(e); }
      };
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    // ---------- Chi tiết job (hộp thoại) ----------
    async function detail(id) {
      const d = document.createElement('dialog'); d.className = 'key-dlg stu-dlg'; document.body.appendChild(d); d.showModal();
      d.addEventListener('close', () => { d.remove(); reload(); }); d.addEventListener('click', e => { if (e.target === d) d.close(); });
      d.innerHTML = `<div class="key-box"><p class="muted">${S('Đang tải…')}</p></div>`;
      let r, slots = []; try { r = await stapi('get', { id }); } catch (e) { d.innerHTML = `<div class="key-box"><p class="stu-bad">${esc(errMsg(e))}</p></div>`; return; }
      const j = r.job, rub = r.rubric, pass = r.pass, sc = j.script || { lines: [] };
      if (['qa_ok', 'uploaded'].includes(j.status)) slots = (await stapi('slots', { n: 6 }).catch(() => ({ slots: [] }))).slots;
      const can = to => (r.trans[j.status] || []).includes(to), opts = (list, v) => list.map(x => `<option ${x === v ? 'selected' : ''}>${x}</option>`).join('');
      const lineRow = (l, i) => `<tr data-i="${i}"><td><select name="who">${opts(CAST, l.who)}</select></td><td><select name="beat">${opts(BEATS, l.beat)}</select></td><td class="t"><input name="text" value="${esc(l.text)}" maxlength="160"></td><td><input name="expr" value="${esc(l.expr || '')}"></td><td><input name="gesture" value="${esc(l.gesture || '')}"></td><td><button type="button" class="btn ghost sm" data-del="${i}" aria-label="✕">✕</button></td></tr>`;
      const chk = c => (c ? (c.ok ? `<span class="stu-ok">${S('✓ Kịch bản hợp lệ')}</span>` : `<span class="stu-bad">• ${c.errs.map(esc).join('<br>• ')}</span>`) + (c.warns && c.warns.length ? `<br><span class="muted">• ${c.warns.map(esc).join('<br>• ')}</span>` : '') + ` <span class="muted">${S('≈ {s} s', { s: c.sec })}</span>` : '');
      const q = j.qa || { scores: {} }, tot = rub.reduce((t, x) => t + (+q.scores[x.k] || 0), 0), f = j.files || {};
      const editable = ['idea', 'script', 'script_ok', 'rendered', 'qa_fail', 'qa_ok'].includes(j.status);
      d.innerHTML = `<div class="key-box"><div class="row between"><h3 style="margin:0;overflow-wrap:anywhere">${esc(j.topic)} <span class="pill" style="background:${HUE[j.status]};color:#fff">${S(ST[j.status])}</span></h3><button class="icon-x" id="dx" aria-label="${S('Đóng')}">✕</button></div>
        <p class="tiny muted" style="margin:.3rem 0 0">${esc(j.id)} · ${j.format === 'lesson' ? 'YouTube 16:9' : 'Shorts 9:16'} · ${esc(j.lang)} · ${when(j.updated)}${j.schedule_at ? ' · ' + S('Lịch: {d}', { d: esc(nyWhen(j.schedule_at)) }) : ''}</p>
        ${j.error ? `<p class="small stu-bad" style="margin:.4rem 0 0">${S('Lỗi gần nhất')}: ${esc(j.error)}</p>` : ''}
        <div class="stu-sec"><h4>${S('✍️ Kịch bản')}</h4>
          <table class="stu-lines"><thead><tr><th>${S('Ai')}</th><th>${S('Phần')}</th><th>${S('Lời thoại')}</th><th>${S('Biểu cảm ')}</th><th>${S('Cử chỉ ')}</th><th></th></tr></thead><tbody id="dl">${sc.lines.map(lineRow).join('')}</tbody></table>
          <div class="stu-form"><label>${S('Tiêu đề')}<input id="dt" value="${esc(sc.title || '')}"></label><label>${S('Từ khóa tô cam')}<input id="dk" value="${esc((sc.keywords || []).join(', '))}"></label><label style="grid-column:1/-1">${S('Caption')}<textarea id="dc" rows="2">${esc(sc.caption || '')}</textarea></label><label style="grid-column:1/-1">${S('Hashtag (cách nhau dấu phẩy)')}<input id="dh" value="${esc((sc.hashtags || []).join(', '))}"></label></div>
          <div class="stu-btns">${editable ? `<button class="btn ghost sm" id="dadd">${S('+ Dòng')}</button>` : ''}${can('script') ? `<button class="btn sm" id="dgen">${S('✨ Viết bằng AI')}</button>` : ''}${editable && can('script') ? `<button class="btn sm" id="dsave">${S('💾 Lưu')}</button>` : ''}${can('script_ok') && j.script ? `<button class="btn primary sm" id="dok">${S('✅ Duyệt kịch bản')}</button>` : ''}</div>
          <p class="stu-msg" id="dm1">${chk(r.check)}</p></div>
        <div class="stu-sec"><h4>${S('🎬 Dựng & xem trước')}</h4><div class="stu-btns" style="margin-top:0">${can('rendering') ? `<button class="btn sm primary" id="drender">${S('▶️ Dựng video')}</button>` : ''}${f.preview_url ? `<a class="btn ghost sm" href="${esc(f.preview_url)}" target="_blank" rel="noopener">${S('Xem trước ↗')}</a>` : ''}${f.run_url ? `<a class="btn ghost sm" href="${esc(f.run_url)}" target="_blank" rel="noopener">${S('Lượt chạy ↗')}</a>` : ''}</div>
          <p class="tiny muted" style="margin:.4rem 0 0">${f.duration ? f.duration + ' s · ' : ''}${f.width ? f.width + '×' + f.height + ' · ' : ''}${f.object_id ? 'GrabCast ' + esc(f.object_id) : ''}${f.todo && f.todo.length ? ' · ' + S('Còn TODO: {t}', { t: esc(f.todo.join(', ')) }) : ''}</p><p class="stu-msg" id="dm2"></p></div>
        <div class="stu-sec"><h4>${S('🧪 Chấm QA (≥ {p} mới đăng)', { p: pass })}</h4><div class="stu-bar"><i style="width:${tot}%;background:${tot >= pass ? '#16a34a' : tot >= 70 ? '#f59e0b' : '#dc2626'}"></i></div>
          <table class="stu-qa"><tbody>${rub.map(x => { const g = (q.gates || []).filter(y => y.k === x.k || y.k.startsWith(x.k + '-')); return `<tr><td>${esc(lang() === 'en' ? RUB_EN[x.k] || x.vi : x.vi)}</td><td><input type="number" min="0" max="${x.max}" data-qk="${x.k}" value="${q.scores[x.k] ?? ''}" placeholder="${S('chưa chấm')}" ${['rendered', 'qa_ok', 'qa_fail'].includes(j.status) ? '' : 'disabled'}> / ${x.max}</td><td class="tiny muted">${g.map(y => (y.ok ? '✓ ' : '✗ ') + esc(y.note)).join('<br>')}</td></tr>`; }).join('')}</tbody></table>
          <p class="small" style="margin:.3rem 0"><b>${S('Tổng')}: ${tot}/100</b>${q.missing && q.missing.length ? ` · <span class="muted">${S('chưa chấm')}: ${esc(q.missing.join(', '))}</span>` : ''}</p>
          ${['rendered', 'qa_ok', 'qa_fail'].includes(j.status) ? `<button class="btn sm" id="dqa">${S('Lưu điểm')}</button>` : ''}<p class="stu-msg" id="dm3"></p></div>
        ${['qa_ok', 'uploaded', 'scheduled'].includes(j.status) ? `<div class="stu-sec"><h4>${S('📤 Đăng & lên lịch')}</h4>
          ${j.status !== 'scheduled' ? `<p class="small" style="margin:0">${S('Khung trống gợi ý (giờ New York):')}</p><div class="stu-times">${slots.map(s => `<button type="button" class="chip-f" data-at="${s.at}">${esc(nyWhen(s.at))}</button>`).join('')}</div>
          <label class="small">${S('Giờ đăng (giờ máy bạn, để trống = khung trống kế tiếp)')}<input type="datetime-local" id="dat"></label>
          <div class="stu-btns">${j.status === 'qa_ok' ? `<button class="btn primary sm" id="dpub">${S('📤 Đăng & lên lịch')}</button>` : `<button class="btn primary sm" id="dsch">${S('Lên lịch')}</button>`}</div>` : `<div class="stu-btns" style="margin-top:0"><button class="btn sm" id="dunsch">${S('Hủy lịch')}</button></div>`}<p class="stu-msg" id="dm4"></p></div>` : ''}
        ${['uploaded', 'scheduled', 'published'].includes(j.status) ? '' : `<div class="stu-sec"><button class="btn ghost sm danger" id="ddel">${S('🗑️ Xóa job')}</button></div>`}</div>`;
      const $ = s => d.querySelector(s), out = (el, t, bad) => { $(el).textContent = t; $(el).className = 'stu-msg ' + (bad ? 'stu-bad' : 'stu-ok'); };
      const again = () => { d.remove(); detail(id); };
      const run = async (el, fn) => { try { await fn(); again(); } catch (e) { out(el, errMsg(e), 1); } };
      const collect = () => ({ title: $('#dt').value, keywords: $('#dk').value.split(',').map(x => x.trim()).filter(Boolean), caption: $('#dc').value, hashtags: $('#dh').value.split(',').map(x => x.trim()).filter(Boolean), link: sc.link,
        lines: [...d.querySelectorAll('#dl tr')].map(tr => Object.fromEntries(['who', 'beat', 'text', 'expr', 'gesture'].map(k => [k, tr.querySelector(`[name=${k}]`).value]))) });
      $('#dx').onclick = () => d.close();
      if ($('#dadd')) $('#dadd').onclick = () => $('#dl').insertAdjacentHTML('beforeend', lineRow({ who: 'mia', beat: 'situation', text: '' }, d.querySelectorAll('#dl tr').length));
      $('#dl').onclick = e => { const b = e.target.closest('[data-del]'); if (b) b.closest('tr').remove(); };
      if ($('#dgen')) $('#dgen').onclick = () => run('#dm1', async () => { out('#dm1', S('Đang tải…')); const x = await stapi('scriptGen', { id }); if (!x.ai) alert(S('AI chưa sẵn sàng – đã tạo khung mẫu, hãy sửa tay.')); });
      if ($('#dsave')) $('#dsave').onclick = () => run('#dm1', () => stapi('scriptSave', { id, script: collect() }));
      if ($('#dok')) $('#dok').onclick = () => run('#dm1', async () => { if (editable && can('script')) await stapi('scriptSave', { id, script: collect() }); await stapi('scriptApprove', { id }); });
      if ($('#drender')) $('#drender').onclick = () => { if (confirm(S('Chạy GitHub Actions video.yml để dựng job này?'))) run('#dm2', () => stapi('render', { id })); };
      if ($('#dqa')) $('#dqa').onclick = () => run('#dm3', () => stapi('qaSet', { id, scores: Object.fromEntries([...d.querySelectorAll('[data-qk]')].map(i => [i.dataset.qk, i.value === '' ? null : +i.value])) }));
      d.querySelectorAll('[data-at]').forEach(b => b.onclick = () => { const t = new Date(+b.dataset.at); $('#dat').value = new Date(+t - t.getTimezoneOffset() * 6e4).toISOString().slice(0, 16); });
      const atVal = () => ($('#dat') && $('#dat').value ? new Date($('#dat').value).toISOString() : undefined);
      if ($('#dpub')) $('#dpub').onclick = () => { const at = atVal(); if (confirm(S('Tải lên GrabCast, tạo bài và lên lịch lúc {d}?', { d: at ? nyWhen(at) : S('khung trống kế tiếp') }))) run('#dm4', () => stapi('publish', { id, at, confirm: true })); };
      if ($('#dsch')) $('#dsch').onclick = () => { const at = atVal(); if (confirm(S('Tải lên GrabCast, tạo bài và lên lịch lúc {d}?', { d: at ? nyWhen(at) : S('khung trống kế tiếp') }))) run('#dm4', () => stapi('schedule', { id, at })); };
      if ($('#dunsch')) $('#dunsch').onclick = () => { if (confirm(S('Hủy lịch bài này? Bài trở về "Đã tải lên".'))) run('#dm4', () => stapi('unschedule', { id })); };
      if ($('#ddel')) $('#ddel').onclick = async () => { if (confirm(S('Xóa job này?'))) { try { await stapi('jobDelete', { id }); d.close(); } catch (e) { alert(errMsg(e)); } } };
    }
  }
  window.AdminStudio = { render };
})();
