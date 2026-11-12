// Bộ câu thử A/B Kokoro ↔ ElevenLabs (docs/TTS-AB.md, .github/workflows/tts-ab.yml) – 0 credit, tất định (cùng repo → cùng bộ câu).
//   node scripts/tts-ab/texts.mjs [--out .tts-ab/texts.json]   → in số ký tự từng nhóm + kế hoạch credit (dry-run) của mỗi cấu hình ElevenLabs
// Nhóm: word (50 từ, lexicon), ex (câu ví dụ của 50 từ đó), line (20 câu thoại Ama/Carlos của video teach2d), hard (đồng tự khác âm, số,
//   cặp tối thiểu, Mỹ–Anh), story (1 đoạn ~1.000 ký tự). Mỗi mục có 1 giáo viên (ama|carlos) → giọng theo bảng giọng của từng engine.
// Tập "core" (đánh dấu core: true, ~1.200 ký tự) là phần các cấu hình phụ của ElevenLabs (giọng 2, flash) cũng đọc – giữ ngân sách ≤ 7.500.
import fs from 'node:fs';
const oi = process.argv.indexOf('--out'), OUT = oi > 0 ? process.argv[oi + 1] : '.tts-ab/texts.json';
const items = [], add = (cat, who, text, core = false) => items.push({ id: `${cat}${String(items.filter(i => i.cat === cat).length + 1).padStart(2, '0')}`, cat, who, text, core });
const who = i => (i % 2 ? 'carlos' : 'ama');

// 1) 50 từ + câu ví dụ đầu tiên (lô lexicon mới nhất): chọn đều theo thứ tự khóa, bỏ từ ghép/viết hoa để giữ phép thử "từ đơn"
const LEX = 'content/lexicon/expand/20261031.json', lex = JSON.parse(fs.readFileSync(LEX, 'utf8')).items;
const cand = Object.values(lex).filter(v => /^[a-z]+$/.test(v.w) && (v.ex || [])[0] && v.ex[0].length <= 80).sort((a, b) => (a.w < b.w ? -1 : 1));
const step = cand.length / 50, picks = Array.from({ length: 50 }, (_, i) => cand[Math.floor(i * step)]);
picks.forEach((v, i) => { add('word', who(i), v.w, i < 10); add('ex', who(i), v.ex[0], i < 10); });

// 2) 20 câu thoại giáo viên (video teach2d – cùng chữ = phụ đề = khẩu hình): xoay vòng các tập, mỗi lượt lấy câu kế tiếp chưa dùng
const EPS = 'content/video/teach2d/eps', eps = fs.readdirSync(EPS).filter(f => f.endsWith('.json')).sort().map(f => JSON.parse(fs.readFileSync(`${EPS}/${f}`, 'utf8')));
const seen = new Set();
for (let r = 0, n = 0; n < 20 && r < 20; r++) for (const e of eps) {
  const l = (e.lines || []).map(x => x.text).filter(t => t && !seen.has(t))[0];
  if (l && n < 20) { seen.add(l); add('line', e.teacher, l, n < 6); n++; }
}

// 3) Ca khó (viết riêng cho phép thử): đồng tự khác âm, số/ngày/tiền, cặp tối thiểu, cách đọc Mỹ (người nghe chấm giọng Mỹ–Anh)
const HARD = [
  'I read the news every morning, but yesterday I read a novel instead.',
  'Lead pipes can contain lead, so she will lead the repair team.',
  'The wind was too strong to wind the old clock.',
  'Please record a new record before the store closes.',
  'Close the window; we are close to the station.',
  'The nurse wound a bandage around the wound.',
  'Our meeting is at 7:45 a.m. on March 3, 2026.',
  'The ticket costs $1,250.99, about 15% more than last year.',
  'Call 555-0142 and ask for room 204.',
  'She ran 3.5 kilometers in 21 minutes.',
  'Ship, sheep. Bit, beat. Full, fool.',
  'Live, leave. Bad, bed. Thin, tin.',
  'Walk, work. Law, low. Cap, cup.',
  'My schedule includes a tomato salad and a trip to the garage.',
  'Either route is fine, but the water is better over there.',
  'Take your vitamins and wrap the leftovers in aluminum foil.',
  'The data on that advertisement was totally wrong.',
  'Can you, can you not, can\'t you? Yes, I can.',
];
HARD.forEach((t, i) => add('hard', who(i), t, i % 2 === 0));

// 4) Đoạn kể chuyện ~1.000 ký tự (Ama) – nhịp đọc dài, ngắt hơi, câu hỏi, lời thoại
add('story', 'ama', [
  'Every Saturday, Mia takes the early train to her grandmother\'s village. The ride is only forty minutes, but it feels like a small holiday.',
  'She sits by the window, opens a paper bag of warm bread, and watches the city slowly turn into fields.',
  'This week, something was different. An old man sat across from her, holding a box with tiny holes in the lid.',
  '"Is that a cat?" Mia asked. He smiled and shook his head. "Listen," he said. From inside the box came a soft, cheerful sound.',
  'It was a bird, a small yellow canary that had lived with his late wife for nine years.',
  '"I can\'t keep her anymore," he explained. "My new apartment doesn\'t allow pets. I\'m taking her to my sister."',
  'Mia thought about her grandmother, who always said the house was too quiet.',
  'By the time the train reached the village, the two strangers had become friends, and the canary had a new home with a garden full of flowers.',
  'That evening, as Mia walked back to the station, she heard singing from an open window and laughed.',
].join(' '), true);

// Cắt core của đoạn kể chuyện: cấu hình phụ chỉ đọc 2 câu đầu (đủ nghe nhịp), giữ ngân sách
const STORY_CORE = items.find(i => i.cat === 'story').text.split(/(?<=\.) /).slice(0, 2).join(' ');
for (const i of items) i.chars = i.text.length;
const sum = a => a.reduce((s, i) => s + i.chars, 0), cats = [...new Set(items.map(i => i.cat))];
const coreChars = sum(items.filter(i => i.core && i.cat !== 'story')) + STORY_CORE.length;
fs.mkdirSync(OUT.replace(/\/[^/]+$/, ''), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify({ storyCore: STORY_CORE, items }, null, 1));
console.log(`Bộ câu: ${items.length} mục · ${sum(items)} ký tự (${cats.map(c => `${c} ${items.filter(i => i.cat === c).length}/${sum(items.filter(i => i.cat === c))}`).join(' · ')}) · core ${coreChars} ký tự → ${OUT}`);
