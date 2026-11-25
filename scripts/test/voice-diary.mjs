// 🎙️ Nhật ký giọng nói – ngày 1 vs ngày 30 (docs/specs/voice-diary.md): mốc/ngày thuần, kịch bản video, thẻ pid 100+ máy chủ ↔ client, trang /c biến thể nhật ký 15 ngôn ngữ,
// sự kiện vd_* + công tắc vd_kill, e2e jsdom (loại nhắc 'diary': scripts/test/reminders.mjs): ngày 1 → +7 ngày → thu → chia sẻ → bạn mở link → so → bắt đầu nhật ký; riêng tư (không gửi âm thanh).
// Chạy trong npm test: node scripts/test/voice-diary.mjs
import fs from 'node:fs';
import vm from 'node:vm';
import { sqliteD1 } from '../capacity/meter.mjs';
import * as CH from '../../functions/api/challenge.js';
import * as PG from '../../functions/c/[[path]].js';
import { VD_EV } from '../../functions/api/hit.js';
import { PUBLIC_KEYS } from '../../functions/api/config.js';

const errs = []; let n = 0;
const ok = (c, m) => { n++; if (!c) errs.push(m); };
const store = new Map();
globalThis.caches = { default: { match: async r => { const v = store.get(r.url); return v ? new Response(v) : undefined; }, put: async (r, res) => { store.set(r.url, await res.text()); }, delete: async () => true } };
const rd = f => fs.readFileSync(f, 'utf8');

// ---- 1) Thuần: diary.js + diary-video.js + score30.js (không có App) ----
const g = { navigator: {}, t: k => k }; g.self = g; vm.createContext(g);
for (const f of ['web/cpack/score-app/score30.js', 'web/cpack/diary-app/diary.js', 'web/cpack/diary-app/diary-video.js']) vm.runInContext(rd(f), g);
const V = g.VDiary, VV = g.VDiaryVideo, day = (k, h = 12) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d, h).getTime(); };
ok(JSON.stringify(V.MS) === '[0,7,14,30,60,90]', 'mốc 0/7/14/30/60/90');
ok(V.daysSince('2026-03-01', day('2026-03-01', 23)) === 0 && V.daysSince('2026-03-01', day('2026-03-08', 0)) === 7 && V.daysSince('2026-03-20', day('2026-04-19', 1)) === 30, 'đếm ngày lịch (qua đổi giờ mùa hè cuối tháng 3)');
ok(V.daysSince('rác', Date.now()) === 0 && V.daysSince('2026-05-10', day('2026-05-01')) === 0, 'khóa hỏng / đồng hồ lùi → 0, không âm');
ok(V.slotOf(0) === 0 && V.slotOf(6) === 0 && V.slotOf(7) === 7 && V.slotOf(13) === 7 && V.slotOf(33) === 30 && V.slotOf(400) === 90, 'mốc của ngày d = mốc lớn nhất ≤ d');
const tk = (m, d, score) => ({ m, day: d, score, fl: score, pr: score, cefr: 'B1', words: [] });
let t = V.timeline('2026-03-01', [tk(0, 0, 50)], day('2026-03-04'));
ok(t.cur === 0 && !t.dueNow && t.next.m === 7 && t.next.in === 4 && t.rows.find(r => r.m === 0).state === 'done', 'ngày 3: đã thu ngày 1, mốc tiếp 7 còn 4 ngày');
t = V.timeline('2026-03-01', [tk(0, 0, 50)], day('2026-03-10'));
ok(t.cur === 7 && t.dueNow && t.next.m === 7, 'ngày 9: mốc 7 tới hạn (trễ vẫn thu được)');
t = V.timeline('2026-03-01', [tk(0, 0, 50)], day('2026-04-02'));
ok(t.cur === 30 && t.dueNow && t.rows.find(r => r.m === 7).state === 'missed' && t.rows.find(r => r.m === 14).state === 'missed', 'ngày 32: mốc 7/14 lỡ, mốc 30 tới hạn');
ok(V.nextDueAt({ start: '2026-03-01' }, [tk(0, 0, 50)], day('2026-03-03')) === new Date(2026, 2, 8).getTime(), 'nhắc: mốc 7 = 00:00 ngày 8/3');
ok(V.nextDueAt({ start: '2026-03-01' }, [tk(0, 0, 50)], day('2026-03-12')) === new Date(2026, 2, 12).getTime(), 'mốc đã tới hạn chưa thu → nhắc ngay hôm nay');
ok(V.nextDueAt(null, [], Date.now()) === null && V.nextDueAt({ start: '2026-03-01' }, V.MS.map(m => tk(m, m, 50)), day('2026-07-01')) === null, 'chưa có nhật ký / đã thu hết → không nhắc');
const pr = V.pairOf([tk(30, 31, 80), tk(0, 0, 50), tk(7, 7, 60)]);
ok(pr.first.m === 0 && pr.last.m === 30 && V.pairOf([tk(0, 0, 50)]).last === null, 'video: ngày 1 vs bản mới nhất; chỉ ngày 1 → không có "sau"');
ok(V.SENTENCES.length === CH.VD_PROMPTS && V.PID0 === CH.VD_PID0, 'số câu + pid gốc client = máy chủ');
ok(V.SENTENCES.every(s => /^[\x20-\x7e]+$/.test(s) && s.split(/\s+/).length >= 8 && s.split(/\s+/).length <= 18), 'câu tiếng Anh thuần, 8–18 từ (3–6 giây)');
ok(V.SENTENCES.every((s, i) => i === 0 || s.length > V.SENTENCES[i - 1].length), 'câu xếp ngắn → dài (Ngắn/Vừa/Dài)');
// kịch bản video
const s2 = VV.script({ dA: 4.2, dB: 3.8, hasLast: true }), s1 = VV.script({ dA: 0, hasLast: false }), sl = VV.script({ dA: 60, dB: 60, hasLast: true });
ok(s2.scenes.map(s => s.k).join() === 'intro,a,b,up,end' && s1.scenes.map(s => s.k).join() === 'intro,a,end', 'cảnh: mở đầu · ngày 1 · mới nhất · tiến bộ · link');
ok(s2.scenes.every((s, i) => i === 0 ? s.t0 === 0 : Math.abs(s.t0 - s2.scenes[i - 1].t1) < 1e-9) && Math.abs(s2.total - s2.scenes[4].t1) < 1e-9, 'cảnh nối liền, tổng = cảnh cuối');
ok(sl.total <= 25 && s2.total >= 10 && s1.total >= 6, `video ≤ 25 s kể cả bản ghi dài (${sl.total.toFixed(1)} s), không quá ngắn`);
ok(VV.W === 720 && VV.H === 1280 && VV.W / VV.H === 9 / 16 && VV.FPS === 30, 'khung 720×1280 (9:16), 30 fps');
ok(VV.pickMime({ isTypeSupported: m => /webm/.test(m) }) === 'video/webm;codecs=vp9,opus' && /^video\/mp4/.test(VV.pickMime({ isTypeSupported: () => true })) && VV.pickMime(null) === '', 'ưu tiên mp4 (TikTok/Reels), không có thì webm');

// ---- 2) Máy chủ: pid nhật ký, trang /c biến thể, sự kiện, công tắc ----
ok(CH.cardOf({ fl: 60, pr: 70, pid: 101 }).pid === 101 && CH.cardOf({ fl: 60, pr: 70, pid: 100 + CH.VD_PROMPTS }) === null && CH.cardOf({ fl: 60, pr: 70, pid: 99 }) === null && CH.cardOf({ fl: 60, pr: 70, pid: 8 }) === null && CH.cardOf({ fl: 60, pr: 70, pid: 3 }).pid === 3, 'cardOf: pid 0..7 (30 s) + 100..102 (nhật ký), ngoài khoảng → null');
const env = { DB: sqliteD1().raw }, req = (body, ip) => new Request('https://lexkite.com/api/challenge', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://lexkite.com', 'CF-Connecting-IP': ip }, body: JSON.stringify(body) });
const c = await (await CH.onRequestPost({ request: req({ op: 'create', fl: 76, pr: 80, pid: 101, lang: 'vi' }, '1.1.1.1'), env })).json();
ok(CH.ID_RE.test(c.id || ''), 'tạo thẻ nhật ký → id');
const pg = async (q, hdr = {}) => PG.onRequestGet({ request: new Request('https://lexkite.com/c/' + c.id + q, { headers: hdr }), env, params: { path: [c.id] } });
const html = await (await pg('?l=vi&d=30&f=52&utm_source=share&utm_medium=share&utm_campaign=voicediary')).text();
ok(/og:title" content="Mình từ 52 lên 78 điểm sau 30 ngày nói tiếng Anh/.test(html), 'trang /c nhật ký: tiêu đề "từ 52 lên 78 sau 30 ngày"');
ok(html.includes(`href="/app/?utm_source=share&amp;utm_medium=share&amp;utm_campaign=voicediary#/diary/c/${c.id}"`), 'nút → #/diary/c/<id>, giữ UTM voicediary');
ok(/b\('vd_cview'\)/.test(html) && /b\('vd_cta'\)/.test(html) && !/sc_cview/.test(html), 'beacon vd_cview/vd_cta (không lẫn sc_)');
const plain = await (await pg('?l=en&d=abc&f=999')).text();
ok(/og:title" content="I scored 78\/100 on this sentence/.test(plain) && /utm_campaign=voicediary#\/diary\/c\//.test(plain), 'd/f sai → tiêu đề chỉ điểm (không chèn rác), chiến dịch mặc định voicediary');
ok(Object.keys(PG.COPY_VD).sort().join() === Object.keys(PG.COPY).sort().join() && Object.values(PG.COPY_VD).every(v => v.length === 4 && v[0].includes('{f}') && v[0].includes('{s}') && v[0].includes('{d}') && v[1].includes('{s}') && v.every(x => x.length > 2)), 'COPY_VD đủ 15 ngôn ngữ × 4 chuỗi, đúng biến');
for (const l of Object.keys(PG.COPY_VD)) { const h = await (await pg(`?l=${l}&d=14&f=40`)).text(); ok(new RegExp(`<html lang="${l}"`).test(h) && /og:title" content="[^"]*40[^"]*78|og:title" content="[^"]*78[^"]*40/.test(h), `trang nhật ký ${l}: có 40 và 78`); }
const sc = await (await CH.onRequestPost({ request: req({ op: 'create', fl: 70, pr: 80, pid: 2, lang: 'vi' }, '1.1.1.2'), env })).json();
const old = await (await PG.onRequestGet({ request: new Request('https://lexkite.com/c/' + sc.id), env, params: { path: [sc.id] } })).text();
ok(/#\/score\//.test(old) && /sc_cview/.test(old) && /30s/.test(old), 'thẻ 30 s cũ không đổi (#/score, sc_cview)');
ok(['view', 'start', 'rec', 'ms', 'share', 'shared', 'dl', 'del', 'cview', 'cta', 'cstart', 'cdone', 'join'].every(a => VD_EV.includes('vd_' + a)) && /SC_EV = \[[^\]]*\]\.map\([^)]*\)\.concat\(VD_EV\)/.test(rd('functions/api/hit.js')), 'hit.js nhận đủ sự kiện vd_* (kind cta:)');
ok(PUBLIC_KEYS.includes('vd_kill') && /CONFIG_KEYS\.push\('vd_kill'\)/.test(rd('functions/api/admin.js')), 'công tắc khẩn vd_kill: công khai + quản trị đặt được');
const evUsed = [...new Set([...rd('web/cpack/diary-app/diary.js').matchAll(/ev\('(\w+)'\)/g)].map(m => 'vd_' + m[1]))];
ok(evUsed.length >= 8 && evUsed.every(e => VD_EV.includes(e)), 'mọi ev() trong diary.js có trong VD_EV: ' + evUsed.join());

// ---- 4) e2e jsdom: diary.js THẬT; Speak/UI/App/fetch/LKFile/IndexedDB giả ----
const { JSDOM } = await import('jsdom');
function fakeIDB() {
  const data = new Map();
  const st = { getAll: () => ({ result: [...data.values()].map(v => ({ ...v })) }), put: v => { data.set(v.m, { ...v }); return {}; }, delete: k => { data.delete(k); return {}; }, clear: () => { data.clear(); return {}; } };
  const db = { transaction: () => { const tx = { objectStore: () => st }; setTimeout(() => tx.oncomplete && tx.oncomplete(), 0); return tx; } };
  return { data, open: () => { const r = {}; setTimeout(() => { r.result = Object.assign(db, { createObjectStore() {} }); r.onupgradeneeded && r.onupgradeneeded(); r.onsuccess && r.onsuccess(); }, 0); return r; } };
}
const spk = (text, n = 10) => ({ unclear: false, text, conf: text, fluency: { wpm: 130 }, words: Array.from({ length: n }, (_, i) => ({ w: 'w' + i, ok: i < Math.round(text * n) })), audio: 'blob:rec' });
async function app({ hash = '', canned, now, off, idb, ls, chal }) {
  const dom = new JSDOM('<!doctype html><div id="view"></div>', { runScripts: 'outside-only', url: 'https://lexkite.com/app/' }), w = dom.window;
  const calls = { fetch: [], beacon: [], save: [], toast: [], speak: [], reward: [], need: [], render: [] };
  w.matchMedia = () => ({ matches: false }); w.navigator.sendBeacon = (u, b) => { calls.beacon.push(JSON.parse(b).ev); return true; };
  Object.defineProperty(w.navigator, 'clipboard', { value: { writeText: async () => {} } });
  if (ls) for (const [k, v] of Object.entries(ls)) w.localStorage.setItem(k, v);
  w.indexedDB = idb; w.t = (k, v) => k.replace(/\{(\w+)\}/g, (m, x) => (v && v[x] != null ? v[x] : m)); w.I18N = { lang: () => 'vi' };
  w.VDiary = { now: () => now.t };
  const routes = {}; w.App = { routes, guard: f => f, W: p => p, vdOn: () => !off, reward: d => calls.reward.push(d), need: async name => { calls.need.push(name); w.VDiaryVideo = { render: async o => { calls.render.push(o); return { blob: new w.Blob(['v'], { type: 'video/mp4' }), mime: 'video/mp4' }; } }; } };
  w.UI = { $: (q, r) => (r || w.document).querySelector(q), esc: x => String(x).replace(/[&<>"]/g, c2 => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c2])), toast: m => calls.toast.push(m), dev: () => 'devdevdevdevdevdev', humanHdr: async () => {}, confirm: async () => true, micParallel: () => true, MIC: { audio: true } };
  w.Speak = { score: async o => { calls.speak.push(o); return canned(); }, stop() {} };
  w.LKFile = { save: async (b, name, o) => { calls.save.push({ name, o, type: b.type }); return 'shared'; } };
  w.fetch = async (u, init = {}) => {
    const J = (s, j) => ({ ok: s < 400, status: s, json: async () => j });
    if (String(u).startsWith('blob:')) return { blob: async () => new w.Blob(['opus-audio'], { type: 'audio/webm' }) };
    calls.fetch.push({ u: String(u), body: init.body && JSON.parse(init.body) });
    if (String(u).startsWith('/api/challenge?id=')) return chal ? J(200, chal) : J(404, {});
    if (init.body && JSON.parse(init.body).op === 'create') return J(200, { id: 'mnpqrstuvw' });
    return J(200, { plays: 1 });
  };
  w.eval(rd('web/cpack/score-app/score30.js')); w.eval(rd('web/cpack/diary-app/diary.js'));
  const $ = q => w.document.querySelector(q), tick = async (k = 4) => { for (let i = 0; i < k; i++) await new Promise(r => setTimeout(r, 15)); };
  await routes.diary(hash); await tick();
  return { w, $, tick, calls, routes };
}
const clock = { t: day('2026-03-01', 10) }, idb = fakeIDB();
let A = await app({ canned: () => spk(0.5), now: clock, idb });
ok(A.$('h1').textContent === 'Nhật ký giọng nói' && A.w.document.querySelectorAll('input[name=vds]').length === 3 && A.calls.beacon.join() === 'vd_view', 'mở lần đầu: giới thiệu + chọn 1 trong 3 câu, chỉ vd_view');
A.w.document.querySelector('input[name=vds][value="2"]').checked = true; A.$('#vdgo').click(); await A.tick(6);
ok(A.calls.speak.length === 1 && A.calls.speak[0].target === V.SENTENCES[2] && A.calls.speak[0].mode === 'free', 'chấm bằng Speak.score (một bộ chấm) đúng câu đã chọn');
const g1 = g.Score30.grade(spk(0.5));
ok(A.$('.big') && A.$('.big').textContent.startsWith(String(g1.score)) && /Hẹn bạn ở mốc ngày 7/.test(A.$('#vd').textContent), 'kết quả ngày 1 = Score30.grade + hẹn mốc 7');
ok(idb.data.size === 1 && idb.data.get(0).audio && idb.data.get(0).audio.size > 0 && idb.data.get(0).score === g1.score && idb.data.get(0).sid === 2, 'lưu IndexedDB: bản ngày 0 kèm Blob âm thanh');
const meta = JSON.parse(A.w.localStorage.getItem('lk.vd'));
ok(meta.start === '2026-03-01' && meta.sid === 2 && meta.nm === 7 && meta.next === new Date(2026, 2, 8).getTime(), 'lk.vd: ngày bắt đầu, câu, mốc kế tiếp cho bộ nhắc');
ok(A.calls.reward.length === 1 && A.calls.reward[0].xp > 0 && A.calls.reward[0].spoken === 1, 'thưởng XP 1 lần cho mốc mới');
ok(A.calls.beacon.join() === 'vd_view,vd_rec,vd_start' && A.calls.fetch.length === 0, 'phễu vd_view→rec→start; KHÔNG gọi mạng nào khi thu (âm thanh không rời máy)');
A.$('#vdok').click(); await A.tick();
ok(/Mốc tiếp theo: ngày 7 \(còn 7 ngày\)/.test(A.$('#vd').textContent) && A.$('[data-play="0"]') && A.$('#vdsh') && A.$('#vddel'), 'màn nhật ký: mốc tiếp theo, nghe lại, chia sẻ, xóa');
// +8 ngày → mốc 7 tới hạn
clock.t = day('2026-03-09', 19);
A = await app({ canned: () => spk(0.9), now: clock, idb, ls: { 'lk.vd': JSON.stringify(meta) } });
ok(A.$('#vdrec') && /Thu câu hôm nay/.test(A.$('#vdrec').textContent) && A.$('.tl .due'), 'ngày 8: mốc 7 tới hạn – nút thu nổi bật');
A.$('#vdrec').click(); await A.tick(6);
const g2 = g.Score30.grade(spk(0.9));
ok(new RegExp(`Tăng ${g2.score - g1.score} điểm so với ngày 1`).test(A.$('#vd').textContent) && idb.data.get(7).day === 8, 'mốc 7: so với ngày 1 (+điểm), ghi đúng ngày thật (8)');
ok(A.calls.beacon.includes('vd_ms') && A.calls.reward.length === 1, 'mốc mới → vd_ms + thưởng');
A.$('#vdok').click(); await A.tick();
ok(A.$('svg.chart') && /Điểm từ \d+ lên \d+/.test(A.$('svg.chart').getAttribute('aria-label')), 'biểu đồ tiến bộ có aria-label');
A.$('#vdrec').click(); await A.tick(6); // thu lại cùng mốc → thay bản, KHÔNG thưởng thêm
ok(idb.data.size === 2 && A.calls.reward.length === 1 && A.calls.beacon.filter(e => e === 'vd_ms').length === 1, 'thu lại cùng mốc: thay bản cũ, không cộng XP lần 2 (chống cày)');
A.$('#vdok').click(); await A.tick();
A.$('#vdsh').click(); await A.tick(8);
const cr = A.calls.fetch.find(f => f.body && f.body.op === 'create');
ok(A.calls.need.includes('diaryvid') && A.calls.render.length === 1 && A.calls.render[0].first.m === 0 && A.calls.render[0].last.m === 7 && A.calls.render[0].sentence === V.SENTENCES[2], 'chia sẻ: nạp lười diaryvid, dựng video ngày 1 vs mốc 7');
ok(cr && JSON.stringify(Object.keys(cr.body).sort()) === '["fl","lang","op","pid","pr"]' && cr.body.pid === 102, 'link thách đấu: chỉ fl/pr/pid(=100+câu)/lang – KHÔNG gửi âm thanh/chữ: ' + JSON.stringify(cr && cr.body));
const sv = A.calls.save[0];
ok(sv && sv.name === 'lexkite-voice-diary.mp4' && sv.o.share === true && sv.o.text.includes('https://lexkite.com/c/mnpqrstuvw?l=vi&utm_source=share&utm_medium=share&utm_campaign=voicediary&d=8&f=' + g1.score), 'share sheet: video mp4 + link /c có UTM voicediary + d/f: ' + (sv && sv.o.text));
ok(A.calls.beacon.includes('vd_share') && A.calls.beacon.includes('vd_shared'), 'phễu chia sẻ: vd_share → vd_shared');
ok(A.calls.render[0].link === 'lexkite.com/c/mnpqrstuvw' && ['ama', 'carlos'].includes(A.calls.render[0].who), 'video kèm link ngắn + giáo viên 2D Ama/Carlos');
A.$('[data-del="7"]').click(); await A.tick();
ok(!idb.data.has(7) && idb.data.has(0) && A.calls.beacon.includes('vd_del'), 'xóa một bản (có xác nhận)');
A.$('#vddel').click(); await A.tick();
ok(idb.data.size === 0 && !A.w.localStorage.getItem('lk.vd') && A.$('#vdgo'), 'xóa cả nhật ký → sạch IndexedDB + lk.vd, về màn bắt đầu');
// điện thoại web: không ghi song song → thu thêm 1 lượt chỉ ghi âm (không có micro → bỏ qua, vẫn lưu điểm)
{
  const idb2 = fakeIDB(), B = await app({ canned: () => ({ ...spk(0.6), audio: '' }), now: { t: day('2026-03-01') }, idb: idb2 });
  B.w.UI.micParallel = () => false; B.$('#vdgo').click(); await B.tick(6);
  ok(idb2.data.size === 1 && idb2.data.get(0).audio === null && B.$('.big'), 'không có bản ghi song song + không micro riêng → vẫn lưu điểm (không kẹt)');
}
// bạn mở link /c/<id> → #/diary/c/<id>
{
  const idb3 = fakeIDB(), F = await app({ hash: 'c/mnpqrstuvw', canned: () => spk(1), now: { t: day('2026-04-01') }, idb: idb3, chal: { score: 70, cefr: 'B2', fl: 70, pr: 70, pid: 101, lang: 'vi', plays: 0 } });
  ok(/Bạn của bạn đạt 70\/100/.test(F.$('.banner').textContent) && F.$('.txt').textContent === V.SENTENCES[1] && F.calls.beacon.join() === 'vd_cstart', 'link: banner điểm bạn + ĐÚNG câu pid 101, vd_cstart');
  F.$('#vdfgo').click(); await F.tick(6);
  ok(/Bạn thắng! 100 so với 70/.test(F.$('.banner').textContent) && F.calls.fetch.some(f => f.body && f.body.op === 'reply') && F.calls.beacon.includes('vd_cdone'), 'so điểm + đếm lượt + vd_cdone');
  ok(/Bắt đầu nhật ký của tôi/.test(F.$('#vdjoin').textContent), 'mời bắt đầu nhật ký của mình (vòng K)');
  F.$('#vdjoin').click(); await F.tick();
  ok(F.w.document.querySelector('input[name=vds]:checked').value === '1', 'câu đã chọn sẵn = câu của bạn bè');
  F.$('#vdgo').click(); await F.tick(6);
  ok(idb3.data.size === 1 && idb3.data.get(0).score === 100 && F.calls.speak.length === 1 && F.calls.beacon.includes('vd_join'), 'dùng luôn bản vừa đọc làm ngày 1 (không bắt đọc lại) → vd_join');
  const fx = await app({ hash: 'c/mnpqrstuvw', canned: () => spk(1), now: { t: day('2026-04-01') }, idb: fakeIDB(), chal: { score: 70, cefr: 'B2', fl: 70, pr: 70, pid: 3, lang: 'vi', plays: 0 } });
  ok(fx.w.location.hash === '#/score/mnpqrstuvw', 'thẻ 30 s mở nhầm ở #/diary → chuyển về #/score/<id>');
}
// công tắc khẩn
{ const K = await app({ canned: () => spk(1), now: clock, idb: fakeIDB(), off: true }); ok(/tạm nghỉ/.test(K.$('#vd').textContent) && !K.calls.beacon.length && !K.$('#vdgo'), 'vd_kill → báo tạm nghỉ, không đếm, không thu'); }
// lối vào + gói lười + i18n
ok(/diary: 'diary'/.test(rd('web/js/app.js')) && /diary: \[[^\]]*'cpack\/diary-app\/diary\.js'\]/.test(rd('web/js/bundles.js')) && /diaryvid: \[[^\]]*'cpack\/diary-app\/diary-video\.js'\]/.test(rd('web/js/bundles.js')), 'route #/diary + gói lười diary/diaryvid (video chỉ nạp khi chia sẻ)');
ok(['web/js/ux1.js', 'web/js/speaking.js', 'web/cpack/score-app/score30.js'].every(f => /#\/diary/.test(rd(f)) && /vdOn/.test(rd(f))), 'lối vào: Luyện › Kỹ năng, kết quả Nói, thẻ điểm 30 s – đều ẩn theo công tắc');
ok(/\bdiary\b/.test((rd('scripts/build-i18n.sh').match(/^LAZY="([^"]*)"/m) || [])[1]), 'nhóm i18n lười diary');
const enKeys = Object.keys((() => { const c3 = {}; c3.self = c3; vm.createContext(c3); vm.runInContext(rd('web/js/i18n/en/diary.js'), c3); return c3.I18N_DICT.en; })());
for (const l of rd('scripts/i18n-langs.txt').split('\n').map(x => x.replace(/#.*/, '').trim()).filter(Boolean)) {
  const c4 = {}; c4.self = c4; vm.createContext(c4); vm.runInContext(rd(`i18n/ui/${l}/diary.js`), c4); const D = c4.I18N_DICT[l];
  ok(enKeys.every(k => D[k] && D[k] !== k && (k.match(/\{\w+\}/g) || []).every(v => D[k].includes(v))), `diary ${l}: đủ ${enKeys.length} chuỗi, giữ biến`);
}
const used = [...new Set([...rd('web/cpack/diary-app/diary.js').matchAll(/T\('([^']+)'/g), ...rd('web/cpack/diary-app/diary-video.js').matchAll(/T\('([^']+)'/g)].map(m => m[1]))];
const s30en = rd('web/js/i18n/en/score30.js'), shellEn = rd('web/js/i18n/en/shell.js') + rd('web/js/i18n/en.js');
const inEn = k => enKeys.includes(k) || [s30en, shellEn].some(f => f.includes(JSON.stringify(k)) || f.includes(`'${k}'`));
ok(used.every(inEn), 'mọi chuỗi T() có bản tiếng Anh trong diary/score30/khung: ' + used.filter(k => !inEn(k)).join(' | '));

if (errs.length) { console.error('✗ voice-diary:\n  ' + errs.join('\n  ')); process.exit(1); }
console.log(`✓ voice-diary: ${n} kiểm tra (mốc/ngày, kịch bản video 9:16, pid nhật ký client=server, trang /c 15 ngôn ngữ, vd_* + vd_kill, e2e ngày 1→mốc 7→chia sẻ→bạn→bắt đầu, riêng tư, i18n)`);
