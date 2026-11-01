/* 🔎 Thẻ tra từ/cụm từ dùng chung (clip video/audio + Truyện/Podcast): nghĩa theo ngôn ngữ mẹ đẻ + câu ngữ cảnh + nút lưu vào SRS (App.addWord).
 * Cụm từ có sẵn trong clip (phrases[key] = { def, tr }) → hiện ngay, không gọi mạng; từ đơn → Dict.quick (nhanh) rồi App.meanOf.
 * LookupCard.open(anchorEl, { text, info?, sentence, sentenceTr, title, lang, onSaved?(text), onKnown?(text) → thêm nút "Đã biết", sheet? }) → Promise<void> · LookupCard.close()
 * Có khung Stitch v2 'watch-lookup' (gói #/watch, brand/stitch/v2/bind/watch-lookup.json) → bottom sheet theo mẫu (Lưu vào ôn tập cam + Đã biết viền, ✕, Esc, chạm lớp mờ = đóng);
 * không có khung (Truyện/Podcast chưa nạp) hoặc sheet:false → thẻ nổi M1 cạnh chữ được chạm. @icons volume_up */
(function (g) {
  const D = g.document;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const tt = (k, v) => (typeof g.t === 'function' ? g.t(k, v) : k);
  let box = null, run = 0, back = null;

  function close() { run++; if (box) { box.remove(); box = null; } D.removeEventListener('keydown', onKey, true); D.removeEventListener('pointerdown', onOut, true); if (back && back.focus) try { back.focus(); } catch (e) { /* bỏ qua */ } back = null; }
  const onKey = e => { if (e.key === 'Escape') { e.preventDefault(); close(); } };
  const onOut = e => { if (box && !box.contains(e.target)) close(); };

  const exHtml = (sen, text) => { if (!sen) return ''; const i = sen.toLowerCase().indexOf(text.toLowerCase());
    return '“' + (i < 0 ? esc(sen) : esc(sen.slice(0, i)) + `<strong class="underline decoration-wavy">${esc(sen.slice(i, i + text.length))}</strong>` + esc(sen.slice(i + text.length))) + '”'; };
  // Bottom sheet Stitch: vẽ lại cả tấm theo d (đang tải → có nghĩa / chưa có nghĩa), nút Nghe chèn cùng khuôn nút Đóng
  function sheet(d, h) {
    const f = g.ST2['watch-lookup'](d), first = !box.firstChild;
    box.innerHTML = `<div class="st v2 v2-watch-lookup">${f.veil || ''}${f.main}</div>`;
    const $ = s => box.querySelector(s), x = $('#lkX'), veil = box.firstChild.firstElementChild;
    x.onclick = close; if (veil && veil.tagName === 'DIV') { veil.classList.remove('pointer-events-none'); veil.onclick = close; }
    const say = D.createElement('button'); say.type = 'button'; say.className = x.className; say.setAttribute('aria-label', tt('Nghe'));
    say.innerHTML = `<span class="${esc(x.firstElementChild ? x.firstElementChild.className : '')}" aria-hidden="true">volume_up</span>`; say.onclick = h.say; $('#lkHead').appendChild(say);
    const sv = $('#lkSave'); if (sv) { sv.disabled = !!d.saved; sv.onclick = h.save; }
    const kn = $('#lkKnown'); if (kn) kn.onclick = h.known;
    if (first) try { x.focus({ preventScroll: true }); } catch (e) { /* bỏ qua */ }
  }

  function place(anchor) {
    const r = anchor.getBoundingClientRect(), vw = g.innerWidth || 360, vh = g.innerHeight || 640, w = Math.min(340, vw - 24);
    box.style.width = w + 'px'; box.style.left = Math.max(12, Math.min(vw - w - 12, r.left + r.width / 2 - w / 2)) + 'px';
    const below = r.bottom + 8, h = box.offsetHeight || 180;
    box.style.top = (below + h > vh - 12 && r.top - h - 8 > 12 ? r.top - h - 8 : Math.min(below, vh - h - 12)) + 'px';
  }

  async function open(anchor, o) {
    close(); const my = ++run, lang = o.lang || (g.I18N && g.I18N.lang && g.I18N.lang()) || 'en', text = String(o.text || '').trim();
    if (!text) return;
    back = anchor; box = D.createElement('div');
    const st2 = o.sheet !== false && !!(g.ST2 && g.ST2['watch-lookup']), sayIt = () => { if (g.UI && g.UI.speak) g.UI.speak(text, 'en-US'); };
    let entry = null, mean = '', def = '', sd = null;
    const save = async btn => {
      if (!g.App || !g.App.addWord || !entry) return; btn.disabled = true;
      try { await g.App.addWord(entry, { text: o.sentence || '', vi: o.sentenceTr || '', title: o.title || '' }, { silent: true }); if (st2) { if (box) sheet(Object.assign(sd, { saved: true, saveLbl: tt('Đã lưu ✓') }), H); } else btn.textContent = tt('Đã lưu ✓'); if (o.onSaved) o.onSaved(text); }
      catch (e) { btn.disabled = false; if (!st2) btn.textContent = tt('Lưu vào ôn tập'); }
    };
    const H = { say: sayIt, save: e => save(e.currentTarget), known: () => { if (o.onKnown) o.onKnown(text); close(); } };
    if (st2) {
      box.className = 'v2s-watch-lookup lkc-st';
      sd = { text, kind: o.info || /\s/.test(text) ? tt('Cụm từ') : tt('Từ đơn'), mean: '', def: tt('Đang tải…'), exHtml: exHtml(o.sentence, text), saveLbl: tt('Lưu vào ôn tập'), acts: false, known: !!o.onKnown, saved: false, dir: lang === 'ar' ? 'rtl' : 'auto' };
      D.body.appendChild(box); sheet(sd, H);
    } else {
      box.className = 'lkc'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', text);
      box.innerHTML = `<div class="lkc-h"><b lang="en">${esc(text)}</b><button type="button" class="lkc-say" aria-label="${esc(tt('Nghe'))}">🔊</button><button type="button" class="lkc-x" aria-label="${esc(tt('Đóng'))}">✕</button></div><div class="lkc-m"><span class="lkc-sk"></span></div>`;
      D.body.appendChild(box); place(anchor);
      box.querySelector('.lkc-x').onclick = close;
      box.querySelector('.lkc-say').onclick = sayIt;
    }
    D.addEventListener('keydown', onKey, true); setTimeout(() => { if (my === run) D.addEventListener('pointerdown', onOut, true); }, 0);
    if (o.info) { // cụm từ của clip: nghĩa đã dịch sẵn qua pipeline (content/media/clips)
      def = o.info.def || ''; mean = (lang !== 'en' && o.info.tr && o.info.tr[lang]) || '';
      entry = { word: text, pos: 'phrase', def, vi: (o.info.tr && o.info.tr.vi) || '', ex: o.sentence || '' };
    } else if (g.Dict && g.Dict.quick) {
      try { entry = await g.Dict.quick(text); } catch (e) { entry = null; }
      if (my !== run) return;
      if (entry && entry.found !== false) { def = entry.def || ''; mean = g.App && g.App.meanOf ? g.App.meanOf(entry) : (entry.vi || ''); } else entry = null;
    }
    if (my !== run || !box) return;
    if (st2) { // nghĩa theo ngôn ngữ mẹ đẻ (nếu khác def) · def tiếng Anh · chưa có nghĩa → chỉ báo, không nút lưu
      const saved = !!entry && !!(g.App && g.App.inDeck && g.App.inDeck(text));
      return sheet(Object.assign(sd, entry ? { mean: mean && mean !== def ? mean : '', def, acts: true, saved, saveLbl: saved ? tt('Đã có trong bộ thẻ') : tt('Lưu vào ôn tập') } : { mean: tt('Chưa có nghĩa cho “{w}”.', { w: text }), def: '' }), H);
    }
    const m = box.querySelector('.lkc-m');
    if (!entry) { m.innerHTML = `<p class="lkc-miss">${esc(tt('Chưa có nghĩa cho “{w}”.', { w: text }))}</p>`; place(anchor); return; }
    const saved = g.App && g.App.inDeck && g.App.inDeck(text);
    m.innerHTML = (mean && mean !== def ? `<p class="lkc-mean"${lang === 'ar' ? ' dir="rtl"' : ''}>${esc(mean)}</p>` : '') + (def ? `<p class="lkc-def" lang="en">${esc(def)}</p>` : '') +
      (o.sentence ? `<p class="lkc-ex" lang="en">${esc(o.sentence)}</p>` : '') +
      (o.onKnown ? `<button type="button" class="lkc-known">${esc(tt('Đã biết'))}</button>` : '') +
      `<button type="button" class="lkc-save"${saved ? ' disabled' : ''}>${esc(saved ? tt('Đã có trong bộ thẻ') : tt('Lưu vào ôn tập'))}</button>`;
    place(anchor);
    const kn = m.querySelector('.lkc-known'); if (kn) kn.onclick = H.known; // Truyện: Đã biết → Stories.mark (không lưu SRS)
    const btn = m.querySelector('.lkc-save');
    btn.onclick = () => save(btn);
  }
  g.LookupCard = { open, close };
})(typeof self !== 'undefined' ? self : globalThis);
