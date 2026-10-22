// Lời giải đáp án (docs/EXPLAIN.md): (1) vẽ thẻ web/js/explain-card.js  (2) dữ liệu content/explain/*.json ↔ ngân hàng câu hỏi ↔ web/js/explain/**
// Chạy: node scripts/test/explain.mjs
import fs from 'node:fs';
import jsdom from 'jsdom';
import { items, SETS, LANGS } from '../explain/sets.mjs';
import { execFileSync } from 'node:child_process';
let fails = 0, n = 0; const ok = (c, m) => { n++; if (!c) { fails++; console.log('✗', m); } };
const U = p => new URL('../../' + p, import.meta.url);

// ---------- 1) Vẽ ----------
const dom = new jsdom.JSDOM('<!doctype html><html dir="rtl"><head></head><body><div id="r"></div></body></html>', { runScripts: 'outside-only', url: 'http://localhost/app/' });
const w = dom.window; w.t = s => s; w.I18N = { lang: () => 'vi', learnLang: () => 'vi' };
w.eval(fs.readFileSync(U('web/js/explain-card.js'), 'utf8'));
const X = w.ExplainCard, r = w.document.getElementById('r');
const row = ['be engaged [in] + N / V-ing', 'Cụm cố định: *engaged in* = đang tham gia, bận làm việc gì.', '*apologize for / thank for* = lý do', { with: '*engaged with* = tương tác với ai/cái gì – nghĩa khác.', for: 'Không có *engaged for* với nghĩa này.' }, ['She is engaged in research.', 'They were engaged in talks.']];
const x = X.pick(row);
ok(x.p && x.why && x.wrong.with && x.ex.length === 2 && !x.en, 'pick: đọc dòng mảng');
ok(X.pick(null) === null && X.pick([...row, 1]).en === true, 'pick: rỗng / cờ tiếng Anh');
r.innerHTML = X.html({ ...x, fam: [{ w: 'involved in', href: '#/usage/involved' }] }, { ok: true, chosen: 'in', id: 'p|engaged|in' });
const card = r.querySelector('.xc');
ok(card && card.dataset.xid === 'p|engaged|in', 'thẻ có id');
ok(r.querySelector('.xc-p mark').textContent === 'in' && r.querySelector('.xc-p code').getAttribute('translate') === 'no', 'mẫu: tô sáng đáp án, không dịch');
ok(r.querySelector('.xc-why .xc-k[lang=en]').textContent === 'engaged in', 'vì sao: *tiếng Anh* giữ nguyên');
const det = r.querySelector('details.xc-more');
ok(det && !det.open && det.querySelector('summary').textContent === 'Xem giải thích chi tiết', 'đúng: chi tiết thu gọn');
ok(!r.querySelector('.xc-bad'), 'đúng: không có dòng "vì sao sai"');
ok(r.querySelectorAll('.xc-ex li').length === 2 && r.querySelectorAll('.xc-ex [data-xsay]').length === 2, 'ví dụ có nút nghe');
ok([...r.querySelectorAll('.xc-ex button')].every(b => b.getAttribute('aria-label')), 'a11y: nút nghe có nhãn');
ok(r.querySelector('.xc-fam a.chip[href="#/usage/involved"]'), 'cùng nhóm: chip mở thẻ');
ok(r.querySelector('[data-xrev]') && r.querySelector('[data-xrep][aria-label]'), 'nút ôn tập + báo lỗi');
r.innerHTML = X.html(x, { ok: false, chosen: 'with', id: 'p|engaged|in' });
ok(r.querySelector('details.xc-more').open && /tương tác/.test(r.querySelector('.xc-bad').textContent) && r.querySelector('.xc-bad b').textContent === 'with', 'sai: mở chi tiết, ghi chú đúng phương án đã chọn');
r.innerHTML = X.html(x, { ok: false, chosen: 'at', id: 'q' });
ok(!r.querySelector('.xc-bad'), 'sai nhưng thiếu ghi chú → không bịa dòng');
r.innerHTML = X.html({ p: '<img src=x onerror=alert(1)> [in]', why: '<script>x</script>' }, {});
ok(!r.querySelector('img,script') && r.querySelector('.xc-p mark'), 'thoát HTML (XSS)');
ok(X.html({}, {}) === '' && X.html(null) === '', 'không dữ liệu → rỗng');
r.innerHTML = X.html({ p: 'stop [V-ing]' }, { whyHtml: '<span class="m">nghĩa</span>' });
ok(r.querySelector('.xc-why .m'), 'dự phòng: dòng nghĩa cũ');
r.innerHTML = X.html({ why: 'w', en: true, ev: { text: 'The dam was built in 1990.', hl: 'in 1990' }, tr: { text: 'See you at six.', at: 75 } }, {});
ok(r.querySelector('.xc-why[lang=en]') && r.querySelector('.xc-row mark').textContent === 'in 1990' && r.querySelector('[data-xat="75"]').textContent === '1:15', 'đọc/nghe: bằng chứng + mốc thời gian; cờ en');
// sự kiện
let said = '', rev = '', rep = '';
r.innerHTML = X.html(x, { ok: true, id: 'p|engaged|in' });
X.bind(r, { speak: s => (said = s), review: id => (rev = id), report: id => (rep = id) });
r.querySelector('[data-xsay]').click(); r.querySelector('[data-xrev]').click(); r.querySelector('[data-xrep]').click();
ok(said === 'She is engaged in research.' && rev === 'p|engaged|in' && rep === 'p|engaged|in', 'bind: nghe / ôn tập / báo lỗi');
const css = w.document.getElementById('xc-css').textContent;
ok(!/margin-left|margin-right|padding-left|padding-right|border-left|border-right/.test(css), 'RTL: CSS dùng thuộc tính logic');
ok(/min-height:44px/.test(css), 'a11y: vùng chạm tóm tắt ≥ 44px');

// ---------- 2) Dữ liệu ----------
const isWeb = (sub, l) => fs.existsSync(U(`web/js/explain/${sub}/${l}.json`));
for (const set of Object.keys(SETS)) {
  const all = items(set), ids = new Set(all.map(i => i.id));
  ok(ids.size === all.length && all.length > 0, `${set}: id câu hỏi duy nhất, không rỗng`);
  ok(all.every(i => i.alts.length >= 1 && !i.alts.includes(i.ans)), `${set}: phương án nhiễu hợp lệ`);
  const F = U(`content/explain/${set}.json`); if (!fs.existsSync(F)) continue;
  const DB = JSON.parse(fs.readFileSync(F, 'utf8'));
  for (const it of all) {
    const d = DB[it.id]; if (!d || !(d.sc && d.sc.en >= 4)) continue;
    const bad = m => ok(false, `${set} ${it.id}: ${m}`);
    if (!d.p || !d.p.includes('[')) bad('thiếu mẫu [đáp án]');
    for (const l of ['en', ...LANGS]) { const v = d[l]; if (!v) continue; if (!v.why) bad(l + ' thiếu why'); const ks = Object.keys(v.wrong || {}).sort().join('|'); if (ks !== [...it.alts].sort().join('|')) bad(`${l} ghi chú sai ≠ phương án (${ks})`); }
  }
  // tệp web: mọi mục có mẫu + vì sao, ghi chú khớp phương án, không lọt mục điểm thấp
  const subs = [...new Set(all.map(i => i.sub))];
  for (const sub of subs) for (const l of ['en', ...LANGS]) {
    if (!isWeb(sub, l)) continue;
    const M = JSON.parse(fs.readFileSync(U(`web/js/explain/${sub}/${l}.json`), 'utf8'));
    for (const [id, r] of Object.entries(M)) {
      const it = all.find(i => i.id === id), d = DB[id];
      if (!it) { ok(false, `${sub}/${l}: ${id} không còn trong ngân hàng`); continue; }
      if (!r[0] || !r[1]) ok(false, `${sub}/${l}: ${id} thiếu mẫu/vì sao`);
      if (Object.keys(r[3] || {}).sort().join('|') !== [...it.alts].sort().join('|')) ok(false, `${sub}/${l}: ${id} ghi chú sai ≠ phương án`);
      if (!d || !(d.sc.en >= 4) || (l !== 'en' && !r[5] && !(d.sc[l] >= 4))) ok(false, `${sub}/${l}: ${id} chưa đạt duyệt mà vẫn xuất`);
    }
    n++;
  }
}
try { execFileSync('node', [new URL('../explain/build.mjs', import.meta.url).pathname, '--check'], { stdio: 'pipe' }); ok(true); } catch (e) { ok(false, 'web/js/explain lệch nguồn – chạy node scripts/explain/build.mjs'); }
// id phía app (U.xid) = id phía dữ liệu
const usage = (await import('../explain/sets.mjs')).usage(), q = usage.quiz(usage.list('p'), 5, 7)[0];
ok(items('usage').some(i => i.id === usage.xid(q)), 'usage: U.xid khớp sets.mjs');
console.log(fails ? `✗ explain: ${fails}/${n} lỗi` : `✓ explain: ${n} kiểm tra`);
process.exit(fails ? 1 : 0);
