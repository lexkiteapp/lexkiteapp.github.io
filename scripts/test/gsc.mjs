// 🧪 Vòng GSC (scripts/seo/gsc.mjs) với dữ liệu giả – không gọi API thật, không cần secret. Chạy trong npm test.
// Kiểm: chuẩn hoá/khớp truy vấn đa ngôn ngữ, (a) gom cụm + khớp brief, (b) striking distance + gợi ý title,
// (c) cannibalization, (d) tụt hiển thị, xếp ưu tiên, JWT RS256 hợp lệ, phân trang API, thiếu secret → exit 0,
// và KHÔNG BAO GIỜ ghi khoá ra file.
import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import { execFileSync, spawnSync } from 'child_process';
import * as G from '../seo/gsc.mjs';

let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.error(`  ✗ ${m}`); } };
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), `${m}: ${JSON.stringify(a)} ≠ ${JSON.stringify(b)}`);

// --- chuẩn hoá, khớp, ngôn ngữ ---
eq(G.norm('Cách học  TỪ VỰNG'), 'cach hoc tu vung', 'norm bỏ dấu Việt');
ok(G.matches('fsrs la gi', 'fsrs là gì'), 'khớp không dấu ↔ có dấu');
ok(G.matches('ielts speaking part 3 tips', 'ielts speaking part 3'), 'khớp truy vấn dài hơn từ khoá');
ok(!G.matches('speaking', 'ielts speaking part 3'), 'không khớp truy vấn quá ngắn');
ok(G.matches('雅思口语part 3 技巧', '雅思口语part 3 技巧'), 'khớp CJK theo cặp ký tự');
eq(G.clusterKey('How to learn IELTS vocabulary'), G.clusterKey('ielts vocabulary learn'), 'gom biến thể cùng cụm');
eq(G.detectLang('토익 공부법', 'usa', ''), 'ko', 'Hangul → ko');
eq(G.detectLang('câu bị động', 'usa', ''), 'vi', 'dấu Việt → vi');
eq(G.detectLang('ielts tips', 'vnm', ''), 'vi', 'nước VNM → vi');
eq(G.detectLang('voz pasiva', 'zzz', 'https://lexkite.com/es/blog/x/'), 'es', 'thư mục trang → es');
eq(G.lookupTerm('resilient là gì'), 'resilient', 'tách từ tra (vi)');
eq(G.lookupTerm('meaning of resilient'), 'resilient', 'tách từ tra (en)');
eq(G.lookupTerm('ielts speaking part 3'), null, 'không phải truy vấn tra từ');
eq(G.intentOf('lexkite app'), 'brand', 'truy vấn thương hiệu');
eq(G.ranges('2026-10-26'), { range: { startDate: '2026-09-26', endDate: '2026-10-23' }, prevRange: { startDate: '2026-08-29', endDate: '2026-09-25' } }, '28 ngày kết thúc D-3 + 28 ngày trước');
ok(G.expectedCtr(8) > G.expectedCtr(20), 'đường CTR giảm theo hạng');

// --- repo giả ---
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'gsc-'));
const md = (lang, slug, fm) => { fs.mkdirSync(path.join(root, 'content/blog', lang), { recursive: true }); fs.writeFileSync(path.join(root, 'content/blog', lang, slug + '.md'), `---\n${Object.entries({ slug, lang, ...fm }).map(([k, v]) => `${k}: ${Array.isArray(v) ? `[${v.join(', ')}]` : JSON.stringify(v)}`).join('\n')}\n---\nNội dung.\n`); };
md('vi', 'fsrs-la-gi', { title: 'FSRS là gì? Thuật toán flashcard giúp ôn ít mà nhớ lâu', description: 'FSRS là gì, khác SM-2 ra sao? Giải thích dễ hiểu độ khó, độ ổn định, khả năng nhớ và mục tiêu ghi nhớ.', keyword: 'fsrs là gì', status: 'ready', tags: ['fsrs', 'anki'] });
md('vi', 'cau-bi-dong', { title: 'Câu bị động tiếng Anh: công thức và bài tập', description: 'Câu bị động: công thức theo từng thì, cách chuyển câu chủ động sang bị động và bài tập có đáp án cho người Việt.', keyword: 'câu bị động', status: 'ready' });
md('vi', 'cau-bi-dong-nang-cao', { title: 'Bị động nâng cao: have something done', description: 'Cấu trúc nhờ vả have/get something done và bị động với động từ tường thuật, kèm ví dụ dễ nhớ cho người học.', keyword: 'have something done', status: 'ready' });
md('en', 'make-vs-do', { title: 'Make vs Do: the difference with examples', description: 'Make or do? Clear rules, common collocations and a short quiz so you stop mixing them up in speaking and writing.', keyword: 'make vs do', status: 'ready' });
fs.writeFileSync(path.join(root, 'content/blog/briefs.json'), JSON.stringify({ briefs: [
  { slug: 'menh-de-quan-he', lang: 'vi', keyword: 'mệnh đề quan hệ', cluster: 'relative-clauses' },
  { slug: 'fsrs-la-gi', lang: 'vi', keyword: 'fsrs là gì' },
] }));
const U = (l, s) => `https://lexkite.com/${l}/blog/${s}/`;
const R = (keys, impressions, clicks, position) => ({ keys, impressions, clicks, ctr: clicks / impressions, position });
const fx = {
  qpc: [
    R(['mệnh đề quan hệ', 'https://lexkite.com/vi/', 'vnm'], 300, 3, 22),     // (a) brief có sẵn chưa viết
    R(['menh de quan he', 'https://lexkite.com/vi/', 'vnm'], 120, 1, 25),     //     biến thể không dấu → cùng cụm
    R(['phrasal verbs list', 'https://lexkite.com/en/', 'ind'], 200, 1, 35),  // (a) chưa có bài/brief
    R(['fsrs là gì', U('vi', 'fsrs-la-gi'), 'vnm'], 500, 40, 4),             // có bài, hạng tốt → không phải gap
    R(['câu bị động', U('vi', 'cau-bi-dong'), 'vnm'], 600, 3, 12),           // (b) + (c)
    R(['câu bị động', U('vi', 'cau-bi-dong-nang-cao'), 'vnm'], 90, 0, 18),
    R(['lexkite', 'https://lexkite.com/', 'vnm'], 900, 300, 1),               // thương hiệu → bỏ
    R(['resilient là gì', 'https://lexkite.com/vi/words/resilient', 'vnm'], 80, 0, 15), // hàng đợi từ điển
    R(['make vs do', U('en', 'make-vs-do'), 'ind'], 40, 0, 50),              // dưới ngưỡng 50 → bỏ
  ],
  pageCur: [R([U('vi', 'fsrs-la-gi')], 520, 40, 4), R([U('vi', 'cau-bi-dong')], 600, 3, 12), R([U('en', 'make-vs-do')], 40, 0, 50)],
  pagePrev: [R([U('vi', 'fsrs-la-gi')], 560, 41, 4), R([U('en', 'make-vs-do')], 400, 12, 9), R([U('vi', 'cau-bi-dong')], 90, 1, 20)],
};
fx.qp = []; // để trống → script tự gộp từ qpc (đường dự phòng)
const rep = G.analyze(fx, G.loadContent(root));

const gap = q => rep.gaps.find(g => g.query === q || g.variants.includes(q));
ok(gap('mệnh đề quan hệ') && gap('mệnh đề quan hệ').kind === 'brief-unwritten', '(a) brief chưa viết được nhận ra');
ok(gap('mệnh đề quan hệ') && gap('mệnh đề quan hệ').impressions === 420, '(a) gộp biến thể có/không dấu (300+120)');
ok(gap('phrasal verbs list') && gap('phrasal verbs list').kind === 'no-post' && gap('phrasal verbs list').lang === 'en', '(a) chưa có bài → new-brief, ngôn ngữ theo nước IND → en');
ok(!gap('fsrs là gì'), '(a) có bài đúng ý hạng ≤ 30 → không phải gap');
ok(!gap('lexkite'), '(a) bỏ truy vấn thương hiệu');
ok(!gap('make vs do'), '(a) dưới ngưỡng hiển thị');
eq(rep.gaps[0].query, 'mệnh đề quan hệ', '(a) brief có sẵn xếp đầu');

const sd = rep.striking.find(s => s.slug === 'cau-bi-dong');
ok(sd && sd.queries[0].query === 'câu bị động' && sd.queries[0].position === 12, '(b) bắt trang hạng 12 CTR 0,5 %');
ok(sd && sd.hints.some(h => /KHÔNG đổi slug/.test(h)), '(b) nhắc không đổi slug');
ok(sd && sd.suggestedTitle === null, '(b) tiêu đề đã chứa truy vấn → không đề xuất đổi');
ok(!rep.striking.some(s => s.slug === 'cau-bi-dong-nang-cao'), '(b) dưới 100 hiển thị → bỏ');
const sdHint = G.analyze({ qpc: [R(['passive voice exercises', U('vi', 'cau-bi-dong'), 'vnm'], 400, 1, 14)] }, G.loadContent(root)).striking[0];
ok(sdHint && /^Passive voice exercises: /.test(sdHint.suggestedTitle) && [...sdHint.suggestedTitle].length <= 61, `(b) gợi ý tiêu đề mới chứa truy vấn, ≤ 60 ký tự: ${sdHint && sdHint.suggestedTitle}`);
ok(sdHint && sdHint.suggestedDescription && sdHint.suggestedDescription.length <= 161, '(b) gợi ý mô tả ≤ 160 ký tự');

const can = rep.cannibal.find(c => c.query === 'câu bị động');
ok(can && can.sameLang && can.winner === U('vi', 'cau-bi-dong') && can.pages.length === 2, '(c) 2 URL cùng truy vấn, chọn trang thắng');

const dec = rep.declines.find(d => d.slug === 'make-vs-do');
ok(dec && dec.change < -0.8 && /Tụt hạng/.test(dec.hint), '(d) make-vs-do tụt 400 → 40, hạng 9 → 50');
ok(!rep.declines.some(d => d.slug === 'fsrs-la-gi'), '(d) giảm nhẹ 7 % → bỏ');
ok(!rep.declines.some(d => d.slug === 'cau-bi-dong'), '(d) trang tăng → bỏ');

ok(rep.dictQueue.some(d => d.term === 'resilient'), 'hàng đợi từ điển có "resilient"');
ok(rep.priority.length >= 4 && rep.priority.every((x, i) => x.rank === i + 1 && (i === 0 || rep.priority[i - 1].gain >= x.gain)), 'ưu tiên xếp giảm dần theo gain');
ok(new Set(rep.priority.map(x => x.type)).size >= 4, 'ưu tiên có đủ loại việc');

// --- CLI với fixture: ghi báo cáo + plan, cắt báo cáo cũ ---
const fxFile = path.join(root, 'fx.json'); fs.writeFileSync(fxFile, JSON.stringify(fx));
fs.mkdirSync(path.join(root, 'reports/seo'), { recursive: true });
fs.writeFileSync(path.join(root, 'reports/seo/gsc-2026-01-05.json'), '{}'); fs.writeFileSync(path.join(root, 'reports/seo/gsc-2026-09-28.json'), '{}');
execFileSync(process.execPath, ['scripts/seo/gsc.mjs', '--fixture', fxFile, '--root', root, '--date', '2026-10-26'], { stdio: 'pipe', env: { ...process.env, GITHUB_OUTPUT: '' } });
const J = JSON.parse(fs.readFileSync(path.join(root, 'reports/seo/gsc-2026-10-26.json'), 'utf8'));
const MD = fs.readFileSync(path.join(root, 'reports/seo/gsc-2026-10-26.md'), 'utf8');
const P = JSON.parse(fs.readFileSync(path.join(root, 'content/blog/plan/gsc-priority.json'), 'utf8'));
ok(J.site === 'sc-domain:lexkite.com' && J.rows.qpc === fx.qpc.length, 'báo cáo JSON đúng thuộc tính + số dòng');
ok(/## \(a\)/.test(MD) && /## \(b\)/.test(MD) && /## \(c\)/.test(MD) && /## \(d\)/.test(MD), 'tóm tắt markdown đủ 4 phần');
ok(P.items.length === J.priority.length && P.source === 'reports/seo/gsc-2026-10-26.json', 'plan gsc-priority.json trỏ về báo cáo');
ok(!fs.existsSync(path.join(root, 'reports/seo/gsc-2026-01-05.json')) && fs.existsSync(path.join(root, 'reports/seo/gsc-2026-09-28.json')), 'cắt báo cáo > 26 tuần, giữ bản mới');
ok(Buffer.byteLength(JSON.stringify(J)) < 1e6, 'báo cáo < 1 MB');

// --- thiếu secret → hướng dẫn, exit 0, không ghi file ---
const env = { ...process.env }; delete env.GSC_SA_JSON; delete env.GITHUB_OUTPUT;
const root2 = fs.mkdtempSync(path.join(os.tmpdir(), 'gsc2-'));
const r0 = spawnSync(process.execPath, ['scripts/seo/gsc.mjs', '--root', root2], { env, encoding: 'utf8' });
ok(r0.status === 0 && /GSC_SA_JSON/.test(r0.stdout) && /vintagezulilyjewelry/.test(r0.stdout), 'thiếu secret → in hướng dẫn, exit 0');
ok(!fs.existsSync(path.join(root2, 'reports')), 'thiếu secret → không ghi báo cáo');
const rBad = spawnSync(process.execPath, ['scripts/seo/gsc.mjs', '--root', root2], { env: { ...env, GSC_SA_JSON: '{"private_key":"SECRETXYZ"' }, encoding: 'utf8' });
ok(rBad.status === 1 && !/SECRETXYZ/.test(rBad.stdout + rBad.stderr), 'secret hỏng → exit 1, không in nội dung khoá');

// --- JWT + API giả (phân trang, token, không lộ khoá) ---
const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const sa = { client_email: 'gsc-bot@demo.iam.gserviceaccount.com', private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }) };
const jwt = G.signJwt(sa, 1_800_000_000), [h, b, s] = jwt.split('.');
ok(crypto.createVerify('RSA-SHA256').update(`${h}.${b}`).verify(publicKey, Buffer.from(s, 'base64url')), 'JWT RS256 ký đúng');
const claims = JSON.parse(Buffer.from(b, 'base64url').toString());
ok(claims.scope === 'https://www.googleapis.com/auth/webmasters.readonly' && claims.exp - claims.iat === 3600 && claims.aud === 'https://oauth2.googleapis.com/token', 'JWT: scope chỉ đọc, hạn 1 giờ');
const calls = [];
const fake = async (url, init) => {
  calls.push({ url, body: String(init.body || '') });
  const json = o => ({ ok: true, status: 200, json: async () => o, text: async () => JSON.stringify(o) });
  if (url.includes('oauth2')) return json({ access_token: 'tok-1', expires_in: 3600 });
  const q = JSON.parse(init.body); ok(init.headers.authorization === 'Bearer tok-1', 'API dùng Bearer token');
  ok(url.includes('sc-domain%3Alexkite.com') && q.dataState === 'final' && q.type === 'web', 'API đúng thuộc tính + dataState final');
  const n = q.dimensions.length === 3 && q.startRow === 0 ? G.T.rowLimit : q.dimensions.length === 3 ? 7 : 2;
  return json({ rows: Array.from({ length: n }, (_, i) => R([`q${q.startRow + i}`, U('vi', 'p'), 'vnm'].slice(0, q.dimensions.length), 10, 1, 5)) });
};
const pulled = await G.pull(sa, '2026-10-26', fake);
ok(pulled.qpc.length === G.T.rowLimit + 7, `phân trang startRow tới khi hết (${pulled.qpc.length})`);
ok(pulled.pageCur.length === 2 && pulled.pagePrev.length === 2, 'kéo đủ page hiện tại + 28 ngày trước');
const prevCall = calls.filter(c => c.body.includes('"dimensions":["page"]')).pop();
ok(prevCall && prevCall.body.includes('"startDate":"2026-08-29"'), 'kỳ trước đúng ngày');
ok(calls.filter(c => c.url.includes('oauth2')).length === 1, 'chỉ xin token 1 lần');

// --- không bao giờ ghi khoá ra file ---
const keyFrag = sa.private_key.split('\n')[1];
const scan = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? scan(path.join(d, e.name)) : [path.join(d, e.name)]);
ok(scan(root).every(f => !fs.readFileSync(f, 'utf8').includes(keyFrag) && !fs.readFileSync(f, 'utf8').includes('private_key')), 'không file nào chứa khoá');
const src = fs.readFileSync('scripts/seo/gsc.mjs', 'utf8');
ok(!/writeFileSync\([^)]*(sa|raw|private_key)/.test(src) && !/console\.(log|error)\([^)]*(raw|private_key|sa\b)/.test(src), 'mã nguồn không ghi/in biến khoá');

fs.rmSync(root, { recursive: true, force: true }); fs.rmSync(root2, { recursive: true, force: true });
if (fails) { console.error(`✗ gsc: ${fails} kiểm tra hỏng`); process.exit(1); }
console.log('✓ gsc: chuẩn hoá/khớp đa ngôn ngữ, (a)(b)(c)(d), ưu tiên, JWT, phân trang API giả, thiếu secret → exit 0, không lộ khoá');
