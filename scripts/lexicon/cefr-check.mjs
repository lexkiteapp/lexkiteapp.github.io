#!/usr/bin/env node
// Kiểm CEFR + ví dụ bằng dữ liệu MỞ (không chép Oxford 3000/5000): thứ hạng tần suất NGSL 1.2 (CC BY-SA, thứ tự trong ngsl*.js)
// + AWL sublist + độ dài câu ví dụ. CHỈ GẮN CỜ → content/lexicon/cefr-flags.json (người duyệt sửa qua overrides.json), không tự đổi.
//   Kỳ vọng theo hạng NGSL: ≤ 800 A1 · ≤ 1600 A2 · ≤ 2400 B1 · còn lại B2; AWL sublist 1–3 B2, 4–7 C1, 8–10 C2.
//   Cờ: dễ hơn kỳ vọng ≥ 2 bậc hoặc khó hơn ≥ 3 bậc (tần suất ≠ độ khó: từ cụ thể như ball/map vẫn A1 nên chỉ gắn cờ lệch lớn); ví dụ A1–A2 > 12 từ; ví dụ không chứa từ khóa (kể cả biến thể -s/-ed/-ing…).
import { loadAll, wr } from './lib.mjs';
const L = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'], lv = s => L.indexOf(String(s).toUpperCase().slice(0, 2));
const all = loadAll();
const rank = new Map(); let r = 0;
for (const e of all) if (/ngsl/.test(e.file)) { const w = e.row[0].toLowerCase(); if (!rank.has(w)) rank.set(w, ++r); }
const awl = new Map(); for (const e of all) { const m = /^awl(\d+)$/.exec(e.set); if (m && !awl.has(e.row[0].toLowerCase())) awl.set(e.row[0].toLowerCase(), +m[1]); }
const expect = w => { const k = rank.get(w); if (k) return k <= 800 ? 0 : k <= 1600 ? 1 : k <= 2400 ? 2 : 3; const s = awl.get(w); return s ? (s <= 3 ? 3 : s <= 7 ? 4 : 5) : -1; };
const stem = w => w.toLowerCase().replace(/(ies|es|s|ed|ing|e|y)$/, '');
const flags = []; const seen = new Set();
for (const e of all) {
  const [w0, , pos, , , ex, , , level] = e.row, w = w0.toLowerCase(), id = w + '#' + pos + '@' + e.set; if (seen.has(id)) continue; seen.add(id);
  const d = lv(level), x = expect(w), why = [];
  if (d >= 0 && x >= 0 && (x - d >= 2 || d - x >= 3)) why.push(`CEFR ${level} ≠ kỳ vọng ${L[x]} (hạng NGSL ${rank.get(w) || '-'}, AWL ${awl.get(w) || '-'})`);

  if (d >= 0 && d <= 1 && ex && ex.split(/\s+/).length > 12) why.push(`ví dụ ${ex.split(/\s+/).length} từ – dài cho ${level}`);
  if (ex && !/\s/.test(w) && !new RegExp('\\b' + stem(w).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(ex)) why.push('ví dụ không chứa từ khóa');
  if (why.length) flags.push({ w: w0, pos, set: e.set, level, why: why.join('; ') });
}
const by = k => flags.filter(f => f.why.includes(k)).length;
wr('content/lexicon/cefr-flags.json', JSON.stringify({ _doc: 'Tự sinh bởi scripts/lexicon/cefr-check.mjs – cờ cần người duyệt, KHÔNG tự đổi. Sửa qua content/lexicon/overrides.json.', count: flags.length, flags }, null, 1) + '\n');
console.log(`cefr-check: ${seen.size} mục · cờ ${flags.length} (CEFR lệch ${by('CEFR') + by('A1 nhưng')}, ví dụ dài ${by('dài cho')}, ví dụ thiếu từ khóa ${by('không chứa')}) → content/lexicon/cefr-flags.json`);
