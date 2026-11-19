// Bộ dựng thử đa dạng (stress): N video cục bộ khác seed × khuôn × chủ đề/bối cảnh × ngày/tối × dàn nhân vật → khung tóm tắt + báo lỗi tự động.
//   node scripts/video/stress.mjs [--n 12] [--only 3,4] [--out brand/characters/_candidates/stress]
// Mỗi video: out/video/stress-XX/ (state, props, video.mp4) · <out>/stress-XX.jpg (6 khung) · <out>/report.json (cổng QA + lỗi thấy được).
// Cần Remotion (scripts/video/remotion) + Chrome chạy được (REMOTION_BROWSER nếu máy có sandbox). Không gọi Studio, không cần bí mật.
import fs from 'fs';
import path from 'path';
import { spawnSync, execFileSync } from 'child_process';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const a = process.argv.slice(2), opt = (n, d) => { const i = a.indexOf('--' + n); return i >= 0 ? a[i + 1] : d; };
const N = +opt('n', 12), OUT = path.resolve(ROOT, opt('out', 'brand/characters/_candidates/stress'));
const BASE = [
  { topic: 'office meeting english', scene: 'office', hook: 'Stop saying "I\'m agree"', wrong: "I'm agree", right: 'I agree', keywords: ['I agree', 'verb'], lines: [['hook', 'Wait, is "I\'m agree" wrong?'], ['situation', 'In the meeting you said it three times.'], ['explain', 'Agree is a verb, so we just say I agree.'], ['example', 'I agree with your plan for next week.'], ['tip', "Kit's tip: no am, is, or are before agree.", 'kit'], ['cta', 'Practice this free on lexkite.com']] },
  { topic: 'ordering coffee', scene: 'cafe', hook: 'Order coffee like a local', wrong: 'I want a coffee', right: "Could I get a latte?", keywords: ['Could I get'], lines: [['hook', 'Do you still say "I want a coffee"?'], ['situation', 'It sounds a little rude to the barista.'], ['explain', 'Locals say could I get, it is softer.'], ['example', 'Could I get a latte to go, please?'], ['tip', "Kit's tip: add please at the end.", 'kit'], ['cta', 'Practice ordering free on lexkite.com']] },
  { topic: 'grammar present perfect', scene: 'school', solo: 'ama', hook: 'Which tense is right?', wrong: 'I am here since Monday', right: 'I have been here since Monday', keywords: ['have been', 'since'], lines: [['hook', 'Is "I am here since Monday" correct?'], ['situation', 'Many learners say this in class.'], ['explain', 'With since we use the present perfect.'], ['example', 'I have been here since Monday.'], ['tip', "Kit's tip: since plus a start point.", 'kit'], ['cta', 'Try the quiz free on lexkite.com']] },
  { topic: 'ielts speaking band 7', scene: 'exam', solo: 'ama', hook: 'Band 5 vs band 7 answer', wrong: 'It is very good', right: 'It is incredibly rewarding', keywords: ['incredibly rewarding'], lines: [['hook', 'Why is "very good" a band 5 answer?'], ['situation', 'Examiners hear it a hundred times a day.'], ['explain', 'Swap it for a precise, natural phrase.'], ['example', 'Honestly, it is incredibly rewarding.'], ['cta', 'Get band 7 phrases free on lexkite.com']] },
  { topic: 'travel airport phrases', scene: 'airport', hook: 'You will need this at the gate', wrong: 'Where is my door?', right: 'Which gate is it?', keywords: ['Which gate'], lines: [['hook', 'Lost at the airport? Say this.'], ['situation', 'Saying door instead of gate confuses staff.'], ['explain', 'At airports we always say gate.'], ['example', 'Excuse me, which gate is flight 12?'], ['tip', "Kit's tip: check the screen for gate changes.", 'kit'], ['cta', 'Learn travel English free on lexkite.com']] },
  { topic: 'daily life small talk', scene: 'home', hook: 'Stop answering "I\'m fine"', wrong: "I'm fine, thank you", right: 'Pretty good, you?', keywords: ['Pretty good'], lines: [['hook', 'Do you always answer "I\'m fine, thank you"?'], ['situation', 'It sounds like a textbook robot.'], ['explain', 'Natives keep it short and friendly.'], ['example', 'Pretty good, you? Busy week!'], ['cta', 'Sound natural free on lexkite.com']] },
];
const FORMATS = ['dont-say', 'quiz-3s', 'native-vs-textbook', 'myth-fact', 'polite-vs-rude', 'idiom-guess', 'spot-the-mistake', 'kit-tip', 'fill-gap', 'pronunciation-fix', 'before-after', 'small-word-big-diff', 'one-word-upgrade', 'false-friends', 'top-3', 'travel-survival'];
const WHO = [['mia', 'leo'], ['ama', 'carlos'], ['leo', 'diane'], ['mia', 'ama'], ['carlos', 'mia'], ['diane', 'leo']];
const dir = path.join(ROOT, 'out/video/stress'); fs.mkdirSync(dir, { recursive: true }); fs.mkdirSync(OUT, { recursive: true });
const ONLY = opt('only', '') ? opt('only').split(',').map(Number) : null, RP = path.join(OUT, 'report.json');
const report = ONLY && fs.existsSync(RP) ? JSON.parse(fs.readFileSync(RP, 'utf8')) : [];
for (let i = 0; i < N; i++) {
  if (ONLY && !ONLY.includes(i + 1)) continue;
  const b = BASE[i % BASE.length], who = b.solo ? [b.solo, b.solo] : WHO[(i + Math.floor(i / BASE.length)) % WHO.length], id = `stress-${String(i + 1).padStart(2, '0')}`;
  const script = { title: b.hook, hook: b.hook, wrong: b.wrong, right: b.right, keywords: b.keywords, format_id: FORMATS[i % FORMATS.length], time: i % 4 === 3 ? 'night' : 'day', caption: b.hook, link: 'https://lexkite.com/',
    lines: b.lines.map(([beat, text, w], k) => ({ who: w || who[k % 2], beat, text, punch: beat === 'explain' })) };
  const f = path.join(dir, `${id}.json`); fs.writeFileSync(f, JSON.stringify({ topic: b.topic, format: 'short', script }, null, 2));
  fs.rmSync(path.join(ROOT, 'out/video', id), { recursive: true, force: true });
  const t0 = Date.now(), r = spawnSync('node', ['scripts/video/render.mjs', '--local', '--job', id, '--script', f, '--seed', `${id}-s${i * 7}`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 26 });
  const log = (r.stdout || '') + (r.stderr || ''), st = path.join(ROOT, 'out/video', id, 'state.json'), s = fs.existsSync(st) ? JSON.parse(fs.readFileSync(st, 'utf8')) : {};
  const v = path.join(ROOT, 'out/video', id, 'video.mp4'), issues = [];
  if (r.status) issues.push('dựng lỗi: ' + (s.error || log.split('\n').filter(Boolean).slice(-2).join(' | ')));
  for (const g of (s.qa && s.qa.gates) || []) if (!g.ok) issues.push(`${g.k}: ${g.note}`);
  for (const t of s.todo || []) issues.push(`todo: ${t}`);
  for (const m of log.match(/⚠️[^\n]*/g) || []) issues.push(m.slice(0, 160));
  if (fs.existsSync(v)) {
    const D = +execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', v], { encoding: 'utf8' });
    const ts = [0.5, 1.4, D * 0.3, D * 0.5, D * 0.72, D - 1];
    const parts = ts.map((t, k) => { const o = path.join(dir, `${id}-${k}.png`); execFileSync('ffmpeg', ['-v', 'error', '-y', '-ss', t.toFixed(2), '-i', v, '-frames:v', '1', '-vf', 'scale=270:480', o]); return o; });
    execFileSync('ffmpeg', ['-v', 'error', '-y', ...parts.flatMap(p => ['-i', p]), '-filter_complex', `${parts.map((_, k) => `[${k}:v]`).join('')}hstack=inputs=${parts.length}`, '-q:v', '4', path.join(OUT, `${id}.jpg`)]);
    parts.forEach(p => fs.rmSync(p, { force: true }));
  }
  const vr = s.variant || {};
  const row = { id, sec: Math.round((Date.now() - t0) / 1000), format: vr.format && vr.format.id, theme: vr.theme && vr.theme.id, scene: vr.setting && vr.setting.scene, time: vr.setting && vr.setting.time, cast: vr.cast && vr.cast.to, cuts: s.timeline ? JSON.parse(fs.readFileSync(path.join(ROOT, 'out/video', id, s.timeline), 'utf8')).cuts.map(c => c.type) : [], visualHook: s.qa && s.qa.metrics && s.qa.metrics.visualHook ? s.qa.metrics.visualHook.score : null, issues: [...new Set(issues)] };
  const at = report.findIndex(x => x.id === id); if (at >= 0) report[at] = row; else report.push(row);
  console.log(`${r.status ? '✗' : '✓'} ${id} ${row.format} · ${row.theme} · ${row.scene}/${row.time} · ${(row.cast || []).join('+')} · hook ${row.visualHook} · ${row.issues.length} vấn đề (${row.sec} s)`);
}
report.sort((x, y) => x.id.localeCompare(y.id)); fs.writeFileSync(RP, JSON.stringify(report, null, 2) + '\n');
console.log(`→ ${OUT}/report.json`);
