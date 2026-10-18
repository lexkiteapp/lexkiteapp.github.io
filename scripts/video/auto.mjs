// Video tự động (docs/VIDEO-PIPELINE.md §12): kho kịch bản khuôn content/video/auto/<khuôn>--<slug>.vars.json → fill → lint (cùng cổng tĩnh của render)
// → Studio ciCreate (chặn trùng nguồn, công tắc Tự động, hạn mức/ngày, tồn đọng chờ duyệt) → gọi video.yml (job_id) → dựng + QA → chờ admin chấm knowledge/share.
// Dùng: node scripts/video/auto.mjs [--check] [--dry-run] [--force] [--n 1] [--only <khuôn--slug>]
//   --check   chỉ lint toàn bộ kho (npm test / CI), lỗi → exit 1
//   --dry-run lint + in thứ tự sẽ chọn, không gọi Studio
// env: STUDIO_API (mặc định https://lexkite.com/api/studio) · STUDIO_CALLBACK_SECRET · GITHUB_TOKEN + GITHUB_REPOSITORY (gọi video.yml) · AUTO_REF (mặc định main)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fill, loadTemplate, loadCtx, preflight, failed } from './template.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
// kho = kịch bản viết riêng cho kênh + các ví dụ của khuôn (đã dựng mẫu 75/75 trên CI)
export const DIRS = [path.join(ROOT, 'content/video/auto'), path.join(ROOT, 'content/video/templates/examples')];
const API = process.env.STUDIO_API || 'https://lexkite.com/api/studio';

// Kho: [{ source, template, file }] – xếp xen kẽ theo khuôn (mỗi ngày bắt đầu từ khuôn khác) để kênh không ra 3 video cùng thể loại liền nhau
export function bank(dirs = DIRS, day = Math.floor(Date.now() / 864e5)) {
  const seen = new Set(), items = [];
  for (const dir of [].concat(dirs)) if (fs.existsSync(dir)) for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.vars.json')).sort()) {
    const source = f.replace(/\.vars\.json$/, ''); if (seen.has(source)) continue; seen.add(source);
    items.push({ source, template: source.split('--')[0], file: path.join(dir, f) });
  }
  items.sort((a, b) => a.source.localeCompare(b.source));
  const groups = [...new Set(items.map(x => x.template))].sort().map(t => items.filter(x => x.template === t));
  const rot = groups.length ? day % groups.length : 0, g = [...groups.slice(rot), ...groups.slice(0, rot)], out = [];
  for (let i = 0; g.some(x => x[i]); i++) for (const x of g) if (x[i]) out.push(x[i]);
  return out;
}

// fill + lint 1 mục → { ok, out, errs }
export function prepare(item, ctx = loadCtx()) {
  try {
    if (!/^[a-z0-9-]{1,40}--[a-z0-9-]{1,60}$/.test(item.source)) return { ok: false, errs: ['tên file phải dạng <khuôn>--<slug>.vars.json (a-z0-9-)'] };
    const out = fill(loadTemplate(item.template), JSON.parse(fs.readFileSync(item.file, 'utf8')));
    const bad = failed(preflight(out, ctx));
    return { ok: !bad.length, out, errs: bad.map(x => `${x.k}: ${x.note}`) };
  } catch (e) { return { ok: false, errs: [String(e.message || e)] }; }
}

async function studio(body) {
  const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Studio-Secret': process.env.STUDIO_CALLBACK_SECRET || '' }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  return { status: r.status, ...j };
}
async function dispatch(jobId) {
  const tok = process.env.GITHUB_TOKEN, repo = process.env.GITHUB_REPOSITORY;
  if (!tok || !repo) throw new Error('thiếu GITHUB_TOKEN/GITHUB_REPOSITORY để gọi video.yml');
  const r = await fetch(`https://api.github.com/repos/${repo}/actions/workflows/video.yml/dispatches`, { method: 'POST', headers: { Authorization: 'Bearer ' + tok, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'Content-Type': 'application/json', 'User-Agent': 'lexkite-auto' }, body: JSON.stringify({ ref: process.env.AUTO_REF || 'main', inputs: { job_id: jobId } }) });
  if (r.status !== 204) throw new Error(`gọi video.yml lỗi HTTP ${r.status}: ${(await r.text()).slice(0, 200)}`);
}
const summary = s => { console.log(s); if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, s + '\n'); };

async function main(a) {
  const has = k => a.includes('--' + k), opt = k => { const i = a.indexOf('--' + k); return i >= 0 ? a[i + 1] : undefined; };
  const ctx = loadCtx(); let list = bank();
  if (opt('only')) list = list.filter(x => x.source === opt('only'));
  if (!list.length) { summary('⚠️ kho video tự động trống' + (opt('only') ? ` / không có ${opt('only')}` : '')); return has('check') || opt('only') ? 1 : 0; }
  if (has('check') || has('dry-run')) {
    let bad = 0;
    list.forEach((x, i) => { const p = prepare(x, ctx); if (!p.ok) bad++; console.log(`${p.ok ? '✓' : '✗'} ${String(i + 1).padStart(2)} ${x.source}${p.ok ? '' : '\n     ' + p.errs.join('\n     ')}`); });
    console.log(`${bad ? '✗' : '✓'} kho video tự động: ${list.length - bad}/${list.length} kịch bản qua cổng tĩnh`);
    return bad ? 1 : 0;
  }
  if (!process.env.STUDIO_CALLBACK_SECRET) { summary('✗ thiếu secret STUDIO_CALLBACK_SECRET'); return 1; }
  const want = Math.max(1, Math.min(5, +(opt('n') || 1))); let made = 0, skipped = [];
  for (const x of list) {
    if (made >= want) break;
    const p = prepare(x, ctx);
    if (!p.ok) { skipped.push(`${x.source} (${p.errs[0]})`); continue; }
    const r = await studio({ op: 'ciCreate', source: x.source, topic: p.out.topic, script: p.out.script, force: has('force') });
    if (r.exists) continue; // đã làm (mọi trạng thái) – sang mục kế
    if (r.status === 409) { summary(`⏸ Studio chưa nhận thêm: ${r.error}${r.error === 'backlog' ? ` (${r.pending}/${r.backlog} video đang chờ duyệt – vào Quản trị → Video Studio chấm)` : r.error === 'auto-off' ? ' (bật công tắc Tự động trong Video Studio, hoặc chạy tay với force)' : r.error === 'quota' ? ` (đã đủ ${r.quota}/ngày)` : ''}`); break; }
    if (r.status !== 200 || !r.job) { summary(`✗ ciCreate ${x.source}: HTTP ${r.status} ${r.error || ''} ${(r.errs || []).join(' · ')}`); return 1; }
    await dispatch(r.job.id);
    summary(`▶ ${x.source} → job ${r.job.id} (${p.out.topic}) – đã gọi video.yml`); made++;
  }
  if (skipped.length) summary(`⚠️ bỏ qua vì trượt lint: ${skipped.join(' · ')}`);
  if (!made) summary('Không tạo job mới' + (list.length ? ' (kho đã dùng hết hoặc Studio đang chặn)' : ''));
  const left = list.length; summary(`Kho: ${left} kịch bản (đã dùng được Studio đánh dấu, không tạo lại).`);
  return skipped.length && !made ? 1 : 0;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).then(c => process.exit(c), e => { console.error('✗ auto: ' + e.message); process.exit(1); });
}
