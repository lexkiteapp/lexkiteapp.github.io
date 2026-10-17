// Test kho dựng video (scripts/video/library.mjs): tên chuẩn, chống trùng manifest, cổng QA, verify với fetch giả, báo cáo phủ,
// AI thị giác (diễn giải JSON) + gọi scripts/test/asset_check_test.py (hàm đo ảnh/clip/anatomy) nếu có Python + numpy.
import assert from 'assert/strict';
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { parseName, canonical, inferCanonical, stackedRel, writeRenderManifest, emptyManifest, upsertEntry, qaStatus, gitBlobSha, verifyEntry, coverage, repoBudget, visionVerdict, ROOT, parseVision, parseIdentity, runVisionChain, combineVision, judgeSheet, cfVisionProvider, CF_VISION, IDENTITY, IDENTITY_PROMPT } from '../video/library.mjs';

let n = 0;
const t = (name, fn) => { fn(); n++; };

t('tên chuẩn hợp lệ', () => {
  assert.deepEqual(parseName('chars/mia/dna.png'), { kind: 'char', who: 'mia', slot: 'dna' });
  assert.equal(parseName('chars/mia/expr-big-laugh.png').slot, 'expr-big-laugh');
  assert.deepEqual(parseName('clips/src/leo_nod_laugh_v3.mp4'), { kind: 'clip', who: 'leo', action: 'nod_laugh', version: 3, src: true });
  assert.deepEqual(parseName('clips/mia_idle.mp4'), { kind: 'clip', who: 'mia', action: 'idle', version: 1, src: false }); // bản stacked cho render
  assert.equal(stackedRel('clips/src/mia_idle.mp4'), 'clips/mia_idle.mp4');
  assert.deepEqual(parseName('rooms/office-01-day-9x16.png'), { kind: 'room', room: 'office-01', time: 'day', ratio: '9x16' });
  assert.equal(parseName('props/office-a/office-13.svg').ext, 'svg');
});
t('tên sai chuẩn bị chặn', () => {
  for (const bad of ['chars/Mia/dna.png', 'chars/mia/smile.png', 'clips/mia.mp4', 'clips/mia-idle.mp4', 'rooms/office-day.png', 'rooms/office-01-noon-9x16.png', 'props/x.png', 'clips/mia_idle.mov', '../etc/passwd']) assert.equal(parseName(bad), null, bad);
  assert.throws(() => canonical('room', { room: 'office', time: 'noon', ratio: '9x16' }));
  assert.equal(canonical('clip', { who: 'mia', action: 'talk_point', version: 2 }), 'clips/src/mia_talk_point_v2.mp4');
  assert.equal(inferCanonical('clips/ama_wave_thumbs.mp4'), 'clips/src/ama_wave_thumbs.mp4');
  assert.equal(inferCanonical('leo/neutral.png'), 'chars/leo/neutral.png');
  assert.equal(inferCanonical('clips/mia-idle-office.mp4'), null);
});
t('manifest chống trùng sha & ghi đè', () => {
  const m = emptyManifest(), e = (id, sha) => ({ id, file: id, sha256: sha, locations: { primary: null, backup: { status: 'pending' } } });
  upsertEntry(m, e('clips/mia_idle.mp4', 'a'));
  assert.throws(() => upsertEntry(m, e('clips/mia_idle_v2.mp4', 'a')), /trùng nội dung/);
  assert.throws(() => upsertEntry(m, e('clips/mia_idle.mp4', 'b')), /nội dung khác/);
  const x = upsertEntry(m, { ...e('clips/mia_idle.mp4', 'a'), qa: 95 }); // cùng sha → cập nhật, giữ vị trí lưu
  assert.equal(x.qa, 95); assert.equal(m.items.length, 1);
  upsertEntry(m, e('clips/mia_idle.mp4', 'b'), { replace: true });
  assert.equal(m.items[0].sha256, 'b');
});
t('cổng điểm QA', () => {
  assert.equal(qaStatus({ qa: 92 }), 'approved');
  assert.equal(qaStatus({ qa: 88, waiver: 'qa-log ✓' }), 'approved');
  assert.equal(qaStatus({ qa: 80, reserve: true }), 'reserve');
  assert.equal(qaStatus({ qa: 99, reject: true }), 'reject');
  assert.throws(() => qaStatus({ qa: 89 }), /--reserve/);
  assert.throws(() => qaStatus({ qa: null }), /chưa chấm/);
});
t('git blob sha', () => assert.equal(gitBlobSha(Buffer.alloc(0)), 'e69de29bb2d1d6434b8b29ae775ad8c2e48c5391'));
t('ngân sách repo media', () => {
  assert.deepEqual(repoBudget(100 << 20, 50 << 20), { after: 150 << 20, warn: false, block: false });
  assert.equal(repoBudget(690 << 20, 20 << 20).warn, true);
  assert.equal(repoBudget(940 << 20, 20 << 20).block, true);
});
t('AI thị giác: lỗi nào cũng FAIL, không có kết quả → SKIP', () => {
  assert.equal(visionVerdict({ hands_ok: true, limbs_ok: true, face_ok: true, extra_people: false, text_present: false, style_consistent: true, identity_consistent: true, issues: [] }).status, 'PASS');
  const v = visionVerdict({ hands_ok: false, limbs_ok: true, face_ok: true, extra_people: false, text_present: true, style_consistent: true, identity_consistent: false, issues: ['6 fingers'] });
  assert.equal(v.status, 'FAIL'); assert.ok(v.reasons.includes('identity drift') && v.reasons.includes('có chữ/watermark'));
  assert.equal(visionVerdict(null).status, 'SKIP');
});
t('báo cáo phủ', () => {
  const m = emptyManifest();
  m.items.push({ id: 'clips/mia_idle.mp4', kind: 'clip', who: 'mia', file: 'clips/mia_idle.mp4', tags: ['idle'], roles: ['listener'], status: 'approved', locations: {} });
  m.items.push({ id: 'rooms/office-01-day-9x16.png', kind: 'room', file: 'rooms/office-01-day-9x16.png', status: 'approved', locations: {} });
  m.items.push({ id: 'clips/leo_wave.mp4', kind: 'clip', who: 'leo', file: 'clips/leo_wave.mp4', tags: ['wave'], status: 'reject', locations: {} });
  const c = coverage(m);
  assert.equal(c.byChar.mia.clips, 1); assert.equal(c.byChar.leo.clips, 0);
  assert.ok(c.missing.clips.includes('mia_talk') && !c.missing.clips.includes('mia_idle'));
  assert.ok(c.missing.listener.includes('leo') && !c.missing.listener.includes('mia'));
  assert.ok(!c.missing.rooms.includes('office-day-9x16') && c.missing.rooms.includes('office-night-9x16'));
  assert.equal(c.counts.reject, 1);
});

t('manifest dựng (render.mjs): chỉ clip approved có stacked đạt + phòng có file & hồ sơ', () => {
  const tmp = fs.mkdtempSync(path.join(process.env.TMPDIR || '/tmp', 'lib-')), f = path.join(tmp, 'manifest.json');
  fs.writeFileSync(f, JSON.stringify({ clips: [{ id: 'mia_idle', outfit: 'party', facing: 'right' }], rooms: [], stills: [{ file: 'stills/x.png' }] }));
  const m = emptyManifest(), st = (o = {}) => ({ stacked: { file: 'x', status: 'PASS', foot: [300, 1500], figH: 1500, w: 600, h: 1520, ...o } });
  m.items.push({ id: 'clips/mia_idle.mp4', kind: 'clip', who: 'mia', file: 'clips/src/mia_idle.mp4', tags: ['idle'], roles: ['listener'], status: 'approved', variants: st(), locations: {} });
  m.items.push({ id: 'clips/leo_talk.mp4', kind: 'clip', who: 'leo', file: 'clips/src/leo_talk.mp4', tags: ['talk'], roles: ['speaker'], status: 'approved', variants: st({ status: 'FAIL', issues: ['FAIL stacked_mask: x'] }), locations: {} });
  m.items.push({ id: 'clips/ama_wave.mp4', kind: 'clip', who: 'ama', file: 'clips/src/ama_wave.mp4', roles: ['speaker'], status: 'approved', locations: {} });
  m.items.push({ id: 'clips/ama_nod.mp4', kind: 'clip', who: 'ama', file: 'clips/src/ama_nod.mp4', roles: ['listener'], status: 'reject', variants: st(), locations: {} });
  const probs = writeRenderManifest(m, f, rel => rel === 'clips/mia_idle.mp4');
  const rm = JSON.parse(fs.readFileSync(f, 'utf8'));
  const mia = rm.clips.find(c => c.id === 'mia_idle');
  assert.equal(mia.alpha, 'stacked'); assert.equal(mia.outfit, 'party'); assert.equal(mia.figH, 1500); assert.equal(mia.ready, true); assert.equal(mia.file, 'clips/mia_idle.mp4');
  assert.ok(!rm.clips.some(c => c.id === 'leo_talk' || c.id === 'ama_wave'), 'clip chưa có stacked đạt không được thêm');
  assert.ok(probs.some(p => /leo_talk.*FAIL/.test(p)) && probs.some(p => /stills\/x\.png/.test(p)));
  assert.equal(rm.stills.length, 1); assert.equal(rm.stills[0].ready, false); // danh mục giữ nguyên, chỉ đánh dấu
  fs.rmSync(tmp, { recursive: true });
});

// verify với fetch giả (bất đồng bộ)
const base = { id: 'chars/leo/dna.png', status: 'approved', sha256: 'S', bytes: 10, locations: { primary: { path: 'chars/leo/dna.webp', url: 'https://media.lexkite.com/library/chars/leo/dna.webp', sha256: 'W', gitSha: 'G', bytes: 5, srcSha: 'S' }, backup: { status: 'ok', objectId: '7' } } };
const deps = (o = {}) => ({ tree: new Map([['library/chars/leo/dna.webp', { sha: 'G' }]]), head: async () => ({ status: 200, length: '5' }), gcGet: async () => ({ id: 7, sha256: 'S', size: 10, status: 'ready' }), sha: async () => 'W', ...o });
const cases = [
  ['đủ 2 nơi', base, deps(), []],
  ['CDN 404', base, deps({ head: async () => ({ status: 404 }) }), ['primary: CDN trả 404']],
  ['repo khác sha', base, deps({ tree: new Map([['library/chars/leo/dna.webp', { sha: 'X' }]]) }), ['primary: sha trong repo khác manifest']],
  ['thiếu trong repo', base, deps({ tree: new Map() }), ['primary: không có trong repo lexkite-media']],
  ['CDN sai dung lượng', base, deps({ head: async () => ({ status: 200, length: '9' }) }), ['primary: CDN dung lượng 9 ≠ 5']],
  ['deep sha khác', base, deps({ deep: true, sha: async () => 'Z' }), ['primary: sha256 nội dung CDN khác']],
  ['GrabCast mất object', base, deps({ gcGet: async () => null }), ['backup: không thấy object 7 trên GrabCast']],
  ['GrabCast sai sha', base, deps({ gcGet: async () => ({ sha256: 'Q', size: 10 }) }), ['backup: sha256 khác']],
  ['backup chờ', { ...base, locations: { ...base.locations, backup: { status: 'pending', reason: 'pool_full' } } }, deps(), ['backup: pending (pool_full)']],
  ['clip chưa có stacked/gốc', { ...base, id: 'clips/leo_x.mp4', kind: 'clip', locations: { ...base.locations, primary: null } }, deps(), ['primary: chưa có bản stacked (workflow library-build)', 'src: bản gốc chưa lên library/src']],
  ['clip stacked + gốc đủ', { ...base, id: 'clips/leo_x.mp4', kind: 'clip', locations: { ...base.locations, src: { path: 'src/clips/src/leo_x.mp4', gitSha: 'O' } } }, deps({ tree: new Map([['library/chars/leo/dna.webp', { sha: 'G' }], ['library/src/clips/src/leo_x.mp4', { sha: 'O' }]]) }), []],
  ['reserve không cần nguồn chính', { ...base, status: 'reserve', locations: { primary: null, backup: { status: 'ok', objectId: '7' } } }, deps(), []],
  ['gốc đổi → bản web cũ', { ...base, sha256: 'S2' }, deps({ gcGet: async () => ({ sha256: 'S2', size: 10 }) }), ['primary: bản web cũ (gốc đã đổi) – chạy sync']],
];
for (const [name, e, d, want] of cases) assert.deepEqual(await verifyEntry(e, d), want, 'verify: ' + name), n++;

// manifest đã commit (nếu có) phải hợp chuẩn
const mf = path.join(ROOT, 'content/video/library.json');
if (fs.existsSync(mf)) {
  const m = JSON.parse(fs.readFileSync(mf, 'utf8')), ids = new Set(), shas = new Set();
  for (const e of m.items) {
    assert.ok(parseName(e.file), 'tên sai chuẩn trong manifest: ' + e.file);
    assert.ok(!ids.has(e.id) && !shas.has(e.sha256), 'trùng id/sha trong manifest: ' + e.id);
    ids.add(e.id); shas.add(e.sha256);
    assert.ok(['approved', 'reserve', 'reject'].includes(e.status), e.id);
    if (e.status === 'approved') assert.ok((e.qa ?? 0) >= 90 || e.waiver, 'approved thiếu qa ≥ 90/waiver: ' + e.id);
    if (e.status === 'approved') assert.notEqual((e.check || {}).status, 'FAIL', 'approved nhưng check FAIL: ' + e.id);
    assert.ok(!/AIza|ghp_|gho_|github_pat_/.test(JSON.stringify(e)), 'manifest chứa khoá/token: ' + e.id);
  }
  n++;
}

// ---- AI thị giác: schema chặt + chuỗi dự phòng 2 giám khảo (nhà cung cấp giả lập, không mạng) ----
{
  const BODY = { hands_ok: true, limbs_ok: true, face_ok: true, extra_people: false, text_present: false, style_consistent: true, issues: [] };
  const leoCells = hb => ({ cells: hb.map((h, i) => ({ cell: i + 1, hair_back: h, eyes: 'round black glasses', beard: 'beard' })) });
  assert.deepEqual(parseVision('```json\n' + JSON.stringify(BODY) + '\n```').hands_ok, true);
  assert.equal(parseVision('{"hands_ok": "yes"}'), null, 'sai kiểu → null');
  assert.equal(parseVision({ ...BODY, issues: undefined }), null, 'thiếu issues → null');
  assert.equal(parseVision('không phải JSON'), null);
  assert.equal(visionVerdict(parseVision('rác')).status, 'SKIP', 'không parse được → cần duyệt tay, không tự PASS');
  const drift = parseIdentity(leoCells(['short', 'short', 'long hanging', 'long hanging', 'short', 'short']), 'leo');
  assert.ok(drift.drift.length === 1 && /buộc đuôi/.test(drift.drift[0]), 'Leo buộc đuôi 2/5 khung → drift');
  assert.equal(parseIdentity(leoCells(['short', 'short', 'short', 'short', 'short', 'short']), 'leo').drift.length, 0);
  assert.equal(parseIdentity({ cells: [{ cell: 1, eyes: 'red glasses', streak: 'black with a grey streak' }, { cell: 2, eyes: 'no glasses', streak: 'black with a grey streak' }, { cell: 3, eyes: 'red glasses', streak: 'black with a grey streak' }] }, 'diane').drift.length, 0, 'kính bị che 1 khung (min 2) → chưa FAIL');
  assert.equal(parseIdentity({ cells: [{ cell: 1, eyes: 'maybe' }, { cell: 2, eyes: 'maybe' }] }, 'diane'), null, 'đáp án ngoài lựa chọn → null');
  assert.ok(Object.keys(IDENTITY).every(w => IDENTITY_PROMPT(w).includes('Choose one of')), 'prompt nhận diện có lựa chọn cho mọi nhân vật');

  const P = (name, fn) => ({ name, run: fn });
  const calls = [];
  const lic = P('cloudflare:llama-3.2', async () => { calls.push('l32'); throw Object.assign(new Error('cloudflare:llama-3.2: 403 AiError: Model Agreement'), { code: 5016 }); });
  const bad = P('grabcast', async () => { calls.push('gc'); return 'xin lỗi tôi không thể'; });
  const good = (name, body = BODY, head = leoCells(Array(6).fill('short'))) => P(name, async inp => { calls.push(name); return inp.prompt.includes('Choose one of') ? JSON.stringify(head) : JSON.stringify(body); });
  const input = { who: 'leo', body: { prompt: 'body', b64: 'AA' }, head: { prompt: IDENTITY_PROMPT('leo'), b64: 'BB' } };
  let r = await runVisionChain(input, {}, [lic, bad, good('gemini')]);
  assert.ok(r.v && r.provider === 'gemini' && r.license === true && r.tried.length === 2, 'giấy phép 5016 → bỏ qua, JSON sai → nhà kế tiếp');
  assert.deepEqual(calls, ['l32', 'gc', 'gemini', 'gemini']);
  r = await runVisionChain(input, {}, [lic, bad]); assert.equal(r.v, null, 'mọi nhà cung cấp hỏng → null');
  r = await runVisionChain(input, {}, [good('scout'), good('gemini')], ['scout']); assert.equal(r.provider, 'gemini', 'kiểm chéo bỏ nhà cung cấp đã chấm chính');
  const pass = { v: { ...BODY, identity_consistent: true }, provider: 'a' }, fail = { v: { ...BODY, identity_consistent: false, drift: ['x'] }, provider: 'b' };
  assert.equal(combineVision(pass, pass).status, 'PASS');
  assert.equal(combineVision(pass, fail).status, 'FAIL', 'một giám khảo FAIL → FAIL');
  assert.equal(combineVision(pass, { v: null }).status, 'SKIP', 'thiếu kiểm chéo → cần duyệt tay');
  assert.equal(combineVision({ v: null }, fail).status, 'FAIL');
  // judgeSheet đầu-cuối: chính PASS + kiểm chéo thấy buộc đuôi → FAIL; cả hai PASS → PASS; chéo hỏng → SKIP
  const hb = Buffer.from('body'), hh = Buffer.from('head');
  let j = await judgeSheet('leo', hb, hh, { primary: [good('scout')], cross: [lic, good('gemini', BODY, leoCells(['short', 'short', 'long hanging', 'short', 'short', 'short']))], cfToken: '', geminiKeys: () => [] }, { cache: false });
  assert.ok(j.status === 'FAIL' && j.reasons.some(x => /\[gemini\].*buộc đuôi/.test(x)), 'kiểm chéo bắt buộc đuôi 1 khung → FAIL');
  j = await judgeSheet('leo', hb, hh, { primary: [good('scout')], cross: [good('gemini')] }, { cache: false }); assert.equal(j.status, 'PASS');
  j = await judgeSheet('leo', hb, hh, { primary: [good('scout')], cross: [lic, bad] }, { cache: false }); assert.ok(j.status === 'SKIP' && /duyệt tay/.test(j.reasons[0]), 'chéo hỏng → cần duyệt tay');
  // Cloudflare REST: định dạng thân + lỗi giấy phép, token không lọt vào lỗi
  const sent = [];
  const fakeFetch = async (url, init) => { sent.push({ url, body: JSON.parse(init.body), auth: init.headers.Authorization }); return url.includes('llama-3.2') ? new Response(JSON.stringify({ success: false, errors: [{ code: 5016, message: 'Model Agreement: submit agree' }] }), { status: 403 }) : new Response(JSON.stringify({ success: true, result: { response: { ok: 1 } } }), { status: 200 }); };
  const out = await cfVisionProvider(CF_VISION.scout).run({ prompt: 'p', b64: 'QQ==' }, { fetch: fakeFetch, cfToken: 'cf_TOKEN_SECRET_123' });
  assert.deepEqual(out, { ok: 1 });
  assert.ok(sent[0].url.endsWith('/ai/run/@cf/meta/llama-4-scout-17b-16e-instruct') && sent[0].body.messages[0].content[1].image_url.url.startsWith('data:image/jpeg;base64,'), 'scout: messages + image_url');
  let err; try { await cfVisionProvider(CF_VISION.llama32).run({ prompt: 'p', b64: 'QQ==' }, { fetch: fakeFetch, cfToken: 'cf_TOKEN_SECRET_123' }); } catch (e) { err = e; }
  assert.ok(err && err.code === 5016 && !err.message.includes('cf_TOKEN_SECRET_123') && sent[1].body.image === 'QQ==', 'llama-3.2: image base64 + lỗi 5016');
  n++;
}

// hàm đo Python (bỏ qua có báo nếu máy không có numpy – CI chỉ chạy phần JS)
const py = [process.env.LEXKITE_PY, path.join(ROOT, '.tools/pyenv/bin/python'), 'python3'].filter(Boolean).find(p => spawnSync(p, ['-c', 'import numpy, PIL'], { stdio: 'ignore' }).status === 0);
if (py) {
  const r = spawnSync(py, [path.join(ROOT, 'scripts/test/asset_check_test.py')], { encoding: 'utf8', env: { ...process.env, MPLCONFIGDIR: path.join(process.env.TMPDIR || '/tmp', 'lexkite-mpl') } });
  process.stdout.write(r.stdout);
  if (r.status !== 0) { console.error(r.stderr.split('\n').slice(-8).join('\n')); process.exit(1); }
} else console.log('… bỏ qua asset_check_test.py (không có Python + numpy; cài: python3 -m venv .tools/pyenv && .tools/pyenv/bin/pip install numpy pillow mediapipe)');
console.log(`✓ library: ${n} nhóm kiểm (tên chuẩn, chống trùng, cổng QA, verify giả lập, phủ, AI thị giác)`);
