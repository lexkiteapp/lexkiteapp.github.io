// Test bảo vệ nội dung: bộ dựng luật WAF (scripts/lib/cf-waf-rules.mjs), sổ băm (scripts/lib/content-registry.mjs),
// WebSub/copy-watch (hàm thuần) và sổ thật trong repo còn nguyên chuỗi băm. Không gọi mạng.
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { buildRules, mergeRules, sameRules, mask, HTML_PREFIXES, DATA_PREFIXES, NEVER, LANGS, RL_DEFAULT, CI_HEADER } from '../lib/cf-waf-rules.mjs';
import { readRegistry, verifyChain, appendEntry, recordPublish, recordArchive, recordDataset, recordRelease, datasetRoot, sha256, REGISTRY, OTS_DIR, otsPath, otsPending, stampable, otsState, registryLines } from '../lib/content-registry.mjs';
import { spawnSync } from 'node:child_process';
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
ok(rl.action === 'block' && rl.ratelimit.mitigation_timeout === 10, 'vượt ngưỡng → chặn 10 s (gói Free không cho challenge)');
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

// ---------- Mốc phát hành + OpenTimestamps ----------
{
  const tmp2 = fs.mkdtempSync(path.join(os.tmpdir(), 'lkots-')), G = path.join(tmp2, 'r.jsonl'), D = path.join(tmp2, 'ots');
  const root = sha256('tree');
  recordPublish({ url: 'https://lexkite.com/vi/blog/a/', html: '<html>a</html>', source: 'A' }, G);
  const r1 = recordRelease({ name: 'addon', version: '2.6.411', root, files: 3, commit: 'c' }, G);
  ok(!r1.skipped && r1.entry.type === 'release' && r1.entry.version === '2.6.411', 'recordRelease: ghi mốc add-on');
  ok(recordRelease({ name: 'addon', version: '2.6.411', root: sha256('tree-sửa'), files: 3, commit: 'c2' }, G).skipped, 'add-on cùng phiên bản (mã sửa giữa 2 bản) → không ghi');
  ok(!recordRelease({ name: 'addon', version: '2.6.412', root, files: 3 }, G).skipped, 'add-on lên phiên bản → ghi mục mới');
  ok(!recordRelease({ name: 'landing', root: sha256('tree2'), files: 32 }, G).skipped && recordRelease({ name: 'landing', root: sha256('tree2'), files: 32 }, G).skipped, 'landing dựng lại (gốc băm đổi) → ghi; không đổi → bỏ qua');
  throws(() => recordRelease({ name: 'Bad Name', root }, G), 'tên phát hành lạ → lỗi');
  throws(() => recordRelease({ name: 'addon', root: 'x' }, G), 'thiếu gốc băm → lỗi');
  const pend = otsPending(G, D);
  ok(pend.length === 4 && pend.every(t => t.proof === `${D}/${t.entry.hash}.ots` && /\/[0-9a-f]{64}\.ots$/.test(t.proof)), 'OTS: mỗi mục sổ → 1 bằng chứng <thư mục>/<hash mục>.ots');
  ok(pend.every((t, i) => t.line === registryLines(G)[i] && JSON.parse(t.line).hash === t.entry.hash), 'OTS: tệp đóng dấu = đúng dòng JSON trong sổ (tái tạo được để kiểm)');
  ok(otsPath({ hash: 'a'.repeat(64) }) === `${OTS_DIR}/${'a'.repeat(64)}.ots` && OTS_DIR === 'content/protection/ots', 'OTS: đường dẫn mặc định content/protection/ots/<sha>.ots');
  fs.mkdirSync(D, { recursive: true }); fs.writeFileSync(pend[0].proof, Buffer.from('00', 'hex'));
  ok(otsPending(G, D).length === 3, 'OTS: mục đã có .ots → không đóng dấu lại');
  ok(!stampable({ type: 'publish', hash: 'a'.repeat(64), url: 'https://copy.example/x' }) && !stampable({ type: 'note', hash: 'a'.repeat(64), email: 'x@y.com' }) && !stampable({ type: 'release', hash: 'a'.repeat(64), name: 'x', by: 'someone@gmail.com' }) && !stampable({ type: 'dataset', hash: 'a'.repeat(64), token: 'abc' }), 'OTS: không bao giờ đóng dấu URL lạ / email / khóa / loại mục lạ');
  ok(stampable(r1.entry), 'OTS: mục phát hành công khai được đóng dấu');
  ok(otsState(Buffer.from('aa0588960d73d71901bb', 'hex')) === 'bitcoin' && otsState(Buffer.from('aa83dfe30d2ef90c8ebb', 'hex')) === 'pending' && otsState(Buffer.from('00', 'hex')) === 'unknown', 'OTS: nhận trạng thái bằng chứng (bitcoin / pending)');
  // thiếu lệnh ots (máy không cài) → chỉ cảnh báo, exit 0, không tạo file
  const run = spawnSync(process.execPath, ['scripts/ots.mjs', 'stamp', '--file', G, '--dir', D], { encoding: 'utf8', env: { PATH: path.dirname(process.execPath) } });
  ok(run.status === 0 && /chưa cài opentimestamps-client/.test(run.stdout) && otsPending(G, D).length === 3, 'ots.mjs stamp: thiếu ots → cảnh báo, không lỗi (non-fatal)');
  fs.rmSync(tmp2, { recursive: true, force: true });
}
const step = (yml, name) => { const i = yml.indexOf(`- name: ${name}`); if (i < 0) return ''; const j = yml.indexOf('\n      - ', i + 5); return yml.slice(i, j < 0 ? undefined : j); };
const bp = fs.readFileSync('.github/workflows/blog-publish.yml', 'utf8'), cp = fs.readFileSync('.github/workflows/content-protect.yml', 'utf8');
for (const [nm, y] of [['blog-publish', bp], ['content-protect', cp]]) {
  const st = step(y, 'OpenTimestamps');
  ok(/opentimestamps-client/.test(st) && /node scripts\/ots\.mjs stamp/.test(st) && /node scripts\/ots\.mjs upgrade/.test(st), `${nm}: bước OpenTimestamps cài client + stamp + upgrade`);
  ok(/continue-on-error: true/.test(st) && /::warning::/.test(st), `${nm}: bước OTS không chặn (continue-on-error + cảnh báo)`);
  ok(y.indexOf('- name: OpenTimestamps') < y.indexOf('- name: Commit sổ đăng ký') && /git add [^\n]*content\/protection\/ots/.test(y), `${nm}: OTS chạy trước commit, commit kèm content/protection/ots`);
}
ok(bp.indexOf('- name: Sổ băm nội dung') < bp.indexOf('- name: OpenTimestamps'), 'blog-publish: đóng dấu sau khi ghi sổ bài mới');
ok(/push:[\s\S]*'extension\/manifest\.json'[\s\S]*'content\/landing\/\*\*'/.test(cp) && /release addon/.test(cp) && /release landing/.test(cp), 'content-protect: push add-on lên bản/landing → ghi mốc phát hành');
ok(/if: github\.event_name != 'push'/.test(step(cp, 'Dò bản sao chép')) && /if: github\.event_name != 'push'/.test(step(cp, 'WAF chống cào')), 'content-protect: lần chạy do push không dò bản sao/WAF');
ok(!/ots stamp|ots\.mjs stamp/.test(fs.readFileSync('package.json', 'utf8')), 'OTS không chạy cục bộ trong npm test (chỉ CI)');
if (fs.existsSync(OTS_DIR)) {
  const hashes = new Set(readRegistry().map(e => e.hash)), fl = fs.readdirSync(OTS_DIR).filter(f => !f.startsWith('.'));
  ok(fl.every(f => /^[0-9a-f]{64}\.ots$/.test(f) && hashes.has(f.slice(0, 64))), `${OTS_DIR}: mọi bằng chứng ứng với 1 mục sổ (không file lạ)`);
  ok(fl.every(f => fs.statSync(path.join(OTS_DIR, f)).size < 20e3), `${OTS_DIR}: bằng chứng nhỏ (< 20 KB)`);
}
ok(/ots verify/.test(fs.readFileSync('docs/CONTENT-PROTECTION.md', 'utf8')), 'tài liệu hướng dẫn chứng minh bằng ots verify');

// ---------- WebSub, copy-watch, build-blog ----------
ok(JSON.stringify(feedsFor(['https://lexkite.com/vi/blog/a/', 'https://lexkite.com/vi/blog/b/', 'https://lexkite.com/ja/blog/c/', 'https://lexkite.com/tu-vung/x'])) === JSON.stringify(['https://lexkite.com/ja/blog/rss.xml', 'https://lexkite.com/vi/blog/rss.xml']), 'WebSub: 1 feed/ngôn ngữ, bỏ trang không phải blog');
const sig = signature('## Tiêu đề\n\nCâu ngắn.\n\nĐây là một câu đủ dài và đặc trưng để tìm bản sao chép của bài viết trên mạng nhé bạn.\n\n- gạch đầu dòng dài dài dài dài dài dài dài dài dài dài dài dài dài\n');
ok(sig === 'Đây là một câu đủ dài và đặc trưng để tìm bản sao chép của bài viết trên mạng nhé bạn.', 'copy-watch: chọn câu đặc trưng, bỏ tiêu đề/gạch đầu dòng');
ok(suspects([{ url: 'https://lexkite.com/vi/blog/a/' }, { url: 'https://media.lexkite.com/x' }, { url: 'https://copy.example/a' }]).length === 1, 'copy-watch: bỏ qua trang của Lexkite');
const bb = fs.readFileSync('scripts/build-blog.mjs', 'utf8');
ok(bb.includes('rel="hub"') && bb.includes('<meta name="author"') && bb.includes('datePublished') && bb.includes('dateModified') && bb.includes('rel="canonical"') && bb.includes('article:published_time'), 'build-blog: hub RSS, author, datePublished/dateModified, canonical, article:published_time');

console.log(fails ? `✗ protection: ${fails}/${n} lỗi` : `✓ protection: ${n} kiểm tra đạt (WAF, sổ băm, OpenTimestamps, WebSub, copy-watch)`);
process.exit(fails ? 1 : 0);
