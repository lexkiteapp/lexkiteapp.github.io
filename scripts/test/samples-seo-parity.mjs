// Cổng "không mất SEO" cho họ trang thư viện (build-samples*.mjs): so bản dựng PR với bản dựng của base từng trang một.
//   node scripts/test/samples-seo-parity.mjs --snapshot <dist> <out.json>   chụp dấu SEO của một bản dựng
//   node scripts/test/samples-seo-parity.mjs --compare <base.json> <dist>   đỏ khi trang/URL/thẻ/link/chữ biến mất
// Giữ nguyên tuyệt đối: danh sách trang, title, description, canonical, robots, hreflang, OG, JSON-LD. Link nội bộ và từ trong <body> chỉ được thêm.
// Chữ "che giấu" không được tính: nội dung trong [hidden], display:none, aria-hidden hay class .sr không cứu được một từ đã mất khỏi phần hiển thị.
import fs from 'node:fs'; import path from 'node:path';

const ROOTS = ['samples', 'speaking', 'tu-vung', 'ngu-phap', 'viet-thu', 'phat-am', 'en/samples', 'en/speaking', 'en/vocabulary', 'en/grammar', 'en/pronunciation', 'en/ielts-writing'];
const walk = d => fs.existsSync(d) ? fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : e.name.endsWith('.html') ? [path.join(d, e.name)] : []) : [];
const ent = s => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
const attr = (tag, a) => (tag.match(new RegExp(`\\b${a}="([^"]*)"`)) || [])[1] ?? '';

// Bỏ mọi khối không phải nội dung nhìn thấy, kể cả phần ẩn (không tính là "còn chữ")
const HIDDEN = /<(\w+)\b[^>]*(?:\shidden\b|\saria-hidden="true"|class="[^"]*\b(?:sr|vu)\b[^"]*")[^>]*>/;
function visible(body) {
  let s = body.replace(/<(script|style|svg|noscript)\b[\s\S]*?<\/\1>/g, ' ');
  for (let m; (m = s.match(HIDDEN));) { // cắt đúng khối ẩn theo độ sâu thẻ cùng tên
    const name = m[1], from = m.index, re = new RegExp(`<(/?)${name}\\b[^>]*>`, 'g'); re.lastIndex = from; let depth = 0, end = -1;
    for (let t; (t = re.exec(s));) { if (t[0].endsWith('/>')) continue; depth += t[1] ? -1 : 1; if (!depth) { end = re.lastIndex; break; } }
    s = s.slice(0, from) + ' ' + s.slice(end < 0 ? from + m[0].length : end);
  }
  return ent(s.replace(/<[^>]+>/g, ' '));
}
const words = t => [...new Set(t.toLowerCase().match(/[\p{L}\p{N}][\p{L}\p{N}'’/–-]*/gu) || [])];

export function fingerprint(html) {
  const head = (html.match(/<head>([\s\S]*?)<\/head>/) || ['', ''])[1], body = (html.match(/<body[^>]*>([\s\S]*)<\/body>/) || ['', ''])[1];
  const metas = (head.match(/<meta\b[^>]*>/g) || []).filter(t => /(name="(description|robots|twitter:card)"|property="og:)/.test(t)).map(t => `${attr(t, 'name') || attr(t, 'property')}=${attr(t, 'content')}`).sort();
  const links = (head.match(/<link\b[^>]*>/g) || []).filter(t => /rel="(canonical|alternate)"/.test(t)).map(t => `${attr(t, 'rel')}|${attr(t, 'hreflang')}|${attr(t, 'href')}`).sort();
  const ld = (head.match(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g) || []).map(x => x.replace(/<\/?script[^>]*>/g, '')).sort();
  const hrefs = [...new Set([...body.matchAll(/<a\b[^>]*href="([^"#][^"]*)"/g)].map(m => m[1]).filter(h => h.startsWith('/')))].sort();
  return { title: (head.match(/<title>([\s\S]*?)<\/title>/) || ['', ''])[1], metas, links, ld, hrefs, words: words(visible(body)) };
}
// URL đã chuyển có chủ đích: link cũ chỉ được coi là còn khi trang có link tới đúng URL mới (4/11: trang chủ tiếng Việt / → /vi/, docs/SEO-ARCH.md §10)
const MOVED = { '/': '/vi/' };
// 10/11 (#1019): "Liên hệ" ở chân trang chuyển từ /app/#/contact sang mục tĩnh /<lang>/about/#contact (trang tĩnh cho AdSense duyệt): chỉ chấp nhận khi trang có đúng link mới.
// Cùng lần chuyển đó trong JSON-LD: crumb "Trang chủ" của trang vi trỏ /vi/ thay vì / (5/11). Chỉ đúng chuỗi này, mọi đổi khác vẫn đỏ.
const LD_MOVED = [['"name":"Trang chủ","item":"https://lexkite.com/"', '"name":"Trang chủ","item":"https://lexkite.com/vi/"']];
const ldMoved = v => LD_MOVED.reduce((s, [a, b]) => s.split(a).join(b), v);
// Manifest thay đổi CÓ CHỦ ĐÍCH (content/seo-parity-allow.json): mỗi mục = một trang + lý do. Chỉ cho phép: (1) chữ cụ thể được liệt kê bị bỏ (words),
// (2) title/metas/ld đổi ĐÚNG theo cặp thay thế khai báo `replace: [[từ, thành]]` (vd. ["56 bài", "62 bài"]): giá trị mới phải bằng giá trị cũ sau khi thay.
// Link nội bộ mất, canonical/hreflang đổi, trang biến mất: KHÔNG BAO GIỜ được phép.
export function loadAllow(file = 'content/seo-parity-allow.json') {
  try { const j = JSON.parse(fs.readFileSync(file, 'utf8')); return Object.fromEntries((j.entries || []).filter(e => e.page && e.reason).map(e => [e.page, e])); } catch { return {}; }
}
// ItemList (mục lục bài): được THÊM mục mới – mọi url cũ phải còn, numberOfItems = số mục mới (manifest `itemList: true`)
const itemListGrew = (v, b, allow) => { if (!(allow && allow.itemList) || !v.includes('"@type":"ItemList"')) return false; try { const o = JSON.parse(v), n = JSON.parse(b.ld.find(l => l.includes('"@type":"ItemList"'))); const u = new Set(n.itemListElement.map(e => e.url)); return o.itemListElement.every(e => u.has(e.url)) && n.numberOfItems === n.itemListElement.length && n.numberOfItems >= o.numberOfItems; } catch { return false; } };
const swap = (v, allow) => (allow && allow.replace || []).reduce((x, [f, t]) => x.split(f).join(t), v);
export function diffPage(a, b, allow = null) {
  const miss = (x, y) => x.filter(v => !y.includes(v)), out = [];
  if (a.title !== b.title && swap(a.title, allow) !== b.title) out.push(`title đổi: ${a.title} → ${b.title}`);
  for (const k of ['metas', 'links', 'ld']) { const m = miss(a[k], b[k]).filter(v => !(k === 'ld' && ldMoved(v) !== v && b.ld.includes(ldMoved(v)))).filter(v => k === 'links' || !(b[k].includes(swap(v, allow)) && swap(v, allow) !== v) && !(k === 'ld' && itemListGrew(v, b, allow))); if (m.length) out.push(`${k} đổi: ${m[0].slice(0, 160)}`); }
  const h = miss(a.hrefs, b.hrefs).filter(x => !(MOVED[x] && b.hrefs.includes(MOVED[x])) && !(/^\/app\/(\?hl=[\w-]+)?#\/contact$/.test(x) && b.hrefs.some(v => /\/about\/#contact$/.test(v)))); if (h.length) out.push(`mất ${h.length} link nội bộ: ${h.slice(0, 3).join(' ')}`);
  const w = miss(a.words, b.words).filter(x => !(allow && (allow.words || []).includes(x))); if (w.length) out.push(`mất ${w.length} từ khỏi phần hiển thị: ${w.slice(0, 8).join(' ')}`);
  return out;
}
const snapshot = dist => Object.fromEntries(ROOTS.flatMap(r => walk(path.join(dist, r))).map(f => [path.relative(dist, f), fingerprint(fs.readFileSync(f, 'utf8'))]));

const [mode, a1, a2] = process.argv.slice(2);
if (!/samples-seo-parity\.mjs$/.test(process.argv[1] || '')) { /* được import (fingerprint, diffPage, loadAllow): không chạy CLI */ }
else if (mode === '--snapshot') {
  const s = snapshot(a1); if (!Object.keys(s).length) { console.error(`✗ ${a1}: 0 trang, không có gì để so`); process.exit(1); }
  fs.writeFileSync(a2, JSON.stringify(s)); console.log(`✓ chụp ${Object.keys(s).length} trang → ${a2}`);
} else if (mode === '--compare') {
  const base = JSON.parse(fs.readFileSync(a1, 'utf8')), now = snapshot(a2), bad = []; const ALLOW = loadAllow();
  for (const [p, fp] of Object.entries(base)) { if (!now[p]) { bad.push(`${p}: trang biến mất`); continue; } for (const d of diffPage(fp, now[p], ALLOW[p])) bad.push(`${p}: ${d}`); }
  if (!Object.keys(base).length) bad.push('base rỗng');
  if (bad.length) { console.error(bad.slice(0, 60).join('\n')); console.error(`✗ SEO họ trang thư viện: ${bad.length} sai khác trên ${Object.keys(base).length} trang`); process.exit(1); }
  console.log(`✓ SEO giữ nguyên ${Object.keys(base).length} trang (thêm mới ${Object.keys(now).filter(p => !base[p]).length})`);
} else if (mode === '--self-test') {
  const crumb = h => `{"@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"Trang chủ","item":"${h}"}]}`;
  const fp = h => ({ title: 't', metas: [], links: [], ld: [crumb(h)], hrefs: [], words: [] });
  const ok = !diffPage(fp('https://lexkite.com/'), fp('https://lexkite.com/vi/')).length, bad1 = diffPage(fp('https://lexkite.com/'), fp('https://lexkite.com/en/')).length, bad2 = diffPage(fp('https://lexkite.com/vi/'), fp('https://lexkite.com/')).length;
  if (!ok || !bad1 || !bad2) { console.error(`✗ samples-seo-parity self-test: chuyển /→/vi/ ${ok ? 'ok' : 'sai'}, /→/en/ ${bad1 ? 'đỏ' : 'lọt'}, /vi/→/ ${bad2 ? 'đỏ' : 'lọt'}`); process.exit(1); }
  const base = { title: 'X – 56 bài', metas: ['description=56 bài'], links: [], ld: [], hrefs: ['/a', '/b'], words: ['alpha', 'beta'] };
  const al = { page: 'p', reason: 'r', words: ['beta'], replace: [['56 bài', '62 bài']] };
  const t1 = diffPage(base, { ...base, title: 'X – 62 bài', metas: ['description=62 bài'], words: ['alpha'] }, al).length === 0;       // đổi đúng chỗ đã khai → xanh
  const t2 = diffPage(base, { ...base, hrefs: ['/a'] }, al).length > 0;                                                           // mất link → luôn đỏ
  const t3 = diffPage(base, { ...base, words: [] }, al).length > 0;                                                               // mất chữ ngoài manifest → đỏ
  const t4 = diffPage(base, { ...base, title: 'Y' }, al).length > 0;                                                              // đổi title ngoài `replace` → đỏ
  const t5 = diffPage(base, { ...base, links: ['canonical||x'] , title: base.title }, null).length === 0 && diffPage({ ...base, links: ['canonical||x'] }, base, al).length > 0; // canonical đổi → luôn đỏ
  if (!t1 || !t2 || !t3 || !t4 || !t5) { console.error(`✗ samples-seo-parity self-test manifest: khai đúng ${t1 ? 'ok' : 'sai'}, mất link ${t2 ? 'đỏ' : 'lọt'}, mất chữ ${t3 ? 'đỏ' : 'lọt'}, đổi title ${t4 ? 'đỏ' : 'lọt'}, canonical ${t5 ? 'đỏ' : 'lọt'}`); process.exit(1); }
  console.log('✓ samples-seo-parity self-test: crumb Trang chủ / → /vi/ + manifest content/seo-parity-allow.json (chỉ chữ/title/ld khai báo, không bao giờ link)');
} else if (mode) { console.error('Dùng: --snapshot <dist> <out.json> | --compare <base.json> <dist>'); process.exit(2); }
