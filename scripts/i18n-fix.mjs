// Áp bản dịch tay (scripts/i18n-fixed.json) đè lên bản dịch máy trong web/js/i18n/<lang>.js và các nhóm tải lười
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = path.join(ROOT, 'web/js/i18n');
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
    if (k.startsWith('_') || !tr[lang]) continue;
    const g = keyToGroup.get(k);
    const f = g ? path.join(DIR, lang, `${g}.js`) : path.join(DIR, `${lang}.js`);
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
