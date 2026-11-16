/* 👩‍🏫 Nhân vật Lexkite – NGUỒN DUY NHẤT (chủ 28/10): đúng 2 giáo viên 2D, Ama (cô) + Carlos (thầy). Mọi ảnh/clip giáo viên trên mọi màn PHẢI lấy qua Chars.*
 * Dữ liệu đầy đủ (nguồn clip, khung, sha256): web/teach/characters.json · dựng: scripts/teach/build.py (CI) · cổng: scripts/test/characters-gate.mjs. */
(function (g) {
  const NAME = { ama: 'Ama', carlos: 'Carlos' }, POSES = ['talk', 'listen', 'explain', 'happy', 'encourage', 'thinking', 'laugh', 'wave', 'cheer', 'concern', 'surprise', 'point', 'empathy'];
  const PENDING = {}; // clip đang tạo → tạm dùng 'talk' cùng người (không bao giờ đổi kiểu/nhân vật)
  const STILLS = { ama: ['thumbs_up', 'clap', 'hold_card', 'count'], carlos: ['thumbs_up', 'hold_card', 'clap', 'count'] }; // tư thế CHỈ có ảnh (gesture bank ảnh chuẩn 05/11, scripts/teach/still_img.py) = characters.json people.<who>.stills
  const VOICE = { ama: 'af_heart', carlos: 'am_michael' }; // = characters.json people.<who>.voice.app (cổng characters-gate kiểm khớp) – giáo viên hiện trên màn nói bằng ĐÚNG giọng này
  const id = w => (NAME[w] ? w : 'ama'), f = (w, x) => 'teach/' + id(w) + '/' + x, ok = (w, p) => POSES.includes(p) && !(PENDING[id(w)] || []).includes(p) ? p : 'talk';
  g.Chars = Object.assign(g.Chars || {}, { // nạp lại (gói lười 'pas' có characters.js) KHÔNG xóa phần mở rộng đã gắn (Chars.slot – teacher-slot.js)
    ids: Object.keys(NAME), poses: POSES, name: w => NAME[id(w)], id,
    // tư thế → biểu cảm mặt vẽ (face.js EMO): LessonTeacher + TeacherMood
    POSE_EMO: { cheer: 'cheer', concern: 'concern', happy: 'happy', laugh: 'happy', encourage: 'encourage', empathy: 'concern', thinking: 'thinking', surprise: 'cheer', explain: 'explain', wave: 'happy', point: 'explain' },
    voice: w => VOICE[id(w)],
    poster: w => f(w, 'poster.webp'), avatar: w => f(w, 'avatar.webp'),
    head: (w, x2) => f(w, 'head-bare' + (x2 ? '-2x' : '') + '.webp'), // "đầu trơn" (khung poster, đã xóa mắt/mày/miệng/ria) – nền cho mặt VẼ khớp miệng (web/js/call/face.js)
    stills: w => STILLS[id(w)].slice(),
    has: (w, p) => (POSES.includes(p) && !(PENDING[id(w)] || []).includes(p)) || STILLS[id(w)].includes(p), // người này có ảnh tư thế p (rig chọn tư thế thay khi chưa có)
    still: (w, p) => f(w, 'still-' + (STILLS[id(w)].includes(p) ? p : ok(w, p)) + '.webp'), // ảnh tĩnh từng tư thế (đã 2×, nền trong suốt)
    // vòng nghỉ 1–3 s mắt mở (Home/lộ trình): webm = VP9 alpha (Chrome/Firefox/Android), mp4 = H.264 xếp chồng alpha (Safari, ghép WebGL như clip), poster = khung đầu
    idle: w => ({ webm: f(w, 'idle.webm'), mp4: f(w, 'idle.mp4'), poster: f(w, 'idle-poster.webp') }),
    clip: (w, p, o = {}) => f(w, ok(w, p) + (o.hd && /^(talk|listen)$/.test(ok(w, p)) ? '-hd' : '') + '.mp4'), // hd: chỗ lớn sống (Call), 2× điểm ảnh
    // o.kind: 'avatar' (mặc định, vuông đầu-vai) | 'poster' (đầu→hông) | 'still' (+ o.pose) · luôn kèm bản 2× cho màn retina
    img: (w, o = {}) => {
      const k = o.kind || (o.pose ? 'still' : 'avatar'), sz = o.size || 48, sq = k === 'avatar', src = k === 'still' ? f(w, 'still-' + ok(w, o.pose) + '.webp') : f(w, k + '.webp');
      return `<img class="${o.cls || 'chr'}" src="${src}"${k === 'still' ? '' : ` srcset="${src} 1x, ${f(w, k + '-2x.webp')} 2x"`} alt="${o.alt == null ? NAME[id(w)] : o.alt}" width="${sz}" height="${sq ? sz : Math.round(sz * 0.87)}" decoding="async"${o.lazy ? ' loading="lazy"' : ''}>`;
    },
  });
})(self);
