// Ảnh App Store cho app iOS (com.lexkite.app): chụp app GỐC trên iOS Simulator (GitHub Actions macOS, .github/workflows/ios-shots.yml),
// thứ tự màn từ scripts/store-art/spec.mjs, ghép khung bằng scripts/store-art/compose.mjs. Không chạy trên máy anh chủ (nặng).
//   node scripts/ios-shots.mjs plan   → in kế hoạch chụp cho workflow: "<n> <route> <step|-> <dark 0|1> <chờ giây>"
// Kích thước App Store: iPhone 6.9" 1320×2868 · iPad 13" 2064×2752, PNG RGB không alpha (compose.mjs kiểm).
import { SLIDES } from './store-art/spec.mjs';

const [cmd] = process.argv.slice(2);
if (cmd === 'plan') {
  SLIDES.forEach((s, i) => console.log(`${i + 1} ${s.route} ${s.steps || '-'} ${s.theme === 'dark' ? 1 : 0} ${Math.ceil((s.wait || 4000) / 1000) + (s.steps ? 8 : 1)}`));
} else if (cmd) {
  console.error('Dùng: node scripts/ios-shots.mjs plan'); process.exit(1);
}
