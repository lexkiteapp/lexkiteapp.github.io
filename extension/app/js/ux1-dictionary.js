/* 🎨 Stitch v2.1 "Từ điển" (#/dict, #/dict/<từ>, cờ ux1): khung tự sinh web/js/st/v2/dictionary.js · brand/stitch/v2/bind/dictionary.json. Tải trong gói ux1 (lười, không vào khung app).
 * Bao routes.dict của app.js: cờ ux1 bật → khung Stitch; tắt → trang cũ nguyên vẹn. Dữ liệu = Dict.quick (vẽ nhanh) → Dict.lookup (vẽ đủ) như trang cũ; hàm dùng CHUNG với trang cũ
 * (App.addWord · App.dictPhrases · App.dictRelated · App.notesData · App.savePhraseDialog · App.extCta · App.bindCommon). Giữ MỌI ý trang cũ:
 * tiêu đề + mô tả · #searchForm/#q (Tra từ) · Gần đây (#/dict/…) · thẻ trống (từ mẫu + mẹo add-on) · khung chờ · Không tìm thấy (+ Gợi ý dịch) · lưu 'recent' + thưởng tra từ 1 lần/ngày ·
 * lời mời add-on [data-ext-cta] · từ loại, CEFR, [data-from] (went → go), ảnh (VImg / ảnh tra / emoji), UK/US [data-speak][data-accent][data-url] + IPA (dạng yếu), [data-slow] ·
 * nghĩa (ngôn ngữ nghĩa; en → App.nativeFill) + định nghĩa · cô Ama (Chars still 'explain') + ghi chú 'Dùng khi thi' · #quickSave (+ #dMark) · Luyện phát âm / Chia động từ / Cách dùng ·
 * ví dụ [data-speak-text] · Hay đi với [data-wc-say] + tính từ/danh từ đi kèm (Datamuse → #/dict) · Đồng nghĩa [data-wc-say] / Trái nghĩa (#/dict) · Hiểu sâu: Mẹo nhớ, Lỗi hay gặp,
 * Dùng khi thi, Họ từ (+ ô video) · Nghĩa theo từ loại (Oxford + Wiktionary bổ sung, [data-saysent]) + nguồn · câu song ngữ [data-speak-text] + [data-use-sent] ·
 * #saveCard #ctx #ctxVi #trCtx #saveWord + mức thuộc · #phraseBox [data-speak] [data-add-seed] #addPhr · #related (từ gần nghĩa) · autoSpeak.
 * @icons arrow_back local_fire_department bolt bookmarks search arrow_forward history verified bookmark_add bookmark_added volume_up slow_motion_video psychology add_circle check_circle mic schema menu_book format_quote hub compare_arrows add remove lightbulb psychology_alt cancel school family_history expand_less expand_more close translate arrow_outward edit_note g_translate save chat_bubble travel_explore search_off extension */
(function () {
  const App = window.App; if (!App || !App.routes || !App.routes.dict || !App.dictPhrases || !self.IELTS_DATA) return;
  const { state, routes } = App, old = routes.dict, esc = UI.esc, INDEX = IELTS_DATA.INDEX, Store = Core.Store;
  const on = () => !!(self.ST2 && ST2.dictionary && App.ux1On && App.ux1On());
  const VI = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;
  // class viết tay (biên dịch nhờ V2DATA trong scripts/build-stitch-css.mjs) – màu lấy đúng từ mẫu Stitch sáng/tối, chữ nhỏ đạt AA cả 2 giao diện
  const CARD = 'rounded-[20px] border-2 p-4 flex flex-col gap-3 lt:bg-[#FFFFFF] lt:border-[#EADEC8] lt:shadow-[0_5px_0_#D8CFBC] dk:bg-[#142328] dk:border-[#233942] dk:shadow-[0_5px_0_#0D1A1E]';
  const TXT = 'text-[14px] font-semibold leading-relaxed lt:text-[#0F3D3E] dk:text-[#EEF6F7]', MUT = 'text-[12px] font-semibold lt:text-[#5D7375] dk:text-[#A3B9B7]';
  const CHIP = 'inline-flex items-center px-2.5 py-1 rounded-full border font-extrabold text-[12px] active:translate-y-0.5 lt:bg-[#FFFFFF] lt:border-[#EADEC8] lt:text-[#0D6964] lt:shadow-[0_3px_0_#D8CFBC] dk:bg-[#123438] dk:border-[#2BA39A]/50 dk:text-[#4FD1C5] dk:shadow-[0_3px_0_#0D1A1E]';
  const TAG = 'px-2.5 py-1.5 rounded-xl border text-[13px] font-bold inline-flex items-center gap-1 lt:bg-[#F8F3E8] lt:border-[#EADEC8] lt:text-[#0F3D3E] lt:shadow-[0_3px_0_#D8CFBC] dk:bg-[#192E36] dk:border-[#233942] dk:text-[#EEF6F7] dk:shadow-[0_3px_0_#0D1A1E]';
  const ICO = "relative after:absolute after:-inset-2 after:content-[''] inline-flex w-7 h-7 shrink-0 rounded-full items-center justify-center align-middle active:translate-y-0.5 lt:bg-[#0D6964] lt:text-white dk:bg-[#2BA39A] dk:text-[#0B171A]";
  const HL = 'font-bold underline decoration-2 lt:text-[#0D6964] dk:text-[#4FD1C5]', BADGE = 'w-10 h-10 rounded-full flex items-center justify-center lt:bg-[#E6F5F4] lt:text-[#0D6964] dk:bg-[#123438] dk:text-[#4FD1C5]';
  const PRI = 'inline-flex items-center justify-center gap-1 min-h-[44px] px-4 rounded-xl font-extrabold text-[13px] active:translate-y-0.5 lt:bg-[#0D6964] lt:text-white lt:shadow-[0_2px_0_#12514D] dk:bg-[#2BA39A] dk:text-[#0B171A] dk:shadow-[0_2px_0_#0A2528]';
  const ms = (n, c = 'text-[16px]') => `<span class="material-symbols-rounded ${c}" aria-hidden="true">${n}</span>`;
  const say = (a, v, label) => `<button type="button" class="${ICO}" ${a}="${esc(v)}" aria-label="${esc(label)}">${ms('volume_up')}</button>`;
  const hl = (s, w) => UI.highlight(s, w).replace(/<mark>/g, `<span class="${HL}">`).replace(/<\/mark>/g, '</span>');
  const posL = p => p ? String(UI.posChip(p)).replace(/<[^>]+>/g, '').trim() : '';
  // cụm tiếng Anh trong ngoặc của ghi chú (tiếng Việt) → đậm, lang=en (như WordCard)
  const quotes = s => esc(s).replace(/(^|[\s(])(['‘“"]|&#39;|&quot;)([^'’”"&]{2,80}?)(['’”"]|&#39;|&quot;)(?=[\s.,;:!?)]|$)/g, (m, a, o, x, c) => VI.test(x) ? m : `${a}${o}<b class="${HL}" lang="en">${x}</b>${c}`);
  const card = (icon, inner) => `<section class="${CARD} items-center text-center" data-d-empty>${icon ? `<span class="${BADGE}">${ms(icon, 'text-[22px]')}</span>` : ''}${inner}</section>`;

  // 4 mục "Hiểu sâu" từ ghi chú thô {m, e, u, f} (js/notes/<chữ>.json) – mở sẵn Mẹo nhớ + Lỗi hay gặp như mẫu
  const notesOf = (n, word) => {
    const W = window.WordCard; if (!n || !W) return [];
    const out = [];
    if (n.m) out.push({ k: 'm', icon: 'psychology_alt', label: t('Mẹo nhớ'), open: true, bodyH: quotes(n.m), rows: [] });
    if (n.e) { const { pairs, notes } = W.parseErrors(n.e), L = x => VI.test(x) ? '' : 'en';
      out.push({ k: 'e', icon: 'cancel', label: t('Lỗi hay gặp'), open: true, bodyH: notes.map(quotes).join('<br>'),
        rows: pairs.length ? pairs.flatMap(p => [{ k: 'w', t: p.wrong, why: p.wn, lang: L(p.wrong) }, { k: 'r', t: p.right, why: p.rn, lang: L(p.right) }]).concat(notes.map(x => ({ k: 'n', t: x }))) : [] }); }
    if (n.u) out.push({ k: 'u', icon: 'school', label: t('Dùng khi thi'), open: false, rows: [],
      bodyH: `<ul class="flex flex-col gap-1.5">${W.parseUsage(n.u).map(x => `<li>${x.tag ? `<b class="font-extrabold lt:text-[#0D6964] dk:text-[#4FD1C5]" lang="en">${esc(x.tag)}</b> ` : ''}${quotes(x.text)}</li>`).join('')}</ul>` });
    if (n.f) out.push({ k: 'f', icon: 'family_history', label: t('Họ từ'), open: false, rows: [],
      bodyH: `<div class="flex flex-wrap gap-1.5">${W.parseFamily(n.f, word).map(x => x.w ? `<button type="button" class="${TAG}" data-wc-say="${esc(x.w.split('/')[0].trim())}" title="${esc(t('Chạm để nghe · chạm lần nữa để tra nghĩa'))}"><span lang="en">${esc(x.w)}</span>${x.pos ? `<span class="text-[10px] font-extrabold lt:text-[#0D6964] dk:text-[#4FD1C5]">${esc(x.pos)}</span>` : ''}</button>` : `<span>${esc(x.text)}</span>`).join('')}</div>` });
    return out;
  };
  // Nghĩa theo từ loại: như trang cũ (Oxford/Cambridge: nghĩa Việt + định nghĩa Anh + ví dụ của chính nghĩa đó) + Wiktionary bổ sung (nhãn Wiktionary)
  const VIP = { 'danh từ': 'noun', 'động từ': 'verb', 'tính từ': 'adjective', 'trạng từ': 'adverb', 'giới từ': 'preposition', 'liên từ': 'conjunction', 'đại từ': 'pronoun', 'thán từ': 'interjection', 'từ hạn định': 'determiner', 'viết tắt': 'abbreviation', 'cụm từ': 'phrase' };
  const groupsOf = e => {
    const key = p => { p = String(p || '').toLowerCase(); return VIP[p] || p; }, G = [], by = {}, grp = p => by[p] || (by[p] = G[G.push({ pos: p, vi: [], defs: [] }) - 1]);
    if (I18N.meanLang() === 'vi') (e.senses || []).forEach(x => { grp(key(x.pos)).vi = x.terms; });
    (e.oxford || []).forEach(m => { const g2 = grp(key(m.pos)); g2.defs = g2.defs.concat(m.defs); });
    if (!(e.oxford || []).length) (e.meanings || []).forEach(m => { const g2 = grp(key(m.pos)); g2.defs = g2.defs.concat(m.defs.slice(0, 3)); });
    const rows = defs => defs.flatMap(d => [{ k: 'd', t: d.def }].concat(d.ex ? [{ k: 'x', h: `“${hl(d.ex, e.word)}” ${say('data-saysent', d.ex, t('Nghe cả câu'))}` }] : []));
    const list = G.filter(x => x.vi.length || x.defs.length).map(x => ({ headH: esc(I18N.lang() === 'vi' ? Object.keys(VIP).find(k => VIP[k] === x.pos) || x.pos : x.pos) + (x.vi.length ? ` • <span>${x.vi.map(esc).join(', ')}</span>` : ''), chip: '', rows: rows(x.defs.slice(0, 4)) }));
    const wik = (e.meanings || []).length && (e.oxford || []).length ? e.meanings.map(m => ({ headH: esc(t(m.pos)), chip: 'Wiktionary', rows: rows(m.defs) })) : [];
    return { list, all: list.concat(wik) };
  };

  routes.dict = App.guard(async function (q) {
    if (!on()) return old.apply(this, arguments);
    const fastP = q ? Dict.quick(q) : null, vimgP = App.vimgReady(q ? [q] : null);
    const w = App.W, recent = await w(Store.get('recent', [])), view = App.view;
    const same = () => Dict.normWord(decodeURIComponent((location.hash.split('/')[2] || '').split('?')[0])) === Dict.normWord(q);
    const base = () => ({
      title: t('Từ điển Anh – Việt'), sub: t('Định nghĩa Oxford Languages · phiên âm UK/US · câu song ngữ · collocation · từ liên quan'), backL: t('Trở về trang trước'), deckL: t('Sổ từ'),
      q: q || '', ph: t('Nhập từ tiếng Anh, ví dụ: sustainable'), findL: t('Tra từ'), recent, emptyH: '', skelH: '', word: '', final: false,
      accs: [], cols: [], syns: [], notes: [], groups: [], sents: [], dots: [], phrs: [], rels: [],
      extH: `<section class="${CARD}" data-ext-cta="app" hidden><p class="${TXT}"><b>🧩 ${t('Tra từ ngay trên mọi trang web')}</b></p><p class="${MUT}">${t('Bấm đúp vào bất kỳ từ nào khi đọc để xem nghĩa, phiên âm và lưu vào flashcard – với add-on Lexkite cho Chrome.')}</p><a class="${PRI} self-start" data-ext-cta="app" hidden>${ms('extension')}<span>${t('Thêm vào Chrome')}</span></a></section>`,
    });
    let D = base(), root = null;
    const mount = after => {
      if (w.stale()) return;
      const a = document.activeElement, typing = a && a.id === 'q' ? [a.value, a.selectionStart] : null;
      root = ST2.mount(view, 'dictionary', D, 'train');
      { const sh = root.querySelector(':scope > header'); if (sh && root.querySelector(':scope > div > header')) sh.remove(); } // mẫu có đầu trang riêng (quay lại + tiêu đề + chuỗi/XP + Sổ từ) → bỏ đầu trang shell cố định đang che nó; thanh tab dưới giữ
      const $r = s => root.querySelector(s);
      $r('#dBack').onclick = () => { if (history.length > 1) history.back(); else location.hash = '#/train'; };
      $r('#searchForm').onsubmit = ev => { ev.preventDefault(); const v = $r('#q').value.trim(); if (v) location.hash = `#/dict/${encodeURIComponent(v)}`; };
      if (typing) { const i = $r('#q'); i.value = typing[0]; i.focus(); try { i.setSelectionRange(typing[1], typing[1]); } catch (x) { /* bỏ qua */ } }
      App.extCta(); // hiện thẻ add-on (Chromium máy tính, chưa cài) – js/ext-cta.js quyết định
      if (after) after($r);
    };
    if (!q) {
      D.emptyH = card('menu_book', `<h3 class="text-[18px] font-extrabold lt:text-[#0F3D3E] dk:text-[#EEF6F7]">${t('Tra bất kỳ từ tiếng Anh nào')}</h3><p class="${MUT}">${t('Phiên âm UK/US, nghĩa tiếng Việt theo từ loại, định nghĩa Oxford Languages, câu ví dụ song ngữ, hình minh họa — rồi lưu vào flashcard kèm câu ngữ cảnh của riêng bạn.')}</p>
        <div class="flex flex-wrap justify-center gap-1.5" data-d-samples>${['resilient', 'mitigate', 'phenomenon', 'detrimental', 'ubiquitous', 'paradigm'].map(s => `<a class="${CHIP}" href="#/dict/${s}" lang="en">${s}</a>`).join('')}</div>
        <p class="${MUT}">💡 ${t('Cài <b>add-on Chrome</b> để bấm đúp vào từ hoặc bôi đen câu trên bất kỳ trang web nào.')}</p>`);
      mount($r => $r('#q').focus());
      return;
    }
    App.notesReady(q); // tải khối "Hiểu sâu" song song với tra từ
    D.emptyH = UI.skel(t('Đang tra “{q}”…', { q: esc(q) }), 4); mount();
    let spoke = false;
    const fast = await w(fastP); await vimgP;
    if (!same()) return;
    if (fast) paint(fast, false, null);
    const full = await w(Dict.lookup(q));
    if (!same()) return;
    if (!full || !full.found) {
      if (!fast) { D = base(); D.emptyH = card('search_off', `<p class="${TXT}">${t('Không tìm thấy “{q}”.', { q: esc(q) })}${full && full.vi ? ' ' + t('Gợi ý dịch: <b>{vi}</b>', { vi: esc(full.vi) }) : ''}</p><p class="${MUT}">${t('Kiểm tra chính tả hoặc kết nối mạng.')}</p>`); mount(); }
      return;
    }
    Store.set('recent', [full.word, ...recent.filter(r => r !== full.word)].slice(0, 8));
    if (App.dictSeen(Core.todayKey() + ':' + full.word)) App.reward({ lookups: 1 });
    App.extCta().then(x => x && x.lookup({ text: t('Bạn vừa tra vài từ. Với add-on Lexkite, bạn tra được ngay trên mọi trang web mình đọc – miễn phí.'), btn: t('Thêm vào Chrome'), close: t('Đóng') }));
    // chờ ghi chú "Hiểu sâu" (tải song song, tối đa 1,5 s) rồi mới vẽ bản đủ → khối nằm sẵn, không chèn muộn phía trên ô lưu
    const notes = await w(Promise.race([Promise.all([App.notesData(full.word), App.need('wordcard').catch(() => {})]).then(([n]) => n), new Promise(r => setTimeout(() => r(null), 1500))]));
    if (!same()) return;
    paint(full, true, notes);

    function paint(e, final, notes) {
      const keep = view.querySelector('#ctx') ? view.querySelector('#ctx').value : '';
      const cd = state.cards[e.word], ml = I18N.meanLang(), L = ml === 'en' ? I18N.lang() : ml, ex0 = [].concat(e.ex || [])[0] || '';
      const vh = App.vimg(e.word, e.pos, App.meanOf(e), { w: 64, photo: true }, ex0);
      const picH = vh || (e.image ? `<img class="absolute inset-0 w-full h-full object-cover" src="${esc(e.image)}" alt="${esc(e.word)}" loading="lazy" referrerpolicy="no-referrer">${e.imageCredit ? `<a class="absolute bottom-0 end-0 px-1 text-[10px] leading-4 rounded-tl bg-black/60 text-white" href="${esc(/^https?:\/\//i.test(String(e.imageCredit.link || '')) ? e.imageCredit.link : '#')}" target="_blank" rel="noopener" title="${esc(e.imageCredit.text)}">ⓘ</a>` : ''}` : `<span class="text-[32px] leading-none" aria-hidden="true">${esc(e.emoji || '📘')}</span>`);
      const u = notes && notes.u && window.WordCard ? WordCard.parseUsage(notes.u)[0] : null;
      const verb = window.LK_VERBS && LK_VERBS.verbOf(e), usage = window.LK_USAGE_IDX && LK_USAGE_IDX.w[e.word.toLowerCase()];
      const G = groupsOf(e);
      D = Object.assign(base(), {
        word: e.word, final, card: !!cd, saved: !!cd, pos: posL(e.pos), level: e.level || '', from: e.from ? `${e.from} → ${e.word}` : '', picH,
        saveL: cd ? t('Đã có trong flashcard') : t('Lưu flashcard'),
        accs: UI.accOrder().map((a, i) => ({ a, lb: a === 'en-US' ? 'US' : 'UK', name: t(a === 'en-US' ? 'Giọng Mỹ' : 'Giọng Anh'), aria: t(a === 'en-US' ? 'Nghe giọng Anh–Mỹ' : 'Nghe giọng Anh–Anh'), url: UI.audioFor(e, a), ipaH: UI.ipaHtml(e, a, { noEx: i > 0 }) })),
        slowL: t('Nghe chậm'), ml: L.toUpperCase(), mlLang: L, vi: ml === 'en' ? '' : e.vi, viRow: ml !== 'en' ? !!e.vi : L !== 'vi' && L !== 'en', def: e.def || '', /* nghĩa tiếng Anh thuần (người học en) → không có dòng nghĩa bản ngữ, như trang cũ */
        tch: Chars.img('ama', { kind: 'still', pose: 'explain', cls: 'absolute inset-0 w-full h-full object-cover object-bottom pointer-events-none select-none', alt: '', size: 96 }), // teacher-pose-map: Ama "explain" – giải thích cách dùng từ
        noteH: u ? (u.tag ? `<b class="font-extrabold" lang="en">${esc(u.tag)}:</b> ` : '') + quotes(u.text) : '',
        speakHref: `#/practice/speak?w=${encodeURIComponent(e.word)}`, practL: t('Luyện phát âm'), verbHref: verb ? `#/verb/${encodeURIComponent(verb)}` : '', verbL: t('Chia động từ'), useHref: usage ? `#/usage/${encodeURIComponent(e.word.toLowerCase())}` : '', useL: t('Cách dùng'),
        ex: e.ex || '', exL: t('Ví dụ'), exH: e.ex ? `“${hl(e.ex, e.word)}”` : '', exVi: '', sayL: t('Nghe cả câu'),
        colL: t('Hay đi với'), tapL: t('Chạm để nghe · chạm lần nữa để tra nghĩa'), antL: t('Trái nghĩa:'), cols: (e.col || []).map(c => ({ w: c, pos: '' })), syns: (e.syn || []).map(s => ({ w: s })),
        deepL: t('Hiểu sâu'), notes: final ? notesOf(notes, e.word) : [], lvH: final && window.WordCard ? WordCard.notes(null, e.word) : '',
        wrongSr: `<span class="sr-only">${t('Sai')}: </span>`, rightSr: `<span class="sr-only">${t('Đúng')}: </span>`,
        groups: G.all, srcH: G.list.length ? `<p class="text-[11px] font-semibold lt:text-[#5D7375] dk:text-[#A3B9B7]">${t('Nguồn: Oxford Languages (qua Google), Wiktionary')}</p>` : '',
        sentL: t('Câu ví dụ song ngữ'), sents: (e.sentences || []).map(s => ({ en: s.en, enH: `${hl(s.en, e.word)} ${say('data-speak-text', s.en, t('Nghe cả câu'))}`, vi: s.vi, src: s.auto ? t('Oxford · dịch máy') : 'Tatoeba' })),
        ctxT: cd ? t('Thêm ngữ cảnh cho từ này') : t('Lưu vào flashcard kèm ngữ cảnh'), ctxP: t('Câu bạn gặp từ này (bài đọc, phim, báo…) – ngữ cảnh giúp nhớ lâu gấp nhiều lần'),
        ctxPh: t('Dán câu có chứa “{w}”…', { w: e.word }), mastL: t('Mức thuộc'), dots: cd ? [1, 2, 3].map(i => i <= Core.SRS.mastery(cd.srs)) : [], ctxN: cd ? t('{n} ngữ cảnh', { n: (cd.contexts || []).length }) : '',
        ctxViH: '<div id="ctxVi" class="text-[12px] font-semibold lt:text-[#5D7375] dk:text-[#A3B9B7]" aria-live="polite"></div>', saveWordL: cd ? t('Thêm ngữ cảnh') : t('Lưu vào flashcard'),
        phrL: t('Cụm từ & cấu trúc với “{w}”', { w: e.word }), addPhrL: t('Lưu cụm / cấu trúc của bạn'), savePhL: t('Lưu cụm'), savedL: t('Đã lưu'),
        relL: t('Từ gần nghĩa:').replace(/[:：]\s*$/, ''),
        skelH: final ? '' : UI.skel(t('Đang tra “{q}”…', { q: esc(e.word) }), 3), // ô lưu kèm ngữ cảnh chỉ có ở lần vẽ ĐỦ (không xô bố cục khi đang gõ – như trang cũ)
      });
      setPhr(e, null);
      mount($r => bind($r, e, final, cd, keep));
      if (!spoke && state.settings.autoSpeak) { spoke = true; UI.speak(e.word, state.settings.accent, UI.audioFor(e, state.settings.accent)); }
      if (!final) return;
      if (window.Lex) Lex.phrases(e.word).then(l => { if (l && l.length && same() && view.querySelector('#phraseBox')) { setPhr(e, l); swap('#phraseBox', 'phr', e); } }).catch(() => {}); // cụm từ theo mảnh (không nạp 2,3 MB gói từ)
      App.dictRelated(e).then(r => { if (!same() || !view.querySelector('#related')) return; // Datamuse: tính từ/danh từ đi kèm → Hay đi với; trái nghĩa → Đồng nghĩa & trái nghĩa; gần nghĩa → #related
        const ws = e.word, pA = posL('adj'), pN = posL('n');
        D.cols = D.cols.concat(r.jjb.map(x => ({ w: `${x.word} ${ws}`, pos: pA, href: `#/dict/${encodeURIComponent(x.word)}`, title: t('Tính từ hay đi với “{w}”:', { w: ws }) })), r.jja.map(x => ({ w: `${ws} ${x.word}`, pos: pN, href: `#/dict/${encodeURIComponent(x.word)}`, title: t('Danh từ hay đi sau:') })));
        D.syns = D.syns.concat(r.ant.map(x => ({ w: x.word, ant: true })));
        D.rels = r.mlf.map(x => ({ w: x.word, lv: (INDEX[x.word] || {}).level || '' }));
        swap('#dCol', 'col', e); swap('#related', 'rel', e);
      });
    }
    function setPhr(e, lx) {
      const { lib, mine } = App.dictPhrases(e, lx), exH = x => (x.ex ? `<p class="text-[11px] italic lt:text-[#5D7375] dk:text-[#A3B9B7]" lang="en">“${hl(x.ex, x.word)}”</p>` : '') + (x.note ? `<p class="text-[11px] lt:text-[#5D7375] dk:text-[#A3B9B7]">📐 ${esc(x.note)}</p>` : '');
      D.phrs = lib.map(x => ({ word: x.word, vi: x.vi || '', exH: exH(x), sayH: say('data-speak', x.word, t('Phát âm')), saved: App.inDeck(x.word) })).concat(mine.map(c => ({ word: c.word, vi: c.vi || '', exH: exH(c), sayH: say('data-speak', c.word, t('Phát âm')), saved: true })));
      D.phrEmptyH = D.phrs.length ? '' : `<p class="${MUT}">${t('Chưa có cụm nào trong thư viện. Mẹo: <b>bôi đen một cụm trong câu ví dụ</b> phía trên rồi bấm “🧩 Lưu cụm này”.')}</p>`;
    }
    // khối về muộn (Lex / Datamuse): vẽ lại ĐÚNG khối đó từ phần khung có tên (ST2.dictionary(d).<phần>) – không vẽ lại cả trang (giữ chữ đang gõ trong #ctx)
    function swap(sel, part, e) {
      const el = view.querySelector(sel); if (!el) return;
      const box = document.createElement('div'); box.innerHTML = ST2.dictionary(Object.assign({ hdr: ST2.hdr(), tabs: [] }, D))[part]; const nu = box.firstElementChild; if (!nu) return;
      el.replaceWith(nu); App.bindCommon(); if (part === 'phr') bindPhr(nu, e);
    }
    function bindPhr(box, e) { const b = box.querySelector('#addPhr'); if (b) b.onclick = () => App.savePhraseDialog({ phrase: e.word + ' ', sentence: e.ex || '' }); }
    function bind($r, e, final, cd, keep) {
      App.bindCommon();
      if (I18N.meanLang() === 'en') App.nativeFill($r('#dVi'), e.word, e.pos);
      const qs = $r('#quickSave'), mk = $r('#dMark');
      if (cd) { qs.disabled = true; mk.disabled = true; }
      $$('[data-wn-h]', root).forEach(h => h.onclick = () => { const b = root.querySelector(`[data-wn-b="${h.dataset.wnH}"]`), op = h.getAttribute('aria-expanded') !== 'true';
        b.style.display = op ? '' : 'none'; h.setAttribute('aria-expanded', String(op)); const ic = h.querySelector(':scope > span'); if (ic) ic.textContent = op ? 'expand_less' : 'expand_more'; });
      if (!final) { const q1 = async () => { await App.addWord(e, null); UI.toast(t('Đã lưu “{w}” vào flashcard', { w: e.word })); routes.dict(e.word); }; if (!cd) { qs.onclick = q1; mk.onclick = q1; } return; } // lần vẽ nhanh: chưa có ô ngữ cảnh
      const ctx = $r('#ctx'), out = $r('#ctxVi'); if (keep) ctx.value = keep;
      let ctxVi = '';
      const trCtx = async () => {
        const text = ctx.value.trim(); if (!text) return '';
        out.textContent = '⏳ ' + t('Đang dịch…');
        const ml = I18N.meanLang() || 'vi', ul = I18N.lang() || 'vi', tl = ml === 'vi' ? 'vi' : (ul !== 'en' ? ul : 'vi');
        ctxVi = tl === 'vi' ? await Dict.translateVi(text) : await Dict.translateTo(text, tl);
        out.textContent = ctxVi ? `${I18N.flag ? I18N.flag(tl) : (tl === 'vi' ? '🇻🇳' : '🌐')} ${ctxVi}` : t('Không dịch được câu này.');
        return ctxVi;
      };
      $r('#trCtx').onclick = trCtx;
      ctx.oninput = () => { ctxVi = ''; out.textContent = ''; };
      $$('[data-use-sent]', root).forEach(b => b.onclick = () => { const s = e.sentences.find(x => x.en === b.dataset.useSent); ctx.value = s.en; ctxVi = s.vi; out.textContent = `🇻🇳 ${s.vi}`; $r('#saveCard').scrollIntoView({ behavior: 'smooth', block: 'center' }); });
      const save = async () => {
        const text = ctx.value.trim(); if (text && !ctxVi) await trCtx();
        await App.addWord(e, text ? { text, vi: ctxVi, source: '', title: 'Ghi chú của bạn' } : null);
        UI.toast(cd ? t('Đã cập nhật thẻ') : t('Đã lưu “{w}” vào flashcard', { w: e.word }));
        location.hash === `#/dict/${encodeURIComponent(e.word)}` ? routes.dict(e.word) : (location.hash = `#/dict/${encodeURIComponent(e.word)}`);
      };
      $r('#saveWord').onclick = save;
      if (!cd) { qs.onclick = save; mk.onclick = save; }
      bindPhr($r('#phraseBox'), e);
    }
    function $$(s, r) { return [...r.querySelectorAll(s)]; }
  });
})();
