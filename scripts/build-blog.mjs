// Blog tĩnh (SEO): content/blog/<lang>/*.md → dist/blog/… lúc build. Chỉ phát hành bài publishAt ≤ giờ build (BLOG_NOW để thử,
// BLOG_DRAFTS=1 xem trước mọi bài). Sinh: bài /blog/<slug>/, danh sách + phân trang, chuyên mục, thẻ, RSS, sitemap-blog.xml.
// Ảnh: CDN repo lexkite-media (content/blog/config.json → mediaBase); BLOG_MEDIA_LOCAL=1 chép ảnh .media/out vào dist để xem thử.
import fs from 'node:fs'; import path from 'node:path';
import { loadPosts, parse, FAQ_RE, isLive, publishTime, wordCount, config, CATEGORIES, ROOT, loadMedia } from './lib/blog-content.mjs';
import { specOf, mediaId, diagramHtml } from './lib/blog-images.mjs';
import { embedWatermark } from '../content/protection/watermark.mjs';
import { CSS, esc, ld, siteHeader, siteFooter, crumbsHtml, crumbsLd as crumbsLdAt, appHref, landingHref, EXT_STORE, EXT_JS } from './lib/site-layout.mjs';
// Lời mời cài add-on cuối bài: chữ dùng chung với landing (content/landing/<lang>.json → ext), hiện/ẩn bởi EXT_JS (web/js/ext-cta.js)
const EXT_EN = JSON.parse(fs.readFileSync('content/landing/en.json', 'utf8')).ext;
const extOf = l => { try { return { ...EXT_EN, ...(JSON.parse(fs.readFileSync(`content/landing/${l}.json`, 'utf8')).ext || {}) }; } catch (e) { return EXT_EN; } };
const extBox = l => { const x = extOf(l); return `<aside class="cta" data-ext-cta="blog" hidden><p><strong>🧩 ${esc(x.h)}</strong><br>${esc(x.p)}</p><a class="btn" href="${EXT_STORE}" target="_blank" rel="noopener" data-ext-cta="blog">${esc(x.btn)}</a></aside>`; };

const COPY_SRC = {
  vi: 'Nguồn: {title} – {url} (Lexkite)',
  en: 'Source: {title} – {url} (Lexkite)',
  es: 'Fuente: {title} – {url} (Lexkite)',
  pt: 'Fonte: {title} – {url} (Lexkite)',
  fr: 'Source : {title} – {url} (Lexkite)',
  de: 'Quelle: {title} – {url} (Lexkite)',
  id: 'Sumber: {title} – {url} (Lexkite)',
  th: 'ที่มา: {title} – {url} (Lexkite)',
  zh: '来源：{title} – {url} (Lexkite)',
  ja: '出典：{title} – {url} (Lexkite)',
  ko: '출처: {title} – {url} (Lexkite)',
  hi: 'स्रोत: {title} – {url} (Lexkite)',
  ar: 'المصدر: {title} – {url} (Lexkite)',
  ru: 'Источник: {title} – {url} (Lexkite)',
  tr: 'Kaynak: {title} – {url} (Lexkite)',
};
const copyJs = lang => `<script>document.addEventListener('copy',e=>{const s=window.getSelection();if(!s||s.rangeCount===0)return;const t=s.toString();if(t.length<=200)return;const m="\\n\\n${(COPY_SRC[lang] || COPY_SRC.en).replace(/"/g, '\\"')}".replace('{title}',document.title.replace(/\\s*\\|\\s*Lexkite$/i,'')).replace('{url}',location.href.split('#')[0]);e.clipboardData.setData('text/plain',t+m);e.preventDefault();});</script>`;

const C = config(), SITE = C.site.replace(/\/$/, ''), DEF = C.defaultLang || 'vi', PER = C.postsPerPage || 12;
const NOW = process.env.BLOG_NOW ? Date.parse(process.env.BLOG_NOW) : Date.now(), DRAFTS = process.env.BLOG_DRAFTS === '1';
const OUT = process.env.BLOG_OUT || 'dist';
const MEDIA = loadMedia(ROOT).items; // media.json (ảnh chung) + media/<lang>.json (ảnh riêng từng bài – CI blog-images)
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

let LIVE = new Set(), CUR = DEF, CURP = null; // CURP: bài đang dựng (giải media:@id, {{diagram: id}})
 // CUR: ngôn ngữ của trang đang dựng // URL các bài đã phát hành (gán sau khi có danh sách bài)
// ---------- Chữ giao diện theo ngôn ngữ (bản dịch sau này chỉ cần thêm khóa) ----------
const COPY = {
  vi: 'Bài viết được biên soạn độc quyền bởi đội ngũ học thuật Lexkite (lexkite.com). Vui lòng ghi rõ nguồn khi trích dẫn.',
  en: 'This article was written exclusively by the Lexkite academic team (lexkite.com). Please credit the source when quoting.',
};
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
  pt: { blog: "Blog", home: "Início", open: "Abrir o app", min: "min de leitura", toc: "Sumário", related: "Artigos relacionados", tags: "Tags", page: "Página", newer: "← Mais recentes", older: "Mais antigos →", all: "Todos", updated: "Atualizado", play: "Reproduzir vídeo", cat: "Categoria", tagT: "Artigos sobre", foot: "Lexkite – vocabulário e preparação para IELTS, TOEIC e TOEFL grátis. Conteúdo original.", tm: "IELTS, TOEIC e TOEFL são marcas registradas de seus respectivos proprietários; a Lexkite é um produto independente.", skip: "Pular para o conteúdo", about: "Sobre", try: "Aprenda grátis com a Lexkite", tryD: "Flashcards FSRS, dicionário bilíngue, prática das 4 habilidades e simulados – sem cartão de crédito.", words: "Vocabulário", samples: "Redações modelo", seg: { cat: 'categoria', tag: 'tag', page: 'pagina' }, aboutSlug: 'sobre', nav: { words: '/en/vocabulary/', samples: '/en/samples/' }, dir: 'ltr',
    cats: { "tu-vung": "Vocabulário", "ielts": "IELTS", "toeic": "TOEIC", "toefl": "TOEFL", "phuong-phap": "Métodos de estudo", "ngu-phap": "Gramática", "phat-am": "Pronúncia", "ky-nang": "Habilidades em inglês" } },
  fr: { blog: "Blog", home: "Accueil", open: "Ouvrir l'app", min: "min de lecture", toc: "Sommaire", related: "Articles liés", tags: "Étiquettes", page: "Page", newer: "← Plus récents", older: "Plus anciens →", all: "Tous", updated: "Mis à jour", play: "Lire la vidéo", cat: "Catégorie", tagT: "Articles sur", foot: "Lexkite – vocabulaire et préparation IELTS, TOEIC, TOEFL gratuits. Contenu original.", tm: "IELTS, TOEIC et TOEFL sont des marques de leurs propriétaires respectifs ; Lexkite est un produit indépendant.", skip: "Aller au contenu", about: "À propos", try: "Apprenez gratuitement avec Lexkite", tryD: "Flashcards FSRS, dictionnaire bilingue, entraînement aux 4 compétences et examens blancs – sans carte bancaire.", words: "Vocabulaire", samples: "Rédactions modèles", seg: { cat: 'categorie', tag: 'etiquette', page: 'page' }, aboutSlug: 'a-propos', nav: { words: '/en/vocabulary/', samples: '/en/samples/' }, dir: 'ltr',
    cats: { "tu-vung": "Vocabulaire", "ielts": "IELTS", "toeic": "TOEIC", "toefl": "TOEFL", "phuong-phap": "Méthodes d'apprentissage", "ngu-phap": "Grammaire", "phat-am": "Prononciation", "ky-nang": "Compétences en anglais" } },
  de: { blog: "Blog", home: "Startseite", open: "App öffnen", min: "Min. Lesezeit", toc: "Inhalt", related: "Ähnliche Artikel", tags: "Schlagwörter", page: "Seite", newer: "← Neuere", older: "Ältere →", all: "Alle", updated: "Aktualisiert", play: "Video abspielen", cat: "Kategorie", tagT: "Artikel über", foot: "Lexkite – Wortschatz und IELTS-, TOEIC- und TOEFL-Vorbereitung kostenlos. Eigene Inhalte.", tm: "IELTS, TOEIC und TOEFL sind Marken ihrer jeweiligen Inhaber; Lexkite ist ein unabhängiges Produkt.", skip: "Zum Inhalt springen", about: "Über uns", try: "Kostenlos lernen mit Lexkite", tryD: "FSRS-Karteikarten, zweisprachiges Wörterbuch, Training aller 4 Fertigkeiten und Probetests – ohne Kreditkarte.", words: "Wortschatz", samples: "Musteraufsätze", seg: { cat: 'kategorie', tag: 'schlagwort', page: 'seite' }, aboutSlug: 'ueber-uns', nav: { words: '/en/vocabulary/', samples: '/en/samples/' }, dir: 'ltr',
    cats: { "tu-vung": "Wortschatz", "ielts": "IELTS", "toeic": "TOEIC", "toefl": "TOEFL", "phuong-phap": "Lernmethoden", "ngu-phap": "Grammatik", "phat-am": "Aussprache", "ky-nang": "Englisch-Fertigkeiten" } },
  tr: { blog: "Blog", home: "Ana sayfa", open: "Uygulamayı aç", min: "dk okuma", toc: "İçindekiler", related: "İlgili yazılar", tags: "Etiketler", page: "Sayfa", newer: "← Daha yeni", older: "Daha eski →", all: "Tümü", updated: "Güncellendi", play: "Videoyu oynat", cat: "Kategori", tagT: "Hakkındaki yazılar", foot: "Lexkite – ücretsiz kelime ve IELTS, TOEIC, TOEFL hazırlığı. Özgün içerik.", tm: "IELTS, TOEIC ve TOEFL ilgili sahiplerinin ticari markalarıdır; Lexkite bağımsız bir üründür.", skip: "İçeriğe geç", about: "Hakkında", try: "Lexkite ile ücretsiz öğrenin", tryD: "FSRS bilgi kartları, iki dilli sözlük, 4 beceri pratiği ve deneme sınavları – kredi kartı gerekmez.", words: "Kelime", samples: "Örnek kompozisyonlar", seg: { cat: 'kategori', tag: 'etiket', page: 'sayfa' }, aboutSlug: 'hakkinda', nav: { words: '/en/vocabulary/', samples: '/en/samples/' }, dir: 'ltr',
    cats: { "tu-vung": "Kelime bilgisi", "ielts": "IELTS", "toeic": "TOEIC", "toefl": "TOEFL", "phuong-phap": "Çalışma yöntemleri", "ngu-phap": "Dil bilgisi", "phat-am": "Telaffuz", "ky-nang": "İngilizce becerileri" } },
  ru: { blog: "Блог", home: "Главная", open: "Открыть приложение", min: "мин чтения", toc: "Содержание", related: "Похожие статьи", tags: "Теги", page: "Страница", newer: "← Новее", older: "Старее →", all: "Все", updated: "Обновлено", play: "Смотреть видео", cat: "Рубрика", tagT: "Статьи по теме", foot: "Lexkite – бесплатные слова и подготовка к IELTS, TOEIC, TOEFL. Оригинальные материалы.", tm: "IELTS, TOEIC и TOEFL – товарные знаки их владельцев; Lexkite – независимый продукт.", skip: "Перейти к содержанию", about: "О блоге", try: "Учитесь бесплатно с Lexkite", tryD: "Карточки FSRS, двуязычный словарь, тренировка 4 навыков и пробные тесты – без банковской карты.", words: "Слова", samples: "Примеры эссе", seg: { cat: 'category', tag: 'tag', page: 'page' }, aboutSlug: 'about', nav: { words: '/en/vocabulary/', samples: '/en/samples/' }, dir: 'ltr',
    cats: { "tu-vung": "Лексика", "ielts": "IELTS", "toeic": "TOEIC", "toefl": "TOEFL", "phuong-phap": "Методы обучения", "ngu-phap": "Грамматика", "phat-am": "Произношение", "ky-nang": "Навыки английского" } },
  ar: { blog: "المدونة", home: "الرئيسية", open: "افتح التطبيق", min: "دقائق للقراءة", toc: "المحتويات", related: "مقالات ذات صلة", tags: "الوسوم", page: "صفحة", newer: "→ الأحدث", older: "الأقدم ←", all: "الكل", updated: "آخر تحديث", play: "تشغيل الفيديو", cat: "التصنيف", tagT: "مقالات عن", foot: "Lexkite – مفردات وتحضير مجاني لاختبارات IELTS وTOEIC وTOEFL. محتوى أصلي.", tm: "IELTS وTOEIC وTOEFL علامات تجارية لأصحابها؛ Lexkite منتج مستقل.", skip: "انتقل إلى المحتوى", about: "عن المدونة", try: "تعلّم مجانًا مع Lexkite", tryD: "بطاقات FSRS وقاموس ثنائي اللغة وتدريب على المهارات الأربع واختبارات تجريبية – دون بطاقة ائتمان.", words: "المفردات", samples: "مقالات نموذجية", seg: { cat: 'category', tag: 'tag', page: 'page' }, aboutSlug: 'about', nav: { words: '/en/vocabulary/', samples: '/en/samples/' }, dir: 'rtl',
    cats: { "tu-vung": "المفردات", "ielts": "IELTS", "toeic": "TOEIC", "toefl": "TOEFL", "phuong-phap": "طرق التعلّم", "ngu-phap": "القواعد", "phat-am": "النطق", "ky-nang": "مهارات الإنجليزية" } },
  hi: { blog: "ब्लॉग", home: "होम", open: "ऐप खोलें", min: "मिनट में पढ़ें", toc: "विषय-सूची", related: "संबंधित लेख", tags: "टैग", page: "पेज", newer: "← नए", older: "पुराने →", all: "सभी", updated: "अपडेट किया गया", play: "वीडियो चलाएँ", cat: "श्रेणी", tagT: "इस विषय पर लेख", foot: "Lexkite – मुफ़्त शब्दावली और IELTS, TOEIC, TOEFL की तैयारी। मौलिक सामग्री।", tm: "IELTS, TOEIC और TOEFL अपने-अपने मालिकों के ट्रेडमार्क हैं; Lexkite एक स्वतंत्र उत्पाद है।", skip: "मुख्य सामग्री पर जाएँ", about: "हमारे बारे में", try: "Lexkite के साथ मुफ़्त सीखें", tryD: "FSRS फ़्लैशकार्ड, द्विभाषी शब्दकोश, चारों कौशल का अभ्यास और मॉक टेस्ट – क्रेडिट कार्ड की ज़रूरत नहीं।", words: "शब्दावली", samples: "नमूना निबंध", seg: { cat: 'category', tag: 'tag', page: 'page' }, aboutSlug: 'about', nav: { words: '/en/vocabulary/', samples: '/en/samples/' }, dir: 'ltr',
    cats: { "tu-vung": "शब्दावली", "ielts": "IELTS", "toeic": "TOEIC", "toefl": "TOEFL", "phuong-phap": "पढ़ाई के तरीके", "ngu-phap": "व्याकरण", "phat-am": "उच्चारण", "ky-nang": "अंग्रेज़ी कौशल" } },
  ko: { blog: "블로그", home: "홈", open: "앱 열기", min: "분 소요", toc: "목차", related: "관련 글", tags: "태그", page: "페이지", newer: "← 최신 글", older: "이전 글 →", all: "전체", updated: "업데이트", play: "동영상 재생", cat: "카테고리", tagT: "관련 글:", foot: "Lexkite – 무료 영어 단어 학습과 IELTS·토익·토플 대비. 모든 콘텐츠는 직접 제작했습니다.", tm: "IELTS, TOEIC, TOEFL은 각 소유자의 상표이며 Lexkite는 독립 서비스입니다.", skip: "본문으로 건너뛰기", about: "블로그 소개", try: "Lexkite에서 무료로 공부하기", tryD: "FSRS 플래시카드, 영한 사전, 4개 영역 연습과 모의고사 – 신용카드 필요 없음.", words: "단어", samples: "모범 답안", seg: { cat: 'category', tag: 'tag', page: 'page' }, aboutSlug: 'about', nav: { words: '/en/vocabulary/', samples: '/en/samples/' }, dir: 'ltr',
    cats: { "tu-vung": "영어 단어", "ielts": "IELTS", "toeic": "토익", "toefl": "토플", "phuong-phap": "공부법", "ngu-phap": "영문법", "phat-am": "발음", "ky-nang": "영어 스킬" } },
  zh: { blog: "博客", home: "首页", open: "打开应用", min: "分钟阅读", toc: "目录", related: "相关文章", tags: "标签", page: "页", newer: "← 较新", older: "较旧 →", all: "全部", updated: "更新于", play: "播放视频", cat: "分类", tagT: "相关文章：", foot: "Lexkite – 免费背单词，备考雅思、托业、托福。全部原创内容。", tm: "IELTS、TOEIC、TOEFL 为其各自所有者的商标；Lexkite 为独立产品。", skip: "跳到正文", about: "关于本博客", try: "在 Lexkite 免费学习", tryD: "FSRS 记忆卡、英汉词典、四项技能练习和模拟考试——无需信用卡。", words: "词汇", samples: "范文", seg: { cat: 'category', tag: 'tag', page: 'page' }, aboutSlug: 'about', nav: { words: '/en/vocabulary/', samples: '/en/samples/' }, dir: 'ltr',
    cats: { "tu-vung": "英语词汇", "ielts": "雅思", "toeic": "托业", "toefl": "托福", "phuong-phap": "学习方法", "ngu-phap": "英语语法", "phat-am": "发音", "ky-nang": "英语技能" } },
  th: { blog: "บล็อก", home: "หน้าแรก", open: "เปิดแอป", min: "นาทีในการอ่าน", toc: "สารบัญ", related: "บทความที่เกี่ยวข้อง", tags: "แท็ก", page: "หน้า", newer: "← ใหม่กว่า", older: "เก่ากว่า →", all: "ทั้งหมด", updated: "อัปเดตเมื่อ", play: "เล่นวิดีโอ", cat: "หมวดหมู่", tagT: "บทความเกี่ยวกับ", foot: "Lexkite – เรียนคำศัพท์และเตรียมสอบ IELTS, TOEIC, TOEFL ฟรี เนื้อหาเขียนเองทั้งหมด", tm: "IELTS, TOEIC และ TOEFL เป็นเครื่องหมายการค้าของเจ้าของแต่ละราย Lexkite เป็นผลิตภัณฑ์อิสระ", skip: "ข้ามไปที่เนื้อหา", about: "เกี่ยวกับบล็อก", try: "เรียนฟรีกับ Lexkite", tryD: "แฟลชการ์ด FSRS พจนานุกรมสองภาษา ฝึกครบ 4 ทักษะ และข้อสอบจำลอง – ไม่ต้องใช้บัตรเครดิต", words: "คำศัพท์", samples: "เรียงความตัวอย่าง", seg: { cat: 'category', tag: 'tag', page: 'page' }, aboutSlug: 'about', nav: { words: '/en/vocabulary/', samples: '/en/samples/' }, dir: 'ltr',
    cats: { "tu-vung": "คำศัพท์", "ielts": "IELTS", "toeic": "TOEIC", "toefl": "TOEFL", "phuong-phap": "วิธีเรียน", "ngu-phap": "ไวยากรณ์", "phat-am": "การออกเสียง", "ky-nang": "ทักษะภาษาอังกฤษ" } },
};
const T = l => ({ ...L.en, ...(L[l] || {}) }); // ngôn ngữ chưa dịch giao diện → tiếng Anh
const SEG = l => T(l).seg, catName = (k, l) => (L[l] && L[l].cats && L[l].cats[k]) || CATEGORIES[k] || k; // tên chuyên mục theo ngôn ngữ (mặc định tiếng Việt)
const ABOUTS = new Set(Object.values(L).map(x => x.aboutSlug));
const SEGS = new Set(Object.values(L).flatMap(x => Object.values(x.seg)));
const base = l => `/${l}/blog/`; // thư mục theo ngôn ngữ: /vi/blog/, /en/blog/… (/blog/ → 301 sang /vi/blog/ trong _redirects)
const postUrl = p => `${base(p.lang)}${p.slug}/`;
const slugify = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const fmtDate = (t, l) => new Date(t).toLocaleDateString(l === 'vi' ? 'vi-VN' : l, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Ho_Chi_Minh' });
const iso = t => new Date(t).toISOString();

// ---------- Ảnh: <picture> AVIF + WebP, srcset, width/height (CLS 0) ----------
// media:@s1 trong bài → ảnh riêng <lang>-<slug>--s1 (sổ media/<lang>.json); tên file ảnh riêng = mã băm nội dung (blog/p/<hash>-<w>.<ext>)
const rid = id => (id.startsWith('@') && CURP ? mediaId(CURP, id.slice(1)) : id);
const stem = (id, m) => m.key || `${id}-${m.hash}`;
// Ảnh bìa: bản riêng của bài (CI đã render) nếu có, không thì ảnh chung `cover:` (alt = coverAlt). Alt bìa riêng = alt tự sinh (đúng ảnh).
const coverOf = p => { const id = mediaId(p, 'cover'), m = MEDIA[id]; return m ? { id, alt: m.alt } : { id: p.cover, alt: p.coverAlt || p.title }; };
function picture(id, alt, { eager = false, sizes = '(min-width: 760px) 720px, 100vw' } = {}) {
  id = rid(id); const m = MEDIA[id];
  if (!m) return `<!-- thiếu ảnh ${esc(id)} -->`;
  if (!String(alt || '').trim() && m.alt) alt = m.alt; // ![](media:@s1 …) để trống alt → alt tự sinh từ bản ghi chụp
  const u = (w, f) => `${m.base || MBASE}blog/${stem(id, m)}-${w}.${f}`.replace('/blog/media/blog/', '/blog/media/');
  const set = f => m.widths.map(w => `${u(w, f)} ${w}w`).join(', '), mid = m.widths[Math.min(1, m.widths.length - 1)];
  return `<picture><source type="image/avif" srcset="${set('avif')}" sizes="${sizes}"><source type="image/webp" srcset="${set('webp')}" sizes="${sizes}"><img src="${u(mid, 'webp')}" alt="${esc(alt)}" width="${m.w}" height="${m.h}" ${eager ? 'fetchpriority="high" decoding="async"' : 'loading="lazy" decoding="async"'}></picture>`;
}
const imgUrl = (id, w = 1440) => { const m = MEDIA[id]; if (!m) return `${SITE}/og-default.png`; if (m.og) return `${m.base || MBASE}blog/${m.key}-og.jpg`.replace(/^\//, SITE + '/'); const ww = m.widths.includes(w) ? w : m.widths.at(-1); return `${m.base || MBASE}blog/${stem(id, m)}-${ww}.webp`.replace(/^\//, SITE + '/'); };

// ---------- Markdown tối giản (đủ cho bài blog, không phụ thuộc gói ngoài) ----------
// Chỉ cho phép link/ảnh tương đối hoặc http(s)/mailto – chặn javascript:/data:/vbscript: trong Markdown (XSS)
// Liên kết vào app trong bài (viết kiểu cũ /#/…, lexkite.com/#/…, /?hl=xx#/…) → app học ở /app/#/… (trang / giờ là trang giới thiệu)
export const toApp = h => String(h).replace(/^(?:https:\/\/lexkite\.com)?\/(\?hl=[a-z]{2})?#\//, '/app/$1#/');
const safeUrl = u => { const m = /^([a-z][a-z0-9+.-]*):/i.exec(u); return !m || /^(https?|mailto)$/i.test(m[1]) ? u : ''; };
function inline(s) {
  const codes = [];
  s = esc(s).replace(/`([^`]+)`/g, (m, c) => `\u0000${codes.push(c) - 1}\u0000`);
  s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+&quot;([^&]*)&quot;)?\)/g, (m, alt, src) => src.startsWith('media:') ? (MEDIA[rid(src.slice(6))] ? picture(src.slice(6), alt) : '') : safeUrl(src) ? `<img src="${src}" alt="${alt}" loading="lazy">` : alt)
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, t, h) => {
      if (!safeUrl(h)) return t;
      h = toApp(h);
      if (h.startsWith('/blog/')) h = base(CUR) + h.slice(6); // link /blog/<slug>/ trong bài → thư mục ngôn ngữ của bài
      const bm = h.match(/^\/(?:[a-z]{2}(?:-[a-z]+)?\/)?blog\/([^/#?]+)\/$/);
      if (bm && !SEGS.has(bm[1]) && !ABOUTS.has(bm[1]) && !LIVE.has(h)) return t; // bài đích chưa đến giờ đăng → chữ thường, không tạo link 404
      const ext = /^https?:/.test(h) && !h.startsWith(SITE), app = h.startsWith('/app/');
      return `<a href="${h}"${ext ? ' rel="noopener" target="_blank"' : ''}${app ? ' class="app"' : ''}>${t}</a>`;
    })
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/(^|[^*\w])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>').replace(/(^|\s)_([^_]+)_(?=\s|[.,;:!?]|$)/g, '$1<em>$2</em>');
  return s.replace(/\u0000(\d+)\u0000/g, (m, i) => `<code>${codes[i]}</code>`);
}
// Liên kết nội bộ thương hiệu (chống cào bài, tăng liên kết về app): chỉ lần xuất hiện ĐẦU, tối đa 3 link/bài, không trong tiêu đề/link sẵn có
const AUTOLINK = {
  vi: [['flashcard FSRS', '/app/#/review'], ['tiện ích Chrome', '/app/#/settings'], ['ôn thi IELTS', '/'], ['tra từ', '/app/#/dict'], ['luyện phát âm', '/app/#/pron']],
  en: [['FSRS flashcards', '/app/?hl=en#/review'], ['Chrome extension', '/app/?hl=en#/settings'], ['IELTS preparation', '/en/'], ['look up words', '/app/?hl=en#/dict'], ['pronunciation practice', '/app/?hl=en#/pron']],
};
let LINKED = null;
function autolink(html, lang) {
  const list = AUTOLINK[lang]; if (!list || !LINKED || LINKED.n >= 3) return html;
  // chỉ thay trong phần chữ ngoài thẻ <a>…</a>
  return html.split(/(<a\b[\s\S]*?<\/a>|<[^>]+>)/).map(part => {
    if (part.startsWith('<') || LINKED.n >= 3) return part;
    for (const [kw, href] of list) {
      if (LINKED.n >= 3 || LINKED.has(kw)) continue;
      const re = new RegExp(`(^|[^\\p{L}])(${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})(?![\\p{L}])`, 'iu');
      if (re.test(part)) { part = part.replace(re, (m, pre, w) => `${pre}<a href="${SITE}${href}">${w}</a>`); LINKED.add(kw); LINKED.n++; }
    }
    return part;
  }).join('');
}
function render(md, lang, cover) {
  CUR = lang; LINKED = Object.assign(new Set(), { n: 0 });
  const lines = md.replace(/\r/g, '').split('\n'), out = [], toc = [], faq = [], videos = [], ids = new Set();
  let i = 0, inFaq = false, q = null;
  const para = [];
  const flush = () => { if (para.length) { const h = autolink(inline(para.join(' ')), lang); out.push(`<p>${h}</p>`); if (q && !q.a) q.a = para.join(' ').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/[*_`]/g, ''); para.length = 0; } };
  const hid = t => { let id = slugify(t) || 'muc', k = id, n = 2; while (ids.has(k)) k = `${id}-${n++}`; ids.add(k); return k; };
  while (i < lines.length) {
    const ln = lines[i];
    let m;
    if (!ln.trim()) { flush(); i++; continue; }
    if (ln.startsWith('```')) { flush(); const buf = []; i++; while (i < lines.length && !lines[i].startsWith('```')) buf.push(lines[i++]); i++; out.push(`<pre><code>${esc(buf.join('\n'))}</code></pre>`); continue; }
    if ((m = ln.match(/^(#{2,4})\s+(.+?)\s*#*$/))) {
      flush(); const lv = m[1].length, txt = m[2], id = hid(txt);
      if (lv === 2) { inFaq = FAQ_RE.test(txt); q = null; toc.push({ id, txt }); }
      if (lv === 3 && inFaq) { q = { q: txt.replace(/[*_`]/g, ''), a: '' }; faq.push(q); }
      out.push(`<h${lv} id="${id}">${inline(txt)}</h${lv}>`); i++; continue;
    }
    if ((m = ln.match(/^\{\{\s*youtube:\s*([\w-]*)\s*(?:\|\s*(.*?))?\s*\}\}\s*$/))) { // slot video tùy chọn: ID trống → không hiển thị
      flush(); if (m[1]) { videos.push(m[1]); out.push(`<div class="yt" data-id="${m[1]}"><img src="https://i.ytimg.com/vi/${m[1]}/hqdefault.jpg" alt="${esc(m[2] || 'Video')}" width="480" height="360" loading="lazy"><button type="button" aria-label="${T(lang).play}: ${esc(m[2] || '')}"></button></div>`); } else out.push(`<!-- youtube-slot: ${esc(m[2] || '')} -->`);
      i++; continue;
    }
    if ((m = ln.match(/^\{\{\s*cta:\s*(\S+)\s*\|\s*(.*?)\s*\}\}\s*$/))) { flush(); out.push(`<aside class="cta"><p><strong>${inline(m[2])}</strong></p><a class="btn" href="${esc(toApp(safeUrl(m[1]) || appHref(lang)))}">${T(lang).open} ${T(lang).dir === 'rtl' ? '←' : '→'}</a></aside>`); i++; continue; }
    if ((m = ln.match(/^!\[([^\]]*)\]\(media:(@?[\w-]+)(?:\s+"([^"]*)")?\)\s*$/))) { flush(); if (m[2] === cover || (m[2].startsWith('@') && !MEDIA[rid(m[2])])) { i++; continue; } // trùng ảnh bìa / ảnh riêng chưa render → bỏ (blog-check chặn trước giờ đăng)
      out.push(`<figure>${picture(m[2], m[1])}${m[3] ? `<figcaption>${inline(m[3])}</figcaption>` : ''}</figure>`); i++; continue; }
    if ((m = ln.match(/^\{\{\s*diagram:\s*([a-z][a-z0-9-]*)\s*(?:\|\s*(.*?))?\s*\}\}\s*$/))) { // sơ đồ SVG/HTML nhúng (chữ chọn được, máy tìm kiếm đọc được)
      flush(); const d = CURP && specOf(CURP).diagrams.find(x => x.id === m[1]); out.push(d ? diagramHtml(d, lang, m[2] ? inline(m[2]) : '') : `<!-- thiếu sơ đồ ${esc(m[1])} -->`); i++; continue; }
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


// Nút đổi ngôn ngữ + danh sách chân trang: bản dịch của trang (alt = hreflang) → to(l) (chuyên mục cùng mã, trang giới thiệu) → blog ngôn ngữ đó → trang chủ ngôn ngữ đó
const BLOG_LANGS = new Set([DEF, ...all.filter(p => p.status !== 'draft').map(p => p.lang)]); // ngôn ngữ có /<lang>/blog/ (xem vòng danh sách bên dưới)
const parentOf = l => BLOG_LANGS.has(l) ? base(l) : landingHref(l);
function layout({ lang, title, desc, url, alt = [], to = () => null, img, imgAlt, type = 'website', body, jsonld = [], robots = 'index,follow', extraHead = '', script = '' }) {
  const t = T(lang), b = base(lang), langHref = l => l === lang ? url : (alt.find(a => a.lang === l) || {}).url || to(l) || parentOf(l);
  return `<!doctype html>
<html lang="${lang}" dir="${T(lang).dir || 'ltr'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="robots" content="${robots}">
<meta name="author" content="Lexkite">
<link rel="canonical" href="${SITE}${url}">
${alt.map(a => `<link rel="alternate" hreflang="${a.lang}" href="${SITE}${a.url}">`).join('\n')}
<link rel="alternate" type="application/rss+xml" title="${esc(C.blogName[lang] || C.blogName.en)}" href="${SITE}${b}rss.xml">
<meta name="theme-color" content="#0F3D3E">
<link rel="icon" href="/icons/icon.svg?v=2" type="image/svg+xml">
<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png?v=2">
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
${siteHeader({ nav: [[b, t.blog], [t.nav.words, t.words], [t.nav.samples, t.samples]], open: [appHref(lang), t.open], home: landingHref(lang), lang, langHref })}
<main id="nd">
${body}
</main>
${siteFooter({ lang, text: t.foot, tm: t.tm, year: new Date(NOW).getFullYear(), extra: [[`${b}rss.xml`, 'RSS']], langHref })}
${script}
</body>
</html>`;
}
const YT_JS = `<script>document.addEventListener('click',e=>{const b=e.target.closest('.yt button');if(!b)return;const d=b.parentNode,f=document.createElement('iframe');f.src='https://www.youtube-nocookie.com/embed/'+d.dataset.id+'?autoplay=1&rel=0';f.title=b.getAttribute('aria-label');f.allow='accelerometer;autoplay;encrypted-media;gyroscope;picture-in-picture;fullscreen';f.allowFullscreen=true;d.replaceChildren(f)})</script>`;
const QUIZ_JS = `<script>(function(){var q=document.querySelector('.blog-quiz');if(!q)return;var l=function(){if(window._LK_QZ_S)return;window._LK_QZ_S=1;var s=document.createElement('script');s.src='/blog/quiz.js';s.defer=true;document.body.appendChild(s)};if('IntersectionObserver' in window){var o=new IntersectionObserver(function(es){for(var i=0;i<es.length;i++)if(es[i].isIntersecting){o.disconnect();l();break}},{rootMargin:'300px'});o.observe(q)}else{l()}})();</script>`;
const crumbsLd = items => crumbsLdAt(SITE, items);
// Mini-quiz cuối bài: dựng sẵn khối <details> đáp án (đọc được khi không có JS, crawler thấy nội dung); quiz.js thay bằng bản tương tác.
const QZ_I = (() => { const m = /\n  const I = (\{[\s\S]*?\n  \});/.exec(fs.readFileSync('web/blog/quiz.js', 'utf8')); return m ? Function(`return ${m[1]}`)() : {}; })();
const quizBlock = p => {
  const items = Array.isArray(p.quiz) ? p.quiz : (p.quiz && p.quiz.items) || [], cta = !Array.isArray(p.quiz) && p.quiz && p.quiz.cta;
  if (cta && !/^\/(?!\/)/.test(cta.url || '')) throw new Error(`quiz ${p.lang}/${p.slug}: cta.url phải là đường dẫn trong site (/app/#/…)`);
  items.forEach((q, i) => { if (!q || !q.q || !Array.isArray(q.options) || q.options.length < 2 || !(q.answer >= 0 && q.answer < q.options.length)) throw new Error(`quiz ${p.lang}/${p.slug} câu ${i + 1}: thiếu q/options hoặc answer ngoài phạm vi`); });
  if (!items.length) return '';
  const L = QZ_I[p.lang] || QZ_I.en || [];
  return `<section class="blog-quiz" aria-label="${esc(L[0] || 'Quiz')}" data-quiz="${esc(JSON.stringify(cta ? { items, cta } : items))}" data-lang="${p.lang}" data-app="${esc(appHref(p.lang))}"><details class="toc"><summary>🧠 ${esc(L[0] || 'Quiz')} · ${esc(L[11] || '')}</summary><ol>${items.map(q => `<li><p><strong>${esc(q.q)}</strong></p><p>${q.options.map((o, i) => i === q.answer ? `<strong>✓ ${esc(o)}</strong>` : esc(o)).join(' · ')}</p>${q.explain ? `<p>${esc(q.explain)}</p>` : ''}</li>`).join('')}</ol></details></section>\n`;
};
const card = (p, h = 'h2', eager = false) => `<article class="card"><a class="ti" href="${postUrl(p)}"><div class="pic">${picture(coverOf(p).id, coverOf(p).alt, { eager, sizes: '(min-width: 1080px) 340px, (min-width: 640px) 50vw, 100vw' })}</div><div class="bd"><span class="chip">${esc(catName(p.category, p.lang))}</span><${h}>${esc(p.title)}</${h}><p>${esc(p.description)}</p></div></a></article>`;

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
  CURP = p; const cv = coverOf(p);
  const t = T(p.lang), { html: rawHtml, toc, faq, videos } = render(p.body, p.lang, cv.id), words = wordCount(p.body), mins = Math.max(1, Math.round(words / 220));
  const pub = when(p), upd = p.updated ? Date.parse(p.updated) : pub;
  const html = embedWatermark(rawHtml, `LK:${p.lang}/${p.slug}:${iso(pub).slice(0, 10).replace(/-/g, '')}`);
  const same = posts.filter(x => x !== p && x.lang === p.lang);
  const score = x => (x.category === p.category ? 3 : 0) + (x.tags || []).filter(g => (p.tags || []).includes(g)).length * 2 + (p.body.includes(`/blog/${x.slug}/`) ? 1 : 0);
  const related = same.map(x => [score(x), x]).filter(([s]) => s > 0).sort((a, b) => b[0] - a[0] || when(b[1]) - when(a[1])).slice(0, 3).map(([, x]) => x);
  const cat = catName(p.category, p.lang), b = base(p.lang), sg = SEG(p.lang);
  const crumbs = [[t.home, landingHref(p.lang)], [t.blog, b], [cat, `${b}${sg.cat}/${p.category}/`], [p.title, postUrl(p)]];
  const jsonld = [
    { '@context': 'https://schema.org', '@type': 'BlogPosting', headline: p.title, description: p.description, image: [imgUrl(cv.id)], datePublished: iso(pub), dateModified: iso(upd), inLanguage: p.lang, wordCount: words, keywords: [p.keyword, ...(p.tags || [])].join(', '), articleSection: cat, mainEntityOfPage: SITE + postUrl(p), author: { '@type': 'Organization', name: p.author || 'Lexkite', url: `${SITE}${base(p.lang)}${T(p.lang).aboutSlug}/` }, publisher: { '@type': 'Organization', name: 'Lexkite', url: SITE + '/', logo: { '@type': 'ImageObject', url: `${SITE}/icons/icon-512.png?v=2`, width: 512, height: 512 } } },
    crumbsLd(crumbs),
    ...(faq.length >= 2 ? [{ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) }] : []),
  ];
  const quizHtml = p.quiz ? quizBlock(p) : '';
  const body = `${crumbsHtml(crumbs)}
<article class="post">
<h1>${esc(p.title)}</h1>
<div class="meta"><a class="chip" href="${b}${sg.cat}/${p.category}/">${esc(cat)}</a><span><time datetime="${iso(pub)}">${fmtDate(pub, p.lang)}</time></span>${upd > pub + 864e5 ? `<span>${t.updated} <time datetime="${iso(upd)}">${fmtDate(upd, p.lang)}</time></span>` : ''}<span>${mins} ${t.min}</span></div>
<figure class="cover">${picture(cv.id, cv.alt, { eager: true })}</figure>
${toc.length >= 3 ? `<details class="toc" open><summary>${t.toc}</summary><ol>${toc.map(h => `<li><a href="#${h.id}">${inline(h.txt)}</a></li>`).join('')}</ol></details>` : ''}
${html}
${quizHtml}${(p.tags || []).some(g => (TAGN.get(`${p.lang}/${g}`) || 0) >= 2) ? `<div class="tags" aria-label="${t.tags}">${p.tags.filter(g => (TAGN.get(`${p.lang}/${g}`) || 0) >= 2).map(g => `<a href="${b}${sg.tag}/${g}/">#${esc(g)}</a>`).join('')}</div>` : ''}
<p class="copy">© ${new Date(pub).getFullYear()} Lexkite · ${COPY[p.lang] || COPY.en}</p>
<section class="trybox"><h2>${t.try}</h2><p>${t.tryD}</p><a class="btn" href="${appHref(p.lang)}">${t.open} ${t.dir === 'rtl' ? '←' : '→'}</a></section>
${extBox(p.lang)}
</article>
${related.length ? `<section aria-labelledby="rel"><h2 id="rel">${t.related}</h2><div class="grid">${related.map(x => card(x, 'h3')).join('')}</div></section>` : ''}`;
  write(postUrl(p), layout({ lang: p.lang, title: `${p.title} | Lexkite`, desc: p.description, url: postUrl(p), alt: alts(p), img: imgUrl(cv.id), imgAlt: cv.alt, type: 'article', body, jsonld,
    extraHead: `<meta property="article:published_time" content="${iso(pub)}">\n<meta property="article:modified_time" content="${iso(upd)}">\n<meta property="article:section" content="${esc(cat)}">\n${(p.tags || []).map(g => `<meta property="article:tag" content="${esc(g)}">`).join('\n')}\n`,
    script: (videos.length ? YT_JS : '') + (p.quiz ? QUIZ_JS : '') + copyJs(p.lang) + `<script>${EXT_JS}</script>` }));
  sm.push({ loc: postUrl(p), lastmod: iso(upd), alt: alts(p) });
}
CURP = null;

// Danh sách: /blog/, chuyên mục, thẻ (phân trang)
const langs = [...new Set(all.filter(p => p.status !== 'draft').map(p => p.lang))]; // ngôn ngữ đã có bài (kể cả chờ lịch) → có /<lang>/blog/ + RSS ngay (noindex khi chưa có bài)
if (!langs.includes(DEF)) langs.unshift(DEF);
const liveLangs = [];
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
      const crumbs = [[t.home, landingHref(lang)], [t.blog, b], ...(g.kind === 'all' ? [] : [[g.h1, g.u]]), ...(n > 1 ? [[`${t.page} ${n}`, u]] : [])];
      const title = n > 1 ? `${g.name} – ${t.page} ${n}` : g.name;
      const body = `${crumbsHtml(crumbs.length > 1 ? crumbs : [[t.home, landingHref(lang)], [t.blog, b]])}
<section class="hero"><h1>${esc(g.kind === 'all' ? (C.blogName[lang] || 'Blog') : g.h1)}${n > 1 ? ` – ${t.page} ${n}` : ''}</h1><p>${esc(g.desc)}</p></section>
<nav class="cats" aria-label="${t.cat}"><a href="${b}"${g.kind === 'all' ? ' aria-current="page"' : ''}>${t.all}</a>${Object.keys(CATEGORIES).filter(k => list.some(p => p.category === k)).map(k => [k, catName(k, lang)]).map(([k, v]) => `<a href="${b}${sg.cat}/${k}/"${g.cat === k ? ' aria-current="page"' : ''}>${esc(v)}</a>`).join('')}</nav>
${items.length ? `<div class="grid">${items.map((p, i) => card(p, 'h2', n === 1 && i < 2)).join('')}</div>` : `<p>${lang === 'vi' ? 'Bài viết đầu tiên sắp ra mắt.' : 'First posts coming soon.'}</p>`}
${pages > 1 ? `<nav class="pager" aria-label="${t.page}">${n > 1 ? `<a rel="prev" href="${n === 2 ? g.u : `${g.u}${sg.page}/${n - 1}/`}">${t.newer}</a>` : '<span></span>'}${n < pages ? `<a rel="next" href="${g.u}trang/${n + 1}/">${t.older}</a>` : ''}</nav>` : ''}`;
      const jsonld = [crumbsLd(crumbs), { '@context': 'https://schema.org', '@type': g.kind === 'all' ? 'Blog' : 'CollectionPage', name: title, description: g.desc, url: SITE + u, inLanguage: lang, ...(g.kind === 'all' ? { publisher: { '@type': 'Organization', name: 'Lexkite', url: SITE + '/' } } : {}), hasPart: items.map(p => ({ '@type': 'BlogPosting', headline: p.title, url: SITE + postUrl(p), datePublished: iso(when(p)) })) }];
      write(u, layout({ lang, title: `${title} | Lexkite`, desc: g.desc, url: u, body, jsonld, to: g.kind === 'cat' ? l => posts.some(p => p.lang === l && p.category === g.cat) ? `${base(l)}${SEG(l).cat}/${g.cat}/` : null : undefined, robots: g.noindex || !items.length ? 'noindex,follow' : 'index,follow', img: items[0] ? imgUrl(coverOf(items[0]).id) : undefined, script: copyJs(lang) }));
      if (!g.noindex && items.length) sm.push({ loc: u, lastmod: iso(Math.max(...items.map(p => p.updated ? Date.parse(p.updated) : when(p)))) });
    }
  }
  // RSS 2.0 – 20 bài mới nhất
  const xe = s => esc(s).replace(/'/g, '&apos;');
  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet type="text/xsl" href="/rss.xsl"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
<title>${xe(C.blogName[lang] || 'Blog')}</title>
<link>${SITE}${b}</link>
<description>${xe(C.blogDesc[lang] || C.blogDesc.en)}</description>
<language>${lang}</language>
<atom:link href="${SITE}${b}rss.xml" rel="self" type="application/rss+xml"/>
<atom:link href="https://pubsubhubbub.appspot.com/" rel="hub"/>
${list[0] ? `<lastBuildDate>${new Date(when(list[0])).toUTCString()}</lastBuildDate>\n` : ''}${list.slice(0, 20).map(p => `<item><title>${xe(p.title)}</title><link>${SITE}${postUrl(p)}</link><guid isPermaLink="true">${SITE}${postUrl(p)}</guid><pubDate>${new Date(when(p)).toUTCString()}</pubDate><category>${xe(catName(p.category, p.lang))}</category><description>${xe(p.description)}</description></item>`).join('\n')}
</channel>
</rss>
`;
  fs.mkdirSync(path.join(OUT, b), { recursive: true }); fs.writeFileSync(path.join(OUT, b, 'rss.xml'), rss);
  if (list.length) liveLangs.push(lang);
}
// Danh sách ngôn ngữ đã có bài đăng → app ẩn/hiện lối vào blog mà không phải dò rss từng ngôn ngữ (tránh lỗi 404 khi chưa có blog)
fs.writeFileSync(path.join(OUT, 'blog-langs.json'), JSON.stringify(liveLangs));

// Trang tĩnh của blog (giới thiệu, quy trình biên tập…): content/blog/pages/<lang>/<slug>.md → /blog/<slug>/
// Bản các ngôn ngữ của cùng một trang: khóa translationKey (mặc định 'about' – mỗi ngôn ngữ hiện có đúng 1 trang giới thiệu) → nút đổi ngôn ngữ
const PAGES = (fs.existsSync(`${ROOT}/pages`) ? fs.readdirSync(`${ROOT}/pages`) : []).flatMap(lang => fs.readdirSync(`${ROOT}/pages/${lang}`).filter(f => f.endsWith('.md')).map(f => {
  const { data, body } = parse(fs.readFileSync(`${ROOT}/pages/${lang}/${f}`, 'utf8'), f); return { lang, f, data, body, key: data.translationKey || 'about', u: `${base(lang)}${data.slug || f.slice(0, -3)}/` }; }));
for (const { lang, data, body, key, u } of PAGES) {
  const t = T(lang);
  const crumbs = [[t.home, landingHref(lang)], [t.blog, base(lang)], [data.title, u]];
  write(u, layout({ lang, title: `${data.title} | Lexkite`, desc: data.description, url: u, to: l => (PAGES.find(x => x.key === key && x.lang === l) || {}).u, body: `${crumbsHtml(crumbs)}<article class="post"><h1>${esc(data.title)}</h1>${render(body, lang).html}</article>`,
    script: copyJs(lang),
    jsonld: [crumbsLd(crumbs), { '@context': 'https://schema.org', '@type': 'AboutPage', name: data.title, description: data.description, url: SITE + u, inLanguage: lang, about: { '@type': 'Organization', name: 'Lexkite', url: SITE + '/', logo: `${SITE}/icons/icon-512.png?v=2` } }] }));
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
if (fs.existsSync('web/blog/quiz.js')) {
  fs.mkdirSync(path.join(OUT, 'blog'), { recursive: true });
  fs.copyFileSync('web/blog/quiz.js', path.join(OUT, 'blog', 'quiz.js'));
}
console.log(`✓ Blog: ${posts.length} bài phát hành, ${queued} bài chờ lịch · ${written.length} trang · RSS · ${sm.length} URL sitemap`);
