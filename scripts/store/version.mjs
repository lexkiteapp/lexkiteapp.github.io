// Số phiên bản cho nộp store tự động (thuần, không mạng) – .github/workflows/store-submit.yml. Luật: KHÔNG BAO GIỜ dùng lại version/build đã có.
//  - version hiển thị (MARKETING_VERSION / versionName): bump(patch|minor) từ bản LỚN NHẤT đã dùng (store + tag store-<platform>-*),
//    nhưng nếu store đang có bản CHƯA phát hành sửa được (PREPARE_FOR_SUBMISSION, bị từ chối…) thì dùng tiếp/nâng bản đó (không tạo trùng).
//  - số build (CFBundleVersion / versionCode): max(mọi build đã tải lên) + 1, không dưới sàn của app (native ≥ 10000 iOS / ≥ 200000 Android).

/** "1.2" → [1,2,0]; chuỗi lạ → null. */
export function parseVer(s) {
  const m = /^\s*v?(\d+)(?:\.(\d+))?(?:\.(\d+))?\s*$/.exec(String(s ?? ''));
  return m ? [+m[1], +(m[2] || 0), +(m[3] || 0)] : null;
}
export const fmtVer = v => v.join('.');
export function cmpVer(a, b) {
  const x = typeof a === 'string' ? parseVer(a) : a, y = typeof b === 'string' ? parseVer(b) : b;
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] - y[i];
  return 0;
}
/** Bản lớn nhất trong danh sách chuỗi (bỏ qua chuỗi lạ); rỗng → null. */
export function maxVer(list) {
  const vs = list.map(parseVer).filter(Boolean);
  return vs.length ? fmtVer(vs.reduce((a, b) => (cmpVer(a, b) >= 0 ? a : b))) : null;
}
export function bumpVer(v, kind = 'patch') {
  const p = parseVer(v); if (!p) throw new Error(`version lạ: ${v}`);
  if (kind === 'minor') return fmtVer([p[0], p[1] + 1, 0]);
  if (kind === 'patch') return fmtVer([p[0], p[1], p[2] + 1]);
  throw new Error(`bump phải là patch|minor, không phải ${kind}`);
}

/**
 * Phiên bản kế tiếp.
 * @param {object} o
 * @param {string[]} o.used     mọi version đã phát hành/đã nộp (không được dùng lại)
 * @param {string|null} o.editable  version đang sửa được trên store (chưa phát hành) – dùng tiếp nếu > used
 * @param {'patch'|'minor'} o.bump
 * @param {string|null} o.floor  sàn (native = 2.0.0)
 * @returns {{ version: string, reuseEditable: boolean }}  reuseEditable = giữ nguyên bản đang sửa (không PATCH versionString)
 */
export function nextVersion({ used = [], editable = null, bump = 'patch', floor = null }) {
  const top = maxVer(used) || '0.0.0';
  let want = bumpVer(top, bump);
  if (floor && cmpVer(floor, want) > 0) want = fmtVer(parseVer(floor));
  if (editable && parseVer(editable) && cmpVer(editable, top) > 0 && cmpVer(editable, want) >= 0) return { version: fmtVer(parseVer(editable)), reuseEditable: true };
  return { version: want, reuseEditable: false };
}

/** Số build kế tiếp: max(các số đã có, sàn - 1) + 1. Chuỗi kiểu "57" hoặc "1.0.57" → lấy số cuối. */
export function nextBuild(existing = [], floor = 1) {
  const nums = existing.map(x => { const m = /(\d+)\s*$/.exec(String(x)); return m ? +m[1] : NaN; }).filter(Number.isFinite);
  return Math.max(floor - 1, ...nums) + 1;
}

/** Tag git của bản đã nộp: store-ios-1.0.2 / store-android-1.0.2 → version (lọc đúng nền tảng, bỏ tag phụ -rollout-*). */
export function versionsFromTags(tags, platform) {
  const re = new RegExp(`^store-${platform}-(\\d+\\.\\d+\\.\\d+)$`);
  return tags.map(t => re.exec(t.trim())).filter(Boolean).map(m => m[1]);
}
export const storeTag = (platform, version) => `store-${platform}-${version}`;

/** Sàn theo app: native thay bản Capacitor nên luôn lớn hơn (spec docs/specs/native-apps.md). */
export const FLOORS = {
  capacitor: { version: null, iosBuild: 1, androidCode: 1001 },
  native: { version: '2.0.0', iosBuild: 10000, androidCode: 200000 },
};
