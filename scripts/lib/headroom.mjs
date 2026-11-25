// Cảnh báo sớm ngân sách (06/11): 05/11 khung app 374/374 KB – 2 PR xanh riêng, cộng lại vượt ngân sách (strict=false) → cả hàng đỏ.
// Vàng khi dư < 5 KB hoặc < 5 % trần – TRƯỚC khi đỏ. Không nâng ngân sách (no-cuts): chỉ báo để rà dữ liệu thừa.
export const MIN_FREE_B = 5 * 1024, MIN_FREE_PCT = 0.05, TARGET_FREE_PCT = 0.03, TOTALJS_MAX_FREE_B = 150 * 1024;   // 17/11: vàng khi dùng ≥ 95 % trần; mục tiêu main luôn chừa ≥ 3 % (giảm byte thật: tải lười, tách gói – không nâng trần)
/** items = [{ name, used, cap }] → các mục sắp hết chỗ (chưa vượt): [{ name, used, cap, free }]. Thuần. */
/** Chỗ trống cần có cho mục i: % trần, nhưng không quá i.maxFree. totalJs: size-budget cấm trần cách thực tế ≥ 200 KB (chỉ đi xuống) → mục tiêu 3 % (≈ 240 KB) KHÔNG đạt được; dùng min(3 %, TOTALJS_MAX_FREE_B) – sửa thước cho khớp luật, không nới. */
export const needFree = (i, pct) => Math.min(pct * i.cap, i.maxFree ?? Infinity);
export function lowHeadroom(items) {
  return items.filter(i => i && i.cap > 0 && i.used <= i.cap && (i.cap - i.used < MIN_FREE_B || i.cap - i.used < needFree(i, MIN_FREE_PCT)))
    .map(i => ({ ...i, free: i.cap - i.used }));
}
