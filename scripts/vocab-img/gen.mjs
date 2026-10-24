#!/usr/bin/env node
// Vẽ ảnh minh hoạ từ vựng – CHỈ dịch vụ miễn phí, ưu tiên thấp nhất (việc nền `vocab-img`, infra/jobs.json).
//   node scripts/vocab-img/gen.mjs --keys <file.json|k1,k2> --out <dir> [--attempt 1|2] [--dry-run]
// Nhà cung cấp (thứ tự; mỗi nhà có trần ảnh/ngày suy từ neuron miễn phí – NEURONS_PER_IMG):
//   cf2      Workers AI tài khoản 2 (REST, env CF_AI_TOKEN_2 + CF_ACCOUNT_2; quyền token: Account › Workers AI › Read + Edit)   VIMG_MAX_CF2 (mặc định 50 ≈ 8.640 neuron)
//   grabcast GrabCast owner-ai /api/owner-ai/image provider=cloudflare (env GRABCAST_AI_KEY)                                   VIMG_MAX_GC  (mặc định 40)
//   main     Workers AI tài khoản chính – qua /api/studio op imageGen (env STUDIO_CALLBACK_SECRET, binding AI của Pages) hoặc REST (CF_AI_TOKEN_1 + CF_ACCOUNT_1)
//            VIMG_MAX_MAIN (mặc định 0 – 23/10: pilot 25 ảnh + giám khảo Llama của việc khác làm cạn 10.000 neuron tài khoản chính → AI người dùng mất dự phòng;
//            analytics GraphQL không đếm neuron Llama nên KHÔNG ước được phần dư → chỉ bật khi chủ ghi rõ số)
// Hết hạn mức (429 / 4006 / quota) → bỏ nhà đó tới hết lượt chạy, KHÔNG thử lại vòng lặp. Ghi <out>/gen.json.
import fs from 'fs';
import path from 'path';
import { promptFor } from './style.mjs';
import { promptFromCard } from './strict.mjs';

const arg = n => { const i = process.argv.indexOf('--' + n); return i > 0 ? process.argv[i + 1] : undefined; };
const OUT = arg('out') || 'out/vocab-img', ATT = +(arg('attempt') || 1), DRY = process.argv.includes('--dry-run');
const ROOT = new URL('../../', import.meta.url), rd = p => JSON.parse(fs.readFileSync(new URL(p, ROOT), 'utf8'));
export const slug = k => k.replace(/#/g, '__').replace(/[^a-zA-Z0-9_-]+/g, '-');
const FLUX = '@cf/black-forest-labs/flux-1-schnell';
// Neuron ước tính / ảnh FLUX-1-schnell (bảng giá Workers AI: 4,8 neuron / ô 512² + 9,6 neuron / bước) – ra CỐ ĐỊNH 1024² (4 ô) × 4 bước = 57,6.
// Cỡ ảnh: GrabCast /api/owner-ai/image CHỈ nhận { prompt, provider } (đo 25/10: width/height/size/steps lạ bị bỏ qua, không 422) và FLUX schnell
// trên Workers AI không có tham số cỡ → KHÔNG xin được ảnh nhỏ hơn; ảnh 1024² thu về 512 ở bước encode. Ghi đè: VIMG_NEURONS_PER_IMG.
export const NEURONS_PER_IMG = +(process.env.VIMG_NEURONS_PER_IMG || 57.6);
const env = process.env;

export const PROVIDERS = [
  // 24/10 chủ: GrabCast TRƯỚC và gần như duy nhất (kho ~70 khóa Cloudflare, chưa có người dùng thật → dùng tối đa, chừa ~10 %); cf2 mặc định 0
  { id: 'grabcast', max: +(env.VIMG_MAX_GC || 40), ok: () => env.GRABCAST_AI_KEY, run: grabcast },
  { id: 'cf2', max: +(env.VIMG_MAX_CF2 || 0), ok: () => env.CF_AI_TOKEN_2 && env.CF_ACCOUNT_2, run: p => cfRest(env.CF_ACCOUNT_2, env.CF_AI_TOKEN_2, p) },
  { id: 'main', max: +(env.VIMG_MAX_MAIN || 0), ok: () => (env.CF_AI_TOKEN_1 && env.CF_ACCOUNT_1) || env.STUDIO_CALLBACK_SECRET,
    run: p => (env.CF_AI_TOKEN_1 ? cfRest(env.CF_ACCOUNT_1, env.CF_AI_TOKEN_1, p) : studio(p)) },
];
class Quota extends Error {}
// Cloudflare chặn prompt (job failed, error_code bad_request "Workers AI refused the image… Input prompt") → KHÔNG thử lại y nguyên; scene-gen viết lại prompt trung tính (scene.mjs soften)
export class Safety extends Error {}
const isImg = b => b && b.length > 1000 && ((b[0] === 0xff && b[1] === 0xd8) || (b[0] === 0x89 && b[1] === 0x50) || b.slice(8, 12).toString() === 'WEBP');   // JPEG/PNG/WebP
const quotaish = s => /4006|daily free allocation|neurons?\b.*(limit|exceed)|quota/i.test(s);   // 3040 'Capacity temporarily exceeded' = tạm thời, KHÔNG phải hết hạn mức
async function cfRest(acct, tok, prompt) {
  const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${acct}/ai/run/${FLUX}`, { method: 'POST', headers: { Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt, steps: 4 }) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.success) { const m = `${r.status} ${JSON.stringify(j.errors || '').slice(0, 160)}`; if (r.status === 429 || quotaish(m) || r.status === 403 || /10000|Authentication/.test(m)) throw new Quota(m); throw new Error(m); }
  return Buffer.from(j.result.image, 'base64');
}
async function studio(prompt) {
  const r = await fetch((env.STUDIO_API || 'https://lexkite.com/api/studio'), { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Studio-Secret': env.STUDIO_CALLBACK_SECRET, 'User-Agent': 'lexkite-ci' }, body: JSON.stringify({ op: 'imageGen', prompt, steps: 4 }) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.image) { const m = `${r.status} ${j.error || ''} ${j.detail || ''}`; if (r.status === 429 || quotaish(m)) throw new Quota(m); throw new Error(m); }
  return Buffer.from(j.image, 'base64');
}
// A/B mô hình (25/10, docs/VOCAB-IMG-STYLE.md § Pilot): VIMG_MODEL (workflow input "model") – rỗng = mặc định GrabCast (flux-1-schnell) và KHÔNG gửi trường model.
// GrabCast /api/owner-ai/image (25/10): { prompt, provider, model, width, height, steps, aspect }; model chỉ với provider 'cloudflare', ngoài danh sách → 422 model_not_allowed.
// Tên ngắn → id @cf/ đầy đủ. width+height gửi CÙNG nhau (bội 64, 256–1536); schnell KHÔNG nhận cỡ (422 size_not_supported) → không bao giờ gửi cỡ cho schnell;
// mô hình khác mặc định 512×512, ghi đè VIMG_SIZE (512 | 768x512). steps: giữ mặc định của GrabCast (không gửi).
export const MODELS = { 'flux-1-schnell': '@cf/black-forest-labs/flux-1-schnell', 'flux-2-klein-4b': '@cf/black-forest-labs/flux-2-klein-4b',
  'flux-2-klein-9b': '@cf/black-forest-labs/flux-2-klein-9b', 'flux-2-dev': '@cf/black-forest-labs/flux-2-dev', 'lucid-origin': '@cf/leonardo/lucid-origin',
  'phoenix-1.0': '@cf/leonardo/phoenix-1.0', 'sdxl-lightning': '@cf/bytedance/stable-diffusion-xl-lightning', 'sdxl-base-1.0': '@cf/stabilityai/stable-diffusion-xl-base-1.0' };
export const MODEL_DEFAULT = MODELS['flux-1-schnell'];
export function modelId(m) {
  m = String(m || '').trim(); if (!m) return '';
  if (m.startsWith('@cf/')) return m;
  return MODELS[m] || MODELS[m.replace(/^leonardo\//, '')] || m;   // lạ → gửi nguyên, GrabCast trả 422 → dừng (cấu hình sai)
}
/** thân yêu cầu GrabCast cho prompt (tất định theo env) */
export function gcBody(prompt, model = modelId(env.VIMG_MODEL), size = env.VIMG_SIZE) {
  const b = { prompt, provider: 'cloudflare' };
  if (!model) return b;
  b.model = model;
  if (!/flux-1-schnell$/.test(model)) {
    const [w, h = w] = String(size || '512').toLowerCase().split('x').map(n => +n);
    const okD = n => Number.isInteger(n) && n % 64 === 0 && n >= 256 && n <= 1536;
    if (!okD(w) || !okD(h)) throw new Error(`VIMG_SIZE=${size} sai (bội 64, 256–1536)`);
    b.width = w; b.height = h;
  }
  return b;
}
let gcModel = modelId(env.VIMG_MODEL);
export const modelInUse = () => gcModel || MODEL_DEFAULT;
const GC = String(env.GRABCAST_API_BASE || 'https://grabcast-api-342720596878.us-central1.run.app').replace(/\/+$/, '');
let gcWaits = 0;
// đếm theo mã HTTP cho báo cáo GrabCast (24/10: ~40 % lượt 500) – scene-gen ghi vào gen-stats.s<i>.json
// exhausted_at / ok_before_exhausted: thời điểm bể CF cạn (503 ai_exhausted) và số ảnh vẽ được trước đó (fill-report.json)
export const GC_STATS = { model: gcModel || MODEL_DEFAULT, model_sent: !!gcModel, size: gcModel && !/flux-1-schnell$/.test(gcModel) ? String(env.VIMG_SIZE || '512') : null, model_fallback: 0, by_model: {}, exhausted_at: null, ok_before_exhausted: null, no_provider: 0, submit: 0, ok: 0, s429: 0, s5xx: 0, ai_busy: 0, ai_unavailable: 0, ai_exhausted: 0, safety: 0, s4xx: 0, job_err: 0, poll_err: 0, timeout: 0, content_err: 0, net: 0, retry_after_s: 0, by_code: {} };
const gcErr = (m, r) => { const e = new Error(m); e.status = r && r.status; const ra = r && r.headers && +r.headers.get('retry-after'); if (ra > 0) e.retryAfter = ra; return e; };
async function grabcast(prompt) {
  const h = { 'X-API-Key': env.GRABCAST_AI_KEY, 'Content-Type': 'application/json' };
  GC_STATS.submit++;
  const m = gcModel; let body; try { body = JSON.stringify(gcBody(prompt, m)); } catch (e) { console.error('✗ ' + e.message); throw new Quota('config ' + e.message); }
  let r; try { r = await fetch(GC + '/api/owner-ai/image', { method: 'POST', headers: h, body }); } catch (e) { GC_STATS.net++; throw e; }
  // 422 (model_not_allowed / size_not_supported / bad steps) = lỗi CẤU HÌNH → ghi log, DỪNG nhà này, không thử lại, không đổi sang mô hình khác (A/B sẽ sai)
  if (r.status === 422) { const t = await r.text().catch(() => ''); GC_STATS.by_code[422] = (GC_STATS.by_code[422] || 0) + 1; GC_STATS.s4xx++; GC_STATS.config = (GC_STATS.config || 0) + 1;
    console.error(`✗ GrabCast 422 (cấu hình, model=${m || 'mặc định'}): ${t.slice(0, 200).replace(/\s+/g, ' ')}`); throw new Quota(`config 422 ${t.slice(0, 120)}`); }
  // 400 cho trường model (GrabCast cũ chưa có trường) → ghi log, gửi lại KHÔNG model cho cả lượt (gc.model_fallback ≠ 0 = lượt không hợp lệ cho A/B)
  if (m && r.status === 400) {
    const t = await r.text().catch(() => '');
    console.warn(`⚠ GrabCast từ chối model=${m} (${r.status} ${t.slice(0, 160).replace(/\s+/g, ' ')}) – lượt này gửi KHÔNG model (mặc định ${MODEL_DEFAULT})`);
    gcModel = ''; GC_STATS.model_fallback++; GC_STATS.model = 'default (fallback from ' + m + ')'; GC_STATS.model_sent = false; GC_STATS.submit--;
    return grabcast(prompt);
  }
  GC_STATS.by_code[r.status] = (GC_STATS.by_code[r.status] || 0) + 1;
  if (r.status === 429) GC_STATS.s429++; else if (r.status >= 500) GC_STATS.s5xx++; else if (r.status >= 400) GC_STATS.s4xx++;
  if (r.status !== 200 && +r.headers.get('retry-after') > 0) GC_STATS.retry_after_s += +r.headers.get('retry-after');
  const j = await r.json().catch(() => ({}));
  // GrabCast 24/10 (sửa 500): lỗi chỉ còn 503 ai_busy (Retry-After 20) | ai_unavailable / ai_exhausted (Retry-After 60), không còn 500 trần
  { const code = String((j.error && (j.error.code || j.error)) || j.code || ''); for (const c of ['ai_busy', 'ai_unavailable', 'ai_exhausted']) if (code.includes(c)) GC_STATS[c]++; }
  // đo 23/10: hết khung sau 10 ảnh, mở lại < 2 phút → chờ lùi 65 s, 130 s…; 6 lần 429 LIÊN TIẾP = hết hạn mức ngày → dừng nhà này
  if (r.status === 429 && (gcWaits++ < 6)) { const w = Math.min(240, +r.headers.get('retry-after') || 65 * gcWaits); /* 24/10 GrabCast MAX: 115k/ngày/khoá, ảnh 60/phút/IP – theo Retry-After */ console.log(`… GrabCast 429 (khung 10 ảnh) – chờ ${w} s`); await new Promise(s => setTimeout(s, w * 1e3)); return grabcast(prompt); }
  // 24/10: 409 no_provider ×2772 lượt – lỗi cấu hình (401/403/409) không tự hết khi thử lại → dừng nhà này ngay, không gọi dồn
  // GrabCast 24/10: cả bể CF hết neuron ngày → 503 ai_exhausted (Retry-After tới 00:00 UTC) = hết hạn mức, dừng nhà này (không ngủ trong runner)
  if (/ai_exhausted/.test(JSON.stringify(j.detail || j.error || ''))) { GC_STATS.ai_exhausted++; if (!GC_STATS.exhausted_at) { GC_STATS.exhausted_at = new Date().toISOString(); GC_STATS.ok_before_exhausted = GC_STATS.ok; } throw new Quota(`ai_exhausted ${r.headers.get('retry-after') || ''}`); }
  // 25/10: sau khi bể cạn GrabCast trả 409 no_provider cho mọi lượt ảnh → cũng là dừng sạch (đếm riêng)
  if (/no_provider/.test(JSON.stringify(j.detail || ''))) GC_STATS.no_provider++;
  if ([401, 403, 409].includes(r.status)) { GC_STATS.config = (GC_STATS.config || 0) + 1; throw new Quota(`config ${r.status} ${JSON.stringify(j.detail || j.error || '').slice(0, 120)}`); }
  if (r.status === 429 || quotaish(String(j.error && j.error.code || ''))) throw new Quota(`${r.status} ${JSON.stringify(j.error || '').slice(0, 120)}`);
  let job = j.job; if (!r.ok || !job) throw gcErr(`${r.status} ${JSON.stringify(j).slice(0, 160)}`, r);
  for (let i = 0; job.status !== 'done' && i < 30; i++) {   // GrabCast: tới 4 lần thử qua khoá/nhà, TB 10 s, tối đa ~24 s
   // việc ảnh thường xong ngay; chờ tối đa ~60 s (không thăm dò vô hạn)
    if (job.status === 'error' || job.status === 'failed' || job.error) { const m = String(job.error_code || job.error || job.status); if (/bad_request/.test(m) || /refused the image|Input prompt/i.test(String(job.error || job.message || ''))) { GC_STATS.safety++; throw new Safety('safety ' + m); } GC_STATS.job_err++; if (quotaish(m)) throw new Quota(m); throw new Error('job ' + m); }
    await new Promise(s => setTimeout(s, 3000));
    const pr = await fetch(`${GC}/api/owner-ai/image/${job.id}`, { headers: h }).catch(() => null);
    const pj = pr && pr.ok ? await pr.json().catch(() => null) : null; if (!pj || !pj.job) { GC_STATS.poll_err++; continue; } job = pj.job;
  }
  if (job.status !== 'done') { GC_STATS.timeout++; throw new Error('grabcast timeout'); }
  gcWaits = 0;
  const c = await fetch(`${GC}/api/owner-ai/image/${job.id}/content`, { headers: h }); if (!c.ok) { GC_STATS.content_err++; throw gcErr('content ' + c.status, c); }
  GC_STATS.ok++;
  // job trả provider + model thật đã vẽ → ghi vào log ảnh (scene-gen) và by_model (fill-report)
  const meta = { provider: job.provider || 'cloudflare', model: job.model || m || MODEL_DEFAULT }, mk = meta.provider + '|' + meta.model;
  GC_STATS.by_model[mk] = (GC_STATS.by_model[mk] || 0) + 1;
  const buf = Buffer.from(await c.arrayBuffer()); buf.meta = meta; return buf;
}

async function main() {
  const lex = rd('dist/lexicon.json'), sel = rd('content/lexicon/vimg-select.json').items, cards = rd('content/lexicon/vimg-cards.json').items;
  const ks = arg('keys'); const keys = ks && fs.existsSync(ks) ? (JSON.parse(fs.readFileSync(ks, 'utf8')).items || JSON.parse(fs.readFileSync(ks, 'utf8'))) : String(ks || '').split(',').filter(Boolean);
  fs.mkdirSync(path.join(OUT, 'raw'), { recursive: true });
  const logF = path.join(OUT, 'gen.json'), log = fs.existsSync(logF) ? JSON.parse(fs.readFileSync(logF, 'utf8')) : [];
  const used = Object.fromEntries(PROVIDERS.map(p => [p.id, 0])), dead = new Set(PROVIDERS.filter(p => !p.ok()).map(p => p.id));
  console.log('nhà cung cấp:', PROVIDERS.map(p => `${p.id}${dead.has(p.id) ? '(tắt)' : `≤${p.max}`}`).join(' · '));
  let n = 0, fail = 0, rr = 0;
  for (const k of keys) {
    const e = lex[k]; if (!e) { console.warn('bỏ (không có trong kho):', k); continue; }
    const file = path.join(OUT, 'raw', `${slug(k)}.a${ATT}.jpg`); if (fs.existsSync(file)) continue;
    const card = cards[k]; if (card && card.skip) { console.log('bỏ (thẻ skip):', k); continue; }
    if (!card && !process.argv.includes('--legacy')) { console.log('bỏ (chưa có thẻ – luật nghiêm):', k); continue; }
    const prompt = card ? promptFromCard(k, card, ATT) : promptFor(k, e, (sel[k] || [])[1], ATT);   // thẻ theo nghĩa (strict.mjs) bắt buộc; --legacy = prompt s1 cũ
    if (DRY) { console.log(k, '→', prompt.slice(-200)); continue; }
    let done = false;
    for (let t = 0; t < PROVIDERS.length && !done; t++) {
      const p = PROVIDERS[(rr + t) % PROVIDERS.length]; if (dead.has(p.id) || used[p.id] >= p.max) continue;
      const t0 = Date.now();
      try { const buf = await p.run(prompt); if (!isImg(buf)) throw new Error('không phải ảnh: ' + buf.slice(0, 60).toString().replace(/\s+/g, ' ')); fs.writeFileSync(file, buf); used[p.id]++; n++; done = true; log.push({ k, attempt: ATT, provider: p.id, ...(buf.meta ? { gc_provider: buf.meta.provider, model: buf.meta.model } : {}), ms: Date.now() - t0, bytes: buf.length, at: new Date().toISOString() }); }
      catch (err) { if (err instanceof Quota) { dead.add(p.id); console.warn(`⏸ ${p.id} hết hạn mức/không quyền: ${err.message}`); } else { console.warn(`✗ ${p.id} ${k}: ${err.message}`); log.push({ k, attempt: ATT, provider: p.id, error: err.message.slice(0, 200) }); } }
    }
    rr++;
    if (!done) { fail++; if (PROVIDERS.every(p => dead.has(p.id) || used[p.id] >= p.max)) { console.log('⏹ hết ngân sách miễn phí hôm nay – dừng sạch'); break; } }
  }
  fs.writeFileSync(logF, JSON.stringify(log, null, 1));
  console.log(`✓ vẽ ${n} ảnh (lần ${ATT}) · lỗi ${fail} · dùng ${JSON.stringify(used)} · ước neuron ${((used.grabcast + used.cf2 + used.main) * NEURONS_PER_IMG).toFixed(0)} (${NEURONS_PER_IMG}/ảnh)${GC_STATS.exhausted_at ? ` · bể CF cạn lúc ${GC_STATS.exhausted_at} sau ${GC_STATS.ok_before_exhausted} ảnh` : ''}`);
  if (!DRY && keys.length && n === 0 && !fs.readdirSync(path.join(OUT, 'raw')).length) process.exit(1);   // workflow tự đỏ khi = 0
}
if (path.resolve(process.argv[1] || '') === path.resolve(new URL(import.meta.url).pathname)) main();
