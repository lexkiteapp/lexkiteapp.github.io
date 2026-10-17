// Rà soát bản LIVE (chạy hằng ngày trong .github/workflows/health.yml): trang chính, API, dữ liệu, âm thanh, phiên bản.
// Không cần khóa; lỗi nào cũng in ra và exit 1 → workflow đỏ → bản tin email 8h sáng (workers/mail) báo về.
import fs from 'fs';
const B = 'https://lexkite.com', bad = [], ok = [];
// Header CI (secret LEXKITE_CI_HEADER): qua WAF + thống kê truy cập tự đếm là máy tự động (functions/api/hit.js) – không in giá trị
const CI = process.env.LEXKITE_CI_HEADER ? { 'X-Lexkite-CI': process.env.LEXKITE_CI_HEADER.trim() } : {};
const get = async (u, o = {}) => { for (let k = 0; k < 3; k++) { try { const r = await fetch(u, { redirect: 'follow', ...o, headers: { 'User-Agent': 'lexkite-health', ...CI } }); return r; } catch (e) { await new Promise(r => setTimeout(r, 3000)); } } return { ok: false, status: 0, text: async () => '' }; };
const check = async (name, fn) => { try { const m = await fn(); m === true || m === undefined ? ok.push(name) : bad.push(`${name}: ${m}`); } catch (e) { bad.push(`${name}: ${e.message}`); } };
const page = (p, must) => check(p, async () => { const r = await get(B + p); if (!r.ok) return 'HTTP ' + r.status; const t = await r.text(); return !must || t.includes(must) || `thiếu "${must}"`; });
const json = (p, test) => check(p, async () => { const r = await get(B + p); if (!r.ok) return 'HTTP ' + r.status; const j = await r.json(); return test ? test(j) : true; });

await page('/', 'lexkite');
await page('/vi/blog/', '<h2'); await page('/en/blog/', 'Lexkite Blog');
await page('/privacy'); await page('/terms'); await page('/ja/privacy'); await page('/sitemap.xml', '<loc>'); await page('/robots.txt', 'Sitemap');
await check('sw.js = bản mới nhất', async () => { const live = ((await (await get(B + '/sw.js?x=' + Date.now())).text()).match(/lexkite-\d+/) || [])[0], local = (fs.readFileSync('web/sw.js', 'utf8').match(/lexkite-\d+/) || [])[0]; return live === local || `live ${live} ≠ repo ${local} (deploy Cloudflare kẹt?)`; });
for (const f of ['js/app.js', 'js/qengine.js', 'js/toeic/reading1.js', 'js/listen/test1.js', 'img/toeic/t1-p1-1.jpg']) await page('/' + f);
await json('/api/config');
await check('/api/hit (POST)', async () => { const r = await get(B + '/api/hit', { method: 'POST', body: '{}' }); return r.status < 500 || 'HTTP ' + r.status; });
await check('/api/sync từ chối token giả', async () => { const r = await get(B + '/api/sync', { method: 'POST', headers: { Authorization: 'Bearer x.y.z' }, body: '{"op":"pull"}' }); return r.status === 401 || 'HTTP ' + r.status; });
for (const l of ['ja', 'ar']) { await json(`/packs/${l}.json`, j => Object.keys(j).length > 7000 || 'quá ít từ'); await json(`/i18n/explain/${l}.json`, j => Object.keys(j).length > 2000 || 'quá ít lời giải'); }
await check('CDN âm thanh', async () => { const idx = fs.readFileSync('web/js/listen/audio-index.js', 'utf8'), k = ((idx.match(/new Set\("([^"]+)"/) || [])[1] || '').split(' ').pop(); if (!k) return 'không đọc được audio-index'; const r = await get('https://lexkiteapp.github.io/audio/l/' + k + '.mp3'); return r.ok || 'HTTP ' + r.status; });

const out = `### 🌐 Live: ${ok.length} đạt · ${bad.length} lỗi\n` + (bad.length ? bad.map(b => '- ❌ ' + b).join('\n') : '- ✅ mọi kiểm tra đạt');
console.log(out); if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, out + '\n');
process.exit(bad.length ? 1 : 0);
