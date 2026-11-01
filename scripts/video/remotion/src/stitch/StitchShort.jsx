// Stitch overlay short (docs/VIDEO-MOTION.md): host plate (render_v9.py --overlay: teacher + captions + audio) + the Stitch "Tactile Night"
// cards of scripts/video/motion/build_overlay.py, animated with core.mjs (same maths as the QC). Ported from the Stitch HTML/Tailwind frames
// (project "Lexkite English Exam Prep"): tactile cards with a hard bottom ledge, chips, A–D pills, countdown ring, +XP, strike, stress dots, band bar, end card.
import React, { useEffect, useState } from 'react';
import { AbsoluteFill, OffthreadVideo, Audio, Img, staticFile, useCurrentFrame, useVideoConfig, delayRender, continueRender } from 'remotion';
import { pose, state, value, clamp01 } from './core.mjs';
import { HOSTS } from './hosts.js';

const JAK = 'LkJakarta', NOTO = 'LkNoto';
const TONE = { gold: ['#2C2618', '#6B5A2A', '#FFC94A'], coral: ['#3A1C17', '#7A3A2E', '#FF8F75'], teal: ['#123634', '#2B6F69', '#6BD8CE'], green: ['#123A26', '#2C7A4E', '#2FBF71'] };
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const mixc = (a, b, m) => { const x = hex(a), y = hex(b); return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * m)).join(',')})`; };

function useFonts() {
  const [h] = useState(() => delayRender('stitch fonts'));
  useEffect(() => {
    const f = [new FontFace(JAK, `url(${staticFile('fonts/jakarta.ttf')})`, { weight: '200 800' }), new FontFace(NOTO, `url(${staticFile('fonts/noto.ttf')})`, { weight: '500' })];
    Promise.all(f.map(x => x.load().then(y => document.fonts.add(y)))).then(() => continueRender(h)).catch(() => continueRender(h));
  }, [h]);
}

const Text = ({ n, w, h }) => (
  <div style={{ width: w, height: h, fontFamily: n.ipa ? NOTO : JAK, fontWeight: n.ipa ? 500 : 800, fontSize: n.size, lineHeight: `${h}px`, whiteSpace: 'pre' }}>
    {n.runs.map(([s, c], i) => <span key={i} style={{ color: c }}>{s}</span>)}
  </div>
);

function Body({ n, t, w, h }) {
  switch (n.type) {
    case 'card':
      return <div style={{ position: 'absolute', inset: 0, boxSizing: 'border-box', background: n.fill, borderRadius: 48, border: `3px solid ${n.edge}`, borderBottom: `12px solid ${n.ledge}`,
        borderTop: n.accent ? `6px solid ${TONE[n.accent][2]}` : `3px solid ${n.edge}`, boxShadow: '0 26px 54px -14px rgba(0,0,0,.50), inset 0 1px 0 rgba(255,255,255,.08)' }} />;
    case 'text': return <Text n={n} w={w} h={h} />;
    case 'chip': { const [bg, bd, ink] = TONE[n.tone];
      return <div style={{ width: w, height: h, boxSizing: 'border-box', borderRadius: 999, background: bg, border: `2px solid ${bd}`, color: ink, fontFamily: JAK, fontWeight: 800,
        fontSize: n.size, lineHeight: `${h - 4}px`, letterSpacing: '0.06em', textAlign: 'center', whiteSpace: 'pre' }}>{n.text}</div>; }
    case 'slot': { const [cur, prev, m] = state(n, t); const k = cur === 'filled' ? m : 0;
      return k > 0 ? <div style={{ width: w, height: h, position: 'relative' }}>
        <div style={{ position: 'absolute', inset: '-4px -10px', background: '#172427', opacity: Math.min(1, k * 2) }} />
        <div style={{ position: 'absolute', left: '50%', top: 0, transform: `translateX(-50%) scale(${0.7 + 0.3 * k})`, fontFamily: JAK, fontWeight: 800, fontSize: n.size, lineHeight: `${h}px`,
          color: n.color, opacity: k, whiteSpace: 'pre', borderBottom: `5px dashed ${n.color}` }}>{n.word}</div></div> : null; }
    case 'pill': { const [cur, prev, m] = state(n, t), A = n.pal[prev], B = n.pal[cur], c = k => mixc(A[k], B[k], m);
      return <div style={{ position: 'absolute', inset: 0, boxSizing: 'border-box', borderRadius: 38, background: c('fill'), border: `3px solid ${c('edge')}`, borderBottom: `9px solid ${c('ledge')}`,
        boxShadow: cur === 'right' ? `0 10px 30px rgba(47,191,113,${0.35 * m})` : '0 10px 24px rgba(0,0,0,.28)' }}>
        <div style={{ position: 'absolute', left: 17, top: 25, width: 60, height: 60, borderRadius: 30, background: c('ring'), border: '2px solid rgba(255,255,255,.10)', color: c('ring_ink'),
          fontFamily: JAK, fontWeight: 800, fontSize: 34, lineHeight: '56px', textAlign: 'center' }}>{n.idx}</div>
        <div style={{ position: 'absolute', left: 17 + 60 + 18, top: 0, height: h - 12, fontFamily: JAK, fontWeight: 800, fontSize: n.size, lineHeight: `${h - 12}px`, color: c('ink'), whiteSpace: 'pre' }}>{n.label}</div>
      </div>; }
    case 'check':
      return <svg width={w} height={h} viewBox="0 0 64 64"><circle cx="32" cy="32" r="31" fill="#2FBF71" /><path d="M18 33l9 9 19-20" stroke="#0E2919" strokeWidth="7" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>;
    case 'ring': { const { t0, t1 } = n.ring, rem = clamp01((t1 - t) / (t1 - t0)), d = Math.min(3, Math.max(1, Math.ceil(t1 - t - 1e-9))), r = w / 2 - 7, C = 2 * Math.PI * r;
      return <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}><circle cx={w / 2} cy={h / 2} r={r} stroke="#203438" strokeWidth="9" fill="#10191B" />
        <circle cx={w / 2} cy={h / 2} r={r} stroke="#F2553B" strokeWidth="9" fill="none" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - rem)} transform={`rotate(-90 ${w / 2} ${h / 2})`} />
        <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" fontFamily={JAK} fontWeight="800" fontSize={n.size} fill="#FF8F75">{d}</text></svg>; }
    case 'xp':
      return <div style={{ width: w, height: h, boxSizing: 'border-box', borderRadius: 999, background: '#2C2618', border: '2px solid #FFC94A', color: '#FFC94A', fontFamily: JAK, fontWeight: 800,
        fontSize: n.size, lineHeight: `${h - 4}px`, textAlign: 'center', boxShadow: '0 8px 22px rgba(255,201,74,.30)', fontVariantNumeric: 'tabular-nums' }}>+{Math.round(value(n, t))} XP</div>;
    case 'strike': { const p = pose(n, t).p;
      return <div style={{ position: 'absolute', left: 0, top: 0, height: h, width: w * p, background: '#F2553B', borderRadius: h / 2, boxShadow: '0 2px 0 rgba(0,0,0,.25)' }} />; }
    case 'dot': { const [cur, prev, m] = state(n, t), on = cur === 'hit' ? m : 0;
      return <div style={{ width: w, height: h, borderRadius: '50%', background: n.big ? mixc('#2A4146', '#FFC94A', on) : '#5A7175', boxShadow: n.big && on ? `0 0 ${18 * on}px rgba(255,201,74,.7)` : 'none',
        transform: `scale(${n.big ? 1 + 0.12 * Math.sin(Math.PI * on) : 1})` }} />; }
    case 'num':
      return <div style={{ width: w, height: h, fontFamily: JAK, fontWeight: 800, fontSize: n.size, lineHeight: `${h}px`, color: n.color, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{value(n, t).toFixed(n.dec)}</div>;
    case 'bar': { const v = value(n, t), f = clamp01((v - n.lo) / (n.hi - n.lo)), tx = clamp01((n.target - n.lo) / (n.hi - n.lo)) * w, ticks = [];
      for (let b = Math.ceil(n.lo); b <= n.hi; b++) ticks.push(b);
      return <div style={{ width: w, height: h, position: 'relative' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, width: w, height: n.track, borderRadius: n.track / 2, background: '#1E2F33', boxShadow: 'inset 0 2px 4px rgba(0,0,0,.4)' }} />
        <div style={{ position: 'absolute', left: 0, top: 0, width: Math.max(n.track, w * f), height: n.track, borderRadius: n.track / 2, background: 'linear-gradient(90deg,#2BA39A,#FFC94A)' }} />
        <div style={{ position: 'absolute', left: tx - 3, top: -12, width: 6, height: n.track + 24, borderRadius: 3, background: '#FFC94A', boxShadow: v >= n.target - 1e-6 ? '0 0 16px rgba(255,201,74,.9)' : 'none' }} />
        {ticks.map(b => <div key={b} style={{ position: 'absolute', top: n.track + 14, left: clamp01((b - n.lo) / (n.hi - n.lo)) * w - 20, width: 40, textAlign: 'center', fontFamily: JAK, fontWeight: 800,
          fontSize: n.size, lineHeight: `${n.size + 4}px`, color: b === n.target ? '#FFC94A' : '#94A8AB' }}>{b}</div>)}
      </div>; }
    case 'img': return <Img src={staticFile(n.src)} style={{ width: w, height: h, borderRadius: n.radius, display: 'block' }} />;
    case 'cta':
      return <div style={{ width: w, height: h, boxSizing: 'border-box', borderRadius: 36, background: 'linear-gradient(180deg,#EE5A3C,#D8432A)', boxShadow: '0 6px 0 #B53A22, 0 16px 28px -6px rgba(242,85,59,.35), inset 0 1px 0 rgba(255,255,255,.25)',
        paddingTop: 22, color: '#FFFFFF', fontFamily: JAK, fontWeight: 800, fontSize: n.size, lineHeight: `${n.lh}px`, textAlign: 'center' }}>{n.lines.map((l, i) => <div key={i}>{l}</div>)}</div>;
    default: return null;
  }
}

function Node({ n, kids, t, ox, oy }) {
  const p = pose(n, t); if (p.a <= 0.001) return null;
  const [x0, y0, x1, y1] = n.box, w = x1 - x0, h = y1 - y0;
  return (
    <div style={{ position: 'absolute', left: x0 - ox, top: y0 - oy, width: w, height: h, opacity: p.a, transform: `translateY(${p.dy}px) scale(${p.s})`, transformOrigin: '50% 50%' }}>
      <Body n={n} t={t} w={w} h={h} />
      {(kids[n.id] || []).map(k => <Node key={k.id} n={k} kids={kids} t={t} ox={x0} oy={y0} />)}
    </div>
  );
}

const Plate = ({ src, b }) => {   // the host plate (1080x1920) cropped sx/sy/sw/sh into the destination window dx/dy/dw/dh (short = full frame)
  if (!b) return <OffthreadVideo src={staticFile(src)} muted />;
  const k = b.dw / b.sw;
  return <div style={{ position: 'absolute', left: b.dx, top: b.dy, width: b.dw, height: b.dh, overflow: 'hidden', borderRadius: b.r, boxShadow: b.r ? '0 30px 70px -20px rgba(0,0,0,.6)' : 'none' }}>
    <OffthreadVideo src={staticFile(src)} muted style={{ position: 'absolute', left: -b.sx * k, top: -b.sy * k, width: 1080 * k, height: 1920 * k, maxWidth: 'none' }} /></div>;
};

export const StitchShort = ({ nodes = [], plate, plateBox, bg = '#10191B', host = null, tag = null, total = 0, audio = null }) => {
  useFonts();
  const f = useCurrentFrame(), { fps } = useVideoConfig(), t = f / fps;
  const kids = {}; for (const n of nodes) if (n.parent) (kids[n.parent] = kids[n.parent] || []).push(n);
  return (
    <AbsoluteFill style={{ background: bg }}>
      {host && host.kind !== 'plate' && HOSTS[host.kind] ? React.createElement(HOSTS[host.kind], { ...host, t, fps }) : plate ? <Plate src={plate} b={plateBox} /> : null}
      {audio ? <Audio src={staticFile(audio)} /> : null}
      {tag && t > 0.5 && t < (total || 1e9) - 0.6 ? <div style={{ position: 'absolute', left: 24, top: 24, padding: '6px 14px', borderRadius: 999, background: 'rgba(16,25,27,.72)', color: '#FFC94A', fontFamily: JAK, fontWeight: 800, fontSize: 26, letterSpacing: '0.06em' }}>{tag}</div> : null}
      <AbsoluteFill>{nodes.filter(n => !n.parent).map(n => <Node key={n.id} n={n} kids={kids} t={t} ox={0} oy={0} />)}</AbsoluteFill>
    </AbsoluteFill>
  );
};
