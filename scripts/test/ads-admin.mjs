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
const api = async (op, body) => { if (op === 'adsStats') return STATS; if (op === 'config') return { keys: [], values: cfg }; if (op === 'configSet') { sent.push(body.values); for (const [k, v] of Object.entries(body.values)) cfg[k] = { v }; return { ok: true }; } throw new Error(op); };
const VI = /[ăâđêôơưàáạảãằắặẳẵầấậẩẫèéẹẻẽềếệểễìíịỉĩòóọỏõồốộổỗờớợởỡùúụủũừứựửữỳýỵỷỹ]/i;
for (const lang of ['vi', 'en']) {
  const dom = new JSDOM(`<!doctype html><html lang="${lang}"><body><main id="main"></main></body></html>`, { url: 'https://lexkite.com/admin.html#ads', runScripts: 'outside-only', pretendToBeVisual: true });
  const w = dom.window, doc = w.document;
  w.eval(fs.readFileSync('web/js/admin-ads.js', 'utf8'));
  w.eval(fs.readFileSync('node_modules/axe-core/axe.min.js', 'utf8'));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const L = (vi, vars) => (vars ? vi.replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? vars[k] : m)) : vi);
  let asked = 0;
  w.AdminAds.render(doc.getElementById('main'), api, L, { esc, lang: () => lang, toast: () => {}, confirm: async () => { asked++; return true; } });
  await tick(40);
  const main = doc.getElementById('main');
  ok(main.querySelectorAll('.ax-tab').length === 5 && main.querySelector('.ax-tab[aria-current="page"]'), `${lang}: thanh mục con 5 mục`);
  ok(main.querySelectorAll('.ax-plat').length === 4 && /\$/.test(main.querySelector('.kpis').textContent) && main.querySelector('.ax-chart svg rect'), `${lang}: trạng thái 3 nền tảng + công tắc khẩn cấp + KPI + biểu đồ doanh thu`);
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
console.log(fails ? `✗ ads-admin: ${fails} lỗi / ${n}` : `✓ ads-admin: ${n} kiểm tra đạt (5 mục, cờ + công tắc khẩn cấp, tần suất kẹp, giữ chân, đồng ý, EN, axe)`);
process.exit(fails ? 1 : 0);
