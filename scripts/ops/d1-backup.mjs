// Sao lưu D1 chính (bảng người dùng) ra Kho Drive: 2 bản / 2 Drive, mã hoá trong Worker (DRIVE_ENC_KEY), CHẠY SAU mốc đặt lại hạn mức 00:00 UTC.
// Đọc mỗi dòng đúng 1 lần (keyset), trần dòng + trần lượt gọi, TIẾP TỤC được (state.json), DỪNG khi cầu dao D1 (429 quota-guard/d1-budget) rồi mai chạy tiếp.
//   node scripts/ops/d1-backup.mjs [--out out/d1-backup] [--manifest infra/backups/d1-main.json] [--max-rows 400000] [--max-calls 2500] [--keep 8] [--force] [--no-upload]
// Tài liệu: docs/ROLLBACK.md §Dữ liệu. Không in khoá. Thoát 0 khi hoàn tất hoặc tạm dừng vì hạn mức; 1 khi lỗi thật (kèm cảnh báo 'backup' ở Quản trị).
import fs from 'fs';
import path from 'path';
import { driveApi } from '../video/library.mjs';
import { arg, sleep, QUOTA, loadJson, saveJson, summary, isoWeek, stamp, sha256File, uploadTwoCopies, pruneOld, alert } from './lib.mjs';

const A = process.argv.slice(2), OUT = path.resolve(arg(A, 'out', 'out/d1-backup')), MAN = path.resolve(arg(A, 'manifest', 'infra/backups/d1-main.json'));
const MAX_ROWS = +arg(A, 'max-rows', 400000), MAX_CALLS = +arg(A, 'max-calls', 2500), KEEP = +arg(A, 'keep', 8), PAUSE = +arg(A, 'pause-ms', 150);
const TABLES = (await import('../../functions/api/_backup.js')).ORDER;
const week = isoWeek(), man = loadJson(MAN, { version: 1, kind: 'd1-main', db: 'lexkite-sync', items: [] });
if (!A.includes('--force') && man.items.some(x => x.week === week)) { summary(`✓ d1-backup: tuần ${week} đã có bản sao lưu (${man.items.find(x => x.week === week).name}) – bỏ qua`); process.exit(0); }
fs.mkdirSync(OUT, { recursive: true });
const SF = path.join(OUT, 'state.json'), PF = path.join(OUT, 'pages.ndjson');
let st = loadJson(SF, null);
if (!st || st.week !== week || !fs.existsSync(PF)) { st = { week, ti: 0, after: null, counts: {}, rows: 0, calls: 0, started: new Date().toISOString() }; fs.writeFileSync(PF, ''); }
else console.log(`↻ tiếp tục tuần ${week}: bảng #${st.ti} ${TABLES[st.ti] || '(xong)'} · ${st.rows} dòng · ${st.calls} lượt`);
const save = () => saveJson(SF, st);
const stop = (code, msg) => { save(); summary(msg); process.exit(code); };

try {
  while (st.ti < TABLES.length) {
    const t = TABLES[st.ti];
    for (;;) {
      if (st.calls >= MAX_CALLS || st.rows >= MAX_ROWS) stop(0, `⏸ d1-backup: chạm trần (${st.calls} lượt, ${st.rows} dòng) ở bảng ${t} – lưu trạng thái, lượt sau tiếp tục`);
      const r = await driveApi('backup_export', { table: t, after: st.after }); st.calls++;
      fs.appendFileSync(PF, JSON.stringify({ t, i: st.calls, n: r.n, iv: r.iv, ct: r.ct }) + '\n');
      st.rows += r.n; st.counts[t] = (st.counts[t] || 0) + r.n; st.after = r.last;
      if (r.done) { st.ti++; st.after = null; save(); break; }
      save(); await sleep(PAUSE);
    }
    console.log(`· ${t}: ${st.counts[t] || 0} dòng`);
  }
} catch (e) {
  const code = String(e.code || e.message);
  if (QUOTA.test(code)) stop(0, `⏸ d1-backup: cầu dao D1 (429 ${code}) ở bảng ${TABLES[st.ti]} – dừng, lưu trạng thái, lượt sau (sau 00:00 UTC) tiếp tục`);
  if (/412|not-configured/.test(code)) { await alert('backup_d1', false, 'D1 backup: thiếu DRIVE_ENC_KEY trên Pages'); stop(1, '✗ d1-backup: máy chủ chưa cấu hình DRIVE_ENC_KEY'); }
  await alert('backup_d1', false, 'Sao lưu D1 lỗi: ' + code); stop(1, '✗ d1-backup: ' + code + ' (trạng thái đã lưu – chạy lại sẽ tiếp tục)');
}

// Hoàn tất: ghép header + trang + dòng kết thúc → 1 file, băm, kiểm bất thường, tải 2 bản, ghi sổ.
const name = `lexkite-d1-main-${stamp()}.bak.ndjson`, FINAL = path.join(OUT, name), prev = man.items[0];
const head = { 'lexkite-backup': 1, db: 'lexkite-sync', at: new Date().toISOString(), week, alg: 'gzip+AES-256-GCM, khoá HKDF-SHA256(DRIVE_ENC_KEY, info lexkite-backup-v1), AAD backup:<bảng>' };
const end = { end: true, at: new Date().toISOString(), tables: TABLES, counts: st.counts, rows: st.rows, calls: st.calls };
fs.writeFileSync(FINAL, JSON.stringify(head) + '\n'); fs.appendFileSync(FINAL, fs.readFileSync(PF)); fs.appendFileSync(FINAL, JSON.stringify(end) + '\n');
const sha = sha256File(FINAL), size = fs.statSync(FINAL).size, warn = [];
for (const k of ['users', 'docs']) { const a = (prev && prev.counts && prev.counts[k]) || 0, b = st.counts[k] || 0; if (a >= 50 && b < a * 0.7) warn.push(`${k}: ${a} → ${b} (giảm > 30 %)`); }
summary(`### d1-backup ${name}\n- ${st.rows} dòng / ${TABLES.length} bảng · ${(size / 1e6).toFixed(2)} MB · sha256 ${sha.slice(0, 12)}…\n- ${Object.entries(st.counts).map(([k, v]) => k + '=' + v).join(' · ')}${warn.length ? '\n- ⚠ ' + warn.join('; ') : ''}`);
if (A.includes('--no-upload')) process.exit(0);
try {
  const copies = await uploadTwoCopies(FINAL, { name, folder: 'backups/d1', sha, assetId: 'backup:d1-main:' + week });
  man.items.unshift({ name, week, at: head.at, sha256: sha, size, rows: st.rows, counts: st.counts, copies });
  const dropped = await pruneOld(man.items, KEEP); man.items = man.items.slice(0, KEEP); man.updated = head.at; saveJson(MAN, man);
  fs.rmSync(SF, { force: true }); fs.rmSync(PF, { force: true });
  await alert('backup_d1', !warn.length, warn.length ? 'Sao lưu D1: số dòng giảm bất thường – ' + warn.join('; ') : 'ok');
  summary(`✓ d1-backup: ${copies.length} bản / ${new Set(copies.map(c => c.driveId)).size} Drive · giữ ${man.items.length} bản (bỏ ${dropped.length}) · sổ ${path.relative(process.cwd(), MAN)}`);
} catch (e) {
  if (QUOTA.test(String(e.code))) stop(0, '⏸ d1-backup: cầu dao D1 khi tải lên – file đã xuất xong, chạy lại sẽ tải lên (không xuất lại)');
  await alert('backup_d1', false, 'Sao lưu D1: tải lên Kho Drive lỗi – ' + e.message);
  summary('✗ d1-backup tải lên: ' + e.message); process.exit(1);
}
