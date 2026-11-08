// Áp bản dịch tay (scripts/i18n-fixed.json) đè lên bản dịch máy trong NGUỒN i18n/ui/<lang>.js và các nhóm tải lười, rồi sinh lại gói khóa băm web/js/i18n/<lang>
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = path.join(ROOT, 'web/js/i18n'), SRC = path.join(ROOT, 'i18n/ui'); // en: web/js/i18n · 13 ngôn ngữ: nguồn i18n/ui
const fixed = JSON.parse(fs.readFileSync(new URL('./i18n-fixed.json', import.meta.url)));
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
for (const lang of ['es', 'pt', 'fr', 'de', 'id', 'th', 'zh', 'ja', 'ko', 'hi', 'ar', 'ru', 'tr']) {
  // Gom các cập nhật theo file đích: core hoặc nhóm lazy
  const filesMap = new Map();
  const getFileContent = f => {
    if (!filesMap.has(f)) {
      filesMap.set(f, fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : '');
    }
    return filesMap.get(f);
  };

  for (const [k, tr] of Object.entries(fixed)) {
    if (k.startsWith('_') || !tr[lang] || !enAll.has(k)) continue;
    const g = keyToGroup.get(k);
    const f = g ? path.join(SRC, lang, `${g}.js`) : path.join(SRC, `${lang}.js`);
    let s = getFileContent(f);
    if (!s) continue;
    const key = JSON.stringify(k), val = JSON.stringify(tr[lang]);
    const re = new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ':"(?:[^"\\\\]|\\\\.)*"');
    if (re.test(s)) {
      const before = s;
      s = s.replace(re, key + ':' + val);
      if (s !== before) { filesMap.set(f, s); n++; }
    } else {
      s = s.replace(/(D\[["']?[a-z]{2}["']?\]\s*=\s*Object\.assign\([^,]+,\s*\{)/, `$1${key}:${val},`);
      filesMap.set(f, s);
      n++;
    }
  }

  for (const [f, s] of filesMap) {
    fs.writeFileSync(f, s);
  }
}
console.log('✓ i18n-fix: ' + n + ' nhãn đã áp bản dịch tay');
{ const { packAll } = await import('./lib/i18n-pack.mjs'); packAll(); } // nguồn vừa sửa → gói chạy khóa băm
// Thư người báo lỗi (functions/api/_report-i18n.js) lấy chữ từ nhóm 'report' vừa cập nhật → sinh lại để không lệch nguồn
{ const { build } = await import('./gen-report-mail-i18n.mjs'); fs.writeFileSync(path.join(ROOT, 'functions/api/_report-i18n.js'), build()); }
