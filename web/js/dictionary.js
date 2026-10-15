/* Tra từ: ưu tiên bộ từ IELTS có sẵn, bổ sung từ các nguồn miễn phí, không cần key:
 *  - Google Dictionary (dữ liệu Oxford Languages): nghĩa tiếng Việt theo từ loại,
 *    định nghĩa tiếng Anh + ví dụ, từ đồng nghĩa; dịch câu ngữ cảnh
 *  - dictionaryapi.dev : phiên âm IPA, audio UK/US, định nghĩa bổ sung
 *  - Tatoeba           : câu ví dụ thật, song ngữ Anh – Việt
 *  - Wikipedia REST    : hình minh họa
 *  - MyMemory          : dự phòng khi Google không phản hồi
 */
(function (g) {
  const t = (typeof self !== 'undefined' && self.t) || ((s, v) => (v ? s.replace(/\{(\w+)\}/g, (m, k) => (v[k] != null ? v[k] : m)) : s));
  const cache = new Map();

  const fetchJSON = async (url, ms = 8000) => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), ms);
    try {
      const r = await fetch(url, { signal: ctrl.signal });
      if (!r.ok) return null;
      return await r.json();
    } catch (e) { return null; } finally { clearTimeout(t); }
  };

  const GTX = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=vi&hl=vi&dj=1';
  // Sửa lỗi chính tả hỏi/ngã có sẵn trong dữ liệu từ điển Google (vd. "sản phẫm" → "sản phẩm").
  // Bảng sinh tự động từ kho tiếng Việt của Lexkite: chỉ gồm âm tiết sai chắc chắn (dạng đúng rất phổ biến, dạng sai không tồn tại),
  // đã loại các từ hợp lệ hiếm gặp như mỡ, vở, quỷ, rể, mẩu, sặc sỡ…
  const VI_TYPO = {"chũ":"chủ","điễn":"điển","cũa":"của","thưỡng":"thưởng","đễ":"để","chĩ":"chỉ","tãi":"tải","chuyễn":"chuyển","buỗi":"buổi","chuổi":"chuỗi","điễm":"điểm","ỡ":"ở","hảy":"hãy","mổi":"mỗi","nghỉa":"nghĩa","kiễm":"kiểm","tỗng":"tổng","ngử":"ngữ","cãnh":"cảnh","quã":"quả","hiễn":"hiển","tưỡng":"tưởng","hũy":"hủy","khõi":"khỏi","dỏi":"dõi","khoãn":"khoản","gữi":"gửi","kễ":"kể","biễu":"biểu","thữ":"thử","khã":"khả","bãn":"bản","ãnh":"ảnh","thễ":"thể","giử":"giữ","lổi":"lỗi","khẫu":"khẩu","dể":"dễ","miển":"miễn","vửng":"vững","chuẫn":"chuẩn","sẳn":"sẵn","hiễu":"hiểu","trỡ":"trở","khỡi":"khởi","phõng":"phỏng","chử":"chữ","chĩnh":"chỉnh","cở":"cỡ","hõi":"hỏi","đũ":"đủ","ẫn":"ẩn","giãm":"giảm","trã":"trả","thiễu":"thiểu","ỗn":"ổn","khoãng":"khoảng","đãm":"đảm","ngẩu":"ngẫu","kiễu":"kiểu","thẵng":"thẳng","giãng":"giảng","phỗ":"phổ","nhiểm":"nhiễm","thãi":"thải","bải":"bãi","chũng":"chủng","khõe":"khỏe","dưởng":"dưỡng","tuỗi":"tuổi","tuyễn":"tuyển","đẵng":"đẳng","xữ":"xử","tữ":"tử","hưỡng":"hưởng","sãn":"sản","tĩ":"tỉ","xĩ":"xỉ","ũng":"ủng","triễn":"triển","diển":"diễn","tãng":"tảng","phãn":"phản","phãi":"phải","nhõ":"nhỏ","xãy":"xảy","cữa":"cửa","bãng":"bảng","dẩn":"dẫn","đão":"đảo","nhửng":"những","giửa":"giữa","tiễu":"tiểu","khão":"khảo","đở":"đỡ","bỡi":"bởi","thão":"thảo","quãn":"quản","khẵng":"khẳng","hửu":"hữu","phẫy":"phẩy","thũ":"thủ","trưỡng":"trưởng","biễn":"biển","thũy":"thủy","hõng":"hỏng","tỗ":"tổ","lể":"lễ","hiễm":"hiểm","sữ":"sử","gổ":"gỗ","trể":"trễ","cãm":"cảm","rổng":"rỗng","phẫm":"phẩm","hẵn":"hẳn","khỗng":"khổng","bửa":"bữa","khũng":"khủng","hoãng":"hoảng","nử":"nữ","lổ":"lỗ","chãy":"chảy","thoãi":"thoải","tỗn":"tổn","thõa":"thỏa","nhản":"nhãn","trử":"trữ","thã":"thả","vủ":"vũ","thỗi":"thổi","mủi":"mũi","lưởi":"lưỡi","cãn":"cản","võn":"vỏn"};
  // Sửa toàn bộ chuỗi trong một mục từ / thẻ đã lưu (chỉ tác động âm tiết có dấu tiếng Việt)
  const fixDeep = o => o == null ? o : JSON.parse(JSON.stringify(o), (k, v) => typeof v === 'string' ? fixVi(v) : v);
  // Lỗi sai dấu nguyên âm có sẵn trong dữ liệu Google (âm tiết sai vẫn là từ có thật nên chỉ sửa theo cụm)
  const VI_PHRASE = [[/\bcọng chung\b/giu, 'cộng chung']];
  const fixVi = s => { if (typeof s !== 'string') return s; s = s.normalize('NFC').replace(/[a-zA-ZÀ-ỹđĐ]+/g, w => { const r = Object.hasOwn(VI_TYPO, w.toLowerCase()) && VI_TYPO[w.toLowerCase()]; return !r ? w : w[0] === w[0].toUpperCase() && w[0] !== w[0].toLowerCase() ? r[0].toUpperCase() + r.slice(1) : r; }); for (const [re, to] of VI_PHRASE) s = s.replace(re, to); return s; };
  // Nghĩa đáng ngờ: chứa âm tiết hiếm dễ nhầm dấu (cọng/cộng…) đứng cạnh âm tiết chưa từng đi cùng nó trong từ điển tiếng Việt
  let RARE = null;
  // Bảng kiểm tra chính tả (25 KB) tải lúc rảnh, không chặn trang đầu; chưa có thì tạm bỏ qua bước kiểm tra
  let viP = null;
  const loadVi = () => viP || (viP = new Promise(res => { if (!g.document) return res(); const sc = document.createElement('script'); sc.src = 'js/vi-check.js'; sc.onload = sc.onerror = res; document.head.appendChild(sc); }));
  if (g.document) setTimeout(() => (g.requestIdleCallback || setTimeout)(loadVi), 3000);
  const rare = () => { if (!g.VI_RARE) { loadVi(); return new Map(); } return RARE || (RARE = new Map(String(g.VI_RARE || '').split('|').filter(Boolean).map(x => { const [k, v] = x.split(':'); return [k, new Set((v || '').split(','))]; }))); };
  const suspicious = term => { const ws = term.toLowerCase().split(/\s+/); if (ws.length < 2) return false; return ws.some((w, i) => { const c = rare().get(w); return c && !c.has(ws[i - 1]) && !c.has(ws[i + 1]); }); };
  const cleanTerms = terms => { const all = [...new Set(terms.map(fixVi))], ok = all.filter(x => !suspicious(x)); return ok.length ? ok : all; };

  async function fromGoogle(word) {
    const d = await fetchJSON(`${GTX}&dt=t&dt=bd&dt=md&dt=ex&dt=ss&q=${encodeURIComponent(word)}`, 4000);
    if (!d) return null;
    const vi = fixVi((d.sentences || []).map(s => s.trans || '').join('').trim());
    const senses = (d.dict || []).map(x => ({ pos: x.pos, terms: cleanTerms(x.terms || []).slice(0, 6) }));
    const exById = {};
    ((d.examples && d.examples.example) || []).forEach(e => { exById[e.definition_id] = e.text.replace(/<\/?b>/g, ''); });
    const defs = (d.definitions || []).map(x => ({
      pos: x.pos,
      defs: (x.entry || []).slice(0, 4).map(e => ({ def: e.gloss, ex: e.example || exById[e.definition_id] || '' })),
    }));
    const syn = [...new Set((d.synsets || []).flatMap(s => (s.entry || []).flatMap(e => e.synonym || [])))].slice(0, 8);
    const base = (d.dict && d.dict[0] && d.dict[0].base_form) || (d.definitions && d.definitions[0] && d.definitions[0].base_form) || '';
    return { vi, senses, defs, syn, base };
  }

  // Nguồn dự phòng cho từ hiếm/chuyên ngành: định nghĩa Wiktionary (hơn 8 triệu mục) → WordNet (Princeton, qua Datamuse)
  const POS_EN = { Noun: 'noun', Verb: 'verb', Adjective: 'adjective', Adverb: 'adverb', 'Proper noun': 'noun', Preposition: 'preposition', Conjunction: 'conjunction', Pronoun: 'pronoun', Interjection: 'interjection', n: 'noun', v: 'verb', adj: 'adjective', adv: 'adverb' };
  async function rareDefs(word) {
    const strip = h => String(h || '').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
    const wk = await fetchJSON(`https://en.wiktionary.org/api/rest_v1/page/definition/${encodeURIComponent(word)}`, 3500);
    const en = wk && (wk.en || wk[Object.keys(wk).find(k => k === 'en')]);
    if (Array.isArray(en) && en.length) {
      const meanings = en.slice(0, 4).map(m => ({ pos: POS_EN[m.partOfSpeech] || String(m.partOfSpeech || '').toLowerCase(), defs: (m.definitions || []).map(d => ({ def: strip(d.definition), ex: strip((d.examples || [])[0] || '') })).filter(d => d.def).slice(0, 3) })).filter(m => m.defs.length);
      if (meanings.length) return { ipa: '', ipaUS: '', audio: '', audioUS: '', meanings, syn: [], src: 'Wiktionary' };
    }
    const dm = await fetchJSON(`https://api.datamuse.com/words?sp=${encodeURIComponent(word)}&md=dp&max=1`, 3000);
    const row = Array.isArray(dm) && dm[0] && dm[0].word === word.toLowerCase() ? dm[0] : null;
    if (row && row.defs && row.defs.length) {
      const by = {}; row.defs.forEach(x => { const [p2, d] = x.split('\t'); (by[POS_EN[p2] || p2] = by[POS_EN[p2] || p2] || []).push({ def: d, ex: '' }); });
      return { ipa: '', ipaUS: '', audio: '', audioUS: '', meanings: Object.entries(by).map(([pos, defs]) => ({ pos, defs: defs.slice(0, 3) })), syn: [], src: 'WordNet' };
    }
    return null;
  }

  async function fromFreeDict(word) {
    const data = await fetchJSON(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`, 3000);
    if (!Array.isArray(data) || !data.length) return null;
    const out = { ipa: '', ipaUS: '', audio: '', audioUS: '', meanings: [], syn: [] };
    for (const entry of data) {
      for (const p of entry.phonetics || []) {
        const a = p.audio || '';
        if (/-uk\.mp3$/.test(a) && !out.audio) { out.audio = a; if (p.text) out.ipa = p.text; }
        else if (/-us\.mp3$/.test(a) && !out.audioUS) { out.audioUS = a; if (p.text) out.ipaUS = p.text; }
      }
      if (!out.ipa) out.ipa = entry.phonetic || (entry.phonetics || []).map(p => p.text).find(Boolean) || '';
      for (const m of entry.meanings || []) {
        out.meanings.push({
          pos: m.partOfSpeech,
          defs: (m.definitions || []).slice(0, 3).map(d => ({ def: d.definition, ex: d.example || '' })),
        });
        out.syn.push(...(m.synonyms || []));
      }
    }
    if (!out.audio) out.audio = out.audioUS;
    out.syn = [...new Set(out.syn)].slice(0, 6);
    return out;
  }

  // Câu ví dụ song ngữ từ Tatoeba (ưu tiên câu dài vừa phải, giống văn phong IELTS hơn)
  async function sentences(word, limit = 4) {
    const d = await fetchJSON(`https://api.tatoeba.org/unstable/sentences?lang=eng&q=${encodeURIComponent(word)}&trans:lang=vie&sort=relevance&limit=20&showtrans=matching`, 3500);
    if (!d || !Array.isArray(d.data)) return [];
    return d.data
      .map(x => ({ en: x.text, vi: ((x.translations || []).flat().find(t => t && t.lang === 'vie') || (x.translations || []).flat()[0] || {}).text || '' }))
      .filter(x => x.vi && x.en.split(' ').length >= 5)
      .sort((a, b) => Math.abs(a.en.length - 70) - Math.abs(b.en.length - 70))
      .slice(0, limit);
  }

  // Phiên âm UK/US từ Wiktionary (khi dictionaryapi.dev thiếu); đổi ɹ → r theo quy ước từ điển Oxford
  // MD5 gọn (chỉ dùng tính đường dẫn file trên upload.wikimedia.org – Wikimedia lưu file theo md5 của tên)
  const md5 = str => {
    const k = [], r = [7, 12, 17, 22, 5, 9, 14, 20, 4, 11, 16, 23, 6, 10, 15, 21];
    for (let i = 0; i < 64; i++) k[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 2 ** 32) >>> 0;
    const bytes = [...new TextEncoder().encode(str)], len = bytes.length * 8;
    bytes.push(0x80); while (bytes.length % 64 !== 56) bytes.push(0);
    for (let i = 0; i < 8; i++) bytes.push(i < 4 ? (len >>> (8 * i)) & 255 : 0);
    let [a0, b0, c0, d0] = [0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476];
    for (let o = 0; o < bytes.length; o += 64) {
      const M = []; for (let i = 0; i < 16; i++) M[i] = bytes[o + 4 * i] | (bytes[o + 4 * i + 1] << 8) | (bytes[o + 4 * i + 2] << 16) | (bytes[o + 4 * i + 3] << 24);
      let [A, B, C, D] = [a0, b0, c0, d0];
      for (let i = 0; i < 64; i++) {
        let F, gi;
        if (i < 16) { F = (B & C) | (~B & D); gi = i; } else if (i < 32) { F = (D & B) | (~D & C); gi = (5 * i + 1) % 16; } else if (i < 48) { F = B ^ C ^ D; gi = (3 * i + 5) % 16; } else { F = C ^ (B | ~D); gi = (7 * i) % 16; }
        const tmp = D; D = C; C = B; const x = (A + F + k[i] + M[gi]) | 0, sh = r[(i >> 4) * 4 + (i % 4)];
        B = (B + ((x << sh) | (x >>> (32 - sh)))) | 0; A = tmp;
      }
      a0 = (a0 + A) | 0; b0 = (b0 + B) | 0; c0 = (c0 + C) | 0; d0 = (d0 + D) | 0;
    }
    return [a0, b0, c0, d0].map(v => [0, 8, 16, 24].map(s2 => ((v >>> s2) & 255).toString(16).padStart(2, '0')).join('')).join('');
  };
  const commonsURL = f => { const n = f.trim().replace(/ /g, '_'), name = n[0].toUpperCase() + n.slice(1), h = md5(name); return `https://upload.wikimedia.org/wikipedia/commons/${h[0]}/${h.slice(0, 2)}/${encodeURIComponent(name)}`; };
  async function wiktIPA(word) {
    const d = await fetchJSON(`https://en.wiktionary.org/w/api.php?action=parse&page=${encodeURIComponent(word)}&prop=wikitext&format=json&formatversion=2&origin=*`, 6000);
    const text = d && d.parse && d.parse.wikitext;
    if (!text) return null;
    const en = text.split(/\n==(?!=)/).find(sec => /^English==/.test(sec)) || text;
    // Mỗi dòng phát âm: giọng (UK/US) + từ loại áp dụng ({{q|adjective|adverb}}) + IPA – từ nhiều từ loại có phiên âm khác nhau (overall, record, present…)
    const POSN = /^(noun|verb|adjective|adverb|preposition|conjunction|pronoun|interjection|determiner)s?$/i;
    const fix = x => x.replace(/ɹ/g, 'r').replace(/\./g, '').replace(/[\u032F\u0306\u031A\u0361]/g, ''); // bỏ ký hiệu phiên âm hẹp (ɪ̯…) – kiểu từ điển học tập Oxford/Cambridge
    const entries = [];
    // Hiểu 3 cách ghi của Wiktionary: (1) {{q|adjective}} cùng dòng; (2) dòng cha "* {{a|en|adjective|noun}}" + dòng con "**";
    // (3) tách theo Etymology – từ loại lấy từ các tiêu đề ====Noun==== trong cùng phần nguồn gốc
    const ACC = x => /^(UK|RP|Received Pronunciation|British|England)$/i.test(x) ? 'UK' : /^(US|GA|General American|America)$/i.test(x) ? 'US' : '';
    const posOf = x => { x = x.trim().toLowerCase(); return POSN.test(x) ? x.replace(/s$/, '') : ''; };
    const blocks = en.split(/\n(?====Etymology)/);
    for (const blk of blocks) {
      const blockPos = [...blk.matchAll(/\n====?(Noun|Verb|Adjective|Adverb|Preposition|Conjunction|Pronoun|Interjection|Determiner)====?/g)].map(m => m[1].toLowerCase());
      let parent = null;
      for (const line of blk.split('\n')) {
        const toks = [...line.matchAll(/\{\{(?:a|q|qualifier|i)\|(?:en\|)?([^}]+)\}\}/g)].flatMap(m => m[1].split('|')).concat([...line.matchAll(/\|a=([^|}]*)/g)].flatMap(m => m[1].split(/[,;]/)));
        const m = line.match(/\{\{IPA\|en\|([^}|]+)/);
        if (!m) { if (/^\*\s/.test(line) && toks.length) parent = toks; else if (/^\*\s/.test(line)) parent = null; continue; }
        if (/^\*\s/.test(line)) parent = null; // dòng cấp 1 có IPA → không thuộc dòng cha nào
        const all = toks.concat(/^\*\*/.test(line) && parent ? parent : []);
        const ipa0 = m[1].trim().replace(/<[^>]*>/g, '');
        if (!ipa0.startsWith('/')) continue;
        const accs = [...new Set(all.map(ACC).filter(Boolean))];
        const otherAcc = all.some(x => /^(AU|NZ|CA|Canada|Australia|New Zealand|Scotland|Scottish|Ireland|Irish|India|Indian|South Africa|Northern England|cot-caught|.*dialects.*)$/i.test(x.trim()));
        const acc = accs.length ? accs.join(',') : otherAcc ? 'X' : '';
        let pos = all.map(posOf).filter(Boolean);
        if (!pos.length && /^\*\*/.test(line) && parent && !parent.some(x => ACC(x) || posOf(x))) pos = ['other']; // dòng cha là chú thích lạ (vd. "past of presend")
        if (!pos.length) pos = blockPos;
        entries.push({ acc, pos, ipa: fix(ipa0) });
      }
    }
    // Bản ghi giọng người thật trên Wikimedia Commons ({{audio|en|File.ogg|a=UK}}) – miễn phí, giấy phép mở
    const aud = { UK: '', US: '' };
    for (const m of en.matchAll(/\{\{audio\|en\|([^|}]+\.(?:ogg|oga|mp3|wav|opus))([^}]*)\}\}/gi)) {
      const f = m[1].trim(), a = (m[2].match(/a=([^|}]*)/) || [, ''])[1] + ' ' + f;
      const acc = /\b(UK|RP|British|England|London)\b|en-uk|\(eng\)/i.test(a) ? 'UK' : /\b(US|GA|General American|America)\b|en-us/i.test(a) ? 'US' : '';
      if (acc && !aud[acc]) aud[acc] = commonsURL(f); // đường dẫn trực tiếp (có CORS) → lưu được vào bộ nhớ đệm để nghe offline
    }
    if (!entries.length) return null;
    const pick = acc => (entries.find(e => e.acc.split(',').includes(acc) && !e.pos.includes('other')) || entries.find(e => !e.acc && !e.pos.includes('other')) || entries[0]).ipa;
    return { ipa: pick('UK'), ipaUS: pick('US'), entries, audioUK: aud.UK, audioUS: aud.US };
  }

  async function myMemory(text) {
    const d = await fetchJSON(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|vi`);
    const t = d && d.responseData && d.responseData.translatedText;
    return !t || /MYMEMORY WARNING|INVALID/i.test(t) ? '' : fixVi(t);
  }

  // Dịch cả câu (dùng cho câu ngữ cảnh)
  // Dự phòng: Translator API có sẵn trong Chrome (dịch trên máy, miễn phí, chạy được offline) – chỉ dùng khi mô hình đã sẵn sàng
  let localTr = null;
  async function onDeviceVi(text) {
    try {
      const TR = g.Translator; if (!TR) return '';
      if (!localTr) { if ((await TR.availability({ sourceLanguage: 'en', targetLanguage: 'vi' })) !== 'available') return ''; localTr = await TR.create({ sourceLanguage: 'en', targetLanguage: 'vi' }); }
      return fixVi(await localTr.translate(text));
    } catch (e) { return ''; }
  }
  async function translateVi(text) {
    const d = await fetchJSON(`${GTX}&dt=t&q=${encodeURIComponent(text)}`);
    const t = d && fixVi((d.sentences || []).map(s => s.trans || '').join('').trim());
    return t || (await onDeviceVi(text)) || myMemory(text);
  }

  // Dịch sang ngôn ngữ bất kỳ (nghĩa cho người học quốc tế: es, ja, ar…) – có bộ nhớ đệm trong phiên
  const trCache = new Map();
  async function translateTo(text, tl, sl = 'en') {
    if (!text || !tl || tl === sl) return '';
    if (tl === 'vi' && sl === 'en') return translateVi(text);
    const k = sl + '|' + tl + '|' + text; if (trCache.has(k)) return trCache.get(k);
    const d = await fetchJSON(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${encodeURIComponent(tl)}&dj=1&dt=t&q=${encodeURIComponent(text)}`);
    const r = (d && (d.sentences || []).map(x => x.trans || '').join('').trim()) || '';
    if (r) trCache.set(k, r);
    return r;
  }

  // Ảnh minh họa từ Openverse (kho ảnh Creative Commons): ưu tiên CC0/phạm vi công cộng, sau đó giấy phép cho phép dùng thương mại.
  // Trả về { src, credit, link, license } – luôn hiển thị ghi nguồn theo giấy phép.
  async function freeImage(word) {
    const q = encodeURIComponent(word);
    // Chỉ nhận ảnh thực sự liên quan: tiêu đề hoặc thẻ mô tả phải chứa từ (hoặc dạng gốc của từ)
    const stem = word.toLowerCase().replace(/(ies|es|s|ed|ing)$/, '').slice(0, Math.max(4, word.length - 3));
    const relevant = r => {
      const hay = [(r.title || ''), ...(r.tags || []).map(t => t.name || '')].join(' ').toLowerCase();
      return new RegExp(`\\b${stem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).test(hay);
    };
    const titleHit = r => new RegExp(`\\b${stem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).test((r.title || '').toLowerCase());
    const photo = r => r.thumbnail && !r.mature && !/svg|gif/i.test(r.filetype || '') && !/maki|icon|logo|symbol|emblem|coat of arms|\.svg|\.tif|\.pdf|diagram|chart|map of/i.test(r.title || '')
      && (!r.width || r.width >= 400) && (!r.height || !r.width || (r.width / r.height > 0.6 && r.width / r.height < 2.2));
    const pick = d => d && Array.isArray(d.results) && (d.results.find(r => photo(r) && titleHit(r)) || d.results.find(r => photo(r) && relevant(r)));
    const api = qs => fetchJSON(`https://api.openverse.org/v1/images/?q=${q}&page_size=12&mature=false&${qs}`, 3000);
    // 3 truy vấn chạy song song, chọn theo thứ tự ưu tiên: stock CC0 → mọi CC0/PD → CC BY (ghi nguồn)
    const [a1, a2, a3] = await Promise.all([api('license=cc0,pdm&source=stocksnap,rawpixel,nappy,wikimedia'), api('license=cc0,pdm'), api('license_type=commercial&source=wikimedia,flickr')]);
    let r = pick(a1) || pick(a2) || pick(a3);
    if (!r) return null;
    // Ảnh thu nhỏ lấy thẳng từ nguồn (dịch vụ thumb của Openverse đôi khi lỗi 424)
    const thumbOf = r => {
      const u = r.url || '';
      if (/upload\.wikimedia\.org/.test(u)) { const f = decodeURIComponent(u.split('/').pop()); return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(f)}?width=480`; }
      if (/staticflickr\.com/.test(u)) return u.replace(/(_[a-z])?\.jpg$/, '_n.jpg');
      return u || r.thumbnail;
    };
    const lic = (r.license || '').toUpperCase() + (r.license_version && !/cc0|pdm/i.test(r.license) ? ' ' + r.license_version : '');
    return { src: thumbOf(r), link: r.foreign_landing_url || r.url, license: lic,
      credit: t('“{title}” – {creator} · {license} · qua Openverse', { title: (r.title || word).slice(0, 60), creator: r.creator || t('không rõ tác giả'), license: /pdm/i.test(r.license) ? 'Public Domain' : lic }) };
  }
  // Giữ tên cũ cho mã gọi trước đây
  const wikiImage = async word => { const im = await freeImage(word); return im ? im.src : ''; };


  const POS_SHORT_RAW = { noun: 'n', verb: 'v', adjective: 'adj', adverb: 'adv', preposition: 'prep', conjunction: 'conj', pronoun: 'pron', interjection: 'excl',
    'danh từ': 'n', 'động từ': 'v', 'tính từ': 'adj', 'trạng từ': 'adv', 'giới từ': 'prep', 'liên từ': 'conj', 'đại từ': 'pron', 'thán từ': 'excl' };
  const POS_SHORT = Object.fromEntries(Object.entries(POS_SHORT_RAW).map(([k, v]) => [k.normalize('NFC'), v]));

  // ---------- Bộ nhớ đệm bền (giữ kết quả tra qua các lần mở trang / khởi động lại add-on) ----------
  const DV = 5;
  const persist = {
    // _v: phiên bản dữ liệu tra từ – tăng khi đổi cách xử lý (vd. phiên âm theo từ loại) để kết quả cũ trên máy tự tra lại
    async get(w) { try { const x = g.Core ? await g.Core.Store.get('dc2:' + w, null) : null; return x && x._v === DV ? fixDeep(x) : null; } catch (e) { return null; } },
    async set(w, e) {
      try {
        if (!g.Core) return;
        await g.Core.Store.set('dc2:' + w, { ...e, _t: Date.now(), _v: DV });
        const idx = (await g.Core.Store.get('dcIndex', [])).filter(x => x !== w);
        idx.push(w);
        while (idx.length > 150) { const old = idx.shift(); if (g.Core.Store.remove) await g.Core.Store.remove('dc2:' + old); }
        await g.Core.Store.set('dcIndex', idx);
      } catch (e) { /* hết dung lượng: bỏ qua */ }
    },
  };
  const FRESH = 14 * 86400000;

  const normWord = raw => String(raw || '').trim().toLowerCase().replace(/[’]/g, "'").replace(/[^a-z\s'-]/g, '').replace(/\s+/g, ' ');

  // Phiên âm đúng từ loại chính của mục từ (vd. overall tính từ /ˌəʊvəˈrɔːl/ ≠ danh từ /ˈəʊvərɔːl/)
  const POS_FULL = { n: 'noun', v: 'verb', adj: 'adjective', adv: 'adverb', 'danh từ': 'noun', 'động từ': 'verb', 'tính từ': 'adjective', 'trạng từ': 'adverb' };
  const ipaFor = (wk, posRaw, acc) => {
    if (!wk) return ''; if (!wk.entries) return acc === 'US' ? wk.ipaUS : wk.ipa;
    const pos = POS_FULL[posRaw] || posRaw || '';
    let E = wk.entries.filter(e => !e.pos.includes('other') && e.acc !== 'X'); if (!E.length) E = wk.entries;
    const hasAcc = e => e.acc.split(',').includes(acc), exact = e => pos && e.pos.includes(pos);
    let C = E.filter(exact); if (!C.length) C = E.filter(e => !e.pos.length); if (!C.length) C = E;
    // Không ghi rõ từ loại (vd. project, object): danh/tính từ nhấn âm đầu, động từ nhấn âm sau – quy tắc trọng âm của từ đồng hình
    if (C.some(e => e.pos.length !== 1) && /^(noun|verb|adjective)$/.test(pos)) { const ini = e => /^\/ˈ/.test(e.ipa), S = C.filter(e => (pos === 'verb' ? !ini(e) && /ˈ/.test(e.ipa) : ini(e))); if (S.length) C = S; }
    return (C.find(hasAcc) || C.find(e => !e.acc) || C[0]).ipa;
  };
  function build(word, local, gg, fd, wk, img, sents) {
    const gFirst = gg && gg.defs[0] && gg.defs[0].defs[0];
    const fFirst = fd && fd.meanings[0];
    const anyEx = (gg && gg.defs.flatMap(m => m.defs).find(d => d.ex)) || (fd && fd.meanings.flatMap(m => m.defs).find(d => d.ex));
    const senseVi = gg && gg.senses.length ? gg.senses.map(s => s.terms.slice(0, 3).join(', ')).join('; ') : '';
    const posRaw = ((gg && gg.senses[0] && gg.senses[0].pos) || (gg && gg.defs[0] && gg.defs[0].pos) || (fFirst && fFirst.pos) || '').normalize('NFC').toLowerCase();
    return {
      word,
      found: true,
      ipa: (local && local.ipa) || ipaFor(wk, (local && local.pos) || posRaw, 'UK') || (fd && fd.ipa) || '',
      ipaUS: ipaFor(wk, (local && local.pos) || posRaw, 'US') || (fd && fd.ipaUS) || '',
      audio: (fd && fd.audio) || (wk && wk.audioUK) || '',
      audioUS: (fd && fd.audioUS) || (wk && wk.audioUS) || '',
      pos: (local && local.pos) || POS_SHORT[posRaw] || posRaw,
      vi: (local && local.vi) || (gg && gg.vi && gg.vi.toLowerCase() !== word ? gg.vi : '') || senseVi || '',
      def: (local && local.def) || (gFirst && gFirst.def) || (fFirst && fFirst.defs[0] && fFirst.defs[0].def) || '',
      ex: (local && local.ex) || (anyEx && anyEx.ex) || (sents && sents[0] && sents[0].en) || '',
      col: (local && local.col) || [],
      syn: (local && local.syn && local.syn.length ? local.syn : (gg && gg.syn.length ? gg.syn : (fd ? fd.syn : []))),
      level: (local && local.level) || '',
      emoji: (local && local.emoji) || '',
      topic: (local && local.topic) || 'mine',
      image: (img && img.src) || '',
      imageCredit: img ? { text: img.credit, link: img.link } : null,
      senses: gg ? gg.senses : [],
      oxford: gg ? gg.defs : [],
      meanings: fd ? fd.meanings : [],
      sentences: sents || [],
    };
  }

  /* Tra nhanh (~0,2–0,5 giây): nghĩa, phiên âm, định nghĩa – để hiện ngay; chi tiết bổ sung sau bằng lookup(). */
  const quickCache = new Map();
  async function quick(raw) {
    const word = normWord(raw);
    if (!word) return null;
    if (cache.has(word)) return cache.get(word);
    if (quickCache.has(word)) return quickCache.get(word);
    const saved = await persist.get(word);
    if (saved && Date.now() - saved._t < FRESH) { cache.set(word, saved); return saved; }
    const local = (g.IELTS_DATA && g.IELTS_DATA.INDEX[word]) || null;
    const [gg, wk] = await Promise.all([fromGoogle(word), wiktIPA(word)]);
    const hasGoogle = gg && (gg.senses.length || gg.defs.length);
    if (!local && !hasGoogle) return null;
    const e = { ...build(word, local, gg, null, wk, '', []), partial: true };
    quickCache.set(word, e);
    return e;
  }

  /* Tra đầy đủ: thêm âm thanh, hình ảnh, câu song ngữ, định nghĩa bổ sung. */
  async function lookup(raw, { image = true, examples = true } = {}) {
    const word = normWord(raw);
    if (!word) return null;
    if (cache.has(word)) return cache.get(word);
    const saved = await persist.get(word);
    if (saved && Date.now() - saved._t < FRESH) { cache.set(word, saved); return saved; }

    const local = (g.IELTS_DATA && g.IELTS_DATA.INDEX[word]) || null;
    let [gg, fd, wk, img, sents] = await Promise.all([
      fromGoogle(word),
      fromFreeDict(word),
      wiktIPA(word),
      image ? freeImage(word) : null,
      examples ? sentences(word) : [],
    ]);
    const base = gg && gg.base && gg.base !== word ? gg.base : '';
    if (base && (!fd || (!wk && !(local && local.ipa)))) {
      const [fb, wb] = await Promise.all([fd ? fd : fromFreeDict(base), wk ? wk : wiktIPA(base)]);
      fd = fb; wk = wb;
    }
    const hasGoogle = gg && (gg.senses.length || gg.defs.length);
    if (!local && !fd && !hasGoogle) {
      // Từ hiếm / chuyên ngành: lấy định nghĩa từ Wiktionary hoặc WordNet, nghĩa tiếng Việt từ bản dịch
      fd = await rareDefs(word);
      if (!fd) return { word, found: false, vi: (gg && gg.vi !== word && gg.vi) || await myMemory(word) };
      if (wk) { fd.ipa = wk.ipa || ''; fd.ipaUS = wk.ipaUS || ''; }
    }
    // Thiếu câu song ngữ → dịch các câu ví dụ Oxford sang tiếng Việt
    if (examples && sents.length < 2 && gg) {
      const exs = gg.defs.flatMap(m => m.defs).map(d => d.ex).filter(Boolean).filter(x => !sents.some(s => s.en === x)).slice(0, 3 - sents.length);
      if (exs.length) {
        const vi = (await translateVi(exs.join('\n'))).split('\n');
        exs.forEach((en, i) => { if (vi[i]) sents.push({ en: en[0].toUpperCase() + en.slice(1), vi: vi[i].trim().replace(/^./, c => c.toUpperCase()), auto: true }); });
      }
    }
    const entry = build(word, local, gg, fd, wk, img, sents);
    if (entry.image && !/^n|danh/.test(entry.pos || '')) { entry.image = ''; entry.imageCredit = null; }
    cache.set(word, entry);
    if (image && examples) persist.set(word, { ...entry, meanings: entry.oxford.length ? [] : entry.meanings.slice(0, 2) });
    return entry;
  }

  // Phiên âm dự phòng cho từ ghép không có trong từ điển (vd. fairtrade = fair + trade):
  // tách tại mọi vị trí, tra IPA 2 phần, ghép lại với trọng âm chính ở phần đầu, trọng âm phụ ở phần sau
  async function ipaGuess(word) {
    word = String(word || '').toLowerCase().trim();
    const full = await lookup(word, { image: false, examples: false }).catch(() => null);
    if (full && full.ipa) return { ipa: full.ipa, ipaUS: full.ipaUS || '', guess: false };
    if (!/^[a-z]{6,}$/.test(word)) return null;
    const strip = x => String(x || '').replace(/^\/|\/$/g, '').trim();
    // Ưu tiên cách tách cân đối (note|book trước not|ebook)
    const cuts = []; for (let i = 3; i <= word.length - 3; i++) cuts.push(i);
    cuts.sort((x, y) => Math.min(y, word.length - y) - Math.min(x, word.length - x));
    for (const i of cuts.slice(0, 4)) {
      const a = word.slice(0, i), b = word.slice(i);
      const [ia, ib] = await Promise.all([wiktIPA(a), wiktIPA(b)]);
      if (ia && ia.ipa && ib && ib.ipa) {
        const join = (x, y) => { x = strip(x); y = strip(y).replace(/^ˈ/, '').replace(/ˈ/g, 'ˌ'); return '/' + (x.startsWith('ˈ') ? x : 'ˈ' + x) + 'ˌ' + y.replace(/^ˌ/, '') + '/'; };
        return { ipa: join(ia.ipa, ib.ipa), ipaUS: join(ia.ipaUS || ia.ipa, ib.ipaUS || ib.ipa), guess: true, parts: [a, b] };
      }
    }
    return null;
  }
  g.Dict = { translateTo, ipaGuess, lookup, quick, translateVi, wikiImage, freeImage, sentences, normWord, fixVi, fixDeep };
})(typeof self !== 'undefined' ? self : this);
