// 🖼 Ảnh OG theo bậc CEFR cho link thử thách /c/<id> (docs/specs/score-card.md): web/og/score-<A1…C2>.png, 1200×630, không chữ theo ngôn ngữ (dùng chung 15 ngôn ngữ).
// Dựng bằng ImageMagick từ logo trong web/og-default.png + chữ Arial Rounded Bold. Chạy lại khi đổi thiết kế: node scripts/og-score.mjs [--check]
import { execFileSync } from 'node:child_process'; import fs from 'node:fs';
const FONT = ['/System/Library/Fonts/Supplemental/Arial Rounded Bold.ttf', '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf'].find(f => fs.existsSync(f));
if (!FONT) { console.error('thiếu font đậm (Arial Rounded Bold / Liberation Sans Bold)'); process.exit(1); }
const LV = { A1: '#9bd0cf', A2: '#7fd1a5', B1: '#ffd166', B2: '#ffb347', C1: '#ff8a5c', C2: '#ff6b4a' }; // ấm dần theo bậc
const m = (...a) => execFileSync('magick', a, { stdio: ['ignore', 'pipe', 'inherit'] });
if (process.argv.includes('--check')) { for (const k of Object.keys(LV)) if (!fs.existsSync(`web/og/score-${k}.png`)) { console.error('thiếu web/og/score-' + k + '.png'); process.exit(1); } process.exit(0); }
for (const [k, col] of Object.entries(LV)) m('-size', '1200x630', 'xc:#0F3D3E',
  '(', 'web/og-default.png', '-crop', '665x190+85+140', '+repage', ')', '-geometry', '+80+80', '-composite',
  '-fill', col, '-draw', 'circle 930,330 930,170', '-fill', '#0F3D3E', '-draw', 'circle 930,330 930,192',
  '-font', FONT, '-gravity', 'NorthWest', '-fill', col, '-pointsize', '170', '-annotate', '+0+0', '',
  '-gravity', 'Center', '-annotate', '+330-30', k,
  '-gravity', 'SouthWest', '-fill', '#ffffff', '-pointsize', '66', '-annotate', '+96+170', '30-second speaking',
  '-fill', '#a9c9c9', '-pointsize', '44', '-annotate', '+96+105', 'CEFR level estimate',
  '-fill', '#FFC93C', '-pointsize', '40', '-annotate', '+96+45', 'lexkite.com',
  '-fill', '#ffae53', '-draw', 'rectangle 0,615 1200,630', '-strip', '-colors', '64', `web/og/score-${k}.png`);
console.log('✓ web/og/score-*.png');
