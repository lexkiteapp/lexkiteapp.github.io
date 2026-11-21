// 🎤 Thử thách nói 30 giây (docs/specs/score-card.md): bộ đổi điểm, công thức khớp client↔máy chủ, link id, hạn mức, tạo→mở→so điểm (SQLite thật), trang /c/<id> (OG meta, 15 ngôn ngữ, không dữ liệu cá nhân), app trong vm.
// Chạy trong npm test: node scripts/test/score-card.mjs
import fs from 'node:fs';
import vm from 'node:vm';
import { sqliteD1 } from '../capacity/meter.mjs';
import * as CH from '../../functions/api/challenge.js';
import * as PG from '../../functions/c/[[path]].js';

const errs = []; let n = 0;
const ok = (c, m) => { n++; if (!c) errs.push(m); };
// Cache API giả (hạn mức dùng caches.default)
const store = new Map();
globalThis.caches = { default: { match: async r => { const v = store.get(r.url); return v ? new Response(v) : undefined; }, put: async (r, res) => { store.set(r.url, await res.text()); } } };

// ---- client: nạp score30.js thuần (không có App) ----
const g = { navigator: {}, document: {}, t: k => k }; g.self = g; vm.createContext(g);
vm.runInContext(fs.readFileSync('web/cpack/score-app/score30.js', 'utf8'), g);
const S = g.Score30;
const sp = (text, conf, wpm, n = 20) => ({ unclear: false, text, conf, fluency: { wpm, pauses: null }, words: Array.from({ length: n }, (_, i) => ({ w: 'w' + i, ok: i < Math.round(text * n) })) });

// 1) Bộ đổi điểm: Speak.score → fl/pr/score/cefr
ok(S.grade(null) === null && S.grade({ unclear: true, words: [{ w: 'a', ok: false }] }) === null && S.grade({ words: [] }) === null, 'không nghe được → null (không tạo thẻ rỗng)');
const best = S.grade(sp(1, 1, 130)), mid = S.grade(sp(0.7, 0.7, 130)), low = S.grade(sp(0.2, 0.3, 60)), fast = S.grade(sp(1, 1, 260)), slow = S.grade(sp(1, 1, 40));
ok(best.score === 100 && best.cefr === 'C2', 'đọc trọn vẹn, nhịp chuẩn → 100/C2: ' + JSON.stringify(best));
ok(best.score > mid.score && mid.score > low.score, 'điểm đơn điệu theo độ đủ ý');
ok(fast.fl < best.fl && slow.fl < best.fl && fast.pr === best.pr, 'nói quá nhanh/quá chậm giảm LƯU LOÁT, không đổi phát âm');
ok([best, mid, low, fast, slow].every(x => [x.fl, x.pr, x.score].every(v => Number.isInteger(v) && v >= 0 && v <= 100)), 'mọi điểm nguyên 0–100');
ok(S.grade(sp(5, 5, 130)).score === 100 && S.grade(sp(-1, -1, -5)).score >= 0, 'đầu vào ngoài khoảng bị kẹp');

// 2) Công thức khớp máy chủ (client ↔ functions/api/challenge.js)
let same = true; for (let fl = 0; fl <= 100; fl += 7) for (let pr = 0; pr <= 100; pr += 5) { const s = S.overall(fl, pr); if (s !== CH.overall(fl, pr) || S.cefrOf(s) !== CH.cefrOf(s)) same = false; }
ok(same, 'overall/cefrOf client = máy chủ');
ok(S.PROMPTS.length === CH.PROMPTS, 'số đoạn đọc client = máy chủ');
ok(S.PROMPTS.every(p => p.split(/\s+/).length <= 30 && /^[\x20-\x7e]+$/.test(p)), 'mỗi đoạn ≤ 30 từ, tiếng Anh thuần (đọc xong trong 30 giây)');

// 3) Id + link
const ids = new Set(Array.from({ length: 500 }, () => CH.newId()));
ok(ids.size === 500 && [...ids].every(i => CH.ID_RE.test(i) && S.idOk(i)), 'id 10 ký tự ngẫu nhiên, không trùng');
ok(!S.idOk('abc') && !S.idOk("a'; DROP TABLE sc_card;--") && !S.idOk('ABCDEFGHIJ') && !S.idOk('../../etc/x'), 'id sai định dạng bị từ chối');
const link = S.linkOf('abcdefghjk', 'vi', 'share');
ok(link === 'https://lexkite.com/c/abcdefghjk?l=vi&utm_source=share&utm_medium=share&utm_campaign=score30', 'link: ' + link);
ok(!/@|token|email|uid|name=/i.test(link), 'link không có dữ liệu cá nhân');
ok(CH.cardOf({ fl: 50, pr: 50, pid: 0, lang: 'xx' }).lang === 'en' && CH.cardOf({ fl: 101, pr: 5, pid: 0 }) === null && CH.cardOf({ fl: 5, pr: 5, pid: 8 }) === null && CH.cardOf({ fl: 5.5, pr: 5, pid: 0 }) === null && CH.cardOf('x') === null, 'cardOf kiểm khoảng/kiểu/ngôn ngữ');
ok(CH.cardOf({ fl: 90, pr: 90, pid: 1, lang: 'vi', score: 5, cefr: 'A1' }).score === 90 && CH.cardOf({ fl: 90, pr: 90, pid: 1 }).cefr === 'C2', 'điểm + CEFR luôn do máy chủ tính, bỏ qua số máy khách gửi');

// 4) Máy chủ: tạo → mở → trả lời, hạn mức, Turnstile
const be = sqliteD1(), db = be.raw, env = { DB: db };
const req = (method, body, ip = '9.9.9.9', q = '', extra = {}) => new Request('https://lexkite.com/api/challenge' + q, { method, headers: { 'Content-Type': 'application/json', Origin: 'https://lexkite.com', 'CF-Connecting-IP': ip, ...extra }, body: body ? JSON.stringify(body) : undefined });
const post = async (body, ip, env2 = env, extra) => { const r = await CH.onRequestPost({ request: req('POST', body, ip, '', extra), env: env2 }); return { s: r.status, j: await r.json() }; };
const get = async (id, ip = '8.8.8.8') => { const r = await CH.onRequestGet({ request: req('GET', null, ip, '?id=' + id), env }); return { s: r.status, j: await r.json(), h: r.headers }; };
const c1 = await post({ op: 'create', fl: 70, pr: 80, pid: 3, lang: 'vi' });
ok(c1.s === 200 && CH.ID_RE.test(c1.j.id), 'tạo thẻ → id: ' + JSON.stringify(c1));
const g1 = await get(c1.j.id);
ok(g1.s === 200 && g1.j.score === 76 && g1.j.cefr === 'C1' && g1.j.pid === 3 && g1.j.lang === 'vi' && g1.j.plays === 0, 'mở thẻ: ' + JSON.stringify(g1.j));
ok(JSON.stringify(Object.keys(g1.j).sort()) === JSON.stringify(['cefr', 'fl', 'lang', 'pid', 'plays', 'pr', 'score']), 'chỉ trả điểm, không lộ gì khác: ' + Object.keys(g1.j));
const r1 = await post({ op: 'reply', id: c1.j.id }, '7.7.7.7'), r2 = await post({ op: 'reply', id: c1.j.id }, '7.7.7.7'), r3 = await post({ op: 'reply', id: c1.j.id }, '6.6.6.6');
ok(r1.j.plays === 1 && r2.j.dup === true && r3.j.plays === 2, 'đếm lượt chơi: 1 lượt/IP/giờ/thẻ: ' + JSON.stringify([r1.j, r2.j, r3.j]));
ok((await get('zzzzzzzzzz')).s === 404 && (await get('bad id')).s === 404, 'id lạ → 404');
ok((await post({ op: 'reply', id: 'zzzzzzzzzz' }, '5.5.5.5')).s === 404 && (await post({ op: 'reply', id: "x'--" }, '5.5.5.4')).s === 400, 'reply id lạ/sai → 404/400');
ok((await post({ op: 'create', fl: 500, pr: 1, pid: 0 }, '4.4.4.4')).s === 400 && (await post({ op: 'nope' }, '4.4.4.5')).s === 400, 'thẻ sai/op lạ → 400');
const bad = await CH.onRequestPost({ request: new Request('https://lexkite.com/api/challenge', { method: 'POST', headers: { Origin: 'https://evil.example', 'Content-Type': 'application/json' }, body: '{}' }), env }); ok(bad.status === 403, 'Origin lạ → 403');
let last; for (let i = 0; i < 7; i++) last = await post({ op: 'create', fl: 10, pr: 10, pid: 0 }, '3.3.3.3'); ok(last.s === 429, `tạo > 5/giờ/IP → 429 (cuối ${last.s})`);
const noTs = await post({ op: 'create', fl: 10, pr: 10, pid: 0 }, '2.2.2.2', { DB: db, TURNSTILE_SECRET_KEY: 'x' });
ok(noTs.s === 403, 'bật Turnstile mà không có vé/token → 403 (cổng người thật): ' + noTs.s);
ok((await CH.onRequestPost({ request: req('POST', { op: 'create', fl: 1, pr: 1, pid: 0 }), env: {} })).status === 500, 'không D1 → 500, không đổ');

// 5) Trang /c/<id>: OG/Twitter meta, 15 ngôn ngữ, UTM, escape
const pg = async (path, hdr = {}, id = c1.j.id) => PG.onRequestGet({ request: new Request('https://lexkite.com/c/' + path, { headers: hdr }), env, params: { path: [id] } });
const h = await pg(c1.j.id + '?l=vi&utm_source=share&utm_medium=zalo&utm_campaign=score30'), html = await h.text();
ok(h.status === 200 && /text\/html/.test(h.headers.get('Content-Type')), 'trang 200 HTML');
ok(/<meta property="og:title" content="Mình nói tiếng Anh được 76\/100 \(C1\)/.test(html) && /twitter:card" content="summary_large_image"/.test(html) && /og:image" content="https:\/\/lexkite.com\/og\/score-C1.png"/.test(html) && /og:url" content="https:\/\/lexkite.com\/c\//.test(html), 'og:/twitter: meta có điểm + ảnh theo bậc CEFR');
for (const k of ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']) ok(fs.existsSync(`web/og/score-${k}.png`) && fs.statSync(`web/og/score-${k}.png`).size < 150000, `ảnh OG web/og/score-${k}.png có và < 150 KB`);
ok(html.includes('href="/app/?utm_source=share&amp;utm_medium=zalo&amp;utm_campaign=score30#/score/' + c1.j.id + '"'), 'nút → app giữ UTM');
ok(/noindex/.test(html) && h.headers.get('X-Robots-Tag') === 'noindex', 'noindex');
const noUtm = await (await pg(c1.j.id, { 'Accept-Language': 'es-MX,es;q=0.9' })).text();
ok(/<html lang="es"/.test(noUtm) && /utm_source=challenge&amp;utm_medium=link&amp;utm_campaign=score30/.test(noUtm), 'Accept-Language → es; UTM mặc định');
const inj = await (await pg(c1.j.id + '?utm_source=%22%3E%3Cscript%3E', {})).text(); ok(!/<script>alert|"><script>/.test(inj.replace(/<script>try\{[\s\S]*?<\/script>/, '')), 'UTM có ký tự lạ bị bỏ, không chèn mã');
for (const l of Object.keys(PG.COPY)) { const t = await (await pg(c1.j.id + '?l=' + l)).text(); ok(new RegExp(`<html lang="${l}" dir="${l === 'ar' ? 'rtl' : 'ltr'}"`).test(t) && /og:title" content="[^"]*76[^"]*C1/.test(t), `trang ${l} đủ (lang/dir/og:title có 76 + C1)`); }
ok(Object.keys(PG.COPY).length === 15 && Object.values(PG.COPY).every(c => c.length === 6 && c.every(x => x.length > 1)) && Object.values(PG.COPY).every(c => c[0].includes('{s}') && c[0].includes('{c}')), '15 ngôn ngữ × 6 chuỗi, tiêu đề có {s}/{c}');
const miss = await pg('zzzzzzzzzz', {}, 'zzzzzzzzzz'); ok(miss.status === 302 && /\/app\/\?utm_source=challenge.*#\/score$/.test(miss.headers.get('Location')), 'id lạ → chuyển thẳng /app/#/score (không kẹt)');
ok((await PG.onRequestGet({ request: new Request('https://lexkite.com/c/'), env: {}, params: { path: [] } })).status === 302, 'không id/không D1 → 302');


// 6) e2e trong jsdom: tạo → chia sẻ → bạn mở link → làm lại đúng đoạn → so điểm (Speak/UI/ST2/fetch/LKFile giả, score30.js THẬT)
const { JSDOM } = await import('jsdom');
async function flow({ chalId, canned, dead }) {
  const dom = new JSDOM('<!doctype html><div id="view"></div>', { runScripts: 'outside-only', url: 'https://lexkite.com/app/' }), w = dom.window, calls = { fetch: [], beacon: [], save: [], toast: [], speak: [], clip: [] };
  const ops = []; w.HTMLCanvasElement.prototype.getContext = () => new Proxy({}, { get: (_, k) => (k === 'createLinearGradient' ? () => ({ addColorStop() {} }) : (...a) => { ops.push([k, ...a]); }), set: (_, k, v) => { ops.push(['set:' + k, v]); return true; } });
  w.HTMLCanvasElement.prototype.toBlob = cb => cb(new w.Blob(['png'], { type: 'image/png' }));
  w.matchMedia = () => ({ matches: false }); w.navigator.sendBeacon = (u, b) => { calls.beacon.push(JSON.parse(b).ev); return true; };
  Object.defineProperty(w.navigator, 'clipboard', { value: { writeText: async x => { calls.clip.push(x); } } });
  w.t = (k, v) => k.replace(/\{(\w+)\}/g, (m, x) => (v && v[x] != null ? v[x] : m));
  w.I18N = { lang: () => 'vi' };
  const routes = {}; w.App = { routes, guard: f => f, W: p => p };
  w.UI = { $: (q, r) => (r || w.document).querySelector(q), esc: x => String(x).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])), toast: m => calls.toast.push(m), dev: () => 'devdevdevdevdevdev', humanHdr: async () => {} };
  w.ST2 = { tabs: () => '', hdr: () => '', mount: (view) => { view.innerHTML = '<div class="v2"><header><button data-href="#/x"></button><h1>Nói như người bản xứ</h1><button id="sFlag"></button></header><main></main></div>'; } };
  w.Speak = { score: async o => { calls.speak.push(o); return canned; }, stop() {} };
  w.LKFile = { save: async (b, name, o) => { calls.save.push({ name, o }); return 'shared'; } };
  w.fetch = async (u, init = {}) => {
    calls.fetch.push({ u: String(u), body: init.body && JSON.parse(init.body), h: init.headers });
    const J = (st, j) => ({ ok: st < 400, status: st, json: async () => j });
    if (String(u).startsWith('/api/challenge?id=')) return !dead && String(u).endsWith(chalId) ? J(200, { score: 76, cefr: 'C1', fl: 70, pr: 80, pid: 3, lang: 'vi', plays: 0 }) : J(404, {});
    if (init.body && JSON.parse(init.body).op === 'create') return J(200, { id: 'mnpqrstuvw' });
    return J(200, { plays: 1 });
  };
  w.eval(fs.readFileSync('web/cpack/score-app/score30.js', 'utf8'));
  const $ = q => w.document.querySelector(q), tick = () => new Promise(r => setTimeout(r, 20));
  await routes.score(chalId || ''); await tick();
  return { w, $, tick, calls, ops };
}
{ // A) bài mới
  const F = await flow({ canned: sp(0.9, 0.9, 130) });
  ok(/Thử thách nói 30 giây/.test(F.$('header h1').textContent) && !/bản xứ/.test(F.$('header h1').textContent), 'tiêu đề khung đổi đúng');
  const txt = F.$('.txt').textContent; ok(S.PROMPTS.includes(txt), 'hiện một đoạn đọc có thật');
  ok(F.calls.beacon.join() === 'sc_view' && !F.$('.banner'), 'mở: chỉ sc_view, không banner thử thách');
  F.$('#s30go').click(); await F.tick(); await F.tick();
  ok(F.calls.speak.length === 1 && F.calls.speak[0].target === txt && F.calls.speak[0].mode === 'free', 'chấm bằng Speak.score (MỘT bộ chấm) đúng đoạn đọc');
  const want = S.grade(sp(0.9, 0.9, 130)); ok(F.$('.stats').textContent.includes(`${want.score}/100`) && F.$('.stats').textContent.includes(want.cefr), 'thẻ điểm hiện đúng điểm + CEFR: ' + F.$('.stats').textContent);
  ok(F.ops.some(o => o[0] === 'fillText' && o[1] === String(want.score)) && F.ops.some(o => o[0] === 'fillText' && o[1] === want.cefr), 'canvas vẽ điểm + CEFR');
  ok(F.$('canvas').getAttribute('role') === 'img' && /Điểm \d+\/100/.test(F.$('canvas').getAttribute('aria-label')), 'canvas có role=img + aria-label (a11y)');
  ok(F.w.document.querySelectorAll('#s30 button').length === 3 && [...F.w.document.querySelectorAll('#s30 button')].every(b => b.textContent.trim()), 'nút đều có chữ (a11y)');
  F.$('#s30sh').click(); await F.tick(); await F.tick(); await F.tick();
  const cr = F.calls.fetch.find(f => f.body && f.body.op === 'create');
  ok(cr && JSON.stringify(Object.keys(cr.body).sort()) === JSON.stringify(['fl', 'lang', 'op', 'pid', 'pr']) && cr.body.fl === want.fl && cr.body.pr === want.pr, 'tạo thẻ chỉ gửi fl/pr/pid/lang: ' + JSON.stringify(cr && cr.body));
  ok(cr.h['X-Lexkite-Device'] && !/Authorization/.test(JSON.stringify(cr.h)), 'không gửi định danh/đăng nhập');
  const sv = F.calls.save[0]; ok(sv && sv.o.share === true && /^https?:|c\/mnpqrstuvw\?l=vi&utm_source=share&utm_medium=share&utm_campaign=score30/.test(sv.o.text) && sv.o.text.includes('https://lexkite.com/c/mnpqrstuvw?l=vi'), 'chia sẻ ảnh kèm link /c/<id> có UTM: ' + (sv && sv.o.text));
  ok(F.calls.beacon.join() === 'sc_view,sc_start,sc_done,sc_share', 'phễu: ' + F.calls.beacon.join());
  F.$('#s30re').click(); ok(F.$('#s30go') && S.PROMPTS.includes(F.$('.txt').textContent), 'Làm lại → về màn bắt đầu');
}
{ // B) bạn mở link /c/<id> → đúng đoạn → so điểm
  const F = await flow({ chalId: 'abcdefghjk', canned: sp(1, 1, 130) });
  ok(F.$('.banner').textContent.includes('76') && F.$('.banner').textContent.includes('C1') && F.$('.txt').textContent === S.PROMPTS[3], 'mở link: banner điểm bạn + ĐÚNG đoạn pid=3');
  ok(F.calls.beacon.join() === 'sc_cstart', 'phễu thử thách: sc_cstart');
  F.$('#s30go').click(); await F.tick(); await F.tick();
  ok(/Bạn thắng! 100 so với 76/.test(F.$('.banner').textContent), 'so điểm: thắng: ' + F.$('.banner').textContent);
  ok(F.calls.fetch.some(f => f.body && f.body.op === 'reply' && f.body.id === 'abcdefghjk') && F.calls.beacon.includes('sc_cdone'), 'đếm lượt chơi + sc_cdone');
  F.$('#s30re').click(); ok(F.$('.txt').textContent === S.PROMPTS[3] && F.$('.banner'), 'làm lại thử thách giữ ĐÚNG đoạn + banner');
}
{ // C) thua / hòa / link hỏng
  const lose = await flow({ chalId: 'abcdefghjk', canned: sp(0.3, 0.4, 130) }); lose.$('#s30go').click(); await lose.tick(); await lose.tick();
  ok(/hơn \d+ điểm/.test(lose.$('.banner').textContent), 'thua: ' + lose.$('.banner').textContent);
  const dead = await flow({ chalId: 'zzzzzzzzzz', dead: true, canned: sp(1, 1, 130) }); ok(!dead.$('.banner') && dead.calls.beacon.join() === 'sc_view', 'link hỏng → bài mới bình thường, không kẹt');
}
{ // D) không nghe được / không hỗ trợ
  const mute = await flow({ canned: { unclear: true, words: [{ w: 'a', ok: false }], error: 'no-speech' } }); mute.$('#s30go').click(); await mute.tick(); await mute.tick();
  ok(!mute.$('canvas') && /Không nghe rõ/.test(mute.$('.txt').textContent) && mute.$('#s30re') && !mute.calls.beacon.includes('sc_done'), 'không nghe được → báo + thử lại, KHÔNG tạo thẻ rỗng');
  const un = await flow({ canned: { unclear: true, words: [{ w: 'a', ok: false }], error: 'unsupported' } }); un.$('#s30go').click(); await un.tick(); await un.tick();
  ok(/chưa hỗ trợ nhận giọng nói/.test(un.$('.txt').textContent), 'trình duyệt không hỗ trợ → thông báo rõ');
}

if (errs.length) { console.error('✗ score-card:\n  ' + errs.join('\n  ')); process.exit(1); }
console.log(`✓ score-card: ${n} kiểm tra (bộ chấm, công thức client=server, id/link, hạn mức, Turnstile, trang /c/ 15 ngôn ngữ, e2e tạo→chia sẻ→mở→so điểm)`);
