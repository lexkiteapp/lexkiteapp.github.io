// ➡️ Bước tiếp theo cuối bài đọc / phần nghe (web/js/next-step.js): không ngõ cụt.
// Kiểm: mỗi bài đọc (57) + mỗi phần nghe IELTS/TOEIC có nút "phần kế tiếp" trỏ tới id CÓ THẬT (trừ phần cuối cùng của bộ) + 2 kỹ năng khác;
// reading.js / listening.js gọi NextStep.render sau khi chấm; gói 'nxs' tải lười (không vào khung app); i18n nhóm nextstep.
// Chạy: node scripts/test/next-step.mjs
import fs from 'node:fs';
import vm from 'node:vm';
const J = f => fs.readFileSync('web/js/' + f, 'utf8');
let n = 0, fails = 0; const ok = (c, m) => { n++; if (!c) { fails++; console.log('✗', m); } };
const g = { UI: { esc: s => String(s).replace(/[&<>"]/g, c => '&#' + c.charCodeAt(0) + ';') }, t: (k, v = {}) => k.replace(/\{(\w+)\}/g, (_, x) => v[x]) };
g.self = g; g.window = g; vm.createContext(g);
for (const f of ['readings.js', 'readings-more.js', ...[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(k => `listen/test${k}.js`), 'next-step.js']) vm.runInContext(J(f), g, { filename: f });
for (const f of fs.readdirSync('web/js/toeic').filter(f => /^listening\d+\.js$/.test(f))) vm.runInContext(J('toeic/' + f), g, { filename: f });
const NS = g.NextStep, R = g.READINGS, L = g.LISTENING, T = (g.TOEIC || {}).listening || [];
ok(NS && R.length >= 30 && L.length >= 40, `nạp next-step.js + dữ liệu (${R.length} bài đọc, ${L.length} phần nghe IELTS, ${T.length} TOEIC)`);
const rid = new Set(R.map(x => x.id)), lid = new Set([...L, ...T].map(x => x.id));
const bad = [];
for (const r of R) { const ls = NS.links('read', r.id), nx = ls.find(x => x.pri); if (!nx || !rid.has(decodeURIComponent(nx.h.replace('#/read/', ''))) || ls.length < 3) bad.push('read:' + r.id); }
for (const [arr, nm] of [[L, 'ielts'], [T, 'toeic']]) arr.forEach((p, i) => { const ls = NS.links('listen', p.id), nx = ls.find(x => x.pri);
  if (ls.length < 2 || (i < arr.length - 1 ? !nx || decodeURIComponent(nx.h.replace('#/listen/', '')) !== arr[i + 1].id : !!nx) || (nx && !lid.has(arr[i + 1].id))) bad.push(nm + ':' + p.id); });
ok(!bad.length, 'mọi bài đọc / phần nghe có bước tiếp theo hợp lệ' + (bad.length ? ' – ' + bad.slice(0, 5).join(', ') : ''));
ok(NS.links('read', R[R.length - 1].id).find(x => x.pri).h === '#/read/' + encodeURIComponent(R[0].id), 'bài đọc cuối → quay về bài đầu (không ngõ cụt)');
// render: chèn 1 lần, escape tên bài
const el = { html: '', querySelector: () => (el.html ? {} : null), insertAdjacentHTML(_, h) { el.html += h; } };
NS.render(el, 'read', R[0].id); NS.render(el, 'read', R[0].id);
ok((el.html.match(/class="nx-step"/g) || []).length === 1 && /aria-label=/.test(el.html) && !/<script/i.test(el.html), 'render: 1 khối, có aria-label, không chèn HTML thô');
const rd = J('reading.js'), li = J('listening.js'), app = J('app.js');
ok(/App\.lazy\('nxs'\)\.then\(\(\) => NextStep\.render\(\$\('#qResult \.feedback'\), 'read'/.test(rd), 'reading.js gọi NextStep sau khi chấm');
ok(/App\.lazy\('nxs'\)\.then\(\(\) => NextStep\.render\(\$\('#lRes \.feedback'\), 'listen'/.test(li), 'listening.js gọi NextStep sau khi chấm');
ok(/nxs: \['js\/i18n\/en\/nextstep\.js', 'js\/next-step\.js'\]/.test(app) && !/next-step\.js/.test(fs.readFileSync('web/sw.js', 'utf8').match(/const SHELL = \[([\s\S]*?)\];/)[1]), "gói lười 'nxs' (không nằm trong khung app)");
ok(/LAZY="[^"]*\bnextstep\b/.test(fs.readFileSync('scripts/build-i18n.sh', 'utf8')) && ['es', 'ja', 'ar', 'hi'].every(l => fs.existsSync(`web/js/i18n/${l}/nextstep.js`)), 'i18n: nhóm nextstep có file cho từng ngôn ngữ');
console.log(fails ? `✗ next-step: ${fails}/${n} lỗi` : `✓ next-step: ${n} kiểm tra`); process.exit(fails ? 1 : 0);
