// Clip library at scale: filter ↔ URL/query mapping (client = server), selection logic (O(1) "select all N"), sections, sort/paging, schedule spreading, CSV safety.
// Run: node scripts/test/clip-bulk.mjs (no network)
import fs from 'node:fs';
import { JSDOM } from 'jsdom';
let fails = 0, n = 0; const ok = (c, m) => { n++; if (!c) { fails++; console.log('✗', m); } };
const dom = new JSDOM('<!doctype html><body></body>', { url: 'https://lexkite.com/admin.html#video', runScripts: 'outside-only' });
dom.window.eval(fs.readFileSync('web/js/admin-clips.js', 'utf8'));
const P = dom.window.AdminClips.pure, L = await import('../../functions/api/_clip_logic.js');
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// ---- filter → query → filter, and the server accepts exactly what the client sends ----
const f0 = { section: 'pending', q: 'coffee', template: 'choose', cefr: 'A2', status: 'ready', qmin: 40, qmax: 90, from: '2026-10-01', to: '2026-10-22', dt: 'slot', hidden: true, group: 'template', sort: 'qa', dir: 'asc', channel: 'UCabc12345' };
const qs = P.toQuery(f0), back = P.fromQuery('?' + qs);
ok(eq(L.normFilter(back), L.normFilter(f0)), 'filter → URL → filter is lossless (server view)');
ok(P.toQuery({ sort: 'created', dir: 'desc', q: '' }) === '', 'defaults / empty values are not written to the URL');
ok(!('evil' in P.fromQuery('evil=1&q=x&qmin=abc')) && P.fromQuery('qmin=abc').qmin === undefined && P.fromQuery('hidden=1').hidden === true, 'unknown keys dropped, bad numbers ignored');
const nf = L.normFilter({ status: 'x; DROP', sort: 'hax', dir: 'up', qmin: 'abc', from: '2026-13', group: 'evil', section: 'nope', q: 'a'.repeat(500), template: { $ne: 1 } });
ok(!nf.status && nf.sort === 'created' && nf.dir === 'desc' && nf.qmin === undefined && !nf.from && !nf.group && !nf.section && nf.q.length <= 80 && !nf.template, 'server normFilter whitelists everything');

// ---- selection ----
const s = P.makeSel(), ids = Array.from({ length: 5000 }, (_, i) => 'c' + i);
let t0 = performance.now(); s.setAll(); const dt = performance.now() - t0;
ok(s.all && s.count(5000) === 5000 && dt < 20, 'select all 5 000 matching is O(1) (' + dt.toFixed(2) + ' ms)');
s.toggle('c7'); s.toggle('c9'); ok(!s.has('c7') && s.has('c8') && s.count(5000) === 4998, 'toggle off inside select-all = exclusion');
s.toggle('c7'); ok(s.has('c7') && s.count(5000) === 4999, 'toggle back removes the exclusion');
s.clear(); s.add(['a', 'b']); s.toggle('b'); ok(s.has('a') && !s.has('b') && s.count(10) === 1, 'page select + toggle');
ok(eq(P.range(['a', 'b', 'c', 'd', 'e'], 'b', 'd'), ['b', 'c', 'd']) && eq(P.range(['a', 'b', 'c', 'd'], 'd', 'b'), ['b', 'c', 'd']) && eq(P.range(['a', 'b'], 'zz', 'b'), ['b']), 'shift-click range (either direction, anchor missing)');
ok(P.csv([{ a: '=cmd()', b: 'x,"y"' }]).split('\n')[1] === "'=cmd(),\"x,\"\"y\"\"\"", 'CSV: formula injection neutralised + quoting');

// ---- sections / filters ----
const it = (id, o = {}) => ({ id, qa: { status: 'pass', ok: 40, fail: 0 }, created: '2026-10-2' + (id.length % 9) + 'T00:00:00Z', template: 'choose', scene: 'cafe', ...o });
const ctx = { review: { rej: { state: 'rejected', reason: 'old' }, pau: { state: 'paused' }, del: { deleted: 1 }, off: { web: 0 } }, queue: { app: { status: 'manual' }, rdy: { status: 'manual' }, upl: { status: 'done', video_id: 'V' }, off: { status: 'done', video_id: 'V2' } }, pack: { rdy: 1 }, web: { upl: 'V', off: 'V2' }, views: { app: { view: 100, done: 40 } } };
const items = ['pend', 'app', 'rdy', 'upl', 'off', 'rej', 'pau', 'del'].map(id => it(id)).concat([it('bad', { qa: { status: 'fail', ok: 20, fail: 20 } }), it('noscore', { qa: { status: 'pass' } })]);
const rows = items.map(x => ({ it: x, v: L.viewOf(x, ctx) })), sec = Object.fromEntries(rows.map(r => [r.it.id, L.sectionOf(r.it, r.v)]));
ok(sec.pend === 'pending' && sec.app === 'approved' && sec.rdy === 'approved' && sec.upl === 'live' && sec.off === 'live' && sec.rej === 'archive' && sec.pau === 'archive' && sec.bad === 'fail', 'sections are exclusive: pending / approved / live / fail / archive');
const m = (f) => rows.filter(r => L.matches(r.it, r.v, L.normFilter(f), '2026-10-22')).map(r => r.it.id).join();
ok(m({}) === 'pend,app,rdy,upl,off,bad,noscore', 'default view hides rejected / paused / deleted');
ok(m({ hidden: true }) === 'pend,app,rdy,upl,off,rej,pau,bad,noscore' && m({ section: 'archive' }) === 'rej,pau', 'toggle shows them; Archive section lists them');
ok(m({ status: 'ready' }) === 'rdy' && m({ status: 'web' }) === 'upl' && m({ status: 'fail' }) === 'bad', 'status filters (pack ready / on web / QA fail); web=0 hides from "on web"');
ok(m({ qmin: 45 }) === 'pend,app,rdy,upl,off,bad' && m({ qmax: 60 }) === 'bad' , 'QA score range (missing score never matches a range)');
ok(L.viewOf(items[1], ctx).completion === 0.4, 'completion = done / views');
// ---- sort / paging ----
const sorted = L.sortRows(rows, 'views', 'desc').map(r => r.it.id);
ok(sorted[0] === 'app' && sorted.length === rows.length, 'sort by views');
const q2 = L.sortRows(rows, 'qa', 'asc').map(r => r.it.id); ok(q2[0] === 'bad' && q2[q2.length - 1] === 'noscore', 'sort by QA: missing score always last');
ok(eq(L.sortRows(rows, 'created', 'desc').map(r => r.it.id), L.sortRows(rows.slice().reverse(), 'created', 'desc').map(r => r.it.id)), 'ties broken by id → stable cursor paging');
const big = Array.from({ length: 5000 }, (_, i) => ({ it: it('x' + String(i).padStart(4, '0')), v: {} })); t0 = performance.now(); const pg = L.pageOf(L.sortRows(big, 'created', 'desc'), 4980, 60); const sd = performance.now() - t0;
ok(pg.rows.length === 20 && pg.next === null && pg.total === 5000 && L.pageOf(big, 0, 60).next === 60 && L.pageOf(big, 0, 99999).rows.length === 120, 'cursor paging (last page, limit capped at 120); sorting 5 000 = ' + sd.toFixed(0) + ' ms');
ok(L.groupKey({ created: '2026-10-21T01:00' }, 'date') === '2026-10-21' && P.groupKey({ template: 'choose' }, 'template') === 'choose' && P.groupKey({}, 'scene') === '–', 'group keys (client = server)');
// ---- schedule spreading ----
const sp = Array.from({ length: 10 }, (_, i) => L.spreadSlot(i, 10, { start: '2026-10-25', days: 5, from: '09:00', to: '21:00' }));
const perDay = {}; for (const x of sp) perDay[x.date] = (perDay[x.date] || 0) + 1;
ok(Object.keys(perDay).length === 5 && Object.values(perDay).every(c => c === 2) && sp[0].time === '09:00' && sp[1].time === '21:00' && sp[0].date === '2026-10-25' && sp[9].date === '2026-10-29', 'reschedule: 10 clips over 5 days, 2/day inside the window');
ok(sp.every(x => x.time >= '09:00' && x.time <= '21:00'), 'all slots inside the time window');
ok(L.spreadSlot(0, 3, { start: '2026-10-31', days: 3, from: '10:00', to: '10:00' }).date === '2026-10-31' && L.spreadSlot(2, 3, { start: '2026-10-31', days: 3, from: '10:00', to: '10:00' }).date === '2026-11-02', 'rolls over month end');
ok(!L.spreadSlot(0, 3, { start: 'x', days: 3 }) && !L.spreadSlot(0, 3, { start: '2026-10-25', days: 0 }) && !L.spreadSlot(0, 3, { start: '2026-10-25', days: 3, from: '21:00', to: '09:00' }) && !L.spreadSlot(5, 3, { start: '2026-10-25', days: 3 }), 'invalid parameters → null');

// ---- mounted UI on a 5 000-clip fixture (jsdom: logic, DOM budget, bulk batching/resume) ----
{
  const d2 = new JSDOM('<!doctype html><body><div id="h"></div></body>', { url: 'https://lexkite.com/admin.html?section=pending#video', runScripts: 'outside-only', pretendToBeVisual: true }), w = d2.window, calls = [];
  w.eval(fs.readFileSync('web/js/admin-clips.js', 'utf8')); w.confirm = () => true; w.prompt = () => 'v';
  const all = Array.from({ length: 5000 }, (_, i) => ({ id: 'clip-' + String(i).padStart(4, '0'), title: 'Clip ' + i, scene: 'cafe', template: i % 2 ? 'choose' : 'listen', created: '2026-10-21T00:00:00Z', qa: { status: 'pass', ok: 40, fail: 0 }, cover_url: null, _v: {} }));
  const capi = async (op, b) => { calls.push([op, b]);
    if (op === 'query') { const rows = all.filter(x => !b.filter.q || x.title.includes(b.filter.q)); const at = b.cursor || 0; return { rows: rows.slice(at, at + b.limit), total: rows.length, next: at + b.limit < rows.length ? at + b.limit : null, counts: { pending: rows.length, approved: 0, live: 0, fail: 0, archive: 0 }, facets: { template: ['choose', 'listen'] } }; }
    if (op === 'ids') return { ids: all.map(x => x.id), total: 5000 };
    if (op === 'bulk') return { results: b.ids.map(id => ({ id, ok: !(b.params.fail && id.endsWith('7')), why: 'qa' })) }; return {}; };
  const host = w.document.getElementById('h'); w.AdminClips.mount(host, { capi, esc: x => String(x ?? '').replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`), lang: () => 'en', toast: m => calls.push(['toast', m]), open: it => calls.push(['open', it.id]) });
  const wait = ms => new Promise(r => setTimeout(r, ms)); await wait(60);
  ok(host.querySelectorAll('.cl-c').length > 0 && host.querySelectorAll('.cl-c').length <= 60 && host.querySelectorAll('*').length < 700, 'mount: first page only, small DOM (' + host.querySelectorAll('*').length + ' nodes)');
  ok(/5,000 videos/.test(host.textContent) && host.querySelector('[data-cnt=pending]').textContent === '5,000' && host.querySelectorAll('.cl-tab').length === 5, 'sections with counts; total shown');
  host.querySelector('#cl-all').click(); ok(/5,000 selected/.test(host.querySelector('#cl-bar').textContent) && !calls.some(c => c[0] === 'ids'), 'select all 5 000: no id download');
  host.querySelector('.cl-c [data-ck]').click(); ok(/4,999 selected/.test(host.querySelector('#cl-bar').textContent), 'untick one → 4,999');
  host.querySelector('#cl-act').value = 'pause'; host.querySelector('#cl-act').dispatchEvent(new w.Event('change')); host.querySelector('#cl-go').click(); await wait(300);
  const bulks = calls.filter(c => c[0] === 'bulk'); ok(bulks.length === 50 && bulks.every(c => c[1].ids.length <= 100 && c[1].action === 'pause') && !bulks.some(c => c[1].ids.includes('clip-0000')), 'bulk runs in batches of ≤ 100, excluded clip never sent (' + bulks.length + ' calls)');
  ok(calls.some(c => c[0] === 'toast' && /Done: 4,999 succeeded/.test(c[1])), 'summary toast');
  ok(w.localStorage.getItem('lk.cl.job') === null, 'finished job leaves nothing to resume');
  host.querySelector('#cl-q').value = 'Clip 12'; host.querySelector('#cl-q').dispatchEvent(new w.Event('input')); await wait(40); const before = calls.filter(c => c[0] === 'query').length; await wait(260);
  ok(calls.filter(c => c[0] === 'query').length === before + 1 && w.location.search.includes('q=Clip+12'), 'search debounced (one query) and written to the URL');
}
console.log(`clip-bulk: ${n - fails}/${n} ok`); process.exit(fails ? 1 : 0);
