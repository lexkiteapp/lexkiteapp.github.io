// 🎭 Hình học con rối cho bố cục video (khuôn stitch-short, build_overlay.py --host-geom): đầu + "bao" lớn nhất của thân/tay qua MỌI cử chỉ.
// Ra content/video/puppet/<who>.json = { framing: { box }, head: [x0,y0,x1,y1], envelope: [[y, x0, x1], …] } (1080×1920, khung 'right', hàng mỗi 8 px).
// Dùng: node scripts/puppet/geom.mjs [ama]   – chạy lại khi đổi hình vẽ/cử chỉ (qc.mjs --update-ref cùng lúc).
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'), who = process.argv[2] || 'ama';
const Pup = createRequire(import.meta.url)(path.join(ROOT, 'web/js/lesson/puppet.js'));
// khung 'right': con rối 3:4 rộng 912 px, đỉnh tóc ≈ y 770, mép tóc trái ≈ x 450; phần vai phải tràn ra ngoài khung (cắt)
const BOX = [363, 704, 1275, 1920], S = (BOX[2] - BOX[0]) / 480, X = x => BOX[0] + x * S, Y = y => BOX[1] + y * S;
const rows = new Map(), add = (y, a, b) => { const k = Math.round(y / 8) * 8; if (k < 0 || k > 1920) return; const r = rows.get(k) || [1e9, -1e9]; rows.set(k, [Math.min(r[0], a), Math.max(r[1], b)]); };
const disc = (cx, cy, r) => { for (let y = cy - r; y <= cy + r; y += 4) { const dx = Math.sqrt(Math.max(0, r * r - (y - cy) ** 2)); add(y, cx - dx, cx + dx); } };
const caps = (a, b, r) => { for (let k = 0; k <= 12; k++) disc(a[0] + (b[0] - a[0]) * k / 12, a[1] + (b[1] - a[1]) * k / 12, r); };
// thân (đa giác gần đúng của áo vest) + tóc (elip + bướu) – hằng
const BODY = [[18, 640], [20, 520], [40, 446], [104, 418], [210, 388], [270, 388], [376, 418], [440, 446], [460, 520], [462, 640]];
for (let y = 388; y <= 640; y += 2) { const xs = []; for (let i = 0; i < BODY.length - 1; i++) { const [a, b] = [BODY[i], BODY[i + 1]]; if ((a[1] - y) * (b[1] - y) <= 0 && a[1] !== b[1]) xs.push(a[0] + (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1])); } if (xs.length) add(Y(y), X(Math.min(...xs)), X(Math.max(...xs))); }
const HAIR = { cx: 240, cy: 214, rx: 196, ry: 178 }; // gồm bướu xoăn r ≤ 38
for (let y = HAIR.cy - HAIR.ry; y <= HAIR.cy + HAIR.ry; y += 2) { const dx = HAIR.rx * Math.sqrt(Math.max(0, 1 - ((y - HAIR.cy) / HAIR.ry) ** 2)); add(Y(y), X(HAIR.cx - dx), X(HAIR.cx + dx)); }
// tay: quét mọi cử chỉ (60 fps), cộng biên độ đầu nghiêng/thở
for (const g of Object.keys(Pup.GEST)) for (let f = 0; f <= Pup.GEST[g].dur * 60; f++) {
  const G = Pup.geom(Pup.sample({ gest: [[0, g]] }, f / 60));
  for (const side of ['L', 'R']) { const A = G[side]; caps([X(A.S[0]), Y(A.S[1])], [X(A.E[0]), Y(A.E[1])], 26 * S); caps([X(A.E[0]), Y(A.E[1])], [X(A.W[0]), Y(A.W[1])], 26 * S); disc(X(A.H[0]), Y(A.H[1]), A.hr * S); }
}
const head = [X(HAIR.cx - HAIR.rx), Y(HAIR.cy - HAIR.ry), X(HAIR.cx + HAIR.rx), Y(368)].map(Math.round);
const envelope = [...rows.entries()].sort((a, b) => a[0] - b[0]).map(([y, [a, b]]) => [y, Math.max(0, Math.round(a - 6)), Math.min(1080, Math.round(b + 6))]).filter(r => r[1] < 1080);
fs.writeFileSync(path.join(ROOT, `content/video/puppet/${who}.json`), JSON.stringify({ who, note: 'scripts/puppet/geom.mjs – 1080×1920, khung right; box = vùng đặt <Teacher box>', framing: { right: { box: BOX } }, head, envelope }) + '\n');
console.log(`head ${head} · ${envelope.length} hàng · trái nhất trên y1300: ${Math.min(...envelope.filter(r => r[0] < 1300).map(r => r[1]))}`);
