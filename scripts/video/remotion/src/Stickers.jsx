// Bộ sticker SVG do Lexkite tự vẽ (không dùng emoji/sticker có bản quyền) – màu chỉ lấy từ bảng màu brand (docs/BRAND-RULES.md).
import React from 'react';

const C = { teal: '#0F3D3E', teal2: '#17595A', orange: '#E5502F', amber: '#FFB054', yellow: '#FFC94A', cream: '#FFF7EA', ink: '#14100E', green: '#2FBF71', pink: '#FF8FA3' };
const disc = (fill, children, ring = C.cream) => (<><circle cx="50" cy="50" r="44" fill={fill} stroke={ring} strokeWidth="7" />{children}</>);
const PATHS = {
  cross: disc(C.orange, <path d="M33 33 L67 67 M67 33 L33 67" stroke={C.cream} strokeWidth="12" strokeLinecap="round" />),
  check: disc(C.green, <path d="M29 52 L44 66 L72 36" stroke={C.cream} strokeWidth="12" fill="none" strokeLinecap="round" strokeLinejoin="round" />),
  star: <path d="M50 6 L62 37 L95 38 L69 58 L79 91 L50 72 L21 91 L31 58 L5 38 L38 37 Z" fill={C.yellow} stroke={C.ink} strokeWidth="5" strokeLinejoin="round" />,
  bulb: (<><circle cx="50" cy="42" r="28" fill={C.yellow} stroke={C.ink} strokeWidth="5" /><rect x="38" y="66" width="24" height="16" rx="4" fill={C.cream} stroke={C.ink} strokeWidth="5" /><path d="M42 44 q8 -12 16 0" stroke={C.ink} strokeWidth="4" fill="none" strokeLinecap="round" /><path d="M50 4 v6 M14 16 l5 5 M86 16 l-5 5" stroke={C.amber} strokeWidth="5" strokeLinecap="round" /></>),
  question: disc(C.teal, <text x="50" y="68" textAnchor="middle" fontSize="54" fontWeight="900" fill={C.yellow} fontFamily="Bricolage">?</text>, C.yellow),
  exclaim: disc(C.yellow, <><rect x="44" y="24" width="12" height="34" rx="6" fill={C.ink} /><circle cx="50" cy="71" r="7" fill={C.ink} /></>, C.ink),
  fire: <path d="M50 6 C60 26 80 34 78 62 C76 84 62 94 50 94 C36 94 22 84 22 64 C22 46 36 40 38 24 C46 34 46 42 52 46 C56 34 54 20 50 6 Z" fill={C.orange} stroke={C.ink} strokeWidth="5" strokeLinejoin="round" />,
  heart: <path d="M50 88 C20 66 8 50 8 34 C8 20 18 10 31 10 C40 10 46 15 50 22 C54 15 60 10 69 10 C82 10 92 20 92 34 C92 50 80 66 50 88 Z" fill={C.pink} stroke={C.ink} strokeWidth="5" />,
  arrow: <path d="M10 42 H60 V24 L92 50 L60 76 V58 H10 Z" fill={C.yellow} stroke={C.ink} strokeWidth="5" strokeLinejoin="round" />,
  sparkle: <path d="M50 4 C54 34 66 46 96 50 C66 54 54 66 50 96 C46 66 34 54 4 50 C34 46 46 34 50 4 Z" fill={C.yellow} stroke={C.ink} strokeWidth="4" strokeLinejoin="round" />,
  clock: disc(C.cream, <><path d="M50 22 V50 L68 60" stroke={C.ink} strokeWidth="8" fill="none" strokeLinecap="round" /><circle cx="50" cy="50" r="5" fill={C.orange} /></>, C.ink),
  lock: (<><path d="M30 44 V32 C30 18 40 10 50 10 C60 10 70 18 70 32 V44" stroke={C.ink} strokeWidth="9" fill="none" /><rect x="20" y="42" width="60" height="48" rx="10" fill={C.yellow} stroke={C.ink} strokeWidth="5" /><circle cx="50" cy="62" r="7" fill={C.ink} /><rect x="47" y="64" width="6" height="14" rx="3" fill={C.ink} /></>),
};
export const Sticker = ({ name, size = 160, style }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" style={{ overflow: 'visible', filter: 'drop-shadow(0 8px 14px rgba(20,16,14,.35))', ...style }}>{PATHS[name] || PATHS.sparkle}</svg>
);
export const PAL = C;
