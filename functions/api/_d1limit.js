/* Lỗi "D1 hết hạn mức ngày" (gói miễn phí: 5 triệu dòng đọc / 100 nghìn dòng ghi mỗi ngày, đặt lại 00:00 UTC).
 * Khi hạn mức đã cạn, mọi truy vấn D1 ném lỗi → trước đây endpoint trả 500 {error:'error'} và CI báo đỏ như lỗi thật (22–23/10/2026).
 * isD1Limit(e) nhận ra lỗi đó để endpoint việc nền trả 429 {error:'quota-guard', reason:'d1-limit'} – cùng mã với cầu dao _d1guard.js,
 * nên mọi script CI đã biết "quota-guard" (dừng, không thử lại, mai chạy tiếp) và scripts/ci/quota-skip.mjs xử lý như bỏ qua trung tính.
 * Chỉ khớp khi thông điệp nói về D1/cơ sở dữ liệu VÀ về hạn mức ngày/đọc/ghi VÀ "limit/exceeded/quota" – lỗi SQL thường vẫn là 500 (lỗi thật). */
export function isD1Limit(e) {
  const m = String((e && (e.message || e.code)) || e || '') + ' ' + String((e && e.cause && e.cause.message) || '');
  return /\b(D1|D1_ERROR|SQLITE\w*|database|DB)\b/i.test(m)
    && /(daily|per[ -]day|rows?[ _-]?(read|written)|\breads?\b|\bwrites?\b)/i.test(m)
    && /(limit|exceed|quota)/i.test(m);
}
export const D1_LIMIT_BODY = { error: 'quota-guard', reason: 'd1-limit' };
