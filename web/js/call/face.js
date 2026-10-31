/* 🙂 LipFace – mặt VẼ nhiều lớp cho giáo viên 2D Ama/Carlos (kiểu state machine của Rive/Duolingo, docs/specs/call-lipsync.md).
 * Lớp: đầu (poster-2x đã xoá mắt/mày/miệng → "đầu trơn") · mắt (lòng trắng, tròng, đốm sáng) · mi (mí trên = chớp) · mày · ria (Carlos) · miệng (LipMouth).
 * Input số giống Rive: viseme (a,b,k) + gain (độ lớn tiếng) · blink 0..1 · look {x,y} −1..1 · brow (nhướng) · knit (nhíu trong) · tilt (độ) · nod (px).
 * machine(who, o) = các lớp chạy song song theo thời gian (chớp, liếc, nhướng mày, nghiêng đầu khi nói) – hàm thuần của t + hạt giống → phát thật và dựng video giống hệt.
 * Toạ độ = pixel poster-2x (1108×960). Thuần (không DOM): chạy trình duyệt lẫn Node (scripts/lipsync/face_board.py, drawn_frames.mjs). */
(function (g) {
  const LS = g.LipSync || (typeof require !== 'undefined' && require('./lipsync.js'));
  const LM = g.LipMouth || (typeof require !== 'undefined' && require('./mouths.js'));
  // Nét đo trên poster-2x (scripts/lipsync/face_board.py in toạ độ khối tối/trắng): mắt (tâm, bán trục), tròng, mày (trong, đỉnh, ngoài, dày), miệng, ria.
  const RIG = {
    ama: {
      skin: '#742414', ink: '#0B0605', pivot: [554, 640], mouth: [550, 392], rest: 0, look: [0.12, -0.12], hl: true, lw: 6.5, flick: 1, iris: 0.66,
      eyes: [{ c: [483, 316], rx: 32, ry: 30, side: -1 }, { c: [619, 316], rx: 32, ry: 30, side: 1 }],
      brows: [{ i: [516, 241], p: [483, 225], o: [446, 241], th: 13 }, { i: [584, 242], p: [617, 226], o: [655, 242], th: 13 }],
      erase: [[483, 313, 46, 41], [619, 313, 46, 41], [481, 236, 44, 22], [619, 237, 44, 22], [550, 392, 58, 20]]
    },
    carlos: {
      skin: '#DA7845', ink: '#0A0503', pivot: [566, 650], mouth: [560, 399], rest: 0.3, look: [-0.55, 0], hl: false, lw: 7.5, flick: 0, iris: 0.5,
      eyes: [{ c: [510, 307], rx: 29, ry: 18, side: -1 }, { c: [613, 306], rx: 26, ry: 18, side: 1 }],
      brows: [{ i: [547, 264], p: [515, 254], o: [484, 265], th: 20 }, { i: [589, 264], p: [612, 253], o: [636, 265], th: 20 }],
      stache: { c: [568, 379], w: 60, h: 17 },
      erase: [[510, 306, 37, 23], [613, 305, 31, 23], [515, 263, 37, 17], [612, 263, 30, 17], [567, 393, 64, 32]]
    }
  };
  const f = n => Math.round(n * 10) / 10;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  // cung mắt: điểm trên viền elip, y(x) theo cạnh trên (−) / dưới (+)
  const arc = (e, sgn, k = 1, n = 16) => Array.from({ length: n + 1 }, (_, i) => { const x = -e.rx + 2 * e.rx * i / n, r = x / e.rx; return [e.c[0] + x, e.c[1] + sgn * k * e.ry * Math.sqrt(Math.max(0, 1 - r * r))]; });
  const P = (pts, close) => 'M' + pts.map(p => f(p[0]) + ' ' + f(p[1])).join('L') + (close ? 'Z' : '');

  function eye(R, e, st, id) {
    const b = clamp(R.rest + (1 - R.rest) * st.blink, 0, 1), k = 1 - 1.9 * b; // mép mí: 1 = mở hết · −0.9 = nhắm (cong xuống)
    const e2 = { c: e.c, rx: e.rx + 2.5, ry: e.ry + 2 }, lid = arc(e2, -1, k), top = arc(e2, -1, 1.3), lx = st.look.x, ly = st.look.y;
    const ir = e.ry * R.iris * (R.hl ? 1.05 : 1.6), ix = e.c[0] + lx * e.rx * 0.38, iy = e.c[1] + ly * e.ry * 0.3 + (R.hl ? 0 : e.ry * 0.12);
    const o = [`<clipPath id="${id}"><ellipse cx="${e.c[0]}" cy="${e.c[1]}" rx="${e.rx}" ry="${e.ry}"/></clipPath>`,
      `<ellipse cx="${e.c[0]}" cy="${e.c[1]}" rx="${e.rx}" ry="${e.ry}" fill="#FFFFFF"/>`, `<g clip-path="url(#${id})">`,
      `<circle cx="${f(ix)}" cy="${f(iy)}" r="${f(ir)}" fill="${R.ink}"/>`];
    if (R.hl) o.push(`<circle cx="${f(ix - ir * .34)}" cy="${f(iy - ir * .38)}" r="${f(ir * .3)}" fill="#FFFFFF"/>`, `<circle cx="${f(ix + ir * .36)}" cy="${f(iy + ir * .3)}" r="${f(ir * .12)}" fill="#FFFFFF"/>`);
    o.push('</g>', `<path d="${P(top.concat(lid.slice().reverse()), true)}" fill="${R.skin}"/>`); // mí trên (màu da, rộng hơn lòng trắng 2 px → không viền sáng) phủ phần trên mép mí
    if (b > .02) o.push(`<path d="${P(arc(e2, 1, 1).concat(arc(e2, 1, 1.12).reverse()), true)}" fill="${R.skin}"/>`); // mép dưới khi chớp
    o.push(`<path d="${P(lid)}" fill="none" stroke="${R.ink}" stroke-width="${R.lw}" stroke-linecap="round" stroke-linejoin="round"/>`);
    if (R.flick) { const q = lid[e.side > 0 ? lid.length - 1 : 0], s = e.side; // đuôi mi cong ra ngoài (nét Ama)
      o.push(`<path d="M${f(q[0] - s * 4)} ${f(q[1] - 2)}Q${f(q[0] + s * 6)} ${f(q[1] - 3)} ${f(q[0] + s * 10)} ${f(q[1] - 11 + 6 * b)}" fill="none" stroke="${R.ink}" stroke-width="${R.lw * .7}" stroke-linecap="round"/>`); }
    return o.join('');
  }
  function brow(R, w, st, side) {
    const dy = -st.brow * 9, ki = st.knit * 6; // nhướng cả mày · nhíu: đầu trong lên (lo lắng / hỏi)
    const I = [w.i[0], w.i[1] + dy - ki], Pk = [w.p[0], w.p[1] + dy - ki * .4], O = [w.o[0], w.o[1] + dy * .8], t = w.th;
    // thân mày: cạnh trên + cạnh dưới, đầu trong dày, đuôi nhọn (Ama) / tròn (Carlos)
    const up = `M${f(I[0])} ${f(I[1] - t * .45)}Q${f(Pk[0])} ${f(Pk[1] - t * .75)} ${f(O[0])} ${f(O[1] - t * (R.flick ? .05 : .4))}`;
    const dn = `Q${f(Pk[0])} ${f(Pk[1] + t * .55)} ${f(I[0])} ${f(I[1] + t * .5)}Z`;
    return `<path d="${up}${R.flick ? '' : `L${f(O[0])} ${f(O[1] + t * .35)}`}${dn}" fill="${R.ink}" stroke="${R.ink}" stroke-width="${R.flick ? 1 : 4}" stroke-linejoin="round"/>`;
  }
  function stache(R, st) { // ria Carlos: hai cánh tròn, nhấc lên theo môi trên khi mở miệng
    const s = R.stache, x = s.c[0], y = s.c[1] - st.open * 4, w = s.w, h = s.h;
    return `<path d="M${x} ${f(y - h * .45)}C${f(x - w * .3)} ${f(y - h * 1.15)} ${f(x - w * .85)} ${f(y - h * .8)} ${f(x - w)} ${f(y + h * .55)}C${f(x - w * .7)} ${f(y + h * .35)} ${f(x - w * .35)} ${f(y + h * .85)} ${x} ${f(y + h * .35)}`
      + `C${f(x + w * .35)} ${f(y + h * .85)} ${f(x + w * .7)} ${f(y + h * .35)} ${f(x + w)} ${f(y + h * .55)}C${f(x + w * .85)} ${f(y - h * .8)} ${f(x + w * .3)} ${f(y - h * 1.15)} ${x} ${f(y - h * .45)}Z" fill="${R.ink}"/>`;
  }
  /** Toàn bộ lớp mặt (không gồm đầu trơn): <g> theo toạ độ poster-2x. st: trạng thái từ machine().at(t) hoặc tự đặt. */
  function svg(who, st, id = 'f') {
    const R = RIG[who] || RIG.ama; st = Object.assign({ mouth: 'X', blink: 0, look: { x: R.look[0], y: R.look[1] }, brow: 0, knit: 0, open: 0 }, st);
    const m = LM.svg(who, st.mouth, id + 'm');
    return `<g class="lk-face">${R.eyes.map((e, i) => eye(R, e, st, `${id}e${i}`)).join('')}${R.brows.map((w, i) => brow(R, w, st, i)).join('')}`
      + `<g transform="translate(${R.mouth[0]} ${R.mouth[1]})">${m}</g>${R.stache ? stache(R, st) : ''}</g>`;
  }
  // PRNG có hạt giống (mulberry32) → cùng câu, cùng chuyển động
  const rng = s => () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const ease = x => x * x * (3 - 2 * x);
  const EMO = { happy: { brow: .25, tilt: 1.5 }, cheer: { brow: .45, tilt: 2 }, explain: { brow: .12, tilt: -1 }, encourage: { brow: .3, tilt: 1.8 }, thinking: { brow: .1, knit: .5, tilt: -2.5, look: [-.4, -.5] }, concern: { knit: .8, tilt: -1.5 }, listen: {} };
  /** Bộ máy biểu cảm. o: { cues, env (RMS 100 Hz, tuỳ chọn), dur, emo, seed, text }.
   *  Lớp miệng: viseme từ cues × độ mở theo độ lớn tiếng (LipSync.gain). Song song: chớp mắt (2.8–5.6 s, 15 % chớp đôi, 150 ms), liếc (đứng nhìn người học khi nói, liếc nhẹ khi ngắt),
   *  nhướng mày ở chỗ nhấn (tiếng bật lên sau im) và cuối câu hỏi, nghiêng/gật đầu nhẹ theo năng lượng nói. Trả { at(t) → trạng thái, blinks }. */
  function machine(who, o = {}) {
    const R = RIG[who] || RIG.ama, r = rng(o.seed ?? 7), E = EMO[o.emo] || {}, dur = o.dur ?? 3, env = o.env || null, hz = 100;
    const G = env ? LS.gain(env) : () => 1, cues = o.cues || [{ start: 0, end: dur, value: 'X' }];
    const peak = env ? Math.max(...env, 1e-6) : 1, voiced = t => env ? (env[clamp(Math.round(t * hz), 0, env.length - 1)] > peak * .1) : LS.stateAt(cues, t).b !== 'X';
    // lịch chớp mắt
    const blinks = []; for (let t = 1 + r() * 1.6; t < dur + 6; t += 2.8 + r() * 2.8) { blinks.push(t); if (r() < .15) blinks.push(t += .26); }
    const blinkAt = t => { let v = 0; for (const b of blinks) { const d = t - b; if (d >= 0 && d < .15) v = Math.max(v, d < .06 ? ease(d / .06) : d < .08 ? 1 : 1 - ease((d - .08) / .07)); } return v; };
    // điểm nhấn = tiếng bật lên sau ≥ 150 ms im (đầu cụm) · cuối câu hỏi
    const acc = []; if (env) { let q = 99; for (let i = 0; i < env.length; i++) { if (env[i] > peak * .1) { if (q >= 15) acc.push(i / hz); q = 0; } else q++; } }
    if (/\?\s*$/.test(o.text || '')) { const lastOn = [...cues].reverse().find(c => c.value !== 'X'); if (lastOn) acc.push(Math.max(0, lastOn.start - .25)); }
    const pulse = (t, w) => acc.reduce((v, a) => { const d = t - a + .04; return d > 0 && d < w ? Math.max(v, Math.sin(Math.PI * d / w)) : v; }, 0);
    // liếc: đổi điểm nhìn ở chỗ im (không liếc giữa từ), 70 ms
    const sacc = [{ t: 0, x: R.look[0], y: R.look[1] }]; for (let t = 1 + r() * 1.5; t < dur + 6; t += 1.6 + r() * 2.2) { if (voiced(t)) continue; const lk = E.look || R.look; sacc.push({ t, x: lk[0] + (r() - .5) * .5, y: lk[1] + (r() - .5) * .25 }); }
    const lookAt = t => { let i = 0; while (i < sacc.length - 1 && sacc[i + 1].t <= t) i++; const a = sacc[Math.max(0, i - 1)], b = sacc[i], k = i ? ease(clamp((t - b.t) / .07, 0, 1)) : 1;
      const tx = voiced(t) ? R.look[0] * .8 : b.x; return { x: a.x + (tx - a.x) * k, y: a.y + (b.y - a.y) * k }; };
    let sp = 0, lastT = -1, ph = r() * 6; // năng lượng nói làm mượt (lớp nghiêng đầu)
    const talk = t => { let s = 0; for (let k = -30; k <= 0; k += 3) s += voiced(t + k / hz) ? 1 : 0; return s / 11; };
    return {
      blinks, accents: acc,
      at(t) {
        const s = LS.stateAt(cues, t), p = LM.mix(s.a, s.b, s.k), gn = G(t), open = p.u + p.d > .02;
        if (open) { p.u *= gn; p.d *= gn; p.w *= .9 + .1 * Math.min(1, gn); }
        sp = talk(t); lastT = t;
        const acc = pulse(t, .45);
        return { mouth: p, shape: s.k >= .5 ? s.b : s.a, gain: gn, open: open ? Math.min(1, (p.u + p.d) / .9) : 0, blink: blinkAt(t), look: lookAt(t),
          brow: clamp((E.brow || 0) + acc * .7, -.3, 1), knit: E.knit || 0,
          tilt: (E.tilt || 0) * .6 + sp * (1.4 * Math.sin(t * 1.7 + ph) + .6 * Math.sin(t * 3.1 + ph * 2)), nod: acc * 3 * sp, talk: sp };
      }
    };
  }
  const api = { RIG, EMO, svg, machine };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else g.LipFace = api;
})(typeof window !== 'undefined' ? window : globalThis);
