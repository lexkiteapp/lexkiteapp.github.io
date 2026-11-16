// pr-scope: PR này đổi loại file nào? → job nặng (UI) bỏ qua khi PR chỉ đổi nội dung/chữ dịch (docs/CI-RUNNERS.md › "Phạm vi PR").
//   node scripts/ci/pr-scope.mjs --pr <số> --need ui[,text] --workflow .github/workflows/X.yml [--repo o/r]   in `ok=true|false` (+ ghi $GITHUB_OUTPUT); API lỗi → ok=true (mở cổng, không mất kiểm)
//   Chỉ xét file khớp `pull_request.paths` của CHÍNH workflow X (file khác không kích workflow đó); file workflow X tự nó luôn tính là UI (sửa workflow phải chạy lại nó).
//   node scripts/ci/pr-scope.mjs --files a,b,c                              (thử tay) in kết quả phân loại
// Phân loại MẶC ĐỊNH = ui (an toàn): chỉ file khớp danh sách NỘI DUNG / CHỮ DỊCH dưới đây mới không tính là giao diện.
// Không dùng `paths:` ở mức workflow: workflow vẫn chạy, job nặng `if: needs.gate.outputs.go == 'true'` → skipped, required-gate tính skipped là đạt.
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const LANGS = 'ar|de|en|es|fr|hi|id|ja|ko|pt|ru|th|tr|vi|zh';
// nội dung thuần dữ liệu / trang tĩnh sinh từ nội dung: không đổi bố cục app
export const CONTENT = [
  /^web\/(cpack|blog|packs|audio|screenshots)\//, new RegExp(`^web\\/(${LANGS})\\/`), /^extension\/app\/cpack\//,
  /^content\//, /^docs\//, /^brand\/.*\.md$/, /\.(md|txt)$/, /^web\/(sitemap\.xml|rss\.xsl|ads\.txt|app-ads\.txt|robots\.txt)$/,
];
// chuỗi giao diện dịch (không đổi markup/CSS; chữ dài vẫn do visual-qa/mobile-qa/journey-e2e soi vì các workflow đó không dùng cờ này)
export const TEXT = [/^web\/js\/i18n\//, /^extension\/app\/js\/i18n\//, /^i18n\//, /^native\/shared\/(gen\/)?strings/, /^native\/ios\/.*\/Resources\/strings\//];

// phía máy chủ / quản trị / hạ tầng: không vẽ ra màn app người học (admin-*.js chỉ ở trang Quản trị – workflow admin-* tự lo)
export const BACKEND = [/^functions\//, /^workers\//, /^infra\//, /^web\/js\/admin-/, /^scripts\/(growth|ops|social|video|content-qa)\//];

/** Hàm thuần: danh sách file → { ui, text, content } (ui = có file KHÔNG thuộc nội dung/chữ dịch/backend → mặc định coi là giao diện). */
export function classify(files) {
  let ui = false, text = false, content = false;
  for (const f of files) {
    if (CONTENT.some(r => r.test(f))) content = true;
    else if (BACKEND.some(r => r.test(f))) continue;
    else if (TEXT.some(r => r.test(f))) text = true;
    else ui = true;
  }
  return { ui, text, content };
}
/** Glob kiểu GitHub Actions (`**` qua thư mục, `*` trong 1 cấp, `?`) → RegExp. */
export function globRe(g) {
  return new RegExp('^' + g.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*\*\//g, '\u0001').replace(/\*\*/g, '\u0002').replace(/\*/g, '[^/]*').replace(/\?/g, '[^/]').replace(/\u0001/g, '(?:.*/)?').replace(/\u0002/g, '.*') + '$');
}
/** `pull_request.paths` của workflow (dạng `paths: [a, b]` một dòng hoặc danh sách `- a`) → mảng glob; không có → null. */
export function prPaths(src) {
  const m = src.match(/^  pull_request:[ \t]*\n((?:    .*\n|[ \t]*\n)*)/m); if (!m) return null;
  const one = m[1].match(/^    paths:\s*\[(.*)\]\s*$/m);
  if (one) return one[1].split(/,(?=\s*['"])/).map(x => x.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
  const blk = m[1].match(/^    paths:\s*\n((?:      - .*\n)*)/m);
  return blk ? [...blk[1].matchAll(/^      - ['"]?(.+?)['"]?\s*$/gm)].map(x => x[1]) : null;
}
/** File nào KÍCH workflow này (khớp paths, không dính phủ định); workflow không có paths → mọi file. File workflow tự nó luôn tính. */
export function relevantFiles(files, paths, self = '') {
  if (!paths) return files;
  const pos = paths.filter(x => !x.startsWith('!')).map(globRe), neg = paths.filter(x => x.startsWith('!')).map(x => globRe(x.slice(1)));
  return files.filter(f => f === self || (pos.some(r => r.test(f)) && !neg.some(r => r.test(f))));
}

/** need: tập cờ mà job cần ('ui' | 'ui,text'): chạy khi PR có ÍT NHẤT một cờ đó; PR không có file → chạy. */
export function needed(files, need) {
  if (!files.length) return true;
  const c = classify(files);
  return String(need).split(',').map(s => s.trim()).filter(Boolean).some(k => c[k]);
}

async function main() {
  const a = process.argv.slice(2), arg = k => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : ''; };
  const need = arg('--need') || 'ui';
  let files;
  if (arg('--files')) files = arg('--files').split(',').filter(Boolean);
  else {
    const repo = arg('--repo') || process.env.GITHUB_REPOSITORY, pr = arg('--pr');
    try {
      files = JSON.parse(execFileSync('gh', ['api', '--paginate', '--slurp', `repos/${repo}/pulls/${pr}/files?per_page=100`], { encoding: 'utf8', maxBuffer: 1 << 26 })).flat().map(f => f.filename);
      if (files.length >= 3000) files = [];   // API cắt ở 3000 file → coi như PR lớn: chạy hết
    } catch (e) { console.log('pr-scope: API lỗi → mở cổng', String(e.message).split('\n')[0]); files = []; }
  }
  const wf = arg('--workflow'), rel = wf ? relevantFiles(files, prPaths(fs.readFileSync(wf, 'utf8')), wf) : files;
  const ok = needed(rel, need), c = classify(rel);
  console.log(`pr-scope: ${files.length} file (${rel.length} kích workflow) · ui=${c.ui} text=${c.text} content=${c.content} · cần [${need}] → ok=${ok}`);
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `ok=${ok}\n`);
}
if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
