/* Rules editor model for Admin → "Kênh & phân phối" (pure, no DOM; tests: scripts/test/dist-roles.mjs). Ordered list, first match wins per platform
 * (server: functions/api/_distribution.js routeAll/explain). Mutations return NEW arrays so the UI can diff + undo. */
(function (g) {
  const COND = ['type', 'topic', 'skill', 'cefr', 'exam', 'region', 'template', 'scene'];
  const platformOf = id => { const m = /^gc-([a-z_]+)-/.exec(String(id || '')); return m ? m[1] : 'youtube'; };
  const cleanCond = c => { const o = {}; for (const k of COND) { const v = c && c[k]; if (typeof v === 'string' && v.trim()) o[k] = v.trim().slice(0, 100); } return o; };
  const norm = list => (Array.isArray(list) ? list : []).slice(0, 50).map(r => ({ name: String((r && r.name) || '').slice(0, 60), cond: cleanCond(r && r.cond), channel_id: String((r && r.channel_id) || ''), active: r && (r.active === 0 || r.active === false) ? 0 : 1 }));
  const M = {
    COND, platformOf, norm,
    add: (rules, r) => norm([...rules, r || { name: '', cond: {}, channel_id: '', active: 1 }]),
    remove: (rules, i) => rules.filter((_, j) => j !== i),
    /** drag & drop / ↑↓ keys: move item from → to (clamped). */
    move(rules, from, to) { const a = rules.slice(); if (from < 0 || from >= a.length) return a; to = Math.max(0, Math.min(a.length - 1, to)); const [x] = a.splice(from, 1); a.splice(to, 0, x); return a; },
    patch: (rules, i, p) => rules.map((r, j) => (j === i ? norm([{ ...r, ...p, cond: p.cond ? { ...r.cond, ...p.cond } : r.cond }])[0] : r)),
    toggle: (rules, i) => rules.map((r, j) => (j === i ? { ...r, active: r.active ? 0 : 1 } : r)),
    /** Problems shown inline before save: empty condition, unknown/paused channel, a rule hidden by an identical earlier rule on the same platform. */
    validate(rules, channels) {
      const ch = new Map((channels || []).map(c => [c.channel_id, c])), errs = [], seen = new Map();
      rules.forEach((r, i) => {
        if (!Object.keys(r.cond || {}).length) errs.push({ i, code: 'empty-condition' });
        const c = ch.get(r.channel_id); if (!c) errs.push({ i, code: 'bad-channel' }); else if (c.cfg && !c.cfg.active) errs.push({ i, code: 'channel-paused', warn: true });
        const key = platformOf(r.channel_id) + '|' + JSON.stringify(Object.entries(r.cond || {}).sort());
        if (r.active && seen.has(key)) errs.push({ i, code: 'shadowed', by: seen.get(key), warn: true }); else if (r.active) seen.set(key, i);
      });
      return errs;
    },
    dirty: (a, b) => JSON.stringify(norm(a)) !== JSON.stringify(norm(b)),
    /** Payload for POST /api/distribution {op:'rules_set'}. */
    toPayload: (rules, fallback) => ({ op: 'rules_set', rules: norm(rules), fallback: fallback || null }),
  };
  g.DistRules = M;
  if (typeof module !== 'undefined' && module.exports) module.exports = M;
})(typeof self !== 'undefined' ? self : globalThis);
