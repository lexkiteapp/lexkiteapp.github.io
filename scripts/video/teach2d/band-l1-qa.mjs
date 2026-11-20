// Hook + mẹo bản địa của series Band 5→7→9 (content/video/teach2d/bands.json, docs/specs/band-upgrade.md): đủ 15 ngôn ngữ × mọi lý do nâng band, luật i18n chung
// (scripts/lib/i18n-rules.mjs), "Band 5 → 7 → 9" còn nguyên trong hook, độ dài, không còn là tiếng Anh.
// Dùng: node scripts/video/teach2d/band-l1-qa.mjs   → exit 1 nếu đỏ
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { VI, BAD, INFORMAL } from '../../lib/i18n-rules.mjs';

const ROOT = fileURLToPath(new URL('../../../', import.meta.url)), B = JSON.parse(fs.readFileSync(ROOT + 'content/video/teach2d/bands.json', 'utf8'));
const LANGS = ['vi', 'es', 'pt', 'fr', 'de', 'ru', 'tr', 'ar', 'hi', 'th', 'zh', 'ja', 'ko', 'id'], bad = [], fail = m => { bad.push(m); console.log('✗', m); };
const REASONS = Object.keys(B.reasons), en = B.langs.en;
for (const L of [...LANGS, 'en']) if (!B.langs[L]) fail(`thiếu ngôn ngữ ${L}`);
for (const k of REASONS) if (en.tips[k] !== B.reasons[k].en) fail(`en/${k}: khác câu đọc trong reasons`);
for (const L of LANGS) {
  const c = B.langs[L]; if (!c) continue;
  if (!c.hook.includes('Band 5 → 7 → 9')) fail(`${L}: hook mất "Band 5 → 7 → 9"`);
  if ([...c.hook].length > 34) fail(`${L}: hook ${[...c.hook].length} > 34 ký tự`);
  if (c.hook === en.hook) fail(`${L}: hook còn là tiếng Anh`);
  for (const k of REASONS) {
    const t = c.tips?.[k], where = `${L}/${k}`;
    if (!t) { fail(`${where}: thiếu`); continue; }
    if (L !== 'vi' && VI.test(c.hook + t)) fail(`${where}: lọt chữ vi`);
    if (BAD.test(c.hook + t)) fail(`${where}: cụm bị cấm`);
    if (INFORMAL[L]?.test(c.hook + t)) fail(`${where}: sai xưng hô (de = Sie, fr = vous)`);
    if ([...t].length > 50) fail(`${where}: mẹo ${[...t].length} > 50 ký tự`);
    if (t === en.tips[k]) fail(`${where}: còn là tiếng Anh`);
  }
}
console.log(bad.length ? `band-l1: ${bad.length} lỗi` : `band-l1: OK (${LANGS.length} ngôn ngữ × ${REASONS.length} lý do)`);
process.exit(bad.length ? 1 : 0);
