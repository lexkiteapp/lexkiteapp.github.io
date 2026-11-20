/* Role metadata (pure, no I/O; tests: scripts/test/dist-roles.mjs). One approved clip → an EMBED upload pack + SOCIAL posts per platform.
 *   embedMeta(clip)            → unlisted lesson host: stable minimal metadata (same input = same text, no hashtags/hooks) + "lk:<clip>" marker for sync.
 *   socialMeta(clip, platform) → public, viral-optimised: hook-first title ≤ 60 with the keyword first, description whose first 2 lines are hook + value
 *                                then the lesson deep link, 3–5 hashtags, tags, A/B title variants and an SEO score (seoScore).
 * clip: {id, title, point, keyword?, topic, sub, skill, cefr, exam, hook, slug?, url?}. Used by distribution.js (op meta / social_due) and scripts/video/yt-pack.mjs. */
import { installLines } from './_install_links.js'; // link cài: infra/install-links.json (luật: docs/VIDEO.md)
import { clipLang } from './_first_comment.js';
export const SITE = 'https://lexkite.com';
export const PLATFORMS = {
  youtube: { title: 100, caption: 5000, marker: true },
  tiktok: { title: 0, caption: 2200 },
  instagram: { title: 0, caption: 2200 },
  facebook_page: { title: 0, caption: 5000 },
  threads: { title: 0, caption: 500 },
};
const clean = (s, n) => String(s == null ? '' : s).replace(/[<>]/g, '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').replace(/\s+/g, ' ').trim().slice(0, n);
const cap = s => (s ? s[0].toUpperCase() + s.slice(1) : s);
/** Cut at a word boundary to ≤ n chars (no dangling punctuation). */
export function fit(s, n) { s = clean(s, 400); if (s.length <= n) return s; const c = s.slice(0, n + 1).replace(/\s+\S*$/, '').replace(/[\s,:;–-]+$/, ''); return c || s.slice(0, n); }
/** Search keyword = what the lesson teaches ("look for"), not the hook. */
export const keywordOf = c => clean(c.keyword || c.point || String(c.title || '').split(/[:|–—?!.]/)[0] || c.id, 60).replace(/^["“']|["”']$/g, '');
export const lessonUrl = (c, platform) => { const full = /^https:\/\/lexkite\.com\//.test(String(c.url || '')) ? c.url : c.slug ? `${SITE}/video/${encodeURIComponent(c.slug)}/` : `${SITE}/app/`, i = full.indexOf('#'), base = i < 0 ? full : full.slice(0, i), frag = i < 0 ? '' : full.slice(i); /* clip chưa có trang: /video/<id>/ là 404 → về app */ return platform ? `${base}${base.includes('?') ? '&' : '?'}utm_source=${platform}&utm_medium=social&utm_campaign=${encodeURIComponent(c.id)}&utm_term=${clipLang(c.id, c.lang)}${frag}` : base; };
export const markerLine = id => 'lk:' + id;
export const BIO_ONLY = ['instagram', 'tiktok'];
export const BIO_CTA = 'Free full lesson + quiz: link in bio 👆';
// Biến thể (TikTok/IG coi caption cùng khuôn là spam): chọn ổn định theo id clip → cùng clip luôn cùng chữ, các clip khác nhau thì khác nhau. Luôn chứa "link in bio" (không bấm được → không dán link).
export const BIO_CTAS = [BIO_CTA, 'Full lesson + free quiz on Lexkite: link in bio 👆', 'Want the whole lesson? It is all in the link in bio 👆 (free quiz inside)', 'Practice it with a free quiz: link in bio 👆'];
export const CLOSERS = ['Save this and send it to a friend who needs it.', 'Save this for later and share it with your study buddy.', 'Which one did you get wrong before? Tell me in the comments 👇', 'Write your own example sentence in the comments 👇', 'Send this to someone who still says it wrong.'];
const hashN = c => [...String(c && c.id != null ? c.id : c)].reduce((n, x) => (n * 31 + x.charCodeAt(0)) >>> 0, 7);
export const pick = (arr, c, salt = 0) => arr[(hashN(c) + salt) % arr.length];

export function embedMeta(c) {
  const k = cap(keywordOf(c)), title = fit(`${k} – English lesson | Lexkite`, 100);
  const description = [`Short English lesson: ${k}.`, `Practice it on Lexkite: ${lessonUrl(c)}`, '', markerLine(c.id)].join('\n');
  return { role: 'embed', platform: 'youtube', privacy: 'unlisted', title, description, tags: ['english lesson', keywordOf(c).toLowerCase()].filter(Boolean), hashtags: [], made_for_kids: false, synthetic: true, category: '27' };
}

const HOOKS = { // keyword-first patterns: {k} = keyword
  question: k => `${k}: are you saying it right?`,
  mistake: k => `${k}: stop making this mistake`,
  number: k => `${k}: 3 ways natives say it`,
  challenge: k => `${k}: can you answer this?`,
  surprise: k => `${k}: what textbooks don't teach`,
  pov: k => `${k}: say it like an American`,
};
const ORDER = ['question', 'mistake', 'challenge', 'number', 'surprise', 'pov'];
const tagify = s => '#' + String(s || '').replace(/[^A-Za-z0-9]+(.)?/g, (m, ch) => (ch ? ch.toUpperCase() : '')).replace(/^./, x => x.toLowerCase());
export function hashtagsOf(c, platform) {
  const t = [pick(['#learnenglish', '#englishlearning', '#learnenglishwithme'], c), pick(['#englishtips', '#englishlesson', '#englishwithme'], c, 1)];
  const niche = String(c.skill || '') + ' ' + String(c.topic || '') + ' ' + String(c.sub || '') + ' ' + String(c.exam || '');
  const nichetag = /ielts|toefl|toeic/i.test(niche) ? '#ieltsspeaking' : /pronunc/i.test(niche) ? '#englishpronunciation' : /gramm/i.test(niche) ? '#englishgrammar' : /vocab|word|phrase|idiom/i.test(niche) ? '#englishvocabulary' : /speak|convers|dialog/i.test(niche) ? '#speakingpractice' : '#englishvocabulary'; // tag ngách theo chủ đề (không chung chung)
  if (c.exam) t.push('#' + String(c.exam).toLowerCase()); else if (c.sub && String(c.sub).includes('/')) t.push(tagify(String(c.sub).split('/')[1] + ' english'));
  else if (c.topic) t.push(tagify(c.topic + ' english'));
  if (c.cefr) t.push('#' + String(c.cefr).toLowerCase() + 'english');
  const last = platform === 'youtube' ? '#shorts' : platform === 'tiktok' ? pick(['#englishteacher', '#esl', '#englishclass'], c, 2) : '#speakenglish', all = [...new Set([...t.slice(0, 2), nichetag, ...t.slice(2), last].filter(x => x.length > 2))];
  return all.slice(0, 4).concat(all.length > 4 ? [all[all.length - 1]] : []).filter((x, i, a) => a.indexOf(x) === i).slice(0, 5);
}
/** SEO score /100 with the checks that failed (shown in the admin, gate ≥ 80 before a post is offered). */
export function seoScore(m, keyword) {
  const k = String(keyword || '').toLowerCase(), all = String(m.description || '').split('\n'), t = String(m.title || '');
  const lines = all[0] && all[0].includes(SITE) && !all[0].toLowerCase().includes(k.split(' ')[0] || '#') ? all.slice(1) : all; // YouTube: dòng link đứng đầu → hook/giá trị là 2 dòng sau
  const checks = {
    title_len: t.length > 0 && t.length <= 60,
    keyword_first: !!k && t.toLowerCase().startsWith(k.slice(0, 30)),
    hook_value: lines.length >= 3 && !!lines[0] && !!lines[1] && lines[0].toLowerCase().includes(k.split(' ')[0] || '#'),
    link_early: all.slice(0, 3).some(l => l.includes(SITE)) || (BIO_ONLY.includes(m.platform) && all.slice(0, 3).some(l => BIO_CTAS.includes(l))),
    hashtags: m.hashtags.length >= 3 && m.hashtags.length <= 5,
    tags: m.tags.length >= 5,
    variants: new Set(m.variants || []).size >= 2,
  };
  const W = { title_len: 20, keyword_first: 20, hook_value: 15, link_early: 15, hashtags: 10, tags: 10, variants: 10 };
  return { score: Object.keys(W).reduce((n, x) => n + (checks[x] ? W[x] : 0), 0), failed: Object.keys(checks).filter(x => !checks[x]) };
}
export function socialMeta(c, platform = 'youtube') {
  const P = PLATFORMS[platform] || PLATFORMS.tiktok, k = cap(keywordOf(c)), first = HOOKS[c.hook] ? c.hook : c.hook == null && c.headline ? ORDER[[...String(c.id)].reduce((n, x) => n + x.charCodeAt(0), 0) % ORDER.length] : 'question'; // clip chưa có hook: xoay theo id để kênh không lặp một câu
  const variants = [...new Set([...(c.headline ? [fit(c.headline, 60)] : []), ...[first, ...ORDER.filter(x => x !== first)].slice(0, 3).map(h => fit(HOOKS[h](k), 60))])].slice(0, 3);
  // Tiêu đề không kết thúc bằng "?": ghép "Từ khóa? + phần còn lại". Chỉ bỏ tiền tố "<từ khóa>:" khi đúng là tiền tố (lỗi cũ cắt cứng k.length+2 ký tự → cắt giữa chữ: "Discuss? ng \"discuss about\"").
  const v0 = variants[0], pre = new RegExp('^' + k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*[:?–—-]*\\s*', 'i'), rest = v0.replace(pre, ''), hook = /\?$/.test(v0) ? v0 : `${k}? ${rest}`;
  const value = c.value ? clean(c.value, 200) : `Learn ${keywordOf(c)} in 20 seconds – natural American English${c.cefr ? ` (${String(c.cefr).toUpperCase()})` : ''}.`;
  const own = (Array.isArray(c.hashtags) ? c.hashtags : []).map(h => '#' + String(h).replace(/^#/, '').toLowerCase()).filter(h => /^#[a-z0-9]+$/.test(h)), hashtags = own.length >= 3 ? [...new Set(own)].slice(0, 5) : hashtagsOf(c, platform);
  const tags = [...new Set([keywordOf(c).toLowerCase(), 'learn english', 'english lesson', c.topic, c.skill && c.skill + ' english', c.cefr && String(c.cefr).toLowerCase() + ' english', c.exam && c.exam + ' english', 'american english'].filter(Boolean))].slice(0, 12);
  // Đuôi cố định (hashtag + marker) KHÔNG bao giờ bị cắt: lỗi cũ cắt cả mô tả tới P.caption nên mô tả dài làm rơi hashtag/marker im lặng → cắt phần thân trước.
  const tail = [hashtags.join(' '), ...(P.marker ? ['', markerLine(c.id)] : [])].join('\n'), room = Math.max(0, P.caption - tail.length - 1);
  // Link theo luật nền tảng (docs/DISTRIBUTION.md §6c): YouTube → dòng ĐẦU mô tả (bấm được, hiện trên "…more"); IG/TikTok → link trong caption KHÔNG bấm được
  // → CTA "link in bio" (link bio = /api/go/<nền tảng>/bio); FB/Threads giữ dòng link (autopilot đổi sang "in the first comment" khi gắn bình luận đầu – _first_comment.js fcCaption).
  const link = `Full lesson + quiz: ${lessonUrl(c, platform)}`, lines = platform === 'youtube' ? [link, hook, value] : BIO_ONLY.includes(platform) ? [hook, value, pick(BIO_CTAS, c, 3)] : [hook, value, link];
  // Link cài theo nền tảng (infra/install-links.json): YouTube/Facebook liệt kê từng cửa hàng (bấm được); Threads một link /get có nguồn đo; IG/TikTok caption không bấm được → giữ "link in bio" (/api/go/<nền tảng>/bio chuyển tới /get)
  if (!BIO_ONLY.includes(platform)) lines.push(...installLines(platform, c.id));
  const head = [...lines, '', pick(CLOSERS, c, 5)].join('\n'), body = [head.length > room ? head.slice(0, Math.max(0, room - 1)).replace(/\s+\S*$/, '') + '…' : head, tail];
  const m = { role: 'social', platform, privacy: 'public', no_keyword: k.toLowerCase() === String(c.id || '').toLowerCase(), title: variants[0], variants, description: body.join('\n').slice(0, P.caption), hashtags, tags, made_for_kids: false, synthetic: true };
  m.seo = seoScore(m, k); return m;
}
/** Everything one approved clip can produce: the embed pack + one social post per platform asked for. */
export const packsFor = (c, platforms = ['youtube']) => ({ embed: embedMeta(c), social: Object.fromEntries(platforms.filter(p => PLATFORMS[p]).map(p => [p, socialMeta(c, p)])) });
