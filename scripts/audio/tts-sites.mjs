// Độ phủ giọng Kokoro theo CHỖ GỌI (bổ sung cho coverage.mjs đo theo nhóm nội dung): quét mọi file có chỗ đọc to,
// đối chiếu khai báo scripts/audio/tts-sites.json (file → nhóm Kokoro dựng sẵn và/hoặc lý do "dynamic" → engine đọc động).
//   node scripts/audio/tts-sites.mjs          → bảng chỗ gọi × % nhóm (GITHUB_STEP_SUMMARY nếu có)
//   node scripts/audio/tts-sites.mjs --check  → thoát 1 khi có file đọc to chưa khai / khai thừa / nhóm không tồn tại (scripts/test/tts-sites.mjs)
import fs from 'node:fs'; import path from 'node:path'; import { pathToFileURL } from 'node:url';
import { SCAN_ROOTS } from '../lib/scan-roots.mjs';
export const MANIFEST = 'scripts/audio/tts-sites.json';
// Chỗ đọc to: hàm chung, nút loa khai qua data-*, giáo viên nói, và đường vòng speechSynthesis trực tiếp (bỏ qua Kokoro – phải khai)
export const SITE_RE = /\b(?:g\.)?UI\.(?:tts|speak|sayBtn)\(|data-(?:saysent|speak-text)=|\b(?:tch|T|teacher|L\.teacher)\.say\(|speechSynthesis\.speak\(|new SpeechSynthesisUtterance\b|\bLessonTeacher\.mount\(/;
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => (e.isDirectory() ? (/^(i18n|vendor)$/.test(e.name) ? [] : walk(path.join(d, e.name))) : e.name.endsWith('.js') ? [path.join(d, e.name)] : []));
export function scan() {
  const files = [...SCAN_ROOTS.filter(r => fs.existsSync(r)).flatMap(walk), ...fs.readdirSync('extension').filter(f => f.endsWith('.js')).map(f => 'extension/' + f)], out = new Map();
  for (const f of files) { const n = fs.readFileSync(f, 'utf8').split('\n').filter(l => SITE_RE.test(l)).length; if (n) out.set(f.split(path.sep).join('/'), n); }
  return out;
}
export const readManifest = () => JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
// Lỗi khai báo: file đọc to chưa khai, khai mà file hết chỗ đọc, mục trống, nhóm không có trong đo độ phủ
export function verdict(found, manifest, groupNames) {
  const bad = [], S = manifest.sites || {};
  for (const f of found.keys()) if (!S[f]) bad.push(`${f}: có chỗ đọc to nhưng chưa khai trong ${MANIFEST} (nhóm Kokoro trong scripts/sentence-audio/corpus.mjs, hoặc "dynamic": lý do)`);
  for (const [f, x] of Object.entries(S)) {
    if (!found.has(f)) bad.push(`${f}: khai trong ${MANIFEST} nhưng không còn chỗ đọc to → xóa mục`);
    if (!x.engine && !(x.groups || []).length && !x.dynamic) bad.push(`${f}: cần "groups", "dynamic" hoặc "engine"`);
    for (const g of x.groups || []) if (!groupNames.has(g)) bad.push(`${f}: nhóm "${g}" không có trong scripts/audio/coverage.mjs`);
  }
  return bad;
}
export function table(found, manifest, m) {
  const S = manifest.sites || {}, rows = [...found.keys()].sort().map(f => {
    const x = S[f] || {}, gs = (x.groups || []).map(g => (m[g] ? `${g} ${m[g].pct}%` : `${g} ?`)).join(', ');
    return `| ${f} | ${found.get(f)} | ${x.engine ? 'đường đọc chung' : gs || '–'} | ${x.dynamic || ''} |`;
  });
  const st = Object.values(S).filter(x => !x.engine), stat = st.filter(x => (x.groups || []).length).length, dyn = st.filter(x => x.dynamic).length;
  return [`## Chỗ gọi giọng đọc (${found.size} file · ${stat} có nhóm Kokoro · ${dyn} có phần động)`, '| File | Dòng | Nhóm Kokoro dựng sẵn | Phần động (engine đọc động / giọng máy) |', '|---|---:|---|---|', ...rows].join('\n');
}
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { measure } = await import('./coverage.mjs'), m = await measure(), found = scan(), man = readManifest(), md = table(found, man, m);
  console.log(md);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md + '\n');
  if (process.argv.includes('--check')) { const bad = verdict(found, man, new Set(Object.keys(m))); if (bad.length) { console.error('✗ chỗ gọi giọng đọc:\n  ' + bad.join('\n  ')); process.exit(1); } console.log('✓ mọi chỗ đọc to đã khai'); }
}
