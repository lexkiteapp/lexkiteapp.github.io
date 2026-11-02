// Kho clip mạng xã hội minh bạch (docs/specs/social-l1-clips.md §Lưu trữ) – chạy trong job store của .github/workflows/social-clips.yml.
// Mỗi clip: content/social/videos/<lang>/<YYYY-MM-DD>-<slug>/{caption.txt, meta.json, qc.json} trong repo (đọc/duyệt/diff được trên GitHub)
// + video.mp4, cover.jpg ở GitHub Release "social-<lang>" (miễn phí, file ≤ 2 GB, tên tài sản <YYYY-MM-DD>-<slug>-video.mp4 / -cover.jpg; link trong meta.json).
// Chạy lại cùng slug: giữ ngày + trạng thái (draft/approved/posted) cũ, chỉ thay file. Sau cùng sinh manifest.json (mọi clip theo ngôn ngữ, trạng thái).
// Không ghi token/bí mật vào file công khai. Dùng: node scripts/rig/store.mjs <thư mục artifact đã tải> <ngày UTC> <repo owner/name>
import fs from 'node:fs'; import path from 'node:path'; import { specFiles, sha, STORE } from './todo.mjs';
const [ART, DAY, REPO] = process.argv.slice(2), ROOT = STORE, uploads = [], RJ = `${ROOT}/rejected.json`;
const rejected = fs.existsSync(RJ) ? JSON.parse(fs.readFileSync(RJ, 'utf8')) : {};
const app = (id, dl) => `https://lexkite.com/app/?utm_source=social&utm_medium=short&utm_campaign=${id}${dl}`;
for (const dir of fs.readdirSync(ART).map(d => path.join(ART, d)).filter(d => fs.statSync(d).isDirectory())) {
  const inner = fs.readdirSync(dir).map(x => path.join(dir, x)).find(x => fs.existsSync(path.join(x, 'qc.json')));
  if (!inner) continue;
  const id = path.basename(inner), specF = specFiles().find(f => JSON.parse(fs.readFileSync(f, 'utf8')).id === id);   // L1 + khuôn Reels (đã duyệt 03/11)
  if (!specF) { console.log('bỏ qua (không có spec L1/Reels):', id); continue; }
  const spec = JSON.parse(fs.readFileSync(specF, 'utf8')), qc = JSON.parse(fs.readFileSync(path.join(inner, 'qc.json'), 'utf8'));
  const nq = JSON.parse(fs.readFileSync(path.join(inner, 'native-qa.json'), 'utf8')), L = spec.lang;
  const failed = Object.entries(qc.gates).filter(([, v]) => !v).map(([k]) => k);
  // clip trượt bất kỳ cổng nào (gồm 3 cổng tờ khung hình) KHÔNG xuất: không ghi kho, không đưa lên Release; bản đạt cũ (nếu có) giữ nguyên
  if (failed.length || !fs.existsSync(path.join(inner, `${id}.mp4`))) { rejected[id] = { spec_sha: sha(specF), failed, date: DAY }; console.log('KHÔNG xuất (trượt cổng):', id, failed.join(',')); continue; }
  delete rejected[id];
  fs.mkdirSync(path.join(ROOT, L), { recursive: true });
  const old = fs.readdirSync(path.join(ROOT, L)).find(d => d.slice(11) === spec.slug), folder = old || `${DAY}-${spec.slug}`, F = path.join(ROOT, L, folder);
  const prev = old && fs.existsSync(path.join(F, 'meta.json')) ? JSON.parse(fs.readFileSync(path.join(F, 'meta.json'), 'utf8')) : {};
  fs.mkdirSync(F, { recursive: true });
  const rel = `https://github.com/${REPO}/releases/download/social-${L}/`, base = `${folder}`;
  const meta = { id, lang: L, slug: spec.slug, date: folder.slice(0, 10), title: nq.hook, topic: spec.en.hook, mistake: spec.mistake,
    template: spec.template, teachers: [...new Set(qc.voices.map(v => v.who))], duration_s: qc.total, wpm: qc.wpmSpeech,
    qc: { score: qc.score, pass: failed.length === 0, failed }, deeplink: app(id, spec.deeplink), spec: specF, spec_sha: sha(specF),
    files: { video: rel + base + '-video.mp4', cover: rel + base + '-cover.jpg', caption: 'caption.txt', qc: 'qc.json' },
    status: prev.status && prev.status !== 'draft' ? prev.status : 'draft', posted: prev.posted || {}, updated: DAY };
  fs.writeFileSync(path.join(F, 'meta.json'), JSON.stringify(meta, null, 1) + '\n');
  fs.writeFileSync(path.join(F, 'caption.txt'), nq.post + '\n');
  fs.writeFileSync(path.join(F, 'qc.json'), JSON.stringify({ ...qc, native: { gates: nq.gates, back: nq.back, sim: nq.sim } }, null, 1) + '\n');
  uploads.push([L, path.join(inner, `${id}.mp4`), `${base}-video.mp4`], [L, path.join(inner, 'cover.jpg'), `${base}-cover.jpg`]);
}
fs.mkdirSync(ROOT, { recursive: true }); fs.writeFileSync(RJ, JSON.stringify(rejected, null, 1) + '\n');   // todo.mjs: không dựng lại spec_sha đã trượt
// manifest: mọi clip đã lưu (kể cả lượt trước), theo ngôn ngữ
const clips = fs.existsSync(ROOT) ? fs.readdirSync(ROOT).filter(l => fs.statSync(path.join(ROOT, l)).isDirectory()).flatMap(l => fs.readdirSync(path.join(ROOT, l))
  .filter(d => fs.existsSync(path.join(ROOT, l, d, 'meta.json'))).map(d => ({ path: `${ROOT}/${l}/${d}`, ...JSON.parse(fs.readFileSync(path.join(ROOT, l, d, 'meta.json'), 'utf8')) }))) : [];
const by = {}; for (const c of clips) (by[c.lang] = by[c.lang] || []).push(c.id);
fs.writeFileSync(path.join(ROOT, 'manifest.json'), JSON.stringify({ _doc: 'Sinh tự động bởi scripts/rig/store.mjs – đừng sửa tay (trạng thái sửa trong meta.json từng clip).', updated: DAY,
  count: clips.length, by_lang: by, by_status: clips.reduce((a, c) => (a[c.status] = (a[c.status] || 0) + 1, a), {}),
  clips: clips.map(({ id, lang, date, title, topic, mistake, teachers, duration_s, qc, status, deeplink, files, path: p }) => ({ id, lang, date, title, topic, mistake: mistake.en, mistake_vi: mistake.vi, teachers, duration_s, score: qc.score, pass: qc.pass, status, deeplink, video: files.video, cover: files.cover, caption: `${p}/caption.txt` })) }, null, 1) + '\n');
// README.md = mục lục đọc được ngay trên GitHub (theo ngôn ngữ → trạng thái, link tải video/bìa, chú thích)
const NAME = { ar: 'العربية', de: 'Deutsch', en: 'English', es: 'Español', fr: 'Français', hi: 'हिन्दी', id: 'Bahasa Indonesia', ja: '日本語', ko: '한국어', pt_BR: 'Português (BR)', ru: 'Русский', th: 'ไทย', tr: 'Türkçe', vi: 'Tiếng Việt', zh_CN: '中文' };
const md = ['# Kho clip mạng xã hội theo ngôn ngữ người học', '', '> Sinh tự động (scripts/rig/store.mjs). Mỗi clip một thư mục `<lang>/<ngày>-<slug>/`: `caption.txt` (bài đăng + hashtag), `meta.json` (lỗi nhắm tới, giáo viên, điểm QC, deep-link, trạng thái draft/approved/posted), `qc.json`. Video + ảnh bìa ở Release `social-<lang>`. Quy trình: docs/specs/social-l1-clips.md.', ''];
for (const l of Object.keys(by).sort()) {
  md.push(`## ${NAME[l] || l} (\`${l}\`) – ${by[l].length} clip`, '', '| ngày | tiêu đề | lỗi nhắm tới | QC | trạng thái | tải |', '|---|---|---|---|---|---|');
  for (const c of clips.filter(c => c.lang === l).sort((a, b) => b.date.localeCompare(a.date)))
    md.push(`| ${c.date} | [${c.title.replace(/\|/g, '/')}](${l}/${path.basename(c.path)}/caption.txt) | ${(c.mistake.vi || c.mistake.en).replace(/\|/g, '/')} | ${c.qc.score}${c.qc.pass ? ' ✅' : ' ❌'} | ${c.status} | [video](${c.files.video}) · [bìa](${c.files.cover}) |`);
  md.push('');
}
fs.writeFileSync(path.join(ROOT, 'README.md'), md.join('\n'));
fs.writeFileSync(path.join(ART, 'uploads.tsv'), uploads.map(u => u.join('\t')).join('\n') + '\n');
console.log(`✓ ${uploads.length / 2} clip → ${ROOT}, manifest ${clips.length} clip`);
