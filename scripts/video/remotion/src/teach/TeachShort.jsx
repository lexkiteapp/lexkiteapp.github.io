// Teach2D short / embed (docs/VIDEO-TEACH2D.md): Lexkite Kit canvas (Stitch, dark A "Tactile Night" / light B "Bright Day") + the ONE 2D teacher
// (web/teach/characters.json, speech-gated talk/listen alpha clips from scripts/video/teach2d/host.py) + Kit cards from build.py, every element
// on its spoken word (motion maths = ../stitch/core.mjs, the QC predicts the same frames) + one-row karaoke captions + voice track.
import React, { useEffect, useState } from 'react';
import { AbsoluteFill, OffthreadVideo, Audio, Img, Sequence, staticFile, useCurrentFrame, useVideoConfig, delayRender, continueRender } from 'remotion';
import { pose, state, value, clamp01, easeOut } from '../stitch/core.mjs';
import THEMES from './theme.json';

const JAK = 'LkJakarta', NOTO = 'LkNoto';
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const mixc = (a, b, m) => { const x = hex(a), y = hex(b); return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * m)).join(',')})`; };

function useFonts() {
  const [h] = useState(() => delayRender('teach fonts'));
  useEffect(() => {
    const f = [new FontFace(JAK, `url(${staticFile('fonts/jakarta.ttf')})`, { weight: '200 800' }), new FontFace(NOTO, `url(${staticFile('fonts/noto.ttf')})`, { weight: '500' })];
    Promise.all(f.map(x => x.load().then(y => document.fonts.add(y)))).then(() => continueRender(h)).catch(() => continueRender(h));
  }, [h]);
}

const Flag = ({ cc, w, h }) => cc === 'us'
  ? <svg width={w} height={h} viewBox="0 0 30 20"><rect width="30" height="20" rx="3" fill="#FFFFFF" />{[0, 2, 4, 6, 8, 10, 12].map(i => <rect key={i} y={i * 20 / 13} width="30" height={20 / 13} fill="#D22F3C" />)}
      <rect width="13" height={20 * 7 / 13} fill="#26408F" />{[0, 1, 2].map(r => [0, 1, 2, 3].map(c => <circle key={`${r}${c}`} cx={2 + c * 3} cy={2 + r * 3.4} r=".7" fill="#FFF" />))}</svg>
  : <svg width={w} height={h} viewBox="0 0 30 20"><rect width="30" height="20" rx="3" fill="#26408F" /><path d="M0 0L30 20M30 0L0 20" stroke="#FFF" strokeWidth="4" /><path d="M0 0L30 20M30 0L0 20" stroke="#D22F3C" strokeWidth="1.6" />
      <path d="M15 0V20M0 10H30" stroke="#FFF" strokeWidth="6" /><path d="M15 0V20M0 10H30" stroke="#D22F3C" strokeWidth="3.4" /></svg>;

const TONES = T => ({ card: [T.card, T.edge, T.ledge], tile: [T.tile, T.tile_edge, T.tile_ledge], good: [T.good_bg, T.good_edge, T.ledge], bad: [T.bad_bg, T.bad_edge, T.ledge],
  bubble_bad: [T.bubble_bad, T.bubble_bad_edge, '#7A1E10'], bubble_good: [T.bubble_good, T.bubble_good_edge, '#0B4540'] });

function Body({ n, t, w, h, T }) {
  const c = k => T[k] || k;
  switch (n.type) {
    case 'card': { const [f, e, l] = TONES(T)[n.tone] || TONES(T).card;
      return <div style={{ position: 'absolute', inset: 0 }}>
        <div style={{ position: 'absolute', inset: 0, boxSizing: 'border-box', background: f, borderRadius: n.tail ? 40 : 44, border: `2px solid ${e}`, borderBottom: `10px solid ${l}`,
          boxShadow: n.hook ? `0 18px 40px -18px ${T.ledge}` : 'none' }} />
        {n.tail ? <svg width="44" height="40" style={{ position: 'absolute', bottom: -26, [n.tail === 'l' ? 'left' : 'right']: 40 }} viewBox="0 0 44 40">
          <path d={n.tail === 'l' ? 'M0 0 L44 0 L4 40 Z' : 'M0 0 L44 0 L40 40 Z'} fill={l} /><path d={n.tail === 'l' ? 'M2 0 L42 0 L6 30 Z' : 'M2 0 L42 0 L38 30 Z'} fill={f} /></svg> : null}</div>; }
    case 'text': { const [cur, , m] = state(n, t), hit = n.hit_col && cur === 'hit' ? m : 0;
      return <div style={{ width: w + 4, height: h, fontFamily: n.ipa ? NOTO : JAK, fontWeight: n.ipa ? 500 : 800, fontSize: n.size, lineHeight: `${h}px`, whiteSpace: 'pre' }}>
        {n.runs.map(([s, k], i) => <span key={i} style={{ color: hit ? mixc(c(k), c(n.hit_col), hit) : c(k) }}>{s}</span>)}</div>; }
    case 'chip': { const [cb, ce, ci] = n.tone === 'bad' ? [T.bad_bg, T.bad_edge, T.bad] : n.tone === 'good' ? [T.good_bg, T.good_edge, T.good] : [T.chip_bg, T.chip_edge, T.chip_ink];
      return <div style={{ width: w, height: h, boxSizing: 'border-box', borderRadius: 999, background: cb, border: `2px solid ${ce}`, color: ci, fontFamily: JAK, fontWeight: 800,
        fontSize: n.size, lineHeight: `${h - 4}px`, letterSpacing: '0.06em', textAlign: 'center', whiteSpace: 'pre' }}>{n.text}</div>; }
    // ---- Stitch video frames (project 7268539912208977707): candy staircase 8a2f4328, stress beat 1af83ea9, chat 3036b5ac, US vs UK battle a5a31136 ----
    case 'candy': { const P = n.pal;
      return <div style={{ position: 'absolute', inset: 0, boxSizing: 'border-box', borderRadius: 34, background: `linear-gradient(180deg, ${P.a} 0%, ${P.b} 100%)`, border: `3px solid ${P.edge}`,
        boxShadow: `0 10px 0 ${P.ledge}, 0 22px 40px -12px ${P.b}88, inset 0 3px 6px rgba(255,255,255,.55)`, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 14 }}>
        <div style={{ width: '80%', height: 12, borderRadius: 8, background: 'rgba(255,255,255,.45)' }} />
        <div style={{ marginTop: 8, fontFamily: JAK, fontWeight: 800, fontSize: n.lsize, lineHeight: `${n.lsize + 4}px`, letterSpacing: '0.06em', color: P.lab }}>{n.label}</div>
        <div style={{ fontFamily: JAK, fontWeight: 800, fontSize: n.size, lineHeight: `${n.size + 4}px`, letterSpacing: '-0.01em', color: P.ink, textShadow: '0 2px 0 rgba(0,0,0,.12)' }}>{n.word}</div>
        <div style={{ position: 'absolute', top: -22, right: -16, width: 62, height: 62, borderRadius: 31, background: '#FFFFFF', border: `4px solid ${P.edge}`, boxShadow: '0 4px 0 rgba(0,0,0,.25)',
          fontFamily: JAK, fontWeight: 800, fontSize: 30, lineHeight: '54px', textAlign: 'center', color: P.ledge }}>{n.step}</div></div>; }
    case 'stamp':
      return <div style={{ width: w, height: h, boxSizing: 'border-box', borderRadius: 22, background: '#C92A2A', border: '4px dashed #FFA8A8', boxShadow: '0 12px 26px rgba(201,42,42,.45)',
        transform: `rotate(${n.rot || -6}deg)`, color: '#FFFFFF', fontFamily: JAK, fontWeight: 800, fontSize: n.size, lineHeight: `${h - 8}px`, textAlign: 'center', letterSpacing: '0.04em', whiteSpace: 'pre' }}>{n.text}</div>;
    case 'path': { const p = n.pts || []; if (p.length < 2) return null;
      const d = n.wave ? p.map((q, i) => (i ? `Q ${(p[i - 1][0] + q[0]) / 2} ${Math.min(p[i - 1][1], q[1]) - 30} ${q[0]} ${q[1]}` : `M ${q[0]} ${q[1]}`)).join(' ') : p.map((q, i) => `${i ? 'L' : 'M'} ${q[0]} ${q[1]}`).join(' ');
      return <svg width={w} height={h} style={{ overflow: 'visible' }}><path d={d} fill="none" stroke={n.wave ? T.primary : 'rgba(255,255,255,.28)'} strokeOpacity={n.wave ? 0.55 : 1} strokeWidth="5" strokeDasharray={n.wave ? '0' : '12 12'} strokeLinecap="round" /></svg>; }
    case 'beat': { const [cur, , m] = state(n, t), on = n.big && cur === 'hit' ? easeOut(m) : 0;
      return <div style={{ position: 'absolute', inset: 0, transform: `translateY(${-40 * on}px) scale(${1 + 0.06 * on})`, boxSizing: 'border-box', borderRadius: 30,
        background: on ? `linear-gradient(180deg, ${mixc(T.tile, '#FFE266', on)} 0%, ${mixc(T.tile, '#FFC524', on)} 100%)` : T.tile, border: `3px solid ${on ? mixc(T.tile_edge, '#FFF1A8', on) : T.tile_edge}`,
        boxShadow: `0 9px 0 ${on ? mixc(T.tile_ledge, '#A87803', on) : T.tile_ledge}${on ? `, 0 0 ${40 * on}px rgba(255,201,74,${0.5 * on})` : ''}`,
        fontFamily: JAK, fontWeight: 800, fontSize: n.size, lineHeight: `${h - 12}px`, textAlign: 'center', color: on ? mixc(T.ink, '#382600', on) : T.ink }}>{n.text}</div>; }
    case 'ipapill':
      return <div style={{ width: w, height: h, boxSizing: 'border-box', borderRadius: 24, background: T.card, border: `2px solid ${T.edge}`, borderBottom: `6px solid ${T.ledge}`,
        fontFamily: NOTO, fontWeight: 500, fontSize: n.size, lineHeight: `${h - 8}px`, textAlign: 'center', color: T.ink, whiteSpace: 'pre' }}>{n.text}</div>;
    case 'rhythm':
      return <div style={{ width: w, height: h, boxSizing: 'border-box', borderRadius: 999, background: T.card, border: `2px solid ${T.edge}`, fontFamily: JAK, fontWeight: 800, fontSize: n.size,
        lineHeight: `${h - 4}px`, textAlign: 'center', whiteSpace: 'pre' }}>{n.text.split(' · ').map((x, i) => <span key={i} style={{ color: x === 'DUM' ? T.accent : T.muted }}>{(i ? ' · ' : '') + x}</span>)}</div>;
    case 'split':
      return <div style={{ position: 'absolute', inset: 0, boxSizing: 'border-box', borderRadius: 44, background: T.card, border: `2px solid ${T.edge}`, borderBottom: `10px solid ${T.ledge}` }}>
        <div style={{ position: 'absolute', left: '50%', top: 24, bottom: 24, width: 2, background: T.edge }} /></div>;
    case 'vs':
      return <div style={{ width: w, height: h, boxSizing: 'border-box', borderRadius: '50%', background: `radial-gradient(circle at 40% 30%, #FF8A65 0%, #E0482F 70%)`, border: '5px solid #FFC94A',
        boxShadow: '0 8px 0 #9E2B16, 0 0 30px rgba(242,85,59,.5)', color: '#FFFFFF', fontFamily: JAK, fontWeight: 800, fontStyle: n.text ? 'normal' : 'italic', fontSize: n.size, lineHeight: `${h - 10}px`, textAlign: 'center' }}>{n.text || 'VS'}</div>;
    case 'slot': { const [cur, , m] = state(n, t), k = cur === 'filled' ? easeOut(m) : 0;   // glowing empty slot -> the right word drops in
      return <div style={{ position: 'absolute', inset: 0, boxSizing: 'border-box', borderRadius: 24, border: `4px ${k ? 'solid' : 'dashed'} ${mixc(T.primary, T.good, k)}`, background: mixc(T.tile, T.good_bg, k),
        boxShadow: `0 0 ${24 + 16 * k}px ${k ? T.good : T.primary}55`, fontFamily: JAK, fontWeight: 800, fontSize: n.size, lineHeight: `${h - 8}px`, textAlign: 'center', color: T.good }}>
        <span style={{ opacity: k, display: 'inline-block', transform: `translateY(${(1 - k) * -24}px)` }}>{n.word}</span></div>; }
    case 'opt': { const [cur, prev, m] = state(n, t), P = s => s === 'right' ? [T.good_bg, T.good, T.good_edge] : [T.pill, T.pill_edge, T.pill_ledge], A = P(prev), B = P(cur), x = k => mixc(A[k], B[k], m);
      return <div style={{ position: 'absolute', inset: 0, boxSizing: 'border-box', borderRadius: 34, background: x(0), border: `3px solid ${x(1)}`, borderBottom: `9px solid ${x(2)}`, opacity: cur === 'dim' ? 1 - 0.4 * m : 1,
        boxShadow: cur === 'right' ? `0 0 ${30 * m}px ${T.good}66` : 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: JAK, fontWeight: 800, fontSize: n.size, lineHeight: `${n.size + 6}px`, color: T.ink }}>{n.text}</div>
        <div style={{ fontFamily: JAK, fontWeight: 800, fontSize: 40, lineHeight: '46px', letterSpacing: '0.06em', color: cur === 'right' ? T.good : T.muted }}>{cur === 'right' ? '✓ CORRECT' : n.label}</div></div>; }
    case 'brick': { const glow = n.tone === 'glow';   // snap-together toy brick: studs on top, ledge below
      return <div style={{ position: 'absolute', inset: 0 }}>
        {[0.25, 0.75].map(f => <div key={f} style={{ position: 'absolute', top: -14, left: `calc(${f * 100}% - 30px)`, width: 60, height: 20, borderRadius: '10px 10px 0 0', background: glow ? '#8BE9DE' : T.tile_edge }} />)}
        <div style={{ position: 'absolute', inset: 0, boxSizing: 'border-box', borderRadius: 26, background: glow ? 'linear-gradient(180deg,#8BE9DE,#5FD9CC)' : T.tile, border: `3px solid ${glow ? '#C8FFF8' : T.tile_edge}`,
          borderBottom: `10px solid ${glow ? '#1E8C84' : T.tile_ledge}`, boxShadow: glow ? '0 0 40px rgba(95,217,204,.45)' : 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontFamily: JAK, fontWeight: 800, fontSize: 40, letterSpacing: '0.06em', color: glow ? '#0B3B37' : T.muted }}>{n.label}</div>
          <div style={{ fontFamily: JAK, fontWeight: 800, fontSize: n.size, lineHeight: `${n.size + 6}px`, color: glow ? '#062A27' : T.ink }}>{n.word}</div></div></div>; }
    case 'wave': { const on = (n.plays || []).some(([a, b]) => t >= a && t <= b);   // listening waveform: bars move only while the line plays, calm otherwise
      return <div style={{ width: w, height: h, display: 'flex', alignItems: 'center', gap: 8 }}>{Array.from({ length: n.bars }, (_, i) => {
        const base = 0.28 + 0.5 * Math.abs(Math.sin(i * 1.7)), k = on ? 0.35 + 0.65 * Math.abs(Math.sin(t * 9 + i * 0.9)) : 0.45;
        return <div key={i} style={{ flex: 1, height: Math.max(10, h * base * k), borderRadius: 8, background: on ? T.primary : T.tile_edge }} />; })}</div>; }
    case 'flip': { const [cur, , m] = state(n, t), k = cur === 'back' ? easeOut(m) : 0, front = k < 0.5, sx = Math.abs(Math.cos(Math.PI * k));   // flashcard flips once (scaleX, no 3D)
      return <div style={{ position: 'absolute', inset: 0, transform: `scaleX(${Math.max(0.02, sx)})` }}>
        <div style={{ position: 'absolute', inset: 0, boxSizing: 'border-box', borderRadius: 44, background: T.card, border: `2px solid ${front ? T.edge : T.primary}`, borderBottom: `10px solid ${T.ledge}`,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 48px', textAlign: 'center', gap: 18 }}>
          <div style={{ fontFamily: JAK, fontWeight: 800, fontSize: 40, letterSpacing: '0.06em', color: T.muted }}>{front ? 'FRONT' : 'BACK'}</div>
          {front ? <><div style={{ fontFamily: JAK, fontWeight: 800, fontSize: n.size, lineHeight: `${n.size + 8}px`, color: T.primary }}>{n.word}</div>
            <div style={{ fontFamily: NOTO, fontWeight: 500, fontSize: 48, color: T.muted }}>{n.ipa}</div></>
            : <div style={{ fontFamily: JAK, fontWeight: 800, fontSize: n.msize, lineHeight: `${n.msize + 12}px`, color: T.ink }}>{n.mean}</div>}</div></div>; }
    case 'grade': { const [cur, , m] = state(n, t), k = cur === 'lit' ? m : 0, col = { bad: T.bad, amber: '#FFB859', good: T.good, easy: T.primary }[n.tone] || T.primary;   // the app's 4 review buttons
      return <div style={{ position: 'absolute', inset: 0, boxSizing: 'border-box', borderRadius: 28, background: k ? mixc(T.pill, n.tone === 'bad' ? T.bad_bg : T.good_bg, k) : T.pill, border: `3px solid ${col}`,
        borderBottom: `8px solid ${T.pill_ledge}`, boxShadow: k ? `0 0 ${28 * k}px ${col}66` : 'none', fontFamily: JAK, fontWeight: 800, fontSize: n.size, lineHeight: `${h - 12}px`, textAlign: 'center', color: T.ink }}>{n.text}</div>; }
    case 'plus':
      return <div style={{ width: w, height: h, borderRadius: '50%', background: T.card, border: `3px solid ${T.edge}`, color: T.primary, fontFamily: JAK, fontWeight: 800, fontSize: 56, lineHeight: `${h - 8}px`, textAlign: 'center' }}>+</div>;
    case 'pic': { const [cur, , m] = state(n, t), k = cur === 'clear' ? easeOut(m) : 0;   // polaroid: picture blurred until the answer, then sharp
      return <div style={{ position: 'absolute', inset: 0, boxSizing: 'border-box', borderRadius: 30, background: '#FFFFFF', padding: 22, paddingBottom: 54, transform: 'rotate(-3deg)', boxShadow: '0 14px 0 rgba(0,0,0,.25)' }}>
        <div style={{ width: '100%', height: '100%', borderRadius: 16, overflow: 'hidden', background: '#E3F1EE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Img src={staticFile(n.src)} style={{ width: '78%', height: '78%', objectFit: 'contain', filter: `blur(${(1 - k) * 22}px)`, opacity: 0.5 + 0.5 * k }} /></div></div>; }
    case 'letter': { const [cur, , m] = state(n, t), k = cur === 'show' ? easeOut(m) : 0;
      return <div style={{ position: 'absolute', inset: 0, boxSizing: 'border-box', borderRadius: 18, background: k ? mixc(T.tile, '#FFC524', k) : T.tile, border: `3px solid ${k ? '#FFF1A8' : T.tile_edge}`,
        borderBottom: `8px solid ${k ? '#A87803' : T.tile_ledge}`, fontFamily: JAK, fontWeight: 800, fontSize: n.size, lineHeight: `${h - 10}px`, textAlign: 'center', color: '#382600' }}><span style={{ opacity: k }}>{n.ch}</span></div>; }
    case 'track': { const [cur] = state(n, t), at_ = cur === 'done' ? 4 : +(cur.replace('cur', '') || 0);
      return <div style={{ width: w, height: h, position: 'relative' }}>
        <div style={{ position: 'absolute', left: 30, right: 30, top: h / 2 - 5, height: 10, borderRadius: 5, background: T.tile_edge }} />
        <div style={{ position: 'absolute', left: 30, top: h / 2 - 5, height: 10, borderRadius: 5, width: `calc(${Math.min(1, Math.max(0, (at_ - 1) / 2)) * 100}% - ${60 * Math.min(1, Math.max(0, (at_ - 1) / 2))}px)`, background: T.good }} />
        {[1, 2, 3].map(i => { const done = i < at_, now = i === at_; return <div key={i} style={{ position: 'absolute', top: 0, left: `calc(${(i - 1) / 2 * 100}% - ${(i - 1) / 2 * 70}px)`, width: 70, height: 70, borderRadius: 35, boxSizing: 'border-box',
          background: done ? T.good : now ? '#FFC524' : T.tile, border: `4px solid ${done ? T.good_edge : now ? '#FFF1A8' : T.tile_edge}`, color: done || now ? '#10191B' : T.muted, fontFamily: JAK, fontWeight: 800, fontSize: 34, lineHeight: '62px', textAlign: 'center' }}>{done ? '✓' : i}</div>; })}</div>; }
    case 'score':
      return <div style={{ width: w, height: h, boxSizing: 'border-box', borderRadius: 999, background: T.chip_bg, border: `2px solid ${T.chip_edge}`, color: T.accent, fontFamily: JAK, fontWeight: 800, fontSize: n.size,
        lineHeight: `${h - 4}px`, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>🏆 {Math.round(value(n, t) || 0)} / {n.tot}</div>;
    case 'tag':
      return <div style={{ height: h, display: 'flex', alignItems: 'center', gap: 12, boxSizing: 'border-box', padding: '0 18px 0 12px', borderRadius: 999, background: T.card, border: `2px solid ${T.edge}`, width: 'fit-content' }}>
        <Flag cc={n.cc} w={48} h={32} /><span style={{ fontFamily: JAK, fontWeight: 800, fontSize: n.size, color: T.ink, letterSpacing: '0.06em' }}>{n.text}</span></div>;
    case 'flags':
      return <div style={{ width: w, height: h, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><Flag cc="us" w={135} h={90} /><Flag cc="uk" w={135} h={90} /></div>;
    case 'bar': return <div style={{ width: w, height: h, borderRadius: h / 2, background: c(n.tone) }} />;
    case 'eq':
      return <div style={{ width: w, height: h, boxSizing: 'border-box', borderRadius: '50%', background: `linear-gradient(180deg,${T.cta_b},${T.cta_a})`, borderBottom: `6px solid ${T.cta_ledge}`,
        color: T.cta_ink, fontFamily: JAK, fontWeight: 800, fontSize: n.size, lineHeight: `${h - 8}px`, textAlign: 'center' }}>=</div>;
    case 'pill': { const [cur, prev, m] = state(n, t), P = s => s === 'right' ? [T.good_bg, T.good, T.good_edge, T.ink] : s === 'dim' ? [T.pill, T.pill_edge, T.pill_ledge, T.muted] : [T.pill, T.pill_edge, T.pill_ledge, T.ink];
      const A = P(prev), B = P(cur), x = k => mixc(A[k], B[k], m), op = cur === 'dim' ? 1 - 0.35 * m : 1;
      return <div style={{ position: 'absolute', inset: 0, boxSizing: 'border-box', borderRadius: 28, background: x(0), border: `2px solid ${x(1)}`, borderBottom: `6px solid ${x(2)}`, opacity: op }}>
        <div style={{ position: 'absolute', left: 18, top: 21, width: 62, height: 62, borderRadius: 16, background: T.tile, border: `2px solid ${T.tile_edge}`, color: T.ink,
          fontFamily: JAK, fontWeight: 800, fontSize: 34, lineHeight: '58px', textAlign: 'center' }}>{n.idx}</div>
        <div style={{ position: 'absolute', left: 104, top: 0, height: h - 8, fontFamily: JAK, fontWeight: 800, fontSize: n.size, lineHeight: `${h - 8}px`, color: x(3), whiteSpace: 'pre' }}>{n.label}</div></div>; }
    case 'check':
      return <svg width={w} height={h} viewBox="0 0 64 64"><circle cx="32" cy="32" r="31" fill="#2FBF71" /><path d="M18 33l9 9 19-20" stroke="#0E2919" strokeWidth="7" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>;
    case 'cross':
      return <svg width={w} height={h} viewBox="0 0 64 64"><circle cx="32" cy="32" r="31" fill="#F2553B" /><path d="M21 21l22 22M43 21L21 43" stroke="#3A0D06" strokeWidth="7" strokeLinecap="round" /></svg>;
    case 'qmark':
      return <div style={{ width: w, height: h, borderRadius: '50%', background: T.chip_bg, border: `3px solid ${T.chip_edge}`, color: T.chip_ink, fontFamily: JAK, fontWeight: 800, fontSize: n.size, lineHeight: `${h - 6}px`, textAlign: 'center' }}>?</div>;
    case 'confetti': { const tau = t - n.in.t; if (tau < 0 || tau > 0.9) return null; const cols = [T.cta_a, '#FFC94A', '#2FBF71', '#6BD8CE'];
      return <svg width={w} height={h} style={{ overflow: 'visible' }}>{Array.from({ length: 14 }, (_, i) => { const a = -Math.PI * (0.1 + 0.8 * ((i * 7) % 14) / 13), v = 260 + 90 * ((i * 5) % 3);
        const x = w * (0.55 + 0.35 * ((i % 7) / 6 - 0.5)) + Math.cos(a) * v * tau, y = h * 0.6 + Math.sin(a) * v * tau + 420 * tau * tau;
        return <rect key={i} x={x} y={y} width="16" height="9" rx="3" fill={cols[i % 4]} opacity={1 - clamp01((tau - 0.5) / 0.4)} transform={`rotate(${(i * 47 + tau * 360) % 360} ${x + 8} ${y + 4})`} />; })}</svg>; }
    case 'ring': { const { t0, t1 } = n.ring, rem = clamp01((t1 - t) / (t1 - t0)), d = Math.min(3, Math.max(1, Math.ceil(3 * (t1 - t) / (t1 - t0) - 1e-9))), r = w / 2 - 7, C = 2 * Math.PI * r;
      return <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}><circle cx={w / 2} cy={h / 2} r={r} stroke={T.ring_track} strokeWidth="9" fill={T.ring_bg} />
        <circle cx={w / 2} cy={h / 2} r={r} stroke={T.ring_fg} strokeWidth="9" fill="none" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - rem)} transform={`rotate(-90 ${w / 2} ${h / 2})`} />
        <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" fontFamily={JAK} fontWeight="800" fontSize={n.size} fill={T.ring_ink}>{t >= t1 ? '✓' : d}</text></svg>; }
    case 'strike': { const p = pose(n, t).p;
      return <div style={{ position: 'absolute', left: 0, top: 0, height: h, width: w * p, background: '#F2553B', borderRadius: h / 2 }} />; }
    case 'dot': { const [cur, , m] = state(n, t), on = cur === 'hit' ? m : 0;
      return <div style={{ width: w, height: h, borderRadius: '50%', background: n.big ? mixc(T.dot_off, T.dot_on, on) : T.dot_off, boxShadow: n.big && on ? `0 0 ${16 * on}px ${T.dot_on}` : 'none' }} />; }
    case 'img': return <Img src={staticFile(n.src)} style={{ width: w, height: h, borderRadius: n.radius, display: 'block' }} />;
    case 'cta':
      return <div style={{ width: w, height: h, boxSizing: 'border-box', borderRadius: 28, background: `linear-gradient(90deg,${T.cta_a},${T.cta_b})`, borderBottom: `6px solid ${T.cta_ledge}`,
        color: T.cta_ink, fontFamily: JAK, fontWeight: 800, fontSize: n.size, lineHeight: `${h - 6}px`, textAlign: 'center' }}>{n.lines.join(' ')} →</div>;
    default: return null;
  }
}

function Node({ n, kids, t, ox, oy, T }) {
  const p = pose(n, t); if (p.a <= 0.001) return null;
  const [x0, y0, x1, y1] = n.box, w = x1 - x0, h = y1 - y0;
  return (
    <div style={{ position: 'absolute', left: x0 - ox, top: y0 - oy, width: w, height: h, opacity: p.a, transform: `translateY(${p.dy}px) scale(${p.s})`, transformOrigin: '50% 50%' }}>
      <Body n={n} t={t} w={w} h={h} T={T} />
      {(kids[n.id] || []).map(k => <Node key={k.id} n={k} kids={kids} t={t} ox={x0} oy={y0} T={T} />)}
    </div>
  );
}

const Canvas = ({ T, w, h, tint }) => (   // Stitch Kit canvas: flat tokens, static soft blobs (no moving background, no blur on the teacher)
  <AbsoluteFill style={{ background: `linear-gradient(180deg, ${T.bg} 0%, ${T.bg2} 100%)` }}>
    <div style={{ position: 'absolute', left: -w * 0.25, top: -h * 0.08, width: w * 0.9, height: w * 0.9, borderRadius: '50%', background: `radial-gradient(circle, ${tint || T.blobA} 0%, transparent 68%)` }} />
    <div style={{ position: 'absolute', right: -w * 0.3, top: h * 0.32, width: w * 0.9, height: w * 0.9, borderRadius: '50%', background: `radial-gradient(circle, ${T.blobB} 0%, transparent 68%)` }} />
    <div style={{ position: 'absolute', left: w * 0.1, bottom: -h * 0.1, width: w * 0.8, height: w * 0.8, borderRadius: '50%', background: `radial-gradient(circle, ${T.blobC} 0%, transparent 70%)` }} />
  </AbsoluteFill>
);

// Matching 2D scene (scenes.json via build.py / scene.py): flat Kit vector shapes in theme tokens, no text, no people, nothing moving.
// layer 'back' sits between the canvas and the teacher (floor, contact shadow, room); 'front' is the counter (+ props on it) above the teacher.
function Scene({ scene, layer, T, tint, w, h }) {
  if (!scene) return null;
  const col = c => (c === 'tint' ? tint || T.blobA : T[c] || c), items = scene.items.filter(x => (x.l || 'back') === layer);
  if (!items.length) return null;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ position: 'absolute', left: 0, top: 0 }}>
      <defs><radialGradient id={`sg-${layer}`}><stop offset="0%" stopColor={T.ledge} stopOpacity="1" /><stop offset="100%" stopColor={T.ledge} stopOpacity="0" /></radialGradient></defs>
      {items.map((x, i) => {
        if (x.k === 'p') return <polygon key={i} points={x.pts.map(p => p.join(',')).join(' ')} fill={col(x.c)} opacity={x.a} />;
        const [x0, y0, x1, y1] = x.b, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, rx = (x1 - x0) / 2, ry = (y1 - y0) / 2;
        if (x.k === 'r') return <rect key={i} x={x0} y={y0} width={x1 - x0} height={y1 - y0} rx={x.r || 0} fill={col(x.c)} opacity={x.a} />;
        if (x.k === 'o') return <ellipse key={i} cx={cx} cy={cy} rx={rx} ry={ry} fill={col(x.c)} opacity={x.a} />;
        if (x.k === 'g') return <ellipse key={i} cx={cx} cy={cy} rx={rx} ry={ry} fill={`url(#sg-${layer})`} opacity={x.a} />;   // soft contact shadow (token ledge)
        if (x.k === 'ring') { const sw = x.sw || 6; return <ellipse key={i} cx={cx} cy={cy} rx={rx - sw / 2} ry={ry - sw / 2} fill="none" stroke={col(x.c)} strokeWidth={sw} opacity={x.a} />; }
        return null;
      })}
    </svg>);
}

function Host({ host, f, T }) {   // speech-gated segments; bubble layout = the same clip framed in a round Kit call window
  if (!host.bubble) {   // social camera: push / cut per shot, scale anchored at the top of the head (head never rises into the captions)
    const c = host.cam, sh = c ? c.shots.find(x => f >= x.f0 && f < x.f1) || c.shots[c.shots.length - 1] : null;
    if (!sh) return <HostClips host={host} f={f} ox={0} oy={0} />;
    const p = clamp01((f - sh.f0) / Math.max(1, sh.f1 - sh.f0)), sc = sh.s0 + (sh.s1 - sh.s0) * (sh === c.shots[0] ? easeOut(p) : p);
    return <div style={{ position: 'absolute', inset: 0, transformOrigin: `${c.ox}px ${c.oy}px`, transform: `translateX(${sh.dx}px) scale(${sc})` }}><HostClips host={host} f={f} ox={0} oy={0} /></div>;
  }
  const [b0, b1, b2, b3] = host.bubble;
  return <div style={{ position: 'absolute', left: b0, top: b1, width: b2 - b0, height: b3 - b1, borderRadius: '50%', overflow: 'hidden', boxSizing: 'border-box',
    background: `radial-gradient(circle at 50% 40%, ${T.tile} 0%, ${T.card} 70%)`, border: `8px solid ${T.primary}`, boxShadow: `0 10px 0 ${T.ledge}` }}>
    <HostClips host={host} f={f} ox={b0 + 8} oy={b1 + 8} /></div>;
}

function HostClips({ host, f, ox, oy }) {   // the incoming clip fades in on top over xfade frames while the outgoing one keeps playing underneath
  const [x0, y0, x1, y1] = host.box.map((v, i) => v - (i % 2 ? oy : ox)), xf = host.xfade || 0;
  return host.segs.map((s, i) => {
    const canExt = k => k >= 0 && k + 1 < host.segs.length && host.segs[k].start + host.segs[k].dur + xf <= (host.len || {})[host.segs[k].clip];
    // fade in only over an outgoing clip that keeps playing underneath; at a loop wrap (no overlap possible) the new clip is opaque at once
    const ext = canExt(i) ? xf : 0, local = f - s.from, a = i === 0 || !xf || !canExt(i - 1) ? 1 : easeOut(local / xf);
    return (
      <Sequence key={i} from={s.from} durationInFrames={s.dur + ext} layout="none">
        <div style={{ position: 'absolute', left: x0, top: y0, width: x1 - x0, height: y1 - y0, opacity: a }}>
          <OffthreadVideo src={staticFile(host[s.clip])} startFrom={s.start} transparent muted style={{ width: '100%', height: '100%' }} />
        </div>
      </Sequence>);
  });
}

function Captions({ caps, box, t, T }) {
  const p = caps.find(c => t >= c.t0 && t < c.t1); if (!p || !box) return null;
  const now = p.words.filter(w => t >= w.s - 0.02).length - 1, a = clamp01((t - p.t0) / 0.08);
  return (
    <div style={{ position: 'absolute', left: box[0], top: box[1], width: box[2] - box[0], height: box[3] - box[1], display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: a }}>
      <div style={{ padding: '10px 26px', borderRadius: 24, background: T.cap_plate, fontFamily: JAK, fontWeight: 800, fontSize: 58, lineHeight: '74px', whiteSpace: 'pre' }}>
        {p.words.map((w, i) => <span key={i} style={{ color: i === now ? T.cap_now : T.cap_ink }}>{(i ? ' ' : '') + w.w}</span>)}</div>
    </div>);
}

export const TeachShort = ({ nodes = [], caps = [], capBox = null, host = null, theme = 'dark', tint = null, audio = null, scene = null, w = 1080, h = 1920 }) => {
  useFonts();
  const f = useCurrentFrame(), { fps } = useVideoConfig(), t = f / fps, T = THEMES[theme] || THEMES.dark;
  const kids = {}; for (const n of nodes) if (n.parent) (kids[n.parent] = kids[n.parent] || []).push(n);
  return (
    <AbsoluteFill>
      <Canvas T={T} w={w} h={h} tint={tint} />
      <Scene scene={scene} layer="back" T={T} tint={tint} w={w} h={h} />
      {host ? <Host host={host} f={f} T={T} /> : null}
      <Scene scene={scene} layer="front" T={T} tint={tint} w={w} h={h} />
      {audio ? <Audio src={staticFile(audio)} /> : null}
      <AbsoluteFill>{nodes.filter(n => !n.parent).map(n => <Node key={n.id} n={n} kids={kids} t={t} ox={0} oy={0} T={T} />)}</AbsoluteFill>
      <Captions caps={caps} box={capBox} t={t} T={T} />
    </AbsoluteFill>
  );
};
