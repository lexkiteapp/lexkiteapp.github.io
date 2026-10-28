// "Một clip – hai nơi dùng" (docs/VIDEO-SCALE-PLAN.md §10): thư viện dùng chung cho bản web của short bản tin.
//   scripts/video/web-rendition.mjs (CI: bản web, phụ đề, gắn thẻ, manifest) · scripts/build-video-pages.mjs (trang /video/<slug>/)
//   scripts/build-blog.mjs (khối video trong bài) · scripts/test/video-web.mjs (schema + xếp hạng).
// Thuần (không mạng, không ffmpeg) để test được.
import fs from 'node:fs';
import crypto from 'node:crypto';

// Ngôn ngữ của KHUNG trang /video/<slug>/ (nội dung dạy: chỉ tiếng Anh)
export const LANGS = ['vi', 'en', 'es', 'pt', 'fr', 'de', 'id', 'th', 'zh', 'ja', 'ko', 'hi', 'ar', 'ru', 'tr'];
export const MANIFEST = 'web/data/videos.json';
export const CAPTIONS_DIR = 'content/video/web/captions';
export const APPROVED = 'content/video/web/approved.json';
export const CDN = 'https://media.lexkite.com/video/';
export const MIN_SCORE = 90;
export const TEMPLATES = ['three', 'fix', 'ab', 'ways', 'pov'];
const SKILL = { three: 'speaking', fix: 'grammar', ab: 'grammar', ways: 'speaking', pov: 'listening' };

export const sha = (b, n = 10) => crypto.createHash('sha256').update(b).digest('hex').slice(0, n);
export const readJSON = (p, d = null) => { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return d; } };
export const slugify = s => String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

/** Điểm web (thang 100) từ số đo qa_news của shorts/index.json: ALL PASS bắt buộc; trừ điểm cho lỗi/khớp môi/tốc độ chữ. */
export function webScore(qa) {
  if (!qa || qa.status !== 'pass' || (qa.result && !/ALL PASS/i.test(qa.result))) return 0;
  return Math.max(0, 100 - 10 * (+qa.fail || 0) - (qa.lipsync_ms > 80 ? 5 : 0) - (qa.cps_max > 17 ? 5 : 0));
}
/** Clip bản tin (không phải diễn cảnh cũ). */
export const isNews = it => !!it && (it.scene === 'news' || it.scene === 'anchor' || /^news_/.test(it.lesson || ''));
export const templateOf = (lesson, id = '') => (lesson && lesson.template) || ((id.match(/^news_.+_([a-z]+)_[0-9a-f]{6}$/) || [])[1]) || 'three';

/** Chọn clip được vào web: bản tin + điểm ≥ 90 + (chủ duyệt | mẫu thử). Clip bị loại/tạm dừng không vào. */
export function eligible(items, approved = {}) {
  const ok = new Set(approved.approved || []), test = new Set(approved.test || []), out = new Map();
  for (const it of items || []) {
    if (!isNews(it) || it.rejected || it.paused || (it.lang && it.lang !== 'en')) continue;
    if (!ok.has(it.lesson) && !test.has(it.lesson)) continue;
    const score = webScore(it.qa); if (score < MIN_SCORE) continue;
    const prev = out.get(it.lesson); if (prev && (prev.created || '') >= (it.created || '')) continue;   // bản dựng mới nhất của bài
    out.set(it.lesson, { ...it, score, test: !ok.has(it.lesson) });
  }
  return [...out.values()];
}

// ---------- Phụ đề ----------
const ts = t => { t = Math.max(0, t); const h = Math.floor(t / 3600), m = Math.floor(t / 60) % 60, s = (t % 60).toFixed(3).padStart(6, '0'); return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${s}`; };
export const vtt = cues => 'WEBVTT\n\n' + cues.map((c, i) => `${i + 1}\n${ts(c.s)} --> ${ts(c.e)}\n${String(c.text).replace(/-->/g, '→').replace(/\n{2,}/g, '\n').trim()}`).join('\n\n') + '\n';

/** Câu (mỗi lời thoại 1 câu) có mốc thời gian từ timeline.json của news.py (shots[].lines[].words = [[s, e, w0]…]). */
export function sentences(timeline, text) {
  const out = [];
  for (const s of (timeline && timeline.shots) || []) for (const ln of s.lines || []) {
    const tx = text[ln.id]; if (!tx) continue;
    let a, b;
    if (Array.isArray(ln.words) && ln.words.length) { a = ln.words[0][0]; b = ln.words[ln.words.length - 1][1]; }
    else { a = (s.t0 || 0) + (ln.at || 0); b = a + Math.max(1, tx.split(/\s+/).length / 2.6); }
    out.push({ id: ln.id, s: +a.toFixed(3), e: +b.toFixed(3), text: tx, words: ln.words || null });
  }
  out.sort((x, y) => x.s - y.s);
  for (let i = 0; i < out.length; i++) { out[i].e = Math.max(out[i].e + 0.3, out[i].s + 0.8); if (out[i + 1]) out[i].e = Math.min(out[i].e, out[i + 1].s - 0.02); }
  return out;
}
/** Tiếng Anh: cắt câu thành cụm ≤ 42 ký tự theo mốc từng từ (dễ đọc trên khung dọc). */
export function enCues(sents, max = 42) {
  const cues = [];
  for (const x of sents) {
    const w = x.text.split(/\s+/);
    if (!x.words || x.words.length !== w.length || x.text.length <= max) { cues.push({ s: x.s, e: x.e, text: x.text }); continue; }
    let i0 = 0;
    while (i0 < w.length) {
      let i1 = i0 + 1; while (i1 < w.length && w.slice(i0, i1 + 1).join(' ').length <= max) i1++;
      cues.push({ s: x.words[i0][0], e: i1 < w.length ? x.words[i1][0] - 0.02 : x.e, text: w.slice(i0, i1).join(' ') }); i0 = i1;
    }
  }
  return cues;
}

// ---------- Gắn thẻ ----------
const STOP = new Set(('the a an and or but to of in on at for with is are was were be been it its this that these those you your i me my we our they them he she his her do does did not no yes so if then than just can could would will shall should may might must have has had get got some any very really also here there what which who how when where why please today save practice free lexkite teacher tip lesson say said people learners many often option right one'
  + ' like want need make take see ask help try find look note word thing something anything about there more most much good great well sure okay polite neutral casual today tonight morning time way back down out over into from'
  + ' first second third other another every each all both only even still again already would could should might').split(' ').filter(Boolean));
const GRAMMAR_RULES = [
  [/\b(said|says|say|told|tells|tell)\b/i, 'reported-speech'], [/\b(make|made|do|does|did)\s+(yoga|homework|dinner|coffee|a cake|the dishes)\b/i, 'verb-types'],
  [/\b(in|on|at)\s+(the\s+)?(morning|monday|taxi|bus|train|night)\b/i, 'prepositions'], [/\b(very|really)\s+(like|good|much)\b/i, 'adverbs-position'],
  [/\bhow much (does|do|is)\b/i, 'questions'], [/\b(am|is|are) agree\b|\bI agree\b/i, 'present-simple'], [/\b(could|can|would) (I|you)\b/i, 'modals-ability-permission'],
  [/\b(look(ing)? for|look at|try (it|this|that) on|give me a hand|help me out)\b/i, 'phrasal-verbs-grammar'], [/\bdiscuss (about )?the\b/i, 'verb-types'],
  [/\b(borrow|lend)\b/i, 'verb-types'], [/\bI'd (like|love)\b/i, 'preference-advice'],
];
/** Thẻ của 1 clip từ kịch bản bài (content/video/cine/news/<id>.json) + lời thoại + kho từ (dist/lexicon.json) + id trang ngữ pháp. */
export function tagLesson(lesson, text, lexicon = {}, grammarIds = []) {
  const cards = (lesson.beats || []).map(b => b.card).filter(Boolean);
  const core = [lesson.point || '', ...cards.flatMap(c => [c.text, c.sub || '']), ...((lesson.recap && lesson.recap.rows) || [])].join(' \n ');
  const low = ' ' + core.toLowerCase().replace(/[^a-z' \n-]/g, ' ').replace(/\s+/g, ' ') + ' ';
  const toks = new Set(low.split(' ').filter(w => w.length >= 3 && !STOP.has(w)));
  const lex = [], words = new Set();
  for (const [k, e] of Object.entries(lexicon)) {
    const w = String(e.w || k.split('#')[0]).toLowerCase().trim(); if (!w) continue;
    const hit = w.includes(' ') ? low.includes(' ' + w + ' ') : toks.has(w);
    if (hit) { lex.push([w.includes(' ') ? 0 : 1, k]); words.add(w); }
  }
  lex.sort((a, b) => a[0] - b[0]);
  const gram = [...new Set(GRAMMAR_RULES.filter(([re]) => re.test(core)).map(([, g]) => g))].filter(g => !grammarIds.length || grammarIds.includes(g));
  const tpl = templateOf(lesson, lesson.id);
  return {
    lex: lex.slice(0, 16).map(x => x[1]), words: [...words].slice(0, 16), grammar: gram.slice(0, 3),
    situation: String(lesson.bg || '').replace(/_/g, '-'), cefr: lesson.cefr || '', exam: ['ielts', 'toeic', 'toefl', 'cambridge'].includes(lesson.area) ? lesson.area : '',
    skill: SKILL[tpl] || 'speaking',
  };
}

// ---------- Câu đố nhanh (1 câu, từ điểm học của clip) ----------
const pickRot = (arr, seed) => { const n = arr.length, r = parseInt(sha(seed, 6), 16) % n; return arr.map((_, i) => arr[(i + r) % n]); };
const after = s => String(s || '').replace(/^.*?:\s*/, '').trim();
export function quizFor(lesson, text, pool = []) {
  const h = lesson.id.slice(-6), L = n => text[`n_${h}_${n}`] || '', cards = (lesson.beats || []).map(b => b.card).filter(Boolean), tpl = templateOf(lesson, lesson.id);
  const mk = (q, right, wrong) => { const opts = pickRot([right, ...wrong.filter(w => w && w !== right)].slice(0, 3), lesson.id); return { q, options: opts, answer: opts.indexOf(right) }; };
  const x = cards.find(c => c.kind === 'x'), v = cards.find(c => c.kind === 'v');
  if (x && v) return mk('Which sentence is correct?', v.text, [x.text]);
  if (tpl === 'ab' && /^Option A/i.test(L(1)) && /^Option B/i.test(L(2))) {
    const a = after(L(1)), b = after(L(2)), ans = /It's B\b/i.test(L(4)) ? b : a; return mk('Which sentence is right?', ans, [ans === a ? b : a]);
  }
  if (tpl === 'ways' && /^Polite/i.test(L(1))) return mk('Which one is the most polite?', after(L(1)), [after(L(2)), after(L(3))]);
  const kw = cards.map(c => ({ c, k: (String(c.sub || '').split('=')[0] || '').trim() })).filter(o => o.k && new RegExp(`\\b${o.k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(o.c.text));
  if (kw.length) {
    const o = kw[kw.length > 1 ? 1 : 0], others = kw.filter(z => z !== o).map(z => z.k).concat(['take', 'make', 'keep']);
    return mk(`Fill in the blank: "${o.c.text.replace(new RegExp(`\\b${o.k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i'), '___')}"`, o.k, others.slice(0, 2));
  }
  // chọn câu đáp đúng: lời 1 → lời 2 (nhiễu = câu đáp của bài khác)
  const ask = L(1), reply = L(2), dis = pool.filter(s => s && s !== reply).sort((a, b) => sha(lesson.id + a).localeCompare(sha(lesson.id + b))).slice(0, 2);
  return ask && reply && dis.length ? mk(`"${ask}" – pick the best reply.`, reply, dis) : null;
}

export function titleOf(lesson) {
  const s = (lesson.series && lesson.series[1]) || '', p = String(lesson.point || '').replace(/\s+/g, ' ').trim();
  const t = s && !p.toLowerCase().startsWith(s.toLowerCase()) ? `${s}: ${p}` : p || s || lesson.id;
  return t.charAt(0).toUpperCase() + t.slice(1);
}
export const slugOf = lesson => `${slugify(titleOf(lesson)).slice(0, 56).replace(/-+$/, '')}-${lesson.id.slice(-6)}`;

// ---------- Manifest ----------
const S = (v, n = 400) => typeof v === 'string' && v.length <= n;
/** Kiểm schema manifest web/data/videos.json → danh sách lỗi (rỗng = hợp lệ). */
export function validateManifest(m) {
  const err = [], seen = new Set();
  if (!m || m.version !== 1 || !Array.isArray(m.items)) return ['manifest: cần { version: 1, items: [] }'];
  for (const [i, it] of m.items.entries()) {
    const p = `items[${i}]${it && it.id ? ' ' + it.id : ''}`, bad = s => err.push(`${p}: ${s}`);
    if (!it || !/^[a-z0-9_]{6,80}$/.test(it.id || '')) { bad('id'); continue; }
    if (seen.has(it.id)) bad('id trùng'); seen.add(it.id);
    if (!/^[a-z0-9-]{3,80}$/.test(it.slug || '')) bad('slug');
    if (!S(it.title, 160) || !it.title) bad('title');
    if (!TEMPLATES.includes(it.template)) bad('template');
    if (!S(it.series, 80)) bad('series');
    const t = it.tags || {};
    if (!Array.isArray(t.lex) || !Array.isArray(t.words) || !Array.isArray(t.grammar)) bad('tags.lex/words/grammar');
    if (!/^(A1|A2|B1|B2|C1|C2|)$/.test(t.cefr || '')) bad('tags.cefr');
    if (!S(t.situation, 60) || !S(t.exam, 20) || !S(t.skill, 20)) bad('tags.situation/exam/skill');
    if (!(it.duration > 3 && it.duration < 120)) bad('duration');
    for (const k of ['src', 'poster']) if (!/^https:\/\/media\.lexkite\.com\/video\/[a-z0-9_]+\/[a-z0-9_.-]+$/.test(it[k] || '')) bad(k);
    if (!/^https:\/\/media\.lexkite\.com\/video\/[a-z0-9_]+\/en-[0-9a-f]{8}\.vtt$/.test(it.vtt_en || '')) bad('vtt_en');
    if ('vtt' in it) bad('vtt: chỉ phụ đề tiếng Anh (vtt_en), không phụ đề dịch');
    const q = it.quiz;
    if (q && (!S(q.q, 300) || !Array.isArray(q.options) || q.options.length < 2 || !(q.answer >= 0 && q.answer < q.options.length))) bad('quiz');
    if (!(it.score >= MIN_SCORE)) bad('score < 90');
    if (typeof it.test !== 'boolean') bad('test');
    if ('youtube_id' in it && !/^[A-Za-z0-9_-]{11}$/.test(it.youtube_id || '')) bad('youtube_id');
    if ('origin' in it && !['r2', 'release'].includes(it.origin)) bad('origin');
  }
  return err.concat(validateEmbeds(m.embeds));
}

/** Video nhúng bài học (docs/VIDEO-MOTION.md §Embedded): m.embeds[] = { id, title, words[], test, renditions: { sq45, wide } },
 *  mỗi bản = { w, h, src (mp4), poster (jpg), vtt_en, chapters } trên media.lexkite.com. Chưa được chủ duyệt → test: true. */
export function validateEmbeds(list) {
  const err = [], seen = new Set(), U = ext => new RegExp(`^https://media\\.lexkite\\.com/video/[a-z0-9_]+/[a-z0-9_.-]+\\.${ext}$`);
  if (list == null) return err;
  if (!Array.isArray(list)) return ['embeds: cần mảng'];
  for (const [i, it] of list.entries()) {
    const p = `embeds[${i}]${it && it.id ? ' ' + it.id : ''}`, bad = s => err.push(`${p}: ${s}`);
    if (!it || !/^[a-z0-9_]{6,80}$/.test(it.id || '')) { bad('id'); continue; }
    if (seen.has(it.id)) bad('id trùng'); seen.add(it.id);
    if (!S(it.title, 160) || !it.title) bad('title');
    if (!Array.isArray(it.words)) bad('words');
    if (typeof it.test !== 'boolean') bad('test');
    if (!(it.duration > 3 && it.duration < 600)) bad('duration');
    const R = it.renditions || {}, fm = Object.keys(R);
    if (!fm.length || fm.some(f => !['sq45', 'wide'].includes(f))) bad('renditions: chỉ sq45 / wide');
    for (const [f, [w, h]] of Object.entries({ sq45: [1080, 1350], wide: [1920, 1080] })) {
      const r = R[f]; if (!r) continue;
      if (r.w !== w || r.h !== h) bad(`${f}: cần ${w}×${h}`);
      if (!U('mp4').test(r.src || '')) bad(`${f}.src`);
      if (!U('jpg').test(r.poster || '')) bad(`${f}.poster`);
      if (!U('vtt').test(r.vtt_en || '')) bad(`${f}.vtt_en`);
      if ('chapters' in r && !U('vtt').test(r.chapters || '')) bad(`${f}.chapters`);
    }
  }
  return err;
}

// ---------- Khối video trong bài blog (tĩnh, không JS) ----------
export const LABEL = {
  vi: ['Video 20 giây', 'Xem video'], en: ['20-second video', 'Watch the video'], es: ['Vídeo de 20 segundos', 'Ver el vídeo'], pt: ['Vídeo de 20 segundos', 'Ver o vídeo'],
  fr: ['Vidéo de 20 secondes', 'Voir la vidéo'], de: ['20-Sekunden-Video', 'Video ansehen'], id: ['Video 20 detik', 'Tonton video'], th: ['วิดีโอ 20 วินาที', 'ดูวิดีโอ'],
  zh: ['20 秒视频', '观看视频'], ja: ['20秒動画', '動画を見る'], ko: ['20초 영상', '영상 보기'], hi: ['20 सेकंड का वीडियो', 'वीडियो देखें'],
  ar: ['فيديو 20 ثانية', 'شاهد الفيديو'], ru: ['Видео на 20 секунд', 'Смотреть видео'], tr: ['20 saniyelik video', 'Videoyu izle'],
};
export const videoHref = (lang, slug) => (lang === 'en' ? '' : '/' + lang) + `/video/${slug}/`;
/** Clip khớp bài blog nhất (thẻ/từ khoá trùng ≥ 2) – chỉ clip thật (không mẫu thử). */
export function blogMatch(post, items) {
  const hay = ' ' + [post.title, post.description, ...(post.tags || []), post.category, post.keyword].join(' ').toLowerCase() + ' ';
  let best = null, bs = 1;
  for (const it of items || []) {
    if (it.test) continue;
    const t = it.tags || {};
    const s = (t.words || []).filter(w => w.length > 3 && hay.includes(' ' + w)).length + (t.situation && hay.includes(t.situation.replace(/-/g, ' ')) ? 2 : 0) + (t.exam && hay.includes(t.exam) ? 1 : 0);
    if (s > bs) { bs = s; best = it; }
  }
  return best;
}
export function blogVideoBox(post, items, esc) {
  const it = blogMatch(post, items); if (!it) return '';
  const [lab, cta] = LABEL[post.lang] || LABEL.en;
  return `<aside class="vidbox" aria-label="${esc(lab)}"><a href="${videoHref(post.lang, it.slug)}"><img src="${esc(it.poster)}" alt="" width="180" height="320" loading="lazy" decoding="async"><span><small>🎬 ${esc(lab)}</small><b lang="en">${esc(it.title)}</b><span class="btn">${esc(cta)} ▶</span></span></a></aside>`;
}
export const BLOG_VIDEO_CSS = '.vidbox a{display:flex;gap:14px;align-items:center;border:1px solid var(--line);border-radius:14px;padding:10px;margin:24px 0;text-decoration:none;color:inherit;background:var(--surface)}.vidbox img{width:90px;height:160px;object-fit:cover;border-radius:10px;flex:none}.vidbox span{display:flex;flex-direction:column;gap:6px}.vidbox .btn{align-self:flex-start}';
