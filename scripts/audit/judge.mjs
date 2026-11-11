// Audit tổng – giám khảo "độ đẹp so với chuẩn Duolingo" chấm trên ẢNH CHỤP THẬT (ai-pool chuỗi vision, $0). Không có khoá / không ai trả lời → không ghi điểm = "chưa đo".
// Dùng: node scripts/audit/judge.mjs out/audit  → out/audit/beauty.json { id: { score, problems, model, shots } }
import fs from 'node:fs';
import path from 'node:path';
import { createPool } from '../lib/ai-pool.mjs';

const DIR = path.resolve(process.argv[2] || 'out/audit');
const PROMPT = `You are a senior product designer reviewing one real screenshot of "Lexkite", a language-learning app, against the visual bar of Duolingo. Judge ONLY what you can see.
Rubric (0-100): visual hierarchy and one clear primary action; spacing and alignment rhythm; typography; colour and contrast harmony; polish of cards/buttons/icons; illustration or character integration (not pasted on); no clutter, no raw or broken-looking element.
Anchors: 95 = indistinguishable from Duolingo's best screens. 85 = polished, small nits. 70 = decent but generic or uneven. 50 = visibly unfinished. 30 = broken layout or looks like a default HTML page.
Reply with ONLY compact JSON: {"score":<int>,"problems":["<concrete visual problem, max 15 words>", ...max 3]}.`;
const raws = fs.readdirSync(DIR).filter(f => /^data-.*\.json$/.test(f)).flatMap(f => JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8')));
const pool = createPool({ log: () => {} }), out = {}; let n = 0, ok = 0;
for (const r of raws) {
  const res = [];
  for (const k of ['390l', '390d', '1440l', '1280l'].filter(k => r.shots && r.shots[k])) {
    n++;
    const a = await pool.vision({ question: PROMPT, ask: PROMPT, image: fs.readFileSync(path.join(DIR, r.shots[k])).toString('base64') }).catch(() => null);
    const s = a && a.out && Number(a.out.score);
    if (s >= 0 && s <= 100) res.push({ k, s, p: Array.isArray(a.out.problems) ? a.out.problems : [], model: a.route + ':' + a.model });
  }
  if (res.length) { ok++; out[r.id] = { score: Math.round(res.reduce((a, x) => a + x.s, 0) / res.length), problems: [...new Set(res.flatMap(x => x.p))].slice(0, 4), model: res[0].model, shots: res.length }; }
  console.log(`${r.id}: ${out[r.id] ? out[r.id].score + ' (' + out[r.id].model + ')' : 'chưa đo'}`);
}
fs.writeFileSync(path.join(DIR, 'beauty.json'), JSON.stringify(out));
console.log(`beauty: ${ok}/${raws.length} mục có điểm, ${n} ảnh`);
