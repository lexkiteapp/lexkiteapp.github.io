// Kế hoạch nội dung theo nhóm CPM (content/blog/plan/2027-01-cpm-clusters.json) + cấu hình trang từ: không hứa tính năng app không có, không đụng slug đã đăng.
import fs from 'node:fs';
import { HIGH_CPM, PRIORITY_LANGS } from '../../functions/api/_cpm.js';
import { LANGS } from '../seo/gsc.mjs';
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.error('✗', m); } };
const P = JSON.parse(fs.readFileSync('content/blog/plan/2027-01-cpm-clusters.json', 'utf8')), T = P.topics;
const appSrc = ['app', 'hubs', 'path'].map(f => fs.readFileSync(`web/js/${f}.js`, 'utf8')).join('\n');
const units = new Set(fs.readdirSync('content/confidence/units').map(f => JSON.parse(fs.readFileSync(`content/confidence/units/${f}`, 'utf8')).id));
const posts = new Set(LANGS.flatMap(l => (fs.existsSync(`content/blog/${l}`) ? fs.readdirSync(`content/blog/${l}`) : []).map(f => f.replace(/\.md$/, ''))));
ok(new Set(T.map(t => t.id)).size === T.length, 'id trùng');
ok(new Set(T.map(t => t.keyword)).size === T.length, 'từ khoá trùng: một từ khoá chính/bài');
ok(P.priority.every(c => T.some(t => t.cluster === c)) && T.every(t => P.priority.includes(t.cluster)), 'cụm trong priority phải khớp topics');
for (const c of P.priority) ok(T.filter(t => t.cluster === c && t.role === 'pillar').length === 1, `${c}: đúng 1 bài trụ`);
for (const t of T) {
  // Chủ đề 'planned' không được trùng slug bài đã có; đã viết ('writing'/'published') thì bài en phải có thật và cùng translationKey
  if (t.status === 'planned') ok(!posts.has(t.id), `${t.id}: trùng slug bài đã có`);
  else ok(['writing', 'published'].includes(t.status), `${t.id}: status lạ ${t.status}`);
  for (const [l, x] of Object.entries(t.locales || {})) { ok(LANGS.includes(l) && l !== 'en' && /^[a-z0-9-]+$/.test(x.slug) && x.keyword, `${t.id}: locales.${l} thiếu slug/keyword`); ok(!T.some(u => u.id === x.slug), `${t.id}: locales.${l} trùng id chủ đề`); }
  if (t.status === 'published') for (const [l, f] of [['en', t.id], ...Object.entries(t.locales || {}).map(([l, x]) => [l, x.slug])]) { const fp = `content/blog/${l}/${f}.md`; ok(fs.existsSync(fp) && new RegExp(`^translationKey: ${t.translationKey}$`, 'm').test(fs.readFileSync(fp, 'utf8')), `${t.id}: ${fp} thiếu hoặc lệch translationKey`); }
  ok(t.markets.length && t.markets.every(m => Object.hasOwn(HIGH_CPM, m)), `${t.id}: thị trường ngoài nhóm CPM`);
  ok(t.factCheck.length > 0 && t.appSupports, `${t.id}: thiếu nguồn kiểm hoặc phần app hỗ trợ`);
  const r = /^\/app\/#\/([a-z-]+)(?:\/(.+))?$/.exec(t.feature); ok(r, `${t.id}: feature phải là route app`);
  if (r) { ok(appSrc.includes(`#/${r[1]}`) || appSrc.includes(`'${r[1]}'`), `${t.id}: route #/${r[1]} không có trong app`); if (r[1] === 'confidence' && r[2]) ok(units.has(r[2]), `${t.id}: không có bài giao tiếp ${r[2]}`); }
  // App không có đề thi thử/chấm điểm PTE, CELPIP: bài về hai kỳ thi này phải ghi rõ, và không trỏ tới màn thi
  if (/pte|celpip/.test(t.keyword)) { const x = /pte/.test(t.keyword) ? 'PTE' : 'CELPIP'; ok(t.mustNotClaim.some(c => c.includes(`${x} mock test`) || c.includes(`${x}-specific`)), `${t.id}: thiếu cấm hứa ${x}`); ok(!/#\/(tests|toefl|toeic)/.test(t.feature), `${t.id}: không trỏ màn thi`); }
  if (/ielts|pte|celpip/.test(t.keyword)) ok(t.mustNotClaim.some(c => /guaranteed visa/.test(c)), `${t.id}: thiếu cấm hứa visa`);
}
ok(PRIORITY_LANGS.every(l => LANGS.includes(l)), 'ngôn ngữ ưu tiên phải thuộc 15 ngôn ngữ của app – không mở ngôn ngữ mới');
if (fails) { console.error(`✗ cpm-plan: ${fails} lỗi`); process.exit(1); }
console.log(`✓ cpm-plan: ${T.length} chủ đề, ${P.priority.length} cụm, không hứa tính năng app không có, ngôn ngữ ưu tiên ${PRIORITY_LANGS.join(' ')}`);
