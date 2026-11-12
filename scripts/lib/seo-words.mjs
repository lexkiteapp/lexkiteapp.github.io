// Trang từ /<lang>/words/<slug> – MỘT nguồn chọn trang + dựng nội dung (docs/specs/seo-words-depth.md), dùng chung bởi:
//   scripts/build-seo-pages.mjs (sinh trang, sitemap, hreflang) và scripts/build-blog.mjs (hộp "từ trong bài" → /<lang>/words/, chạy TRƯỚC build-seo-pages).
// Chỉ đọc nguồn (kho từ, web/packs, web/js/notes, web/js/usage, WordNet, bài mẫu Writing/Speaking); không ghi file. N: SEO_N_MAIN (1500), SEO_N_PRIORITY (650: ngôn ngữ thị trường CPM cao, functions/api/_cpm.js), SEO_N_OTHER (400).
// indexable(l, e) = đúng điều kiện build-seo-pages dùng cho robots: trong tập idxW (không mỏng, không trùng trang từ điển) VÀ đạt DEPTH_MIN.
import fs from 'node:fs'; import vm from 'node:vm';
import { loadBrowserIndex } from '../lexicon/shards.mjs';
import { seoPic } from '../lexicon/img.mjs';
import { loadVocab } from './seo-data.mjs';
import { esc, appHref } from './site-layout.mjs';
import { LANGS, S, POS, fill } from './seo-pages-i18n.mjs';
import { toolPath, toolStrings } from './tools-links.mjs';
import { loadSources, enrich } from '../dict/build.mjs';
import { measure, deep } from './word-depth.mjs';
import { PRIORITY_LANGS } from '../../functions/api/_cpm.js';

const N_MAIN = +(process.env.SEO_N_MAIN || 1500), N_OTHER = +(process.env.SEO_N_OTHER || 400), N_PRIORITY = +(process.env.SEO_N_PRIORITY || 650);

export const J = f => JSON.parse(fs.readFileSync(f, 'utf8'));
export const RTL = new Set(['ar']);
export const slugOf = w => String(w).toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
export const gpos = p => { p = String(p || '').toLowerCase(); return /^(n|noun)\b/.test(p) ? 'n' : /^(phr ?v|phrasal)/.test(p) ? 'phrv' : /^(v|verb)\b/.test(p) ? 'v' : /^adj/.test(p) ? 'adj' : /^adv/.test(p) ? 'adv' : /^idiom/.test(p) ? 'idiom' : /^(phr|phrase|expr)/.test(p) ? 'phr' : /^prep/.test(p) ? 'prep' : /^conj/.test(p) ? 'conj' : /^pron/.test(p) ? 'pron' : p; };
export const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

// ---------- Dữ liệu ----------
const { INDEX, TOPICS } = loadBrowserIndex();
const { audioKey } = loadVocab();
const topicOf = new Map(TOPICS.map(t => [t.id, t]));
const packs = Object.fromEntries(LANGS.filter(l => l !== 'vi' && l !== 'en').map(l => [l, J(`web/packs/${l}.json`)]));
// 🖼️ Ảnh minh hoạ theo nghĩa: CHỈ khi chủ duyệt phong cách (img.json style.approved === true) và nghĩa có ảnh → <picture> dựng sẵn
// bằng CHÍNH VImg.pic (web/js/vocab-img.js) → cùng markup với app; chưa duyệt → trang giữ nguyên từng byte (docs/LEXICON.md § Ảnh minh hoạ)
const IMG = fs.existsSync('content/lexicon/img.json') ? J('content/lexicon/img.json') : null;
const VPIC = IMG && IMG.style && IMG.style.approved === true && Object.keys(IMG.items || {}).length ? (() => { const ctx = {}; ctx.self = ctx; vm.runInNewContext(fs.readFileSync('web/js/vocab-img.js', 'utf8'), ctx); return ctx.VImg.pic; })() : null;
const vimgOf = (e, alt, label) => (VPIC ? seoPic(IMG, String(e.word).toLowerCase() + '#' + gpos(e.pos), alt, label, VPIC) : ''); // ảnh chụp (photo) nếu có, không thì h – scripts/lexicon/img.mjs
const notes = {}; for (const f of fs.readdirSync('web/js/notes').filter(f => f.endsWith('.json'))) Object.assign(notes, J('web/js/notes/' + f));
const gloss = (l, e) => { const p = packs[l], k = e.word.toLowerCase(); return (p && (p[k + '#' + gpos(e.pos)] || p[k])) || null; };

// Điểm "giá trị tìm kiếm" (docs/SEO-ARCH.md §2): cấp CEFR + bộ thi + độ giàu nội dung; lọc cứng có định nghĩa + ví dụ
const LV = { A1: 1, A2: 2.5, B1: 4, B2: 4.5, C1: 4.5, C2: 3.5 };
const GROUP = { awl: 2, topics: 1.5, writing: 1.5, speaking: 1.5, exam: 1.5, toeic: 1, nawl: 1, core: .5, office: .5, domain: .3, bsl: .3 };
const score = e => {
  const w = e.word, nw = w.split(/\s+/).length, tp = topicOf.get(e.topic);
  let s = LV[String(e.level || '').toUpperCase()] ?? 1.5;
  s += GROUP[tp && tp.group] || 0;
  s += (e.col || []).length ? 1 : 0; s += (e.syn || []).length ? 1 : 0; s += e.ipaUS ? .3 : 0; s += audioKey(w) ? .5 : 0; s += notes[w.toLowerCase()] ? 1.5 : 0;
  if (nw >= 4) s -= 3; else if (nw > 1 && !/phr|idiom/.test(gpos(e.pos))) s -= 1;
  if (w.length <= 2) s -= 3;
  return s;
};
const all = Object.values(INDEX).filter(e => e && e.word && e.def && e.ex && /^[A-Za-z][A-Za-z '’-]*$/.test(e.word) && slugOf(e.word));
all.sort((a, b) => score(b) - score(a) || a.word.localeCompare(b.word, 'en'));
const ranked = all.slice(0, N_MAIN);
const slug = new Map(); { const used = new Set(); for (const e of ranked) { let s = slugOf(e.word), i = 2; if (s === 'index') s = 'index-2'; while (used.has(s)) s = slugOf(e.word) + '-' + i++; used.add(s); slug.set(e, s); } }
// Ngôn ngữ → danh sách mục; 13 ngôn ngữ: N_OTHER mục đầu bảng có nghĩa bản địa (không trùng chính từ)
const setOf = {};
for (const l of LANGS) {
  if (l === 'en' || l === 'vi') setOf[l] = ranked.filter(e => l === 'en' || e.vi);
  else setOf[l] = ranked.filter(e => { const g = gloss(l, e); return g && g[0] && g[0].toLowerCase() !== e.word.toLowerCase(); }).slice(0, PRIORITY_LANGS.includes(l) ? N_PRIORITY : N_OTHER);
}
// Trang mỏng → noindex: nghĩa bản địa là dịch máy thô (cờ 0) hoặc không có collocation/đồng nghĩa/cụm (chỉ 1 ví dụ)
const byTok = new Map(); for (const e of Object.values(INDEX)) if (e && /\s/.test(e.word)) for (const t of e.word.toLowerCase().split(/\s+/)) { const a = byTok.get(t) || byTok.set(t, []).get(t); if (a.length < 6) a.push(e); }
const phrasesOf = new Map(); for (const e of ranked) phrasesOf.set(e, (byTok.get(e.word.toLowerCase()) || []).filter(p => p.word !== e.word));
const thin = (l, e) => (l !== 'en' && l !== 'vi' && (gloss(l, e) || [])[1] === 0) || (!(e.col || []).length && !(e.syn || []).length && !phrasesOf.get(e).length);
const idxW = {}; for (const l of LANGS) idxW[l] = new Set(setOf[l].filter(e => !thin(l, e)));
// Từ đã mở index ở trang từ điển (docs/SEO-DICT-PAGES.md §1, content/dict/stage.json): trang /words/ của từ đó → noindex, rời sitemap/hreflang;
// Worker lexkite-dict trả 301 sang /vi/tu-dien/, /en/dictionary/ – không bao giờ 2 URL index được cho cùng 1 từ
{ const st = fs.existsSync('content/dict/stage.json') ? J('content/dict/stage.json') : null;
  if (st && st.index) { const { build: dictBuild } = await import('../dict/build.mjs'); const { isIndexable, parseOpen } = await import('../../workers/dict/render.mjs'); const o = parseOpen(st.index), { pages } = dictBuild({ n: st.n, index: st.index, write: false });
    for (const l of ['vi', 'en']) { const m = new Set(pages[l].filter(d => isIndexable(d, o)).map(d => d.word.toLowerCase())); for (const e of setOf[l]) if (m.has(e.word.toLowerCase())) idxW[l].delete(e); } } }
const inSet = {}; for (const l of LANGS) inSet[l] = new Map(setOf[l].map(e => [e.word.toLowerCase(), e]));
export { setOf, idxW, inSet, slug, gloss, topicOf };

export const en = s => `<span lang="en" dir="ltr">${esc(s)}</span>`;
export const appLink = (lang, route) => `${appHref(lang)}#/${route}`;
export const cta = (title, note, href, btn) => `<div class="cta"><p><strong>${esc(title)}</strong><small>${esc(note)}</small></p><a class="btn" href="${href}">${esc(btn)} →</a></div>`;
export const wPath = (l, e) => `/${l}/words/${slug.get(e)}`;
const DX = loadSources(LANGS); // "Cách dùng từ", kho câu tự soạn, WordNet, bài blog đã đăng – cùng nguồn trang từ điển (scripts/dict/build.mjs)
const VI_RE = /[ăâđêôơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i;
// Câu tiếng Anh tự soạn khác của app (bài mẫu IELTS Writing web/cpack/write/models.js, câu trả lời mẫu Speaking web/cpack/speak/samples.js – CONTENT-RULES) → ví dụ thật cho từ ít ví dụ
const MORE_EX = (() => {
  const ctx = {}; ctx.self = ctx; ctx.window = ctx; vm.createContext(ctx);
  for (const f of ['web/cpack/write/models.js', 'web/cpack/speak/samples.js']) vm.runInContext(fs.readFileSync(f, 'utf8'), ctx, { filename: f });
  const texts = [...(ctx.MODELS || []).map(m => String(m.text || '').replace(/<<[^>]*>>/g, '').replace(/\[\[([^|\]]+)\|[^\]]*\]\]/g, '$1').replace(/\{\{([^}]*)\}\}/g, '$1')), ...Object.values(ctx.SPEAK_SAMPLES || {}).map(x => String(x.a || ''))];
  const by = new Map();
  for (const tx0 of texts) for (const s0 of tx0.split(/(?<=[.!?])\s+/)) { const s = s0.replace(/\s+/g, ' ').trim(); if (s.length < 25 || s.length > 130 || VI_RE.test(s) || /[[\]{}<>_|]/.test(s) || !/^[A-Z“"']/.test(s)) continue; for (const t of new Set(s.toLowerCase().match(/[a-z]+/g) || [])) { const a = by.get(t) || by.set(t, []).get(t); if (a.length < 20 && !a.includes(s)) a.push(s); } }
  for (const a of by.values()) a.sort((x, y) => x.length - y.length || x.localeCompare(y));
  return by;
})();
const okL = (l, s) => !!s && !(l !== 'vi' && VI_RE.test(s)); // chữ Việt không lọt trang ngôn ngữ khác
const tx = (l, s) => (l === 'vi' || l === 'en' ? esc(s) : en(s)); // giải thích: vi/en đúng ngôn ngữ trang; 13 ngôn ngữ còn lại là chữ tiếng Anh gốc → lang="en"
const sec = (id, d, h, inner) => `<section aria-labelledby="h-${id}"${d ? ` data-d="${d}"` : ''}><h2 id="h-${id}">${esc(h)}</h2>${inner}</section>`;
const hiW = (s, k) => esc(s).replace(new RegExp(`\\b(${k.replace(/[^a-z' -]/g, '')}[a-z]*)`, 'i'), '<b>$1</b>');
const posIn = {}; for (const l of LANGS) posIn[l] = new Map(setOf[l].map((e, i) => [e, i]));
const built = {}; // l → Map(mục → { body, faq, m }) – dựng một lần, build-seo-pages và build-blog dùng chung
export function bodyOf(l, e) {
  const c = (built[l] ||= new Map()); if (c.has(e)) return c.get(e);
  const t = S[l], list = setOf[l], P = POS[l], i = posIn[l].get(e);
    const w = e.word, k = w.toLowerCase(), g = gloss(l, e), dx = enrich(DX, e, l, byTok);
    const m = l === 'en' ? e.def : l === 'vi' ? e.vi : g[0];
    const W = cap(w), pos = P[gpos(e.pos)] || e.pos || '';
    const link = x => { const y = inSet[l].get(String(x).toLowerCase()); return y && y !== e ? `<a href="${wPath(l, y)}" lang="en" dir="ltr">${esc(x)}</a>` : `<span lang="en" dir="ltr">${esc(x)}</span>`; };
    const tp = topicOf.get(e.topic), rel = list.filter(x => x !== e && x.topic === e.topic).slice(0, 8);
    const near = rel.length >= 4 ? rel : [...rel, ...list.slice(Math.max(0, i - 4), i + 5).filter(x => x !== e && !rel.includes(x))].slice(0, 8);
    const au = audioKey(w), n = l === 'vi' ? notes[k] : null, ipaUS = e.ipaUS || dx.ipaUS;
    // Nghĩa theo từ loại: mục chính + more[] (từ loại khác của cùng từ trong kho); 13 ngôn ngữ: nghĩa gói theo đúng từ#loại, không có → định nghĩa tiếng Anh
    const senses = [{ pos, m, mt: g && g[1] === 0, def: e.def }, ...(e.more || []).map(x => { const gx = l === 'vi' ? [x.vi] : l === 'en' ? [x.def] : (packs[l][k + '#' + gpos(x.pos)] || null); return { pos: P[gpos(x.pos)] || x.pos || '', m: gx && gx[0], mt: gx && gx[1] === 0, def: x.def, ex: x.ex, ipa: x.ipa && x.ipa !== e.ipa ? x.ipa : '' }; })];
    const sm = s => (s.m ? `${s.m === s.def && l === 'en' ? `<span lang="en">${esc(s.m)}</span>` : esc(s.m)}${s.mt ? ` <span class="mt">(${esc(t.mt)})</span>` : ''}` : en(s.def));
    const meanHtml = senses.length === 1 ? `<p class="mean"${l === 'en' ? ' lang="en"' : ''}>${esc(m)}${g && g[1] === 0 ? ` <span class="mt">(${esc(t.mt)})</span>` : ''}</p>${l !== 'en' ? `<p><b>${esc(t.def)}:</b> ${en(e.def)}</p>` : ''}`
      : `<ol class="senses">${senses.map(s => `<li><span class="chip">${esc(s.pos)}</span>${s.ipa ? ` <span class="ipa" dir="ltr">${esc(s.ipa)}</span>` : ''} <span class="mean">${sm(s)}</span>${l !== 'en' && s.m ? `<br><b>${esc(t.def)}:</b> ${en(s.def)}` : ''}${s.ex ? `<br><i lang="en" dir="ltr">${hiW(s.ex, k)}</i>` : ''}</li>`).join('')}</ol>`;
    const exRe = new RegExp(`\\b${k.replace(/[^a-z' -]/g, '')}`, 'i'), moreEx = [k, k + 's', k + 'es', k + 'ed', k + 'd', k + 'ing'].flatMap(f => MORE_EX.get(f) || []).filter(s => exRe.test(s));
    const exs = [...new Set([e.ex, e.ex2, ...dx.examples, ...moreEx].filter(s => okL('en', s)))].slice(0, 5);
    const ph = phrasesOf.get(e), phSet = new Set(ph.map(x => x.word.toLowerCase()));
    const col = dx.col.filter(c => okL('en', c) && !phSet.has(c.toLowerCase())), pats = dx.patterns.filter(x => okL('en', x.h));
    const syn = dx.syn.filter(x => x.toLowerCase() !== k), ant = dx.ant.filter(x => x.toLowerCase() !== k), fam0 = dx.fam.filter(x => x.toLowerCase() !== k);
    const conf = dx.confus.filter(c => c.items.length > 1), mis = dx.mistakes.filter(x => x.w && x.r);
    // Ghi chú tự soạn (web/js/notes, soạn cho người Việt): cặp "Sai: … → Đúng: …" là câu tiếng Anh → dùng được mọi ngôn ngữ (không kèm giải thích tiếng Việt);
    // trang vi đã hiện nguyên ghi chú nên không lặp. Họ từ "x (n), y (adj)" → chip có từ loại + link (mọi ngôn ngữ).
    const nt = notes[k] || {};
    if (l !== 'vi') for (const [, a, b] of String(nt.e || '').matchAll(/Sai:\s*(.+?)\s*→\s*Đúng:\s*(.+?)(?=\s*\(|\.\s|\.$|;|$)/g)) if (mis.length < 4 && okL('en', a + b) && !mis.some(x => x.w === a)) mis.push({ w: a.trim(), r: b.trim(), why: '' });
    const famN = String(nt.f || '').split(/,\s*/).map(x => x.match(/^([A-Za-z][A-Za-z' -]*?)\s*\((\w+)\.?\)$/)).filter(x => x && x[1].toLowerCase() !== k).map(x => [x[1], P[gpos(x[2])] || '']);
    const wnS = dx.wnS.slice(0, 3);
    // FAQ: câu hỏi cố định (dịch tay), trả lời = đúng chữ đang hiện trên trang
    const faq = [[fill(t.fqM, { w }), senses.map(s => (senses.length > 1 ? s.pos + ': ' : '') + (s.m || s.def)).join(' · ')]];
    if (e.ipa) faq.push([fill(t.fqP, { w }), `${t.uk} ${e.ipa}${ipaUS ? ` · ${t.us} ${ipaUS}` : ''}`]);
    if (syn.length) faq.push([fill(t.fqS, { w }), syn.join(', ')]);
    const c0 = conf.find(c => okL(l, c.tip)); if (c0) faq.push([fill(t.fqD, { a: c0.items[0].h.split(/\s*\(/)[0], b: c0.items[1].h.split(/\s*\(/)[0] }), c0.tip]);
    const fam = [...famN, ...fam0.filter(x => !famN.some(([y]) => y.toLowerCase() === x.toLowerCase())).map(x => [x, ''])].slice(0, 10);
    const ts = toolStrings(l), lvU = String(e.level || '').toUpperCase();
    const tools = ts ? [ts.levels && ts.levels[lvU] && [toolPath(l, 'test', lvU), fill(ts.level.h1, { lv: lvU, name: ts.levels[lvU].name })], [toolPath(l, 'test'), ts.nav.levelTest], [toolPath(l, 'toeic'), ts.nav.toeic]].filter(Boolean) : [];
    const body = `<article class="page wd">
<header class="hero"><h1>${en(W)}</h1>${vimgOf(e, `${w} – ${m}`, t.ph)}<div class="sub">${pos ? `<span class="chip">${esc(pos)}</span>` : ''}${e.level ? `<span class="chip">${esc(t.level)} ${esc(e.level)}</span>` : ''}${tp && l === 'vi' ? `<span class="chip">${esc(tp.name || tp.id)}</span>` : ''}</div></header>
${sec('m', 'mean', senses.length > 1 ? t.means : t.mean, meanHtml)}
${sec('p', 'pron', t.pron, `<p class="pr"><span>${esc(t.uk)} <span class="ipa" dir="ltr">${esc(e.ipa || '')}</span></span>${ipaUS ? `<span>${esc(t.us)} <span class="ipa" dir="ltr">${esc(ipaUS)}</span></span>` : ''}${au ? `<button type="button" class="au" data-a="${esc(au)}" aria-label="${esc(t.pron)}: ${esc(w)}"></button>` : ''}</p>`)}
${sec('e', 'ex', exs.length > 1 ? t.exs : t.ex, exs.map(s => `<blockquote lang="en" dir="ltr">${hiW(s, k)}</blockquote>`).join(''))}
${col.length || pats.length ? sec('c', 'col', t.col, `${col.length ? `<p class="chips">${col.map(x => `<span lang="en" dir="ltr">${esc(x)}</span>`).join('')}</p>` : ''}${pats.length ? `<h3>${esc(t.pat)}</h3><ul class="pat">${pats.map(x => `<li><b lang="en" dir="ltr">${esc(x.h)}</b>${okL(l, x.m) ? ` – ${tx(l, x.m)}` : ''}${x.ex ? `<br><i lang="en" dir="ltr">${esc(x.ex)}</i>` : ''}</li>`).join('')}</ul>` : ''}`) : ''}
${ph.length ? sec('f', 'phr', fill(t.phr, { w }), `<ul>${ph.map(x => `<li>${link(x.word)} – ${esc(l === 'vi' ? x.vi || x.def : l === 'en' ? x.def : (gloss(l, x) || [x.def])[0])}</li>`).join('')}</ul>`) : ''}
${syn.length || ant.length ? sec('s', 'syn', syn.length && ant.length ? t.synAnt : syn.length ? t.syn : t.ant, `${syn.length ? `<p class="chips">${syn.map(link).join('')}</p>` : ''}${syn.length && ant.length ? `<p><b>${esc(t.ant)}:</b></p>` : ''}${ant.length ? `<p class="chips">${ant.map(link).join('')}</p>` : ''}`) : ''}
${fam.length ? sec('w', 'fam', t.nf, `<p class="chips">${fam.map(([x, ps]) => `${link(x).replace(/<\/(a|span)>$/, ps ? ` <small lang="${l}"${RTL.has(l) ? ' dir="rtl"' : ''}>${esc(ps)}</small></$1>` : '</$1>')}`).join('')}</p>`) : ''}
${conf.length ? sec('k', 'conf', t.conf, conf.map(c => `<div class="cf"><ul>${c.items.map(x => { const [hw, ...rest] = x.h.split(/(?=\s*\()/); return `<li><b>${link(hw.trim())}</b>${rest.length ? esc(rest.join('')) : ''}${okL(l, x.m) ? ` – ${tx(l, x.m)}` : ''}${x.ex ? `<br><i lang="en" dir="ltr">${esc(x.ex)}</i>` : ''}</li>`; }).join('')}</ul>${okL(l, c.tip) ? `<p class="note"><b>${esc(t.tip)}:</b> ${tx(l, c.tip)}</p>` : ''}</div>`).join('')) : ''}
${mis.length ? sec('x', 'mis', t.mis, `<ul class="mis">${mis.map(x => `<li><span class="no" lang="en" dir="ltr">✗ ${esc(x.w)}</span> → <b lang="en" dir="ltr">✓ ${esc(x.r)}</b>${okL(l, x.why) ? `<br>${tx(l, x.why)}` : ''}</li>`).join('')}</ul>`) : ''}
${n ? sec('n', 'notes', t.notes, [['m', t.nm], ['e', t.ne], ['u', t.nu], ['f', t.nf]].filter(([q]) => n[q] && !(q === 'f' && famN.length)).map(([q, lb]) => `<p class="note"><b>${esc(lb)}:</b> ${esc(n[q])}</p>`).join('')) : ''}
${wnS.length ? sec('o', 'wn', t.wn, `<ol lang="en" dir="ltr">${wnS.map(x => `<li>${esc(x.g)}${x.x ? `<br><i>“${esc(x.x)}”</i>` : ''}</li>`).join('')}</ol><p class="mt">${esc(t.wnSrc)}: <a href="https://en-word.net/" rel="noopener">Open English WordNet</a> (<a href="https://creativecommons.org/licenses/by/4.0/" rel="license noopener">CC BY 4.0</a>)</p>`) : ''}
${faq.length >= 2 ? sec('q', 'faq', t.fq, faq.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')) : ''}
${cta(fill(t.ctaW, { w }), t.ctaWn, appLink(l, 'dict/' + encodeURIComponent(w)), t.ctaB)}
${tools.length ? sec('t', '', t.tools, `<ul>${tools.map(([h, x]) => `<li><a href="${h}">${esc(x)}</a></li>`).join('')}</ul>`) : ''}
${dx.blogs.length ? sec('b', '', t.blog, `<ul>${dx.blogs.map(b => `<li><a href="${b.href}">${esc(b.t)}</a></li>`).join('')}</ul>`) : ''}
${near.length ? sec('r', '', t.rel, `<p class="chips">${near.map(x => `<a href="${wPath(l, x)}" lang="en" dir="ltr">${esc(x.word)}</a>`).join('')}</p>`) : ''}
<nav class="pager" aria-label="${esc(t.words)}">${list[i - 1] ? `<a href="${wPath(l, list[i - 1])}" rel="prev" lang="en" dir="ltr">← ${esc(list[i - 1].word)}</a>` : '<span></span>'}${list[i + 1] ? `<a href="${wPath(l, list[i + 1])}" rel="next" lang="en" dir="ltr">${esc(list[i + 1].word)} →</a>` : ''}</nav>
</article>`.replace(/\n{2,}/g, '\n');
    const r = { body, faq: faq.length >= 2 ? faq : null, m }; c.set(e, r); return r;
}
// Trang sẽ index được (không noindex) – điều kiện y hệt build-seo-pages: trong idxW gốc + đạt độ dày. Dùng trước khi liên kết từ nơi khác.
export const indexable = (l, e) => !!(idxW[l] && idxW[l].has(e)) && deep(measure(bodyOf(l, e).body));
