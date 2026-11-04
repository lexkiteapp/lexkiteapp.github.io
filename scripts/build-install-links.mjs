// Từ infra/install-links.json (nguồn duy nhất) sinh: web/js/ext-config.js (trình duyệt, add-on), functions/api/_install_data.js (Functions + script). Trang cài ngắn web/get/index.html: getPage() ở đây, scripts/build-landing.mjs ghi (cần themePage).
// Dùng: node scripts/build-install-links.mjs [--check]   (--check: không ghi, báo lỗi nếu file sinh đã cũ; chạy trong scripts/test/install-links.mjs)
import fs from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const R = new URL('..', import.meta.url);
export const readLinks = () => JSON.parse(fs.readFileSync(new URL('infra/install-links.json', R), 'utf8'));
const js = s => `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

export const extConfig = D => { const c = D.channels; return `/* TỰ SINH bởi scripts/build-install-links.mjs từ infra/install-links.json (nguồn DUY NHẤT link cài) – KHÔNG sửa tay.
   Web app nạp file này; landing/blog dựng sẵn đọc lúc build. Edge cài được add-on thẳng từ Chrome Web Store. Kênh rỗng = chưa có listing, không hiện nút. */
self.LK_EXT = { id: ${js(c.cws.id)}, store: ${js(c.cws.url)} };
self.LK_APPS = { play: ${js(c.play.url)}, ios: ${js(c.ios.url)}, edge: ${js(c.edge.url)}, firefox: ${js(c.firefox.url)} };
`; };
export const dataModule = D => `/* TỰ SINH bởi scripts/build-install-links.mjs từ infra/install-links.json – KHÔNG sửa tay. Dùng qua ./_install_links.js. */
export const INSTALL = ${JSON.stringify({ site: D.site, short: D.short, channels: D.channels, trademarks: D.trademarks }, null, 2)};
`;

// Trang cài ngắn /get: Android → Play, iPhone/iPad → App Store (kèm nguồn), còn lại → khu Cài của landing đúng ngôn ngữ (đủ kênh). Không JS: vẫn thấy link thật.
// Chữ trên trang chỉ gồm tên riêng (Lexkite, tên cửa hàng) nên dùng chung cho 15 ngôn ngữ; màu = token Lexkite Kit (sáng/tối).
const T = JSON.parse(fs.readFileSync(new URL('brand/tokens.json', R), 'utf8')); // màu: nguồn token duy nhất
export const getPage = D => { const live = ['ios', 'play', 'cws', 'edge', 'firefox'].filter(k => D.channels[k].url).map(k => [k, D.channels[k]]);
  const go = JSON.stringify({ ios: D.channels.ios.url, play: D.channels.play.url });
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Get Lexkite</title>
<meta name="robots" content="noindex, follow">
<link rel="canonical" href="${D.site}/">
<link rel="icon" href="/icons/icon.svg?v=2" type="image/svg+xml">
<meta name="theme-color" content="#0F3D3E">
<script>(function(){try{var A=${go},Q=new URLSearchParams(location.search),C=function(s,n){return String(s||'').toLowerCase().replace(/[^a-z0-9_.-]+/g,'-').slice(0,n)},s=C(Q.get('src'),40)||'short',c=C(Q.get('c'),60)||'general',N=navigator,u=N.userAgent,L=['vi','en','es','pt','fr','de','id','th','zh','ja','ko','hi','ar','ru','tr'],k=/Android/.test(u)?'play':/iPhone|iPad|iPod/.test(u)||/Mac/.test(u)&&N.maxTouchPoints>1?'ios':'',m='utm_source='+s+'&utm_medium=short_link&utm_campaign='+c,t;if(k==='play'&&A.play)t=A.play+'&referrer='+encodeURIComponent(m);else if(k==='ios'&&A.ios)t=A.ios+(A.ios.indexOf('?')<0?'?':'&')+'ct='+(s+'_'+c).slice(0,40);else{var l=((N.languages&&N.languages[0])||N.language||'en').slice(0,2).toLowerCase();l=L.indexOf(l)<0?'en':l;t=(l==='vi'?'/':'/'+l+'/')+'?src=get_'+s+'#install';k='web'}try{N.sendBeacon('/api/hit',JSON.stringify({t:'q',ev:'app_get_'+k}))}catch(e){}location.replace(t)}catch(e){}})();</script>
<style>:root{--bg:${T.light['--bg']};--fg:${T.light['--heading']};--line:${T.light['--line']}}@media (prefers-color-scheme: dark) {:root{--bg:${T.dark['--bg']};--fg:${T.dark['--heading']};--line:${T.dark['--line']}}}body{margin:0;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:24px 16px;box-sizing:border-box;background:var(--bg);color:var(--fg);font:600 16px/1.4 system-ui,sans-serif}h1{margin:0 0 8px;font-size:24px}a{display:inline-flex;align-items:center;justify-content:center;min-height:44px;width:min(100%,320px);box-sizing:border-box;padding:8px 16px;border:2px solid var(--line);border-radius:14px;color:inherit;text-decoration:none}a:focus-visible{outline:3px solid currentColor;outline-offset:2px}</style>
</head>
<body>
<img src="/icons/icon.svg?v=2" width="56" height="56" alt="">
<h1>Lexkite</h1>
${live.map(([, c]) => `<a href="${c.url}" rel="noopener">${c.name}</a>`).join('\n')}
<a href="/app/">Web app</a>
</body>
</html>
`; };

export const targets = D => [['web/js/ext-config.js', extConfig(D)], ['functions/api/_install_data.js', dataModule(D)]];

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const check = process.argv.includes('--check'), stale = [];
  for (const [p, txt] of targets(readLinks())) {
    const f = new URL(p, R);
    if (check) { if (!fs.existsSync(f) || fs.readFileSync(f, 'utf8') !== txt) stale.push(p); continue; }
    fs.mkdirSync(new URL('.', f), { recursive: true }); fs.writeFileSync(f, txt);
  }
  if (stale.length) { console.error(`✗ build-install-links: chưa dựng lại ${stale.join(', ')} → node scripts/build-install-links.mjs`); process.exit(1); }
  console.log(`✓ build-install-links: ${check ? 'khớp nguồn' : 'đã dựng'} (${fileURLToPath(new URL('infra/install-links.json', R)).split('/').slice(-2).join('/')})`);
}
