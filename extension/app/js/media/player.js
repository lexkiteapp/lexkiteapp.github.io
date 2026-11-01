/* 🎬 Học qua video/audio – trình phát + transcript tương tác + 4 chế độ (Phụ đề · Shadowing · Chính tả · Điền từ). Spec: docs/MEDIA.md.
 * Route #/watch (danh sách) · #/watch/<id> (1 clip). Dữ liệu web/data/media/{index,<id>}.json (dựng bằng scripts/media/build-clips.mjs,
 * mốc giờ căn theo audio trên CI media-clips.yml). Clip 'teacher' = audio + giáo viên 2D Ama/Carlos (LessonTeacher) nói đúng lúc có câu;
 * clip 'video' = <video src> (nguồn tự làm / CC có ghi nguồn). Giao diện: khung Stitch v2 (M2) khi có; M1 tạm làm dự phòng. */
(function (g) {
  const { routes } = g.App, D = g.document, C = () => g.MediaCues;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const KEY = 'vb.media', FONTS = [15, 17, 19, 22, 26];
  const MODES = [['sub', 'Phụ đề'], ['shadow', 'Shadowing'], ['dict', 'Chính tả'], ['cloze', 'Điền từ']];
  const pref = () => { try { return Object.assign({ font: 1, loop: false, tr: true, view: 'sub', trLang: '', rate: 1, fold: false }, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { return { font: 1, loop: false, tr: true, view: 'sub', trLang: '' }; } };
  const save = p => { try { localStorage.setItem(KEY, JSON.stringify(p)); } catch (e) { /* bỏ qua */ } };
  const getJSON = (u, signal) => fetch(u, { signal }).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); });
  const view = () => D.getElementById('view');

  routes.watch = g.App.guard(async function (id) {
    const w = g.App.W; await w(g.I18N && g.I18N.whenReady ? g.I18N.whenReady() : null);
    view().innerHTML = g.UI && g.UI.skelPage ? g.UI.skelPage(t('Đang tải…')) : '';
    if (!id) return list(w);
    let clip; try { clip = await w(getJSON(`data/media/${encodeURIComponent(id)}.json`, w.signal)); } catch (e) { return list(w); }
    play(clip, w);
  });

  async function list(w) {
    let items = []; try { items = await w(getJSON('data/media/index.json', w.signal)); } catch (e) { items = []; }
    view().innerHTML = `<div class="page-head"><div><h1>🎬 ${t('Học qua video')}</h1><p class="muted">${t('Xem clip ngắn, đọc phụ đề song ngữ, luyện nói theo, chính tả và điền từ.')}</p></div></div>
      <div class="grid auto mp-list">${items.map(c => `<a class="card hover mp-card" href="#/watch/${esc(c.id)}">${g.Chars ? g.Chars.img(c.teacher, { size: 56, lazy: true, alt: '' }) : ''}<div><b lang="en">${esc(c.title)}</b><p class="muted small">${esc(c.level)} · ${g.MediaTranscript.mmss(c.dur)}</p></div></a>`).join('') || `<p class="muted">${t('Chưa có clip.')}</p>`}</div>`;
  }

  // 🧩 Stitch v2 (M2, docs/MEDIA.md §6): khung tự sinh web/js/st/v2/watch.js (sân khấu) · watch-mini.js ('Ẩn sân khấu') · watch-lookup.js (thẻ tra).
  // Giáo viên CHỈ qua Chars + LessonTeacher (Ama trái, Carlos phải). Clip video / thiếu khung → giao diện M1 bên dưới (dự phòng). @icons play_arrow pause volume_up expand_more
  const v2On = clip => clip.kind !== 'video' && !!(g.ST2 && g.ST2.watch && g.ST2['watch-mini'] && g.ST2.mount && g.Chars && g.LessonTeacher);
  const FONTS2 = [13, 15, 17, 20, 24], RATES = [1, 0.75, 1.25];
  const TABS = [['#/home', 'Hôm nay'], ['#/vocab', 'Từ vựng'], ['#/skills', 'Kỹ năng'], ['#/tests', 'Thi thử'], ['#/me', 'Tôi']];
  const goBack = () => { if (g.history.length > 1) g.history.back(); else location.hash = '#/skills'; };
  const cls = el => (el && el.getAttribute('class')) || '';
  const swap = (el, a, b) => { if (!el) return; a.split(/\s+/).filter(Boolean).forEach(c => el.classList.remove(c)); b.split(/\s+/).filter(Boolean).forEach(c => el.classList.add(c)); };
  const rateTxt = r => (r === 1 ? '1.0' : String(r)) + 'x';
  const TAP = ' relative after:absolute after:-inset-2 after:content-[\'\']'; // nút nghe lại 28px → vùng chạm ≥44 vô hình

  // Khuôn thẻ câu đọc từ thẻ mẫu Stitch trong #wTr (đã qua / đang phát / sắp tới) → MediaTranscript vẽ câu thật với đúng class đó
  function skinOf(box, kind, nameOf) {
    const k = [...box.children], q = (el, ...ix) => ix.reduce((e, n) => e && e.children[n], el);
    const playing = () => esc(t('Đang phát')), replay = () => esc(t('Nghe lại'));
    if (kind === 'watch') {
      const [c0, c1, c2] = k, S = {
        done: cls(c0), on: cls(c1), next: cls(c2), head: cls(q(c2, 0)), who: cls(q(c2, 0, 0)), whoOn: cls(q(c1, 0, 0, 0)), ping: cls(q(c1, 0, 0, 1)), ts: cls(q(c2, 0, 1)), badge: cls(q(c1, 0, 1)),
        play: cls(q(c0, 0, 1)) + TAP, playI: q(c0, 0, 1) ? q(c0, 0, 1).innerHTML : '', en: cls(q(c2, 1)), enOn: cls(q(c1, 1)), tr: cls(q(c2, 2)), trOn: cls(q(c1, 2)), w: cls(q(c1, 1, 0)), ph: cls(q(c1, 1, 1)) };
      const side = (r, st) => st === 'on' ? `<span class="${S.badge}">${playing()}</span>` : `<span class="flex items-center gap-2"><span class="${S.ts}">${esc(r.dataset.ts)}</span><button type="button" class="${S.play}" data-play aria-label="${replay()}">${S.playI}</button></span>`;
      return {
        row: o => `<div class="mt-row ${S.next}" role="listitem" data-i="${o.i}" data-who="${esc(o.cue.who || '')}" data-ts="${esc(o.ts)}" tabindex="0"><div class="${S.head}"><span class="flex items-center gap-1.5"><span class="mt-who ${S.who}">${esc(nameOf(o.cue.who))}</span></span><span class="mt-side"></span></div>` +
          `<p class="mt-en ${S.en}" lang="en">${o.en.replace(/class="mt-ph"/g, `class="mt-ph ${S.ph}"`)}</p>` + (o.tr ? `<p class="mt-tr ${S.tr}" lang="${esc(o.lang)}"${o.lang === 'ar' ? ' dir="rtl"' : ''}>${esc(o.tr)}</p>` : '') + '</div>',
        state(r, st) {
          if (r.dataset.st === st) return; r.dataset.st = st; r.setAttribute('class', `mt-row ${st === 'on' ? S.on : st === 'done' ? S.done : S.next}`);
          const on = st === 'on', wh = r.querySelector('.mt-who'); swap(wh, on ? S.who : S.whoOn, on ? S.whoOn : S.who);
          const pg = wh.nextElementSibling; if (on && !pg) wh.insertAdjacentHTML('afterend', `<span class="${S.ping}" aria-hidden="true"></span>`); else if (!on && pg) pg.remove();
          r.querySelector('.mt-side').innerHTML = side(r, st); swap(r.querySelector('.mt-en'), on ? S.en : S.enOn, on ? S.enOn : S.en); swap(r.querySelector('.mt-tr'), on ? S.tr : S.trOn, on ? S.trOn : S.tr);
        },
        word: (sp, on) => swap(sp, on ? '' : S.w, on ? S.w : ''),
      };
    }
    const [c0, c1, c2, c3] = k, S = { // watch-mini: nút nghe đầu thẻ, chip người nói + quãng giờ
      done: cls(c0), on: cls(c2), next: cls(c3), badge: cls(q(c2, 0)), dot: cls(q(c2, 0, 0)), btn: cls(q(c0, 0)), btnOn: cls(q(c2, 1)), icon: cls(q(c0, 0, 0)), iconOn: cls(q(c2, 1, 0)), body: cls(q(c0, 1)), head: cls(q(c0, 1, 0)),
      chip: cls(q(c0, 1, 0, 0)), chipOn: cls(q(c2, 2, 0, 0)), ts: cls(q(c0, 1, 0, 1)), tsOn: cls(q(c2, 2, 0, 1)), en: cls(q(c0, 1, 1)), enOn: cls(q(c2, 2, 1)), tr: cls(q(c0, 1, 2)), trOn: cls(q(c2, 2, 2)), w: cls(q(c2, 2, 1, 0)), ph: cls(q(c1, 1, 1, 0)) };
    const mm = g.MediaTranscript.mmss;
    return {
      row: o => `<article class="mt-row ${S.next}" role="listitem" data-i="${o.i}" data-who="${esc(o.cue.who || '')}" tabindex="0"><button type="button" class="mt-play ${S.btn}" data-play aria-label="${replay()}"><span class="mt-pi ${S.icon}" aria-hidden="true">play_arrow</span></button>` +
        `<div class="${S.body}"><div class="${S.head}"><span class="mt-who ${S.chip}">${esc(nameOf(o.cue.who))}</span><span class="mt-ts ${S.ts}">${mm(o.cue.start)} - ${mm(o.cue.end)}</span></div>` +
        `<p class="mt-en ${S.en}" lang="en">${o.en.replace(/class="mt-ph"/g, `class="mt-ph ${S.ph}"`)}</p>` + (o.tr ? `<p class="mt-tr ${S.tr}" lang="${esc(o.lang)}"${o.lang === 'ar' ? ' dir="rtl"' : ''}>${esc(o.tr)}</p>` : '') + '</div></article>',
      state(r, st) {
        if (r.dataset.st === st) return; r.dataset.st = st; r.setAttribute('class', `mt-row ${st === 'on' ? S.on : st === 'done' ? S.done : S.next}`);
        const on = st === 'on', b = r.querySelector('.mt-play'), ic = r.querySelector('.mt-pi'), bd = r.querySelector('.mt-badge');
        swap(b, on ? S.btn : S.btnOn, on ? S.btnOn : S.btn); swap(ic, on ? S.icon : S.iconOn, on ? S.iconOn : S.icon); ic.textContent = on ? 'volume_up' : 'play_arrow';
        if (on && !bd) r.insertAdjacentHTML('afterbegin', `<span class="mt-badge ${S.badge}"><span class="${S.dot}" aria-hidden="true"></span>${playing()}</span>`); else if (!on && bd) bd.remove();
        for (const [sel, a, c] of [['.mt-who', S.chip, S.chipOn], ['.mt-ts', S.ts, S.tsOn], ['.mt-en', S.en, S.enOn], ['.mt-tr', S.tr, S.trOn]]) swap(r.querySelector(sel), on ? a : c, on ? c : a);
      },
      word: (sp, on) => swap(sp, on ? '' : S.w, on ? S.w : ''),
    };
  }

  g.MediaPlayer = { skinOf }; // kiểm thử (scripts/test/media.mjs) đọc khuôn thẻ câu từ khung Stitch

  function play(clip, w) {
    const P = pref(), cues = clip.cues, ui = g.I18N ? g.I18N.lang() : 'en', V2 = v2On(clip);
    const trLang = () => P.trLang || (ui === 'en' ? 'vi' : ui);
    const langs = C().LANGS.filter(l => l !== 'en');
    const lname = l => (g.I18N && g.I18N.LANGS && g.I18N.LANGS[l] ? g.I18N.LANGS[l][1] : l);
    const who = Object.values(clip.speakers || {}).sort((a, b) => (a === 'ama' ? -1 : b === 'ama' ? 1 : 0)); // Ama trái, Carlos phải
    const nameOf = k => (g.Chars ? g.Chars.name((clip.speakers || {})[k] || k) : (clip.speakers || {})[k] || k);
    const fonts = V2 ? FONTS2 : FONTS;
    let mode = 'sub', hold = -1, rec = null, raf = 0, dead = false, T = null, tch = {}, root = null, med = null, U = null, spk = '';
    const $ = s => root.querySelector(s);

    // ---- Dựng giao diện: M1 (dự phòng) hoặc khung Stitch (watch | watch-mini) ----
    function buildM1() {
      view().innerHTML = `<div class="mp" data-view="${P.view === 'live' ? 'live' : 'sub'}">
      <a class="small" href="#/watch">← ${t('Học qua video')}</a>
      <h1 class="mp-title" lang="en">${esc(clip.title)} <span class="chip">${esc(clip.level)}</span></h1>
      <div class="mp-stage${clip.kind === 'video' ? ' is-video' : ''}">${clip.kind === 'video' ? `<video class="mp-video" playsinline preload="metadata" src="${esc(clip.src)}"${clip.poster ? ` poster="${esc(clip.poster)}"` : ''}></video>` : who.map(x => `<div class="mp-tch" data-who="${esc(x)}"></div>`).join('')}
        ${clip.kind === 'video' ? '' : `<audio class="mp-audio" preload="auto" src="${esc(clip.audio)}"></audio>`}</div>
      <div class="mp-ctl">
        <button type="button" class="mp-b" data-a="prev" aria-label="${esc(t('Câu trước'))}">⏮</button>
        <button type="button" class="mp-b mp-play" data-a="play" aria-label="${esc(t('Phát'))}">▶</button>
        <button type="button" class="mp-b" data-a="next" aria-label="${esc(t('Câu tiếp'))}">⏭</button>
        <input class="mp-seek" type="range" min="0" max="${Math.ceil(clip.dur * 10)}" value="0" aria-label="${esc(t('Tua'))}"><span class="mp-time">0:00 / ${g.MediaTranscript.mmss(clip.dur)}</span></div>
      <div class="mp-modes" role="tablist">${MODES.map(([k, l]) => `<button type="button" role="tab" data-m="${k}" aria-selected="${k === 'sub'}">${esc(t(l))}</button>`).join('')}</div>
      <div class="mp-tools">
        <button type="button" class="mp-b" data-a="font-" aria-label="${esc(t('Chữ nhỏ hơn'))}">A−</button><button type="button" class="mp-b" data-a="font+" aria-label="${esc(t('Chữ lớn hơn'))}">A+</button>
        <button type="button" class="mp-b" data-a="loop" aria-pressed="${!!P.loop}">🔁 ${esc(t('Lặp câu'))}</button>
        <button type="button" class="mp-b" data-a="tr" aria-pressed="${!!P.tr}">${esc(t('Bản dịch'))}</button>
        <select class="mp-lang" aria-label="${esc(t('Ngôn ngữ dịch'))}">${langs.map(l => `<option value="${l}"${l === trLang() ? ' selected' : ''}>${esc(lname(l))}</option>`).join('')}</select>
        <button type="button" class="mp-b" data-a="view" aria-pressed="${P.view === 'live'}">${esc(t('Live'))}</button>
        <button type="button" class="mp-b" data-a="fold" aria-pressed="false">${esc(t('Thu gọn'))}</button></div>
      <div class="mp-panel" hidden></div>
      <div class="mp-tr"></div></div>`;
      root = view().querySelector('.mp'); med = $('.mp-video') || $('.mp-audio');
      if (g.LessonTeacher) root.querySelectorAll('.mp-tch').forEach(el => { tch[el.dataset.who] = g.LessonTeacher.mount(el, el.dataset.who); });
      return {
        tr: $('.mp-tr'), panel: $('.mp-panel'), skin: null,
        playing(on) { $('.mp-play').textContent = on ? '⏸' : '▶'; $('.mp-play').setAttribute('aria-label', on ? t('Tạm dừng') : t('Phát')); },
        time(s) { $('.mp-seek').value = Math.round(s * 10); $('.mp-time').textContent = `${g.MediaTranscript.mmss(s)} / ${g.MediaTranscript.mmss(clip.dur)}`; },
        modes() { root.querySelectorAll('.mp-modes [data-m]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.m === mode))); },
        pressed(b, on) { b.setAttribute('aria-pressed', String(on)); },
        fold(b) { const on = !root.classList.contains('folded'); root.classList.toggle('folded', on); b.setAttribute('aria-pressed', String(on)); },
        speaker() {},
      };
    }
    function buildV2(k) {
      const cur = Math.max(0, T ? T.active() : 0), sp = (clip.speakers || {})[(cues[cur] || {}).who] || who[0];
      const host = x => x ? `<div class="mp-tch relative w-[104px] h-[124px]" data-who="${esc(x)}" aria-hidden="true"></div>` : '';
      const d = { title: clip.title, scene: clip.topic === 'work' ? t('Công việc') : t('Đời sống hằng ngày'), nameA: g.Chars.name(who[0]), nameB: who[1] ? g.Chars.name(who[1]) : '', two: who.length > 1, tchA: host(who[0]), tchB: host(who[1]),
        tchMini: `<div id="wTchM" class="w-14 h-14 rounded-full overflow-hidden flex-shrink-0 relative" aria-hidden="true">${g.Chars.img(sp, { size: 56, alt: '', cls: 'w-full h-full object-cover' })}</div>`,
        speaking: t('{name} đang nói', { name: g.Chars.name(sp) }), time: `0:00 / ${g.MediaTranscript.mmss(clip.dur)}`, dur: g.MediaTranscript.mmss(clip.dur), durS: Math.ceil(clip.dur), rate: rateTxt(P.rate || 1),
        loop: !!P.loop, tr: !!P.tr, live: P.view === 'live', langName: lname(trLang()),
        langSel: `<select id="wLang" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer" aria-label="${esc(t('Ngôn ngữ dịch'))}">${langs.map(l => `<option value="${l}"${l === trLang() ? ' selected' : ''}>${esc(lname(l))}</option>`).join('')}</select>`,
        tabsNav: TABS.map(([href, l]) => ({ href, label: t(l), on: href === '#/skills' })) };
      root = g.ST2.mount(view(), k, d, null); root.classList.add('mpv'); root.dataset.view = P.view === 'live' ? 'live' : 'sub'; root.dataset.mode = mode;
      g.document.title = clip.title + ' – Lexkite';
      root.querySelectorAll('.mp-tch').forEach(el => { tch[el.dataset.who] = g.LessonTeacher.mount(el, el.dataset.who); });
      const tabs = [...root.querySelectorAll('#wModes [data-m]')], tabOn = cls(tabs[0]), tabOff = cls(tabs[1]);
      const tools = root.querySelector('#wTools'), chipOn = cls($('#wChipA')), chipOff = cls($('#wChipB'));
      const tOn = tools ? cls(tools.querySelector('[data-a=tr]')) : '', tOff = tools ? cls(tools.querySelector('[data-a="font-"]')) : '';
      const ring = chipOn.split(/\s+/).filter(c => /(^|:)ring-/.test(c)).join(' '), pd = $('#wPlayI') && $('#wPlayI').getAttribute('d');
      const skin = skinOf($('#wTr'), k, nameOf);
      const paintTool = (b, on) => { if (!b) return; b.setAttribute('aria-pressed', String(on));
        if (b.dataset.a === 'loop') swap(b, on ? '' : ring, on ? ring : ''); else if (tools && tools.contains(b) && b.dataset.a !== 'fold') { b.setAttribute('class', on ? tOn : tOff); const dot = b.querySelector('#wTrDot'); if (dot) dot.hidden = !on; } };
      root.querySelectorAll('[data-a=tr],[data-a=view],[data-a=loop]').forEach(b => paintTool(b, b.getAttribute('aria-pressed') === 'true'));
      // Thanh tiến độ = thanh trượt: chạm/kéo để tua, ←/→ 5 s, Home/End
      const sk = $('#wSeek'), at = e => { const r = sk.getBoundingClientRect(), x = (e.clientX - r.left) / Math.max(1, r.width); seek(Math.max(0, Math.min(1, g.getComputedStyle(sk).direction === 'rtl' ? 1 - x : x)) * clip.dur); };
      if (sk) {
        sk.addEventListener('pointerdown', e => { at(e); try { sk.setPointerCapture(e.pointerId); } catch (x) { /* bỏ qua */ } });
        sk.addEventListener('pointermove', e => { if (e.buttons) at(e); });
        sk.addEventListener('keydown', e => { const s = med.currentTime, m = { ArrowRight: s + 5, ArrowUp: s + 5, ArrowLeft: s - 5, ArrowDown: s - 5, Home: 0, End: clip.dur - 0.1 }[e.key]; if (m != null) { e.preventDefault(); seek(Math.max(0, Math.min(clip.dur, m))); } });
      }
      $('#wBack').onclick = goBack;
      $('#wAa').onclick = () => { P.font = (P.font + 1) % fonts.length; T.setFont(fonts[P.font]); save(P); };
      const ln = $('#wLang'); if (ln) ln.onchange = e => { P.trLang = e.target.value; save(P); T.setLang(trLang()); const lw = $('#wLangW'); if (lw && lw.firstChild) lw.firstChild.textContent = ' ' + lname(trLang()) + ' '; };
      return {
        tr: $('#wTr'), panel: $('#wPanel'), skin,
        playing(on) { const b = $('#wPlay'), i = $('#wPlayI'); b.setAttribute('aria-label', on ? t('Tạm dừng') : t('Phát')); if (!i) return; if (i.tagName === 'path') i.setAttribute('d', on ? pd : 'M8 5v14l11-7z'); else i.textContent = on ? 'pause' : 'play_arrow'; },
        time(s) { const p = Math.min(100, s / Math.max(0.1, clip.dur) * 100), b = $('#wBar'), mm = g.MediaTranscript.mmss; if (b) b.style.width = p.toFixed(1) + '%';
          if (sk) { sk.setAttribute('aria-valuenow', String(Math.round(s))); sk.setAttribute('aria-valuetext', mm(s)); }
          const c = $('#wCur'); if (c) c.textContent = mm(s); const tm = $('#wTime'); if (tm) tm.textContent = `${mm(s)} / ${mm(clip.dur)}`; },
        modes() { tabs.forEach(b => { b.setAttribute('aria-selected', String(b.dataset.m === mode)); b.setAttribute('class', b.dataset.m === mode ? tabOn : tabOff); }); root.dataset.mode = mode; },
        pressed: paintTool,
        fold() { P.fold = k === 'watch'; save(P); remount(P.fold ? 'watch-mini' : 'watch'); },
        // người đang nói: sân khấu = chip tên sáng + chấm nhịp; mini = ảnh 2D + "<tên> đang nói"
        speaker(x, live) {
          const a = $('#wChipA'), b = $('#wChipB'), pg = $('#wPing'); if (a && b) { const r = x === who[1]; a.setAttribute('class', r ? chipOff : chipOn); b.setAttribute('class', r ? chipOn : chipOff); if (pg) { (r ? b : a).prepend(pg); pg.hidden = !live; } }
          const m = $('#wTchM'); if (m && x && m.dataset.who !== x) { m.dataset.who = x; m.innerHTML = g.Chars.img(x, { size: 56, alt: '', cls: 'w-full h-full object-cover' }); }
          const s = $('#wSpk'); if (s && x) s.textContent = live ? t('{name} đang nói', { name: g.Chars.name(x) }) : g.Chars.name(x);
        },
      };
    }
    function mountT() {
      T = g.MediaTranscript.mount(U.tr, {
        cues, phrases: clip.phrases, lang: trLang(), showTr: P.tr, skin: U.skin,
        onSeek: (sec, i) => { seek(sec); if (mode === 'shadow' || mode === 'dict') { hold = i; panel(i); } },
        onPlay: i => { playCue(i); if (mode === 'shadow' || mode === 'dict') panel(i); },
        onPhrase: (key, i, btn) => lookup(key, i, btn, clip.phrases[key]),
        onWord: (word, i, span) => lookup(word, i, span, null),
        onGap: () => { const s = T.score(); U.panel.hidden = false; U.panel.innerHTML = `<p class="mp-score">${esc(t('Đúng {n}/{m} chỗ trống', { n: s.ok, m: s.total }))}</p>`; },
      });
      if (!V2 || P.font !== 1) T.setFont(fonts[P.font] || fonts[1]); // khung Stitch: cỡ mặc định = cỡ chữ mẫu
      T.setMode(mode === 'cloze' ? 'cloze' : 'sub');
    }
    function bind() {
      root.addEventListener('click', e => {
        const m = e.target.closest('[data-m]'); if (m && root.contains(m)) return setMode(m.dataset.m);
        const b = e.target.closest('[data-a]'); if (!b || !root.contains(b)) return; const a = b.dataset.a, i = Math.max(0, T.active());
        if (a === 'play') { if (med.paused) med.play().catch(() => {}); else med.pause(); }
        else if (a === 'prev') playCue(med.currentTime - cues[i].start > 1.2 ? i : Math.max(0, i - 1));
        else if (a === 'next') playCue(Math.min(cues.length - 1, i + 1));
        else if (a === 'rate') { const r = RATES[(RATES.indexOf(P.rate || 1) + 1) % RATES.length]; P.rate = r; med.playbackRate = r; b.textContent = rateTxt(r); }
        else if (a === 'font-' || a === 'font+') { P.font = Math.max(0, Math.min(fonts.length - 1, P.font + (a === 'font+' ? 1 : -1))); T.setFont(fonts[P.font]); }
        else if (a === 'loop') { P.loop = !P.loop; U.pressed(b, P.loop); if (P.loop) hold = T.active(); }
        else if (a === 'tr') { P.tr = !P.tr; U.pressed(b, P.tr); T.showTr(P.tr); }
        else if (a === 'view') { P.view = P.view === 'live' ? 'sub' : 'live'; U.pressed(b, P.view === 'live'); root.dataset.view = P.view; }
        else if (a === 'fold') return U.fold(b);
        if (/^(play|prev|next)$/.test(a) && (mode === 'shadow' || mode === 'dict')) panel(hold);
        save(P);
      });
      U.panel.addEventListener('click', onPanel);
      const ml = $('.mp-lang'); if (ml) ml.onchange = e => { P.trLang = e.target.value; save(P); T.setLang(trLang()); };
      const sr = $('.mp-seek'); if (sr) sr.oninput = e => seek(e.target.value / 10);
    }
    // 'Ẩn sân khấu' ↔ 'Hiện sân khấu': dựng lại khung kia, giữ audio đang phát + chế độ + câu đang giữ
    function remount(k) {
      if (rec) rec.stop(); for (const x in tch) tch[x].destroy(); tch = {}; T.destroy(); g.LookupCard.close();
      U = buildV2(k); mountT(); bind(); U.modes(); U.playing(!med.paused); spk = ''; if (mode === 'shadow' || mode === 'dict') panel(hold);
    }

    if (V2) { med = new Audio(); med.preload = 'auto'; med.src = clip.audio; med.playbackRate = P.rate || 1; U = buildV2(P.fold ? 'watch-mini' : 'watch'); } // audio ngoài DOM: đổi khung không ngắt tiếng
    else U = buildM1();
    mountT(); bind();
    function lookup(text, i, el, info) { med.pause(); g.LookupCard.open(el, { text, info, sentence: cues[i] && cues[i].text, sentenceTr: C().trOf(cues[i], trLang()), title: clip.title, lang: trLang() }); }
    function seek(sec) { try { med.currentTime = Math.max(0, sec); } catch (e) { /* bỏ qua */ } }
    const playCue = i => { if (!cues[i]) return; hold = i; seek(cues[i].start); med.play().catch(() => {}); };

    // Bảng chế độ Shadowing/Chính tả cho câu i (sau khi câu phát xong thì dừng chờ người học)
    function panel(i) {
      const p = U.panel, c = cues[i]; if (!c) { p.hidden = true; return; }
      p.hidden = false;
      if (mode === 'shadow') {
        p.innerHTML = `<p class="mp-say" lang="en">${esc(c.text)}</p><div class="row"><button type="button" class="btn" data-p="again">🔊 ${esc(t('Nghe lại'))}</button><button type="button" class="btn primary" data-p="rec">🎤 ${esc(t('Nói theo'))}</button><button type="button" class="btn" data-p="next">${esc(t('Câu tiếp'))} →</button></div><div class="mp-res" aria-live="polite"></div>`;
      } else if (mode === 'dict') {
        p.innerHTML = `<label class="mp-q">${esc(t('Nghe rồi gõ lại câu:'))}<input class="mp-in" autocomplete="off" autocapitalize="off" spellcheck="false" lang="en"></label><div class="row"><button type="button" class="btn" data-p="again">🔊 ${esc(t('Nghe lại'))}</button><button type="button" class="btn primary" data-p="check">${esc(t('Kiểm tra'))}</button><button type="button" class="btn" data-p="next">${esc(t('Câu tiếp'))} →</button></div><div class="mp-res" aria-live="polite"></div>`;
        const inp = p.querySelector('.mp-in'); inp.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); p.querySelector('[data-p=check]').click(); } };
      }
    }
    function onPanel(e) {
      const b = e.target.closest('[data-p]'); if (!b) return; const i = hold, c = cues[i], res = U.panel.querySelector('.mp-res');
      if (b.dataset.p === 'again') playCue(i);
      else if (b.dataset.p === 'next') { if (rec) rec.stop(); if (cues[i + 1]) { panel(i + 1); playCue(i + 1); } else { hold = -1; U.panel.innerHTML = `<p class="mp-score">${esc(t('Hết clip – làm tốt lắm!'))}</p>`; } }
      else if (b.dataset.p === 'check') {
        const r = C().dictation(c.text, U.panel.querySelector('.mp-in').value);
        res.innerHTML = `<p class="mp-diff" lang="en">${r.words.map(x => `<span class="${x.ok ? 'ok' : 'bad'}">${esc(x.w)}</span>`).join(' ')}</p><p class="mp-score">${esc(t('Đúng {n}%', { n: r.score }))}</p>`;
      } else if (b.dataset.p === 'rec') {
        if (rec) { rec.stop(); return; } med.pause();
        if (!g.UI || !g.UI.recognize) { res.textContent = t('Trình duyệt này chưa hỗ trợ ghi âm.'); return; }
        b.classList.add('on'); res.textContent = t('Đang nghe… nói câu trên');
        rec = g.UI.recognize(c.text, 'en-US', {
          result: r => { const gr = C().grade(r.score); res.innerHTML = `<p class="mp-score mp-${gr}">${esc(t({ great: 'Tuyệt vời!', good: 'Khá tốt!', retry: 'Thử lại nhé' }[gr]))} · ${r.score}/100</p><p class="muted small" lang="en">${esc(t('Máy nghe được:'))} “${esc(r.heard)}”</p>${r.audio ? `<audio controls src="${esc(r.audio)}"></audio>` : ''}`; },
          error: code => { res.textContent = code === 'not-allowed' ? t('Hãy cho phép dùng micro để luyện nói.') : t('Chưa nghe rõ – thử lại nhé.'); },
          end: () => { rec = null; b.classList.remove('on'); },
        });
        if (!rec) { b.classList.remove('on'); res.textContent = t('Trình duyệt này chưa hỗ trợ ghi âm.'); }
      }
    }

    function setMode(m) {
      mode = m; root.dataset.mode = m; U.modes();
      T.setMode(m === 'cloze' ? 'cloze' : 'sub'); U.panel.hidden = true;
      if (m === 'shadow' || m === 'dict') { med.pause(); const i = Math.max(0, T.active()); panel(i); playCue(i); }
    }
    med.onplay = () => U.playing(true);
    med.onpause = med.onended = () => { U.playing(false); for (const k in tch) tch[k].talk && tch[k].talk(false); };
    // Esc = thoát màn (như nút ←), trừ khi đang gõ hoặc thẻ tra đang mở (thẻ tự đóng bằng Esc trước)
    const onKey = e => { if (!V2 || e.key !== 'Escape' || e.defaultPrevented || /^(INPUT|TEXTAREA|SELECT)$/.test((e.target && e.target.tagName) || '')) return; e.preventDefault(); goBack(); };
    g.document.addEventListener('keydown', onKey);

    // 1 vòng rAF: transcript + karaoke, lặp câu, dừng sau mỗi câu (Shadowing/Chính tả), giáo viên đang nói
    function tick() {
      if (dead) return; const s = med.currentTime; T.setTime(s);
      const i = T.active(), c = cues[i];
      if (hold >= 0 && (P.loop || mode === 'shadow' || mode === 'dict')) {
        const back = C().loopSeek(cues[hold], s);
        if (back != null) { if (P.loop && mode !== 'shadow' && mode !== 'dict') seek(back); else { med.pause(); seek(cues[hold].end - 0.05); } }
      } else if (P.loop && i >= 0) hold = i;
      const live = !med.paused && c && s < c.end, cw = c ? clip.speakers[c.who] : who[0];
      for (const k in tch) if (tch[k].talk) tch[k].talk(live && cw === k);
      const sk = cw + (live ? '1' : '0'); if (sk !== spk) { spk = sk; U.speaker(cw, !!live); }
      U.time(s);
      raf = requestAnimationFrame(tick);
    }
    tick();
    const bye = () => { dead = true; cancelAnimationFrame(raf); try { med.pause(); } catch (e) { /* bỏ qua */ } if (rec) rec.stop(); for (const k in tch) tch[k].destroy(); T.destroy(); g.LookupCard.close(); g.document.removeEventListener('keydown', onKey); };
    if (w.signal) w.signal.addEventListener('abort', bye, { once: true });
  }
})(self);
