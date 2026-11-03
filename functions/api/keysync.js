/* Đồng bộ kho khóa miễn phí của CI (secret GitHub GEMINI_POOL / GROQ_POOL – chủ nạp 30/10) vào kho khóa MÃ HÓA của site (_keys.js)
 * để chuỗi AI người dùng (_aichain.js) dùng được – docs/AI-CHAIN.md §Khóa. Nguyên nhân gốc 03/11: site chỉ có 1 khóa Gemini (chết 403 từ 24/10),
 * 0 khóa Groq, trong khi 85 + 109 khóa chỉ nằm ở GitHub → mọi lượt rơi về Llama 8B.
 * Gọi DUY NHẤT từ workflow .github/workflows/ai-keys-sync.yml trên nhánh main của repo thật: JWT OIDC GitHub (aud 'lexkite-keysync',
 * job_workflow_ref đúng file đó @refs/heads/main) – người lạ / PR / nhánh khác → 401. Không bao giờ trả về hay ghi log giá trị khóa.
 * POST { provider: 'gemini'|'groq', keys: [string] } → { added, kept, removed, total }
 * Khóa đã có (trùng dấu vân tay, kể cả nhập tay) → giữ nguyên trạng thái; khóa do lần đồng bộ trước thêm mà nay không còn trong secret → xóa. */
import { verifyOidc } from './lexai.js';
import * as K from './_keys.js';

const AUD = 'lexkite-keysync', WF = 'lexkiteapp/lexkiteapp.github.io/.github/workflows/ai-keys-sync.yml@refs/heads/main', NOTE = 'ci-sync', MAX = 400;
const out = (status, data) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
/** claims hợp lệ cho đồng bộ khóa? (thuần – test được) */
export const allowed = c => !!c && c.ref === 'refs/heads/main' && c.job_workflow_ref === WF && c.event_name !== 'pull_request' && c.event_name !== 'pull_request_target';

export async function onRequestPost({ request, env }) {
  const c = await verifyOidc((request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, ''), Date.now(), AUD).catch(() => null);
  if (!allowed(c)) return out(401, { error: 'auth' });
  if (!env.DB || !K.encReady(env)) return out(500, { error: 'not-configured' });
  let b; try { b = await request.json(); } catch (e) { return out(400, { error: 'json' }); }
  const provider = b && b.provider;
  if (provider !== 'gemini' && provider !== 'groq') return out(400, { error: 'provider' });
  const re = K.PROVIDERS[provider].re, keys = [...new Set((Array.isArray(b.keys) ? b.keys : []).map(k => K.cleanKey(k)).filter(k => re.test(k)))].slice(0, MAX);
  if (!keys.length) return out(400, { error: 'empty' }); // secret rỗng/hỏng → không xóa gì
  await K.setupKeys(env.DB);
  const rows = (await env.DB.prepare('SELECT id, fp, notes FROM api_keys WHERE provider = ?').bind(provider).all()).results || [];
  const have = new Set(rows.map(r => r.fp)), now = Date.now(), want = new Set(), vals = [];
  let kept = 0;
  for (let i = 0; i < keys.length; i++) {
    const v = keys[i], fp = await K.fingerprint(v); want.add(fp);
    if (have.has(fp)) { kept++; continue; }
    have.add(fp);
    const id = K.newId();
    vals.push([id, provider, `${provider.toUpperCase()}_POOL #${i + 1}`, await K.encryptKey(env, id, v), v.slice(-4), now, fp, NOTE]);
  }
  // D1 miễn phí: ≤ 50 truy vấn/lượt và ≤ 100 tham số/câu → INSERT nhiều dòng, 12 dòng × 8 tham số mỗi câu
  const stm = [];
  for (let i = 0; i < vals.length; i += 12) { const ch = vals.slice(i, i + 12);
    stm.push(env.DB.prepare(`INSERT INTO api_keys (id, provider, label, enc_key, last4, status, weight, added_by, created, source, fp, notes) VALUES ${ch.map(() => "(?, ?, ?, ?, ?, 'live', 100, 'ci:ai-keys-sync', ?, 'db', ?, ?)").join(', ')}`).bind(...ch.flat())); }
  const gone = rows.filter(r => r.notes === NOTE && !want.has(r.fp)).map(r => r.id);
  for (let i = 0; i < gone.length; i += 90) { const ch = gone.slice(i, i + 90); stm.push(env.DB.prepare(`DELETE FROM api_keys WHERE id IN (${ch.map(() => '?').join(', ')})`).bind(...ch)); }
  if (stm.length) await env.DB.batch(stm);
  const added = vals.length;
  K.resetPool();
  return out(200, { provider, added, kept, removed: gone.length, total: keys.length });
}
