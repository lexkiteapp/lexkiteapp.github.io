// Ảnh App Store cho app iOS (com.lexkite.app): chụp app GỐC trên iOS Simulator (GitHub Actions macOS, .github/workflows/ios-shots.yml)
// rồi đóng khung + chữ giống ảnh Google Play (cùng màn hình, cùng chữ: scripts/lib/app-shots-copy.mjs).
// Không chạy trên máy anh chủ (nặng). Dùng:
//   node scripts/ios-shots.mjs plan                 → in kế hoạch chụp cho workflow: "<n> <route> <flip 0|1> <dark 0|1> <chờ giây>"
//   node scripts/ios-shots.mjs frame <raw> <out>    → <raw>/<device>/<lang>/<n>.png (ảnh simulator) → <out>/<device>/<lang>/<n>.png
// Kích thước App Store: iPhone 6.9" 1320×2868 (APP_IPHONE_67) · iPad 13" 2064×2752 (APP_IPAD_PRO_3GEN_129). PNG RGB không alpha.
import fs from 'fs';
import path from 'path';
import { ICON, FONT, SCREENS, BASECSS } from './lib/app-shots-copy.mjs';

// Bố cục vẽ ở kích thước logic, chụp với deviceScaleFactor 2 → đúng pixel Apple yêu cầu
export const DEVICES = {
  'iphone-69': { w: 660, h: 1434, kind: 'phone' },
  'ipad-13': { w: 1032, h: 1376, kind: 'tablet' },
};
const LANGS = (process.env.LANGS || 'en,vi').split(',');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const css = (d) => {
  const P = d.kind === 'phone'
    ? { pad: 44, brand: 24, ic: 40, top: 112, kick: 15, h1: 46, sub: 19, dev: { l: 90, t: 410, w: 480, p: 12, r: 64, rs: 52 } }
    : { pad: 76, brand: 30, ic: 50, top: 132, kick: 17, h1: 58, sub: 23, dev: { l: 146, t: 420, w: 740, p: 18, r: 44, rs: 28 } };
  return `${BASECSS}body{width:${d.w}px;height:${d.h}px}
body:before{content:"";position:absolute;inset:0;background-image:radial-gradient(rgba(255,255,255,.07) 1px,transparent 1px);background-size:20px 20px;mask-image:linear-gradient(180deg,#000,transparent 40%)}
.brand{position:absolute;left:${P.pad}px;top:${P.pad}px;font-size:${P.brand}px;gap:10px}.brand img{width:${P.ic}px;height:${P.ic}px}
.txt{position:absolute;left:${P.pad}px;right:${P.pad}px;top:${P.top}px}
.kick{display:inline-block;font-size:${P.kick}px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#FFB054;background:rgba(255,176,84,.12);border:1.5px solid rgba(255,176,84,.35);padding:6px 15px;border-radius:99px}
h1{font-size:${P.h1}px;line-height:1.07;font-weight:800;letter-spacing:-.035em;margin-top:18px}
p.sub{font-size:${P.sub}px;line-height:1.4;color:rgba(255,255,255,.8);margin-top:14px}
.dev{position:absolute;left:${P.dev.l}px;top:${P.dev.t}px;width:${P.dev.w}px;padding:${P.dev.p}px;border-radius:${P.dev.r}px;background:linear-gradient(160deg,#2a3f40,#0b1617);box-shadow:0 40px 90px rgba(0,0,0,.55),0 0 0 2px rgba(255,255,255,.12) inset}
.dev .scr{border-radius:${P.dev.rs}px;overflow:hidden;background:#fff}.dev img{display:block;width:100%}
.glow{position:absolute;left:10%;bottom:-160px;width:80%;height:340px;background:radial-gradient(closest-side,rgba(242,85,59,.35),transparent);filter:blur(10px)}`;
};

function checkPng(f, w, h) {
  const b = fs.readFileSync(f);
  const ok = b.readUInt32BE(16) === w && b.readUInt32BE(20) === h && b[24] === 8 && b[25] === 2;
  if (!ok) throw new Error(`✗ ${f}: ${b.readUInt32BE(16)}×${b.readUInt32BE(20)} bit ${b[24]} type ${b[25]} (cần ${w}×${h}, RGB không alpha)`);
}

async function frameAll(RAW, OUT) {
  const { chromium } = await import('playwright');
  const browser = await chromium.launch();
  let n = 0;
  for (const [dev, d] of Object.entries(DEVICES)) {
    const page = await browser.newPage({ viewport: { width: d.w, height: d.h }, deviceScaleFactor: 2 });
    for (const lang of LANGS) {
      if (!SCREENS[0][lang]) throw new Error('Chưa có chữ cho ngôn ngữ ' + lang + ' (scripts/lib/app-shots-copy.mjs)');
      fs.mkdirSync(`${OUT}/${dev}/${lang}`, { recursive: true });
      for (let i = 0; i < SCREENS.length; i++) {
        const raw = `${RAW}/${dev}/${lang}/${i + 1}.png`;
        if (!fs.existsSync(raw)) throw new Error('✗ thiếu ảnh simulator ' + raw);
        const [kick, title, sub] = SCREENS[i][lang];
        await page.setContent(`<!doctype html><html lang="${lang}"><head><meta charset="utf-8">${FONT}<style>${css(d)}</style></head><body><div class="glow"></div>
          <div class="brand"><img src="${ICON}"><span>lex<b>kite</b></span></div>
          <div class="txt"><span class="kick">${kick}</span><h1>${title}</h1><p class="sub">${sub}</p></div>
          <div class="dev"><div class="scr"><img src="data:image/png;base64,${fs.readFileSync(raw).toString('base64')}"></div></div></body></html>`);
        await page.evaluate(() => document.fonts.ready); await sleep(300);
        const f = `${OUT}/${dev}/${lang}/${i + 1}.png`;
        await page.screenshot({ path: f, clip: { x: 0, y: 0, width: d.w, height: d.h } });
        checkPng(f, d.w * 2, d.h * 2); n++;
      }
    }
    await page.close();
  }
  await browser.close();
  const want = Object.keys(DEVICES).length * LANGS.length * SCREENS.length;
  if (n !== want) throw new Error(`✗ chỉ có ${n}/${want} ảnh`);
  console.log(`✓ ${n} ảnh App Store → ${OUT}`);
}

const [cmd, a, b] = process.argv.slice(2);
if (cmd === 'plan') {
  SCREENS.forEach((s, i) => console.log(`${i + 1} ${s.r} ${s.flip ? 1 : 0} ${s.dark ? 1 : 0} ${Math.ceil((s.wait || 4000) / 1000) + 1}`));
} else if (cmd === 'frame') {
  await frameAll(path.resolve(a || 'ios-raw'), path.resolve(b || 'ios-shots'));
} else if (cmd) {
  console.error('Dùng: node scripts/ios-shots.mjs plan | frame <raw> <out>'); process.exit(1);
}
