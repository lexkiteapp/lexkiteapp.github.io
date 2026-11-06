// Rà soát bản LIVE (chạy hằng ngày trong .github/workflows/health.yml): trang chính, API, dữ liệu, âm thanh, phiên bản.
// Không cần khóa; lỗi nào cũng in ra và exit 1 → workflow đỏ → bản tin email 8h sáng (workers/mail) báo về.
import fs from 'fs';
import { shellHash, liveHash } from '../lib/sw-version.mjs';
import { readIndex } from '../sentence-audio/lib.mjs'; // audio-index.js dạng nén – chạy tệp
export const SW_GRACE_MIN = 200;
// phút kể từ lượt Pages deploy THÀNH CÔNG gần nhất (null = không hỏi được API)
export const deployLagMin = async (f = fetch, env = process.env) => { try { const r = await f(`https://api.github.com/repos/${env.GITHUB_REPOSITORY || 'lexkiteapp/lexkiteapp.github.io'}/actions/workflows/pages-deploy.yml/runs?status=success&per_page=1`, { headers: { 'User-Agent': 'lexkite-health', Accept: 'application/vnd.github+json', ...(env.GITHUB_TOKEN ? { Authorization: 'Bearer ' + env.GITHUB_TOKEN } : {}) } }); const j = await r.json(); const t = j.workflow_runs && j.workflow_runs[0] && Date.parse(j.workflow_runs[0].updated_at); return t ? Math.round((Date.now() - t) / 60000) : null; } catch { return null; } };
const B = 'https://lexkite.com', bad = [], ok = [];
// Header CI (secret LEXKITE_CI_HEADER): qua WAF + thống kê truy cập tự đếm là máy tự động (functions/api/hit.js) – không in giá trị
const CI = process.env.LEXKITE_CI_HEADER ? { 'X-Lexkite-CI': process.env.LEXKITE_CI_HEADER.trim() } : {};
const get = async (u, o = {}) => { for (let k = 0; k < 3; k++) { try { const r = await fetch(u, { redirect: 'follow', ...o, headers: { 'User-Agent': 'lexkite-health', ...CI } }); return r; } catch (e) { await new Promise(r => setTimeout(r, 3000)); } } return { ok: false, status: 0, text: async () => '' }; };
const check = async (name, fn) => { try { const m = await fn(); m === true || m === undefined ? ok.push(name) : bad.push(`${name}: ${m}`); } catch (e) { bad.push(`${name}: ${e.message}`); } };
const page = (p, must) => check(p, async () => { const r = await get(B + p); if (!r.ok) return 'HTTP ' + r.status; const t = await r.text(); return !must || t.includes(must) || `thiếu "${must}"`; });
const json = (p, test) => check(p, async () => { const r = await get(B + p); if (!r.ok) return 'HTTP ' + r.status; const j = await r.json(); return test ? test(j) : true; });

await page('/vi/', 'id="lk-route"'); await page('/en/', 'hreflang="x-default"'); await page('/app/', 'id="view"'); // trang giới thiệu (/, /<lang>/) + app học (/app/)
await page('/vi/blog/', '<h2'); await page('/en/blog/', 'Lexkite Blog');
await page('/privacy'); await page('/terms'); await page('/ja/privacy'); await page('/sitemap.xml', '<loc>'); await page('/robots.txt', 'Sitemap');
await check('sw.js = bản mới nhất', async () => { const live = liveHash(await (await get(B + '/sw.js?x=' + Date.now())).text()), local = shellHash('web'); if (live === local) return true; const lag = await deployLagMin(); /* Pages gom deploy 180' (PAGES_DEPLOY=hook): repo đi trước live ≤ 200' là bình thường, quá thế mới là kẹt */ if (lag != null && lag < SW_GRACE_MIN) { console.log(`⚠ sw.js live ${live || '?'} ≠ repo ${local} nhưng lượt Pages deploy thành công gần nhất cách đây ${lag}' (< ${SW_GRACE_MIN}') – đợi lượt gom kế`); return true; } return `live ${live || '?'} ≠ repo ${local} (deploy Cloudflare kẹt? lượt Pages deploy xanh gần nhất: ${lag == null ? 'không rõ' : lag + "'"})`; }); // hash nội dung (scripts/lib/sw-version.mjs) – web/sw.js giữ CACHE cố định
for (const f of ['js/app.js', 'js/qengine.js', 'js/toeic/reading1.js', 'js/listen/test1.js', 'img/toeic/t1-p1-1.jpg']) await page('/' + f);
await json('/api/config');
await check('/api/hit (POST)', async () => { const r = await get(B + '/api/hit', { method: 'POST', body: '{}' }); return r.status < 500 || 'HTTP ' + r.status; });
await check('/api/sync từ chối token giả', async () => { const r = await get(B + '/api/sync', { method: 'POST', headers: { Authorization: 'Bearer x.y.z' }, body: '{"op":"pull"}' }); return r.status === 401 || 'HTTP ' + r.status; });
for (const l of ['ja', 'ar']) { await json(`/packs/${l}.json`, j => Object.keys(j).length > 7000 || 'quá ít từ'); await json(`/i18n/explain/${l}.json`, j => Object.keys(j).length > 2000 || 'quá ít lời giải'); }
await check('CDN âm thanh', async () => { const k = [...readIndex().have].pop(); if (!k) return 'không đọc được audio-index'; const r = await get('https://lexkiteapp.github.io/lexkite-media-2/audio/l/' + k + '.mp3'); return r.ok || 'HTTP ' + r.status; });

const out = `### 🌐 Live: ${ok.length} đạt · ${bad.length} lỗi\n` + (bad.length ? bad.map(b => '- ❌ ' + b).join('\n') : '- ✅ mọi kiểm tra đạt');
console.log(out); if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, out + '\n');
process.exit(bad.length ? 1 : 0);
