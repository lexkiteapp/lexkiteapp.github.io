// Audit tổng – gom shard + giám khảo + trạng thái native → bảng duy nhất SCORE.md + latest.json + items/*.md (đẩy lên nhánh audit-report), so với lần trước.
// Dùng: node scripts/audit/report.mjs <thư-mục-đo> <thư-mục-ra> [latest.json lần trước]. Đỏ khi < 90 % mục đo được (workflow không được xanh giả).
import fs from 'node:fs';
import path from 'node:path';
import { nativeItems } from './items.mjs';
import { buildReport, toMarkdown, itemMd, mergeRaw } from './score.mjs';

const [DIR, OUT, PREV] = [process.argv[2] || 'out/audit', process.argv[3] || 'out/audit-pub', process.argv[4]];
const nativeCi = async () => { // kết luận mới nhất của workflow native trên main (không có token → chưa đo)
  if (!process.env.GITHUB_TOKEN) return null;
  const get = async f => { const r = await fetch(`https://api.github.com/repos/${process.env.GITHUB_REPOSITORY}/actions/workflows/${f}/runs?branch=main&status=completed&per_page=1`, { headers: { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } }).catch(() => null); const j = r && r.ok ? await r.json() : null; return j && j.workflow_runs[0] ? j.workflow_runs[0].conclusion === 'success' : null; };
  const [a, b] = await Promise.all([get('native-ios.yml'), get('native-android.yml')]);
  return a == null || b == null ? null : a && b;
};
const all = fs.readdirSync(DIR).filter(f => /^items-.*\.json$/.test(f)).flatMap(f => JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'))), ci = await nativeCi();
const raws = [...mergeRaw(DIR, all), ...nativeItems('.').map(n => ({ ...n, ci }))];
const beautyF = path.join(DIR, 'beauty.json'), beauty = fs.existsSync(beautyF) ? JSON.parse(fs.readFileSync(beautyF, 'utf8')) : {};
for (const r of raws) if (beauty[r.id]) r.beauty = beauty[r.id];
const prev = PREV && fs.existsSync(PREV) ? JSON.parse(fs.readFileSync(PREV, 'utf8')) : null;
const R = buildReport(raws, prev, { at: new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC', sha: process.env.GITHUB_SHA || 'local', run: process.env.GITHUB_RUN_ID || '' });
fs.mkdirSync(path.join(OUT, 'items'), { recursive: true }); fs.mkdirSync(path.join(OUT, 'runs'), { recursive: true });
fs.writeFileSync(path.join(OUT, 'latest.json'), JSON.stringify(R)); fs.writeFileSync(path.join(OUT, 'SCORE.md'), toMarkdown(R));
fs.writeFileSync(path.join(OUT, `runs/${R.at.slice(0, 10)}-${String(R.sha).slice(0, 7)}.json`), JSON.stringify({ at: R.at, sha: R.sha, summary: R.summary, items: R.items.map(i => ({ id: i.id, score: i.score })) }));
for (const i of R.items) fs.writeFileSync(path.join(OUT, 'items', i.id.replace(/[^\w.-]+/g, '_') + '.md'), itemMd(i));
const web = all.length, got = raws.filter(r => r.kind !== 'native' && r.variants && r.variants.length).length;
console.log(`Audit: TB ${R.summary.avg} · ${R.summary.scored}/${R.summary.items} có điểm · đo được ${got}/${web}`);
if (!process.env.AUDIT_ONLY && got < web * .9) { console.error(`✗ chỉ đo được ${got}/${web} mục – kết quả không đủ tin`); process.exit(1); }
