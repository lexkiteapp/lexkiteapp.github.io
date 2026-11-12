#!/usr/bin/env node
// Tầng 1 ICON cho TOÀN kho (không cần thẻ vẽ, không cần giám khảo AI – ánh xạ TẤT ĐỊNH):
//   node scripts/vocab-img/icons-lex.mjs --test emoji-test.txt --cldr annotations.json [--write]
//   → content/lexicon/vimg-icons-lex.json { "từ#loại": { cp, e, name, g, m } }   (m = cách khớp: exact | mod | face | kw | over)
// Nguồn: emoji-test.txt (Unicode 15.1, nhóm con) + CLDR annotations en (cldr-annotations-full@46.0.0: tên tts + từ khoá).
// Ảnh: Noto Emoji png/512 (Apache-2.0) → dự phòng OpenMoji 618 (CC BY-SA 4.0) – scripts/vocab-img/free_tier.py.
// Luật (KHÔNG khớp mờ):
//   chỉ danh từ (+ tính từ màu qua danh sách tay); chỉ emoji thuộc nhóm con CỤ THỂ (CONCRETE: động vật, cây, đồ ăn, xe, thời tiết, đồ vật …)
//   khớp: tên tts == từ (số ít/số nhiều) | "<bổ ngữ màu/cỡ> <từ>" | "<con vật> face" | từ là từ khoá CLDR của DUY NHẤT 1 emoji cụ thể VÀ là danh từ đầu (token cuối) của tên
//   định nghĩa của nghĩa phải hợp nhóm (HINT) – không hợp = bỏ (trừ khi danh sách tay thêm); danh sách tay: content/lexicon/vimg-icon-overrides.json {add, block}
import fs from 'fs';

const ROOT = new URL('../../', import.meta.url), rd = p => JSON.parse(fs.readFileSync(new URL(p, ROOT), 'utf8'));
const arg = n => { const i = process.argv.indexOf('--' + n); return i > 0 ? process.argv[i + 1] : undefined; };
export const cpOf = e => [...e].map(c => c.codePointAt(0)).filter(c => c !== 0xfe0f).map(c => c.toString(16)).join('_');

// nhóm con cụ thể → gợi ý định nghĩa (regex trên def tiếng Anh của nghĩa)
const H = {
  animal: /animal|bird|fish|insect|mammal|reptile|creature|pet|farm|wild|bug|snake|sea|swim|fly|legs|tail|fur|feather|shell|hunt/,
  plant: /plant|flower|tree|leaf|leaves|grass|grow|garden|seed|wood|forest|bloom/,
  food: /food|fruit|vegetable|eat|eaten|drink|dish|meal|sweet|bread|cook|bake|baked|fried|liquid|juice|grain|nut|meat|snack|dessert|sauce|cake|made from|milk|sugar|flour|egg|cheese|boil|served|round|yellow|red|green|taste|rice/,
  vehicle: /vehicle|car|boat|ship|aircraft|plane|train|transport|travel|carry|carries|ride|road|wheel|engine|fly|flies|sail|track|passenger|driv/,
  weather: /weather|sky|rain|snow|wind|cloud|sun|star|light|storm|cold|ice|water|air|planet|earth|moon|night|shine|fall/,
  place: /building|place|house|home|structure|church|school|office|hospital|tower|bridge|land|mountain|hill|island|area|ground|water|sea|sand|hot|stone|tall|city|rock|camp|road|shelter/,
  object: /object|device|tool|machine|instrument|equipment|item|container|piece|thing|used|use|wear|worn|clothing|cloth|made|metal|paper|plastic|glass|wood|box|bag|ball|game|toy|put|keep|hold|carry|sit|play|write|read|cut|open|lock|light|sound|music|money|coin|card|book|picture|phone|computer|screen|watch|time|clock|medicine|small|large|round|flat|long|piece|shoe|foot|head|hand|body|cover|drink|water|fire|burn/,
  body: /body|part|organ|face|head|hand|foot|feet|leg|arm|mouth|eye|ear|nose|tooth|teeth|bone|skin|hair|blood|brain|heart|lung|finger|toe/,
  person: /person|someone|worker|who |job|works|man|woman|officer|doctor|nurse|teacher|student|cook|farmer|police|soldier|pilot|king|queen|baby|child|scientist|artist|judge|guard|detective|singer|astronaut/,
};
const SUB = {
  'animal-mammal': 'animal', 'animal-bird': 'animal', 'animal-amphibian': 'animal', 'animal-reptile': 'animal', 'animal-marine': 'animal', 'animal-bug': 'animal',
  'plant-flower': 'plant', 'plant-other': 'plant',
  'food-fruit': 'food', 'food-vegetable': 'food', 'food-prepared': 'food', 'food-asian': 'food', 'food-marine': 'food', 'food-sweet': 'food', drink: 'food', dishware: 'object',
  'transport-ground': 'vehicle', 'transport-water': 'vehicle', 'transport-air': 'vehicle',
  'sky & weather': 'weather', 'place-geographic': 'place', 'place-building': 'place', 'place-other': 'place', 'place-religious': 'place',
  hotel: 'object', time: 'object', event: 'object', 'award-medal': 'object', sport: 'object', game: 'object', 'arts & crafts': 'object', clothing: 'object',
  music: 'object', 'musical-instrument': 'object', phone: 'object', computer: 'object', 'light & video': 'object', 'book-paper': 'object', money: 'object',
  mail: 'object', writing: 'object', office: 'object', lock: 'object', tool: 'object', science: 'object', medical: 'object', household: 'object', 'other-object': 'object',
  'body-parts': 'body', 'person-role': 'person', person: 'person',
};
const MOD = new Set(['red', 'green', 'yellow', 'blue', 'orange', 'purple', 'brown', 'black', 'white', 'small', 'large', 'big', 'little', 'baby', 'new', 'old', 'full', 'wooden', 'pine', 'sweet', 'roasted', 'cooked', 'hot', 'closed', 'open', 'four', 'shaved', 'spiral', 'mobile', 'desktop', 'school', 'steaming', 'shopping', 'sport', 'passenger', 'police', 'fire', 'racing', 'pickup', 'motor', 'oncoming', 'world', 'national', 'water', 'potted', 'deciduous', 'evergreen', 'christmas', 'birthday', 'tropical', 'snow', 'amusement']);
const tok = s => String(s).toLowerCase().replace(/[^a-z\s'-]/g, ' ').split(/[\s-]+/).filter(Boolean);
const forms = w => { w = w.toLowerCase(); const f = new Set([w]); if (/[^s]s$/.test(w)) f.add(w.slice(0, -1)); else f.add(w + 's'); if (/ies$/.test(w)) f.add(w.slice(0, -3) + 'y'); if (/y$/.test(w)) f.add(w.slice(0, -1) + 'ies'); if (/(ch|sh|x|o)es$/.test(w)) f.add(w.slice(0, -2)); return f; };

export function parseTest(txt) {
  const out = []; let sub = '';
  for (const l of txt.split('\n')) {
    const m = /^# subgroup: (.+)$/.exec(l); if (m) { sub = m[1].trim(); continue; }
    const r = /^[0-9A-F ]+;\s*fully-qualified\s*#\s*(\S+)\s+E[\d.]+\s+(.+)$/.exec(l); if (!r) continue;
    if (/\u{1F3FB}|\u{1F3FC}|\u{1F3FD}|\u{1F3FE}|\u{1F3FF}/u.test(r[1])) continue;   // bỏ tông da
    out.push({ e: r[1], name: r[2].trim().toLowerCase(), sub });
  }
  return out;
}

export function mapIconsLex(emo, cldr, lex, over = { add: {}, block: [] }) {
  const con = emo.filter(x => SUB[x.sub] && !/^(man|woman|men|women|people|couple|family)\b/.test(x.name) && !/: /.test(x.name));
  const byName = new Map(); for (const x of con) if (!byName.has(x.name)) byName.set(x.name, x);
  const kwIdx = new Map();   // từ khoá → emoji cụ thể có từ khoá đó
  for (const x of con) for (const k of ((cldr[x.e] || cldr[x.e.replace(/️/g, '')] || {}).default || [])) { const kk = k.toLowerCase(); if (!kwIdx.has(kk)) kwIdx.set(kk, []); kwIdx.get(kk).push(x); }
  const out = {}, block = new Set(over.block || []), all = new Map(emo.map(x => [x.e, x]));
  for (const [k, L] of Object.entries(lex)) {
    if (block.has(k)) continue;
    const ov = (over.add || {})[k];
    if (ov) { const x = all.get(ov) || { e: ov, name: ov, sub: 'over' }; out[k] = { cp: cpOf(x.e), e: x.e, name: x.name, g: x.sub, m: 'over' }; continue; }
    if (L.pos !== 'n') continue;
    const w = String(L.w).toLowerCase(); if (!/^[a-z][a-z' -]*$/.test(w)) continue;
    const F = forms(w), def = String(L.def || '').toLowerCase();
    let hit = null, m = '';
    for (const f of F) if (byName.has(f)) { hit = byName.get(f); m = 'exact'; break; }
    if (!hit && !w.includes(' ')) for (const x of con) { const t = tok(x.name); if (t.length === 2 && F.has(t[1]) && MOD.has(t[0])) { hit = x; m = 'mod'; break; } }
    if (!hit && !w.includes(' ')) for (const f of F) if (byName.has(f + ' face') && SUB[byName.get(f + ' face').sub] === 'animal') { hit = byName.get(f + ' face'); m = 'face'; break; }
    if (!hit && !w.includes(' ')) for (const f of F) { const c = kwIdx.get(f) || []; if (c.length === 1 && F.has(tok(c[0].name).slice(-1)[0])) { hit = c[0]; m = 'kw'; break; } }
    if (!hit) continue;
    if (!H[SUB[hit.sub]].test(def)) { if (process.env.DEBUG) console.log('hint✗', k, hit.name, '|', def.slice(0, 60)); continue; }   // định nghĩa không hợp nhóm (vd 'star' = người nổi tiếng) → không icon
    out[k] = { cp: cpOf(hit.e), e: hit.e, name: hit.name, g: hit.sub, m };
  }
  return out;
}

if (process.argv[1] && process.argv[1].endsWith('icons-lex.mjs')) {
  const emo = parseTest(fs.readFileSync(arg('test'), 'utf8'));
  const j = JSON.parse(fs.readFileSync(arg('cldr'), 'utf8')), cldr = (j.annotations && j.annotations.annotations) || j;
  const OV = 'content/lexicon/vimg-icon-overrides.json', over = fs.existsSync(new URL(OV, ROOT)) ? rd(OV) : { add: {}, block: [] };
  const m = mapIconsLex(emo, cldr, rd('dist/lexicon.json'), over);
  const doc = { _note: 'Sinh bởi scripts/vocab-img/icons-lex.mjs (emoji-test 15.1 + CLDR en 46.0.0 + vimg-icon-overrides.json) – KHÔNG sửa tay; sửa danh sách tay rồi chạy lại. Ảnh Noto Emoji (Apache-2.0) → OpenMoji (CC BY-SA 4.0).', v: 1, emoji: '15.1', cldr: '46.0.0', noto: 'v2.047', openmoji: '15.1.0', items: Object.fromEntries(Object.entries(m).sort(([a], [b]) => (a < b ? -1 : 1))) };
  if (process.argv.includes('--write')) fs.writeFileSync(new URL('content/lexicon/vimg-icons-lex.json', ROOT), JSON.stringify(doc, null, 1) + '\n');
  if (process.argv.includes('--list')) for (const [k, v] of Object.entries(doc.items)) console.log(k, '|', v.e, v.name, '|', v.m, v.g, '|', rd('dist/lexicon.json')[k] ? '' : '');
  console.log(Object.keys(m).length, 'icon', JSON.stringify(Object.entries(m).reduce((a, [, v]) => ((a[v.m] = (a[v.m] || 0) + 1), a), {})));
}
