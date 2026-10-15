// Kiểm SEO on-page + chất lượng bài blog (SEO-PLAN §4 bước 7, định dạng §5).
// Dùng: node scripts/blog-check.mjs [--root content/blog] [file.md …]   (không có file → mọi bài không phải draft)
// Build gọi: import { checkPosts } from './blog-check.mjs' → { errors: string[], warnings: string[] } (mỗi dòng "file: [luật] thông điệp")
import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { ROOT, CATEGORIES, plainText, wordCount, readPost, loadPostsAt, briefSlugs, mediaIds } from './lib/blog-content.mjs';

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/, TAG = /^[a-z0-9-]+$/, YT = /^[\w-]{11}$/;
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/, DAY = /^\d{4}-\d{2}-\d{2}$/;
const RESERVED = new Set(['trang', 'chu-de', 'the', 'page', 'topic', 'tag', 'rss.xml', 'gioi-thieu']); // /blog/<…>/ không phải bài
const FAQ = /^(câu hỏi thường gặp|faq)\b/i;
const rel = f => (f && !path.relative(process.cwd(), f).startsWith('..') ? path.relative(process.cwd(), f) : f);
const len = s => [...String(s ?? '')].length;
const norm = s => String(s ?? '').normalize('NFC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const has = (text, kw) => !!kw && (' ' + norm(text) + ' ').includes(' ' + norm(kw) + ' ');
const words = s => s.match(/[\p{L}\p{N}][\p{L}\p{N}'’.-]*/gu) || [];
// Bỏ khối code để không bắt nhầm tiêu đề/liên kết bên trong (giữ số dòng)
const noCode = body => body.replace(/```[\s\S]*?```/g, m => m.replace(/[^\n]/g, ''));

export function checkPosts(posts, { all = posts, root = ROOT } = {}) {
  const errors = [], warnings = [];
  const media = mediaIds(root), briefs = new Set(briefSlugs(root));
  const slugs = new Set([...all, ...posts].map(p => `${p.lang}/${p.slug}`));
  if (media.fallback) warnings.push(`${rel(path.join(root, 'media.json'))}: [media] chưa có media.json – tạm kiểm id ảnh theo shots.json`);
  // Đếm trùng giữa các bài cùng ngôn ngữ (gộp all + posts, theo đường dẫn file)
  const uniq = new Map([...all, ...posts].map(p => [path.resolve(p.file), p]));
  const seen = {}; for (const k of ['slug', 'title', 'description', 'keyword']) { seen[k] = new Map(); for (const p of uniq.values()) { const v = p[k] && `${p.lang}\u0000${norm(p[k])}`; if (v) seen[k].set(v, [...(seen[k].get(v) || []), p.file]); } }

  for (const p of posts) {
    const E = (rule, msg) => errors.push(`${rel(p.file)}: [${rule}] ${msg}`), W = (rule, msg) => warnings.push(`${rel(p.file)}: [${rule}] ${msg}`);
    const body = noCode(p.body || ''), lines = body.split('\n'), draft = p.status === 'draft';
    const fileSlug = path.basename(p.file, '.md'), folder = path.basename(path.dirname(p.file));
    const kw = typeof p.keyword === 'string' ? p.keyword : '';
    // Front matter
    if (len(p.title) < 30 || len(p.title) > 65) E('title', `tiêu đề ${len(p.title)} ký tự (cần 30–65)`);
    if (len(p.description) < 110 || len(p.description) > 160) E('description', `mô tả ${len(p.description)} ký tự (cần 110–160)`);
    if (!SLUG.test(p.slug || '') || p.slug.length > 75) E('slug', `slug "${p.slug}" phải khớp a-z0-9-, ≤ 75 ký tự`);
    if (p.slug !== fileSlug) E('slug', `slug "${p.slug}" khác tên file "${fileSlug}"`);
    if (p.lang !== folder) E('lang', `lang "${p.lang}" khác thư mục "${folder}"`);
    if (!Object.hasOwn(CATEGORIES, p.category || '')) E('category', `chuyên mục "${p.category ?? ''}" không hợp lệ (${Object.keys(CATEGORIES).join(' | ')})`);
    const tags = Array.isArray(p.tags) ? p.tags : [];
    if (tags.length < 2 || tags.length > 6) E('tags', `cần 2–6 thẻ, đang có ${tags.length}`);
    for (const t of tags) if (!TAG.test(t)) E('tags', `thẻ "${t}" phải là a-z0-9-`);
    if (!kw) E('keyword', 'thiếu keyword');
    else if (kw !== kw.toLowerCase()) E('keyword', `keyword "${kw}" phải viết thường`);
    if (p.status && !['ready', 'draft'].includes(p.status)) E('status', `status "${p.status}" phải là ready | draft`);
    if (p.publishAt && !(ISO.test(p.publishAt) && !isNaN(Date.parse(p.publishAt)))) E('publishAt', `"${p.publishAt}" không phải ISO 8601 có múi giờ (vd 2026-10-16T08:17:00+07:00)`);
    if (p.factChecked) { if (!DAY.test(p.factChecked) || isNaN(Date.parse(p.factChecked))) E('factChecked', `"${p.factChecked}" phải là ngày YYYY-MM-DD`); }
    else if (!draft) E('factChecked', 'thiếu factChecked (bắt buộc khi không phải draft)');
    // Điểm chất lượng từ bước chấm (prompts/6-review.md): bắt buộc ≥ 85/100 cho bài mới (bài kiểm chứng trước 16/10/2026 được miễn)
    const qs = p.qualityScore === '' || p.qualityScore == null ? null : Number(p.qualityScore);
    if (qs != null && !(qs >= 85 && qs <= 100)) E('quality', `qualityScore ${p.qualityScore} – cần 85–100 (chấm lại theo prompts/6-review.md)`);
    else if (qs == null && !draft && !(p.factChecked && p.factChecked <= '2026-10-15')) E('quality', 'thiếu qualityScore (chấm theo prompts/6-review.md, cần ≥ 85)');
    if (!draft && /TODO-LOCALIZE|<!--\s*(Brief|Viết theo)/.test(p.body || '')) E('todo', 'còn ghi chú nháp (TODO-LOCALIZE / Brief) trong bài');
    if (p.updated && (!DAY.test(p.updated) || isNaN(Date.parse(p.updated)))) E('updated', `"${p.updated}" phải là ngày YYYY-MM-DD`);
    // Từ khóa
    if (kw) {
      if (!has(p.title, kw)) E('keyword', `từ khóa "${kw}" không có trong tiêu đề`);
      if (!has(words(plainText(p.body || '')).slice(0, 120).join(' '), kw)) E('keyword', `từ khóa "${kw}" không có trong 120 từ đầu`);
      if (!has(p.description, kw)) W('keyword', 'mô tả không chứa từ khóa');
    }
    // Tiêu đề
    const heads = []; lines.forEach((l, i) => { const m = l.match(/^(#{1,6})\s+(.*?)\s*#*\s*$/); if (m) heads.push({ lv: m[1].length, text: m[2], i }); });
    if (heads.some(h => h.lv === 1)) E('h1', 'thân bài không được có H1 (# …) – tiêu đề đã là H1');
    const h2 = heads.filter(h => h.lv === 2);
    if (h2.length < 4) E('h2', `cần ≥ 4 H2, đang có ${h2.length}`);
    if (kw && !h2.some(h => has(h.text, kw))) E('keyword', `từ khóa "${kw}" không có trong H2 nào`);
    let prev = 1; for (const h of heads) { if (h.lv > prev + 1) E('heading', `nhảy cấp H${prev}→H${h.lv}: "${h.text}"`); prev = h.lv; }
    const wc = wordCount(p.body || ''); if (wc < 1200) E('words', `${wc} từ (cần ≥ 1200)`);
    // Ảnh
    const imgId = src => (src.match(/^media:([\w-]+)$/) || [])[1];
    for (const m of body.matchAll(/!\[([^\]]*)\]\(\s*([^)\s]+)(?:\s+"([^"]*)")?\s*\)/g)) {
      const id = imgId(m[2]);
      if (!id) E('image', `ảnh "${m[2]}" phải dùng dạng media:<id>`);
      else if (!media.ids.has(id)) E('image', `ảnh media:${id} không có trong ${media.fallback ? 'shots.json' : 'media.json'}`);
      if (len(m[1].trim()) < 10) E('image', `alt ảnh "${m[1]}" quá ngắn (cần ≥ 10 ký tự)`);
    }
    // Số ảnh: ≥ 2 ảnh thân bài khác ảnh bìa và khác nhau; bài dài (≥ 1.800 từ) nên ≥ 3
    const bodyImgs = new Set([...body.matchAll(/!\[[^\]]*\]\(\s*media:([\w-]+)/g)].map(m => m[1]).filter(id => id !== p.cover));
    if (bodyImgs.size < 2) E('image', `cần ≥ 2 ảnh trong thân bài (khác ảnh bìa, khác nhau), đang có ${bodyImgs.size}`);
    else if (wc >= 1800 && bodyImgs.size < 3) W('image', `bài dài ${wc} từ nên có ≥ 3 ảnh thân bài (đang ${bodyImgs.size})`);
    if (!p.cover) E('cover', 'thiếu cover'); else if (!media.ids.has(p.cover)) E('cover', `cover "${p.cover}" không có trong ${media.fallback ? 'shots.json' : 'media.json'}`);
    if (len(String(p.coverAlt ?? '').trim()) < 10) E('cover', 'coverAlt cần ≥ 10 ký tự');
    // Shortcode
    let yt = 0; const ctas = [];
    for (const m of body.matchAll(/\{\{([\s\S]*?)\}\}/g)) {
      const s = m[1].trim(), y = s.match(/^youtube:\s*([^|]*?)\s*(\|[\s\S]*)?$/), c = s.match(/^cta:\s*(\/\S*)\s*\|\s*(\S[\s\S]*)$/);
      if (y) { yt++; if (y[1] && !YT.test(y[1])) E('youtube', `ID YouTube "${y[1]}" không hợp lệ (trống hoặc 11 ký tự)`); }
      else if (c) ctas.push(c[1]);
      else if (/^cta:/.test(s)) E('cta', `sai cú pháp "{{${s}}}" – cần {{cta: /đường-dẫn | chữ nút}}`);
      else E('shortcode', `mã lạ "{{${s.slice(0, 40)}}}"`);
    }
    if (!yt) W('youtube', 'chưa có slot {{youtube: | …}}');
    // Liên kết (kể cả nút CTA)
    const hrefs = [...[...body.matchAll(/(?<!!)\[[^\]]*\]\(\s*([^)\s]+)(?:\s+"[^"]*")?\s*\)/g)].map(m => m[1]), ...ctas];
    const internal = hrefs.filter(h => h.startsWith('/') && !h.startsWith('//')), app = internal.filter(h => h.startsWith('/#/'));
    if (internal.length < 3) E('links', `cần ≥ 3 liên kết nội bộ, đang có ${internal.length}`);
        if (app.length - ctas.filter(h => h.startsWith('/#/')).length < 2) E('links', `cần ≥ 2 liên kết vào app (/#/…) trong câu chữ (không tính nút CTA), đang có ${app.length - ctas.filter(h => h.startsWith('/#/')).length}`);
    const blogOut = new Set(internal.map(h => (h.match(/^\/(?:[a-z]{2}(?:-[a-z]+)?\/)?blog\/([^/#?]+)\//) || [])[1]).filter(x => x && !RESERVED.has(x)));
    if (blogOut.size < 4) E('links', `cần ≥ 4 liên kết tới bài blog khác (khác nhau), đang có ${blogOut.size}`);
    if (!internal.some(h => /^\/(samples|speaking|tu-vung|ngu-phap|viet-thu)\//.test(h))) W('links', 'nên có ≥ 1 liên kết tới trang tĩnh /tu-vung/, /samples/, /ngu-phap/, /speaking/ hoặc /viet-thu/');
    for (const h of internal) {
      const m = h.match(/^\/(?:([a-z]{2}(?:-[a-z]+)?)\/)?blog\/([^/#?]+)\/?(?:[#?].*)?$/);
      if (!m || RESERVED.has(m[2])) continue;
      const l = m[1] || 'vi';
      if (!slugs.has(`${l}/${m[2]}`) && !(l === 'vi' && briefs.has(m[2]))) E('links', `liên kết ${h} trỏ tới bài không tồn tại`);
      if (!h.endsWith('/') && !/[#?]/.test(h)) W('links', `nên có "/" cuối: ${h}`);
    }
    for (const h of hrefs) if (!h.startsWith('/') && !h.startsWith('#') && !h.startsWith('mailto:') && !h.startsWith('https://') || h.startsWith('//')) E('links', `liên kết ngoài phải là https: ${h}`);
    // FAQ: ≥ 2 H3, mỗi H3 có đoạn trả lời ngay sau
    const faq = h2.find(h => FAQ.test(h.text.trim()));
    if (faq) {
      const end = h2.find(h => h.i > faq.i)?.i ?? lines.length, qs = heads.filter(h => h.lv === 3 && h.i > faq.i && h.i < end);
      if (qs.length < 2) E('faq', `mục "${faq.text}" cần ≥ 2 câu hỏi H3`);
      for (const q of qs) { const next = lines.slice(q.i + 1, end).find(l => l.trim()); if (!next || /^(#|\{\{|!\[)/.test(next.trim())) E('faq', `câu hỏi "${q.text}" thiếu đoạn trả lời`); }
    }
    // Đoạn quá dài
    for (const para of body.split(/\n\s*\n/)) { const t = para.trim(); if (!t || /^(#|[-*+] |\d+\. |\||>|!\[|\{\{)/.test(t)) continue; const n = wordCount(t); if (n > 120) W('paragraph', `đoạn ${n} từ (> 120): "${t.slice(0, 50)}…"`); }
    // Trùng giữa các bài (cùng ngôn ngữ)
    for (const k of ['slug', 'title', 'description', 'keyword']) { const v = p[k] && `${p.lang}\u0000${norm(p[k])}`, fs_ = v ? seen[k].get(v) : null; if (fs_ && fs_.length > 1) E('duplicate', `${k} trùng với ${fs_.filter(f => path.resolve(f) !== path.resolve(p.file)).map(rel).join(', ')}`); }
  }
  // Chú thích ảnh phải viết theo ngữ cảnh từng bài – trùng nguyên văn giữa các bài là lỗi (nội dung rập khuôn)
  const capSeen = new Map();
  for (const p of all.filter(x => x.status !== 'draft')) for (const m of (p.body || '').matchAll(/!\[[^\]]*\]\(\s*media:[\w-]+\s+"([^"]+)"\s*\)/g)) { const k = `${p.lang}\u0000${m[1].trim().toLowerCase()}`; (capSeen.get(k) || capSeen.set(k, new Set()).get(k)).add(rel(p.file)); }
  for (const p of posts) for (const m of (p.body || '').matchAll(/!\[[^\]]*\]\(\s*media:[\w-]+\s+"([^"]+)"\s*\)/g)) { const f = capSeen.get(`${p.lang}\u0000${m[1].trim().toLowerCase()}`); if (f && f.size > 1) errors.push(`${rel(p.file)}: [caption] chú thích "${m[1].slice(0, 60)}" trùng ${f.size - 1} bài khác – viết theo ngữ cảnh bài`); }
  // Liên kết đến: bài không được bài nào trỏ tới là “bài mồ côi” (Google khó thấy, ít được chuyền sức mạnh)
  const live = all.filter(p => p.status !== 'draft'), inbound = new Map();
  for (const p of live) for (const m of new Set([...p.body.matchAll(/\]\(\/(?:[a-z]{2}(?:-[a-z]+)?\/)?blog\/([^/#?)]+)\//g)].map(m => `${p.lang}/${m[1]}`))) inbound.set(m, (inbound.get(m) || 0) + 1);
  if (live.length >= 10) for (const p of posts) { const n = inbound.get(`${p.lang}/${p.slug}`) || 0; if (n < 3) warnings.push(`${rel(p.file)}: [inbound] chỉ ${n} bài khác trỏ tới (nên ≥ 3) – thêm liên kết từ bài liên quan`); }
  return { errors, warnings };
}

// ——— Dòng lệnh ———
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2); let root = ROOT; const files = [];
  for (let i = 0; i < args.length; i++) args[i] === '--root' ? (root = args[++i]) : files.push(args[i]);
  const all = loadPostsAt(root);
  const posts = files.length ? files.map(readPost) : all.filter(p => p.status !== 'draft');
  const { errors, warnings } = checkPosts(posts, { all, root });
  for (const w of warnings) console.log(`⚠ ${w}`);
  for (const e of errors) console.log(`✗ ${e}`);
  console.log(`${errors.length ? '✗' : '✓'} blog-check: ${posts.length} bài, ${errors.length} lỗi, ${warnings.length} cảnh báo`);
  process.exit(errors.length ? 1 : 0);
}
