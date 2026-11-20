#!/usr/bin/env node
// Watcher chuẩn dùng chung: squash-merge PR khi `required-gate` XANH. (17/11: watcher riêng của phiên SEO đọc required-gate như check-run
// → 3 giờ chỉ báo "none". required-gate là COMMIT STATUS, nên đọc /commits/{sha}/status.)
//   node scripts/ci/prwatch.mjs <PR>[@<sha>] ... [--every 150] [--max-min 180] [--keep-on-red] [--dry]
//   <PR>@<sha>: chờ tới khi head API = sha (GitHub trễ sau push) rồi mới xét, không xét nhầm commit cũ.
// Thoát: 0 mọi PR đã merge/đóng · 2 có PR đỏ (không --keep-on-red) · 3 hết thời gian · 1 lỗi cú pháp.
// Dùng qua scripts/ci/gh-api.mjs (ETag, né hạn mức). Test: scripts/test/prwatch.mjs.
import { ghApi, REPO } from './gh-api.mjs';
import { isMain } from '../lib/is-main.mjs';

/** Quyết định cho một lượt (thuần). pr: {merged,state,head:{sha},mergeable_state}; gate: {state,description}|null; want: sha chờ. */
export function decide(pr, gate, want) {
  if (pr.merged || pr.state === 'closed') return { act: 'done', why: 'đã merge/đóng' };
  const sha = pr.head.sha;
  if (want && !sha.startsWith(want)) return { act: 'wait', why: `chờ head ${want.slice(0, 9)} (API còn ${sha.slice(0, 9)})` };
  const st = gate ? gate.state : 'none';
  if (st === 'success') {
    if (pr.mergeable_state === 'dirty') return { act: 'red', why: 'xung đột (dirty): gộp main rồi push' };
    if (pr.mergeable_state === 'blocked' || pr.mergeable_state === 'behind') return { act: 'wait', why: `gate xanh nhưng mergeable_state=${pr.mergeable_state}` };
    return { act: 'merge', why: 'required-gate xanh' };
  }
  if (st === 'failure' || st === 'error') return { act: 'red', why: `required-gate ${st}: ${(gate.description || '').slice(0, 110)}` };
  return { act: 'wait', why: `required-gate ${st}${gate?.description && /khung merge/i.test(gate.description) ? ' – ' + gate.description.slice(0, 90) : ''}` };
}
/** Đọc required-gate từ commit status (thuần theo dữ liệu /status). */
export function gateOf(combined) { return (combined?.statuses || []).find(s => s.context === 'required-gate') || null; }

export function parseArgs(argv) {
  const o = { prs: [], every: 150, maxMin: 180, keepOnRed: false, dry: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--every') o.every = +argv[++i]; else if (a === '--max-min') o.maxMin = +argv[++i];
    else if (a === '--keep-on-red') o.keepOnRed = true; else if (a === '--dry') o.dry = true;
    else if (/^\d+(@[0-9a-f]{7,40})?$/.test(a)) { const [n, s] = a.split('@'); o.prs.push({ n: +n, want: s || '' }); }
    else throw new Error(`đối số lạ: ${a}`);
  }
  if (!o.prs.length) throw new Error('cần ít nhất một PR');
  return o;
}

async function main() {
  const o = parseArgs(process.argv.slice(2));
  const gh = async (p, method = 'GET', data) => { const r = await ghApi(method, `/repos/${REPO}${p}`, { data: data && JSON.stringify(data) }); return { status: r.status, body: typeof r.body === 'string' ? JSON.parse(r.body || '{}') : r.body }; };
  const t0 = Date.now(), log = (...a) => console.log(new Date().toISOString().slice(11, 16), ...a);
  let pending = o.prs, red = false; const seen = {};
  while (pending.length) {
    const nxt = []; red = false;
    for (const { n, want } of pending) {
      let pr, gate = null;
      try { const r = await gh(`/pulls/${n}`); if (r.status >= 400) throw 0; pr = r.body; if (!pr.merged && pr.state !== 'closed') gate = gateOf((await gh(`/commits/${pr.head.sha}/status`)).body); } catch (e) { console.error(`${new Date().toISOString().slice(11, 16)} #${n} lỗi API: ${e?.cause?.code || e?.message || e}`); nxt.push({ n, want }); continue; }
      const d = decide(pr, gate, want);
      if (d.act === 'done') { log(n, d.why); continue; }
      if (d.act === 'merge') {
        if (o.dry) { log(n, 'SẼ MERGE (dry)'); continue; }
        const m = await gh(`/pulls/${n}/merge`, 'PUT', { merge_method: 'squash', sha: pr.head.sha });
        if (m.body.merged) { log(n, 'MERGED'); continue; }
        log(n, `merge lỗi: ${m.body.message || m.status}`); nxt.push({ n, want });
      } else if (d.act === 'red') {
        if (seen[n] !== pr.head.sha + d.why) { log(n, 'ĐỎ', pr.head.sha.slice(0, 9), d.why); seen[n] = pr.head.sha + d.why; }
        red = true; if (o.keepOnRed) nxt.push({ n, want });
      } else nxt.push({ n, want });
    }
    pending = nxt;
    if (!pending.length) break;
    if (red && !o.keepOnRed) { log('dừng: có PR đỏ; còn chờ', pending.map(p => p.n).join(',')); process.exit(2); }
    if (Date.now() - t0 > o.maxMin * 60000) { log('hết thời gian; còn chờ', pending.map(p => p.n).join(',')); process.exit(3); }
    await new Promise(r => setTimeout(r, o.every * 1000));
  }
  log('xong'); process.exit(red && !o.keepOnRed ? 2 : 0);
}
if (isMain(import.meta.url)) main().catch(e => { console.error(e.message); process.exit(1); });
