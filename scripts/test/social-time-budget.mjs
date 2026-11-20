// Ngân sách thời gian mỗi lượt autopilot (20/11): đồng hồ T0 PHẢI được đặt lại ở đầu runAuto – #1606 từng đặt nhầm trong autoStatus nên isolate sống >60 giây
// làm outOfTime() luôn true → không bài nào được tạo/đăng 24 giờ. Test tĩnh (runAuto không chạy được không cần D1).
import fs from 'node:fs';
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('✗', m); } };
const src = fs.readFileSync(new URL('../../functions/api/_social_auto.js', import.meta.url), 'utf8');
const fn = name => { const i = src.indexOf('export async function ' + name + '('); const j = src.indexOf('\nexport ', i + 10); return src.slice(i, j < 0 ? undefined : j); };
const run = fn('runAuto'), first = run.search(/outOfTime|rebalanceDays\(|planNow\(\)/), reset = run.indexOf('T0 = Date.now()');
ok(reset > 0 && reset < first, 'runAuto đặt lại T0 TRƯỚC khi dùng outOfTime/rebalance/plan');
const m = (src.match(/T0 = Date\.now\(\)/g) || []).length; ok(m >= 2, 'T0 được đặt ở cả runAuto và autoStatus');
ok(/rebalanceDays\(db, now, dayCap, 120, outOfTime\)/.test(run) && !/rebalanceDays\(db, now, dayCap\)/.test(run), 'rebalanceDays nhận stop = outOfTime (không quét mãi gây 524)');
ok(/plan_daily && !outOfTime\(\)/.test(run), 'planNow chỉ chạy khi còn ngân sách thời gian');
// máy gác tự lấp (20/11): op autofill nối dây đủ + coverage.mjs gọi trước khi báo đỏ
const api = fs.readFileSync(new URL('../../functions/api/social-auto.js', import.meta.url), 'utf8'), cov = fs.readFileSync(new URL('../../scripts/social/coverage.mjs', import.meta.url), 'utf8');
ok(/b\.op === 'autofill'[^\n]*autoFill\(env\)/.test(api) && /export async function autoFill\(/.test(src), 'op autofill gọi autoFill (duyệt thêm ≤150 + plan_run + rebalance)');
ok(/op: 'autofill'/.test(cov) && cov.indexOf("op: 'autofill'") < cov.indexOf('report(jj)'), 'social-coverage tự lấp rồi đo lại trước khi báo đỏ');
console.log(fails ? `social-time-budget: ${fails} lỗi` : 'social-time-budget OK'); process.exit(fails ? 1 : 0);
