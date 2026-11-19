// Công cụ miễn phí (docs/SEO-TOOLS.md): URL bản địa + nhãn 15 ngôn ngữ – MỘT NGUỒN cho generator (scripts/build-tools.mjs), chân trang chung
// (site-layout.mjs siteFooter), hộp liên kết trong bài blog cùng chủ đề (build-blog.mjs) và trang từ (build-seo-pages.mjs). Không import site-layout (tránh vòng).
import fs from 'node:fs';
export const TOOL_LANGS = ['vi', 'en', 'es', 'pt', 'fr', 'de', 'id', 'th', 'zh', 'ja', 'ko', 'hi', 'ar', 'ru', 'tr'];
// Slug vĩnh viễn (đổi = mất thứ hạng). Ngôn ngữ chữ Latinh: cụm từ khoá bản địa; chữ khác: ASCII tiếng Anh (URL gọn, không mã hoá %).
export const TOOL_SLUGS = {
  test: { vi: 'kiem-tra-trinh-do-tieng-anh', en: 'english-level-test', es: 'test-de-nivel-de-ingles', pt: 'teste-de-nivel-de-ingles', fr: 'test-de-niveau-anglais', de: 'englisch-einstufungstest', id: 'tes-level-bahasa-inggris', tr: 'ingilizce-seviye-testi', ru: 'test-na-uroven-angliyskogo' },
  toeic: { vi: 'luyen-toeic-part-5', en: 'toeic-part-5-practice', es: 'practica-toeic-part-5', pt: 'simulado-toeic-part-5', fr: 'entrainement-toeic-part-5', de: 'toeic-part-5-uebungen', id: 'latihan-toeic-part-5', tr: 'toeic-part-5-alistirmalari', ru: 'toeic-part-5-praktika' },
};
const DEF = { test: 'english-level-test', toeic: 'toeic-part-5-practice' };
export const toolPath = (lang, kind, lv) => `/${lang}/${TOOL_SLUGS[kind][lang] || DEF[kind]}/${lv ? lv.toLowerCase() + '/' : ''}`;
const cache = {};
export const toolStrings = lang => {
  if (cache[lang]) return cache[lang];
  const f = `content/tools/i18n/${lang}.json`;
  return (cache[lang] = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null);
};
const hasTools = lang => TOOL_LANGS.includes(lang) && !!toolStrings(lang);
// Cột "Học miễn phí" của chân trang mọi trang tĩnh: 2 công cụ theo ngôn ngữ trang (ngôn ngữ chưa có bản dịch → không hiện, không bao giờ lẫn tiếng)
export const toolFoot = lang => (hasTools(lang) ? [[toolPath(lang, 'test'), toolStrings(lang).nav.levelTest], [toolPath(lang, 'toeic'), toolStrings(lang).nav.toeic]] : []);
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// Bài blog cùng chủ đề → hộp liên kết công cụ (không sửa nội dung bài: chèn lúc dựng). TOEIC → quiz Part 5 (+ test); trình độ/CEFR/thi → test.
const RE_TOEIC = /toeic/i;
const RE_LEVEL = /cefr|\b[abc][12]\b|level|trình độ|band|placement|niveau|nivel|seviye|уровень|レベル|레벨|水平|ระดับ|स्तर|مستوى|ielts|toefl|grammar|ngữ pháp|vocabular|từ vựng/i;
export const blogToolBox = p => {
  const l = p.lang; if (!hasTools(l)) return '';
  const s = toolStrings(l), hay = [p.slug, p.title, p.keyword, p.category, ...(p.tags || [])].join(' ');
  const out = [];
  if (RE_TOEIC.test(hay)) out.push([toolPath(l, 'toeic'), s.nav.toeic, s.toeic.desc.replace('{n}', '210')]);
  if (RE_TOEIC.test(hay) || RE_LEVEL.test(hay)) out.push([toolPath(l, 'test'), s.nav.levelTest, s.test.desc]);
  if (!out.length) return '';
  return `<aside class="tool-links" aria-label="${esc(s.nav.tools)}"><p class="tl-h">${esc(s.nav.tools)}</p><ul>${out.map(([u, n, d]) => `<li><a href="${u}">${esc(n)}</a><br><small>${esc(d)}</small></li>`).join('')}</ul></aside>`;
};
export const TOOL_BOX_CSS = '.tool-links{margin:1.5rem 0;padding:.9rem 1.1rem;border:1px solid var(--line);border-radius:12px;background:var(--surface)}.tool-links .tl-h{margin:0 0 .4rem;font-weight:700}.tool-links ul{margin:0;padding-inline-start:1.1rem}.tool-links li{margin:.35rem 0}.tool-links a{display:inline-block;min-height:24px;font-weight:600}.tool-links small{color:var(--muted)}';
