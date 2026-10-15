// Chụp màn hình app thật (bản ?sandbox=1&demo=1 – dữ liệu mẫu tách riêng) cho bài blog → .media/src/<id>.png
// Cần playwright-core + Chromium: bash scripts/setup-media-tools.sh. Dùng: node scripts/blog-shots.mjs [id ...]
import fs from 'node:fs'; import { createRequire } from 'node:module';
const TOOLS = process.env.LEXKITE_TOOLS || `${process.cwd()}/.tools`;
process.env.PLAYWRIGHT_BROWSERS_PATH ||= TOOLS + '/pw';
const { chromium } = createRequire(TOOLS + '/')('playwright-core');
const cfg = JSON.parse(fs.readFileSync('content/blog/shots.json', 'utf8'));
const want = process.argv.slice(2), ids = Object.keys(cfg.shots).filter(id => !want.length || want.includes(id));
fs.mkdirSync('.media/src', { recursive: true });
const px = process.env.HTTPS_PROXY && new URL(process.env.HTTPS_PROXY);
// --single-process: chạy được cả trong môi trường hạn chế tiến trình con (sandbox macOS)
const b = await chromium.launch({ headless: true, args: ['--single-process', '--no-zygote', '--no-sandbox', '--disable-gpu', '--use-mock-keychain', '--hide-scrollbars'],
  proxy: px ? { server: `http://${px.host}`, username: decodeURIComponent(px.username), password: decodeURIComponent(px.password) } : undefined });
const ctx = await b.newContext({ locale: 'vi-VN', reducedMotion: 'reduce' });
const p = await ctx.newPage();
const cdp = await ctx.newCDPSession(p);
await p.goto(cfg.app + '#/home', { waitUntil: 'load' }); await p.waitForTimeout(3000); // nạp dữ liệu mẫu
for (const id of ids) {
  const s = cfg.shots[id], [w, h, dpr] = s.mobile ? [390, 844, 2] : [1280, 800, 1.5];
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: dpr, mobile: !!s.mobile });
  await p.goto(cfg.app + s.route, { waitUntil: 'load' }); await p.waitForTimeout(s.wait || 2500);
  const r = await cdp.send('Page.captureScreenshot', { format: 'png' }); // CDP trực tiếp: ổn định hơn page.screenshot ở chế độ 1 tiến trình
  fs.writeFileSync(`.media/src/${id}.png`, Buffer.from(r.data, 'base64')); console.log('✓', id, s.route);
}
await b.close();
