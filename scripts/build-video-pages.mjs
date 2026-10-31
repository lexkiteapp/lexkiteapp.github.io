// Trang tĩnh /video/<slug>/ (en) + /<lang>/video/<slug>/ (14 ngôn ngữ còn lại) cho video bài học (docs/VIDEO-SCALE-PLAN.md §10):
// video (bìa trước, không tự phát) + phụ đề TIẾNG ANH + transcript tiếng Anh (khung trang theo ngôn ngữ) + JSON-LD VideoObject + hreflang; dist/sitemap-video.xml (chuẩn video sitemap).
// Nguồn: web/data/videos.json + content/video/web/captions/<id>.json (scripts/video/web-rendition.mjs). Mẫu thử (test) → noindex, không vào sitemap.
import fs from 'node:fs';
import { CSS, esc, ld, landingHref, appHref, themePage, themeSwitch, TSW_JS } from './lib/site-layout.mjs';
import { LANGS, MANIFEST, CAPTIONS_DIR, readJSON, videoHref } from './lib/video-web.mjs';

const SITE = 'https://lexkite.com', D = 'dist/';
const P = { // [transcript, cta, nút app, mô tả]
  vi: ['Lời thoại', 'Luyện cụm này trong Lexkite', 'Học miễn phí', 'Video 20 giây học tiếng Anh với giáo viên Mỹ'],
  en: ['Transcript', 'Practice this in Lexkite', 'Learn free', '20-second English lesson with American teachers'],
  es: ['Transcripción', 'Practica esto en Lexkite', 'Aprende gratis', 'Lección de inglés de 20 segundos con profesores estadounidenses'],
  pt: ['Transcrição', 'Pratique isto no Lexkite', 'Aprenda grátis', 'Aula de inglês de 20 segundos com professores americanos'],
  fr: ['Transcription', 'Entraînez-vous sur Lexkite', 'Apprendre gratuitement', 'Leçon d’anglais de 20 secondes avec des professeurs américains'],
  de: ['Transkript', 'Übe das in Lexkite', 'Kostenlos lernen', '20-Sekunden-Englischlektion mit amerikanischen Lehrkräften'],
  id: ['Transkrip', 'Latih ini di Lexkite', 'Belajar gratis', 'Pelajaran bahasa Inggris 20 detik bersama guru Amerika'],
  th: ['บทพูด', 'ฝึกประโยคนี้ใน Lexkite', 'เรียนฟรี', 'บทเรียนภาษาอังกฤษ 20 วินาทีกับครูชาวอเมริกัน'],
  zh: ['字幕文本', '在 Lexkite 练习', '免费学习', '与美国老师一起的 20 秒英语课'],
  ja: ['トランスクリプト', 'Lexkite で練習する', '無料で学ぶ', 'アメリカ人講師による20秒の英語レッスン'],
  ko: ['대본', 'Lexkite에서 연습하기', '무료로 배우기', '미국인 선생님과 함께하는 20초 영어 레슨'],
  hi: ['ट्रांसक्रिप्ट', 'Lexkite में अभ्यास करें', 'मुफ़्त सीखें', 'अमेरिकी शिक्षकों के साथ 20 सेकंड का अंग्रेज़ी पाठ'],
  ar: ['النص', 'تدرّب على هذا في Lexkite', 'تعلّم مجانًا', 'درس إنجليزي مدته 20 ثانية مع معلمين أمريكيين'],
  ru: ['Расшифровка', 'Потренируйтесь в Lexkite', 'Учиться бесплатно', '20-секундный урок английского с американскими преподавателями'],
  tr: ['Metin', 'Bunu Lexkite’ta çalış', 'Ücretsiz öğren', 'Amerikalı öğretmenlerle 20 saniyelik İngilizce dersi'],
};
const RTL = new Set(['ar']);
const iso = s => `PT${Math.round(s)}S`;
const man = readJSON(MANIFEST, { items: [] }), items = man.items || [];
let pages = 0; const sm = [];
for (const it of items) {
  const cap = readJSON(`${CAPTIONS_DIR}/${it.id}.json`, null); if (!cap) continue;
  const alts = LANGS.map(l => `<link rel="alternate" hreflang="${l}" href="${SITE}${videoHref(l, it.slug)}">`).join('') + `<link rel="alternate" hreflang="x-default" href="${SITE}${videoHref('en', it.slug)}">`;
  for (const lang of LANGS) {
    const [tLab, cta, open, dsc] = P[lang], url = SITE + videoHref(lang, it.slug);
    const desc = `${dsc}: ${it.point || it.title}.`.slice(0, 158);
    const lines = cap.transcript.map(x => `<li lang="en">${esc(x.text)}</li>`).join('');
    const vo = { '@context': 'https://schema.org', '@type': 'VideoObject', name: it.title, description: desc, thumbnailUrl: [it.poster], uploadDate: it.created || man.updated, duration: iso(it.duration),
      contentUrl: it.src, inLanguage: 'en', isFamilyFriendly: true, transcript: cap.transcript.map(x => x.text).join(' '), publisher: { '@type': 'Organization', name: 'Lexkite', logo: { '@type': 'ImageObject', url: SITE + '/icons/icon-512.png' } },
      ...(it.quiz ? { learningResourceType: 'video lesson' } : {}), educationalLevel: it.tags.cefr || undefined };
    const html = themePage(`<!doctype html><html lang="${lang}"${RTL.has(lang) ? ' dir="rtl"' : ''}><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(it.title)} – ${esc(dsc)} | Lexkite</title><meta name="description" content="${esc(desc)}">${it.test ? '<meta name="robots" content="noindex">' : ''}
<link rel="canonical" href="${url}">${alts}<meta property="og:type" content="video.other"><meta property="og:title" content="${esc(it.title)}"><meta property="og:image" content="${esc(it.poster)}"><meta property="og:video" content="${esc(it.src)}">
<link rel="icon" href="/icons/icon.svg?v=2" type="image/svg+xml">${ld(vo)}<style>${CSS}
.vp{max-width:760px;margin:0 auto;padding:16px}.vp video{display:block;width:100%;max-width:360px;aspect-ratio:9/16;margin:16px auto;border-radius:16px;background:#000}.vp ol{padding-inline-start:1.2em;line-height:1.6}.vp li{margin:.4em 0}.vp .btn{display:inline-block}.top a{font-weight:700}</style></head>
<body><header class="top" style="padding:12px 16px;display:flex;align-items:center;justify-content:space-between;gap:12px"><a href="${landingHref(lang)}" style="display:inline-flex;align-items:center;min-height:44px">Lexkite</a>${themeSwitch(lang)}</header><main id="nd" class="vp">
<h1 lang="en">${esc(it.title)}</h1><p>${esc(dsc)} · ${Math.round(it.duration)}s${it.tags.cefr ? ' · CEFR ' + esc(it.tags.cefr) : ''}</p>
<video controls playsinline preload="none" crossorigin="anonymous" poster="${esc(it.poster)}" aria-label="${esc(it.title)}"><source src="${esc(it.src)}" type="video/mp4"><track kind="captions" srclang="en" label="English" src="${esc(it.vtt_en)}" default></video>
<p><a class="btn" href="${appHref(lang)}">${esc(cta)} – ${esc(open)} ${RTL.has(lang) ? '←' : '→'}</a></p>
<h2>${esc(tLab)} <small lang="en">(English)</small></h2><ol>${lines}</ol></main><script>${TSW_JS}</script></body></html>`);
    const dir = D + videoHref(lang, it.slug).slice(1); fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(dir + 'index.html', html); pages++;
    if (!it.test) sm.push(`<url><loc>${url}</loc>${LANGS.map(l => `<xhtml:link rel="alternate" hreflang="${l}" href="${SITE}${videoHref(l, it.slug)}"/>`).join('')}<video:video><video:thumbnail_loc>${esc(it.poster)}</video:thumbnail_loc><video:title>${esc(it.title)}</video:title><video:description>${esc(desc)}</video:description><video:content_loc>${esc(it.src)}</video:content_loc><video:duration>${Math.round(it.duration)}</video:duration><video:family_friendly>yes</video:family_friendly></video:video></url>`);
  }
}
if (fs.existsSync(D)) fs.writeFileSync(D + 'sitemap-video.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${sm.join('\n')}\n</urlset>\n`);
console.log(`✓ Trang video: ${pages} trang (${items.length} clip × ngôn ngữ), sitemap-video ${sm.length} URL`);
