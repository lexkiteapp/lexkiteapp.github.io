// Video ngắn 9:16 – toàn bộ motion graphics (docs/VIDEO-PIPELINE.md §10). Props = timeline (scripts/video/motion.mjs buildTimeline).
// Lớp (dưới → trên): cảnh [nền (DOF) + bóng + nhân vật (rim/light-wrap) + Kit] → grade chung (feComponentTransfer) + vignette + bloom
//   → chuyển cảnh (12 kiểu) → ngắt nhịp → thẻ payoff ❌/✅ → phụ đề động → hook 1,5 s → thanh tiến độ → watermark chữ → end card → grain.
import React, { useEffect, useState } from 'react';
import { AbsoluteFill, Img, OffthreadVideo, Loop, staticFile, useCurrentFrame, useVideoConfig, interpolate, spring, Easing, random, delayRender, continueRender } from 'remotion';
import { Sticker, PAL } from './Stickers.jsx';

const FONT_H = 'LexDisplay', FONT_B = 'LexBody';
const ease = Easing.bezier(0.65, 0, 0.35, 1);
const clamp01 = x => Math.max(0, Math.min(1, x));
const src = s => (/^(https?:|data:)/.test(s) ? s : staticFile(s));

function useFonts() {
  const [h] = useState(() => delayRender('fonts'));
  useEffect(() => {
    const faces = [new FontFace(FONT_H, `url(${staticFile('fonts/display.ttf')})`, { weight: '800' }), new FontFace(FONT_B, `url(${staticFile('fonts/body.ttf')})`, { weight: '800' })];
    Promise.all(faces.map(f => f.load().then(x => document.fonts.add(x)).catch(() => null))).then(() => continueRender(h));
  }, [h]);
}

// ---------- Grade ----------
const GRADES = {
  'day-warm': { r: [0.03, 0.27, 0.56, 0.84, 0.98], g: [0.07, 0.27, 0.53, 0.8, 0.95], b: [0.1, 0.27, 0.48, 0.72, 0.86], sat: 1.06, blur: 3, vignette: 0.38, rim: '#FFB054', bloom: 0.16 },
  night: { r: [0.02, 0.17, 0.42, 0.74, 0.97], g: [0.05, 0.22, 0.45, 0.72, 0.9], b: [0.12, 0.33, 0.55, 0.74, 0.8], sat: 0.96, blur: 4, vignette: 0.5, rim: '#FFC94A', bloom: 0.22 },
  studio: { r: [0.02, 0.26, 0.53, 0.8, 0.97], g: [0.04, 0.26, 0.52, 0.79, 0.96], b: [0.06, 0.27, 0.5, 0.76, 0.93], sat: 1.04, blur: 2, vignette: 0.32, rim: '#FFB054', bloom: 0.12 },
};
const GradeDefs = () => (
  <svg width="0" height="0" style={{ position: 'absolute' }}>
    <defs>
      {Object.entries(GRADES).map(([id, g]) => (
        <filter key={id} id={`grade-${id}`} colorInterpolationFilters="sRGB">
          <feComponentTransfer>
            <feFuncR type="table" tableValues={g.r.join(' ')} /><feFuncG type="table" tableValues={g.g.join(' ')} /><feFuncB type="table" tableValues={g.b.join(' ')} />
          </feComponentTransfer>
          <feColorMatrix type="saturate" values={String(g.sat)} />
        </filter>
      ))}
      <filter id="whip"><feGaussianBlur stdDeviation="28 0" /></filter>
    </defs>
  </svg>
);

// ---------- Chuyển cảnh: style cho cảnh RA (out) / VÀO (in) theo tiến độ p ----------
function trStyle(type, role, p, W, H, center) {
  const e = ease(clamp01(p)), out = role === 'out';
  switch (type) {
    case 'whip-pan': return out ? { transform: `translateX(${-e * W}px)`, filter: `blur(${Math.sin(e * Math.PI) * 18}px)` } : { transform: `translateX(${(1 - e) * W}px)`, filter: `blur(${Math.sin(e * Math.PI) * 18}px)` };
    case 'zoom-blur': return out ? { transform: `scale(${1 + e * 0.5})`, filter: `blur(${e * 16}px)` } : { opacity: clamp01(e * 1.6), transform: `scale(${1.35 - 0.35 * e})`, filter: `blur(${(1 - e) * 16}px)` };
    case 'swipe-mask': { const x = -0.35 * W + e * 1.7 * W; return out ? { transform: `translateX(${-e * 90}px)` } : { clipPath: `polygon(0 0, ${x + 0.35 * W}px 0, ${x}px ${H}px, 0 ${H}px)` }; }
    case 'circle-reveal': return out ? { transform: `scale(${1 + e * 0.08})` } : { clipPath: `circle(${e * Math.hypot(W, H)}px at ${center[0]}px ${center[1]}px)` };
    case 'glitch': { const j = (random(`g${Math.round(p * 20)}`) - 0.5) * 36 * Math.sin(p * Math.PI); return out ? { transform: `translateX(${j}px)`, opacity: p < 0.5 ? 1 : 0 } : { transform: `translateX(${-j}px)`, opacity: p >= 0.5 ? 1 : 0, filter: p < 0.75 ? 'saturate(1.6) hue-rotate(-12deg)' : 'none' }; }
    case 'page-flip': return out ? { transform: `perspective(2400px) rotateY(${-Math.min(1, e * 2) * 90}deg)`, transformOrigin: 'left center', opacity: e < 0.5 ? 1 : 0 } : { transform: `perspective(2400px) rotateY(${Math.max(0, 1 - (e - 0.5) * 2) * 90}deg)`, transformOrigin: 'right center', opacity: e >= 0.5 ? 1 : 0 };
    case 'slide-stack': return out ? { transform: `scale(${1 - 0.08 * e})`, filter: `brightness(${1 - 0.35 * e})` } : { transform: `translateY(${(1 - e) * H}px)`, borderRadius: 48 * (1 - e), boxShadow: '0 -30px 80px rgba(0,0,0,.45)', overflow: 'hidden' };
    case 'light-leak': return out ? {} : { opacity: e };
    case 'match-cut': return out ? { opacity: p < 0.5 ? 1 : 0 } : { opacity: p >= 0.5 ? 1 : 0, transform: `scale(${p >= 0.5 ? 1.1 - 0.1 * ease(clamp01((p - 0.5) * 2)) : 1.1})` };
    case 'split-screen': { const a = e < 0.5 ? ease(e * 2) * 50 : 50 + ease((e - 0.5) * 2) * 50; return out ? { transform: e < 0.5 ? `translateY(${-ease(e * 2) * H * 0.25}px)` : `translateY(${-H * 0.25}px)` } : { clipPath: `inset(${100 - a}% 0 0 0)` }; }
    case 'kit-fly': return out ? {} : { clipPath: `inset(0 ${(1 - e) * 100}% 0 0)` };
    case 'confetti-burst': return out ? {} : { opacity: clamp01(e * 2.2), transform: `scale(${1.06 - 0.06 * e})` };
    default: return out ? {} : { opacity: e };
  }
}
const TransitionFx = ({ cut, t, W, H, kit, accents }) => {
  const p = (t - cut.from) / cut.d; if (p < 0 || p > 1) return null; const e = ease(p);
  if (cut.type === 'swipe-mask') { const x = -0.35 * W + e * 1.7 * W; return <svg width={W} height={H} style={{ position: 'absolute' }}><polygon points={`${x + 0.35 * W},0 ${x + 0.35 * W + 70},0 ${x + 70},${H} ${x},${H}`} fill={accents[0]} /><polygon points={`${x + 0.35 * W + 70},0 ${x + 0.35 * W + 100},0 ${x + 100},${H} ${x + 70},${H}`} fill={accents[1]} /></svg>; }
  if (cut.type === 'light-leak') return <AbsoluteFill style={{ mixBlendMode: 'screen', opacity: Math.sin(p * Math.PI) * 0.85, background: `radial-gradient(60% 45% at ${20 + 60 * p}% 30%, #FFB054 0%, transparent 70%), radial-gradient(50% 40% at ${85 - 50 * p}% 75%, #FFC94A 0%, transparent 70%)` }} />;
  if (cut.type === 'match-cut') return <AbsoluteFill style={{ background: '#FFF7EA', opacity: Math.abs(p - 0.5) < 0.18 ? 0.5 : 0 }} />;
  if (cut.type === 'glitch') return <AbsoluteFill>{[0, 1, 2, 3, 4].map(i => <div key={i} style={{ position: 'absolute', left: 0, right: 0, top: random(`gy${i}${Math.round(p * 10)}`) * H, height: 10 + random(`gh${i}`) * 50, background: i % 2 ? accents[0] : '#0F3D3E', opacity: 0.35 * Math.sin(p * Math.PI), transform: `translateX(${(random(`gx${i}${Math.round(p * 10)}`) - 0.5) * 120}px)` }} />)}</AbsoluteFill>;
  if (cut.type === 'split-screen') { const a = e < 0.5 ? ease(e * 2) * 50 : 50 + ease((e - 0.5) * 2) * 50; return <div style={{ position: 'absolute', left: 0, right: 0, top: H * (1 - a / 100) - 6, height: 12, background: '#FFF7EA', boxShadow: '0 0 24px rgba(0,0,0,.35)' }} />; }
  if (cut.type === 'kit-fly') { const x = -500 + e * (W + 700); return kit ? <Img src={src(kit)} style={{ position: 'absolute', left: x, top: H * 0.38, width: 520, height: 520, transform: `rotate(${-14 + 18 * e}deg)`, filter: 'drop-shadow(0 20px 30px rgba(0,0,0,.35))' }} /> : null; }
  if (cut.type === 'confetti-burst') return <Confetti p={p} W={W} H={H} n={70} seed={`c${cut.i}`} />;
  if (cut.type === 'page-flip') return <AbsoluteFill style={{ background: 'linear-gradient(90deg, rgba(0,0,0,.35), transparent 30%)', opacity: Math.sin(p * Math.PI) }} />;
  return null;
};
const CONF = ['#E5502F', '#FFC94A', '#2FBF71', '#FFF7EA', '#FFB054'];
const Confetti = ({ p, W, H, n = 60, seed = 'c', cx = 0.5, cy = 0.45 }) => (
  <AbsoluteFill style={{ pointerEvents: 'none' }}>
    {Array.from({ length: n }, (_, i) => {
      const a = random(`${seed}a${i}`) * Math.PI * 2, v = 600 + random(`${seed}v${i}`) * 1100, x = W * cx + Math.cos(a) * v * p, y = H * cy + Math.sin(a) * v * p + 1600 * p * p, s = 14 + random(`${seed}s${i}`) * 18;
      return <div key={i} style={{ position: 'absolute', left: x, top: y, width: s, height: s * 0.55, background: CONF[i % CONF.length], borderRadius: i % 3 ? 3 : s, transform: `rotate(${p * 720 * (random(`${seed}r${i}`) - 0.5)}deg)`, opacity: 1 - p * 0.6 }} />;
    })}
  </AbsoluteFill>
);

// ---------- Cảnh ----------
// Khớp ánh sáng nhân vật ↔ phòng (round 2): cân trắng về màu trung bình của phòng (tint) + đèn chính ấm từ phía cửa sổ (light.dir:
// 1 = phải, −1 = trái) bằng feDiffuseLighting + fePointLight (sáng dần về phía cửa sổ, tối nhẹ phía kia) + viền sáng (rim) phía cửa sổ.
const ActorLight = ({ id, fx, w, h }) => {
  // Đèn chính = dải gradient ngang (feImage) hoà soft-light: phía cửa sổ ấm/sáng (~0,62), phía kia tối nhẹ (~0,40).
  // KHÔNG dùng feDiffuseLighting: dưới phần tử lật gương (scaleX −1) Chrome lật pháp tuyến → ánh sáng = 0 → nhân vật đỏ/tối (lỗi Carlos ¾ 17/10).
  const t = (fx && fx.tint) || [200, 190, 175], dir = (fx && fx.light && fx.light.dir) || -1, warm = (fx && fx.light && fx.light.warmth) || 0.1;
  const L = (t[0] + t[1] + t[2]) / 3 || 1, k = c => (1 + 0.22 * (c / L - 1)).toFixed(3), a = c => (0.035 * c / 255).toFixed(3);
  const key = [255, 236 - 40 * warm, 205 - 70 * warm], c = f => `rgb(${key.map(v => Math.round(v * f)).join(',')})`;
  const near = c(0.62), far = c(0.42), [c0, c1] = dir > 0 ? [far, near] : [near, far];
  const img = `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' preserveAspectRatio='none'><defs><linearGradient id='g' x1='0' x2='1' y1='0' y2='0'><stop offset='0' stop-color='${c0}'/><stop offset='1' stop-color='${c1}'/></linearGradient></defs><rect width='100' height='100' fill='url(#g)'/></svg>`)}`;
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }}>
      <filter id={id} x="0" y="0" width={w} height={h} filterUnits="userSpaceOnUse" primitiveUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
        <feColorMatrix in="SourceGraphic" type="matrix" values={`${k(t[0])} 0 0 0 ${a(t[0])}  0 ${k(t[1])} 0 0 ${a(t[1])}  0 0 ${k(t[2])} 0 ${a(t[2])}  0 0 0 1 0`} result="wb" />
        <feImage href={img} x="0" y="0" width={w} height={h} preserveAspectRatio="none" result="grad" />
        <feComposite in="grad" in2="SourceAlpha" operator="in" result="litIn" />
        <feBlend in="litIn" in2="wb" mode="soft-light" result="keyed" />
        <feComposite in="keyed" in2="SourceAlpha" operator="in" />
      </filter>
    </svg>
  );
};
const Actor = ({ a, rim, t0, fx, uid }) => {
  const k = a.h / (a.figH || a.ah || 1), w = (a.aw || 600) * k, h = (a.ah || 900) * k, fx0 = a.flip ? (a.aw - a.foot[0]) : a.foot[0];
  const left = a.x - fx0 * k, top = a.y - a.foot[1] * k, dir = (fx && fx.light && fx.light.dir) || a.light || -1;
  const media = a.kind === 'video'
    ? (a.seg // chỉ phát đoạn có hướng đúng (facingSegments), lặp đoạn đó
      ? <Loop durationInFrames={Math.max(1, Math.round((a.seg.to - a.seg.from) * 30))}><OffthreadVideo src={src(a.src)} transparent muted trimBefore={Math.round(a.seg.from * 30)} trimAfter={Math.round(a.seg.to * 30)} style={{ width: '100%', height: '100%' }} /></Loop>
      : <Loop durationInFrames={Math.max(1, Math.round((a.dur || 5) * 30))}><OffthreadVideo src={src(a.src)} transparent muted style={{ width: '100%', height: '100%' }} /></Loop>)
    : <Img src={src(a.src)} style={{ width: '100%', height: '100%' }} />;
  const ew = a.h * 0.42;
  return (
    <>
      <div style={{ position: 'absolute', left: a.x - ew / 2 - dir * a.h * 0.05, top: a.y - a.h * 0.03, width: ew, height: a.h * 0.06, borderRadius: '50%', background: 'radial-gradient(closest-side, rgba(20,16,14,.58), rgba(20,16,14,0))', filter: 'blur(5px)' }} />
      <ActorLight id={uid} fx={fx && a.flip && fx.light ? { ...fx, light: { ...fx.light, dir: -(fx.light.dir || -1) } } : fx} w={w} h={h} />
      <div style={{ position: 'absolute', left, top, width: w, height: h, filter: `drop-shadow(${dir * 4}px -2px 3px ${rim}99) drop-shadow(0 0 10px rgba(255,247,234,.18))` }}>
        {/* lật gương ở lớp NGOÀI, bộ lọc ánh sáng ở lớp TRONG (lọc trên ảnh chưa lật – lọc SVG trên phần tử scaleX(−1) làm lệch màu đỏ/tối);
            hướng đèn tính theo ảnh chưa lật */}
        <div style={{ width: '100%', height: '100%', transform: a.flip ? 'scaleX(-1)' : undefined }}><div style={{ width: '100%', height: '100%', filter: `url(#${uid})` }}>{media}</div></div>
      </div>
    </>
  );
};
// Nền studio (không có phòng): gradient thương hiệu + đèn spot kem sau nhân vật (tách chủ thể, tăng dải sáng) + đốm màu trôi (nhanh hơn trong 2 s hook)
const Studio = ({ colors, t }) => {
  const v = t < 2.2 ? 1.6 : 0.6, light = colors.text === '#14100E';
  return (
    <AbsoluteFill style={{ background: `radial-gradient(120% 70% at 50% 18%, ${colors.bg[1]} 0%, ${colors.bg[0]} 62%, ${light ? '#FFE7C2' : '#0B2627'} 100%)` }}>
      <AbsoluteFill style={{ background: `radial-gradient(38% 26% at ${30 + 14 * Math.sin(t * v)}% ${24 + 4 * Math.cos(t * v)}%, ${colors.accents[1]}55, transparent 70%), radial-gradient(42% 28% at ${72 - 12 * Math.sin(t * v * 0.8)}% 72%, ${colors.accents[0]}48, transparent 70%)` }} />
      <div style={{ position: 'absolute', left: '50%', top: 640, width: 1100, height: 1300, marginLeft: -550, borderRadius: '50%', background: 'radial-gradient(closest-side, rgba(255,231,194,.42), rgba(255,231,194,.12) 55%, rgba(255,231,194,0))' }} />
      <div style={{ position: 'absolute', left: '50%', top: 1560, width: 1300, height: 360, marginLeft: -650, borderRadius: '50%', background: 'radial-gradient(closest-side, rgba(255,247,234,.26), rgba(255,247,234,0))' }} />
    </AbsoluteFill>
  );
};
// Máy kiểu phim: shot.cam (motion.shotCamera) = vùng cắt từ canvas, đẩy máy chậm from → to; punch/rung/nghiêng nhân quanh tâm khung.
function filmCamera(shot, t, W, H, interrupts) {
  const len = Math.max(0.1, shot.end - shot.start), u = clamp01((t - shot.start) / len), e = u * u * (3 - 2 * u), A = shot.cam.from, B = shot.cam.to;
  const z = A.z + (B.z - A.z) * e, cx = A.cx + (B.cx - A.cx) * e, cy = A.cy + (B.cy - A.cy) * e;
  let m = 1, rot = 0, sx = 0, sy = 0;
  if (shot.punch) { const d = t - shot.start, amp = shot.start === 0 ? 0.14 : 0.08; if (d >= 0 && d < 0.6) m *= 1 + amp * Math.exp(-d * 7) * (d < 0.05 ? d / 0.05 : 1); }
  for (const it of interrupts) { const d = t - it.t; if (d >= 0 && d < 0.5) { if (it.kind === 'punch') m *= 1 + 0.05 * Math.exp(-d * 8); if (it.kind === 'tilt') rot += 1.6 * Math.exp(-d * 6) * (it.side === 'left' ? -1 : 1); } }
  if (shot.shake) { const d = t - shot.start; if (d >= 0 && d < 0.45) { const a = 10 * (1 - d / 0.45); sx = (random(`sx${Math.round(d * 30)}`) - 0.5) * 2 * a; sy = (random(`sy${Math.round(d * 30)}`) - 0.5) * 2 * a; } }
  const Z = z * m;
  return { transform: `translate(${W / 2 + sx}px, ${H / 2 + sy}px) rotate(${rot}deg) scale(${Z}) translate(${-cx}px, ${-cy}px)`, transformOrigin: '0 0', center: [W / 2, H / 2] };
}
function camera(shot, t, W, H, interrupts) {
  if (shot.cam) return filmCamera(shot, t, W, H, interrupts);
  const sp = (shot.actors || []).find(a => a.role === 'speaker') || (shot.actors || [])[0];
  const ax = sp ? sp.x : W / 2, ay = sp ? sp.y - sp.h * 0.62 : H * 0.45, top = sp ? sp.y - sp.h * 1.04 : 0;
  const zMax = sp ? Math.max(1, Math.min(1.35, (ay - 250) / Math.max(1, ay - top))) : 1.3; // khung cận vẫn giữ đủ đầu (đỉnh đầu ≥ 250 px)
  const len = Math.max(0.1, shot.end - shot.start), u = clamp01((t - shot.start) / len);
  let z = 1, tx = 0, rot = 0;
  if (shot.framing === 'close') z = Math.min(1.25, zMax);
  else if (shot.framing === 'push') z = 1 + (Math.min(1.16, zMax) - 1) * ease(u);
  else if (shot.framing === 'dolly') z = Math.min(1.14, zMax) - (Math.min(1.14, zMax) - 1) * ease(u);
  else if (shot.framing === 'pan') { z = 1.08; tx = interpolate(u, [0, 1], [-40, 40]); }
  if (shot.start === 0) z *= 1 + 0.07 * ease(clamp01(t / 2.2)); // hook: đẩy máy liên tục 2 s đầu (năng lượng chuyển động)
  // punch-in đầu cảnh (hook / câu "đắt"): giật vào rồi lắng
  if (shot.punch) { const d = t - shot.start; if (d >= 0 && d < 0.6) z *= 1 + 0.14 * Math.exp(-d * 7) * (d < 0.05 ? d / 0.05 : 1); }
  for (const it of interrupts) { const d = t - it.t; if (d >= 0 && d < 0.5) { if (it.kind === 'punch') z *= 1 + 0.09 * Math.exp(-d * 8); if (it.kind === 'tilt') rot += 2.2 * Math.exp(-d * 6) * (it.side === 'left' ? -1 : 1); } }
  let sx = 0, sy = 0;
  if (shot.shake) { const d = t - shot.start; if (d >= 0 && d < 0.45) { const a = 16 * (1 - d / 0.45); sx = (random(`sx${Math.round(d * 30)}`) - 0.5) * 2 * a; sy = (random(`sy${Math.round(d * 30)}`) - 0.5) * 2 * a; } }
  return { transform: `translate(${tx + sx}px, ${sy}px) rotate(${rot}deg) scale(${z})`, transformOrigin: `${ax}px ${ay}px`, center: [ax, ay] };
}
const ShotLayer = ({ shot, t, W, H, inCut, outCut, theme, interrupts, cardEnd }) => {
  const g = GRADES[shot.grade] || GRADES.studio, cam = camera(shot, t, W, H, interrupts);
  let st = {};
  if (inCut && t < inCut.to) st = trStyle(inCut.type, 'in', (t - inCut.from) / inCut.d, W, H, cam.center);
  if (outCut && t > outCut.from) st = { ...st, ...trStyle(outCut.type, 'out', (t - outCut.from) / outCut.d, W, H, cam.center) };
  if (shot.framing === 'card') return <AbsoluteFill style={st}><EndCard t={t} start={shot.start} theme={theme} {...cardEnd} W={W} H={H} /></AbsoluteFill>;
  const stage = (
    <AbsoluteFill style={{ transform: cam.transform, transformOrigin: cam.transformOrigin }}>
      {shot.room ? <Img src={src(shot.room)} style={{ position: 'absolute', width: W, height: H, objectFit: 'cover', filter: `blur(${g.blur}px)`, transform: 'scale(1.03)' }} /> : <Studio colors={theme.colors} t={t} />}
      {shot.room ? ((shot.roomFx && shot.roomFx.maskText) || []).map((r, i) => <RoomPatch key={'m' + i} srcImg={shot.room} r={r} W={W} H={H} blur={14} />) : null}
      {(shot.actors || []).map((a, i) => (
        <React.Fragment key={i}>
          <Actor a={a} rim={g.rim} fx={shot.roomFx} uid={`al-${shot.k}-${i}`} />
          {a.behind === 'counter' && shot.roomFx && shot.roomFx.counter ? <RoomPatch srcImg={shot.room} r={[shot.roomFx.counter.x0, shot.roomFx.counter.top, shot.roomFx.counter.x1, shot.roomFx.counter.base]} W={W} H={H} blur={g.blur} /> : null}
        </React.Fragment>
      ))}
    </AbsoluteFill>
  );
  return (
    <AbsoluteFill style={{ overflow: 'hidden', ...st }}>
      <AbsoluteFill style={{ filter: `url(#grade-${shot.grade})` }}>{stage}</AbsoluteFill>
      {shot.room ? <AbsoluteFill style={{ mixBlendMode: 'screen', opacity: g.bloom }}><Img src={src(shot.room)} style={{ width: W, height: H, objectFit: 'cover', filter: 'blur(28px) brightness(1.15) contrast(1.4)' }} /></AbsoluteFill> : null}
      <AbsoluteFill style={{ background: `radial-gradient(ellipse 75% 62% at 50% 46%, transparent 55%, rgba(8,24,25,${g.vignette}) 100%)` }} />
    </AbsoluteFill>
  );
};

// Mảnh phòng đặt lại đúng chỗ (cùng biến đổi với nền): làm mờ chữ bảng phấn (maskText) / che chân nhân viên sau quầy (counter)
const RoomPatch = ({ srcImg, r, W, H, blur }) => {
  const d = (v, c) => c + (v - c) * 1.03, x0 = d(r[0], W / 2), y0 = d(r[1], H / 2), x1 = d(r[2], W / 2), y1 = d(r[3], H / 2); // toạ độ ảnh phòng → khung (nền phóng 1,03 quanh tâm)
  return (
    <div style={{ position: 'absolute', inset: 0, clipPath: `inset(${y0}px ${W - x1}px ${H - y1}px ${x0}px round ${blur > 6 ? 16 : 0}px)` }}>
      <Img src={src(srcImg)} style={{ position: 'absolute', width: W, height: H, objectFit: 'cover', transform: 'scale(1.03)', filter: `blur(${blur}px)` }} />
    </div>
  );
};
// Kit (linh vật) – lớp riêng: bật lò xo sau khi chuyển cảnh vào xong, thu nhỏ trước chuyển cảnh ra (không mờ theo cảnh)
const KitLayer = ({ kits, t, fps, W }) => kits.map((k, i) => {
  if (t < k.start || t > k.end) return null;
  const s = spring({ frame: (t - k.start) * fps, fps, config: { damping: 11, stiffness: 180 } }), o = clamp01((k.end - t) / 0.2);
  return <Img key={i} src={src(k.src)} style={{ position: 'absolute', width: 320, height: 320, left: W - 470, top: 250 + 12 * Math.sin(t * 4), transform: `scale(${s * (0.6 + 0.4 * o)})`, opacity: o, filter: 'drop-shadow(0 24px 30px rgba(0,0,0,.35))' }} />;
});

// ---------- Chữ ----------
const stroke = (px, c = '#14100E') => ({ WebkitTextStroke: `${px}px ${c}`, paintOrder: 'stroke fill' });
const KeyBox = ({ children, rot = -2 }) => (
  <span style={{ display: 'inline-block', background: '#FFC94A', color: '#14100E', padding: '2px 20px 6px', borderRadius: 18, transform: `rotate(${rot}deg)`, boxShadow: '8px 8px 0 #E5502F', WebkitTextStroke: 0 }}>{children}</span>
);
const Captions = ({ pages, t, fps, theme, W, H, hidden }) => {
  const pg = pages.find(p => t >= p.start && t < p.end); if (!pg || hidden) return null;
  const style = theme.caption, y = (pg.y != null ? pg.y : theme.layout.capY) * H, big = style === 'mega-word' ? 150 : style === 'karaoke-bar' ? 70 : 92;
  const words = pg.words.map((w, i) => {
    const d = t - w.pop; if (d < 0 && style !== 'karaoke-bar') return null;
    const s = style === 'karaoke-bar' ? 1 : spring({ frame: Math.max(0, d) * fps, fps, config: { damping: 9, stiffness: 220, mass: 0.6 }, from: 0.35, to: 1 });
    const active = t >= w.start && t < w.end + 0.06, said = t >= w.start;
    const txt = style === 'bounce-outline' || style === 'mega-word' ? w.w.toUpperCase() : w.w;
    const color = style === 'karaoke-bar' ? (said ? '#FFC94A' : 'rgba(255,255,255,.88)') : active && !w.key ? '#FFC94A' : '#FFFFFF';
    const lift = style === 'bounce-outline' && active ? -14 : 0;
    const el = w.key ? <KeyBox rot={i % 2 ? 2 : -2}>{txt}</KeyBox> : txt;
    return <span key={i} style={{ display: 'inline-block', margin: '0 12px', transform: `translateY(${lift}px) scale(${s * (active && style !== 'karaoke-bar' ? 1.06 : 1)})`, color }}>{el}</span>;
  });
  const box = style === 'karaoke-bar' ? { background: 'rgba(20,16,14,.74)', borderRadius: 34, padding: '22px 30px' } : {};
  const rows = []; let k0 = 0; for (const n of (pg.breaks || [words.length])) { rows.push(words.slice(k0, k0 + n)); k0 += n; } // xuống dòng đã tính sẵn (motion.breakLines)
  return (
    <div style={{ position: 'absolute', left: 60, right: 140, top: y, display: 'flex', justifyContent: 'center', transform: 'translateY(-50%)' }}>
      <div style={{ fontFamily: FONT_H, fontWeight: 800, fontSize: big, lineHeight: 1.12, textAlign: 'center', letterSpacing: -1, ...(style === 'karaoke-bar' ? {} : stroke(style === 'mega-word' ? 16 : 12)), textShadow: '0 8px 24px rgba(0,0,0,.35)', ...box }}>{rows.map((r, i) => <div key={i} style={{ whiteSpace: 'nowrap' }}>{r}</div>)}</div>
    </div>
  );
};
const Badge = ({ children, bg = '#E5502F', fg = '#FFFFFF', s = 1, rot = -3 }) => (
  <div style={{ display: 'inline-block', background: bg, color: fg, fontFamily: FONT_B, fontWeight: 800, fontSize: 46, letterSpacing: 2, padding: '12px 30px', borderRadius: 999, transform: `rotate(${rot}deg) scale(${s})`, boxShadow: '0 10px 30px rgba(0,0,0,.3)' }}>{children}</div>
);
const HookLayer = ({ hook, t, fps, theme, W, H }) => {
  if (t > hook.end + 0.3) return null;
  const out = clamp01((t - hook.end) / 0.3), f = t * fps, y = theme.layout.hookY * H, acc = theme.colors.accents;
  const pop = d => spring({ frame: Math.max(0, f - d * fps), fps, config: { damping: 15, stiffness: 260, mass: 0.6 } }); // ít vượt đà để chữ hook không chồng nhau
  const ws = String(hook.text).toUpperCase().split(/\s+/);
  const typeOn = ['secret', 'story-cold-open', 'pov'].includes(hook.pattern);
  const slam = spring({ frame: f, fps, config: { damping: 8, stiffness: 300 }, from: 2.4, to: 1 });
  const P = hook.pattern;
  // badge chữ đậm: cam/trắng (tương phản ≥ 4.5 với chữ mực trên vàng; trắng trên cam dùng cỡ lớn ≥ 3:1)
  const badgeBg = ['stop-saying', 'mistake-stat', 'myth-buster'].includes(P) ? '#E5502F' : P === 'versus' ? '#0F3D3E' : '#FFC94A';
  const badgeFg = badgeBg === '#FFC94A' ? '#14100E' : '#FFFFFF';
  const sticker = <Sticker name={hook.sticker} size={120} style={{ transform: `scale(${pop(0.25)}) rotate(${P === 'question' ? Math.sin(t * 9) * 10 : -8}deg)` }} />;
  return (
    <AbsoluteFill style={{ opacity: 1 - out, transform: `translateY(${-out * 60}px)` }}>
      {P === 'story-cold-open' ? <><div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 130 * pop(0), background: '#14100E' }} /><div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 130 * pop(0), background: '#14100E' }} /></> : null}
      <div style={{ position: 'absolute', left: 60, right: 140, top: y, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 26 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          {sticker}
          <div style={{ transform: `scale(${['myth-buster', 'stop-saying', 'mistake-stat'].includes(P) ? slam : pop(0)})` }}><Badge bg={badgeBg} fg={badgeFg}>{hook.badge}</Badge></div>
          {P === 'quiz-timer' || P === 'challenge' ? <Ring p={clamp01(t / Math.max(1, hook.end))} n={Math.max(1, 3 - Math.floor(t / Math.max(0.5, hook.end / 3)))} /> : null}
          {P === 'versus' ? <div style={{ fontFamily: FONT_H, fontSize: 96, color: '#FFC94A', ...stroke(10), transform: `scale(${slam})` }}>VS</div> : null}
          {P === 'countdown-list' ? <div style={{ fontFamily: FONT_H, fontSize: 130, color: '#FFC94A', ...stroke(12), transform: `scale(${pop(0.15)}) rotate(-6deg)` }}>3</div> : null}
        </div>
        <div style={{ fontFamily: FONT_H, fontWeight: 800, fontSize: ws.join(' ').length > 22 ? 84 : 100, lineHeight: 1.04, textAlign: 'center', color: '#FFFFFF', ...stroke(14), textShadow: '0 10px 30px rgba(0,0,0,.4)', position: 'relative' }}>
          {ws.map((x, i) => { const d = typeOn ? i * 0.12 : 0.08 + i * 0.07, s = pop(d), on = t >= d; return <span key={i} style={{ display: 'inline-block', margin: '0 14px', opacity: on ? 1 : 0, transform: typeOn ? 'none' : `translateY(${(1 - s) * 40}px) scale(${0.6 + 0.4 * s})`, color: i === ws.length - 1 ? '#FFC94A' : '#FFFFFF' }}>{x}</span>; })}
          {P === 'stop-saying' ? <div style={{ position: 'absolute', left: '6%', top: '52%', height: 14, width: `${88 * clamp01((t - 0.55) / 0.3)}%`, background: '#E5502F', borderRadius: 8, transform: 'rotate(-4deg)', WebkitTextStroke: 0 }} /> : null}
        </div>
        {P === 'wait-for-it' ? <Badge bg="#0F3D3E" fg="#FFF7EA" rot={2}>WAIT FOR IT{'.'.repeat(1 + (Math.floor(t * 5) % 3))}</Badge> : null}
      </div>
    </AbsoluteFill>
  );
};
const Ring = ({ p, n }) => (
  <svg width="120" height="120" viewBox="0 0 100 100"><circle cx="50" cy="50" r="42" fill="#14100E" opacity=".75" /><circle cx="50" cy="50" r="42" fill="none" stroke="#FFC94A" strokeWidth="9" strokeDasharray={`${264 * (1 - p)} 264`} transform="rotate(-90 50 50)" strokeLinecap="round" /><text x="50" y="66" textAnchor="middle" fontSize="46" fontWeight="900" fill="#FFF7EA" fontFamily={FONT_H}>{n}</text></svg>
);

// ---------- Thẻ payoff ----------
const Card = ({ c, t, fps, theme, W, H }) => {
  if (t < c.start || t > c.end + 0.3) return null;
  const f = (t - c.start) * fps, s = spring({ frame: f, fps, config: { damping: 11, stiffness: 200 } }), out = clamp01((t - c.end) / 0.3);
  const dont = c.kind === 'dont', y = theme.layout.cardY * H;
  const shake = dont && f < 10 ? Math.sin(f * 2.2) * 14 * (1 - f / 10) : 0;
  const flip = c.style === 'flip-card' && !dont ? interpolate(f, [0, 10], [90, 0], { extrapolateRight: 'clamp' }) : 0;
  const blur = c.style === 'answer-reveal' && !dont ? interpolate(f, [0, 12], [18, 0], { extrapolateRight: 'clamp' }) : 0;
  const x = dont ? interpolate(s, [0, 1], [-W, 0]) : 0;
  const head = dont ? 'cross' : c.style === 'tip-card' ? 'bulb' : c.style === 'meter' ? 'star' : 'check';
  const accent = dont ? '#E5502F' : '#2FBF71';
  return (
    <div style={{ position: 'absolute', left: 70, right: 150, top: y, transform: `translateX(${x + shake}px) scale(${dont ? 1 : 0.6 + 0.4 * s}) perspective(1600px) rotateY(${flip}deg)`, opacity: 1 - out, filter: blur ? `blur(${blur}px)` : undefined }}>
      <div style={{ background: '#FFF7EA', borderRadius: 40, padding: '30px 36px 34px', boxShadow: `0 18px 0 ${accent}, 0 30px 60px rgba(0,0,0,.35)`, display: 'flex', alignItems: 'center', gap: 28, border: `6px solid ${accent}` }}>
        <Sticker name={head} size={130} />
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: FONT_B, fontWeight: 800, fontSize: 36, letterSpacing: 3, color: dont ? '#B83A1F' : '#17595A' }}>{c.label}</div>
          <div style={{ fontFamily: FONT_H, fontWeight: 800, fontSize: String(c.text).length > 18 ? 64 : 82, lineHeight: 1.05, color: '#14100E', textDecoration: dont ? 'line-through' : 'none', textDecorationColor: '#E5502F', textDecorationThickness: 10 }}>{c.text}</div>
          {c.style === 'meter' && !dont ? <div style={{ marginTop: 14, height: 22, borderRadius: 11, background: '#FFE7C2' }}><div style={{ height: '100%', width: `${100 * clamp01(f / 20)}%`, borderRadius: 11, background: 'linear-gradient(90deg,#E5502F,#FFC94A,#2FBF71)' }} /></div> : null}
        </div>
      </div>
      {c.style === 'stamp-correct' && !dont ? <div style={{ position: 'absolute', right: -10, top: -60, transform: `rotate(12deg) scale(${spring({ frame: f - 6, fps, from: 2.2, to: 1, config: { damping: 9 } })})`, border: '8px solid #2FBF71', color: '#2FBF71', fontFamily: FONT_H, fontSize: 64, padding: '4px 22px', borderRadius: 16, background: '#FFF7EA' }}>CORRECT</div> : null}
      {!dont && f < 24 ? <Confetti p={f / 24} W={W - 220} H={420} n={26} seed={`k${c.start}`} cx={0.5} cy={0.3} /> : null}
    </div>
  );
};

// ---------- Overlay cố định ----------
const Progress = ({ t, pr, W }) => (t > pr.end ? null : <div style={{ position: 'absolute', left: 0, top: 0, height: 12, width: W * clamp01((t - pr.start) / (pr.end - pr.start)), background: 'linear-gradient(90deg,#E5502F,#FFB054,#FFC94A)', borderRadius: '0 6px 6px 0', boxShadow: '0 0 16px rgba(255,176,84,.6)' }} />);
const Watermark = ({ wm, t }) => {
  const o = wm.opacity * clamp01((t - wm.from) / wm.fade) * (1 - clamp01((t - wm.until + 0.3) / 0.3));
  if (o <= 0) return null;
  return (
    <div style={{ position: 'absolute', left: wm.x, top: wm.y, height: wm.h, display: 'flex', alignItems: 'center', gap: 10, opacity: o, filter: 'drop-shadow(0 2px 6px rgba(0,0,0,.45))' }}>
      <Img src={staticFile('mark-mono.svg')} style={{ height: wm.h * 0.95, width: wm.h * 0.95 }} />
      <span style={{ fontFamily: FONT_H, fontWeight: 800, fontSize: wm.h * 0.92, color: '#FFFFFF', letterSpacing: -1, lineHeight: 1 }}>lexkite</span>
    </div>
  );
};
const EndCard = ({ t, start, theme, W, H, url, cta, kit }) => {
  const f = (t - start) * 30, s = spring({ frame: f, fps: 30, config: { damping: 10 } });
  return (
    <AbsoluteFill style={{ background: 'radial-gradient(110% 70% at 50% 30%, #17595A 0%, #0F3D3E 60%, #0B2627 100%)', alignItems: 'center', justifyContent: 'center' }}>
      <AbsoluteFill style={{ background: 'radial-gradient(45% 30% at 50% 38%, rgba(255,176,84,.35), transparent 70%)' }} />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 40, transform: `scale(${0.7 + 0.3 * s})`, marginTop: -160 }}>
        {kit ? <Img src={src(kit)} style={{ width: 360, height: 360, transform: `translateY(${-Math.abs(Math.sin(t * 5)) * 26}px)` }} /> : null}
        <Img src={staticFile('logo-dark.svg')} style={{ width: 640 }} />
        <div style={{ fontFamily: FONT_H, fontWeight: 800, fontSize: 72, color: '#FFF7EA' }}>{cta}</div>
        <div style={{ fontFamily: FONT_H, fontWeight: 800, fontSize: 84, color: '#14100E', background: '#FFC94A', padding: '10px 44px', borderRadius: 999, boxShadow: '0 12px 0 #E5502F' }}>{url}</div>
      </div>
      {f < 30 ? <Confetti p={f / 30} W={W} H={H} n={60} seed="end" cy={0.35} /> : null}
    </AbsoluteFill>
  );
};
const Grain = ({ frame, W, H }) => (
  <svg width={W} height={H} style={{ position: 'absolute', inset: 0, opacity: 0.07, mixBlendMode: 'overlay', pointerEvents: 'none' }}>
    <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={frame % 9} stitchTiles="stitch" /><feColorMatrix type="saturate" values="0" /></filter>
    <rect width="100%" height="100%" filter="url(#grain)" />
  </svg>
);
const Interrupts = ({ list, t, fps }) => list.map((it, i) => {
  const d = t - it.t; if (d < 0 || d > 1.1) return null;
  if (it.kind === 'flash') return d < 0.12 ? <AbsoluteFill key={i} style={{ background: '#FFF7EA', opacity: 0.38 * (1 - d / 0.12) }} /> : null;
  if (it.kind !== 'sticker') return null;
  const s = spring({ frame: d * fps, fps, config: { damping: 8, stiffness: 260 } }), o = 1 - clamp01((d - 0.85) / 0.25);
  return <div key={i} style={{ position: 'absolute', top: 760, [it.side]: it.side === 'right' ? 170 : 80, opacity: o, transform: `scale(${s}) rotate(${it.side === 'left' ? -12 : 12}deg)` }}><Sticker name={it.sticker} size={180} /></div>;
});

export const Short = (P) => {
  useFonts();
  const frame = useCurrentFrame(), { fps, width: W, height: H } = useVideoConfig(), t = frame / fps;
  const cuts = P.cuts || [], shots = P.shots || [];
  const vis = shots.map((sh, k) => {
    const inCut = cuts.find(c => c.i === k - 1), outCut = cuts.find(c => c.i === k);
    const a = inCut ? inCut.from : sh.start, b = outCut ? outCut.to : sh.end;
    return t >= a && t < b ? { sh, inCut, outCut } : null;
  }).filter(Boolean);
  const cut = cuts.find(c => t >= c.from && t <= c.to), kitArt = (P.endCard && P.endCard.kit) || null, inCard = P.endCard && t >= P.endCard.start;
  return (
    <AbsoluteFill style={{ background: '#0F3D3E', fontFamily: FONT_H }}>
      <GradeDefs />
      {vis.map(({ sh, inCut, outCut }) => <ShotLayer key={sh.k} shot={sh} t={t} W={W} H={H} inCut={inCut} outCut={outCut} theme={P.theme} interrupts={P.interrupts || []} cardEnd={P.endCard} />)}
      {!inCard ? <KitLayer kits={P.kits || []} t={t} fps={fps} W={W} /> : null}
      {cut ? <TransitionFx cut={cut} t={t} W={W} H={H} kit={kitArt} accents={P.theme.colors.accents} /> : null}
      {!inCard ? <Interrupts list={P.interrupts || []} t={t} fps={fps} /> : null}
      {!inCard ? (P.cards || []).map((c, i) => <Card key={i} c={c} t={t} fps={fps} theme={P.theme} W={W} H={H} />) : null}
      {!inCard ? <Captions pages={P.pages || []} t={t} fps={fps} theme={P.theme} W={W} H={H} /> : null}
      <HookLayer hook={P.hook} t={t} fps={fps} theme={P.theme} W={W} H={H} />
      <Progress t={t} pr={P.progress} W={W} />
      <Watermark wm={P.watermark} t={t} />
      {P.grain ? <Grain frame={frame} W={W} H={H} /> : null}
    </AbsoluteFill>
  );
};
