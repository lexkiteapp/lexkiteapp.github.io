// Luật chấm UI cho ui-audit-shots.mjs: nhận số liệu thô đo trong trang → danh sách lỗi {sev, rule, msg}. Thuần (không trình duyệt) nên test được ở scripts/test/ui-audit-rules.mjs.
export const SEV_ORDER = ['high', 'medium', 'low'];
const T = { overflow: 8, contrast: 4.5, contrastBig: 3, tap: 44, tapMouse: 24 }; // tap: cảm ứng 44 px; chuột (pointer:fine) 24 px theo WCAG 2.5.8
// Chữ bị che có tính lỗi không? Thanh dính che chữ đang trượt qua mà cuộn tới được → không; che lúc nghỉ (đầu trang dưới thanh trên, cuối trang dưới thanh dưới, trang ngắn không cuộn) → lỗi; không phải thanh dính → lỗi.
export const coverReal = (c, fits) => !c.side || (c.side === 'top' ? c.pos === 'top' : c.pos === 'bottom' || !!fits);
// Che giả (không mất chữ với người dùng): twin = phần tử che đã tự hiển thị đúng chữ đó; wrap = chữ inline xuống nhiều dòng (hộp bao quanh lớn hơn chữ, điểm mẫu rơi vào phần tử khác ở dòng trên); closed = chữ trong <details> đóng; iconCtl = icon ligature nằm dưới nút/link (icon trang trí của chính nút); stretch = nút kiểu stretched-link (::after absolute inset-0 trong suốt phủ cả hàng, chữ vẫn thấy rõ); overlay = chữ pointer-events:none phủ TRÊN nút (elementFromPoint bỏ qua nên thấy nút bên dưới).
export const coverNoise = c => !!(c.twin || c.wrap || c.closed || c.iconCtl || c.overlay || c.stretch);
export function audit(m) {
  const out = [], add = (sev, rule, msg) => out.push({ sev, rule, msg });
  if (m.measureFail) return [{ sev: 'high', rule: 'js', msg: 'không đo được: ' + m.measureFail }];
  for (const e of m.errs || []) add('high', 'js', 'lỗi JS: ' + e);
  if (m.docW > m.vw + T.overflow) add('high', 'overflow', `tràn ngang: trang rộng ${m.docW}px > khung ${m.vw}px`);
  if (m.textLen < 20) add('high', 'empty', 'màn trống (chữ trong #view < 20 ký tự)');
  const cov = (m.covered || []).filter(c => !coverNoise(c) && coverReal(c, m.docH <= m.vh + 1));
  if (cov.length) add('high', 'covered', 'chữ bị che: ' + cov.slice(0, 3).map(c => `"${c.text}" (${c.el}) bởi ${c.by}`).join('; '));
  const lowC = (m.contrast || []).filter(c => c.ratio < (c.big || c.icon ? T.contrastBig : T.contrast));
  if (lowC.length) add('medium', 'contrast', `tương phản thấp ${lowC.length} chỗ: ` + lowC.slice(0, 3).map(c => `"${c.text}" ${c.ratio}:1`).join('; '));
  if (m.primary && m.primaryInFold === false) add('medium', 'cta-fold', 'nút chính nằm ngoài màn đầu (phải cuộn mới thấy)');
  if ((m.placeholders || []).length) add('medium', 'placeholder', 'chữ giữ chỗ lọt ra giao diện: ' + m.placeholders.join(', '));
  if ((m.emptyBoxes || []).length) add('medium', 'empty-box', 'ô trống/bong bóng không có nội dung: ' + m.emptyBoxes.join(', '));
  if ((m.brokenImgs || []).length) add('medium', 'img', 'ảnh hỏng: ' + m.brokenImgs.join(', '));
  const tapMin = m.touch === false ? T.tapMouse : T.tap, small = (m.small || []).filter(x => x.w == null || Math.min(x.w, x.h) < tapMin);
  if (small.length) add(small.length >= 3 ? 'medium' : 'low', 'tap', `vùng chạm <${tapMin}px ${small.length} chỗ: ` + small.slice(0, 3).map(s => `"${s.text}" ${s.w}×${s.h}`).join('; '));
  return out;
}
