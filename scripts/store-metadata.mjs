// Chữ niêm yết Google Play + App Store: NGUỒN DUY NHẤT là store/metadata/<locale>.json (15 file, một file một ngôn ngữ).
// scripts/asc-upload.mjs đọc khối "apple" từ đây; store/play/LISTING.md (phần ngôn ngữ) sinh từ khối "play".
//   node scripts/store-metadata.mjs --check [--write-md]   kiểm giới hạn ký tự, từ cấm, từ khoá chính, URL; --write-md sinh lại LISTING.md
//   node scripts/store-metadata.mjs --table                in bảng từ khoá (để duyệt)
// Luật: Google Play Metadata policy (không xếp hạng/giá/emoji trong tên, không nhồi từ khoá, không tên app khác)
// và App Store Review Guideline 2.3 (2.3.7: không giá/thương hiệu người khác trong tên, phụ đề, từ khoá).
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const DIR = ROOT + 'store/metadata/';
const PLAY_MD = ROOT + 'store/play/LISTING.md';
// locale (= tên file = mã App Store) → mã Google Play, thư mục web
export const LOCALES = {
  'en-US': ['en-US', 'en'], vi: ['vi', 'vi'], 'es-ES': ['es-ES', 'es'], 'pt-BR': ['pt-BR', 'pt'], 'fr-FR': ['fr-FR', 'fr'],
  'de-DE': ['de-DE', 'de'], id: ['id', 'id'], th: ['th', 'th'], 'zh-Hans': ['zh-CN', 'zh'], ja: ['ja-JP', 'ja'],
  ko: ['ko-KR', 'ko'], hi: ['hi-IN', 'hi'], 'ar-SA': ['ar', 'ar'], ru: ['ru-RU', 'ru'], tr: ['tr-TR', 'tr'],
};
const LIMITS = {
  play: { title: 30, shortDescription: 80, fullDescription: 4000 },
  apple: { name: 30, subtitle: 30, keywords: 100, promotionalText: 170, description: 4000 },
};
// Xếp hạng / quảng cáo quá đà (mọi trường, mọi ngôn ngữ)
const RANKING = [
  /\bbest\b/i, /#1/, /\bnumber one\b/i, /\bofficial\b/i, /\btop[- ]rated\b/i, /\bguaranteed?\b/i, /\bno\.? ?1\b/i,
  /\bmejor(es)?\b/i, /\bmelhor(es)?\b/i, /\bmeilleur/i, /\bbeste[nrs]?\b/i, /\bterbaik\b/i, /tốt nhất/i, /số 1\b/i, /chính thức/i,
  /\boficial\b/i, /\bofficiel/i, /\boffiziell/i, /\bresmi\b/i, /официальн/i, /лучш/i, /\ben iyi\b/i, /\bnumaralı\b/i,
  /最好/, /最佳/, /第一/, /官方/, /公式/, /最強/, /No\.1/, /최고/, /공식/, /ดีที่สุด/, /ทางการ/, /सबसे अच्छ/, /आधिकारिक/, /أفضل/, /رسمي/,
];
// Tên app / hãng khác (Play: "no references to other apps"; Apple 2.3.7)
const COMPETITORS = /\b(anki|ankidroid|duolingo|quizlet|memrise|busuu|babbel|elsa|mochi|mochivocab|tflat|magoosh|lingoland|cake|rosetta stone|cambly|praktika|ewa)\b/i;
// Giá / khuyến mãi: cấm trong tên + mô tả ngắn (Play) và tên + phụ đề + từ khoá (Apple). Được phép trong mô tả dài / promo.
const PRICE = /(\bfree\b|\bfreemium\b|\bsale\b|\bdiscount|miễn phí|\bgratis\b|\bgrátis\b|\bgratuit|\bkostenlos|ฟรี|免费|免費|無料|무료|मुफ़्त|मुफ्त|مجان|бесплатн|ücretsiz|%)/i;
const EXAMS = /(\bielts\b|\btoeic\b|\btoefl\b|\byds\b|英検|雅思|托福|托业|托業|토익|토플|아이엘츠|آيلتس|ايلتس|توفل|تويك|айелтс|тоефл)/i;                         // thương hiệu: chỉ mô tả, không đưa vào tên/phụ đề/từ khoá Apple
const EMOJI = /\p{Extended_Pictographic}/u;
const chars = s => [...(s || '')].length;
const norm = s => (s || '').toLocaleLowerCase().normalize('NFC').replace(/[-–—:,.&/()（）：、・，]+/g, ' ').replace(/\s+/g, ' ').trim();
const NOSPACE = /^(zh|ja|th)/;                                     // ngôn ngữ không cách từ: so khớp chuỗi con
// Tiếng Ả Rập: "الكلمات الإنجليزية" vẫn là "كلمات إنجليزية" (bỏ mạo từ ال / لل / وال… đầu từ) để câu văn tự nhiên
const normL = (s, loc) => /^ar/.test(loc) ? norm(s).split(' ').map(w => w.replace(/^(?:[وبفك]?ال|لل)(?=..)/, '')).join(' ') : norm(s);
const count = (hay, needle, loc) => { let n = 0, i = 0; hay = ' ' + normL(hay, loc) + ' '; needle = normL(needle, loc); while ((i = hay.indexOf(needle, i)) >= 0) { n++; i += needle.length; } return n; };
const hasWords = (hay, kw, loc) => NOSPACE.test(loc) ? norm(hay).replace(/ /g, '').includes(norm(kw).replace(/ /g, ''))
  : normL(kw, loc).split(' ').every(w => normL(hay, loc).split(' ').includes(w));

export function load() {
  const out = {};
  for (const loc of Object.keys(LOCALES)) {
    const f = DIR + loc + '.json';
    if (fs.existsSync(f)) out[loc] = JSON.parse(fs.readFileSync(f, 'utf8'));
  }
  return out;
}

export function check(all = load()) {
  const errs = [];
  const files = fs.readdirSync(DIR).filter(f => f.endsWith('.json'));
  for (const f of files) if (!LOCALES[f.replace(/\.json$/, '')]) errs.push(`${f}: ngôn ngữ lạ`);
  for (const [loc, [playLoc, web]] of Object.entries(LOCALES)) {
    const d = all[loc], E = m => errs.push(`${loc}: ${m}`);
    if (!d) { E('thiếu file store/metadata/' + loc + '.json'); continue; }
    if (d.locale !== loc || d.playLocale !== playLoc || d.appleLocale !== loc || d.webLang !== web) E(`locale/playLocale/appleLocale/webLang phải là ${loc}/${playLoc}/${loc}/${web}`);
    const kw = d.keywords || {};
    if (!kw.primary || !Array.isArray(kw.secondary) || kw.secondary.length < 4 || kw.secondary.length > 7) E('keywords: cần 1 primary + 4–7 secondary');
    for (const store of ['play', 'apple']) for (const [k, max] of Object.entries(LIMITS[store])) {
      const v = (d[store] || {})[k];
      if (typeof v !== 'string' || !v.trim()) { E(`${store}.${k}: trống`); continue; }
      if (chars(v) > max) E(`${store}.${k}: ${chars(v)} > ${max} ký tự`);
      if (v !== v.trim() || /  +|\n{3,}/.test(v.replace(/\n/g, '\n'))) E(`${store}.${k}: khoảng trắng thừa`);
      for (const re of RANKING) if (re.test(v)) E(`${store}.${k}: từ xếp hạng/quảng cáo ${re}`);
      const c = COMPETITORS.exec(v); if (c) E(`${store}.${k}: tên app khác "${c[0]}"`);
    }
    const P = d.play || {}, A = d.apple || {};
    if (!P.title || !A.name || !A.description || !P.fullDescription) continue;
    // Tên / mô tả ngắn / phụ đề / từ khoá
    for (const [k, v] of [['play.title', P.title], ['play.shortDescription', P.shortDescription], ['apple.name', A.name], ['apple.subtitle', A.subtitle], ['apple.keywords', A.keywords]]) {
      const m = PRICE.exec(v); if (m) E(`${k}: giá/khuyến mãi "${m[0]}" (chỉ được nói trong mô tả dài)`);
      if (EMOJI.test(v)) E(`${k}: có emoji`);
      if (/[!！]{1}|\.\.\.|[®™]/.test(v)) E(`${k}: dấu !, … hoặc ®/™`);
    }
    for (const [k, v] of [['apple.name', A.name], ['apple.subtitle', A.subtitle], ['apple.keywords', A.keywords]]) { const m = EXAMS.exec(v); if (m) E(`${k}: thương hiệu "${m[0]}" (Apple 2.3.7)`); }
    if (/\b(iphone|ipad|ios|app store|apple)\b/i.test(P.title + P.shortDescription + P.fullDescription)) E('play: nhắc iPhone/iOS/App Store');
    if (/\b(android|google play)\b/i.test(Object.values(A).join(' '))) E('apple: nhắc Android/Google Play');
    if (!P.title.startsWith('Lexkite') || !A.name.startsWith('Lexkite')) E('tên phải bắt đầu bằng "Lexkite"');
    if (/[A-ZÀ-Ý]{4,}/.test(P.title.replace('Lexkite', '')) && /^[^a-z]*$/.test(P.title.replace('Lexkite', ''))) E('play.title: viết hoa toàn bộ');
    const kws = A.keywords.split(',');
    if (kws.some(k => !k || k !== k.trim())) E('apple.keywords: khoảng trắng quanh dấu phẩy hoặc mục rỗng');
    if (new Set(kws.map(norm)).size !== kws.length) E('apple.keywords: trùng mục');
    if (kws.some(k => /lexkite/i.test(k))) E('apple.keywords: không lặp tên app');
    if (!NOSPACE.test(loc)) {
      const inName = new Set(norm(A.name + ' ' + A.subtitle).split(' '));
      const dup = kws.filter(k => norm(k).split(' ').length === 1 && inName.has(norm(k)));
      if (dup.length) E(`apple.keywords: lặp từ đã có trong tên/phụ đề (${dup.join(', ')}) – Apple đã tự ghép, phí ký tự`);
    }
    // Từ khoá chính: có trong tên hoặc mô tả ngắn / tên + phụ đề; lặp 3–5 lần tự nhiên trong mô tả dài
    if (!hasWords(P.title + ' ' + P.shortDescription, kw.primary, loc)) E(`play: từ khoá chính "${kw.primary}" không có trong tên/mô tả ngắn`);
    if (!hasWords(A.name + ' ' + A.subtitle, kw.primary, loc)) E(`apple: từ khoá chính "${kw.primary}" không có trong tên/phụ đề`);
    for (const [k, v] of [['play.fullDescription', P.fullDescription], ['apple.description', A.description]]) {
      const n = count(v, kw.primary, loc);
      if (n < 3 || n > 5) E(`${k}: từ khoá chính "${kw.primary}" xuất hiện ${n} lần (cần 3–5, không nhồi)`);
      if (!/100\s?%|100％|%\s?100/.test(v)) E(`${k}: thiếu câu "miễn phí 100%"`);
      if (!/6[.,\s  ]?800/.test(v)) E(`${k}: thiếu con số 6,800+ đã kiểm`);
      if (!/British Council/.test(v) || !/\bETS\b/.test(v)) E(`${k}: thiếu câu không liên kết (British Council / ETS)`);
      if (!v.includes(`https://lexkite.com/${web}/privacy`)) E(`${k}: thiếu link chính sách https://lexkite.com/${web}/privacy`);
      if (!v.includes('support@lexkite.com')) E(`${k}: thiếu support@lexkite.com`);
      if (/[®™]/.test(v)) E(`${k}: có ® / ™`);
    }
    const urls = { privacyPolicyUrl: `https://lexkite.com/${web}/privacy`, supportUrl: `https://lexkite.com/app/?hl=${web}#/contact`, marketingUrl: web === 'vi' ? 'https://lexkite.com/' : `https://lexkite.com/${web}/` };
    for (const [k, u] of Object.entries(urls)) if (A[k] !== u) E(`apple.${k} phải là ${u}`);
  }
  return errs;
}

// ---------- store/play/LISTING.md: phần ngôn ngữ sinh từ store/metadata ----------
const BEGIN = '<!-- BEGIN GENERATED: node scripts/store-metadata.mjs --write-md -->', END = '<!-- END GENERATED -->';
function playBlock(all) {
  const out = [BEGIN, '', 'Source: `store/metadata/<locale>.json` (block `play`). Edit there, then run `node scripts/store-metadata.mjs --check --write-md`.', ''];
  for (const [loc, d] of Object.entries(all)) {
    const P = d.play;
    out.push(`## ${d.playLocale}`, '', `Keywords – primary: \`${d.keywords.primary}\` · secondary: ${d.keywords.secondary.map(k => '`' + k + '`').join(', ')}`, '',
      `**App name (${chars(P.title)}/30):**`, '```', P.title, '```',
      `**Short description (${chars(P.shortDescription)}/80):**`, '```', P.shortDescription, '```',
      `**Full description (${chars(P.fullDescription)}/4000):**`, '```', P.fullDescription, '```', '');
  }
  out.push(END);
  return out.join('\n');
}
function mdSync(all, write) {
  const s = fs.readFileSync(PLAY_MD, 'utf8'), i = s.indexOf(BEGIN), j = s.indexOf(END);
  if (i < 0 || j < 0) throw new Error(`${PLAY_MD}: thiếu khối ${BEGIN} … ${END}`);
  const next = s.slice(0, i) + playBlock(all) + s.slice(j + END.length);
  if (next === s) return true;
  if (write) { fs.writeFileSync(PLAY_MD, next); console.log('✎ đã sinh lại store/play/LISTING.md'); return true; }
  return false;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2), all = load();
  if (args.includes('--table')) {
    console.log('| Locale | Primary | Secondary | Play short |\n|---|---|---|---|');
    for (const [loc, d] of Object.entries(all)) console.log(`| ${loc} | ${d.keywords.primary} | ${d.keywords.secondary.join(', ')} | ${d.play.shortDescription} |`);
  } else {
    const errs = check(all);
    if (errs.length) { console.error('✗ store-metadata\n  ' + errs.join('\n  ')); process.exit(1); }
    if (!mdSync(all, args.includes('--write-md'))) { console.error('✗ store/play/LISTING.md lệch store/metadata – chạy: node scripts/store-metadata.mjs --check --write-md'); process.exit(1); }
    console.log(`✓ store-metadata: ${Object.keys(all).length} ngôn ngữ đúng giới hạn Play/App Store, LISTING.md khớp`);
  }
}
