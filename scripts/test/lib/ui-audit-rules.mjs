// Luật chấm UI cho ui-audit-shots.mjs: nhận số liệu thô đo trong trang → danh sách lỗi {sev, rule, msg}. Thuần (không trình duyệt) nên test được ở scripts/test/ui-audit-rules.mjs.
export const SEV_ORDER = ['high', 'medium', 'low'];
const T = { overflow: 8, contrast: 4.5, contrastBig: 3, tap: 44 };
// Chữ bị che có tính lỗi không? Thanh dính che chữ đang trượt qua mà cuộn tới được → không; che lúc nghỉ (đầu trang dưới thanh trên, cuối trang dưới thanh dưới, trang ngắn không cuộn) → lỗi; không phải thanh dính → lỗi.
export const coverReal = (c, fits) => !c.side || (c.side === 'top' ? c.pos === 'top' : c.pos === 'bottom' || !!fits);
export function audit(m) {
  const out = [], add = (sev, rule, msg) => out.push({ sev, rule, msg });
  if (m.measureFail) return [{ sev: 'high', rule: 'js', msg: 'không đo được: ' + m.measureFail }];
  for (const e of m.errs || []) add('high', 'js', 'lỗi JS: ' + e);
  if (m.docW > m.vw + T.overflow) add('high', 'overflow', `tràn ngang: trang rộng ${m.docW}px > khung ${m.vw}px`);
  if (m.textLen < 20) add('high', 'empty', 'màn trống (chữ trong #view < 20 ký tự)');
  const cov = (m.covered || []).filter(c => coverReal(c, m.docH <= m.vh + 1));
  if (cov.length) add('high', 'covered', 'chữ bị che: ' + cov.slice(0, 3).map(c => `"${c.text}" (${c.el}) bởi ${c.by}`).join('; '));
  const lowC = (m.contrast || []).filter(c => c.ratio < (c.big ? T.contrastBig : T.contrast));
  if (lowC.length) add('medium', 'contrast', `tương phản thấp ${lowC.length} chỗ: ` + lowC.slice(0, 3).map(c => `"${c.text}" ${c.ratio}:1`).join('; '));
  if (m.primary && m.primaryInFold === false) add('medium', 'cta-fold', 'nút chính nằm ngoài màn đầu (phải cuộn mới thấy)');
  if ((m.placeholders || []).length) add('medium', 'placeholder', 'chữ giữ chỗ lọt ra giao diện: ' + m.placeholders.join(', '));
  if ((m.emptyBoxes || []).length) add('medium', 'empty-box', 'ô trống/bong bóng không có nội dung: ' + m.emptyBoxes.join(', '));
  if ((m.brokenImgs || []).length) add('medium', 'img', 'ảnh hỏng: ' + m.brokenImgs.join(', '));
  const small = m.small || [];
  if (small.length) add(small.length >= 3 ? 'medium' : 'low', 'tap', `vùng chạm <${T.tap}px ${small.length} chỗ: ` + small.slice(0, 3).map(s => `"${s.text}" ${s.w}×${s.h}`).join('; '));
  return out;
}
