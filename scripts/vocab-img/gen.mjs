#!/usr/bin/env node
// Vẽ ảnh minh hoạ từ vựng – CHỈ dịch vụ miễn phí, ưu tiên thấp nhất (việc nền `vocab-img`, infra/jobs.json).
//   node scripts/vocab-img/gen.mjs --keys <file.json|k1,k2> --out <dir> [--attempt 1|2] [--dry-run]
// Nhà cung cấp (thứ tự; mỗi nhà có trần ảnh/ngày suy từ neuron miễn phí – 1 ảnh 1024² 4 bước = 172,8 neuron):
//   cf2      Workers AI tài khoản 2 (REST, env CF_AI_TOKEN_2 + CF_ACCOUNT_2; quyền token: Account › Workers AI › Read + Edit)   VIMG_MAX_CF2 (mặc định 50 ≈ 8.640 neuron)
//   grabcast GrabCast owner-ai /api/owner-ai/image provider=cloudflare (env GRABCAST_AI_KEY)                                   VIMG_MAX_GC  (mặc định 40)
//   main     Workers AI tài khoản chính – qua /api/studio op imageGen (env STUDIO_CALLBACK_SECRET, binding AI của Pages) hoặc REST (CF_AI_TOKEN_1 + CF_ACCOUNT_1)
//            VIMG_MAX_MAIN (mặc định 5 ≈ 860 neuron: chừa script-bank 4.000 + news-auto 3.000 + AI người dùng; người dùng luôn trước)
// Hết hạn mức (429 / 4006 / quota) → bỏ nhà đó tới hết lượt chạy, KHÔNG thử lại vòng lặp. Ghi <out>/gen.json.
import fs from 'fs';
import path from 'path';
import { promptFor } from './style.mjs';

const arg = n => { const i = process.argv.indexOf('--' + n); return i > 0 ? process.argv[i + 1] : undefined; };
const OUT = arg('out') || 'out/vocab-img', ATT = +(arg('attempt') || 1), DRY = process.argv.includes('--dry-run');
const ROOT = new URL('../../', import.meta.url), rd = p => JSON.parse(fs.readFileSync(new URL(p, ROOT), 'utf8'));
export const slug = k => k.replace(/#/g, '__').replace(/[^a-zA-Z0-9_-]+/g, '-');
const FLUX = '@cf/black-forest-labs/flux-1-schnell';
const env = process.env;

export const PROVIDERS = [
  { id: 'cf2', max: +(env.VIMG_MAX_CF2 || 50), ok: () => env.CF_AI_TOKEN_2 && env.CF_ACCOUNT_2, run: p => cfRest(env.CF_ACCOUNT_2, env.CF_AI_TOKEN_2, p) },
  { id: 'grabcast', max: +(env.VIMG_MAX_GC || 40), ok: () => env.GRABCAST_AI_KEY, run: grabcast },
  { id: 'main', max: +(env.VIMG_MAX_MAIN || 5), ok: () => (env.CF_AI_TOKEN_1 && env.CF_ACCOUNT_1) || env.STUDIO_CALLBACK_SECRET,
    run: p => (env.CF_AI_TOKEN_1 ? cfRest(env.CF_ACCOUNT_1, env.CF_AI_TOKEN_1, p) : studio(p)) },
];
class Quota extends Error {}
const quotaish = s => /4006|429|quota|neuron|exceeded|rate.?limit|daily/i.test(s);
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
const GC = String(env.GRABCAST_API_BASE || 'https://grabcast-api-342720596878.us-central1.run.app').replace(/\/+$/, '');
async function grabcast(prompt) {
  const h = { 'X-API-Key': env.GRABCAST_AI_KEY, 'Content-Type': 'application/json' };
  const r = await fetch(GC + '/api/owner-ai/image', { method: 'POST', headers: h, body: JSON.stringify({ prompt, provider: 'cloudflare' }) });
  const j = await r.json().catch(() => ({}));
  if (r.status === 429 || quotaish(String(j.error && j.error.code || ''))) throw new Quota(`${r.status} ${JSON.stringify(j.error || '').slice(0, 120)}`);
  let job = j.job; if (!r.ok || !job) throw new Error(`${r.status} ${JSON.stringify(j).slice(0, 160)}`);
  for (let i = 0; job.status !== 'done' && i < 20; i++) {   // việc ảnh thường xong ngay; chờ tối đa ~60 s (không thăm dò vô hạn)
    if (job.status === 'error' || job.error) { const m = String(job.error_code || job.error); if (quotaish(m)) throw new Quota(m); throw new Error(m); }
    await new Promise(s => setTimeout(s, 3000));
    job = (await (await fetch(`${GC}/api/owner-ai/image/${job.id}`, { headers: h })).json()).job;
  }
  if (job.status !== 'done') throw new Error('grabcast timeout');
  const c = await fetch(`${GC}/api/owner-ai/image/${job.id}/content`, { headers: h }); if (!c.ok) throw new Error('content ' + c.status);
  return Buffer.from(await c.arrayBuffer());
}

async function main() {
  const lex = rd('dist/lexicon.json'), sel = rd('content/lexicon/vimg-select.json').items;
  const ks = arg('keys'); const keys = ks && fs.existsSync(ks) ? (JSON.parse(fs.readFileSync(ks, 'utf8')).items || JSON.parse(fs.readFileSync(ks, 'utf8'))) : String(ks || '').split(',').filter(Boolean);
  fs.mkdirSync(path.join(OUT, 'raw'), { recursive: true });
  const logF = path.join(OUT, 'gen.json'), log = fs.existsSync(logF) ? JSON.parse(fs.readFileSync(logF, 'utf8')) : [];
  const used = Object.fromEntries(PROVIDERS.map(p => [p.id, 0])), dead = new Set(PROVIDERS.filter(p => !p.ok()).map(p => p.id));
  console.log('nhà cung cấp:', PROVIDERS.map(p => `${p.id}${dead.has(p.id) ? '(tắt)' : `≤${p.max}`}`).join(' · '));
  let n = 0, fail = 0, rr = 0;
  for (const k of keys) {
    const e = lex[k]; if (!e) { console.warn('bỏ (không có trong kho):', k); continue; }
    const file = path.join(OUT, 'raw', `${slug(k)}.a${ATT}.jpg`); if (fs.existsSync(file)) continue;
    const prompt = promptFor(k, e, (sel[k] || [])[1], ATT);
    if (DRY) { console.log(k, '→', prompt.slice(-200)); continue; }
    let done = false;
    for (let t = 0; t < PROVIDERS.length && !done; t++) {
      const p = PROVIDERS[(rr + t) % PROVIDERS.length]; if (dead.has(p.id) || used[p.id] >= p.max) continue;
      const t0 = Date.now();
      try { const buf = await p.run(prompt); fs.writeFileSync(file, buf); used[p.id]++; n++; done = true; log.push({ k, attempt: ATT, provider: p.id, ms: Date.now() - t0, bytes: buf.length, at: new Date().toISOString() }); }
      catch (err) { if (err instanceof Quota) { dead.add(p.id); console.warn(`⏸ ${p.id} hết hạn mức/không quyền: ${err.message}`); } else { console.warn(`✗ ${p.id} ${k}: ${err.message}`); log.push({ k, attempt: ATT, provider: p.id, error: err.message.slice(0, 200) }); } }
    }
    rr++;
    if (!done) { fail++; if (PROVIDERS.every(p => dead.has(p.id) || used[p.id] >= p.max)) { console.log('⏹ hết ngân sách miễn phí hôm nay – dừng sạch'); break; } }
  }
  fs.writeFileSync(logF, JSON.stringify(log, null, 1));
  console.log(`✓ vẽ ${n} ảnh (lần ${ATT}) · lỗi ${fail} · dùng ${JSON.stringify(used)} · ước neuron cf ${((used.cf2 + used.main) * 172.8).toFixed(0)}`);
  if (!DRY && keys.length && n === 0 && !fs.readdirSync(path.join(OUT, 'raw')).length) process.exit(1);   // workflow tự đỏ khi = 0
}
if (path.resolve(process.argv[1] || '') === path.resolve(new URL(import.meta.url).pathname)) main();
