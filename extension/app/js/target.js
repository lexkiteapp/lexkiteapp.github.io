/* 🌍 Ngôn ngữ ĐÍCH (target language, viết tắt tl) – ngôn ngữ người dùng đang HỌC (docs/specs/target-language.md).
 * KHÁC I18N.learnLang()/meanLang() = ngôn ngữ NGHĨA (bản ngữ). 'en' = mặc định: mọi giá trị 'en' tái tạo đúng hành vi cũ.
 * Bật thử THEO NGÔN NGỮ (cột flag/ls của bảng): pt = cờ công khai `pt_pilot` hoặc localStorage lk.pt = '1'; es = cờ `es_course` hoặc lk.es = '1'
 * (functions/api/config.js → lk.cfg; docs/specs/spanish-course.md). Mọi cờ tắt → cur() luôn 'en'. Thêm ngôn ngữ = thêm DÒNG bảng, không thêm nhánh code. */
(function (g) {
  'use strict';
  // Bảng theo ngôn ngữ: speech = lang cho speechSynthesis/nhận giọng (null = giọng Anh–Anh/Anh–Mỹ theo Cài đặt như cũ),
  // kokoro = mã giọng dựng sẵn theo accent, voices = giọng giáo viên (Ama nữ, Carlos nam), prefix = lọc giọng máy, wordFiles = có file audio/w dựng sẵn,
  // fallback = lang dự phòng khi máy không có giọng/nhận giọng `speech`, flag/ls = cờ bật thử, label = tên ở Cài đặt (chuỗi thông báo: settings.js TL_TOAST).
  const TABLE = {
    en: { em: '🇬🇧', name: 'English', speech: null, rec: null, prefix: 'en', kokoro: { 'en-GB': 'bf_emma', 'en-US': 'af_heart' }, voices: {} /* = Chars.voice() như cũ */, wordFiles: true },
    // pt-BR: Kokoro-82M + âm vị espeak-ng pt-br (kokoro-js chỉ tự phiên âm tiếng Anh) – lý do + lượt mẫu: spec §Giọng. Chưa dựng file từ → giọng máy pt-BR.
    pt: { em: '🇧🇷', name: 'Português', speech: 'pt-BR', rec: 'pt-BR', fallback: [], prefix: 'pt', kokoro: { 'pt-BR': 'pf_dora' }, voices: { ama: 'pf_dora', carlos: 'pm_alex' }, wordFiles: false,
      flag: 'pt_pilot', ls: 'lk.pt', label: 'Português (beta)' },
    // es: tiếng TBN Mỹ Latinh trung tính (seseo – spanish-course.md §8): es-419, máy thiếu giọng es-419 → es-MX → es-US. Kokoro ef_dora/em_alex chờ lượt mẫu W0.
    es: { em: '🇪🇸', name: 'Español', home: '#/practice/esd', speech: 'es-419', rec: 'es-MX' /* Web Speech nhận giọng chưa có es-419 ổn định → es-MX (chuẩn trung tính gần nhất) */, fallback: ['es-MX', 'es-US'], prefix: 'es', kokoro: { 'es-419': 'ef_dora', 'es-MX': 'ef_dora', 'es-US': 'ef_dora' }, voices: { ama: 'ef_dora', carlos: 'em_alex' }, wordFiles: false,
      flag: 'es_course', pct: 'es_course_pct', kill: 'es_kill', ls: 'lk.es', label: 'Español (beta)' },
  };
  const LANGS = Object.keys(TABLE), KEY = 'lk.tl';
  const ls = (k, v) => { try { if (v === undefined) return g.localStorage ? g.localStorage.getItem(k) : null; if (v === null) g.localStorage.removeItem(k); else g.localStorage.setItem(k, v); } catch (e) { /* chế độ riêng tư */ } return null; };
  // enabled(tl) = cờ của RIÊNG ngôn ngữ đó; enabled() = có ít nhất một ngôn ngữ đích ngoài 'en' đang bật (hiện hàng chọn ở Cài đặt)
  // BẬT THEO BẬC (W7): cờ riêng (true/1) = tất cả · `pct` (0–100) = nhóm thiết bị cố định lk.esb (ngẫu nhiên 1 lần, kiểu vocab-img.js lk.vb; KHÔNG dùng lk.tb của teacher-bubble) ·
  // `kill`=1 = CÔNG TẮC KHẨN, tắt mọi đường (kể cả lk.es) · lk.es=1 = người thử. Cờ `flag` đặt rõ 0/false vẫn tắt nhóm theo %.
  const cfgv = k => { try { const c = JSON.parse(ls('lk.cfg') || 'null'); return c && c.v ? c.v[k] : undefined; } catch (e) { return undefined; } };
  const yes = v => v === true || v === 1 || v === '1' || v === 'true', no = v => v === false || v === 0 || v === '0' || v === 'false';
  let mem = null; // chế độ riêng tư (không ghi được): giữ nhóm trong bộ nhớ để không đổi qua lại giữa các lần gọi
  function bucket() { const b = ls('lk.esb'); if (/^\d{1,2}$/.test(b || '')) return +b; if (mem === null) mem = Math.floor(Math.random() * 100); ls('lk.esb', String(mem)); return mem; }
  function on(tl) {
    const r = TABLE[tl]; if (!r || !r.flag) return false;
    if (r.kill && yes(cfgv(r.kill))) return false;
    if (ls(r.ls) === '1') return true;
    const v = cfgv(r.flag); if (yes(v)) return true; if (no(v)) return false;
    const p = r.pct ? cfgv(r.pct) : undefined, n = typeof p === 'string' || typeof p === 'number' ? parseFloat(p) : NaN;
    return n > 0 && bucket() < Math.min(100, n);
  }
  const enabled = tl => (tl ? on(tl) : LANGS.some(on));
  const avail = () => LANGS.filter(k => k === 'en' || on(k)); // ngôn ngữ chọn được lúc này
  const cur = () => { const v = ls(KEY); return v && v !== 'en' && TABLE[v] && on(v) ? v : 'en'; };
  function set(tl) {
    tl = TABLE[tl] ? tl : 'en';
    ls(KEY, tl === 'en' ? null : tl);
    try { g.dispatchEvent && g.CustomEvent && g.dispatchEvent(new g.CustomEvent('lk:tl', { detail: tl })); } catch (e) { /* bỏ qua */ }
    return cur();
  }
  const table = tl => TABLE[tl] || TABLE.en;
  const homeOf = tl => table(tl).home || ''; // trang chủ riêng của ngôn ngữ đích ('' = dùng Hôm nay chung)
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
  g.Target = { homeOf, chip, LANGS, TABLE, enabled, avail, speechLangs, cur, set, table, isEn, accent, speechLang, recLang, tlOfAccent, prefixFor, kokoroVoice, wordVoice, teacherVoice, ofCard };
})(typeof self !== 'undefined' ? self : this);
