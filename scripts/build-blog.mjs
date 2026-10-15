// Blog tĩnh (SEO): content/blog/<lang>/*.md → dist/blog/… lúc build. Chỉ phát hành bài publishAt ≤ giờ build (BLOG_NOW để thử,
// BLOG_DRAFTS=1 xem trước mọi bài). Sinh: bài /blog/<slug>/, danh sách + phân trang, chuyên mục, thẻ, RSS, sitemap-blog.xml.
// Ảnh: CDN repo lexkite-media (content/blog/config.json → mediaBase); BLOG_MEDIA_LOCAL=1 chép ảnh .media/out vào dist để xem thử.
import fs from 'node:fs'; import path from 'node:path';
import { loadPosts, parse, isLive, publishTime, wordCount, config, CATEGORIES, ROOT } from './lib/blog-content.mjs';

const C = config(), SITE = C.site.replace(/\/$/, ''), DEF = C.defaultLang || 'vi', PER = C.postsPerPage || 12;
const NOW = process.env.BLOG_NOW ? Date.parse(process.env.BLOG_NOW) : Date.now(), DRAFTS = process.env.BLOG_DRAFTS === '1';
const OUT = process.env.BLOG_OUT || 'dist';
const MEDIA = fs.existsSync(`${ROOT}/media.json`) ? JSON.parse(fs.readFileSync(`${ROOT}/media.json`, 'utf8')).items : {};
let MBASE = C.mediaBase;
if (process.env.BLOG_MEDIA_LOCAL === '1' && fs.existsSync('.media/out/blog')) { fs.cpSync('.media/out/blog', `${OUT}/blog/media`, { recursive: true }); MBASE = '/blog/media/'; }

// ---------- Kiểm tra chất lượng: bài lỗi → build dừng (bài nháp bỏ qua) ----------
const all = loadPosts();
if (fs.existsSync('scripts/blog-check.mjs') && process.env.BLOG_SKIP_CHECK !== '1') {
  const { checkPosts } = await import('./blog-check.mjs');
  const { errors = [] } = await checkPosts(all.filter(p => p.status !== 'draft'));
  if (errors.length) { for (const e of errors.slice(0, 30)) console.error('✗', typeof e === 'string' ? e : `${e.file}: [${e.rule}] ${e.message}`); console.error(`✗ blog: ${errors.length} lỗi – sửa bài hoặc đặt status: draft`); process.exit(1); }
}
const when = p => publishTime(p) || NOW; // bài chưa xếp lịch (chỉ khi xem trước BLOG_DRAFTS) → coi như đăng lúc build
const posts = all.filter(p => p.status !== 'draft' && (DRAFTS || isLive(p, NOW))).sort((a, b) => when(b) - when(a) || a.slug.localeCompare(b.slug));

let LIVE = new Set(), CUR = DEF; // CUR: ngôn ngữ của trang đang dựng // URL các bài đã phát hành (gán sau khi có danh sách bài)
// ---------- Chữ giao diện theo ngôn ngữ (bản dịch sau này chỉ cần thêm khóa) ----------
const L = {
  vi: { blog: 'Blog', home: 'Trang chủ', open: 'Mở app', min: 'phút đọc', toc: 'Nội dung bài', related: 'Bài liên quan', tags: 'Thẻ', page: 'Trang', newer: '← Mới hơn', older: 'Cũ hơn →', all: 'Tất cả', updated: 'Cập nhật', play: 'Phát video', by: 'Lexkite', cat: 'Chuyên mục', tagT: 'Bài viết về', foot: 'Lexkite – học từ vựng & luyện thi IELTS, TOEIC, TOEFL miễn phí. Nội dung tự biên soạn.', tm: 'IELTS, TOEIC, TOEFL là nhãn hiệu của chủ sở hữu tương ứng; Lexkite là sản phẩm độc lập.', skip: 'Bỏ qua đến nội dung', about: 'Về Blog Lexkite', try: 'Học miễn phí trên Lexkite', tryD: 'Flashcard FSRS, từ điển song ngữ, luyện 4 kỹ năng và thi thử – không cần thẻ tín dụng.', rss: 'RSS', words: 'Từ vựng', samples: 'Bài mẫu', seg: { cat: 'chu-de', tag: 'the', page: 'trang' }, aboutSlug: 'gioi-thieu', nav: { words: '/tu-vung/', samples: '/samples/' } },
  en: { blog: 'Blog', home: 'Home', open: 'Open app', min: 'min read', toc: 'Contents', related: 'Related posts', tags: 'Tags', page: 'Page', newer: '← Newer', older: 'Older →', all: 'All', updated: 'Updated', play: 'Play video', by: 'Lexkite', cat: 'Category', tagT: 'Posts about', foot: 'Lexkite – free vocabulary and IELTS, TOEIC, TOEFL practice. Original content.', tm: 'IELTS, TOEIC and TOEFL are trademarks of their respective owners; Lexkite is independent.', skip: 'Skip to content', about: 'About', try: 'Learn free with Lexkite', tryD: 'FSRS flashcards, bilingual dictionary, 4-skill practice and mock tests – no credit card.', rss: 'RSS', words: 'Vocabulary', samples: 'Samples', seg: { cat: 'topic', tag: 'tag', page: 'page' }, aboutSlug: 'about', nav: { words: '/en/vocabulary/', samples: '/en/samples/' },
    cats: { 'tu-vung': 'Vocabulary', ielts: 'IELTS', toeic: 'TOEIC', toefl: 'TOEFL', 'phuong-phap': 'Study methods', 'ngu-phap': 'Grammar & usage', 'phat-am': 'Pronunciation', 'ky-nang': 'English skills' } },
  id: { blog: 'Blog', home: 'Beranda', open: 'Buka aplikasi', min: 'menit baca', toc: 'Daftar isi', related: 'Artikel terkait', tags: 'Tag', page: 'Halaman', newer: '← Lebih baru', older: 'Lebih lama →', all: 'Semua', updated: 'Diperbarui', play: 'Putar video', cat: 'Kategori', tagT: 'Artikel tentang', foot: 'Lexkite – belajar kosakata dan latihan IELTS, TOEIC, TOEFL gratis. Konten orisinal.', tm: 'IELTS, TOEIC, dan TOEFL adalah merek dagang milik pemiliknya masing-masing; Lexkite adalah produk independen.', skip: 'Langsung ke konten', about: 'Tentang', try: 'Belajar gratis di Lexkite', tryD: 'Flashcard FSRS, kamus dwibahasa, latihan 4 keterampilan, dan simulasi tes – tanpa kartu kredit.', words: 'Kosakata', samples: 'Contoh esai', seg: { cat: 'topik', tag: 'tag', page: 'halaman' }, aboutSlug: 'tentang', nav: { words: '/en/vocabulary/', samples: '/en/samples/' },
    cats: { 'tu-vung': 'Kosakata', ielts: 'IELTS', toeic: 'TOEIC', toefl: 'TOEFL', 'phuong-phap': 'Metode belajar', 'ngu-phap': 'Tata bahasa', 'phat-am': 'Pelafalan', 'ky-nang': 'Keterampilan bahasa Inggris' } },
  es: { blog: 'Blog', home: 'Inicio', open: 'Abrir la app', min: 'min de lectura', toc: 'Contenido', related: 'Artículos relacionados', tags: 'Etiquetas', page: 'Página', newer: '← Más recientes', older: 'Más antiguos →', all: 'Todos', updated: 'Actualizado', play: 'Reproducir vídeo', cat: 'Categoría', tagT: 'Artículos sobre', foot: 'Lexkite – vocabulario y preparación de IELTS, TOEIC y TOEFL gratis. Contenido original.', tm: 'IELTS, TOEIC y TOEFL son marcas registradas de sus respectivos propietarios; Lexkite es un producto independiente.', skip: 'Ir al contenido', about: 'Acerca de', try: 'Aprende gratis con Lexkite', tryD: 'Flashcards FSRS, diccionario bilingüe, práctica de las 4 destrezas y simulacros – sin tarjeta de crédito.', words: 'Vocabulario', samples: 'Ensayos modelo', seg: { cat: 'tema', tag: 'etiqueta', page: 'pagina' }, aboutSlug: 'acerca-de', nav: { words: '/en/vocabulary/', samples: '/en/samples/' },
    cats: { 'tu-vung': 'Vocabulario', ielts: 'IELTS', toeic: 'TOEIC', toefl: 'TOEFL', 'phuong-phap': 'Métodos de estudio', 'ngu-phap': 'Gramática', 'phat-am': 'Pronunciación', 'ky-nang': 'Destrezas en inglés' } },
  ja: { blog: 'ブログ', home: 'ホーム', open: 'アプリを開く', min: '分で読めます', toc: '目次', related: '関連記事', tags: 'タグ', page: 'ページ', newer: '← 新しい記事', older: '古い記事 →', all: 'すべて', updated: '更新日', play: '動画を再生', cat: 'カテゴリー', tagT: 'タグ:', foot: 'Lexkite – 英単語と IELTS・TOEIC・TOEFL 対策を無料で。すべてオリジナルコンテンツです。', tm: 'IELTS、TOEIC、TOEFL は各所有者の商標です。Lexkite は独立したサービスです。', skip: '本文へ移動', about: 'このブログについて', try: 'Lexkite で無料で学ぶ', tryD: 'FSRS フラッシュカード、英和辞書、4 技能の練習、模擬試験 – クレジットカード不要。', words: '単語', samples: '模範解答', seg: { cat: 'category', tag: 'tag', page: 'page' }, aboutSlug: 'about', nav: { words: '/en/vocabulary/', samples: '/en/samples/' },
    cats: { 'tu-vung': '英単語', ielts: 'IELTS', toeic: 'TOEIC', toefl: 'TOEFL', 'phuong-phap': '勉強法', 'ngu-phap': '英文法', 'phat-am': '発音', 'ky-nang': '英語スキル' } },
};
const T = l => ({ ...L.en, ...(L[l] || {}) }); // ngôn ngữ chưa dịch giao diện → tiếng Anh
const SEG = l => T(l).seg, catName = (k, l) => (L[l] && L[l].cats && L[l].cats[k]) || CATEGORIES[k] || k; // tên chuyên mục theo ngôn ngữ (mặc định tiếng Việt)
const ABOUTS = new Set(Object.values(L).map(x => x.aboutSlug));
const SEGS = new Set(Object.values(L).flatMap(x => Object.values(x.seg)));
const base = l => `/${l}/blog/`; // thư mục theo ngôn ngữ: /vi/blog/, /en/blog/… (/blog/ → 301 sang /vi/blog/ trong _redirects)
const postUrl = p => `${base(p.lang)}${p.slug}/`;
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const slugify = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const fmtDate = (t, l) => new Date(t).toLocaleDateString(l === 'vi' ? 'vi-VN' : l, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Ho_Chi_Minh' });
const iso = t => new Date(t).toISOString();
const ld = o => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`;

// ---------- Ảnh: <picture> AVIF + WebP, srcset, width/height (CLS 0) ----------
function picture(id, alt, { eager = false, sizes = '(min-width: 760px) 720px, 100vw' } = {}) {
  const m = MEDIA[id];
  if (!m) return `<!-- thiếu ảnh ${esc(id)} -->`;
  const u = (w, f) => `${m.base || MBASE}blog/${id}-${m.hash}-${w}.${f}`.replace('/blog/media/blog/', '/blog/media/');
  const set = f => m.widths.map(w => `${u(w, f)} ${w}w`).join(', '), mid = m.widths[Math.min(1, m.widths.length - 1)];
  return `<picture><source type="image/avif" srcset="${set('avif')}" sizes="${sizes}"><source type="image/webp" srcset="${set('webp')}" sizes="${sizes}"><img src="${u(mid, 'webp')}" alt="${esc(alt)}" width="${m.w}" height="${m.h}" ${eager ? 'fetchpriority="high" decoding="async"' : 'loading="lazy" decoding="async"'}></picture>`;
}
const imgUrl = (id, w = 1440) => { const m = MEDIA[id]; if (!m) return `${SITE}/og-default.png`; const ww = m.widths.includes(w) ? w : m.widths.at(-1); return `${m.base || MBASE}blog/${id}-${m.hash}-${ww}.webp`.replace(/^\//, SITE + '/'); };

// ---------- Markdown tối giản (đủ cho bài blog, không phụ thuộc gói ngoài) ----------
function inline(s) {
  const codes = [];
  s = esc(s).replace(/`([^`]+)`/g, (m, c) => `\u0000${codes.push(c) - 1}\u0000`);
  s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+&quot;([^&]*)&quot;)?\)/g, (m, alt, src) => src.startsWith('media:') ? picture(src.slice(6), alt) : `<img src="${src}" alt="${alt}" loading="lazy">`)
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, t, h) => {
      if (h.startsWith('/blog/')) h = base(CUR) + h.slice(6); // link /blog/<slug>/ trong bài → thư mục ngôn ngữ của bài
      const bm = h.match(/^\/(?:[a-z]{2}(?:-[a-z]+)?\/)?blog\/([^/#?]+)\/$/);
      if (bm && !SEGS.has(bm[1]) && !ABOUTS.has(bm[1]) && !LIVE.has(h)) return t; // bài đích chưa đến giờ đăng → chữ thường, không tạo link 404
      const ext = /^https?:/.test(h) && !h.startsWith(SITE), app = h.startsWith('/#/');
      return `<a href="${h}"${ext ? ' rel="noopener" target="_blank"' : ''}${app ? ' class="app"' : ''}>${t}</a>`;
    })
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/(^|[^*\w])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>').replace(/(^|\s)_([^_]+)_(?=\s|[.,;:!?]|$)/g, '$1<em>$2</em>');
  return s.replace(/\u0000(\d+)\u0000/g, (m, i) => `<code>${codes[i]}</code>`);
}
function render(md, lang, cover) {
  CUR = lang;
  const lines = md.replace(/\r/g, '').split('\n'), out = [], toc = [], faq = [], videos = [], ids = new Set();
  let i = 0, inFaq = false, q = null;
  const para = [];
  const flush = () => { if (para.length) { const h = inline(para.join(' ')); out.push(`<p>${h}</p>`); if (q && !q.a) q.a = para.join(' ').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/[*_`]/g, ''); para.length = 0; } };
  const hid = t => { let id = slugify(t) || 'muc', k = id, n = 2; while (ids.has(k)) k = `${id}-${n++}`; ids.add(k); return k; };
  while (i < lines.length) {
    const ln = lines[i];
    let m;
    if (!ln.trim()) { flush(); i++; continue; }
    if (ln.startsWith('```')) { flush(); const buf = []; i++; while (i < lines.length && !lines[i].startsWith('```')) buf.push(lines[i++]); i++; out.push(`<pre><code>${esc(buf.join('\n'))}</code></pre>`); continue; }
    if ((m = ln.match(/^(#{2,4})\s+(.+?)\s*#*$/))) {
      flush(); const lv = m[1].length, txt = m[2], id = hid(txt);
      if (lv === 2) { inFaq = /^(câu hỏi thường gặp|faq|frequently asked)/i.test(txt); q = null; toc.push({ id, txt }); }
      if (lv === 3 && inFaq) { q = { q: txt.replace(/[*_`]/g, ''), a: '' }; faq.push(q); }
      out.push(`<h${lv} id="${id}">${inline(txt)}</h${lv}>`); i++; continue;
    }
    if ((m = ln.match(/^\{\{\s*youtube:\s*([\w-]*)\s*(?:\|\s*(.*?))?\s*\}\}\s*$/))) { // slot video tùy chọn: ID trống → không hiển thị
      flush(); if (m[1]) { videos.push(m[1]); out.push(`<div class="yt" data-id="${m[1]}"><img src="https://i.ytimg.com/vi/${m[1]}/hqdefault.jpg" alt="${esc(m[2] || 'Video')}" width="480" height="360" loading="lazy"><button type="button" aria-label="${T(lang).play}: ${esc(m[2] || '')}"></button></div>`); } else out.push(`<!-- youtube-slot: ${esc(m[2] || '')} -->`);
      i++; continue;
    }
    if ((m = ln.match(/^\{\{\s*cta:\s*(\S+)\s*\|\s*(.*?)\s*\}\}\s*$/))) { flush(); out.push(`<aside class="cta"><p><strong>${inline(m[2])}</strong></p><a class="btn" href="${esc(m[1])}">${T(lang).open} →</a></aside>`); i++; continue; }
    if ((m = ln.match(/^!\[([^\]]*)\]\(media:([\w-]+)(?:\s+"([^"]*)")?\)\s*$/))) { flush(); if (m[2] === cover) { i++; continue; } // ảnh trùng ảnh bìa → không lặp lại
      out.push(`<figure>${picture(m[2], m[1])}${m[3] ? `<figcaption>${inline(m[3])}</figcaption>` : ''}</figure>`); i++; continue; }
    if (/^(---|\*\*\*)\s*$/.test(ln)) { flush(); out.push('<hr>'); i++; continue; }
    if (ln.startsWith('>')) { flush(); const buf = []; while (i < lines.length && lines[i].startsWith('>')) buf.push(lines[i++].replace(/^>\s?/, '')); out.push(`<blockquote>${buf.join('\n').split(/\n\s*\n/).map(b => `<p>${inline(b.replace(/\n/g, ' '))}</p>`).join('')}</blockquote>`); continue; }
    if (/^\|.*\|\s*$/.test(ln) && /^\|?[\s:|-]+\|?\s*$/.test(lines[i + 1] || '') && lines[i + 1].includes('-')) {
      flush(); const row = r => r.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim());
      const head = row(ln); i += 2; const body = [];
      while (i < lines.length && /^\|.*\|\s*$/.test(lines[i])) body.push(row(lines[i++]));
      out.push(`<div class="tbl"><table><thead><tr>${head.map(h => `<th>${inline(h)}</th>`).join('')}</tr></thead><tbody>${body.map(r => `<tr>${r.map(c => `<td>${inline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`); continue;
    }
    if (/^\s*([-*]|\d+[.)])\s+/.test(ln)) {
      flush(); const ol = /^\s*\d/.test(ln), items = [];
      while (i < lines.length && (/^\s*([-*]|\d+[.)])\s+/.test(lines[i]) || (/^\s{2,}\S/.test(lines[i]) && items.length))) {
        const l2 = lines[i++];
        if (/^\s{2,}([-*]|\d+[.)])\s+/.test(l2)) (items.at(-1).sub ||= []).push(l2.replace(/^\s*([-*]|\d+[.)])\s+/, ''));
        else if (/^\s*([-*]|\d+[.)])\s+/.test(l2)) items.push({ t: l2.replace(/^\s*([-*]|\d+[.)])\s+/, '') });
        else items.at(-1).t += ' ' + l2.trim();
      }
      out.push(`<${ol ? 'ol' : 'ul'}>${items.map(it => `<li>${inline(it.t)}${it.sub ? `<ul>${it.sub.map(s => `<li>${inline(s)}</li>`).join('')}</ul>` : ''}</li>`).join('')}</${ol ? 'ol' : 'ul'}>`); continue;
    }
    para.push(ln.trim()); i++;
  }
  flush();
  return { html: out.join('\n'), toc, faq: faq.filter(f => f.a), videos };
}

// ---------- Khung trang ----------
const CSS = `:root{--bg:#f5f6fb;--surface:#fff;--text:#171827;--muted:#5d6179;--line:#e2e4ef;--primary:#E5502F;--primary-ink:#fff;--primary-soft:#FFEBE4;--accent:#12807A;--accent-soft:#DDF1EE;--brand:#0F3D3E;--link:#B93A1D;--r:16px;color-scheme:light dark}
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
.cover{margin:0 0 20px}
.toc{background:var(--surface);border:1px solid var(--line);border-radius:var(--r);padding:12px 18px;margin:18px 0}.toc summary{font-weight:700;cursor:pointer}.toc ol{margin:8px 0 0;padding-left:20px;font-size:15px;line-height:1.6}
blockquote{margin:20px 0;padding:10px 18px;background:var(--primary-soft);border-left:4px solid var(--primary);border-radius:0 12px 12px 0}blockquote p{margin:.4em 0}
.tbl{overflow-x:auto;margin:18px 0}table{border-collapse:collapse;width:100%;font-size:15px;background:var(--surface)}th,td{border:1px solid var(--line);padding:8px 10px;text-align:left;vertical-align:top}th{background:var(--accent-soft)}
code{background:var(--accent-soft);padding:1px 5px;border-radius:5px;font-size:.92em}pre{background:#11132a;color:#e8eaf6;padding:14px;border-radius:12px;overflow:auto}pre code{background:none;padding:0}
a.app{font-weight:600}
.cta{background:linear-gradient(135deg,#0F3D3E,#12807A);color:#fff;border-radius:var(--r);padding:18px 20px;margin:28px 0;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}.cta p{margin:0;max-width:52ch}
.yt{position:relative;aspect-ratio:16/9;background:#000;border-radius:12px;overflow:hidden;margin:24px 0}.yt img,.yt iframe{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;border:0}.yt button{position:absolute;inset:0;margin:auto;width:72px;height:50px;border:0;border-radius:14px;background:#E5502F;cursor:pointer}.yt button::after{content:"";position:absolute;left:29px;top:15px;border-style:solid;border-width:10px 0 10px 17px;border-color:transparent transparent transparent #fff}
.tags{display:flex;gap:8px;flex-wrap:wrap;margin:24px 0}.tags a{border:1px solid var(--line);border-radius:999px;padding:3px 12px;font-size:14px;text-decoration:none;color:var(--text);background:var(--surface)}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:18px;margin:18px 0}.card{background:var(--surface);border:1px solid var(--line);border-radius:var(--r);overflow:hidden;display:flex;flex-direction:column}.card a.ti{color:var(--text);text-decoration:none}.card a.ti:hover h3,.card a.ti:hover h2{color:var(--primary)}
.card .pic picture{display:block;aspect-ratio:16/10;overflow:hidden}.card .pic img{width:100%;height:100%;object-fit:cover;object-position:top}.card .bd{padding:12px 16px 16px}.card h2,.card h3{font-size:18px;line-height:1.35;margin:6px 0}.card p{font-size:15px;color:var(--muted);margin:0}
.hero{padding:10px 0 4px}.hero h1{font-size:clamp(28px,4vw,40px);margin:.1em 0;letter-spacing:-.02em}.hero p{color:var(--muted);max-width:70ch;margin:.3em 0 0}
.cats{display:flex;gap:8px;flex-wrap:wrap;margin:14px 0}.cats a{padding:5px 14px;border-radius:999px;border:1px solid var(--line);background:var(--surface);text-decoration:none;color:var(--text);font-weight:600;font-size:15px}.cats a[aria-current]{background:var(--brand);border-color:var(--brand);color:#fff}
@media (prefers-color-scheme:dark){.cats a[aria-current]{color:#0f1017}}
.pager{display:flex;justify-content:space-between;gap:12px;margin:24px 0;font-weight:700}
.trybox{background:var(--surface);border:1px solid var(--line);border-radius:var(--r);padding:18px 20px;margin:32px 0}.trybox h2{margin:0 0 6px;font-size:20px}.trybox p{margin:0 0 12px;color:var(--muted)}
footer{border-top:1px solid var(--line);color:var(--muted);font-size:14px}footer .bar{display:block;padding:20px 16px}footer p{margin:.3em 0}
@media (prefers-reduced-motion:no-preference){html{scroll-behavior:smooth}}`;

function layout({ lang, title, desc, url, alt = [], img, imgAlt, type = 'website', body, jsonld = [], robots = 'index,follow', extraHead = '', script = '' }) {
  const t = T(lang), b = base(lang);
  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="robots" content="${robots}">
<link rel="canonical" href="${SITE}${url}">
${alt.map(a => `<link rel="alternate" hreflang="${a.lang}" href="${SITE}${a.url}">`).join('\n')}
<link rel="alternate" type="application/rss+xml" title="${esc(C.blogName[lang] || C.blogName.en)}" href="${SITE}${b}rss.xml">
<meta name="theme-color" content="#0F3D3E">
<link rel="icon" href="/icons/icon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/icons/icon-192.png">
<meta property="og:type" content="${type}">
<meta property="og:site_name" content="Lexkite">
<meta property="og:locale" content="${{ vi: 'vi_VN', en: 'en_US', id: 'id_ID', es: 'es_ES', ja: 'ja_JP', ko: 'ko_KR', th: 'th_TH', zh: 'zh_CN', ar: 'ar_AR' }[lang] || lang}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${SITE}${url}">
<meta property="og:image" content="${esc(img || `${SITE}/og-default.png`)}">
<meta property="og:image:alt" content="${esc(imgAlt || title)}">
<meta name="twitter:card" content="summary_large_image">
${extraHead}${jsonld.map(ld).join('\n')}
<style>${CSS}</style>
</head>
<body>
<a class="skip" href="#nd">${t.skip}</a>
<header class="top"><div class="bar"><a class="logo" href="/"><img src="/icons/icon.svg" width="32" height="32" alt=""><span>lex<b>kite</b></span></a>
<nav class="main" aria-label="Lexkite"><a href="${b}">${t.blog}</a><a href="${t.nav.words}">${t.words}</a><a href="${t.nav.samples}">${t.samples}</a><a class="btn" href="/">${t.open}</a></nav></div></header>
<main id="nd">
${body}
</main>
<footer><div class="bar"><p>${t.foot} <a href="${b}${t.aboutSlug}/">${t.about}</a> · <a href="${b}rss.xml">${t.rss}</a> · <a href="/privacy">Privacy</a></p><p>${t.tm}</p><p>© ${new Date(NOW).getFullYear()} Lexkite</p></div></footer>
${script}
</body>
</html>`;
}
const YT_JS = `<script>document.addEventListener('click',e=>{const b=e.target.closest('.yt button');if(!b)return;const d=b.parentNode,f=document.createElement('iframe');f.src='https://www.youtube-nocookie.com/embed/'+d.dataset.id+'?autoplay=1&rel=0';f.title=b.getAttribute('aria-label');f.allow='accelerometer;autoplay;encrypted-media;gyroscope;picture-in-picture;fullscreen';f.allowFullscreen=true;d.replaceChildren(f)})</script>`;
const crumbsLd = items => ({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items.map(([name, u], i) => ({ '@type': 'ListItem', position: i + 1, name, item: SITE + u })) });
const crumbsHtml = items => `<nav class="crumbs" aria-label="Breadcrumb">${items.map(([n, u], i) => i === items.length - 1 ? `<span aria-current="page">${esc(n)}</span>` : `<a href="${u}">${esc(n)}</a>`).join(' › ')}</nav>`;
const card = (p, h = 'h2', eager = false) => `<article class="card"><a class="ti" href="${postUrl(p)}"><div class="pic">${picture(p.cover, p.coverAlt || p.title, { eager, sizes: '(min-width: 1080px) 340px, (min-width: 640px) 50vw, 100vw' })}</div><div class="bd"><span class="chip">${esc(catName(p.category, p.lang))}</span><${h}>${esc(p.title)}</${h}><p>${esc(p.description)}</p></div></a></article>`;

// ---------- Ghi file ----------
const written = [], sm = []; // sm: { loc, lastmod, alt }
const write = (u, html) => { const f = path.join(OUT, u, 'index.html'); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, html); written.push(u); };
LIVE = new Set(posts.map(postUrl));
const TAGN = new Map(); for (const p of posts) for (const g of p.tags || []) TAGN.set(`${p.lang}/${g}`, (TAGN.get(`${p.lang}/${g}`) || 0) + 1); // thẻ < 2 bài → không có trang thẻ
const byKey = new Map(); for (const p of posts) (byKey.get(p.translationKey || p.slug) || byKey.set(p.translationKey || p.slug, []).get(p.translationKey || p.slug)).push(p);
// x-default: bản tiếng Anh (khách quốc tế) nếu có, không thì ngôn ngữ chính
const alts = p => { const g = byKey.get(p.translationKey || p.slug) || [p]; if (g.length < 2) return []; const a = g.map(x => ({ lang: x.lang, url: postUrl(x) })); const d = g.find(x => x.lang === 'en') || g.find(x => x.lang === DEF); return d ? [...a, { lang: 'x-default', url: postUrl(d) }] : a; };

// Bài viết
for (const p of posts) {
  const t = T(p.lang), { html, toc, faq, videos } = render(p.body, p.lang, p.cover), words = wordCount(p.body), mins = Math.max(1, Math.round(words / 220));
  const pub = when(p), upd = p.updated ? Date.parse(p.updated) : pub;
  const same = posts.filter(x => x !== p && x.lang === p.lang);
  const score = x => (x.category === p.category ? 3 : 0) + (x.tags || []).filter(g => (p.tags || []).includes(g)).length * 2 + (p.body.includes(`/blog/${x.slug}/`) ? 1 : 0);
  const related = same.map(x => [score(x), x]).filter(([s]) => s > 0).sort((a, b) => b[0] - a[0] || when(b[1]) - when(a[1])).slice(0, 3).map(([, x]) => x);
  const cat = catName(p.category, p.lang), b = base(p.lang), sg = SEG(p.lang);
  const crumbs = [[t.home, '/'], [t.blog, b], [cat, `${b}${sg.cat}/${p.category}/`], [p.title, postUrl(p)]];
  const jsonld = [
    { '@context': 'https://schema.org', '@type': 'BlogPosting', headline: p.title, description: p.description, image: [imgUrl(p.cover)], datePublished: iso(pub), dateModified: iso(upd), inLanguage: p.lang, wordCount: words, keywords: [p.keyword, ...(p.tags || [])].join(', '), articleSection: cat, mainEntityOfPage: SITE + postUrl(p), author: { '@type': 'Organization', name: p.author || 'Lexkite', url: `${SITE}${base(p.lang)}${T(p.lang).aboutSlug}/` }, publisher: { '@type': 'Organization', name: 'Lexkite', url: SITE + '/', logo: { '@type': 'ImageObject', url: `${SITE}/icons/icon-512.png`, width: 512, height: 512 } } },
    crumbsLd(crumbs),
    ...(faq.length >= 2 ? [{ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) }] : []),
  ];
  const body = `${crumbsHtml(crumbs)}
<article class="post">
<h1>${esc(p.title)}</h1>
<div class="meta"><a class="chip" href="${b}${sg.cat}/${p.category}/">${esc(cat)}</a><span><time datetime="${iso(pub)}">${fmtDate(pub, p.lang)}</time></span>${upd > pub + 864e5 ? `<span>${t.updated} <time datetime="${iso(upd)}">${fmtDate(upd, p.lang)}</time></span>` : ''}<span>${mins} ${t.min}</span></div>
<figure class="cover">${picture(p.cover, p.coverAlt || p.title, { eager: true })}</figure>
${toc.length >= 3 ? `<details class="toc" open><summary>${t.toc}</summary><ol>${toc.map(h => `<li><a href="#${h.id}">${inline(h.txt)}</a></li>`).join('')}</ol></details>` : ''}
${html}
${(p.tags || []).some(g => (TAGN.get(`${p.lang}/${g}`) || 0) >= 2) ? `<div class="tags" aria-label="${t.tags}">${p.tags.filter(g => (TAGN.get(`${p.lang}/${g}`) || 0) >= 2).map(g => `<a href="${b}${sg.tag}/${g}/">#${esc(g)}</a>`).join('')}</div>` : ''}
<section class="trybox"><h2>${t.try}</h2><p>${t.tryD}</p><a class="btn" href="/">${t.open} →</a></section>
</article>
${related.length ? `<section aria-labelledby="rel"><h2 id="rel">${t.related}</h2><div class="grid">${related.map(x => card(x, 'h3')).join('')}</div></section>` : ''}`;
  write(postUrl(p), layout({ lang: p.lang, title: `${p.title} | Lexkite`, desc: p.description, url: postUrl(p), alt: alts(p), img: imgUrl(p.cover), imgAlt: p.coverAlt, type: 'article', body, jsonld,
    extraHead: `<meta property="article:published_time" content="${iso(pub)}">\n<meta property="article:modified_time" content="${iso(upd)}">\n<meta property="article:section" content="${esc(cat)}">\n${(p.tags || []).map(g => `<meta property="article:tag" content="${esc(g)}">`).join('\n')}\n`,
    script: videos.length ? YT_JS : '' }));
  sm.push({ loc: postUrl(p), lastmod: iso(upd), alt: alts(p) });
}

// Danh sách: /blog/, chuyên mục, thẻ (phân trang)
const langs = [...new Set(all.filter(p => p.status !== 'draft').map(p => p.lang))]; // ngôn ngữ đã có bài (kể cả chờ lịch) → có /<lang>/blog/ + RSS ngay (noindex khi chưa có bài)
if (!langs.includes(DEF)) langs.unshift(DEF);
for (const lang of langs) {
  const t = T(lang), b = base(lang), sg = SEG(lang), list = posts.filter(p => p.lang === lang);
  const groups = [{ u: b, name: C.blogName[lang] || C.blogName.en, desc: C.blogDesc[lang] || C.blogDesc.en, items: list, kind: 'all' }];
  for (const k of Object.keys(CATEGORIES)) { const v = catName(k, lang), it = list.filter(p => p.category === k); if (it.length) groups.push({ u: `${b}${sg.cat}/${k}/`, name: `${v} – ${C.blogName[lang] || 'Blog'}`, h1: v, desc: `${t.cat} ${v}: ${it.length} ${lang === 'vi' ? 'bài viết về' : 'posts on'} ${v}${lang === 'vi' ? ' – mẹo, phương pháp và lộ trình học miễn phí cùng Lexkite.' : ' – tips, methods and free study plans from Lexkite.'}`, items: it, kind: 'cat', cat: k }); }
  const tagMap = new Map(); for (const p of list) for (const g of p.tags || []) (tagMap.get(g) || tagMap.set(g, []).get(g)).push(p);
  for (const [g, it] of tagMap) if (it.length >= 2) groups.push({ u: `${b}${sg.tag}/${g}/`, name: `${t.tagT} ${g} – ${C.blogName[lang] || 'Blog'}`, h1: `#${g}`, desc: `${it.length} ${lang === 'vi' ? 'bài viết gắn thẻ' : 'posts tagged'} “${g}” ${lang === 'vi' ? 'trên Blog Lexkite: học từ vựng, luyện thi IELTS, TOEIC, TOEFL.' : 'on the Lexkite Blog.'}`, items: it, kind: 'tag', noindex: it.length < 2 });
  for (const g of groups) {
    const pages = Math.max(1, Math.ceil(g.items.length / PER));
    for (let n = 1; n <= pages; n++) {
      const u = n === 1 ? g.u : `${g.u}${sg.page}/${n}/`, items = g.items.slice((n - 1) * PER, n * PER);
      const crumbs = [[t.home, '/'], [t.blog, b], ...(g.kind === 'all' ? [] : [[g.h1, g.u]]), ...(n > 1 ? [[`${t.page} ${n}`, u]] : [])];
      const title = n > 1 ? `${g.name} – ${t.page} ${n}` : g.name;
      const body = `${crumbsHtml(crumbs.length > 1 ? crumbs : [[t.home, '/'], [t.blog, b]])}
<section class="hero"><h1>${esc(g.kind === 'all' ? (C.blogName[lang] || 'Blog') : g.h1)}${n > 1 ? ` – ${t.page} ${n}` : ''}</h1><p>${esc(g.desc)}</p></section>
<nav class="cats" aria-label="${t.cat}"><a href="${b}"${g.kind === 'all' ? ' aria-current="page"' : ''}>${t.all}</a>${Object.keys(CATEGORIES).filter(k => list.some(p => p.category === k)).map(k => [k, catName(k, lang)]).map(([k, v]) => `<a href="${b}${sg.cat}/${k}/"${g.cat === k ? ' aria-current="page"' : ''}>${esc(v)}</a>`).join('')}</nav>
${items.length ? `<div class="grid">${items.map((p, i) => card(p, 'h2', n === 1 && i < 2)).join('')}</div>` : `<p>${lang === 'vi' ? 'Bài viết đầu tiên sắp ra mắt.' : 'First posts coming soon.'}</p>`}
${pages > 1 ? `<nav class="pager" aria-label="${t.page}">${n > 1 ? `<a rel="prev" href="${n === 2 ? g.u : `${g.u}${sg.page}/${n - 1}/`}">${t.newer}</a>` : '<span></span>'}${n < pages ? `<a rel="next" href="${g.u}trang/${n + 1}/">${t.older}</a>` : ''}</nav>` : ''}`;
      const jsonld = [crumbsLd(crumbs), { '@context': 'https://schema.org', '@type': g.kind === 'all' ? 'Blog' : 'CollectionPage', name: title, description: g.desc, url: SITE + u, inLanguage: lang, ...(g.kind === 'all' ? { publisher: { '@type': 'Organization', name: 'Lexkite', url: SITE + '/' } } : {}), hasPart: items.map(p => ({ '@type': 'BlogPosting', headline: p.title, url: SITE + postUrl(p), datePublished: iso(when(p)) })) }];
      write(u, layout({ lang, title: `${title} | Lexkite`, desc: g.desc, url: u, body, jsonld, robots: g.noindex || !items.length ? 'noindex,follow' : 'index,follow', img: items[0] ? imgUrl(items[0].cover) : undefined }));
      if (!g.noindex && items.length) sm.push({ loc: u, lastmod: iso(Math.max(...items.map(p => p.updated ? Date.parse(p.updated) : when(p)))) });
    }
  }
  // RSS 2.0 – 20 bài mới nhất
  const xe = s => esc(s).replace(/'/g, '&apos;');
  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
<title>${xe(C.blogName[lang] || 'Blog')}</title>
<link>${SITE}${b}</link>
<description>${xe(C.blogDesc[lang] || C.blogDesc.en)}</description>
<language>${lang}</language>
<atom:link href="${SITE}${b}rss.xml" rel="self" type="application/rss+xml"/>
${list[0] ? `<lastBuildDate>${new Date(when(list[0])).toUTCString()}</lastBuildDate>\n` : ''}${list.slice(0, 20).map(p => `<item><title>${xe(p.title)}</title><link>${SITE}${postUrl(p)}</link><guid isPermaLink="true">${SITE}${postUrl(p)}</guid><pubDate>${new Date(when(p)).toUTCString()}</pubDate><category>${xe(catName(p.category, p.lang))}</category><description>${xe(p.description)}</description></item>`).join('\n')}
</channel>
</rss>
`;
  fs.mkdirSync(path.join(OUT, b), { recursive: true }); fs.writeFileSync(path.join(OUT, b, 'rss.xml'), rss);
}

// Trang tĩnh của blog (giới thiệu, quy trình biên tập…): content/blog/pages/<lang>/<slug>.md → /blog/<slug>/
for (const lang of fs.existsSync(`${ROOT}/pages`) ? fs.readdirSync(`${ROOT}/pages`) : []) for (const f of fs.readdirSync(`${ROOT}/pages/${lang}`).filter(f => f.endsWith('.md'))) {
  const { data, body } = parse(fs.readFileSync(`${ROOT}/pages/${lang}/${f}`, 'utf8'), f), t = T(lang), u = `${base(lang)}${data.slug || f.slice(0, -3)}/`;
  const crumbs = [[t.home, '/'], [t.blog, base(lang)], [data.title, u]];
  write(u, layout({ lang, title: `${data.title} | Lexkite`, desc: data.description, url: u, body: `${crumbsHtml(crumbs)}<article class="post"><h1>${esc(data.title)}</h1>${render(body, lang).html}</article>`,
    jsonld: [crumbsLd(crumbs), { '@context': 'https://schema.org', '@type': 'AboutPage', name: data.title, description: data.description, url: SITE + u, inLanguage: lang, about: { '@type': 'Organization', name: 'Lexkite', url: SITE + '/', logo: `${SITE}/icons/icon-512.png` } }] }));
  sm.push({ loc: u, lastmod: iso(NOW) });
}

// Sitemap blog: tối đa 10.000 URL/file (sitemap-blog.xml, sitemap-blog-2.xml…) – build-sitemap-index.mjs gom vào sitemap.xml
for (const f of fs.existsSync(OUT) ? fs.readdirSync(OUT).filter(f => /^sitemap-blog(-[a-z]{2}(-[a-z]+)?)?(-\d+)?\.xml$/.test(f)) : []) fs.rmSync(path.join(OUT, f));
const CH = 10000; // sitemap-blog-<lang>.xml (thêm -2, -3… khi > 10.000 URL); chưa có bài → không ghi file rỗng
for (const lang of new Set(sm.map(e => e.loc.split('/')[1]))) { const all_ = sm.filter(e => e.loc.split('/')[1] === lang);
for (let k = 0; k * CH < all_.length; k++) {
  const part = all_.slice(k * CH, (k + 1) * CH);
  const x = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${part.map(e => `  <url><loc>${SITE}${e.loc}</loc><lastmod>${e.lastmod}</lastmod>${(e.alt || []).map(a => `<xhtml:link rel="alternate" hreflang="${a.lang}" href="${SITE}${a.url}"/>`).join('')}</url>`).join('\n')}
</urlset>
`;
  fs.mkdirSync(OUT, { recursive: true }); fs.writeFileSync(path.join(OUT, `sitemap-blog-${lang}${k ? `-${k + 1}` : ''}.xml`), x);
} }
const queued = all.filter(p => p.status !== 'draft' && !isLive(p, NOW)).length;
console.log(`✓ Blog: ${posts.length} bài phát hành, ${queued} bài chờ lịch · ${written.length} trang · RSS · ${sm.length} URL sitemap`);
