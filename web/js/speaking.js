/* Phòng luyện Speaking: Part 1/2/3, giám khảo đọc câu hỏi, ghi âm & nghe lại, chuyển giọng nói thành chữ,
 * phân tích tốc độ nói, từ đệm, từ vựng học thuật/chủ đề, gợi ý từ nên dùng. Mọi thứ chạy trên máy, không gửi ghi âm đi đâu. */
(function () {
  const { $, $$, esc, toast, speak, tts, levelChip, posChip } = UI;
  const App = window.App;
  const { state, routes } = App;
  const view = App.view;

  // Ngân hàng câu hỏi tự biên soạn theo thể thức IELTS Speaking
  const BANK = [
    { topic: 'education', title: 'Học tập', p1: ['Do you work or are you a student?', 'What subject did you enjoy most at school, and why?', 'Do you prefer studying alone or with other people?'],
      p2: { q: 'Describe a teacher who has had a strong influence on you.', points: ['who this teacher was', 'what subject they taught', 'what they were like', 'and explain why they influenced you so much'] },
      p3: ['Should university education be free for everyone?', 'How has technology changed the way students learn?', 'What makes a good teacher, in your opinion?'] },
    { topic: 'technology', title: 'Công nghệ', p1: ['How often do you use your mobile phone?', 'Which apps do you use most every day?', 'Is there any technology you could not live without?'],
      p2: { q: 'Describe a piece of technology that you find very useful.', points: ['what it is', 'when you started using it', 'how you use it', 'and explain why it is so useful to you'] },
      p3: ['Do you think people rely too much on technology nowadays?', 'How might artificial intelligence change the job market?', 'Should children be allowed to use smartphones?'] },
    { topic: 'environment', title: 'Môi trường', p1: ['Is there much pollution where you live?', 'Do you do anything to protect the environment?', 'Do you prefer the countryside or the city?'],
      p2: { q: 'Describe a natural place you have visited that impressed you.', points: ['where it is', 'when you went there', 'what you did there', 'and explain why it impressed you'] },
      p3: ['What are the biggest environmental problems in your country?', 'Who should be responsible for protecting the environment: governments or individuals?', 'Will renewable energy replace fossil fuels in the future?'] },
    { topic: 'work', title: 'Công việc', p1: ['What kind of job would you like to have in the future?', 'Would you prefer to work from home or in an office?', 'What do you usually do after work or study?'],
      p2: { q: 'Describe a job that you would like to do in the future.', points: ['what the job is', 'what skills it requires', 'how you could get this job', 'and explain why you would like to do it'] },
      p3: ['Is a high salary more important than job satisfaction?', 'How will automation affect employment in the future?', 'Why do some people change careers later in life?'] },
    { topic: 'travel', title: 'Du lịch', p1: ['Do you like travelling?', 'Where did you go on your last holiday?', 'Do you prefer travelling alone or with friends?'],
      p2: { q: 'Describe a memorable trip you have taken.', points: ['where you went', 'who you went with', 'what you did', 'and explain why it was memorable'] },
      p3: ['What are the benefits of international tourism for a country?', 'Can tourism damage local culture?', 'How might travel change in the next twenty years?'] },
    { topic: 'health', title: 'Sức khỏe', p1: ['What do you do to stay healthy?', 'Do you enjoy cooking?', 'How much sleep do you usually get?'],
      p2: { q: 'Describe a healthy habit you would like to develop.', points: ['what the habit is', 'why you have not developed it yet', 'how you could start', 'and explain how it would improve your life'] },
      p3: ['Why are obesity rates increasing in many countries?', 'Should the government tax unhealthy food?', 'Is mental health as important as physical health?'] },
    { topic: 'media', title: 'Truyền thông', p1: ['How do you usually get the news?', 'Do you watch videos online every day?', 'Do you trust the information you read on social media?'],
      p2: { q: 'Describe an advertisement that you remember well.', points: ['what product it was for', 'where you saw it', 'what it showed', 'and explain why you remember it'] },
      p3: ['Should advertising aimed at children be restricted?', 'How can people recognise fake news?', 'Will newspapers disappear in the future?'] },
    { topic: 'urban', title: 'Thành phố', p1: ['Where is your hometown?', 'What do you like most about the place where you live?', 'How do you usually travel around your city?'],
      p2: { q: 'Describe a city you would like to live in.', points: ['which city it is', 'how you know about it', 'what it is like', 'and explain why you would like to live there'] },
      p3: ['What are the main problems of living in big cities?', 'How can governments reduce traffic congestion?', 'Why do young people move from the countryside to cities?'] },
  ];
  const FILLERS = /\b(um+|uh+|er+|erm|ah+|you know|i mean|kind of|sort of|like)\b/gi;
  const PARTS = {
    p1: { name: 'Part 1 · Phỏng vấn', target: [20, 40], desc: 'Câu hỏi ngắn về bản thân – trả lời 2–3 câu (~20–40 giây)' },
    p2: { name: 'Part 2 · Bài nói cá nhân', target: [90, 120], prep: 60, desc: '1 phút chuẩn bị, nói 1–2 phút theo thẻ đề' },
    p3: { name: 'Part 3 · Thảo luận', target: [40, 70], desc: 'Câu hỏi trừu tượng – nêu quan điểm, lý do, ví dụ (~40–70 giây)' },
  };

  let rec = null, media = null, chunks = [], stream = null, tick = null, prepT = null;
  const stopAll = () => {
    clearInterval(tick); clearInterval(prepT);
    try { rec && rec.abort(); } catch (e) { /* đã dừng */ }
    try { media && media.state !== 'inactive' && media.stop(); } catch (e) { /* đã dừng */ }
    if (stream) stream.getTracks().forEach(t => t.stop());
    rec = null; media = null; stream = null; UI.stopSpeak();
  };

  // Chủ đề bổ sung (js/speak/*.js nạp trước): window.SPEAK_MORE = [{ topic, title, p1: [...], p2: { q, points }, p3: [...] }]
  const mergeMore = () => (window.SPEAK_MORE || []).forEach(t => { if (!BANK.some(b => b.title === t.title)) BANK.push(t); }); // gói speak (nạp khi cần) thêm chủ đề
  mergeMore();
  App.speakBank = BANK; App.speakMerge = mergeMore;
  routes.speaking = function (arg) {
    mergeMore();
    const seg = (arg || '').split('/');
    const part = PARTS[seg[0]] ? seg[0] : 'p1';
    const ti = /^\d+$/.test(seg[1] || '') && BANK[+seg[1]] ? seg[1] : '0';
    const tp = BANK[+ti] || BANK[0];
    const P = PARTS[part] || PARTS.p1;
    App.cleanup = stopAll;
    const qs = part === 'p2' ? [tp.p2.q] : tp[part];
    view.innerHTML = `
      <div class="page-head"><div class="row between" style="flex-wrap:wrap;gap:.5rem"><div><h1>🗣️ ${t('Phòng luyện Speaking')}</h1><p class="muted">${t('Giám khảo đọc câu hỏi → bạn ghi âm câu trả lời → nghe lại, xem bản chữ và phân tích từ vựng. Ghi âm chỉ nằm trên máy bạn.')}</p></div><div><a href="#/criteria?skill=speaking" class="btn sm ghost">📊 ${t('Tiêu chí chấm band 4–9')}</a></div></div></div>
      <div class="tabs" style="display:inline-flex;margin-bottom:.8rem">${Object.entries(PARTS).map(([k, v]) => `<button class="${k === part ? 'on' : ''}" data-part="${k}">${t(v.name)}</button>`).join('')}</div>
      <div class="row sp-topic" style="margin-bottom:1rem;gap:.5rem"><select class="input" id="spTopic" aria-label="${t('Chủ đề')}">${BANK.map((b, i) => `<option value="${i}" ${i === +ti ? 'selected' : ''}>${App.topicOf(b.topic) ? App.topicOf(b.topic).emoji : '💬'} ${esc(t(b.title))}</option>`).join('')}</select><button type="button" class="btn sm" id="spRand">🎲 ${t('Chủ đề ngẫu nhiên')}</button><span class="tiny muted">${t('{n} chủ đề', { n: BANK.length })}</span></div>
      <div class="grid" style="grid-template-columns:minmax(0,1fr) 300px;align-items:start" id="spGrid">
        <div class="stack">
          <div class="card">
            <div class="row between"><span class="chip">${esc(t(P.desc))}</span><span class="tiny muted" id="qIdx"></span></div>
            <div id="qBox" style="margin-top:.8rem"></div>
            <div class="row" style="margin-top:1rem"><button class="btn" id="hear">🔊 ${t('Nghe giám khảo hỏi')}</button>${qs.length > 1 ? `<button class="btn ghost" id="nextQ">${t('Câu khác')} →</button>` : ''}</div>
          </div>
          <div class="card" style="text-align:center">
            <div class="timer" id="clock" style="font-size:2.2rem">00:00</div>
            <div class="tiny muted" id="clockHint">${t('Mục tiêu: {a}–{b} giây', { a: P.target[0], b: P.target[1] })}</div>
            <div style="margin:1.2rem 0 .6rem"><button class="mic" id="recBtn" title="${t('Bắt đầu / dừng ghi âm')}">🎙️</button></div>
            <div class="small muted" id="recHint">${part === 'p2' ? t('Bấm micro để trả lời (sẽ có 1 phút chuẩn bị)') : t('Bấm micro để trả lời')}</div>
            <div id="live" class="small" style="margin-top:.8rem;min-height:1.5em;color:var(--muted);font-style:italic"></div>
          </div>
          <div id="result"></div>
        </div>
        <div class="stack" style="position:sticky;top:80px">
          <div class="card"><h3>💡 ${t('Từ vựng nên dùng')}</h3><div id="sugg"></div></div>
          <div class="card"><h3>🧭 ${t('Mẹo {part}', { part: esc(P.name.split(' · ')[0]) })}</h3><ul class="small" style="padding-left:1.1rem;margin:.3rem 0">${tipsFor(part).map(x => `<li style="margin:.3rem 0">${x}</li>`).join('')}</ul></div>
        </div>
      </div>`;
    if (innerWidth < 900) $('#spGrid').style.gridTemplateColumns = '1fr';
    $$('[data-part]').forEach(b => b.onclick = () => { location.hash = `#/speaking/${b.dataset.part}/${ti}`; });
    $('#spTopic').onchange = e => { location.hash = `#/speaking/${part}/${e.target.value}`; };
    $('#spRand').onclick = () => { let r = +ti; while (BANK.length > 1 && r === +ti) r = Math.floor(Math.random() * BANK.length); location.hash = `#/speaking/${part}/${r}`; };

    // Từ vựng gợi ý theo chủ đề
    const topic = App.topicOf(tp.topic);
    const words = topic ? topic.words.slice(0, 8) : [];
    const extra = [...(App.topicOf('linking') || { words: [] }).words.slice(0, 2), ...(App.topicOf('idioms') || { words: [] }).words.slice(0, 2)];
    $('#sugg').innerHTML = [...words, ...extra].map(w => `<div class="row between nowrap" style="padding:.3rem 0;border-bottom:1px dashed var(--line)">
      <div style="min-width:0"><b>${esc(w.word)}</b> <span class="tiny muted">${esc(App.meanOf(w))}</span></div>
      <div class="row nowrap" style="gap:.2rem"><button class="icon-btn sm" data-speak="${esc(w.word)}">🔊</button>${App.inDeck(w.word) ? '' : `<button class="icon-btn sm" data-add-seed="${esc(w.word)}" title="${t('Thêm vào flashcard')}">＋</button>`}</div></div>`).join('');
    App.bindCommon();

    let qi = 0;
    const showQ = () => {
      $('#qIdx').textContent = qs.length > 1 ? t('Câu {i}/{n}', { i: qi + 1, n: qs.length }) : '';
      $('#qBox').innerHTML = part === 'p2'
        ? `<div class="example-box" style="border-left-color:var(--primary)"><b style="font-size:1.1rem">${esc(tp.p2.q)}</b><div class="small" style="margin-top:.4rem">You should say:</div><ul style="margin:.2rem 0 0;padding-left:1.2rem">${tp.p2.points.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>`
        : `<div style="font-size:1.25rem;font-weight:700">${esc(qs[qi])}</div>`;
      drawSample();
    };
    // Câu trả lời mẫu band 7.5–8 + luyện shadowing (nghe từng câu → nói lặp lại → chấm độ giống)
    const drawSample = () => {
      const key = part === 'p2' ? tp.p2.q : qs[qi], smp = (window.SPEAK_SAMPLES || {})[key];
      let el = $('#sampleBox'); if (!el) { el = document.createElement('div'); el.id = 'sampleBox'; $('#qBox').after(el); }
      if (!smp) { el.innerHTML = ''; return; }
      const sents = UI.splitSentences(smp.a);
      el.innerHTML = `<details class="sample-box"><summary><b>📝 ${t('Câu trả lời mẫu (band 7.5–8)')}</b> <span class="tiny muted">– ${t('xem sau khi đã tự trả lời')}</span></summary>
        <div class="sample-txt">${sents.map((x, i) => `<span class="sm-s" data-i="${i}">${esc(x)}</span>`).join(' ')}</div>
        ${(smp.vocab || []).length ? `<div class="row" style="gap:.3rem;margin:.5rem 0">${smp.vocab.map(([en, vi]) => `<button class="chip sm-v" data-en="${esc(en)}" data-vi="${esc(vi)}" title="${I18N.learnLang() === 'vi' ? esc(vi) + ' – ' : ''}${t('bấm để lưu')}">+ ${esc(en)}</button>`).join('')}</div>` : ''}
        <div class="row"><button class="btn sm" id="smPlay">🔊 ${t('Nghe cả bài')}</button><button class="btn sm primary" id="smShadow">🔁 ${t('Luyện shadowing')}</button></div><div id="smShadowBox"></div></details>`;
      $$('.sm-v', el).forEach(b => b.onclick = () => App.savePhraseDialog && App.savePhraseDialog({ phrase: b.dataset.en, vi: I18N.learnLang() === 'vi' ? b.dataset.vi : '', sentence: sents.find(x => x.toLowerCase().includes(b.dataset.en.toLowerCase().split(' ')[0])) || '', title: t('Speaking mẫu') }));
      $('#smPlay', el).onclick = () => UI.tts(smp.a, state.settings.accent, 0.95, { onSentence: i => { $$('.sm-s', el).forEach((x, j) => x.classList.toggle('on', j === i)); } });
      $('#smShadow', el).onclick = () => shadow(sents, $('#smShadowBox', el));
    };
    function shadow(sents, box) {
      let k = 0, total = 0;
      const step = () => {
        if (k >= sents.length) { box.innerHTML = `<div class="feedback ok" style="position:static;margin-top:.6rem"><b>${t('Hoàn thành shadowing · trung bình {pct}% giống mẫu', { pct: Math.round(total / sents.length) })}</b></div>`; App.reward({ spoken: 3, xp: 10 }); return; }
        const s2 = sents[k];
        box.innerHTML = `<div class="card" style="margin-top:.6rem;box-shadow:none;border:1px solid var(--line)"><div class="tiny muted">${t('Câu {i}/{n} – nghe rồi nói lặp lại, bắt chước nhịp và ngữ điệu', { i: k + 1, n: sents.length })}</div>
          <div style="font-size:1.1rem;margin:.4rem 0">${esc(s2)}</div><label class="md-sw small" style="margin:.2rem 0 .5rem"><input type="checkbox" data-whisper ${state.settings.whisperMode ? 'checked' : ''}><span></span>🤫 ${t('Thì thầm')}</label><div class="row"><button class="btn sm" id="shL">🔊 ${t('Nghe')}</button><button class="btn sm" id="shS">🐢</button><button class="btn sm primary" id="shR">🎙️ ${t('Nói lại')}</button><button class="btn sm ghost" id="shN">${t('Bỏ qua')} →</button></div><div id="shRes" class="small" style="margin-top:.4rem"></div></div>`;
        const say = r => UI.tts(s2, state.settings.accent, r);
        $('#shL').onclick = () => say(); $('#shS').onclick = () => say(0.7); $('#shN').onclick = () => { k++; step(); };
        $('#shR').onclick = () => {
          $('#shRes').textContent = '🔴 ' + t('Đang nghe…');
          UI.recognize(s2, state.settings.accent, {
            result: ({ heard, score, audio }) => { total += score; $('#shRes').innerHTML = `<b style="color:${score >= 80 ? 'var(--good)' : score >= 60 ? 'var(--hard)' : 'var(--again)'}">${t('{score}% giống mẫu', { score })}</b> · ${t('máy nghe: “{heard}”', { heard: esc(heard) })} ${audio ? `<audio controls src="${audio}" style="height:30px;vertical-align:middle"></audio>` : ''} <button class="btn sm" id="shNext">${t('Câu tiếp')} →</button>`; $('#shNext').onclick = () => { k++; step(); }; },
            error: e => { $('#shRes').textContent = UI.recErrorText ? UI.recErrorText(e) : t('Không nhận được giọng nói'); },
          });
        };
        say();
      };
      step();
    }
    showQ();
    const askText = () => part === 'p2' ? `${tp.p2.q} You should say: ${tp.p2.points.join(', ')}.` : qs[qi];
    $('#hear').onclick = () => tts(askText(), state.settings.accent, 0.95);
    if ($('#nextQ')) $('#nextQ').onclick = () => { qi = (qi + 1) % qs.length; showQ(); $('#result').innerHTML = ''; tts(askText(), state.settings.accent, 0.95); };
    setTimeout(() => tts(askText(), state.settings.accent, 0.95), 400);

    // Ghi âm + nhận dạng giọng nói
    let recording = false, t0 = 0, finalText = '', interim = '';
    const clock = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
    const startRec = async () => {
      UI.stopSpeak();
      try { stream = await navigator.mediaDevices.getUserMedia({ audio: { autoGainControl: true, noiseSuppression: true, echoCancellation: true } }); }
      catch (e) { return toast('⚠️ ' + t('Cần cho phép dùng micro (biểu tượng 🎙️ trên thanh địa chỉ)')); }
      chunks = []; finalText = ''; interim = '';
      try { media = new MediaRecorder(stream); media.ondataavailable = e => e.data.size && chunks.push(e.data); media.start(); } catch (e) { media = null; }
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SR) {
        rec = new SR(); rec.lang = state.settings.accent; rec.continuous = true; rec.interimResults = true;
        rec.onresult = e => {
          interim = '';
          for (let i = e.resultIndex; i < e.results.length; i++) { const r = e.results[i]; if (r.isFinal) finalText += r[0].transcript + ' '; else interim += r[0].transcript; }
          const l = $('#live'); if (l) l.textContent = (finalText + interim).slice(-160);
        };
        rec.onend = () => { if (recording && rec) try { rec.start(); } catch (e) { /* đang chạy */ } }; // Chrome tự dừng sau ~1 phút im lặng
        try { rec.start(); } catch (e) { /* đã chạy */ }
      }
      recording = true; t0 = Date.now();
      $('#recBtn').classList.add('rec'); $('#recBtn').textContent = '⏹';
      $('#recHint').textContent = '🔴 ' + (SR ? t('Đang ghi âm và chuyển thành chữ… bấm để dừng') : t('Đang ghi âm… (trình duyệt không hỗ trợ chuyển giọng nói thành chữ)'));
      tick = setInterval(() => {
        const s = (Date.now() - t0) / 1000, el = $('#clock'); if (!el) return;
        el.textContent = clock(s);
        el.style.color = s > P.target[1] ? 'var(--again)' : s >= P.target[0] ? 'var(--good)' : '';
        if (part === 'p2' && s >= 120) stopRec(); // Part 2 tối đa 2 phút như thi thật
      }, 250);
    };
    const stopRec = () => {
      if (!recording) return;
      recording = false; clearInterval(tick);
      const secs = (Date.now() - t0) / 1000;
      $('#recBtn').classList.remove('rec'); $('#recBtn').textContent = '🎙️';
      $('#recHint').textContent = t('Bấm micro để trả lời lại');
      const done = () => analyse((finalText + ' ' + interim).trim(), secs, chunks.length ? UI.recUrl(new Blob(chunks, { type: (media && media.mimeType) || 'audio/webm' }), 'speak') : '');
      try { rec && rec.stop(); } catch (e) { /* đã dừng */ }
      rec = null;
      if (media && media.state !== 'inactive') { media.onstop = () => { setTimeout(done, 300); if (stream) stream.getTracks().forEach(x => x.stop()); }; media.stop(); }
      else { if (stream) stream.getTracks().forEach(x => x.stop()); setTimeout(done, 300); }
    };
    $('#recBtn').onclick = () => {
      if (recording) return stopRec();
      if (part === 'p2' && !prepT) {
        // 1 phút chuẩn bị như thi thật (có thể bỏ qua)
        let left = P.prep;
        $('#clockHint').innerHTML = '📝 ' + t('Thời gian chuẩn bị – ghi chú ý chính · <a href="#" id="skipPrep">bắt đầu nói ngay</a>');
        const go = () => { clearInterval(prepT); prepT = 1; $('#clockHint').textContent = t('Mục tiêu: {a}–{b} giây (tối đa 2 phút)', { a: P.target[0], b: P.target[1] }); startRec(); };
        $('#skipPrep').onclick = e => { e.preventDefault(); go(); };
        prepT = setInterval(() => { left--; const el = $('#clock'); if (!el) return clearInterval(prepT); el.textContent = clock(left); if (left <= 0) { Sfx.pop(); go(); } }, 1000);
        $('#clock').textContent = clock(left);
        return;
      }
      startRec();
    };

    function analyse(text, secs, audioUrl) {
      const words = (text.match(/[A-Za-z][A-Za-z'’-]*/g) || []);
      const wpm = secs > 3 ? Math.round(words.length / (secs / 60)) : 0;
      const fillers = (text.match(FILLERS) || []).length;
      const a = text ? Lexis.analyze(text) : null;
      const topicWords = topic ? topic.words.filter(w => UI.wordRegex(w.word).test(text)) : [];
      const notes = [];
      if (!text) notes.push(t('Không nhận được chữ nào – thử nói to, rõ hơn hoặc dùng Chrome/Edge để bật chuyển giọng nói thành chữ.'));
      if (secs < P.target[0]) notes.push(t('Câu trả lời hơi ngắn ({s} giây). Hãy mở rộng: <b>nêu ý → giải thích lý do → ví dụ cụ thể</b>.', { s: Math.round(secs) }));
      if (secs > P.target[1] + 15 && part !== 'p2') notes.push(t('Câu trả lời khá dài – ở phần này nên trả lời gọn, đi thẳng vào ý.'));
      if (wpm && wpm < 90) notes.push(t('Tốc độ {wpm} từ/phút hơi chậm – luyện nói liền mạch hơn, bớt ngắt quãng (mức tự nhiên ~110–160 từ/phút).', { wpm }));
      if (wpm > 180) notes.push(t('Tốc độ {wpm} từ/phút khá nhanh – nói chậm lại để phát âm rõ và nhấn trọng âm đúng.', { wpm }));
      if (fillers >= 3) notes.push(t('Dùng {n} từ đệm (um, uh, like, you know…) – thay bằng cụm câu giờ tự nhiên: <i>“That\'s an interesting question…”, “Let me think…”</i>', { n: fillers }));
      if (a && a.link.size < 2 && words.length > 30) notes.push(t('Thêm từ nối để mạch lạc: <i>Firstly, On top of that, For example, As a result…</i>'));
      if (a && a.phrases.size === 0 && words.length > 30) notes.push(t('Thử dùng 1–2 collocation hoặc idiom tự nhiên để tăng điểm Lexical Resource.'));
      if (!notes.length) notes.push(t('Rất tốt! Độ dài, tốc độ và từ vựng đều ổn – hãy thử câu khác hoặc chủ đề khác.'));
      $('#result').innerHTML = `<div class="card stack">
        <div class="row between"><h3 style="margin:0">📊 ${t('Kết quả')}</h3>${audioUrl ? `<audio controls src="${audioUrl}" style="height:36px;max-width:100%"></audio>` : ''}</div>
        <div class="grid g4 stats">
          <div class="card stat" style="padding:.7rem"><div><b>${Math.round(secs)}s</b><span class="tiny muted">${t('Thời lượng')}</span></div></div>
          <div class="card stat" style="padding:.7rem"><div><b>${wpm || '—'}</b><span class="tiny muted">${t('Từ/phút')}</span></div></div>
          <div class="card stat" style="padding:.7rem"><div><b>${words.length}</b><span class="tiny muted">${t('Số từ')}</span></div></div>
          <div class="card stat" style="padding:.7rem"><div><b>${fillers}</b><span class="tiny muted">${t('Từ đệm')}</span></div></div>
        </div>
        ${text ? `<div><b class="small">📝 ${t('Bản chữ (máy nhận dạng)')}</b><div class="passage hl-awl hl-link hl-mine" style="font-size:1rem;margin-top:.3rem">${Lexis.markText(text, { mine: w => App.inDeck(w) })}</div></div>` : ''}
        ${topicWords.length || (a && (a.awl.size || a.link.size)) ? `<div class="row">${topicWords.map(w => `<span class="chip ok">✓ ${esc(w.word)}</span>`).join('')}${a ? [...a.awl.keys()].map(w => `<span class="chip lv">🎓 ${esc(w)}</span>`).join('') + [...a.link.keys()].map(w => `<span class="chip">🧷 ${esc(w)}</span>`).join('') : ''}</div>` : ''}
        <div><b class="small">💬 ${t('Nhận xét')}</b><ul style="margin:.3rem 0;padding-left:1.2rem">${notes.map(n => `<li style="margin:.3rem 0">${n}</li>`).join('')}</ul></div>
        <div class="tiny muted">${t('Phân tích tự động để luyện tập, không thay thế giám khảo.')}</div>
      </div>`;
      if (words.length >= 10) { App.reward({ spoken: Math.min(10, Math.round(words.length / 10)), quizzes: 1, xp: 15 }, $('#recBtn')); Sfx.win(); }
      if (window.AI && text) AI.attach($('#result'), () => ({ kind: 'speaking', task: askText(), text: `Q (${part.toUpperCase()}): ${askText()}\nA (${Math.round(secs)}s): ${text}` }));
      $('#result').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  function tipsFor(part) {
    if (part === 'p2') return [t('Dùng 1 phút chuẩn bị để ghi 4–5 từ khóa, không viết câu dài.'), t('Đi lần lượt theo các gợi ý trên thẻ đề, ý cuối (“explain…”) là phần quan trọng nhất.'), t('Kể bằng thì quá khứ khi miêu tả trải nghiệm, thêm chi tiết cảm xúc.'), t('Cố nói đủ 2 phút – giám khảo sẽ ngắt khi hết giờ.')];
    if (part === 'p3') return [t('Cấu trúc: quan điểm → lý do → ví dụ → (so sánh/hệ quả).'), t('Dùng cụm nêu quan điểm: <i>It could be argued that…, From my perspective…</i>'), t('Nói về xã hội nói chung, không chỉ bản thân.'), t('Có thể nêu cả hai mặt rồi kết luận.')];
    return [t('Trả lời 2–3 câu: câu trả lời trực tiếp + lý do + chi tiết.'), t('Tránh chỉ “Yes/No”.'), t('Dùng từ vựng chủ đề tự nhiên, không học thuộc cả câu.'), t('Giữ giọng thoải mái như trò chuyện.')];
  }
})();
