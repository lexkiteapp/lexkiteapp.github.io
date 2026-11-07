/* 🎭 TeacherRig – rig 2D Ama/Carlos kiểu Rive (input số + state machine + blend) tự viết, $0 (vì sao không .riv, lớp mặt/thân/tư thế: docs/specs/teacher-rive-rig.md).
 * API: TeacherRig.mount(el, who, o) → { speak(audio, visemes, o), setEmotion(name), gesture(name), listen(on), pause(on), destroy(), stats }
 * Lõi thuần (Node + trình duyệt): TeacherRig.core – cổng CI chạy đúng lõi này. Tải lười: chỉ màn có giáo viên nạp tệp này (shell không đổi). */
(function (g) {
  const node = typeof module !== 'undefined' && module.exports;
  const req = n => (node ? require('./call/' + n + '.js') : null);
  const LS = () => g.LipSync || req('lipsync'), LF = () => g.LipFace || req('face'), LM = () => g.LipMouth || req('mouths');
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x)), sm = x => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };

  // ===== Định nghĩa rig (một nguồn): giới hạn khớp + tốc độ tối đa mỗi khung 60 fps (chống giật/nhảy) =====
  const LIMITS = { tilt: 6, nod: 8, shake: 4, sway: 3, breath: 0.006, perFrame: { tilt: 0.5, nod: 0.9, sway: 0.5, brow: 0.06, knit: 0.06, smile: 0.05, look: 0.12, fade: 1 / (0.18 * 60) + 1e-6 } };
  const FADE = 0.18; // s – mờ chéo mặt vẽ ↔ ảnh tư thế (chuyển động "fade" theo luật Motion)
  // Biểu cảm = vector input (cùng nghĩa EMO của LipFace, thêm surprise/sad/praise). thinking: mày nhíu nhẹ (#583: knit .5 trông như giận)
  const EMOTIONS = {
    neutral: {}, happy: { brow: .25, tilt: 1.5, smile: .25 }, praise: { brow: .45, tilt: 2, smile: .4 }, encourage: { brow: .3, tilt: 1.8, smile: .2 },
    thinking: { brow: .2, knit: .3, tilt: -2.5, look: [-.4, -.5] }, surprise: { brow: .8, smile: .05, o: .45 }, listen: { brow: .15, tilt: 1.2, smile: .08, nodHz: .55, nodPx: 2 },
    sad: { brow: -.1, knit: .55, tilt: -1.5, smile: -.22, look: [0, .25] }, explain: { brow: .12, tilt: -1 },
  };
  // Cử chỉ: 'proc' = thủ tục trên khớp cổ (cứng) · 'pose' = ảnh tư thế đã duyệt. pending = chưa có ảnh riêng → dùng tư thế gần nhất đã duyệt · alt = thay cho người chưa có ảnh
  const GESTURES = {
    nod: { kind: 'proc', dur: 0.9 }, shake: { kind: 'proc', dur: 1.1 }, blink: { kind: 'proc', dur: 0.16 }, bob: { kind: 'proc', dur: 0.6 },
    wave: { kind: 'pose', pose: 'wave', hold: 1.4, emo: 'happy' }, point: { kind: 'pose', pose: 'point', hold: 1.4, emo: 'explain' },
    explain: { kind: 'pose', pose: 'explain', hold: 1.6, emo: 'explain' }, cheer: { kind: 'pose', pose: 'cheer', hold: 1.2, emo: 'praise' },
    think: { kind: 'pose', pose: 'thinking', hold: 1.6, emo: 'thinking' }, surprised: { kind: 'pose', pose: 'surprise', hold: 1.0, emo: 'surprise' },
    laugh: { kind: 'pose', pose: 'laugh', hold: 1.2, emo: 'praise' }, empathy: { kind: 'pose', pose: 'empathy', hold: 1.4, emo: 'sad' },
    // ảnh chuẩn riêng (gesture bank 05/11): alt = tư thế đã duyệt cho người CHƯA có ảnh này (Chars.has)
    thumbs_up: { kind: 'pose', pose: 'thumbs_up', alt: 'encourage', hold: 1.2, emo: 'encourage' }, clap: { kind: 'pose', pose: 'clap', alt: 'cheer', hold: 1.2, emo: 'praise' },
    count: { kind: 'pose', pose: 'explain', hold: 1.6, emo: 'explain', pending: 1 }, hold_card: { kind: 'pose', pose: 'hold_card', alt: 'explain', hold: 2, emo: 'explain' },
  };
  const KEYS = ['brow', 'knit', 'smile', 'o', 'lx', 'ly', 'tilt'];
  const vec = name => { const e = EMOTIONS[name] || {}; return { brow: e.brow || 0, knit: e.knit || 0, smile: e.smile || 0, o: e.o || 0, lx: (e.look || [0, 0])[0], ly: (e.look || [0, 0])[1], tilt: e.tilt || 0, nodHz: e.nodHz || 0, nodPx: e.nodPx || 0 }; };
  const toward = (cur, want, step) => cur + clamp(want - cur, -step, step);

  /** Tư thế thật của cử chỉ G cho người có ảnh theo has(pose) (Chars.has) – không có ảnh riêng → alt. Không truyền has → pose (lõi thuần). */
  const poseOf = (G, has) => (G.alt && has && !has(G.pose) ? G.alt : G.pose);
  /** Lõi state machine (thuần): machine(who, { calm, seed, has }) → { speak, quiet, setEmotion, gesture, step(now) → khung }. now = giây đồng hồ trang. */
  function machine(who, o = {}) {
    const calm = !!o.calm, seed = o.seed || 7, R = LF().RIG[who];
    let emoName = 'neutral', emo = vec('neutral'), want = vec('neutral'), S = null, idle = LF().machine(who, { dur: 120, seed, calm });
    const proc = [], queue = []; let pose = null, poseW = 0, poseWant = 0, poseUntil = 0, last = null, prevNow = null, openK = 0, held = 0;
    const out = { tilt: 0, nod: 0, sway: 0, brow: 0, knit: 0, smile: 0, lx: 0, ly: 0 }, emoV = Object.fromEntries(KEYS.map(k => [k, 0]));
    const api = {
      who, LIMITS,
      /** speak({ clock, playing, cues | live, dur, text }) – clock() = giây của đồng hồ âm thanh; cues: [{value,start}] (mốc CI/Kokoro/Rhubarb) */
      speak(src) {
        const dur = src.dur || 1, M = LF().machine(who, { cues: src.cues || (src.live && src.live.cues) || [], env: src.env, dur: Math.max(30, dur), seed: seed + (src.text || '').length, text: src.text, calm });
        S = Object.assign({ M }, src); if (poseWant) { poseWant = 0; poseUntil = 0; } // nói → mặt vẽ hiện lại để miệng khớp (ảnh tư thế mờ ra 180 ms)
      },
      quiet() { S = null; if (queue.length) api.gesture(queue.shift()); },
      speaking: () => !!S,
      setEmotion(name) { if (!EMOTIONS[name]) return false; emoName = name; want = vec(name); return true; },
      emotion: () => emoName,
      gesture(name, at) {
        const G = GESTURES[name]; if (!G) return false;
        if (G.kind === 'proc') { if (calm && name !== 'blink') return true; proc.push({ name, t0: at == null ? (prevNow || 0) : at, dur: G.dur }); return true; }
        if (S) { if (queue.length < 2) queue.push(name); return true; } // đang nói: tư thế che miệng → xếp hàng tới hết câu
        pose = poseOf(G, o.has); poseWant = 1; held = G.hold; poseUntil = 0; if (G.emo) api.setEmotion(G.emo); return true;
      },
      pose: () => (poseW > 0 ? pose : null),
      step(now) {
        const dt = prevNow == null ? 1 / 60 : clamp(now - prevNow, 0, 0.1), k = dt * 60; prevNow = now;
        // trộn biểu cảm: tiến dần về đích, giới hạn tốc độ mỗi khung (không bao giờ nhảy khi đổi máy nói/nghỉ)
        // trộn biểu cảm = lò xo tắt dần tới hạn (ω 9 rad/s, ~0,5 s): vận tốc bắt đầu từ 0 → không có khung "giật" đầu tiên như phép mũ
        const dts = Math.min(dt, 1 / 30); // khung bị chặn lâu (tải ảnh, GC) không làm vọt bước
        for (const key of KEYS) { const w = 9, a = w * w * (want[key] - emo[key]) - 2 * w * emoV[key]; emoV[key] += a * dts; emo[key] += emoV[key] * dts; }
        emo.nodHz = want.nodHz; emo.nodPx = want.nodPx;
        // lớp miệng/mắt: máy nói (đồng hồ âm thanh) hoặc máy nghỉ
        let s, talking = false;
        if (S) { const t = S.clock(); talking = S.playing(); if (S.live) { S.live.tick(t, talking, Math.min(dt, 0.1)); s = S.M.at(Math.max(0, t - LS().LEAD)); } else s = S.M.at(t); }
        else s = idle.at(now % 120);
        openK = talking ? Math.min(1, openK + dt / 0.04) : Math.max(0, openK - dt / 0.08); // không phát → miệng về X trong 80 ms
        if (openK < 1) { s.mouth = LM().mix('X', s.mouth, openK); if (openK < 0.5) s.shape = 'X'; s.open *= openK; }
        if (!talking && emo.o > 0.01) s.mouth = LM().mix(s.mouth, 'E', clamp(emo.o, 0, 1) * (1 - openK)); // ngạc nhiên: môi tròn "o" khi im
        const op = s.open > 0;
        s.mouth.s = clamp((s.mouth.s || 0) + emo.smile * (op ? .5 : 1), -.3, .9);
        // tư thế: mờ vào → giữ → mờ ra (mặt vẽ nghịch đảo)
        if (poseWant && poseW >= 1 && !poseUntil) poseUntil = now + held;
        if (poseUntil && now >= poseUntil) { poseWant = 0; poseUntil = 0; }
        poseW = clamp(poseW + Math.sign(poseWant - poseW) * Math.min(Math.abs(poseWant - poseW), Math.min(dt, 1 / 30) / FADE), 0, 1); // khung chặn lâu không nhảy nửa mờ chéo
        if (!poseW && !poseWant && !S && queue.length) api.gesture(queue.shift());
        // khớp cổ: nghiêng (biểu cảm + máy) + gật/lắc thủ tục, mọi thứ kẹp trong giới hạn, giới hạn tốc độ
        let pt = 0, pn = 0, ps = 0, blink = 0;
        for (let i = proc.length - 1; i >= 0; i--) {
          const p = proc[i], u = (now - p.t0) / p.dur; if (u >= 1) { proc.splice(i, 1); continue; } if (u < 0) continue;
          const env = Math.sin(Math.PI * u); // 0 → 1 → 0: vào/ra liền mạch
          if (p.name === 'nod') pn += 6 * env * Math.max(0, Math.sin(u * Math.PI * 4));
          if (p.name === 'bob') pn += 3 * env;
          if (p.name === 'shake') { ps += 3.2 * env * Math.sin(u * Math.PI * 6); pt += 0.6 * env * Math.sin(u * Math.PI * 6); }
          if (p.name === 'blink') blink = Math.max(blink, env);
        }
        const tilt = calm ? 0 : clamp((s.tilt || 0) + emo.tilt * 0.6 + pt, -LIMITS.tilt, LIMITS.tilt);
        const nodE = emo.nodHz && !calm ? emo.nodPx * Math.max(0, Math.sin(now * Math.PI * 2 * emo.nodHz)) : 0;
        const nod = calm ? 0 : clamp((s.nod || 0) + pn + nodE, -LIMITS.nod, LIMITS.nod);
        const sway = calm ? 0 : clamp(ps, -LIMITS.sway, LIMITS.sway);
        const L = LIMITS.perFrame;
        out.tilt = toward(out.tilt, tilt, L.tilt * k); out.nod = toward(out.nod, nod, L.nod * k); out.sway = toward(out.sway, sway, L.sway * k);
        out.brow = toward(out.brow, clamp((s.brow || 0) + emo.brow, -.3, 1), L.brow * k); out.knit = toward(out.knit, clamp((s.knit || 0) + emo.knit, 0, 1), L.knit * k);
        out.lx = toward(out.lx, clamp(s.look.x + emo.lx, -1, 1), L.look * k); out.ly = toward(out.ly, clamp(s.look.y + emo.ly, -1, 1), L.look * k);
        s.tilt = out.tilt; s.nod = out.nod; s.brow = out.brow; s.knit = out.knit; s.look = { x: out.lx, y: out.ly }; s.blink = Math.max(s.blink || 0, blink);
        const breath = calm ? 0 : LIMITS.breath * Math.sin(now * Math.PI * 2 * 0.22);
        last = { s, shape: s.shape, talking, tilt: out.tilt, nod: out.nod, sway: out.sway, breath, pose, poseW, faceW: 1 - poseW, emo: emoName, pivot: R.pivot };
        return last;
      },
      last: () => last,
    };
    return api;
  }

  /** Ma trận 2D [a,b,c,d,e,f] của khung (khớp cổ + thở) – CỨNG: xoay + tịnh tiến + co giãn đều. Cổng kiểm: không trượt (shear), độ dài chi đổi ≤ thở. */
  function matrix(f) {
    const [px, py] = f.pivot, r = -f.tilt * Math.PI / 180, c = Math.cos(r), s = Math.sin(r), k = 1 + f.breath;
    // thở: co giãn đều quanh đáy giữa (554, 960) · khớp cổ: xoay quanh pivot, gật = tịnh tiến xuống, lắc = tịnh tiến ngang nhỏ
    const B = [k, 0, 0, k, 554 * (1 - k), 960 * (1 - k)];
    const N = [c, s, -s, c, px - c * px + s * py + f.sway, py - s * px - c * py + f.nod];
    return [B[0] * N[0] + B[2] * N[1], B[1] * N[0] + B[3] * N[1], B[0] * N[2] + B[2] * N[3], B[1] * N[2] + B[3] * N[3], B[0] * N[4] + B[2] * N[5] + B[4], B[1] * N[4] + B[3] * N[5] + B[5]];
  }

  /** visemes → cues: mốc nén LK_CUES ([ms, chuỗi, env]) · [{value,start}] · [[hình, ms]] */
  function cuesOf(v) {
    if (!v) return null;
    if (Array.isArray(v) && typeof v[0] === 'number') { const u = LS().unpack(v); return { cues: u.cues, env: u.env, dur: u.dur }; }
    if (Array.isArray(v) && Array.isArray(v[0])) return { cues: v.map(([value, ms]) => ({ value, start: ms / 1000 })) };
    if (Array.isArray(v)) return { cues: v };
    return null;
  }

  const core = { LIMITS, FADE, EMOTIONS, GESTURES, machine, matrix, cuesOf, poseOf };
  if (node) { module.exports = core; return; }

  // ===== Lớp DOM: MỘT <canvas> (đầu trơn + lớp vector + ảnh tư thế), chỉ vẽ khi khung đổi, 0 thay đổi DOM mỗi khung =====
  const D = g.document;
  let loadP = null;
  const load = () => loadP || (loadP = (g.LipFace && g.LipPaint ? Promise.resolve() : Promise.all(['lipsync', 'mouths', 'face', 'paint'].map(f => new Promise((ok, no) => {
    const s = D.createElement('script'); s.async = false; s.src = (g.LK_JS_BASE || 'js/') + 'call/' + f + '.js'; s.onload = ok; s.onerror = no; D.head.appendChild(s);
  })))).catch(e => { loadP = null; throw e; }));
  const reduced = () => { try { return g.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
  const playing = a => !!(a && !a.paused && !a.ended && a.readyState >= 2);
  const imgs = {};
  const img = src => imgs[src] || (imgs[src] = new Promise(ok => { const i = new Image(); i.decoding = 'async'; i.onload = () => (i.decode ? i.decode().catch(() => {}) : Promise.resolve()).then(() => ok(i)); i.onerror = () => ok(null); i.src = src; }));

  function mount(el, who, o = {}) {
    who = g.Chars ? g.Chars.id(who) : who;
    const stats = { frames: 0, long: 0, draws: 0, low: 0, ready: false, shape: 'X', pose: null, emo: 'neutral', calm: reduced() };
    let M = null, cv = null, ctx = null, head = null, raf = 0, dead = false, paused = false, lastK = '', prev = 0, dpr = Math.min(2, g.devicePixelRatio || 1), ro = null;
    const poses = {}, scaled = {}, pend = {}; // poses[name]: 1 đang tải · Image · 2 lỗi · scaled[name]: bản thu sẵn về cỡ canvas (vẽ 1:1, không lấy mẫu lại ảnh 1108 px mỗi khung)
    let headC = null, faceC = null, lastT = '', lastP = [], boxes = null;
    el.classList.add('trig'); // CSS mặc định :where() = độ ưu tiên 0: host tự đặt vị trí (vd. .tb-rig absolute trong chỗ giáo viên) luôn thắng – .trig{relative} chèn sau từng đè absolute → rig tụt 0,1 khung sau khi tải
    if (!D.getElementById('trig-css')) D.head.insertAdjacentHTML('beforeend', '<style id="trig-css">:where(.trig){position:relative}:where(.trig>canvas){display:block;width:100%;height:auto;aspect-ratio:1108/960;pointer-events:none}</style>');
    const shrink = im => { const c = D.createElement('canvas'); c.width = cv.width; c.height = cv.height; const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(im, 0, 0, c.width, c.height); return c; };
    const fit = () => { const w = el.clientWidth || 240, W = Math.round(Math.min(1108, w * dpr)); if (cv.width !== W) { cv.width = W; cv.height = Math.round(W * 960 / 1108); headC = shrink(head); for (const k in scaled) scaled[k] = shrink(poses[k]); lastK = lastT = ''; } };
    // thu nhỏ KHÔNG chặn luồng chính (createImageBitmap resize, ngoài luồng vẽ) – bản canvas đồng bộ chỉ là dự phòng
    const shrinkAsync = im => (g.createImageBitmap ? g.createImageBitmap(im, { resizeWidth: cv.width, resizeHeight: cv.height, resizeQuality: 'high' }).catch(() => shrink(im)) : Promise.resolve(shrink(im)));
    const loadPose = name => {
      if (typeof poses[name] === 'object' || poses[name] === 2) return Promise.resolve(poses[name]);
      if (poses[name] === 1 && pend[name]) return pend[name];
      poses[name] = 1;
      return (pend[name] = img(g.Chars.still(who, name)).then(i => (i && cv ? shrinkAsync(i).then(b => { scaled[name] = b; return i; }) : i)).then(i => { poses[name] = i || 2; lastK = lastT = ''; return i; }));
    };
    // vùng vẽ lại khi CHỈ mặt đổi (khung xương đứng yên): mắt+mày · miệng+ria (tọa độ poster 1108×960, có lề cho chớp/nhướng/há)
    const regions = R => {
      const ex = R.eyes.flatMap(e => [e.c[0] - e.rx - 24, e.c[0] + e.rx + 24]), by = R.brows.flatMap(b => [b.i[1], b.p[1], b.o[1]]);
      return [[Math.min(...ex), Math.min(...by) - 48, Math.max(...ex), Math.max(...R.eyes.map(e => e.c[1] + e.ry + 16))], [R.mouth[0] - 100, R.mouth[1] - 60, R.mouth[0] + 100, R.mouth[1] + 80]];
    };
    const prof = stats.prof = { n: 0, js: 0, paint: 0, full: 0, part: 0, skip: 0 };
    const paint = (T, f, P, pi) => {
      ctx.setTransform(T[0], T[1], T[2], T[3], T[4], T[5]);
      if (f.faceW > 0) {
        // mặt = ảnh đầu + mắt/mày/miệng vector. Đang mờ chéo: vẽ cả mặt vào LỚP riêng rồi mờ cả lớp (LipPaint tự đặt alpha từng nét → vẽ thẳng thì nét vẫn đậm rồi biến mất 1 khung)
        const fade = pi && f.faceW < 1, X = fade ? (faceC || (faceC = D.createElement('canvas'))) : null, c = fade ? X.getContext('2d') : ctx, sc = cv.width / 1108;
        if (fade) { if (X.width !== cv.width || X.height !== cv.height) { X.width = cv.width; X.height = cv.height; } c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, X.width, X.height); }
        c.setTransform(T[0] / sc, T[1] / sc, T[2] / sc, T[3] / sc, T[4], T[5]); c.drawImage(headC, 0, 0); c.setTransform(T[0], T[1], T[2], T[3], T[4], T[5]);
        for (const p of P) if (p) g.LipPaint.draw(c, p);
        if (fade) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = f.faceW; ctx.drawImage(X, 0, 0); ctx.setTransform(T[0], T[1], T[2], T[3], T[4], T[5]); }
      }
      // mờ chéo CỘNG (lighter = cộng premultiplied): kết quả = (1-w)·mặt + w·tư thế, alpha giữ nguyên chỗ cả hai cùng đục.
      // source-over thì alpha = 1 - w(1-w) → người trong suốt 25 % giữa lúc chuyển (thấy nền xuyên qua) và khung đầu đổi mạnh nhất (cổng "wave liền mạch")
      if (pi && f.poseW > 0) { const sc = cv.width / 1108; if (f.faceW > 0) ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = f.poseW; ctx.setTransform(T[0] / sc, T[1] / sc, T[2] / sc, T[3] / sc, T[4], T[5]); ctx.drawImage(scaled[f.pose] || pi, 0, 0, cv.width, cv.height); }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    };
    const frame = now => {
      if (dead) return;
      const t0 = performance.now();
      const dt = prev ? now - prev : 16.7; prev = now; stats.frames++; if (dt > 50) stats.long++;
      if (!stats.low && dpr > 1 && stats.frames >= 90 && stats.long > stats.frames * 0.15) { stats.low = 1; dpr = 1; fit(); } // máy yếu → độ phân giải CSS
      const f = M.step(now / 1000), s = f.s, m = s.mouth;
      if (f.pose && !poses[f.pose]) loadPose(f.pose);
      const pi = f.pose && typeof poses[f.pose] === 'object' ? poses[f.pose] : null;
      // khóa khung xương (toàn canvas) tách khỏi khóa mặt (chỉ vùng mắt/miệng) → nói/chớp không vẽ lại cả người
      const kT = [f.tilt / 10, f.nod / 10, f.sway / 10, f.breath * 1e3, f.poseW, f.pose, pi ? 1 : 0, cv.width].map(v => (typeof v === 'number' ? Math.round(v * 100) : v || 0)).join();
      const P = f.faceW > 0 ? g.LipFace.parts(who, s, 'tr' + who) : [];
      const key = kT + '|' + P.join('');
      if (key !== lastK) {
        lastK = key; stats.draws++; const tp = performance.now();
        const sc = cv.width / 1108, X = matrix(f), T = [sc * X[0], sc * X[1], sc * X[2], sc * X[3], sc * X[4], sc * X[5]];
        if (kT !== lastT || !boxes) {
          lastT = kT; prof.full++; boxes = boxes || regions(g.LipFace.RIG[who]);
          ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height); paint(T, f, P, pi);
        } else {
          prof.part++;
          [[0, 1, 2], [3, 4]].forEach((idx, r) => {
            if (!idx.some(i => P[i] !== lastP[i])) return;
            const [x0, y0, x1, y1] = boxes[r], xs = [], ys = [];
            for (const [x, y] of [[x0, y0], [x1, y0], [x0, y1], [x1, y1]]) { xs.push(T[0] * x + T[2] * y + T[4]); ys.push(T[1] * x + T[3] * y + T[5]); }
            const L = Math.floor(Math.min(...xs)) - 2, Tp = Math.floor(Math.min(...ys)) - 2, W = Math.ceil(Math.max(...xs)) + 2 - L, H = Math.ceil(Math.max(...ys)) + 2 - Tp;
            ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.beginPath(); ctx.rect(L, Tp, W, H); ctx.clip(); ctx.clearRect(L, Tp, W, H); paint(T, f, P, pi); ctx.restore();
          });
        }
        lastP = P; prof.paint += performance.now() - tp;
      } else prof.skip++;
      stats.speaking = M.speaking(); stats.shape = f.shape; stats.pose = f.poseW > 0.5 ? f.pose : null; stats.emo = f.emo; stats.tilt = f.tilt; stats.nod = f.nod; stats.poseW = f.poseW; stats.blink = s.blink || 0;
      prof.n++; prof.js += performance.now() - t0;
      raf = requestAnimationFrame(frame);
    };
    const ready = load().then(() => img(g.Chars.head(who, true))).then(h => {
      if (dead) return; if (!h) throw new Error('head');
      head = h; M = machine(who, { calm: stats.calm, seed: [...who].reduce((a, c) => a * 31 + c.charCodeAt(0), 7), has: g.Chars && g.Chars.has ? p => g.Chars.has(who, p) : null });
      cv = D.createElement('canvas'); cv.className = 'trig-cv'; cv.setAttribute('aria-hidden', 'true'); ctx = cv.getContext('2d');
      fit(); el.appendChild(cv); if (g.ResizeObserver) { ro = new ResizeObserver(() => !dead && fit()); ro.observe(el); } // cỡ đặt TRƯỚC khi gắn → 1 thay đổi DOM duy nhất
      stats.ready = true; if (!paused) raf = requestAnimationFrame(frame);
    });
    const api = {
      who, stats, ready,
      /** speak(audio, visemes, { text, dur }) → Promise khi nói xong. audio: HTMLAudioElement (đồng hồ = currentTime) hoặc null (đồng hồ trang, cần dur). visemes: mốc CI/Kokoro hoặc null → live theo chữ */
      speak(audio, visemes, so = {}) {
        return ready.then(() => new Promise(done => {
          if (dead) return done();
          const t0 = performance.now(), clock = audio ? () => audio.currentTime : () => (performance.now() - t0) / 1000;
          const c = cuesOf(visemes), dur = (c && c.dur) || so.dur || (audio && isFinite(audio.duration) ? audio.duration : Math.max(0.6, String(so.text || '').length * 0.065));
          const isPlay = audio ? () => playing(audio) : () => clock() < dur;
          const live = c ? null : g.LipSync.live(so.text || '', { dur });
          M.speak({ clock, playing: isPlay, cues: c && c.cues, env: c && c.env, live, dur, text: so.text });
          let ended = false; const fin = () => { if (ended) return; ended = true; M.quiet(); done(); };
          if (audio) { audio.addEventListener('ended', fin, { once: true }); audio.addEventListener('error', fin, { once: true }); } else setTimeout(fin, dur * 1000 + 80);
        }));
      },
      quiet() { if (M) M.quiet(); },
      /** pause(true) = dừng hẳn vòng vẽ (tab ẩn / ngoài màn: 0 CPU); pause(false) = chạy lại, đồng hồ khung không nhảy (prev đặt lại) */
      pause(on) { on = !!on; if (on === paused) return; paused = on; if (on) { cancelAnimationFrame(raf); raf = 0; } else if (stats.ready && !dead) { prev = 0; raf = requestAnimationFrame(frame); } },
      setEmotion(name) { return ready.then(() => M.setEmotion(name)); },
      gesture(name) { const G = GESTURES[name]; return ready.then(() => (G && G.kind === 'pose' ? loadPose(poseOf(G, g.Chars && g.Chars.has ? p => g.Chars.has(who, p) : null)) : null)).then(() => !dead && M.gesture(name, performance.now() / 1000)); }, // ảnh tư thế tải XONG mới mờ chéo (không bật hình)
      listen(on) { return ready.then(() => { M.setEmotion(on ? 'listen' : 'neutral'); }); },
      state: () => (M ? M.last() : null),
      destroy() { dead = true; cancelAnimationFrame(raf); if (ro) ro.disconnect(); if (cv) cv.remove(); el.classList.remove('trig'); },
    };
    ready.catch(() => { stats.failed = true; if (!dead && g.Chars) el.insertAdjacentHTML('beforeend', g.Chars.slot ? g.Chars.slot(who, { size: 'xl', cls: 'trig-poster', ground: false }) : ''); }); // thiếu tài sản → ảnh 2D tĩnh qua chỗ giáo viên chung (Chars.slot), không bao giờ trống
    return api;
  }

  g.TeacherRig = { mount, core, load };
})(typeof self !== 'undefined' ? self : this);
