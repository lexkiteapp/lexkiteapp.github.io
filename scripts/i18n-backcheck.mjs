// Kiểm tra NGHĨA bản dịch giao diện bằng dịch ngược (miễn phí): <lang> → en bằng Google gtx, so với câu tiếng Anh gốc.
// Câu ≥ 4 từ có độ trùng nghĩa thấp bị đánh dấu "nghi sai nghĩa" → web/i18n/backcheck.json (tab Quản trị → Chất lượng hiển thị).
// Có đệm theo nội dung (content/i18n-backcheck-cache.json): chỉ kiểm câu mới/đổi → chạy lại rất nhẹ. Dùng: node scripts/i18n-backcheck.mjs [lang …]
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), DIR = path.join(ROOT, 'web/js/i18n');
const load = f => { const g = {}; new Function('self', fs.readFileSync(f, 'utf8'))(g); return g.I18N_DICT || {}; };
const EN = load(path.join(DIR, 'en.js')).en || {};
const LANGS = process.argv.slice(2).length ? process.argv.slice(2) : fs.readFileSync(path.join(ROOT, 'scripts/i18n-langs.txt'), 'utf8').split('\n').map(s => s.trim()).filter(s => s && !s.startsWith('#'));
const CF = path.join(ROOT, 'content/i18n-backcheck-cache.json'), cache = fs.existsSync(CF) ? JSON.parse(fs.readFileSync(CF, 'utf8')) : {};
const hash = s => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); };
const clean = s => String(s).replace(/<[^>]+>|\{\w+\}|&\w+;/g, ' ');
const words = s => clean(s).toLowerCase().replace(/[^a-z0-9' ]+/g, ' ').split(/\s+/).filter(w => w.length > 2).map(w => w.replace(/(ing|ed|es|s)$/, ''));
const sim = (a, b) => { const A = new Set(words(a)), B = new Set(words(b)); if (!A.size || !B.size) return 1; let k = 0; for (const w of A) if (B.has(w)) k++; return k / Math.max(A.size, B.size); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function back(lang, lines) {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${lang}&tl=en&dt=t&q=${encodeURIComponent(lines.join('\n'))}`;
  for (let k = 0; k < 4; k++) { try { const r = await fetch(url); if (r.ok) { const j = await r.json(); return j[0].map(x => x[0]).join('').split('\n'); } if (r.status === 429) await sleep(20000); } catch (e) { /* thử lại */ } await sleep(1500 * (k + 1)); }
  return null;
}
const report = fs.existsSync(path.join(ROOT, 'web/i18n/backcheck.json')) ? JSON.parse(fs.readFileSync(path.join(ROOT, 'web/i18n/backcheck.json'), 'utf8')) : { langs: {} };
for (const lang of LANGS) {
  const T = load(path.join(DIR, lang + '.js'))[lang] || {};
  const items = Object.keys(EN).filter(k => T[k] && clean(EN[k]).trim().split(/\s+/).length >= 4).map(k => ({ k, en: EN[k], tr: T[k], h: hash(lang + '|' + EN[k] + '|' + T[k]) }));
  const todo = items.filter(x => !cache[x.h]);
  for (let i = 0; i < todo.length;) {
    const b = []; let len = 0; while (i < todo.length && len < 1500) { b.push(todo[i]); len += clean(todo[i].tr).length + 1; i++; }
    let res = await back(lang, b.map(x => clean(x.tr).replace(/\s+/g, ' ').trim()));
    if (!res || res.length !== b.length) { res = []; for (const x of b) { const r1 = await back(lang, [clean(x.tr).replace(/\s+/g, ' ').trim()]); res.push(r1 ? r1.join(' ') : null); await sleep(300); } }
    b.forEach((x, j) => { if (res[j] != null) cache[x.h] = [res[j], +sim(x.en, res[j]).toFixed(2)]; });
    process.stdout.write(`\r${lang} ${i}/${todo.length}`); await sleep(400);
  }
  const scored = items.filter(x => cache[x.h]), low = scored.filter(x => cache[x.h][1] < 0.34).sort((a, b) => cache[a.h][1] - cache[b.h][1]);
  report.langs[lang] = { checked: scored.length, ok: +(100 * (1 - low.length / Math.max(1, scored.length))).toFixed(1), flagged: low.slice(0, 80).map(x => ({ h: x.h, key: x.k, en: x.en, tr: x.tr, back: cache[x.h][0], score: cache[x.h][1] })) };
  console.log(`\r✓ ${lang}: ${scored.length} câu · ${report.langs[lang].ok}% khớp nghĩa · nghi sai ${low.length}`);
  fs.writeFileSync(CF, JSON.stringify(cache));
}
report.at = Date.now();
fs.writeFileSync(path.join(ROOT, 'web/i18n/backcheck.json'), JSON.stringify(report));
