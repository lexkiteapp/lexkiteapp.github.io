// Ảnh riêng từng bài blog (thuần JS, không gói ngoài, không mạng – unit test được): đặc tả front matter `shots:` / `diagrams:` /
// `coverArt:`, mã ảnh theo bài, mã băm đầu vào (render lại khi đổi), mẫu SVG ảnh bìa (Kit chỉ lấy từ web/js/kit.js), sơ đồ SVG/HTML
// nhúng thẳng vào bài, alt tự sinh từ bản ghi chụp + luật "alt không được khẳng định điều không có trên ảnh", trần dung lượng, schema sổ ảnh.
// Phần nặng (resvg, sharp, Playwright, đẩy R2) ở scripts/blog-images.mjs – chỉ chạy trên GitHub Actions (.github/workflows/blog-images.yml).
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto'; import vm from 'node:vm';

export const LANGS = ['vi', 'en', 'es', 'ja', 'id', 'pt', 'fr', 'de', 'tr', 'ru', 'ar', 'hi', 'ko', 'zh', 'th'];
export const RTL = new Set(['ar']);
export const TEMPLATE = { cover: 'cover-v1', shot: 'shot-v1' }; // đổi phiên bản mẫu → mọi ảnh loại đó render lại (mã băm đầu vào đổi)
export const W = 1440, H = 756, OG = [1200, 630]; // ảnh bìa ≈ 1,91:1 (khớp og:image); bản og JPEG 1200×630 cho mạng xã hội
export const BRAND = { teal: '#0F3D3E', teal2: '#17595A', glow: '#2A7D7A', coral: '#E5502F', coral2: '#F2553B', apricot: '#FFB054', sun: '#FFC94A', cream: '#FFF7EA', cream2: '#FFE7C2' };

// Tên chuyên mục theo ngôn ngữ – PHẢI khớp bảng `cats` trong scripts/build-blog.mjs (test blog-images.mjs so khớp)
export const CATS = {
  vi: { 'tu-vung': 'Từ vựng', ielts: 'IELTS', toeic: 'TOEIC', toefl: 'TOEFL', 'phuong-phap': 'Phương pháp học', 'ngu-phap': 'Ngữ pháp & cách dùng', 'phat-am': 'Phát âm', 'ky-nang': 'Kỹ năng tiếng Anh' },
  en: { 'tu-vung': 'Vocabulary', ielts: 'IELTS', toeic: 'TOEIC', toefl: 'TOEFL', 'phuong-phap': 'Study methods', 'ngu-phap': 'Grammar & usage', 'phat-am': 'Pronunciation', 'ky-nang': 'English skills' },
  id: { 'tu-vung': 'Kosakata', ielts: 'IELTS', toeic: 'TOEIC', toefl: 'TOEFL', 'phuong-phap': 'Metode belajar', 'ngu-phap': 'Tata bahasa', 'phat-am': 'Pelafalan', 'ky-nang': 'Keterampilan bahasa Inggris' },
  es: { 'tu-vung': 'Vocabulario', ielts: 'IELTS', toeic: 'TOEIC', toefl: 'TOEFL', 'phuong-phap': 'Métodos de estudio', 'ngu-phap': 'Gramática', 'phat-am': 'Pronunciación', 'ky-nang': 'Destrezas en inglés' },
  ja: { 'tu-vung': '英単語', ielts: 'IELTS', toeic: 'TOEIC', toefl: 'TOEFL', 'phuong-phap': '勉強法', 'ngu-phap': '英文法', 'phat-am': '発音', 'ky-nang': '英語スキル' },
  pt: { 'tu-vung': 'Vocabulário', ielts: 'IELTS', toeic: 'TOEIC', toefl: 'TOEFL', 'phuong-phap': 'Métodos de estudo', 'ngu-phap': 'Gramática', 'phat-am': 'Pronúncia', 'ky-nang': 'Habilidades em inglês' },
  fr: { 'tu-vung': 'Vocabulaire', ielts: 'IELTS', toeic: 'TOEIC', toefl: 'TOEFL', 'phuong-phap': "Méthodes d'apprentissage", 'ngu-phap': 'Grammaire', 'phat-am': 'Prononciation', 'ky-nang': 'Compétences en anglais' },
  de: { 'tu-vung': 'Wortschatz', ielts: 'IELTS', toeic: 'TOEIC', toefl: 'TOEFL', 'phuong-phap': 'Lernmethoden', 'ngu-phap': 'Grammatik', 'phat-am': 'Aussprache', 'ky-nang': 'Englisch-Fertigkeiten' },
  tr: { 'tu-vung': 'Kelime bilgisi', ielts: 'IELTS', toeic: 'TOEIC', toefl: 'TOEFL', 'phuong-phap': 'Çalışma yöntemleri', 'ngu-phap': 'Dil bilgisi', 'phat-am': 'Telaffuz', 'ky-nang': 'İngilizce becerileri' },
  ru: { 'tu-vung': 'Лексика', ielts: 'IELTS', toeic: 'TOEIC', toefl: 'TOEFL', 'phuong-phap': 'Методы обучения', 'ngu-phap': 'Грамматика', 'phat-am': 'Произношение', 'ky-nang': 'Навыки английского' },
  ar: { 'tu-vung': 'المفردات', ielts: 'IELTS', toeic: 'TOEIC', toefl: 'TOEFL', 'phuong-phap': 'طرق التعلّم', 'ngu-phap': 'القواعد', 'phat-am': 'النطق', 'ky-nang': 'مهارات الإنجليزية' },
  hi: { 'tu-vung': 'शब्दावली', ielts: 'IELTS', toeic: 'TOEIC', toefl: 'TOEFL', 'phuong-phap': 'पढ़ाई के तरीके', 'ngu-phap': 'व्याकरण', 'phat-am': 'उच्चारण', 'ky-nang': 'अंग्रेज़ी कौशल' },
  ko: { 'tu-vung': '영어 단어', ielts: 'IELTS', toeic: '토익', toefl: '토플', 'phuong-phap': '공부법', 'ngu-phap': '영문법', 'phat-am': '발음', 'ky-nang': '영어 스킬' },
  zh: { 'tu-vung': '英语词汇', ielts: '雅思', toeic: '托业', toefl: '托福', 'phuong-phap': '学习方法', 'ngu-phap': '英语语法', 'phat-am': '发音', 'ky-nang': '英语技能' },
  th: { 'tu-vung': 'คำศัพท์', ielts: 'IELTS', toeic: 'TOEIC', toefl: 'TOEFL', 'phuong-phap': 'วิธีเรียน', 'ngu-phap': 'ไวยากรณ์', 'phat-am': 'การออกเสียง', 'ky-nang': 'ทักษะภาษาอังกฤษ' },
};
// Nhãn đầu alt tự sinh (đúng ngôn ngữ bài)
export const LABEL = {
  vi: { cover: 'Ảnh bìa Lexkite', shot: 'Màn hình Lexkite', kit: 'linh vật Kit' }, en: { cover: 'Lexkite cover', shot: 'Lexkite screen', kit: 'Kit the mascot' },
  es: { cover: 'Portada de Lexkite', shot: 'Pantalla de Lexkite', kit: 'la mascota Kit' }, ja: { cover: 'Lexkite カバー画像', shot: 'Lexkite の画面', kit: 'マスコットの Kit' },
  id: { cover: 'Sampul Lexkite', shot: 'Layar Lexkite', kit: 'maskot Kit' }, pt: { cover: 'Capa da Lexkite', shot: 'Tela da Lexkite', kit: 'o mascote Kit' },
  fr: { cover: 'Couverture Lexkite', shot: 'Écran de Lexkite', kit: 'la mascotte Kit' }, de: { cover: 'Lexkite-Titelbild', shot: 'Lexkite-Bildschirm', kit: 'Maskottchen Kit' },
  tr: { cover: 'Lexkite kapak görseli', shot: 'Lexkite ekranı', kit: 'maskot Kit' }, ru: { cover: 'Обложка Lexkite', shot: 'Экран Lexkite', kit: 'талисман Kit' },
  ar: { cover: 'غلاف Lexkite', shot: 'شاشة Lexkite', kit: 'التميمة Kit' }, hi: { cover: 'Lexkite कवर चित्र', shot: 'Lexkite स्क्रीन', kit: 'मैस्कॉट Kit' },
  ko: { cover: 'Lexkite 표지 이미지', shot: 'Lexkite 화면', kit: '마스코트 Kit' }, zh: { cover: 'Lexkite 封面', shot: 'Lexkite 界面', kit: '吉祥物 Kit' },
  th: { cover: 'ภาพปก Lexkite', shot: 'หน้าจอ Lexkite', kit: 'มาสคอต Kit' },
};

const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export const sha = (x, n = 16) => crypto.createHash('sha256').update(x).digest('hex').slice(0, n);
const stable = v => Array.isArray(v) ? `[${v.map(stable).join(',')}]` : v && typeof v === 'object' ? `{${Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + stable(v[k])).join(',')}}` : JSON.stringify(v);
export const inputHash = (kind, data) => sha(stable({ t: TEMPLATE[kind] || kind, ...data }), 12);

// ---------- Front matter dạng flow (YAML rút gọn): [{route: '#/dict/x', crop: main}, …] ----------
// Hỗ trợ: [ ], { }, chuỗi '…' / "…", số, true/false/null, chữ trần (đến , ] }). Dùng trong scripts/lib/blog-content.mjs parse().
export function parseFlow(src) {
  let i = 0; const s = String(src);
  const ws = () => { while (i < s.length && /\s/.test(s[i])) i++; };
  const fail = m => { throw new Error(`flow: ${m} tại ký tự ${i}: …${s.slice(Math.max(0, i - 15), i + 15)}…`); };
  const str = () => { const q = s[i++]; let out = ''; for (;;) { if (i >= s.length) fail('thiếu dấu đóng chuỗi'); const c = s[i]; if (c === q) { if (q === "'" && s[i + 1] === "'") { out += "'"; i += 2; continue; } i++; return out; } if (c === '\\' && q === '"') { out += JSON.parse(`"${c}${s[i + 1]}"`); i += 2; continue; } out += c; i++; } };
  const bare = (stop) => { const st = i; while (i < s.length && !stop.includes(s[i])) i++; const v = s.slice(st, i).trim(); if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v); if (v === 'true' || v === 'false') return v === 'true'; if (v === 'null' || v === '~') return null; return v; };
  const val = (stop) => { ws(); const c = s[i]; if (c === '[') return list(); if (c === '{') return map(); if (c === '"' || c === "'") { const v = str(); ws(); return v; } return bare(stop); };
  const list = () => { i++; const out = []; ws(); if (s[i] === ']') { i++; return out; } for (;;) { out.push(val(',]')); ws(); if (s[i] === ',') { i++; ws(); if (s[i] === ']') { i++; return out; } continue; } if (s[i] === ']') { i++; return out; } fail('cần , hoặc ]'); } };
  const map = () => { i++; const out = {}; ws(); if (s[i] === '}') { i++; return out; } for (;;) { ws(); const k = s[i] === '"' || s[i] === "'" ? str() : bare(':,}'); ws(); if (s[i] !== ':' || typeof k !== 'string' || !k) fail('cần khóa:'); i++; out[k] = val(',}'); ws(); if (s[i] === ',') { i++; ws(); if (s[i] === '}') { i++; return out; } continue; } if (s[i] === '}') { i++; return out; } fail('cần , hoặc }'); } };
  const v = val(''); ws(); if (i < s.length) fail('thừa ký tự'); return v;
}
// Số ngoặc còn mở (ngoài chuỗi) – front matter cho phép giá trị flow viết nhiều dòng
export function bracketDepth(s) { let d = 0, q = null; for (let i = 0; i < s.length; i++) { const c = s[i]; if (q) { if (c === q) q = null; else if (c === '\\' && q === '"') i++; continue; } if ((c === '"' || c === "'") && /[\s,[{:]/.test(s[i - 1] || ' ')) q = c; else if (c === '[' || c === '{') d++; else if (c === ']' || c === '}') d--; } return d; }

// ---------- Đặc tả ảnh của 1 bài ----------
const ID = /^[a-z][a-z0-9-]{0,15}$/, ROUTE = /^#\/[a-z0-9-]+(\/[^\s?#]*)?(\?[^\s#]*)?$/i;
const SHOT_KEYS = new Set(['id', 'route', 'lang', 'device', 'crop', 'wait', 'scroll', 'note']);
const DIAG_KEYS = { timeline: ['id', 'type', 'title', 'span', 'now', 'events'], boxes: ['id', 'type', 'title', 'parts', 'note'], compare: ['id', 'type', 'title', 'cols', 'rows'] };
export const mediaId = (p, local) => `${p.lang}-${p.slug}--${local}`; // khóa sổ ảnh (media:@s1 trong bài → <lang>-<slug>--s1)
export const examOf = p => ['ielts', 'toeic', 'toefl'].find(e => p.category === e || (p.tags || []).includes(e)) || null;
const ICON_OF = { 'tu-vung': 'book', ielts: 'target', toeic: 'target', toefl: 'target', 'phuong-phap': 'bulb', 'ngu-phap': 'blocks', 'phat-am': 'mic', 'ky-nang': 'chat' };
const MOOD_OF = { 'ngu-phap': 'think', 'phuong-phap': 'think', ielts: 'cheer', toeic: 'cheer', toefl: 'cheer' };
export const MOODS = ['happy', 'win', 'cheer', 'think', 'sad', 'sleep'], ICONS = ['book', 'target', 'bulb', 'blocks', 'mic', 'chat', 'ear', 'pen'];

export function specOf(p) {
  const errors = [], E = m => errors.push(m);
  const asList = (v, k) => v == null || v === '' ? [] : Array.isArray(v) ? v : (E(`${k}: phải là danh sách [ … ]`), []);
  const shots = asList(p.shots, 'shots').map((x, i) => {
    const o = typeof x === 'string' ? { route: x } : x && typeof x === 'object' ? { ...x } : (E(`shots[${i}]: phải là {route: '#/…'}`), {});
    for (const k of Object.keys(o)) if (!SHOT_KEYS.has(k)) E(`shots[${i}]: khóa lạ "${k}"${k === 'alt' || k === 'caption' ? ' (alt tự sinh từ ảnh chụp; chú thích viết ở ![](media:@id "chú thích"))' : ''}`);
    o.id = o.id == null ? `s${i + 1}` : String(o.id);
    if (!ID.test(o.id)) E(`shots[${i}]: id "${o.id}" phải a-z0-9-, ≤ 16 ký tự`);
    if (!ROUTE.test(String(o.route || ''))) E(`shots[${i}]: route "${o.route ?? ''}" phải dạng #/trang/… (đường dẫn trong app)`);
    o.lang = o.lang == null || o.lang === 'auto' ? p.lang : String(o.lang);
    if (!LANGS.includes(o.lang)) E(`shots[${i}]: lang "${o.lang}" không hợp lệ (auto | ${LANGS.join(' | ')})`);
    o.device = o.device || 'desktop'; if (!['desktop', 'mobile'].includes(o.device)) E(`shots[${i}]: device phải desktop | mobile`);
    o.crop = o.crop ?? 'viewport';
    const c = o.crop; if (!(c === 'viewport' || c === 'main' || c === 'full' || (c && typeof c === 'object' && (typeof c.selector === 'string' || ['x', 'y', 'w', 'h'].every(k => Number.isFinite(c[k]) && c[k] >= 0)))))
      E(`shots[${i}]: crop phải viewport | main | full | {selector: '.css'} | {x, y, w, h}`);
    if (o.wait != null && !(Number.isFinite(o.wait) && o.wait >= 0 && o.wait <= 15000)) E(`shots[${i}]: wait 0–15000 ms`);
    if (o.scroll != null && typeof o.scroll !== 'string') E(`shots[${i}]: scroll phải là CSS selector`);
    return o;
  });
  const diagrams = asList(p.diagrams, 'diagrams').map((x, i) => {
    const o = x && typeof x === 'object' && !Array.isArray(x) ? { ...x } : (E(`diagrams[${i}]: phải là {type: …}`), {});
    o.id = o.id == null ? `d${i + 1}` : String(o.id);
    if (!ID.test(o.id)) E(`diagrams[${i}]: id "${o.id}" không hợp lệ`);
    const keys = DIAG_KEYS[o.type]; if (!keys) { E(`diagrams[${i}]: type phải ${Object.keys(DIAG_KEYS).join(' | ')}`); return o; }
    for (const k of Object.keys(o)) if (!keys.includes(k)) E(`diagrams[${i}]: khóa lạ "${k}" cho ${o.type}`);
    for (const e of diagramErrors(o)) E(`diagrams[${i}] (${o.type}): ${e}`);
    return o;
  });
  const seen = new Set(); for (const o of [...shots, ...diagrams]) { if (seen.has(o.id)) E(`id "${o.id}" bị trùng giữa shots/diagrams`); seen.add(o.id); }
  if (shots.length > 8) E(`tối đa 8 ảnh chụp/bài (đang ${shots.length})`);
  let art = p.coverArt == null || p.coverArt === '' ? {} : p.coverArt;
  if (typeof art !== 'object' || Array.isArray(art)) { E('coverArt: phải là {mood, icon, chip, title}'); art = {}; }
  for (const k of Object.keys(art)) if (!['mood', 'icon', 'chip', 'title'].includes(k)) E(`coverArt: khóa lạ "${k}"`);
  const cats = CATS[p.lang] || CATS.en, exam = examOf(p);
  const cover = {
    lang: p.lang, title: String(art.title || p.title || ''),
    chip: String(art.chip || (exam ? cats[exam] : cats[p.category] || '') || 'Lexkite'),
    icon: art.icon || ICON_OF[p.category] || 'book', mood: art.mood || MOOD_OF[p.category] || 'happy',
  };
  if (!MOODS.includes(cover.mood)) E(`coverArt.mood phải ${MOODS.join(' | ')}`);
  if (!ICONS.includes(cover.icon)) E(`coverArt.icon phải ${ICONS.join(' | ')}`);
  if ([...cover.title].length > 90) E('coverArt.title ≤ 90 ký tự');
  return { cover, shots, diagrams, errors };
}
// Mục cần render của 1 bài: { id, kind, in (mã băm đầu vào), spec }
export function wantedItems(p, { covers = true } = {}) {
  const s = specOf(p), out = [];
  if (covers) out.push({ id: mediaId(p, 'cover'), kind: 'cover', post: `${p.lang}/${p.slug}`, spec: s.cover, in: inputHash('cover', s.cover) });
  for (const o of s.shots) { const k = { route: o.route, lang: o.lang, device: o.device, crop: o.crop, scroll: o.scroll || null, wait: o.wait || null }; out.push({ id: mediaId(p, o.id), kind: 'shot', post: `${p.lang}/${p.slug}`, spec: o, in: inputHash('shot', k) }); }
  return out;
}

// ---------- Đo & ngắt dòng (ước lượng theo em, không cần font – test được) ----------
export function charW(ch) {
  const c = ch.codePointAt(0);
  if (/\p{M}/u.test(ch) || c === 0x200c || c === 0x200d) return 0;
  if (/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}　-〿＀-￯]/u.test(ch)) return 1;
  if (/\p{Script=Thai}/u.test(ch)) return 0.6;
  if (/\p{Script=Devanagari}/u.test(ch)) return 0.66;
  if (/\p{Script=Arabic}/u.test(ch)) return 0.52;
  if (ch === ' ') return 0.28;
  if (/[\p{Lu}]/u.test(ch)) return 0.7;
  if (/[0-9]/.test(ch)) return 0.6;
  if (/[.,:;'’!|ilj]/.test(ch)) return 0.3;
  if (/[mwMW]/.test(ch)) return 0.88;
  return 0.57;
}
export const textW = (s, size) => [...String(s)].reduce((a, ch) => a + charW(ch), 0) * size;
const graphemes = s => [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(s)].map(x => x.segment);
export function wrap(text, { lang = 'en', size, maxW, maxLines = 99 }) {
  const seg = new Intl.Segmenter(lang, { granularity: 'word' }), toks = [...seg.segment(String(text).replace(/\s+/g, ' ').trim())].map(x => x.segment);
  const lines = []; let cur = '';
  const push = t => { if (textW((cur + t).trimEnd(), size) <= maxW || !cur.trim()) { cur += t; return; } lines.push(cur.trim()); cur = t.trimStart(); };
  for (const t of toks) {
    if (textW(t, size) > maxW) { for (const g of graphemes(t)) push(g); continue; } // từ quá dài → cắt theo cụm ký tự (không tách dấu khỏi chữ)
    if (/^[\s]+$/.test(t) && !cur) continue;
    // dấu câu đóng không đứng đầu dòng (、。,.!?)」 …)
    if (/^[、。，．,.!?！？)）」』%:;]+$/.test(t) && cur === '' && lines.length) { lines[lines.length - 1] += t; continue; }
    push(t);
  }
  if (cur.trim()) lines.push(cur.trim());
  if (lines.length > maxLines) { const keep = lines.slice(0, maxLines); let last = keep.at(-1); while (last && textW(last + '…', size) > maxW) last = graphemes(last).slice(0, -1).join(''); keep[maxLines - 1] = last.trimEnd() + '…'; return { lines: keep, truncated: true }; }
  return { lines, truncated: false };
}
// Cỡ chữ lớn nhất (76 → 44) để tiêu đề vừa ≤ 4 dòng
export function fitTitle(title, lang, { maxW = 800, maxLines = 4, sizes = [76, 72, 68, 64, 60, 56, 52, 48, 44] } = {}) {
  for (const size of sizes) { const r = wrap(title, { lang, size, maxW, maxLines: 99 }); if (r.lines.length <= maxLines) return { size, lines: r.lines, truncated: false }; }
  const size = sizes.at(-1); return { size, ...wrap(title, { lang, size, maxW, maxLines }) };
}

// ---------- Mẫu ảnh bìa (SVG → resvg trên CI) ----------
export function fontStack(lang) {
  const script = { ar: "'Noto Sans Arabic'", hi: "'Noto Sans Devanagari'", th: "'Noto Sans Thai'", zh: "'Noto Sans CJK SC'", ja: "'Noto Sans CJK JP'", ko: "'Noto Sans CJK KR'" }[lang];
  const latin = lang === 'ru' ? "'Noto Sans', 'Be Vietnam Pro'" : "'Be Vietnam Pro', 'Noto Sans'";
  return [script, latin, "'Noto Sans Arabic', 'Noto Sans Devanagari', 'Noto Sans Thai', 'Noto Sans CJK SC'"].filter(Boolean).join(', ').replace(/"/g, "'");
}
// Kit: nguồn DUY NHẤT web/js/kit.js (docs/BRAND-RULES.md) – chạy trong vm như build-social-kit.mjs
let KIT = null;
export function kitSvg(mood, size, root = process.cwd()) {
  if (!KIT) { const ctx = { self: {} }; vm.runInNewContext(fs.readFileSync(path.join(root, 'web/js/kit.js'), 'utf8'), ctx); KIT = ctx.self.Kit; }
  return KIT.svg(mood, size, false).replace(/ class=""/g, '').replace(/<!--[\s\S]*?-->/g, '').replace(/\n\s*/g, '');
}
export function markSvg(root = process.cwd()) { return fs.readFileSync(path.join(root, 'brand/lexkite-mark.svg'), 'utf8').replace(/<\?xml[^>]*>/, '').replace(/id="(pg2?)"/g, 'id="mk-$1"').replace(/url\(#(pg2?)\)/g, 'url(#mk-$1)').replace(/\n\s*/g, ''); }
const place = (svg, x, y, size) => svg.replace(/^<svg\b/, `<svg x="${x}" y="${y}"`).replace(/\swidth="[^"]*"/, ` width="${size}"`).replace(/\sheight="[^"]*"/, ` height="${size}"`);
const ICON_PATHS = { // icon chủ đề 48×48, nét teal
  book: '<path d="M8 10h13a5 5 0 0 1 5 5v25a4 4 0 0 0-4-4H8z M40 10H27a5 5 0 0 0-5 5v25a4 4 0 0 1 4-4h14z" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linejoin="round"/>',
  target: '<circle cx="24" cy="24" r="16" fill="none" stroke="currentColor" stroke-width="3.2"/><circle cx="24" cy="24" r="9" fill="none" stroke="currentColor" stroke-width="3.2"/><circle cx="24" cy="24" r="3" fill="currentColor"/>',
  bulb: '<path d="M24 6a12 12 0 0 0-7 21.7V32h14v-4.3A12 12 0 0 0 24 6z M18 37h12 M20 42h8" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>',
  blocks: '<rect x="6" y="26" width="15" height="14" rx="3" fill="none" stroke="currentColor" stroke-width="3.2"/><rect x="27" y="26" width="15" height="14" rx="3" fill="none" stroke="currentColor" stroke-width="3.2"/><rect x="16" y="8" width="16" height="14" rx="3" fill="none" stroke="currentColor" stroke-width="3.2"/>',
  mic: '<rect x="17" y="6" width="14" height="22" rx="7" fill="none" stroke="currentColor" stroke-width="3.2"/><path d="M11 22a13 13 0 0 0 26 0 M24 35v7 M17 42h14" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/>',
  chat: '<path d="M8 10h32v20H22l-9 8v-8H8z" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linejoin="round"/><path d="M15 20h18" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/>',
  ear: '<path d="M14 20a10 10 0 0 1 20 0c0 7-7 9-7 15a5 5 0 0 1-9 2" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/>',
  pen: '<path d="M10 38l4-11L32 9l7 7-18 18zM28 13l7 7" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linejoin="round"/>',
};
export function coverSvg(spec, { kit, mark } = {}) {
  const rtl = RTL.has(spec.lang), F = fontStack(spec.lang), M = 96, TW = 800;
  const t = fitTitle(spec.title, spec.lang, { maxW: TW });
  const lh = Math.round(t.size * (['th', 'hi', 'ar'].includes(spec.lang) ? 1.32 : 1.18)), top = 330, chipW = Math.round(textW(spec.chip, 28) + 56);
  const tx = rtl ? W - M : M, anchor = rtl ? 'end' : 'start', chipX = rtl ? W - M - chipW : M;
  const kitX = rtl ? 70 : W - 70 - 360, iconCX = rtl ? 360 : W - 360, k = kit ?? kitSvg(spec.mood, 360);
  const lines = t.lines.map((l, i) => `<text x="${tx}" y="${top + i * lh}" font-size="${t.size}" font-weight="800" text-anchor="${anchor}" fill="${BRAND.cream}">${esc(l)}</text>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="${F}">`
    + `<defs><linearGradient id="cv-g" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${BRAND.coral}"/><stop offset="1" stop-color="${BRAND.apricot}"/></linearGradient>`
    + `<radialGradient id="cv-r" cx="${rtl ? '.18' : '.82'}" cy=".62" r=".55"><stop offset="0" stop-color="${BRAND.glow}" stop-opacity=".9"/><stop offset="1" stop-color="${BRAND.teal}" stop-opacity="0"/></radialGradient></defs>`
    + `<rect width="${W}" height="${H}" fill="${BRAND.teal}"/><rect width="${W}" height="${H}" fill="url(#cv-r)"/>`
    + `<circle cx="${rtl ? 120 : W - 120}" cy="90" r="190" fill="${BRAND.teal2}" opacity=".55"/><rect y="${H - 12}" width="${W}" height="12" fill="url(#cv-g)"/>`
    + place(mark ?? markSvg(), M, 56, 72)
    + `<text x="${M + 84}" y="108" font-family="'Bricolage Grotesque', 'Be Vietnam Pro', sans-serif" font-size="46" font-weight="800"><tspan fill="${BRAND.cream}">lex</tspan><tspan fill="url(#cv-g)">kite</tspan></text>`
    + `<rect x="${chipX}" y="196" width="${chipW}" height="56" rx="28" fill="${BRAND.coral}"/><text x="${chipX + chipW / 2}" y="234" font-size="28" font-weight="700" text-anchor="middle" fill="${BRAND.cream}">${esc(spec.chip)}</text>`
    + lines
    + `<circle cx="${iconCX}" cy="200" r="62" fill="${BRAND.cream2}"/><g transform="translate(${iconCX - 36} 164) scale(1.5)" color="${BRAND.teal}">${ICON_PATHS[spec.icon] || ICON_PATHS.book}</g>`
    + place(k, kitX, H - 20 - 360, 360)
    + `<text x="${rtl ? W - M : M}" y="${H - 44}" font-size="24" fill="${BRAND.cream2}" opacity=".75" text-anchor="${anchor}" font-family="'Be Vietnam Pro', 'Noto Sans'">lexkite.com</text>`
    + `</svg>`;
}

// ---------- Sơ đồ nhẹ (nhúng thẳng HTML – chữ chọn được, máy tìm kiếm đọc được) ----------
function diagramErrors(o) {
  const e = [], str = v => typeof v === 'string' || typeof v === 'number';
  if (o.title != null && !str(o.title)) e.push('title phải là chữ');
  if (o.type === 'timeline') {
    const span = o.span ?? [-3, 2]; if (!Array.isArray(span) || span.length !== 2 || !(span[0] < span[1])) e.push('span phải [từ, đến] với từ < đến');
    if (!Array.isArray(o.events) || !o.events.length || o.events.length > 8) e.push('events: 1–8 mục {at, label} hoặc {from, to, label}');
    else o.events.forEach((v, i) => { if (!v || !str(v.label) || !(Number.isFinite(v.at) || (Number.isFinite(v.from) && Number.isFinite(v.to) && v.from < v.to))) e.push(`events[${i}] cần label + at (điểm) hoặc from<to (khoảng)`); });
    if (o.now != null && !str(o.now)) e.push('now phải là chữ (nhãn mốc hiện tại)');
  } else if (o.type === 'boxes') {
    if (!Array.isArray(o.parts) || o.parts.length < 2 || o.parts.length > 10) e.push('parts: 2–10 mục {t: "chữ", r: "vai trò"}');
    else o.parts.forEach((v, i) => { if (!v || !str(v.t)) e.push(`parts[${i}] thiếu t`); });
  } else if (o.type === 'compare') {
    if (!Array.isArray(o.cols) || o.cols.length < 2 || o.cols.length > 4 || !o.cols.every(str)) e.push('cols: 2–4 tiêu đề cột');
    if (!Array.isArray(o.rows) || !o.rows.length || o.rows.length > 12) e.push('rows: 1–12 hàng');
    else o.rows.forEach((r, i) => { if (!Array.isArray(r) || r.length !== (o.cols || []).length || !r.every(str)) e.push(`rows[${i}] phải có đúng ${(o.cols || []).length} ô chữ`); });
  }
  return e;
}
const C = { line: 'currentColor', fill: '#17595A', hot: '#E5502F', sun: '#FFB054' }; // chỉ màu token BRAND-RULES; nét = màu chữ (hợp nền sáng/tối)
export function diagramHtml(o, lang = 'en', caption = '') {
  const dir = RTL.has(lang) ? ' dir="rtl"' : '', cap = caption ? `<figcaption>${caption}</figcaption>` : '', title = o.title ? esc(o.title) : '';
  if (o.type === 'compare') {
    return `<figure class="diagram dg-compare"${dir}><div class="tbl"><table>${title ? `<caption>${title}</caption>` : ''}<thead><tr>${o.cols.map(c => `<th scope="col">${esc(c)}</th>`).join('')}</tr></thead><tbody>${o.rows.map(r => `<tr>${r.map((c, i) => i ? `<td>${esc(c)}</td>` : `<th scope="row">${esc(c)}</th>`).join('')}</tr>`).join('')}</tbody></table></div>${cap}</figure>`;
  }
  const fs_ = 15, uid = `dg-${o.id}`;
  if (o.type === 'boxes') {
    const pad = 14, gap = 12, maxW = 720; let x = 0, y = 0, rowH = 70; const items = [];
    for (const p of o.parts) { const w = Math.round(Math.max(textW(p.t, 17), textW(p.r || '', 13)) + pad * 2); if (x && x + w > maxW) { x = 0; y += rowH + 10; } items.push({ ...p, x, y, w }); x += w + gap; }
    const h = y + rowH + (o.note ? 30 : 4), vbW = Math.min(maxW, Math.max(...items.map(i => i.x + i.w)));
    const body = items.map((p, i) => `<g><rect x="${p.x + 1}" y="${p.y + 1}" width="${p.w - 2}" height="44" rx="10" fill="${i % 2 ? C.sun : C.fill}" fill-opacity="${i % 2 ? '.22' : '.14'}" stroke="${i % 2 ? C.sun : C.line}" stroke-width="2"/><text x="${p.x + p.w / 2}" y="${p.y + 29}" text-anchor="middle" font-size="17" font-weight="700" fill="currentColor">${esc(p.t)}</text>${p.r ? `<text x="${p.x + p.w / 2}" y="${p.y + 64}" text-anchor="middle" font-size="13" fill="currentColor" opacity=".75">${esc(p.r)}</text>` : ''}</g>`).join('');
    const note = o.note ? `<text x="0" y="${h - 8}" font-size="${fs_ - 1}" fill="currentColor" opacity=".8">${esc(o.note)}</text>` : '';
    return `<figure class="diagram dg-boxes"><svg xmlns="http://www.w3.org/2000/svg" viewBox="-2 -2 ${Math.ceil(vbW) + 4} ${Math.ceil(h) + 4}" width="${Math.ceil(vbW) + 4}" height="${Math.ceil(h) + 4}" aria-labelledby="${uid}"><title id="${uid}">${title || esc(o.parts.map(p => p.t).join(' '))}</title>${body}${note}</svg>${cap}</figure>`;
  }
  // timeline: trục thời gian, mốc "now", điểm (●) và khoảng (thanh)
  const [a, b] = o.span ?? [-3, 2], Wd = 720, L = 30, R = Wd - 30, X = v => Math.round(L + (v - a) / (b - a) * (R - L)), axisY = 150;
  const ev = o.events.map((v, i) => {
    const up = i % 2 === 0, ly = up ? axisY - 46 - (i % 4 === 0 ? 0 : 28) : axisY + 52 + (i % 4 === 1 ? 0 : 28);
    if (Number.isFinite(v.at)) { const x = X(v.at); return `<line x1="${x}" y1="${axisY}" x2="${x}" y2="${ly + (up ? 8 : -18)}" stroke="${C.line}" stroke-width="1.5" stroke-dasharray="3 3"/><circle cx="${x}" cy="${axisY}" r="8" fill="${C.fill}"/><text x="${x}" y="${ly}" text-anchor="middle" font-size="${fs_}" fill="currentColor">${esc(v.label)}</text>`; }
    const x1 = X(v.from), x2 = X(v.to); return `<rect x="${x1}" y="${axisY - 9}" width="${x2 - x1}" height="18" rx="9" fill="${C.sun}" fill-opacity=".55" stroke="${C.sun}"/><text x="${(x1 + x2) / 2}" y="${ly}" text-anchor="middle" font-size="${fs_}" fill="currentColor">${esc(v.label)}</text>`;
  }).join('');
  const nowX = X(0), nowL = o.now != null ? esc(o.now) : '';
  const svg = `<line x1="${L}" y1="${axisY}" x2="${R}" y2="${axisY}" stroke="${C.line}" stroke-width="3" stroke-linecap="round"/><path d="M${R} ${axisY - 7} l12 7 l-12 7z" fill="${C.line}"/>`
    + (a <= 0 && b >= 0 ? `<line x1="${nowX}" y1="${axisY - 26}" x2="${nowX}" y2="${axisY + 26}" stroke="${C.hot}" stroke-width="4" stroke-linecap="round"/>${nowL ? `<text x="${nowX}" y="${axisY + 44}" text-anchor="middle" font-size="${fs_}" font-weight="700" fill="${C.hot}">${nowL}</text>` : ''}` : '') + ev;
  return `<figure class="diagram dg-timeline"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${Wd} 260" width="${Wd}" height="260" aria-labelledby="${uid}"${dir}><title id="${uid}">${title || esc(o.events.map(e => e.label).join(' · '))}</title>${svg}</svg>${cap}</figure>`;
}

// ---------- Alt tự sinh + luật "alt đúng sự thật" ----------
const clip = (s, n) => { const g = graphemes(String(s)); return g.length > n ? g.slice(0, n - 1).join('').trimEnd() + '…' : String(s); };
export function autoAlt(rec, lang) {
  const L = LABEL[lang] || LABEL.en;
  if (rec.kind === 'cover') return clip(`${L.cover}: ${rec.title} – ${rec.chip}, ${L.kit}`, 180);
  const cap = rec.cap || {}, head = (cap.headings || [])[0] || cap.route || '', rest = [];
  for (const t of [...(cap.headings || []).slice(1), ...(cap.texts || [])]) { if (rest.length >= 4) break; if (t && t !== head && !rest.includes(t) && [...t].length <= 40) rest.push(t); }
  let alt = `${L.shot}: ${head}`; for (const t of rest) { const next = alt + (alt.includes(' – ') ? ', ' : ' – ') + t; if ([...next].length > 160) break; alt = next; }
  return alt;
}
const nrm = s => String(s ?? '').normalize('NFKC').toLowerCase().replace(/[’‘`]/g, "'").replace(/\s+/g, ' ').trim();
const digits = s => (String(s).match(/\p{N}+(?:[.,  ]\p{N}{3})*(?:[.,]\p{N}+)?/gu) || []).map(n => n.replace(/[^\p{N}]/gu, ''));
const LATIN_OK = new Set(['lexkite', 'kit']);
// Điều alt "khẳng định": số, cụm trong ngoặc kép, từ Latin trong bài chữ không Latin (vd. tên từ tiếng Anh trên màn hình)
export function altClaims(alt, lang) {
  const s = String(alt ?? ''), out = [];
  for (const n of digits(s)) out.push({ kind: 'number', v: n });
  for (const m of s.matchAll(/“([^”]{1,60})”|"([^"]{1,60})"|«\s?([^»]{1,60}?)\s?»|„([^“”]{1,60})[“”]|「([^」]{1,60})」|『([^』]{1,60})』|‘([^’]{1,60})’|(?:^|[\s(])'([^']{1,60})'(?=[\s).,;:!?]|$)/g)) out.push({ kind: 'quote', v: m.slice(1).find(x => x != null).trim() });
  if (['ar', 'hi', 'th', 'zh', 'ja', 'ko', 'ru'].includes(lang)) for (const m of s.matchAll(/[A-Za-z][A-Za-z'-]{2,}/g)) if (!LATIN_OK.has(m[0].toLowerCase())) out.push({ kind: 'latin', v: m[0] });
  return out;
}
export function recordCorpus(rec) {
  const c = rec.cap || {};
  return [rec.title, rec.chip, c.route, c.title, ...(c.headings || []), ...(c.texts || [])].filter(Boolean).join(' \u0001 ');
}
// → mảng điều alt khẳng định mà bản ghi chụp KHÔNG có (rỗng = đạt)
export function altUntruths(alt, rec, lang) {
  const corpus = recordCorpus(rec), cn = nrm(corpus), nums = new Set(digits(corpus));
  return altClaims(alt, lang).filter(c => c.kind === 'number' ? !nums.has(c.v) : !cn.includes(nrm(c.v))).map(c => `${c.kind === 'number' ? 'số' : c.kind === 'quote' ? 'cụm' : 'từ'} "${c.v}"`);
}

// ---------- Trần dung lượng + schema sổ ảnh ----------
export function overBudget(bytes, budgetKB = 60) { // bytes: { "1440.avif": n, … } → các bản AVIF lớn nhất vượt trần
  const av = Object.entries(bytes || {}).filter(([k]) => k.endsWith('.avif')).map(([k, v]) => [parseInt(k, 10), v]).sort((a, b) => b[0] - a[0]);
  return av.length && av[0][1] > budgetKB * 1024 ? [`AVIF ${av[0][0]} px = ${(av[0][1] / 1024).toFixed(1)} KB > ${budgetKB} KB`] : [];
}
export function validateItem(id, m, { budgetKB = 60 } = {}) {
  const e = [], E = s => e.push(`${id}: ${s}`);
  if (!m || typeof m !== 'object') return [`${id}: không phải object`];
  if (!Number.isInteger(m.w) || !Number.isInteger(m.h) || m.w < 16 || m.h < 16) E('w/h phải là số nguyên (giữ width/height chống CLS)');
  if (!Array.isArray(m.widths) || !m.widths.length || !m.widths.every((w, i) => Number.isInteger(w) && w > 0 && w <= 1440 && (!i || w > m.widths[i - 1]))) E('widths phải tăng dần, ≤ 1440');
  if (!m.kind) { if (!/^[0-9a-f]{10}$/.test(m.hash || '')) E('hash (ảnh chung) phải 10 ký tự hex'); return e; }
  if (!['cover', 'shot'].includes(m.kind)) E(`kind "${m.kind}" phải cover | shot`);
  if (!/^[0-9a-f]{16}$/.test(m.hash || '') || m.key !== `p/${m.hash}`) E('hash 16 hex và key = p/<hash> (tên theo nội dung → khử trùng, cache vĩnh viễn)');
  if (!/^[0-9a-f]{12}$/.test(m.in || '')) E('in (mã băm đầu vào) phải 12 hex');
  if (!/^[a-z]{2}\/[a-z0-9-]+$/.test(m.post || '') || !id.startsWith(m.post.replace('/', '-') + '--')) E('post phải "<lang>/<slug>" khớp khóa');
  if ([...String(m.alt || '')].length < 10) E('alt tự sinh ≥ 10 ký tự');
  if (m.kind === 'cover' && (!m.title || !m.chip)) E('ảnh bìa cần title + chip (bản ghi để kiểm alt)');
  if (m.kind === 'shot') { const c = m.cap; if (!c || !ROUTE.test(c.route || '') || !Array.isArray(c.headings) || !Array.isArray(c.texts) || !c.at || !LANGS.includes(c.lang)) E('shot cần cap {route, lang, headings[], texts[], at}'); }
  if (!m.bytes || typeof m.bytes !== 'object') E('thiếu bytes (dung lượng từng bản)'); else for (const x of overBudget(m.bytes, budgetKB)) E(x);
  return e;
}

// ---------- Trang có thật trong app (route hợp lệ) – quét `routes.<tên> =` trong web/js ----------
let ROUTES = null;
export function appRoutes(root = process.cwd()) {
  if (ROUTES) return ROUTES;
  const set = new Set(), walk = d => { for (const f of fs.existsSync(d) ? fs.readdirSync(d) : []) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) { if (f !== 'i18n') walk(p); } else if (f.endsWith('.js')) for (const m of fs.readFileSync(p, 'utf8').matchAll(/routes(?:\.([A-Za-z0-9_]+)|\[['"]([a-z0-9-]+)['"]\])\s*=[^=]/g)) set.add(m[1] || m[2]); } };
  walk(path.join(root, 'web/js'));
  return (ROUTES = set);
}
export const routeName = r => String(r).replace(/^#\//, '').split(/[/?]/)[0];
