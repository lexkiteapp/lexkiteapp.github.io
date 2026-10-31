// Trang tĩnh SEO tiếng Việt dựng từ dữ liệu app: bài mẫu Writing Task 2 (/samples/), IELTS Speaking (/speaking/), từ vựng (/tu-vung/),
// ngữ pháp (/ngu-phap/), thư mẫu IELTS General (/viet-thu/) + mục lục từng mục, thêm vào sitemap. Không tốn chi phí chạy, Google lập chỉ mục được.
// Giao diện dùng chung với blog: scripts/lib/site-layout.mjs (header, footer, CSS token thương hiệu, chế độ tối). Dữ liệu: scripts/lib/seo-data.mjs.
// Bản tiếng Anh: build-samples-en.mjs (chạy sau, tự gắn hreflang vi↔en).
import fs from 'node:fs'; import { execFileSync } from 'node:child_process';
import { clip, esc, ld, seoPage, sectionNav, filterBox, setCard, ctaBox, extBox, pwaBox, audioBtn, SEO_L, FIND_I18N } from './lib/site-layout.mjs';
import { loadWriting, loadSpeaking, loadVocab, vocabMeta, relatedOf, loadGrammar, loadLetters, loadPron } from './lib/seo-data.mjs';
import { embedWatermark } from '../content/protection/watermark.mjs';
import { S as SU, parseDoc, docStats, mins, docHtml, sideHtml, stats, hero2, promptBox, phraseCards, saveBox, ctaKit, pager2, typeCls, toneCls, topicEmoji, topicCls, smpCard, group2, typeFilter, itemList, smpHead, smpTail, stPage, writingD, writingCard, speakingD, speakingCard, pagerRel } from './lib/samples-ui.mjs';
const SITE = 'https://lexkite.com/', OG = `${SITE}og-default.png`, L = SEO_L.vi, U = SU.vi, APP = L.app; // APP: gốc app (hash route) – theo site-layout
// URL công khai không đuôi .html (Cloudflare Pages chuyển 308 /x.html → /x); file trên đĩa vẫn là *.html
const today = new Date().toISOString().slice(0, 10);
const gitDate = (...f) => { try { return execFileSync('git', ['log', '-1', '--format=%cs', '--', ...f], { encoding: 'utf8' }).trim() || today; } catch { return today; } };
const sm = 'dist/sitemap.xml';
const addSm = (urls, ...src) => { const lm = gitDate(...src); fs.writeFileSync(sm, fs.readFileSync(sm, 'utf8').replace('</urlset>', urls.map(u => `  <url><loc>${u}</loc><lastmod>${lm}</lastmod><changefreq>monthly</changefreq></url>`).join('\n') + '\n</urlset>')); };
const plain = s => s.replace(/<<[^>]*>>\s*/g, '').replace(/\[\[([^|\]]*)\|[^\]]*\]\]/g, '$1').replace(/\{\{([^}]*)\}\}/g, '$1');
const SEC = { samples: 'Bài mẫu Writing', speaking: 'IELTS Speaking', 'tu-vung': 'Từ vựng', 'ngu-phap': 'Ngữ pháp', 'viet-thu': 'Thư mẫu IELTS General', 'phat-am': 'Phát âm' };
const EN = { samples: 'en/samples', speaking: 'en/speaking', 'tu-vung': 'en/vocabulary', 'ngu-phap': 'en/grammar', 'phat-am': 'en/pronunciation', 'viet-thu': 'en/ielts-writing/general-task-1' }; // mục có bản tiếng Anh (build-samples-en.mjs)
// Breadcrumb JSON-LD tự suy từ canonical: Trang chủ → mục → trang (giữ nguyên như trước)
const crumbs = (canon, name) => { const p = canon.slice(SITE.length).split('/'), sec = p[0], it = [['Trang chủ', SITE], [SEC[sec] || sec, `${SITE}${sec}/`]]; if (p[1]) it.push([name, canon]);
  return { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: it.map(([n, u], i) => ({ '@type': 'ListItem', position: i + 1, name: n, item: u })) }; };
// <head>: meta, canonical, og, JSON-LD – giữ nguyên từng thẻ như bản cũ (build-samples-en.mjs chèn hreflang trước og:type)
const head = (title, desc0, canon, o = {}) => { const desc = clip(desc0); return `<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><meta name="description" content="${esc(desc)}"><meta name="theme-color" content="#0F3D3E"><link rel="canonical" href="${canon}"><meta property="og:type" content="article"><meta property="og:site_name" content="Lexkite"><meta property="og:locale" content="vi_VN"><meta property="og:url" content="${canon}"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:image" content="${OG}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta name="twitter:card" content="summary_large_image"><link rel="icon" href="/icons/icon.svg?v=2" type="image/svg+xml"><link rel="apple-touch-icon" href="/icons/apple-touch-icon.png?v=2">${ld({ "@context": "https://schema.org", "@type": "LearningResource", name: title, description: desc, url: canon, inLanguage: "vi", isAccessibleForFree: true, educationalLevel: "IELTS / TOEIC", provider: { "@type": "Organization", name: "Lexkite", url: SITE }, ...(o.lr || {}) })}${ld(crumbs(canon, title.replace(/\s*[–|]\s*Lexkite$/, '')))}${(o.ld || []).map(ld).join('')}${o.smp && !o.st ? smpHead() : ''}`; };
// canon: URL đầy đủ; name: tên ngắn hiển thị ở breadcrumb
// o: { smp: giao diện bài mẫu (samples-ui.mjs), lr: thuộc tính thêm cho LearningResource, ld: JSON-LD thêm }
const page = (title, desc, canon, body, name, enId, o = {}) => {
  const p = canon.slice(SITE.length), sec = p.split('/')[0], id = p.split('/')[1];
  const vis = [['Trang chủ', '/'], [SEC[sec] || sec, `/${sec}/`], ...(id ? [[name || title, `/${p}`]] : [])];
  const alt = EN[sec] ? `/${EN[sec]}/${enId ?? id ?? ''}` : '';
  if (o.st) return stPage({ lang: 'vi', head: head(title, desc, canon, o), crumbs: vis, alt, k: o.st, d: body, ext: o.ext }); // khung Stitch v2.1: body = dữ liệu d (samples-ui writingD/speakingD)
  return seoPage({ lang: 'vi', head: head(title, desc, canon, o), crumbs: vis, body: o.smp ? body + smpTail() : body, alt, section: `/${sec}/` });
};
const hero = (h1, { emoji = '', lead = '', chips = [] } = {}) => `<header class="hero"><h1>${emoji ? `<span class="em" aria-hidden="true">${esc(emoji)}</span>` : ''}${h1}</h1>${lead ? `<p>${lead}</p>` : ''}${chips.length ? `<div class="sub">${chips.map(c => Array.isArray(c) ? `<span class="chip ${c[1]}">${esc(c[0])}</span>` : `<span class="chip">${esc(c)}</span>`).join('')}</div>` : ''}</header>`;
const indexHero = (h1, lead, sec) => `${hero(esc(h1), { lead })}\n${sectionNav('vi', `/${sec}/`)}\n${filterBox('vi')}`;
const related = (items, card) => items.length ? `<section class="grp" aria-labelledby="rel"><h2 id="rel">${L.related}</h2><div class="grid">${items.map(card).join('')}</div></section>` : '';
const group = (id, title, sub, cards) => `<section class="grp" aria-labelledby="g-${id}"><h2 id="g-${id}">${esc(title)} <small>${sub}</small></h2><div class="grid">${cards.join('')}</div></section>`;
const short = (s, n) => s.length > n ? s.slice(0, n - 3).replace(/\s+\S*$/, '') + '…' : s;
const wmDate = gitDate('web/js/models.js', 'web/js/write').replace(/-/g, '');
const wm = (html, id) => embedWatermark(html, `LK:${id}:${wmDate}`); // thủy ấn tàng hình (P1) trong bài mẫu – ngày = lần sửa dữ liệu cuối (build ổn định)

// ===== Writing Task 2 =====
// Giao diện bài mẫu: scripts/lib/samples-ui.mjs (thẻ đoạn có vai trò, dàn bài + chú thích màu dính bên phải, chạm cụm từ xem nghĩa, thẻ cụm từ, bài trước/sau)
fs.mkdirSync('dist/samples', { recursive: true });
const { PROMPTS, MODELS } = loadWriting(), { audioKey } = loadVocab();
const done = [];
for (const p of PROMPTS) { const m = MODELS.find(x => x.id === 't2-' + p.id); if (m) done.push([p, m]); }
const t2Card = ([p, m]) => smpCard({ href: `/samples/${p.id}`, cls: typeCls(p.type), tag: p.type, title: p.text, band: m.band, meta: [`${m.words} ${U.words}`, `${docStats(m.text).phrases} ${U.phrases}`, U.min(mins(m.words))], key: `${p.type} ${p.topic}` });
done.forEach(([p, m], di) => {
  const gl = [...m.text.matchAll(/\[\[([^|\]]*)\|([^\]]*)\]\]/g)].map(x => [x[1], x[2]]);
  const paras = parseDoc(m.text, 'vi'), st = docStats(m.text), prev = done[di - 1], next = done[di + 1];
  const title = `IELTS Writing Task 2 bài mẫu band ${m.band}: ${short(p.text, 70)}`;
  const desc = `Bài mẫu IELTS Writing Task 2 band ${m.band} (${p.type}, ${m.words} từ) có chú giải ${gl.length} cụm từ hay kèm nghĩa tiếng Việt: ${plain(m.text).slice(0, 90)}…`;
  // Khung Stitch v2.1 (brand/stitch/web/sample-*.html): đề, dàn bài, chú thích màu, bài mẫu (thủy ấn, chạm cụm từ xem nghĩa), cụm từ + nghĩa (+ nút nghe nếu có audio), CTA app, Ama, bài trước/sau + liên quan, add-on/PWA
  const ess = wm(paras.map(x => `<p>${x.html}</p>`).join('\u0000'), `samples/${p.id}`).split('\u0000').map(x => x.slice(3, -4));
  const card = ([d, rel]) => writingCard('vi', `/samples/${d[0].id}`, d, rel);
  const body = writingD('vi', { p, m, paras, st, gl, ess, h1: `Bài mẫu IELTS Writing Task 2 – Band ${m.band}`, lead: desc, modelHref: `${APP}#/model/t2-${p.id}`, writeHref: `${APP}#/write/${p.id}`,
    secHref: '/samples/', secName: SEC.samples, ak: audioKey, rel: pagerRel(prev, relatedOf(done, done[di], d => d[0].type === p.type, 4), next, (a, b) => !!b && a[0].id === b[0].id).map(card) });
  fs.writeFileSync(`dist/samples/${p.id}.html`, page(title, desc, `${SITE}samples/${p.id}`, body, `Band ${m.band}: ${short(p.text, 50)}`, undefined,
    { smp: 1, st: 'sample', ext: extBox('vi', 'samples') + pwaBox('vi', 'samples'), lr: { learningResourceType: 'Sample essay', wordCount: m.words, timeRequired: `PT${mins(m.words)}M`, teaches: `IELTS Writing Task 2 – ${p.type}`, assesses: `IELTS Band ${m.band}` } }));
});
{
  const byType = {}; for (const d of done) (byType[d[0].type] = byType[d[0].type] || []).push(d);
  const types = Object.entries(byType), gls = done.reduce((a, [, m]) => a + docStats(m.text).phrases, 0);
  fs.writeFileSync('dist/samples/index.html', page(`${done.length} bài mẫu IELTS Writing Task 2 band 8 có chú giải tiếng Việt – Lexkite`, `Trọn bộ ${done.length} bài mẫu IELTS Writing Task 2 band 8 theo từng dạng đề, chú giải cụm từ hay kèm nghĩa tiếng Việt, luyện viết và chấm điểm miễn phí.`, `${SITE}samples/`,
    `<div class="page smp">${hero2({ h1: esc(`${done.length} bài mẫu IELTS Writing Task 2 (band 8)`), lead: 'Tự biên soạn, có chú giải từ vựng tiếng Việt. Bấm vào đề để xem bài mẫu.', mood: 'think', cls: 'has-kit',
      statsHtml: stats([[done.length, U.statEss], [types.length, U.statTypes], ['8.0', 'Band', 'band'], [gls.toLocaleString('vi'), U.statGl]]) })}
${sectionNav('vi', '/samples/')}
${filterBox('vi', typeFilter(types.map(([ty, xs], i) => [`t${i}`, ty, xs.length, typeCls(ty)]), done.length, 'vi'))}
${types.map(([ty, xs], i) => group2(`t${i}`, ty, `${xs.length} ${L.items}`, xs.map(t2Card), typeCls(ty))).join('\n')}</div>`, undefined, undefined,
    { smp: 1, ld: [itemList(`Bài mẫu IELTS Writing Task 2`, done.map(([p]) => `${SITE}samples/${p.id}`))] }));
  addSm([`${SITE}samples/`, ...done.map(([p]) => `${SITE}samples/${p.id}`)], 'web/js/write.js', 'web/js/models.js', 'web/js/write');
  console.log(`✓ SEO: ${done.length} trang bài mẫu Task 2 + mục lục`);
}

// ===== IELTS Speaking: 1 trang / chủ đề (Part 1–3 + câu trả lời mẫu) =====
{
  const { BANK, S } = loadSpeaking();
  fs.mkdirSync('dist/speaking', { recursive: true });
  const slug = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const vch = v => v && v.length ? `<ul class="vch"><li class="k">${U.vocab}</li>${v.map(([e, m]) => `<li><b lang="en">${esc(e)}</b>${m ? ` <span class="m">– ${esc(m)}</span>` : ''}</li>`).join('')}</ul>` : '';
  const ans = q => { const s = S[q]; return s ? `<div class="ans"><p>${esc(s.a)}</p></div>${vch(s.vocab)}` : ''; };
  const qa = (q, n) => `<div class="qa"><h3><span class="qn" aria-hidden="true">Q${n}</span><span>${esc(q)}</span></h3>${ans(q)}</div>`;
  const qs = b => [...b.p1, b.p2.q, ...b.p3];
  // URL bản tiếng Anh (build-samples-en.mjs) không đổi chữ hoa Đ → 'Đọc sách' = /en/speaking/oc-sach (giữ nguyên URL đã lập chỉ mục)
  const enSlug = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const made = BANK.map((b, i) => [slug(b.title), b, i]);
  const spCard = ([id, b]) => smpCard({ href: `/speaking/${id}`, cls: topicCls(b.topic), tag: 'Part 1–3', emoji: topicEmoji(b.topic), title: b.title, desc: b.p2.q, meta: [`${qs(b).length} ${U.questions}`], key: `${b.topic || ''} ${b.title}` });
  const part = (n, icon, h, inner) => `<section class="part" id="part-${n}" aria-labelledby="ph-${n}"><h2 id="ph-${n}"><span class="pb" aria-hidden="true">${icon}</span>${h}</h2><p class="pdesc">${U.parts[n - 1]}</p>${inner}</section>`;
  for (const [id, b, i] of made) {
    const nV = qs(b).reduce((a, q) => a + ((S[q] && S[q].vocab) || []).length, 0), nW = qs(b).reduce((a, q) => a + ((S[q] && S[q].a) || '').split(/\s+/).length, 0);
    const title = `IELTS Speaking chủ đề ${b.title}: câu hỏi Part 1, 2, 3 & câu trả lời mẫu`;
    const desc = `Bộ câu hỏi IELTS Speaking chủ đề ${b.title} (Part 1–3) kèm câu trả lời mẫu band 8 và từ vựng nghĩa tiếng Việt. Cue card: ${b.p2.q}`;
    const prev = made[i - 1], next = made[i + 1];
    // Khung Stitch v2.1 (brand/stitch/web/speaking-*.html): Part 1/2/3 + cue card + câu trả lời mẫu (tô từ vựng thật) + từ vựng nghĩa tiếng Việt, Carlos (listen), CTA luyện nói, chủ đề trước/sau + liên quan, add-on/PWA
    const card = ([[cid, cb], rel]) => speakingCard('vi', `/speaking/${cid}`, cb, cb.title, rel);
    const body = speakingD('vi', { b, i, N: made.length, S, topic: '', h1: `IELTS Speaking – ${b.title}`, lead: desc, p1Href: `${APP}#/speaking/p1/${i}`, p2Href: `${APP}#/speaking/p2/${i}`, secHref: '/speaking/',
      rel: pagerRel(prev, relatedOf(made, made[i], () => true, 4), next, (a, x) => !!x && a[0] === x[0]).map(card) });
    fs.writeFileSync(`dist/speaking/${id}.html`, page(title, desc, `${SITE}speaking/${id}`, body, b.title, enSlug(b.title),
      { smp: 1, st: 'speaking', ext: extBox('vi', 'speaking') + pwaBox('vi', 'speaking'), lr: { learningResourceType: 'Sample answers', teaches: `IELTS Speaking – ${b.title}`, timeRequired: `PT${mins(nW)}M` } }));
  }
  const nQ = made.reduce((a, [, b]) => a + qs(b).length, 0);
  fs.writeFileSync('dist/speaking/index.html', page(`${made.length} chủ đề IELTS Speaking có câu trả lời mẫu – Lexkite`, `Trọn bộ ${made.length} chủ đề IELTS Speaking Part 1, 2, 3 với câu trả lời mẫu band 8 và từ vựng tiếng Việt, luyện nói miễn phí.`, `${SITE}speaking/`,
    `<div class="page smp">${hero2({ h1: esc(`${made.length} chủ đề IELTS Speaking`), lead: 'Câu hỏi Part 1–3, cue card Part 2 và câu trả lời mẫu tự biên soạn.', mood: 'happy', cls: 'has-kit', statsHtml: stats([[made.length, U.statTopics], [nQ, U.statQ], ['Part 1–3', 'IELTS']]) })}
${sectionNav('vi', '/speaking/')}
${filterBox('vi')}
${group2('all', 'Chủ đề', `${made.length} ${L.items}`, made.map(spCard))}</div>`, undefined, undefined,
    { smp: 1, ld: [itemList('IELTS Speaking', made.map(([id]) => `${SITE}speaking/${id}`))] }));
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
${ctaBox(`/app/#/topic/${encodeURIComponent(x.id)}`, '🃏 Học bộ này bằng flashcard (miễn phí)', 'Mở bộ từ trong app', 'Ôn lặp lại ngắt quãng FSRS, nghe phát âm, tự kiểm tra – lưu tiến độ tự động.', 'vocab')}
<div class="tbl" tabindex="0"><table class="wt"><thead><tr><th scope="col" class="no">${L.col.no}</th><th scope="col">${L.col.word}</th><th scope="col">${L.col.ipa}</th><th scope="col">${L.col.mean}</th><th scope="col">${L.col.ex}</th></tr></thead><tbody>${rows}</tbody></table></div>
${ctaBox(`/app/#/topic/${encodeURIComponent(x.id)}`, `Thuộc ${n} từ này trong vài ngày`, 'Học ngay', 'Mỗi ngày vài phút, app tự nhắc đúng lúc bạn sắp quên.', 'vocab')}
${related(relatedOf(TP, x, y => y.group === x.group), vCard)}
${extBox('vi', 'vocab')}
${pwaBox('vi', 'vocab')}`;
    fs.writeFileSync(`dist/tu-vung/${x.id}.html`, page(title, desc, `${SITE}tu-vung/${x.id}`, body, x.name));
  }
  const byG = {}; for (const x of TP) (byG[x.group] = byG[x.group] || []).push(x);
  const total = TP.reduce((a, x) => a + x.words.length, 0), nAu = TP.reduce((a, x) => a + x.words.filter(w => audioKey(w.word)).length, 0), F = FIND_I18N.vi;
  fs.writeFileSync('dist/tu-vung/index.html', page(`Từ vựng IELTS, TOEIC, TOEFL theo chủ đề – ${TP.length} bộ, ${total.toLocaleString('vi')} từ – Lexkite`, `${TP.length} bộ từ vựng IELTS, TOEIC, TOEFL theo chủ đề và kỳ thi, có phiên âm, nghĩa tiếng Việt và ví dụ. Học flashcard miễn phí.`, `${SITE}tu-vung/`,
    `<div class="page smp">${hero2({ h1: esc(`Từ vựng theo chủ đề (${TP.length} bộ)`), lead: `${total.toLocaleString('vi')} từ có phiên âm, nghĩa tiếng Việt, ví dụ và phát âm. Chọn một bộ để xem danh sách, rồi học bằng flashcard miễn phí.`, mood: 'cheer', cls: 'has-kit',
  statsHtml: stats([[TP.length, F[2]], [total.toLocaleString('vi'), F[3]], [Object.keys(byG).length, F[4]], [nAu.toLocaleString('vi'), F[5]]]) })}
${sectionNav('vi', '/tu-vung/')}
${filterBox('vi', typeFilter(Object.entries(byG).map(([k, xs]) => [k, GROUP[k] || k, xs.length, '']), TP.length, 'vi', F[1]))}
${Object.entries(byG).map(([k, xs]) => group(k, GROUP[k] || k, `${xs.length} ${L.sets}`, xs.map(vCard))).join('\n')}</div>`));
  addSm([`${SITE}tu-vung/`, ...TP.map(x => `${SITE}tu-vung/${x.id}`)], 'web/js/data.js', 'web/js/lib');
  console.log(`✓ SEO: ${TP.length} trang bộ từ vựng + mục lục`);
}

// ===== Ngữ pháp: 1 trang / bài (công thức, cách dùng, lỗi hay gặp, ứng dụng IELTS) =====
{
  const { G, UNITS } = loadGrammar();
  const unitOf = id => UNITS.find(u => u.id === id) || { id, name: id, emoji: '', desc: '' };
  fs.mkdirSync('dist/ngu-phap', { recursive: true });
  const hlEx = s => esc(s).replace(/\[\[(.+?)\]\]/g, "<b>$1</b>"); // [[…]] = cấu trúc mục tiêu
  const blk = b => {
    if (b.type === 'formula') return `<h2>Công thức</h2><div class="tbl" tabindex="0"><table class="fx"><tbody>${b.rows.map(r => `<tr><th scope="row">${esc(r.label || '')}</th><td>${r.parts.map(p => esc(p.t)).join(' + ')}${r.ex ? `<br><i class="ex">${hlEx(r.ex)}</i>` : ''}</td></tr>`).join('')}</tbody></table></div>`;
    if (b.type === 'uses') return `<h2>Cách dùng</h2><ol class="uses">${b.items.map(u => `<li><b>${esc(u.title)}</b>${u.ex ? `<br><i>${hlEx(u.ex)}</i>` : ''}${u.vi ? ` – ${esc(u.vi)}` : ''}</li>`).join('')}</ol>`;
    if (b.type === 'signals') return `<h2>Dấu hiệu nhận biết</h2><p class="sig">${b.words.map(w => `<span class="chip">${esc(w)}</span>`).join(' ')}</p>`;
    if (b.type === 'table') return `<div class="tbl" tabindex="0"><table>${b.head ? `<thead><tr>${b.head.map(h => `<th scope="col">${esc(h)}</th>`).join('')}</tr></thead>` : ''}<tbody>${(b.rows || []).map(r => `<tr>${r.map(x => `<td>${esc(x)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
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
${ctaBox(`/app/#/grammar/${encodeURIComponent(l.id)}`, '🧠 Học bài này có minh họa & bài tập (miễn phí)', 'Mở bài học', 'Sơ đồ trực quan, công thức màu và bài tập chấm điểm ngay.')}
${bl.map((b, i) => (i === firstMistake ? '<h2>Lỗi hay gặp</h2>' : '') + blk(b)).join('\n')}
${ctaBox(`/app/#/grammar/${encodeURIComponent(l.id)}`, `✏️ Làm bài tập ${esc(l.en || l.title)}`, 'Làm bài tập')}
${pn}
${related(relatedOf(G, l, y => y.unit === l.unit, 4), gCard)}
${extBox('vi', 'grammar')}
${pwaBox('vi', 'grammar')}</article>`;
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

// ===== Phát âm: 1 trang / âm (44 âm IPA + kỹ năng) – nội dung gốc tiếng Việt; slug chung với bản en (content/seo-en/pron.json › _meta) =====
{
  const P = loadPron(), META = (JSON.parse(fs.readFileSync('content/seo-en/pron.json', 'utf8'))._meta) || {}, { audioKey } = loadVocab();
  const GN = { vowels: 'Nguyên âm đơn', diphthongs: 'Nguyên âm đôi', consonants: 'Phụ âm', vn: 'Lỗi hay gặp của người Việt', stress: 'Trọng âm, nhịp & ngữ điệu' };
  const slugP = x => (META[x.id] || {}).slug || encodeURIComponent(x.id);
  fs.mkdirSync('dist/phat-am', { recursive: true });
  const au = w => { const k = audioKey(w); return k ? audioBtn(k, w, 'vi') : ''; };
  const pCard = x => setCard({ href: `/phat-am/${slugP(x)}`, title: x.title, desc: short(x.how || '', 110), emoji: x.emoji, chips: [[x.ipa, 'ink'], [x.level || '', 'alt']].filter(c => c[0]), key: `${x.ipa} ${GN[x.group] || ''}` });
  P.forEach((x, i) => {
    const s = slugP(x), prev = P[i - 1], next = P[i + 1], href = `${APP}#/pron/${encodeURIComponent(x.id)}`, ws = (x.words || []).slice(0, 12), pairs = x.pairs || [];
    const qs = (x.quiz || []).slice(0, 3);
    const body = `<article class="page">${hero(esc(x.title), { emoji: x.emoji || '🗣️', lead: esc(x.how), chips: [[x.ipa, 'ink'], ...(x.level ? [[x.level, 'alt']] : []), GN[x.group] || x.group] })}
${ctaBox(href, '🎙️ Luyện âm này bằng micro (miễn phí)', 'Mở trong app', 'Nghe mẫu, tự ghi âm và được nhận xét từng từ ngay.')}
${(x.rules || []).length ? `<h2>Quy tắc</h2><div class="tbl" tabindex="0"><table><thead><tr><th scope="col">Quy tắc</th><th scope="col">Khi nào</th><th scope="col">Ví dụ</th></tr></thead><tbody>${x.rules.map(r => `<tr><td><b>${esc(r.label)}</b></td><td>${esc(r.when)}</td><td lang="en">${(r.ex || []).map(esc).join('<br>')}</td></tr>`).join('')}</tbody></table></div>` : ''}
${x.vn ? `<h2>Lỗi người Việt hay mắc</h2><div class="err">${esc(x.vn)}</div>` : ''}
${x.tip ? `<div class="tip">💡 ${esc(x.tip)}</div>` : ''}
${ws.length ? `<h2>Từ ví dụ</h2><div class="tbl" tabindex="0"><table class="wt"><thead><tr><th scope="col">${L.col.word}</th><th scope="col">${L.col.ipa}</th></tr></thead><tbody>${ws.map(w => `<tr><td><span class="w" lang="en">${au(w.w)}${esc(w.w)}</span>${w.note ? ` <small>${esc(w.note)}</small>` : ''}</td><td class="ipa">${esc(w.ipa || '')}</td></tr>`).join('')}</tbody></table></div>` : ''}
${pairs.length ? `<h2>Cặp từ tối thiểu (minimal pairs)</h2><p>Mỗi cặp chỉ khác nhau một âm – đọc to để nghe rõ sự khác biệt.</p><div class="tbl" tabindex="0"><table class="wt"><thead><tr><th scope="col">Từ</th><th scope="col">–</th><th scope="col">Từ</th></tr></thead><tbody>${pairs.map(([a, b]) => `<tr><td><span class="w" lang="en">${au(a)}${esc(a)}</span></td><td>–</td><td><span class="w" lang="en">${au(b)}${esc(b)}</span></td></tr>`).join('')}</tbody></table></div>` : ''}
${(x.sentences || []).length ? `<h2>Câu luyện tập</h2><ul class="uses">${x.sentences.map(z => `<li lang="en">${esc(z)}</li>`).join('')}</ul>` : ''}
${qs.length ? `<h2>Kiểm tra nhanh</h2><ol class="uses">${qs.map(q => `<li><p><b>${esc(q.q)}</b></p><ol type="a">${q.options.map(o => `<li>${esc(o)}</li>`).join('')}</ol><details><summary>Xem đáp án</summary><p>✅ <b>${esc(q.options[q.answer])}</b>${q.explain ? ` – ${esc(q.explain)}` : ''}</p></details></li>`).join('')}</ol>` : ''}
${ctaBox(href, `🗣️ Tự ghi âm các từ có ${esc(x.ipa)}`, 'Luyện trong app')}
<nav class="pager" aria-label="Bài trước / bài sau">${prev ? `<a rel="prev" href="/phat-am/${slugP(prev)}">← ${esc(prev.title)}</a>` : '<span></span>'}${next ? `<a rel="next" href="/phat-am/${slugP(next)}">${esc(next.title)} →</a>` : ''}</nav>
${related(relatedOf(P, x, y => y.group === x.group, 4), pCard)}
${extBox('vi', 'pron')}
${pwaBox('vi', 'pron')}</article>`;
    const ex3 = ws.slice(0, 3).map(w => w.w).join(', ');
    fs.writeFileSync(`dist/phat-am/${s}.html`, page(x.mouth ? `Cách phát âm ${x.ipa} chuẩn (${ex3}) – ${x.title}, cặp từ tối thiểu | Lexkite` : `${x.title} – quy tắc, ví dụ, luyện tập | Lexkite`,
      x.mouth ? `Cách phát âm ${x.ipa}: khẩu hình, ${ws.length} từ ví dụ có phiên âm và audio, ${pairs.length} cặp từ tối thiểu, lỗi người Việt hay mắc. ${short(x.how, 60)}` : `${x.title}: ${short(x.how, 110)} Quy tắc, ví dụ và bài luyện.`, `${SITE}phat-am/${s}`, body, x.title, s));
  });
  const by = {}; for (const x of P) (by[x.group] ||= []).push(x);
  fs.writeFileSync('dist/phat-am/index.html', page(`Phát âm tiếng Anh chuẩn: 44 âm IPA, trọng âm, ngữ điệu – ${P.length} bài | Lexkite`, `${P.length} bài phát âm tiếng Anh: 44 âm IPA, đuôi -ed/-s, trọng âm, nối âm, ngữ điệu – khẩu hình, từ ví dụ có audio, cặp từ tối thiểu và lỗi người Việt hay mắc.`, `${SITE}phat-am/`,
    `${indexHero(`Phát âm tiếng Anh (${P.length} bài)`, '44 âm IPA cùng trọng âm, đuôi -ed/-s và ngữ điệu – có từ ví dụ, audio, cặp từ tối thiểu và lỗi người Việt hay mắc.', 'phat-am')}
${Object.entries(by).map(([k, xs]) => group(k, GN[k] || k, `${xs.length} ${L.lessons}`, xs.map(pCard))).join('\n')}`));
  addSm([`${SITE}phat-am/`, ...P.map(x => `${SITE}phat-am/${slugP(x)}`)], 'web/js/pron', 'content/seo-en/pron.json');
  console.log(`✓ SEO: ${P.length} trang phát âm + mục lục`);
}

// ===== IELTS General – thư mẫu: 1 trang / đề =====
{
  const { LT, MD } = loadLetters(), TONE = { formal: 'Thư trang trọng', 'semi-formal': 'Thư bán trang trọng', informal: 'Thư thân mật' };
  fs.mkdirSync('dist/viet-thu', { recursive: true });
  const made = LT.map(x => [x, MD.find(y => y.id === 'gt-' + x.id)]).filter(([, m]) => m);
  const lCard = ([x, m]) => smpCard({ href: `/viet-thu/${x.id}`, cls: toneCls(x.tone), tag: TONE[x.tone] || x.tone, emoji: '✉️', title: x.titleVi || x.topic, desc: short(x.situation, 120), band: m.band, meta: [`${m.words} ${U.words}`, `${docStats(m.text).phrases} ${U.phrases}`], key: `${x.topic} ${TONE[x.tone] || ''}` });
  made.forEach(([x, m], di) => {
    const gl = [...m.text.matchAll(/\[\[([^|\]]*)\|([^\]]*)\]\]/g)].map(z => [z[1], z[2]]);
    const paras = parseDoc(m.text, 'vi', /\n\s*\n|\n/), st = docStats(m.text), prev = made[di - 1], next = made[di + 1];
    const body = `<article class="page smp smp-doc ${toneCls(x.tone)}">${hero2({ kicker: ['IELTS General Training', 'Writing Task 1', TONE[x.tone] || ''].filter(Boolean), h1: `${esc(x.titleVi || x.topic)} – thư mẫu IELTS General Task 1`,
      statsHtml: stats([[m.band, 'Band', 'band'], [m.words, U.words], [st.phrases, U.phrases], [st.links, U.links], [mins(m.words), U.minL]]) })}
${promptBox(U.task, `<p lang="en">${esc(x.situation)}</p><ul lang="en">${x.bullets.map(b => `<li>${esc(b)}</li>`).join('')}</ul><div class="open">Begin your letter: <b>${esc(x.open)}</b></div>`)}
${ctaBox(`${APP}#/letters/${x.id}`, '✍️ Luyện viết thư này (đếm từ, tự kiểm, chấm AI)', 'Mở đề trong app')}
<div class="ess-grid">${sideHtml(paras, 'vi')}<div class="ess-main"><h2>Thư mẫu</h2>${wm(docHtml(paras, 'vi', 'letter'), `viet-thu/${x.id}`)}
<h2>Cụm từ hay (${gl.length})</h2>${phraseCards(gl)}${saveBox(`${APP}#/model/gt-${x.id}`, 'vi')}</div></div>
${ctaKit(`${APP}#/letters/${x.id}`, 'Đến lượt bạn: tự viết thư theo đề này', 'Viết thư', 'Đếm từ, tự kiểm và chấm AI ngay trong app.')}
${pager2(prev && [`/viet-thu/${prev[0].id}`, prev[0].titleVi || prev[0].topic], next && [`/viet-thu/${next[0].id}`, next[0].titleVi || next[0].topic], 'vi')}
${related(relatedOf(made, made[di], d => d[0].tone === x.tone, 4), lCard)}
${extBox('vi', 'letters')}
${pwaBox('vi', 'letters')}</article>`;
    fs.writeFileSync(`dist/viet-thu/${x.id}.html`, page(`Thư mẫu IELTS General Task 1: ${x.titleVi || x.topic} (${(TONE[x.tone] || '').toLowerCase()}) – band ${m.band}`, `Thư mẫu IELTS General Training Writing Task 1 band ${m.band} – ${TONE[x.tone] || ''}: ${x.situation.slice(0, 120)}… Có chú thích cụm từ hay tiếng Việt.`, `${SITE}viet-thu/${x.id}`, body, x.titleVi || x.topic, undefined,
      { smp: 1, lr: { learningResourceType: 'Sample letter', wordCount: m.words, timeRequired: `PT${mins(m.words)}M`, teaches: `IELTS General Training Writing Task 1 – ${x.tone}`, assesses: `IELTS Band ${m.band}` } }));
  });
  const tones = Object.keys(TONE).map(k => [k, made.filter(([x]) => x.tone === k)]).filter(([, xs]) => xs.length);
  fs.writeFileSync('dist/viet-thu/index.html', page(`${made.length} thư mẫu IELTS General Writing Task 1 (trang trọng, bán trang trọng, thân mật) – Lexkite`, `${made.length} thư mẫu IELTS General Task 1 band 8 theo 3 giọng văn, có chú thích cụm từ tiếng Việt, luyện viết thư miễn phí.`, `${SITE}viet-thu/`,
    `<div class="page smp">${hero2({ h1: esc(`${made.length} thư mẫu IELTS General Task 1`), lead: 'Thư trang trọng, bán trang trọng và thân mật – có chú thích cụm từ hay tiếng Việt.', mood: 'happy', cls: 'has-kit',
      statsHtml: stats([[made.length, U.statLt], [tones.length, U.statTone], ['8.0', 'Band', 'band']]) })}
${sectionNav('vi', '/viet-thu/')}
${filterBox('vi', typeFilter(tones.map(([k, xs]) => [k, TONE[k], xs.length, toneCls(k)]), made.length, 'vi', U.tones))}
${tones.map(([k, xs]) => group2(k, TONE[k], `${xs.length} ${L.items}`, xs.map(lCard), toneCls(k))).join('\n')}</div>`, undefined, undefined,
    { smp: 1, ld: [itemList('IELTS General Training Writing Task 1', made.map(([x]) => `${SITE}viet-thu/${x.id}`))] }));
  addSm([`${SITE}viet-thu/`, ...made.map(([x]) => `${SITE}viet-thu/${x.id}`)], 'web/js/write/gt-letters.js');
  console.log(`✓ SEO: ${made.length} trang thư mẫu IELTS General + mục lục`);
}
