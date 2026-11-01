/* 🔎 Thẻ tra từ/cụm từ dùng chung (clip video/audio + Truyện/Podcast): nghĩa theo ngôn ngữ mẹ đẻ + câu ngữ cảnh + nút lưu vào SRS (App.addWord).
 * Cụm từ có sẵn trong clip (phrases[key] = { def, tr }) → hiện ngay, không gọi mạng; từ đơn → Dict.quick (nhanh) rồi App.meanOf.
 * LookupCard.open(anchorEl, { text, info?, sentence, sentenceTr, title, lang, onSaved?(text), onKnown?(text) → thêm nút "Đã biết" }) → Promise<void> · LookupCard.close() */
(function (g) {
  const D = g.document;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const tt = (k, v) => (typeof g.t === 'function' ? g.t(k, v) : k);
  let box = null, run = 0, back = null;

  function close() { run++; if (box) { box.remove(); box = null; } D.removeEventListener('keydown', onKey, true); D.removeEventListener('pointerdown', onOut, true); if (back && back.focus) try { back.focus(); } catch (e) { /* bỏ qua */ } back = null; }
  const onKey = e => { if (e.key === 'Escape') { e.preventDefault(); close(); } };
  const onOut = e => { if (box && !box.contains(e.target)) close(); };

  function place(anchor) {
    const r = anchor.getBoundingClientRect(), vw = g.innerWidth || 360, vh = g.innerHeight || 640, w = Math.min(340, vw - 24);
    box.style.width = w + 'px'; box.style.left = Math.max(12, Math.min(vw - w - 12, r.left + r.width / 2 - w / 2)) + 'px';
    const below = r.bottom + 8, h = box.offsetHeight || 180;
    box.style.top = (below + h > vh - 12 && r.top - h - 8 > 12 ? r.top - h - 8 : Math.min(below, vh - h - 12)) + 'px';
  }

  async function open(anchor, o) {
    close(); const my = ++run, lang = o.lang || (g.I18N && g.I18N.lang && g.I18N.lang()) || 'en', text = String(o.text || '').trim();
    if (!text) return;
    back = anchor; box = D.createElement('div'); box.className = 'lkc'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', text);
    box.innerHTML = `<div class="lkc-h"><b lang="en">${esc(text)}</b><button type="button" class="lkc-say" aria-label="${esc(tt('Nghe'))}">🔊</button><button type="button" class="lkc-x" aria-label="${esc(tt('Đóng'))}">✕</button></div><div class="lkc-m"><span class="lkc-sk"></span></div>`;
    D.body.appendChild(box); place(anchor);
    D.addEventListener('keydown', onKey, true); setTimeout(() => { if (my === run) D.addEventListener('pointerdown', onOut, true); }, 0);
    box.querySelector('.lkc-x').onclick = close;
    box.querySelector('.lkc-say').onclick = () => { if (g.UI && g.UI.speak) g.UI.speak(text, 'en-US'); };
    let entry = null, mean = '', def = '';
    if (o.info) { // cụm từ của clip: nghĩa đã dịch sẵn qua pipeline (content/media/clips)
      def = o.info.def || ''; mean = (lang !== 'en' && o.info.tr && o.info.tr[lang]) || '';
      entry = { word: text, pos: 'phrase', def, vi: (o.info.tr && o.info.tr.vi) || '', ex: o.sentence || '' };
    } else if (g.Dict && g.Dict.quick) {
      try { entry = await g.Dict.quick(text); } catch (e) { entry = null; }
      if (my !== run) return;
      if (entry && entry.found !== false) { def = entry.def || ''; mean = g.App && g.App.meanOf ? g.App.meanOf(entry) : (entry.vi || ''); } else entry = null;
    }
    if (my !== run || !box) return;
    const m = box.querySelector('.lkc-m');
    if (!entry) { m.innerHTML = `<p class="lkc-miss">${esc(tt('Chưa có nghĩa cho “{w}”.', { w: text }))}</p>`; place(anchor); return; }
    const saved = g.App && g.App.inDeck && g.App.inDeck(text);
    m.innerHTML = (mean && mean !== def ? `<p class="lkc-mean"${lang === 'ar' ? ' dir="rtl"' : ''}>${esc(mean)}</p>` : '') + (def ? `<p class="lkc-def" lang="en">${esc(def)}</p>` : '') +
      (o.sentence ? `<p class="lkc-ex" lang="en">${esc(o.sentence)}</p>` : '') +
      (o.onKnown ? `<button type="button" class="lkc-known">${esc(tt('Đã biết'))}</button>` : '') +
      `<button type="button" class="lkc-save"${saved ? ' disabled' : ''}>${esc(saved ? tt('Đã có trong bộ thẻ') : tt('Lưu vào ôn tập'))}</button>`;
    place(anchor);
    const kn = m.querySelector('.lkc-known'); if (kn) kn.onclick = () => { o.onKnown(text); close(); }; // Truyện: Đã biết → Stories.mark (không lưu SRS)
    const btn = m.querySelector('.lkc-save');
    btn.onclick = async () => {
      if (!g.App || !g.App.addWord) return; btn.disabled = true;
      try { await g.App.addWord(entry, { text: o.sentence || '', vi: o.sentenceTr || '', title: o.title || '' }, { silent: true }); btn.textContent = tt('Đã lưu ✓'); if (o.onSaved) o.onSaved(text); }
      catch (e) { btn.disabled = false; btn.textContent = tt('Lưu vào ôn tập'); }
    };
  }
  g.LookupCard = { open, close };
})(typeof self !== 'undefined' ? self : globalThis);
