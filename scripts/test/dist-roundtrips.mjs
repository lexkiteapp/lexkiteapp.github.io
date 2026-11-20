// Regression (15/11): /api/distribution `get` took ~16 s because every channel config was read with its own D1 round trip (~400 ms each from the Worker)
// and `setup()` ran its 10-statement DDL batch on EVERY request. Fake D1 counts round trips. Run: node scripts/test/dist-roundtrips.mjs (no network)
import { chanCfgs, setup } from '../../functions/api/youtube.js';
let fails = 0, n = 0; const ok = (c, m) => { n++; if (!c) { fails++; console.log('✗', m); } };
function fakeDb(rows) {
  const db = { trips: 0, batches: 0, prepare(sql) { const st = { sql, bind() { return st; }, async all() { db.trips++; return { results: /yt_chan_cfg/.test(sql) ? rows : [] }; }, async first() { db.trips++; return null; }, async run() { db.trips++; return {}; } }; return st; }, async batch(list) { db.trips++; db.batches++; return list.map(() => ({ results: [] })); } };
  return db;
}
const rows = Array.from({ length: 30 }, (_, i) => ({ channel_id: 'UC' + i, cfg: JSON.stringify({ daily_cap: 1, lang: 'vi' }), paused_reason: i === 3 ? 'forbidden' : '' }));
const db = fakeDb(rows), m = await chanCfgs(db);
ok(db.trips === 1, 'all 30 channel configs read in ONE round trip (got ' + db.trips + ')');
ok(m.size === 30 && m.get('UC3').paused_reason === 'forbidden' && m.get('UC0').cfg.daily_cap === 1, 'configs parsed and normalised per channel');
const d2 = fakeDb([]); await setup(d2); const t1 = d2.trips; await setup(d2); await setup(d2);
ok(d2.trips === t1 && d2.batches === 1, 'setup() runs its DDL once per D1 binding, not on every request (batches=' + d2.batches + ')');
console.log(fails ? `FAIL ${fails}/${n}` : `OK ${n} checks`); process.exit(fails ? 1 : 0);
