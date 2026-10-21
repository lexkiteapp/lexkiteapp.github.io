#!/usr/bin/env node
// Tách các nhóm chuỗi tải lười (LAZY trong build-i18n.sh) cho 13 ngôn ngữ ngoài en.
// File web/js/i18n/<lang>.js chỉ giữ lại các khóa CORE (nhẹ ~100-115 KB gz, dưới trần 160 KB).
// Các khóa thuộc nhóm lười được tách thành web/js/i18n/<lang>/<nhóm>.js (tải khi mở tính năng đó).
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = path.join(ROOT, 'web/js/i18n');
const BUILD_SH = fs.readFileSync(path.join(ROOT, 'scripts/build-i18n.sh'), 'utf8');
const LAZY = ((BUILD_SH.match(/^LAZY="([^"]*)"/m) || [])[1] || '').split(/\s+/).filter(Boolean);
const LANGS = fs.readFileSync(path.join(ROOT, 'scripts/i18n-langs.txt'), 'utf8')
  .split('\n').map(s => s.trim()).filter(s => s && !s.startsWith('#'));

const loadDict = file => {
  if (!fs.existsSync(file)) return {};
  const ctx = { self: {}, I18N_DICT: {} };
  ctx.self = ctx;
  try {
    vm.createContext(ctx);
    vm.runInContext(fs.readFileSync(file, 'utf8'), ctx);
    const d = ctx.I18N_DICT || {};
    return Object.values(d)[0] || {};
  } catch (e) {
    console.error('Lỗi đọc ' + file + ':', e.message);
    return {};
  }
};

// 1. Đọc các khóa tiếng Anh cho core và từng nhóm lazy
const enCore = loadDict(path.join(DIR, 'en.js'));
const lazyGroups = {};
for (const g of LAZY) {
  const p = path.join(DIR, 'en', `${g}.js`);
  lazyGroups[g] = loadDict(p);
}

// 2. Xử lý từng ngôn ngữ
for (const lang of LANGS) {
  const langFile = path.join(DIR, `${lang}.js`);
  const langDir = path.join(DIR, lang);
  if (!fs.existsSync(langDir)) fs.mkdirSync(langDir, { recursive: true });

  // Nạp toàn bộ khóa hiện có (từ file tổng và từ các file nhóm nếu đã tách trước đó)
  const allDict = { ...loadDict(langFile) };
  for (const g of LAZY) {
    const gf = path.join(langDir, `${g}.js`);
    if (fs.existsSync(gf)) Object.assign(allDict, loadDict(gf));
  }

  // Ghi các file nhóm tải lười
  for (const g of LAZY) {
    const groupEn = lazyGroups[g];
    const groupDict = {};
    for (const k of Object.keys(groupEn)) {
      if (allDict[k] !== undefined) groupDict[k] = allDict[k];
      else groupDict[k] = groupEn[k]; // fallback tiếng Anh nếu thiếu
    }
    const gf = path.join(langDir, `${g}.js`);
    const content = `/* UI ${lang} – ${g} (nhóm tải lười). Sinh tự động từ scripts/build-i18n.sh. */\n(function (g) { const D = g.I18N_DICT = g.I18N_DICT || {}; D["${lang}"] = Object.assign(D["${lang}"] || {}, ${JSON.stringify(groupDict, null, 0)});\n})(typeof self !== 'undefined' ? self : this);\n`;
    fs.writeFileSync(gf, content);
  }

  // Ghi file core
  const coreDict = {};
  for (const k of Object.keys(enCore)) {
    if (allDict[k] !== undefined) coreDict[k] = allDict[k];
    else coreDict[k] = enCore[k]; // fallback tiếng Anh nếu thiếu
  }
  const coreContent = `/* UI ${lang} – SINH TỰ ĐỘNG từ en.js bằng scripts/gen-i18n.mjs (có thể hiệu đính tay; chạy lại chỉ dịch khóa mới). */\n(function (g) { const D = g.I18N_DICT = g.I18N_DICT || {}; D["${lang}"] = Object.assign(D["${lang}"] || {}, ${JSON.stringify(coreDict, null, 0)});\n})(typeof self !== 'undefined' ? self : this);\n`;
  fs.writeFileSync(langFile, coreContent);
}

console.log(`✓ split-i18n: đã tách ${LAZY.length} nhóm lười cho ${LANGS.length} ngôn ngữ.`);
