#!/usr/bin/env node
// docs/specs/upgrade-audit.md: bản kiểm toán nâng cấp ≤ 1 trang cho chủ. Script chỉ (a) làm mới khối số đo Lighthouse từ
// reports/lighthouse.json giữa 2 dấu <!-- measured:start/end -->, (b) --check: ≤ 1 trang, đủ 5 trục, chỉ công nghệ miễn phí.
// KHÔNG triển khai gì từ danh sách (việc của chủ duyệt).   node scripts/ci/upgrade-audit.mjs --measure | --check
import fs from 'node:fs';
export const DOC = 'docs/specs/upgrade-audit.md', MAX_LINES = 70, MAX_BYTES = 9000;
export const AXES = ['UX', 'Hiệu năng', 'Trợ năng', 'Nội dung', 'AI'];
const START = '<!-- measured:start -->', END = '<!-- measured:end -->';
const BANNED = /\b(elevenlabs|openai api|gpt-4|paid plan|subscription)\b/i;  // phần "Không làm" được phép nêu tên để loại

export function measured(lh) {
  const rows = Object.entries(lh).filter(([k]) => !k.startsWith('desktop:'));
  if (!rows.length) return '(chưa có số đo)';
  const med = a => { const s = [...a].sort((x, y) => x - y); return s[Math.floor((s.length - 1) / 2)]; };
  const sc = c => med(rows.map(([, v]) => v.scores[c]));
  const worst = (c) => rows.reduce((m, r) => (r[1].scores[c] < m[1].scores[c] ? r : m));
  const lcp = med(rows.map(([, v]) => parseFloat(v.metrics['largest-contentful-paint'])));
  const w = worst('performance'), a = worst('accessibility');
  return `Điện thoại, ${rows.length} trang (trung vị): hiệu năng ${sc('performance')} · trợ năng ${sc('accessibility')} · SEO ${sc('seo')} · LCP ${lcp} s. Yếu nhất: hiệu năng \`${w[0]}\` ${w[1].scores.performance}; trợ năng \`${a[0]}\` ${a[1].scores.accessibility}.`;
}

export function check(txt) {
  const bad = [], lines = txt.split('\n').length;
  if (lines > MAX_LINES || Buffer.byteLength(txt) > MAX_BYTES) bad.push(`quá 1 trang (${lines} dòng, ${Buffer.byteLength(txt)} byte; tối đa ${MAX_LINES}/${MAX_BYTES})`);
  for (const a of AXES) if (!new RegExp('^##.*' + a, 'm').test(txt)) bad.push('thiếu trục: ' + a);
  if (!/^> TL;DR:/m.test(txt.slice(0, 1500))) bad.push('thiếu TL;DR');
  if (!txt.includes(START) || !txt.includes(END)) bad.push('thiếu khối số đo');
  const m = txt.split(/^## Không làm/m)[0].match(BANNED); if (m) bad.push('nhắc dịch vụ trả phí/ngoài luật: ' + m[0]);
  return bad;
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())) {
  let txt = fs.readFileSync(DOC, 'utf8');
  if (process.argv.includes('--measure')) {
    const lh = JSON.parse(fs.readFileSync('reports/lighthouse.json', 'utf8'));
    const re = new RegExp(START + '[\\s\\S]*?' + END);
    txt = txt.replace(re, START + '\n' + measured(lh) + '\n' + END); fs.writeFileSync(DOC, txt); console.log('measured ✓');
  }
  if (process.argv.includes('--check')) { const bad = check(txt); bad.forEach(b => console.error('✗ upgrade-audit: ' + b)); if (bad.length) process.exit(1); console.log('✓ upgrade-audit: ≤ 1 trang, đủ 5 trục'); }
}
