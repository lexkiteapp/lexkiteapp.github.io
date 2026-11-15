// Dò vi phạm CSP (Report-Only) trên bản LIVE: đi qua các tuyến chính + nạp mọi thư viện tải lười (transformers/Whisper, Kokoro, pdf.js, rig/Call)
// và ghi từng vi phạm: directive, blockedURI, sourceFile:dòng, mẫu mã. Nghe `securitypolicyviolation` (mọi frame, trước mã trang) + thông báo console CSP (cả worker).
// Dùng: node scripts/test/csp-probe.mjs [base=https://lexkite.com] [thư-mục-ra=out/csp]   Env: LEXKITE_CI_HEADER
//   --strict : thoát 1 nếu còn vi phạm (cổng CI sau khi sửa gốc); mặc định chỉ ghi báo cáo (chế độ dò nguồn).
import { chromium, webkit } from 'playwright';
import fs from 'node:fs';
import { routeCiHeader } from '../lib/http.mjs';
const argv = process.argv.slice(2), STRICT = argv.includes('--strict'), pos = argv.filter(a => !a.startsWith('--'));
const BASE = (pos[0] || 'https://lexkite.com').replace(/\/$/, ''), OUT = pos[1] || 'out/csp';
fs.mkdirSync(OUT, { recursive: true });
const CI = process.env.LEXKITE_CI_HEADER ? process.env.LEXKITE_CI_HEADER.trim() : '';
const APP = `${BASE}/app/?sandbox=1&hl=en`;
const ROUTES = ['', '#/home', '#/vocab', '#/skills', '#/tests', '#/me', '#/dictionary', '#/verb/take', '#/lesson/go?demo=1', '#/call/bakery'];
const LAZY = [ // thư viện tải lười: nạp đúng URL như mã app (ui.js, klocal-worker.js, importdeck.js) rồi để chúng khởi tạo
  ['transformers', `import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.5/dist/transformers.min.js').then(m => { try { m.env.allowLocalModels = false; } catch (e) {} return Object.keys(m).length; })`],
  ['kokoro-js', `import('https://cdn.jsdelivr.net/npm/kokoro-js@1.2.1/dist/kokoro.web.js').then(m => Object.keys(m).length)`],
  ['pdf.js', `new Promise((ok, no) => { const s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js'; s.onload = async () => { try { pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js'; const d = await pdfjsLib.getDocument({ data: new Uint8Array(0) }).promise.catch(() => 0); ok(1); } catch (e) { ok(0); } }; s.onerror = () => no(new Error('load')); document.head.appendChild(s); })`],
  ['onnx-wasm', `(async () => { const m = await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.5/dist/transformers.min.js'); const o = m.env && m.env.backends && m.env.backends.onnx; if (o && o.wasm) { o.wasm.numThreads = 1; } try { await new m.Tensor('float32', new Float32Array(4), [2, 2]); } catch (e) {} return 1; })()`],
];
const found = new Map(), log = [], CONTROL = {};
const add = (where, v) => { const k = [v.directive, v.blocked, v.file, v.line].join('|'); const e = found.get(k) || { ...v, where: new Set(), n: 0 }; e.where.add(where); e.n++; found.set(k, e); };
const INIT = () => {
  const post = e => { try { (window.__csp = window.__csp || []).push({ directive: e.effectiveDirective || e.violatedDirective, blocked: String(e.blockedURI || '').slice(0, 160), file: String(e.sourceFile || '').slice(0, 200), line: e.lineNumber, col: e.columnNumber, sample: String(e.sample || '').slice(0, 120), disp: e.disposition }); } catch (x) { /* bỏ */ } };
  document.addEventListener('securitypolicyviolation', post, true);
  addEventListener('securitypolicyviolation', post, true);
};
const CSP_MSG = /Content[- ]Security[- ]Policy|\[Report Only\]|report-only policy|unsafe-eval|wasm-eval/i;

const ENGINES = { chromium: await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'] }), webkit: await webkit.launch() };
let browser = ENGINES.chromium, eng = 'chromium';
async function session(label0, fn) {
  const label = eng + ' ' + label0;
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, permissions: eng === 'chromium' ? ['microphone'] : [] });
  await routeCiHeader(ctx, BASE, CI);
  await ctx.addInitScript(INIT);
  const page = await ctx.newPage();
  page.on('console', m => { const t = m.text(); if (CSP_MSG.test(t)) { const l = m.location(); add(label, { directive: (t.match(/directive[^"']*["']([^"']+)/i) || t.match(/(script-src[-\w]*|unsafe-eval)/i) || [])[1] || 'console', blocked: 'console', file: l.url || '', line: l.lineNumber, col: l.columnNumber, sample: t.slice(0, 200), disp: 'report' }); } });
  page.on('pageerror', e => log.push(`${label}: exception ${String(e.message).slice(0, 160)}`));
  try { await fn(page); } catch (e) { log.push(`${label}: ${String(e.message).slice(0, 200)}`); }
  for (const f of page.frames()) { try { for (const v of await f.evaluate(() => window.__csp || [])) add(label + (f === page.mainFrame() ? '' : ' (frame)'), v); } catch (e) { /* frame đã đóng */ } }
  await ctx.close();
}
const RIG = page => page.waitForFunction(() => (window.__lkRigs || []).some(r => r.stats.ready && r.stats.frames > 20), null, { timeout: 40000 }).catch(() => log.push('rig chưa sẵn sàng sau 40 s'));
for (eng of ['chromium', 'webkit']) {
  browser = ENGINES[eng];
  // ĐỐI CHỨNG: new Function() phải bị báo (không có 'unsafe-eval') – nếu không thì cách nghe bị mù, kết quả "0 vi phạm" vô nghĩa
  await session('đối chứng new Function', async page => { await page.goto(APP, { waitUntil: 'load', timeout: 60000 }); await page.evaluate(() => { try { new Function('return 1')(); } catch (e) { /* bị chặn cũng là báo */ } }); await page.waitForTimeout(1500); });
  CONTROL[eng] = [...found.values()].some(e => e.where.has(eng + ' đối chứng new Function'));
  for (const r of ROUTES) await session('route ' + (r || '/'), async page => { await page.goto(APP + r, { waitUntil: 'load', timeout: 60000 }); if (/lesson|call/.test(r)) await RIG(page); await page.waitForTimeout(r.includes('call') || r.includes('lesson') ? 6000 : 5000); });
  if (eng === 'chromium') for (const [name, code] of LAZY) await session('lazy ' + name, async page => { await page.goto(APP, { waitUntil: 'load', timeout: 60000 }); await page.waitForTimeout(2000); log.push(`lazy ${name}: ${JSON.stringify(await page.evaluate(code).catch(e => 'lỗi ' + String(e.message).slice(0, 120)))}`); await page.waitForTimeout(4000); });
}
for (const b of Object.values(ENGINES)) await b.close();

for (const [k, v] of Object.entries(CONTROL)) log.push(`đối chứng ${k}: ${v ? 'nghe được' : 'MÙ – không thấy vi phạm cố ý'}`);
const rows = [...found.values()].filter(e => !e.where.every(w => /đối chứng/.test(w))).map(e => ({ ...e, where: [...e.where] }));
fs.writeFileSync(`${OUT}/violations.json`, JSON.stringify(rows, null, 1));
const md = ['# Vi phạm CSP trên ' + BASE, '', `Tổng ${rows.length} nguồn khác nhau.`, '', '| directive | blocked | nguồn:dòng | lần | nơi | mẫu |', '|---|---|---|---|---|---|', ...rows.map(e => `| ${e.directive} | ${e.blocked} | ${e.file}:${e.line} | ${e.n} | ${e.where.join(', ')} | ${(e.sample || '').replace(/\|/g, '/').slice(0, 100)} |`), '', '## Nhật ký', ...log.map(l => '- ' + l)].join('\n');
fs.writeFileSync(`${OUT}/report.md`, md + '\n'); console.log(md);
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md + '\n');
if (Object.values(CONTROL).some(v => !v)) { console.error('✗ csp-probe: đối chứng thất bại – cách nghe vi phạm không hoạt động trên engine này'); if (STRICT) process.exit(1); }
if (STRICT && rows.length) { console.error(`✗ csp-probe: ${rows.length} vi phạm CSP`); process.exit(1); }
console.log(`${rows.length ? '⚠' : '✓'} csp-probe: ${rows.length} nguồn vi phạm${STRICT ? '' : ' (chế độ dò – chưa chặn)'}`);
