// Ảnh App Store cho app iOS (com.lexkite.app): chụp app GỐC trên iOS Simulator (GitHub Actions macOS, .github/workflows/ios-shots.yml)
// rồi đóng khung + chữ giống ảnh Google Play (cùng màn hình, cùng chữ: scripts/lib/app-shots-copy.mjs).
// Không chạy trên máy anh chủ (nặng). Dùng:
//   node scripts/ios-shots.mjs plan                 → in kế hoạch chụp cho workflow: "<n> <route> <flip 0|1> <dark 0|1> <chờ giây>"
//   node scripts/ios-shots.mjs frame <raw> <out>    → <raw>/<device>/<lang>/<n>.png (ảnh simulator) → <out>/<device>/<lang>/<n>.png
// Kích thước App Store: iPhone 6.9" 1320×2868 (APP_IPHONE_67) · iPad 13" 2064×2752 (APP_IPAD_PRO_3GEN_129). PNG RGB không alpha.
import fs from 'fs';
import path from 'path';
import { SCREENS } from './lib/app-shots-copy.mjs';
import { TARGETS, framePortrait } from './lib/store-frame.mjs';

const DEVICES = ['iphone-69', 'ipad-13']; // ảnh Simulator → khung chung scripts/lib/store-frame.mjs (TARGETS)
const LANGS = (process.env.LANGS || 'en,vi').split(',');

async function frameAll(RAW, OUT) {
  const { chromium } = await import('playwright');
  const browser = await chromium.launch(), page = await browser.newPage({ deviceScaleFactor: 1 });
  let n = 0;
  for (const dev of DEVICES) for (const lang of LANGS) {
    if (!SCREENS[0][lang]) throw new Error('Chưa có chữ cho ngôn ngữ ' + lang + ' (scripts/lib/app-shots-copy.mjs)');
    fs.mkdirSync(`${OUT}/${dev}/${lang}`, { recursive: true });
    for (let i = 0; i < SCREENS.length; i++) {
      const raw = `${RAW}/${dev}/${lang}/${i + 1}.png`;
      if (!fs.existsSync(raw)) throw new Error('✗ thiếu ảnh simulator ' + raw);
      const [kick, title, sub] = SCREENS[i][lang];
      await framePortrait(page, TARGETS[dev], { lang, kick, title, sub, chip: SCREENS[i].chip?.[lang], shot: fs.readFileSync(raw), file: `${OUT}/${dev}/${lang}/${i + 1}.png`, bar: false }); n++;
    }
  }
  await browser.close();
  const want = DEVICES.length * LANGS.length * SCREENS.length;
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
