// Video nhúng bài học từ kho Teach2D (docs/specs/media-one-source.md §2a) – phần thuần (test được, không mạng).
import { slugify, validateEmbeds, CDN } from './video-web.mjs';

const STOP = new Set('the and for are was you your this that with from have has not but all any can will they them their she her his him our out one two use say said very more most much many some what when who how why which where there here also into than then just like each must need more such'.split(' '));

/** Từ khoá khớp bước bài học (LessonVideo.embed so `words` của bước với `words` của video). */
export function wordsOf(ep) {
  const d = ep.data || {}, src = [d.word, d.right, d.memory, d.strike, d.us, d.uk, d.base, ...(d.quiz && d.quiz.options ? [d.quiz.options[d.quiz.answer]] : [])].filter(Boolean).join(' ');
  const out = [];
  for (const w of String(src).toLowerCase().normalize('NFKC').match(/[a-z][a-z'-]{2,}/g) || []) if (!STOP.has(w) && !out.includes(w)) out.push(w);
  return out.slice(0, 8);
}

export const idOf = ep => ('t2e_' + String(ep).replace(/^t2_/, '')).toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 80);
export const titleOf = ep => String((ep.hook && (ep.hook.text || ep.hook)) || (ep.lines && ep.lines[0] && ep.lines[0].text) || ep.id).replace(/[!?]+$/, '').slice(0, 120);

/** Mục `embeds[]` – `names.{mp4,poster,vtt}` = tên tệp (đã băm) trên Release wv-<id>. */
export function embedEntry(ep, qc, names, duration) {
  const id = idOf(ep.id), U = n => `${CDN}${id}/${n}`;
  return {
    id, title: titleOf(ep), template: ep.template, series: ep.series, source: 'teach2d ' + ep.id, words: wordsOf(ep), cefr: 'A2',
    duration: Math.round(duration * 10) / 10, test: false, score: Math.round(qc.score),
    renditions: { wide: { w: 1920, h: 1080, src: U(names.mp4), poster: U(names.poster), vtt_en: U(names.vtt) } },
  };
}

/** Gộp vào manifest (giữ mục cũ, thay mục cùng id), kiểm hợp lệ; trả { embeds, errors }. */
export function mergeEmbeds(old, add) {
  const by = new Map((old || []).map(e => [e.id, e]));
  for (const e of add) by.set(e.id, e);
  const embeds = [...by.values()].sort((a, b) => (a.test - b.test) || a.id.localeCompare(b.id));
  return { embeds, errors: validateEmbeds(embeds) };
}

/** Đo phủ: bước bài học (mảng words) nào có video khớp bằng từ khoá (không tính dự phòng list[0]). */
export function coverage(lessons, embeds) {
  const idx = new Set((embeds || []).filter(e => !e.test).flatMap(e => e.words || []));
  const hit = lessons.filter(l => (l.words || []).some(w => idx.has(String(w).toLowerCase())));
  return { lessons: lessons.length, covered: hit.length, pct: lessons.length ? Math.round((1000 * hit.length) / lessons.length) / 10 : 0 };
}
export { slugify };
