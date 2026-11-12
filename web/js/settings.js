/* Trang Cài đặt (tải lười · mục lục + trang con: SET_CSS bên dưới – tách khỏi khung app 23/10): giao diện, mục tiêu, âm thanh, nhắc học, dữ liệu. */
(function () {
  /*icons*/UI.addIcons('<symbol id="i-palette" viewBox="0 0 24 24"><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></symbol><symbol id="i-bot" viewBox="0 0 24 24"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></symbol><symbol id="i-database" viewBox="0 0 24 24"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/></symbol>');/*/icons*/
  const { Store, SRS, todayKey } = Core;
  // 🎨 CSS riêng trang Cài đặt (mục lục + trang con) – nạp cùng gói lười, không vào khung app (DESIGN-SYSTEM §6)
  try { if (!document.getElementById('setCss')) { const st = document.createElement('style'); st.id = 'setCss'; st.textContent = `.set-head{flex-direction:column;align-items:flex-start;gap:.15rem;margin-bottom:var(--sp-3,12px)}
.set-head h1{margin:0}
.set-back{margin:0}.set-back a{display:inline-flex;align-items:center;gap:.3rem;min-height:44px;min-width:44px;padding:0 .5rem 0 0;font-weight:700;color:var(--heading);text-decoration:none}
.set-back a>span{font-size:1.6em;line-height:1}
.set-idx{display:grid;gap:var(--sp-4,16px);margin-bottom:var(--sp-6,24px)}
.set-idx #setIdxAdm:empty{display:none}
.set-grp{background:var(--surface);border:1px solid var(--line);border-radius:var(--radius,16px);box-shadow:0 3px 0 0 var(--line);overflow:hidden}
.set-go{display:flex;align-items:center;gap:.75rem;min-height:56px;padding:.5rem 1rem;color:var(--text);text-decoration:none;border-top:1px solid var(--line);transition:background .15s}
.set-go:first-child{border-top:0}
.set-go:hover{background:var(--surface-2)}.set-go:active{background:var(--surface-3)}
.set-go:focus-visible{outline:3px solid var(--primary);outline-offset:-3px}
.set-ic{flex:none;display:grid;place-items:center;width:36px;height:36px;border-radius:12px;background:var(--surface-2);color:var(--heading)}
.set-ic .i{width:20px;height:20px}
.set-go-l{flex:1 1 auto;min-width:0;font-weight:600;overflow-wrap:anywhere}
.set-go-v{flex:0 1 auto;max-width:45%;color:var(--muted);font-size:.9rem;text-align:end;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.set-chev{flex:none;color:var(--muted);font-size:1.4rem;line-height:1}
[dir=rtl] .set-chev{transform:scaleX(-1)}[dir=rtl] .set-back a>span{transform:scaleX(-1)}
.set-wrap.idx>.set-sec{display:none}
.set-wrap.one>.set-sec:not([data-on]){display:none}
.set-wrap.one>.set-sec>.set-h{display:none}
/* vùng chạm ≥44 px cho mọi nút/tab trong trang con (qa-bot tap) */
.set-wrap[data-open] .btn.sm,.set-wrap[data-open] .set-c .tabs button{min-height:44px;min-width:44px}
@media (prefers-reduced-motion:reduce){.set-go{transition:none}}`; document.head.appendChild(st); } } catch (e) { /* bỏ qua */ }
  const { $, $$, esc, toast, download, speak } = UI;
  const App = window.App;
  const { state, view, routes, load, updateChrome, saveSettings } = App;
  const { applyTheme, importData, ankiAll, extCta } = App.settingsDeps;
  const R = window.Remind; // ⏰ js/remind.js (gói 'remind' nạp cùng trang Cài đặt – docs/REMINDERS.md)
  const adminTiles = () => [['overview', '📊', t('Tổng quan'), t('Người dùng, truy cập, việc cần xử lý')], ['analytics', '📈', t('Phân tích'), t('Nguồn truy cập, quốc gia, thiết bị, tốc độ')], ['users', '👥', t('Người dùng'), t('Danh sách, tìm kiếm, chi tiết')], ['inbox', '✉️', t('Hộp thư'), t('Tin nhắn liên hệ & trả lời')], ['alerts', '🚨', t('Cảnh báo'), t('Workflow, lỗi JavaScript, dung lượng')], ['quality', '🩺', t('Chất lượng'), t('Rà soát hằng ngày & bản dịch')], ['services', '🔑', t('Dịch vụ & API'), t('Tài khoản, khóa, hạn mức miễn phí')], ['settings', '⚙️', t('Cài đặt hệ thống'), t('Thông báo, hạn mức AI, Gemini API')]]
    .map(([id, ic, l, d]) => `<a class="adm-tile" href="${App.adminUrl(id)}" target="_blank" rel="noopener"><span class="adm-ic" aria-hidden="true">${ic}</span><span class="adm-tx"><b>${l}</b><small>${d}</small></span></a>`).join('');
  // Bộ từ mẫu ngôn ngữ đích (content/target/<tl>/seed.json → bản sao web/js/target-<tl>-seed.json, scripts/target/build.mjs) → thẻ tl, khóa '<tl>:từ' (Core.tlKey)
  // chuỗi thông báo theo ngôn ngữ đích – để chữ nguyên văn trong t() cho bộ quét i18n (thêm ngôn ngữ = thêm một dòng)
  const TL_TOAST = { pt: n => t('Đã thêm {n} từ tiếng Bồ Đào Nha vào Sổ từ', { n }), es: n => t('Đã thêm {n} từ tiếng Tây Ban Nha vào Sổ từ', { n }) };
  async function addTlSeed(tl) {
    const r = await fetch('js/target-' + tl + '-seed.json'); if (!r.ok) throw new Error('seed ' + r.status);
    const j = await r.json(); let n = 0;
    await Core.Cards.mutate(m => {
      for (const w of j.words || []) {
        const k = Core.tlKey(w.word, tl); if (m[k]) continue;
        m[k] = Core.Cards.make({ word: w.word, pos: w.pos, ipa: w.ipa, def: w.gl.en, vi: w.gl.vi, ex: w.ex[tl], topic: tl + '-core', emoji: w.emoji || '📘', tl }, { gl: w.gl, exEn: w.ex.en, ...(w.gender ? { gender: w.gender } : {}), ...(w.img ? { img: w.img } : {}) });
        n++;
      }
      return m;
    });
    if (window.Sync && Sync.schedule) Sync.schedule();
    return n;
  }
  routes.settings = function () {
    const s = state.settings;
    // 🗂 Trang con (docs/specs/me-settings-ux.md): #/settings = mục lục nhóm; #/settings/<mục> = chỉ một nhóm, nút Quay lại về mục lục.
    // Mọi điều khiển vẫn dựng đủ trong DOM (chỉ ẩn bằng CSS) → mọi id/handler/liên kết cũ giữ nguyên; ?delete=account mở trang Tài khoản.
    const H = App.parseHash ? App.parseHash() : { name: 'settings', arg: '', query: new URLSearchParams() };
    const SUB = ['account', 'admin', 'look', 'study', 'sound', 'remind', 'ai', 'ext', 'data', 'help'];
    const open = H.name === 'settings' && SUB.includes(H.arg) ? H.arg : (H.query && H.query.get('delete') === 'account' ? 'account' : '');
    const perm = 'Notification' in window ? Notification.permission : 'unsupported';
    const nc = x => x.replace(/[:：]\s*$/, ''); // nhãn đứng riêng – bỏ dấu hai chấm ở cuối
    // nhãn NHÌN THẤY gắn ô đầu tiên (<label for>) – aria-label chỉ cho trình đọc màn hình, người nhìn cần nhãn bấm được (qa-bot nolabel 06/11)
    let fN = 0;
    const row = (label, ctl, hint = '') => { let fid = '';
      ctl = ctl.replace(/<(select|input)(?![^>]*aria-label)(?![^>]*type="file")/g, `<$1 aria-label="${esc(String(label).replace(/<[^>]+>/g, ''))}"`);
      ctl = ctl.replace(/<(select|input)\b([^>]*)>/, (m, tag, at) => /type="file"/.test(at) ? m : (fid = (at.match(/\bid="([^"]+)"/) || [])[1] || 'setf' + (++fN), at.includes(`id="${fid}"`) ? m : `<${tag} id="${fid}"${at}>`));
      return `<div class="set-row"><div class="set-l">${fid ? `<label for="${fid}">${label}</label>` : `<span>${label}</span>`}${hint ? `<small>${hint}</small>` : ''}</div><div class="set-c">${ctl}</div></div>`; };
    // 🌍 Ngôn ngữ đang học (ngôn ngữ đích – web/js/target.js, docs/specs/target-language.md): chỉ hiện khi cờ một ngôn ngữ đích bật (Target.avail: pt_pilot/lk.pt, es_course/lk.es)
    const TL = window.Target && Target.enabled() ? Target.cur() : '';
    const tlRow = () => (TL ? row(t('Ngôn ngữ đang học'), seg('sTl', Target.avail().map(k => [k, k === 'en' ? 'English' : Target.table(k).label, ` translate="no" lang="${k}"`]), TL)
      + (TL !== 'en' ? ` <button type="button" class="btn sm" id="sTlSeed">${t('Thêm 30 từ cơ bản')}</button>` : '')) : '');
    const OFFP = !!(window.LKAudio && LKAudio.offline.supported() && LKAudio.offline.flag()); // 📥 gói nghe offline (cờ offline_pack)
    const tog = (id, on, label, hint = '') => `<label class="set-row switch"><span class="set-l"><span>${label}</span>${hint ? `<small>${hint}</small>` : ''}</span><input type="checkbox" id="${id}" ${on ? 'checked' : ''}></label>`;
    const slide = (label, vid, val, input, hint = '') => `<label class="set-row col"><span class="set-top"><span>${label}</span><b id="${vid}">${val}</b></span>${input}${hint ? `<small>${hint}</small>` : ''}</label>`;
    const seg = (id, items, cur) => `<div class="tabs seg" id="${id}">${items.map(([v, l, attr]) => `<button type="button" data-v="${v}" class="${cur === v ? 'on' : ''}"${attr || ''}>${l}</button>`).join('')}</div>`;
    const xt = /(^|\.)lexkite\.(com|pages\.dev)$/.test(location.hostname) ? '' : ' target="_blank" rel="noopener"'; // app/add-on: mở trình duyệt ngoài
    const sec = (id, title, body) => `<section class="set-sec" id="set-${id}"><h3 class="set-h">${title}</h3><div class="set-list">${body}</div></section>`;
    const u = state.user, LN = I18N.LANGS && I18N.LANGS[I18N.lang()] ? I18N.LANGS[I18N.lang()][1] : I18N.lang();
    const TH = { auto: t('Tự động'), light: t('Sáng'), dark: t('Tối') };
    const SUBT = { account: t('Tài khoản'), admin: t('Quản trị hệ thống'), look: t('Giao diện'), study: t('Mục tiêu học'), sound: t('Âm thanh & phát âm'), remind: t('Nhắc học hằng ngày'), ai: 'AI', ext: t('Add-on từ điển cho Chrome'), data: t('Dữ liệu'), help: t('Pháp lý & hỗ trợ') };
    const go = (id, ic, label, val = '') => `<a class="set-go" href="#/settings/${id}" data-go="${id}"><span class="set-ic" aria-hidden="true">${ic}</span><span class="set-go-l">${label}</span>${val ? `<span class="set-go-v" title="${esc(val)}">${esc(val)}</span>` : ''}<span class="set-chev" aria-hidden="true">›</span></a>`;
    const grp = rows => `<div class="set-grp">${rows.join('')}</div>`;
    const idx = `<div class="set-idx" id="setIdx">
      ${grp([go('account', UI.icon('cloud'), t('Tài khoản'), u ? (u.displayName || u.email || '') : t('Đăng nhập'))])}
      <div id="setIdxAdm"></div>
      ${grp([go('look', UI.icon('palette'), t('Giao diện'), LN + ' · ' + (TH[s.theme] || TH.auto)),
        go('study', UI.icon('target'), t('Mục tiêu học'), t('{n} từ mới/ngày', { n: s.dailyNew })),
        go('sound', UI.icon('volume-2'), t('Âm thanh'), (s.accent === 'en-US' ? 'US' : 'UK') + ' · ' + (s.ttsRate || 0.92).toFixed(2) + '×'),
        go('remind', UI.icon('alarm-clock'), t('Nhắc học'), s.reminderOn ? (s.reminderAuto !== false ? t('Tự động') : s.reminderTime) : t('Tắt'))])}
      ${grp([go('ai', UI.icon('bot'), 'AI'), ...(Store.isExtension ? [] : [go('ext', UI.icon('puzzle'), t('Add-on từ điển cho Chrome'))]), go('data', UI.icon('database'), t('Dữ liệu'))])}
      ${grp([go('help', UI.icon('info'), t('Pháp lý & hỗ trợ'))])}
    </div>`;
    const back = open ? ['#/settings', t('Cài đặt')] : ['#/me', t('Tôi')];
    view.innerHTML = `
      <div class="set-wrap ${open ? 'one' : 'idx'}" data-open="${open}">
      <div class="page-head set-head"><nav class="crumb set-back" aria-label="${t('Đường dẫn')}"><a href="${back[0]}" data-back=""><span aria-hidden="true">‹</span> ${back[1]}</a></nav><div><h1>${open ? SUBT[open] : t('Cài đặt')}</h1></div></div>
      ${open ? '' : idx}
      <section class="set-sec" id="set-account"><div class="card stack" id="syncBox"></div><div id="leagueSetBox" style="margin-top:.75rem"></div></section>
      <section class="set-sec" id="set-admin" hidden><h3 class="set-h">${UI.icon('shield')}${t('Quản trị hệ thống')}<span class="chip ok" style="margin-left:.5rem;font-size:.7rem">${t('Chỉ quản trị viên')}</span></h3><div class="adm-tiles">${adminTiles()}</div></section>
      ${sec('look', UI.icon('palette') + t('Giao diện'),
        row(t('Ngôn ngữ giao diện'), App.langPicker())
        + row(t('Nghĩa từ hiển thị bằng'), seg('sMean', [['vi', 'Tiếng Việt', ' translate="no" lang="vi" data-keep-vi'], ['en', t('Định nghĩa tiếng Anh')]], I18N.meanLang()))
        + row(t('Chế độ màu'), seg('sTheme', [['auto', t('Tự động')], ['light', t('Sáng')], ['dark', t('Tối')]], s.theme)))}
      ${sec('study', UI.icon('target') + t('Mục tiêu học'),
        tlRow()
        + slide(nc(t('Từ mới mỗi ngày:')), 'vNew', s.dailyNew, `<input type="range" min="0" max="50" id="sNew" value="${s.dailyNew}">`)
        + slide(nc(t('Mục tiêu lượt ôn mỗi ngày:')), 'vGoal', s.dailyGoal, `<input type="range" min="5" max="200" step="5" id="sGoal" value="${s.dailyGoal}">`)
        + slide(nc(t('Tối đa thẻ mỗi phiên ôn:')), 'vCap', s.sessionCap || t('Không giới hạn'), `<input type="range" min="0" max="200" step="10" id="sCap" value="${s.sessionCap}">`)
        + slide(nc(t('Mục tiêu ghi nhớ (thuật toán FSRS):')), 'vRet', Math.round((s.retention || 0.9) * 100) + '%', `<input type="range" min="0.8" max="0.95" step="0.01" id="sRet" value="${s.retention || 0.9}">`, t('Khả năng còn nhớ mỗi từ khi đến lượt ôn. 90% là cân bằng tốt nhất; 95% nhớ chắc hơn nhưng số lượt ôn gần gấp đôi; 85% ít ôn hơn, hợp khi bận.')))}
      ${sec('sound', UI.icon('volume-2') + t('Âm thanh & phát âm'),
        row(t('Giọng phát âm'), `<select class="input" id="sAccent"><option value="en-GB" ${s.accent === 'en-GB' ? 'selected' : ''}>🇬🇧 ${t('Anh – Anh (khuyên dùng cho IELTS)')}</option><option value="en-US" ${s.accent === 'en-US' ? 'selected' : ''}>🇺🇸 ${t('Anh – Mỹ')}</option></select>`)
        + row(t('Giọng đọc'), `<select class="input" id="sVoice"></select>`)
        + '<div id="voiceTip" class="tip small set-tip" hidden></div>'
        + slide(nc(t('Tốc độ đọc:')), 'vRate', (s.ttsRate || 0.92).toFixed(2) + '×', `<input type="range" min="0.6" max="1.2" step="0.02" id="sRate" value="${s.ttsRate || 0.92}">`)
        + row(`<button type="button" class="btn sm" id="sTry">${t('Nghe thử câu mẫu')}</button>`, '', t('Từ đơn ưu tiên bản ghi giọng người thật'))
        + tog('sAuto', s.autoSpeak, t('Tự phát âm khi hiện thẻ'))
        + tog('sWhisper', s.whisperMode, t('Chế độ thì thầm khi luyện nói'))
        + tog('sHq', s.hqVoice !== false, t('Giọng đọc tự nhiên cho bài nghe & giám khảo (tải âm thanh từ mạng)'))
        + (OFFP ? tog('sOff', LKAudio.offline.on(), t('Nghe offline: tải sẵn khoảng {n} từ thông dụng và bài đang học', { n: LKAudio.offline.N.toLocaleString(I18N.lang ? I18N.lang() : undefined) }), t('Khoảng {mb} MB, tối đa {max} MB. Tắt để xóa khỏi máy.', { mb: LKAudio.offline.EST_MB, max: LKAudio.offline.MAX_MB })) + '<div id="offStat" class="tip small set-tip" aria-live="polite" hidden></div>' : '')
        + (Store.isExtension ? '' : '<div id="klBox"></div>') // 🎧 Kokoro trên máy: bật/tắt, MB, Xóa, dữ liệu di động – vẽ trong js/klocal.js (KLocal.settings)
        + tog('sSfx', s.sfx, t('Hiệu ứng âm thanh'))
        + tog('sHap', !!(window.Sfx && Sfx.haptics && Sfx.haptics()), t('Rung khi trả lời và hoàn thành bài'))
        + tog('sFeel', !!(window.Sfx && Sfx.feel && Sfx.feel()), t('Âm thanh & hiệu ứng kiểu trò chơi')))}
      ${sec('remind', UI.icon('alarm-clock') + t('Nhắc học hằng ngày'),
        tog('sRem', s.reminderOn, t('Bật nhắc học'))
        + `<div id="remOpts" ${s.reminderOn ? '' : 'hidden'}>`
        + row(t('Giờ nhắc'), `<input type="time" class="input" id="sTime" value="${esc(s.reminderTime)}">`, Store.isExtension ? t('Add-on gửi thông báo vào giờ này mỗi ngày (kể cả khi chưa mở trang) và hiện số thẻ cần ôn trên biểu tượng.') : t('Trình duyệt chỉ nhắc được khi trang đang mở. Để nhắc chắc chắn, thêm lịch nhắc vào điện thoại hoặc dùng add-on Chrome.'))
        + tog('sRemAuto', s.reminderAuto !== false, t('Tự động theo giờ bạn hay học'), t('Nhắc 30 phút trước giờ bạn hay học nhất (sau vài ngày học).') + (R && R.habitMin && R.habitMin(R.recent()) >= 0 ? ' ' + t('Kit thấy bạn hay học lúc khoảng {time}.', { time: R.hm(R.habitMin(R.recent())) }) : ''))
        + row(t('Giờ yên lặng từ'), `<span class="set-btns"><input type="time" class="input" id="sQ1" value="${esc(s.quietStart)}"><span class="muted">${t('đến')}</span><input type="time" class="input" id="sQ2" value="${esc(s.quietEnd)}"></span>`, t('Không nhắc trong khung giờ này. Tối đa 1 lời nhắc mỗi ngày.'))
        + `<fieldset class="set-row col" style="border:0;margin:0;padding:0"><legend class="set-l"><span>${t('Loại lời nhắc')}</span></legend>${[['due', t('Thẻ đến hạn')], ['word', t('Từ trong sổ của bạn')], ['streak', t('Chuỗi ngày sắp mất')], ['conf', t('Bài tự tin')], ['week', t('Tiến bộ tuần')], ['goal', t('Mục tiêu hôm nay')], ['path', t('Bài đang học')]].map(([k, l]) => tog('sTy_' + k, ((s.remTypes || {})[k]) !== false, l)).join('')}</fieldset>`
        + '<div id="remPush"></div>'
        + `<div class="set-row"><div class="set-btns">${Store.isExtension ? '' : `<button type="button" class="btn sm" id="sPerm" ${perm === 'granted' || perm === 'unsupported' ? 'disabled' : ''}>${perm === 'granted' ? '✓ ' + t('Đã cho phép thông báo') : perm === 'unsupported' ? t('Không hỗ trợ thông báo') : '🔔 ' + t('Cho phép thông báo')}</button><button type="button" class="btn sm" id="sIcs">📅 ${t('Thêm vào Lịch (.ics)')}</button>`}<button type="button" class="btn sm ghost" id="sTest">${t('Thử gửi thông báo')}</button></div></div></div>`
        + tog('sGold', s.goldenOn, t('Nhắc “thời điểm vàng”'), t('Báo khi có từ sắp bị quên'))
        + `<div id="goldOpts" ${s.goldenOn ? '' : 'hidden'}>`
        + `<label class="set-row col"><span class="set-top"><span>${t('Chỉ nhắc khi có ít nhất <b id="vGMin">{n}</b> từ cần ôn', { n: s.goldenMin })}</span></span><input type="range" min="1" max="50" id="sGMin" value="${s.goldenMin}"></label>`
        + '</div>'
        + tog('sDigest', s.emailDigest === true, t('Báo cáo não bộ qua email'), t('Gửi tóm tắt trí nhớ FSRS và các từ sắp quên vào sáng Chủ nhật (khi đã đăng nhập)'))
        + (window.VBNative && VBNative.is ? '<div id="wwBox"></div>' : ''))}
      <section class="set-sec" id="set-ai"><div id="aiBox"></div></section>
      ${Store.isExtension ? '' : sec('ext', UI.icon('puzzle') + t('Add-on từ điển cho Chrome'), `<div class="set-row"><div class="set-l"><span class="small">${t('Bấm đúp vào bất kỳ từ tiếng Anh nào trên web để xem phiên âm, nghĩa, hình ảnh và <b>lưu vào flashcard kèm câu gốc làm ngữ cảnh</b>. Bôi đen cả câu/đoạn để <b>dịch sang tiếng Việt</b>.')}</span></div><a class="btn sm primary" data-ext-cta="set" hidden>${t('Thêm vào Chrome')}</a></div>`)}
      ${sec('data', UI.icon('database') + t('Dữ liệu'),
        row(t('Chuyển dữ liệu'), `<a class="btn sm" href="#/handoff">${t('📲 Chuyển sang điện thoại (không cần đăng nhập)')}</a>`)
        + row(t('Xuất sao lưu'), `<button type="button" class="btn sm" id="sExport">📦 Excel · PDF · JSON</button>`)
        + row('Anki', `<span class="set-btns"><button type="button" class="btn sm" id="sAnkiOut">${t('Xuất sang Anki')}</button><button type="button" class="btn sm" id="sAnkiIn">${t('Nhập từ Anki')}</button></span>`)
        + row(t('Nhập sao lưu'), `<label class="btn sm">⬆️ ${t('Nhập sao lưu')}<input type="file" id="sImport" accept="application/json" hidden></label>`)
        + row(`<span class="danger-t">${t('Xóa toàn bộ dữ liệu học')}</span>`, `<button type="button" class="btn sm danger" id="sReset">${t('Xóa')}</button>`)
        + (window.Ads && Ads.on() ? row(t('Quyền riêng tư & quảng cáo'), `<button type="button" class="btn sm" id="sAdPriv">${t('Đổi lựa chọn đồng ý')}</button>`, t('Quảng cáo cá nhân hóa, cookie quảng cáo và quyền “không bán/chia sẻ dữ liệu” – đổi hoặc rút lại bất cứ lúc nào.')) : '') // GDPR/CCPA: rút lại đồng ý dễ như khi đồng ý (docs/ADS.md §3)
      )}
      ${sec('help', UI.icon('info') + t('Pháp lý & hỗ trợ'), row(t('Pháp lý & hỗ trợ'), `<span class="set-btns"><a class="btn sm" href="${App.legalUrl('privacy')}">${t('Chính sách quyền riêng tư')}</a><a class="btn sm" href="${App.legalUrl('terms')}">${t('Điều khoản sử dụng')}</a><a class="btn sm" href="#/contact">${t('Liên hệ')}</a><a class="btn sm" id="sBlog" href="${App.blogHref(0)}"${xt}>${UI.icon('newspaper')} ${t('Blog')}</a><a class="btn sm" href="${App.aboutUrl()}"${xt}>${t('Trang giới thiệu')}</a></span>`))}
      </div>`;
    if (open) { const os = $('#set-' + open); if (os) { os.setAttribute('data-on', ''); } }
    extCta();
    const ap = $('#sAdPriv'); if (ap) ap.onclick = () => (window.AdsRun && AdsRun.privacy ? AdsRun.privacy() : Promise.resolve(false)).then(ok => { if (!ok) toast(t('Phần quảng cáo chưa tải xong – thử lại sau vài giây.')); });
    App.blogLive().then(on => { const a = $('#sBlog'); if (a) a.href = App.blogHref(on); });
    // Mục quản trị: chỉ hiện sau khi máy chủ xác nhận quyền (thêm nút nhảy nhanh vào thanh mục lục)
    App.isAdmin().then(ok => { const sec = $('#set-admin'); if (!ok || !sec) return; sec.hidden = false; const ia = $('#setIdxAdm'); if (ia && !ia.firstChild) ia.innerHTML = grp([go('admin', UI.icon('shield'), t('Quản trị hệ thống'), t('Chỉ quản trị viên'))]); });

    const save = async o => { await saveSettings(o); Core.sfxOff = !s.sfx; updateChrome(); if (window.Sync) Sync.schedule(); };
    $('#sRemAuto').onchange = e => { s.reminderAuto = e.target.checked; if (s.reminderAuto && R) { const st = R.hm(R.pickTime(state.stats, s)); s.reminderTime = st; $('#sTime').value = st; } save(); };
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
    $('#sRem').onchange = e => { s.reminderOn = e.target.checked; $('#remOpts').hidden = !s.reminderOn; save({ ask: s.reminderOn }); };
    $('#sTime').onchange = e => { s.reminderTime = e.target.value || '20:00'; s.reminderAuto = false; const a = $('#sRemAuto'); if (a) a.checked = false; save(); toast(t('Sẽ nhắc lúc {time} mỗi ngày', { time: s.reminderTime })); };
    $('#sNew').oninput = e => { s.dailyNew = +e.target.value; $('#vNew').textContent = s.dailyNew; save(); };
    $('#sGoal').oninput = e => { s.dailyGoal = +e.target.value; $('#vGoal').textContent = s.dailyGoal; save(); };
    const drawAI = async () => { const b = $('#aiBox'); if (!b || !window.AI) return; b.innerHTML = await AI.settingsHtml(); AI.bindSettings(drawAI); };
    drawAI();
    if ($('#klBox')) App.need('klocal').then(() => window.KLocal && KLocal.settings && KLocal.settings($('#klBox'))).catch(() => {});
    if ($('#wwBox')) App.need('wfeed').then(() => window.WidgetFeed && WidgetFeed.settings($('#wwBox'), state, save)).catch(() => {}); // 📱 widget "Từ mỗi giờ" (app gốc)
    $('#sRet').oninput = e => { s.retention = +e.target.value; SRS.retentionTarget = s.retention; $('#vRet').textContent = Math.round(s.retention * 100) + '%'; save(); };
    $('#sGold').onchange = e => { s.goldenOn = e.target.checked; $('#goldOpts').hidden = !s.goldenOn; save(); };
    $('#sGMin').oninput = e => { s.goldenMin = +e.target.value; $('#vGMin').textContent = s.goldenMin; save(); };
    $('#sQ1').onchange = e => { s.quietStart = e.target.value || '22:00'; save(); };
    $('#sQ2').onchange = e => { s.quietEnd = e.target.value || '08:00'; save(); };
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
    $$('#sTl [data-v]').forEach(b => b.onclick = () => { if (b.dataset.v !== Target.cur()) { Target.set(b.dataset.v); routes.settings(); } });
    const tlSeed = $('#sTlSeed'); if (tlSeed) tlSeed.onclick = async () => {
      tlSeed.disabled = true;
      try { const tl = Target.cur(), n = await addTlSeed(tl); toast(TL_TOAST[tl](n)); Target.set(tl); } catch (e) { toast(t('Không tải được bộ từ, thử lại sau'), { action: t('Thử lại'), onAction: () => tlSeed.onclick() }); } finally { tlSeed.disabled = false; }
    };
    $('#sRate').oninput = e => { s.ttsRate = +e.target.value; $('#vRate').textContent = s.ttsRate.toFixed(2) + '×'; save(); };
    $('#sTry').onclick = () => UI.tts('Many people believe that renewable energy is the key to a sustainable future. However, the transition will not happen overnight.', s.accent);
    $('#sAccent').onchange = e => { s.accent = e.target.value; s.accentPicked = true; save(); fillVoices(); if (OFFP && LKAudio.offline.on()) LKAudio.offline.enable(s.accent); /* gói offline theo giọng mới */ speak('pronunciation', s.accent); };
    $('#sAuto').onchange = e => { s.autoSpeak = e.target.checked; save(); };
    $('#sWhisper').onchange = e => { s.whisperMode = e.target.checked; save(); if (s.whisperMode) toast(t('Hãy đeo tai nghe và nói thì thầm vào micro – không làm phiền người xung quanh.'), 4500); };
    $('#sHq').onchange = e => { s.hqVoice = e.target.checked; save(); };
    if (OFFP) { // 📥 gói nghe offline (web/js/audio.js + web/sw.js): mặc định tắt; bật → service worker tải dần, hiện tiến độ + dung lượng
      const st = $('#offStat'); let tm = 0;
      const show = x => { if (!st.isConnected) return clearInterval(tm); if (!x || x.off) { st.hidden = true; return; } st.hidden = false; const mb = (x.bytes / 1048576).toFixed(1);
        st.textContent = x.full ? t('Đã đạt giới hạn {max} MB', { max: x.maxMb }) : t('Đã tải {done}/{total} · {mb} MB', { done: Math.min(x.done, x.total), total: x.total, mb }); if (x.complete || x.full) clearInterval(tm); };
      const poll = () => { clearInterval(tm); tm = setInterval(() => LKAudio.offline.status().then(show), 2000); LKAudio.offline.status().then(show); };
      if (LKAudio.offline.on()) poll();
      $('#sOff').onchange = e => { if (e.target.checked) LKAudio.offline.enable(s.accent).then(poll); else { clearInterval(tm); LKAudio.offline.disable().then(() => show(null)); } };
      App.onCleanup && App.onCleanup(() => clearInterval(tm));
    }
    if ($('#sFeel')) $('#sFeel').onchange = e => { if (window.Sfx && Sfx.feel) Sfx.feel(e.target.checked); }; // 🎮 docs/GAME-FEEL.md – lưu vb.feel, bật/tắt ngay
    if ($('#sHap')) $('#sHap').onchange = e => { if (window.Sfx && Sfx.haptics) Sfx.haptics(e.target.checked); }; // vb.haptics – tôn trọng tắt âm + giảm chuyển động
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
        <div><b>${UI.icon('trophy')} ${t('Giải đấu tuần')}</b><div class="muted small">${t('Bạn đang tham gia bảng xếp hạng 30 người')}</div></div>
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
