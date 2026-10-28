/* 👩‍🏫 Nhân vật Lexkite – NGUỒN DUY NHẤT (chủ 28/10): đúng 2 giáo viên 2D, Ama (cô) + Carlos (thầy). Mọi ảnh/clip giáo viên trên mọi màn PHẢI lấy qua Chars.*
 * Dữ liệu đầy đủ (nguồn clip, khung, sha256): web/teach/characters.json · dựng: scripts/teach/build.py (CI) · cổng: scripts/test/characters-gate.mjs. */
(function (g) {
  const NAME = { ama: 'Ama', carlos: 'Carlos' }, POSES = ['talk', 'listen', 'explain', 'happy', 'encourage', 'thinking', 'laugh'];
  const PENDING = { carlos: ['explain', 'encourage'] }; // clip đang tạo → tạm dùng 'talk' cùng người (không bao giờ đổi kiểu/nhân vật)
  const id = w => (NAME[w] ? w : 'ama'), f = (w, x) => 'teach/' + id(w) + '/' + x;
  // Nền tối: tách giáo viên khỏi nền như app chuyên nghiệp, KHÔNG khung/ô – quầng sáng mềm sau lưng (::before), viền sáng 1 px theo dáng, bóng tiếp đất, +sáng nhẹ
  try { const st = g.document.createElement('style'); st.textContent = '[data-theme="dark"] :is(.ux1-tch,.ret-teach,.tch-rig){filter:drop-shadow(0 0 .6px rgb(235 245 247/.85)) drop-shadow(0 0 1.4px rgb(235 245 247/.45)) drop-shadow(0 0 14px rgb(160 205 212/.30)) drop-shadow(0 4px 5px rgb(0 0 0/.5)) brightness(1.07) saturate(1.08)}[data-theme="dark"] .tch{isolation:isolate}[data-theme="dark"] .tch::before{content:"";position:absolute;inset:-10% -24% 0;background:radial-gradient(closest-side,color-mix(in srgb,var(--surface) 84%,#fff),transparent);pointer-events:none;z-index:-1}'; g.document.head.appendChild(st); } catch (e) { /* không DOM (kiểm thử) */ }
  g.Chars = {
    ids: Object.keys(NAME), poses: POSES, name: w => NAME[id(w)], id,
    poster: w => f(w, 'poster.webp'), avatar: w => f(w, 'avatar.webp'),
    clip: (w, p) => f(w, (POSES.includes(p) && !(PENDING[id(w)] || []).includes(p) ? p : 'talk') + '.mp4'),
    img: (w, o = {}) => `<img class="${o.cls || 'chr'}" src="${f(w, (o.kind === 'poster' ? 'poster' : 'avatar') + '.webp')}" alt="${o.alt == null ? NAME[id(w)] : o.alt}" width="${o.size || 48}" height="${o.kind === 'poster' ? Math.round((o.size || 48) * 1.25) : o.size || 48}" decoding="async"${o.lazy ? ' loading="lazy"' : ''}>`,
  };
})(self);
