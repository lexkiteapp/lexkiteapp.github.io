// 🧪 Mở trình duyệt Playwright cho test e2e: CI giữ nguyên cờ của kịch bản; PW_LOCAL=1 (máy dev trong sandbox macOS) thêm cờ để Chromium chạy được:
// --single-process (sandbox chặn mach port của tiến trình con) + --disable-gpu, proxy lấy từ HTTPS_PROXY (Chromium không tự đi proxy). Thêm --disable-webgl /
// --disable-software-rasterizer làm sập trang app lúc onboarding (3/11) – đổi cờ thử bằng PW_LOCAL_ARGS="…".
// Lưu ý máy dev: mỗi trình duyệt chỉ chạy 1 context (đóng context = sập) → test mở trình duyệt mới cho mỗi ngữ cảnh.
// WebKit sập trong sandbox macOS → chỉ chạy trên CI Ubuntu. Dùng: const b = await launch(chromium, { args: [...] })
export const LOCAL = process.env.PW_LOCAL === '1';
const LOCAL_ARGS = process.env.PW_LOCAL_ARGS ? process.env.PW_LOCAL_ARGS.split(' ') : ['--single-process', '--disable-gpu'];
export function launch(type, o = {}) {
  const chromium = type.name() === 'chromium', args = [...(o.args || []), ...(LOCAL && chromium ? LOCAL_ARGS : [])];
  const px = LOCAL && (process.env.HTTPS_PROXY || process.env.https_proxy);
  return type.launch({ ...o, args: chromium ? args : (o.webkitArgs || []), ...(px ? { proxy: { server: px } } : {}) });
}
