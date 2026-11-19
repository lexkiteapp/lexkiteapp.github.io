// OpenTimestamps cho sổ băm nội dung (bằng chứng tồn tại neo vào Bitcoin, miễn phí). Thư viện: scripts/lib/content-registry.mjs.
// CHỈ CHẠY TRÊN CI (blog-publish.yml, content-protect.yml): cần `pip install opentimestamps-client` (lệnh `ots`).
//   node scripts/ots.mjs stamp      đóng dấu mọi mục sổ chưa có content/protection/ots/<hash>.ots (1 lệnh `ots stamp` cho cả lô)
//   node scripts/ots.mjs upgrade    gắn xác nhận Bitcoin cho bằng chứng còn "pending" (sau ~1–12 giờ lịch công khai mới neo vào khối)
//   node scripts/ots.mjs status     đếm bằng chứng: bitcoin / pending / thiếu (không gọi mạng)
//   node scripts/ots.mjs export <seq|hash|url> [--out dir]   ghi tệp đã đóng dấu (dòng JSON) + .ots để kiểm ở opentimestamps.org
//   node scripts/ots.mjs verify <seq|hash|url>               chạy `ots verify` (cần ots; có Bitcoin Core thì kiểm trọn vẹn)
// Lỗi mạng/lịch công khai KHÔNG làm đỏ workflow (in ::warning::, exit 0) – bước sau lần chạy kế tiếp sẽ thử lại.
// Tài liệu: docs/CONTENT-PROTECTION.md §4b.
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawnSync } from 'node:child_process';
import { REGISTRY, OTS_DIR, otsPending, otsPath, otsState, registryLines } from './lib/content-registry.mjs';

const [cmd, ...rest] = process.argv.slice(2), pos = rest.filter(a => !a.startsWith('--'));
const opt = (k, d) => { const i = rest.indexOf(k); return i >= 0 ? rest[i + 1] : d; };
const file = opt('--file', REGISTRY), dir = opt('--dir', OTS_DIR);
const warn = m => console.log(process.env.GITHUB_ACTIONS ? `::warning::${m}` : `⚠ ${m}`);
const ots = (...a) => spawnSync('ots', a, { encoding: 'utf8', timeout: 180e3 });
const haveOts = () => { const r = ots('--version'); return !r.error && r.status === 0; };
const tmpDir = () => fs.mkdtempSync(path.join(os.tmpdir(), 'lkots-'));
const proofs = () => (fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => /^[0-9a-f]{64}\.ots$/.test(f)).map(f => path.join(dir, f)) : []);
const find = key => {
  const all = registryLines(file).map(line => ({ entry: JSON.parse(line), line }));
  return all.find(({ entry: e }) => String(e.seq) === key || e.hash === key) || all.filter(({ entry: e }) => e.url === key).at(-1);
};

function stamp() {
  const todo = otsPending(file, dir);
  if (!todo.length) return console.log('· ots: mọi mục sổ đã có bằng chứng');
  if (!haveOts()) return warn('ots: chưa cài opentimestamps-client – bỏ qua đóng dấu (pip install opentimestamps-client)');
  const tmp = tmpDir(), files = todo.map(t => { const f = path.join(tmp, t.entry.hash); fs.writeFileSync(f, t.line); return f; });
  const r = ots('stamp', ...files);
  fs.mkdirSync(dir, { recursive: true });
  let ok = 0;
  todo.forEach((t, i) => { const p = files[i] + '.ots'; if (fs.existsSync(p)) { fs.copyFileSync(p, t.proof); ok++; } });
  fs.rmSync(tmp, { recursive: true, force: true });
  if (ok < todo.length) warn(`ots stamp: ${ok}/${todo.length} mục đóng dấu được${r.stderr ? ` – ${r.stderr.trim().split('\n').at(-1)}` : ''}; lần chạy sau thử lại`);
  console.log(`✓ ots stamp: ${ok} mục (#${todo.map(t => t.entry.seq).join(', #')}) → ${dir}/`);
}

function upgrade() {
  const pend = proofs().filter(p => otsState(fs.readFileSync(p)) !== 'bitcoin');
  if (!pend.length) return console.log('· ots upgrade: không còn bằng chứng pending');
  if (!haveOts()) return warn('ots: chưa cài opentimestamps-client – bỏ qua upgrade');
  let done = 0;
  for (const p of pend) {
    ots('upgrade', p);
    try { fs.rmSync(p + '.bak', { force: true }); } catch { /* không có bản sao lưu */ }
    if (otsState(fs.readFileSync(p)) === 'bitcoin') done++;
  }
  console.log(`✓ ots upgrade: ${done}/${pend.length} bằng chứng đã có xác nhận Bitcoin${done < pend.length ? ' (còn lại: lịch chưa neo vào khối – thử lại lần sau)' : ''}`);
}

function status() {
  const lines = registryLines(file), missing = otsPending(file, dir).length, st = proofs().map(p => otsState(fs.readFileSync(p)));
  const c = s => st.filter(x => x === s).length;
  console.log(`ots: ${lines.length} mục sổ · bằng chứng ${st.length} (bitcoin ${c('bitcoin')}, pending ${c('pending')}) · thiếu ${missing}`);
}

function exportOne(key, out) {
  const hit = key && find(key);
  if (!hit) { console.error(`✗ không thấy mục sổ "${key}"`); process.exit(2); }
  const proof = otsPath(hit.entry, dir);
  if (!fs.existsSync(proof)) { console.error(`✗ mục #${hit.entry.seq} chưa có bằng chứng ${proof} (CI đóng dấu ở lần chạy kế tiếp)`); process.exit(1); }
  fs.mkdirSync(out, { recursive: true });
  const f = path.join(out, `lexkite-registry-${hit.entry.seq}.json`);
  fs.writeFileSync(f, hit.line); fs.copyFileSync(proof, f + '.ots');
  return { f, entry: hit.entry, state: otsState(fs.readFileSync(proof)) };
}

if (cmd === 'stamp') stamp();
else if (cmd === 'upgrade') upgrade();
else if (cmd === 'status') status();
else if (cmd === 'export') {
  const { f, entry, state } = exportOne(pos[0], opt('--out', '.'));
  console.log(`✓ mục #${entry.seq} (${entry.type}${entry.url ? ` ${entry.url}` : ''}) · bằng chứng: ${state}\n  ${f}\n  ${f}.ots\nKiểm: kéo cả 2 tệp vào https://opentimestamps.org (Verify) hoặc: ots verify -f ${f} ${f}.ots`);
} else if (cmd === 'verify') {
  if (!haveOts()) { console.error('✗ cần lệnh ots: pip install opentimestamps-client (hoặc dùng `export` rồi kiểm ở opentimestamps.org)'); process.exit(2); }
  const tmp = tmpDir(), { f } = exportOne(pos[0], tmp);
  const r = ots('verify', '-f', f, f + '.ots');
  process.stdout.write(r.stdout || ''); process.stderr.write(r.stderr || '');
  if (r.status !== 0) { const i = ots('info', f + '.ots'); console.log('— ots info (không có Bitcoin Core: đối chiếu merkle root của khối ở bất kỳ block explorer) —\n' + (i.stdout || i.stderr || '')); }
  fs.rmSync(tmp, { recursive: true, force: true });
  process.exit(r.status === 0 ? 0 : 1);
} else { console.error('Lệnh: stamp | upgrade | status | export <seq|hash|url> [--out dir] | verify <seq|hash|url>   [--file sổ] [--dir thư mục .ots]'); process.exit(2); }
