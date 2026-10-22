/* Multi-channel distribution engine (pure; tests: scripts/test/distribution.mjs). Used by functions/api/distribution.js.
 * route(): ordered rules, first match wins, fallback = default channel · schedule(): per-channel daily cap, minimum spacing, posting windows in the channel's own time zone,
 * ±20 min jitter, no repeated title / cover, no same template back-to-back · zoned time helpers (DST-safe). */
const MIN = 60e3, DAY = 864e5;
export const DEFAULT_CFG = { role: 'social', types: [], topics: [], skills: [], cefr: [], regions: [], lang: 'en', daily_cap: 2, min_gap_min: 240, windows: [{ from: '09:00', to: '21:00' }], tz: 'America/New_York', active: 1 };
const list = v => (Array.isArray(v) ? v : typeof v === 'string' ? v.split(/[,\s]+/) : []).map(x => String(x).trim()).filter(Boolean);
const hm = t => { const m = /^(\d{2}):(\d{2})$/.exec(String(t)); return m && +m[1] < 24 && +m[2] < 60 ? +m[1] * 60 + +m[2] : null; };
export const validTz = tz => { try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); return typeof tz === 'string' && tz.length < 60; } catch (e) { return false; } };
/** Untrusted channel settings → canonical (caps clamped, windows validated). */
export function normCfg(c = {}) {
  const d = DEFAULT_CFG, cap = Math.floor(+c.daily_cap), gap = Math.floor(+c.min_gap_min);
  const wins = (Array.isArray(c.windows) ? c.windows : d.windows).map(w => ({ from: String(w && w.from), to: String(w && w.to) })).filter(w => hm(w.from) != null && hm(w.to) != null && hm(w.to) > hm(w.from)).slice(0, 6);
  return { label: String(c.label || '').slice(0, 60), purpose: String(c.purpose || '').slice(0, 200), account: String(c.account || '').slice(0, 80), types: list(c.types).filter(x => ['short', 'long', 'podcast'].includes(x)), topics: list(c.topics).slice(0, 30), skills: list(c.skills).slice(0, 10), cefr: list(c.cefr).map(x => x.toUpperCase()).slice(0, 6),
    regions: list(c.regions).map(x => x.toUpperCase()).slice(0, 40), role: c.role === 'embed' ? 'embed' : 'social', lang: String(c.lang || d.lang).slice(0, 8), daily_cap: cap >= 1 && cap <= 50 ? cap : d.daily_cap, min_gap_min: gap >= 0 && gap <= 1440 ? gap : d.min_gap_min,
    windows: wins.length ? wins : d.windows, tz: validTz(c.tz) ? c.tz : d.tz, active: c.active === 0 || c.active === false ? 0 : 1 };
}
/** clip: {type, topic, sub, skill, cefr, exam, template, region?}. Empty list in a channel's settings = anything allowed. */
export function blockOf(cfg, clip) {
  if (!cfg) return 'no-channel'; if (!cfg.active) return 'paused'; // role: 'embed' = unlisted lesson host (never public), 'social' = growth channel (_role_meta.js)
  if (cfg.types.length && !cfg.types.includes(clip.type)) return 'type';
  if (cfg.topics.length && !cfg.topics.some(t => t === clip.topic || t === clip.sub)) return 'topic';
  if (cfg.skills.length && !cfg.skills.includes(clip.skill)) return 'skill';
  if (cfg.cefr.length && !cfg.cefr.includes(String(clip.cefr || '').toUpperCase())) return 'cefr';
  return '';
}
export const allowed = (cfg, clip) => !blockOf(cfg, clip);
const condOk = (cond, clip) => Object.entries(cond || {}).every(([k, want]) => {
  const w = list(want).map(x => x.toLowerCase()); if (!w.length) return true;
  const have = k === 'topic' ? [clip.topic, clip.sub] : k === 'region' ? list(clip.regions || clip.region) : [clip[k]];
  return have.some(h => h && w.includes(String(h).toLowerCase()));
});
/** rules: [{cond, channel_id, active}] in order; cfgs: {channel_id: cfg}. → {channel_id, rule: index|-1(fallback)} or {channel_id:null, why}. */
export function route(rules, cfgs, clip, fallback) {
  for (let i = 0; i < rules.length; i++) { const r = rules[i]; if (r.active === 0 || !condOk(r.cond, clip)) continue; if (allowed(cfgs[r.channel_id], clip)) return { channel_id: r.channel_id, rule: i }; }
  if (fallback && allowed(cfgs[fallback], clip)) return { channel_id: fallback, rule: -1 };
  return { channel_id: null, why: fallback && cfgs[fallback] && !cfgs[fallback].active ? 'fallback-paused' : 'no-channel' };
}
/** Several embed channels share the lessons: pick one for a clip. embedCfgs {channel_id: cfg}, counts {channel_id: {today, total}}, clip may carry channel_id (already planned/uploaded there).
 *  Sticky: a clip with a video stays on its channel; a planned clip stays while that channel is still usable. Otherwise: only active embed channels that allow the clip, least loaded today → in total → hash of the clip id. */
export function pickEmbed(embedCfgs, counts, clip) {
  const ok = Object.entries(embedCfgs || {}).filter(([, c]) => c && c.role === 'embed' && allowed(c, clip)).map(([id]) => id), cur = clip.channel_id;
  if (cur && (clip.video_id ? embedCfgs && embedCfgs[cur] : ok.includes(cur))) return cur;
  const n = (id, k) => ((counts || {})[id] || {})[k] || 0;
  ok.sort((a, b) => n(a, 'today') - n(b, 'today') || n(a, 'total') - n(b, 'total') || hash(clip.id + a) - hash(clip.id + b) || (a < b ? -1 : 1));
  return ok[0] || null;
}
/** Channel id → platform. YouTube = our OAuth channel ids (UC…); social channels mirrored from GrabCast use "gc-<platform>-<account id>". */
export const platformOf = id => { const m = /^gc-([a-z_]+)-/.exec(String(id || '')); return m ? m[1] : 'youtube'; };
/** Multi-platform routing: first match wins PER PLATFORM (a clip gets ≤ 1 channel per platform); the fallback channel only covers YouTube. */
export function routeAll(rules, cfgs, clip, fallback) {
  const out = {};
  rules.forEach((r, i) => { const p = platformOf(r.channel_id); if (r.active === 0 || out[p] || !condOk(r.cond, clip) || !allowed(cfgs[r.channel_id], clip)) return; out[p] = { channel_id: r.channel_id, rule: i, platform: p }; });
  if (!out.youtube && fallback && allowed(cfgs[fallback], clip)) out.youtube = { channel_id: fallback, rule: -1, platform: 'youtube' };
  return Object.values(out);
}
/** Rules editor "test a clip": why each rule wins / misses (off · no-match:<cond> · blocked:<cfg field> · shadowed = platform already taken) + final routes. */
export function explain(rules, cfgs, clip, fallback) {
  const won = new Set(), trace = rules.map((r, i) => {
    const p = platformOf(r.channel_id), base = { i, channel_id: r.channel_id, platform: p };
    if (r.active === 0) return { ...base, result: 'off' };
    const miss = Object.keys(r.cond || {}).find(k => !condOk({ [k]: r.cond[k] }, clip)); if (miss) return { ...base, result: 'no-match', why: miss };
    const why = blockOf(cfgs[r.channel_id], clip); if (why) return { ...base, result: 'blocked', why };
    if (won.has(p)) return { ...base, result: 'shadowed' };
    won.add(p); return { ...base, result: 'win' };
  });
  return { trace, routes: routeAll(rules, cfgs, clip, fallback) };
}
// ---- time zones ----
const fmt = new Map();
const parts = (ms, tz) => { let f = fmt.get(tz); if (!f) { f = new Intl.DateTimeFormat('en-CA', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }); fmt.set(tz, f); } const o = {}; for (const p of f.formatToParts(new Date(ms))) o[p.type] = p.value; return o; };
export const localDate = (ms, tz) => { const p = parts(ms, tz); return `${p.year}-${p.month}-${p.day}`; };
export const localHM = (ms, tz) => { const p = parts(ms, tz); return `${p.hour}:${p.minute}`; };
/** local 'YYYY-MM-DD' + 'HH:MM' in tz → UTC ms (two-pass offset; correct across DST except the non-existent hour). */
export function zonedToMs(date, time, tz) {
  const [y, mo, d] = date.split('-').map(Number), m = hm(time), guess = Date.UTC(y, mo - 1, d, Math.floor(m / 60), m % 60);
  const off = ms => { const p = parts(ms, tz); return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute) - ms; };
  let t = guess - off(guess); t = guess - off(t); return t;
}
const addDays = (date, n) => { const d = new Date(date + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const hash = s => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; };
const norm = t => String(t || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
/**
 * Plan slots for ONE channel. clips: ordered [{id, title, cover, template}] to place; existing: [{ms, clip?, template?, title?, cover?}] already planned/posted on this channel.
 * Never exceeds daily_cap, keeps ≥ min_gap between any two posts (both directions), stays inside the windows (local time of cfg.tz), jitter ±20 min (deterministic per clip),
 * skips a clip whose title/cover already exists on the channel, avoids the same template back-to-back (reorders when possible).
 * → { slots: [{id, ms}], skipped: [{id, why}] }
 */
export function schedule({ clips, cfg, existing = [], now = Date.now(), horizonDays = 45, jitterMin = 20, rand = hash }) {
  const gap = cfg.min_gap_min * MIN, taken = existing.map(e => e.ms).sort((a, b) => a - b), perDay = {}, titles = new Set(existing.map(e => norm(e.title)).filter(Boolean)), covers = new Set(existing.map(e => e.cover).filter(Boolean));
  for (const ms of taken) { const d = localDate(ms, cfg.tz); perDay[d] = (perDay[d] || 0) + 1; }
  let lastTpl = (existing.slice().sort((a, b) => a.ms - b.ms).pop() || {}).template || '';
  const out = { slots: [], skipped: [] }, queue = clips.slice(), start = localDate(now + 15 * MIN, cfg.tz);
  while (queue.length) {
    let i = queue.findIndex(c => c.template !== lastTpl); if (i < 0) i = 0; const c = queue.splice(i, 1)[0];
    if ((norm(c.title) && titles.has(norm(c.title))) || (c.cover && covers.has(c.cover))) { out.skipped.push({ id: c.id, why: 'duplicate' }); continue; }
    let placed = null; const earliest = Math.max(now + 15 * MIN, out.slots.length ? out.slots[out.slots.length - 1].ms + gap : 0); // monotone inside one batch → template order = time order
    for (let dd = 0; dd <= horizonDays && placed == null; dd++) {
      const date = addDays(start, dd); if ((perDay[date] || 0) >= cfg.daily_cap) continue;
      for (const w of cfg.windows) {
        const ws = zonedToMs(date, w.from, cfg.tz), we = zonedToMs(date, w.to, cfg.tz); let t = Math.max(ws, earliest);
        for (let k = 0; k < 60; k++) { const clash = taken.find(s => Math.abs(s - t) < gap); if (!clash) break; t = Math.max(t, clash + gap); }
        if (t > we || taken.some(s => Math.abs(s - t) < gap)) continue;
        const j = Math.round((rand(c.id + date) * 2 - 1) * jitterMin) * MIN, tj = t + (t + j < Math.max(ws, earliest) ? -j : j); // reflect instead of clamping so the spread stays natural
        placed = tj >= Math.max(ws, earliest) && tj <= we && !taken.some(s => Math.abs(s - tj) < gap) ? tj : t; break;
      }
    }
    if (placed == null) { out.skipped.push({ id: c.id, why: 'no-slot' }); continue; }
    taken.push(placed); taken.sort((a, b) => a - b); const d = localDate(placed, cfg.tz); perDay[d] = (perDay[d] || 0) + 1;
    if (norm(c.title)) titles.add(norm(c.title)); if (c.cover) covers.add(c.cover); lastTpl = c.template;
    out.slots.push({ id: c.id, ms: placed });
  }
  return out;
}
/** Spread several channels fairly: clips already routed → {channel_id: [clips]}; each channel is planned independently so a burst on one channel never leaks into another. */
export function planAll({ routed, cfgs, existing = {}, now }) {
  const res = {}; for (const [ch, clips] of Object.entries(routed)) res[ch] = schedule({ clips, cfg: cfgs[ch], existing: existing[ch] || [], now }); return res;
}
/** Health: pause reasons from sync errors / failed uploads (called after sync). */
export function healthVerdict({ error, failed = 0, limitFailed = 5 }) {
  if (error === 'yt-forbidden') return 'YouTube refused access (possible strike / limited state) – paused';
  if (error === 'yt-revoked') return 'Google access revoked – paused';
  if (failed >= limitFailed) return `${failed} failed uploads – paused`;
  return '';
}
