// Sinh store/chrome/fill.html (trang copy nhanh để điền dashboard Chrome Web Store / Edge Add-ons)
// từ store/chrome/listing.json (tên, mô tả ngắn, mô tả – 15 ngôn ngữ) và store/chrome/PRIVACY-PRACTICES.md (các khối ```).
// Sửa nội dung ở 2 file nguồn đó rồi chạy: node scripts/gen-store-fill.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const listing = JSON.parse(readFileSync(ROOT + 'store/chrome/listing.json', 'utf8'));
const privacy = readFileSync(ROOT + 'store/chrome/PRIVACY-PRACTICES.md', 'utf8');
const NAMES = { en: 'English (default)', vi: 'Tiếng Việt', es: 'Español', pt_BR: 'Português (Brasil)', fr: 'Français', de: 'Deutsch', id: 'Bahasa Indonesia', th: 'ไทย', zh_CN: '中文（简体）', ja: '日本語', ko: '한국어', hi: 'हिन्दी', ar: 'العربية', ru: 'Русский', tr: 'Türkçe' };

const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;');
const field = (label, text, note = '') => `<div class="f"><div class="l"><span>${esc(label)}${note ? ` <small>${esc(note)}</small>` : ''}</span><button>Copy</button></div><pre>${esc(text)}</pre></div>`;

// Khối ``` trong PRIVACY-PRACTICES.md, nhãn = tiêu đề "## …" hoặc dòng "**…**" ngay trước khối.
const privacyFields = [];
{
  let label = '', inBlock = false, buf = [];
  for (const line of privacy.split('\n')) {
    if (line.startsWith('```')) {
      if (inBlock) { privacyFields.push([label, buf.join('\n')]); buf = []; }
      inBlock = !inBlock; continue;
    }
    if (inBlock) { buf.push(line); continue; }
    const h = line.match(/^##\s+(.+)/) || line.match(/^\*\*(.+?)\*\*/);
    if (h) label = h[1].replace(/\*\*/g, '');
  }
}

const parts = [];
parts.push(`<h1>Lexkite – điền Chrome Web Store / Edge Add-ons</h1><p>Bấm <b>Copy</b> rồi dán vào ô tương ứng trên dashboard. Nội dung sinh từ <code>store/chrome/listing.json</code> + <code>store/chrome/PRIVACY-PRACTICES.md</code> bằng <code>node scripts/gen-store-fill.mjs</code> – đừng sửa tay trang này. Ảnh: <code>store/chrome/screenshots/</code> (1280×800, en-1…5 / vi-1…5; ngôn ngữ khác lấy từ workflow "Ảnh Chrome Web Store"), ô nhỏ <code>store/chrome/promo-440x280.png</code>, ô lớn <code>store/chrome/promo-1400x560.png</code>.</p>`);
parts.push(`<h2>1. Package</h2><p>Upload: <code>store/lexkite-extension.zip</code> (<code>bash scripts/build-extension.sh --zip</code>). Tên và mô tả ngắn hiển thị trên cửa hàng lấy từ gói (<code>_locales/*/messages.json</code> → appName / appDesc) – nên khớp với ô Name / Summary dưới đây.</p>`);
parts.push(`<h2>2. Store listing – mỗi ngôn ngữ</h2><p>Đầu trang Store listing chọn Language → dán Description (và Summary nếu dashboard cho sửa), kéo 5 ảnh của ngôn ngữ đó.</p><nav class="toc">${Object.keys(listing).map(k => `<a href="#${k}">${esc(NAMES[k] || k)}</a>`).join(' · ')}</nav>`);
for (const [loc, L] of Object.entries(listing)) {
  parts.push(`<h3 id="${loc}">${esc(NAMES[loc] || loc)} <code>${loc}</code></h3>`);
  parts.push(field('Name', L.name, `${[...L.name].length}/75`));
  parts.push(field('Summary', L.summary, `${L.summary.length}/132`));
  parts.push(field('Description', L.description, `${L.description.length} ký tự`));
}
parts.push(`<h2>3. Privacy practices</h2>`);
for (const [label, text] of privacyFields) parts.push(field(label, text));
parts.push(`<h2>4. Data usage – tick</h2><table><tr><th>Mục</th><th>Tick</th></tr><tr><td>Personally identifiable information</td><td>✅</td></tr><tr><td>Health</td><td>—</td></tr><tr><td>Financial and payment</td><td>—</td></tr><tr><td>Authentication information</td><td>✅</td></tr><tr><td>Personal communications</td><td>✅</td></tr><tr><td>Location</td><td>—</td></tr><tr><td>Web history</td><td>—</td></tr><tr><td>User activity</td><td>✅</td></tr><tr><td>Website content</td><td>✅</td></tr></table><p>Tick cả 3 cam kết (không bán dữ liệu / không dùng ngoài mục đích / không dùng cho tín dụng). Remote code: <b>No</b>. Distribution: Public, mọi khu vực, Free. Chi tiết: <code>store/chrome/PRIVACY-PRACTICES.md</code>.</p>`);

const css = 'body{font:15px/1.5 system-ui,sans-serif;max-width:860px;margin:2rem auto;padding:0 16px;color:#1c2b2b;background:#f6f8f7}h2{margin-top:2rem;color:#0F3D3E}h3{margin:1.6rem 0 .4rem}.toc{font-size:14px;line-height:1.9}.toc a{color:#0F3D3E}small{font-weight:400;color:#5b6b6a}.f{background:#fff;border:1px solid #d6e0de;border-radius:10px;padding:10px 12px;margin:10px 0}.l{font-weight:700;display:flex;justify-content:space-between;align-items:center;gap:8px}button{background:#E5502F;color:#fff;border:0;border-radius:8px;padding:5px 12px;cursor:pointer;font-weight:600}button.ok{background:#15803d}pre{white-space:pre-wrap;margin:6px 0 0;font:13px/1.45 ui-monospace,monospace;max-height:220px;overflow:auto}pre[dir=auto]{unicode-bidi:plaintext}table{border-collapse:collapse}td,th{border:1px solid #ccd;padding:4px 8px}';
const js = "document.querySelectorAll('.f button').forEach(b=>b.onclick=async()=>{await navigator.clipboard.writeText(b.closest('.f').querySelector('pre').textContent);b.textContent='✓ Đã copy';b.className='ok';setTimeout(()=>{b.textContent='Copy';b.className=''},1500)})";
const html = `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Lexkite – điền Chrome Web Store</title><style>${css}</style></head><body>${parts.join('\n').replace(/<pre>/g, '<pre dir="auto">')}\n<script>${js}</script></body></html>\n`;
writeFileSync(ROOT + 'store/chrome/fill.html', html);
console.log(`✓ fill.html: ${Object.keys(listing).length} ngôn ngữ, ${privacyFields.length} ô quyền riêng tư`);
