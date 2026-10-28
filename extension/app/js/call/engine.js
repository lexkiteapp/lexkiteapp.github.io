/* Call engine (#/call) – logic thuần, không DOM (test: scripts/test/call-engine.mjs). Dùng chung web + app Android (WebView).
 * Kịch bản dạng đồ thị: { start, nodes: { id: { m, o, br:[[regex, câu đáp, nútKế?]], re, next, min, long, prep, cue, kw } } };
 * kịch bản cũ dạng turns[] được chuyển tự động (t0 → t1 → …). Mọi thứ chạy trên máy – lời người học không gửi đi đâu.
 * API: prep(call) · step(call, id, text) · correct(text, prompt) · slips(text, call, node) · fluency(text, node, secs) · recap(call, log) · retry(call, ids) · asrMode(env) */
(function (g) {
  const t = (s, v) => (g.t ? g.t(s, v) : s);

  // ---------- Đồ thị ----------
  function prep(c) {
    if (!c || c._ok) return c;
    if (!c.nodes) {
      const nodes = {}; (c.turns || []).forEach((x, k, a) => { nodes['t' + k] = Object.assign({}, x, { next: k + 1 < a.length ? 't' + (k + 1) : null }); });
      c.nodes = nodes; c.start = 't0';
    }
    c.start = c.start || Object.keys(c.nodes)[0];
    c._ok = true; return c;
  }
  // Số lượt dài nhất (để hiện "lượt 2/6") – đi theo đường mặc định + nhánh, chặn vòng lặp
  function depth(c) {
    prep(c); const seen = {};
    const d = id => { if (!id || !c.nodes[id] || seen[id]) return 0; seen[id] = 1; const n = c.nodes[id]; const outs = [n.next, ...(n.br || []).map(b => b[2])].filter(Boolean); const r = 1 + Math.max(0, ...outs.map(d)); seen[id] = 0; return r; };
    return d(c.start);
  }
  /** step → { react, next (id|null), br (chỉ số nhánh, -1 = mặc định) } */
  function step(c, id, text) {
    prep(c); const n = c.nodes[id]; if (!n) return { react: '', next: null, br: -1 };
    const s = String(text || '');
    const brs = n.br || [];
    for (let k = 0; k < brs.length; k++) {
      const [re, line, to] = brs[k];
      try { if (new RegExp('\\b(' + re + ')', 'i').test(s)) return { react: line, next: to !== undefined ? to : (n.next || null), br: k }; } catch (e) { /* regex hỏng → bỏ nhánh */ }
    }
    return { react: n.re || '', next: n.next || null, br: -1 };
  }

  // ---------- Sửa ngữ pháp tế nhị (chuyển từ call.js) ----------
  const PAST = { go: 'went', have: 'had', eat: 'ate', buy: 'bought', see: 'saw', do: 'did', make: 'made', take: 'took', get: 'got', meet: 'met', come: 'came', drink: 'drank', swim: 'swam', run: 'ran', sleep: 'slept', leave: 'left', spend: 'spent', watch: 'watched', visit: 'visited', play: 'played', cook: 'cooked', clean: 'cleaned', work: 'worked', walk: 'walked', stay: 'stayed', finish: 'finished', fix: 'fixed', call: 'called', study: 'studied', try: 'tried', relax: 'relaxed' };
  const S3 = { go: 'goes', do: 'does', have: 'has', work: 'works', like: 'likes', want: 'wants', need: 'needs', live: 'lives', watch: 'watches', study: 'studies', play: 'plays', make: 'makes', know: 'knows', think: 'thinks' };
  const MODAL = /\b(to|will|would|can|could|should|must|might|may|did|didn'?t|does|doesn'?t|do|don'?t|let'?s|let|make|help)\s+$/i;
  const keepCase = (from, to) => (/^[A-Z]/.test(from) ? to[0].toUpperCase() + to.slice(1) : to);
  const RULES = [
    { why: () => t('“Agree” đã là động từ – không cần “am/is/are” đứng trước.'), fix: s => s.replace(/\b(I|we|they|you)\s+(am|are|'m|'re)\s+agree\b/i, (m, p) => p + ' agree') },
    { why: () => t('Với he/she/it, phủ định dùng “doesn’t”, không dùng “don’t”.'), fix: s => s.replace(/\b(he|she|it)\s+don'?t\b/i, (m, p) => p + " doesn't") },
    { why: () => t('Sau can/could/should/will không dùng “to”.'), fix: s => s.replace(/\b(can|could|should|will|must)\s+to\s+(\w+)/i, '$1 $2') },
    { why: () => t('Từ so sánh hơn như “better” đã mang nghĩa “hơn” – bỏ “more”.'), fix: s => s.replace(/\bmore\s+(better|easier|faster|bigger|cheaper|closer|worse)\b/i, '$1') },
    { why: () => t('Danh từ không đếm được (information, advice…) không thêm -s.'), fix: s => s.replace(/\b(information|advice|furniture|equipment|homework|luggage)s\b/i, '$1') },
    { why: () => t('“Very” không đứng trước động từ – dùng “really” hoặc “very much” ở cuối câu.'), fix: s => s.replace(/\bI\s+very\s+(like|love|want|enjoy)\b/i, 'I really $1') },
    { why: () => t('Sau want/need/would like, động từ tiếp theo cần “to”.'), fix: s => s.replace(/\b(want|need|would like|'d like)\s+(go|eat|buy|see|try|have|book|make|visit|ask|join|pay|come)\b/i, '$1 to $2') },
    { why: () => t('Trước nghề nghiệp số ít cần mạo từ “a/an”.'), fix: s => s.replace(/\b(I'm|I am)\s+(engineer|teacher|student|developer|designer|manager|doctor|nurse|accountant|intern)\b/i, (m, p, w) => p + (/^[aeiou]/i.test(w) ? ' an ' : ' a ') + w) },
    { why: () => t('Với he/she/it ở thì hiện tại đơn, động từ thêm -s/-es.'), fix: s => s.replace(/\b(he|she)\s+(go|do|have|work|like|want|need|live|watch|study|play|make|know|think)\b/gi, (m, p, v, off, str) => (MODAL.test(str.slice(0, off)) ? m : p + ' ' + keepCase(v, S3[v.toLowerCase()]))) },
    { past: true, why: () => t('Chuyện đã xảy ra (hôm qua, cuối tuần trước…) dùng động từ ở thì quá khứ.'), fix: s => s.replace(new RegExp('\\b(I|we|they|he|she)\\s+(' + Object.keys(PAST).join('|') + ')\\b', 'gi'), (m, p, v, off, str) => (MODAL.test(str.slice(0, off)) ? m : p + ' ' + keepCase(v, PAST[v.toLowerCase()]))) },
  ];
  const PAST_Q = /\b(did you|how was|what did|yesterday|last (night|week|weekend))\b/i;
  function correct(text, prompt) {
    for (const r of RULES) {
      if (r.past && !(PAST_Q.test(prompt || '') || /\b(yesterday|last (night|week|weekend|month|year)|ago)\b/i.test(text))) continue;
      const good = r.fix(text);
      if (good !== text) return { bad: text, good, why: r.why() };
    }
    return null;
  }

  // ---------- Nhầm cặp âm (bread ≠ breast): máy nghe ra từ "anh em" của từ cần nói ----------
  // Cặp riêng của cuộc gọi (ngoài pron/pairs.js): lỗi người Việt hay gặp trong hội thoại đời thường. Nhãn = id đối lập trong pairs.js (để mở bài luyện).
  const EXTRA = { 'final-drop': 'bread/breast bread/bred rice/rise fine/five nine/night', cluster: 'desk/dress best/bet test/text', 'i-ih': 'ship/sheep live/leave fill/feel', 'r-l': 'right/light rice/lice', 'final-voice': 'price/prize', 'th-s': 'think/sink thank/sank', 'ae-e': 'bad/bed man/men', 'w-v': 'west/vest wine/vine', 'v-b': 'very/berry' };
  const stem = w => w.replace(/(ies|es|s|ed|ing)$/, '');
  let IDX = null;
  function pairIndex() {
    if (IDX) return IDX; IDX = {};
    const add = (a, b, id) => { if (!a || !b || a === b) return; (IDX[a] = IDX[a] || []).push({ w: b, id }); (IDX[b] = IDX[b] || []).push({ w: a, id }); };
    const P = g.PronPairs;
    if (P && P.CONTRASTS) for (const c of P.CONTRASTS) String(c.pairs || '').split(/\s+/).forEach(p => { const [a, b] = p.split('/'); add(a, (b || '').replace(/=.*/, ''), c.id); });
    for (const id in EXTRA) EXTRA[id].split(/\s+/).forEach(p => { const [a, b] = p.split('/'); add(a, b, id); });
    return IDX;
  }
  const STOP = new Set('this that there their they them then than with have from what when were will would your yours some like just very much make made'.split(' '));
  // id đối lập → bài phát âm để luyện (#/pron/<bài>): bài đầu tiên của đối lập trong pairs.js
  const skillOf = id => { const c = g.PronPairs && g.PronPairs.CONTRASTS && g.PronPairs.CONTRASTS.find(x => x.id === id); return (c && c.skills && c.skills[0]) || 'final-consonants'; };
  const words = s => String(s || '').toLowerCase().replace(/[’']/g, "'").match(/[a-z][a-z']*/g) || [];
  function slips(text, c, n) {
    const heard = new Set(words(text)), idx = pairIndex(), out = [];
    // Từ "cần nói": từ khóa của lượt + từ chủ đề + từ nội dung (≥ 4 chữ) trong câu gợi ý – từ ngắn (see/she, live/life…) dễ báo nhầm nên bỏ
    const exp = new Set([...(n && n.kw || []), ...(c && c.words || [])].flatMap(words).concat(words((n && n.o || []).join(' ')).filter(w => w.length >= 5 && !STOP.has(w))));
    for (const w of heard) {
      if (exp.has(w) || [...exp].some(e => stem(e) === stem(w))) continue; // lives ~ live: biến thể của từ cần nói, không phải nhầm âm
      for (const { w: p, id } of idx[w] || []) if (exp.has(p) && !heard.has(p) && !out.some(x => x.meant === p)) out.push({ said: w, meant: p, id, skill: skillOf(id) });
    }
    return out.slice(0, 2);
  }

  // ---------- Độ trôi chảy (đếm trên máy, không cần mô hình) ----------
  const FILL = /\b(um+|uh+|er+m?|hmm+|you know)\b/gi;
  const LINK = /\b(because|so|but|although|though|however|for example|for instance|actually|also|then|which|when|if|while|instead|especially)\b/i;
  function fluency(text, n = {}, secs = 0) {
    const ws = words(text), fillers = (String(text || '').match(FILL) || []).length, real = ws.length - fillers;
    const min = n.min || 0;
    return { words: real, fillers, short: !!min && real < min, link: LINK.test(text || ''), wpm: secs > 1 ? Math.round(real / secs * 60) : 0 };
  }

  // ---------- Tổng kết ----------
  /** log = [{ id, text, picked, secs?, asr? (0–100) }] → recap */
  function recap(c, log) {
    prep(c);
    const exam = /^ielts/.test(c.exam || '');
    const turns = log.map(x => {
      const n = c.nodes[x.id] || {};
      const fix = x.picked ? null : correct(x.text, n.m);
      const sl = x.picked ? [] : slips(x.text, c, n);
      const fl = fluency(x.text, n, x.secs);
      const weak = !x.picked && (!!fix || sl.length > 0 || fl.short || (x.asr != null && x.asr < 50));
      return { id: x.id, m: n.m, text: x.text, picked: !!x.picked, fix, slips: sl, fl, weak, model: (n.o || [])[0] || '' };
    });
    const spoken = turns.filter(x => !x.picked);
    const said = new Set(spoken.flatMap(x => words(x.text)).map(stem));
    const target = [...new Set((c.words || []).map(w => w.toLowerCase()))];
    const used = target.filter(w => w.split(/\s+/).every(p => said.has(stem(p))));
    const allWords = spoken.reduce((s, x) => s + x.fl.words, 0), fillers = spoken.reduce((s, x) => s + x.fl.fillers, 0);
    const uniq = new Set(spoken.flatMap(x => words(x.text))).size;
    const notes = [];
    const shortN = spoken.filter(x => x.fl.short).length;
    if (shortN) notes.push({ id: 'short', n: shortN });
    if (spoken.length >= 2 && exam && !spoken.some(x => x.fl.link)) notes.push({ id: 'link' });
    if (allWords >= 20 && fillers / Math.max(1, allWords) > 0.08) notes.push({ id: 'fillers', n: fillers });
    if (spoken.some(x => x.slips.length)) notes.push({ id: 'slips' });
    const wpms = spoken.map(x => x.fl.wpm).filter(Boolean);
    const wpm = wpms.length ? Math.round(wpms.reduce((a, b) => a + b, 0) / wpms.length) : 0;
    if (wpm && wpm < 70) notes.push({ id: 'slow', wpm });
    if (!spoken.length && turns.length) notes.push({ id: 'speak' });
    if (!notes.length && spoken.length) notes.push({ id: 'good' });
    // Điểm tử tế: không ai dưới 40 nếu đã thử; bỏ lượt / chỉ chạm gợi ý thì kéo xuống nhẹ
    const k = Math.max(1, depth(c)), done = Math.min(1, turns.length / k), share = turns.length ? spoken.length / turns.length : 0;
    const clean = spoken.length ? spoken.filter(x => !x.weak).length / spoken.length : 0;
    const score = turns.length ? Math.round(Math.max(40, Math.min(100, 40 + done * 20 + share * 20 + clean * 20))) : 0;
    return {
      turns, spoken: spoken.length, picked: turns.length - spoken.length, words: allWords, uniq, fillers, wpm,
      used, target, notes, weak: turns.filter(x => x.weak).map(x => x.id), score,
      band: score >= 85 ? 'great' : score >= 70 ? 'good' : 'keep',
    };
  }
  /** Cuộc gọi luyện lại: chỉ các nút yếu, nối thẳng hàng; giữ câu hỏi + câu mẫu */
  function retry(c, ids) {
    prep(c);
    const keep = [...new Set(ids)].filter(id => c.nodes[id]);
    const nodes = {};
    keep.forEach((id, k) => { const n = c.nodes[id]; nodes[id] = Object.assign({}, n, { br: (n.br || []).map(b => [b[0], b[1]]), next: keep[k + 1] || null }); });
    return Object.assign({}, c, { id: c.id, retry: true, nodes, start: keep[0], _ok: true });
  }

  // ---------- Chọn đường nhận dạng: trên máy trước, đám mây chỉ khi người học tự chọn ----------
  /** env: { local (Web Speech processLocally có gói tiếng Anh), sr (có SpeechRecognition), media (getUserMedia+MediaRecorder), whisper (đã đồng ý tải), ext (add-on), pref ('device'|'cloud'|'tap'|null) }
   *  → 'local' | 'whisper' | 'cloud' | 'ask' | 'tap' */
  function asrMode(e = {}) {
    if (e.pref === 'tap') return 'tap';
    if (e.local && e.sr) return 'local';
    if (e.pref === 'cloud' && e.sr) return 'cloud';
    if (e.media && !e.ext) return e.whisper ? 'whisper' : (e.pref === 'device' ? 'whisper' : 'ask');
    return e.sr ? (e.pref === 'cloud' ? 'cloud' : 'ask') : 'tap';
  }

  g.CallEngine = { prep, depth, step, correct, slips, fluency, recap, retry, asrMode, words, pairIndex, EXTRA };
})(typeof self !== 'undefined' ? self : this);
