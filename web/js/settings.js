/* Trang Cài đặt (tải lười – tách khỏi khung app 23/10): giao diện, mục tiêu, âm thanh, nhắc học, dữ liệu. */
(function () {
  /*icons*/UI.addIcons('<symbol id="i-palette" viewBox="0 0 24 24"><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></symbol><symbol id="i-bot" viewBox="0 0 24 24"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></symbol><symbol id="i-database" viewBox="0 0 24 24"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/></symbol>');/*/icons*/
  const { Store, SRS, todayKey } = Core;
  const { $, $$, esc, toast, download, speak } = UI;
  const App = window.App;
  const { state, view, routes, load, updateChrome, saveSettings } = App;
  const { applyTheme, importData, ankiAll, extCta } = App.settingsDeps;
  const R = window.Remind; // ⏰ js/remind.js (gói 'remind' nạp cùng trang Cài đặt – docs/REMINDERS.md)
  const adminTiles = () => [['overview', '📊', t('Tổng quan'), t('Người dùng, truy cập, việc cần xử lý')], ['analytics', '📈', t('Phân tích'), t('Nguồn truy cập, quốc gia, thiết bị, tốc độ')], ['users', '👥', t('Người dùng'), t('Danh sách, tìm kiếm, chi tiết')], ['inbox', '✉️', t('Hộp thư'), t('Tin nhắn liên hệ & trả lời')], ['alerts', '🚨', t('Cảnh báo'), t('Workflow, lỗi JavaScript, dung lượng')], ['quality', '🩺', t('Chất lượng'), t('Rà soát hằng ngày & bản dịch')], ['services', '🔑', t('Dịch vụ & API'), t('Tài khoản, khóa, hạn mức miễn phí')], ['settings', '⚙️', t('Cài đặt hệ thống'), t('Thông báo, hạn mức AI, Gemini API')]]
    .map(([id, ic, l, d]) => `<a class="adm-tile" href="${App.adminUrl(id)}" target="_blank" rel="noopener"><span class="adm-ic" aria-hidden="true">${ic}</span><span class="adm-tx"><b>${l}</b><small>${d}</small></span></a>`).join('');
  routes.settings = function () {
    const s = state.settings;
    const perm = 'Notification' in window ? Notification.permission : 'unsupported';
    const nc = x => x.replace(/[:：]\s*$/, ''); // nhãn đứng riêng – bỏ dấu hai chấm ở cuối
    const row = (label, ctl, hint = '') => (ctl = ctl.replace(/<(select|input)(?![^>]*aria-label)(?![^>]*type="file")/g, `<$1 aria-label="${esc(String(label).replace(/<[^>]+>/g, ''))}"`), `<div class="set-row"><div class="set-l"><span>${label}</span>${hint ? `<small>${hint}</small>` : ''}</div><div class="set-c">${ctl}</div></div>`);
    const tog = (id, on, label, hint = '') => `<label class="set-row switch"><span class="set-l"><span>${label}</span>${hint ? `<small>${hint}</small>` : ''}</span><input type="checkbox" id="${id}" ${on ? 'checked' : ''}></label>`;
    const slide = (label, vid, val, input, hint = '') => `<label class="set-row col"><span class="set-top"><span>${label}</span><b id="${vid}">${val}</b></span>${input}${hint ? `<small>${hint}</small>` : ''}</label>`;
    const seg = (id, items, cur) => `<div class="tabs seg" id="${id}">${items.map(([v, l, attr]) => `<button type="button" data-v="${v}" class="${cur === v ? 'on' : ''}"${attr || ''}>${l}</button>`).join('')}</div>`;
    const xt = /(^|\.)lexkite\.(com|pages\.dev)$/.test(location.hostname) ? '' : ' target="_blank" rel="noopener"'; // app/add-on: mở trình duyệt ngoài
    const sec = (id, title, body) => `<section class="set-sec" id="set-${id}"><h3 class="set-h">${title}</h3><div class="set-list">${body}</div></section>`;
    const NAV = [['account', UI.icon('cloud'), t('Tài khoản')], ['look', UI.icon('palette'), t('Giao diện')], ['study', UI.icon('target'), t('Mục tiêu học')], ['sound', UI.icon('volume-2'), t('Âm thanh')], ['remind', UI.icon('alarm-clock'), t('Nhắc học')], ['ai', UI.icon('bot'), 'AI'], ['data', UI.icon('database'), t('Dữ liệu')]];
    view.innerHTML = `
      <div class="set-wrap">
      <div class="page-head"><div><h1>${t('Cài đặt')}</h1><p class="muted">${t('Tài khoản, nhắc học, mục tiêu và giao diện')}</p></div></div>
      <nav class="set-nav" aria-label="${t('Cài đặt')}">${NAV.map(([id, ic, l]) => `<button type="button" data-jump="${id}"><span aria-hidden="true">${ic}</span> ${l}</button>`).join('')}</nav>
      <section class="set-sec" id="set-account"><div class="card stack" id="syncBox"></div><div id="leagueSetBox" style="margin-top:.75rem"></div></section>
      <section class="set-sec" id="set-admin" hidden><h3 class="set-h">${UI.icon('shield')}${t('Quản trị hệ thống')}<span class="chip ok" style="margin-left:.5rem;font-size:.7rem">${t('Chỉ quản trị viên')}</span></h3><div class="adm-grid">${adminTiles()}</div></section>
      ${sec('look', UI.icon('palette') + t('Giao diện'),
        row('🌐 ' + t('Ngôn ngữ giao diện'), App.langPicker())
        + row('📖 ' + t('Nghĩa từ hiển thị bằng'), seg('sMean', [['vi', 'Tiếng Việt', ' translate="no" lang="vi" data-keep-vi'], ['en', t('Định nghĩa tiếng Anh')]], I18N.meanLang()))
        + row(t('Chế độ màu'), seg('sTheme', [['auto', '🌓 ' + t('Tự động')], ['light', '☀️ ' + t('Sáng')], ['dark', '🌙 ' + t('Tối')]], s.theme)))}
      ${sec('study', UI.icon('target') + t('Mục tiêu học'),
        slide(nc(t('Từ mới mỗi ngày:')), 'vNew', s.dailyNew, `<input type="range" min="0" max="50" id="sNew" value="${s.dailyNew}">`)
        + slide(nc(t('Mục tiêu lượt ôn mỗi ngày:')), 'vGoal', s.dailyGoal, `<input type="range" min="5" max="200" step="5" id="sGoal" value="${s.dailyGoal}">`)
        + slide(nc(t('Tối đa thẻ mỗi phiên ôn:')), 'vCap', s.sessionCap || t('Không giới hạn'), `<input type="range" min="0" max="200" step="10" id="sCap" value="${s.sessionCap}">`)
        + slide('🧠 ' + nc(t('Mục tiêu ghi nhớ (thuật toán FSRS):')), 'vRet', Math.round((s.retention || 0.9) * 100) + '%', `<input type="range" min="0.8" max="0.95" step="0.01" id="sRet" value="${s.retention || 0.9}">`, t('Khả năng còn nhớ mỗi từ khi đến lượt ôn. 90% là cân bằng tốt nhất; 95% nhớ chắc hơn nhưng số lượt ôn gần gấp đôi; 85% ít ôn hơn, hợp khi bận.')))}
      ${sec('sound', UI.icon('volume-2') + t('Âm thanh & phát âm'),
        row(t('Giọng phát âm'), `<select class="input" id="sAccent"><option value="en-GB" ${s.accent === 'en-GB' ? 'selected' : ''}>🇬🇧 ${t('Anh – Anh (khuyên dùng cho IELTS)')}</option><option value="en-US" ${s.accent === 'en-US' ? 'selected' : ''}>🇺🇸 ${t('Anh – Mỹ')}</option></select>`)
        + row(t('Giọng đọc'), `<select class="input" id="sVoice"></select>`)
        + '<div id="voiceTip" class="tip small set-tip" hidden></div>'
        + slide(nc(t('Tốc độ đọc:')), 'vRate', (s.ttsRate || 0.92).toFixed(2) + '×', `<input type="range" min="0.6" max="1.2" step="0.02" id="sRate" value="${s.ttsRate || 0.92}">`)
        + row(`<button type="button" class="btn sm" id="sTry">▶️ ${t('Nghe thử câu mẫu')}</button>`, '', t('Từ đơn ưu tiên bản ghi giọng người thật'))
        + tog('sAuto', s.autoSpeak, t('Tự phát âm khi hiện thẻ'))
        + tog('sWhisper', s.whisperMode, '🤫 ' + t('Chế độ thì thầm khi luyện nói'))
        + tog('sHq', s.hqVoice !== false, t('Giọng đọc tự nhiên cho bài nghe & giám khảo (tải âm thanh từ mạng)'))
        + tog('sSfx', s.sfx, t('Hiệu ứng âm thanh')))}
      ${sec('remind', UI.icon('alarm-clock') + t('Nhắc học hằng ngày'),
        tog('sRem', s.reminderOn, t('Bật nhắc học'))
        + `<div id="remOpts" ${s.reminderOn ? '' : 'hidden'}>`
        + row(t('Giờ nhắc'), `<input type="time" class="input" id="sTime" value="${esc(s.reminderTime)}">`, Store.isExtension ? t('Add-on gửi thông báo vào giờ này mỗi ngày (kể cả khi chưa mở trang) và hiện số thẻ cần ôn trên biểu tượng.') : t('Trình duyệt chỉ nhắc được khi trang đang mở. Để nhắc chắc chắn, thêm lịch nhắc vào điện thoại hoặc dùng add-on Chrome.'))
        + tog('sAuto', s.reminderAuto !== false, t('Tự động theo giờ bạn hay học'), t('Nhắc 30 phút trước giờ bạn hay học nhất (sau vài ngày học).'))
        + row(t('Giờ yên lặng từ'), `<span class="set-btns"><input type="time" class="input" id="sQ1" value="${esc(s.quietStart)}"><span class="muted">${t('đến')}</span><input type="time" class="input" id="sQ2" value="${esc(s.quietEnd)}"></span>`, t('Không nhắc trong khung giờ này. Tối đa 1 lời nhắc mỗi ngày.'))
        + `<fieldset class="set-row col" style="border:0;margin:0;padding:0"><legend class="set-l"><span>${t('Loại lời nhắc')}</span></legend>${[['due', t('Thẻ đến hạn')], ['word', t('Từ trong sổ của bạn')], ['streak', t('Chuỗi ngày sắp mất')], ['conf', t('Bài tự tin')], ['week', t('Tiến bộ tuần')]].map(([k, l]) => tog('sTy_' + k, ((s.remTypes || {})[k]) !== false, l)).join('')}</fieldset>`
        + '<div id="remPush"></div>'
        + `<div class="set-row"><div class="set-btns">${Store.isExtension ? '' : `<button type="button" class="btn sm" id="sPerm" ${perm === 'granted' || perm === 'unsupported' ? 'disabled' : ''}>${perm === 'granted' ? '✓ ' + t('Đã cho phép thông báo') : perm === 'unsupported' ? t('Không hỗ trợ thông báo') : '🔔 ' + t('Cho phép thông báo')}</button><button type="button" class="btn sm" id="sIcs">📅 ${t('Thêm vào Lịch (.ics)')}</button>`}<button type="button" class="btn sm ghost" id="sTest">${t('Thử gửi thông báo')}</button></div></div></div>`
        + tog('sGold', s.goldenOn, t('Nhắc “thời điểm vàng”'), t('Báo khi có từ sắp bị quên'))
        + `<div id="goldOpts" ${s.goldenOn ? '' : 'hidden'}>`
        + `<label class="set-row col"><span class="set-top"><span>${t('Chỉ nhắc khi có ít nhất <b id="vGMin">{n}</b> từ cần ôn', { n: s.goldenMin })}</span></span><input type="range" min="1" max="50" id="sGMin" value="${s.goldenMin}"></label>`
        + '</div>'
        + tog('sDigest', s.emailDigest === true, '📧 ' + t('Báo cáo não bộ qua email'), t('Gửi tóm tắt trí nhớ FSRS và các từ sắp quên vào sáng Chủ nhật (khi đã đăng nhập)'))
        + (window.VBNative && VBNative.is ? '<div id="wwBox"></div>' : ''))}
      <section class="set-sec" id="set-ai"><div id="aiBox"></div></section>
      ${Store.isExtension ? '' : sec('ext', UI.icon('puzzle') + t('Add-on từ điển cho Chrome'), `<div class="set-row"><div class="set-l"><span class="small">${t('Bấm đúp vào bất kỳ từ tiếng Anh nào trên web để xem phiên âm, nghĩa, hình ảnh và <b>lưu vào flashcard kèm câu gốc làm ngữ cảnh</b>. Bôi đen cả câu/đoạn để <b>dịch sang tiếng Việt</b>.')}</span></div><a class="btn sm primary" data-ext-cta="set" hidden>${t('Thêm vào Chrome')}</a></div>`)}
      ${sec('data', UI.icon('database') + t('Dữ liệu'),
        row(t('Chuyển dữ liệu'), `<a class="btn sm" href="#/handoff">${t('📲 Chuyển sang điện thoại (không cần đăng nhập)')}</a>`)
        + row(t('Xuất sao lưu'), `<button type="button" class="btn sm" id="sExport">📦 Excel · PDF · JSON</button>`)
        + row('🃏 Anki', `<span class="set-btns"><button type="button" class="btn sm" id="sAnkiOut">${t('Xuất sang Anki')}</button><button type="button" class="btn sm" id="sAnkiIn">${t('Nhập từ Anki')}</button></span>`)
        + row(t('Nhập sao lưu'), `<label class="btn sm">⬆️ ${t('Nhập sao lưu')}<input type="file" id="sImport" accept="application/json" hidden></label>`)
        + row(`<span class="danger-t">${t('Xóa toàn bộ dữ liệu học')}</span>`, `<button type="button" class="btn sm danger" id="sReset">${t('Xóa')}</button>`)
        + row(t('Pháp lý & hỗ trợ'), `<span class="set-btns"><a class="btn sm" href="${App.legalUrl('privacy')}">${t('Chính sách quyền riêng tư')}</a><a class="btn sm" href="${App.legalUrl('terms')}">${t('Điều khoản sử dụng')}</a><a class="btn sm" href="#/contact">${t('Liên hệ')}</a><a class="btn sm" id="sBlog" href="${App.blogHref(0)}"${xt}>📰 ${t('Blog')}</a><a class="btn sm" href="${App.aboutUrl()}"${xt}>${t('Trang giới thiệu')}</a></span>`))}
      </div>`;
    extCta();
    App.blogLive().then(on => { const a = $('#sBlog'); if (a) a.href = App.blogHref(on); });
    // Mục quản trị: chỉ hiện sau khi máy chủ xác nhận quyền (thêm nút nhảy nhanh vào thanh mục lục)
    App.isAdmin().then(ok => { const sec = $('#set-admin'); if (!ok || !sec) return; sec.hidden = false; const nav = $('.set-nav'); if (nav && !nav.querySelector('[data-jump="admin"]')) { nav.insertAdjacentHTML('afterbegin', `<button type="button" data-jump="admin"><span aria-hidden="true">${UI.icon('shield')}</span> ${t('Quản trị')}</button>`); nav.querySelector('[data-jump="admin"]').onclick = () => sec.scrollIntoView({ behavior: 'smooth', block: 'start' }); } });
    $$('.set-nav [data-jump]').forEach(b => b.onclick = () => { const el = document.getElementById('set-' + b.dataset.jump); if (el) el.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }); });

    const save = async () => { await saveSettings(); Core.sfxOff = !s.sfx; updateChrome(); if (window.Sync) Sync.schedule(); };
    $('#sAuto').onchange = e => { s.reminderAuto = e.target.checked; if (s.reminderAuto && R) { const st = R.hm(R.pickTime(state.stats, s)); s.reminderTime = st; $('#sTime').value = st; } save(); };
    $$('[id^="sTy_"]').forEach(x => { x.onchange = () => { s.remTypes = { ...(s.remTypes || {}), [x.id.slice(4)]: x.checked }; save(); }; });
    // Nhắc cả khi đóng app (Web Push, nhóm thử nhỏ theo cờ máy chủ) – iPhone chỉ khi đã thêm vào Màn hình chính
    const rp = $('#remPush'); if (rp && R && R.pushState) (async () => {
      const st = R.pushState();
      if (st === 'ios-install') { rp.innerHTML = `<p class="small muted set-tip">📲 ${t('Trên iPhone/iPad: thêm Lexkite vào Màn hình chính (Chia sẻ → Thêm vào MH chính) để nhận nhắc cả khi đóng app.')}</p>`; return; }
      if (st === 'denied') { rp.innerHTML = `<p class="small muted set-tip">🔕 ${t('Thông báo đang bị chặn trong cài đặt của trình duyệt hoặc hệ thống.')}</p>`; return; }
      if (st !== 'ok' || !(await R.pushKey())) return;
      let on = false; try { on = !!JSON.parse(localStorage.getItem('lk.push') || 'null'); } catch (e) { /* bỏ qua */ }
      rp.innerHTML = tog('sPush', on, t('Nhắc cả khi đóng app'), t('Dùng thông báo đẩy của trình duyệt. Nội dung học không gửi lên máy chủ.'));
      $('#sPush').onchange = async e => { try { if (e.target.checked) { if (await Notification.requestPermission() !== 'granted' || !(await R.subscribe())) throw new Error('perm'); toast('⏰ ' + t('Đã bật nhắc học')); } else await R.unsubscribe(); } catch (x) { e.target.checked = false; toast(t('Bạn chưa cho phép thông báo')); } };
    })().catch(() => {});
    $('#sRem').onchange = e => { s.reminderOn = e.target.checked; $('#remOpts').hidden = !s.reminderOn; save(); };
    $('#sTime').onchange = e => { s.reminderTime = e.target.value || '20:00'; s.reminderAuto = false; const a = $('#sAuto'); if (a) a.checked = false; save(); toast(t('Sẽ nhắc lúc {time} mỗi ngày', { time: s.reminderTime })); };
    $('#sNew').oninput = e => { s.dailyNew = +e.target.value; $('#vNew').textContent = s.dailyNew; save(); };
    $('#sGoal').oninput = e => { s.dailyGoal = +e.target.value; $('#vGoal').textContent = s.dailyGoal; save(); };
    const drawAI = async () => { const b = $('#aiBox'); if (!b || !window.AI) return; b.innerHTML = await AI.settingsHtml(); AI.bindSettings(drawAI); };
    drawAI();
    if ($('#wwBox')) App.need('wfeed').then(() => window.WidgetFeed && WidgetFeed.settings($('#wwBox'), state, save)).catch(() => {}); // 📱 widget "Từ mỗi giờ" (app gốc)
    $('#sRet').oninput = e => { s.retention = +e.target.value; SRS.retentionTarget = s.retention; $('#vRet').textContent = Math.round(s.retention * 100) + '%'; save(); };
    $('#sGold').onchange = e => { s.goldenOn = e.target.checked; $('#goldOpts').hidden = !s.goldenOn; save(); };
    $('#sGMin').oninput = e => { s.goldenMin = +e.target.value; $('#vGMin').textContent = s.goldenMin; save(); };
    $('#sQ1').onchange = e => { s.quietStart = e.target.value || '22:00'; save(); };
    $('#sQ2').onchange = e => { s.quietEnd = e.target.value || '07:00'; save(); };
    $('#sCap').oninput = e => { s.sessionCap = +e.target.value; $('#vCap').textContent = s.sessionCap || t('Không giới hạn'); save(); };
    $('#sDigest').onchange = e => { s.emailDigest = e.target.checked; save(); };
    const fillVoices = () => {
      if (!$('#sVoice')) return; // đã rời trang Cài đặt
      const list = UI.voicesFor(s.accent);
      const cur = (UI.pickVoice(s.accent) || {}).name;
      $('#sVoice').innerHTML = list.length ? list.map((v, i) => `<option value="${esc(v.name)}" ${v.name === cur ? 'selected' : ''}>${esc(v.name)}${i === 0 ? ' ⭐ ' + t('khuyên dùng') : ''}</option>`).join('') : `<option>${t('Trình duyệt chưa có giọng tiếng Anh')}</option>`;
    };
    // Gợi ý giọng đọc hay hơn (miễn phí) khi máy chỉ có giọng "robot" – theo đúng hệ điều hành/trình duyệt
    const voiceTip = () => { const el = $('#voiceTip'); if (!el) return; const h = App.voiceTipHtml(s.accent); el.hidden = !h; el.innerHTML = h; };
    fillVoices(); voiceTip(); setTimeout(() => { fillVoices(); voiceTip(); }, 600);
    $('#sVoice').onchange = e => { s.voice = { ...(s.voice || {}), [s.accent]: e.target.value }; save(); UI.tts('This is how I will read words and sentences to you.', s.accent); };
    $('#sRate').oninput = e => { s.ttsRate = +e.target.value; $('#vRate').textContent = s.ttsRate.toFixed(2) + '×'; save(); };
    $('#sTry').onclick = () => UI.tts('Many people believe that renewable energy is the key to a sustainable future. However, the transition will not happen overnight.', s.accent);
    $('#sAccent').onchange = e => { s.accent = e.target.value; save(); fillVoices(); speak('pronunciation', s.accent); };
    $('#sAuto').onchange = e => { s.autoSpeak = e.target.checked; save(); };
    $('#sWhisper').onchange = e => { s.whisperMode = e.target.checked; save(); if (s.whisperMode) toast(t('Hãy đeo tai nghe và nói thì thầm vào micro – không làm phiền người xung quanh.'), 4500); };
    $('#sHq').onchange = e => { s.hqVoice = e.target.checked; save(); };
    $('#sSfx').onchange = e => { s.sfx = e.target.checked; save(); if (s.sfx) { Core.sfxOff = false; Sfx.correct(); } };
    $$('#sTheme button').forEach(b => b.onclick = () => { s.theme = b.dataset.v; applyTheme(); save(); $$('#sTheme button').forEach(x => x.classList.toggle('on', x === b)); });
    $('#sTest').onclick = () => R && R.notify(true);
    $$('#sMean [data-v]').forEach(b => b.onclick = () => { if (b.dataset.v !== I18N.meanLang()) I18N.setMean(b.dataset.v); });
    const p = $('#sPerm'); if (p) p.onclick = async () => { await Notification.requestPermission(); routes.settings(); };
    const ics = $('#sIcs'); if (ics) ics.onclick = () => download(new Blob([makeICS(s.reminderTime)], { type: 'text/calendar' }), 'ielts-lexi-nhac-hoc.ics');
    $('#sExport').onclick = () => App.xport();
    $('#sAnkiOut').onclick = () => App.anki('export', ankiAll());
    $('#sAnkiIn').onclick = () => App.anki('import');
    $('#sImport').onchange = importData;
    $('#sReset').onclick = async () => {
      if (!confirm(t('Xóa toàn bộ flashcard, tiến độ, XP và thống kê trên thiết bị này? Không thể hoàn tác.'))) return;
      await Store.set('cards', {}); await Store.set('stats', { days: {}, newToday: { day: '', n: 0 } }); await Store.set('game', null);
      await load(); toast(t('Đã xóa dữ liệu')); routes.settings();
    };
    if (window.Sync) Sync.renderBox($('#syncBox')); else $('#syncBox').hidden = true;
    const drawLeagueSet = () => {
      const lb = $('#leagueSetBox');
      if (!lb) return;
      let on = '0';
      try { on = localStorage.getItem('lk.league') || '0'; } catch (e) { /* bỏ qua */ }
      if (on !== '1' || !window.Sync || !Sync.user) { lb.innerHTML = ''; return; }
      lb.innerHTML = `<div class="card"><div class="row between wrap" style="gap:.6rem;align-items:center">
        <div><b>🏆 ${t('Giải đấu tuần')}</b><div class="muted small">${t('Bạn đang tham gia bảng xếp hạng 30 người')}</div></div>
        <button type="button" class="btn sm ghost danger" id="btnLeaveLeague">${t('Rời bảng xếp hạng')}</button>
      </div></div>`;
      const btn = $('#btnLeaveLeague');
      if (btn) btn.onclick = async () => {
        if (!confirm(t('Rời bảng xếp hạng tuần này? Điểm XP tuần này sẽ bị xóa khỏi giải đấu.'))) return;
        try {
          await Sync.league('leave');
          toast(t('Đã rời bảng xếp hạng tuần'));
          routes.settings();
        } catch (e) {
          toast(t('Không thể rời bảng xếp hạng: {msg}', { msg: e.message || e }));
        }
      };
    };
    drawLeagueSet();
  };

  function makeICS(time) {
    const [hh, mm] = time.split(':');
    const ymd = todayKey().replace(/-/g, '');
    const url = location.href.split('#')[0];
    return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Lexkite//VI', 'CALSCALE:GREGORIAN',
      'BEGIN:VEVENT', `UID:ielts-lexi-daily-${ymd}@lexi`, `DTSTAMP:${ymd}T000000Z`, `DTSTART:${ymd}T${hh}${mm}00`, 'DURATION:PT15M', 'RRULE:FREQ=DAILY',
      'SUMMARY:📚 ' + t('Ôn từ vựng IELTS (15 phút)'), 'DESCRIPTION:' + t('Mở Lexkite để ôn flashcard hôm nay: {url}', { url }), `URL:${url}`,
      'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + t('Đến giờ ôn từ vựng IELTS!'), 'TRIGGER:PT0M', 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  }
})();
