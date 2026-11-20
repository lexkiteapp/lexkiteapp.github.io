// Smoke SAU deploy production (lexkite.com): chờ bản deploy của commit xong → kiểm tuyến trang + API quan trọng.
//   node scripts/ops/smoke.mjs [--sha <commit>] [--wait] [--base https://lexkite.com] [--max-wait-min 25] [--no-alert]
// Lỗi → thoát 1, in ::error:: kèm LỆNH ROLLBACK (workflow đỏ → ci-triage mở issue ci-failure) + cảnh báo Quản trị (kind 'deploy'). KHÔNG tự rollback (docs/ROLLBACK.md §Vì sao không tự rollback).
import fs from 'fs';
import { execFileSync } from 'child_process';
import { arg, sleep, summary, alert } from './lib.mjs';
import { shellHash, liveHash } from '../lib/sw-version.mjs';
// Hash khung app của commit cần chờ: chỉ tính được khi bản checkout đúng commit đó ('' = không đối chiếu được)
const localHash = sha => { try { return execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim().startsWith(sha) ? shellHash('web') : ''; } catch { return ''; } };

export const PAGES = [['/', 'id="lk-route"'], ['/en/', 'hreflang="x-default"'], ['/vi/', '<html'], ['/app/', 'id="view"'], ['/vi/blog/', '<h2'], ['/en/blog/', 'Lexkite Blog'], ['/privacy', ''], ['/terms', ''], ['/sitemap.xml', '<loc>'], ['/robots.txt', 'Sitemap'], ['/sw.js', 'lexkite-'], ['/js/app.js', '']];
export const APIS = [ // [đường, phương thức, kiểm]
  ['/api/config', 'GET', async r => r.ok && typeof (await r.json()) === 'object'],
  ['/api/hit', 'POST', async r => r.status < 500],
  ['/api/sync', 'POST', async r => r.status === 401],               // token giả phải bị từ chối (không 5xx, không 200)
  ['/api/notices', 'GET', async r => r.status < 500], ['/api/league', 'GET', async r => r.status < 500], ['/api/quota', 'GET', async r => r.status < 500],
  ['/api/class', 'GET', async r => r.status < 500], ['/api/lexai', 'POST', async r => r.status < 500], ['/api/drive', 'POST', async r => r.status < 500],
  ['/packs/ja.json', 'GET', async r => r.ok && Object.keys(await r.json()).length > 7000],
  // Universal Links / App Links (scripts/test/deep-links.mjs): Apple/Google cần 200 + application/json, KHÔNG chuyển hướng
  ...['/.well-known/apple-app-site-association', '/.well-known/assetlinks.json'].map(p => [p, 'GET', async r => r.status === 200 && !r.redirected && /^application\/json/i.test((r.headers && r.headers.get('content-type')) || '') && typeof (await r.json()) === 'object']),
];
const CI = process.env.LEXKITE_CI_HEADER ? { 'X-Lexkite-CI': process.env.LEXKITE_CI_HEADER.trim() } : {};
async function get(url, o = {}) { for (let k = 0; k < 3; k++) { try { const r = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(20000), ...o, headers: { 'User-Agent': 'lexkite-smoke', ...CI, ...(o.headers || {}) } }); if (r.status < 500 || k === 2) return r; } catch (e) { if (k === 2) return { ok: false, status: 0, text: async () => '', json: async () => ({}) }; } await sleep(3000 * (k + 1)); } }
export async function runSmoke(base, { getter = get } = {}) {
  const bad = [], ok = [], t0 = Date.now();
  for (const [p, must] of PAGES) { const r = await getter(base + p); let m = r.ok ? true : 'HTTP ' + r.status; if (m === true && must) { const t = await r.text(); if (!t.includes(must)) m = `thiếu "${must}"`; } m === true ? ok.push(p) : bad.push(`${p}: ${m}`); }
  for (const [p, method, test] of APIS) { const r = await getter(base + p, method === 'GET' ? {} : { method, headers: p === '/api/sync' ? { Authorization: 'Bearer x.y.z', 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' }, body: p === '/api/sync' ? '{"op":"pull"}' : '{}' }); let m; try { m = (await test(r)) === true ? true : 'HTTP ' + r.status; } catch (e) { m = 'lỗi: ' + e.message; } m === true ? ok.push(p) : bad.push(`${p}: ${m}`); }
  return { ok, bad, ms: Date.now() - t0 };
}
const gj = async (url) => { const r = await fetch(url, { headers: { Authorization: 'Bearer ' + (process.env.GITHUB_TOKEN || ''), Accept: 'application/vnd.github+json', 'User-Agent': 'lexkite-smoke' } }); return r.ok ? r.json() : null; };
/** Chờ Cloudflare Pages build xong commit (check-run/status "Cloudflare Pages"). → 'success' | 'failure' | 'unknown'. */
export async function waitDeploy(sha, maxMin, base) {
  const repo = process.env.GITHUB_REPOSITORY || 'lexkiteapp/lexkiteapp.github.io', t0 = Date.now(); let seen = false;
  while (Date.now() - t0 < maxMin * 60e3) {
    const cr = await gj(`https://api.github.com/repos/${repo}/commits/${sha}/check-runs?per_page=100`), st = await gj(`https://api.github.com/repos/${repo}/commits/${sha}/status`);
    const run = ((cr && cr.check_runs) || []).find(c => /cloudflare|pages/i.test(c.name) || /cloudflare/i.test((c.app && c.app.slug) || '')), s = ((st && st.statuses) || []).find(x => /cloudflare|pages/i.test(x.context));
    if (run) { seen = true; if (run.status === 'completed') return run.conclusion === 'success' ? 'success' : 'failure'; }
    else if (s) { seen = true; if (s.state === 'success') return 'success'; if (s.state === 'failure' || s.state === 'error') return 'failure'; }
    else if (Date.now() - t0 > 6 * 60e3 && !seen) { // 6 phút không thấy check Cloudflare → đối chiếu sw.js live với repo tại commit
      try { const want = localHash(sha), live = liveHash(await (await get(base + '/sw.js?x=' + Date.now())).text()); if (want && live === want) return 'unknown'; } catch { /* tiếp tục chờ */ } // hash nội dung (scripts/lib/sw-version.mjs) – web/sw.js giữ CACHE cố định
    }
    await sleep(20000);
  }
  return 'timeout';
}
/** 06/11: Pages gom deploy 180 phút (chế độ hook) → commit mới chưa lên site khi smoke chờ hết hạn ('timeout'); site live là bản TRƯỚC nên tuyến/nội dung mới của commit này 404/thiếu – không phải sự cố. Thuần: tách lỗi mềm (404 / thiếu nội dung = chưa deploy) khỏi lỗi cứng (5xx, hết giờ, lỗi mạng = site hỏng thật, vẫn đỏ). */
export function splitUndeployed(bad) { const soft = [], hard = []; for (const b of bad) (/: (HTTP 404|thiếu )/.test(b) ? soft : hard).push(b); return { soft, hard }; }
export function prevTag(cur) { // tag prod-* ngay trước bản hiện tại (theo ngày tạo)
  try { const t = execFileSync('git', ['tag', '--list', 'prod-2*', '--sort=-creatordate'], { encoding: 'utf8' }).split('\n').filter(Boolean); const i = t.findIndex(x => cur && x.endsWith('-' + String(cur).slice(0, 7))); return t[i + 1] || (i < 0 ? t[1] : '') || ''; } catch { return ''; }
}
async function main() {
  const A = process.argv.slice(2), base = arg(A, 'base', 'https://lexkite.com'), sha = arg(A, 'sha', process.env.GITHUB_SHA || ''), noAlert = A.includes('--no-alert');
  let note = '';
  if (A.includes('--wait') && sha) {
    const w = await waitDeploy(sha, +arg(A, 'max-wait-min', 25), base); console.log('Cloudflare Pages build: ' + w);
    if (w === 'failure') { note = 'Cloudflare Pages build commit ' + sha.slice(0, 7) + ' THẤT BẠI (bản cũ vẫn đang phục vụ – không cần rollback; sửa lỗi build rồi push)'; console.log(`::error::${note}`); summary('### ❌ ' + note); if (!noAlert) await alert('deploy', false, note); return 1; }
    if (w === 'timeout') note = 'không thấy deploy của commit sau khi chờ – kiểm tay dash.cloudflare.com › Pages › lexkite';
  }
  const r = await runSmoke(base), rb = prevTag(sha), cmd = `bash scripts/ops/rollback-pages.sh ${rb || 'previous'}`;
  const out = `### ${r.bad.length ? '❌' : '✅'} Smoke ${base} · ${r.ok.length} đạt · ${r.bad.length} lỗi · ${(r.ms / 1000).toFixed(0)}s${sha ? ' · ' + sha.slice(0, 7) : ''}\n` + (r.bad.length ? r.bad.map(b => '- ❌ ' + b).join('\n') + `\n\n**Khôi phục (cần chủ OK, KHÔNG tự chạy):** \`${cmd}\` · xem trước: \`${cmd} --dry-run\` · hướng dẫn: docs/ROLLBACK.md` : '- mọi tuyến + API quan trọng đạt') + (note ? '\n- ⚠ ' + note : '');
  summary(out);
  if (r.bad.length && /không thấy deploy/.test(note)) { const { soft, hard } = splitUndeployed(r.bad); if (!hard.length) { console.log(`::warning::commit ${sha.slice(0, 7)} chưa lên site (Pages gom deploy) → ${soft.length} tuyến mới 404/thiếu bị bỏ qua, KHÔNG xác minh được; không dời prod-good/OTA. ${soft.slice(0, 3).join(' | ')}`); summary('### ⏭️ Smoke: commit chưa deploy (Pages gom 180 phút) – chưa xác minh, không dời prod-good'); if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, 'verified=false\n'); return 0; } }
  if (r.bad.length) { console.log(`::error::Smoke production lỗi ${r.bad.length}/${r.ok.length + r.bad.length}: ${r.bad.slice(0, 4).join(' | ')}`); console.log(`::error::ROLLBACK (cần chủ OK): ${cmd}`); if (!noAlert) await alert('deploy', false, `Smoke production lỗi (${r.bad.length}): ${r.bad[0]} · rollback: ${cmd}`); return 1; }
  if (!noAlert) await alert('deploy', true, 'ok');
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, 'verified=true\n');
  return 0;
}
if (process.argv[1] && process.argv[1].endsWith('smoke.mjs')) main().then(c => process.exit(c)).catch(e => { console.error('✗ ' + e.message); process.exit(1); });
