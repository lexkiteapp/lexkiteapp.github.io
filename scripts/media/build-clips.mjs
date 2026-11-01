// Dựng dữ liệu trình phát: content/media/clips/<id>.json (kịch bản + bản dịch 15 ngôn ngữ + cụm từ) + content/media/timing/<id>.json (CI)
//   → web/data/media/<id>.json (cues có mốc giờ) + web/data/media/index.json. Chưa có timing → KHÔNG xuất clip đó (không đoán mốc giờ).
//   node scripts/media/build-clips.mjs [--check]   (--check: chỉ so, lệch → exit 1; dùng trong scripts/test/media.mjs)
import fs from 'node:fs';
const check = process.argv.includes('--check');
const ids = fs.readdirSync('content/media/clips').filter(f => f.endsWith('.json')).map(f => f.slice(0, -5)).sort();
const index = [], files = {};
for (const id of ids) {
  const c = JSON.parse(fs.readFileSync(`content/media/clips/${id}.json`, 'utf8')), tp = `content/media/timing/${id}.json`;
  if (!fs.existsSync(tp)) { console.log(`· ${id}: chưa có timing (chạy media-clips.yml) → bỏ qua`); continue; }
  const tm = JSON.parse(fs.readFileSync(tp, 'utf8'));
  if (tm.lines.length !== c.lines.length) throw new Error(`${id}: timing ${tm.lines.length} câu ≠ kịch bản ${c.lines.length} – chạy lại media-clips.yml`);
  const cues = c.lines.map((l, i) => ({ i, who: l.who, start: tm.lines[i].start, end: tm.lines[i].end, text: l.text, tr: l.tr, words: tm.lines[i].words }));
  const teacher = c.speakers.A;
  files[`web/data/media/${id}.json`] = { id, kind: c.kind, title: c.title, level: c.level, topic: c.topic, speakers: c.speakers, teacher, audio: tm.audio, src: c.src, poster: c.poster, dur: tm.dur, source: c.source, license: c.license, phrases: c.phrases, cues };
  index.push({ id, kind: c.kind, title: c.title, level: c.level, topic: c.topic, teacher, dur: tm.dur });
}
files['web/data/media/index.json'] = index;
let bad = 0;
for (const [f, v] of Object.entries(files)) {
  const s = JSON.stringify(v) + '\n';
  if (check) { if (!fs.existsSync(f) || fs.readFileSync(f, 'utf8') !== s) { console.log(`✗ ${f} lệch nguồn – chạy node scripts/media/build-clips.mjs`); bad++; } }
  else { fs.mkdirSync('web/data/media', { recursive: true }); fs.writeFileSync(f, s); }
}
console.log(check ? (bad ? `build-clips: ${bad} file lệch` : 'build-clips: khớp nguồn') : `build-clips: ${index.length} clip`);
process.exit(bad ? 1 : 0);
