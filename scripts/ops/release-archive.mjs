// Giữ 3 bản phát hành đã ký gần nhất của mỗi loại (AAB Play · IPA iOS · zip add-on) trên Kho Drive: 2 bản / 2 Drive + sha256 trong infra/backups/releases.json.
//   node scripts/ops/release-archive.mjs [--keep 3] [--manifest infra/backups/releases.json] [--out out/release-archive] [--only android-aab,ios-ipa,addon-zip] [--dry-run]
// Nguồn: artifact của lượt chạy THÀNH CÔNG gần nhất của workflow tương ứng (GitHub API, GITHUB_TOKEN quyền actions:read). Bản đã lưu (run id) không tải lại. Artifact hết hạn → bỏ qua.
// Dùng khi cửa hàng cần quay về bản cũ: docs/ROLLBACK.md §Ứng dụng & add-on.
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { arg, loadJson, saveJson, summary, sha256File, uploadTwoCopies, pruneOld, alert, QUOTA } from './lib.mjs';

export const SOURCES = [
  { kind: 'android-aab', wf: 'android.yml', art: 'lexkite-play-aab', rx: /\.aab$/, label: (f, run) => { const m = f.match(/lexkite-([\d.]+)-(\d+)\.aab$/); return { version: m && m[1], build: m && +m[2], name: f }; } },
  { kind: 'ios-ipa', wf: 'ios-testflight.yml', art: 'lexkite-ios-ipa', rx: /\.ipa$/, label: (f, run) => { const m = f.match(/lexkite-([\d.]+)-(\d+)\.ipa$/); return { version: m && m[1], build: m ? +m[2] : run.run_number, name: f }; } },
  { kind: 'addon-zip', wf: 'cws-publish.yml', art: 'lexkite-extension-zip', rx: /\.zip$/, label: (f, run, abs) => { let v = null; try { v = JSON.parse(execFileSync('unzip', ['-p', abs, 'manifest.json'], { encoding: 'utf8' })).version; } catch { /* zip lạ */ } return { version: v, build: run.run_number, name: `lexkite-addon-${v || 'x'}-run${run.run_number}.zip` }; } },
];
const REPO = process.env.GITHUB_REPOSITORY || 'lexkiteapp/lexkiteapp.github.io', TOK = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '';
const gh = async (p, o = {}) => { const r = await fetch(p.startsWith('http') ? p : `https://api.github.com/repos/${REPO}${p}`, { redirect: o.raw ? 'follow' : 'manual', headers: { Authorization: 'Bearer ' + TOK, Accept: 'application/vnd.github+json', 'User-Agent': 'lexkite-release-archive' } }); return r; };

async function main() {
  const A = process.argv.slice(2), KEEP = +arg(A, 'keep', 3), MAN = path.resolve(arg(A, 'manifest', 'infra/backups/releases.json')), OUT = path.resolve(arg(A, 'out', 'out/release-archive'));
  const only = arg(A, 'only', '') ? new Set(arg(A, 'only').split(',')) : null, DRY = A.includes('--dry-run');
  if (!TOK) { console.error('Thiếu GITHUB_TOKEN'); return 2; }
  const man = loadJson(MAN, { version: 1, keep: KEEP, kinds: {} }); man.keep = KEEP; fs.mkdirSync(OUT, { recursive: true });
  let added = 0, failed = 0; const lines = [];
  for (const s of SOURCES.filter(x => !only || only.has(x.kind))) {
    const list = man.kinds[s.kind] || (man.kinds[s.kind] = []), have = new Set(list.map(x => x.run));
    const rr = await (await gh(`/actions/workflows/${s.wf}/runs?status=success&per_page=20`)).json().catch(() => ({}));
    const runs = (rr.workflow_runs || []).slice(0, 12);
    let taken = 0;
    for (const run of runs) {
      if (taken >= KEEP) break;
      const arts = ((await (await gh(`/actions/runs/${run.id}/artifacts`)).json().catch(() => ({}))).artifacts || []).filter(a => a.name === s.art && !a.expired);
      if (!arts.length) continue;
      taken++; if (have.has(run.id)) continue;
      if (DRY) { lines.push(`- (thử) ${s.kind}: run #${run.run_number} sẽ được lưu`); continue; }
      try {
        const dir = path.join(OUT, s.kind + '-' + run.id); fs.mkdirSync(dir, { recursive: true });
        const loc = (await gh(`/actions/artifacts/${arts[0].id}/zip`)).headers.get('location'); if (!loc) throw new Error('không lấy được link artifact');
        const z = path.join(dir, 'a.zip'); fs.writeFileSync(z, Buffer.from(await (await fetch(loc)).arrayBuffer()));
        execFileSync('unzip', ['-q', '-o', z, '-d', path.join(dir, 'x')]);
        const f = fs.readdirSync(path.join(dir, 'x')).find(n => s.rx.test(n)); if (!f) throw new Error('artifact không có file ' + s.rx);
        const abs = path.join(dir, 'x', f), L = s.label(f, run, abs), final = path.join(dir, L.name); fs.renameSync(abs, final);
        const sha = sha256File(final), size = fs.statSync(final).size;
        const copies = await uploadTwoCopies(final, { name: L.name, folder: 'releases/' + s.kind, sha, assetId: `release:${s.kind}:${run.id}` });
        list.unshift({ run: run.id, run_number: run.run_number, version: L.version, build: L.build, name: L.name, sha256: sha, size, commit: run.head_sha, at: run.updated_at, copies });
        list.sort((a, b) => b.run_number - a.run_number); added++;
        lines.push(`- ✓ ${s.kind}: ${L.name} (${(size / 1e6).toFixed(1)} MB, sha256 ${sha.slice(0, 12)}…, ${copies.length} bản)`);
        fs.rmSync(dir, { recursive: true, force: true });
      } catch (e) { if (QUOTA.test(String(e.code))) { lines.push('- ⏸ cầu dao D1: dừng, lượt sau tiếp tục'); saveJson(MAN, man); summary('### release-archive\n' + lines.join('\n')); return 0; } failed++; lines.push(`- ✗ ${s.kind} run #${run.run_number}: ${e.message}`); }
    }
    const dropped = DRY ? [] : await pruneOld(list, KEEP); man.kinds[s.kind] = list.slice(0, KEEP); if (dropped.length) lines.push(`- ${s.kind}: bỏ ${dropped.length} bản cũ (giữ ${KEEP})`);
  }
  if (!DRY) { man.updated = new Date().toISOString(); saveJson(MAN, man); }
  summary('### release-archive\n' + (lines.join('\n') || '- không có bản mới'));
  if (failed) { await alert('backup_rel', false, `Lưu bản phát hành: ${failed} lỗi`); return 1; }
  return 0;
}
if (process.argv[1] && process.argv[1].endsWith('release-archive.mjs')) main().then(c => process.exit(c)).catch(async e => { console.error('✗ ' + e.message); await alert('backup_rel', false, 'release-archive: ' + e.message); process.exit(1); });
