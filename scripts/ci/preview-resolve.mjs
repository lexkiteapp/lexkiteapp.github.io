// Giải xung đột gộp PR cho workflow preview-site.yml: gọi NGAY SAU `git merge` thất bại (đang giữa merge).
//   Mọi tệp xung đột đều là tệp SINH (hoặc có luật hợp) → tự giải, git add, thoát 0 (workflow commit rồi đi tiếp).
//   Còn ≥1 tệp thật chưa có luật → KHÔNG đụng gì, in danh sách ra stdout, thoát 1 (workflow abort + bỏ qua PR, ghi danh sách tệp vào summary).
// Luật: tệp sinh → lấy bên PR đến (--theirs), cuối quy trình chạy lại bộ sinh (scripts/ci/preview-regen.sh); i18n-fixed.json → hợp khóa;
//   gói dịch web/js/i18n/** → hợp khóa từ điển (giữ bản dịch của cả hai); msym.json → hợp tên icon (+ đánh dấu dựng lại font); docs *.md ghi trong UNION_TEXT → hợp dòng.
// Dùng: node scripts/ci/preview-resolve.mjs [--dry]   (--dry: chỉ phân loại, không ghi)
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';

export const GENERATED = [
  /^\.github\/workflows\/ci-triage\.yml$/,           // scripts/ci/sync-triage.mjs
  /^web\/js\/i18n\/[A-Za-z_]+\.js$/,                 // gói dịch lõi (build-i18n.sh / gen-i18n / i18n-fix)
  /^web\/js\/i18n\/(?!en\/)[A-Za-z_]+\/[^/]+\.js$/,  // gói dịch nhóm tải lười của 13 ngôn ngữ ngoài en (split-i18n.mjs)
  /^extension\/(app\/|academic\.json$|nt\/)/,        // bản chép web/ → extension/app + academic.json + nt/ (scripts/build-extension.sh)
  /^web\/fonts\/msym(r)?\.woff2$/, /^web\/fonts\/msym\.json$/, // scripts/build-stitch-css.mjs --fonts
  /^web\/css\/st-[^/]+\.css$/,                       // scripts/build-stitch-css.mjs
  /^docs\/CODEMAP\.md$/, /^docs\/codemap\.json$/,
  /^infra\/jobs\.json$/, /^docs\/JOBS\.md$/, /^functions\/api\/_jobs_reg\.js$/, // scripts/jobs/gen.mjs --write
  /^web\/js\/(path-mix|confidence\/data|lesson\/gold|lesson\/stories)\.js$/, // scripts/path|confidence|lesson build (prepush)
];
const UNION_TEXT = [/^docs\/STITCH-V2-PORT\.md$/]; // tài liệu liệt kê thêm mục: hợp hai bên (tệp mã như stitch-v2-convert.mjs KHÔNG nằm đây)
const isGen = f => GENERATED.some(r => r.test(f)), isUnion = f => UNION_TEXT.some(r => r.test(f));

const git = (...a) => execFileSync('git', a, { encoding: 'utf8', maxBuffer: 1 << 30 });
const stage = (n, f) => { const r = spawnSync('git', ['show', `:${n}:${f}`], { encoding: 'buffer', maxBuffer: 1 << 30 }); return r.status === 0 ? r.stdout : null; };

// Từ điển 1 dòng:  D["de"] = Object.assign(D["de"] || {}, {…});  → hợp khóa (bên PR đến thắng khi trùng khóa)
const DICT = /(Object\.assign\(D\[["'][^"']+["']\]\s*\|\|\s*\{\},\s*)(\{.*\})(\);?)/;
function unionDict(ours, theirs) {
  const a = ours.match(DICT), b = theirs.match(DICT); if (!a || !b) return null;
  try { return theirs.replace(DICT, (_, p, __, s) => p + JSON.stringify({ ...JSON.parse(a[2]), ...JSON.parse(b[2]) }) + s); } catch { return null; }
}

const unmerged = [...new Set(git('diff', '--name-only', '--diff-filter=U').split('\n').filter(Boolean))];
const dry = process.argv.includes('--dry');
if (!unmerged.length) { console.log('(không có tệp xung đột)'); process.exit(0); }
const blockers = unmerged.filter(f => !isGen(f) && !isUnion(f) && f !== 'scripts/i18n-fixed.json');
if (blockers.length) { console.log(blockers.join('\n')); process.exit(1); }
if (dry) { console.log('giải được:\n' + unmerged.join('\n')); process.exit(0); }

let fonts = false;
for (const f of unmerged) {
  const base = stage(1, f), ours = stage(2, f), theirs = stage(3, f);
  let out = null; // Buffer = nội dung ghi; null = xoá
  if (theirs === null) out = null;                               // PR đến xoá tệp sinh → xoá
  else if (ours === null) out = theirs;                          // phía mình đã xoá/không có → lấy bên PR
  else if (f === 'scripts/i18n-fixed.json') {
    const A = JSON.parse(ours.toString()), B = JSON.parse(theirs.toString());
    const O = base ? JSON.parse(base.toString()) : {}, M = { ...A };
    for (const [k, v] of Object.entries(B)) M[k] = (v && typeof v === 'object' && !Array.isArray(v) && A[k] && typeof A[k] === 'object') ? { ...A[k], ...v } : v;
    for (const k of Object.keys(O)) if (!(k in B) && k in A && JSON.stringify(A[k]) === JSON.stringify(O[k])) delete M[k]; // PR đến cố ý xoá khóa mà bên mình không đổi
    const ind = /\n( +)"/.exec(ours.toString()); out = Buffer.from(JSON.stringify(M, null, ind ? ind[1].length : 2) + '\n');
  } else if (f === 'web/fonts/msym.json') {
    out = Buffer.from(JSON.stringify([...new Set([...JSON.parse(ours.toString()), ...JSON.parse(theirs.toString())])].sort()) + '\n'); fonts = true;
  } else if (/^web\/fonts\/msymr?\.woff2$/.test(f)) { out = theirs; fonts = true; } // dựng lại theo danh sách hợp ở bước sinh
  else if (/^web\/js\/i18n\//.test(f)) out = unionDict(ours.toString(), theirs.toString()) ? Buffer.from(unionDict(ours.toString(), theirs.toString())) : theirs;
  else if (isUnion(f)) {
    const d = fs.mkdtempSync((process.env.TMPDIR || '/tmp') + '/pv-'); fs.writeFileSync(d + '/o', ours); fs.writeFileSync(d + '/b', base || ''); fs.writeFileSync(d + '/t', theirs);
    spawnSync('git', ['merge-file', '--union', d + '/o', d + '/b', d + '/t']); out = fs.readFileSync(d + '/o'); fs.rmSync(d, { recursive: true });
  } else out = theirs; // tệp sinh khác: bên PR đến
  if (out === null) git('rm', '-q', '--', f); else { fs.mkdirSync(f.replace(/\/[^/]*$/, '') || '.', { recursive: true }); fs.writeFileSync(f, out); git('add', '--', f); }
}
if (fonts && process.env.PREVIEW_STATE) fs.appendFileSync(process.env.PREVIEW_STATE + '/fonts', '1\n');
console.log('đã giải: ' + unmerged.length + ' tệp');
