#!/usr/bin/env node
// Canary AI người dùng (23/11, điều phối: "người dùng luôn được ưu tiên quota AI"): vài lời gọi /api/ai THẬT mỗi 3 giờ. Quá 5 % lỗi/rơi xuống tier thấp → job đỏ;
// đỏ 2 lượt liền → mở issue `ai-canary` (tự đóng khi xanh). Lời gọi bị 429 quota (hạn mức khách của IP runner) = KHÔNG ĐO ĐƯỢC, không tính lỗi.
// Bổ sung cho cảnh báo `ai:weak` ngay trong site (docs/AI-CHAIN.md §5) – cái đó chỉ chạy khi có người dùng và gửi thư; canary chạy cả khi vắng người.
//   node scripts/ci/ai-canary.mjs [--dry] [--n 4]     Env: GITHUB_TOKEN, GITHUB_REPOSITORY, SITE (mặc định https://lexkite.com)
import { isMain } from '../lib/is-main.mjs';
import { ghFetch } from '../lib/retry5xx.mjs';

export const MAX_BAD_RATE = 0.05, LABEL = 'ai-canary', TITLE = 'AI người dùng yếu/lỗi > 5 % (canary)';
const WORDS = ['resilient', 'meticulous', 'ephemeral', 'candid', 'pragmatic', 'tenacious', 'lucid', 'prudent'];
/** Hàm thuần: kết quả 1 lời gọi → 'ok' | 'bad' | 'skip'. skip = hạn mức khách/không đo được (429 quota). */
export function classify(status, body) {
  if (status === 429 && body && body.error === 'quota' && !/busy/.test(String(body.msg || ''))) return 'skip';   // quota.busy = AI báo bận → thật sự lỗi
  if (status !== 200 || !body || !body.out) return 'bad';
  return body.tier && body.tier !== 'high' ? 'bad' : 'ok';
}
/** Hàm thuần: danh sách 'ok'|'bad'|'skip' → { measured, bad, rate, red }. Không đo được lời nào → không đỏ (không phán khi mù). */
export function verdict(rs) { const m = rs.filter(r => r !== 'skip'), bad = m.filter(r => r === 'bad').length, rate = m.length ? bad / m.length : 0; return { measured: m.length, bad, rate, red: m.length > 0 && rate > MAX_BAD_RATE }; }
/** Hàm thuần: mở issue khi đỏ lần này VÀ lượt canary trước cũng đỏ; không mở lặp. */
export const shouldOpen = (red, prevRed, hasOpen) => red && prevRed && !hasOpen;

async function main() {
  const a = process.argv.slice(2), dry = a.includes('--dry'), n = +(a[a.indexOf('--n') + 1]) || 4, site = process.env.SITE || 'https://lexkite.com';
  const repo = process.env.GITHUB_REPOSITORY, tok = process.env.GITHUB_TOKEN;
  const api = async (p, init = {}) => { const r = await ghFetch(`https://api.github.com/repos/${repo}${p}`, { ...init, headers: { Authorization: 'Bearer ' + tok, Accept: 'application/vnd.github+json', ...(init.body ? { 'content-type': 'application/json' } : {}) } }); return { status: r.status, json: await r.json().catch(() => null) }; };
  const rs = [], day = new Date().toISOString().slice(0, 13);
  for (let i = 0; i < n; i++) {
    const w = WORDS[(Math.floor(Date.now() / 36e5) + i) % WORDS.length];
    const prompt = `Canary ${day}-${i}: explain the English word "${w}" simply for a Vietnamese learner, with one example sentence.`;
    const r = await fetch(`${site}/api/ai`, { method: 'POST', headers: { 'content-type': 'application/json', 'user-agent': 'lexkite-ci-canary' }, body: JSON.stringify({ task: 'explain', prompt }) }).catch(() => null);
    const body = r ? await r.json().catch(() => null) : null, c = r ? classify(r.status, body) : 'bad';
    rs.push(c); console.log(`canary ${i + 1}/${n}: HTTP ${r ? r.status : 'lỗi mạng'} model=${body && body.model} tier=${body && body.tier} → ${c}`);
  }
  const v = verdict(rs); console.log(`canary: đo ${v.measured}/${n}, lỗi/yếu ${v.bad} (${Math.round(v.rate * 100)} %, ngưỡng ${MAX_BAD_RATE * 100} %) → ${v.red ? 'ĐỎ' : 'xanh'}`);
  if (repo && tok && !dry) {
    const open = ((await api(`/issues?state=open&labels=${LABEL}&per_page=20`)).json || []).filter(i => !i.pull_request && i.title === TITLE)[0];
    const prev = ((await api('/actions/workflows/ai-canary.yml/runs?status=completed&per_page=1')).json || {}).workflow_runs || [];
    await api('/labels', { method: 'POST', body: JSON.stringify({ name: LABEL, color: 'fbca04' }) });
    if (shouldOpen(v.red, prev.length > 0 && prev[0].conclusion === 'failure', !!open)) await api('/issues', { method: 'POST', body: JSON.stringify({ title: TITLE, labels: [LABEL], body: `Canary /api/ai: ${v.bad}/${v.measured} lời gọi lỗi hoặc rơi xuống tier thấp (> ${MAX_BAD_RATE * 100} %), 2 lượt liền. Kiểm kho khoá Gemini/Groq (docs/AI-CHAIN.md), việc nền đang ăn quota (docs/QUOTAS.md), cảnh báo ai:weak trong Quản trị.\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)` }) });
    else if (!v.red && open) { await api(`/issues/${open.number}/comments`, { method: 'POST', body: JSON.stringify({ body: 'Canary xanh lại → tự đóng.' }) }); await api(`/issues/${open.number}`, { method: 'PATCH', body: JSON.stringify({ state: 'closed' }) }); }
  }
  process.exit(v.red ? 1 : 0);
}
if (isMain(import.meta.url)) main().catch(e => { console.error(e); process.exit(1); });
