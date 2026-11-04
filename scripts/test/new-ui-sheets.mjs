// 🔍 Gộp kết quả new-ui-qa (nhiều shard) → báo cáo + chuỗi giao diện chưa dịch + contact sheet mỗi màn. docs/NEW-UI-QA.md
// Dùng: node scripts/test/new-ui-sheets.mjs <thư-mục-shard> <ra> [nhãn]   (cần ImageMagick `montage`)
// Sheet mỗi trạng thái: <state>-360-light.jpg / -360-dark.jpg (15 ngôn ngữ) · <state>-wide.jpg (390/768/1280 × sáng/tối × en/ar/de nếu có).
// Mã thoát 1 khi: có FAIL ở shard · chuỗi giao diện trùng y bản en ở ngôn ngữ khác (chưa dịch) · 0 ảnh.
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';

const [IN = 'nuq', OUT = 'sheets', LABEL = 'run'] = process.argv.slice(2);
fs.mkdirSync(OUT, { recursive: true });
const shards = fs.existsSync(IN) ? fs.readdirSync(IN).map(d => path.join(IN, d)).filter(d => fs.existsSync(d + '/report.json')) : [];
const R = { fail: [], warn: [], texts: {}, shots: 0 };
for (const d of shards) {
  const r = JSON.parse(fs.readFileSync(d + '/report.json', 'utf8'));
  R.fail.push(...r.fail); R.warn.push(...r.warn); R.shots += r.shots;
  for (const [st, m] of Object.entries(r.texts)) Object.assign(R.texts[st] = R.texts[st] || {}, m);
}
// Chuỗi chưa dịch: cùng màn + khung + sáng/tối, chữ giao diện (không thuộc lang="en") y hệt bản en → lọt tiếng Anh
const SAME_OK = /^(Radio|COMBO.*|XP|ON AIR|Ama|Carlos|Lexkite|UK|US|IPA|OK|[\d\s%:+/.·×→←✓✗↺🔥🧊🎁🎉▶●′-]+)$/u;
const untrans = [];
for (const [st, m] of Object.entries(R.texts)) for (const [tag, list] of Object.entries(m)) {
  const [vp, sc, lang] = tag.split('-'); if (lang === 'en') continue;
  const en = m[`${vp}-${sc}-en`]; if (!en) continue;
  for (const s of list) if (en.includes(s) && !SAME_OK.test(s) && /\p{L}{3}/u.test(s) && !/^[A-Z][a-z]+$/.test(s)) untrans.push(`[${st}] ${tag}: chưa dịch «${s}»`);
}
const uniq = a => [...new Set(a)];
R.fail = uniq(R.fail.concat(untrans)); R.warn = uniq(R.warn);

// contact sheet
const shotsDirs = shards.map(d => d + '/shots').filter(fs.existsSync);
const byState = {};
for (const sd of shotsDirs) for (const st of fs.readdirSync(sd)) for (const f of fs.readdirSync(path.join(sd, st))) (byState[st] = byState[st] || []).push(path.join(sd, st, f));
const LORDER = ['en', 'vi', 'ar', 'de', 'es', 'fr', 'hi', 'id', 'ja', 'ko', 'pt', 'ru', 'th', 'tr', 'zh'];
const key = f => path.basename(f, '.png').split('-'); // vp-scheme-lang
const sheet = (files, out, tile, cols) => {
  if (!files.length) return;
  const args = []; for (const f of files) args.push('-label', path.basename(f, '.png'), f);
  execFileSync('montage', [...args, '-tile', `${cols}x`, '-geometry', `${tile}+6+6`, '-pointsize', '15', '-background', '#888', '-quality', '80', path.join(OUT, out)], { stdio: 'inherit' });
};
let n = 0;
for (const [st, files] of Object.entries(byState).sort()) {
  const ord = a => a.sort((x, y) => { const [vx, sx, lx] = key(x), [vy, sy, ly] = key(y); return (+vx - +vy) || sx.localeCompare(sy) || (LORDER.indexOf(lx) - LORDER.indexOf(ly)); });
  for (const sc of ['light', 'dark']) { const f = ord(files.filter(x => key(x)[0] === '360' && key(x)[1] === sc)); if (f.length) { sheet(f, `${st}-360-${sc}.jpg`, '270x600', 8); n++; } }
  const w = ord(files.filter(x => key(x)[0] !== '360' && ['en', 'ar', 'de'].includes(key(x)[2])));
  if (w.length) { sheet(w, `${st}-wide.jpg`, '420x420>', 6); n++; }
}
const md = [`# New UI QA – ${LABEL}`, '', `Ảnh: ${R.shots} · sheet: ${n} · FAIL: ${R.fail.length} · WARN: ${R.warn.length}`, '', '## FAIL', ...R.fail.map(x => '- ' + x), '', '## WARN', ...R.warn.slice(0, 400).map(x => '- ' + x)].join('\n');
fs.writeFileSync(path.join(OUT, 'SUMMARY.md'), md);
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify({ fail: R.fail, warn: R.warn, shots: R.shots, sheets: n }, null, 1));
console.log(md.slice(0, 6000));
if (!R.shots) { console.log('✗ 0 ảnh'); process.exit(1); }
process.exit(R.fail.length ? 1 : 0);
