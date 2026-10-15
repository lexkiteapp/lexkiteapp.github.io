/* Tab mới Lexkite: 1 thẻ từ ưu tiên "thời điểm vàng" (đến hạn ôn FSRS) → Đã nhớ / Cần ôn lại, kèm ô tìm kiếm (công cụ mặc định của người dùng).
 * Tắt được (công tắc trong popup hoặc nút dưới trang) → tab mới về trang mặc định của Chrome. Không tải ảnh ngoài: nền gradient theo giờ. */
(async () => {
  const { Store, Cards, SRS, DEFAULT_SETTINGS } = Core;
  const settings = { ...DEFAULT_SETTINGS, ...(await Store.get('settings', {})) };
  if (settings.newtabOn === false) { try { const tab = await chrome.tabs.getCurrent(); chrome.tabs.update(tab.id, { url: 'chrome://new-tab-page/' }); } catch (e) { location.replace('https://www.google.com/'); } return; }
  const XL = ['vi', 'en', 'es', 'pt', 'fr', 'de', 'id', 'th', 'zh', 'ja', 'ko', 'hi', 'ar', 'ru', 'tr'], pick = l => { l = String(l || '').toLowerCase().split('-')[0]; return XL.includes(l) ? l : null; };
  let L = pick(chrome.i18n.getUILanguage()) || 'en'; try { const { uiLang } = await chrome.storage.local.get('uiLang'); if (pick(uiLang)) L = pick(uiLang); } catch (e) { /* bỏ qua */ }
  let XD = {}; if (L !== 'vi' && L !== 'en') try { XD = ((await chrome.runtime.sendMessage({ type: 'uiDict', lang: L })) || {}).dict || {}; } catch (e) { /* bỏ qua */ }
  const EN = { '✓ Đã nhớ': '✓ Got it', '🔁 Cần ôn lại': '🔁 Review again', 'Thời điểm vàng': 'Golden moment', 'Từ mới lưu': 'Recently saved', 'Từ hôm nay': 'Word of the moment', 'Tìm trên web…': 'Search the web…', 'Mở Lexkite': 'Open Lexkite', 'Tắt thẻ ở tab mới': 'Turn off new-tab card', 'Nghe': 'Listen' };
  const tx = s => (L === 'vi' ? s : XD[s] || EN[s] || s);
  if (L === 'ar') document.documentElement.dir = 'rtl';
  document.documentElement.lang = L;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = s => document.querySelector(s);
  // Nền theo giờ: sáng – chiều – tối
  const h = new Date().getHours(), P = h < 11 ? ['#0F3D3E', '#1F7A72', '#F2A65A'] : h < 17 ? ['#164e63', '#1F7A72', '#E5502F'] : ['#0b1e2a', '#173d4a', '#8b3a2a'];
  ['--a', '--b', '--c'].forEach((k, i) => document.body.style.setProperty(k, P[i]));
  $('#ntQ').placeholder = tx('Tìm trên web…'); $('#ntOpen').textContent = tx('Mở Lexkite'); $('#ntOpen').href = chrome.runtime.getURL('app/index.html');
  $('#ntOff').textContent = tx('Tắt thẻ ở tab mới');
  $('#ntGood').textContent = tx('✓ Đã nhớ'); $('#ntAgain').textContent = tx('🔁 Cần ôn lại');
  $('#ntSearch').onsubmit = e => { e.preventDefault(); const q = $('#ntQ').value.trim(); if (!q) return; if (chrome.search && chrome.search.query) chrome.search.query({ text: q, disposition: 'CURRENT_TAB' }); else location.href = 'https://www.google.com/search?q=' + encodeURIComponent(q); };
  $('#ntOff').onclick = async () => { settings.newtabOn = false; await Store.set('settings', settings); try { const tab = await chrome.tabs.getCurrent(); chrome.tabs.update(tab.id, { url: 'chrome://new-tab-page/' }); } catch (e) { location.replace('https://www.google.com/'); } };
  // Chọn thẻ: đến hạn (thời điểm vàng) → mới lưu → từ trong kho
  const cards = await Cards.all(), now = Date.now(), list = Object.values(cards);
  const due = list.filter(c => c.srs && (c.srs.reps > 0 || c.srs.last) && c.srs.due <= now).sort((a, b) => a.srs.due - b.srs.due);
  let tag, c;
  if (due.length) { tag = '⏰ ' + tx('Thời điểm vàng') + ` · ${due.length}`; c = due[0]; }
  else if (list.length) { tag = '📌 ' + tx('Từ mới lưu'); c = list.sort((a, b) => (b.added || 0) - (a.added || 0))[Math.floor(Math.random() * Math.min(10, list.length))]; }
  else { const T = (self.IELTS_DATA || { TOPICS: [] }).TOPICS, ws = T.flatMap(x => x.words); tag = '✨ ' + tx('Từ hôm nay'); c = ws[Math.floor(Math.random() * ws.length)]; }
  $('#ntTag').textContent = tag;
  if (!c) return;
  const mean = L === 'vi' ? c.vi || c.def : c.def || '';
  const ex = (c.contexts && c.contexts[0] && c.contexts[0].text) || c.ex || '';
  $('#ntCard').innerHTML = `<div class="nt-word">${esc(c.word)}</div><div class="nt-ipa"><span>${esc(c.ipa || '')}</span><button class="nt-say" id="ntSay" aria-label="${esc(tx('Nghe'))}">🔊</button></div>${mean ? `<div class="nt-mean">${esc(mean)}</div>` : ''}${ex ? `<div class="nt-ex">“${esc(String(ex).slice(0, 180))}”</div>` : ''}`;
  const say = () => { if (!('speechSynthesis' in self)) return; const u = new SpeechSynthesisUtterance(c.word); u.lang = settings.accent || 'en-GB'; const v = speechSynthesis.getVoices().filter(x => x.lang.replace('_', '-') === u.lang).sort((a, b) => (/Natural|Online|Google/.test(b.name) ? 1 : 0) - (/Natural|Online|Google/.test(a.name) ? 1 : 0))[0]; if (v) u.voice = v; speechSynthesis.cancel(); speechSynthesis.speak(u); };
  $('#ntSay').onclick = say;
  if (cards[Core.keyOf(c.word)]) {
    $('#ntBtns').hidden = false;
    const grade = async g => { await Cards.patch(c.word, card => { card.srs = SRS.review(card.srs, g); }); location.reload(); };
    $('#ntGood').onclick = () => grade(2); $('#ntAgain').onclick = () => grade(0);
  }
})();
