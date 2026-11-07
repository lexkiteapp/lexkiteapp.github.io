// Trang Chính sách riêng tư 13 ngôn ngữ (ngoài en/vi) phải là bản dịch THẬT, không phải bản nháp tiếng Anh noindex (5/11).
// Gốc lỗi cũ: build-legal --translate gọi Google gtx; bị chặn sau 5 lần lỗi → 3.250 dòng giữ tiếng Anh mà log vẫn "✓" → 13 trang nháp.
// Nay: bản dịch người/biên tập nằm trong content/legal/cache/<lang>.json (khoá = dòng tiếng Anh). Cổng: đủ mọi dòng của content/legal/en/privacy.html,
// cùng chuỗi thẻ HTML, không còn nguyên tiếng Anh. Sửa bản en → dịch lại đúng dòng đổi ở 13 file cache (docs/I18N-PIPELINE.md).
import fs from 'node:fs';
const LANGS = ['es', 'pt', 'fr', 'de', 'id', 'th', 'zh', 'ja', 'ko', 'hi', 'ar', 'ru', 'tr'];
const NOTE = 'This translation is provided for your convenience. If there is any difference between versions, the English version prevails.';
const keep = s => /^<\/?table>$|^<!--VIMG-ROWS-->$/.test(s.trim());
const lines = [...fs.readFileSync('content/legal/en/privacy.html', 'utf8').split('\n').filter(l => l.trim() && !keep(l)), NOTE];
const tags = s => (s.match(/<\/?[a-z0-9]+(?:\s[^>]*)?>/gi) || []).map(t => t.replace(/\s+/g, ' ').toLowerCase()).join('');
// Dòng chỉ có tên pháp nhân + địa chỉ Mỹ giữ nguyên ở mọi ngôn ngữ (không có chữ để dịch)
const NAME_ONLY = k => /^<p><b>[A-Z ]+ LLC<\/b><br>[^<]+<\/p>$/.test(k.trim());
const txt = s => s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
let bad = 0;
for (const l of LANGS) {
  const c = JSON.parse(fs.readFileSync(`content/legal/cache/${l}.json`, 'utf8')), e = [];
  for (const k of lines) { const v = c[k]; if (!v) e.push(`thiếu: ${k.slice(0, 70)}`); else if (tags(v) !== tags(k)) e.push(`thẻ HTML lệch: ${k.slice(0, 70)}`); else if (!NAME_ONLY(k) && txt(k).length > 25 && txt(v) === txt(k)) e.push(`còn tiếng Anh: ${k.slice(0, 70)}`); }
  if (e.length) { bad++; console.error(`✗ legal-i18n ${l}: ${e.length} dòng – ${e.slice(0, 3).join(' · ')}`); }
  const html = fs.readFileSync(`web/${l}/privacy.html`, 'utf8');
  if (/name="robots" content="noindex"/.test(html) || !new RegExp(`<html lang="${l}"`).test(html)) { bad++; console.error(`✗ legal-i18n: web/${l}/privacy.html vẫn là bản nháp (noindex/lang≠${l}) → node scripts/build-legal.mjs`); }
}
if (bad) process.exit(1);
console.log(`✓ legal-i18n: privacy ${LANGS.length} ngôn ngữ dịch đủ ${lines.length} dòng, cùng thẻ HTML, không nháp`);
