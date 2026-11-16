// Cảnh báo sớm ngân sách (06/11): 05/11 khung app 374/374 KB – 2 PR xanh riêng, cộng lại vượt ngân sách (strict=false) → cả hàng đỏ.
// Vàng khi dư < 5 KB hoặc < 2 % trần – TRƯỚC khi đỏ. Không nâng ngân sách (no-cuts): chỉ báo để rà dữ liệu thừa.
export const MIN_FREE_B = 5 * 1024, MIN_FREE_PCT = 0.02;
/** items = [{ name, used, cap }] → các mục sắp hết chỗ (chưa vượt): [{ name, used, cap, free }]. Thuần. */
export function lowHeadroom(items) {
  return items.filter(i => i && i.cap > 0 && i.used <= i.cap && (i.cap - i.used < MIN_FREE_B || (i.cap - i.used) / i.cap < MIN_FREE_PCT))
    .map(i => ({ ...i, free: i.cap - i.used }));
}
