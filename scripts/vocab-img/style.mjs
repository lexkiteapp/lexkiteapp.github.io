// Phong cách ảnh minh hoạ từ vựng (MỘT nguồn – đổi phong cách = tăng STYLE.v, ảnh cũ giữ sv cũ tới khi vẽ lại).
// Brand: docs/BRAND-RULES.md (teal #0F3D3E, cam #E5502F, vàng cam #FFB054, vàng #FFC94A, kem #FFF7EA).
// Chính sách seed: FLUX-1-schnell trên Workers AI KHÔNG nhận tham số seed (API trả 5006 "/seed not allowed", thử 23/10/2026) →
//   tái lập = lưu ảnh theo mã băm nội dung (không vẽ lại khi đã có); lần thử 2 dùng biến thể bố cục RETRY cố định (tất định theo lần thử),
//   người trong ảnh xoay vòng TẤT ĐỊNH theo fnv(từ#loại) (đa dạng màu da/giới, không ngẫu nhiên giữa các lần chạy).
export const STYLE = {
  v: 's1',
  steps: 4,                      // 4 bước = mặc định schnell; 1024² × 4 bước = 172,8 neuron (đo 23/10: 4 ô 512² × (4,8 + 4 × 9,6))
  base: 'Flat vector illustration for a children\'s vocabulary flashcard. One single clear subject, centered, fully visible, simple geometric shapes, ' +
    'soft rounded edges, thick clean outlines, limited palette of deep teal, warm orange, golden yellow, soft pink and cream, plain solid light cream background, ' +
    'no background clutter, no frame. Absolutely no text, no letters, no numbers, no words, no labels, no logo, no watermark, no signs with writing. ' +
    'Friendly, culturally neutral, safe for kids, no flags, no religious symbols.',
  retry: 'Simplest possible iconic view, the subject large and isolated on the plain cream background, nothing else in the picture.',
};
const PEOPLE = ['a woman with dark brown skin', 'a man with light skin', 'a man with medium brown skin', 'a woman with East Asian features',
  'a man with South Asian features', 'a woman with light skin and red hair', 'a man with dark skin', 'a woman with olive skin'];
export const fnv = s => { let h = 0x811c9dc5; for (const c of Buffer.from(String(s))) { h ^= c; h = Math.imul(h, 0x01000193) >>> 0; } return h; };
const short = d => String(d || '').replace(/\s+/g, ' ').trim().slice(0, 160);
/** prompt cho 1 nghĩa: e = {w, pos, def}; lexname WordNet (select.py) giúp chọn khung câu; attempt 1|2 */
export function promptFor(key, e, lexname = '', attempt = 1) {
  const who = PEOPLE[fnv(key) % PEOPLE.length], w = e.w.trim(), d = short(e.def);
  let subj;
  if (e.pos === 'v') subj = `${who} doing the action "${w}" (meaning: ${d}). Show the action clearly with the whole body.`;
  else if (e.pos === 'adj') subj = `a simple everyday scene that clearly shows the quality "${w}" (meaning: ${d}).`;
  else if (lexname === 'person') subj = `${who} as "${w}" (meaning: ${d}), recognizable by clothing and tools, full body.`;
  else subj = `"${w}" (meaning: ${d}).`;
  return `Illustration of ${subj}${attempt > 1 ? ' ' + STYLE.retry : ''} ${STYLE.base}`;   // chủ thể đứng đầu: FLUX ưu tiên phần đầu prompt
}
/** alt (khoá dịch được): từ tiếng Anh – giao diện ghép nghĩa theo ngôn ngữ UI lúc vẽ (web/js/vocab-img.js) */
export const altFor = e => e.w.trim();
