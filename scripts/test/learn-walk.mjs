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
  // thiết lập TỪNG BƯỚC (onboard.js: goal → level → target → pace → ready): giữ lựa chọn mặc định, bấm Tiếp tục tới nút #go; đo số bước + giây
  const tOnb = Date.now(); let onbSteps = 0;
  for (let k = 0; k < 12 && !(await p.locator('#go').isVisible().catch(() => false)); k++) {
    const nx = p.locator('#obNext'); if (await nx.isVisible().catch(() => false)) { if (await nx.isDisabled().catch(() => false)) { await p.locator('[role=radio], .option, [data-v]').first().click().catch(() => {}); await p.waitForTimeout(300); } await nx.click().catch(() => {}); taps++; onbSteps++; await p.waitForTimeout(600); } else await p.waitForTimeout(500);
  }
  await shot('2b-setup-end');
  row(vp, 'setup', 'số bước thiết lập tới nút Bắt đầu', onbSteps, onbSteps <= 5);
  row(vp, 'setup', 'giây qua thiết lập (giữ mặc định)', ((Date.now() - tOnb) / 1000).toFixed(1), true);
  const tGo = Date.now();
  const went = await tap('#go', 'go'); await p.waitForTimeout(6000); await shot('3-day1');
  row(vp, 'setup→day1', 'vào được ngày 1', went && /#\/(path|review|practice|home|day)/.test(await p.evaluate(() => location.hash)), true);
  row(vp, 'day1', 'giây từ bấm Bắt đầu tới màn học', ((Date.now() - tGo) / 1000).toFixed(1), true);
  // thật sự vào BÀI HỌC: bỏ qua lời mời kiểm tra đầu vào → Hôm nay → "Let's go" → trả lời tối đa 8 câu (chọn → Kiểm tra → phản hồi → Tiếp tục)
  const clickText = async (re, roles = ['button', 'link']) => { for (const r of roles) { const el = p.getByRole(r, { name: re }).first(); if (await el.isVisible().catch(() => false)) { await el.click().catch(() => {}); taps++; await p.waitForTimeout(900); return true; } } return false; };
  const sawPlacement = /placement/.test(await p.evaluate(() => location.hash)); row(vp, 'day1', 'màn đầu sau thiết lập là lời mời kiểm tra đầu vào (20 câu)', sawPlacement, true);
  if (sawPlacement) await clickText(/^\s*(skip|bỏ qua)/i);
  await p.waitForTimeout(1500); await shot('3b-today');
  const tLesson = Date.now(); const started = await clickText(/let.?s go|bắt đầu|start/i);
  await p.waitForTimeout(3000); await shot('3c-lesson-start');
  let answered = 0, fb = 0, prog = false, sound = false;
  for (let i = 0; i < 40 && answered < 8; i++) {
    if (await p.getByText(/^\s*\d+\s*\/\s*\d+\s*$/).first().isVisible().catch(() => false)) prog = true;
    if (await p.locator('[aria-label*="sound" i], [aria-label*="audio" i], [aria-label*="mic" i], [aria-label*="âm" i]').first().isVisible().catch(() => false) || await p.getByText(/can.?t listen|can.?t speak|mute|tắt âm/i).first().isVisible().catch(() => false)) sound = true;
    const chk = p.locator('#lsnCheck'), go = p.locator('#lsnGo');
    if (await chk.isVisible().catch(() => false)) {
      const opt = p.locator('#lsnBody button:not([disabled]), #lsnBody [role=radio], #lsnBody .option').first();
      if (await opt.isVisible().catch(() => false)) { await opt.click().catch(() => {}); taps++; await p.waitForTimeout(250); }
      if (await chk.isEnabled().catch(() => false)) { await chk.click().catch(() => {}); taps++; answered++; await p.waitForTimeout(600);
        if (await p.getByText(/correct|incorrect|wrong|đúng|sai|great|nice|answer/i).first().isVisible().catch(() => false)) fb++;
        if (answered === 1) await shot('4-feedback'); }
    }
    if (await p.locator('#lsnGo, #lsnNext, [data-lsn=next]').first().isVisible().catch(() => false)) { await p.locator('#lsnGo, #lsnNext, [data-lsn=next]').first().click().catch(() => {}); taps++; await p.waitForTimeout(600); }
    else if (!(await chk.isVisible().catch(() => false))) { if (!(await clickText(/continue|tiếp tục|next|got it/i))) await p.waitForTimeout(500); }
  }
  await shot('5-after');
  row(vp, 'lesson', 'bấm được vào bài từ Hôm nay', started, started);
  row(vp, 'lesson', 'giây từ Hôm nay tới câu đầu', ((Date.now() - tLesson) / 1000).toFixed(1), true);
  row(vp, 'lesson', 'câu đã kiểm tra đáp án', answered, answered >= 3);
  row(vp, 'lesson', 'câu có phản hồi tức thì sau Kiểm tra', `${fb}/${answered}`, answered > 0 && fb === answered);
  row(vp, 'lesson', 'bộ đếm tiến độ (n/N) hiện', prog, prog);
  row(vp, 'lesson', 'lối tắt tắt nghe/nói thấy được', sound, sound);
  row(vp, 'lesson', 'số chạm tới hết lượt thử', taps, true);
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
