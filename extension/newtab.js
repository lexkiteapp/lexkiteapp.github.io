/* Tab mới Lexkite: thẻ từ kiểu từ điển lớn. Thứ tự thẻ: đến hạn ôn FSRS ("thời điểm vàng") → từ đã lưu → từ trong kho Lexkite.
 * Dữ liệu CHỈ lấy từ gói add-on (nt/<chữ cái>.json – scripts/gen-newtab.mjs; thẻ người dùng trong chrome.storage): không mạng lúc vẽ lần đầu.
 * Thiếu trường nào → ẩn mục đó (không bịa). Mạng chỉ khi người dùng bấm: mp3 giọng Anh (audio.lexkite.com), dịch ví dụ/nghĩa (Google Translate qua background).
 * Chữ giao diện: extension/_locales/<lang>/messages.json (khóa nt*, pos*). Tắt được (popup hoặc nút dưới trang) → tab mới mặc định của Chrome. */
(async () => {
  const T0 = performance.now();
  const { Store, Cards, SRS, DEFAULT_SETTINGS, keyOf } = Core;
  const XL = ['vi', 'en', 'es', 'pt', 'fr', 'de', 'id', 'th', 'zh', 'ja', 'ko', 'hi', 'ar', 'ru', 'tr'], pick = l => { l = String(l || '').toLowerCase().split('-')[0]; return XL.includes(l) ? l : null; };
  const getJSON = p => fetch(chrome.runtime.getURL(p)).then(r => (r.ok ? r.json() : {})).catch(() => ({}));
  const [stored, cards, local] = await Promise.all([Store.get('settings', {}), Cards.all(), chrome.storage.local.get(['uiLang', 'ntQuiz', 'ntDay', 'ntAcc']).catch(() => ({}))]);
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
  $('#ntKeys').title = tx('ntShortcuts') + ': ' + tx('ntKeys'); $('#ntKeys').setAttribute('aria-label', $('#ntKeys').title);
  const h = new Date().getHours(), P = h < 11 ? ['#0F3D3E', '#1F7A72', '#F2A65A'] : h < 17 ? ['#164e63', '#1F7A72', '#E5502F'] : ['#0b1e2a', '#173d4a', '#8b3a2a']; // nền theo giờ
  ['--a', '--b', '--c'].forEach((k, i) => document.body.style.setProperty(k, P[i]));
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
  let qi = 0, quiz = !!local.ntQuiz, cur = null, lastAcc = local.ntAcc === 'us' || local.ntAcc === 'uk' ? local.ntAcc : settings.accent === 'en-US' ? 'us' : 'uk';

  // Âm thanh: giọng Anh = mp3 Kokoro (bf_emma) trong kho audio.lexkite.com nếu có (khóa giống web/js/listen/kvoice.js), không thì giọng máy; giọng Mỹ = giọng máy en-US.
  const fnv = s => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(36); };
  const AU = ['https://audio.lexkite.com/audio/l/', 'https://lexkiteapp.github.io/audio/l/'];
  let audioEl = null;
  const pickVoice = lang => speechSynthesis.getVoices().filter(x => x.lang.replace('_', '-') === lang).sort((a, b) => (/Natural|Online|Google/.test(b.name) ? 1 : 0) - (/Natural|Online|Google/.test(a.name) ? 1 : 0))[0];
  // Phát NGAY trong trình xử lý bấm (giữ "user gesture" của Chrome – không chờ voiceschanged/await trước khi speak/play).
  // 🐢 = phát chậm (mp3 0,7× giữ cao độ; giọng máy 0,6×) theo giọng vừa nghe gần nhất (mặc định Anh). Không mạng/không mp3 → speechSynthesis
  // (giọng cài sẵn của máy chạy offline; chrome.tts cần thêm quyền "tts" nên không dùng – permissions.lock).
  const tts = (text, lang, rate) => {
    if (!('speechSynthesis' in self)) return;
    const u = new SpeechSynthesisUtterance(text); u.lang = lang; u.rate = rate; const v = pickVoice(lang); if (v) u.voice = v;
    speechSynthesis.cancel(); speechSynthesis.speak(u);
  };
  const play = (acc, isSlow) => {
    if (!cur) return;
    acc = acc === 'us' ? 'us' : 'uk';
    if (!isSlow && acc !== lastAcc) { lastAcc = acc; chrome.storage.local.set({ ntAcc: acc }).catch(() => {}); }
    if (audioEl) { audioEl.onerror = null; audioEl.pause(); audioEl = null; }
    if ('speechSynthesis' in self) speechSynthesis.cancel();
    const word = cur.word, lang = acc === 'us' ? 'en-US' : 'en-GB', ttsRate = isSlow ? 0.6 : settings.ttsRate || 0.92;
    if (acc === 'uk' && cur.mp3) {
      const key = fnv('bf_emma|' + word.trim()), tryAt = i => {
        if (i >= AU.length || !navigator.onLine) return tts(word, lang, ttsRate);
        const el = audioEl = new Audio(); el.preservesPitch = true;
        el.defaultPlaybackRate = el.playbackRate = isSlow ? 0.7 : 1; // Chrome đặt lại playbackRate = defaultPlaybackRate khi nạp nguồn
        el.src = AU[i] + key + '.mp3';
        el.onerror = () => { if (audioEl === el) tryAt(i + 1); };
        el.play().catch(() => el.onerror && el.onerror());
      };
      return tryAt(0);
    }
    tts(word, lang, ttsRate);
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
  const SVG_PLAY = '<svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true"><path d="M8 5.5v13l10-6.5z" fill="currentColor"/></svg>';
  const tagLine = t => (t === 'due' ? '⏰ ' + tx('ntGolden') + ` · ${due.length}` : t === 'saved' ? '📌 ' + tx('ntSaved') : '✨ ' + tx('ntToday'));

  const render = (c, tag) => {
    cur = c;
    $('#ntTag').textContent = tagLine(tag);
    const showVi = L === 'vi', mtOn = !showVi && L !== 'en';
    const meanMain = s => (showVi ? s.vi || s.def : s.def || s.vi);
    const [s1, ...rest] = c.senses;
    const posChips = [...new Set(c.senses.map(s => (L === 'vi' ? s.p : posName(s.p))).filter(Boolean))].slice(0, 2).map(p => `<span class="chip pos">${esc(p)}</span>`).join('');
    const ex3 = c.exams.slice(0, 3).map(x => `<span class="chip exam" dir="ltr">${esc(x)}</span>`).join('') + (c.exams.length > 3 ? `<span class="chip exam" title="${esc(c.exams.slice(3).join(' · '))}">+${c.exams.length - 3}</span>` : '');
    // phát âm giống bảng tra (content.js): dòng IPA "Anh · Mỹ" (1 IPA nếu trùng/chưa có Mỹ) + nút viên "🔊 UK" "🔊 US" "🐢" (cùng lớp .ipa/.spks/.spk)
    const pb = acc => `<button class="spk" type="button" data-acc="${acc}" aria-label="${esc(tx('ntListen') + ' – ' + tx(acc === 'uk' ? 'ntUK' : 'ntUS'))}" title="${esc(tx(acc === 'uk' ? 'ntUK' : 'ntUS'))}${acc === 'uk' ? ' (P)' : ''}">🔊 ${acc === 'uk' ? 'UK' : 'US'}</button>`;
    const ipaLine = c.ipa || c.ipaUS ? `<div class="ipa" dir="ltr">${esc(c.ipa || c.ipaUS)}${c.ipa && c.ipaUS && c.ipaUS !== c.ipa ? ` · <span title="${esc(tx('ntUS'))}">${esc(c.ipaUS)}</span>` : ''}</div>` : '';
    const mtSpan = s => (mtOn && s.def ? `<span class="mt" data-mt="${esc(s.def)}" hidden></span>` : '');
    const meanHtml = s1 ? `<div class="meanings"><div class="m1"${showVi ? '' : ' dir="ltr" lang="en"'}>${esc(meanMain(s1))}</div>${showVi && s1.def && s1.vi ? `<div class="d1" dir="ltr" lang="en">${esc(s1.def)}</div>` : ''}${mtSpan(s1)}${rest.length ? `<button class="lnk" type="button" id="ntMoreS" aria-expanded="false">${esc(tx('ntMoreSenses', { n: rest.length }))}</button><ol class="senses2" id="ntS2" hidden>${rest.map((s, i) => `<li><span class="n">${i + 2}</span>${posName(s.p) && s.p !== s1.p ? `<span class="p">${esc(posName(s.p))}</span>` : ''}<span${showVi ? '' : ' dir="ltr" lang="en"'}>${esc(meanMain(s))}</span>${showVi && s.def && s.vi ? `<span class="d" dir="ltr" lang="en">${esc(s.def)}</span>` : ''}${mtSpan(s)}</li>`).join('')}</ol>` : ''}</div>` : '';
    const groups = [['ntFamily', c.fam], ['ntColloc', c.col], ['ntSyn', c.syn], ['ntAnt', c.ant]].filter(g => g[1].length);
    $('#ntCard').innerHTML = `
      <div class="nt-head"><h1 class="nt-word" dir="ltr" lang="en">${esc(c.word)}</h1><span class="nt-chips">${posChips}${c.level ? `<span class="chip cefr" title="CEFR">${esc(c.level)}</span>` : ''}${ex3}</span></div>
      ${ipaLine}<div class="spks">${pb('uk')}${pb('us')}<button class="spk" type="button" id="ntSlow" title="${esc(tx('ntSlow'))}" aria-label="${esc(tx('ntSlow'))}">🐢</button></div>
      ${meanHtml ? `<div class="nt-body${quiz ? ' quiz-hidden' : ''}" id="ntBody">${meanHtml}<div class="veil"><button type="button" id="ntReveal" title="Space">${esc(tx('ntReveal'))}</button></div></div>` : ''}
      ${c.ex ? `<button class="ex" type="button" id="ntEx" title="${esc(L !== 'en' ? tx('ntTapTr') : tx('ntExample'))}" aria-label="${esc(tx('ntExample'))}"><span dir="ltr" lang="en">“${hl(c.ex, c.word)}”</span></button>` : ''}
      ${groups.length ? `<div class="more" role="group">${groups.map(([k, a], i) => `<button type="button" data-g="${i}" aria-expanded="false" aria-controls="ntPanel">${esc(tx(k))}<b>${a.length}</b></button>`).join('')}</div><div class="panel" id="ntPanel" dir="ltr" lang="en" hidden></div>` : ''}
      <div class="nt-act" id="ntAct">${c.saved ? `<button class="btn good" type="button" id="ntGood" title="1">${esc(tx('ntGot'))}</button><button class="btn" type="button" id="ntAgain" title="2">${esc(tx('ntAgain'))}</button>` : `<button class="btn add" type="button" id="ntAdd">${esc(tx('ntAdd'))}</button>`}<button class="btn next" type="button" id="ntNext" title="N">${esc(tx('ntNext'))}</button></div>`;
    $('#ntCard').querySelectorAll('[data-acc]').forEach(b => (b.onclick = () => play(b.dataset.acc)));
    $('#ntSlow').onclick = () => play(lastAcc, true);
    if ($('#ntReveal')) $('#ntReveal').onclick = reveal;
    if ($('#ntMoreS')) $('#ntMoreS').onclick = () => { const o = $('#ntS2').hidden; $('#ntS2').hidden = !o; $('#ntMoreS').setAttribute('aria-expanded', o); };
    $('#ntCard').querySelectorAll('[data-g]').forEach(b => (b.onclick = () => {
      const p = $('#ntPanel'), open = b.getAttribute('aria-expanded') === 'true';
      $('#ntCard').querySelectorAll('[data-g]').forEach(x => x.setAttribute('aria-expanded', 'false'));
      if (open) { p.hidden = true; return; }
      b.setAttribute('aria-expanded', 'true'); p.innerHTML = groups[+b.dataset.g][1].map(x => `<span>${esc(x)}</span>`).join(''); p.hidden = false;
    }));
    if ($('#ntEx')) $('#ntEx').onclick = async () => {
      const b = $('#ntEx'); b.classList.add('open'); if (L === 'en' || b.querySelector('.tr')) return;
      const s = document.createElement('span'); s.className = 'tr'; s.textContent = '…'; b.appendChild(s);
      const tr = await translate(c.ex); s.textContent = tr || '—'; if (tr) s.insertAdjacentHTML('beforeend', `<span class="mt-l">${esc(tx('ntMT'))}</span>`);
    };
    if ($('#ntAdd')) $('#ntAdd').onclick = add;
    if ($('#ntGood')) { $('#ntGood').onclick = () => grade(2); $('#ntAgain').onclick = () => grade(0); }
    $('#ntNext').onclick = next;
    seen(c.word);
    // nghĩa ở ngôn ngữ chưa có bản soạn sẵn: dịch máy sau khi vẽ (ghi rõ "Dịch máy")
    if (mtOn) setTimeout(() => $('#ntCard').querySelectorAll('[data-mt]').forEach(async el => { const tr = await translate(el.dataset.mt); if (tr && cur === c) { el.textContent = tr; el.insertAdjacentHTML('beforeend', `<span class="mt-l">${esc(tx('ntMT'))}</span>`); el.hidden = false; } }), 150);
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
    if (e.ctrlKey || e.metaKey || e.altKey || e.target.isContentEditable || /^(TEXTAREA|SELECT)$/.test(e.target.tagName) || (e.target.tagName === "INPUT" && e.target.type !== "checkbox")) return;
    const k = e.key.toLowerCase();
    if (e.key === ' ') { if (reveal()) e.preventDefault(); else if (e.target === document.body) e.preventDefault(); }
    else if (k === '1' && cur && cur.saved) grade(2);
    else if (k === '2' && cur && cur.saved) grade(0);
    else if (k === 'n') next();
    else if (k === 'p') play(lastAcc, e.shiftKey);
  });
  ring();
  await show();
  document.body.dataset.ntMs = Math.round(performance.now() - T0); // đo thời gian vẽ (ext-e2e kiểm < 100 ms)
})();
