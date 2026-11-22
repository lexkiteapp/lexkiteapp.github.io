// 🧪 scripts/seo/indexnow-wait.mjs: chọn URL kiểm (ưu tiên en/vi), so băm <main> live với bản dựng – không gọi mạng (fetch giả).
import * as W from '../seo/indexnow-wait.mjs';
import { mainHash } from '../lib/lastmod.mjs';
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.error(`  ✗ ${m}`); } };
const O = 'https://lexkite.com', html = '<html><main><h1>New</h1></main></html>', h = mainHash(html);
const now = [`${O}/th/words/a ${h}`, `${O}/en/words/b ${h}`, `${O}/ko/words/c x`, `${O}/vi/words/d ${h}`, `${O}/es/words/e ${h}`];
const p = W.probes([`${O}/th/words/a`, `${O}/en/words/b`, `${O}/vi/words/d`, `${O}/es/words/e`, `${O}/zz/none`], now);
ok(p.length === 3 && p[0][0].includes('/en/') && p[1][0].includes('/vi/'), `ưu tiên en/vi: ${p.map(x => x[0]).join(',')}`);
ok(!p.some(x => x[0].includes('/zz/')), 'bỏ URL không có băm');
const f = body => async () => ({ status: 200, text: async () => body });
ok(await W.live(`${O}/en/words/b`, h, f(html.replace('<main>', '<main><script>x</script>'))), 'khớp khi chỉ khác script (mainHash bỏ script)');
ok(!(await W.live(`${O}/en/words/b`, h, f('<main>Old</main>'))), 'bản cũ → chưa live');
ok(!(await W.live(`${O}/en/words/b`, h, async () => ({ status: 404, text: async () => html }))), '404 → chưa live');
ok(!(await W.live(`${O}/en/words/b`, h, async () => { throw new Error('net'); })), 'lỗi mạng → chưa live');
if (fails) { console.error(`✗ indexnow-wait: ${fails} lỗi`); process.exit(1); }
console.log('✓ indexnow-wait: chọn URL kiểm, so băm live, bản cũ/404/lỗi mạng không báo');
