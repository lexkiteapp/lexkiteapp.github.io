/* 👩‍🏫 Nhân vật Lexkite – NGUỒN DUY NHẤT (chủ 28/10): đúng 2 giáo viên 2D, Ama (cô) + Carlos (thầy). Mọi ảnh/clip giáo viên trên mọi màn PHẢI lấy qua Chars.*
 * Dữ liệu đầy đủ (nguồn clip, khung, sha256): web/teach/characters.json · dựng: scripts/teach/build.py (CI) · cổng: scripts/test/characters-gate.mjs. */
(function (g) {
  const NAME = { ama: 'Ama', carlos: 'Carlos' }, POSES = ['talk', 'listen', 'explain', 'happy', 'encourage', 'thinking', 'laugh'];
  const PENDING = { carlos: ['explain', 'encourage'] }; // clip đang tạo → tạm dùng 'talk' cùng người (không bao giờ đổi kiểu/nhân vật)
  const id = w => (NAME[w] ? w : 'ama'), f = (w, x) => 'teach/' + id(w) + '/' + x;
  g.Chars = {
    ids: Object.keys(NAME), poses: POSES, name: w => NAME[id(w)], id,
    poster: w => f(w, 'poster.webp'), avatar: w => f(w, 'avatar.webp'),
    clip: (w, p) => f(w, (POSES.includes(p) && !(PENDING[id(w)] || []).includes(p) ? p : 'talk') + '.mp4'),
    img: (w, o = {}) => `<img class="${o.cls || 'chr'}" src="${f(w, (o.kind === 'poster' ? 'poster' : 'avatar') + '.webp')}" alt="${o.alt == null ? NAME[id(w)] : o.alt}" width="${o.size || 48}" height="${o.kind === 'poster' ? Math.round((o.size || 48) * 1.25) : o.size || 48}" decoding="async"${o.lazy ? ' loading="lazy"' : ''}>`,
  };
})(self);
