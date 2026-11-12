// Mọi câu có giọng Kokoro (audio/l): khóa → { voice, text }. Dùng chung: scripts/gen-audio.mjs (tạo câu thiếu),
// scripts/sentence-audio/todo.mjs + merge.mjs (cổng ASR câu, sentence-audio-asr.yml – docs/WORD-AUDIO.md, mục "Audio câu"),
// scripts/audio/coverage.mjs (độ phủ theo nhóm: groups = tên nhóm → khóa). Nhóm theo giọng đọc chung (GEN) có cả Anh lẫn Mỹ: UI.tts tra khóa theo accent người học.
import fs from 'node:fs'; import vm from 'node:vm';
import { dataFiles } from '../lib/scan-roots.mjs';
export function collect() {
  const groups = new Map(), tag = (g, key) => { if (!groups.has(g)) groups.set(g, new Set()); groups.get(g).add(key); };
  const c = { self: {} }; c.self = c; vm.createContext(c);
  vm.runInContext(fs.readFileSync('web/js/listen/kvoice.js', 'utf8'), c);
  for (const f of dataFiles('listen', /^test\d+\.js$/)) vm.runInContext(fs.readFileSync(f, 'utf8'), c); // web/js/listen + web/cpack/listen
  for (const f of fs.readdirSync('web/js/toeic').filter(f => /^listening\d+\.js$/.test(f)).sort()) vm.runInContext(fs.readFileSync('web/js/toeic/' + f, 'utf8'), c);
  for (const f of fs.readdirSync('web/cpack/toefl').filter(f => /^data\d+\.js$/.test(f))) vm.runInContext(fs.readFileSync('web/cpack/toefl/' + f, 'utf8'), c);
  // Cambridge A2–C2 (docs/specs/cambridge.md): mỗi unit nghe có speakers + script như TOEFL
  if (fs.existsSync('web/cpack/cambridge')) for (const l of fs.readdirSync('web/cpack/cambridge').filter(x => /^(a2|b1|b2|c1|c2)$/.test(x))) for (const f of fs.readdirSync('web/cpack/cambridge/' + l).filter(f => /^t\d+\.js$/.test(f))) vm.runInContext(fs.readFileSync(`web/cpack/cambridge/${l}/${f}`, 'utf8'), c);
  const camUnits = (c.CAMBRIDGE || []).flatMap(T => ((T.listening || {}).parts || []).flatMap(p => p.units || [])).map(u => ({ ...u, _g: 'cambridge-listening' }));
  const parts = [...(c.LISTENING || []), ...((c.TOEIC || {}).listening || []), ...((c.TOEFL || {}).listening || []), ...camUnits];
  const jobs = new Map();
  for (const p of parts) {
    const v = c.KVoice.voices(p);
    for (const l of p.script || []) {
      const text = l.say || l.t; if (!text || l.pause != null) continue;
      const voice = l.say ? v._narrator : (v[l.s] || v._narrator), key = c.KVoice.lineKey(voice, text);
      jobs.set(key, { voice, text: String(text).trim() }); tag(p._g || 'listening', key);
    }
  }
  // Truyện + Radio của #/lesson (docs/LESSON-ENGINE.md §2c): mỗi câu thoại 1 file theo giọng nhân vật (khớp LessonTeacher.VOICE)
  {
    vm.runInContext(fs.readFileSync('web/cpack/lesson/stories.js', 'utf8'), c);
    const V = { ama: 'af_heart', carlos: 'am_michael' };
    for (const st of c.LESSON_STORIES || []) for (const l of st.lines) { const key = c.KVoice.lineKey(V[l.who], l.en); jobs.set(key, { voice: V[l.who], text: l.en.trim() }); tag('lesson-stories', key); }
  }
  // Cuộc gọi Ama/Carlos (#/call, docs/CALL.md): mỗi câu giáo viên nói (câu hỏi, câu đáp nhánh, câu kết) 1 file theo giọng người gọi → sprite khớp môi đúng độ dài file
  {
    for (const f of ['web/js/call/calls.js', 'web/js/call/calls-exam.js', 'web/js/call/calls-lot1.js', 'web/js/call/calls-lot2.js']) vm.runInContext(fs.readFileSync(f, 'utf8'), c);
    const V = { ama: 'af_heart', carlos: 'am_michael' };
    for (const k of c.CALLS || []) {
      const v = V[k.who] || V.ama, nodes = k.nodes ? Object.values(k.nodes) : (k.turns || []);
      for (const x of [...nodes.flatMap(n => [n.m, n.re, ...(n.br || []).map(b => b[1])]), k.end, "Let's keep our chat friendly and on topic!"]) if (x) { const key = c.KVoice.lineKey(v, x); jobs.set(key, { voice: v, text: String(x).trim() }); tag('calls', key); }
    }
  }
  // Câu đọc đơn (UI.tts): giọng chung theo accent – câu hỏi giám khảo Speaking (Anh & Mỹ), TOEFL Listen & Repeat / Interview
  const GEN = { 'en-GB': 'bf_emma', 'en-US': 'af_heart' };
  const addOne = (voice, text, g) => { if (!text || !String(text).trim()) return; const key = c.KVoice.lineKey(voice, text); jobs.set(key, { voice, text: String(text).trim() }); if (g) tag(g, key); };
  // câu đọc theo accent người học (state.settings.accent): cả 2 giọng; đọc dài → tách câu giống hệt UI.tts (KVoice.split)
  const both = (text, g) => { for (const v of Object.values(GEN)) addOne(v, text, g); };
  const oneSplit = (v, text, g) => { if (!text) return; const whole = c.KVoice.lineKey(v, text); if (jobs.has(whole)) { tag(g, whole); return; } for (const sen of c.KVoice.split(text)) addOne(v, sen, g); };
  const bothSplit = (text, g) => { for (const v of Object.values(GEN)) oneSplit(v, text, g); };
  // Cambridge Speaking: câu hỏi giám khảo (UI.tts 'en-GB') + lời bạn cùng thi (UI.tts 'en-US') – web/js/cambridge.js
  for (const T of c.CAMBRIDGE || []) for (const p of (T.speaking || {}).parts || []) {
    for (const q of [...(p.phases || []).flatMap(x => [...(x.q || []), ...(x.extended ? [x.extended] : [])]), p.prompt, ...(p.follow || [])]) if (q) addOne(GEN['en-GB'], q, 'cambridge-speaking');
    for (const l of p.partnerLines || []) addOne(GEN['en-US'], l, 'cambridge-speaking');
  }
  // Trung gian (#/mediate, docs/specs/mediation.md): nguồn đọc/nói/hội thoại đọc to bằng giọng cố định của MediateCore.voices (web/js/mediate.js play()) – biểu đồ không đọc
  if (fs.existsSync('web/cpack/mediation')) {
    vm.runInContext(fs.readFileSync('web/js/mediate-core.js', 'utf8'), c);
    for (const f of fs.readdirSync('web/cpack/mediation').filter(f => /^m\d+\.js$/.test(f)).sort()) vm.runInContext(fs.readFileSync('web/cpack/mediation/' + f, 'utf8'), c);
    for (const X of Object.values(c.MEDIATION || {})) {
      const S = X.source, V = c.MediateCore.voices(S);
      if (S.kind === 'dialogue') for (const l of S.lines || []) oneSplit(V[l.s], l.t, 'mediation-source');
      else if (S.kind !== 'chart') oneSplit(V._narrator, c.MediateCore.sourceText(S), 'mediation-source');
    }
  }
  for (const u of (c.TOEFL || {}).speaking || []) { const v = GEN[u.accent] || GEN['en-GB']; for (const x of u.sentences || []) x.t && addOne(v, x.t, 'toefl-speaking'); for (const x of u.questions || []) x.q && addOne(v, x.q, 'toefl-speaking'); }
  {
    const sp = fs.readFileSync('web/js/speaking.js', 'utf8'), i0 = sp.indexOf('const BANK = [') + 13;
    const BANK = vm.runInNewContext(sp.slice(i0, sp.indexOf('\n  ];', i0) + 4), { t: x => x });
    vm.runInContext(fs.readFileSync('web/js/speak/more.js', 'utf8'), c);
    for (const f of ['more2', 'more3']) { const p = [`web/cpack/speak/${f}.js`, `web/js/speak/${f}.js`].find(x => fs.existsSync(x)); if (p) vm.runInContext(fs.readFileSync(p, 'utf8'), c); }
    for (const x of c.SPEAK_MORE || []) if (!BANK.some(b => b.title === x.title)) BANK.push(x);
    for (const b of BANK) for (const v of Object.values(GEN)) { for (const q of [...b.p1, ...b.p3]) addOne(v, q, 'speaking-questions'); addOne(v, `${b.p2.q} You should say: ${b.p2.points.join(', ')}.`, 'speaking-questions'); }
  }
  // Đọc dài theo từng câu (UI.tts tách câu): câu trả lời mẫu Speaking + 30 bài đọc – theo accent người học (cả 2 giọng)
  {
    for (const f of ['web/js/readings.js', 'web/cpack/readings/more.js']) vm.runInContext(fs.readFileSync(f, 'utf8'), c);
    vm.runInContext(fs.readFileSync('web/cpack/speak/samples.js', 'utf8'), c);
    for (const r of c.READINGS || []) for (const sen of c.KVoice.split(r.text)) both(sen, 'readings');
    for (const x of Object.values(c.SPEAK_SAMPLES || {})) for (const sen of c.KVoice.split(x.a)) both(sen, 'speaking-samples');
  }
  // Nhóm tĩnh khác mà app đọc qua UI.tts / LessonTeacher.say (đo 1/11: trước đó luôn rơi về giọng máy). Mỗi file nạp trong ngữ cảnh riêng có window = self.
  {
    const ctx = () => { const x = { t: s => s, console }; x.self = x.window = x.globalThis = x; vm.createContext(x); return x; };
    const L = (x, f) => { try { vm.runInContext(fs.readFileSync(f, 'utf8'), x); } catch (e) { console.error(`corpus: bỏ qua ${f}: ${e.message}`); } };
    const strs = a => (Array.isArray(a) ? a : [a]).filter(v => typeof v === 'string' && /[A-Za-z]/.test(v));
    // Confidence (confidence.js: theo accent người học; người nói b đọc giọng còn lại → cả 2 giọng)
    { const x = ctx(); L(x, 'web/js/confidence/data.js'); const D = x.CONF || {};
      for (const u of D.units || []) { for (const p of u.phrases || []) bothSplit(p.say, 'confidence'); for (const l of (u.dialogue || {}).lines || []) bothSplit(l[1], 'confidence'); }
      for (const k of D.toolkit || []) for (const p of k.phrases || []) bothSplit(p.say, 'confidence');
      for (const q of D.daily || []) bothSplit(q.q, 'confidence'); }
    // Roleplay kịch bản (roleplay.js: câu AI = phản hồi + câu kế → UI.tts tách câu; gợi ý mẫu tr.h). Câu trả lời AI tự do là động – không thuộc nhóm này.
    { const x = ctx(); for (const f of ['data-a', 'data-b', 'data-everyday']) L(x, `web/js/roleplay/${f}.js`);
      for (const sc of x.ROLEPLAY || []) { for (const tr of sc.turns || []) { for (const v of [...strs(tr.a), ...strs(tr.h), ...(tr.br || []).flatMap(b => strs(b[1]))]) bothSplit(v, 'roleplay'); } for (const v of strs(sc.end)) bothSplit(v, 'roleplay'); }
      for (const v of ['Okay.', 'I see.', 'Right.', 'Okay, I see.', 'Got it.', 'Right, thanks.', 'Understood.', 'That makes sense.', 'Fair enough.', 'Sorry, can you say a little more?', 'Sorry, could you tell me a bit more?', 'Could you expand on that a little?']) both(v, 'roleplay'); }
    // TOEIC Speaking & Writing (toeic.js): đề đọc theo u.accent; câu mẫu theo accent người học
    { const x = ctx(); L(x, 'web/js/toeic/sw1.js');
      for (const u of ((x.TOEIC_SW || {}).speaking) || []) { const v = GEN[u.accent] || GEN['en-US'], pr = u.task === 'read' ? [u.text] : u.task === 'opinion' ? [u.q] : (u.questions || []).map(q => q.q);
        for (const t of strs(pr)) oneSplit(v, t, 'toeic-speaking');
        for (const t of strs(u.task === 'opinion' ? [u.model] : (u.questions || []).map(q => q.model))) bothSplit(t, 'toeic-speaking'); }
      for (const v of Object.values(GEN)) addOne(v, 'This is a sound check. If you can hear this clearly, you are ready.', 'ui-lines'); }
    // TOEFL Interview: câu trả lời mẫu (data-saysent → accent người học)
    for (const u of (c.TOEFL || {}).speaking || []) for (const q of u.questions || []) bothSplit(q.model, 'toefl-models');
    // Thi thử Speaking Part 2 (mock.js, giọng Anh): lời dẫn + đề, UI.tts tách câu
    { const sp = fs.readFileSync('web/js/speaking.js', 'utf8'), i0 = sp.indexOf('const BANK = [') + 13, B = vm.runInNewContext(sp.slice(i0, sp.indexOf('\n  ];', i0) + 4), { t: v => v });
      for (const b of [...B, ...(c.SPEAK_MORE || [])]) { const t = `Now I'd like you to talk about a topic for one to two minutes. You have one minute to prepare. ${b.p2.q}`; for (const sen of c.KVoice.split(t)) addOne(GEN['en-GB'], sen, 'mock-speaking'); } }
    // Phát âm: từ + cặp tối thiểu + câu (pron.js, data-speak-text bỏ ký hiệu ngữ điệu), Nói theo mẫu (sayit.js, giọng Mỹ), nhịp câu (rhythm.js)
    { const x = ctx(); for (const f of ['sounds', 'skills', 'pairs', 'coach']) L(x, `web/js/pron/${f}.js`);
      for (const it of x.PRON || []) { for (const w of it.words || []) both(w.w, 'pron'); for (const w of (it.pairs || []).flat()) both(w, 'pron');
        for (const sn of it.sentences || []) bothSplit(String(sn).replace(/[↗↘‿]|\s\/\s/g, ' ').replace(/\s+/g, ' ').trim(), 'pron'); }
      for (const k of (x.PronPairs || {}).CONTRASTS || []) for (const p of String(k.pairs || '').split(/\s+/)) for (const w of p.split('/')) addOne(GEN['en-US'], w.split('=')[0], 'pron');
      for (const it of (x.PronCoach || {}).SENTENCES || []) bothSplit(it.s, 'pron'); }
    // Tình huống Nói (speak/app.js, giọng Mỹ, cả câu)
    { const x = ctx(), d = 'web/cpack/speak/s'; if (fs.existsSync(d)) for (const f of fs.readdirSync(d).filter(f => /^[^.]+\.js$/.test(f)).sort()) L(x, `${d}/${f}`); // gốc en từng tình huống (scripts/speak/build.mjs)
      for (const sc of Object.values(x.SPK_B || {})) for (const l of sc.lines || []) oneSplit(GEN['en-US'], l.en, 'speak-situations'); }
    // Lời giáo viên Ama/Carlos trong #/lesson (LessonTeacher.say tra khóa CẢ CÂU theo giọng nhân vật): khen/sửa, câu hỏi truyện, câu "nói hay hơn"
    { const x = ctx(); L(x, 'web/cpack/lesson/gold.js'); const T = ['af_heart', 'am_michael'];
      const lines = ['Nice!', 'Great!', 'Yes!', 'Perfect!', 'Well done!', 'Almost!', 'Not quite.', "Let's try again.", 'Great job!', 'Good work. Keep going!',
        ...(c.LESSON_STORIES || []).flatMap(st => (st.checks || []).filter(k => k.type === 'q').map(k => k.q)), ...Object.values(x.LESSON_GOLD || {}).flat().map(g => g && g.r)];
      for (const t of strs(lines)) for (const v of T) addOne(v, t, 'lesson-teacher');
      // câu ví dụ của thẻ giải thích (grammar.js / usage.js ExplainCard → UI.speak theo accent người học)
      for (const t of strs(Object.values(x.LESSON_GOLD || {}).flat().flatMap(g => (g && g.ex) || []))) bothSplit(t, 'gold-examples'); }
    // Bài mẫu (phrases.js, bỏ đánh dấu) + câu cố định trong Cài đặt
    { const x = ctx(); for (const f of fs.readdirSync('web/js').filter(f => /^models.*\.js$/.test(f))) L(x, `web/js/${f}`);
      const plain = t => t.replace(/<<[^>]*>>/g, '').replace(/\[\[([^|\]]*)\|[^\]]*\]\]/g, '$1').replace(/\{\{([^}]*)\}\}/g, '$1');
      for (const m of x.MODELS || []) if (m.text) bothSplit(plain(m.text), 'models');
      for (const t of ['This is how I will read words and sentences to you.', 'Many people believe that renewable energy is the key to a sustainable future. However, the transition will not happen overnight.']) bothSplit(t, 'ui-lines'); }
    // Say it like a native (say.js: 🔊 = giọng giáo viên của loạt, UI.tts 'en-US' giọng nhân vật – cả câu như UI.tts tra trước)
    if (fs.existsSync('web/data/say.json')) { const V = { ama: 'af_heart', carlos: 'am_michael' };
      for (const s of JSON.parse(fs.readFileSync('web/data/say.json', 'utf8')).series || []) for (const it of s.items || []) oneSplit(V[s.teacher] || V.ama, it.say, 'say-native'); }
    // Bảng động từ bất quy tắc (#/irregular): chuỗi 3 dạng + 2 câu ví dụ, theo accent người học (cpack/irregular/table.js, UI.tts)
    if (fs.existsSync('web/js/irv/core.json')) for (const r of JSON.parse(fs.readFileSync('web/js/irv/core.json', 'utf8')).rows) for (const t of [r[10], r[5], r[6]]) bothSplit(t, 'irregular');
    // Ngân hàng ý tưởng Task 2 (ideas.js: câu ví dụ, nút data-saysent → theo accent người học)
    { const x = ctx(); L(x, 'web/cpack/write/ideas.js'); for (const tp of x.IDEAS || []) for (const iss of tp.issues || []) for (const it of [...(iss.for || []), ...(iss.against || [])]) for (const t of strs(it.ex)) bothSplit(t, 'ideas'); }
    // Ngữ pháp: mọi câu ví dụ (trường ex) trong web/js/grammar + web/cpack/grammar (bài tải lười); bỏ mục lục lazy-*.js
    { const x = ctx(); for (const d of ['web/js/grammar', 'web/cpack/grammar']) if (fs.existsSync(d)) for (const f of fs.readdirSync(d).filter(f => f.endsWith('.js') && !/^lazy-/.test(f)).sort()) L(x, `${d}/${f}`);
      const seen = new Set(), walk = o => { if (!o || typeof o !== 'object' || seen.has(o)) return; seen.add(o); for (const [k, v] of Object.entries(o)) { if (k === 'ex') for (const t of strs(v)) bothSplit(t, 'grammar'); else walk(v); } };
      walk(x.GRAMMAR); walk(x.GRAMMAR_CHECK); }
  }
  // Từ vựng (giọng Anh bf_emma): mọi lần phát âm từ trong app tự dùng Kokoro, và chế độ Học rảnh tay phát được khi khóa màn hình.
  // Thứ tự: từ cốt lõi NGSL → công sở → học thuật → còn lại. Câu ví dụ dùng chung đường đọc câu (UI.tts).
  {
    const d = { t: x => x }; vm.createContext(d); vm.runInContext(fs.readFileSync('web/js/data.js', 'utf8').replace(/typeof self !== 'undefined' \? self : this/, 'globalThis'), d);
    for (const f of fs.readdirSync('web/js/lib').filter(f => /\.js$/.test(f) && !/^notes/.test(f))) { try { vm.runInContext(fs.readFileSync('web/js/lib/' + f, 'utf8').replace(/typeof self !== 'undefined' \? self : this/, 'globalThis'), d); } catch (e) { /* bỏ qua */ } }
    const ord = id => (/^ngsl/.test(id) ? 0 : /^office/.test(id) ? 1 : /^(awl|nawl)/.test(id) ? 2 : 3);
    const tops = [...((d.IELTS_DATA || {}).TOPICS || [])].sort((a, b) => ord(a.id) - ord(b.id));
    const seen = new Set();
    for (const tp of tops) for (const w of tp.words) { const k = String(w.word || '').trim(); if (!k || seen.has(k.toLowerCase())) continue; seen.add(k.toLowerCase()); addOne(GEN['en-GB'], k); }
    // Câu ví dụ: cả giọng Anh lẫn Mỹ (trước 1/11 chỉ bf_emma → người học giọng Mỹ 0 % có file, 8.697 câu rơi về giọng máy)
    for (const tp of tops) for (const w of tp.words) if (w.ex) for (const sen of c.KVoice.split(w.ex)) { addOne(GEN['en-GB'], sen, 'examples-uk'); addOne(GEN['en-US'], sen, 'examples-us'); }
    // Từ chưa có file audio/w đạt Whisper cho một giọng (web/audio/w/s3.tsv) → thêm khóa câu cùng giọng: UI.speak rơi về UI.tts,
    // cổng ASR câu (sentence-audio-asr.yml) nghe và render lại bằng các phương án từ đơn (isShort → word-audio METHODS)
    const s3 = new Map((fs.existsSync('web/audio/w/s3.tsv') ? fs.readFileSync('web/audio/w/s3.tsv', 'utf8') : '').split('\n').filter(Boolean).map(l => { const [w, ...x] = l.split('\t'); return [w, x]; }));
    for (const [w, st] of s3) ['bf_emma', 'af_heart'].forEach((v, i) => { if (st[i] !== 'ok') addOne(v, w); });
  }
  return { jobs, parts, groups };
}
