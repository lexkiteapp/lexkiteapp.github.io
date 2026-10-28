/* 🎭 Con rối 2D Ama (SVG vẽ lại từ bộ 2D teach-green – không cắt ghép ảnh) – 1 động cơ cho 2 đầu ra: giáo viên trong app (mount) và video Remotion (sample + apply).
 * Lớp: tóc/băng đô/tai+khuyên · mặt · mắt (chớp tự động + liếc saccade, mi trên/dưới) · lông mày · miệng tham số 9 viseme Rhubarb (X A B C D E F G H) · thân thở · 2 tay 2 khớp + 3 dạng bàn tay.
 * 6 biểu cảm (neutral happy thinking encouraging surprised proud) · 4 cử chỉ (explain point clap open). Mọi chuyển động là hàm THUẦN của thời gian t + seed
 * → app (rAF 60 fps) và video (khung/fps) ra cùng một hình. Không runtime ngoài, không tải ảnh: ~6 KB gz, tải lười (0 KB trong shell). Thiết kế: docs/LESSON-ENGINE.md §4b. */
(function (g) {
  const NS = 'http://www.w3.org/2000/svg';
  const C = { skin: '#7E3A24', skinD: '#55261E', skinL: '#A8644A', hair: '#140708', hairL: '#4A2A22', band: '#E8AE2E', bandL: '#FFE08A', gold: '#F2C14E', jk: '#0A8F98', jkL: '#46C6CB', jkD: '#05555C', top: '#D85F57', topL: '#F08A7E', lip: '#4A1512', lipL: '#9A3A30', mouth: '#2A0807', tongue: '#C9504F', ink: '#120303', iris: '#5A2A14', irisL: '#A0612F', white: '#FFFFFF', blush: '#E0574A' }; // màu theo Ama 3D giáo viên (vest teal, áo san hô, băng đô vàng) – 2.5D: gradient sáng trên-trái
  const FACE = 'M148 248C148 186 190 154 240 154C290 154 332 186 332 248C332 300 318 336 290 354C274 364 258 368 240 368C222 368 206 364 190 354C162 336 148 300 148 248Z';
  const EYE = [[203, 262], [277, 262]], MOUTH = [240, 331], NECK = [240, 350], SH = [[104, 452], [376, 452]], L1 = 125, L2 = 115, HS = 1.45;

  // ---- 9 khẩu hình (Preston Blair / Rhubarb): open = hàm mở, wide = bề ngang, round = chu môi, teeth = răng trên, tongue = lưỡi, press = mím, tuck = môi dưới chạm răng
  const VIS = {
    X: { open: 0, wide: 0.5, round: 0, teeth: 0, tongue: 0, press: 0, tuck: 0 },
    A: { open: 0, wide: 0.42, round: 0, teeth: 0, tongue: 0, press: 1, tuck: 0 },   // M B P
    B: { open: 0.22, wide: 0.72, round: 0, teeth: 1, tongue: 0, press: 0, tuck: 0 }, // K S T EE (răng khít)
    C: { open: 0.48, wide: 0.7, round: 0, teeth: 0.7, tongue: 0.2, press: 0, tuck: 0 }, // EH AE
    D: { open: 0.95, wide: 0.78, round: 0, teeth: 0.5, tongue: 0.45, press: 0, tuck: 0 }, // AA
    E: { open: 0.55, wide: 0.42, round: 0.55, teeth: 0.2, tongue: 0.2, press: 0, tuck: 0 }, // AO ER
    F: { open: 0.28, wide: 0.2, round: 1, teeth: 0, tongue: 0, press: 0, tuck: 0 },  // UW OW W
    G: { open: 0.14, wide: 0.6, round: 0, teeth: 1, tongue: 0, press: 0, tuck: 1 },  // F V
    H: { open: 0.55, wide: 0.62, round: 0, teeth: 0.6, tongue: 1, press: 0, tuck: 0 }, // L
  };
  const MK = Object.keys(VIS.X);
  // ---- biểu cảm: smile, brow (nâng), inner (đầu mày trong nâng – lo/khích lệ), asym (mày lệch – nghĩ), squint (mi dưới), lid (mi trên sụp), wide (mắt mở to),
  //      tilt (độ nghiêng đầu), chin (ngẩng), blush, gx/gy (hướng nhìn), rest (miệng lúc im)
  const EXPR = {
    neutral: { smile: 0.5, brow: 0, inner: 0, asym: 0, squint: 0.05, lid: 0.12, wide: 0, tilt: 0, chin: 0, blush: 0.25, gx: 0, gy: 0, rest: null },
    happy: { smile: 0.95, brow: 4, inner: 0, asym: 0, squint: 0.42, lid: 0.1, wide: 0, tilt: -3, chin: 0, blush: 0.6, gx: 0, gy: 0, rest: { open: 0.22, wide: 0.75, teeth: 1 } },
    thinking: { smile: 0.05, brow: 2, inner: 0, asym: 7, squint: 0.15, lid: 0.22, wide: 0, tilt: 6, chin: -1, blush: 0.2, gx: 5, gy: -5, rest: { wide: 0.32, shift: 7 } },
    encouraging: { smile: 0.7, brow: 3, inner: 5, asym: 0, squint: 0.25, lid: 0.1, wide: 0, tilt: -5, chin: 0, blush: 0.45, gx: 0, gy: 0, rest: null },
    surprised: { smile: 0.2, brow: 11, inner: 0, asym: 0, squint: 0, lid: 0, wide: 1, tilt: 0, chin: -2, blush: 0.3, gx: 0, gy: 0, rest: { open: 0.35, wide: 0.3, round: 0.8 } },
    proud: { smile: 0.85, brow: 2, inner: 0, asym: 0, squint: 0.3, lid: 0.32, wide: 0, tilt: 2, chin: -5, blush: 0.5, gx: 0, gy: 0, rest: null },
  };
  const EK = Object.keys(EXPR.neutral).filter(k => k !== 'rest');
  // ---- tay: [góc cánh tay, góc cẳng tay] (độ, 0 = thẳng xuống, + = ra ngoài/lên), bàn tay: 'open' | 'side' | 'point', bend = gập cổ tay
  const REST = { a: 7, b: 5, hand: 'open', bend: 0 };
  const GEST = {
    explain: { dur: 1.9, L: { a: 12, b: -150, hand: 'open', bend: -40 }, beat: [0, 6] },         // tay phải (bên trái khung) mở cạnh ngực, nhịp theo lời giảng
    point: { dur: 1.7, R: { a: 8, b: 160, hand: 'point', bend: 0 }, beat: [0, 3] },            // chỉ chéo lên phía bảng/thẻ
    pointL: { dur: 1.7, L: { a: 8, b: 160, hand: 'point', bend: 0 }, beat: [0, 3] },          // chỉ chéo lên phía trái (video: thẻ ở trên-trái)
    clap: { dur: 1.5, L: { a: -12, b: -130, hand: 'side', bend: -60 }, R: { a: -12, b: -130, hand: 'side', bend: -60 }, clap: 3, shut: -104 },
    open: { dur: 1.8, L: { a: 28, b: 176, hand: 'open', bend: -4 }, R: { a: 28, b: 176, hand: 'open', bend: -4 }, shrug: 6 },
  };
  // ---- gắn kịch bản: loại lời nhắc → biểu cảm + cử chỉ (question → nghiêng đầu nghĩ, correct → vỗ tay, wrong → khích lệ, explain → tay giải thích)
  const KIND = {
    question: { expr: 'thinking' }, correct: { expr: 'happy', gest: 'clap' }, wrong: { expr: 'encouraging', gest: 'open' }, explain: { expr: 'neutral', gest: 'explain' },
    point: { gest: 'point' }, greet: { expr: 'happy', gest: 'open' }, proud: { expr: 'proud', gest: 'open' }, encourage: { expr: 'encouraging' }, surprised: { expr: 'surprised' }, neutral: { expr: 'neutral' },
  };

  const lerp = (a, b, k) => a + (b - a) * k, clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const ease = k => { k = clamp(k, 0, 1); return k * k * (3 - 2 * k); };
  const hash = n => { n = Math.imul(n ^ (n >>> 15), 0x2c1b3c6d); n = Math.imul(n ^ (n >>> 12), 0x297a2d39); return ((n ^ (n >>> 15)) >>> 0) / 4294967296; };
  const f = x => Math.round(x * 10) / 10;

  // ================= vẽ (chuỗi SVG – dùng chung cho DOM và Remotion) =================
  function art(o = {}) {
    const id = o.id || 'pp' + Math.floor(Math.random() * 1e6).toString(36), u = k => `url(#${id}${k})`;
    let curls = '', bumps = '';
    for (let i = 0; i < 26; i++) { // viền tóc xoăn: vòng bướu quanh khối tóc
      const ang = -Math.PI - 0.38 + i * ((Math.PI + 0.76) / 25), x = 240 + Math.cos(ang) * 156, y = 212 + Math.sin(ang) * 140, r = 30 + 8 * hash(i + 3);
      bumps += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}"/>`;
    }
    for (let i = 0; i < 40; i++) { // lọn xoăn bắt sáng (2.5D: sáng phía trên-trái)
      const ang = -Math.PI - 0.3 + hash(i * 7 + 1) * (Math.PI + 0.6), rr = 60 + hash(i * 13 + 5) * 105, x = 240 + Math.cos(ang) * rr * 1.08, y = 214 + Math.sin(ang) * rr * 0.95;
      if (y > 300 && Math.abs(x - 240) < 110) continue;
      curls += `<path d="M${f(x - 8)} ${f(y + 3)}q8 -11 16 0" opacity="${(0.35 + 0.6 * Math.max(0, (300 - y) / 240) * (x < 300 ? 1 : 0.6)).toFixed(2)}"/>`;
    }
    // lớp màu 2.5D: gradient (không filter → rẻ khi vẽ lại 60 fps)
    const defs = `<defs>
<radialGradient id="${id}gf" cx=".42" cy=".38" r=".7"><stop offset="0" stop-color="${C.skinL}"/><stop offset=".55" stop-color="${C.skin}"/><stop offset="1" stop-color="${C.skinD}"/></radialGradient>
<radialGradient id="${id}gh" cx=".38" cy=".25" r=".75"><stop offset="0" stop-color="${C.hairL}"/><stop offset=".55" stop-color="${C.hair}"/></radialGradient>
<linearGradient id="${id}gj" x1="0" y1="0" x2=".9" y2="1"><stop offset="0" stop-color="${C.jkL}"/><stop offset=".4" stop-color="${C.jk}"/><stop offset="1" stop-color="${C.jkD}"/></linearGradient>
<linearGradient id="${id}gt" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.topL}"/><stop offset="1" stop-color="${C.top}"/></linearGradient>
<linearGradient id="${id}gn" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.skinD}"/><stop offset=".6" stop-color="${C.skin}"/></linearGradient>
<linearGradient id="${id}gk" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${C.skinL}"/><stop offset="1" stop-color="${C.skin}"/></linearGradient>
<radialGradient id="${id}gi" cx=".5" cy=".6" r=".55"><stop offset="0" stop-color="${C.irisL}"/><stop offset=".6" stop-color="${C.iris}"/><stop offset="1" stop-color="#1E0806"/></radialGradient>
<linearGradient id="${id}gw" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E9DCD8"/><stop offset=".35" stop-color="#fff"/></linearGradient>
<linearGradient id="${id}gb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.bandL}"/><stop offset="1" stop-color="${C.band}"/></linearGradient>
<radialGradient id="${id}gc" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="${C.blush}" stop-opacity=".9"/><stop offset="1" stop-color="${C.blush}" stop-opacity="0"/></radialGradient>
<radialGradient id="${id}gs" cx=".5" cy=".3" r=".6"><stop offset="0" stop-color="#2A0E0A" stop-opacity=".55"/><stop offset="1" stop-color="#2A0E0A" stop-opacity="0"/></radialGradient>
</defs>`;
    const eye = (i) => {
      const [x, y] = EYE[i];
      return `<g class="pe" transform="translate(${x} ${y})"><clipPath id="${id}c${i}"><path d="M-29 0C-24 -30 24 -30 29 0C24 28 -24 28 -29 0Z"/></clipPath>
<path d="M-29 0C-24 -30 24 -30 29 0C24 28 -24 28 -29 0Z" fill="${u('gw')}"/>
<g clip-path="url(#${id}c${i})"><g class="pi"><circle r="17" fill="${u('gi')}"/><circle r="17" fill="none" stroke="#1E0806" stroke-width="2"/><circle class="pp" r="8.5" fill="#000"/><circle cx="-6" cy="-7" r="5.5" fill="#fff"/><circle cx="6" cy="6" r="2.4" fill="#fff" opacity=".85"/></g>
<path class="plu" fill="${u('gf')}"/><path class="pll" fill="${C.skin}"/></g>
<path class="plash" fill="none" stroke="${C.ink}" stroke-width="5" stroke-linecap="round"/><path d="M${i ? 26 : -26} -6l${i ? 9 : -9} -7" stroke="${C.ink}" stroke-width="4" stroke-linecap="round"/>
<path d="M-22 18Q0 30 22 18" fill="none" stroke="${C.skinD}" stroke-width="2" opacity=".55"/></g>`;
    };
    const sk = `fill="${u('gk')}" stroke="${C.skinD}" stroke-width="2.5"`;
    const hand = (side) => `<g class="ph${side}"><g class="ph-open"><path d="M-17 2C-20 18 -20 30 -14 38L14 38C20 30 20 18 17 2Z" ${sk}/>${[-12, -4, 4, 12].map((x, k) => `<rect x="${x - 4.5}" y="30" width="9" height="${[22, 27, 26, 21][k]}" rx="4.5" ${sk}/>`).join('')}<rect x="-27" y="8" width="9" height="24" rx="4.5" transform="rotate(28 -22 10)" ${sk}/><path d="M-13 36H13" stroke="${C.skin}" stroke-width="6"/></g>
<g class="ph-side"><path d="M-11 0C-14 20 -14 44 -8 62C-4 68 6 68 8 60C12 44 12 20 11 0Z" ${sk}/><path d="M-11 14C-24 20 -24 32 -14 34" ${sk}/><path d="M-4 40V58M3 40V58" stroke="${C.skinD}" stroke-width="1.6" opacity=".6"/></g>
<g class="ph-point"><rect x="-4.5" y="26" width="10" height="44" rx="5" ${sk}/><path d="M-16 0C-19 14 -19 30 -12 38L12 38C18 30 18 14 15 0Z" ${sk}/><path d="M-14 30C-8 34 -2 34 2 30M-14 22C-8 26 0 26 4 22" stroke="${C.skinD}" stroke-width="1.8" fill="none"/><path d="M14 10C24 14 24 24 15 28" ${sk}/></g></g>`;
    const arm = side => `<g class="pa${side}"><path class="pao" fill="none" stroke="${C.jkD}" stroke-width="52" stroke-linecap="round" stroke-linejoin="round"/><path class="paf" fill="none" stroke="${C.jk}" stroke-width="45" stroke-linecap="round" stroke-linejoin="round"/><path class="pac" fill="none" stroke="${C.jkL}" stroke-width="5" stroke-linecap="round"/>${hand(side)}</g>`;
    return `<svg xmlns="${NS}" viewBox="0 0 480 640" class="pup" role="img" aria-label="${o.label || 'Ama'}" overflow="visible">${defs}
<g class="pbody">
<path d="M18 640C20 520 40 446 104 418C140 402 180 392 210 388H270C300 392 340 402 376 418C440 446 460 520 462 640Z" fill="${u('gj')}"/>
<path d="M204 388H276L296 640H184Z" fill="${u('gt')}"/>
<path d="M210 384L174 470L196 506L176 640H150L164 508L136 462L192 392Z" fill="${C.jkD}"/><path d="M270 384L306 470L284 506L304 640H330L316 508L344 462L288 392Z" fill="${C.jkD}"/>
<path d="M210 386L178 468L198 504M270 386L302 468L282 504" fill="none" stroke="${C.jkL}" stroke-width="3.5" stroke-linejoin="round"/>
<path d="M60 470C80 440 110 424 150 412" fill="none" stroke="${C.jkL}" stroke-width="6" stroke-linecap="round" opacity=".45"/>
<path d="M212 318V384Q240 408 268 384V318Z" fill="${u('gn')}"/><ellipse cx="240" cy="352" rx="40" ry="26" fill="${u('gs')}"/>
</g>
<g class="phead">
<g fill="${u('gh')}">${bumps}<ellipse cx="240" cy="214" rx="158" ry="140"/></g>
<g fill="none" stroke="${C.hairL}" stroke-width="3.2" stroke-linecap="round">${curls}</g>
<ellipse cx="152" cy="268" rx="15" ry="22" fill="${C.skin}"/><ellipse cx="328" cy="268" rx="15" ry="22" fill="${C.skinD}"/><path d="M156 258q-7 10 0 20M324 258q7 10 0 20" stroke="${C.skinD}" stroke-width="3" fill="none"/>
<circle cx="150" cy="292" r="7" fill="${C.gold}"/><circle cx="330" cy="292" r="7" fill="${C.gold}"/><circle cx="148" cy="290" r="2.2" fill="#fff" opacity=".8"/><circle cx="328" cy="290" r="2.2" fill="#fff" opacity=".7"/>
<path d="${FACE}" fill="${u('gf')}"/>
<ellipse cx="216" cy="214" rx="34" ry="14" fill="#fff" opacity=".07"/><path d="M243 292Q246 300 243 306" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".14" fill="none"/>
<path d="M150 236C156 178 196 154 240 154C284 154 324 178 330 236C318 206 290 194 268 192C258 200 250 202 240 200C230 202 220 200 212 192C190 194 162 206 150 236Z" fill="${u('gh')}"/>
<path d="M156 214C178 158 302 158 324 214" fill="none" stroke="${u('gb')}" stroke-width="18" stroke-linecap="round"/><path d="M168 196C194 162 286 162 312 196" fill="none" stroke="${C.bandL}" stroke-width="3.5" stroke-linecap="round" opacity=".9"/>
<ellipse class="pbl" cx="176" cy="312" rx="24" ry="13" fill="${u('gc')}"/><ellipse class="pbl" cx="304" cy="312" rx="24" ry="13" fill="${u('gc')}"/>
${eye(0)}${eye(1)}
<path class="pbr0" fill="none" stroke="${C.ink}" stroke-width="7.5" stroke-linecap="round"/><path class="pbr1" fill="none" stroke="${C.ink}" stroke-width="7.5" stroke-linecap="round"/>
<path d="M236 286Q231 302 236 309Q241 313 247 309" fill="none" stroke="${C.skinD}" stroke-width="3.2" stroke-linecap="round"/>
<g class="pm" transform="translate(${MOUTH[0]} ${MOUTH[1]})"><clipPath id="${id}m"><path class="pmc"/></clipPath>
<path class="pmlo" fill="${C.lipL}"/><path class="pmc" fill="${C.mouth}"/>
<g clip-path="url(#${id}m)"><ellipse class="pmt" rx="20" ry="11" fill="${C.tongue}"/><rect class="pmth" x="-40" y="-40" width="80" fill="#fff"/></g>
<path class="pml" fill="none" stroke="${C.lip}" stroke-linejoin="round" stroke-linecap="round"/></g>
</g>
${arm('L')}${arm('R')}
</svg>`;
  }

  // ================= trạng thái theo thời gian (THUẦN) =================
  // tl: { cues:[[t,'A'..'X']], expr:[[t,name]], gest:[[t,name]], seed, lead }  · o.still = giảm chuyển động (prefers-reduced-motion)
  // Chuỗi chuyển tiếp KHÔNG giật: mỗi đoạn bắt đầu từ giá trị THỰC lúc đó (kể cả khi đoạn trước chưa chuyển xong) → liên tục tuyệt đối, cổng qc.mjs đo độ dốc
  function chain(list, t, look, tr, keys) {
    let cur = look(null);
    for (let i = 0; i < list.length && list[i][0] <= t; i++) {
      const to = look(list[i][1]), end = i + 1 < list.length && list[i + 1][0] <= t ? list[i + 1][0] : t, k = ease((end - list[i][0]) / tr(i)), o = {};
      for (const p of keys) o[p] = lerp(cur[p], to[p], k);
      cur = o;
    }
    return cur;
  }
  const visTr = cues => i => clamp((i + 1 < cues.length ? cues[i + 1][0] - cues[i][0] : 0.2) * 0.55, 0.04, 0.08); // chuyển hình miệng 40–80 ms
  function visAt(cues, t, lead) {
    if (!cues || !cues.length) return Object.assign({}, VIS.X);
    return chain(cues, t + lead, v => VIS[v] || VIS.X, visTr(cues), MK);
  }
  const RK = MK.concat('shift').map(k => 'r_' + k), EXK = EK.concat(RK);
  const flatE = n => { const E = EXPR[n] || EXPR.neutral, r = Object.assign({}, VIS.X, { shift: 0 }, E.rest), o = {}; for (const k of EK) o[k] = E[k]; for (const k of RK) o[k] = r[k.slice(2)]; return o; };
  function exprAt(list, t) {
    const v = chain(list || [], t, n => flatE(n || 'neutral'), () => 0.28, EXK), out = { rest: {} };
    for (const k of EK) out[k] = v[k]; for (const k of RK) out.rest[k.slice(2)] = v[k];
    let i = -1; while (list && i < list.length - 1 && list[i + 1][0] <= t) i++;
    out.name = i >= 0 ? list[i][1] : 'neutral'; return out;
  }
  // Cử chỉ chồng nhau: cử chỉ mới XẾP HÀNG tới lúc cử chỉ trước bắt đầu thu tay (không gập khuỷu giữa chừng), bắt đầu từ tư thế THỰC lúc đó;
  // góc giữ trong (-180, 180] → cẳng tay không bao giờ quét qua hướng thẳng đứng-lên (nơi khuỷu gập ngược); xoay xa thì chậm lại (tỉ lệ góc)
  function schedule(gest) {
    const out = []; let end = -1e9;
    for (const [t0, name] of gest || []) { const G = GEST[name]; if (!G) continue; const s0 = Math.max(t0, end - 0.34); out.push([s0, name]); end = s0 + G.dur; }
    return out;
  }
  const lastAt = (gs, t, n) => { let i = n - 1; while (i >= 0 && gs[i][0] > t) i--; return i; };
  function armAt(gs, t, side, still, n = gs ? gs.length : 0) {
    const i = still || !gs ? -1 : lastAt(gs, t, n);
    if (i < 0) return Object.assign({}, REST);
    const base = armAt(gs, t, side, still, i), [t0, name] = gs[i], G = GEST[name], P = G[side];
    if (!P || t > t0 + G.dur) return base;
    const b0 = armAt(gs, t0, side, still, i).b, sl = Math.max(1, Math.abs(P.b - b0) / 150), so = Math.max(1, Math.abs(P.b - REST.b) / 150);
    const u = t - t0, kout = ease((t0 + G.dur - t) / (0.34 * so)), k = Math.min(ease(u / (0.32 * sl)), kout), ka = Math.min(ease(u / (0.2 * sl)), kout); // vai dẫn trước cẳng tay
    let pb = P.b, pbend = P.bend;
    if (G.clap) { const ph = clamp((u - 0.25) / (G.dur - 0.6), 0, 1), c = (1 + Math.cos(ph * Math.PI * 2 * G.clap)) / 2; pb = lerp(G.shut, P.b, c); } // vỗ tay: dao động cos mượt
    if (G.beat) { pb += Math.sin(u * 7.5) * G.beat[1] * k; pbend += Math.sin(u * 7.5 + 0.8) * 6 * k; }
    return { a: lerp(base.a, P.a, ka), b: lerp(base.b, pb, k), bend: lerp(base.bend, pbend, k), hand: k > 0.35 ? P.hand : base.hand };
  }
  function shrugAt(gs, t, n = gs ? gs.length : 0) {
    const i = gs ? lastAt(gs, t, n) : -1; if (i < 0) return 0;
    const base = shrugAt(gs, t, i), [t0, name] = gs[i], G = GEST[name]; if (t > t0 + G.dur) return base;
    return lerp(base, G.shrug || 0, Math.min(ease((t - t0) / 0.3), ease((t0 + G.dur - t) / 0.4)));
  }
  // chớp mắt & liếc: lịch cố định theo seed (cùng t → cùng hình ở app và video)
  function blinkAt(t, seed) {
    const slot = Math.floor(t / 3.2); let b = 0;
    for (let s = slot - 1; s <= slot; s++) {
      const r = hash(seed * 977 + s * 131), t0 = s * 3.2 + 0.4 + r * 2.4, d = t - t0;
      const one = d => (d < 0 || d > 0.15 ? 0 : d < 0.06 ? d / 0.06 : 1 - (d - 0.06) / 0.09);
      b = Math.max(b, one(d), hash(seed * 31 + s * 7) < 0.22 ? one(d - 0.22) : 0); // thỉnh thoảng chớp đôi
    }
    return b;
  }
  function gazeAt(t, seed) {
    const s = Math.floor(t / 1.1), r = k => hash(seed * 53 + s * 17 + k), r0 = k => hash(seed * 53 + (s - 1) * 17 + k);
    const tgt = [(r(1) - 0.5) * 7, (r(2) - 0.5) * 4], old = [(r0(1) - 0.5) * 7, (r0(2) - 0.5) * 4], k = ease((t - s * 1.1 - r(3) * 0.6) / 0.05);
    return [lerp(old[0], tgt[0], k), lerp(old[1], tgt[1], k)];
  }
  function talkW(cues, t) { // khoảng cách tới đoạn đang nói gần nhất → trọng số liên tục
    if (!cues) return 0; let d = 9;
    for (let i = 0; i < cues.length; i++) if (cues[i][1] !== 'X') { const a = cues[i][0], b = i + 1 < cues.length ? cues[i + 1][0] : a + 0.2; d = Math.min(d, t < a ? a - t : t > b ? t - b : 0); if (!d) break; }
    return ease(1 - d / 0.2);
  }
  function sample(tl, t, o = {}) {
    tl = tl || {}; const seed = tl.seed || 7, still = !!o.still; const gs = schedule(tl.gest);
    const v = Object.assign({}, visAt(tl.cues, t, tl.lead == null ? 0.03 : tl.lead)), e = exprAt(tl.expr, t);
    if (tl.jaw) { const J = tl.jaw, x = (t + (tl.lead || 0)) * J.hz, i = Math.floor(x), g0 = J.g[Math.max(0, Math.min(J.g.length - 1, i))], g1 = J.g[Math.max(0, Math.min(J.g.length - 1, i + 1))]; v.open = Math.min(1, v.open * lerp(g0, g1, x - i)); } // hàm theo năng lượng nguyên âm (video)
    const w = talkW(tl.cues, t), m = {}; // w: 0 = im (miệng theo biểu cảm) → 1 = đang nói (miệng theo viseme), chuyển mượt 0,2 s
    for (const p of MK) m[p] = lerp(e.rest[p], v[p], w);
    m.shift = e.rest.shift * (1 - 0.7 * w); m.smile = e.smile * (1 - 0.4 * w);
    const breath = still ? 0 : Math.sin(t * 2 * Math.PI / 3.8), sway = still ? 0 : Math.sin(t * 0.55 + 1.3) * 1.3 + Math.sin(t * 0.23) * 0.8;
    const bob = still ? 0 : (v.open * 2.2 + w * Math.sin(t * 9.5) * 0.6);
    const gz = still ? [0, 0] : gazeAt(t, seed);
    return {
      t, m, e, talk: w, vis: v, blink: blinkAt(t, seed), gaze: [e.gx + gz[0] * (1 - 0.5 * w), e.gy + gz[1] * (1 - 0.5 * w)],
      head: { tilt: e.tilt + sway, dy: breath * 1.6 + bob - e.chin * 0.2, chin: e.chin },
      body: { dy: breath * 2, sx: 1 + breath * 0.006 }, shrug: still ? 0 : shrugAt(gs, t),
      L: armAt(gs, t, 'L', still), R: armAt(gs, t, 'R', still),
    };
  }

  // ================= áp trạng thái vào DOM SVG =================
  function rig(svg) {
    const q = s => svg.querySelector(s), qa = s => Array.prototype.slice.call(svg.querySelectorAll(s));
    return { svg, body: q('.pbody'), head: q('.phead'), eyes: qa('.pe'), iris: qa('.pi'), pupil: qa('.pp'), lu: qa('.plu'), ll: qa('.pll'), lash: qa('.plash'), br: [q('.pbr0'), q('.pbr1')], blush: qa('.pbl'),
      mouth: q('.pm'), mc: qa('.pmc'), ml: q('.pml'), mlo: q('.pmlo'), mt: q('.pmt'), mth: q('.pmth'),
      arm: { L: armRig(q('.paL')), R: armRig(q('.paR')) } };
  }
  function armRig(gr) { return { o: gr.querySelector('.pao'), f: gr.querySelector('.paf'), c: gr.querySelector('.pac'), h: gr.querySelector('[class^=ph]'), hs: { open: gr.querySelector('.ph-open'), side: gr.querySelector('.ph-side'), point: gr.querySelector('.ph-point') } }; }
  const set = (el, k, v) => { if (el && el.__p !== k + v) { el.__p = k + v; el.setAttribute(k, v); } };
  function mouthPath(m) {
    const hw = 20 + 15 * m.wide - 9 * m.round - 3 * m.press, cy = -m.smile * 9, op = 25 * m.open * (1 - 0.6 * m.tuck);
    const uy = cy - 2.5 - op * 0.4 - m.round * op * 0.2 + m.press * 1.5, ly = cy + 2 + op * 1.05 + m.smile * 9 * (1 - m.press) * (1 - m.round);
    const k = 0.62 + m.round * 0.3, x = m.shift || 0;
    const d = `M${f(x - hw)} ${f(cy)}C${f(x - hw * k)} ${f(uy)} ${f(x + hw * k)} ${f(uy)} ${f(x + hw)} ${f(cy)}C${f(x + hw * k)} ${f(ly)} ${f(x - hw * k)} ${f(ly)} ${f(x - hw)} ${f(cy)}Z`;
    const mu = (cy + 3 * uy) / 4, ml = (cy + 3 * ly) / 4, lipT = 4.5 + 2 * m.round + 1.5 * m.press;
    const lo = `M${f(x - hw * 0.7)} ${f(ml + 1)}Q${f(x)} ${f(ml + 9 + 2 * m.round - 4 * m.tuck)} ${f(x + hw * 0.7)} ${f(ml + 1)}Q${f(x)} ${f(ml + 3)} ${f(x - hw * 0.7)} ${f(ml + 1)}Z`;
    return { d, lo, mu, ml, lipT, x, cy };
  }
  function lidPath(L, bottom) { // vùng mi: L 0 = mở, 1 = khép · bottom: mi dưới (squint)
    if (bottom) { const cy = 58 - 75 * L; return `M-32 40H32V2L29 2Q0 ${f(cy)} -29 2L-32 2Z`; }
    const cy = -46 + 50 * L; return `M-32 -40H32V0L29 0Q0 ${f(cy)} -29 0L-32 0Z`;
  }
  function armPts(s, side) { // khớp vai/khuỷu/cổ tay + tâm & bán kính bàn tay (tọa độ khung 480×640) – dùng cho vẽ và cổng qc
    const A = s[side], mir = side === 'L' ? -1 : 1, rad = Math.PI / 180, j = SH[side === 'L' ? 0 : 1];
    const S = [j[0], j[1] + s.body.dy - s.shrug], E = [S[0] + mir * L1 * Math.sin(A.a * rad), S[1] + L1 * Math.cos(A.a * rad)], W = [E[0] + mir * L2 * Math.sin(A.b * rad), E[1] + L2 * Math.cos(A.b * rad)];
    const hd = (A.b + A.bend) * rad, hl = (A.hand === 'point' ? 46 : 30) * HS;
    return { S, E, W, H: [W[0] + mir * hl * Math.sin(hd), W[1] + hl * Math.cos(hd)], hr: (A.hand === 'point' ? 22 : 26) * HS, a: A.a, b: A.b, hand: A.hand };
  }
  /** Hình học để kiểm (qc.mjs) và để bố cục video tránh tay/thân: đầu (biến đổi), miệng (tọa độ đầu), 2 tay */
  function geom(s) { const P = mouthPath(s.m), hw = 20 + 15 * s.m.wide - 9 * s.m.round - 3 * s.m.press; return { head: { dy: s.head.dy - s.shrug, tilt: s.head.tilt, pivot: NECK }, mouth: [[P.x - hw - P.lipT / 2, P.cy], [P.x + hw + P.lipT / 2, P.cy], [P.x, P.mu - P.lipT / 2], [P.x, P.ml + 10 + 2 * s.m.round], [P.x - hw * 0.7, P.ml + 4], [P.x + hw * 0.7, P.ml + 4]].map(([x, y]) => [MOUTH[0] + x, MOUTH[1] + y]), L: armPts(s, 'L'), R: armPts(s, 'R'), FACE, NOSE: [247, 313] }; }
  function apply(R, s) {
    const e = s.e, sh = s.shrug;
    set(R.body, 'transform', `translate(0 ${f(s.body.dy - sh * 0.4)}) translate(240 640) scale(${s.body.sx.toFixed(4)} 1) translate(-240 -640)`);
    set(R.head, 'transform', `translate(0 ${f(s.head.dy - sh)}) rotate(${f(s.head.tilt)} ${NECK[0]} ${NECK[1]})`);
    const wide = 1.08 + e.wide * 0.14;
    for (let i = 0; i < 2; i++) {
      const lid = clamp(Math.max(e.lid + (i && e.asym ? -0.08 : 0), s.blink), 0, 1), sq = clamp(e.squint * (1 - s.blink), 0, 1);
      set(R.eyes[i], 'transform', `translate(${EYE[i][0]} ${EYE[i][1]}) scale(${wide.toFixed(3)})`);
      set(R.iris[i], 'transform', `translate(${f(s.gaze[0])} ${f(s.gaze[1])})`);
      set(R.pupil[i], 'r', f(8.5 - e.wide * 3));
      set(R.lu[i], 'd', lidPath(lid)); set(R.ll[i], 'd', lidPath(sq * 0.6, 1));
      const cy = -46 + 50 * lid; set(R.lash[i], 'd', `M-29 0Q0 ${f(cy)} 29 0`);
      const [x] = EYE[i], dir = i ? 1 : -1, by = 224 - e.brow + (i ? -e.asym : 0) + lid * 4, inner = e.inner;
      set(R.br[i], 'd', `M${x - dir * 22} ${f(by + 4 - inner)}Q${x + dir * 2} ${f(by - 13 - inner * 0.3)} ${x + dir * 28} ${f(by + 3)}`);
    }
    for (const b of R.blush) set(b, 'opacity', (e.blush * 0.55).toFixed(2));
    const P = mouthPath(s.m);
    for (const c of R.mc) set(c, 'd', P.d);
    set(R.ml, 'd', P.d); set(R.ml, 'stroke-width', P.lipT.toFixed(1)); set(R.mlo, 'd', P.lo);
    set(R.mth, 'y', -40); set(R.mth, 'height', f(Math.max(0, 40 + P.mu + 9 * s.m.teeth)));
    set(R.mt, 'transform', `translate(${f(P.x)} ${f(P.ml - 3 - s.m.tongue * (P.ml - P.mu) * 0.55)})`);
    for (const side of ['L', 'R']) {
      const A = s[side], ar = R.arm[side], mir = side === 'L' ? -1 : 1, rad = Math.PI / 180, { S, E, W } = armPts(s, side);
      const d = `M${f(S[0])} ${f(S[1])}L${f(E[0])} ${f(E[1])}L${f(W[0])} ${f(W[1])}`;
      set(ar.o, 'd', d); set(ar.f, 'd', d);
      const cx = W[0] - mir * 18 * Math.sin(A.b * rad), cyy = W[1] - 18 * Math.cos(A.b * rad);
      set(ar.c, 'd', `M${f(cx - 14 * Math.cos(A.b * rad))} ${f(cyy + 14 * mir * Math.sin(A.b * rad))}L${f(cx + 14 * Math.cos(A.b * rad))} ${f(cyy - 14 * mir * Math.sin(A.b * rad))}`);
      set(ar.h, 'transform', `translate(${f(W[0])} ${f(W[1])}) rotate(${f(-mir * (A.b + A.bend))}) scale(${mir * HS} ${HS})`);
      for (const k in ar.hs) set(ar.hs[k], 'display', k === A.hand ? 'inline' : 'none');
    }
  }

  // ================= âm vị → viseme (Kokoro/espeak IPA hoặc ARPAbet) · chữ → viseme (dự phòng) =================
  const PH = [[/^(p|b|m)$/i, 'A'], [/^(f|v)$/i, 'G'], [/^(l|ɫ)$/i, 'H'], [/^(u|uː|ʊ|w|uw|uh|ow|oʊ|əʊ|oy|ɔɪ)$/i, 'F'], [/^(ɔ|ɔː|ɒ|ao|o|ɜ|ɜː|er|ɝ|ɚ|r|ɹ)$/i, 'E'],
    [/^(a|ɑ|ɑː|aa|æ|ae|aɪ|ay|aʊ|aw|ʌ|ah)$/i, 'D'], [/^(e|ɛ|eh|eɪ|ey|ə|ax|ɪ|ih|i|iː|iy)$/i, 'C'], [/./, 'B']];
  function fromPhonemes(list) { // [[t0, t1, ph]] → cues, khoảng lặng > 120 ms → X
    const cues = []; let end = 0;
    for (const [t0, t1, ph] of list) {
      if (t0 - end > 0.12 && cues.length) cues.push([+end.toFixed(3), 'X']);
      const v = (PH.find(([re]) => re.test(ph)) || [0, 'B'])[1];
      if (!cues.length || cues[cues.length - 1][1] !== v) cues.push([+t0.toFixed(3), v]); end = t1;
    }
    cues.push([+end.toFixed(3), 'X']); return cues;
  }
  function fromText(text, dur) { // chữ → viseme theo cụm (th sh ch oo ee …) + ngắt ở dấu câu; nhịp chia theo độ dài âm tiết
    const s = String(text || '').toLowerCase().replace(/[^a-z' ,.;:!?-]/g, ''), seq = [];
    const R = [[/^(ph|f|v)/, 'G'], [/^(th|sh|ch|j|s|z|c|k|g|t|d|n|y|h|x|q)/, 'B'], [/^(m|b|p)/, 'A'], [/^l/, 'H'], [/^(oo|ou|ow|w|u)/, 'F'], [/^(or|ar|er|ur|ir|o|r)/, 'E'], [/^(a)/, 'D'], [/^(ee|ea|e|i|y)/, 'C']];
    for (let i = 0; i < s.length;) {
      const ch = s[i];
      if (/[,.;:!?]/.test(ch)) { seq.push(['X', 2.2]); i++; continue; }
      if (ch === ' ' || ch === '-' || ch === "'") { i++; continue; }
      const r = R.find(([re]) => re.test(s.slice(i))), m = r ? s.slice(i).match(r[0])[0] : ch;
      const v = r ? r[1] : 'B', w = /[aeiou]/.test(m[0]) ? 1.3 : 0.75;
      if (seq.length && seq[seq.length - 1][0] === v) seq[seq.length - 1][1] += w * 0.5; else seq.push([v, w]);
      i += m.length;
    }
    const total = seq.reduce((a, x) => a + x[1], 0) || 1, D = dur || Math.max(0.6, s.length * 0.065); let t = 0; const cues = [];
    for (const [v, w] of seq) { cues.push([+t.toFixed(3), v]); t += w / total * D; }
    cues.push([+D.toFixed(3), 'X']); return cues;
  }

  // ================= giáo viên sống trong app =================
  const reduced = () => { try { return g.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
  /** mount(el, { who, still }) → { say(text, { cues, dur }), cue(kind, at?), expr(name), gesture(name), stop(), destroy() } – thời gian thực, 60 fps khi đang thấy */
  function mount(el, o = {}) {
    el.innerHTML = art({ label: o.label || 'Ama' });
    el.firstChild.style.cssText = 'width:100%;height:100%;display:block';
    const R = rig(el.firstChild), still = o.still != null ? o.still : reduced(), T0 = performance.now(), now = () => (performance.now() - T0) / 1000;
    const tl = { cues: [], expr: [[0, o.expr || 'neutral']], gest: [], seed: o.seed || 7 };
    let raf = 0, vis = true, dead = false, io = null;
    const frame = () => { raf = 0; if (dead) return; apply(R, sample(tl, now(), { still })); if (vis && !D.hidden) raf = requestAnimationFrame(frame); };
    const D = g.document, kick = () => { if (!raf && !dead && vis && !D.hidden) raf = requestAnimationFrame(frame); };
    const onVis = () => kick(); D.addEventListener('visibilitychange', onVis);
    if (g.IntersectionObserver) { io = new IntersectionObserver(es => { vis = es[es.length - 1].isIntersecting; kick(); }); io.observe(el); }
    apply(R, sample(tl, 0, { still })); kick();
    const prune = t => { tl.cues = tl.cues.filter(c => c[0] > t - 2); tl.gest = tl.gest.filter(x => x[0] > t - 4); if (tl.expr.length > 4) tl.expr = tl.expr.slice(-3); };
    const api = {
      el, rig: R, tl,
      say(text, s = {}) { const t = now() + (s.delay || 0); prune(t); const cues = s.cues || fromText(text, s.dur); tl.cues = tl.cues.filter(c => c[0] < t).concat(cues.map(c => [t + c[0], c[1]])); return cues[cues.length - 1][0]; },
      expr(name, at) { if (EXPR[name]) { tl.expr.push([now() + (at || 0), name]); } },
      gesture(name, at) { if (GEST[name]) tl.gest.push([now() + (at || 0), name]); },
      cue(kind, at) { const k = KIND[kind]; if (!k) return; if (k.expr) api.expr(k.expr, at); if (k.gest) api.gesture(k.gest, at); },
      stop() { const t = now(); tl.cues = tl.cues.filter(c => c[0] < t).concat([[t, 'X']]); },
      destroy() { dead = true; if (raf) cancelAnimationFrame(raf); if (io) io.disconnect(); D.removeEventListener('visibilitychange', onVis); el.innerHTML = ''; },
    };
    return api;
  }

  const api = { art, rig, sample, apply, geom, mount, fromPhonemes, fromText, VIS, EXPR, GEST, KIND };
  g.LexPuppet = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof self !== 'undefined' ? self : globalThis);
