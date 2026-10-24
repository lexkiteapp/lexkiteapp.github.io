// Sinh workers/push/copy.json: câu FCM (app gốc đóng – máy chủ không có dữ liệu học) cho 15 ngôn ngữ từ nhóm i18n "remind" (en + 13 + vi gốc). Thiếu → en, KHÔNG BAO GIỜ vi cho người không-vi.
// Dùng: node scripts/push-copy.mjs [--check]   (npm test chạy --check: copy.json phải khớp bản dịch)
import fs from 'node:fs';
import vm from 'node:vm';
const KEYS = { back: ['Đến giờ học với Kit rồi!', 'Mở Lexkite để ôn vài từ nhé.'], miss: ['Kit nhớ bạn lắm 🐦', 'Lâu rồi không gặp. Quay lại 2 phút thôi nhé? Đây là lời nhắc cuối cùng.'], week: ['Tiến bộ tuần', 'Xem tiến bộ của bạn trong tuần.'] };
const LANGS = ['en', ...fs.readFileSync('scripts/i18n-langs.txt', 'utf8').split('\n').map(s => s.trim()).filter(s => s && !s.startsWith('#'))];
const load = f => { const c = { self: {}, I18N_DICT: {} }; c.self = c; vm.runInNewContext(fs.readFileSync(f, 'utf8'), c); return Object.values(c.I18N_DICT)[0] || {}; };
const out = { vi: Object.fromEntries(Object.entries(KEYS).map(([k, [t, b]]) => [k, [t, b]])) };
const en = load('web/js/i18n/en/remind.js');
for (const l of LANGS) {
  const d = l === 'en' ? en : load(`web/js/i18n/${l}/remind.js`);
  out[l] = Object.fromEntries(Object.entries(KEYS).map(([k, ks]) => [k, ks.map(x => d[x] || en[x])]));
}
for (const [l, v] of Object.entries(out)) for (const [k, a] of Object.entries(v)) if (!a[0] || !a[1] || (l !== 'vi' && /[ạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹđ]/i.test(a.join(' ')))) { console.error(`✗ push-copy: ${l}.${k} thiếu hoặc lẫn tiếng Việt`); process.exit(1); }
const txt = JSON.stringify(out, null, 1) + '\n', F = 'workers/push/copy.json';
if (process.argv.includes('--check')) { if (!fs.existsSync(F) || fs.readFileSync(F, 'utf8') !== txt) { console.error('✗ push-copy: workers/push/copy.json cũ – chạy node scripts/push-copy.mjs'); process.exit(1); } console.log(`✓ push-copy: ${Object.keys(out).length} ngôn ngữ`); }
else { fs.writeFileSync(F, txt); console.log('✎ ' + F); }
