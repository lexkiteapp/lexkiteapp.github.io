// Test bảo vệ nội dung: bộ dựng luật WAF (scripts/lib/cf-waf-rules.mjs), sổ băm (scripts/lib/content-registry.mjs),
// WebSub/copy-watch (hàm thuần) và sổ thật trong repo còn nguyên chuỗi băm. Không gọi mạng.
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { buildRules, mergeRules, sameRules, mask, HTML_PREFIXES, DATA_PREFIXES, NEVER, LANGS, RL_DEFAULT, CI_HEADER } from '../lib/cf-waf-rules.mjs';
import { readRegistry, verifyChain, appendEntry, recordPublish, recordArchive, recordDataset, datasetRoot, sha256, REGISTRY } from '../lib/content-registry.mjs';
import { feedsFor } from '../websub-ping.mjs';
import { signature, suspects } from '../copy-watch.mjs';

let fails = 0, n = 0; const ok = (c, m) => { n++; if (!c) { fails++; console.log('✗', m); } };
const throws = (f, m) => { try { f(); ok(false, m); } catch { ok(true, m); } };
const SECRET = 'test_secret_value_0123456789abcdef';

// ---------- WAF ----------
const R = buildRules({ ciSecret: SECRET });
const all = [...R.custom, ...R.ratelimit];
ok(R.custom.length <= 5 && R.ratelimit.length === 1, 'gói Free: ≤ 5 luật custom, 1 luật rate limit');
ok(all.every(r => r.expression.length < 4096), 'biểu thức < 4096 ký tự');
ok(all.every(r => r.ref.startsWith('lexkite_') && r.description.startsWith('[lexkite]')), 'mọi luật có ref lexkite_* (để ghép idempotent)');
ok(all.every(r => /not cf\.client\.bot/.test(r.expression)), 'mọi luật miễn bot đã xác minh (Googlebot, Bingbot)');
ok(R.custom.every(r => r.expression.includes(`http.request.headers["${CI_HEADER}"][*] eq "${SECRET}"`)), 'luật custom miễn header CI');
ok(R.custom.every(r => r.expression.includes('not ends_with(http.request.uri.path, ".xml")')), 'RSS/sitemap (.xml) không bị chặn');
ok(R.custom.every(r => /http\.host in \{"lexkite\.com" "www\.lexkite\.com"\}/.test(r.expression)), 'custom chỉ áp cho lexkite.com (không media./audio.)');
ok(!/bot_fight|fight_mode/.test(JSON.stringify(R)), 'không bật Bot Fight Mode');
for (const p of NEVER) ok(!all.some(r => r.expression.includes(`starts_with(http.request.uri.path, "${p}")`)), `không bao giờ nhắm ${p}`);
ok(!HTML_PREFIXES.concat(DATA_PREFIXES).some(p => NEVER.some(x => p.startsWith(x) || x.startsWith(p))), 'tiền tố nội dung không chồng lên vùng cấm');
for (const l of LANGS) ok(R.custom[0].expression.includes(`"/${l}/blog/"`), `chặn cào blog /${l}/blog/`);
ok(['/tu-vung/', '/ngu-phap/', '/samples/', '/packs/'].every(p => R.custom[0].expression.includes(`"${p}"`)), 'phủ /tu-vung/, /ngu-phap/, /samples/, /packs/');
ok(['python-requests', 'scrapy', 'aiohttp', 'go-http-client', 'httrack', 'wget', 'libwww', 'okhttp'].every(u => R.custom[0].expression.includes(`"${u}"`)) && R.custom[0].expression.includes('http.user_agent eq ""'), 'đủ UA công cụ cào + UA trống');
ok(R.custom[1].expression.includes('"headlesschrome"') && !R.custom[1].expression.includes('"/packs/"'), 'headless chỉ thử thách trang HTML (không /packs/ mà app tải trong e2e)');
const rl = R.ratelimit[0];
ok(rl.ratelimit.period === 10 && rl.ratelimit.characteristics.includes('ip.src'), 'rate limit 10 s theo IP (gói Free)');
ok(rl.ratelimit.requests_per_period >= 30 && rl.ratelimit.requests_per_period === RL_DEFAULT.requests, 'ngưỡng ≥ 30 req/10 s');
ok(rl.ratelimit.requests_per_period >= 4 * 10, 'ngưỡng ≥ 4× người đọc nhanh nhất (~10 trang/10 s, 1 request nội dung/trang)');
ok(!/http\.host|http\.request\.headers|user_agent/.test(rl.expression), 'rate limit chỉ dùng path + cf.client.bot (giới hạn gói Free)');
ok(!rl.expression.includes('starts_with(http.request.uri.path, "/blog/")'), 'rate limit không tính /blog/ trơn (trùng đường ảnh media.lexkite.com/blog/…)');
ok(rl.action === 'managed_challenge' && rl.ratelimit.mitigation_timeout === 0, 'vượt ngưỡng → managed challenge (không chặn cứng)');
ok(buildRules({ ciSecret: SECRET, rl: { action: 'block' } }).ratelimit[0].ratelimit.mitigation_timeout === 10, 'hành động block → timeout 10 s');
throws(() => buildRules({ ciSecret: '' }), 'thiếu secret CI → lỗi');
throws(() => buildRules({ ciSecret: 'short' }), 'secret quá ngắn → lỗi');
throws(() => buildRules({ ciSecret: SECRET, rl: { period: 60 } }), 'period ≠ 10 → lỗi (gói Free)');
// ghép idempotent
const foreign = { id: 'abc', ref: 'owner_rule', description: 'luật tay', action: 'block', expression: 'ip.src eq 1.2.3.4', enabled: true, version: '3', last_updated: 'x' };
const m1 = mergeRules([foreign, { ...R.custom[0], id: 'old', expression: 'cũ' }], R.custom);
ok(m1.length === 1 + R.custom.length && m1[0].id === 'abc' && m1[0].ref === 'owner_rule', 'ghép: giữ luật của chủ site, thay luật lexkite_ cũ');
ok(!('version' in m1[0]) && !m1.some(r => r.expression === 'cũ'), 'ghép: bỏ trường chỉ đọc, bỏ bản cũ');
const m2 = mergeRules(m1, R.custom);
ok(JSON.stringify(m2) === JSON.stringify(m1), 'ghép 2 lần = 1 lần (idempotent)');
ok(sameRules(m1, R.custom) && !sameRules([foreign], R.custom), 'sameRules nhận đúng/sai');
ok(sameRules(mergeRules([], R.ratelimit).map(r => ({ ...r, ratelimit: { ...r.ratelimit, counting_expression: '' } })), R.ratelimit), 'sameRules bỏ qua trường phụ trong ratelimit');
ok(!mask(JSON.stringify(R), SECRET).includes(SECRET), 'mask che giá trị header CI');

// ---------- Sổ băm ----------
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lkreg-')), F = path.join(tmp, 'r.jsonl');
ok(sha256('abc') === 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad', 'sha256 chuẩn');
const p1 = recordPublish({ url: 'https://lexkite.com/vi/blog/a/', html: '<html>a</html>', source: '---\ntitle: a\n---\nA', publishedAt: '2026-10-01T01:00:00Z', commit: 'c1', at: '2026-10-01T01:05:00Z' }, F);
ok(!p1.skipped && p1.entry.seq === 1 && p1.entry.htmlSha256 === sha256('<html>a</html>') && p1.entry.prev === '0'.repeat(64), 'ghi bài: băm HTML + nguồn, mục 1 nối gốc');
ok(recordPublish({ url: 'https://lexkite.com/vi/blog/a/', html: '<html>khác build</html>', source: '---\ntitle: a\n---\nA' }, F).skipped, 'cùng nguồn → không ghi trùng');
ok(!recordPublish({ url: 'https://lexkite.com/vi/blog/a/', html: '<html>a2</html>', source: '---\ntitle: a\n---\nA sửa' }, F).skipped, 'nguồn đổi (cập nhật bài) → ghi mục mới');
const ar = recordArchive({ url: 'https://lexkite.com/vi/blog/a/', archiveUrl: 'https://web.archive.org/web/20261001010600/https://lexkite.com/vi/blog/a/' }, F);
ok(ar.type === 'archive' && ar.service === 'wayback' && ar.seq === 3, 'recordArchive (API cho script Wayback) ghi vào cùng sổ');
ok(recordArchive({ url: 'https://lexkite.com/vi/blog/a/', archiveUrl: ar.archiveUrl }, F).seq === 3, 'recordArchive cùng URL lưu → không ghi trùng');
throws(() => recordArchive({ url: 'https://lexkite.com/vi/blog/a/', archiveUrl: 'https://evil.example/x' }, F), 'archiveUrl lạ → lỗi');
throws(() => recordPublish({ url: 'https://copycat.example/a/', html: 'x' }, F), 'URL ngoài lexkite.com → lỗi');
const ds = datasetRoot('100644 aaa 0\tweb/js/b.js\n100644 bbb 0\tweb/js/a.js\n');
ok(ds.files === 2 && ds.root === datasetRoot('100644 bbb 0\tweb/js/a.js\n100644 aaa 0\tweb/js/b.js').root, 'gốc băm kho không phụ thuộc thứ tự');
ok(!recordDataset({ name: 't', ...ds, commit: 'c' }, F).skipped && recordDataset({ name: 't', ...ds, commit: 'c2' }, F).skipped, 'ảnh chụp kho: chỉ ghi khi đổi');
let v = verifyChain(readRegistry(F)); ok(v.ok && v.count === 4, 'chuỗi băm hợp lệ');
const lines = fs.readFileSync(F, 'utf8').trim().split('\n');
const t1 = lines.map((l, i) => (i === 0 ? l.replace('2026-10-01T01:05:00.000Z', '2026-09-01T01:05:00.000Z') : l));
v = verifyChain(t1.map(l => JSON.parse(l))); ok(!v.ok && v.at === 1, 'sửa ngày của mục cũ → phát hiện');
v = verifyChain(lines.filter((_, i) => i !== 1).map(l => JSON.parse(l))); ok(!v.ok && v.at === 2, 'xóa 1 mục → phát hiện');
fs.writeFileSync(F, t1.join('\n') + '\n'); throws(() => appendEntry({ type: 'x' }, F), 'sổ hỏng → từ chối ghi thêm');
fs.rmSync(tmp, { recursive: true, force: true });
if (fs.existsSync(REGISTRY)) { const rv = verifyChain(readRegistry()); ok(rv.ok, `sổ thật ${REGISTRY} còn nguyên chuỗi băm${rv.ok ? '' : ` (hỏng mục ${rv.at}: ${rv.why})`}`); }

// ---------- WebSub, copy-watch, build-blog ----------
ok(JSON.stringify(feedsFor(['https://lexkite.com/vi/blog/a/', 'https://lexkite.com/vi/blog/b/', 'https://lexkite.com/ja/blog/c/', 'https://lexkite.com/tu-vung/x'])) === JSON.stringify(['https://lexkite.com/ja/blog/rss.xml', 'https://lexkite.com/vi/blog/rss.xml']), 'WebSub: 1 feed/ngôn ngữ, bỏ trang không phải blog');
const sig = signature('## Tiêu đề\n\nCâu ngắn.\n\nĐây là một câu đủ dài và đặc trưng để tìm bản sao chép của bài viết trên mạng nhé bạn.\n\n- gạch đầu dòng dài dài dài dài dài dài dài dài dài dài dài dài dài\n');
ok(sig === 'Đây là một câu đủ dài và đặc trưng để tìm bản sao chép của bài viết trên mạng nhé bạn.', 'copy-watch: chọn câu đặc trưng, bỏ tiêu đề/gạch đầu dòng');
ok(suspects([{ url: 'https://lexkite.com/vi/blog/a/' }, { url: 'https://media.lexkite.com/x' }, { url: 'https://copy.example/a' }]).length === 1, 'copy-watch: bỏ qua trang của Lexkite');
const bb = fs.readFileSync('scripts/build-blog.mjs', 'utf8');
ok(bb.includes('rel="hub"') && bb.includes('<meta name="author"') && bb.includes('datePublished') && bb.includes('dateModified') && bb.includes('rel="canonical"') && bb.includes('article:published_time'), 'build-blog: hub RSS, author, datePublished/dateModified, canonical, article:published_time');

console.log(fails ? `✗ protection: ${fails}/${n} lỗi` : `✓ protection: ${n} kiểm tra đạt (WAF, sổ băm, WebSub, copy-watch)`);
process.exit(fails ? 1 : 0);
