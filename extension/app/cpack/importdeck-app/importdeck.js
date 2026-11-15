/* 📥 Nhập tài liệu → bộ thẻ FSRS riêng (docs/specs/import-to-deck.md #5, lát M1: dán chữ · .txt · .srt/.vtt · ePub · PDF).
 * Tải lười (App.need('impdeck')), cờ `importdeck` mặc định TẮT. Đọc HẾT trên máy: không tải tệp/văn bản lên máy chủ, không lưu bản gốc – chỉ thẻ + câu gốc ≤ 25 từ + tên nguồn.
 * Lõi (ImportDeckKit) thuần JS, kiểm thử bằng scripts/test/importdeck.mjs. Giao diện (ImportDeck) 4 bước: Nguồn → Chọn từ → Nghĩa → Tạo bộ.
 * Lát 2: dán liên kết bài viết (POST /api/readable, functions/api/readable.js – máy chủ tải trang, chống SSRF) và nút "Điền nghĩa bằng AI" (api/ai.js kind 'import',
 * quota `import`: theo lô ≤ 20 từ, chỉ gửi từ + câu gốc, nhớ kết quả, người học tự bấm, thẻ đánh dấu aimean). Hết lượt/lỗi → im lặng giữ "chưa có nghĩa". */
(function (g) {
  'use strict';
  const MAX_BYTES = 20 * 1048576, MAX_PAGES = 200, BATCH = 50, MAX_WORDS = 25, PRESELECT = 30, TOP_DROP = 1000, CAND = 300, MAX_TEXT = 4e6;
  const PDF_CDN = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/', PDF_SRI = { 'pdf.min.js': 'sha384-/1qUCSGwTur9vjf/z9lmu/eCUYbpOTgSjmpbMQZ1/CtX2v/WcAIKqRv+U1DUCG6e', 'pdf.worker.min.js': 'sha384-SnzOobpRMLXZ52iJvZm/C0fYw0OQemTXzTjIsdsfMcrCtCEe9qgzxTd3RSklO5x2' };
  const err = c => Object.assign(new Error(c), { code: c });
  const tick = () => new Promise(r => setTimeout(r, 0));

  // ================= Lõi =================
  let rankMap = null;
  const ranks = () => { if (rankMap) return rankMap; rankMap = new Map(); String(g.LK_FREQ || '').split(' ').forEach((w, i) => { if (w && !rankMap.has(w)) rankMap.set(w, i + 1); }); return rankMap; };

  // Phụ đề .srt/.vtt → chữ thuần: bỏ số thứ tự, mốc giờ, thẻ <i>/{\an8}, khối NOTE/STYLE, dòng lặp liên tiếp (VTT cuộn)
  function parseSubs(raw) {
    const out = []; let skip = false, last = '';
    for (let line of String(raw).replace(/^﻿/, '').split(/\r?\n/)) {
      line = line.trim();
      if (!line) { skip = false; continue; }
      if (/^WEBVTT/.test(line) || /^(NOTE|STYLE|REGION)\b/.test(line)) { skip = true; continue; }
      if (skip || /^\d+$/.test(line) || /-->/.test(line)) continue;
      line = line.replace(/<[^>]*>|\{\\[^}]*\}/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/^[-–]\s+/, '').replace(/\s+/g, ' ').trim();
      if (!line || line === last) continue;
      out.push(line); last = line;
    }
    return out.join(' ');
  }
  // ePub: container.xml → OPF → spine → XHTML từng chương (async generator-lite: gọi each(text, i, n))
  async function epubEach(file, each, { isCancelled = () => false } = {}) {
    const K = g.AnkiKit; if (!K || !K.zipOpen) throw err('browser');
    const z = await K.zipOpen(file), td = new TextDecoder(), txt = async n => td.decode(await z.get(n));
    if (!z.has('META-INF/container.xml')) throw err('epub');
    const root = (/full-path\s*=\s*["']([^"']+)["']/.exec(await txt('META-INF/container.xml')) || [])[1];
    if (!root || !z.has(root)) throw err('epub');
    const opf = await txt(root), dir = root.includes('/') ? root.slice(0, root.lastIndexOf('/') + 1) : '';
    const man = {}; for (const m of opf.matchAll(/<item\b[^>]*>/g)) { const id = /\bid\s*=\s*["']([^"']+)/.exec(m[0]), hr = /\bhref\s*=\s*["']([^"']+)/.exec(m[0]); if (id && hr) man[id[1]] = hr[1]; }
    const spine = [...opf.matchAll(/<itemref\b[^>]*\bidref\s*=\s*["']([^"']+)/g)].map(m => man[m[1]]).filter(Boolean);
    const path = h => { const p = (dir + decodeURIComponent(h.split('#')[0])).split('/'), o = []; for (const s of p) { if (s === '..') o.pop(); else if (s !== '.') o.push(s); } return o.join('/'); };
    for (let i = 0; i < spine.length; i++) {
      if (isCancelled()) throw err('cancel');
      const p = path(spine[i]); if (!z.has(p)) continue;
      // tự rút chữ (htmlToText của Anki cắt ở 20 000 ký tự – chương sách dài hơn): ranh giới khối = đoạn mới, tiêu đề không dính vào câu sau
      const h = (await txt(p)).replace(/<(script|style|head|svg)\b[\s\S]*?<\/\1\s*>|<!--[\s\S]*?-->/gi, ' ').replace(/<\/(p|div|h\d|li|tr|blockquote|section|title)\s*>|<br\s*\/?>/gi, '\n\n').replace(/<[^>]*>/g, '');
      await each(K.decodeEntities(h).replace(/[ \t\r\f\v\u00A0]+/g, ' ').replace(/ ?\n ?/g, '\n'), i, spine.length);
      await tick();
    }
    return spine.length;
  }

  // Tách câu: dấu . ! ? … rồi chữ hoa/ngoặc; ngắt đoạn (dòng trống) luôn là ranh giới
  const splitSent = t => String(t).split(/\n{2,}/).flatMap(p => p.replace(/\s+/g, ' ').split(/(?<!\b(?:Mr|Mrs|Ms|Dr|Prof|St|Jr|Sr|vs|Mt|Gen|Col|Lt)\.)(?<=[.!?…]["”’')\]]?)\s+(?=["“‘'(\[]?[A-Z0-9])/)).map(s => s.trim()).filter(Boolean);
  const TOK = /[A-Za-z][A-Za-z'’-]*[A-Za-z]|[A-Za-z]/g;
  const norm = w => w.toLowerCase().replace(/’/g, "'").replace(/'s$/, '').replace(/^-+|-+$/g, '');
  // Dạng gốc có thể của một từ biến cách (để tra hạng/đã biết); không cần chính xác 100% – chỉ để lọc
  function forms(w) {
    const o = [w], n = w.length;
    if (n > 4 && w.endsWith('ies')) o.push(w.slice(0, -3) + 'y');
    if (n > 4 && w.endsWith('ied')) o.push(w.slice(0, -3) + 'y');
    if (n > 3 && w.endsWith('es')) o.push(w.slice(0, -2));
    if (n > 3 && w.endsWith('s') && !w.endsWith('ss')) o.push(w.slice(0, -1));
    if (n > 3 && w.endsWith('ed')) { o.push(w.slice(0, -2), w.slice(0, -1)); if (/(.)\1$/.test(w.slice(0, -2))) o.push(w.slice(0, -3)); }
    if (n > 4 && w.endsWith('ing')) { o.push(w.slice(0, -3), w.slice(0, -3) + 'e'); if (/(.)\1$/.test(w.slice(0, -3))) o.push(w.slice(0, -4)); }
    if (n > 4 && w.endsWith('ly')) o.push(w.slice(0, -2));
    if (n > 5 && w.endsWith('er')) o.push(w.slice(0, -2));
    return o;
  }
  const IRR = Object.fromEntries('said say made make went go came come took take got get saw see knew know thought think told tell found find gave give felt feel kept keep began begin held hold brought bring stood stand heard hear ran run wrote write sat sit men man women woman children child people person left leave led lead lost lose paid pay met meet sent send spent spend built build'.split(' ').reduce((a, w, i, r) => (i % 2 ? (a.push([r[i - 1], w]), a) : a), [])); // bất quy tắc phổ biến → dạng gốc
  const rankOf = w => { let b = 0; const R = ranks(); for (const f of forms(IRR[w] || w)) { const r = R.get(f); if (r && (!b || r < b)) b = r; } return b; };
  const lvIdx = l => { const m = /([ABC][12])/i.exec(String(l || '')); return m ? ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].indexOf(m[1].toUpperCase()) : -1; };

  // Bộ đếm tăng dần (nạp từng mẻ chữ – PDF 200 trang/ePub dày không giữ cả văn bản): chỉ nhớ đếm + 1 câu gốc ≤ 25 từ cho mỗi từ ứng viên
  function createMiner({ known = new Set() } = {}) {
    const m = new Map(); let tail = '', sentences = 0, tokens = 0;
    const take = (s, isLast) => {
      sentences++;
      const clean = s.replace(/\b\w*\d\w*\b/g, ' '), nw = (s.match(/\S+/g) || []).length; let first = true, mt;
      TOK.lastIndex = 0;
      while ((mt = TOK.exec(clean))) {
        const raw = mt[0], w = norm(raw); const start = first; first = false;
        if (w.length < 3 || w.length > 24 || !/[a-z]/.test(w)) continue;
        tokens++;
        if (known.has(w)) continue;
        const r = rankOf(w); if (r && r <= TOP_DROP) continue;
        let e = m.get(w); if (!e) { e = { n: 0, cap: 0, low: 0, sent: '', sw: 1e9, rank: r }; m.set(w, e); }
        e.n++;
        if (raw === raw.toLowerCase()) e.low++; else if (!start || raw === raw.toUpperCase()) e.cap++; // viết hoa giữa câu (hoặc TOÀN HOA) = tên riêng/viết tắt, trừ chữ đầu câu
        const fit = nw <= MAX_WORDS ? Math.abs(nw - 14) : 1000 + nw; // câu ngắn gọn nhất quán: ưu tiên ~14 từ, không quá 25
        if (fit < e.sw) { e.sw = fit; e.sent = nw <= MAX_WORDS ? s : window25(s, mt.index, nw); }
      }
    };
    return {
      feed(text) {
        if (!text) return;
        const parts = splitSent(tail + ' ' + text); tail = parts.pop() || '';
        if (tail.length > 600) { parts.push(tail); tail = ''; }
        for (const s of parts) take(s);
      },
      stats: () => ({ sentences, tokens, words: m.size }),
      result() { // → ứng viên đã lọc tên riêng, xếp theo tần suất trong văn bản × độ hiếm
        if (tail) { take(tail); tail = ''; }
        const out = [];
        for (const [w, e] of m) {
          if (!e.low && e.cap) continue; // chưa từng thấy viết thường → tên riêng/viết tắt
          if (e.cap > e.low * 2 && e.n > 1) continue;
          const rar = Math.log(2 + (e.rank || 3000)) / Math.log(3000);
          out.push({ word: w, n: e.n, rank: e.rank, sentence: e.sent, score: (1 + Math.log(e.n)) * rar * (e.rank ? 1 : e.n > 1 ? 1.1 : 0.9) });
        }
        return out.sort((a, b) => b.score - a.score || a.word.localeCompare(b.word));
      },
    };
  }
  function window25(s, at, nw) { // câu quá dài → cắt cửa sổ ≤ 25 từ quanh từ đích
    const toks = s.split(/\s+/); let pos = 0, idx = 0;
    for (let i = 0; i < toks.length; i++) { if (pos + toks[i].length >= at) { idx = i; break; } pos += toks[i].length + 1; }
    const a = Math.max(0, Math.min(idx - 12, toks.length - MAX_WORDS)), part = toks.slice(a, a + MAX_WORDS).join(' ');
    return (a > 0 ? '… ' : '') + part + (a + MAX_WORDS < toks.length ? ' …' : '');
  }

  // Tra từ điển có sẵn (0 chi phí): gộp các dạng biến cách về từ gốc, bỏ từ đã biết/top-1000 sau khi biết gốc, ưu tiên từ có nghĩa + trình độ cao.
  // lookup(word) → { word, meaning, entry, level } | null (do giao diện cấp từ Lex; kiểm thử truyền giả)
  async function enrich(list, { lookup, known = new Set(), limit = CAND, onProgress, isCancelled = () => false } = {}) {
    const top = list.slice(0, limit), merged = new Map();
    for (let i = 0; i < top.length; i += 10) {
      if (isCancelled()) throw err('cancel');
      const res = await Promise.all(top.slice(i, i + 10).map(c => (lookup ? Promise.resolve(lookup(c.word)).catch(() => null) : null)));
      res.forEach((r, k) => {
        const c = top[i + k], base = r && r.word ? norm(String(r.word)) : c.word;
        if (known.has(base)) return;
        const rk = rankOf(base); if (rk && rk <= TOP_DROP) return;
        const cur = merged.get(base);
        if (cur) { cur.n += c.n; if (c.sentence && c.sentence.length < (cur.sentence || 'x'.repeat(999)).length) cur.sentence = c.sentence; return; }
        merged.set(base, { word: base, n: c.n, rank: rk || c.rank, sentence: c.sentence, meaning: (r && r.meaning) || '', entry: (r && r.entry) || null, level: r ? lvIdx(r.level) : -1 });
      });
      if (onProgress) onProgress(Math.min(1, (i + 10) / top.length));
      await tick();
    }
    const out = [...merged.values()];
    for (const c of out) {
      const rar = Math.log(2 + (c.rank || 3000)) / Math.log(3000);
      c.score = (1 + Math.log(c.n)) * rar * (1 + 0.06 * Math.max(0, c.level)) * (c.meaning || c.rank || c.n > 1 ? 1 : 0.4); // chữ lạ chỉ thấy 1 lần, không có trong từ điển → nhiều khả năng lỗi OCR/chính tả
    }
    return out.sort((a, b) => b.score - a.score || a.word.localeCompare(b.word));
  }
  const preselect = (list, n = PRESELECT) => new Set(list.slice(0, n).map(c => c.word));
  const deckName = name => String(name || '').replace(/\.[^.\\/]+$/, '').replace(/[_]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60);

  // Thẻ FSRS từ ứng viên đã chọn. C = Core.Cards; existing = thẻ hiện có (không ghi đè)
  function makeCards(C, picked, { deck, source = '', now = Date.now(), vi = true } = {}) {
    const out = [];
    picked.forEach((c, i) => {
      const e = c.entry ? { ...c.entry } : { word: c.word, pos: '' };
      e.word = e.word || c.word; e.topic = 'import'; e.emoji = e.emoji || '📥';
      if (vi) { if (!e.vi && c.meaning) e.vi = c.meaning; } else if (!e.def && c.meaning) e.def = c.meaning;
      const card = C.make(e, { deck, added: now - picked.length + i });
      if (c.sentence) { card.ex = c.sentence; card.contexts = [{ text: c.sentence, source: '', title: source, at: now }]; }
      if (c.ai && c.meaning) card.aimean = 1; // nghĩa do AI gợi ý (không phải từ điển) – hiện nhãn "AI gợi ý"
      if (!c.meaning && !(card.vi || card.def)) card.nomean = 1; // "chưa có nghĩa" – điền sau
      out.push(card);
    });
    return out;
  }

  // Liên kết bài viết → { title, text, host } qua /api/readable. Lỗi: { code: badurl|blocked|type|toobig|empty|dns|fetch|net|quota (+ .q) }
  const LINK_ERR = { badurl: 1, blocked: 1, type: 1, toobig: 1, empty: 1, dns: 1, fetch: 1 };
  async function fetchLink(url, { fetch: f = g.fetch && g.fetch.bind(g), base = '', headers = {}, timeout = 20000 } = {}) {
    url = String(url || '').trim(); if (!/^https?:\/\/[^\s]{4,2000}$/i.test(url)) throw err('badurl');
    if (g.navigator && g.navigator.onLine === false) throw err('net');
    let r; try { r = await f(base + '/api/readable', { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify({ url }), signal: AbortSignal.timeout(timeout) }); } catch (e) { throw err('net'); }
    const j = await r.json().catch(() => ({}));
    if (r.status === 429) throw Object.assign(err('quota'), { q: j });
    if (!r.ok || !j || typeof j.text !== 'string') throw err(LINK_ERR[j && j.error] ? j.error : 'fetch');
    return { title: String(j.title || ''), text: j.text, host: String(j.host || '') };
  }

  // AI điền nghĩa ngắn cho từ thiếu nghĩa. call(sys, prompt, n) → đối tượng { m: { từ: nghĩa } } (giao diện nối /api/ai kind 'import'); ném lỗi { code:'quota' } khi hết lượt.
  // Theo lô ≤ 20 từ/lời gọi, chỉ gửi từ + câu gốc (≤ 200 ký tự), nhớ theo từ+ngôn ngữ (cache: đối tượng thường), hết lượt/lỗi → dừng im lặng (từ giữ "chưa có nghĩa").
  const AI_BATCH = 20;
  const aiSys = lang => `You write very short dictionary glosses for language learners. Input: a JSON array of {"w": word, "s": the sentence it appears in}. For each word give the meaning that fits its sentence: at most 8 words, written in ${lang}. Reply with ONE JSON object {"m":{"<word>":"<gloss>"}} using exactly the input words as keys. Leave out any word you are not sure about.`;
  const cleanGloss = v => typeof v === 'string' ? v.replace(/[<>\r\n]+/g, ' ').replace(/\s+/g, ' ').trim().replace(/^["“'‘]+|["”'’.]+$/g, '').slice(0, 80) : '';
  async function aiFill(list, { call, lang = 'Vietnamese', cache = {}, isCancelled = () => false, onProgress } = {}) {
    const need = list.filter(c => !c.meaning); let filled = 0, stop = '';
    const hit = []; for (const c of need) { const v = cache[c.word + '|' + lang]; if (v) { c.meaning = v; c.ai = 1; filled++; } else hit.push(c); }
    for (let i = 0; i < hit.length && !stop; i += AI_BATCH) {
      if (isCancelled()) break;
      const b = hit.slice(i, i + AI_BATCH);
      try {
        const out = await call(aiSys(lang), 'Give a short meaning for each word.\n' + JSON.stringify(b.map(c => ({ w: c.word, s: String(c.sentence || '').slice(0, 200) }))), b.length), m = out && typeof out.m === 'object' && out.m ? out.m : {};
        for (const c of b) { const v = cleanGloss(m[c.word]); if (v) { c.meaning = v; c.ai = 1; cache[c.word + '|' + lang] = v; filled++; } }
      } catch (e) { stop = e && e.code === 'quota' ? 'quota' : 'fail'; }
      if (onProgress) onProgress(Math.min(1, (i + AI_BATCH) / hit.length));
    }
    return { filled, stop, missing: need.length - filled };
  }

  // PDF: pdf.js tải lười từ CDN (SRI), worker qua blob (CSP worker-src 'self' blob:), đọc từng trang, nhả luồng chính mỗi mẻ 50 trang, hủy được
  let pdfP = null;
  function loadPdfJs() {
    if (g.pdfjsLib) return Promise.resolve(g.pdfjsLib);
    return pdfP || (pdfP = new Promise((res, rej) => {
      const s = document.createElement('script'); s.src = PDF_CDN + 'pdf.min.js'; s.integrity = PDF_SRI['pdf.min.js']; s.crossOrigin = 'anonymous';
      s.onload = () => res(g.pdfjsLib); s.onerror = () => { pdfP = null; rej(err('net')); };
      document.head.appendChild(s);
    }).then(async L => {
      const r = await fetch(PDF_CDN + 'pdf.worker.min.js', { integrity: PDF_SRI['pdf.worker.min.js'] });
      if (!r.ok) throw err('net');
      L.GlobalWorkerOptions.workerSrc = URL.createObjectURL(new Blob([await r.text()], { type: 'text/javascript' }));
      return L;
    }).catch(e => { pdfP = null; throw e.code ? e : err('net'); }));
  }
  async function pdfEach(file, each, { isCancelled = () => false, loader = loadPdfJs } = {}) {
    const L = await loader();
    const doc = await L.getDocument({ data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false, disableFontFace: true }).promise;
    try {
      const n = Math.min(doc.numPages, MAX_PAGES);
      for (let p = 1; p <= n; p++) {
        if (isCancelled()) throw err('cancel');
        const page = await doc.getPage(p), tc = await page.getTextContent();
        await each(tc.items.map(it => (it.str || '') + (it.hasEOL ? '\n' : ' ')).join('').replace(/-\n(?=[a-z])/g, '').replace(/[ \t]+\n/g, '\n'), p - 1, n, doc.numPages);
        page.cleanup();
        if (p % BATCH === 0) await tick(); // mẻ 50 trang: nhường luồng chính
      }
      return doc.numPages;
    } finally { try { doc.destroy(); } catch (e) { /* bỏ qua */ } }
  }

  // Đọc 1 nguồn (tệp hoặc chữ dán) vào miner. Trả { kind, units }
  async function readSource(src, miner, { onProgress = () => {}, isCancelled = () => false, loader } = {}) {
    const feed = t => { miner.feed(t); };
    if (typeof src === 'string') { if (src.length > MAX_TEXT) throw err('toobig'); feed(src); return { kind: 'text' }; }
    if (src.size > MAX_BYTES) throw err('toobig');
    const name = String(src.name || '').toLowerCase(), head = new Uint8Array(await src.slice(0, 5).arrayBuffer()), isZip = head[0] === 0x50 && head[1] === 0x4B, isPdf = head[0] === 0x25 && head[1] === 0x50 && head[2] === 0x44 && head[3] === 0x46;
    if (isPdf || name.endsWith('.pdf')) {
      if (!isPdf) throw err('type');
      let total = 0; await pdfEach(src, (t, i, n, all) => { total = all; feed(t); onProgress((i + 1) / n); }, { isCancelled, loader }); return { kind: 'pdf', pages: total };
    }
    if (isZip || name.endsWith('.epub')) { if (!isZip) throw err('type'); await epubEach(src, (t, i, n) => { feed(t); onProgress((i + 1) / n); }, { isCancelled }); return { kind: 'epub' }; }
    if (/\.(srt|vtt|txt|text|md)$/.test(name) || (src.type || '').startsWith('text/')) {
      if (src.size > MAX_TEXT) throw err('toobig');
      const raw = await src.text(); feed(/\.(srt|vtt)$/.test(name) || /-->/.test(raw.slice(0, 4000)) ? parseSubs(raw) : raw); onProgress(1); return { kind: /\.(srt|vtt)$/.test(name) ? 'subs' : 'text' };
    }
    throw err('type');
  }

  const Kit = { parseSubs, epubEach, pdfEach, splitSent, forms, rankOf, createMiner, enrich, preselect, deckName, makeCards, readSource, loadPdfJs, fetchLink, aiFill, AI_BATCH, MAX_BYTES, MAX_PAGES, PRESELECT };
  g.ImportDeckKit = Kit;
  if (typeof module !== 'undefined' && module.exports) module.exports = Kit;
  if (typeof document === 'undefined' || !g.UI) return;

  // ================= Giao diện =================
  const { $, $$, esc, toast, modal } = g.UI;
  const T = (k, v) => g.t(k, v);
  const isExt = () => !!(g.Core && g.Core.Store && g.Core.Store.isExtension);
  const kit = (m, s) => g.Kit && typeof g.Kit.svg === 'function' ? g.Kit.svg(m, s, true) : '';
  const css = () => {
    if (document.getElementById('id-css')) return;
    const st = document.createElement('style'); st.id = 'id-css';
    st.textContent = `.idk{display:grid;gap:.9rem}.idk h2{margin:0;font-size:1.25rem}.idk-step{font-size:.8rem;font-weight:800;color:var(--muted);display:flex;gap:.3rem;align-items:center}.idk-dots{display:flex;gap:.25rem}.idk-dots i{width:22px;height:5px;border-radius:9px;background:var(--line)}.idk-dots i.on{background:var(--accent)}
.idk-drop{display:grid;place-items:center;gap:.3rem;text-align:center;padding:1.4rem 1rem;min-height:44px;border:2px dashed var(--line);border-radius:18px;background:var(--surface-2);cursor:pointer;width:100%;font:inherit;color:var(--text)}.idk-drop:hover,.idk-drop.on{border-color:var(--accent)}
.idk textarea{width:100%;min-height:96px;resize:vertical}.idk-list{display:grid;gap:.35rem;max-height:46vh;overflow:auto;padding:0;margin:0;list-style:none}
.idk-row{display:flex;gap:.6rem;align-items:flex-start;padding:.55rem .7rem;min-height:44px;border:1.5px solid var(--line);border-radius:14px;cursor:pointer;background:var(--surface)}.idk-row:has(input:checked){border-color:var(--accent);background:var(--accent-soft)}.idk-row input{width:22px;height:22px;margin-top:.1rem;flex:none}
.idk-row b{font-size:1rem}.idk-row .s{display:block;font-size:.82rem;color:var(--muted);overflow-wrap:anywhere}.idk-n{font-size:.72rem;font-weight:800;color:var(--accent-text);background:var(--accent-soft);border-radius:99px;padding:.05rem .5rem;margin-left:.35rem}
.idk-no{font-size:.72rem;font-weight:800;color:var(--again-text,#8a2a14);background:var(--again-soft,#ffe6df);border-radius:99px;padding:.05rem .5rem;margin-left:.35rem}
.idk-err{background:var(--again-soft);color:var(--again-text);border-radius:12px;padding:.6rem .75rem}.idk-note{font-size:.82rem;color:var(--muted);background:var(--surface-2);border-radius:12px;padding:.6rem .75rem}
.idk-prev{display:grid;gap:.5rem}.idk-card{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:.6rem .8rem}.idk-card .w{font-weight:800}.idk-card .x{font-size:.82rem;color:var(--muted)}
.idk-link{display:flex;gap:.5rem}.idk-link input{flex:1;min-width:0}.idk-ai{font-size:.72rem;font-weight:800;color:var(--accent-text);border:1px solid var(--accent);border-radius:99px;padding:.05rem .5rem;margin-left:.35rem}
.idk .row.end{justify-content:flex-end}.idk .btn{min-height:44px}.idk-done{text-align:center;display:grid;gap:.6rem;justify-items:center}@media (max-width:480px){.idk .row.end .btn{flex:1}}`;
    document.head.appendChild(st);
  };
  const ERRS = () => ({ toobig: T('Tệp quá lớn (tối đa 20 MB, 200 trang).'), type: T('Chưa đọc được loại tệp này.'), epub: T('Chưa đọc được loại tệp này.'), net: T('Không tải được – thử lại sau'), browser: T('Trình duyệt chưa hỗ trợ – hãy cập nhật trình duyệt') });
  const linkMsg = e => e.code === 'quota' ? ((g.UI.quotaText && g.UI.quotaText(e.q || {})) || T('Không tải được – thử lại sau')) : e.code === 'net' ? T('Không tải được – thử lại sau') : e.code === 'badurl' || e.code === 'blocked' ? T('Liên kết không hợp lệ hoặc không được phép.') : e.code === 'toobig' ? T('Bài viết quá lớn (tối đa 1 MB).') : T('Không đọc được bài từ liên kết này.');
  const apiBase = () => /(^|\.)lexkite\.(com|pages\.dev)$/.test(location.hostname) ? '' : 'https://lexkite.com';
  const apiHeaders = async () => { const h = { 'X-Lexkite-Device': g.UI.dev ? g.UI.dev() : '' }; try { if (g.Sync && Sync.user) h.Authorization = 'Bearer ' + await Sync.user.getIdToken(); } catch (e) { /* khách */ } return h; };
  const MEAN_KEY = 'lk.impmean';
  const meanCache = () => { try { return JSON.parse(localStorage.getItem(MEAN_KEY) || '{}') || {}; } catch (e) { return {}; } };
  const saveMeanCache = c => { try { const k = Object.keys(c); if (k.length > 400) for (const x of k.slice(0, k.length - 400)) delete c[x]; localStorage.setItem(MEAN_KEY, JSON.stringify(c)); } catch (e) { /* bỏ qua */ } };
  const aiCall = async (sys, prompt, n) => { // → /api/ai kind 'import' (AI miễn phí, quota `import`); 429 → { code:'quota' }
    let r; try { r = await fetch(apiBase() + '/api/ai', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(await apiHeaders()) }, body: JSON.stringify({ kind: 'import', n, sys, prompt }), signal: AbortSignal.timeout(60000) }); } catch (e) { throw err('net'); }
    const j = await r.json().catch(() => ({}));
    if (r.status === 429) throw Object.assign(err('quota'), { q: j });
    if (!r.ok || !j.out) throw err('fail');
    return j.out;
  };

  let S = null;
  const root = () => document.getElementById('idRoot');
  const isOpen = () => { const m = document.getElementById('modal'); return !!root() && !(m && m.hidden); };
  const dots = n => `<div class="idk-step" aria-label="${n}/4"><span class="idk-dots" aria-hidden="true">${[1, 2, 3, 4].map(i => `<i class="${i <= n ? 'on' : ''}"></i>`).join('')}</span><span>${n}/4</span></div>`;
  const known = () => { const s = new Set(); for (const c of Object.values((g.App && App.state && App.state.cards) || {})) { s.add(String(c.word).toLowerCase()); } return s; };
  const lookup = async w => {
    if (!g.Lex) return null;
    const r = await g.Lex.get(w).catch(() => null); if (!r || !r.entry) return null;
    return { word: r.entry.word || r.key || w, entry: r.entry, level: r.entry.level || '', meaning: (g.App && App.meanOf ? App.meanOf(r.entry) : r.entry.vi || r.entry.def) || '' };
  };

  async function open() {
    css();
    S = { step: 1, picked: new Set(), shown: 100, err: null, cancel: false, busy: false };
    modal('<div class="idk" id="idRoot"></div>').setAttribute('aria-labelledby', 'idTitle');
    draw();
  }
  function draw() {
    const r = root(); if (!r) return;
    r.innerHTML = S.busy ? busyView() : S.done ? doneView() : [null, sourceView, pickView, meanView, nameView][S.step]();
    bind();
    const h = $('#idTitle'); if (h) { h.tabIndex = -1; if (S.focusH) { h.focus(); S.focusH = false; } }
  }
  const head = (n, title) => `${dots(n)}<h2 id="idTitle">${title}</h2>`;
  function sourceView() {
    return `${head(1, T('Nhập từ tài liệu'))}
      <p class="small muted" style="margin:0">${T('Đọc ngay trên máy bạn, không tải tệp lên.')}</p>
      <button type="button" class="idk-drop" id="idDrop"><span aria-hidden="true" style="font-size:1.6rem">📥</span><b>${T('Chọn hoặc kéo thả file vào đây')}</b><span class="small muted">${isExt() ? '.epub · .srt · .vtt · .txt' : '.pdf · .epub · .srt · .vtt · .txt'} · ≤ 20 MB</span></button>
      <input type="file" id="idFile" accept="${isExt() ? '' : '.pdf,application/pdf,'}.epub,.srt,.vtt,.txt,text/plain" hidden aria-label="${T('Chọn file')}">
      <label for="idText" class="small" style="font-weight:700">${T('Hoặc dán văn bản')}</label>
      <textarea class="input" id="idText" rows="4" placeholder="${esc(T('Hoặc dán văn bản'))}">${esc(S.text || '')}</textarea>
      <label for="idLink" class="small" style="font-weight:700">${T('Hoặc dán liên kết bài viết')}</label>
      <div class="idk-link"><input class="input" id="idLink" type="url" inputmode="url" autocomplete="off" placeholder="https://" value="${esc(S.link || '')}"><button type="button" class="btn" id="idLinkGo">${T('Đọc liên kết')}</button></div>
      <div id="idMsg" role="status" aria-live="polite">${S.err ? `<div class="idk-err">⚠️ ${esc(S.err)}</div>` : ''}</div>
      <div class="row end"><button type="button" class="btn ghost" data-close>${T('Đóng')}</button><button type="button" class="btn primary" id="idGo">${T('Tiếp tục')}</button></div>`;
  }
  function busyView() {
    return `<div class="idk" aria-busy="true"><h2 id="idTitle">${T('Đang đọc trên máy…')}</h2><div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" aria-label="${T('Tiến độ')}" id="idBar"><i style="width:0%"></i></div><p class="small muted" id="idProg" role="status" aria-live="polite" style="margin:0">${S.msg || ''}</p><div class="row end"><button type="button" class="btn ghost" id="idCancel">${T('Hủy')}</button></div></div>`;
  }
  function setP(p, label) { const b = $('#idBar'); if (!b) return; const v = Math.round(p * 100); b.firstElementChild.style.width = v + '%'; b.setAttribute('aria-valuenow', v); if (label) { const l = $('#idProg'); if (l) l.textContent = label; } }
  function rows(list) {
    return `<ul class="idk-list" aria-label="${T('Chọn từ để học')}">${list.slice(0, S.shown).map(c => `<li><label class="idk-row"><input type="checkbox" data-w="${esc(c.word)}" ${S.picked.has(c.word) ? 'checked' : ''}><span><b>${esc(c.word)}</b>${c.n > 1 ? `<span class="idk-n">×${c.n}</span>` : ''}${c.meaning ? (c.ai ? `<span class="idk-ai">${T('AI gợi ý')}</span>` : '') : `<span class="idk-no">${T('chưa có nghĩa')}</span>`}<span class="s">${esc(c.meaning || '')}${c.meaning && c.sentence ? ' · ' : ''}${esc(c.sentence || '')}</span></span></label></li>`).join('')}</ul>`;
  }
  function pickView() {
    const L = S.list;
    if (!L.length) return `${head(2, T('Chọn từ để học'))}<div class="idk-note">${T('Không có từ mới đáng học ở đây.')}</div><div class="row end"><button type="button" class="btn" id="idBack">← ${T('Chọn nguồn khác')}</button></div>`;
    return `${head(2, T('Chọn từ để học'))}
      <div class="row" style="gap:.4rem"><span class="chip" id="idCount" role="status" aria-live="polite">${T('Đã chọn {n} từ', { n: S.picked.size })}</span><button type="button" class="btn sm ghost" id="idTop">${T('Chọn {n} từ đầu', { n: PRESELECT })}</button><button type="button" class="btn sm ghost" id="idNone">${T('Bỏ chọn hết')}</button></div>
      ${rows(L)}${L.length > S.shown ? `<button type="button" class="btn ghost" id="idMore">${T('Hiện thêm')}</button>` : ''}
      <div class="row end"><button type="button" class="btn ghost" id="idBack">← ${T('Quay lại')}</button><button type="button" class="btn primary" id="idNext" ${S.picked.size ? '' : 'disabled'}>${T('Tiếp tục')}</button></div>`;
  }
  const pickedList = () => S.list.filter(c => S.picked.has(c.word));
  function meanView() {
    const P = pickedList();
    return `${head(3, T('Nghĩa của từ'))}
      <p class="small muted" style="margin:0">${T('Nghĩa từ từ điển Lexkite. Từ thiếu nghĩa vẫn được lưu.')}</p>
${rows(P.length ? P : [])}
      ${aiBox(P)}
      <div class="row end"><button type="button" class="btn ghost" id="idBack">← ${T('Quay lại')}</button><button type="button" class="btn primary" id="idNext" ${P.length ? '' : 'disabled'}>${T('Tiếp tục')}</button></div>`;
  }
  const aiBox = P => { // nút AI chỉ hiện khi còn từ thiếu nghĩa (người học tự bấm; chỉ gửi từ + câu gốc)
    const n = P.filter(c => !c.meaning).length; if (!n) return '';
    return `<div class="idk-note" id="idAiBox"><button type="button" class="btn sm" id="idAi" ${S.aiBusy ? 'disabled' : ''}>✨ ${S.aiBusy ? T('Đang nhờ AI điền nghĩa…') : T('Điền nghĩa bằng AI')}</button><div class="small" style="margin-top:.4rem">${S.aiNote || T('Chỉ gửi từ và câu gốc, không gửi cả tài liệu.')}</div></div>`;
  };
  function nameView() {
    const P = pickedList(), five = P.slice(0, 5);
    return `${head(4, T('Tạo bộ {n} thẻ', { n: P.length }))}
      <label for="idDeck" class="small" style="font-weight:700">${T('Tên bộ từ trong Lexkite')}<input class="input" id="idDeck" maxlength="60" value="${esc(S.deck)}"></label>
      <div><div class="idk-prev">${five.map(c => `<div class="idk-card"><div class="w">${esc(c.word)}</div><div>${c.meaning ? esc(c.meaning) + (c.ai ? ` <span class="idk-ai">${T('AI gợi ý')}</span>` : '') : `<span class="idk-no">${T('chưa có nghĩa')}</span>`}</div>${c.sentence ? `<div class="x">${esc(c.sentence)}</div>` : ''}</div>`).join('')}</div></div>
      <p class="small muted" style="margin:0">${T('Thẻ vào lịch ôn FSRS. Không lưu tệp gốc.')}</p>
      <div class="row end"><button type="button" class="btn ghost" id="idBack">← ${T('Quay lại')}</button><button type="button" class="btn primary" id="idSave">${T('Tạo bộ {n} thẻ', { n: P.length })}</button></div>`;
  }
  function doneView() {
    const d = S.done;
    return `<div class="idk-done">${kit('cheer', 84)}<h2 id="idTitle">${T('Đã tạo bộ “{d}” với {n} thẻ', { n: d.n, d: esc(d.deck) })}</h2></div>
      <div class="row end"><button type="button" class="btn ghost" id="idUndo">↩ ${T('Hoàn tác')} <span id="idSec">${d.left}</span></button><a class="btn" href="#/deck" data-close>📒 ${T('Xem trong Sổ từ')}</a><a class="btn primary" href="#/practice/learn?src=deck" data-close>🧠 ${T('Học ngay')}</a></div>`;
  }

  function bind() {
    const b = id => document.getElementById(id), on = (id, f) => { const e = b(id); if (e) e.onclick = f; };
    if (S.busy) return on('idCancel', () => { S.cancel = true; });
    if (S.done) return;
    if (S.step === 1) {
      const drop = b('idDrop'), f = b('idFile'); drop.onclick = () => f.click(); f.onchange = () => f.files[0] && run(f.files[0]);
      drop.ondragover = e => { e.preventDefault(); drop.classList.add('on'); }; drop.ondragleave = () => drop.classList.remove('on');
      drop.ondrop = e => { e.preventDefault(); drop.classList.remove('on'); if (e.dataTransfer.files[0]) run(e.dataTransfer.files[0]); };
      const tx = b('idText'), go = b('idGo'); tx.oninput = () => { S.text = tx.value; go.disabled = tx.value.trim().length < 20; }; // chữ dán: ≥ 20 ký tự mới bấm được
      go.disabled = (S.text || '').trim().length < 20; go.onclick = () => run(tx.value, T('Văn bản dán'));
      const lk = b('idLink'), lg = b('idLinkGo'); lk.oninput = () => { S.link = lk.value; lg.disabled = !/^https?:\/\/\S{4,}$/i.test(lk.value.trim()); }; lg.disabled = !/^https?:\/\/\S{4,}$/i.test((S.link || '').trim());
      lg.onclick = () => runLink(lk.value); lk.onkeydown = e => { if (e.key === 'Enter' && !lg.disabled) { e.preventDefault(); runLink(lk.value); } };
      return;
    }
    on('idBack', () => { S.step = S.step === 2 ? 1 : S.step - 1; S.err = null; S.focusH = true; draw(); });
    on('idNext', () => { S.step++; if (S.step === 4 && !S.deck) S.deck = T('Văn bản dán'); S.focusH = true; draw(); });
    on('idMore', () => { S.shown += 100; draw(); });
    on('idTop', () => { S.picked = preselect(S.list); draw(); });
    on('idNone', () => { S.picked = new Set(); draw(); });
    $$('.idk-row input').forEach(i => i.onchange = () => {
      i.checked ? S.picked.add(i.dataset.w) : S.picked.delete(i.dataset.w);
      const c = b('idCount'); if (c) c.textContent = T('Đã chọn {n} từ', { n: S.picked.size });
      const n = b('idNext'); if (n) n.disabled = !S.picked.size;
    });
    const dk = b('idDeck'); if (dk) dk.oninput = () => { S.deck = dk.value; };
    on('idSave', save); on('idAi', aiRun);
  }
  async function run(src, label, opts = {}) {
    S.err = null; S.busy = true; S.cancel = false; S.msg = T('Đang đọc trên máy…'); draw();
    const cancelled = () => S.cancel || !isOpen();
    try {
      const K = known(), miner = createMiner({ known: K });
      const info = await readSource(src, miner, { isCancelled: cancelled, onProgress: p => setP(p * 0.7) });
      const raw = miner.result();
      setP(0.72);
      S.list = await enrich(raw, { lookup, known: K, isCancelled: cancelled, onProgress: p => setP(0.72 + p * 0.28) });
      S.picked = preselect(S.list); S.shown = 100;
      S.deck = opts.deck || deckName(typeof src === 'string' ? '' : src.name) || T('Văn bản dán'); S.aiNote = '';
      S.source = typeof src === 'string' ? label : src.name; S.kind = info.kind;
      S.step = 2; S.busy = false; S.focusH = true;
    } catch (e) {
      S.busy = false; S.step = 1;
      if (e.code === 'cancel') { if (isOpen()) { draw(); toast(T('Đã hủy – chưa nhập từ nào')); } return; }
      S.err = ERRS()[e.code] || T('Chưa nhập được. Hãy thử lại.');
    }
    if (isOpen()) draw();
  }
  async function runLink(url) {
    S.err = null; S.busy = true; S.cancel = false; S.msg = T('Đang tải bài viết…'); draw();
    let res; try { res = await fetchLink(url, { base: apiBase(), headers: await apiHeaders() }); }
    catch (e) { S.busy = false; S.step = 1; S.err = linkMsg(e); if (isOpen()) draw(); return; }
    if (!isOpen()) return;
    return run(res.text, res.host || T('Văn bản dán'), { deck: deckName(res.title || res.host) });
  }
  async function aiRun() { // AI điền nghĩa cho các từ đã chọn mà thiếu nghĩa; hết lượt/lỗi → giữ "chưa có nghĩa", chỉ một dòng báo nhẹ
    if (S.aiBusy) return; S.aiBusy = true; S.aiNote = ''; draw();
    const cache = meanCache(), lang = g.I18N && I18N.meanLang && I18N.meanLang() !== 'vi' ? 'English' : 'Vietnamese';
    const r = await aiFill(pickedList(), { call: aiCall, lang, cache, isCancelled: () => !isOpen() }); saveMeanCache(cache);
    S.aiBusy = false; if (!isOpen()) return;
    S.aiNote = r.stop && r.missing ? T('AI chưa điền được – các từ này vẫn được lưu, điền nghĩa sau.') : '';
    draw(); if (r.filled) toast(T('Đã điền {n} nghĩa bằng AI', { n: r.filled }));
  }
  async function save() {
    const P = pickedList(); if (!P.length) return;
    const btn = document.getElementById('idSave'); if (btn) btn.disabled = true;
    const deck = (S.deck || '').trim().slice(0, 60) || T('Văn bản dán'), C = g.Core.Cards, now = Date.now(), vi = !g.I18N || !I18N.meanLang || I18N.meanLang() === 'vi';
    try {
      const cards = makeCards(C, P, { deck, source: S.source || '', now, vi }), keys = [];
      await C.mutate(map => { for (const c of cards) { const k = g.Core.keyOf ? g.Core.keyOf(c.word) : c.word.toLowerCase(); if (map[k]) continue; map[k] = c; keys.push(k); } return map; });
      const del = await g.Core.Store.get('deleted', {}); let ch = false; for (const k of keys) if (del[k]) { delete del[k]; ch = true; } if (ch) await g.Core.Store.set('deleted', del);
      if (g.App) { await App.load(); App.updateChrome && App.updateChrome(); }
      if (g.Sfx && Sfx.win) try { Sfx.win(); } catch (e) { /* bỏ qua */ }
      S.done = { n: keys.length, deck, keys, left: 10 }; S.busy = false; S.text = ''; draw();
      const h = $('#idTitle'); if (h) { h.tabIndex = -1; h.focus(); }
      const d = S.done; d.timer = setInterval(() => { d.left--; const s = document.getElementById('idSec'); if (s) s.textContent = d.left; if (d.left <= 0) finish(d); }, 1000);
      const u = document.getElementById('idUndo'); if (u) u.onclick = () => undo(d);
    } catch (e) { S.err = T('Chưa nhập được. Hãy thử lại.'); if (btn) btn.disabled = false; toast(S.err); }
  }
  function finish(d) { clearInterval(d.timer); d.timer = 0; const u = document.getElementById('idUndo'); if (u) u.remove(); if (g.Sync && Sync.schedule) Sync.schedule(); } // chỉ đồng bộ sau khi hết 10 s hoàn tác
  async function undo(d) {
    if (!d.timer) return; clearInterval(d.timer); d.timer = 0;
    try { await g.Core.Cards.mutate(map => { for (const k of d.keys) delete map[k]; return map; }); if (g.App) { await App.load(); App.updateChrome && App.updateChrome(); } toast(T('Hoàn tác')); } catch (e) { toast(T('Không tải được – thử lại sau')); }
    S.done = null; S.step = 4; if (isOpen()) draw();
  }

  g.ImportDeck = { open };
  if (g.App) g.App.importDeck = open;
})(typeof self !== 'undefined' ? self : globalThis);
