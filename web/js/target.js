/* Ngôn ngữ ĐÍCH (tl) = ngôn ngữ đang HỌC; khác I18N.learnLang()/meanLang(). Chi tiết: docs/specs/target-language.md */
(function (g) {
  'use strict';
  const TABLE = {
    en: { em: '🇬🇧', name: 'English', speech: null, rec: null, prefix: 'en', kokoro: { 'en-GB': 'bf_emma', 'en-US': 'af_heart' }, voices: {} /* = Chars.voice() như cũ */, wordFiles: true },
    pt: { em: '🇧🇷', name: 'Português', speech: 'pt-BR', rec: 'pt-BR', fallback: [], prefix: 'pt', kokoro: { 'pt-BR': 'pf_dora' }, voices: { ama: 'pf_dora', carlos: 'pm_alex' }, wordFiles: false,
      ready: false, home: '#/tlprep/pt', flag: 'pt_pilot', ls: 'lk.pt', label: 'Português (beta)' },
    es: { em: '🇪🇸', name: 'Español', home: '#/practice/esd', routes: { vocab: '#/practice/es', skills: '#/practice/esp', tests: '#/practice/esx' }, speech: 'es-419', rec: 'es-MX' /* Web Speech nhận giọng chưa có es-419 ổn định → es-MX (chuẩn trung tính gần nhất) */, fallback: ['es-MX', 'es-US'], prefix: 'es', kokoro: { 'es-419': 'ef_dora', 'es-MX': 'ef_dora', 'es-US': 'ef_dora' }, voices: { ama: 'ef_dora', carlos: 'em_alex' }, wordFiles: false,
      flag: 'es_course', pct: 'es_course_pct', kill: 'es_kill', ls: 'lk.es', label: 'Español (beta)' },
    fr: { em: '🇫🇷', name: 'Français', speech: 'fr-FR', rec: 'fr-FR', fallback: ['fr-CA', 'fr-BE'], prefix: 'fr', kokoro: { 'fr-FR': 'ff_siwis', 'fr-CA': 'ff_siwis', 'fr-BE': 'ff_siwis' }, voices: { ama: 'ff_siwis', carlos: 'ff_siwis' }, wordFiles: false,
      ready: false, home: '#/tlprep/fr', flag: 'fr_course', pct: 'fr_course_pct', kill: 'fr_kill', ls: 'lk.fr', label: 'Français (bêta)' },
    ja: { em: '🇯🇵', name: '日本語', speech: 'ja-JP', rec: 'ja-JP', fallback: [], prefix: 'ja', kokoro: { 'ja-JP': 'jf_alpha' }, voices: { ama: 'jf_alpha', carlos: 'jm_kumo' }, wordFiles: false,
      ready: false, home: '#/tlprep/ja', flag: 'ja_course', pct: 'ja_course_pct', kill: 'ja_kill', ls: 'lk.ja', label: '日本語 (ベータ)' },
  };
  const LANGS = Object.keys(TABLE), KEY = 'lk.tl';
  const ls = (k, v) => { try { if (v === undefined) return g.localStorage ? g.localStorage.getItem(k) : null; if (v === null) g.localStorage.removeItem(k); else g.localStorage.setItem(k, v); } catch (e) { /* chế độ riêng tư */ } return null; };
  const cfgv = k => { try { const c = JSON.parse(ls('lk.cfg') || 'null'); return c && c.v ? c.v[k] : undefined; } catch (e) { return undefined; } };
  const yes = v => v === true || v === 1 || v === '1' || v === 'true', no = v => v === false || v === 0 || v === '0' || v === 'false';
  let mem = null; // riêng tư: giữ nhóm trong bộ nhớ
  function bucket() { const b = ls('lk.esb'); if (/^\d{1,2}$/.test(b || '')) return +b; if (mem === null) mem = Math.floor(Math.random() * 100); ls('lk.esb', String(mem)); return mem; }
  function on(tl) {
    const r = TABLE[tl]; if (!r || !r.flag) return false;
    if (r.kill && yes(cfgv(r.kill))) return false;
    if (ls(r.ls) === '1' || ls('lk.adm') === '1') return true; // quản trị (App.isAdmin ghi lk.adm) luôn thấy mọi ngôn ngữ beta, như lk.<tl>=1
    const v = cfgv(r.flag); if (yes(v)) return true; if (no(v)) return false;
    const p = r.pct ? cfgv(r.pct) : undefined, n = typeof p === 'string' || typeof p === 'number' ? parseFloat(p) : NaN;
    return n > 0 && bucket() < Math.min(100, n);
  }
  const enabled = tl => (tl ? on(tl) : LANGS.some(on));
  const usable = k => on(k) && (TABLE[k].ready !== false || ls('lk.adm') === '1'); // ready:false: chỉ quản trị chọn được
  const avail = () => LANGS.filter(k => k === 'en' || usable(k)); // ngôn ngữ chọn được lúc này
  const cur = () => { const v = ls(KEY); return v && v !== 'en' && TABLE[v] && usable(v) ? v : 'en'; };
  function set(tl) {
    tl = TABLE[tl] ? tl : 'en';
    ls(KEY, tl === 'en' ? null : tl);
    try { g.dispatchEvent && g.CustomEvent && g.dispatchEvent(new g.CustomEvent('lk:tl', { detail: tl })); } catch (e) { /* bỏ qua */ }
    return cur();
  }
  const table = tl => TABLE[tl] || TABLE.en;
  const homeOf = tl => table(tl).home || ''; // trang chủ riêng của ngôn ngữ đích ('' = dùng Hôm nay chung)
  // màn chỉ có tiếng Anh → màn của ngôn ngữ đang học (chưa ánh xạ → trang chủ nó, không về en); '' = giữ nguyên
  const EN_ONLY = /^(vocab|skills|skill|tests|toeic|ielts|mock|path|library|deck|grammar|lesson|listen|read|write|speaking|today)$/;
  const routeFor = name => { const tl = cur(); if (tl === 'en' || !EN_ONLY.test(name || '')) return ''; const r = table(tl); return (r.routes && r.routes[name]) || r.home || ''; };
  const isEn = accent => !accent || /^en(-|$)/i.test(String(accent));
  // accent dùng cho thẻ của ngôn ngữ đích hiện tại: 'en' → đúng accent tiếng Anh trong Cài đặt (như cũ)
  const accent = (enAccent, tl) => table(tl || cur()).speech || enAccent;
  const speechLang = (tl, enAccent) => table(tl).speech || enAccent || 'en-GB';
  // chuỗi lang thử lần lượt khi chọn giọng máy/nhận giọng: [speech, ...fallback] ('en' → [] = theo Cài đặt như cũ)
  const speechLangs = tl => { const t = table(tl); return t.speech ? [t.speech, ...(t.fallback || [])] : []; };
  const recLang = (tl, enAccent) => table(tl).rec || enAccent || 'en-GB';
  const tlOfAccent = a => { const p = String(a || '').split(/[-_]/)[0].toLowerCase(); return LANGS.find(k => TABLE[k].prefix === p) || 'en'; };
  // tiền tố lọc giọng máy (LKAudio.voiceScore): accent lạ → 'en' như trước
  const prefixFor = a => table(tlOfAccent(a)).prefix;
  // giọng Kokoro mặc định theo accent (en-US → af_heart, còn lại tiếng Anh → bf_emma – y hệt ui.js cũ)
  const kokoroVoice = a => { const t = table(tlOfAccent(a)); return t.kokoro[a] || (t === TABLE.en ? 'bf_emma' : Object.values(t.kokoro)[0]); };
  // giọng file từ đơn audio/w: '' = chưa có file dựng sẵn cho ngôn ngữ này → giọng máy
  const wordVoice = a => table(tlOfAccent(a)).wordFiles ? kokoroVoice(a) : '';
  const teacherVoice = (who, tl) => table(tl || cur()).voices[who] || '';
  const ofCard = c => (c && c.tl && TABLE[c.tl] ? c.tl : 'en');
  // Nhãn ngôn ngữ ĐÍCH (W7a): huy hiệu cờ + tên, bấm → Cài đặt (nơi đổi). 'en' = '' (hành vi cũ từng byte). chip(tl, tĩnh) = liên kết Cài đặt, hoặc nhãn tĩnh (span) trong phiên học để bấm nhầm không thoát bài.
  const esc = x => String(x).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const chip = (tl, tinh) => { tl = tl || cur(); if (tl === 'en' || !TABLE[tl]) return ''; const r = TABLE[tl], tt = esc(typeof g.t === 'function' ? g.t('Ngôn ngữ đang học') : 'Ngôn ngữ đang học');
    const el = tinh ? 'span' : 'a', h = tinh ? '' : ' href="#/settings"';
    return `<${el} class="chip tl-chip"${h} data-tl="${tl}" aria-label="${tt}: ${esc(r.name)}"><span aria-hidden="true">${r.em}</span> <span translate="no" lang="${tl}">${esc(r.name)}</span></${el}>`; };
  g.Target = { homeOf, routeFor, chip, LANGS, TABLE, enabled, avail, speechLangs, cur, set, table, isEn, accent, speechLang, recLang, tlOfAccent, prefixFor, kokoroVoice, wordVoice, teacherVoice, ofCard };
})(typeof self !== 'undefined' ? self : this);
