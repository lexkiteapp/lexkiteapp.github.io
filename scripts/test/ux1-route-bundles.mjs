#!/usr/bin/env node
// Mỗi trang chỉ nạp gói Stitch CỦA NÓ (LCP mobile 21–22/11: ux1 bật mặc định kéo cả 21 tệp ux1 vào mọi trang → path 1,65 → 8,1 s).
// Kiểm từ NGUỒN (app.js UX1_SCR/UX1_ALL + bundles.js): (1) UX1_ALL = đúng mọi gói u1*; (2) bảng trang → gói khớp bảng kỳ vọng dưới đây (bằng chứng "chỉ nạp gói của nó");
// (3) lõi ux1 không còn tệp màn nào; mỗi tệp màn nằm đúng 1 gói; (4) lõi ux1 ≤ trần nén (chỉ được giảm). Trang ngoài bảng → nạp đủ UX1_ALL như cũ (an toàn).
import fs from 'node:fs'; import zlib from 'node:zlib';
import { readBundles } from '../lib/bundles.mjs';
const rd = f => fs.readFileSync(f, 'utf8'), B = readBundles(), app = rd('web/js/app.js'), bad = [];
const arr = s => [...s.matchAll(/'([\w-]+)'/g)].map(m => m[1]);
const all = (app.match(/const UX1_ALL = \[([^\]]*)\]/) || [])[1], scr = (app.match(/UX1_SCR = \{([^}]*)\}/) || [])[1];
if (!all || !scr) { console.error('✗ ux1-route-bundles: không thấy UX1_ALL/UX1_SCR trong app.js'); process.exit(1); }
const ALL = arr(all), SCR = Object.fromEntries([...scr.matchAll(/(\w+): \[([^\]]*)\]/g)].map(m => [m[1], arr(m[2])]));
const u1 = Object.keys(B).filter(k => /^u1\w+$/.test(k)).sort();
if (JSON.stringify([...ALL].sort()) !== JSON.stringify(u1)) bad.push(`UX1_ALL [${ALL}] ≠ gói u1* trong bundles.js [${u1}] – thêm gói mới phải vào UX1_ALL`);
const WANT = { home: ['u1home'], path: [], review: ['u1rev'], practice: ['u1prac'], me: ['u1me'], dict: [] };
for (const [r, w] of Object.entries(WANT)) if (JSON.stringify(SCR[r]) !== JSON.stringify(w)) bad.push(`trang ${r} phải nạp ${JSON.stringify(w)}, app.js đang ${JSON.stringify(SCR[r])}`);
for (const r of Object.keys(SCR)) if (!(r in WANT)) bad.push(`trang ${r} thêm vào UX1_SCR mà chưa có trong bảng kỳ vọng của test này`);
for (const [r, g] of Object.entries(SCR)) for (const x of g) if (!ALL.includes(x)) bad.push(`trang ${r}: gói ${x} không có trong UX1_ALL`);
const SCREEN = /^js\/(st\/v2\/(path|today|today-new|today-desk|today-rail|review|practice|leagues|me|exam-readiness)|ux1-me|path-trail)\.js$/;
for (const f of B.ux1) if (SCREEN.test(f)) bad.push(`lõi ux1 còn chứa tệp màn ${f} → chuyển vào gói u1*`);
const owner = {}; for (const k of ['ux1', ...u1]) for (const f of B[k]) (owner[f] ||= []).push(k);
for (const [f, ks] of Object.entries(owner)) if (ks.length > 1) bad.push(`${f} nằm ở nhiều gói: ${ks}`);
for (const f of Object.keys(owner)) if (SCREEN.test(f) && owner[f][0] === 'ux1') bad.push(`${f} ở lõi`);
// mã gọi màn: ST2.<màn> chỉ được dò ở trang đã nạp gói của màn đó – màn nào có tệp thì tên khung phải khai báo trong tệp (S.<tên> =)
for (const k of u1) for (const f of B[k]) { const m = f.match(/st\/v2\/([\w-]+)\.js$/); if (m && !rd('web/' + f).includes(`(self.ST2 || (self.ST2 = {}))["${m[1]}"] =`)) bad.push(`${f}: không khai báo khung ST2.${m[1]}`); }
const gz = B.ux1.reduce((a, f) => a + zlib.gzipSync(fs.readFileSync('web/' + f)).length, 0), CAP = 52000;
if (gz > CAP) bad.push(`lõi ux1 ${gz} B nén > trần ${CAP} (chỉ được giảm)`);
if (bad.length) { console.error('✗ ux1-route-bundles:\n- ' + bad.join('\n- ')); process.exit(1); }
console.log(`✓ ux1-route-bundles: ${Object.keys(WANT).length} trang chỉ nạp gói của mình · ${u1.length} gói màn · lõi ux1 ${gz} B nén`);
