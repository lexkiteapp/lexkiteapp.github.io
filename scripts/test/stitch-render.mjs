// 🖼 Vẽ HTML Stitch v2 (brand/stitch/v2/<màn>-dark|light.html) ở 390×844, TẮT hoạt ảnh (prefers-reduced-motion + CSS ép) → PNG
//   tĩnh, đủ phần tử (ảnh PNG của Stitch chụp giữa hoạt ảnh nên thiếu). Xuất tờ duyệt: mỗi cột 1 màn, hàng trên tối, hàng dưới sáng.
//   Chủ duyệt tờ này, KHÔNG duyệt PNG Stitch. Ảnh vẽ ra cũng là mẫu chuẩn cho SSIM của stitch-diff.mjs (cùng job CI).
// Dùng: node scripts/test/stitch-render.mjs [brand/stitch/v2] [out/stitch-v2]   (cần playwright + imagemagick; CI: stitch-diff.yml)
import fs from 'node:fs'; import path from 'node:path'; import { execFileSync } from 'node:child_process'; import { chromium } from 'playwright';
const [SRC = 'brand/stitch/v2', OUT = 'out/stitch-v2'] = process.argv.slice(2); fs.mkdirSync(path.join(OUT, 'png'), { recursive: true });
export const ORDER = ['path', 'lesson-question', 'feedback-correct', 'feedback-wrong', 'lesson-complete', 'story-duo', 'review', 'practice', 'leagues', 'streak', 'me', 'teacher-call', 'exam-readiness'];
const STILL = '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}';
const browser = await chromium.launch(), ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
const done = {};
for (const s of ORDER) for (const m of ['dark', 'light']) { const f = path.join(SRC, `${s}-${m}.html`); if (!fs.existsSync(f)) continue;
  const p = await ctx.newPage(); await p.goto('file://' + path.resolve(f), { waitUntil: 'networkidle' }).catch(() => {});
  await p.addStyleTag({ content: STILL });
  // Lỗi xuất của Stitch (feedback-correct-dark): class material-symbols-outlined nhưng chỉ nạp font Rounded → dùng Rounded (app cũng tự host Rounded)
  await p.evaluate(() => { const h = [...document.querySelectorAll('link[href*="Material+Symbols"]')].map(l => l.href).join(' ');
    if (!/Outlined/.test(h) && /Rounded/.test(h)) document.head.insertAdjacentHTML('beforeend', '<style>.material-symbols-outlined{font-family:"Material Symbols Rounded"!important}</style>'); });
  // font icon (display=swap) tải muộn → ép tải MỌI font khai báo rồi mới chụp, nếu không icon hiện thành chữ ("close", "check")
  await p.evaluate(async () => { await Promise.all([...document.fonts].map(f => f.load().catch(() => {}))); await document.fonts.ready; });
  // màn tối Stitch cuộn TRONG khung cao 844 (h-screen + overflow-y-auto) → mở bung các khung cuộn lớn (≥ 300 px) để chụp đủ nội dung
  await p.evaluate(() => { for (let k = 0; k < 3; k++) for (const e of document.querySelectorAll('body *')) { const cs = getComputedStyle(e);
    if (e.clientHeight >= 300 && e.scrollHeight > e.clientHeight + 4 && /auto|scroll|hidden/.test(cs.overflowY)) Object.assign(e.style, { height: 'auto', maxHeight: 'none', overflowY: 'visible' }); } });
  // thanh tab "fixed bottom" phải nằm cuối trang: kéo khung nhìn cao bằng cả trang (chụp fullPage giữ fixed ở mép khung 844 → chèn giữa trang)
  const H = await p.evaluate(() => Math.max(844, document.documentElement.scrollHeight, document.body.scrollHeight)); await p.setViewportSize({ width: 390, height: H }); await p.waitForTimeout(500);
  const miss = await p.evaluate(() => [...document.querySelectorAll('[class*="material-symbols"]')].filter(e => e.textContent.trim() && e.getBoundingClientRect().width > 1.6 * parseFloat(getComputedStyle(e).fontSize)).length);
  if (miss) { console.error(`✗ ${s}-${m}: ${miss} icon chưa thành hình (font icon lỗi)`); process.exitCode = 1; }
  const o = path.join(OUT, 'png', `${s}-${m}.png`); await p.screenshot({ path: o, fullPage: true }); done[`${s}-${m}`] = o; await p.close(); }
await browser.close();
// tờ duyệt: 2 tờ (7 + 6 màn), mỗi ô thu 50 %, thiếu bản → ô xám "chưa có trong Stitch"
const cell = (s, m) => done[`${s}-${m}`] || (() => { const o = path.join(OUT, 'png', `_missing-${s}-${m}.png`);
  execFileSync('convert', ['-size', '390x844', 'xc:#777', '-gravity', 'center', '-pointsize', '28', '-fill', 'white', '-annotate', '0', `${s}\n${m}\nchưa có trong Stitch`, o]); return o; })();
for (const [i, part] of [ORDER.slice(0, 7), ORDER.slice(7)].entries()) {
  const tiles = [...part.map(s => cell(s, 'dark')), ...part.map(s => cell(s, 'light'))];
  execFileSync('montage', [...tiles, '-tile', `${part.length}x2`, '-geometry', '195x+8+8', '-gravity', 'north', '-background', '#e9eef0',
    '-title', `Stitch v2 (HTML tĩnh 390 px) · trên: tối · dưới: sáng · tờ ${i + 1}/2`, '-pointsize', '20', path.join(OUT, `sheet-${i + 1}.png`)]); }
console.log(`stitch-render: ${Object.keys(done).length} màn → ${OUT}/png, tờ ${OUT}/sheet-1.png, sheet-2.png`);
