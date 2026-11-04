// Zenodo (CERN, miễn phí): mỗi tháng nộp 1 bản ghi RESTRICTED ACCESS – tệp nội dung KHÔNG công khai, chỉ metadata + ngày công bố
// + DOI công khai. Gói = tar.gz kho nội dung học (web/js, content/ trừ protection) + manifest sha256 từng tệp + gốc băm.
// Ghi mục `deposit` (DOI, gốc băm, số tệp) vào sổ băm. Chỉ chạy trên CI (content-evidence.yml, ngày 1 hằng tháng).
//   ZENODO_TOKEN=… node scripts/zenodo-deposit.mjs [--sandbox] [--dry]      (--dry: chỉ dựng gói + manifest, không gửi)
// Chưa có secret ZENODO_TOKEN → in ::notice:: và thoát 0 (job tắt). Token: owner tạo (docs/CONTENT-PROTECTION.md §4c).
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { execFileSync } from 'node:child_process'; import { pathToFileURL } from 'node:url';
import { sha256, recordEvidence, readRegistry } from './lib/content-registry.mjs';

export const PATHS = ['web/js', 'content', ':!content/protection'];
// manifest: "sha256  đường-dẫn" sắp xếp → gốc băm (ai giữ gói đều tính lại được)
export function manifest(files, read = f => fs.readFileSync(f)) {
  const lines = files.slice().sort().map(f => `${sha256(read(f))}  ${f}`);
  return { lines, root: sha256(lines.join('\n')), files: lines.length };
}
export function metadata({ month, root, files, commit }) {
  return {
    title: `Lexkite learning content – copyright deposit ${month}`,
    upload_type: 'dataset',
    description: `<p>Restricted-access deposit of original English-learning content authored by Lexkite (https://lexkite.com): lessons, practice tests, answer keys, explanations, model answers, vocabulary data and articles. © MODIAN LUXURY JEWELRY LLC (Lexkite). All rights reserved; no licence is granted and use for AI/ML training is not permitted.</p><p>Purpose: independent, dated proof of authorship. Archive SHA-256 manifest root: <code>${root}</code> (${files} files, source commit ${commit}).</p>`,
    creators: [{ name: 'Lexkite (MODIAN LUXURY JEWELRY LLC)' }],
    access_right: 'restricted',
    access_conditions: 'Access only for copyright verification in a dispute, on request to Lexkite (support@lexkite.com).',
    keywords: ['Lexkite', 'copyright deposit', 'English learning'],
    publication_date: new Date().toISOString().slice(0, 10),
    version: month,
  };
}
const CURL = (args, token, input = '') => execFileSync('curl', ['-s', '-f', '--max-time', '600', '-K', '-', ...args], { input: `header = "Authorization: Bearer ${token}"\n${input}`, maxBuffer: 50e6 }).toString();

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const a = process.argv.slice(2), dry = a.includes('--dry'), token = process.env.ZENODO_TOKEN, host = a.includes('--sandbox') || process.env.ZENODO_SANDBOX ? 'https://sandbox.zenodo.org' : 'https://zenodo.org';
  if (!token && !dry) { console.log('::notice::Zenodo: chưa có secret ZENODO_TOKEN – bỏ qua (owner tạo token: docs/CONTENT-PROTECTION.md §4c)'); process.exit(0); }
  const month = new Date().toISOString().slice(0, 7);
  if (readRegistry().some(e => e.type === 'deposit' && e.version === month) && !a.includes('--force')) { console.log(`· Zenodo: đã nộp tháng ${month}`); process.exit(0); }
  const files = execFileSync('git', ['ls-files', '-z', '--', ...PATHS]).toString().split('\0').filter(Boolean);
  const commit = process.env.GITHUB_SHA || execFileSync('git', ['rev-parse', 'HEAD']).toString().trim();
  const m = manifest(files), d = fs.mkdtempSync(path.join(os.tmpdir(), 'lk-zen-')), name = `lexkite-content-${month}`;
  fs.writeFileSync(path.join(d, 'list'), files.join('\0'));
  fs.writeFileSync(path.join(d, `${name}.manifest.txt`), `# Lexkite content manifest ${month} · commit ${commit} · root ${m.root}\n${m.lines.join('\n')}\n`);
  execFileSync('tar', ['--null', '-T', path.join(d, 'list'), '-czf', path.join(d, `${name}.tar.gz`)]);
  console.log(`· gói ${name}: ${m.files} tệp, ${(fs.statSync(path.join(d, `${name}.tar.gz`)).size / 1e6).toFixed(1)} MB, root ${m.root.slice(0, 16)}…`);
  if (dry) process.exit(0);
  const dep = JSON.parse(CURL(['-H', 'Content-Type: application/json', '-X', 'POST', '--data', '{}', `${host}/api/deposit/depositions`], token));
  for (const f of [`${name}.tar.gz`, `${name}.manifest.txt`]) CURL(['-X', 'PUT', '--upload-file', path.join(d, f), `${dep.links.bucket}/${f}`], token);
  const meta = metadata({ month, root: m.root, files: m.files, commit });
  CURL(['-H', 'Content-Type: application/json', '-X', 'PUT', '--data', JSON.stringify({ metadata: meta }), `${host}/api/deposit/depositions/${dep.id}`], token);
  const pub = JSON.parse(CURL(['-X', 'POST', `${host}/api/deposit/depositions/${dep.id}/actions/publish`], token));
  const url = `${host}/records/${pub.record_id || pub.id}`;
  const e = recordEvidence('deposit', { url, doi: pub.doi, root: m.root, files: m.files, access: 'restricted', version: month, service: 'zenodo', commit });
  console.log(`✓ Zenodo DOI ${pub.doi} · ${url} → sổ #${e.seq}`);
  fs.rmSync(d, { recursive: true, force: true });
}
