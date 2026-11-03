// Uy tín / E-E-A-T (docs/SEO-AUTHORITY.md): URL + nhãn 15 ngôn ngữ + nút schema Organization dùng chung – MỘT NGUỒN cho generator
// (scripts/build-authority.mjs), chân trang chung (site-layout.mjs siteFooter), tác giả bài blog (build-blog.mjs) và trang chủ (build-landing.mjs).
// Không import site-layout (tránh vòng). Trung thực tuyệt đối: không bịa người, chức danh, bằng cấp, đánh giá; sameAs chỉ kênh THẬT (profiles.json).
import fs from 'node:fs';
export const AUTH_LANGS = ['vi', 'en', 'es', 'pt', 'fr', 'de', 'id', 'th', 'zh', 'ja', 'ko', 'hi', 'ar', 'ru', 'tr'];
export const SITE = 'https://lexkite.com';
// Slug vĩnh viễn (đổi = mất thứ hạng/backlink). Tiếng Anh ở mọi ngôn ngữ: trang uy tín ít truy vấn bản địa, link ngoài dễ chia sẻ.
export const AUTH_SLUGS = { hub: 'about/', team: 'about/editorial-team/', policy: 'about/editorial-policy/', corrections: 'about/corrections/', sources: 'about/sources/', research: 'research/confused-words/', embed: 'embed/' };
export const authPath = (lang, kind) => `/${lang}/${AUTH_SLUGS[kind]}`;
export const DATASET = { csv: '/research/confused-words.csv', json: '/research/confused-words.json', license: 'https://creativecommons.org/licenses/by/4.0/', doi: '10.5281/zenodo.23662626', repo: 'https://github.com/lexkiteapp/confused-words-dataset' };
const cache = {};
export const authStrings = lang => {
  if (lang in cache) return cache[lang];
  const f = `content/authority/i18n/${lang}.json`;
  return (cache[lang] = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null);
};
const has = lang => AUTH_LANGS.includes(lang) && !!authStrings(lang);
// Kênh thật: repo, hồ sơ đã live (placements.json) + trang add-on Chrome (ext-config.js) – test authority-pages kiểm từng URL
export const sameAs = () => {
  const p = JSON.parse(fs.readFileSync('content/authority/profiles.json', 'utf8'));
  const id = ((fs.existsSync('web/js/ext-config.js') ? fs.readFileSync('web/js/ext-config.js', 'utf8') : '').match(/store: '([^']+)'/) || [])[1];
  return [...p.sameAs.map(x => x.url), ...(p.store && id ? [id.startsWith('http') ? id : `https://chromewebstore.google.com/detail/${id}`] : [])];
};
// Nút Organization chuẩn (@id cố định → mọi trang tham chiếu cùng 1 thực thể). Không dùng EducationalOrganization: Lexkite là app, không phải trường.
export const orgNode = () => ({ '@type': 'Organization', '@id': `${SITE}/#org`, name: 'Lexkite', url: `${SITE}/`, logo: { '@type': 'ImageObject', url: `${SITE}/icons/icon-512.png?v=2`, width: 512, height: 512 }, email: 'support@lexkite.com', sameAs: sameAs(),
  legalName: 'MODIAN LUXURY JEWELRY LLC', publishingPrinciples: `${SITE}${authPath('en', 'policy')}`, correctionsPolicy: `${SITE}${authPath('en', 'corrections')}`, actionableFeedbackPolicy: `${SITE}${authPath('en', 'corrections')}` });
// Tác giả bài blog: đội biên tập (tổ chức con) – trang hồ sơ theo ngôn ngữ bài
export const editorialNode = lang => ({ '@type': 'Organization', '@id': `${SITE}/#editorial`, name: 'Lexkite Editorial Team', url: SITE + authPath(has(lang) ? lang : 'en', 'team'), parentOrganization: { '@id': `${SITE}/#org` } });
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// Dòng tác giả hiển thị trong bài blog (+ ngày kiểm chứng nếu có). Ngôn ngữ chưa có bản dịch → không hiện (không lẫn tiếng).
// Dữ liệu dòng tác giả (khung Stitch của bài blog): { team: [href, chữ], fc: [href, chữ] | null } | null (ngôn ngữ chưa có hồ sơ đội)
export const blogBylineData = (lang, factChecked, fmt) => {
  if (!has(lang)) return null;
  const s = authStrings(lang);
  return { team: [authPath(lang, 'team'), s.byline], fc: factChecked && !isNaN(Date.parse(factChecked)) ? [authPath(lang, 'policy'), s.factChecked.replace('{date}', fmt(Date.parse(factChecked)))] : null };
};
export const blogByline = (lang, factChecked, fmt) => {
  const b = blogBylineData(lang, factChecked, fmt); if (!b) return '';
  return `<span class="by"><a href="${b.team[0]}" rel="author">${esc(b.team[1])}</a>${b.fc ? ` · <a href="${b.fc[0]}">${esc(b.fc[1])}</a>` : ''}</span>`;
};
// Cột "Thông tin" của chân trang: trang Giới thiệu + chính sách biên tập + nghiên cứu (ngôn ngữ chưa có bản dịch → [] và giữ link cũ)
export const authFoot = lang => (has(lang) ? [[authPath(lang, 'policy'), authStrings(lang).nav.policy], [authPath(lang, 'research'), authStrings(lang).nav.research]] : []);
export const authAbout = lang => (has(lang) ? authPath(lang, 'hub') : null);
