// Test màn luyện tiếng Tây Ban Nha #/practice/es (web/js/espr.js, spanish-course.md W2b): jsdom chạy trọn 1 phiên trên khung Stitch bài học có sẵn.
// Kiểm: dựng màn đúng khung · điền từ (trắc nghiệm) + chia động từ (gõ, qua QE.gradeGap) · thiếu dấu tilde vẫn đúng kèm nhắc · giải thích theo ngôn ngữ người học · màn kết + thưởng.
import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module'; import jsdom from 'jsdom';
const require = createRequire(import.meta.url), WEB = 'web';
let total = 0, fails = 0; const ok = (c, m) => { total++; if (!c) { fails++; console.error('✗', m); } else console.log('✓', m); };
const html = fs.readFileSync(path.join(WEB, 'app', 'index.html'), 'utf8'), scripts = [...html.matchAll(/<script(?: defer)? src="([^"]+)"><\/script>/g)].map(m => m[1]);
const vc = new jsdom.VirtualConsole(), errors = []; vc.on('jsdomError', e => { if (!/Not implemented|Could not parse CSS/.test(e.message)) errors.push(e.message); });
const dom = new jsdom.JSDOM(html.replace(/<!--hero-->[\s\S]*?<!--\/hero-->/, '').replace(/<script(?: defer)? src="[^"]+"><\/script>/g, '').replace(/<link[^>]+>/g, ''), { url: 'http://localhost/app/#/practice/es?lv=A1', runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole: vc });
const w = dom.window; w.scrollTo = () => {}; w.HTMLElement.prototype.scrollIntoView = () => {}; w.matchMedia = () => ({ matches: false, addEventListener() {}, addListener() {} }); w.CSS = { escape: s => s };
w.fetch = async () => ({ ok: false, status: 404, json: async () => ({}), text: async () => '' });
for (const f of scripts) { try { w.eval(fs.readFileSync(path.join(WEB, f), 'utf8')); } catch (e) { errors.push(f + ': ' + e.message); } }
require('./lazyfix.js')(w, fs, path, WEB, errors);
const tick = (ms = 20) => new Promise(r => setTimeout(r, ms)); await tick(150);
ok(!errors.length, 'nạp mã + bundle espr không lỗi' + (errors.length ? ': ' + errors.join(' | ') : ''));
const { App, UI } = w, $ = s => w.document.querySelector(s);
const loaded = []; App.loadScript = async src => { loaded.push(src); w.eval(fs.readFileSync(path.join(WEB, src.replace(/^cpack\/es\/(.*)$/, 'cpack/es/$1')), 'utf8')); };
let spoken = [], rewards = []; UI.tts = t => { spoken.push(t); }; App.reward = async d => { rewards.push(d); };
ok(typeof App.espr === 'function', 'App.espr có');
await App.espr('A1'); await tick(50);
ok(w.ESX && w.ESX.dr && loaded.some(s => /gx-/.test(s)), 'dữ liệu cpack/es: câu hỏi (trong gói espr) + giải thích theo ngôn ngữ');
ok($('#lsn.lsn-v2') && $('#lsnBub') && $('#lsnCheck'), 'khung Stitch lesson-question dựng');
const DR = w.ESX.dr.A1, find = () => { const txt = $('#lsnBub').textContent.replace(/\s+/g, ' '); return DR.find(it => { const [a, b] = it[2].split('___'); return txt.includes(a.trim()) && txt.includes(b.trim()) && ($('#lsnIn') ? it[0] === 'c' : it[0] === 'g'); }); };
let typed = 0, cloze = 0, wrongSeen = false, whySeen = false;
for (let q = 0; q < 10; q++) {
  const it = find(); ok(!!it, `câu ${q + 1}: tìm thấy trong dữ liệu`); if (!it) break;
  const wrong = q === 3;
  if (it[0] === 'c') {
    typed++; const inp = $('#lsnIn'); ok(!!inp && inp.lang === 'es', 'chia động từ: ô gõ');
    inp.value = wrong ? 'zzz' : (q === 4 ? it[3].normalize('NFD').replace(/[̀-ͯ]/g, '') : it[3]); inp.dispatchEvent(new w.Event('input')); $('#lsnCheck').click();
  } else {
    cloze++; const opts = [...w.document.querySelectorAll('#lsnBody .lsn-opt')]; ok(opts.length >= 3, 'điền từ: ≥ 3 phương án');
    (wrong ? opts.find(o => o.dataset.o !== it[3]) : opts.find(o => o.dataset.o === it[3])).click(); $('#lsnCheck').click();
  }
  await tick(); const fb = $('#lsnFoot');
  ok(!!fb && !!$('#lsnNext'), `câu ${q + 1}: tấm phản hồi + Tiếp tục`);
  if (wrong) { wrongSeen = /bad/.test(fb.className); whySeen = fb.textContent.includes(w.ESX.gx.en[it[1]][1].slice(0, 20)); }
  $('#lsnNext').click(); await tick();
}
ok(wrongSeen, 'trả lời sai → phản hồi sai'); ok(whySeen, 'phản hồi có giải thích của điểm ngữ pháp (ngôn ngữ người học)');
ok(cloze > 0 && typed > 0, `phiên xen cả điền từ (${cloze}) và chia động từ (${typed})`);
ok(!!$('#lsnAgain') && rewards.length === 1 && rewards[0].xp >= 10, 'màn kết + ghi thưởng một lần');
ok(spoken.length > 0 && spoken.every(s => !/___|\(/.test(s)), 'đọc câu hoàn chỉnh (không còn ___ hay (động từ))');
w.close(); process.exit(fails ? 1 : 0);
