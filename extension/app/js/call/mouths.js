/* 👄 LipMouth – 9 hình miệng VẼ (vector, có tham số) cho giáo viên 2D Ama/Carlos, thay miệng cắt-dán từ clip (anh chủ chê 31/10).
 * Hình theo Rhubarb: X nghỉ · A M/B/P môi mím · B răng khép (K S T EE) · C mở (EH AE) · D mở rộng (AA) · E tròn nhẹ (AO ER) · F chu môi (UW OW W) · G F/V răng trên chạm môi dưới · H L lưỡi chạm răng trên.
 * Mỗi hình = bộ số (rộng, mở trên/dưới, tròn, cười, răng, lưỡi) → svg(). Trộn 2 hình = nội suy bộ số (morph mượt, không chồng mờ 2 ảnh) → cùng kiểu lớp miệng Rive (input số = viseme).
 * Nét theo đúng nhân vật: phẳng, không viền ngoài; Ama môi nâu đỏ đậm + nét miệng tối; Carlos nét đen + lòng miệng nâu, ria mép vẽ đè lên trên (lớp mặt giữ ria).
 * Thuần (không DOM): chạy cả trình duyệt lẫn Node (scripts/lipsync/mouth-board.mjs dựng bảng duyệt). docs/specs/call-lipsync.md. */
(function (g) {
  // w: nửa bề ngang (×STYLE.hw) · u/d: mở lên/xuống (×hw) · a: mũ dạng (1 = góc nhọn hình lá, .5 = bầu dục) · s: cười (góc miệng nhếch) · tt/tb: răng trên/dưới (phần lòng miệng) · tg: lưỡi · tu: lưỡi cong lên chạm răng trên · bite: răng trên đè môi dưới (F/V) · lip: dày môi (×)
  const SHAPE = {
    X: { w: 1, u: 0, d: 0, a: 1, s: .55, tt: 0, tb: 0, tg: 0, tu: 0, bite: 0, lip: 1 },
    A: { w: .9, u: 0, d: 0, a: 1, s: .06, tt: 0, tb: 0, tg: 0, tu: 0, bite: 0, lip: 1.35 },
    B: { w: 1, u: .14, d: .17, a: .9, s: .2, tt: .5, tb: .5, tg: 0, tu: 0, bite: 0, lip: 1 },
    C: { w: .94, u: .2, d: .36, a: .75, s: .1, tt: .3, tb: 0, tg: .35, tu: 0, bite: 0, lip: 1 },
    D: { w: 1, u: .26, d: .62, a: .7, s: .08, tt: .2, tb: 0, tg: .45, tu: 0, bite: 0, lip: 1 },
    E: { w: .72, u: .22, d: .4, a: .55, s: 0, tt: .22, tb: 0, tg: .35, tu: 0, bite: 0, lip: 1.1 },
    F: { w: .44, u: .17, d: .24, a: .5, s: 0, tt: 0, tb: 0, tg: .2, tu: 0, bite: 0, lip: 1.45 },
    G: { w: .86, u: .13, d: .05, a: .85, s: .08, tt: 1, tb: 0, tg: 0, tu: 0, bite: 1, lip: 1.25 },
    H: { w: .9, u: .2, d: .36, a: .75, s: .08, tt: .25, tb: 0, tg: .42, tu: 1, bite: 0, lip: 1 }
  };
  // hw = nửa bề ngang miệng ở poster-2x (px) · up = tỉ lệ mở lên (Carlos: ria che môi trên → mở chủ yếu xuống) · line = nét miệng (Ama: nét chỉ khi khép; Carlos: luôn có)
  const STYLE = {
    ama: { hw: 50, up: 1, lipU: 6, lipD: 10, lip: '#6B1912', lipHi: '#83261C', line: '#2B0907', lw: 3.6, inner: '#3A0B09', teeth: '#FBF6EF', tongue: '#E8909A', tongueSh: '#C9707C', outline: false },
    carlos: { hw: 46, up: .35, lipU: 0, lipD: 12, lip: '#AA5706', lipHi: '#B8640E', line: '#0A0503', lw: 4, inner: '#5A2108', teeth: '#FBF6EF', tongue: '#DE7B6C', tongueSh: '#BF5F52', outline: true }
  };
  const lerp = (a, b, k) => a + (b - a) * k;
  const mix = (A, B, k) => { const p = SHAPE[A] || A, q = SHAPE[B] || B, o = {}; for (const key in p) o[key] = lerp(p[key], q[key], k); return o; };
  const f = n => Math.round(n * 10) / 10;
  const N = 24; // điểm mỗi cung (đủ mượt ở 2×)
  // cung y(x) dọc bề ngang: e(x) = (1-(x/hw)^2)^a · sm(x) = độ nhếch góc theo x² (cười: góc lên)
  function curve(hw, amp, a, smile, sign) {
    const pts = [];
    for (let i = 0; i <= N; i++) { const x = -hw + 2 * hw * i / N, r = x / hw, e = Math.pow(Math.max(0, 1 - r * r), a);
      pts.push([x, sign * amp * e - smile * hw * (r * r - .35)]); }
    return pts;
  }
  const path = (pts, close) => 'M' + pts.map(p => f(p[0]) + ' ' + f(p[1])).join('L') + (close ? 'Z' : '');
  // Trả về <g> (gốc tọa độ = tâm miệng). p: tên hình hoặc bộ số (đã trộn). id: tiền tố clipPath (duy nhất trong trang).
  function svg(who, p, id = 'm') {
    const S = STYLE[who] || STYLE.ama; p = SHAPE[p] || p;
    const hw = S.hw * p.w, sm = p.s * .32, upK = S.up, open = p.u + p.d > .02;
    const top = curve(hw, p.u * S.hw * upK, p.a, sm, -1), bot = curve(hw, (p.d + p.u * (1 - upK)) * S.hw, p.a, sm, 1); // phần mở bị ria che (Carlos) dồn xuống dưới
    const lipD = S.lipD * p.lip, lipU = S.lipU * p.lip;
    // môi: viền ngoài nở theo cung mở + dày môi, góc khép lại ở 2 mép
    const ow = hw + 3 * p.lip;
    const outTop = curve(ow, p.u * S.hw * upK + lipU, Math.min(p.a, .8), sm, -1), outBot = curve(ow, p.d * S.hw + lipD, Math.min(p.a, .8), sm, 1);
    const out = [];
    if (!open) {
      // khép: nét miệng + môi dưới (Ama) / chỉ nét (Carlos); A = mím → thêm dải môi trên
      const ln = curve(hw, 0, 1, sm, 1);
      const lower = path(ln.concat(curve(hw * .86, lipD, .6, sm, 1).reverse()), true);
      if (S.lipD) out.push(`<path d="${lower}" fill="${S.lip}"/>`);
      if (lipU && p.lip > 1.2) out.push(`<path d="${path(ln.concat(curve(hw * .86, lipU, .6, sm, -1).reverse()), true)}" fill="${S.lipHi}"/>`);
      out.push(`<path d="${path(ln)}" fill="none" stroke="${S.line}" stroke-width="${S.lw * (p.lip > 1.2 ? 1.25 : 1)}" stroke-linecap="round" stroke-linejoin="round"/>`);
      if (S.outline && S.lipD) out.push(`<path d="${path(curve(hw * .86, lipD, .6, sm, 1))}" fill="none" stroke="${S.line}" stroke-width="${S.lw}" stroke-linecap="round"/>`);
      return `<g class="lk-mouth">${out.join('')}</g>`;
    }
    const hole = path(top.concat(bot.slice().reverse()), true);
    const ytop = Math.min(...top.map(q => q[1])), ybot = Math.max(...bot.map(q => q[1])), H = ybot - ytop;
    if ((lipU || lipD) && !S.outline) out.push(`<path d="${path(outTop.concat(outBot.slice().reverse()), true)}" fill="${S.lip}"/>`);
    out.push(`<clipPath id="${id}-c"><path d="${hole}"/></clipPath><path d="${hole}" fill="${S.inner}"/><g clip-path="url(#${id}-c)">`);
    if (p.tg > .01) { // lưỡi: bầu dục từ đáy, tu → cong lên chạm răng trên (âm L)
      const tw = hw * .62, th = H * p.tg, cy = ybot - th / 2 + 2 - p.tu * H * .18;
      out.push(`<ellipse cx="0" cy="${f(cy + th * .25)}" rx="${f(tw)}" ry="${f(th * .8 + p.tu * H * .2)}" fill="${S.tongueSh}"/>`,
        `<ellipse cx="0" cy="${f(cy + th * .35)}" rx="${f(tw * .88)}" ry="${f(th * .7 + p.tu * H * .16)}" fill="${S.tongue}"/>`);
    }
    if (p.tt > .01) out.push(`<rect x="${f(-hw)}" y="${f(ytop - 2)}" width="${f(2 * hw)}" height="${f(2 + Math.max(2.5, H * (p.bite ? 1.1 : p.tt * .55)))}" fill="${S.teeth}"/>`);
    if (p.tb > .01) out.push(`<rect x="${f(-hw)}" y="${f(ybot - Math.max(2.5, H * p.tb * .55))}" width="${f(2 * hw)}" height="${f(H)}" fill="${S.teeth}"/>`);
    out.push('</g>');
    if (p.bite > .01) { // F/V: mép răng trên đè lên môi dưới
      const bw = hw * .66, by = ybot + 3 * p.bite;
      out.push(`<path d="M${f(-bw)} ${f(ytop + 1)}L${f(bw)} ${f(ytop + 1)}L${f(bw * .94)} ${f(by - 2)}Q0 ${f(by + 2.5)} ${f(-bw * .94)} ${f(by - 2)}Z" fill="${S.teeth}"/>`);
    }
    if (S.outline) out.push(`<path d="${hole}" fill="none" stroke="${S.line}" stroke-width="${S.lw}" stroke-linejoin="round"/>`);
    else out.push(`<path d="${path(top)}" fill="none" stroke="${S.line}" stroke-width="${S.lw * .7}" stroke-linecap="round" opacity=".55"/>`);
    return `<g class="lk-mouth">${out.join('')}</g>`;
  }
  const api = { SHAPE, STYLE, mix, svg, SHAPES: Object.keys(SHAPE) };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else g.LipMouth = api;
})(typeof window !== 'undefined' ? window : globalThis);
