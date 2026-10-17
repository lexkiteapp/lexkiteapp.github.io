// Hệ thiết kế chung cho mọi trang tĩnh của lexkite.com: blog (scripts/build-blog.mjs) + trang SEO dựng từ dữ liệu app
// (scripts/build-samples.mjs, scripts/build-samples-en.mjs: /tu-vung/, /ngu-phap/, /samples/, /speaking/, /viet-thu/, /en/…).
// Một nguồn CSS + header + footer + breadcrumb → giao diện đồng bộ. Màu CHỈ từ token thương hiệu (web/css/style.css :root,
// docs/BRAND-RULES.md) + các sắc độ phái sinh khai báo trong EXTRA_TOKENS – scripts/test/brand-check.mjs chặn màu ngoài bảng.
// Không phụ thuộc gói ngoài; font hệ thống; CSS nội tuyến (< 14 KB/trang), không JS chặn hiển thị.

export const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// Cắt mô tả meta ≤ n ký tự ở ranh giới từ (Google hiện ~155–160 ký tự; mô tả 200–320 ký tự bị cắt giữa chừng trên kết quả tìm kiếm)
export const clip = (s, n = 158) => { s = String(s ?? '').replace(/\s+/g, ' ').trim(); if (s.length <= n) return s; const c = s.slice(0, n - 1); return c.slice(0, Math.max(c.lastIndexOf(' '), n * .6)).replace(/[\s,;:–—-]+$/, '') + '…'; };
export const ld = o => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`;

// Sắc độ phái sinh dùng trong CSS dưới đây nhưng không nằm ở :root của style.css (link, chữ phụ chế độ tối, nền code, gradient CTA)
export const EXTRA_TOKENS = ['#B93A1D', '#a3a6bd', '#9fd8cf', '#7fd6cc', '#12807A', '#11132a', '#e8eaf6', '#e3e5ef', '#6b6f85', '#000', '#fff'];

// ---------- CSS gốc của blog (giữ nguyên từng byte – trang blog dựng ra không đổi) ----------
// CSS footer chung (cũng dùng ở trang pháp lý scripts/build-legal.mjs – trang đó nạp /css/style.css của app nên dùng biến có sẵn ở cả 2 nơi)
export const FOOT_CSS = `footer{border-top:1px solid var(--line);color:var(--muted);font-size:14px;background:var(--surface);margin-top:40px}footer .bar{display:block;max-width:1080px;margin:0 auto;padding:28px 16px 20px}.flogo{display:inline-flex;align-items:center;gap:8px;font-weight:800;font-size:18px;color:var(--text);text-decoration:none}.flogo b{color:var(--primary)}.flogo img{border-radius:8px}footer p{margin:.3em 0}.fcols{display:grid;grid-template-columns:1.4fr repeat(3,1fr);gap:24px}.fbrand p{max-width:34ch}footer h2{font-size:13px;text-transform:uppercase;letter-spacing:.06em;color:var(--text);margin:4px 0 8px}footer ul{list-style:none;margin:0;padding:0}footer li{margin:6px 0}footer a{color:var(--muted)}footer a:hover{color:var(--link,var(--primary))}.flangs{display:flex;flex-wrap:wrap;gap:4px 14px;border-top:1px solid var(--line);margin-top:20px;padding-top:14px}.flangs a[aria-current]{color:var(--text);font-weight:700}.ftm{font-size:13px}@media (max-width:720px){.fcols{grid-template-columns:1fr 1fr}.fbrand{grid-column:1/-1}}`;
export const CSS = `:root{--bg:#f5f6fb;--surface:#fff;--text:#171827;--muted:#4e526b;--line:#e2e4ef;--primary:#CC3F1C;--primary-ink:#fff;--primary-soft:#FFEBE4;--accent:#0D6964;--accent-soft:#DDF1EE;--brand:#0F3D3E;--link:#B93A1D;--r:16px;color-scheme:light dark}
@media (prefers-color-scheme:dark){:root{--bg:#0f1017;--surface:#181a24;--text:#eceef7;--muted:#a3a6bd;--line:#2b2e3e;--primary:#FF8466;--primary-ink:#1A0E0B;--primary-soft:#3A221C;--accent-soft:#10302f;--brand:#9fd8cf;--link:#FFA582}}
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}body{margin:0;background:var(--bg);color:var(--text);font:17px/1.7 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif}
a{color:var(--link);text-underline-offset:2px}a:focus-visible,button:focus-visible{outline:3px solid var(--accent);outline-offset:2px;border-radius:4px}
.skip{position:absolute;left:-999px;top:0;background:var(--surface);padding:8px 12px;z-index:9}.skip:focus{left:8px}
header.top{background:var(--surface);border-bottom:1px solid var(--line)}.bar{max-width:1080px;margin:0 auto;padding:10px 16px;display:flex;align-items:center;gap:16px;flex-wrap:wrap}
.logo{display:flex;align-items:center;gap:8px;font-weight:800;font-size:20px;color:var(--text);text-decoration:none;letter-spacing:-.02em}.logo b{color:var(--primary)}.logo img{border-radius:8px}
nav.main{display:flex;gap:4px 14px;flex-wrap:wrap;font-weight:600;font-size:15px;margin-left:auto;align-items:center}nav.main a{color:var(--text);text-decoration:none}nav.main a:hover{color:var(--primary)}
.btn{display:inline-block;background:var(--primary);color:var(--primary-ink)!important;padding:9px 16px;border-radius:999px;font-weight:700;text-decoration:none;font-size:15px}
main{max-width:1080px;margin:0 auto;padding:20px 16px 40px}
.crumbs{font-size:14px;color:var(--muted);margin:4px 0 12px}.crumbs a{color:var(--muted)}
article.post{max-width:740px;margin:0 auto}.post h1{font-size:clamp(28px,4.4vw,40px);line-height:1.2;margin:.2em 0 .4em;letter-spacing:-.02em;color:var(--text)}
.meta{color:var(--muted);font-size:14px;display:flex;flex-wrap:wrap;gap:4px 14px;margin-bottom:18px}.chip{display:inline-block;background:var(--accent-soft);color:var(--accent);padding:2px 10px;border-radius:999px;font-size:13px;font-weight:700;text-decoration:none}
@media (prefers-color-scheme:dark){.chip{color:#7fd6cc}}
.post h2{font-size:26px;line-height:1.3;margin:1.8em 0 .5em;letter-spacing:-.01em;scroll-margin-top:16px}.post h3{font-size:20px;margin:1.4em 0 .3em;scroll-margin-top:16px}.post h4{font-size:18px;margin:1.2em 0 .3em}
.post p,.post li{max-width:70ch}.post img{max-width:100%;height:auto;display:block;border-radius:12px}
figure{margin:24px 0}figure picture{display:block;border:1px solid var(--line);border-radius:12px;overflow:hidden;box-shadow:0 8px 28px rgba(20,20,60,.08)}figcaption{font-size:14px;color:var(--muted);text-align:center;margin-top:8px}
.cover{margin:0 0 20px}.diagram{margin:24px 0}.diagram svg{display:block;margin:0 auto;max-width:100%;height:auto}.diagram caption{caption-side:top;font-weight:700;padding:6px 0}
.toc{background:var(--surface);border:1px solid var(--line);border-radius:var(--r);padding:12px 18px;margin:18px 0}.toc summary{font-weight:700;cursor:pointer}.toc ol{margin:8px 0 0;padding-left:20px;font-size:15px;line-height:1.6}
blockquote{margin:20px 0;padding:10px 18px;background:var(--primary-soft);border-left:4px solid var(--primary);border-radius:0 12px 12px 0}blockquote p{margin:.4em 0}
.tbl{overflow-x:auto;margin:18px 0}table{border-collapse:collapse;width:100%;font-size:15px;background:var(--surface)}th,td{border:1px solid var(--line);padding:8px 10px;text-align:left;vertical-align:top}th{background:var(--accent-soft)}
code{background:var(--accent-soft);padding:1px 5px;border-radius:5px;font-size:.92em}pre{background:#11132a;color:#e8eaf6;padding:14px;border-radius:12px;overflow:auto}pre code{background:none;padding:0}
a.app{font-weight:600}
.copy{font-size:13px;color:var(--muted,#6b6f85);border-top:1px solid var(--line,#e3e5ef);padding-top:12px;margin-top:28px}.cta{background:linear-gradient(135deg,#0F3D3E,#12807A);color:#fff;border-radius:var(--r);padding:18px 20px;margin:28px 0;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}.cta p{margin:0;max-width:52ch}
.yt{position:relative;aspect-ratio:16/9;background:#000;border-radius:12px;overflow:hidden;margin:24px 0}.yt img,.yt iframe{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;border:0}.yt button{position:absolute;inset:0;margin:auto;width:72px;height:50px;border:0;border-radius:14px;background:#E5502F;cursor:pointer}.yt button::after{content:"";position:absolute;left:29px;top:15px;border-style:solid;border-width:10px 0 10px 17px;border-color:transparent transparent transparent #fff}
.tags{display:flex;gap:8px;flex-wrap:wrap;margin:24px 0}.tags a{border:1px solid var(--line);border-radius:999px;padding:3px 12px;font-size:14px;text-decoration:none;color:var(--text);background:var(--surface)}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:18px;margin:18px 0}.card{background:var(--surface);border:1px solid var(--line);border-radius:var(--r);overflow:hidden;display:flex;flex-direction:column}.card a.ti{color:var(--text);text-decoration:none}.card a.ti:hover h3,.card a.ti:hover h2{color:var(--primary)}
.card .pic picture{display:block;aspect-ratio:16/10;overflow:hidden}.card .pic img{width:100%;height:100%;object-fit:cover;object-position:top}.card .bd{padding:12px 16px 16px}.card h2,.card h3{font-size:18px;line-height:1.35;margin:6px 0}.card p{font-size:15px;color:var(--muted);margin:0}
.hero{padding:10px 0 4px}.hero h1{font-size:clamp(28px,4vw,40px);margin:.1em 0;letter-spacing:-.02em}.hero p{color:var(--muted);max-width:70ch;margin:.3em 0 0}
.cats{display:flex;gap:8px;flex-wrap:wrap;margin:14px 0}.cats a{padding:5px 14px;border-radius:999px;border:1px solid var(--line);background:var(--surface);text-decoration:none;color:var(--text);font-weight:600;font-size:15px}.cats a[aria-current]{background:var(--brand);border-color:var(--brand);color:#fff}
@media (prefers-color-scheme:dark){.cats a[aria-current]{color:#0f1017}}
.pager{display:flex;justify-content:space-between;gap:12px;margin:24px 0;font-weight:700}
.trybox{background:var(--surface);border:1px solid var(--line);border-radius:var(--r);padding:18px 20px;margin:32px 0}.trybox h2{margin:0 0 6px;font-size:20px}.trybox p{margin:0 0 12px;color:var(--muted)}
[dir=rtl] blockquote{border-left:0;border-right:4px solid var(--primary);border-radius:12px 0 0 12px}[dir=rtl] .toc ol{padding-left:0;padding-right:20px}[dir=rtl] th,[dir=rtl] td{text-align:right}[dir=rtl] .skip:focus{left:auto;right:8px}
${FOOT_CSS}
@media (prefers-reduced-motion:no-preference){html{scroll-behavior:smooth}}`;

// ---------- CSS bổ sung cho trang SEO dựng từ dữ liệu app (chỉ dùng biến màu ở trên + token style.css) ----------
// Sáng: nút cam đậm #CC3F1C (= --primary của app, chữ trắng đạt AA 4.9:1); tối giữ #FF8466 với chữ tối.
export const SEO_CSS = `@media (prefers-color-scheme:light){:root{--primary:#CC3F1C}}
:root{--spk:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 8v8a4.5 4.5 0 0 0 2.5-4zM14 3.2v2.1a7 7 0 0 1 0 13.4v2.1a9 9 0 0 0 0-17.6z'/%3E%3C/svg%3E")}
[hidden]{display:none!important}nav.main a[aria-current]{color:var(--primary)}
.lang{border:1px solid var(--line);border-radius:999px;padding:3px 10px;font-size:14px}
.hero .em{font-size:.95em;margin-right:10px}.hero .sub{display:flex;flex-wrap:wrap;gap:6px;margin:10px 0 0}
.chip.alt{background:var(--primary-soft);color:var(--link)}.chip.ink{background:var(--surface);color:var(--text);border:1px solid var(--line)}
.page{max-width:820px;margin:0 auto}.page h2{font-size:24px;line-height:1.3;margin:1.6em 0 .5em;letter-spacing:-.01em}.page h3{font-size:18px;margin:1.3em 0 .3em}
.cta{color:#fff}.cta strong{font-size:18px}.cta .btn{background:#fff;color:#0F3D3E!important}.cta small{display:block;opacity:.9;font-size:14px}
.q{background:var(--surface);border:1px solid var(--line);border-left:4px solid var(--brand);border-radius:12px;padding:14px 18px;font-weight:600}.q ul{font-weight:400;margin:.5em 0 0}.q .open{font-weight:400;font-size:15px;color:var(--muted)}
.ess{background:var(--surface);border:1px solid var(--line);border-radius:var(--r);padding:6px 22px;font-size:17.5px;line-height:1.8}.ess p{margin:.9em 0}
mark{background:var(--primary-soft);color:inherit;border-radius:4px;padding:0 2px;box-shadow:inset 0 -2px 0 var(--primary)}.ln{color:var(--accent)}@media (prefers-color-scheme:dark){.ln{color:#7fd6cc}}
.lb{display:inline-block;font-size:12px;font-weight:700;color:var(--accent);background:var(--accent-soft);border-radius:6px;padding:0 6px;margin-right:4px;vertical-align:1px}
.wt{border-collapse:separate;border-spacing:0;border:1px solid var(--line);border-radius:var(--r);overflow:hidden;font-size:16px;margin:12px 0}.wt th{color:var(--accent);font-size:12px;text-transform:uppercase;letter-spacing:.05em;border:0;border-bottom:1px solid var(--line);padding:10px 14px}.wt td{border:0;border-bottom:1px solid var(--line);padding:12px 14px}.wt tr:last-child td{border-bottom:0}.wt tbody tr:hover{background:var(--bg)}
.wt .w{font-weight:800;font-size:18px;white-space:nowrap}.ipa{font-family:"Lucida Sans Unicode","Arial Unicode MS","Segoe UI",sans-serif;color:var(--muted);font-size:15px}.pos{font-size:12px;font-weight:700;color:var(--muted);border:1px solid var(--line);border-radius:6px;padding:0 5px;margin-left:4px}
.ex{color:var(--muted);font-style:italic;font-size:15px}.wt .no{color:var(--muted);font-size:13px;width:2.5em}
.au{visibility:hidden;width:32px;height:32px;border:0;border-radius:50%;background:var(--accent-soft);color:var(--accent);cursor:pointer;vertical-align:middle;margin-right:8px;padding:0;display:inline-grid;place-items:center}.js .au{visibility:visible}.au::before{content:"";width:16px;height:16px;background:currentColor;-webkit-mask:var(--spk) center/contain no-repeat;mask:var(--spk) center/contain no-repeat}.au[aria-pressed=true]{background:var(--accent);color:var(--surface)}
@media (max-width:640px){.wt thead{display:none}.wt,.wt tbody,.wt tr,.wt td{display:block}.wt tr{padding:12px 14px;border-bottom:1px solid var(--line)}.wt tr:last-child{border-bottom:0}.wt td{border:0;padding:2px 0}.wt .no{display:none}}
.set .bd{display:flex;flex-direction:column;gap:4px;height:100%}.set .em{font-size:30px;line-height:1.2}.set .chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:auto;padding-top:10px}.has-em .bd{display:grid;grid-template-columns:auto 1fr;grid-template-rows:auto auto 1fr;gap:2px 14px}.has-em .bd>*{grid-column:2}.has-em .em{grid-column:1;grid-row:1/span 2}.has-em .chips{align-self:end}.set h2,.set h3{margin:2px 0}
.card a.ti{display:block;height:100%}.card a.ti:focus-visible{outline-offset:-3px}
.filter{visibility:hidden;margin:16px 0 4px}.js .filter{visibility:visible}.filter input{width:100%;max-width:520px;font:inherit;font-size:16px;padding:10px 16px;border:1px solid var(--line);border-radius:999px;background:var(--surface);color:var(--text)}.filter input:focus-visible{outline:3px solid var(--accent);outline-offset:2px}.filter output{display:block;font-size:14px;color:var(--muted);min-height:1.5em;margin-top:4px}
.grp{margin-top:28px}.grp h2{font-size:22px;margin:0 0 4px}.grp>p{color:var(--muted);margin:0}.grp h2 small{font-size:14px;color:var(--muted);font-weight:600;margin-left:6px}
.tip{background:var(--accent-soft);border-radius:12px;padding:12px 16px;margin:14px 0}.err{background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:10px 16px;margin:10px 0}.err s{color:var(--muted)}.err .why{color:var(--muted);font-size:15px}
.uses li{margin:.4em 0}.sig{display:flex;flex-wrap:wrap;gap:6px}.fx td:first-child{white-space:nowrap}
.ext{border:1px dashed var(--line);border-radius:var(--r);padding:14px 18px;margin:28px 0;display:flex;gap:12px;align-items:center;flex-wrap:wrap;background:var(--surface)}.ext p{margin:0;flex:1 1 260px;font-size:15px;color:var(--muted)}.ext strong{color:var(--text)}.ext button{background:none;border:0;color:var(--muted);font:inherit;font-size:14px;cursor:pointer;text-decoration:underline}
.pager a{max-width:48%}.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
@media (prefers-color-scheme:dark){.wt th,.au,.lb{color:#7fd6cc}.au[aria-pressed=true]{color:#0f1017;background:#7fd6cc}}`;

// ---------- Khối khung trang (header, footer, breadcrumb) – blog và trang SEO dùng chung ----------
export const siteHeader = ({ nav, open, home = '/', extra = '' }) => `<header class="top"><div class="bar"><a class="logo" href="${home}"><img src="/icons/icon.svg?v=2" width="32" height="32" alt=""><span>lex<b>kite</b></span></a>
<nav class="main" aria-label="Lexkite">${nav.map(([h, t, a = '']) => `<a href="${h}"${a}>${t}</a>`).join('')}<a class="btn" href="${open[0]}">${open[1]}</a>${extra}</nav></div></header>`;
// Footer chung cho MỌI trang tĩnh (blog 15 ngôn ngữ, trang SEO, 404, chọn ngôn ngữ blog): thương hiệu · Sản phẩm · Học miễn phí · Thông tin & pháp lý · đổi ngôn ngữ · ©.
// Trang pháp lý /<lang>/privacy|terms có đủ 15 ngôn ngữ (scripts/build-legal.mjs); #cookies, #delete là mốc trong trang privacy.
export const LANG_NAMES = { vi: 'Tiếng Việt', en: 'English', es: 'Español', pt: 'Português', fr: 'Français', de: 'Deutsch', id: 'Bahasa Indonesia', th: 'ไทย', zh: '简体中文', ja: '日本語', ko: '한국어', hi: 'हिन्दी', ar: 'العربية', ru: 'Русский', tr: 'Türkçe' };
//            [Sản phẩm, Học miễn phí, Thông tin, Ứng dụng web, Add-on Chrome, Blog, Từ vựng, Bài mẫu Writing, IELTS Speaking, Ngữ pháp, Giới thiệu, Liên hệ, Quyền riêng tư, Điều khoản, Cookie, Xóa dữ liệu, Ngôn ngữ]
export const FOOT = {
  vi: ['Sản phẩm', 'Học miễn phí', 'Thông tin', 'Ứng dụng web', 'Add-on Chrome', 'Blog', 'Từ vựng', 'Bài mẫu Writing', 'IELTS Speaking', 'Ngữ pháp', 'Giới thiệu', 'Liên hệ', 'Quyền riêng tư', 'Điều khoản', 'Cookie & lưu trữ', 'Xóa dữ liệu', 'Ngôn ngữ'],
  en: ['Product', 'Resources', 'Company', 'Web app', 'Chrome add-on', 'Blog', 'Vocabulary', 'Writing samples', 'IELTS Speaking', 'Grammar', 'About', 'Contact', 'Privacy', 'Terms', 'Cookies & storage', 'Delete my data', 'Language'],
  es: ['Producto', 'Recursos', 'Empresa', 'App web', 'Extensión de Chrome', 'Blog', 'Vocabulario', 'Ensayos modelo', 'IELTS Speaking', 'Gramática', 'Acerca de', 'Contacto', 'Privacidad', 'Términos', 'Cookies y almacenamiento', 'Eliminar mis datos', 'Idioma'],
  pt: ['Produto', 'Recursos', 'Empresa', 'App web', 'Extensão do Chrome', 'Blog', 'Vocabulário', 'Redações modelo', 'IELTS Speaking', 'Gramática', 'Sobre', 'Contato', 'Privacidade', 'Termos', 'Cookies e armazenamento', 'Excluir meus dados', 'Idioma'],
  fr: ['Produit', 'Ressources', 'Entreprise', 'Application web', 'Extension Chrome', 'Blog', 'Vocabulaire', 'Essais modèles', 'IELTS Speaking', 'Grammaire', 'À propos', 'Contact', 'Confidentialité', 'Conditions', 'Cookies et stockage', 'Supprimer mes données', 'Langue'],
  de: ['Produkt', 'Ressourcen', 'Unternehmen', 'Web-App', 'Chrome-Erweiterung', 'Blog', 'Wortschatz', 'Musteressays', 'IELTS Speaking', 'Grammatik', 'Über uns', 'Kontakt', 'Datenschutz', 'Nutzungsbedingungen', 'Cookies & Speicher', 'Meine Daten löschen', 'Sprache'],
  id: ['Produk', 'Sumber belajar', 'Perusahaan', 'Aplikasi web', 'Ekstensi Chrome', 'Blog', 'Kosakata', 'Contoh esai', 'IELTS Speaking', 'Tata bahasa', 'Tentang', 'Kontak', 'Privasi', 'Ketentuan', 'Cookie & penyimpanan', 'Hapus data saya', 'Bahasa'],
  th: ['ผลิตภัณฑ์', 'แหล่งเรียนรู้', 'เกี่ยวกับเรา', 'เว็บแอป', 'ส่วนขยาย Chrome', 'บล็อก', 'คำศัพท์', 'เรียงความตัวอย่าง', 'IELTS Speaking', 'ไวยากรณ์', 'เกี่ยวกับ', 'ติดต่อ', 'ความเป็นส่วนตัว', 'ข้อกำหนด', 'คุกกี้และพื้นที่จัดเก็บ', 'ลบข้อมูลของฉัน', 'ภาษา'],
  zh: ['产品', '学习资源', '公司', '网页版应用', 'Chrome 扩展', '博客', '词汇', '范文', '雅思口语', '语法', '关于', '联系我们', '隐私政策', '使用条款', 'Cookie 与本地存储', '删除我的数据', '语言'],
  ja: ['製品', '学習リソース', '運営', 'Web アプリ', 'Chrome 拡張機能', 'ブログ', '語彙', '模範エッセイ', 'IELTS スピーキング', '文法', '概要', 'お問い合わせ', 'プライバシー', '利用規約', 'Cookie とストレージ', 'データの削除', '言語'],
  ko: ['제품', '학습 자료', '회사', '웹 앱', 'Chrome 확장 프로그램', '블로그', '어휘', '모범 에세이', 'IELTS 스피킹', '문법', '소개', '문의하기', '개인정보처리방침', '이용약관', '쿠키 및 저장소', '내 데이터 삭제', '언어'],
  hi: ['उत्पाद', 'संसाधन', 'कंपनी', 'वेब ऐप', 'Chrome एक्सटेंशन', 'ब्लॉग', 'शब्दावली', 'नमूना निबंध', 'IELTS स्पीकिंग', 'व्याकरण', 'हमारे बारे में', 'संपर्क करें', 'गोपनीयता', 'शर्तें', 'कुकीज़ और स्टोरेज', 'मेरा डेटा हटाएँ', 'भाषा'],
  ar: ['المنتج', 'الموارد', 'الشركة', 'تطبيق الويب', 'إضافة Chrome', 'المدونة', 'المفردات', 'مقالات نموذجية', 'محادثة IELTS', 'القواعد', 'من نحن', 'اتصل بنا', 'الخصوصية', 'الشروط', 'ملفات تعريف الارتباط والتخزين', 'حذف بياناتي', 'اللغة'],
  ru: ['Продукт', 'Материалы', 'Компания', 'Веб-приложение', 'Расширение Chrome', 'Блог', 'Слова', 'Примеры эссе', 'IELTS Speaking', 'Грамматика', 'О нас', 'Контакты', 'Конфиденциальность', 'Условия', 'Cookie и хранилище', 'Удалить мои данные', 'Язык'],
  tr: ['Ürün', 'Kaynaklar', 'Şirket', 'Web uygulaması', 'Chrome eklentisi', 'Blog', 'Kelime', 'Örnek yazılar', 'IELTS Speaking', 'Dil bilgisi', 'Hakkında', 'İletişim', 'Gizlilik', 'Koşullar', 'Çerezler ve depolama', 'Verilerimi sil', 'Dil'],
};
const ABOUT = { vi: 'gioi-thieu', en: 'about', es: 'acerca-de', pt: 'sobre', fr: 'a-propos', de: 'ueber-uns', id: 'tentang', tr: 'hakkinda' };
// App học nằm ở /app/ (SPA, hash route); / và /<lang>/ là trang giới thiệu tĩnh (scripts/build-landing.mjs)
export const appHref = lang => lang === 'vi' ? '/app/' : `/app/?hl=${lang}`;
export const landingHref = lang => lang === 'vi' ? '/' : `/${lang}/`;
// lang: ngôn ngữ trang; text/tm: câu giới thiệu + ghi chú nhãn hiệu (theo ngôn ngữ); langHref(l): link bản ngôn ngữ l (mặc định trang chủ blog l)
export const siteFooter = ({ lang = 'en', text = '', tm = '', year = new Date().getFullYear(), extra = [], langHref }) => {
  const f = FOOT[lang] || FOOT.en, app = appHref(lang), vi = lang === 'vi', lg = `/${lang in LANG_NAMES ? lang : 'en'}`;
  const col = (h, items) => `<div><h2>${h}</h2><ul>${items.map(([u, n]) => `<li><a href="${u}">${n}</a></li>`).join('')}</ul></div>`;
  const product = [[app, f[3]], [`${app}#/settings`, f[4]]];
  const res = [[`${lg}/blog/`, f[5]], [vi ? '/tu-vung/' : '/en/vocabulary/', f[6]], ...(vi ? [['/ngu-phap/', f[9]]] : []), [vi ? '/samples/' : '/en/samples/', f[7]], [vi ? '/speaking/' : '/en/speaking/', f[8]], ...extra];
  const co = [[`${lg}/blog/${ABOUT[lang] || 'about'}/`, f[10]], [`${app}#/contact`, f[11]], [`${lg}/privacy`, f[12]], [`${lg}/terms`, f[13]], [`${lg}/privacy#cookies`, f[14]], [`${lg}/privacy#delete`, f[15]]];
  const langs = Object.entries(LANG_NAMES).map(([l, n]) => `<a href="${langHref ? langHref(l) : `/${l}/blog/`}" lang="${l}" hreflang="${l}"${l === lang ? ' aria-current="true"' : ''}>${n}</a>`).join('');
  return `<footer class="site-foot"><div class="bar"><div class="fcols"><div class="fbrand"><a class="flogo" href="${landingHref(lang in LANG_NAMES ? lang : 'en')}"><img src="/icons/icon.svg?v=2" width="28" height="28" alt=""><span>lex<b>kite</b></span></a><p>${text}</p></div>${col(f[0], product)}${col(f[1], res)}${col(f[2], co)}</div>
<nav class="flangs" aria-label="${f[16]}"><span aria-hidden="true">🌐</span>${langs}</nav><p class="ftm">${tm}</p><p class="ftm">© ${year} Lexkite</p></div></footer>`;
};
export const crumbsHtml = items => `<nav class="crumbs" aria-label="Breadcrumb">${items.map(([n, u], i) => i === items.length - 1 ? `<span aria-current="page">${esc(n)}</span>` : `<a href="${u}">${esc(n)}</a>`).join(' › ')}</nav>`;
export const crumbsLd = (site, items) => ({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items.map(([name, u], i) => ({ '@type': 'ListItem', position: i + 1, name, item: site + u })) });

// ---------- Trang SEO từ dữ liệu app (vi/en) ----------
export const SEO_L = {
  vi: {
    home: 'Trang chủ', skip: 'Bỏ qua đến nội dung', open: 'Mở app', app: '/app/',
    nav: [['/vi/blog/', 'Blog'], ['/tu-vung/', 'Từ vựng'], ['/ngu-phap/', 'Ngữ pháp'], ['/samples/', 'Bài mẫu'], ['/speaking/', 'Speaking']],
    sections: [['/tu-vung/', 'Từ vựng'], ['/ngu-phap/', 'Ngữ pháp'], ['/samples/', 'Bài mẫu Writing'], ['/speaking/', 'IELTS Speaking'], ['/viet-thu/', 'Thư mẫu IELTS General']],
    foot: 'Lexkite – học từ vựng & luyện thi IELTS, TOEIC, TOEFL miễn phí. Nội dung tự biên soạn, miễn phí cho người học.',
    tm: 'IELTS, TOEIC, TOEFL là nhãn hiệu của chủ sở hữu tương ứng; Lexkite là sản phẩm độc lập.',
    links: [['/vi/blog/', 'Blog'], ['/app/', 'Ứng dụng'], ['/vi/privacy', 'Quyền riêng tư'], ['/vi/terms', 'Điều khoản']],
    switchTo: ['English', 'en'], sectionsL: 'Chuyên mục', search: 'Lọc theo tên, chủ đề…', searchL: 'Lọc danh sách', found: n => `${n} kết quả`, none: 'Không có mục nào khớp – thử từ khóa khác.',
    play: w => `Nghe phát âm “${w}”`, related: 'Có thể bạn quan tâm', ext: ['Tra từ ngay khi đọc web.', 'Cài add-on Lexkite cho Chrome: bấm đúp vào từ bất kỳ để xem nghĩa, phiên âm và lưu vào flashcard.', 'Xem add-on', 'Ẩn'], extHref: '/app/#/settings',
    col: { no: '#', word: 'Từ', ipa: 'Phiên âm', mean: 'Nghĩa', ex: 'Ví dụ' }, words: 'từ', sets: 'bộ', lessons: 'bài', items: 'bài',
  },
  en: {
    home: 'Home', skip: 'Skip to content', open: 'Open app', app: '/app/?hl=en',
    nav: [['/en/blog/', 'Blog'], ['/en/vocabulary/', 'Vocabulary'], ['/en/samples/', 'Samples'], ['/en/speaking/', 'Speaking']],
    sections: [['/en/vocabulary/', 'Vocabulary'], ['/en/samples/', 'Writing samples'], ['/en/speaking/', 'IELTS Speaking']],
    foot: 'Lexkite – free vocabulary and IELTS, TOEIC, TOEFL practice. Original learning content, free for learners.',
    tm: 'IELTS, TOEIC and TOEFL are trademarks of their respective owners; Lexkite is independent.',
    links: [['/en/blog/', 'Blog'], ['/app/?hl=en', 'App'], ['/en/privacy', 'Privacy'], ['/en/terms', 'Terms']],
    switchTo: ['Tiếng Việt', 'vi'], sectionsL: 'Sections', search: 'Filter by name or topic…', searchL: 'Filter the list', found: n => `${n} results`, none: 'Nothing matches – try another word.',
    play: w => `Play pronunciation of “${w}”`, related: 'You may also like', ext: ['Look up words while you read.', 'Get the Lexkite add-on for Chrome: double-click any word for its meaning and IPA, then save it to your flashcards.', 'See the add-on', 'Hide'], extHref: '/app/?hl=en#/settings',
    col: { no: '#', word: 'Word', ipa: 'IPA', mean: 'Meaning', ex: 'Example' }, words: 'words', sets: 'sets', lessons: 'lessons', items: 'items',
  },
};

const COPY_MSG = { vi: 'Nguồn: ', en: 'Source: ' };
// Gắn nguồn khi sao chép > 200 ký tự (P1 chống cào – giống blog)
const copyJs = lang => `document.addEventListener('copy',e=>{const s=window.getSelection();if(!s||s.rangeCount===0)return;const t=s.toString();if(t.length<=200)return;const m="\\n\\n${COPY_MSG[lang] || COPY_MSG.en}"+document.title.replace(/\\s*[–|]\\s*Lexkite$/i,'')+" – "+location.href.split('#')[0]+" (Lexkite)";e.clipboardData.setData('text/plain',t+m);e.preventDefault();});`;
// JS nhỏ cuối trang (không chặn hiển thị): bật .js (hiện nút nghe/ô lọc – chỗ đã giữ sẵn, CLS 0), phát âm từ CDN audio, lọc thẻ, gợi ý add-on Chrome máy tính
const UI_JS = `(function(d){var r=d.documentElement;r.classList.add('js');var A='https://audio.lexkite.com/audio/l/',B='https://lexkiteapp.github.io/audio/l/',cur;
d.addEventListener('click',function(e){var b=e.target.closest('.au');if(!b)return;if(cur){cur.pause();if(cur.btn)cur.btn.setAttribute('aria-pressed','false')}var k=b.getAttribute('data-a'),a=new Audio(A+k+'.mp3');a.btn=b;cur=a;b.setAttribute('aria-pressed','true');a.onended=function(){b.setAttribute('aria-pressed','false')};a.onerror=function(){if(a.src.indexOf(B)<0){a.src=B+k+'.mp3';a.play()}else b.setAttribute('aria-pressed','false')};a.play().catch(function(){})});
var q=d.getElementById('q');if(q){var o=d.getElementById('qn'),n=function(s){return s.normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').replace(/đ/g,'d').toLowerCase()},cs=[].slice.call(d.querySelectorAll('[data-k]')),gs=[].slice.call(d.querySelectorAll('.grp'));cs.forEach(function(c){c._k=n(c.getAttribute('data-k')+' '+c.textContent)});
q.addEventListener('input',function(){var v=n(q.value.trim()),c=0;cs.forEach(function(x){var h=v&&x._k.indexOf(v)<0;x.hidden=h;if(!h)c++});gs.forEach(function(g){g.hidden=!!v&&!g.querySelector('[data-k]:not([hidden])')});o.textContent=v?(c?o.getAttribute('data-f').replace('#',c):o.getAttribute('data-n')):''})}
var x=d.getElementById('ext'),u=navigator.userAgent;if(x&&/Chrome\\//.test(u)&&!/Edg\\/|OPR\\/|Mobile|Android|CriOS/.test(u)){var t=0;try{t=+localStorage.getItem('lkExtHide')||0}catch(e){}if(Date.now()-t>6048e5){x.hidden=false;x.querySelector('button').onclick=function(){x.hidden=true;try{localStorage.setItem('lkExtHide',Date.now())}catch(e){}}}}})(document);`;

export const audioBtn = (key, word, lang) => `<button type="button" class="au" data-a="${esc(key)}" aria-label="${esc(SEO_L[lang].play(word))}"></button>`;

// Ô lọc danh sách (giữ chỗ sẵn → không xô lệch bố cục khi JS bật)
export const filterBox = lang => { const t = SEO_L[lang]; return `<div class="filter" role="search"><label for="q" class="sr">${t.searchL}</label><input id="q" type="search" placeholder="${esc(t.search)}" autocomplete="off"><output id="qn" for="q" aria-live="polite" data-f="${esc(t.found('#'))}" data-n="${esc(t.none)}"></output></div>`; };
// Thẻ trong lưới danh sách: tên, mô tả ngắn, chip (số từ / trình độ / kỳ thi), emoji nếu có
export const setCard = ({ href, title, desc = '', emoji = '', chips = [], key = '', h = 'h3' }) => `<article class="card set${emoji ? ' has-em' : ''}" data-k="${esc(key)}"><a class="ti" href="${href}"><div class="bd">${emoji ? `<span class="em" aria-hidden="true">${esc(emoji)}</span>` : ''}<${h}>${esc(title)}</${h}>${desc ? `<p>${esc(desc)}</p>` : ''}${chips.length ? `<span class="chips">${chips.map(c => Array.isArray(c) ? `<span class="chip ${c[1]}">${esc(c[0])}</span>` : `<span class="chip">${esc(c)}</span>`).join('')}</span>` : ''}</div></a></article>`;
// Khối CTA chính (mở đúng bộ/bài trong app)
export const ctaBox = (href, title, btn, note = '') => `<div class="cta"><p><strong>${title}</strong>${note ? `<small>${note}</small>` : ''}</p><a class="btn" href="${href}">${btn} →</a></div>`;
// Gợi ý add-on – chỉ hiện trên Chrome máy tính (JS bật hidden=false), cuối trang nên không xô bố cục phần đầu
export const extBox = lang => { const t = SEO_L[lang]; return `<div class="ext" id="ext" hidden><p><strong>🧩 ${t.ext[0]}</strong> ${t.ext[1]}</p><a class="btn" href="${t.extHref}">${t.ext[2]}</a><button type="button">${t.ext[3]}</button></div>`; };

// Khung trang SEO: head (meta/canonical/hreflang/JSON-LD do builder tạo, giữ nguyên) + header + breadcrumb + nội dung + footer
// alt: [đường dẫn bản ngôn ngữ kia] → nút đổi ngôn ngữ; section: đường dẫn mục đang xem (đánh dấu aria-current)
export function seoPage({ lang, head, crumbs, body, alt, section }) {
  const t = SEO_L[lang];
  const nav = t.nav.map(([h, n]) => [h, n, h === section ? ' aria-current="page"' : '']);
  if (alt) nav.push([alt, t.switchTo[0], ` class="lang" lang="${t.switchTo[1]}"`]);
  return `<!doctype html><html lang="${lang}"><head>${head}<style>${CSS}\n${SEO_CSS}</style></head><body><a class="skip" href="#nd">${t.skip}</a>
${siteHeader({ nav, open: [t.app, t.open], home: landingHref(lang) })}
<main id="nd">
${crumbsHtml(crumbs)}
${body}
</main>
${siteFooter({ lang, text: t.foot, tm: t.tm, langHref: l => alt && l !== lang && SEO_L[l] ? alt : `/${l}/blog/` })}
<script>${copyJs(lang)}${UI_JS}</script></body></html>`;
}
// Thanh chuyển mục (Từ vựng · Ngữ pháp · Bài mẫu…) trên trang danh sách
export const sectionNav = (lang, cur) => `<nav class="cats" aria-label="${SEO_L[lang].sectionsL}">${SEO_L[lang].sections.map(([h, n]) => `<a href="${h}"${h === cur ? ' aria-current="page"' : ''}>${esc(n)}</a>`).join('')}</nav>`;
