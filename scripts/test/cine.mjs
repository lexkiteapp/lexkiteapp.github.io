// Test chế độ video cine (docs/VIDEO-PIPELINE.md §13) – nhanh (< 2 s), KHÔNG mạng, không ffmpeg/MediaPipe:
// planner (shot list, khung đầu, trang phụ đề, thán từ, ước credit) · cổng 1–7 trên số đo giả lập (gồm các lỗi pilot 19/10) ·
// driver Kling (JWT, ánh xạ endpoint, poll, không lộ khoá) với fetch giả · AI thị giác (parse JSON) · assembler (chọn vị trí chữ tránh mặt – chỉ khi có Python+PIL).
// Chạy: node scripts/test/cine.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import * as P from '../video/cine/planner.mjs';
import * as G from '../video/cine/gates.mjs';
import { jwt, authHeader, klingDriver, scrub } from '../video/cine/providers/kling.mjs';
import { parseCineVision } from '../video/cine/vision.mjs';

let fails = 0, n = 0; const ok = (c, m) => { n++; if (!c) { fails++; console.log('✗', m); } };
const R = new URL('../../', import.meta.url), J = f => JSON.parse(fs.readFileSync(new URL(f, R), 'utf8'));
const cast = J('content/video/cine/cast.json'), scenes = J('content/video/cine/scenes.json'), casting = J('content/video/casting.json'), pricing = J('content/video/cine/pricing.json');
const ctx = { cast, scenes, casting };

// ---------- planner ----------
const cine = J('content/video/cine/scripts/polite-request--could-i-get.json');
const p = P.plan(cine, { ...ctx, sample: J(cine.source) });
ok(!p.errors.length, 'latte: planner không lỗi ' + p.errors.join(' · '));
ok(p.shots.length === 5 && Object.keys(p.frames).length === 4, 'latte: 5 shot, 4 khung đầu (2 cận dùng chung khung)');
ok(p.shots[1].frame === p.shots[3].frame && p.shots[1].frame === 'mcu-customer#a', 'shot cùng blocking + variant dùng chung 1 khung đầu');
ok(p.frames['mcu-customer#a'].refs.some(r => r.kind === 'frame' && r.frame === 'two-shot-counter#a'), 'khung cận lấy khung 2 người làm ảnh tham chiếu (giữ bối cảnh)');
ok(p.frames['two-shot-counter#a'].refs.map(r => r.kind).join() === 'room,char,char' && /<<<image_1>>>/.test(p.frames['two-shot-counter#a'].prompt) && /<<<image_3>>>/.test(p.frames['two-shot-counter#a'].prompt), 'prompt khung đầu gắn <<<image_N>>> đúng thứ tự ảnh tham chiếu');
ok(/85% of Carlos/.test(p.frames['two-shot-counter#a'].prompt.replace(/Carlos,[^(]+\(/, 'Carlos (')) || /about 85%/.test(p.frames['two-shot-counter#a'].prompt), 'prompt nói rõ tỉ lệ teen ≈ 85 % người lớn');
ok(p.shots[4].slots.map(s => s.side).join() === 'left,right' && p.shots[4].lipsync.faceHint === 'right', 'shot 2 người: vị trí theo vai (khách trái, barista phải), gợi ý mặt người nói');
ok(p.shots.every(s => s.silent || s.lipsync.originalAudioVolume === 0), 'mọi Lip Sync tắt tiếng gốc');
ok(p.shots[1].voice.name === 'Peppy' && p.shots[2].voice.name === 'Michael', 'giọng cố định theo cast bible (Ama Peppy, Carlos Michael)');
ok(p.shots[3].overlays.find(o => o.kind === 'card').payoff === 's04', 'thẻ ✓ gắn với câu nó trả lời');
ok(p.warnings.some(w => /im lặng/.test(w)), 'planner cảnh báo shot đầu im lặng (cổng opening)');
ok(JSON.stringify(P.subPages('Hey. Give me a latte. A large one.')) === '["Hey. Give me a latte.","A large one."]', 'trang phụ đề gộp câu ≤ 26 ký tự');
{ const pad = P.padLine('Oh, okay.', 'ama', cast); ok(pad.added.length >= 1 && pad.text.endsWith('Oh, okay.') && P.estSec(pad.text) >= P.MIN_LINE, 'câu < 2 s: thêm thán từ của nhân vật (không đệm im lặng) ' + pad.text); }
{ const q = P.plan(J('content/video/samples/polite-request--could-i-get.json'), ctx);
  ok(!q.errors.length || console.log(q.errors), 'sample khuôn không lỗi planner');
  ok(q.shots.length === 4 && q.endcard.tip && q.endcard.cta, 'chuyển thể mặc định từ sample khuôn: 4 shot nói + tip/cta lên màn kết');
  ok(q.shots[0].padded && q.shots[0].padded.length && q.shots[0].overlays[0].kind === 'hook', 'hook mặc định CÓ tiếng (đã kéo ≥ 2 s bằng thán từ)');
  ok(q.shots.find(s => s.speaker === 'carlos').blocking === 'ms-barista', 'blocking theo vai casting (barista → ms-barista)'); }
{ const bad = P.plan({ ...cine, shots: [{ beat: 'x', blocking: 'mcu-customer', speaker: 'ama', text: 'Hi.' }, { beat: 'y', blocking: 'mcu-customer', speaker: 'kit', text: 'Hello there friend.' }, { beat: 'z', blocking: 'nope', speaker: 'ama', text: 'a b c d e' }, { beat: 'w', blocking: 'mcu-customer', speaker: 'ama', text: Array(20).fill('word').join(' ') + '.' }] }, { ...ctx, sample: J(cine.source) });
  ok(bad.errors.some(e => /Hi\..*< 2 s/.test(e)), 'kịch bản cine: câu < 2 s → lỗi (phải sửa kịch bản)');
  ok(bad.errors.some(e => /kit.*cast bible/.test(e)), 'người nói không có trong cast bible → lỗi');
  ok(bad.errors.some(e => /blocking "nope"/.test(e)), 'blocking lạ → lỗi');
  ok(bad.errors.some(e => /tách câu/.test(e)), 'câu dài hơn shot 5 s → lỗi tách câu'); }
{ const e = P.estimate(p, pricing);
  ok(e.images === 16 && e.ops.video === 5 && e.ops.lipsync === 4 && e.credits === 16 + 125 + 20, 'ước credit latte = 16 ảnh + 5×25 video + 4×5 Lip Sync = 161');
  ok(e.withRetries.credits > e.credits && e.usd > 0, 'ước kèm dự phòng sinh lại + USD'); }
{ const st = P.subTiming(['Here you go.', 'One latte, nice and warm.'], { start: 0.74, end: 3.99, pauses: [{ start: 1.36, end: 1.71 }] }, 10, 4.44);
  ok(Math.abs(st[1].t0 - (10 + 1.71 - 0.12)) < 0.02, 'ranh giới trang phụ đề bám khoảng ngắt thật của giọng');
  ok(st[0].t1 - st[0].t0 >= 1.2 - 1e-6 && st[0].t0 >= 10 && st[1].t1 <= 14.39 + 1e-6, 'trang đầu ngắn được hiện sớm cho đủ 1,2 s; mọi trang trong shot'); }

// ---------- cổng 4: ranh giới giọng (lỗi pilot: khoảng ngắt giữa câu bị coi là hết câu) ----------
{ const b = G.speechBounds([{ start: 0.51, end: 1.04 }, { start: 2.0, end: 2.46 }, { start: 3.28, end: 4.9 }], 4.97);
  ok(b.start === 0 && b.end === 3.28 && b.pauses.length === 2, 'giọng = tới đầu đoạn im lặng cuối (bỏ qua 2 khoảng ngắt giữa câu)');
  const c = G.speechBounds([{ start: 0, end: 0.74 }, { start: 1.36, end: 1.71 }, { start: 3.99, end: 4.9 }], 4.97);
  ok(c.start === 0.74 && c.end === 3.99, 'bỏ im lặng đầu, ngắt 0,35 s giữa câu không cắt câu');
  ok(G.speechBounds([], 3).end === 3, 'không có im lặng → cả file'); }
{ const s = p.shots[1], cast2 = cast;
  ok(G.lipsyncGate(s, { dur: 1.6 }, null, cast2).status === 'FAIL', 'câu 1,6 s → FAIL (Kling cần ≥ 2 s)');
  ok(G.lipsyncGate(s, { dur: 4.9 }, null, cast2).status === 'FAIL', 'câu dài hơn shot − 0,2 s → FAIL');
  ok(G.lipsyncGate(s, { dur: 3 }, { originalAudioVolume: 1, faces: 1 }, cast2).status === 'FAIL', 'chưa tắt tiếng gốc → FAIL');
  ok(G.lipsyncGate(p.shots[4], { dur: 3 }, { originalAudioVolume: 0, faces: 2 }, cast2).status === 'FAIL', '2 mặt mà không chọn mặt rõ → FAIL');
  ok(G.lipsyncGate(p.shots[4], { dur: 3 }, { originalAudioVolume: 0, faces: 2, faceChosenBy: 'ref-match', faceMargin: 0.4 }, cast2).status === 'PASS', '2 mặt, chọn bằng so ref → PASS');
  ok(G.lipsyncGate({ ...s, voice: { name: 'Other' } }, { dur: 3 }, null, cast2).status === 'FAIL', 'giọng khác cast bible → FAIL'); }

// ---------- cổng 1: tỉ lệ ----------
const fp2 = p.frames['two-shot-counter#a'], scene = scenes.scenes.cafe, W = 542, H = 960;
const meas2 = (amaH, carTop, counterY = 502) => ({ w: W, h: H, counter: { y: counterY }, persons: [{ box: [40, 900 - amaH, 250, 900], cx: 145, h: amaH }, { box: [260, carTop, 500, counterY], cx: 380, h: counterY - carTop }] });
{ // người lớn sau quầy: cao = phần trên quầy / (1 − 0,52); teen 0,85 × → đúng
  const adultH = 700, carTop = 502 - adultH * 0.48, g = G.proportionGate(meas2(adultH * 0.85, carTop), fp2, cast, scene);
  ok(g.status === 'PASS', 'tỉ lệ teen:adult 0,85 → PASS ' + g.note);
  const g2 = G.proportionGate(meas2(adultH * 0.6, carTop), fp2, cast, scene);
  ok(g2.status === 'FAIL' && /0\.6/.test(g2.note), 'teen chỉ 0,6 × người lớn → FAIL');
  const g3 = G.proportionGate(meas2(adultH * 2.3 * 0.48, 502 - 80), fp2, cast, scene);
  ok(g3.status === 'FAIL', 'lỗi pilot: người lớn to gấp nhiều lần quầy / teen → FAIL');
  ok(G.proportionGate({ w: W, h: H, counter: null, persons: [{ box: [40, 300, 250, 900], cx: 145, h: 600 }] }, fp2, cast, scene).status === 'FAIL', 'khung 2 người mà bộ dò thấy 1 → FAIL');
  ok(G.proportionGate({ mp: 'unavailable' }, fp2, cast, scene).status === 'SKIP', 'không có MediaPipe → SKIP (cần duyệt tay, không tự PASS)');
  ok(G.proportionGate({ w: W, h: H, persons: [{ box: [0, 100, 300, 900], cx: 150, h: 800 }, { box: [300, 200, 540, 800], cx: 420, h: 600 }] }, p.frames['mcu-customer#a'], cast, scene).status === 'FAIL', 'khung cận 1 người lọt thêm người → FAIL'); }

// ---------- cổng 2: trang phục (lỗi pilot: áo Carlos thành xanh) ----------
{ const olive = [31.6, 1.3, 30.3], navy = [5.8, 5.3, -20.5], skin = [63.6, 38.1, 47.4], blue = [60, -5, -35];
  const refs = { carlos: { palette: [[navy, 0.4], [olive, 0.16], [skin, 0.14], [[57.5, -9.1, -28], 0.08]], bands: { '0.5': [[navy, 0.4], [olive, 0.3], [skin, 0.2]] }, sleeve: olive }, ama: { palette: [[[30, -17.5, -10.5], 0.3], [[61.9, 54.7, 43.1], 0.3]], sleeve: [61.9, 54.7, 43.1] } };
  const frame = (shirt, sleeve) => ({ w: W, h: H, counter: null, persons: [{ box: [0, 50, 500, 900], cx: 250, h: 850, sig: [[navy, 0.4], [shirt, 0.25], [skin, 0.2]], sleeve }] });
  const fpMs = p.frames['ms-barista#a'];
  ok(G.identityGate(frame(olive, olive), fpMs, refs, cast).status === 'PASS', 'áo olive như ref → PASS (khung cận so nửa trên ref, không đòi màu quần)');
  const bad = G.identityGate(frame(blue, blue), fpMs, refs, cast);
  ok(bad.status === 'FAIL' && /carlos/.test(bad.note), 'áo đổi sang xanh → FAIL ' + bad.note);
  ok(G.identityGate({ ...frame(olive, blue) }, fpMs, refs, cast).status === 'PASS', 'mẫu tay áo Pose lệch nhưng màu áo vẫn có trong vùng người → không FAIL (Pose chập chờn trên tranh 2D)'); }

// ---------- cổng 3: AI thị giác + luật cắt ----------
ok(G.visionGate(null).status === 'SKIP' && G.visionGate(null).data.needsHumanReview, 'không có AI thị giác → SKIP + cần duyệt tay');
{ const g = G.visionGate({ status: 'FAIL', reasons: ['khung 3: vật thừa'], perFrame: [{ t: 0.5, issues: [] }, { t: 2.5, issues: [] }, { t: 4.5, issues: ['vật thừa'] }] }, [0.5, 2.5, 4.5]);
  ok(g.status === 'WARN' && g.data.trimTo === 3.5, 'lỗi chỉ ở cuối clip → cắt shot (trimTo 3,5 s)'); }
ok(G.visionGate({ status: 'FAIL', reasons: ['x'], perFrame: [{ t: 0.5, issues: ['chữ vô nghĩa'] }] }, [0.5]).status === 'FAIL', 'lỗi từ khung đầu → FAIL');
{ const v = parseCineVision('```json\n{"frames":[{"index":1,"stray_objects":false,"gibberish_text":true,"extra_people":false,"anatomy_ok":true,"issues":["chalkboard"]}]}\n```', 1);
  ok(v && v.frames[0].bad && v.frames[0].issues.includes('chữ vô nghĩa'), 'parse AI thị giác (bọc ```json) → chữ vô nghĩa');
  ok(parseCineVision('{"frames":[{"index":1}]}', 1) === null, 'JSON sai schema → null (không tự PASS)'); }

// ---------- cổng 5, 6, 7 ----------
ok(G.openingGate(-47, [{ style: 'Hook', t0: 0 }]).status === 'FAIL', 'mở đầu im lặng (−47 dBFS) → FAIL');
ok(G.openingGate(-22, [{ style: 'Hook', t0: 0.4 }]).status === 'FAIL', 'hook hiện trễ 0,4 s → FAIL');
ok(G.openingGate(-22, [{ style: 'Hook', t0: 0 }]).status === 'PASS', 'có tiếng + hook từ khung 0 → PASS');
{ const segs = [{ id: 's01', t0: 0, t1: 3, faces: [[300, 300, 700, 700]], speech: { start: 0.2, end: 2.5 } }, { id: 's02', t0: 3, t1: 7, faces: [], speech: { start: 3.1, end: 6 } }];
  const L = ev => G.layoutGate(segs, ev);
  ok(L([{ style: 'Sub', t0: 0.2, t1: 2.9, text: 'Could I get a latte?', shot: 's01' }]).status === 'PASS', 'phụ đề trong shot, ≤ 15 ký tự/s → PASS');
  ok(L([{ style: 'Sub', t0: 2.0, t1: 3.6, text: 'Could I get a latte?', shot: 's01' }]).status === 'FAIL', 'phụ đề vắt qua điểm cắt → FAIL');
  ok(L([{ style: 'Card', t0: 3.0, t1: 6.5, text: '✓', shot: 's02', payoff: { shot: 's02' } }]).status === 'FAIL', 'thẻ hiện trước câu nó trả lời → FAIL');
  ok(L([{ style: 'Card', t0: 3.5, t1: 6.5, text: '✓', shot: 's02', payoff: { shot: 's02' } }]).status === 'PASS', 'thẻ sau khi câu bắt đầu, trong shot → PASS');
  ok(L([{ style: 'Card', t0: 0.5, t1: 2.5, text: 'x', shot: 's01', payoff: { shot: 's01' }, box: [200, 330, 880, 460] }]).status === 'FAIL', 'thẻ đè mặt → FAIL');
  ok(L([{ style: 'Sub', t0: 0.2, t1: 1.0, text: 'That sounds a bit bossy.', shot: 's01' }]).status === 'FAIL', 'trang < 1,2 s & > 15 ký tự/s → FAIL');
  ok(L([{ style: 'Sub', t0: 0.2, t1: 0.9, text: 'Oh! Sorry.', shot: 's01' }]).status === 'PASS', 'thán từ ≤ 2 từ được miễn 1,2 s'); }
{ const assets = { a: { sha256: 'x1' }, b: { sha256: 'x2' } };
  ok(G.endcardGate([{ id: 's01', sha256: 'x1', kind: 'shot' }, { id: 'end', sha256: 'x2', kind: 'endcard' }], assets, { sha256: 'x2', madeBy: 'endcard' }).status === 'PASS', 'màn kết dựng riêng → PASS');
  ok(G.endcardGate([{ id: 's01', sha256: 'x1', kind: 'shot' }, { id: 'end', sha256: 'zz', kind: 'shot' }], assets, { sha256: 'x2', madeBy: 'endcard' }).status === 'FAIL', 'lỗi pilot: đoạn cuối cắt từ video khác → FAIL'); }
ok(G.loudnessGate(-15.8).status === 'PASS' && G.loudnessGate(-19).status === 'FAIL', 'LUFS −16 ± 1');
{ const q = G.studioQa([{ k: 'opening', status: 'FAIL', note: 'x' }, { k: 'lipsync', status: 'PASS', note: '' }, { k: 'vision', status: 'SKIP', note: '' }, { k: 'endcard', status: 'PASS', note: '' }]);
  ok(q.blocked && q.scores.lipsync === 15 && q.scores.knowledge == null && !('brand' in q.scores) && q.gates.length === 4, 'điểm Studio: FAIL → chặn; knowledge để chấm tay; AI thị giác SKIP → brand chờ chấm tay'); }

// ---------- driver Kling (fetch giả, không mạng) ----------
{ const t = 1_800_000_000_000, tok = jwt('AKtest', 'SKsecret', t), [h, pl, sig] = tok.split('.');
  const pay = JSON.parse(Buffer.from(pl, 'base64url').toString());
  ok(JSON.parse(Buffer.from(h, 'base64url').toString()).alg === 'HS256' && pay.iss === 'AKtest' && pay.exp === t / 1000 + 1800 && pay.nbf === t / 1000 - 5, 'JWT: HS256, iss = access key, exp +1800 s, nbf −5 s');
  ok(sig === crypto.createHmac('sha256', 'SKsecret').update(`${h}.${pl}`).digest('base64url'), 'JWT ký HMAC-SHA256 bằng secret key');
  ok(authHeader({ KLING_API_KEY: 'k1' }) === 'Bearer k1' && authHeader({}) === null && /^Bearer ey/.test(authHeader({ KLING_ACCESS_KEY: 'a', KLING_SECRET_KEY: 'b' })), 'ưu tiên API key; không có khoá → null'); }
{ const old = { ...process.env }; process.env.KLING_API_KEY = 'sk-live-SECRETVALUE123'; delete process.env.KLING_API_BASE;
  const calls = [], dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cine-test-')), img = path.join(dir, 'a.png'); fs.writeFileSync(img, 'x');
  let polls = 0;
  const fake = async (url, o = {}) => {
    calls.push({ url, method: o.method || 'GET', body: o.body ? JSON.parse(o.body) : null, auth: (o.headers || {}).Authorization });
    const res = d => ({ ok: true, status: 200, json: async () => ({ code: 0, data: d }), arrayBuffer: async () => new ArrayBuffer(4) });
    if (/omni-image$/.test(url)) return res({ task_id: 't1', task_status: 'submitted' });
    if (/omni-image\/t1$/.test(url)) return res(++polls < 2 ? { task_status: 'processing' } : { task_status: 'succeed', task_result: { images: [{ index: 0, url: 'https://cdn.example.com/i0.png' }] } });
    if (/kling-2\.5-turbo$/.test(url)) return res({ id: 'v1', status: 'submitted' });
    if (/\/tasks\?task_ids=v1$/.test(url)) return res([{ id: 'v1', status: 'succeeded', outputs: [{ type: 'video', id: 'vid1', url: 'https://cdn.example.com/v.mp4' }] }]);
    if (/identify-face$/.test(url)) return res({ session_id: 'sess', face_data: [{ face_id: '0', start_time: 0, end_time: 5000 }] });
    if (/advanced-lip-sync$/.test(url)) return res({ task_id: 'l1', task_status: 'submitted' });
    if (/advanced-lip-sync\/l1$/.test(url)) return res({ task_status: 'succeed', task_result: { videos: [{ url: 'https://cdn.example.com/l.mp4' }] } });
    if (/\/v1\/audio\/tts$/.test(url)) return { ok: false, status: 401, json: async () => ({ code: 1004, message: 'bad key sk-live-SECRETVALUE123', request_id: 'r' }) };
    return { ok: true, status: 200, arrayBuffer: async () => new ArrayBuffer(4), json: async () => ({}) };
  };
  const d = klingDriver({ fetchImpl: fake, pollMs: 0 });
  const im = await d.image({ prompt: 'p <<<image_1>>>', refs: [img], n: 1, outDir: dir });
  const c0 = calls[0];
  ok(c0.url === 'https://api-singapore.klingai.com/v1/images/omni-image' && c0.method === 'POST' && c0.body.model_name === 'kling-v3-omni' && c0.body.image_list[0].image === Buffer.from('x').toString('base64') && c0.body.aspect_ratio === '9:16', 'ảnh: POST /v1/images/omni-image, kling-v3-omni, image_list base64, 9:16');
  ok(im.files.length === 1 && calls.some(c => /omni-image\/t1$/.test(c.url)) && polls >= 2, 'ảnh: poll GET /v1/images/omni-image/{task_id} tới succeed rồi tải về');
  const v = await d.video({ image: img, prompt: 'move', outDir: dir });
  const cv = calls.find(c => /kling-2\.5-turbo$/.test(c.url));
  ok(cv.body.contents[1].type === 'first_frame' && cv.body.settings.duration === 5 && v.videoId === 'vid1', 'video: POST /image-to-video/kling-2.5-turbo (first_frame, 5 s) → GET /tasks?task_ids=');
  const f = await d.faces({ videoId: 'vid1', outDir: dir });
  const l = await d.lipsync({ sessionId: f.sessionId, faceId: '0', audioId: 'a1', soundEndMs: 3000, outDir: dir });
  const cl = calls.find(c => /advanced-lip-sync$/.test(c.url));
  ok(cl.body.face_choose[0].original_audio_volume === 0 && cl.body.face_choose[0].face_id === '0' && cl.body.session_id === 'sess' && l.file, 'Lip Sync: identify-face → advanced-lip-sync, chọn face_id, original_audio_volume = 0');
  ok(calls.every(c => c.auth == null || c.auth === 'Bearer sk-live-SECRETVALUE123' || !/cdn/.test(c.url)), 'xác thực Bearer trên mọi lời gọi API');
  let msg = ''; try { await d.tts({ text: 'hi there', voice: { name: 'Peppy', klingVoiceId: 'v_peppy', language: 'en' }, outDir: dir }); } catch (e) { msg = e.message; }
  ok(/HTTP 401/.test(msg) && !msg.includes('SECRETVALUE'), 'lỗi API không lộ khoá (scrub) ' + msg);
  let need = ''; try { await d.tts({ text: 'x', voice: { name: 'Peppy', klingVoiceId: null }, outDir: dir }); } catch (e) { need = e.needsOwner ? 'owner' : e.message; }
  ok(need === 'owner', 'thiếu klingVoiceId → NeedsOwner (dừng rõ ràng, không đoán giọng)');
  ok(scrub('Authorization: Bearer abcdefghijklmnopqrstu') === 'Authorization: Bearer ***', 'scrub che token Bearer');
  fs.rmSync(dir, { recursive: true, force: true }); process.env = old; }

// ---------- assembler: chữ tránh mặt (cần Python + PIL; không có → bỏ qua có báo) ----------
{ const pyBin = [process.env.LEXKITE_PY, fileURLToPath(new URL('../../.tools/pyenv/bin/python', import.meta.url)), 'python3'].find(b => b && spawnSync(b, ['-c', 'import PIL'], { stdio: 'ignore' }).status === 0);
  if (!pyBin) console.log('  (bỏ qua test assembler: thiếu Python + Pillow)');
  else {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cine-asm-')), spec = path.join(dir, 's.json'), font = fileURLToPath(new URL('../../brand/social/src/fonts/BeVietnamPro-ExtraBold.ttf', import.meta.url));
    fs.writeFileSync(spec, JSON.stringify({ W: 1080, H: 1920, workdir: dir, fonts: { body: font, head: font }, events: [
      { style: 'Card', sym: '✓', text: 'Could I get…, please?', t0: 1, t1: 2, faces: [[200, 250, 900, 560]] },
      { style: 'Sub', text: 'Hey. Give me a latte.', t0: 0, t1: 1, faces: [] }] }));
    const r = spawnSync(pyBin, [fileURLToPath(new URL('../video/cine/assemble.py', import.meta.url)), 'layout', spec], { encoding: 'utf8' });
    const out = r.status === 0 ? JSON.parse(r.stdout.trim().split('\n').pop()).events : [];
    ok(out.length === 2 && out[0].y === 1060 && out[0].faceOverlap <= 0.02, 'assembler: thẻ né mặt (330/170 đè mặt → 1060) ' + (r.stderr || '').slice(0, 200));
    ok(out[1] && out[1].box[3] <= 1500 && out[1].box[1] > 1300, 'assembler: phụ đề ở đường đáy cố định 1/3 dưới');
    fs.rmSync(dir, { recursive: true, force: true });
  } }

console.log(fails ? `✗ cine: ${fails}/${n} kiểm tra trượt` : `✓ cine: ${n} kiểm tra (planner, cổng 1–7, driver Kling, AI thị giác, assembler)`);
process.exit(fails ? 1 : 0);
