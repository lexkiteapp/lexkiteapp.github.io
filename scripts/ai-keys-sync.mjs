// Đẩy kho khóa CI (secret GEMINI_POOL / GROQ_POOL) vào kho khóa mã hóa của site qua /api/keysync (OIDC GitHub) – docs/AI-CHAIN.md §Khóa.
// Chỉ chạy trên CI (workflow ai-keys-sync.yml, nhánh main). Không bao giờ in khóa: chỉ in số lượng.
import { parseKeys } from './lib/key-pool.mjs';
const env = process.env, URL_ = env.KEYSYNC_URL || 'https://lexkite.com/api/keysync';
if (!env.CI) { console.error('chỉ chạy trên CI'); process.exit(2); }
const u = env.ACTIONS_ID_TOKEN_REQUEST_URL, t = env.ACTIONS_ID_TOKEN_REQUEST_TOKEN;
if (!u || !t) { console.error('thiếu OIDC (permissions: id-token: write)'); process.exit(1); }
const token = (await (await fetch(u + '&audience=lexkite-keysync', { headers: { Authorization: 'Bearer ' + t } })).json()).value;
let bad = 0;
for (const [provider, raw] of [['gemini', env.GEMINI_POOL], ['groq', env.GROQ_POOL]]) {
  const keys = parseKeys(raw, provider);
  if (!keys.length) { console.log(`· ${provider}: secret rỗng – bỏ qua (không xóa gì)`); continue; }
  const h = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token, 'User-Agent': 'lexkite-ci' };
  if (env.LEXKITE_CI_HEADER) h['X-Lexkite-CI'] = env.LEXKITE_CI_HEADER;
  const r = await fetch(URL_, { method: 'POST', headers: h, body: JSON.stringify({ provider, keys }) }).catch(e => ({ ok: false, status: 0, text: async () => String(e.message) }));
  const j = r.ok ? await r.json() : { error: r.status + ' ' + String(await r.text()).slice(0, 120) };
  console.log(`${r.ok ? '✓' : '✗'} ${provider}: ${keys.length} khóa trong secret → ${JSON.stringify(j)}`);
  if (!r.ok) bad++;
}
process.exit(bad ? 1 : 0);
