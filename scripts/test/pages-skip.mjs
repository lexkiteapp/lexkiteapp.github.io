#!/usr/bin/env node
// Cổng build Cloudflare Pages (docs/FREE-TIER.md §7): commit máy KHÔNG được quên [CF-Pages-Skip], và chỉ pages-deploy.yml được kích deploy.
//   1) mọi `git … commit … -m "…"` trong .github/workflows/*.yml có [CF-Pages-Skip] trong thông điệp
//   2) chỉ pages-deploy.yml (và preview-site.yml → dự án riêng lexkite-preview) dùng secret CF_PAGES_DEPLOY_HOOK / `wrangler pages deploy` – nơi khác gọi `gh workflow run pages-deploy.yml`
//   3) script trong scripts/ có `commit` phải gắn tag hoặc nằm trong EXTERNAL (commit vào kho KHÁC repo chính: media/footage)
//   4) scripts/pages/deploy.mjs decide()/isSite() đúng logic gom
import fs from 'node:fs'; import path from 'node:path'; import { decide, isSite, pickLast } from '../pages/deploy.mjs';
const TAG = '[CF-Pages-Skip]', WF = '.github/workflows';
// commit vào repo KHÁC (không phải lexkiteapp.github.io) → không kích build Pages
const EXTERNAL = new Set(['scripts/media/push.mjs', 'scripts/lib/media-store.mjs', 'scripts/blog-media.mjs', 'scripts/footage-backup.sh',
  'scripts/video/library.mjs', 'scripts/mergecheck.sh' /* gộp nhánh cục bộ, người chạy */, 'scripts/deploy-github.sh' /* cũ, IELTS Lexi */]);
let fail = 0; const bad = (m) => { console.error('✗ pages-skip: ' + m); fail = 1; };
const COMMIT = /\bcommit\b[^\n]*?\s-[a-zA-Z]*m\b/;
for (const f of fs.readdirSync(WF).filter(f => /\.ya?ml$/.test(f))) {
  const lines = fs.readFileSync(path.join(WF, f), 'utf8').split('\n');
  lines.forEach((l, i) => {
    if (/^\s*#/.test(l) || !/\bgit\b/.test(l) || !COMMIT.test(l)) return;
    if (!l.includes(TAG)) bad(`${WF}/${f}:${i + 1} commit thiếu ${TAG} – thêm vào thông điệp, cần lên site thì gọi pages-deploy.yml`);
  });
  if (f !== 'pages-deploy.yml') lines.forEach((l, i) => {
    if (/^\s*#/.test(l)) return;
    // ngoại lệ duy nhất: preview-site.yml deploy dự án RIÊNG lexkite-preview (không đụng build/quota dự án lexkite)
    if (f === 'preview-site.yml' && /--project-name lexkite-preview --branch preview\b/.test(l) && !/CF_PAGES_DEPLOY_HOOK/.test(l)) return;
    if (/CF_PAGES_DEPLOY_HOOK|wrangler[^\n]*pages\s+deploy/.test(l)) bad(`${WF}/${f}:${i + 1} tự deploy Pages – dùng: gh workflow run pages-deploy.yml -f reason=…`);
  });
}
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.name === 'node_modules' ? [] : e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
for (const f of walk('scripts').filter(f => /\.(m?js|sh)$/.test(f) && !f.startsWith('scripts/test/'))) {
  const s = fs.readFileSync(f, 'utf8');
  const hit = /git[^\n]*\bcommit\s+-[a-zA-Z]*m\b|'commit',\s*'-q?m'/.test(s);
  if (hit && !s.includes(TAG) && !EXTERNAL.has(f)) bad(`${f} commit vào git mà không có ${TAG} (hoặc thêm vào EXTERNAL nếu là kho khác)`);
}
// 4) logic gom
const now = Date.parse('2026-10-26T12:00:00Z'), ago = m => new Date(now - m * 60000).toISOString();
const t = (name, got, want) => { if (got !== want) bad(`decide: ${name} → ${got}, cần ${want}`); };
t('git+push bỏ (CF tự build)', decide({ mode: 'git', event: 'push', head: 'b', now }).act, 'none');
t('HEAD đã deploy', decide({ mode: 'hook', event: 'schedule', head: 'a', last: { hash: 'a', created: ago(500) }, changed: 3, now }).act, 'none');
t('không đổi tệp site', decide({ mode: 'git', event: 'schedule', head: 'b', last: { hash: 'a', created: ago(500) }, changed: 0, now }).act, 'none');
t('giãn cách chưa đủ', decide({ mode: 'hook', event: 'workflow_dispatch', head: 'b', last: { hash: 'a', created: ago(30) }, changed: 2, now }).act, 'none');
t('gấp bỏ giãn cách', decide({ mode: 'git', event: 'workflow_dispatch', urgent: true, head: 'b', last: { hash: 'a', created: ago(30) }, changed: 2, now }).act, 'hook');
t('đủ giãn cách', decide({ mode: 'git', event: 'schedule', head: 'b', last: { hash: 'a', created: ago(200) }, changed: 2, now }).act, 'hook');
t('build treo > 60 phút không chặn', decide({ mode: 'hook', event: 'schedule', head: 'b', last: { hash: 'a', created: ago(240), building: true }, changed: 1, now }).act, 'hook');
t('direct không cần giãn cách', decide({ mode: 'direct', event: 'push', head: 'b', last: { hash: 'a', created: ago(5) }, changed: 1, now }).act, 'direct');
t('force', decide({ mode: 'hook', event: 'workflow_dispatch', force: true, head: 'a', last: { hash: 'a', created: ago(1) }, changed: 0, now }).act, 'hook');
t('chế độ lạ → git', decide({ mode: 'xyz', event: 'push', head: 'b', now }).act, 'none');
// pickLast: bản github:push kẹt `queued` (đã tắt auto deploy) không được coi là "đang build" ở chế độ hook/direct
const dep = (hash, type, name, status) => ({ created_on: '2026-10-26T09:00:00Z', latest_stage: { name, status }, deployment_trigger: { type, metadata: { commit_hash: hash } } });
const ph = [dep('new', 'github:push', 'queued', 'idle'), dep('old', 'ad_hoc', 'deploy', 'success')];
t('pickLast hook bỏ push kẹt queued', (pickLast(ph, 'hook') || {}).hash, 'old');
t('pickLast direct bỏ push kẹt queued', (pickLast(ph, 'direct') || {}).hash, 'old');
t('pickLast git vẫn tính push đang chờ', (pickLast(ph, 'git') || {}).hash, 'new');
t('pickLast hook giữ hook đang build', (pickLast([dep('h', 'deploy_hook', 'build', 'active')], 'hook') || {}).building, true);
t('pickLast bỏ bản huỷ', (pickLast([dep('x', 'deploy_hook', 'deploy', 'canceled'), dep('y', 'deploy_hook', 'deploy', 'success')], 'hook') || {}).hash, 'y');
for (const [p, w] of [['web/js/app.js', true], ['content/blog/vi/a.md', true], ['docs/FREE-TIER.md', false], ['reports/seo/x.json', false],
  ['brand/library/cine/bank.json', false], ['scripts/build-blog.mjs', true], ['scripts/video/x.mjs', false], ['README.md', false], ['functions/api/x.js', true]])
  if (isSite(p) !== w) bad(`isSite(${p}) = ${!w}, cần ${w}`);
if (!fail) console.log('✓ pages-skip: commit máy đều có [CF-Pages-Skip], deploy chỉ qua pages-deploy.yml, logic gom đúng');
process.exit(fail);
