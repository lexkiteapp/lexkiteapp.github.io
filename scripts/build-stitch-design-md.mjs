// 🎨 brand/stitch/DESIGN.md (định dạng DESIGN.md của Google Stitch) SINH từ brand/tokens.json (màu + họ chữ) và brand/stitch/tokens.dtcg.json (cỡ chữ, bo góc, khoảng cách)
// → hệ thiết kế Stitch DUY NHẤT của Lexkite, không bao giờ lệch bảng màu/chữ. Dùng: node scripts/build-stitch-design-md.mjs [--check]. Quy trình: docs/DESIGN-SYSTEM.md §2b.
import fs from 'node:fs';
import { roleHex, loadTokens } from './lib/st-theme-snap.mjs';

export function designMd(T = loadTokens(), D = JSON.parse(fs.readFileSync('brand/stitch/tokens.dtcg.json', 'utf8'))) {
  const fam = T.typography.body.family, q = s => `"${s}"`;
  const colors = m => Object.keys(T.roles).map(k => `  ${k}: ${q(roleHex(T, k, m))}`).join('\n');
  const type = Object.entries(D.typography).map(([k, { $value: v }]) =>
    `  ${k}:\n    fontFamily: ${fam}\n    fontSize: ${v.fontSize}\n    fontWeight: ${v.fontWeight}\n    lineHeight: ${v.lineHeight}\n    letterSpacing: ${v.letterSpacing}`).join('\n');
  const rad = Object.entries(D.radius).map(([k, v]) => `  ${k}: ${v.$value}`).join('\n');
  const sp = Object.entries(D.spacing).map(([k, v]) => `  ${k}: ${v.$value}`).join('\n');
  return `---
name: Lexkite
colors:
${colors('light')}
typography:
${type}
rounded:
${rad}
spacing:
${sp}
---

<!-- SINH bởi scripts/build-stitch-design-md.mjs từ brand/tokens.json + brand/stitch/tokens.dtcg.json – KHÔNG sửa tay. -->
# Lexkite design system

English learning app (IELTS, TOEIC, TOEFL) in 15 UI languages. Friendly, tactile, game-like but calm. One system for web, add-on, iOS, Android.

## Colors
The frontmatter is the light theme "Bright Day" (warm paper surface, deep teal primary, coral CTA). Dark theme "Tactile Night" uses the same role names:

${Object.keys(T.roles).map(k => `- ${k}: ${roleHex(T, k, 'dark')}`).join('\n')}

Never invent a colour outside these roles. Neutral surfaces come only from the surface roles.

## Typography
ONE family for everything: ${fam} (weights 400-800), including headlines and numbers (use 800 for display). Vietnamese diacritics must render; do not pick any other font, not for headlines, labels or code. Non-Latin scripts fall back to the system font. Icons: Material Symbols Rounded (light) / Outlined (dark).

## Shape and spacing
Rounded tactile cards, pill buttons (rounded.full), a 3D bottom "lip" under primary actions and option tiles, 4 px spacing step, 16 px gutter, every touch target at least 44 px, text contrast at least 4.5:1 (large 3:1) in both themes.
`;
}

if (process.argv[1]?.endsWith('build-stitch-design-md.mjs')) {
  const f = 'brand/stitch/DESIGN.md', out = designMd();
  if (process.argv.includes('--check')) {
    if (!fs.existsSync(f) || fs.readFileSync(f, 'utf8') !== out) { console.error(`✗ ${f} lệch brand/tokens.json → node scripts/build-stitch-design-md.mjs`); process.exit(1); }
    console.log('✓ brand/stitch/DESIGN.md khớp brand/tokens.json');
  } else { fs.writeFileSync(f, out); console.log(`✓ đã ghi ${f}`); }
}
