// Motion core of the Stitch overlay layer – SAME maths as scripts/video/motion/core.py (parity: scripts/test/motion-core.mjs).
// Closed-form springs, no simulation: every frame is exact and stateless, so the QC can predict what Remotion draws.
export const clamp01 = x => (x < 0 ? 0 : x > 1 ? 1 : x);
export function spring(tau, z, w) {
  if (tau <= 0) return 0;
  const wd = w * Math.sqrt(1 - z * z);
  return 1 - Math.exp(-z * w * tau) * (Math.cos(wd * tau) + (z * w / wd) * Math.sin(wd * tau));
}
export const easeOut = x => 1 - (1 - clamp01(x)) ** 3;
export const FADE_IN = { rise: 0.12, pop: 0.06, fade: 0.14, draw: 0 };
export const DRAW = 0.3, OUT = 0.16, MIX = 0.18, RISE_DY = 36, OUT_DY = 14;
const r = (x, d) => Math.round(x * 10 ** d) / 10 ** d;

export function pose(n, t) {
  const i = n.in || { t: 0, k: 'fade' }, k = i.k, tau = t - i.t;
  let a, s, dy, p;
  if (k === 'draw') { a = tau >= 0 ? 1 : 0; s = 1; dy = 0; p = easeOut(tau / DRAW); }
  else {
    a = tau >= 0 ? clamp01(tau / FADE_IN[k]) : 0; p = 1;
    if (k === 'rise') { const sp = spring(tau, 0.8, 20); s = 0.94 + 0.06 * sp; dy = RISE_DY * (1 - sp); }
    else if (k === 'pop') { s = spring(tau, 0.45, 24); dy = 0; }
    else { s = 1; dy = 0; }
  }
  if (n.out) { const q = clamp01((t - n.out.t) / OUT); a *= 1 - q; dy -= OUT_DY * q; }
  return { a: r(a, 6), s: r(s, 6), dy: r(dy, 4), p: r(p, 6) };
}
export function state(n, t) {
  let cur = 'idle', prev = 'idle', t0 = -1e9;
  for (const x of n.st || []) if (t >= x.t) { prev = cur; cur = x.s; t0 = x.t; }
  return [cur, prev, clamp01((t - t0) / MIX)];
}
export function value(n, t) { // one segment or a list (a band bar that steps up on each correct answer)
  const v = n.val; if (!v) return null;
  const segs = Array.isArray(v) ? v : [v]; let cur = null;
  for (const x of segs) if (t >= x.t) cur = x;
  if (!cur) return segs[0].a;
  return cur.a + (cur.b - cur.a) * easeOut((t - cur.t) / cur.d);
}
