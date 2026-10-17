// CLI sổ đăng ký nội dung (thư viện: scripts/lib/content-registry.mjs; tài liệu: docs/CONTENT-PROTECTION.md).
//   node scripts/content-registry.mjs record [url…]   (hoặc đọc URL từ stdin: blog-due --since 70 | …)  băm HTML live + nguồn .md
//   node scripts/content-registry.mjs archive <url> <archiveUrl>                                          ghi bản lưu Wayback
//   node scripts/content-registry.mjs snapshot                     gốc băm kho nội dung học (web/js, content/ trừ blog) theo git
//   node scripts/content-registry.mjs release <addon|landing>   mốc phát hành: phiên bản add-on / landing dựng lại + gốc băm mã phát hành
//   node scripts/content-registry.mjs verify                       kiểm chuỗi băm (CI + npm test)
//   node scripts/content-registry.mjs evidence <url>               gom bằng chứng 1 bài (mục sổ + lịch sử git nguồn) cho hồ sơ DMCA
// record: chờ trang live (HTTP 200 + có canonical đúng URL) tối đa --wait giây; gửi header X-Lexkite-CI (secret LEXKITE_CI_HEADER) để qua WAF.
import fs from 'node:fs'; import { execFileSync } from 'node:child_process';
import { REGISTRY, readRegistry, verifyChain, recordPublish, recordArchive, datasetRoot, recordDataset, recordRelease } from './lib/content-registry.mjs';
import { readPost } from './lib/blog-content.mjs';
import { request, sleep, stdinText } from './lib/http.mjs';

const [cmd, ...rest] = process.argv.slice(2), pos = rest.filter(a => !a.startsWith('--'));
const opt = (k, d) => { const i = rest.indexOf(k); return i >= 0 ? rest[i + 1] : d; };
const file = opt('--file', REGISTRY);
const git = (...a) => { try { return execFileSync('git', a).toString().trim(); } catch { return ''; } };
const LANDING_LANGS = ['en', 'es', 'pt', 'fr', 'de', 'id', 'th', 'zh', 'ja', 'ko', 'hi', 'ar', 'ru', 'tr'];
const commit = process.env.GITHUB_SHA || git('rev-parse', 'HEAD');

async function record() {
  let urls = pos.filter(u => /^https:\/\//.test(u));
  if (!urls.length && !process.stdin.isTTY) urls = (await stdinText()).split(/\s+/).filter(u => /^https:\/\//.test(u));
  const wait = Number(opt('--wait', 600)), canon = h => (h.match(/<link rel="canonical" href="([^"]+)"/) || [])[1];
  let bad = 0;
  for (const url of urls) {
    const m = new URL(url).pathname.match(/^\/([a-z]{2})\/blog\/([^/]+)\/$/), src = m && fs.existsSync(`content/blog/${m[1]}/${m[2]}.md`) ? `content/blog/${m[1]}/${m[2]}.md` : null;
    const post = src ? readPost(src) : null;
    let r, t0 = Date.now();
    for (;;) { // bài vừa đăng: Cloudflare build ~3–6 phút → thử lại tới khi live
      r = request(url, { ci: true });
      if (r.status === 200 && canon(r.body) === url) break;
      if ((Date.now() - t0) / 1e3 > wait) break;
      await sleep(30e3);
    }
    if (r.status !== 200 || canon(r.body) !== url) { bad++; console.error(`✗ ${url}: chưa live (HTTP ${r.status}${r.status === 200 ? ', canonical khác' : ''})`); continue; }
    const { skipped, entry } = recordPublish({ url, html: r.body, source: post ? post.src : undefined, publishedAt: post?.publishAt, lang: post?.lang, slug: post?.slug, commit }, file);
    console.log(`${skipped ? '·' : '✓'} ${url} #${entry.seq} html ${entry.htmlSha256.slice(0, 12)}…${skipped ? ' (đã ghi trước đó)' : ''}`);
    await sleep(1500); // < 1 req/s – luôn dưới ngưỡng rate limit
  }
  if (bad) process.exitCode = 1;
}

if (cmd === 'record') await record();
else if (cmd === 'archive') { const [url, archiveUrl] = pos; const e = recordArchive({ url, archiveUrl, at: opt('--at') }, file); console.log(`✓ archive #${e.seq} ${archiveUrl}`); }
else if (cmd === 'snapshot') {
  // dữ liệu học (đề, lời giải, ngữ pháp, từ vựng – ~2.784 câu hỏi + bài mẫu) nằm trong web/js/** và content/** (trừ blog, sổ đăng ký)
  const ls = git('ls-files', '-s', '--', 'web/js', 'content', ':!content/blog', ':!content/protection');
  if (!ls) { console.error('✗ snapshot: git ls-files rỗng'); process.exit(1); }
  const { root, files } = datasetRoot(ls), { skipped, entry } = recordDataset({ name: 'learning-content', root, files, commit }, file);
  console.log(`${skipped ? '· không đổi' : '✓ ghi'} learning-content #${entry.seq}: ${files} file, root ${root.slice(0, 16)}…`);
} else if (cmd === 'release') {
  // mã phát hành công khai (repo public) – gốc băm git ls-files, không đọc file ngoài git (không bao giờ dính dữ liệu riêng)
  const name = pos[0], SRC = { addon: ['extension'], landing: ['content/landing', 'scripts/build-landing.mjs', 'scripts/lib/site-layout.mjs', 'web/index.html', ...LANDING_LANGS.map(l => `web/${l}/index.html`)] }[name];
  if (!SRC) { console.error('✗ release: addon | landing'); process.exit(2); }
  const ls = git('ls-files', '-s', '--', ...SRC);
  if (!ls) { console.error(`✗ release ${name}: git ls-files rỗng`); process.exit(1); }
  const version = name === 'addon' ? JSON.parse(fs.readFileSync('extension/manifest.json', 'utf8')).version : undefined;
  const { root, files } = datasetRoot(ls), { skipped, entry } = recordRelease({ name, version, root, files, commit }, file);
  console.log(`${skipped ? '· không đổi' : '✓ ghi'} release ${name}${version ? ` ${version}` : ''} #${entry.seq}: ${files} file, root ${root.slice(0, 16)}…`);
} else if (cmd === 'evidence') {
  const url = pos[0], m = url && new URL(url).pathname.match(/^\/([a-z]{2})\/blog\/([^/]+)\/$/), src = m ? `content/blog/${m[1]}/${m[2]}.md` : null;
  const all = readRegistry(file), v = verifyChain(all), mine = all.filter(e => e.url === url);
  console.log(`# Bằng chứng tác quyền: ${url}\nSổ: ${file} (${v.ok ? `chuỗi băm hợp lệ, ${v.count} mục, head ${v.head}` : `HỎNG ở mục ${v.at}`})`);
  for (const e of mine) console.log(`- #${e.seq} ${e.type} lúc ${e.at}${e.publishedAt ? ` · publishAt ${e.publishedAt}` : ''}${e.htmlSha256 ? ` · sha256(HTML) ${e.htmlSha256}` : ''}${e.sourceSha256 ? ` · sha256(nguồn) ${e.sourceSha256}` : ''}${e.archiveUrl ? ` · ${e.archiveUrl}` : ''}${e.commit ? ` · commit ${e.commit}` : ''} · hash ${e.hash}`);
  if (!mine.length) console.log('- (chưa có mục nào cho URL này)');
  if (src && fs.existsSync(src)) console.log(`Lịch sử git nguồn ${src} (cũ nhất trước):\n` + git('log', '--follow', '--reverse', '--format=- %H %cI %s', '--', src) + `\nXem: https://github.com/lexkiteapp/lexkiteapp.github.io/commits/main/${src}`);
} else if (cmd === 'verify') {
  const all = readRegistry(file), v = verifyChain(all);
  if (!v.ok) { console.error(`✗ registry: hỏng ở mục ${v.at} – ${v.why}`); process.exit(1); }
  const n = t => all.filter(e => e.type === t).length;
  console.log(`✓ registry: ${v.count} mục hợp lệ (publish ${n('publish')}, archive ${n('archive')}, dataset ${n('dataset')}, release ${n('release')}) · head ${v.head.slice(0, 16)}…`);
} else { console.error('Lệnh: record [url…] | archive <url> <archiveUrl> | snapshot | release <addon|landing> | verify | evidence <url>   [--file path]'); process.exit(2); }
