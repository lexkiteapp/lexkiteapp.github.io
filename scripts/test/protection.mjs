// Test bảo vệ nội dung: bộ dựng luật WAF (scripts/lib/cf-waf-rules.mjs), sổ băm (scripts/lib/content-registry.mjs),
// WebSub/copy-watch (hàm thuần) và sổ thật trong repo còn nguyên chuỗi băm. Không gọi mạng.
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { buildRules, mergeRules, sameRules, mask, HTML_PREFIXES, DATA_PREFIXES, NEVER, LANGS, RL_DEFAULT, RL_BUDGET, CI_HEADER, API_RL } from '../lib/cf-waf-rules.mjs';
import { readRegistry, verifyChain, appendEntry, recordPublish, recordArchive, recordDataset, recordRelease, datasetRoot, sha256, REGISTRY, OTS_DIR, otsPath, otsPending, stampable, otsState, registryLines } from '../lib/content-registry.mjs';
import { spawnSync } from 'node:child_process';
import { feedsFor } from '../websub-ping.mjs';
import { signature, suspects, canaryProbes, ghSuspects } from '../copy-watch.mjs';
import { IP_META, themeHead } from '../lib/site-layout.mjs';
import { saveSnapshot, parseSitemap, pickChanged, latest } from '../lib/wayback.mjs';
import { headToStamp, coveringStamps, tsrPath, TSAS } from '../tsa.mjs';
import { toEntry as swhEntry, saveApi } from '../swh-save.mjs';
import { manifest as zManifest, metadata as zMeta } from '../zenodo-deposit.mjs';
import { cdxFirst, USES as TM_USES } from '../tm-evidence.mjs';
import { evidenceReport } from '../lib/evidence.mjs';
import { recordEvidence } from '../lib/content-registry.mjs';

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
ok(rl.ratelimit.requests_per_period >= 30 && rl.ratelimit.requests_per_period <= 200 && rl.ratelimit.requests_per_period === RL_DEFAULT.requests, 'ngưỡng 30–200 req/10 s');
ok(rl.ratelimit.requests_per_period >= 4 * 10, 'ngưỡng ≥ 4× người đọc nhanh nhất (~10 trang/10 s, 1 request nội dung/trang)');
ok(!/http\.host|http\.request\.headers|user_agent/.test(rl.expression), 'rate limit chỉ dùng path + cf.client.bot (giới hạn gói Free)');
// API công khai (audit bảo mật 2/11): /api/ai, /api/contact, /api/report, /api/handoff bị đếm ở rate limit, khớp ĐÚNG đường dẫn
for (const a of ['/api/ai', '/api/contact', '/api/report', '/api/handoff']) ok(API_RL.includes(a) && rl.expression.includes(`"${a}"`), `rate limit phủ ${a}`);
ok(/http\.request\.uri\.path in \{"\/api\/ai"/.test(rl.expression) && !rl.expression.includes('starts_with(http.request.uri.path, "/api'), 'API chỉ khớp đúng đường dẫn (không tiền tố /api/ – sync/studio/drive/CLI không bị đếm)');
ok(API_RL.every(a => !/^\/api\/(sync|studio|drive|lexai|quota|admin)/.test(a)), 'không đếm API nội bộ/CI');
ok(!R.custom.some(r => r.expression.includes('"/api/')), 'luật chặn/thử thách không bao giờ chạm /api/*');
// CGNAT/lớp học (3/11): nhiều người thật chung 1 IP – ngưỡng phải đủ cho cả lớp cùng mở 1 link, mà vẫn chặn scraper thật đã gặp
ok(rl.ratelimit.requests_per_period >= RL_BUDGET.classroomBurst * 2, `ngưỡng ≥ 2× lớp ${RL_BUDGET.classroomBurst} người chung IP cùng mở 1 link (CGNAT/Wi-Fi trường)`);
ok(rl.ratelimit.requests_per_period * 2 <= RL_BUDGET.scraperSeenPer10s, 'ngưỡng ≤ ½ tốc độ scraper thật 2/11 (257 req/10 s) → vẫn bị chặn');
ok(!rl.expression.includes('"/packs/"') && R.custom[0].expression.includes('"/packs/"'), '/packs/ (app fetch, chặn = mất bản dịch cả phiên) không bị đếm RL nhưng vẫn chặn UA công cụ');
const packFiles = fs.existsSync('web/packs') ? fs.readdirSync('web/packs').length : 0;
ok(packFiles > 0 && packFiles < rl.ratelimit.requests_per_period, `/packs/ chỉ ${packFiles} tệp < ngưỡng → RL vốn không bảo vệ được gói nghĩa`);
ok(!rl.expression.includes('starts_with(http.request.uri.path, "/blog/")'), 'rate limit không tính /blog/ trơn (trùng đường ảnh media.lexkite.com/blog/…)');
ok(rl.action === 'block' && rl.ratelimit.mitigation_timeout === 10, 'vượt ngưỡng → chặn 10 s (gói Free; luật chung với API fetch nên challenge vô ích)');
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
  ok(y.indexOf('- name: OpenTimestamps') < y.indexOf('- name: Commit sổ đăng ký') && /(git add|commit-regen\.sh)[^\n]*content\/protection\/ots/.test(y), `${nm}: OTS chạy trước commit, commit kèm content/protection/ots`);   // content-protect sinh lại trên main mới nhất qua commit-regen.sh (sổ là chuỗi băm nối thêm, rebase luôn xung đột)
}
ok(bp.indexOf('- name: Sổ băm nội dung') < bp.indexOf('- name: OpenTimestamps'), 'blog-publish: đóng dấu sau khi ghi sổ bài mới');
ok(/gh run list --workflow blog-publish\.yml --status success/.test(bp) && !/blog-due\.mjs --since 190 /.test(bp), 'blog-publish: cửa sổ bài đến hạn tính từ lần chạy xanh trước (cron bị bỏ lượt không làm rơi bài)');
ok(/commit-regen\.sh/.test(step(cp, 'Commit sổ đăng ký')) && /release addon[\s\S]*release landing[\s\S]*ots\.mjs stamp/.test(step(cp, 'Commit sổ đăng ký')), 'content-protect: sổ sinh lại trên main mới nhất (commit-regen.sh) gồm release addon/landing + OTS');
ok(/push:[\s\S]*'extension\/manifest\.json'[\s\S]*'content\/landing\/\*\*'/.test(cp) && /release addon/.test(cp) && /release landing/.test(cp), 'content-protect: push add-on lên bản/landing → ghi mốc phát hành');
ok(/if: github\.event_name != 'push'/.test(step(cp, 'Dò bản sao chép')) && /if: github\.event_name != 'push'/.test(step(cp, 'WAF chống cào')), 'content-protect: lần chạy do push không dò bản sao/WAF');
ok(!/ots stamp|ots\.mjs stamp/.test(fs.readFileSync('package.json', 'utf8') + fs.readFileSync('scripts/test/suite.txt', 'utf8')), 'OTS không chạy cục bộ trong npm test (chỉ CI)');
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

// ---------- robots.txt / ai.txt / TDMRep: chặn bot HUẤN LUYỆN AI, KHÔNG chặn máy tìm kiếm (SEO) ----------
// Bộ đọc robots.txt tối giản theo RFC 9309: nhóm = các dòng User-agent liền nhau; bot dùng nhóm khớp tên dài nhất, không có thì nhóm *.
export function robotsAllows(txt, ua, p) {
  const groups = []; let cur = null, lastUa = false;
  for (const raw of txt.split('\n')) { const l = raw.replace(/#.*/, '').trim(); if (!l) continue; const m = l.match(/^([A-Za-z-]+)\s*:\s*(.*)$/); if (!m) continue;
    const k = m[1].toLowerCase(), v = m[2].trim();
    if (k === 'user-agent') { if (!lastUa) groups.push(cur = { uas: [], rules: [] }); cur.uas.push(v.toLowerCase()); lastUa = true; }
    else { lastUa = false; if (cur && (k === 'allow' || k === 'disallow')) cur.rules.push([k, v]); } }
  const u = ua.toLowerCase(), named = groups.filter(g => g.uas.some(x => x !== '*' && u.includes(x))), g = named.length ? named : groups.filter(x => x.uas.includes('*'));
  const re = v => new RegExp('^' + v.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\\\$$/, '$'));
  let best = null; for (const gr of g) for (const [k, v] of gr.rules) if (v && re(v).test(p) && (!best || v.length > best[1].length || (v.length === best[1].length && k === 'allow'))) best = [k, v];
  return !best || best[0] === 'allow';
}
const robots = fs.readFileSync('web/robots.txt', 'utf8');
const SEARCH = ['Googlebot', 'Googlebot-Image', 'Bingbot', 'Applebot', 'DuckDuckBot', 'YandexBot', 'Baiduspider', 'Naver Yeti', 'facebookexternalhit', 'Twitterbot', 'OAI-SearchBot', 'ChatGPT-User', 'Claude-SearchBot', 'Claude-User', 'PerplexityBot', 'Mozilla/5.0 (compatible; Googlebot/2.1)'];
const TRAIN = ['GPTBot', 'CCBot', 'ClaudeBot', 'anthropic-ai', 'Google-Extended', 'Applebot-Extended', 'Bytespider', 'meta-externalagent', 'cohere-training-data-crawler', 'Diffbot', 'img2dataset', 'AI2Bot'];
for (const b of SEARCH) for (const pth of ['/', '/vi/blog/x/', '/tu-vung/abc', '/samples/x', '/en/terms', '/sitemap.xml']) ok(robotsAllows(robots, b, pth), `robots: ${b} được vào ${pth} (SEO giữ nguyên)`);
for (const b of SEARCH) ok(!robotsAllows(robots, b, '/admin') && !robotsAllows(robots, b, '/x?demo=1'), `robots: ${b} vẫn tránh /admin, ?demo=`);
for (const b of TRAIN) for (const pth of ['/', '/vi/blog/x/', '/js/toeic/reading1.js', '/packs/vi.json']) ok(!robotsAllows(robots, b, pth), `robots: bot huấn luyện ${b} bị chặn ${pth}`);
ok(/^Sitemap: https:\/\/lexkite\.com\/sitemap\.xml$/m.test(robots), 'robots: còn khai báo sitemap');
ok(!/^User-agent:\s*(Googlebot|Bingbot|Applebot|PetalBot|YandexBot|DuckDuckBot)\s*$/im.test(robots), 'robots: không có nhóm riêng nào cho máy tìm kiếm');
ok(/^User-Agent: \*\nDisallow: \/$/m.test(fs.readFileSync('web/ai.txt', 'utf8')), 'ai.txt: cấm dùng mọi nội dung cho AI');
const tdm = JSON.parse(fs.readFileSync('web/.well-known/tdmrep.json', 'utf8'));
ok(Array.isArray(tdm) && tdm.some(r => r.location === '/*' && r['tdm-reservation'] === 1), 'TDMRep: bảo lưu quyền khai thác văn bản/dữ liệu toàn site');
ok(/tdm-reservation" content="1"/.test(IP_META) && !/noindex|nofollow|robots/.test(IP_META), 'meta bảo lưu TDM không đụng chỉ mục');
{ const h = themeHead('<head><meta charset="utf-8"><title>t</title></head>'); ok(h.split('tdm-reservation').length === 2 && themeHead(h) === h, 'themeHead chèn meta quyền nội dung 1 lần (idempotent)'); }
for (const f of ['web/app/index.html', 'web/index.html', 'web/en/terms.html']) { const h = fs.readFileSync(f, 'utf8'); ok(h.includes(IP_META) && /©/.test(h + (f.includes('/app/') ? fs.readFileSync('web/js/app.js', 'utf8') : '')), `${f}: có meta tdm-reservation + dòng ©`); }

// ---------- LICENSE / NOTICE: mã + nội dung © Lexkite, all rights reserved ----------
const lic = fs.readFileSync('LICENSE', 'utf8'), notice = fs.readFileSync('NOTICE', 'utf8');
ok(/All rights reserved/i.test(lic) && /artificial intelligence|machine learning/i.test(lic) && !/MIT License|Apache License|GNU General/i.test(lic), 'LICENSE: all rights reserved, cấm huấn luyện AI, không phải giấy phép mở');
ok(/NGSL/.test(notice) && /CC BY-SA/.test(notice) && /Tatoeba/.test(notice), 'NOTICE: ghi công dữ liệu mở theo giấy phép');
for (const l of ['en', 'vi']) { const t = fs.readFileSync(`content/legal/${l}/terms.html`, 'utf8'); ok(/id="ip"/.test(t) && /id="dmca"/.test(t) && /id="repeat-infringers"/.test(t) && /id="ai-training"/.test(t), `terms ${l}: mục quyền nội dung, cấm AI, DMCA, vi phạm lặp lại`); }

// ---------- Canary kho đề/từ (content/protection/canaries.json) ----------
const CAN = JSON.parse(fs.readFileSync('content/protection/canaries.json', 'utf8')).canaries;
ok(new Set(CAN.map(c => c.id)).size === CAN.length, 'canary: id không trùng');
for (const c of CAN.filter(x => x.q)) {
  ok(fs.readFileSync(`web/js/${c.module}`, 'utf8').includes(c.q), `canary ${c.id}: cụm "${c.q}" còn trong ${c.module} (sửa đề/từ phải cập nhật canaries.json)`);
  ok(c.q.length >= 15 && c.q.length <= 80, `canary ${c.id}: cụm tìm 15–80 ký tự`);
}
ok(['exam', 'vocab'].every(k => CAN.filter(c => c.q && c.kind === k).length >= 3), 'canary: ≥ 3 trong kho đề và ≥ 3 trong kho từ');
ok(canaryProbes(CAN).every(p => /^https:\/\/lexkite\.com\/#canary-/.test(p.url) && p.sentence && p.canary), 'canary → probe có url https (Quản trị nhận)');
ok(ghSuspects([{ html_url: 'https://github.com/lexkiteapp/lexkiteapp.github.io/blob/x', repository: { full_name: 'lexkiteapp/lexkiteapp.github.io' }, path: 'a' }, { html_url: 'https://github.com/bad/copy/blob/y', repository: { full_name: 'bad/copy' }, path: 'b' }]).map(x => x.url).join() === 'https://github.com/bad/copy/blob/y', 'canary GitHub: bỏ repo của Lexkite, báo repo lạ');
ok(/GITHUB_TOKEN: \$\{\{ github\.token \}\}/.test(step(cp, 'Dò bản sao chép')), 'content-protect: dò canary bằng GITHUB_TOKEN (miễn phí, không cần khóa)');

// ---------- Bằng chứng bên thứ ba (3/11): Wayback, RFC 3161, Software Heritage, Zenodo, nhãn hiệu, evidence ----------
{
  const wb = fs.readFileSync('scripts/wayback-snapshot.mjs', 'utf8');
  ok(/import \{[^}]*saveSnapshot[^}]*sleep[^}]*\} from '\.\/lib\/wayback\.mjs'/.test(wb), 'wayback-snapshot: saveSnapshot/sleep được import (lỗi 3/11: chưa định nghĩa → 0 bản lưu)');
  const H = (h, st = 302) => async () => ({ status: st, headers: { get: k => h[k.toLowerCase()] || null }, json: async () => ({}) });
  ok((await saveSnapshot('https://lexkite.com/a', { fetchImpl: H({ location: '/web/20261103010203/https://lexkite.com/a' }) })).snapshotUrl === 'https://web.archive.org/web/20261103010203/https://lexkite.com/a', 'Wayback: lấy mốc từ Location');
  let calls = 0; const f429 = async () => (++calls === 1 ? { status: 429, headers: { get: () => null } } : { status: 200, headers: { get: k => (k === 'content-location' ? '/web/20261103010203/https://lexkite.com/a' : null) } });
  ok((await saveSnapshot('https://lexkite.com/a', { fetchImpl: f429, wait: async () => {} })).ok && calls === 2, 'Wayback: 429 → chờ rồi thử lại 1 lần');
  ok(!(await saveSnapshot('https://lexkite.com/a', { fetchImpl: H({}, 503) })).ok, 'Wayback: lỗi máy chủ → ok=false (không ghi sổ)');
  const now = Date.UTC(2026, 10, 3, 12), avail = ts => async () => ({ json: async () => ({ archived_snapshots: { closest: { available: true, timestamp: ts, url: `http://web.archive.org/web/${ts}/x` } } }) });
  ok(await latest('x', avail('20261103110000'), 3, now) === 'https://web.archive.org/web/20261103110000/x' && await latest('x', avail('20261101110000'), 3, now) === null, 'Wayback availability: chỉ nhận bản chụp ≤ 3 giờ');
  const sm = parseSitemap('<urlset><url><loc>https://lexkite.com/a</loc><lastmod>2026-11-03</lastmod></url><url><loc>https://lexkite.com/b</loc><lastmod>2026-10-01</lastmod></url><url><loc>https://lexkite.com/c</loc></url></urlset>');
  ok(sm.length === 3 && sm[0].lastmod === '2026-11-03', 'sitemap: đọc loc + lastmod');
  const pc = pickChanged(sm, new Map([['https://lexkite.com/a', '2026-10-20T00:00:00Z'], ['https://lexkite.com/b', '2026-10-20T00:00:00Z']]), 10).map(x => x.loc);
  ok(pc.join() === 'https://lexkite.com/a,https://lexkite.com/c', 'sitemap: chỉ trang mới hoặc đổi sau lần lưu cuối');
  ok(pickChanged(sm, new Map(), 1).length === 1, 'sitemap: giới hạn --max');
  // RFC 3161
  const L3 = [JSON.stringify({ seq: 1, hash: 'a'.repeat(64) }), JSON.stringify({ seq: 2, hash: 'b'.repeat(64) }), JSON.stringify({ seq: 3, hash: 'c'.repeat(64) })];
  const has = new Set([tsrPath('b'.repeat(64), 'digicert', 'D')]), ex = p => has.has(p);
  ok(headToStamp(L3, ex, 'D').entry.seq === 3 && headToStamp(L3.slice(0, 2), ex, 'D') === null, 'TSA: đóng tem mục đầu sổ khi chưa có');
  ok(coveringStamps(L3, 1, ex, 'D').entry.seq === 2 && coveringStamps(L3, 3, ex, 'D') === null, 'TSA: tem mục sau phủ mục trước qua chuỗi băm');
  ok(TSAS.length >= 3 && TSAS.every(t => /^https?:\/\//.test(t.url)) && fs.existsSync('content/protection/tsa/certs/freetsa-cacert.pem'), 'TSA: ≥ 3 TSA miễn phí, có CA FreeTSA để tự kiểm');
  if (fs.existsSync('content/protection/tsa')) { const fl = fs.readdirSync('content/protection/tsa').filter(f => f.endsWith('.tsr')), hs = new Set(readRegistry().map(e => e.hash));
    ok(fl.every(f => /^[0-9a-f]{64}\.(digicert|sectigo|freetsa)\.tsr$/.test(f) && hs.has(f.slice(0, 64)) && fs.statSync(`content/protection/tsa/${f}`).size < 20e3), 'TSA: mọi tệp .tsr ứng với 1 mục sổ, < 20 KB'); }
  // Software Heritage, Zenodo, nhãn hiệu
  const sw = swhEntry({ id: 7, save_request_status: 'accepted', save_task_status: 'pending', request_date: '2026-11-03' }, 'https://github.com/lexkiteapp/lexkiteapp.github.io');
  ok(sw.requestId === '7' && sw.status === 'accepted/pending' && /^https:\/\/archive\.softwareheritage\.org\//.test(sw.url) && swhEntry({ exception: 'x' }, 'o') === null, 'SWH: kết quả API → mục sổ');
  ok(saveApi('https://github.com/a/b') === 'https://archive.softwareheritage.org/api/1/origin/save/git/url/https://github.com/a/b/', 'SWH: đúng API save code now');
  const zm = zManifest(['b', 'a'], f => f);
  ok(zm.files === 2 && zm.lines[0].endsWith('  a') && zm.root === sha256(zm.lines.join('\n')), 'Zenodo: manifest sắp xếp + gốc băm tính lại được');
  const md = zMeta({ month: '2026-11', root: 'r', files: 1, commit: 'c' });
  ok(md.access_right === 'restricted' && md.access_conditions && /All rights reserved/.test(md.description) && !/license/.test(Object.keys(md).join()), 'Zenodo: restricted access, không cấp giấy phép');
  const zr = spawnSync(process.execPath, ['scripts/zenodo-deposit.mjs'], { env: { ...process.env, ZENODO_TOKEN: '' }, encoding: 'utf8', timeout: 20e3 });
  ok(zr.status === 0 && /chưa có secret ZENODO_TOKEN/.test(zr.stdout), 'Zenodo: thiếu token → bỏ qua, thoát 0 (job tắt)');
  ok(cdxFirst('[["timestamp","original"],["20261020010203","https://lexkite.com/"]]').at === '2026-10-20T01:02:03Z' && cdxFirst('[]') === null, 'nhãn hiệu: bản lưu Wayback sớm nhất (CDX)');
  ok(['website', 'chrome-web-store', 'google-play', 'app-store', 'logo'].every(u => TM_USES.some(x => x.use === u)), 'nhãn hiệu: đủ web, 3 store, logo');
  const tmp3 = fs.mkdtempSync(path.join(os.tmpdir(), 'lkev-')), K = path.join(tmp3, 'r.jsonl');
  const e1 = recordPublish({ url: 'https://lexkite.com/vi/blog/z/', html: '<p>z</p>', source: 'z' }, K);
  const sE = recordEvidence('swh', sw, K);
  ok(stampable(sE) && stampable(recordEvidence('deposit', { url: 'https://zenodo.org/records/123', doi: '10.5281/zenodo.123', root: 'a'.repeat(64), files: 3, access: 'restricted' }, K)), 'bằng chứng SWH/Zenodo được đóng dấu OTS');
  throws(() => recordEvidence('swh', { ...sw, url: 'https://evil.example/x' }, K), 'bằng chứng: URL lạ → lỗi');
  throws(() => recordEvidence('tm-use', { url: 'https://lexkite.com/', mark: 'Lexkite', use: 'web', firstUse: 'x', note: 'owner@example.com' }, K), 'bằng chứng: chặn email/khóa');
  throws(() => recordEvidence('deposit', { url: 'https://zenodo.org/records/1', doi: 'd' }, K), 'bằng chứng: thiếu trường bắt buộc → lỗi');
  const rep = evidenceReport('https://lexkite.com/vi/blog/z/', { file: K });
  ok(/Mục #1 publish/.test(rep) && /OpenTimestamps/.test(rep) && /RFC 3161/.test(rep) && /Zenodo/.test(rep) && /Wayback/.test(rep) && /Software Heritage/.test(rep), 'evidence: gom băm, OTS, RFC 3161, Zenodo, Wayback, SWH');
  ok(/Canary cnr-tr-01/.test(evidenceReport('cnr-tr-01')), 'evidence: tra theo id canary');
  const ce = fs.readFileSync('.github/workflows/content-evidence.yml', 'utf8');
  for (const st of ['Wayback', 'Nhãn hiệu', 'Software Heritage', 'Zenodo', 'OpenTimestamps', 'Tem thời gian RFC 3161']) ok(/continue-on-error: true/.test(step(ce, st)) || /continue-on-error: true/.test(ce.slice(ce.indexOf(`- name: ${st}`), ce.indexOf(`- name: ${st}`) + 400)), `content-evidence: bước ${st} không làm đỏ CI`);
  ok(/(git add|push-main\.sh "[^"]*") [^\n]*content\/protection\/tsa/.test(ce) && /concurrency:\n  group: content-protect/.test(ce), 'content-evidence: commit .tsr, chạy tuần tự với content-protect');
  ok(!/zenodo-deposit|tsa\.mjs stamp|swh-save/.test(fs.readFileSync('scripts/test/suite.txt', 'utf8')), 'bên thứ ba không chạy cục bộ trong npm test (chỉ CI)');
}

console.log(fails ? `✗ protection: ${fails}/${n} lỗi` : `✓ protection: ${n} kiểm tra đạt (WAF, sổ băm, OpenTimestamps, WebSub, copy-watch, robots/AI, LICENSE, canary, Wayback/RFC 3161/SWH/Zenodo/nhãn hiệu)`);
process.exit(fails ? 1 : 0);
