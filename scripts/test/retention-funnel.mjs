// Phễu lần đầu + hỏi nhắc mềm sau màn kết BÀI HỌC (docs/specs/retention-1211.md §22/11).
// 22/11: cờ ux1 bật 100 % → đường học chính là lesson engine (#/lesson, màn kết .lsn-end) nhưng nó không phát 'lexkite:practice-done',
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

{ // máy mới: màn kết bài học kiểu mới (Stitch, root .lsn-end gắn thẳng vào #view)
  const { w, view, sent } = await boot();
  const root = w.document.createElement('div'); root.id = 'lsn'; root.className = 'lsn-v2 lsn-end st-end'; view.replaceChildren(root);
  await tick();
  ok(sent.includes('first_win'), 'màn kết bài học → first_win – ' + sent);
  ok(/^\d{4}-\d\d-\d\d$/.test(JSON.parse(w.localStorage.getItem('lk.fw'))), 'lk.fw = ngày bài đầu');
  view.replaceChildren(root.cloneNode()); await tick();
  ok(sent.filter(e => e === 'first_win').length === 1, 'first_win chỉ 1 lần');
  w.close();
}
{ // màn kết bài cũ: .lsn-end chèn vào #lsnBody bên trong #lsn (cần subtree)
  const { w, view, sent } = await boot();
  view.innerHTML = '<div id="lsn" class="lsn"><div id="lsnBody"></div></div>'; await tick();
  ok(!sent.includes('first_win'), 'đang làm bài: chưa tính');
  view.querySelector('#lsnBody').innerHTML = '<div class="lsn-end">xong</div>'; await tick();
  ok(sent.includes('first_win'), 'màn kết bài cũ (lồng trong #lsnBody) cũng tính');
  w.close();
}
{ // máy đã học từ trước bản này: không tính first_win
  const { w, view, sent } = await boot({ gameDays: { [dayAgo(3)]: { xp: 20 } } });
  view.innerHTML = '<div class="lsn-end"></div>'; await tick();
  ok(!sent.includes('first_win') && JSON.parse(w.localStorage.getItem('lk.fw')) === 'old', 'máy cũ → lk.fw = old, không first_win');
  w.close();
}
{ // công tắc khẩn + bài thử
  const a = await boot({ cfg: { rem_lsn: '0' } }); a.view.innerHTML = '<div class="lsn-end"></div>'; await tick();
  ok(!a.sent.includes('first_win'), "rem_lsn = '0' → không phản ứng màn kết bài học"); a.w.close();
  const b = await boot({ hash: '#/lesson?demo=1' }); b.view.innerHTML = '<div class="lsn-end"></div>'; await tick();
  ok(!b.sent.includes('first_win'), 'bài thử ?demo= không tính'); b.w.close();
}
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
