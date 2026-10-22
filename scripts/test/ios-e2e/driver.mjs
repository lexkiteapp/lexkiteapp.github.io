// Máy chủ điều khiển kiểm thử iOS trên Simulator (chạy trên máy macOS của GitHub Actions – workflow ios-e2e.yml).
// Cài app (bản build giả lập đã chèn harness.js), mở app, đọc sự kiện harness ghi ra Documents/e2e/events.jsonl,
// chụp màn hình / chạy lệnh simctl theo yêu cầu, tự mở lại app khi treo/chết. Kết quả: <out>/<tag>/results.json + shots/.
// Dùng: node scripts/test/ios-e2e/driver.mjs --app path/App.app --device "iPhone" --tag iphone --out e2e-out [--minutes 30]
import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const APP = arg('app'), DEVQ = arg('device', 'iPhone'), TAG = arg('tag', 'iphone'), OUT = path.resolve(arg('out', 'e2e-out'), TAG), MIN = +arg('minutes', 30);
const BUNDLE = 'com.lexkite.app';
fs.mkdirSync(path.join(OUT, 'shots'), { recursive: true });
const sim = (...a) => execFileSync('xcrun', ['simctl', ...a], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 120000 });
const simq = (...a) => { try { return sim(...a); } catch (e) { return 'ERR ' + String(e.stderr || e.message).slice(0, 300); } };
const log = (...a) => console.log(`[${TAG} ${new Date().toISOString().slice(11, 19)}]`, ...a);
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ---- chọn máy giả lập: runtime iOS mới nhất, tên khớp DEVQ ----
const list = JSON.parse(sim('list', 'devices', 'available', '-j')).devices;
const rts = Object.keys(list).filter(k => /iOS/.test(k)).sort((a, b) => { const v = s => s.replace(/.*iOS-/, '').split('-').map(Number); const [x, y] = [v(a), v(b)]; return (y[0] - x[0]) || ((y[1] || 0) - (x[1] || 0)); });
let dev = null;
for (const rt of rts) { const d = list[rt].filter(d => d.name.includes(DEVQ)).sort((a, b) => b.name.localeCompare(a.name, undefined, { numeric: true })); const pick = d.find(x => !/mini|SE|Air/.test(x.name)) || d[0]; if (pick) { dev = { ...pick, rt }; break; } }
if (!dev) { console.error('Không có máy giả lập khớp ' + DEVQ); process.exit(2); }
const U = dev.udid; log('Máy giả lập:', dev.name, dev.rt, U);
simq('shutdown', U); simq('erase', U);
sim('boot', U); sim('bootstatus', U, '-b');
simq('ui', U, 'appearance', 'light');
simq('status_bar', U, 'override', '--time', '9:41', '--batteryState', 'charged', '--batteryLevel', '100');
sim('install', U, APP);
for (const s of ['microphone', 'media-library']) simq('privacy', U, 'grant', s, BUNDLE);
const DATA = sim('get_app_container', U, BUNDLE, 'data').trim();
const E2E = path.join(DATA, 'Documents', 'e2e'); fs.mkdirSync(E2E, { recursive: true });
const EV = path.join(E2E, 'events.jsonl');
// nhật ký hệ thống: lỗi của tiến trình app + WebContent (crash WebView, ATS, sandbox…)
const syslog = fs.createWriteStream(path.join(OUT, 'syslog.txt'));
const ls = spawn('xcrun', ['simctl', 'spawn', U, 'log', 'stream', '--style', 'compact', '--level', 'default', '--predicate',
  '(process == "App" OR process CONTAINS "WebContent" OR process CONTAINS "Networking") AND (messageType == error OR messageType == fault OR eventMessage CONTAINS[c] "error" OR eventMessage CONTAINS "⚡️")'], { stdio: ['ignore', 'pipe', 'pipe'] });
ls.stdout.pipe(syslog);
let launches = 0;
function launch() {
  launches++;
  simq('terminate', U, BUNDLE);
  const r = simq('launch', '--terminate-running-process', `--stdout=${path.join(OUT, 'app-stdout.txt')}`, `--stderr=${path.join(OUT, 'app-stderr.txt')}`, U, BUNDLE);
  log('launch #' + launches, r.trim());
}
const events = [], shots = [];
let off = 0, lastEv = Date.now(), done = false, relaunches = 0;
// ảnh JPEG thu nhỏ (cạnh dài 1400 px) → artifact nhẹ, tải về nhanh
function shotTo(file) {
  const png = file.replace(/\.jpg$/, '.png'); const r = simq('io', U, 'screenshot', '--type=png', png);
  try { execFileSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '72', '-Z', '1400', png, '--out', file], { stdio: 'ignore' }); fs.unlinkSync(png); } catch (e) { /* giữ PNG */ }
  return r;
}
// Bảng đăng nhập gốc (Google: hộp "… muốn dùng google.com để đăng nhập"; Apple: bảng ASAuthorizationController) → chụp rồi bấm Hủy.
// Đọc giao diện hệ thống bằng AXe (cameroncooke/axe, cài trong workflow native-auth-e2e.yml); thiếu AXe → chỉ chụp ảnh.
const axeRun = (...a) => execFileSync('axe', [...a, '--udid', U], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 60000 });
const frameOf = n => { const f = n.frame || n.AXFrame; if (f && typeof f === 'object') return f; const m = /\{\{([\d.-]+),\s*([\d.-]+)\},\s*\{([\d.-]+),\s*([\d.-]+)\}\}/.exec(String(f || '')); return m ? { x: +m[1], y: +m[2], width: +m[3], height: +m[4] } : null; };
const labOf = n => String(n.AXLabel || n.label || n.title || n.AXValue || '');
function axeFlat() { const flat = []; const walk = n => { if (Array.isArray(n)) return n.forEach(walk); if (!n || typeof n !== 'object') return; flat.push(n); walk(n.children || []); }; walk(JSON.parse(axeRun('describe-ui'))); return flat; }
async function nativeSheet(p) {
  const out = { provider: p, axe: false, found: false, labels: [], tapped: '' };
  try { execFileSync('axe', ['--version'], { stdio: 'ignore' }); out.axe = true; } catch (e) { /* không có AXe */ }
  const SHEET = /google\.com|Sign In|Sign in|Apple Account|Apple ID|Continue|Use Password|Settings|iCloud|Đăng nhập/;
  let btn = null;
  for (let k = 0; k < 14; k++) {
    await sleep(1500);
    if (!out.axe) { if (k >= 3) break; continue; }
    let flat; try { flat = axeFlat(); } catch (e) { out.err = String(e.stderr || e.message).slice(0, 200); continue; }
    out.labels = [...new Set(flat.map(labOf).filter(Boolean))].slice(0, 40);
    btn = flat.find(n => /^(Cancel|Close|Not Now|Hủy|Đóng)$/i.test(labOf(n).trim()) && frameOf(n));
    if (btn || flat.some(n => SHEET.test(labOf(n)) && !/Lexkite|Tiếp tục với|Continue with/.test(labOf(n)))) { out.found = true; if (btn) { await sleep(1200); break; } }
  }
  const f1 = `${String(shots.length + 1).padStart(3, '0')}-native-${p}.jpg`; shotTo(path.join(OUT, 'shots', f1)); shots.push({ file: f1, name: 'native-' + p });
  if (btn) {
    const f = frameOf(btn);
    try { axeRun('tap', '-x', String(Math.round(f.x + f.width / 2)), '-y', String(Math.round(f.y + f.height / 2))); out.tapped = labOf(btn); } catch (e) { out.tapErr = String(e.stderr || e.message).slice(0, 200); }
  } else if (out.axe) { try { axeRun('tap', '--label', 'Cancel'); out.tapped = 'Cancel(label)'; } catch (e) { out.tapErr = String(e.stderr || e.message).slice(0, 200); } }
  await sleep(2500);
  log('nativesheet', p, JSON.stringify(out).slice(0, 600));
  return out;
}
const ack = (id, v) => fs.writeFileSync(path.join(E2E, 'ack-' + id), String(v || 'ok'));
async function handle(ev) {
  events.push(ev);
  if (ev.type === 'shot') {
    const file = `${String(shots.length + 1).padStart(3, '0')}-${String(ev.name).replace(/[^\w.-]+/g, '_').slice(0, 60)}.jpg`;
    await sleep(250);
    const r = shotTo(path.join(OUT, 'shots', file));
    shots.push({ file, name: ev.name, step: ev.step, lang: ev.lang, ok: !/^ERR/.test(r) });
    ack(ev.id);
  } else if (ev.type === 'host') {
    log('host', ev.cmd, ev.url || ev.mode || '');
    if (ev.cmd === 'appearance') { simq('ui', U, 'appearance', ev.mode); ack(ev.id); }
    else if (ev.cmd === 'openurl') { const r = simq('openurl', U, ev.url); ack(ev.id, r.slice(0, 200) || 'ok'); }
    else if (ev.cmd === 'nativesheet') { const r = await nativeSheet(ev.provider); ack(ev.id, JSON.stringify(r)); }
    else if (ev.cmd === 'relaunch') { await sleep(500); launch(); }
    else if (ev.cmd === 'checksafari') { // liên kết ngoài phải mở Safari → kiểm tiến trình Safari rồi đưa app về trước
      let on = false; for (let k = 0; k < 20 && !on; k++) { await sleep(2000); on = /mobilesafari/i.test(simq('spawn', U, 'launchctl', 'list')); } // Safari lần đầu khởi động rất chậm trên máy CI (> 10 s)
      await sleep(on ? 3000 : 0);
      shotTo(path.join(OUT, 'shots', `${String(shots.length + 1).padStart(3, '0')}-safari.jpg`)); shots.push({ file: `${String(shots.length + 1).padStart(3, '0')}-safari.jpg`, name: 'safari', step: ev.step });
      ack(ev.id, on ? 'running' : 'not-running'); simq('launch', U, BUNDLE); }
  } else if (ev.type === 'step') {
    const n = (ev.issues || []).length; log((n ? '✗ ' : '✓ ') + ev.step + (n ? ' – ' + ev.issues.map(i => i.kind + ': ' + i.msg).join(' | ').slice(0, 300) : ''));
  } else if (ev.type === 'done') { done = true; }
  else if (ev.type === 'fatal') log('FATAL harness', ev.msg);
}
launch();
const deadline = Date.now() + MIN * 60000;
while (!done && Date.now() < deadline) {
  await sleep(300);
  let buf = '';
  try { const st = fs.statSync(EV); if (st.size > off) { const fd = fs.openSync(EV, 'r'); const b = Buffer.alloc(st.size - off); fs.readSync(fd, b, 0, b.length, off); fs.closeSync(fd); buf = b.toString('utf8'); } } catch (e) { /* chưa có file */ }
  if (buf) {
    const lastNl = buf.lastIndexOf('\n'); if (lastNl < 0) continue;
    off += Buffer.byteLength(buf.slice(0, lastNl + 1));
    for (const line of buf.slice(0, lastNl).split('\n')) { if (!line.trim()) continue; let ev; try { ev = JSON.parse(line); } catch (e) { continue; } lastEv = Date.now(); await handle(ev); lastEv = Date.now(); }
  }
  // treo / app chết / rời app (trang web tĩnh không có harness) → mở lại app, harness tự đánh dấu bước lỗi và đi tiếp
  if (Date.now() - lastEv > 45000) {
    relaunches++; log('Không có sự kiện 45 s → mở lại app (lần ' + relaunches + ')');
    if (relaunches > 12) { log('Quá nhiều lần mở lại – dừng'); break; }
    shotTo(path.join(OUT, 'shots', `stall-${relaunches}.jpg`)); shots.push({ file: `stall-${relaunches}.jpg`, name: 'stall ' + relaunches, step: (events.filter(e => e.type === 'begin').at(-1) || {}).step });
    launch(); lastEv = Date.now();
  }
}
// crash log của app (nếu có)
const crashes = [];
try { const dir = path.join(process.env.HOME, 'Library/Logs/DiagnosticReports'); for (const f of fs.readdirSync(dir)) if (/^App[-_]/.test(f) && fs.statSync(path.join(dir, f)).mtimeMs > Date.now() - MIN * 60000 - 600000) { crashes.push(f); fs.copyFileSync(path.join(dir, f), path.join(OUT, f)); } } catch (e) { /* không có */ }
ls.kill();
// Chẩn đoán mạng của máy CI (để phân biệt lỗi app với dịch vụ ngoài chặn IP máy chủ / đang sập)
const netdiag = {};
for (const u of ['https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=vi&dt=t&q=sustainable', 'https://api.dictionaryapi.dev/api/v2/entries/en/sustainable', 'https://api.datamuse.com/sug?s=resil&max=3', 'https://lexkite.com/api/config', 'https://audio.lexkite.com/']) {
  try { netdiag[u.replace(/\?.*/, '')] = execFileSync('curl', ['-s', '-o', '/dev/null', '-m', '15', '-w', '%{http_code}', '-H', 'Origin: capacitor://localhost', u], { encoding: 'utf8' }); } catch (e) { netdiag[u] = 'ERR'; }
}
log('Mạng CI:', JSON.stringify(netdiag));
const res = { tag: TAG, netdiag, device: dev.name, runtime: dev.rt, done, launches, relaunches, crashes, events, shots };
fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(res, null, 1));
log(`Xong: done=${done} sự kiện=${events.length} ảnh=${shots.length} mở lại=${relaunches} crash=${crashes.length}`);
simq('shutdown', U);
// Workflow tự đỏ nếu kịch bản không chạy hết hoặc gần như không có dữ liệu (đừng tin "success")
if (!done || events.filter(e => e.type === 'step').length < +arg('minsteps', 20)) process.exit(1);
