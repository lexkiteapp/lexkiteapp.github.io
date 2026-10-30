/* 👩‍🏫 Nhân vật Lexkite – NGUỒN DUY NHẤT (chủ 28/10): đúng 2 giáo viên 2D, Ama (cô) + Carlos (thầy). Mọi ảnh/clip giáo viên trên mọi màn PHẢI lấy qua Chars.*
 * Dữ liệu đầy đủ (nguồn clip, khung, sha256): web/teach/characters.json · dựng: scripts/teach/build.py (CI) · cổng: scripts/test/characters-gate.mjs. */
(function (g) {
  const NAME = { ama: 'Ama', carlos: 'Carlos' }, POSES = ['talk', 'listen', 'explain', 'happy', 'encourage', 'thinking', 'laugh', 'wave', 'cheer', 'concern', 'surprise', 'point', 'empathy'];
  const PENDING = {}; // clip đang tạo → tạm dùng 'talk' cùng người (không bao giờ đổi kiểu/nhân vật)
  const id = w => (NAME[w] ? w : 'ama'), f = (w, x) => 'teach/' + id(w) + '/' + x, ok = (w, p) => POSES.includes(p) && !(PENDING[id(w)] || []).includes(p) ? p : 'talk';
  g.Chars = {
    ids: Object.keys(NAME), poses: POSES, name: w => NAME[id(w)], id,
    poster: w => f(w, 'poster.webp'), avatar: w => f(w, 'avatar.webp'),
    still: (w, p) => f(w, 'still-' + ok(w, p) + '.webp'), // ảnh tĩnh từng tư thế (đã 2×, nền trong suốt)
    clip: (w, p, o = {}) => f(w, ok(w, p) + (o.hd && /^(talk|listen)$/.test(ok(w, p)) ? '-hd' : '') + '.mp4'), // hd: chỗ lớn sống (Call), 2× điểm ảnh
    // o.kind: 'avatar' (mặc định, vuông đầu-vai) | 'poster' (đầu→hông) | 'still' (+ o.pose) · luôn kèm bản 2× cho màn retina
    img: (w, o = {}) => {
      const k = o.kind || (o.pose ? 'still' : 'avatar'), sz = o.size || 48, sq = k === 'avatar', src = k === 'still' ? f(w, 'still-' + ok(w, o.pose) + '.webp') : f(w, k + '.webp');
      return `<img class="${o.cls || 'chr'}" src="${src}"${k === 'still' ? '' : ` srcset="${src} 1x, ${f(w, k + '-2x.webp')} 2x"`} alt="${o.alt == null ? NAME[id(w)] : o.alt}" width="${sz}" height="${sq ? sz : Math.round(sz * 0.87)}" decoding="async"${o.lazy ? ' loading="lazy"' : ''}>`;
    },
  };
})(self);
