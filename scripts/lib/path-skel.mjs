#!/usr/bin/env node
// Khung #/path vẽ NGAY lần vẽ đầu (docs: side-session-notes spec path-static-first-paint, LCP path 22/11): web/js/path-skel/<ngôn ngữ>.js = style tối thiểu + HTML các chặng
// (đúng DOM/class của DayPath.map, path-day.js) từ CHÍNH nguồn chuỗi sẵn có (path.js STAGES × i18n/ui/<l>.js + web/js/i18n/en*). Nạp bởi script nhỏ trong web/app/index.html
// chỉ khi mở thẳng #/path với người dùng mặc định IELTS; DayPath.map thay cả #view khi words+pathx về. Không thêm chuỗi dịch mới.
// Thư viện: buildSkeletons() → { 'path-skel/<tên>.js': nội dung }. KHÔNG commit tệp sinh: scripts/app-loader.mjs ghi chúng vào dist/js/path-skel lúc dựng bản phát hành
// (ngoài web/js → không vào ngân sách byte người học). Dev (web/ không qua app-loader): thiếu tệp → onerror gỡ ẩn thân trang, trang chạy như cũ.
import fs from 'node:fs'; import vm from 'node:vm';
export const LANGS = ['vi', 'en', 'ar', 'de', 'es', 'fr', 'hi', 'id', 'ja', 'ko', 'pt', 'ru', 'th', 'tr', 'zh'], rd = f => fs.readFileSync(f, 'utf8');
const unq = s => s.replace(/\\(['\\])/g, '$1');
const ps = rd('web/js/path.js'), blk = ps.slice(ps.indexOf('const STAGES = ['), ps.indexOf('\n  ];', ps.indexOf('const STAGES = [')));
const RE = /id: '(\w+)', get name\(\) \{ return t\('((?:[^'\\]|\\.)*)'\); \}, band: '([^']*)', cefr: '([^']*)', color: '([^']*)', get desc\(\) \{ return t\('((?:[^'\\]|\\.)*)'\); \},\s*get cando\(\) \{ return t\('((?:[^'\\]|\\.)*)'\);/g;
export const STAGES = [...blk.matchAll(RE)].map(m => ({ id: m[1], name: unq(m[2]), band: m[3], cefr: m[4], color: m[5], desc: unq(m[6]), cando: unq(m[7]) }));
const pd = rd('web/js/path-day.js'), TITLE = 'Lộ trình chinh phục IELTS', MUTED = 'Đã xong {a}/{b} ngày · mỗi ngày 5–10 phút, dễ trước khó sau.';
if (STAGES.length !== 5 || !pd.includes(`t('${TITLE}')`) || !pd.includes(`t('${MUTED}'`)) { console.error(`✗ path-skel: nguồn đổi (chặng ${STAGES.length}/5 hoặc thiếu tiêu đề) – cập nhật scripts/build-path-skel.mjs`); process.exit(1); }
// chuỗi dịch: vi = khóa gốc; en = web/js/i18n/en.js + en/*.js; còn lại i18n/ui/<l>.js (như gói dịch của app)
const dictOf = l => { if (l === 'vi') return {}; const g = {}; g.I18N_DICT = {};
  const files = l === 'en' ? [...['web/js/i18n/en.js'], ...fs.readdirSync('web/js/i18n/en').filter(f => f.endsWith('.js')).map(f => `web/js/i18n/en/${f}`)] : [`i18n/ui/${l}.js`, ...(fs.existsSync(`i18n/ui/${l}`) ? fs.readdirSync(`i18n/ui/${l}`).filter(f => f.endsWith('.js')).sort().map(f => `i18n/ui/${l}/${f}`) : [])];
  for (const f of files) if (fs.existsSync(f)) vm.runInNewContext(rd(f), { window: g, self: g, globalThis: g, g }); return g.I18N_DICT[l] || {}; };
// CSS: đúng các luật .stage-* của lazy-ui.css + ẩn mũi tên <details> của path-day.js (cùng nguồn với trang thật)
const ruleOf = (css, sel) => { const out = []; let i = 0; while (i < css.length) { const o = css.indexOf('{', i); if (o < 0) break; let d = 1, j = o + 1; while (j < css.length && d) { d += css[j] === '{' ? 1 : css[j] === '}' ? -1 : 0; j++; }
  const head = css.slice(i, o).trim(); if (head.startsWith(sel + ' ') || head === sel || head.startsWith(sel + '{') || head.startsWith(sel + ',')) out.push(css.slice(i, j).trim()); i = j; } return out; };
const lazy = rd('web/css/lazy-ui.css'), CSS = ['.stage-banner', '.stage-count', '.stage-lv', '.stage-cando'].flatMap(s => ruleOf(lazy, s)).join('').replace(/\s+/g, ' ')
  + '.dp-stage>summary{list-style:none}.dp-stage>summary::-webkit-details-marker{display:none}';
const ARROW = '.dp-stage>summary{list-style:none}.dp-stage>summary::-webkit-details-marker{display:none}';
if (!pd.includes(ARROW)) { console.error('✗ path-skel: path-day.js đổi luật ẩn mũi tên details'); process.exit(1); }
if (!/\.stage-banner \{/.test(lazy) || !/\.stage-cando \{/.test(lazy)) { console.error('✗ path-skel: không thấy luật .stage-* trong lazy-ui.css'); process.exit(1); }
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const html = (l, D) => { const t = k => D[k] || k;
  const st = STAGES.map((s, i) => `<details class="dp-stage" data-st="${s.id}"${i === 0 ? ' open' : ''}><summary class="stage-banner" style="--sc:${s.color};cursor:pointer"><div><div class="tiny stage-lv">${s.cefr} · ${s.band}</div><h2 style="margin:.1rem 0;color:#fff">${esc(t(s.name))}</h2><div class="small" style="opacity:.92">${esc(t(s.desc))}</div><div class="small stage-cando">🎯 ${esc(t(s.cando))}</div><div class="stage-count">00/000</div></summary></details>`).join('');
  return `<div id="lkPath"><div class="page-head"><div><h1>${esc(t(TITLE))}</h1><p class="muted">${esc(t(MUTED).replace('{a}', '0').replace('{b}', '9999'))}</p></div><div class="row" style="width:88px"></div></div><div class="path">${st}</div></div>`; };
const file = l => `/* SINH TỰ ĐỘNG bởi scripts/build-path-skel.mjs – KHÔNG sửa tay. Khung #/path (${l}) vẽ ngay lần vẽ đầu; DayPath.map thay khi words+pathx về. */\n`
  + `(function(){function go(){var v=document.getElementById("view");if(!v||v.firstChild||!/^#\\/path(\\?|$)/.test(location.hash))return;var s=document.createElement("style");s.id="lkPathCss";s.textContent=${JSON.stringify(CSS)};document.head.appendChild(s);v.innerHTML=${JSON.stringify(html(l, dictOf(l)))};document.documentElement.classList.remove("lk-sk");requestAnimationFrame(function(){requestAnimationFrame(function(){window.__lkSkd=1;window.dispatchEvent(new Event("lk:skel"))})})}if(document.getElementById("view"))go();else{var mo=new MutationObserver(function(){if(document.getElementById("view")){mo.disconnect();go()}});mo.observe(document,{childList:true,subtree:true});document.addEventListener("DOMContentLoaded",go)}})();\n`;
// ---- #/dict/<từ> (người mới): đầu trang từ điển = CHÍNH mẫu Stitch st/v2/dict.js chạy lúc build với chuỗi đã dịch (dict-page.js dựng dữ liệu y hệt); CSS thật css/st-v2-dict.css nạp bằng <link> từ <head>.
const dictHtml = (l, D) => { const t = k => D[k] || k, g = {}; g.self = g; g.window = g; g.t = t; vm.runInNewContext(rd('web/js/st/v2/dict.js'), g);
  const vi = l === 'vi', o = g.ST2.dict({ title: vi ? t('Từ điển Anh – Việt') : t('Từ điển'), back: '#/vocab', backL: t('Quay lại'), langChip: vi ? 'EN ⇄ VI' : 'EN', langHref: '#/settings',
    sub: `<p class="px-4 pb-1 text-[13px] [text-wrap:pretty] [color:var(--muted)]">${esc(t('Định nghĩa Oxford Languages · phiên âm UK/US · câu song ngữ · collocation · từ liên quan'))}</p>`,
    ph: t('Nhập từ tiếng Anh, ví dụ: sustainable'), q: '@@Q@@', goL: t('Tra từ'), clearL: t('Xóa'), recClearL: t('Xóa'), recentL: t('Gần đây:').replace(/\s*[:：]\s*$/, ''), recentBlk: [], browseBlk: [], res: '<div id="result" class="mt-5 dict-res"></div>' });
  return `<div id="lkPath" class="v2s-dict"><div class="${o.root}">${o.header}${o.main}${o.nav || ''}</div></div>`; };
const dictFile = l => `/* SINH TỰ ĐỘNG bởi scripts/build-path-skel.mjs – KHÔNG sửa tay. Đầu trang #/dict/<từ> (${l}) vẽ ngay lần vẽ đầu; routes.dict thay khi app sẵn sàng. */\n`
  + `(function(){function go(){var v=document.getElementById("view"),m=location.hash.match(/^#\\/dict\\/([^/?]+)/);if(!v||v.firstChild||!m)return;var q=m[1];try{q=decodeURIComponent(q)}catch(e){}q=q.replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]});v.innerHTML=${JSON.stringify(dictHtml(l, dictOf(l)))}.replace("@@Q@@",q);document.documentElement.classList.remove("lk-sk")}if(document.getElementById("view"))go();else{var mo=new MutationObserver(function(){if(document.getElementById("view")){mo.disconnect();go()}});mo.observe(document,{childList:true,subtree:true});document.addEventListener("DOMContentLoaded",go)}})();\n`;
export const buildSkeletons = () => Object.fromEntries([...LANGS.map(l => [`${l}.js`, file(l)]), ...LANGS.map(l => [`dict-${l}.js`, dictFile(l)])]);
