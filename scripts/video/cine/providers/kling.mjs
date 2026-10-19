// Driver Kling API (chính thức) cho chế độ cine – docs/VIDEO-PIPELINE.md §13, đối chiếu tài liệu https://kling.ai/document-api/llms.txt (19/10/2026):
//   Xác thực  https://kling.ai/document-api/api/get-started/authentication.md
//     • KLING_API_KEY (kiểu mới, mọi model): Authorization: Bearer <API key>
//     • KLING_ACCESS_KEY + KLING_SECRET_KEY (kiểu cũ "legacy design standard" – endpoint /v1/... có model_name): JWT HS256 {iss: AK, exp: now+1800, nbf: now−5} ký bằng SK
//   Máy chủ   https://api-singapore.klingai.com (ngoài Trung Quốc; api.klingai.com cũ đã đổi) – ghi đè: KLING_API_BASE
//   Ảnh       POST /v1/images/omni-image {model_name: kling-v3-omni, prompt (<<<image_N>>>), image_list[{image}], resolution 1k|2k|4k, n 1–9, aspect_ratio}
//             GET  /v1/images/omni-image/{task_id} → data.task_status submitted|processing|succeed|failed, task_result.images[].url
//             https://kling.ai/document-api/api/image/3-0-omni/image-omni.md
//   Video     POST /image-to-video/kling-2.5-turbo {contents:[{type:prompt,text},{type:first_frame,url(URL|Base64)}], settings{resolution,duration 5|10}, options{external_task_id}}
//             GET  /tasks?task_ids=<id> → data[].status submitted|processing|succeeded|failed, outputs[{type:video,id,url,duration}] (2.5 Turbo: không có tiếng gốc)
//             https://kling.ai/document-api/api/video/2-5-turbo/image-to-video.md  (model mới: tài liệu chỉ ghi Bearer API key)
//   Giọng     POST /v1/audio/tts {text ≤ 1000, voice_id, voice_language en|zh, voice_speed 0.8–2.0} → data.task_result.audios[{id,url,duration}]
//             https://kling.ai/document-api/api/video/avatar/text-to-speech.md  (API không có tham số cảm xúc; đường truy vấn lại chưa có trong tài liệu)
//   Mặt       POST /v1/videos/identify-face {video_id | video_url} → session_id, face_data[{face_id, face_image, start_time, end_time}]
//             https://kling.ai/document-api/api/video/lip-sync/face-detection.md
//   Lip Sync  POST /v1/videos/advanced-lip-sync {session_id, face_choose:[{face_id, audio_id|sound_file, sound_start_time, sound_end_time, sound_insert_time, sound_volume, original_audio_volume}]}
//             GET  /v1/videos/advanced-lip-sync/{task_id} → task_result.videos[{id,url,duration}]  – âm ≥ 2 s, ≤ 60 s; cửa sổ chèn chồng mặt ≥ 2 s
//             https://kling.ai/document-api/api/video/lip-sync.md
// Khoá KHÔNG BAO GIỜ được in: mọi thông báo lỗi qua scrub(). File kết quả Kling bị xoá sau 30 ngày → tải về ngay (cache theo băm nội dung).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export const BASE = () => (process.env.KLING_API_BASE || 'https://api-singapore.klingai.com').replace(/\/$/, '');
const SECRETS = () => [process.env.KLING_API_KEY, process.env.KLING_ACCESS_KEY, process.env.KLING_SECRET_KEY].filter(x => x && x.length > 4);
export const scrub = s => SECRETS().reduce((a, k) => a.split(k).join('***'), String(s)).replace(/Bearer\s+[A-Za-z0-9._-]{12,}/g, 'Bearer ***');
const b64u = b => Buffer.from(b).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');

/** JWT HS256 theo tài liệu xác thực Kling (exported để test – không in). */
export function jwt(ak, sk, now = Date.now()) {
  const t = Math.floor(now / 1000);
  const h = b64u(JSON.stringify({ alg: 'HS256', typ: 'JWT' })), p = b64u(JSON.stringify({ iss: ak, exp: t + 1800, nbf: t - 5 }));
  return `${h}.${p}.${b64u(crypto.createHmac('sha256', sk).update(`${h}.${p}`).digest())}`;
}
export function authHeader(env = process.env, now = Date.now()) {
  if (env.KLING_API_KEY) return 'Bearer ' + env.KLING_API_KEY;
  if (env.KLING_ACCESS_KEY && env.KLING_SECRET_KEY) return 'Bearer ' + jwt(env.KLING_ACCESS_KEY, env.KLING_SECRET_KEY, now);
  return null;
}
export const hasKeys = (env = process.env) => !!authHeader(env);

const sleep = ms => new Promise(r => setTimeout(r, ms));
const b64 = f => fs.readFileSync(f).toString('base64');
export class NeedsOwner extends Error { constructor(m) { super(m); this.needsOwner = true; } }

export function klingDriver({ fetchImpl = fetch, pollMs = 5000, timeoutMs = 20 * 60e3, log = () => {} } = {}) {
  async function call(method, p, body) {
    const auth = authHeader();
    if (!auth) throw new NeedsOwner('thiếu secret KLING_API_KEY hoặc KLING_ACCESS_KEY + KLING_SECRET_KEY');
    const r = await fetchImpl(BASE() + p, { method, headers: { Authorization: auth, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || (j.code != null && j.code !== 0)) throw new Error(scrub(`Kling ${method} ${p} → HTTP ${r.status} code ${j.code ?? '?'} ${j.message || ''} (request_id ${j.request_id || '-'})`));
    return j.data;
  }
  async function poll(get, done, what) {
    const t0 = Date.now();
    for (;;) {
      const d = await get(); const st = done(d);
      if (st === true) return d;
      if (st === false) throw new Error(scrub(`${what} thất bại: ${(d && (d.task_status_msg || d.message)) || 'không rõ lý do'}`));
      if (Date.now() - t0 > timeoutMs) throw new Error(`${what}: quá ${Math.round(timeoutMs / 60e3)} phút chưa xong`);
      await sleep(pollMs);
    }
  }
  async function download(url, dst) {
    const r = await fetchImpl(url); if (!r.ok) throw new Error(`tải kết quả Kling lỗi HTTP ${r.status}`);
    fs.mkdirSync(path.dirname(dst), { recursive: true }); fs.writeFileSync(dst, Buffer.from(await r.arrayBuffer())); return dst;
  }
  const v1state = d => (d.task_status === 'succeed' ? true : d.task_status === 'failed' ? false : null);
  return {
    name: 'kling', paid: true,
    async image({ prompt, refs, aspect = '9:16', resolution = '2k', n = 4, externalId, outDir }) {
      const d = await call('POST', '/v1/images/omni-image', { model_name: 'kling-v3-omni', prompt, image_list: refs.map(f => ({ image: b64(f) })), resolution, n, aspect_ratio: aspect, external_task_id: externalId });
      log(`  kling image task ${d.task_id}`);
      const res = await poll(() => call('GET', `/v1/images/omni-image/${d.task_id}`), v1state, 'Kling Omni Image');
      const imgs = (res.task_result || {}).images || [];
      const files = []; for (const im of imgs) files.push(await download(im.url, path.join(outDir, `img-${im.index ?? files.length}.png`)));
      return { files, taskId: d.task_id, units: res.final_unit_deduction ?? null };
    },
    async video({ image, prompt, duration = 5, resolution = '1080p', externalId, outDir }) {
      const d = await call('POST', '/image-to-video/kling-2.5-turbo', { contents: [{ type: 'prompt', text: prompt }, { type: 'first_frame', url: b64(image) }], settings: { resolution, duration }, options: { external_task_id: externalId } });
      log(`  kling video task ${d.id}`);
      const res = await poll(async () => ((await call('GET', `/tasks?task_ids=${encodeURIComponent(d.id)}`)) || [])[0] || {}, t => (t.status === 'succeeded' ? true : t.status === 'failed' ? false : null), 'Kling 2.5 Turbo');
      const out = (res.outputs || []).find(o => o.type === 'video'); if (!out) throw new Error('Kling 2.5 Turbo: không có video trong outputs');
      return { file: await download(out.url, path.join(outDir, 'shot.mp4')), videoId: out.id, taskId: d.id };
    },
    async tts({ text, voice, outDir }) {
      if (!voice || !voice.klingVoiceId) throw new NeedsOwner(`chưa có klingVoiceId cho giọng "${voice && voice.name}" trong content/video/cine/cast.json (tra Kling Voice Guide)`);
      let d = await call('POST', '/v1/audio/tts', { text, voice_id: voice.klingVoiceId, voice_language: voice.language || 'en', voice_speed: Math.max(0.8, Math.min(2, voice.speed || 1)) });
      if (v1state(d) !== true) d = await poll(() => call('GET', `/v1/audio/tts/${d.task_id}`), v1state, 'Kling TTS'); // đường truy vấn: suy từ chuẩn /v1 (tài liệu TTS chưa ghi)
      const a = ((d.task_result || {}).audios || [])[0]; if (!a) throw new Error('Kling TTS: không có audio');
      return { file: await download(a.url, path.join(outDir, 'tts.mp3')), audioId: a.id, duration: +a.duration };
    },
    async faces({ videoId, outDir }) {
      const d = await call('POST', '/v1/videos/identify-face', { video_id: videoId });
      const faces = [];
      for (const f of d.face_data || []) faces.push({ faceId: String(f.face_id), start: f.start_time, end: f.end_time, image: f.face_image ? await download(f.face_image, path.join(outDir, `face-${f.face_id}.png`)) : null });
      return { sessionId: d.session_id, faces };
    },
    async lipsync({ sessionId, faceId, audioId, soundEndMs, insertMs = 0, outDir }) {
      const d = await call('POST', '/v1/videos/advanced-lip-sync', { session_id: sessionId, face_choose: [{ face_id: faceId, audio_id: audioId, sound_start_time: 0, sound_end_time: soundEndMs, sound_insert_time: insertMs, sound_volume: 1, original_audio_volume: 0 }] });
      const res = await poll(() => call('GET', `/v1/videos/advanced-lip-sync/${d.task_id}`), v1state, 'Kling Lip Sync');
      const v = ((res.task_result || {}).videos || [])[0]; if (!v) throw new Error('Kling Lip Sync: không có video');
      return { file: await download(v.url, path.join(outDir, 'lipsync.mp4')), taskId: d.task_id };
    },
  };
}
