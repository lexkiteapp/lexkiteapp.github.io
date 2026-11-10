// Khung ảnh cửa hàng dọc DÙNG CHUNG cho Google Play (scripts/play-shots.mjs) và App Store (scripts/ios-shots.mjs) – một phong cách
// (mẫu Stitch "store poster" 10/11): nền đêm teal + quầng nắng/san hô, nhãn viên thuốc, tiêu đề lớn có chữ nhấn, ảnh app thật trong khung máy
// (thanh trạng thái vẽ theo màu đỉnh màn hình), chip nổi tuỳ chọn. Mọi kích thước tính theo đơn vị u (= rộng/1080 cho điện thoại) → mọi cỡ store cùng bố cục.
import fs from 'fs';
import { FONT, BASECSS } from './app-shots-copy.mjs';

// Kích thước ra (pixel thật, chụp ở deviceScaleFactor 1). kind: phone | tablet. cap: ảnh app chụp ở viewport nào.
export const TARGETS = {
  'play-phone': { w: 1080, h: 1920, kind: 'phone', os: 'android' },
  'iphone-69': { w: 1320, h: 2868, kind: 'phone', os: 'ios' },
  'iphone-65': { w: 1284, h: 2778, kind: 'phone', os: 'ios' },
  'ipad-13': { w: 2064, h: 2752, kind: 'tablet', os: 'ios' },
};
export const CAPTURE = { phone: { width: 390, height: 844, dsf: 3 }, tablet: { width: 1024, height: 1366, dsf: 2 } };

const css = (t, bar) => {
  const u = t.kind === 'phone' ? t.w / 1080 : t.w / 1560, px = n => `${(n * u).toFixed(1)}px`;
  const cap = CAPTURE[t.kind], ratio = cap.width / cap.height;
  const top = t.h * (t.kind === 'phone' ? 0.055 : 0.05), text = t.kind === 'phone' ? (t.h / t.w > 2 ? 560 : 500) : 470;
  const devTop = top + text * u, bez = (t.kind === 'phone' ? 20 : 26) * u;
  const sbF = !bar ? 0 : (t.kind === 'tablet' ? 24 : t.os === 'ios' ? 50 : 34) / cap.width; // thanh trạng thái theo tỉ lệ bề rộng màn
  let sw = (t.h - devTop + t.h * 0.035 - 2 * bez) / (sbF + 1 / ratio); // máy tràn nhẹ qua mép dưới (3,5 %) – có chủ ý
  if (sw + 2 * bez > t.w * 0.84) sw = t.w * 0.84 - 2 * bez;
  const devW = sw + 2 * bez, devH = sw * (sbF + 1 / ratio) + 2 * bez;
  const big = t.h / t.w > 2;
  return `${BASECSS}body{width:${t.w}px;height:${t.h}px;
background:radial-gradient(${px(900)} ${px(800)} at 100% -4%,rgba(255,176,84,.34),transparent 62%),radial-gradient(${px(1000)} ${px(700)} at 50% 112%,rgba(242,85,59,.30),transparent 62%),radial-gradient(${px(900)} ${px(900)} at -20% 55%,rgba(31,122,114,.50),transparent 60%),linear-gradient(170deg,#0A2E30,#0F3D3E 48%,#0C3436)}
body:before{content:"";position:absolute;inset:0;background-image:radial-gradient(rgba(255,255,255,.08) ${px(1.6)},transparent ${px(1.6)});background-size:${px(30)} ${px(30)};mask-image:linear-gradient(180deg,#000,transparent 38%)}
.txt{position:absolute;left:${px(84)};right:${px(84)};top:${top}px;text-align:center}
.kick{display:inline-block;font-size:${px(26)};font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#FFC27A;background:rgba(255,176,84,.13);border:${px(2)} solid rgba(255,176,84,.38);padding:${px(9)} ${px(24)};border-radius:99px}
h1{font-size:${px(big ? 92 : 84)};line-height:1.04;font-weight:800;letter-spacing:-.035em;margin-top:${px(26)};text-wrap:balance}
p.sub{font-size:${px(big ? 36 : 33)};line-height:1.38;color:rgba(255,255,255,.84);margin:${px(22)} auto 0;max-width:${px(860)};text-wrap:balance}
.dev{position:absolute;left:${(t.w - devW) / 2}px;top:${devTop}px;width:${devW}px;height:${devH}px;padding:${bez}px;border-radius:${px(t.kind === 'phone' ? 118 : 70)};background:linear-gradient(155deg,#33494a,#0b1617 55%,#1d2c2d);box-shadow:0 ${px(70)} ${px(140)} rgba(0,0,0,.55),0 0 0 ${px(3)} rgba(255,255,255,.14) inset,0 0 0 ${px(2)} rgba(0,0,0,.6)}
.scr{position:relative;width:100%;height:100%;border-radius:${px(t.kind === 'phone' ? 98 : 50)};overflow:hidden;background:var(--sb,#fff)}.scr img{display:block;width:100%}
.sb{height:${sw * sbF}px;display:flex;align-items:center;justify-content:space-between;padding:0 ${px(t.kind === 'phone' ? 64 : 40)};font:600 ${px(t.kind === 'phone' ? 30 : 22)} -apple-system,"Be Vietnam Pro",sans-serif;color:var(--sbt,#111);background:var(--sb,#fff)}
.sb i{display:flex;gap:${px(10)};align-items:center}.sb i b{display:block;width:${px(34)};height:${px(17)};border-radius:${px(5)};border:${px(2.5)} solid currentColor;position:relative}.sb i b:after{content:"";position:absolute;inset:${px(2)};right:${px(6)};background:currentColor;border-radius:${px(2)}}
.sb i s{display:block;width:${px(26)};height:${px(18)};background:linear-gradient(90deg,currentColor 22%,transparent 22% 26%,currentColor 26% 48%,transparent 48% 52%,currentColor 52% 74%,transparent 74% 78%,currentColor 78%);clip-path:polygon(0 100%,100% 0,100% 100%)}
.isl{position:absolute;left:50%;top:${px(t.os === 'ios' ? 18 : 22)};transform:translateX(-50%);width:${px(t.os === 'ios' ? 190 : 30)};height:${px(t.os === 'ios' ? 54 : 30)};border-radius:99px;background:#050909;display:${t.kind === 'phone' ? 'block' : 'none'}}
.chip{position:absolute;right:${px(54)};top:${devTop + devH * 0.36}px;display:flex;align-items:center;gap:${px(14)};background:#fff;color:#14302F;font-size:${px(30)};font-weight:800;padding:${px(20)} ${px(30)};border-radius:${px(30)};box-shadow:0 ${px(24)} ${px(60)} rgba(0,0,0,.4);transform:rotate(-3deg)}
.chip span{font-size:${px(40)}}`;
};

// Một ảnh khung dọc. shot = PNG (Buffer) của app; [kick, title, sub] chữ theo ngôn ngữ; chip = 'emoji|chữ' (tuỳ chọn).
// bar = false: ảnh đã có thanh trạng thái thật (iOS Simulator, scripts/ios-shots.mjs)
export async function framePortrait(page, t, { lang, kick, title, sub, chip, shot, file, bar = true }) {
  await page.setViewportSize({ width: t.w, height: t.h });
  const [ce, ct] = chip ? chip.split('|') : [];
  await page.setContent(`<!doctype html><html lang="${lang}"${lang === 'ar' ? ' dir="rtl"' : ''}><head><meta charset="utf-8">${FONT}<style>${css(t, bar)}</style></head><body>
    <div class="txt"><span class="kick">${kick}</span><h1>${title}</h1><p class="sub">${sub}</p></div>
    <div class="dev"><div class="scr">${bar ? '<div class="sb"><span>9:41</span><i><s></s><b></b></i></div>' : ''}<img id="shot" src="data:image/png;base64,${shot.toString('base64')}"></div><div class="isl"></div></div>
    ${chip ? `<div class="chip"><span>${ce}</span>${ct}</div>` : ''}</body></html>`);
  // Thanh trạng thái cùng màu đỉnh màn hình app (đọc điểm ảnh thật), chữ sáng/tối theo độ sáng nền
  await page.evaluate(async () => {
    const img = document.getElementById('shot'); await img.decode();
    const c = document.createElement('canvas'); c.width = 8; c.height = 8; const g = c.getContext('2d');
    g.drawImage(img, 0, 0, 8, 8, 0, 0, 8, 8); const [r, gg, b] = g.getImageData(4, 4, 1, 1).data;
    const s = document.querySelector('.scr').style; s.setProperty('--sb', `rgb(${r},${gg},${b})`);
    s.setProperty('--sbt', (0.2126 * r + 0.7152 * gg + 0.0722 * b) > 140 ? '#111' : '#fff');
    await document.fonts.ready;
  });
  await page.waitForTimeout(250);
  await page.screenshot({ path: file, clip: { x: 0, y: 0, width: t.w, height: t.h } });
  checkPng(file, t.w, t.h, 2);
}

// PNG phải đúng kích thước, 8-bit, kiểu màu (2 = RGB không alpha – Play/Apple từ chối alpha ở ảnh chụp; 6 = RGBA cho icon Play)
export function checkPng(f, w, h, colorType = 2) {
  const b = fs.readFileSync(f);
  const ok = b.readUInt32BE(16) === w && b.readUInt32BE(20) === h && b[24] === 8 && b[25] === colorType;
  if (!ok) throw new Error(`✗ ${f}: ${b.readUInt32BE(16)}×${b.readUInt32BE(20)} bit ${b[24]} type ${b[25]} (cần ${w}×${h}, type ${colorType})`);
}
