// 💰 Doanh thu THẬT (docs/ADS.md §5): parse báo cáo mẫu AdSense v2 + AdMob v1 (fixture), vị trí theo mã/tên ô, top 10 quốc gia + khác,
// kiểm gói (cleanRev), ghi đè 7 ngày theo diff vào D1 (node:sqlite), EXPLAIN dùng SEARCH (không SCAN), endpoint /api/ads-report (403/400/200),
// revPack + agg (bộ lọc khoảng/nền tảng/nước, kỳ trước, ước tính vs thật, CSV), RIÊNG TƯ (log không số tiền, không artifact, chỉ scope/API đọc, không token vào D1/trang công khai),
// Quản trị render có/không dữ liệu (jsdom: lọc → hash, sắp xếp, dòng tổng, hover, EN không lộ chữ Việt, axe). --no-dom: bỏ phần jsdom (CI ads-revenue.yml).
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { buildRows, readFixture, placeOf, rangeOf, adsenseUrl, admobBody, adsenseTable, admobTable, unitMap, payOf, repDay } from '../ads/report.mjs';
import { cleanRev, diffRev, revPack, reporting, stats, guardOf } from '../../functions/api/_ads.js';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';
import { authUrl, SCOPES, readClient } from '../ads-oauth.mjs';

let fails = 0, n = 0; const ok = (c, m) => { n++; if (!c) { fails++; console.error('✗ ' + m); } };
const FX = 'scripts/test/fixtures/ads-report', raw = readFixture(FX), map = unitMap();
globalThis.caches = { default: { match: async () => null, put: async () => {} } };

// ---- 1) parse ----
const { srcs, rows } = buildRows(raw, map);
const by = (src, dim) => rows.filter(r => r.src === src && r.dim === dim);
ok(srcs.join() === 'adsense,admob', 'cả 2 nguồn');
ok(by('adsense', 'total').length === 7 && by('admob', 'total').length === 7, 'tổng 7 ngày mỗi nguồn');
ok(by('adsense', 'total')[0].earn === 2000000 && by('adsense', 'total')[0].pv === 2000 && by('adsense', 'total')[0].imp === 1000, 'AdSense: tiền → micro-USD, PAGE_VIEWS, IMPRESSIONS');
ok(new Set(by('adsense', 'unit').map(r => r.key)).size === 3 && by('adsense', 'unit').every(r => /^web:(home|done|blog_mid)$/.test(r.key)), 'AdSense: ô theo tên → web:home/done/blog_mid');
const amk = [...new Set(by('admob', 'unit').map(r => r.key))].sort().join();
ok(amk === 'android:banner,android:inter,android:rew,ios:banner,ios:rew', 'AdMob: ô theo mã live trong config.js → banner/inter/rew: ' + amk);
const d0 = '2026-10-20', amUnits = by('admob', 'unit').filter(r => r.day === d0), amTot = by('admob', 'total').find(r => r.day === d0);
ok(amTot.earn === amUnits.reduce((s, r) => s + r.earn, 0) && amTot.imp === amUnits.reduce((s, r) => s + r.imp, 0), 'AdMob: tổng ngày = tổng các ô');
const ac = new Set(by('adsense', 'country').map(r => r.key));
ok(ac.size === 11 && ac.has('_o') && ac.has('US') && !ac.has('MX') && !ac.has('TH'), 'AdSense: 12 nước → top 10 + _o');
ok(new Set(by('admob', 'country').map(r => r.key)).size === 5, 'AdMob: 5 nước giữ nguyên');
ok(admobTable(raw.admob.unit)[0].DATE === '2026-10-20' && admobTable([{ header: {} }, { footer: {} }]).length === 0, 'AdMob: DATE 20261020 → ISO, bỏ header/footer');
ok(adsenseTable({}).length === 0 && buildRows({ adsense: null, admob: null }).srcs.length === 0, 'phản hồi rỗng → 0 dòng (không vỡ)');
ok(placeOf('x:1', 'Rewarded AI') === 'rew:ai' && placeOf('x', 'rew_hint') === 'rew:hint' && placeOf('x', 'Blog mid 1') === 'blog_mid' && placeOf('x', 'Dict') === 'dict' && placeOf('x', 'Interstitial') === 'inter' && placeOf('x', 'Weird unit') === 'u_weird_unit' && placeOf('x', '') === 'other', 'placeOf: tên ô → vị trí');
ok(placeOf('ca-pub-1:42', 'zzz', { 42: 'home' }) === 'home', 'placeOf: mã data-ad-slot trong config ưu tiên');
ok(rangeOf('2026-10-27').from === '2026-10-01' && rangeOf('2026-10-03').from === '2026-09-26' && rangeOf('2026-10-03').to === '2026-10-03', 'khoảng = 7 ngày ∪ tháng này');
const u = new URL(adsenseUrl(['DATE', 'AD_UNIT_ID'], ['ESTIMATED_EARNINGS'], { from: '2026-10-01', to: '2026-10-27' }));
ok(u.pathname === '/v2/accounts/pub-2290668854727752/reports:generate' && u.searchParams.get('startDate.month') === '10' && u.searchParams.get('endDate.day') === '27' && u.searchParams.getAll('dimensions').length === 2 && u.searchParams.get('currencyCode') === 'USD', 'AdSense URL đúng');
const ab = admobBody(['DATE', 'COUNTRY'], { from: '2026-09-28', to: '2026-10-05' }).reportSpec;
ok(ab.dateRange.startDate.month === 9 && ab.dateRange.endDate.day === 5 && ab.metrics.includes('MATCHED_REQUESTS') && ab.localizationSettings.currencyCode === 'USD', 'AdMob body đúng');
const au = new URL(authUrl('cid', 'http://127.0.0.1:5555/cb', 'ch', 'st'));
ok(au.searchParams.get('access_type') === 'offline' && au.searchParams.get('prompt') === 'consent' && au.searchParams.get('scope') === SCOPES.join(' ') && /adsense\.readonly/.test(SCOPES[0]) && /admob\.readonly/.test(SCOPES[1]), 'OAuth: offline + consent + 2 scope readonly');
ok(readClient(null, { ADS_OAUTH_CLIENT_ID: 'a', ADS_OAUTH_CLIENT_SECRET: 'b' }).id === 'a', 'OAuth: client từ env');

// ---- 2) cleanRev ----
const pkt = { from: '2026-10-20', to: '2026-10-26', srcs, rows };
ok(cleanRev(pkt).rows.length === rows.length, 'cleanRev: gói fixture hợp lệ');
const bad = p => { try { cleanRev(p); return false; } catch (e) { return /^bad:/.test(e.message); } };
ok(bad({ ...pkt, from: '2026-01-01' }) && bad({ ...pkt, srcs: ['x'] }) && bad({ ...pkt, rows: [...rows, rows[0]] }) && bad({ ...pkt, rows: [{ ...rows[0], earn: -1 }] }) && bad({ ...pkt, rows: [{ ...rows[0], day: '2026-11-01' }] }) && bad({ ...pkt, rows: [{ ...rows[0], key: "a'; DROP" }] }), 'cleanRev: chặn khoảng dài, nguồn lạ, trùng, số âm, ngoài khoảng, khóa lạ');

// ---- 3) D1 (node:sqlite giả D1) ----
let sqliteOk = true;
try {
  const { DatabaseSync } = await import('node:sqlite');
  const { DDL, SEL, store, onRequestPost } = await import('../../functions/api/ads-report.js');
  const sql = new DatabaseSync(':memory:');
  const conv = q => q.replace(/\?(\d+)/g, '?$1');
  const stmt = (q, a = []) => ({ bind: (...b) => stmt(q, b), all: async () => ({ results: sql.prepare(conv(q)).all(...a) }), run: async () => sql.prepare(conv(q)).run(...a), first: async () => sql.prepare(conv(q)).get(...a) || null, _q: q, _a: a });
  const db = { prepare: q => stmt(q), batch: async list => { for (const s of list) sql.prepare(conv(s._q)).run(...s._a); return []; } };
  sql.exec(DDL); sql.exec('CREATE TABLE config (k TEXT PRIMARY KEY, v TEXT, at INTEGER, by TEXT) WITHOUT ROWID');
  const plan = sql.prepare('EXPLAIN QUERY PLAN ' + SEL).all('2026-10-01', '2026-10-27').map(r => r.detail).join(' | ');
  ok(/SEARCH/.test(plan) && !/SCAN/.test(plan), 'EXPLAIN ads_rev theo khoảng ngày = SEARCH: ' + plan);
  const p1 = await store(db, cleanRev(pkt));
  ok(p1.written === rows.length && p1.deleted === 0, `lần 1: ghi ${p1.written} dòng`);
  const p2 = await store(db, cleanRev(pkt));
  ok(p2.written === 0 && p2.deleted === 0 && p2.same === rows.length, 'lần 2 cùng số: 0 dòng ghi');
  // Google sửa số ngày cuối + 1 khóa biến mất → ghi 1, xóa 1
  const fix = rows.map(r => (r.day === '2026-10-26' && r.src === 'adsense' && r.dim === 'total' ? { ...r, earn: r.earn + 5000 } : r)).filter(r => !(r.day === '2026-10-26' && r.key === 'web:done'));
  const p3 = await store(db, cleanRev({ ...pkt, rows: fix }));
  ok(p3.written === 1 && p3.deleted === 1, `ghi đè: sửa 1 + xóa 1 (${p3.written}/${p3.deleted})`);
  // Chỉ AdMob lấy được → không đụng dòng AdSense
  const p4 = await store(db, cleanRev({ ...pkt, srcs: ['admob'], rows: fix.filter(r => r.src === 'admob') }));
  ok(p4.deleted === 0 && sql.prepare("SELECT COUNT(*) c FROM ads_rev WHERE src = 'adsense'").get().c === fix.filter(r => r.src === 'adsense').length, 'nguồn lỗi (AdSense) không bị xóa khi chỉ AdMob về');
  const meta = JSON.parse(sql.prepare("SELECT v FROM config WHERE k = 'ads_report'").get().v);
  ok(meta.at > 0 && meta.srcs.join() === 'admob', 'config ads_report ghi thời điểm + nguồn');
  // ---- 4) revPack + agg (web/js/admin-ads.js, thuần) ----
  const rev = sql.prepare(SEL).all('2026-07-01', '2026-10-27');
  const ev = [{ day: '2026-10-25', kind: 'ad:imp:web:home', n: 1000 }, { day: '2026-10-25', kind: 'ad:show:android:inter', n: 100 }, { day: '2026-10-27', kind: 'ad:imp:web:home', n: 40 }, { day: '2026-10-27', kind: 'ad:click:web:home', n: 2 }, { day: '2026-10-25', kind: 'adc:a:ses', n: 400 }];
  const R = { ...revPack(rev, { at: 1, srcs: ['adsense', 'admob'] }, { balance: '$42.17', last: { amount: '$118.40', date: '2026-09-21' } }, ev, { web: 2, android: 10 }, '2026-10-27'), rt: '2026-10-27' };
  ok(R.connected && R.rows.length === rev.length && R.rows[0].length === 10 && R.live.imp === 40 && R.live.click === 2 && Math.abs(R.est['2026-10-25'].web - 2) < 1e-9 && R.ses['2026-10-25'] === 400, 'revPack: dòng gọn, bộ đếm hôm nay, ước tính/ngày, phiên');
  const AA = (() => { const w = {}; vm.runInNewContext(fs.readFileSync('web/js/admin-ads.js', 'utf8'), { window: w, URLSearchParams, Intl, Date, Math, Object, Array, String, Number, Set, JSON }); return w.AdminAds; })();
  const g = AA.agg(R, { r: '7d', p: 'all', c: '' }), tot = d => rev.filter(r => r.dim === 'total' && r.day >= d[0] && r.day <= d[1]).reduce((s, r) => s + r.earn, 0) / 1e6;
  ok(g.from === '2026-10-20' && g.to === '2026-10-26' && Math.abs(g.cur.usd - tot(['2026-10-20', '2026-10-26'])) < 1e-9 && g.prevFrom === '2026-10-13' && g.series.length === 7, '7 ngày = 20→26, tổng AdSense + AdMob, kỳ trước 13→19');
  ok(g.cur.ecpm > 0 && g.cur.fill > 0 && g.cur.fill <= 1 && g.cur.ctr > 0 && g.cur.rpm > 0 && !g.final, 'eCPM / lấp đầy / CTR / RPM; tháng này = ước tính');
  ok(AA.agg(R, { r: 'lm' }).final && AA.agg(R, { r: 'lm' }).from === '2026-09-01' && AA.agg(R, { r: 'lm' }).to === '2026-09-30' && !AA.agg(R, { r: 'lm' }).has, 'tháng trước = đã chốt; không có dòng → has=false (không số 0 vô nghĩa)');
  ok(AA.rangeOf('custom', '2026-10-27', '2026-10-21', '2026-12-01').join() === '2026-10-21,2026-10-27' && AA.rangeOf('custom', '2026-10-27', 'x', 'y')[0] === '2026-10-20' && AA.rangeOf('today', '2026-10-27').join() === '2026-10-27,2026-10-27', 'khoảng tùy chọn kẹp tới hôm nay; sai → 7 ngày');
  const gw = AA.agg(R, { r: '7d', p: 'web' }), gi = AA.agg(R, { r: '7d', p: 'ios' });
  ok(Math.abs(gw.cur.usd - rev.filter(r => r.src === 'adsense' && r.dim === 'total' && r.day >= '2026-10-20').reduce((s, r) => s + r.earn, 0) / 1e6) < 1e-9 && gw.places.every(x => x.plat === 'web') && gw.vs.length === 1, 'lọc web: AdSense, vị trí chỉ web');
  ok(gi.cur.imp > 0 && gi.places.every(x => x.plat === 'ios') && gi.cur.pv === 0 && gi.cur.rpm === null, 'lọc iOS: ô AdMob iOS, không RPM trang');
  const gc = AA.agg(R, { r: '7d', c: 'US' });
  ok(gc.cur.imp === rev.filter(r => r.dim === 'country' && r.key === 'US' && r.day >= '2026-10-20').reduce((s, r) => s + r.imp, 0) && gc.per1k === null, 'lọc nước US: dòng country cả 2 nguồn; /1.000 phiên tắt khi lọc');
  ok(Math.abs(g.per1k - g.cur.usd / 400 * 1000) < 1e-9, 'doanh thu / 1.000 phiên có QC');
  const vw = g.vs.find(v => v.plat === 'web');
  ok(Math.abs(vw.est - 2) < 1e-9 && Math.abs(vw.dev - (2 - vw.real) / vw.real) < 1e-9 && g.vs.find(v => v.plat === 'ios').dev === -1, 'ước tính vs thật: lệch %');
  ok(g.countries.some(c => c.cc === '_o') && g.ccs.includes('US') && g.places.some(p => p.place === 'rew:ai' || p.place === 'rew'), 'bảng nước có "khác", danh sách lọc nước');
  ok(AA.csvOf(['a', 'b'], [['x,y', 'q"z']]) === 'a,b\n"x,y","q""z"', 'CSV thoát dấu phẩy/ngoặc kép');
  const E = AA.agg({ ...revPack([], null, null, [], {}, '2026-10-27'), rt: '2026-10-27' }, { r: '7d' });
  ok(!E.has && E.cur.ecpm === null && E.places.length === 0 && E.today.imp === 0 && reporting({}).connected === false, 'rỗng: chưa nối, không vỡ');
  ok(payOf(raw.adsense ? JSON.parse(fs.readFileSync(FX + '/adsense-payments.json', 'utf8')) : {}).last.date === '2026-09-21' && payOf({}).balance === null, 'thanh toán: số dư + lần trả gần nhất');
  ok(/^\d{4}-\d{2}-\d{2}$/.test(repDay()) && repDay(Date.parse('2026-10-27T05:00:00Z')) === '2026-10-26', 'ngày báo cáo theo giờ Thái Bình Dương');
  // ---- 5) endpoint ----
  const env = { STUDIO_CALLBACK_SECRET: 'sec_ads_1', DB: db, SCHEMA_GATE: '0' };
  const post = (body, sec) => onRequestPost({ request: new Request('https://lexkite.com/api/ads-report', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(sec ? { 'X-Studio-Secret': sec } : {}) }, body: JSON.stringify(body) }), env });
  ok((await post(pkt, 'wrong')).status === 403 && (await post(pkt)).status === 403, 'endpoint: sai/thiếu secret → 403');
  ok((await post({ ...pkt, srcs: ['zzz'] }, 'sec_ads_1')).status === 400, 'endpoint: gói sai → 400');
  const okr = await post(pkt, 'sec_ads_1'), oj = await okr.json();
  ok(okr.status === 200 && oj.ok && oj.rows === rows.length && !JSON.stringify(oj).includes('sec_ads_1'), 'endpoint: 200, không lộ secret');
  ok((await onRequestPost({ request: new Request('https://x/api/ads-report', { method: 'POST', body: '{}' }), env: { DB: db } })).status === 503, 'endpoint: chưa cấu hình secret → 503');
  // không token/secret vào D1: trường lạ bị bỏ
  const leak = cleanRev({ ...pkt, refresh_token: 'rt_SECRET', rows: [{ ...rows[0], token: 'x' }] });
  ok(!JSON.stringify(leak).includes('SECRET') && !('token' in leak.rows[0]), 'gói bỏ trường lạ (token không bao giờ vào D1)');
  globalThis.__R = R;
} catch (e) { if (/node:sqlite/.test(String(e.message))) { sqliteOk = false; console.log('· node:sqlite không có – bỏ qua phần D1 (' + e.message + ')'); } else throw e; }

// ---- 6) Riêng tư: log CI không số tiền, workflow không artifact, chỉ API/scope đọc, trang công khai không chạm số doanh thu ----
{
  const sumF = 'scripts/test/fixtures/ads-report/.summary.tmp'; try { fs.unlinkSync(sumF); } catch (e) { /* chưa có */ }
  const out = spawnSync(process.execPath, ['scripts/ads/report.mjs', '--fixture', FX, '--dry'], { encoding: 'utf8', env: { ...process.env, GITHUB_STEP_SUMMARY: sumF } });
  const logs = out.stdout + out.stderr + (fs.existsSync(sumF) ? fs.readFileSync(sumF, 'utf8') : ''); try { fs.unlinkSync(sumF); } catch (e) { /* bỏ qua */ }
  const amounts = ['42.17', '118.40', ...rows.filter(r => r.dim === 'total').slice(0, 5).map(r => (r.earn / 1e6).toFixed(2))];
  ok(out.status === 0 && /dòng/.test(logs) && !/\$\s?\d/.test(logs) && !amounts.some(x => logs.includes(x)), 'log + step summary CI không có số tiền');
  for (const f of ['.github/workflows/ads-revenue.yml', '.github/workflows/ads-revenue-hourly.yml']) { const y = fs.readFileSync(f, 'utf8'); ok(!/upload-artifact|actions\/cache|git push|set -x/.test(y) && /permissions:\s*\n\s*contents: read/.test(y), f + ': không artifact/commit, quyền chỉ đọc'); }
  ok(/'41 \* \* \* \*'/.test(fs.readFileSync('.github/workflows/ads-revenue-hourly.yml', 'utf8')) && /--mode today/.test(fs.readFileSync('.github/workflows/ads-revenue-hourly.yml', 'utf8')), 'hằng giờ: 1 lần/giờ, chỉ hôm nay');
  const src = fs.readFileSync('scripts/ads/report.mjs', 'utf8'), gurls = [...src.matchAll(/https:\/\/[a-z0-9.]*googleapis\.com[^`'"]*/g)].map(m => m[0]);
  ok(gurls.length >= 4 && gurls.every(u => /oauth2\.googleapis\.com\/token|reports:generate|networkReport:generate|\/payments$/.test(u)), 'chỉ gọi API đọc báo cáo/thanh toán: ' + gurls.join(' '));
  ok(SCOPES.every(x => /\.readonly$/.test(x)) && SCOPES.length === 2, 'chỉ scope adsense.readonly + admob.readonly');
  const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => (e.isDirectory() ? (/^(i18n|vendor)$/.test(e.name) ? [] : walk(d + '/' + e.name)) : [d + '/' + e.name]));
  const pub = walk('web').filter(f => /\.(m?js|html)$/.test(f) && !/\/admin[^/]*\.(js|html)$/.test(f)).filter(f => /adsStats|ads_rev|ads-report|ads_pay/.test(fs.readFileSync(f, 'utf8')));
  ok(!pub.length, 'trang công khai không chạm số doanh thu: ' + pub.join(', '));
}

// ---- 7) Quản trị render có/không dữ liệu ----
if (!process.argv.includes('--no-dom')) {
  const { JSDOM } = await import('jsdom');
  const tick = (ms = 30) => new Promise(r => setTimeout(r, ms));
  const VI = /[ăâđêôơưàáạảãằắặẳẵầấậẩẫèéẹẻẽềếệểễìíịỉĩòóọỏõồốộổỗờớợởỡùúụủũừứựửữỳýỵỷỹ]/i;
  const today = '2026-10-27', ev = [{ day: '2026-10-25', kind: 'ad:imp:web:home', n: 1000 }, { day: '2026-10-25', kind: 'ad:req:web:home', n: 1100 }];
  const base = { at: Date.now(), today, ...stats(ev, today, { web: 2 }), guard: guardOf(ev, today, { prev: 1 }), ecpm: { web: 2, android: 1, ios: 1 } };
  const real = globalThis.__R;
  for (const [label, S] of [['có số thật', { ...base, real, reporting: { connected: true } }], ['chưa nối', { ...base, real: revPack([], null, null, [], {}, today), reporting: { connected: false } }]]) {
    if (label === 'có số thật' && !sqliteOk) continue;
    for (const lang of ['vi', 'en']) {
      const dom = new JSDOM(`<!doctype html><html lang="${lang}"><body><main id="main"></main></body></html>`, { url: 'https://lexkite.com/admin.html#ads/overview', runScripts: 'outside-only', pretendToBeVisual: true });
      const w = dom.window, doc = w.document;
      w.eval(fs.readFileSync('web/js/admin-ads.js', 'utf8')); w.eval(fs.readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8'));
      const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
      const L = (vi, vars) => (vars ? vi.replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? vars[k] : m)) : vi);
      const api = async op => { if (op === 'adsStats') return S; if (op === 'config') return { keys: [], values: {} }; throw new Error(op); };
      w.AdminAds.render(doc.getElementById('main'), api, L, { esc, lang: () => lang, toast: () => {}, confirm: async () => true });
      await tick(50);
      const body = doc.getElementById('ax-body'), t = body.textContent;
      if (label === 'có số thật') {
        ok(body.querySelectorAll('.ax-kpis .kpi').length === 6 && body.querySelectorAll('.ax-kpis .ax-sp').length === 6 && body.querySelectorAll('.ax-kpis .ax-d').length === 6 && body.querySelectorAll('.ax-i').length === 6 && !body.querySelector('[data-howto]'), `${lang}/${label}: 6 KPI có ▲▼, sparkline, (i)`);
        ok(body.querySelectorAll('.ax-lc').length === 2 && body.querySelector('tfoot') && body.querySelector('[data-csv]') && body.querySelector('.ax-dl') && /42\.17/.test(t), `${lang}/${label}: 2 biểu đồ, bảng có dòng tổng, CSV, thanh toán`);
        ok(lang === 'vi' ? /cập nhật lúc/.test(t) && /Ước tính nội bộ vs số thật/.test(t) && /Thái Bình Dương/.test(t) && /Đang diễn ra/.test(t) && /trễ vài giờ/.test(t) : /updated/.test(t) && /Internal estimate vs actual/.test(t) && /Pacific/.test(t), `${lang}/${label}: minh bạch – cập nhật lúc, múi giờ, trễ, đang diễn ra`);
        const lc = body.querySelector('.ax-lc'); lc.dispatchEvent(new w.Event('focus')); ok(!lc.querySelector('.ax-tip').hidden && /2026-10-26/.test(lc.querySelector('.ax-tip').textContent), `${lang}/${label}: focus biểu đồ → chú giải số`);
        lc.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'ArrowLeft' })); ok(/2026-10-25/.test(lc.querySelector('.ax-tip').textContent), `${lang}/${label}: ← lùi 1 ngày`);
        const sel = body.querySelector('#ax-filt select[name="p"]'); sel.value = 'web'; sel.dispatchEvent(new w.Event('change', { bubbles: true })); await tick(10);
        ok(/p=web/.test(w.location.hash) && doc.querySelector('#ax-filt select[name="p"]').value === 'web' && [...doc.querySelectorAll('.ax-tbl tbody tr td:first-child')].every(td => /Web/.test(td.textContent)), `${lang}/${label}: lọc nền tảng → hash + bảng`);
        const rs = doc.querySelector('#ax-filt select[name="r"]'); rs.value = 'custom'; rs.dispatchEvent(new w.Event('change', { bubbles: true })); await tick(10);
        ok(!doc.querySelector('.ax-cust').hidden && /r=custom/.test(w.location.hash), `${lang}/${label}: tùy chọn → hiện 2 ô ngày`);
        doc.querySelector('[data-tab="country"]').click(); await tick(10); doc.querySelector('[data-sort="imp"]').click(); await tick(10);
        const th = doc.querySelector('[data-sort="imp"]').closest('th'), vals = [...doc.querySelectorAll('.ax-tbl tbody tr')].map(tr => +tr.children[2].textContent.replace(/\D/g, ''));
        ok(th.getAttribute('aria-sort') === 'descending' && vals.every((v, i) => !i || vals[i - 1] >= v) && doc.activeElement === doc.querySelector('[data-sort="imp"]'), `${lang}/${label}: sắp xếp cột (aria-sort, giữ focus)`);
        doc.querySelector('[data-sec="overview"]').click(); await tick(30); ok(/p=web/.test(w.location.hash), `${lang}/${label}: về Tổng quan giữ bộ lọc trong hash`);
      } else {
        const hb = body.querySelector('[data-howto]'), panel = body.querySelector('#ax-howto');
        ok(hb && panel && panel.hidden && /\$/.test(body.querySelector('.kpis').textContent), `${lang}/${label}: giữ proxy + nút Nối Google, hướng dẫn ẩn`);
        hb.click(); ok(!panel.hidden && hb.getAttribute('aria-expanded') === 'true' && panel.querySelectorAll('li').length === 4, `${lang}/${label}: bấm Nối Google → 4 bước`);
      }
      if (lang === 'en') ok(!VI.test(t), `${lang}/${label}: không lộ chữ Việt: ` + ((t.match(/\S*[ăâđêôơưàáạảãằắặẳẵầấậẩẫèéẹẻẽềếệểễìíịỉĩòóọỏõồốộổỗờớợởỡùúụủũừứựửữỳýỵỷỹ]\S*/i) || [])[0] || ''));
      if (lang === 'vi') { const r = await w.axe.run(doc.getElementById('main'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] }, rules: { 'color-contrast': { enabled: false } } }); const b = r.violations.filter(v => v.impact === 'serious' || v.impact === 'critical'); ok(!b.length, `axe ${label}: ` + b.map(v => v.id).join(', ')); }
      body.querySelector('[data-sec="places"]'); doc.querySelector('[data-sec="places"]').click(); await tick(30);
      ok(doc.getElementById('ax-body').querySelector('table'), `${lang}/${label}: mục Vị trí vẫn chạy`);
    }
  }
}
console.log(fails ? `✗ ads-revenue: ${fails} lỗi / ${n}` : `✓ ads-revenue: ${n} kiểm tra đạt (parse AdSense+AdMob, top 10 quốc gia, ghi đè diff, EXPLAIN SEARCH, endpoint, ước tính vs thật, admin có/không số, EN, axe)`);
process.exit(fails ? 1 : 0);
