/* Luyện nghe IELTS: đề tự biên soạn (js/listen/*.js), giọng đọc nhiều người (Anh–Mỹ–Úc) bằng Web Speech,
 * chế độ luyện tập (nghe lại, chỉ chỗ có đáp án) / thi thật (nghe 1 lần), thi trọn 40 câu có quy đổi band, chép chính tả. */
(function () {
  const { $, $$, esc, toast } = UI;
  const App = window.App;
  const { state, routes } = App;
  const view = App.view;
  // Xoay vòng phương án trắc nghiệm theo số câu → đáp án phân bố đều A/B/C (chấm theo chỉ số nên vẫn đúng)
  (window.LISTENING || []).forEach(p => p.groups.forEach(g => g.type === 'mcq' && !g._rot && (g._rot = 1) && g.items.forEach(it => {
    if (it.options.length !== 3) return;
    const want = [0, 2, 1, 1, 0, 2, 2, 1, 0, 1, 2, 0][it.n % 12], r = (it.a - want + 3) % 3; if (!r) return;
    it.options = it.options.slice(r).concat(it.options.slice(0, r)); it.a = (it.a - r + 3) % 3;
  })));
  const ALL = () => window.LISTENING || [];
  const byId = id => ALL().find(p => p.id === id) || ((window.TOEIC || {}).listening || []).find(p => p.id === id);
  const TOEIC_PART = { 1: t('Mô tả tranh'), 2: t('Hỏi – đáp'), 3: t('Hội thoại'), 4: t('Bài nói ngắn') };
  const partName = p => p.exam === 'toeic' || /^tl/.test(p.id) ? 'TOEIC · ' + (TOEIC_PART[p.part] || '') : PART[p.part];
  const tests = () => [...new Set(ALL().map(p => p.test))].sort((a, b) => a - b);
  const partsOf = n => ALL().filter(p => p.test === n).sort((a, b) => a.part - b.part);
  const PART = { 1: t('Hội thoại đời sống'), 2: t('Độc thoại xã hội'), 3: t('Thảo luận học thuật'), 4: t('Bài giảng học thuật') };
  const ACC = { 'en-GB': '🇬🇧', 'en-US': '🇺🇸', 'en-AU': '🇦🇺' };
  const qNums = p => p.groups.flatMap(g => g.type === 'multi' ? g.n : g.items.map(i => i.n));

  // Quy đổi điểm Listening (thang công bố phổ biến của IELTS, chỉ mang tính tham khảo)
  const bandOf = raw => QE.bandOf(raw, 'listening');

  // ================= GIỌNG ĐỌC =================
  const FEMALE = /female|woman|samantha|karen|moira|tessa|serena|kate|susan|martha|fiona|victoria|allison|ava|zira|hazel|libby|sonia|maisie|emma|jenny|aria|natasha|catherine|nicky|joanna|salli|kimberly|ivy|amy|olivia|google uk english female|google us english/i;
  const MALE = /\bmale\b|daniel|alex|fred|oliver|arthur|gordon|\blee\b|aaron|\btom\b|rishi|ryan|guy|george|james|thomas|william|christopher|eric|brian|russell|matthew|joey|justin|google uk english male/i;
  function castVoices(p) {
    const used = new Set(), cast = {};
    const pick = (accent, gender) => {
      const list = UI.voicesFor(accent).length ? UI.voicesFor(accent) : UI.voicesFor('en-GB');
      const want = gender === 'f' ? FEMALE : MALE, avoid = gender === 'f' ? MALE : FEMALE;
      const v = list.find(x => !used.has(x.name) && want.test(x.name) && !(gender === 'f' && /\bmale\b/i.test(x.name) && !/female/i.test(x.name)))
        || list.find(x => !used.has(x.name) && !avoid.test(x.name)) || list.find(x => !used.has(x.name)) || list[0] || null;
      if (v) used.add(v.name);
      // Không đủ giọng khác nhau → đổi cao độ để vẫn phân biệt người nói
      const same = v && Object.values(cast).some(c => c.voice === v);
      return { voice: v, lang: accent, pitch: same ? (gender === 'f' ? 1.2 : 0.8) : (gender === 'f' ? 1.05 : 0.95) };
    };
    Object.entries(p.speakers || {}).forEach(([k, s]) => { cast[k] = pick(s.accent || 'en-GB', s.gender); });
    const gb = UI.voicesFor('en-GB');
    cast._narrator = { voice: gb.find(v => !used.has(v.name)) || gb[0] || null, lang: 'en-GB', pitch: 1 };
    return cast;
  }

  // ================= TRÌNH PHÁT =================
  // Hàng đợi: mỗi phần tử là 1 dòng thoại / lời dẫn / khoảng lặng; onLine(i) để tô sáng transcript
  // Giọng Kokoro tạo sẵn (js/listen/kvoice.js + audio-index.js): ưu tiên file mp3 chất lượng cao, thiếu file/lỗi mạng → giọng của máy
  const AUDIO_BASE = 'https://lexkiteapp.github.io/'; // file âm thanh lớn → Cloudflare Pages (băng thông không giới hạn)
  let audioDown = 0;
  const hqOn = () => state.settings.hqVoice !== false && window.KVoice && window.LISTEN_AUDIO && audioDown < 3;
  function Player(p, opts = {}) {
    const cast = castVoices(p), kv = window.KVoice ? KVoice.voices(p) : null;
    const q = p.script.map((l, i) => ({ ...l, i }));
    let pos = 0, playing = false, seq = 0, timer = null, el = null;
    const rate = () => opts.rate ? opts.rate() : (state.settings.listenRate || 0.95);
    const stopNow = () => { seq++; clearTimeout(timer); if ('speechSynthesis' in window) speechSynthesis.cancel(); if (el) { el.onended = el.onerror = null; el.pause(); el = null; } };
    const hqKey = l => { if (!kv || !hqOn()) return null; const k = KVoice.lineKey(l.say ? kv._narrator : (kv[l.s] || kv._narrator), l.say || l.t); return LISTEN_AUDIO.has(k) ? k : null; };
    function step(my) {
      if (my !== seq) return;
      if (pos >= q.length) { playing = false; opts.onLine && opts.onLine(-1); opts.onEnd && opts.onEnd(); return; }
      const l = q[pos];
      opts.onLine && opts.onLine(l.i);
      const next = () => { if (my !== seq) return; pos++; step(my); };
      if (l.pause != null) { timer = setTimeout(next, Math.min(8, l.pause) * 1000); return; }
      if (l.say && opts.skipNarrator) { next(); return; }
      const key = hqKey(l);
      if (key) {
        el = new Audio(AUDIO_BASE + 'audio/l/' + key + '.mp3'); el.preservesPitch = true; el.playbackRate = l.say ? 1 : Math.min(1.3, Math.max(0.6, rate() / 0.95));
        const me = el; let ok = false;
        el.onplaying = () => { ok = true; audioDown = 0; };
        el.onended = () => { if (el === me) timer = setTimeout(next, l.say ? 600 : 280); };
        el.onerror = () => { if (el !== me) return; el = null; if (!ok) audioDown++; ttsLine(); };
        let pr; try { pr = el.play(); } catch (e) { pr = Promise.reject(e); }
        if (pr && pr.catch) pr.catch(() => { if (el === me && !ok) { el = null; ttsLine(); } });
        // tải trước câu kế tiếp → không bị khựng giữa các câu
        const nx = q.slice(pos + 1).find(x => x.t || x.say), nk = nx && hqKey(nx); if (nk) { const pre = new Audio(); pre.preload = 'auto'; pre.src = AUDIO_BASE + 'audio/l/' + nk + '.mp3'; }
        return;
      }
      ttsLine();
      function ttsLine() {
      if (!('speechSynthesis' in window)) { timer = setTimeout(next, 300); return; }
      const c = l.say ? cast._narrator : (cast[l.s] || cast._narrator);
      const parts = UI.splitSentences(l.say || l.t);
      parts.forEach((t, k) => {
        const u = new SpeechSynthesisUtterance(t);
        u.lang = c.lang; if (c.voice) u.voice = c.voice; u.pitch = c.pitch; u.rate = l.say ? 0.95 : rate();
        if (k === parts.length - 1) u.onend = u.onerror = () => { timer = setTimeout(next, l.say ? 600 : 280); };
        speechSynthesis.speak(u);
      });
      }
    }
    return {
      play(from) { if (!('speechSynthesis' in window) && !(window.LISTEN_AUDIO && LISTEN_AUDIO.size)) { toast(t('Trình duyệt không hỗ trợ đọc giọng nói – hãy dùng Chrome/Edge/Safari')); return; } stopNow(); if (from != null) pos = Math.max(0, q.findIndex(x => x.i === from)); playing = true; opts.onState && opts.onState(true); step(seq); },
      pause() { stopNow(); playing = false; opts.onState && opts.onState(false); },
      stop() { stopNow(); playing = false; pos = 0; opts.onState && opts.onState(false); },
      back() { const was = playing; stopNow(); let k = pos - 1; while (k > 0 && (q[k].pause != null || q[k].say)) k--; pos = Math.max(0, k); if (was) { playing = true; step(seq); } else opts.onLine && opts.onLine(q[pos].i); },
      get playing() { return playing; }, get pos() { return pos; }, cast,
    };
  }

  // Chấm điểm & hiển thị câu hỏi: dùng chung js/qengine.js
  const { collect, questionsHtml } = QE;

  // Transcript: chạm từ để tra, bấm số câu để nghe lại đoạn có đáp án
  function transcriptHtml(p, showEv) {
    const ev = {};
    if (showEv) p.groups.forEach(g => (g.type === 'multi' ? [{ n: g.n.join('–'), cue: g.cue }] : g.items).forEach(it => { const i = p.script.findIndex(l => l.t && it.cue && l.t.includes(it.cue)); if (i >= 0) (ev[i] = ev[i] || []).push({ n: it.n, cue: it.cue }); }));
    return p.script.map((l, i) => {
      if (l.pause != null) return '';
      if (l.say) return `<div class="tl say" data-line="${i}"><i>${esc(l.say)}</i></div>`;
      const sp = p.speakers[l.s] || { name: l.s };
      let html = Lexis.markSentence(l.t);
      (ev[i] || []).forEach(e => { const k = esc(e.cue); if (html.includes(k)) html = html.replace(k, `<mark class="evi">${k}</mark>`); });
      return `<div class="tl ${ev[i] ? 'has-ev' : ''}" data-line="${i}"><span class="spk">${esc(sp.name)}</span> <span class="sent">${html}</span>${(ev[i] || []).map(e => ` <span class="evn">${t('Câu {n}', { n: e.n })}</span>`).join('')}</div>`;
    }).join('');
  }

  // Popover tra từ trong transcript
  function bindWordPop(box, title) {
    let pop = null;
    const close = () => { if (pop) { pop.remove(); pop = null; } };
    box.addEventListener('click', async e => {
      const tw = e.target.closest('.tw'); if (!tw) return;
      e.stopPropagation(); close();
      const word = tw.dataset.w, sentence = tw.closest('.sent').textContent.replace(/\s+/g, ' ').trim();
      pop = document.createElement('div'); pop.className = 'pop'; const mine = pop;
      const br = box.getBoundingClientRect(), er = tw.getBoundingClientRect();
      pop.style.left = Math.max(8, Math.min(er.left - br.left - 20, br.width - 340)) + 'px';
      pop.style.top = (er.bottom - br.top + box.scrollTop + 6) + 'px';
      pop.innerHTML = `<div class="muted">⏳ ${t('Đang tra “{w}”…', { w: esc(word) })}</div>`; box.appendChild(pop);
      const d = (await Dict.quick(word)) || (await Dict.lookup(word, { examples: false, image: false }));
      if (pop !== mine) return;
      if (!d || !d.found) { pop.innerHTML = `<div class="muted">${t('Không tìm thấy “{w}”.', { w: esc(word) })}</div>`; return; }
      pop.innerHTML = `<div class="row between nowrap"><b style="font-size:1.15rem">${esc(d.word)}</b><button class="icon-btn sm" data-x>✕</button></div>
        <div class="row"><span class="ipa">${esc(d.ipa || '')}</span><button class="icon-btn sm" data-s>🔊</button></div><div class="vi">${esc(d.vi)}</div>
        ${UI.ctxBox(sentence, d.word)}
        <div class="row" style="margin-top:.6rem"><button class="btn sm primary" data-save>${App.inDeck(d.word) ? '+ ' + t('Thêm ngữ cảnh') : '+ ' + t('Lưu flashcard')}</button></div>`;
      $('[data-x]', pop).onclick = close;
      $('[data-s]', pop).onclick = () => UI.speak(d.word, state.settings.accent, d.audio);
      $('[data-save]', pop).onclick = async ev => { const b = ev.currentTarget; b.disabled = true; const vi = await Dict.translateVi(sentence); await App.addWord(d, { text: sentence, vi, title: '🎧 ' + title }); b.textContent = '✓ ' + t('Đã lưu kèm ngữ cảnh'); };
    });
    document.addEventListener('mousedown', function off(e) { if (!document.body.contains(box)) return document.removeEventListener('mousedown', off); if (pop && !pop.contains(e.target)) close(); });
  }

  const speakersHtml = p => Object.values(p.speakers || {}).map(s => `<span class="chip">${ACC[s.accent] || ''} ${esc(s.name)}</span>`).join('');
  const rateSel = () => `<select id="lRate" title="${t('Tốc độ')}">${[0.8, 0.9, 0.95, 1, 1.1].map(r => `<option value="${r}" ${(state.settings.listenRate || 0.95) == r ? 'selected' : ''}>${r === 0.95 ? t('Chuẩn') : r + '×'}</option>`).join('')}</select>`;

  // ================= DANH SÁCH =================
  routes.listening = function (arg, query) {
    // Chọn đề → mỗi lần hiện 1 đề (4 phần), nhớ đề đang luyện
    const all = tests();
    let cur = +(query && query.get && query.get('t')) || 0;
    if (!all.includes(cur)) { try { cur = +localStorage.getItem('vb.listenT') || 0; } catch (e) { cur = 0; } }
    if (!all.includes(cur)) cur = all[0] || 1;
    try { localStorage.setItem('vb.listenT', cur); } catch (e) { /* bỏ qua */ }
    const tabs = all.length > 1 ? `<div class="tabs" style="display:inline-flex;flex-wrap:wrap;margin-bottom:1rem">${all.map(n => `<a class="${n === cur ? 'on' : ''}" href="#/listening?t=${n}" style="padding:.45rem .8rem;border-radius:10px;font-weight:700;text-decoration:none;color:inherit;${n === cur ? 'background:var(--surface);box-shadow:var(--shadow-sm)' : ''}">Test ${n}${(state.game.listenBest || {})[n] != null ? ' ✓' : ''}</a>`).join('')}</div>` : '';
    const done = state.game.listenDone || {};
    const best = state.game.listenBest || {};
    view.innerHTML = `
      <div class="page-head"><div><h1>🎧 ${t('Luyện nghe IELTS')}</h1><p class="muted">${t('Đề tự biên soạn theo đúng cấu trúc IELTS Listening (4 phần · 40 câu). Mỗi người nói một giọng riêng – Anh, Mỹ, Úc. Luyện từng phần với nghe lại & chỉ chỗ có đáp án, hoặc thi thật nghe một lần.')}</p></div></div>
      ${App.voiceTipHtml && App.voiceTipHtml() ? `<div class="tip small" style="margin-bottom:1rem">${App.voiceTipHtml()}</div>` : ''}
      ${!ALL().length ? `<div class="card empty"><div class="em">🎧</div>${t('Đang cập nhật đề.')}</div>` : ''}
      ${tabs}
      ${all.filter(n => n === cur).map(n => `<div class="card" style="margin-bottom:1rem">
        <div class="row between"><h2 style="margin:0">Test ${n}</h2><div class="row">${best[n] != null ? `<span class="chip ok">Band ${best[n]}</span>` : ''}<a class="btn primary" href="#/listen-test/${n}">⏱ ${t('Thi thử 40 câu')}</a></div></div>
        <div class="grid auto" style="margin-top:.8rem">${partsOf(n).map(p => `<div class="card hover" style="box-shadow:none;border:1px solid var(--line)">
          <div class="row between"><span class="chip">Part ${p.part} · ${PART[p.part]}</span>${done[p.id] != null ? `<span class="chip ok">✓ ${done[p.id]}/10</span>` : ''}</div>
          <h3 style="margin:.5rem 0 .2rem">${esc(p.title)}</h3><div class="small muted">${esc(p.titleVi || '')} · ${esc(p.topic || '')}</div>
          <div class="row" style="margin-top:.4rem">${speakersHtml(p)}</div>
          <div class="row" style="margin-top:.7rem"><a class="btn sm primary" href="#/listen/${p.id}">🎯 ${t('Luyện tập')}</a><a class="btn sm" href="#/listen/${p.id}?mode=exam">⏱ ${t('Nghe 1 lần')}</a><a class="btn sm ghost" href="#/dictation/${p.id}">⌨️ ${t('Chép chính tả')}</a></div></div>`).join('')}</div></div>`).join('')}
      <div class="card"><h3>💡 ${t('Mẹo làm bài Listening')}</h3><ul class="small">
        <li>${t('<b>Đọc trước câu hỏi</b> trong thời gian chờ: gạch chân từ khóa, đoán loại từ cần điền (số, tên, danh từ…).')}</li>
        <li>${t('<b>Cẩn thận bẫy “đổi ý”</b>: người nói hay nói một đáp án rồi sửa lại (“sorry, I mean…”). Đáp án là thông tin cuối cùng.')}</li>
        <li>${t('<b>Paraphrase</b>: câu hỏi hiếm khi dùng đúng từ trong bài nghe – hãy nghe ý, không chỉ nghe từ.')}</li>
        <li>${t('<b>Giới hạn từ</b>: “ONE WORD AND/OR A NUMBER” mà viết 2 từ là sai cả câu. Chú ý chính tả và số nhiều.')}</li>
        <li>${t('<b>Chép chính tả</b> 10 phút mỗi ngày là cách nhanh nhất để nghe ra từng âm, nối âm và nuốt âm.')}</li></ul></div>`;
  };

  // ================= 1 PHẦN: LUYỆN TẬP / THI THẬT =================
  routes.listen = function (id, query) {
    const p = byId(id);
    if (!p) return routes.listening();
    const exam = query && query.get('mode') === 'exam';
    let submitted = false, plays = 0;
    view.innerHTML = `
      <div class="row between"><a href="${/^tl/.test(p.id) ? '#/toeic' : '#/listening'}" class="small">← ${/^tl/.test(p.id) ? 'TOEIC' : t('Luyện nghe')}</a>${exam ? `<a class="btn sm ghost" href="#/listen/${p.id}">🎯 ${t('Chế độ luyện tập')}</a>` : `<a class="btn sm ghost" href="#/listen/${p.id}?mode=exam">⏱ ${t('Chế độ thi thật')}</a>`}</div>
      <div class="page-head" style="margin-top:.6rem"><div><div class="tiny muted">Test ${p.test} · Part ${p.part} · ${partName(p)} · ${t('Câu {a}–{b}', { a: qNums(p)[0], b: qNums(p).slice(-1)[0] })}</div><h1 style="margin:.2rem 0">${esc(p.title)}</h1><p class="muted" style="margin:0">${esc(p.context || '')}</p><div class="row" style="margin-top:.4rem">${speakersHtml(p)}</div></div></div>
      <div class="card lplayer" id="lPlayer">
        <button class="btn primary lg" id="lPlay">▶ ${t('Nghe')}</button>
        ${exam ? `<span class="small muted" id="lNote">${t('Chế độ thi thật: chỉ nghe được 1 lần, không tua lại.')}</span>` : `<button class="btn" id="lBack" title="${t('Nghe lại câu trước')}">⏪ ${t('Câu trước')}</button>${rateSel()}<label class="small row nowrap" style="gap:.3rem"><input type="checkbox" id="lLive"> ${t('Hiện lời thoại khi nghe')}</label>`}
        <div class="lnow small muted" id="lNow"></div>
      </div>
      <div class="lgrid">
        <div class="card" id="lQs">${questionsHtml(p)}<div class="row" style="margin-top:1rem"><button class="btn primary" id="lSubmit">✅ ${t('Nộp bài & xem đáp án')}</button></div><div id="lRes" style="margin-top:1rem"></div></div>
        <div class="card ltrans" id="lTransWrap" ${exam ? 'hidden' : ''}><div class="row between"><h3 style="margin:0">📜 ${t('Lời thoại')}</h3><span class="tiny muted">${t('Bấm dòng để nghe từ đó · chạm từ để tra')}</span></div><div id="lTrans" class="ltr blur" data-own-lookup>${transcriptHtml(p, false)}</div></div>
      </div>`;
    App.bindCommon();
    const trans = $('#lTrans');
    const player = Player(p, {
      rate: () => +(($('#lRate') || {}).value || state.settings.listenRate || 0.95),
      onLine: i => {
        $$('.tl.now', trans).forEach(x => x.classList.remove('now'));
        const el = $(`.tl[data-line="${i}"]`, trans);
        if (el) { el.classList.add('now'); if (!trans.classList.contains('blur')) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
        const l = p.script[i]; $('#lNow').textContent = !l ? '' : l.pause != null ? '… (' + t('khoảng lặng') + ')' : l.say ? '🎙️ ' + t('Lời dẫn') : '🗣️ ' + ((p.speakers[l.s] || {}).name || l.s);
      },
      onState: on => { $('#lPlay').textContent = on ? '⏸ ' + t('Tạm dừng') : (plays ? '▶ ' + t('Nghe tiếp') : '▶ ' + t('Nghe')); },
      onEnd: () => { $('#lPlay').textContent = exam ? '✓ ' + t('Đã nghe xong') : '↺ ' + t('Nghe lại từ đầu'); if (exam) $('#lPlay').disabled = true; else player.stop(); $('#lNow').textContent = exam && !submitted ? t('Hết bài nghe – kiểm tra lại đáp án rồi nộp bài.') : ''; },
    });
    App.cleanup = () => player.stop();
    $('#lPlay').onclick = () => {
      if (player.playing) { if (exam) return; player.pause(); return; }
      if (exam && plays) return;
      plays++; player.play(exam ? 0 : undefined);
      if (exam) { $('#lPlay').disabled = true; $('#lPlay').textContent = '🔊 ' + t('Đang phát…'); }
    };
    if (!exam) {
      $('#lBack').onclick = () => player.back();
      $('#lRate').onchange = e => { state.settings.listenRate = +e.target.value; App.saveSettings(); };
      $('#lLive').onchange = e => trans.classList.toggle('blur', !e.target.checked);
      trans.addEventListener('click', e => { if (e.target.closest('.tw') && !trans.classList.contains('blur')) return; const l = e.target.closest('.tl'); if (l && !trans.classList.contains('blur')) { plays++; player.play(+l.dataset.line); } });
    }
    bindWordPop(trans, `Listening: ${p.title}`);

    let lastRes = {};
    const hear = n => { const r = lastRes[n]; if (!r || !r.cue) return; const i = p.script.findIndex(l => l.t && l.t.includes(r.cue)); if (i < 0) return; const el = $(`.tl[data-line="${i}"]`, trans); if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' }); let k = i; if (k > 0 && p.script[k - 1].t) k--; player.play(k); };
    QE.bind($('#lQs'));
    $('#lSubmit').onclick = async () => {
      if (submitted) return;
      if (player.playing && exam && !confirm(t('Bài nghe chưa phát xong. Vẫn nộp bài?'))) return;
      submitted = true; player.stop();
      const res = collect(p, $('#lQs')); lastRes = res;
      const nums = Object.keys(res).map(Number).sort((a, b) => a - b);
      const right = nums.filter(n => res[n].ok).length;
      QE.mark($('#lQs'), res, '🔎 ' + t('Nghe đoạn có đáp án'), n => hear(n));
      p.groups.forEach(g2 => (g2.items || []).forEach(it => { const el = $(`[data-item="${it.n}"] .lq-fb`, $('#lQs')); if (el && it.explain) el.insertAdjacentHTML('beforeend', `<div class="tiny muted" style="margin-top:.2rem">💡 ${esc(it.explain)}</div>`); }));
      nums.filter(n => !res[n].ok).forEach(n => App.logMistake && App.logMistake({ kind: 'listening', q: t('{title} – Câu {n}: {q}', { title: p.title, n, q: res[n].q }), answer: res[n].answer, given: res[n].given || t('(bỏ trống)'), explain: res[n].cue ? t('Nghe: “…{cue}…”', { cue: res[n].cue }) : '', ref: p.id }));
      state.game = await Game.mutate(gs => { gs.listenDone = { ...(gs.listenDone || {}), [p.id]: Math.max(right, (gs.listenDone || {})[p.id] || 0) }; });
      await App.reward({ quizzes: 1, listens: 1, perfect: right === nums.length ? 1 : 0, xp: 15 + right * 3 }, $('#lRes'));
      if (right >= 8) { Sfx.win(); confetti(); }
      $('#lRes').innerHTML = `<div class="feedback ${right >= 7 ? 'ok' : 'no'}" style="position:static"><b>${t('{a}/{b} câu đúng', { a: right, b: nums.length })}</b> · +${15 + right * 3} XP
        <div class="small">${right >= 9 ? t('Xuất sắc – mức band 8+ cho phần này.') : right >= 7 ? t('Tốt! Xem lại các câu sai trong lời thoại.') : t('Mở lời thoại bên cạnh, bấm “Nghe đoạn có đáp án” để nghe lại chỗ sai. Câu sai đã vào Sổ lỗi sai.')}</div>
        <div class="row" style="margin-top:.6rem"><a class="btn sm" href="#/dictation/${p.id}">⌨️ ${t('Chép chính tả phần này')}</a><button class="btn sm" id="lAgain">↺ ${t('Làm lại')}</button></div></div>
        ${p.vocab && p.vocab.length ? `<div class="card" style="box-shadow:none;border:1px solid var(--line);margin-top:.8rem"><h3 style="margin-top:0">📚 ${t('Từ vựng đáng học trong bài')}</h3><div class="lvocab">${p.vocab.map((v, k) => `<div class="row between nowrap"><span><b>${esc(v.w)}</b> <span class="muted small">${esc(v.vi)}</span></span><button class="btn sm ghost" data-v="${k}">${App.inDeck(v.w) ? '✓' : '+ ' + t('Lưu')}</button></div>`).join('')}</div></div>` : ''}`;
      $('#lAgain').onclick = () => routes.listen(id, query);
      $$('[data-v]', $('#lRes')).forEach(b => b.onclick = async () => {
        b.disabled = true; const v = p.vocab[+b.dataset.v];
        const line = (p.script.find(l => l.t && l.t.toLowerCase().includes(v.w.toLowerCase())) || {}).t || '';
        const d = (await Dict.quick(v.w)) || { word: v.w, vi: v.vi, found: true };
        await App.addWord({ ...d, word: v.w, vi: d.vi || v.vi }, line ? { text: line, vi: await Dict.translateVi(line), title: '🎧 ' + p.title } : null); b.textContent = '✓';
      });
      // Hiện lời thoại kèm chỗ có đáp án
      $('#lTransWrap').hidden = false; trans.innerHTML = transcriptHtml(p, true); trans.classList.remove('blur');
      const lv = $('#lLive'); if (lv) { lv.checked = true; lv.disabled = true; }
      // (nút "Nghe đoạn có đáp án" gọi hear(n))
      if (exam) { $('#lPlay').disabled = false; $('#lPlay').textContent = '▶ ' + t('Nghe lại'); exam && ($('#lNote').textContent = t('Đã nộp bài – giờ bạn có thể nghe lại và xem lời thoại.')); }
      $('#lRes').scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Sau khi nộp: nghe lại tự do
      $('#lPlay').onclick = () => { if (player.playing) player.pause(); else player.play(); };
      if (exam) trans.addEventListener('click', e => { if (e.target.closest('.tw')) return; const l = e.target.closest('.tl'); if (l) player.play(+l.dataset.line); });
    };
  };

  // ================= THI THỬ TRỌN 40 CÂU =================
  routes['listen-test'] = function (n) {
    n = +n || 1;
    const parts = partsOf(n);
    if (!parts.length) return routes.listening();
    let cur = 0, results = {}, player = null;
    App.cleanup = () => player && player.stop();
    const intro = () => {
      view.innerHTML = `<div class="study-wrap"><div class="card celebrate empty"><div class="em">🎧</div><h2>IELTS Listening – Test ${n}</h2>
        <p class="muted">${t('4 phần · 40 câu · khoảng 30 phút. Mỗi phần chỉ nghe <b>một lần</b>. Trước mỗi phần có 30 giây đọc câu hỏi. Đeo tai nghe và chọn nơi yên tĩnh nhé.')}</p>
        <div class="row center"><button class="btn primary lg" id="tGo">${t('Bắt đầu thi')}</button><a class="btn" href="#/listening">${t('Để sau')}</a></div></div></div>`;
      $('#tGo').onclick = () => part(0);
    };
    function part(k) {
      cur = k; const p = parts[k];
      view.innerHTML = `
        <div class="row between"><span class="chip">Test ${n} · Part ${p.part}/4 · ${t('Câu {a}–{b}', { a: qNums(p)[0], b: qNums(p).slice(-1)[0] })}</span><span class="small muted" id="tState"></span></div>
        <div class="progress" style="margin:.6rem 0"><i style="width:${k / parts.length * 100}%"></i></div>
        <div class="card lplayer"><b id="tCount">⏳ ${t('{n} giây đọc câu hỏi', { n: 30 })}</b><button class="btn sm ghost" id="tSkip">${t('Bắt đầu nghe ngay')}</button><span class="lnow small muted" id="lNow"></span></div>
        <div class="card" id="lQs">${questionsHtml(p)}<div class="row" style="margin-top:1rem"><button class="btn primary" id="tNext" disabled>${k < parts.length - 1 ? t('Sang phần tiếp') + ' →' : '✅ ' + t('Nộp bài')}</button></div></div>`;
      let left = 30, started = false;
      const tick = setInterval(() => { if (started || !document.body.contains($('#tCount') || document.createElement('i'))) return clearInterval(tick); left--; $('#tCount').textContent = '⏳ ' + t('{n} giây đọc câu hỏi', { n: left }); if (left <= 0) start(); }, 1000);
      const start = () => {
        if (started) return; started = true; clearInterval(tick);
        $('#tSkip').remove(); $('#tCount').textContent = '🔊 ' + t('Đang phát – chỉ nghe 1 lần');
        player = Player(p, {
          onLine: i => { const l = p.script[i]; $('#lNow') && ($('#lNow').textContent = !l ? '' : l.say ? '🎙️ ' + t('Lời dẫn') : l.pause != null ? '' : '🗣️ ' + ((p.speakers[l.s] || {}).name || '')); },
          onEnd: () => { if (!$('#tCount')) return; $('#tCount').textContent = '✓ ' + t('Hết phần nghe – kiểm tra lại đáp án'); $('#tNext').disabled = false; },
        });
        player.play(0);
        setTimeout(() => { const b = $('#tNext'); if (b) b.disabled = false; }, 20000); // cho phép đi tiếp nếu giọng đọc lỗi
      };
      $('#tSkip').onclick = start;
      $('#tNext').onclick = () => {
        if (player && player.playing && !confirm(t('Phần nghe chưa phát xong. Vẫn chuyển tiếp?'))) return;
        if (player) player.stop();
        Object.assign(results, Object.fromEntries(Object.entries(collect(p, $('#lQs'))).map(([q, r]) => [q, { ...r, pid: p.id }])));
        if (k < parts.length - 1) { part(k + 1); window.scrollTo({ top: 0 }); } else finish();
      };
    }
    async function finish() {
      const nums = Object.keys(results).map(Number).sort((a, b) => a - b);
      const raw = nums.filter(q => results[q].ok).length, band = bandOf(raw);
      nums.filter(q => !results[q].ok).forEach(q => App.logMistake && App.logMistake({ kind: 'listening', q: t('Test {t} – Câu {n}: {q}', { t: n, n: q, q: results[q].q }), answer: results[q].answer, given: results[q].given || t('(bỏ trống)'), explain: results[q].cue ? t('Nghe: “…{cue}…”', { cue: results[q].cue }) : '', ref: results[q].pid }));
      state.game = await Game.mutate(gs => { gs.listenBest = { ...(gs.listenBest || {}), [n]: Math.max(band, (gs.listenBest || {})[n] || 0) }; gs.listenTests = [...(gs.listenTests || []), { n, raw, band, at: Date.now() }].slice(-30); });
      await App.reward({ quizzes: 1, listens: 4, perfect: raw === 40 ? 1 : 0, xp: 40 + raw * 2 });
      if (band >= 7) { Sfx.win(); confetti(160); }
      const byPart = parts.map(p => ({ p, r: qNums(p).filter(q => results[q] && results[q].ok).length }));
      view.innerHTML = `<div class="study-wrap" style="max-width:820px">
        <div class="card celebrate"><div class="em">🎧</div><h2>Band ${band} · ${t('{a}/{b} câu đúng', { a: raw, b: 40 })}</h2><p class="muted">${t('Quy đổi theo thang điểm Listening phổ biến của IELTS – chỉ mang tính tham khảo.')}</p>
          <div class="grid g2" style="margin-top:.8rem">${byPart.map(({ p, r }) => `<a class="card hover" href="#/listen/${p.id}" style="box-shadow:none;border:1px solid var(--line);color:var(--text)"><b>Part ${p.part}</b> · ${r}/10<div class="progress" style="margin-top:.4rem"><i style="width:${r * 10}%"></i></div><div class="tiny muted">${t('Bấm để luyện lại có lời thoại')}</div></a>`).join('')}</div></div>
        <div class="card"><h3>📋 ${t('Bảng đáp án')}</h3><div class="lsheet">${nums.map(q => `<div class="${results[q].ok ? 'ok' : 'no'}"><b>${q}</b> ${results[q].ok ? '✓' : '✗'} <span>${esc(results[q].answer)}</span>${!results[q].ok && results[q].given ? `<span class="tiny muted">${t('(bạn: {a})', { a: esc(results[q].given) })}</span>` : ''}</div>`).join('')}</div>
          <div class="row" style="margin-top:1rem"><a class="btn primary" href="#/listening">${t('Về Luyện nghe')}</a><a class="btn" href="#/mistakes">📕 ${t('Xem Sổ lỗi sai')}</a></div></div></div>`;
    }
    intro();
  };

  // ================= CHÉP CHÍNH TẢ (3 mức như các nền tảng lớn) =================
  // Điền từ (trung bình) ≈ 35% từ · Điền từ (khó) ≈ 65% từ · Chép cả câu. Phím tắt: Space/Tab ô sau · Enter kiểm tra/câu sau · \ nghe lại · Shift+←/→ đổi câu
  const STOPW = new Set('a an the and or but of to in on at by for with from is are was were be been it this that these those i you he she we they my your his her our their as so if than then there here'.split(' '));
  routes.dictation = function (id, query) {
    const p = byId(id);
    if (!p) return routes.listening();
    const lines = p.script.map((l, i) => ({ ...l, i })).filter(l => l.t && l.t.split(/\s+/).length >= 4);
    let k = 0, score = 0, done = 0;
    let mode = (query && query.get('m')) || state.settings.dictMode || 'mid', auto = !!state.settings.dictAuto;
    const cast = castVoices(p);
    // Giọng Kokoro của đúng nhân vật (như bài thi) – nghe chậm vẫn giữ cao độ; thiếu file → giọng máy
    const kv = window.KVoice ? KVoice.voices(p) : null; let dEl = null;
    const sayTTS = (l, slow) => { speechSynthesis.cancel(); const c = cast[l.s] || cast._narrator; UI.splitSentences(l.t).forEach((t, j, arr) => { const u = new SpeechSynthesisUtterance(t); u.lang = c.lang; if (c.voice) u.voice = c.voice; u.pitch = c.pitch; u.rate = slow ? 0.7 : (state.settings.listenRate || 0.95); if (j === arr.length - 1 && auto) u.onend = () => { if (lines[k] === l && !checked) autoT = setTimeout(() => say(l), 1800); }; speechSynthesis.speak(u); }); };
    const say = (l, slow) => { if (dEl) { dEl.pause(); dEl = null; } const key = kv && hqOn() ? KVoice.lineKey(kv[l.s] || kv._narrator, l.t) : ''; if (key && LISTEN_AUDIO.has(key)) { speechSynthesis.cancel(); dEl = new Audio(AUDIO_BASE + 'audio/l/' + key + '.mp3'); dEl.preservesPitch = true; dEl.playbackRate = slow ? 0.7 : 1; dEl.onerror = () => { dEl = null; sayTTS(l, slow); }; dEl.play().catch(() => sayTTS(l, slow)); } else sayTTS(l, slow); };
    let autoT = null, checked = false;
    App.cleanup = () => { speechSynthesis.cancel(); if (dEl) dEl.pause(); clearTimeout(autoT); document.onkeydown = null; };
    const toks = s => s.replace(/[’‘]/g, "'").split(/\s+/).filter(Boolean);
    const clean = w => w.toLowerCase().replace(/[^a-z0-9'%]/g, '');
    function diff(target, given) {
      const a = toks(target), b = toks(given).map(clean).filter(Boolean), A = a.map(clean);
      const dp = Array.from({ length: A.length + 1 }, () => new Array(b.length + 1).fill(0));
      for (let x = A.length - 1; x >= 0; x--) for (let y = b.length - 1; y >= 0; y--) dp[x][y] = A[x] === b[y] ? dp[x + 1][y + 1] + 1 : Math.max(dp[x + 1][y], dp[x][y + 1]);
      const out = []; let x = 0, y = 0;
      while (x < A.length) { if (y < b.length && A[x] === b[y]) { out.push(`<span class="dk ok">${esc(a[x])}</span>`); x++; y++; } else if (y < b.length && dp[x][y + 1] >= dp[x + 1][y]) { out.push(`<span class="dk extra">${esc(b[y])}</span>`); y++; } else { out.push(`<span class="dk miss">${esc(a[x])}</span>`); x++; } }
      while (y < b.length) out.push(`<span class="dk extra">${esc(b[y++])}</span>`);
      return { html: out.join(' '), pct: A.filter(Boolean).length ? dp[0][0] / A.filter(Boolean).length : 0 };
    }
    // Chọn từ để đục lỗ: ưu tiên từ nội dung (không phải hư từ), rải đều trong câu, ổn định theo câu
    const holes = (words, ratio) => { const idx = words.map((w, i) => ({ w: clean(w), i })).filter(x => x.w); const content = idx.filter(x => !STOPW.has(x.w)); const need = Math.max(1, Math.round(idx.length * ratio)); const pool = content.length >= need ? content : idx; const step = pool.length / need; const pick = new Set(); for (let j = 0; j < need && j < pool.length; j++) pick.add(pool[Math.floor(j * step)].i); return pick; };
    const draw = () => {
      clearTimeout(autoT); checked = false;
      if (k >= lines.length) {
        const pct = done ? Math.round(score / done * 100) : 0;
        App.reward({ quizzes: 1, dictations: 1, xp: 10 + Math.round(pct / 5) });
        view.innerHTML = `<div class="study-wrap"><div class="card celebrate empty"><div class="em">⌨️</div><h2>${t('Chính xác {p}%', { p: pct })}</h2><p class="muted">${t('{n} câu đã chép. Chép chính tả đều đặn giúp tai nhận ra nối âm, nuốt âm và trọng âm câu.', { n: done })}</p><div class="row center"><a class="btn primary" href="#/listen/${p.id}">🎯 ${t('Làm câu hỏi phần này')}</a><a class="btn" href="#/dictation/${p.id}?m=${mode === 'mid' ? 'hard' : 'full'}">${t('Thử mức khó hơn')}</a><a class="btn" href="#/listening">${t('Về Luyện nghe')}</a></div></div></div>`;
        return;
      }
      const l = lines[k], words = toks(l.t);
      const H = mode === 'full' ? null : holes(words, mode === 'hard' ? 0.65 : 0.35);
      const body = mode === 'full' ? `<textarea id="dIn" rows="3" class="dict-in" placeholder="${t('Gõ lại cả câu bạn nghe được… (Enter để kiểm tra)')}" spellcheck="false"></textarea>`
        : `<div class="dict-line">${words.map((w, i) => { if (!H.has(i)) return `<span>${esc(w)}</span>`; const m = w.match(/^([^A-Za-z0-9]*)(.*?)([^A-Za-z0-9%']*)$/); return `${esc(m[1])}<input class="dict-h" data-i="${i}" size="${Math.max(3, m[2].length)}" autocomplete="off" spellcheck="false" autocapitalize="off">${esc(m[3])}`; }).join(' ')}</div>`;
      view.innerHTML = `<div class="study-wrap"><div class="study-top"><a class="icon-btn" href="#/listening">✕</a><div class="progress"><i style="width:${k / lines.length * 100}%"></i></div><span class="small muted">${k + 1}/${lines.length}</span></div>
        <div class="card q-card"><div class="row between"><span class="tiny muted">⌨️ ${t('Chép chính tả')} · ${esc(p.title)} · ${esc((p.speakers[l.s] || {}).name || '')}</span>
          <select class="input" id="dMode" style="width:auto;padding:.3rem .5rem;font-size:.85rem"><option value="mid" ${mode === 'mid' ? 'selected' : ''}>${t('Điền từ (trung bình)')}</option><option value="hard" ${mode === 'hard' ? 'selected' : ''}>${t('Điền từ (khó)')}</option><option value="full" ${mode === 'full' ? 'selected' : ''}>${t('Chép cả câu')}</option></select></div>
          <div class="row center" style="margin:1rem 0"><button class="btn" id="dPrev" title="${t('Câu trước')} (Shift+←)">‹ ${t('Câu trước')}</button><button class="btn primary lg" id="dPlay" title="${t('Nghe lại')} (\\)">🔊 ${t('Nghe')}</button><button class="btn" id="dSlow">🐢</button><button class="btn" id="dNext" title="${t('Câu sau')} (Shift+→)">${t('Câu sau')} ›</button></div>
          ${body}
          <div id="dFb" style="margin-top:.6rem"></div>
          <details class="dict-tr" id="dTr"><summary>📜 ${t('Transcript & bản dịch')}</summary><div id="dTrBody" class="small"></div></details>
          <div class="row between" style="margin-top:.6rem"><div class="row"><button class="btn primary" id="dChk">${t('Kiểm tra')}</button><button class="btn ghost" id="dAns">${t('Đáp án')}</button><button class="btn ghost" id="dClr">${t('Xóa hết')}</button></div>
            <label class="md-sw"><input type="checkbox" id="dAuto" ${auto ? 'checked' : ''}><span></span>${t('Tự động phát lại câu')}</label></div>
          <div class="tiny muted" style="margin-top:.6rem">${t('Phím tắt: <kbd>Space</kbd>/<kbd>Tab</kbd> sang ô sau · <kbd>Enter</kbd> kiểm tra / câu tiếp · <kbd>\\</kbd> nghe lại · <kbd>Shift</kbd>+<kbd>←</kbd>/<kbd>→</kbd> đổi câu · <kbd>Backspace</kbd> ở ô trống để về ô trước')}</div></div></div>`;
      const hs = $$('.dict-h');
      $('#dPlay').onclick = () => say(l); $('#dSlow').onclick = () => say(l, true);
      $('#dTr').ontoggle = async () => {
        if (!$('#dTr').open || $('#dTrBody').dataset.ok) return; $('#dTrBody').dataset.ok = 1;
        const L = I18N.learnLang(), body = $('#dTrBody');
        body.innerHTML = lines.map((x, n) => `<div class="dict-trl ${n < k ? 'done' : n === k ? 'cur' : ''}" data-n="${n}"><span class="tiny muted">${esc((p.speakers[x.s] || {}).name || '')}</span> ${n <= k ? esc(x.t) : '<span class="muted">' + t('(chép xong câu này để xem)') + '</span>'}<div class="muted dict-trv"></div></div>`).join('');
        if (L === 'en') return;
        const shown = lines.slice(0, k + 1).map(x => x.t), tr = await Dict.translateTo(shown.join('\n'), L).catch(() => '');
        String(tr || '').split('\n').forEach((v, n) => { const el = body.querySelector(`[data-n="${n}"] .dict-trv`); if (el) el.textContent = v; });
      };
      $('#dPrev').onclick = () => { if (k > 0) { k--; draw(); } };
      $('#dNext').onclick = () => { k++; draw(); };
      $('#dMode').onchange = e => { mode = e.target.value; state.settings.dictMode = mode; App.saveSettings(); draw(); };
      $('#dAuto').onchange = e => { auto = e.target.checked; state.settings.dictAuto = auto; App.saveSettings(); if (auto) say(l); };
      $('#dClr').onclick = () => { hs.forEach(h => { h.value = ''; h.className = 'dict-h'; }); const t = $('#dIn'); if (t) t.value = ''; $('#dFb').innerHTML = ''; checked = false; (hs[0] || t).focus(); };
      setTimeout(() => say(l), 300); (hs[0] || $('#dIn')).focus();
      const check = () => {
        if (checked) { k++; draw(); return; }
        checked = true; clearTimeout(autoT); done++;
        let pct;
        if (mode === 'full') { const d = diff(l.t, $('#dIn').value); pct = d.pct; $('#dFb').innerHTML = `<div class="feedback ${pct >= 0.9 ? 'ok' : 'no'}" style="position:static"><b>${t('{p}% chính xác', { p: Math.round(pct * 100) })}</b><div style="margin-top:.4rem;line-height:1.9">${d.html}</div><div class="tiny muted" style="margin-top:.3rem"><span class="dk ok">${t('đúng')}</span> <span class="dk miss">${t('bỏ sót')}</span> <span class="dk extra">${t('thừa/sai')}</span></div></div>`; }
        else { let r = 0; hs.forEach(h => { const a = clean(words[+h.dataset.i]), ok = clean(h.value) === a; h.classList.add(ok ? 'ok' : 'no'); if (!ok) h.title = words[+h.dataset.i]; if (ok) r++; }); pct = hs.length ? r / hs.length : 1; $('#dFb').innerHTML = `<div class="feedback ${pct >= 0.9 ? 'ok' : 'no'}" style="position:static"><b>${t('{a}/{b} ô đúng', { a: r, b: hs.length })}</b><div class="small" style="margin-top:.3rem">${esc(l.t)}</div></div>`; }
        score += pct; pct >= 0.9 ? Sfx.correct() : Sfx.wrong();
        $('#dChk').textContent = t('Câu tiếp') + ' ↵';
      };
      $('#dChk').onclick = check;
      $('#dAns').onclick = () => { hs.forEach(h => { h.value = words[+h.dataset.i].replace(/^[^A-Za-z0-9]*|[^A-Za-z0-9%']*$/g, ''); }); const t = $('#dIn'); if (t) t.value = l.t; };
      hs.forEach((h, j) => h.addEventListener('keydown', e => {
        if (e.key === ' ' || (e.key === 'Tab' && !e.shiftKey)) { e.preventDefault(); if (hs[j + 1]) hs[j + 1].focus(); }
        else if ((e.key === 'Backspace' || e.key === 'Delete') && !h.value && hs[j - 1]) { e.preventDefault(); hs[j - 1].focus(); }
        else if (e.key === 'Tab' && e.shiftKey && hs[j - 1]) { e.preventDefault(); hs[j - 1].focus(); }
      }));
      document.onkeydown = e => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); check(); }
        else if (e.key === '\\') { e.preventDefault(); say(l); }
        else if (e.shiftKey && e.key === 'ArrowLeft') { e.preventDefault(); $('#dPrev').click(); }
        else if (e.shiftKey && e.key === 'ArrowRight') { e.preventDefault(); $('#dNext').click(); }
      };
    };
    draw();
  };

  App.listening = { bandOf, byId, castVoices, Player, partsOf, qNums };
})();
