// Chặn quét D1 tốn đọc (23/10: 6,5 M dòng/ngày > 5 M miễn phí). Quét mã nguồn functions/** + workers/**:
//  · COUNT(*) không WHERE trên bảng lớn (admin_log, drive_files, drive_audit, key_audit) hoặc bảng động → dùng MAX(id)/MAX(rowid), bộ đếm hoặc bản tổng hợp
//  · SELECT * trên các bảng lớn
//  · SELECT không WHERE, không LIMIT trên các bảng lớn
// Dòng cố ý (đã giới hạn/tổng hợp) ghi chú /* scan-ok: lý do */ hoặc // scan-ok trên cùng dòng. Kiểm EXPLAIN động: scripts/test/drive.mjs.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
let fail = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fail++; console.error('✗ ' + m); } };
const walk = d => readdirSync(d).flatMap(f => { const p = join(d, f); return statSync(p).isDirectory() ? (f === 'node_modules' ? [] : walk(p)) : /\.(js|mjs)$/.test(f) ? [p] : []; });
const BIG = /^(?:drive_files|admin_log|drive_audit|key_audit)$/i;
/** → danh sách lỗi của 1 dòng mã (thử được bằng chuỗi mẫu). */
export function scanLine(line, where = '') {
  const bad = [];
  if (/scan-ok/.test(line) || !/\bSELECT\b/i.test(line)) return bad;
  for (const m of line.matchAll(/SELECT\b[^`'"]*?\bFROM\s+("?\$?\{?[\w.]+\}?"?)/gi)) {
    const stmt = line.slice(m.index).split(/[`'"]\s*[,)]|\)\s*;/)[0], head = stmt.split(/\bFROM\b/i)[0], tbl = m[1].replace(/["${}]/g, '');
    const big = BIG.test(tbl), dyn = /\$\{/.test(m[1]), hasWhere = /\bWHERE\b/i.test(stmt), hasLimit = /\bLIMIT\b/i.test(stmt);
    if (/COUNT\(\*\)/i.test(head) && !hasWhere && !/\bGROUP BY\b/i.test(stmt) && (big || dyn)) bad.push(`${where} COUNT(*) không WHERE trên ${tbl}`);
    if (big && /^SELECT\s+\*/i.test(stmt)) bad.push(`${where} SELECT * trên ${tbl}`);
    if (big && !hasWhere && !hasLimit && !/COUNT\(\*\)/i.test(head) && !/^SELECT\s+(?:MAX|MIN)\(/i.test(stmt)) bad.push(`${where} SELECT không WHERE/LIMIT trên ${tbl}`);
  }
  return bad;
}
if (process.argv[1] && process.argv[1].endsWith('d1-scan.mjs')) {
  const bad = [];
  for (const root of ['functions', 'workers']) {
    let files; try { files = walk(root); } catch (e) { continue; }
    for (const f of files) readFileSync(f, 'utf8').split('\n').forEach((line, i) => bad.push(...scanLine(line, `${f}:${i + 1}`)));
  }
  ok(bad.length === 0, 'quét D1 không giới hạn:\n  ' + bad.join('\n  '));
  // tự kiểm bộ quét: mẫu xấu phải bị bắt, mẫu tốt phải qua
  for (const q of ['SELECT COUNT(*) AS n FROM "admin_log"', 'SELECT COUNT(*) AS n FROM drive_audit', 'SELECT * FROM drive_files WHERE status = 1', 'SELECT id FROM drive_audit', "const q = `SELECT COUNT(*) AS n FROM ${t}`"]) ok(scanLine(q).length > 0, 'phải bắt: ' + q);
  for (const q of ['SELECT MAX(id) AS n FROM drive_files', 'SELECT id FROM drive_files WHERE sha256 = ? LIMIT 5', 'SELECT COUNT(*) AS n FROM drive_files WHERE drive_id = ?', 'SELECT COUNT(*) AS n FROM drives']) ok(scanLine(q).length === 0, 'phải qua: ' + q);
  if (fail) { console.error(`✗ d1-scan: ${fail}/${n} kiểm thất bại`); process.exit(1); }
  console.log(`✓ d1-scan: ${n} kiểm – không COUNT(*)/SELECT */SELECT không giới hạn trên bảng lớn`);
}
