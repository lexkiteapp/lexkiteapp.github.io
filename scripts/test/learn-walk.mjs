// Luồng NGƯỜI MỚI thật (Playwright): welcome → setup → ngày 1 → vài câu → thoát → quay lại (ngày 2 giả lập) → ôn.
// Đo (không chấm cảm tính): số chạm tới câu đầu, thời gian tới câu đầu, phản hồi sau trả lời, thanh tiến độ, âm/mic tắt được,
// lối vào cạnh tranh ở Hôm nay, lỗi console. Ra learn-walk-out/report.md + ảnh. Chạy: node scripts/test/learn-walk.mjs http://localhost:8080 learn-walk-out
import { chromium } from 'playwright';
import fs from 'node:fs';
const BASE = process.argv[2] || 'http://localhost:8080', OUT = process.argv[3] || 'learn-walk-out';
fs.mkdirSync(OUT, { recursive: true });
const rows = [], errs = [];
const row = (vp, step, k, v, ok) => rows.push({ vp, step, k, v, ok });
const browser = await chromium.launch();
for (const [vp, w, h] of [['390', 390, 844], ['1280', 1280, 800]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: w < 500, locale: 'en-US' });
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push(`${vp}: ${e.message}`));
  p.on('console', m => m.type() === 'error' && !/Failed to load resource|favicon/.test(m.text()) && errs.push(`${vp}: ${m.text().slice(0, 160)}`));
  const shot = n => p.screenshot({ path: `${OUT}/${vp}-${n}.png` }).catch(() => {});
  const t0 = Date.now(); let taps = 0;
  const tap = async (sel, name) => { const el = p.locator(sel).first(); if (!(await el.count())) return false; await el.click({ timeout: 4000 }).catch(() => {}); taps++; await p.waitForTimeout(500); return true; };
  await p.goto(`${BASE}/app/#/welcome`, { waitUntil: 'load' }); await p.waitForTimeout(1500); await shot('1-welcome');
  row(vp, 'welcome', 'CTA bắt đầu thấy ngay', await p.locator('a[href="#/welcome/setup"]').first().isVisible().catch(() => false), true);
  await p.goto(`${BASE}/app/#/welcome/setup`); await p.waitForTimeout(1500); await shot('2-setup');
  const setupOpts = await p.locator('button, .option, [data-v]').count();
  row(vp, 'setup', 'số nút/lựa chọn trước bài đầu', setupOpts, setupOpts <= 20);
  const tGo = Date.now();
  const went = await tap('#go', 'go'); await p.waitForTimeout(6000); await shot('3-day1');
  row(vp, 'setup→day1', 'vào được ngày 1', went && /#\/(path|review|practice|home|day)/.test(await p.evaluate(() => location.hash)), true);
  row(vp, 'day1', 'giây từ bấm Bắt đầu tới màn học', ((Date.now() - tGo) / 1000).toFixed(1), true);
  // trả lời tối đa 8 câu: bấm "tiếp tục/học/bắt đầu" rồi lựa chọn đầu; đo phản hồi + tiến độ
  let answered = 0, fb = 0, prog = false, sound = false, hashes = new Set();
  for (let i = 0; i < 14 && answered < 8; i++) {
    hashes.add(await p.evaluate(() => location.hash));
    if (await p.locator('.progress, .bar, [role=progressbar], .lfx-bar').first().isVisible().catch(() => false)) prog = true;
    if (await p.getByText(/mute|tắt âm|sound off|turn off audio/i).first().isVisible().catch(() => false)) sound = true;
    const opt = p.locator('.option:not([disabled]), .opts button, .choices button').first();
    if (await opt.isVisible().catch(() => false)) {
      await opt.click().catch(() => {}); answered++; taps++; await p.waitForTimeout(400);
      if (await p.locator('.sheet, .feedback, .fb').first().isVisible().catch(() => false)) fb++;
      if (answered === 1) await shot('4-feedback');
    }
    const next = p.locator('button.primary:visible, a.btn.primary:visible').first();
    if (await next.count()) { await next.click().catch(() => {}); taps++; await p.waitForTimeout(700); } else await p.waitForTimeout(500);
  }
  await shot('5-after');
  row(vp, 'day1', 'câu trả lời được ghi nhận', answered, answered >= 3);
  row(vp, 'day1', 'câu có bảng phản hồi tức thì', `${fb}/${answered}`, answered > 0 && fb === answered);
  row(vp, 'day1', 'thanh tiến độ hiện', prog, prog);
  row(vp, 'day1', 'tắt âm/mic thấy được', sound, sound);
  row(vp, 'day1', 'số chạm tới hết lượt thử', taps, true);
  // ngày 2 (giả lập): tải lại, về Hôm nay
  await p.goto(`${BASE}/app/#/home`); await p.reload(); await p.waitForTimeout(2500); await shot('6-day2-home');
  const entries = await p.locator('a[href^="#/"], button').evaluateAll(els => els.filter(e => e.offsetParent).length);
  row(vp, 'day2-home', 'số lối vào nhìn thấy ở Hôm nay', entries, entries <= 30);
  const cta = await p.locator('a[href*="path"], a[href*="review"], button.primary, a.btn.primary').first().isVisible().catch(() => false);
  row(vp, 'day2-home', 'có 1 nút tiếp tục nổi bật', cta, cta);
  row(vp, 'day2-home', 'có mục tiêu/streak hiện', await p.getByText(/streak|chuỗi|🔥|goal|mục tiêu/i).first().isVisible().catch(() => false), true);
  await ctx.close();
}
await browser.close();
const md = ['# Learn walk – người mới (đo thật)', '', `Base: ${BASE}`, '', '| vp | bước | chỉ số | giá trị | ok |', '|---|---|---|---|---|',
  ...rows.map(r => `| ${r.vp} | ${r.step} | ${r.k} | ${r.v} | ${r.ok ? '✅' : '⚠️'} |`), '', `Lỗi console/page: ${errs.length}`, ...errs.slice(0, 20).map(e => `- ${e}`)].join('\n');
fs.writeFileSync(`${OUT}/report.md`, md); console.log(md);
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md + '\n');
