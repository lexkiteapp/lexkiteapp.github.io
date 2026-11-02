// media.lexkite.com + audio.lexkite.com tĩnh trên R2 (scripts/cdn/): luật lọc/kiểu/cache giữ đúng hành vi Worker cũ, gộp nguồn theo ưu tiên,
// luật zone không đè luật khác, workflow có cổng + concurrency + timeout. Không mạng.
import assert from 'node:assert/strict'; import fs from 'node:fs';
import { hosts, mediaPath, audioPath, vimgPath, videoAsset, typeFor, cacheFor, merge, diff, IMMUTABLE, LIBRARY_CC } from '../cdn/hosts.mjs';
import { RULES, REF, CORS, mergeRules, checkResponse, r2State, cacheHit } from '../cdn/cutover.mjs';
import { s3Secret, tokenId } from '../cdn/creds.mjs';

// 1) Lọc như workers/media (nhánh mặc định) + workers/audio
for (const [p, ok] of [['blog/p/ab12-480.avif', true], ['blog/cover.webp', true], ['library/clips/a_v2.mp4', true], ['library/index.json', true],
  ['cine/anchor/x.mp4', false], ['blog/x.json', false], ['README.md', false], ['index.html', false], ['vimg/0123456789abcdef.webp', false], ['video/x/y.mp4', false], ['a/../b.png', false]]) assert.equal(mediaPath(p), ok, p);
for (const [p, ok] of [['audio/l/abc-s2.mp3', true], ['audio/w/en-GB/apple.mp3', true], ['audio/l/x.wav', false], ['404.html', false]]) assert.equal(audioPath(p), ok, p);
assert.ok(vimgPath('vimg/0123456789abcdef@2x.avif') && !vimgPath('vimg/0123.webp'));
assert.ok(videoAsset('wv-lesson_01', 'clip-0a1b2c3d.mp4') && !videoAsset('ota-1', 'clip-0a1b2c3d.mp4') && !videoAsset('wv-lesson_01', 'master.mov'));
// 2) Kiểu + cache theo đối tượng (Cache Rule tôn trọng Cache-Control gốc)
assert.equal(typeFor('audio/l/a.mp3'), 'audio/mpeg'); assert.equal(typeFor('video/a/b-0a1b2c3d.vtt'), 'text/vtt; charset=utf-8'); assert.equal(typeFor('x.JPG'), 'image/jpeg');
assert.equal(cacheFor('library/index.json'), LIBRARY_CC); assert.equal(cacheFor('blog/p/a.avif'), IMMUTABLE); assert.match(IMMUTABLE, /max-age=31536000, immutable/);
// 3) Nguồn theo media-repos: kho mới nhất trước; kho audio planned không dò; kho mới open → đứng đầu
const cfg = { repos: [{ id: 'm1', repo: 'o/m1', kinds: ['img'], state: 'full' }, { id: 'm2', repo: 'o/m2', kinds: ['audio'], state: 'open' }, { id: 'm3', repo: 'o/m3', kinds: ['audio'], state: 'planned' }, { id: 'm4', repo: 'o/m4', kinds: ['img'], state: 'open' }] };
let H = hosts(cfg);
assert.deepEqual(H.audio.sources.map(s => s.repo), ['o/m2']);
assert.deepEqual(H.media.sources.slice(0, 2).map(s => s.id), ['m4', 'm1']);
assert.equal(H.media.sources.find(s => s.id === 'm4-direct').map('vimg/0123456789abcdef.webp'), 'm4/vimg/0123456789abcdef.webp');
cfg.repos[2].state = 'open'; H = hosts(cfg); assert.deepEqual(H.audio.sources.map(s => s.repo), ['o/m3', 'o/m2']);
assert.equal(H.media.hostname, 'media.lexkite.com'); assert.equal(H.audio.hostname, 'audio.lexkite.com');
// 4) Gộp: nguồn trước thắng (= Worker trả bản 200 đầu tiên); diff chỉ khoá mới/đổi, không xoá
const m = merge([[{ key: 'vimg/a', ver: 'new' }], [{ key: 'vimg/a', ver: 'old' }, { key: 'vimg/b', ver: '1' }]]);
assert.equal(m.get('vimg/a').ver, 'new'); assert.equal(m.size, 2);
assert.deepEqual(diff(m, { 'vimg/a': 'new', 'vimg/gone': 'x' }).map(x => x.key), ['vimg/b']);
// 5) Luật zone: giữ luật khác, thay luật của mình, bỏ trường chỉ-đọc
const cur = [{ id: '1', version: '3', ref: 'other', expression: 'true', action: 'block' }, { id: '2', ref: REF + 'cache', expression: 'old' }];
const out = mergeRules(cur, RULES.http_request_cache_settings);
assert.equal(out.length, 2); assert.deepEqual(out[0], { ref: 'other', expression: 'true', action: 'block' }); assert.equal(out[1].action, 'set_cache_settings');
for (const r of Object.values(RULES).flat()) assert.ok(r.ref.startsWith(REF) && /media\.lexkite\.com/.test(r.expression), r.ref);
assert.ok(RULES.http_request_cache_settings[0].expression.includes('audio.lexkite.com'));
assert.deepEqual(RULES.http_request_cache_settings[0].action_parameters.edge_ttl, { mode: 'respect_origin' });
const hdr = RULES.http_response_headers_transform[0].action_parameters.headers;
assert.equal(hdr['Access-Control-Allow-Origin'].value, '*'); assert.equal(hdr['X-Content-Type-Options'].value, 'nosniff');
assert.match(RULES.http_response_headers_transform[1].action_parameters.headers['Content-Security-Policy'].value, /sandbox/);
assert.deepEqual(CORS.rules[0].allowed.methods, ['GET', 'HEAD']); assert.ok(CORS.rules[0].exposeHeaders.includes('Content-Range'));
// 6) Kiểm phản hồi thật (verify): Range 206 + Content-Range, kiểu, cache, CORS
const res = (status, h) => ({ status, headers: new Headers(h) });
assert.deepEqual(checkResponse('library/a.mp4', res(206, { 'content-type': 'video/mp4', 'cache-control': LIBRARY_CC, 'access-control-allow-origin': '*', 'content-range': 'bytes 0-99/5000' }), { range: true }), []);
assert.deepEqual(checkResponse('audio/l/a.mp3', res(200, { 'content-type': 'audio/mpeg', 'cache-control': 'max-age=60' })), ['cache max-age=60', 'CORS']);
// 7) R2 chưa bật / thiếu quyền → trung tính (không ném), đã bật → on
assert.equal(r2State({ ok: true, j: { success: true } }), 'on');
assert.equal(r2State({ ok: false, j: { errors: [{ code: 10042, message: 'Please enable R2 through the Cloudflare Dashboard.' }] } }), 'off');
assert.equal(r2State({ ok: false, j: { errors: [{ code: 10000, message: 'Authentication error' }] } }), 'noperm');
// 8) Khoá S3 suy từ token: id + sha256(giá trị) (tài liệu R2)
assert.equal(s3Secret('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
assert.equal(await tokenId('t', async u => ({ ok: !u.includes('/user/'), json: async () => (u.includes('/user/') ? { success: false } : { success: true, result: { id: 'tid' } }) })), 'tid');
// 9) Workflow: kiểm R2 trước, dùng secret có sẵn, mọi bước sau gắn điều kiện r2 == on; concurrency xếp hàng, timeout; switch có verify
const wf = fs.readFileSync('.github/workflows/cdn-mirror.yml', 'utf8');
assert.match(wf, /concurrency: \{ group: cdn-mirror, cancel-in-progress: false \}/); assert.match(wf, /timeout-minutes: \d+/);
assert.match(wf, /secrets\.CLOUDFLARE_API_TOKEN/); assert.match(wf, /cutover\.mjs check/); assert.match(wf, /switch --host "\$HOST" && sleep 30 && node scripts\/cdn\/cutover\.mjs verify/);
for (const step of wf.split('\n      - ').slice(1).filter(x => /mirror\.mjs|creds\.mjs|cutover\.mjs (prepare|switch|\"\$ACTION)/.test(x))) assert.match(step, /steps\.check\.outputs\.r2 == 'on'/, step.slice(0, 60));
assert.ok(JSON.parse(fs.readFileSync('infra/jobs.json', 'utf8')).jobs.some(j => j.workflow === 'cdn-mirror.yml'));
// 10) switch: gắn R2 lỗi → quay lại Worker ngay (không để tên miền trống)
const cut = fs.readFileSync('scripts/cdn/cutover.mjs', 'utf8'); assert.match(cut, /catch \(e\) \{ summary\([^)]*quay lại Worker`\); await rollback\(h\); throw e; \}/);
// 11) main-guard theo realpath: gọi qua symlink (/tmp → /private/tmp) vẫn chạy khối main – hồi quy 02/11 (switch im lặng)
{ const { isMain } = await import('../lib/is-main.mjs'); const os = await import('node:os'), path = await import('node:path'), url = await import('node:url');
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'im-')), f = path.join(d, 'a.mjs'), l = path.join(d, 'link'); fs.writeFileSync(f, ''); fs.symlinkSync(d, l);
  assert.ok(isMain(url.pathToFileURL(fs.realpathSync(f)).href, path.join(l, 'a.mjs'))); assert.ok(!isMain(url.pathToFileURL(f).href, path.join(d, 'b.mjs'))); assert.ok(!isMain(url.pathToFileURL(f).href, undefined));
  for (const p of ['scripts/cdn/cutover.mjs', 'scripts/cdn/creds.mjs']) assert.match(fs.readFileSync(p, 'utf8'), /if \(isMain\(import\.meta\.url\)\)/, p); }
// 12) đo cache bằng GET: HIT/STALE/REVALIDATED đạt; DYNAMIC (HEAD/không cache), MISS, BYPASS, thiếu header → không đạt
assert.ok(cacheHit('HIT') && cacheHit('REVALIDATED') && cacheHit('STALE')); assert.ok(!cacheHit('DYNAMIC') && !cacheHit('MISS') && !cacheHit('BYPASS') && !cacheHit(null));
{ const cut = fs.readFileSync('scripts/cdn/cutover.mjs', 'utf8'); assert.doesNotMatch(cut, /method: 'HEAD'/); assert.match(cut, /r3 = await get\(\)/); }
console.log('cdn-r2: OK');
