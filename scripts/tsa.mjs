// Tem thời gian RFC 3161 (miễn phí, bên thứ ba được công nhận: DigiCert, Sectigo, FreeTSA) cho sổ băm content/protection/registry.jsonl.
// Chỉ gửi SHA-256 của ĐÚNG dòng JSON của mục (không gửi nội dung) – cả kho private sau này: ghi gốc băm vào sổ rồi đóng tem.
// Mục nối chuỗi băm → tem của mục đầu sổ (head) chứng minh MỌI mục trước nó đã tồn tại lúc đó. Mỗi lần chạy: đóng tem head nếu chưa có.
//   node scripts/tsa.mjs stamp              đóng tem mục mới nhất chưa có tem (3 TSA; TSA lỗi → bỏ qua, lần sau thử lại)
//   node scripts/tsa.mjs verify <seq|hash>  openssl ts -verify tem của mục (hoặc mục gần nhất SAU nó – phủ qua chuỗi băm)
//   node scripts/tsa.mjs status             đếm tem
// Tệp: content/protection/tsa/<hash mục>.<tsa>.tsr (~5 KB). Chứng chỉ gốc FreeTSA: content/protection/tsa/certs/ (DigiCert/Sectigo ở kho CA hệ thống).
// Chỉ chạy trên CI (content-evidence.yml), cần openssl + curl. Tài liệu: docs/CONTENT-PROTECTION.md §4c.
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { execFileSync } from 'node:child_process'; import { pathToFileURL } from 'node:url';
import { REGISTRY, registryLines, sha256 } from './lib/content-registry.mjs';

export const TSA_DIR = 'content/protection/tsa';
export const TSAS = [
  { id: 'digicert', url: 'http://timestamp.digicert.com' },
  { id: 'sectigo', url: 'http://timestamp.sectigo.com' },
  { id: 'freetsa', url: 'https://freetsa.org/tsr', ca: `${TSA_DIR}/certs/freetsa-cacert.pem` },
];
export const tsrPath = (hash, id, dir = TSA_DIR) => `${dir}/${hash}.${id}.tsr`;
const SYS_CA = ['/etc/ssl/certs/ca-certificates.crt', '/etc/ssl/cert.pem'].find(f => fs.existsSync(f));
// Mục cần tem: head của sổ (nếu head chưa có tem ở bất kỳ TSA nào)
export function headToStamp(lines, exists = p => fs.existsSync(p), dir = TSA_DIR) {
  const line = lines.at(-1); if (!line) return null; const e = JSON.parse(line);
  return TSAS.some(t => exists(tsrPath(e.hash, t.id, dir))) ? null : { entry: e, line };
}
// Mục có tem phủ mục seq: chính nó hoặc mục gần nhất sau nó có tem
export function coveringStamps(lines, seq, exists = p => fs.existsSync(p), dir = TSA_DIR) {
  for (const line of lines) { const e = JSON.parse(line); if (e.seq < seq) continue; const t = TSAS.filter(x => exists(tsrPath(e.hash, x.id, dir))); if (t.length) return { entry: e, line, tsas: t.map(x => ({ ...x, file: tsrPath(e.hash, x.id, dir) })) }; }
  return null;
}
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'lk-tsa-'));
const ossl = (args, input) => execFileSync('openssl', args, { input, stdio: ['pipe', 'pipe', 'pipe'] }).toString();
export function stampLine(line, entryHash, { dir = TSA_DIR } = {}) {
  const d = tmp(), data = path.join(d, 'line'), q = path.join(d, 'q.tsq'); fs.writeFileSync(data, line);
  ossl(['ts', '-query', '-data', data, '-sha256', '-cert', '-out', q]);
  const got = [];
  for (const t of TSAS) {
    const out = tsrPath(entryHash, t.id, dir);
    try {
      execFileSync('curl', ['-s', '-f', '--max-time', '30', '-H', 'Content-Type: application/timestamp-query', '--data-binary', `@${q}`, t.url, '-o', out]);
      verifyTsr(data, out, t); got.push(t.id);
    } catch (e) { fs.rmSync(out, { force: true }); console.log(`::warning::TSA ${t.id} lỗi (${String(e.message).split('\n')[0]}) – lần sau thử lại`); }
  }
  fs.rmSync(d, { recursive: true, force: true });
  return got;
}
export function verifyTsr(dataFile, tsr, t) {
  const ca = t.ca && fs.existsSync(t.ca) ? t.ca : SYS_CA;
  const out = ossl(['ts', '-verify', '-data', dataFile, '-in', tsr, '-CAfile', ca]);
  if (!/Verification: OK/.test(out)) throw new Error(`verify ${t.id}: ${out.trim()}`);
  const time = (ossl(['ts', '-reply', '-in', tsr, '-text']).match(/Time stamp: (.+)/) || [])[1];
  return time ? new Date(time).toISOString() : '';
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [cmd, arg] = process.argv.slice(2), lines = registryLines(REGISTRY);
  if (cmd === 'stamp') {
    const h = headToStamp(lines);
    if (!h) { console.log('· TSA: mục mới nhất đã có tem'); process.exit(0); }
    const got = stampLine(h.line, h.entry.hash);
    console.log(`${got.length ? '✓' : '✗'} TSA mục #${h.entry.seq} (${h.entry.hash.slice(0, 12)}…, sha256 dòng ${sha256(h.line).slice(0, 12)}…): ${got.join(', ') || 'không TSA nào'}`);
  } else if (cmd === 'verify') {
    const e0 = lines.map(l => JSON.parse(l)).find(e => String(e.seq) === arg || e.hash === arg);
    if (!e0) { console.error('✗ không có mục'); process.exit(1); }
    const c = coveringStamps(lines, e0.seq); if (!c) { console.error(`✗ mục #${e0.seq} chưa có tem phủ (chạy CI content-evidence)`); process.exit(1); }
    const d = tmp(), data = path.join(d, 'line'); fs.writeFileSync(data, c.line); let bad = 0;
    for (const t of c.tsas) { try { console.log(`✓ ${t.id}: tem lúc ${verifyTsr(data, t.file, t)} cho mục #${c.entry.seq}${c.entry.seq !== e0.seq ? ` (phủ #${e0.seq} qua chuỗi băm)` : ''} – ${t.file}`); } catch (e) { bad++; console.log(`✗ ${t.id}: ${e.message}`); } }
    console.log(`Tự kiểm: lưu dòng JSON mục #${c.entry.seq} (không \\n cuối) thành line.json → openssl ts -verify -data line.json -in <tệp .tsr> -CAfile <CA>`);
    fs.rmSync(d, { recursive: true, force: true }); process.exit(bad ? 1 : 0);
  } else if (cmd === 'status') {
    const f = fs.existsSync(TSA_DIR) ? fs.readdirSync(TSA_DIR).filter(x => x.endsWith('.tsr')) : [];
    console.log(`TSA: ${f.length} tem · ${TSAS.map(t => `${t.id} ${f.filter(x => x.endsWith(`.${t.id}.tsr`)).length}`).join(' · ')}`);
  } else { console.error('Lệnh: stamp | verify <seq|hash> | status'); process.exit(2); }
}
