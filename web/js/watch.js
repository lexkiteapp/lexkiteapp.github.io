/* 🎬 Học qua video (#/watch · #/watch/<id>) – gói lười 'watch'. Thiết kế + điều khoản YouTube: docs/specs/video-learn.md.
 * Player = IFrame API chính thức (youtube-nocookie), không che player/quảng cáo; add-on (không nạp mã từ xa) → iframe thường + mở YouTube. */
(function (g) {
  const { $, $$, esc, toast } = UI;
  const App = g.App, { state, routes } = App, view = App.view;
  const W = () => g.WatchTopics;
  const web = /^https?:$/.test(location.protocol) && /(^|\.)lexkite\.com$|^localhost$|^127\.0\.0\.1$|\.pages\.dev$/.test(location.hostname);
  const API = (web ? '' : 'https://lexkite.com') + '/api/watch';
  const LS = { get: (k, d) => { try { const v = localStorage.getItem('wt.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }, set: (k, v) => { try { localStorage.setItem('wt.' + k, JSON.stringify(v)); } catch (e) { /* đầy / riêng tư */ } } };
  const VID = /^[A-Za-z0-9_-]{11}$/;
  /** Mọi dạng link YouTube → { id, t } (watch?v=, youtu.be/, shorts/, embed/, live/, m., music., nocookie, &t=1m30s / ?start=) */
  function ytParse(s) {
    s = String(s || '').trim(); if (VID.test(s)) return { id: s, t: 0 };
    let u; try { u = new URL(/^[a-z]+:\/\//i.test(s) ? s : 'https://' + s); } catch (e) { return null; }
    if (!/(^|\.)(youtube\.com|youtube-nocookie\.com|youtu\.be)$/i.test(u.hostname)) return null;
    let id = /youtu\.be$/i.test(u.hostname) ? u.pathname.split('/')[1] : u.searchParams.get('v');
    if (!id) { const m = u.pathname.match(/^\/(?:shorts|embed|live|v)\/([^/?#]+)/); id = m && m[1]; }
    if (!id || !VID.test(id)) return null;
    const tt = u.searchParams.get('t') || u.searchParams.get('start') || (u.hash.match(/t=([^&]+)/) || [])[1] || '';
    const m = String(tt).match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s?)?$/);
    return { id, t: m ? (+m[1] || 0) * 3600 + (+m[2] || 0) * 60 + (+m[3] || 0) : 0 };
  }
  const fmt = s => { s = Math.max(0, Math.floor(s || 0)); const h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, x = String(s % 60).padStart(2, '0'); return h ? `${h}:${String(m).padStart(2, '0')}:${x}` : `${m}:${x}`; };
  const get = (op, p) => fetch(API + '?' + new URLSearchParams({ op, ...p }), { credentials: 'omit' }).then(r => (r.ok ? r.json() : { items: [] })).catch(() => ({ items: [], offline: true }));
  const myLevel = () => { const p = (state.settings || {}).placement, c = p && (p.vCefr || p.gCefr); const n = c ? W().LEVELS.indexOf(String(c).toUpperCase().slice(0, 2)) + 1 : 0; return n || (p && p.band ? (p.band >= 7 ? 5 : p.band >= 5.5 ? 4 : p.band >= 4.5 ? 3 : 2) : 2); };
  const goal = () => (App.exam ? App.exam() : 'general');
  const filt = () => ({ lv: 0, dur: '', acc: '', pace: '', cc: true, ...LS.get('f', {}) });
  /** Từ khóa cuối = cụm chủ đề + đuôi trình độ/giọng/tốc độ (bỏ trùng) */
  function buildQ(base, f) {
    const X = W(), lv = f.lv || myLevel(), parts = [base, X.LV_Q(lv), X.ACC_Q[f.acc] || '', X.PACE_Q[f.pace] || ''];
    return [...new Set(parts.join(' ').split(/\s+/).filter(Boolean))].join(' ');
  }
  /** Chủ đề gợi ý: khớp mục tiêu + trình độ, cộng điểm khi từ trong sổ trùng vocab chủ đề */
  function forYou() {
    const lv = filt().lv || myLevel(), gl = goal(), words = new Set(Object.keys(state.cards || {}));
    return W().TOPICS.map(tp => {
      let s = tp.lv[0] <= lv && lv <= tp.lv[1] ? 3 : -2;
      if (tp.goals.includes(gl)) s += 3; else if (!tp.goals.includes('all')) s -= 4;
      for (const v of tp.vocab) if (words.has(v)) s += 1;
      for (const h of LS.get('h', []).slice(0, 10)) if (h.topic === tp.id) s += 1;
      return [s, tp];
    }).filter(x => x[0] > 0).sort((a, b) => b[0] - a[0]).slice(0, 6).map(x => x[1]);
  }

  const card = it => `<a class="wt-card" href="#/watch/${esc(it.id)}" data-id="${esc(it.id)}" data-title="${esc(it.title || '')}" data-ch="${esc(it.ch || '')}">
      <span class="wt-thumb"><img src="https://i.ytimg.com/vi/${esc(it.id)}/mqdefault.jpg" alt="" width="320" height="180" loading="lazy" decoding="async">${it.sec ? `<span class="wt-dur">${fmt(it.sec)}</span>` : ''}${it.pos ? `<span class="wt-prog" style="width:${Math.min(100, Math.round(it.pos / Math.max(1, it.len || it.pos) * 100))}%"></span>` : ''}</span>
      <b class="wt-ttl">${esc(it.title || t('Video YouTube'))}</b><span class="tiny muted">${esc(it.ch || '')}${it.cc ? ` · <span class="wt-cc">CC</span>` : ''}</span></a>`;
  const topicBtn = tp => `<button type="button" class="wt-topic" data-topic="${tp.id}">${UI.icon(tp.ic)}<b>${t(tp.name)}</b><span class="tiny muted">${t(tp.desc)}</span><span class="tiny wt-lv">${W().LEVELS[tp.lv[0] - 1]}–${W().LEVELS[tp.lv[1] - 1]}</span></button>`;
  const sel = (id, key, f) => `<label class="wt-sel"><span class="sr-only">${t(W().FILTERS[key][0][1])}</span><select id="${id}">${W().FILTERS[key].map(([v, n]) => `<option value="${v}" ${f[key] === v ? 'selected' : ''}>${t(n)}</option>`).join('')}</select></label>`;

  function hub(query) {
    const f = filt(), lvAuto = myLevel(), hist = LS.get('h', []).slice(0, 8);
    view.innerHTML = `<div class="wt-hub" id="wtHub">
      <div class="page-head"><div><h1>${UI.icon('monitor')} ${t('Học qua video')}</h1><p class="muted">${t('Xem video YouTube thật theo chủ đề và trình độ – lặp đoạn, chỉnh tốc độ, lưu từ vào thẻ ôn.')}</p></div></div>
      <form class="card wt-find" id="wtFind" role="search">
        <label for="wtQ" class="sr-only">${t('Dán link YouTube hoặc gõ chủ đề…')}</label>
        <input id="wtQ" type="search" placeholder="${t('Dán link YouTube hoặc gõ chủ đề…')}" autocomplete="off" enterkeyhint="search" maxlength="300">
        <button class="btn primary" type="submit">${UI.icon('search')} ${t('Tìm')}</button>
      </form>
      <div class="wt-filters" role="group" aria-label="${t('Bộ lọc')}">
        <div class="wt-lvs" role="radiogroup" aria-label="${t('Trình độ')}">${[0, 1, 2, 3, 4, 5, 6].map(n => `<button type="button" role="radio" class="chip wt-lvb" data-lv="${n}" aria-checked="${(f.lv || 0) === n}">${n ? W().LEVELS[n - 1] : t('Tự động ({l})', { l: W().LEVELS[lvAuto - 1] })}</button>`).join('')}</div>
        <div class="wt-sels">${sel('wtDur', 'dur', f)}${sel('wtAcc', 'acc', f)}${sel('wtPace', 'pace', f)}
          <label class="wt-cc-t"><input type="checkbox" id="wtCC" ${f.cc ? 'checked' : ''}> ${t('Có phụ đề')}</label></div>
      </div>
      <section id="wtRes" class="wt-sec" aria-live="polite" hidden></section>
      ${hist.length ? `<section class="wt-sec"><h2>${t('Xem tiếp')}</h2><div class="wt-row">${hist.map(card).join('')}</div></section>` : ''}
      <section class="wt-sec"><h2>${t('Gợi ý cho bạn')}</h2><div class="wt-topics">${forYou().map(topicBtn).join('')}</div></section>
      <section class="wt-sec"><h2>${t('Tất cả chủ đề')}</h2><div class="wt-topics">${W().TOPICS.map(topicBtn).join('')}</div></section>
      <p class="tiny muted wt-legal">${t('Video phát bằng trình phát chính thức của YouTube; Lexkite không tải hay lưu video.')} <a href="https://www.youtube.com/t/terms" target="_blank" rel="noopener">YouTube ToS</a> · <a href="https://policies.google.com/privacy" target="_blank" rel="noopener">Google Privacy</a></p></div>`;
    const save = p => { const x = { ...filt(), ...p }; LS.set('f', x); return x; };
    $$('.wt-lvb').forEach(b => { b.onclick = () => { save({ lv: +b.dataset.lv }); $$('.wt-lvb').forEach(x => x.setAttribute('aria-checked', String(x === b))); rerun(); }; });
    [['wtDur', 'dur'], ['wtAcc', 'acc'], ['wtPace', 'pace']].forEach(([id, k]) => { $('#' + id).onchange = e => { save({ [k]: e.target.value }); rerun(); }; });
    $('#wtCC').onchange = e => { save({ cc: e.target.checked }); rerun(); };
    $('#wtFind').onsubmit = e => { e.preventDefault(); const v = $('#wtQ').value.trim(); if (!v) return $('#wtQ').focus(); const y = ytParse(v); if (y) { location.hash = '#/watch/' + y.id + (y.t ? '?t=' + y.t : ''); return; } run({ q: v, label: v }); };
    $('#wtQ').addEventListener('paste', () => setTimeout(() => { const y = ytParse($('#wtQ').value); if (y) location.hash = '#/watch/' + y.id + (y.t ? '?t=' + y.t : ''); }, 0)); // dán link → mở luôn
    const hubEl = $('#wtHub'); // gắn vào khung trang, không vào view (sống suốt phiên → dồn listener)
    hubEl.addEventListener('click', e => { const b = e.target.closest('[data-topic]'); if (b) openTopic(b.dataset.topic); const q = e.target.closest('[data-q]'); if (q) run({ q: q.dataset.q, label: q.dataset.q, topic: lastRun && lastRun.topic }); });
    hubEl.addEventListener('click', e => { const a = e.target.closest('.wt-card'); if (a) LS.set('pick', { id: a.dataset.id, title: a.dataset.title, ch: a.dataset.ch, topic: (lastRun && lastRun.topic) || '' }); });
    if (query && query.get('topic')) openTopic(query.get('topic')); else if (query && query.get('q')) run({ q: query.get('q'), label: query.get('q') });
  }
  let lastRun = null, runSeq = 0;
  const rerun = () => { if (lastRun) run(lastRun); };
  function openTopic(id) { const tp = W().TOPICS.find(x => x.id === id); if (tp) run({ q: tp.q[0], label: t(tp.name), topic: tp.id }); }
  async function run(r) {
    lastRun = r; const my = ++runSeq, box = $('#wtRes'); if (!box) return;
    const f = filt(), tp = r.topic && W().TOPICS.find(x => x.id === r.topic), q = buildQ(r.q, f);
    box.hidden = false;
    box.innerHTML = `<div class="row between"><h2>${esc(r.label)}</h2><button type="button" class="btn ghost sm" id="wtClose" aria-label="${t('Đóng')}">✕</button></div>
      ${tp ? `<div class="wt-qs">${tp.q.map(x => `<button type="button" class="chip" data-q="${esc(x)}">${esc(x)}</button>`).join('')}</div>` : ''}
      <div class="wt-row" aria-busy="true">${'<span class="wt-card skel"></span>'.repeat(4)}</div>`;
    $('#wtClose').onclick = () => { box.hidden = true; lastRun = null; };
    box.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    const [s, fd] = await Promise.all([get('search', { q, dur: f.dur, cc: f.cc ? '1' : '' }), tp && tp.ch.length ? get('feed', { ch: tp.ch.join(',') }) : Promise.resolve({ items: [] })]);
    if (my !== runSeq || !document.body.contains(box)) return;
    const kw = tp && tp.kw.length ? new RegExp('\\b(' + tp.kw.join('|') + ')', 'i') : null;
    let feed = (fd.items || []).filter(x => !/#shorts/i.test(x.title));
    if (kw) { const hit = feed.filter(x => kw.test(x.title)); feed = hit.length >= 4 ? hit : feed; }
    const seen = new Set(), items = [...(s.items || []), ...feed].filter(x => x && VID.test(x.id) && !seen.has(x.id) && seen.add(x.id)).filter(x => !f.dur || !x.sec || (f.dur === 'short' ? x.sec < 240 : f.dur === 'medium' ? x.sec >= 240 && x.sec <= 1200 : x.sec > 1200)).slice(0, 24);
    const yt = s.fallback || 'https://www.youtube.com/results?search_query=' + encodeURIComponent(q);
    const row = box.querySelector('.wt-row'); row.removeAttribute('aria-busy');
    row.innerHTML = items.length ? items.map(card).join('') : `<p class="muted">${s.offline ? t('Không có mạng – thử lại khi có kết nối.') : t('Chưa có video sẵn cho lựa chọn này.')}</p>`;
    box.insertAdjacentHTML('beforeend', `<p class="small wt-more">${t('Không thấy video ưng ý? Tìm trên YouTube rồi dán link vào ô phía trên.')} <a class="btn sm" href="${esc(yt)}" target="_blank" rel="noopener">${UI.icon('search')} ${t('Mở trên YouTube')}</a></p>`);
  }

  // ================= TRÌNH HỌC =================
  let ytApi = null;
  const loadYT = () => ytApi || (ytApi = new Promise((ok, no) => {
    if (g.YT && g.YT.Player) return ok(g.YT);
    const prev = g.onYouTubeIframeAPIReady; g.onYouTubeIframeAPIReady = () => { if (typeof prev === 'function') prev(); ok(g.YT); };
    const sc = document.createElement('script'); sc.src = 'https://www.youtube.com/iframe_api'; sc.async = true; sc.onerror = () => { ytApi = null; no(new Error('yt-load')); };
    document.head.appendChild(sc); setTimeout(() => no(new Error('yt-timeout')), 8000);
  }));
  const RATES = [0.5, 0.75, 0.9, 1, 1.25, 1.5];

  function player(id, query) {
    const pick = LS.get('pick', {}), prev = LS.get('h', []).find(h => h.id === id) || {}, start = +(query && query.get('t')) || (prev.pos > 5 && prev.len && prev.pos < prev.len - 10 ? Math.floor(prev.pos) : 0);
    const meta = { id, title: (pick.id === id && pick.title) || prev.title || '', ch: (pick.id === id && pick.ch) || prev.ch || '', topic: (pick.id === id && pick.topic) || prev.topic || '' };
    const ytUrl = s => `https://www.youtube.com/watch?v=${id}${s ? '&t=' + Math.floor(s) + 's' : ''}`;
    view.innerHTML = `
      <div class="wt-top"><a class="btn ghost back wt-back" href="#/watch" aria-label="${t('Quay lại')}">${UI.icon('chevron-left')} ${t('Học qua video')}</a></div>
      <div class="wt-stage"><div class="wt-player"><div id="wtP"></div></div>
        <div class="wt-bar" id="wtBar" role="toolbar" aria-label="${t('Điều khiển luyện nghe')}" hidden>
          <button type="button" class="btn sm" id="wtBack" title="${t('Lùi 5 giây')}">↺ 5s</button>
          <button type="button" class="btn sm primary" id="wtPlay" aria-label="${t('Phát / dừng')}">▶</button>
          <label class="wt-sel"><span class="sr-only">${t('Tốc độ')}</span><select id="wtRate">${RATES.map(r => `<option value="${r}" ${r === 1 ? 'selected' : ''}>${r}×</option>`).join('')}</select></label>
          <span class="wt-ab" role="group" aria-label="${t('Lặp A–B')}"><button type="button" class="btn sm" id="wtA">A</button><button type="button" class="btn sm" id="wtB">B</button><button type="button" class="btn sm" id="wtLoop" aria-pressed="false">${UI.icon('repeat')} <span id="wtABt">${t('Lặp A–B')}</span></button></span>
        </div></div>
      <h1 class="wt-title" id="wtTitle">${esc(meta.title || t('Video YouTube'))}</h1><p class="muted small" id="wtCh">${esc(meta.ch)}</p>
      <div class="wt-tools">
        <section class="card"><h2>${UI.icon('book-a')} ${t('Tra & lưu từ')}</h2>
          <form id="wtSave" class="wt-form"><label for="wtW" class="sr-only">${t('Gõ từ vừa nghe…')}</label><input id="wtW" placeholder="${t('Gõ từ vừa nghe…')}" autocomplete="off" autocapitalize="off" spellcheck="false" maxlength="60" required>
            <label for="wtS" class="sr-only">${t('Câu chứa từ (tùy chọn)')}</label><input id="wtS" placeholder="${t('Câu chứa từ (tùy chọn)')}" maxlength="200">
            <button class="btn primary" type="submit">${t('Tra cứu')}</button></form><div id="wtWord" aria-live="polite"></div></section>
        <section class="card"><h2>${UI.icon('notebook-pen')} ${t('Ghi chú theo thời gian')}</h2>
          <form id="wtNote" class="wt-form"><label for="wtNt" class="sr-only">${t('Ghi chú')}</label><input id="wtNt" placeholder="${t('Ghi chú tại mốc đang xem…')}" maxlength="300" required><button class="btn" type="submit">${t('Thêm')}</button></form>
          <ul class="wt-notes" id="wtNotes"></ul></section>
      </div>
      <section class="card wt-ext"><p>${UI.icon('sparkles')} ${t('Phụ đề song ngữ, chạm từ để tra, lặp từng câu: mở video này trên YouTube cùng add-on Lexkite.')}</p><a class="btn sm" id="wtYT" href="${ytUrl(start)}" target="_blank" rel="noopener">${t('Mở trên YouTube')}</a></section>`;
    let P = null, A = null, B = null, loop = false, dead = false, len = 0;
    const now = () => { try { return P ? P.getCurrentTime() || 0 : 0; } catch (e) { return 0; } };
    const remember = () => { const pos = now(); if (!pos && !meta.title) return; const h = LS.get('h', []).filter(x => x.id !== id); h.unshift({ ...meta, pos: Math.floor(pos), len: Math.floor(len), at: Date.now() }); LS.set('h', h.slice(0, 30)); const a = $('#wtYT'); if (a) a.href = ytUrl(pos); };
    remember();
    if (!meta.title) get('info', { id }).then(d => { if (dead || !d || !d.title) { if (d && d.embeddable === false && !dead) toast(t('Video này không phát được ở đây – hãy mở trên YouTube.'), 6000); return; } meta.title = d.title; meta.ch = d.ch; $('#wtTitle').textContent = d.title; $('#wtCh').textContent = d.ch; remember(); });
    const plain = () => { $('#wtP').outerHTML = `<iframe class="wt-if" src="https://www.youtube-nocookie.com/embed/${id}?rel=0&playsinline=1&cc_load_policy=1&cc_lang_pref=en${start ? '&start=' + start : ''}" title="${esc(meta.title || 'YouTube')}" allow="encrypted-media; picture-in-picture; fullscreen" allowfullscreen loading="lazy"></iframe>`; };
    const abText = () => { $('#wtABt').textContent = A != null && B != null ? `${fmt(A)} → ${fmt(B)}` : A != null ? `${fmt(A)} → …` : t('Lặp A–B'); $('#wtLoop').setAttribute('aria-pressed', String(loop)); $('#wtLoop').classList.toggle('primary', loop); };
    let tick = 0, saveT = 0;
    const tickOn = on => { clearInterval(tick); if (on) tick = setInterval(() => { if (dead) return clearInterval(tick); if (loop && A != null && B != null && now() >= B) P.seekTo(A, true); }, 200); };
    if (g.Core && g.Core.Store.isExtension) plain(); else loadYT().then(YT => {
      if (dead) return;
      P = new YT.Player('wtP', { host: 'https://www.youtube-nocookie.com', videoId: id, width: '100%', height: '100%', playerVars: { playsinline: 1, rel: 0, modestbranding: 1, cc_load_policy: 1, cc_lang_pref: 'en', start, hl: (g.I18N && I18N.lang && I18N.lang()) || 'en' },
        events: {
          onReady: () => { if (dead) return; $('#wtBar').hidden = false; try { len = P.getDuration() || 0; } catch (e) { /* bỏ qua */ } },
          onStateChange: e => { if (dead) return; const playing = e.data === 1; $('#wtPlay').textContent = playing ? '❚❚' : '▶'; tickOn(playing); clearInterval(saveT); if (playing) saveT = setInterval(remember, 5000); else remember(); if (e.data === 0 && App.reward) App.reward({ xp: 3 }); },
          onError: () => { if (dead) return; toast(t('Video này không phát được ở đây – hãy mở trên YouTube.'), 6000); },
        } });
      $('#wtBack').onclick = () => P.seekTo(Math.max(0, now() - 5), true);
      $('#wtPlay').onclick = () => (P.getPlayerState() === 1 ? P.pauseVideo() : P.playVideo());
      $('#wtRate').onchange = e => P.setPlaybackRate(+e.target.value);
      $('#wtA').onclick = () => { A = now(); if (B != null && B <= A) B = null; abText(); };
      $('#wtB').onclick = () => { const x = now(); if (A == null) A = Math.max(0, x - 5); if (x > A + 0.5) { B = x; loop = true; P.seekTo(A, true); } abText(); };
      $('#wtLoop').onclick = () => { if (A == null || B == null) { toast(t('Bấm A ở đầu đoạn, B ở cuối đoạn để lặp.')); return; } loop = !loop; abText(); };
    }).catch(() => { if (!dead) plain(); });

    // Ghi chú theo mốc thời gian (chỉ trên máy)
    const notesKey = 'n.' + id, paintNotes = () => { const n = LS.get(notesKey, []); $('#wtNotes').innerHTML = n.length ? n.map((x, i) => `<li><button type="button" class="chip" data-seek="${x.t}">${fmt(x.t)}</button> <span>${esc(x.text)}</span> <button type="button" class="icon-btn sm" data-del="${i}" aria-label="${t('Xóa ghi chú')}">✕</button></li>`).join('') : `<li class="muted small">${t('Chưa có ghi chú.')}</li>`; };
    paintNotes();
    $('#wtNote').onsubmit = e => { e.preventDefault(); const v = $('#wtNt').value.trim(); if (!v) return; const n = LS.get(notesKey, []); n.push({ t: Math.floor(now()), text: v }); n.sort((a, b) => a.t - b.t); LS.set(notesKey, n.slice(-200)); $('#wtNt').value = ''; paintNotes(); };
    $('#wtNotes').onclick = e => { const s = e.target.closest('[data-seek]'), d = e.target.closest('[data-del]'); if (s && P) P.seekTo(+s.dataset.seek, true); if (d) { const n = LS.get(notesKey, []); n.splice(+d.dataset.del, 1); LS.set(notesKey, n); paintNotes(); } };

    // Tra + lưu từ: dùng chung từ điển (Dict), giọng (UI.speak → Kokoro/HQ), thẻ ôn (App.addWord)
    $('#wtSave').onsubmit = async e => {
      e.preventDefault(); const word = $('#wtW').value.trim().toLowerCase(), sent = $('#wtS').value.trim(), out = $('#wtWord'), at = Math.floor(now()); if (!word) return;
      out.innerHTML = `<p class="muted small">${UI.icon('hourglass')} ${t('Đang tra “{w}”…', { w: esc(word) })}</p>`;
      const d = (await g.Dict.quick(word).catch(() => null)) || (await g.Dict.lookup(word, { examples: false, image: false }).catch(() => null));
      if (dead) return;
      if (!d || !d.found) { out.innerHTML = `<p class="muted small">${t('Không tìm thấy “{w}”.', { w: esc(word) })}</p>`; return; }
      const m = App.meanOf ? App.meanOf(d) : d.vi, acc = state.settings.accent;
      out.innerHTML = `<div class="wt-wd"><div class="row"><b>${esc(d.word)}</b> ${UI.ipaHtml(d)} <button type="button" class="icon-btn sm" data-say aria-label="${t('Nghe')}">${UI.icon('volume-2')}</button></div>${m ? `<div class="vi">${esc(m)}</div>` : ''}
        <div class="row"><button type="button" class="btn sm primary" data-add>${App.inDeck(d.word) ? '+ ' + t('Thêm ngữ cảnh') : '+ ' + t('Lưu flashcard')}</button><a class="btn sm ghost" href="#/dict/${encodeURIComponent(d.word)}">${t('Xem nghĩa đầy đủ')}</a></div></div>`;
      $('[data-say]', out).onclick = () => UI.speak(d.word, acc, UI.audioFor(d, acc));
      $('[data-add]', out).onclick = async ev => {
        const b = ev.currentTarget; b.disabled = true;
        await App.addWord(d, sent ? { text: sent, title: '▶️ ' + (meta.title || 'YouTube') + ` (${fmt(at)})`, source: ytUrl(at) } : null);
        b.textContent = '✓ ' + t('Đã lưu'); $('#wtW').value = ''; $('#wtS').value = '';
      };
    };
    App.cleanup = () => { dead = true; clearInterval(tick); clearInterval(saveT); try { remember(); if (P && P.destroy) P.destroy(); } catch (e) { /* bỏ qua */ } };
  }

  routes.watch = (arg, query) => { const y = arg && ytParse(arg); if (y) return player(y.id, query); return hub(query); };
  g.Watch = { ytParse, buildQ, fmt, forYou };
})(window);
