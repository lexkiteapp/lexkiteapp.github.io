// Bài trung gian content/mediation/m<NN>.json (đã qua cổng mediation-check) → gói lười của màn #/mediate (docs/specs/mediation.md §2):
//   web/cpack/mediation/index.js  self.MEDIATION_INDEX = [{ id, level, activity, mode, kind, title, src }]  (danh sách, ~4 KB; src = đường dẫn gói bài, viết nguyên văn để scripts/build-cpack.mjs đổi sang tên đã băm)
//   web/cpack/mediation/<id>.js   self.MEDIATION[id] = bài đầy đủ                                    (tải khi mở bài)
// Dùng: node scripts/mediation/build.mjs [--check]  (--check: đỏ khi file sinh ra cũ/thừa – chạy trong test/mediation.mjs; prepush ghi lại)
import fs from 'node:fs';
const SRC = 'content/mediation', OUT = 'web/cpack/mediation', LEVELS = ['A2', 'B1', 'B2', 'C1', 'C2'];
const HEAD = `/* FILE SINH TỰ ĐỘNG – scripts/mediation/build.mjs từ ${SRC}/*.json. Đừng sửa tay. Màn #/mediate (docs/specs/mediation.md). */\n`;
const items = fs.readdirSync(SRC).filter(f => /^m\d+\.json$/.test(f)).sort().map(f => JSON.parse(fs.readFileSync(`${SRC}/${f}`, 'utf8')))
  .sort((a, b) => LEVELS.indexOf(a.level) - LEVELS.indexOf(b.level) || a.id.localeCompare(b.id));
const want = new Map([['index.js', HEAD + `self.MEDIATION_INDEX = ${JSON.stringify(items.map(x => ({ id: x.id, level: x.level, activity: x.activity, mode: x.task.mode, kind: x.source.kind, title: x.title, src: `cpack/mediation/${x.id}.js` })))};\n`]]);
for (const x of items) want.set(`${x.id}.js`, HEAD + `(self.MEDIATION = self.MEDIATION || {})[${JSON.stringify(x.id)}] = ${JSON.stringify(x)};\n`);
const have = fs.existsSync(OUT) ? fs.readdirSync(OUT).filter(f => f.endsWith('.js')) : [];
const stale = [...want].filter(([f, s]) => !fs.existsSync(`${OUT}/${f}`) || fs.readFileSync(`${OUT}/${f}`, 'utf8') !== s).map(([f]) => f), extra = have.filter(f => !want.has(f));
if (process.argv.includes('--check')) {
  if (stale.length || extra.length) { console.error(`✗ ${OUT} lệch nguồn (${[...stale, ...extra].slice(0, 3).join(', ')}) – chạy node scripts/mediation/build.mjs`); process.exit(1); }
  console.log(`✓ mediation build: ${items.length} bài + mục lục`); process.exit(0);
}
fs.mkdirSync(OUT, { recursive: true });
for (const f of stale) fs.writeFileSync(`${OUT}/${f}`, want.get(f));
for (const f of extra) fs.unlinkSync(`${OUT}/${f}`);
console.log(`mediation: ${items.length} bài → ${OUT} (ghi ${stale.length}, xóa ${extra.length})`);
