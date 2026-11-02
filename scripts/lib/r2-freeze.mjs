// Chốt $0 của R2: free-tier guard (R2 ≥ 90 % hạn mức Free tháng) ghi web/free-tier-state.json r2 = "frozen" → mọi bên GHI R2 dừng
// (scripts/cdn/mirror.mjs bỏ qua trung tính; scripts/lib/media-store.mjs r2Config → null = lùi về repo GitHub). Gỡ tay: docs/FREE-TIER.md §R2.
import fs from 'node:fs';
export const STATE = 'web/free-tier-state.json';
export function r2Frozen(file = STATE) { try { return JSON.parse(fs.readFileSync(file, 'utf8')).r2 === 'frozen'; } catch (e) { return false; } }
