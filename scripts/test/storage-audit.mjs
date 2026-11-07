// Kiểm toán lưu trữ phía máy người học (docs/PERF-SCROLL.md › Lưu trữ): 7 ngày học giả lập trên dist cục bộ (Chromium thật, service worker
// chạy thật), mỗi ngày mở các màn học chính + tra 8 từ khác nhau + vào 1 bài đọc/nghe/ngữ pháp, rồi đo:
//   localStorage (byte UTF-16, khóa nặng nhất) · IndexedDB (mỗi DB: số bản ghi + byte ước tính) · Cache Storage (mỗi cache: số mục + byte thật)
//   + navigator.storage.estimate() (usage/usageDetails của Chromium).
// Hermetic: ?demo=1, máy CI chặn *.lexkite.com qua /etc/hosts (0 lượt chạm prod). Không dùng ctx.route (chặn route làm SW không thấy request thật).
// Dùng: node scripts/test/storage-audit.mjs http://localhost:8080 out/storage.json [--days 7] [--check budget.json]
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const base = (process.argv[2] || 'http://localhost:8080').replace(/\/$/, ''), out = process.argv[3] || 'out/storage.json';
const arg = k => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const DAYS = +(arg('--days') || 7), CHECK = arg('--check');
const WORDS = ['hello', 'book', 'travel', 'decide', 'weather', 'improve', 'borrow', 'quiet', 'market', 'healthy', 'invite', 'island', 'honest', 'repair', 'explain', 'journey', 'pocket', 'arrive', 'garden', 'promise', 'notice', 'bridge', 'remember', 'simple', 'teacher', 'window', 'answer', 'early', 'kitchen', 'measure', 'reason', 'season', 'switch', 'tired', 'value', 'whole', 'yellow', 'zero', 'brave', 'cloud', 'dream', 'enjoy', 'fresh', 'guess', 'heavy', 'join', 'large', 'mirror', 'nature', 'order', 'paint', 'quick', 'river', 'share', 'travel', 'usual'];
const HUBS = [['#/reading', '#view a[href^="#/read/"]'], ['#/listening', '#view a[href^="#/listen/"]'], ['#/grammar', '#view a[href^="#/grammar/"]'], ['#/say', '#sayList a'], ['#/roleplay', '#view a[href^="#/roleplay/"]'], ['#/call', '#view a[href^="#/call/"]'], ['#/topic/environment', null]];
const DAILY = ['#/home', '#/review', '#/lesson/go', '#/path', '#/train', '#/vocab', '#/me', '#/stats'];
const sleep = ms => new Promise(r => setTimeout(r, ms));

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 412, height: 823 }, isMobile: true, hasTouch: true, locale: 'vi-VN', serviceWorkers: 'allow' });
await ctx.addInitScript(() => { try { localStorage.setItem('lk.noTrack', '1'); } catch (e) { /* bỏ qua */ } });
const pg = await ctx.newPage();
const T0 = Date.parse('2026-11-01T08:00:00');
const go = async h => { await pg.evaluate(x => { location.hash = x; }, h).catch(() => {}); await sleep(1600); };
const tap = async n => { // chạm vài nút trong màn (trả lời thẻ, mở bước) – như người học thật, không mở trang ngoài
  for (const bt of (await pg.locator('#view button:visible').all()).slice(0, n)) { try { await bt.tap({ timeout: 1500 }); await sleep(500); } catch (e) { /* bị che */ } }
};
for (let d = 0; d < DAYS; d++) {
  await pg.clock.setFixedTime(new Date(T0 + d * 864e5)); // Date.now() = ngày d (SRS, chuỗi ngày, nhật ký) – hẹn giờ vẫn chạy thật
  await pg.goto(`${base}/app/?demo=1&hl=vi#/home`, { waitUntil: 'load', timeout: 90000 }).catch(() => {});
  await sleep(2500);
  for (const h of DAILY) { await go(h); await tap(h === '#/review' ? 6 : 2); }
  for (const w of WORDS.slice(d * 8, d * 8 + 8)) await go('#/dict/' + w);
  const [hub, sel] = HUBS[d % HUBS.length]; await go(hub);
  if (sel) { const a = pg.locator(sel).nth(d % 3); if (await a.count()) { await a.click({ timeout: 2000 }).catch(() => {}); await sleep(1800); await tap(3); } }
}
await sleep(3000); // ghi cache/IDB đang dở

const r = await pg.evaluate(async () => {
  const enc = s => (s == null ? 0 : String(s).length * 2); // localStorage lưu UTF-16
  const ls = Object.keys(localStorage).map(k => [k, enc(k) + enc(localStorage.getItem(k))]).sort((a, b) => b[1] - a[1]);
  const size = v => { if (v == null) return 0; if (v instanceof Blob) return v.size; if (v instanceof ArrayBuffer) return v.byteLength; if (ArrayBuffer.isView(v)) return v.byteLength; if (typeof v === 'string') return v.length * 2; try { return new Blob([JSON.stringify(v)]).size; } catch (e) { return 0; } };
  const idb = [];
  for (const { name } of (indexedDB.databases ? await indexedDB.databases() : [])) {
    const db = await new Promise((y, n) => { const q = indexedDB.open(name); q.onsuccess = () => y(q.result); q.onerror = () => n(q.error); }).catch(() => null);
    if (!db) continue;
    const stores = [];
    for (const s of db.objectStoreNames) {
      const st = await new Promise(y => { let n = 0, bytes = 0; const c = db.transaction(s).objectStore(s).openCursor(); c.onsuccess = () => { const x = c.result; if (!x) return y({ store: s, n, bytes }); n++; bytes += size(x.value) + size(x.key); x.continue(); }; c.onerror = () => y({ store: s, n, bytes }); });
      stores.push(st);
    }
    db.close(); idb.push({ db: name, n: stores.reduce((a, x) => a + x.n, 0), bytes: stores.reduce((a, x) => a + x.bytes, 0), stores });
  }
  const cs = [];
  for (const k of await caches.keys()) {
    const c = await caches.open(k), reqs = await c.keys(); let bytes = 0; const big = [];
    for (const q of reqs) { const res = await c.match(q); const n = res ? (await res.clone().blob()).size : 0; bytes += n; big.push([new URL(q.url).pathname.slice(0, 80), n]); }
    big.sort((a, b) => b[1] - a[1]);
    const kinds = {}; for (const [p, n] of big) { const t = (/\.(\w+)$/.exec(p) || [, 'other'])[1]; kinds[t] = (kinds[t] || 0) + n; }
    cs.push({ cache: k, n: reqs.length, bytes, kinds, top: big.slice(0, 5) });
  }
  const est = navigator.storage && navigator.storage.estimate ? await navigator.storage.estimate() : {};
  const persisted = navigator.storage && navigator.storage.persisted ? await navigator.storage.persisted() : null;
  return { ls: { n: ls.length, bytes: ls.reduce((a, x) => a + x[1], 0), top: ls.slice(0, 8) }, idb, cs, est: { usage: est.usage, details: est.usageDetails }, persisted, sw: !!(navigator.serviceWorker && navigator.serviceWorker.controller) };
});
await b.close();

const KB = n => (n / 1024).toFixed(0) + ' KB';
const tot = { ls: r.ls.bytes, idb: r.idb.reduce((a, x) => a + x.bytes, 0), cache: r.cs.reduce((a, x) => a + x.bytes, 0) };
console.log(`== ${DAYS} ngày học · SW ${r.sw ? 'điều khiển trang' : 'CHƯA điều khiển'} · persisted=${r.persisted} · estimate ${KB(r.est.usage || 0)} ${JSON.stringify(Object.fromEntries(Object.entries(r.est.details || {}).map(([k, v]) => [k, KB(v)])))}`);
console.log(`localStorage ${KB(tot.ls)} (${r.ls.n} khóa) – nặng nhất: ${r.ls.top.map(([k, n]) => `${k} ${KB(n)}`).join(' · ')}`);
for (const x of r.idb) console.log(`IndexedDB ${x.db}: ${x.n} bản ghi ${KB(x.bytes)} – ${x.stores.map(s => `${s.store} ${s.n}/${KB(s.bytes)}`).join(' · ')}`);
for (const x of r.cs) console.log(`Cache ${x.cache}: ${x.n} mục ${KB(x.bytes)} – ${Object.entries(x.kinds).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, n]) => `${k} ${KB(n)}`).join(' · ')}`);
console.log(`TỔNG localStorage ${KB(tot.ls)} · IndexedDB ${KB(tot.idb)} · Cache ${KB(tot.cache)}`);
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify({ days: DAYS, tot, ...r }, null, 1));

if (CHECK) { // ngân sách chỉ siết (ci-policy): byte tối đa mỗi loại sau DAYS ngày, localStorage không chứa giá trị > lsItemMax
  const B = JSON.parse(fs.readFileSync(CHECK, 'utf8')), bad = [];
  for (const k of ['ls', 'idb', 'cache']) if (B[k] != null && tot[k] > B[k]) bad.push(`${k} ${KB(tot[k])} > ${KB(B[k])}`);
  if (B.lsItemMax != null) for (const [k, n] of r.ls.top) if (n > B.lsItemMax) bad.push(`localStorage['${k}'] ${KB(n)} > ${KB(B.lsItemMax)} – dữ liệu lớn để IndexedDB`);
  if (bad.length) { console.error('✗ storage-audit vượt ngân sách:\n  ' + bad.join('\n  ')); process.exit(1); }
  console.log('✓ storage-audit trong ngân sách ' + CHECK);
}
