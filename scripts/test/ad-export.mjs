// Xuất quảng cáo (scripts/video/teach2d/ad_export.py + .github/workflows/ad-export.yml): link UTM chuẩn, 3 tỉ lệ, thẻ cuối CTA, chặn lời hứa sai theo chính sách Meta, workflow chỉ xuất (không đăng, không credit).
import fs from 'node:fs';
let fails = 0, n = 0; const ok = (c, m) => { n++; if (!c) { fails++; console.log('✗', m); } };
const py = fs.readFileSync(new URL('../video/teach2d/ad_export.py', import.meta.url), 'utf8'), wf = fs.readFileSync(new URL('../../.github/workflows/ad-export.yml', import.meta.url), 'utf8');
ok(py.includes("UTM = 'https://lexkite.com/?utm_source=facebook&utm_medium=paid&utm_campaign=ad1'"), 'link quảng cáo có UTM facebook/paid/ad1');
ok(/RATIOS = \{'9x16': \(1080, 1920\), '4x5': \(1080, 1350\), '1x1': \(1080, 1080\)\}/.test(py), 'xuất đúng 3 tỉ lệ 9:16 · 4:5 · 1:1');
ok(py.includes("CTA_VI, CTA_URL, CARD_S = 'Học tiếng Anh miễn phí', 'lexkite.com'"), 'thẻ cuối: "Học tiếng Anh miễn phí – lexkite.com"');
ok(['trôi chảy', 'guarantee', '7 ngày', '100%'].every(w => py.includes(`'${w}'`)) && /15 <= d <= 25/.test(py) && /<= 1500/.test(py), 'kiểm: dài 15–25 s, hook ≤ 1,5 s, chặn lời hứa sai/tuyệt đối (Meta)');
ok(/workflow_dispatch/.test(wf) && !/GRABCAST|KLING|secrets\./i.test(wf) && /retention-days: 30/.test(wf), 'workflow chạy tay, không secret/credit/đăng, giữ artifact 30 ngày');
console.log(fails ? `✗ ad-export: ${fails}/${n} lỗi` : `✓ ad-export: ${n} kiểm tra đạt`); process.exit(fails ? 1 : 0);
