// Quản trị › Quảng cáo (web/js/admin-ads.js): dựng 5 mục với số liệu mẫu, đổi cờ qua configSet (có xác nhận), tần suất kẹp trong khoảng an toàn,
// chế độ EN không lộ chữ Việt, axe (wcag2a/aa) không lỗi serious/critical. Không mạng.
import fs from 'node:fs';
import { JSDOM } from 'jsdom';
import { stats, guardOf } from '../../functions/api/_ads.js';
let fails = 0, n = 0; const ok = (c, m) => { n++; if (!c) { fails++; console.error('✗ ' + m); } };
const tick = (ms = 20) => new Promise(r => setTimeout(r, ms));
const today = '2026-10-24', d = i => new Date(Date.parse(today) - i * 864e5).toISOString().slice(0, 10);
const rows = [];
for (let i = 1; i <= 30; i++) { rows.push({ day: d(i), kind: 'ad:req:web:home', n: 100 }, { day: d(i), kind: 'ad:imp:web:home', n: 85 }, { day: d(i), kind: 'ad:click:web:home', n: 2 }, { day: d(i), kind: 'ad:show:android:inter', n: 10 }, { day: d(i), kind: 'ad:req:android:inter', n: 12 });
  for (const c of ['a', 'h']) rows.push({ day: d(i), kind: `adc:${c}:n1`, n: 40 }, { day: d(i), kind: `adc:${c}:r1`, n: c === 'a' ? 14 : 16 }, { day: d(i), kind: `adc:${c}:r7`, n: 6 }, { day: d(i), kind: `adc:${c}:ses`, n: 50 }, { day: d(i), kind: `adc:${c}:dur`, n: 50 * 280 }); }
rows.push({ day: d(3), kind: 'adk:eea:pa', n: 30 }, { day: d(3), kind: 'adk:eea:deny', n: 10 }, { day: d(3), kind: 'adk:us:npa', n: 5 }, { day: d(2), kind: 'adg:50', n: 1 });
const STATS = { at: Date.now(), today, ...stats(rows, today, { web: 1.5, android: 4, ios: 6 }), guard: guardOf(rows, today, { prev: 1 }), ecpm: { web: 1.5, android: 4, ios: 6 }, reporting: { connected: false } };
const sent = [];
let cfg = { ads_web: { v: '1' }, ads_guard: { v: '0.5' } };
const LIVE = { series: Array.from({ length: 14 }, (_, i) => ({ day: d(13 - i), views: 200, visitors: i === 13 ? 999 : 42 })) }; // 7 ngày trọn gần nhất = 42/ngày (hôm nay 999 không tính)
const api = async (op, body) => { if (op === 'adsStats') return STATS; if (op === 'live') return LIVE; if (op === 'config') return { keys: [], values: cfg }; if (op === 'configSet') { sent.push(body.values); for (const [k, v] of Object.entries(body.values)) cfg[k] = { v }; return { ok: true }; } throw new Error(op); };
const VI = /[ăâđêôơưàáạảãằắặẳẵầấậẩẫèéẹẻẽềếệểễìíịỉĩòóọỏõồốộổỗờớợởỡùúụủũừứựửữỳýỵỷỹ]/i;
for (const lang of ['vi', 'en']) {
  const dom = new JSDOM(`<!doctype html><html lang="${lang}"><body><main id="main"></main></body></html>`, { url: 'https://lexkite.com/admin.html#ads', runScripts: 'outside-only', pretendToBeVisual: true });
  const w = dom.window, doc = w.document;
  for (const f of ['web/js/ads/config.js', 'web/js/ads/policy.js', 'web/js/admin-chart.js', 'web/js/admin-ads.js']) w.eval(fs.readFileSync(f, 'utf8')); /* config/policy: trang tải lười qua <script>, JSDOM không chạy <script src> */
  w.eval(fs.readFileSync('node_modules/axe-core/axe.min.js', 'utf8'));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const L = (vi, vars) => (vars ? vi.replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? vars[k] : m)) : vi);
  let asked = 0;
  w.AdminAds.render(doc.getElementById('main'), api, L, { esc, lang: () => lang, toast: () => {}, confirm: async () => { asked++; return true; } });
  await tick(40);
  const main = doc.getElementById('main');
  ok(main.querySelectorAll('.ax-tab').length === 5 && main.querySelector('.ax-tab[aria-current="page"]'), `${lang}: thanh mục con 5 mục`);
  ok(main.querySelectorAll('.ax-plat').length === 4 && /\$/.test(main.querySelector('.kpis').textContent) && main.querySelector('.ach .ach-c .ach-b > i') && main.querySelector('.ach .ach-v.k'), `${lang}: trạng thái 3 nền tảng + công tắc khẩn cấp + KPI + biểu đồ doanh thu (js/admin-chart.js: cột + số cột cao nhất)`);
  const texts = [];
  for (const sec of ['overview', 'places', 'freq', 'guard', 'consent']) {
    main.querySelector(`[data-sec="${sec}"]`).click(); await tick(30);
    texts.push(main.querySelector('#ax-body').textContent);
    if (lang === 'vi') {
      const r = await w.axe.run(main, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] }, rules: { 'color-contrast': { enabled: false } } });
      const bad = r.violations.filter(v => v.impact === 'serious' || v.impact === 'critical');
      ok(!bad.length, `axe #ads/${sec}: ` + bad.map(v => v.id).join(', '));
    }
  }
  if (lang === 'en') ok(!texts.some(t => VI.test(t)), 'en: không lộ chữ Việt: ' + (texts.find(t => VI.test(t)) || '').match(/\S*[ăâđêôơưàáạảãằắặẳẵầấậẩẫèéẹẻẽềếệểễìíịỉĩòóọỏõồốộổỗờớợởỡùúụủũừứựửữỳýỵỷỹ]\S*/i));
  main.querySelector('[data-sec="places"]').click(); await tick(30);
  ok(/85\.0%|85%|85,0%/.test(main.textContent) || /85/.test(main.textContent), `${lang}: tỉ lệ lấp đầy theo vị trí`);
  main.querySelector('[data-sec="guard"]').click(); await tick(30);
  ok(main.querySelector('polyline') && /×0.5/.test(main.textContent), `${lang}: biểu đồ giữ chân + trạng thái tự giảm`);
  ok(main.querySelector('table'), `${lang}: lịch sử tự giảm`);
  main.querySelector('[data-sec="consent"]').click(); await tick(30);
  ok(main.querySelectorAll('tbody tr').length === 2, `${lang}: đồng ý theo 2 vùng`);
  // Thẻ "Sẵn sàng bật quảng cáo" ở trên, rồi trạng thái nền tảng, doanh thu ở dưới; nút Bật khóa có lý do; công tắc khẩn cấp luôn bấm được
  main.querySelector('[data-sec="overview"]').click(); await tick(30);
  const rd = main.querySelector('#ax-rd'), plats = main.querySelector('.ax-plats'), rev = main.querySelector('.ax-rev');
  ok(rd && plats && rev && (rd.compareDocumentPosition(plats) & 4) && (plats.compareDocumentPosition(rev) & 4), `${lang}: thứ tự sẵn sàng → nền tảng → doanh thu`);
  ok(rd && rd.querySelectorAll('.ax-rd-i').length === w.AdminAds.READY.length && rd.querySelector('[role="meter"]'), `${lang}: checklist đủ ${w.AdminAds.READY.length} điều kiện + meter`);
  ok(rd && rd.querySelector('.ax-rd-i.block') && rd.querySelectorAll('select[data-man]').length === w.AdminAds.READY.filter(x => x.m).length, `${lang}: AdSense/AdMob mặc định Chặn + chọn trạng thái tay`);
  ok(/42/.test(rd.textContent) && rd.querySelector('.ax-rd-i [role="meter"][aria-valuenow="42"]'), `${lang}: người thật/ngày 7 ngày trọn (42, không tính hôm nay) từ op live`);
  const an = main.querySelector('[data-flag="ads_android"]'), wb = main.querySelector('[data-flag="ads_web"]'), ks = main.querySelector('[data-flag="ads_kill"]');
  ok(an.disabled && an.getAttribute('aria-describedby') === 'ax-why-android' && /🔒/.test(main.querySelector('#ax-why-android').textContent), `${lang}: Bật Android bị khóa kèm lý do`);
  ok(!wb.disabled && wb.dataset.v === '0' && !ks.disabled, `${lang}: Tắt (web đang bật) + công tắc khẩn cấp luôn bấm được`);
  if (lang === 'vi') {
    const n0 = sent.length; an.click(); await tick(30); ok(sent.length === n0, 'nút Bật bị khóa không gửi configSet');
    const sel = main.querySelector('select[data-man="irs"]'); sel.value = 'ok'; sel.dispatchEvent(new w.Event('change')); await tick(40);
    const last = sent.find(v => v.ads_ready); ok(last && JSON.parse(last.ads_ready).irs.st === 'ok' && !Object.keys(last).some(k => /^ads_(web|android|ios|kill)$/.test(k)), 'trạng thái tay → configSet ads_ready (không đụng cờ quảng cáo)');
    ok(main.querySelector('.ax-rd-i.ok select[data-man="irs"]'), 'thẻ vẽ lại: IRS = Đạt');
  }
  // Tab Vị trí: sơ đồ 7 vị trí + vùng cấm, số đọc từ policy.js (không chép tay)
  main.querySelector('[data-sec="places"]').click(); await tick(30);
  const P = w.AdsPolicy;
  ok(main.querySelectorAll('.axp').length === 7 && main.querySelectorAll('.axp-wf').length === 7 && main.querySelector('.axp-addon'), `${lang}: 7 vị trí có sơ đồ + add-on không quảng cáo`);
  const zt = main.querySelector('.axp-z').textContent;
  ok(P.ZONES.every(([, , re]) => w.AdminAds.routesOf(re).slice(0, 10).every(r => zt.includes(r))) && P.LIVE.length && /mock/.test(zt), `${lang}: vùng cấm lấy từ ZONES`);
  ok(main.querySelector('#axp-inter').closest('.axp').textContent.includes(String(P.flags({}, { enabled: true }).caps.gapMin)) && main.querySelector('#axp-done').closest('.axp').textContent.includes(String(P.FAIL_PCT)), `${lang}: luật tần suất từ CAP/FAIL_PCT`);
  if (lang === 'vi') {
    main.querySelector('[data-sec="overview"]').click(); await tick(30);
    main.querySelector('[data-flag="ads_kill"]').click(); await tick(40);
    ok(asked === 1 && sent.some(v => v.ads_kill === '1'), 'công tắc khẩn cấp → xác nhận → configSet ads_kill=1');
    main.querySelector('[data-sec="freq"]').click(); await tick(30);
    const inp = main.querySelector('input[data-k="ads_cap_sessions"]'); inp.value = '1';
    main.querySelector('#ax-f').dispatchEvent(new w.Event('submit', { cancelable: true })); await tick(30);
    ok(inp.getAttribute('aria-invalid') === 'true' && !sent.some(v => v.ads_cap_sessions === '1'), 'tần suất dày hơn mặc định (1 phiên) bị chặn');
    inp.value = '6'; main.querySelector('#ax-f').dispatchEvent(new w.Event('submit', { cancelable: true })); await tick(30);
    ok(sent.some(v => v.ads_cap_sessions === '6'), 'tần suất trong khoảng (6 phiên) được lưu');
  }
}
// Mô hình sẵn sàng (thuần)
{
  const dom = new JSDOM('', { runScripts: 'outside-only' }), w = dom.window;
  for (const f of ['web/js/ads/config.js', 'web/js/admin-ads.js']) w.eval(fs.readFileSync(f, 'utf8'));
  const { readyOf, txtWhy, routesOf, READY } = w.AdminAds, real = fs.readFileSync('web/ads.txt', 'utf8'), pub = '2290668854727752';
  ok(txtWhy({ ok: true, text: real }, pub) === '' && txtWhy({ ok: true, text: fs.readFileSync('web/app-ads.txt', 'utf8') }, pub) === '', 'ads.txt + app-ads.txt trong repo hợp lệ');
  ok(txtWhy(null, pub) === 'http' && txtWhy({ ok: true, text: '# trống' }, pub) === 'missing' && txtWhy({ ok: true, text: 'google.com, pub-0000000000000000, DIRECT, f08c47fec0942fa0' }, pub) === 'placeholder' && txtWhy({ ok: true, text: real.replace(pub, '1111111111111111') }, pub) === 'mismatch', 'ads.txt: http / thiếu / giữ chỗ / sai mã');
  const now = readyOf({ conf: w.ADS_CONFIG, txt: { ads: { ok: true, text: real }, app: { ok: true, text: real } }, traffic: { avg: 42 } });
  ok(now.block.web.some(i => i.k === 'adsense') && now.block.android.some(i => i.k === 'admob') && now.block.ios.some(i => i.k === 'ios_store') && !now.block.web.some(i => i.k === 'traffic' || i.k === 'pingpong'), 'hiện tại: AdSense/AdMob khóa, lưu lượng + PingPong chỉ khuyến nghị');
  const all = Object.fromEntries(READY.filter(x => x.m).map(x => [x.k, { st: 'ok', at: 1 }])), conf = { enabled: true, web: { client: 'ca-pub-' + pub, slots: { home: '1' } }, native: { testing: false } };
  const go = readyOf({ man: all, conf, txt: { ads: { ok: true, text: real }, app: { ok: true, text: real } }, traffic: { avg: 10 } });
  ok(!go.block.web.length && !go.block.android.length && !go.block.ios.length, 'đủ điều kiện bắt buộc → mở khóa cả 3 nền tảng (lưu lượng thấp vẫn không khóa)');
  ok(readyOf({ man: { adsense: { st: 'x' } }, conf }).items.find(i => i.k === 'adsense').st === 'block', 'trạng thái tay lạ → giữ mặc định');
  ok(JSON.stringify(routesOf(/^(class|ta)(-.*)?$/)) === '["class*","ta*"]' && JSON.stringify(routesOf(/^admin/)) === '["admin*"]' && JSON.stringify(routesOf(/^(mock|exam-.+|plans?)$/)) === '["mock","exam-*","plan(s)"]', 'routesOf đọc ZONES');
}
console.log(fails ? `✗ ads-admin: ${fails} lỗi / ${n}` : `✓ ads-admin: ${n} kiểm tra đạt (5 mục, cờ + công tắc khẩn cấp, tần suất kẹp, giữ chân, đồng ý, EN, axe)`);
process.exit(fails ? 1 : 0);
