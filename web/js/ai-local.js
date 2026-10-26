/* AI trên máy dùng chung (Chrome/Edge built-in AI: Prompt, Translator, LanguageDetector, Summarizer, Rewriter, Writer, Proofreader).
   Miễn phí, riêng tư, tăng cường dần: mọi hàm trả null (không bao giờ throw) khi không có/không dùng được → nơi gọi dùng đường cũ (máy chủ/dữ liệu).
   Tải lười (App.need('ailocal')), KHÔNG nằm trong khung app. Không làm gì lúc mở app: chỉ dò khả năng khi một tính năng gọi tới, có bộ nhớ đệm.
   Không bao giờ tự tải mô hình: chỉ tải khi người dùng bấm (user activation), không dùng dữ liệu di động/Save-Data, bỏ qua máy RAM < 4 GB.
   Trong app gốc (Capacitor): gọi plugin LexAI trước (Gemini Nano/ML Kit trên Android, Foundation Models/Translation trên iOS),
   không có/lỗi → nhánh trình duyệt như cũ; cùng kiểu trả về. Xem docs/AI-LOCAL.md. */
(function (g) {
  const KINDS = { prompt: 'LanguageModel', translate: 'Translator', detect: 'LanguageDetector', summarize: 'Summarizer', rewrite: 'Rewriter', write: 'Writer', proofread: 'Proofreader' };
  const SIZE = { prompt: '~2 GB', summarize: '~2 GB', rewrite: '~2 GB', write: '~2 GB', proofread: '~2 GB', translate: '~50 MB', detect: '~5 MB' };
  const TIMEOUT = 8000;
  const api = k => { try { return g[KINDS[k]] || null; } catch (e) { return null; } };
  const nav = () => g.navigator || {};
  // Máy yếu / tiết kiệm dữ liệu → không dùng AI trên máy (tránh giật, nóng máy)
  const lowEnd = () => { const n = nav(); return (typeof n.deviceMemory === 'number' && n.deviceMemory < 4) || !!(n.connection && n.connection.saveData); };
  // Mạng đo lưu lượng (di động / 2G-3G / Save-Data) → không tải mô hình
  const metered = () => { const c = nav().connection; return !!(c && (c.saveData || c.type === 'cellular' || /(^|-)?(2g|3g)$/.test(c.effectiveType || ''))); };
  let override = null; // AILocal.setEnabled(bool) – ưu tiên hơn cài đặt (dùng trong kiểm thử / trang cài đặt)
  const enabled = () => { if (override != null) return override; try { const s = g.App && g.App.state && g.App.state.settings; return !s || s.aiLocal !== false; } catch (e) { return true; } };

  // ---- Nhánh app gốc: plugin LexAI (mobile/android/.../LexAIPlugin.kt, mobile/ios/App/App/LexAIPlugin.swift) ----
  const nat = () => { try { const C = g.Capacitor; return C && typeof C.isNativePlatform === 'function' && C.isNativePlatform() && C.Plugins && C.Plugins.LexAI || null; } catch (e) { return null; } };
  // Tải mô hình trong app gốc: chỉ khi nơi gọi cho phép + người dùng vừa bấm; plugin tự chặn mạng di động (wifiOnly mặc định)
  const natDl = o => { const act = nav().userActivation; return !!(o && o.allowDownload) && !(act && !act.isActive); };
  // Gọi plugin: undefined = không ở app gốc (dùng nhánh trình duyệt); null = plugin báo không dùng được / lỗi / quá giờ
  async function ncall(m, args, o = {}) {
    const P = nat(); if (!P || typeof P[m] !== 'function') return undefined;
    if (!enabled()) return null;
    try { const r = await withTimeout(P[m](Object.assign({ timeout: o.timeout || TIMEOUT }, args)), (o.timeout || TIMEOUT) + 1500, o.signal); return r && !r.unavailable ? r : null; } catch (e) { return null; }
  }
  const txt = r => (r && typeof r.text === 'string' && r.text.trim() ? r.text.trim() : null);
  // Sửa lỗi kiểu Proofreader từ văn bản gốc + bản đã sửa (diff theo từ, LCS) → [{ start, end, fix, type }]
  function corrections(a, b) {
    if (a === b) return [];
    const A = a.split(/(\s+)/), B = b.split(/(\s+)/); if (A.length * B.length > 4e5) return [{ start: 0, end: a.length, fix: b, type: '' }];
    const L = Array.from({ length: A.length + 1 }, () => new Int32Array(B.length + 1));
    for (let i = A.length - 1; i >= 0; i--) for (let j = B.length - 1; j >= 0; j--) L[i][j] = A[i] === B[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
    const out = []; let i = 0, j = 0, off = 0, cur = null;
    const flush = () => { if (cur) { if (!(cur.end === cur.start && !cur.fix.trim()) && cur.fix.trim() !== a.slice(cur.start, cur.end).trim()) out.push(cur); cur = null; } };
    while (i < A.length || j < B.length) {
      if (i < A.length && j < B.length && A[i] === B[j]) { flush(); off += A[i].length; i++; j++; continue; }
      if (!cur) cur = { start: off, end: off, fix: '', type: 'grammar' };
      if (j < B.length && (i >= A.length || L[i][j + 1] >= L[i + 1][j])) { cur.fix += B[j]; j++; } else { off += A[i].length; cur.end = off; i++; }
    }
    flush(); return out;
  }
  let natCapsP = null;
  const natCaps = () => natCapsP || (natCapsP = ncall('caps', {}, { timeout: 5000 }).then(r => { if (!r) natCapsP = null; return r; }));

  const withTimeout = (p, ms, signal) => new Promise((res, rej) => {
    const to = setTimeout(() => rej(new Error('TIMEOUT')), ms || TIMEOUT);
    const ab = () => { clearTimeout(to); rej(new Error('ABORT')); };
    if (signal) { if (signal.aborted) return ab(); signal.addEventListener('abort', ab, { once: true }); }
    Promise.resolve(p).then(v => { clearTimeout(to); res(v); }, e => { clearTimeout(to); rej(e); });
  });

  // Trạng thái theo từng (loại, tùy chọn): 'unavailable' | 'downloadable' | 'downloading' | 'available' – có bộ nhớ đệm 10 phút
  const stCache = new Map();
  async function status(kind, opts) {
    const A = api(kind); if (!A || typeof A.availability !== 'function') return 'unavailable';
    const k = kind + JSON.stringify(opts || {}), c = stCache.get(k);
    if (c && Date.now() - c.at < 6e5) return c.v;
    let v; try { v = await withTimeout(A.availability(opts || {}), 1500); } catch (e) { v = 'unavailable'; }
    if (!['downloadable', 'downloading', 'available'].includes(v)) v = 'unavailable';
    stCache.set(k, { v, at: Date.now() }); return v;
  }
  let capsP = null;
  // Bản đồ khả năng (mặc định, không có tùy chọn ngôn ngữ) – một lần mỗi phiên, không chặn giao diện
  function caps() {
    if (!capsP) capsP = (async () => {
      const out = { enabled: enabled(), lowEnd: lowEnd(), metered: metered() };
      const nc = nat() ? await natCaps() : null;
      await Promise.all(Object.keys(KINDS).map(async k => { out[k] = await status(k, k === 'prompt' ? LM_EN : undefined); }));
      if (nc) { out.native = nc.platform || true; out.metered = out.metered || !!nc.metered; Object.keys(KINDS).forEach(k => { if (nc[k] && nc[k] !== 'unavailable') out[k] = nc[k]; }); }
      return out;
    })().catch(() => ({ enabled: false }));
    return capsP;
  }
  const usable = () => enabled() && !lowEnd();

  // Tạo phiên/đối tượng: chỉ khi 'available'; 'downloadable/downloading' chỉ khi được phép tải (người dùng vừa bấm) – không thì null
  async function make(kind, opts, { allowDownload = false, onProgress = null, timeout } = {}) {
    if (!usable()) return null;
    const A = api(kind); if (!A || typeof A.create !== 'function') return null;
    const st = await status(kind, opts);
    if (st === 'unavailable') return null;
    if (st !== 'available') {
      const act = nav().userActivation;
      if (!allowDownload || metered() || (act && !act.isActive)) return null;
    }
    const o = Object.assign({}, opts || {});
    if (st !== 'available') o.monitor = m => { try { m.addEventListener('downloadprogress', e => { if (onProgress) onProgress(e.loaded); }); } catch (e) { /* bỏ qua */ } };
    try { const s = await withTimeout(A.create(o), st === 'available' ? (timeout || TIMEOUT) : 30 * 6e4); if (st !== 'available') stCache.clear(); return s; } catch (e) { return null; }
  }
  const kill = s => { try { s && s.destroy && s.destroy(); } catch (e) { /* bỏ qua */ } };

  // Kiểm tra JSON theo schema đơn giản (type/required/properties/items/minItems/minimum/maximum/minLength)
  function valid(v, s) {
    if (!s) return true;
    const ty = Array.isArray(v) ? 'array' : v === null ? 'null' : typeof v;
    if (s.type && !(s.type === ty || (s.type === 'integer' && ty === 'number' && Number.isInteger(v)))) return false;
    if (ty === 'number' && ((s.minimum != null && v < s.minimum) || (s.maximum != null && v > s.maximum))) return false;
    if (ty === 'string' && ((s.minLength && v.trim().length < s.minLength) || (s.maxLength && v.length > s.maxLength))) return false;
    if (ty === 'array') { if (s.minItems && v.length < s.minItems) return false; if (s.items && !v.every(x => valid(x, s.items))) return false; }
    if (ty === 'object') { if ((s.required || []).some(k => !(k in v))) return false; for (const k of Object.keys(s.properties || {})) if (k in v && !valid(v[k], s.properties[k])) return false; }
    return true;
  }
  const parseJSON = s => { try { return JSON.parse(String(s).replace(/^[^{[]*/, '').replace(/[^}\]]*$/, '')); } catch (e) { return null; } };

  const LM_EN = { expectedInputs: [{ type: 'text', languages: ['en'] }], expectedOutputs: [{ type: 'text', languages: ['en'] }] };
  const LM_OUT = ['en', 'es', 'ja']; // ngôn ngữ đầu ra Gemini Nano hỗ trợ (docs Chrome) – khác → tự trả null/đầu ra tiếng Anh
  // prompt(text, {system, schema, signal, timeout, lang}) → chuỗi, hoặc đối tượng đã kiểm schema; null nếu không dùng được / sai
  async function prompt(text, o = {}) {
    try {
      if (nat() && text) { // app gốc: không có responseConstraint → dặn trả JSON theo schema rồi kiểm như cũ
        const sys = [o.system, o.schema && 'Respond with only valid JSON (no prose, no code fences) matching this JSON schema: ' + JSON.stringify(o.schema)].filter(Boolean).join('\n\n');
        const r = txt(await ncall('prompt', { text: String(text), system: sys || undefined, maxTokens: o.maxTokens || 512, allowDownload: natDl(o) }, o));
        if (r) {
          if (!o.schema) { if (o.onChunk) try { o.onChunk(r); } catch (e) { /* bỏ qua */ } return r; }
          const j = parseJSON(r); if (j && valid(j, o.schema)) return j;
        }
      }
      const lang = LM_OUT.includes(o.lang) ? o.lang : 'en';
      const opts = { expectedInputs: [{ type: 'text', languages: ['en'] }], expectedOutputs: [{ type: 'text', languages: [lang] }] };
      if (o.system) opts.initialPrompts = [{ role: 'system', content: o.system }];
      const s = await make('prompt', opts, o); if (!s) return null;
      try {
        const po = {}; if (o.schema) po.responseConstraint = o.schema; if (o.signal) po.signal = o.signal;
        let out;
        if (typeof s.promptStreaming === 'function' && o.onChunk) { // luồng: hiện dần, không chờ cả câu
          out = ''; const run = (async () => { for await (const ch of s.promptStreaming(text, po)) { out = ch.startsWith(out) ? ch : out + ch; o.onChunk(out); } return out; })();
          out = await withTimeout(run, o.timeout, o.signal);
        } else out = await withTimeout(s.prompt(text, po), o.timeout, o.signal);
        if (!out || !String(out).trim()) return null;
        if (!o.schema) return String(out).trim();
        const j = parseJSON(out); return j && valid(j, o.schema) ? j : null;
      } finally { kill(s); }
    } catch (e) { return null; }
  }

  const trCache = new Map();
  async function translate(text, from, to, o = {}) {
    try {
      if (!text || !from || !to || from === to) return null;
      if (nat()) { const r = txt(await ncall('translate', { text: String(text), from, to, allowDownload: natDl(o), wifiOnly: o.wifiOnly !== false }, o)); if (r) return r; }
      const k = from + '>' + to;
      if (!trCache.has(k)) trCache.set(k, make('translate', { sourceLanguage: from, targetLanguage: to }, o).then(x => { if (!x) trCache.delete(k); return x; }));
      const tr = await trCache.get(k); if (!tr) return null;
      const out = await withTimeout(tr.translate(text), o.timeout, o.signal);
      return out && String(out).trim() ? String(out).trim() : null;
    } catch (e) { return null; }
  }
  let detP = null;
  // detect(text) → { lang, confidence } hoặc null
  async function detect(text, o = {}) {
    try {
      if (!text || !String(text).trim()) return null;
      if (nat()) { const r = await ncall('detect', { text: String(text) }, o); if (r && r.lang && r.lang !== 'und') return { lang: r.lang, confidence: +r.confidence || 0 }; }
      if (!detP) detP = make('detect', undefined, o).then(x => { if (!x) detP = null; return x; });
      const d = await detP; if (!d) return null;
      const r = await withTimeout(d.detect(String(text)), o.timeout, o.signal);
      const top = (r || [])[0]; return top && top.detectedLanguage && top.detectedLanguage !== 'und' ? { lang: top.detectedLanguage, confidence: top.confidence || 0 } : null;
    } catch (e) { return null; }
  }
  // proofread(text) → { corrected, corrections: [{ start, end, fix, type }] } hoặc null
  async function proofread(text, o = {}) {
    if (nat() && text) {
      const r = await ncall('proofread', { text: String(text), allowDownload: natDl(o) }, o);
      if (r && typeof r.corrected === 'string' && r.corrected.trim()) return { corrected: r.corrected, corrections: corrections(String(text), r.corrected) };
    }
    const s = await make('proofread', { expectedInputLanguages: ['en'] }, o); if (!s) return null;
    try {
      const r = await withTimeout(s.proofread(text), o.timeout, o.signal);
      if (!r || typeof r.correctedInput !== 'string') return null;
      return { corrected: r.correctedInput, corrections: (r.corrections || []).map(c => ({ start: c.startIndex, end: c.endIndex, fix: c.correction, type: (c.types || [c.type]).filter(Boolean)[0] || '' })) };
    } catch (e) { return null; } finally { kill(s); }
  }
  async function simple(kind, method, text, opts, o) {
    const s = await make(kind, opts, o); if (!s) return null;
    try { const out = await withTimeout(s[method](text, o.context ? { context: o.context } : undefined), o.timeout, o.signal); return out && String(out).trim() ? String(out).trim() : null; } catch (e) { return null; } finally { kill(s); }
  }
  const pick = (o, keys) => { const r = {}; keys.forEach(k => { if (o[k] != null) r[k] = o[k]; }); return r; };
  // App gốc: summarize → plugin (Android Summarization API cần > 400 ký tự, ngắn hơn/thiếu → Prompt); rewrite/write → Prompt với chỉ dẫn
  const natStyle = o => ['tone', 'format', 'length'].filter(k => o[k]).map(k => k + ': ' + o[k]).join(', ') + (o.sharedContext ? '. Context: ' + o.sharedContext : '') + (o.context ? '. ' + o.context : '');
  async function natGen(kind, text, o) {
    if (!nat() || !text) return null;
    if (kind === 'summarize') { const r = txt(await ncall('summarize', { text: String(text), allowDownload: natDl(o) }, o)); if (r) return r; }
    const sys = { summarize: 'Summarize the text in English, short and clear. Output only the summary.', rewrite: 'Rewrite the text keeping its meaning. Output only the rewritten text.', write: 'Write the requested English text. Output only that text.' }[kind] + (natStyle(o) ? ' Style: ' + natStyle(o) + '.' : '');
    return txt(await ncall('prompt', { text: String(text), system: sys, maxTokens: 600, allowDownload: natDl(o) }, o));
  }
  const gen2 = (kind, keys) => async (text, o = {}) => (await natGen(kind, text, o)) || simple(kind, kind, text, pick(o, keys), o);
  const summarize = gen2('summarize', ['type', 'format', 'length', 'sharedContext']);
  const rewrite = gen2('rewrite', ['tone', 'format', 'length', 'sharedContext']);
  const write = gen2('write', ['tone', 'format', 'length', 'sharedContext']);

  // Kiểm chất lượng văn bản sinh ra: độ dài + đúng ngôn ngữ (nếu dò được) – sai → null để nơi gọi dùng máy chủ
  async function check(text, { min = 1, max = 4000, lang } = {}) {
    const s = String(text || '').trim();
    if (s.length < min || s.length > max) return false;
    if (lang && s.length >= 20) { const d = await detect(s); if (d && d.confidence > 0.6 && d.lang.split('-')[0] !== lang) return false; }
    return true;
  }

  // Người dùng bấm "Tải" (đã thấy dung lượng + gợi ý Wi-Fi): tải mô hình, có tiến độ; Chrome tự tải tiếp nếu bị ngắt
  async function download(kind = 'prompt', { onProgress, opts, from, to, wifiOnly } = {}) {
    if (nat()) { // app gốc: plugin tải (Android AICore/ML Kit, mặc định chỉ Wi-Fi; iOS: gói dịch qua hộp thoại hệ thống)
      const r = await ncall('download', { kind, from: from || (opts && opts.sourceLanguage), to: to || (opts && opts.targetLanguage), wifiOnly: wifiOnly !== false }, { timeout: 30 * 6e4 });
      capsP = null; natCapsP = null; if (r && r.ok) return true;
    }
    if (metered()) return false;
    const s = await make(kind, opts || (kind === 'prompt' ? LM_EN : undefined), { allowDownload: true, onProgress });
    if (!s) return false;
    if (kind !== 'translate' && kind !== 'detect') kill(s);
    capsP = null; return true;
  }

  g.AILocal = { native: () => !!nat(), corrections, caps, status, prompt, translate, detect, proofread, summarize, rewrite, write, check, download, valid,
    size: k => SIZE[k] || '', usable, metered, lowEnd, setEnabled: v => { override = v == null ? null : !!v; capsP = null; }, _reset: () => { stCache.clear(); trCache.clear(); detP = null; capsP = null; natCapsP = null; override = null; } };
})(typeof window !== 'undefined' ? window : globalThis);
