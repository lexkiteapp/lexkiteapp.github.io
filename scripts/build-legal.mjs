// Trang pháp lý đa ngôn ngữ: content/legal/{en,vi}/*.html (viết tay) → web/<lang>/{privacy,terms}.html cho 15 ngôn ngữ.
// - en là bản gốc có giá trị pháp lý; vi viết tay; 13 ngôn ngữ còn lại dịch máy từ en theo từng dòng (mỗi dòng = 1 khối HTML),
//   lưu đệm content/legal/cache/<lang>.json theo nội dung dòng → sửa bản en chỉ dịch lại dòng đổi.
// - Dòng chưa dịch được (mạng/giới hạn) → giữ tiếng Anh, không bao giờ lẫn tiếng Việt.
// - /privacy, /terms (gốc) = bản tiếng Anh + tự chuyển sang ngôn ngữ người dùng đã chọn trong app hoặc của trình duyệt.
// Dùng: node scripts/build-legal.mjs [--translate]   (--translate: gọi Google Translate cho dòng còn thiếu – chạy trong GitHub Action)
import fs from 'fs';
const R = new URL('../', import.meta.url), rd = p => fs.readFileSync(new URL(p, R), 'utf8');
const LANGS = { en: 'English', vi: 'Tiếng Việt', es: 'Español', pt: 'Português', fr: 'Français', de: 'Deutsch', id: 'Bahasa Indonesia', th: 'ไทย', zh: '简体中文', ja: '日本語', ko: '한국어', hi: 'हिन्दी', ar: 'العربية', ru: 'Русский', tr: 'Türkçe' };
const PAGES = ['privacy', 'terms'], SITE = 'https://lexkite.com';
const NOTE = 'This translation is provided for your convenience. If there is any difference between versions, the English version prevails.';
const TRANSLATE = process.argv.includes('--translate');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const tagsOf = s => (s.match(/<\/?[a-z0-9]+/gi) || []).map(x => x.toLowerCase()).join(',');

async function gtx(line, tl) {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${tl === 'zh' ? 'zh-CN' : tl}&dt=t&format=html&q=${encodeURIComponent(line)}`;
  for (let i = 0; i < 3; i++) {
    try { const r = await fetch(url); if (r.ok) { const j = await r.json(); const out = j[0].map(x => x[0]).join(''); if (tagsOf(out) === tagsOf(line)) return out; } } catch (e) { /* thử lại */ }
    await sleep(1500 * (i + 1));
  }
  return null;
}
const keep = s => /^<\/?table>$/.test(s.trim()); // dòng chỉ có cấu trúc, không cần dịch

const page = (lang, name, body, translated, draft) => {
  const h1 = (body.match(/<h1>(.*?)<\/h1>/) || [, 'Lexkite'])[1].replace(/<[^>]+>/g, '');
  const alt = Object.keys(LANGS).map(l => `<link rel="alternate" hreflang="${l}" href="${SITE}/${l}/${name}">`).join('\n  ');
  const opts = Object.entries(LANGS).map(([l, n]) => `<option value="${l}"${l === lang ? ' selected' : ''}>${n}</option>`).join('');
  return `<!doctype html>
<html lang="${draft ? 'en' : lang}"${lang === 'ar' && !draft ? ' dir="rtl"' : ''}>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${h1} – Lexkite</title>${draft ? '\n  <meta name="robots" content="noindex">' : ''}
  <link rel="canonical" href="${SITE}/${lang}/${name}">
  ${alt}
  <link rel="alternate" hreflang="x-default" href="${SITE}/${name}">
  <meta name="theme-color" content="#0F3D3E">
  <link rel="icon" href="/icons/icon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="/css/style.css">
  <style>.doc{max-width:760px;margin:0 auto;padding:2.5rem 1.25rem 4rem}.doc h2{margin-top:2rem}.doc li{margin:.35rem 0}.doc table{width:100%;border-collapse:collapse;font-size:.92rem}.doc td,.doc th{border:1px solid var(--line);padding:.5rem .6rem;text-align:left;vertical-align:top}.lg{display:flex;justify-content:space-between;align-items:center;gap:1rem;margin-bottom:1.5rem}.lg select{font:inherit;padding:.35rem .5rem;border:1px solid var(--line);border-radius:8px;background:var(--bg);color:var(--text)}.tnote{background:var(--line);border-radius:10px;padding:.6rem .8rem;font-size:.85rem}</style>
</head>
<body>
  <main class="doc">
    <div class="lg"><a class="brand" href="/" style="padding:0"><img class="logo" src="/icons/icon.svg" alt=""><span class="wordmark">lex<b>kite</b></span></a>
      <select aria-label="Language" onchange="location.href='/'+this.value+'/${name}'">${opts}</select></div>
${translated ? `    <p class="tnote">${translated}</p>\n` : ''}${body.split('\n').filter(Boolean).map(l => '    ' + l).join('\n')}
  </main>
</body>
</html>
`;
};

const cachePath = l => new URL(`content/legal/cache/${l}.json`, R);
let missing = 0;
for (const lang of Object.keys(LANGS)) {
  const cache = fs.existsSync(cachePath(lang)) ? JSON.parse(fs.readFileSync(cachePath(lang), 'utf8')) : {};
  const used = {};
  const tr = async line => {
    if (keep(line)) return line;
    if (cache[line]) return (used[line] = cache[line]);
    if (TRANSLATE) { const t = await gtx(line, lang); await sleep(400); if (t) return (used[line] = cache[line] = t); }
    missing++; return line; // giữ tiếng Anh
  };
  fs.mkdirSync(new URL(`web/${lang}/`, R), { recursive: true });
  for (const name of PAGES) {
    let body, note = '', before = missing;
    if (lang === 'en' || lang === 'vi') body = rd(`content/legal/${lang}/${name}.html`);
    else {
      const lines = rd(`content/legal/en/${name}.html`).split('\n');
      const out = []; for (const l of lines) out.push(l.trim() ? await tr(l) : l);
      body = out.join('\n'); note = await tr(NOTE);
    }
    fs.writeFileSync(new URL(`web/${lang}/${name}.html`, R), page(lang, name, body, missing > before ? '' : note, missing > before)); // còn dòng chưa dịch → bản nháp tiếng Anh, chặn lập chỉ mục
  }
  if (!['en', 'vi'].includes(lang)) fs.writeFileSync(cachePath(lang), JSON.stringify(used, null, 1)); // chỉ giữ dòng còn dùng
}
// Trang gốc /privacy, /terms: bản tiếng Anh + chuyển sang ngôn ngữ ưa thích (lựa chọn trong app → trình duyệt)
for (const name of PAGES) {
  const pick = `<script>(function(){try{var S=${JSON.stringify(Object.keys(LANGS))},s=localStorage.getItem('vb.uiLang'),l=s&&S.indexOf(s)>=0?s:null;if(!l){var n=navigator.languages||[navigator.language];for(var i=0;i<n.length;i++){var b=String(n[i]||'').toLowerCase().split('-')[0];if(S.indexOf(b)>=0){l=b;break}}}if(l&&l!=='en')location.replace('/'+l+'/${name}')}catch(e){}})();</script>`;
  const html = page('en', name, rd(`content/legal/en/${name}.html`), '').replace(`<link rel="canonical" href="${SITE}/en/${name}">`, `<link rel="canonical" href="${SITE}/en/${name}">\n  ${pick}`);
  fs.writeFileSync(new URL(`web/${name}.html`, R), html);
}
console.log(`✓ build-legal: ${Object.keys(LANGS).length} ngôn ngữ × ${PAGES.length} trang${missing ? ` · ${missing} dòng chưa dịch (đang hiện tiếng Anh – chạy --translate)` : ''}`);
