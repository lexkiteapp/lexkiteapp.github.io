// Teach2D short / embed (docs/VIDEO-TEACH2D.md): Lexkite Kit canvas (Stitch, dark A "Tactile Night" / light B "Bright Day") + the ONE 2D teacher
// (web/teach/characters.json, speech-gated talk/listen alpha clips from scripts/video/teach2d/host.py) + Kit cards from build.py, every element
// on its spoken word (motion maths = ../stitch/core.mjs, the QC predicts the same frames) + one-row karaoke captions + voice track.
import React, { useEffect, useState } from 'react';
import { AbsoluteFill, OffthreadVideo, Audio, Img, Sequence, staticFile, useCurrentFrame, useVideoConfig, delayRender, continueRender } from 'remotion';
import { pose, state, clamp01, easeOut } from '../stitch/core.mjs';
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

const TONES = T => ({ card: [T.card, T.edge, T.ledge], tile: [T.tile, T.tile_edge, T.tile_ledge], good: [T.good_bg, T.good_edge, T.ledge], bad: [T.bad_bg, T.bad_edge, T.ledge] });

function Body({ n, t, w, h, T }) {
  const c = k => T[k] || k;
  switch (n.type) {
    case 'card': { const [f, e, l] = TONES(T)[n.tone] || TONES(T).card;
      return <div style={{ position: 'absolute', inset: 0, boxSizing: 'border-box', background: f, borderRadius: 44, border: `2px solid ${e}`, borderBottom: `10px solid ${l}`,
        boxShadow: n.hook ? `0 18px 40px -18px ${T.ledge}` : 'none' }} />; }
    case 'text': { const [cur, , m] = state(n, t), hit = n.hit_col && cur === 'hit' ? m : 0;
      return <div style={{ width: w + 4, height: h, fontFamily: n.ipa ? NOTO : JAK, fontWeight: n.ipa ? 500 : 800, fontSize: n.size, lineHeight: `${h}px`, whiteSpace: 'pre' }}>
        {n.runs.map(([s, k], i) => <span key={i} style={{ color: hit ? mixc(c(k), c(n.hit_col), hit) : c(k) }}>{s}</span>)}</div>; }
    case 'chip':
      return <div style={{ width: w, height: h, boxSizing: 'border-box', borderRadius: 999, background: T.chip_bg, border: `2px solid ${T.chip_edge}`, color: T.chip_ink, fontFamily: JAK, fontWeight: 800,
        fontSize: n.size, lineHeight: `${h - 4}px`, letterSpacing: '0.06em', textAlign: 'center', whiteSpace: 'pre' }}>{n.text}</div>;
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

function Host({ host, f }) {   // speech-gated segments; the incoming clip fades in on top over xfade frames while the outgoing one keeps playing underneath
  const [x0, y0, x1, y1] = host.box, xf = host.xfade || 0;
  return host.segs.map((s, i) => {
    const ext = i + 1 < host.segs.length && s.start + s.dur + xf <= (host.len || {})[s.clip] ? xf : 0, local = f - s.from, a = i === 0 || !xf ? 1 : easeOut(local / xf);
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

export const TeachShort = ({ nodes = [], caps = [], capBox = null, host = null, theme = 'dark', tint = null, audio = null, w = 1080, h = 1920 }) => {
  useFonts();
  const f = useCurrentFrame(), { fps } = useVideoConfig(), t = f / fps, T = THEMES[theme] || THEMES.dark;
  const kids = {}; for (const n of nodes) if (n.parent) (kids[n.parent] = kids[n.parent] || []).push(n);
  return (
    <AbsoluteFill>
      <Canvas T={T} w={w} h={h} tint={tint} />
      {host ? <Host host={host} f={f} /> : null}
      {audio ? <Audio src={staticFile(audio)} /> : null}
      <AbsoluteFill>{nodes.filter(n => !n.parent).map(n => <Node key={n.id} n={n} kids={kids} t={t} ox={0} oy={0} T={T} />)}</AbsoluteFill>
      <Captions caps={caps} box={capBox} t={t} T={T} />
    </AbsoluteFill>
  );
};
