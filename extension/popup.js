(async () => {
  // Ngôn ngữ giao diện: chỉ en / vi như web app, ngôn ngữ khác → English (nội dung học – nghĩa từ – giữ nguyên)
  const XLANGS = ['vi', 'en', 'es', 'pt', 'fr', 'de', 'id', 'th', 'zh', 'ja', 'ko', 'hi', 'ar', 'ru', 'tr'];
  const pickLang = l => { l = String(l || '').toLowerCase().split('-')[0]; return XLANGS.includes(l) ? l : null; };
  let UI_LANG = pickLang(chrome.i18n && chrome.i18n.getUILanguage ? chrome.i18n.getUILanguage() : navigator.language) || 'en', XD = {};
  try { const { uiLang } = await chrome.storage.local.get('uiLang'); if (pickLang(uiLang)) UI_LANG = pickLang(uiLang); localStorage.setItem('vb.uiLang', UI_LANG); } catch (e) { /* bỏ qua */ }
  if (UI_LANG !== 'vi' && UI_LANG !== 'en') try { XD = ((await Promise.race([chrome.runtime.sendMessage({ type: 'uiDict', lang: UI_LANG }), new Promise(r => setTimeout(r, 2500))])) || {}).dict || {}; } catch (e) { /* bỏ qua */ } // trang ứng dụng trong add-on dùng cùng ngôn ngữ
  const EN = {
    'thẻ cần học hôm nay': 'cards due today', 'Ôn ngay →': 'Review now →', 'Mục tiêu': 'Goal', 'Xong {n} thẻ – tuyệt!': 'Done {n} cards – great!', '⚡ Ôn nhanh {i}/{n}': '⚡ Quick review {i}/{n}', 'Chạm để lật': 'Tap to flip', 'Quên': 'Forgot', 'Nhớ': 'Got it', 'Thẻ từ vựng ở tab mới': 'Vocabulary card on new tab', 'Gạch chân từ học thuật B2–C2': 'Underline B2–C2 academic words', 'Mới lưu': 'Just saved', 'Đã thuộc': 'Learned', 'Sắp đến hạn ôn': 'Due for review soon', 'Nghe': 'Listen', 'Tra nhanh một từ…': 'Quick word lookup…',
    '⚙️ Cài đặt tra từ': '⚙️ Lookup settings', 'Khi bôi đen chữ': 'When text is selected', 'Hiện nút 🌐 để dịch': 'Show 🌐 button to translate',
    'Tự dịch ngay': 'Translate instantly', 'Tắt': 'Off', 'Bấm đúp để tra từ': 'Double-click to look up words',
    'Đánh dấu từ đã học trên trang': 'Highlight learned words on pages', 'Mở ứng dụng ↗': 'Open app ↗',
    '💡 Bấm đúp vào từ để tra · bôi đen câu để dịch · trên YouTube: bật phụ đề rồi <b>chạm vào từ</b> trong phụ đề': '💡 Double-click a word to look it up · select a sentence to translate · on YouTube: turn on captions, then <b>tap a word</b> in the captions',
    '🔁 {n} ôn lại': '🔁 {n} to review', '✨ {n} từ mới': '✨ {n} new words', 'Thêm từ mới →': 'Add new words →', '🕘 Vừa lưu gần đây': '🕘 Recently saved',
    'vừa xong': 'just now', '{n} phút trước': '{n} min ago', '{n} giờ trước': '{n} h ago', '{n} ngày trước': '{n} days ago',
    '☁️ Đồng bộ với <b>{email}</b> · {ago}': '☁️ Synced with <b>{email}</b> · {ago}', 'Đồng bộ ngay': 'Sync now',
    '⚠️ Chưa đồng bộ tài khoản – dữ liệu chỉ ở máy này': '⚠️ Account not synced – data is only on this device', '☁️ Đồng bộ với Google': '☁️ Sync with Google',
    '⏳ Đang đồng bộ…': '⏳ Syncing…', '✓ Đã đồng bộ': '✓ Synced', 'Thử lại': 'Retry', '⏳ Đang tra…': '⏳ Looking up…',
    '✓ Đã có': '✓ Saved', '+ Lưu flashcard': '+ Save flashcard', 'Chi tiết': 'Details', '✓ Đã lưu': '✓ Saved',
    '✍️ Soát lỗi viết': '✍️ Writing check', 'Gạch chân lỗi tiếng Anh khi bạn gõ trên mọi trang · bấm để sửa và xem vì sao sai': 'Underlines English mistakes as you type on any site · tap to fix and see why',
    'Kiểm nâng cao (LanguageTool)': 'Advanced check (LanguageTool)', 'Bật trên {site}': 'On for {site}', 'Trang này không hỗ trợ soát lỗi viết': 'Writing check is not available on this page',
    'Mặc định chữ chỉ được soát ngay trên máy. Kiểm nâng cao gửi chữ trong ô bạn đang gõ tới LanguageTool. Không bao giờ soát ô mật khẩu, email, thẻ thanh toán và trang ngân hàng.': 'By default your text is checked on your device only. Advanced check sends the text of the box you are typing in to LanguageTool. Password, email and payment card fields and banking sites are never checked.',
    'Mở trên điện thoại (mã QR)': 'Open on phone (QR code)', 'Báo cáo sự cố': 'Report a problem', 'Không tìm thấy “{q}”.': 'No results for “{q}”.', ' Dịch: <b>{vi}</b>': ' Translation: <b>{vi}</b>', 'Chính sách quyền riêng tư': 'Privacy policy', 'Quét bằng camera điện thoại để học:': 'Scan with your phone camera to study:',
  };
  const tx = (src, vars) => { let s = UI_LANG === 'vi' ? src : (XD[src] || EN[src] || src); if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? vars[k] : m)); return s; };
  document.documentElement.lang = UI_LANG; document.documentElement.dir = UI_LANG === 'ar' ? 'rtl' : 'ltr';
  document.querySelectorAll('[data-tx]').forEach(el => { el.textContent = tx(el.textContent.trim()); });
  document.querySelectorAll('[data-tx-html]').forEach(el => { el.innerHTML = tx(el.innerHTML.trim()); });
  document.querySelectorAll('[data-tx-ph]').forEach(el => { el.placeholder = tx(el.placeholder); });
  const { Store, Cards, Stats, DEFAULT_SETTINGS, todayKey } = Core;
  chrome.runtime.sendMessage({ type: 'usage', ev: 'popup' }).catch(() => {}); // thống kê ẩn danh: chỉ đếm số lần mở
  const $ = s => document.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // Mở ứng dụng: dùng lại tab Lexkite đang mở trong cửa sổ này (không mở thêm tab), chờ Chrome mở xong rồi mới đóng popup
  // Mỗi bước có giới hạn thời gian & đường lui: tab app trong cửa sổ hiện tại → tab mới → nhờ service worker → window.open.
  // (Trước đây tab app ở cửa sổ khác/không gian khác được "kích hoạt" ngầm nên người dùng tưởng nút không phản ứng.)
  const within = (p, ms = 4000) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);
  const open = async hash => {
    const url = chrome.runtime.getURL('app/index.html') + hash;
    let ok = false;
    try {
      const [tab] = await within(chrome.tabs.query({ currentWindow: true, url: chrome.runtime.getURL('app/index.html') + '*' })).catch(() => []);
      if (tab) ok = !!(await within(chrome.tabs.update(tab.id, { url, active: true })));
      else ok = !!(await within(chrome.tabs.create({ url, active: true })));
    } catch (e) { /* thử cách khác */ }
    if (!ok) try { ok = !!(await within(chrome.tabs.create({ url, active: true }))); } catch (e) { /* thử cách khác */ }
    if (!ok) try { ok = !!(await within(chrome.runtime.sendMessage({ type: 'openApp', hash }), 3000)); } catch (e) { /* thử cách khác */ }
    if (!ok) window.open(url, '_blank');
    window.close();
  };

  const settings = { ...DEFAULT_SETTINGS, ...(await Store.get('settings', {})) };
  const [cards, stats] = await Promise.all([Cards.all(), Stats.get()]);
  const { total } = Cards.dueCount(cards, settings, stats);
  const done = stats.days[todayKey()] || 0;
  $('#due').textContent = total;
  $('#streak').textContent = `🔥 ${Stats.streak(stats)}`;
  $('#goalTxt').textContent = `${done}/${settings.dailyGoal}`;
  $('#goalBar').style.width = Math.min(100, done / settings.dailyGoal * 100) + '%';
  $('#review').onclick = () => open(total ? '#/review' : '#/library');
  // Chi tiết thẻ cần học: ôn lại / từ mới (như Anki) – biết rõ hôm nay cần làm gì
  const { due, newCount } = Cards.dueCount(cards, settings, stats);
  $('#dueChips').innerHTML = `<span class="pp-chip">${tx('🔁 {n} ôn lại', { n: due })}</span><span class="pp-chip">${tx('✨ {n} từ mới', { n: newCount })}</span>`;
  if (!total) $('#review').textContent = tx('Thêm từ mới →');
  // ⚡ Ôn nhanh 3 thẻ đến hạn ngay trong popup: chạm để lật → Quên / Nhớ (cập nhật lịch FSRS)
  const dueList = Object.values(cards).filter(c => c.srs && (c.srs.reps > 0 || c.srs.last) && c.srs.due <= Date.now()).sort((a, b) => a.srs.due - b.srs.due).slice(0, 3);
  if (dueList.length) {
    let qi = 0;
    const qmean = c => (UI_LANG === 'vi' ? c.vi || c.def : c.def || '') || '';
    const draw = () => {
      const c = dueList[qi];
      if (!c) { $('#quick').innerHTML = `<div class="pp-quick done">✓ ${tx('Xong {n} thẻ – tuyệt!', { n: dueList.length })}</div>`; return; }
      $('#quick').innerHTML = `<div class="pp-sec">${tx('⚡ Ôn nhanh {i}/{n}', { i: qi + 1, n: dueList.length })}</div>
        <div class="pp-quick" id="qCard" role="button" tabindex="0"><b>${esc(c.word)}</b><span class="muted small">${esc(c.ipa || '')}</span><div class="q-back" hidden>${esc(qmean(c))}</div><div class="muted small q-hint">${tx('Chạm để lật')}</div></div>
        <div class="pp-qbtn" hidden><button class="btn sm" data-q="0">${tx('Quên')}</button><button class="btn sm primary" data-q="2">${tx('Nhớ')}</button></div>`;
      const flip = () => { $('#qCard .q-back').hidden = false; $('#qCard .q-hint').hidden = true; document.querySelector('.pp-qbtn').hidden = false; speak(c.word, settings.accent === 'en-US' ? c.audioUS : c.audio); };
      $('#qCard').onclick = flip; $('#qCard').onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flip(); } };
      document.querySelectorAll('[data-q]').forEach(b => b.onclick = async () => { await Cards.patch(c.word, card => { card.srs = Core.SRS.review(card.srs, +b.dataset.q); }); await Stats.logReview(false); try { chrome.runtime.sendMessage({ type: 'triggerSync' }).catch(() => {}); } catch (e) {} qi++; draw(); });
    };
    draw();
  }
  // Từ vừa lưu gần đây: nhìn lại nhanh, bấm để xem chi tiết
  const recent = Object.values(cards).filter(c => c.added).sort((a, b) => b.added - a.added).slice(0, 5);
  if (recent.length) {
    // Chấm độ nhớ (FSRS): xanh = đã thuộc (khả năng nhớ ≥ 90%), vàng = sắp/đã đến hạn ôn, xám = mới lưu chưa ôn
    const dot = c => { const st = c.srs || {}; if (!st.reps && !st.last) return ['new', tx('Mới lưu')]; const r = Core.SRS.retention ? Core.SRS.retention(st) : 0; return r >= 0.9 && st.due > Date.now() + 864e5 ? ['ok', tx('Đã thuộc')] : ['due', tx('Sắp đến hạn ôn')]; };
    const mean = c => (UI_LANG === 'vi' ? String(c.vi || '') : String(c.def || '')).split(/[,;]/)[0];
    $('#recent').innerHTML = `<div class="pp-sec">${tx('🕘 Vừa lưu gần đây')}</div>${recent.map(c => { const [d, dl] = dot(c); return `<div class="pp-word" data-w="${esc(c.word)}"><span class="pp-dot ${d}" title="${esc(dl)}" aria-label="${esc(dl)}"></span><button type="button" class="pp-say" data-say="${esc(c.word)}" aria-label="${esc(tx('Nghe'))}: ${esc(c.word)}">🔊</button><a href="#" class="pp-w"><b>${esc(c.word)}</b></a><span>${esc(mean(c))}</span></div>`; }).join('')}`;
    document.querySelectorAll('.pp-word .pp-w').forEach(a => a.onclick = e => { e.preventDefault(); open('#/dict/' + encodeURIComponent(a.closest('.pp-word').dataset.w)); });
    document.querySelectorAll('.pp-say').forEach(b => b.onclick = e => { e.preventDefault(); const c = recent.find(x => x.word === b.dataset.say); speak(b.dataset.say, c && (settings.accent === 'en-US' ? c.audioUS : c.audio)); });
  }
  $('#open').onclick = e => { e.preventDefault(); open('#/home'); };
  // Báo lỗi: mở form trong trang ứng dụng; chỉ gửi kèm TÊN MIỀN của tab đang xem (không URL đầy đủ, không nội dung trang) – docs/REPORTS.md
  $('#report').onclick = async e => { e.preventDefault(); let dom = ''; try { const [tab] = await chrome.tabs.query({ active: true, currentWindow: true }); const u = new URL(tab && tab.url || ''); if (/^https?:$/.test(u.protocol)) dom = u.hostname; } catch (x) { /* trang nội bộ Chrome → không có tên miền */ } open('#/report/new' + (dom ? '?d=' + encodeURIComponent(dom) : '')); };
  if ($('#privacy')) $('#privacy').href = 'https://lexkite.com/' + UI_LANG + '/privacy';
  const qrBtn = $('#showQr'); if (qrBtn) qrBtn.onclick = e => { e.preventDefault(); const box = $('#qrBox'); if (!box) return; box.hidden = !box.hidden; if (!box.hidden && !$('#qrSvg').hasChildNodes() && window.LKQR) $('#qrSvg').innerHTML = window.LKQR.svg('https://lexkite.com'); };
  // Trạng thái đồng bộ tài khoản (liên kết qua web app lexkite.com)
  const { linked } = await chrome.storage.local.get('linked');
  const ago = t => { const m = Math.round((Date.now() - t) / 60000); return m < 1 ? tx('vừa xong') : m < 60 ? tx('{n} phút trước', { n: m }) : m < 1440 ? tx('{n} giờ trước', { n: Math.round(m / 60) }) : tx('{n} ngày trước', { n: Math.round(m / 1440) }); };
  $('#syncRow').innerHTML = linked && linked.email
    ? `<span>${tx('☁️ Đồng bộ với <b>{email}</b> · {ago}', { email: esc(linked.email), ago: ago(linked.at) })}</span><a href="#" id="syncNow">${tx('Đồng bộ ngay')}</a>`
    : `<span>${tx('⚠️ Chưa đồng bộ tài khoản – dữ liệu chỉ ở máy này')}</span><a href="#" id="syncNow" class="strong">${tx('☁️ Đồng bộ với Google')}</a>`;
  $('#syncNow').onclick = async e => {
    e.preventDefault();
    if (!linked || !linked.email) { chrome.tabs.create({ url: 'https://lexkite.com/app/#/settings' }); return window.close(); }
    // Đã liên kết: mở Lexkite ở tab nền để gộp dữ liệu với tài khoản, xong tự đóng – không làm phiền
    const a = $('#syncNow'); a.textContent = tx('⏳ Đang đồng bộ…'); a.style.pointerEvents = 'none';
    const r = await chrome.runtime.sendMessage({ type: 'syncNow' }).catch(() => null);
    a.textContent = r && r.ok ? tx('✓ Đã đồng bộ') : tx('Thử lại'); a.style.pointerEvents = '';
    if (r && r.ok) setTimeout(() => location.reload(), 800);
  };

  $('#dbl').checked = settings.dblclickOn !== false;
  $('#selMode').value = settings.selectMode || 'icon';
  $('#selMode').onchange = async e => { settings.selectMode = e.target.value; await Store.set('settings', settings); };
  $('#markK').checked = settings.markKnown !== false;
  $('#markK').onchange = async e => { settings.markKnown = e.target.checked; await Store.set('settings', settings); };
  $('#dbl').onchange = async e => { settings.dblclickOn = e.target.checked; await Store.set('settings', settings); };
  if ($('#acOn')) { $('#acOn').checked = settings.markAcademic !== false; $('#acOn').onchange = async e => { settings.markAcademic = e.target.checked; await Store.set('settings', settings); }; }
  if ($('#ntOn')) { $('#ntOn').checked = settings.newtabOn !== false; $('#ntOn').onchange = async e => { settings.newtabOn = e.target.checked; await Store.set('settings', settings); }; }

  // ✍️ Soát lỗi viết: bật chung (mặc định tắt) · bật/tắt riêng trang đang mở · kiểm nâng cao bằng LanguageTool
  {
    const more = () => { $('#wcMore').hidden = !settings.wcOn; };
    $('#wcOn').checked = settings.wcOn === true; $('#wcAdv').checked = settings.wcAdv === true; more();
    $('#wcOn').onchange = async e => { settings.wcOn = e.target.checked; await Store.set('settings', settings); more(); };
    $('#wcAdv').onchange = async e => { settings.wcAdv = e.target.checked; await Store.set('settings', settings); };
    let site = '';
    try { const [tab] = await chrome.tabs.query({ active: true, currentWindow: true }); const u = new URL(tab && tab.url || ''); if (/^https?:$/.test(u.protocol)) site = u.hostname.replace(/^www\./, ''); } catch (e) { /* trang nội bộ của Chrome */ }
    const { wcOffSites = [] } = await chrome.storage.local.get('wcOffSites');
    if (site) {
      $('#wcSiteTxt').textContent = tx('Bật trên {site}', { site }); $('#wcSite').checked = !wcOffSites.includes(site);
      $('#wcSite').onchange = async e => { const { wcOffSites: cur = [] } = await chrome.storage.local.get('wcOffSites'); const next = e.target.checked ? cur.filter(h => h !== site) : [...new Set([...cur, site])]; await chrome.storage.local.set({ wcOffSites: next.slice(-500) }); };
    } else { $('#wcSiteTxt').textContent = tx('Trang này không hỗ trợ soát lỗi viết'); $('#wcSite').disabled = true; }
  }

  // Cùng cách chọn giọng với bảng tra trên trang (content.js): giọng tự nhiên tốt nhất, không dùng bản ghi âm chất lượng không đều
  const bestVoice = acc => {
    const want = settings.voice && settings.voice[acc], vs = speechSynthesis.getVoices(), w = want && vs.find(x => x.name === want); if (w) return w;
    const sc = v => !v.lang.startsWith('en') ? -1 : (v.lang.replace('_', '-') === acc ? 100 : 10) + (/Natural|Neural|Online/i.test(v.name) ? 60 : 0) + (/^Google (UK|US) English/i.test(v.name) ? 50 : 0) + (/Premium|Enhanced|Siri/i.test(v.name) ? 45 : 0) + (/Daniel|Serena|Kate|Oliver|Samantha|Ava|Allison|Susan|Tom/i.test(v.name) ? 20 : 0);
    return speechSynthesis.getVoices().map(v => [v, sc(v)]).filter(x => x[1] > 0).sort((a, b) => b[1] - a[1]).map(x => x[0])[0] || null;
  };
  const speak = (w, url) => {
    if (url && !window.speechSynthesis) return new Audio(url).play().catch(() => {});
    const go = () => { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(w); u.lang = settings.accent || 'en-GB'; u.rate = settings.ttsRate || .92; const v = bestVoice(u.lang); if (v) u.voice = v; speechSynthesis.speak(u); };
    if (speechSynthesis.getVoices().length) go(); else { let d = false; const f = () => { if (!d) { d = true; go(); } }; speechSynthesis.addEventListener('voiceschanged', f, { once: true }); setTimeout(f, 600); }
  };

  $('#f').onsubmit = async ev => {
    ev.preventDefault();
    const q = $('#q').value.trim();
    if (!q) return;
    $('#res').innerHTML = `<div class="card muted small">${tx('⏳ Đang tra…')}</div>`;
    const e = await Dict.lookup(q);
    if (!e || !e.found) { $('#res').innerHTML = `<div class="card muted small">${tx('Không tìm thấy “{q}”.', { q: esc(q) })}${e && e.vi ? tx(' Dịch: <b>{vi}</b>', { vi: esc(e.vi) }) : ''}</div>`; return; }
    const saved = !!(await Cards.all())[e.word];
    $('#res').innerHTML = `<div class="card"><div class="row" style="align-items:flex-start;flex-wrap:nowrap">
      <div class="pic">${e.image ? `<img src="${esc(e.image)}" alt="">` : esc(e.emoji || '📘')}</div>
      <div><div class="row"><span class="entry-word">${esc(e.word)}</span>${e.pos ? `<span class="chip pos">${esc(e.pos)}</span>` : ''}${e.level ? `<span class="chip lv">${esc(e.level)}</span>` : ''}</div>
        <div class="row"><span class="ipa">${esc(e.ipa)}</span><button class="icon-btn" id="spk">🔊</button></div>
        <div class="vi">${esc(e.vi)}</div>
        <div class="small">${esc(e.def)}</div></div></div>
      <div class="row" style="margin-top:10px"><button class="btn sm primary" id="save" ${saved ? 'disabled' : ''}>${saved ? tx('✓ Đã có') : tx('+ Lưu flashcard')}</button><button class="btn sm" id="more">${tx('Chi tiết')}</button></div></div>`;
    $('#spk').onclick = () => speak(e.word, settings.accent === 'en-US' ? e.audioUS : e.audio);
    $('#more').onclick = () => open('#/dict/' + encodeURIComponent(e.word));
    $('#save').onclick = async () => { await Cards.add(e); $('#save').textContent = tx('✓ Đã lưu'); $('#save').disabled = true; try { chrome.runtime.sendMessage({ type: 'triggerSync' }).catch(() => {}); } catch (e) {} };
  };
})();
