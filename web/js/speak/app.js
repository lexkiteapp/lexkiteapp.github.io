/* 🎙️ Play & Speak M1 (cờ speak_pack, mặc định TẮT – docs/specs/play-and-speak.md): #/speak/<id> màn tình huống (Stitch pas-sit) · #/speak/<id>/drill "Nói theo 3 nhịp" (Stitch pas-drill).
 * Khung TỰ SINH web/js/st/v2/pas-{sit,drill}.js (bind brand/stitch/v2/bind/pas-*.json) – code chỉ dựng dữ liệu thật. Nội dung: content/situations/<id>.json → web/js/speak/data.js.
 * Chấm: Speak.score (web/js/speak/score.js, bọc UI.recognize, âm thanh không rời máy). Giáo viên: Ama/Carlos 2D CHỈ qua Chars.*.
 * Không mic (từ chối mic / không hỗ trợ / người học chọn): chạm chip theo đúng thứ tự, vẫn tính câu đã nói, tối đa ★ (§7). Tiến độ: localStorage lk.spk (trên máy).
 * Bật thử: localStorage lk.speak=1 (0 = tắt) hoặc config công khai speak_pack=true. */
(function () {
  const App = window.App; if (!App || !App.routes) return;
  const { routes } = App, view = App.view, KEY = 'lk.spk', WEEK_GOAL = 50, BEATS = [['listen', 'Nghe'], ['shadow', 'Nói đuổi'], ['memory', 'Nói từ trí nhớ']];
  App.speakOn = () => { try { const f = localStorage.getItem('lk.speak'); if (f === '1' || f === '0') return f === '1'; const c = JSON.parse(localStorage.getItem('lk.cfg') || 'null'), v = c && c.v && c.v.speak_pack; return v === true || v === '1' || v === 'true'; } catch (e) { return false; } };
  const L = o => { if (!o) return ''; const l = I18N.lang(); return o[l] || o.en || ''; };
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { return {}; } };
  const save = s => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* đầy bộ nhớ: bỏ qua */ } };
  const wk = () => { const d = new Date(), j = new Date(d.getFullYear(), 0, 1); return d.getFullYear() + '-W' + Math.ceil(((d - j) / 864e5 + j.getDay() + 1) / 7); };
  const lines = s => s.lines.filter(x => !x.open), byId = (s, id) => s.lines.find(x => x.id === id);
  const prog = (st, id) => (st[id] = st[id] || { lines: {}, tasks: {} });
  const teach = (pose, alt) => window.Chars ? Chars.img('ama', { kind: 'still', pose, size: 120, alt: alt || '', cls: 'w-full h-full object-contain object-bottom' }) : '';
  const go = h => { location.hash = h; };
  const sit = id => (window.SPK || {})[id];

  // ---------- Màn tình huống ----------
  function situation(s) {
    const st = load(), p = prog(st, s.id), all = lines(s), mastered = all.filter(x => (p.lines[x.id] || {}).stars >= 2).length, wkN = (st.week || {})[wk()] || 0;
    const stageSt = s.stages.map(g => g.lines.every(id => (p.lines[id] || {}).stars >= 1)), cur = Math.max(0, stageSt.indexOf(false) === -1 ? s.stages.length - 1 : stageSt.indexOf(false));
    const starsOf = g => { const v = g.lines.map(id => (p.lines[id] || {}).stars || 0); return Math.min(...v); };
    const nodes = s.stages.map((g, i) => ({ label: L(g.title), st: stageSt[i] ? 'done' : i === cur ? 'cur' : 'todo', stars: [1, 2, 3].map(n => ({ on: starsOf(g) >= n })), starsAria: t('{n}/3 sao', { n: starsOf(g) }), href: '#/speak/' + s.id + '/drill?stage=' + g.id }));
    const tasks = s.mission.tasks.map(k => ({ title: L(k.title), ex: '“' + byId(s, k.intents[0]).en + '”', done: !!p.tasks[k.id] }));
    const ti = tasks.findIndex(k => !k.done); tasks.forEach((k, i) => { k.st = k.done ? 'done' : i === ti ? 'cur' : 'todo'; });
    const saved = Object.values((App.state || {}).cards || {}).map(c => c && (c.word || c.w)).filter(Boolean).map(w => String(w).toLowerCase());
    const addon = [...new Set(all.flatMap(x => Speak.toks(x.en)).filter(w => saved.includes(w)))].slice(0, 4).map(w => { const c = Object.values(App.state.cards).find(c => String(c.word || c.w).toLowerCase() === w) || {}; return { w, ipa: c.ipa || c.phonetic || '' }; });
    const d = { back: '#/skills', title: L(s.title), sub: t('Luyện nói theo câu') + ' • ' + s.cefr, teacher: teach('point', ''), coach: t('Nhiệm vụ tình huống'), mission: L(s.goal),
      stage: t('Bước {n}/{m}', { n: cur + 1, m: s.stages.length }), group: L(s.title), nodes, tasks, taskDone: t('{n}/{m} xong', { n: tasks.filter(k => k.done).length, m: tasks.length }),
      mastered: `${mastered} / ${all.length}`, masteredSub: t('mẫu câu đã thuộc'), remain: t('Còn {n} mẫu câu', { n: all.length - mastered }), pct: Math.round(mastered / all.length * 100),
      week: t('Mục tiêu tuần {n}/{m} câu', { n: wkN, m: WEEK_GOAL }), addon, addonOn: addon.length > 0,
      start: '#/speak/' + s.id + '/drill', rp: '#/roleplay', info: t('Văn hoá'), culture: L(s.culture), tabsNav: [['#/home', 'Hôm nay'], ['#/vocab', 'Từ vựng'], ['#/skills', 'Kỹ năng'], ['#/tests', 'Thi thử'], ['#/me', 'Tôi']].map(([href, l]) => ({ href, label: t(l), on: href === '#/skills' })) };
    ST2.mount(view, 'pas-sit', d, null); document.title = d.title + ' – Lexkite';
    const info = view.querySelector('#spkInfo'); if (info) info.addEventListener('click', () => UI.toast(d.culture, 8000));
  }

  // ---------- Nói theo 3 nhịp ----------
  function drill(s, q) {
    const st = load(), p = prog(st, s.id), stage = s.stages.find(g => g.id === (q && q.get('stage'))), order = stage ? stage.lines.concat(s.stages.flatMap(g => g.lines).filter(id => !stage.lines.includes(id))) : s.stages.flatMap(g => g.lines);
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition, canMic = !!(SR || (navigator.mediaDevices && window.MediaRecorder));
    const S = { i: Math.max(0, order.findIndex(id => !((p.lines[id] || {}).stars >= 2))), b: 0, res: null, rec: false, unclear: 0, noMic: !canMic || st.nomic === 1, built: [], bank: [], t0: 0, say: '', pose: 'talk' };
    const line = () => byId(s, order[S.i]), words = () => line().en.split(/\s+/);
    const shuffle = a => a.map(v => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map(x => x[1]);
    const enter = () => { S.res = null; S.unclear = 0; S.built = []; S.bank = shuffle(words().map((w, i) => i)); S.t0 = 0; S.pose = S.b === 2 ? 'thinking' : S.b === 1 ? 'encourage' : 'talk';
      S.say = S.noMic ? t('Chạm các từ theo đúng thứ tự.') : [t('Nghe rồi nói theo nhé.'), t('Nói cùng nhịp với cô nhé.'), t('Giờ nói lại từ trí nhớ nhé.')][S.b]; };
    const tip = () => { const bad = S.res && S.res.words.filter(w => w.bad).map(w => Speak.toks(w.w)[0]); const pf = (line().pitfalls || []).find(x => x.w && (bad ? bad.includes(x.w.toLowerCase()) : S.b === 0)); return pf || null; };
    function data() {
      const ln = line(), n = order.length, ws = words(), mem = S.b === 2 && !S.res, r = S.res, pf = tip();
      let wl;
      if (S.noMic && !r) wl = S.built.map(i => ({ w: ws[i], p: false })).concat(S.bank.map(i => ({ w: mem ? ws[i][0] + '…' : ws[i], p: true, tap: true, i })));
      else wl = ws.map((w, i) => ({ w: mem ? w[0] + '…' : w, p: !r, bad: r && !r.words[i].ok }));
      const stars = r ? r.stars : 0, hi = pf && pf.hi ? L(pf.note).replace(pf.hi, '\u0001') : '';
      return { back: '#/speak/' + s.id, chip: L(s.title).split(/\s*[&,–-]\s*/)[0], prog: '• ' + t('Câu {n}/{m}', { n: S.i + 1, m: n }), total: n, done: S.i, pct: Math.round((S.i * 3 + S.b + (r && r.pass ? 1 : 0)) / (n * 3) * 100),
        coach: t('Cô {n}', { n: Chars.name('ama') }), say: S.say, hint: L(ln.gloss), teacher: teach(r ? (r.pass ? 'cheer' : 'concern') : S.pose, ''),
        beats: BEATS.map(([k, l], i) => ({ k, label: t(l), cur: i === S.b, done: i < S.b })), beatsAria: t('Nhịp {n}/3', { n: S.b + 1 }),
        playAria: t('Nghe câu mẫu'), slowAria: t('Nghe chậm'), wordsAria: mem ? t('Câu đã che – nói từ trí nhớ') : ln.en,
        words: wl, tipIpa: pf ? pf.ipa || '' : '', tipHtml: pf ? (hi ? ST.esc(hi).replace('\u0001', '<strong class="underline decoration-2">' + ST.esc(pf.hi) + '</strong>') : ST.esc(L(pf.note))) : '',
        noMic: S.noMic, rec: S.rec, micAria: S.rec ? t('Đang nghe… chạm để dừng') : t('Chạm mic để nói'), micLabel: S.rec ? t('Cô đang nghe…') : r ? t('Chạm để nói lại') : t('Chạm mic để nói'),
        res: !!r, score: r ? String(r.score) : '0', off: r ? (113.1 * (1 - r.score / 100)).toFixed(1) : '113.1', verdict: r ? r.verdict : '', sub: r ? r.sub : '',
        stars: [1, 2, 3].map(k => ({ on: stars >= k })), starsAria: t('{n}/3 sao', { n: stars }), canNext: !!(r && (r.pass || r.free)), alt: r ? t('Thử lại') : S.noMic ? t('Dùng mic') : t('Chưa nói được lúc này') };
    }
    const draw = () => { ST2.mount(view, 'pas-drill', data(), null); };
    const record = (sc, extra) => { const id = order[S.i], cur = p.lines[id] || {}; p.lines[id] = { best: Math.max(cur.best || 0, sc.text || 0), stars: Math.max(cur.stars || 0, sc.stars || 0) };
      for (const k of s.mission.tasks) if (k.intents.includes(id) && sc.pass) p.tasks[k.id] = true;
      const w = wk(); st.week = { [w]: ((st.week || {})[w] || 0) + 1 }; save(st);
      if (extra !== 'nomic' && App.reward) App.reward({ spoken: 1, xp: 2 * (sc.stars || 0) }); }; // nhiệm vụ 'spoken' + XP sẵn có (F4 tính vào streak/league)
    const result = (sc, free) => {
      const pass = free || Speak.pass(sc), limit = (words().length * 0.6 + 3) * 1000, quick = S.t0 && Date.now() - S.t0 <= limit;
      const stars = S.noMic ? (pass ? 1 : 0) : !pass ? 0 : S.b < 2 ? 1 : quick ? 3 : 2, score = Math.round((sc.text || 0) * 100);
      S.res = { score, pass, free: !!free, stars: free ? 0 : stars, words: sc.words.map(w => ({ ok: w.ok, bad: !w.ok, w: w.w })), verdict: pass ? t('Nói rất tốt!') : t('Gần đúng rồi!'),
        sub: free ? t('Chưa nghe rõ – cho qua, không tính sao.') : pass ? t('{n} từ/phút', { n: sc.fluency ? sc.fluency.wpm : 0 }) : t('Thử lại các từ tô đỏ nhé.') };
      if (pass || free) record({ text: sc.text, stars: S.res.stars, pass }, S.noMic ? 'nomic' : ''); };
    async function mic() {
      if (S.rec) { Speak.stop(); return; }
      S.rec = true; S.res = null; draw(); S.t0 = Date.now();
      const sc = await Speak.score({ target: line().en, mode: 'drill', accent: 'en-US' });
      S.rec = false;
      if (sc.error === 'not-allowed' || sc.error === 'unsupported' || sc.error === 'service-not-allowed') { S.noMic = true; enter(); S.say = t('Không dùng được mic – chạm các từ theo đúng thứ tự nhé.'); draw(); return; }
      if (sc.unclear) { S.unclear++; if (S.unclear <= 2) { S.say = t('Cô chưa nghe rõ – thử lại nhé, không bị trừ điểm.'); draw(); return; } result(Object.assign(sc, { words: Speak.align(line().en, line().en) }), true); S.say = t('Gợi ý: nói to, rõ từng từ. Cô cho qua lần này.'); draw(); return; }
      result(sc); S.say = S.res.pass ? (S.b === 2 ? t('Tuyệt! Nhớ được cả câu rồi.') : t('Tốt lắm! Sang nhịp tiếp nhé.')) : t('Gần rồi – nghe lại từ tô đỏ rồi thử lại.'); draw();
    }
    const tap = i => { if (S.res) return; const want = S.built.length; if (i !== want) { S.say = t('Chưa đúng thứ tự – thử từ khác nhé.'); draw(); return; }
      S.built.push(i); S.bank = S.bank.filter(x => x !== i);
      if (!S.bank.length) { result({ text: 1, words: Speak.align(line().en, line().en), fluency: { wpm: 0 } }); S.say = t('Đúng rồi! Giờ nghe cô đọc lại nhé.'); UI.tts(line().en, 'en-US'); }
      draw(); };
    const next = () => { if (!S.res || !(S.res.pass || S.res.free)) return; if (S.b < 2) S.b++; else { S.b = 0; S.i++; }
      if (S.i >= order.length) { UI.toast(t('Xong cả {n} mẫu câu!', { n: order.length })); go('#/speak/' + s.id); return; } enter(); draw(); };
    view.onclick = e => { const el = e.target.closest && e.target.closest('#spkMic,#spkPlay,#spkSlow,#spkNext,#spkRetry,[data-wi]:not([data-wi=""])'); if (!el) return;
      if (el.id === 'spkMic') mic(); else if (el.id === 'spkPlay') UI.tts(line().en, 'en-US'); else if (el.id === 'spkSlow') UI.tts(line().en, 'en-US', 0.6);
      else if (el.id === 'spkNext') next(); else if (el.id === 'spkRetry') { if (S.res) { enter(); } else { S.noMic = !S.noMic; st.nomic = S.noMic ? 1 : 0; save(st); enter(); } draw(); }
      else if (el.dataset.wi) tap(+el.dataset.wi); };
    view.onkeydown = e => { const el = e.target.closest && e.target.closest('[data-wi]:not([data-wi=""])'); if (el && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); tap(+el.dataset.wi); } };
    App.onCleanup && App.onCleanup(() => { Speak.stop(); view.onclick = null; view.onkeydown = null; });
    enter(); draw(); document.title = t('Nói theo 3 nhịp') + ' – Lexkite';
  }

  routes.speak = async (arg, q) => {
    if (!App.speakOn()) { location.replace('#/skills'); return; }
    await I18N.whenReady();
    const [id, sub] = String(arg || '').split('/'), s = sit(id || 'cafe');
    if (!s) { location.replace('#/speak/cafe'); return; }
    if (!id) { location.replace('#/speak/' + s.id); return; }
    if (sub === 'drill') drill(s, q); else situation(s);
  };
})();
