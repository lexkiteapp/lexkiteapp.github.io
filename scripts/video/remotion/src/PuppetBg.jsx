// 🎭 So sánh NỀN cho con rối 2D Ama (docs/LESSON-ENGINE.md §4b) – CÙNG câu, CÙNG tư thế (props.json của scripts/puppet/sample.mjs, đoạn seg=[s,e]).
// bg='old' : phòng cũ (media.lexkite.com/library/rooms/cafe-01, lật ngang → cửa sổ trên-trái = hướng sáng con rối), làm mờ mạnh + chỉnh màu teal/ấm, bóng tiếp xúc.
// bg='new' : cảnh 2.5D vẽ bằng SVG trong code (0 ảnh, $0), 3 lớp thị sai (xa/giữa/gần), sáng trên-trái, bóng đổ xuống-phải lên tường + bàn trước ngực.
// Không đụng PuppetSample/Teacher; chỉ dùng động cơ puppet.js (sample/apply) như nhau.
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AbsoluteFill, Audio, Img, staticFile, useCurrentFrame, useVideoConfig, interpolate, delayRender, continueRender } from 'remotion';
import Pup from '../../../../web/js/lesson/puppet.js';

const FONT_B = 'LexBody';
function useFont() {
  const [h] = useState(() => delayRender('font'));
  useEffect(() => {
    new FontFace(FONT_B, `url(${staticFile('fonts/body.ttf')})`, { weight: '800' }).load().then(x => document.fonts.add(x)).catch(() => null).then(() => continueRender(h));
  }, [h]);
}

// Bóng con rối: sáng trên-trái → bóng xuống-phải. 'old' = phòng sâu → bóng tường yếu, mềm; 'new' = tường gần → bóng rõ hơn.
const SHADOW = {
  old: 'drop-shadow(14px 18px 22px rgba(20,14,8,.5))',
  new: 'drop-shadow(14px 16px 10px rgba(30,40,38,.32)) drop-shadow(54px 40px 26px rgba(40,52,48,.42))',
};
function Puppet({ tl, t, style, bg }) {
  const box = useRef(null), rig = useRef(null);
  useLayoutEffect(() => { box.current.innerHTML = Pup.art({ id: 'pb', label: 'Ama' }); box.current.firstChild.style.cssText = 'width:100%;height:100%;display:block;overflow:visible'; rig.current = Pup.rig(box.current.firstChild); }, []);
  useLayoutEffect(() => { if (rig.current) Pup.apply(rig.current, Pup.sample(tl, t)); });
  return <div ref={box} style={{ ...style, filter: SHADOW[bg] }} />;
}

// ---- (a) phòng cũ: mờ (độ sâu trường ảnh), giảm bão hoà, kéo về bảng màu con rối (teal tối + ấm trên-trái), vignette, AO đáy
function OldRoom() {
  return (
    <AbsoluteFill>
      <Img src={staticFile('rooms/cafe.webp')} style={{ position: 'absolute', inset: -120, width: 1320, height: 2160, objectFit: 'cover', transform: 'scaleX(-1)',
        filter: 'blur(16px) saturate(.75) brightness(1.02) contrast(.85) sepia(.18)' }} />
      <AbsoluteFill style={{ background: 'linear-gradient(160deg, #F7C27C 0%, #E8B98A 35%, #0A8F98 80%, #05343A 100%)', mixBlendMode: 'soft-light', opacity: 0.6 }} />
      <AbsoluteFill style={{ background: 'radial-gradient(80% 55% at 10% 10%, #FFD9A0cc 0%, #FFD9A000 70%)', mixBlendMode: 'screen' }} />
      <AbsoluteFill style={{ background: 'radial-gradient(120% 90% at 40% 35%, #0000 60%, #061a1d99 100%)' }} />
      <AbsoluteFill style={{ background: 'linear-gradient(180deg, #0000 70%, #1a0f08a0 100%)' }} />
    </AbsoluteFill>
  );
}

// ---- (b) cảnh 2.5D SVG: tường + cửa sổ trên-trái (xa) · bảng + kệ + cây (giữa) · mép bàn (gần, trước ngực con rối)
function Far({ dx, dy }) {
  return (
    <svg viewBox="0 0 1080 1920" width={1160} height={2062} style={{ position: 'absolute', left: -40 + dx, top: -70 + dy, filter: 'blur(3px)' }}>
      <defs>
        <linearGradient id="wall" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F4E3C6" /><stop offset=".55" stop-color="#D9D3BE" /><stop offset="1" stop-color="#8FB3AE" /></linearGradient>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFF4DC" /><stop offset="1" stop-color="#BFE6E0" /></linearGradient>
        <linearGradient id="shaft" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFE7B8" stop-opacity=".5" /><stop offset="1" stop-color="#FFE7B8" stop-opacity="0" /></linearGradient>
        <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#B9875A" /><stop offset="1" stop-color="#7A5236" /></linearGradient>
      </defs>
      <rect width="1080" height="1920" fill="url(#wall)" />
      <rect x="0" y="1560" width="1080" height="360" fill="url(#floor)" />
      <rect x="0" y="1548" width="1080" height="18" fill="#6E4A31" />
      {/* cửa sổ trên-trái: nguồn sáng của cả cảnh */}
      <rect x="48" y="150" width="380" height="560" rx="10" fill="#E9D7B8" />
      <rect x="70" y="172" width="336" height="516" fill="url(#sky)" />
      <path d="M238 172V688M70 430H406" stroke="#E9D7B8" strokeWidth="14" />
      <rect x="40" y="700" width="400" height="26" rx="6" fill="#D8C29D" />
      <rect x="40" y="722" width="400" height="10" fill="#0002" />
      {/* vệt nắng chéo xuống-phải */}
      <path d="M70 172L406 172L1080 980L1080 1560L640 1560Z" fill="url(#shaft)" />
    </svg>
  );
}
function Mid({ dx, dy }) {
  return (
    <svg viewBox="0 0 1080 1920" width={1140} height={2027} style={{ position: 'absolute', left: -30 + dx, top: -55 + dy, filter: 'blur(1.6px)' }}>
      <defs>
        <linearGradient id="board" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2E7C74" /><stop offset="1" stop-color="#174A47" /></linearGradient>
        <linearGradient id="frame" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#D9A86E" /><stop offset="1" stop-color="#8A5D38" /></linearGradient>
        <linearGradient id="leaf" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6FB58A" /><stop offset="1" stop-color="#1F5A45" /></linearGradient>
        <linearGradient id="pot" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#F08A7E" /><stop offset="1" stop-color="#A9473F" /></linearGradient>
        <filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="16" /></filter>
      </defs>
      {/* bảng: bóng đổ xuống-phải lên tường, khung sáng trên-trái */}
      <rect x="610" y="430" width="440" height="520" rx="14" fill="#2a3a36" opacity=".35" filter="url(#soft)" transform="translate(26 30)" />
      <rect x="600" y="420" width="440" height="520" rx="14" fill="url(#frame)" />
      <rect x="622" y="442" width="396" height="476" rx="6" fill="url(#board)" />
      <path d="M660 520q60 -26 120 0t120 0M660 600q90 -20 180 4M660 680h120" stroke="#E8F3EE" strokeOpacity=".28" strokeWidth="7" fill="none" strokeLinecap="round" />
      <rect x="610" y="936" width="420" height="16" rx="4" fill="#8A5D38" />
      {/* kệ sách trái */}
      <rect x="40" y="980" width="260" height="20" fill="#8A5D38" />
      <rect x="40" y="996" width="260" height="10" fill="#0003" />
      {[[56, '#E8AE2E'], [86, '#0A8F98'], [116, '#D85F57'], [146, '#46C6CB'], [176, '#E8AE2E']].map(([x, c], i) => (
        <rect key={i} x={x} y={872 + (i % 2) * 14} width="26" height={108 - (i % 2) * 14} rx="3" fill={c} />
      ))}
      <rect x="208" y="930" width="78" height="50" rx="6" fill="#F4E3C6" />
      {/* cây trong chậu phải, bóng xuống-phải */}
      <ellipse cx="930" cy="1556" rx="120" ry="20" fill="#3b2a1e" opacity=".45" filter="url(#soft)" transform="translate(24 6)" />
      <path d="M860 1400h140l-18 156h-104Z" fill="url(#pot)" />
      {[[-60, -230], [-10, -290], [40, -240], [80, -170], [-90, -150]].map(([x, y], i) => (
        <path key={i} d={`M930 1400Q${930 + x * 0.3} ${1400 + y * 0.5} ${930 + x} ${1400 + y}Q${930 + x * 0.9} ${1400 + y * 0.3} 930 1400Z`} fill="url(#leaf)" />
      ))}
    </svg>
  );
}
function Near({ dx, dy }) {
  return (
    <svg viewBox="0 0 1080 1920" width={1200} height={2133} style={{ position: 'absolute', left: -60 + dx, top: -106 + dy }}>
      <defs>
        <linearGradient id="desk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E2B27A" /><stop offset=".25" stop-color="#C08A55" /><stop offset="1" stop-color="#7A5236" /></linearGradient>
        <linearGradient id="deskTop" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#F3CC94" /><stop offset="1" stop-color="#C79460" /></linearGradient>
        <filter id="sh" x="-10%" y="-50%" width="120%" height="200%"><feGaussianBlur stdDeviation="14" /></filter>
        <filter id="dof"><feGaussianBlur stdDeviation="6" /></filter>
      </defs>
      {/* mặt bàn + bóng thân con rối đổ lên mặt bàn (lệch phải theo hướng sáng) */}
      <path d="M0 1760H1080V1920H0Z" fill="url(#deskTop)" />
      <ellipse cx="600" cy="1772" rx="430" ry="34" fill="#3a2414" opacity=".55" filter="url(#sh)" />
      <rect x="0" y="1806" width="1080" height="114" fill="url(#desk)" />
      <rect x="0" y="1800" width="1080" height="8" fill="#FFE2B0" opacity=".55" />
      {/* cốc trước ống kính (gần → mờ) */}
      <g filter="url(#dof)"><rect x="40" y="1640" width="120" height="150" rx="18" fill="#0A8F98" /><rect x="40" y="1640" width="40" height="150" rx="14" fill="#46C6CB" opacity=".6" /><path d="M160 1680q46 6 40 44t-40 40" stroke="#05555C" strokeWidth="16" fill="none" /></g>
    </svg>
  );
}

function Captions({ lines, words, t }) {
  const li = lines.findIndex(l => t >= l.start - 0.2 && t <= l.end + 0.35);
  if (li < 0) return null;
  const ws = words.filter(w => w.line === li), L = lines[li];
  const items = ws.length ? ws : L.text.split(/\s+/).map(w => ({ w, start: L.start, end: L.end }));
  const k = interpolate(t, [L.start - 0.2, L.start], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <div style={{ position: 'absolute', left: 70, right: 70, top: 300, minHeight: 190, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: k }}>
      <div style={{ font: `800 62px/1.25 ${FONT_B}`, color: '#F4F1EA', textAlign: 'center', textShadow: '0 4px 14px #000c', background: '#10191Bb8', borderRadius: 36, padding: '22px 34px' }}>
        {items.map((w, i) => <span key={i} style={{ color: t >= w.start && t < w.end + 0.08 ? '#F5A031' : '#F4F1EA' }}>{w.w}{' '}</span>)}
      </div>
    </div>
  );
}

export const metaBg = ({ props }) => {
  const [s, e] = props.seg || [0, 10];
  return { durationInFrames: Math.max(1, Math.round((e - s) * 30)), fps: 30, width: 1080, height: 1920 };
};

export const PuppetBg = props => {
  useFont();
  const f = useCurrentFrame(), { fps } = useVideoConfig(), s = (props.seg || [0])[0], t = s + f / fps, bg = props.bg || 'new';
  // máy quay trôi nhẹ → thị sai 3 lớp (xa 0.25 · giữa 0.55 · con rối 0.8 · gần 1.2)
  const cx = 18 * Math.sin((2 * Math.PI * t) / 9), cy = 7 * Math.sin((2 * Math.PI * t) / 7);
  const pup = { position: 'absolute', left: 60, top: 640, width: 960, height: 1280 };
  return (
    <AbsoluteFill style={{ background: '#10191B', overflow: 'hidden' }}>
      {bg === 'old' ? <OldRoom /> : <><Far dx={cx * 0.25} dy={cy * 0.25} /><Mid dx={cx * 0.55} dy={cy * 0.55} /></>}
      <Puppet tl={props.tl || {}} t={t} bg={bg} style={bg === 'old' ? pup : { ...pup, transform: `translate(${cx * 0.8}px, ${cy * 0.8}px)` }} />
      {bg === 'new' ? <Near dx={cx * 1.2} dy={cy * 1.2} /> : null}
      <Captions lines={props.lines || []} words={props.words || []} t={t} />
      {props.audio ? <Audio src={staticFile(props.audio)} startFrom={Math.round(s * fps)} /> : null}
    </AbsoluteFill>
  );
};
