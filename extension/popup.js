(async () => {
  // Ngôn ngữ giao diện: chỉ en / vi như web app, ngôn ngữ khác → English (nội dung học – nghĩa từ – giữ nguyên)
  const XLANGS = ['vi', 'en', 'es', 'pt', 'fr', 'de', 'id', 'th', 'zh', 'ja', 'ko', 'hi', 'ar', 'ru', 'tr'];
  const pickLang = l => { l = String(l || '').toLowerCase().split('-')[0]; return XLANGS.includes(l) ? l : null; };
  let UI_LANG = pickLang(chrome.i18n && chrome.i18n.getUILanguage ? chrome.i18n.getUILanguage() : navigator.language) || 'en', XD = {};
  try { const { uiLang } = await chrome.storage.local.get('uiLang'); if (pickLang(uiLang)) UI_LANG = pickLang(uiLang); localStorage.setItem('vb.uiLang', UI_LANG); } catch (e) { /* bỏ qua */ }
  if (UI_LANG !== 'vi' && UI_LANG !== 'en') try { XD = ((await chrome.runtime.sendMessage({ type: 'uiDict', lang: UI_LANG })) || {}).dict || {}; } catch (e) { /* bỏ qua */ } // trang ứng dụng trong add-on dùng cùng ngôn ngữ
  const EN = {
    'thẻ cần học hôm nay': 'cards due today', 'Ôn ngay →': 'Review now →', 'Mục tiêu': 'Goal', 'Tra nhanh một từ…': 'Quick word lookup…',
    '⚙️ Cài đặt tra từ': '⚙️ Lookup settings', 'Khi bôi đen chữ': 'When text is selected', 'Hiện nút 🌐 để dịch': 'Show 🌐 button to translate',
    'Tự dịch ngay': 'Translate instantly', 'Tắt': 'Off', 'Bấm đúp để tra từ': 'Double-click to look up words',
    'Đánh dấu từ đã học trên trang': 'Highlight learned words on pages', 'Mở ứng dụng ↗': 'Open app ↗',
    '💡 Bấm đúp vào từ để tra · bôi đen câu để dịch · trên YouTube: bật phụ đề rồi <b>chạm vào từ</b> trong phụ đề': '💡 Double-click a word to look it up · select a sentence to translate · on YouTube: turn on captions, then <b>tap a word</b> in the captions',
    '🔁 {n} ôn lại': '🔁 {n} to review', '✨ {n} từ mới': '✨ {n} new words', 'Thêm từ mới →': 'Add new words →', '🕘 Vừa lưu gần đây': '🕘 Recently saved',
    'vừa xong': 'just now', '{n} phút trước': '{n} min ago', '{n} giờ trước': '{n} h ago', '{n} ngày trước': '{n} days ago',
    '☁️ Đồng bộ với <b>{email}</b> · {ago}': '☁️ Synced with <b>{email}</b> · {ago}', 'Đồng bộ ngay': 'Sync now',
    '⚠️ Chưa đồng bộ tài khoản – dữ liệu chỉ ở máy này': '⚠️ Account not synced – data is only on this device', '☁️ Đồng bộ với Google': '☁️ Sync with Google',
    '⏳ Đang đồng bộ…': '⏳ Syncing…', '✓ Đã đồng bộ': '✓ Synced', 'Thử lại': 'Retry', '⏳ Đang tra…': '⏳ Looking up…',
    'Không tìm thấy “{q}”.': 'No results for “{q}”.', ' Dịch: <b>{vi}</b>': ' Translation: <b>{vi}</b>',
    '✓ Đã có': '✓ Saved', '+ Lưu flashcard': '+ Save flashcard', 'Chi tiết': 'Details', '✓ Đã lưu': '✓ Saved',
  };
  const tx = (src, vars) => { let s = UI_LANG === 'vi' ? src : (XD[src] || EN[src] || src); if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? vars[k] : m)); return s; };
  document.documentElement.lang = UI_LANG; document.documentElement.dir = UI_LANG === 'ar' ? 'rtl' : 'ltr';
  document.querySelectorAll('[data-tx]').forEach(el => { el.textContent = tx(el.textContent.trim()); });
  document.querySelectorAll('[data-tx-html]').forEach(el => { el.innerHTML = tx(el.innerHTML.trim()); });
  document.querySelectorAll('[data-tx-ph]').forEach(el => { el.placeholder = tx(el.placeholder); });
  const { Store, Cards, Stats, DEFAULT_SETTINGS, todayKey } = Core;
  const $ = s => document.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // Mở ứng dụng: dùng lại tab Lexkite đang mở (không mở thêm tab), chờ Chrome mở xong rồi mới đóng popup
  const open = async hash => {
    const base = chrome.runtime.getURL('app/index.html');
    try {
      const [tab] = await chrome.tabs.query({ url: base + '*' });
      if (tab) { await chrome.tabs.update(tab.id, { url: base + hash, active: true }); await chrome.windows.update(tab.windowId, { focused: true }); }
      else await chrome.tabs.create({ url: base + hash });
    } catch (e) { await chrome.tabs.create({ url: base + hash }).catch(() => {}); }
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
  // Từ vừa lưu gần đây: nhìn lại nhanh, bấm để xem chi tiết
  const recent = Object.values(cards).filter(c => c.added).sort((a, b) => b.added - a.added).slice(0, 5);
  if (recent.length) {
    $('#recent').innerHTML = `<div class="pp-sec">${tx('🕘 Vừa lưu gần đây')}</div>${recent.map(c => `<a href="#" class="pp-word" data-w="${esc(c.word)}"><b>${esc(c.word)}</b><span>${esc(String(c.vi || '').split(/[,;]/)[0])}</span></a>`).join('')}`;
    document.querySelectorAll('.pp-word').forEach(a => a.onclick = e => { e.preventDefault(); open('#/dict/' + encodeURIComponent(a.dataset.w)); });
  }
  $('#open').onclick = e => { e.preventDefault(); open('#/home'); };
  // Trạng thái đồng bộ tài khoản (liên kết qua web app lexkite.com)
  const { linked } = await chrome.storage.local.get('linked');
  const ago = t => { const m = Math.round((Date.now() - t) / 60000); return m < 1 ? tx('vừa xong') : m < 60 ? tx('{n} phút trước', { n: m }) : m < 1440 ? tx('{n} giờ trước', { n: Math.round(m / 60) }) : tx('{n} ngày trước', { n: Math.round(m / 1440) }); };
  $('#syncRow').innerHTML = linked && linked.email
    ? `<span>${tx('☁️ Đồng bộ với <b>{email}</b> · {ago}', { email: esc(linked.email), ago: ago(linked.at) })}</span><a href="#" id="syncNow">${tx('Đồng bộ ngay')}</a>`
    : `<span>${tx('⚠️ Chưa đồng bộ tài khoản – dữ liệu chỉ ở máy này')}</span><a href="#" id="syncNow" class="strong">${tx('☁️ Đồng bộ với Google')}</a>`;
  $('#syncNow').onclick = async e => {
    e.preventDefault();
    if (!linked || !linked.email) { chrome.tabs.create({ url: 'https://lexkite.com/#/settings' }); return window.close(); }
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

  const speak = (w, url) => {
    if (url) return new Audio(url).play().catch(() => {});
    const u = new SpeechSynthesisUtterance(w); u.lang = settings.accent; speechSynthesis.speak(u);
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
    $('#save').onclick = async () => { await Cards.add(e); $('#save').textContent = tx('✓ Đã lưu'); $('#save').disabled = true; };
  };
})();
