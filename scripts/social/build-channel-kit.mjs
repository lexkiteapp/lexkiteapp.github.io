// 📣 Bộ nhận diện KÊNH social (ảnh đại diện + ảnh bìa) tiếng Anh cho Facebook, Instagram, TikTok, YouTube – docs: brand/social/channel-kit/README.md
//   Bố cục từ Stitch (Lexkite Kit, queue scripts/stitch/queues/social-brandkit-1105.json); logo = NGUYÊN web/icons/icon.svg + brand/lexkite-logo-dark.svg
//   (chỉ đặt vào, không sửa/vẽ lại/đổi màu – logo cần chủ duyệt riêng); giáo viên = ảnh 2D thật web/teach/{ama,carlos}/still-*.webp.
//   Render bằng Chromium (Playwright) → PNG (sharp nén) + cổng QC tự động:
//     kích thước đúng · chữ trong vùng an toàn (crop tròn / mobile / TV / desktop) · tương phản chữ ≥ 4.5:1 trên nền THẬT (ảnh chụp ẩn chữ)
//     · cỡ chữ tối thiểu khi hiển thị nhỏ nhất · dung lượng dưới giới hạn nền tảng · logo không đổi (sha256)
//     · bản EN: không ký tự tiếng Việt · bản VI (hậu tố -vi, page "Học Tiếng Anh"): dấu đúng, mọi chữ dựng bằng phông kit (CDP), không rơi về phông hệ thống.
//   Việc nặng chỉ trên CI (workflow social-channel-kit.yml); máy cá nhân chỉ chạy `--check` (đọc file đã commit, không mở trình duyệt).
//   node scripts/social/build-channel-kit.mjs            # dựng + QC (CI)
//   node scripts/social/build-channel-kit.mjs --check    # chỉ kiểm file đã commit: tồn tại, đúng kích thước, dung lượng, manifest khớp
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.join(ROOT, 'brand/social/channel-kit');
const rel = p => path.relative(ROOT, p).split(path.sep).join('/');
const read = p => fs.readFileSync(path.join(ROOT, p));

// ---------- Màu (brand/tokens.json – không ghi hex ở nơi khác ngoài các giá trị đọc từ đây) ----------
const TOK = JSON.parse(read('brand/tokens.json'));
const C = { ...TOK.brand, ...Object.fromEntries(Object.entries(TOK.dark || {}).map(([k, v]) => [k.replace(/^--/, "d-"), v])) };
const col = k => { const v = C[k]; if (!v) throw new Error('thiếu màu token ' + k); return v; };

// ---------- Logo: nguyên file, khoá sha256 (đổi logo phải có chủ duyệt – docs/BRAND-RULES.md) ----------
const ICON_FILE = 'web/icons/icon.svg', WORDMARK_FILE = 'brand/lexkite-logo-dark.svg';
const ICON_SVG = read(ICON_FILE).toString(), WORDMARK_SVG = read(WORDMARK_FILE).toString();
export const LOGO_SHA = { [ICON_FILE]: sha(ICON_SVG), [WORDMARK_FILE]: sha(WORDMARK_SVG) };
function sha(s) { return crypto.createHash('sha256').update(s).digest('hex'); }
// SVG nhúng nhiều lần trong 1 trang → id gradient trùng; đổi TÊN id theo hậu tố (không đổi hình/màu).
const scopeIds = (svg, sfx) => svg.replace(/id="([^"]+)"/g, `id="$1-${sfx}"`).replace(/url\(#([^)]+)\)/g, `url(#$1-${sfx})`);
const sizedSvg = (svg, sfx, attrs) => scopeIds(svg, sfx).replace(/<svg([^>]*?)\swidth="[^"]*"\sheight="[^"]*"/, '<svg$1').replace('<svg', `<svg ${attrs}`);

// ---------- Nội dung theo ngôn ngữ: en = bản chung mọi nước (không chữ Việt); vi = bản cho page "Học Tiếng Anh" (cùng bố cục, chỉ đổi chữ) ----------
// h1/h2a/stick/h2b = tiêu đề 2 dòng (stick = cụm nhấn gạch lượn) · hs/hb = cỡ tiêu đề bìa FB / banner YT (chữ Việt dài hơn → nhỏ hơn để vừa vùng an toàn)
export const COPY = {
  en: {
    h1: 'Learn English words', h2a: 'that ', stick: 'stick', h2b: '.', hs: 84, hb: 96,
    sub: 'Free vocabulary for IELTS, TOEIC & everyday English',
    badge: 'Lexkite · 100% free · No paywalls', channel: '100% free channel',
    url: 'lexkite.com', weekly: 'New lessons every week',
    thumb: { tag: 'Band 7+', big: '10', l1: 'IELTS WORDS', l2: 'for travel' },
  },
  vi: {
    h1: 'Học từ vựng tiếng Anh', h2a: '', stick: 'nhớ lâu', h2b: '.', hs: 76, hb: 84,
    sub: 'Miễn phí – IELTS, TOEIC & tiếng Anh hằng ngày',
    badge: 'Lexkite · Miễn phí 100% · Không tường phí', channel: 'Kênh miễn phí 100%',
    url: 'lexkite.com', weekly: 'Bài học mới mỗi tuần',
    thumb: { tag: 'Band 7+', big: '10', l1: 'TỪ IELTS', l2: 'đi du lịch' },
  },
};

// ---------- Nền tảng: kích thước + vùng an toàn (tài liệu chính thức, xem README) ----------
// zones: 'safe' = chữ phải nằm trong · 'view' = khung hiển thị trên thiết bị (để xem trước) · 'block' = bị che (chữ không được chạm)
//        'circle' = crop tròn (avatar). minPx = cỡ chữ nhỏ nhất (px ảnh gốc) để còn ≥ 11 px khi hiển thị nhỏ nhất.
export const ASSETS = [
  { id: 'fb-avatar', platform: 'Facebook', file: 'facebook/lexkite-facebook-profile-1080.png', w: 1080, h: 1080, kind: 'avatar', maxKB: 4096,
    use: 'Page profile picture (shown as a circle, 196 px desktop / 36 px in comments)', zones: [{ type: 'circle', inset: 0.06 }] },
  { id: 'fb-cover', platform: 'Facebook', file: 'facebook/lexkite-facebook-cover-1640x624.png', w: 1640, h: 624, kind: 'fb-cover', maxKB: 4096, scale2x: true,
    use: 'Page cover photo (desktop 820×312, phone crops the centre to 16:9)', minPx: 28,
    zones: [
      { type: 'view', label: 'Desktop', x: 0, y: 0, w: 1640, h: 624 },
      { type: 'view', label: 'Phone 16:9', x: 265, y: 0, w: 1110, h: 624 },
      { type: 'safe', label: 'Text safe (phone ∩ desktop)', x: 305, y: 60, w: 1030, h: 500 },
      { type: 'block', label: 'Profile photo (desktop)', x: 0, y: 470, w: 300, h: 154 },
    ] },
  { id: 'ig-avatar', platform: 'Instagram', file: 'instagram/lexkite-instagram-profile-1080.png', w: 1080, h: 1080, kind: 'avatar', maxKB: 4096,
    use: 'Profile photo (circle, 110 px app / 150 px web)', zones: [{ type: 'circle', inset: 0.06 }] },
  { id: 'tt-avatar', platform: 'TikTok', file: 'tiktok/lexkite-tiktok-profile-1080.png', w: 1080, h: 1080, kind: 'avatar', maxKB: 4096,
    use: 'Profile photo (circle, min 20×20, 200×200 recommended)', zones: [{ type: 'circle', inset: 0.06 }] },
  { id: 'yt-avatar', platform: 'YouTube', file: 'youtube/lexkite-youtube-profile-800.png', w: 800, h: 800, kind: 'avatar', maxKB: 4096,
    use: 'Channel picture (circle, 98×98 display, ≤ 4 MB)', zones: [{ type: 'circle', inset: 0.06 }] },
  { id: 'yt-banner', platform: 'YouTube', file: 'youtube/lexkite-youtube-banner-2560x1440.png', w: 2560, h: 1440, kind: 'yt-banner', maxKB: 6144,
    use: 'Channel banner (≤ 6 MB). TV shows all; desktop 2560×423; tablet 1855×423; phone 1546×423', minPx: 44,
    zones: [
      { type: 'view', label: 'TV', x: 0, y: 0, w: 2560, h: 1440 },
      { type: 'view', label: 'Desktop', x: 0, y: 508, w: 2560, h: 423 },
      { type: 'view', label: 'Tablet', x: 352, y: 508, w: 1855, h: 423 },
      { type: 'safe', label: 'All devices 1546×423', x: 507, y: 508, w: 1546, h: 423 },
    ] },
  { id: 'yt-watermark', platform: 'YouTube', file: 'youtube/lexkite-youtube-watermark-150.png', w: 150, h: 150, kind: 'watermark', maxKB: 1024,
    use: 'Video watermark (Studio › Customisation › Branding; transparent PNG, ≤ 1 MB)', zones: [] },
  { id: 'yt-thumb', platform: 'YouTube', file: 'youtube/lexkite-youtube-thumbnail-template-1280x720.png', w: 1280, h: 720, kind: 'yt-thumb', maxKB: 2048,
    use: 'Video thumbnail template (≤ 2 MB; bottom-right is covered by the length badge)', minPx: 40,
    zones: [
      { type: 'safe', label: 'Text safe', x: 48, y: 40, w: 1184, h: 640 },
      { type: 'block', label: 'Duration badge', x: 1080, y: 630, w: 200, h: 90 },
    ] },
];
// Bản vi: chỉ các asset CÓ chữ (bìa FB, banner YT, mẫu thumbnail); avatar/watermark không chữ → dùng chung bản EN. Cùng PAGE fn = một nguồn bố cục.
export const LANG_KINDS = ['fb-cover', 'yt-banner', 'yt-thumb'];
for (const a of [...ASSETS].filter(a => LANG_KINDS.includes(a.kind)))
  ASSETS.push({ ...a, id: a.id + '-vi', lang: 'vi', file: a.file.replace(/\.png$/, '-vi.png'), scale2x: false });
export const langOf = a => a.lang || 'en';
// Phông được phép cho chữ: phải là phông ĐÃ nạp từ brand/social/src/fonts (không rơi về phông hệ thống – dấu tiếng Việt sẽ sai)
export const OWN_FONTS = ['Plus Jakarta Sans', 'Bricolage Grotesque'];

// ---------- QC thuần (test được không cần trình duyệt) ----------
const VI = /[ÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚÝàáâãèéêìíòóôõùúýĂăĐđĨĩŨũƠơƯưẠ-ỹ]/;
export const hasVietnamese = s => VI.test(s);
export function lum(hex) {
  const n = hex.replace('#', ''), v = [0, 2, 4].map(i => parseInt(n.slice(i, i + 2), 16) / 255);
  const [r, g, b] = v.map(c => c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export const lumRGB = (r, g, b) => lum('#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join(''));
export const contrast = (l1, l2) => (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
export const inside = (b, z) => b.x >= z.x - 0.5 && b.y >= z.y - 0.5 && b.x + b.w <= z.x + z.w + 0.5 && b.y + b.h <= z.y + z.h + 0.5;
export const overlaps = (a, z) => a.x < z.x + z.w && a.x + a.w > z.x && a.y < z.y + z.h && a.y + a.h > z.y;
export function inCircle(b, W, H, inset = 0) {
  const cx = W / 2, cy = H / 2, r = Math.min(W, H) / 2 * (1 - inset);
  return [[b.x, b.y], [b.x + b.w, b.y], [b.x, b.y + b.h], [b.x + b.w, b.y + b.h]].every(([x, y]) => (x - cx) ** 2 + (y - cy) ** 2 <= r * r);
}
export function pngSize(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('không phải PNG');
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}

// ---------- Trang HTML (port bố cục Stitch: out/stitch/social/<id>/dark.html; thay logo = nguyên logo Lexkite, giáo viên = Ama/Carlos thật) ----------
const fileUrl = p => pathToFileURL(path.join(ROOT, p)).href;
const fontCss = `
@font-face{font-family:'Plus Jakarta Sans';font-weight:200 800;src:url('${fileUrl('brand/social/src/fonts/PlusJakartaSans-VF.ttf')}')}
@font-face{font-family:'Bricolage Grotesque';font-weight:800;src:url('${fileUrl('brand/social/src/fonts/BricolageGrotesque-ExtraBold.ttf')}')}`;
// Ảnh giáo viên 1108×960 (2x) có dải mờ 95 px ở đáy → khung cắt bỏ dải đó, mép dưới TRÙNG mép ảnh (chạm nền tự nhiên: không đường cắt/quầng/viền dán).
const FIG = { w: 1108, h: 865 };
export const POSES = { 'fb-cover': ['ama', 'happy'], 'yt-banner-l': ['ama', 'encourage'], 'yt-banner-r': ['carlos', 'happy'], 'yt-thumb': ['carlos', 'cheer'] };
function fig([who, pose], { x, h }) {
  const s = h / FIG.h, w = FIG.w * s;
  return `<div class="fig" data-fig="${who}" style="left:${x}px;bottom:0;width:${w.toFixed(1)}px;height:${h}px">
    <img src="${fileUrl(`web/teach/${who}/still-${pose}.webp`)}" style="width:${w.toFixed(1)}px;height:${(960 * s).toFixed(1)}px" alt=""></div>`;
}
// Wordmark = nguyên brand/lexkite-logo-dark.svg (viên teal bo góc + diều + chữ) – chỉ co giãn đều.
const wordmark = (sfx, h) => `<div class="logo" data-logo style="height:${h}px;width:${h * 4}px">${sizedSvg(WORDMARK_SVG, sfx, `style="height:${h}px;width:${h * 4}px;display:block" aria-label="lexkite"`)}</div>`;

// Nền "Tactile Night" của Stitch: tối sâu, ánh teal mềm giữa, lưới chấm mờ, viền nhấn teal→san hô.
function bg(W, H, at = '50% 42%', dots = 32) {
  return `<div class="bg" style="background:radial-gradient(ellipse ${Math.round(W * 0.42)}px ${Math.round(H * 0.62)}px at ${at}, ${col('tealDeep')} 0%, ${col('d-bg')} 70%)"></div>
  <div class="bg" style="background:radial-gradient(ellipse ${Math.round(W * 0.3)}px ${Math.round(H * 0.38)}px at ${at}, ${col('tealBright2')}26, transparent 72%)"></div>
  <div class="bg" style="opacity:.14;background-image:radial-gradient(${col('tealBright2')} ${dots / 28}px, transparent ${dots / 28 + 0.2}px);background-size:${dots}px ${dots}px"></div>`;
}
// Diều giấy 4 mặt + đuôi nơ (trang trí theo Stitch – hình học, không phải logo).
function paperKite(x, y, s, rot, tail = true) {
  return `<svg class="deco" style="left:${x}px;top:${y}px;width:${s}px;height:${s * 2.2}px;transform:rotate(${rot}deg)" viewBox="-40 -50 80 176">
    <polygon points="0,-48 38,0 0,64 -38,0" fill="#000" opacity=".35" transform="translate(4 12)"/>
    <polygon points="0,-48 0,0 -38,0" fill="${col('tealBright2')}"/><polygon points="0,-48 38,0 0,0" fill="${col('tealBright')}"/>
    <polygon points="0,0 0,64 -38,0" fill="${col('coral')}"/><polygon points="0,0 38,0 0,64" fill="${col('apricot')}"/>
    <line x1="0" y1="-48" x2="0" y2="64" stroke="${col('paper')}" stroke-opacity=".4" stroke-width="1.5"/><line x1="-38" y1="0" x2="38" y2="0" stroke="${col('paper')}" stroke-opacity=".3" stroke-width="1.5"/>
    ${tail ? `<path d="M0 64 C 10 80, -10 92, 2 104 S 16 122, 8 140" stroke="${col('apricot')}" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <path d="M-6 95 L1 99 L-6 103 Z M8 95 L1 99 L8 103 Z" fill="${col('coral')}"/><path d="M5 133 L12 137 L5 141 Z M19 133 L12 137 L19 141 Z" fill="${col('tealBright2')}"/>` : ''}</svg>`;
}
const spark = (x, y, s, c = 'sun', op = 1) => `<svg class="deco" style="left:${x - s / 2}px;top:${y - s / 2}px;width:${s}px;height:${s}px;opacity:${op}" viewBox="0 0 20 20"><path d="M10 0 C11 7 13 9 20 10 C13 11 11 13 10 20 C9 13 7 11 0 10 C7 9 9 7 10 0Z" fill="${col(c)}"/></svg>`;
const trail = (W, H, d, c = 'tealBright2', sw = 3) => `<svg class="deco" style="left:0;top:0;width:${W}px;height:${H}px" viewBox="0 0 ${W} ${H}"><path d="${d}" stroke="${col(c)}" stroke-width="${sw}" stroke-dasharray="${sw * 2.6} ${sw * 3.4}" stroke-linecap="round" fill="none" opacity=".5"/></svg>`;
const topRule = (W, h) => `<div class="deco" style="left:0;top:0;width:${W}px;height:${h}px;opacity:.75;background:linear-gradient(90deg,transparent,${col('tealBright2')} 45%,${col('coral')})"></div>`;
// Chip/viên thuốc: data-t đặt ở CHỮ bên trong (ẩn chữ khi đo nền → nền viên thuốc vẫn còn = đo đúng tương phản).
const pill = (txt, fs, padY, padX, extra = '') => `<span class="pill" style="font-size:${fs}px;padding:${padY}px ${padX}px">${extra}<span data-t>${txt}</span></span>`;
const chip = (txt, fs, padY, padX, extra = '') => `<span class="chip" style="font-size:${fs}px;padding:${padY}px ${padX}px">${extra}<span data-t>${txt}</span></span>`;
const dot = (s, c) => `<i style="display:inline-block;width:${s}px;height:${s}px;border-radius:50%;background:${col(c)};margin-right:${s * 0.9}px;flex:none"></i>`;
const globe = s => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" style="margin-right:${s * 0.5}px;flex:none"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20"/></svg>`;
const play = s => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" style="margin-right:${s * 0.45}px;flex:none"><circle cx="12" cy="12" r="11" fill="currentColor"/><path d="M10 8l6 4-6 4z" fill="${col('apricot')}"/></svg>`;

const baseCss = W => `${fontCss}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:${W}px;background:transparent;overflow:hidden}
.stage{position:relative;overflow:hidden;font-family:'Plus Jakarta Sans',sans-serif}
.bg,.deco,.fig{position:absolute}.bg{inset:0}
.fig{overflow:hidden}.fig img{position:absolute;left:0;top:0;display:block}
.h{font-weight:800;letter-spacing:-0.02em;color:${col('d-text')};line-height:1.06}
.sub{font-weight:600;color:${col('sky')}}
.pill{display:inline-flex;align-items:center;border-radius:999px;font-weight:800;white-space:nowrap;color:${col('d-cta-ink')};
  background:linear-gradient(180deg,${col('d-cta-1')} 0%,${col('d-cta-2')} 100%);box-shadow:0 0.22em 0 ${col('d-cta-lip')},0 0.5em 1em -0.2em ${col('coral')}66}
.chip{display:inline-flex;align-items:center;border-radius:999px;font-weight:800;white-space:nowrap;letter-spacing:.06em;text-transform:uppercase;color:${col('paper')};
  background:${col('d-surface')};box-shadow:inset 0 0 0 0.09em ${col('tealBright2')}88,0 0.16em 0 ${col('d-ledge')}}
.stick{color:${col('coralMid')};text-decoration:underline wavy ${col('coral')};text-decoration-thickness:.06em;text-underline-offset:.16em}
[data-t]{white-space:nowrap}
.chip[data-case]{text-transform:none;letter-spacing:.01em}
.hide-text [data-t]{visibility:hidden}
.only-fig .bg,.only-fig .deco,.only-fig [data-t],.only-fig .pill,.only-fig .chip,.only-fig .logo{visibility:hidden!important}
.only-fig .pill,.only-fig .chip{background:none!important;box-shadow:none!important}
`;

function pageAvatar(a) {
  // Avatar = NGUYÊN app icon web/icons/icon.svg phủ kín khung; góc ngoài bo tròn tô cùng màu nền icon (token icon.bg) – crop tròn của
  // nền tảng nằm trọn trong ô bo góc nên không lộ góc.
  const W = a.w;
  return { W, H: W, html: `<div class="stage" style="width:${W}px;height:${W}px;background:${TOK.icon.bg}">
    ${sizedSvg(ICON_SVG, 'av', `data-logo style="position:absolute;left:0;top:0;width:${W}px;height:${W}px"`)}</div>` };
}
function pageWatermark(a) {
  // Watermark = NGUYÊN app icon (ô teal bo góc đọc rõ trên mọi cảnh), ngoài ô trong suốt.
  return { W: a.w, H: a.h, html: `<div class="stage" style="width:${a.w}px;height:${a.h}px">
    ${sizedSvg(ICON_SVG, 'wm', `data-logo style="position:absolute;left:0;top:0;width:${a.w}px;height:${a.h}px"`)}</div>` };
}
function pageFbCover(a) {
  const W = a.w, H = a.h, L = COPY[langOf(a)];
  return { W, H, html: `<div class="stage" style="width:${W}px;height:${H}px">${bg(W, H, '50% 40%')}${topRule(W, 6)}
    ${trail(W, H, 'M 150 560 C 300 420, 520 380, 700 330 S 1120 230, 1290 150')}
    ${spark(560, 150, 26, 'apricot')}${spark(1110, 112, 22)}${spark(330, 200, 16, 'tealBright2', .8)}${spark(1250, 330, 20, 'apricot', .9)}
    ${paperKite(1262, 46, 84, -16)}
    ${fig(POSES['fb-cover'], { x: 1160, h: 560 })}
    <div style="position:absolute;left:0;top:96px;width:${W}px;display:flex;flex-direction:column;align-items:center;text-align:center">
      ${chip(L.badge, 28, 10, 28, sizedSvg(ICON_SVG, 'fbc', `data-logo style="width:40px;height:40px;margin-right:14px;flex:none"`))}
      <div class="h" data-t style="font-size:${L.hs}px;margin-top:26px">${L.h1}</div>
      <div class="h" data-t style="font-size:${L.hs}px">${L.h2a}<span class="stick" data-t>${L.stick}</span>${L.h2b}</div>
      <div class="sub" data-t style="font-size:32px;margin-top:20px">${L.sub}</div>
      <div style="margin-top:30px">${pill(L.url, 34, 16, 42, globe(32))}</div>
    </div></div>` };
}
function pageYtBanner(a) {
  const W = a.w, H = a.h, L = COPY[langOf(a)]; // vùng an toàn mọi thiết bị: x 507–2053, y 508–931
  return { W, H, html: `<div class="stage" style="width:${W}px;height:${H}px">${bg(W, H, '50% 50%', 44)}${topRule(W, 8)}
    ${trail(W, H, 'M 90 520 C 160 430, 250 400, 360 410')}${trail(W, H, 'M 1990 470 C 2070 380, 2190 360, 2290 430', 'apricot')}
    ${paperKite(380, 110, 140, -12)}${paperKite(2250, 100, 150, 14)}
    ${spark(700, 420, 44, 'apricot')}${spark(1880, 380, 36)}${spark(1280, 300, 28, 'tealBright2', .8)}${spark(640, 1080, 30, 'sun', .7)}${spark(1960, 1110, 26, 'apricot', .7)}
    ${fig(POSES['yt-banner-l'], { x: -300, h: 971 })}
    ${fig(POSES['yt-banner-r'], { x: 1700, h: 971 })}
    <div style="position:absolute;left:0;top:532px;width:${W}px;display:flex;flex-direction:column;align-items:center;text-align:center">
      <div style="display:flex;align-items:center;gap:22px">${wordmark('yt', 66)}${chip(L.channel, 44, 12, 34, dot(18, 'tealBright2'))}</div>
      <div class="h" data-t style="font-size:${L.hb}px;margin-top:22px">${L.h1} ${L.h2a}<span class="stick" data-t>${L.stick}</span>${L.h2b}</div>
      <div class="sub" data-t style="font-size:44px;margin-top:12px">${L.sub}</div>
      <div style="margin-top:26px;display:flex;gap:22px;align-items:center">${pill(L.weekly, 44, 13, 44, play(42))}${chip(L.url, 44, 13, 36).replace('class="chip"', 'class="chip" data-case')}</div>
    </div></div>` };
}
function pageYtThumb(a) {
  const W = a.w, H = a.h, t = COPY[langOf(a)].thumb;
  return { W, H, html: `<div class="stage" style="width:${W}px;height:${H}px">${bg(W, H, '28% 40%', 32)}
    ${spark(700, 140, 30, 'apricot')}${spark(560, 600, 22, 'sun', .7)}
    ${fig(POSES['yt-thumb'], { x: 600, h: 660 })}
    <div style="position:absolute;left:56px;top:48px;display:flex;gap:14px;align-items:center">${pill(t.tag, 40, 8, 28, dot(14, 'cream'))}${chip('IELTS', 40, 8, 26)}</div>
    <div style="position:absolute;right:48px;top:44px">${wordmark('th', 60)}</div>
    <div style="position:absolute;left:56px;top:140px;display:flex;flex-direction:column;align-items:flex-start">
      <div class="h" data-t style="font-size:250px;line-height:.82;letter-spacing:-0.05em;color:${col('sun')};text-shadow:0 14px 0 ${col('apricot')}55,0 22px 30px #0008">${t.big}</div>
      <div class="h" data-t style="font-size:92px;margin-top:34px;text-transform:uppercase">${t.l1}</div>
      <div style="display:flex;align-items:center;gap:18px;margin-top:4px"><div class="h" data-t style="font-size:84px;color:${col('sun')}">${t.l2}</div></div>
    </div></div>` };
}
const PAGE = { avatar: pageAvatar, watermark: pageWatermark, 'fb-cover': pageFbCover, 'yt-banner': pageYtBanner, 'yt-thumb': pageYtThumb };

// ---------- Dựng + QC (CI) ----------
async function build() {
  if (!process.env.CI && !process.argv.includes('--allow-local')) { console.error('✗ chỉ chạy trên CI (docs/METHODS.md §4) – máy cá nhân dùng --check'); process.exit(2); }
  const { chromium } = await import('playwright');
  const sharp = (await import('sharp')).default;
  const browser = await chromium.launch();
  const report = [], fails = [];
  const tmp = fs.mkdtempSync(path.join(process.env.RUNNER_TEMP || '/tmp', 'ck-'));
  for (const a of ASSETS) {
    const { W, H, html } = PAGE[a.kind](a);
    const vi = langOf(a) === 'vi';
    const doc = `<!doctype html><html lang="${langOf(a)}"><head><meta charset="utf-8"><style>${baseCss(W)}</style></head><body>${html}</body></html>`;
    if (!vi && hasVietnamese(doc.replace(/<svg[\s\S]*?<\/svg>/g, ''))) fails.push(`${a.id}: có ký tự tiếng Việt`);
    const f = path.join(tmp, a.id + '.html'); fs.writeFileSync(f, doc);
    const scales = a.scale2x ? [1, 2] : [1];
    for (const sc of scales) {
      const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: sc });
      await page.goto('file://' + f); await page.evaluate(() => document.fonts.ready);
      await page.waitForFunction(() => [...document.images].every(i => i.complete && i.naturalWidth > 0), null, { timeout: 15000 });
      const fontsOk = await page.evaluate(async () => { const fs = [...document.fonts]; await Promise.all(fs.map(f => f.load().catch(() => null))); return fs.length >= 2 && fs.every(f => f.status === 'loaded'); });
      if (!fontsOk) fails.push(`${a.id}: phông chưa nạp`);
      const shot = await page.screenshot({ omitBackground: a.kind === 'watermark', clip: { x: 0, y: 0, width: W, height: H } });
      const name = sc === 1 ? a.file : a.file.replace(/\.png$/, '@2x.png');
      const png = await sharp(shot).png({ compressionLevel: 9, adaptiveFiltering: true, effort: 10 }).toBuffer();
      fs.mkdirSync(path.dirname(path.join(OUT, name)), { recursive: true }); fs.writeFileSync(path.join(OUT, name), png);
      const kb = Math.round(png.length / 1024), dim = pngSize(png);
      if (dim.w !== W * sc || dim.h !== H * sc) fails.push(`${name}: kích thước ${dim.w}×${dim.h} ≠ ${W * sc}×${H * sc}`);
      if (kb > a.maxKB) fails.push(`${name}: ${kb} KB > ${a.maxKB} KB`);
      if (sc !== 1) { await page.close(); report.push({ id: a.id + '@2x', file: name, kb, w: dim.w, h: dim.h }); continue; }
      // Phần tử chữ + logo + giáo viên
      const els = await page.evaluate(() => {
        const box = e => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; };
        return {
          text: [...document.querySelectorAll('[data-t]')].map(e => ({ text: e.textContent.trim(), ...box(e), size: parseFloat(getComputedStyle(e).fontSize), color: getComputedStyle(e).color, tv: e.hasAttribute('data-tv'),
            over: e.scrollWidth > e.clientWidth + 1 })),
          logo: [...document.querySelectorAll('[data-logo]')].map(box),
          fig: [...document.querySelectorAll('[data-fig]')].map(e => ({ who: e.dataset.fig, ...box(e) })),
        };
      });
      // bản vi: mọi chữ phải dựng bằng phông của kit (có subset tiếng Việt), không rơi về phông hệ thống
      const fonts = vi ? await platformFonts(page) : [];
      const fontIssues = fonts.filter(f => !OWN_FONTS.includes(f)).map(f => `phông hệ thống "${f}" thay cho phông kit (dấu tiếng Việt có thể sai)`);
      if (vi && !fonts.length) fontIssues.push('không đọc được phông đã dùng');
      // nền thật dưới chữ: chụp lại khi ẩn chữ
      await page.evaluate(() => document.body.classList.add('hide-text'));
      const bgShot = await sharp(await page.screenshot({ clip: { x: 0, y: 0, width: W, height: H } })).raw().toBuffer({ resolveWithObject: true });
      await page.evaluate(() => { document.body.classList.remove('hide-text'); document.body.classList.add('only-fig'); });
      const figMask = await sharp(await page.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: W, height: H } })).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      await page.close();
      const issues = [...fontIssues];
      for (const t of els.text) {
        if (!vi && hasVietnamese(t.text)) issues.push(`chữ tiếng Việt: "${t.text}"`);
        const zs = a.zones.filter(z => z.type === 'safe'), tvOnly = t.tv;
        for (const z of zs) if (!tvOnly && !inside(t, z)) issues.push(`"${t.text}" ra ngoài vùng an toàn ${z.label}`);
        if (tvOnly && !inside(t, { x: 0, y: 0, w: W, h: H })) issues.push(`"${t.text}" ra ngoài khung`);
        for (const z of a.zones.filter(z => z.type === 'block')) if (overlaps(t, z)) issues.push(`"${t.text}" chạm vùng bị che ${z.label}`);
        // chữ đè lên giáo viên: đếm điểm ảnh ĐỤC của riêng lớp giáo viên trong hộp chữ
        { let n = 0, tot = 0; const { data, info } = figMask;
          for (let y = Math.max(0, Math.floor(t.y)); y < Math.min(H, t.y + t.h); y += 2) for (let x = Math.max(0, Math.floor(t.x)); x < Math.min(W, t.x + t.w); x += 2) { tot++; if (data[(y * info.width + x) * 4 + 3] > 24) n++; }
          if (tot && n / tot > 0.002) issues.push(`"${t.text}" đè lên giáo viên (${(100 * n / tot).toFixed(1)} % hộp chữ)`); }
        if (a.minPx && t.size < a.minPx) issues.push(`"${t.text}" cỡ ${t.size}px < ${a.minPx}px (khó đọc trên điện thoại)`);
        if (t.over) issues.push(`"${t.text}" tràn khung`);
        // tương phản: màu chữ so với 6% điểm nền tệ nhất trong hộp chữ
        const m = t.color.match(/\d+(\.\d+)?/g).map(Number), lt = lumRGB(...m.slice(0, 3).map(Math.round));
        const { data, info } = bgShot, ls = [];
        for (let y = Math.max(0, Math.floor(t.y)); y < Math.min(H, t.y + t.h); y += 2) for (let x = Math.max(0, Math.floor(t.x)); x < Math.min(W, t.x + t.w); x += 2) {
          const i = (y * info.width + x) * info.channels; ls.push(contrast(lt, lumRGB(data[i], data[i + 1], data[i + 2])));
        }
        ls.sort((p, q) => p - q); t.contrast = +(ls[Math.floor(ls.length * 0.06)] || 0).toFixed(2);
        // chữ trong viên thuốc: nền là viên thuốc (đã ẩn) → đo theo màu nền pill từ token
        if (t.contrast < 4.5) issues.push(`"${t.text}" tương phản ${t.contrast}:1 < 4.5:1`);
      }
      if (a.kind === 'avatar') for (const l of els.logo) {
        // hình diều thật (điểm ngoài cùng của path trong viewBox 120 của icon.svg: đầu cánh, chân cánh, đuôi) phải nằm trong crop tròn thu 6 %
        const PTS = [[4, 30], [116, 30], [12, 70], [108, 70], [34, 113], [86, 113], [60, 31]];
        const map = ([x, y]) => [l.x + l.w * (112 + x * 800 / 120) / 1024, l.y + l.h * (112 + y * 800 / 120) / 1024];
        const r = Math.min(W, H) / 2 * (1 - a.zones[0].inset);
        if (PTS.map(map).some(([x, y]) => (x - W / 2) ** 2 + (y - H / 2) ** 2 > r * r)) issues.push('logo chạm mép crop tròn');
      }
      if (issues.length) fails.push(...issues.map(s => `${a.id}: ${s}`));
      report.push({ id: a.id, platform: a.platform, file: a.file, w: W, h: H, kb, maxKB: a.maxKB, use: a.use, zones: a.zones,
        text: els.text.map(t => ({ text: t.text, px: t.size, contrast: t.contrast })), ...(vi ? { fonts } : {}), issues });
    }
  }
  await browser.close();
  // Xem trước: mô phỏng crop tròn / điện thoại / TV → contact sheet nhỏ cho PR
  await previews(sharp, report);
  const manifest = { generated: 'CI', logo: LOGO_SHA, copy: COPY, assets: report.filter(r => !r.id.endsWith('@2x')).map(({ issues, ...r }) => r),
    retina: report.filter(r => r.id.endsWith('@2x')).map(r => r.file) };
  fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 1) + '\n');
  const md = ['### Channel kit QC', '', '| Asset | Size | KB | Min contrast | Issues |', '|---|---|---|---|---|',
    ...report.filter(r => r.text).map(r => `| ${r.id} | ${r.w}×${r.h} | ${r.kb}/${r.maxKB} | ${r.text.length ? Math.min(...r.text.map(t => t.contrast)) + ':1' : '–'} | ${r.issues.length ? r.issues.join('; ') : '✓'} |`)];
  fs.writeFileSync(path.join(process.env.RUNNER_TEMP || tmp, 'channel-kit-qc.md'), md.join('\n') + '\n');
  console.log(md.join('\n'));
  if (fails.length) { console.error('\n✗ QC trượt:\n- ' + fails.join('\n- ')); process.exit(1); }
  console.log(`\n✓ ${report.length} file đạt QC → ${rel(OUT)}`);
}

// Phông thật dùng để vẽ chữ (CDP: tên họ phông của từng đoạn chữ có glyph) – không dựa vào CSS font-family vì rơi về phông khác là âm thầm.
async function platformFonts(page) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('DOM.enable'); await cdp.send('CSS.enable');
  const { root } = await cdp.send('DOM.getDocument', { depth: -1 });
  const { nodeIds } = await cdp.send('DOM.querySelectorAll', { nodeId: root.nodeId, selector: '[data-t]' });
  const used = new Set();
  for (const nodeId of nodeIds) for (const f of (await cdp.send('CSS.getPlatformFontsForNode', { nodeId })).fonts) if (f.glyphCount) used.add(f.familyName);
  await cdp.detach();
  return [...used].sort();
}

async function previews(sharp, report) {
  const tiles = [], label = (txt, w) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="34"><rect width="100%" height="100%" fill="#0b1416"/><text x="10" y="23" font-family="sans-serif" font-size="18" fill="#e8f1f0">${txt.replace(/&/g, '&amp;')}</text></svg>`);
  const tile = async (buf, w, h, txt) => {
    const img = await sharp(buf).resize(w, h, { fit: 'contain', background: '#0b1416' }).png().toBuffer();
    return sharp({ create: { width: w, height: h + 34, channels: 3, background: '#0b1416' } }).composite([{ input: img, top: 34, left: 0 }, { input: label(txt, w), top: 0, left: 0 }]).png().toBuffer();
  };
  const circle = async (file, d) => {
    const mask = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${d}" height="${d}"><circle cx="${d / 2}" cy="${d / 2}" r="${d / 2}" fill="#fff"/></svg>`);
    return sharp(await sharp(path.join(OUT, file)).resize(d, d).png().toBuffer()).composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer();
  };
  const crop = (file, z) => sharp(path.join(OUT, file)).extract({ left: z.x, top: z.y, width: z.w, height: z.h }).png().toBuffer();
  for (const r of report.filter(r => r.zones)) {
    const a = ASSETS.find(x => x.id === r.id);
    if (a.kind === 'avatar') {
      const big = await circle(a.file, 300), sm = await circle(a.file, 96), xs = await circle(a.file, 40);
      const canvas = await sharp({ create: { width: 520, height: 300, channels: 4, background: '#0b1416' } })
        .composite([{ input: big, left: 0, top: 0 }, { input: sm, left: 330, top: 40 }, { input: xs, left: 450, top: 68 }]).png().toBuffer();
      tiles.push(await tile(canvas, 520, 300, `${r.id} · circle 300/96/40 px`));
    } else if (a.kind === 'watermark') {
      tiles.push(await tile(await sharp(path.join(OUT, a.file)).flatten({ background: '#808080' }).png().toBuffer(), 160, 160, 'yt-watermark'));
    } else {
      for (const z of a.zones.filter(z => z.type === 'view' || z.type === 'safe')) {
        const w = 520, h = Math.round(w * z.h / z.w);
        tiles.push(await tile(await crop(a.file, z), w, Math.min(h, 300), `${r.id} · ${z.label}`));
      }
      if (a.kind === 'yt-thumb') tiles.push(await tile(await sharp(path.join(OUT, a.file)).resize(168, 94).png().toBuffer(), 168, 94, 'thumb 168px'));
    }
  }
  // xếp hàng ngang rộng 1600
  const metas = await Promise.all(tiles.map(t => sharp(t).metadata()));
  const W = 1600, gap = 12, comps = []; let x = gap, y = gap, rowH = 0;
  metas.forEach((m, i) => { if (x + m.width > W - gap) { x = gap; y += rowH + gap; rowH = 0; } comps.push({ input: tiles[i], left: x, top: y }); x += m.width + gap; rowH = Math.max(rowH, m.height); });
  const H = y + rowH + gap;
  await sharp({ create: { width: W, height: H, channels: 3, background: '#05090a' } }).composite(comps).jpeg({ quality: 80, mozjpeg: true }).toFile(path.join(OUT, 'contact-sheet.jpg'));
}

// ---------- --check: file đã commit (nhanh, không trình duyệt – chạy trong npm test) ----------
export function check() {
  const errs = [], mf = path.join(OUT, 'manifest.json');
  if (!fs.existsSync(mf)) return ['thiếu brand/social/channel-kit/manifest.json (dựng trên CI: workflow social-channel-kit)'];
  const m = JSON.parse(fs.readFileSync(mf, 'utf8'));
  for (const [f, h] of Object.entries(m.logo || {})) if (LOGO_SHA[f] !== h) errs.push(`logo ${f} đã đổi so với lúc dựng kit → dựng lại (và đổi logo cần chủ duyệt)`);
  if (JSON.stringify(m.copy) !== JSON.stringify(COPY)) errs.push('chữ (COPY) đã đổi so với lúc dựng → dựng lại trên CI');
  for (const a of ASSETS) {
    const files = [[a.file, 1], ...(a.scale2x ? [[a.file.replace(/\.png$/, '@2x.png'), 2]] : [])];
    for (const [f, sc] of files) {
      const p = path.join(OUT, f);
      if (!fs.existsSync(p)) { errs.push(`thiếu ${f}`); continue; }
      const buf = fs.readFileSync(p), d = pngSize(buf), kb = buf.length / 1024;
      if (d.w !== a.w * sc || d.h !== a.h * sc) errs.push(`${f}: ${d.w}×${d.h} ≠ ${a.w * sc}×${a.h * sc}`);
      if (kb > a.maxKB) errs.push(`${f}: ${Math.round(kb)} KB > ${a.maxKB} KB`);
      if (hasVietnamese(f)) errs.push(`${f}: tên file có chữ Việt`);
    }
    const r = (m.assets || []).find(x => x.id === a.id);
    if (!r) errs.push(`manifest thiếu ${a.id}`);
    else if (langOf(a) === 'vi' && !(r.text || []).some(t => hasVietnamese(t.text))) errs.push(`${a.id}: bản vi không có dấu tiếng Việt (chưa dịch?)`);
    else if (langOf(a) === 'vi' && !(r.fonts || []).length) errs.push(`${a.id}: manifest không ghi phông dùng (cổng phông tiếng Việt)`);
    else if (langOf(a) === 'vi' && r.fonts.some(f => !OWN_FONTS.includes(f))) errs.push(`${a.id}: rơi về phông hệ thống ${r.fonts.filter(f => !OWN_FONTS.includes(f))}`);
    else for (const t of r.text || []) {
      if (langOf(a) === 'en' && hasVietnamese(t.text)) errs.push(`${a.id}: chữ tiếng Việt "${t.text}"`);
      if (t.contrast < 4.5) errs.push(`${a.id}: "${t.text}" tương phản ${t.contrast}:1`);
    }
  }
  return errs;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  if (process.argv.includes('--check')) {
    const e = check();
    if (e.length) { console.error('✗ channel-kit:\n- ' + e.join('\n- ')); process.exit(1); }
    console.log(`✓ channel-kit: ${ASSETS.length} asset đúng kích thước, dung lượng, logo nguyên bản, bản en không chữ Việt, bản vi đủ dấu + phông kit`);
  } else await build();
}
