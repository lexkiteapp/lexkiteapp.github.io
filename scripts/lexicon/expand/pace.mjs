#!/usr/bin/env node
// Tốc độ kho từ → 20k word#pos (docs/LEXICON.md "Mục tiêu & tốc độ"): số SỐNG = từ#loại trong kho (dist/lexicon.json hoặc --base) + mục đã xuất (content/lexicon/expand/<lô>.json),
// tốc độ 7 ngày gần nhất theo ngày của tên lô, ngày dự kiến đủ 20k, và tốc độ CẦN để kịp hạn (mặc định 30 ngày). Chỉ đọc, 0 AI.
//   node scripts/lexicon/expand/pace.mjs [--base 8230] [--days 30] [--json]
import fs from 'node:fs';
const A = process.argv.slice(2), opt = (k, d) => { const i = A.indexOf(k); return i >= 0 ? +A[i + 1] : d; };
export const TARGET = 20000;
/** Thuần: batches = [{ day:'YYYYMMDD', n }], base = số word#pos có sẵn ở kho → { live, perDay7, need, etaDays, etaDate, requiredPerDay }. */
export function pace(batches, base, { now = Date.now(), horizon = 30 } = {}) {
  const live = base + batches.reduce((s, b) => s + b.n, 0), cut = new Date(now - 7 * 864e5).toISOString().slice(0, 10).replace(/-/g, '');
  const perDay7 = batches.filter(b => b.day >= cut).reduce((s, b) => s + b.n, 0) / 7, need = Math.max(0, TARGET - live);
  const etaDays = need === 0 ? 0 : perDay7 > 0 ? Math.ceil(need / perDay7) : null;
  return { live, need, perDay7: +perDay7.toFixed(1), etaDays, etaDate: etaDays == null ? null : new Date(now + etaDays * 864e5).toISOString().slice(0, 10), requiredPerDay: Math.ceil(need / horizon) };
}
if (process.argv[1] && process.argv[1].endsWith('pace.mjs')) {
  const dir = 'content/lexicon/expand/', batches = fs.readdirSync(dir).filter(f => /^\d{8}.*\.json$/.test(f)).map(f => { const d = JSON.parse(fs.readFileSync(dir + f, 'utf8')); return { day: f.slice(0, 8), n: Object.keys(d.items || d).length }; });
  const base = opt('--base', fs.existsSync('dist/lexicon.json') ? new Set(JSON.parse(fs.readFileSync('dist/lexicon.json', 'utf8')).rows?.map(r => `${r.w}#${r.pos || r.p}`) || []).size || 8230 : 8230);
  const r = pace(batches, base, { horizon: opt('--days', 30) });
  console.log(A.includes('--json') ? JSON.stringify(r) : `kho từ: ${r.live}/${TARGET} word#pos (thiếu ${r.need}) · 7 ngày: ${r.perDay7}/ngày · ${r.etaDate ? `đủ ~${r.etaDate} (${r.etaDays} ngày)` : 'KHÔNG bao giờ ở tốc độ này (0/ngày)'} · cần ${r.requiredPerDay}/ngày để đủ trong ${opt('--days', 30)} ngày`);
}
