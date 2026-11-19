// Hồ sơ bằng chứng (docs/legal/DMCA-KIT.md §1): node scripts/content-registry.mjs evidence <url|seq|hash|canary-id>
// Thuần đọc file trong repo + git (không mạng) → chạy được ở bất kỳ đâu, kết quả dán thẳng vào thông báo DMCA.
import fs from 'node:fs'; import { execFileSync } from 'node:child_process';
import { REGISTRY, readRegistry, verifyChain, registryLines, OTS_DIR, otsPath, otsState, stampable } from './content-registry.mjs';
import { coveringStamps } from '../tsa.mjs';

const git = (...a) => { try { return execFileSync('git', a).toString().trim(); } catch { return ''; } };
const REPO = 'https://github.com/lexkiteapp/lexkiteapp.github.io';
// Mục gốc cần chứng minh cho 1 truy vấn
export function targets(q, all, canaries = [], since = '') {
  if (/^\d+$/.test(q)) return { kind: 'seq', list: all.filter(e => e.seq === +q) };
  if (/^[0-9a-f]{64}$/.test(q)) return { kind: 'hash', list: all.filter(e => e.hash === q) };
  const c = canaries.find(x => x.id === q);
  if (c) { const ds = all.filter(e => e.type === 'dataset'); return { kind: 'canary', canary: c, list: [ds.find(e => since && e.at >= since) || ds.at(-1)].filter(Boolean) }; } // ảnh chụp kho đầu tiên sau khi cài canary
  return { kind: 'url', list: all.filter(e => e.url === q || e.archiveUrl === q) };
}
// Mục sau (cùng/sau thời điểm) phủ mục e qua chuỗi băm: bằng chứng bên thứ ba ở bất kỳ mục nào sau e cũng chứng minh e
const otsCover = (all, e, exists) => { for (const x of all) if (x.seq >= e.seq && stampable(x) && exists(otsPath(x))) return x; return null; };
export function evidenceReport(q, { file = REGISTRY, exists = p => fs.existsSync(p), canaryFile = 'content/protection/canaries.json' } = {}) {
  const all = readRegistry(file), v = verifyChain(all), lines = registryLines(file);
  const can = fs.existsSync(canaryFile) ? JSON.parse(fs.readFileSync(canaryFile, 'utf8')).canaries : [];
  const c0 = can.find(x => x.id === q), cg = c0 ? git('log', '--reverse', '--format=%H %cI %s', '-S', c0.q || c0.token, '--', `web/js/${c0.module}`).split('\n')[0] : '';
  const t = targets(q, all, can, cg ? new Date(cg.split(' ')[1]).toISOString() : ''), L = [];
  L.push(`# Bằng chứng tác quyền Lexkite: ${q}`, `Sổ băm: ${file} – ${v.ok ? `chuỗi hợp lệ, ${v.count} mục, head ${v.head}` : `HỎNG ở mục ${v.at}`}`);
  if (t.canary) {
    L.push(`Canary ${t.canary.id} (${t.canary.kind}): "${t.canary.q || t.canary.token}" trong web/js/${t.canary.module}`);
    const g = cg;
    if (g) L.push(`Commit cài canary: ${g}\n  ${REPO}/commit/${g.split(' ')[0]}`);
  }
  if (!t.list.length) L.push('- (chưa có mục sổ nào khớp)');
  for (const e of t.list) {
    L.push(`\n## Mục #${e.seq} ${e.type} lúc ${e.at}`, `- hash mục: ${e.hash}`);
    for (const k of ['url', 'publishedAt', 'htmlSha256', 'sourceSha256', 'root', 'files', 'version', 'commit', 'archiveUrl', 'doi']) if (e[k] != null) L.push(`- ${k}: ${e[k]}`);
    const o = otsCover(all, e, exists);
    L.push(o ? `- OpenTimestamps (Bitcoin): ${otsPath(o)} [${exists(otsPath(o)) && fs.existsSync(otsPath(o)) ? otsState(fs.readFileSync(otsPath(o))) : '?'}] mục #${o.seq}${o.seq !== e.seq ? ` (phủ qua chuỗi)` : ''} → node scripts/ots.mjs export ${o.seq}` : '- OpenTimestamps: chưa có (CI đóng dấu lần chạy tới)');
    const ts = coveringStamps(lines, e.seq, exists);
    L.push(ts ? `- Tem RFC 3161: ${ts.tsas.map(x => `${x.id} ${x.file}`).join(' · ')} (mục #${ts.entry.seq}) → node scripts/tsa.mjs verify ${e.seq}` : '- Tem RFC 3161: chưa có (CI đóng tem lần chạy tới)');
    const dep = all.filter(x => x.type === 'deposit' && x.seq >= e.seq)[0];
    L.push(dep ? `- Zenodo (restricted): DOI ${dep.doi} · ${dep.url} · root ${dep.root} (${dep.version})` : '- Zenodo: chưa có bản nộp sau mục này (cần ZENODO_TOKEN)');
    const wb = all.filter(x => x.type === 'archive' && e.url && x.url === e.url);
    L.push(wb.length ? wb.map(x => `- Wayback: ${x.archiveUrl}`).join('\n') : '- Wayback: chưa có bản lưu cho URL này');
    const sw = all.filter(x => x.type === 'swh' && /succeeded/.test(x.status) && x.seq >= e.seq)[0] || all.filter(x => x.type === 'swh').at(-1);
    if (sw) L.push(`- Software Heritage: ${sw.url} (yêu cầu #${sw.requestId}, ${sw.status}${sw.visitDate ? `, lưu ${sw.visitDate}` : ''})`);
    if (e.commit) L.push(`- Commit: ${REPO}/commit/${e.commit}`);
  }
  const m = q.startsWith('https://') && new URL(q).pathname.match(/^\/([a-z]{2})\/blog\/([^/]+)\/$/), src = m ? `content/blog/${m[1]}/${m[2]}.md` : null;
  if (src && fs.existsSync(src)) L.push(`\nLịch sử git nguồn ${src} (cũ nhất trước):\n` + git('log', '--follow', '--reverse', '--format=- %H %cI %s', '--', src) + `\nXem: ${REPO}/commits/main/${src}`);
  return L.join('\n');
}
