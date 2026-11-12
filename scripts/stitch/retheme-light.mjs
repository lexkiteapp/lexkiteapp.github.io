// 🌗 Bản SÁNG của 1 màn Stitch TỐI, giữ nguyên 100 % bố cục + chữ: đổi bảng màu tailwind.config sang bảng sáng của Lexkite Kit (lấy từ 1 màn sáng do chính Stitch vẽ)
//   + đổi các hex viết liền trong class/style theo bảng HEX dưới đây. Vì sao có tool này: edit_screens của Stitch (4/11) VẼ LẠI cả màn khi đổi theme – mất ảnh, loa, chỗ giáo viên,
//   đổi cả chữ (3 màn thử → 3 màn hỏng) – nên cặp sáng/tối không ghép được ở stitch-v2-convert. Bố cục vẫn 100 % của Stitch; không ai vẽ tay.
//   Dùng: node scripts/stitch/retheme-light.mjs <dark.html> <light.html> [màn sáng lấy bảng màu = brand/stitch/v2/app/frame-focus-light.html]  → đỏ nếu còn hex tối chưa có trong HEX.
import fs from 'node:fs';
const [src, out, ref = 'brand/stitch/v2/app/frame-focus-light.html'] = process.argv.slice(2);
const CFG = /tailwind\.config\s*=\s*(\{[\s\S]*?\})\s*<\/script>/;
const parse = h => new Function('return ' + (h.match(CFG) || [])[1])();
const flat = (o, k = '', r = {}) => { for (const [s, v] of Object.entries(o || {})) { const n = s === 'DEFAULT' ? k : k ? `${k}-${s}` : s; if (v && typeof v === 'object') flat(v, n, r); else r[n] = v; } return r; };
// gờ/nền tối → gờ/nền sáng cùng vai trò (màu từ brand/tokens.json + mẫu Stitch sáng)
const HEX = { '#051013': '#DCD3C2', '#121d20': '#DCD3C2', '#163439': '#E5DCCB', '#00504b': '#0B5450', '#003733': '#0B5450', '#00322e': '#0B5450', '#0b2927': '#E8F5F3', '#2d1f05': '#FFF3D6', '#5b4300': '#B98A1E',
  '#0e1e22': '#FFFFFF', '#162c30': '#E5DCCB', '#218f87': '#0D6964', '#2ba39a': '#0D6964', '#18393f': '#E8F5F3', '#132a2f': '#FFFFFF', '#1f4148': '#D9D0BF', '#6bd8ce': '#0D6964', '#f4bf40': '#7A5600', '#ffffff': '#ffffff', '#ffdf9e': '#FFF3D6', '#123d3a': '#E8F5F3', '#261a00': '#FFFFFF', '#3b2b08': '#F7E3B5', '#122728': '#E8F5F3', '#091518': '#FFFFFF', '#162125': '#F3EFE6', '#879391': '#5A7175', '#ffb4a6': '#B42814', '#2e100f': '#FFEEE4', '#93000a': '#BA1A1A' };
const h = fs.readFileSync(src, 'utf8'), L = flat(parse(fs.readFileSync(ref, 'utf8')).theme.extend.colors), cfg = parse(h), D = flat(cfg.theme.extend.colors);
const miss = Object.keys(D).filter(k => !(k in L));
const nest = (o, k = '') => { for (const s of Object.keys(o)) { const n = s === 'DEFAULT' ? k : k ? `${k}-${s}` : s; if (o[s] && typeof o[s] === 'object') nest(o[s], n); else if (n in L) o[s] = L[n]; } }; nest(cfg.theme.extend.colors);
let t = h.replace(CFG, 'tailwind.config = ' + JSON.stringify(cfg) + '\n</script>');
const body = t.indexOf('</head>'), left = new Set();
t = t.slice(0, body) + t.slice(body).replace(/#[0-9a-fA-F]{6}\b/g, x => { const y = HEX[x.toLowerCase()]; if (!y) left.add(x); return y || x; });
t = t.replace(/class="dark"/, 'class="light"').replace(/<html([^>]*)\bdark\b/, '<html$1light');
if (left.size) { console.error('✗ retheme: hex tối chưa có trong HEX: ' + [...left].join(' ')); process.exit(1); }
fs.writeFileSync(out, t);
console.log(`✓ ${out} (token thiếu bản sáng: ${miss.join(',') || 'không'})`);
