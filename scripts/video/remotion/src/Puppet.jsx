// 🎭 Video mẫu con rối 2D Ama (docs/LESSON-ENGINE.md §4b) – CÙNG động cơ với giáo viên trong app (web/js/lesson/puppet.js): khung → t → sample → apply.
// Props = out/puppet/props.json (scripts/puppet/sample.mjs): tl { cues Rhubarb, expr, gest }, words (faster-whisper), card, audio.
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AbsoluteFill, Audio, staticFile, useCurrentFrame, useVideoConfig, spring, interpolate, delayRender, continueRender } from 'remotion';
import Pup from '../../../../web/js/lesson/puppet.js';

const K = { bg0: '#10191B', bg1: '#172427', card: '#1E2F33', teal: '#2BA39A', tealL: '#7FD3C9', ink: '#F4F1EA', mut: '#A9BDBB', hi: '#F5A031' };
const FONT_H = 'LexDisplay', FONT_B = 'LexBody';

function useFonts() {
  const [h] = useState(() => delayRender('fonts'));
  useEffect(() => {
    const faces = [new FontFace(FONT_H, `url(${staticFile('fonts/display.ttf')})`, { weight: '800' }), new FontFace(FONT_B, `url(${staticFile('fonts/body.ttf')})`, { weight: '800' })];
    Promise.all(faces.map(f => f.load().then(x => document.fonts.add(x)).catch(() => null))).then(() => continueRender(h));
  }, [h]);
}

function PuppetLayer({ tl, t, style }) {
  const box = useRef(null), rig = useRef(null);
  useLayoutEffect(() => { box.current.innerHTML = Pup.art({ id: 'pv', label: 'Ama' }); box.current.firstChild.style.cssText = 'width:100%;height:100%;display:block;overflow:visible'; rig.current = Pup.rig(box.current.firstChild); }, []);
  useLayoutEffect(() => { if (rig.current) Pup.apply(rig.current, Pup.sample(tl, t)); });
  return <div ref={box} style={style} />;
}

// ---- Host cho khuôn stitch-short (PR #191: stitch/hosts.js → HOSTS.puppet = Teacher). host = { who, box:[x0,y0,x1,y1], lines:[{id, at, words:[{w,s,e}]}],
//      gestures?:[{t, g}] (g = cử chỉ GEST hoặc kind KIND), cues? (Rhubarb [[t,v]] – có thì dùng, chính xác nhất), expr?:[[t,name]], pointTo?: 'left'|'right' }.
//      Không có cues → miệng theo chữ từng từ trong đúng khung [s,e] của từ (mốc whisper) → khớp nhịp từng từ. Con rối 3:4 đặt đáy-giữa box.
export function hostTimeline(h) {
  const cues = [], expr = (h.expr || []).slice(), gest = [];
  if (h.cues && h.cues.length) cues.push(...h.cues);
  else for (const l of h.lines || []) for (const w of l.words || []) {
    const c = Pup.fromText(w.w, Math.max(0.08, w.e - w.s));
    if (cues.length && cues[cues.length - 1][1] === 'X' && cues[cues.length - 1][0] > w.s - 0.01) cues.pop();
    for (const [t, v] of c) cues.push([+(w.s + t).toFixed(3), v]);
  }
  cues.sort((a, b) => a[0] - b[0]);
  for (const g of h.gestures || []) {
    const k = Pup.KIND[g.g], name = k ? k.gest : g.g, e = k && k.expr;
    if (e) expr.push([g.t, e]);
    if (name) gest.push([g.t, name === 'point' && h.pointTo !== 'right' ? 'pointL' : name]);
  }
  return { cues, expr: expr.sort((a, b) => a[0] - b[0]), gest: gest.sort((a, b) => a[0] - b[0]), seed: h.seed || 11, lead: 0.03 };
}
export const Teacher = ({ t, box = [0, 0, 1080, 1920], ...h }) => {
  const tl = useMemo(() => hostTimeline(h), [h.lines, h.gestures, h.cues, h.expr]); // eslint-disable-line react-hooks/exhaustive-deps
  const [x0, y0, x1, y1] = box, bw = x1 - x0, bh = y1 - y0, w = Math.min(bw, bh * 0.75), hgt = w / 0.75;
  return <PuppetLayer tl={tl} t={t} style={{ position: 'absolute', left: x0 + (bw - w) / 2, top: y1 - hgt, width: w, height: hgt }} />;
};

function Card({ card, f, fps, pulse }) {
  const k = spring({ frame: f - 6, fps, config: { damping: 14 } }), s = 1 + 0.05 * pulse;
  return (
    <div style={{ position: 'absolute', left: 90, right: 90, top: 120, height: 400, borderRadius: 48, background: K.card, boxShadow: '0 24px 60px #0008', border: `3px solid ${K.teal}55`,
      transform: `translateY(${(1 - k) * -80}px) scale(${s})`, opacity: k, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
      <div style={{ font: `800 34px ${FONT_B}`, color: K.tealL, letterSpacing: 4, textTransform: 'uppercase' }}>Word of the day</div>
      <div style={{ font: `800 150px/1 ${FONT_H}`, color: K.ink }}>{card.word}</div>
      <div style={{ font: `800 46px ${FONT_B}`, color: K.teal }}>{card.ipa} · <span style={{ color: K.mut }}>{card.pos}</span></div>
      <div style={{ font: `800 38px ${FONT_B}`, color: K.mut }}>{card.hint}</div>
    </div>
  );
}

function Captions({ lines, words, t }) {
  const li = lines.findIndex(l => t >= l.start - 0.2 && t <= l.end + 0.35);
  if (li < 0) return null;
  const ws = words.filter(w => w.line === li), L = lines[li];
  const items = ws.length ? ws : L.text.split(/\s+/).map(w => ({ w, start: L.start, end: L.end }));
  const k = interpolate(t, [L.start - 0.2, L.start], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <div style={{ position: 'absolute', left: 70, right: 70, top: 560, minHeight: 190, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: k }}>
      <div style={{ font: `800 62px/1.25 ${FONT_B}`, color: K.ink, textAlign: 'center', textShadow: '0 4px 14px #000a' }}>
        {items.map((w, i) => <span key={i} style={{ color: t >= w.start && t < w.end + 0.08 ? K.hi : K.ink }}>{w.w}{' '}</span>)}
      </div>
    </div>
  );
}

export const PuppetSample = props => {
  useFonts();
  const f = useCurrentFrame(), { fps } = useVideoConfig(), t = f / fps, tl = props.tl || {};
  const pt = (tl.gest || []).find(g => g[1] === 'point' && t >= g[0] && t <= g[0] + 1.7), pulse = pt ? Math.sin(Math.min(1, (t - pt[0]) / 1.2) * Math.PI) : 0;
  return (
    <AbsoluteFill style={{ background: `linear-gradient(180deg, ${K.bg1} 0%, ${K.bg0} 70%)` }}>
      <div style={{ position: 'absolute', left: 90, top: 840, width: 900, height: 900, borderRadius: '50%', background: `radial-gradient(circle, ${K.teal}55 0%, ${K.teal}00 68%)` }} />
      {props.card ? <Card card={props.card} f={f} fps={fps} pulse={pulse} /> : null}
      <PuppetLayer tl={tl} t={t} style={{ position: 'absolute', left: 60, top: 640, width: 960, height: 1280 }} />
      <Captions lines={props.lines || []} words={props.words || []} t={t} />
      <div style={{ position: 'absolute', right: 48, bottom: 40, font: `800 30px ${FONT_B}`, color: '#ffffffaa' }}>lexkite.com</div>
      {props.audio ? <Audio src={staticFile(props.audio)} /> : null}
    </AbsoluteFill>
  );
};
