/* Role metadata (pure, no I/O; tests: scripts/test/dist-roles.mjs). One approved clip → an EMBED upload pack + SOCIAL posts per platform.
 *   embedMeta(clip)            → unlisted lesson host: stable minimal metadata (same input = same text, no hashtags/hooks) + "lk:<clip>" marker for sync.
 *   socialMeta(clip, platform) → public, viral-optimised: hook-first title ≤ 60 with the keyword first, description whose first 2 lines are hook + value
 *                                then the lesson deep link, 3–5 hashtags, tags, A/B title variants and an SEO score (seoScore).
 * clip: {id, title, point, keyword?, topic, sub, skill, cefr, exam, hook, slug?, url?}. Used by distribution.js (op meta / social_due) and scripts/video/yt-pack.mjs. */
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
  const t = ['#learnenglish', '#englishtips'];
  if (c.exam) t.push('#' + String(c.exam).toLowerCase()); else if (c.sub && String(c.sub).includes('/')) t.push(tagify(String(c.sub).split('/')[1] + ' english'));
  else if (c.topic) t.push(tagify(c.topic + ' english'));
  if (c.cefr) t.push('#' + String(c.cefr).toLowerCase() + 'english');
  t.push(platform === 'youtube' ? '#shorts' : platform === 'tiktok' ? '#englishteacher' : '#speakenglish');
  return [...new Set(t.filter(x => x.length > 2))].slice(0, 5);
}
/** SEO score /100 with the checks that failed (shown in the admin, gate ≥ 80 before a post is offered). */
export function seoScore(m, keyword) {
  const k = String(keyword || '').toLowerCase(), all = String(m.description || '').split('\n'), t = String(m.title || '');
  const lines = all[0] && all[0].includes(SITE) && !all[0].toLowerCase().includes(k.split(' ')[0] || '#') ? all.slice(1) : all; // YouTube: dòng link đứng đầu → hook/giá trị là 2 dòng sau
  const checks = {
    title_len: t.length > 0 && t.length <= 60,
    keyword_first: !!k && t.toLowerCase().startsWith(k.slice(0, 30)),
    hook_value: lines.length >= 3 && !!lines[0] && !!lines[1] && lines[0].toLowerCase().includes(k.split(' ')[0] || '#'),
    link_early: all.slice(0, 3).some(l => l.includes(SITE)) || (BIO_ONLY.includes(m.platform) && all.slice(0, 3).includes(BIO_CTA)),
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
  const hook = /\?$/.test(variants[0]) ? variants[0] : `${k}? ${variants[0].slice(k.length + 2)}`;
  const value = c.value ? clean(c.value, 200) : `Learn ${keywordOf(c)} in 20 seconds – natural American English${c.cefr ? ` (${String(c.cefr).toUpperCase()})` : ''}.`;
  const own = (Array.isArray(c.hashtags) ? c.hashtags : []).map(h => '#' + String(h).replace(/^#/, '').toLowerCase()).filter(h => /^#[a-z0-9]+$/.test(h)), hashtags = own.length >= 3 ? [...new Set(own)].slice(0, 5) : hashtagsOf(c, platform);
  const tags = [...new Set([keywordOf(c).toLowerCase(), 'learn english', 'english lesson', c.topic, c.skill && c.skill + ' english', c.cefr && String(c.cefr).toLowerCase() + ' english', c.exam && c.exam + ' english', 'american english'].filter(Boolean))].slice(0, 12);
  // Đuôi cố định (hashtag + marker) KHÔNG bao giờ bị cắt: lỗi cũ cắt cả mô tả tới P.caption nên mô tả dài làm rơi hashtag/marker im lặng → cắt phần thân trước.
  const tail = [hashtags.join(' '), ...(P.marker ? ['', markerLine(c.id)] : [])].join('\n'), room = Math.max(0, P.caption - tail.length - 1);
  // Link theo luật nền tảng (docs/DISTRIBUTION.md §6c): YouTube → dòng ĐẦU mô tả (bấm được, hiện trên "…more"); IG/TikTok → link trong caption KHÔNG bấm được
  // → CTA "link in bio" (link bio = /api/go/<nền tảng>/bio); FB/Threads giữ dòng link (autopilot đổi sang "in the first comment" khi gắn bình luận đầu – _first_comment.js fcCaption).
  const link = `Full lesson + quiz: ${lessonUrl(c, platform)}`, lines = platform === 'youtube' ? [link, hook, value] : BIO_ONLY.includes(platform) ? [hook, value, BIO_CTA] : [hook, value, link];
  const head = [...lines, '', 'Save this and send it to a friend who needs it.'].join('\n'), body = [head.length > room ? head.slice(0, Math.max(0, room - 1)).replace(/\s+\S*$/, '') + '…' : head, tail];
  const m = { role: 'social', platform, privacy: 'public', no_keyword: k.toLowerCase() === String(c.id || '').toLowerCase(), title: variants[0], variants, description: body.join('\n').slice(0, P.caption), hashtags, tags, made_for_kids: false, synthetic: true };
  m.seo = seoScore(m, k); return m;
}
/** Everything one approved clip can produce: the embed pack + one social post per platform asked for. */
export const packsFor = (c, platforms = ['youtube']) => ({ embed: embedMeta(c), social: Object.fromEntries(platforms.filter(p => PLATFORMS[p]).map(p => [p, socialMeta(c, p)])) });
