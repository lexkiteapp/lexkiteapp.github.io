// Văn bản page Facebook theo ngôn ngữ + trang tải cho chủ: brand/social/channel-kit/<lang>/page-info.md và download.html (docs: brand/social/channel-kit/README.md)
//   node scripts/social/build-page-info.mjs            # sinh lại file (nhẹ, chạy được trên máy)
//   node scripts/social/build-page-info.mjs --check    # chạy trong npm test: file đã commit khớp nguồn + cổng nội dung (bio ≤ 100, UTM, link cài từ một nguồn, không lẫn tiếng)
// Chữ: scripts/social/channel-copy.mjs (INFO). Link cài: web/js/ext-config.js (nguồn DUY NHẤT: add-on + Google Play + App Store). Không đăng nhập/đăng gì lên Facebook – chủ tự tải lên.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { COPY, INFO, KIT_LANGS, RTL, SCRIPT, FB_CATEGORY } from './channel-copy.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.join(ROOT, 'brand/social/channel-kit');
export const LANGS = ['vi', ...KIT_LANGS.filter(l => l !== 'vi')];
export const NAMES = { vi: 'Tiếng Việt', es: 'Español', pt: 'Português', de: 'Deutsch', fr: 'Français', ru: 'Русский', tr: 'Türkçe', ar: 'العربية', hi: 'हिन्दी' };
export const BIO_MAX = 100;
const cp = s => [...String(s)].length;

/** ext-config.js tự gán self.LK_EXT / self.LK_APPS → chạy trong hộp rỗng để lấy giá trị (không đọc bằng regex). */
export function installLinks() {
  const self = {}; new Function('self', fs.readFileSync(path.join(ROOT, 'web/js/ext-config.js'), 'utf8'))(self);
  return { addon: self.LK_EXT.store, play: self.LK_APPS.play, ios: self.LK_APPS.ios || '' };
}
const utm = lang => `utm_source=facebook&utm_medium=page&utm_campaign=${lang}`;
export const webUrl = lang => `https://lexkite.com/${lang}/?${utm(lang)}`;
export function linksOf(lang, L = installLinks()) {
  const referrer = encodeURIComponent(utm(lang));
  const out = { web: webUrl(lang), addon: `${L.addon}?hl=${lang}`, play: `${L.play}&hl=${lang}&referrer=${referrer}` };
  if (L.ios) out.ios = `${L.ios}${L.ios.includes('?') ? '&' : '?'}ct=facebook_${lang}`;
  return out;
}
const files = lang => ({ cover: `facebook/lexkite-facebook-cover-1640x624-${lang}.png`, cover2x: lang === 'vi' ? '' : `facebook/lexkite-facebook-cover-1640x624-${lang}@2x.png`, avatar: 'facebook/lexkite-facebook-profile-1080.png',
  banner: `youtube/lexkite-youtube-banner-2560x1440-${lang}.png`, thumb: `youtube/lexkite-youtube-thumbnail-template-1280x720-${lang}.png` });

export function infoMd(lang, L = installLinks()) {
  const i = INFO[lang], k = linksOf(lang, L), f = files(lang);
  return `# Lexkite – page Facebook ${NAMES[lang]} (\`${lang}\`)

> Sinh tự động từ \`scripts/social/channel-copy.mjs\` + \`web/js/ext-config.js\` (\`node scripts/social/build-page-info.mjs\`) – đừng sửa tay. Chủ tự tải lên Facebook; không dùng tài khoản thật trong repo.

## Ảnh
| Mục | File (trong \`brand/social/channel-kit/\`) | Cỡ |
|---|---|---|
| Ảnh bìa | \`${f.cover}\` | 1640×624${f.cover2x ? `\n| Ảnh bìa nét cao (@2x) | \`${f.cover2x}\` | 3280×1248` : ''}
| Ảnh đại diện | \`${f.avatar}\` (logo nguyên bản, dùng chung mọi ngôn ngữ) | 1080×1080 |
| Banner YouTube (nếu có kênh) | \`${f.banner}\` | 2560×1440 |

## Tên page (đề xuất)
${i.name}

## Bio / mô tả ngắn (${cp(i.bio)}/${BIO_MAX} ký tự)
${i.bio}

## Giới thiệu
${i.about}

## Hạng mục
${FB_CATEGORY} (Giáo dục)

## Nút kêu gọi (CTA) + website
- Nút: **${i.cta}** (Learn more) → ${k.web}
- Trường Website: ${k.web}

## Link tải
- Web app: ${k.web}
- Add-on Chrome/Edge: ${k.addon}
- Google Play: ${k.play}
${k.ios ? `- App Store: ${k.ios}` : '- App Store: chưa có link trong `web/js/ext-config.js` (`LK_APPS.ios`) – thêm ở đó thì file này tự cập nhật'}

## Khi đăng bài
Caption luôn có link web có UTM (\`utm_source\`, \`utm_medium=social\`, \`utm_campaign=<id clip>\`, \`utm_term=${lang}\`); với Facebook/YouTube/Threads/X link còn nằm ở **bình luận đầu** (nếu kênh GrabCast có quyền). **Không ghim được**: GrabCast và API nền tảng không có lệnh ghim bình luận – chủ ghim tay nếu muốn.

## Dịch ngược (soát nghĩa, i18n-qa)
${i.back}
`;
}

export function downloadHtml(L = installLinks()) {
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const row = (label, text, dir) => `<div class="row"><b>${esc(label)}</b><p dir="${dir}">${esc(text)}</p><button type="button" data-copy="${esc(text)}">Chép</button></div>`;
  const cards = LANGS.map(lang => {
    const i = INFO[lang], k = linksOf(lang, L), f = files(lang), dir = RTL.includes(lang) ? 'rtl' : 'ltr';
    return `<section id="${lang}"><h2>${esc(NAMES[lang])} <small>${lang}</small></h2>
  <img class="cover" src="${f.cover}" alt="Bìa ${lang}" width="820" height="312" loading="lazy">
  <p class="dl"><a href="${f.cover}" download>Bìa 1640×624</a>${f.cover2x ? ` <a href="${f.cover2x}" download>Bìa @2x</a>` : ''} <a href="${f.avatar}" download>Ảnh đại diện 1080</a> <a href="${f.banner}" download>Banner YouTube</a></p>
  ${row('Tên page', i.name, dir)}${row(`Bio (${cp(i.bio)}/${BIO_MAX})`, i.bio, dir)}${row('Giới thiệu', i.about, dir)}${row('Nút CTA', i.cta, dir)}
  ${row('Website / link CTA', k.web, 'ltr')}${row('Add-on', k.addon, 'ltr')}${row('Google Play', k.play, 'ltr')}${k.ios ? row('App Store', k.ios, 'ltr') : ''}</section>`;
  }).join('\n');
  return `<!doctype html>
<html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title>Lexkite – Bộ page theo ngôn ngữ</title>
<style>
:root{--bg:#f6faf9;--fg:#0b1f22;--mut:#4a6366;--card:#fff;--line:#cfe0de;--acc:#0a7f7a}
@media (prefers-color-scheme:dark){:root{--bg:#081315;--fg:#e8f1f0;--mut:#9db8b6;--card:#0e1f22;--line:#1f3a3d;--acc:#4fd1c5}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.5 system-ui,sans-serif}
header,main{max-width:900px;margin:0 auto;padding:16px}h1{font-size:1.4rem;margin:.4em 0}small{color:var(--mut);font-weight:400}
nav{display:flex;flex-wrap:wrap;gap:8px;margin:8px 0}nav a{padding:6px 12px;border:1px solid var(--line);border-radius:999px;color:var(--acc);text-decoration:none}
section{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:16px;margin:16px 0}
.cover{width:100%;height:auto;border-radius:8px;display:block}.dl{display:flex;flex-wrap:wrap;gap:10px;margin:10px 0}.dl a{color:var(--acc)}
.row{display:grid;grid-template-columns:130px 1fr auto;gap:10px;align-items:start;padding:8px 0;border-top:1px solid var(--line)}.row p{margin:0;overflow-wrap:anywhere}
button{font:inherit;padding:6px 12px;border-radius:8px;border:1px solid var(--acc);background:transparent;color:var(--acc);cursor:pointer}button.ok{background:var(--acc);color:var(--bg)}
@media (max-width:600px){.row{grid-template-columns:1fr}}
</style></head><body>
<header><h1>Lexkite – bộ page Facebook theo ngôn ngữ</h1>
<p>Tải ảnh, chép văn bản rồi dán vào page. Ảnh đại diện = logo nguyên bản (không đổi). Mở file này từ thư mục <code>brand/social/channel-kit/</code> (ảnh nằm cạnh). Chủ tự tải lên Facebook.</p>
<nav>${LANGS.map(l => `<a href="#${l}">${esc(NAMES[l])}</a>`).join('')}</nav></header>
<main>
${cards}
</main>
<script>document.addEventListener('click',function(e){var b=e.target.closest('[data-copy]');if(!b)return;var t=b.getAttribute('data-copy');(navigator.clipboard?navigator.clipboard.writeText(t):Promise.reject()).catch(function(){var a=document.createElement('textarea');a.value=t;document.body.appendChild(a);a.select();try{document.execCommand('copy')}catch(x){}a.remove()}).then(function(){b.textContent='Đã chép';b.classList.add('ok');setTimeout(function(){b.textContent='Chép';b.classList.remove('ok')},1500)})});</script>
</body></html>
`;
}

export function expected(L = installLinks()) {
  const m = new Map(LANGS.map(l => [`${l}/page-info.md`, infoMd(l, L)]));
  m.set('download.html', downloadHtml(L)); return m;
}

/** Cổng nội dung → mảng lỗi. */
export function problems(L = installLinks()) {
  const errs = [], VI_ONLY = /[ĂăĐđĨĩŨũƠơƯưẠ-ỹ]/;
  if (!/^https:\/\/chromewebstore\.google\.com\//.test(L.addon) || !/^https:\/\/play\.google\.com\/store\/apps\/details\?id=/.test(L.play)) errs.push('ext-config.js: link add-on/Google Play lạ');
  for (const lang of LANGS) {
    const i = INFO[lang], c = COPY[lang]; if (!i) { errs.push(`${lang}: thiếu INFO`); continue; } if (!c) { errs.push(`${lang}: thiếu COPY (ảnh)`); continue; }
    if (cp(i.bio) > BIO_MAX) errs.push(`${lang}: bio ${cp(i.bio)} > ${BIO_MAX} ký tự`);
    if (cp(i.bio) < 40) errs.push(`${lang}: bio quá ngắn`);
    if (i.about.length < 150 || i.about.length > 900) errs.push(`${lang}: Giới thiệu dài ${i.about.length} (150–900)`);
    for (const k of ['name', 'bio', 'about', 'cta', 'back']) if (!String(i[k] || '').trim()) errs.push(`${lang}: INFO.${k} trống`);
    if (!/Lexkite/.test(i.name) || !/IELTS/.test(i.bio) || !/TOEIC/.test(i.about)) errs.push(`${lang}: thiếu tên Lexkite/IELTS/TOEIC (giữ nguyên tên riêng)`);
    if (!/100\s?%|%\s?100/.test(i.bio + i.about)) errs.push(`${lang}: không nói "miễn phí 100%"`);
    if (lang !== 'vi' && VI_ONLY.test(JSON.stringify([i, c]))) errs.push(`${lang}: lẫn chữ tiếng Việt`);
    if (SCRIPT[lang] && !(SCRIPT[lang].test(i.bio) && SCRIPT[lang].test(i.about) && SCRIPT[lang].test(c.h1))) errs.push(`${lang}: văn bản không đúng hệ chữ`);
    if (lang !== 'vi' && i.about === INFO.es.about && lang !== 'es') errs.push(`${lang}: Giới thiệu trùng bản es (chưa dịch)`);
    const k = linksOf(lang, L), u = new URL(k.web);
    if (u.origin !== 'https://lexkite.com' || u.pathname !== `/${lang}/` || u.searchParams.get('utm_source') !== 'facebook' || u.searchParams.get('utm_medium') !== 'page' || u.searchParams.get('utm_campaign') !== lang) errs.push(`${lang}: link web sai đường dẫn/UTM`);
    if (!fs.existsSync(path.join(ROOT, 'web', lang, 'index.html'))) errs.push(`${lang}: không có trang web /${lang}/`);
    if (!k.play.includes(encodeURIComponent(utm(lang))) || !k.addon.startsWith(L.addon)) errs.push(`${lang}: link tải không từ ext-config`);
  }
  return errs;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const L = installLinks(), exp = expected(L), errs = problems(L);
  if (process.argv.includes('--check')) {
    for (const [f, txt] of exp) { const p = path.join(OUT, f); if (!fs.existsSync(p) || fs.readFileSync(p, 'utf8') !== txt) errs.push(`${f} cũ/thiếu → node scripts/social/build-page-info.mjs`); }
    if (errs.length) { console.error('✗ page-info:\n- ' + errs.join('\n- ')); process.exit(1); }
    console.log(`✓ page-info: ${LANGS.length} ngôn ngữ – bio ≤ ${BIO_MAX}, link web UTM, link tải từ ext-config, đúng hệ chữ, file khớp nguồn`);
  } else {
    if (errs.length) { console.error('✗ page-info:\n- ' + errs.join('\n- ')); process.exit(1); }
    for (const [f, txt] of exp) { const p = path.join(OUT, f); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, txt); }
    console.log(`✓ đã ghi ${exp.size} file → brand/social/channel-kit/`);
  }
}
