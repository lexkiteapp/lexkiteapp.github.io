// Phễu lần đầu + hỏi nhắc mềm sau màn kết BÀI HỌC (docs/specs/retention-1211.md §22/11).
// 22/11: cờ ux1 bật 100 % → đường học chính là lesson engine (#/lesson) nhưng nó không phát 'lexkite:practice-done' (23/11: nay phát 'lexkite:lesson-done'),
// nên remind.js không bao giờ hỏi bật nhắc sau bài đầu (chỉ ôn thẻ .rev-done mới hỏi). Test khóa: màn kết bài học → first_win + hỏi mềm,
// máy cũ không tính first_win, quay lại đúng ngày +1/+7 → fw_d1/fw_d7 một lần, công tắc khẩn rem_lsn = '0', bài thử ?demo= không tính.
// Chạy: node scripts/test/retention-funnel.mjs
import fs from 'node:fs'; import vm from 'node:vm';
import { JSDOM } from 'jsdom';
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('✗', m); } };
const rd = f => fs.readFileSync(new URL('../../' + f, import.meta.url), 'utf8');

// 1) Máy chủ nhận đúng các sự kiện máy khách gửi (hit.js ONB_EV ⊂ HAB_EV)
const hit = rd('functions/api/hit.js'), m = /const ONB_EV = (\[.*\]);/.exec(hit);
const ONB = m ? vm.runInNewContext(m[1]) : [];
ok(/const HAB_EV = \[[^\]]*\.\.\.ONB_EV\]/.test(hit), 'HAB_EV gồm ONB_EV');
const used = new Set();
for (const f of ['web/js/welcome.js', 'web/js/onboard.js', 'web/js/remind.js']) for (const x of rd(f).matchAll(/hab(?:Track)?\('([a-z0-9_]+)'\)/g)) used.add(x[1]);
for (const e of used) if (!['plan_seen', 'plan_start', 'plan_done', 'resume_seen', 'resume_click'].includes(e)) ok(ONB.includes(e), `sự kiện ${e} có trong ONB_EV`);
ok(/'onb_s_' \+ STEPS\[n\]/.test(rd('web/js/onboard.js')) && ['lang', 'goal', 'level', 'target', 'pace', 'ready'].every(k => ONB.includes('onb_s_' + k)), 'mọi bước thiết lập có sự kiện');
ok(/setTimeout\(\(\) => document\.visibilityState === 'visible' && on\(\), 5e3\)/.test(rd('web/js/welcome.js')) && /'pointerdown', 'keydown', 'scroll'/.test(rd('web/js/welcome.js')), 'onb_welcome chỉ đếm khi có tương tác hoặc hiện ≥ 5 s');
ok(['onb_welcome', 'onb_done', 'first_win', 'fw_d1', 'fw_d7'].every(e => ONB.includes(e)), 'đủ mốc phễu');
ok(rd('functions/api/config.js').includes("'rem_lsn'") && rd('functions/api/admin.js').includes("'rem_lsn'"), 'rem_lsn có trong PUBLIC_KEYS + CONFIG_KEYS');

// 2) remind.js trong DOM giả
const pad = n => String(n).padStart(2, '0'), key = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const dayAgo = n => { const d = new Date(); d.setDate(d.getDate() - n); return key(d); };
async function boot({ hash = '#/lesson', cfg = null, store = {}, gameDays = {}, start = false } = {}) {
  const dom = new JSDOM('<!doctype html><div id="view"></div><div id="modal" hidden></div>', { url: 'https://lexkite.com/app/' + hash, runScripts: 'outside-only' });
  const w = dom.window, sent = [];
  for (const [k, v] of Object.entries(store)) w.localStorage.setItem(k, JSON.stringify(v)); // như ls.set của remind.js
  if (cfg) w.localStorage.setItem('lk.cfg', JSON.stringify({ v: cfg }));
  const view = w.document.getElementById('view');
  w.Core = { Store: { isExtension: false }, Cards: {}, todayKey: () => key(new Date()) };
  w.App = { state: { settings: {}, stats: { days: {} }, game: { days: gameDays }, cards: {} }, view, habTrack: e => sent.push(e) };
  w.UI = { icon: () => '', toast: () => {}, modal: () => w.document.createElement('div') }; // jsdom không có Notification → canAsk = false, không hiện hộp
  w.eval(rd('web/js/remind.js'));
  if (start) w.Remind.start();
  return { w, view, sent };
}
const tick = () => new Promise(r => setTimeout(r, 30));

const done = w => w.dispatchEvent(new w.CustomEvent('lexkite:lesson-done', { detail: { acc: 90 } }));
{ // máy mới: lesson engine phát lexkite:lesson-done khi xong bài
  const { w, sent } = await boot();
  done(w); await tick();
  ok(sent.includes('first_win'), 'lesson-done → first_win – ' + sent);
  ok(/^\d{4}-\d\d-\d\d$/.test(JSON.parse(w.localStorage.getItem('lk.fw'))), 'lk.fw = ngày bài đầu');
  done(w); await tick();
  ok(sent.filter(e => e === 'first_win').length === 1, 'first_win chỉ 1 lần');
  w.close();
}
{ // màn kết ôn thẻ .rev-done vẫn tính (đường cũ)
  const { w, view, sent } = await boot(); w.App.state.stats.days[w.Core.todayKey()] = 3;
  view.innerHTML = '<div class="rev-done"></div>'; await tick();
  ok(sent.includes('first_win'), 'màn kết ôn thẻ → first_win');
  w.close();
}
{ // máy đã học từ trước bản này: không tính first_win
  const { w, sent } = await boot({ gameDays: { [dayAgo(3)]: { xp: 20 } } });
  done(w); await tick();
  ok(!sent.includes('first_win') && JSON.parse(w.localStorage.getItem('lk.fw')) === 'old', 'máy cũ → lk.fw = old, không first_win');
  w.close();
}
// Nguồn sự kiện + người nghe: lesson/ui.js phát (bỏ bài thử, công tắc khẩn rem_lsn), remind/install-sheet/retention nghe; KHÔNG phát practice-done (quảng cáo toàn màn/lớp học không đọc nhầm)
{ const u = rd('web/js/lesson/ui.js');
  ok(/if \(!L\.demo && !\/"rem_lsn":"0"\/\.test\(ls\.get\('lk\.cfg'\) \|\| ''\)\) setTimeout\(\(\) => dispatchEvent\(new CustomEvent\('lexkite:lesson-done'/.test(u), 'lesson/ui.js phát lesson-done (bỏ bài thử, công tắc rem_lsn)');
  ok(!/lexkite:practice-done/.test(u), 'lesson/ui.js không phát practice-done');
  for (const f of ['web/js/remind.js', 'web/js/install-sheet.js', 'web/js/retention.js']) ok(/'lesson-done'/.test(rd(f)), f + ' nghe lesson-done');
  ok(!/'lesson-done'/.test(rd('web/js/ads/run.js')) && !/'lesson-done'/.test(rd('web/js/classroom.js')), 'quảng cáo/lớp học không nghe lesson-done'); }
{ // quay lại sau bài đầu
  const a = await boot({ store: { 'lk.fw': dayAgo(1) }, start: true }); await tick();
  ok(a.sent.includes('fw_d1') && !a.sent.includes('fw_d7'), 'mở lại ngày +1 → fw_d1 – ' + a.sent);
  a.w.close();
  const b = await boot({ store: { 'lk.fw': dayAgo(1), 'lk.fw1': 1 }, start: true }); await tick();
  ok(!b.sent.includes('fw_d1'), 'fw_d1 chỉ 1 lần'); b.w.close();
  const c = await boot({ store: { 'lk.fw': dayAgo(7) }, start: true }); await tick();
  ok(c.sent.includes('fw_d7') && !c.sent.includes('fw_d1'), 'ngày +7 → fw_d7'); c.w.close();
  const d = await boot({ store: { 'lk.fw': dayAgo(2) }, start: true }); await tick();
  ok(!d.sent.some(e => /^fw_/.test(e)), 'ngày +2 → không gửi'); d.w.close();
  const e = await boot({ store: { 'lk.fw': 'old' }, start: true }); await tick();
  ok(!e.sent.some(x => /^fw_/.test(x)), 'máy cũ → không gửi'); e.w.close();
}
console.log(fails ? `✗ retention-funnel: ${fails} lỗi` : '✓ retention-funnel');
process.exit(fails ? 1 : 0);
