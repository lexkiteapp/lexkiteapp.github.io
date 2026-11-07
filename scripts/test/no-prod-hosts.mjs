// CI không chạm prod (sự cố 01/11: CI kéo media/audio thật → Workers 174k/100k, mọi /api chết – docs/CAPACITY.md §A5).
// Chặn: mọi workflow ci-filler có thể bơm (infra/ci-backlog.json, eligible) phải (1) chặn DNS host prod (.github/actions/no-prod hoặc dòng /etc/hosts),
// (2) mọi context Playwright trong script nó chạy đều gắn noProd() (media/audio → GitHub, /api → offline), (3) không gọi URL prod trong lệnh chạy.
// Ngoại lệ = PROBE dưới đây (prod có chủ ý, tần suất có trần). Kèm kiểm ánh xạ URL → GitHub (scripts/media/origin.mjs).
import assert from 'node:assert/strict'; import fs from 'node:fs';
import { githubCandidates, PROD_CDN, PROD_API, typeOf } from '../media/origin.mjs';

// Probe prod có chủ ý: workflow → { lý do, trần stale_hours tối thiểu trong sổ backlog }
export const PROBE = { 'lighthouse.yml': { why: 'Lighthouse/CWV phải đo site live (14 trang × 3 lượt ≈ 42 lượt tải/lượt, ≤ 1 lượt/ngày qua filler)', minStale: 24 } };
// Script tự kín (route '**/*' riêng + chặn DNS) – không cần noProd
export const HERMETIC = new Set(['scripts/test/journey-e2e.mjs', 'scripts/test/welcome-journey.mjs']);

// Workflow NGOÀI ci-filler được gọi URL prod (media/audio/api) – mỗi mục ghi lượt/ngày ước tính; thêm mục mới phải kèm số.
export const PROD_OK = {
  'i18n.yml': 'GET /api/i18nfix 1 lượt/đêm (cron 02:30)',
  'd1-usage-watch.yml': 'POST /api/capacity op usage 72 lượt/ngày (20 phút, sự cố D1 03/11 – số dòng đọc cho cầu dao)',
  'video.yml': 'STUDIO_API /api/studio – workflow đang tắt; vài lượt/clip khi bật',
  'vocab-img-scene.yml': 'kiểm CDN ảnh vừa đẩy ≤ 20 lượt/lượt × 8 lượt/ngày (quota_bound, filler không bơm)',
  'pages.yml': 'audio-cdn-check mẫu 150 tệp/lượt qua audio.lexkite.com (chỉ khi đổi âm thanh)',
};
const PROD_URL = /https:\/\/(media|audio)\.lexkite\.com|lexkite\.(com|pages\.dev)\/api/;
// Workflow được bỏ chặn DNS một host prod (kèm lý do + ước tính) – mọi workflow khác phải chặn đủ media + audio
export const DNS_EXCEPT = { 'ext-e2e.yml': { host: 'media.lexkite.com', why: 'ảnh do service worker add-on tải (không route được) ≈ 120 lượt/ngày' } };
const bad = [], wfText = f => fs.readFileSync('.github/workflows/' + f, 'utf8');
const stripComments = s => s.split('\n').filter(l => !/^\s*#/.test(l)).map(l => l.replace(/\s#\s.*$/, '')).join('\n');
const backlog = JSON.parse(fs.readFileSync('infra/ci-backlog.json', 'utf8')).entries.filter(e => e.eligible !== false);
for (const e of backlog) {
  const f = e.workflow, s = wfText(f), code = stripComments(s);
  if (PROBE[f]) { if (!((e.probe || {}).stale_hours >= PROBE[f].minStale)) bad.push(`${f}: probe prod phải có stale_hours ≥ ${PROBE[f].minStale}`); continue; }
  const jobs = code.split(/\n  [a-z0-9_-]+:\n/).slice(1).filter(j => /actions\/checkout@/.test(j));
  for (const j of jobs) {
    if (!/uses: \.\/\.github\/actions\/no-prod/.test(j) && !/etc\/hosts/.test(j)) { bad.push(`${f}: có job thiếu bước chặn prod (uses: ./.github/actions/no-prod)`); continue; }
    const hosts = (j.match(/hosts: '([^']+)'/) || [])[1]; // không ghi = mặc định chặn đủ
    if (hosts) for (const h of ['media.lexkite.com', 'audio.lexkite.com']) if (!hosts.includes(h) && (DNS_EXCEPT[f] || {}).host !== h) bad.push(`${f}: bỏ chặn ${h} không có trong DNS_EXCEPT`);
  }
  if (/https:\/\/(media|audio)\.lexkite\.com|lexkite\.(com|pages\.dev)\/api/.test(code)) bad.push(`${f}: lệnh chạy gọi URL prod`);
  for (const m of code.matchAll(/node (scripts\/[^\s"']+\.m?js)/g)) {
    const p = m[1]; if (HERMETIC.has(p) || !fs.existsSync(p)) continue;
    const src = fs.readFileSync(p, 'utf8'), ctxs = (src.match(/\.(newContext|launchPersistentContext)\(/g) || []).length;
    if (!ctxs) continue;
    if (!/from '\.\/lib\/no-prod\.mjs'/.test(src)) bad.push(`${p} (${f}): Playwright không import lib/no-prod.mjs`);
    const calls = (src.match(/await noProd\(/g) || []).length;
    if (calls < ctxs) bad.push(`${p} (${f}): ${ctxs} context nhưng ${calls} lượt noProd()`);
    if (/\.route\('\*\*\/\*'[\s\S]{0,600}?r\.continue\(\)/.test(src)) bad.push(`${p}: route '**/*' gọi continue() → vượt noProd; dùng fallback()`);
  }
}
// Mọi workflow: gọi URL prod trong lệnh chạy → phải nằm trong PROD_OK (kèm ước tính lượt) và không được là việc ci-filler
const filler = new Set(backlog.map(e => e.workflow));
for (const f of fs.readdirSync('.github/workflows').filter(f => /\.ya?ml$/.test(f))) {
  const hit = PROD_URL.test(stripComments(wfText(f)));
  if (hit && !PROD_OK[f] && !PROBE[f]) bad.push(`${f}: gọi URL prod – thêm vào PROD_OK kèm ước tính lượt/ngày, hoặc dùng GitHub/fixture (scripts/media/origin.mjs)`);
  if (PROD_OK[f] && filler.has(f)) bad.push(`${f}: trong PROD_OK nhưng ci-filler lại bơm`);
}
// Ánh xạ prod → GitHub (thứ tự dò như Worker)
assert.ok(PROD_CDN.test('https://media.lexkite.com/vimg/x') && PROD_CDN.test('https://audio.lexkite.com/audio/l/a.mp3') && !PROD_CDN.test('https://lexkite.com/'));
assert.ok(PROD_API.test('https://lexkite.com/api/hit') && PROD_API.test('https://www.lexkite.com/api/sync') && !PROD_API.test('https://lexkite.com/app/'));
assert.deepEqual(githubCandidates('https://audio.lexkite.com/audio/w/a.mp3').slice(-1), ['https://lexkiteapp.github.io/audio/w/a.mp3']);
assert.match(githubCandidates('https://audio.lexkite.com/audio/w/a.mp3')[0], /lexkite-media-2\/audio\/w\/a\.mp3$/);
assert.match(githubCandidates('https://media.lexkite.com/vimg/0123456789abcdef.avif')[0], /lexkite-media-4\/vimg\//);
assert.equal(githubCandidates('https://media.lexkite.com/m1/vimg/0123456789abcdef.webp')[0], 'https://lexkiteapp.github.io/lexkite-media/vimg/0123456789abcdef.webp');
assert.match(githubCandidates('https://media.lexkite.com/video/lesson_1/a-0a1b2c3d.mp4')[0], /releases\/download\/wv-lesson_1\/a-0a1b2c3d\.mp4$/);
assert.deepEqual(githubCandidates('https://media.lexkite.com/cine/a.mp4'), []);
assert.equal(githubCandidates('https://media.lexkite.com/library/clips/a.mp4').length, 1); assert.equal(typeOf('https://media.lexkite.com/x.vtt'), 'text/vtt; charset=utf-8');
if (bad.length) { console.error('✗ no-prod-hosts:\n  ' + bad.join('\n  ')); process.exit(1); }
console.log(`✓ no-prod-hosts: ${backlog.length} việc ci-filler – chặn prod + noProd đủ (probe: ${Object.keys(PROBE).join(', ')})`);
