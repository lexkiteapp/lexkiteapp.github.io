// Cổng 3 (vật thừa / chữ vô nghĩa / người thừa) – móc AI thị giác DÙNG LẠI chuỗi nhà cung cấp của kho nhân vật (scripts/video/library.mjs:
// Workers AI llama-4-scout → Gemini; token CLOUDFLARE_API_TOKEN hoặc ~/.config/lexkite/cf-token, khoá GEMINI_KEYS). Không có nhà cung cấp nào
// trả lời hợp lệ → SKIP + needsHumanReview (không bao giờ tự PASS). Cache theo sha256 ảnh + phiên bản prompt.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { cfVisionProvider, geminiVisionProvider, CF_VISION, CF_ACCOUNT } from '../library.mjs';

export const CINE_VISION_VER = 'cine-v1';
export const CINE_PROMPT = ({ scene, cast, n, times }) => `You are a strict QA reviewer for frames of a short cartoon video.
Scene: ${scene}. The ONLY characters allowed: ${cast.map(c => `${c.name} (${c.look})`).join('; ')}.
The image contains ${n} frame(s) placed side by side, left to right${times && times.length ? ` (times ${times.join('s, ')}s)` : ''}.
For EACH frame report only what you actually see:
 - "stray_objects": true if something does not belong (floating, duplicated, melted or half-merged objects, extra hands, extra cups appearing from nowhere)
 - "gibberish_text": true if ANY visible letters/words are not real readable English (signs, chalkboards, cups, screens). Pure decorative scribbles that do not look like letters are fine.
 - "extra_people": true if a person other than the allowed characters is visible
 - "anatomy_ok": false if a face, hand or limb is distorted
Reply with ONE JSON object and nothing else:
{"frames":[{"index":1,"stray_objects":false,"gibberish_text":false,"extra_people":false,"anatomy_ok":true,"issues":["short description"]}]}`;

/** → {frames:[{index, bad:boolean, issues[]}]} hoặc null (sai schema). Exported để test. */
export function parseCineVision(raw, n) {
  let v = raw;
  if (typeof v === 'string') { const s = v.replace(/```(?:json)?/gi, ''), a = s.indexOf('{'), b = s.lastIndexOf('}'); if (a < 0 || b <= a) return null; try { v = JSON.parse(s.slice(a, b + 1)); } catch { return null; } }
  if (!v || !Array.isArray(v.frames) || !v.frames.length) return null;
  const frames = [];
  for (const f of v.frames.slice(0, n || 9)) {
    if (!f || ['stray_objects', 'gibberish_text', 'extra_people'].some(k => typeof f[k] !== 'boolean') || typeof f.anatomy_ok !== 'boolean') return null;
    const issues = [];
    if (f.stray_objects) issues.push('vật thừa'); if (f.gibberish_text) issues.push('chữ vô nghĩa'); if (f.extra_people) issues.push('người thừa'); if (!f.anatomy_ok) issues.push('méo mặt/tay');
    frames.push({ index: +f.index || frames.length + 1, bad: issues.length > 0, issues: issues.concat(Array.isArray(f.issues) && issues.length ? f.issues.map(x => String(x).slice(0, 100)).slice(0, 3) : []) });
  }
  return { frames };
}

function cfToken() {
  if (process.env.CLOUDFLARE_API_TOKEN || process.env.CF_AI_TOKEN) return process.env.CLOUDFLARE_API_TOKEN || process.env.CF_AI_TOKEN; // CI: secret CF_AI_TOKEN (như library-ingest.yml)
  try { return fs.readFileSync(path.join(os.homedir(), '.config/lexkite/cf-token'), 'utf8').trim(); } catch { return ''; }
}

/** img = JPEG ≤ 768 px (1 khung hoặc bảng nhiều khung ngang). → {status, reasons, perFrame:[{t, issues}], provider} */
export async function visionReview(img, ctx, { cacheFile, chain, deps: depsIn } = {}) {
  if (process.env.CINE_VISION === 'off') return { status: 'SKIP', reasons: ['AI thị giác tắt (CINE_VISION=off)'], perFrame: [] };
  const buf = fs.readFileSync(img), prompt = CINE_PROMPT(ctx), key = `${CINE_VISION_VER}:${crypto.createHash('sha256').update(buf).update(prompt).digest('hex')}`;
  let store = {}; try { store = cacheFile ? JSON.parse(fs.readFileSync(cacheFile, 'utf8')) : {}; } catch { /* trống */ }
  let hit = store[key], provider = hit && hit.provider + ' (cache)', parsed = hit && hit.v, tried = [];
  if (!parsed) {
    const deps = depsIn || { fetch, cfToken: cfToken(), cfAccount: process.env.CF_ACCOUNT_ID || CF_ACCOUNT, geminiKeys: () => (process.env.GEMINI_KEYS || '').split(',').map(s => s.trim()).filter(Boolean) };
    for (const p of chain || [cfVisionProvider(CF_VISION.scout), geminiVisionProvider]) {
      try { parsed = parseCineVision(await p.run({ prompt, b64: buf.toString('base64') }, deps), ctx.n); if (parsed) { provider = p.name; break; } tried.push(p.name + ': JSON sai schema'); } catch (e) { tried.push(String(e.message).slice(0, 100)); }
    }
    if (parsed && cacheFile) { store[key] = { v: parsed, provider, at: new Date().toISOString().slice(0, 10) }; fs.mkdirSync(path.dirname(cacheFile), { recursive: true }); fs.writeFileSync(cacheFile, JSON.stringify(store, null, 1)); }
  }
  if (!parsed) return { status: 'SKIP', reasons: ['AI thị giác không trả kết quả hợp lệ – cần duyệt tay', ...tried.slice(0, 3)], perFrame: [] };
  const perFrame = parsed.frames.map((f, i) => ({ t: (ctx.times || [])[i] ?? i, issues: f.issues }));
  const bad = parsed.frames.filter(f => f.bad);
  return { status: bad.length ? 'FAIL' : 'PASS', reasons: bad.map(f => `khung ${f.index}: ${f.issues.join(', ')}`), perFrame, provider };
}
