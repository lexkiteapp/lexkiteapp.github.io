// Sinh functions/api/_report-i18n.js: chữ trong thư gửi người báo lỗi (15 ngôn ngữ) lấy từ nhóm dịch 'report' của app
// (web/js/i18n/<lang>/report.js – một nguồn, quy trình docs/I18N-PIPELINE.md). Chạy: node scripts/gen-report-mail-i18n.mjs [--check]
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'functions/api/_report-i18n.js');
export const MAIL_KEYS = ['Báo lỗi {id}: {s}', 'Đã nhận', 'Mới', 'Đã tiếp nhận', 'Đang xử lý', 'Đã sửa', 'Không sửa', 'Trùng lặp', 'Cảm ơn bạn đã giúp Lexkite tốt hơn!',
  'Phản hồi từ Lexkite', 'Trùng với {id}', 'Đã sửa trong phiên bản {v}', 'Xem trạng thái', 'Dự kiến xử lý: {t}', 'trong {n} giờ', 'trong {a}–{b} ngày', 'trong 1 tuần', 'trong {n} ngày',
  'Đội ngũ sẽ xem xét đề xuất – bạn sẽ được báo nếu tính năng được làm.', 'Lưu đường dẫn riêng này để theo dõi trạng thái:', 'Bạn nhận thư này vì đã chọn nhận cập nhật khi gửi báo lỗi.',
  'Cảm ơn bạn đã báo! Đội ngũ đã nhận được và sẽ xem sớm.', 'Đội ngũ đang xử lý vấn đề này và sẽ báo bạn ngay khi xong.', 'Vấn đề này đã được sửa. Cảm ơn bạn đã báo! Hãy tải lại app để dùng bản mới.', 'Đội ngũ cần thêm chút thông tin: bạn đang làm gì khi lỗi xảy ra, và lỗi có lặp lại không? Hãy gửi một báo lỗi mới kèm ảnh chụp nếu được.'];
export const LANGS = ['vi', 'en', ...fs.readFileSync(path.join(ROOT, 'scripts/i18n-langs.txt'), 'utf8').split('\n').map(x => x.replace(/#.*/, '').trim()).filter(x => x && x !== 'en' && x !== 'vi')];
const load = lang => { const ctx = {}; ctx.self = ctx; vm.createContext(ctx); vm.runInContext(fs.readFileSync(path.join(ROOT, lang === 'en' ? 'web/js/i18n' : 'i18n/ui', lang, 'report.js'), 'utf8'), ctx); return (ctx.I18N_DICT || {})[lang] || {}; };

export function build() {
  const D = {};
  for (const l of LANGS) {
    if (l === 'vi') continue;
    const d = load(l); D[l] = MAIL_KEYS.map(k => { if (typeof d[k] !== 'string' || !d[k]) throw new Error(`thiếu bản dịch ${l}: ${k}`); return d[k]; });
  }
  return `/* FILE SINH TỰ ĐỘNG bằng scripts/gen-report-mail-i18n.mjs từ i18n/ui/<lang>/report.js – đừng sửa tay (sửa bản dịch ở nguồn rồi chạy lại). */\n`
    + `export const MAIL_KEYS = ${JSON.stringify(MAIL_KEYS)};\nexport const MAIL_I18N = ${JSON.stringify(D, null, 0).replace(/\],"/g, '],\n"')};\n`;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const s = build();
  if (process.argv.includes('--check')) { if (!fs.existsSync(OUT) || fs.readFileSync(OUT, 'utf8') !== s) { console.error('✗ functions/api/_report-i18n.js lệch nguồn – chạy: node scripts/gen-report-mail-i18n.mjs'); process.exit(1); } console.log('✓ report mail i18n khớp nguồn'); }
  else { fs.writeFileSync(OUT, s); console.log('✓ ghi', path.relative(ROOT, OUT), LANGS.length, 'ngôn ngữ'); }
}
