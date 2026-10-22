/* Tab mới Lexkite: thẻ từ kiểu từ điển lớn. Thứ tự thẻ: đến hạn ôn FSRS ("thời điểm vàng") → từ đã lưu → từ trong kho Lexkite.
 * Dữ liệu CHỈ lấy từ gói add-on (nt/<chữ cái>.json – scripts/gen-newtab.mjs; thẻ người dùng trong chrome.storage): không mạng lúc vẽ lần đầu.
 * Thiếu trường nào → ẩn mục đó (không bịa). Mạng chỉ khi người dùng bấm: mp3 giọng Anh (audio.lexkite.com), dịch ví dụ/nghĩa (Google Translate qua background).
 * Chữ giao diện: extension/_locales/<lang>/messages.json (khóa nt*, pos*). Tắt được (popup hoặc nút dưới trang) → tab mới mặc định của Chrome. */
(async () => {
  const T0 = performance.now();
  const { Store, Cards, SRS, DEFAULT_SETTINGS, keyOf } = Core;
  const XL = ['vi', 'en', 'es', 'pt', 'fr', 'de', 'id', 'th', 'zh', 'ja', 'ko', 'hi', 'ar', 'ru', 'tr'], pick = l => { l = String(l || '').toLowerCase().split('-')[0]; return XL.includes(l) ? l : null; };
  const getJSON = p => fetch(chrome.runtime.getURL(p)).then(r => (r.ok ? r.json() : {})).catch(() => ({}));
  const [stored, cards, local] = await Promise.all([Store.get('settings', {}), Cards.all(), chrome.storage.local.get(['uiLang', 'ntQuiz', 'ntDay', 'ntSlow']).catch(() => ({}))]);
  const settings = { ...DEFAULT_SETTINGS, ...stored };
  const toDefault = async () => { try { const tab = await chrome.tabs.getCurrent(); chrome.tabs.update(tab.id, { url: 'chrome://new-tab-page/' }); } catch (e) { location.replace('https://www.google.com/'); } };
  if (settings.newtabOn === false) return toDefault();
  const L = pick(local.uiLang) || pick(chrome.i18n.getUILanguage()) || 'en';
  const MSG = await getJSON(`_locales/${{ pt: 'pt_BR', zh: 'zh_CN' }[L] || L}/messages.json`);
  const tx = (k, v) => { let s = (MSG[k] && MSG[k].message) || chrome.i18n.getMessage(k) || k; for (const n in v || {}) s = s.replace(`{${n}}`, v[n]); return s; };
  document.documentElement.lang = L; if (L === 'ar') document.documentElement.dir = 'rtl';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = s => document.querySelector(s);
  const POS = { n: 'posN', noun: 'posN', v: 'posV', verb: 'posV', adj: 'posAdj', adjective: 'posAdj', adv: 'posAdv', adverb: 'posAdv', 'phr v': 'posPhrV', 'phrasal v': 'posPhrV', 'phrasal verb': 'posPhrV', phrase: 'posPhrase', idiom: 'posIdiom', prep: 'posPrep', preposition: 'posPrep', conj: 'posConj', conjunction: 'posConj', pron: 'posPron', pronoun: 'posPron', det: 'posDet', determiner: 'posDet', excl: 'posExcl', exclamation: 'posExcl', num: 'posNum', abbr: 'posAbbr', collocation: 'posColl' };
  const posName = p => { const k = POS[String(p || '').toLowerCase().trim()]; return k ? tx(k) : ''; };

  // Khung tĩnh
  $('#ntQ').placeholder = tx('ntSearch'); $('#ntGo').setAttribute('aria-label', tx('ntSearchBtn'));
  $('#ntOpen').textContent = tx('openApp'); $('#ntOpen').href = chrome.runtime.getURL('app/index.html');
  $('#ntOff').textContent = tx('ntOff'); $('#ntQuizL').textContent = tx('ntQuiz');
  $('#ntKeys').textContent = '⌨ ' + tx('ntKeys'); $('#ntKeys').setAttribute('aria-label', tx('ntShortcuts') + ': ' + tx('ntKeys'));
  $('#ntSearch').onsubmit = e => { e.preventDefault(); const q = $('#ntQ').value.trim(); if (!q) return; if (chrome.search && chrome.search.query) chrome.search.query({ text: q, disposition: 'CURRENT_TAB' }); else location.href = 'https://www.google.com/search?q=' + encodeURIComponent(q); };
  $('#ntOff').onclick = async () => { settings.newtabOn = false; await Store.set('settings', settings); toDefault(); };
  chrome.runtime.sendMessage({ type: 'usage', ev: 'newtab' }).catch(() => {}); // thống kê ẩn danh: chỉ đếm số lần mở

  // Tiến độ hôm nay (số từ khác nhau đã xem ở tab mới / mục tiêu ngày)
  const today = new Date().toLocaleDateString('en-CA');
  const day = local.ntDay && local.ntDay.d === today ? local.ntDay : { d: today, w: [] };
  const goal = Math.max(1, +settings.dailyGoal || 20);
  const ring = () => { const n = day.w.length; $('#ntRingFg').setAttribute('stroke-dasharray', `${Math.min(100, (n / goal) * 100)} 100`); $('#ntRingN').textContent = n; $('#ntRing').setAttribute('aria-label', tx('ntProgress', { n, g: goal })); $('#ntRing').title = tx('ntProgress', { n, g: goal }); };
  const seen = w => { const k = keyOf(w); if (!day.w.includes(k)) { day.w.push(k); day.w = day.w.slice(-500); chrome.storage.local.set({ ntDay: day }).catch(() => {}); } ring(); };

  // Dữ liệu từ (theo chữ cái đầu, nạp khi cần)
  const SH = {}, shard = c => (SH[c] = SH[c] || getJSON(`nt/${c}.json`));
  const shardOf = k => (/^[a-z]/.test(k) ? k[0] : '_');
  const info = async w => { const k = keyOf(w), m = await shard(shardOf(k)); return Object.hasOwn(m, k) ? m[k] : null; };

  // Hàng đợi thẻ: đến hạn → đã lưu (mới nhất, xáo trong 10 thẻ) → kho Lexkite (B1–C1, có nghĩa + ví dụ)
  const now = Date.now(), list = Object.values(cards);
  const due = list.filter(c => c.srs && (c.srs.reps > 0 || c.srs.last) && c.srs.due <= now).sort((a, b) => a.srs.due - b.srs.due);
  const recent = list.filter(c => !due.includes(c)).sort((a, b) => (b.added || 0) - (a.added || 0)).slice(0, 10).sort(() => Math.random() - 0.5);
  const queue = [...due.map(c => ({ w: c.word, tag: 'due' })), ...recent.map(c => ({ w: c.word, tag: 'saved' }))];
  const LET = 'abcdefghilmnoprstuw';
  const randomWord = async () => {
    for (let i = 0; i < 4; i++) {
      const m = await shard(LET[Math.floor(Math.random() * LET.length)]), ks = Object.keys(m).filter(k => /^(B1|B2|C1)$/.test(m[k].l) && m[k].s && m[k].e && !cards[k] && !day.w.includes(k));
      if (ks.length) return m[ks[Math.floor(Math.random() * ks.length)]].w;
    }
    return 'resilience';
  };
  let qi = 0, quiz = !!local.ntQuiz, slow = !!local.ntSlow, cur = null;

  // Âm thanh: giọng Anh = mp3 Kokoro (bf_emma) trong kho audio.lexkite.com nếu có (khóa giống web/js/listen/kvoice.js), không thì giọng máy; giọng Mỹ = giọng máy en-US.
  const fnv = s => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(36); };
  const AU = ['https://audio.lexkite.com/audio/l/', 'https://lexkiteapp.github.io/audio/l/'];
  let audioEl = null;
  const pickVoice = lang => speechSynthesis.getVoices().filter(x => x.lang.replace('_', '-') === lang).sort((a, b) => (/Natural|Online|Google/.test(b.name) ? 1 : 0) - (/Natural|Online|Google/.test(a.name) ? 1 : 0))[0];
  const tts = (text, lang) => {
    if (!('speechSynthesis' in self)) return;
    const go = () => { const u = new SpeechSynthesisUtterance(text); u.lang = lang; u.rate = slow ? 0.6 : settings.ttsRate || 0.92; const v = pickVoice(lang); if (v) u.voice = v; speechSynthesis.cancel(); speechSynthesis.speak(u); };
    if (speechSynthesis.getVoices().length) return go();
    let done = false; const f = () => { if (!done) { done = true; go(); } };
    speechSynthesis.addEventListener('voiceschanged', f, { once: true }); setTimeout(f, 800);
  };
  const play = acc => {
    if (!cur) return;
    if (audioEl) { audioEl.onerror = null; audioEl.pause(); audioEl = null; }
    if ('speechSynthesis' in self) speechSynthesis.cancel();
    if (acc === 'uk' && cur.mp3) {
      const key = fnv('bf_emma|' + cur.word.trim()), tryAt = i => {
        if (i >= AU.length) return tts(cur.word, 'en-GB');
        const el = audioEl = new Audio(AU[i] + key + '.mp3'); el.preservesPitch = true; el.playbackRate = slow ? 0.7 : 1;
        el.onerror = () => { if (audioEl === el) tryAt(i + 1); };
        el.play().catch(() => el.onerror && el.onerror());
      };
      return tryAt(0);
    }
    tts(cur.word, acc === 'us' ? 'en-US' : 'en-GB');
  };
  if ('speechSynthesis' in self) speechSynthesis.getVoices();

  // Dịch máy khi bấm (ví dụ) hoặc sau khi vẽ (nghĩa cho ngôn ngữ chưa có nghĩa soạn sẵn) – đệm 300 mục trong chrome.storage.local
  let TRC = null;
  const translate = async text => {
    if (!text || L === 'en') return '';
    TRC = TRC || (await chrome.storage.local.get('ntTr').catch(() => ({}))).ntTr || {};
    const ck = L + '|' + text;
    if (TRC[ck]) return TRC[ck];
    const r = await chrome.runtime.sendMessage({ type: 'translate', text, tl: L }).catch(() => null);
    const out = (r && r.vi) || '';
    if (out) { TRC[ck] = out; const ks = Object.keys(TRC); if (ks.length > 300) for (const k of ks.slice(0, ks.length - 300)) delete TRC[k]; chrome.storage.local.set({ ntTr: TRC }).catch(() => {}); }
    return out;
  };

  // Ghép dữ liệu: kho Lexkite (D) + thẻ người dùng (C)
  const build = (word, D, C) => {
    D = D || {}; C = C || {};
    let senses = (D.s || []).map(([p, vi, def]) => ({ p, vi, def }));
    if (!senses.length && (C.def || C.vi)) senses = [{ p: C.pos || '', vi: C.vi || '', def: C.def || '' }];
    const ctx = (C.contexts && C.contexts[0] && C.contexts[0].text) || '';
    return { word: D.w || C.word || word, ipa: D.i || C.ipa || '', ipaUS: D.u || C.ipaUS || '', level: D.l || C.level || '', exams: D.x || [], senses,
      ex: String(ctx || D.e || C.ex || '').slice(0, 220), col: D.c || [], syn: D.y || [], ant: D.a || [], fam: D.f || [], mp3: !!D.k, saved: !!cards[keyOf(word)] };
  };
  const hl = (ex, w) => {
    const stem = w.toLowerCase().replace(/(e|y)$/, ''), re = new RegExp(`\\b(${stem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[a-z]*)`, 'i');
    const parts = String(ex).split(re);
    return parts.map((p, i) => (i % 2 ? `<mark>${esc(p)}</mark>` : esc(p))).join('');
  };
  const SVG_PLAY = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M8 5.5v13l10-6.5z" fill="currentColor"/></svg>';
  const tagLine = t => (t === 'due' ? '⏰ ' + tx('ntGolden') + ` · ${due.length}` : t === 'saved' ? '📌 ' + tx('ntSaved') : '✨ ' + tx('ntToday'));

  const render = (c, tag) => {
    cur = c;
    $('#ntTag').textContent = tagLine(tag);
    const meanMain = s => (L === 'vi' ? s.vi || s.def : s.def || s.vi);
    const showVi = L === 'vi';
    // nhóm nghĩa theo loại từ, đánh số liên tục
    const groups = []; for (const s of c.senses) { let g = groups.find(x => x.p === s.p); if (!g) groups.push(g = { p: s.p, items: [] }); g.items.push(s); }
    let n = 0;
    const sensesHtml = c.senses.length ? `<ol class="senses">${groups.map(g => `${groups.length > 1 && posName(g.p) ? `<li class="pos-h" aria-hidden="true">${esc(posName(g.p))}</li>` : ''}${g.items.map(s => `<li class="sense"><span class="n">${++n}</span><span class="m"${showVi ? '' : ' dir="ltr" lang="en"'}>${esc(meanMain(s))}</span>${showVi && s.def && s.vi ? `<span class="d" dir="ltr" lang="en">${esc(s.def)}</span>` : ''}${!showVi && L !== 'en' ? `<span class="mt" data-mt="${esc(s.def)}" hidden></span>` : ''}</li>`).join('')}`).join('')}</ol>` : '';
    const posChips = [...new Set(c.senses.map(s => posName(s.p)).filter(Boolean))].map(p => `<span class="chip pos">${esc(p)}</span>`).join('');
    const sec = (key, items) => (items.length ? `<details><summary>${esc(tx(key))}<span class="cnt">${items.length}</span></summary><ul class="tags" dir="ltr" lang="en">${items.map(x => `<li>${esc(x)}</li>`).join('')}</ul></details>` : '');
    const more = sec('ntFamily', c.fam) + sec('ntColloc', c.col) + sec('ntSyn', c.syn) + sec('ntAnt', c.ant);
    const pr = (acc, ipa) => `<span class="pr"><span class="acc">${esc(tx(acc === 'uk' ? 'ntUK' : 'ntUS'))}</span>${ipa ? `<span class="ipa" dir="ltr">${esc(ipa)}</span>` : ''}<button class="play" type="button" data-acc="${acc}" aria-label="${esc(tx('ntListen') + ' – ' + tx(acc === 'uk' ? 'ntUK' : 'ntUS'))}">${SVG_PLAY}</button></span>`;
    $('#ntCard').innerHTML = `
      <div class="nt-head"><h1 class="nt-word" dir="ltr" lang="en">${esc(c.word)}</h1><div class="nt-chips">${posChips}${c.level ? `<span class="chip cefr" title="CEFR">${esc(c.level)}</span>` : ''}${c.exams.map(x => `<span class="chip ex" dir="ltr">${esc(x)}</span>`).join('')}</div></div>
      <div class="nt-pron">${pr('uk', c.ipa)}${pr('us', c.ipaUS)}<button class="slow" type="button" id="ntSlow" aria-pressed="${slow}">🐢 ${esc(tx('ntSlow'))}</button></div>
      ${sensesHtml ? `<div class="nt-body${quiz ? ' quiz-hidden' : ''}" id="ntBody">${sensesHtml}<div class="veil"><button type="button" id="ntReveal">${esc(tx('ntReveal'))} · Space</button></div></div>` : ''}
      ${c.ex ? `<button class="ex" type="button" id="ntEx" aria-label="${esc(tx('ntExample'))}"><q dir="ltr" lang="en">${hl(c.ex, c.word)}</q>${L !== 'en' ? `<span class="hint">${esc(tx('ntTapTr'))}</span>` : ''}</button>` : ''}
      ${more ? `<div class="more">${more}</div>` : ''}
      <div class="nt-act" id="ntAct">${c.saved ? `<button class="btn good" type="button" id="ntGood">${esc(tx('ntGot'))} <kbd>1</kbd></button><button class="btn" type="button" id="ntAgain">${esc(tx('ntAgain'))} <kbd>2</kbd></button>` : `<button class="btn add" type="button" id="ntAdd">${esc(tx('ntAdd'))}</button>`}<button class="btn next" type="button" id="ntNext">${esc(tx('ntNext'))}</button></div>`;
    $('#ntCard').querySelectorAll('.play').forEach(b => (b.onclick = () => play(b.dataset.acc)));
    $('#ntSlow').onclick = () => { slow = !slow; $('#ntSlow').setAttribute('aria-pressed', slow); chrome.storage.local.set({ ntSlow: slow }).catch(() => {}); };
    if ($('#ntReveal')) $('#ntReveal').onclick = reveal;
    if ($('#ntEx')) $('#ntEx').onclick = async () => {
      const b = $('#ntEx'); if (L === 'en' || b.querySelector('.tr')) return;
      const s = document.createElement('span'); s.className = 'tr'; s.textContent = '…'; b.querySelector('.hint')?.remove(); b.appendChild(s);
      const tr = await translate(c.ex); s.textContent = tr || '—'; if (tr) s.insertAdjacentHTML('beforeend', `<span class="mt-l">${esc(tx('ntMT'))}</span>`);
    };
    if ($('#ntAdd')) $('#ntAdd').onclick = add;
    if ($('#ntGood')) { $('#ntGood').onclick = () => grade(2); $('#ntAgain').onclick = () => grade(0); }
    $('#ntNext').onclick = next;
    seen(c.word);
    // nghĩa ở ngôn ngữ chưa có bản soạn sẵn: dịch máy sau khi vẽ (ghi rõ "Dịch máy")
    if (!showVi && L !== 'en') setTimeout(() => $('#ntCard').querySelectorAll('[data-mt]').forEach(async el => { const tr = await translate(el.dataset.mt); if (tr && cur === c) { el.textContent = tr; el.insertAdjacentHTML('beforeend', `<span class="mt-l">${esc(tx('ntMT'))}</span>`); el.hidden = false; } }), 150);
  };
  const reveal = () => { const b = $('#ntBody'); if (b && b.classList.contains('quiz-hidden')) { b.classList.remove('quiz-hidden'); $('#ntGood')?.focus(); return true; } return false; };
  const show = async () => {
    const item = qi < queue.length ? queue[qi] : { w: await randomWord(), tag: 'lex' }; qi++;
    render(build(item.w, await info(item.w), cards[keyOf(item.w)]), item.tag);
  };
  const next = () => show();
  const grade = async g => {
    if (!cur || !cur.saved) return;
    const w = cur.word; await Cards.patch(w, card => { card.srs = SRS.review(card.srs, g); });
    chrome.runtime.sendMessage({ type: 'triggerSync' }).catch(() => {});
    next();
  };
  const add = async () => {
    if (!cur || cur.saved) return;
    const s = cur.senses[0] || {};
    await Cards.add({ word: cur.word, ipa: cur.ipa, ipaUS: cur.ipaUS, pos: s.p || '', vi: s.vi || '', def: s.def || '', ex: cur.ex, level: cur.level }, null);
    cards[keyOf(cur.word)] = true; cur.saved = true;
    chrome.runtime.sendMessage({ type: 'triggerSync' }).catch(() => {});
    const b = $('#ntAdd'); b.textContent = tx('ntAdded'); b.disabled = true;
  };
  $('#ntQuiz').checked = quiz;
  $('#ntQuiz').onchange = e => { quiz = e.target.checked; chrome.storage.local.set({ ntQuiz: quiz }).catch(() => {}); const b = $('#ntBody'); if (b) b.classList.toggle('quiz-hidden', quiz); };
  document.addEventListener('keydown', e => {
    if (e.ctrlKey || e.metaKey || e.altKey || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    const k = e.key.toLowerCase();
    if (e.key === ' ') { if (reveal()) e.preventDefault(); else if (e.target === document.body) e.preventDefault(); }
    else if (k === '1' && cur && cur.saved) grade(2);
    else if (k === '2' && cur && cur.saved) grade(0);
    else if (k === 'n') next();
    else if (k === 'p') play(settings.accent === 'en-US' ? 'us' : 'uk');
  });
  ring();
  await show();
  document.body.dataset.ntMs = Math.round(performance.now() - T0); // đo thời gian vẽ (ext-e2e kiểm < 100 ms)
})();
