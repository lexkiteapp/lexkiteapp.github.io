// 💰 Doanh thu THẬT (docs/ADS.md §5): parse báo cáo mẫu AdSense v2 + AdMob v1 (fixture), vị trí theo mã/tên ô, top 10 quốc gia + khác,
// kiểm gói (cleanRev), ghi đè 7 ngày theo diff vào D1 (node:sqlite), EXPLAIN dùng SEARCH (không SCAN), endpoint /api/ads-report (403/400/200),
// realOf (hôm qua/7 ngày/tháng, ước tính vs thật), Quản trị render có/không dữ liệu (jsdom, EN không lộ chữ Việt, axe). --no-dom: bỏ phần jsdom (CI ads-revenue.yml).
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { buildRows, readFixture, placeOf, rangeOf, adsenseUrl, admobBody, adsenseTable, admobTable, unitMap } from '../ads/report.mjs';
import { cleanRev, diffRev, realOf, reporting, stats, guardOf } from '../../functions/api/_ads.js';
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
  // ---- 4) realOf ----
  const rev = sql.prepare(SEL).all('2026-09-01', '2026-10-27');
  const ev = [{ day: '2026-10-25', kind: 'ad:imp:web:home', n: 1000 }, { day: '2026-10-25', kind: 'ad:show:android:inter', n: 100 }];
  const R = realOf(rev, '2026-10-27', { at: 1, srcs: ['adsense', 'admob'], from: '2026-10-20', to: '2026-10-26' }, ev, { web: 2, android: 10 });
  const tot26 = rev.filter(r => r.day === '2026-10-26' && r.dim === 'total').reduce((s, r) => s + r.earn, 0) / 1e6;
  ok(R.connected && Math.abs(R.yday.usd - tot26) < 1e-9, 'hôm qua = tổng AdSense + AdMob ngày 26');
  ok(Math.abs(R.d7.usd - rev.filter(r => r.dim === 'total' && r.day >= '2026-10-20').reduce((s, r) => s + r.earn, 0) / 1e6) < 1e-9 && R.mtd.usd >= R.d7.usd, '7 ngày + tháng này');
  ok(R.d7.ecpm > 0 && R.d7.fill > 0 && R.d7.fill <= 1 && R.d7.ctr > 0, 'eCPM / lấp đầy / CTR');
  ok(R.places.some(p => p.plat === 'web' && p.place === 'home') && R.places.some(p => p.plat === 'android' && p.place === 'inter'), 'theo nền tảng × vị trí');
  ok(R.countries[R.countries.length - 1].cc === '_o' && R.countries[0].cc === 'US', 'quốc gia: US đầu, "khác" cuối');
  const vw = R.vs.find(v => v.plat === 'web'), real7w = rev.filter(r => r.src === 'adsense' && r.dim === 'total' && r.day >= '2026-10-20').reduce((s, r) => s + r.earn, 0) / 1e6;
  ok(Math.abs(vw.est - 2) < 1e-9 && Math.abs(vw.real - real7w) < 1e-9 && Math.abs(vw.dev - (2 - real7w) / real7w) < 1e-9, 'ước tính vs thật: lệch % web');
  ok(R.vs.find(v => v.plat === 'ios').est === 0 && R.series.length === 30, 'iOS không ước tính → 0; chuỗi 30 ngày');
  const E = realOf([], '2026-10-27', null);
  ok(!E.connected && E.yday.usd === 0 && E.d7.ecpm === null && E.places.length === 0 && reporting({}).connected === false, 'rỗng: chưa nối, số 0, không vỡ');
  // ---- 5) endpoint ----
  const env = { STUDIO_CALLBACK_SECRET: 'sec_ads_1', DB: db, SCHEMA_GATE: '0' };
  const post = (body, sec) => onRequestPost({ request: new Request('https://lexkite.com/api/ads-report', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(sec ? { 'X-Studio-Secret': sec } : {}) }, body: JSON.stringify(body) }), env });
  ok((await post(pkt, 'wrong')).status === 403 && (await post(pkt)).status === 403, 'endpoint: sai/thiếu secret → 403');
  ok((await post({ ...pkt, srcs: ['zzz'] }, 'sec_ads_1')).status === 400, 'endpoint: gói sai → 400');
  const okr = await post(pkt, 'sec_ads_1'), oj = await okr.json();
  ok(okr.status === 200 && oj.ok && oj.rows === rows.length && !JSON.stringify(oj).includes('sec_ads_1'), 'endpoint: 200, không lộ secret');
  ok((await onRequestPost({ request: new Request('https://x/api/ads-report', { method: 'POST', body: '{}' }), env: { DB: db } })).status === 503, 'endpoint: chưa cấu hình secret → 503');
  globalThis.__REV = rev;
} catch (e) { if (/node:sqlite/.test(String(e.message))) { sqliteOk = false; console.log('· node:sqlite không có – bỏ qua phần D1 (' + e.message + ')'); } else throw e; }

// ---- 6) Quản trị render có/không dữ liệu ----
if (!process.argv.includes('--no-dom')) {
  const { JSDOM } = await import('jsdom');
  const tick = (ms = 30) => new Promise(r => setTimeout(r, ms));
  const VI = /[ăâđêôơưàáạảãằắặẳẵầấậẩẫèéẹẻẽềếệểễìíịỉĩòóọỏõồốộổỗờớợởỡùúụủũừứựửữỳýỵỷỹ]/i;
  const today = '2026-10-27', ev = [{ day: '2026-10-25', kind: 'ad:imp:web:home', n: 1000 }, { day: '2026-10-25', kind: 'ad:req:web:home', n: 1100 }];
  const base = { at: Date.now(), today, ...stats(ev, today, { web: 2 }), guard: guardOf(ev, today, { prev: 1 }), ecpm: { web: 2, android: 1, ios: 1 } };
  const real = realOf(globalThis.__REV || [], today, { at: Date.parse('2026-10-27T06:04:00Z'), srcs: ['adsense', 'admob'] }, ev, { web: 2 });
  for (const [label, S] of [['có số thật', { ...base, real, reporting: { connected: true } }], ['chưa nối', { ...base, real: realOf([], today, null), reporting: { connected: false } }]]) {
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
        ok(body.querySelectorAll('.kpis .kpi').length === 7 && body.querySelectorAll('table').length === 3 && !body.querySelector('[data-howto]'), `${lang}/${label}: 7 KPI + 3 bảng (ước tính vs thật, vị trí, quốc gia), không nút nối`);
        ok(lang === 'vi' ? /cập nhật lúc/.test(t) && /Ước tính vs thật/.test(t) && /Thẻ kết quả cuối lượt/.test(t) && /Khác/.test(t) : /updated/.test(t) && /Estimate vs actual/.test(t) && /United States/.test(t), `${lang}/${label}: nhãn cập nhật + vị trí + quốc gia`);
        ok(/\$\d/.test(body.querySelector('.kpis').textContent) && body.querySelector('.ax-chart svg rect'), `${lang}/${label}: số $ + biểu đồ`);
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
