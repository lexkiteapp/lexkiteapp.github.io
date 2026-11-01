// Luồng tài khoản & đồng bộ (docs/specs/account-flow.md) – web/js/core.js + web/js/sync.js THẬT trong vm, máy chủ /api/sync giả trong bộ nhớ.
// Kiểm: gộp giao hoán/lũy đẳng/không mất (ngẫu nhiên) · game giữ trường của cả 2 bản · khách → tài khoản · 2 thiết bị xung đột ·
// offline → online (thử lại, không báo lỗi) · đua lệnh giữa bài · kéo đôi khi đăng nhập · đổi tài khoản trong WebView (không xóa) + bản sao khôi phục ·
// đăng xuất/đăng nhập lại. Cuối: tỉ lệ lỗi đồng bộ trên N vòng ngẫu nhiên (phải = 0).
// Chạy: node scripts/test/account-flow.mjs
import fs from 'node:fs';
import vm from 'node:vm';

let fails = 0, n = 0; const ok = (c, m) => { n++; if (!c) { fails++; console.log('✗', m); } };
const CORE = fs.readFileSync('web/js/core.js', 'utf8'), SYNC = fs.readFileSync('web/js/sync.js', 'utf8');
const tick = () => new Promise(r => setImmediate(r));

// ---------- máy chủ /api/sync giả: lưu tài liệu theo uid ----------
function server() {
  const rows = {}; let calls = { pull: 0, push: 0 }, down = false, delay = null;
  const fetch = async (url, init) => {
    if (down) throw new TypeError('Failed to fetch');
    const body = JSON.parse(init.body), uid = init.headers.Authorization.slice(7);
    if (delay) await delay();
    const docs = rows[uid] || (rows[uid] = {});
    calls[body.op] = (calls[body.op] || 0) + 1;
    if (body.op === 'push') for (const [k, d] of Object.entries(body.docs)) docs[k] = JSON.parse(d.body);
    const out = body.op === 'pull' ? { docs: structuredClone(docs) } : { ok: true };
    return { ok: true, status: 200, json: async () => out };
  };
  return { rows, fetch, get calls() { return calls; }, set down(v) { down = v; }, set delay(f) { delay = f; } };
}

// ---------- 1 thiết bị = 1 vm với core + sync thật ----------
function device(srv, opt = {}) {
  const mem = {}, ls = {}, wl = {}, dl = {}, timers = new Map(); let tid = 0;
  const sb = {
    chrome: { storage: { local: { get: async k => (typeof k === 'string' ? (k in mem ? { [k]: structuredClone(mem[k]) } : {}) : structuredClone(mem)), set: async o => { Object.assign(mem, structuredClone(o)); }, remove: async k => { delete mem[k]; } }, onChanged: { addListener() {} } } },
    console: { log() {}, warn() {}, error: console.error }, structuredClone, Blob, Response, CompressionStream, DecompressionStream, TextEncoder, TextDecoder, btoa, atob, Promise, JSON, Date, Math,
    setTimeout: (f, ms) => { timers.set(++tid, { f, ms }); return tid; }, clearTimeout: id => timers.delete(id),
    localStorage: { getItem: k => (k in ls ? ls[k] : null), setItem: (k, v) => { ls[k] = String(v); }, removeItem: k => { delete ls[k]; } },
    navigator: { onLine: true },
    location: { hostname: 'lexkite.com', protocol: 'https:', hash: '#/lesson', search: '' },
    document: { hidden: false, head: { appendChild() {} }, createElement: () => ({}), getElementById: () => null, querySelector: () => null, querySelectorAll: () => [], addEventListener: (e, f) => (dl[e] = dl[e] || []).push(f) },
    addEventListener: (e, f) => (wl[e] = wl[e] || []).push(f),
    fetch: srv.fetch, confirm: opt.confirm || (() => true),
    t: (s, v) => (v ? s.replace(/\{(\w+)\}/g, (_, k) => v[k]) : s),
    UI: { $: () => null, esc: x => x, toast() {}, modal() {}, icon: () => '' },
    App: { state: {}, need: async () => {}, load: async () => {}, route() {}, updateChrome() {}, meCss() {} },
    I18N: { lang: () => 'vi' }, IELTS_DATA: { INDEX: {} }, FIREBASE_CONFIG: { apiKey: 'test' }, LK_SYNC: { mode: 'auto', drive: false },
    scrollY: 0, scrollTo() {}, requestAnimationFrame: f => f(),
  };
  sb.self = sb; sb.window = sb; sb.globalThis = sb; vm.createContext(sb);
  vm.runInContext(CORE, sb);
  sb.Game = { get: async () => sb.Core.Store.get('game', null) };
  vm.runInContext(SYNC, sb);
  const S = sb.Sync, C = sb.Core;
  return {
    sb, S, C, mem, timers,
    login(uid) { S.user = { uid, email: uid + '@test', displayName: uid, getIdToken: async () => uid }; S.mode = 'd1'; },
    async logout() { await S.now(); S.user = null; },
    sync: () => S.now(),
    fire: (e, doc) => Promise.all(((doc ? dl : wl)[e] || []).map(f => f({}))),
    cards: () => C.Cards.all(),
    add: (word, extra = {}) => C.Cards.add({ word, meaning: 'm-' + word, ...extra }),
    edit: (word, patch) => C.Cards.mutate(m => { m[word] = { ...m[word], ...patch }; return m; }),
    runTimers: async () => { const all = [...timers.entries()]; timers.clear(); for (const [, { f }] of all) f(); await tick(); },
  };
}

// ---------- 1) thuộc tính gộp (ngẫu nhiên, có hạt giống) ----------
let seed = 7; const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
const D0 = device(server()), M = D0.S._merge;
const rcard = w => ({ word: w, added: 1000 + Math.floor(rnd() * 50), mod: Math.floor(rnd() * 100), srs: { last: Math.floor(rnd() * 100) }, contexts: rnd() < 0.5 ? [{ text: 'c' + Math.floor(rnd() * 3) }] : [] });
const rset = () => { const o = {}; for (let i = 0; i < 12; i++) if (rnd() < 0.6) o['w' + i] = rcard('w' + i); return o; };
const act = c => Math.max(c.srs && c.srs.last || 0, c.added || 0, c.mod || 0);
const J = o => JSON.stringify(Object.keys(o).sort().map(k => [k, o[k]]));
let propFail = 0;
for (let r = 0; r < 300; r++) {
  const a = rset(), b = rset(), del = {}; for (let i = 0; i < 12; i++) if (rnd() < 0.15) del['w' + i] = 1000 + Math.floor(rnd() * 100);
  const ab = M.cards(a, b, del), ba = M.cards(b, a, del);
  if (J(ab) !== J(ba)) propFail++;
  if (J(M.cards(ab, b, del)) !== J(ab)) propFail++;
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) { const best = [a[k], b[k]].filter(Boolean).reduce((x, y) => (act(y) > act(x) ? y : x)); if (!ab[k] && !(del[k] > act(best))) propFail++; if (ab[k] && act(ab[k]) < act(best)) propFail++; }
}
ok(propFail === 0, `gộp thẻ: giao hoán + lũy đẳng + không mất (300 vòng, ${propFail} lỗi)`);
const g = M.game({ xp: 10, days: {}, onlyA: 1 }, { xp: 20, days: {}, onlyB: { x: 1 } });
ok(g.onlyA === 1 && g.onlyB && g.onlyB.x === 1 && g.xp === 20, 'gộp game giữ trường chỉ có ở 1 bản');
ok(J(M.game({ xp: 5, days: { d: { xp: 3 } }, total: {} }, { xp: 7, days: { d: { xp: 4 } }, total: {} })) === J(M.game({ xp: 7, days: { d: { xp: 4 } }, total: {} }, { xp: 5, days: { d: { xp: 3 } }, total: {} })), 'gộp game giao hoán');

// ---------- 2) khách → đăng nhập → gộp (không hỏi, không mất) ----------
{
  const srv = server(), old = device(srv); old.login('u1'); await old.add('alpha'); await old.add('beta'); await old.sync();
  const asked = []; const d = device(srv, { confirm: m => (asked.push(m), true) });
  await d.add('gamma'); await d.add('beta', { note: 'mine' });
  d.login('u1'); await d.sync();
  const c = await d.cards();
  ok(['alpha', 'beta', 'gamma'].every(w => c[w]), 'khách → tài khoản: hợp thẻ máy + tài khoản');
  ok(asked.length === 0, 'khách → tài khoản: không hỏi');
  const fresh = device(srv); fresh.login('u1'); await fresh.sync();
  ok(Object.keys(await fresh.cards()).sort().join() === 'alpha,beta,gamma', 'máy thứ 3 thấy đủ thẻ sau khi gộp');
}

// ---------- 3) 2 thiết bị sửa cùng thẻ → mốc sau thắng, thẻ mới 2 bên giữ cả ----------
{
  const srv = server(), A = device(srv), B = device(srv);
  A.login('u2'); B.login('u2'); await A.add('x'); await A.sync(); await B.sync();
  await A.edit('x', { note: 'A', mod: Date.now() + 1000 }); await A.add('onlya');
  await B.edit('x', { note: 'B', mod: Date.now() + 2000 }); await B.add('onlyb');
  await A.sync(); await B.sync(); await A.sync();
  const a = await A.cards(), b = await B.cards();
  ok(a.x.note === 'B' && b.x.note === 'B', '2 thiết bị: bản sửa sau thắng ở cả 2 máy');
  ok(a.onlya && a.onlyb && b.onlya && b.onlyb, '2 thiết bị: thẻ mới 2 bên đều còn');
}

// ---------- 4) offline → online: không báo lỗi, tự gửi lại ----------
{
  const srv = server(), d = device(srv); d.login('u3');
  srv.down = true; d.sb.navigator.onLine = false; await d.add('off1'); await d.sync();
  ok(d.S.status === 'ok', 'offline: trạng thái kín đáo (không "lỗi")');
  ok([...d.timers.values()].some(x => x.ms === 30000), 'offline: hẹn thử lại 30 s');
  srv.down = false; d.sb.navigator.onLine = true; await d.fire('online');
  ok(srv.rows.u3 && srv.rows.u3.meta, 'online: tự gửi lại ngay khi có mạng');
  const other = device(srv); other.login('u3'); await other.sync();
  ok((await other.cards()).off1, 'online: máy khác thấy thẻ học lúc offline');
  srv.down = true; d.sb.navigator.onLine = true; await d.sync();
  ok([...d.timers.values()].some(x => x.ms === 30000), 'lỗi mạng khi online: vẫn hẹn thử lại');
}

// ---------- 5) đua lệnh: trả lời/ghi thẻ trong lúc chờ mạng không bị đè ----------
{
  const srv = server(), old = device(srv); old.login('u4'); await old.add('r1'); await old.sync();
  const d = device(srv); d.login('u4'); let midway;
  srv.delay = () => { srv.delay = null; midway = d.add('typedduringpull'); return midway; };
  await d.sync(); await midway;
  const c = await d.cards();
  ok(c.typedduringpull && c.r1, 'đua lệnh: thẻ ghi giữa lúc kéo vẫn còn sau gộp');
}

// ---------- 6) kéo đôi khi đăng nhập (redirect + onAuth) → 1 lượt ----------
{
  const srv = server(), d = device(srv); d.login('u5');
  await Promise.all([d.sync(), d.sync()]);
  ok(srv.calls.pull === 1, `kéo đôi: chỉ 1 lượt kéo (${srv.calls.pull})`);
}

// ---------- 7) đổi tài khoản: WebView chặn hộp thoại → không xóa; Hủy thật → có bản sao, khôi phục được ----------
{
  const srv = server(), d = device(srv, { confirm: () => false });
  d.login('a'); await d.add('minea'); await d.sync();
  d.login('b'); await d.sync();
  ok((await d.cards()).minea, 'WebView (confirm trả về ngay): không xóa dữ liệu máy');
  const s = device(srv, { confirm: () => { const t = Date.now(); while (Date.now() - t < 60); return false; } });
  s.login('a'); await s.add('keepme'); await s.sync();
  srv.down = true; s.sb.navigator.onLine = false; await s.add('unsynced'); await s.sync(); srv.down = false; s.sb.navigator.onLine = true;
  s.login('c'); await s.sync();
  ok(!(await s.cards()).unsynced, 'Hủy thật: dùng dữ liệu tài khoản mới');
  const bk = await s.C.Store.get('acctBackup', null);
  ok(bk && bk.uid === 'a' && bk.cards.unsynced, 'Hủy thật: giữ bản sao dữ liệu chưa đồng bộ');
  ok(await s.S.restoreBackup() && (await s.cards()).unsynced, 'khôi phục bản sao: gộp lại không mất');
}

// ---------- 8) đăng xuất → đăng nhập lại cùng tài khoản: không hỏi, không trùng ----------
{
  const srv = server(), asked = []; const d = device(srv, { confirm: () => (asked.push(1), true) });
  d.login('u6'); await d.add('p'); await d.sync(); await d.logout(); await d.add('q');
  d.login('u6'); await d.sync();
  const c = await d.cards();
  ok(c.p && c.q && Object.keys(c).length === 2 && asked.length === 0, 'đăng xuất/đăng nhập lại: giữ đủ, không hỏi');
}

// ---------- 9) tỉ lệ lỗi đồng bộ: N vòng 2 thiết bị ngẫu nhiên, mạng chập chờn → hội tụ ----------
{
  const N = 40; let bad = 0;
  for (let r = 0; r < N; r++) {
    const srv = server(), A = device(srv), B = device(srv); A.login('z' + r); B.login('z' + r);
    const words = new Set();
    for (let s = 0; s < 6; s++) {
      const D = rnd() < 0.5 ? A : B, w = 'k' + Math.floor(rnd() * 8); words.add(w);
      await D.add(w); srv.down = rnd() < 0.3; D.sb.navigator.onLine = !srv.down; await D.sync();
    }
    srv.down = false; A.sb.navigator.onLine = B.sb.navigator.onLine = true;
    await A.sync(); await B.sync(); await A.sync();
    const a = await A.cards(), b = await B.cards();
    if (J(Object.keys(a).sort()) !== J([...words].sort()) || J(Object.keys(b).sort()) !== J([...words].sort())) bad++;
  }
  ok(bad === 0, `tỉ lệ lỗi đồng bộ ${bad}/${N}`);
  console.log(`account-flow: tỉ lệ lỗi đồng bộ ${(bad / N * 100).toFixed(1)}% (${bad}/${N} vòng, mạng rớt 30%)`);
}

console.log(fails ? `account-flow: ${fails}/${n} lỗi` : `account-flow: ${n} kiểm tra OK`);
process.exit(fails ? 1 : 0);
