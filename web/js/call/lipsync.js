/* 👄 LipSync – khớp miệng 2D theo âm vị (9 hình miệng Rhubarb/Preston Blair: X nghỉ · A M/B/P · B răng khép · C mở · D mở rộng · E tròn nhẹ · F chu môi · G F/V · H L).
 * Hai nguồn mốc (docs/specs/call-lipsync.md):
 *  - "pre": câu dựng sẵn → Rhubarb (--dialogFile) chạy trên CI → cues [{start,end,value}].
 *  - "live": câu AI lúc chạy → fromText(chữ) (CMUdict + luật chữ) → con trỏ âm vị chạy theo đồng hồ âm thanh, chỉ tiến khi có tiếng (năng lượng Web Audio),
 *    im → X. speechSynthesis (không có âm thanh) → chạy theo thời gian ước lượng, neo lại ở onboundary nếu trình duyệt bắn.
 * Vẽ: stateAt(cues, t) → {a, b, k}: hình cũ a trộn sang hình mới b theo k (0..1, BLEND giây) – cùng 1 hàm cho phát thật và dựng video (đo được, không lệch).
 * Thuần (không DOM) trừ player(); test: scripts/test/lipsync.mjs. */
(function (g) {
  const SHAPES = ['X', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  const BLEND = 0.06, MIN_HOLD = 0.05, LEAD = 0.02; // trộn 60 ms · giữ ≥ 50 ms (chống nháy) · hình đi trước tiếng 20 ms (mắt chấp nhận hình sớm, không chấp nhận hình trễ)
  // ARPAbet → hình miệng (bảng của Rhubarb: github.com/DanielSWolf/rhubarb-lip-sync#mouth-shapes)
  const P2V = { M: 'A', B: 'A', P: 'A', F: 'G', V: 'G', L: 'H', W: 'F', UW: 'F', OW: 'F', UH: 'F', OY: 'F', AO: 'E', ER: 'E', R: 'E',
    AA: 'D', AY: 'D', AW: 'D', AE: 'C', EH: 'C', AH: 'C', EY: 'C', IH: 'B', IY: 'B' }; // còn lại (K G T D N S Z TH DH CH JH SH ZH Y HH NG) → B
  const vOf = p => P2V[p.replace(/\d/, '')] || 'B';
  const isV = p => /^[AEIOU]/.test(p);
  // Luật chữ → âm vị (dự phòng khi từ không có trong từ điển): đủ để chọn hình miệng, không để đọc IPA
  const RULES = [['tion', 'SH AH N'], ['ough', 'OW'], ['igh', 'AY'], ['ee', 'IY'], ['ea', 'IY'], ['oo', 'UW'], ['ou', 'AW'], ['ow', 'OW'], ['oi', 'OY'], ['ay', 'EY'], ['ai', 'EY'], ['au', 'AO'],
    ['ch', 'CH'], ['sh', 'SH'], ['th', 'TH'], ['ph', 'F'], ['wh', 'W'], ['ck', 'K'], ['ng', 'NG'], ['qu', 'K W'], ['er', 'ER'], ['ar', 'AA R'], ['or', 'AO R'],
    ['a', 'AE'], ['e', 'EH'], ['i', 'IH'], ['o', 'AA'], ['u', 'AH'], ['y', 'IY'], ['b', 'B'], ['c', 'K'], ['d', 'D'], ['f', 'F'], ['g', 'G'], ['h', 'HH'], ['j', 'JH'],
    ['k', 'K'], ['l', 'L'], ['m', 'M'], ['n', 'N'], ['p', 'P'], ['r', 'R'], ['s', 'S'], ['t', 'T'], ['v', 'V'], ['w', 'W'], ['x', 'K S'], ['z', 'Z']];
  function g2p(w) {
    w = w.toLowerCase().replace(/[^a-z]/g, '').replace(/e$/, w.length > 3 ? '' : 'e'); const out = [];
    for (let i = 0; i < w.length;) { const r = RULES.find(([k]) => w.startsWith(k, i)); if (!r) { i++; continue; } out.push(...r[1].split(' ')); i += r[0].length; }
    return out;
  }
  let DICT = null; // { word: 'HH AH0 L OW1' } – nạp tùy chọn (CMUdict BSD, content/lexicon/cmudict-subset.txt)
  const parseDict = txt => { const d = {}; for (const l of txt.split('\n')) { const m = /^([a-z']+) (.+)$/.exec(l); if (m && !d[m[1]]) d[m[1]] = m[2]; } return d; };

  /** Chữ → các đơn vị {v, w (trọng số thời lượng), wi (chỉ số từ), ci (vị trí ký tự)}; dấu câu → khoảng im có trọng số. */
  function units(text) {
    const U = []; let wi = 0; const re = /[A-Za-z']+|[,.;:!?]/g; let m;
    while ((m = re.exec(text))) {
      const w = m[0];
      if (/^[,.;:!?]$/.test(w)) { U.push({ v: 'X', w: /[,;:]/.test(w) ? 1.6 : 2.4, wi: -1, ci: m.index, gap: 1 }); continue; }
      const ph = (DICT && DICT[w.toLowerCase()] || '').split(' ').filter(Boolean); const ps = ph.length ? ph : g2p(w);
      for (const p of ps) U.push({ v: vOf(p), w: isV(p) ? (/1/.test(p) ? 1.35 : 1) : /^[PTKBDG]$/.test(p) ? 0.5 : 0.65, wi, ci: m.index });
      wi++;
    }
    return U;
  }
  /** Chữ + thời lượng (s) → cues giống Rhubarb (đầu/cuối im X). Dùng cho "live" khi đã biết độ dài âm thanh, và cho test. */
  function fromText(text, dur, o = {}) {
    const U = units(text), lead = o.lead ?? 0.05, tail = o.tail ?? 0.12, tot = U.reduce((s, u) => s + u.w, 0) || 1;
    const k = Math.max(0.05, dur - lead - tail) / tot; let t = lead; const cues = [{ start: 0, end: lead, value: 'X' }];
    for (const u of U) { cues.push({ start: t, end: t + u.w * k, value: u.v }); t += u.w * k; }
    cues.push({ start: t, end: Math.max(t, dur), value: 'X' });
    return smooth(cues);
  }
  /** Gộp hình trùng nhau liền kề và nuốt mảnh < MIN_HOLD vào hình trước (hết nháy). */
  function smooth(cues) {
    const out = [];
    for (const c of cues) {
      const p = out[out.length - 1];
      if (p && (p.value === c.value || c.end - c.start < MIN_HOLD)) { p.end = c.end; continue; }
      out.push({ ...c });
    }
    if (out.length > 1 && out[0].end - out[0].start < MIN_HOLD) { out[1].start = 0; out.shift(); }
    return out;
  }
  /** Tinh chỉnh mốc (CI, trước smooth): neo chỗ miệng mở sau im / khép trước im vào lúc tiếng thật bắt đầu / tắt.
   * env = RMS 100 Hz của file tiếng; words = [{start,end}] thời điểm từ của Kokoro (tùy chọn) → mép từ đầu/cuối mỗi cụm.
   * Sửa lỗi Rhubarb mở miệng sớm ở âm hơi "H" (Hi/Hey) và mở trễ ở phụ âm tắc đầu câu. Chỉ dời mốc trong ±WIN, không đổi hình. */
  function align(cues, env, o = {}) {
    const WIN = o.win ?? 0.15, FAR = o.far ?? 0.5, hz = o.hz ?? 100, peak = Math.max(...env, 1e-6), thr = peak * (o.thr ?? 0.1), W = o.words || [];
    const on = i => env[i] > thr, at = t => Math.max(0, Math.min(env.length - 1, Math.round(t * hz)));
    const near = (t, ws, k) => { let b = null; for (const w of ws) { const d = Math.abs(w[k] - t); if (d <= WIN && (!b || d < Math.abs(b[k] - t))) b = w; } return b; };
    // mép của ĐÚNG đoạn tiếng chứa mốc t (dir 1 = lúc bắt đầu, −1 = lúc tắt): đang có tiếng → lùi/tiến tới mép trong ±WIN; đang im → tìm đoạn tiếng gần nhất về phía nó trong FAR
    // (Kokoro kéo dài âm cuối như "r" trong "slower" tới 300 ms sau khi tiếng tắt; không vớ tiếng của từ kế tiếp)
    const edge = (t, dir) => { let k = at(t);
      if (on(k)) { if (dir > 0) { while (k > at(t - WIN) && on(k - 1)) k--; return k / hz; } while (k < at(t + WIN) && on(k + 1)) k++; return (k + 1) / hz; }
      if (dir > 0) { const e = at(t + FAR); while (k < e && !on(k)) k++; return on(k) ? k / hz : t; }
      const e = at(t - FAR); while (k > e && !on(k)) k--; return on(k) ? (k + 1) / hz : t; };
    let out = cues.map(c => ({ ...c }));
    // chỗ ngắt im ≥ GAP giữa câu mà Rhubarb vẫn để miệng mở (âm hơi "H" kéo hình sớm) → chèn X đúng khoảng im
    const GAP = o.gap ?? 0.12, first = env.findIndex((_, i) => on(i)); let last = env.length - 1; while (last > 0 && !on(last)) last--;
    for (let k = first + 1; first >= 0 && k < last; k++) {
      if (on(k)) continue; let e = k; while (e < last && !on(e)) e++;
      const a = k / hz, b = e / hz; k = e;
      if (b - a < GAP) continue;
      const nx = [];
      for (const c of out) {
        if (c.end <= a || c.start >= b || c.value === 'X') { nx.push(c); continue; }
        if (c.start < a) nx.push({ ...c, end: a });
        if (!nx.some(x => x.value === 'X' && x.start === a)) nx.push({ start: a, end: b, value: 'X' });
        if (c.end > b) nx.push({ ...c, start: b });
      }
      out = nx.sort((x, y) => x.start - y.start).filter((c, i, A) => !(c.value === 'X' && A[i - 1] && A[i - 1].value === 'X' && (A[i - 1].end = Math.max(A[i - 1].end, c.end))));
    }
    for (let i = 1; i < out.length; i++) {
      const p = out[i - 1], c = out[i];
      if (p.value === 'X' && c.value !== 'X') { // im → mở: lúc tiếng bắt đầu
        const w = near(c.start, W, 'start'); let t = w ? w.start : c.start;
        t = edge(t, 1);
        t = Math.max(p.start + 0.01, Math.min(c.end - 0.01, t)); p.end = c.start = t;
      } else if (p.value !== 'X' && c.value === 'X') { // mở → im: lúc tiếng tắt
        const w = near(c.start, W, 'end'); let t = w ? w.end : c.start;
        t = edge(t, -1);
        t = Math.max(p.start + 0.01, Math.min(c.end - 0.01, t)); p.end = c.start = t;
      }
    }
    return out;
  }
  // Âm vị IPA của Kokoro/misaki (en-US; chữ hoa = nguyên âm đôi: A eɪ · I aɪ · W aʊ · Y ɔɪ · O oʊ · T flap) → hình miệng (cùng bảng P2V)
  const IPA = { m: 'A', b: 'A', p: 'A', f: 'G', v: 'G', l: 'H', w: 'F', u: 'F', 'ʊ': 'F', O: 'F', Y: 'F', 'ɔ': 'E', 'ɜ': 'E', 'ɝ': 'E', 'ɚ': 'E', 'ɹ': 'E',
    'ɑ': 'D', I: 'D', W: 'D', 'æ': 'C', 'ɛ': 'C', 'ʌ': 'C', 'ə': 'C', 'ɐ': 'C', 'ᵊ': 'C', A: 'C', 'ɪ': 'B', i: 'B' }; // phụ âm còn lại → B
  /** Âm vị Kokoro [{p,s,e}] → khúc [{v,s,e}]: dấu nhấn (ˈˌ) và dấu dài (ː) có thời lượng riêng trong pred_dur, model phát nguyên âm SAU trong khoảng đó
   * → gộp vào âm sau (ː gộp vào âm trước). v = hình miệng · 'X' = dấu câu/ngắt · ' ' = khoảng trắng giữa từ. */
  function phoneSpans(ph) {
    const out = []; let pend = null;
    for (const x of ph) {
      if (/[ˈˌ]/.test(x.p)) { pend = pend ?? x.s; continue; }
      if (x.p === 'ː') { if (out.length) out[out.length - 1].e = x.e; continue; }
      const v = x.p === ' ' ? ' ' : !/[a-zA-Zɐ-ʒʤʧᵊæðŋθ]/.test(x.p) ? 'X' : (IPA[x.p] || 'B');
      out.push({ v, s: pend ?? x.s, e: x.e }); pend = null;
    }
    return out;
  }
  /** Mốc âm vị Kokoro (scripts/lipsync/kokoro_ts.py: [{p, s, e}] giây, đúng thời lượng model đã dùng để sinh tiếng) → cues.
   * Khoảng trắng ngắn (< 80 ms) nối vào âm sau; dấu câu / ngắt dài → X. */
  function fromPhones(ph, dur) {
    const sp = phoneSpans(ph), cues = [{ start: 0, end: sp.length ? sp[0].s : dur, value: 'X' }];
    for (const x of sp) {
      const v = x.v === ' ' ? (x.e - x.s < 0.08 ? null : 'X') : x.v;
      if (!v) { cues[cues.length - 1].end = x.e; continue; }
      cues.push({ start: x.s, end: x.e, value: v });
    }
    const last = cues[cues.length - 1]; if (last.value !== 'X' || last.end < dur) cues.push({ start: last.end, end: Math.max(last.end, dur), value: 'X' });
    for (let i = 1; i < cues.length; i++) cues[i - 1].end = cues[i].start;
    return smooth(cues);
  }
  /** Độ đi trước riêng từng hình (Rive/Duolingo: môi khép M/B/P, răng-môi F/V, chu môi W/OO phải tới TRƯỚC tiếng). LEAD chung đã có trong stateAt → chỉ dời phần dư, hình trước vẫn giữ ≥ MIN_HOLD (không nháy). */
  const LEADS = { A: 0.065, G: 0.045, F: 0.04 };
  function lead(cues) {
    const out = cues.map(c => ({ ...c }));
    for (let i = 1; i < out.length; i++) { const d = (LEADS[out[i].value] || LEAD) - LEAD; if (d <= 0) continue;
      const t = Math.max(out[i - 1].start + MIN_HOLD, out[i].start - d); if (t < out[i].start) out[i - 1].end = out[i].start = t; }
    return out;
  }
  /** Độ mở theo độ lớn tiếng: env = RMS 100 Hz → g(t) ∈ [GMIN, GMAX] (lên nhanh 30 ms, xuống 120 ms, đi trước LEAD) – tiếng nhỏ cuối câu → miệng mở hẹp, nhấn mạnh → mở to. */
  const GMIN = 0.45, GMAX = 1.15;
  function gain(env, o = {}) {
    const hz = o.hz ?? 100, ref = [...env].sort((a, b) => a - b)[Math.floor(env.length * 0.95)] || 1e-6, sm = new Float32Array(env.length); let y = 0;
    const ka = 1 - Math.exp(-1 / (0.03 * hz)), kr = 1 - Math.exp(-1 / (0.12 * hz));
    for (let i = 0; i < env.length; i++) { const x = Math.min(1.3, env[i] / ref); y += (x > y ? ka : kr) * (x - y); sm[i] = y; }
    return t => { const i = Math.max(0, Math.min(env.length - 1, Math.round((t + LEAD) * hz))); return Math.max(GMIN, Math.min(GMAX, GMIN + (GMAX - GMIN) * Math.pow(sm[i] / 1.1, 0.6))); };
  }
  /** Trạng thái vẽ ở thời điểm t: a = hình trước, b = hình hiện tại, k = tỉ lệ trộn sang b. */
  function stateAt(cues, t) {
    t += LEAD; let i = 0; while (i < cues.length - 1 && cues[i + 1].start <= t) i++;
    const c = cues[i] || { value: 'X', start: 0 }, a = i > 0 ? cues[i - 1].value : 'X';
    return { a, b: c.value, k: Math.min(1, Math.max(0, (t - c.start) / BLEND)), i };
  }

  /** Con trỏ "live" (nhân quả, chạy từng khung): tiến theo thời gian chỉ khi có tiếng; im → X. Trả cues đã phát (để đo). */
  function live(text, o = {}) {
    const U = units(text).filter(u => !u.gap), tot = U.reduce((s, u) => s + u.w, 0) || 1;
    let rate = o.dur ? tot / Math.max(0.3, o.dur * (o.voiced ?? 0.82)) : (o.ups || 9.5); // đơn vị trọng số / giây có tiếng
    let pos = 0, cur = 'X', since = 0; const cues = [{ start: 0, end: 0, value: 'X' }];
    const at = p => { let s = 0; for (const u of U) { s += u.w; if (s > p) return u; } return null; };
    return {
      cues,
      /** t = đồng hồ âm thanh (s), voiced = có tiếng ở khung này, dt = s */
      tick(t, voiced, dt) {
        if (voiced) pos += dt * rate;
        const u = pos < tot ? at(pos) : null, want = voiced && u ? u.v : 'X';
        if (want !== cur && t - since >= MIN_HOLD) { cues[cues.length - 1].end = t; cues.push({ start: t, end: t, value: want }); cur = want; since = t; }
        cues[cues.length - 1].end = t; return cur;
      },
      /** neo lại theo ranh giới từ (speechSynthesis onboundary: charIndex) */
      word(ci) { let s = 0; for (const u of U) { if (u.ci >= ci) { pos = s; return; } s += u.w; } },
      setRate(r) { rate = r; }
    };
  }
  /** Phát hiện có tiếng theo năng lượng RMS, có trễ bật/tắt (hysteresis) để không giật khi âm nhỏ giữa từ. */
  function vad(o = {}) {
    let on = false, floor = o.floor ?? 0.01, quiet = 0;
    return rms => { if (rms > floor * 2.2) { on = true; quiet = 0; } else if (on && rms < floor * 1.4 && ++quiet > (o.hang ?? 4)) on = false; return on; };
  }

  /** player(el, sheet) – sheet: { img (url sprite ngang 9 ô theo order), order, roi:[x,y,w,h] trên ảnh nền, w, h, base (url), blink? }
   *  → { play(audio, cues|{text}), stop(), frame(cues, t) (vẽ tĩnh cho dựng video), stats } */
  function player(el, sheet) {
    const D = g.document, sc = () => el.clientWidth / sheet.w;
    el.classList.add('ls'); el.innerHTML = `<div class="ls-head"><img class="ls-base" src="${sheet.base}" alt="" draggable="false"><i class="ls-m"></i><i class="ls-m"></i>${sheet.blink ? '<i class="ls-eye"></i>' : ''}</div>`;
    const L = [...el.querySelectorAll('.ls-m')], E = el.querySelector('.ls-eye'), n = sheet.order.length;
    const place = () => { const s = sc(), [x, y, w, h] = sheet.roi; for (const m of L) Object.assign(m.style, { left: x * s + 'px', top: y * s + 'px', width: w * s + 'px', height: h * s + 'px', backgroundImage: `url(${sheet.img})`, backgroundSize: `${n * 100}% 100%` });
      if (E) { const [ex, ey, ew, eh] = sheet.blink.roi; Object.assign(E.style, { left: ex * s + 'px', top: ey * s + 'px', width: ew * s + 'px', height: eh * s + 'px', backgroundImage: `url(${sheet.blink.img})`, backgroundSize: '100% 100%' }); } };
    place(); g.addEventListener('resize', place);
    const cell = v => { const i = Math.max(0, sheet.order.indexOf(v)); return `${n > 1 ? (i / (n - 1)) * 100 : 0}% 0`; };
    // X = miệng nghỉ của chính ảnh nền → lớp miệng trong suốt (không vá lên ảnh gốc khi im)
    const draw = st => { const ox = st.a === 'X' ? 0 : 1, oy = st.b === 'X' ? 0 : 1;
      L[0].style.backgroundPosition = cell(st.a); L[0].style.opacity = ox * (1 - st.k) + (st.a === st.b ? oy * st.k : 0);
      L[1].style.backgroundPosition = cell(st.b); L[1].style.opacity = st.a === st.b ? 0 : oy * st.k; };
    const blinkAt = t => E && (t % 4.1 > 3.98 || (t % 9.7 > 9.58)) ? 1 : 0; // chớp 120 ms, nhịp lệch nhau cho tự nhiên
    let raf = 0, stats = { frames: 0, long: 0, worst: 0, t0: 0, sw: [] };
    const self = {
      stats,
      frame(cues, t) { draw(stateAt(cues, t)); if (E) E.style.opacity = blinkAt(t); },
      /** cues → phát theo audio.currentTime; {text, analyser} → live */
      play(audio, src, o = {}) {
        self.stop(); let L2 = null, prev = performance.now(), last = '';
        const buf = src.analyser ? new Float32Array(src.analyser.fftSize) : null, vd = vad(o.vad), lat = o.latency || 0;
        if (src.text) L2 = live(src.text, { dur: isFinite(audio.duration) ? audio.duration : 0 });
        stats.t0 = prev; stats.frames = 0; stats.long = 0; stats.worst = 0; stats.sw = [];
        const loop = now => {
          const dt = (now - prev) / 1000; prev = now; stats.frames++; if (dt > 0.05) stats.long++; stats.worst = Math.max(stats.worst, dt);
          const t = audio.currentTime - lat; let st;
          if (L2) { let rms = 0; if (buf) { src.analyser.getFloatTimeDomainData(buf); for (const x of buf) rms += x * x; rms = Math.sqrt(rms / buf.length); }
            const v = buf ? vd(rms) : !audio.paused; L2.tick(t, v && !audio.ended, Math.min(dt, 0.1)); st = stateAt(L2.cues, t - LEAD); }
          else st = stateAt(src, t);
          if (st.b !== last) { stats.sw.push([t, st.b]); last = st.b; }
          draw(st); if (E) E.style.opacity = blinkAt(now / 1000);
          if (!audio.ended) raf = requestAnimationFrame(loop); else { draw({ a: 'X', b: 'X', k: 1 }); self.done && self.done(L2 ? L2.cues : src); }
        };
        raf = requestAnimationFrame(loop); return L2;
      },
      stop() { cancelAnimationFrame(raf); draw({ a: 'X', b: 'X', k: 1 }); }
    };
    return self;
  }

  const api = { SHAPES, BLEND, MIN_HOLD, LEAD, LEADS, P2V, IPA, units, fromText, phoneSpans, fromPhones, lead, gain, smooth, align, stateAt, live, vad, player, g2p, setDict: txt => { DICT = typeof txt === 'string' ? parseDict(txt) : txt; } };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else g.LipSync = api;
})(typeof window !== 'undefined' ? window : globalThis);
