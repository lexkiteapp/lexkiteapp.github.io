// Mọi câu có giọng Kokoro (audio/l): khóa → { voice, text }. Dùng chung: scripts/gen-audio.mjs (tạo câu thiếu),
// scripts/sentence-audio/todo.mjs + merge.mjs (cổng ASR câu, sentence-audio-asr.yml – docs/WORD-AUDIO.md, mục "Audio câu").
import fs from 'node:fs'; import vm from 'node:vm';
export function collect() {
  const c = { self: {} }; c.self = c; vm.createContext(c);
  vm.runInContext(fs.readFileSync('web/js/listen/kvoice.js', 'utf8'), c);
  for (const f of fs.readdirSync('web/js/listen').filter(f => /^test\d+\.js$/.test(f))) vm.runInContext(fs.readFileSync('web/js/listen/' + f, 'utf8'), c);
  for (const f of fs.readdirSync('web/js/toeic').filter(f => /^listening\d+\.js$/.test(f))) vm.runInContext(fs.readFileSync('web/js/toeic/' + f, 'utf8'), c);
  for (const f of fs.readdirSync('web/js/toefl').filter(f => /^data\d+\.js$/.test(f))) vm.runInContext(fs.readFileSync('web/js/toefl/' + f, 'utf8'), c);
  const parts = [...(c.LISTENING || []), ...((c.TOEIC || {}).listening || []), ...((c.TOEFL || {}).listening || [])];
  const jobs = new Map();
  for (const p of parts) {
    const v = c.KVoice.voices(p);
    for (const l of p.script || []) {
      const text = l.say || l.t; if (!text || l.pause != null) continue;
      const voice = l.say ? v._narrator : (v[l.s] || v._narrator), key = c.KVoice.lineKey(voice, text);
      jobs.set(key, { voice, text: String(text).trim() });
    }
  }
  // Truyện + Radio của #/lesson (docs/LESSON-ENGINE.md §2c): mỗi câu thoại 1 file theo giọng nhân vật (khớp LessonTeacher.VOICE)
  {
    vm.runInContext(fs.readFileSync('web/js/lesson/stories.js', 'utf8'), c);
    const V = { ama: 'af_heart', carlos: 'am_michael' };
    for (const st of c.LESSON_STORIES || []) for (const l of st.lines) { jobs.set(c.KVoice.lineKey(V[l.who], l.en), { voice: V[l.who], text: l.en.trim() }); }
  }
  // Cuộc gọi Ama/Carlos (#/call, docs/CALL.md): mỗi câu giáo viên nói (câu hỏi, câu đáp nhánh, câu kết) 1 file theo giọng người gọi → sprite khớp môi đúng độ dài file
  {
    for (const f of ['web/js/call/calls.js', 'web/js/call/calls-exam.js']) vm.runInContext(fs.readFileSync(f, 'utf8'), c);
    const V = { ama: 'af_heart', carlos: 'am_michael' };
    for (const k of c.CALLS || []) {
      const v = V[k.who] || V.ama, nodes = k.nodes ? Object.values(k.nodes) : (k.turns || []);
      for (const x of [...nodes.flatMap(n => [n.m, n.re, ...(n.br || []).map(b => b[1])]), k.end, "Let's keep our chat friendly and on topic!"]) if (x) jobs.set(c.KVoice.lineKey(v, x), { voice: v, text: String(x).trim() });
    }
  }
  // Câu đọc đơn (UI.tts): giọng chung theo accent – câu hỏi giám khảo Speaking (Anh & Mỹ), TOEFL Listen & Repeat / Interview
  const GEN = { 'en-GB': 'bf_emma', 'en-US': 'af_heart' };
  const addOne = (voice, text) => { const key = c.KVoice.lineKey(voice, text); jobs.set(key, { voice, text: String(text).trim() }); };
  for (const u of (c.TOEFL || {}).speaking || []) { const v = GEN[u.accent] || GEN['en-GB']; for (const x of u.sentences || []) x.t && addOne(v, x.t); for (const x of u.questions || []) x.q && addOne(v, x.q); }
  {
    const sp = fs.readFileSync('web/js/speaking.js', 'utf8'), i0 = sp.indexOf('const BANK = [') + 13;
    const BANK = vm.runInNewContext(sp.slice(i0, sp.indexOf('\n  ];', i0) + 4), { t: x => x });
    vm.runInContext(fs.readFileSync('web/js/speak/more.js', 'utf8'), c);
    for (const f of ['more2', 'more3']) if (fs.existsSync(`web/js/speak/${f}.js`)) vm.runInContext(fs.readFileSync(`web/js/speak/${f}.js`, 'utf8'), c);
    for (const x of c.SPEAK_MORE || []) if (!BANK.some(b => b.title === x.title)) BANK.push(x);
    for (const b of BANK) for (const v of Object.values(GEN)) { for (const q of [...b.p1, ...b.p3]) addOne(v, q); addOne(v, `${b.p2.q} You should say: ${b.p2.points.join(', ')}.`); }
  }
  // Đọc dài theo từng câu (UI.tts tách câu): câu trả lời mẫu Speaking + 30 bài đọc – giọng Anh (bf_emma)
  {
    for (const f of ['readings', 'readings-more']) vm.runInContext(fs.readFileSync(`web/js/${f}.js`, 'utf8'), c);
    vm.runInContext(fs.readFileSync('web/js/speak/samples.js', 'utf8'), c);
    const longs = [...(c.READINGS || []).map(r => r.text), ...Object.values(c.SPEAK_SAMPLES || {}).map(x => x.a)];
    for (const txt of longs) for (const sen of c.KVoice.split(txt)) addOne(GEN['en-GB'], sen);
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
    for (const tp of tops) for (const w of tp.words) if (w.ex && w.ex.split(' ').length >= 4) for (const sen of c.KVoice.split(w.ex)) addOne(GEN['en-GB'], sen);
  }
  return { jobs, parts };
}
