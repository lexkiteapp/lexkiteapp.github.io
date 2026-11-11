/* Cụm từ & cấu trúc câu: bài mẫu có chú thích (cụm từ + nghĩa, từ nối, vai trò câu), Sổ cụm từ,
 * bôi đen bất kỳ đoạn nào trong app để lưu thành cụm kèm nghĩa, cách dùng và câu ví dụ. */
(function () {
  const { $, $$, esc, toast, modal, closeModal } = UI;
  const App = window.App;
  const { state, routes } = App;
  const view = App.view;

  // Bài mẫu có chú thích (#/model, #/models), bài tập sinh từ bài mẫu, Sổ cụm từ (#/phrases) → js/phrases-model.js (tải lười trong gói 'writing').
  // Chữ "sạch" của một vùng: bỏ chú thích tiếng Việt, nhãn vai trò, nút bấm → không bị dính chữ hay lẫn Việt – Anh
  const NOISE = '.an-gl, .an-role, button, .ctxvi, .vi, .tiny, sup, [hidden], .kbd';
  const cleanText = node => { const c = node.cloneNode(true); if (c.querySelectorAll) c.querySelectorAll(NOISE).forEach(x => x.remove()); return (c.textContent || '').replace(/🔊/g, '').replace(/\s+/g, ' ').replace(/\s+([,.;:!?])/g, '$1').trim(); };
  App.cleanText = cleanText; // dùng chung với phrases-model.js (câu ngữ cảnh khi lưu cụm từ bài mẫu)

  // Bảng động từ bất quy tắc: gốc quá-khứ phân-từ-II (dùng để đưa về từ gốc và tạo lỗi sai thì)
  const IRR = 'arise arose arisen|be was been|bear bore born|beat beat beaten|become became become|begin began begun|bend bent bent|bind bound bound|bite bit bitten|blow blew blown|break broke broken|breed bred bred|bring brought brought|build built built|burn burnt burnt|buy bought bought|catch caught caught|choose chose chosen|come came come|cost cost cost|cut cut cut|deal dealt dealt|dig dug dug|do did done|draw drew drawn|drink drank drunk|drive drove driven|eat ate eaten|fall fell fallen|feed fed fed|feel felt felt|fight fought fought|find found found|fly flew flown|forget forgot forgotten|forgive forgave forgiven|freeze froze frozen|get got got|give gave given|go went gone|grow grew grown|hang hung hung|have had had|hear heard heard|hide hid hidden|hit hit hit|hold held held|hurt hurt hurt|keep kept kept|know knew known|lead led led|learn learnt learnt|leave left left|lend lent lent|let let let|lose lost lost|make made made|mean meant meant|meet met met|pay paid paid|put put put|quit quit quit|read read read|ride rode ridden|ring rang rung|rise rose risen|run ran run|say said said|see saw seen|seek sought sought|sell sold sold|send sent sent|set set set|shake shook shaken|shine shone shone|shoot shot shot|show showed shown|shrink shrank shrunk|shut shut shut|sing sang sung|sink sank sunk|sit sat sat|sleep slept slept|slide slid slid|speak spoke spoken|spend spent spent|split split split|spread spread spread|stand stood stood|steal stole stolen|stick stuck stuck|strike struck struck|swim swam swum|take took taken|teach taught taught|tear tore torn|tell told told|think thought thought|throw threw thrown|understand understood understood|wake woke woken|wear wore worn|win won won|write wrote written|overtake overtook overtaken|undergo underwent undergone|withdraw withdrew withdrawn|rebuild rebuilt rebuilt|outgrow outgrew outgrown';
  const PAST = {}, PP = {}, BASE = {};
  IRR.split('|').forEach(x => { const [b, p2, pp] = x.split(' '); PAST[b] = p2; PP[b] = pp; if (p2 !== b) BASE[p2] = b; if (pp !== b) BASE[pp] = b; });
  Object.assign(BASE, { is: 'be', are: 'be', am: 'be', was: 'be', were: 'be', been: 'be', being: 'be', has: 'have', had: 'have', having: 'have', does: 'do', did: 'do', done: 'do', better: 'good', best: 'good', worse: 'bad', worst: 'bad', further: 'far', farther: 'far', children: 'child', men: 'man', women: 'woman', people: 'people', feet: 'foot', teeth: 'tooth', its: 'its', this: 'this', thus: 'thus', news: 'news', series: 'series', species: 'species', means: 'means', analysis: 'analysis' });
  const KNOWN = w => !!IELTS_DATA.INDEX[w];
  const KEEP = new Set('as was has is his its this thus us yes less unless across perhaps whereas always sometimes nevertheless upon bus gas status focus plus process business analysis basis crisis'.split(' '));
  // Đưa một từ về dạng gốc (từ điển): số nhiều → số ít, quá khứ/phân từ → nguyên mẫu, so sánh → tính từ gốc
  function lemma(w) {
    const l = w.toLowerCase();
    if (BASE[l]) return BASE[l];
    if (KEEP.has(l) || l.length < 4 || KNOWN(l) && !/(ies|es|s|ed|ing|er|est)$/.test(l)) return l;
    const tryB = arr => arr.find(x => x && KNOWN(x));
    let b;
    if (/ies$/.test(l)) b = tryB([l.slice(0, -3) + 'y']);
    if (!b && /ves$/.test(l)) b = tryB([l.slice(0, -3) + 'f', l.slice(0, -3) + 'fe']);
    if (!b && /(ss|x|z|ch|sh|o)es$/.test(l)) b = tryB([l.slice(0, -2)]);
    if (!b && /[^s]s$/.test(l)) b = tryB([l.slice(0, -1)]);
    if (!b && /ied$/.test(l)) b = tryB([l.slice(0, -3) + 'y']);
    if (!b && /ed$/.test(l)) b = tryB([l.slice(0, -1), l.slice(0, -2), /(.)\1ed$/.test(l) && l.slice(0, -3)]);
    if (!b && /ing$/.test(l)) b = tryB([l.slice(0, -3), l.slice(0, -3) + 'e', /(.)\1ing$/.test(l) && l.slice(0, -4)]);
    if (!b && /iest$/.test(l)) b = tryB([l.slice(0, -4) + 'y']);
    if (!b && /est$/.test(l)) b = tryB([l.slice(0, -3), l.slice(0, -2), /(.)\1est$/.test(l) && l.slice(0, -4)]);
    if (!b && /ier$/.test(l)) b = tryB([l.slice(0, -3) + 'y']);
    if (!b && /er$/.test(l) && !KNOWN(l)) b = tryB([l.slice(0, -2), l.slice(0, -1), /(.)\1er$/.test(l) && l.slice(0, -3)]);
    return b || l;
  }
  App.lemma = lemma;
  App.lemmaT = { PAST, PP, BASE, KNOWN }; // bảng động từ bất quy tắc dùng chung với bài tập bài mẫu (phrases-model.js)

  // ---------- Hộp thoại lưu cụm từ / cấu trúc ----------
  async function savePhraseDialog({ phrase, vi = '', sentence = '', title = '' }) {
    const box = modal(`<h2>${UI.icon('puzzle')} ${t('Lưu cụm từ / cấu trúc')}</h2>
      <div class="stack">
        <label class="field"><span>${t('Cụm từ hoặc cấu trúc')}</span><input class="input" id="pPh" value="${esc(phrase)}" placeholder="${t('vd: pose a threat to / not only … but also …')}"></label>
        <label class="field"><span>${t('Nghĩa theo cụm')}</span><div class="row nowrap"><input class="input" id="pVi" value="${esc(vi)}" placeholder="${t('Nghĩa tiếng Việt của cả cụm')}"><button class="btn sm" id="pTr" type="button">🌐 ${t('Dịch')}</button></div></label>
        <label class="field"><span>${t('Cách dùng / mẫu cấu trúc (tùy chọn)')}</span><input class="input" id="pUse" placeholder="${t('vd: S + pose a threat to + N · dùng trong Writing Task 2')}"></label>
        <label class="field"><span>${t('Câu ví dụ / ngữ cảnh')}</span><textarea class="input" id="pEx">${esc(sentence)}</textarea></label>
      </div>
      <div class="row between" style="margin-top:1rem"><button class="btn" data-close>${t('Hủy')}</button><button class="btn primary" id="pSave">${t('Lưu vào Sổ cụm từ')}</button></div>`);
    const tr = async () => { const ph = $('#pPh').value.trim(); if (!ph) return; $('#pVi').placeholder = t('Đang dịch…'); const v = await translateSafe(ph); if (!$('#pVi')) return; if (!$('#pVi').value) $('#pVi').value = v; $('#pVi').placeholder = v ? t('Nghĩa tiếng Việt của cả cụm') : t('Không dịch được – thử lại sau'); };
    $('#pTr').onclick = tr;
    if (!vi) tr();
    $('#pSave').onclick = async () => {
      const p = $('#pPh').value.trim().replace(/\s+/g, ' '); if (!p) return;
      const ex = $('#pEx').value.trim();
      const card = await App.addWord({ word: p, vi: $('#pVi').value.trim(), pos: 'phrase', ex, emoji: '🧩', topic: 'phrases' }, ex ? { text: ex, title } : null);
      const use = $('#pUse').value.trim();
      if (use) { card.note = use; await Core.Cards.update(card); }
      closeModal(); toast(t('Đã lưu “{p}” – vào Sổ cụm từ để ôn', { p })); Sfx.correct();
    };
    return box;
  }
  App.savePhraseDialog = savePhraseDialog;

  // ---------- Bôi đen bất kỳ đoạn nào trong app: 🔎 tra nghĩa · 🌐 dịch · 🧩 lưu cụm ----------
  // (Trên trang Lexkite, tiện ích Chrome nhường phần này cho app để không hiện 2 bảng tra)
  const bar = document.createElement('div');
  bar.className = 'sel-bar'; bar.hidden = true;
  document.body.appendChild(bar);
  const pop = document.createElement('div');
  pop.className = 'sel-pop card'; pop.hidden = true;
  document.body.appendChild(pop);
  let selInfo = null, popSeq = 0;
  // Khung tạm (skeleton) thay đồng hồ cát: người đọc thấy ngay chỗ bản dịch sẽ hiện, trình đọc màn hình nghe "Đang dịch…"
  const skel = () => `<span role="status" aria-label="${esc(t('Đang dịch…'))}" style="display:block"><span class="skel skel-l" style="display:block;height:.85rem;margin:.2rem 0 .4rem"></span><span class="skel skel-l" style="display:block;height:.85rem;width:62%"></span></span>`;
  // Khung nghĩa khi bấm vào cụm từ/từ nối trong bài mẫu: nghĩa + nghe + lưu (điền sẵn) – không mở form trống
  function phrasePop(el, info) {
    bar.hidden = true; pop.hidden = false;
    pop.innerHTML = `<div class="row between nowrap" style="gap:.6rem"><b>${esc(info.phrase)}</b><button class="icon-btn sm" data-x aria-label="${t('Đóng')}">✕</button></div>
      <div class="vi" style="margin:.35rem 0 .6rem" aria-live="polite">${info.vi ? esc(info.vi) : skel()}</div>
      <div class="row" style="gap:.4rem"><button class="btn sm" data-sp>🔊 ${t('Nghe')}</button><button class="btn sm primary" data-save>${App.inDeck && App.inDeck(info.phrase) ? t('✓ Đã lưu') : '＋ ' + t('Lưu vào Sổ cụm từ')}</button></div>`;
    place(pop, el.getBoundingClientRect());
    $('[data-x]', pop).onclick = () => closePop();
    $('[data-sp]', pop).onclick = () => UI.speak(info.phrase, state.settings.accent);
    $('[data-save]', pop).onclick = () => { pop.hidden = true; savePhraseDialog(info); };
    if (!info.vi) { const seq = newSeq(), sg = trCtrl.signal; translateSafe(info.phrase, undefined, { signal: sg }).then(v => { if (seq !== popSeq) return; info.vi = v || ''; const d = $('.vi', pop); if (d && !pop.hidden) d.textContent = info.vi || t('Không dịch được – thử lại sau'); place(pop, el.getBoundingClientRect()); }); }
  }
  App.phrasePop = phrasePop; // dùng chung: chip cụm từ trên thẻ từ (app.js) – tra nghĩa tại chỗ, không rời phiên học
  const NO_LOOKUP = 'input, textarea, select, .cbt, .mk-read, .mk-write, .mk-qs, .sel-pop, .sel-bar, .pop';
  // Đặt bảng cạnh vùng chọn mà KHÔNG che chữ: ưu tiên phía DƯỚI vùng chọn (phần phía trên – định nghĩa, dòng đang đọc – luôn thấy; ảnh chủ 01/11:
  // bảng "Đang dịch" đè mất ĐỊNH NGHĨA), thiếu chỗ → lật lên trên; cả hai thiếu → bên rộng hơn và thu chiều cao (cuộn trong bảng) để không bao giờ đè lên câu đang chọn.
  // Bảng lớn lên khi có bản dịch → gọi lại place() để lật/thu đúng. Không bao giờ tràn ngang (khổ 390 px: lề 8 px mỗi bên).
  const place = (el, r, gap = 8) => {
    const M = 8, vw = document.documentElement.clientWidth || innerWidth, vh = innerHeight;
    el.style.maxHeight = ''; el.style.maxWidth = `calc(100vw - ${2 * M}px)`;
    el.style.left = Math.max(M, Math.min(vw - el.offsetWidth - M, r.left + r.width / 2 - el.offsetWidth / 2)) + 'px';
    const h = el.offsetHeight, above = r.top - gap - M, below = vh - r.bottom - gap - M;
    let top;
    if (h <= below) top = r.bottom + gap;
    else if (h <= above) top = r.top - gap - h;
    else if (above > below) { el.style.maxHeight = Math.max(80, above) + 'px'; top = r.top - gap - Math.min(h, Math.max(80, above)); }
    else { el.style.maxHeight = Math.max(80, below) + 'px'; top = r.bottom + gap; }
    el.style.top = Math.max(M, top) + 'px';
  };
  App.placeNear = place;
  // MỘT đường dịch câu cho mọi điểm dịch (js/tr-fast.js, tải lười): kho dịch sẵn trên CI → bộ đệm IndexedDB → các nguồn mạng chạy SONG SONG.
  // Không bao giờ treo: tr() trả trong ngân sách (2,5 s) – hết giờ → { text: '', late } để bảng hiện nghĩa từng từ + "Thử lại" và tự thay khi bản dịch đến muộn.
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const timed = (p, ms) => Promise.race([Promise.resolve(p), sleep(ms).then(() => { throw new Error('timeout'); })]);
  let trP = null, trCtrl = new AbortController();
  // Nạp lười 1 tệp script (mỗi tệp 1 lần, lỗi → thử lại lần sau). Không dùng App.need('struct'): mục 'struct' trong bảng gói của app.js
  // nằm lẫn trong dòng chú thích → App.need ném lỗi đồng bộ → bảng "Dịch" kẹt mãi ở trạng thái chờ (lỗi gốc chủ báo 01/11).
  const JS = {};
  const loadJs = (src, ok) => (ok() ? Promise.resolve(true) : JS[src] || (JS[src] = new Promise(res => {
    const sc = document.createElement('script'); sc.src = src; sc.async = true;
    sc.onload = () => res(!!ok()); sc.onerror = () => { delete JS[src]; res(false); };
    document.head.appendChild(sc);
  })));
  const trLib = () => loadJs('js/tr-fast.js', () => window.TrFast && TrFast.get).then(v => (v ? TrFast : null));
  const newSeq = () => { trCtrl.abort(); trCtrl = new AbortController(); return ++popSeq; }; // vùng chọn/bảng mới → hủy mọi yêu cầu dịch cũ
  async function trFast(text, L = I18N.learnLang(), o = {}) {
    const F = await timed(trLib(), 1500).catch(() => null);
    if (F) return F.get(text, L, { budget: App.trBudgetMs || 2500, ...o });
    const v = await timed((L === 'vi' ? Dict.translateVi(text, o) : Dict.translateTo(text, L, 'en', o)), App.trBudgetMs || 2500).catch(() => ''); // tr-fast.js không nạp được (mất mạng lần đầu)
    return { text: String(v || '').trim(), src: v ? 'net' : 'timeout' };
  }
  // Bản chỉ cần chuỗi cuối (lưu ngữ cảnh, phrasePop): chờ cả bản đến muộn, tối đa ~12 s, rồi '' – không bao giờ treo
  async function translateSafe(text, L = I18N.learnLang(), o = {}) {
    const r = await trFast(text, L, o);
    return r.text || (r.late ? await timed(r.late, 10000).catch(() => '') : '') || '';
  }
  App.translateSafe = translateSafe;
  App.trFast = trFast;
  // Dự phòng khi cả câu không dịch được: nghĩa từng từ có sẵn trên máy (thư viện từ), không cần mạng
  const STOPW = new Set('the a an and or but of to in on at for with by from as is are was were be been it its this that i me my you your he she his her we our they them not no do does did have has had can will would so hi'.split(' '));
  function wordGloss(text) {
    const lem = w0 => (App.lemma && App.lemma(w0)) || w0, IX = (window.IELTS_DATA && IELTS_DATA.INDEX) || {};
    const ws = [...new Set((text.match(/[A-Za-z][A-Za-z'-]+/g) || []).map(x => x.toLowerCase()).filter(x => !STOPW.has(x)))];
    const out = [];
    for (const w0 of ws) { const loc = IX[lem(w0)] || IX[w0]; const vi = loc && (App.meanOf ? App.meanOf(loc) : loc.vi); if (vi) out.push({ w: loc.word || w0, vi }); if (out.length >= 8) break; }
    return out;
  }
  // Khối kết quả dịch: bản dịch · đang dịch (khung tạm + nghĩa từng từ làm bản tạm) · hoặc nghĩa từng từ + Thử lại · hoặc lỗi rõ ràng + Thử lại
  const glossHtml = g0 => g0.map(x => `<div class="small"><b lang="en">${esc(x.w)}</b> – ${esc(x.vi)}</div>`).join('');
  const trHtml = (vi, text, busy) => {
    if (vi) return `<div data-tr style="margin:.4rem 0;line-height:1.6">${esc(vi)}</div>`;
    const g0 = wordGloss(text);
    if (busy) return `<div data-tr data-busy aria-busy="true" style="margin:.4rem 0;line-height:1.6">${skel()}${g0.length ? `<div class="small muted" style="margin-top:.35rem">${t('Nghĩa từng từ (tạm):')}</div>${glossHtml(g0)}` : ''}</div>`;
    return `<div data-tr data-fail role="alert" style="margin:.4rem 0;line-height:1.6">${g0.length ? `<div class="small muted">${t('Chưa dịch được cả câu – nghĩa từng từ:')}</div>${glossHtml(g0)}` : esc(t('Không dịch được – thử lại sau.'))}
      <button type="button" class="btn sm" data-retry style="margin-top:.35rem">↻ ${t('Thử lại')}</button></div>`;
  };
  const readSel = () => {
    const sel = getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) return null;
    const node = sel.anchorNode, el = node && (node.nodeType === 1 ? node : node.parentElement);
    if (!el || !view.contains(el) || el.closest(NO_LOOKUP) || document.body.classList.contains('bare')) return null;
    const t = cleanText(sel.getRangeAt(0).cloneContents());
    if (!t || t.length > 600 || !/[A-Za-z]{2}/.test(t) || /[À-ỹ]/.test(t)) return null;
    // Ngữ cảnh: ưu tiên câu có cấu trúc (data-sent: câu ví dụ/ngữ cảnh tiếng Anh của thẻ) – không cào chữ thẻ cha (tên từ, phiên âm, nhãn UK/US, "💬 Ví dụ")
    const pick = (full, k) => { const sents = full.match(/[^.!?]+[.!?]+["”’)]*|[^.!?]+$/g) || [full]; return sents.find(x => x.toLowerCase().includes(k)); };
    const key = t.toLowerCase().slice(0, 40), own = el.closest('[data-sent]');
    let sentence = own && own.dataset.sent ? (pick(own.dataset.sent.replace(/\s+/g, ' ').trim(), key) || '').trim() : '';
    if (!sentence) {
      const block = el.closest('p, li, blockquote, figure, .say-tx, .example-box, .ex, .meaning, .sent, .tl, .lq-item, div');
      const full = block ? UI.ttsClean(cleanText(block)) : t;
      sentence = (pick(full, key) || full).trim();
    }
    if (sentence.length > 300) sentence = sentence.slice(0, 297) + '…';
    return { text: t.replace(/^[^A-Za-z(]+|[^A-Za-z)]+$/g, ''), sentence, rect: sel.getRangeAt(0).getBoundingClientRect() };
  };
  const onSelect = () => setTimeout(() => {
    const info = readSel();
    if (!info) { bar.hidden = true; return; }
    selInfo = info;
    const n = info.text.split(/\s+/).length;
    if (n > 4) trLib().then(F => F && F.warm(info.text, I18N.learnLang())); // nạp sẵn mảnh kho dịch + IDB trước khi bấm "Dịch" → câu có sẵn hiện tức thì
    bar.innerHTML = `${n <= 4 ? `<button data-act="look">${UI.icon('search')} ${t('Tra nghĩa')}</button>` : `<button data-act="tr">${UI.icon('globe')} ${t('Dịch')}</button>`}${n >= 2 && n <= 14 ? `<button data-act="save">${UI.icon('puzzle')} ${t('Lưu cụm')}</button>` : ''}${n <= 4 ? `<button data-act="say" title="${t('Nghe')}">🔊</button>` : ''}`;
    bar.hidden = false; place(bar, info.rect);
  }, 10);
  document.addEventListener('mouseup', e => { if (!bar.contains(e.target) && !pop.contains(e.target)) onSelect(); });
  document.addEventListener('touchend', e => { if (!bar.contains(e.target) && !pop.contains(e.target)) setTimeout(onSelect, 250); });
  const closePop = () => { if (!pop.hidden) { pop.hidden = true; newSeq(); } }; // đóng bảng = hủy yêu cầu dịch đang chạy
  document.addEventListener('mousedown', e => { if (!bar.contains(e.target)) bar.hidden = true; if (!pop.contains(e.target) && !bar.contains(e.target)) closePop(); });
  document.addEventListener('touchstart', e => { if (!pop.hidden && !pop.contains(e.target) && !bar.contains(e.target)) closePop(); }, { passive: true }); // chạm ra ngoài (màn cảm ứng) cũng đóng
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { bar.hidden = true; closePop(); } });
  window.addEventListener('hashchange', () => { bar.hidden = true; closePop(); });
  bar.addEventListener('mousedown', e => e.preventDefault()); // giữ nguyên vùng chọn khi bấm nút
  bar.onclick = async e => {
    const act = e.target.closest('[data-act]'); if (!act || !selInfo) return;
    const info = selInfo, k = act.dataset.act;
    if (k === 'say') return UI.speak(info.text, state.settings.accent);
    bar.hidden = true;
    if (k === 'save') { getSelection().removeAllRanges(); return savePhraseDialog({ phrase: info.text, sentence: info.sentence, title: t('Lưu từ Lexkite') }); }
    const seq = newSeq(), sig = trCtrl.signal, stale = () => seq !== popSeq || pop.hidden;
    const head = (title, ic) => `<div class="row between nowrap"><b class="small">${UI.icon(ic)} ${esc(title)}</b><button class="icon-btn sm" data-x aria-label="${t('Đóng')}">✕</button></div>`;
    pop.hidden = false;
    pop.innerHTML = k === 'look' ? `${head(info.text, 'search')}<div style="margin:.4rem 0">${skel()}</div>` : `${head(t('Bản dịch'), 'globe')}${trHtml('', info.text, true)}`;
    place(pop, info.rect);
    $('[data-x]', pop).onclick = closePop;
    if (k === 'tr') {
      const L = I18N.learnLang();
      // Cấu trúc trong đoạn (structures.js, tải lười) KHÔNG chặn bản dịch: nạp song song, có thì chèn vào sau
      const stP = loadJs('js/structures.js', () => window.VBStruct);
      const r0 = await trFast(info.text, L, { signal: sig });
      if (stale()) return;
      const vi = r0.text;
      const stHtml = () => { let structs = []; try { structs = window.VBStruct ? VBStruct.analyze(info.text, 4) : []; } catch (e) { /* bỏ qua */ }
        return structs.length ? `<div class="st-box"><b class="small">${UI.icon('puzzle')} ${t('Cấu trúc trong đoạn')}</b>${structs.map(x => `<div class="st-row"><b>${esc(t(x.name))}</b> <i class="muted">“${esc(x.match)}”</i><div class="small muted">${esc(t(x.vi))}</div><a class="small" href="#/grammar/${esc(x.lesson)}">${UI.icon('ruler')} ${t('Học bài này →')}</a></div>`).join('')}</div>` : ''; };
      pop.innerHTML = `${head(t('Bản dịch'), 'globe')}${trHtml(vi, info.text)}
        <div data-st>${stHtml()}</div>
        <div data-aiout></div>
        <div class="row" style="margin-top:.5rem"><button class="btn sm" data-sp>🔊 ${t('Nghe')}</button><button class="btn sm" data-sps>🐢</button><button class="btn sm primary" data-deep>🤖 ${t('Giải thích sâu')}</button></div>`;
      // Chỉ thay phần bản dịch, giữ nguyên phần còn lại của bảng; bản dịch đến muộn (sau ngân sách) tự thay nghĩa từng từ
      const paintTr = (v, busy) => { const box0 = $('[data-tr]', pop); if (!box0) return; box0.outerHTML = trHtml(v, info.text, busy); const r2 = $('[data-retry]', pop); if (r2) r2.onclick = retry; place(pop, info.rect); };
      const lateFill = r => r.late && r.late.then(v => { if (v && !stale()) paintTr(v); });
      const retry = async ev => {
        ev.stopPropagation(); paintTr('', true);
        const r2 = await trFast(info.text, L, { signal: sig }); if (stale()) return;
        paintTr(r2.text); lateFill(r2);
      };
      const rt = $('[data-retry]', pop); if (rt) rt.onclick = retry;
      lateFill(r0);
      if (!window.VBStruct) stP.then(() => { const box = $('[data-st]', pop); if (box && !stale() && window.VBStruct) { box.innerHTML = stHtml(); place(pop, info.rect); } });
      $('[data-sp]', pop).onclick = () => UI.tts(info.text, state.settings.accent);
      $('[data-sps]', pop).onclick = () => UI.tts(info.text, state.settings.accent, 0.65);
      $('[data-deep]', pop).onclick = async ev => {
        const out = $('[data-aiout]', pop), btn = ev.currentTarget; btn.disabled = true;
        // 1) Phân tích từ vựng tức thì, miễn phí (từ điển sẵn có) – luôn có kết quả, không phụ thuộc AI
        const STOP = new Set('the a an and or but of to in on at for with by from as is are was were be been being it its this that these those which who whom whose what when where why how than then there their they them we our you your he she his her i me my not no do does did have has had can could will would should may might must shall also very more most such into over under about after before between through during without within upon'.split(' '));
        const ws = [...new Set((info.text.match(/[A-Za-z][A-Za-z'-]{3,}/g) || []).map(x => x.toLowerCase()).filter(x => !STOP.has(x)))].slice(0, 8);
        out.innerHTML = `<div class="small muted">${UI.icon('hourglass')} ${t('Đang phân tích từ vựng…')}</div>`;
        // Nhanh & tiết kiệm: từ có trong thư viện → lấy ngay trên máy; từ còn lại → 1 lượt dịch gộp duy nhất (không gọi từng từ)
        const lem = w0 => (App.lemma && App.lemma(w0)) || w0;
        const local = ws.map(w0 => IELTS_DATA.INDEX[lem(w0)] || IELTS_DATA.INDEX[w0] || null);
        const miss = ws.filter((w0, i) => !local[i]);
        const tr = miss.length ? (await (L === 'vi' ? Dict.translateVi(miss.map(lem).join('\n')) : Dict.translateTo(miss.map(lem).join('\n'), L)).catch(() => '')).split('\n') : [];
        const looks = ws.map((w0, i) => { const loc = local[i]; if (loc) return { w: loc.word, vi: App.meanOf ? App.meanOf(loc) : loc.vi, ipa: loc.ipa || '', pos: loc.pos || '' }; const k = miss.indexOf(w0), vi = (tr[k] || '').trim(); return vi && vi.toLowerCase() !== lem(w0) ? { w: lem(w0), vi: L === 'vi' ? Dict.fixVi(vi) : vi, ipa: '', pos: '' } : null; });
        const vocab = looks.filter(Boolean);
        out.innerHTML = `${vocab.length ? `<div class="st-box"><b class="small">${UI.icon('library')} ${t('Từ vựng quan trọng')}</b>${vocab.map(v => `<div class="st-row"><b>${esc(v.w)}</b> <span class="muted small">${esc(v.ipa)} ${esc(v.pos)}</span><div class="small">${esc(v.vi)}</div></div>`).join('')}</div>` : ''}<div data-ai2></div>`;
        place(pop, info.rect);
        // 2) Giải thích sâu bằng AI miễn phí (không đòi khóa); mất mạng → báo rõ + đề nghị tải AI của Chrome
        const box = $('[data-ai2]', out);
        const run = async () => {
          box.innerHTML = `<div class="small muted">${UI.icon('hourglass')} ${t('AI đang phân tích…')}</div>`;
          try { box.innerHTML = AI.renderExplain(await AI.explain(info.text, info.sentence)); } catch (e) { box.innerHTML = `<div class="small">⚠️ ${esc(AI.errText(e))}</div>`; }
          place(pop, info.rect);
        };
        if (!window.AI) { btn.disabled = false; return; }
        const key = await AI.getKey(), st = key ? 'key' : await AI.nanoStatus();
        if (key || st === 'available' || navigator.onLine !== false) await run();
        else box.innerHTML = `<div class="tip small" style="margin-top:.5rem">${t('AI không dùng được khi ngoại tuyến – kết nối mạng rồi thử lại.')}
          ${st === 'downloadable' || st === 'downloading' ? `<div class="row" style="gap:.4rem;margin-top:.4rem"><button class="btn sm" data-dl>⬇️ ${t('Tải AI của Chrome (~2GB, 1 lần)')}</button></div>` : ''}</div>`;
        const dl = $('[data-dl]', box); if (dl) dl.onclick = () => { dl.disabled = true; AI.onNanoProgress && AI.onNanoProgress(p => { dl.textContent = `⬇️ ${Math.round(p * 100)}%`; }); run(); };
        btn.disabled = false;
      };
    } else {
      const w = info.text.toLowerCase();
      // Kho trên máy (quick) và tra mạng chạy song song – trước đây nối tiếp 8 s + 15 s; không thấy → dịch nhanh (cùng đường TrFast)
      const L = I18N.learnLang(), full = timed(Dict.lookup(w, { examples: false, image: false }), 6000).catch(() => null);
      const q = await timed(Dict.quick(w), 2500).catch(() => null);
      const d = q && q.found ? q : (await full) || q;
      if (stale()) return;
      if (!d || !d.found) {
        const vi = (d && (App.meanOf ? App.meanOf(d) : d.vi)) || (await translateSafe(info.text, L, { signal: sig }));
        if (stale()) return;
        pop.innerHTML = `<div class="row between nowrap"><b>${esc(info.text)}</b><button class="icon-btn sm" data-x aria-label="${t('Đóng')}">✕</button></div><div class="vi" style="margin:.3rem 0">${esc(vi || t('Không tìm thấy'))}</div>${info.text.includes(' ') ? `<button class="btn sm primary" data-ph>${UI.icon('puzzle')} ${t('Lưu cụm')}</button>` : ''}`;
      } else {
        const mText = App.meanOf ? App.meanOf(d) : d.vi;
        pop.innerHTML = `<div class="row between nowrap"><div><b style="font-size:1.2rem">${esc(d.word)}</b> ${UI.posChip ? UI.posChip(d.pos) : ''}</div><button class="icon-btn sm" data-x aria-label="${t('Đóng')}">✕</button></div>
          <div class="row" style="gap:.3rem">${UI.ipaHtml(d)}<button class="icon-btn sm" data-sp>🔊</button></div>
          ${mText ? `<div class="vi" style="font-size:1.05rem;margin:.2rem 0">${esc(mText)}</div>` : ''}
          ${d.def && d.def !== mText ? `<div class="small muted">${esc(d.def)}</div>` : ''}
          ${info.sentence && info.sentence !== info.text ? UI.ctxBox(info.sentence, d.word) : ''}
          <div class="row" style="margin-top:.6rem"><button class="btn sm primary" data-save>${App.inDeck(d.word) ? `+ ${t('Thêm ngữ cảnh')}` : `+ ${t('Lưu flashcard')}`}</button>${info.text.includes(' ') ? `<button class="btn sm" data-ph>${UI.icon('puzzle')} ${t('Lưu cụm')}</button>` : ''}<a class="btn sm ghost" href="#/dict/${encodeURIComponent(d.word)}">${t('Chi tiết')}</a></div>`;
        $('[data-sp]', pop).onclick = () => UI.speak(d.word, state.settings.accent, UI.audioFor(d, state.settings.accent));
        $('[data-save]', pop).onclick = async ev => {
          const b = ev.currentTarget; b.disabled = true;
          const vi = info.sentence ? await translateSafe(info.sentence, L) : '';
          await App.addWord(d, info.sentence ? { text: info.sentence, vi, title: document.title.replace(/ – Lexkite$/, '') || 'Lexkite' } : null);
          b.textContent = `✓ ${t('Đã lưu')}`;
        };
        if (state.settings.autoSpeak) UI.speak(d.word, state.settings.accent, UI.audioFor(d, state.settings.accent));
      }
      const ph = $('[data-ph]', pop); if (ph) ph.onclick = () => { pop.hidden = true; savePhraseDialog({ phrase: info.text, sentence: info.sentence, title: t('Lưu từ Lexkite') }); };
    }
    place(pop, info.rect);
    $('[data-x]', pop).onclick = closePop;
  };

  // ---------- Sổ cụm từ & cấu trúc ----------
  const isPhrase = c => /\s/.test(c.word.trim()) || c.pos === 'phrase' || c.topic === 'phrases';
  App.isPhrase = isPhrase;
})();
