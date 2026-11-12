// Áp bản dịch tay (scripts/i18n-fixed.json) đè lên bản dịch máy trong NGUỒN i18n/ui/<lang>.js và các nhóm tải lười, rồi sinh lại gói khóa băm web/js/i18n/<lang>
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath } from 'url';
import { LANGS, srcPath, loadSrc, writeSrc } from './lib/i18n-pack.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = path.join(ROOT, 'web/js/i18n'), SRC = path.join(ROOT, 'i18n/ui'); // en: web/js/i18n · 13 ngôn ngữ: nguồn i18n/ui
const fixed = JSON.parse(fs.readFileSync(new URL('./i18n-fixed.json', import.meta.url)));
// Khóa native: chữ app native đã phát hành (native/shared/gen/strings/<lang>.json, khớp ảnh chụp) thắng bản dịch máy lẫn bản sửa – bot dịch lại không thể làm trôi native nữa (#983).
// Muốn đổi chữ native thật: PR chạy I18N_NATIVE_UNLOCK=1 node scripts/i18n-fix.mjs && node scripts/native/gen.mjs, cập nhật ảnh cùng PR.
if (!process.env.I18N_NATIVE_UNLOCK) {
  const NS = path.join(ROOT, 'native/shared/gen/strings'), ids = JSON.parse(fs.readFileSync(path.join(ROOT, 'native/shared/strings.json'), 'utf8'));
  let held = 0;
  for (const f of fs.existsSync(NS) ? fs.readdirSync(NS) : []) {
    const lang = f.replace('.json', ''), shipped = JSON.parse(fs.readFileSync(path.join(NS, f), 'utf8'));
    if (lang === 'vi' || lang === 'en') continue;
    for (const [id, vi] of Object.entries(ids)) {
      if (id.startsWith('_') || !shipped[id]) continue;
      if (fixed[vi]?.[lang] && fixed[vi][lang] !== shipped[id]) held++;
      (fixed[vi] ||= {})[lang] = shipped[id];
    }
  }
  if (held) console.log(`i18n-fix: ${held} bản sửa tay chạm chữ native – giữ chữ native, cần PR riêng (I18N_NATIVE_UNLOCK=1)`);
}
const BUILD_SH = fs.readFileSync(path.join(ROOT, 'scripts/build-i18n.sh'), 'utf8');
const LAZY = ((BUILD_SH.match(/^LAZY="([^"]*)"/m) || [])[1] || '').split(/\s+/).filter(Boolean);

const loadDict = file => {
  if (!fs.existsSync(file)) return {};
  const ctx = { self: {}, I18N_DICT: {} };
  ctx.self = ctx;
  try {
    vm.createContext(ctx);
    vm.runInContext(fs.readFileSync(file, 'utf8'), ctx);
    const d = ctx.I18N_DICT || {};
    return Object.values(d)[0] || {};
  } catch (e) { return {}; }
};

const keyToGroup = new Map();
for (const g of LAZY) {
  const d = loadDict(path.join(DIR, 'en', `${g}.js`));
  for (const k of Object.keys(d)) keyToGroup.set(k, g);
}

// Chỉ áp khóa có en: khóa mồ côi (mã đã bỏ, không t() nào gọi) không vào gói – không ai đọc tới mà tốn byte ở 13 ngôn ngữ. Bản dịch vẫn lưu trong i18n-fixed.json; khóa dùng lại → thêm en là có ngay.
const enAll = new Set([...keyToGroup.keys(), ...Object.keys(loadDict(path.join(DIR, 'en.js')))]);

let n = 0;
for (const lang of LANGS) {
  // Gom theo tệp nguồn đích (lõi hoặc nhóm lười) rồi ghi lại MỘT lần bằng định dạng nguồn chung (srcText: mỗi khóa một dòng, sắp xếp)
  const dicts = new Map(); // group ('' = lõi) → từ điển nguồn
  for (const [k, tr] of Object.entries(fixed)) {
    if (k.startsWith('_') || !tr[lang] || !enAll.has(k)) continue;
    const g = keyToGroup.get(k) || '';
    if (!fs.existsSync(path.join(ROOT, srcPath(lang, g)))) continue;
    if (!dicts.has(g)) dicts.set(g, loadSrc(lang, g));
    const d = dicts.get(g);
    if (d[k] !== tr[lang]) { d[k] = tr[lang]; n++; }
  }
  for (const [g, d] of dicts) writeSrc(lang, g, d);
}
console.log('✓ i18n-fix: ' + n + ' nhãn đã áp bản dịch tay');
{ const { packAll } = await import('./lib/i18n-pack.mjs'); packAll(); } // nguồn vừa sửa → gói chạy khóa băm
// Thư người báo lỗi (functions/api/_report-i18n.js) lấy chữ từ nhóm 'report' vừa cập nhật → sinh lại để không lệch nguồn
{ const { build } = await import('./gen-report-mail-i18n.mjs'); fs.writeFileSync(path.join(ROOT, 'functions/api/_report-i18n.js'), build()); }
