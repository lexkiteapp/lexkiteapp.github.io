// Trang tĩnh cho từng bài mẫu Writing Task 2 (SEO): dist/samples/<id>.html + dist/samples/index.html, thêm vào sitemap.
// Nội dung lấy từ dữ liệu app (đề + bài mẫu tự biên soạn) → không tốn chi phí chạy, Google lập chỉ mục được.
import fs from 'node:fs'; import vm from 'node:vm';
const SITE = 'https://vocaband.web.app/';
const ctx = { self: {}, window: {} }; ctx.self = ctx.window = ctx; vm.createContext(ctx);
for (const f of ['write/task2-more', 'models', 'write/models2', 'write/models3', 'write/models4', 'write/models5']) vm.runInContext(fs.readFileSync(`web/js/${f}.js`, 'utf8'), ctx);
const w = fs.readFileSync('web/js/write.js', 'utf8');
const T = (id, type, topic, text) => ({ id, type, topic, text });
const PROMPTS = vm.runInNewContext(w.slice(w.indexOf('const PROMPTS = [') + 16, w.indexOf('];', w.indexOf('const PROMPTS = [')) + 1), { T });
for (const a of ctx.WRITE_MORE || []) if (!PROMPTS.some(p => p.id === a[0])) PROMPTS.push(T(...a));
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const plain = s => s.replace(/<<[^>]*>>\s*/g, '').replace(/\[\[([^|\]]*)\|[^\]]*\]\]/g, '$1').replace(/\{\{([^}]*)\}\}/g, '$1');
const rich = s => esc(s).replace(/&lt;&lt;([^&]*)&gt;&gt;\s*/g, '<span class="lb">$1</span> ').replace(/\[\[([^|\]]*)\|([^\]]*)\]\]/g, '<mark title="$2">$1</mark>').replace(/\{\{([^}]*)\}\}/g, '<b class="ln">$1</b>');
const css = `body{font:17px/1.7 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;margin:0;background:#f5f6fb;color:#1c1d2b}main{max-width:760px;margin:0 auto;padding:20px 16px 60px}a{color:#5b4cf0}.top{display:flex;justify-content:space-between;align-items:center;gap:8px;font-weight:800}.q{background:#fff;border-left:4px solid #5b4cf0;padding:14px 16px;border-radius:12px;font-weight:600}.ess p{background:#fff;padding:14px 16px;border-radius:12px}mark{background:#ede9ff;border-radius:4px;padding:0 2px}.ln{color:#0e8f8e}.lb{display:inline-block;font-size:12px;font-weight:700;color:#fff;background:#8b85ff;border-radius:6px;padding:0 6px;margin-right:4px}table{width:100%;border-collapse:collapse;background:#fff;border-radius:12px;overflow:hidden}td{border-bottom:1px solid #eee;padding:6px 10px;vertical-align:top}.cta{display:inline-block;background:#5b4cf0;color:#fff;padding:12px 18px;border-radius:12px;text-decoration:none;font-weight:700;margin:12px 0}ul.l{padding-left:18px}@media(prefers-color-scheme:dark){body{background:#0f1017;color:#eceef7}.q,.ess p,table{background:#181a24}mark{background:#2a2850;color:#eceef7}td{border-color:#2a2c3b}}`;
const page = (title, desc, canon, body) => `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><meta name="description" content="${esc(desc)}"><link rel="canonical" href="${canon}"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:image" content="${SITE}icons/icon-512.png"><link rel="icon" href="/icons/icon.svg"><script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@type": "LearningResource", name: title, description: desc, url: canon, inLanguage: "vi", isAccessibleForFree: true, educationalLevel: "IELTS / TOEIC", provider: { "@type": "Organization", name: "Lexkite", url: SITE } }).replace(/</g, "\\u003c")}</script><style>${css}</style></head><body><main><div class="top"><a href="/" style="text-decoration:none">Lexkite</a><span style="font-weight:600;font-size:15px"><a href="/samples/">Writing</a> · <a href="/speaking/">Speaking</a> · <a href="/tu-vung/">Từ vựng</a> · <a href="/ngu-phap/">Ngữ pháp</a> · <a href="/viet-thu/">Viết thư</a></span></div>${body}<p class="small" style="color:#888;font-size:13px">© Lexkite – bài mẫu tự biên soạn, miễn phí cho người học.</p></main></body></html>`;
fs.mkdirSync('dist/samples', { recursive: true });
const done = [];
for (const p of PROMPTS) {
  const m = ctx.MODELS.find(x => x.id === 't2-' + p.id); if (!m) continue;
  const gl = [...m.text.matchAll(/\[\[([^|\]]*)\|([^\]]*)\]\]/g)].map(x => [x[1], x[2]]);
  const short = p.text.length > 70 ? p.text.slice(0, 67).replace(/\s+\S*$/, '') + '…' : p.text;
  const title = `IELTS Writing Task 2 bài mẫu band ${m.band}: ${short}`;
  const desc = `Bài mẫu IELTS Writing Task 2 band ${m.band} (${p.type}, ${m.words} từ) có chú giải ${gl.length} cụm từ hay kèm nghĩa tiếng Việt: ${plain(m.text).slice(0, 90)}…`;
  const body = `<h1 style="font-size:24px;line-height:1.3">Bài mẫu IELTS Writing Task 2 – Band ${esc(m.band)}</h1><p>Dạng đề: <b>${esc(p.type)}</b> · ${m.words} từ</p><div class="q">${esc(p.text)}</div>
<a class="cta" href="/#/model/t2-${p.id}">✍️ Luyện viết đề này miễn phí trên Lexkite →</a>
<h2>Bài mẫu</h2><div class="ess">${rich(m.text).split(/\n\s*\n/).map(x => `<p>${x.trim()}</p>`).join('')}</div>
<h2>Từ vựng & cụm từ hay (${gl.length})</h2><table>${gl.map(([e, v]) => `<tr><td><b>${esc(e)}</b></td><td>${esc(v)}</td></tr>`).join('')}</table>
<a class="cta" href="/#/write/${p.id}">📝 Tự viết bài và được chấm điểm ngay →</a>`;
  fs.writeFileSync(`dist/samples/${p.id}.html`, page(title, desc, `${SITE}samples/${p.id}.html`, body));
  done.push([p, m]);
}
const byType = {}; for (const [p, m] of done) (byType[p.type] = byType[p.type] || []).push([p, m]);
fs.writeFileSync('dist/samples/index.html', page(`${done.length} bài mẫu IELTS Writing Task 2 band 8 có chú giải tiếng Việt – Lexkite`, `Trọn bộ ${done.length} bài mẫu IELTS Writing Task 2 band 8 theo từng dạng đề, chú giải cụm từ hay kèm nghĩa tiếng Việt, luyện viết và chấm điểm miễn phí.`, `${SITE}samples/`,
  `<h1>${done.length} bài mẫu IELTS Writing Task 2 (band 8)</h1><p>Tự biên soạn, có chú giải từ vựng tiếng Việt. Bấm vào đề để xem bài mẫu.</p>${Object.entries(byType).map(([ty, xs]) => `<h2>${esc(ty)}</h2><ul class="l">${xs.map(([p]) => `<li><a href="/samples/${p.id}.html">${esc(p.text)}</a></li>`).join('')}</ul>`).join('')}`));
// thêm vào sitemap
const sm = 'dist/sitemap.xml', urls = [`${SITE}samples/`, ...done.map(([p]) => `${SITE}samples/${p.id}.html`)].map(u => `  <url><loc>${u}</loc><changefreq>monthly</changefreq></url>`).join('\n');
fs.writeFileSync(sm, fs.readFileSync(sm, 'utf8').replace('</urlset>', urls + '\n</urlset>'));
console.log(`✓ SEO: ${done.length} trang bài mẫu Task 2 + mục lục`);

// ===== IELTS Speaking: 1 trang / chủ đề (Part 1–3 + câu trả lời mẫu) =====
{
  const sp = fs.readFileSync('web/js/speaking.js', 'utf8'), i0 = sp.indexOf('const BANK = [') + 13;
  const BANK = vm.runInNewContext(sp.slice(i0, sp.indexOf('\n  ];', i0) + 4), { t: s => s });
  const c2 = { self: {}, window: {} }; c2.self = c2.window = c2; vm.createContext(c2);
  for (const f of ['speak/samples', 'speak/more', 'speak/more2', 'speak/more3']) vm.runInContext(fs.readFileSync(`web/js/${f}.js`, 'utf8'), c2);
  for (const x of c2.SPEAK_MORE || []) if (!BANK.some(b => b.title === x.title)) BANK.push(x);
  const S = c2.SPEAK_SAMPLES || {};
  fs.mkdirSync('dist/speaking', { recursive: true });
  const slug = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const qa = (q, part) => { const s = S[q]; return `<h3>${esc(q)}</h3>${part === 2 ? '' : ''}${s ? `<div class="ess"><p>${esc(s.a)}</p></div>${s.vocab && s.vocab.length ? `<table>${s.vocab.map(([e, v]) => `<tr><td><b>${esc(e)}</b></td><td>${esc(v)}</td></tr>`).join('')}</table>` : ''}` : ''}`; };
  const made = [];
  BANK.forEach((b, i) => {
    const id = slug(b.title), title = `IELTS Speaking chủ đề ${b.title}: câu hỏi Part 1, 2, 3 & câu trả lời mẫu`;
    const desc = `Bộ câu hỏi IELTS Speaking chủ đề ${b.title} (Part 1–3) kèm câu trả lời mẫu band 8 và từ vựng nghĩa tiếng Việt. Cue card: ${b.p2.q}`;
    const body = `<h1 style="font-size:24px;line-height:1.3">IELTS Speaking – ${esc(b.title)}</h1><a class="cta" href="/#/speaking/p1/${i}">🎙️ Luyện nói chủ đề này (ghi âm & chấm) →</a>
<h2>Part 1</h2>${b.p1.map(q => qa(q, 1)).join('')}
<h2>Part 2 – Cue card</h2><div class="q">${esc(b.p2.q)}<ul class="l">${b.p2.points.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>${qa(b.p2.q, 2).replace(/^<h3>[^<]*<\/h3>/, '')}
<h2>Part 3</h2>${b.p3.map(q => qa(q, 3)).join('')}<a class="cta" href="/#/speaking/p2/${i}">🗣️ Thử nói Part 2 với đồng hồ đếm giờ →</a>`;
    fs.writeFileSync(`dist/speaking/${id}.html`, page(title, desc, `${SITE}speaking/${id}.html`, body).replace(/<a href="\/samples\/">Bài mẫu Task 2<\/a>/, '<a href="/speaking/">IELTS Speaking</a>'));
    made.push([id, b]);
  });
  fs.writeFileSync('dist/speaking/index.html', page(`${made.length} chủ đề IELTS Speaking có câu trả lời mẫu – Lexkite`, `Trọn bộ ${made.length} chủ đề IELTS Speaking Part 1, 2, 3 với câu trả lời mẫu band 8 và từ vựng tiếng Việt, luyện nói miễn phí.`, `${SITE}speaking/`,
    `<h1>${made.length} chủ đề IELTS Speaking</h1><p>Câu hỏi Part 1–3, cue card Part 2 và câu trả lời mẫu tự biên soạn.</p><ul class="l">${made.map(([id, b]) => `<li><a href="/speaking/${id}.html">${esc(b.title)}</a> – ${esc(b.p2.q)}</li>`).join('')}</ul>`).replace(/<a href="\/samples\/">Bài mẫu Task 2<\/a>/, '<a href="/samples/">Bài mẫu Writing</a>'));
  const urls = [`${SITE}speaking/`, ...made.map(([id]) => `${SITE}speaking/${id}.html`)].map(u => `  <url><loc>${u}</loc><changefreq>monthly</changefreq></url>`).join('\n');
  fs.writeFileSync(sm, fs.readFileSync(sm, 'utf8').replace('</urlset>', urls + '\n</urlset>'));
  console.log(`✓ SEO: ${made.length} trang chủ đề Speaking + mục lục`);
}

// ===== Từ vựng theo chủ đề: 1 trang / bộ từ (từ, phiên âm, nghĩa, ví dụ) =====
{
  const c3 = { self: {}, window: {}, t: s => s, localStorage: { getItem() {}, setItem() {} } }; c3.self = c3.window = c3; vm.createContext(c3);
  vm.runInContext(fs.readFileSync('web/js/data.js', 'utf8'), c3);
  for (const f of ['topics-more', 'skills', 'awl', 'ngsl', 'tsl-a', 'tsl-b', 'domain-a', 'domain-b', 'exam-vocab', 'exam-vocab2', 'exam-vocab3']) vm.runInContext(fs.readFileSync(`web/js/lib/${f}.js`, 'utf8'), c3);
  const GROUP = { topics: 'Từ vựng IELTS theo chủ đề', writing: 'Từ vựng IELTS Writing', speaking: 'Từ vựng IELTS Speaking', awl: 'Từ học thuật AWL', core: 'Từ vựng cốt lõi NGSL', toeic: 'Từ vựng TOEIC', domain: 'Từ vựng chuyên ngành', exam: 'Từ vựng theo kỳ thi' };
  const TP = c3.IELTS_DATA.TOPICS.filter(x => x.words && x.words.length >= 8);
  fs.mkdirSync('dist/tu-vung', { recursive: true });
  for (const x of TP) {
    const g = GROUP[x.group] || 'Từ vựng', n = x.words.length;
    const title = `${g}: ${x.name} – ${n} từ có phiên âm, nghĩa tiếng Việt, ví dụ`;
    const desc = `${n} từ vựng ${x.name} (${g}) kèm phiên âm IPA, nghĩa tiếng Việt, định nghĩa và câu ví dụ: ${x.words.slice(0, 8).map(w => w.word).join(', ')}… Học flashcard miễn phí trên Lexkite.`;
    const body = `<h1 style="font-size:24px;line-height:1.3">${esc(x.emoji || '📘')} ${esc(x.name)} <span style="font-size:15px;color:#888">· ${esc(g)} · ${n} từ</span></h1>${x.desc ? `<p>${esc(x.desc)}</p>` : ''}<a class="cta" href="/#/topic/${encodeURIComponent(x.id)}">🃏 Học bộ này bằng flashcard (miễn phí) →</a>
<table>${x.words.map(w => `<tr><td><b>${esc(w.word)}</b><br><span style="color:#888;font-size:14px">${esc(w.ipa || '')} ${esc(w.pos || '')}</span></td><td>${esc(w.vi || '')}${w.ex ? `<br><i style="font-size:14px;color:#666">${esc(w.ex)}</i>` : ''}</td></tr>`).join('')}</table>`;
    fs.writeFileSync(`dist/tu-vung/${x.id}.html`, page(title, desc, `${SITE}tu-vung/${x.id}.html`, body).replace(/<a href="\/samples\/">Bài mẫu Task 2<\/a>/, '<a href="/tu-vung/">Từ vựng</a>'));
  }
  const byG = {}; for (const x of TP) (byG[x.group] = byG[x.group] || []).push(x);
  const total = TP.reduce((a, x) => a + x.words.length, 0);
  fs.writeFileSync('dist/tu-vung/index.html', page(`Từ vựng IELTS, TOEIC, TOEFL theo chủ đề – ${TP.length} bộ, ${total.toLocaleString('vi')} từ – Lexkite`, `${TP.length} bộ từ vựng IELTS, TOEIC, TOEFL theo chủ đề và kỳ thi, có phiên âm, nghĩa tiếng Việt và ví dụ. Học flashcard miễn phí.`, `${SITE}tu-vung/`,
    `<h1>Từ vựng theo chủ đề (${TP.length} bộ)</h1>${Object.entries(byG).map(([k, xs]) => `<h2>${esc(GROUP[k] || k)}</h2><ul class="l">${xs.map(x => `<li><a href="/tu-vung/${x.id}.html">${esc(x.name)}</a> – ${x.words.length} từ</li>`).join('')}</ul>`).join('')}`).replace(/<a href="\/samples\/">Bài mẫu Task 2<\/a>/, '<a href="/samples/">Bài mẫu Writing</a>'));
  const urls = [`${SITE}tu-vung/`, ...TP.map(x => `${SITE}tu-vung/${x.id}.html`)].map(u => `  <url><loc>${u}</loc><changefreq>monthly</changefreq></url>`).join('\n');
  fs.writeFileSync(sm, fs.readFileSync(sm, 'utf8').replace('</urlset>', urls + '\n</urlset>'));
  console.log(`✓ SEO: ${TP.length} trang bộ từ vựng + mục lục`);
}

// ===== Ngữ pháp: 1 trang / bài (công thức, cách dùng, lỗi hay gặp, ứng dụng IELTS) =====
{
  const c4 = { self: {} }; c4.self = c4; vm.createContext(c4);
  for (const f of ['tenses', 'verbs', 'sentences', 'foundation', 'academic', 'chapters', 'book2']) vm.runInContext(fs.readFileSync(`web/js/grammar/${f}.js`, 'utf8'), c4);
  const G = c4.GRAMMAR || [];
  fs.mkdirSync('dist/ngu-phap', { recursive: true });
  const blk = b => {
    if (b.type === 'formula') return `<h2>Công thức</h2><table>${b.rows.map(r => `<tr><td><b>${esc(r.label || '')}</b></td><td>${r.parts.map(p => esc(p.t)).join(' + ')}${r.ex ? `<br><i>${esc(r.ex)}</i>` : ''}</td></tr>`).join('')}</table>`;
    if (b.type === 'uses') return `<h2>Cách dùng</h2><ol>${b.items.map(u => `<li><b>${esc(u.title)}</b>${u.ex ? `<br><i>${esc(u.ex)}</i>` : ''}${u.vi ? ` – ${esc(u.vi)}` : ''}</li>`).join('')}</ol>`;
    if (b.type === 'signals') return `<h2>Dấu hiệu nhận biết</h2><p>${b.words.map(esc).join(' · ')}</p>`;
    if (b.type === 'table') return `<table>${b.head ? `<tr>${b.head.map(h => `<td><b>${esc(h)}</b></td>`).join('')}</tr>` : ''}${(b.rows || []).map(r => `<tr>${r.map(x => `<td>${esc(x)}</td>`).join('')}</tr>`).join('')}</table>`;
    if (b.type === 'tip') return `<div class="q" style="font-weight:400">💡 ${esc(b.text)}</div>`;
    if (b.type === 'mistake') return `<p>❌ <s>${esc(b.wrong)}</s><br>✅ <b>${esc(b.right)}</b>${b.why ? `<br><span style="color:#888">${esc(b.why)}</span>` : ''}</p>`;
    if (b.type === 'ielts') return `<h2>Ứng dụng trong IELTS</h2><p>${esc(b.text)}</p>`;
    return '';
  };
  G.forEach((l, gi) => {
    const prev = G[gi - 1], next = G[gi + 1], pn = `<p style="display:flex;justify-content:space-between;gap:8px">${prev ? `<a href="/ngu-phap/${prev.id}.html">← ${esc(prev.title)}</a>` : '<span></span>'}${next ? `<a href="/ngu-phap/${next.id}.html">${esc(next.title)} →</a>` : ''}</p>`;
    const bl = l.blocks || [], firstMistake = bl.findIndex(b => b.type === 'mistake');
    const body = `<h1 style="font-size:24px;line-height:1.3">${esc(l.emoji || '📘')} ${esc(l.title)} <span style="font-size:16px;color:#888">(${esc(l.en || '')}) · ${esc(l.level || '')}</span></h1><p>${esc(l.summary || '')}</p><a class="cta" href="/#/grammar/${encodeURIComponent(l.id)}">🧠 Học bài này có minh họa & bài tập (miễn phí) →</a>
${bl.map((b, i) => (i === firstMistake ? '<h2>Lỗi hay gặp</h2>' : '') + blk(b)).join('\n')}<a class="cta" href="/#/grammar/${encodeURIComponent(l.id)}">✏️ Làm bài tập ${esc(l.en || l.title)} →</a>${pn}`;
    fs.writeFileSync(`dist/ngu-phap/${l.id}.html`, page(`${l.title} (${l.en}) – công thức, cách dùng, dấu hiệu, lỗi hay gặp | Lexkite`, `${l.title} (${l.en}): ${l.summary || ''} Công thức, ví dụ song ngữ, lỗi người Việt hay mắc và cách dùng trong IELTS.`.slice(0, 300), `${SITE}ngu-phap/${l.id}.html`, body));
  });
  const units = {}; for (const l of G) (units[l.unit || 'khac'] = units[l.unit || 'khac'] || []).push(l);
  fs.writeFileSync('dist/ngu-phap/index.html', page(`Ngữ pháp tiếng Anh từ cơ bản đến IELTS – ${G.length} bài | Lexkite`, `${G.length} bài ngữ pháp tiếng Anh: 12 thì, câu điều kiện, bị động, mệnh đề quan hệ… có công thức, ví dụ song ngữ, lỗi hay gặp và bài tập miễn phí.`, `${SITE}ngu-phap/`,
    `<h1>Ngữ pháp tiếng Anh (${G.length} bài)</h1><ul class="l">${G.map(l => `<li><a href="/ngu-phap/${l.id}.html">${esc(l.title)}</a> – ${esc(l.en || '')} · ${esc(l.level || '')}</li>`).join('')}</ul>`).replace(/<a href="\/samples\/">Bài mẫu Task 2<\/a>/, '<a href="/tu-vung/">Từ vựng</a>'));
  const urls = [`${SITE}ngu-phap/`, ...G.map(l => `${SITE}ngu-phap/${l.id}.html`)].map(u => `  <url><loc>${u}</loc><changefreq>monthly</changefreq></url>`).join('\n');
  fs.writeFileSync(sm, fs.readFileSync(sm, 'utf8').replace('</urlset>', urls + '\n</urlset>'));
  console.log(`✓ SEO: ${G.length} trang ngữ pháp + mục lục`);
}

// ===== IELTS General – thư mẫu: 1 trang / đề =====
{
  const c5 = { self: {} }; c5.self = c5; vm.createContext(c5);
  vm.runInContext(fs.readFileSync('web/js/write/gt-letters.js', 'utf8'), c5);
  const LT = c5.GT_LETTERS || [], MD = c5.MODELS || [], TONE = { formal: 'Thư trang trọng', 'semi-formal': 'Thư bán trang trọng', informal: 'Thư thân mật' };
  fs.mkdirSync('dist/viet-thu', { recursive: true });
  const made = [];
  for (const x of LT) {
    const m = MD.find(y => y.id === 'gt-' + x.id); if (!m) continue;
    const gl = [...m.text.matchAll(/\[\[([^|\]]*)\|([^\]]*)\]\]/g)].map(z => [z[1], z[2]]);
    const body = `<h1 style="font-size:24px;line-height:1.3">✉️ ${esc(x.titleVi || x.topic)} – thư mẫu IELTS General Task 1</h1><p>${esc(TONE[x.tone] || '')} · ${m.words} từ · Band ${esc(m.band)}</p>
<div class="q">${esc(x.situation)}<ul class="l">${x.bullets.map(b => `<li>${esc(b)}</li>`).join('')}</ul><div style="font-weight:400;font-size:15px">Begin your letter: <b>${esc(x.open)}</b></div></div>
<a class="cta" href="/#/letters/${x.id}">✍️ Luyện viết thư này (đếm từ, tự kiểm, chấm AI) →</a>
<h2>Thư mẫu</h2><div class="ess">${rich(m.text).split(/\n\s*\n|\n/).filter(p => p.trim()).map(p => `<p>${p.trim()}</p>`).join('')}</div>
<h2>Cụm từ hay (${gl.length})</h2><table>${gl.map(([e, v]) => `<tr><td><b>${esc(e)}</b></td><td>${esc(v)}</td></tr>`).join('')}</table>`;
    fs.writeFileSync(`dist/viet-thu/${x.id}.html`, page(`Thư mẫu IELTS General Task 1: ${x.titleVi || x.topic} (${(TONE[x.tone] || '').toLowerCase()}) – band ${m.band}`, `Thư mẫu IELTS General Training Writing Task 1 band ${m.band} – ${TONE[x.tone] || ''}: ${x.situation.slice(0, 120)}… Có chú thích cụm từ hay tiếng Việt.`, `${SITE}viet-thu/${x.id}.html`, body));
    made.push(x);
  }
  fs.writeFileSync('dist/viet-thu/index.html', page(`${made.length} thư mẫu IELTS General Writing Task 1 (trang trọng, bán trang trọng, thân mật) – Lexkite`, `${made.length} thư mẫu IELTS General Task 1 band 8 theo 3 giọng văn, có chú thích cụm từ tiếng Việt, luyện viết thư miễn phí.`, `${SITE}viet-thu/`,
    `<h1>${made.length} thư mẫu IELTS General Task 1</h1>${Object.keys(TONE).map(k => `<h2>${TONE[k]}</h2><ul class="l">${made.filter(x => x.tone === k).map(x => `<li><a href="/viet-thu/${x.id}.html">${esc(x.titleVi || x.topic)}</a></li>`).join('')}</ul>`).join('')}`));
  const urls = [`${SITE}viet-thu/`, ...made.map(x => `${SITE}viet-thu/${x.id}.html`)].map(u => `  <url><loc>${u}</loc><changefreq>monthly</changefreq></url>`).join('\n');
  fs.writeFileSync(sm, fs.readFileSync(sm, 'utf8').replace('</urlset>', urls + '\n</urlset>'));
  console.log(`✓ SEO: ${made.length} trang thư mẫu IELTS General + mục lục`);
}
