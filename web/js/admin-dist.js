/* Quản trị → "🛰️ Kênh & phân phối" (tải lười). AdminDist.render(main, dapi, L, { esc, lang, toast, yapi, sapi })
 *   dapi(op, body) → POST /api/distribution (functions/api/distribution.js). Hai vùng:
 *   ▸ Hệ thống (web/app): kênh nhúng (vai trò embed = unlisted, metadata tối giản + lk:), hàng "Sẵn sàng cho bài học", trạng thái nhúng từng bài,
 *     video hỏng/riêng tư/đã xóa → bài học tự dùng bản tự lưu trữ, bản đồ phủ chủ đề × CEFR.
 *   ▸ Social: kênh mọi nền tảng (YouTube = OAuth của mình; FB/IG/TikTok/Threads = bản sao GrabCast của tác tử social qua ext_sync), cài đặt từng kênh,
 *     trình sửa luật (thứ tự, kéo thả, thử 1 clip), lịch từng kênh + ghi đè tay/hàng loạt, xem trước metadata social (tiêu đề A/B, điểm SEO).
 * Mô hình luật thuần: js/lib/dist-rules.js (window.DistRules). docs/DISTRIBUTION.md. */
(function () {
  const EN = {
    'Kênh & phân phối': 'Channels & distribution', 'Hệ thống (web/app)': 'System (web/app)', 'Social': 'Social', 'Đang tải…': 'Loading…', 'Lỗi: {e}': 'Error: {e}',
    'Kênh nhúng': 'Embed channels', 'Bài học chỉ nhúng video từ kênh có vai trò Nhúng (unlisted, metadata tối giản + lk:).': 'Lessons only embed videos from channels with the Embed role (unlisted, minimal metadata + lk:).',
    'Xoay vòng giữa {n} kênh nhúng': 'Rotating across {n} embed channels', '{n} clip': '{n} clips', 'Cần kết nối lại': 'Needs reconnect', 'Nhúng': 'Embed', 'Vai trò': 'Role', 'Đặt làm kênh nhúng': 'Make embed channel', 'Chuyển sang social': 'Switch to social', 'Chưa có kênh nhúng – bài học đang dùng bản tự lưu trữ.': 'No embed channel yet – lessons use the self-hosted copy.',
    'Sẵn sàng cho bài học': 'Ready for lessons', 'Trạng thái nhúng theo bài': 'Embed status per lesson', 'Kiểm tra ngay': 'Check now', 'Video hỏng / riêng tư / đã xóa': 'Broken / private / deleted videos',
    'Không có video lỗi.': 'No broken videos.', '→ đang dùng bản tự lưu trữ': '→ serving the self-hosted copy', 'Bản đồ phủ (chủ đề × CEFR)': 'Coverage map (topic × CEFR)', 'Trống': 'Empty',
    'đang tạo gói': 'packing', 'gói sẵn sàng': 'pack ready', 'YouTube': 'YouTube', 'tự lưu trữ': 'self-hosted', 'Clip': 'Clip', 'Kênh': 'Channel', 'Trạng thái': 'Status', 'Lý do': 'Reason',
    'Kênh mạng xã hội': 'Social channels', 'Đồng bộ từ GrabCast': 'Sync from GrabCast', 'Chưa nối GrabCast – kênh FB/IG/TikTok/Threads hiện khi tác tử social đồng bộ.': 'GrabCast not connected – FB/IG/TikTok/Threads channels appear once the social publisher syncs.',
    'Cài đặt': 'Settings', 'Lưu': 'Save', 'Đã lưu': 'Saved', 'Hủy': 'Cancel', 'Bật': 'Active', 'Tạm dừng': 'Paused', 'Loại': 'Types', 'Chủ đề': 'Topics', 'Kỹ năng': 'Skills', 'Vùng (mã nước)': 'Regions (country codes)',
    'Tối đa/ngày': 'Daily cap', 'Cách nhau (phút)': 'Spacing (min)', 'Khung giờ': 'Windows', 'Múi giờ': 'Time zone', 'Nhãn': 'Label', 'Tất cả': 'All',
    'Luật định tuyến': 'Routing rules', 'Thứ tự = ưu tiên; mỗi nền tảng nhận luật khớp đầu tiên. Kéo ⠿ để đổi thứ tự.': 'Order = priority; each platform takes the first matching rule. Drag ⠿ to reorder.',
    'Thêm luật': 'Add rule', 'Kênh dự phòng (YouTube)': 'Fallback channel (YouTube)', 'Không': 'None', 'Lưu luật': 'Save rules', 'Chưa lưu': 'Unsaved', 'Xóa': 'Delete', 'Tên': 'Name', 'Lên': 'Up', 'Xuống': 'Down',
    'Thử clip': 'Test a clip', 'Mã clip (hoặc để trống và chọn thuộc tính)': 'Clip id (or leave empty and pick attributes)', 'Thử': 'Test', 'Kết quả': 'Result', 'Không kênh nào nhận.': 'No channel takes it.',
    'thắng': 'wins', 'không khớp': 'no match', 'bị chặn bởi cài đặt': 'blocked by settings', 'đã có kênh cùng nền tảng': 'platform already taken', 'tắt': 'off', 'dự phòng': 'fallback',
    'luật rỗng': 'empty condition', 'kênh lạ': 'unknown channel', 'kênh đang tạm dừng': 'channel paused', 'trùng luật #{n}': 'duplicate of rule #{n}',
    'Lịch theo kênh': 'Calendar per channel', 'Lên kế hoạch': 'Plan', 'Lên lại tự động': 'Re-plan automatic', 'Đã xếp {a} · social {b} · bỏ qua {c}': 'Planned {a} · social {b} · skipped {c}',
    'Ghi đè hàng loạt': 'Bulk override', '{n} đã chọn': '{n} selected', 'Giờ (tùy chọn với YouTube)': 'Time (optional for YouTube)', 'Áp dụng': 'Apply', 'Thêm tay (mã clip, cách nhau dấu phẩy)': 'Add manually (clip ids, comma separated)',
    'tay': 'manual', 'tự động': 'auto', 'Không có lịch trong 14 ngày.': 'Nothing scheduled in 14 days.', 'Metadata': 'Metadata', 'Điểm SEO': 'SEO score', 'Tiêu đề A/B': 'A/B titles', 'Đóng': 'Close',
    'Cảnh báo kênh': 'Channel alerts', 'Bật lại': 'Resume', 'Xóa cảnh báo': 'Clear alerts',
  };
  const CSS = `.ds{display:grid;gap:1rem}.ds-seg{display:flex;gap:.4rem;flex-wrap:wrap}.ds-seg button[aria-pressed=true]{background:var(--accent);color:#fff;border-color:var(--accent)}
.ds-card{border:1px solid var(--line);border-radius:14px;padding:.9rem;background:var(--surface);min-width:0}.ds-card h3{margin:0 0 .5rem;font-size:1rem}.ds-g2{display:grid;gap:1rem;grid-template-columns:repeat(auto-fit,minmax(min(100%,420px),1fr))}
.ds-t{width:100%;border-collapse:collapse;font-size:.86rem}.ds-t th,.ds-t td{text-align:start;padding:.35rem .4rem;border-bottom:1px solid var(--line);vertical-align:top}.ds-tw{overflow:auto;max-height:340px}
.ds-b{display:inline-block;border-radius:999px;padding:.05rem .5rem;font-size:.75rem;border:1px solid var(--line);white-space:nowrap}.ds-b.ok{border-color:#1a7f37;color:#1a7f37}.ds-b.bad{border-color:var(--bad,#b42318);color:var(--bad,#b42318)}.ds-b.em{background:var(--accent-soft,#e6f4f1);border-color:var(--accent)}
.ds-ch{display:flex;gap:.6rem;align-items:center;padding:.45rem 0;border-bottom:1px solid var(--line);flex-wrap:wrap}.ds-ch img{width:28px;height:28px;border-radius:50%}.ds-ch .grow{flex:1;min-width:140px}
.ds-rule{display:grid;grid-template-columns:auto 1fr auto;gap:.5rem;align-items:start;border:1px solid var(--line);border-radius:10px;padding:.5rem;margin:.4rem 0;background:var(--surface-2,transparent)}
.ds-rule.drag{opacity:.5}.ds-rule.over{outline:2px dashed var(--accent)}.ds-h{cursor:grab;user-select:none;font-size:1.2rem;padding:.2rem .3rem;color:var(--muted)}.ds-f{display:flex;flex-wrap:wrap;gap:.35rem}.ds-f select,.ds-f input{max-width:150px;min-width:0}
.ds-err{color:var(--bad,#b42318);font-size:.8rem}.ds-warn{color:#9a6700;font-size:.8rem}.ds-cal{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:.35rem}.ds-day{border:1px solid var(--line);border-radius:8px;padding:.3rem;min-height:84px;font-size:.78rem;min-width:0}
.ds-day b{display:block;font-size:.75rem;color:var(--muted)}.ds-slot{display:flex;gap:.25rem;align-items:flex-start;margin:.15rem 0;word-break:break-word}.ds-slot button{all:unset;cursor:pointer;text-decoration:underline dotted}
.ds-cov{display:grid;gap:2px;font-size:.75rem}.ds-cov div{padding:.25rem;text-align:center;border-radius:4px;background:var(--surface-2,#f3f3f3)}.ds-cov .h{background:none;font-weight:700}
.ds-dlg{position:fixed;inset:0;background:#0007;display:grid;place-items:center;z-index:50;padding:16px}.ds-dlg>div{background:var(--surface);color:var(--text);border-radius:14px;padding:1rem;max-width:640px;width:100%;max-height:90vh;overflow:auto}
.ds-row{display:flex;gap:.5rem;flex-wrap:wrap;align-items:center}.ds-form{display:grid;gap:.5rem}.ds-form label{display:grid;gap:.15rem;font-size:.85rem}.ds-chk{display:flex;flex-wrap:wrap;gap:.2rem .7rem}.ds-chk label{display:flex;gap:.25rem;align-items:center}
.ds-muted{color:var(--muted);font-size:.82rem}@media (max-width:640px){.ds-cal{grid-template-columns:repeat(2,minmax(0,1fr))}.ds-rule{grid-template-columns:auto 1fr}.ds-rule>.ds-act{grid-column:1/-1}}`;
  const PLAT = { youtube: '▶ YouTube', tiktok: '♪ TikTok', instagram: '◎ Instagram', facebook_page: 'ⓕ Facebook', threads: '@ Threads' };

  function render(main, dapi, L, ctx) {
    const { esc, toast = () => {} } = ctx, lang = ctx.lang || (() => 'vi'), R = window.DistRules;
    const V = (vi, vars) => { const s = lang() === 'en' && Object.prototype.hasOwnProperty.call(EN, vi) ? EN[vi] : lang() === 'en' ? vi : L(vi, vars); return vars ? String(s).replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? String(vars[k]) : m)) : s; };
    if (!document.getElementById('ds-css')) { const st = document.createElement('style'); st.id = 'ds-css'; st.textContent = CSS; document.head.appendChild(st); }
    let area = /[?&]area=social/.test(location.hash) ? 'social' : 'system', G = null, draft = [], saved = [], fallback = null, calCh = '';
    const sel = new Set();
    const err = e => `<p class="ds-err" role="alert">${esc(V('Lỗi: {e}', { e: e.code || e.message }))}</p>`;
    const chName = id => { const c = ((G && G.channels) || []).find(x => x.channel_id === id); return c ? (PLAT[c.platform] || c.platform) + ' · ' + (c.cfg.label || c.title || id) : id || '–'; };
    const tx = () => (G && G.taxonomy) || { types: [], topics: [], skills: [], exams: [], cefr: [] };
    const nm = (x, i) => (lang() === 'en' ? x[2] || x[i || 1] : x[1]);
    main.innerHTML = `<div class="ds"><div class="ds-row"><h2 style="margin:0">🛰️ ${esc(V('Kênh & phân phối'))}</h2></div>
      <div class="ds-seg" role="group"><button class="btn sm ghost" data-area="system" type="button">🌐 ${esc(V('Hệ thống (web/app)'))}</button><button class="btn sm ghost" data-area="social" type="button">📣 ${esc(V('Social'))}</button></div><div id="ds-body"></div></div>`;
    const body = main.querySelector('#ds-body');
    main.querySelectorAll('[data-area]').forEach(b => { b.onclick = () => { area = b.dataset.area; paint(); }; });
    const load = async () => { G = await dapi('get'); saved = R.norm(G.rules); draft = saved.map(r => ({ ...r, cond: { ...r.cond } })); fallback = G.fallback; };
    async function paint() {
      main.querySelectorAll('[data-area]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.area === area)));
      body.innerHTML = `<p class="ds-muted">${esc(V('Đang tải…'))}</p>`;
      try { if (!G) await load(); area === 'system' ? await system() : await social(); } catch (e) { body.innerHTML = err(e); }
    }

    // ---------------- Hệ thống (web/app) ----------------
    async function system() {
      const s = await dapi('embed_status'), st = { ready: V('gói sẵn sàng'), packing: V('đang tạo gói') };
      const cefr = tx().cefr.length ? tx().cefr : ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'], topics = [...new Set(s.coverage.map(c => c.topic))].sort(), cell = (t, c) => s.coverage.find(x => x.topic === t && x.cefr === c);
      body.innerHTML = `<div class="ds-g2">
        <section class="ds-card" aria-labelledby="ds-em"><h3 id="ds-em">🧩 ${esc(V('Kênh nhúng'))}</h3><p class="ds-muted">${esc(V('Bài học chỉ nhúng video từ kênh có vai trò Nhúng (unlisted, metadata tối giản + lk:).'))}</p>
          ${s.channels.map(c => `<div class="ds-ch"><span class="grow"><b>${esc(c.title || c.channel_id)}</b> <span class="ds-b ${c.role === 'embed' ? 'em' : ''}">${esc(c.role === 'embed' ? V('Nhúng') : V('Social'))}</span>${c.active ? '' : ` <span class="ds-b bad">${esc(V('Tạm dừng'))}</span>`}${c.role === 'embed' ? ` <span class="ds-muted">${esc(V('{n} clip', { n: c.clips }))}</span>` : ''}${c.status === 'ok' ? '' : ` <span class="ds-b bad">${esc(V('Cần kết nối lại'))}</span>`}</span>
            <button class="btn sm ghost" type="button" data-role="${esc(c.channel_id)}" data-to="${c.role === 'embed' ? 'social' : 'embed'}">${esc(c.role === 'embed' ? V('Chuyển sang social') : V('Đặt làm kênh nhúng'))}</button></div>`).join('')}
          ${s.channels.filter(c => c.rotating).length > 1 ? `<p class="ds-muted">🔄 ${esc(V('Xoay vòng giữa {n} kênh nhúng', { n: s.channels.filter(c => c.rotating).length }))}</p>` : ''}
          ${s.channels.some(c => c.role === 'embed') ? '' : `<p class="ds-warn">⚠️ ${esc(V('Chưa có kênh nhúng – bài học đang dùng bản tự lưu trữ.'))}</p>`}</section>
        <section class="ds-card" aria-labelledby="ds-rd"><h3 id="ds-rd">📦 ${esc(V('Sẵn sàng cho bài học'))} <span class="ds-b">${s.ready.length}</span></h3><div class="ds-tw"><table class="ds-t"><thead><tr><th>${esc(V('Clip'))}</th><th>${esc(V('Kênh'))}</th><th>${esc(V('Trạng thái'))}</th></tr></thead><tbody>
          ${s.ready.map(r => `<tr><td><b>${esc(r.title)}</b><br><code class="ds-muted">${esc(r.clip)}</code></td><td>${esc(chName(r.channel_id))}</td><td><span class="ds-b ${r.state === 'ready' ? 'ok' : ''}">${esc(st[r.state] || r.state)}</span></td></tr>`).join('') || `<tr><td colspan="3" class="ds-muted">${esc(V('Trống'))}</td></tr>`}</tbody></table></div></section>
        <section class="ds-card" aria-labelledby="ds-ls"><div class="ds-row"><h3 id="ds-ls" style="flex:1">🎬 ${esc(V('Trạng thái nhúng theo bài'))}</h3><button class="btn sm ghost" id="ds-chk" type="button">🔎 ${esc(V('Kiểm tra ngay'))}</button></div><div class="ds-tw"><table class="ds-t"><thead><tr><th>${esc(V('Clip'))}</th><th>${esc(V('Kênh'))}</th><th>${esc(V('Trạng thái'))}</th></tr></thead><tbody>
          ${s.lessons.map(r => `<tr><td><b>${esc(r.title)}</b><br><a href="https://youtu.be/${esc(r.video_id)}" target="_blank" rel="noopener">${esc(r.video_id)}</a></td><td>${esc(chName(r.channel_id))}</td><td><span class="ds-b ${r.status === 'youtube' ? 'ok' : 'bad'}">${esc(r.status === 'youtube' ? V('YouTube') : V('tự lưu trữ'))}</span>${r.why ? `<br><span class="ds-muted">${esc(r.why)}</span>` : ''}</td></tr>`).join('') || `<tr><td colspan="3" class="ds-muted">${esc(V('Trống'))}</td></tr>`}</tbody></table></div></section>
        <section class="ds-card" aria-labelledby="ds-bk"><h3 id="ds-bk">🚧 ${esc(V('Video hỏng / riêng tư / đã xóa'))} <span class="ds-b ${s.broken.length ? 'bad' : 'ok'}">${s.broken.length}</span></h3>
          ${s.broken.length ? `<ul>${s.broken.map(r => `<li><b>${esc(r.title)}</b> · ${esc(r.why)} <span class="ds-muted">${esc(V('→ đang dùng bản tự lưu trữ'))}</span></li>`).join('')}</ul>` : `<p class="ds-muted">✓ ${esc(V('Không có video lỗi.'))}</p>`}</section>
        <section class="ds-card" aria-labelledby="ds-cv" style="grid-column:1/-1"><h3 id="ds-cv">🗺️ ${esc(V('Bản đồ phủ (chủ đề × CEFR)'))}</h3>${topics.length ? `<div class="ds-tw"><div class="ds-cov" style="grid-template-columns:minmax(80px,1.4fr) repeat(${cefr.length},minmax(44px,1fr))"><div class="h"></div>${cefr.map(c => `<div class="h">${esc(c)}</div>`).join('')}
          ${topics.map(t => `<div class="h" style="text-align:start">${esc(t)}</div>${cefr.map(c => { const x = cell(t, c); return `<div title="YouTube ${x ? x.yt : 0} · ${esc(V('tự lưu trữ'))} ${x ? x.self : 0}" style="${x && x.yt ? 'background:var(--accent-soft,#e6f4f1)' : x ? 'outline:1px solid #9a6700' : ''}">${x ? x.yt + (x.self ? '+' + x.self : '') : '·'}</div>`; }).join('')}`).join('')}</div></div>` : `<p class="ds-muted">${esc(V('Trống'))}</p>`}</section></div>`;
      body.querySelectorAll('[data-role]').forEach(b => { b.onclick = async () => { const c = G.channels.find(x => x.channel_id === b.dataset.role); b.disabled = true; try { await dapi('cfg_set', { channel_id: c.channel_id, cfg: { ...c.cfg, role: b.dataset.to } }); G = null; toast(V('Đã lưu')); paint(); } catch (e) { toast(V('Lỗi: {e}', { e: e.code || e.message })); b.disabled = false; } }; });
      const ck = body.querySelector('#ds-chk'); ck.onclick = async () => { ck.disabled = true; try { if (ctx.yapi) await ctx.yapi('sync'); } catch (e) { toast(V('Lỗi: {e}', { e: e.code || e.message })); } paint(); };
    }

    // ---------------- Social ----------------
    async function social() {
      const chs = G.channels, al = G.alerts || [];
      body.innerHTML = `${al.length ? `<section class="ds-card"><h3>⚠️ ${esc(V('Cảnh báo kênh'))}</h3><ul>${al.map(a => `<li>${esc(a.title)} – ${esc(a.reason)} <button class="btn sm ghost" type="button" data-res="${esc(a.channel_id)}">${esc(V('Bật lại'))}</button></li>`).join('')}</ul><button class="btn sm ghost" id="ds-alc" type="button">${esc(V('Xóa cảnh báo'))}</button></section>` : ''}
        <div class="ds-g2"><section class="ds-card" aria-labelledby="ds-sc"><div class="ds-row"><h3 id="ds-sc" style="flex:1">📡 ${esc(V('Kênh mạng xã hội'))}</h3><button class="btn sm ghost" id="ds-gc" type="button">⟳ ${esc(V('Đồng bộ từ GrabCast'))}</button></div>
          ${chs.map(c => `<div class="ds-ch">${c.thumb ? `<img src="${esc(c.thumb)}" alt="" width="28" height="28" loading="lazy">` : ''}<span class="grow"><b>${esc(PLAT[c.platform] || c.platform)}</b> · ${esc(c.cfg.label || c.title || c.channel_id)}<br><span class="ds-muted">${esc(c.cfg.role === 'embed' ? V('Nhúng') : V('Social'))} · ${c.cfg.daily_cap}/${esc(lang() === 'en' ? 'day' : 'ngày')} · ${esc(c.cfg.tz)}</span></span>
            <span class="ds-b ${c.status === 'ok' && c.cfg.active ? 'ok' : 'bad'}">${esc(c.status !== 'ok' ? c.status : c.cfg.active ? V('Bật') : V('Tạm dừng'))}</span><button class="btn sm ghost" type="button" data-cfg="${esc(c.channel_id)}">⚙ ${esc(V('Cài đặt'))}</button></div>`).join('')}
          ${chs.some(c => c.ext) ? '' : `<p class="ds-muted">${esc(V('Chưa nối GrabCast – kênh FB/IG/TikTok/Threads hiện khi tác tử social đồng bộ.'))}</p>`}</section>
        <section class="ds-card" aria-labelledby="ds-tc"><h3 id="ds-tc">🧪 ${esc(V('Thử clip'))}</h3><div class="ds-form"><label>${esc(V('Mã clip (hoặc để trống và chọn thuộc tính)'))}<input id="ds-tid" autocomplete="off" spellcheck="false"></label><div class="ds-f" id="ds-tsm">${condFields({}, 't')}</div>
          <div><button class="btn sm primary" id="ds-tgo" type="button">${esc(V('Thử'))}</button></div><div id="ds-tout" aria-live="polite"></div></div></section></div>
        <section class="ds-card" aria-labelledby="ds-ru"><div class="ds-row"><h3 id="ds-ru" style="flex:1">🔀 ${esc(V('Luật định tuyến'))} <span id="ds-dirty"></span></h3><button class="btn sm ghost" id="ds-add" type="button">＋ ${esc(V('Thêm luật'))}</button><button class="btn sm primary" id="ds-save" type="button">${esc(V('Lưu luật'))}</button></div>
          <p class="ds-muted">${esc(V('Thứ tự = ưu tiên; mỗi nền tảng nhận luật khớp đầu tiên. Kéo ⠿ để đổi thứ tự.'))}</p><div id="ds-rules"></div>
          <label class="ds-row">${esc(V('Kênh dự phòng (YouTube)'))} <select id="ds-fb"><option value="">${esc(V('Không'))}</option>${chs.filter(c => c.platform === 'youtube').map(c => `<option value="${esc(c.channel_id)}"${c.channel_id === fallback ? ' selected' : ''}>${esc(chName(c.channel_id))}</option>`).join('')}</select></label></section>
        <section class="ds-card" aria-labelledby="ds-ca"><div class="ds-row"><h3 id="ds-ca" style="flex:1">📅 ${esc(V('Lịch theo kênh'))}</h3><select id="ds-cch" aria-label="${esc(V('Kênh'))}"><option value="">${esc(V('Tất cả'))}</option>${chs.map(c => `<option value="${esc(c.channel_id)}"${c.channel_id === calCh ? ' selected' : ''}>${esc(chName(c.channel_id))}</option>`).join('')}</select>
          <button class="btn sm ghost" id="ds-plan" type="button">${esc(V('Lên kế hoạch'))}</button><button class="btn sm ghost" id="ds-replan" type="button">${esc(V('Lên lại tự động'))}</button></div><div id="ds-cal"></div>
          <div class="ds-card" style="margin-top:.6rem"><b>${esc(V('Ghi đè hàng loạt'))}</b> <span id="ds-seln" class="ds-muted"></span><div class="ds-form"><label>${esc(V('Thêm tay (mã clip, cách nhau dấu phẩy)'))}<input id="ds-ids" autocomplete="off" spellcheck="false"></label>
            <div class="ds-row"><select id="ds-och" aria-label="${esc(V('Kênh'))}">${chs.filter(c => c.status === 'ok').map(c => `<option value="${esc(c.channel_id)}">${esc(chName(c.channel_id))}</option>`).join('')}</select><label class="ds-row">${esc(V('Giờ (tùy chọn với YouTube)'))}<input type="datetime-local" id="ds-ot"></label><button class="btn sm primary" id="ds-oap" type="button">${esc(V('Áp dụng'))}</button></div></div></div></section>`;
      body.querySelectorAll('[data-res]').forEach(b => { b.onclick = async () => { await dapi('resume', { channel_id: b.dataset.res }); G = null; paint(); }; });
      const alc = body.querySelector('#ds-alc'); if (alc) alc.onclick = async () => { await dapi('alerts_clear'); G = null; paint(); };
      body.querySelectorAll('[data-cfg]').forEach(b => { b.onclick = () => cfgDialog(chs.find(c => c.channel_id === b.dataset.cfg)); });
      body.querySelector('#ds-gc').onclick = syncGrabCast;
      body.querySelector('#ds-add').onclick = () => { draft = R.add(draft, { name: '', cond: { type: 'short' }, channel_id: (chs[0] || {}).channel_id || '', active: 1 }); rules(); };
      body.querySelector('#ds-fb').onchange = e => { fallback = e.target.value || null; rules(); };
      body.querySelector('#ds-save').onclick = saveRules;
      body.querySelector('#ds-tgo').onclick = testClip;
      body.querySelector('#ds-cch').onchange = e => { calCh = e.target.value; cal(); };
      body.querySelector('#ds-plan').onclick = () => plan(false); body.querySelector('#ds-replan').onclick = () => plan(true);
      body.querySelector('#ds-oap').onclick = override;
      rules(); cal();
    }
    function condFields(c, p) {
      const t = tx(), o = (k, list, lab) => `<select data-${p}="${k}" aria-label="${esc(lab)}"><option value="">${esc(lab)}: ${esc(V('Tất cả'))}</option>${list.map(([v, n]) => `<option value="${esc(v)}"${c[k] === v ? ' selected' : ''}>${esc(n)}</option>`).join('')}</select>`;
      const topics = t.topics.flatMap(x => [[x.id, lang() === 'en' ? x.en : x.vi], ...x.sub.map(s => [x.id + '/' + s.id, '  › ' + (lang() === 'en' ? s.en : s.vi)])]);
      return o('type', t.types.map(x => [x[0], x[1]]), V('Loại')) + o('topic', topics, V('Chủ đề')) + o('skill', t.skills.map(x => [x[0], nm(x)]), V('Kỹ năng')) + o('cefr', t.cefr.map(x => [x, x]), 'CEFR') + o('exam', t.exams.map(x => [x, x.toUpperCase()]), 'Exam')
        + `<input data-${p}="region" value="${esc(c.region || '')}" placeholder="${esc(V('Vùng (mã nước)'))}" aria-label="${esc(V('Vùng (mã nước)'))}" size="8">`;
    }
    function rules() {
      const box = body.querySelector('#ds-rules'); if (!box) return;
      const errs = R.validate(draft, G.channels), lab = { 'empty-condition': V('luật rỗng'), 'bad-channel': V('kênh lạ'), 'channel-paused': V('kênh đang tạm dừng') };
      box.innerHTML = draft.map((r, i) => `<div class="ds-rule" data-i="${i}" draggable="true"><span class="ds-h" aria-hidden="true" title="drag">⠿</span><div><div class="ds-row"><b>#${i + 1}</b><input data-r="name" value="${esc(r.name)}" placeholder="${esc(V('Tên'))}" aria-label="${esc(V('Tên'))}" size="12">
          <select data-r="channel_id" aria-label="${esc(V('Kênh'))}">${G.channels.map(c => `<option value="${esc(c.channel_id)}"${c.channel_id === r.channel_id ? ' selected' : ''}>${esc(chName(c.channel_id))}</option>`).join('')}</select>
          <label class="ds-row"><input type="checkbox" data-r="active"${r.active ? ' checked' : ''}> ${esc(V('Bật'))}</label></div><div class="ds-f">${condFields(r.cond, 'c')}</div>
          ${errs.filter(e => e.i === i).map(e => `<div class="${e.warn ? 'ds-warn' : 'ds-err'}">${esc(e.code === 'shadowed' ? V('trùng luật #{n}', { n: e.by + 1 }) : lab[e.code] || e.code)}</div>`).join('')}</div>
          <div class="ds-act ds-row"><button class="btn sm ghost" type="button" data-mv="-1" aria-label="${esc(V('Lên'))}">↑</button><button class="btn sm ghost" type="button" data-mv="1" aria-label="${esc(V('Xuống'))}">↓</button><button class="btn sm ghost" type="button" data-del aria-label="${esc(V('Xóa'))}">✕</button></div></div>`).join('');
      body.querySelector('#ds-dirty').innerHTML = R.dirty(draft, saved) || fallback !== G.fallback ? `<span class="ds-b">${esc(V('Chưa lưu'))}</span>` : '';
      body.querySelector('#ds-save').disabled = errs.some(e => !e.warn);
      let from = -1;
      box.querySelectorAll('.ds-rule').forEach(el => {
        const i = +el.dataset.i;
        el.addEventListener('dragstart', e => { from = i; el.classList.add('drag'); try { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(i)); } catch (x) { /* bỏ qua */ } });
        el.addEventListener('dragend', () => el.classList.remove('drag'));
        el.addEventListener('dragover', e => { e.preventDefault(); el.classList.add('over'); });
        el.addEventListener('dragleave', () => el.classList.remove('over'));
        el.addEventListener('drop', e => { e.preventDefault(); if (from >= 0 && from !== i) { draft = R.move(draft, from, i); rules(); } });
        el.querySelectorAll('[data-mv]').forEach(b => { b.onclick = () => { draft = R.move(draft, i, i + +b.dataset.mv); rules(); const n = box.querySelector(`.ds-rule[data-i="${Math.max(0, Math.min(draft.length - 1, i + +b.dataset.mv))}"] [data-mv="${b.dataset.mv}"]`); if (n) n.focus(); }; });
        el.querySelector('[data-del]').onclick = () => { draft = R.remove(draft, i); rules(); };
        el.querySelectorAll('[data-r]').forEach(f => { f.onchange = () => { draft = R.patch(draft, i, { [f.dataset.r]: f.type === 'checkbox' ? (f.checked ? 1 : 0) : f.value }); rules(); }; });
        el.querySelectorAll('[data-c]').forEach(f => { f.onchange = () => { const cond = { ...draft[i].cond, [f.dataset.c]: f.value }; if (!f.value) delete cond[f.dataset.c]; draft = draft.map((r, j) => (j === i ? { ...r, cond } : r)); rules(); }; });
      });
    }
    async function saveRules() { try { const p = R.toPayload(draft, fallback); await dapi('rules_set', { rules: p.rules, fallback: p.fallback }); G = null; await load(); toast(V('Đã lưu')); rules(); } catch (e) { toast(V('Lỗi: {e}', { e: e.code || e.message })); } }
    async function testClip() {
      const out = body.querySelector('#ds-tout'), id = body.querySelector('#ds-tid').value.trim(), sample = {}; body.querySelectorAll('[data-t]').forEach(f => { if (f.value) sample[f.dataset.t] = f.value; });
      if (sample.topic && sample.topic.includes('/')) { sample.sub = sample.topic; sample.topic = sample.topic.split('/')[0]; }
      const res = { win: V('thắng'), 'no-match': V('không khớp'), blocked: V('bị chặn bởi cài đặt'), shadowed: V('đã có kênh cùng nền tảng'), off: V('tắt') };
      try { const r = await dapi('test_clip', { ...(id ? { clip: id } : { sample }), rules: R.norm(draft) });
        out.innerHTML = `<table class="ds-t"><tbody>${r.trace.map(t => `<tr><td>#${t.i + 1}</td><td>${esc(chName(t.channel_id))}</td><td><span class="ds-b ${t.result === 'win' ? 'ok' : ''}">${esc(res[t.result] || t.result)}</span>${t.why ? ` <span class="ds-muted">${esc(t.why)}</span>` : ''}</td></tr>`).join('')}</tbody></table>
          <p><b>${esc(V('Kết quả'))}:</b> ${r.routes.length ? r.routes.map(x => esc(chName(x.channel_id)) + (x.rule === -1 ? ` (${esc(V('dự phòng'))})` : '')).join(' · ') : esc(V('Không kênh nào nhận.'))}</p>`;
      } catch (e) { out.innerHTML = err(e); }
    }
    async function cal() {
      const box = body.querySelector('#ds-cal'); if (!box) return; box.innerHTML = `<p class="ds-muted">${esc(V('Đang tải…'))}</p>`;
      try {
        const r = await dapi('plan_get', { channel_id: calCh || undefined, days: 14 }), days = [], d0 = new Date(); d0.setHours(0, 0, 0, 0);
        for (let i = 0; i < 14; i++) { const d = new Date(d0.getTime() + i * 864e5); days.push(d.toISOString().slice(0, 10)); }
        const byDay = {}; for (const x of r.rows) (byDay[x.date] = byDay[x.date] || []).push(x);
        box.innerHTML = r.rows.length ? `<div class="ds-cal">${days.map(d => `<div class="ds-day"><b>${esc(new Date(d + 'T12:00:00').toLocaleDateString(lang() === 'en' ? 'en-US' : 'vi-VN', { weekday: 'short', day: 'numeric', month: 'numeric' }))}</b>${(byDay[d] || []).map(x => `<div class="ds-slot"><input type="checkbox" data-sel="${esc(x.clip)}"${sel.has(x.clip) ? ' checked' : ''} aria-label="${esc(x.clip)}"><span>${esc(x.time)} <button type="button" data-meta="${esc(x.clip)}">${esc(x.title || x.clip)}</button><br><span class="ds-muted">${esc(chName(x.channel_id))} · ${esc(x.source === 'manual' ? V('tay') : V('tự động'))}</span></span></div>`).join('')}</div>`).join('')}</div>` : `<p class="ds-muted">${esc(V('Không có lịch trong 14 ngày.'))}</p>`;
        box.querySelectorAll('[data-sel]').forEach(c => { c.onchange = () => { c.checked ? sel.add(c.dataset.sel) : sel.delete(c.dataset.sel); body.querySelector('#ds-seln').textContent = V('{n} đã chọn', { n: sel.size }); }; });
        box.querySelectorAll('[data-meta]').forEach(b => { b.onclick = () => metaDialog(b.dataset.meta); });
      } catch (e) { box.innerHTML = err(e); }
    }
    async function plan(replan) { try { const r = await dapi('plan_run', { replan }); toast(V('Đã xếp {a} · social {b} · bỏ qua {c}', { a: r.planned, b: r.social || 0, c: (r.skipped || []).length })); cal(); } catch (e) { toast(V('Lỗi: {e}', { e: e.code || e.message })); } }
    async function override() {
      const typed = body.querySelector('#ds-ids').value.split(/[,\s]+/).map(x => x.trim()).filter(Boolean), ids = [...new Set([...sel, ...typed])], t = body.querySelector('#ds-ot').value;
      if (!ids.length) return; try { const r = await dapi('plan_set', { ids, channel_id: body.querySelector('#ds-och').value, slot: t ? new Date(t).toISOString() : undefined }); toast(V('Đã lưu') + ' · ' + r.count); sel.clear(); body.querySelector('#ds-ids').value = ''; cal(); } catch (e) { toast(V('Lỗi: {e}', { e: e.code || e.message })); }
    }
    function dialog(html, onOpen) {
      const d = document.createElement('div'); d.className = 'ds-dlg'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-modal', 'true'); d.innerHTML = `<div>${html}</div>`; document.body.appendChild(d);
      const prev = document.activeElement, close = () => { d.remove(); if (prev && prev.focus) prev.focus(); };
      d.addEventListener('click', e => { if (e.target === d || e.target.closest('[data-x]')) close(); }); d.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
      const f = d.querySelector('input,select,button'); if (f) f.focus(); if (onOpen) onOpen(d, close);
    }
    function cfgDialog(c) {
      const t = tx(), cf = c.cfg, chk = (k, list) => `<div class="ds-chk">${list.map(([v, n]) => `<label><input type="checkbox" data-k="${k}" value="${esc(v)}"${(cf[k] || []).includes(v) ? ' checked' : ''}> ${esc(n)}</label>`).join('')}</div>`;
      const topics = t.topics.flatMap(x => [[x.id, lang() === 'en' ? x.en : x.vi], ...x.sub.map(s => [x.id + '/' + s.id, '› ' + (lang() === 'en' ? s.en : s.vi)])]);
      dialog(`<h3>⚙ ${esc(chName(c.channel_id))}</h3><div class="ds-form">
        <label>${esc(V('Nhãn'))}<input id="cf-label" value="${esc(cf.label)}"></label>
        ${c.platform === 'youtube' ? `<label>${esc(V('Vai trò'))}<select id="cf-role"><option value="social"${cf.role !== 'embed' ? ' selected' : ''}>${esc(V('Social'))}</option><option value="embed"${cf.role === 'embed' ? ' selected' : ''}>${esc(V('Nhúng'))}</option></select></label>` : ''}
        <fieldset><legend>${esc(V('Loại'))}</legend>${chk('types', t.types.map(x => [x[0], x[1]]))}</fieldset><fieldset><legend>${esc(V('Chủ đề'))}</legend>${chk('topics', topics)}</fieldset>
        <fieldset><legend>${esc(V('Kỹ năng'))}</legend>${chk('skills', t.skills.map(x => [x[0], nm(x)]))}</fieldset><fieldset><legend>CEFR</legend>${chk('cefr', t.cefr.map(x => [x, x]))}</fieldset>
        <label>${esc(V('Vùng (mã nước)'))}<input id="cf-regions" value="${esc((cf.regions || []).join(', '))}" placeholder="US, GB, IN"></label>
        <div class="ds-row"><label>${esc(V('Tối đa/ngày'))}<input type="number" id="cf-cap" min="1" max="50" value="${cf.daily_cap}"></label><label>${esc(V('Cách nhau (phút)'))}<input type="number" id="cf-gap" min="0" max="1440" value="${cf.min_gap_min}"></label><label>${esc(V('Múi giờ'))}<input id="cf-tz" value="${esc(cf.tz)}"></label></div>
        <label>${esc(V('Khung giờ'))}<input id="cf-win" value="${esc(cf.windows.map(w => w.from + '-' + w.to).join(', '))}" placeholder="09:00-12:00, 18:00-21:00"></label>
        <label class="ds-row"><input type="checkbox" id="cf-act"${cf.active ? ' checked' : ''}> ${esc(V('Bật'))}</label>
        <div class="ds-row"><button class="btn primary" id="cf-save" type="button">${esc(V('Lưu'))}</button><button class="btn ghost" data-x type="button">${esc(V('Hủy'))}</button></div></div>`, (d, close) => {
        d.querySelector('#cf-save').onclick = async () => {
          const pick = k => [...d.querySelectorAll(`[data-k="${k}"]:checked`)].map(x => x.value), q = s => d.querySelector(s);
          const cfg = { ...cf, label: q('#cf-label').value, role: q('#cf-role') ? q('#cf-role').value : 'social', types: pick('types'), topics: pick('topics'), skills: pick('skills'), cefr: pick('cefr'), regions: q('#cf-regions').value,
            daily_cap: +q('#cf-cap').value, min_gap_min: +q('#cf-gap').value, tz: q('#cf-tz').value.trim(), windows: q('#cf-win').value.split(',').map(x => x.trim().split('-')).filter(x => x.length === 2).map(([from, to]) => ({ from: from.trim(), to: to.trim() })), active: q('#cf-act').checked ? 1 : 0 };
          try { await dapi('cfg_set', { channel_id: c.channel_id, cfg }); toast(V('Đã lưu')); close(); G = null; paint(); } catch (e) { toast(V('Lỗi: {e}', { e: e.code || e.message })); }
        };
      });
    }
    async function metaDialog(clip) {
      try { const m = await dapi('meta', { clip }), s = Object.entries(m.social);
        dialog(`<h3>${esc(V('Metadata'))} · <code>${esc(clip)}</code></h3><p><span class="ds-b em">${esc(V('Nhúng'))}</span> <b>${esc(m.embed.title)}</b></p><pre style="white-space:pre-wrap;font-size:.8rem">${esc(m.embed.description)}</pre>
          ${s.map(([p, x]) => `<hr><p><b>${esc(PLAT[p] || p)}</b> · ${esc(V('Điểm SEO'))} <span class="ds-b ${x.seo.score >= 80 ? 'ok' : 'bad'}">${x.seo.score}</span>${x.seo.failed.length ? ` <span class="ds-muted">${esc(x.seo.failed.join(', '))}</span>` : ''}</p><p>${esc(V('Tiêu đề A/B'))}: ${x.variants.map(v => `<span class="ds-b">${esc(v)}</span>`).join(' ')}</p><pre style="white-space:pre-wrap;font-size:.8rem">${esc(x.description)}</pre>`).join('')}
          <button class="btn ghost" data-x type="button">${esc(V('Đóng'))}</button>`);
      } catch (e) { toast(V('Lỗi: {e}', { e: e.code || e.message })); }
    }
    async function syncGrabCast() {
      if (!ctx.sapi) return; try { const r = await ctx.sapi('GET', 'accounts'), list = (Array.isArray(r) ? r : r.data || r.accounts || []).map(a => ({ platform: a.platform || a.provider, id: String(a.id), name: a.name || a.username || a.display_name, avatar: a.avatar || a.avatar_url, status: a.status }));
        await dapi('ext_sync', { accounts: list }); G = null; toast(V('Đã lưu') + ' · ' + list.length); paint();
      } catch (e) { toast(V('Lỗi: {e}', { e: e.code || e.message })); }
    }
    paint();
  }
  window.AdminDist = { render, EN };
})();
