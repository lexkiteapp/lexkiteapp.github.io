// Trang tĩnh SEO tiếng Việt dựng từ dữ liệu app: bài mẫu Writing Task 2 (/samples/), IELTS Speaking (/speaking/), từ vựng (/tu-vung/),
// ngữ pháp (/ngu-phap/), thư mẫu IELTS General (/viet-thu/) + mục lục từng mục, thêm vào sitemap. Không tốn chi phí chạy, Google lập chỉ mục được.
// Giao diện dùng chung với blog: scripts/lib/site-layout.mjs (header, footer, CSS token thương hiệu, chế độ tối). Dữ liệu: scripts/lib/seo-data.mjs.
// Bản tiếng Anh: build-samples-en.mjs (chạy sau, tự gắn hreflang vi↔en).
import fs from 'node:fs'; import { execFileSync } from 'node:child_process';
import { clip, esc, ld, seoPage, sectionNav, filterBox, setCard, ctaBox, extBox, audioBtn, SEO_L } from './lib/site-layout.mjs';
import { loadWriting, loadSpeaking, loadVocab, vocabMeta, relatedOf, loadGrammar, loadLetters } from './lib/seo-data.mjs';
import { embedWatermark } from '../content/protection/watermark.mjs';
const SITE = 'https://lexkite.com/', OG = `${SITE}og-default.png`, L = SEO_L.vi;
// URL công khai không đuôi .html (Cloudflare Pages chuyển 308 /x.html → /x); file trên đĩa vẫn là *.html
const today = new Date().toISOString().slice(0, 10);
const gitDate = (...f) => { try { return execFileSync('git', ['log', '-1', '--format=%cs', '--', ...f], { encoding: 'utf8' }).trim() || today; } catch { return today; } };
const sm = 'dist/sitemap.xml';
const addSm = (urls, ...src) => { const lm = gitDate(...src); fs.writeFileSync(sm, fs.readFileSync(sm, 'utf8').replace('</urlset>', urls.map(u => `  <url><loc>${u}</loc><lastmod>${lm}</lastmod><changefreq>monthly</changefreq></url>`).join('\n') + '\n</urlset>')); };
const plain = s => s.replace(/<<[^>]*>>\s*/g, '').replace(/\[\[([^|\]]*)\|[^\]]*\]\]/g, '$1').replace(/\{\{([^}]*)\}\}/g, '$1');
const rich = s => esc(s).replace(/&lt;&lt;([^&]*)&gt;&gt;\s*/g, '<span class="lb">$1</span> ').replace(/\[\[([^|\]]*)\|([^\]]*)\]\]/g, '<mark title="$2">$1</mark>').replace(/\{\{([^}]*)\}\}/g, '<b class="ln">$1</b>');
const SEC = { samples: 'Bài mẫu Writing', speaking: 'IELTS Speaking', 'tu-vung': 'Từ vựng', 'ngu-phap': 'Ngữ pháp', 'viet-thu': 'Thư mẫu IELTS General' };
const EN = { samples: 'en/samples', speaking: 'en/speaking', 'tu-vung': 'en/vocabulary' }; // mục có bản tiếng Anh (build-samples-en.mjs)
// Breadcrumb JSON-LD tự suy từ canonical: Trang chủ → mục → trang (giữ nguyên như trước)
const crumbs = (canon, name) => { const p = canon.slice(SITE.length).split('/'), sec = p[0], it = [['Trang chủ', SITE], [SEC[sec] || sec, `${SITE}${sec}/`]]; if (p[1]) it.push([name, canon]);
  return { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: it.map(([n, u], i) => ({ '@type': 'ListItem', position: i + 1, name: n, item: u })) }; };
// <head>: meta, canonical, og, JSON-LD – giữ nguyên từng thẻ như bản cũ (build-samples-en.mjs chèn hreflang trước og:type)
const head = (title, desc0, canon) => { const desc = clip(desc0); return `<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><meta name="description" content="${esc(desc)}"><meta name="theme-color" content="#0F3D3E"><link rel="canonical" href="${canon}"><meta property="og:type" content="article"><meta property="og:site_name" content="Lexkite"><meta property="og:locale" content="vi_VN"><meta property="og:url" content="${canon}"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:image" content="${OG}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta name="twitter:card" content="summary_large_image"><link rel="icon" href="/icons/icon.svg?v=2" type="image/svg+xml"><link rel="apple-touch-icon" href="/icons/apple-touch-icon.png?v=2">${ld({ "@context": "https://schema.org", "@type": "LearningResource", name: title, description: desc, url: canon, inLanguage: "vi", isAccessibleForFree: true, educationalLevel: "IELTS / TOEIC", provider: { "@type": "Organization", name: "Lexkite", url: SITE } })}${ld(crumbs(canon, title.replace(/\s*[–|]\s*Lexkite$/, '')))}`; };
// canon: URL đầy đủ; name: tên ngắn hiển thị ở breadcrumb
const page = (title, desc, canon, body, name, enId) => {
  const p = canon.slice(SITE.length), sec = p.split('/')[0], id = p.split('/')[1];
  const vis = [['Trang chủ', '/'], [SEC[sec] || sec, `/${sec}/`], ...(id ? [[name || title, `/${p}`]] : [])];
  return seoPage({ lang: 'vi', head: head(title, desc, canon), crumbs: vis, body, alt: EN[sec] ? `/${EN[sec]}/${enId ?? id ?? ''}` : '', section: `/${sec}/` });
};
const hero = (h1, { emoji = '', lead = '', chips = [] } = {}) => `<header class="hero"><h1>${emoji ? `<span class="em" aria-hidden="true">${esc(emoji)}</span>` : ''}${h1}</h1>${lead ? `<p>${lead}</p>` : ''}${chips.length ? `<div class="sub">${chips.map(c => Array.isArray(c) ? `<span class="chip ${c[1]}">${esc(c[0])}</span>` : `<span class="chip">${esc(c)}</span>`).join('')}</div>` : ''}</header>`;
const indexHero = (h1, lead, sec) => `${hero(esc(h1), { lead })}\n${sectionNav('vi', `/${sec}/`)}\n${filterBox('vi')}`;
const related = (items, card) => items.length ? `<section class="grp" aria-labelledby="rel"><h2 id="rel">${L.related}</h2><div class="grid">${items.map(card).join('')}</div></section>` : '';
const group = (id, title, sub, cards) => `<section class="grp" aria-labelledby="g-${id}"><h2 id="g-${id}">${esc(title)} <small>${sub}</small></h2><div class="grid">${cards.join('')}</div></section>`;
const phraseTable = (rows, h1 = 'Cụm từ', h2 = 'Nghĩa') => `<div class="tbl"><table class="wt"><thead><tr><th scope="col">${h1}</th><th scope="col">${h2}</th></tr></thead><tbody>${rows.map(([e, v]) => `<tr><td><b>${esc(e)}</b></td><td>${esc(v)}</td></tr>`).join('')}</tbody></table></div>`;
const short = (s, n) => s.length > n ? s.slice(0, n - 3).replace(/\s+\S*$/, '') + '…' : s;
const wmDate = gitDate('web/js/models.js', 'web/js/write').replace(/-/g, '');
const wm = (html, id) => embedWatermark(html, `LK:${id}:${wmDate}`); // thủy ấn tàng hình (P1) trong bài mẫu – ngày = lần sửa dữ liệu cuối (build ổn định)

// ===== Writing Task 2 =====
fs.mkdirSync('dist/samples', { recursive: true });
const { PROMPTS, MODELS } = loadWriting();
const done = [];
for (const p of PROMPTS) { const m = MODELS.find(x => x.id === 't2-' + p.id); if (m) done.push([p, m]); }
const t2Card = ([p, m]) => setCard({ href: `/samples/${p.id}`, title: p.text, chips: [p.type, [`Band ${m.band}`, 'alt'], [`${m.words} từ`, 'ink']], key: `${p.type} ${p.topic}` });
for (const [p, m] of done) {
  const gl = [...m.text.matchAll(/\[\[([^|\]]*)\|([^\]]*)\]\]/g)].map(x => [x[1], x[2]]);
  const title = `IELTS Writing Task 2 bài mẫu band ${m.band}: ${short(p.text, 70)}`;
  const desc = `Bài mẫu IELTS Writing Task 2 band ${m.band} (${p.type}, ${m.words} từ) có chú giải ${gl.length} cụm từ hay kèm nghĩa tiếng Việt: ${plain(m.text).slice(0, 90)}…`;
  const body = `<article class="page">${hero(`Bài mẫu IELTS Writing Task 2 – Band ${esc(m.band)}`, { chips: [`Dạng đề: ${p.type}`, [`${m.words} từ`, 'ink'], [`Band ${m.band}`, 'alt']] })}
<div class="q">${esc(p.text)}</div>
${ctaBox(`/#/model/t2-${p.id}`, '✍️ Luyện viết đề này miễn phí trên Lexkite', 'Mở đề trong app', 'Xem bài mẫu tương tác, dàn ý và từ nối ngay trong app.')}
<h2>Bài mẫu</h2><div class="ess">${wm(rich(m.text).split(/\n\s*\n/).map(x => `<p>${x.trim()}</p>`).join(''), `samples/${p.id}`)}</div>
<h2>Từ vựng & cụm từ hay (${gl.length})</h2>${phraseTable(gl)}
${ctaBox(`/#/write/${p.id}`, '📝 Tự viết bài và được chấm điểm ngay', 'Viết bài', 'Đếm từ, gợi ý ý tưởng và chấm theo 4 tiêu chí IELTS.')}
${related(relatedOf(done, done.find(d => d[0] === p), d => d[0].type === p.type, 4), t2Card)}
${extBox('vi')}</article>`;
  fs.writeFileSync(`dist/samples/${p.id}.html`, page(title, desc, `${SITE}samples/${p.id}`, body, `Band ${m.band}: ${short(p.text, 50)}`));
}
{
  const byType = {}; for (const d of done) (byType[d[0].type] = byType[d[0].type] || []).push(d);
  fs.writeFileSync('dist/samples/index.html', page(`${done.length} bài mẫu IELTS Writing Task 2 band 8 có chú giải tiếng Việt – Lexkite`, `Trọn bộ ${done.length} bài mẫu IELTS Writing Task 2 band 8 theo từng dạng đề, chú giải cụm từ hay kèm nghĩa tiếng Việt, luyện viết và chấm điểm miễn phí.`, `${SITE}samples/`,
    `${indexHero(`${done.length} bài mẫu IELTS Writing Task 2 (band 8)`, 'Tự biên soạn, có chú giải từ vựng tiếng Việt. Bấm vào đề để xem bài mẫu.', 'samples')}
${Object.entries(byType).map(([ty, xs], i) => group(`t${i}`, ty, `${xs.length} ${L.items}`, xs.map(t2Card))).join('\n')}`));
  addSm([`${SITE}samples/`, ...done.map(([p]) => `${SITE}samples/${p.id}`)], 'web/js/write.js', 'web/js/models.js', 'web/js/write');
  console.log(`✓ SEO: ${done.length} trang bài mẫu Task 2 + mục lục`);
}

// ===== IELTS Speaking: 1 trang / chủ đề (Part 1–3 + câu trả lời mẫu) =====
{
  const { BANK, S } = loadSpeaking();
  fs.mkdirSync('dist/speaking', { recursive: true });
  const slug = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const qa = q => { const s = S[q]; return `<h3>${esc(q)}</h3>${s ? `<div class="ess"><p>${esc(s.a)}</p></div>${s.vocab && s.vocab.length ? phraseTable(s.vocab, 'Từ vựng') : ''}` : ''}`; };
  // URL bản tiếng Anh (build-samples-en.mjs) không đổi chữ hoa Đ → 'Đọc sách' = /en/speaking/oc-sach (giữ nguyên URL đã lập chỉ mục)
  const enSlug = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const made = BANK.map((b, i) => [slug(b.title), b, i]);
  const spCard = ([id, b]) => setCard({ href: `/speaking/${id}`, title: b.title, desc: b.p2.q, chips: ['Part 1–3'], key: `${b.topic || ''} ${b.title}` });
  for (const [id, b, i] of made) {
    const title = `IELTS Speaking chủ đề ${b.title}: câu hỏi Part 1, 2, 3 & câu trả lời mẫu`;
    const desc = `Bộ câu hỏi IELTS Speaking chủ đề ${b.title} (Part 1–3) kèm câu trả lời mẫu band 8 và từ vựng nghĩa tiếng Việt. Cue card: ${b.p2.q}`;
    const body = `<article class="page">${hero(`IELTS Speaking – ${esc(b.title)}`, { chips: ['Part 1', 'Part 2', 'Part 3'] })}
${ctaBox(`/#/speaking/p1/${i}`, '🎙️ Luyện nói chủ đề này (ghi âm & chấm)', 'Luyện nói', 'Ghi âm câu trả lời và nhận nhận xét phát âm, độ trôi chảy.')}
<h2>Part 1</h2>${b.p1.map(qa).join('')}
<h2>Part 2 – Cue card</h2><div class="q">${esc(b.p2.q)}<ul>${b.p2.points.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>${qa(b.p2.q).replace(/^<h3>[^<]*<\/h3>/, '')}
<h2>Part 3</h2>${b.p3.map(qa).join('')}
${ctaBox(`/#/speaking/p2/${i}`, '🗣️ Thử nói Part 2 với đồng hồ đếm giờ', 'Bắt đầu', '1 phút chuẩn bị, 2 phút nói – như phòng thi thật.')}
${related(relatedOf(made, made[i], () => true, 4), spCard)}
${extBox('vi')}</article>`;
    fs.writeFileSync(`dist/speaking/${id}.html`, page(title, desc, `${SITE}speaking/${id}`, body, b.title, enSlug(b.title)));
  }
  fs.writeFileSync('dist/speaking/index.html', page(`${made.length} chủ đề IELTS Speaking có câu trả lời mẫu – Lexkite`, `Trọn bộ ${made.length} chủ đề IELTS Speaking Part 1, 2, 3 với câu trả lời mẫu band 8 và từ vựng tiếng Việt, luyện nói miễn phí.`, `${SITE}speaking/`,
    `${indexHero(`${made.length} chủ đề IELTS Speaking`, 'Câu hỏi Part 1–3, cue card Part 2 và câu trả lời mẫu tự biên soạn.', 'speaking')}
${group('all', 'Chủ đề', `${made.length} ${L.items}`, made.map(spCard))}`));
  addSm([`${SITE}speaking/`, ...made.map(([id]) => `${SITE}speaking/${id}`)], 'web/js/speaking.js', 'web/js/speak');
  console.log(`✓ SEO: ${made.length} trang chủ đề Speaking + mục lục`);
}

// ===== Từ vựng theo chủ đề: 1 trang / bộ từ (từ, phiên âm, nghĩa, ví dụ, nút nghe) =====
{
  const { TOPICS: TP, audioKey } = loadVocab();
  const GROUP = { topics: 'Từ vựng IELTS theo chủ đề', writing: 'Từ vựng IELTS Writing', speaking: 'Từ vựng IELTS Speaking', awl: 'Từ học thuật AWL', core: 'Từ vựng cốt lõi NGSL', toeic: 'Từ vựng TOEIC', domain: 'Từ vựng chuyên ngành', exam: 'Từ vựng theo kỳ thi' };
  const chipsOf = x => { const { level, exams } = vocabMeta(x); return [[`${x.words.length} từ`, 'ink'], ...(level ? [[level, 'alt']] : []), ...exams]; };
  const vCard = x => setCard({ href: `/tu-vung/${x.id}`, title: x.name, desc: x.desc, emoji: x.emoji, chips: chipsOf(x), key: `${x.id} ${GROUP[x.group] || ''}` });
  fs.mkdirSync('dist/tu-vung', { recursive: true });
  for (const x of TP) {
    const g = GROUP[x.group] || 'Từ vựng', n = x.words.length;
    const title = `${g}: ${x.name} – ${n} từ có phiên âm, nghĩa tiếng Việt, ví dụ`;
    const desc = `${n} từ vựng ${x.name} (${g}) kèm phiên âm IPA, nghĩa tiếng Việt, định nghĩa và câu ví dụ: ${x.words.slice(0, 8).map(w => w.word).join(', ')}… Học flashcard miễn phí trên Lexkite.`;
    const rows = x.words.map((w, i) => { const k = audioKey(w.word); return `<tr><td class="no">${i + 1}</td><td><span class="w">${k ? audioBtn(k, w.word, 'vi') : ''}${esc(w.word)}</span>${w.pos ? `<span class="pos">${esc(w.pos)}</span>` : ''}</td><td class="ipa">${esc(w.ipa || '')}</td><td>${esc(w.vi || '')}</td><td class="ex">${esc(w.ex || '')}</td></tr>`; }).join('');
    const body = `${hero(esc(x.name), { emoji: x.emoji || '📘', lead: x.desc ? esc(x.desc) : '', chips: [g, ...chipsOf(x)] })}
${ctaBox(`/#/topic/${encodeURIComponent(x.id)}`, '🃏 Học bộ này bằng flashcard (miễn phí)', 'Mở bộ từ trong app', 'Ôn lặp lại ngắt quãng FSRS, nghe phát âm, tự kiểm tra – lưu tiến độ tự động.')}
<div class="tbl"><table class="wt"><thead><tr><th scope="col" class="no">${L.col.no}</th><th scope="col">${L.col.word}</th><th scope="col">${L.col.ipa}</th><th scope="col">${L.col.mean}</th><th scope="col">${L.col.ex}</th></tr></thead><tbody>${rows}</tbody></table></div>
${ctaBox(`/#/topic/${encodeURIComponent(x.id)}`, `Thuộc ${n} từ này trong vài ngày`, 'Học ngay', 'Mỗi ngày vài phút, app tự nhắc đúng lúc bạn sắp quên.')}
${related(relatedOf(TP, x, y => y.group === x.group), vCard)}
${extBox('vi')}`;
    fs.writeFileSync(`dist/tu-vung/${x.id}.html`, page(title, desc, `${SITE}tu-vung/${x.id}`, body, x.name));
  }
  const byG = {}; for (const x of TP) (byG[x.group] = byG[x.group] || []).push(x);
  const total = TP.reduce((a, x) => a + x.words.length, 0);
  fs.writeFileSync('dist/tu-vung/index.html', page(`Từ vựng IELTS, TOEIC, TOEFL theo chủ đề – ${TP.length} bộ, ${total.toLocaleString('vi')} từ – Lexkite`, `${TP.length} bộ từ vựng IELTS, TOEIC, TOEFL theo chủ đề và kỳ thi, có phiên âm, nghĩa tiếng Việt và ví dụ. Học flashcard miễn phí.`, `${SITE}tu-vung/`,
    `${indexHero(`Từ vựng theo chủ đề (${TP.length} bộ)`, `${total.toLocaleString('vi')} từ có phiên âm, nghĩa tiếng Việt, ví dụ và phát âm. Chọn một bộ để xem danh sách, rồi học bằng flashcard miễn phí.`, 'tu-vung')}
${Object.entries(byG).map(([k, xs]) => group(k, GROUP[k] || k, `${xs.length} ${L.sets}`, xs.map(vCard))).join('\n')}`));
  addSm([`${SITE}tu-vung/`, ...TP.map(x => `${SITE}tu-vung/${x.id}`)], 'web/js/data.js', 'web/js/lib');
  console.log(`✓ SEO: ${TP.length} trang bộ từ vựng + mục lục`);
}

// ===== Ngữ pháp: 1 trang / bài (công thức, cách dùng, lỗi hay gặp, ứng dụng IELTS) =====
{
  const { G, UNITS } = loadGrammar();
  const unitOf = id => UNITS.find(u => u.id === id) || { id, name: id, emoji: '', desc: '' };
  fs.mkdirSync('dist/ngu-phap', { recursive: true });
  const blk = b => {
    if (b.type === 'formula') return `<h2>Công thức</h2><div class="tbl"><table class="fx"><tbody>${b.rows.map(r => `<tr><th scope="row">${esc(r.label || '')}</th><td>${r.parts.map(p => esc(p.t)).join(' + ')}${r.ex ? `<br><i class="ex">${esc(r.ex)}</i>` : ''}</td></tr>`).join('')}</tbody></table></div>`;
    if (b.type === 'uses') return `<h2>Cách dùng</h2><ol class="uses">${b.items.map(u => `<li><b>${esc(u.title)}</b>${u.ex ? `<br><i>${esc(u.ex)}</i>` : ''}${u.vi ? ` – ${esc(u.vi)}` : ''}</li>`).join('')}</ol>`;
    if (b.type === 'signals') return `<h2>Dấu hiệu nhận biết</h2><p class="sig">${b.words.map(w => `<span class="chip">${esc(w)}</span>`).join(' ')}</p>`;
    if (b.type === 'table') return `<div class="tbl"><table>${b.head ? `<thead><tr>${b.head.map(h => `<th scope="col">${esc(h)}</th>`).join('')}</tr></thead>` : ''}<tbody>${(b.rows || []).map(r => `<tr>${r.map(x => `<td>${esc(x)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    if (b.type === 'tip') return `<div class="tip">💡 ${esc(b.text)}</div>`;
    if (b.type === 'mistake') return `<div class="err">❌ <s>${esc(b.wrong)}</s><br>✅ <b>${esc(b.right)}</b>${b.why ? `<br><span class="why">${esc(b.why)}</span>` : ''}</div>`;
    if (b.type === 'ielts') return `<h2>Ứng dụng trong IELTS</h2><p>${esc(b.text)}</p>`;
    return '';
  };
  const gCard = l => setCard({ href: `/ngu-phap/${l.id}`, title: l.title, desc: [l.en, short(l.summary || '', 110)].filter(Boolean).join(' – '), emoji: l.emoji, chips: [[l.level || '', 'alt']].filter(c => c[0]), key: `${l.en || ''} ${unitOf(l.unit).name}` });
  G.forEach((l, gi) => {
    const prev = G[gi - 1], next = G[gi + 1], pn = `<nav class="pager" aria-label="Bài trước / bài sau">${prev ? `<a rel="prev" href="/ngu-phap/${prev.id}">← ${esc(prev.title)}</a>` : '<span></span>'}${next ? `<a rel="next" href="/ngu-phap/${next.id}">${esc(next.title)} →</a>` : ''}</nav>`;
    const bl = l.blocks || [], firstMistake = bl.findIndex(b => b.type === 'mistake'), u = unitOf(l.unit);
    const body = `<article class="page">${hero(esc(l.title), { emoji: l.emoji || '📘', lead: esc(l.summary || ''), chips: [...(l.en ? [[l.en, 'ink']] : []), ...(l.level ? [[l.level, 'alt']] : []), u.name] })}
${ctaBox(`/#/grammar/${encodeURIComponent(l.id)}`, '🧠 Học bài này có minh họa & bài tập (miễn phí)', 'Mở bài học', 'Sơ đồ trực quan, công thức màu và bài tập chấm điểm ngay.')}
${bl.map((b, i) => (i === firstMistake ? '<h2>Lỗi hay gặp</h2>' : '') + blk(b)).join('\n')}
${ctaBox(`/#/grammar/${encodeURIComponent(l.id)}`, `✏️ Làm bài tập ${esc(l.en || l.title)}`, 'Làm bài tập')}
${pn}
${related(relatedOf(G, l, y => y.unit === l.unit, 4), gCard)}
${extBox('vi')}</article>`;
    fs.writeFileSync(`dist/ngu-phap/${l.id}.html`, page(`${l.title} (${l.en}) – công thức, cách dùng, dấu hiệu, lỗi hay gặp | Lexkite`, `${l.title} (${l.en}): ${l.summary || ''} Công thức, ví dụ song ngữ, lỗi người Việt hay mắc và cách dùng trong IELTS.`.slice(0, 300), `${SITE}ngu-phap/${l.id}`, body, l.title));
  });
  const units = {}; for (const l of G) (units[l.unit || 'khac'] = units[l.unit || 'khac'] || []).push(l);
  const order = [...UNITS.map(u => u.id).filter(id => units[id]), ...Object.keys(units).filter(k => !UNITS.some(u => u.id === k))];
  fs.writeFileSync('dist/ngu-phap/index.html', page(`Ngữ pháp tiếng Anh từ cơ bản đến IELTS – ${G.length} bài | Lexkite`, `${G.length} bài ngữ pháp tiếng Anh: 12 thì, câu điều kiện, bị động, mệnh đề quan hệ… có công thức, ví dụ song ngữ, lỗi hay gặp và bài tập miễn phí.`, `${SITE}ngu-phap/`,
    `${indexHero(`Ngữ pháp tiếng Anh (${G.length} bài)`, 'Từ nền tảng đến band 7+: công thức, cách dùng, dấu hiệu nhận biết, lỗi người Việt hay mắc và ứng dụng trong IELTS.', 'ngu-phap')}
${order.map(k => { const u = unitOf(k); return group(k, `${u.emoji ? u.emoji + ' ' : ''}${u.name}`, `${units[k].length} ${L.lessons}`, units[k].map(gCard)).replace('</h2>', `</h2>${u.desc ? `<p>${esc(u.desc)}</p>` : ''}`); }).join('\n')}`));
  addSm([`${SITE}ngu-phap/`, ...G.map(l => `${SITE}ngu-phap/${l.id}`)], 'web/js/grammar');
  console.log(`✓ SEO: ${G.length} trang ngữ pháp + mục lục`);
}

// ===== IELTS General – thư mẫu: 1 trang / đề =====
{
  const { LT, MD } = loadLetters(), TONE = { formal: 'Thư trang trọng', 'semi-formal': 'Thư bán trang trọng', informal: 'Thư thân mật' };
  fs.mkdirSync('dist/viet-thu', { recursive: true });
  const made = LT.map(x => [x, MD.find(y => y.id === 'gt-' + x.id)]).filter(([, m]) => m);
  const lCard = ([x, m]) => setCard({ href: `/viet-thu/${x.id}`, title: x.titleVi || x.topic, desc: short(x.situation, 120), emoji: '✉️', chips: [TONE[x.tone] || x.tone, [`Band ${m.band}`, 'alt']], key: `${x.topic} ${TONE[x.tone] || ''}` });
  for (const [x, m] of made) {
    const gl = [...m.text.matchAll(/\[\[([^|\]]*)\|([^\]]*)\]\]/g)].map(z => [z[1], z[2]]);
    const body = `<article class="page">${hero(`${esc(x.titleVi || x.topic)} – thư mẫu IELTS General Task 1`, { emoji: '✉️', chips: [TONE[x.tone] || '', [`${m.words} từ`, 'ink'], [`Band ${m.band}`, 'alt']].filter(c => Array.isArray(c) || c) })}
<div class="q">${esc(x.situation)}<ul>${x.bullets.map(b => `<li>${esc(b)}</li>`).join('')}</ul><div class="open">Begin your letter: <b>${esc(x.open)}</b></div></div>
${ctaBox(`/#/letters/${x.id}`, '✍️ Luyện viết thư này (đếm từ, tự kiểm, chấm AI)', 'Mở đề trong app')}
<h2>Thư mẫu</h2><div class="ess">${wm(rich(m.text).split(/\n\s*\n|\n/).filter(p => p.trim()).map(p => `<p>${p.trim()}</p>`).join(''), `viet-thu/${x.id}`)}</div>
<h2>Cụm từ hay (${gl.length})</h2>${phraseTable(gl)}
${related(relatedOf(made, made.find(d => d[0] === x), d => d[0].tone === x.tone, 4), lCard)}
${extBox('vi')}</article>`;
    fs.writeFileSync(`dist/viet-thu/${x.id}.html`, page(`Thư mẫu IELTS General Task 1: ${x.titleVi || x.topic} (${(TONE[x.tone] || '').toLowerCase()}) – band ${m.band}`, `Thư mẫu IELTS General Training Writing Task 1 band ${m.band} – ${TONE[x.tone] || ''}: ${x.situation.slice(0, 120)}… Có chú thích cụm từ hay tiếng Việt.`, `${SITE}viet-thu/${x.id}`, body, x.titleVi || x.topic));
  }
  fs.writeFileSync('dist/viet-thu/index.html', page(`${made.length} thư mẫu IELTS General Writing Task 1 (trang trọng, bán trang trọng, thân mật) – Lexkite`, `${made.length} thư mẫu IELTS General Task 1 band 8 theo 3 giọng văn, có chú thích cụm từ tiếng Việt, luyện viết thư miễn phí.`, `${SITE}viet-thu/`,
    `${indexHero(`${made.length} thư mẫu IELTS General Task 1`, 'Thư trang trọng, bán trang trọng và thân mật – có chú thích cụm từ hay tiếng Việt.', 'viet-thu')}
${Object.keys(TONE).map(k => group(k, TONE[k], `${made.filter(([x]) => x.tone === k).length} ${L.items}`, made.filter(([x]) => x.tone === k).map(lCard))).join('\n')}`));
  addSm([`${SITE}viet-thu/`, ...made.map(([x]) => `${SITE}viet-thu/${x.id}`)], 'web/js/write/gt-letters.js');
  console.log(`✓ SEO: ${made.length} trang thư mẫu IELTS General + mục lục`);
}
