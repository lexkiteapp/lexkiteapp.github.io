/* 📖 Trang Từ điển (#/dict, #/dict/<từ>): tra nhanh + đầy đủ, thẻ lưu kèm câu ngữ cảnh, cụm từ chứa từ, từ liên quan (Datamuse).
 * Tách khỏi app.js (khung app) 01/11 – chỉ nạp khi mở trang: gói 'dictp' (ROUTE_BUNDLE.dict trong app.js). Khóa test: scripts/test/shell-lazy.mjs */
(function () {
  const { Store, todayKey } = Core;
  const { INDEX } = IELTS_DATA;
  const { $, $$, esc, highlight, toast, modal, closeModal, speak, pic, levelChip, posChip } = UI;
  const App = window.App;
  const { state, routes, view, inDeck, masteryDots, reward, addWord } = App;
  const parseHash = () => App.parseHash(), extCta = () => App.extCta(), bindCommon = after => App.bindCommon(after);

  // ================= TỪ ĐIỂN =================
  const lookedUp = new Set();
  routes.dict = App.guard(async function (q) {
    const fastP = q ? Dict.quick(q) : null, vimgP = App.vimgReady(q ? [q] : null); // tra song song với đọc 'recent' (từ trong kho: vài ms) + chỉ mục ảnh (cờ bật)
    const w = App.W, recent = await w(Store.get('recent', []));
    view.innerHTML = `
      <div class="page-head"><div><h1>${t('Từ điển Anh – Việt')}</h1><p class="muted">${t('Định nghĩa Oxford Languages · phiên âm UK/US · câu song ngữ · collocation · từ liên quan')}</p></div></div>
      <form class="search" id="searchForm" autocomplete="off">
        <input class="input" id="q" placeholder="${t('Nhập từ tiếng Anh, ví dụ: sustainable')}" value="${esc(q)}" spellcheck="false" autocapitalize="off" autocorrect="off">
        <button class="btn primary lg">${t('Tra từ')}</button>
      </form>
      ${recent.length ? `<div class="row small" style="margin-top:.7rem"><span class="muted">${t('Gần đây:')}</span>${recent.map(r => `<a class="chip" href="#/dict/${encodeURIComponent(r)}">${esc(r)}</a>`).join('')}</div>` : ''}
      <div id="result"${q ? ' class="dict-res"' : ''} style="margin-top:1.25rem"></div>
      <div class="ext-card" data-ext-cta="app" hidden><div><b>🧩 ${t('Tra từ ngay trên mọi trang web')}</b><p class="small muted">${t('Bấm đúp vào bất kỳ từ nào khi đọc để xem nghĩa, phiên âm và lưu vào flashcard – với add-on Lexkite cho Chrome.')}</p></div><a class="btn sm primary" data-ext-cta="app" hidden>${t('Thêm vào Chrome')}</a></div>`;
    extCta();
    $('#searchForm').onsubmit = e => { e.preventDefault(); const v = $('#q').value.trim(); if (v) location.hash = `#/dict/${encodeURIComponent(v)}`; };
    if (!q) {
      $('#q').focus();
      const sample = ['resilient', 'mitigate', 'phenomenon', 'detrimental', 'ubiquitous', 'paradigm'];
      $('#result').innerHTML = `<div class="card empty"><div class="em">📖</div><h3>${t('Tra bất kỳ từ tiếng Anh nào')}</h3><p>${t('Phiên âm UK/US, nghĩa tiếng Việt theo từ loại, định nghĩa Oxford Languages, câu ví dụ song ngữ, hình minh họa — rồi lưu vào flashcard kèm câu ngữ cảnh của riêng bạn.')}</p>
        <div class="row center" style="margin-top:1rem">${sample.map(s => `<a class="chip" href="#/dict/${s}">${s}</a>`).join('')}</div>
        <p class="small" style="margin-top:1rem">💡 ${t('Cài <b>add-on Chrome</b> để bấm đúp vào từ hoặc bôi đen câu trên bất kỳ trang web nào.')}</p></div>`;
      return;
    }
    App.notesReady(q); // tải khối "Hiểu sâu" song song với tra từ (lần vẽ đủ chờ nó – xem dưới)
    $('#result').innerHTML = UI.skel(t('Đang tra “{q}”…', { q: esc(q) }), 4); // khung chờ hình mục từ (từ · phiên âm · nghĩa) thay vì ⏳
    // Hiện kết quả nhanh trước (nghĩa, phiên âm), rồi bổ sung âm thanh, hình, câu ví dụ
    let spoke = false;
    const same = () => Dict.normWord(parseHash().arg) === Dict.normWord(q);
    if (App.cxWant) App.cxWant(phraseLib({ word: Dict.normWord(q) }).map(x => x.vi)); // nghĩa cụm từ (tiếng Việt, chờ dịch) đi dịch song song với tra từ – lần vẽ đủ hiện ngay bằng ngôn ngữ người học
    const fast = await w(fastP); await vimgP;
    if (!same()) return;
    if (fast) paint(fast, false);
    const full = await w(Dict.lookup(q));
    if (!same()) return;
    if (!full || !full.found) {
      if (!fast) $('#result').innerHTML = `<div class="card empty"><div class="em">🤔</div><p>${t('Không tìm thấy “{q}”.', { q: esc(q) })}${full && full.vi ? ' ' + t('Gợi ý dịch: <b>{vi}</b>', { vi: esc(full.vi) }) : ''}</p><p class="small">${t('Kiểm tra chính tả hoặc kết nối mạng.')}</p></div>`;
      return;
    }
    Store.set('recent', [full.word, ...recent.filter(r => r !== full.word)].slice(0, 8));
    const lk = todayKey() + ':' + full.word;
    if (!lookedUp.has(lk)) { lookedUp.add(lk); reward({ lookups: 1 }); }
    extCta().then(x => x && x.lookup({ text: t('Bạn vừa tra vài từ. Với add-on Lexkite, bạn tra được ngay trên mọi trang web mình đọc – miễn phí.'), btn: t('Thêm vào Chrome'), close: t('Đóng') }));
    // Chờ khối "Hiểu sâu" (đã tải song song từ lần vẽ nhanh, tối đa 1,5 s) rồi mới vẽ bản đủ → khối nằm sẵn trong lần vẽ, không chèn muộn phía trên ô lưu
    await Promise.race([App.notesReady(full.word), new Promise(r => setTimeout(r, 1500))]);
    if (!same()) return;
    paint(full, true);

    function paint(e, final) {
    const keep = $('#ctx') ? $('#ctx').value : '';
    const card = state.cards[e.word];

    const ex0 = String([].concat(e.ex || [])[0] || '').trim(), sameEx = x => String(x || '').trim().toLowerCase() === ex0.toLowerCase(), exS = ex0 ? (e.sentences || []).find(s => sameEx(s.en)) : null; // một câu chỉ hiện MỘT lần: câu chính dưới nghĩa (kèm bản dịch nếu kho câu đã có) – bỏ khỏi khu dưới
    const sents = (e.sentences || []).filter(s => s !== exS), noDup = d => d.ex && !sameEx(d.ex);
    const vh = App.vimg(e.word, e.pos, App.meanOf(e), { w: 'dict', photo: true, capt: false }, ex0); // ảnh (đúng từ#loại) + capt:false: câu nằm ở khối Ví dụ của cột nội dung, không lặp dưới ảnh
    const media = vh || (e.image || e.emoji ? pic(e) : ''); // không ảnh → không ô: chữ dùng hết bề ngang (lưới .entry-head cột auto, ảnh ẩn ở chế độ tối cũng co về 0)
    const ib = window.LK_VERBS && LK_VERBS.verbOf(e), ir = ib && LK_VERBS.isIrregular(ib) ? LK_VERBS.forms(ib) : null; // động từ bất quy tắc: dòng gọn go · went · gone → #/irregular/<động từ>
    $('#result').innerHTML = `
      <div class="card">
        <div class="entry-head">
          <div class="entry-title row"><span class="entry-word" lang="en">${esc(e.word)}</span>${posChip(e.pos)}${levelChip(e.level)}${e.from ? `<span class="chip" data-from lang="en">${esc(e.from)} → ${esc(e.word)}</span>` : ''}</div>
          <div class="pron">
            ${UI.pronHtml(e, { pills: true })}
            <span><b class="small">${UI.icon('turtle')} ${t('Chậm')}</b><button class="icon-btn sm" data-slow="${esc(e.word)}" title="${t('Nghe chậm')}" aria-label="${t('Nghe chậm')}">${UI.icon('volume-2')}</button></span>
          </div>
          <div class="entry-mean">
            ${I18N.meanLang() === 'en' ? '<div class="vi wi-native" data-dnative></div>' : `<div class="vi">${esc(e.vi)}</div>`}
            ${e.def ? `<div style="margin-top:.4rem" lang="en">${esc(e.def)}</div>` : ''}
          </div>
          ${ex0 ? `<div class="example-box entry-ex">
            <div class="entry-ex-h"><span class="set-h">${UI.icon('book-open')} ${t('Ví dụ')}</span><button class="icon-btn sm" data-speak-text="${esc(ex0)}" title="${t('Nghe cả câu')}" aria-label="${t('Nghe cả câu')}">${UI.icon('volume-2')}</button></div>
            <div lang="en" dir="ltr">${highlight(ex0, e.word)}</div>
            ${exS ? `<div class="muted small" style="margin-top:.25rem">${esc(exS.vi)} <span class="chip">${exS.auto ? t('Oxford · dịch máy') : 'Tatoeba'}</span></div>
            <button class="btn sm ghost" data-use-sent="${esc(exS.en)}" style="margin-top:.35rem">${UI.icon('pin')} ${t('Dùng làm ngữ cảnh')}</button>` : ''}
          </div>` : ''}
          <div class="entry-actions">
            ${card ? `<span class="btn entry-saved">${UI.icon('circle-check')} ${t('Đã có trong flashcard')}</span>` : `<button class="btn primary" id="quickSave">+ ${t('Lưu flashcard')}</button>`}
            <a class="btn" href="#/practice/speak?w=${encodeURIComponent(e.word)}">${UI.icon('mic')} ${t('Luyện phát âm')}</a>
            ${window.LK_VERBS && LK_VERBS.verbOf(e) ? `<a class="btn" href="#/verb/${encodeURIComponent(LK_VERBS.verbOf(e))}">${UI.icon('a-large-small')} ${t('Chia động từ')}</a>` : ''}${window.LK_USAGE_IDX && LK_USAGE_IDX.w[e.word.toLowerCase()] ? `<a class="btn" href="#/usage/${encodeURIComponent(e.word.toLowerCase())}">${UI.icon('book-a')} ${t('Cách dùng')}</a>` : ''}
          </div>
          ${ir ? `<a class="chip" href="#/irregular/${encodeURIComponent(ir.base)}" lang="en" translate="no" style="margin-top:.5rem">${esc([ir.base, ir.past.map(x => x.w).join('/'), ir.pp.map(x => x.w).join('/')].join(' · '))}</a>` : ''}
          ${media}
        </div>
        ${App.chipsHtml(e.col, '🔗', t('Hay đi với'))}${App.chipsHtml(e.syn, '≈', t('Đồng nghĩa'))}
        ${App.notesHtml(e.word)}
        ${(() => { // Gom theo từ loại như Oxford/Cambridge: mỗi từ loại = nghĩa Việt + định nghĩa Anh + ví dụ của chính nghĩa đó
          const VIP = { 'danh từ': 'noun', 'động từ': 'verb', 'tính từ': 'adjective', 'trạng từ': 'adverb', 'giới từ': 'preposition', 'liên từ': 'conjunction', 'đại từ': 'pronoun', 'thán từ': 'interjection', 'từ hạn định': 'determiner', 'viết tắt': 'abbreviation', 'cụm từ': 'phrase' };
          const key = p => { p = String(p || '').toLowerCase(); return VIP[p] || p; };
          const G = [], by = {}, grp = p => by[p] || (by[p] = G[G.push({ pos: p, vi: [], defs: [] }) - 1]);
          if (I18N.meanLang() === 'vi') (e.senses || []).forEach(x => { grp(key(x.pos)).vi = x.terms; });
          (e.oxford || []).forEach(m => { const g2 = grp(key(m.pos)); g2.defs = g2.defs.concat(m.defs); });
          if (!(e.oxford || []).length) (e.meanings || []).forEach(m => { const g2 = grp(key(m.pos)); g2.defs = g2.defs.concat(m.defs.slice(0, 3)); });
          const list = G.filter(x => x.vi.length || x.defs.length);
          return list.length ? `<div style="margin-top:1.2rem"><h3>📖 ${t('Nghĩa theo từ loại')}</h3>${list.map(x => `<div class="pos-block"><div class="pos-head"><span class="chip pos">${esc(I18N.lang() === 'vi' ? Object.keys(VIP).find(k => VIP[k] === x.pos) || x.pos : x.pos)}</span>${x.vi.length ? `<b class="vi">${x.vi.map(esc).join(', ')}</b>` : ''}</div>
            ${x.defs.length ? `<ol>${x.defs.slice(0, 4).map(d => `<li>${esc(d.def)}${noDup(d) ? `<div class="ex small">“${highlight(d.ex, e.word)}” <button class="ctx-say" data-saysent="${esc(d.ex)}" title="${t('Nghe cả câu')}">🔊</button></div>` : ''}</li>`).join('')}</ol>` : ''}</div>`).join('')}
            <div class="tiny muted">${t('Nguồn: Oxford Languages (qua Google), Wiktionary')}</div></div>` : '';
        })()}
        ${e.meanings.length && (e.oxford || []).length ? `<details style="margin-top:.8rem"><summary class="small"><b>${t('Định nghĩa bổ sung')}</b> <span class="muted">(Wiktionary)</span></summary>${e.meanings.map(m => `
          <div class="meaning"><span class="chip pos">${esc(t(m.pos))}</span>
            <ol>${m.defs.map(d => `<li>${esc(d.def)}${noDup(d) ? `<div class="ex small">“${highlight(d.ex, e.word)}”</div>` : ''}</li>`).join('')}</ol></div>`).join('')}</details>` : ''}
      </div>

      ${sents.length ? `<div class="card" style="margin-top:1rem">
        <h3>💬 ${t('Câu ví dụ song ngữ')}</h3>
        ${sents.map(s => `<div class="meaning"><div>${highlight(s.en, e.word)} <button class="icon-btn sm" data-speak-text="${esc(s.en)}" aria-label="${t('Nghe cả câu')}">🔊</button></div><div class="muted small">${esc(s.vi)} <span class="chip">${s.auto ? t('Oxford · dịch máy') : 'Tatoeba'}</span></div>
          <button class="btn sm ghost" data-use-sent="${esc(s.en)}">📌 ${t('Dùng làm ngữ cảnh')}</button></div>`).join('')}
      </div>` : ''}

      ${final ? `<div class="card" style="margin-top:1rem" id="saveCard">
        <h3>${card ? '📌 ' + t('Thêm ngữ cảnh cho từ này') : '➕ ' + t('Lưu vào flashcard kèm ngữ cảnh')}</h3>
        <label class="field"><span class="muted small" style="font-weight:500">${t('Câu bạn gặp từ này (bài đọc, phim, báo…) – ngữ cảnh giúp nhớ lâu gấp nhiều lần')}</span>
          <textarea class="input" id="ctx" placeholder="${t('Dán câu có chứa “{w}”…', { w: esc(e.word) })}"></textarea></label>
        <div id="ctxVi" class="muted small" style="margin-top:.4rem"></div>
        <div class="row" style="margin-top:.7rem">
          <button class="btn" id="trCtx">🌐 ${t('Dịch câu')}</button>
          <button class="btn primary" id="saveWord">${card ? t('Thêm ngữ cảnh') : t('Lưu vào flashcard')}</button>
          ${card ? `<span class="muted small">${t('{n} ngữ cảnh', { n: card.contexts.length })} · ${masteryDots(card.srs)}</span>` : ''}
        </div>
      </div>` : UI.skel(t('Đang tra “{q}”…', { q: esc(e.word) }), 3).replace('skel-block', 'skel-block skel-save')} <!-- ô lưu kèm ngữ cảnh chỉ có ở lần vẽ ĐỦ: lần vẽ nhanh có ô thì người đang gõ/bàn phím mở sẽ bị lần vẽ đủ đẩy xô (CLS 0,68 mobile-qa dict 360) -->
      ${final ? `<div class="card" style="margin-top:1rem"><div id="phraseBox"></div><div id="related"></div></div>` : ''}`; /* 2 khối điền muộn (Lex.phrases, Datamuse) ở CUỐI trang: về muộn không đẩy ô lưu/ô ngữ cảnh (CLS 0,66 mobile-qa 360) */
    bindCommon();
    App.nativeFill($('#result [data-dnative]'), e.word, e.pos);
    if (!spoke && state.settings.autoSpeak) { spoke = true; speak(e.word, state.settings.accent, UI.audioFor(e, state.settings.accent)); }
    if (final) { loadRelated(e); drawPhrases(e); if (window.Lex) Lex.phrases(e.word).then(l => { if (l && l.length && same() && $('#phraseBox')) drawPhrases(e, l); }).catch(() => {}); } // cụm từ theo mảnh (không nạp 2,3 MB gói từ)
    if (keep) { $('#ctx').value = keep; }

    let ctxVi = '';
    const trCtx = async () => {
      const text = $('#ctx').value.trim();
      if (!text) return '';
      $('#ctxVi').textContent = '⏳ ' + t('Đang dịch…');
      const ml = (I18N && I18N.meanLang && I18N.meanLang()) || 'vi';
      const userLang = (I18N && I18N.lang && I18N.lang()) || 'vi';
      const targetLang = ml === 'vi' ? 'vi' : (userLang !== 'en' ? userLang : 'vi');
      ctxVi = targetLang === 'vi' ? await Dict.translateVi(text) : await Dict.translateTo(text, targetLang);
      const flg = (I18N && I18N.flag ? I18N.flag(targetLang) : (targetLang === 'vi' ? '🇻🇳' : '🌐'));
      $('#ctxVi').textContent = ctxVi ? `${flg} ${ctxVi}` : t('Không dịch được câu này.');
      return ctxVi;
    };
    const qs = $('#quickSave');
    if (!$('#ctx')) { if (qs) qs.onclick = async () => { await addWord(e, null); toast(t('Đã lưu “{w}” vào flashcard', { w: e.word })); routes.dict(e.word); }; return; } // lần vẽ nhanh: chưa có ô ngữ cảnh
    $('#trCtx').onclick = trCtx;
    $('#ctx').oninput = () => { ctxVi = ''; $('#ctxVi').textContent = ''; };
    $$('[data-use-sent]').forEach(b => b.onclick = () => {
      const s = e.sentences.find(x => x.en === b.dataset.useSent);
      $('#ctx').value = s.en; ctxVi = s.vi; $('#ctxVi').textContent = `🇻🇳 ${s.vi}`;
      $('#saveCard').scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    const save = async () => {
      const text = $('#ctx').value.trim();
      if (text && !ctxVi) await trCtx();
      await addWord(e, text ? { text, vi: ctxVi, source: '', title: 'Ghi chú của bạn' } : null);
      toast(card ? t('Đã cập nhật thẻ') : t('Đã lưu “{w}” vào flashcard', { w: e.word }));
      location.hash === `#/dict/${encodeURIComponent(e.word)}` ? routes.dict(e.word) : (location.hash = `#/dict/${encodeURIComponent(e.word)}`);
    };
    $('#saveWord').onclick = save;
    if (qs) qs.onclick = save;
    }
  });

  // Cụm từ & cấu trúc chứa từ đang tra: từ thư viện + sổ cụm từ của người học
  function phraseLib(e, lx) {
    const re = UI.wordRegex(e.word), lx2 = (lx || []).filter(w => re.test(w.word));
    return [...lx2, ...Object.values(INDEX).filter(w => /\s/.test(w.word) && re.test(w.word) && !lx2.some(l => l.word === w.word))].slice(0, 10);
  }
  function drawPhrases(e, lx) {
    const el = $('#phraseBox'); if (!el) return;
    const re = UI.wordRegex(e.word), lib = phraseLib(e, lx);
    const mine = Object.values(state.cards).filter(c => /\s/.test(c.word) && re.test(c.word) && !lib.some(l => l.word === c.word)).slice(0, 10);
    const row = (w, own) => `<div class="phr"><b>${esc(w.word)}</b> <span class="small${I18N.learnLang() !== 'vi' && /[ăđơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i.test(w.vi || '') ? ' tr-wait' : ''}" style="color:var(--accent-text);font-weight:700">${esc(w.vi || '')}</span>${w.ex ? `<div class="ex small">“${UI.highlight(w.ex, w.word)}”</div>` : ''}${w.note ? `<div class="tiny muted">📐 ${esc(w.note)}</div>` : ''}
      <div class="row" style="margin-top:.2rem"><button class="icon-btn sm" data-speak="${esc(w.word)}">🔊</button>${own || inDeck(w.word) ? `<span class="chip ok">✓ ${t('Đã lưu')}</span>` : `<button class="btn sm ghost" data-add-seed="${esc(w.word)}">+ ${t('Lưu cụm')}</button>`}</div></div>`;
    el.innerHTML = `<div style="margin-top:1rem"><div class="row between"><h3 style="margin:0">🧩 ${t('Cụm từ & cấu trúc với “{w}”', { w: esc(e.word) })}</h3><button class="btn sm" id="addPhr">＋ ${t('Lưu cụm / cấu trúc của bạn')}</button></div>
      ${lib.length || mine.length ? `<div class="phr-grid">${lib.map(w => row(w, false)).join('')}${mine.map(c => row(c, true)).join('')}</div>` : `<p class="small muted" style="margin:.4rem 0 0">${t('Chưa có cụm nào trong thư viện. Mẹo: <b>bôi đen một cụm trong câu ví dụ</b> phía trên rồi bấm “🧩 Lưu cụm này”.')}</p>`}</div>`;
    bindCommon();
    $('#addPhr').onclick = () => App.savePhraseDialog({ phrase: e.word + ' ', sentence: e.ex || '' });
  }

  // Từ liên quan (Datamuse): tính từ hay đi kèm, danh từ hay đi kèm, trái nghĩa, gần nghĩa. Datamuse hỏng → đồng nghĩa/trái nghĩa của Free Dictionary + nút Thử lại gọn (test: scripts/test/datamuse-resilience.mjs)
  App.loadRelated = loadRelated;
  async function loadRelated(e, retry) {
    const w = encodeURIComponent(e.word), get = q => Dict.dm(`words?${q}`, { retry }).then(r => Array.isArray(r) ? r : null);
    // Danh từ → tính từ hay đi kèm; tính từ → danh từ hay đi sau (tránh cụm vô nghĩa)
    const isNoun = /^n|danh/.test(e.pos || ''), isAdj = /^adj|tính/.test(e.pos || '');
    const STOP = new Set(['more', 'most', 'less', 'least', 'very', 'other', 'such', 'same', 'own', 'many', 'much', 'few', 'several', 'certain', 'various', 'error', 'orthogonal']);
    // Gọi 1 lệnh trước: nguồn hỏng thì không bắn thêm 3 lệnh hỏng (mỗi lệnh = 1 dòng đỏ console)
    let ml = await get(`ml=${w}&max=16&md=f`), jjb0 = [], jja = [], ant = [];
    const down = !ml;
    if (down) {
      const d = await fetch(Dict.dapiURL(e.word), { signal: AbortSignal.timeout(3500) }).then(r => r.ok ? r.json() : null).catch(() => null);
      const ms = (Array.isArray(d) ? d : []).flatMap(x => x.meanings || []), pick = k => [...new Set(ms.flatMap(m => [...(m[k] || []), ...(m.definitions || []).flatMap(x => x[k] || [])]))];
      ant = pick('antonyms').slice(0, 6).map(word => ({ word }));
      ml = pick('synonyms').map(word => ({ word, tags: ['f:9'] }));
    } else {
      [jjb0, jja, ant] = (await Promise.all([isNoun || !isAdj ? get(`rel_jjb=${w}&max=14`) : [], isAdj ? get(`rel_jja=${w}&max=10`) : [], get(`rel_ant=${w}&max=6`)])).map(r => r || []);
    }
    const jjb = isAdj ? [] : jjb0.filter(x => !STOP.has(x.word) && x.score > 300).slice(0, 10);
    const el = $('#related'); if (!el || parseHash().arg !== e.word && parseHash().arg.toLowerCase() !== e.word) return;
    const chips = (arr, fmt) => arr.map(x => `<a class="chip" href="#/dict/${encodeURIComponent(x.word)}">${esc(fmt(x.word))}</a>`).join(' ');
    let html = '';
    if (jjb.length) html += `<div style="margin-top:.6rem"><b>🧩 ${t('Tính từ hay đi với “{w}”:', { w: esc(e.word) })}</b> ${chips(jjb, x => `${x} ${e.word}`)}</div>`;
    if (jja.length) html += `<div style="margin-top:.6rem"><b>🧩 ${t('Danh từ hay đi sau:')}</b> ${chips(jja, x => `${e.word} ${x}`)}</div>`;
    if (ant.length) html += `<div style="margin-top:.6rem"><b>↔ ${t('Trái nghĩa:')}</b> ${chips(ant, x => x)}</div>`;
    const syn = new Set(e.syn);
    const stemE = e.word.slice(0, Math.max(5, e.word.length - 4));
    const mlf = ml.filter(x => !syn.has(x.word) && !/\s/.test(x.word) && !x.word.startsWith(stemE) && !e.word.startsWith(x.word.slice(0, 6)) && +(((x.tags || []).find(t => t.startsWith('f:')) || 'f:0').slice(2)) >= 1).slice(0, 8);
    if (mlf.length || down) html += `<div style="margin-top:.6rem"><b>🔀 ${t('Từ gần nghĩa:')}</b> ${chips(mlf, x => x)}${down ? ` <button class="btn sm ghost" id="relRetry">↻ ${t('Thử lại')}</button>` : ''}</div>`;
    el.innerHTML = html;
    if (down) $('#relRetry').onclick = () => loadRelated(e, true);
  }
})();
