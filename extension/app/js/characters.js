/* 👩‍🏫 Nhân vật Lexkite – NGUỒN DUY NHẤT (chủ 28/10): đúng 2 giáo viên 2D, Ama (cô) + Carlos (thầy). Mọi ảnh/clip giáo viên trên mọi màn PHẢI lấy qua Chars.*
 * Dữ liệu đầy đủ (nguồn clip, khung, sha256): web/teach/characters.json · dựng: scripts/teach/build.py (CI) · cổng: scripts/test/characters-gate.mjs. */
(function (g) {
  const NAME = { ama: 'Ama', carlos: 'Carlos' }, POSES = ['talk', 'listen', 'explain', 'happy', 'encourage', 'thinking', 'laugh', 'wave', 'cheer', 'concern', 'surprise', 'point', 'empathy'];
  const PENDING = {}; // clip đang tạo → tạm dùng 'talk' cùng người (không bao giờ đổi kiểu/nhân vật)
  const VOICE = { ama: 'af_heart', carlos: 'am_michael' }; // = characters.json people.<who>.voice.app (cổng characters-gate kiểm khớp) – giáo viên hiện trên màn nói bằng ĐÚNG giọng này
  const STILL = {ama:[48,47,50,48,48,48,12,48,48,55,42,55,74],carlos:[48,34,48,48,48,48,81,48,23,38,48,48,38]}; // still_frame (24 fps, thứ tự POSES): clip bắt đầu tại đây
  // Dải tay + đỉnh đầu (% khung): scripts/teach/hands.py
  const HAND = { ama: { explain: [56, 68], encourage: [48, 65, 88, 94], cheer: [48, 61], point: [49, 60, 76, 83], empathy: [48, 66] }, carlos: { explain: [52, 87], point: [52, 87], cheer: [53, 82], concern: [74, 92], empathy: [74, 92] } }, HEAD = { ama: 8, carlos: 19 };
  // Sự kiện → tư thế, một bảng cho mọi màn; recall = listen vì clip thinking cau mày
  const EVENT = { correct: 'cheer', wrong: 'concern', replyOk: 'happy', replyFix: 'encourage', think: 'thinking', recall: 'listen', retry: 'encourage' };
  const id = w => (NAME[w] ? w : 'ama'), f = (w, x) => 'teach/' + id(w) + '/' + x, ok = (w, p) => POSES.includes(p) && !(PENDING[id(w)] || []).includes(p) ? p : 'talk';
  g.Chars = Object.assign(g.Chars || {}, { // nạp lại (gói lười 'pas' có characters.js) KHÔNG xóa phần mở rộng đã gắn (Chars.slot – teacher-slot.js)
    ids: Object.keys(NAME), poses: POSES, name: w => NAME[id(w)], id,
    voice: w => VOICE[id(w)],
    // v = phần khung nhìn thấy từ đỉnh → nâng bao nhiêu để không cắt tay
    lift: (w, p, v) => { const b = HAND[id(w)][p] || []; let l = 0, y = v * 100; for (let i = 0; i < b.length; i += 2) if (y > b[i] && y < b[i + 1]) { l = b[i + 1] + 1 - v * 100; y += l; } return l <= HEAD[id(w)] - 1 ? l / 100 : 0; },
    stillAt: (w, p) => ((STILL[id(w)] || [])[POSES.indexOf(p)] || 0) / 24,
    forEvent: (e, acc) => (e === 'done' ? (acc >= 80 ? 'cheer' : 'encourage') : EVENT[e] || 'talk'),
    poster: w => f(w, 'poster.webp'), avatar: w => f(w, 'avatar.webp'),
    head: (w, x2) => f(w, 'head-bare' + (x2 ? '-2x' : '') + '.webp'), // "đầu trơn" (khung poster, đã xóa mắt/mày/miệng/ria) – nền cho mặt VẼ khớp miệng (web/js/call/face.js)
    still: (w, p) => f(w, 'still-' + ok(w, p) + '.webp'), // ảnh tĩnh từng tư thế (đã 2×, nền trong suốt)
    // vòng nghỉ 1–3 s mắt mở (Home/lộ trình): webm = VP9 alpha (Chrome/Firefox/Android), mp4 = H.264 xếp chồng alpha (Safari, ghép WebGL như clip), poster = khung đầu
    idle: w => ({ webm: f(w, 'idle.webm'), mp4: f(w, 'idle.mp4'), poster: f(w, 'idle-poster.webp') }),
    clip: (w, p, o = {}) => f(w, ok(w, p) + (o.hd && /^(talk|listen|point|cheer|encourage)$/.test(ok(w, p)) ? '-hd' : '') + '.mp4'), // hd: 2× điểm ảnh – Call + chỗ giáo viên l/xl màn retina (danh sách = characters.json "hd")
    // o.kind: 'avatar' (mặc định, vuông đầu-vai) | 'poster' (đầu→hông) | 'still' (+ o.pose) · luôn kèm bản 2× cho màn retina
    img: (w, o = {}) => {
      const k = o.kind || (o.pose ? 'still' : 'avatar'), sz = o.size || 48, sq = k === 'avatar', src = k === 'still' ? f(w, 'still-' + ok(w, o.pose) + '.webp') : f(w, k + '.webp');
      return `<img class="${o.cls || 'chr'}" src="${src}"${k === 'still' ? '' : ` srcset="${src} 1x, ${f(w, k + '-2x.webp')} 2x"`} alt="${o.alt == null ? NAME[id(w)] : o.alt}" width="${sz}" height="${sq ? sz : Math.round(sz * 0.87)}" decoding="async"${o.lazy ? ' loading="lazy"' : ''}>`;
    },
  });
})(self);
