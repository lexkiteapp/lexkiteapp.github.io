// 🎨 Xưởng Stitch v3: chạy hàng việc Stitch (sinh màn / sửa sang tối / phương án) qua Stitch MCP (HTTP JSON-RPC), xoay 3 khoá.
//   Khoá đọc từ ~/.config/lexkite/stitch-key{,-2,-3} — KHÔNG in, KHÔNG ghi ra file. Mỗi khoá có project + design system riêng
//   (project của tài khoản này 403 với khoá tài khoản khác) → việc 'edit'/'variants' chạy đúng khoá đã sinh màn gốc.
//   Hàng việc (JSON mảng): { id: "<màn>", mode: "light"|"dark", kind: "gen"|"edit"|"variants", prompt, device?: "MOBILE"|"DESKTOP",
//     from?: "<id>/<mode>" (màn gốc cho edit/variants), count?: 2..3 (variants) }
//   Đầu ra: out/stitch/v3/<id>/<mode>[-vN].{html,png} + out/stitch/v3/state.json (trạng thái từng việc theo hash prompt, credit theo khoá/ngày).
//   Chạy lại = tiếp tục: việc đã 'done' (cùng hash) bỏ qua; khoá hết hạn mức (429/RESOURCE_EXHAUSTED/"limit") nghỉ 15 phút rồi thử lại.
//   Dùng: node scripts/stitch/batch.mjs <queue.json> [--out out/stitch/v3] [--only id1,id2] [--max N] [--dry]
import { spawnSync } from 'node:child_process';
// fetch của Node chỉ đi qua proxy hệ thống (HTTPS_PROXY, sandbox) khi bật NODE_USE_ENV_PROXY → tự chạy lại với cờ đó.
if ((process.env.HTTPS_PROXY || process.env.https_proxy) && !process.env.NODE_USE_ENV_PROXY) process.exit(spawnSync(process.execPath, process.argv.slice(1), { stdio: 'inherit', env: { ...process.env, NODE_USE_ENV_PROXY: '1' } }).status ?? 1);
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os'; import crypto from 'node:crypto';
const argv = process.argv.slice(2), opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const QUEUE = argv.find(a => !a.startsWith('--') && !argv[argv.indexOf(a) - 1]?.startsWith('--')), OUT = opt('--out', 'out/stitch/v3');
const ONLY = opt('--only', '')?.split(',').filter(Boolean), MAX = +opt('--max', 1e9), DRY = argv.includes('--dry');
const URL = 'https://stitch.googleapis.com/mcp', DAILY = 400, REST_MS = 15 * 60e3, CALL_MS = 8 * 60e3;
// Project + design system (Lexkite Kit) của từng tài khoản – xem side-session-notes/stitch-quota.md
const KEYS = [
  { name: 'key1', file: 'stitch-key', project: '7268539912208977707', ds: 'assets/1b7a8a3d3d52404bb332d9ba3f783547' },
  { name: 'key2', file: 'stitch-key-2', project: '10804635390057604965', ds: 'assets/11359391721543991869' },
  { name: 'key3', file: 'stitch-key-3', project: '18075333702575270507', ds: 'assets/16469239436252875897' },
  // key4/key5: tài khoản mới (chủ cấp 3/11) – project "Lexkite Refs – keyN" + bản sao Lexkite Kit, nằm trong vòng xoay.
  { name: 'key4', file: 'stitch-key-4', project: '16660982915050208874', ds: 'assets/17569290422438999179' },
  { name: 'key5', file: 'stitch-key-5', project: '7022870386131391655', ds: 'assets/4309515870425200974' },
].map(k => { try { return { ...k, key: fs.readFileSync(path.join(os.homedir(), '.config/lexkite', k.file), 'utf8').trim() }; } catch { return null; } }).filter(k => k && (!k.reserve || k.project || (console.error('key4 dự phòng: thiếu --reserve-project → bỏ qua'), false)));
const SF = path.join(OUT, 'state.json'), day = new Date().toLocaleDateString('sv', { timeZone: 'Asia/Ho_Chi_Minh' });
const st = fs.existsSync(SF) ? JSON.parse(fs.readFileSync(SF, 'utf8')) : { jobs: {}, credits: {} };
const save = () => { fs.mkdirSync(OUT, { recursive: true }); fs.writeFileSync(SF + '.tmp', JSON.stringify(st, null, 1)); fs.renameSync(SF + '.tmp', SF); };
const cred = k => (st.credits[day] ??= {})[k] ??= { used: 0, fail: 0, limitedAt: null };
const hash = j => crypto.createHash('sha1').update(JSON.stringify([j.kind || 'gen', j.from || '', j.device || 'MOBILE', j.count || 0, j.prompt])).digest('hex').slice(0, 12);
const tag = j => `${j.id}/${j.mode}`;
const latest = t => Object.values(st.jobs).filter(x => x.tag === t && x.status === 'done').sort((a, b) => String(b.at).localeCompare(String(a.at)))[0];
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

async function rpc(k, name, args) {
  const ac = new AbortController(), t = setTimeout(() => ac.abort(), CALL_MS);
  try {
    const r = await fetch(URL, { method: 'POST', signal: ac.signal, headers: { 'X-Goog-Api-Key': k.key, 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
      body: JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method: 'tools/call', params: { name, arguments: args } }) });
    let txt = await r.text(); if (txt.startsWith('event:') || txt.startsWith('data:')) txt = txt.split('\n').filter(l => l.startsWith('data:')).map(l => l.slice(5)).pop() || '';
    if (r.status === 429) return { limit: true, err: 'HTTP 429' };
    let j; try { j = JSON.parse(txt); } catch { return { err: `HTTP ${r.status} ${txt.slice(0, 160)}` }; }
    const res = j.result, text = (res?.content || []).map(c => c.text || '').join('\n'), err = j.error?.message || (res?.isError ? text : '');
    if (err) return { limit: /quota|rate.?limit|RESOURCE_EXHAUSTED|daily limit|too many/i.test(err), err: err.slice(0, 200) };
    let data = res.structuredContent; if (!data) try { data = JSON.parse(text); } catch { data = text; }
    return { data };
  } catch (e) { return { err: e.name === 'AbortError' ? 'timeout' : String(e.message).slice(0, 120), timeout: e.name === 'AbortError' }; }
  finally { clearTimeout(t); }
}
// Tìm mọi màn trong phản hồi (cấu trúc lồng nhau tuỳ tool): object có htmlCode/screenshot + name/id.
function screens(d, acc = []) {
  if (d && typeof d === 'object') { if (d.htmlCode || d.screenshot) acc.push(d); for (const v of Object.values(d)) screens(v, acc); }
  return acc;
}
const sid = s => String(s.id || s.name || '').split('/').pop();
async function grab(k, u, f) { if (!u) return false; const r = await fetch(u, { headers: { 'X-Goog-Api-Key': k.key }, signal: AbortSignal.timeout(120e3) }).catch(() => null); if (!r) return false; // tải file Stitch cần khoá if (!r.ok) return false;
  const b = Buffer.from(await r.arrayBuffer()); let out = b; // :download trả JSON { dataString } (ảnh = base64, HTML = chữ thường)
  try { const o = JSON.parse(b.toString('utf8')); if (o.error) return false; const d = o.dataString; if (typeof d === 'string') out = /^\s*</.test(d) ? Buffer.from(d, 'utf8') : Buffer.from(d, 'base64'); } catch {}
  fs.writeFileSync(f, out); return true; }

async function run(job, k) {
  const h = hash(job), base = job.from && latest(job.from);
  if (job.from && !base) return 'wait';
  // Khoá gốc hết lượt → vẽ lại bản tối trên project khoá khác: sinh mới = prompt bản sáng + yêu cầu tối (không sửa được chéo project).
  const moved = base && base.key !== k.name; let lightPrompt = '';
  if (moved) { lightPrompt = queue.find(x => tag(x) === job.from)?.prompt || ''; if (!lightPrompt || job.kind !== 'edit') return 'otherkey'; }
  const args = { projectId: k.project, prompt: job.prompt, deviceType: job.device || 'MOBILE' };
  let tool = 'generate_screen_from_text';
  if (moved) { args.prompt = `${lightPrompt}\n\nRender this screen in its DARK theme. ${job.prompt}`; args.designSystem = k.ds; }
  else if (job.kind === 'edit') { tool = 'edit_screens'; args.selectedScreenIds = [base.screenId]; }
  else if (job.kind === 'variants') { tool = 'generate_variants'; args.selectedScreenIds = [base.screenId]; args.variantOptions = { variantCount: job.count || 3, creativeRange: 'EXPLORE', aspects: ['LAYOUT', 'COLOR_SCHEME', 'TEXT_FONT'] }; }
  else args.designSystem = k.ds;
  if (DRY) { log('DRY', k.name, tool, tag(job)); return 'done'; }
  log('START', k.name, tool, tag(job)); const c = cred(k.name); c.used++; save();
  const r = await rpc(k, tool, args);
  if (r.limit) { c.used--; c.fail++; c.limitedAt = new Date().toISOString(); save(); log('LIMIT', k.name, r.err); return 'limit'; }
  if (r.err) { c.fail++; const tries = (st.jobs[h]?.tries || 0) + 1; // luật credit: dừng sau 2 lần hỏng
    st.jobs[h] = { tag: tag(job), key: k.name, status: r.timeout ? 'timeout' : tries >= 2 ? 'failed' : 'error', tries, err: r.err, at: new Date().toISOString() }; save(); log('ERR', k.name, tag(job), r.err); return 'error'; }
  let sc = screens(r.data).filter(s => sid(s)); const dir = path.join(OUT, job.id); fs.mkdirSync(dir, { recursive: true });
  // 3/11: edit_screens có thể sửa NGAY TRÊN màn gốc (sessionEvent.dom_operations) và không trả màn mới → lấy lại màn gốc đã sửa.
  if (!sc.length && tool === 'edit_screens' && JSON.stringify(r.data || '').includes('dom_operations')) {
    const g = await rpc(k, 'get_screen', { name: `projects/${k.project}/screens/${base.screenId}` }); sc = screens(g.data).filter(s => sid(s));
    if (sc.length) log('INPLACE', k.name, tag(job), base.screenId); }
  // "no screen" cũng là 1 lần hỏng có tốn lượt → cùng luật dừng sau 2 lần (3/11: gap-verbs/dark lặp 38 lượt vì nhánh này không đếm)
  if (!sc.length) { c.fail++; const tries = (st.jobs[h]?.tries || 0) + 1;
    st.jobs[h] = { tag: tag(job), key: k.name, status: tries >= 2 ? 'failed' : 'error', tries, err: 'no screen in response', at: new Date().toISOString() }; save(); log('ERR', k.name, tag(job), 'no screen', 'try', tries); return 'error'; }
  const pick = job.kind === 'variants' ? sc.filter(s => sid(s) !== base.screenId) : sc.slice(-1), ids = [];
  for (const [i, s] of pick.entries()) {
    const stem = job.kind === 'variants' ? `${job.mode}-v${i + 1}` : job.mode;
    await grab(k, s.htmlCode?.downloadUrl, path.join(dir, stem + '.html')); await grab(k, s.screenshot?.downloadUrl, path.join(dir, stem + '.png'));
    ids.push(sid(s));
  }
  st.jobs[h] = { tag: tag(job), key: k.name, project: k.project, status: 'done', screenId: ids[0], variants: job.kind === 'variants' ? ids : undefined, at: new Date().toISOString() };
  save(); if (job.kind === 'variants') registerVariants(); log('DONE', k.name, tag(job), ids.join(','));
  return 'done';
}

// Phương án (variants) → mỗi phương án thành màn riêng '<id>-vN' (light đã có) để việc 'edit' sang tối + QC chấm đủ cặp.
function registerVariants() {
  for (const j of Object.values(st.jobs)) if (j.status === 'done' && j.variants) j.variants.forEach((sid, i) => {
    const [id, mode] = j.tag.split('/'), vid = `${id}-v${i + 1}`, t = `${vid}/${mode}`;
    if (!Object.values(st.jobs).some(x => x.tag === t)) st.jobs['var-' + sid] = { tag: t, key: j.key, project: j.project, status: 'done', screenId: sid, at: j.at };
    fs.mkdirSync(path.join(OUT, vid), { recursive: true });
    for (const ext of ['html', 'png']) { const a = path.join(OUT, id, `${mode}-v${i + 1}.${ext}`), b = path.join(OUT, vid, `${mode}.${ext}`); if (fs.existsSync(a) && !fs.existsSync(b)) fs.copyFileSync(a, b); }
  });
  save();
}
registerVariants();
// Dừng êm: tạo file <out>/STOP → không nhận việc mới, chờ việc đang chạy xong.
const stopped = () => fs.existsSync(path.join(OUT, 'STOP'));
const queue = JSON.parse(fs.readFileSync(QUEUE, 'utf8')).filter(j => !ONLY?.length || ONLY.includes(j.id));
const isDone = j => st.jobs[hash(j)]?.status === 'done' || ['timeout', 'failed'].includes(st.jobs[hash(j)]?.status);
let started = 0; const busy = new Set();
async function worker(k) {
  for (;;) {
    const c = cred(k.name);
    if (c.limitedAt && Date.now() - Date.parse(c.limitedAt) < REST_MS) { await new Promise(r => setTimeout(r, 60e3)); if (allLimited()) return; continue; }
    if (c.used >= DAILY || started >= MAX || stopped()) return;
    // Việc gen tự do chọn khoá; edit/variants phải về đúng khoá của màn gốc.
    const job = queue.find(j => !isDone(j) && !busy.has(hash(j)) && (() => {
      if (!j.from) return true; const b = latest(j.from); if (!b) return false; if (b.key === k.name) return true;
      const bc = cred(b.key); return j.kind === 'edit' && !!bc.limitedAt && Date.now() - Date.parse(bc.limitedAt) < REST_MS && queue.some(x => tag(x) === j.from); })());
    if (!job) { if (queue.some(j => !isDone(j) && busy.size)) { await new Promise(r => setTimeout(r, 20e3)); continue; } return; }
    busy.add(hash(job)); started++;
    const r = await run(job, k); busy.delete(hash(job));
    if (r === 'limit') started--;
  }
}
// --wait-hours N: khi cả 3 khoá hết lượt, vẫn thử lại mỗi 15 phút trong N giờ (cửa sổ 24h trượt mở dần) thay vì thoát.
const T0 = Date.now(), WAIT_H = +opt('--wait-hours', 0);
const allLimited = () => Date.now() - T0 >= WAIT_H * 3600e3 && KEYS.every(k => { const c = cred(k.name); return c.used >= DAILY || (c.limitedAt && Date.now() - Date.parse(c.limitedAt) < 6 * 3600e3 && c.fail >= 6); });
log(`queue ${queue.length}, done ${queue.filter(isDone).length}, keys ${KEYS.map(k => k.name).join(',')}`);
await Promise.all(KEYS.flatMap(k => [worker(k), worker(k)])); // 2 luồng/khoá
const left = queue.filter(j => !isDone(j)).length;
log('END', JSON.stringify(st.credits[day]), `left ${left}`);
fs.writeFileSync(path.join(OUT, 'CREDITS.md'), `# Stitch v3 – credit theo khoá (${day}, giờ VN)\n| khoá | đã dùng | lỗi/hạn mức | còn ước tính (/${DAILY}) | hết lúc |\n|---|---|---|---|---|\n` +
  KEYS.map(k => { const c = cred(k.name); return `| ${k.name} | ${c.used} | ${c.fail} | ${c.limitedAt ? 0 : DAILY - c.used} | ${c.limitedAt || '-'} |`; }).join('\n') + `\n\nViệc còn lại: ${left}\n`);
