// Multi-channel distribution engine: routing (first match, fallback), caps, spacing, windows across time zones (incl. DST), jitter, anti-spam, taxonomy/type filters.
// Run: node scripts/test/distribution.mjs (no network)
import * as D from '../../functions/api/_distribution.js';
import * as L from '../../functions/api/_clip_logic.js';
import * as T from '../../functions/api/_taxonomy.js';
let fails = 0, n = 0; const ok = (c, m) => { n++; if (!c) { fails++; console.log('✗', m); } };
const H = 3600e3, MIN = 60e3;
// ---- config normalisation ----
const c0 = D.normCfg({ daily_cap: 999, min_gap_min: -5, windows: [{ from: '21:00', to: '09:00' }, { from: '8:00', to: '10:00' }], tz: 'Mars/Base', types: 'short, bad', regions: 'in,pk' });
ok(c0.daily_cap === 2 && c0.min_gap_min === 240 && c0.windows.length === 1 && c0.tz === 'America/New_York' && c0.types.join() === 'short' && c0.regions.join() === 'IN,PK', 'normCfg clamps cap/gap, drops bad windows / tz / types, upper-cases regions');
// ---- routing ----
const cfgs = { A: D.normCfg({ label: 'Lexkite English' }), B: D.normCfg({ types: ['podcast'] }), C: D.normCfg({ topics: ['exam'] }), P: D.normCfg({ active: 0 }), S: D.normCfg({ types: ['short'] }) };
const rules = [{ cond: { type: 'podcast' }, channel_id: 'B' }, { cond: { topic: 'exam/ielts,exam/toeic' }, channel_id: 'C' }, { cond: { region: 'IN,PK' }, channel_id: 'P' }, { cond: { type: 'long' }, channel_id: 'S' }];
const clip = (o) => ({ id: 'c', type: 'short', topic: 'food', sub: 'food/cafe', skill: 'listening', cefr: 'A2', template: 'choose', ...o });
ok(D.route(rules, cfgs, clip({ type: 'podcast' }), 'A').channel_id === 'B', 'type=podcast → channel B');
ok(D.route(rules, cfgs, clip({ topic: 'exam', sub: 'exam/ielts' }), 'A').channel_id === 'C', 'topic=IELTS → channel C (sub-topic match)');
ok(D.route(rules, cfgs, clip({ type: 'podcast', sub: 'exam/ielts' }), 'A').rule === 0, 'first match wins');
ok(D.route(rules, cfgs, clip({ regions: ['IN'] }), 'A').channel_id === 'A', 'rule to a paused channel is skipped → fallback');
ok(D.route(rules, cfgs, clip({ type: 'long' }), 'A').channel_id === 'A', 'rule target not allowed for the type (short-only channel) → fallback');
ok(D.route(rules, cfgs, clip(), 'A').rule === -1 && D.route(rules, cfgs, clip(), null).channel_id === null && D.route(rules, cfgs, clip(), 'P').why === 'fallback-paused', 'fallback / no channel / paused fallback');
// ---- embed rotation ----
{ const E = o => D.normCfg({ role: 'embed', ...o }), cl = (id, o) => ({ id, type: 'short', topic: 'food', cefr: 'A2', ...o });
  const three = { E1: E({}), E2: E({}), E3: E({}) }, cnt = {}, got = {};
  for (let i = 0; i < 30; i++) { const p = D.pickEmbed(three, cnt, cl('clip-' + i)); got[p] = (got[p] || 0) + 1; (cnt[p] = cnt[p] || { today: 0, total: 0 }).today++; cnt[p].total++; }
  ok(Object.values(got).length === 3 && Object.values(got).every(v => v === 10), 'pickEmbed balances 30 clips across 3 embed channels (10 each)');
  const two = { E1: E({}), E2: E({}) }; ok(D.pickEmbed(two, { E1: { today: 3, total: 9 }, E2: { today: 0, total: 20 } }, cl('x1')) === 'E2' && D.pickEmbed(two, { E1: { today: 1, total: 9 }, E2: { today: 1, total: 20 } }, cl('x1')) === 'E1', 'least loaded today first, then total');
  ok(D.pickEmbed(two, {}, cl('same')) === D.pickEmbed(two, {}, cl('same')), 'deterministic tie-break');
  ok(D.pickEmbed(two, { E1: { today: 9, total: 9 } }, cl('s', { channel_id: 'E1' })) === 'E1' && D.pickEmbed(two, { E1: { today: 9, total: 9 } }, cl('s', { channel_id: 'E1', video_id: 'v' })) === 'E1', 'sticky: planned / uploaded clip stays on its channel');
  const bad = { E1: E({ active: 0 }), E2: E({}) };
  ok(D.pickEmbed(bad, {}, cl('s')) === 'E2' && D.pickEmbed(bad, {}, cl('s', { channel_id: 'E1' })) === 'E2' && D.pickEmbed(bad, {}, cl('s', { channel_id: 'E1', video_id: 'v' })) === 'E1', 'paused channel skipped for new uploads (a clip with a video keeps its channel)');
  ok(D.pickEmbed({ E1: E({ types: ['podcast'] }), E2: E({}) }, {}, cl('s')) === 'E2' && D.pickEmbed({ E1: E({ active: 0 }) }, {}, cl('s')) === null && D.pickEmbed({}, {}, cl('s')) === null, 'channel not allowing the clip skipped; none left → null');
  ok(D.pickEmbed({ E1: E({}) }, {}, cl('s')) === 'E1' && D.pickEmbed({ E1: E({}) }, {}, cl('s2')) === 'E1', 'a single embed channel still works'); }
// ---- time zones ----
ok(new Date(D.zonedToMs('2026-10-22', '09:00', 'Asia/Ho_Chi_Minh')).toISOString() === '2026-10-22T02:00:00.000Z', 'zonedToMs: Ho Chi Minh UTC+7');
ok(new Date(D.zonedToMs('2026-10-22', '09:00', 'America/New_York')).toISOString() === '2026-10-22T13:00:00.000Z' && new Date(D.zonedToMs('2026-11-02', '09:00', 'America/New_York')).toISOString() === '2026-11-02T14:00:00.000Z', 'zonedToMs: New York across the Nov 1 DST change');
ok(D.localDate(Date.parse('2026-10-22T23:30:00Z'), 'Asia/Kolkata') === '2026-10-23' && D.localHM(Date.parse('2026-10-22T23:30:00Z'), 'Asia/Kolkata') === '05:00', 'local date / time in India (UTC+5:30)');
// ---- scheduler ----
const now = Date.parse('2026-10-22T10:00:00Z'), mk = (k, o = {}) => Array.from({ length: k }, (_, i) => ({ id: 'k' + i, title: 'Title ' + i, cover: 'cv' + i, template: ['a', 'b', 'c'][i % 3], ...o }));
const cfg = D.normCfg({ daily_cap: 2, min_gap_min: 240, windows: [{ from: '09:00', to: '21:00' }], tz: 'America/New_York' });
const r = D.schedule({ clips: mk(9), cfg, now });
const byDay = {}; for (const s of r.slots) { const d = D.localDate(s.ms, cfg.tz); (byDay[d] = byDay[d] || []).push(s.ms); }
ok(r.slots.length === 9 && r.skipped.length === 0, 'all clips placed');
ok(Object.values(byDay).every(a => a.length <= 2), 'never more than the daily cap (' + Object.values(byDay).map(a => a.length).join('/') + ')');
const sorted = r.slots.map(s => s.ms).sort((a, b) => a - b); ok(sorted.every((t, i) => !i || t - sorted[i - 1] >= 240 * MIN), 'spacing ≥ 4 h between any two posts');
ok(r.slots.every(s => { const t = D.localHM(s.ms, cfg.tz); return t >= '09:00' && t <= '21:00'; }), 'every slot inside the 09:00–21:00 window of the channel time zone');
ok(sorted[0] >= now + 15 * MIN, 'nothing scheduled in the past / next 15 min');
const r2 = D.schedule({ clips: mk(9), cfg, now }); ok(JSON.stringify(r2) === JSON.stringify(r), 'deterministic (same input → same plan)');
const j = r.slots.map(s => (s.ms - D.zonedToMs(D.localDate(s.ms, cfg.tz), '09:00', cfg.tz)) / MIN); ok(new Set(j.map(x => Math.round(x))).size > 3, 'jitter makes times differ (no robotic identical minute)');
ok(D.schedule({ clips: mk(1), cfg, now, jitterMin: 20 }).slots.length === 1, 'jitter never pushes outside window');
// existing posts count against cap and spacing (both directions)
const ex = [{ ms: D.zonedToMs('2026-10-22', '15:00', cfg.tz) }, { ms: D.zonedToMs('2026-10-22', '19:30', cfg.tz) }];
const r3 = D.schedule({ clips: mk(1), cfg, existing: ex, now }); ok(D.localDate(r3.slots[0].ms, cfg.tz) !== '2026-10-22', 'day already at cap → next day');
const r4 = D.schedule({ clips: mk(1), cfg: { ...cfg, daily_cap: 5 }, existing: [{ ms: D.zonedToMs('2026-10-23', '12:00', cfg.tz) }], now: Date.parse('2026-10-23T00:00:00Z') }); const t4 = r4.slots[0].ms;
ok(Math.abs(t4 - D.zonedToMs('2026-10-23', '12:00', cfg.tz)) >= 240 * MIN, 'keeps ≥ gap from an existing post on both sides');
// window in another region (India evening) and DST day
const inCfg = D.normCfg({ tz: 'Asia/Kolkata', windows: [{ from: '18:00', to: '22:00' }], daily_cap: 1, min_gap_min: 60 }), ri = D.schedule({ clips: mk(3), cfg: inCfg, now });
ok(ri.slots.every(s => { const t = D.localHM(s.ms, 'Asia/Kolkata'); return t >= '18:00' && t <= '22:00'; }) && new Set(ri.slots.map(s => D.localDate(s.ms, 'Asia/Kolkata'))).size === 3, 'India: 1/day inside 18:00–22:00 IST');
const dstNow = Date.parse('2026-10-30T10:00:00Z'), rd = D.schedule({ clips: mk(6), cfg, now: dstNow }); ok(rd.slots.every(s => { const t = D.localHM(s.ms, cfg.tz); return t >= '09:00' && t <= '21:00'; }), 'windows hold across the US DST change');
// anti-spam
const dup = D.schedule({ clips: [{ id: 'x1', title: 'Order Coffee!', cover: 'c1', template: 'a' }, { id: 'x2', title: 'order coffee', cover: 'c2', template: 'b' }, { id: 'x3', title: 'Other', cover: 'c1', template: 'b' }, { id: 'x4', title: 'Fresh', cover: 'c4', template: 'b' }], cfg, now });
ok(dup.slots.map(s => s.id).sort().join() === 'x1,x4' && dup.skipped.map(s => s.why).join() === 'duplicate,duplicate', 'identical title / thumbnail on one channel skipped');
const same = D.schedule({ clips: [{ id: 'a1', title: 'A1', template: 'quiz' }, { id: 'a2', title: 'A2', template: 'quiz' }, { id: 'b1', title: 'B1', template: 'pov' }], cfg: { ...cfg, daily_cap: 9, min_gap_min: 10 }, now }).slots.sort((x, y) => x.ms - y.ms).map(s => s.id);
ok(same.join() === 'a1,b1,a2', 'no same template back-to-back when avoidable (' + same + ')');
ok(D.schedule({ clips: mk(1), cfg: { ...cfg, daily_cap: 1 }, existing: Array.from({ length: 46 }, (_, i) => ({ ms: D.zonedToMs(new Date(now + i * 864e5).toISOString().slice(0, 10), '12:00', cfg.tz) })), now, horizonDays: 40 }).skipped[0].why === 'no-slot', 'full horizon → no-slot, never over cap');
const pa = D.planAll({ routed: { A: mk(4), B: mk(4).map(c => ({ ...c, id: 'p' + c.id, title: 'Pod ' + c.id, cover: 'pc' + c.id })) }, cfgs: { A: cfg, B: D.normCfg({ ...cfg, tz: 'Asia/Kolkata', windows: [{ from: '18:00', to: '22:00' }], daily_cap: 1 }) }, now });
ok(pa.A.slots.length === 4 && pa.B.slots.length === 4 && new Set(pa.B.slots.map(s => D.localDate(s.ms, 'Asia/Kolkata'))).size === 4, 'channels are planned independently (own cap / window)');
ok(D.healthVerdict({ error: 'yt-forbidden' }) && D.healthVerdict({ failed: 5 }) && !D.healthVerdict({ failed: 2 }) && D.healthVerdict({ error: 'yt-revoked' }), 'health verdicts (forbidden / revoked / many failures)');
// ---- content type + taxonomy filters ----
const it = o => ({ id: 'x', qa: { status: 'pass' }, scene: 'airport', area: 'listening', duration: 25, ...o }), ctx = { review: {}, queue: {}, pack: {}, web: {}, views: {} };
const V = o => L.viewOf(it(o), ctx);
ok(V({}).type === 'short' && V({ duration: 300 }).type === 'long' && V({ audio_only: true, duration: 900 }).type === 'podcast' && V({ type: 'podcast' }).type === 'podcast', 'type: shorts default, long by duration, podcast by audio_only / explicit');
ok(V({}).topic === 'travel' && V({}).sub === 'travel/airport' && V({}).skill === 'listening' && V({ scene: 'cafe', area: 'grammar-check' }).skill === 'grammar', 'topic / sub-topic / skill derived from scene and area');
const fl = (f, o) => L.matches(it(o), V(o), L.normFilter(f), '2026-10-22');
ok(fl({ type: 'short' }, {}) && !fl({ type: 'long' }, {}) && fl({ topic: 'travel' }, {}) && fl({ topic: 'travel/airport' }, {}) && !fl({ topic: 'travel/hotel' }, {}) && fl({ skill: 'listening' }, {}) && !fl({ skill: 'speaking' }, {}), 'type / topic (parent + sub) / skill filters');
ok(!L.normFilter({ topic: 'evil/x' }).topic && !L.normFilter({ type: 'movie' }).type && L.normFilter({ exam: 'ielts' }).exam === 'ielts', 'taxonomy values are whitelisted');
ok(V({ chapters: [{}, {}], series: 's', episode: 3 }).chapters === 2 && V({ type: 'long' }).orientation === '' && V({}).orientation === 'vertical', 'forward-compatible fields: chapters, series/episode, orientation');
ok(T.TOPICS.every(t => t.sub.length && t.vi && t.en) && T.SKILLS.length === 5, 'taxonomy shape');
console.log(`distribution: ${n - fails}/${n} ok`); process.exit(fails ? 1 : 0);
