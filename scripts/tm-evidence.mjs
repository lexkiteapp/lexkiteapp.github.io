// Nhật ký bằng chứng "sử dụng đầu tiên" nhãn hiệu Lexkite (quyền nhãn hiệu thông thường – common law, chưa đăng ký, $0):
// mỗi nơi dùng tên/logo (web, Chrome Web Store, Google Play, App Store, logo) → ngày dùng sớm nhất (commit git đầu tiên
// hoặc bản lưu Wayback sớm nhất, lấy cái sớm hơn) + 1 bản lưu Wayback mới (≤ 1 lần/30 ngày/nơi) → mục `tm-use` trong sổ băm
// (OTS + tem RFC 3161 phủ) + bảng tóm tắt content/protection/trademark-use.json. Chạy: content-evidence.yml (CI). ™ (chưa ®).
//   node scripts/tm-evidence.mjs [--dry]
import fs from 'node:fs'; import { execFileSync } from 'node:child_process'; import { pathToFileURL } from 'node:url';
import { readRegistry, recordEvidence, sha256 } from './lib/content-registry.mjs';
import { saveSnapshot } from './lib/wayback.mjs';
import { request } from './lib/http.mjs';

export const LOG = 'content/protection/trademark-use.json';
export const USES = [
  { use: 'website', mark: 'Lexkite', url: 'https://lexkite.com/', git: ['-S', 'Lexkite', '--', 'web/index.html'], goods: 'Online English-learning service (Nice class 41) and web app (class 9)' },
  { use: 'chrome-web-store', mark: 'Lexkite', url: 'https://chromewebstore.google.com/detail/idalfipabpfcajpkfkifbdlpejcdmfcd', git: ['-S', 'Lexkite', '--', 'extension/manifest.json'], goods: 'Browser extension – dictionary/translation software (class 9)' },
  { use: 'google-play', mark: 'Lexkite', url: 'https://play.google.com/store/apps/details?id=com.lexkite.app', git: ['-S', 'com.lexkite.app', '--', 'mobile'], goods: 'Android app – downloadable education software (class 9)' },
  { use: 'app-store', mark: 'Lexkite', url: 'https://apps.apple.com/app/id6824714708', git: ['-S', 'Lexkite', '--', 'mobile'], goods: 'iOS app – downloadable education software (class 9)' },
  { use: 'logo', mark: 'Lexkite logo (flying book kite)', url: 'https://lexkite.com/icons/icon.svg', git: ['--', 'web/icons/icon.svg'], gitLast: true, file: 'web/icons/icon.svg', goods: 'Logo used on all Lexkite products' },
];
// git: lần đầu xuất hiện (logo: lần đổi thiết kế gần nhất = ngày thiết kế hiện tại xuất hiện)
const gitFirst = (args, last) => { try { return execFileSync('git', ['log', ...(last ? ['-1'] : ['--reverse']), '--format=%cI', ...args]).toString().split('\n')[0].trim(); } catch { return ''; } };
// bản lưu sớm nhất (CDX) → { at ISO, url } | null
export function cdxFirst(body) {
  try { const rows = JSON.parse(body); const r = rows[1]; if (!r) return null; const t = r[0];
    return { at: `${t.slice(0, 4)}-${t.slice(4, 6)}-${t.slice(6, 8)}T${t.slice(8, 10)}:${t.slice(10, 12)}:${t.slice(12, 14)}Z`, url: `https://web.archive.org/web/${t}/${r[1]}` }; } catch { return null; }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const dry = process.argv.includes('--dry'), reg = readRegistry(), now = Date.now();
  for (const u of USES) {
    const g = gitFirst(u.git, u.gitLast), cdx = cdxFirst(request(`https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(u.url)}&output=json&limit=1&fl=timestamp,original&filter=statuscode:200`).body);
    // dùng công khai (thương mại) = bản lưu Wayback sớm nhất; git chỉ là ngày tạo (ghi riêng firstRecord) – dùng khi chưa có bản lưu
    const rec = g && { at: new Date(g).toISOString(), src: `git log ${u.git.join(' ')}` }, first = cdx ? { at: cdx.at, src: cdx.url } : rec && { ...rec, src: `${rec.src} (chưa có bản lưu công khai)` };
    const last = reg.filter(e => e.type === 'tm-use' && e.use === u.use).at(-1);
    if (last && now - new Date(last.at) < 30 * 864e5) { console.log(`· ${u.use}: đã ghi ${last.at.slice(0, 10)}`); continue; }
    if (!first) { console.log(`::warning::${u.use}: chưa có ngày dùng (git/Wayback) – bỏ qua`); continue; }
    if (dry) { console.log(`[dry] ${u.use}: firstUse ${first.at} (${first.src})`); continue; }
    const snap = await saveSnapshot(u.url);
    const e = recordEvidence('tm-use', { url: u.url, mark: u.mark, use: u.use, goods: u.goods, firstUse: first.at, firstUseSource: first.src, firstRecord: rec ? rec.at : undefined, designSha256: u.file ? sha256(fs.readFileSync(u.file)) : undefined, archiveUrl: snap.ok ? snap.snapshotUrl : undefined });
    console.log(`✓ ${u.use}: firstUse ${first.at.slice(0, 10)} · ${snap.ok ? snap.snapshotUrl : 'Wayback lỗi – lần sau'} → sổ #${e.seq}`);
  }
  if (!dry) { // bảng tóm tắt cho hồ sơ nhãn hiệu (sinh lại từ sổ)
    const rows = readRegistry().filter(e => e.type === 'tm-use'), by = {};
    for (const e of rows) { const b = by[e.use] || (by[e.use] = { mark: e.mark, use: e.use, url: e.url, goods: e.goods, firstUse: e.firstUse, firstUseSource: e.firstUseSource, archives: [], registry: [] }); if (e.firstUse < b.firstUse) Object.assign(b, { firstUse: e.firstUse, firstUseSource: e.firstUseSource }); if (e.archiveUrl) b.archives.push(e.archiveUrl); b.registry.push(e.seq); }
    fs.writeFileSync(LOG, JSON.stringify({ _note: 'Sinh tự động bởi scripts/tm-evidence.mjs từ sổ băm (mục tm-use). Nhãn hiệu chưa đăng ký – dùng ™, không dùng ®.', owner: 'MODIAN LUXURY JEWELRY LLC', uses: Object.values(by) }, null, 1) + '\n');
  }
}
