#!/usr/bin/env node
// Ảnh chia sẻ (og:image 1200×630) cho công cụ miễn phí – docs/SEO-TOOLS.md §4: og-cefr.png (bài test), og-cefr-<a1…c2>.png (kết quả theo cấp → link chia sẻ
// kết quả hiện đúng cấp), og-toeic5.png. Kit CHỈ từ web/js/kit.js, màu từ bảng thương hiệu (docs/BRAND-RULES.md), phông OFL brand/social/src/fonts.
// Chạy khi đổi thiết kế (ảnh đã commit ở web/img/tools/, ~8 file nhỏ): RESVG=<thư mục node_modules có @resvg/resvg-js@2.6.2> node scripts/tools-og.mjs
import fs from 'node:fs'; import vm from 'node:vm'; import { createRequire } from 'node:module';
const require = createRequire((process.env.RESVG || process.cwd() + '/node_modules') + '/');
const { Resvg } = require('@resvg/resvg-js');
const ctx = { self: {} }; vm.runInNewContext(fs.readFileSync('web/js/kit.js', 'utf8'), ctx);
const kit = m => ctx.self.Kit.svg(m, 300, false).replace(/<!--[\s\S]*?-->/g, '').replace(/^<svg width="300" height="300"/, '<svg x="840" y="170" width="300" height="300"');
const FONTS = ['BricolageGrotesque-ExtraBold.ttf', 'NotoSans-Medium.ttf'].map(f => 'brand/social/src/fonts/' + f);
const NAMES = { A1: 'Beginner', A2: 'Elementary', B1: 'Intermediate', B2: 'Upper intermediate', C1: 'Advanced', C2: 'Proficient' };
const MOOD = { A1: 'happy', A2: 'happy', B1: 'cheer', B2: 'cheer', C1: 'win', C2: 'win' };
const card = ({ kicker, big, sub, foot, mood, bigSize = 220 }) => `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#E5502F"/><stop offset="1" stop-color="#FFB054"/></linearGradient></defs>
<rect width="1200" height="630" fill="#0F3D3E"/><rect y="590" width="1200" height="40" fill="#17595A"/>
<text x="72" y="96" font-family="Bricolage Grotesque" font-weight="800" font-size="44" fill="#FFF7EA">lex<tspan fill="url(#g)">kite</tspan></text>
<text x="72" y="190" font-family="Noto Sans" font-weight="500" font-size="40" fill="#FFE7C2">${kicker}</text>
<text x="66" y="${170 + bigSize}" font-family="Bricolage Grotesque" font-weight="800" font-size="${bigSize}" fill="url(#g)">${big}</text>
<text x="72" y="${240 + bigSize}" font-family="Noto Sans" font-weight="500" font-size="48" fill="#FFF7EA">${sub}</text>
<text x="72" y="560" font-family="Noto Sans" font-weight="500" font-size="30" fill="#FFC94A">${foot}</text>
<circle cx="990" cy="320" r="200" fill="#FFE7C2" opacity=".14"/>${kit(mood)}</svg>`;
const out = 'web/img/tools/'; fs.mkdirSync(out, { recursive: true });
const png = (name, svg) => { const b = new Resvg(svg, { font: { fontFiles: FONTS, loadSystemFonts: false, defaultFontFamily: 'Noto Sans' } }).render().asPng(); fs.writeFileSync(out + name, b); console.log('✓', out + name, Math.round(b.length / 1024) + ' KB'); };
for (const lv of Object.keys(NAMES)) png(`og-cefr-${lv.toLowerCase()}.png`, card({ kicker: 'My English level (CEFR)', big: lv, sub: NAMES[lv], foot: 'Free 15-minute level test · lexkite.com', mood: MOOD[lv] }));
png('og-cefr.png', card({ kicker: 'Free English level test', big: 'A1–C2', sub: '15 minutes · adaptive · instant result', foot: 'No sign-up · lexkite.com', mood: 'think', bigSize: 170 }));
png('og-toeic5.png', card({ kicker: 'TOEIC Reading', big: 'Part 5', sub: '210 practice questions, explained', foot: 'Free · no sign-up · lexkite.com', mood: 'think', bigSize: 170 }));
