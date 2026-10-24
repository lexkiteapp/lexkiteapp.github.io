// Quảng cáo (docs/ADS.md) – cổng chặn cả LOẠI lỗi, chạy trong npm test (0 mạng):
//  1) luật đặt chỗ: không bao giờ ở bài học/quiz/thi/nói/roleplay, lớp học, < 13 tuổi, add-on, quản trị, sandbox, bot, nhóm đối chứng; mọi cờ mặc định TẮT
//  2) tần suất: toàn màn hình ≤ 1/3 phiên, ≤ 1/10 phút, không ngày đầu; quản trị chỉ nới rộng (không dày hơn); cổng giữ chân giãn/tắt
//  3) khung app +0: vỏ js/ads.js ≤ 1000 B gzip, js/ads/* không nằm trong SHELL/app/index.html, add-on loại js/ads/
//  4) a11y + 0 CLS (tĩnh): ô có nhãn "Quảng cáo" (aria-label + chữ thấy được), kích thước cố định, không nhận focus; hộp thoại có bẫy focus
//  5) máy chủ: beacon chỉ nhận khóa hợp lệ, cổng giữ chân, SSV (chữ ký ECDSA thật), ads.txt giữ chỗ, truy vấn D1 dùng PK (EXPLAIN, không SCAN)
import fs from 'node:fs'; import vm from 'node:vm'; import zlib from 'node:zlib';
import { JSDOM } from 'jsdom';
import { adRows, guardOf, stats, cohorts, region, derToRaw, verifySsv } from '../../functions/api/_ads.js';
import { patchManifest, patchPlist } from '../mobile-ads.mjs';
let fails = 0, n = 0; const ok = (c, m) => { n++; if (!c) { fails++; console.error('✗ ' + m); } };
const rd = f => fs.readFileSync(f, 'utf8');

// ---------- 1) luật đặt chỗ ----------
const ctxP = {}; ctxP.self = ctxP; vm.createContext(ctxP); vm.runInContext(rd('web/js/ads/policy.js'), ctxP); vm.runInContext(rd('web/js/ads/config.js'), ctxP);
const P = ctxP.AdsPolicy, CFG = ctxP.ADS_CONFIG;
ok(CFG.enabled === false && CFG.web.client === '' && CFG.native.testing === true, 'ads/config.js: enabled=false, chưa có mã nhà xuất bản, app dùng mã THỬ');
ok(/3940256099942544/.test(JSON.stringify(CFG.native)) && !/ca-app-pub-(?!3940256099942544)\d{16}/.test(JSON.stringify(CFG.native)), 'AdMob: CHỈ mã thử của Google');
const ON = { ads_web: '1', ads_android: '1', ios: '1', ads_ios: '1' }, LOCAL = { enabled: true };
const f0 = P.flags({}, CFG), fOn = P.flags(ON, LOCAL);
ok(!f0.web && !f0.android && !f0.ios, 'mặc định: mọi nền tảng TẮT');
ok(!P.flags(ON, CFG).web, 'cờ từ xa bật nhưng config.enabled=false → vẫn TẮT');
ok(!P.flags({ ...ON, ads_kill: '1' }, LOCAL).web && !P.flags({ ...ON, ads_kill: '1' }, LOCAL).android, 'công tắc khẩn cấp tắt mọi nền tảng');
let vid = 'aaaaaaaa'; for (let i = 0; P.cohort(vid) !== 'a'; i++) vid = 'v' + i + 'xxxxxxx';
let hvid = 'bbbbbbbb'; for (let i = 0; P.cohort(hvid) !== 'h'; i++) hvid = 'h' + i + 'yyyyyyy';
const base = { plat: 'web', route: 'home', path: '/app/', vid };
ok(P.slot(base, fOn, 'home'), 'web Hôm nay: được hiện ô');
const LEARN = ['review', 'practice', 'learn', 'quiz', 'listen', 'listen-test', 'dictation', 'toeic-test', 'toeic-r', 'toefl-p', 'mock', 'rtype', 'cbt', 'read', 'write', 'task1', 'letters', 'speaking', 'grammar', 'pron', 'placement', 'welcome', 'roleplay', 'confidence', 'study', 'topic', 'dict', 'class', 'settings', 'admin'];
for (const r of LEARN) ok(!P.slot({ ...base, route: r }, fOn, 'home') && !P.interstitial({ ...base, plat: 'android', route: r }, fOn, { pending: 1, sessions: 9, firstAt: Date.now() - 9 * 864e5 }, Date.now()), `không quảng cáo ở #/${r}`);
ok(!P.slot({ ...base, edu: true }, fOn, 'home') && !P.slot({ ...base, route: 'class' }, fOn, 'home'), 'lớp học (giáo viên/học sinh): không quảng cáo');
ok(!P.slot({ ...base, u13: true }, fOn, 'home') && !P.rewarded({ ...base, plat: 'ios', u13: true }, fOn, 'streak'), '< 13 tuổi: không quảng cáo');
ok(!P.slot({ ...base, plat: 'ext', proto: 'chrome-extension:' }, fOn, 'home') && P.blocked({ proto: 'chrome-extension:' }) === 'ext', 'add-on Chrome: không quảng cáo');
ok(P.blocked({ path: '/admin.html' }) === 'admin' && P.blocked({ route: 'admin' }) === 'admin', 'quản trị: không quảng cáo');
ok(P.blocked({ sandbox: true, vid }) === 'sandbox' && P.blocked({ bot: true, vid }) === 'bot', 'sandbox / trình duyệt tự động: không quảng cáo');
ok(P.blocked({ vid: hvid }) === 'holdout' && !P.slot({ ...base, vid: hvid }, fOn, 'home'), 'nhóm đối chứng: không quảng cáo');
let nh = 0; for (let i = 0; i < 4000; i++) nh += P.cohort('vid' + i) === 'h'; ok(nh > 300 && nh < 500, `đối chứng ≈ 10 % (${nh}/4000)`);
ok(!P.slot(base, fOn, 'list') && !P.slot(base, fOn, 'article'), 'chỉ vị trí trong danh sách cho phép (home, blog)');
ok(P.slot({ ...base, route: 'blog' }, fOn, 'blog') && !P.slot({ ...base, route: 'blog' }, P.flags({ ads_android: '1' }, LOCAL), 'blog'), 'blog: theo cờ web');
ok(P.npa({ dnt: '1' }) && P.npa({ gpc: true }) && P.npa({ consent: false }) && !P.npa({ dnt: '' }), 'DNT / GPC / chưa đồng ý → không cá nhân hóa');

// ---------- 2) tần suất ----------
const now = Date.parse('2026-10-20T10:00:00Z'), aCtx = { plat: 'android', route: 'home', vid }, st = (o = {}) => ({ pending: 1, sessions: 3, firstAt: now - 3 * 864e5, lastAt: 0, ...o });
ok(P.interstitial(aCtx, fOn, st(), now), 'toàn màn hình: đủ điều kiện → hiện');
ok(!P.interstitial({ ...aCtx, plat: 'web' }, fOn, st(), now), 'toàn màn hình: không trên web');
ok(!P.interstitial(aCtx, fOn, st({ pending: 0 }), now), 'toàn màn hình: chỉ khi vừa xong 1 phiên');
ok(!P.interstitial(aCtx, fOn, st({ sessions: 2 }), now), '≤ 1 lần / 3 phiên');
ok(!P.interstitial(aCtx, fOn, st({ lastAt: now - 9 * 60e3 }), now) && P.interstitial(aCtx, fOn, st({ lastAt: now - 11 * 60e3 }), now), '≤ 1 lần / 10 phút');
ok(!P.interstitial(aCtx, fOn, st({ firstAt: now - 3600e3 }), now) && !P.interstitial(aCtx, fOn, st({ firstAt: now - 23 * 3600e3 }), now), 'không bao giờ trong ngày đầu');
ok(!P.interstitial(aCtx, P.flags({ ...ON, ads_inter: '0' }, LOCAL), st(), now), 'cờ ads_inter=0 → tắt toàn màn hình');
const fWide = P.flags({ ...ON, ads_cap_sessions: '1', ads_cap_gap: '1', ads_cap_firstday: '0' }, LOCAL);
ok(fWide.caps.everySessions === 3 && fWide.caps.gapMin === 10 && fWide.caps.firstDayH === 24, 'quản trị KHÔNG thể đặt dày hơn mặc định (kẹp về 3 phiên / 10 phút / 24 giờ)');
const fLoose = P.flags({ ...ON, ads_cap_sessions: '6', ads_cap_gap: '30' }, LOCAL);
ok(!P.interstitial(aCtx, fLoose, st({ sessions: 5 }), now) && P.interstitial(aCtx, fLoose, st({ sessions: 6, lastAt: now - 31 * 60e3 }), now), 'quản trị nới tần suất (6 phiên / 30 phút) có hiệu lực');
const fHalf = P.flags({ ...ON, ads_guard: '0.5' }, LOCAL), fQ = P.flags({ ...ON, ads_guard: '0.25' }, LOCAL);
ok(!P.interstitial(aCtx, fHalf, st({ sessions: 5 }), now) && P.interstitial(aCtx, fHalf, st({ sessions: 6 }), now), 'cổng giữ chân ×0,5 → 1 lần / 6 phiên');
ok(!P.interstitial(aCtx, fQ, st({ sessions: 99 }), now), 'cổng giữ chân ×0,25 → tắt toàn màn hình');
ok(P.rewarded({ ...aCtx, plat: 'ios' }, fOn, 'streak') && P.rewarded(aCtx, fOn, 'ai') && P.rewarded(aCtx, fOn, 'chat') && !P.rewarded(aCtx, fOn, 'lesson') && !P.rewarded({ ...aCtx, plat: 'web' }, fOn, 'ai'), 'có thưởng: chỉ lý do tự chọn, chỉ app gốc');

// ---------- 3) khung app +0 ----------
const sw = rd('web/sw.js'), shell = (sw.match(/const SHELL = \[([\s\S]*?)\];/) || [, ''])[1], idx = rd('web/app/index.html');
ok(!/js\/ads\//.test(shell) && !/ads-config/.test(shell), 'SHELL (sw.js) không chứa js/ads/* (tải lười)');
ok(!/js\/ads\/|ads-config/.test(idx), 'app/index.html không nạp js/ads/*');
const stubGz = zlib.gzipSync(fs.readFileSync('web/js/ads.js'), { level: 9 }).length;
ok(stubGz <= 1000, `vỏ js/ads.js ${stubGz} B gzip ≤ 1000 B (bản cũ ads.js + ads-config.js = 3,5 KB)`);
ok(!/googlesyndication|AdMob|adsbygoogle/.test(rd('web/js/ads.js')), 'vỏ không chứa mã AdSense/AdMob');
ok(/--exclude '\/js\/ads\/'/.test(rd('scripts/build-extension.sh')) && /--exclude '\/js\/i18n\/\*\/ads\.js'/.test(rd('scripts/build-extension.sh')), 'add-on: build-extension.sh loại js/ads/ + chuỗi nhóm ads');
ok(!fs.existsSync('extension/app/js/ads') && !/googlesyndication/.test(fs.existsSync('extension/app/js/ads.js') ? rd('extension/app/js/ads.js') : ''), 'add-on: không có mã/URL quảng cáo');
ok(!/js\/ads\//.test(rd('web/js/reading.js')) && !/Ads\.slot\('list'\)/.test(rd('web/js/reading.js')), 'thư viện bài đọc: không có ô quảng cáo');

// ---------- 4) vỏ trong DOM thật: cờ tắt = 0 DOM/0 tải; cờ bật = ô cố định có nhãn ----------
const boot = (cfgV, url = 'https://lexkite.com/app/#/home') => {
  const dom = new JSDOM('<!doctype html><html><head></head><body><main id="view"></main></body></html>', { url, runScripts: 'outside-only', pretendToBeVisual: true });
  const w = dom.window; if (cfgV) w.localStorage.setItem('lk.cfg', JSON.stringify({ at: Date.now(), v: cfgV }));
  w.t = s => (s === 'Quảng cáo' ? 'Advertisement' : s); w.eval(rd('web/js/ads.js')); return w;
};
{ const w = boot(null); ok(w.Ads.on() === false && w.Ads.slot('home') === '', 'cờ tắt: Ads.slot() rỗng'); w.dispatchEvent(new w.Event('load')); ok(!w.document.querySelector('script[src*="ads/"]'), 'cờ tắt: không tải js/ads/*'); }
{ const w = boot({ ads_web: '1' }); const html = w.Ads.slot('home'); w.document.getElementById('view').innerHTML = html; const el = w.document.querySelector('.ad-slot');
  ok(el && el.getAttribute('aria-label') === 'Advertisement' && /Advertisement/.test(el.textContent), 'ô có nhãn "Advertisement" (aria-label + chữ)');
  ok(el.tagName === 'ASIDE' && !el.hasAttribute('tabindex') && !el.querySelector('[tabindex]'), 'ô là <aside>, không nhận focus');
  ok(w.Ads.slot('list') === '' && w.Ads.slot('article') === '', 'vỏ chỉ trả ô cho home'); }
{ const w = boot({ ads_web: '1', ads_kill: '1' }); ok(w.Ads.slot('home') === '', 'công tắc khẩn cấp: vỏ không vẽ ô'); }
{ const w = boot({ ads_web: '1' }, 'https://lexkite.com/app/?sandbox=1#/home'); ok(w.Ads.slot('home') === '', '?sandbox=1: không ô'); }
{ const w = boot({ ads_web: '1' }); w.localStorage.setItem('lk.edu', '1'); ok(w.Ads.slot('home') === '', 'máy lớp học: không ô'); }
{ const w = boot(null); w.Ads.rewarded('streak').then(v => ok(v === true, 'cờ tắt: cứu chuỗi vẫn được (như trước)')); w.Ads.rewarded('ai').then(v => ok(v === false, 'cờ tắt: không cộng lượt AI')); }
const css = rd('web/css/style.css');
ok(/\.ad-slot \{[^}]*height: 290px[^}]*contain: strict/.test(css), 'CSS: ô cố định 290px + contain: strict (0 CLS)');
ok(/width:300px;height:250px/.test(rd('web/js/ads/run.js')), 'run.js: quảng cáo cố định 300×250 vừa ô');
ok(/e\.key !== 'Tab'/.test(rd('web/js/ui.js')), 'ui.js: hộp thoại có bẫy focus (Tab/Shift+Tab)');
{ const dom = new JSDOM(`<!doctype html><body><button id="o">open</button><div class="modal" id="modal" hidden><div id="modalBox"></div></div><div class="toast" id="toast"></div></body>`, { url: 'https://lexkite.com/app/', runScripts: 'outside-only', pretendToBeVisual: true });
  const w = dom.window, d = w.document; w.t = s => s; Object.defineProperty(w.HTMLElement.prototype, 'offsetParent', { get() { return this.parentNode; } });
  try { w.eval(rd('web/js/ui.js')); } catch (e) { /* phần khác của ui.js cần API trình duyệt */ }
  if (w.UI && w.UI.modal) {
    const box = w.UI.modal('<button id="a">A</button><button id="b" data-close>B</button>');
    d.getElementById('b').focus(); d.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    ok(d.activeElement.id === 'a', 'bẫy focus: Tab ở nút cuối → về nút đầu');
    d.getElementById('a').focus(); d.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }));
    ok(d.activeElement.id === 'b', 'bẫy focus: Shift+Tab ở nút đầu → nút cuối'); ok(box.getAttribute('aria-modal') === 'true', 'hộp thoại aria-modal');
  } else ok(false, 'ui.js: không dựng được UI.modal trong jsdom');
}

// ---------- 5) máy chủ ----------
const rows = adRows({ plat: 'web', c: 'a', ev: { 'imp:home': 2, 'bad:home': 1, 'imp:evil': 3, 'click:home': 999 }, m: { n1: 1, dur: 99999, ses: 1 }, k: 'pa' }, 'DE');
ok(rows.some(r => r[0] === 'ad:imp:web:home' && r[1] === 2) && !rows.some(r => /bad|evil/.test(r[0])) && rows.find(r => r[0] === 'ad:click:web:home')[1] === 50, 'beacon: chỉ khóa hợp lệ, chặn số ảo');
ok(rows.some(r => r[0] === 'adk:eea:pa') && region('US') === 'us' && region('VN') === 'row' && region('GB') === 'eea', 'đồng ý theo vùng (EEA/UK/CH · Mỹ · nơi khác)');
ok(!adRows({ plat: 'ext', ev: { 'imp:home': 1 } }).length && !adRows({ plat: 'web', ev: { ['imp:home'.repeat(9)]: 1 } }).length, 'beacon: nền tảng add-on/khóa lạ bị loại');
const day = (k, d0) => new Date(Date.parse('2026-10-24') - d0 * 864e5).toISOString().slice(0, 10);
const mk = (aD1, hD1, aSl = 300, hSl = 300, N = 30) => { const r = []; for (let i = 1; i <= 21; i++) for (const [c, d1, sl] of [['a', aD1, aSl], ['h', hD1, hSl]]) { r.push({ day: day(0, i), kind: `adc:${c}:n1`, n: N }); r.push({ day: day(0, i), kind: `adc:${c}:r1`, n: Math.round(N * d1) }); r.push({ day: day(0, i), kind: `adc:${c}:r7`, n: Math.round(N * d1 * 0.5) }); r.push({ day: day(0, i), kind: `adc:${c}:ses`, n: N }); r.push({ day: day(0, i), kind: `adc:${c}:dur`, n: N * sl }); } return r; };
ok(guardOf(mk(0.4, 0.4), '2026-10-24').factor === 1, 'cổng: bằng nhau → ×1');
ok(guardOf(mk(0.37, 0.4), '2026-10-24').factor === 0.5, 'cổng: D1 tụt 7,5 % > 5 % → ×0,5');
ok(guardOf(mk(0.3, 0.4), '2026-10-24').factor === 0.25, 'cổng: D1 tụt 25 % > 10 % → ×0,25 (tắt toàn màn hình)');
ok(guardOf(mk(0.4, 0.4, 250, 300), '2026-10-24').factor === 0.25, 'cổng: thời lượng phiên tụt 17 % → ×0,25');
ok(guardOf(mk(0.3, 0.4, 300, 300, 5), '2026-10-24').why === 'sample', 'cổng: mẫu nhỏ → không can thiệp');
ok(guardOf(mk(0.4, 0.4), '2026-10-24', { prev: 0.25 }).factor === 0.5, 'cổng: hồi phục từng nấc (×0,25 → ×0,5)');
const co = cohorts(mk(0.4, 0.4), '2026-10-24'); ok(Math.abs(co.a.d1 - 0.4) < 0.02 && Math.abs(co.a.sl - 300) < 1 && co.a.d7 > 0, 'nhóm: D1 / D7 / thời lượng phiên');
const S = stats([{ day: '2026-10-23', kind: 'ad:req:web:home', n: 100 }, { day: '2026-10-23', kind: 'ad:imp:web:home', n: 80 }, { day: '2026-10-23', kind: 'adk:eea:pa', n: 3 }, { day: '2026-10-22', kind: 'adg:50', n: 1 }], '2026-10-24', { web: 2 });
ok(S.places[0].fill === 0.8 && Math.abs(S.plat.web.rev - 0.16) < 1e-9 && S.consent.eea.pa === 3 && S.guardLog[0].factor === 0.5 && S.series.length === 30, 'số liệu Quản trị: lấp đầy, doanh thu ước tính, đồng ý, lịch sử cổng');
// SSV: ký thật bằng ECDSA P-256 (DER) – xác minh đúng/sai
{ const kp = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const spki = Buffer.from(await crypto.subtle.exportKey('spki', kp.publicKey)).toString('base64');
  const msg = 'ad_network=5450213213286189855&ad_unit=1234&custom_data=ai&reward_amount=3&reward_item=turns&timestamp=1730000000000&transaction_id=abc123def&user_id=devdevdevdevdevdev12';
  const raw = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, kp.privateKey, new TextEncoder().encode(msg)));
  const int = b => { let i = 0; while (i < b.length - 1 && b[i] === 0) i++; b = b.slice(i); return b[0] & 0x80 ? Uint8Array.of(0, ...b) : b; };
  const r = int(raw.slice(0, 32)), s = int(raw.slice(32)), der = Uint8Array.of(0x30, r.length + s.length + 4, 2, r.length, ...r, 2, s.length, ...s);
  ok(Buffer.from(derToRaw(der)).equals(Buffer.from(raw)), 'SSV: DER → r||s');
  const sig = Buffer.from(der).toString('base64url'), keys = async () => ({ keys: [{ keyId: 42, base64: spki }] });
  ok(!!(await verifySsv(`https://lexkite.com/api/ads-reward?${msg}&signature=${sig}&key_id=42`, keys)), 'SSV: chữ ký đúng → hợp lệ');
  ok(!(await verifySsv(`https://lexkite.com/api/ads-reward?${msg.replace('reward_amount=3', 'reward_amount=99')}&signature=${sig}&key_id=42`, keys)), 'SSV: sửa tham số → từ chối');
  const { onRequestGet } = await import('../../functions/api/ads-reward.js');
  ok((await onRequestGet({ request: new Request('https://lexkite.com/api/ads-reward?x=1'), env: {} })).status === 404, 'SSV: mặc định TẮT (ADS_SSV≠1 → 404)'); }
ok(/pub-0000000000000000/.test(rd('web/ads.txt')) && /pub-0000000000000000/.test(rd('web/app-ads.txt')) && /f08c47fec0942fa0/.test(rd('web/ads.txt')), 'ads.txt + app-ads.txt giữ chỗ ở gốc');
// D1: truy vấn ext_events theo khoảng ngày dùng PK, không SCAN
try {
  const { DatabaseSync } = await import('node:sqlite'); const db = new DatabaseSync(':memory:');
  db.exec('CREATE TABLE ext_events (day TEXT NOT NULL, kind TEXT NOT NULL, n INTEGER NOT NULL, PRIMARY KEY (day, kind)) WITHOUT ROWID');
  for (const q of ["SELECT day, kind, n FROM ext_events WHERE day >= ? AND kind >= 'ad' AND kind < 'ae'", "SELECT day, kind, n FROM ext_events WHERE day >= ?1 AND kind >= 'adc:' AND kind < 'adc;'"]) {
    const plan = db.prepare('EXPLAIN QUERY PLAN ' + q).all('2026-10-01').map(r => r.detail).join(' | ');
    ok(/SEARCH/.test(plan) && !/SCAN/.test(plan), 'D1 ' + q.slice(0, 60) + '… → ' + plan);
  }
} catch (e) { console.log('· node:sqlite không có – bỏ qua EXPLAIN (' + e.message + ')'); }
ok(rd('functions/api/admin.js').includes("kind >= 'ad' AND kind < 'ae'") && rd('functions/api/hit.js').includes("kind >= 'adc:' AND kind < 'adc;'"), 'mã máy chủ dùng đúng truy vấn đã kiểm');
// app gốc: SDK chỉ khi bật
const man = '<manifest><application android:label="x">\n</application></manifest>', on1 = patchManifest(man, 'ca-app-pub-3940256099942544~3347511713', true);
ok(/APPLICATION_ID/.test(on1) && patchManifest(on1, '', false) === man && patchManifest(on1, 'ca-app-pub-3940256099942544~3347511713', true) === on1, 'mobile-ads: AndroidManifest bật/tắt sạch, chạy lại không nhân đôi');
const pl = '<?xml version="1.0"?>\n<plist version="1.0">\n<dict>\n\t<key>A</key>\n</dict>\n</plist>', pOn = patchPlist(pl, 'ca-app-pub-3940256099942544~1458002511', true);
ok(/GADApplicationIdentifier/.test(pOn) && /NSUserTrackingUsageDescription/.test(pOn) && patchPlist(pOn, '', false) === pl, 'mobile-ads: Info.plist bật/tắt sạch');
ok(!/@capacitor-community\/admob/.test(rd('mobile/package.json')), 'app phát hành hiện KHÔNG chứa SDK AdMob (cờ tắt)');

await new Promise(r => setTimeout(r, 30));
console.log(fails ? `✗ ads: ${fails} lỗi / ${n}` : `✓ ads: ${n} kiểm tra đạt (luật đặt chỗ, tần suất, khung +0, a11y, cổng giữ chân, SSV, D1 không quét)`);
process.exit(fails ? 1 : 0);
