// 💰 Đọc web/js/ads/config.js lúc build (Node) → mã ô cho trang tĩnh. Thiết kế: docs/ADS.md §1. Markup ô: workers/lib/ad-slot.mjs.
// adsOn(place) chỉ đúng khi enabled = true + có client + có mã ô `place` → mặc định (cờ tắt / ô rỗng) không chèn gì (0 byte, 0 DOM).
// ADS_CONFIG_FILE (test) = đường dẫn config khác để thử chế độ bật mà không sửa config thật.
import fs from 'node:fs'; import vm from 'node:vm';
export function loadAds(file = process.env.ADS_CONFIG_FILE || new URL('../../web/js/ads/config.js', import.meta.url)) {
  try { const c = { self: {} }; c.self = c; vm.runInNewContext(fs.readFileSync(file, 'utf8'), c); return c.ADS_CONFIG || null; } catch (e) { return null; }
}
export const adsOn = (place, a = loadAds()) => !!(a && a.enabled && a.web && a.web.client && a.web.slots && a.web.slots[place]);
