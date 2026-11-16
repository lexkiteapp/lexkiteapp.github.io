// Đưa kho Stitch v3 (out/stitch/v3 do batch.mjs tạo) vào repo: brand/stitch/v3/<surface>/<màn>-light|dark.html + <surface>/.index.txt
// (cùng định dạng v2q: "màn id-sáng id-tối DEVICE VERDICT cờ | ghi chú") để scripts/test/stitch-quality-qc.mjs chấm.
// VERDICT: PASS = QC máy đạt (gác CI) · QC = chưa chấm/đang sửa (CI chỉ báo cáo với --all) · PICK = phương án thắng của màn yếu.
// Ghi chú lấy từ out/stitch/v3/qc.json nếu có (kết quả CI). Dùng: node scripts/stitch/import-v3.mjs [out/stitch/v3] [brand/stitch/v3]
import fs from 'node:fs'; import path from 'node:path';
const [SRC = 'out/stitch/v3', DST = 'brand/stitch/v3'] = process.argv.slice(2);
const st = JSON.parse(fs.readFileSync(path.join(SRC, 'state.json'), 'utf8')), q = JSON.parse(fs.readFileSync(path.join(SRC, 'queue.json'), 'utf8'));
const qc = fs.existsSync(path.join(SRC, 'qc.json')) ? JSON.parse(fs.readFileSync(path.join(SRC, 'qc.json'), 'utf8')) : {};
const surf = id => id.startsWith('adm-') ? 'admin' : id === 'email-digest' ? 'email' : id.startsWith('share-card') || id.startsWith('reel-') ? 'share' : id.startsWith('ext-') ? 'ext' : 'app';
const done = {}; for (const j of Object.values(st.jobs)) if (j.status === 'done' && !(done[j.tag]?.at > j.at)) done[j.tag] = j; // bản mới nhất (sau vòng sửa QC)
const dev = id => (q.find(j => j.id === id || id.startsWith(j.id + '-v')) || {}).device || 'MOBILE';
const teacher = id => /^(lesson|placement)/.test(id);
const rows = {};
for (const id of fs.readdirSync(SRC).filter(d => fs.existsSync(path.join(SRC, d, 'light.html')) && fs.existsSync(path.join(SRC, d, 'dark.html'))).sort()) {
  const L = done[`${id}/light`], D = done[`${id}/dark`]; if (!L || !D) continue;
  const s = surf(id), dir = path.join(DST, s); fs.mkdirSync(dir, { recursive: true });
  for (const m of ['light', 'dark']) fs.copyFileSync(path.join(SRC, id, m + '.html'), path.join(dir, `${id}-${m}.html`));
  const r = qc[`${s}/${id}`], verdict = r ? (r.fails.length ? 'QC' : r.pick ? 'PICK' : 'PASS') : 'QC';
  (rows[s] ??= []).push(`${id} ${L.screenId} ${D.screenId} ${dev(id)} ${verdict}${teacher(id) ? ' teacher-slot' : ''} | ${L.key} project ${L.project}${r?.fails.length ? ' · QC: ' + r.fails.join(' · ').replace(/\s+/g, ' ').slice(0, 300) : ''}`);
}
const ROW = /^\S+ [0-9a-f]{32} [0-9a-f]{32} (DESKTOP|MOBILE) /; // dòng màn hợp lệ: id id-sáng id-tối thiết-bị …
// Gộp với .index.txt sẵn có (nhiều thư mục nguồn: v3, v3sys, v4…) – dòng mới thay dòng cùng màn, dòng màn khác giữ nguyên.
for (const [s, rs] of Object.entries(rows)) { const f = path.join(DST, s, '.index.txt'), m = new Map();
  if (fs.existsSync(f)) for (const l of fs.readFileSync(f, 'utf8').split('\n')) if (ROW.test(l)) m.set(l.split(' ')[0], l); // dòng nối do ghi chú cũ có xuống dòng → bỏ
  for (const l of rs) m.set(l.split(' ')[0], l);
  fs.writeFileSync(f, `# Stitch v3 kho mẫu – ${s} (scripts/stitch/batch.mjs, 5 khoá; mỗi khoá 1 project + design system Lexkite Kit). màn id-sáng id-tối thiết-bị verdict cờ | khoá · ghi chú QC\n` + [...m.values()].sort().join('\n') + '\n'); }
console.log(Object.entries(rows).map(([s, r]) => `${s}: ${r.length}`).join(' · '));
